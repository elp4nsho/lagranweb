// Estudiantes, preguntas (Q&A) y ganancias del instructor.
import { pageHead, table, person, badge, pctBar, html, escape, date, ago, toast, formDialog, downloadCSV, kpis, panel, byMonth } from '../shared/admin-kit.js';
import { money, barChart } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getCourse, getUser, coursePct, salesOf, instructorShare, lessonsOf, notify } from '../data/model.js';

const mine = ctx => new Set(db.query('courses', c => c.instructorId === ctx.user.id).map(c => c.id));

export function renderStudents(el, _p, ctx) {
  const ids = mine(ctx);
  const rows = db.query('enrollments', e => ids.has(e.courseId)).map(e => ({ ...e, _u: getUser(e.userId), _c: getCourse(e.courseId), _p: coursePct(e), _subs: Object.keys(e.assignments || {}).length })).filter(e => e._u);
  el.innerHTML = pageHead('Estudiantes', `${rows.length} matrículas en tus cursos.`, '<button class="btn" data-csv>⬇ CSV</button>') + '<div data-t></div>';
  const t = table(el.querySelector('[data-t]'), {
    key: 'inst-students', rows, pageSize: 12,
    search: e => `${e._u.name} ${e._u.email} ${e._c.title}`,
    filters: [{ key: 'courseId', label: 'Curso', options: [...ids].map(id => [id, getCourse(id).title]) }, { key: 'st', label: 'Avance', options: [['done', 'Terminaron'], ['prog', 'En progreso'], ['zero', 'Sin iniciar']], test: (e, v) => v === 'done' ? !!e.completedAt : v === 'zero' ? e._p === 0 : !e.completedAt && e._p > 0 }],
    columns: [
      { key: 'u', label: 'Estudiante', value: e => e._u.name, render: e => person(e._u, e._u.city) },
      { key: 'c', label: 'Curso', value: e => e._c.title, render: e => escape(e._c.title) },
      { key: 'enrolledAt', label: 'Inscripción', render: e => date(e.enrolledAt) },
      { key: '_p', label: 'Avance', render: e => pctBar(e._p) },
      { key: '_subs', label: 'Tareas', align: 'center', render: e => e._subs ? `<button class="btn btn-sm" data-act="grade">📎 ${e._subs}</button>` : '—' },
      { key: 'lastActivityAt', label: 'Última actividad', render: e => ago(e.lastActivityAt || e.enrolledAt) }
    ]
  });
  el.querySelector('[data-t]').addEventListener('row-action', async ev => {
    const e = ev.detail.row, c = e._c;
    const [lid, sub] = Object.entries(e.assignments)[0];
    const v = await formDialog({ title: `Tarea de ${e._u.name}`, intro: `${escape(lessonsOf(c).find(l => l.id === lid)?.title || '')}: <b>${escape(sub.fileName)}</b> (${escape(sub.size)}) · ${date(sub.at)}`, fields: [{ name: 'status', label: 'Estado', type: 'select', options: ['entregada', 'aprobada', 'requiere cambios'], value: sub.status }, { name: 'feedback', label: 'Comentario para el estudiante', type: 'textarea', value: sub.feedback || '' }] });
    if (!v) return;
    db.update('enrollments', e.id, row => ({ assignments: { ...row.assignments, [lid]: { ...sub, ...v } } }));
    notify(e.userId, 'Tu tarea fue revisada', `${c.title}: ${v.status}. ${v.feedback}`, v.status === 'aprobada' ? 'success' : 'warning');
    toast('Revisión enviada', 'success');
  });
  el.querySelector('[data-csv]').onclick = () => { downloadCSV('estudiantes.csv', t.filtered().map(e => ({ estudiante: e._u.name, correo: e._u.email, curso: e._c.title, inscripcion: date(e.enrolledAt), avance: e._p + '%', terminado: e.completedAt ? date(e.completedAt) : '' }))); toast('CSV exportado', 'success'); };
}

