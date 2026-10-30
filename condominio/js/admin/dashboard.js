// Dashboard: recaudación, morosidad, gastos por categoría, reservas e incidencias.
import { barChart, lineChart, donutChart, escape, money, ago } from '../../../assets/core/ui.js';
import { settings } from '../data/db.js';
import { CATEGORIES, TSTATUS, periodLabel, periodShort, owed, isOverdue, pctFmt } from '../shared/format.js';
import { pageHead, kpi } from '../shared/kit.js';

export function renderDashboard(el, p, q, { db, can }) {
  const s = settings();
  const pers = db.query('periods', x => x.status === 'publicado').sort((a, b) => a.period.localeCompare(b.period));
  const last = pers.at(-1), draft = db.find('periods', x => x.status === 'borrador');
  const charges = db.all('charges');
  const rateOf = per => { const cs = charges.filter(c => c.period === per); const tot = cs.reduce((t, c) => t + c.total, 0); return tot ? cs.filter(c => c.paid).reduce((t, c) => t + c.total, 0) / tot * 100 : 0; };
  const lastCs = charges.filter(c => c.period === last?.period);
  const overdue = charges.filter(c => isOverdue(c, s));
  const debt = overdue.reduce((t, c) => t + owed(c, s), 0);
  const debtUnits = new Set(overdue.map(c => c.unitId));
  const totalLast = last ? last.expenses.reduce((t, e) => t + e.amount, 0) : 0;
  const byCat = last ? CATEGORIES.map(cat => ({ label: cat, value: Math.round(last.expenses.filter(e => e.category === cat).reduce((t, e) => t + e.amount, 0) / 1000) })).filter(x => x.value).sort((a, b) => b.value - a.value) : [];
  const topCats = byCat.slice(0, 6); const rest = byCat.slice(6).reduce((t, x) => t + x.value, 0); if (rest) topCats.push({ label: 'Otros', value: rest });
  const towers = ['A', 'B'].map(t => ({ label: 'Torre ' + t, value: Math.round(overdue.filter(c => c.unitId.startsWith(t + '-')).reduce((x, c) => x + owed(c, s), 0) / 1000) }));
  const today = new Date().toISOString().slice(0, 10);
  const bookings = db.all('bookings').filter(b => b.status !== 'cancelada');
  const bySpace = db.all('spaces').map(sp => ({ label: sp.name.replace('Quincho ', 'Q. '), value: bookings.filter(b => b.spaceId === sp.id && b.date >= new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)).length }));
  const tickets = db.all('tickets');
  const tStatus = Object.keys(TSTATUS).map(k => ({ label: TSTATUS[k][0], value: tickets.filter(t => t.status === k).length }));
  el.innerHTML = `${pageHead('Dashboard', `${escape(s.community)} · ${db.count('units')} unidades · ${db.count('residents')} residentes`, can('gastos') && draft ? `<a class="btn btn-primary" href="#/gastos/${draft.period}">Calcular ${periodLabel(draft.period).toLowerCase()}</a>` : '')}
    <div class="kpis">
      ${kpi(`Recaudación ${last ? periodLabel(last.period).toLowerCase() : ''}`, pctFmt(last ? rateOf(last.period) : 0), `${lastCs.filter(c => c.paid).length} de ${lastCs.length} deptos pagados`, rateOf(last?.period) > 80)}
      ${kpi('Morosidad total', money(debt), `${debtUnits.size} deptos con deuda vencida`, false)}
      ${kpi('Gasto del último mes', money(totalLast), last ? `${money(totalLast / db.count('units'))} promedio por depto` : '')}
      ${kpi('Reservas próximas', bookings.filter(b => b.date >= today).length, 'próximos 21 días')}
      ${kpi('Incidencias abiertas', tickets.filter(t => !['resuelto', 'cerrado'].includes(t.status)).length, `${tickets.filter(t => t.priority === 'urgente' && !['resuelto', 'cerrado'].includes(t.status)).length} urgentes`, false)}
    </div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Recaudación por mes (%)</h3>${lineChart(pers.map(x => ({ label: periodShort(x.period), value: Math.round(rateOf(x.period)) })), { format: v => v + '%' })}</div>
      <div class="card chart-card"><h3>Gasto mensual del edificio (miles $)</h3>${barChart(pers.map(x => ({ label: periodShort(x.period), value: Math.round(x.expenses.reduce((t, e) => t + e.amount, 0) / 1000) })), { format: v => money(v * 1000) })}</div>
    </div>
    <div class="split">
      <div class="card chart-card"><h3>Gastos por categoría · ${last ? periodLabel(last.period) : ''} (miles $)</h3>${donutChart(topCats, { label: money(totalLast / 1e6).replace('$', '$') + 'M' })}</div>
      <div class="card chart-card"><h3>Morosidad por torre (miles $)</h3>${barChart(towers, { format: v => money(v * 1000), height: 160 })}</div>
    </div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Reservas por espacio (90 días)</h3>${barChart(bySpace, { height: 170 })}</div>
      <div class="card chart-card"><h3>Incidencias por estado</h3>${donutChart(tStatus, { label: tickets.length, size: 150 })}</div>
    </div>
    <div class="card"><h3>Actividad reciente</h3>${db.all('_log').slice(0, 8).map(l => `<div class="list-row small"><span>${escape(l.detail || l.action)}</span><span class="muted nowrap">${ago(l.at)}</span></div>`).join('')}</div>`;
}
