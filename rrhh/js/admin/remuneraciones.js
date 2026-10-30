// Remuneraciones: procesos mensuales, simulación de cálculo masivo y liquidaciones por periodo.
import { escape, toast, money, barChart, modal, sleep, confirm, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, kpi } from './common.js';
import { smartTable } from '../shared/table.js';
import { personCell } from '../shared/util.js';
import { calcPayslip, slipDetail, slipRecord, PARAMS } from '../shared/payroll.js';
import { openPayslip, periodLabel } from '../shared/payslip.js';
import { shiftMonth } from '../shared/mcal.js';
import { today } from '../shared/dates.js';

let period = null;
export function render(el, ctx) {
  const { db } = ctx;
  const runs = db.all('payrollRuns').sort((a, b) => b.period.localeCompare(a.period));
  const next = runs[0] ? shiftMonth(runs[0].period, 1) : today().slice(0, 7);
  period ||= runs[0]?.period;
  const emps = Object.fromEntries(db.all('employees').map(e => [e.id, e]));
  const slips = db.query('payslips', p => p.period === period).map(s => { const d = slipDetail(s); return { ...s, e: emps[s.employeeId], name: emps[s.employeeId]?.name || '—', bruto: d.totalHaberes, desc: d.totalDescuentos, liq: d.liquido, costo: d.costoEmpresa }; });
  const run = runs.find(r => r.period === period);
  el.innerHTML = `${pageHead('Remuneraciones', `Parámetros simulados: UF ${money(PARAMS.uf)} · UTM ${money(PARAMS.utm)} · IMM ${money(PARAMS.imm)} · jornada ${PARAMS.jornada} h`, `<button class="btn btn-primary" data-run>▶ Procesar ${escape(periodLabel(next))}</button>`)}
    <div class="dash-grid">
      <div class="card span-8"><div class="card-h"><h3>Costo empresa por mes</h3><span class="muted small">millones CLP</span></div>${barChart(runs.slice(0, 8).reverse().map(r => ({ label: periodLabel(r.period).slice(0, 3), value: Math.round(r.costoTotal / 1e5) / 10 })), { format: v => `$${v} MM` })}</div>
      <div class="card span-4"><h3>Procesos</h3><div class="stack" style="gap:6px">${runs.map(r => `<button class="btn ${r.period === period ? 'btn-primary' : 'btn-ghost'} btn-block" data-period="${r.period}" style="justify-content:space-between"><span>${escape(periodLabel(r.period))}</span><small>${r.count} · ${escape(r.status)}</small></button>`).join('')}</div></div>
    </div>
    ${run ? `<div class="kpis">${kpi('Liquidaciones', run.count)}${kpi('Total líquido', money(run.totalLiquido))}${kpi('Costo empresa', money(run.costoTotal))}${kpi('Estado', run.status === 'pagada' ? 'Pagada' : 'Emitida', run.runAt ? `procesada ${new Date(run.runAt).toLocaleDateString('es-CL')}` : '')}</div>` : ''}
    <div class="card"><div class="card-h"><h3>Liquidaciones · ${escape(period ? periodLabel(period) : '')}</h3><div class="row gap-sm">${run && run.status !== 'pagada' ? '<button class="btn btn-sm" data-pay>Marcar como pagada</button><button class="btn btn-sm btn-danger" data-undo>Reprocesar</button>' : ''}<button class="btn btn-sm btn-ghost" data-previred>⭳ Archivo Previred (simulado)</button></div></div><div data-t></div></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'rem', rows: slips, sort: 'name', pageSize: 10, search: r => r.name,
    columns: [
      { key: 'name', label: 'Colaborador', render: r => personCell(r.e) }, { key: 'contractType', label: 'Contrato' },
      { key: 'bruto', label: 'Haberes', render: r => money(r.bruto) }, { key: 'desc', label: 'Descuentos', render: r => money(r.desc) },
      { key: 'liq', label: 'Líquido', render: r => `<b>${money(r.liq)}</b>` }, { key: 'costo', label: 'Costo empresa', render: r => money(r.costo) },
      { key: 'a', label: '', sort: false, render: r => `<button class="btn btn-sm" data-slip="${r.id}">Ver</button>` }
    ],
    csv: { filename: `libro-remuneraciones-${period}.csv`, map: r => { const d = slipDetail(r); return { rut: r.e?.rut, nombre: r.name, base: d.base, gratificacion: d.gratificacion, horas_extra: d.horasExtra, bonos: d.bonos, imponible: d.imponible, afp: d.afp, salud: d.salud, cesantia: d.cesantia, impuesto: d.impuesto, liquido: d.liquido, costo_empresa: d.costoEmpresa }; } }
  });
  el.onclick = async e => {
    const p = e.target.closest('[data-period]'), s = e.target.closest('[data-slip]');
    if (p) { period = p.dataset.period; render(el, ctx); }
    if (s) { const x = db.get('payslips', s.dataset.slip); openPayslip(x, emps[x.employeeId], db.get('departments', x.deptId)); }
    if (e.target.closest('[data-run]')) runPayroll(ctx, next, el);
    if (e.target.closest('[data-pay]')) { db.update('payrollRuns', run.id, { status: 'pagada' }); db.log('remuneraciones', `Marcó como pagadas las remuneraciones de ${periodLabel(period)}`, ctx.user.id); toast('Proceso marcado como pagado', 'success'); }
    if (e.target.closest('[data-undo]') && await confirm(`Se eliminarán las ${slips.length} liquidaciones de ${periodLabel(period)} para volver a procesarlas.`, { title: 'Reprocesar', danger: true, ok: 'Eliminar y reprocesar' })) { db.query('payslips', x => x.period === period).forEach(x => db.remove('payslips', x.id)); db.remove('payrollRuns', run.id); db.log('remuneraciones', `Anuló el proceso de ${periodLabel(period)}`, ctx.user.id); period = null; toast('Proceso anulado', 'success'); }
    if (e.target.closest('[data-previred]')) downloadCSV(`previred-${period}.csv`, slips.map(r => { const d = slipDetail(r); return { rut: r.e?.rut, nombre: r.name, afp: d.afpName, imponible: d.imponible, cotizacion_afp: d.afp, salud: d.healthName, cotizacion_salud: d.salud, cesantia: d.cesantia }; }));
  };
}

async function runPayroll(ctx, period, el) {
  const { db } = ctx;
  if (db.find('payrollRuns', r => r.period === period)) return toast('Ese periodo ya fue procesado', 'warning');
  const T = `${period}-28`;
  const emps = db.query('employees', e => e.hireDate <= T && (!e.exitDate || e.exitDate >= `${period}-01`));
  const preview = emps.map(e => ({ e, d: calcPayslip(e, period, {}) }));
  const m = modal({ title: `Procesar remuneraciones · ${periodLabel(period)}`, size: 'lg', body: `<div class="stack">
    <p class="muted" style="margin:0">Se generarán <b>${emps.length}</b> liquidaciones con sueldo base, gratificación, AFP, salud, cesantía e impuesto único. Puedes agregar horas extra y bonos antes de confirmar.</p>
    <div class="table-wrap" style="max-height:340px;overflow:auto"><table class="table compact"><thead><tr><th>Colaborador</th><th>Base</th><th>H. extra</th><th>Bono</th><th>Líquido est.</th></tr></thead><tbody>${preview.map(({ e, d }) => `<tr data-row="${e.id}"><td>${escape(e.name)}<br><small class="muted">${escape(e.contractType)}</small></td><td>${money(e.salary)}</td><td><input class="input input-sm" type="number" min="0" max="40" value="0" data-he style="width:72px" aria-label="Horas extra de ${escape(e.name)}"></td><td><input class="input input-sm" type="number" min="0" step="10000" value="0" data-bo style="width:110px" aria-label="Bono de ${escape(e.name)}"></td><td data-liq>${money(d.liquido)}</td></tr>`).join('')}</tbody></table></div>
    <div class="progress" data-prog hidden><i style="--v:0%"></i></div><p class="muted small" data-msg style="margin:0"></p></div>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-go>Procesar y emitir</button>' });
  const extras = id => { const tr = m.el.querySelector(`[data-row="${id}"]`); return { horasExtra: +tr.querySelector('[data-he]').value || 0, bonos: +tr.querySelector('[data-bo]').value || 0 }; };
  m.el.addEventListener('input', ev => { const tr = ev.target.closest('[data-row]'); if (!tr) return; const e = emps.find(x => x.id === tr.dataset.row); tr.querySelector('[data-liq]').textContent = money(calcPayslip(e, period, extras(e.id)).liquido); });
  m.el.querySelector('[data-go]').onclick = async ev => {
    ev.target.disabled = true;
    const prog = m.el.querySelector('[data-prog]'), bar = prog.querySelector('i'), msg = m.el.querySelector('[data-msg]');
    prog.hidden = false;
    const rows = emps.map(e => ({ e, x: extras(e.id) }));
    let total = 0, cost = 0;
    for (let i = 0; i < rows.length; i++) {
      const { e, x } = rows[i], d = calcPayslip(e, period, x);
      total += d.liquido; cost += d.costoEmpresa;
      if (i % 8 === 0) { bar.style.setProperty('--v', `${Math.round(i / rows.length * 100)}%`); msg.textContent = `Calculando ${e.name}…`; await sleep(60); }
    }
    rows.forEach(({ e, x }) => db.insert('payslips', slipRecord(e, period, x)));
    db.insert('payrollRuns', { period, status: 'emitida', count: rows.length, totalLiquido: total, costoTotal: cost, runAt: new Date().toISOString(), by: ctx.user.name });
    rows.forEach(({ e }) => db.insert('notifications', { employeeId: e.id, text: `Tu liquidación de ${periodLabel(period)} ya está disponible.`, at: new Date().toISOString(), read: false }));
    db.log('remuneraciones', `Procesó ${rows.length} liquidaciones de ${periodLabel(period)} (líquido total ${money(total)})`, ctx.user.id);
    bar.style.setProperty('--v', '100%');
    m.close(); period && (periodSet(period));
    toast(`${rows.length} liquidaciones emitidas y notificadas`, 'success', 4500);
  };
  function periodSet(p) { setTimeout(() => { el.querySelector(`[data-period="${p}"]`)?.click(); }, 120); }
}
