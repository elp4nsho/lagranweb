// Asignaciones: seguimiento de todas las inducciones asignadas, con acciones de plazo, recordatorio y cancelación.
import { pageHead, table, person, badge, pctBar, html, date, downloadCSV, toast } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { getUser, getPlan, getCompany, assignmentPct, assignmentStatus, STATUS, daysLeft } from '../data/model.js';
import { assignDialog } from '../shared/assign.js';
import { assignmentActions, runAssignmentAction } from './learners.js';

export function renderAssignments(el, _p, ctx, { pool, key = 'assignments', title = 'Asignaciones', sub = 'Todas las inducciones asignadas y su estado. Las vencidas requieren seguimiento.' } = {}) {
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const rows = db.all('assignments').filter(a => !pool || pool.has(a.userId)).map(a => ({ ...a, _st: assignmentStatus(a), _pct: assignmentPct(a), _u: users[a.userId] })).filter(a => a._u);
  el.innerHTML = pageHead(title, sub, `<button class="btn" data-csv>⬇ CSV</button><button class="btn btn-primary" data-new>＋ Asignar inducción</button>`) + '<div data-t></div>';
  const t = table(el.querySelector('[data-t]'), {
    key, rows, pageSize: 12,
    search: a => `${a._u.name} ${a._u.rut} ${getPlan(a.planId)?.name}`,
    filters: [
      { key: '_st', label: 'Estado', options: Object.entries(STATUS).map(([k, v]) => [k, v[0]]) },
      { key: 'planId', label: 'Plan', options: db.all('plans').map(p => [p.id, p.code + ' · ' + p.name]) },
      { key: 'co', label: 'Empresa', options: db.all('companies').map(c => [c.id, c.name]), test: (a, v) => a._u.companyId === v },
      { key: 'due', label: 'Plazo', options: [['7', 'Vence en ≤ 7 días']], test: a => !a.completedAt && !a.cancelled && daysLeft(a.dueAt) >= 0 && daysLeft(a.dueAt) <= 7 }
    ],
    columns: [
      { key: 'user', label: 'Trabajador', value: a => a._u.name, render: a => person(a._u, getCompany(a._u.companyId)?.name) },
      { key: 'planId', label: 'Plan', value: a => getPlan(a.planId)?.name, render: a => html`<b>${getPlan(a.planId)?.code}</b> ${getPlan(a.planId)?.name}` },
      { key: 'assignedAt', label: 'Asignada', render: a => date(a.assignedAt) },
      { key: 'dueAt', label: 'Plazo', render: a => !a.completedAt && !a.cancelled && daysLeft(a.dueAt) >= 0 && daysLeft(a.dueAt) <= 3 ? html`<b>${date(a.dueAt)}</b><br><small class="muted">en ${daysLeft(a.dueAt)} d</small>` : date(a.dueAt) },
      { key: '_pct', label: 'Avance', render: a => pctBar(a._pct) },
      { key: '_st', label: 'Estado', render: a => badge(STATUS[a._st][0], STATUS[a._st][1]) },
      { key: 'x', label: '', sort: false, align: 'right', render: a => `<span class="ak-actions">${assignmentActions(ctx, a)}</span>` }
    ],
    onRow: a => { if (!pool) ctx.go(`/trabajadores/${a.userId}`); }
  });
  el.querySelector('[data-t]').addEventListener('row-action', e => runAssignmentAction(ctx, e.detail.action, e.detail.row));
  el.querySelector('[data-new]').onclick = () => assignDialog(ctx, pool ? { pool: db.query('users', u => pool.has(u.id) && u.active !== false) } : {});
  el.querySelector('[data-csv]').onclick = () => { const l = t.filtered(); downloadCSV('asignaciones.csv', l.map(a => ({ trabajador: a._u.name, rut: a._u.rut, empresa: getCompany(a._u.companyId)?.name, plan: getPlan(a.planId)?.name, asignada: date(a.assignedAt), plazo: date(a.dueAt), avance: a._pct + '%', estado: STATUS[a._st][0], completada: a.completedAt ? date(a.completedAt) : '' }))); toast(`${l.length} filas exportadas`, 'success'); };
}
