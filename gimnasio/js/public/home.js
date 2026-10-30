import { escape, money } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { settings, activePlans, activeBranches, discipline, trainer, branch, classesOn, occupancy, classStart } from '../shared/domain.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';
import { heroArt } from './art.js';
import { planCard } from './plans.js';

export function renderHome(el) {
  const s = settings(), plans = activePlans(), branches = activeBranches();
  const upcoming = classesOn(ymd()).filter(c => classStart(c, ymd()) > new Date()).slice(0, 6);
  const discs = db.query('disciplines', d => d.active !== false);
  el.innerHTML = `
  <section class="hero hero-gym"><div class="container hero-grid">
    <div data-anim>
      <span class="eyebrow">${escape(s.tagline)}</span>
      <h1>${escape(s.heroTitle)}</h1>
      <p class="lead">${escape(s.heroText)}</p>
      <div class="row"><a class="btn btn-primary btn-lg" href="#/planes">${icon('fire', 18)} Ver planes</a><a class="btn btn-lg" href="#/horario">${icon('calendar', 18)} Horario de clases</a></div>
      <div class="promo-strip"><span class="badge badge-success">Sin contrato de permanencia</span><span class="badge badge-primary">${branches.length} sedes</span><span class="badge badge-info">${db.count('classes')} clases semanales</span></div>
    </div>
    <div class="hero-art" data-anim data-anim-delay="150">${heroArt()}</div>
  </div></section>

  <section class="section tight"><div class="container grid-4">
    <div class="card stat" data-anim><span class="label">Socios activos</span><span class="value">${db.count('members', m => m.status === 'activo').toLocaleString('es-CL')}</span><span class="muted small">y creciendo</span></div>
    <div class="card stat" data-anim data-anim-delay="80"><span class="label">Disciplinas</span><span class="value">${discs.length}</span><span class="muted small">de spinning a yoga</span></div>
    <div class="card stat" data-anim data-anim-delay="160"><span class="label">Entrenadores</span><span class="value">${db.count('trainers', t => t.active !== false)}</span><span class="muted small">certificados</span></div>
    <div class="card stat" data-anim data-anim-delay="240"><span class="label">Desde</span><span class="value">${money(Math.min(...plans.map(p => p.monthly)))}</span><span class="muted small">al mes</span></div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Planes</span><h2>Elige cómo quieres entrenar</h2></div><a class="btn btn-ghost" href="#/planes">Comparar planes ${icon('arrow', 16)}</a></div>
    <div class="plans">${plans.map(p => planCard(p, 'mensual')).join('')}</div>
  </div></section>

  <section class="section tight"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Hoy en Titán</span><h2>Próximas clases</h2></div><a class="btn btn-ghost" href="#/horario">Horario completo ${icon('arrow', 16)}</a></div>
    <div class="grid-3">${upcoming.map(c => { const d = discipline(c.disciplineId), o = occupancy(c, ymd()); return `<div class="card cls" style="--c:${d.color}"><small class="mono">${c.time} · ${escape(branch(c.branchId)?.name)}</small><b>${escape(d.name)}</b><small>${escape(trainer(c.trainerId)?.name)} · ${o.free ? o.free + ' cupos' : 'Llena'}</small></div>`; }).join('') || '<div class="card empty" style="grid-column:1/-1">No quedan clases hoy. ¡Mañana partimos a las 07:00!</div>'}</div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Disciplinas</span><h2>Clases para todos los niveles</h2></div></div>
    <div class="grid-4">${discs.map(d => `<div class="card hover stack" style="gap:8px"><span class="icon-bubble">${icon(d.icon, 22)}</span><h3 class="mb0">${escape(d.name)}</h3><p class="muted small mb0">${escape(d.desc)}</p><span class="small">Intensidad ${'●'.repeat(d.intensity)}${'○'.repeat(3 - d.intensity)}</span></div>`).join('')}</div>
  </div></section>

  <section class="section tight"><div class="container grid-2">
    ${branches.slice(0, 2).map(b => `<div class="card stack" data-anim><span class="eyebrow">Sede ${escape(b.name)}</span><h3 class="mb0">${escape(b.address)}, ${escape(b.commune)}</h3><p class="muted mb0">Lun a vie ${escape(b.hours.semana)} · Sáb ${escape(b.hours.sabado)}</p><div class="tag-list">${b.amenities.map(a => `<span class="badge plain">${escape(a)}</span>`).join('')}</div></div>`).join('')}
  </div></section>`;
}
