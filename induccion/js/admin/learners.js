// Trabajadores (personal propio y contratistas): CRUD, filtros, detalle con historial y acciones.
import { crud, person, badge, pctBar, pageHead, panel, dl, table, html, escape, toast, date, dateTime, confirm, formDialog } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { AREAS } from '../data/seed.js';
import { getCompany, getUser, getPlan, assignmentPct, assignmentStatus, STATUS, certStatus, CERT, notify } from '../data/model.js';
import { parseRut } from '../shared/rut.js';
import { assignDialog } from '../shared/assign.js';

const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#2563eb', '#db2777', '#0d9488'];
export function workerFields(u, { lockSupervisor } = {}) {
  const companies = db.query('companies', c => c.active !== false || c.id === u?.companyId);
  const sups = db.query('users', x => x.role === 'supervisor');
  return [
    { name: 'name', label: 'Nombre completo', required: true, half: true },
    { name: 'rut', label: 'RUT', required: true, half: true, placeholder: '12.345.678-5' },
    { name: 'email', label: 'Correo', type: 'email', required: true, half: true },
    { name: 'password', label: u ? 'Nuevo PIN (opcional)' : 'PIN de acceso', half: true, placeholder: '4 dígitos', value: u ? '' : '1234' },
    { name: 'companyId', label: 'Empresa', type: 'select', options: companies.map(c => [c.id, c.name]), half: true },
    { name: 'area', label: 'Área', type: 'select', options: AREAS, half: true },
    { name: 'cargo', label: 'Cargo', half: true },
    ...(lockSupervisor ? [] : [{ name: 'supervisorId', label: 'Supervisor(a)', type: 'select', options: [['', '—'], ...sups.map(s => [s.id, `${s.name} (${s.area})`])], half: true }]),
    { name: 'active', label: 'Activo (puede ingresar)', type: 'checkbox', value: true }
  ];
}
export function validateWorker(v, u) {
  const e = {};
  const r = parseRut(v.rut);
  if (!r.ok) e.rut = r.error; else { v.rut = r.value; if (db.find('users', x => x.rut === r.value && x.id !== u?.id)) e.rut = 'Ya existe una persona con ese RUT'; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Correo no válido';
  else if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u?.id)) e.email = 'Correo ya registrado';
  if (v.password && !/^\d{4}$/.test(v.password)) e.password = 'El PIN debe tener 4 dígitos';
  return e;
}
export function workerRecord(v, u, extra = {}) {
  const r = { ...v, role: 'trabajador', type: getCompany(v.companyId)?.kind === 'propia' ? 'empleado' : 'contratista', ...extra };
  if (!r.password) delete r.password;
  if (!u) r.color = COLORS[db.count('users') % COLORS.length];
  return r;
}

export const workerSummary = u => {
  const as = db.query('assignments', a => a.userId === u.id && !a.cancelled);
  const open = as.filter(a => !a.completedAt);
  const overdue = open.filter(a => assignmentStatus(a) === 'vencida').length;
  const certs = db.query('certificates', c => c.userId === u.id && ['vigente', 'por_vencer'].includes(certStatus(c))).length;
  const pct = open.length ? Math.round(open.reduce((s, a) => s + assignmentPct(a), 0) / open.length) : 100;
  return { open: open.length, overdue, certs, pct };
};

