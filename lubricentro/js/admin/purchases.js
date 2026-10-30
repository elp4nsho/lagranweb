// Órdenes de compra a proveedores: borrador → enviada → recibida (suma stock) / cancelada. Proveedores.
import { escape, money, modal, toast, confirm, formModal, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { branches, branchName } from '../shared/domain.js';
import { myBranch, branchOptions } from './common.js';

export const PO_STATES = { borrador: { label: 'Borrador', badge: '' }, enviada: { label: 'Enviada', badge: 'info' }, recibida: { label: 'Recibida', badge: 'success' }, cancelada: { label: 'Cancelada', badge: 'danger' } };
let tab = 'ordenes';

export function newPO(ctx, preset = {}, po = null) {
  let lines = (po?.lines || preset.lines || []).map(l => ({ ...l }));
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  const sup0 = po?.supplierId || preset.supplierId || db.all('suppliers')[0].id;
  f.innerHTML = `<div class="grid-2"><div class="field"><label for="po-s">Proveedor</label><select class="select" id="po-s" name="sup">${db.all('suppliers').map(s => `<option value="${s.id}" ${s.id === sup0 ? 'selected' : ''}>${escape(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="po-b">Sucursal destino</label><select class="select" id="po-b" name="branch">${branches(true).map(b => `<option value="${b.id}" ${b.id === (po?.branchId || preset.branchId || myBranch(ctx)) ? 'selected' : ''}>${escape(b.name)}</option>`).join('')}</select></div></div>
    <div data-lines></div><button type="button" class="btn btn-sm" data-add>+ Agregar línea</button>
    <div class="field"><label for="po-n">Notas</label><textarea class="textarea" id="po-n" name="notes">${escape(po?.notes || '')}</textarea></div>`;
  const m = modal({ title: po ? `Editar ${po.code}` : 'Nueva orden de compra', size: 'lg', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" data-save="borrador">Guardar borrador</button><button class="btn btn-primary" data-save="enviada">Enviar al proveedor</button>' });
  const prods = () => db.query('products', p => p.supplierId === f.elements.sup.value);
  const paint = () => {
    const ps = prods();
    f.querySelector('[data-lines]').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th><th></th></tr></thead><tbody>${lines.map((l, i) => `<tr><td><select class="select sm" data-l="${i}" data-k="productId" aria-label="Producto">${ps.map(p => `<option value="${p.id}" ${p.id === l.productId ? 'selected' : ''}>${escape(p.name)}</option>`).join('')}</select></td><td><input class="input sm" type="number" min="1" data-l="${i}" data-k="qty" value="${l.qty}" aria-label="Cantidad" style="width:90px"></td><td><input class="input sm" type="number" min="0" data-l="${i}" data-k="cost" value="${l.cost}" aria-label="Costo" style="width:110px"></td><td>${money(l.qty * l.cost)}</td><td><button type="button" class="btn btn-sm btn-ghost" data-rm="${i}" aria-label="Quitar">✕</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin líneas</td></tr>'}</tbody></table></div><div class="total-row"><span>Total neto</span><b>${money(lines.reduce((s, l) => s + l.qty * l.cost, 0))}</b></div>`;
  };
  f.addEventListener('change', e => {
    if (e.target.name === 'sup') { lines = []; paint(); return; }
    const t = e.target.closest('[data-l]'); if (!t) return;
    const l = lines[+t.dataset.l]; l[t.dataset.k] = t.dataset.k === 'productId' ? t.value : Math.max(0, +t.value || 0);
    if (t.dataset.k === 'productId') l.cost = db.get('products', t.value).cost;
    paint();
  });
  f.addEventListener('click', e => {
    if (e.target.closest('[data-add]')) { const p = prods().find(x => !lines.some(l => l.productId === x.id)) || prods()[0]; if (p) { lines.push({ productId: p.id, qty: 10, cost: p.cost }); paint(); } }
    const rm = e.target.closest('[data-rm]'); if (rm) { lines.splice(+rm.dataset.rm, 1); paint(); }
  });
  m.el.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    if (!lines.length || lines.some(l => !l.qty)) { toast('Agrega al menos una línea con cantidad', 'warning'); return; }
    const data = { supplierId: f.elements.sup.value, branchId: f.elements.branch.value, lines, total: lines.reduce((s, l) => s + l.qty * l.cost, 0), notes: f.elements.notes.value.trim(), status: b.dataset.save };
    let code = po?.code;
    if (po) db.update('purchaseOrders', po.id, data);
    else { code = 'OC-' + (3310 + db.count('purchaseOrders') + Math.floor(Math.random() * 9)); db.insert('purchaseOrders', { ...data, code, receivedAt: '' }); }
    db.log('compras', `${code} ${data.status === 'enviada' ? 'enviada a' : 'guardada para'} ${db.get('suppliers', data.supplierId).name}`, ctx.user.id);
    toast(`Orden ${code} ${data.status === 'enviada' ? 'enviada' : 'guardada'}`, 'success'); m.close();
  });
  paint();
}

