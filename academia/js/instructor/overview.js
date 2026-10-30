// Resumen del instructor: ingresos, matrículas, valoración y actividad reciente.
import { lineChart, barChart, money, num } from '../../../assets/core/ui.js';
import { kpis, panel, pageHead, byMonth, escape, ago, person } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { salesOf, instructorShare, rating, getCourse, getUser, studentsCount, moneyShort, COURSE } from '../data/model.js';

export function renderOverview(el, _p, ctx) {
  const id = ctx.user.id;
  const cs = db.query('courses', c => c.instructorId === id);
  const ids = new Set(cs.map(c => c.id));
  const sales = salesOf(id);
  const months = byMonth(sales, s => s.at, 8, s => instructorShare(s.net));
  const thisM = months.at(-1).value, prevM = months.at(-2).value;
  const enr = db.query('enrollments', e => ids.has(e.courseId));
  const rs = cs.map(c => rating(c.id)).filter(r => r.count);
  const avg = rs.length ? rs.reduce((t, r) => t + r.avg * r.count, 0) / rs.reduce((t, r) => t + r.count, 0) : 0;
  const pendingQ = db.count('questions', q => ids.has(q.courseId) && !q.answers.length);
  const reviews = db.query('reviews', r => ids.has(r.courseId) && r.status === 'publicada').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  el.innerHTML = pageHead(`Hola, ${ctx.user.name.split(' ')[0]}`, 'Así van tus cursos en Academia Faro.', '<a class="btn btn-primary" href="#/cursos">＋ Crear curso</a>') +
    kpis([
      { label: 'Ganancias del mes', value: moneyShort(thisM), delta: `${thisM >= prevM ? '▲' : '▼'} vs ${money(prevM)} mes anterior`, up: thisM >= prevM },
      { label: 'Ganancias totales', value: moneyShort(sales.reduce((t, s) => t + instructorShare(s.net), 0)) },
      { label: 'Estudiantes', value: num(enr.length), hint: `${enr.filter(e => e.completedAt).length} terminaron` },
      { label: 'Valoración promedio', value: avg ? avg.toFixed(2).replace('.', ',') + ' ★' : '—', hint: `${rs.reduce((t, r) => t + r.count, 0)} reseñas` },
      { label: 'Preguntas sin responder', value: String(pendingQ), up: !pendingQ, delta: pendingQ ? 'Responde pronto' : 'Al día' }
    ]) +
    `<div class="ak-grid">${panel('Ganancias por mes (tu 70%)', lineChart(months, { height: 180, format: money }))}
      ${panel('Estudiantes por curso', barChart(cs.filter(c => c.status === 'publicado').map(c => ({ label: c.title.split(' ')[0], value: studentsCount(c.id) })), { height: 180 }))}</div>
    <div class="ak-grid">${panel('Últimas reseñas', reviews.length ? `<ul class="ak-list">${reviews.map(r => `<li>${person(getUser(r.userId), getCourse(r.courseId)?.title)}<div class="grow small">${'★'.repeat(r.rating)} ${escape(r.text)}</div><span class="small muted">${ago(r.createdAt)}</span></li>`).join('')}</ul>` : '<p class="muted">Aún no hay reseñas.</p>')}
      ${panel('Estado de tus cursos', `<ul class="ak-list">${cs.map(c => `<li><div class="grow"><b>${escape(c.title)}</b><small>${COURSE[c.status][0]}${c.reviewNote ? ' · ' + escape(c.reviewNote) : ''}</small></div><a class="btn btn-sm" href="#/cursos/${c.id}">Editar</a></li>`).join('')}</ul>`)}</div>`;
}