export function renderLearners(el, _p, ctx) {
  const companies = db.all('companies');
  crud(el, ctx, {
    key: 'workers', title: 'Trabajadores', subtitle: 'Personal propio y de empresas contratistas que realiza inducciones.', singular: 'trabajador', collection: 'users',
    rows: () => db.query('users', u => u.role === 'trabajador').map(u => ({ ...u, _s: workerSummary(u), _co: getCompany(u.companyId)?.name || '—' })),
    search: u => `${u.name} ${u.rut} ${u.email} ${u.cargo} ${u._co}`,
    filters: [
      { key: 'companyId', label: 'Empresa', options: companies.map(c => [c.id, c.name]) },
      { key: 'area', label: 'Área', options: AREAS },
      { key: 'type', label: 'Tipo', options: [['empleado', 'Personal propio'], ['contratista', 'Contratista']] },
      { key: 'cmp', label: 'Cumplimiento', options: [['overdue', 'Con vencidas'], ['open', 'Con pendientes'], ['ok', 'Al día']], test: (u, v) => v === 'overdue' ? u._s.overdue > 0 : v === 'open' ? u._s.open > 0 : u._s.open === 0 },
      { key: 'active', label: 'Estado', options: [['1', 'Activos'], ['0', 'Inactivos']], test: (u, v) => (u.active !== false) === (v === '1') }
    ],
    columns: [
      { key: 'name', label: 'Trabajador', render: u => person(u, u.rut) },
      { key: '_co', label: 'Empresa', render: u => html`${u._co}<br><small class="muted">${u.type === 'contratista' ? 'Contratista' : 'Propio'}</small>` },
      { key: 'area', label: 'Área / cargo', render: u => html`${u.area}<br><small class="muted">${u.cargo}</small>` },
      { key: 'pct', label: 'Avance', value: u => u._s.pct, render: u => u._s.open ? pctBar(u._s.pct) + (u._s.overdue ? ' ' + badge(`${u._s.overdue} vencida`, 'danger') : '') : badge('Al día', 'success') },
      { key: 'certs', label: 'Cert. vigentes', value: u => u._s.certs, align: 'center', render: u => String(u._s.certs) },
      { key: 'active', label: 'Estado', render: u => u.active === false ? badge('Inactivo', 'danger') : badge('Activo', 'success') }
    ],
    fields: u => workerFields(u), validate: validateWorker, toForm: u => ({ ...u, password: '' }), toRecord: workerRecord,
    beforeDelete: u => db.count('certificates', c => c.userId === u.id) ? 'Tiene certificados emitidos: desactívalo en lugar de eliminarlo.' : null,
    afterSave: (u, v, isNew) => { if (isNew) notify(u.id, 'Bienvenida a Inducción XR', 'Tu cuenta fue creada. Ingresa con tu RUT y PIN para ver tus inducciones.', 'info'); },
    rowActions: [{ act: 'assign', label: 'Asignar', short: '📌', run: u => assignDialog(ctx, { userIds: [u.id] }) }],
    onRow: u => ctx.go(`/trabajadores/${u.id}`),
    headActions: '<button class="btn" data-bulk>📌 Asignación masiva</button>',
    csv: u => ({ nombre: u.name, rut: u.rut, correo: u.email, empresa: u._co, tipo: u.type, area: u.area, cargo: u.cargo, supervisor: getUser(u.supervisorId)?.name || '', avance: u._s.pct + '%', vencidas: u._s.overdue, certificados_vigentes: u._s.certs, estado: u.active === false ? 'Inactivo' : 'Activo' })
  });
  el.querySelector('[data-bulk]').onclick = () => assignDialog(ctx);
}

export function assignmentActions(ctx, a) {
  return [
    !a.completedAt && !a.cancelled ? `<button class="btn btn-sm btn-ghost" data-act="extend" title="Extender plazo">⏩ Plazo</button>` : '',
    !a.completedAt && !a.cancelled ? `<button class="btn btn-sm btn-ghost" data-act="remind" title="Enviar recordatorio">🔔</button>` : '',
    !a.completedAt && !a.cancelled ? `<button class="btn btn-sm btn-ghost ak-danger" data-act="cancel" title="Cancelar asignación">✕</button>` : ''
  ].join('');
}
export async function runAssignmentAction(ctx, action, a) {
  const u = getUser(a.userId), plan = getPlan(a.planId);
  if (action === 'extend') {
    const v = await formDialog({ title: 'Extender plazo', fields: [{ name: 'days', label: 'Días adicionales desde hoy', type: 'number', value: 7, min: 1, required: true }], submit: 'Extender' });
    if (!v) return;
    const due = new Date(Math.max(Date.now(), new Date(a.dueAt)) + v.days * 864e5).toISOString();
    db.update('assignments', a.id, { dueAt: due });
    notify(a.userId, 'Plazo extendido', `Tu plazo para «${plan.name}» ahora vence el ${date(due)}.`, 'info');
    db.log('plazo extendido', `${u?.name} · ${plan.name}`, ctx.user.id); toast('Plazo extendido', 'success');
  }
  if (action === 'remind') { notify(a.userId, 'Recordatorio de inducción', `Tienes pendiente «${plan.name}» (vence el ${date(a.dueAt)}).`, 'warning'); db.log('recordatorio enviado', `${u?.name} · ${plan.name}`, ctx.user.id); toast(`Recordatorio enviado a ${u?.name}`, 'success'); }
  if (action === 'cancel') { if (!(await confirm(`¿Cancelar «${plan.name}» para ${u?.name}?`, { title: 'Cancelar asignación', ok: 'Cancelar asignación', danger: true }))) return; db.update('assignments', a.id, { cancelled: true }); db.log('asignación cancelada', `${u?.name} · ${plan.name}`, ctx.user.id); toast('Asignación cancelada', 'success'); }
}

