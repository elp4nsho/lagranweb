// Asistente de apertura de cuenta: RUT → datos → selfie → verificación → clave.
// Crea un cliente con KYC "pendiente" que aparece en la cola de revisión del back-office.
import { db, auth } from '../data/db.js';
import { $, toast, sleep, money } from '../../../assets/core/ui.js';
import { h } from '../shared/h.js';
import { publicHeader, wirePublicHeader } from '../shared/layout.js';
import { validRut, normalizeRut } from '../shared/bank.js';

$('#head').innerHTML = publicHeader();
wirePublicHeader();

const COMUNAS = ['Providencia', 'Ñuñoa', 'Las Condes', 'Maipú', 'La Florida', 'Santiago', 'Puente Alto', 'Viña del Mar', 'Valparaíso', 'Concepción', 'Temuco', 'Antofagasta', 'La Serena', 'Puerto Montt', 'Otra'];
const data = { selfie: false, doc: false };
let step = 0;
const TITLES = ['Identificación', 'Tus datos', 'Selfie y carnet', 'Verificación', 'Crea tu clave', 'Listo'];

function paint() {
  $('#steps').innerHTML = TITLES.slice(0, 5).map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
  const el = $('#step');
  el.innerHTML = VIEWS[step]();
  el.querySelector('input, select')?.focus();
  BIND[step]?.(el);
}
const head = (n, title, sub) => h`<div style="margin-bottom:16px"><span class="small muted">Paso ${n} de 5</span><h2 style="margin:4px 0">${title}</h2><p class="muted" style="margin:0">${sub}</p></div>`;
const err = (el, msg) => { const p = el.querySelector('[data-err]'); p.textContent = msg; if (msg) toast(msg, 'warning'); return !msg; };

