// Reportes: cumplimiento por área, empresa y plan, tiempos por módulo y exportaciones CSV.
import { pageHead, panel, escape, downloadCSV, toast, date } from '../shared/admin-kit.js';
import { barChart } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getUser, getPlan, getCompany, certStatus, CERT, assignmentStatus, STATUS, assignmentPct } from '../data/model.js';
import { byArea, byCompany, byPlan, avgTimePerModule } from './stats.js';

const tbl = (rows, cols) => `<div class="table-wrap"><table class="table"><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const groupCols = [['Grupo', r => escape(r.label)], ['Personas', r => r.workers], ['Asignaciones', r => r.total], ['Completadas', r => r.done], ['Vencidas', r => r.overdue ? `<b style="color:var(--danger)">${r.overdue}</b>` : 0], ['Cumplimiento', r => `${r.pct}%`]];
const groupCSV = r => ({ grupo: r.label, personas: r.workers, asignaciones: r.total, completadas: r.done, vencidas: r.overdue, cumplimiento: r.pct + '%' });

export function renderReports(el) {
  const area = byArea(), comp = byCompany(), plan = byPlan(), times = avgTimePerModule();
  el.innerHTML = pageHead('Reportes', 'Indicadores para comités paritarios, auditorías y control de contratistas.', '<button class="btn btn-primary" data-x="full">⬇ Reporte completo (CSV)</button>') +
    `<div class="ak-grid">
      ${panel('Cumplimiento por área', barChart(area.map(r => ({ label: r.label, value: r.pct })), { height: 160, format: v => v + '%' }) + tbl(area, groupCols), '<button class="btn btn-sm" data-x="area">⬇ CSV</button>')}
      ${panel('Cumplimiento por plan', tbl(plan, groupCols), '<button class="btn btn-sm" data-x="plan">⬇ CSV</button>')}
    </div>
    ${panel('Cumplimiento por empresa contratista', tbl(comp, groupCols), '<button class="btn btn-sm" data-x="comp">⬇ CSV</button>')}
    <div class="ak-grid">
      ${panel('Tiempo por módulo', tbl(times, [['Módulo', r => escape(r.label)], ['Promedio real', r => `${r.value} min`], ['Esperado', r => `${r.expected} min`], ['Desviación', r => `${r.value >= r.expected ? '+' : ''}${Math.round((r.value - r.expected) * 10) / 10} min`], ['Muestras', r => r.n]]), '<button class="btn btn-sm" data-x="time">⬇ CSV</button>')}
      ${panel('Otras exportaciones', `<ul class="ak-list">
        <li><div class="grow"><b>Certificados por vencer</b><small>Titulares con certificados dentro del período de aviso.</small></div><button class="btn btn-sm" data-x="exp">⬇ CSV</button></li>
        <li><div class="grow"><b>Asignaciones vencidas</b><small>Para seguimiento con supervisores y contratistas.</small></div><button class="btn btn-sm" data-x="over">⬇ CSV</button></li>
        <li><div class="grow"><b>Trabajadores sin inducción vigente</b><small>Personas activas sin ningún certificado vigente.</small></div><button class="btn btn-sm" data-x="none">⬇ CSV</button></li>
      </ul>`)}
    </div>`;
  const today = new Date().toISOString().slice(0, 10);
  const exp = {
    area: () => area.map(groupCSV), plan: () => plan.map(groupCSV), comp: () => comp.map(groupCSV),
    time: () => times.map(t => ({ modulo: t.label, promedio_min: t.value, esperado_min: t.expected, muestras: t.n })),
    exp: () => db.all('certificates').filter(c => certStatus(c) === 'por_vencer').map(c => { const u = getUser(c.userId); return { codigo: c.code, titular: u?.name, rut: u?.rut, empresa: getCompany(u?.companyId)?.name, plan: getPlan(c.planId)?.name, vence: date(c.expiresAt) }; }),
    over: () => db.all('assignments').filter(a => assignmentStatus(a) === 'vencida').map(a => { const u = getUser(a.userId); return { trabajador: u?.name, rut: u?.rut, empresa: getCompany(u?.companyId)?.name, supervisor: getUser(u?.supervisorId)?.name, plan: getPlan(a.planId)?.name, plazo: date(a.dueAt), avance: assignmentPct(a) + '%' }; }),
    none: () => db.query('users', u => u.role === 'trabajador' && u.active !== false && !db.find('certificates', c => c.userId === u.id && ['vigente', 'por_vencer'].includes(certStatus(c)))).map(u => ({ trabajador: u.name, rut: u.rut, empresa: getCompany(u.companyId)?.name, area: u.area, supervisor: getUser(u.supervisorId)?.name })),
    full: () => db.all('assignments').map(a => { const u = getUser(a.userId), c = a.certificateId && db.get('certificates', a.certificateId); return { trabajador: u?.name, rut: u?.rut, empresa: getCompany(u?.companyId)?.name, area: u?.area, plan: getPlan(a.planId)?.name, asignada: date(a.assignedAt), plazo: date(a.dueAt), estado: STATUS[assignmentStatus(a)][0], avance: assignmentPct(a) + '%', mejor_puntaje: a.bestScore, minutos: Object.values(a.time || {}).reduce((x, y) => x + y, 0), certificado: c?.code || '', estado_certificado: c ? CERT[certStatus(c)][0] : '' }; })
  };
  el.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; const rows = exp[b.dataset.x](); if (!rows.length) return toast('No hay datos para exportar', 'info'); downloadCSV(`reporte-${b.dataset.x}-${today}.csv`, rows); toast(`${rows.length} filas exportadas`, 'success'); });
}
