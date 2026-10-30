import { escape, toast, confirm, time as fmtTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { patient, statusBadge, setStatus, prevision, ageOf, box, isActive } from '../shared/domain.js';
import { pageHead, statCard } from '../shared/shell.js';
import { ymd, fmtDay } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderToday(v, _, __, { doc }) {
  const today = ymd();
  const list = db.query('appointments', a => a.doctorId === doc.id && a.date === today && a.status !== 'cancelada').sort((a, b) => a.time.localeCompare(b.time));
  const waiting = list.filter(a => a.status === 'en_espera');
  const current = list.find(a => ['llamado', 'en_atencion'].includes(a.status));
  const done = list.filter(a => a.status === 'atendida').length;
  const waitMin = a => a.checkinAt ? Math.max(0, Math.round((Date.now() - new Date(a.checkinAt)) / 60000)) : null;
  v.innerHTML = `${pageHead(`Hola, ${doc.name.split(' ').slice(0, 2).join(' ')}`, `<span style="text-transform:capitalize">${escape(fmtDay(today))}</span> · ${escape(box(doc.boxId)?.name || '')}`,
    `<button class="btn btn-primary" data-next ${waiting.length ? '' : 'disabled'}>${icon('megaphone', 16)} Llamar siguiente${waiting.length ? ` (${waiting.length})` : ''}</button>`)}
  <div class="grid-4">${statCard('Citas hoy', list.length, '', 'calendar')}${statCard('Atendidos', done, '', 'check')}${statCard('En sala de espera', waiting.length, waiting.length ? `<span class="muted small">Espera máx. ${Math.max(...waiting.map(waitMin))} min</span>` : '', 'users')}${statCard('No asistieron', list.filter(a => a.status === 'no_show').length, '', 'x')}</div>
  ${current ? `<div class="card queue-item now"><span class="time">${current.time}</span><div class="who"><span class="eyebrow">${current.status === 'llamado' ? 'Llamado a box' : 'En atención'}</span><b>${escape(patient(current.patientId)?.name)}</b></div><a class="btn btn-primary" href="#/atencion/${current.id}">${icon('file', 16)} Abrir ficha</a></div>` : ''}
  <div class="card"><div class="card-title"><h3>Agenda y cola de hoy</h3><span class="muted small">Check-in en recepción actualiza esta lista en tiempo real</span></div>
    <div class="stack" style="gap:8px">${list.map(a => { const p = patient(a.patientId), w = waitMin(a); return `<div class="queue-item ${['llamado', 'en_atencion'].includes(a.status) ? 'now' : ''}">
      <span class="time">${a.time}</span>
      <div class="who"><b>${escape(p?.name)}</b><span class="muted small">${ageOf(p?.birth)} años · ${escape(prevision(a.prevision).label)}${a.reason ? ' · ' + escape(a.reason) : ''}</span>
        <div class="tag-list" style="margin-top:4px">${a.mode === 'tele' ? `<span class="badge badge-info">${icon('video', 12)} Tele</span>` : ''}${p?.allergies ? `<span class="badge badge-danger">Alergia: ${escape(p.allergies)}</span>` : ''}${p?.chronic ? `<span class="badge">${escape(p.chronic)}</span>` : ''}${a.status === 'en_espera' && w != null ? `<span class="badge badge-warning">${icon('clock', 12)} Llegó ${fmtTime(a.checkinAt)} · ${w} min</span>` : ''}</div></div>
      ${statusBadge(a.status)}
      <div class="acts-cell">
        ${a.status === 'en_espera' ? `<button class="btn btn-sm" data-call="${a.id}">${icon('megaphone', 14)} Llamar</button>` : ''}
        ${isActive(a) ? `<a class="btn btn-sm btn-primary" href="#/atencion/${a.id}">${a.mode === 'tele' ? icon('video', 14) + ' Sala' : icon('steth', 14) + ' Atender'}</a>` : ''}
        ${a.status === 'atendida' ? `<a class="btn btn-sm btn-ghost" href="#/atencion/${a.id}">${icon('file', 14)} Ficha</a>` : ''}
        ${['reservada', 'confirmada'].includes(a.status) ? `<button class="btn btn-sm btn-ghost" data-ns="${a.id}">No asistió</button>` : ''}
      </div></div>`; }).join('') || '<div class="empty">No tienes citas hoy.</div>'}</div></div>`;
  const call = a => { setStatus(a, 'llamado'); toast(`Llamando a ${patient(a.patientId)?.name} al ${box(doc.boxId)?.name}`, 'success'); };
  v.querySelector('[data-next]').onclick = () => waiting[0] && call(waiting[0]);
  v.querySelectorAll('[data-call]').forEach(b => b.onclick = () => call(db.get('appointments', b.dataset.call)));
  v.querySelectorAll('[data-ns]').forEach(b => b.onclick = async () => { if (await confirm('¿Marcar como no asistió?', { title: 'No-show', ok: 'Confirmar' })) setStatus(db.get('appointments', b.dataset.ns), 'no_show'); });
}
