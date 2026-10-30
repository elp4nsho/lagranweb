// Página "Estudio": equipo, proceso, cifras y clientes.
import { escape, num } from '../../../assets/core/ui.js';
import { db, home, settings } from '../data/db.js';
import { sectionHead } from './layout.js';
import { teamCard } from './cards.js';

export function renderStudio(el) {
  const h = home(), s = settings();
  const team = db.query('team', t => t.active).sort((a, b) => a.order - b.order);
  const clients = db.query('clients', c => c.active).sort((a, b) => a.order - b.order);
  el.innerHTML = `
  <section class="section page-top"><div class="container about">
    <div data-anim><span class="eyebrow">El estudio</span><h1>${escape(h.about?.title)}</h1>
      ${String(h.about?.text || '').split(/\n+/).map(p => `<p class="lead">${escape(p)}</p>`).join('')}</div>
    <div class="card studio-facts" data-anim>
      ${(h.stats || []).map(st => `<div class="row between"><span class="muted">${escape(st.label)}</span><b class="h">${num(st.value)}${escape(st.suffix)}</b></div>`).join('<hr>')}
      <hr><div class="row between"><span class="muted">Dirección</span><b>${escape(s.address)}</b></div>
    </div>
  </div></section>
  <section class="section alt"><div class="container">
    ${sectionHead('Equipo', 'Las personas detrás del trabajo', `${team.length} personas, cero intermediarios.`)}
    <div class="grid-4 team-grid">${team.map(teamCard).join('')}</div>
  </div></section>
  <section class="section"><div class="container">
    ${sectionHead('Proceso', 'Cómo trabajamos')}
    <ol class="process">${(h.process || []).map((p, i) => `<li class="card process-step"><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${escape(p.title)}</h3><p class="muted">${escape(p.text)}</p><span class="badge badge-primary">${escape(p.duration)}</span></li>`).join('')}</ol>
  </div></section>
  <section class="section alt"><div class="container">
    ${sectionHead('Clientes', 'Marcas con las que hemos crecido')}
    <div class="client-grid">${clients.map(c => `<div class="card client-tile" data-anim>${escape(c.name)}</div>`).join('')}</div>
    <div class="row" style="margin-top:32px;justify-content:center"><a class="btn btn-primary btn-lg" href="#/carreras">Trabaja con nosotros</a><a class="btn btn-lg" href="#/contacto">Escríbenos</a></div>
  </div></section>`;
}
