// Dashboard: KPIs, ventas por hora, tendencia, top platos, rotación de mesas y estado en vivo.
import { money, num, barChart, lineChart, donutChart, escape, ago } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { tableState, TABLE_STATES, settings } from '../shared/logic.js';
import { isoDay } from '../data/seed.js';

const DAY = 864e5;

export default {
  id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'General', roles: ['admin', 'cajero', 'chef'],
  watch: ['sessions', 'orders', 'tables', 'calls', 'reservations', 'ingredients', 'ratings'],
  render(el) {
    const now = Date.now();
    const paid = db.query('sessions', s => s.status === 'pagada');
    const inRange = (s, a, b) => { const t = +new Date(s.closedAt); return t >= now - a * DAY && t < now - b * DAY; };
    const last7 = paid.filter(s => inRange(s, 7, 0)), prev7 = paid.filter(s => inRange(s, 14, 7));
    const sum = arr => arr.reduce((a, s) => a + s.total, 0);
    const delta = (a, b) => b ? `${a >= b ? '▲' : '▼'} ${Math.abs((a - b) / b * 100).toFixed(1)}% vs semana anterior` : '';
    const s7 = sum(last7), p7 = sum(prev7);
    const avg7 = last7.length ? s7 / last7.length : 0, avgP = prev7.length ? p7 / prev7.length : 0;
    const cov7 = last7.reduce((a, s) => a + s.guests, 0), covP = prev7.reduce((a, s) => a + s.guests, 0);
    const tables = db.all('tables');
    const openDays = new Set(last7.map(s => s.closedAt.slice(0, 10))).size || 1;
    const turnover = last7.length / tables.length / openDays;
    const today = isoDay(now);
    const openSessions = db.query('sessions', s => s.status === 'abierta');
    const todayPaid = paid.filter(s => isoDay(s.closedAt) === today);
    const todaySales = sum(todayPaid) + openSessions.reduce((a, s) => a + (s.subtotal || 0), 0);
    const ratings = db.query('ratings', r => +new Date(r.createdAt) > now - 30 * DAY);
    const avgRating = ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;

    // Ventas por hora (30 días)
    const last30 = paid.filter(s => inRange(s, 30, 0));
    const hours = [12, 13, 14, 15, 16, 19, 20, 21, 22, 23];
    const byHour = hours.map(h => ({ label: `${h}h`, value: Math.round(last30.filter(s => new Date(s.openedAt).getHours() === h).reduce((a, s) => a + s.total, 0) / 30) }));
    // Tendencia diaria (30 días)
    const daily = Array.from({ length: 30 }, (_, i) => { const d = isoDay(now - (29 - i) * DAY); const v = paid.filter(s => s.closedAt.slice(0, 10) === d || isoDay(s.closedAt) === d).reduce((a, s) => a + s.total, 0); return { label: d.slice(8) + '/' + d.slice(5, 7), value: v }; });
    // Top platos y categorías (30 días)
    const sIds = new Set(last30.map(s => s.id));
    const dishCount = {}, catSales = {};
    db.query('orders', o => sIds.has(o.sessionId)).forEach(o => o.items.forEach(i => {
      dishCount[i.dishId] = (dishCount[i.dishId] || 0) + i.qty;
      const d = db.get('dishes', i.dishId); if (d) catSales[d.cat] = (catSales[d.cat] || 0) + i.price * i.qty;
    }));
    const top = Object.entries(dishCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topMax = top[0]?.[1] || 1;
    const cats = db.all('categories').sort((a, b) => a.order - b.order).map(c => ({ label: c.name.es, value: Math.round((catSales[c.id] || 0) / 1000) }));
    // Rotación por mesa
    const perTable = tables.sort((a, b) => a.number - b.number).map(t => ({ label: String(t.number), value: +(last30.filter(s => s.tableId === t.id).length / 26).toFixed(1) }));

    const states = Object.fromEntries(Object.keys(TABLE_STATES).map(k => [k, 0]));
    tables.forEach(t => states[tableState(t)]++);
    const inKitchen = db.count('orders', o => ['enviado', 'preparando'].includes(o.status));
    const calls = db.query('calls', c => c.status === 'pendiente');
    const resToday = db.query('reservations', r => r.date === today && ['pendiente', 'confirmada'].includes(r.status));
    const low = db.query('ingredients', i => i.stock <= i.min);

    el.innerHTML = `${pageHead('Dashboard', `${escape(settings().name)} · resumen de operación`, `<a class="btn btn-sm" href="garzon.html">🍽️ Salón</a><a class="btn btn-sm" href="cocina.html">👨‍🍳 Cocina</a>`)}
      <div class="kpi-grid">
        ${kpi('Ventas hoy (en curso)', money(todaySales), `${todayPaid.length} cuentas cerradas · ${openSessions.length} abiertas`)}
        ${kpi('Ventas 7 días', money(s7), delta(s7, p7), s7 >= p7)}
        ${kpi('Ticket promedio', money(avg7), delta(avg7, avgP), avg7 >= avgP)}
        ${kpi('Cubiertos 7 días', num(cov7), delta(cov7, covP), cov7 >= covP)}
        ${kpi('Rotación de mesas', turnover.toFixed(2) + ' / día', 'visitas por mesa por día abierto')}
        ${kpi('Satisfacción', avgRating.toFixed(1) + ' ★', `${ratings.length} opiniones en 30 días`)}
      </div>
      <div class="grid-2">
        <div class="card"><h3>Ventas promedio por hora</h3><p class="muted small">Promedio diario por franja · últimos 30 días</p>${barChart(byHour, { format: money })}</div>
        <div class="card"><h3>Ventas diarias</h3><p class="muted small">Últimos 30 días (lunes cerrado)</p>${lineChart(daily, { format: money })}</div>
      </div>
      <div class="grid-3 dash-3">
        <div class="card stack"><h3 style="margin:0">Top platos (30 días)</h3>
          <ol class="rank">${top.map(([id, n]) => { const d = db.get('dishes', id); return `<li><span>${escape(d?.emoji || '')} ${escape(d?.name.es || id)}</span><b>${n}</b><div class="progress"><i style="--v:${(n / topMax * 100).toFixed(0)}%"></i></div></li>`; }).join('')}</ol></div>
        <div class="card stack"><h3 style="margin:0">Ventas por categoría</h3><p class="muted small" style="margin:0">Miles de pesos · 30 días</p>${donutChart(cats, { size: 150, label: '$' + (sum(last30) / 1e6).toFixed(1) + 'M' })}</div>
        <div class="card stack"><h3 style="margin:0">En vivo</h3>
          <div class="live-grid">${Object.entries(states).map(([k, n]) => `<div class="live-cell st-${k}"><b>${n}</b><small>${TABLE_STATES[k].label}</small></div>`).join('')}</div>
          <ul class="mini-list">
            <li>🔥 <b>${inKitchen}</b> pedidos en cocina</li>
            <li>🛎️ <b>${calls.length}</b> llamados pendientes ${calls.slice(0, 3).map(c => `<span class="badge badge-${c.type === 'cuenta' ? 'warning' : 'danger'} plain">Mesa ${c.tableNumber}</span>`).join(' ')}</li>
            <li>📅 <b>${resToday.length}</b> reservas hoy</li>
            <li>📦 <b>${low.length}</b> insumos bajo mínimo ${low.length ? `<a href="#/inventario">ver</a>` : ''}</li>
          </ul>
        </div>
      </div>
      <div class="card"><h3>Rotación por mesa</h3><p class="muted small">Visitas promedio por día de servicio · últimos 30 días</p>${barChart(perTable)}</div>
      <div class="card stack"><div class="row between"><h3 style="margin:0">Actividad reciente</h3><a class="btn btn-sm btn-ghost" href="#/actividad">Ver todo</a></div>
        <ul class="mini-list">${db.getValue('_log', []).slice(0, 6).map(l => `<li><span class="badge plain">${escape(l.action)}</span> ${escape(l.detail)} <small class="muted">· ${ago(l.at)}</small></li>`).join('') || '<li class="muted">Sin actividad todavía.</li>'}</ul></div>`;
  }
};
