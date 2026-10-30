// Login con roles: redirige al panel (o a `next`) según el rol.
import { $, toast, escape } from '../../assets/core/ui.js';
import { db, auth, STAFF, settings } from './data/db.js';
import { art } from './shared/art.js';
import { logo } from './public/layout.js';

const next = new URLSearchParams(location.search).get('next');
const target = () => (next && /^admin\.html/.test(next) ? next : 'admin.html');

$('#aside').innerHTML = `${art({ c1: 'primary', c2: 'accent', shape: 'orbit', seed: 7 }, { ratio: 'auto' })}
  <a class="brand" href="index.html">${logo(settings().name)}</a>
  <div><h1>Gestiona el estudio desde un solo lugar.</h1><p>Contenidos, portafolio, cotizaciones y talento: todo conectado con el sitio público en tiempo real.</p></div>
  <small>Demo · datos simulados en tu navegador</small>`;

const cur = auth.current();
if (cur && STAFF.includes(cur.role)) {
  const box = document.createElement('div');
  box.className = 'card row between';
  box.innerHTML = `<span>Sesión activa: <b>${escape(cur.name)}</b></span><span class="row" style="gap:8px"><a class="btn btn-primary btn-sm" href="${target()}">Ir al panel</a><button class="btn btn-sm" id="out">Salir</button></span>`;
  $('.login-box').prepend(box);
  box.querySelector('#out').onclick = () => { auth.logout(); location.reload(); };
}

auth.mountDemoLogin($('#demo'), { filter: u => u.active !== false, onLogin: u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); location.href = target(); } });

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#login-error'), btn = $('#login-btn');
  err.hidden = true;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Entrando…';
  try {
    const u = await auth.login(f.email.value, f.password.value);
    if (!STAFF.includes(u.role)) { auth.logout(); throw new Error('Tu cuenta no tiene acceso al panel'); }
    db.update('users', u.id, { lastLogin: new Date().toISOString() });
    location.href = target();
  } catch (ex) {
    err.textContent = ex.message; err.hidden = false;
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});
