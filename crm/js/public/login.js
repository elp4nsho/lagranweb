// Inicio de sesión de Pulso CRM: formulario + cuentas demo de un clic.
import { db, auth } from '../data/db.js';
import { toast } from '../../../assets/core/ui.js';

const params = new URLSearchParams(location.search);
const safeNext = () => { const n = params.get('next') || ''; return /^[\w.-]+\.html([?#].*)?$/.test(n) && !n.startsWith('login') ? n : 'app.html'; };
const go = () => { location.href = safeNext(); };

const current = auth.current();
const box = document.getElementById('session');
if (current && current.active !== false) {
  box.hidden = false;
  box.querySelector('[data-who]').textContent = `${current.name} (${auth.roleName(current.role)})`;
  box.querySelector('[data-continue]').onclick = go;
  box.querySelector('[data-out]').onclick = () => { auth.logout(); box.hidden = true; };
}

const form = document.getElementById('login-form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  const email = form.email.value, pass = form.password.value;
  if (!email || !pass) return toast('Ingresa correo y contraseña', 'warning');
  btn.disabled = true; btn.textContent = 'Ingresando…';
  try {
    const u = await auth.login(email, pass);
    toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
    setTimeout(go, 300);
  } catch (err) {
    toast(err.message, 'error');
    form.password.classList.add('invalid');
    btn.disabled = false; btn.textContent = 'Ingresar';
  }
});
document.querySelector('[data-forgot]').onclick = e => { e.preventDefault(); toast('Simulado: te enviamos un enlace para restablecer tu contraseña', 'info'); };
auth.mountDemoLogin(document.getElementById('demo-accounts'), { onLogin: u => { toast(`Entraste como ${u.name}`, 'success'); setTimeout(go, 250); } });
db.subscribe(() => {});
