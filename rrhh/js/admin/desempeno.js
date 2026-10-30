// Ciclos de desempeño: avance por área, distribución de resultados y cierre de ciclo.
import { escape, toast, date, barChart, confirm } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, kpi } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { personCell } from '../shared/util.js';
import { today, addDays } from '../shared/dates.js';
import { avg, LEVEL } from '../portal/evaluacion.js';

let cycleId = null;
export function render(el, ctx) {
  const { db } = ctx;
  const cycles = db.all('cycles').sort((a, b) => b.from.localeCompare(a.from));
  if (!cycles.find(c => c.id === cycleId)) cycleId = cycles.find(c => c.status === 'abierto')?.id || cycles[0]?.id;
  const c = cycles.find(x => x.id === cycleId);
  const revs = c ? db.query('reviews', r => r.cycleId === c.id).map(r => ({ ...r, e: db.get('employees', r.employeeId), m: db.get('employees', r.managerId) })).filter(r => r.e) : [];
  const selfN = revs.filter(r => r.self).length, mgrN = revs.filter(r => r.manager).length;
  const finals = revs.map(r => r.final ?? (r.manager ? avg(r.manager.scores) : null)).filter(v => v != null);
  const dist = ['En desarrollo', 'Cumple lo esperado', 'Supera lo esperado', 'Sobresaliente'].map(l => ({ label: l.split(' ')[0], value: finals.filter(v => LEVEL(v) === l).length }));
  const byDept = db.all('departments').map(d => { const rs = revs.filter(r => r.e.deptId === d.id); return { label: d.name.split(' ')[0], value: rs.length ? Math.round(rs.filter(r => r.manager).length / rs.length * 100) : 0 }; });
  el.innerHTML = `${pageHead('Desempeño', 'Ciclos de evaluación: autoevaluación del colaborador + evaluación de la jefatura.', '<button class="btn btn-primary" data-act="new">＋ Nuevo ciclo</button>')}
    <div class="tabs" role="tablist">${cycles.map(x => `<button class="tab ${x.id === cycleId ? 'active' : ''}" role="tab" aria-selected="${x.id === cycleId}" data-act="cyc" data-id="${x.id}">${escape(x.name)} · ${escape(x.status)}</button>`).join('')}</div>
    ${c ? `<div class="kpis">${kpi('Participantes', revs.length)}${kpi('Autoevaluaciones', `${Math.round(selfN / (revs.length || 1) * 100)} %`, `${selfN} de ${revs.length}`)}${kpi('Evaluaciones jefatura', `${Math.round(mgrN / (revs.length || 1) * 100)} %`, `${mgrN} de ${revs.length}`)}${kpi('Promedio', finals.length ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(1).replace('.', ',') : '—')}${kpi('Plazo', escape(date(c.to + 'T12:00')), c.status)}</div>
    <div class="dash-grid"><div class="card span-6"><h3>Distribución de resultados</h3>${barChart(dist, { format: v => `${v} personas` })}</div><div class="card span-6"><h3>Avance de jefaturas por área (%)</h3>${barChart(byDept, { format: v => `${v} %` })}</div></div>
    <div class="card"><div class="card-h"><h3>Evaluaciones</h3>${c.status === 'abierto' ? `<div class="row gap-sm">${actBtn('remind', c.id, '🔔 Recordar pendientes')}${actBtn('close', c.id, 'Cerrar ciclo', 'btn-danger')}</div>` : ''}</div><div data-t></div></div>` : '<div class="card empty">Sin ciclos.</div>'}`;
  if (c) smartTable(el.querySelector('[data-t]'), {
    key: 'perf', rows: revs.map(r => ({ ...r, name: r.e.name, mgr: r.m?.name || '', s: r.self ? avg(r.self.scores) : -1, mm: r.manager ? avg(r.manager.scores) : -1, fin: r.final ?? -1 })), sort: 'name', search: r => `${r.name} ${r.mgr}`,
    filters: [{ key: 'st', label: 'Avance', options: [['self', 'Falta autoevaluación'], ['mgr', 'Falta jefatura'], ['done', 'Completas']], test: (r, v) => v === 'self' ? !r.self : v === 'mgr' ? !r.manager : !!(r.self && r.manager) }],
    columns: [
      { key: 'name', label: 'Colaborador', render: r => personCell(r.e) }, { key: 'mgr', label: 'Jefatura' },
      { key: 's', label: 'Auto', render: r => r.self ? `<span class="badge badge-success">${String(r.s).replace('.', ',')}</span>` : '<span class="badge badge-warning">Pendiente</span>' },
      { key: 'mm', label: 'Jefatura', render: r => r.manager ? `<span class="badge badge-primary">${String(r.mm).replace('.', ',')}</span>` : '<span class="badge badge-warning">Pendiente</span>' },
      { key: 'fin', label: 'Resultado', render: r => r.final != null ? `<b>${String(r.final).replace('.', ',')}</b> · ${LEVEL(r.final)}` : '—' }
    ],
    csv: { filename: `desempeno-${c.id}.csv`, map: r => ({ colaborador: r.name, jefatura: r.mgr, autoevaluacion: r.self ? r.s : '', jefatura_nota: r.manager ? r.mm : '', final: r.final ?? '' }) }
  });
  onActs(el, {
    cyc: id => { cycleId = id; render(el, ctx); },
    new: async () => {
      const v = await formDialog({ title: 'Nuevo ciclo de evaluación', fields: [{ name: 'name', label: 'Nombre', required: true, span: 2 }, { name: 'from', label: 'Inicio', type: 'date', required: true }, { name: 'to', label: 'Cierre', type: 'date', required: true }, { name: 'competencies', label: 'Competencias (una por línea)', type: 'textarea', span: 2 }], values: { name: `Evaluación ${today().slice(0, 4)}-Q`, from: today(), to: addDays(today(), 30), competencies: (cycles[0]?.competencies || []).join('\n') } });
      if (!v) return;
      if (db.find('cycles', x => x.status === 'abierto')) return toast('Cierra el ciclo abierto antes de abrir uno nuevo', 'warning');
      const row = db.insert('cycles', { name: v.name, from: v.from, to: v.to, status: 'abierto', competencies: v.competencies.split('\n').map(s => s.trim()).filter(Boolean) });
      db.query('employees', e => e.status === 'activo' && e.managerId).forEach(e => { db.insert('reviews', { cycleId: row.id, employeeId: e.id, managerId: e.managerId, self: null, manager: null, final: null }); });
      db.query('employees', e => e.status === 'activo').forEach(e => ctx.notify(e.id, `Se abrió el ciclo «${v.name}». Completa tu autoevaluación.`));
      cycleId = row.id; db.log('desempeño', `Abrió el ciclo ${v.name}`, ctx.user.id); toast('Ciclo abierto y notificado', 'success');
    },
    remind: () => { let n = 0; revs.forEach(r => { if (!r.self) { ctx.notify(r.employeeId, `Recordatorio: completa tu autoevaluación (${c.name}).`); n++; } if (!r.manager && r.managerId) { ctx.notify(r.managerId, `Recordatorio: evalúa a ${r.e.name} (${c.name}).`); n++; } }); db.log('desempeño', `Envió ${n} recordatorios`, ctx.user.id); toast(`${n} recordatorios enviados`, 'success'); },
    close: async () => {
      if (!(await confirm('Se calculará el resultado final con la evaluación de jefatura (o la autoevaluación si falta).', { title: 'Cerrar ciclo', ok: 'Cerrar ciclo', danger: true }))) return;
      revs.forEach(r => { const src = r.manager || r.self; if (src) db.update('reviews', r.id, { final: avg(src.scores) }); });
      db.update('cycles', c.id, { status: 'cerrado' });
      db.log('desempeño', `Cerró el ciclo ${c.name}`, ctx.user.id); toast('Ciclo cerrado', 'success');
    }
  });
}