const VIEWS = [
  () => h`${head(1, 'Identificación', 'Usaremos tu RUT y celular para validar tu identidad (simulado).')}
    <form class="stack" novalidate>
      <div class="field"><label for="rut">RUT</label><input class="input" id="rut" name="rut" placeholder="12.345.678-5" value="${data.rut || ''}" inputmode="text" autocomplete="off"><small class="muted">Prueba con 11.111.111-1 o cualquier RUT válido.</small></div>
      <div class="grid-2">
        <div class="field"><label for="phone">Celular</label><input class="input" id="phone" name="phone" placeholder="+56 9 1234 5678" value="${data.phone || '+56 9 '}"></div>
        <div class="field"><label for="email">Correo</label><input class="input" id="email" name="email" type="email" placeholder="tu@correo.cl" value="${data.email || ''}"></div>
      </div>
      <p class="small" data-err style="color:var(--danger);margin:0"></p>
      <div class="row between"><a href="index.html" class="btn btn-ghost">Cancelar</a><button class="btn btn-primary">Continuar →</button></div>
    </form>`,
  () => h`${head(2, 'Tus datos', 'Necesitamos algunos datos personales para tu ficha de cliente.')}
    <form class="stack" novalidate>
      <div class="field"><label for="name">Nombre completo</label><input class="input" id="name" name="name" value="${data.name || ''}" placeholder="Nombre y apellidos"></div>
      <div class="grid-2">
        <div class="field"><label for="birth">Fecha de nacimiento</label><input class="input" id="birth" name="birth" type="date" value="${data.birth || ''}"></div>
        <div class="field"><label for="comuna">Comuna</label><select class="select" id="comuna" name="comuna">${COMUNAS.map(c => h`<option ${data.comuna === c ? 'selected' : ''}>${c}</option>`)}</select></div>
      </div>
      <div class="field"><label for="address">Dirección</label><input class="input" id="address" name="address" value="${data.address || ''}" placeholder="Calle y número"></div>
      <div class="grid-2">
        <div class="field"><label for="job">Ocupación</label><input class="input" id="job" name="job" value="${data.job || ''}" placeholder="Ej: Diseñadora"></div>
        <div class="field"><label for="income">Renta líquida mensual</label><select class="select" id="income" name="income">${[[400000, 'Menos de $500.000'], [750000, '$500.000 – $1.000.000'], [1500000, '$1.000.000 – $2.000.000'], [2800000, 'Más de $2.000.000']].map(([v, l]) => h`<option value="${v}" ${+data.income === v ? 'selected' : ''}>${l}</option>`)}</select></div>
      </div>
      <label class="check"><input type="checkbox" name="pep" ${data.pep ? 'checked' : ''}> Soy persona expuesta políticamente (PEP)</label>
      <p class="small" data-err style="color:var(--danger);margin:0"></p>
      <div class="row between"><button type="button" class="btn btn-ghost" data-back>← Atrás</button><button class="btn btn-primary">Continuar →</button></div>
    </form>`,
  () => h`${head(3, 'Selfie y carnet', 'Simulamos la cámara: no se toma ninguna foto real.')}
    <div class="grid-2">
      <div class="stack" style="gap:8px"><div class="camera ${data.selfie ? 'captured' : ''}" data-cam="selfie"><div class="face">${data.selfie ? '✓' : '🙂'}</div></div><button class="btn btn-sm" data-shot="selfie">${data.selfie ? 'Repetir selfie' : '📸 Tomar selfie'}</button></div>
      <div class="stack" style="gap:8px"><div class="camera ${data.doc ? 'captured' : ''}" data-cam="doc"><div style="font-size:52px">${data.doc ? '✓' : '🪪'}</div></div><button class="btn btn-sm" data-shot="doc">${data.doc ? 'Repetir foto' : '📸 Foto del carnet'}</button></div>
    </div>
    <p class="small" data-err style="color:var(--danger);margin:12px 0 0"></p>
    <div class="row between" style="margin-top:16px"><button type="button" class="btn btn-ghost" data-back>← Atrás</button><button class="btn btn-primary" data-next>Verificar identidad →</button></div>`,
  () => h`${head(4, 'Verificación de identidad', 'Estamos validando tus datos con fuentes simuladas.')}
    <ul class="checklist" id="checks">
      ${['Validando RUT en registro civil (simulado)', 'Comparando selfie con carnet', 'Consultando listas restrictivas', 'Evaluando perfil de riesgo'].map(t => h`<li><span class="st"><span class="spinner"></span></span><span>${t}</span></li>`)}
    </ul>
    <div class="progress" style="margin-top:18px"><i id="vbar" style="--v:0%"></i></div>
    <div class="row between" style="margin-top:16px"><span></span><button class="btn btn-primary" data-next disabled>Continuar →</button></div>`,
  () => h`${head(5, 'Crea tu clave', 'La usarás para ingresar a la app. Mínimo 8 caracteres.')}
    <form class="stack" novalidate>
      <div class="field"><label for="pw">Clave</label><input class="input" id="pw" type="password" autocomplete="new-password"><div class="strength" id="str" data-s="0"><i></i><i></i><i></i><i></i></div></div>
      <div class="field"><label for="pw2">Repite la clave</label><input class="input" id="pw2" type="password" autocomplete="new-password"></div>
      <label class="check"><input type="checkbox" id="terms"> Acepto los términos y entiendo que es una demo con dinero ficticio</label>
      <p class="small" data-err style="color:var(--danger);margin:0"></p>
      <div class="row between"><button type="button" class="btn btn-ghost" data-back>← Atrás</button><button class="btn btn-primary">Abrir mi cuenta</button></div>
    </form>`,
  () => h`<div class="stack" style="text-align:center;align-items:center">
      <div class="feature-ic" style="width:72px;height:72px;font-size:36px">✓</div>
      <h2 style="margin:0">¡Solicitud enviada, ${data.name.split(' ')[0]}!</h2>
      <p class="muted">Tu cuenta quedó <b>en revisión</b>. Un ejecutivo validará tu identidad en el back-office (cola KYC). Mientras tanto puedes entrar a la app.</p>
      <dl class="kv" style="text-align:left"><dt>RUT</dt><dd>${data.rut}</dd><dt>Correo</dt><dd>${data.email}</dd><dt>Coincidencia facial</dt><dd>${data.match}%</dd></dl>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="app.html">Ir a mi app</a><a class="btn btn-ghost" href="index.html">Volver al inicio</a></div>
    </div>`,
];

