// Pedidos: listado con filtros, detalle con flujo de estados, reembolsos, notas y boleta imprimible.
import { html, raw, money, date, dateTime, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db, auth, settings, ORDER_STATUS, ORDER_FLOW, statusBadge, nextStatus, setOrderStatus, restockOrder, colorHex } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { pageHead, smartTable, exportCSV, log, me } from './common.js';

const DAY = 864e5;
const manager = () => ['admin', 'manager'].includes(me().role);
const NEXT_LABEL = { pagado: 'Confirmar pago', preparando: 'Empezar a preparar', enviado: 'Marcar como enviado', entregado: 'Marcar como entregado' };

export function render(el, _p, query = {}) {
  const rows = db.all('orders').map(o => ({ ...o, cname: o.customer.name, units: o.items.reduce((s, i) => s + i.qty, 0) }));
  const counts = Object.fromEntries(Object.keys(ORDER_STATUS).map(k => [k, rows.filter(o => o.status === k).length]));
  el.innerHTML = html`${raw(pageHead('Pedidos', `${rows.length} pedidos en total`, '<button class="btn" data-csv>⬇ Exportar CSV</button>'))}
    <div class="chips">${['pendiente', 'pagado', 'preparando', 'enviado'].map(k => raw(`<a class="chip" href="#/pedidos?estado=${k}">${ORDER_STATUS[k].label} <b>${counts[k]}</b></a>`))}</div>
    <div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'orders' + (query.estado ? '-' + query.estado : ''), rows, pageSize: 15, search: o => `${o.number} ${o.cname} ${o.customer.email} ${o.tracking} ${o.couponCode}`,
    defaultSort: { key: 'createdAt', dir: -1 },
    filters: [
      { key: 'status', label: 'Estado', options: Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label]) },
      { key: 'payment', label: 'Pago', options: [['tarjeta', 'Tarjeta'], ['transferencia', 'Transferencia']] },
      { key: 'shippingId', label: 'Despacho', options: (settings().shipping?.rates || []).map(r => [r.id, r.name]) },
      { key: 'period', label: 'Periodo', options: [['1', 'Hoy'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días']], test: (o, v) => Date.now() - new Date(o.createdAt).getTime() < +v * DAY }
    ],
    onRow: o => { location.hash = `#/pedidos/${o.id}`; },
    columns: [
      { key: 'number', label: 'Pedido', render: o => `<b>#${o.number}</b>` },
      { key: 'createdAt', label: 'Fecha', render: o => `${date(o.createdAt)}<br><small class="muted">${ago(o.createdAt)}</small>` },
      { key: 'cname', label: 'Cliente', render: o => html`${o.cname}<br><small class="muted">${o.customer.email}</small>` },
      { key: 'units', label: 'Unid.' },
      { key: 'total', label: 'Total', render: o => `<b>${money(o.total)}</b>${o.refunded ? `<br><small class="tag-sale">−${money(o.refunded)}</small>` : ''}` },
      { key: 'payment', label: 'Pago', render: o => o.payment === 'tarjeta' ? '💳 Tarjeta' : '🏦 Transf.' },
      { key: 'status', label: 'Estado', render: o => statusBadge(o.status) },
      { key: 'act', label: '', sort: false, class: 'actions', render: o => { const n = nextStatus(o.status); return n && canMove(o.status, n) ? `<button class="btn btn-sm" data-next="${o.id}" title="${NEXT_LABEL[n]}">→ ${ORDER_STATUS[n].label}</button>` : ''; } }
    ]
  });
  if (query.estado) { const sel = el.querySelector('[data-f="status"]'); if (sel && sel.value !== query.estado) { sel.value = query.estado; sel.dispatchEvent(new Event('change')); } }
  el.addEventListener('click', e => {
    const n = e.target.closest('[data-next]');
    if (n) { const o = db.get('orders', n.dataset.next); const s = nextStatus(o.status); setOrderStatus(o, s); toast(`Pedido #${o.number}: ${ORDER_STATUS[s].label}`, 'success'); }
    if (e.target.closest('[data-csv]')) exportCSV('pedidos', t.filtered().map(o => ({ numero: o.number, fecha: o.createdAt.slice(0, 10), cliente: o.cname, email: o.customer.email, unidades: o.units, subtotal: o.subtotal, descuento: o.discount, envio: o.shipping, total: o.total, reembolsado: o.refunded || 0, pago: o.payment, estado: o.status, cupon: o.couponCode })));
  });
}

