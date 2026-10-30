// Dashboard: suscriptores, MRR, churn, horas vistas, top títulos, dispositivos y planes.
import { db } from '../data/db.js';
import { html, raw, money, num, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { pageHead, kpi, monthly, pctDelta, activityList, usersById } from '../shared/admin-kit.js';
import { artCard } from '../shared/art.js';

const activeAt = (u, ts) => Date.parse(u.joinedAt) <= ts && (!u.cancelledAt || Date.parse(u.cancelledAt) > ts);

export function render(el, { user }) {
  const subs = db.query('users', u => u.role === 'suscriptor');
  const plans = Object.fromEntries(db.all('plans').map(p => [p.id, p]));
  const now = Date.now(), M = 30 * 864e5;
  const active = subs.filter(u => ['activa', 'prueba', 'morosa'].includes(u.subStatus));
  const paying = subs.filter(u => u.subStatus === 'activa');
  const mrr = paying.reduce((s, u) => s + (plans[u.plan]?.price || 0), 0);
  const mrrPrev = subs.filter(u => activeAt(u, now - M) && Date.parse(u.joinedAt) < now - M - 7 * 864e5).reduce((s, u) => s + (plans[u.plan]?.price || 0), 0);
  const startActive = subs.filter(u => activeAt(u, now - M)).length;
  const churned = subs.filter(u => u.cancelledAt && Date.parse(u.cancelledAt) > now - M).length;
  const churn = startActive ? churned / startActive * 100 : 0;
  const prevStart = subs.filter(u => activeAt(u, now - 2 * M)).length;
  const churnPrev = prevStart ? subs.filter(u => u.cancelledAt && Date.parse(u.cancelledAt) > now - 2 * M && Date.parse(u.cancelledAt) <= now - M).length / prevStart * 100 : 0;
  const views = db.all('views');
  const hrs = (a, b) => views.filter(v => { const x = Date.parse(v.createdAt); return x > now - a && x <= now - b; }).reduce((s, v) => s + v.minutes, 0) / 60;
  // Serie de suscriptores activos al cierre de cada mes
  const months = monthly([], { months: 12 }).map((m, i, arr) => {
    const d = new Date(); d.setMonth(d.getMonth() - (arr.length - 1 - i) + 1, 1); d.setHours(0, 0, 0, 0);
    const ts = Math.min(now, +d);
    const act = subs.filter(u => activeAt(u, ts));
    return { label: m.label, subs: act.length, mrr: act.reduce((s, u) => s + (plans[u.plan]?.price || 0), 0) };
  });
  const byDevice = Object.entries(views.reduce((a, v) => { a[v.device] = (a[v.device] || 0) + v.minutes; return a; }, {})).map(([label, m]) => ({ label, value: Math.round(m / 60) })).sort((a, b) => b.value - a.value);
  const top = Object.entries(views.filter(v => Date.parse(v.createdAt) > now - 90 * 864e5).reduce((a, v) => { a[v.titleId] = (a[v.titleId] || 0) + v.minutes; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTop = top[0]?.[1] || 1;
  const planMix = db.all('plans').map(p => ({ label: p.name, value: paying.filter(u => u.plan === p.id).length }));
  el.innerHTML = html`${raw(pageHead('Dashboard', `Hola, ${user.name.split(' ')[0]} · métricas de los últimos 30 días`))}
    <div class="kpis">
      ${raw(kpi('Suscriptores activos', num(active.length), pctDelta(active.length, subs.filter(u => activeAt(u, now - M)).length)))}
      ${raw(kpi('MRR', money(mrr), pctDelta(mrr, mrrPrev)))}
      ${raw(kpi('Churn mensual', `${churn.toFixed(1)}%`, churnPrev ? -(churn - churnPrev) / churnPrev * 100 : null, 'mejora vs. mes anterior'))}
      ${raw(kpi('Horas vistas (30 días)', num(Math.round(hrs(M, 0))), pctDelta(hrs(M, 0), hrs(2 * M, M))))}
    </div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Suscriptores activos</h3>${raw(lineChart(months.map(m => ({ label: m.label, value: m.subs })), { format: v => `${v} suscriptores` }))}</div>
      <div class="card chart-card"><h3>MRR mensual (miles CLP)</h3>${raw(barChart(months.map(m => ({ label: m.label, value: Math.round(m.mrr / 1000) })), { format: v => `$${num(v)} mil` }))}</div>
    </div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Horas vistas por mes</h3>${raw(barChart(monthly(views, { value: v => v.minutes / 60 }).map(d => ({ ...d, value: Math.round(d.value) })), { format: v => `${v} h` }))}</div>
      <div class="card chart-card"><h3>Horas por dispositivo</h3>${raw(donutChart(byDevice, { label: `${num(byDevice.reduce((s, d) => s + d.value, 0))} h` }))}</div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Top títulos (90 días)</h3><ul class="mini-list">${top.map(([id, m]) => { const t = db.get('titles', id); return raw(html`<li><span class="thumb">${raw(artCard(t, { title: false }))}</span><a href="#/catalogo/${id}" style="flex:1;min-width:0">${t?.title}<br><small class="muted">${t?.type === 'serie' ? 'Serie' : 'Película'} · ${t?.genres[0]}</small></a><div class="progress"><i style="--v:${m / maxTop * 100}%"></i></div><b style="min-width:60px;text-align:right">${num(Math.round(m / 60))} h</b></li>`); })}</ul></div>
      <div class="stack"><div class="card chart-card"><h3>Mix de planes (pagando)</h3>${raw(donutChart(planMix, { label: num(paying.length) }))}</div>
        <div class="card"><div class="row between"><h3 style="margin:0">Actividad reciente</h3><a class="btn btn-sm btn-ghost" href="#/actividad">Ver todo</a></div>${raw(activityList(db.all('_log').slice(0, 5), usersById()))}</div></div>
    </div>`;
}
