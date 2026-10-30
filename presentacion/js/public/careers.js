// Carreras: ofertas abiertas y postulación.
import { escape, ago, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { sectionHead } from './layout.js';
import { validate, readForm } from '../shared/admin-kit.js';

const openJobs = () => db.query('jobs', j => j.status === 'open').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function renderCareers(el) {
  const jobs = openJobs();
  const areas = [...new Set(jobs.map(j => j.area))];
  let area = 'all';
  el.innerHTML = `<section class="section page-top"><div class="container">
    ${sectionHead('Carreras', 'Trabaja en Nébula', 'Equipos pequeños, proyectos con sentido, horarios humanos y viernes de aprendizaje.')}
    <div class="grid-4 perks">${[['🌊', 'Oficina frente al mar', 'Cerro Alegre, con terraza y café de especialidad.'], ['🏡', 'Modalidad híbrida', 'Tres días en el estudio, dos donde quieras.'], ['📚', 'Viernes de aprendizaje', 'Presupuesto anual para cursos y conferencias.'], ['🌴', 'Vacaciones extra', 'Cinco días adicionales y tu cumpleaños libre.']].map(([i, t, d]) => `<div class="card perk"><span class="service-ico">${i}</span><h3>${t}</h3><p class="muted small">${d}</p></div>`).join('')}</div>
    <div class="row filters" style="gap:8px;margin:40px 0 16px"><button class="chip active" data-area="all">Todas (${jobs.length})</button>${areas.map(a => `<button class="chip" data-area="${escape(a)}">${escape(a)}</button>`).join('')}</div>
    <div class="stack" data-list></div>
  </div></section>`;
  const list = el.querySelector('[data-list]');
  const draw = () => {
    el.querySelectorAll('[data-area]').forEach(b => b.classList.toggle('active', b.dataset.area === area));
    const l = jobs.filter(j => area === 'all' || j.area === area);
    list.innerHTML = l.length ? l.map(j => `<a class="card hover job-row" href="#/carreras/${escape(j.slug)}">
      <div><h3>${escape(j.title)}</h3><p class="muted small">${escape(j.area)} · ${escape(j.location)} · ${escape(j.modality)}</p></div>
      <div class="row" style="gap:8px"><span class="badge badge-primary">${escape(j.type)}</span><span class="small muted">Publicada ${ago(j.createdAt)}</span><span aria-hidden="true">→</span></div></a>`).join('')
      : `<div class="empty card">No hay ofertas abiertas en esta área. Escríbenos igual a ${escape(db.getValue('settings').email)}.</div>`;
  };
  el.querySelector('.filters').addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) { area = b.dataset.area; draw(); } });
  draw();
}

export function renderJob(el, slugId) {
  const j = db.find('jobs', x => x.slug === slugId && x.status !== 'draft');
  if (!j) { el.innerHTML = `<section class="section page-top"><div class="container empty"><h2>Oferta no disponible</h2><a class="btn btn-primary" href="#/carreras">Ver ofertas</a></div></section>`; return null; }
  const closed = j.status !== 'open';
  el.innerHTML = `<section class="section page-top"><div class="container job-layout">
    <div class="stack">
      <a class="small" href="#/carreras">← Todas las ofertas</a>
      <span class="eyebrow">${escape(j.area)}</span><h1>${escape(j.title)}</h1>
      <div class="row" style="gap:8px"><span class="badge">${escape(j.location)}</span><span class="badge">${escape(j.modality)}</span><span class="badge badge-primary">${escape(j.type)}</span><span class="badge badge-success">${escape(j.salary)}</span></div>
      <p class="lead">${escape(j.description)}</p>
      <h3>Lo que buscamos</h3><ul class="checklist">${(j.requirements || []).map(r => `<li>${escape(r)}</li>`).join('')}</ul>
    </div>
    <aside class="card apply-card">
      ${closed ? `<div class="empty"><h3>Postulaciones cerradas</h3><p>Esta oferta ya no recibe postulaciones.</p></div>` : `
      <h3>Postula a este cargo</h3>
      <form class="stack" data-apply novalidate>
        <div class="field"><label for="ap-name">Nombre completo *</label><input class="input" id="ap-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="ap-email">Correo *</label><input class="input" id="ap-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="ap-phone">Teléfono</label><input class="input" id="ap-phone" name="phone" type="tel" placeholder="+56 9 …"></div>
        <div class="field"><label for="ap-port">Portafolio o LinkedIn *</label><input class="input" id="ap-port" name="portfolio" required placeholder="behance.net/tu-nombre"></div>
        <div class="field"><label for="ap-cv">CV (PDF, simulado)</label><input class="input" id="ap-cv" name="cv" type="file" accept=".pdf"></div>
        <div class="field"><label for="ap-msg">¿Por qué Nébula?</label><textarea class="textarea" id="ap-msg" name="message" rows="4"></textarea></div>
        <label class="check"><input type="checkbox" name="ok" required> Acepto el tratamiento de mis datos para este proceso.</label>
        <button class="btn btn-primary btn-block">Enviar postulación</button>
      </form>`}
    </aside>
  </div></section>`;
  const form = el.querySelector('[data-apply]');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(form)) return;
    const v = readForm(form);
    const cvFile = form.cv.files[0]?.name || '';
    db.insert('applications', { jobId: j.id, name: v.name, email: v.email, phone: v.phone, portfolio: v.portfolio, message: v.message, cv: cvFile, status: 'nuevo', rating: 0, notes: [] });
    db.log('postulación', `${v.name} postuló a ${j.title}`);
    form.closest('.apply-card').innerHTML = `<div class="empty success-box"><span class="icon">✓</span><h3>¡Postulación recibida!</h3><p>Gracias, ${escape(v.name.split(' ')[0])}. Revisamos todas las postulaciones y respondemos en un plazo de 10 días hábiles.</p><a class="btn" href="#/carreras">Ver otras ofertas</a></div>`;
    toast('Postulación enviada', 'success');
  });
  return j.title;
}
