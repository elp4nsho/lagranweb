// Login con cuentas demo por rol.
import { auth, homeFor } from './data/db.js';
import { toast } from '../../assets/core/ui.js';
import { LOGO } from './shared/topnav.js';

document.getElementById('logo').innerHTML = LOGO;
const next = new URLSearchParams(location.search).get('next');
const allowedFor = (u, n) => { const page = n.split('#')[0]; const allowed = { 'admin.html': ['admin', 'reclutador'], 'portal.html': ['admin', 'reclutador', 'jefatura', 'empleado'], 'index.html': [u.role] }; return (allowed[page] || []).includes(u.role); };
const go = u => { location.href = next && allowedFor(u, next) ? next : homeFor(u); };
const cur = auth.current();
if (cur && !next) go(cur);
else if (cur && next && !allowedFor(cur, next)) document.getElementById('err').innerHTML = `Tu cuenta (${auth.roleName(cur.role)}) no tiene acceso a esa sección. Ingresa con otra cuenta o <a href="${homeFor(cur)}">vuelve a tu portal</a>.`;
auth.mountDemoLogin(document.getElementById('demo'), { onLogin: u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); go(u); } });
const form = document.getElementById('loginForm'), err = document.getElementById('err'), btn = document.getElementById('go');
form.addEventListener('submit', async e => {
  e.preventDefault(); err.textContent = '';
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Ingresando…';
  try { go(await auth.login(form.email.value, form.pass.value)); }
  catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Ingresar'; }
});
