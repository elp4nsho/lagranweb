// App del freelancer: servicios con paquetes y FAQ, pedidos, mensajes, propuestas, ganancias/retiros y perfil.
import { bootRoleApp } from '../shared/roleapp.js';
import { renderOrder, renderInbox } from '../shared/orderview.js';
import { orderUnread } from '../shared/market.js';
import { renderSummary, renderOrders } from './home.js';
import { renderGigs, renderGigEditor } from './gigs.js';
import { renderProposals } from './proposals.js';
import { renderEarnings, renderProfileEdit } from './earnings.js';

bootRoleApp({
  roles: ['freelancer'], sub: 'Freelancer',
  pages: [
    { path: '/', label: 'Resumen', ico: '⌂', render: renderSummary },
    { path: '/pedidos', label: 'Pedidos', ico: '📦', render: renderOrders, count: ({ db, me }) => db.count('orders', o => o.freelancerId === me.id && ['pendiente', 'revision'].includes(o.status)) },
    { path: '/servicios', label: 'Mis servicios', ico: '▦', render: renderGigs },
    { path: '/mensajes', label: 'Mensajes', ico: '✉', render: (el, ctx) => renderInbox(el, ctx, ctx.db.query('orders', o => o.freelancerId === ctx.me.id), { orderHref: o => '#/pedidos/' + o.id }), count: ({ db, me }) => db.query('orders', o => o.freelancerId === me.id).filter(o => orderUnread(o, me.id)).length },
    { path: '/proyectos', label: 'Proyectos y propuestas', ico: '📝', render: renderProposals },
    { path: '/ganancias', label: 'Ganancias', ico: '$', render: renderEarnings },
    { path: '/perfil', label: 'Mi perfil', ico: '☺', render: renderProfileEdit }
  ],
  extraRoutes: {
    '/pedidos/:id': { label: 'Pedido', render: (el, ctx, { id }) => renderOrder(el, ctx, id, { back: '#/pedidos' }) },
    '/servicios/:id': { label: 'Editar servicio', render: (el, ctx, { id }) => renderGigEditor(el, ctx, id) }
  }
});