// Bodega solo mueve pedidos en preparación/envío; confirmar pagos es de gestión.
function canMove(from, to) {
  if (manager()) return true;
  return me().role === 'warehouse' && ['preparando', 'enviado', 'entregado'].includes(to) && from !== 'pendiente';
}

export function detail(el, { id }) {
  const o = db.get('orders', id);
  if (!o) { el.innerHTML = '<div class="empty card"><h2>Pedido no encontrado</h2><a class="btn" href="#/pedidos">Volver</a></div>'; return; }
  const n = nextStatus(o.status);
  const cust = o.userId ? db.get('users', o.userId) : null;
  const closed = ['cancelado', 'reembolsado'].includes(o.status);
  const idx = ORDER_FLOW.indexOf(o.status);
  el.innerHTML = html`<a class="small no-print" href="#/pedidos">← Pedidos</a>
    ${raw(pageHead(`Pedido #${o.number}`, `${dateTime(o.createdAt)} · ${o.payment === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}`, `${statusBadge(o.status)}<a class="btn" href="#/pedidos/${o.id}/boleta">🖨 Boleta</a>`))}
    <div class="card no-print"><div class="row between">
      <div class="track-bar grow" style="min-width:240px">${['Pagado', 'Preparando', 'Enviado', 'Entregado'].map((l, i) => raw(`<span class="${i <= idx ? 'on' : ''}">${l}</span>`))}</div>
      <div class="row" style="gap:8px">
        ${n && canMove(o.status, n) ? raw(html`<button class="btn btn-primary" data-next>${NEXT_LABEL[n]}</button>`) : ''}
        ${manager() && ['pendiente', 'pagado', 'preparando'].includes(o.status) ? raw('<button class="btn btn-danger" data-cancel>Cancelar pedido</button>') : ''}
        ${manager() && !['pendiente', 'cancelado', 'reembolsado'].includes(o.status) && (o.refunded || 0) < o.total ? raw('<button class="btn" data-refund>Reembolsar</button>') : ''}
      </div>
    </div></div>
    <div class="detail-grid">
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Productos</h3></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Variante</th><th class="right">Precio</th><th class="right">Cant.</th><th class="right">Total</th></tr></thead><tbody>
          ${o.items.map(i => { const p = db.get('products', i.productId); return raw(html`<tr><td><div class="cell-prod">${p ? raw(`<span class="mini-thumb">${productArt(p, colorHex(p, i.color))}</span>`) : ''}<span>${p ? raw(html`<a href="#/productos/${p.id}"><b>${i.name}</b></a>`) : raw(html`<b>${i.name}</b>`)}<small class="mono">${i.sku}</small></span></div></td><td>${i.color} · ${i.size}</td><td class="right">${money(i.price)}</td><td class="right">${i.qty}</td><td class="right"><b>${money(i.price * i.qty)}</b></td></tr>`); })}
          </tbody></table></div>
          <div class="stack" style="gap:6px;margin:14px 0 0 auto;max-width:320px">
            <div class="sum-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
            ${o.discount ? raw(html`<div class="sum-row"><span>Descuento (${o.couponCode})</span><span class="tag-sale">−${money(o.discount)}</span></div>`) : ''}
            <div class="sum-row"><span>${o.shippingMethod}</span><span>${o.shipping ? money(o.shipping) : 'Gratis'}</span></div>
            <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
            ${o.refunded ? raw(html`<div class="sum-row"><span>Reembolsado</span><span class="tag-sale">−${money(o.refunded)}</span></div>`) : ''}
          </div>
        </div>
        <div class="card"><div class="card-head"><h3>Historial</h3></div>
          <ol class="timeline">${o.history.slice().reverse().map(h => raw(html`<li class="${['cancelado', 'reembolsado'].includes(h.status) ? 'bad' : 'done'}"><span class="pin"></span><b>${ORDER_STATUS[h.status]?.label || h.status}</b><small>${dateTime(h.at)}${h.note ? ' · ' + h.note : ''}${h.by ? ' · ' + h.by : ''}</small></li>`))}</ol>
        </div>
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Cliente</h3>${cust ? raw(html`<a class="small" href="#/clientes/${cust.id}">Ver ficha</a>`) : raw('<span class="badge plain">Invitado</span>')}</div>
          <dl class="kv"><dt>Nombre</dt><dd>${o.customer.name}</dd><dt>Correo</dt><dd>${o.customer.email}</dd><dt>Teléfono</dt><dd>${o.customer.phone || '—'}</dd>${cust ? raw(html`<dt>Pedidos</dt><dd>${db.count('orders', x => x.userId === cust.id)}</dd>`) : ''}</dl></div>
        <div class="card"><div class="card-head"><h3>Despacho</h3>${!closed ? raw('<button class="btn btn-sm btn-ghost" data-track>Editar seguimiento</button>') : ''}</div>
          <dl class="kv"><dt>Método</dt><dd>${o.shippingMethod}</dd><dt>Dirección</dt><dd>${o.address ? `${o.address.street}, ${o.address.comuna}, ${o.address.region}` : 'Retiro en tienda'}</dd><dt>Seguimiento</dt><dd class="mono">${o.tracking || '—'}</dd></dl></div>
        <div class="card"><div class="card-head"><h3>Notas internas</h3><button class="btn btn-sm" data-note>+ Nota</button></div>
          ${(o.notes || []).length ? raw(`<ul class="list-plain">${o.notes.map(nt => html`<li style="display:block"><p style="margin:0">${nt.text}</p><small class="muted">${nt.by} · ${ago(nt.at)}</small></li>`).join('')}</ul>`) : raw('<p class="muted small" style="margin:0">Sin notas.</p>')}</div>
      </div>
    </div>`;

  el.addEventListener('click', async e => {
    if (e.target.closest('[data-next]')) { setOrderStatus(o, n); toast(`Pedido #${o.number}: ${ORDER_STATUS[n].label}`, 'success'); }
    if (e.target.closest('[data-cancel]')) {
      const v = await formModal({ title: `Cancelar pedido #${o.number}`, submit: 'Cancelar pedido', fields: [{ name: 'reason', label: 'Motivo', value: 'Solicitud del cliente', required: true }, { name: 'restock', label: 'Devolver unidades al inventario', type: 'checkbox', value: true }] });
      if (!v) return;
      if (v.restock) restockOrder(o);
      setOrderStatus(o, 'cancelado', { note: v.reason });
      toast('Pedido cancelado', 'info');
    }
    if (e.target.closest('[data-refund]')) {
      const max = o.total - (o.refunded || 0);
      const v = await formModal({ title: `Reembolso · pedido #${o.number}`, submit: 'Emitir reembolso', fields: [
        { name: 'amount', label: `Monto a reembolsar (máx. ${money(max)})`, type: 'number', value: max, required: true },
        { name: 'reason', label: 'Motivo', value: 'Devolución por talla', required: true },
        { name: 'restock', label: 'Reingresar productos al inventario', type: 'checkbox', value: true }
      ] });
      if (!v) return;
      const amt = Math.min(max, Math.max(0, Math.round(v.amount)));
      if (!amt) return toast('Monto inválido', 'warning');
      const refunded = (o.refunded || 0) + amt;
      db.update('orders', o.id, { refunded });
      if (v.restock) restockOrder(o);
      if (refunded >= o.total) setOrderStatus(db.get('orders', o.id), 'reembolsado', { note: `${v.reason} · ${money(amt)}` });
      else { db.update('orders', o.id, x => ({ notes: [...(x.notes || []), { text: `Reembolso parcial de ${money(amt)}: ${v.reason}`, by: me().name, at: new Date().toISOString() }] })); log('reembolso', `Reembolso parcial #${o.number} por ${money(amt)}`); }
      toast(`Reembolso de ${money(amt)} emitido`, 'success');
    }
    if (e.target.closest('[data-note]')) {
      const v = await formModal({ title: 'Nueva nota interna', fields: [{ name: 'text', label: 'Nota', type: 'textarea', required: true }] });
      if (!v) return;
      db.update('orders', o.id, x => ({ notes: [...(x.notes || []), { text: v.text, by: me().name, at: new Date().toISOString() }] }));
      log('pedido', `Nota en #${o.number}`);
    }
    if (e.target.closest('[data-track]')) {
      const v = await formModal({ title: 'Número de seguimiento', fields: [{ name: 'tracking', label: 'Código courier (Starken)', value: o.tracking || '' }] });
      if (!v) return;
      db.update('orders', o.id, { tracking: v.tracking.trim() });
      log('pedido', `Seguimiento #${o.number}: ${v.tracking}`);
      toast('Seguimiento actualizado', 'success');
    }
  });
}

