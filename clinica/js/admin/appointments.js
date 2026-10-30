import { escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { STATUS, PREV_TYPES } from '../data/catalog.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { doctor, patient, specialty, statusBadge, prevType, prevision, activeSpecialties } from '../shared/domain.js';
import { openAppt, newApptModal } from '../shared/appt-ui.js';
import { ymd, addDays, fmtShort } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderAppointments(v, _, query) {
  const today = ymd();
  const kpi = s => db.count('appointments', a => a.date === today && (s ? a.status === s : a.status !== 'cancelada'));
  v.innerHTML = `${pageHead('Citas', 'Agenda de todo el centro: estados, cobros y reprogramaciones.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva cita</button>`)}
    <div class="row" style="gap:8px">
      <span class="badge badge-primary">Hoy: ${kpi()}</span><span class="badge badge-warning">En espera: ${kpi('en_espera')}</span>
      <span class="badge badge-info">En atención: ${kpi('en_atencion')}</span><span class="badge badge-success">Atendidas: ${kpi('atendida')}</span><span class="badge badge-danger">No-show: ${kpi('no_show')}</span>
    </div>
    <div class="card" data-list></div>`;
  const rows = () => db.all('appointments').map(a => {
    const p = patient(a.patientId), d = doctor(a.doctorId);
    return { ...a, when: a.date + ' ' + a.time, pname: p?.name || '—', prut: p?.rut || '', dname: d?.name || '—', sname: specialty(a.specialtyId)?.name || '' };
  }).sort((a, b) => a.when.localeCompare(b.when));
  listView(v.querySelector('[data-list]'), {
    rows, pageSize: 12,
    search: r => `${r.code} ${r.pname} ${r.prut} ${r.dname}`,
    filters: [
      { key: 'period', label: 'Periodo', value: 'hoy', options: [['hoy', 'Hoy'], ['manana', 'Mañana'], ['prox7', 'Próximos 7 días'], ['pasadas30', 'Últimos 30 días'], ['todas', 'Todas']],
        test: (r, val) => val === 'hoy' ? r.date === today : val === 'manana' ? r.date === addDays(today, 1) : val === 'prox7' ? r.date >= today && r.date <= addDays(today, 7) : val === 'pasadas30' ? r.date < today && r.date >= addDays(today, -30) : true },
      { key: 'status', label: 'Estado', options: Object.entries(STATUS).map(([k, s]) => [k, s.label]) },
      { key: 'specialtyId', label: 'Especialidad', options: activeSpecialties().map(s => [s.id, s.name]) },
      { key: 'doctorId', label: 'Profesional', options: db.all('doctors').map(d => [d.id, d.name]) },
      { key: 'prev', label: 'Previsión', options: Object.entries(PREV_TYPES), test: (r, val) => prevType(r.prevision) === val }
    ],
    columns: [
      { key: 'when', label: 'Fecha', render: r => `<span class="nowrap"><b class="mono">${r.time}</b> <small class="muted" style="text-transform:capitalize">${escape(fmtShort(r.date))}</small></span>` },
      { key: 'code', label: 'Código', render: r => `<span class="mono">${r.code}</span>` },
      { key: 'pname', label: 'Paciente', render: r => `<b>${escape(r.pname)}</b><br><small class="muted">${escape(r.prut)}</small>` },
      { key: 'dname', label: 'Profesional', render: r => `${escape(r.dname)}<br><small class="muted">${escape(r.sname)}</small>` },
      { key: 'mode', label: 'Modalidad', render: r => r.mode === 'tele' ? `<span class="badge badge-info">Tele</span>` : 'Presencial' },
      { key: 'price', label: 'Valor', render: r => `${money(r.price)}<br><small class="muted">${escape(prevision(r.prevision).label.replace('Fonasa · ', 'Fonasa '))}</small>` },
      { key: 'status', label: 'Estado', render: r => `${statusBadge(r.status)}${r.paid ? ' <span class="badge badge-success plain">$</span>' : ''}` },
      { key: 'id', label: '', sort: false, render: r => `<div class="acts-cell">${actBtn('open', r.id, 'eye', 'Ver detalle')}</div>` }
    ],
    onRow: r => openAppt(r.id),
    onAction: (act, id) => act === 'open' && openAppt(id),
    csv: { name: `citas-${today}.csv`, map: r => ({ codigo: r.code, fecha: r.date, hora: r.time, paciente: r.pname, rut: r.prut, profesional: r.dname, especialidad: r.sname, modalidad: r.mode, prevision: prevision(r.prevision).label, valor: r.price, pagado: r.paid ? 'sí' : 'no', estado: STATUS[r.status]?.label }) }
  });
  v.querySelector('[data-new]').onclick = () => newApptModal();
  if (query.nueva) { history.replaceState(null, '', '#/citas'); newApptModal(); }
}
