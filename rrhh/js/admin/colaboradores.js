// Colaboradores: CRUD con datos contractuales, desvinculación, ficha y CSV.
import { escape, toast, money, date, modal } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { personCell, empBadge, avatar, fmtRut, validRut, REQ_TYPES, reqBadge, EMP_STATUS } from '../shared/util.js';
import { AFP, ISAPRES, slipDetail } from '../shared/payroll.js';
import { vacationBalance, fmtDays, yearsOfService } from '../shared/vacation.js';
import { today } from '../shared/dates.js';
import { openPayslip, periodLabel } from '../shared/payslip.js';

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

function fields(db, e = {}) {
  const emps = db.query('employees', x => x.status !== 'desvinculado' && x.id !== e.id).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return [
    { name: 'html1', type: 'html', html: '<h3 style="margin:0">Datos personales</h3>' },
    { name: 'first', label: 'Nombres', required: true }, { name: 'last', label: 'Apellidos', required: true },
    { name: 'rut', label: 'RUT', required: true, placeholder: '12.345.678-5' }, { name: 'birth', label: 'Fecha de nacimiento', type: 'date', required: true },
    { name: 'email', label: 'Correo corporativo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' },
    { name: 'address', label: 'Dirección' }, { name: 'comuna', label: 'Comuna' },
    { name: 'html2', type: 'html', html: '<h3 style="margin:8px 0 0">Contrato</h3>' },
    { name: 'position', label: 'Cargo', required: true }, { name: 'deptId', label: 'Área', type: 'select', options: db.all('departments').map(d => [d.id, d.name]) },
    { name: 'managerId', label: 'Jefatura directa', type: 'select', options: [['', '— Sin jefatura —'], ...emps.map(x => [x.id, x.name])] },
    { name: 'location', label: 'Lugar de trabajo', type: 'select', options: ['Santiago · Casa matriz', 'Antofagasta', 'Concepción', 'Remoto'] },
    { name: 'contractType', label: 'Tipo de contrato', type: 'select', options: ['Indefinido', 'Plazo fijo', 'Honorarios'] }, { name: 'hireDate', label: 'Fecha de ingreso', type: 'date', required: true },
    { name: 'contractEnd', label: 'Término (plazo fijo)', type: 'date' }, { name: 'jornada', label: 'Jornada', type: 'select', options: ['42 horas', '30 horas (parcial)', '20 horas (parcial)', 'Turnos 4x4'] },
    { name: 'html3', type: 'html', html: '<h3 style="margin:8px 0 0">Remuneración y previsión</h3>' },
    { name: 'salary', label: 'Sueldo base (CLP)', type: 'number', required: true, min: 0, step: 1000 }, { name: 'afp', label: 'AFP', type: 'select', options: Object.keys(AFP) },
    { name: 'health', label: 'Salud', type: 'select', options: ISAPRES }, { name: 'healthUF', label: 'Plan Isapre (UF)', type: 'number', step: 0.01, min: 0 },
    { name: 'bank', label: 'Banco y cuenta' }, { name: 'emergency', label: 'Contacto de emergencia' }
  ];
}
export async function editEmployee(ctx, id) {
  const { db } = ctx, e = id ? db.get('employees', id) : null;
  const v = await formDialog({
    title: e ? `Editar a ${e.name}` : 'Nuevo colaborador', fields: fields(db, e || {}), size: 'lg',
    values: e || { deptId: 'd-tec', contractType: 'Indefinido', hireDate: today(), jornada: '42 horas', afp: 'Modelo', health: 'Fonasa', healthUF: 0, location: 'Santiago · Casa matriz', salary: 1200000 },
    validate: v => !validRut(v.rut) ? 'RUT inválido (revisa el dígito verificador)' : db.find('employees', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== id) ? 'Ya existe un colaborador con ese correo' : v.salary < 539000 && v.jornada === '42 horas' && v.contractType !== 'Honorarios' ? 'El sueldo base no puede ser menor al ingreso mínimo ($539.000)' : null
  });
  if (!v) return null;
  Object.keys(v).filter(k => k.startsWith('html')).forEach(k => delete v[k]);
  const data = { ...v, name: `${v.first.split(' ')[0]} ${v.last.split(' ')[0]}`, managerId: v.managerId || null, color: db.get('departments', v.deptId)?.color || '#3f51b5', contractEnd: v.contractType === 'Plazo fijo' ? v.contractEnd || null : null };
  if (e) {
    if (e.salary !== v.salary) db.insert('documents', { employeeId: id, name: `Anexo de contrato · reajuste a ${money(v.salary)}`, type: 'Anexo', date: today(), size: '88 KB', signed: false });
    db.update('employees', id, data); db.log('colaborador', `Editó la ficha de ${data.name}`, ctx.user.id); toast('Ficha actualizada', 'success'); return e;
  }
  const row = db.insert('employees', { ...data, level: 3, status: 'activo', exitDate: null, exitReason: '', vacCarry: 0, priorYears: 0 });
  db.insert('documents', { employeeId: row.id, name: `Contrato de trabajo · ${v.contractType}`, type: 'Contrato', date: v.hireDate, size: '210 KB', signed: false });
  db.log('colaborador', `Registró el ingreso de ${data.name} (${v.position})`, ctx.user.id);
  toast(`${data.name} registrado. Contrato pendiente de firma en su portal.`, 'success');
  return row;
}
async function terminate(ctx, id) {
  const { db } = ctx, e = db.get('employees', id);
  const v = await formDialog({ title: `Desvincular a ${e.name}`, submit: 'Registrar egreso', fields: [
    { name: 'exitDate', label: 'Fecha de término', type: 'date', required: true },
    { name: 'exitReason', label: 'Causal', type: 'select', options: ['Renuncia voluntaria', 'Mutuo acuerdo', 'Término de plazo fijo', 'Necesidades de la empresa', 'Conclusión del trabajo'] },
    { name: 'note', label: 'Observaciones', type: 'textarea', span: 2 }], values: { exitDate: today() } });
  if (!v) return;
  db.update('employees', id, { status: 'desvinculado', exitDate: v.exitDate, exitReason: v.exitReason });
  db.query('users', u => u.employeeId === id).forEach(u => db.update('users', u.id, { active: false }));
  db.insert('documents', { employeeId: id, name: `Finiquito · ${v.exitReason}`, type: 'Contrato', date: v.exitDate, size: '120 KB', signed: false });
  db.log('colaborador', `Registró el egreso de ${e.name} (${v.exitReason})`, ctx.user.id);
  toast('Egreso registrado: se desactivó su acceso al portal', 'success');
}

