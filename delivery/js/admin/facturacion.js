// Facturación: documentos emitidos, cobranza, pagos y emisión del periodo.
import { db } from '../data/db.js';
import { html, raw, money, toast, date, downloadCSV, confirm } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead, kpi } from '../shared/shell.js';
import { INVOICE_STATUS, badgeOf } from '../shared/status.js';
import { openInvoice, invoiceAmount, invoiceLines } from '../cliente/facturas.js';
import * as ops from '../shared/ops.js';

export function mountFacturacion(el, ctx) {
  let f = 'todos';
  const custs = () => Object.fromEntries(db.all('customers').map(c => [c.id, c]));
  const all = () => { const cs = custs(); return db.all('invoices').map(i => ({ ...i, total: invoiceAmount(i), cust: cs[i.customerId]?.name || '—' })).sort((a, b) => b.period.localeCompare(a.period) || a.cust.localeCompare(b.cust)); };
  el.innerHTML = html`${raw(pageHead('Facturación', 'Facturas mensuales de empresas y boletas de personas.', '<button class="btn" data-csv>⇩ CSV</button>'))}
    <div class="kpis" data-k></div>
    <div class="chips" data-chips>${[['todos', 'Todos'], ['abierta', 'En curso'], ['pendiente', 'Pendientes'], ['vencida', 'Vencidas'], ['pagada', 'Pagadas']].map(([k, l]) => raw(html`<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`))}</div><div data-t></div>`;
  const rows = () => all().filter(i => f === 'todos' || i.status === f);
  const kp = () => {
    const a = all(), m0 = new Date(ops.simNow()); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    el.querySelector('[data-k]').innerHTML = kpi('Por cobrar', money(a.filter(i => i.status === 'pendiente').reduce((s, i) => s + i.total, 0))) + kpi('Vencido', money(a.filter(i => i.status === 'vencida').reduce((s, i) => s + i.total, 0)), '<span class="delta down">Requiere gestión</span>') + kpi('Facturación en curso', money(a.filter(i => i.status === 'abierta').reduce((s, i) => s + i.total, 0))) + kpi('Cobrado este mes', money(a.filter(i => i.paidAt && Date.parse(i.paidAt) >= m0.getTime()).reduce((s, i) => s + i.total, 0)));
  };
  const edit = ctx.can('facturas.edit');
  const table = dataTable(el.querySelector('[data-t]'), {
    rows: rows(), pageSize: 15, search: i => `${i.number} ${i.cust} ${i.period}`, onRow: i => openInvoice(db.get('invoices', i.id)),
    columns: [
      { key: 'number', label: 'Documento', render: i => html`<b class="mono">${i.number}</b><br><small class="muted">${i.type}</small>` },
      { key: 'cust', label: 'Cliente' },
      { key: 'period', label: 'Periodo' },
      { key: 'total', label: 'Monto', render: i => money(i.total) },
      { key: 'dueAt', label: 'Vence', render: i => date(i.dueAt) },
      { key: 'status', label: 'Estado', render: i => raw(badgeOf(INVOICE_STATUS, i.status)) },
      { key: 'id', label: 'Acciones', sort: false, render: i => !edit ? '' : raw(html`<span class="actions">${i.status === 'abierta' ? raw(html`<button class="btn btn-sm" data-emit="${i.id}">Emitir</button>`) : ''}${['pendiente', 'vencida'].includes(i.status) ? raw(html`<button class="btn btn-sm btn-primary" data-paid="${i.id}">Marcar pagada</button><button class="btn btn-sm btn-ghost" data-remind="${i.id}" title="Enviar recordatorio">✉</button>`) : ''}</span>`) }
    ]
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-emit],[data-paid],[data-remind]'); if (!b) return;
    const i = db.get('invoices', b.dataset.emit || b.dataset.paid || b.dataset.remind);
    const c = db.get('customers', i.customerId);
    if (b.dataset.emit && await confirm(`¿Emitir ${i.number} por ${money(invoiceAmount(i))}? Se cierra el periodo para ${c?.name}.`, { ok: 'Emitir' })) {
      db.update('invoices', i.id, { status: 'pendiente', amount: invoiceAmount(i), count: invoiceLines(i).length, issuedAt: ops.nowIso(), dueAt: new Date(ops.simNow() + 30 * 864e5).toISOString() });
      db.log('facturación', `Emitida ${i.number} a ${c?.name}`, ctx.user.id); toast('Factura emitida', 'success');
    }
    if (b.dataset.paid) { db.update('invoices', i.id, { status: 'pagada', paidAt: ops.nowIso() }); invoiceLines(i).forEach(s => !s.paid && db.update('shipments', s.id, { paid: true })); db.log('pago', `${i.number} marcada pagada`, ctx.user.id); toast('Pago registrado', 'success'); }
    if (b.dataset.remind) { db.log('cobranza', `Recordatorio enviado a ${c?.email} por ${i.number}`, ctx.user.id); toast(`Recordatorio enviado a ${c?.email} (simulado)`, 'success'); }
  });
  el.querySelector('[data-chips]').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); table.update(rows()); };
  el.querySelector('[data-csv]').onclick = () => downloadCSV('facturacion-rayo.csv', rows().map(i => ({ documento: i.number, tipo: i.type, cliente: i.cust, periodo: i.period, monto: i.total, vence: date(i.dueAt), estado: INVOICE_STATUS[i.status].label })));
  kp();
  let sig = '';
  return { refresh() { const n = JSON.stringify(db.all('invoices').map(i => i.status)) + db.count('shipments'); if (n === sig) return; sig = n; table.update(rows()); kp(); } };
}
