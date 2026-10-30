// Página de inicio: todas las secciones vienen de la DB (editables en el CMS).
import { escape, num } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, home } from '../data/db.js';
import { sectionHead } from './layout.js';
import { projectCard, postCard, teamCard, stars, publishedProjects, publishedPosts } from './cards.js';
import { art } from '../shared/art.js';

let rotTimer, carTimer;

export function renderHome(el) {
  clearInterval(rotTimer); clearInterval(carTimer);
  const h = home(), on = h.sections || {};
  const hero = h.hero || {};
  const services = db.query('services', s => s.active).sort((a, b) => a.order - b.order);
  const featured = publishedProjects().filter(p => p.featured).slice(0, 6);
  const team = db.query('team', t => t.active).sort((a, b) => a.order - b.order).slice(0, 4);
  const tms = db.query('testimonials', t => t.published).sort((a, b) => a.order - b.order);
  const clients = db.query('clients', c => c.active).sort((a, b) => a.order - b.order);
  const posts = publishedPosts().slice(0, 3);

  el.innerHTML = `
  <section class="hero site-hero">
    <div class="hero-orbs" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-inner">
      <div class="hero-copy hero-text" data-anim>
        <span class="eyebrow">${escape(hero.eyebrow)}</span>
        <h1 class="hero-title">${escape(hero.title)} <span class="rotator" aria-live="polite"><em data-rot>${escape((hero.words || [''])[0])}</em></span></h1>
        <p class="lead">${escape(hero.lead)}</p>
        <div class="row hero-cta"><a class="btn btn-primary btn-lg" href="#/cotizar">${escape(hero.ctaPrimary)} →</a><a class="btn btn-lg" href="#/trabajos">${escape(hero.ctaSecondary)}</a></div>
      </div>
      <div class="hero-art hero-media" data-anim="zoomIn">${featured[0] ? art(featured[0].art, { ratio: '1/1', cls: 'hero-art-main' }) : ''}
        ${featured[1] ? `<a class="hero-chip card" href="#/trabajos/${escape(featured[1].slug)}"><b>${escape(featured[1].title)}</b><small class="muted">Proyecto destacado →</small></a>` : ''}</div>
    </div>
  </section>

  ${on.clients && clients.length ? `<section class="clients-band" aria-label="Clientes"><div class="container"><p class="small muted">Confían en nosotros</p><div class="marquee"><div class="marquee-track">${[...clients, ...clients].map(c => `<span class="client-logo">${escape(c.name)}</span>`).join('')}</div></div></div></section>` : ''}

  ${on.services ? `<section class="section home-services" id="servicios"><div class="container">
    ${sectionHead('01 — Servicios', 'Todo lo que tu marca necesita para brillar', 'Equipos multidisciplinarios que acompañan desde la estrategia hasta el lanzamiento.')}
    <div class="grid-3 services">${services.map(s => `<article class="card hover service">
      <span class="service-ico" aria-hidden="true">${escape(s.icon)}</span><h3>${escape(s.title)}</h3><p class="muted">${escape(s.desc)}</p>
      <div class="row" style="gap:6px">${(s.tags || []).map(t => `<span class="badge plain">${escape(t)}</span>`).join('')}</div></article>`).join('')}</div>
  </div></section>` : ''}

  ${on.stats ? `<section class="stats-band home-stats" aria-label="Cifras del estudio"><div class="container grid-4">${(h.stats || []).map(s => `<div class="big-stat" data-anim><span class="big-num" data-count="${Number(s.value) || 0}">${num(Number(s.value) || 0)}</span><span class="big-suf">${escape(s.suffix)}</span><p class="muted">${escape(s.label)}</p></div>`).join('')}</div></section>` : ''}

  ${on.work ? `<section class="section alt home-work" id="trabajos"><div class="container">
    ${sectionHead('02 — Trabajos seleccionados', 'Proyectos de los que presumimos', '', '<a class="btn" href="#/trabajos">Ver todo el portafolio →</a>')}
    <div class="grid-3">${featured.map(projectCard).join('')}</div>
  </div></section>` : ''}

  ${on.about ? `<section class="section home-about"><div class="container about">
    <div data-anim><span class="eyebrow"><span class="sec-n">03 — </span>El estudio</span><h2>${escape(h.about?.title)}</h2>${String(h.about?.text || '').split(/\n+/).map(p => `<p>${escape(p)}</p>`).join('')}<a class="btn" href="#/estudio">Conoce al equipo →</a></div>
    <div class="grid-2 team-mini">${team.map(teamCard).join('')}</div>
  </div></section>` : ''}

  ${on.process ? `<section class="section alt home-process"><div class="container">
    ${sectionHead('04 — Proceso', 'Cómo trabajamos, sin misterios')}
    <ol class="process">${(h.process || []).map((p, i) => `<li class="card process-step"><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${escape(p.title)}</h3><p class="muted">${escape(p.text)}</p><span class="badge badge-primary">${escape(p.duration)}</span></li>`).join('')}</ol>
  </div></section>` : ''}

  ${on.testimonials && tms.length ? `<section class="section home-testi"><div class="container">
    ${sectionHead('05 — Testimonios', 'Lo que dicen de nosotros')}
    <div class="carousel" data-anim aria-roledescription="carrusel" aria-label="Testimonios">
      <div class="carousel-track">${tms.map((t, i) => `<figure class="card quote" aria-label="${i + 1} de ${tms.length}" ${i ? 'hidden' : ''}>
        ${stars(t.rating)}<blockquote>“${escape(t.quote)}”</blockquote>
        <figcaption class="row" style="gap:12px"><span class="avatar">${escape(initials(t.author))}</span><span><b>${escape(t.author)}</b><br><small class="muted">${escape(t.role)}, ${escape(t.company)}</small></span></figcaption></figure>`).join('')}</div>
      <div class="row carousel-ctrl"><button class="btn btn-icon" data-dir="-1" aria-label="Anterior">←</button><div class="dots">${tms.map((_, i) => `<button class="dot ${i ? '' : 'on'}" data-go="${i}" aria-label="Testimonio ${i + 1}"></button>`).join('')}</div><button class="btn btn-icon" data-dir="1" aria-label="Siguiente">→</button></div>
    </div>
  </div></section>` : ''}

  ${on.blog && posts.length ? `<section class="section alt home-blog"><div class="container">
    ${sectionHead('06 — Blog y noticias', 'Ideas desde el estudio', '', '<a class="btn" href="#/blog">Ir al blog →</a>')}
    <div class="grid-3">${posts.map(postCard).join('')}</div>
  </div></section>` : ''}

  ${on.cta ? `<section class="section home-cta"><div class="container"><div class="card cta-band" data-anim>
    <div><h2>${escape(h.cta?.title)}</h2><p class="muted">${escape(h.cta?.text)}</p></div>
    <div class="row"><a class="btn btn-primary btn-lg" href="#/cotizar">Calcular presupuesto</a><a class="btn btn-lg" href="#/contacto">Escribirnos</a></div>
  </div></div></section>` : ''}`;

  // Palabras rotativas del hero
  const words = hero.words || [];
  const rot = el.querySelector('[data-rot]');
  let wi = 0;
  if (rot && words.length > 1) rotTimer = setInterval(() => {
    if (!document.body.contains(rot)) return clearInterval(rotTimer);
    wi = (wi + 1) % words.length;
    rot.classList.remove('in'); void rot.offsetWidth; rot.textContent = words[wi]; rot.classList.add('in');
  }, 2600);

  // Contadores
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const n = e.target, to = +n.dataset.count, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 1200); n.textContent = num(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); io.unobserve(n);
  }), { threshold: 0 });
  el.querySelectorAll('[data-count]').forEach(n => io.observe(n));

  // Carrusel de testimonios
  const car = el.querySelector('.carousel');
  if (car) {
    const slides = [...car.querySelectorAll('.quote')], dots = [...car.querySelectorAll('.dot')];
    let ci = 0;
    const show = i => { ci = (i + slides.length) % slides.length; slides.forEach((s, k) => (s.hidden = k !== ci)); dots.forEach((d, k) => d.classList.toggle('on', k === ci)); };
    car.addEventListener('click', e => {
      const d = e.target.closest('[data-dir]'), g = e.target.closest('[data-go]');
      if (d) show(ci + +d.dataset.dir); if (g) show(+g.dataset.go);
    });
    carTimer = setInterval(() => { if (!document.body.contains(car)) return clearInterval(carTimer); if (!car.matches(':hover')) show(ci + 1); }, 6000);
  }
}
