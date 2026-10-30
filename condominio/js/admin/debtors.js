// Morosidad: unidades con gastos vencidos, intereses, recordatorios (individuales o masivos) y pagos manuales.
import { escape, money, toast, confirm, formModal, ago, date } from '../../../assets/core/ui.js';
import { settings, notify, unitName, residentsOf } from '../data/db.js';
import { periodLabel, owed, interest, isOverdue } from '../shared/format.js';
import { pageHead, crudTable, kpi } from '../shared/kit.js';

export function renderDebtors(el, p, q, ctx) {
  const { db, user } = ctx, s = settings(), admin = user.role === 'administrador';
  const rows = () => {
    const by = {};
    db.query('charges', c => isOverdue(c, s)).forEach(c => { (by[c.unitId] = by[c.unitId] || []).push(c); });
    return Object.entries(by).map(([unitId, cs]) => {
      const u = db.get('units', unitId), last = db.query('reminders', r => r.unitId === unitId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const titular = residentsOf(unitId).find(r => r.titular);
      return { id: unitId, unitId, name: unitName(unitId), owner: titular?.name || u?.ownerName, phone: titular?.phone || '', email: titular?.email || '', months: cs.length, periods: cs.map(c => c.period).sort(), base: cs.reduce((t, c) => t + c.total, 0), interest: cs.reduce((t, c) => t + interest(c, s), 0), debt: cs.reduce((t, c) => t + owed(c, s), 0), lastReminder: last?.createdAt || '', tower: u?.tower };
    }).sort((a, b) => b.debt - a.debt);
  };
  const list = rows();
  el.innerHTML = `${pageHead('Morosidad', `Interés por mora ${String(s.interestPct).replace(".", ",")}% mensual · vencimiento día ${s.dueDay}`, `<button class="btn btn-primary" data-bulk ${list.length ? '' : 'disabled'}>✉ Recordar a todos (${list.length})</button>`)}
    <div class="kpis">${kpi('Deptos morosos', list.length, `${(list.length / db.count('units') * 100).toFixed(1)}% de la comunidad`, false)}${kpi('Deuda vencida', money(list.reduce((t, r) => t + r.base, 0)))}${kpi('Intereses acumulados', money(list.reduce((t, r) => t + r.interest, 0)))}${kpi('3 o más meses', list.filter(r => r.months >= 3).length, 'candidatos a cobranza judicial', false)}</div>
    <div data-t></div>`;
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows, search: r => `${r.name} ${r.owner}`,
    filters: [{ key: 'tower', label: 'Torre', options: [['A', 'Torre A'], ['B', 'Torre B']] }, { key: 'months', label: 'Meses', options: [['1', '1 mes'], ['2', '2 meses'], ['3', '3+ meses']], fn: (r, v) => v === '3' ? r.months >= 3 : r.months === +v }],
    columns: [
      { key: 'name', label: 'Depto', render: r => `<b>${escape(r.name)}</b><br><span class="muted small">${escape(r.owner || '')}</span>` },
      { key: 'months', label: 'Meses', render: r => `<span class="badge ${r.months >= 3 ? 'badge-danger' : 'badge-warning'}">${r.months}</span><br><span class="muted small">${r.periods.map(p => periodLabel(p).slice(0, 3)).join(', ')}</span>` },
      { key: 'base', label: 'Capital', render: r => money(r.base) }, { key: 'interest', label: 'Intereses', render: r => money(r.interest) },
      { key: 'debt', label: 'Total deuda', render: r => `<b>${money(r.debt)}</b>` },
      { key: 'lastReminder', label: 'Último recordatorio', render: r => `<span class="small">${r.lastReminder ? ago(r.lastReminder) : 'Nunca'}</span>` },
      { key: 'id', label: '', sort: false, render: r => `<div class="actions"><button class="btn btn-sm" data-remind="${r.unitId}">Recordar</button>${admin ? `<button class="btn btn-sm btn-ghost" data-pay="${r.unitId}">Pago</button>` : ''}</div>` }
    ],
    empty: '¡Sin morosos! Toda la comunidad está al día.',
    csv: { name: 'morosos.csv', map: r => ({ depto: r.name, titular: r.owner, telefono: r.phone, correo: r.email, meses: r.months, periodos: r.periods.join(' '), capital: r.base, intereses: r.interest, total: r.debt }) }
  });
  const remind = (r, bulk = false) => {
    notify(r.unitId, `Recordatorio: tienes ${r.months} mes(es) de gastos comunes vencidos por ${money(r.debt)}. Paga en línea para evitar más intereses.`, '#/gastos?pagar=1');
    db.insert('reminders', { unitId: r.unitId, channel: 'App y correo', amount: r.debt, by: user.name });
    if (!bulk) db.log('morosidad', `${user.name} envió recordatorio a ${r.name} (${money(r.debt)})`, user.id);
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.remind) { const r = rows().find(x => x.unitId === b.dataset.remind); remind(r); toast(`Recordatorio enviado a ${r.name}`, 'success'); tbl.refresh(); }
    if (b.dataset.pay) {
      const cs = db.query('charges', c => c.unitId === b.dataset.pay && !c.paid && isOverdue(c, s)).sort((a, x) => a.period.localeCompare(x.period));
      const r = await formModal({ title: `Registrar pago · ${unitName(b.dataset.pay)}`, submit: 'Registrar pago', fields: [
        ...cs.map(c => ({ name: c.id, label: `${periodLabel(c.period)} · ${money(owed(c, s))}`, type: 'checkbox', value: true })),
        { name: 'method', label: 'Medio', type: 'select', options: ['Transferencia', 'Cheque', 'Efectivo', 'Convenio de pago'] }] });
      if (!r) return;
      let folio = Math.max(18400, ...db.all('charges').map(x => x.folio || 0));
      const sel = cs.filter(c => r[c.id]);
      sel.forEach(c => db.update('charges', c.id, { paid: true, paidAt: new Date().toISOString(), method: r.method, folio: ++folio, interestPaid: interest(c, s) }));
      db.log('pago', `${user.name} registró pago de ${unitName(b.dataset.pay)}: ${sel.length} mes(es)`, user.id);
      toast(`${sel.length} mes(es) marcados como pagados`, 'success'); ctx.refresh();
    }
  });
  el.querySelector('[data-bulk]').onclick = async () => {
    const all = rows();
    if (!(await confirm(`Se enviará un recordatorio de pago a ${all.length} departamentos con deuda vencida.`, { title: 'Recordatorio masivo', ok: 'Enviar' }))) return;
    all.forEach(r => remind(r, true));
    db.log('morosidad', `${user.name} envió recordatorio masivo a ${all.length} deptos`, user.id);
    toast(`${all.length} recordatorios enviados`, 'success'); tbl.refresh();
  };
}
export { date };
