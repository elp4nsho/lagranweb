// Órdenes de compra: borrador → enviada → recepción (parcial/total) que suma stock en la sucursal.
import { html, raw, money, date, dateTime, toast, modal, confirm, formModal } from '../../../assets/core/ui.js';
import { db, auth, canEdit, branchName, userName, stockAt, applyMove, PO_STATUS, badge } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log } from '../shared/common.js';

export function render(el) {
  const rows = db.all('purchaseOrders').map(p => ({ ...p, sname: db.get('suppliers', p.supplierId)?.name || '—', bname: branchName(p.branchId), items: p.lines.reduce((s, l) => s + l.qty, 0) }));
  const open = rows.filter(r => ['enviada', 'parcial'].includes(r.status));
  el.innerHTML = html`${raw(pageHead('Órdenes de compra', 'Pide a proveedores y recibe la mercadería directo en el stock de cada sucursal.', `<button class="btn" data-csv>⬇ CSV</button>${canEdit('purchases') ? '<button class="btn btn-primary" data-new>+ Nueva orden</button>' : ''}`))}
    <div class="kpis">
      <div class="card stat"><span class="label">Por recibir</span><span class="value">${open.length}</span><span class="small muted">${money(open.reduce((s, r) => s + r.total, 0))}</span></div>
      <div class="card stat"><span class="label">Borradores</span><span class="value">${rows.filter(r => r.status === 'borrador').length}</span></div>
      <div class="card stat"><span class="label">Compras 30 días</span><span class="value">${money(rows.filter(r => r.status !== 'cancelada' && Date.now() - new Date(r.createdAt) < 30 * 864e5).reduce((s, r) => s + r.total, 0))}</span></div>
      <div class="card stat"><span class="label">Proveedores activos</span><span class="value">${db.count('suppliers', s => s.active !== false)}</span></div>
    </div><div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'po', rows, search: r => `${r.number} ${r.sname} ${r.bname}`, defaultSort: { key: 'createdAt', dir: -1 }, onRow: r => { location.hash = `#/compras/${r.id}`; },
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(PO_STATUS).map(([k, v]) => [k, v[0]]) }, { key: 'branchId', label: 'Sucursal', options: db.all('branches').map(b => [b.id, b.name]) }, { key: 'supplierId', label: 'Proveedor', options: db.all('suppliers').map(s => [s.id, s.name]) }],
    columns: [
      { key: 'number', label: 'OC', render: r => `<b>#${r.number}</b>` },
      { key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) },
      { key: 'sname', label: 'Proveedor' }, { key: 'bname', label: 'Sucursal' },
      { key: 'items', label: 'Unidades' },
      { key: 'total', label: 'Total neto', render: r => `<b>${money(r.total)}</b>` },
      { key: 'expectedAt', label: 'Entrega', render: r => r.expectedAt ? date(r.expectedAt + 'T12:00:00') : '—' },
      { key: 'status', label: 'Estado', render: r => badge(PO_STATUS, r.status) }
    ]
  });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) poForm();
    if (e.target.closest('[data-csv]')) exportCSV('ordenes-compra', t.filtered().map(r => ({ oc: r.number, fecha: r.createdAt.slice(0, 10), proveedor: r.sname, sucursal: r.bname, unidades: r.items, total: r.total, estado: r.status })));
  });
}