function poDetail(id, ctx) {
  const po = db.get('purchaseOrders', id), sup = db.get('suppliers', po.supplierId);
  const m = modal({ title: `${po.code} · ${sup?.name}`, size: 'lg', body: `<div class="stack"><div class="row between">${badge(PO_STATES, po.status)}<small class="muted">Creada ${date(po.createdAt)} · destino ${escape(branchName(po.branchId))}${po.receivedAt ? ' · recibida ' + date(po.receivedAt) : ''}</small></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Cant.</th><th>Costo</th><th>Subtotal</th></tr></thead><tbody>${po.lines.map(l => { const p = db.get('products', l.productId); return `<tr><td>${escape(p?.name || '—')}</td><td>${l.qty} ${escape(p?.unit || '')}</td><td>${money(l.cost)}</td><td>${money(l.qty * l.cost)}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="total-row"><span>Total neto</span><b>${money(po.total)}</b></div>${po.notes ? `<p class="callout small">${escape(po.notes)}</p>` : ''}</div>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${po.status === 'borrador' ? '<button class="btn" data-edit>Editar</button><button class="btn btn-primary" data-st="enviada">Enviar</button>' : ''}${po.status === 'enviada' ? '<button class="btn btn-primary" data-st="recibida">Recibir mercadería</button>' : ''}${['borrador', 'enviada'].includes(po.status) ? '<button class="btn btn-danger" data-st="cancelada">Anular</button>' : ''}` });
  m.el.addEventListener('click', async e => {
    if (e.target.closest('[data-edit]')) { m.close(); newPO(ctx, {}, po); return; }
    const st = e.target.closest('[data-st]')?.dataset.st; if (!st) return;
    if (st === 'cancelada' && !await confirm(`¿Anular ${po.code}?`, { danger: true, ok: 'Anular' })) return;
    if (st === 'recibida') po.lines.forEach(l => db.update('products', l.productId, p => ({ stock: { ...p.stock, [po.branchId]: (p.stock[po.branchId] || 0) + l.qty } })));
    db.update('purchaseOrders', id, { status: st, ...(st === 'recibida' ? { receivedAt: new Date().toISOString() } : {}) });
    db.log('compras', `${po.code}: ${PO_STATES[st].label}${st === 'recibida' ? ' · stock sumado en ' + branchName(po.branchId) : ''}`, ctx.user.id);
    toast(st === 'recibida' ? 'Mercadería recibida: stock actualizado' : `Orden ${PO_STATES[st].label.toLowerCase()}`, 'success'); m.close();
  });
}

async function editSupplier(s, ctx) {
  const v = await formModal({ title: s ? s.name : 'Nuevo proveedor', fields: [{ name: 'name', label: 'Razón social', required: true, value: s?.name }, { name: 'cat', label: 'Rubro', value: s?.cat }, { name: 'contact', label: 'Correo de pedidos', type: 'email', required: true, value: s?.contact }, { name: 'phone', label: 'Teléfono', value: s?.phone }] });
  if (!v) return;
  s ? db.update('suppliers', s.id, v) : db.insert('suppliers', v);
  db.log('compras', `Proveedor ${s ? 'editado' : 'creado'}: ${v.name}`, ctx.user.id); toast('Proveedor guardado', 'success');
}

export default {
  id: 'compras', label: 'Compras', icon: '🧾', group: 'Catálogo', roles: ['admin', 'jefe'], watch: ['purchaseOrders', 'suppliers', 'products'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Compras y proveedores', 'Órdenes de compra por sucursal. Al recibir, el stock se suma automáticamente.', `<button class="btn btn-primary btn-sm" data-new>+ ${tab === 'ordenes' ? 'Orden de compra' : 'Proveedor'}</button>`)}${tabs([['ordenes', 'Órdenes de compra'], ['proveedores', 'Proveedores']], tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.querySelector('[data-new]').onclick = () => tab === 'ordenes' ? newPO(ctx) : editSupplier(null, ctx);
    const box = el.querySelector('[data-list]');
    if (tab === 'proveedores') return smartTable(box, { rows: () => db.all('suppliers').map(s => ({ ...s, n: db.count('purchaseOrders', p => p.supplierId === s.id) })), search: r => r.name, columns: [{ key: 'name', label: 'Proveedor', render: r => `<b>${escape(r.name)}</b>` }, { key: 'cat', label: 'Rubro' }, { key: 'contact', label: 'Correo' }, { key: 'phone', label: 'Teléfono' }, { key: 'n', label: 'Órdenes' }], onRow: r => editSupplier(db.get('suppliers', r.id), ctx), csv: { name: 'proveedores', map: r => ({ proveedor: r.name, rubro: r.cat, correo: r.contact, telefono: r.phone }) } });
    return smartTable(box, {
      rows: () => db.all('purchaseOrders').map(p => ({ ...p, sup: db.get('suppliers', p.supplierId)?.name || '—', branch: branchName(p.branchId) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(PO_STATES).map(([k, v]) => [k, v.label]) }, { key: 'branchId', label: 'Sucursal', value: myBranch(ctx), options: branchOptions() }],
      search: r => `${r.code} ${r.sup}`,
      columns: [{ key: 'code', label: 'OC', render: r => `<code>${escape(r.code)}</code>` }, { key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) }, { key: 'sup', label: 'Proveedor' }, { key: 'branch', label: 'Destino' }, { key: 'lines', label: 'Líneas', render: r => r.lines.length }, { key: 'total', label: 'Total', render: r => money(r.total) }, { key: 'status', label: 'Estado', render: r => badge(PO_STATES, r.status) }],
      onRow: r => poDetail(r.id, ctx),
      csv: { name: 'ordenes-compra', map: r => ({ oc: r.code, fecha: r.createdAt.slice(0, 10), proveedor: r.sup, sucursal: r.branch, total: r.total, estado: r.status }) }
    });
  }
};
