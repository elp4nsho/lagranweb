// Mensualidades: recaudación, morosidad, registro manual de pagos y recordatorios.
import { escape, formModal, toast, downloadCSV, date, money, barChart } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, statCard } from '../shared/kit.js';
import { course, fullName, user, monthLabel, sortedCourses } from '../shared/academic.js';
import { PAY_STATUS, NOW, YEAR } from '../shared/school.js';

export function render(el, { db, me }) {
  const pays = db.all('payments');
  const curM = `${YEAR}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;
  const rows = pays.map(p => { const s = db.get('students', p.studentId); return { ...p, student: s ? fullName(s) : '—', courseId: s?.courseId, courseName: s ? course(s.courseId).name : '', guardian: user(p.guardianId)?.name || '—' }; });
  const months = [...new Set(pays.map(p => p.month))].sort();
  const byMonth = months.filter(m => m <= curM).map(m => ({ label: monthLabel(m), value: pays.filter(p => p.month === m && p.status === 'pagado').reduce((a, p) => a + p.amount, 0) }));
  const cur = pays.filter(p => p.month === curM);
  const overdue = pays.filter(p => p.status === 'vencido');
  el.innerHTML = `
    ${pageHead('Mensualidades', `Cuotas ${YEAR} · arancel mensual ${money(db.getValue('site').monthlyFee)}`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-sm btn-primary" data-remind>✉ Recordar a morosos</button>`)}
    <div class="kpi-row">
      ${statCard('Recaudado este mes', money(cur.filter(p => p.status === 'pagado').reduce((a, p) => a + p.amount, 0)), `${cur.filter(p => p.status === 'pagado').length} de ${cur.length} cuotas`)}
      ${statCard('Pendiente este mes', money(cur.filter(p => p.status === 'pendiente').reduce((a, p) => a + p.amount, 0)), 'vence el día 5')}
      ${statCard('Deuda vencida', `<span class="text-danger">${money(overdue.reduce((a, p) => a + p.amount, 0))}</span>`, `${overdue.length} cuotas · ${new Set(overdue.map(p => p.guardianId)).size} familias`)}
      ${statCard('Recaudado en el año', money(pays.filter(p => p.status === 'pagado').reduce((a, p) => a + p.amount, 0)))}
    </div>
    <div class="card"><h3>Recaudación mensual</h3>${barChart(byMonth, { format: money })}</div>
    <div class="card" data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    id: 'payments', rows, pageSize: 12, search: r => r.student + r.guardian,
    filters: [
      { key: 'month', label: 'Mes', options: months.map(m => [m, monthLabel(m)]) },
      { key: 'status', label: 'Estado', options: Object.entries(PAY_STATUS).map(([k, v]) => [k, v[0]]) },
      { key: 'courseId', label: 'Curso', options: sortedCourses().map(c => [c.id, c.name]) }
    ],
    columns: [
      { key: 'month', label: 'Mes', render: r => `<span style="text-transform:capitalize">${monthLabel(r.month)}</span>` },
      { key: 'student', label: 'Estudiante', render: r => `<b>${escape(r.student)}</b><div class="small muted">${escape(r.courseName)}</div>` },
      { key: 'guardian', label: 'Apoderado/a' },
      { key: 'amount', label: 'Monto', render: r => money(r.amount) + (r.beca ? ` ${badge('Beca', 'info')}` : '') },
      { key: 'status', label: 'Estado', render: r => badge(...PAY_STATUS[r.status]) },
      { key: 'paidAt', label: 'Pago', render: r => r.paidAt ? `<span class="small">${date(r.paidAt)} · ${escape(r.method || '')}</span>` : '—' },
      { key: 'x', label: '', sort: false, render: r => r.status !== 'pagado' ? '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="pay">Registrar pago</button></div>' : '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="undo">Anular</button></div>' }
    ],
    onAction: async (act, r) => {
      if (act === 'undo') { db.update('payments', r.id, { status: r.month < curM ? 'vencido' : 'pendiente', paidAt: null, method: null }); db.log('pago', `Pago anulado: ${r.student} (${monthLabel(r.month)})`, me.id); return toast('Pago anulado', 'warning'); }
      const v = await formModal({ title: `Registrar pago · ${r.student}`, fields: [{ name: 'method', label: 'Medio de pago', type: 'select', options: ['Transferencia', 'Efectivo', 'Webpay', 'Cheque', 'PAC'] }, { name: 'ref', label: 'N° de comprobante', placeholder: 'Opcional' }], submit: 'Registrar' });
      if (!v) return;
      db.update('payments', r.id, { status: 'pagado', paidAt: new Date().toISOString(), method: v.method, ref: v.ref });
      db.log('pago', `Pago registrado: ${r.student} ${monthLabel(r.month)} ${money(r.amount)} (${v.method})`, me.id);
      toast('Pago registrado', 'success');
    }
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('mensualidades.csv', t.filtered().map(r => ({ mes: r.month, estudiante: r.student, curso: r.courseName, apoderado: r.guardian, monto: r.amount, estado: PAY_STATUS[r.status][0], fecha_pago: r.paidAt ? r.paidAt.slice(0, 10) : '', medio: r.method || '' })));
  el.querySelector('[data-remind]').onclick = () => {
    const fam = new Set(overdue.map(p => p.guardianId)).size;
    if (!fam) return toast('No hay familias con cuotas vencidas', 'info');
    db.log('pago', `Recordatorio de pago enviado a ${fam} familias`, me.id); toast(`Recordatorio enviado a ${fam} familias`, 'success');
  };
}