export function renderLearner(el, { id }, ctx) {
  const u = db.get('users', id);
  if (!u || u.role !== 'trabajador') { el.innerHTML = '<div class="card empty"><h2>Trabajador no encontrado</h2><a class="btn btn-primary" href="#/trabajadores">Volver</a></div>'; return; }
  const s = workerSummary(u), co = getCompany(u.companyId);
  const as = db.query('assignments', a => a.userId === u.id).sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
  const at = db.query('attempts', t => t.userId === u.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  const cs = db.query('certificates', c => c.userId === u.id);
  el.innerHTML = `<a class="ak-back" href="#/trabajadores">← Trabajadores</a>` + pageHead(u.name, `${u.rut} · ${co?.name || ''} · ${u.cargo || ''}`, `<button class="btn" data-edit>✎ Editar</button><button class="btn btn-primary" data-assign>📌 Asignar inducción</button>`) +
    `<div class="ak-grid">
      ${panel('Ficha', dl([['Correo', escape(u.email)], ['Empresa', escape(co?.name || '—')], ['Tipo', u.type === 'contratista' ? 'Contratista' : 'Personal propio'], ['Área', escape(u.area)], ['Supervisor(a)', escape(getUser(u.supervisorId)?.name || '—')], ['Estado', u.active === false ? badge('Inactivo', 'danger') : badge('Activo', 'success')], ['Alta', date(u.createdAt)]]))}
      ${panel('Resumen', dl([['Inducciones abiertas', String(s.open)], ['Vencidas', s.overdue ? badge(String(s.overdue), 'danger') : '0'], ['Avance promedio', pctBar(s.pct)], ['Certificados vigentes', String(s.certs)], ['Intentos de evaluación', String(at.length)], ['Tiempo total', `${as.reduce((t, a) => t + Object.values(a.time || {}).reduce((x, y) => x + y, 0), 0)} min`]]))}
    </div>
    ${panel('Inducciones', '<div data-as></div>')}
    <div class="ak-grid">
      ${panel('Intentos de evaluación', at.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Plan</th><th>Puntaje</th><th>Resultado</th></tr></thead><tbody>${at.map(t => `<tr><td>${dateTime(t.at)}</td><td>${escape(getPlan(t.planId)?.code || '')}</td><td>${t.score}%</td><td>${badge(t.passed ? 'Aprobado' : 'Reprobado', t.passed ? 'success' : 'danger')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin intentos.</p>')}
      ${panel('Certificados', cs.length ? `<ul class="ak-list">${cs.map(c => { const st = certStatus(c); return `<li><div class="grow"><b>${escape(getPlan(c.planId)?.name || '')}</b><small><code>${escape(c.code)}</code> · vence ${date(c.expiresAt)}</small></div>${badge(CERT[st][0], CERT[st][1])}<a class="btn btn-sm btn-ghost" href="app.html#/certificado/${c.id}" target="_blank" rel="noopener">Ver</a></li>`; }).join('')}</ul>` : '<p class="muted">Sin certificados.</p>')}
    </div>`;
  const tEl = el.querySelector('[data-as]');
  table(tEl, {
    key: 'worker-as', rows: as, pageSize: 6,
    columns: [
      { key: 'planId', label: 'Plan', render: a => html`<b>${getPlan(a.planId)?.name || '—'}</b><br><small class="muted">Asignada ${date(a.assignedAt)} por ${getUser(a.assignedBy)?.name || '—'}</small>` },
      { key: 'dueAt', label: 'Plazo', render: a => date(a.dueAt) },
      { key: 'pct', label: 'Avance', value: a => assignmentPct(a), render: a => pctBar(assignmentPct(a)) },
      { key: 'st', label: 'Estado', value: a => assignmentStatus(a), render: a => { const [l, k] = STATUS[assignmentStatus(a)]; return badge(l, k); } },
      { key: 'x', label: '', sort: false, align: 'right', render: a => `<span class="ak-actions">${assignmentActions(ctx, a)}</span>` }
    ]
  });
  tEl.addEventListener('row-action', e => runAssignmentAction(ctx, e.detail.action, e.detail.row));
  el.querySelector('[data-assign]').onclick = () => assignDialog(ctx, { userIds: [u.id] });
  el.querySelector('[data-edit]').onclick = async () => {
    const v = await formDialog({ title: 'Editar trabajador', fields: workerFields(u), values: { ...u, password: '' }, validate: x => validateWorker(x, u) });
    if (!v) return;
    db.update('users', u.id, workerRecord(v, u)); db.log('trabajador editado', v.name, ctx.user.id); toast('Cambios guardados', 'success');
  };
}
