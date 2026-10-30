// Dashboard: KPIs del día, gráficos de 30 días, alertas SLA, flota e incidencias.
import { db } from '../data/db.js';
import { html, raw, money, num, lineChart, barChart, donutChart, time, ago } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/shell.js';
import { STATUS, INCIDENT_TYPES, INCIDENT_STATUS, badgeOf } from '../shared/status.js';
import { statusBadge, avatar, etaText } from '../shared/views.js';
import { ACTIVE_ST, fmtEta } from '../shared/sim.js';
import * as ops from '../shared/ops.js';
import { series, inRange, summary, dayStart, DAY, onTime } from './stats.js';

export function mountDashboard(el, ctx) {
  let last = 0, timer = null;
  const draw = () => {
    last = Date.now();
    const t = ops.simNow(), d0 = dayStart(t);
    const all = db.all('shipments');
    const today = all.filter(s => Date.parse(s.createdAt) >= d0);
    const yest = all.filter(s => { const x = Date.parse(s.createdAt); return x >= d0 - DAY && x < d0 - DAY + (t - d0); });
    const active = all.filter(s => ACTIVE_ST.includes(s.status));
    const late = active.filter(ops.isLate);
    const s30 = summary(30), mStart = new Date(t); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    const monthRev = all.filter(s => Date.parse(s.createdAt) >= mStart.getTime() && s.status !== 'cancelado').reduce((a, s) => a + s.price, 0);
    const online = db.query('couriers', c => c.online && c.status === 'activo');
    const busy = new Set(active.filter(s => s.courierId && s.status !== 'pendiente').map(s => s.courierId));
    const delta = (a, b) => { if (!b) return '<span class="delta up">—</span>'; const p = (a - b) / b * 100; return `<span class="delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}% vs ayer</span>`; };
    const perDay = series(30, (a, b) => inRange(all, 'deliveredAt', a, b).filter(s => s.status === 'entregado').length);
    const revWeek = series(14, (a, b) => inRange(all, 'createdAt', a, b).filter(s => s.status !== 'cancelado').reduce((x, s) => x + s.price, 0));
    const stCount = Object.keys(STATUS).map(k => ({ label: STATUS[k].label, value: today.filter(s => s.status === k).length })).filter(x => x.value);
    const incOpen = db.query('incidents', i => ['abierto', 'en_revision'].includes(i.status)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const top = db.query('couriers', c => c.status === 'activo').map(c => ({ c, n: inRange(all, 'deliveredAt', d0 - 6 * DAY, t + DAY).filter(s => s.courierId === c.id && s.status === 'entregado').length })).sort((a, b) => b.n - a.n).slice(0, 5);
    el.innerHTML = html`${raw(pageHead(`Hola, ${ctx.user.name.split(' ')[0]}`, 'Resumen de la operación en tiempo real.', `${ctx.can('envios.create') ? '<button class="btn btn-primary" data-new>＋ Nuevo envío</button>' : ''}${ctx.can('sim.control') ? '<a class="btn" href="#/operaciones">🗺 Ver mapa en vivo</a>' : ''}`))}
    <div class="kpis">
      ${raw(kpi('Envíos hoy', num(today.length), delta(today.length, yest.length)))}
      ${raw(kpi('En curso', active.length, `<span class="small muted">${active.filter(s => s.status === 'pendiente').length} sin asignar</span>`))}
      ${raw(kpi('Atrasados', late.length, late.length ? '<a class="small" href="#/envios?f=atrasados">Revisar →</a>' : '<span class="delta up">Todo a tiempo</span>'))}
      ${raw(kpi('A tiempo (30 d)', s30.onTime.toFixed(1).replace('.', ',') + '%', `<span class="small muted">${num(s30.delivered.length)} entregas</span>`))}
      ${raw(kpi('Ingresos del mes', money(monthRev), `<span class="small muted">30 d: ${money(s30.rev)}</span>`))}
      ${raw(kpi('Flota en línea', `${online.length}/${db.count('couriers', c => c.status === 'activo')}`, `<span class="small muted">${busy.size} en ruta · ${online.length - [...busy].filter(id => online.some(c => c.id === id)).length} libres</span>`))}
    </div>
    <div class="panel-grid">
      <div class="card"><div class="card-title"><h3>Entregas por día · 30 días</h3><span class="muted small">Promedio ${(perDay.reduce((a, d) => a + d.value, 0) / 30).toFixed(1).replace('.', ',')}/día</span></div>${raw(lineChart(perDay, { height: 190 }))}</div>
      <div class="card"><div class="card-title"><h3>Estados de hoy</h3></div>${raw(stCount.length ? donutChart(stCount, { label: String(today.length), size: 150 }) : '<div class="empty-inline">Sin envíos hoy aún</div>')}</div>
    </div>
    <div class="panel-grid">
      <div class="card"><div class="card-title"><h3>Alertas SLA</h3><a class="small" href="#/envios?f=atrasados">Ver todos</a></div>
        <div class="list">${late.length ? late.slice(0, 6).map(s => raw(html`<button class="list-item btn-reset" data-open="${s.id}"><span class="badge badge-danger">⏰ ${fmtEta(t - Date.parse(s.slaAt))}</span><span class="grow"><b class="mono">${s.code}</b><small class="muted">${s.sender.comuna} → ${s.receiver.comuna} · ${ops.courierOf(s)?.name || 'sin repartidor'}</small></span>${raw(statusBadge(s.status))}</button>`)) : raw('<div class="empty-inline">✓ No hay envíos atrasados</div>')}</div></div>
      <div class="card"><div class="card-title"><h3>Incidencias abiertas</h3><a class="small" href="#/incidencias">Ver todas</a></div>
        <div class="list">${incOpen.length ? incOpen.slice(0, 5).map(i => raw(html`<a class="list-item" href="#/incidencias" style="color:inherit;text-decoration:none"><span class="grow"><b>${i.number} · ${INCIDENT_TYPES[i.type]}</b><small class="muted">${i.shipmentCode} · ${ago(i.createdAt)}</small></span>${raw(badgeOf(INCIDENT_STATUS, i.status))}</a>`)) : raw('<div class="empty-inline">Sin incidencias abiertas</div>')}</div></div>
    </div>
    <div class="panel-grid">
      <div class="card"><div class="card-title"><h3>Ingresos diarios · 14 días</h3></div>${raw(barChart(revWeek, { height: 170, format: money }))}</div>
      <div class="card"><div class="card-title"><h3>Top repartidores · 7 días</h3></div><div class="list">${top.map(x => raw(html`<div class="list-item">${avatar(x.c.name, x.c.color, 32)}<span class="grow"><b>${x.c.name}</b><small class="muted">${String(x.c.rating).replace('.', ',')}★ · ${x.c.online ? 'en línea' : 'desconectado'}</small></span><b>${x.n}</b></div>`))}</div></div>
    </div>`;
  };
  el.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) ctx.open(o.dataset.open);
    if (e.target.closest('[data-new]')) import('./shipment.js').then(m => m.newShipmentModal(ctx));
  });
  draw();
  // Limita repintados durante la simulación (máx. uno cada 1,5 s)
  return { refresh() { clearTimeout(timer); timer = setTimeout(draw, Math.max(0, 1500 - (Date.now() - last))); }, destroy() { clearTimeout(timer); } };
}
