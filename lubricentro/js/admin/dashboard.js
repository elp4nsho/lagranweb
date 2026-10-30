// Dashboard: KPIs, autos por día, ingresos, utilización de bahías, espera y conversión de recomendaciones.
import { escape, money, num, lineChart, barChart, donutChart, ago } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { branches, branchById, dailySeries, branchLive, baysOf, waitLabel, waitTone, lowStock, today, iso, serviceById, userName, hoursOf } from '../shared/domain.js';
import { myBranch, branchSelect } from './common.js';

let sel = null;
const short = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace('.', ',')} M` : money(n);
const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);
const pctD = (a, b) => b ? ((a - b) / b * 100) : 0;
const delta = (a, b, inv = false) => { const d = pctD(a, b); return [`${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1).replace('.', ',')}% vs. período anterior`, inv ? d <= 0 : d >= 0]; };

function utilToday(bid) {
  const bs = bid ? [branchById(bid)] : branches();
  let used = 0, cap = 0;
  const now = new Date(), T = today();
  bs.forEach(b => {
    const h = hoursOf(b, T); if (!h) return;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const open = Math.max(0, Math.min(nowMin, h.close) - h.open);
    cap += open * baysOf(b.id).length;
    db.query('jobs', j => j.branchId === b.id && j.startedAt && iso(j.startedAt) === T).forEach(j => { used += Math.max(0, (new Date(j.doneAt || now) - new Date(j.startedAt)) / 6e4); });
  });
  return cap ? Math.min(100, used / cap * 100) : 0;
}

export default {
  id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'General', roles: ['admin', 'jefe'], watch: ['jobs', 'products', 'branches', 'bays'],
  render(el, ctx) {
    if (sel === null) sel = myBranch(ctx);
    const paint = () => {
      const s90 = dailySeries(60, sel), cur = s90.slice(30), prev = s90.slice(0, 30);
      const s180 = dailySeries(180, sel);
      const T = today();
      const todayJobs = db.query('jobs', j => (!sel || j.branchId === sel) && (j.status === 'pagado' ? iso(j.paidAt) === T : ['en-fila', 'en-bahia', 'listo'].includes(j.status)));
      const yest = cur.at(-2)?.cars || 0;
      const ticket = sum(cur, 'rev') / Math.max(1, sum(cur, 'cars')), ticketP = sum(prev, 'rev') / Math.max(1, sum(prev, 'cars'));
      const waitAvg = cur.filter(d => d.cars).reduce((s, d) => s + d.wait, 0) / Math.max(1, cur.filter(d => d.cars).length);
      const waitP = prev.filter(d => d.cars).reduce((s, d) => s + d.wait, 0) / Math.max(1, prev.filter(d => d.cars).length);
      const conv = sum(cur, 'upA') / Math.max(1, sum(cur, 'upO')) * 100, convP = sum(prev, 'upA') / Math.max(1, sum(prev, 'upO')) * 100;
      const months = {};
      s180.forEach(d => { const k = d.d.slice(0, 7); months[k] = (months[k] || 0) + d.rev; });
      const recentJobs = db.query('jobs', j => (!sel || j.branchId === sel) && j.status === 'pagado' && j.paidAt >= new Date(Date.now() - 9 * 864e5).toISOString());
      const mix = {};
      recentJobs.forEach(j => j.items.forEach(i => { const n = serviceById(i.s)?.cat || 'Otros'; mix[n] = (mix[n] || 0) + 1; }));
      const per = branches().map(b => { const s = dailySeries(30, b.id); const o = sum(s, 'upO'); return { b, cars: sum(s, 'cars'), rev: sum(s, 'rev'), wait: s.filter(d => d.cars).reduce((a, d) => a + d.wait, 0) / Math.max(1, s.filter(d => d.cars).length), conv: sum(s, 'upA') / Math.max(1, o) * 100, util: sum(s, 'bayMin') / Math.max(1, baysOf(b.id).length * 26 * 600) * 100 }; });
      const maxCars = Math.max(1, ...per.map(p => p.cars)), maxWait = Math.max(1, ...per.map(p => p.wait));
      const low = lowStock(sel);
      const logs = db.getValue('_log', []).slice(0, 8);
      el.innerHTML = `${pageHead('Dashboard', `Operación ${sel ? 'de ' + escape(branchById(sel)?.name) : 'de toda la cadena'} · últimos 30 días`, branchSelect(sel))}
        <div class="kpi-grid">
          ${kpi('Autos hoy', num(todayJobs.length), `ayer: ${yest}`, todayJobs.length >= yest)}
          ${kpi('Ingresos 30 días', short(sum(cur, 'rev')), ...delta(sum(cur, 'rev'), sum(prev, 'rev')))}
          ${kpi('Ticket promedio', money(ticket), ...delta(ticket, ticketP))}
          ${kpi('Utilización bahías hoy', `${Math.round(utilToday(sel))}%`, '', true, 'minutos en bahía / capacidad')}
          ${kpi('Espera promedio', `${Math.round(waitAvg)} min`, ...delta(waitAvg, waitP, true))}
          ${kpi('Conversión recomendaciones', `${conv.toFixed(1).replace('.', ',')}%`, ...delta(conv, convP))}
        </div>
        <div class="grid-2">
          <div class="card"><div class="row between"><h3 style="margin:0">Autos atendidos por día</h3><small class="muted">30 días</small></div>${lineChart(cur.map(d => ({ label: d.d.slice(8), value: d.cars })), { format: v => `${v} autos` })}</div>
          <div class="card"><div class="row between"><h3 style="margin:0">Ingresos por mes</h3><small class="muted">6 meses</small></div>${barChart(Object.entries(months).slice(-6).map(([k, v]) => ({ label: new Date(k + '-15').toLocaleDateString('es-CL', { month: 'short' }), value: v })), { format: money })}</div>
        </div>
        <div class="grid-2">
          <div class="card stack"><h3 style="margin:0">Comparativo por sucursal (30 días)</h3>
            <div class="table-wrap"><table class="table"><thead><tr><th>Sucursal</th><th>Autos</th><th>Ingresos</th><th>Espera</th><th>Uso</th></tr></thead><tbody>${per.map(p => `<tr><td><b>${escape(p.b.name)}</b></td><td>${num(p.cars)}</td><td>${short(p.rev)}</td><td>${Math.round(p.wait)}′</td><td>${Math.round(p.util)}%</td></tr>`).join('')}</tbody></table></div>
            <b class="small">Autos</b>${per.map(p => `<div class="bar-row"><span>${escape(p.b.name)}</span><div class="progress"><i style="--v:${p.cars / maxCars * 100}%"></i></div><b>${p.cars}</b></div>`).join('')}
            <b class="small">Espera promedio</b>${per.map(p => `<div class="bar-row"><span>${escape(p.b.name)}</span><div class="progress"><i style="--v:${p.wait / maxWait * 100}%"></i></div><b>${Math.round(p.wait)} min</b></div>`).join('')}
          </div>
          <div class="stack">
            <div class="card"><h3>Mix de servicios (últimos días)</h3>${donutChart(Object.entries(mix).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { label: num(Object.values(mix).reduce((a, b) => a + b, 0)), format: v => `${v} servicios` })}</div>
            <div class="card"><h3>Recomendaciones (upsell) por sucursal</h3>${barChart(per.map(p => ({ label: p.b.name, value: Math.round(p.conv) })), { height: 150, format: v => v + '% aprobadas' })}</div>
          </div>
        </div>
        <div class="grid-3">
          <div class="card stack"><div class="row between"><h3 style="margin:0">Ahora en sucursales</h3><span class="live-dot"></span></div>${branches().filter(b => !sel || b.id === sel).map(b => { const l = branchLive(b.id); return `<div class="row between nowrap small"><span><b>${escape(b.name)}</b><small class="muted d-block">${l.inBay}/${l.bays} en bahía · ${l.queue} en fila</small></span><span class="badge badge-${waitTone(l.wait)}">${escape(waitLabel(l.wait))}</span></div>`; }).join('')}<a class="btn btn-sm" href="operario.html">Abrir tablero de bahías</a></div>
          <div class="card stack"><div class="row between"><h3 style="margin:0">Stock crítico</h3><a class="small" href="#/inventario">Ver inventario</a></div>${low.slice(0, 6).map(p => `<div class="row between nowrap small"><span>${escape(p.name)}</span><span class="stock-low">${Object.entries(p.stock).filter(([b, n]) => (!sel || b === sel) && n < p.min).map(([b, n]) => `${escape(branchById(b)?.name || b)}: ${n}`).join(' · ')}</span></div>`).join('') || '<p class="muted small">Todo sobre el mínimo 👍</p>'}</div>
          <div class="card stack"><h3 style="margin:0">Actividad reciente</h3>${logs.map(l => `<div class="small"><b>${escape(l.detail || l.action)}</b><small class="muted d-block">${escape(userName(l.user) === '—' ? 'Sistema / cliente' : userName(l.user))} · ${ago(l.at)}</small></div>`).join('') || '<p class="muted small">Sin actividad aún.</p>'}</div>
        </div>`;
      el.querySelector('[data-branch]').onchange = e => { sel = e.target.value; paint(); };
    };
    paint();
    return { refresh: paint };
  }
};
