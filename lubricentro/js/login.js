// Ingreso: clientes (mi cuenta) y equipo (panel, bahías, recepción) con cuentas demo de un clic.
import { toast, escape } from '../../assets/core/ui.js';
import { db, auth, HOME } from './data/db.js';
import { settings, upsertCustomer } from './shared/domain.js';

const PAGE_ROLES = { 'admin.html': ['admin', 'jefe', 'recepcion'], 'operario.html': ['admin', 'jefe', 'tecnico'], 'recepcion.html': ['admin', 'jefe', 'recepcion'], 'index.html': ['admin', 'jefe', 'recepcion', 'tecnico', 'cliente'] };
const app = document.getElementById('app');
const next = new URLSearchParams(location.search).get('next') || '';
const target = u => { const page = next.split('#')[0]; return page && PAGE_ROLES[page]?.includes(u.role) && !(page === 'index.html' && u.role !== 'cliente' && next.includes('cuenta')) ? next : (HOME[u.role] || 'index.html'); };
const go = u => { toast(`Bienvenido/a, ${u.name.split(' ')[0]}`, 'success', 1200); setTimeout(() => { location.href = target(u); }, 350); };

function render(mode = 'login') {
  const c = settings(), cur = auth.current();
  app.innerHTML = `<div class="login-card card">
    <div class="login-side">
      <span class="brand-mark big" aria-hidden="true">🛢️</span>
      <h1>${escape(c.name)}</h1>
      <p class="muted">Sistema de gestión de lubricentros: sitio de clientes, recepción, tablero de bahías y panel de administración.</p>
      <ul class="mini-list small"><li>📊 <b>Administrador / Jefe de sucursal</b>: dashboard, precios, stock, personal, campañas</li><li>🧾 <b>Recepcionista</b>: fila, ingreso de vehículos, caja y boletas</li><li>🔧 <b>Técnico</b>: bahías, checklist, cronómetro y recomendaciones</li><li>🚗 <b>Cliente</b>: mis autos, historial con km, planes y boletas</li></ul>
      <a class="small" href="index.html">← Volver al sitio</a>
    </div>
    <div class="stack login-main">
      ${cur ? `<div class="callout small">Sesión activa: <b>${escape(cur.name)}</b> (${escape(auth.roleName(cur.role))}). <a href="${escape(target(cur))}">Continuar</a> · <a href="#" data-out>Salir</a></div>` : ''}
      <div class="tabs"><button class="tab ${mode === 'login' ? 'active' : ''}" data-mode="login">Ingresar</button><button class="tab ${mode === 'reg' ? 'active' : ''}" data-mode="reg">Crear cuenta de cliente</button></div>
      ${mode === 'login' ? `<form class="stack" id="lf" novalidate>
        <div class="field"><label for="le">Correo</label><input class="input" id="le" type="email" autocomplete="username"></div>
        <div class="field"><label for="lp">Contraseña</label><input class="input" id="lp" type="password" autocomplete="current-password"></div>
        <button class="btn btn-primary btn-block">Entrar</button><p class="error small" id="lerr" role="alert" hidden></p></form>`
      : `<form class="stack" id="rf" novalidate>
        <div class="field"><label for="rn">Nombre</label><input class="input" id="rn" autocomplete="name"></div>
        <div class="field"><label for="re">Correo</label><input class="input" id="re" type="email" autocomplete="email"></div>
        <div class="field"><label for="rt">Celular</label><input class="input" id="rt" type="tel" autocomplete="tel"></div>
        <div class="field"><label for="rp">Contraseña (mín. 6)</label><input class="input" id="rp" type="password" autocomplete="new-password"></div>
        <button class="btn btn-primary btn-block">Crear cuenta</button><p class="error small" id="rerr" role="alert" hidden></p></form>`}
      <div class="stack" style="gap:8px"><span class="label">Cuentas de demostración (un clic)</span><div id="demo"></div></div>
    </div></div>`;
  auth.mountDemoLogin(app.querySelector('#demo'), { onLogin: go });
  app.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => render(b.dataset.mode); });
  app.querySelector('[data-out]')?.addEventListener('click', e => { e.preventDefault(); auth.logout(); render(mode); });
  app.querySelector('#lf')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'), err = app.querySelector('#lerr');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try { go(await auth.login(app.querySelector('#le').value, app.querySelector('#lp').value)); }
    catch (ex) { err.hidden = false; err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Entrar'; }
  });
  app.querySelector('#rf')?.addEventListener('submit', async e => {
    e.preventDefault();
    const n = app.querySelector('#rn').value.trim(), em = app.querySelector('#re').value.trim(), ph = app.querySelector('#rt').value.trim(), p = app.querySelector('#rp').value, err = app.querySelector('#rerr');
    if (n.length < 3 || !/^\S+@\S+\.\S+$/.test(em) || p.length < 6) { err.hidden = false; err.textContent = 'Completa nombre, un correo válido y una contraseña de 6+ caracteres'; return; }
    try { const c = upsertCustomer({ name: n, email: em, phone: ph }); go(await auth.register({ name: n, email: em, password: p, role: 'cliente', customerId: c.id, color: '#e67e22' })); }
    catch (ex) { err.hidden = false; err.textContent = ex.message; }
  });
}
render();
db.subscribe(c => { if (c?.type === 'reset') render(); });
