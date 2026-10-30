// Resumen: GMV, ingresos por comisiones (take rate), pedidos, disputas y categorías top.
import { escape, money, num, barChart, lineChart, donutChart, ago, date } from '../../../assets/core/ui.js';
import { pageHead, statCard, hBars, badge } from '../shared/kit.js';
import { take, category, activeCategories, ORDER_STATUS, statusBadge, user, settings } from '../shared/market.js';

export function render(el, { db, me }) {
  const orders = db.all('orders');
  const valid = orders.filter(o => o.status !== 'cancelado');
  const months = [];
  for (let i = 7; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const mLabel = m => new Date(m + '-15').toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
  const gmvM = months.map(m => ({ label: mLabel(m), value: valid.filter(o => o.createdAt.startsWith(m)).reduce((a, o) => a + o.price, 0) }));
  const revM = months.map(m => ({ label: mLabel(m), value: valid.filter(o => o.createdAt.startsWith(m)).reduce((a, o) => a + take(o), 0) }));
  const since = new Date(Date.now() - 30 * 864e5).toISOString(), prev = new Date(Date.now() - 60 * 864e5).toISOString();
  const last30 = valid.filter(o => o.createdAt >= since), prev30 = valid.filter(o => o.createdAt >= prev && o.createdAt < since);
  const gmv30 = last30.reduce((a, o) => a + o.price, 0), gmvPrev = prev30.reduce((a, o) => a + o.price, 0);
  const rev30 = last30.reduce((a, o) => a + take(o), 0);
  const delta = gmvPrev ? (gmv30 - gmvPrev) / gmvPrev * 100 : 0;
  const cats = activeCategories().map(c => ({ label: `${c.icon} ${c.name}`, value: valid.filter(o => o.categoryId === c.id).reduce((a, o) => a + o.price, 0) })).sort((a, b) => b.value - a.value);
  const disputesOpen = db.count('disputes', d => d.status !== 'resuelta');
  const st = settings();
  const statusCounts = Object.keys(ORDER_STATUS).map(k => ({ label: ORDER_STATUS[k][0], value: orders.filter(o => o.status === k).length })).filter(x => x.value);
  const queue = [
    ['moderacion', `${db.count('gigs', g => g.status === 'pendiente')} servicios esperan moderación`, ['admin', 'moderador']],
    ['disputas', `${disputesOpen} disputas abiertas`, ['admin', 'soporte']],
    ['retiros', `${db.count('withdrawals', w => w.status === 'solicitado')} retiros por pagar`, ['admin']],
    ['usuarios', `${db.count('users', u => u.role === 'freelancer' && !u.verified && u.active !== false)} freelancers sin verificar`, ['admin', 'moderador', 'soporte']]
  ].filter(q => q[2].includes(me.role));
  el.innerHTML = `
    ${pageHead(`Hola, ${me.name.split(' ')[0]}`, `Comisión cliente ${st.serviceFeePct}% · comisión freelancer ${st.commissionPct}%`, `<a class="btn btn-ghost btn-sm" href="index.html" target="_blank">Ver marketplace ↗</a>`)}
    <div class="kpi-row">
      ${statCard('GMV últimos 30 días', money(gmv30), 'valor bruto de pedidos', `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')}% vs. 30 días previos</span>`)}
      ${statCard('Ingresos Gremio (30 d)', money(rev30), `take rate ${gmv30 ? (rev30 / gmv30 * 100).toFixed(1).replace('.', ',') : 0}%`)}
      ${statCard('Pedidos (30 d)', num(last30.length), `ticket promedio ${money(last30.length ? gmv30 / last30.length : 0)}`)}
      ${statCard('Disputas abiertas', disputesOpen, `${(db.count('disputes') / Math.max(1, orders.length) * 100).toFixed(1).replace('.', ',')}% tasa histórica`)}
      ${statCard('Freelancers / clientes', `${db.count('users', u => u.role === 'freelancer')} / ${db.count('users', u => u.role === 'cliente')}`)}
      ${statCard('En garantía ahora', money(orders.filter(o => o.escrow === 'retenido').reduce((a, o) => a + o.total, 0)), `${orders.filter(o => o.escrow === 'retenido').length} pedidos`)}
    </div>
    ${queue.length ? `<div class="row">${queue.map(([k, t]) => `<a class="chip" href="#/${k}">${escape(t)} →</a>`).join('')}</div>` : ''}
    <div class="grid-2">
      <div class="card"><h3>GMV mensual</h3>${barChart(gmvM, { format: money })}</div>
      <div class="card"><h3>Ingresos por comisiones</h3>${lineChart(revM, { format: money })}</div>
    </div>
    <div class="grid-3">
      <div class="card"><h3>Categorías top (GMV)</h3>${hBars(cats, { format: money })}</div>
      <div class="card"><h3>Pedidos por estado</h3>${donutChart(statusCounts, { size: 140, label: String(orders.length) })}</div>
      <div class="card"><div class="card-head"><h3>Últimos pedidos</h3>${['admin', 'soporte'].includes(me.role) ? '<a class="small" href="#/pedidos">Ver todos</a>' : ''}</div><ul class="list compact">${orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(o => `<li class="small" style="justify-content:space-between"><span style="min-width:0"><b>${escape(o.code)}</b> · ${money(o.price)}<br><span class="muted">${escape(user(o.clientId)?.name || '')} → ${escape(user(o.freelancerId)?.name || '')} · ${ago(o.createdAt)}</span></span>${statusBadge(ORDER_STATUS, o.status)}</li>`).join('')}</ul></div>
    </div>`;
  void badge; void category; void date;
}
