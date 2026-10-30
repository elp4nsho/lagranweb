// Resumen de la productora: KPIs, ventas mensuales y estado de sus eventos.
import { db } from '../data/db.js';
import { html, raw, money, num, lineChart, donutChart } from '../../../assets/core/ui.js';
import { pageHead, kpi, monthly, pctDelta } from '../shared/admin-kit.js';
import { badge, fmtDay } from '../shared/format.js';
import { eventStats, isPast } from '../shared/inventory.js';

export function render(el, { org }) {
  const evs = db.query('events', e => e.organizerId === org.id);
  const ids = new Set(evs.map(e => e.id));
  const tickets = db.query('tickets', t => ids.has(t.eventId) && t.status !== 'anulado');
  const now = Date.now(), M = 30 * 864e5;
  const rev = (a, b) => tickets.filter(t => { const x = Date.parse(t.createdAt); return x >= now - a && x < now - b; }).reduce((s, t) => s + t.price, 0);
  const up = evs.filter(e => e.status === 'publicado' && !isPast(e));
  const gross = tickets.reduce((s, t) => s + t.price, 0);
  el.innerHTML = html`${raw(pageHead(`Hola, ${org.name}`, 'Resumen de tus ventas', '<a class="btn btn-primary" href="#/nuevo">+ Crear evento</a>'))}
    <div class="dash">
    <div class="kpis d-kpis">${raw(kpi('Ventas 30 días', money(rev(M, 0)), pctDelta(rev(M, 0), rev(2 * M, M))))}${raw(kpi('Entradas vendidas (total)', num(tickets.length)))}${raw(kpi('Neto estimado (−' + org.commissionPct + '%)', money(gross * (1 - org.commissionPct / 100))))}${raw(kpi('Eventos a la venta', num(up.length)))}</div>
    <div class="grid-2">
      <div class="card chart-card d-gmv"><h3>Recaudación mensual (miles CLP)</h3>${raw(lineChart(monthly(tickets, { value: t => t.price / 1000 }).map(d => ({ ...d, value: Math.round(d.value) })), { format: v => `$${num(v)} mil` }))}</div>
      <div class="card chart-card d-cat"><h3>Eventos por estado</h3>${raw(donutChart(['publicado', 'pendiente', 'borrador', 'finalizado', 'rechazado'].map(s => ({ label: s, value: evs.filter(e => e.status === s).length })).filter(d => d.value), { label: String(evs.length) }))}</div>
    </div>
    <div class="card d-top"><h3>Próximos eventos</h3>${up.length ? raw(`<ul class="mini-list">${up.sort((a, b) => a.date.localeCompare(b.date)).map(e => { const s = eventStats(e); return `<li><a href="#/eventos/${e.id}" style="flex:1;min-width:0">${e.title}<br><small class="muted">${fmtDay(e.date)} · ${e.city}</small></a><div class="progress"><i style="--v:${Math.min(100, s.pct)}%"></i></div><span class="small" style="min-width:110px;text-align:right">${num(s.sold)}/${num(s.capacity)}</span>${badge(e.status)}</li>`; }).join('')}</ul>`) : raw('<div class="empty">No tienes eventos a la venta</div>')}</div>
    </div>`;
}
