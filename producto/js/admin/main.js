// Panel de Aquilo: registra las secciones (una por módulo) con sus permisos por rol.
import { db, auth, STAFF, colors } from '../data/db.js';
import { mountAdmin } from '../shared/admin-kit.js';
import dashboard from './dashboard.js';
import orders from './orders.js';
import carts from './carts.js';
import reviews from './reviews.js';
import inventory from './inventory.js';
import cms from './cms.js';
import abtest from './abtest.js';
import coupons from './coupons.js';
import affiliates from './affiliates.js';
import automations from './automations.js';
import users from './users.js';
import activity from './activity.js';
import settings from './settings.js';

const sections = [dashboard, orders, carts, reviews, inventory, cms, abtest, coupons, affiliates, automations, users, activity, settings];

mountAdmin({
  db, auth, brand: 'Aquilo', logo: '💧', siteHref: 'index.html', siteLabel: 'Ver landing', sections, staffRoles: STAFF,
  notifications: () => {
    const u = auth.current(); if (!u) return [];
    const can = id => { const s = sections.find(x => x.id === id); return !s.roles || s.roles.includes(u.role); };
    const out = [];
    const paid = db.count('orders', o => o.status === 'pagado');
    if (paid && can('pedidos')) out.push({ tag: 'Pedidos', type: 'info', text: `${paid} pedido(s) pagados por preparar`, href: '#/pedidos' });
    const pend = db.count('reviews', r => r.status === 'pendiente');
    if (pend && can('resenas')) out.push({ tag: 'Reseñas', type: 'warning', text: `${pend} reseña(s) esperan moderación`, href: '#/resenas' });
    colors().filter(c => c.stock <= c.reorderAt).forEach(c => { if (can('inventario')) out.push({ tag: 'Stock', type: c.stock <= 0 ? 'danger' : 'warning', text: `${c.name}: ${c.stock} unidades (mínimo ${c.reorderAt})`, href: '#/inventario' }); });
    const aff = db.count('affiliates', a => a.status === 'pendiente');
    if (aff && can('afiliados')) out.push({ tag: 'Afiliados', type: 'primary', text: `${aff} postulación(es) de afiliado`, href: '#/afiliados' });
    return out;
  }
});
