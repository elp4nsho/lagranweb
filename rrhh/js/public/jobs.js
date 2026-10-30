// Listado de vacantes con filtros por área, ciudad, modalidad y búsqueda.
import { escape, money, ago } from '../../../assets/core/ui.js';
import { norm } from '../shared/util.js';

const f = { q: '', dept: '', loc: '', mod: '' };
export const jobCard = (j, depts) => `<a class="card hover job-card" href="#/empleos/${j.id}">
  <div><h3>${escape(j.title)}</h3><div class="meta"><span class="badge plain">🏢 ${escape(depts[j.deptId]?.name || '')}</span><span class="badge plain">📍 ${escape(j.location)}</span><span class="badge badge-info">${escape(j.modality)}</span><span class="badge plain">${escape(j.type)}</span></div></div>
  <div style="text-align:right"><b>${money(j.salaryMin)} – ${money(j.salaryMax)}</b><div class="muted small">bruto mensual · ${escape(ago(j.publishedAt + 'T12:00'))}</div></div></a>`;

export function render(el, ctx, _p, q = {}) {
  const { db } = ctx;
  const depts = Object.fromEntries(db.all('departments').map(d => [d.id, d]));
  const all = db.query('jobs', j => j.status === 'publicada');
  const locs = [...new Set(all.map(j => j.location))].sort(), mods = [...new Set(all.map(j => j.modality))].sort();
  const paint = () => {
    const list = all.filter(j => (!f.dept || j.deptId === f.dept) && (!f.loc || j.location === f.loc) && (!f.mod || j.modality === f.mod) && (!f.q || norm(`${j.title} ${j.description} ${j.requirements.join(' ')}`).includes(norm(f.q)))).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    el.querySelector('[data-count]').textContent = `${list.length} vacante${list.length === 1 ? '' : 's'}`;
    const box = el.querySelector('[data-list]');
    box.innerHTML = list.map(j => jobCard(j, depts)).join('') || '<div class="card empty"><span class="icon">🔍</span>No hay vacantes con esos filtros.</div>';
    box.querySelectorAll('.card').forEach(c => { c.__lgw = 1; });
  };
  el.innerHTML = `<section class="container section stack jobs-page" style="padding-top:32px">
    <div class="jobs-head"><span class="eyebrow">Empleos</span><h1 style="margin:6px 0">Encuentra tu próximo desafío</h1></div>
    <div class="card jobs-filters" style="padding:12px"><div class="row gap-sm" role="search">
      <input class="input" type="search" data-q placeholder="Cargo, palabra clave…" value="${escape(f.q)}" aria-label="Buscar empleo" style="flex:1 1 220px;width:auto">
      <select class="select" data-f="dept" aria-label="Área" style="flex:0 1 200px;width:auto"><option value="">Todas las áreas</option>${Object.values(depts).filter(d => all.some(j => j.deptId === d.id)).map(d => `<option value="${d.id}" ${f.dept === d.id ? 'selected' : ''}>${escape(d.name)}</option>`).join('')}</select>
      <select class="select" data-f="loc" aria-label="Ciudad" style="flex:0 1 170px;width:auto"><option value="">Todas las ciudades</option>${locs.map(l => `<option ${f.loc === l ? 'selected' : ''}>${escape(l)}</option>`).join('')}</select>
      <select class="select" data-f="mod" aria-label="Modalidad" style="flex:0 1 170px;width:auto"><option value="">Toda modalidad</option>${mods.map(m => `<option ${f.mod === m ? 'selected' : ''}>${escape(m)}</option>`).join('')}</select>
    </div></div>
    <p class="muted jobs-count" data-count style="margin:0"></p>
    <div class="job-list" data-list></div></section>`;
  paint();
  el.querySelector('[data-q]').addEventListener('input', e => { f.q = e.target.value; paint(); });
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { f[s.dataset.f] = s.value; paint(); }));
}
