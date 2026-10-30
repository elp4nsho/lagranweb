// Dashboard comercial: valor de inventario, días en stock, ventas por mes, margen por auto, conversión, tasación→compra y MRR.
import { money, num, barChart, lineChart, donutChart, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { CAR_STATES, LEAD_TYPES } from '../data/catalog.js';
import { daysInStock, carName, userById } from '../shared/domain.js';
import { lastMonths, monthLabel, DAY } from '../shared/util.js';
import { hbars } from '../shared/charts.js';

export const mm = n => Math.abs(n) >= 1e6 ? `$${(n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M` : money(n);
export default {
  id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'General', roles: ['admin', 'gerente', 'vendedor'],
  watch: ['cars', 'sales', 'leads', 'valuations', 'subscriptions'],
  render(el) {
    const cars = db.all('cars'), stock = cars.filter(c => c.status !== 'vendido'), sales = db.all('sales');
    const months = lastMonths(8), inM = (d, m) => (d || '').slice(0, 7) === m;
    const s30 = sales.filter(s => Date.now() - new Date(s.date) < 30 * DAY), p30 = sales.filter(s => { const t = Date.now() - new Date(s.date); return t >= 30 * DAY && t < 60 * DAY; });
    const avgM = l => l.length ? l.reduce((a, s) => a + s.margin, 0) / l.length : 0;
    const days = stock.filter(c => c.status === 'publicado').map(daysInStock), avgDays = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
    const soldDays = cars.filter(c => c.status === 'vendido' && Date.now() - new Date(c.soldAt) < 90 * DAY).map(daysInStock);
    const L90 = db.query('leads', l => Date.now() - new Date(l.createdAt) < 90 * DAY), conv = L90.length ? L90.filter(l => l.status === 'ganado').length / L90.length * 100 : 0;
    const vals = db.all('valuations'), valConv = vals.length ? vals.filter(v => v.status === 'comprada').length / vals.length * 100 : 0;
    const subs = db.all('subscriptions'), mrr = subs.filter(s => s.status === 'activa').reduce((a, s) => a + s.price, 0);
    const mrrAt = m => subs.filter(s => s.startedAt.slice(0, 7) <= m && (!s.canceledAt || s.canceledAt.slice(0, 7) > m) && s.status !== 'pausada').reduce((a, s) => a + s.price, 0);
    const d = (a, b) => b ? `${a >= b ? '▲' : '▼'} ${Math.abs((a - b) / b * 100).toFixed(1)}% vs 30 días previos` : '';
    const aging = [['0–30 d', 0, 30], ['31–60 d', 31, 60], ['61–90 d', 61, 90], ['+90 d', 91, 9999]].map(([label, a, b]) => ({ label, value: stock.filter(c => c.status === 'publicado' && daysInStock(c) >= a && daysInStock(c) <= b).length, color: b > 90 ? 'var(--danger)' : b > 60 ? 'var(--warning)' : 'var(--primary)' }));
    const bySeller = db.query('users', u => u.role === 'vendedor').map(u => ({ label: u.name.split(' ')[0], value: s30.filter(s => s.sellerId === u.id).length }));
    const old = stock.filter(c => c.status === 'publicado').sort((a, b) => daysInStock(b) - daysInStock(a)).slice(0, 5);
    el.innerHTML = `${pageHead('Dashboard', 'Indicadores comerciales de la red de sucursales', '<a class="btn btn-sm btn-primary" href="#/inventario">Inventario</a>')}
      <div class="kpi-grid">
        ${kpi('Valor del inventario', mm(stock.reduce((a, c) => a + c.price, 0)), `${stock.length} autos · costo ${mm(stock.reduce((a, c) => a + c.cost, 0))}`)}
        ${kpi('Días promedio en stock', avgDays.toFixed(0) + ' d', `vendidos (90 d): ${soldDays.length ? (soldDays.reduce((a, b) => a + b, 0) / soldDays.length).toFixed(0) : 0} d promedio`, avgDays < 45)}
        ${kpi('Autos vendidos (30 d)', num(s30.length), d(s30.length, p30.length), s30.length >= p30.length)}
        ${kpi('Margen bruto por auto', mm(avgM(s30)), d(avgM(s30), avgM(p30)), avgM(s30) >= avgM(p30))}
        ${kpi('Conversión de leads', conv.toFixed(1) + '%', `${L90.length} leads en 90 días`)}
        ${kpi('Tasación → compra', valConv.toFixed(0) + '%', `${vals.filter(v => v.status === 'comprada').length} de ${vals.length} tasaciones`)}
        ${kpi('MRR suscripciones', mm(mrr), `${subs.filter(s => s.status === 'activa').length} planes activos`)}
      </div>
      <div class="grid-2">
        <div class="card"><h3>Autos vendidos por mes</h3>${barChart(months.map(m => ({ label: monthLabel(m), value: sales.filter(s => inM(s.date, m)).length })), { format: v => v + ' autos' })}</div>
        <div class="card"><h3>Margen bruto promedio por auto</h3><p class="muted small">Miles de pesos (precio − costo − reacondicionamiento)</p>${lineChart(months.map(m => { const l = sales.filter(s => inM(s.date, m)); return { label: monthLabel(m), value: Math.round(avgM(l) / 1000) }; }), { format: v => money(v * 1000) })}</div>
      </div>
      <div class="grid-3">
        <div class="card stack"><h3 style="margin:0">Inventario por estado</h3>${donutChart(Object.entries(CAR_STATES).filter(([k]) => k !== 'vendido').map(([k, s]) => ({ label: s.label, value: stock.filter(c => c.status === k).length })), { size: 140, label: String(stock.length) })}</div>
        <div class="card"><h3>Antigüedad del stock publicado</h3>${barChart(aging, { height: 150, format: v => v + ' autos' })}</div>
        <div class="card"><h3>MRR de planes</h3><p class="muted small">Miles de pesos</p>${lineChart(months.map(m => ({ label: monthLabel(m), value: Math.round(mrrAt(m) / 1000) })), { height: 150, format: v => money(v * 1000) })}</div>
      </div>
      <div class="grid-3">
        <div class="card"><h3>Leads por origen (90 d)</h3>${hbars(Object.entries(LEAD_TYPES).map(([k, t]) => ({ label: `${t.icon} ${t.label}`, value: L90.filter(l => l.type === k).length })))}</div>
        <div class="card"><h3>Ventas por vendedor (30 d)</h3>${hbars(bySeller, { format: v => v + ' autos' })}</div>
        <div class="card stack"><h3 style="margin:0">⚠ Más días publicados</h3><ul class="mini-list small">${old.map(c => `<li class="row between"><span><b>${escape(carName(c))}</b> ${c.year}<small class="muted d-block">${escape(c.stock)} · ${money(c.price)}</small></span><span class="badge badge-${daysInStock(c) > 60 ? 'danger' : 'warning'}">${daysInStock(c)} d</span></li>`).join('')}</ul></div>
      </div>`;
  }
};
export { userById };
