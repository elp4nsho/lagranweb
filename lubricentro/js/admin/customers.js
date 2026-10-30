// Clientes y vehículos: CRUD, ficha con historial por km, planes y mantención vencida.
import { escape, money, modal, toast, confirm, formModal, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { MODELS, SEGMENTS, modelById } from '../data/catalog.js';
import { vehicleHistory, dueInfo, fmtKm, branchName, segName, oilById, fmtPlate, validPlate, vehicleByPlate, serviceById } from '../shared/domain.js';
import { plate } from '../shared/bits.js';
import { jobForm } from '../shared/job-ui.js';

let tab = 'clientes';

async function editCustomer(c, ctx) {
  const v = await formModal({ title: c ? `Editar · ${c.name}` : 'Nuevo cliente', fields: [
    { name: 'name', label: 'Nombre', required: true, value: c?.name }, { name: 'rut', label: 'RUT', value: c?.rut, placeholder: '12.345.678-9' },
    { name: 'email', label: 'Correo', type: 'email', value: c?.email }, { name: 'phone', label: 'Celular', required: true, value: c?.phone },
    { name: 'comuna', label: 'Comuna', value: c?.comuna }, { name: 'company', label: 'Empresa (flota)', value: c?.company },
    { name: 'optWa', label: 'Acepta WhatsApp', type: 'checkbox', value: c ? c.optWa : true }, { name: 'optSms', label: 'Acepta SMS', type: 'checkbox', value: c ? c.optSms : true }, { name: 'optEmail', label: 'Acepta correo', type: 'checkbox', value: c ? c.optEmail : true },
    { name: 'notes', label: 'Notas', type: 'textarea', value: c?.notes }] });
  if (!v) return;
  if (v.email && db.find('customers', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== c?.id)) { toast('Ya existe un cliente con ese correo', 'warning'); return; }
  if (c) db.update('customers', c.id, v); else db.insert('customers', v);
  db.log('cliente', `${c ? 'Editado' : 'Creado'}: ${v.name}`, ctx.user.id);
  toast('Cliente guardado', 'success');
}
export async function editVehicle(v, ctx, ownerId = '') {
  const r = await formModal({ title: v ? `Editar ${v.plate}` : 'Nuevo vehículo', fields: [
    { name: 'plate', label: 'Patente', required: true, value: v?.plate, placeholder: 'KJTR-45' },
    { name: 'modelId', label: 'Marca y modelo', type: 'select', options: MODELS.map(m => [m.id, `${m.make} ${m.model}`]), value: v?.modelId },
    { name: 'year', label: 'Año', type: 'number', required: true, value: v?.year || 2020 },
    { name: 'km', label: 'Kilometraje', type: 'number', value: v?.km || 0 },
    { name: 'segment', label: 'Segmento (precio)', type: 'select', options: [['', 'Según modelo'], ...SEGMENTS.map(s => [s.id, s.name])], value: v?.segment || '', help: 'Define la columna de precios.' },
    { name: 'oil', label: 'Aceite', type: 'select', options: [['', 'Según modelo'], ...db.all('oils').map(o => [o.id, o.name])], value: v?.oil || '' },
    { name: 'customerId', label: 'Dueño', type: 'select', options: [['', '— Sin dueño —'], ...db.all('customers').sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name])], value: v?.customerId || ownerId }] });
  if (!r) return;
  if (!validPlate(r.plate)) { toast('Patente no válida (KJTR-45 o AB-1234)', 'warning'); return; }
  const ex = vehicleByPlate(r.plate); if (ex && ex.id !== v?.id) { toast('Esa patente ya existe', 'warning'); return; }
  const m = modelById(r.modelId);
  const data = { plate: fmtPlate(r.plate), modelId: m.id, make: m.make, model: m.model, year: r.year, km: r.km, segment: r.segment || m.segment, oil: r.oil || m.oil, liters: v?.modelId === m.id ? v.liters : m.liters, customerId: r.customerId };
  if (v) db.update('vehicles', v.id, data); else db.insert('vehicles', { ...data, nextDueKm: r.km + (oilById(data.oil)?.interval || 10000), nextDueDate: '', lastServiceAt: '', history: [] });
  db.log('vehiculo', `${v ? 'Editado' : 'Creado'}: ${data.plate}`, ctx.user.id);
  toast('Vehículo guardado', 'success');
}

