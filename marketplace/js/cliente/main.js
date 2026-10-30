// App del cliente: pedidos con garantía, mensajes, proyectos y propuestas, favoritos y pagos.
import { bootRoleApp } from '../shared/roleapp.js';
import { renderOrder, renderInbox } from '../shared/orderview.js';
import { orderUnread } from '../shared/market.js';
import { renderSummary, renderOrders, renderFavorites, renderPayments } from './views.js';
import { renderMyBriefs } from './briefs.js';

bootRoleApp({
  roles: ['cliente'], sub: 'Cliente',
  pages: [
    { path: '/', label: 'Resumen', ico: '⌂', render: renderSummary },
    { path: '/pedidos', label: 'Mis pedidos', ico: '📦', render: renderOrders, count: ({ db, me }) => db.count('orders', o => o.clientId === me.id && o.status === 'entregado') },
    { path: '/mensajes', label: 'Mensajes', ico: '✉', render: (el, ctx) => renderInbox(el, ctx, ctx.db.query('orders', o => o.clientId === ctx.me.id), { orderHref: o => '#/pedidos/' + o.id }), count: ({ db, me }) => db.query('orders', o => o.clientId === me.id).filter(o => orderUnread(o, me.id)).length },
    { path: '/proyectos', label: 'Mis proyectos', ico: '📝', render: renderMyBriefs, count: ({ db, me }) => db.count('proposals', p => p.status === 'enviada' && db.get('briefs', p.briefId)?.clientId === me.id && db.get('briefs', p.briefId)?.status === 'abierto') },
    { path: '/favoritos', label: 'Favoritos', ico: '♥', render: renderFavorites },
    { path: '/pagos', label: 'Pagos', ico: '$', render: renderPayments }
  ],
  extraRoutes: { '/pedidos/:id': { label: 'Pedido', render: (el, ctx, { id }) => renderOrder(el, ctx, id, { back: '#/pedidos' }) } }
});
