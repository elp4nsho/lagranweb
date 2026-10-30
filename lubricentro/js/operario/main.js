// Tablero de bahías (técnicos / jefe): autos en cada bahía, checklist, cronómetro, recomendaciones y fila.
import { escape, money, toast, modal, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { UPSELLS } from '../data/catalog.js';
import { branches, branchById, baysOf, queueOf, branchLive, waitLabel, waitTone, startJob, toggleTask, finishJob, addUpsell, respondUpsell, priceFor, serviceById, userName, timeHM, fmtKm } from '../shared/domain.js';
import { plate, carArt } from '../shared/bits.js';

let user;
try { user = auth.require(['admin', 'jefe', 'tecnico']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let branchId = user?.branchId || branches()[0]?.id;
let mine = user?.role === 'tecnico';
const mmss = m => `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m * 60) % 60)).padStart(2, '0')}`;
const live = j => (Date.now() - new Date(j.startedAt)) / 6e4;

function bayCard(y, j) {
  if (y.active === false) return `<article class="card bay off"><div class="bay-head"><h3>${escape(y.name)}</h3><span class="badge">Fuera de servicio</span></div><small class="muted">${escape(y.type)}</small></article>`;
  if (!j) {
    const q = queueOf(branchId)[0];
    return `<article class="card bay free"><div class="bay-head"><h3>${escape(y.name)}</h3><span class="badge badge-success">Libre</span></div><small class="muted">${escape(y.type)}</small>
      ${q ? `<button class="btn btn-primary btn-lg" data-take="${y.id}">▶ Tomar siguiente: ${escape(q.plate)}</button><small class="muted">${escape(q.car)} · ${escape(q.items.map(i => i.n).join(', '))}</small>` : '<div class="empty" style="padding:16px">Sin autos en fila</div>'}</article>`;
  }
  const done = j.tasks.filter(t => t.d).length, m = live(j), late = m > j.est;
  return `<article class="card bay ${late ? 'late' : 'busy'}" data-job="${j.id}">
    <div class="bay-head"><h3>${escape(y.name)}</h3><span class="timer ${late ? 'late' : ''}" data-timer="${j.id}">${mmss(m)}</span></div>
    <div class="row between nowrap" style="gap:8px"><span>${plate(j.plate)} <b>${escape(j.car)}</b></span><small class="muted">est. ${j.est}′</small></div>
    <small class="muted">${escape(j.code)} · ${fmtKm(j.km)} · 👷 ${escape(userName(j.techId))}${j.notes ? ` · 📝 ${escape(j.notes)}` : ''}</small>
    <div class="row between small"><span>${done}/${j.tasks.length} tareas</span><b>${j.tasks.length ? Math.round(done / j.tasks.length * 100) : 0}%</b></div>
    <div class="progress"><i style="--v:${j.tasks.length ? done / j.tasks.length * 100 : 0}%"></i></div>
    <div class="stack" style="gap:6px">${j.tasks.map((t, i) => `<button class="task-btn ${t.d ? 'done' : ''}" data-task="${j.id}|${i}"><span class="tick">${t.d ? '✓' : ''}</span><span>${escape(t.t)}</span></button>`).join('')}</div>
    ${j.upsells.length ? `<div class="stack" style="gap:6px">${j.upsells.map(u => `<div class="upsell card st-${u.st}" style="padding:8px 12px"><div class="row between nowrap small"><span>${escape(u.icon || '💡')} ${escape(u.label)}</span><b>${money(u.p)}</b></div>${u.st === 'pendiente' ? `<div class="row between small"><span class="text-warning">⏳ Esperando al cliente (celular)</span><button class="btn btn-sm" data-inperson="${j.id}|${u.id}">Aprobó en persona</button></div>` : `<span class="badge ${u.st === 'aprobado' ? 'badge-success' : ''}">${u.st === 'aprobado' ? '✓ Aprobada: agregar al trabajo' : u.st === 'rechazado' ? 'Rechazada' : 'Sin respuesta'}</span>`}</div>`).join('')}</div>` : ''}
    <div class="grid-2"><button class="btn" data-upsell="${j.id}">💡 Recomendar</button><button class="btn btn-primary" data-finish="${j.id}">✓ Terminar</button></div>
  </article>`;
}

function render() {
  if (!user) return;
  const b = branchById(branchId), l = branchLive(branchId);
  const bays = baysOf(branchId, true);
  const inBay = db.query('jobs', j => j.branchId === branchId && j.status === 'en-bahia');
  const shown = mine ? bays.filter(y => inBay.some(j => j.bayId === y.id && j.techId === user.id) || (y.active !== false && !inBay.some(j => j.bayId === y.id))) : bays;
  const queue = queueOf(branchId);
  app.innerHTML = `<header class="ops-top"><span class="brand-mark" aria-hidden="true">🔧</span><div class="grow"><b>Bahías · ${escape(b?.name || '')}</b><small class="muted d-block">${escape(user.name)} · ${escape(auth.roleName(user.role))}</small></div>
      ${user.role === 'tecnico' ? '' : `<select class="select sm" data-branch aria-label="Sucursal">${branches().map(x => `<option value="${x.id}" ${x.id === branchId ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select>`}
      <span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span>${user.role !== 'tecnico' ? '<a class="btn btn-sm btn-ghost" href="admin.html">Panel</a>' : ''}<button class="btn btn-sm btn-ghost" data-out>Salir</button></header>
    <div class="container ops-main stack">
      <div class="row between"><div class="row small" style="gap:14px"><span class="badge badge-${waitTone(l.wait)}">Espera ${escape(waitLabel(l.wait))}</span><span>🔧 ${l.inBay}/${l.bays} ocupadas</span><span>🚗 ${l.queue} en fila</span></div>
        <div class="tabs"><button class="tab ${mine ? 'active' : ''}" data-mine="1">Mis bahías</button><button class="tab ${!mine ? 'active' : ''}" data-mine="0">Todas</button></div></div>
      <div class="bay-board">${shown.map(y => bayCard(y, inBay.find(j => j.bayId === y.id))).join('') || '<div class="card empty">No tienes autos asignados. Toma uno de la fila desde una bahía libre.</div>'}</div>
      <div class="card stack"><div class="col-head"><h2>Fila de espera</h2><small class="muted">${queue.length} autos</small></div>
        <div class="queue-list">${queue.map((j, i) => `<div class="q-item"><span class="q-pos">${i + 1}</span><span class="grow">${plate(j.plate)} <b>${escape(j.car)}</b><small class="muted d-block">${escape(j.items.map(x => x.n).join(', '))} · llegó ${timeHM(j.arrivedAt)}${j.bookedFor ? ' · <b>reserva</b>' : ''}</small></span><small class="badge plain">${j.est}′</small></div>`).join('') || '<p class="muted small">Nadie en fila.</p>'}</div></div>
    </div>`;
}

app.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (b.dataset.mine) { mine = b.dataset.mine === '1'; render(); return; }
  if (b.dataset.take) {
    const q = queueOf(branchId)[0]; if (!q) return;
    const tech = user.role === 'tecnico' ? user.id : (db.find('users', u => u.role === 'tecnico' && u.branchId === branchId && u.active !== false)?.id || user.id);
    startJob(q.id, b.dataset.take, tech, user.id); toast(`${q.plate} entra a ${db.get('bays', b.dataset.take).name}`, 'success'); return;
  }
  if (b.dataset.task) { const [id, i] = b.dataset.task.split('|'); toggleTask(id, +i); return; }
  if (b.dataset.inperson) { const [id, u] = b.dataset.inperson.split('|'); respondUpsell(id, u, true, 'cliente en sucursal'); toast('Recomendación aprobada: tareas agregadas', 'success'); return; }
  if (b.dataset.finish) {
    const j = db.get('jobs', b.dataset.finish);
    const left = j.tasks.filter(t => !t.d).length;
    if (left && !await confirm(`Quedan ${left} tareas sin marcar. ¿Terminar igual?`, { ok: 'Terminar' })) return;
    if (j.upsells.some(u => u.st === 'pendiente') && !await confirm('Hay recomendaciones sin respuesta del cliente. Se marcarán como "sin respuesta".', { ok: 'Continuar' })) return;
    finishJob(j.id, user.id); toast(`${j.plate} listo para retiro · recepción notificada`, 'success'); return;
  }
  if (b.dataset.upsell) {
    const j = db.get('jobs', b.dataset.upsell), veh = db.get('vehicles', j.vehicleId) || { segment: j.segment, oil: '5w30', liters: 4 };
    const opts = UPSELLS.map(u => ({ ...u, p: u.serviceId ? priceFor(u.serviceId, veh) : u.price }));
    const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
    f.innerHTML = `<div class="opt-list">${opts.map((u, i) => `<label class="opt"><input type="radio" name="up" value="${i}" ${i ? '' : 'checked'}><span class="opt-ico">${u.icon}</span><span class="grow"><b>${escape(u.label)}</b><small>${u.serviceId ? escape(serviceById(u.serviceId)?.name) : 'Producto'}</small></span><b>${money(u.p)}</b></label>`).join('')}
      <label class="opt"><input type="radio" name="up" value="custom"><span class="opt-ico">✍️</span><span class="grow"><b>Otra recomendación</b></span></label></div>
      <div class="grid-2"><div class="field"><label for="up-l">Descripción (otra)</label><input class="input" id="up-l" name="label" placeholder="Ej.: Correa de accesorios agrietada"></div><div class="field"><label for="up-p">Precio (otra)</label><input class="input" id="up-p" name="price" type="number" min="0" step="10"></div></div>
      <div class="field"><label for="up-n">Nota para el cliente</label><input class="input" id="up-n" name="note" placeholder="Ej.: quedan 3 mm de pastilla"></div>
      <p class="small muted" style="margin:0">El cliente la recibe en su celular (página de estado) y puede aprobarla o rechazarla.</p>`;
    const m = modal({ title: `Recomendar · ${j.plate}`, body: f, size: 'lg', foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-send>Enviar al cliente</button>' });
    m.el.querySelector('[data-send]').onclick = () => {
      const v = f.elements.up.value, note = f.elements.note.value.trim();
      if (v === 'custom') { const l = f.elements.label.value.trim(), p = +f.elements.price.value; if (l.length < 4 || !p) { toast('Describe la recomendación y su precio', 'warning'); return; } addUpsell(j.id, { label: l, p, note }, user.id); }
      else { const u = opts[+v]; addUpsell(j.id, { label: u.label, s: u.serviceId || '', p: u.p, icon: u.icon, note }, user.id); }
      toast('Recomendación enviada al celular del cliente', 'success'); m.close();
    };
  }
});
app.addEventListener('change', e => { if (e.target.matches('[data-branch]')) { branchId = e.target.value; render(); } });
render();
db.subscribe(() => { if (!document.querySelector('.modal-backdrop')) render(); });
setInterval(() => app.querySelectorAll('[data-timer]').forEach(t => { const j = db.get('jobs', t.dataset.timer); if (!j) return; const m = live(j); t.textContent = mmss(m); t.classList.toggle('late', m > j.est); }), 1000);
