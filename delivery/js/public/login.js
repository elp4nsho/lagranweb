// Login con roles + registro de clientes (persona o empresa).
import { db, auth, authFor, homeFor, STAFF, openArea, anyUser, areaOf } from '../data/db.js';
import { $, $$, html, raw, escape, toast } from '../../../assets/core/ui.js';
import { renderHeader, renderFooter } from './site.js';
import { comunaOptions } from './calc.js';

renderHeader($('#site-head'));
renderFooter($('#site-foot'));
const next = new URLSearchParams(location.search).get('next');
const ALLOW = { 'admin.html': STAFF, 'repartidor.html': ['repartidor'], 'cliente.html': ['cliente'] };
function go(u) {
  openArea(u);
  const page = next ? decodeURIComponent(next).split('#')[0].split('?')[0] : '';
  const ok = next && (ALLOW[page] ? ALLOW[page].includes(u.role) : page === 'index.html');
  location.href = ok ? decodeURIComponent(next) : homeFor(u);
}

// Pestañas
function tab(t) {
  $$('[data-tab]').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $('#f-in').hidden = t !== 'in'; $('#f-up').hidden = t !== 'up';
}
$$('[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
if (location.hash === '#registro') tab('up');

// Login
$('#f-in').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button'), err = e.target.querySelector('.login-err');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Ingresando…'; err.textContent = '';
  try { const u = await auth.login($('#li-email').value, $('#li-pass').value); toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); go(u); }
  catch (x) { err.innerHTML = html`<div class="notice err">${x.message}</div>`; btn.disabled = false; btn.textContent = 'Ingresar'; }
});

// Registro
const fu = $('#f-up');
fu.elements.comuna.innerHTML = comunaOptions(db.getValue('pricing'), 'Providencia');
fu.addEventListener('change', () => { const biz = fu.elements.type.value === 'empresa'; $('.biz-only', fu).hidden = !biz; fu.elements.company.required = biz; });
fu.addEventListener('submit', async e => {
  e.preventDefault();
  const f = fu.elements, err = fu.querySelector('.login-err');
  let ok = true;
  fu.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim() || (i.minLength > 0 && i.value.length < i.minLength) || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle('invalid', bad); if (bad) ok = false; });
  if (!ok) { err.innerHTML = '<div class="notice warn">Revisa los campos marcados.</div>'; return; }
  const biz = f.type.value === 'empresa';
  if (db.find('users', u => u.email.toLowerCase() === f.email.value.trim().toLowerCase())) { err.innerHTML = '<div class="notice err">Ese correo ya está registrado.</div>'; return; }
  const cust = db.insert('customers', { type: biz ? 'empresa' : 'persona', name: biz ? f.company.value.trim() : f.name.value.trim(), contact: f.name.value.trim(), rut: f.rut.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), plan: biz ? 'Pyme' : 'Persona', comuna: f.comuna.value, active: true, creditLimit: biz ? 400000 : 0 });
  db.insert('addresses', { customerId: cust.id, label: biz ? 'Local principal' : 'Casa', name: cust.name, phone: cust.phone, addr: f.addr.value.trim(), comuna: f.comuna.value, isDefault: true });
  try {
    const u = await auth.register({ name: biz ? f.company.value.trim() : f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: 'cliente', customerId: cust.id, color: '#2563eb', phone: cust.phone });
    db.update('customers', cust.id, { userId: u.id });
    toast('¡Cuenta creada!', 'success');
    openArea(u);
    location.href = 'cliente.html';
  } catch (x) { db.remove('customers', cust.id); err.innerHTML = html`<div class="notice err">${x.message}</div>`; }
});

// Cuentas demo agrupadas
const groups = [['Equipo Rayo (consola)', u => STAFF.includes(u.role)], ['Repartidor (app móvil)', u => u.role === 'repartidor'], ['Clientes (portal)', u => u.role === 'cliente']];
const demo = $('#demo');
demo.innerHTML = groups.map(([t], i) => `<div class="demo-group"><b class="small muted">${escape(t)}</b><div data-g="${i}"></div></div>`).join('');
groups.forEach(([, fn], i) => auth.mountDemoLogin(demo.querySelector(`[data-g="${i}"]`), { filter: fn, onLogin: u => go(u) }));
const cur = anyUser();
if (cur) demo.insertAdjacentHTML('afterbegin', html`<div class="notice ok">Sesión activa: <b>${cur.name}</b> (${auth.roleName(cur.role)}). <a href="${homeFor(cur)}">Ir a mi panel</a> · <a href="#" data-out>Cerrar sesión</a></div>`);
demo.querySelector('[data-out]')?.addEventListener('click', e => { e.preventDefault(); authFor[areaOf(cur.role)].logout(); auth.logout(); location.reload(); });
