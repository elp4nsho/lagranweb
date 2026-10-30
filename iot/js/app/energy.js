// Reportes de energía: consumo diario por medidor, por zona y costo estimado en CLP.
import { db, site } from '../data/db.js';
import { money, num, barChart, donutChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { dailyKwh } from '../shared/sim.js';
import { pageHead, csv, zoneName, siteName } from '../shared/common.js';

const st = { days: 30, site: '' };

export function render(el, ctx) {
  const tariff = site().tariff || 120;
  const meters = db.query('devices', d => d.type === 'energia' && (!st.site || d.siteId === st.site));
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const days = Array.from({ length: st.days }, (_, i) => day0.getTime() - (st.days - i) * 864e5);
  const prevDays = days.map(d => d - st.days * 864e5);
  const total = (list, ds) => list.reduce((s, m) => s + ds.reduce((a, d) => a + dailyKwh(m, d), 0), 0);
  const cur = total(meters, days), prev = total(meters, prevDays);
  const delta = prev ? (cur / prev - 1) * 100 : 0;
  const daily = days.map(d => ({ label: new Date(d).getDate() + '', value: meters.reduce((s, m) => s + dailyKwh(m, d), 0) }));
  const byMeter = meters.map(m => ({ m, kwh: days.reduce((a, d) => a + dailyKwh(m, d), 0), prev: prevDays.reduce((a, d) => a + dailyKwh(m, d), 0) })).sort((a, b) => b.kwh - a.kwh);
  const peak = daily.reduce((a, b) => (b.value > a.value ? b : a), daily[0]);
  el.innerHTML = pageHead('Energía', `Tarifa referencial ${money(tariff)}/kWh (configurable en Administración)`, `<select class="select" id="es" style="width:auto" aria-label="Sitio"><option value="">Todos los sitios</option>${db.all('sites').map(s => `<option value="${s.id}" ${st.site === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select><select class="select" id="ed" style="width:auto" aria-label="Periodo">${[[7, '7 días'], [14, '14 días'], [30, '30 días']].map(([v, l]) => `<option value="${v}" ${st.days === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn btn-sm" data-csv>⬇ CSV</button>`) + h`
  <div class="kpis">
    <div class="card"><div class="stat"><span class="label">Consumo del periodo</span><span class="value">${num(Math.round(cur / 1000))} MWh</span><span class="delta ${delta <= 0 ? 'up' : 'down'}">${delta <= 0 ? '▼' : '▲'} ${Math.abs(delta).toFixed(1).replace('.', ',')}% vs periodo anterior</span></div></div>
    <div class="card"><div class="stat"><span class="label">Costo estimado</span><span class="value">${money(cur * tariff)}</span><span class="small muted">anterior ${money(prev * tariff)}</span></div></div>
    <div class="card"><div class="stat"><span class="label">Promedio diario</span><span class="value">${num(Math.round(cur / st.days))} kWh</span><span class="small muted">peak día ${peak.label}: ${num(peak.value)} kWh</span></div></div>
    <div class="card"><div class="stat"><span class="label">Huella estimada</span><span class="value">${num(Math.round(cur * .00038))} tCO₂e</span><span class="small muted">factor SEN referencial</span></div></div>
  </div>
  <section class="card"><h3>Consumo diario (kWh)</h3>${raw(barChart(daily, { format: v => num(v) + ' kWh' }))}</section>
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Distribución por medidor (MWh)</h3>${raw(donutChart(byMeter.map(b => ({ label: b.m.name, value: Math.round(b.kwh / 1000) })), { label: num(Math.round(cur / 1000)) }))}</section>
    <section class="card"><h3>Detalle por medidor</h3><div class="table-wrap"><table class="table"><thead><tr><th>Medidor</th><th class="right">kWh</th><th class="right">Costo</th><th class="right">Var.</th></tr></thead><tbody>
      ${byMeter.map(b => { const v = b.prev ? (b.kwh / b.prev - 1) * 100 : 0; return h`<tr><td><b>${b.m.name}</b><br><span class="small muted">${zoneName(b.m.zoneId)} · ${siteName(b.m.siteId)}</span></td><td class="right mono">${num(b.kwh)}</td><td class="right mono">${money(b.kwh * tariff)}</td><td class="right">${raw(`<span class="badge badge-${v <= 0 ? 'success' : 'warning'}">${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%</span>`)}</td></tr>`; })}
    </tbody></table></div></section>
  </div>`;
  el.querySelector('#es').onchange = e => { st.site = e.target.value; ctx.refresh(); };
  el.querySelector('#ed').onchange = e => { st.days = +e.target.value; ctx.refresh(); };
  el.querySelector('[data-csv]').onclick = () => csv('energia-sentinela.csv', days.flatMap(d => meters.map(m => ({ fecha: new Date(d).toISOString().slice(0, 10), medidor: m.name, sitio: siteName(m.siteId), kwh: dailyKwh(m, d), costo_clp: Math.round(dailyKwh(m, d) * tariff) }))));
}
