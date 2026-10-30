// Vistas del cliente: resumen, pedidos, favoritos y pagos.
import { escape, money, date, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, statCard, smartTable, badge, empty, avatar } from '../shared/kit.js';
import { user, gig, ORDER_STATUS, ESCROW, statusBadge, gigCard, orderUnread, PKG_NAMES } from '../shared/market.js';
import { wireFavs } from '../public/favs.js';

const ACTIVE = ['pendiente', 'en_progreso', 'entregado', 'revision', 'disputa'];

export function renderSummary(el, { db, me }) {
  const orders = db.query('orders', o => o.clientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = orders.filter(o => ACTIVE.includes(o.status));
  const toApprove = orders.filter(o => o.status === 'entregado');
  const held = active.reduce((a, o) => a + o.total, 0);
  const spent = orders.filter(o => o.status === 'completado').reduce((a, o) => a + o.total, 0);
  el.innerHTML = `
    ${pageHead(`Hola, ${me.name.split(' ')[0]}`, me.company ? escape(me.company) : 'Tu espacio de cliente', '<a class="btn btn-primary btn-sm" href="index.html#/servicios">Explorar servicios</a><a class="btn btn-sm" href="index.html#/proyectos/nuevo">Publicar proyecto</a>')}
    ${toApprove.length ? `<a class="notice warn" href="#/pedidos/${toApprove[0].id}" style="display:block;text-decoration:none;color:inherit">📦 Tienes ${toApprove.length} entrega(s) esperando tu aprobación.</a>` : ''}
    <div class="kpi-row">${statCard('Pedidos activos', active.length)}${statCard('En garantía', money(held), 'fondos retenidos')}${statCard('Pedidos completados', orders.filter(o => o.status === 'completado').length)}${statCard('Invertido en Gremio', money(spent))}</div>
    <div class="card"><div class="card-head"><h3>Pedidos activos</h3><a class="small" href="#/pedidos">Ver todos</a></div>
      <ul class="list">${active.map(o => { const f = user(o.freelancerId); const un = orderUnread(o, me.id); return `<li>${avatar(f, 36)}<a href="#/pedidos/${o.id}" style="flex:1;min-width:0;color:inherit;text-decoration:none"><b>${escape(o.title)}</b><br><span class="small muted">${escape(f?.name || '')} · entrega ${date(o.due)}</span></a>${un ? badge(un + ' nuevo' + (un > 1 ? 's' : ''), 'primary') : ''}${statusBadge(ORDER_STATUS, o.status)}</li>`; }).join('') || `<li>${empty('No tienes pedidos activos')}</li>`}</ul></div>`;
}

export function renderOrders(el, { db, me, router }) {
  const rows = db.query('orders', o => o.clientId === me.id).map(o => ({ ...o, fname: user(o.freelancerId)?.name || '', unread: orderUnread(o, me.id) }));
  el.innerHTML = `${pageHead('Mis pedidos', `${rows.length} pedidos`, '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'c-orders', rows, search: r => r.code + r.title + r.fname,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(ORDER_STATUS).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'createdAt', label: 'Fecha', render: r => `<span class="nowrap small">${date(r.createdAt)}</span>` },
      { key: 'title', label: 'Servicio', render: r => `<b>${escape(r.title)}</b>${r.unread ? ' ' + badge(r.unread + ' msj', 'primary') : ''}<div class="small muted">${escape(r.code)} · ${escape(r.fname)} · ${PKG_NAMES[r.pkg] || ''}</div>` },
      { key: 'total', label: 'Total', render: r => money(r.total) },
      { key: 'status', label: 'Estado', render: r => statusBadge(ORDER_STATUS, r.status) },
      { key: 'escrow', label: 'Garantía', render: r => statusBadge(ESCROW, r.escrow) }
    ],
    onRow: r => router.go('/pedidos/' + r.id)
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('mis-pedidos.csv', rows.map(r => ({ codigo: r.code, fecha: r.createdAt.slice(0, 10), servicio: r.title, freelancer: r.fname, total: r.total, estado: ORDER_STATUS[r.status][0] })));
}

export function renderFavorites(el, { db, me }) {
  const favs = (me.favorites || []).map(id => db.get('gigs', id)).filter(g => g && g.status === 'activo');
  el.innerHTML = `${pageHead('Favoritos', `${favs.length} servicios guardados`)}<div class="gig-grid" data-favs>${favs.map(g => gigCard(g, { fav: true })).join('') || `<div class="card" style="grid-column:1/-1">${empty('Aún no guardas servicios. Toca ♡ en cualquier servicio.', '♡')}<p style="text-align:center"><a class="btn btn-primary" href="index.html#/servicios">Explorar</a></p></div>`}</div>`;
  wireFavs(el);
  void gig;
}

export function renderPayments(el, { db, me }) {
  const rows = db.query('orders', o => o.clientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = `${pageHead('Pagos', 'Historial de cargos y estado de la garantía')}
    <div class="kpi-row">${statCard('Total pagado', money(rows.reduce((a, o) => a + o.total, 0)))}${statCard('Retenido en garantía', money(rows.filter(o => o.escrow === 'retenido').reduce((a, o) => a + o.total, 0)))}${statCard('Reembolsado', money(rows.filter(o => o.escrow === 'reembolsado').reduce((a, o) => a + o.total, 0) + rows.filter(o => o.escrow === 'parcial').reduce((a, o) => a + o.total * (o.refundPct || 50) / 100, 0)))}</div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Pedido</th><th>Precio</th><th>Cargo servicio</th><th>Total</th><th>Garantía</th></tr></thead><tbody>
    ${rows.map(o => `<tr><td class="small nowrap">${date(o.createdAt)}</td><td><a href="#/pedidos/${o.id}">${escape(o.code)}</a><div class="small muted">${escape(o.title)}</div></td><td>${money(o.price)}</td><td>${money(o.serviceFee)}</td><td><b>${money(o.total)}</b></td><td>${statusBadge(ESCROW, o.escrow)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
