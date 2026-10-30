// Dashboard: KPIs y gráficos de inventario, leads, visitas, conversión y precios por comuna.
import { barChart, lineChart, donutChart, escape, money, ago, pct } from '../../../assets/core/ui.js';
import { uf } from '../data/db.js';
import { COMUNAS } from '../shared/geo.js';
import { PSTATUS, fmtUF, ufM2, badge } from '../shared/format.js';
import { pageHead, kpi } from '../shared/kit.js';

export function weekBuckets(n = 12) {
  const out = [], d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  for (let i = n - 1; i >= 0; i--) { const s = new Date(d); s.setDate(s.getDate() - i * 7); const e = new Date(s); e.setDate(e.getDate() + 7); out.push({ s, e, label: `${s.getDate()}/${s.getMonth() + 1}` }); }
  return out;
}

export function renderDashboard(el, p, q, { db, can }) {
  const U = uf(), props = db.all('properties'), leads = db.all('leads'), visits = db.all('visits');
  const now = Date.now(), D = 864e5;
  const l30 = leads.filter(l => now - new Date(l.createdAt) < 30 * D).length, lprev = leads.filter(l => { const a = now - new Date(l.createdAt); return a >= 30 * D && a < 60 * D; }).length;
  const closed = leads.filter(l => ['ganado', 'perdido'].includes(l.status)), won = leads.filter(l => l.status === 'ganado').length;
  const upcoming = visits.filter(v => { const t = new Date(v.date) - now; return t > 0 && t < 7 * D && v.status !== 'cancelada'; }).length;
  const curM = new Date().toISOString().slice(0, 7);
  const rentDue = db.all('contracts').filter(c => c.status === 'vigente').flatMap(c => c.payments.filter(x => x.month === curM));
  const rentPaid = rentDue.filter(x => x.status === 'pagado');
  const weeks = weekBuckets(12);
  const leadsW = weeks.map(w => ({ label: w.label, value: leads.filter(l => { const t = new Date(l.createdAt); return t >= w.s && t < w.e; }).length }));
  const visitsW = weeks.map(w => ({ label: w.label, value: visits.filter(v => { const t = new Date(v.date); return t >= w.s && t < w.e && v.status !== 'cancelada'; }).length }));
  const SC = { borrador: 'var(--muted)', revision: 'var(--warning)', publicada: 'var(--success)', reservada: 'var(--info)', vendida: 'var(--primary)', arrendada: 'color-mix(in srgb, var(--primary) 45%, var(--text))' };
  const byStatus = Object.keys(PSTATUS).map(k => ({ label: PSTATUS[k][0], value: props.filter(x => x.status === k).length, color: SC[k] }));
  const ufByComuna = COMUNAS.map(c => { const ps = props.filter(x => x.comuna === c.id && x.op === 'venta' && x.type !== 'terreno'); return { label: shortName(c.name), full: c.name, value: ps.length ? Math.round(ps.reduce((a, x) => a + ufM2(x, U), 0) / ps.length) : 0 }; }).filter(x => x.value).sort((a, b) => b.value - a.value).slice(0, 10);
  const sources = {}; leads.forEach(l => { sources[l.source] = (sources[l.source] || 0) + 1; });
  const funnel = ['nuevo', 'contactado', 'visita', 'negociacion', 'ganado'];
  const pending = props.filter(x => x.status === 'revision');
  const log = db.all('_log').slice(0, 8);

  el.innerHTML = `${pageHead('Dashboard', `Resumen al ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} · UF ${money(U)}`, can('propiedades') ? '<a class="btn btn-primary" href="#/propiedades?new=1">+ Nueva propiedad</a>' : '')}
    <div class="kpis">
      ${kpi('Propiedades publicadas', props.filter(x => x.status === 'publicada').length, `${pending.length} en revisión`, true)}
      ${kpi('Leads últimos 30 días', l30, `${l30 >= lprev ? '▲' : '▼'} ${lprev ? Math.abs(Math.round((l30 - lprev) / lprev * 100)) : 0}% vs mes anterior`, l30 >= lprev)}
      ${kpi('Visitas próximos 7 días', upcoming, `${visits.filter(v => v.status === 'pendiente').length} por confirmar`, true)}
      ${kpi('Tasa de conversión', pct(closed.length ? won / closed.length * 100 : 0, 1), `${won} cierres ganados`, true)}
      ${kpi('Arriendos cobrados (mes)', `${rentPaid.length}/${rentDue.length}`, money(rentPaid.reduce((s, x) => s + x.amount, 0)), rentPaid.length >= rentDue.length / 2)}
    </div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Leads por semana</h3>${lineChart(leadsW)}</div>
      <div class="card chart-card"><h3>Visitas por semana</h3>${barChart(visitsW)}</div>
    </div>
    <div class="split">
      <div class="card chart-card"><h3>UF/m² promedio por comuna (venta)</h3>${barChart(ufByComuna.map(x => ({ label: x.label, value: x.value })), { format: v => fmtUF(v) + '/m²' })}</div>
      <div class="card chart-card"><h3>Propiedades por estado</h3>${donutChart(byStatus, { label: props.length })}</div>
    </div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Embudo comercial</h3>${funnel.map(k => { const n = leads.filter(l => funnel.indexOf(l.status) >= funnel.indexOf(k)).length; return `<div style="margin-bottom:10px"><div class="row between small"><span>${escape({ nuevo: 'Leads totales', contactado: 'Contactados', visita: 'Con visita', negociacion: 'En negociación', ganado: 'Ganados' }[k])}</span><b>${n}</b></div><div class="progress"><i style="--v:${(n / leads.length * 100).toFixed(1)}%"></i></div></div>`; }).join('')}
        <h3 style="margin-top:18px">Leads por origen</h3>${donutChart(Object.entries(sources).map(([k, v]) => ({ label: k[0].toUpperCase() + k.slice(1), value: v })), { size: 140, label: leads.length })}</div>
      <div class="card"><div class="row between"><h3 style="margin:0">Por aprobar</h3><a class="btn btn-sm" href="#/propiedades?status=revision">Ver todas</a></div>
        ${pending.length ? `<div class="stack" style="gap:0;margin-top:8px">${pending.slice(0, 6).map(x => `<a class="list-row" href="#/propiedades/${x.id}" style="color:var(--text);text-decoration:none"><span style="min-width:0"><b class="ellipsis">${escape(x.title)}</b><span class="muted small">${escape(x.code)} · enviada ${ago(x.statusAt)}</span></span>${badge(PSTATUS, x.status)}</a>`).join('')}</div>` : '<p class="empty">Nada pendiente 🎉</p>'}
        <h3 style="margin-top:18px">Actividad reciente</h3>${log.map(l => `<div class="list-row small"><span>${escape(l.detail || l.action)}</span><span class="muted nowrap">${ago(l.at)}</span></div>`).join('') || '<p class="muted">Sin actividad.</p>'}
        ${can('bitacora') ? '<a class="btn btn-sm btn-ghost" href="#/bitacora">Ver bitácora completa</a>' : ''}</div>
    </div>`;
}

export function shortName(n) { const w = n.split(' '); return (w.length > 1 && w[0].length <= 3 ? w[0][0] + '. ' + w[1] : w[0]).slice(0, 10); }
