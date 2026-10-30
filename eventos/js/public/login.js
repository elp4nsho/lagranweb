// Login con cuentas demo por rol y registro de clientes.
import { db, auth, HOME_BY_ROLE } from '../data/db.js';
import { $, $$, toast } from '../../../assets/core/ui.js';
import { LOGO } from '../shared/format.js';

$('#brand').innerHTML = `<span class="logo">${LOGO}</span><span>Tiquetera Volcán</span>`;
const next = new URLSearchParams(location.search).get('next');
const go = u => {
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  // Si "next" apunta al sitio público o a una app permitida para el rol, se respeta.
  const allowed = { 'admin.html': ['admin', 'soporte'], 'productor.html': ['productor', 'admin'], 'acceso.html': ['staff', 'productor', 'admin'] };
  const page = (next || '').split(/[?#]/)[0];
  const dest = next && (!allowed[page] || allowed[page].includes(u.role)) ? next : HOME_BY_ROLE[u.role] || 'index.html';
  setTimeout(() => location.href = dest, 350);
};
$$('[data-t]').forEach(b => b.onclick = () => {
  $$('[data-t]').forEach(x => x.classList.toggle('active', x === b));
  $('#login').hidden = b.dataset.t !== 'login'; $('#register').hidden = b.dataset.t !== 'register';
});
$('#login').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button');
  btn.disabled = true; $('#err').textContent = '';
  try { go(await auth.login(f.email.value, f.password.value)); }
  catch (err) { $('#err').textContent = err.message; $('#err').style.color = 'var(--danger)'; btn.disabled = false; }
});
$('#register').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (!f.name.value.trim() || !/^\S+@\S+\.\S+$/.test(f.email.value) || f.password.value.length < 6) { $('#rerr').textContent = 'Completa nombre, un correo válido y una contraseña de al menos 6 caracteres.'; $('#rerr').style.color = 'var(--danger)'; return; }
  try { go(await auth.register({ name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: 'cliente', color: '#2563eb' })); }
  catch (err) { $('#rerr').textContent = err.message; $('#rerr').style.color = 'var(--danger)'; }
});
auth.mountDemoLogin($('#demo'), { onLogin: go });
if (auth.current()) { const u = auth.current(); $('#err').innerHTML = `Ya iniciaste sesión como <b>${u.name}</b>. <a href="${HOME_BY_ROLE[u.role]}">Continuar</a>`; }
void db;
