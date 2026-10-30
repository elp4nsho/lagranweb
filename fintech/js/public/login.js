// Login con roles: clientes → app.html, equipo interno → admin.html.
import { db, auth, STAFF } from '../data/db.js';
import { $, toast } from '../../../assets/core/ui.js';
import { brand, ribbon } from '../shared/layout.js';

$('#ribbon').innerHTML = ribbon();
$('#brand').innerHTML = brand() + '<a class="btn btn-sm btn-ghost" href="index.html">← Volver al sitio</a>';

function destination(u) {
  const next = new URLSearchParams(location.search).get('next') || '';
  const page = next.split(/[?#]/)[0];
  if (STAFF.includes(u.role)) return page === 'admin.html' ? next : 'admin.html';
  return page === 'app.html' ? next : 'app.html';
}
const go = u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); setTimeout(() => location.href = destination(u), 350); };

auth.mountDemoLogin($('#demo-clients'), { filter: u => u.role === 'cliente', onLogin: go });
auth.mountDemoLogin($('#demo-staff'), { filter: u => STAFF.includes(u.role), onLogin: go });

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Validando…';
  $('#err').textContent = '';
  try { go(await auth.login($('#email').value, $('#pass').value)); }
  catch (err) { $('#err').textContent = err.message; btn.disabled = false; btn.textContent = 'Ingresar'; }
});

const cur = auth.current();
if (cur) {
  const n = document.createElement('div');
  n.className = 'notice';
  n.innerHTML = `Ya tienes sesión como <b></b>. <a href="${STAFF.includes(cur.role) ? 'admin.html' : 'app.html'}">Continuar</a> · <a href="#" data-out>Cerrar sesión</a>`;
  n.querySelector('b').textContent = cur.name;
  n.querySelector('[data-out]').onclick = ev => { ev.preventDefault(); auth.logout(); n.remove(); };
  $('#login-form').prepend(n);
}
void db;
