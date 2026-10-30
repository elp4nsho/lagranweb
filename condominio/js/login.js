// Ingreso a Vecindario: formulario y cuentas demo por rol.
import { escape, toast } from '../../assets/core/ui.js';
import { auth, settings, homeFor, PAGE_ROLES } from './data/db.js';
import { icon } from './shared/icons.js';

const next = new URLSearchParams(location.search).get('next');
function target(u) {
  if (next && !/^[a-z]+:/i.test(next) && !next.startsWith('//')) {
    const page = next.split('#')[0].split('?')[0] || 'index.html';
    const allowed = PAGE_ROLES[page];
    if (!allowed || allowed.includes(u.role)) return next;
  }
  return homeFor(u);
}
const s = settings(), cur = auth.current();
document.getElementById('app').innerHTML = `<div class="login-wrap"><div class="login-card">
  <div class="card stack">
    <a class="brand" href="index.html"><span class="mark">${icon('home', 22)}</span><span>Vecindario<small>${escape(s.community)}</small></span></a>
    ${cur ? `<div class="banner"><div><h3>Sesión activa: ${escape(cur.name)}</h3><p>${escape(auth.roleName(cur.role))}</p></div><a class="btn btn-primary btn-sm" href="${target(cur)}">Continuar</a></div>` : ''}
    <h1 style="font-size:28px;margin:0">Ingresa a tu comunidad</h1>
    <form class="stack" data-login>
      <div class="field"><label for="l-e">Correo</label><input class="input" id="l-e" name="email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="l-p">Contraseña</label><input class="input" id="l-p" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block">Ingresar</button>
    </form>
    <p class="muted small" style="margin:0">¿Eres residente y no tienes cuenta? Solicítala a la administración: ${escape(s.adminEmail)}</p>
  </div>
  <div class="card stack">
    <div><span class="eyebrow">Demo</span><h2 style="margin:4px 0">Entra con un clic</h2><p class="muted small" style="margin:0">Administrador (panel completo), comité (panel con permisos limitados y app de residente), conserje (conserjería) y residente (app de residentes).</p></div>
    <div data-demo></div>
    <a class="btn btn-ghost" href="index.html">← Volver al sitio</a>
  </div></div></div>`;
auth.mountDemoLogin(document.querySelector('[data-demo]'), { onLogin: u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); setTimeout(() => location.href = target(u), 300); } });
document.querySelector('[data-login]').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, b = f.querySelector('button');
  b.disabled = true; b.innerHTML = '<span class="spinner"></span>';
  try { const u = await auth.login(f.email.value, f.password.value); location.href = target(u); }
  catch (err) { toast(err.message, 'error'); b.disabled = false; b.textContent = 'Ingresar'; }
});
