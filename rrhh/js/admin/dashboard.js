// Dashboard de RRHH: dotación, rotación, ausentismo, costo de planilla, reclutamiento y clima.
import { barChart, lineChart, donutChart, escape, ago, money } from '../../../assets/core/ui.js';
import { pageHead, kpi } from './common.js';
import { today, addDays, dkey, parseKey, fmtDay } from '../shared/dates.js';
import { slipDetail } from '../shared/payroll.js';
import { businessDays } from '../shared/vacation.js';
import { STAGES } from '../shared/util.js';

const monthsBack = n => { const out = []; const d = parseKey(today()); d.setDate(15); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(dkey(x).slice(0, 7)); } return out; };
const mLabel = ym => new Date(ym + '-15T12:00').toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
export const enps = rs => { if (!rs.length) return 0; const p = rs.filter(r => r.score >= 9).length, d = rs.filter(r => r.score <= 6).length; return Math.round((p - d) / rs.length * 100); };

export function render(el, ctx) {
  const { db } = ctx, T = today();
  const emps = db.all('employees');
  const act = emps.filter(e => e.status !== 'desvinculado' && e.hireDate <= T);
  const months = monthsBack(12);
  const hcAt = ym => emps.filter(e => e.hireDate <= `${ym}-28` && (!e.exitDate || e.exitDate > `${ym}-28`)).length;
  const hc = months.map(m => ({ label: mLabel(m), value: hcAt(m) }));
  const hires = months.map(m => ({ label: mLabel(m), value: emps.filter(e => e.hireDate.slice(0, 7) === m).length }));
  const exits = months.map(m => ({ label: mLabel(m), value: emps.filter(e => e.exitDate?.slice(0, 7) === m).length }));
  const exits12 = exits.reduce((s, x) => s + x.value, 0), avgHc = hc.reduce((s, x) => s + x.value, 0) / hc.length;
  const turnover = Math.round(exits12 / avgHc * 1000) / 10;
  const reqs = db.query('requests', r => r.status === 'aprobada' && ['licencia', 'sin_goce'].includes(r.type));
  const absM = monthsBack(6).map(m => { const from = `${m}-01`, to = addDays(`${shift(m)}-01`, -1); const days = reqs.reduce((s, r) => s + (r.from <= to && r.to >= from ? businessDays(r.from < from ? from : r.from, r.to > to ? to : r.to) : 0), 0); return { label: mLabel(m), value: Math.round(days / (hcAt(m) * 21) * 1000) / 10 }; });
  const runs = db.all('payrollRuns').sort((a, b) => a.period.localeCompare(b.period)).slice(-6);
  const cost = runs.map(r => ({ label: mLabel(r.period), value: r.costoTotal }));
  const lastCost = runs.at(-1)?.costoTotal || 0;
  const byDept = db.all('departments').map(d => ({ label: d.name, value: act.filter(e => e.deptId === d.id).length, color: d.color })).sort((a, b) => b.value - a.value);
  const surveys = db.all('surveys').sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const enpsTrend = surveys.map(s => ({ label: s.title.replace('Pulso eNPS ', ''), value: Math.max(0, enps(db.query('responses', r => r.surveyId === s.id))) }));
  const lastEnps = enps(db.query('responses', r => r.surveyId === surveys.at(-2)?.id));
  const apps = db.query('applications', a => a.stage !== 'descartado' && a.stage !== 'contratado');
  const pipe = STAGES.slice(0, 4).map(([k, l]) => ({ label: l.split(' ')[0], value: apps.filter(a => a.stage === k).length }));
  const pend = db.count('requests', r => r.status === 'pendiente');
  const log = db.all('_log').slice(0, 7), users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const isAdmin = ctx.user.role === 'admin';
  el.innerHTML = `${pageHead(`Hola, ${ctx.user.name.split(' ')[0]}`, `Grupo Cordillera · ${escape(fmtDay(T, { weekday: 'long', day: 'numeric', month: 'long' }))}`, isAdmin ? '<a class="btn btn-primary" href="#/remuneraciones">💵 Remuneraciones</a>' : '<a class="btn btn-primary" href="#/candidatos">🧲 Ver pipeline</a>')}
    <div class="kpis">
      ${kpi('Dotación activa', act.length, `${hires.at(-1).value} ingresos este mes`)}
      ${kpi('Rotación 12 meses', `${String(turnover).replace('.', ',')} %`, `${exits12} egresos`, turnover > 15 ? 'down' : 'up')}
      ${kpi('Ausentismo (mes)', `${String(absM.at(-1).value).replace('.', ',')} %`, 'licencias y permisos sin goce')}
      ${isAdmin ? kpi('Costo planilla', `$${String(Math.round(lastCost / 1e5) / 10).replace('.', ',')} MM`, runs.at(-1) ? `periodo ${runs.at(-1).period}` : '') : ''}
      ${kpi('Vacantes abiertas', db.count('jobs', j => j.status === 'publicada'), `${apps.length} candidatos en proceso`)}
      ${isAdmin ? kpi('Solicitudes pendientes', pend, 'vacaciones y permisos') : kpi('Nuevas postulaciones', db.count('applications', a => a.appliedAt >= addDays(T, -7)), 'últimos 7 días')}
    </div>
    <div class="dash-grid">
      <div class="card span-8"><div class="card-h"><h3>Dotación</h3><span class="muted small">últimos 12 meses</span></div>${lineChart(hc, { format: v => `${v} personas` })}</div>
      <div class="card span-4"><div class="card-h"><h3>Por área</h3></div>${donutChart(byDept.slice(0, 6).concat(byDept.length > 6 ? [{ label: 'Otras', value: byDept.slice(6).reduce((s, x) => s + x.value, 0) }] : []).map(({ label, value }) => ({ label, value })), { label: String(act.length) })}</div>
      <div class="card span-4"><div class="card-h"><h3>Ingresos</h3><span class="muted small">por mes</span></div>${barChart(hires, { format: v => `${v} ingresos` })}</div>
      <div class="card span-4"><div class="card-h"><h3>Egresos</h3><span class="muted small">por mes</span></div>${barChart(exits.map(x => ({ ...x, color: 'var(--danger)' })), { format: v => `${v} egresos` })}</div>
      <div class="card span-4"><div class="card-h"><h3>Ausentismo %</h3><span class="muted small">6 meses</span></div>${lineChart(absM, { format: v => `${v} %` })}</div>
      ${isAdmin ? `<div class="card span-6"><div class="card-h"><h3>Costo de planilla</h3><span class="muted small">costo empresa, CLP</span></div>${barChart(cost.map(c => ({ ...c, value: Math.round(c.value / 1e6) })), { format: v => `$${v} MM` })}</div>` : ''}
      <div class="card span-${isAdmin ? 6 : 6}"><div class="card-h"><h3>eNPS</h3><span class="muted small">último cerrado: <b>${lastEnps}</b></span></div>${lineChart(enpsTrend, { format: v => `eNPS ${v}` })}</div>
      <div class="card span-6"><div class="card-h"><h3>Pipeline de reclutamiento</h3><a class="small" href="#/candidatos">ATS</a></div>${barChart(pipe, { format: v => `${v} candidatos` })}</div>
      ${isAdmin ? `<div class="card span-6"><div class="card-h"><h3>Actividad reciente</h3><a class="small" href="#/bitacora">Bitácora</a></div><ul class="log-list">${log.map(l => `<li>•<span>${escape(l.detail)}<small>${escape(users[l.user]?.name || 'Sistema / público')} · ${escape(ago(l.at))}</small></span></li>`).join('') || '<li class="muted">Sin actividad.</li>'}</ul></div>` : ''}
    </div>`;
}
function shift(ym) { const d = new Date(ym + '-15T12:00'); d.setMonth(d.getMonth() + 1); return dkey(d).slice(0, 7); }
export { slipDetail };