export function render(el, ctx) {
  const { db } = ctx;
  const depts = Object.fromEntries(db.all('departments').map(d => [d.id, d]));
  const rows = db.all('employees').map(e => ({ ...e, deptName: depts[e.deptId]?.name || '', mgr: db.get('employees', e.managerId)?.name || '' }));
  el.innerHTML = pageHead('Colaboradores', `${rows.filter(r => r.status !== 'desvinculado').length} activos · ${rows.filter(r => r.status === 'desvinculado').length} desvinculados`, '<button class="btn btn-primary" data-act="new">＋ Nuevo colaborador</button>') + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'colab', rows, sort: 'name', pageSize: 12, placeholder: 'Nombre, RUT, cargo, correo…',
    search: r => `${r.name} ${r.last} ${r.rut} ${r.position} ${r.email} ${r.deptName}`,
    filters: [
      { key: 'dept', label: 'Área', options: Object.values(depts).map(d => [d.id, d.name]), test: (r, v) => r.deptId === v },
      { key: 'status', label: 'Estado', options: Object.entries(EMP_STATUS).map(([k, v]) => [k, v[0]]), test: (r, v) => r.status === v },
      { key: 'ct', label: 'Contrato', options: [['Indefinido', 'Indefinido'], ['Plazo fijo', 'Plazo fijo'], ['Honorarios', 'Honorarios']], test: (r, v) => r.contractType === v }
    ],
    columns: [
      { key: 'name', label: 'Colaborador', render: r => personCell(r) },
      { key: 'rut', label: 'RUT', render: r => `<span class="nowrap">${escape(r.rut)}</span>` },
      { key: 'deptName', label: 'Área' },
      { key: 'contractType', label: 'Contrato', render: r => `${escape(r.contractType)}<br><small class="muted">desde ${escape(date(r.hireDate + 'T12:00'))}</small>` },
      { key: 'salary', label: 'Sueldo base', render: r => money(r.salary) },
      { key: 'status', label: 'Estado', render: r => empBadge(r.status) },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('view', r.id, 'Ver')}${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${r.status !== 'desvinculado' ? actBtn('exit', r.id, '⏏', 'btn-ghost', 'Desvincular') : actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    onRow: r => ctx.go(`/colaboradores/${r.id}`),
    csv: { filename: 'colaboradores.csv', map: r => ({ rut: r.rut, nombres: r.first, apellidos: r.last, cargo: r.position, area: r.deptName, jefatura: r.mgr, contrato: r.contractType, ingreso: r.hireDate, sueldo_base: r.salary, afp: r.afp, salud: r.health, estado: EMP_STATUS[r.status]?.[0], egreso: r.exitDate || '' }) }
  });
  onActs(el, {
    new: () => editEmployee(ctx), view: id => ctx.go(`/colaboradores/${id}`), edit: id => editEmployee(ctx, id), exit: id => terminate(ctx, id),
    del: id => { const e = db.get('employees', id); confirmDelete(`la ficha de ${e.name} y su historial`, () => { ['requests', 'payslips', 'marks', 'documents', 'reviews', 'onboarding'].forEach(c => db.query(c, x => x.employeeId === id).forEach(x => db.remove(c, x.id))); db.remove('employees', id); }, { db, user: ctx.user, log: `Eliminó la ficha de ${e.name}` }); }
  });
}

