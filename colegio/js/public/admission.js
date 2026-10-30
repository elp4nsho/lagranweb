// Admisión: proceso, formulario de postulación en línea y consulta de estado.
import { db } from '../data/db.js';
import { escape, date, dateTime, money, toast } from '../../../assets/core/ui.js';
import { formData } from '../shared/kit.js';
import { site } from '../shared/academic.js';
import { GRADES_APPLY, ADM_STATUS, ADM_FLOW } from '../shared/school.js';

export function renderAdmision(el) {
  const st = site();
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">Admisión ${st.admissionYear}</span><h1>Súmate a nuestra comunidad</h1>
    <p class="lead">${st.admissionsOpen ? 'El proceso de postulación está abierto. Postula en línea, adjunta los antecedentes y sigue el estado con tu código.' : 'El proceso de postulación está cerrado por ahora. Puedes dejarnos tus datos en contacto.'}</p>
    <div class="row">${st.admissionsOpen ? '<a class="btn btn-primary btn-lg" href="#/admision/postular">Postular en línea</a>' : '<span class="badge badge-danger">Postulaciones cerradas</span>'}<a class="btn btn-lg" href="#/admision/estado">Consultar estado</a></div></div></section>
  <section class="section" style="padding-top:24px"><div class="container stack">
    <h2 data-anim>¿Cómo es el proceso?</h2>
    <div class="steps">
      <div class="card step"><h3>Postulación en línea</h3><p class="muted mb-0">Completa el formulario con los datos del estudiante y del apoderado. Recibirás un código de seguimiento.</p></div>
      <div class="card step"><h3>Revisión de antecedentes</h3><p class="muted mb-0">Admisión revisa documentos: certificado de nacimiento, informe de notas o de personalidad.</p></div>
      <div class="card step"><h3>Entrevista familiar</h3><p class="muted mb-0">Conversamos con la familia para conocer sus expectativas y presentar el proyecto educativo.</p></div>
      <div class="card step"><h3>Resultados y matrícula</h3><p class="muted mb-0">Publicamos los resultados en esta página. Si eres aceptado, formalizas la matrícula.</p></div>
    </div>
    <div class="split" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>Vacantes ${st.admissionYear}</h3><span class="small muted">Actualizado por Dirección</span></div>
        <div class="vac-grid">${GRADES_APPLY.map(g => { const v = st.vacancies?.[g] ?? 0; return `<div class="vac"><span>${escape(g)}</span>${v ? `<span class="badge badge-success">${v}</span>` : '<span class="badge badge-danger">Sin cupos</span>'}</div>`; }).join('')}</div>
      </div>
      <div class="card stack" style="gap:10px"><h3 class="mb-0">Aranceles</h3>
        <dl class="dl"><dt>Matrícula</dt><dd>${money(st.enrollmentFee)}</dd><dt>Mensualidad</dt><dd>${money(st.monthlyFee)} <span class="muted small">× 10 cuotas</span></dd><dt>Becas</dt><dd>Socioeconómicas y por hermanos</dd></dl>
        <p class="small muted mb-0">Colegio adscrito a financiamiento compartido. Valores referenciales.</p>
      </div>
    </div>
  </div></section>`;
}

const empty = () => ({ step: 0, data: {} });
let wiz = empty();
export function renderPostular(el) {
  const st = site();
  if (!st.admissionsOpen) { el.innerHTML = `<section class="section"><div class="container"><div class="card empty"><h2>Postulaciones cerradas</h2><p>Vuelve a revisar las fechas del próximo proceso.</p><a class="btn btn-primary" href="#/admision">Volver</a></div></div></section>`; return; }
  const d = wiz.data;
  const steps = ['Estudiante', 'Apoderado', 'Confirmación'];
  const opt = (list, v) => list.map(g => `<option ${g === v ? 'selected' : ''}>${escape(g)}</option>`).join('');
  const bodies = [
    `<div class="form-grid">
      <div class="field full"><label for="a-name">Nombre completo del estudiante *</label><input class="input" id="a-name" name="studentName" required value="${escape(d.studentName || '')}"></div>
      <div class="field"><label for="a-rut">RUT *</label><input class="input" id="a-rut" name="rut" placeholder="12.345.678-9" required value="${escape(d.rut || '')}"></div>
      <div class="field"><label for="a-birth">Fecha de nacimiento *</label><input class="input" id="a-birth" name="birth" type="date" required value="${escape(d.birth || '')}"></div>
      <div class="field"><label for="a-grade">Curso al que postula *</label><select class="select" id="a-grade" name="grade">${opt(GRADES_APPLY, d.grade)}</select></div>
      <div class="field"><label for="a-prev">Establecimiento de origen</label><input class="input" id="a-prev" name="prevSchool" value="${escape(d.prevSchool || '')}"></div>
      <label class="check full"><input type="checkbox" name="siblings" ${d.siblings ? 'checked' : ''}> Tiene hermanos/as en el colegio</label>
    </div>`,
    `<div class="form-grid">
      <div class="field full"><label for="a-gname">Nombre del apoderado/a *</label><input class="input" id="a-gname" name="guardianName" required value="${escape(d.guardianName || '')}"></div>
      <div class="field"><label for="a-email">Correo *</label><input class="input" id="a-email" type="email" name="email" required value="${escape(d.email || '')}"></div>
      <div class="field"><label for="a-phone">Teléfono *</label><input class="input" id="a-phone" name="phone" placeholder="+56 9 1234 5678" required value="${escape(d.phone || '')}"></div>
      <div class="field full"><label for="a-reason">¿Por qué eligen Los Aromos?</label><select class="select" id="a-reason" name="reason">${opt(['Proyecto educativo', 'Cercanía al domicilio', 'Recomendación de otras familias', 'Talleres y deportes', 'Otro'], d.reason)}</select></div>
    </div>`,
    `<div class="stack"><p class="muted">Revisa los datos antes de enviar.</p>
      <dl class="dl"><dt>Estudiante</dt><dd>${escape(d.studentName)}</dd><dt>RUT</dt><dd>${escape(d.rut)}</dd><dt>Nacimiento</dt><dd>${d.birth ? date(d.birth + 'T12:00') : ''}</dd><dt>Curso</dt><dd>${escape(d.grade)} ${(st.vacancies?.[d.grade] ?? 0) ? '' : '<span class="badge badge-warning">Sin vacantes: quedará en lista de espera</span>'}</dd><dt>Apoderado/a</dt><dd>${escape(d.guardianName)}</dd><dt>Contacto</dt><dd>${escape(d.email)} · ${escape(d.phone)}</dd></dl>
      <label class="check"><input type="checkbox" name="accept" required> Declaro que la información es verídica y acepto el reglamento de admisión.</label></div>`
  ];
  el.innerHTML = `
  <section class="page-hero"><div class="container"><a class="small" href="#/admision">← Admisión</a><h1>Postulación ${st.admissionYear}</h1></div></section>
  <section class="section" style="padding-top:8px"><div class="container" style="max-width:760px">
    <form class="card stack" id="wiz" novalidate>
      <div class="wizard-steps">${steps.map((s, i) => `<span class="${i <= wiz.step ? 'on' : ''}">${i + 1}. ${s}</span>`).join('')}</div>
      ${bodies[wiz.step]}
      <div class="row between"><button type="button" class="btn btn-ghost" data-back ${wiz.step ? '' : 'disabled'}>← Atrás</button><button class="btn btn-primary" type="submit">${wiz.step < 2 ? 'Continuar →' : 'Enviar postulación'}</button></div>
    </form>
  </div></section>`;
  const f = el.querySelector('#wiz');
  f.querySelector('[data-back]').addEventListener('click', () => { Object.assign(wiz.data, formData(f)); wiz.step--; renderPostular(el); });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = formData(f);
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = i.type === 'checkbox' ? !i.checked : !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)) || (i.name === 'rut' && !/^[\d.]{7,10}-[\dkK]$/.test(i.value.trim())); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast(wiz.step === 2 ? 'Debes aceptar la declaración' : 'Revisa los campos marcados (RUT con guion, ej: 12.345.678-9)', 'warning');
    delete v.accept;
    Object.assign(wiz.data, v);
    if (wiz.step < 2) { wiz.step++; renderPostular(el); return; }
    const n = db.count('applications') + 101;
    const code = `ADM-${st.admissionYear}-${String(n).padStart(4, '0')}`;
    const now = new Date().toISOString();
    db.insert('applications', { ...wiz.data, code, status: 'recibida', score: null, interview: null, history: [{ status: 'recibida', at: now, note: 'Postulación recibida desde el sitio web.' }] });
    db.log('admision', `Nueva postulación ${code} (${wiz.data.grade})`);
    const rut = wiz.data.rut;
    wiz = empty();
    el.innerHTML = `<section class="section"><div class="container" style="max-width:640px"><div class="card stack" data-anim="bounceIn" style="text-align:center;align-items:center">
      <span class="tile-icon" style="--tone:var(--success)">✓</span><h2>¡Postulación enviada!</h2>
      <p>Tu código de seguimiento es</p><p class="big-num" data-code>${code}</p>
      <p class="muted">Guárdalo junto al RUT del estudiante para consultar el estado. Te enviaremos novedades a tu correo.</p>
      <a class="btn btn-primary" href="#/admision/estado?code=${encodeURIComponent(code)}&rut=${encodeURIComponent(rut)}">Ver estado</a></div></div></section>`;
  });
}

export function renderEstado(el, q = {}) {
  el.innerHTML = `
  <section class="page-hero"><div class="container"><a class="small" href="#/admision">← Admisión</a><h1>Estado de postulación</h1><p class="lead">Ingresa el código que recibiste y el RUT del estudiante.</p></div></section>
  <section class="section" style="padding-top:8px"><div class="container stack" style="max-width:760px">
    <form class="card" id="lookup" novalidate><div class="form-grid">
      <div class="field"><label for="l-code">Código</label><input class="input" id="l-code" name="code" placeholder="ADM-2027-0042" value="${escape(q.code || '')}" required></div>
      <div class="field"><label for="l-rut">RUT del estudiante</label><input class="input" id="l-rut" name="rut" placeholder="26.123.456-0" value="${escape(q.rut || '')}" required></div>
      <div class="full"><button class="btn btn-primary" type="submit">Consultar</button> <span class="small muted">Prueba con ADM-${site().admissionYear}-0042 y 26.123.456-0</span></div>
    </div></form>
    <div data-result></div>
  </div></section>`;
  const out = el.querySelector('[data-result]');
  const show = (code, rut) => {
    const clean = s => String(s || '').replace(/[.\s]/g, '').toUpperCase();
    const a = db.find('applications', x => x.code.toUpperCase() === code.trim().toUpperCase() && clean(x.rut) === clean(rut));
    if (!a) { out.innerHTML = `<div class="notice danger">No encontramos una postulación con esos datos. Revisa el código y el RUT.</div>`; return; }
    const [label, kind] = ADM_STATUS[a.status];
    const flow = a.status === 'espera' || a.status === 'rechazada' ? ['recibida', 'revision', 'entrevista', a.status] : ADM_FLOW;
    const reached = flow.indexOf(a.status);
    out.innerHTML = `<div class="card stack" data-anim>
      <div class="row between"><div><span class="small muted">${escape(a.code)}</span><h3 class="mb-0">${escape(a.studentName)}</h3><span class="muted">${escape(a.grade)}</span></div><span class="badge badge-${kind}" data-status>${label}</span></div>
      ${a.interview && a.status === 'entrevista' ? `<div class="notice">Entrevista familiar: <b>${dateTime(a.interview)}</b> en Secretaría de Admisión.</div>` : ''}
      <ul class="timeline">${flow.map((s, i) => { const h = [...a.history].reverse().find(x => x.status === s); return `<li class="${i < reached ? 'done' : i === reached ? 'current' : ''}"><b>${ADM_STATUS[s][0]}</b>${h ? `<div class="small muted">${dateTime(h.at)} · ${escape(h.note || '')}</div>` : ''}</li>`; }).join('')}</ul>
    </div>`;
  };
  el.querySelector('#lookup').addEventListener('submit', e => { e.preventDefault(); const v = formData(e.currentTarget); show(v.code, v.rut); });
  if (q.code && q.rut) show(q.code, q.rut);
}
