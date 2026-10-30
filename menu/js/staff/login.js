// Ingreso del equipo con roles y cuentas demo de un clic.
import { toast, escape } from '../../../assets/core/ui.js';
import { db, auth, HOME } from '../data/db.js';
import { settings } from '../shared/logic.js';

const PAGE_ROLES = { 'admin.html': ['admin', 'chef', 'cajero', 'garzon'], 'cocina.html': ['admin', 'chef'], 'garzon.html': ['admin', 'garzon', 'cajero'] };
const app = document.getElementById('app');
const next = new URLSearchParams(location.search).get('next') || '';

function target(u) {
  const page = next.split('#')[0];
  if (page && PAGE_ROLES[page]?.includes(u.role)) return next;
  return HOME[u.role] || 'admin.html';
}
const go = u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success', 1200); setTimeout(() => { location.href = target(u); }, 350); };

function render() {
  const cfg = settings();
  const cur = auth.current();
  app.innerHTML = `<div class="login-card card">
    <div class="login-side">
      <span class="brand-mark big" aria-hidden="true">🔥</span>
      <h1>${escape(cfg.name)}</h1>
      <p class="muted">Sistema del restaurante: panel, cocina, salón y caja.</p>
      <ul class="mini-list small">
        <li>📊 <b>Administrador</b>: todo el panel</li><li>👨‍🍳 <b>Jefe de cocina</b>: pantalla de cocina, carta e inventario</li>
        <li>🍽️ <b>Garzón</b>: plano de mesas, pedidos y llamados</li><li>💳 <b>Cajero</b>: caja, pedidos y reservas</li>
      </ul>
      <a class="small" href="index.html">← Volver al sitio</a>
    </div>
    <div class="stack login-main">
      ${cur ? `<div class="callout small">Sesión activa como <b>${escape(cur.name)}</b> (${escape(auth.roleName(cur.role))}). <a href="${escape(target(cur))}">Continuar</a> · <a href="#" data-out>Cerrar sesión</a></div>` : ''}
      <form class="stack" id="lf" novalidate>
        <h2 style="margin:0">Ingreso del equipo</h2>
        <div class="field"><label for="le">Correo</label><input class="input" id="le" type="email" autocomplete="username" required placeholder="nombre@fogonandino.cl"></div>
        <div class="field"><label for="lp">Contraseña</label><input class="input" id="lp" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary btn-block">Entrar</button>
        <p class="error small" id="lerr" role="alert" hidden></p>
      </form>
      <div class="stack" style="gap:8px"><span class="label">Cuentas de demostración (un clic)</span><div id="demo"></div></div>
    </div>
  </div>`;
  auth.mountDemoLogin(app.querySelector('#demo'), { onLogin: go });
  app.querySelector('[data-out]')?.addEventListener('click', e => { e.preventDefault(); auth.logout(); render(); });
  app.querySelector('#lf').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'), err = app.querySelector('#lerr');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try { go(await auth.login(app.querySelector('#le').value, app.querySelector('#lp').value)); }
    catch (ex) { err.hidden = false; err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Entrar'; }
  });
}
render();
db.subscribe(c => { if (c?.type === 'reset') render(); });
