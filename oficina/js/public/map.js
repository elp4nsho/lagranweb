// Mapa interactivo: pisos, ubicar personas, ocupación en vivo y salas.
import { escape, toast } from '../../../assets/core/ui.js';
import { floorSVG, chairPos } from '../shared/floorplan.js';
import { panZoom } from '../shared/panzoom.js';
import { avatar, STATUS } from '../shared/util.js';
import { roomBusyNow } from '../shared/roomcal.js';
import { today, fmtDay } from '../shared/dates.js';

const st = { floorId: null, hl: null, pz: null };
export function reset() { st.floorId = null; st.hl = null; }
let C = null, EL = null;

const legendSeat = (cls, txt, extra = '', fill = '') => `<svg viewBox="-26 -26 52 52" class="fp" aria-hidden="true" style="width:28px;height:28px"><g class="seat ${cls}"><circle class="bg" r="19" ${fill ? `style="fill:${fill}"` : ''}/><text>${txt}</text>${extra}</g></svg>`;

function mount(el) {
  el.innerHTML = `<div class="map-layout">
    <div class="card map-card">
      <div class="map-toolbar">
        <div class="combo"><input class="input" id="mapQ" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mapList" placeholder="🔍 Ubicar a una persona…" autocomplete="off"><ul id="mapList" role="listbox" class="combo-list" hidden></ul></div>
        <div class="seg" data-floors role="group" aria-label="Seleccionar piso"></div>
      </div>
      <div class="map-stage" id="stage">
        <svg class="fp" id="mapSvg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Plano de la oficina"><g id="vp"></g></svg>
        <div class="zoom-ctl" role="group" aria-label="Zoom del mapa">
          <button type="button" class="btn btn-icon btn-sm" data-z="in" aria-label="Acercar">＋</button>
          <button type="button" class="btn btn-icon btn-sm" data-z="out" aria-label="Alejar">－</button>
          <button type="button" class="btn btn-icon btn-sm" data-z="fit" aria-label="Ajustar a la pantalla">⤢</button>
        </div>
        <div class="floor-badge" data-badge aria-hidden="true"></div>
        <div class="tip card" id="tip" hidden></div>
        <p class="map-hint">Arrastra para mover · rueda o pellizca para zoom</p>
      </div>
    </div>
    <aside class="stack">
      <div class="card"><div class="card-h"><h3 data-occ-title>Ocupación</h3><span class="muted small">${escape(fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'short' }))}</span></div><div class="occ-bar" data-occ-bar role="img"></div><dl class="kv" data-occ></dl></div>
      <div class="card" data-book></div>
      <div class="card"><div class="card-h"><h3>Leyenda</h3></div><ul class="legend">
        <li>${legendSeat('s-occ', 'AB', '', 'var(--primary)')}Ocupado (en oficina)</li>
        <li>${legendSeat('s-meet', 'AB', '<circle class="badge-dot meet" cx="14" cy="-14" r="6"/>', 'var(--primary)')}En reunión</li>
        <li>${legendSeat('s-away', 'AB')}Asignado, persona ausente</li>
        <li>${legendSeat('s-free', '+')}Libre · reservable</li>
        <li>${legendSeat('s-res', 'AB')}Reservado (sin check-in)</li>
        <li>${legendSeat('s-checked', 'AB', '<circle class="badge-dot chk" cx="14" cy="-14" r="6"/>', 'var(--primary)')}Puesto flexible con check-in</li>
      </ul></div>
    </aside></div>`;
  const svg = el.querySelector('#mapSvg'), vp = el.querySelector('#vp');
  st.pz = panZoom(svg, vp, { onTap: (t, ptype) => onTap(t, ptype), onMoveStart: hideTip });
  el.querySelector('.zoom-ctl').onclick = e => { const z = e.target.closest('[data-z]')?.dataset.z; if (!z) return; hideTip(); z === 'fit' ? st.pz.reset(true) : st.pz.zoom(z === 'in' ? 1.4 : 1 / 1.4); };
  el.querySelector('[data-floors]').onclick = e => { const b = e.target.closest('[data-floor]'); if (b) setFloor(b.dataset.floor); };
  vp.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const g = e.target.closest('.seat'); if (g && !tipEl().classList.contains('interactive')) showTip(g.dataset.seat, false); });
  vp.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const g = e.target.closest('.seat'); if (g && !(e.relatedTarget && g.contains(e.relatedTarget)) && !tipEl().classList.contains('interactive')) hideTip(); });
  vp.addEventListener('keydown', e => { const g = e.target.closest('.seat'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(g.dataset.seat, 'keyboard'); } });
  vp.addEventListener('focusin', e => { const g = e.target.closest('.seat'); if (g && g.matches(':focus-visible')) showTip(g.dataset.seat, false); });
  tipEl().addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) C.openProfile(b.dataset.open); });
  document.addEventListener('pointerdown', e => { const t = tipEl(); if (t && !t.hidden && t.classList.contains('interactive') && !t.contains(e.target) && !e.target.closest('.seat, .room-g')) hideTip(); });
  window.addEventListener('resize', hideTip);
  combo(el);
}
const tipEl = () => EL?.querySelector('#tip');
function hideTip() { const t = tipEl(); if (t) { t.hidden = true; t.classList.remove('interactive'); } }

