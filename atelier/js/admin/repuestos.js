// Repuestos OEM: inventario con stock mínimo y pedidos especiales importados con ETA.
import { escape, money, date, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { PART_ORDER_STATES } from '../data/catalog.js';
import { statusBadge, customerById } from '../shared/domain.js';
import { fmtDay, ymd, addDays } from '../shared/util.js';

async function editPart(p, ctx) {
  const v = await formModal({ title: p ? `Editar · ${p.name}` : 'Nuevo repuesto', fields: [
    { name: 'sku', label: 'Código OEM / SKU', required: true, value: p?.sku }, { name: 'name', label: 'Nombre', required: true, value: p?.name },
    { name: 'brand', label: 'Marca', required: true, value: p?.brand }, { name: 'compat', label: 'Compatibilidad', value: p?.compat },
    { name: 'stock', label: 'Stock', type: 'number', value: p?.stock ?? 0 }, { name: 'min', label: 'Stock mínimo', type: 'number', value: p?.min ?? 2 },
    { name: 'cost', label: 'Costo (CLP)', type: 'number', value: p?.cost ?? 0 }, { name: 'price', label: 'Precio venta (CLP)', type: 'number', value: p?.price ?? 0 },
    { name: 'location', label: 'Ubicación en bodega', value: p?.location }, { name: 'oem', label: 'Original de fábrica (OEM)', type: 'checkbox', value: p ? p.oem : true }] });
  if (!v) return;
  if (v.stock < 0 || v.min < 0) { toast('Stock inválido', 'warning'); return; }
  if (p) db.update('parts', p.id, v); else db.insert('parts', v);
  db.log('repuestos', `${p ? 'Repuesto editado' : 'Repuesto creado'}: ${v.name} (${v.sku})`, ctx.user.id); toast('Repuesto guardado', 'success');
}
async function adjust(p, ctx) {
  const v = await formModal({ title: `Ajustar stock · ${p.name}`, fields: [{ name: 'delta', label: `Cantidad a sumar (negativo para descontar). Stock actual: ${p.stock}`, type: 'number', required: true, value: 5 }, { name: 'reason', label: 'Motivo', type: 'select', options: ['Recepción de proveedor', 'Consumo en OT', 'Ajuste de inventario', 'Devolución'] }] });
  if (!v) return;
  db.update('parts', p.id, { stock: Math.max(0, p.stock + v.delta) }); db.log('repuestos', `${p.name}: ${v.delta > 0 ? '+' : ''}${v.delta} (${v.reason})`, ctx.user.id); toast('Stock actualizado', 'success');
}
async function editOrder(o, ctx) {
  const wos = db.query('workOrders', w => !['entregada', 'cancelada'].includes(w.status) || w.id === o?.woId);
  const v = await formModal({ title: o ? `Pedido · ${o.part}` : 'Nuevo pedido especial', fields: [
    { name: 'part', label: 'Repuesto', required: true, value: o?.part }, { name: 'sku', label: 'Código OEM', value: o?.sku }, { name: 'supplier', label: 'Proveedor', required: true, value: o?.supplier },
    { name: 'woId', label: 'Orden de trabajo', type: 'select', options: [['', 'Stock (sin OT)'], ...wos.map(w => [w.id, `${w.code} · ${customerById(w.customerId)?.name || ''}`])], value: o?.woId || '' },
    { name: 'status', label: 'Estado', type: 'select', options: Object.entries(PART_ORDER_STATES).map(([k, s]) => [k, s.label]), value: o?.status || 'solicitado' },
    { name: 'eta', label: 'ETA', type: 'date', required: true, value: o?.eta || ymd(addDays(new Date(), 14)) }, { name: 'cost', label: 'Costo (CLP)', type: 'number', value: o?.cost || 0 }, { name: 'price', label: 'Precio al cliente (CLP)', type: 'number', value: o?.price || 0 }, { name: 'tracking', label: 'Seguimiento courier', value: o?.tracking }] });
  if (!v) return;
  const w = v.woId && db.get('workOrders', v.woId);
  const data = { ...v, woId: v.woId || null, customerId: w?.customerId || null };
  if (o) db.update('specialOrders', o.id, data); else db.insert('specialOrders', { ...data, orderedAt: new Date().toISOString() });
  db.log('repuestos', `Pedido especial ${o ? 'actualizado' : 'creado'}: ${v.part} · ${PART_ORDER_STATES[v.status].label} · ETA ${v.eta}`, ctx.user.id); toast('Pedido guardado', 'success');
}

export default {
  id: 'repuestos', label: 'Repuestos OEM', icon: '📦', group: 'Taller', roles: ['admin', 'gerente', 'asesor'],
  watch: ['parts', 'specialOrders'],
  render(el, ctx) {
    const view = ctx.params.sub || 'inventario';
    const parts = db.all('parts'), so = db.all('specialOrders');
    const value = parts.reduce((a, p) => a + p.stock * p.cost, 0), low = parts.filter(p => p.stock <= p.min).length, transit = so.filter(o => ['solicitado', 'transito', 'aduana'].includes(o.status));
    el.innerHTML = `${pageHead('Repuestos OEM', 'Inventario de bodega y pedidos especiales importados')}
      <div class="kpi-grid">${kpi('Valor inventario (costo)', money(value))}${kpi('Bajo stock mínimo', String(low), low ? 'requieren reposición' : 'todo en orden', !low)}${kpi('Pedidos en camino', String(transit.length), transit.length ? `próximo ETA ${fmtDay(transit.map(o => o.eta).sort()[0])}` : '')}${kpi('Comprometido en pedidos', money(transit.reduce((a, o) => a + o.cost, 0)))}</div>
      <div class="tabs"><a class="tab ${view === 'inventario' ? 'active' : ''}" href="#/repuestos/inventario">Inventario</a><a class="tab ${view === 'pedidos' ? 'active' : ''}" href="#/repuestos/pedidos">Pedidos especiales</a></div><div data-t></div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-newp]')) editPart(null, ctx);
      if (e.target.closest('[data-newo]')) editOrder(null, ctx);
      const a = e.target.closest('[data-adj]'); if (a) adjust(db.get('parts', a.dataset.adj), ctx);
      const d = e.target.closest('[data-delp]'); if (d) { const p = db.get('parts', d.dataset.delp); if (await confirm(`¿Eliminar ${p.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('parts', p.id); db.log('repuestos', `Repuesto eliminado: ${p.name}`, ctx.user.id); } }
    });
    const t = el.querySelector('[data-t]');
    if (view === 'pedidos') return smartTable(t, {
      rows: () => db.all('specialOrders').map(o => { const w = o.woId && db.get('workOrders', o.woId); return { ...o, wo: w?.code || '', customer: customerById(o.customerId)?.name || '', late: !['recibido', 'instalado', 'cancelado'].includes(o.status) && o.eta < ymd() }; }).sort((a, b) => a.eta.localeCompare(b.eta)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(PART_ORDER_STATES).map(([k, s]) => [k, s.label]) }],
      search: r => `${r.part} ${r.sku} ${r.supplier} ${r.wo} ${r.customer}`,
      columns: [{ key: 'part', label: 'Repuesto', render: r => `<b>${escape(r.part)}</b><small class="muted d-block mono">${escape(r.sku || '')}</small>` }, { key: 'supplier', label: 'Proveedor' }, { key: 'wo', label: 'OT / cliente', render: r => r.wo ? `<span class="mono">${r.wo}</span><small class="muted d-block">${escape(r.customer)}</small>` : '<span class="muted">Stock</span>' },
        { key: 'orderedAt', label: 'Pedido', render: r => date(r.orderedAt) }, { key: 'eta', label: 'ETA', render: r => `${fmtDay(r.eta, { year: true })}${r.late ? ' <span class="badge badge-danger">Atrasado</span>' : ''}` }, { key: 'status', label: 'Estado', render: r => statusBadge(PART_ORDER_STATES, r.status) }, { key: 'cost', label: 'Costo', render: r => money(r.cost) }],
      onRow: r => editOrder(db.get('specialOrders', r.id), ctx),
      actions: '<button class="btn btn-sm btn-primary" data-newo>+ Pedido especial</button>',
      csv: { name: 'pedidos-especiales', map: r => ({ repuesto: r.part, sku: r.sku, proveedor: r.supplier, ot: r.wo, estado: PART_ORDER_STATES[r.status]?.label, eta: r.eta, costo: r.cost }) }
    });
    return smartTable(t, {
      rows: () => db.all('parts').map(p => ({ ...p, low: p.stock <= p.min, margin: p.price ? Math.round((1 - p.cost / p.price) * 100) : 0 })),
      filters: [{ key: 'brand', label: 'Marca', options: [...new Set(db.all('parts').map(p => p.brand))] }, { key: 'low', label: 'Stock', options: [['true', 'Bajo mínimo']], test: (r, v) => String(r.low) === v }],
      search: r => `${r.sku} ${r.name} ${r.brand} ${r.compat}`,
      columns: [{ key: 'name', label: 'Repuesto', render: r => `<b>${escape(r.name)}</b>${r.oem ? ' <span class="badge badge-info">OEM</span>' : ''}<small class="muted d-block mono">${escape(r.sku)}</small>` }, { key: 'brand', label: 'Marca' }, { key: 'compat', label: 'Compatibilidad' },
        { key: 'stock', label: 'Stock', render: r => `<b style="color:${r.low ? 'var(--danger)' : 'inherit'}">${r.stock}</b> <small class="muted">/ mín ${r.min}</small>` }, { key: 'price', label: 'Precio', render: r => money(r.price) }, { key: 'margin', label: 'Margen', render: r => r.margin + '%' }, { key: 'location', label: 'Ubic.' },
        { key: 'id', label: '', sort: false, render: r => `<span class="nowrap"><button class="btn btn-sm" data-adj="${r.id}">± Stock</button> <button class="btn btn-sm btn-ghost" data-delp="${r.id}" aria-label="Eliminar">🗑</button></span>` }],
      onRow: r => editPart(db.get('parts', r.id), ctx),
      actions: '<button class="btn btn-sm btn-primary" data-newp>+ Repuesto</button>',
      csv: { name: 'repuestos', map: r => ({ sku: r.sku, nombre: r.name, marca: r.brand, stock: r.stock, minimo: r.min, costo: r.cost, precio: r.price, ubicacion: r.location }) }
    });
  }
};
