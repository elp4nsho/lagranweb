// Mi cuenta (cliente): vehículos, próxima mantención, historial con km, planes, boletas y atenciones.
import { escape, money, toast, formModal, date } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { MAKES, MODELS, modelById } from '../data/catalog.js';
import { customerById, vehicleHistory, dueInfo, fmtKm, branchName, oilById, segName, JOB_STATES, ACTIVE, dayLabel, timeHM, upsertVehicle, vehFromModel, validPlate, vehicleByPlate, serviceById, cancelJob } from '../shared/domain.js';
import { plate, carArt, stBadge, boletaModal, historyBoleta } from '../shared/bits.js';

let tab = 'vehiculos';

export function renderAccount(el, _p, query = {}) {
  const u = auth.current();
  if (!u || u.role !== 'cliente') {
    el.innerHTML = `<section class="section page-top"><div class="container narrow"><div class="card empty stack" style="align-items:center"><span class="icon">🔐</span><h2>Mi cuenta Pits Rápido</h2><p>Ingresa para ver tus vehículos, historial de servicios con kilometraje, planes y boletas.</p><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/cuenta')}">Ingresar</a><small class="muted">Demo: cliente@pitsrapido.cl · demo123</small></div></div></section>`;
    return {};
  }
  if (query.tab) tab = query.tab;
  const paint = () => {
    const c = customerById(u.customerId);
    if (!c) { el.innerHTML = '<div class="container section">Cliente no encontrado.</div>'; return; }
    const vehs = db.query('vehicles', v => v.customerId === c.id);
    const jobs = db.query('jobs', j => j.customerId === c.id);
    const active = jobs.filter(j => ACTIVE.includes(j.status) || j.status === 'reservado').sort((a, b) => (a.bookedFor || a.arrivedAt).localeCompare(b.bookedFor || b.arrivedAt));
    const pps = db.query('planPurchases', p => p.customerId === c.id);
    const hist = vehs.flatMap(v => vehicleHistory(v).map(h => ({ ...h, v }))).sort((a, b) => b.d.localeCompare(a.d));
    const T = [['vehiculos', `Mis vehículos (${vehs.length})`], ['historial', 'Historial'], ['planes', `Planes (${pps.length})`], ['boletas', 'Boletas'], ['datos', 'Mis datos']];
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div class="row between" data-anim><div><span class="eyebrow">Mi cuenta</span><h1 style="margin:0">Hola, ${escape(c.name.split(' ')[0])}</h1></div><div class="row"><a class="btn btn-primary" href="#/reservar?new=1">Reservar hora</a><button class="btn btn-ghost" data-out>Salir</button></div></div>
      ${active.length ? `<div class="stack" style="gap:8px">${active.map(j => `<div class="card row between"><div class="row" style="gap:10px">${plate(j.plate)}<span><b>${escape(JOB_STATES[j.status].icon)} ${escape(JOB_STATES[j.status].label)}</b><small class="muted d-block">${escape(j.code)} · ${escape(branchName(j.branchId))}${j.bookedFor && j.status === 'reservado' ? ` · ${escape(dayLabel(j.bookedFor))} ${timeHM(j.bookedFor)}` : ''}${j.upsells.some(x => x.st === 'pendiente') ? ' · <b class="text-warning">🔔 recomendación por aprobar</b>' : ''}</small></span></div><div class="row"><a class="btn btn-sm btn-primary" href="#/estado/${j.code}">Ver estado</a>${j.status === 'reservado' ? `<button class="btn btn-sm btn-ghost" data-cancel="${j.id}">Anular</button>` : ''}</div></div>`).join('')}</div>` : ''}
      <div class="tabs">${T.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${escape(l)}</button>`).join('')}</div>
      ${tab === 'vehiculos' ? `<div class="grid-2 veh-grid">${vehs.map(v => { const d = dueInfo(v), o = oilById(v.oil); return `<div class="card veh-card">${carArt(v.segment)}<div class="stack" style="gap:6px"><div class="row between">${plate(v.plate)}<span class="badge badge-${d.tone}">${d.label}</span></div><b>${escape(v.make)} ${escape(v.model)} ${v.year}</b><small class="muted">${escape(segName(v.segment))} · ${escape(o?.short || '')} ${String(v.liters).replace('.', ',')} L</small>
          <dl class="dl small"><dt>Kilometraje</dt><dd>${fmtKm(v.km)}</dd><dt>Próximo cambio</dt><dd>${fmtKm(v.nextDueKm)} ${d.kmLeft > 0 ? `<small class="muted">(faltan ${fmtKm(d.kmLeft)})</small>` : ''}</dd><dt>o antes del</dt><dd>${v.nextDueDate ? date(v.nextDueDate + 'T12:00') : '—'}</dd></dl>
          <div class="progress" title="Avance hacia el próximo cambio"><i style="--v:${Math.max(4, Math.min(100, 100 - d.kmLeft / (o?.interval || 10000) * 100))}%"></i></div>
          <div class="row"><a class="btn btn-sm btn-primary" href="#/reservar?p=${encodeURIComponent(v.plate)}">Reservar</a><button class="btn btn-sm" data-km="${v.id}">Actualizar km</button></div></div></div>`; }).join('')}
          <button class="card empty" data-addveh style="cursor:pointer;font:inherit;color:inherit"><span class="icon">＋</span>Agregar vehículo</button></div>` : ''}
      ${tab === 'historial' ? `<div class="card"><ol class="timeline">${hist.map(h => `<li><div class="row between"><b>${escape(dayLabel(h.d, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${fmtKm(h.km)}</b><span class="price">${money(h.t)}</span></div><small class="d-block">${plate(h.v.plate)} ${escape(h.s)}</small><small class="muted">Sucursal ${escape(branchName(h.b))}${h.f ? ` · boleta ${h.f}` : ''}</small></li>`).join('') || '<li>Sin servicios aún.</li>'}</ol></div>` : ''}
      ${tab === 'planes' ? (pps.length ? `<div class="grid-2">${pps.map(p => `<div class="card stack"><div class="row between"><b>${escape(p.planName)}</b><span class="badge ${p.status === 'activo' ? 'badge-success' : ''}">${escape(p.status)}</span></div><small class="muted">${escape(p.code)} · ${plate(p.plate)} · vence ${date(p.expiresAt + 'T12:00')}</small><ul class="line-list small">${Object.entries(p.remaining).map(([s, n]) => `<li><span>${escape(serviceById(s)?.name || s)}</span><b>${n} disponible${n === 1 ? '' : 's'}</b></li>`).join('')}</ul></div>`).join('')}</div>` : '<div class="card empty">No tienes planes. <a href="#/planes">Ver planes</a></div>') : ''}
      ${tab === 'boletas' ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Boleta</th><th>Vehículo</th><th>Detalle</th><th>Total</th><th></th></tr></thead><tbody>${hist.filter(h => h.f).map((h, i) => `<tr><td class="nowrap">${escape(h.d)}</td><td>N° ${h.f}</td><td>${plate(h.v.plate)}</td><td><small>${escape(h.s)}</small></td><td>${money(h.t)}</td><td><button class="btn btn-sm" data-bol="${i}">Ver</button></td></tr>`).join('')}</tbody></table></div>` : ''}
      ${tab === 'datos' ? `<form class="card stack narrow" data-me novalidate><div class="grid-2"><div class="field"><label for="me-n">Nombre</label><input class="input" id="me-n" name="name" value="${escape(c.name)}"></div><div class="field"><label for="me-r">RUT</label><input class="input" id="me-r" name="rut" value="${escape(c.rut)}"></div><div class="field"><label for="me-t">Celular</label><input class="input" id="me-t" name="phone" value="${escape(c.phone)}"></div><div class="field"><label for="me-c">Comuna</label><input class="input" id="me-c" name="comuna" value="${escape(c.comuna || '')}"></div></div>
        <div class="row"><label class="check"><input type="checkbox" name="optWa" ${c.optWa ? 'checked' : ''}> WhatsApp</label><label class="check"><input type="checkbox" name="optSms" ${c.optSms ? 'checked' : ''}> SMS</label><label class="check"><input type="checkbox" name="optEmail" ${c.optEmail ? 'checked' : ''}> Correo</label></div><button class="btn btn-primary">Guardar</button></form>` : ''}
    </div></section>`;
    const me = el.querySelector('[data-me]');
    if (me) me.onsubmit = e => { e.preventDefault(); const g = n => me.elements[n]; db.update('customers', c.id, { name: g('name').value.trim() || c.name, rut: g('rut').value.trim(), phone: g('phone').value.trim(), comuna: g('comuna').value.trim(), optWa: g('optWa').checked, optSms: g('optSms').checked, optEmail: g('optEmail').checked }); toast('Datos guardados', 'success'); };
    el._hist = hist;
  };
  el.onclick = async e => {
    const t = e.target;
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; paint(); return; }
    if (t.closest('[data-out]')) { auth.logout(); location.hash = '#/'; return; }
    const b = t.closest('[data-bol]'); if (b) { const h = el._hist.filter(x => x.f)[+b.dataset.bol]; h.jobId ? boletaModal(db.get('jobs', h.jobId)) : historyBoleta(h, h.v); return; }
    const cn = t.closest('[data-cancel]'); if (cn) { cancelJob(cn.dataset.cancel, 'cancelado', u.id); toast('Reserva anulada', 'success'); return; }
    const k = t.closest('[data-km]'); if (k) { const v = db.get('vehicles', k.dataset.km); const r = await formModal({ title: `Kilometraje ${v.plate}`, fields: [{ name: 'km', label: 'Kilometraje actual', type: 'number', required: true, value: v.km }] }); if (r && r.km >= 0) { db.update('vehicles', v.id, { km: r.km }); toast('Kilometraje actualizado', 'success'); } return; }
    if (t.closest('[data-addveh]')) {
      const r = await formModal({ title: 'Agregar vehículo', fields: [{ name: 'plate', label: 'Patente', required: true, placeholder: 'KJTR-45' }, { name: 'model', label: 'Marca y modelo', type: 'select', options: MODELS.map(m => [m.id, `${m.make} ${m.model}`]) }, { name: 'year', label: 'Año', type: 'number', value: 2020, required: true }, { name: 'km', label: 'Kilometraje', type: 'number', value: 30000 }] });
      if (!r) return;
      if (!validPlate(r.plate)) { toast('Patente no válida', 'warning'); return; }
      const ex = vehicleByPlate(r.plate);
      if (ex && ex.customerId && ex.customerId !== u.customerId) { toast('Esa patente ya está asociada a otra cuenta', 'warning'); return; }
      if (ex) db.update('vehicles', ex.id, { customerId: u.customerId });
      else upsertVehicle({ ...vehFromModel(modelById(r.model), r.year), plate: r.plate }, u.customerId, r.km);
      toast('Vehículo agregado', 'success');
    }
  };
  paint();
  return { refresh: paint };
}
export { MAKES };
