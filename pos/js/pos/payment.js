// Cobro con pagos divididos: efectivo (con vuelto), tarjeta, transferencia y canje de puntos.
import { html, raw, money, toast, modal, escape } from '../../../assets/core/ui.js';
import { api } from '../../../assets/core/db.js';
import { db, auth, settings, commitSale, METHODS, METHOD_ICON, itemName } from '../data/db.js';
import { cart } from './cart.js';
import { queue } from './queue.js';
import { receiptHtml, printModal } from '../shared/receipt.js';

export function openPayment(ctx) {
  if (cart.isEmpty()) return toast('La venta está vacía', 'warning');
  const t = cart.totals();
  const cust = cart.customer();
  const loyalty = settings().loyalty || {};
  const payments = [];
  let method = 'efectivo';
  const paid = () => payments.reduce((s, p) => s + p.amount, 0);
  const remaining = () => Math.max(0, t.total - paid());
  const change = () => Math.max(0, paid() - t.total);

  const body = document.createElement('div');
  const m = modal({ title: `Cobrar ${money(t.total)}`, size: 'lg', body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary btn-lg" data-confirm disabled>Confirmar venta</button>' });
  const confirmBtn = m.el.querySelector('[data-confirm]');

  function draw() {
    const rem = remaining();
    const canPoints = cust && loyalty.enabled && cust.points >= (loyalty.minRedeem || 0) && !payments.some(p => p.method === 'puntos') && rem > 0;
    const quick = [...new Set([rem, Math.ceil(rem / 1000) * 1000, Math.ceil(rem / 5000) * 5000, Math.ceil(rem / 10000) * 10000, 20000].filter(v => v >= rem && v > 0))].slice(0, 5);
    body.innerHTML = html`<div class="pay-grid">
      <div class="stack" style="gap:12px">
        <div class="due-box">${rem > 0 ? raw(html`<small class="muted">Por pagar</small><span class="big-num">${money(rem)}</span>`) : raw(html`<small class="muted">${change() ? 'Vuelto a entregar' : 'Pagado completo'}</small><span class="big-num change">${money(change())}</span>`)}</div>
        <div class="method-btns" role="group" aria-label="Medio de pago">${['efectivo', 'tarjeta', 'transferencia'].map(k => raw(`<button type="button" class="btn" data-method="${k}" aria-pressed="${method === k}">${METHOD_ICON[k]} ${METHODS[k]}</button>`))}</div>
        <form class="stack" style="gap:8px" data-addpay>
          <div class="field"><label for="pay-amt">Monto recibido en ${METHODS[method].toLowerCase()}</label><input class="input" id="pay-amt" type="number" min="0" step="10" value="${rem || ''}" ${rem ? '' : 'disabled'} style="font-size:20px;font-weight:700"></div>
          ${method === 'efectivo' && rem ? raw(html`<div class="quick">${quick.map(v => raw(`<button type="button" class="btn btn-sm" data-quick="${v}">${v === rem ? 'Exacto' : money(v)}</button>`))}</div>`) : ''}
          ${method === 'tarjeta' && rem ? raw('<small class="muted">Se simula la aprobación en el terminal de pago (POS bancario).</small>') : ''}
          ${method === 'transferencia' && rem ? raw('<small class="muted">Verifica el comprobante en la app del cliente antes de confirmar.</small>') : ''}
          <button class="btn" ${rem ? '' : 'disabled'}>+ Agregar pago</button>
        </form>
        ${cust ? raw(html`<div class="card" style="box-shadow:none;padding:12px"><div class="row between"><span>⭐ <b>${cust.name.split(' ')[0]}</b> tiene <b>${cust.points}</b> puntos (${money(cust.points * (loyalty.pointValue || 1))})</span>${canPoints ? raw('<button type="button" class="btn btn-sm btn-accent" data-points>Canjear</button>') : ''}</div>${!canPoints && cust.points < (loyalty.minRedeem || 0) ? raw(html`<small class="muted">Canje mínimo: ${loyalty.minRedeem} puntos.</small>`) : ''}</div>`) : ''}
      </div>
      <div class="stack" style="gap:10px">
        <b>Pagos</b>
        <div class="pay-list">${payments.length ? payments.map((p, i) => raw(html`<div class="pl"><span>${METHOD_ICON[p.method]} ${METHODS[p.method]}${p.tendered ? raw(html` <small class="muted">(recibido ${money(p.tendered)})</small>`) : ''}</span><span class="row" style="gap:6px"><b>${money(p.amount)}</b><button type="button" class="btn btn-sm btn-ghost btn-icon" data-rm="${i}" aria-label="Quitar pago">✕</button></span></div>`)) : raw('<p class="muted small" style="margin:0">Agrega uno o más pagos. Puedes dividir entre medios.</p>')}</div>
        <hr style="margin:4px 0">
        <div class="sum-row"><span>Subtotal</span><span>${money(t.gross)}</span></div>
        ${t.discount ? raw(html`<div class="sum-row"><span>Descuentos</span><span class="pos-up">−${money(t.discount)}</span></div>`) : ''}
        <div class="sum-row"><span>IVA incluido</span><span>${money(t.iva)}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
        <small class="muted">${cart.lines.length} línea(s) · ${t.units} unidad(es)${cust ? ` · gana ${Math.floor((t.total - (payments.find(p => p.method === 'puntos')?.amount || 0)) / (loyalty.pesosPerPoint || 100))} puntos` : ''}</small>
        ${queue.offline ? raw('<div class="badge badge-warning" style="white-space:normal">Sin conexión: la venta quedará en cola y se sincronizará después.</div>') : ''}
      </div>
    </div>`;
    confirmBtn.disabled = remaining() > 0;
    setTimeout(() => body.querySelector('#pay-amt:not([disabled])')?.select(), 20);
  }

  function addPayment(amount) {
    const rem = remaining();
    amount = Math.round(+amount || 0);
    if (amount <= 0) return toast('Ingresa un monto válido', 'warning');
    if (method !== 'efectivo' && amount > rem) return toast(`${METHODS[method]} no puede superar lo pendiente (${money(rem)})`, 'warning');
    if (method === 'efectivo') {
      const applied = Math.min(amount, rem);
      const ex = payments.find(p => p.method === 'efectivo');
      if (ex) { ex.amount += applied; ex.tendered = (ex.tendered || 0) + amount; }
      else payments.push({ method: 'efectivo', amount: applied, tendered: amount });
      if (amount > rem) payments.find(p => p.method === 'efectivo').change = amount - rem;
    } else payments.push({ method, amount });
    draw();
  }

  body.addEventListener('click', e => {
    const mb = e.target.closest('[data-method]');
    if (mb) { method = mb.dataset.method; draw(); }
    const q = e.target.closest('[data-quick]');
    if (q) addPayment(q.dataset.quick);
    const rm = e.target.closest('[data-rm]');
    if (rm) { payments.splice(+rm.dataset.rm, 1); draw(); }
    if (e.target.closest('[data-points]')) {
      const max = Math.min(cust.points * (loyalty.pointValue || 1), remaining());
      const pts = Math.floor(max / (loyalty.pointValue || 1) / 10) * 10;
      payments.unshift({ method: 'puntos', amount: pts * (loyalty.pointValue || 1), points: pts });
      draw();
    }
  });
  body.addEventListener('submit', e => { e.preventDefault(); addPayment(body.querySelector('#pay-amt').value); });

  confirmBtn.addEventListener('click', async () => {
    if (remaining() > 0) return;
    confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="spinner"></span> Procesando…';
    const cashChange = payments.find(p => p.method === 'efectivo')?.change || 0;
    const pointsUsed = payments.find(p => p.method === 'puntos')?.points || 0;
    const u = auth.current();
    const items = cart.lines.map(l => ({ productId: l.productId, name: l.name, price: l.price, cost: l.cost, qty: l.qty, discount: l.discount || 0 }));
    // El descuento general se prorratea en las líneas para que la boleta cuadre.
    const od = cart.state.discount || 0;
    if (od) items.forEach(i => { i.discount = Math.round((1 - (1 - i.discount / 100) * (1 - od / 100)) * 1000) / 10; });
    const sale = {
      branchId: ctx.branchId, registerId: ctx.registerId, shiftId: ctx.shiftId(), cashierId: u.id, customerId: cust?.id || null,
      items, subtotal: t.gross, discount: t.discount, total: t.total,
      payments: payments.map(p => ({ method: p.method, amount: p.amount })), change: cashChange,
      pointsUsed, pointsEarned: cust ? Math.floor((t.total - (pointsUsed * (loyalty.pointValue || 1))) / (loyalty.pesosPerPoint || 100)) : 0,
      createdAt: new Date().toISOString()
    };
    let row, pending = false;
    if (queue.offline) { pending = true; row = { ...sale, id: 'q' + Date.now().toString(36), status: 'completada' }; queue.add(row); }
    else row = await api(() => commitSale(sale), { latency: [250, 500] });
    cart.clear();
    m.close();
    showReceipt(row, { pending, fresh: true });
  });
  draw();
}

export function showReceipt(sale, { pending = false, fresh = false } = {}) {
  const m = modal({
    title: fresh ? '✓ Venta registrada' : `Boleta N° ${sale.number}`,
    body: `${fresh && sale.change ? `<div class="due-box" style="margin-bottom:12px"><small class="muted">Vuelto</small><span class="big-num change">${money(sale.change)}</span></div>` : ''}${receiptHtml(sale, { pending })}`,
    foot: `<button class="btn" data-print>🖨 Imprimir</button><button class="btn btn-primary" data-close>${fresh ? 'Nueva venta' : 'Cerrar'}</button>`
  });
  m.el.querySelector('[data-print]').onclick = printModal;
  if (fresh) toast(pending ? 'Venta guardada en cola (sin conexión)' : `Boleta N° ${sale.number} emitida`, pending ? 'warning' : 'success');
}
