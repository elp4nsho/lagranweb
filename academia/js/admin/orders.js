// Pedidos y flujo de reembolsos.
import { pageHead, table, person, badge, html, escape, date, dateTime, downloadCSV, toast, formDialog, modal, kpis } from '../shared/admin-kit.js';
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getUser, ORDER, resolveRefund } from '../data/model.js';
import { moneyShort } from '../data/model.js';

export function renderOrders(el, _p, ctx) {
  const rows = db.all('orders').map(o => ({ ...o, _u: getUser(o.userId) })).filter(o => o._u).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const paid = rows.filter(o => o.status === 'pagado');
  el.innerHTML = pageHead('Pedidos y reembolsos', 'Historial de compras. Las solicitudes de reembolso requieren aprobación.', '<button class="btn" data-csv>⬇ CSV</button>') +
    kpis([{ label: 'Pedidos pagados', value: String(paid.length) }, { label: 'Ticket promedio', value: moneyShort(paid.reduce((t, o) => t + o.total, 0) / (paid.length || 1)) }, { label: 'Reembolsos solicitados', value: String(rows.filter(o => o.status === 'reembolso_solicitado').length) }, { label: 'Reembolsados', value: String(rows.filter(o => o.status === 'reembolsado').length) }]) + '<div data-t></div>';
  const t = table(el.querySelector('[data-t]'), {
    key: 'orders', rows, pageSize: 12,
    search: o => `${o.number} ${o._u.name} ${o._u.email} ${o.items.map(x => x.title).join(' ')} ${o.couponCode || ''}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(ORDER).map(([k, v]) => [k, v[0]]) }, { key: 'method', label: 'Medio', options: ['Tarjeta de crédito', 'Webpay', 'Transferencia', 'Gratis'] }, { key: 'cp', label: 'Cupón', options: [['1', 'Con cupón'], ['0', 'Sin cupón']], test: (o, v) => !!o.couponCode === (v === '1') }],
    columns: [
      { key: 'number', label: 'N°', render: o => `#${o.number}` },
      { key: 'createdAt', label: 'Fecha', render: o => date(o.createdAt) },
      { key: 'u', label: 'Cliente', value: o => o._u.name, render: o => person(o._u, o._u.email) },
      { key: 'items', label: 'Cursos', sort: false, render: o => o.items.map(x => escape(x.title)).join('<br>') },
      { key: 'total', label: 'Total', render: o => html`<b>${money(o.total)}</b>${o.couponCode ? raw2(`<br><small class="muted">${escape(o.couponCode)} −${money(o.discount)}</small>`) : ''}` },
      { key: 'status', label: 'Estado', render: o => badge(ORDER[o.status][0], ORDER[o.status][1]) },
      { key: 'x', label: '', sort: false, align: 'right', render: o => o.status === 'reembolso_solicitado' ? '<button class="btn btn-sm btn-primary" data-act="refund">Resolver</button>' : o.status === 'pagado' && o.total > 0 ? '<button class="btn btn-sm btn-ghost" data-act="manual">Reembolsar</button>' : '' }
    ],
    onRow: o => modal({ title: `Pedido #${o.number}`, body: `<dl class="ak-dl"><dt>Cliente</dt><dd>${escape(o._u.name)} · ${escape(o._u.email)}</dd><dt>Fecha</dt><dd>${dateTime(o.createdAt)}</dd><dt>Medio</dt><dd>${escape(o.method)}</dd><dt>Cursos</dt><dd>${o.items.map(x => `${escape(x.title)} — ${money(x.price)}`).join('<br>')}</dd><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd><dt>Descuento</dt><dd>${o.discount ? `${money(o.discount)} (${escape(o.couponCode)})` : '—'}</dd><dt>Total</dt><dd><b>${money(o.total)}</b></dd><dt>Estado</dt><dd>${ORDER[o.status][0]}</dd>${o.refundReason ? `<dt>Motivo reembolso</dt><dd>${escape(o.refundReason)}</dd>` : ''}</dl>` })
  });
  el.querySelector('[data-t]').addEventListener('row-action', async e => {
    const o = e.detail.row;
    const v = await formDialog({ title: `${e.detail.action === 'refund' ? 'Solicitud de reembolso' : 'Reembolso manual'} · #${o.number}`, intro: `${escape(o._u.name)} · ${money(o.total)}${o.refundReason ? `<br>Motivo: <b>${escape(o.refundReason)}</b>` : ''}`, submit: 'Confirmar', fields: [{ name: 'decision', label: 'Decisión', type: 'select', options: e.detail.action === 'refund' ? [['ok', 'Aprobar reembolso (quita el acceso)'], ['no', 'Rechazar solicitud']] : [['ok', 'Reembolsar y quitar acceso']] }, { name: 'note', label: 'Nota para el cliente', type: 'textarea' }] });
    if (!v) return;
    resolveRefund(o.id, v.decision === 'ok', ctx.user.id, v.note);
    toast(v.decision === 'ok' ? 'Reembolso aprobado' : 'Solicitud rechazada', 'success');
  });
  el.querySelector('[data-csv]').onclick = () => { const l = t.filtered(); if (!l.length) return toast('No hay pedidos con esos filtros', 'warning'); downloadCSV('pedidos.csv', l.map(o => ({ numero: o.number, fecha: date(o.createdAt), cliente: o._u.name, correo: o._u.email, cursos: o.items.map(x => x.title).join(' | '), subtotal: o.subtotal, descuento: o.discount, cupon: o.couponCode || '', total: o.total, medio: o.method, estado: ORDER[o.status][0] }))); toast(`${l.length} pedidos exportados`, 'success'); };
}
const raw2 = s => ({ __raw: true, value: s });
