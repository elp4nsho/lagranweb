// Editor de planos: mover/agregar/eliminar escritorios y salas sobre una grilla,
// zonas (barrios) y asignación de puestos arrastrando personas o con un selector.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { uid } from '../../../assets/core/db.js';
import { pageHead } from './common.js';
import { floorBase, zoneBoxes, roomSVG, seatSVG, chairPos, compass } from '../shared/floorplan.js';
import { ROOM_TYPES, avatar, norm } from '../shared/util.js';

export const live = false;
const SNAP = 10;
const snap = v => Math.round(v / SNAP) * SNAP;
const clampX = v => Math.max(56, Math.min(1144, v)), clampY = v => Math.max(64, Math.min(696, v));

let S = null; // estado del editor

function hasChanges() { return S && S.dirty; }
window.addEventListener('beforeunload', e => { if (hasChanges()) { e.preventDefault(); e.returnValue = ''; } });

export function render(el, ctx, { id }) {
  const { db, idx } = ctx;
  const floor = idx.floors.find(f => f.id === id);
  if (!floor) { el.innerHTML = `<div class="card empty">Piso no encontrado en ${escape(idx.company.name)}. <a href="#/pisos">Volver a pisos</a></div>`; return; }
  if (!S || S.id !== id) {
    S = { id, tool: 'select', roomType: 'meeting', sel: null, dirty: false, q: '',
      draft: JSON.parse(JSON.stringify({ name: floor.name, rooms: floor.rooms, desks: floor.desks, zones: floor.zones })),
      assign: Object.fromEntries(floor.desks.map(d => [d.id, idx.owner[d.id]?.id || null])) };
  }
  el.innerHTML = `${pageHead(`Editor · ${S.draft.name}`, `${escape(idx.company.name)} · arrastra para mover, usa las herramientas para agregar y arrastra personas a un escritorio para asignarlo.`,
    '<button class="btn btn-ghost" data-back>← Pisos</button><button class="btn" data-discard>Descartar</button><button class="btn btn-primary" data-save>💾 Guardar cambios</button>')}
    <div class="editor">
      <div class="card" style="padding:0;overflow:hidden">
        <div class="ed-tools" role="toolbar" aria-label="Herramientas del editor">
          <button class="btn btn-sm" data-tool="select" title="Seleccionar y mover (V)">↖ Seleccionar</button>
          <button class="btn btn-sm" data-tool="desk" title="Agregar escritorio (D)">＋ Escritorio</button>
          <button class="btn btn-sm" data-tool="room" title="Agregar sala (S)">＋ Sala</button>
          <select class="select select-sm" data-roomtype aria-label="Tipo de sala" style="width:auto">${Object.entries(ROOM_TYPES).map(([k, v]) => `<option value="${k}" ${k === S.roomType ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <span class="sep"></span>
          <button class="btn btn-sm btn-ghost" data-op="rotate" title="Rotar escritorio (R)">⟳ Rotar</button>
          <button class="btn btn-sm btn-ghost" data-op="dup" title="Duplicar (Ctrl+D)">⧉ Duplicar</button>
          <button class="btn btn-sm btn-ghost" data-op="del" title="Eliminar (Supr)">🗑 Eliminar</button>
          <span class="muted small" data-status style="margin-left:auto"></span>
        </div>
        <div class="ed-stage"><svg class="fp editing" id="edSvg" viewBox="0 0 1200 760" role="application" aria-label="Plano editable" tabindex="0"></svg></div>
        <p class="muted small" style="margin:0;padding:8px 12px">Atajos: V seleccionar · D escritorio · S sala · R rotar · flechas mover · Supr eliminar · Esc soltar. Grilla de ${SNAP} px.</p>
      </div>
      <aside class="stack">
        <div class="card" data-props></div>
        <div class="card"><div class="card-h"><h3>Personas sin puesto</h3><span class="badge" data-unc></span></div>
          <input class="input input-sm" type="search" placeholder="Buscar persona…" data-pq value="${escape(S.q)}" aria-label="Buscar persona sin puesto">
          <p class="muted small" style="margin:8px 0">Arrástralas a un escritorio del plano.</p><div class="ed-people" data-people></div></div>
        <div class="card" data-zones></div>
      </aside>
    </div>`;
  const svg = el.querySelector('#edSvg');
  const P = () => S.draft;
  const sel = () => S.sel ? (S.sel.kind === 'desk' ? P().desks.find(d => d.id === S.sel.id) : P().rooms.find(r => r.id === S.sel.id)) : null;
  const person = pid => idx.byId[pid];
  const touch = () => { S.dirty = true; el.querySelector('[data-status]').textContent = '● Cambios sin guardar'; };

  function draw() {
    const d = P();
    let o = floorBase(d) + zoneBoxes(d, z => z.areaId && idx.areaById[z.areaId] ? `${z.name} · ${idx.areaById[z.areaId].name}` : z.name);
    d.rooms.forEach(r => { o += roomSVG(r, { selected: S.sel?.kind === 'room' && S.sel.id === r.id }); });
    d.desks.forEach(k => {
      const on = S.sel?.kind === 'desk' && S.sel.id === k.id;
      o += `<g class="ed-desk ${k.type}${on ? ' sel' : ''}" data-desk="${k.id}"><g transform="translate(${k.x} ${k.y}) rotate(${k.rot || 0})"><rect class="desk" x="-33" y="-21" width="66" height="42" rx="5"/></g><text class="code" x="${k.x}" y="${k.y}">${escape(k.code)}</text></g>`;
      const pid = S.assign[k.id], p = person(pid);
      o += seatSVG(k, p ? { state: 'occ', person: p } : { state: k.type === 'bloqueado' ? 'blocked' : 'free' }, { interactive: false, bookable: k.type !== 'fijo' || !!p });
    });
    const r = S.sel?.kind === 'room' ? sel() : null;
    if (r) o += `<rect class="handle" data-handle x="${r.x + r.w - 8}" y="${r.y + r.h - 8}" width="16" height="16" rx="3"/>`;
    svg.innerHTML = o + compass();
    svg.classList.toggle('tool-desk', S.tool === 'desk'); svg.classList.toggle('tool-room', S.tool === 'room');
    el.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('btn-primary', b.dataset.tool === S.tool); b.setAttribute('aria-pressed', b.dataset.tool === S.tool); });
    el.querySelector('[data-status]').textContent = S.dirty ? '● Cambios sin guardar' : `${d.desks.length} escritorios · ${d.rooms.length} espacios`;
  }

  function drawProps() {
    const box = el.querySelector('[data-props]'), it = sel(), d = P();
    if (!it) {
      const assigned = d.desks.filter(k => S.assign[k.id]).length;
      box.innerHTML = `<div class="card-h"><h3>Piso</h3></div><div class="stack" style="gap:10px"><div class="field"><label for="pf-name">Nombre</label><input class="input" id="pf-name" data-fp="name" value="${escape(d.name)}"></div>
        <dl class="kv"><dt>Escritorios</dt><dd>${d.desks.length}</dd><dt>Asignados</dt><dd>${assigned}</dd><dt>Flexibles</dt><dd>${d.desks.filter(k => k.type === 'flexible').length}</dd><dt>Bloqueados</dt><dd>${d.desks.filter(k => k.type === 'bloqueado').length}</dd><dt>Salas</dt><dd>${d.rooms.filter(r => r.cap).length}</dd></dl>
        <p class="muted small" style="margin:0">Selecciona un escritorio o sala para editar sus propiedades.</p></div>`;
      return;
    }
    if (S.sel.kind === 'desk') {
      const pid = S.assign[it.id];
      const people = idx.people.filter(p => !p.remoteOnly).sort((a, b) => a.name.localeCompare(b.name, 'es'));
      box.innerHTML = `<div class="card-h"><h3>Escritorio</h3><span class="mono badge">${escape(it.code)}</span></div><div class="stack" style="gap:10px">
        <div class="field"><label for="dp-code">Código</label><input class="input input-sm" id="dp-code" data-dp="code" value="${escape(it.code)}"></div>
        <div class="field"><label for="dp-type">Tipo</label><select class="select select-sm" id="dp-type" data-dp="type"><option value="fijo" ${it.type === 'fijo' ? 'selected' : ''}>Fijo (asignado a una persona)</option><option value="flexible" ${it.type === 'flexible' ? 'selected' : ''}>Flexible (reservable)</option><option value="bloqueado" ${it.type === 'bloqueado' ? 'selected' : ''}>Bloqueado</option></select></div>
        <div class="field"><label for="dp-zone">Zona / barrio</label><select class="select select-sm" id="dp-zone" data-dp="zoneId">${d.zones.map(z => `<option value="${z.id}" ${z.id === it.zoneId ? 'selected' : ''}>${escape(z.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="dp-person">Persona asignada</label><select class="select select-sm" id="dp-person" data-assign><option value="">— Libre —</option>${people.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${escape(p.name)}${p.deskId && p.deskId !== it.id && Object.values(S.assign).includes(p.id) ? ' (tiene puesto)' : ''}</option>`).join('')}</select></div>
        <div class="row gap-sm"><button class="btn btn-sm" data-op="rotate">⟳ Rotar</button><button class="btn btn-sm" data-op="dup">⧉ Duplicar</button><button class="btn btn-sm btn-danger" data-op="del">Eliminar</button></div>
        <p class="muted small" style="margin:0">Posición: ${it.x}, ${it.y} · rotación ${it.rot || 0}°</p></div>`;
    } else {
      box.innerHTML = `<div class="card-h"><h3>Espacio</h3><span class="badge">${escape(ROOM_TYPES[it.type] || it.type)}</span></div><div class="form-grid">
        <div class="field span-2"><label for="rp-name">Nombre</label><input class="input input-sm" id="rp-name" data-rp="name" value="${escape(it.name)}"></div>
        <div class="field span-2"><label for="rp-type">Tipo</label><select class="select select-sm" id="rp-type" data-rp="type">${Object.entries(ROOM_TYPES).map(([k, v]) => `<option value="${k}" ${k === it.type ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        ${['meeting', 'boardroom'].includes(it.type) ? `<div class="field span-2"><label for="rp-cap">Capacidad (personas)</label><input class="input input-sm" type="number" min="1" max="40" id="rp-cap" data-rp="cap" value="${it.cap || 4}"></div>` : ''}
        ${['x', 'y', 'w', 'h'].map(k => `<div class="field"><label for="rp-${k}">${{ x: 'X', y: 'Y', w: 'Ancho', h: 'Alto' }[k]}</label><input class="input input-sm" type="number" step="10" id="rp-${k}" data-rp="${k}" value="${it[k]}"></div>`).join('')}
        <div class="row gap-sm span-2"><button class="btn btn-sm" data-op="dup">⧉ Duplicar</button><button class="btn btn-sm btn-danger" data-op="del">Eliminar</button></div></div>`;
    }
  }

  function drawPeople() {
    const assigned = new Set(Object.values(S.assign).filter(Boolean));
    const otherFloor = new Set(idx.people.filter(p => p.deskId && !P().desks.some(d => d.id === p.deskId) && idx.desk[p.deskId]).map(p => p.id));
    const list = idx.people.filter(p => !p.remoteOnly && !assigned.has(p.id) && !otherFloor.has(p.id) && (!S.q || norm(p.name + ' ' + p.cargo).includes(norm(S.q)))).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    el.querySelector('[data-unc]').textContent = list.length;
    el.querySelector('[data-people]').innerHTML = list.map(p => `<div class="ed-person" data-pid="${p.id}" tabindex="0" title="Arrastra al plano">${avatar(p, 26)}<span><b>${escape(p.name)}</b><br><span class="muted">${escape(idx.area(p)?.name || '')}</span></span></div>`).join('') || '<p class="muted small">Todas las personas de esta empresa tienen puesto (o trabajan remoto).</p>';
  }

  function drawZones() {
    const d = P();
    el.querySelector('[data-zones]').innerHTML = `<div class="card-h"><h3>Zonas / barrios</h3><button class="btn btn-sm" data-addzone>＋ Zona</button></div>
      <div class="stack" style="gap:8px">${d.zones.map(z => `<div class="row gap-sm" style="flex-wrap:nowrap"><input class="input input-sm" data-zname="${z.id}" value="${escape(z.name)}" aria-label="Nombre de la zona" style="flex:1;min-width:0"><select class="select select-sm" data-zarea="${z.id}" aria-label="Área del barrio" style="width:130px"><option value="">Abierta</option>${idx.areas.map(a => `<option value="${a.id}" ${a.id === z.areaId ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select><button class="btn btn-sm btn-ghost" data-zdel="${z.id}" aria-label="Eliminar zona">✕</button></div>`).join('')}</div>
      <p class="muted small" style="margin:8px 0 0">Un barrio asociado a un área puede restringir las reservas (ver Reglas).</p>`;
  }
  const all = () => { draw(); drawProps(); drawPeople(); drawZones(); };
  all();

  // ----- Interacción en el SVG -----
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x, y: q.y }; };
  let drag = null;
  const nearestZone = (x, y) => {
    let best = null, bd = Infinity;
    P().desks.forEach(d => { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d.zoneId; } });
    return best || P().zones[0]?.id || (P().zones.push({ id: 'z' + uid(), letter: 'A', name: 'Zona A', areaId: null }), P().zones[0].id);
  };
  const nextCode = zoneId => {
    const z = P().zones.find(x => x.id === zoneId), num = floor.num, pre = `${num}${z?.letter || 'X'}-`;
    const n = Math.max(0, ...P().desks.filter(d => d.code.startsWith(pre)).map(d => +d.code.slice(pre.length) || 0)) + 1;
    return pre + n;
  };
  function addDesk(x, y, base = {}) {
    const zoneId = base.zoneId || nearestZone(x, y);
    const d = { id: `${idx.company.id}-d${uid()}`, code: nextCode(zoneId), x: clampX(snap(x)), y: clampY(snap(y)), rot: base.rot || 0, zoneId, type: base.type === 'bloqueado' ? 'bloqueado' : 'flexible' };
    P().desks.push(d); S.assign[d.id] = null; S.sel = { kind: 'desk', id: d.id }; touch(); all();
    return d;
  }
  function addRoom(x, y, base = {}) {
    const type = base.type || S.roomType;
    const r = { id: 'r' + uid(), type, name: base.name ? `${base.name} (copia)` : ROOM_TYPES[type], x: snap(Math.min(1180 - (base.w || 200), Math.max(20, x))), y: snap(Math.min(740 - (base.h || 150), Math.max(20, y))), w: base.w || 200, h: base.h || 150, cap: ['meeting', 'boardroom'].includes(type) ? (base.cap || 6) : 0 };
    P().rooms.push(r); S.sel = { kind: 'room', id: r.id }; touch(); all();
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button) return;
    svg.focus({ preventScroll: true });
    const p = pt(e);
    if (S.tool === 'desk') { addDesk(p.x, p.y); return; }
    if (S.tool === 'room') { addRoom(p.x - 100, p.y - 75); S.tool = 'select'; draw(); return; }
    const h = e.target.closest('[data-handle]'), dk = e.target.closest('[data-desk]') || (e.target.closest('.seat') && { dataset: { desk: e.target.closest('.seat').dataset.seat } }), rm = e.target.closest('[data-room]');
    if (h) { const r = sel(); drag = { kind: 'resize', r, sx: p.x, sy: p.y, w: r.w, h: r.h }; }
    else if (dk) { S.sel = { kind: 'desk', id: dk.dataset.desk }; const d = sel(); drag = { kind: 'move', it: d, dx: p.x - d.x, dy: p.y - d.y, moved: false }; draw(); drawProps(); }
    else if (rm) { S.sel = { kind: 'room', id: rm.dataset.room }; const r = sel(); drag = { kind: 'move', it: r, dx: p.x - r.x, dy: p.y - r.y, moved: false, room: true }; draw(); drawProps(); }
    else { S.sel = null; draw(); drawProps(); return; }
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = pt(e);
    if (drag.kind === 'resize') { drag.r.w = Math.max(60, snap(drag.w + p.x - drag.sx)); drag.r.h = Math.max(60, snap(drag.h + p.y - drag.sy)); drag.r.w = Math.min(drag.r.w, 1180 - drag.r.x); drag.r.h = Math.min(drag.r.h, 740 - drag.r.y); }
    else if (drag.room) { drag.it.x = snap(Math.max(20, Math.min(1180 - drag.it.w, p.x - drag.dx))); drag.it.y = snap(Math.max(20, Math.min(740 - drag.it.h, p.y - drag.dy))); }
    else { drag.it.x = clampX(snap(p.x - drag.dx)); drag.it.y = clampY(snap(p.y - drag.dy)); }
    drag.moved = true;
    draw();
  });
  const endDrag = () => { if (drag?.moved) { touch(); drawProps(); } drag = null; };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  function op(name) {
    const it = sel();
    if (!it) return toast('Selecciona un elemento primero', 'info');
    if (name === 'rotate') { if (S.sel.kind !== 'desk') return; it.rot = ((it.rot || 0) + 180) % 360; }
    if (name === 'dup') { if (S.sel.kind === 'desk') addDesk(it.x + 74, it.y, it); else addRoom(it.x + 20, it.y + 20, it); return; }
    if (name === 'del') {
      if (S.sel.kind === 'desk') { P().desks = P().desks.filter(d => d.id !== it.id); delete S.assign[it.id]; }
      else P().rooms = P().rooms.filter(r => r.id !== it.id);
      S.sel = null;
    }
    touch(); all();
  }
  el.querySelector('.ed-tools').addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'), o = e.target.closest('[data-op]');
    if (t) { S.tool = t.dataset.tool; draw(); if (S.tool !== 'select') toast(S.tool === 'desk' ? 'Haz clic en el plano para agregar escritorios (Esc para terminar)' : 'Haz clic en el plano para ubicar la sala', 'info'); }
    if (o) op(o.dataset.op);
  });
  el.querySelector('[data-roomtype]').addEventListener('change', e => { S.roomType = e.target.value; S.tool = 'room'; draw(); });
  svg.addEventListener('keydown', e => {
    const it = sel(), k = e.key.toLowerCase();
    if (k === 'escape') { S.tool = 'select'; S.sel = null; all(); return; }
    if (k === 'v') { S.tool = 'select'; draw(); } else if (k === 'd' && !e.ctrlKey && !e.metaKey) { S.tool = 'desk'; draw(); } else if (k === 's' && !e.ctrlKey && !e.metaKey) { S.tool = 'room'; draw(); }
    else if (k === 'r' && it) op('rotate');
    else if ((k === 'delete' || k === 'backspace') && it) { e.preventDefault(); op('del'); }
    else if (k === 'd' && (e.ctrlKey || e.metaKey) && it) { e.preventDefault(); op('dup'); }
    else if (it && e.key.startsWith('Arrow')) {
      e.preventDefault(); const st = e.shiftKey ? 40 : SNAP;
      if (e.key === 'ArrowLeft') it.x -= st; if (e.key === 'ArrowRight') it.x += st; if (e.key === 'ArrowUp') it.y -= st; if (e.key === 'ArrowDown') it.y += st;
      if (S.sel.kind === 'desk') { it.x = clampX(it.x); it.y = clampY(it.y); }
      touch(); draw(); drawProps();
    }
  });

  // ----- Panel lateral -----
  const aside = el.querySelector('aside');
  aside.addEventListener('input', e => {
    const t = e.target, it = sel();
    if (t.dataset.fp === 'name') { P().name = t.value; touch(); }
    else if (t.dataset.dp && it) { it[t.dataset.dp] = t.value; touch(); draw(); }
    else if (t.dataset.rp && it) { const k = t.dataset.rp; it[k] = ['x', 'y', 'w', 'h', 'cap'].includes(k) ? Math.max(0, +t.value || 0) : t.value; touch(); draw(); }
    else if (t.dataset.zname) { const z = P().zones.find(x => x.id === t.dataset.zname); z.name = t.value; touch(); draw(); }
    else if (t.matches('[data-pq]')) { S.q = t.value; drawPeople(); }
  });
  aside.addEventListener('change', e => {
    const t = e.target, it = sel();
    if (t.matches('[data-assign]') && it) { assign(t.value || null, it.id); }
    else if (t.dataset.rp === 'type' && it) { if (['meeting', 'boardroom'].includes(t.value) && !it.cap) it.cap = 6; if (!['meeting', 'boardroom'].includes(t.value)) it.cap = 0; drawProps(); }
    else if (t.dataset.dp === 'type' && it) { if (t.value !== 'fijo' && S.assign[it.id]) { S.assign[it.id] = null; toast('El escritorio quedó libre al cambiar su tipo', 'info'); } all(); }
    else if (t.dataset.zarea) { P().zones.find(x => x.id === t.dataset.zarea).areaId = t.value || null; touch(); draw(); }
  });
  aside.addEventListener('click', e => {
    const o = e.target.closest('[data-op]');
    if (o) return op(o.dataset.op);
    if (e.target.closest('[data-addzone]')) {
      const used = new Set(P().zones.map(z => z.letter)); let L = 'A'; while (used.has(L)) L = String.fromCharCode(L.charCodeAt(0) + 1);
      P().zones.push({ id: 'z' + uid(), letter: L, name: `Zona ${L}`, areaId: null }); touch(); drawZones(); drawProps();
    }
    const zd = e.target.closest('[data-zdel]');
    if (zd) {
      if (P().zones.length <= 1) return toast('Debe existir al menos una zona', 'warning');
      const other = P().zones.find(z => z.id !== zd.dataset.zdel);
      P().desks.forEach(d => { if (d.zoneId === zd.dataset.zdel) d.zoneId = other.id; });
      P().zones = P().zones.filter(z => z.id !== zd.dataset.zdel); touch(); all();
    }
  });
  function assign(pid, deskId) {
    Object.keys(S.assign).forEach(k => { if (pid && S.assign[k] === pid) S.assign[k] = null; });
    S.assign[deskId] = pid;
    const d = P().desks.find(x => x.id === deskId);
    if (pid && d.type !== 'fijo') d.type = 'fijo';
    touch(); all();
    if (pid) toast(`${person(pid).name} → puesto ${d.code}`, 'success');
  }

  // Arrastrar personas al plano (pointer events: funciona con ratón y táctil).
  el.querySelector('[data-people]').addEventListener('pointerdown', e => {
    const card = e.target.closest('.ed-person'); if (!card || e.button) return;
    e.preventDefault();
    const p = person(card.dataset.pid);
    const ghost = document.createElement('div'); ghost.className = 'ed-ghost'; ghost.textContent = p.name; document.body.appendChild(ghost);
    card.classList.add('dragging');
    let over = null;
    const move = ev => {
      ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const dk = t?.closest?.('[data-desk]')?.dataset.desk || t?.closest?.('#edSvg .seat')?.dataset.seat || null;
      if (dk !== over) { svg.querySelectorAll('.ed-desk.drop').forEach(x => x.classList.remove('drop')); over = dk; if (dk) svg.querySelector(`[data-desk="${CSS.escape(dk)}"]`)?.classList.add('drop'); }
    };
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      ghost.remove(); card.classList.remove('dragging');
      if (over) { const d = P().desks.find(x => x.id === over); if (d.type === 'bloqueado') toast('Ese escritorio está bloqueado', 'warning'); else { S.sel = { kind: 'desk', id: over }; assign(p.id, over); } }
    };
    move(e);
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });

  // ----- Guardar / descartar -----
  el.querySelector('[data-save]').onclick = () => {
    const d = P();
    const codes = d.desks.map(k => k.code); const dupCode = codes.find((c, i) => codes.indexOf(c) !== i);
    if (dupCode) return toast(`Código de escritorio repetido: ${dupCode}`, 'error');
    db.update('floors', id, { name: d.name.trim() || floor.name, rooms: d.rooms, desks: d.desks, zones: d.zones });
    const deskOf = {}; Object.entries(S.assign).forEach(([k, pid]) => { if (pid) deskOf[pid] = k; });
    const floorDesks = new Set(floor.desks.map(k => k.id).concat(d.desks.map(k => k.id)));
    let changed = 0;
    idx.people.forEach(p => {
      const target = deskOf[p.id] || (p.deskId && floorDesks.has(p.deskId) ? null : p.deskId);
      if ((target || null) !== (p.deskId || null)) { db.update('people', p.id, { deskId: target || null }); changed++; }
    });
    db.log('plano', `Guardó el plano de ${d.name} (${d.desks.length} escritorios, ${changed} asignaciones cambiadas)`, ctx.user.id);
    S.dirty = false;
    toast('Plano guardado. El mapa público ya muestra los cambios.', 'success');
    S = null; ctx.refresh();
  };
  el.querySelector('[data-discard]').onclick = async () => { if (S.dirty && !(await confirm('¿Descartar los cambios sin guardar?', { title: 'Descartar', ok: 'Descartar', danger: true }))) return; S = null; ctx.refresh(); };
  el.querySelector('[data-back]').onclick = async () => { if (S?.dirty && !(await confirm('Tienes cambios sin guardar. ¿Salir igual?', { title: 'Salir del editor', ok: 'Salir', danger: true }))) return; S = null; ctx.go('/pisos'); };
}
