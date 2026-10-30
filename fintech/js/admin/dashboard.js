// Resumen del back-office: KPIs y gráficos de clientes, depósitos, volumen y fraude.
import { db, userName } from '../data/db.js';
import { money, num, ago, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { lastMonths, monthKey, investmentValue } from '../shared/bank.js';
import { stackedBars, short } from '../shared/charts.js';
import { pageHead } from './kit.js';

export function render(el, { user }) {
  const customers = db.query('users', u => u.role === 'cliente');
  const active = customers.filter(u => u.kyc === 'aprobado' && u.active !== false);
  const accs = db.all('accounts');
  const dep = { vista: 0, ahorro: 0 };
  accs.forEach(a => { if (a.type in dep) dep[a.type] += a.balance; });
  const invested = db.all('investments').reduce((s, i) => s + investmentValue(i), 0);
  const txs = db.all('transactions');
  const since30 = Date.now() - 30 * 864e5;
  const vol30 = txs.filter(t => new Date(t.date) >= since30).reduce((s, t) => s + Math.abs(t.amount), 0);
  const months = lastMonths(6);
  const volM = months.map(m => ({ label: m.label, value: txs.filter(t => monthKey(t.date) === m.key).reduce((s, t) => s + Math.abs(t.amount), 0) }));
  const newC = months.map(m => ({ label: m.label, value: customers.filter(u => monthKey(u.createdAt) === m.key).length }));
  const alerts = db.all('alerts');
  const open = alerts.filter(a => a.status !== 'cerrada');
  const weeks = Array.from({ length: 8 }, (_, i) => { const end = Date.now() - (7 - i) * 7 * 864e5; return { start: end - 7 * 864e5, end, label: `S${i + 1}` }; });
  const alertW = weeks.map(w => { const values = {}; alerts.filter(a => { const t = new Date(a.createdAt).getTime(); return t > w.start && t <= w.end; }).forEach(a => values[a.severity] = (values[a.severity] || 0) + 1); return { label: w.label, values }; });
  const byType = {};
  txs.filter(t => new Date(t.date) >= since30).forEach(t => byType[t.type] = (byType[t.type] || 0) + 1);
  const loans = db.all('loans');
  const portfolio = loans.filter(l => l.status === 'desembolsado').reduce((s, l) => s + l.amount, 0);
  const pendKyc = customers.filter(u => u.kyc === 'pendiente').length;
  const log = db.getValue('_log', []).slice(0, 8);
  const prevVol = volM.at(-2)?.value || 1;
  const delta = ((volM.at(-1).value / (new Date().getDate() / 30)) / prevVol - 1) * 100;

  el.innerHTML = h`${raw(pageHead('Resumen', `Hola ${user.name.split(' ')[0]} · datos ficticios en tiempo real`))}
  <div class="dash">
  <div class="kpis d-kpis">
    <div class="card"><div class="stat"><span class="label">Clientes activos</span><span class="value">${num(active.length)}</span><span class="small muted">${pendKyc} solicitudes por revisar</span></div></div>
    <div class="card"><div class="stat"><span class="label">Depósitos totales</span><span class="value">$${short(dep.vista + dep.ahorro)}</span><span class="small muted">Vista ${money(dep.vista)}</span></div></div>
    <div class="card"><div class="stat"><span class="label">Volumen 30 días</span><span class="value">$${short(vol30)}</span><span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')}% proyección mes</span></div></div>
    <div class="card"><div class="stat"><span class="label">Alertas de fraude abiertas</span><span class="value">${open.length}</span><span class="small muted">${alerts.filter(a => a.status === 'abierta').length} sin asignar · ${alerts.filter(a => a.resolution === 'Fraude confirmado').length} fraudes confirmados</span></div></div>
    <div class="card"><div class="stat"><span class="label">Cartera de créditos</span><span class="value">$${short(portfolio)}</span><span class="small muted">${loans.filter(l => ['solicitado', 'en evaluación'].includes(l.status)).length} solicitudes en cola</span></div></div>
  </div>
  <div class="grid-2">
    <section class="card d-vol"><h3>Volumen transaccional mensual</h3>${raw(lineChart(volM, { format: v => money(v) }))}</section>
    <section class="card d-new"><h3>Nuevos clientes por mes</h3>${raw(barChart(newC))}</section>
    <section class="card d-alerts"><h3>Alertas de fraude por semana</h3>${raw(stackedBars(alertW, ['alta', 'media', 'baja']))}</section>
    <section class="card d-dep"><h3>Depósitos e inversiones</h3>${raw(donutChart([{ label: 'Cuenta vista (M$)', value: Math.round(dep.vista / 1e6) }, { label: 'Ahorro (M$)', value: Math.round(dep.ahorro / 1e6) }, { label: 'Fondos (M$)', value: Math.round(invested / 1e6) }], { label: '$' + short(dep.vista + dep.ahorro + invested) }))}
      <h3 class="mt">Operaciones 30 días por tipo</h3>${raw(donutChart(Object.entries(byType).map(([label, value]) => ({ label, value })), { size: 140 }))}</section>
  </div>
  <section class="card d-act"><div class="row between"><h3 style="margin:0">Actividad reciente</h3><a href="#/auditoria" class="small">Ver auditoría →</a></div>
    <ul class="tx-list mt">${log.map(l => h`<li><span class="tx-ic">📌</span><span class="tx-main"><b>${l.detail || l.action}</b><small>${l.action} · ${userName(l.user)} · ${ago(l.at)}</small></span></li>`)}</ul>${!log.length ? raw('<p class="muted">Sin actividad registrada.</p>') : ''}
  </section>
  </div>`;
}
