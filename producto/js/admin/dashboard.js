// Dashboard: ingresos, embudo visitas → checkout → compra, ticket promedio, ventas por color y pack.
import { db, STATUS, isSold, colors, bundles, abtest } from '../data/db.js';
import { pageHead, kpi, delta, funnel, hbars, activityList, badge } from '../shared/admin-kit.js';
import { money, num, lineChart, barChart, donutChart, escape, ago } from '../../../assets/core/ui.js';

let period = 30;
const dayMs = 864e5;

function range(days, offset = 0) {
  const end = Date.now() - offset * days * dayMs;
  const start = end - days * dayMs;
  const orders = db.query('orders', o => { const t = +new Date(o.createdAt); return t > start && t <= end; });
  const sold = orders.filter(isSold);
  const startKey = new Date(start).toISOString().slice(0, 10), endKey = new Date(end).toISOString().slice(0, 10);
  const traffic = db.query('traffic', t => t.date > startKey && t.date <= endKey);
  const visits = traffic.reduce((s, t) => s + t.visits, 0), checkouts = traffic.reduce((s, t) => s + t.checkouts, 0);
  const revenue = sold.reduce((s, o) => s + o.total, 0);
  return { orders, sold, revenue, visits, checkouts, aov: sold.length ? revenue / sold.length : 0, conv: visits ? sold.length / visits * 100 : 0 };
}

export default {
  id: 'dashboard', label: 'Dashboard', ico: '📊', group: 'General', roles: null,
  render(view, { user }) {
    const cur = range(period), prev = range(period, 1);
    const bucket = period <= 30 ? 1 : 7;
    const points = [];
    for (let i = Math.ceil(period / bucket) - 1; i >= 0; i--) {
      const end = Date.now() - i * bucket * dayMs, start = end - bucket * dayMs;
      const v = cur.sold.filter(o => { const t = +new Date(o.createdAt); return t > start && t <= end; }).reduce((s, o) => s + o.total, 0);
      const d = new Date(end);
      points.push({ label: bucket === 1 ? String(d.getDate()) : `${d.getDate()}/${d.getMonth() + 1}`, value: v });
    }
    // Ingresos por mes (6 meses).
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months.push({ label: d.toLocaleDateString('es-CL', { month: 'short' }), value: db.query('orders', o => isSold(o) && o.createdAt.slice(0, 7) === key).reduce((s, o) => s + o.total, 0) });
    }
    const units = {};
    cur.sold.forEach(o => o.items.forEach(k => { units[k] = (units[k] || 0) + 1; }));
    const byBundle = bundles(true).map(b => ({ label: b.name, value: cur.sold.filter(o => o.bundleId === b.id).length }));
    const bumpRate = cur.sold.length ? cur.sold.filter(o => o.bump).length / cur.sold.length * 100 : 0;
    const upRate = cur.sold.length ? cur.sold.filter(o => o.upsell).length / cur.sold.length * 100 : 0;
    const refRev = cur.sold.filter(o => o.ref).reduce((s, o) => s + o.total, 0);
    const t = abtest();
    const recent = db.all('orders').slice(0, 6);
    const lowStock = colors().filter(c => c.stock <= c.reorderAt);

    view.innerHTML = `
      ${pageHead(`Hola, ${user.name.split(' ')[0]} 👋`, 'Resumen de ventas de Aquilo Pulse', `<div class="tabs" role="tablist" aria-label="Periodo">${[7, 30, 90].map(p => `<button class="tab ${p === period ? 'active' : ''}" role="tab" aria-selected="${p === period}" data-period="${p}">${p} días</button>`).join('')}</div>`)}
      <div class="kpis">
        ${kpi('Ingresos', money(cur.revenue), { ...delta(cur.revenue, prev.revenue), ico: '💰' })}
        ${kpi('Pedidos', num(cur.sold.length), { ...delta(cur.sold.length, prev.sold.length), ico: '📦' })}
        ${kpi('Ticket promedio (AOV)', money(cur.aov), { ...delta(cur.aov, prev.aov), ico: '🧾' })}
        ${kpi('Conversión', cur.conv.toFixed(2).replace('.', ',') + '%', { ...delta(cur.conv, prev.conv), ico: '🎯', sub: `${num(cur.visits)} visitas` })}
      </div>
      <div class="dash-grid">
        <div class="card"><div class="card-title"><h3>Ingresos ${bucket === 1 ? 'diarios' : 'semanales'}</h3><span class="muted small">últimos ${period} días</span></div>${lineChart(points, { format: money })}</div>
        <div class="card"><div class="card-title"><h3>Embudo de conversión</h3></div>
          ${funnel([{ label: 'Visitas a la landing', value: cur.visits }, { label: 'Iniciaron checkout', value: cur.checkouts }, { label: 'Compraron', value: cur.sold.length }], num)}
          <p class="small muted" style="margin:14px 0 0">Tráfico simulado. Cada visita real a la landing y cada checkout iniciado suman en vivo.</p></div>
      </div>
      <div class="dash-grid even">
        <div class="card"><div class="card-title"><h3>Unidades por color</h3></div>${hbars(colors().map(c => ({ label: c.name, value: units[c.key] || 0, swatch: c.base })), v => num(v) + ' u.')}</div>
        <div class="card"><div class="card-title"><h3>Pedidos por pack</h3></div>${donutChart(byBundle, { label: num(cur.sold.length) })}
          <div class="row small" style="margin-top:14px;gap:8px">${badge(`Order bump ${bumpRate.toFixed(0)}%`, 'primary')}${badge(`Upsell ${upRate.toFixed(0)}%`, 'info')}${badge(`Afiliados ${money(refRev)}`, 'success')}</div></div>
      </div>
      <div class="dash-grid">
        <div class="card"><div class="card-title"><h3>Ingresos por mes</h3></div>${barChart(months, { format: money })}</div>
        <div class="card stack"><div class="card-title" style="margin:0"><h3>Alertas</h3></div>
          ${lowStock.map(c => `<a class="notif-item" href="#/inventario">${badge(c.stock <= 0 ? 'Agotado' : 'Stock bajo', c.stock <= 0 ? 'danger' : 'warning')}<span>${escape(c.name)}: ${c.stock} u.</span></a>`).join('')}
          ${t && t.status === 'activo' ? `<a class="notif-item" href="#/abtest">${badge('A/B', 'primary')}<span>${escape(t.name)} en curso</span></a>` : ''}
          ${db.count('reviews', r => r.status === 'pendiente') ? `<a class="notif-item" href="#/resenas">${badge('Reseñas', 'info')}<span>${db.count('reviews', r => r.status === 'pendiente')} por moderar</span></a>` : ''}
          ${!lowStock.length ? '<p class="muted small">Inventario saludable ✓</p>' : ''}
        </div>
      </div>
      <div class="dash-grid">
        <div class="card"><div class="card-title"><h3>Últimos pedidos</h3><a class="btn btn-sm btn-ghost" href="#/pedidos">Ver todos →</a></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>
          ${recent.map(o => `<tr><td><a class="mono" href="#/pedidos/${o.id}">${escape(o.number)}</a><br><small class="muted">${escape(ago(o.createdAt))}</small></td><td>${escape(o.customer.name)}</td><td>${money(o.total)}</td><td>${badge(STATUS[o.status].label, STATUS[o.status].type)}</td></tr>`).join('')}
          </tbody></table></div></div>
        <div class="card"><div class="card-title"><h3>Actividad reciente</h3></div>${activityList(db.all('_log'), db.all('users'), 7)}</div>
      </div>`;
    view.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => { period = +b.dataset.period; this.render(view, { user }); }));
  }
};
