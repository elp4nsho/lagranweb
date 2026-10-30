// Facturas (empresas) o boletas (personas), con detalle imprimible y pago simulado.
import { db } from '../data/db.js';
import { html, raw, money, date, modal, toast, downloadCSV } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead, kpi } from '../shared/shell.js';
import { INVOICE_STATUS, badgeOf, SERVICE_LABEL } from '../shared/status.js';
import * as ops from '../shared/ops.js';

const periodLabel = p => { const [y, m] = p.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); };
export function invoiceLines(inv) {
  return db.query('shipments', s => s.customerId === inv.customerId && s.status !== 'cancelado' && s.createdAt.slice(0, 7) === inv.period)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
export const invoiceAmount = inv => inv.status === 'abierta' ? invoiceLines(inv).reduce((a, s) => a + s.price, 0) : inv.amount;

export function openInvoice(inv, { onPay } = {}) {
  const c = db.get('customers', inv.customerId);
  const lines = invoiceLines(inv);
  const total = invoiceAmount(inv), neto = Math.round(total / 1.19);
  const m = modal({ title: `${inv.type === 'factura' ? 'Factura' : 'Boleta'} ${inv.number}`, size: 'lg', body: html`<div class="invoice-doc printable">
    <div class="row between"><div><b>Rayo Express SpA</b><br><small class="muted">RUT 77.123.456-7 · Av. Providencia 1650 (ficticia)</small></div><div style="text-align:right">${raw(badgeOf(INVOICE_STATUS, inv.status))}<br><small class="muted">Emitida ${date(inv.issuedAt)} · vence ${date(inv.dueAt)}</small></div></div>
    <div><b>${c?.name}</b><br><small class="muted">${c?.rut || ''} · ${c?.email || ''}</small></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Código</th><th>Ruta</th><th>Servicio</th><th class="num">Monto</th></tr></thead><tbody>
      ${lines.slice(0, 200).map(s => raw(html`<tr><td>${date(s.createdAt)}</td><td class="mono">${s.code}</td><td>${s.sender.comuna} → ${s.receiver.comuna}</td><td>${SERVICE_LABEL[s.service]}</td><td class="num">${money(s.price)}</td></tr>`))}
    </tbody></table></div>
    <dl class="kv" style="justify-self:end"><dt>Neto</dt><dd class="num">${money(neto)}</dd><dt>IVA 19%</dt><dd class="num">${money(total - neto)}</dd></dl>
    <div class="total"><span>Total ${periodLabel(inv.period)} · ${lines.length} envíos</span><b>${money(total)}</b></div></div>`,
    foot: `<button class="btn btn-ghost" data-print>Imprimir</button>${onPay && ['pendiente', 'vencida'].includes(inv.status) ? '<button class="btn btn-primary" data-pay>Pagar ahora</button>' : ''}<button class="btn" data-close>Cerrar</button>` });
  m.el.querySelector('[data-print]').onclick = () => window.print();
  m.el.querySelector('[data-pay]')?.addEventListener('click', () => { m.close(); onPay(inv); });
}

export function payInvoice(inv, user) {
  const m = modal({ title: `Pagar ${inv.number}`, body: html`<form class="stack" id="payf"><p>Monto: <b>${money(invoiceAmount(inv))}</b></p>
    <div class="field"><label for="pc">Tarjeta</label><input class="input mono" id="pc" value="4242 4242 4242 4242"></div>
    <div class="grid-2"><div class="field"><label for="pe">Vence</label><input class="input" id="pe" value="12/29"></div><div class="field"><label for="pv">CVV</label><input class="input" id="pv" value="123"></div></div>
    <small class="muted">Pago simulado, no se realiza ningún cobro.</small></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Pagar</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    const b = m.el.querySelector('[data-ok]'); b.disabled = true; b.innerHTML = '<span class="spinner"></span> Procesando…';
    setTimeout(() => {
      db.update('invoices', inv.id, { status: 'pagada', paidAt: ops.nowIso() });
      invoiceLines(inv).forEach(s => { if (!s.paid) db.update('shipments', s.id, { paid: true }); });
      db.log('pago', `${inv.number} pagada (${money(invoiceAmount(inv))})`, user?.id);
      ops.feed(`Pago recibido: ${inv.number}`, 'success');
      m.close(); toast('Pago realizado con éxito', 'success');
    }, 900);
  };
}

export function mountFacturas(el, ctx) {
  const c = ctx.customer();
  const list = () => db.query('invoices', i => i.customerId === c.id).sort((a, b) => b.period.localeCompare(a.period)).map(i => ({ ...i, total: invoiceAmount(i) }));
  let sig = '';
  const draw = () => {
    const l = list();
    const ns = JSON.stringify(l.map(i => [i.id, i.status, i.total]));
    if (ns === sig) return;
    sig = ns;
    const due = l.filter(i => ['pendiente', 'vencida'].includes(i.status));
    el.innerHTML = html`${raw(pageHead(ctx.biz ? 'Facturas y pagos' : 'Boletas y pagos', ctx.biz ? 'Facturación mensual de tus envíos.' : 'Pagas cada envío con tarjeta; aquí está tu resumen mensual.', '<button class="btn" data-csv>⇩ CSV</button>'))}
    <div class="kpis">${raw(kpi('Saldo pendiente', money(due.reduce((a, i) => a + i.total, 0)), due.some(i => i.status === 'vencida') ? '<span class="delta down">Hay documentos vencidos</span>' : '<span class="delta up">Sin vencidos</span>'))}${raw(kpi('Mes en curso', money(l.find(i => i.status === 'abierta')?.total || 0)))}${raw(kpi('Pagado últimos 3 meses', money(l.filter(i => i.status === 'pagada').slice(0, 3).reduce((a, i) => a + i.total, 0))))}${ctx.biz ? raw(kpi('Línea de crédito', money(c.creditLimit || 0))) : ''}</div>
    <div data-t></div>`;
    dataTable(el.querySelector('[data-t]'), { rows: l, pageSize: 10, onRow: i => openInvoice(i, { onPay: x => payInvoice(x, ctx.user) }), columns: [
      { key: 'number', label: 'Documento', render: i => html`<b class="mono">${i.number}</b>` },
      { key: 'period', label: 'Periodo', render: i => periodLabel(i.period) },
      { key: 'count', label: 'Envíos', render: i => i.status === 'abierta' ? invoiceLines(i).length : i.count },
      { key: 'total', label: 'Monto', render: i => money(i.total) },
      { key: 'dueAt', label: 'Vence', render: i => date(i.dueAt) },
      { key: 'status', label: 'Estado', render: i => raw(badgeOf(INVOICE_STATUS, i.status)) },
      { key: 'id', label: '', sort: false, render: i => ['pendiente', 'vencida'].includes(i.status) ? raw(html`<button class="btn btn-sm btn-primary" data-pay="${i.id}">Pagar</button>`) : '' }
    ], empty: 'Aún no hay documentos emitidos' });
    el.querySelector('[data-csv]').onclick = () => downloadCSV('documentos-rayo.csv', l.map(i => ({ documento: i.number, periodo: i.period, envios: i.count, monto: i.total, estado: INVOICE_STATUS[i.status].label })));
  };
  el.addEventListener('click', e => { const b = e.target.closest('[data-pay]'); if (b) payInvoice(db.get('invoices', b.dataset.pay), ctx.user); });
  draw();
  return { refresh: draw };
}