export function renderQA(el, _p, ctx) {
  const ids = mine(ctx);
  const rows = db.query('questions', q => ids.has(q.courseId)).map(q => ({ ...q, _u: getUser(q.userId), _c: getCourse(q.courseId), _st: q.resolved ? 'resuelta' : q.answers.length ? 'respondida' : 'pendiente' }));
  el.innerHTML = pageHead('Preguntas de estudiantes', 'Responde las dudas: tus respuestas se ven en el aula del curso.') + '<div data-t></div>';
  table(el.querySelector('[data-t]'), {
    key: 'inst-qa', rows, pageSize: 10,
    search: q => `${q.title} ${q.body} ${q._u?.name}`,
    filters: [{ key: '_st', label: 'Estado', options: [['pendiente', 'Sin responder'], ['respondida', 'Respondidas'], ['resuelta', 'Resueltas']] }, { key: 'courseId', label: 'Curso', options: [...ids].map(id => [id, getCourse(id).title]) }],
    columns: [
      { key: 'title', label: 'Pregunta', render: q => html`<b>${q.title}</b><br><small class="muted">${q.body}</small>` },
      { key: 'u', label: 'Estudiante', value: q => q._u?.name, render: q => person(q._u, q._c.title) },
      { key: 'createdAt', label: 'Fecha', render: q => ago(q.createdAt) },
      { key: '_st', label: 'Estado', render: q => badge(q._st === 'pendiente' ? 'Sin responder' : q._st === 'resuelta' ? 'Resuelta' : 'Respondida', q._st === 'pendiente' ? 'warning' : q._st === 'resuelta' ? 'success' : 'info') },
      { key: 'x', label: '', sort: false, align: 'right', render: () => '<button class="btn btn-sm btn-primary" data-act="answer">Responder</button>' }
    ]
  });
  el.querySelector('[data-t]').addEventListener('row-action', async ev => {
    const q = ev.detail.row;
    const v = await formDialog({ title: q.title, intro: `${escape(q.body)}${q.answers.map(a => `<br><br><b>${escape(getUser(a.userId)?.name)}:</b> ${escape(a.body)}`).join('')}`, fields: [{ name: 'body', label: 'Tu respuesta', type: 'textarea', required: true }, { name: 'resolved', label: 'Marcar como resuelta', type: 'checkbox', value: true }], submit: 'Publicar respuesta' });
    if (!v) return;
    db.update('questions', q.id, row => ({ answers: [...row.answers, { userId: ctx.user.id, body: v.body, at: new Date().toISOString(), instructor: true }], resolved: v.resolved }));
    notify(q.userId, 'Respondieron tu pregunta', `${ctx.user.name} respondió «${q.title}».`, 'success');
    db.log('pregunta respondida', `${q._c.title} · ${q.title}`, ctx.user.id);
    toast('Respuesta publicada', 'success');
  });
}

export function renderEarnings(el, _p, ctx) {
  const sales = salesOf(ctx.user.id);
  const months = byMonth(sales, s => s.at, 10, s => instructorShare(s.net));
  const payouts = db.query('payouts', p => p.instructorId === ctx.user.id).sort((a, b) => b.period.localeCompare(a.period));
  const byCourse = Object.values(sales.reduce((m, s) => { const o = m[s.courseId] || (m[s.courseId] = { title: getCourse(s.courseId)?.title, n: 0, gross: 0, mine: 0 }); o.n++; o.gross += s.net; o.mine += instructorShare(s.net); return m; }, {})).sort((a, b) => b.mine - a.mine);
  const paid = payouts.filter(p => p.status === 'pagado').reduce((t, p) => t + p.amount, 0);
  el.innerHTML = pageHead('Ganancias', `Recibes el 70% de cada venta neta. Pago mensual a ${ctx.user.payoutMethod || 'tu cuenta'}.`, '<button class="btn" data-csv>⬇ CSV ventas</button>') +
    kpis([{ label: 'Ventas totales', value: String(sales.length) }, { label: 'Tus ganancias', value: money(sales.reduce((t, s) => t + instructorShare(s.net), 0)) }, { label: 'Pagado', value: money(paid) }, { label: 'Pendiente de pago', value: money(payouts.filter(p => p.status === 'pendiente').reduce((t, p) => t + p.amount, 0)) }]) +
    `<div class="ak-grid">${panel('Ganancias por mes', barChart(months, { height: 180, format: money }))}${panel('Por curso', `<div class="table-wrap"><table class="table"><thead><tr><th>Curso</th><th>Ventas</th><th>Neto</th><th>Tu parte</th></tr></thead><tbody>${byCourse.map(r => `<tr><td>${escape(r.title)}</td><td>${r.n}</td><td>${money(r.gross)}</td><td><b>${money(r.mine)}</b></td></tr>`).join('')}</tbody></table></div>`)}</div>` +
    panel('Pagos', `<div class="table-wrap"><table class="table"><thead><tr><th>Período</th><th>Monto</th><th>Estado</th><th>Fecha de pago</th></tr></thead><tbody>${payouts.map(p => `<tr><td>${p.period}</td><td>${money(p.amount)}</td><td>${badge(p.status === 'pagado' ? 'Pagado' : 'Pendiente', p.status === 'pagado' ? 'success' : 'warning')}</td><td>${p.paidAt ? date(p.paidAt) : '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin pagos aún.</td></tr>'}</tbody></table></div>`);
  el.querySelector('[data-csv]').onclick = () => { downloadCSV('mis-ventas.csv', sales.map(s => ({ fecha: date(s.at), curso: s.title, precio: s.price, neto: s.net, tu_parte: instructorShare(s.net) }))); toast('CSV exportado', 'success'); };
}
