// Moderación de reseñas y preguntas (admin y soporte).
import { pageHead, table, person, badge, html, escape, date, ago, toast, formDialog, confirm } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { getUser, getCourse, notify } from '../data/model.js';

const RS = { publicada: ['Publicada', 'success'], pendiente: ['Pendiente', 'warning'], oculta: ['Oculta', 'danger'] };
export function renderReviews(el, _p, ctx) {
  const rows = db.all('reviews').map(r => ({ ...r, _u: getUser(r.userId), _c: getCourse(r.courseId) })).filter(r => r._u && r._c).sort((a, b) => (b.status === 'pendiente') - (a.status === 'pendiente') || (b.reported ? 1 : 0) - (a.reported ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
  el.innerHTML = pageHead('Moderación de reseñas', 'Las reseñas de 1–2 estrellas y las reportadas pasan por revisión antes de mostrarse.') + '<div data-t></div>';
  table(el.querySelector('[data-t]'), {
    key: 'reviews', rows, pageSize: 10,
    search: r => `${r.text} ${r._u.name} ${r._c.title}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(RS).map(([k, v]) => [k, v[0]]) }, { key: 'rating', label: 'Estrellas', options: ['5', '4', '3', '2', '1'], test: (r, v) => r.rating === +v }, { key: 'reported', label: 'Reportadas', options: [['1', 'Solo reportadas']], test: r => !!r.reported }],
    columns: [
      { key: 'rating', label: '★', render: r => '★'.repeat(r.rating) },
      { key: 'text', label: 'Reseña', render: r => html`${r.text}<br><small class="muted">${r._c.title}</small>` },
      { key: 'u', label: 'Autor', value: r => r._u.name, render: r => person(r._u, ago(r.createdAt)) },
      { key: 'status', label: 'Estado', render: r => badge(RS[r.status][0], RS[r.status][1]) + (r.reported ? ' ' + badge('Reportada', 'danger') : '') },
      { key: 'x', label: '', sort: false, align: 'right', render: r => `<span class="ak-actions">${r.status !== 'publicada' || r.reported ? '<button class="btn btn-sm btn-primary" data-act="pub">Publicar</button>' : ''}${r.status !== 'oculta' ? '<button class="btn btn-sm btn-ghost" data-act="hide">Ocultar</button>' : ''}<button class="btn btn-sm btn-ghost ak-danger" data-act="del" aria-label="Eliminar">🗑</button></span>` }
    ]
  });
  el.querySelector('[data-t]').addEventListener('row-action', async e => {
    const r = e.detail.row;
    if (e.detail.action === 'pub') { db.update('reviews', r.id, { status: 'publicada', reported: false }); db.log('reseña publicada', `${r._c.title} · ${r.rating}★`, ctx.user.id); toast('Reseña publicada', 'success'); }
    if (e.detail.action === 'hide') { db.update('reviews', r.id, { status: 'oculta', reported: false }); notify(r.userId, 'Reseña ocultada', `Tu reseña de «${r._c.title}» no cumple las normas de la comunidad.`, 'warning'); db.log('reseña ocultada', r._c.title, ctx.user.id); toast('Reseña ocultada', 'success'); }
    if (e.detail.action === 'del') { if (await confirm('¿Eliminar la reseña definitivamente?', { danger: true, ok: 'Eliminar' })) { db.remove('reviews', r.id); db.log('reseña eliminada', r._c.title, ctx.user.id); toast('Reseña eliminada', 'success'); } }
  });
}

export function renderQuestions(el, _p, ctx) {
  const rows = db.all('questions').map(q => ({ ...q, _u: getUser(q.userId), _c: getCourse(q.courseId), _st: q.resolved ? 'resuelta' : q.answers.length ? 'respondida' : 'pendiente' })).filter(q => q._u && q._c);
  el.innerHTML = pageHead('Preguntas de la comunidad', 'Supervisa preguntas sin respuesta y apoya a los instructores.') + '<div data-t></div>';
  table(el.querySelector('[data-t]'), {
    key: 'qa-admin', rows, pageSize: 10,
    search: q => `${q.title} ${q.body} ${q._c.title}`,
    filters: [{ key: '_st', label: 'Estado', options: [['pendiente', 'Sin respuesta'], ['respondida', 'Respondida'], ['resuelta', 'Resuelta']] }],
    columns: [
      { key: 'title', label: 'Pregunta', render: q => html`<b>${q.title}</b><br><small class="muted">${q._c.title} · ${getUser(q._c.instructorId)?.name}</small>` },
      { key: 'u', label: 'Estudiante', value: q => q._u.name, render: q => person(q._u) },
      { key: 'createdAt', label: 'Antigüedad', render: q => ago(q.createdAt) },
      { key: '_st', label: 'Estado', render: q => badge(q._st, q._st === 'pendiente' ? 'warning' : 'success') },
      { key: 'x', label: '', sort: false, align: 'right', render: q => `<span class="ak-actions">${!q.answers.length ? '<button class="btn btn-sm" data-act="nudge">🔔 Avisar al instructor</button>' : ''}<button class="btn btn-sm btn-ghost" data-act="answer">Responder</button></span>` }
    ]
  });
  el.querySelector('[data-t]').addEventListener('row-action', async e => {
    const q = e.detail.row;
    if (e.detail.action === 'nudge') { notify(q._c.instructorId, 'Pregunta sin responder', `«${q.title}» en ${q._c.title} espera tu respuesta.`, 'warning'); toast('Aviso enviado al instructor', 'success'); return; }
    const v = await formDialog({ title: `Responder: ${q.title}`, intro: escape(q.body), fields: [{ name: 'body', label: 'Respuesta del equipo de soporte', type: 'textarea', required: true }] });
    if (!v) return;
    db.update('questions', q.id, row => ({ answers: [...row.answers, { userId: ctx.user.id, body: v.body, at: new Date().toISOString(), instructor: false }] }));
    notify(q.userId, 'Respondieron tu pregunta', `El equipo de Academia Faro respondió «${q.title}».`, 'success');
    toast('Respuesta publicada', 'success');
  });
}
