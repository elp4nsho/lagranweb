// App móvil del chofer concierge: corridas del día, ruta, acta de retiro (fotos, km, carga, daños, firma) y entrega.
import { escape, toast, confirm, time } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { CONC_STATES } from '../data/catalog.js';
import { vehicleById, customerById, vehicleName, kmFmt, setConcStatus, userById, drivers, statusBadge } from '../shared/domain.js';
import { ymd, fmtDay } from '../shared/util.js';
import { conciergeMap, tripProgress } from '../public/seguimiento.js';
import { carArt } from '../shared/car-art.js';
import { sigSvg } from '../admin/concierge.js';

let user;
try { user = auth.require(['admin', 'gerente', 'asesor', 'chofer']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
const ANGLES = ['Frente', 'Trasera', 'Lateral izq.', 'Lateral der.', 'Interior', 'Tablero / odómetro'];
let who = user?.role === 'chofer' ? user.id : '';
let form = null; // acta en curso { id, photos:[], km, charge, damages, sig, courtesy }

function top() {
  return `<header class="role-top"><span class="brand-mark" aria-hidden="true">AT</span><div class="grow"><b>Concierge</b><small class="muted d-block">${escape(user.name)} · ${fmtDay(ymd(), { weekday: true })}</small></div>
    ${user.role !== 'chofer' ? '<a class="btn btn-sm btn-ghost" href="admin.html#/concierge">Panel</a>' : ''}<span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span><button class="btn btn-sm btn-ghost" data-out>Salir</button></header>`;
}
const isPickup = c => ['programado', 'en-camino', 'retirado'].includes(c.status);
function runCard(c) {
  const v = vehicleById(c.vehicleId), cu = customerById(c.customerId), pick = isPickup(c);
  const { left } = tripProgress(c);
  return `<a class="card run-card tone-${pick ? 'info' : 'success'}" href="#/corrida/${c.id}" style="text-decoration:none;color:var(--text)">
    <div class="row between"><b>${pick ? '↪ Retiro' : '↩ Entrega'} · ${escape(pick ? c.window : c.deliveryWindow || c.window)}</b>${statusBadge(CONC_STATES, c.status)}</div>
    <div class="row" style="flex-wrap:nowrap"><span style="width:110px;flex:none">${carArt({ body: v?.body, color: v?.color })}</span><span><b>${escape(vehicleName(v))}</b><small class="muted d-block">${escape(v?.plate || '')} · ${escape(cu?.name || '')}</small><small class="d-block">📍 ${escape(c.address)}, ${escape(c.comuna)}</small></span></div>
    ${['en-camino', 'en-entrega'].includes(c.status) ? `<small class="muted">Llegada estimada en ${left} min</small>` : ''}${c.courtesyCarId ? `<small>🚗 Llevar auto de cortesía: ${escape(db.get('fleet', c.courtesyCarId)?.name || '')}</small>` : ''}</a>`;
}
function list() {
  const mine = c => !who || c.driverId === who;
  const today = ymd();
  const active = db.query('concierge', c => mine(c) && ((c.date <= today && ['programado', 'en-camino', 'retirado'].includes(c.status)) || ['listo', 'en-entrega'].includes(c.status)));
  const upcoming = db.query('concierge', c => mine(c) && c.date > today && c.status === 'programado').sort((a, b) => (a.date + a.window).localeCompare(b.date + b.window));
  const doneToday = db.query('concierge', c => mine(c) && ((c.pickup?.at || '').slice(0, 10) === today || (c.delivery?.at || '').slice(0, 10) === today)).length;
  app.innerHTML = `${top()}<main class="role-wrap mobile">
    ${user.role !== 'chofer' ? `<div class="field"><label for="who">Ver corridas de</label><select class="select" id="who"><option value="">Todos los choferes</option>${drivers().map(d => `<option value="${d.id}" ${who === d.id ? 'selected' : ''}>${escape(d.name)}</option>`).join('')}</select></div>` : ''}
    <div class="grid-3"><div class="card stat"><span class="label">Pendientes</span><span class="value">${active.length}</span></div><div class="card stat"><span class="label">Hechas hoy</span><span class="value">${doneToday}</span></div><div class="card stat"><span class="label">Próximas</span><span class="value">${upcoming.length}</span></div></div>
    <h2 style="margin:0">Hoy</h2>${active.sort((a, b) => (a.window || '').localeCompare(b.window || '')).map(runCard).join('') || '<div class="card empty">Sin corridas pendientes. ☕</div>'}
    ${upcoming.length ? `<h2 style="margin:0">Próximos días</h2>${upcoming.map(c => `<a class="card row between" href="#/corrida/${c.id}" style="text-decoration:none;color:var(--text)"><span><b>${fmtDay(c.date, { weekday: true })} · ${escape(c.window)}</b><small class="muted d-block">${escape(vehicleName(vehicleById(c.vehicleId)))} · ${escape(c.comuna)}</small></span>${statusBadge(CONC_STATES, c.status)}</a>`).join('')}` : ''}</main>`;
}

function run(id) {
  const c = db.get('concierge', id);
  if (!c) { app.innerHTML = `${top()}<main class="role-wrap mobile"><div class="card empty">Corrida no encontrada.</div></main>`; return; }
  const v = vehicleById(c.vehicleId), cu = customerById(c.customerId), ev = v?.fuel === 'electrico', fl = c.courtesyCarId && db.get('fleet', c.courtesyCarId);
  const pickingUp = c.status === 'en-camino', delivering = c.status === 'en-entrega';
  if ((pickingUp || delivering) && (!form || form.id !== id)) form = { id, photos: [], km: pickingUp ? '' : (c.pickup?.km || v?.km || ''), charge: 60, damages: '', sig: '', courtesy: false };
  app.innerHTML = `${top()}<main class="role-wrap mobile">
    <a href="#/" class="small">← Corridas</a>
    <div class="row between"><div><span class="eyebrow mono">${escape(c.code)}</span><h1 style="margin:0;font-size:26px">${isPickup(c) ? 'Retiro' : 'Entrega'} · ${escape(vehicleName(v))}</h1></div>${statusBadge(CONC_STATES, c.status)}</div>
    <div class="card" style="padding:8px">${conciergeMap(c)}</div>
    <div class="card stack"><div class="row between"><span><b>${escape(cu?.name || '')}</b><small class="muted d-block">📍 ${escape(c.address)}, ${escape(c.comuna)} (${escape(c.kind)})</small><small class="muted d-block">🕘 ${fmtDay(c.date, { weekday: true })} · ${escape(isPickup(c) ? c.window : c.deliveryWindow || c.window)}</small></span><a class="btn btn-sm" href="tel:${escape(cu?.phone || '')}">📞 Llamar</a></div>
      <div class="row"><span style="width:120px">${carArt({ body: v?.body, color: v?.color, ev })}</span><span class="small"><b class="mono">${escape(v?.plate || '')}</b><br>${escape(v?.colorName || '')}${fl ? `<br>🚗 Cortesía: ${escape(fl.name)} (${escape(fl.plate)})` : ''}</span></div></div>
    ${c.status === 'programado' ? '<button class="btn btn-primary btn-lg btn-block" data-st="en-camino">🚘 Iniciar ruta al cliente</button>' : ''}
    ${c.status === 'retirado' ? `<div class="callout ok small">Retirado a las ${time(c.pickup.at)} · ${kmFmt(c.pickup.km)} · ${c.pickup.charge}%</div><button class="btn btn-primary btn-lg btn-block" data-st="en-taller">🛠️ Entregar en el atelier</button>` : ''}
    ${c.status === 'listo' ? '<button class="btn btn-primary btn-lg btn-block" data-st="en-entrega">🚘 Iniciar entrega al cliente</button>' : ''}
    ${pickingUp || delivering ? actForm(c, ev, fl) : ''}
    ${['en-taller', 'entregado', 'cancelado'].includes(c.status) ? `<div class="card stack"><b>${escape(CONC_STATES[c.status].label)}</b>${c.pickup ? `<small class="muted">Acta de retiro: ${kmFmt(c.pickup.km)} · ${c.pickup.charge}% · ${c.pickup.photos} fotos${c.pickup.damages ? ' · ' + escape(c.pickup.damages) : ''}</small>${sigSvg(c.pickup.sig)}` : ''}</div>` : ''}
  </main>`;
  wirePad();
}
function actForm(c, ev, fl) {
  const pick = c.status === 'en-camino';
  return `<form class="card stack" id="act" novalidate><h3 style="margin:0">${pick ? 'Acta de retiro' : 'Acta de entrega'}</h3>
    ${pick ? `<span class="label">Fotos del estado del vehículo (${form.photos.length}/6)</span><div class="photo-grid">${ANGLES.map((a, i) => `<button type="button" class="photo-slot ${form.photos.includes(i) ? 'done' : ''}" data-photo="${i}">${form.photos.includes(i) ? '✓ ' : '📷 '}${a}</button>`).join('')}</div>` : ''}
    <div class="grid-2"><div class="field"><label for="a-km">Kilometraje (km)</label><input class="input" id="a-km" name="km" type="number" min="0" value="${escape(form.km)}"></div>
      <div class="field"><label for="a-ch">${ev ? 'Nivel de carga' : 'Nivel de combustible'}: <b data-chv>${form.charge}%</b></label><input class="range" id="a-ch" name="charge" type="range" min="0" max="100" step="5" value="${form.charge}"></div></div>
    ${pick ? `<div class="field"><label for="a-dm">Daños u observaciones (opcional)</label><textarea class="textarea" id="a-dm" name="damages" style="min-height:70px" placeholder="Rayones, piquetes, objetos de valor…">${escape(form.damages)}</textarea></div>` : ''}
    ${fl ? `<label class="check"><input type="checkbox" name="courtesy" ${form.courtesy ? 'checked' : ''}> ${pick ? 'Entregué' : 'Recibí de vuelta'} el auto de cortesía ${escape(fl.name)}</label>` : ''}
    <div class="field"><span class="label">Firma del cliente</span><canvas class="sig-pad" width="600" height="200" aria-label="Área de firma"></canvas><div class="row between"><small class="muted">Firma con el dedo</small><button type="button" class="btn btn-sm btn-ghost" data-clear>Borrar</button></div></div>
    <button class="btn btn-primary btn-lg btn-block">${pick ? '🔑 Confirmar retiro' : '🏁 Confirmar entrega'}</button></form>`;
}
function wirePad() {
  const cv = app.querySelector('.sig-pad'); if (!cv) return;
  const ctx = cv.getContext('2d'), strokes = form.strokes || (form.strokes = []);
  const color = getComputedStyle(document.body).color;
  const draw = () => { ctx.clearRect(0, 0, 600, 200); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = ctx.lineJoin = 'round'; strokes.forEach(s => { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x * 2, y * 2) : ctx.moveTo(x * 2, y * 2))); ctx.stroke(); }); };
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 300), Math.round((e.clientY - r.top) / r.height * 100)]; };
  let on = false;
  cv.addEventListener('pointerdown', e => { on = true; cv.setPointerCapture(e.pointerId); strokes.push([pt(e)]); draw(); });
  cv.addEventListener('pointermove', e => { if (!on) return; strokes.at(-1).push(pt(e)); draw(); });
  cv.addEventListener('pointerup', () => { on = false; form.sig = strokes.filter(s => s.length > 1).map(s => 'M' + s.map(p => p.join(' ')).join(' L')).join(' '); });
  draw();
}
const router = user && createRouter({ '/': () => list(), '/corrida/:id': ({ id }) => run(id) }, { notFound: () => router.go('/') });
app.addEventListener('change', e => { if (e.target.id === 'who') { who = e.target.value; list(); } if (e.target.name === 'courtesy') form.courtesy = e.target.checked; });
app.addEventListener('input', e => { const t = e.target; if (!form || !t.name) return; if (t.name === 'km') form.km = t.value; if (t.name === 'damages') form.damages = t.value; if (t.name === 'charge') { form.charge = +t.value; app.querySelector('[data-chv]').textContent = t.value + '%'; } });
app.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const id = router.current?.params?.id;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (b.dataset.photo) { const i = +b.dataset.photo; form.photos = form.photos.includes(i) ? form.photos.filter(x => x !== i) : [...form.photos, i]; toast(form.photos.includes(i) ? `Foto ${ANGLES[i]} capturada (simulada)` : 'Foto eliminada', 'success', 1200); keep(() => run(id)); return; }
  if (b.hasAttribute('data-clear')) { form.strokes = []; form.sig = ''; wirePad(); return; }
  if (b.dataset.st) {
    const c = db.get('concierge', id);
    if (b.dataset.st === 'en-taller' && !(await confirm('¿Confirmas que el vehículo quedó en recepción del atelier?', { ok: 'Confirmar' }))) return;
    setConcStatus(id, b.dataset.st, user.id, b.dataset.st === 'en-entrega' && !c.driverId ? { driverId: user.id } : {});
    toast(CONC_STATES[b.dataset.st].label, 'success');
  }
});
app.addEventListener('submit', e => {
  e.preventDefault();
  const id = router.current.params.id, c = db.get('concierge', id), pick = c.status === 'en-camino';
  if (pick && form.photos.length < 6) return toast(`Faltan ${6 - form.photos.length} fotos del vehículo`, 'warning');
  if (!(+form.km > 0)) return toast('Ingresa el kilometraje', 'warning');
  if (!form.sig) return toast('Falta la firma del cliente', 'warning');
  const fl = c.courtesyCarId && db.get('fleet', c.courtesyCarId);
  if (pick) {
    setConcStatus(id, 'retirado', user.id, { pickup: { at: new Date().toISOString(), km: +form.km, charge: form.charge, photos: 6, damages: form.damages, sig: form.sig, driverId: user.id } });
    db.update('vehicles', c.vehicleId, { km: +form.km });
    if (fl && form.courtesy) db.update('fleet', fl.id, { status: 'en-uso' });
    toast('Retiro registrado. ¡Buen viaje al atelier!', 'success');
  } else {
    setConcStatus(id, 'entregado', user.id, { delivery: { at: new Date().toISOString(), km: +form.km, charge: form.charge, sig: form.sig, driverId: user.id } });
    if (fl && form.courtesy) db.update('fleet', fl.id, { status: 'disponible', charge: form.charge });
    toast('Entrega confirmada 🏁', 'success');
  }
  form = null;
});
function keep(fn) { const y = scrollY; fn(); scrollTo(0, y); }
if (user) {
  db.subscribe(() => { if (document.querySelector('.modal-backdrop')) return; const ae = document.activeElement; if (ae && app.contains(ae) && ae.matches('input:not([type=checkbox]):not([type=range]), textarea')) return; keep(() => router.refresh()); });
  setInterval(() => { if (router.current?.pattern === '/' && !document.querySelector('.modal-backdrop')) list(); }, 30000);
  router.start();
}
export { userById };
