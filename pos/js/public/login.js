// Login del sistema: cajeros van a la caja, supervisión/bodega/administración al back-office.
import { html, raw, toast, $ } from '../../../assets/core/ui.js';
import { db, auth, BACKOFFICE, POS_ROLES } from '../data/db.js';

const params = new URLSearchParams(location.search);
function destination(u) {
  const next = params.get('next') || '';
  if (next.startsWith('pos.html') && POS_ROLES.includes(u.role)) return next;
  if (next.startsWith('admin.html') && BACKOFFICE.includes(u.role)) return next;
  return u.role === 'cajero' ? 'pos.html' : u.role === 'bodeguero' ? 'admin.html#/inventario' : (next.startsWith('pos.html') ? 'pos.html' : 'admin.html');
}

function render() {
  const u = auth.current();
  const box = $('#auth');
  const denied = u && params.get('next') && destination(u) !== params.get('next');
  box.innerHTML = html`<a class="lp-brand" href="index.html"><span class="brand-mark">P</span>Almacén Pampa</a>
    ${u ? raw(html`<div class="card stack"><h2 style="margin:0">Sesión activa</h2><p class="muted" style="margin:0">Conectado como <b>${u.name}</b> (${auth.roleName(u.role)}).</p>
        ${denied ? raw('<p class="small" style="margin:0;color:var(--warning)">Tu rol no tiene acceso a la página solicitada.</p>') : ''}
        <div class="row"><a class="btn btn-primary" href="${destination(u)}">Continuar</a>${POS_ROLES.includes(u.role) ? raw('<a class="btn" href="pos.html">Abrir caja</a>') : ''}<button class="btn btn-ghost" data-out>Cerrar sesión</button></div></div>`) : ''}
    <form class="card stack" id="login" novalidate>
      <div><h1 style="margin:0;font-size:28px">Ingresar</h1><p class="muted small" style="margin:4px 0 0">Caja y back-office usan las mismas credenciales.</p></div>
      <div class="field"><label for="l-email">Correo</label><input class="input" id="l-email" name="email" type="email" autocomplete="username"></div>
      <div class="field"><label for="l-pass">Contraseña</label><input class="input" id="l-pass" name="password" type="password" autocomplete="current-password"></div>
      <p class="small" data-err style="margin:0;color:var(--danger)" hidden></p>
      <button class="btn btn-primary btn-block">Ingresar</button>
    </form>
    <div class="card stack"><div><b>Cuentas de demostración</b><p class="small muted" style="margin:0">Un clic para entrar con cada rol.</p></div><div id="demo"></div></div>
    <a class="small" href="index.html">← Volver</a>`;
  box.querySelector('[data-out]')?.addEventListener('click', () => { auth.logout(); render(); });
  auth.mountDemoLogin(box.querySelector('#demo'), { onLogin: u2 => { toast(`Hola, ${u2.name.split(' ')[0]}`, 'success'); location.href = destination(u2); } });
  box.querySelector('#login').addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const err = box.querySelector('[data-err]');
    try { const u2 = await auth.login(d.email, d.password); location.href = destination(u2); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
}
render();
