import { escape, modal, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { patient, prevision, ageOf, statusBadge } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { openRx } from '../shared/docs.js';
import { fmtShort } from '../shared/dates.js';

export function renderMyPatients(v, _, __, { doc }) {
  const mine = {};
  db.query('appointments', a => a.doctorId === doc.id && a.status !== 'cancelada').forEach(a => { const m = mine[a.patientId] ||= { n: 0, last: '', next: '' }; m.n++; if (a.status === 'atendida' && a.date > m.last) m.last = a.date; if (['reservada', 'confirmada'].includes(a.status) && (!m.next || a.date < m.next)) m.next = a.date; });
  v.innerHTML = `${pageHead('Mis pacientes', `${Object.keys(mine).length} pacientes con citas contigo`)}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => Object.entries(mine).map(([id, m]) => ({ ...patient(id), ...m, age: ageOf(patient(id)?.birth) })).filter(p => p.id),
    search: p => `${p.name} ${p.rut}`,
    columns: [
      { key: 'name', label: 'Paciente', render: p => `<div class="cell-user"><span class="avatar" style="--size:32px">${escape(initials(p.name))}</span><span><b>${escape(p.name)}</b><small>${escape(p.rut)}</small></span></div>` },
      { key: 'age', label: 'Edad' }, { key: 'prevision', label: 'Previsión', render: p => escape(prevision(p.prevision).label) },
      { key: 'n', label: 'Citas' }, { key: 'last', label: 'Última atención', render: p => p.last ? escape(fmtShort(p.last)) : '—' },
      { key: 'next', label: 'Próxima', render: p => p.next ? escape(fmtShort(p.next)) : '—' },
      { key: 'id', label: '', sort: false, render: p => `<div class="acts-cell">${actBtn('hist', p.id, 'file', 'Ver historial')}</div>` }
    ],
    onRow: p => history(p.id), onAction: (_, id) => history(id),
    csv: { name: 'mis-pacientes.csv', map: p => ({ nombre: p.name, rut: p.rut, edad: p.age, citas: p.n, ultima: p.last, proxima: p.next }) }
  });
}
function history(id) {
  const p = patient(id), recs = db.query('records', r => r.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const appts = db.query('appointments', a => a.patientId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const m = modal({ title: `Historial · ${p.name}`, size: 'lg', body: `<p class="muted">${escape(p.rut)} · ${ageOf(p.birth)} años · ${escape(p.allergies ? 'Alergia: ' + p.allergies : 'Sin alergias')} · ${escape(p.chronic || 'Sin crónicas')}</p>
    <h3>Registros clínicos</h3>${recs.map(r => `<div class="appt-item"><div class="info"><b>${escape(fmtDate(r.date))} · ${escape(db.get('doctors', r.doctorId)?.name)}</b><span class="small">${r.diagnosis.map(x => `<code>${escape(x.code)}</code> ${escape(x.name)}`).join(', ')}</span><span class="muted small">${escape(r.anamnesis)}</span></div>${r.prescription?.length ? `<button class="btn btn-sm" data-rx="${r.id}">Receta</button>` : ''}</div>`).join('') || '<p class="muted">Sin registros.</p>'}
    <h3>Últimas citas</h3>${appts.map(a => `<div class="row between small" style="margin-bottom:6px"><span>${escape(fmtShort(a.date))} ${a.time} · ${escape(db.get('doctors', a.doctorId)?.name)}</span>${statusBadge(a.status)}</div>`).join('')}` });
  m.el.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => openRx(db.get('records', b.dataset.rx)));
}