function floor() { const idx = C.idx; return idx.floors.find(f => f.id === st.floorId) || idx.floors[0]; }
function setFloor(id) { if (id === st.floorId) return; st.floorId = id; hideTip(); if (st.hl && C.idx.desk[st.hl]?.floor.id !== id) st.hl = null; paint(); st.pz.reset(false); }

function paint() {
  const idx = C.idx, f = floor();
  if (!f) { EL.querySelector('#vp').innerHTML = ''; EL.querySelector('[data-floors]').innerHTML = '<span class="muted">Esta empresa aún no tiene pisos.</span>'; return; }
  st.floorId = f.id;
  const me = C.auth.current()?.personId;
  EL.querySelector('[data-floors]').innerHTML = idx.floors.map(fl => {
    const free = fl.desks.filter(d => idx.deskState(d.id).state === 'free').length;
    return `<button type="button" class="chip ${fl.id === f.id ? 'active' : ''}" data-floor="${fl.id}" aria-pressed="${fl.id === f.id}">${escape(fl.name)} <small>${free} libres</small></button>`;
  }).join('');
  EL.querySelector('#vp').innerHTML = floorSVG(f, idx, { highlight: st.hl, me, roomStatus: rm => rm.cap ? { busy: !!roomBusyNow(C.db, idx.company.id, rm.id) } : null });
  EL.querySelector('[data-badge]').textContent = `${idx.company.name} · ${f.name}`;
  const c = { occ: 0, meet: 0, away: 0, free: 0, res: 0, checked: 0, blocked: 0 };
  f.desks.forEach(d => c[idx.deskState(d.id).state]++);
  const total = f.desks.length || 1, occ = c.occ + c.meet + c.checked + c.res, pct = n => Math.round(n / total * 100);
  EL.querySelector('[data-occ-title]').textContent = `Ocupación · ${f.name}`;
  EL.querySelector('[data-occ-bar]').innerHTML = `<span class="o" style="width:${pct(occ)}%"></span><span class="a" style="width:${pct(c.away)}%"></span><span class="f" style="width:${pct(c.free)}%"></span>`;
  EL.querySelector('[data-occ-bar]').setAttribute('aria-label', `Ocupados ${pct(occ)} %, ausentes ${pct(c.away)} %, libres ${pct(c.free)} %`);
  EL.querySelector('[data-occ]').innerHTML = `<dt><i class="sw o"></i>Ocupados</dt><dd><b>${occ}</b> · ${pct(occ)} %</dd><dt><i class="sw f"></i>Libres</dt><dd><b>${c.free}</b> · ${pct(c.free)} %</dd><dt><i class="sw a"></i>Asignados ausentes</dt><dd><b>${c.away}</b></dd><dt><i class="sw r"></i>Reservas flexibles</dt><dd><b>${c.res + c.checked}</b> de ${f.desks.filter(d => d.type === 'flexible').length} flexibles</dd>`;
  const u = C.auth.current();
  EL.querySelector('[data-book]').innerHTML = `<div class="card-h"><h3>Reserva de puesto</h3><span class="badge badge-primary">Hot-desk</span></div>` + (u?.personId
    ? `<p class="muted small">Hola, ${escape(u.name.split(' ')[0])}. Reserva un puesto flexible para hoy o los próximos días desde tu espacio.</p><a class="btn btn-primary btn-block" href="empleado.html#/reservas">Reservar un puesto</a>`
    : `<p class="muted small">Los puestos libres (+) se pueden reservar por día. Ingresa con tu cuenta de empleado para reservar y hacer check-in.</p><a class="btn btn-block" href="login.html?next=empleado.html%23%2Freservas">Ingresar para reservar</a>`);
}

