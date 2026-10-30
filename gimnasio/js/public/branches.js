import { escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { activeBranches, trainer } from '../shared/domain.js';
import { icon } from '../shared/icons.js';

export function renderBranches(el) {
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="section-head" data-anim><div><span class="eyebrow">Sedes</span><h1 class="mb0">Encuentra tu Titán más cercano</h1></div></div>
    <div class="grid-2">${activeBranches().map(b => { const tr = db.query('trainers', t => t.branchId === b.id && t.active !== false); const n = db.count('classes', c => c.branchId === b.id && c.active !== false); return `<article class="card stack branch-card">
      <div class="row between"><h2 class="mb0">${escape(b.name)}</h2><span class="badge badge-primary">${n} clases/semana</span></div>
      <p class="mb0">${icon('pin', 16)} ${escape(b.address)}, ${escape(b.commune)}<br>${icon('phone', 16)} ${escape(b.phone)}</p>
      <div class="hours"><span class="muted">Lunes a viernes</span><b>${escape(b.hours.semana)}</b><span class="muted">Sábado</span><b>${escape(b.hours.sabado)}</b><span class="muted">Domingo y festivos</span><b>${escape(b.hours.domingo)}</b></div>
      <div class="tag-list">${b.amenities.map(a => `<span class="badge plain">${escape(a)}</span>`).join('')}</div>
      <p class="small muted mb0">Entrenadores: ${tr.map(t => escape(t.name)).join(', ') || '—'} · Aforo ${b.capacity} personas</p>
      <a class="btn" href="#/horario">${icon('calendar', 16)} Ver horario de ${escape(b.name)}</a></article>`; }).join('')}</div>
  </div></section>`;
}
