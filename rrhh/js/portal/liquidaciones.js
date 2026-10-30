// Mis liquidaciones de sueldo: evolución, listado y detalle imprimible.
import { escape, money, barChart } from '../../../assets/core/ui.js';
import { slipDetail } from '../shared/payroll.js';
import { openPayslip, periodLabel } from '../shared/payslip.js';

export function render(el, ctx, params = {}) {
  const { db } = ctx, me = ctx.me;
  const slips = db.query('payslips', p => p.employeeId === me.id).sort((a, b) => b.period.localeCompare(a.period));
  const det = slips.map(s => ({ s, d: slipDetail(s) }));
  const avg = det.length ? det.reduce((a, x) => a + x.d.liquido, 0) / det.length : 0;
  el.innerHTML = `<div class="page-head"><div><h1>Liquidaciones de sueldo</h1><p class="muted" style="margin:4px 0 0">Detalle de haberes y descuentos (AFP, salud, cesantía, impuesto). Cálculo simulado con fines demostrativos.</p></div></div>
    ${det.length ? `<div class="dash-grid">
      <div class="card span-8"><div class="card-h"><h3>Líquido de los últimos meses</h3><span class="muted small">Promedio ${money(avg)}</span></div>${barChart(det.slice(0, 6).reverse().map(x => ({ label: periodLabel(x.s.period).slice(0, 3), value: x.d.liquido })), { format: money })}</div>
      <div class="card span-4 stack"><h3 style="margin:0">Último mes</h3><div class="stat"><span class="label">${escape(periodLabel(det[0].s.period))}</span><span class="value">${money(det[0].d.liquido)}</span></div>
        <dl class="kv"><dt>Total haberes</dt><dd>${money(det[0].d.totalHaberes)}</dd><dt>Descuentos</dt><dd>${money(det[0].d.totalDescuentos)}</dd><dt>AFP</dt><dd>${escape(det[0].d.afpName)}</dd><dt>Salud</dt><dd>${escape(det[0].d.healthName)}</dd></dl>
        <button class="btn btn-primary" data-open="${det[0].s.id}">Ver liquidación</button></div>
      <div class="card span-12"><div class="table-wrap"><table class="table"><thead><tr><th>Periodo</th><th>Haberes</th><th>Descuentos</th><th>Líquido</th><th></th></tr></thead><tbody>
        ${det.map(({ s, d }) => `<tr><td><b>${escape(periodLabel(s.period))}</b></td><td>${money(d.totalHaberes)}</td><td>${money(d.totalDescuentos)}</td><td><b>${money(d.liquido)}</b></td><td class="right"><button class="btn btn-sm" data-open="${s.id}">Ver / imprimir</button></td></tr>`).join('')}
      </tbody></table></div></div></div>` : '<div class="card empty"><span class="icon">💵</span>Aún no tienes liquidaciones emitidas.</div>'}`;
  const open = id => { const s = db.get('payslips', id); openPayslip(s, me, ctx.dept(s.deptId || me.deptId)); };
  el.onclick = e => { const b = e.target.closest('[data-open]'); if (b) open(b.dataset.open); };
  if (params.period) { const s = slips.find(x => x.period === params.period); if (s) open(s.id); }
}
