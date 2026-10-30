// Resumen del freelancer (ganancias, nivel de vendedor) y listado de pedidos entrantes.
import { escape, money, date, lineChart, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, statCard, smartTable, badge, empty, avatar } from '../shared/kit.js';
import { user, ORDER_STATUS, ESCROW, statusBadge, levelOf, LEVELS, balanceOf, net, settings, orderUnread, PKG_NAMES } from '../shared/market.js';

export function levelCard(fid) {
  const lv = levelOf(fid), s = lv.stats, keys = Object.keys(LEVELS);
  const req = lv.req;
  const bar = (label, cur, goal, fmt = v => v) => `<div class="hbar"><div class="row between small"><span>${label}</span><b>${fmt(cur)} / ${fmt(goal)}</b></div><div class="progress ${cur >= goal ? 'success' : ''}"><i style="--v:${Math.min(100, goal ? cur / goal * 100 : 100)}%"></i></div></div>`;
  return `<div class="card"><div class="card-head"><h3>Nivel de vendedor</h3><span class="badge badge-primary">${LEVELS[lv.level]}</span></div>
    <div class="level-steps">${keys.map(k => `<span class="${keys.indexOf(k) <= keys.indexOf(lv.level) ? 'on' : ''}">${LEVELS[k]}</span>`).join('')}</div>
    ${req ? `<p class="small muted" style="margin:12px 0 8px">Para llegar a <b>${LEVELS[lv.next]}</b>:</p><div class="hbars">${bar('Pedidos completados', s.done, req.orders)}${bar('Valoración promedio', +s.rating.toFixed(2), req.rating, v => String(v).replace('.', ','))}</div>` : '<p class="small" style="margin-top:12px">🏆 ¡Alcanzaste el nivel máximo!</p>'}
    <p class="small muted mb-0" style="margin-top:10px">Entregas a tiempo: <b>${Math.round(s.onTime * 100)}%</b> · Reseñas: <b>${s.reviews}</b></p></div>`;
}

export function renderSummary(el, { db, me }) {
  const orders = db.query('orders', o => o.freelancerId === me.id);
  const bal = balanceOf(me.id);
  const months = [];
  for (let i = 7; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const series = months.map(m => ({ label: new Date(m + '-15').toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), value: orders.filter(o => o.status === 'completado' && (o.completedAt || '').startsWith(m)).reduce((a, o) => a + net(o), 0) }));
  const incoming = orders.filter(o => ['pendiente', 'en_progreso', 'revision', 'entregado', 'disputa'].includes(o.status)).sort((a, b) => a.due.localeCompare(b.due));
  el.innerHTML = `
    ${pageHead(`Hola, ${me.name.split(' ')[0]}`, escape(me.title || ''), '<a class="btn btn-primary btn-sm" href="#/servicios/nuevo">+ Nuevo servicio</a><a class="btn btn-sm" href="#/proyectos">Buscar proyectos</a>')}
    ${me.verified ? '' : '<div class="notice warn">Tu identidad aún no está verificada. Los clientes confían más en perfiles verificados (lo revisa el equipo de Gremio).</div>'}
    <div class="kpi-row">${statCard('Disponible para retiro', money(bal.available), `<a href="#/ganancias">Retirar</a>`)}${statCard('En garantía', money(bal.pending), 'se libera al aprobar el cliente')}${statCard('Pedidos activos', incoming.length)}${statCard('Ganado en total', money(bal.released), `comisión Gremio ${settings().commissionPct}%`)}</div>
    <div class="split">
      <div class="card"><h3>Ganancias netas por mes</h3>${lineChart(series, { format: money })}</div>
      ${levelCard(me.id)}
    </div>
    <div class="card"><div class="card-head"><h3>Pedidos en curso</h3><a class="small" href="#/pedidos">Ver todos</a></div><ul class="list">${incoming.map(o => { const c = user(o.clientId), un = orderUnread(o, me.id); return `<li>${avatar(c, 36)}<a href="#/pedidos/${o.id}" style="flex:1;min-width:0;color:inherit;text-decoration:none"><b>${escape(o.title)}</b><br><span class="small muted">${escape(c?.name || '')} · entrega ${date(o.due)} · ${money(net(o))}</span></a>${un ? badge(un + ' msj', 'primary') : ''}${statusBadge(ORDER_STATUS, o.status)}</li>`; }).join('') || `<li>${empty('Sin pedidos en curso')}</li>`}</ul></div>`;
}

export function renderOrders(el, { db, me, router }) {
  const rows = db.query('orders', o => o.freelancerId === me.id).map(o => ({ ...o, cname: user(o.clientId)?.name || '', netAmt: net(o), unread: orderUnread(o, me.id) }));
  el.innerHTML = `${pageHead('Pedidos', `${rows.filter(r => r.status === 'pendiente').length} nuevos por aceptar`, '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'f-orders', rows, search: r => r.code + r.title + r.cname,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(ORDER_STATUS).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'createdAt', label: 'Fecha', render: r => `<span class="nowrap small">${date(r.createdAt)}</span>` },
      { key: 'title', label: 'Pedido', render: r => `<b>${escape(r.title)}</b>${r.unread ? ' ' + badge(r.unread + ' msj', 'primary') : ''}<div class="small muted">${escape(r.code)} · ${escape(r.cname)} · ${PKG_NAMES[r.pkg] || 'Personalizado'}</div>` },
      { key: 'due', label: 'Entrega', render: r => `<span class="nowrap small ${['pendiente', 'en_progreso', 'revision'].includes(r.status) && r.due < new Date().toISOString() ? 'text-danger' : ''}">${date(r.due)}</span>` },
      { key: 'netAmt', label: 'Tu ganancia', render: r => money(r.netAmt) },
      { key: 'status', label: 'Estado', render: r => statusBadge(ORDER_STATUS, r.status) },
      { key: 'escrow', label: 'Fondos', render: r => statusBadge(ESCROW, r.escrow) }
    ],
    onRow: r => router.go('/pedidos/' + r.id)
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('pedidos.csv', rows.map(r => ({ codigo: r.code, fecha: r.createdAt.slice(0, 10), pedido: r.title, cliente: r.cname, precio: r.price, comision: r.commission, neto: r.netAmt, estado: ORDER_STATUS[r.status][0] })));
}