export function invoice(el, { id }) {
  const o = db.get('orders', id);
  const s = settings();
  if (!o) { el.innerHTML = '<div class="empty card"><h2>Pedido no encontrado</h2></div>'; return; }
  const neto = Math.round(o.total / 1.19);
  el.innerHTML = html`<div class="row between no-print"><a class="small" href="#/pedidos/${o.id}">← Volver al pedido</a><button class="btn btn-primary" data-print>🖨 Imprimir</button></div>
    <article class="invoice">
      <div class="inv-head"><div><h2 style="margin:0">${s.storeName} SpA</h2><small>RUT 76.543.210-K · Venta de vestuario<br>${s.address}<br>${s.contactEmail} · ${s.phone}</small></div>
        <div class="right" style="border:2px solid currentColor;padding:10px 16px"><b>BOLETA ELECTRÓNICA</b><br>N° ${String(o.number).padStart(8, '0')}<br><small>${date(o.createdAt)}</small></div></div>
      <dl class="kv" style="margin-bottom:16px"><dt>Cliente</dt><dd>${o.customer.name} · ${o.customer.email}</dd><dt>Despacho</dt><dd>${o.shippingMethod}${o.address ? ` · ${o.address.street}, ${o.address.comuna}` : ''}</dd><dt>Pago</dt><dd>${o.payment === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}</dd></dl>
      <table><thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Total</th></tr></thead><tbody>
        ${o.items.map(i => raw(html`<tr><td>${i.name} — ${i.color}, talla ${i.size}<br><small class="mono">${i.sku}</small></td><td class="num">${i.qty}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.qty * i.price)}</td></tr>`))}
        ${o.discount ? raw(html`<tr><td>Descuento ${o.couponCode}</td><td></td><td></td><td class="num">−${money(o.discount)}</td></tr>`) : ''}
        <tr><td>${o.shippingMethod}</td><td></td><td></td><td class="num">${money(o.shipping)}</td></tr>
      </tbody><tfoot><tr><td colspan="3" class="num">Neto</td><td class="num">${money(neto)}</td></tr><tr><td colspan="3" class="num">IVA 19%</td><td class="num">${money(o.total - neto)}</td></tr><tr><td colspan="3" class="num"><b>Total</b></td><td class="num"><b>${money(o.total)}</b></td></tr></tfoot></table>
      <p class="small muted" style="margin-top:20px">Documento de demostración sin validez tributaria. Cambios y devoluciones dentro de 30 días presentando esta boleta.</p>
    </article>`;
  el.querySelector('[data-print]').onclick = () => window.print();
}
