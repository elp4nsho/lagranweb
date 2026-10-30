// Login con dos modos: trabajador por RUT + PIN, o personal por correo + clave. Redirige según rol.
import { toast } from '../../../assets/core/ui.js';
import { db, auth, homeFor } from '../data/db.js';
import { parseRut, formatRut } from '../shared/rut.js';
import { mountHeader } from '../shared/brand.js';

mountHeader(document.getElementById('site-header'), { actions: '<a class="btn btn-sm btn-ghost" href="index.html">← Volver al sitio</a>' });

const next = new URLSearchParams(location.search).get('next');
const allowedFor = { 'app.html': ['trabajador', 'admin', 'prevencionista', 'supervisor'], 'admin.html': ['admin', 'prevencionista'], 'supervisor.html': ['supervisor'] };
function go(u) {
  let dest = homeFor(u.role);
  if (next) { const page = next.split('#')[0]; if ((allowedFor[page] || []).includes(u.role)) dest = next; }
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  setTimeout(() => { location.href = dest; }, 250);
}

document.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
  document.getElementById('f-rut').hidden = t.dataset.tab !== 'rut';
  document.getElementById('f-mail').hidden = t.dataset.tab !== 'mail';
}));

const rutIn = document.getElementById('rut');
rutIn.addEventListener('blur', () => { if (rutIn.value) rutIn.value = formatRut(rutIn.value); });

document.getElementById('f-rut').addEventListener('submit', async e => {
  e.preventDefault();
  const err = e.target.querySelector('[data-err]');
  const p = parseRut(rutIn.value);
  rutIn.classList.toggle('invalid', !p.ok);
  if (!p.ok) { err.textContent = p.error; return; }
  rutIn.value = p.value;
  const u = db.find('users', x => x.rut === p.value);
  if (!u) { err.textContent = 'No encontramos ese RUT. Pide a tu supervisor que te registre.'; return; }
  const btn = e.target.querySelector('button'); btn.disabled = true; err.textContent = '';
  try { go(await auth.login(u.email, e.target.pin.value)); }
  catch (ex) { err.textContent = ex.message.replace('Correo o contraseña', 'RUT o PIN'); }
  finally { btn.disabled = false; }
});

document.getElementById('f-mail').addEventListener('submit', async e => {
  e.preventDefault();
  const err = e.target.querySelector('[data-err]');
  const btn = e.target.querySelector('button'); btn.disabled = true; err.textContent = '';
  try { go(await auth.login(e.target.email.value, e.target.pass.value)); }
  catch (ex) { err.textContent = ex.message; }
  finally { btn.disabled = false; }
});

auth.mountDemoLogin(document.getElementById('demo'), { onLogin: go });
