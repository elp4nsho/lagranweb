// Login del equipo: formulario clásico + cuentas demo de un clic.
import { auth, STAFF } from './data/db.js';
import { toast, $ } from '../../assets/core/ui.js';

const next = new URLSearchParams(location.search).get('next');
const go = u => {
  if (!STAFF.includes(u.role)) { auth.logout(); return toast('Esta cuenta no tiene acceso al panel', 'error'); }
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  setTimeout(() => { location.href = next && next.startsWith('admin.html') ? next : 'admin.html'; }, 350);
};

const u = auth.current();
if (u && STAFF.includes(u.role) && u.active !== false) {
  $('#loginErr').innerHTML = `Sesión activa como <b>${u.name}</b>. <a href="admin.html">Ir al panel</a>`;
  $('#loginErr').style.color = 'var(--muted)';
}

auth.mountDemoLogin($('#demo'), { filter: x => x.active !== false, onLogin: go });

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Entrando…';
  try { go(await auth.login(f.email.value, f.password.value)); }
  catch (err) { $('#loginErr').textContent = err.message; $('#loginErr').style.color = 'var(--danger)'; }
  finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});
