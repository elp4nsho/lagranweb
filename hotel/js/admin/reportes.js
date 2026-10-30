// Reportes: ingresos y ocupación por mes, por tipo y por canal; cancelaciones, anticipación y estadía promedio.
import { money, barChart, escape, downloadCSV, toast } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { channelName, today } from '../shared/hotel.js';
import { diffDays, monthName } from '../shared/dates.js';

export default {
  id: 'reportes', label: 'Reportes', icon: '📈', group: 'Revenue', roles: ['admin', 'revenue'], watch: ['reservations'],
  render(el) {
    const all = db.all('reservations');
    const ok = all.filter(r => r.status !== 'cancelada');
    const rooms = db.count('rooms') || 1;
    const months = [...new Set(all.map(r => r.checkIn.slice(0, 7)))].sort();
    const rows = months.map(m => {
      const [y, mm] = m.split('-').map(Number);
      const dim = new Date(y, mm, 0).getDate();
      const rs = ok.filter(r => r.checkIn.slice(0, 7) === m);
      const nights = rs.reduce((a, r) => a + r.nights, 0), rev = rs.reduce((a, r) => a + r.roomTotal, 0);
      return { mes: monthName(y, mm - 1), reservas: rs.length, noches: nights, ocupacion: Math.min(100, Math.round(nights / (rooms * dim) * 100)), ingresos_alojamiento: rev, ingresos_extras: rs.reduce((a, r) => a + r.extrasTotal, 0), adr: nights ? Math.round(rev / nights) : 0, cancelaciones: all.filter(r => r.status === 'cancelada' && r.checkIn.slice(0, 7) === m).length };
    });
    const types = db.all('roomTypes').map(t => { const rs = ok.filter(r => r.roomTypeId === t.id); return { label: t.name.split(' ')[0], value: Math.round(rs.reduce((a, r) => a + r.total, 0) / 1e6 * 10) / 10 }; });
    const chans = db.all('channels').map(c => ({ label: c.name.split(' ')[0], value: ok.filter(r => r.channel === c.id).length })).filter(x => x.value);
    const lead = ok.map(r => diffDays(r.createdAt.slice(0, 10), r.checkIn)).filter(x => x >= 0);
    const cancelRate = all.length ? all.filter(r => r.status === 'cancelada').length / all.length * 100 : 0;
    el.innerHTML = `${pageHead('Reportes', 'Indicadores de revenue con los datos del PMS', '<button class="btn btn-sm" data-csv>⇩ Exportar CSV</button>')}
      <div class="kpi-grid">${kpi('Estadía promedio', (ok.reduce((a, r) => a + r.nights, 0) / (ok.length || 1)).toFixed(1) + ' noches')}${kpi('Anticipación promedio', Math.round(lead.reduce((a, x) => a + x, 0) / (lead.length || 1)) + ' días')}${kpi('Tasa de cancelación', cancelRate.toFixed(1) + '%')}${kpi('No-show', String(all.filter(r => r.status === 'no-show').length))}</div>
      <div class="card"><h3>Ocupación por mes (%)</h3>${barChart(rows.map(r => ({ label: r.mes.split(' ')[0].slice(0, 3), value: r.ocupacion })), { format: v => v + '%' })}</div>
      <div class="grid-2"><div class="card"><h3>Ingresos por tipo (millones)</h3>${barChart(types)}</div><div class="card"><h3>Reservas por canal</h3>${barChart(chans)}</div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Mes</th><th>Reservas</th><th>Noches</th><th>Ocupación</th><th>Alojamiento</th><th>Extras</th><th>ADR</th><th>Cancel.</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="nowrap"><b>${escape(r.mes)}</b>${r.mes.includes(String(new Date().getFullYear())) && rows.indexOf(r) >= rows.findIndex(x => x.mes === monthName(new Date().getFullYear(), new Date().getMonth())) ? '' : ''}</td><td>${r.reservas}</td><td>${r.noches}</td><td>${r.ocupacion}%</td><td>${money(r.ingresos_alojamiento)}</td><td>${money(r.ingresos_extras)}</td><td>${money(r.adr)}</td><td>${r.cancelaciones}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">Meses futuros muestran lo ya reservado (on the books) al ${today()}.</p>`;
    el.querySelector('[data-csv]').onclick = () => { downloadCSV(`reporte-mensual-${today()}.csv`, rows); toast('Reporte exportado', 'success'); };
  }
};
