// Dashboard: GMV, entradas vendidas, top eventos, ventas por ciudad y categoría.
import { db } from '../data/db.js';
import { html, raw, money, num, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { pageHead, kpi, monthly, daily, pctDelta, activityList, usersById } from '../shared/admin-kit.js';
import { catName, badge, fmtDay } from '../shared/format.js';
import { eventStats, isPast } from '../shared/inventory.js';
import { CITIES } from '../data/seed.js';

export function render(el, { isAdmin }) {
  const orders = db.query('orders', o => o.status !== 'reembolsada');
  const tickets = db.query('tickets', t => t.status !== 'anulado');
  const now = Date.now(), M = 30 * 864e5;
  const inRange = (o, a, b) => { const t = Date.parse(o.createdAt); return t >= now - a && t < now - b; };
  const gmv30 = orders.filter(o => inRange(o, M, 0)).reduce((s, o) => s + o.total, 0), gmvPrev = orders.filter(o => inRange(o, 2 * M, M)).reduce((s, o) => s + o.total, 0);
  const tk30 = tickets.filter(t => inRange(t, M, 0)).length, tkPrev = tickets.filter(t => inRange(t, 2 * M, M)).length;
  const fees30 = orders.filter(o => inRange(o, M, 0)).reduce((s, o) => s + o.fees, 0), feesPrev = orders.filter(o => inRange(o, 2 * M, M)).reduce((s, o) => s + o.fees, 0);
  const evMap = Object.fromEntries(db.all('events').map(e => [e.id, e]));
  const upcoming = db.query('events', e => e.status === 'publicado' && !isPast(e));
  const top = upcoming.map(e => ({ e, s: eventStats(e) })).sort((a, b) => b.s.revenue - a.s.revenue).slice(0, 6);
  const byCity = CITIES.map(c => ({ label: c.length > 10 ? c.slice(0, 9) + '.' : c, value: Math.round(orders.filter(o => evMap[o.eventId]?.city === c).reduce((s, o) => s + o.total, 0) / 1e6) }));
  const byCat = ['conciertos', 'teatro', 'deportes', 'conferencias'].map(c => ({ label: catName(c), value: tickets.filter(t => evMap[t.eventId]?.category === c).length }));
  const pending = db.query('events', e => e.status === 'pendiente');
  const refunds = db.query('orders', o => o.status === 'reembolso_solicitado');
  const us = usersById();

  el.innerHTML = html`${raw(pageHead('Dashboard', 'Resumen de la plataforma · últimos 30 días'))}
    <div class="dash">
    <div class="kpis d-kpis">
      ${raw(kpi('GMV (30 días)', money(gmv30), pctDelta(gmv30, gmvPrev)))}
      ${raw(kpi('Entradas vendidas (30 días)', num(tk30), pctDelta(tk30, tkPrev)))}
      ${raw(kpi('Ingresos por cargos', money(fees30), pctDelta(fees30, feesPrev)))}
      ${raw(kpi('Eventos activos', num(upcoming.length), null))}
    </div>
    ${pending.length || refunds.length ? raw(html`<div class="card row between d-alert"><span>⚠️ ${pending.length} evento(s) esperan aprobación · ${refunds.length} solicitud(es) de reembolso</span><span class="row" style="gap:8px">${pending.length ? raw('<a class="btn btn-sm btn-primary" href="#/eventos?status=pendiente">Revisar eventos</a>') : ''}${refunds.length ? raw('<a class="btn btn-sm" href="#/pedidos?status=reembolso_solicitado">Ver reembolsos</a>') : ''}</span></div>`) : ''}
    <div class="grid-2">
      <div class="card chart-card d-gmv"><h3>GMV mensual (millones CLP)</h3>${raw(lineChart(monthly(orders, { value: o => o.total / 1e6 }).map(d => ({ ...d, value: Math.round(d.value * 10) / 10 })), { format: v => `$${v} M` }))}</div>
      <div class="card chart-card d-daily"><h3>Entradas vendidas por día (30 días)</h3>${raw(barChart(daily(tickets).map((d, i) => ({ ...d, label: i % 5 === 0 ? d.label : '' })), { format: v => `${v} entradas` }))}</div>
    </div>
    <div class="grid-2">
      <div class="card chart-card d-city"><h3>Ventas por ciudad (millones CLP)</h3>${raw(barChart(byCity, { format: v => `$${v} M` }))}</div>
      <div class="card chart-card d-cat"><h3>Entradas por categoría</h3>${raw(donutChart(byCat, { label: num(tickets.length) }))}</div>
    </div>
    <div class="grid-2">
      <div class="card d-top"><h3>Top eventos próximos</h3><ul class="mini-list">${top.map(({ e, s }) => raw(html`<li><a href="#/eventos/${e.id}" style="flex:1;min-width:0">${e.title}<br><small class="muted">${fmtDay(e.date)} · ${e.city}</small></a><div class="progress" title="${Math.round(s.pct)}%"><i style="--v:${Math.min(100, s.pct)}%"></i></div><b style="min-width:90px;text-align:right">${money(s.revenue)}</b></li>`))}</ul></div>
      <div class="card d-act"><div class="row between"><h3 style="margin:0">Actividad reciente</h3><a class="btn btn-sm btn-ghost" href="#/actividad">Ver todo</a></div>${raw(activityList(db.all('_log').slice(0, 7), us))}</div>
    </div>
    ${isAdmin && pending.length ? raw(html`<div class="card d-pend"><h3>Pendientes de aprobación</h3><ul class="mini-list">${pending.map(e => raw(html`<li><span>${e.title}<br><small class="muted">${db.get('organizers', e.organizerId)?.name}</small></span>${raw(badge(e.status))}<a class="btn btn-sm" href="#/eventos/${e.id}">Revisar</a></li>`))}</ul></div>`) : ''}
    </div>`;
}
