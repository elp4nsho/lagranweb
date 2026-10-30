// Login de Sentinela: todos los roles entran a la consola; admin/ingeniero/lectura también al panel de administración.
import { auth } from '../data/db.js';
import { $, toast } from '../../../assets/core/ui.js';
import { brand } from '../shared/layout.js';

$('#brand').innerHTML = brand() + '<a class="btn btn-sm btn-ghost" href="index.html">← Sitio</a>';
const go = u => {
  const next = new URLSearchParams(location.search).get('next') || '';
  const page = next.split(/[?#]/)[0];
  const allowed = ['app.html', 'pantalla.html'].concat(u.role === 'operador' ? [] : ['admin.html']);
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  setTimeout(() => location.href = allowed.includes(page) ? next : 'app.html', 300);
};
auth.mountDemoLogin($('#demo'), { onLogin: go });
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const b = e.target.querySelector('[type=submit]'); b.disabled = true; $('#err').textContent = '';
  try { go(await auth.login($('#email').value, $('#pass').value)); } catch (err) { $('#err').textContent = err.message; b.disabled = false; }
});
