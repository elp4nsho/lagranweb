// Login con roles: cada perfil entra a su propia app.
import { db, auth, HOME_BY_ROLE } from './data/db.js';
import { escape, toast } from '../../assets/core/ui.js';
import { site, seal } from './shared/academic.js';

const st = site();
const params = new URLSearchParams(location.search);
const ALLOWED = { 'admin.html': ['admin', 'utp'], 'profesor.html': ['profesor'], 'apoderado.html': ['apoderado'], 'estudiante.html': ['estudiante'] };

function go(u) {
  const next = params.get('next') || '';
  const page = next.split('#')[0];
  location.href = ALLOWED[page]?.includes(u.role) ? next : HOME_BY_ROLE[u.role] || 'index.html';
}

const current = auth.current();
document.getElementById('app').innerHTML = `
<div class="auth-page">
  <aside class="auth-side">
    <a class="brand" href="index.html">${seal(48)}<span>${escape(st.name)}<small>Plataforma ${escape(st.platform)}</small></span></a>
    <h1>Todo el colegio en un solo lugar</h1>
    <p class="lead">Libro de clases digital, notas, asistencia, tareas, comunicados y pagos. Cada perfil ve exactamente lo que necesita.</p>
    <ul class="list compact hide-md">
      <li>🏫 <span><b>Dirección y UTP</b> · gestión académica, horarios, admisión e informes</span></li>
      <li>📘 <span><b>Profesores</b> · asistencia, notas, tareas y anotaciones</span></li>
      <li>👪 <span><b>Apoderados</b> · notas, asistencia, comunicados y pagos</span></li>
      <li>🎒 <span><b>Estudiantes</b> · horario, tareas y calificaciones</span></li>
    </ul>
  </aside>
  <main class="auth-main"><div class="auth-box stack">
    ${params.get('denied') ? '<div class="notice warn">Tu perfil no tiene acceso a esa sección. Ingresa con otra cuenta.</div>' : ''}
    ${current ? `<div class="notice ok row between">Sesión activa: <b>${escape(current.name)}</b> <span class="row" style="gap:6px"><a class="btn btn-sm btn-primary" href="${HOME_BY_ROLE[current.role]}">Continuar</a><button class="btn btn-sm btn-ghost" data-out>Salir</button></span></div>` : ''}
    <div><h2 class="mb-0">Ingresar a ${escape(st.platform)}</h2><p class="muted">Usa tu correo institucional o una cuenta de demostración.</p></div>
    <form class="card stack" id="login" novalidate>
      <div class="field"><label for="email">Correo</label><input class="input" id="email" name="email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="pass">Contraseña</label><input class="input" id="pass" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block" type="submit">Ingresar</button>
      <p class="small muted mb-0" data-err role="alert"></p>
    </form>
    <div><h3>Cuentas de demostración</h3><p class="small muted">Un clic para entrar con cada rol.</p><div id="demo"></div></div>
    <a class="small" href="index.html">← Volver al sitio del colegio</a>
  </div></main>
</div>`;

auth.mountDemoLogin(document.getElementById('demo'), { onLogin: go });
document.querySelector('[data-out]')?.addEventListener('click', () => { auth.logout(); location.replace('login.html'); });
document.getElementById('login').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget, btn = f.querySelector('button');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Ingresando…';
  try { const u = await auth.login(f.email.value, f.password.value); toast(`¡Hola, ${u.name.split(' ')[0]}!`, 'success'); go(u); }
  catch (err) { f.querySelector('[data-err]').textContent = err.message; f.querySelector('[data-err]').classList.add('text-danger'); btn.disabled = false; btn.textContent = 'Ingresar'; }
});
void db;
