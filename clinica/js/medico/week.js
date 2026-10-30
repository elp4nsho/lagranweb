import { escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { patient, isBlocked } from '../shared/domain.js';
import { openAppt } from '../shared/appt-ui.js';
import { pageHead } from '../shared/shell.js';
import { templateSlots } from '../shared/slots.js';
import { ymd, addDays, weekStart, parseYmd, DOW_S, MONTHS } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

let offset = 0;
export function renderWeek(v, _, __, { doc }) {
  const ws = addDays(weekStart(ymd()), offset * 7);
  const days = Array.from({ length: 6 }, (_, i) => addDays(ws, i));
  const times = templateSlots(doc.schedule);
  const appts = db.query('appointments', a => a.doctorId === doc.id && a.date >= ws && a.date <= days[5] && a.status !== 'cancelada');
  const at = (d, t) => appts.find(a => a.date === d && a.time === t);
  const total = appts.length, cap = times.length * days.filter(d => doc.schedule.days.includes(parseYmd(d).getDay())).length;
  const s = parseYmd(ws), e = parseYmd(days[5]);
  v.innerHTML = `${pageHead('Agenda semanal', `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} · ${total} citas de ${cap} cupos`,
    `<button class="btn btn-sm" data-w="-1">${icon('back', 14)}</button><button class="btn btn-sm" data-w="0">Hoy</button><button class="btn btn-sm" data-w="1">${icon('arrow', 14)}</button>`)}
  <div class="row small" style="gap:12px"><span class="badge badge-primary">Reservada</span><span class="badge badge-success">Atendida</span><span class="badge">Bloqueado</span><span class="muted">Clic en una cita para ver el detalle</span></div>
  <div class="card scroll-x"><div class="week-grid">
    <div></div>${days.map(d => { const x = parseYmd(d); return `<div class="h" ${d === ymd() ? 'style="color:var(--primary)"' : ''}>${DOW_S[x.getDay()]} ${x.getDate()}</div>`; }).join('')}
    ${times.map(t => `<div class="t">${t}</div>${days.map(d => {
      const works = doc.schedule.days.includes(parseYmd(d).getDay());
      if (!works) return '<div class="c none"></div>';
      const a = at(d, t);
      if (a) { const p = patient(a.patientId); return `<div class="c busy ${a.status === 'atendida' ? 'done' : ''}" data-a="${a.id}" title="${escape(p?.name)}"><b>${escape(p?.name.split(' ').slice(0, 2).join(' '))}</b>${a.mode === 'tele' ? ' · tele' : ''}</div>`; }
      return isBlocked(doc.id, d, t) ? '<div class="c blocked">Bloqueado</div>' : '<div class="c"></div>';
    }).join('')}`).join('')}
  </div></div>`;
  v.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { offset = +b.dataset.w === 0 ? 0 : offset + +b.dataset.w; renderWeek(v, _, __, { doc }); });
  v.querySelectorAll('[data-a]').forEach(c => c.onclick = () => openAppt(c.dataset.a));
}
