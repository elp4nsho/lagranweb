// Inicio del sitio de empleos (textos editables desde Ajustes del panel).
import { escape, money } from '../../../assets/core/ui.js';
import { jobCard } from './jobs.js';

const ART = `<svg viewBox="0 0 400 300" role="img" aria-label="Ilustración de cordillera">
  <rect width="400" height="300" fill="currentColor" opacity=".06"/>
  <circle cx="300" cy="80" r="34" fill="currentColor" opacity=".25"/>
  <path d="M0 260 90 120l50 70 60-100 70 110 40-50 90 110Z" fill="currentColor" opacity=".55"/>
  <path d="M0 300 70 210l60 60 80-110 90 140Z" fill="currentColor" opacity=".85"/>
  <path d="m200 90 22 34-14 8-14-10-12 12Z" fill="var(--surface)" opacity=".9"/>
  <g fill="var(--surface)"><circle cx="120" cy="250" r="9"/><circle cx="150" cy="246" r="9"/><circle cx="180" cy="250" r="9"/><rect x="111" y="258" width="18" height="24" rx="6"/><rect x="141" y="254" width="18" height="28" rx="6"/><rect x="171" y="258" width="18" height="24" rx="6"/></g>
</svg>`;

export function render(el, ctx) {
  const { db, site } = ctx;
  const open = db.query('jobs', j => j.status === 'publicada').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const depts = Object.fromEntries(db.all('departments').map(d => [d.id, d]));
  const headcount = db.count('employees', e => e.status !== 'desvinculado');
  el.innerHTML = `
    <section class="hero site-hero"><div class="container hero-grid">
      <div class="hero-text" data-anim><span class="eyebrow">Trabaja con nosotros</span><h1>${escape(site.heroTitle || '')}</h1><p class="lead">${escape(site.heroSubtitle || '')}</p>
        <div class="row" style="margin-top:20px"><a class="btn btn-primary btn-lg" href="#/empleos">Ver ${open.length} empleos</a><a class="btn btn-lg" href="#/estado">Revisar mi postulación</a></div></div>
      <div class="hero-art hero-media" data-anim="zoomIn">${ART}</div>
    </div></section>
    <section class="container home-stats"><div class="stats-strip">
      <div class="card" data-anim><div class="stat"><span class="label">Colaboradores</span><span class="value">${headcount}</span></div></div>
      <div class="card" data-anim data-anim-delay="80"><div class="stat"><span class="label">Vacantes abiertas</span><span class="value">${open.reduce((s, j) => s + (j.openings || 1), 0)}</span></div></div>
      <div class="card" data-anim data-anim-delay="160"><div class="stat"><span class="label">Ciudades</span><span class="value">3</span></div></div>
      <div class="card" data-anim data-anim-delay="240"><div class="stat"><span class="label">Jornada</span><span class="value">42 h</span></div></div>
    </div></section>
    <section class="section container stack home-jobs"><div class="row between"><h2 style="margin:0">Empleos destacados</h2><a href="#/empleos">Ver todos →</a></div>
      <div class="job-list">${open.slice(0, 4).map(j => jobCard(j, depts)).join('') || '<div class="card empty">No hay vacantes publicadas en este momento.</div>'}</div></section>
    <section class="container home-about"><div class="grid-2">
      <div class="card" data-anim><span class="eyebrow">Quiénes somos</span><h2 style="margin-top:6px">Grupo Cordillera</h2><p>${escape(site.about || '')}</p><div class="row gap-sm">${(site.values || []).map(v => `<span class="badge badge-primary">${escape(v)}</span>`).join('')}</div></div>
      <div class="card" data-anim><span class="eyebrow">Beneficios</span><h2 style="margin-top:6px">Lo que te ofrecemos</h2><div class="benefit-grid">${(site.benefits || []).map((b, i) => `<div class="benefit"><span class="ico" aria-hidden="true">${['🩺', '⏱️', '🎂', '🎓', '🏡', '🎁', '⭐', '🚌'][i % 8]}</span><span>${escape(b)}</span></div>`).join('')}</div></div>
    </div></section>
    <section class="section container home-cta"><div class="card row between" data-anim><div><h2 style="margin:0">¿No encuentras tu cargo?</h2><p class="muted" style="margin:6px 0 0">Escríbenos a <a href="mailto:${escape(site.contact || '')}">${escape(site.contact || '')}</a> con tu CV y te consideraremos para futuros procesos.</p></div><a class="btn btn-accent" href="#/empleos">Explorar empleos</a></div></section>`;
}
export { money };
