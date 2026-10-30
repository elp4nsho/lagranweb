// Portada (editable desde el CMS), categorías y página «Enseña en Faro».
import { escape, num } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { site, getCourse, getUser, getCategory, rating, isPublic, studentsCount } from '../data/model.js';
import { courseCard, cover, starRow } from '../shared/bits.js';

let timer;
export function renderHome(view) {
  clearInterval(timer);
  const s = site();
  const pub = db.query('courses', isPublic);
  const featured = s.featuredIds.map(getCourse).filter(isPublic);
  const top = pub.slice().sort((a, b) => rating(b.id).avg * Math.log(2 + rating(b.id).count) - rating(a.id).avg * Math.log(2 + rating(a.id).count)).slice(0, 4);
  const fresh = pub.slice().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 4);
  const instructors = db.query('users', u => u.role === 'instructor' && u.active !== false).map(u => ({ u, n: pub.filter(c => c.instructorId === u.id).reduce((t, c) => t + studentsCount(c.id), 0) })).sort((a, b) => b.n - a.n).slice(0, 4);
  const quotes = db.query('reviews', r => r.status === 'publicada' && r.rating === 5 && r.text.length > 50).slice(0, 3);
  const banners = (s.banners || []).filter(b => b.active !== false);
  const students = db.count('users', u => u.role === 'estudiante');
  view.innerHTML = `
  <section class="hero"><div class="container hero-grid">
    <div data-anim>
      <span class="eyebrow">${escape(s.heroEyebrow)}</span>
      <h1>${escape(s.heroTitle)} <span class="hl">${escape(s.heroHighlight)}</span></h1>
      <p class="lead">${escape(s.heroText)}</p>
      <form class="hero-search" data-hs role="search"><input class="input" name="q" type="search" placeholder="Ej: Python, Excel, fotografía…" aria-label="Buscar cursos"><button class="btn btn-primary btn-lg">${escape(s.ctaText)}</button></form>
      <ul class="hero-stats"><li><strong>${pub.length}</strong><span>cursos publicados</span></li><li><strong>${num(students)}</strong><span>estudiantes</span></li><li><strong>${db.count('users', u => u.role === 'instructor')}</strong><span>instructores expertos</span></li></ul>
    </div>
    <div class="hero-art" aria-hidden="true" data-anim="zoomIn">${featured.slice(0, 4).map(c => `<div class="card">${cover(c)}<div class="mini">${escape(c.title)}</div></div>`).join('')}</div>
  </div></section>
  ${banners.length ? `<section class="container banners" aria-roledescription="carrusel" aria-label="Promociones" data-anim>
    ${banners.map((b, i) => `<div class="banner tone-${b.tone || 'primary'}" data-b="${i}" ${i ? 'hidden' : ''}><div><h3>${escape(b.title)}</h3><p>${escape(b.text)}</p></div><a class="btn btn-primary" href="${escape(b.href || '#/cursos')}">${escape(b.cta || 'Ver más')}</a></div>`).join('')}
    ${banners.length > 1 ? `<div class="banner-dots">${banners.map((b, i) => `<button class="${i ? '' : 'on'}" data-dot="${i}" aria-label="Promoción ${i + 1}"></button>`).join('')}</div>` : ''}
  </section>` : ''}
  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Selección del equipo</span><h2>Cursos destacados</h2><p>Los favoritos de nuestra comunidad este mes.</p></div><a class="btn" href="#/cursos">Ver todos</a></div>
    <div class="grid-auto">${featured.map(courseCard).join('')}</div>
  </div></section>
  <section class="section alt-band" id="categorias"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Explora</span><h2>Categorías</h2></div></div>
    <div class="grid-4">${db.query('categories', c => c.active !== false).map(catTile).join('')}</div>
  </div></section>
  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Mejor evaluados</span><h2>Lo que más recomiendan</h2></div></div>
    <div class="grid-4">${top.map(courseCard).join('')}</div>
    <div class="section-head" style="margin-top:40px" data-anim><div><span class="eyebrow">Novedades</span><h2>Recién publicados</h2></div></div>
    <div class="grid-4">${fresh.map(courseCard).join('')}</div>
  </div></section>
  <section class="section alt-band"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Aprende con los mejores</span><h2>Instructores destacados</h2></div><a class="btn" href="#/ensena">Enseña en Faro</a></div>
    <div class="grid-4">${instructors.map(({ u, n }) => `<a class="card hover inst-card" href="#/instructor/${u.id}"><span class="avatar" style="--av:${u.color}">${initials(u.name)}</span><b>${escape(u.name)}</b><small class="muted">${escape(u.headline || '')}</small><span class="badge badge-primary">${num(n)} estudiantes</span></a>`).join('')}</div>
  </div></section>
  ${quotes.length ? `<section class="section"><div class="container"><div class="section-head" data-anim><div><span class="eyebrow">Testimonios</span><h2>Historias de estudiantes</h2></div></div>
    <div class="grid-3">${quotes.map(q => { const u = getUser(q.userId), c = getCourse(q.courseId); return `<blockquote class="card quote" style="margin:0"><p>“${escape(q.text)}”</p><footer><span class="avatar" style="--av:${u?.color}">${initials(u?.name)}</span><span><b>${escape(u?.name)}</b><br><small class="muted">${escape(c?.title)}</small></span></footer></blockquote>`; }).join('')}</div></div></section>` : ''}`;
  view.querySelector('[data-hs]').addEventListener('submit', e => { e.preventDefault(); const q = e.target.q.value.trim(); location.hash = `#/cursos${q ? '?q=' + encodeURIComponent(q) : ''}`; });
  if (banners.length > 1) {
    let i = 0;
    const show = k => { i = (k + banners.length) % banners.length; view.querySelectorAll('[data-b]').forEach(b => { b.hidden = +b.dataset.b !== i; }); view.querySelectorAll('[data-dot]').forEach(d => d.classList.toggle('on', +d.dataset.dot === i)); };
    view.querySelector('.banner-dots').addEventListener('click', e => { const d = e.target.closest('[data-dot]'); if (d) { show(+d.dataset.dot); clearInterval(timer); } });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => { if (!document.body.contains(view.querySelector('.banners'))) return clearInterval(timer); show(i + 1); }, 6000);
  }
}

