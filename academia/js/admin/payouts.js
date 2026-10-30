// Pagos a instructores: liquidación del mes en curso, pendientes y pagados.
import { pageHead, table, person, badge, date, downloadCSV, toast, confirm, kpis, panel, escape } from '../shared/admin-kit.js';
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getUser, salesOf, instructorShare } from '../data/model.js';

export function renderPayouts(el, _p, ctx) {
  const now = new Date(), period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const insts = db.query('users', u => u.role === 'instructor');
  const accrued = insts.map(u => ({ u, amount: salesOf(u.id, from).reduce((t, s) => t + instructorShare(s.net), 0) })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);
  const rows = db.all('payouts').map(p => ({ ...p, _u: getUser(p.instructorId) })).filter(p => p._u).sort((a, b) => b.period.localeCompare(a.period));
  const pend = rows.filter(p => p.status === 'pendiente');
  el.innerHTML = pageHead('Pagos a instructores', 'Los instructores reciben el 70% de cada venta neta. Se liquida mensualmente.', `<button class="btn" data-csv>⬇ CSV</button>${pend.length ? `<button class="btn btn-primary" data-payall>Pagar ${pend.length} pendientes</button>` : ''}`) +
    kpis([{ label: 'Pendiente de pago', value: money(pend.reduce((t, p) => t + p.amount, 0)) }, { label: 'Pagado (histórico)', value: money(rows.filter(p => p.status === 'pagado').reduce((t, p) => t + p.amount, 0)) }, { label: `Acumulado ${period}`, value: money(accrued.reduce((t, x) => t + x.amount, 0)), hint: 'Se liquida al cierre del mes' }]) +
    panel(`Acumulado del mes en curso (${period})`, accrued.length ? `<ul class="ak-list">${accrued.map(x => `<li>${person(x.u, x.u.payoutMethod)}<span class="grow"></span><b>${money(x.amount)}</b></li>`).join('')}</ul>` : '<p class="muted">Sin ventas este mes.</p>') + '<div data-t></div>';
  const t = table(el.querySelector('[data-t]'), {
    key: 'payouts', rows, pageSize: 10,
    search: p => `${p._u.name} ${p.period}`,
    filters: [{ key: 'status', label: 'Estado', options: [['pendiente', 'Pendiente'], ['pagado', 'Pagado']] }, { key: 'instructorId', label: 'Instructor', options: insts.map(u => [u.id, u.name]) }],
    columns: [
      { key: 'period', label: 'Período' },
      { key: 'u', label: 'Instructor', value: p => p._u.name, render: p => person(p._u, p.method) },
      { key: 'amount', label: 'Monto', render: p => `<b>${money(p.amount)}</b>` },
      { key: 'status', label: 'Estado', render: p => badge(p.status === 'pagado' ? 'Pagado' : 'Pendiente', p.status === 'pagado' ? 'success' : 'warning') },
      { key: 'paidAt', label: 'Pagado el', render: p => p.paidAt ? date(p.paidAt) : '—' },
      { key: 'x', label: '', sort: false, align: 'right', render: p => p.status === 'pendiente' ? '<button class="btn btn-sm btn-primary" data-act="pay">Marcar pagado</button>' : '' }
    ]
  });
  const pay = p => { db.update('payouts', p.id, { status: 'pagado', paidAt: new Date().toISOString() }); db.insert('notifications', { userId: p.instructorId, title: 'Pago realizado', text: `Transferimos ${money(p.amount)} correspondiente a ${p.period}.`, kind: 'success', read: false, at: new Date().toISOString() }); db.log('pago a instructor', `${p._u.name} · ${p.period} · ${money(p.amount)}`, ctx.user.id); };
  el.querySelector('[data-t]').addEventListener('row-action', e => { pay(e.detail.row); toast('Pago registrado', 'success'); });
  el.querySelector('[data-payall]')?.addEventListener('click', async () => { if (!(await confirm(`Se registrarán ${pend.length} transferencias por ${money(pend.reduce((t, p) => t + p.amount, 0))}.`, { title: 'Pagar pendientes', ok: 'Pagar' }))) return; pend.forEach(pay); toast('Pagos registrados', 'success'); });
  el.querySelector('[data-csv]').onclick = () => { downloadCSV('pagos-instructores.csv', t.filtered().map(p => ({ periodo: p.period, instructor: p._u.name, metodo: p.method, monto: p.amount, estado: p.status, pagado: p.paidAt ? date(p.paidAt) : '' }))); toast('CSV exportado', 'success'); };
}
