// Mensajes con apoderados y solicitudes de entrevista (profesor).
import { escape, date, toast, formModal } from '../../../assets/core/ui.js';
import { pageHead, badge, empty } from '../shared/kit.js';
import { renderChat, newThreadModal } from '../shared/chat.js';
import { teacherCourseIds, courseStudents, course, user, student, shortName } from '../shared/academic.js';
import { MEET_STATUS } from '../shared/school.js';

export function renderMessages(el, { db, me }) {
  el.innerHTML = `${pageHead('Mensajes', 'Comunicación directa con apoderados de tus cursos')}<div data-chat></div>`;
  const options = teacherCourseIds(me.id).flatMap(c => courseStudents(c).map(s => ({ value: `${s.guardianId}|${s.id}`, label: `${course(c).name} · ${s.firstName} ${s.lastName} → ${user(s.guardianId)?.name || 'apoderado'}` })));
  renderChat(el.querySelector('[data-chat]'), {
    me, threads: db.query('threads', t => t.teacherId === me.id), other: t => user(t.guardianId),
    newThread: onCreate => newThreadModal({ me, role: 'profesor', title: 'Mensaje a apoderado/a', options, onCreate })
  });
}

export function renderMeetings(el, { db, me }) {
  const list = db.query('meetings', m => m.teacherId === me.id).sort((a, b) => (a.status === 'solicitada' ? -1 : 1) - (b.status === 'solicitada' ? -1 : 1) || b.preferred.localeCompare(a.preferred));
  el.innerHTML = `${pageHead('Entrevistas', 'Solicitudes de entrevista de apoderados')}
    <div class="stack">${list.map(m => `<div class="card"><div class="row between"><div><b>${escape(user(m.guardianId)?.name || '')}</b> <span class="muted small">· apoderado/a de ${escape(shortName(student(m.studentId)))} (${escape(course(student(m.studentId)?.courseId).name)})</span><p class="mb-0" style="margin-top:6px">${escape(m.reason)}</p><span class="small muted">Fecha propuesta: ${date(m.preferred + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' })} · ${escape(m.slot)} hrs.</span>${m.reply ? `<div class="small" style="margin-top:6px">↳ ${escape(m.reply)}</div>` : ''}</div>
      <div class="stack" style="gap:6px;align-items:flex-end">${badge(...MEET_STATUS[m.status])}
        <div class="row" style="gap:6px">${m.status === 'solicitada' ? `<button class="btn btn-sm btn-primary" data-ok="${m.id}">Confirmar</button><button class="btn btn-sm btn-ghost" data-no="${m.id}">Rechazar</button>` : m.status === 'confirmada' ? `<button class="btn btn-sm" data-done="${m.id}">Marcar realizada</button>` : ''}</div></div></div></div>`).join('') || `<div class="card">${empty('Sin solicitudes de entrevista', '☕')}</div>`}</div>`;
  const act = async (id, status, label) => {
    const v = await formModal({ title: label, fields: [{ name: 'reply', label: 'Mensaje para el apoderado/a', type: 'textarea', value: status === 'confirmada' ? 'Confirmado. La espero en sala de profesores.' : status === 'rechazada' ? 'Lamentablemente no puedo en ese horario. ¿Podría proponer otra fecha?' : 'Gracias por asistir a la entrevista.' }], submit: label });
    if (!v) return;
    db.update('meetings', id, { status, reply: v.reply });
    db.log('entrevista', `Entrevista ${MEET_STATUS[status][0].toLowerCase()} por ${me.name}`, me.id);
    toast(`Entrevista ${MEET_STATUS[status][0].toLowerCase()}`, 'success');
  };
  el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => act(b.dataset.ok, 'confirmada', 'Confirmar entrevista'));
  el.querySelectorAll('[data-no]').forEach(b => b.onclick = () => act(b.dataset.no, 'rechazada', 'Rechazar entrevista'));
  el.querySelectorAll('[data-done]').forEach(b => b.onclick = () => act(b.dataset.done, 'realizada', 'Marcar como realizada'));
}
