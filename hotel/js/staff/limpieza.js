// App móvil para camareras: mis habitaciones, marcar limpia, reportar problemas.
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { HK_STATES, typeById } from '../shared/hotel.js';
import { roomOcc, setHk } from '../admin/housekeeping.js';

let user;
try { user = auth.require(['admin', 'housekeeping', 'recepcion']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let mine = null;

function render() {
  if (!user) return;
  if (mine === null) mine = user.role === 'housekeeping';
  const rooms = db.all('rooms').filter(r => !mine || r.assignedTo === user.id).sort((a, b) => (a.hk === 'sucia' ? 0 : 1) - (b.hk === 'sucia' ? 0 : 1) || a.number.localeCompare(b.number));
  const pending = rooms.filter(r => r.hk === 'sucia').length;
  app.innerHTML = `<header class="hk-top"><span class="brand-mark" aria-hidden="true">🧹</span><div class="grow"><b>Limpieza</b><small class="muted d-block">${escape(user.name)} · ${pending} pendientes</small></div>
      <span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span>${user.role !== 'housekeeping' ? '<a class="btn btn-sm btn-ghost" href="admin.html#/housekeeping">Panel</a>' : ''}<button class="btn btn-sm btn-ghost" data-out>Salir</button></header>
    <div class="container hk-mobile stack">
      <div class="tabs"><button class="tab ${mine ? 'active' : ''}" data-mine="1">Mis habitaciones</button><button class="tab ${!mine ? 'active' : ''}" data-mine="0">Todas</button></div>
      <div class="progress"><i style="--v:${rooms.length ? Math.round((rooms.length - pending) / rooms.length * 100) : 100}%"></i></div>
      ${rooms.map(r => { const [occ, b] = roomOcc(r); return `<article class="card hk-m hk-${r.hk}">
        <div class="row between"><b class="hk-num">${r.number}</b><span class="badge badge-${HK_STATES[r.hk].badge}">${HK_STATES[r.hk].icon} ${HK_STATES[r.hk].label}</span></div>
        <div class="row between small"><span>${escape(typeById(r.typeId)?.name || '')} · piso ${r.floor}</span><span class="badge badge-${b} plain">${occ}</span></div>
        ${r.note ? `<small class="hk-note">📝 ${escape(r.note)}</small>` : ''}
        <div class="grid-2">${r.hk === 'sucia' ? `<button class="btn btn-primary btn-lg" data-hk="${r.id}|limpia">✓ Marcar limpia</button>` : r.hk === 'limpia' && user.role !== 'housekeeping' ? `<button class="btn btn-primary btn-lg" data-hk="${r.id}|inspeccionada">✓ Inspeccionar</button>` : r.hk === 'fuera' ? `<button class="btn btn-lg" data-hk="${r.id}|sucia">Reparada</button>` : `<button class="btn btn-lg" data-hk="${r.id}|sucia">Marcar sucia</button>`}
          <button class="btn btn-lg btn-ghost" data-issue="${r.id}">⚠ Reportar</button></div></article>`; }).join('') || '<div class="card empty">No tienes habitaciones asignadas.</div>'}
    </div>`;
}
app.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (b.dataset.mine) { mine = b.dataset.mine === '1'; render(); return; }
  if (b.dataset.hk) { const [id, s] = b.dataset.hk.split('|'); setHk(id, s, user.id, s === 'sucia' && db.get('rooms', id).hk === 'fuera' ? '' : undefined); toast(`Hab. ${db.get('rooms', id).number}: ${HK_STATES[s].label}`, 'success'); }
  if (b.dataset.issue) {
    const v = await formModal({ title: 'Reportar problema', fields: [{ name: 'note', label: 'Describe el problema', type: 'textarea', required: true }, { name: 'oos', label: 'Dejar fuera de servicio', type: 'checkbox' }] });
    if (!v) return;
    if (v.oos) setHk(b.dataset.issue, 'fuera', user.id, v.note); else db.update('rooms', b.dataset.issue, { note: v.note });
    db.log('housekeeping', `Problema reportado en hab. ${db.get('rooms', b.dataset.issue).number}: ${v.note}`, user.id);
    toast('Reporte enviado a recepción', 'success');
  }
});
db.subscribe(() => { if (!document.querySelector('.modal-backdrop')) render(); });
render();
