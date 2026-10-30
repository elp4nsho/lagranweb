// Transparencia: ingresos vs. gastos, distribución por categoría y proyecto, y detalle de gastos publicados.
import { db, ok, site } from '../data/db.js';
import { escape, money, date, barChart, donutChart } from '../../../assets/core/ui.js';

let yearFilter = 'ultimos12';
export default function transparency(el) {
  const since = Date.now() - 365 * 864e5;
  const exp = db.query('expenses', x => x.published && x.status === 'aprobado' && new Date(x.date) >= since).sort((a, b) => b.date.localeCompare(a.date));
  const inc = db.query('donations', d => ok(d) && new Date(d.createdAt) >= since);
  const totalIn = inc.reduce((s, d) => s + d.amount, 0), totalOut = exp.reduce((s, x) => s + x.amount, 0);
  const byCat = ['Programas', 'Operación', 'Recaudación'].map(k => ({ label: k, value: exp.filter(x => x.category === k).reduce((s, x) => s + x.amount, 0) }));
  const pct = v => totalOut ? Math.round(v / totalOut * 100) : 0;
  const projects = db.all('projects').map(p => ({ p, spent: exp.filter(x => x.projectId === p.id).reduce((s, x) => s + x.amount, 0) })).filter(x => x.spent).sort((a, b) => b.spent - a.spent);
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const k = d.toISOString().slice(0, 7);
    months.push({ k, label: d.toLocaleDateString('es-CL', { month: 'short' }), in: inc.filter(x => x.createdAt.startsWith(k)).reduce((s, x) => s + x.amount, 0), out: exp.filter(x => x.date.startsWith(k)).reduce((s, x) => s + x.amount, 0) });
  }
  const maxP = Math.max(1, ...projects.map(x => x.spent));
  el.innerHTML = `<section class="page-hero"><div class="container stack" data-anim>
      <span class="eyebrow">Transparencia</span><h1>Cada peso, a la vista</h1>
      <p class="muted lead">Publicamos todos los gastos aprobados por nuestra contadora. Últimos 12 meses.</p></div></section>
  <section class="section pt0"><div class="container stack">
    <div class="grid-4">
      <div class="card impact-card"><span class="muted small">Ingresos por donaciones</span><b class="imp-val">${money(totalIn)}</b></div>
      <div class="card impact-card"><span class="muted small">Gastos ejecutados</span><b class="imp-val">${money(totalOut)}</b></div>
      <div class="card impact-card"><span class="muted small">Directo a programas</span><b class="imp-val">${pct(byCat[0].value)}%</b></div>
      <div class="card impact-card"><span class="muted small">Operación + recaudación</span><b class="imp-val">${pct(byCat[1].value + byCat[2].value)}%</b><span class="small muted">meta: menos de ${site().overheadGoal}%</span></div>
    </div>
    <div class="split-2">
      <div class="card"><h3>¿Dónde va el dinero?</h3>${donutChart(byCat.map(c => ({ label: `${c.label} (${pct(c.value)}%)`, value: Math.round(c.value / 1e6) })), { label: pct(byCat[0].value) + '%' })}<p class="small muted" style="margin:10px 0 0">Valores en millones de pesos.</p></div>
      <div class="card"><h3>Gasto por proyecto</h3><div class="hbars">${projects.map(x => `<div class="hbar"><span class="hbar-l" title="${escape(x.p.name)}">${escape(x.p.name)}</span><span class="hbar-t"><i style="--v:${x.spent / maxP * 100}%"></i></span><b>${money(x.spent)}</b></div>`).join('')}</div></div>
    </div>
    <div class="split-2">
      <div class="card"><h3>Ingresos por mes</h3>${barChart(months.map(m => ({ label: m.label, value: m.in })), { format: money })}</div>
      <div class="card"><h3>Gastos por mes</h3>${barChart(months.map(m => ({ label: m.label, value: m.out, color: 'var(--accent)' })), { format: money })}</div>
    </div>
    <div class="card"><div class="row between"><h3 style="margin:0">Detalle de gastos publicados</h3>
      <select class="select" id="tCat" style="max-width:220px" aria-label="Categoría"><option value="ultimos12">Todas las categorías</option>${['Programas', 'Operación', 'Recaudación'].map(c => `<option ${yearFilter === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Proveedor</th><th>Monto</th></tr></thead>
      <tbody>${exp.filter(x => yearFilter === 'ultimos12' || x.category === yearFilter).slice(0, 25).map(x => `<tr><td>${escape(date(x.date + 'T12:00'))}</td><td><span class="badge plain">${escape(x.category)}</span></td><td>${escape(x.description)}</td><td>${escape(x.provider)}</td><td><b>${money(x.amount)}</b></td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">Se muestran los 25 más recientes. Memoria anual completa disponible a solicitud.</p></div>
  </div></section>`;
  el.querySelector('#tCat').onchange = e => { yearFilter = e.target.value; transparency(el); };
}
