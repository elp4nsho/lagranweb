// App del instructor: resumen, cursos con constructor de currículo, estudiantes, preguntas y ganancias.
import { mountShell } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { renderOverview } from './overview.js';
import { renderMyCourses, renderCourseEditor } from './courses.js';
import { renderStudents, renderQA, renderEarnings } from './people.js';

const me = () => auth.current()?.id;
const mine = () => new Set(db.query('courses', c => c.instructorId === me()).map(c => c.id));
mountShell({
  db, auth, brand: 'Faro Instructores', logo: '🎓', allow: ['instructor'],
  links: [{ href: 'index.html', label: 'Ver sitio público', ico: '🌐', blank: true }],
  sections: [
    { group: 'Instructor', path: '/', label: 'Resumen', ico: '📊', routes: { '/': renderOverview } },
    { group: 'Instructor', path: '/cursos', label: 'Mis cursos', ico: '📚', routes: { '/cursos': renderMyCourses, '/cursos/:id': renderCourseEditor } },
    { group: 'Instructor', path: '/estudiantes', label: 'Estudiantes', ico: '👥', routes: { '/estudiantes': renderStudents } },
    { group: 'Instructor', path: '/preguntas', label: 'Preguntas', ico: '💬', count: () => db.count('questions', q => mine().has(q.courseId) && !q.answers.length), routes: { '/preguntas': renderQA } },
    { group: 'Instructor', path: '/ganancias', label: 'Ganancias', ico: '💸', routes: { '/ganancias': renderEarnings } }
  ]
});
