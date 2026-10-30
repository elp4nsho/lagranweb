// Usuarios y roles (estudiantes, instructores, soporte, admin).
import { usersSection, escape } from '../shared/admin-kit.js';
import { db, ROLES } from '../data/db.js';

export function renderUsers(el, _p, ctx) {
  usersSection(el, ctx, {
    roles: ROLES, roleKinds: { admin: 'danger', soporte: 'warning', instructor: 'info', estudiante: 'primary' },
    subtitle: 'Admin: todo. Soporte: pedidos, reembolsos, reseñas y preguntas. Instructor: su app de cursos. Estudiante: aula y compras.',
    extraColumns: [{ key: 'stats', label: 'Actividad', sort: false, render: u => u.role === 'instructor' ? `${db.count('courses', c => c.instructorId === u.id)} cursos` : u.role === 'estudiante' ? `${db.count('enrollments', e => e.userId === u.id)} cursos · ${db.count('orders', o => o.userId === u.id)} pedidos` : '—' }],
    extraFields: u => [{ name: 'headline', label: 'Titular (instructores)', value: u?.headline || '' }]
  });
}
