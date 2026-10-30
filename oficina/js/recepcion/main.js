// Recepción / kiosko: buscar anfitrión, registrar visitas con credencial,
// aviso al anfitrión, visitas esperadas y en el edificio, anuncios del kiosko.
import { db, auth } from '../data/db.js';
import { escape, toast, time } from '../../../assets/core/ui.js';
import { buildIndex, getCompanyId, avatar, statusBadge } from '../shared/util.js';
import { mountTopbar } from '../shared/topnav.js';
import { miniMap } from '../shared/floorplan.js';
import { today, hm, fmtDay } from '../shared/dates.js';
import { VISIT_REASONS, VISIT_BADGE, VISIT_LABEL, registerVisit, checkInVisit, checkOutVisit, badgeFor, hostWhere } from '../shared/visits.js';

const user = auth.require(['admin', 'recepcion']);
const view = document.getElementById('view');
let idx = buildIndex(db, getCompanyId(db));
const st = { q: '', host: null, tab: 'hoy' };

mountTopbar(document.getElementById('topbar'), { db, auth, links: [{ href: '#', label: 'Kiosko de recepción', ico: '🖥️' }], onCompany: () => { idx = buildIndex(db, getCompanyId(db)); st.host = null; st.q = ''; render(); } });

function hostCard(p) {
  const sid = idx.seatOf(p), s = idx.statusOf(p);
  const info = sid ? idx.desk[sid] : null;
  const msg = !sid ? `${escape(p.first || p.name)} no tiene puesto en la oficina hoy. Avisaremos por correo y a su anexo ${escape(p.ext)}.`
    : `${info.floor.num === 1 ? 'Está en este mismo piso' : `Toma el ascensor al ${escape(info.floor.name.toLowerCase())}`} y busca la ${escape(info.zone?.name || 'zona indicada')}.${s === 'reunion' ? ' Ahora está en reunión.' : s === 'remoto' ? ' Hoy trabaja en remoto.' : s === 'vacaciones' ? ' Está de vacaciones.' : ''}`;
  return `<div class="card stack" style="box-shadow:none;gap:10px"><div class="row" style="flex-wrap:nowrap">${avatar(p, 56)}<div style="min-width:0"><b style="font-size:18px">${escape(p.name)}</b><div class="muted small">${escape(p.cargo)} · ${escape(idx.area(p)?.name || '')}</div><div style="margin-top:4px">${statusBadge(s)}</div></div></div>
    <div><b style="font-size:18px">${sid ? `${escape(info.floor.name)} · Puesto ${escape(info.desk.code)}` : 'Sin puesto hoy'}</b><p class="muted" style="margin:4px 0 0">${msg}</p></div>
    ${info ? miniMap(info.floor, idx, sid) : ''}</div>`;
}

