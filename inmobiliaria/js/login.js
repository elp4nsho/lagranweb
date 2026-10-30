// Ingreso con roles: formulario, registro de clientes/propietarios y cuentas demo de un clic.
import { escape, toast } from '../../assets/core/ui.js';
import { db, auth, homeFor, PAGE_ROLES } from './data/db.js';
import { icon } from './shared/art.js';

const next = new URLSearchParams(location.search).get('next');
function target(u) {
  if (next && !/^[a-z]+:/i.test(next) && !next.startsWith('//')) {
    const page = next.split('#')[0].split('?')[0] || 'index.html';
    const allowed = PAGE_ROLES[page];
    if (!allowed || allowed.includes(u.role)) return next;
  }
  return homeFor(u);
}
const go = u => { location.href = target(u); };

const cur = auth.current();
document.getElementById('app').innerHTML = `<div class="login-wrap"><div class="login-card">
  <div class="card stack">
    <a class="brand" href="index.html"><span class="mark">${icon('building', 22)}</span><span>Hogar Austral<small>Propiedades</small></span></a>
    ${cur ? `<div class="banner"><div><h3>Sesión activa: ${escape(cur.name)}</h3><p>${escape(auth.roleName(cur.role))}</p></div><a class="btn btn-primary btn-sm" href="${target(cur)}">Continuar</a></div>` : ''}
    <div class="tabs" role="tablist"><button class="tab active" data-t="login" role="tab" aria-selected="true">Ingresar</button><button class="tab" data-t="registro" role="tab" aria-selected="false">Crear cuenta</button></div>
    <form class="stack" data-f="login">
      <div class="field"><label for="l-e">Correo</label><input class="input" id="l-e" name="email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="l-p">Contraseña</label><input class="input" id="l-p" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block">Ingresar</button>
      <p class="muted small" style="margin:0">¿Olvidaste tu contraseña? En esta demo usa las cuentas de la derecha.</p>
    </form>
    <form class="stack" data-f="registro" hidden>
      <div class="field"><label for="r-n">Nombre completo</label><input class="input" id="r-n" name="name" autocomplete="name" required></div>
      <div class="field"><label for="r-e">Correo</label><input class="input" id="r-e" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="r-p">Contraseña</label><input class="input" id="r-p" name="password" type="password" minlength="6" autocomplete="new-password" required></div>
      <div class="field"><label for="r-r">Quiero…</label><select class="select" id="r-r" name="role"><option value="cliente">Comprar o arrendar (cliente)</option><option value="propietario">Vender o arrendar mi propiedad (propietario)</option></select></div>
      <button class="btn btn-primary btn-block">Crear cuenta</button>
    </form>
  </div>
  <div class="card stack">
    <div><span class="eyebrow">Demo</span><h2 style="margin:4px 0">Entra con un clic</h2><p class="muted small" style="margin:0">Cada cuenta tiene un rol distinto: administrador y editor (panel), corredor (app de corredores), propietario y cliente (sitio público).</p></div>
    <div data-demo></div>
    <a class="btn btn-ghost" href="index.html">← Volver al sitio</a>
  </div></div></div>`;

const tabs = document.querySelectorAll('[data-t]');
const showTab = t => { tabs.forEach(b => { b.classList.toggle('active', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); }); document.querySelectorAll('[data-f]').forEach(f => { f.hidden = f.dataset.f !== t; }); };
tabs.forEach(b => b.onclick = () => showTab(b.dataset.t));
if (location.hash === '#registro') showTab('registro');

auth.mountDemoLogin(document.querySelector('[data-demo]'), { onLogin: u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); setTimeout(() => go(u), 300); } });

const busy = (f, on) => { const b = f.querySelector('button'); b.disabled = on; b.innerHTML = on ? '<span class="spinner"></span>' : b.dataset.label || b.textContent; };
document.querySelectorAll('[data-f]').forEach(f => { const b = f.querySelector('button'); b.dataset.label = b.textContent; });
document.querySelector('[data-f="login"]').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
  busy(f, true);
  try { const u = await auth.login(d.email, d.password); toast('Bienvenido/a', 'success'); go(u); }
  catch (err) { toast(err.message, 'error'); busy(f, false); }
});
document.querySelector('[data-f="registro"]').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
  if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email) || d.password.length < 6) return toast('Completa nombre, correo válido y contraseña de 6+ caracteres', 'warning');
  busy(f, true);
  try {
    const u = await auth.register({ name: d.name.trim(), email: d.email.trim(), password: d.password, role: d.role, color: '#1e4db7', phone: '' });
    if (u.role === 'propietario') {
      const o = db.find('owners', x => x.email.toLowerCase() === u.email.toLowerCase());
      o ? db.update('owners', o.id, { userId: u.id }) : db.insert('owners', { name: u.name, email: u.email, phone: '', rut: '', userId: u.id, notes: 'Registro web' });
    }
    toast('Cuenta creada', 'success'); go(u);
  } catch (err) { toast(err.message, 'error'); busy(f, false); }
});