export function renderDetail(el, ctx, { id }) {
  const { db } = ctx, e = db.get('employees', id);
  if (!e) { el.innerHTML = '<div class="card empty">Colaborador no encontrado. <a href="#/colaboradores">Volver</a></div>'; return; }
  const d = db.get('departments', e.deptId), mgr = db.get('employees', e.managerId);
  const bal = vacationBalance(db, e, db.getValue('policy'));
  const slips = db.query('payslips', p => p.employeeId === id).sort((a, b) => b.period.localeCompare(a.period));
  const reqs = db.query('requests', r => r.employeeId === id).sort((a, b) => b.from.localeCompare(a.from)).slice(0, 8);
  const docs = db.query('documents', x => x.employeeId === id);
  const yrs = yearsOfService(e);
  el.innerHTML = `${pageHead(`${e.first} ${e.last}`, `${escape(e.position)} · ${escape(d?.name || '')}`, `<a class="btn btn-ghost" href="#/colaboradores">← Volver</a><button class="btn" data-act="edit" data-id="${id}">✎ Editar</button>${e.status !== 'desvinculado' ? `<button class="btn btn-danger" data-act="exit" data-id="${id}">Desvincular</button>` : ''}`)}
    <div class="dash-grid">
      <div class="card span-4 stack"><div class="row" style="flex-wrap:nowrap">${avatar(e, 64)}<div><b style="font-size:18px">${escape(e.name)}</b><div>${empBadge(e.status)}</div></div></div>
        <dl class="kv"><dt>RUT</dt><dd>${escape(e.rut)}</dd><dt>Nacimiento</dt><dd>${escape(date(e.birth + 'T12:00'))}</dd><dt>Correo</dt><dd>${escape(e.email)}</dd><dt>Teléfono</dt><dd>${escape(e.phone)}</dd><dt>Dirección</dt><dd>${escape(e.address)}, ${escape(e.comuna)}</dd><dt>Emergencia</dt><dd>${escape(e.emergency || '—')}</dd><dt>Banco</dt><dd>${escape(e.bank || '—')}</dd></dl></div>
      <div class="card span-4"><h3>Contrato</h3><dl class="kv"><dt>Tipo</dt><dd>${escape(e.contractType)}${e.contractEnd ? ` hasta ${escape(date(e.contractEnd + 'T12:00'))}` : ''}</dd><dt>Ingreso</dt><dd>${escape(date(e.hireDate + 'T12:00'))} (${yrs.toFixed(1).replace('.', ',')} años)</dd><dt>Jornada</dt><dd>${escape(e.jornada)}</dd><dt>Lugar</dt><dd>${escape(e.location)}</dd><dt>Jefatura</dt><dd>${mgr ? `<a href="#/colaboradores/${mgr.id}">${escape(mgr.name)}</a>` : '—'}</dd><dt>Sueldo base</dt><dd><b>${money(e.salary)}</b></dd><dt>AFP</dt><dd>${escape(e.afp)}</dd><dt>Salud</dt><dd>${escape(e.health)}${e.healthUF ? ` · ${String(e.healthUF).replace('.', ',')} UF` : ''}</dd>${e.exitDate ? `<dt>Egreso</dt><dd>${escape(date(e.exitDate + 'T12:00'))} · ${escape(e.exitReason)}</dd>` : ''}</dl></div>
      <div class="card span-4"><h3>Vacaciones</h3><div class="balance"><span class="big">${String(bal.available).replace('.', ',')}</span><span class="muted">días disponibles</span></div><dl class="kv" style="margin-top:10px"><dt>Derecho anual</dt><dd>${bal.entitlement} días</dd><dt>Usados</dt><dd>${fmtDays(bal.used)}</dd><dt>Pendientes</dt><dd>${fmtDays(bal.pending)}</dd></dl></div>
      <div class="card span-6"><h3>Liquidaciones</h3>${slips.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>Periodo</th><th>Líquido</th><th></th></tr></thead><tbody>${slips.map(s => `<tr><td>${escape(periodLabel(s.period))}</td><td>${money(slipDetail(s).liquido)}</td><td class="right"><button class="btn btn-sm" data-slip="${s.id}">Ver</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin liquidaciones.</p>'}</div>
      <div class="card span-6"><h3>Solicitudes</h3>${reqs.map(r => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${REQ_TYPES[r.type].ico} ${escape(REQ_TYPES[r.type].label)} · ${escape(r.from)} → ${escape(r.to)} (${r.days} d)</span>${reqBadge(r.status)}</div>`).join('') || '<p class="muted">Sin solicitudes.</p>'}</div>
      <div class="card span-12"><h3>Documentos</h3>${docs.map(x => `<div class="doc-row"><span class="ico">📄</span><div class="info"><b>${escape(x.name)}</b><small>${escape(x.type)} · ${escape(x.date)}</small></div>${x.signed ? '<span class="badge badge-success">Firmado</span>' : '<span class="badge badge-warning">Pendiente de firma</span>'}</div>`).join('') || '<p class="muted">Sin documentos.</p>'}</div>
    </div>`;
  onActs(el, { edit: () => editEmployee(ctx, id), exit: () => terminate(ctx, id) });
  el.querySelectorAll('[data-slip]').forEach(b => b.onclick = () => { const s = db.get('payslips', b.dataset.slip); openPayslip(s, e, d); });
}
export { fmtRut, slug, modal };
