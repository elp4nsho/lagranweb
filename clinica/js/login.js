import { toast } from '../../assets/core/ui.js';
import { auth, HOME_BY_ROLE } from './data/db.js';

const next = new URLSearchParams(location.search).get('next');
// Página de destino: respeta ?next= si el rol puede verla
const ALLOWED = { 'admin.html': ['admin', 'recepcion'], 'recepcion.html': ['admin', 'recepcion'], 'medico.html': ['admin', 'medico'] };
function go(u) {
  const page = next && next.split('#')[0];
  location.href = page && ALLOWED[page]?.includes(u.role) ? next : HOME_BY_ROLE[u.role] || 'index.html';
}
if (next) document.getElementById('next-msg').textContent = 'Inicia sesión con una cuenta autorizada para continuar.';
auth.mountDemoLogin(document.getElementById('demo'), { onLogin: go });
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Ingresando…';
  try { go(await auth.login(f.email.value, f.password.value)); }
  catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Ingresar'; }
});
