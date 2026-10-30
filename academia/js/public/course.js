// Ficha del curso: temario, instructor, reseñas, lección de muestra y compra.
import { escape, date, money, modal, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { courseBySlug, getUser, getCategory, rating, studentsCount, lessonsOf, courseMinutes, fmtHours, priceOf, enrollment, isPublic, LESSON, checkout } from '../data/model.js';
import { cover, starRow, priceTag, courseCard } from '../shared/bits.js';
import { addToCart, inCart } from '../shared/cart.js';

export function renderCourse(view, slug) {
  const c = courseBySlug(slug);
  const u = auth.current();
  const canPreview = c && (isPublic(c) || (u && (u.role === 'admin' || u.role === 'soporte' || u.id === c.instructorId)));
  if (!c || !canPreview) { view.innerHTML = '<section class="page"><div class="container"><div class="card empty"><span class="icon">📦</span><h2>Curso no disponible</h2><a class="btn btn-primary" href="#/cursos">Ver catálogo</a></div></div></section>'; return; }
  const r = rating(c.id), inst = getUser(c.instructorId), cat = getCategory(c.categoryId);
  const ls = lessonsOf(c), mine = u && enrollment(u.id, c.id);
  const reviews = db.query('reviews', x => x.courseId === c.id && x.status === 'publicada').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const related = db.query('courses', x => isPublic(x) && x.categoryId === c.categoryId && x.id !== c.id).slice(0, 3);
  const instCourses = db.query('courses', x => isPublic(x) && x.instructorId === inst?.id);
  let shown = 5;
  view.innerHTML = `
  ${!isPublic(c) ? `<div class="container" style="padding-top:14px"><div class="ak-note warn card">Vista previa: este curso está en estado «${escape(c.status)}» y no es visible para el público.</div></div>` : ''}
  <section class="course-hero"><div class="container course-hero-grid"><div data-anim>
    <nav class="crumbs" aria-label="Ruta"><a href="#/cursos">Cursos</a> › <a href="#/cursos?cat=${cat?.slug}">${escape(cat?.name || '')}</a></nav>
    <h1>${escape(c.title)}</h1><p class="lead">${escape(c.subtitle)}</p>
    <div class="row" style="gap:10px 18px">${starRow(r.avg, r.count)}<span class="small">${studentsCount(c.id)} estudiantes</span><span class="badge badge-info">${escape(c.level)}</span></div>
    <p class="small" style="margin-top:10px">Creado por <a href="#/instructor/${inst?.id}">${escape(inst?.name || '')}</a> · ${fmtHours(courseMinutes(c))} · ${ls.length} lecciones · ${escape(c.language)}</p>
  </div></div></section>
  <section class="page"><div class="container course-main">
    <div class="stack">
      <div class="card"><h2 style="font-size:22px">Lo que aprenderás</h2><ul class="learn-list">${c.learn.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>
      <div><div class="row between" style="margin-bottom:10px"><h2 style="font-size:22px;margin:0">Contenido del curso</h2><span class="small muted">${c.sections.length} secciones · ${ls.length} lecciones · ${fmtHours(courseMinutes(c))}</span></div>
        <div class="curriculum">${c.sections.map((s, i) => `<details ${i === 0 ? 'open' : ''}><summary><span>${escape(s.title)}</span><span class="small muted">${s.lessons.length} lecciones · ${s.lessons.reduce((t, l) => t + l.minutes, 0)} min</span></summary>
          <ul>${s.lessons.map(l => `<li><span aria-hidden="true">${LESSON[l.type][0]}</span><span class="grow">${escape(l.title)}</span>${l.preview ? `<button class="btn btn-sm btn-ghost" data-prev="${l.id}">Vista previa</button>` : ''}<span class="small muted">${l.minutes} min</span></li>`).join('')}</ul></details>`).join('')}</div></div>
      <div class="card"><h2 style="font-size:22px">Requisitos</h2><ul>${c.requirements.map(x => `<li>${escape(x)}</li>`).join('')}</ul><h2 style="font-size:22px">Descripción</h2><p>${escape(c.description)}</p></div>
      <div class="card"><h2 style="font-size:22px">Instructor</h2><div class="instructor-box"><span class="avatar" style="--av:${inst?.color}">${initials(inst?.name)}</span><div><h3 style="margin:0"><a href="#/instructor/${inst?.id}">${escape(inst?.name)}</a></h3><p class="muted small" style="margin:2px 0 8px">${escape(inst?.headline || '')}</p><p class="small" style="margin:0">${instCourses.length} cursos · ${instCourses.reduce((t, k) => t + studentsCount(k.id), 0)} estudiantes</p><p style="margin:8px 0 0">${escape(inst?.bio || '')}</p></div></div></div>
      <div class="card" id="resenas"><h2 style="font-size:22px">Reseñas de estudiantes</h2>
        ${r.count ? `<div class="rating-box"><div class="rating-big"><b>${r.avg.toFixed(1).replace('.', ',')}</b>${starRow(r.avg)}<div class="small muted">Valoración del curso</div></div>
        <div class="dist">${r.dist.map((n, i) => `<div class="row"><span>${5 - i} ★</span><span class="progress"><i style="--v:${r.count ? n / r.count * 100 : 0}%"></i></span><span class="small muted">${n}</span></div>`).join('')}</div></div>
        <div data-reviews></div>${reviews.length > shown ? '<button class="btn" data-more>Ver más reseñas</button>' : ''}` : '<p class="muted">Este curso aún no tiene reseñas.</p>'}
      </div>
      ${related.length ? `<div><h2 style="font-size:22px">Cursos relacionados</h2><div class="grid-3">${related.map(courseCard).join('')}</div></div>` : ''}
    </div>
    <aside class="card buy-card" aria-label="Comprar">
      ${cover(c, 'lg')}
      ${priceTag(c)}
      ${mine ? `<a class="btn btn-primary btn-lg btn-block" href="aprender.html#/curso/${c.id}">Ir al curso</a><p class="small muted" style="margin:0">Estás inscrito desde el ${date(mine.enrolledAt)}.</p>`
      : `${priceOf(c) === 0 ? '<button class="btn btn-primary btn-lg btn-block" data-free>Inscribirme gratis</button>' : `<button class="btn btn-primary btn-lg btn-block" data-buy>Comprar ahora</button><button class="btn btn-block" data-cart>${inCart(c.id) ? '✓ En el carrito' : 'Agregar al carrito'}</button>`}`}
      ${ls.some(l => l.preview) ? `<button class="btn btn-ghost btn-block" data-prev="${ls.find(l => l.preview).id}">▶ Ver lección de muestra</button>` : ''}
      <ul><li>⏱ ${fmtHours(courseMinutes(c))} de contenido</li><li>📄 ${ls.filter(l => l.type === 'lectura').length} lecturas y ${ls.reduce((t, l) => t + (l.resources?.length || 0), 0)} recursos descargables</li><li>❓ ${ls.filter(l => l.type === 'quiz').length} quizzes · 📝 ${ls.filter(l => l.type === 'tarea').length} tareas</li><li>🎓 Certificado verificable</li><li>♾ Acceso de por vida</li></ul>
      <p class="small muted" style="margin:0">Garantía de reembolso de 14 días.</p>
    </aside>
  </div></section>`;
  const paintReviews = () => { const el = view.querySelector('[data-reviews]'); if (!el) return; el.innerHTML = reviews.slice(0, shown).map(x => { const a = getUser(x.userId); return `<article class="review"><header><span class="avatar" style="--av:${a?.color}">${initials(a?.name)}</span><span><b>${escape(a?.name || 'Estudiante')}</b><br><span class="stars"><span class="st">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)}</span> <small>${date(x.createdAt)}</small></span></span></header><p style="margin:0">${escape(x.text)}</p></article>`; }).join(''); };
  paintReviews();
  view.querySelector('[data-more]')?.addEventListener('click', e => { shown += 5; paintReviews(); if (shown >= reviews.length) e.target.remove(); });
  view.querySelectorAll('[data-prev]').forEach(b => b.addEventListener('click', () => {
    const l = ls.find(x => x.id === b.dataset.prev);
    modal({ title: `Vista previa: ${l.title}`, size: 'lg', body: `<div class="video"><span class="vtitle">${escape(c.title)} · ${escape(l.title)}</span><div class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="vbar"><span>Reproduciendo vista previa (simulada)</span></div></div><p class="muted" style="margin-top:12px">${l.type === 'lectura' ? 'Lectura de muestra: ' : ''}Esta es una lección gratuita del curso. Inscríbete para acceder a las ${ls.length} lecciones, quizzes, tareas y certificado.</p>` });
  }));
  view.querySelector('[data-cart]')?.addEventListener('click', e => { addToCart(c.id); e.target.textContent = '✓ En el carrito'; toast('Curso agregado al carrito', 'success'); });
  view.querySelector('[data-buy]')?.addEventListener('click', () => { addToCart(c.id); location.hash = '#/carrito'; });
  view.querySelector('[data-free]')?.addEventListener('click', () => {
    if (!u) { location.href = `login.html?next=${encodeURIComponent('index.html#/curso/' + c.slug)}`; return; }
    if (u.role !== 'estudiante') return toast('Inscríbete con una cuenta de estudiante', 'warning');
    checkout(u, [c.id], null, 'Gratis'); toast('¡Inscripción lista!', 'success'); location.href = `aprender.html#/curso/${c.id}`;
  });
}
