import { escape, money, toast, confirm, formModal, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { PREVISIONES, PREV_TYPES } from '../data/catalog.js';
import { pageHead, kv } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { doctor, patient, specialty, statusBadge, prevType, prevision, ageOf, findPatientByRut } from '../shared/domain.js';
import { openAppt, newApptModal } from '../shared/appt-ui.js';
import { openRx, openExam } from '../shared/docs.js';
import { validRut, fmtRut } from '../shared/rut.js';
import { fmtShort, ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

const fields = (p = {}) => [
  { name: 'name', label: 'Nombre completo', required: true, value: p.name },
  { name: 'rut', label: 'RUT', required: true, value: p.rut, placeholder: '12.345.678-5' },
  { name: 'birth', label: 'Fecha de nacimiento', type: 'date', value: p.birth },
  { name: 'sex', label: 'Sexo', type: 'select', options: [['F', 'Femenino'], ['M', 'Masculino'], ['', 'Otro / no informa']], value: p.sex },
  { name: 'prevision', label: 'Previsión', type: 'select', options: PREVISIONES.map(x => [x.id, x.label]), value: p.prevision || 'fonasa-b' },
  { name: 'phone', label: 'Teléfono', value: p.phone }, { name: 'email', label: 'Correo', type: 'email', value: p.email },
  { name: 'allergies', label: 'Alergias', value: p.allergies }, { name: 'chronic', label: 'Enfermedades crónicas', value: p.chronic }
];

export async function editPatient(p) {
  const v = await formModal({ title: p ? `Editar ${p.name}` : 'Nuevo paciente', fields: fields(p || {}), size: 'lg' });
  if (!v) return null;
  if (!validRut(v.rut)) { toast('RUT inválido', 'error'); return null; }
  v.rut = fmtRut(v.rut);
  const dup = findPatientByRut(v.rut);
  if (dup && dup.id !== p?.id) { toast('Ya existe un paciente con ese RUT', 'error'); return null; }
  const row = p ? db.update('patients', p.id, v) : db.insert('patients', v);
  db.log('paciente', `${p ? 'Editado' : 'Creado'}: ${row.name}`, auth.current()?.id);
  toast(p ? 'Paciente actualizado' : 'Paciente creado', 'success');
  return row;
}

export function renderPatients(v) {
  const counts = {}; const last = {};
  db.all('appointments').forEach(a => { counts[a.patientId] = (counts[a.patientId] || 0) + 1; if (a.status === 'atendida' && (!last[a.patientId] || a.date > last[a.patientId])) last[a.patientId] = a.date; });
  v.innerHTML = `${pageHead('Pacientes', `${db.count('patients')} fichas registradas`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo paciente</button>`)}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('patients').map(p => ({ ...p, age: ageOf(p.birth), n: counts[p.id] || 0, last: last[p.id] || '' })),
    search: p => `${p.name} ${p.rut} ${p.email} ${p.phone}`,
    filters: [
      { key: 'ptype', label: 'Previsión', options: Object.entries(PREV_TYPES), test: (p, val) => prevType(p.prevision) === val },
      { key: 'group', label: 'Grupo', options: [['ninos', 'Menores de 18'], ['adultos', 'Adultos'], ['mayores', '65 o más'], ['cronicos', 'Con enfermedad crónica']], test: (p, val) => val === 'ninos' ? p.age < 18 : val === 'adultos' ? p.age >= 18 && p.age < 65 : val === 'mayores' ? p.age >= 65 : !!p.chronic }
    ],
    columns: [
      { key: 'name', label: 'Paciente', render: p => `<div class="cell-user"><span class="avatar" style="--size:32px">${escape(initials(p.name))}</span><span><b>${escape(p.name)}</b><small>${escape(p.email || '')}</small></span></div>` },
      { key: 'rut', label: 'RUT' }, { key: 'age', label: 'Edad', render: p => p.age === '' ? '—' : p.age + ' años' },
      { key: 'prevision', label: 'Previsión', render: p => escape(prevision(p.prevision).label) },
      { key: 'n', label: 'Citas' }, { key: 'last', label: 'Última atención', render: p => p.last ? escape(fmtShort(p.last)) : '—' },
      { key: 'id', label: '', sort: false, render: p => `<div class="acts-cell">${actBtn('view', p.id, 'eye', 'Ver ficha')}${actBtn('edit', p.id, 'edit', 'Editar')}${actBtn('del', p.id, 'trash', 'Eliminar')}</div>` }
    ],
    onRow: p => location.hash = `#/pacientes/${p.id}`,
    onAction: async (act, id) => {
      const p = patient(id);
      if (act === 'view') location.hash = `#/pacientes/${id}`;
      if (act === 'edit') editPatient(p);
      if (act === 'del') {
        const n = db.count('appointments', a => a.patientId === id);
        if (n) return toast(`No se puede eliminar: ${p.name} tiene ${n} citas e historial clínico`, 'warning');
        if (await confirm(`¿Eliminar la ficha de ${p.name}?`, { title: 'Eliminar paciente', danger: true, ok: 'Eliminar' })) { db.remove('patients', id); db.log('paciente', `Eliminado: ${p.name}`, auth.current()?.id); toast('Paciente eliminado', 'success'); }
      }
    },
    csv: { name: 'pacientes.csv', map: p => ({ nombre: p.name, rut: p.rut, nacimiento: p.birth, prevision: prevision(p.prevision).label, telefono: p.phone, correo: p.email, citas: p.n, ultima_atencion: p.last }) }
  });
  v.querySelector('[data-new]').onclick = () => editPatient(null);
}

