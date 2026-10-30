// Bodega: inventario de repuestos con alertas, solicitudes de mecánicos, órdenes de compra y proveedores.
import { escape, money, modal, toast, confirm, formModal, date, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { deliverPart, userName } from '../shared/domain.js';

const PO = { borrador: { label: 'Borrador', badge: '' }, enviada: { label: 'Enviada', badge: 'info' }, recibida: { label: 'Recibida', badge: 'success' }, cancelada: { label: 'Anulada', badge: 'danger' } };
let tab = 'inventario';
const CATS = () => [...new Set(db.all('parts').map(p => p.cat))].sort();

async function editPart(p, ctx) {
  const v = await formModal({ title: p ? p.name : 'Nuevo repuesto', fields: [
    { name: 'sku', label: 'SKU', required: true, value: p?.sku }, { name: 'name', label: 'Nombre', required: true, value: p?.name },
    { name: 'cat', label: 'Categoría', type: 'select', options: CATS(), value: p?.cat }, { name: 'supplierId', label: 'Proveedor', type: 'select', options: db.all('suppliers').map(s => [s.id, s.name]), value: p?.supplierId },
    { name: 'price', label: 'Precio venta', type: 'number', required: true, value: p?.price || 0 }, { name: 'cost', label: 'Costo', type: 'number', required: true, value: p?.cost || 0 },
    { name: 'stock', label: 'Stock', type: 'number', value: p?.stock || 0 }, { name: 'min', label: 'Mínimo', type: 'number', value: p?.min || 1 }, { name: 'location', label: 'Ubicación en bodega', value: p?.location || 'R1-A1' },
    { name: 'active', label: 'Activo', type: 'checkbox', value: p ? p.active !== false : true }] });
  if (!v) return;
  if (db.find('parts', x => x.sku === v.sku && x.id !== p?.id)) { toast('SKU duplicado', 'warning'); return; }
  if (p) { db.update('parts', p.id, v); db.log('bodega', `${v.name}: ${p.stock !== v.stock ? `ajuste de stock ${p.stock} → ${v.stock}` : 'ficha editada'}`, ctx.user.id); }
  else { db.insert('parts', v); db.log('bodega', `Repuesto creado: ${v.name}`, ctx.user.id); }
  toast('Repuesto guardado', 'success');
}
function newPO(ctx, preset = {}) {
  let lines = (preset.lines || []).map(l => ({ ...l }));
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<div class="field"><label for="po-s">Proveedor</label><select class="select" id="po-s" name="sup">${db.all('suppliers').map(s => `<option value="${s.id}" ${s.id === preset.supplierId ? 'selected' : ''}>${escape(s.name)} · ${escape(s.cat)}</option>`).join('')}</select></div><div data-lines></div><button type="button" class="btn btn-sm" data-add>+ Línea</button>`;
  const m = modal({ title: 'Nueva orden de compra', size: 'lg', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" data-save="borrador">Borrador</button><button class="btn btn-primary" data-save="enviada">Enviar</button>' });
  const prods = () => db.query('parts', p => p.supplierId === f.elements.sup.value);
  const paint = () => { f.querySelector('[data-lines]').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Repuesto</th><th>Cant.</th><th class="num">Costo</th><th></th></tr></thead><tbody>${lines.map((l, i) => `<tr><td><select class="select sm" data-l="${i}" aria-label="Repuesto">${prods().map(p => `<option value="${p.id}" ${p.id === l.partId ? 'selected' : ''}>${escape(p.name)} (stock ${p.stock})</option>`).join('')}</select></td><td><input class="input sm" type="number" min="1" data-q="${i}" value="${l.qty}" style="width:80px" aria-label="Cantidad"></td><td class="num">${money(l.qty * l.cost)}</td><td><button type="button" class="btn btn-sm btn-ghost" data-rm="${i}" aria-label="Quitar">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin líneas</td></tr>'}</tbody></table></div>`; };
  f.addEventListener('change', e => { if (e.target.name === 'sup') lines = []; const l = e.target.dataset.l, q = e.target.dataset.q; if (l) { lines[l].partId = e.target.value; lines[l].cost = db.get('parts', e.target.value).cost; } if (q) lines[q].qty = Math.max(1, +e.target.value || 1); paint(); });
  f.addEventListener('click', e => { if (e.target.closest('[data-add]')) { const p = prods()[0]; if (p) lines.push({ partId: p.id, qty: 2, cost: p.cost }); paint(); } const rm = e.target.closest('[data-rm]'); if (rm) { lines.splice(+rm.dataset.rm, 1); paint(); } });
  m.el.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { if (!lines.length) { toast('Agrega líneas', 'warning'); return; } const code = 'OC-' + (5120 + db.count('purchaseOrders')); db.insert('purchaseOrders', { code, supplierId: f.elements.sup.value, status: b.dataset.save, lines, total: lines.reduce((s, l) => s + l.qty * l.cost, 0), notes: '', receivedAt: '' }); db.log('compras', `${code} ${b.dataset.save}`, ctx.user.id); toast(`Orden ${code} guardada`, 'success'); m.close(); });
  paint();
}

