// Escritorio: KPIs, gráficos y actividad reciente.
import { escape, money, num, ago, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { db, LEAD_STATUS } from '../data/db.js';
import { pageHead, kpi, badge } from '../shared/admin-kit.js';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthKey = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}`; };
function lastMonths(n) {
  const out = [], d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ key: `${x.getFullYear()}-${x.getMonth()}`, label: MONTHS[x.getMonth()] }); }
  return out;
}
const short = n => (n >= 1e7 ? `$${(n / 1e6).toFixed(1).replace('.', ',')} M` : money(n));
const delta = (a, b) => (b ? ((a - b) / b) * 100 : 0);

export default {
  id: 'dashboard', path: '/escritorio', label: 'Escritorio', icon: '▦', group: 'General', perm: 'dashboard',
  render(el, ctx) {
    const u = ctx.user;
    const leads = db.all('leads'), apps = db.all('applications'), traffic = db.all('traffic').sort((a, b) => a.date.localeCompare(b.date));
    const months = lastMonths(6);
    const mk = months.at(-1).key, pk = months.at(-2).key;
    const leadsBy = k => leads.filter(l => monthKey(l.createdAt) === k);
    const won = l => l.status === 'ganado';
    const visits30 = traffic.slice(-30).reduce((s, t) => s + t.visits, 0), visitsPrev = traffic.slice(-60, -30).reduce((s, t) => s + t.visits, 0);
    const pipeline = leads.filter(l => !['ganado', 'perdido'].includes(l.status)).reduce((s, l) => s + (l.value || 0), 0);
    const wonMonth = leadsBy(mk).filter(won).reduce((s, l) => s + l.value, 0), wonPrev = leadsBy(pk).filter(won).reduce((s, l) => s + l.value, 0);
    const closed = leads.filter(l => ['ganado', 'perdido'].includes(l.status));
    const conv = closed.length ? (closed.filter(won).length / closed.length) * 100 : 0;

    const weekly = [];
    for (let i = 0; i < traffic.length; i += 7) { const w = traffic.slice(i, i + 7); weekly.push({ label: new Date(w[0].date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), value: w.reduce((s, t) => s + t.visits, 0) }); }
    const leadsMonthly = months.map(m => ({ label: m.label, value: leadsBy(m.key).length }));
    const revenueMonthly = months.map(m => ({ label: m.label, value: leadsBy(m.key).filter(won).reduce((s, l) => s + l.value, 0) }));
    const byStatus = Object.entries(LEAD_STATUS).map(([k, [l]]) => ({ label: l, value: leads.filter(x => x.status === k).length }));
    const sources = [...new Set(leads.map(l => l.source))].map(s => ({ label: s, value: leads.filter(l => l.source === s).length })).sort((a, b) => b.value - a.value);
    const topProjects = db.all('posts').filter(p => p.status === 'published').sort((a, b) => b.views - a.views).slice(0, 5);
    const recent = leads.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
    const log = db.all('_log').slice(0, 8);
    const showSales = ctx.can('leads'), showContent = ctx.can('projects');

    el.innerHTML = `${pageHead(`Hola, ${u.name.split(' ')[0]} 👋`, 'Resumen del estudio en los últimos 30 días.', `<a class="btn" href="index.html" target="_blank" rel="noopener">↗ Ver sitio</a>${showSales ? '<a class="btn btn-primary" href="#/leads">Ver leads</a>' : '<a class="btn btn-primary" href="#/proyectos">Gestionar proyectos</a>'}`)}
      <div class="kpis">
        ${kpi('Visitas (30 días)', num(visits30), delta(visits30, visitsPrev))}
        ${kpi('Leads este mes', num(leadsBy(mk).length), delta(leadsBy(mk).length, leadsBy(pk).length))}
        ${showSales ? kpi('Ganado este mes', short(wonMonth), delta(wonMonth, wonPrev)) : kpi('Proyectos publicados', num(db.count('projects', p => p.published)), null, `${db.count('projects', p => p.featured)} destacados`)}
        ${showSales ? kpi('Pipeline abierto', short(pipeline), null, `Conversión histórica ${conv.toFixed(0)}%`) : kpi('Postulaciones nuevas', num(apps.filter(a => a.status === 'nuevo').length), null, `${db.count('jobs', j => j.status === 'open')} ofertas abiertas`)}
      </div>
      <div class="dash-grid">
        <div class="card"><div class="card-head"><h3>Visitas semanales al sitio</h3><span class="badge plain">26 semanas</span></div><div class="chart-wrap">${lineChart(weekly.slice(-14), { format: num })}</div></div>
        <div class="card"><h3>Leads por estado</h3>${donutChart(byStatus, { label: String(leads.length) })}</div>
      </div>
      <div class="dash-grid">
        <div class="card"><div class="card-head"><h3>${showSales ? 'Ingresos ganados por mes' : 'Leads por mes'}</h3></div>${showSales ? barChart(revenueMonthly, { format: money }) : barChart(leadsMonthly)}</div>
        <div class="card"><h3>Origen de leads</h3><ul class="mini-list">${sources.map(s => `<li><span>${escape(s.label)}</span><span class="row" style="gap:8px;flex:0 0 50%"><span class="progress" style="flex:1"><i style="--v:${(s.value / leads.length) * 100}%"></i></span><b>${s.value}</b></span></li>`).join('')}</ul></div>
      </div>
      <div class="grid-2">
        ${showSales ? `<div class="card"><div class="card-head"><h3>Últimos leads</h3><a class="small" href="#/leads">Ver todos →</a></div><ul class="mini-list">${recent.map(l => `<li><a href="#/leads/${l.id}"><b>${escape(l.name)}</b> <small class="muted">${escape(l.company || '')} · ${ago(l.createdAt)}</small></a>${badge(l.status, LEAD_STATUS)}</li>`).join('')}</ul></div>`
          : `<div class="card"><div class="card-head"><h3>Artículos más leídos</h3><a class="small" href="#/blog">Blog →</a></div><ul class="mini-list">${topProjects.map(p => `<li><a href="#/blog/${p.id}">${escape(p.title)}</a><b>${num(p.views)}</b></li>`).join('')}</ul></div>`}
        <div class="card"><div class="card-head"><h3>Actividad reciente</h3>${ctx.can('activity') ? '<a class="small" href="#/actividad">Bitácora →</a>' : ''}</div>
          <ul class="mini-list">${log.length ? log.map(l => `<li><span>${escape(l.detail || l.action)}</span><small class="muted">${ago(l.at)}</small></li>`).join('') : '<li class="muted">Sin actividad todavía. Prueba crear o editar algo.</li>'}</ul></div>
      </div>
      ${showContent ? `<div class="card"><div class="card-head"><h3>Accesos rápidos</h3></div><div class="row" style="gap:8px">
        <a class="btn" href="#/paginas">✎ Editar portada</a><a class="btn" href="#/proyectos">＋ Nuevo proyecto</a><a class="btn" href="#/blog">＋ Nuevo artículo</a><a class="btn" href="#/ofertas">＋ Nueva oferta</a></div></div>` : ''}`;
  }
};
