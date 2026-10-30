// Login y registro (cliente o freelancer) con cuentas de demostración por rol.
import { db, auth, HOME_BY_ROLE } from './data/db.js';
import { escape, toast } from '../../assets/core/ui.js';
import { settings } from './shared/market.js';
import { logo } from './shared/logo.js';

const st = settings();
const params = new URLSearchParams(location.search);
const ALLOWED = { 'admin.html': ['admin', 'moderador', 'soporte'], 'cliente.html': ['cliente'], 'freelancer.html': ['freelancer'], 'index.html': null };
let mode = params.get('modo') === 'freelancer' ? 'register' : 'login';
let regRole = params.get('modo') === 'freelancer' ? 'freelancer' : 'cliente';

function go(u) {
  const next = params.get('next') || '';
  const page = next.split('#')[0];
  if (page in ALLOWED && (ALLOWED[page] === null || ALLOWED[page].includes(u.role))) location.href = next;
  else location.href = HOME_BY_ROLE[u.role] || 'index.html';
}

function render() {
  const current = auth.current();
  document.getElementById('app').innerHTML = `
  <div class="auth-page">
    <aside class="auth-side">
      <a class="brand" href="index.html">${logo(44)}<span>${escape(st.name)}<small>Freelancers de Chile</small></span></a>
      <h1>${mode === 'register' && regRole === 'freelancer' ? 'Vende tus servicios' : 'Contrata talento con pago protegido'}</h1>
      <p class="lead">${escape(st.heroSubtitle)}</p>
      <ul class="list compact hide-md">
        <li>🛡️ <span>Pagos retenidos en garantía hasta que apruebas la entrega</span></li>
        <li>💬 <span>Chat por pedido con archivos, revisiones y reseñas</span></li>
        <li>⚖️ <span>Centro de disputas con mediación del equipo de soporte</span></li>
      </ul>
    </aside>
    <main class="auth-main"><div class="auth-box stack">
      ${params.get('denied') ? '<div class="notice warn">Tu cuenta no tiene acceso a esa sección. Ingresa con otra cuenta.</div>' : ''}
      ${current ? `<div class="notice ok row between">Sesión activa: <b>${escape(current.name)}</b><span class="row" style="gap:6px"><a class="btn btn-sm btn-primary" href="${HOME_BY_ROLE[current.role]}">Continuar</a><button class="btn btn-sm btn-ghost" data-out>Salir</button></span></div>` : ''}
      <div class="tabs" role="tablist"><button class="tab ${mode === 'login' ? 'active' : ''}" data-mode="login" role="tab" aria-selected="${mode === 'login'}">Ingresar</button><button class="tab ${mode === 'register' ? 'active' : ''}" data-mode="register" role="tab" aria-selected="${mode === 'register'}">Crear cuenta</button></div>
      ${mode === 'login' ? `
      <form class="card stack" id="login" novalidate>
        <div class="field"><label for="email">Correo</label><input class="input" id="email" name="email" type="email" autocomplete="username" required></div>
        <div class="field"><label for="pass">Contraseña</label><input class="input" id="pass" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary btn-block" type="submit">Ingresar</button>
        <p class="small text-danger mb-0" data-err role="alert"></p>
      </form>
      <div><h3>Cuentas de demostración</h3><p class="small muted">Un clic para entrar con cada rol.</p><div id="demo"></div></div>` : `
      <form class="card stack" id="register" novalidate>
        <div class="row" role="radiogroup" aria-label="Tipo de cuenta">${[['cliente', 'Quiero contratar'], ['freelancer', 'Quiero vender']].map(([v, l]) => `<label class="check chip ${regRole === v ? 'active' : ''}"><input type="radio" name="role" value="${v}" ${regRole === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <div class="field"><label for="r-name">Nombre completo</label><input class="input" id="r-name" name="name" required autocomplete="name"></div>
        ${regRole === 'freelancer' ? '<div class="field"><label for="r-title">Tu especialidad</label><input class="input" id="r-title" name="title" placeholder="Ej: Editor de video" required></div>' : '<div class="field"><label for="r-co">Empresa o emprendimiento (opcional)</label><input class="input" id="r-co" name="company"></div>'}
        <div class="field"><label for="r-email">Correo</label><input class="input" id="r-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="r-pass">Contraseña (mín. 6)</label><input class="input" id="r-pass" name="password" type="password" required autocomplete="new-password"></div>
        <button class="btn btn-primary btn-block" type="submit">Crear cuenta</button>
        <p class="small text-danger mb-0" data-err role="alert"></p>
      </form>`}
      <a class="small" href="index.html">← Volver a ${escape(st.name)}</a>
    </div></main>
  </div>`;
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; render(); });
  document.querySelector('[data-out]')?.addEventListener('click', () => { auth.logout(); location.replace('login.html'); });
  const demo = document.getElementById('demo');
  if (demo) auth.mountDemoLogin(demo, { onLogin: go });
  document.getElementById('login')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget, btn = f.querySelector('button');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Ingresando…';
    try { const u = await auth.login(f.email.value, f.password.value); toast(`¡Hola, ${u.name.split(' ')[0]}!`, 'success'); go(u); }
    catch (err) { f.querySelector('[data-err]').textContent = err.message; btn.disabled = false; btn.textContent = 'Ingresar'; }
  });
  const reg = document.getElementById('register');
  if (reg) {
    reg.querySelectorAll('input[name=role]').forEach(r => r.onchange = () => { regRole = r.value; render(); });
    reg.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.currentTarget, err = f.querySelector('[data-err]');
      let ok = true;
      f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)) || (i.name === 'password' && i.value.length < 6); i.classList.toggle('invalid', bad); if (bad) ok = false; });
      if (!ok) { err.textContent = 'Revisa los campos marcados.'; return; }
      try {
        const extra = regRole === 'freelancer'
          ? { title: f.title.value.trim(), skills: [], verified: false, bio: '', city: '', languages: ['Español'], responseHrs: 6, portfolio: [], mainCategory: 'diseno', color: '#0d9488' }
          : { company: f.company.value.trim(), favorites: [], verified: false, color: '#2563eb' };
        const u = await auth.register({ name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: regRole, ...extra });
        toast('¡Cuenta creada! Bienvenido/a a Gremio.', 'success');
        go(u);
      } catch (x) { err.textContent = x.message; }
    });
  }
}
render();
void db;
