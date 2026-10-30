// Dashboard PMS: ocupación, ADR, RevPAR, llegadas/salidas de hoy y gráficos.
import { money, num, barChart, lineChart, donutChart, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { occupancyOn, today, addDays, RES_STATES, typeById, roomById, HK_STATES } from '../shared/hotel.js';
import { fmtDay } from '../shared/dates.js';
import { resDetail } from './reservas.js';

const pct = x => (x * 100).toFixed(0) + '%';
export default {
  id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'General', roles: ['admin', 'recepcion', 'revenue'],
  watch: ['reservations', 'rooms', 'roomTypes', 'seasons'],
  render(el, ctx) {
    const T = today();
    const o = occupancyOn(T), y = occupancyOn(addDays(T, -7));
    const last30 = Array.from({ length: 30 }, (_, i) => addDays(T, i - 29));
    const occ30 = last30.map(d => occupancyOn(d));
    const avg = k => occ30.reduce((a, x) => a + x[k], 0) / 30;
    const prev30 = Array.from({ length: 30 }, (_, i) => occupancyOn(addDays(T, i - 59)));
    const avgP = k => prev30.reduce((a, x) => a + x[k], 0) / 30;
    const d = (a, b) => b ? `${a >= b ? '▲' : '▼'} ${Math.abs((a - b) / b * 100).toFixed(1)}% vs 30 días previos` : '';
    const arrivals = db.query('reservations', r => r.checkIn === T && ['confirmada', 'check-in'].includes(r.status));
    const departures = db.query('reservations', r => r.checkOut === T && ['check-in', 'check-out'].includes(r.status));
    const inHouse = db.query('reservations', r => r.status === 'check-in');
    const fwd = Array.from({ length: 14 }, (_, i) => { const day = addDays(T, i); return { label: fmtDay(day).split(' ')[0], value: Math.round(occupancyOn(day).occ * 100) }; });
    const month = db.query('reservations', r => r.checkIn >= addDays(T, -30) && r.checkIn <= T && r.status !== 'cancelada');
    const byCh = {}; month.forEach(r => { byCh[r.channel] = (byCh[r.channel] || 0) + r.total; });
    const types = db.all('roomTypes').sort((a, b) => a.order - b.order);
    const adrType = types.map(t => { const rs = month.filter(r => r.roomTypeId === t.id); const n = rs.reduce((a, r) => a + r.nights, 0); return { label: t.name.split(' ')[0], value: n ? Math.round(rs.reduce((a, r) => a + r.roomTotal, 0) / n) : 0 }; });
    const hk = Object.fromEntries(Object.keys(HK_STATES).map(k => [k, db.count('rooms', r => r.hk === k)]));
    const list = (arr, empty) => arr.length ? `<ul class="mini-list">${arr.slice(0, 7).map(r => `<li class="row between nowrap"><span><b>${escape(r.guestName)}</b> <small class="muted">${escape(typeById(r.roomTypeId)?.name || '')}${r.roomId ? ' · ' + escape(roomById(r.roomId)?.number || '') : ''}${r.precheck ? ' · online ✓' : ''}</small></span><button class="btn btn-sm btn-ghost" data-res="${r.id}">${badge(RES_STATES, r.status)}</button></li>`).join('')}</ul>` : `<p class="muted small">${empty}</p>`;
    el.innerHTML = `${pageHead('Dashboard', `Hoy, ${fmtDay(T, { weekday: true, year: true })}`, ctx.can('recepcion') ? '<a class="btn btn-sm" href="#/recepcion">🛎️ Recepción</a>' : '')}
      <div class="kpi-grid">
        ${kpi('Ocupación hoy', pct(o.occ), `${o.sold} de ${o.rooms} habitaciones`, o.occ >= y.occ)}
        ${kpi('ADR hoy', money(o.adr), 'tarifa promedio por habitación vendida')}
        ${kpi('RevPAR hoy', money(o.revpar), 'ingreso por habitación disponible')}
        ${kpi('Ocupación 30 días', pct(avg('occ')), d(avg('occ'), avgP('occ')), avg('occ') >= avgP('occ'))}
        ${kpi('ADR 30 días', money(avg('adr')), d(avg('adr'), avgP('adr')), avg('adr') >= avgP('adr'))}
        ${kpi('RevPAR 30 días', money(avg('revpar')), d(avg('revpar'), avgP('revpar')), avg('revpar') >= avgP('revpar'))}
      </div>
      <div class="grid-3">
        <div class="card stack"><div class="row between"><h3 style="margin:0">🛬 Llegadas hoy</h3><span class="badge plain">${arrivals.length}</span></div>${list(arrivals, 'Sin llegadas hoy.')}</div>
        <div class="card stack"><div class="row between"><h3 style="margin:0">🛫 Salidas hoy</h3><span class="badge plain">${departures.length}</span></div>${list(departures, 'Sin salidas hoy.')}</div>
        <div class="card stack"><div class="row between"><h3 style="margin:0">🏨 En casa</h3><span class="badge plain">${inHouse.length} hab. · ${num(inHouse.reduce((a, r) => a + r.adults + r.children, 0))} pers.</span></div>
          <div class="live-grid">${Object.entries(hk).map(([k, n]) => `<div class="live-cell hk-${k}"><b>${n}</b><small>${HK_STATES[k].label}</small></div>`).join('')}</div>
          <a class="btn btn-sm" href="#/housekeeping">Tablero de housekeeping</a></div>
      </div>
      <div class="grid-2">
        <div class="card"><h3>Ocupación últimos 30 días</h3><p class="muted small">% de habitaciones vendidas por noche</p>${lineChart(occ30.map((x, i) => ({ label: fmtDay(last30[i]).split(' ')[0], value: Math.round(x.occ * 100) })), { format: v => v + '%' })}</div>
        <div class="card"><h3>Pronóstico 14 días</h3><p class="muted small">Ocupación ya reservada (on the books)</p>${barChart(fwd, { format: v => v + '%' })}</div>
      </div>
      <div class="grid-2">
        <div class="card stack"><h3 style="margin:0">Ingresos por canal (30 días)</h3><p class="muted small" style="margin:0">Miles de pesos</p>${donutChart(Object.entries(byCh).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: db.get('channels', k)?.name || k, value: Math.round(v / 1000) })), { size: 150, label: month.length + '' })}</div>
        <div class="card"><h3>ADR por tipo de habitación</h3><p class="muted small">Últimos 30 días</p>${barChart(adrType, { format: money })}</div>
      </div>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-res]'); if (b) resDetail(b.dataset.res, ctx); });
  }
};
