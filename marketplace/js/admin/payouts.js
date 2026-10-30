// Pagos a freelancers: solicitudes de retiro (aprobar/pagar o rechazar) e historial.
import { escape, money, date, toast, formModal, downloadCSV, confirm as ask } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, statCard, avatar } from '../shared/kit.js';
import { user, balanceOf } from '../shared/market.js';

const W = { solicitado: ['Por pagar', 'warning'], pagado: ['Pagado', 'success'], rechazado: ['Rechazado', 'danger'] };

export function render(el, { db, me }) {
  const rows = db.all('withdrawals').map(w => ({ ...w, fname: user(w.freelancerId)?.name || '' }));
  const pend = rows.filter(r => r.status === 'solicitado');
  const month = new Date().toISOString().slice(0, 7);
  el.innerHTML = `${pageHead('Pagos a freelancers', 'Transferencias de saldos liberados', '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>' + (pend.length ? `<button class="btn btn-primary btn-sm" data-all>Pagar todos (${money(pend.reduce((a, r) => a + r.amount, 0))})</button>` : ''))}
    <div class="kpi-row">${statCard('Por pagar', money(pend.reduce((a, r) => a + r.amount, 0)), `${pend.length} solicitudes`)}${statCard('Pagado este mes', money(rows.filter(r => r.status === 'pagado' && (r.processedAt || '').startsWith(month)).reduce((a, r) => a + r.amount, 0)))}${statCard('Pagado histórico', money(rows.filter(r => r.status === 'pagado').reduce((a, r) => a + r.amount, 0)))}</div>
    <div class="card" data-t></div>`;
  const pay = w => { db.update('withdrawals', w.id, { status: 'pagado', processedAt: new Date().toISOString(), processedBy: me.id }); db.log('retiro', `Retiro pagado a ${user(w.freelancerId)?.name}: ${money(w.amount)}`, me.id); };
  const t = smartTable(el.querySelector('[data-t]'), {
    id: 'payouts', rows, search: r => r.fname + r.account,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(W).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'createdAt', label: 'Solicitado', render: r => `<span class="small">${date(r.createdAt)}</span>` },
      { key: 'fname', label: 'Freelancer', render: r => `<div class="cell-user">${avatar(user(r.freelancerId), 30)}<span><b>${escape(r.fname)}</b><small>${escape(r.account)}</small></span></div>` },
      { key: 'amount', label: 'Monto', render: r => `<b>${money(r.amount)}</b>` },
      { key: 'status', label: 'Estado', render: r => badge(...W[r.status]) + (r.note ? `<div class="small muted">${escape(r.note)}</div>` : '') },
      { key: 'x', label: '', sort: false, render: r => r.status === 'solicitado' ? '<div class="actions"><button class="btn btn-sm btn-primary" data-act="pay">Pagar</button><button class="btn btn-sm btn-ghost" data-act="reject">Rechazar</button></div>' : '' }
    ],
    onAction: async (act, r) => {
      if (act === 'pay') { if (r.amount > balanceOf(r.freelancerId).available + r.amount) return toast('Saldo insuficiente', 'error'); pay(r); return toast('Transferencia registrada', 'success'); }
      const v = await formModal({ title: 'Rechazar retiro', fields: [{ name: 'note', label: 'Motivo', type: 'select', options: ['Datos bancarios inválidos', 'Cuenta en revisión por disputa', 'Verificación de identidad pendiente'] }], submit: 'Rechazar' });
      if (!v) return;
      db.update('withdrawals', r.id, { status: 'rechazado', note: v.note, processedAt: new Date().toISOString() }); db.log('retiro', `Retiro rechazado a ${r.fname}: ${v.note}`, me.id); toast('Retiro rechazado; el saldo vuelve a estar disponible', 'warning');
    }
  });
  el.querySelector('[data-all]')?.addEventListener('click', async () => { if (await ask(`¿Registrar el pago de ${pend.length} retiros?`, { ok: 'Pagar todos' })) { pend.forEach(pay); toast('Retiros pagados', 'success'); } });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('retiros.csv', t.filtered().map(r => ({ fecha: r.createdAt.slice(0, 10), freelancer: r.fname, cuenta: r.account, monto: r.amount, estado: W[r.status][0] })));
}
