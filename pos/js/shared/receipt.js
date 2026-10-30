// Boleta electrónica (vista imprimible) y reporte de cierre de caja.
import { html, raw, money, dateTime } from '../../../assets/core/ui.js';
import { db, settings, branch, register, userName, METHODS, itemName, tierOf } from '../data/db.js';

export function receiptHtml(sale, { pending = false } = {}) {
  const s = settings();
  const b = branch(sale.branchId) || {};
  const cust = sale.customerId ? db.get('customers', sale.customerId) : null;
  const neto = Math.round(sale.total / (1 + (s.iva || 19) / 100));
  return html`<div class="receipt" id="receipt">
    <h4>${s.businessName}</h4>
    <div class="c">${s.legalName} · RUT ${s.rut}<br>${s.giro}<br>${b.address}, ${b.comuna}</div>
    <div class="stamp">BOLETA ELECTRÓNICA<br>N° ${String(sale.number || 'PENDIENTE').padStart(8, '0')}</div>
    <hr><div>${dateTime(sale.createdAt)}<br>${b.name} · ${register(sale.registerId)?.name || ''}<br>Cajero/a: ${userName(sale.cashierId)}</div><hr>
    ${sale.items.map(i => raw(html`<div>${itemName(i)}</div><div class="r"><span>${i.qty} × ${money(i.price)}${i.discount ? ` (-${i.discount}%)` : ''}</span><span>${money(Math.round(i.price * i.qty * (1 - (i.discount || 0) / 100)))}</span></div>`))}
    <hr>
    ${sale.discount ? raw(html`<div class="r"><span>Descuentos</span><span>-${money(sale.discount)}</span></div>`) : ''}
    <div class="r"><span>Neto</span><span>${money(neto)}</span></div>
    <div class="r"><span>IVA ${s.iva || 19}%</span><span>${money(sale.total - neto)}</span></div>
    <div class="r t"><span>TOTAL</span><span>${money(sale.total)}</span></div><hr>
    ${sale.payments.map(p => raw(html`<div class="r"><span>${METHODS[p.method]}</span><span>${money(p.amount + (p.method === 'efectivo' ? sale.change || 0 : 0))}</span></div>`))}
    ${sale.change ? raw(html`<div class="r"><span>Vuelto</span><span>${money(sale.change)}</span></div>`) : ''}
    ${cust ? raw(html`<hr><div>Cliente: ${cust.name}<br>RUT ${cust.rut} · ${tierOf(cust)}</div><div class="r"><span>Puntos ganados</span><span>+${sale.pointsEarned || 0}</span></div>${sale.pointsUsed ? raw(html`<div class="r"><span>Puntos canjeados</span><span>-${sale.pointsUsed}</span></div>`) : ''}<div class="r"><span>Saldo de puntos</span><span>${cust.points + (pending ? (sale.pointsEarned || 0) - (sale.pointsUsed || 0) : 0)}</span></div>`) : ''}
    ${sale.status === 'anulada' ? raw('<div class="stamp">ANULADA</div>') : ''}
    ${pending ? raw('<div class="stamp">PENDIENTE DE SINCRONIZAR</div>') : ''}
    <hr><div class="c">${s.receiptFooter}<br>Timbre electrónico SII (demo)</div>
  </div>`;
}

export function shiftReportHtml(shift, sum) {
  const b = branch(shift.branchId) || {};
  return html`<div class="receipt">
    <h4>CIERRE DE CAJA</h4>
    <div class="c">${b.name} · ${register(shift.registerId)?.name || ''}<br>${userName(shift.userId)}</div><hr>
    <div class="r"><span>Apertura</span><span>${dateTime(shift.openedAt)}</span></div>
    ${shift.closedAt ? raw(html`<div class="r"><span>Cierre</span><span>${dateTime(shift.closedAt)}</span></div>`) : ''}
    <hr><div class="r"><span>Ventas</span><span>${sum.count}</span></div><div class="r"><span>Anuladas</span><span>${sum.voided}</span></div>
    <div class="r t"><span>Total vendido</span><span>${money(sum.total)}</span></div><hr>
    ${Object.entries(sum.by).map(([k, v]) => raw(html`<div class="r"><span>${METHODS[k]}</span><span>${money(v)}</span></div>`))}
    <hr><div class="r"><span>Fondo inicial</span><span>${money(shift.openingCash)}</span></div>
    <div class="r"><span>+ Efectivo ventas</span><span>${money(sum.by.efectivo)}</span></div>
    ${sum.deposits ? raw(html`<div class="r"><span>+ Ingresos</span><span>${money(sum.deposits)}</span></div>`) : ''}
    ${sum.withdrawals ? raw(html`<div class="r"><span>− Retiros</span><span>${money(sum.withdrawals)}</span></div>`) : ''}
    <div class="r t"><span>Esperado</span><span>${money(shift.expectedCash ?? sum.expected)}</span></div>
    ${shift.countedCash != null ? raw(html`<div class="r t"><span>Contado</span><span>${money(shift.countedCash)}</span></div><div class="r t"><span>Diferencia</span><span>${shift.difference > 0 ? '+' : ''}${money(shift.difference)}</span></div>`) : ''}
    ${shift.notes ? raw(html`<hr><div>Obs.: ${shift.notes}</div>`) : ''}
  </div>`;
}

// Imprime solo el modal abierto.
export function printModal() {
  document.body.classList.add('printing-modal');
  window.print();
  setTimeout(() => document.body.classList.remove('printing-modal'), 500);
}
