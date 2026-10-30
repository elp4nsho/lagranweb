// Dashboard: KPIs con variación, ventas diarias y mensuales, estados, top productos y embudo.
import { html, raw, money, num, date, ago, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { db, statusBadge, ORDER_STATUS, category } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { pageHead, kpi, me } from './common.js';
import { lowStockList } from './inventory.js';

const DAY = 864e5;
let range = 30;
const valid = o => !['cancelado', 'reembolsado', 'pendiente'].includes(o.status);

export function render(el) {
  const now = Date.now();
  const all = db.all('orders');
  const inRange = (o, from, to) => { const t = new Date(o.createdAt).getTime(); return t >= from && t < to; };
  const cur = all.filter(o => inRange(o, now - range * DAY, now + DAY));
  const prev = all.filter(o => inRange(o, now - 2 * range * DAY, now - range * DAY));
  const sales = l => l.filter(valid).reduce((s, o) => s + o.total, 0);
  const delta = (a, b) => b ? ((a - b) / b) * 100 : 0;
  const an = db.all('analytics');
  const anR = (from, to) => an.filter(a => { const t = new Date(a.date).getTime(); return t >= from && t < to; });
  const curA = anR(now - range * DAY, now + DAY), prevA = anR(now - 2 * range * DAY, now - range * DAY);
  const visits = curA.reduce((s, a) => s + a.visits, 0), pvisits = prevA.reduce((s, a) => s + a.visits, 0);
  const conv = visits ? cur.length / visits * 100 : 0, pconv = pvisits ? prev.length / pvisits * 100 : 0;
  const aov = cur.filter(valid).length ? sales(cur) / cur.filter(valid).length : 0;
  const paov = prev.filter(valid).length ? sales(prev) / prev.filter(valid).length : 0;

  // Serie diaria (o semanal si el rango es largo)
  const bucket = range > 45 ? 7 : 1;
  const series = [];
  for (let i = Math.ceil(range / bucket) - 1; i >= 0; i--) {
    const to = now - i * bucket * DAY + DAY, from = to - bucket * DAY;
    const d = new Date(from + (bucket > 1 ? 0 : 0));
    series.push({ label: bucket > 1 ? date(d, { day: '2-digit', month: 'short' }) : String(d.getDate()), value: sales(all.filter(o => inRange(o, from, to))) });
  }
  // Ventas por mes (6 meses)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const m = d.getMonth(), y = d.getFullYear();
    months.push({ label: d.toLocaleDateString('es-CL', { month: 'short' }), value: sales(all.filter(o => { const x = new Date(o.createdAt); return x.getMonth() === m && x.getFullYear() === y; })) });
  }
  // Top productos por ingresos
  const byProd = {};
  cur.filter(valid).forEach(o => o.items.forEach(i => { (byProd[i.productId] ||= { units: 0, rev: 0 }); byProd[i.productId].units += i.qty; byProd[i.productId].rev += i.qty * i.price; }));
  const top = Object.entries(byProd).sort((a, b) => b[1].rev - a[1].rev).slice(0, 6);
  const maxRev = top[0]?.[1].rev || 1;
  // Estados
  const st = Object.keys(ORDER_STATUS).map(k => ({ label: ORDER_STATUS[k].label, value: cur.filter(o => o.status === k).length })).filter(d => d.value);
  // Ventas por categoría
  const byCat = {};
  cur.filter(valid).forEach(o => o.items.forEach(i => { const p = db.get('products', i.productId); const c = category(p?.categoryId)?.name || 'Otros'; byCat[c] = (byCat[c] || 0) + i.qty; }));
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  // Embudo
  const carts = curA.reduce((s, a) => s + a.carts, 0), checkouts = curA.reduce((s, a) => s + a.checkouts, 0);
  const funnel = [['Visitas', visits], ['Carros creados', carts], ['Checkout iniciado', checkouts], ['Pedidos', cur.length]];
  const recent = all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);
  const low = lowStockList().slice(0, 6);
  const hour = new Date().getHours();

  el.innerHTML = html`
    ${raw(pageHead(`${hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${me().name.split(' ')[0]}`, 'Resumen del rendimiento de la tienda.',
      `<div class="tabs" role="tablist" aria-label="Rango">${[7, 30, 90].map(r => `<button class="tab ${range === r ? 'active' : ''}" data-range="${r}">${r} días</button>`).join('')}</div>`))}
    <div class="kpis">
      ${raw(kpi(`Ventas (${range} d)`, money(sales(cur)), delta(sales(cur), sales(prev))))}
      ${raw(kpi('Pedidos', num(cur.length), delta(cur.length, prev.length)))}
      ${raw(kpi('Ticket promedio', money(aov), delta(aov, paov)))}
      ${raw(kpi('Tasa de conversión', conv.toFixed(2).replace('.', ',') + '%', delta(conv, pconv)))}
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>Ventas ${bucket > 1 ? 'semanales' : 'diarias'}</h3><span class="small muted">Pedidos pagados, sin cancelados</span></div>${raw(lineChart(series, { format: money }))}</div>
      <div class="card"><div class="card-head"><h3>Embudo de conversión</h3></div>
        <div class="funnel">${funnel.map(([l, v], i) => raw(`<div class="step"><span>${l}</span><div class="bar"><i style="--v:${Math.max(4, v / (funnel[0][1] || 1) * 100)}%">${num(v)}</i></div><span class="small muted right">${i ? (v / (funnel[i - 1][1] || 1) * 100).toFixed(1).replace('.', ',') + '%' : '100%'}</span></div>`))}</div>
        <p class="small muted" style="margin:14px 0 0">De cada 100 visitas, ${(conv).toFixed(1).replace('.', ',')} terminan en pedido.</p></div>
    </div>
    <div class="cols-3">
      <div class="card"><div class="card-head"><h3>Ventas por mes</h3></div>${raw(barChart(months, { format: money }))}</div>
      <div class="card"><div class="card-head"><h3>Pedidos por estado</h3></div>${raw(donutChart(st, { label: String(cur.length), size: 150 }))}</div>
      <div class="card"><div class="card-head"><h3>Unidades por categoría</h3></div>${raw(donutChart(cats, { label: String(cats.reduce((s, c) => s + c.value, 0)), size: 150 }))}</div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-head"><h3>Productos más vendidos</h3><a class="small" href="#/productos">Ver catálogo</a></div>
        <div class="hbars">${top.map(([id, v]) => { const p = db.get('products', id); return raw(html`<div class="hb"><a href="#/productos/${id}">${p?.name || id}</a><b>${money(v.rev)} <span class="muted small">· ${v.units} u.</span></b><div class="progress"><i style="--v:${v.rev / maxRev * 100}%"></i></div></div>`); })}</div></div>
      <div class="card"><div class="card-head"><h3>Últimos pedidos</h3><a class="small" href="#/pedidos">Ver todos</a></div>
        <ul class="list-plain">${recent.map(o => raw(html`<li><a href="#/pedidos/${o.id}"><b>#${o.number}</b> ${o.customer.name}<br><small class="muted">${ago(o.createdAt)}</small></a><span class="right">${raw(statusBadge(o.status))}<br><b class="small">${money(o.total)}</b></span></li>`))}</ul></div>
    </div>
    <div class="card"><div class="card-head"><h3>Alertas de inventario</h3><a class="small" href="#/inventario">Gestionar inventario</a></div>
      ${low.length ? raw(html`<div class="grid-3">${low.map(x => raw(html`<a class="row" style="gap:10px;flex-wrap:nowrap;color:var(--text)" href="#/inventario"><span class="mini-thumb">${raw(productArt(x.product, x.hex))}</span><span><b>${x.product.name}</b><br><small class="muted">${x.v.color} · ${x.v.size} · </small><span class="badge badge-${x.v.stock ? 'warning' : 'danger'}">${x.v.stock ? x.v.stock + ' u.' : 'Agotado'}</span></span></a>`))}</div>`) : raw('<p class="muted">Sin alertas. ✨</p>')}
    </div>`;
  el.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { range = +b.dataset.range; const n = document.createElement('div'); n.className = el.className; n.style.cssText = el.style.cssText; el.replaceWith(n); render(n); });
}