export function poForm(po = null) {
  const sups = db.query('suppliers', s => s.active !== false || s.id === po?.supplierId);
  const u = auth.current();
  const editing = !!(po && po.id);
  const d = po ? JSON.parse(JSON.stringify(po)) : { supplierId: sups[0]?.id, branchId: u.branchId || 'b1', lines: [], notes: '' };
  const form = document.createElement('form');
  form.className = 'stack';
  form.noValidate = true;
  const prodsFor = sid => db.query('products', p => p.trackStock && (!sid || p.supplierId === sid));
  const draw = () => {
    const prods = prodsFor(d.supplierId);
    if (!d.lines.length && prods[0]) d.lines.push({ productId: prods[0].id, qty: 12, cost: prods[0].cost });
    form.innerHTML = html`<div class="form-grid">
        <div class="field"><label for="po-sup">Proveedor</label><select class="select" id="po-sup" data-k="supplierId">${sups.map(s => raw(html`<option value="${s.id}" ${s.id === d.supplierId ? 'selected' : ''}>${s.name}</option>`))}</select></div>
        <div class="field"><label for="po-br">Sucursal de destino</label><select class="select" id="po-br" data-k="branchId">${db.query('branches', b => b.active).map(b => raw(html`<option value="${b.id}" ${b.id === d.branchId ? 'selected' : ''}>${b.name}</option>`))}</select></div>
      </div>
      <div class="lines-editor">${d.lines.map((l, i) => { const p = db.get('products', l.productId); return raw(html`<div class="le">
        <select class="select" data-l="${i}" data-f="productId" aria-label="Producto">${prods.map(x => raw(html`<option value="${x.id}" ${x.id === l.productId ? 'selected' : ''}>${x.emoji} ${x.name} (stock ${stockAt(x, d.branchId)})</option>`))}</select>
        <input class="input" type="number" min="1" value="${l.qty}" data-l="${i}" data-f="qty" aria-label="Cantidad">
        <input class="input cost" type="number" min="0" value="${l.cost}" data-l="${i}" data-f="cost" aria-label="Costo unitario" title="Costo unitario ${p ? '(actual ' + money(p.cost) + ')' : ''}">
        <button type="button" class="btn btn-sm btn-ghost btn-icon" data-rml="${i}" aria-label="Quitar línea">✕</button></div>`); })}</div>
      <div class="row between"><button type="button" class="btn btn-sm" data-addl ${prods.length ? '' : 'disabled'}>+ Agregar línea</button><b>Total neto: ${money(d.lines.reduce((s, l) => s + l.qty * l.cost, 0))}</b></div>
      ${!prods.length ? raw('<p class="small muted" style="margin:0">Este proveedor no tiene productos asociados.</p>') : ''}
      <div class="field"><label for="po-notes">Notas</label><input class="input" id="po-notes" data-k="notes" value="${d.notes || ''}"></div>`;
  };
  draw();
  form.addEventListener('change', e => {
    const k = e.target.dataset.k, i = e.target.dataset.l;
    if (k) { d[k] = e.target.value; if (k === 'supplierId') d.lines = []; if (k !== 'notes') draw(); }
    if (i !== undefined) {
      const f = e.target.dataset.f;
      d.lines[i][f] = f === 'productId' ? e.target.value : Math.max(0, Math.round(+e.target.value));
      if (f === 'productId') d.lines[i].cost = db.get('products', e.target.value).cost;
      draw();
    }
  });
  form.addEventListener('click', e => {
    if (e.target.closest('[data-addl]')) { const p = prodsFor(d.supplierId).find(x => !d.lines.some(l => l.productId === x.id)) || prodsFor(d.supplierId)[0]; d.lines.push({ productId: p.id, qty: 12, cost: p.cost }); draw(); }
    const rm = e.target.closest('[data-rml]');
    if (rm) { d.lines.splice(+rm.dataset.rml, 1); draw(); }
  });
  const m = modal({ title: editing ? `Editar OC #${po.number}` : 'Nueva orden de compra', size: 'lg', body: form, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" data-save="borrador">Guardar borrador</button><button class="btn btn-primary" data-save="enviada">Guardar y enviar</button>' });
  m.el.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    d.notes = form.querySelector('#po-notes').value;
    const lines = d.lines.filter(l => l.qty > 0);
    if (!lines.length) return toast('Agrega al menos una línea con cantidad', 'warning');
    const sup = db.get('suppliers', d.supplierId);
    const data = { supplierId: d.supplierId, branchId: d.branchId, notes: d.notes, lines: lines.map(l => ({ productId: l.productId, name: db.get('products', l.productId).name, qty: l.qty, cost: l.cost, received: 0 })), total: lines.reduce((s, l) => s + l.qty * l.cost, 0), status: b.dataset.save, sentAt: b.dataset.save === 'enviada' ? new Date().toISOString() : '', expectedAt: new Date(Date.now() + (sup.leadDays || 3) * 864e5).toISOString().slice(0, 10) };
    let row;
    if (editing) { db.update('purchaseOrders', po.id, data); row = db.get('purchaseOrders', po.id); }
    else { const n = db.getValue('poSeq', 3300); db.setValue('poSeq', n + 1); row = db.insert('purchaseOrders', { ...data, number: n, userId: auth.current().id, receivedAt: '' }); }
    log('compra', `${editing ? 'Editó' : 'Creó'} OC #${row.number} a ${sup.name} (${money(row.total)})${row.status === 'enviada' ? ' y la envió' : ''}`);
    toast(row.status === 'enviada' ? `OC #${row.number} enviada a ${sup.name}` : 'Borrador guardado', 'success');
    m.close();
    location.hash = `#/compras/${row.id}`;
  });
}

