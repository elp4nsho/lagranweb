// Login y registro de lectores; la redacción entra al panel.
import { $, $$, toast, escape } from '../../assets/core/ui.js';
import { db, auth, STAFF, settings } from './data/db.js';
import { art } from './shared/art.js';
import { logo } from './public/layout.js';

const next = new URLSearchParams(location.search).get('next');
const safeNext = next && /^(index|admin)\.html/.test(next) ? next : null;
const target = u => (STAFF.includes(u.role) ? (safeNext && safeNext.startsWith('admin') ? safeNext : 'admin.html') : (safeNext && safeNext.startsWith('index') ? safeNext : 'index.html#/cuenta'));

$('#aside').innerHTML = `${art({ c1: 'primary', c2: 'info', shape: 'stripes', seed: 4 }, { ratio: 'auto' })}
  <a class="brand" href="index.html">${logo(settings().name)}</a>
  <div><h1>Información que orienta.</h1><p>Lectores: guarda artículos, comenta y suscríbete. Redacción: escribe, edita y publica desde el CMS.</p></div>
  <small>Demo · datos simulados en tu navegador</small>`;

const showTab = t => {
  $$('[data-tab]').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $('#login-form').hidden = t !== 'login'; $('#register-form').hidden = t !== 'registro';
};
$$('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
if (location.hash === '#registro') showTab('registro');

const cur = auth.current();
if (cur) {
  const box = document.createElement('div');
  box.className = 'card row between';
  box.innerHTML = `<span>Sesión activa: <b>${escape(cur.name)}</b></span><span class="row" style="gap:8px"><a class="btn btn-primary btn-sm" href="${target(cur)}">Continuar</a><button class="btn btn-sm" id="out">Salir</button></span>`;
  $('.login-box').prepend(box);
  box.querySelector('#out').onclick = () => { auth.logout(); location.reload(); };
}

auth.mountDemoLogin($('#demo'), { filter: u => u.active !== false, onLogin: u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); location.href = target(u); } });

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#login-error'), btn = $('#login-btn');
  err.hidden = true; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Entrando…';
  try { const u = await auth.login(f.email.value, f.password.value); location.href = target(u); }
  catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Entrar'; }
});

$('#register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#reg-error'), btn = $('#reg-btn');
  err.hidden = true;
  const bad = [];
  if (f.name.value.trim().length < 2) bad.push(f.name);
  if (!/^\S+@\S+\.\S+$/.test(f.email.value)) bad.push(f.email);
  if (f.password.value.length < 6) bad.push(f.password);
  [f.name, f.email, f.password].forEach(i => i.classList.toggle('invalid', bad.includes(i)));
  if (bad.length) { err.textContent = 'Revisa los campos marcados.'; err.hidden = false; return; }
  if (!f.terms.checked) { err.textContent = 'Debes aceptar los términos.'; err.hidden = false; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creando cuenta…';
  try {
    const u = await auth.register({ name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: 'lector', color: '#3b5b9c', saved: [] });
    if (f.newsletter.checked && !db.find('subscribers', s => s.email.toLowerCase() === u.email.toLowerCase())) db.insert('subscribers', { email: u.email, name: u.name, lists: ['diario'], status: 'active', source: 'Registro' });
    toast('¡Cuenta creada! Bienvenido/a a Brújula.', 'success');
    location.href = target(u);
  } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Crear cuenta gratis'; }
});
