// Reportes: embudo de conversión, ingresos por mes, ranking del equipo, motivos de pérdida y fuentes.
import { db } from '../data/db.js';
import { escape, money, pct, barChart, donutChart, lineChart } from '../../../assets/core/ui.js';
import { STAGES, OPEN_STAGES, LEAD_SOURCES } from '../shared/constants.js';
import { seesAll, visibleDeals } from '../shared/perms.js';
import { moneyShort, monthKey, monthLabel, lastMonths, reps, avatar, exportCSV, sellers, DAY } from '../shared/util.js';
import { pageHead, kpi, opt } from './components.js';
import { icon } from '../shared/icons.js';

const state = { period: 180, owner: '' };

export function render(view, { user }) {
  const all = seesAll(user);
  const since = Date.now() - state.period * DAY;
  const deals = visibleDeals(user).filter(d => !state.owner || d.ownerId === state.owner);
  const cohort = deals.filter(d => new Date(d.createdAt) > since);
  const closed = deals.filter(d => d.closedAt && new Date(d.closedAt) > since);
  const won = closed.filter(d => d.stage === 'ganado');
  const lost = closed.filter(d => d.stage === 'perdido');
  const revenue = won.reduce((s, d) => s + d.amount, 0);
  const cycle = won.length ? Math.round(won.reduce((s, d) => s + (new Date(d.closedAt) - new Date(d.createdAt)) / DAY, 0) / won.length) : 0;

  // Embudo: negocios de la cohorte que alcanzaron cada etapa.
  const reached = s => cohort.filter(d => (d.history || []).some(h => h.stage === s) || (s !== 'perdido' && STAGES.findIndex(x => x.id === d.stage) >= STAGES.findIndex(x => x.id === s) && d.stage !== 'perdido')).length;
  const funnel = ['prospeccion', 'calificado', 'propuesta', 'negociacion', 'ganado'].map(s => ({ s, n: reached(s) }));
  const top = funnel[0].n || 1;

  const months = lastMonths(Math.min(12, Math.max(3, Math.round(state.period / 30))));
  const byMonth = months.map(m => ({ label: monthLabel(m), value: deals.filter(d => d.stage === 'ganado' && monthKey(d.closedAt) === m).reduce((s, d) => s + d.amount, 0) }));
  const created = months.map(m => ({ label: monthLabel(m), value: deals.filter(d => monthKey(d.createdAt) === m).length }));
  const reasons = {};
  lost.forEach(d => { reasons[d.lostReason || 'Sin motivo'] = (reasons[d.lostReason || 'Sin motivo'] || 0) + 1; });
  const leads = db.query('leads', l => new Date(l.createdAt) > since && (all || l.ownerId === user.id));
  const sources = LEAD_SOURCES.map(s => { const ls = leads.filter(l => l.source === s); return { s, n: ls.length, conv: ls.filter(l => l.status === 'convertido').length }; }).filter(x => x.n);

  const board = (all ? reps() : [user]).map(u => {
    const ud = closed.filter(d => d.ownerId === u.id);
    const uw = ud.filter(d => d.stage === 'ganado');
    const amount = uw.reduce((s, d) => s + d.amount, 0);
    const goal = db.query('goals', g => g.userId === u.id && months.includes(g.month) && g.month <= monthKey(new Date())).reduce((s, g) => s + g.target, 0);
    return { u, amount, n: uw.length, rate: ud.length ? uw.length / ud.length * 100 : 0, avg: uw.length ? amount / uw.length : 0, acts: db.count('activities', a => a.ownerId === u.id && a.done && a.type !== 'sistema' && new Date(a.dueAt) > since), goal, open: deals.filter(d => d.ownerId === u.id && OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.amount, 0) };
  }).sort((a, b) => b.amount - a.amount);

  view.innerHTML = `
    ${pageHead('Reportes', all ? 'Rendimiento del equipo comercial' : 'Tu rendimiento', `
      ${all ? `<select class="select select-sm" data-owner aria-label="Ejecutivo"><option value="">Todo el equipo</option>${sellers().map(u => opt(u.id, u.name, state.owner)).join('')}</select>` : ''}
      <select class="select select-sm" data-period aria-label="Periodo">${[[90, 'Últimos 90 días'], [180, 'Últimos 6 meses'], [365, 'Últimos 12 meses']].map(([v, l]) => opt(v, l, state.period)).join('')}</select>
      <button class="btn" data-export>${icon('upload', 16)} Exportar ranking</button>`)}
    <div class="grid-4">
      ${kpi('Ingresos ganados', moneyShort(revenue), `${won.length} negocios`)}
      ${kpi('Tasa de cierre', pct(closed.length ? won.length / closed.length * 100 : 0), `${lost.length} perdidos`)}
      ${kpi('Ticket promedio', moneyShort(won.length ? revenue / won.length : 0))}
      ${kpi('Ciclo de venta', `${cycle} días`, 'de creación a ganado')}
    </div>
    <div class="dash-grid">
      <section class="card stack span-2">
        <h3 style="margin:0">Embudo de conversión</h3>
        <p class="muted small" style="margin:0">Negocios creados en el periodo (${cohort.length}) y cuántos alcanzaron cada etapa.</p>
        <div class="funnel">${funnel.map((f, i) => `<div class="funnel-row"><span class="funnel-label">${STAGES.find(s => s.id === f.s).name}</span><div class="funnel-bar"><i style="--w:${Math.max(4, f.n / top * 100)}%"><b>${f.n}</b></i></div><span class="funnel-pct">${i ? `${pct(funnel[i - 1].n ? f.n / funnel[i - 1].n * 100 : 0)} <small class="muted">vs. anterior</small>` : '100%'}</span></div>`).join('')}</div>
      </section>
      <section class="card stack">
        <h3 style="margin:0">Motivos de pérdida</h3>
        ${Object.keys(reasons).length ? donutChart(Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { label: String(lost.length), size: 140 }) : '<div class="empty small">Sin negocios perdidos en el periodo</div>'}
      </section>
      <section class="card stack span-2">
        <h3 style="margin:0">Ingresos por mes</h3>
        ${barChart(byMonth, { format: money })}
      </section>
      <section class="card stack">
        <h3 style="margin:0">Negocios creados por mes</h3>
        ${lineChart(created)}
      </section>
      <section class="card stack span-3">
        <h3 style="margin:0">${icon('trophy', 18)} Ranking de ejecutivos</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Ejecutivo</th><th>Ganado</th><th>Negocios</th><th>Tasa de cierre</th><th>Ticket prom.</th><th>Actividades</th><th>Meta del periodo</th><th>Pipeline abierto</th></tr></thead><tbody>
          ${board.map((b, i) => `<tr><td><b>${i + 1}</b></td><td><span class="user-chip">${avatar(b.u, 28)}<span>${escape(b.u.name)}</span></span></td><td><b>${money(b.amount)}</b></td><td>${b.n}</td><td>${pct(b.rate)}</td><td>${moneyShort(b.avg)}</td><td>${b.acts}</td><td style="min-width:140px">${b.goal ? `<div class="progress"><i style="--v:${Math.min(100, b.amount / b.goal * 100)}%"></i></div><small class="muted">${pct(b.amount / b.goal * 100)} de ${moneyShort(b.goal)}</small>` : '—'}</td><td>${moneyShort(b.open)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <section class="card stack span-3">
        <h3 style="margin:0">Leads por fuente y conversión</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Fuente</th><th>Leads</th><th>Convertidos</th><th>Conversión</th></tr></thead><tbody>
          ${sources.sort((a, b) => b.n - a.n).map(s => `<tr><td>${escape(s.s)}</td><td>${s.n}</td><td>${s.conv}</td><td style="min-width:160px"><div class="progress"><i style="--v:${s.conv / s.n * 100}%"></i></div><small class="muted">${pct(s.conv / s.n * 100)}</small></td></tr>`).join('') || '<tr><td colspan="4"><div class="empty small">Sin leads en el periodo</div></td></tr>'}
        </tbody></table></div>
      </section>
    </div>`;
  view.querySelector('[data-period]').onchange = e => { state.period = +e.target.value; render(view, { user }); };
  view.querySelector('[data-owner]')?.addEventListener('change', e => { state.owner = e.target.value; render(view, { user }); });
  view.querySelector('[data-export]').onclick = () => exportCSV('ranking-ejecutivos.csv', board.map((b, i) => ({ posicion: i + 1, ejecutivo: b.u.name, ganado: b.amount, negocios: b.n, tasa_cierre: b.rate.toFixed(1), ticket_promedio: Math.round(b.avg), actividades: b.acts, meta: b.goal, pipeline: b.open })));
}
