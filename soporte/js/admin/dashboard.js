// Métricas de soporte: volumen, primera respuesta, resolución, CSAT, cumplimiento SLA y desempeño por agente.
import { db } from '../data/db.js';
import { escape, pct, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { isOpen, CHANNELS, PRIORITIES } from '../shared/constants.js';
import { pageHead, kpi } from '../shared/shell.js';
import { avatar, median, duration, startOfWeek, monthKey, monthLabel, lastMonths, exportCSV, catName, MIN, DAY } from '../shared/util.js';
import { sla } from '../shared/tickets.js';
import { opt } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

const state = { days: 30, group: '' };

export function render(view, ctx) {
  const since = Date.now() - state.days * DAY;
  const all = db.query('tickets', t => !t.mergedInto && (!state.group || t.groupId === state.group));
  const period = all.filter(t => new Date(t.createdAt) > since);
  const prev = all.filter(t => new Date(t.createdAt) > since - state.days * DAY && new Date(t.createdAt) <= since);
  const frt = period.filter(t => t.firstResponseAt).map(t => (new Date(t.firstResponseAt) - new Date(t.createdAt)) / MIN);
  const resolved = all.filter(t => t.resolvedAt && new Date(t.resolvedAt) > since);
  const rt = resolved.map(t => (new Date(t.resolvedAt) - new Date(t.createdAt)) / MIN);
  const rated = all.filter(t => t.csat && new Date(t.csat.at) > since);
  const csat = rated.length ? rated.filter(t => t.csat.rating >= 4).length / rated.length * 100 : 0;
  const slaSet = all.filter(t => (t.firstResponseAt || t.resolvedAt) && new Date(t.createdAt) > since);
  const slaOk = slaSet.filter(t => { const s = sla(t); return s.first.met !== false && s.res.met !== false; }).length;
  const slaPct = slaSet.length ? slaOk / slaSet.length * 100 : 0;
  const open = all.filter(isOpen);
  const risk = open.filter(t => { const s = sla(t); return s.risk || s.breached; }).length;
  const delta = prev.length ? (period.length - prev.length) / prev.length * 100 : 0;

  const ws = startOfWeek(new Date());
  const weeks = [...Array(12)].map((_, i) => new Date(ws.getTime() - (11 - i) * 7 * DAY));
  const volume = weeks.map(w => ({ label: `${w.getDate()}/${w.getMonth() + 1}`, value: all.filter(t => { const c = new Date(t.createdAt); return c >= w && c < new Date(w.getTime() + 7 * DAY); }).length }));
  const months = lastMonths(6);
  const csatM = months.map(m => { const r = all.filter(t => t.csat && monthKey(t.csat.at) === m); return { label: monthLabel(m), value: r.length ? Math.round(r.filter(t => t.csat.rating >= 4).length / r.length * 100) : 0 }; });
  const slaM = months.map(m => { const s = all.filter(t => monthKey(t.createdAt) === m && (t.firstResponseAt || t.resolvedAt)); return { label: monthLabel(m), value: s.length ? Math.round(s.filter(t => { const x = sla(t); return x.first.met !== false && x.res.met !== false; }).length / s.length * 100) : 0 }; });
  const frtM = months.map(m => ({ label: monthLabel(m), value: Math.round(median(all.filter(t => t.firstResponseAt && monthKey(t.createdAt) === m).map(t => (new Date(t.firstResponseAt) - new Date(t.createdAt)) / MIN))) }));
  const byChannel = Object.entries(CHANNELS).map(([k, l]) => ({ label: l, value: period.filter(t => t.channel === k).length })).filter(x => x.value);
  const byCat = db.all('categories').map(c => ({ label: c.name.split(' ')[0], value: period.filter(t => t.categoryId === c.id).length }));
  const agentsRows = db.query('users', u => ['agente', 'supervisor'].includes(u.role)).map(u => {
    const mine = all.filter(t => t.assigneeId === u.id);
    const res = mine.filter(t => t.resolvedAt && new Date(t.resolvedAt) > since);
    const f = mine.filter(t => t.firstResponseAt && new Date(t.createdAt) > since).map(t => (new Date(t.firstResponseAt) - new Date(t.createdAt)) / MIN);
    const r = mine.filter(t => t.csat && new Date(t.csat.at) > since);
    const s = mine.filter(t => (t.firstResponseAt || t.resolvedAt) && new Date(t.createdAt) > since);
    return { u, open: mine.filter(isOpen).length, solved: res.length, frt: median(f), csat: r.length ? r.filter(t => t.csat.rating >= 4).length / r.length * 100 : null, sla: s.length ? s.filter(t => { const x = sla(t); return x.first.met !== false && x.res.met !== false; }).length / s.length * 100 : null };
  }).sort((a, b) => b.solved - a.solved);
  const chats = db.query('chats', c => new Date(c.createdAt) > since);
  const kbV = db.all('articles').reduce((s, a) => s + a.views, 0);

  view.innerHTML = `
    ${pageHead('Métricas de soporte', `Fibra Austral · últimos ${state.days} días`, `
      <select class="select select-sm" data-group aria-label="Grupo"><option value="">Todos los grupos</option>${db.all('groups').map(g => opt(g.id, g.name, state.group)).join('')}</select>
      <select class="select select-sm" data-days aria-label="Periodo">${[[7, '7 días'], [30, '30 días'], [90, '90 días'], [180, '6 meses']].map(([v, l]) => opt(v, l, state.days)).join('')}</select>
      <button class="btn" data-export>${icon('upload', 16)} Exportar</button>`)}
    <div class="grid-auto kpis">
      ${kpi('Tickets nuevos', period.length, `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}% vs. periodo anterior`, delta > 15 ? 'down' : 'up')}
      ${kpi('Abiertos ahora', open.length, `${risk} con SLA en riesgo`, risk ? 'down' : 'up')}
      ${kpi('1ª respuesta (mediana)', duration(median(frt)), `${frt.length} tickets respondidos`)}
      ${kpi('Resolución (mediana)', duration(median(rt)), `${resolved.length} resueltos`)}
      ${kpi('CSAT', pct(csat), `${rated.length} calificaciones`, csat >= 80 ? 'up' : 'down')}
      ${kpi('Cumplimiento SLA', pct(slaPct), `${slaSet.length - slaOk} incumplidos`, slaPct >= 85 ? 'up' : 'down')}
    </div>
    <div class="dash-grid">
      <section class="card stack span-2"><div class="row between"><h3 style="margin:0">Volumen semanal de tickets</h3><span class="muted small">12 semanas</span></div>${lineChart(volume)}</section>
      <section class="card stack"><h3 style="margin:0">Por canal</h3>${byChannel.length ? donutChart(byChannel, { label: String(period.length), size: 140 }) : '<div class="empty small">Sin datos</div>'}</section>
      <section class="card stack"><h3 style="margin:0">Primera respuesta mediana (min)</h3>${barChart(frtM, { format: v => duration(v) })}</section>
      <section class="card stack"><h3 style="margin:0">CSAT mensual (%)</h3>${lineChart(csatM, { format: v => v + '%' })}</section>
      <section class="card stack"><h3 style="margin:0">Cumplimiento SLA (%)</h3>${barChart(slaM.map(x => ({ ...x, color: x.value >= 85 ? 'var(--success)' : 'var(--warning)' })), { format: v => v + '%' })}</section>
      <section class="card stack span-2"><h3 style="margin:0">Desempeño por agente</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Agente</th><th>Abiertos</th><th>Resueltos</th><th>1ª resp. mediana</th><th>CSAT</th><th>SLA</th></tr></thead><tbody>
        ${agentsRows.map(a => `<tr><td><span class="user-chip">${avatar(a.u, 28)}<span>${escape(a.u.name)}${a.u.active === false ? ' <small class="muted">(inactivo)</small>' : ''}</span></span></td><td>${a.open}</td><td><b>${a.solved}</b></td><td>${a.frt ? duration(a.frt) : '—'}</td><td>${a.csat == null ? '—' : pct(a.csat)}</td><td style="min-width:120px">${a.sla == null ? '—' : `<div class="progress"><i style="--v:${a.sla}%"></i></div><small class="muted">${pct(a.sla)}</small>`}</td></tr>`).join('')}
        </tbody></table></div></section>
      <section class="card stack"><h3 style="margin:0">Por categoría</h3>${barChart(byCat)}
        <ul class="kv small"><li><span>Chats atendidos</span><b>${chats.length}</b></li><li><span>Resueltos por el bot</span><b>${chats.filter(c => c.resolvedByBot).length}</b></li><li><span>Lecturas de la base de conocimiento</span><b>${kbV.toLocaleString('es-CL')}</b></li><li><span>Prioridad urgente</span><b>${period.filter(t => t.priority === 'urgente').length}</b></li></ul></section>
    </div>`;
  view.querySelector('[data-days]').onchange = e => { state.days = +e.target.value; render(view, ctx); };
  view.querySelector('[data-group]').onchange = e => { state.group = e.target.value; render(view, ctx); };
  view.querySelector('[data-export]').onclick = () => exportCSV('metricas-agentes.csv', agentsRows.map(a => ({ agente: a.u.name, abiertos: a.open, resueltos: a.solved, primera_respuesta_min: Math.round(a.frt), csat: a.csat == null ? '' : a.csat.toFixed(1), sla: a.sla == null ? '' : a.sla.toFixed(1) })));
}
