// Cola de revisión: aprobar (publicar) o rechazar cursos enviados por instructores.
import { pageHead, escape, toast, formDialog, modal, ago, person, badge } from '../shared/admin-kit.js';
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getUser, getCategory, lessonsOf, courseMinutes, fmtHours, LESSON, notify } from '../data/model.js';

export function renderReviewQueue(el, _p, ctx) {
  const q = db.query('courses', c => c.status === 'revision').sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  el.innerHTML = pageHead('Revisión de cursos', 'Cursos enviados por instructores, en orden de llegada.') +
    (q.length ? q.map(c => `<section class="card stack" data-c="${c.id}"><div class="row between"><div><h3 style="margin:0">${escape(c.emoji)} ${escape(c.title)}</h3><p class="muted small" style="margin:4px 0 0">${escape(c.subtitle)}</p></div>${badge(`Enviado ${ago(c.submittedAt || c.createdAt)}`, 'warning')}</div>
      <div class="row">${person(getUser(c.instructorId), 'Instructor')}<span class="badge">${escape(getCategory(c.categoryId)?.name)}</span><span class="badge">${escape(c.level)}</span><span class="badge">${c.price ? money(c.price) : 'Gratis'}</span><span class="badge">${c.sections.length} secciones · ${lessonsOf(c).length} lecciones · ${fmtHours(courseMinutes(c))}</span></div>
      <div class="row"><button class="btn" data-detail>📋 Ver currículo</button><a class="btn" href="index.html#/curso/${c.slug}" target="_blank" rel="noopener">👁 Vista previa</a><span style="flex:1"></span><button class="btn btn-danger" data-reject>Rechazar</button><button class="btn btn-primary" data-approve>✓ Aprobar y publicar</button></div></section>`).join('')
      : '<div class="card empty"><span class="icon">✅</span><p>No hay cursos esperando revisión.</p></div>');
  el.querySelectorAll('[data-c]').forEach(card => {
    const c = db.get('courses', card.dataset.c);
    card.querySelector('[data-detail]').onclick = () => modal({ title: c.title, size: 'lg', body: `<p>${escape(c.description)}</p>${c.sections.map(s => `<h4>${escape(s.title)}</h4><ul>${s.lessons.map(l => `<li>${LESSON[l.type][0]} ${escape(l.title)} · ${l.minutes} min${l.preview ? ' · muestra' : ''}</li>`).join('')}</ul>`).join('')}` });
    card.querySelector('[data-approve]').onclick = () => {
      db.update('courses', c.id, { status: 'publicado', publishedAt: new Date().toISOString(), reviewNote: null });
      notify(c.instructorId, 'Curso publicado 🎉', `«${c.title}» fue aprobado y ya está a la venta.`, 'success');
      db.log('curso aprobado', c.title, ctx.user.id); toast('Curso publicado en el catálogo', 'success');
    };
    card.querySelector('[data-reject]').onclick = async () => {
      const v = await formDialog({ title: `Rechazar «${c.title}»`, submit: 'Rechazar', fields: [{ name: 'reasons', label: 'Motivos', type: 'multi', options: ['Audio de baja calidad', 'Descripción incompleta', 'Muy pocas lecciones', 'Falta lección de muestra', 'Contenido duplicado'] }, { name: 'note', label: 'Comentario para el instructor', type: 'textarea' }], validate: v => !v.reasons.length && !v.note ? 'Indica al menos un motivo' : null });
      if (!v) return;
      const note = [v.reasons.join(', '), v.note].filter(Boolean).join('. ');
      db.update('courses', c.id, { status: 'rechazado', reviewNote: note });
      notify(c.instructorId, 'Tu curso necesita cambios', `«${c.title}»: ${note}`, 'warning');
      db.log('curso rechazado', `${c.title} · ${note}`, ctx.user.id); toast('Curso rechazado; se notificó al instructor', 'success');
    };
  });
}
