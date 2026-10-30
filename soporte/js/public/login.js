// Ingreso a Atiende: clientes, agentes, supervisores y administradores. Registro de clientes.
import { db, auth, homeFor } from '../data/db.js';
import { toast } from '../../../assets/core/ui.js';
import { isEmail } from '../shared/util.js';
import { PLANS, COMMUNES } from '../shared/constants.js';

const params = new URLSearchParams(location.search);
const go = u => {
  const n = params.get('next') || '';
  const ok = /^[\w.-]+\.html([?#].*)?$/.test(n) && !n.startsWith('login');
  // Un cliente no puede entrar a la consola ni al admin, y viceversa.
  const staffPage = /^(agente|admin)\.html/.test(n);
  location.href = ok && (u.role === 'cliente' ? !staffPage : n !== 'portal.html' || u.role === 'cliente') ? n : homeFor(u);
};

const cur = auth.current();
const box = document.getElementById('session');
if (cur && cur.active !== false) {
  box.hidden = false;
  box.querySelector('[data-who]').textContent = `${cur.name} (${auth.roleName(cur.role)})`;
  box.querySelector('[data-continue]').onclick = () => go(cur);
  box.querySelector('[data-out]').onclick = () => { auth.logout(); box.hidden = true; };
}

// Pestañas
const tabs = document.querySelectorAll('[data-tab]');
const showTab = k => { tabs.forEach(t => { const on = t.dataset.tab === k; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); }); document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== k; }); };
tabs.forEach(t => t.onclick = () => showTab(t.dataset.tab));
if (params.get('registro')) showTab('registro');

const lf = document.getElementById('login-form');
lf.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = lf.querySelector('[type=submit]');
  if (!lf.email.value || !lf.password.value) return toast('Ingresa correo y contraseña', 'warning');
  btn.disabled = true; btn.textContent = 'Ingresando…';
  try { const u = await auth.login(lf.email.value, lf.password.value); toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); setTimeout(() => go(u), 250); }
  catch (err) { toast(err.message, 'error'); lf.password.classList.add('invalid'); btn.disabled = false; btn.textContent = 'Ingresar'; }
});

const rf = document.getElementById('register-form');
rf.plan.innerHTML = PLANS.map(p => `<option>${p}</option>`).join('');
rf.commune.innerHTML = COMMUNES.map(p => `<option>${p}</option>`).join('');
rf.addEventListener('submit', async e => {
  e.preventDefault();
  let ok = true;
  ['name', 'email', 'password'].forEach(n => { const bad = !rf[n].value.trim() || (n === 'email' && !isEmail(rf[n].value)) || (n === 'password' && rf[n].value.length < 6); rf[n].classList.toggle('invalid', bad); if (bad) ok = false; });
  if (!ok) return toast('Revisa los datos (la clave debe tener al menos 6 caracteres)', 'warning');
  try {
    const u = await auth.register({ name: rf.name.value.trim(), email: rf.email.value.trim().toLowerCase(), password: rf.password.value, role: 'cliente', rut: rf.rut.value.trim(), phone: rf.phone.value.trim(), plan: rf.plan.value, commune: rf.commune.value, address: '', color: '#475569' });
    // Asocia los tickets que esta persona envió antes sin cuenta.
    const claimed = db.query('tickets', t => t.guest && t.guest.email.toLowerCase() === u.email);
    claimed.forEach(t => db.update('tickets', t.id, { customerId: u.id, guest: null }));
    toast(`Cuenta creada${claimed.length ? `. Encontramos ${claimed.length} ticket(s) tuyo(s)` : ''}`, 'success');
    setTimeout(() => go(u), 300);
  } catch (err) { toast(err.message, 'error'); }
});
document.querySelector('[data-forgot]').onclick = e => { e.preventDefault(); toast('Simulado: te enviamos un enlace para restablecer tu clave', 'info'); };
auth.mountDemoLogin(document.getElementById('demo-accounts'), { onLogin: u => { toast(`Entraste como ${u.name}`, 'success'); setTimeout(() => go(u), 250); } });
