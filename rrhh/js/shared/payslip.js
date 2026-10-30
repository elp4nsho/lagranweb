// Liquidación de sueldo detallada e imprimible (cálculo simulado).
import { modal, money, escape, date } from '../../../assets/core/ui.js';
import { COMPANY, toWords } from './util.js';
import { slipDetail, PARAMS } from './payroll.js';
import { parseKey } from './dates.js';

export const periodLabel = p => parseKey(`${p}-15`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

export function payslipHTML(slip, emp, dept) {
  const d = slipDetail(slip);
  const row = (l, v, cls = '') => `<tr class="${cls}"><td>${l}</td><td class="num">${money(v)}</td></tr>`;
  const haberes = d.honorarios
    ? [row('Honorarios brutos', d.base), d.bonos ? row('Bonos', d.bonos) : ''].join('') + row('Total haberes', d.totalHaberes, 'total')
    : [row('Sueldo base', d.base), row('Gratificación legal (art. 50, tope 4,75 IMM)', d.gratificacion), d.horasExtra ? row(`Horas extra (${d.horasExtraHrs} h al 50 %)`, d.horasExtra) : '', d.bonos ? row('Bonos / comisiones', d.bonos) : '',
      row('Total imponible', d.imponible, 'total'), row('Asignación de colación', d.colacion), row('Asignación de movilización', d.movilizacion), row('Total no imponible', d.noImponible, 'sub'), row('Total haberes', d.totalHaberes, 'total')].join('');
  const desc = d.honorarios
    ? row(`Retención boleta de honorarios (${(PARAMS.retencionHonorarios * 100).toFixed(2).replace('.', ',')} %)`, d.impuesto) + (d.otrosDesc ? row('Otros descuentos', d.otrosDesc) : '') + row('Total descuentos', d.totalDescuentos, 'total')
    : [row(`AFP ${escape(d.afpName)} (${String(d.afpRate).replace('.', ',')} %)`, d.afp), row(d.healthName === 'Fonasa' ? 'Salud Fonasa (7 %)' : `Salud ${escape(d.healthName)} (plan ${String(d.healthUF).replace('.', ',')} UF)`, d.salud),
      row(d.cesantia ? 'Seguro de cesantía (0,6 %)' : 'Seguro de cesantía (plazo fijo: 0 %)', d.cesantia), row('Impuesto único 2.ª categoría', d.impuesto),
      d.anticipo ? row('Anticipo', d.anticipo) : '', d.otrosDesc ? row('Otros descuentos (préstamo / caja)', d.otrosDesc) : '', row('Total descuentos', d.totalDescuentos, 'total')].join('');
  return `<article class="payslip" id="payslip">
    <div class="payslip-head"><div><h2>Liquidación de sueldo</h2><div class="muted">${escape(periodLabel(slip.period))}</div></div><div style="text-align:right"><b>${escape(COMPANY.name)}</b><div class="muted small">RUT ${COMPANY.rut}<br>${escape(COMPANY.address)}</div></div></div>
    <div class="payslip-grid">
      <div><span>Nombre</span><b>${escape(emp ? `${emp.first} ${emp.last}` : '')}</b></div><div><span>RUT</span><b>${escape(emp?.rut || '')}</b></div>
      <div><span>Cargo</span><b>${escape(slip.position || emp?.position || '')}</b></div><div><span>Departamento</span><b>${escape(dept?.name || '')}</b></div>
      <div><span>Fecha de ingreso</span><b>${emp ? escape(date(emp.hireDate + 'T12:00')) : ''}</b></div><div><span>Contrato</span><b>${escape(slip.contractType)}</b></div>
      <div><span>Días trabajados</span><b>30</b></div><div><span>Base tributable</span><b>${money(d.tributable)}</b></div>
    </div>
    <div class="payslip-cols">
      <div><table><thead><tr><th>Haberes</th><th class="num">Monto</th></tr></thead><tbody>${haberes}</tbody></table></div>
      <div><table><thead><tr><th>Descuentos</th><th class="num">Monto</th></tr></thead><tbody>${desc}</tbody></table></div>
    </div>
    <div class="payslip-net"><span>Líquido a pagar<br><small class="muted">Son: ${escape(toWords(d.liquido))} pesos</small></span><b>${money(d.liquido)}</b></div>
    <p class="muted small" style="margin:12px 0 0">Valores referenciales y simulados (UF ${money(PARAMS.uf)}, UTM ${money(PARAMS.utm)}, IMM ${money(PARAMS.imm)}). Documento de demostración sin validez legal.</p>
    <div class="payslip-foot"><div>Firma empleador</div><div>Recibí conforme · firma trabajador/a</div></div>
  </article>`;
}

export function openPayslip(slip, emp, dept) {
  const m = modal({ title: `Liquidación · ${periodLabel(slip.period)}`, size: 'lg', body: payslipHTML(slip, emp, dept), foot: '<button type="button" class="btn btn-ghost" data-close>Cerrar</button><button type="button" class="btn btn-primary" data-print>🖨 Imprimir / PDF</button>' });
  m.el.querySelector('[data-print]').onclick = () => {
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); window.print(); setTimeout(done, 1500);
  };
  return m;
}
