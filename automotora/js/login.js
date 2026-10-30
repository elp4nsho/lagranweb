// Login con cuentas demo por rol.
import { toast, escape } from '../../assets/core/ui.js';
import { auth, HOME_BY_ROLE, PAGE_ROLES, db } from './data/db.js';
import { icon } from './shared/icons.js';

const next = new URLSearchParams(location.search).get('next');
const s = db.getValue('settings', {});
function go(u) {
  const page = next && next.split('#')[0];
  const ok = page && (PAGE_ROLES[page] ? PAGE_ROLES[page].includes(u.role) : page === 'index.html');
  location.href = ok ? next : HOME_BY_ROLE[u.role] || 'index.html';
}
document.getElementById('app').innerHTML = `<div class="auth-card">
  <form class="card stack" id="login-form" novalidate>
    <a class="brand" href="index.html"><span class="logo">${icon('car', 22)}</span><span>${escape(s.name || 'Autoplaza Pacífico')}<small>Clientes y equipo</small></span></a>
    <h1 class="auth-title">Ingresar</h1>
    <p class="muted" style="margin:0">${next ? 'Inicia sesión con una cuenta autorizada para continuar.' : 'Usa tu correo y contraseña, o entra con una cuenta de prueba.'}</p>
    <div class="field"><label for="email">Correo</label><input class="input" id="email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="password">Contraseña</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-primary btn-lg" type="submit">Ingresar</button>
    <a href="index.html#/cuenta" class="small">¿Cliente nuevo? Crea tu cuenta</a>
    <a href="index.html" class="small">${icon('back', 14)} Volver al sitio</a>
  </form>
  <div class="card stack"><span class="eyebrow">Cuentas demo</span><h2 style="margin:0">Entra con un clic</h2>
    <p class="muted small" style="margin:0">Cada rol ve un sistema distinto: panel de administración y gerencia, app de ventas (pipeline), crédito automotriz, posventa (taller) y la cuenta del cliente.</p>
    <div id="demo"></div></div></div>`;
auth.mountDemoLogin(document.getElementById('demo'), { onLogin: go });
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Ingresando…';
  try { go(await auth.login(f.email.value, f.password.value)); }
  catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Ingresar'; }
});
