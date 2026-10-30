// Recepción y caja: llegadas del día, fila, bahías en curso, listos para cobrar y boletas.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { branches, branchById, branchLive, waitLabel, waitTone, queueOf, today, iso, timeHM, userName, cancelJob, respondUpsell } from '../shared/domain.js';
import { plate, boletaModal, payName } from '../shared/bits.js';
import { assignBay, checkoutModal, jobDetail } from '../shared/job-ui.js';
import { intakeModal } from './intake.js';

let user;
try { user = auth.require(['admin', 'jefe', 'recepcion']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let branchId = user?.branchId || branches()[0]?.id;
let view = 'ops';

function render() {
  if (!user) return;
  const T = today(), l = branchLive(branchId);
  const arrivals = db.query('jobs', j => j.branchId === branchId && j.status === 'reservado' && iso(j.bookedFor) === T).sort((a, b) => a.bookedFor.localeCompare(b.bookedFor));
  const queue = queueOf(branchId);
  const inBay = db.query('jobs', j => j.branchId === branchId && j.status === 'en-bahia');
  const ready = db.query('jobs', j => j.branchId === branchId && j.status === 'listo');
  const paid = db.query('jobs', j => j.branchId === branchId && j.status === 'pagado' && iso(j.paidAt) === T).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const cash = {}; paid.forEach(j => { cash[j.pay.m] = (cash[j.pay.m] || 0) + j.total; });
  const late = j => Date.parse(j.bookedFor) < Date.now() - 15 * 6e4;
  app.innerHTML = `<header class="ops-top"><span class="brand-mark" aria-hidden="true">🧾</span><div class="grow"><b>Recepción · ${escape(branchById(branchId)?.name || '')}</b><small class="muted d-block">${escape(user.name)} · ${escape(auth.roleName(user.role))}</small></div>
      ${user.role === 'recepcion' ? '' : `<select class="select sm" data-branch aria-label="Sucursal">${branches().map(x => `<option value="${x.id}" ${x.id === branchId ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select>`}
      <span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span><a class="btn btn-sm btn-ghost" href="admin.html#/atenciones">Panel</a><button class="btn btn-sm btn-ghost" data-out>Salir</button></header>
    <div class="container ops-main stack">
      <div class="row between"><div class="row small" style="gap:14px"><span class="badge badge-${waitTone(l.wait)}">Espera ${escape(waitLabel(l.wait))}</span><span>🔧 ${l.inBay}/${l.bays} bahías</span><span>💵 Caja hoy <b>${money(paid.reduce((s, j) => s + j.total, 0))}</b> (${paid.length})</span></div>
        <div class="row"><div class="tabs"><button class="tab ${view === 'ops' ? 'active' : ''}" data-view="ops">Operación</button><button class="tab ${view === 'caja' ? 'active' : ''}" data-view="caja">Caja del día</button></div><button class="btn btn-primary" data-intake>+ Ingreso sin cita</button></div></div>
      ${view === 'ops' ? `<div class="ops-cols">
        <section class="stack"><div class="col-head"><h2>Llegadas y fila</h2><span class="badge">${arrivals.length + queue.length}</span></div>
          ${arrivals.map(j => `<div class="card stack" style="gap:6px"><div class="row between nowrap"><span>${plate(j.plate)} <b>${timeHM(j.bookedFor)}</b></span>${late(j) ? '<span class="badge badge-danger">Atrasado</span>' : '<span class="badge badge-info">Reserva</span>'}</div><small class="muted">${escape(j.car)} · ${escape(j.items.map(i => i.n).join(', '))}</small><div class="row"><button class="btn btn-sm btn-primary" data-recv="${j.id}">Recibir</button><button class="btn btn-sm" data-det="${j.id}">Ver</button>${late(j) ? `<button class="btn btn-sm btn-ghost" data-noshow="${j.id}">No llegó</button>` : ''}</div></div>`).join('')}
          <div class="queue-list">${queue.map((j, i) => `<div class="card q-item"><span class="q-pos">${i + 1}</span><span class="grow">${plate(j.plate)} <small class="muted d-block">${escape(j.car)} · llegó ${timeHM(j.arrivedAt)} · ${j.photos ? '📷 ' + j.photos : '<span class="text-warning">sin fotos</span>'}</small></span><span class="stack" style="gap:4px"><button class="btn btn-sm btn-primary" data-bay="${j.id}">Bahía</button><button class="btn btn-sm" data-det="${j.id}">Ver</button></span></div>`).join('') || '<p class="muted small">Fila vacía.</p>'}</div></section>
        <section class="stack"><div class="col-head"><h2>En bahía</h2><span class="badge">${inBay.length}</span></div>
          ${inBay.map(j => { const d = j.tasks.filter(t => t.d).length; return `<div class="card stack" style="gap:6px"><div class="row between nowrap"><span>${plate(j.plate)} <small>${escape(db.get('bays', j.bayId)?.name || '')}</small></span><small class="muted">${escape(userName(j.techId))}</small></div><div class="progress"><i style="--v:${j.tasks.length ? d / j.tasks.length * 100 : 0}%"></i></div><small class="muted">${d}/${j.tasks.length} tareas · desde ${timeHM(j.startedAt)}</small>${j.upsells.filter(u => u.st === 'pendiente').map(u => `<div class="upsell card" style="padding:8px"><small><b>🔔 ${escape(u.label)}</b> · ${money(u.p)}</small><div class="row"><button class="btn btn-sm btn-primary" data-up="${j.id}|${u.id}|1">Aprobó (teléfono)</button><button class="btn btn-sm" data-up="${j.id}|${u.id}|0">Rechazó</button></div></div>`).join('')}</div>`; }).join('') || '<p class="muted small">Sin autos en bahía.</p>'}</section>
        <section class="stack"><div class="col-head"><h2>Listos · caja</h2><span class="badge badge-success">${ready.length}</span></div>
          ${ready.map(j => `<div class="card stack" style="gap:6px"><div class="row between nowrap"><span>${plate(j.plate)} <b>${money(j.total)}</b></span><small class="muted">listo ${timeHM(j.doneAt)}</small></div><small class="muted">${escape(j.items.map(i => i.n).join(', '))}</small><button class="btn btn-primary" data-pay="${j.id}">💳 Cobrar y entregar</button></div>`).join('') || '<p class="muted small">Nada por cobrar.</p>'}
          <b class="small">Entregados hoy</b>${paid.slice(0, 8).map(j => `<div class="row between small"><span>${plate(j.plate)} N° ${j.pay.folio}</span><span class="row nowrap" style="gap:6px"><b>${money(j.total)}</b><button class="btn btn-sm btn-ghost" data-bol="${j.id}">🧾</button></span></div>`).join('') || '<p class="muted small">Aún no hay entregas.</p>'}</section>
      </div>` : `<div class="grid-2"><div class="card stack"><h2 style="margin:0">Arqueo por medio de pago</h2>${Object.entries(cash).map(([k, v]) => `<div class="row between"><span>${escape(payName(k))}</span><b>${money(v)}</b></div>`).join('') || '<p class="muted">Sin ventas hoy.</p>'}<div class="total-row"><span>Total</span><b>${money(paid.reduce((s, j) => s + j.total, 0))}</b></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Hora</th><th>Boleta</th><th>Patente</th><th>Medio</th><th>Total</th><th></th></tr></thead><tbody>${paid.map(j => `<tr><td>${timeHM(j.paidAt)}</td><td>${j.pay.folio}</td><td>${plate(j.plate)}</td><td>${escape(payName(j.pay.m))}</td><td>${money(j.total)}</td><td><button class="btn btn-sm" data-bol="${j.id}">Ver</button></td></tr>`).join('')}</tbody></table></div></div>`}
    </div>`;
}

app.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (d.view) { view = d.view; render(); return; }
  if (b.hasAttribute('data-intake')) intakeModal(user, branchId);
  if (d.recv) intakeModal(user, branchId, db.get('jobs', d.recv));
  if (d.noshow) { cancelJob(d.noshow, 'no-show', user.id); toast('Marcado como "no llegó"', 'info'); }
  if (d.bay) assignBay(d.bay, user);
  if (d.det) jobDetail(d.det, user, { canEdit: true });
  if (d.pay) checkoutModal(d.pay, user);
  if (d.bol) boletaModal(db.get('jobs', d.bol));
  if (d.up) { const [j, u, ok] = d.up.split('|'); respondUpsell(j, u, ok === '1', 'cliente (teléfono)'); toast(ok === '1' ? 'Aprobada: el técnico la ve en su bahía' : 'Rechazada', 'success'); }
});
app.addEventListener('change', e => { if (e.target.matches('[data-branch]')) { branchId = e.target.value; render(); } });
render();
db.subscribe(() => { if (!document.querySelector('.modal-backdrop')) render(); });
new MutationObserver(() => { if (!document.querySelector('.modal-backdrop')) render(); }).observe(document.body, { childList: true });
setInterval(() => { if (!document.querySelector('.modal-backdrop')) render(); }, 30000);
