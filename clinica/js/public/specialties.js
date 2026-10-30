import { escape, money } from '../../../assets/core/ui.js';
import { activeSpecialties, activeDoctors, specialty } from '../shared/domain.js';
import { icon } from '../shared/icons.js';
import { specCard, docCard } from './home.js';

export function renderSpecialties(el) {
  const specs = activeSpecialties();
  el.innerHTML = `<section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Especialidades</span><h1>Encuentra a tu especialista</h1><p class="muted mb0">${specs.length} especialidades con atención presencial y, en varias, por telemedicina.</p></div>
    <a class="btn btn-primary" href="#/reservar">${icon('calendar', 16)} Reservar hora</a></div>
    <div class="grid-auto">${specs.map(specCard).join('')}</div>
  </div></section>`;
}

export function renderSpecialty(el, { id }) {
  const s = specialty(id);
  if (!s || s.active === false) { el.innerHTML = `<section class="section"><div class="container empty"><h1>Especialidad no disponible</h1><a class="btn" href="#/especialidades">Ver especialidades</a></div></section>`; return; }
  const docs = activeDoctors(id);
  el.innerHTML = `<section class="section"><div class="container stack">
    <a href="#/especialidades" class="small">${icon('back', 14)} Todas las especialidades</a>
    <div class="card row" data-anim style="align-items:flex-start">
      <span class="icon-bubble" style="width:64px;height:64px">${icon(s.icon, 32)}</span>
      <div class="grow" style="min-width:240px"><h1 class="mb0">${escape(s.name)}</h1><p class="muted">${escape(s.desc)}</p>
      <div class="tag-list"><span class="badge badge-success">Fonasa ${money(s.prices.fonasa)}</span><span class="badge badge-primary">Isapre ${money(s.prices.isapre)}</span><span class="badge">Particular ${money(s.prices.particular)}</span></div></div>
      <a class="btn btn-primary" href="#/reservar?esp=${s.id}">Reservar en ${escape(s.name)}</a>
    </div>
    <h2>Profesionales</h2>
    ${docs.length ? `<div class="grid-auto">${docs.map(docCard).join('')}</div>` : '<div class="card empty">Pronto tendremos profesionales en esta especialidad.</div>'}
  </div></section>`;
}