const catTile = c => `<a class="card hover cat-tile tone-${c.tone}" href="#/cursos?cat=${c.slug}"><span class="ico">${escape(c.icon)}</span><span><b>${escape(c.name)}</b><small>${db.count('courses', k => k.categoryId === c.id && isPublic(k))} cursos</small></span></a>`;

export function renderCategories(view) {
  view.innerHTML = `<section class="page"><div class="container"><div class="section-head"><div><span class="eyebrow">Explora</span><h1>Categorías</h1><p>Encuentra cursos por área de interés.</p></div></div>
    <div class="grid-3">${db.query('categories', c => c.active !== false).map(c => `<div class="card stack">${catTile(c).replace('card hover cat-tile', 'cat-tile')}<p class="muted small" style="margin:0">${escape(c.description || '')}</p>
      <ul class="small" style="margin:0;padding-left:18px">${db.query('courses', k => k.categoryId === c.id && isPublic(k)).slice(0, 4).map(k => `<li><a href="#/curso/${k.slug}">${escape(k.title)}</a></li>`).join('')}</ul></div>`).join('')}</div>
  </div></section>`;
}

export function renderTeach(view) {
  const s = site();
  view.innerHTML = `<section class="hero"><div class="container hero-grid"><div data-anim><span class="eyebrow">Enseña en Faro</span><h1>Comparte lo que sabes <span class="hl">y gana con ello</span></h1>
    <p class="lead">Crea tu curso con nuestro constructor de currículo, envíalo a revisión y empieza a vender. Recibes el ${100 - s.commission}% de cada venta, pagado mensualmente.</p>
    <div class="row"><a class="btn btn-primary btn-lg" href="login.html">Ingresar como instructor</a><a class="btn btn-lg" href="#/cursos">Ver cursos</a></div></div>
    <div class="grid-2" data-anim>${[['🛠️', 'Constructor de cursos', 'Secciones, lecciones de video, lecturas, quizzes y tareas.'], ['✅', 'Revisión de calidad', 'Nuestro equipo revisa cada curso antes de publicarlo.'], ['💬', 'Comunidad', 'Responde preguntas y recibe reseñas de tus estudiantes.'], ['💸', 'Pagos mensuales', `El ${100 - s.commission}% de cada venta, por transferencia.`]].map(([i, t, d]) => `<div class="card"><span style="font-size:28px">${i}</span><h3 style="margin:6px 0">${t}</h3><p class="muted small" style="margin:0">${d}</p></div>`).join('')}</div>
  </div></section>`;
}