export default {
  id: 'repuestos', label: 'Bodega y repuestos', icon: '📦', group: 'Bodega', roles: ['admin', 'jefe', 'bodega', 'asesor'], watch: ['parts', 'partRequests', 'purchaseOrders', 'suppliers'],
  render(el, ctx) {
    const low = db.query('parts', p => p.active !== false && p.stock < p.min);
    const pend = db.query('partRequests', r => r.status === 'solicitado');
    const T = [['inventario', 'Inventario'], ['solicitudes', `Solicitudes de mecánicos (${pend.length})`], ['compras', 'Órdenes de compra'], ['proveedores', 'Proveedores']];
    el.innerHTML = `${pageHead('Bodega y repuestos', `${db.count('parts')} repuestos · valor en bodega ${money(db.all('parts').reduce((s, p) => s + p.stock * p.cost, 0))}`, tab === 'inventario' ? '<button class="btn btn-sm" data-po-low>🧾 OC para stock bajo</button><button class="btn btn-primary btn-sm" data-new>+ Repuesto</button>' : tab === 'compras' ? '<button class="btn btn-primary btn-sm" data-po>+ Orden de compra</button>' : tab === 'proveedores' ? '<button class="btn btn-primary btn-sm" data-sup>+ Proveedor</button>' : '')}
      ${low.length && tab === 'inventario' ? `<p class="callout warn small">⚠️ ${low.length} repuestos bajo el mínimo: ${low.map(p => escape(p.name)).slice(0, 4).join(', ')}${low.length > 4 ? '…' : ''}</p>` : ''}${tabs(T, tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.querySelector('[data-new]')?.addEventListener('click', () => editPart(null, ctx));
    el.querySelector('[data-po]')?.addEventListener('click', () => newPO(ctx));
    el.querySelector('[data-po-low]')?.addEventListener('click', () => { if (!low.length) { toast('Nada bajo el mínimo', 'info'); return; } const sup = low[0].supplierId; newPO(ctx, { supplierId: sup, lines: low.filter(p => p.supplierId === sup).map(p => ({ partId: p.id, qty: p.min * 2 - p.stock, cost: p.cost })) }); });
    el.querySelector('[data-sup]')?.addEventListener('click', async () => { const v = await formModal({ title: 'Nuevo proveedor', fields: [{ name: 'name', label: 'Razón social', required: true }, { name: 'cat', label: 'Rubro' }, { name: 'contact', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' }, { name: 'days', label: 'Días de despacho', type: 'number', value: 2 }] }); if (v) { db.insert('suppliers', v); toast('Proveedor creado', 'success'); } });
    const box = el.querySelector('[data-list]');
    if (tab === 'solicitudes') {
      box.onclick = e => { const d = e.target.closest('[data-deliver]'); if (d) { if (deliverPart(d.dataset.deliver, ctx.user.id)) toast('Entregado y descontado del stock', 'success'); else toast('Stock insuficiente: genera una orden de compra', 'warning'); } };
      return smartTable(box, { rows: () => db.all('partRequests').map(r => ({ ...r, part: db.get('parts', r.partId), mech: userName(r.mechanicId) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), filters: [{ key: 'status', label: 'Estado', value: 'solicitado', options: [['solicitado', 'Pendientes'], ['entregado', 'Entregadas']] }], search: r => `${r.otCode} ${r.part?.name} ${r.mech}`,
        columns: [{ key: 'createdAt', label: 'Fecha', render: r => `<span class="nowrap">${dateTime(r.createdAt)}</span>` }, { key: 'otCode', label: 'OT', render: r => `<a href="#/ots/${r.otId}">${escape(r.otCode)}</a>` }, { key: 'mech', label: 'Mecánico' }, { key: 'partId', label: 'Repuesto', render: r => `<b>${r.qty}× ${escape(r.part?.name || '')}</b><small class="muted d-block">${escape(r.part?.location || '')} · stock ${r.part?.stock ?? 0}${r.note ? ' · ' + escape(r.note) : ''}</small>` }, { key: 'status', label: 'Estado', render: r => r.status === 'solicitado' ? `<button class="btn btn-sm btn-primary no-row" data-deliver="${r.id}">Entregar</button>` : '<span class="badge badge-success">Entregado</span>' }],
        csv: { name: 'solicitudes-bodega', map: r => ({ fecha: r.createdAt, ot: r.otCode, mecanico: r.mech, repuesto: r.part?.name, cantidad: r.qty, estado: r.status }) } });
    }
    if (tab === 'compras') return smartTable(box, { rows: () => db.all('purchaseOrders').map(p => ({ ...p, sup: db.get('suppliers', p.supplierId)?.name || '' })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), filters: [{ key: 'status', label: 'Estado', options: Object.entries(PO).map(([k, v]) => [k, v.label]) }], search: r => `${r.code} ${r.sup}`,
      columns: [{ key: 'code', label: 'OC', render: r => `<code>${escape(r.code)}</code>` }, { key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) }, { key: 'sup', label: 'Proveedor' }, { key: 'lines', label: 'Líneas', render: r => r.lines.length }, { key: 'total', label: 'Total', render: r => money(r.total) }, { key: 'status', label: 'Estado', render: r => badge(PO, r.status) }],
      onRow: r => { const m = modal({ title: `${r.code} · ${r.sup}`, body: `<div class="table-wrap"><table class="table"><tbody>${r.lines.map(l => `<tr><td>${escape(db.get('parts', l.partId)?.name || '')}</td><td>${l.qty}</td><td class="num">${money(l.qty * l.cost)}</td></tr>`).join('')}</tbody></table></div><div class="total-row"><span>Total</span><b>${money(r.total)}</b></div>`, foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${r.status === 'borrador' ? '<button class="btn" data-st="enviada">Enviar</button>' : ''}${r.status === 'enviada' ? '<button class="btn btn-primary" data-st="recibida">Recibir (suma stock)</button>' : ''}${['borrador', 'enviada'].includes(r.status) ? '<button class="btn btn-danger" data-st="cancelada">Anular</button>' : ''}` }); m.el.addEventListener('click', async e => { const s = e.target.closest('[data-st]')?.dataset.st; if (!s) return; if (s === 'cancelada' && !await confirm('¿Anular la orden?', { danger: true, ok: 'Anular' })) return; if (s === 'recibida') r.lines.forEach(l => db.update('parts', l.partId, p => ({ stock: p.stock + l.qty }))); db.update('purchaseOrders', r.id, { status: s, ...(s === 'recibida' ? { receivedAt: new Date().toISOString() } : {}) }); db.log('compras', `${r.code}: ${PO[s].label}`, ctx.user.id); toast(`Orden ${PO[s].label.toLowerCase()}`, 'success'); m.close(); }); },
      csv: { name: 'ordenes-compra', map: r => ({ oc: r.code, proveedor: r.sup, total: r.total, estado: r.status }) } });
    if (tab === 'proveedores') return smartTable(box, { rows: () => db.all('suppliers'), search: r => r.name, columns: [{ key: 'name', label: 'Proveedor', render: r => `<b>${escape(r.name)}</b>` }, { key: 'cat', label: 'Rubro' }, { key: 'contact', label: 'Correo' }, { key: 'phone', label: 'Teléfono' }, { key: 'days', label: 'Despacho', render: r => `${r.days} día(s)` }], csv: { name: 'proveedores', map: r => ({ proveedor: r.name, rubro: r.cat, correo: r.contact }) } });
    return smartTable(box, {
      rows: () => db.all('parts').map(p => ({ ...p, low: p.stock < p.min, reserved: db.query('partRequests', r => r.partId === p.id && r.status === 'solicitado').reduce((s, r) => s + r.qty, 0) })),
      filters: [{ key: 'cat', label: 'Categoría', options: CATS() }, { key: 'low', label: 'Alerta', options: [['true', 'Bajo mínimo']], test: (r, v) => String(r.low) === v }, { key: 'supplierId', label: 'Proveedor', options: db.all('suppliers').map(s => [s.id, s.name]) }],
      search: r => `${r.sku} ${r.name}`,
      columns: [{ key: 'name', label: 'Repuesto', render: r => `<b>${escape(r.name)}</b><small class="muted d-block"><code>${escape(r.sku)}</code> · ${escape(r.cat)} · ${escape(r.location)}</small>` }, { key: 'stock', label: 'Stock', render: r => `<span class="${r.low ? 'stock-low' : ''}">${r.stock}</span>${r.reserved ? ` <small class="muted">(${r.reserved} pedidos)</small>` : ''}` }, { key: 'min', label: 'Mín.' }, { key: 'cost', label: 'Costo', render: r => money(r.cost) }, { key: 'price', label: 'Venta', render: r => money(r.price) }, { key: 'margin', label: 'Margen', sort: false, render: r => `${Math.round((r.price - r.cost) / r.price * 100)}%` }],
      onRow: r => editPart(db.get('parts', r.id), ctx),
      csv: { name: 'repuestos', map: r => ({ sku: r.sku, repuesto: r.name, categoria: r.cat, stock: r.stock, minimo: r.min, costo: r.cost, precio: r.price, ubicacion: r.location }) }
    });
  }
};
