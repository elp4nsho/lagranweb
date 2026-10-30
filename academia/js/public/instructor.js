// Perfil público del instructor.
import { escape, num } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { getUser, isPublic, studentsCount, rating } from '../data/model.js';
import { courseCard } from '../shared/bits.js';

export function renderInstructor(view, id) {
  const u = getUser(id);
  if (!u || u.role !== 'instructor') { view.innerHTML = '<section class="page"><div class="container"><div class="card empty"><h2>Instructor no encontrado</h2><a class="btn btn-primary" href="#/">Inicio</a></div></div></section>'; return; }
  const cs = db.query('courses', c => c.instructorId === u.id && isPublic(c));
  const students = cs.reduce((t, c) => t + studentsCount(c.id), 0);
  const rs = cs.map(c => rating(c.id)).filter(r => r.count);
  const avg = rs.length ? rs.reduce((t, r) => t + r.avg * r.count, 0) / rs.reduce((t, r) => t + r.count, 0) : 0;
  view.innerHTML = `<section class="course-hero"><div class="container"><div class="instructor-box" data-anim><span class="avatar" style="--av:${u.color};--size:96px">${initials(u.name)}</span>
    <div><span class="eyebrow">Instructor</span><h1 style="margin:4px 0">${escape(u.name)}</h1><p class="lead" style="margin:0">${escape(u.headline || '')}</p>
    <div class="row" style="margin-top:12px"><span class="badge badge-primary">${num(students)} estudiantes</span><span class="badge badge-warning">★ ${avg.toFixed(1).replace('.', ',')} valoración</span><span class="badge badge-info">${cs.length} cursos</span></div></div></div></div></section>
    <section class="page"><div class="container stack"><div class="card"><h2 style="font-size:22px">Sobre mí</h2><p style="margin:0">${escape(u.bio || '')}</p></div>
    <h2 style="font-size:22px;margin:10px 0 0">Cursos de ${escape(u.name.split(' ')[0])}</h2><div class="grid-auto">${cs.map(courseCard).join('')}</div></div></section>`;
}