function onTap(t, ptype) {
  const seat = t.closest?.('.seat'), room = t.closest?.('.room-g');
  if (seat) activate(seat.dataset.seat, ptype);
  else if (room) roomTip(room);
  else hideTip();
}
function activate(sid, ptype) {
  const s = C.idx.deskState(sid);
  if (s.person && ptype === 'mouse') C.openProfile(s.person.id);
  else showTip(sid, true);
}
function place(tip, el) {
  const stage = EL.querySelector('#stage'), r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  let x = r.left + r.width / 2 - sr.left; const y = r.top - sr.top;
  const tw = tip.offsetWidth || 250, th = tip.offsetHeight || 100, below = y - th - 14 < 0;
  tip.classList.toggle('below', below);
  x = Math.max(tw / 2 + 8, Math.min(sr.width - tw / 2 - 8, x));
  tip.style.left = x + 'px'; tip.style.top = (below ? r.bottom - sr.top : y) + 'px';
}
function showTip(sid, interactive) {
  const idx = C.idx, g = EL.querySelector(`[data-seat="${CSS.escape(sid)}"]`), tip = tipEl();
  if (!g) return;
  const s = idx.deskState(sid), p = s.person, i = idx.desk[sid];
  let h = `<div class="seat-id">Puesto ${escape(i.desk.code)} · ${escape(i.zone?.name || '')}</div>`;
  if (!p) {
    h += `<div class="nm">${s.state === 'blocked' ? 'Puesto bloqueado' : i.desk.type === 'flexible' ? 'Puesto flexible libre' : 'Puesto libre'}</div><div class="sub">${s.state === 'blocked' ? 'No disponible para reservas' : 'Disponible para reservar hoy'}</div>`;
    if (interactive && s.state !== 'blocked') h += `<div class="tip-actions"><a class="btn btn-sm btn-primary" href="empleado.html#/reservas?desk=${encodeURIComponent(sid)}">Reservar este puesto</a></div>`;
  } else {
    const extra = { occ: 'En oficina', meet: 'En reunión', away: `${STATUS[p.status]?.label || ''} · puesto sin usar`, res: 'Reservado hoy · sin check-in', checked: 'Puesto flexible · en oficina' }[s.state];
    h += `<div class="tip-row">${avatar(p, 34)}<div><div class="nm">${escape(p.name)}</div><div class="sub">${escape(p.cargo)}</div><div class="sub">${extra} · Anexo ${escape(p.ext)}</div></div></div>`;
    h += interactive ? `<div class="tip-actions"><button type="button" class="btn btn-sm" data-open="${p.id}">Ver perfil</button></div>` : '<div class="sub" style="margin-top:6px">Clic para ver el perfil</div>';
  }
  tip.innerHTML = h; tip.classList.toggle('interactive', !!interactive); tip.hidden = false;
  place(tip, g);
}
function roomTip(g) {
  const idx = C.idx, f = floor(), rm = f.rooms.find(r => r.id === g.dataset.room), tip = tipEl();
  if (!rm) return;
  const busy = rm.cap ? roomBusyNow(C.db, idx.company.id, rm.id) : null;
  const next = rm.cap ? C.db.query('roomBookings', b => b.companyId === idx.company.id && b.roomId === rm.id && b.date === today()).sort((a, b) => a.start.localeCompare(b.start)) : [];
  tip.innerHTML = `<div class="seat-id">${escape(f.name)}</div><div class="nm">${escape(rm.name)}</div>${rm.cap ? `<div class="sub">${rm.cap} personas · ${busy ? `En uso: ${escape(busy.title)} (hasta ${busy.end})` : 'Disponible ahora'}</div><div class="sub" style="margin-top:6px">Hoy: ${next.length ? next.map(b => `${b.start}–${b.end}`).join(', ') : 'sin reservas'}</div>` : ''}`;
  tip.classList.add('interactive'); tip.hidden = false;
  place(tip, g.querySelector('.room-label') || g);
}

function combo(el) {
  const input = el.querySelector('#mapQ'), list = el.querySelector('#mapList');
  let items = [], active = -1;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const draw = () => {
    items = C.idx.search(input.value, 8);
    if (!items.length) { if (input.value.trim()) { list.innerHTML = '<li aria-disabled="true"><span class="muted">Sin coincidencias</span></li>'; list.hidden = false; } else close(); return; }
    list.innerHTML = items.map((p, i) => `<li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === active}">${avatar(p, 28)}<span><b>${escape(p.name)}</b><br><span class="muted small">${escape(p.cargo)}</span></span><span class="where">${escape(C.idx.whereText(p))}</span></li>`).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
  };
  const choose = i => { const p = items[i]; if (!p) return; close(); input.value = p.name; locate(p.id); };
  input.addEventListener('input', () => { active = 0; draw(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? active : 0); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', e => e.preventDefault());
  list.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) choose(+li.dataset.i); });
  input.addEventListener('blur', () => setTimeout(close, 150));
}

export function locate(pid) {
  const idx = C.idx, p = idx.byId[pid];
  if (!p) return;
  const sid = idx.seatOf(p);
  if (!sid) { toast(`${p.name} no tiene puesto en la oficina hoy (${p.remoteOnly ? 'remoto' : 'sin reserva'}).`, 'warning'); return; }
  const i = idx.desk[sid];
  st.hl = sid;
  if (st.floorId !== i.floor.id) { st.floorId = i.floor.id; }
  paint();
  const input = EL.querySelector('#mapQ'); if (input) input.value = p.name;
  const c = chairPos(i.desk);
  st.pz.focus(c.x, c.y, null, () => showTip(sid, false));
  const s = idx.statusOf(p);
  toast(s === 'remoto' || s === 'vacaciones' ? `${p.first} está ${s === 'remoto' ? 'en remoto' : 'de vacaciones'} hoy; este es su puesto.` : `Ubicando a ${p.name} · ${idx.whereText(p)}`, 'info');
}

export function render(el, ctx, q = {}) {
  C = ctx; EL = el;
  const fresh = !el.querySelector('.map-layout');
  if (fresh) mount(el);
  paint();
  if (fresh) st.pz.reset(false);
  if (q.p) requestAnimationFrame(() => locate(q.p));
}
export function update(el, ctx) { C = ctx; EL = el; if (el.querySelector('.map-layout')) paint(); else render(el, ctx); }
