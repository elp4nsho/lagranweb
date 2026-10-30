// Clientes y vehículos: CRUD, membresía, ficha con autos, documentos e historial de órdenes.
import { escape, money, date, toast, modal, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { COMUNAS, FUEL, WO_STATES } from '../data/catalog.js';
import { woTotal, vehicleName, tierById, statusBadge, kmFmt, allModels, lineOf } from '../shared/domain.js';
import { normPlate, validRut } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';
import { woDetail } from './ordenes.js';

async function editCustomer(c, ctx) {
  const v = await formModal({ title: c ? `Editar · ${c.name}` : 'Nuevo cliente', fields: [
    { name: 'name', label: 'Nombre', required: true, value: c?.name }, { name: 'rut', label: 'RUT', value: c?.rut }, { name: 'email', label: 'Correo', type: 'email', required: true, value: c?.email },
    { name: 'phone', label: 'Teléfono', value: c?.phone }, { name: 'address', label: 'Dirección', value: c?.address }, { name: 'comuna', label: 'Comuna', type: 'select', options: Object.keys(COMUNAS), value: c?.comuna },
    { name: 'tier', label: 'Membresía', type: 'select', options: [['', 'Sin membresía'], ...db.all('tiers').map(t => [t.id, t.name])], value: c?.tier || '' }, { name: 'notes', label: 'Notas', type: 'textarea', value: c?.notes }] });
  if (!v) return;
  if (v.rut && !validRut(v.rut)) { toast('RUT inválido', 'warning'); return; }
  if (db.find('customers', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== c?.id)) { toast('Ya existe un cliente con ese correo', 'warning'); return; }
  const patch = { ...v, tier: v.tier || null, ...(v.tier && v.tier !== c?.tier ? { tierSince: new Date().toISOString().slice(0, 10) } : {}) };
  if (c) db.update('customers', c.id, patch); else db.insert('customers', { ...patch, since: new Date().toISOString() });
  db.log('clientes', `${c ? 'Cliente editado' : 'Cliente creado'}: ${v.name}`, ctx.user.id); toast('Cliente guardado', 'success');
}
export async function editVehicle(veh, customerId, ctx) {
  const models = allModels();
  const v = await formModal({ title: veh ? `Editar · ${vehicleName(veh)}` : 'Nuevo vehículo', fields: [
    { name: 'model', label: 'Marca y modelo', type: 'select', options: models.map(m => [`${m.brand}|${m.name}`, `${m.brand} ${m.name}`]), value: veh ? `${veh.brand}|${veh.model}` : '' },
    { name: 'year', label: 'Año', type: 'number', required: true, value: veh?.year || 2024 }, { name: 'plate', label: 'Patente', required: true, value: veh?.plate }, { name: 'vin', label: 'VIN', value: veh?.vin },
    { name: 'km', label: 'Kilometraje', type: 'number', value: veh?.km || 0 }, { name: 'colorName', label: 'Nombre del color', value: veh?.colorName }, { name: 'color', label: 'Color', type: 'color', value: veh?.color || '#5b6474' }] });
  if (!v) return;
  const [brand, model] = v.model.split('|'), m = models.find(x => x.brand === brand && x.name === model) || {};
  const data = { brand, model, year: v.year, plate: normPlate(v.plate), vin: v.vin, km: v.km, colorName: v.colorName, color: v.color, fuel: m.fuel || veh?.fuel, body: m.body || veh?.body, hp: m.hp || veh?.hp };
  if (veh) db.update('vehicles', veh.id, data); else db.insert('vehicles', { ...data, customerId, docs: [], addedAt: new Date().toISOString() });
  db.log('clientes', `Vehículo ${veh ? 'editado' : 'agregado'}: ${brand} ${model} ${data.plate}`, ctx.user.id); toast('Vehículo guardado', 'success');
}
function customerSheet(id, ctx) {
  const draw = () => {
    const c = db.get('customers', id), t = tierById(c.tier);
    const cars = db.query('vehicles', v => v.customerId === id), orders = db.query('workOrders', w => w.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const spend = orders.filter(w => w.status === 'entregada').reduce((a, w) => a + woTotal(w), 0);
    return `<div class="stack"><div class="grid-2"><dl class="dl small"><dt>RUT</dt><dd>${escape(c.rut || '—')}</dd><dt>Correo</dt><dd>${escape(c.email)}</dd><dt>Teléfono</dt><dd>${escape(c.phone || '')}</dd><dt>Dirección</dt><dd>${escape(c.address || '')}, ${escape(c.comuna || '')}</dd><dt>Cliente desde</dt><dd>${date(c.since)}</dd></dl>
      <div class="stack" style="gap:6px"><span class="label">Membresía</span><b class="price">${t ? escape(t.name) : 'Sin membresía'}</b><span class="label">Total facturado</span><b class="price">${money(spend)}</b><small class="muted">${orders.length} órdenes</small></div></div>
      ${c.notes ? `<p class="callout small">${escape(c.notes)}</p>` : ''}
      <div class="row between"><h4 style="margin:0">Vehículos</h4><button class="btn btn-sm" data-addveh>+ Vehículo</button></div>
      <div class="grid-2">${cars.map(v => `<div class="card stack" style="box-shadow:none;gap:6px"><div class="car-frame">${carArt({ body: v.body, color: v.color, ev: v.fuel === 'electrico' })}</div><b>${escape(vehicleName(v))}</b><small class="muted">${escape(v.plate)} · ${v.year} · ${kmFmt(v.km)} · ${escape(FUEL[v.fuel] || '')}</small><small>${(v.docs || []).map(d => `${escape(d.type)}: ${new Date(d.exp) < new Date() ? '<b style="color:var(--danger)">vencido</b>' : 'vigente'}`).join(' · ')}</small><button class="btn btn-sm btn-ghost" data-editveh="${v.id}">Editar</button></div>`).join('') || '<p class="muted">Sin vehículos.</p>'}</div>
      <h4 style="margin:0">Órdenes</h4><div class="table-wrap"><table class="table"><thead><tr><th>OT</th><th>Fecha</th><th>Trabajo</th><th>Estado</th><th>Total</th></tr></thead><tbody>${orders.slice(0, 12).map(w => `<tr data-wo="${w.id}" style="cursor:pointer"><td class="mono">${w.code}</td><td>${date(w.createdAt)}</td><td>${lineOf(w.line).icon} ${escape(w.title)}</td><td>${statusBadge(WO_STATES, w.status)}</td><td>${money(woTotal(w))}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin órdenes</td></tr>'}</tbody></table></div></div>`;
  };
  const m = modal({ title: db.get('customers', id).name, size: 'lg', body: draw(), foot: '<button class="btn btn-danger btn-sm" data-del>Eliminar</button><span class="grow"></span><button class="btn btn-sm" data-edit>Editar datos</button><button class="btn btn-primary btn-sm" data-close>Listo</button>' });
  const re = () => { if (document.body.contains(m.el)) m.el.querySelector('.modal-body').innerHTML = draw(); };
  m.el.addEventListener('click', async e => {
    if (e.target.closest('[data-addveh]')) { await editVehicle(null, id, ctx); re(); }
    const ev = e.target.closest('[data-editveh]'); if (ev) { await editVehicle(db.get('vehicles', ev.dataset.editveh), id, ctx); re(); }
    if (e.target.closest('[data-edit]')) { await editCustomer(db.get('customers', id), ctx); re(); }
    const w = e.target.closest('[data-wo]'); if (w) woDetail(w.dataset.wo, ctx);
    if (e.target.closest('[data-del]')) {
      if (db.count('workOrders', x => x.customerId === id && !['entregada', 'cancelada'].includes(x.status))) { toast('Tiene órdenes abiertas; no se puede eliminar', 'warning'); return; }
      if (await confirm('¿Eliminar este cliente y sus vehículos?', { danger: true, ok: 'Eliminar' })) { const c = db.get('customers', id); db.query('vehicles', v => v.customerId === id).forEach(v => db.remove('vehicles', v.id)); db.remove('customers', id); db.log('clientes', `Cliente eliminado: ${c.name}`, ctx.user.id); m.close(); toast('Cliente eliminado', 'success'); }
    }
  });
}

export default {
  id: 'clientes', label: 'Clientes y vehículos', icon: '👤', group: 'Clientes', roles: ['admin', 'gerente', 'asesor'],
  watch: ['customers', 'vehicles', 'workOrders'],
  render(el, ctx) {
    const view = ctx.params.sub || 'clientes';
    el.innerHTML = `${pageHead('Clientes y vehículos', `${db.count('customers')} clientes · ${db.count('vehicles')} vehículos`, '<button class="btn btn-primary btn-sm" data-new>+ Nuevo cliente</button>')}
      <div class="tabs"><a class="tab ${view === 'clientes' ? 'active' : ''}" href="#/clientes/clientes">Clientes</a><a class="tab ${view === 'vehiculos' ? 'active' : ''}" href="#/clientes/vehiculos">Vehículos</a></div><div data-body></div>`;
    el.querySelector('[data-new]').onclick = () => editCustomer(null, ctx);
    const body = el.querySelector('[data-body]');
    if (view === 'vehiculos') return smartTable(body, {
      rows: () => db.all('vehicles').map(v => ({ ...v, name: vehicleName(v), owner: db.get('customers', v.customerId)?.name || '', expired: (v.docs || []).filter(d => new Date(d.exp) < new Date()).length })),
      filters: [{ key: 'brand', label: 'Marca', options: [...new Set(db.all('vehicles').map(v => v.brand))] }, { key: 'fuel', label: 'Motor', options: Object.entries(FUEL) }, { key: 'expired', label: 'Documentos', options: [['1', 'Con vencidos']], test: r => r.expired > 0 }],
      search: r => `${r.name} ${r.plate} ${r.owner} ${r.vin}`,
      columns: [{ key: 'name', label: 'Vehículo', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${r.year} · ${escape(r.colorName || '')}</small>` }, { key: 'plate', label: 'Patente', render: r => `<span class="mono">${escape(r.plate)}</span>` }, { key: 'owner', label: 'Cliente' }, { key: 'km', label: 'Km', render: r => kmFmt(r.km) }, { key: 'fuel', label: 'Motor', render: r => escape(FUEL[r.fuel] || r.fuel) }, { key: 'expired', label: 'Docs', render: r => r.expired ? `<span class="badge badge-danger">${r.expired} vencido(s)</span>` : '<span class="badge badge-success">Al día</span>' }],
      onRow: r => customerSheet(r.customerId, ctx),
      csv: { name: 'vehiculos', map: r => ({ marca: r.brand, modelo: r.model, anio: r.year, patente: r.plate, cliente: r.owner, km: r.km, motor: r.fuel }) }
    });
    return smartTable(body, {
      rows: () => { const ws = db.all('workOrders'); return db.all('customers').map(c => { const o = ws.filter(w => w.customerId === c.id); return { ...c, cars: db.count('vehicles', v => v.customerId === c.id), spend: o.filter(w => w.status === 'entregada').reduce((a, w) => a + woTotal(w), 0), last: o.map(w => w.createdAt).sort().pop() || '' }; }); },
      filters: [{ key: 'tier', label: 'Membresía', options: [...db.all('tiers').map(t => [t.id, t.name]), ['none', 'Sin membresía']], test: (r, v) => v === 'none' ? !r.tier : r.tier === v }, { key: 'comuna', label: 'Comuna', options: Object.keys(COMUNAS) }],
      search: r => `${r.name} ${r.email} ${r.rut} ${r.phone}`,
      columns: [{ key: 'name', label: 'Cliente', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.email)}</small>` }, { key: 'tier', label: 'Membresía', render: r => r.tier ? `<span class="badge badge-primary">${escape(tierById(r.tier)?.name || r.tier)}</span>` : '<span class="muted">—</span>' },
        { key: 'comuna', label: 'Comuna' }, { key: 'cars', label: 'Autos' }, { key: 'spend', label: 'Facturado', render: r => money(r.spend) }, { key: 'last', label: 'Última visita', render: r => r.last ? date(r.last) : '—' }],
      onRow: r => customerSheet(r.id, ctx),
      csv: { name: 'clientes', map: r => ({ nombre: r.name, rut: r.rut, correo: r.email, telefono: r.phone, comuna: r.comuna, membresia: r.tier || '', autos: r.cars, facturado: r.spend }) }
    });
  }
};
