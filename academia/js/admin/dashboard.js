// Dashboard: ingresos, matrículas, finalización y cursos top.
import { lineChart, barChart, donutChart, money, num } from '../../../assets/core/ui.js';
import { kpis, panel, pageHead, byMonth, escape, ago, person } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { getCourse, getCategory, getUser, rating, studentsCount, commission } from '../data/model.js';

export function renderDashboard(el, _p, ctx) {
  const paid = db.query('orders', o => o.status === 'pagado');
  const rev = byMonth(paid, o => o.createdAt, 10, o => o.total);
  const enr = byMonth(db.all('enrollments'), e => e.enrolledAt, 10);
  const all = db.all('enrollments'), done = all.filter(e => e.completedAt).length;
  const curM = rev.at(-1).value, prevM = rev.at(-2).value;
  const catRev = {};
  paid.forEach(o => o.items.forEach(x => { const c = getCourse(x.courseId); if (!c) return; const k = getCategory(c.categoryId)?.name || '—'; catRev[k] = (catRev[k] || 0) + x.price * (o.total / (o.subtotal || 1)); }));
  const top = db.query('courses', c => c.status === 'publicado').map(c => ({ c, rev: paid.reduce((t, o) => t + o.items.filter(x => x.courseId === c.id).reduce((s, x) => s + x.price * (o.total / (o.subtotal || 1)), 0), 0), n: studentsCount(c.id), r: rating(c.id) })).sort((a, b) => b.rev - a.rev).slice(0, 6);
  const total = paid.reduce((t, o) => t + o.total, 0);
  const isAdmin = ctx.user.role === 'admin';
  el.innerHTML = pageHead('Dashboard', `Hola, ${ctx.user.name.split(' ')[0]}. Resumen de Academia Faro.`, isAdmin ? '<a class="btn" href="#/revision">Revisar cursos</a><a class="btn btn-primary" href="#/sitio">Editar portada</a>' : '<a class="btn btn-primary" href="#/pedidos">Ver reembolsos</a>') +
    kpis([
      { label: 'Ingresos del mes', value: money(curM), delta: `${curM >= prevM ? '▲' : '▼'} ${prevM ? Math.round(Math.abs(curM - prevM) / prevM * 100) : 0}% vs mes anterior`, up: curM >= prevM },
      { label: 'Ventas totales', value: money(total), hint: `Comisión plataforma ${commission()}%: ${money(total * commission() / 100)}` },
      { label: 'Matrículas', value: num(all.length), hint: `${enr.at(-1).value} este mes` },
      { label: 'Tasa de finalización', value: Math.round(done / (all.length || 1) * 100) + '%', hint: `${done} cursos terminados` },
      { label: 'Cursos publicados', value: String(db.count('courses', c => c.status === 'publicado')), hint: `${db.count('courses', c => c.status === 'revision')} en revisión` },
      { label: 'Reembolsos pendientes', value: String(db.count('orders', o => o.status === 'reembolso_solicitado')), up: false }
    ]) +
    `<div class="ak-grid">${panel('Ingresos por mes', lineChart(rev, { height: 190, format: money }))}${panel('Matrículas por mes', barChart(enr, { height: 190 }))}</div>
    <div class="ak-grid">${panel('Ingresos por categoría', donutChart(Object.entries(catRev).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, v]) => ({ label, value: Math.round(v / 1000) })), { label: 'miles $' }))}
    ${panel('Cursos top por ingresos', `<div class="table-wrap"><table class="table"><thead><tr><th>Curso</th><th>Estudiantes</th><th>★</th><th>Ingresos</th></tr></thead><tbody>${top.map(t => `<tr><td><b>${escape(t.c.title)}</b><br><small class="muted">${escape(getUser(t.c.instructorId)?.name)}</small></td><td>${t.n}</td><td>${t.r.avg || '—'}</td><td>${money(t.rev)}</td></tr>`).join('')}</tbody></table></div>`)}</div>
    ${panel('Actividad reciente', `<ul class="ak-list">${db.all('_log').slice(0, 8).map(l => `<li><div class="grow"><b>${escape(l.action)}</b><small>${escape(l.detail)}</small></div><span class="small muted">${ago(l.at)}</span></li>`).join('') || '<li class="muted">Sin actividad aún.</li>'}</ul>`, '<a class="btn btn-sm btn-ghost" href="#/actividad">Bitácora →</a>')}`;
}
