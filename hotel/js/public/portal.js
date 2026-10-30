// Portal del huésped (tras iniciar sesión): perfil, próximas y pasadas estadías, Club Lumen.
import { money, escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { RES_STATES, typeById, guestStays } from '../shared/hotel.js';
import { fmtRange, today } from '../shared/dates.js';
import { roomArt } from './art.js';
import { bookingPanel } from './manage.js';

export function renderPortal(el, params, query) {
  const u = auth.current();
  if (!u || u.role !== 'guest') { location.href = 'login.html?next=' + encodeURIComponent('index.html#/portal'); return { live: false }; }
  let g = db.get('guests', u.guestId) || db.find('guests', x => x.email.toLowerCase() === u.email.toLowerCase());
  const stays = g ? guestStays(g.id) : [];
  const upcoming = stays.filter(s => ['confirmada', 'check-in'].includes(s.status) && s.checkOut >= today());
  const past = stays.filter(s => !upcoming.includes(s));
  const nights = stays.filter(s => s.status === 'check-out').reduce((a, s) => a + s.nights, 0);
  const points = nights * 120 + (g?.vip ? 500 : 0);
  const sel = query.res && stays.find(s => s.id === query.res);
  el.innerHTML = `<section class="section page-top"><div class="container stack">
    <div class="row between"><div><span class="eyebrow">Mi cuenta</span><h1 style="margin:0">Hola, ${escape(u.name.split(' ')[0])}</h1></div><button class="btn btn-ghost" data-out>Cerrar sesión</button></div>
    <div class="grid-3">
      <div class="card stat"><span class="label">Club Lumen</span><span class="value">${points.toLocaleString('es-CL')} pts</span><span class="delta up">${g?.vip ? 'Nivel Oro' : 'Nivel Plata'} · ${nights} noches</span></div>
      <div class="card stat"><span class="label">Próximas estadías</span><span class="value">${upcoming.length}</span></div>
      <div class="card stat"><span class="label">Estadías anteriores</span><span class="value">${past.filter(s => s.status === 'check-out').length}</span></div>
    </div>
    ${sel ? `<a class="small" href="#/portal">← Volver a mis estadías</a><div data-panel></div>` : `
    <h2>Próximas estadías</h2>
    ${upcoming.length ? upcoming.map(s => stayCard(s)).join('') : '<div class="card empty">No tienes estadías próximas. <a href="#/reservar">Reserva ahora</a></div>'}
    <h2>Historial</h2>
    ${past.length ? past.map(s => stayCard(s)).join('') : '<p class="muted">Sin estadías anteriores.</p>'}
    <form class="card stack" id="prof"><h3 style="margin:0">Mis datos</h3><div class="grid-2">
      <div class="field"><label for="pf-n">Nombre</label><input class="input" id="pf-n" value="${escape(g?.name || u.name)}"></div>
      <div class="field"><label for="pf-p">Teléfono</label><input class="input" id="pf-p" value="${escape(g?.phone || '')}"></div>
      <div class="field"><label for="pf-c">País</label><input class="input" id="pf-c" value="${escape(g?.country || '')}"></div>
      <div class="field"><label for="pf-d">Documento</label><input class="input" id="pf-d" value="${escape(g?.doc || '')}"></div></div>
      <div class="field"><label for="pf-pref">Preferencias</label><textarea class="textarea" id="pf-pref">${escape(g?.notes || '')}</textarea></div>
      <button class="btn btn-primary">Guardar</button></form>`}
  </div></section>`;
  el.querySelector('[data-out]').onclick = () => { auth.logout(); location.hash = '#/'; location.reload(); };
  if (sel) { bookingPanel(el.querySelector('[data-panel]'), sel, { tab: query.tab || 'detalle', userId: u.id, link: k => `#/portal?res=${sel.id}&tab=${k}` }); return { live: false }; }
  el.querySelector('#prof').onsubmit = e => {
    e.preventDefault();
    const v = id => el.querySelector(id).value.trim();
    if (g) db.update('guests', g.id, { name: v('#pf-n'), phone: v('#pf-p'), country: v('#pf-c'), doc: v('#pf-d'), notes: v('#pf-pref') });
    db.update('users', u.id, { name: v('#pf-n') });
    toast('Datos guardados', 'success');
  };
  return { live: false };
}

function stayCard(s) {
  const t = typeById(s.roomTypeId);
  return `<a class="card hover stay" href="#/portal?res=${s.id}"><div class="stay-art">${roomArt(t.id, 0)}</div><div class="stack" style="gap:4px"><div class="row between"><b>${escape(t.name)}</b><span class="badge badge-${RES_STATES[s.status].badge}">${RES_STATES[s.status].label}</span></div><span class="small">${fmtRange(s.checkIn, s.checkOut)} · ${s.nights} noches</span><span class="small muted">${escape(s.code)} · ${money(s.total)}${s.precheck ? ' · check-in online ✓' : ''}</span></div></a>`;
}
