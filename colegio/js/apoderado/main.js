// App del apoderado: selector de pupilo + notas, asistencia, horario, tareas, anotaciones, comunicados, entrevistas, pagos y mensajes.
import { bootRoleApp } from '../shared/roleapp.js';
import { escape } from '../../../assets/core/ui.js';
import { renderSummary, renderGrades, renderAttendance, renderSchedule, renderHomework, renderAnnotations } from './academic.js';
import { renderComms, renderMeetings, renderPayments, renderMessages, unreadComms } from './school.js';

const kids = ({ db, me }) => (me.children || []).map(id => db.get('students', id)).filter(s => s && s.status === 'activo');
function childOf(ctx) {
  const list = kids(ctx);
  let id = ctx.state.child;
  if (!id) { try { id = localStorage.getItem('aula360:child:' + ctx.me.id); } catch (e) { id = null; } }
  if (!list.some(s => s.id === id)) id = list[0]?.id;
  ctx.state.child = id;
  return list.find(s => s.id === id) || null;
}
// Envuelve cada vista: pinta el selector de pupilo en la barra superior y entrega el estudiante activo.
const withChild = fn => (el, ctx, p, q) => {
  const list = kids(ctx), s = childOf(ctx);
  ctx.shell.topExtra.innerHTML = list.length > 1 ? `<label class="sr-only" for="child-sel">Pupilo</label><select class="select" id="child-sel" style="min-height:36px;padding-block:4px;max-width:200px">${list.map(k => `<option value="${k.id}" ${k.id === s.id ? 'selected' : ''}>${escape(k.firstName)} ${escape(k.lastName)}</option>`).join('')}</select>` : '';
  const sel = ctx.shell.topExtra.querySelector('select');
  if (sel) sel.onchange = () => { ctx.state.child = sel.value; try { localStorage.setItem('aula360:child:' + ctx.me.id, sel.value); } catch (e) { /* sin storage */ } ctx.refresh(); };
  if (!s) { el.innerHTML = '<div class="card empty">No tienes pupilos activos asociados. Contacta a secretaría.</div>'; return; }
  return fn(el, { ...ctx, child: s, kids: list }, p, q);
};

bootRoleApp({
  roles: ['apoderado'], sub: 'Apoderado/a',
  pages: [
    { path: '/', label: 'Resumen', ico: '⌂', render: withChild(renderSummary) },
    { path: '/notas', label: 'Notas', ico: '✓', render: withChild(renderGrades) },
    { path: '/asistencia', label: 'Asistencia', ico: '◔', render: withChild(renderAttendance) },
    { path: '/horario', label: 'Horario', ico: '⌚', render: withChild(renderSchedule) },
    { path: '/tareas', label: 'Tareas', ico: '✎', render: withChild(renderHomework) },
    { path: '/anotaciones', label: 'Anotaciones', ico: '★', render: withChild(renderAnnotations), count: ctx => ctx.db.count('annotations', a => (ctx.me.children || []).includes(a.studentId) && !a.seenByGuardian) },
    { path: '/comunicados', label: 'Comunicados', ico: '📣', render: withChild(renderComms), count: ctx => unreadComms(ctx).length },
    { path: '/mensajes', label: 'Mensajes', ico: '✉', render: withChild(renderMessages), count: ({ db, me }) => db.count('threads', t => t.guardianId === me.id && (t.unread || []).includes(me.id)) },
    { path: '/entrevistas', label: 'Entrevistas', ico: '☕', render: withChild(renderMeetings) },
    { path: '/pagos', label: 'Pagos', ico: '$', render: withChild(renderPayments), count: ({ db, me }) => db.count('payments', p => p.guardianId === me.id && (p.status === 'vencido' || p.status === 'pendiente')) }
  ]
});