function customerDetail(id, ctx) {
  const body = document.createElement('div'); body.className = 'stack';
  const m = modal({ title: 'Cliente', size: 'lg', body, foot: '<button class="btn btn-ghost" data-del>🗑 Eliminar</button><span class="grow"></span><button class="btn" data-addv>+ Vehículo</button><button class="btn" data-edit>Editar</button><button class="btn btn-primary" data-job>Nueva atención</button>' });
  const paint = () => {
    const c = db.get('customers', id); if (!c) { m.close(); return; }
    const vs = db.query('vehicles', v => v.customerId === id);
    const jobs = db.query('jobs', j => j.customerId === id && j.status === 'pagado');
    const pps = db.query('planPurchases', p => p.customerId === id);
    m.el.querySelector('.modal-head h3').textContent = c.name;
    body.innerHTML = `<div class="grid-3 small detail-grid"><div><span class="label">RUT</span><b>${escape(c.rut || '—')}</b></div><div><span class="label">Contacto</span><b>${escape(c.phone)}</b>${escape(c.email)}</div><div><span class="label">Comuna</span><b>${escape(c.comuna || '—')}</b>${escape(c.company || '')}</div>
      <div><span class="label">Canales</span><b>${[c.optWa && 'WhatsApp', c.optSms && 'SMS', c.optEmail && 'Correo'].filter(Boolean).join(' · ') || 'Ninguno'}</b></div><div><span class="label">Gasto en sistema</span><b>${money(jobs.reduce((s, j) => s + j.total, 0))}</b>${jobs.length} atenciones</div><div><span class="label">Cliente desde</span><b>${date(c.createdAt)}</b></div></div>
      ${c.notes ? `<p class="callout small">📝 ${escape(c.notes)}</p>` : ''}
      ${vs.map(v => { const d = dueInfo(v); return `<div class="card stack" style="gap:8px"><div class="row between"><span>${plate(v.plate)} <b>${escape(v.make)} ${escape(v.model)} ${v.year}</b> <small class="muted">${escape(segName(v.segment))} · ${escape(oilById(v.oil)?.short || '')}</small></span><span class="row nowrap" style="gap:6px"><span class="badge badge-${d.tone}">${d.label}</span><button class="btn btn-sm" data-ev="${v.id}">Editar</button></span></div>
        <small class="muted">Km ${fmtKm(v.km)} · próximo cambio ${fmtKm(v.nextDueKm)} o ${v.nextDueDate || '—'}</small>
        <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Km</th><th>Servicio</th><th>Sucursal</th><th>Total</th></tr></thead><tbody>${vehicleHistory(v).slice(0, 6).map(h => `<tr><td class="nowrap">${escape(h.d)}</td><td>${fmtKm(h.km)}</td><td><small>${escape(h.s)}</small></td><td>${escape(branchName(h.b))}</td><td>${money(h.t)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin historial</td></tr>'}</tbody></table></div></div>`; }).join('') || '<p class="muted">Sin vehículos.</p>'}
      ${pps.length ? `<b>Planes</b>${pps.map(p => `<div class="row between small"><span>${escape(p.code)} · ${escape(p.planName)} · ${escape(p.plate)}</span><span>${Object.entries(p.remaining).map(([s, n]) => `${n}× ${escape(serviceById(s)?.name || s)}`).join(', ')}</span></div>`).join('')}` : ''}`;
  };
  m.el.addEventListener('click', async e => {
    const c = db.get('customers', id);
    if (e.target.closest('[data-edit]')) { await editCustomer(c, ctx); paint(); }
    if (e.target.closest('[data-addv]')) { await editVehicle(null, ctx, id); paint(); }
    const ev = e.target.closest('[data-ev]'); if (ev) { await editVehicle(db.get('vehicles', ev.dataset.ev), ctx); paint(); }
    if (e.target.closest('[data-job]')) { m.close(); jobForm(null, ctx.user); }
    if (e.target.closest('[data-del]')) {
      if (db.count('jobs', j => j.customerId === id && !['pagado', 'cancelado', 'no-show'].includes(j.status))) { toast('Tiene atenciones en curso o reservas', 'warning'); return; }
      if (await confirm(`¿Eliminar a ${c.name}? Sus vehículos quedarán sin dueño.`, { danger: true, ok: 'Eliminar' })) { db.query('vehicles', v => v.customerId === id).forEach(v => db.update('vehicles', v.id, { customerId: '' })); db.remove('customers', id); db.log('cliente', `Eliminado: ${c.name}`, ctx.user.id); m.close(); }
    }
  });
  paint();
}

export default {
  id: 'clientes', label: 'Clientes y vehículos', icon: '👥', group: 'Operación', roles: ['admin', 'jefe', 'recepcion'], watch: ['customers', 'vehicles', 'jobs'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Clientes y vehículos', 'Base de clientes, flota y próximas mantenciones', '<button class="btn btn-primary btn-sm" data-new>+ Nuevo</button>')}${tabs([['clientes', 'Clientes'], ['vehiculos', 'Vehículos']], tab)}<div data-list></div>`;
    el.querySelector('[data-new]').onclick = () => tab === 'clientes' ? editCustomer(null, ctx) : editVehicle(null, ctx);
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    const box = el.querySelector('[data-list]');
    if (tab === 'clientes') return smartTable(box, {
      rows: () => { const vc = {}; db.all('vehicles').forEach(v => { vc[v.customerId] = (vc[v.customerId] || 0) + 1; }); return db.all('customers').map(c => ({ ...c, nveh: vc[c.id] || 0 })); },
      filters: [{ key: 'comuna', label: 'Comuna', options: [...new Set(db.all('customers').map(c => c.comuna).filter(Boolean))].sort() }, { key: 'optWa', label: 'WhatsApp', options: [['true', 'Acepta'], ['false', 'No acepta']], test: (r, v) => String(!!r.optWa) === v }],
      search: r => `${r.name} ${r.rut} ${r.email} ${r.phone}`,
      columns: [{ key: 'name', label: 'Cliente', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.email)}</small>` }, { key: 'rut', label: 'RUT' }, { key: 'phone', label: 'Celular' }, { key: 'comuna', label: 'Comuna' }, { key: 'nveh', label: 'Vehículos' }],
      onRow: r => customerDetail(r.id, ctx),
      csv: { name: 'clientes', map: r => ({ nombre: r.name, rut: r.rut, correo: r.email, celular: r.phone, comuna: r.comuna, vehiculos: r.nveh }) }
    });
    return smartTable(box, {
      rows: () => db.all('vehicles').map(v => { const d = dueInfo(v); return { ...v, owner: db.get('customers', v.customerId)?.name || '—', due: d.label, tone: d.tone, kmLeft: d.kmLeft }; }),
      filters: [{ key: 'segment', label: 'Segmento', options: SEGMENTS.map(s => [s.id, s.name]) }, { key: 'due', label: 'Mantención', options: ['Al día', 'Mantención próxima', 'Mantención vencida'] }, { key: 'make', label: 'Marca', options: [...new Set(db.all('vehicles').map(v => v.make))].sort() }],
      search: r => `${r.plate} ${r.make} ${r.model} ${r.owner}`,
      columns: [{ key: 'plate', label: 'Patente', render: r => plate(r.plate) }, { key: 'make', label: 'Vehículo', render: r => `<b>${escape(r.make)} ${escape(r.model)}</b> ${r.year}` }, { key: 'segment', label: 'Segmento', render: r => escape(segName(r.segment)) }, { key: 'km', label: 'Km', render: r => fmtKm(r.km) }, { key: 'owner', label: 'Dueño' }, { key: 'kmLeft', label: 'Próximo cambio', render: r => `<span class="badge badge-${r.tone}">${escape(r.due)}</span><small class="muted d-block">${fmtKm(r.nextDueKm)}</small>` }],
      onRow: r => r.customerId ? customerDetail(r.customerId, ctx) : editVehicle(db.get('vehicles', r.id), ctx),
      csv: { name: 'vehiculos', map: r => ({ patente: r.plate, marca: r.make, modelo: r.model, anio: r.year, segmento: segName(r.segment), km: r.km, dueno: r.owner, proximo_km: r.nextDueKm, proxima_fecha: r.nextDueDate, estado: r.due }) }
    });
  }
};
