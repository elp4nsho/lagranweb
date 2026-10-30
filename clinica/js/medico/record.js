// Ficha clínica de la atención: anamnesis, examen, diagnóstico CIE-10, indicaciones y receta.
import { escape, toast, norm, date as fmtDate, time as fmtTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { CIE10, DRUGS } from '../data/catalog.js';
import { patient, statusBadge, setStatus, prevision, ageOf, isActive, firstName } from '../shared/domain.js';
import { openRx } from '../shared/docs.js';
import { pageHead } from '../shared/shell.js';
import { fmtDay, ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderRecord(v, { id }, _, { doc, user }) {
  let a = db.get('appointments', id);
  if (!a || a.doctorId !== doc.id) { v.innerHTML = '<div class="card empty">Atención no encontrada en tu agenda. <a href="#/">Volver</a></div>'; return; }
  const p = patient(a.patientId);
  if (['en_espera', 'llamado'].includes(a.status) || (['reservada', 'confirmada'].includes(a.status) && a.date === ymd())) a = setStatus(a, 'en_atencion');
  let rec = db.find('records', r => r.appointmentId === a.id);
  const draft = rec ? JSON.parse(JSON.stringify(rec)) : { anamnesis: '', exam: '', diagnosis: [], indications: '', prescription: [] };
  const history = db.query('records', r => r.patientId === p.id && r.appointmentId !== a.id).sort((x, y) => y.date.localeCompare(x.date));
  const closed = a.status === 'atendida';
  v.innerHTML = `${pageHead(`Ficha · ${p.name}`, `<a href="#/">${icon('back', 14)} Agenda</a> · <span style="text-transform:capitalize">${escape(fmtDay(a.date))}</span> ${a.time} · ${a.mode === 'tele' ? 'Telemedicina' : 'Presencial'} · ${statusBadge(a.status)}`,
    `<button class="btn" data-save>${icon('check', 16)} Guardar borrador</button><button class="btn" data-rx>${icon('print', 16)} Receta</button>${!closed ? `<button class="btn btn-primary" data-finish>${icon('check', 16)} Finalizar atención</button>` : ''}`)}
  <div class="grid-main">
    <form class="stack" novalidate data-form>
      <div class="card stack"><h3 class="mb0">Anamnesis</h3>
        <div class="field"><label for="f-an">Motivo de consulta e historia actual</label><textarea class="textarea" id="f-an" name="anamnesis" placeholder="${escape(a.reason || 'Motivo de consulta…')}">${escape(draft.anamnesis)}</textarea></div>
        <div class="field"><label for="f-ex">Examen físico / signos vitales</label><input class="input" id="f-ex" name="exam" value="${escape(draft.exam)}" placeholder="PA 120/80 mmHg · FC 72 lpm · T° 36,5 °C · Sat 98%"></div></div>
      <div class="card stack"><h3 class="mb0">Diagnóstico (CIE-10)</h3>
        <div class="tag-list" data-dx></div>
        <label class="search-box" style="max-width:none">${icon('search', 16)}<input class="input" data-cie placeholder="Buscar código o diagnóstico (ej: J00, hipertensión)…" aria-label="Buscar CIE-10"></label>
        <div class="cie-list" data-cielist></div></div>
      <div class="card stack"><h3 class="mb0">Indicaciones</h3><textarea class="textarea" name="indications" placeholder="Reposo, dieta, controles, exámenes solicitados…">${escape(draft.indications)}</textarea></div>
      <div class="card stack"><div class="card-title"><h3>Receta</h3><button type="button" class="btn btn-sm" data-addrx>${icon('plus', 14)} Agregar medicamento</button></div>
        <datalist id="drugs">${DRUGS.map(d => `<option value="${escape(d)}"></option>`).join('')}</datalist>
        <div class="stack" style="gap:8px" data-rxrows></div></div>
    </form>
    <aside class="stack">
      <div class="card"><h3>${escape(p.name)}</h3><p class="muted small">${escape(p.rut)} · ${ageOf(p.birth)} años · ${escape(prevision(p.prevision).label)}</p>
        <div class="tag-list">${p.allergies ? `<span class="badge badge-danger">Alergia: ${escape(p.allergies)}</span>` : '<span class="badge badge-success">Sin alergias conocidas</span>'}${p.chronic ? `<span class="badge">${escape(p.chronic)}</span>` : ''}</div></div>
      ${a.mode === 'tele' ? `<div class="card chat"><div class="card-title"><h3>${icon('video', 18)} Sala virtual</h3><span class="badge badge-danger"><span class="pulse-dot"></span> En vivo</span></div><div class="chat-log" data-log style="max-height:260px"></div>
        <form class="chat-form" data-chat><input class="input" name="t" placeholder="Mensaje al paciente…" aria-label="Mensaje"><button class="btn btn-primary btn-icon" aria-label="Enviar">${icon('arrow', 16)}</button></form></div>` : ''}
      <div class="card"><h3>Atenciones anteriores</h3>${history.map(r => `<div style="margin-bottom:12px"><b class="small">${escape(fmtDate(r.date))}</b> <span class="muted small">· ${escape(db.get('doctors', r.doctorId)?.name || '')}</span><br><span class="small">${r.diagnosis.map(x => `<code>${escape(x.code)}</code> ${escape(x.name)}`).join(', ')}</span><br><span class="small muted">${escape(r.indications)}</span></div>`).join('') || '<p class="muted mb0">Primera atención en el centro.</p>'}</div>
    </aside>
  </div>`;
  const form = v.querySelector('[data-form]');
  const drawDx = () => {
    v.querySelector('[data-dx]').innerHTML = draft.diagnosis.map((x, i) => `<span class="chip active">${escape(x.code)} · ${escape(x.name)} <button type="button" class="btn btn-ghost btn-sm" style="min-height:20px;padding:0 4px;color:inherit" data-rmdx="${i}" aria-label="Quitar">✕</button></span>`).join('') || '<span class="muted small">Sin diagnóstico seleccionado</span>';
    v.querySelectorAll('[data-rmdx]').forEach(b => b.onclick = () => { draft.diagnosis.splice(+b.dataset.rmdx, 1); drawDx(); });
  };
  const drawCie = q => {
    const l = CIE10.filter(([c, n]) => !q || norm(c + ' ' + n).includes(norm(q))).slice(0, 8);
    v.querySelector('[data-cielist]').innerHTML = l.map(([c, n]) => `<button type="button" data-c="${c}"><code>${c}</code>${escape(n)}</button>`).join('') || '<span class="muted small">Sin coincidencias</span>';
    v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const it = CIE10.find(x => x[0] === b.dataset.c); if (!draft.diagnosis.some(x => x.code === it[0])) draft.diagnosis.push({ code: it[0], name: it[1] }); drawDx(); });
  };
  const drawRx = () => {
    const box = v.querySelector('[data-rxrows]');
    box.innerHTML = draft.prescription.map((x, i) => `<div class="rx-row" data-i="${i}">
      <input class="input" list="drugs" data-k="drug" value="${escape(x.drug)}" placeholder="Medicamento" aria-label="Medicamento">
      <input class="input" data-k="dose" value="${escape(x.dose)}" placeholder="Dosis" aria-label="Dosis">
      <input class="input" data-k="freq" value="${escape(x.freq)}" placeholder="Frecuencia" aria-label="Frecuencia">
      <input class="input" type="number" min="1" data-k="days" value="${x.days}" aria-label="Días">
      <button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="${i}" aria-label="Quitar">${icon('trash', 16)}</button></div>`).join('') || '<span class="muted small">Sin medicamentos indicados.</span>';
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { draft.prescription.splice(+b.dataset.rm, 1); drawRx(); });
    box.oninput = e => { const r = e.target.closest('[data-i]'); if (r) draft.prescription[+r.dataset.i][e.target.dataset.k] = e.target.dataset.k === 'days' ? +e.target.value : e.target.value; };
  };
  drawDx(); drawCie(''); drawRx();
  v.querySelector('[data-cie]').addEventListener('input', e => drawCie(e.target.value));
  v.querySelector('[data-addrx]').onclick = () => { draft.prescription.push({ drug: '', dose: '1 comprimido', freq: 'cada 8 horas', days: 7 }); drawRx(); };
  const save = () => {
    draft.anamnesis = form.anamnesis.value.trim(); draft.exam = form.exam.value.trim(); draft.indications = form.indications.value.trim();
    draft.prescription = draft.prescription.filter(x => x.drug.trim());
    const data = { ...draft, appointmentId: a.id, patientId: p.id, doctorId: doc.id, date: a.date };
    rec = rec ? db.update('records', rec.id, data) : db.insert('records', data);
    return rec;
  };
  v.querySelector('[data-save]').onclick = () => { save(); db.log('ficha', `Borrador guardado · ${p.name}`, user.id); toast('Ficha guardada', 'success'); };
  v.querySelector('[data-rx]').onclick = () => { const r = save(); if (!r.prescription.length) return toast('Agrega al menos un medicamento a la receta', 'warning'); openRx(r); };
  v.querySelector('[data-finish]')?.addEventListener('click', () => {
    if (!draft.diagnosis.length) return toast('Selecciona al menos un diagnóstico CIE-10', 'warning');
    if (!form.anamnesis.value.trim()) return toast('Completa la anamnesis', 'warning');
    save(); setStatus(db.get('appointments', a.id), 'atendida');
    db.log('ficha', `Atención finalizada · ${p.name} · ${draft.diagnosis.map(x => x.code).join(', ')}`, user.id);
    toast('Atención finalizada. Receta disponible en el portal del paciente.', 'success');
    location.hash = '#/';
  });
  // Chat de telemedicina en vivo con el paciente
  const log = v.querySelector('[data-log]');
  if (log) {
    const draw = () => { if (!document.body.contains(log)) return un(); const msgs = db.query('telechat', m => m.appointmentId === a.id).sort((x, y) => x.at.localeCompare(y.at)); log.innerHTML = msgs.map(m => `<div class="msg ${m.from === 'medico' ? 'me' : m.from === 'sistema' ? 'sys' : ''}">${m.from !== 'sistema' ? `<small>${escape(m.name)} · ${fmtTime(m.at)}</small>` : ''}${escape(m.text)}</div>`).join('') || '<div class="msg sys">El paciente aún no entra a la sala.</div>'; log.scrollTop = log.scrollHeight; };
    const un = db.subscribe(ch => ch.type !== 'log' && draw());
    draw();
    v.querySelector('[data-chat]').onsubmit = e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; db.insert('telechat', { appointmentId: a.id, from: 'medico', name: doc.name, text: t, at: new Date().toISOString() }); e.target.reset(); };
  }
}
