// Consulta de resultados de exámenes con RUT + folio.
import { escape, toast, date as fmtDate } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { patient } from '../shared/domain.js';
import { sameRut, fmtRut } from '../shared/rut.js';
import { openExam } from '../shared/docs.js';
import { icon } from '../shared/icons.js';

let found = null;
export function examRow(e) {
  return `<div class="appt-item"><span class="icon-bubble">${icon('flask', 20)}</span><div class="info"><b>${escape(e.type)}</b><span class="muted small">Folio ${escape(e.folio)} · ${escape(fmtDate(e.date))} · ${escape(patient(e.patientId)?.name)}</span></div>
    ${e.status === 'disponible' ? `<span class="badge badge-success">Disponible</span><button class="btn btn-sm btn-primary" data-exam="${e.id}">${icon('file', 14)} Ver PDF</button>` : `<span class="badge badge-warning">En proceso</span>`}</div>`;
}
export function wireExams(root) { root.querySelectorAll('[data-exam]').forEach(b => b.onclick = () => openExam(db.get('exams', b.dataset.exam))); }

export function renderResults(el) {
  el.innerHTML = `<section class="section"><div class="container stack" style="max-width:820px">
    <div data-anim><span class="eyebrow">Laboratorio</span><h1 class="mb0">Resultados de exámenes</h1><p class="muted">Ingresa el RUT del paciente y el folio que aparece en tu comprobante de toma de muestra.</p></div>
    <form class="card stack" novalidate>
      <div class="grid-2">
        <div class="field"><label for="r-rut">RUT del paciente</label><input class="input" id="r-rut" name="rut" placeholder="12.345.678-5"></div>
        <div class="field"><label for="r-folio">Folio</label><input class="input" id="r-folio" name="folio" inputmode="numeric" placeholder="480120"></div>
      </div>
      <div class="row between"><button class="btn btn-primary" type="submit">${icon('search', 16)} Consultar</button><span class="muted small">Demo: RUT <b>16.543.210-K</b> · folio <b>480120</b>, 480157 o 480194</span></div>
    </form>
    <div data-out></div>
  </div></section>`;
  const f = el.querySelector('form'), out = el.querySelector('[data-out]');
  f.elements.rut.addEventListener('blur', e => { if (e.target.value) e.target.value = fmtRut(e.target.value); });
  const show = () => { if (!found) { out.innerHTML = ''; return; } out.innerHTML = `<div class="card">${examRow(db.get('exams', found.id))}${found.status !== 'disponible' ? '<p class="muted small mb0">Te avisaremos por correo cuando el informe esté validado (normalmente 24 a 48 horas hábiles).</p>' : ''}</div>`; wireExams(out); };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const ex = db.find('exams', x => x.folio === f.elements.folio.value.trim());
    if (!ex || !sameRut(patient(ex.patientId)?.rut, f.elements.rut.value)) { found = null; show(); return toast('No encontramos resultados con esos datos', 'error'); }
    found = ex; show();
  });
  show();
}