const BIND = [
  el => el.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    const rut = f.rut.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
    if (!validRut(rut)) return err(el, 'El RUT no es válido (revisa el dígito verificador).');
    const nrut = normalizeRut(rut);
    if (db.find('users', u => u.rut === nrut)) return err(el, 'Ya existe una cuenta con ese RUT.');
    if (phone.replace(/\D/g, '').length < 11) return err(el, 'Ingresa un celular válido (+56 9 XXXX XXXX).');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(el, 'Ingresa un correo válido.');
    if (db.find('users', u => u.email.toLowerCase() === email.toLowerCase())) return err(el, 'Ese correo ya está registrado.');
    Object.assign(data, { rut: nrut, phone, email });
    step = 1; paint();
  },
  el => {
    el.querySelector('[data-back]').onclick = () => { step = 0; paint(); };
    el.querySelector('form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      const v = { name: f.name.value.trim(), birth: f.birth.value, comuna: f.comuna.value, address: f.address.value.trim(), job: f.job.value.trim(), income: +f.income.value, pep: f.pep.checked };
      if (v.name.split(/\s+/).length < 2) return err(el, 'Ingresa nombre y apellido.');
      if (!v.birth) return err(el, 'Ingresa tu fecha de nacimiento.');
      const age = (Date.now() - new Date(v.birth)) / (365.25 * 864e5);
      if (age < 18) return err(el, 'Debes ser mayor de 18 años.');
      if (!v.address) return err(el, 'Ingresa tu dirección.');
      Object.assign(data, v);
      step = 2; paint();
    };
  },
  el => {
    el.querySelector('[data-back]').onclick = () => { step = 1; paint(); };
    el.querySelectorAll('[data-shot]').forEach(b => b.onclick = async () => {
      const k = b.dataset.shot, cam = el.querySelector(`[data-cam="${k}"]`);
      cam.insertAdjacentHTML('beforeend', '<div class="scan"></div>');
      b.disabled = true; b.textContent = 'Capturando…';
      await sleep(1300);
      data[k] = true; paint();
    });
    el.querySelector('[data-next]').onclick = () => {
      if (!data.selfie || !data.doc) return err(el, 'Toma la selfie y la foto del carnet para continuar.');
      step = 3; paint();
    };
  },
  async el => {
    const lis = el.querySelectorAll('#checks li');
    data.match = 78 + Math.floor(Math.random() * 21);
    for (let i = 0; i < lis.length; i++) {
      await sleep(700 + Math.random() * 500);
      if (step !== 3) return;
      const warn = i === 2 && data.pep;
      lis[i].querySelector('.st').innerHTML = warn ? '<span class="badge badge-warning plain">!</span>' : '<span class="badge badge-success plain">✓</span>';
      if (i === 1) lis[i].querySelector('span:last-child').textContent += ` · ${data.match}% de coincidencia`;
      if (warn) lis[i].querySelector('span:last-child').textContent += ' · PEP declarado: revisión manual';
      el.querySelector('#vbar').style.setProperty('--v', `${(i + 1) * 25}%`);
    }
    const b = el.querySelector('[data-next]'); b.disabled = false; b.onclick = () => { step = 4; paint(); };
  },
  el => {
    el.querySelector('[data-back]').onclick = () => { step = 2; paint(); };
    const pw = el.querySelector('#pw');
    pw.oninput = () => {
      const v = pw.value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
      el.querySelector('#str').dataset.s = v ? Math.max(1, s) : 0;
    };
    el.querySelector('form').onsubmit = e => {
      e.preventDefault();
      if (pw.value.length < 8) return err(el, 'La clave debe tener al menos 8 caracteres.');
      if (pw.value !== el.querySelector('#pw2').value) return err(el, 'Las claves no coinciden.');
      if (!el.querySelector('#terms').checked) return err(el, 'Debes aceptar los términos.');
      createCustomer(pw.value);
      step = 5; paint();
    };
  },
];

function createCustomer(password) {
  const colors = ['#0ea5e9', '#e11d48', '#16a34a', '#d97706', '#7c3aed'];
  const u = db.insert('users', {
    name: data.name, email: data.email, password, role: 'cliente', active: true, demo: false, color: colors[Math.floor(Math.random() * colors.length)],
    rut: data.rut, phone: data.phone, comuna: data.comuna, job: data.job || 'Sin informar', income: data.income, birth: data.birth,
    kyc: 'pendiente', segment: 'Esencial', risk: data.pep ? 'medio' : 'bajo',
    kycData: { submittedAt: new Date().toISOString(), selfieMatch: data.match, docValid: true, pep: data.pep, listas: 'Sin coincidencias', address: data.address },
  });
  const num = () => `00-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`;
  db.insert('accounts', { id: `a-${u.id}-v`, userId: u.id, type: 'vista', number: num(), balance: 0, status: 'en revisión' });
  db.insert('accounts', { id: `a-${u.id}-s`, userId: u.id, type: 'ahorro', number: num(), balance: 0, status: 'en revisión' });
  const n = `4${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`;
  db.insert('cards', { userId: u.id, accountId: `a-${u.id}-v`, kind: 'virtual', brand: 'Cóndor Débito', number: n, last4: n.slice(-4), exp: '10/31', cvv: String(Math.floor(100 + Math.random() * 899)), status: 'inactiva', online: true, international: false, contactless: true, limitDaily: 500000, limitOnline: 300000 });
  db.insert('notifications', { userId: u.id, title: 'Solicitud recibida', body: 'Estamos revisando tu identidad. Te avisaremos cuando tu cuenta esté activa.', kind: 'info', read: false, at: new Date().toISOString() });
  db.log('onboarding', `Nueva solicitud de apertura: ${u.name} (${u.rut}) · renta ${money(u.income)}`, u.id);
  auth.loginAs(u.id);
}

paint();