function receive(po) {
  const body = document.createElement('form');
  body.className = 'stack';
  body.innerHTML = html`<p class="muted" style="margin:0">Ingresa lo que llegó realmente. Lo recibido se suma al stock de <b>${branchName(po.branchId)}</b>.</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th class="right">Pedido</th><th class="right">Ya recibido</th><th>Recibir ahora</th></tr></thead><tbody>
    ${po.lines.map((l, i) => raw(html`<tr><td>${l.name}</td><td class="right">${l.qty}</td><td class="right">${l.received}</td><td><input class="input" type="number" min="0" max="${l.qty - l.received}" value="${l.qty - l.received}" data-r="${i}" style="max-width:100px" aria-label="Recibir ${l.name}"></td></tr>`))}
    </tbody></table></div>`;
  const m = modal({ title: `Recepción OC #${po.number}`, size: 'lg', body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Confirmar recepción</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    const u = auth.current();
    const lines = po.lines.map(l => ({ ...l }));
    let n = 0;
    body.querySelectorAll('[data-r]').forEach(inp => {
      const l = lines[+inp.dataset.r];
      const q = Math.max(0, Math.min(l.qty - l.received, Math.round(+inp.value || 0)));
      if (q) { applyMove({ type: 'entrada', productId: l.productId, branchId: po.branchId, qty: q, note: `Recepción OC #${po.number}` }, u); l.received += q; n += q; }
    });
    if (!n) return toast('No ingresaste cantidades', 'warning');
    const done = lines.every(l => l.received >= l.qty);
    db.update('purchaseOrders', po.id, { lines, status: done ? 'recibida' : 'parcial', receivedAt: new Date().toISOString() });
    log('compra', `Recibió ${n} unidades de la OC #${po.number}${done ? ' (completa)' : ' (parcial)'}`);
    toast(`${n} unidades ingresadas al stock`, 'success');
    m.close();
  };
}

export function detail(el, { id }) {
  const po = db.get('purchaseOrders', id);
  if (!po) { el.innerHTML = '<div class="empty card"><h2>Orden no encontrada</h2><a class="btn" href="#/compras">Volver</a></div>'; return; }
  const sup = db.get('suppliers', po.supplierId) || {};
  const ed = canEdit('purchases');
  const neto = po.total, iva = Math.round(neto * .19);
  el.innerHTML = html`<a class="small no-print" href="#/compras">← Órdenes de compra</a>
    ${raw(pageHead(`OC #${po.number}`, `${sup.name} → ${branchName(po.branchId)} · creada ${dateTime(po.createdAt)} por ${userName(po.userId)}`, `${badge(PO_STATUS, po.status)}<button class="btn no-print" data-print>🖨 Imprimir</button>`))}
    ${ed ? raw(html`<div class="row no-print">
      ${po.status === 'borrador' ? raw('<button class="btn" data-edit>Editar</button><button class="btn btn-primary" data-send>Enviar al proveedor</button>') : ''}
      ${['enviada', 'parcial'].includes(po.status) ? raw('<button class="btn btn-primary" data-receive>📦 Registrar recepción</button>') : ''}
      ${['borrador', 'enviada'].includes(po.status) ? raw('<button class="btn btn-danger" data-cancel>Cancelar orden</button>') : ''}
      <button class="btn btn-ghost" data-dup>Duplicar</button></div>`) : ''}
    <article class="doc">
      <div class="row between" style="align-items:flex-start;border-bottom:2px solid var(--text);padding-bottom:12px;margin-bottom:12px">
        <div><b>Comercial Pampa SpA</b><br><small>RUT 77.123.456-7 · Despachar a: ${branchName(po.branchId)}, ${db.get('branches', po.branchId)?.address}</small></div>
        <div class="right"><b>ORDEN DE COMPRA N° ${po.number}</b><br><small>Entrega estimada: ${po.expectedAt ? date(po.expectedAt + 'T12:00:00') : '—'}</small></div>
      </div>
      <dl class="kv" style="margin-bottom:14px"><dt>Proveedor</dt><dd>${sup.name} · RUT ${sup.rut}</dd><dt>Contacto</dt><dd>${sup.contact} · ${sup.email} · ${sup.phone}</dd><dt>Condición</dt><dd>${sup.paymentTerms}</dd>${po.notes ? raw(html`<dt>Notas</dt><dd>${po.notes}</dd>`) : ''}</dl>
      <table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Recibido</th><th class="num">Costo</th><th class="num">Subtotal</th></tr></thead><tbody>
        ${po.lines.map(l => raw(html`<tr><td>${l.name}</td><td class="num">${l.qty}</td><td class="num">${l.received}${l.received < l.qty && po.status !== 'borrador' ? raw(' <span class="badge badge-warning plain">pend.</span>') : ''}</td><td class="num">${money(l.cost)}</td><td class="num">${money(l.cost * l.qty)}</td></tr>`))}
      </tbody><tfoot><tr><td colspan="4" class="num">Neto</td><td class="num">${money(neto)}</td></tr><tr><td colspan="4" class="num">IVA 19%</td><td class="num">${money(iva)}</td></tr><tr><td colspan="4" class="num"><b>Total</b></td><td class="num"><b>${money(neto + iva)}</b></td></tr></tfoot></table>
    </article>`;
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-print]')) window.print();
    if (e.target.closest('[data-edit]')) poForm(po);
    if (e.target.closest('[data-send]')) { db.update('purchaseOrders', po.id, { status: 'enviada', sentAt: new Date().toISOString() }); log('compra', `Envió OC #${po.number} a ${sup.name}`); toast(`OC enviada a ${sup.email}`, 'success'); }
    if (e.target.closest('[data-receive]')) receive(po);
    if (e.target.closest('[data-cancel]')) { const v = await formModal({ title: `Cancelar OC #${po.number}`, submit: 'Cancelar orden', fields: [{ name: 'reason', label: 'Motivo', value: 'Proveedor sin stock', required: true }] }); if (v) { db.update('purchaseOrders', po.id, { status: 'cancelada', notes: v.reason }); log('compra', `Canceló OC #${po.number}: ${v.reason}`); toast('Orden cancelada', 'info'); } }
    if (e.target.closest('[data-dup]')) poForm({ ...po, id: null, number: null, lines: po.lines.map(l => ({ ...l, received: 0 }))  });
  });
}
