// Documentos imprimibles: informe de exámenes (PDF simulado) y receta médica.
import { escape, modal, date as fmtDate } from '../../../assets/core/ui.js';
import { settings, doctor, specialty, patient, ageOf } from './domain.js';
import { fmtDay } from './dates.js';
import { icon } from './icons.js';

function docShell(title, filename, inner) {
  const m = modal({ title, size: 'lg', body: `<div class="pdf-bar no-print"><span>${icon('file', 16)} <b>${escape(filename)}</b> · 1 página</span><span class="row" style="gap:6px"><button class="btn btn-sm" data-print>${icon('print', 14)} Imprimir</button><button class="btn btn-sm btn-primary" data-dl>${icon('download', 14)} Descargar PDF</button></span></div><article class="paper print-area">${inner}</article>` });
  const print = () => window.print();
  m.el.querySelector('[data-print]').onclick = print;
  m.el.querySelector('[data-dl]').onclick = print; // "Guardar como PDF" desde el diálogo de impresión
  return m;
}
const letterhead = (right) => { const s = settings(); return `<header><div><b style="font:var(--head-weight) 20px var(--font-head)">${escape(s.name)}</b><br><small>${escape(s.address)} · ${escape(s.phone)}</small></div><div style="text-align:right"><small>${right}</small></div></header>`; };

export function openExam(e) {
  const p = patient(e.patientId), d = doctor(e.doctorId);
  docShell('Informe de laboratorio', `informe-${e.folio}.pdf`, `${letterhead(`Folio <b>${escape(e.folio)}</b><br>Emitido ${escape(fmtDate(e.date))}`)}
    <h3 style="margin-bottom:6px">${escape(e.type)}</h3>
    <p class="small">Paciente: <b>${escape(p?.name)}</b> · RUT ${escape(p?.rut)} · ${ageOf(p?.birth)} años<br>Solicitado por: ${escape(d?.name || '—')}</p>
    <div class="table-wrap" style="box-shadow:none"><table class="table"><thead><tr><th>Examen</th><th>Resultado</th><th>Unidad</th><th>Valor de referencia</th></tr></thead><tbody>
    ${e.values.map(v => `<tr><td>${escape(v.name)}</td><td class="${v.flag ? 'flag-' + v.flag : ''}">${String(v.value).replace('.', ',')} ${v.flag ? (v.flag === 'alto' ? '▲' : '▼') : ''}</td><td>${escape(v.unit)}</td><td>${escape(v.ref)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="small muted" style="margin-top:12px">▲▼ Valores fuera del rango de referencia. Interprete estos resultados junto a su médico tratante.</p>
    <div class="sign"><div>T.M. Laboratorio Clínico Alerce<br>Validado electrónicamente</div></div>`);
}

export function openRx(r) {
  const p = patient(r.patientId), d = doctor(r.doctorId);
  docShell('Receta médica', `receta-${r.id}.pdf`, `${letterhead(`Fecha ${escape(fmtDay(r.date, { day: '2-digit', month: 'long', year: 'numeric' }))}`)}
    <h3 style="margin-bottom:6px">Receta médica</h3>
    <p class="small">Paciente: <b>${escape(p?.name)}</b> · RUT ${escape(p?.rut)} · ${ageOf(p?.birth)} años</p>
    ${r.diagnosis?.length ? `<p class="small">Diagnóstico: ${r.diagnosis.map(x => `${escape(x.code)} ${escape(x.name)}`).join('; ')}</p>` : ''}
    <ol style="padding-left:20px">${(r.prescription || []).map(x => `<li style="margin-bottom:10px"><b>${escape(x.drug)}</b><br>${escape(x.dose)} ${escape(x.freq)} por ${escape(x.days)} días</li>`).join('') || '<li>Sin medicamentos</li>'}</ol>
    ${r.indications ? `<p class="small"><b>Indicaciones:</b> ${escape(r.indications)}</p>` : ''}
    <div class="sign"><div>${escape(d?.name)}<br>${escape(specialty(d?.specialtyId)?.name || '')} · RUT ${escape(d?.rut || '')}</div></div>`);
}
