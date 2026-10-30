// Inicio: KPIs de pipeline, tasa de cierre, forecast, actividades del día y gráficos por ejecutivo.
import { db } from '../data/db.js';
import { escape, money, date, barChart, lineChart, donutChart } from '../../../assets/core/ui.js';
import { STAGES, OPEN_STAGES, stage } from '../shared/constants.js';
import { seesAll, visibleDeals, visibleActs, visibleLeads } from '../shared/perms.js';
import { moneyShort, monthKey, monthLabel, lastMonths, reps, userName, avatar, companyName, DAY } from '../shared/util.js';
import { kpi, pageHead, activityItem, wireActivityList, stageBadge, dealModal, activityModal } from './components.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const all = seesAll(user);
  const deals = visibleDeals(user);
  const open = deals.filter(d => OPEN_STAGES.includes(d.stage));
  const probs = db.getValue('settings', {}).probabilities || {};
  const pr = d => (probs[d.stage] ?? stage(d.stage).prob) / 100;
  const pipeline = open.reduce((s, d) => s + d.amount, 0);
  const weighted = open.reduce((s, d) => s + d.amount * pr(d), 0);
  const since = Date.now() - 90 * DAY;
  const closed90 = deals.filter(d => d.closedAt && new Date(d.closedAt) > since);
  const won90 = closed90.filter(d => d.stage === 'ganado');
  const winRate = closed90.length ? won90.length / closed90.length * 100 : 0;
  const thisMonth = monthKey(new Date());
  const wonMonth = deals.filter(d => d.stage === 'ganado' && monthKey(d.closedAt) === thisMonth).reduce((s, d) => s + d.amount, 0);
  const goalMonth = db.query('goals', g => g.month === thisMonth && (all || g.userId === user.id)).reduce((s, g) => s + g.target, 0);
  const acts = visibleActs(user).filter(a => !a.done && a.type !== 'sistema' && (all ? true : a.ownerId === user.id));
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const due = acts.filter(a => new Date(a.dueAt) <= endToday).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const overdue = due.filter(a => new Date(a.dueAt) < Date.now()).length;
  const upcoming = acts.filter(a => new Date(a.dueAt) > endToday).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 5);

  // Series
  const months = lastMonths(8);
  const revenue = months.map(m => ({ label: monthLabel(m), value: deals.filter(d => d.stage === 'ganado' && monthKey(d.closedAt) === m).reduce((s, d) => s + d.amount, 0) }));
  const byStage = OPEN_STAGES.map(s => ({ label: stage(s).name, value: open.filter(d => d.stage === s).reduce((a, d) => a + d.amount, 0) }));
  const fMonths = lastMonths(3, 2);
  const forecast = fMonths.map(m => ({ label: monthLabel(m), value: Math.round(open.filter(d => monthKey(d.closeDate) === m).reduce((s, d) => s + d.amount * pr(d), 0)) }));
  const byRep = reps().map(u => ({ label: u.name.split(' ')[0], value: db.query('deals', d => d.ownerId === u.id && d.stage === 'ganado' && new Date(d.closedAt) > since).reduce((s, d) => s + d.amount, 0) }));
  const leadSrc = {};
  visibleLeads(user).filter(l => new Date(l.createdAt) > since).forEach(l => { leadSrc[l.source] = (leadSrc[l.source] || 0) + 1; });
  const closing = open.filter(d => new Date(d.closeDate) < Date.now() + 30 * DAY).sort((a, b) => a.closeDate.localeCompare(b.closeDate)).slice(0, 6);
  const pctGoal = goalMonth ? Math.round(wonMonth / goalMonth * 100) : 0;
  const hour = new Date().getHours();

  view.innerHTML = `
    ${pageHead(`${hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${user.name.split(' ')[0]}`, all ? 'Resumen del equipo comercial' : 'Resumen de tu cartera', `<button class="btn" data-new-act>${icon('calendar', 16)} Agendar</button><button class="btn btn-primary" data-new-deal>${icon('plus', 16)} Nuevo negocio</button>`)}
    <div class="grid-4">
      ${kpi('Pipeline abierto', moneyShort(pipeline), `${open.length} negocios activos`, '')}
      ${kpi('Forecast ponderado', moneyShort(weighted), 'según probabilidad por etapa', '')}
      ${kpi('Tasa de cierre (90 días)', `${winRate.toFixed(0)}%`, `${won90.length} ganados de ${closed90.length} cerrados`, winRate >= 50 ? 'up' : 'down')}
      ${kpi('Ganado este mes', moneyShort(wonMonth), goalMonth ? `${pctGoal}% de la meta (${moneyShort(goalMonth)})` : 'sin meta definida', pctGoal >= 70 ? 'up' : 'down')}
    </div>
    <div class="dash-grid">
      <section class="card stack span-2">
        <div class="row between"><h3 style="margin:0">Ingresos ganados por mes</h3><span class="muted small">últimos 8 meses</span></div>
        ${lineChart(revenue, { format: money })}
      </section>
      <section class="card stack">
        <div class="row between"><h3 style="margin:0">Actividades de hoy</h3>${overdue ? `<span class="badge badge-danger">${overdue} vencidas</span>` : `<span class="badge badge-success">Al día</span>`}</div>
        <div class="act-list" data-acts>${due.length ? due.slice(0, 7).map(a => activityItem(a)).join('') : '<div class="empty small">Nada pendiente para hoy</div>'}</div>
        ${upcoming.length ? `<div class="nav-section" style="padding-left:0">Próximas</div><div class="act-list" data-acts>${upcoming.map(a => activityItem(a)).join('')}</div>` : ''}
        <a class="btn btn-ghost btn-sm" href="#/tareas">Ver todas las tareas →</a>
      </section>
      <section class="card stack">
        <h3 style="margin:0">Pipeline por etapa</h3>
        ${barChart(byStage, { format: money })}
      </section>
      <section class="card stack">
        <h3 style="margin:0">Forecast próximos meses</h3>
        ${barChart(forecast.map(f => ({ ...f, color: 'var(--accent)' })), { format: money })}
        <p class="muted small" style="margin:0">Suma de montos × probabilidad de los negocios con cierre estimado en cada mes.</p>
      </section>
      <section class="card stack">
        ${all ? `<h3 style="margin:0">Ganado por ejecutivo (90 días)</h3>${barChart(byRep, { format: money })}`
          : `<h3 style="margin:0">Tu meta del mes</h3><div class="goal-ring"><div class="stat"><span class="value">${pctGoal}%</span><span class="label">${moneyShort(wonMonth)} de ${moneyShort(goalMonth)}</span></div><div class="progress"><i style="--v:${Math.min(100, pctGoal)}%"></i></div></div>`}
      </section>
      <section class="card stack">
        <h3 style="margin:0">Leads por fuente (90 días)</h3>
        ${Object.keys(leadSrc).length ? donutChart(Object.entries(leadSrc).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { label: String(Object.values(leadSrc).reduce((a, b) => a + b, 0)), size: 140 }) : '<div class="empty small">Sin leads recientes</div>'}
      </section>
      <section class="card stack span-2">
        <div class="row between"><h3 style="margin:0">Negocios por cerrar (30 días)</h3><a class="btn btn-ghost btn-sm" href="#/negocios">Ver tablero →</a></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Negocio</th><th>Etapa</th><th>Monto</th><th>Cierre</th>${all ? '<th>Ejecutivo</th>' : ''}</tr></thead><tbody>
          ${closing.length ? closing.map(d => `<tr><td><a href="#/negocios/${d.id}"><b>${escape(d.title)}</b></a><br><small class="muted">${escape(companyName(d.companyId))}</small></td><td>${stageBadge(d.stage)}</td><td>${money(d.amount)}</td><td>${date(d.closeDate)}</td>${all ? `<td>${avatar(db.get('users', d.ownerId), 26)}</td>` : ''}</tr>`).join('') : `<tr><td colspan="5"><div class="empty small">Sin cierres próximos</div></td></tr>`}
        </tbody></table></div>
      </section>
    </div>`;
  view.querySelectorAll('[data-acts]').forEach(el => wireActivityList(el));
  view.querySelector('[data-new-deal]').onclick = () => dealModal({ onSaved: d => { location.hash = `#/negocios/${d.id}`; } });
  view.querySelector('[data-new-act]').onclick = () => activityModal();
}
