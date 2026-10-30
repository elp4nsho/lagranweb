// Modales de la atención reutilizados por el panel y la recepción: ficha, alta/edición, asignar bahía y caja.
import { escape, money, modal, toast, confirm, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { PAY_METHODS } from '../data/catalog.js';
import { JOB_STATES, SOURCES, branches, branchName, baysOf, services, serviceById, priceFor, lookupPlate, validPlate, createJob, upsertCustomer, checkInJob, startJob, finishJob, cancelJob, payJob, applyCoupon, togglePlanItem, plansForVehicle, recalc, respondUpsell, userName, customerById, fmtKm, timeHM, dayLabel, slotsFor, today, iso, addDays } from './domain.js';
import { plate, stBadge, boletaModal, photoSlots, payName } from './bits.js';

const techsOf = bid => db.query('users', u => u.role === 'tecnico' && u.active !== false && u.branchId === bid);

export function assignBay(id, user, onDone) {
  const j = db.get('jobs', id);
  const busy = db.query('jobs', x => x.status === 'en-bahia' && x.branchId === j.branchId).map(x => x.bayId);
  const free = baysOf(j.branchId).filter(y => !busy.includes(y.id));
  if (!free.length) { toast('No hay bahías libres en esta sucursal', 'warning'); return; }
  const techs = techsOf(j.branchId);
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<p class="small">${plate(j.plate)} ${escape(j.car)} · ${escape(j.items.map(i => i.n).join(', '))}</p>
    <div class="field"><label for="as-b">Bahía</label><select class="select" id="as-b" name="bay">${free.map(y => `<option value="${y.id}">${escape(y.name)} · ${escape(y.type)}</option>`).join('')}</select></div>
    <div class="field"><label for="as-t">Técnico</label><select class="select" id="as-t" name="tech">${techs.map(t => `<option value="${t.id}">${escape(t.name)}</option>`).join('')}</select></div>`;
  const m = modal({ title: `Asignar bahía · ${j.code}`, body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar a bahía</button>' });
  m.el.querySelector('[data-ok]').onclick = () => { startJob(id, f.elements.bay.value, f.elements.tech.value, user?.id); toast(`${j.plate} → ${db.get('bays', f.elements.bay.value).name}`, 'success'); m.close(); onDone && onDone(); };
}

export function checkoutModal(id, user, onDone) {
  const body = document.createElement('div'); body.className = 'stack';
  const m = modal({ title: 'Caja', size: 'lg', body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-pay>Cobrar y emitir boleta</button>' });
  const paint = () => {
    const j = db.get('jobs', id), cu = customerById(j.customerId), pps = plansForVehicle(j.vehicleId);
    m.el.querySelector('.modal-head h3').textContent = `Caja · ${j.code}`;
    body.innerHTML = `<div class="row between"><span>${plate(j.plate)} <b>${escape(j.car)}</b></span><span class="small muted">${escape(cu?.name || '')} · ${fmtKm(j.km)}</span></div>
      ${pps.length ? `<p class="callout ok small">🎟️ Plan activo: ${pps.map(p => `<b>${escape(p.planName)}</b> (${Object.entries(p.remaining).filter(([, n]) => n).map(([s, n]) => `${n}× ${escape(serviceById(s)?.name || s)}`).join(', ')})`).join(' · ')}</p>` : ''}
      <ul class="line-list">${j.items.map((i, k) => `<li><span>${escape(i.n)}${i.up ? ' <small class="badge badge-success plain">recomendado</small>' : ''}</span><span class="row nowrap" style="gap:8px">${pps.some(p => (p.remaining[i.s] || 0) > 0) || i.plan ? `<label class="check small"><input type="checkbox" data-plan="${k}" ${i.plan ? 'checked' : ''}> Plan</label>` : ''}<b>${i.plan ? '<s class="muted">' + money(i.p) + '</s> $0' : money(i.p)}</b></span></li>`).join('')}
        ${j.discount ? `<li><span>Cupón ${escape(j.coupon)}</span><b class="text-success">−${money(j.discount)}</b></li>` : ''}</ul>
      <div class="total-row"><span>Total a pagar</span><b>${money(j.total)}</b></div>
      <div class="grid-2"><div class="row" style="align-items:flex-end;gap:8px"><div class="field grow"><label for="co-c">Cupón</label><input class="input" id="co-c" name="cupon" value="${escape(j.coupon || '')}" placeholder="PITS10"></div><button class="btn" data-cp>Aplicar</button></div>
      <div class="field"><label for="co-m">Medio de pago</label><select class="select" id="co-m" name="medio">${PAY_METHODS.filter(p => p[0] !== 'plan' || j.total === 0).map(([k, l]) => `<option value="${k}" ${j.total === 0 && k === 'plan' ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>`;
  };
  body.addEventListener('change', e => { const p = e.target.closest('[data-plan]'); if (p) { if (!togglePlanItem(id, +p.dataset.plan)) toast('Sin saldo en el plan para ese servicio', 'warning'); paint(); } });
  body.addEventListener('click', e => { if (e.target.closest('[data-cp]')) { const r = applyCoupon(id, body.querySelector('#co-c').value.trim()); r.ok ? toast('Cupón aplicado', 'success') : toast(r.msg, 'warning'); paint(); } });
  m.el.querySelector('[data-pay]').onclick = () => {
    const folio = payJob(id, body.querySelector('#co-m').value, user?.id);
    toast(`Boleta N° ${folio} emitida`, 'success'); m.close();
    boletaModal(db.get('jobs', id)); onDone && onDone();
  };
  paint();
}

export function jobForm(job, user, preset = {}) {
  const isNew = !job;
  const j = job || { branchId: preset.branchId || user?.branchId || branches()[0].id, items: [{ s: 'aceite' }], status: preset.status || 'en-fila', km: 0, notes: '' };
  const v0 = job ? db.get('vehicles', job.vehicleId) : null, c0 = job ? customerById(job.customerId) : null;
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<div class="grid-3">
      <div class="field"><label for="jf-p">Patente *</label><input class="input" id="jf-p" name="patente" value="${escape(v0?.plate || '')}" ${isNew ? '' : 'readonly'} placeholder="KJTR-45"></div>
      <div class="field"><label for="jf-k">Kilometraje</label><input class="input" id="jf-k" name="km" type="number" min="0" step="100" value="${j.km || ''}"></div>
      <div class="field"><label for="jf-b">Sucursal</label><select class="select" id="jf-b" name="branch">${branches().map(b => `<option value="${b.id}" ${b.id === j.branchId ? 'selected' : ''}>${escape(b.name)}</option>`).join('')}</select></div>
    </div>
    <div class="callout small" data-veh>${v0 ? `${escape(v0.make)} ${escape(v0.model)} ${v0.year}` : 'Ingresa la patente para identificar el vehículo.'}</div>
    <div class="grid-3">
      <div class="field"><label for="jf-n">Cliente *</label><input class="input" id="jf-n" name="nombre" value="${escape(c0?.name || '')}"></div>
      <div class="field"><label for="jf-t">Celular</label><input class="input" id="jf-t" name="telefono" type="tel" value="${escape(c0?.phone || '')}"></div>
      <div class="field"><label for="jf-e">Correo</label><input class="input" id="jf-e" name="email" type="email" value="${escape(c0?.email || '')}"></div>
    </div>
    <fieldset class="fs"><legend>Servicios</legend><div class="grid-2" data-svcs>${services().map(s => `<label class="check"><input type="checkbox" name="svc" value="${s.id}" ${j.items.some(i => i.s === s.id) ? 'checked' : ''}> ${s.icon} ${escape(s.name)} <small class="muted" data-pr="${s.id}"></small></label>`).join('')}</div></fieldset>
    ${isNew ? `<div class="grid-2"><div class="field"><label for="jf-s">Tipo</label><select class="select" id="jf-s" name="status"><option value="en-fila" ${j.status === 'en-fila' ? 'selected' : ''}>Ingreso ahora (a la fila)</option><option value="reservado" ${j.status === 'reservado' ? 'selected' : ''}>Reserva</option></select></div>
      <div class="field" data-when><label for="jf-w">Fecha y hora de la reserva</label><input class="input" id="jf-w" name="when" type="datetime-local" step="1800"></div></div>` : ''}
    <div class="field"><label for="jf-o">Notas</label><textarea class="textarea" id="jf-o" name="notas">${escape(j.notes || '')}</textarea></div>`;
  const m = modal({ title: isNew ? 'Nueva atención' : `Editar ${job.code}`, size: 'lg', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>' });
  let veh = v0;
  const upd = () => {
    if (isNew) { const p = f.elements.patente.value; const r = validPlate(p) ? lookupPlate(p) : null; veh = r?.vehicle || null;
      f.querySelector('[data-veh]').innerHTML = r ? `${escape(r.vehicle.make)} ${escape(r.vehicle.model)} ${r.vehicle.year} · ${r.found ? '<b>cliente registrado</b>' : 'registro de vehículos (nuevo cliente)'}` : 'Ingresa la patente para identificar el vehículo.';
      if (r?.found && !f.elements.nombre.value) { const c = customerById(r.vehicle.customerId); if (c) { f.elements.nombre.value = c.name; f.elements.telefono.value = c.phone; f.elements.email.value = c.email; } }
      const w = f.querySelector('[data-when]'); if (w) w.hidden = f.elements.status.value !== 'reservado'; }
    f.querySelectorAll('[data-pr]').forEach(s => { s.textContent = veh ? money(priceFor(s.dataset.pr, veh)) : ''; });
  };
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
  if (isNew) { const t = new Date(Date.now() + 864e5); t.setHours(10, 0, 0, 0); f.elements.when.value = `${iso(t)}T10:00`; }
  m.el.querySelector('[data-save]').onclick = () => {
    const g = n => f.elements[n];
    const svc = [...f.querySelectorAll('[name=svc]:checked')].map(i => i.value);
    const bad = { patente: !veh, nombre: g('nombre').value.trim().length < 3 };
    Object.entries(bad).forEach(([k, b]) => g(k).classList.toggle('invalid', b));
    if (bad.patente || bad.nombre) { toast('Revisa patente y cliente', 'warning'); return; }
    if (!svc.length) { toast('Elige al menos un servicio', 'warning'); return; }
    if (isNew) {
      const c = (veh.customerId && customerById(veh.customerId)) || upsertCustomer({ name: g('nombre').value.trim(), phone: g('telefono').value.trim(), email: g('email').value.trim() });
      const st = g('status').value;
      if (st === 'reservado' && !g('when').value) { g('when').classList.add('invalid'); return; }
      const j2 = createJob({ veh, customerId: c.id, branchId: g('branch').value, serviceIds: svc, status: st, source: st === 'reservado' ? 'telefono' : 'walkin', bookedFor: st === 'reservado' ? new Date(g('when').value).toISOString() : '', km: +g('km').value || 0, notes: g('notas').value.trim(), user: user?.id });
      toast(`Atención ${j2.code} creada`, 'success');
    } else {
      const keep = job.items.filter(i => i.up || i.s === 'extra');
      const items = [...svc.filter(s => !keep.some(k => k.s === s)).map(s => ({ s, n: serviceById(s).name, p: priceFor(s, veh) })), ...keep];
      db.update('jobs', job.id, { items, branchId: g('branch').value, km: +g('km').value || job.km, notes: g('notas').value.trim() });
      if (c0) db.update('customers', c0.id, { name: g('nombre').value.trim(), phone: g('telefono').value.trim(), email: g('email').value.trim() });
      recalc(job.id);
      db.log('atencion', `${job.code} editada`, user?.id);
      toast('Atención actualizada', 'success');
    }
    m.close();
  };
}

export function jobDetail(id, user, { canEdit = true } = {}) {
  const body = document.createElement('div'); body.className = 'stack';
  const m = modal({ title: 'Atención', size: 'lg', body, foot: '<span></span>' });
  const paint = () => {
    const j = db.get('jobs', id); if (!j) { m.close(); return; }
    const cu = customerById(j.customerId), bay = db.get('bays', j.bayId);
    m.el.querySelector('.modal-head h3').textContent = `${j.code} · ${j.plate}`;
    const done = j.tasks.filter(t => t.d).length;
    body.innerHTML = `<div class="row between">${stBadge(j.status)}<small class="muted">${escape(SOURCES[j.source] || j.source)} · creada ${dateTime(j.createdAt)}</small></div>
      <div class="grid-3 small detail-grid">
        <div><span class="label">Vehículo</span><b>${plate(j.plate)}</b>${escape(j.car)} · ${fmtKm(j.km)}</div>
        <div><span class="label">Cliente</span><b>${escape(cu?.name || '—')}</b>${escape(cu?.phone || '')}</div>
        <div><span class="label">Sucursal</span><b>${escape(branchName(j.branchId))}</b>${bay ? escape(bay.name) : ''}${j.techId ? ' · ' + escape(userName(j.techId)) : ''}</div>
        <div><span class="label">Reserva</span><b>${j.bookedFor ? escape(dayLabel(j.bookedFor)) + ' ' + timeHM(j.bookedFor) : '—'}</b></div>
        <div><span class="label">Llegada / bahía / listo</span><b>${j.arrivedAt ? timeHM(j.arrivedAt) : '—'} · ${j.startedAt ? timeHM(j.startedAt) : '—'} · ${j.doneAt ? timeHM(j.doneAt) : '—'}</b></div>
        <div><span class="label">Pago</span><b>${j.pay ? `Boleta ${j.pay.folio}` : 'Pendiente'}</b>${j.pay ? escape(payName(j.pay.m)) : ''}</div>
      </div>
      ${photoSlots(j.photos || 0)}
      <ul class="line-list">${j.items.map(i => `<li><span>${escape(i.n)}${i.up ? ' <small class="badge badge-success plain">recomendado</small>' : ''}${i.plan ? ' <small class="badge badge-info plain">plan</small>' : ''}</span><b>${money(i.p)}</b></li>`).join('')}${j.discount ? `<li><span>Cupón ${escape(j.coupon)}</span><b>−${money(j.discount)}</b></li>` : ''}</ul>
      <div class="total-row"><span>Total</span><b>${money(j.total)}</b></div>
      ${j.tasks.length ? `<div class="small"><b>Checklist ${done}/${j.tasks.length}</b><div class="progress" style="margin-top:6px"><i style="--v:${done / j.tasks.length * 100}%"></i></div></div>` : ''}
      ${j.upsells.length ? `<div class="stack" style="gap:6px"><b class="small">Recomendaciones del técnico</b>${j.upsells.map(u => `<div class="row between small upsell card st-${u.st}" style="padding:8px 12px"><span>${escape(u.icon || '')} ${escape(u.label)} · <b>${money(u.p)}</b></span>${u.st === 'pendiente' ? `<span class="row nowrap" style="gap:6px"><button class="btn btn-sm btn-primary" data-up="${u.id}|1">Cliente aprobó</button><button class="btn btn-sm" data-up="${u.id}|0">Rechazó</button></span>` : `<span class="badge ${u.st === 'aprobado' ? 'badge-success' : ''}">${escape(u.st)}</span>`}</div>`).join('')}</div>` : ''}
      ${j.notes ? `<p class="callout small">📝 ${escape(j.notes)}</p>` : ''}`;
    const act = [];
    if (j.status === 'reservado') act.push('<button class="btn btn-primary" data-a="llego">Marcar llegada</button>', '<button class="btn" data-a="no-show">No llegó</button>');
    if (j.status === 'en-fila') act.push('<button class="btn btn-primary" data-a="bay">Asignar bahía</button>');
    if (j.status === 'en-bahia') act.push('<button class="btn btn-primary" data-a="done">Marcar listo</button>');
    if (j.status === 'listo') act.push('<button class="btn btn-primary" data-a="pay">Cobrar</button>');
    if (j.status === 'pagado') act.push('<button class="btn btn-primary" data-a="boleta">🧾 Boleta</button>');
    if (['reservado', 'en-fila'].includes(j.status)) act.push('<button class="btn btn-danger" data-a="cancel">Cancelar</button>');
    m.el.querySelector('.modal-foot').innerHTML = `${canEdit ? '<button class="btn btn-ghost" data-a="del">🗑</button>' : ''}<span class="grow"></span>${canEdit && !['pagado', 'cancelado', 'no-show'].includes(j.status) ? '<button class="btn" data-a="edit">Editar</button>' : ''}${act.join('')}`;
  };
  m.el.addEventListener('click', async e => {
    const j = db.get('jobs', id);
    const up = e.target.closest('[data-up]'); if (up) { const [u, ok] = up.dataset.up.split('|'); respondUpsell(id, u, ok === '1', 'recepción'); paint(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'llego') { checkInJob(id, user?.id); toast('Llegada registrada', 'success'); }
    if (a === 'no-show') { cancelJob(id, 'no-show', user?.id); }
    if (a === 'cancel') { if (!await confirm(`¿Cancelar ${j.code}?`, { danger: true, ok: 'Cancelar atención' })) return; cancelJob(id, 'cancelado', user?.id); }
    if (a === 'bay') { assignBay(id, user, paint); return; }
    if (a === 'done') { finishJob(id, user?.id); toast('Listo para retiro', 'success'); }
    if (a === 'pay') { m.close(); checkoutModal(id, user); return; }
    if (a === 'boleta') { boletaModal(j); return; }
    if (a === 'edit') { m.close(); jobForm(j, user); return; }
    if (a === 'del') { if (await confirm(`¿Eliminar definitivamente ${j.code}?`, { danger: true, ok: 'Eliminar' })) { db.remove('jobs', id); db.log('atencion', `${j.code} eliminada`, user?.id); m.close(); } return; }
    paint();
  });
  paint();
}
export { slotsFor, today, addDays };
