// Ingreso, registro de estudiantes y cuentas demo. Redirige según rol o al destino ?next.
import { toast } from '../../../assets/core/ui.js';
import { db, auth, homeFor } from '../data/db.js';
import { mountHeader } from '../shared/bits.js';

mountHeader(document.getElementById('site-header'), { search: false });
const next = new URLSearchParams(location.search).get('next');
const allowed = { 'aprender.html': ['estudiante'], 'instructor.html': ['instructor'], 'admin.html': ['admin', 'soporte'], 'index.html': ['estudiante', 'instructor', 'admin', 'soporte'] };
function go(u) {
  let dest = homeFor(u.role);
  if (next) { const page = next.split('#')[0] || 'index.html'; if ((allowed[page] || []).includes(u.role)) dest = next; }
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  setTimeout(() => { location.href = dest; }, 250);
}
const tab = t => {
  document.querySelectorAll('[data-tab]').forEach(x => { x.classList.toggle('active', x.dataset.tab === t); x.setAttribute('aria-selected', x.dataset.tab === t); });
  document.getElementById('f-in').hidden = t !== 'in'; document.getElementById('f-reg').hidden = t !== 'reg';
};
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
if (location.hash === '#registro') tab('reg');

document.getElementById('f-in').addEventListener('submit', async e => {
  e.preventDefault();
  const err = e.target.querySelector('[data-err]'), btn = e.target.querySelector('button');
  btn.disabled = true; err.textContent = '';
  try { go(await auth.login(e.target.email.value, e.target.pass.value)); } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
});
document.getElementById('f-reg').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = f.querySelector('[data-err]');
  if (f.name.value.trim().length < 3) return (err.textContent = 'Ingresa tu nombre completo');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value)) return (err.textContent = 'Correo no válido');
  if (f.pass.value.length < 6) return (err.textContent = 'La clave debe tener al menos 6 caracteres');
  err.textContent = '';
  try {
    const u = await auth.register({ name: f.name.value.trim(), email: f.email.value.trim(), password: f.pass.value, role: 'estudiante', color: '#e11d48' });
    db.insert('notifications', { userId: u.id, title: '¡Bienvenida a Academia Faro!', text: 'Usa el cupón BIENVENIDA para un 20% de descuento en tu primera compra.', kind: 'success', read: false, at: new Date().toISOString() });
    go(u);
  } catch (ex) { err.textContent = ex.message; }
});
auth.mountDemoLogin(document.getElementById('demo'), { onLogin: go });
