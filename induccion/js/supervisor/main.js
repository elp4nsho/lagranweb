// App del supervisor: avance de su equipo, asignaciones, evaluaciones prácticas y vencimientos.
import { mountShell, crud, kpis, panel, pageHead, person, badge, pctBar, html, escape, ago, date } from '../shared/admin-kit.js';
import { barChart } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { AREAS } from '../data/seed.js';
import { getCompany, getPlan, certStatus, assignmentStatus, rate } from '../data/model.js';
import { workerFields, validateWorker, workerRecord, workerSummary, renderLearner } from '../admin/learners.js';
import { renderAssignments } from '../admin/assignments.js';
import { practicalTable } from '../admin/evaluations.js';
import { renderCertificates } from '../admin/certificates.js';
import { assignDialog } from '../shared/assign.js';

const team = () => db.query('users', u => u.role === 'trabajador' && u.supervisorId === auth.current()?.id);
const pool = () => new Set(team().map(u => u.id));

function renderHome(el, _p, ctx) {
  const ws = team(), ids = pool();
  const as = db.query('assignments', a => ids.has(a.userId) && !a.cancelled);
  const done = as.filter(a => a.completedAt).length;
  const pending = as.filter(a => a.practical?.status === 'pendiente');
  const overdue = as.filter(a => assignmentStatus(a) === 'vencida');
  const expiring = db.query('certificates', c => ids.has(c.userId) && certStatus(c) === 'por_vencer');
  const members = ws.map(u => ({ u, s: workerSummary(u) })).sort((a, b) => a.s.pct - b.s.pct);
  const unread = db.query('notifications', n => n.userId === ctx.user.id).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);
  el.innerHTML = pageHead(`Mi equipo · ${ctx.user.area}`, `Hola, ${ctx.user.name.split(' ')[0]}. Así va la inducción de las ${ws.length} personas a tu cargo.`, '<button class="btn btn-primary" data-assign>📌 Asignar inducción</button>') +
    kpis([
      { label: 'Personas a cargo', value: String(ws.length), hint: `${ws.filter(u => u.type === 'contratista').length} contratistas` },
      { label: 'Finalización del equipo', value: rate(done, as.length) + '%', hint: `${done} de ${as.length}` },
      { label: 'Prácticas por aprobar', value: String(pending.length), delta: pending.length ? 'Requieren tu evaluación' : 'Sin pendientes', up: !pending.length },
      { label: 'Asignaciones vencidas', value: String(overdue.length), up: !overdue.length, delta: overdue.length ? 'Haz seguimiento' : 'Al día' },
      { label: 'Certificados por vencer', value: String(expiring.length) }
    ]) +
    `<div class="ak-grid">
      ${panel('Avance por persona (menor a mayor)', `<div class="mini-bars">${members.slice(0, 10).map(({ u, s }) => `<div class="row"><span title="${escape(u.name)}">${escape(u.name)}</span><span class="progress"><i style="--v:${s.pct}%"></i></span><b class="small">${s.open ? s.pct + '%' : '✓'}</b></div>`).join('')}</div>`, '<a class="btn btn-sm btn-ghost" href="#/equipo">Ver equipo →</a>')}
      ${panel('Estado de las inducciones del equipo', barChart(['pendiente', 'en_curso', 'practica', 'vencida', 'completada'].map(k => ({ label: { pendiente: 'Pend.', en_curso: 'En curso', practica: 'Práctica', vencida: 'Vencidas', completada: 'Listas' }[k], value: as.filter(a => assignmentStatus(a) === k).length })), { height: 180 }))}
    </div>
    <div class="ak-grid">
      ${panel('Evaluaciones prácticas pendientes', pending.length ? `<ul class="ak-list">${pending.map(a => `<li>${person(db.get('users', a.userId), getPlan(a.planId)?.name)}<span class="grow"></span><a class="btn btn-sm btn-primary" href="#/practicas">Evaluar</a></li>`).join('')}</ul>` : '<p class="muted">No hay evaluaciones prácticas pendientes.</p>')}
      ${panel('Mis avisos', unread.length ? `<ul class="ak-list">${unread.map(n => `<li><div class="grow"><b>${escape(n.title)}</b><small>${escape(n.text)}</small></div><span class="small muted">${ago(n.at)}</span></li>`).join('')}</ul>` : '<p class="muted">Sin avisos.</p>')}
    </div>`;
  el.querySelector('[data-assign]').onclick = () => assignDialog(ctx, { pool: ws.filter(u => u.active !== false) });
}

