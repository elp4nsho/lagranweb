// Certificado de curso (solo tokens: se adapta al estilo activo).
import { escape, date } from '../../../assets/core/ui.js';
import { getCourse, getUser, courseMinutes, fmtHours } from '../data/model.js';
import { brandHTML } from './bits.js';

export function certificateHTML(cert) {
  const c = getCourse(cert.courseId) || { title: 'Curso eliminado' }, u = getUser(cert.userId), inst = getUser(c.instructorId);
  return `<article class="certificate" aria-label="Certificado">
    ${brandHTML()}
    <p class="k">Certificado de finalización</p>
    <p style="margin:6px 0">Se certifica que</p>
    <p class="name">${escape(u?.name || '—')}</p>
    <p style="margin:6px auto;max-width:60ch">completó satisfactoriamente el curso online <b>«${escape(c.title)}»</b>${c.sections ? ` (${fmtHours(courseMinutes(c))} de contenido)` : ''}.</p>
    <div class="foot"><div class="sig"><b>${escape(inst?.name || 'Academia Faro')}</b>Instructor(a)</div><div class="seal">ACADEMIA<br>FARO<br>✓</div><div class="sig"><b>${date(cert.issuedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</b>Código <code>${escape(cert.code)}</code></div></div>
  </article>`;
}
