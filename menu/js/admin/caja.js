// Caja: cuentas abiertas, cobro y cierre de caja del día.
import { money, escape, ago, time, donutChart } from '../../../assets/core/ui.js';
import { pageHead, kpi, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { sessionTotals, sessionOrders } from '../shared/logic.js';
import { chargeModal } from '../shared/charge.js';
import { isoDay } from '../data/seed.js';

export default {
  id: 'caja', label: 'Caja', icon: '💳', group: 'Operación', roles: ['admin', 'cajero'], watch: ['sessions', 'orders', 'tables'],
  render(el, ctx) {
    const open = db.query('sessions', s => s.status === 'abierta').sort((a, b) => a.openedAt.localeCompare(b.openedAt));
    const today = isoDay(Date.now());
    const paidToday = db.query('sessions', s => s.status === 'pagada' && isoDay(s.closedAt) === today);
    const byMethod = {};
    paidToday.forEach(s => { byMethod[s.method] = (byMethod[s.method] || 0) + s.total; });
    const tips = paidToday.reduce((a, s) => a + (s.tip || 0), 0);
    el.innerHTML = `${pageHead('Caja', 'Cuentas abiertas y cierre del día')}
      <div class="kpi-grid">
        ${kpi('Cuentas abiertas', String(open.length), money(open.reduce((a, s) => a + sessionTotals(s.id).subtotal, 0)) + ' por cobrar')}
        ${kpi('Cobrado hoy', money(paidToday.reduce((a, s) => a + s.total, 0)), paidToday.length + ' cuentas')}
        ${kpi('Propinas hoy', money(tips), 'para repartir al cierre')}
      </div>
      <div class="grid-auto">${open.length ? open.map(s => {
        const tb = db.get('tables', s.tableId); const tot = sessionTotals(s.id);
        return `<div class="card stack open-check ${tb?.billRequested ? 'is-bill' : ''}">
          <div class="row between"><h3 style="margin:0">Mesa ${s.tableNumber}</h3>${tb?.billRequested ? '<span class="badge badge-warning">Pidió cuenta</span>' : '<span class="badge badge-info">Consumiendo</span>'}</div>
          <small class="muted">${s.guests} personas · abierta ${ago(s.openedAt)} · ${sessionOrders(s.id).length} pedidos</small>
          <div class="row between total-row"><span>Subtotal</span><b>${money(tot.subtotal)}</b></div>
          <button class="btn btn-primary" data-charge="${s.id}" ${tot.subtotal ? '' : 'disabled'}>Cobrar</button>
        </div>`;
      }).join('') : '<div class="card empty"><span class="icon">✅</span>No hay cuentas abiertas.</div>'}</div>
      <div class="grid-2">
        <div class="card stack"><h3 style="margin:0">Cierre de caja · hoy</h3>${Object.keys(byMethod).length ? donutChart(Object.entries(byMethod).map(([label, v]) => ({ label: `${label} ${money(v)}`, value: Math.round(v / 1000) })), { size: 140, label: paidToday.length + '' }) : '<p class="muted">Aún no hay cobros hoy.</p>'}</div>
        <div class="card stack"><h3 style="margin:0">Cobros de hoy</h3><div data-list></div></div>
      </div>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-charge]'); if (b) chargeModal(b.dataset.charge, ctx.user); });
    smartTable(el.querySelector('[data-list]'), {
      rows: () => db.query('sessions', s => s.status === 'pagada' && isoDay(s.closedAt) === today),
      columns: [
        { key: 'closedAt', label: 'Hora', render: r => time(r.closedAt) },
        { key: 'tableNumber', label: 'Mesa' },
        { key: 'method', label: 'Medio', render: r => escape(r.method) },
        { key: 'total', label: 'Total', render: r => money(r.total) }
      ],
      pageSize: 6,
      csv: { name: 'cierre-caja', map: r => ({ hora: r.closedAt, mesa: r.tableNumber, personas: r.guests, subtotal: r.subtotal, propina: r.tip, total: r.total, medio: r.method }) },
      empty: 'Sin cobros hoy'
    });
  }
};
