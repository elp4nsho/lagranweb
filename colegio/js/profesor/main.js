// App del profesor: cursos, libro de clases, notas, tareas, anotaciones, mensajes y entrevistas.
import { bootRoleApp } from '../shared/roleapp.js';
import { renderHome, renderSchedule } from './home.js';
import { renderCourses, renderCourse } from './courses.js';
import { renderClassbook } from './classbook.js';
import { renderGradebook } from './gradebook.js';
import { renderHomework, renderHomeworkDetail } from './homework.js';
import { renderAnnotations } from './annotations.js';
import { renderMessages, renderMeetings } from './messages.js';

bootRoleApp({
  roles: ['profesor'], sub: 'Docente',
  pages: [
    { path: '/', label: 'Inicio', ico: '⌂', render: renderHome },
    { path: '/cursos', label: 'Mis cursos', ico: '▦', render: renderCourses },
    { path: '/libro', label: 'Libro de clases', ico: '📘', render: renderClassbook },
    { path: '/notas', label: 'Notas', ico: '✓', render: renderGradebook, count: ({ db, me }) => db.count('evaluations', e => e.teacherId === me.id && e.status === 'pendiente') },
    { path: '/tareas', label: 'Tareas', ico: '✎', render: renderHomework },
    { path: '/anotaciones', label: 'Anotaciones', ico: '★', render: renderAnnotations },
    { path: '/mensajes', label: 'Mensajes', ico: '✉', render: renderMessages, count: ({ db, me }) => db.count('threads', t => t.teacherId === me.id && (t.unread || []).includes(me.id)) },
    { path: '/entrevistas', label: 'Entrevistas', ico: '☕', render: renderMeetings, count: ({ db, me }) => db.count('meetings', m => m.teacherId === me.id && m.status === 'solicitada') },
    { path: '/horario', label: 'Mi horario', ico: '⌚', render: renderSchedule }
  ],
  extraRoutes: {
    '/cursos/:id': { label: 'Curso', render: renderCourse },
    '/tareas/:id': { label: 'Tarea', render: renderHomeworkDetail }
  }
});
