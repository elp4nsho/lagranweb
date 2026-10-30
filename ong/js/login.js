// Login único: el equipo va al panel; donantes y voluntarios, a su cuenta.
import { auth, STAFF } from './data/db.js';
import { toast, $ } from '../../assets/core/ui.js';

const next = new URLSearchParams(location.search).get('next');
const go = u => {
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  const staff = STAFF.includes(u.role);
  setTimeout(() => { location.href = staff ? (next && next.startsWith('admin.html') ? next : 'admin.html') : 'cuenta.html'; }, 350);
};
const u = auth.current();
if (u && u.active !== false) { $('#loginErr').innerHTML = `Sesión activa como <b>${u.name}</b>. <a href="${STAFF.includes(u.role) ? 'admin.html' : 'cuenta.html'}">Continuar</a>`; $('#loginErr').style.color = 'var(--muted)'; }
if (next && u && !STAFF.includes(u.role)) { $('#loginErr').textContent = 'Tu cuenta no tiene acceso al panel de gestión.'; }
auth.mountDemoLogin($('#demo'), { filter: x => x.active !== false, onLogin: go });
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Entrando…';
  try { go(await auth.login(f.email.value, f.password.value)); }
  catch (err) { $('#loginErr').textContent = err.message; $('#loginErr').style.color = 'var(--danger)'; }
  finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});
