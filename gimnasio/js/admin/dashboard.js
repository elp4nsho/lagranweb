import { escape, money, pct, lineChart, barChart, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { donut, hbars } from '../shared/charts.js';
import { mrr, monthlyEq, plan, klass, discipline } from '../shared/domain.js';
import { ymd, addDays, parseYmd, DOW_S, MONTHS } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderDashboard(v) {
  const today = ymd(), members = db.all('members');
  const active = members.filter(m => m.status === 'activo').length;
  const paying = members.filter(m => ['activo', 'moroso'].includes(m.status));
  const churned = members.filter(m => m.status === 'baja' && m.leftAt >= addDays(today, -30)).length;
  const churn = churned / Math.max(1, paying.length + churned) * 100;
  const newM = members.filter(m => m.since >= addDays(today, -30)).length;
  const morosos = members.filter(m => m.status === 'moroso');
  // MRR histórico (pagos mensualizados por mes)
  const pays = db.query('payments', p => p.status === 'pagado');
  const months = Array.from({ length: 6 }, (_, i) => { const d = parseYmd(today); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return ymd(d).slice(0, 7); });
  const mrrHist = months.map(mo => ({ label: MONTHS[+mo.slice(5) - 1].slice(0, 3), value: pays.filter(p => p.at.slice(0, 7) === mo).reduce((s, p) => s + (/Anualidad/.test(p.concept) ? p.amount / 12 : p.amount), 0) }));
  mrrHist[5].value = Math.max(mrrHist[5].value, mrr());
  // Heatmap de check-ins por hora y día
  const ck = db.all('checkins');
  const grid = {}; let max = 1;
  ck.forEach(k => { const d = new Date(k.at), key = d.getDay() + '-' + d.getHours(); grid[key] = (grid[key] || 0) + 1; max = Math.max(max, grid[key]); });
  const hours = Array.from({ length: 18 }, (_, i) => i + 5), days = [1, 2, 3, 4, 5, 6, 0];
  // Ocupación de clases por disciplina (últimas 2 semanas)
  const occ = {}; db.all('sessions').forEach(s => { const c = klass(s.classId); if (!c) return; const o = occ[c.disciplineId] ||= { b: 0, c: 0 }; o.b += s.booked; o.c += c.capacity; });
  const occList = Object.entries(occ).map(([id, o]) => ({ label: discipline(id)?.name || id, value: Math.round(o.b / o.c * 100) })).sort((a, b) => b.value - a.value);
  const byPlan = db.query('plans').map(p => ({ label: p.name, value: paying.filter(m => m.planId === p.id).length }));
  const todayCk = ck.filter(k => ymd(new Date(k.at)) === today).length;
  const sales30 = db.query('sales', s => s.at >= addDays(today, -30)).reduce((s, x) => s + x.total, 0);
  v.innerHTML = `${pageHead('Dashboard', `Red Titán Fit · ${db.count('branches')} sedes`, `<a class="btn btn-primary" href="#/socios?nuevo=1">${icon('plus', 16)} Nuevo socio</a>`)}
  <div class="grid-4">
    ${statCard('Socios activos', active, `<span class="delta up">▲ ${newM} nuevos en 30 días</span>`, 'users')}
    ${statCard('MRR', money(mrr()), `<span class="muted small">ingreso mensual recurrente</span>`, 'money')}
    ${statCard('Churn 30 días', pct(churn, 1), `<span class="delta ${churn > 5 ? 'down' : 'up'}">${churned} bajas</span>`, 'logout')}
    ${statCard('Morosos', morosos.length, `<span class="delta down">${money(morosos.reduce((s, m) => s + monthlyEq(m), 0))} por cobrar</span>`, 'bell')}
  </div>
  <div class="grid-main">
    <div class="card"><div class="card-title"><h3>Ingresos por membresías (6 meses)</h3><span class="badge">MRR</span></div>${lineChart(mrrHist, { height: 190, format: money })}</div>
    <div class="card"><div class="card-title"><h3>Socios por plan</h3></div>${donut(byPlan, { center: String(paying.length) })}</div>
  </div>
  <div class="card"><div class="card-title"><h3>Check-ins por hora · últimas 4 semanas</h3><span class="muted small">Hoy: ${todayCk} ingresos</span></div>
    <div class="scroll-x"><div class="heat" style="--cols:${hours.length}"><span></span>${hours.map(h => `<span class="hd">${h}</span>`).join('')}
    ${days.map(d => `<span class="lbl">${DOW_S[d]}</span>${hours.map(h => { const n = grid[d + '-' + h] || 0; return `<span class="cell" style="--v:${(n / max).toFixed(2)}" title="${DOW_S[d]} ${h}:00 · ${n} ingresos"></span>`; }).join('')}`).join('')}</div></div></div>
  <div class="grid-2">
    <div class="card"><div class="card-title"><h3>Ocupación de clases por disciplina</h3><span class="muted small">14 días</span></div>${hbars(occList, { format: x => x + '%', max: 100 })}</div>
    <div class="stack">
      <div class="card"><div class="card-title"><h3>Altas por mes</h3></div>${barChart(months.map(mo => ({ label: MONTHS[+mo.slice(5) - 1].slice(0, 3), value: members.filter(m => m.since.slice(0, 7) === mo).length })), { height: 130 })}</div>
      <div class="card"><div class="card-title"><h3>Actividad reciente</h3><a class="small" href="#/bitacora">Ver todo</a></div><ul class="feed">${db.all('_log').slice(0, 6).map(l => `<li><span class="dot"></span><span><b>${escape(l.action)}</b> · ${escape(l.detail)}<br><small class="muted">${ago(l.at)}</small></span></li>`).join('') || '<li class="muted">Sin actividad</li>'}</ul></div>
    </div>
  </div>
  <div class="grid-3">${statCard('Ventas tienda (30 d)', money(sales30), '', 'cart')}${statCard('Clases semanales', db.count('classes', c => c.active !== false), '', 'calendar')}${statCard('Rutinas activas', db.count('routines', r => r.active), '', 'dumbbell')}</div>`;
}
