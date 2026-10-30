// Detalle de vacante + formulario de postulación con carga de CV simulada.
import { escape, money, date, toast } from '../../../assets/core/ui.js';
import { validRut } from '../shared/util.js';
import { today } from '../shared/dates.js';

export function render(el, ctx, { id }) {
  const { db } = ctx, j = db.get('jobs', id);
  if (!j || j.status !== 'publicada') { el.innerHTML = `<section class="container section"><div class="card empty"><span class="icon">📭</span><h2>Esta vacante no está disponible</h2><p>Puede que ya se haya cerrado.</p><a class="btn btn-primary" href="#/empleos">Ver otras vacantes</a></div></section>`; return; }
  const dept = db.get('departments', j.deptId);
  el.innerHTML = `<section class="container section" style="padding-top:28px">
    <a href="#/empleos" class="small">← Volver a empleos</a>
    <div class="job-layout" style="margin-top:12px">
      <article class="card job-body" data-anim>
        <span class="eyebrow">${escape(dept?.name || '')}</span><h1 style="font-size:clamp(28px,4vw,40px);margin:6px 0 10px">${escape(j.title)}</h1>
        <div class="row gap-sm" style="margin-bottom:16px"><span class="badge plain">📍 ${escape(j.location)}</span><span class="badge badge-info">${escape(j.modality)}</span><span class="badge plain">${escape(j.type)}</span><span class="badge badge-success">${money(j.salaryMin)} – ${money(j.salaryMax)}</span>${j.openings > 1 ? `<span class="badge badge-primary">${j.openings} vacantes</span>` : ''}</div>
        <h3>Sobre el cargo</h3><p>${escape(j.description)}</p>
        <h3>Requisitos</h3><ul>${j.requirements.map(r => `<li>${escape(r)}</li>`).join('')}</ul>
        <h3>Beneficios</h3><ul>${j.benefits.map(b => `<li>${escape(b)}</li>`).join('')}</ul>
        <p class="muted small">Publicado el ${escape(date(j.publishedAt + 'T12:00'))} · postula hasta el ${escape(date(j.deadline + 'T12:00'))}</p>
      </article>
      <form class="card stack" data-apply novalidate>
        <h2 style="font-size:22px;margin:0">Postula a este cargo</h2>
        <div class="field"><label for="ap-name">Nombre completo *</label><input class="input" id="ap-name" name="name" autocomplete="name" required></div>
        <div class="form-grid">
          <div class="field"><label for="ap-rut">RUT *</label><input class="input" id="ap-rut" name="rut" placeholder="12.345.678-5" required></div>
          <div class="field"><label for="ap-phone">Teléfono *</label><input class="input" id="ap-phone" name="phone" type="tel" placeholder="+56 9 1234 5678" required></div>
        </div>
        <div class="field"><label for="ap-email">Correo *</label><input class="input" id="ap-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="ap-li">LinkedIn o portafolio</label><input class="input" id="ap-li" name="linkedin" placeholder="linkedin.com/in/…"></div>
        <div class="field"><label for="ap-sal">Pretensión de renta líquida</label><input class="input" id="ap-sal" name="salary" type="number" step="10000" min="0" placeholder="Ej: 1200000"></div>
        <div class="field"><span class="label">Currículum (PDF o Word, máx. 5 MB) *</span>
          <label class="upload" data-drop for="ap-cv"><span aria-hidden="true" style="font-size:26px">📄</span><span data-cvlabel>Arrastra tu CV aquí o <u>elige un archivo</u></span><div class="progress" data-prog hidden><i style="--v:0%"></i></div></label>
          <input id="ap-cv" name="cv" type="file" accept=".pdf,.doc,.docx" class="sr-only"></div>
        <div class="field"><label for="ap-cover">¿Por qué quieres trabajar con nosotros?</label><textarea class="textarea" id="ap-cover" name="cover" rows="3"></textarea></div>
        <label class="check"><input type="checkbox" name="ok"> Acepto el tratamiento de mis datos para este proceso de selección.</label>
        <p class="form-error danger small" data-err role="alert" style="margin:0"></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Enviar postulación</button>
      </form>
    </div></section>`;
  const form = el.querySelector('[data-apply]'), err = el.querySelector('[data-err]');
  let cv = null, uploading = false;
  const setFile = file => {
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) { err.textContent = 'El CV debe ser PDF o Word.'; return; }
    if (file.size > 5 * 1024 * 1024) { err.textContent = 'El archivo supera los 5 MB.'; return; }
    err.textContent = ''; uploading = true;
    const prog = el.querySelector('[data-prog]'), bar = prog.querySelector('i'), drop = el.querySelector('[data-drop]');
    prog.hidden = false; drop.classList.remove('has'); el.querySelector('[data-cvlabel]').textContent = `Subiendo ${file.name}…`;
    let v = 0; const t = setInterval(() => { v = Math.min(100, v + 9 + Math.random() * 18); bar.style.setProperty('--v', v + '%'); if (v >= 100) { clearInterval(t); uploading = false; cv = { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }; drop.classList.add('has'); el.querySelector('[data-cvlabel]').textContent = `✓ ${file.name} (${cv.size}) · cambiar`; } }, 120);
  };
  form.cv.addEventListener('change', e => setFile(e.target.files[0]));
  const drop = el.querySelector('[data-drop]');
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('has'); }));
  drop.addEventListener('dragleave', () => drop.classList.remove('has'));
  drop.addEventListener('drop', e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = { name: form.name.value.trim(), rut: form.rut.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(), linkedin: form.linkedin.value.trim(), cover: form.cover.value.trim(), salary: +form.salary.value || null };
    form.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid'));
    const bad = !v.name ? ['name', 'Ingresa tu nombre completo.'] : !validRut(v.rut) ? ['rut', 'El RUT no es válido (revisa el dígito verificador).'] : !v.phone ? ['phone', 'Ingresa un teléfono de contacto.'] : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ? ['email', 'El correo no es válido.'] : uploading ? ['cv', 'Espera a que termine de subir el CV.'] : !cv ? ['cv', 'Adjunta tu CV.'] : !form.ok.checked ? ['ok', 'Debes aceptar el tratamiento de datos.'] : null;
    if (bad) { err.textContent = bad[1]; const f = form[bad[0]]; if (bad[0] !== 'cv') { f.classList.add('invalid'); f.focus(); } toast(bad[1], 'warning'); return; }
    if (db.find('applications', a => a.jobId === j.id && a.email.toLowerCase() === v.email.toLowerCase())) { err.textContent = 'Ya postulaste a esta vacante con ese correo. Revisa el estado de tu postulación.'; return; }
    const n = Math.max(4800, ...db.all('applications').map(a => +String(a.code).split('-')[1] || 0)) + 1;
    const a = db.insert('applications', { code: `GC-${n}`, jobId: j.id, name: v.name, email: v.email, phone: v.phone, rut: v.rut, linkedin: v.linkedin, cvName: cv.name, cvSize: cv.size, cover: v.cover, stage: 'postulado', rating: 0, source: 'Sitio de empleos', appliedAt: today(), history: [{ stage: 'postulado', at: today(), by: 'Postulación web' }], notes: [], rejectReason: '', expectedSalary: v.salary });
    db.log('postulación', `${v.name} postuló a ${j.title} (${a.code})`, null);
    el.innerHTML = `<section class="container section"><div class="card stack" style="max-width:620px;margin:0 auto;text-align:center" data-anim="bounceIn">
      <div style="font-size:54px">🎉</div><h1 style="font-size:30px;margin:0">¡Postulación enviada!</h1>
      <p>Gracias, ${escape(v.name.split(' ')[0])}. Recibimos tu postulación a <b>${escape(j.title)}</b>.</p>
      <div class="card" style="box-shadow:none"><span class="muted small">Tu código de seguimiento</span><div class="mono" style="font-size:28px;font-weight:700" data-code>${escape(a.code)}</div><span class="muted small">Guárdalo junto a tu correo para revisar el estado.</span></div>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/estado?code=${encodeURIComponent(a.code)}&email=${encodeURIComponent(v.email)}">Ver estado</a><a class="btn" href="#/empleos">Ver otras vacantes</a></div></div></section>`;
    window.scrollTo(0, 0);
  });
}
