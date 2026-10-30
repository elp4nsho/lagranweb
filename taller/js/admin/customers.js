// Clientes y vehículos: CRUD, ficha con historial de OT, documentos y garantías.
import { escape, money, modal, toast, confirm, formModal, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { vehicleHistory, fmtKm, validPlate, fmtPlate, vehicleByPlate, OPEN, ST_OF } from '../shared/domain.js';
import { plate, stBadge } from '../shared/bits.js';
import { newOT } from './ots.js';

let tab = 'clientes';
async function editCustomer(c, ctx) {
  const v = await formModal({ title: c ? c.name : 'Nuevo cliente', fields: [{ name: 'name', label: 'Nombre o razón social', required: true, value: c?.name }, { name: 'rut', label: 'RUT', value: c?.rut }, { name: 'phone', label: 'Celular', required: true, value: c?.phone }, { name: 'email', label: 'Correo', type: 'email', value: c?.email }, { name: 'address', label: 'Dirección / comuna', value: c?.address }, { name: 'company', label: 'Empresa (flota)', value: c?.company }, { name: 'notes', label: 'Notas', type: 'textarea', value: c?.notes }] });
  if (!v) return;
  c ? db.update('customers', c.id, v) : db.insert('customers', v);
  db.log('cliente', `${c ? 'Editado' : 'Creado'}: ${v.name}`, ctx.user.id); toast('Cliente guardado', 'success');
}
async function editVehicle(v, ctx, owner = '') {
  const r = await formModal({ title: v ? v.plate : 'Nuevo vehículo', fields: [{ name: 'plate', label: 'Patente', required: true, value: v?.plate }, { name: 'make', label: 'Marca', required: true, value: v?.make }, { name: 'model', label: 'Modelo', required: true, value: v?.model }, { name: 'year', label: 'Año', type: 'number', value: v?.year || 2020 }, { name: 'vin', label: 'VIN', value: v?.vin }, { name: 'color', label: 'Color', value: v?.color }, { name: 'km', label: 'Kilometraje', type: 'number', value: v?.km || 0 }, { name: 'customerId', label: 'Dueño', type: 'select', options: db.all('customers').sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]), value: v?.customerId || owner }] });
  if (!r) return;
  if (!validPlate(r.plate)) { toast('Patente no válida', 'warning'); return; }
  const ex = vehicleByPlate(r.plate); if (ex && ex.id !== v?.id) { toast('Esa patente ya existe', 'warning'); return; }
  r.plate = fmtPlate(r.plate);
  v ? db.update('vehicles', v.id, r) : db.insert('vehicles', { ...r, history: [] });
  db.log('vehiculo', `${v ? 'Editado' : 'Creado'}: ${r.plate}`, ctx.user.id); toast('Vehículo guardado', 'success');
}
function detail(id, ctx) {
  const body = document.createElement('div'); body.className = 'stack';
  const m = modal({ title: 'Cliente', size: 'lg', body, foot: '<button class="btn btn-ghost" data-del>🗑</button><span class="grow"></span><button class="btn" data-addv>+ Vehículo</button><button class="btn" data-edit>Editar</button><button class="btn btn-primary" data-ot>Nueva OT</button>' });
  const paint = () => {
    const c = db.get('customers', id); if (!c) { m.close(); return; }
    const vs = db.query('vehicles', v => v.customerId === id), ots = db.query('ots', o => o.customerId === id), invs = db.query('invoices', i => i.customerId === id);
    m.el.querySelector('.modal-head h3').textContent = c.name;
    body.innerHTML = `<div class="grid-3 small detail-grid"><div><span class="label">RUT</span><b>${escape(c.rut || '—')}</b></div><div><span class="label">Contacto</span><b>${escape(c.phone)}</b>${escape(c.email || '')}</div><div><span class="label">Facturado</span><b>${money(invs.reduce((s, i) => s + i.total, 0))}</b>${invs.length} documentos</div></div>${c.notes ? `<p class="callout small">${escape(c.notes)}</p>` : ''}
      ${ots.filter(o => OPEN.includes(o.status)).map(o => `<a class="callout small" href="#/ots/${o.id}" data-close>${escape(o.code)} · ${escape(o.plate)} · ${escape(ST_OF(o.status).label)} →</a>`).join('')}
      ${vs.map(v => `<div class="card stack" style="gap:6px"><div class="row between"><span>${plate(v.plate)} <b>${escape(v.make)} ${escape(v.model)} ${v.year}</b> <small class="muted">${escape(v.color || '')} · ${fmtKm(v.km)}</small></span><button class="btn btn-sm" data-ev="${v.id}">Editar</button></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>OT</th><th>Trabajo</th><th>Km</th><th class="num">Total</th></tr></thead><tbody>${vehicleHistory(v).slice(0, 6).map(h => `<tr><td class="nowrap">${escape(h.d)}</td><td>${escape(h.ot)}</td><td><small>${escape(h.s)}</small></td><td>${fmtKm(h.km)}</td><td class="num">${money(h.t)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin historial</td></tr>'}</tbody></table></div></div>`).join('')}`;
  };
  m.el.addEventListener('click', async e => {
    if (e.target.closest('[data-edit]')) { await editCustomer(db.get('customers', id), ctx); paint(); }
    if (e.target.closest('[data-addv]')) { await editVehicle(null, ctx, id); paint(); }
    const ev = e.target.closest('[data-ev]'); if (ev) { await editVehicle(db.get('vehicles', ev.dataset.ev), ctx); paint(); }
    if (e.target.closest('[data-ot]')) { const v = db.find('vehicles', x => x.customerId === id); const c = db.get('customers', id); m.close(); newOT(ctx, { plate: v?.plate || '', name: c.name, phone: c.phone, email: c.email }); }
    if (e.target.closest('[data-del]')) { if (db.count('ots', o => o.customerId === id && OPEN.includes(o.status))) { toast('Tiene OT abiertas', 'warning'); return; } if (await confirm('¿Eliminar cliente?', { danger: true, ok: 'Eliminar' })) { db.remove('customers', id); db.log('cliente', 'Cliente eliminado', ctx.user.id); m.close(); } }
  });
  paint();
}

export default {
  id: 'clientes', label: 'Clientes y vehículos', icon: '👥', group: 'Comercial', roles: ['admin', 'jefe', 'asesor'], watch: ['customers', 'vehicles', 'ots'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Clientes y vehículos', 'Base de clientes con su flota e historial de reparaciones', '<button class="btn btn-primary btn-sm" data-new>+ Nuevo</button>')}${tabs([['clientes', 'Clientes'], ['vehiculos', 'Vehículos']], tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.querySelector('[data-new]').onclick = () => tab === 'clientes' ? editCustomer(null, ctx) : editVehicle(null, ctx);
    const box = el.querySelector('[data-list]');
    if (tab === 'clientes') return smartTable(box, { rows: () => db.all('customers').map(c => ({ ...c, nv: db.count('vehicles', v => v.customerId === c.id), nots: db.count('ots', o => o.customerId === c.id) })), filters: [{ key: 'company', label: 'Tipo', options: [['p', 'Particular'], ['e', 'Empresa']], test: (r, v) => v === 'e' ? !!r.company : !r.company }], search: r => `${r.name} ${r.rut} ${r.phone} ${r.email}`,
      columns: [{ key: 'name', label: 'Cliente', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.company || r.email || '')}</small>` }, { key: 'rut', label: 'RUT' }, { key: 'phone', label: 'Celular' }, { key: 'nv', label: 'Vehículos' }, { key: 'nots', label: 'OT' }, { key: 'createdAt', label: 'Desde', render: r => date(r.createdAt) }],
      onRow: r => detail(r.id, ctx), csv: { name: 'clientes', map: r => ({ nombre: r.name, rut: r.rut, celular: r.phone, correo: r.email, vehiculos: r.nv, ot: r.nots }) } });
    return smartTable(box, { rows: () => db.all('vehicles').map(v => ({ ...v, owner: db.get('customers', v.customerId)?.name || '—', last: vehicleHistory(v)[0]?.d || '' })), filters: [{ key: 'make', label: 'Marca', options: [...new Set(db.all('vehicles').map(v => v.make))].sort() }], search: r => `${r.plate} ${r.make} ${r.model} ${r.owner} ${r.vin}`,
      columns: [{ key: 'plate', label: 'Patente', render: r => plate(r.plate) }, { key: 'make', label: 'Vehículo', render: r => `<b>${escape(r.make)} ${escape(r.model)}</b> ${r.year}` }, { key: 'km', label: 'Km', render: r => fmtKm(r.km) }, { key: 'owner', label: 'Dueño' }, { key: 'last', label: 'Última visita' }],
      onRow: r => r.customerId ? detail(r.customerId, ctx) : editVehicle(db.get('vehicles', r.id), ctx), csv: { name: 'vehiculos', map: r => ({ patente: r.plate, marca: r.make, modelo: r.model, anio: r.year, vin: r.vin, km: r.km, dueno: r.owner }) } });
  }
};
export { stBadge };
