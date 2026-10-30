import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { branch, discipline } from '../shared/domain.js';

export function renderTrainers(el) {
  const list = db.query('trainers', t => t.active !== false);
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="section-head" data-anim><div><span class="eyebrow">Equipo</span><h1 class="mb0">Entrenadores Titán</h1><p class="muted mb0">Certificados, apasionados y listos para armar tu plan.</p></div></div>
    <div class="grid-auto">${list.map(t => `<article class="card hover trainer-card">
      <span class="avatar" style="--av:${t.color}">${escape(initials(t.name))}</span><h3 class="mb0">${escape(t.name)}</h3>
      <span class="muted small">Sede ${escape(branch(t.branchId)?.name || '')} · ${escape(t.instagram || '')}</span>
      <div class="tag-list" style="justify-content:center">${t.specialties.map(s => `<span class="badge badge-primary">${escape(discipline(s)?.name || s)}</span>`).join('')}</div>
      <p>${escape(t.bio)}</p><span class="small muted">${db.count('classes', c => c.trainerId === t.id && c.active !== false)} clases por semana</span></article>`).join('')}</div>
  </div></section>`;
}
