import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { discipline, branch, klass, member, occupancy, bookingsOf, classStart, bookingBadge, statusBadge } from '../shared/domain.js';
import { pageHead, statCard } from '../shared/shell.js';
import { weekDays } from '../shared/timetable.js';
import { ymd, fmtDay, fmtShort, parseYmd, DOW } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderMyClasses(v, _, __, { t }) {
  const days = weekDays(0), today = ymd();
  const mine = db.query('classes', c => c.trainerId === t.id && c.active !== false);
  const todays = mine.filter(c => c.day === parseYmd(today).getDay()).sort((a, b) => a.time.localeCompare(b.time));
  const hist = db.query('sessions', s => mine.some(c => c.id === s.classId));
  const avgOcc = hist.length ? Math.round(hist.reduce((s, x) => s + x.booked / klass(x.classId).capacity, 0) / hist.length * 100) : 0;
  const avgAtt = hist.length ? Math.round(hist.reduce((s, x) => s + x.attended / Math.max(1, x.booked), 0) / hist.length * 100) : 0;
  v.innerHTML = `${pageHead(`Hola, ${t.name.split(' ')[0]}`, `<span style="text-transform:capitalize">${escape(fmtDay(today))}</span> · Sede ${escape(branch(t.branchId)?.name)}`)}
  <div class="grid-4">${statCard('Clases esta semana', mine.length, '', 'calendar')}${statCard('Clases hoy', todays.length, '', 'clock')}${statCard('Ocupación promedio', avgOcc + '%', '<span class="muted small">últimas 2 semanas</span>', 'users')}${statCard('Asistencia real', avgAtt + '%', '<span class="muted small">de los reservados</span>', 'check')}</div>
  <div class="card"><div class="card-title"><h3>Hoy</h3></div>${todays.map(c => row(c, today)).join('') || '<div class="empty">No tienes clases hoy.</div>'}</div>
  <div class="card"><h3>Resto de la semana</h3>${days.filter(d => d > today).map(d => { const l = mine.filter(c => c.day === parseYmd(d).getDay()).sort((a, b) => a.time.localeCompare(b.time)); return l.length ? `<h4 class="muted" style="text-transform:capitalize;font-family:var(--font-body);font-size:13px;margin:14px 0 8px;letter-spacing:0">${escape(fmtShort(d))}</h4>${l.map(c => row(c, d)).join('')}` : ''; }).join('') || '<p class="muted">Sin más clases esta semana.</p>'}</div>`;
}
function row(c, date) {
  const d = discipline(c.disciplineId), o = occupancy(c, date), past = classStart(c, date) < new Date();
  return `<div class="queue-item" style="margin-bottom:8px;border-left:4px solid ${d.color}"><span class="time">${c.time}</span><div class="who"><b>${escape(d.name)}</b><span class="muted small">${escape(branch(c.branchId)?.name)} · ${escape(c.room)} · ${c.duration} min</span>
    <div class="progress" style="margin-top:6px;max-width:260px"><i style="--v:${Math.min(100, o.pct)}%"></i></div></div>
    <span class="badge ${o.free ? 'badge-primary' : 'badge-warning'}">${o.taken}/${c.capacity}${o.wait ? ` +${o.wait} espera` : ''}</span>
    <a class="btn btn-sm ${past ? '' : 'btn-primary'}" href="#/clase/${c.id}/${date}">${icon('check', 14)} Asistencia</a></div>`;
}

export function renderAttendance(v, { id, date }, _, { t, user }) {
  const c = klass(id);
  if (!c) { v.innerHTML = '<div class="card empty">Clase no encontrada</div>'; return; }
  const d = discipline(c.disciplineId), list = bookingsOf(c.id, date).sort((a, b) => (a.status === 'espera') - (b.status === 'espera'));
  const o = occupancy(c, date);
  v.innerHTML = `${pageHead(`${d.name} · ${c.time}`, `<a href="#/">${icon('back', 14)} Mis clases</a> · <span style="text-transform:capitalize">${escape(fmtDay(date))}</span> · ${escape(branch(c.branchId)?.name)} · ${o.taken}/${c.capacity} cupos`, `<button class="btn" data-allp>${icon('check', 16)} Marcar todos presentes</button><button class="btn btn-primary" data-walk>${icon('plus', 16)} Agregar socio</button>`)}
  <div class="card"><div class="stack" style="gap:8px">${list.map(b => { const m = member(b.memberId); return `<div class="queue-item"><span class="avatar" style="--size:36px;--av:${m?.color}">${escape(initials(m?.name || ''))}</span><div class="who"><b>${escape(m?.name)}</b><span class="muted small">${m?.code} · ${statusBadge(m?.status)}</span></div>${bookingBadge(b.status)}
    <div class="acts-cell">${b.status !== 'espera' ? `<button class="btn btn-sm ${b.status === 'asistio' ? 'btn-primary' : ''}" data-st="asistio" data-id="${b.id}">Presente</button><button class="btn btn-sm ${b.status === 'ausente' ? 'btn-danger' : ''}" data-st="ausente" data-id="${b.id}">Ausente</button>` : `<button class="btn btn-sm" data-st="reservada" data-id="${b.id}">Dar cupo</button>`}</div></div>`; }).join('') || '<div class="empty">Nadie ha reservado esta clase todavía.</div>'}</div></div>`;
  v.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { db.update('bookings', b.dataset.id, { status: b.dataset.st }); });
  v.querySelector('[data-allp]').onclick = () => { list.filter(b => b.status === 'reservada').forEach(b => db.update('bookings', b.id, { status: 'asistio' })); db.log('asistencia', `${t.name} marcó asistencia ${d.name} ${date}`, user.id); toast('Asistencia registrada', 'success'); };
  v.querySelector('[data-walk]').onclick = async () => {
    const r = await formModal({ title: 'Agregar socio a la clase', submit: 'Agregar', fields: [{ name: 'q', label: 'Código o nombre del socio', placeholder: 'TF-10001', required: true }] });
    if (!r) return;
    const q = r.q.trim().toLowerCase();
    const m = db.find('members', x => x.code.toLowerCase() === q || x.name.toLowerCase().includes(q));
    if (!m) return toast('Socio no encontrado', 'error');
    if (list.some(b => b.memberId === m.id)) return toast('Ya está en la lista', 'info');
    db.insert('bookings', { classId: c.id, date, memberId: m.id, status: 'asistio', walkIn: true }); toast(`${m.name} agregado como presente`, 'success');
  };
}