export function renderPatient(v, { id }) {
  const p = patient(id);
  if (!p) { v.innerHTML = '<div class="card empty">Paciente no encontrado. <a href="#/pacientes">Volver</a></div>'; return; }
  const appts = db.query('appointments', a => a.patientId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const recs = db.query('records', r => r.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const exams = db.query('exams', e => e.patientId === id);
  const fam = db.query('patients', x => x.holderId === id || (p.holderId && (x.id === p.holderId || (x.holderId === p.holderId && x.id !== id))));
  const acc = db.find('users', u => u.patientId === id);
  const spent = appts.filter(a => a.paid).reduce((s, a) => s + a.price, 0);
  v.innerHTML = `${pageHead(p.name, `<a href="#/pacientes">${icon('back', 14)} Pacientes</a>`, `<button class="btn" data-edit>${icon('edit', 16)} Editar</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva cita</button>`)}
  <div class="grid-main">
    <div class="stack">
      <div class="card"><div class="card-title"><h3>Citas (${appts.length})</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Profesional</th><th>Estado</th><th>Valor</th></tr></thead><tbody>
        ${appts.slice(0, 15).map(a => `<tr data-appt="${a.id}" style="cursor:pointer"><td class="nowrap"><span style="text-transform:capitalize">${escape(fmtShort(a.date))}</span> ${a.time}</td><td>${escape(doctor(a.doctorId)?.name)}<br><small class="muted">${escape(specialty(a.specialtyId)?.name)}</small></td><td>${statusBadge(a.status)}</td><td>${money(a.price)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sin citas</td></tr>'}
        </tbody></table></div></div>
      <div class="card"><div class="card-title"><h3>Ficha clínica · atenciones</h3></div>
        ${recs.map(r => `<div class="appt-item"><div class="info"><b>${escape(fmtDate(r.date))} · ${escape(doctor(r.doctorId)?.name)}</b><span class="small">${r.diagnosis.map(x => `<code>${escape(x.code)}</code> ${escape(x.name)}`).join(', ')}</span><span class="muted small">${escape(r.anamnesis)}</span></div>${r.prescription?.length ? `<button class="btn btn-sm" data-rx="${r.id}">${icon('pill', 14)} Receta</button>` : ''}</div>`).join('') || '<div class="empty">Sin registros clínicos.</div>'}</div>
    </div>
    <div class="stack">
      <div class="card">${kv([['RUT', escape(p.rut)], ['Edad', p.birth ? `${ageOf(p.birth)} años (${escape(fmtDate(p.birth))})` : '—'], ['Previsión', escape(prevision(p.prevision).label)], ['Teléfono', escape(p.phone)], ['Correo', escape(p.email)], ['Alergias', p.allergies ? `<span class="badge badge-danger">${escape(p.allergies)}</span>` : 'No refiere'], ['Crónicas', escape(p.chronic || '—')], ['Cuenta portal', acc ? `<span class="badge badge-success">${escape(acc.email)}</span>` : 'Sin cuenta'], ['Total pagado', money(spent)]])}</div>
      <div class="card"><h3>Grupo familiar</h3>${fam.length ? fam.map(x => `<div class="cell-user" style="margin-bottom:8px"><span class="avatar" style="--size:30px">${escape(initials(x.name))}</span><span><a href="#/pacientes/${x.id}"><b>${escape(x.name)}</b></a><small>${escape(x.relation || 'Titular')}</small></span></div>`).join('') : '<p class="muted mb0">Sin cargas asociadas.</p>'}</div>
      <div class="card"><h3>Exámenes</h3>${exams.map(e => `<div class="row between" style="margin-bottom:8px"><span><b>${escape(e.type)}</b><br><small class="muted">Folio ${e.folio} · ${escape(fmtDate(e.date))}</small></span>${e.status === 'disponible' ? `<button class="btn btn-sm" data-exam="${e.id}">Ver</button>` : '<span class="badge badge-warning">En proceso</span>'}</div>`).join('') || '<p class="muted mb0">Sin exámenes.</p>'}</div>
    </div>
  </div>`;
  v.querySelector('[data-edit]').onclick = () => editPatient(p);
  v.querySelector('[data-new]').onclick = () => newApptModal({ patientId: id });
  v.querySelectorAll('[data-appt]').forEach(tr => tr.onclick = () => openAppt(tr.dataset.appt));
  v.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => openRx(db.get('records', b.dataset.rx)));
  v.querySelectorAll('[data-exam]').forEach(b => b.onclick = () => openExam(db.get('exams', b.dataset.exam)));
}
