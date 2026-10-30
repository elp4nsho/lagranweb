// Dashboard: KPIs y gráficos de finalización, aprobación, tiempos y cumplimiento por área/contratista.
import { barChart, lineChart, donutChart, escape, ago, num } from '../../../assets/core/ui.js';
import { kpis, panel, pageHead, byMonth, person } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { getUser, getPlan, STATUS, rate, workers } from '../data/model.js';
import { byArea, byCompany, avgTimePerModule, passStats, statusCounts, certCounts, miniBars } from './stats.js';

export function renderDashboard(el, _p, ctx) {
  const ws = workers().filter(u => u.active !== false);
  const sc = statusCounts(), cc = certCounts(), ps = passStats();
  const live = db.all('assignments').filter(a => !a.cancelled).length;
  const completions = byMonth(db.query('assignments', a => a.completedAt), a => a.completedAt);
  const prevM = completions.at(-2)?.value || 0, curM = completions.at(-1)?.value || 0;
  const att = db.all('attempts');
  const passByMonth = byMonth(att, t => t.at).map((m, i) => { const all = byMonth(att, t => t.at)[i].value; const ok = byMonth(att.filter(t => t.passed), t => t.at)[i].value; return { label: m.label, value: rate(ok, all) }; });
  const times = avgTimePerModule();
  const pending = db.query('assignments', a => a.practical?.status === 'pendiente');
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  el.innerHTML = pageHead('Dashboard', `Hola, ${ctx.user.name.split(' ')[0]}. Resumen de la operación de inducciones.`, `<a class="btn" href="#/reportes">Ver reportes</a><a class="btn btn-primary" href="#/asignaciones">＋ Asignar inducción</a>`) +
    kpis([
      { label: 'Trabajadores activos', value: num(ws.length), hint: `${ws.filter(u => u.type === 'contratista').length} contratistas` },
      { label: 'Tasa de finalización', value: rate(sc.completada, live) + '%', hint: `${sc.completada} de ${live} asignaciones` },
      { label: 'Tasa de aprobación', value: ps.rate + '%', hint: `${ps.firstTry}% al primer intento` },
      { label: 'Completadas este mes', value: num(curM), delta: `${curM >= prevM ? '▲' : '▼'} ${Math.abs(curM - prevM)} vs mes anterior`, up: curM >= prevM },
      { label: 'Certificados vigentes', value: num(cc.vigente + cc.por_vencer), hint: `${cc.por_vencer} por vencer` },
      { label: 'Asignaciones vencidas', value: num(sc.vencida), delta: sc.vencida ? 'Requieren seguimiento' : 'Todo al día', up: !sc.vencida }
    ]) +
    `<div class="ak-grid">
      ${panel('Inducciones completadas por mes', lineChart(completions, { height: 190 }))}
      ${panel('Tasa de aprobación por mes (%)', barChart(passByMonth, { height: 190, format: v => v + '%' }))}
    </div>
    <div class="ak-grid">
      ${panel('Tiempo promedio por módulo (min)', barChart(times.map(t => ({ label: t.label.split(' ')[0], value: t.value })), { height: 170, format: v => v + ' min' }) + `<p class="small muted" style="margin:8px 0 0">${times.map(t => `${escape(t.label)}: ${t.value} min (esperado ${t.expected})`).join(' · ')}</p>`)}
      ${panel('Estado de asignaciones', donutChart(Object.entries(sc).filter(([, v]) => v).map(([k, v]) => ({ label: STATUS[k][0], value: v })), { label: num(live) }))}
    </div>
    <div class="ak-grid">
      ${panel('Finalización por área', miniBars(byArea()))}
      ${panel('Cumplimiento por empresa', miniBars(byCompany()), '<a class="btn btn-sm btn-ghost" href="#/empresas">Empresas →</a>')}
    </div>
    <div class="ak-grid">
      ${panel(`Evaluaciones prácticas pendientes (${pending.length})`, pending.length ? `<ul class="ak-list">${pending.slice(0, 6).map(a => `<li>${person(users[a.userId], getPlan(a.planId)?.name)}<span class="grow"></span><a class="btn btn-sm" href="#/evaluaciones">Revisar</a></li>`).join('')}</ul>` : '<p class="muted">Sin pendientes.</p>')}
      ${panel('Actividad reciente', `<ul class="ak-list">${db.all('_log').slice(0, 7).map(l => `<li><div class="grow"><b>${escape(l.action)}</b><small>${escape(l.detail)}${users[l.user] ? ' · ' + escape(users[l.user].name) : ''}</small></div><span class="small muted">${ago(l.at)}</span></li>`).join('') || '<li class="muted">Aún no hay actividad registrada.</li>'}</ul>`, '<a class="btn btn-sm btn-ghost" href="#/actividad">Bitácora →</a>')}
    </div>`;
}
