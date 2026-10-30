// Panel de administración (admin y soporte). Soporte solo ve pedidos, reseñas, preguntas y bitácora.
import { mountShell, activitySection } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { renderDashboard } from './dashboard.js';
import { renderReviewQueue } from './review.js';
import { renderCourses, renderCategories } from './courses.js';
import { renderOrders } from './orders.js';
import { renderCoupons } from './coupons.js';
import { renderPayouts } from './payouts.js';
import { renderReviews, renderQuestions } from './moderation.js';
import { renderSite } from './site.js';
import { renderUsers } from './users.js';

const ADMIN = ['admin'];
mountShell({
  db, auth, brand: 'Faro Admin', logo: '🗼', allow: ['admin', 'soporte'],
  links: [{ href: 'index.html', label: 'Ver sitio público', ico: '🌐', blank: true }],
  sections: [
    { group: 'General', path: '/', label: 'Dashboard', ico: '📊', routes: { '/': renderDashboard } },
    { group: 'Catálogo', path: '/revision', label: 'Revisión de cursos', ico: '🧐', roles: ADMIN, count: () => db.count('courses', c => c.status === 'revision'), routes: { '/revision': renderReviewQueue } },
    { group: 'Catálogo', path: '/cursos', label: 'Cursos', ico: '📚', roles: ADMIN, routes: { '/cursos': renderCourses } },
    { group: 'Catálogo', path: '/categorias', label: 'Categorías', ico: '🏷', roles: ADMIN, routes: { '/categorias': renderCategories } },
    { group: 'Ventas', path: '/pedidos', label: 'Pedidos y reembolsos', ico: '🧾', count: () => db.count('orders', o => o.status === 'reembolso_solicitado'), routes: { '/pedidos': renderOrders } },
    { group: 'Ventas', path: '/cupones', label: 'Cupones', ico: '🎟', roles: ADMIN, routes: { '/cupones': renderCoupons } },
    { group: 'Ventas', path: '/pagos', label: 'Pagos a instructores', ico: '💸', roles: ADMIN, count: () => db.count('payouts', p => p.status === 'pendiente'), routes: { '/pagos': renderPayouts } },
    { group: 'Comunidad', path: '/resenas', label: 'Reseñas', ico: '⭐', count: () => db.count('reviews', r => r.status === 'pendiente' || (r.reported && r.status === 'publicada')), routes: { '/resenas': renderReviews } },
    { group: 'Comunidad', path: '/preguntas', label: 'Preguntas', ico: '💬', routes: { '/preguntas': renderQuestions } },
    { group: 'Sistema', path: '/usuarios', label: 'Usuarios y roles', ico: '🔐', roles: ADMIN, routes: { '/usuarios': renderUsers } },
    { group: 'Sistema', path: '/sitio', label: 'Sitio (CMS)', ico: '🖼', roles: ADMIN, routes: { '/sitio': renderSite } },
    { group: 'Sistema', path: '/actividad', label: 'Bitácora', ico: '🕑', routes: { '/actividad': activitySection } }
  ]
});
