// Dashboard: ingresos por línea, ticket promedio, NPS, productividad técnica, participación EV y concierge.
import { money, num, barChart, lineChart, donutChart, escape, time } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { LINES } from '../data/catalog.js';
import { woTotal, vehicleById, techs, customerById, vehicleName, concState, userById, statusBadge } from '../shared/domain.js';
import { lastMonths, monthLabel, ymd, DAY } from '../shared/util.js';
import { stacked, hbars } from '../shared/charts.js';
import { woDetail } from './ordenes.js';
import { CONC_STATES } from '../data/catalog.js';

export const npsOf = list => { const n = list.filter(w => w.nps != null); if (!n.length) return 0; return Math.round((n.filter(w => w.nps >= 9).length - n.filter(w => w.nps <= 6).length) / n.length * 100); };
export const mm = n => n >= 1e6 ? `$${(n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M` : money(n);
const inLast = (w, days, offset = 0) => { const t = Date.now() - new Date(w.deliveredAt || w.createdAt); return t >= offset * DAY && t < (days + offset) * DAY; };

export default {
  id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'General', roles: ['admin', 'gerente', 'asesor'],
  watch: ['workOrders', 'concierge', 'inspections', 'users'],
  render(el, ctx) {
    const all = db.all('workOrders'), done = all.filter(w => w.status === 'entregada');
    const d30 = done.filter(w => inLast(w, 30)), p30 = done.filter(w => inLast(w, 30, 30));
    const rev = l => l.reduce((a, w) => a + woTotal(w), 0);
    const tk = l => l.length ? rev(l) / l.length : 0;
    const delta = (a, b) => b ? `${a >= b ? '▲' : '▼'} ${Math.abs((a - b) / b * 100).toFixed(1)}% vs 30 días previos` : '';
    const nps = npsOf(done.filter(w => inLast(w, 90))), npsP = npsOf(done.filter(w => inLast(w, 90, 90)));
    const isEv = w => ['electrico', 'hibrido'].includes(vehicleById(w.vehicleId)?.fuel);
    const ev30 = d30.length ? d30.filter(isEv).length / d30.length * 100 : 0;
    const open = all.filter(w => !['entregada', 'cancelada'].includes(w.status));
    const months = lastMonths(8);
    const byMonth = (m, f) => done.filter(w => w.deliveredAt.slice(0, 7) === m && f(w));
    const lineSeries = Object.entries(LINES).map(([k, l]) => ({ name: l.short, color: l.color, values: months.map(m => Math.round(rev(byMonth(m, w => w.line === k)) / 1e6 * 10) / 10) }));
    const tList = techs();
    const prod = tList.map(t => { const h = d30.filter(w => w.techId === t.id).reduce((a, w) => a + (w.laborHours || 0), 0); return { label: t.name.split(' ')[0] + ' ' + (t.name.split(' ')[1] || '')[0] + '.', value: Math.round(h), color: 'var(--primary)' }; });
    const weeks = Array.from({ length: 12 }, (_, i) => 11 - i).map(i => { const from = ymd(new Date(Date.now() - (i + 1) * 7 * DAY)), to = ymd(new Date(Date.now() - i * 7 * DAY)); return { label: 'S' + (12 - i), value: db.count('concierge', c => c.date > from && c.date <= to && c.status !== 'cancelado') }; });
    const today = ymd(), runs = db.query('concierge', c => c.date === today && c.status !== 'cancelado');
    const appr = all.filter(w => w.status === 'aprobacion');
    const byLine30 = Object.entries(LINES).map(([k, l]) => ({ label: l.short, value: Math.round(rev(d30.filter(w => w.line === k)) / 1000), color: l.color }));
    el.innerHTML = `${pageHead('Dashboard', `Operación del atelier · ${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`, '<a class="btn btn-sm btn-primary" href="#/ordenes">Órdenes</a>')}
      <div class="kpi-grid">
        ${kpi('Ingresos 30 días', mm(rev(d30)), delta(rev(d30), rev(p30)), rev(d30) >= rev(p30))}
        ${kpi('Ticket promedio', mm(tk(d30)), delta(tk(d30), tk(p30)), tk(d30) >= tk(p30))}
        ${kpi('NPS (90 días)', (nps > 0 ? '+' : '') + nps, `${npsP > nps ? '▼' : '▲'} vs ${npsP} trimestre anterior`, nps >= npsP)}
        ${kpi('OT abiertas', num(open.length), `${appr.length} esperando aprobación`, true)}
        ${kpi('Participación EV/PHEV', ev30.toFixed(0) + '%', 'de las OT entregadas en 30 días')}
        ${kpi('Concierge hoy', num(runs.length), `${runs.filter(c => ['en-camino', 'en-entrega'].includes(c.status)).length} en ruta ahora`)}
      </div>
      <div class="grid-2">
        <div class="card"><h3>Ingresos por línea de servicio</h3><p class="muted small">Millones de pesos por mes (OT entregadas)</p>${stacked({ labels: months.map(monthLabel), series: lineSeries, format: v => v + ' M' })}</div>
        <div class="card stack"><h3 style="margin:0">Mix últimos 30 días</h3><p class="muted small" style="margin:0">Miles de pesos por línea</p>${donutChart(byLine30, { size: 160, label: d30.length + ' OT', format: v => money(v * 1000) })}</div>
      </div>
      <div class="grid-3">
        <div class="card"><h3>Productividad técnica</h3><p class="muted small">Horas facturadas por técnico (30 días)</p>${hbars(prod, { format: v => v + ' h' })}</div>
        <div class="card"><h3>Participación EV</h3><p class="muted small">% de OT de eléctricos e híbridos</p>${lineChart(months.map(m => { const l = done.filter(w => w.deliveredAt.slice(0, 7) === m); return { label: monthLabel(m), value: l.length ? Math.round(l.filter(isEv).length / l.length * 100) : 0 }; }), { height: 160, format: v => v + '%' })}</div>
        <div class="card"><h3>Corridas concierge</h3><p class="muted small">Retiros por semana (12 semanas)</p>${barChart(weeks, { height: 160 })}</div>
      </div>
      <div class="grid-2">
        <div class="card stack"><div class="row between"><h3 style="margin:0">⚠ Esperando aprobación del cliente</h3><span class="badge">${appr.length}</span></div>
          ${appr.length ? `<ul class="mini-list">${appr.map(w => `<li class="row between"><span><b class="mono">${w.code}</b> · ${escape(vehicleName(vehicleById(w.vehicleId)))}<small class="muted d-block">${escape(customerById(w.customerId)?.name || '')}</small></span><button class="btn btn-sm" data-wo="${w.id}">Ver</button></li>`).join('')}</ul>` : '<p class="muted">Nada pendiente.</p>'}</div>
        <div class="card stack"><div class="row between"><h3 style="margin:0">🚘 Concierge de hoy</h3><a class="btn btn-sm" href="#/concierge">Agenda</a></div>
          ${runs.length ? `<ul class="mini-list">${runs.map(c => `<li class="row between"><span><b>${escape(c.window || c.deliveryWindow || '')}</b> · ${escape(c.comuna)}<small class="muted d-block">${escape(userById(c.driverId)?.name || 'Sin chofer')} · ${c.code}</small></span>${statusBadge(CONC_STATES, c.status)}</li>`).join('')}</ul>` : '<p class="muted">Sin corridas hoy.</p>'}</div>
      </div>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-wo]'); if (b) woDetail(b.dataset.wo, ctx); });
  }
};
export { concState, time };