function renderTeam(el, _p, ctx) {
  crud(el, ctx, {
    key: 'team', title: 'Mi equipo', subtitle: 'Personas a tu cargo. Puedes registrar nuevos integrantes (por ejemplo, contratistas que llegan a tu área).', singular: 'integrante', collection: 'users',
    rows: () => team().map(u => ({ ...u, _s: workerSummary(u), _co: getCompany(u.companyId)?.name || '—' })),
    search: u => `${u.name} ${u.rut} ${u.cargo} ${u._co}`,
    filters: [
      { key: 'type', label: 'Tipo', options: [['empleado', 'Personal propio'], ['contratista', 'Contratista']] },
      { key: 'cmp', label: 'Cumplimiento', options: [['overdue', 'Con vencidas'], ['open', 'Con pendientes'], ['ok', 'Al día']], test: (u, v) => v === 'overdue' ? u._s.overdue > 0 : v === 'open' ? u._s.open > 0 : u._s.open === 0 }
    ],
    columns: [
      { key: 'name', label: 'Integrante', render: u => person(u, u.rut) },
      { key: '_co', label: 'Empresa / cargo', render: u => html`${u._co}<br><small class="muted">${u.cargo}</small>` },
      { key: 'pct', label: 'Avance', value: u => u._s.pct, render: u => u._s.open ? pctBar(u._s.pct) + (u._s.overdue ? ' ' + badge('Vencida', 'danger') : '') : badge('Al día', 'success') },
      { key: 'certs', label: 'Cert. vigentes', value: u => u._s.certs, align: 'center', render: u => String(u._s.certs) },
      { key: 'active', label: 'Estado', render: u => u.active === false ? badge('Inactivo', 'danger') : badge('Activo', 'success') }
    ],
    fields: u => workerFields(u, { lockSupervisor: true }), validate: validateWorker, toForm: u => ({ ...u, password: '' }),
    toRecord: (v, u) => workerRecord(v, u, { supervisorId: ctx.user.id }),
    canDelete: false,
    rowActions: [{ act: 'assign', label: 'Asignar', short: '📌', run: u => assignDialog(ctx, { userIds: [u.id] }) }],
    onRow: u => ctx.go(`/trabajadores/${u.id}`),
    csv: u => ({ nombre: u.name, rut: u.rut, empresa: u._co, cargo: u.cargo, avance: u._s.pct + '%', vencidas: u._s.overdue, certificados: u._s.certs })
  });
}

function guardMember(el, p, ctx) {
  if (!pool().has(p.id)) { el.innerHTML = '<div class="card empty"><span class="icon">🔒</span><h2>Fuera de tu equipo</h2><p>Solo puedes ver a las personas a tu cargo.</p><a class="btn btn-primary" href="#/equipo">Mi equipo</a></div>'; return; }
  renderLearner(el, p, ctx);
  el.querySelector('.ak-back')?.setAttribute('href', '#/equipo');
}

function renderPractical(el, _p, ctx) {
  el.innerHTML = pageHead('Evaluaciones prácticas', 'Evalúa en terreno a quienes aprobaron la teoría. Al aprobar se emite su certificado automáticamente.') + '<div data-t></div>';
  practicalTable(el.querySelector('[data-t]'), ctx, { pool: pool(), key: 'sup-practical' });
}

function renderNotices(el, _p, ctx) {
  const list = db.query('notifications', n => n.userId === ctx.user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  el.innerHTML = pageHead('Avisos', 'Notificaciones del sistema sobre tu equipo.', list.some(n => !n.read) ? '<button class="btn" data-read>Marcar todo como leído</button>' : '') +
    `<div class="card">${list.length ? `<ul class="ak-list">${list.map(n => `<li>${badge(n.read ? 'Leído' : 'Nuevo', n.read ? '' : n.kind || 'info')}<div class="grow"><b>${escape(n.title)}</b><small>${escape(n.text)}</small></div><span class="small muted">${date(n.at)}</span></li>`).join('')}</ul>` : '<div class="empty">Sin avisos.</div>'}</div>`;
  el.querySelector('[data-read]')?.addEventListener('click', () => list.filter(n => !n.read).forEach(n => db.update('notifications', n.id, { read: true })));
}

mountShell({
  db, auth, brand: 'Supervisor', logo: '🦺', allow: ['supervisor'],
  links: [{ href: 'index.html', label: 'Ver sitio público', ico: '🌐', blank: true }],
  sections: [
    { group: 'Equipo', path: '/', label: 'Resumen', ico: '📊', routes: { '/': renderHome } },
    { group: 'Equipo', path: '/equipo', label: 'Mi equipo', ico: '👷', routes: { '/equipo': renderTeam, '/trabajadores/:id': guardMember, '/trabajadores': renderTeam } },
    { group: 'Equipo', path: '/asignaciones', label: 'Asignaciones', ico: '📌', count: () => db.count('assignments', a => pool().has(a.userId) && assignmentStatus(a) === 'vencida'), routes: { '/asignaciones': (el, p, ctx) => renderAssignments(el, p, ctx, { pool: pool(), key: 'sup-as', title: 'Asignaciones del equipo', sub: 'Asigna inducciones con plazo y haz seguimiento.' }) } },
    { group: 'Equipo', path: '/practicas', label: 'Evaluaciones prácticas', ico: '✅', count: () => db.count('assignments', a => pool().has(a.userId) && a.practical?.status === 'pendiente'), routes: { '/practicas': renderPractical } },
    { group: 'Equipo', path: '/vencimientos', label: 'Certificados', ico: '📜', count: () => db.count('certificates', c => pool().has(c.userId) && certStatus(c) === 'por_vencer'), routes: { '/vencimientos': (el, p, ctx) => renderCertificates(el, p, ctx, { pool: pool(), key: 'sup-certs' }) } },
    { group: 'Cuenta', path: '/avisos', label: 'Avisos', ico: '🔔', count: () => db.count('notifications', n => n.userId === auth.current()?.id && !n.read), routes: { '/avisos': renderNotices } }
  ]
});