function render() {
  const s = db.getValue('site', {}), T = today();
  const visits = db.query('visitors', v => v.companyId === idx.company.id && v.date === T);
  const expected = visits.filter(v => v.status === 'esperada').sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
  const inside = visits.filter(v => v.status === 'en sitio'), gone = visits.filter(v => v.status === 'salió');
  const ann = db.query('announcements', a => a.published && ['todos', 'kiosko'].includes(a.audience) && (!a.companyId || a.companyId === idx.company.id));
  const results = st.q.trim() ? idx.search(st.q, 6).filter(p => !p.remoteOnly || true) : [];
  const host = st.host ? idx.byId[st.host] : null;
  const vItem = v => { const h = idx.byId[v.hostId]; return `<li class="visit-item ${v.status === 'salió' ? 'gone' : ''}"><span class="avatar" style="--av:var(--accent);--size:38px">${escape(v.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span><div class="info"><b>${escape(v.name)}</b><small>${escape(v.org || 'Particular')} · visita a ${escape(h?.name || '—')} · ${v.status === 'esperada' ? `esperada ${escape(v.expectedAt)}` : `${time(v.checkIn)}${v.checkOut ? ' → ' + time(v.checkOut) : ''}`}</small></div><span class="badge ${VISIT_BADGE[v.status]}">${VISIT_LABEL[v.status]}</span><span class="row gap-sm">${v.status === 'esperada' ? `<button class="btn btn-sm btn-primary" data-in="${v.id}">Llegó</button>` : ''}${v.status === 'en sitio' ? `<button class="btn btn-sm" data-badge="${v.id}">🪪</button><button class="btn btn-sm" data-out="${v.id}">Salida</button>` : ''}</span></li>`; };
  view.innerHTML = `
    <div class="kiosk-head"><div><p class="eyebrow" style="margin:0">${escape(idx.company.name)} · ${escape(idx.company.address || '')}</p><h1>${escape(s.kioskWelcome || 'Bienvenido/a')}</h1><p class="muted" style="margin:6px 0 0">${escape(s.kioskSubtitle || '')}</p></div>
      <div class="row"><div class="clock" data-clock></div><button class="btn kiosk-hide" data-kiosk>⤢ Modo kiosko</button></div></div>
    ${ann.length ? `<div class="card ticker" aria-label="Anuncios"><b aria-hidden="true">📣</b><div style="overflow:hidden;flex:1"><div class="ticker-track">${[...ann, ...ann].map(a => `<span><b>${escape(a.title)}:</b> ${escape(a.body)}</span>`).join('')}</div></div></div>` : ''}
    <div class="kiosk-grid">
      <div class="card stack">
        <h2 style="font-size:22px;margin:0">1 · ¿A quién visitas?</h2>
        <div class="k-search"><input class="input" type="search" data-q placeholder="Escribe un nombre o área…" value="${escape(st.q)}" aria-label="Buscar anfitrión" autocomplete="off"></div>
        <div class="k-results">${st.q.trim() ? (results.length ? results.map(p => `<button type="button" class="k-res" data-host="${p.id}" aria-pressed="${st.host === p.id}">${avatar(p, 40)}<span><b>${escape(p.name)}</b><br><span class="muted small">${escape(p.cargo)} · ${escape(idx.area(p)?.name || '')}</span></span><span class="where">${escape(idx.seatOf(p) ? idx.desk[idx.seatOf(p)].floor.name : 'Remoto')}<small>${escape(idx.seatOf(p) ? idx.desk[idx.seatOf(p)].desk.code : '')}</small></span></button>`).join('') : '<p class="muted">No encontramos a nadie con ese nombre. Consulta en el mesón.</p>') : '<p class="muted">Escribe el nombre de la persona que vienes a ver y te mostraremos dónde está.</p>'}</div>
        <div class="k-loc">${host ? hostCard(host) : ''}</div>
      </div>
      <div class="stack">
        <form class="card stack" data-form novalidate>
          <h2 style="font-size:22px;margin:0">2 · Tus datos</h2>
          <div class="form-grid">
            <div class="field span-2"><label for="v-name">Nombre completo *</label><input class="input" id="v-name" name="name" required autocomplete="name" placeholder="Ej: Laura Méndez"></div>
            <div class="field"><label for="v-doc">RUT / documento</label><input class="input" id="v-doc" name="doc" placeholder="12.345.678-9"></div>
            <div class="field"><label for="v-org">Empresa</label><input class="input" id="v-org" name="org" placeholder="Ej: Consultora Pampa"></div>
            <div class="field span-2"><label for="v-host">Anfitrión *</label><select class="select" id="v-host" name="hostId" required><option value="">Selecciona a quién visitas…</option>${idx.people.filter(p => !p.remoteOnly).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(p => `<option value="${p.id}" ${p.id === st.host ? 'selected' : ''}>${escape(p.name)} — ${escape(idx.area(p)?.name || '')}</option>`).join('')}</select></div>
            <div class="field"><label for="v-reason">Motivo</label><select class="select" id="v-reason" name="reason">${VISIT_REASONS.map(r => `<option>${r}</option>`).join('')}</select></div>
            <div class="field"><label for="v-email">Correo (opcional)</label><input class="input" id="v-email" name="email" type="email" placeholder="nombre@correo.com"></div>
            <label class="check span-2"><input type="checkbox" name="ok"> Acepto las normas de seguridad y el registro de mi visita.</label>
            <p class="form-error span-2" data-err role="alert"></p>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">🪪 Registrar y obtener credencial</button>
        </form>
      </div>
    </div>
    <div class="card stack">
      <div class="card-h"><h2 style="font-size:22px;margin:0">Visitas de hoy</h2><span class="muted small">${inside.length} en el edificio · ${expected.length} esperadas · ${visits.length} en total</span></div>
      <div class="tabs" role="tablist">${[['hoy', `Esperadas (${expected.length})`], ['dentro', `En el edificio (${inside.length})`], ['fuera', `Salieron (${gone.length})`]].map(([k, l]) => `<button class="tab ${st.tab === k ? 'active' : ''}" role="tab" aria-selected="${st.tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
      <ul class="visit-list">${(st.tab === 'hoy' ? expected : st.tab === 'dentro' ? inside : gone).map(vItem).join('') || '<li class="muted">Nada por aquí.</li>'}</ul>
    </div>`;
  tick();
  const q = view.querySelector('[data-q]');
  q.addEventListener('input', e => { st.q = e.target.value; const pos = e.target.selectionStart; render(); const n = view.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const r = idx.search(st.q, 1)[0]; if (r) { st.host = r.id; render(); } } });
  view.querySelector('[data-form]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = view.querySelector('[data-err]');
    const v = { name: f.name.value.trim(), doc: f.doc.value.trim(), org: f.org.value.trim(), hostId: f.hostId.value, reason: f.reason.value, email: f.email.value.trim() };
    const problem = !v.name ? ['name', 'Ingresa tu nombre completo.'] : !v.hostId ? ['hostId', 'Selecciona a la persona que visitas.'] : v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ? ['email', 'El correo no parece válido.'] : !f.ok.checked ? ['ok', 'Debes aceptar las normas de seguridad.'] : null;
    f.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid'));
    if (problem) { err.textContent = problem[1]; f[problem[0]].classList.add('invalid'); f[problem[0]].focus(); return; }
    // Si la persona estaba pre-registrada para hoy, se usa ese registro.
    const pre = db.find('visitors', x => x.companyId === idx.company.id && x.date === today() && x.status === 'esperada' && x.hostId === v.hostId && x.name.toLowerCase() === v.name.toLowerCase());
    const row = pre ? checkInVisit(db, idx, pre, auth.current()) : registerVisit(db, idx, v, auth.current());
    st.host = null; st.q = ''; st.tab = 'dentro';
    idx = buildIndex(db, idx.company.id); render();
    badgeFor(db, idx, row);
  });
  view.querySelector('[data-kiosk]').onclick = () => setKiosk(true);
}

view.addEventListener('click', e => {
  const h = e.target.closest('[data-host]'), i = e.target.closest('[data-in]'), o = e.target.closest('[data-out]'), b = e.target.closest('[data-badge]'), t = e.target.closest('[data-tab]');
  if (h) { st.host = h.dataset.host; render(); if (innerWidth < 1000) view.querySelector('.k-loc')?.scrollIntoView({ block: 'start' }); }
  if (i) { const row = checkInVisit(db, idx, db.get('visitors', i.dataset.in), auth.current()); st.tab = 'dentro'; render(); badgeFor(db, idx, row); }
  if (o) checkOutVisit(db, db.get('visitors', o.dataset.out), auth.current());
  if (b) badgeFor(db, idx, db.get('visitors', b.dataset.badge));
  if (t) { st.tab = t.dataset.tab; render(); }
});

function setKiosk(on) {
  document.body.classList.toggle('kiosk', on);
  if (on) { document.documentElement.requestFullscreen?.().catch(() => {}); toast('Modo kiosko activo. Usa el botón inferior derecho para salir.', 'info'); }
  else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
document.getElementById('kioskExit').onclick = () => setKiosk(false);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('kiosk'); });

function tick() { const c = view.querySelector('[data-clock]'); if (c) c.textContent = `${fmtDay(today(), { weekday: 'short', day: 'numeric', month: 'short' })} · ${hm()}`; }
setInterval(tick, 15000);

let tm;
db.subscribe(() => {
  clearTimeout(tm);
  tm = setTimeout(() => {
    const u = auth.current(); if (!u || !['admin', 'recepcion'].includes(u.role) || u.active === false) { location.replace('login.html?next=recepcion.html'); return; }
    idx = buildIndex(db, idx.company && db.get('companies', idx.company.id) ? idx.company.id : getCompanyId(db));
    if (document.querySelector('.modal-backdrop')) return;
    const ae = document.activeElement;
    if (ae && view.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.closest('[data-form]')) return;
    render();
  }, 80);
});
render();
