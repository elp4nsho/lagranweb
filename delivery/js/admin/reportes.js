// Reportes: entregas por día, cumplimiento, ingresos, servicios y mapa de calor por comuna.
import { db } from '../data/db.js';
import { html, raw, money, num, lineChart, barChart, donutChart, downloadCSV, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/shell.js';
import { COM, COMUNAS } from '../data/geo.js';
import { SERVICE_LABEL } from '../shared/status.js';
import { createMap } from '../shared/map.js';
import { avatar, stars } from '../shared/views.js';
import { series, inRange, summary, onTime, dayStart, DAY } from './stats.js';
import * as ops from '../shared/ops.js';

const WD = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function mountReportes(el, ctx) {
  let days = 30, map = null, metric = 'destino';
  function render() {
    map?.destroy();
    const t = ops.simNow(), from = dayStart(t) - (days - 1) * DAY;
    const all = db.all('shipments');
    const S = summary(days);
    const prev = (() => { const a = from - days * DAY; const c = all.filter(s => { const x = Date.parse(s.createdAt); return x >= a && x < from; }); return { n: c.length, rev: c.filter(s => s.status !== 'cancelado').reduce((x, s) => x + s.price, 0) }; })();
    const dlt = (a, b) => b ? `<span class="delta ${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs((a - b) / b * 100).toFixed(1).replace('.', ',')}% vs periodo anterior</span>` : '';
    const perDay = series(days, (a, b) => inRange(all, 'deliveredAt', a, b).filter(s => s.status === 'entregado').length);
    const revDay = series(days, (a, b) => inRange(all, 'createdAt', a, b).filter(s => s.status !== 'cancelado').reduce((x, s) => x + s.price, 0));
    const weeks = []; for (let w = Math.ceil(days / 7) - 1; w >= 0; w--) { const b = dayStart(t) + DAY - w * 7 * DAY, a = b - 7 * DAY; const d = inRange(all, 'deliveredAt', a, b).filter(s => s.status === 'entregado'); weeks.push({ label: new Date(a).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }), value: d.length ? Math.round(d.filter(onTime).length / d.length * 1000) / 10 : 0 }); }
    const created = S.created.filter(s => s.status !== 'cancelado');
    const bySvc = Object.keys(SERVICE_LABEL).map(k => ({ label: SERVICE_LABEL[k], value: Math.round(created.filter(s => s.service === k).reduce((a, s) => a + s.price, 0) / 1000) }));
    const field = metric === 'destino' ? 'receiver' : 'sender';
    const byCom = {}; created.forEach(s => { const c = s[field].comuna; byCom[c] = (byCom[c] || 0) + 1; });
    const topCom = Object.entries(byCom).sort((a, b) => b[1] - a[1]);
    const grid = topCom.slice(0, 12).map(([c]) => { const row = [0, 0, 0, 0, 0, 0, 0]; created.filter(s => s[field].comuna === c).forEach(s => { row[(new Date(s.createdAt).getDay() + 6) % 7]++; }); return [c, row]; });
    const gmax = Math.max(1, ...grid.flatMap(([, r]) => r));
    const fleet = db.all('couriers').map(c => { const d = S.delivered.filter(s => s.courierId === c.id); const r = d.filter(s => s.rating); return { c, n: d.length, ot: d.length ? d.filter(onTime).length / d.length * 100 : 0, rev: d.reduce((a, s) => a + s.price, 0), rating: r.length ? r.reduce((a, s) => a + s.rating.stars, 0) / r.length : c.rating }; }).sort((a, b) => b.n - a.n);
    el.innerHTML = html`${raw(pageHead('Reportes', 'Desempeño de la operación.', '<button class="btn" data-csv>⇩ Resumen diario CSV</button>'))}
    <div class="chips" data-range>${[7, 30, 60].map(d => raw(html`<button class="chip ${d === days ? 'active' : ''}" data-d="${d}">Últimos ${d} días</button>`))}</div>
    <div class="kpis">${raw(kpi('Envíos creados', num(S.created.length), dlt(S.created.length, prev.n)))}${raw(kpi('Entregados', num(S.delivered.length)))}${raw(kpi('A tiempo', S.onTime.toFixed(1).replace('.', ',') + '%'))}${raw(kpi('Ingresos', money(S.rev), dlt(S.rev, prev.rev)))}${raw(kpi('Ticket promedio', money(created.length ? S.rev / created.length : 0)))}${raw(kpi('Calificación', S.rating.toFixed(2).replace('.', ',') + ' ★', `<span class="small muted">${S.failed} fallidos · ${S.cancelled} cancelados</span>`))}</div>
    <div class="panel-grid"><div class="card"><div class="card-title"><h3>Entregas por día</h3></div>${raw(lineChart(perDay, { height: 190 }))}</div>
      <div class="card"><div class="card-title"><h3>Ingresos por servicio (miles)</h3></div>${raw(donutChart(bySvc, { size: 150, label: money(S.rev).replace(/\.\d{3}$/, 'k') }))}</div></div>
    <div class="grid-2"><div class="card"><div class="card-title"><h3>Ingresos por día</h3></div>${raw(barChart(revDay, { height: 170, format: money }))}</div>
      <div class="card"><div class="card-title"><h3>% a tiempo por semana</h3></div>${raw(barChart(weeks, { height: 170, format: v => v + '%' }))}</div></div>
    <div class="card"><div class="card-title"><h3>Mapa de calor por comuna</h3><div class="chips"><button class="chip ${metric === 'destino' ? 'active' : ''}" data-m="destino">Destinos</button><button class="chip ${metric === 'origen' ? 'active' : ''}" data-m="origen">Orígenes</button></div></div>
      <div class="heat-grid-wrap"><div class="heat-map"></div>
        <div class="table-wrap"><table class="table heat-table"><thead><tr><th>Comuna</th>${WD.map(d => raw(`<th>${d}</th>`))}<th class="num">Total</th></tr></thead><tbody>
          ${grid.map(([c, r]) => raw(html`<tr><td><b>${c}</b></td>${r.map(v => raw(`<td class="heat-cell" style="--h:${Math.round(v / gmax * 85)}%">${v || ''}</td>`))}<td class="num"><b>${r.reduce((a, b) => a + b, 0)}</b></td></tr>`))}</tbody></table></div></div></div>
    <div class="card"><div class="card-title"><h3>Desempeño de repartidores</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Repartidor</th><th class="num">Entregas</th><th class="num">A tiempo</th><th>Calificación</th><th class="num">Ingresos generados</th></tr></thead><tbody>
      ${fleet.map(x => raw(html`<tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${avatar(x.c.name, x.c.color, 28)}${x.c.name}</span></td><td class="num">${x.n}</td><td class="num">${x.n ? x.ot.toFixed(0) + '%' : '—'}</td><td>${stars(x.rating)}</td><td class="num">${money(x.rev)}</td></tr>`))}</tbody></table></div></div>`;
    map = createMap(el.querySelector('.heat-map'), { prefer: 'svg', label: 'Mapa de calor de envíos' });
    map.fitAll();
    map.setHeat(topCom.filter(([c]) => COM[c]).map(([c, v]) => ({ pos: [COM[c].lat, COM[c].lng], value: v, label: `${c}: ${v} envíos` })));
    el.querySelector('[data-csv]').onclick = () => { downloadCSV(`reporte-diario-${days}d.csv`, perDay.map((d, i) => ({ dia: new Date(d.a).toLocaleDateString('es-CL'), entregas: d.value, ingresos: revDay[i].value }))); db.log('exportación', `Reporte ${days} días`, ctx.user.id); };
  }
  el.addEventListener('click', e => {
    const d = e.target.closest('[data-d]'); if (d) { days = +d.dataset.d; render(); }
    const m = e.target.closest('[data-m]'); if (m) { metric = m.dataset.m; render(); }
  });
  render();
  return { destroy() { map?.destroy(); } };
}
