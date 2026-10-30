// Login con roles: clientes van a su cuenta, el equipo al panel. Incluye registro y cuentas demo.
import { html, raw, toast, $ } from '../../../assets/core/ui.js';
import { db, auth, STAFF } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { ICON } from './parts.js';

const params = new URLSearchParams(location.search);
let tab = params.get('tab') === 'registro' ? 'registro' : 'ingresar';

function destination(u) {
  const next = params.get('next');
  if (next && !/^https?:|^\/\//.test(next)) {
    const toAdmin = next.startsWith('admin.html');
    if (toAdmin && STAFF.includes(u.role)) return next;
    if (!toAdmin) return u.role === 'customer' || !next.includes('#/cuenta') ? next : 'admin.html';
  }
  return STAFF.includes(u.role) ? 'admin.html' : 'index.html#/cuenta';
}

const hero = db.get('products', 'p07') || db.all('products')[0];
$('#side').innerHTML = `${productArt(hero, hero.colors[1]?.hex, { view: 2 })}
  <div class="quote card"><span class="eyebrow">Raíz</span><h2 style="margin:6px 0">Ropa con origen</h2><p class="muted" style="margin:0">Clientes: revisa tus pedidos y direcciones. Equipo: administra catálogo, pedidos e inventario.</p></div>`;

function render() {
  const u = auth.current();
  const box = $('#auth');
  if (u) {
    box.innerHTML = html`<a class="brand" href="index.html"><span class="mark">${raw(ICON.logo)}</span>Raíz</a>
      <div class="card stack"><h2 style="margin:0">Ya iniciaste sesión</h2><p class="muted" style="margin:0">Conectado como <b>${u.name}</b> (${auth.roleName(u.role)}).</p>
      <a class="btn btn-primary" href="${destination(u)}">Continuar</a><button class="btn btn-ghost" data-out>Cerrar sesión</button></div>`;
    box.querySelector('[data-out]').onclick = () => { auth.logout(); render(); };
    return;
  }
  box.innerHTML = html`<a class="brand" href="index.html"><span class="mark">${raw(ICON.logo)}</span>Raíz</a>
    <div class="card stack">
      <div class="tabs" role="tablist"><button class="tab ${tab === 'ingresar' ? 'active' : ''}" data-tab="ingresar" role="tab">Ingresar</button><button class="tab ${tab === 'registro' ? 'active' : ''}" data-tab="registro" role="tab">Crear cuenta</button></div>
      ${tab === 'ingresar' ? raw(`<form class="stack" id="login" novalidate>
        <div class="field"><label for="l-email">Correo</label><input class="input" id="l-email" name="email" type="email" autocomplete="username" required></div>
        <div class="field"><label for="l-pass">Contraseña</label><input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
        <p class="small" data-err style="color:var(--danger);margin:0" hidden></p>
        <button class="btn btn-primary btn-block">Ingresar</button></form>`) : raw(`<form class="stack" id="register" novalidate>
        <div class="field"><label for="r-name">Nombre completo</label><input class="input" id="r-name" name="name" required></div>
        <div class="field"><label for="r-email">Correo</label><input class="input" id="r-email" name="email" type="email" required></div>
        <div class="field"><label for="r-phone">Teléfono</label><input class="input" id="r-phone" name="phone" placeholder="+56 9 1234 5678"></div>
        <div class="field"><label for="r-pass">Contraseña (mín. 6)</label><input class="input" id="r-pass" name="password" type="password" required></div>
        <label class="check"><input type="checkbox" name="newsletter" checked> Quiero recibir novedades</label>
        <p class="small" data-err style="color:var(--danger);margin:0" hidden></p>
        <button class="btn btn-primary btn-block">Crear cuenta</button></form>`)}
    </div>
    <div class="card stack"><div><b>Cuentas de demostración</b><p class="small muted" style="margin:0">Entra con un clic para probar cada rol.</p></div><div id="demo"></div></div>
    <a class="small" href="index.html">← Volver a la tienda</a>`;
  auth.mountDemoLogin(box.querySelector('#demo'), { onLogin: u => { toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); location.href = destination(u); } });
  box.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  const err = m => { const p = box.querySelector('[data-err]'); p.textContent = m; p.hidden = !m; };
  box.querySelector('#login')?.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try { const u = await auth.login(d.email, d.password); location.href = destination(u); }
    catch (ex) { err(ex.message); btn.disabled = false; btn.textContent = 'Ingresar'; }
  });
  box.querySelector('#register')?.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (!d.name.trim()) return err('Ingresa tu nombre');
    if (!/^\S+@\S+\.\S+$/.test(d.email)) return err('Correo inválido');
    if ((d.password || '').length < 6) return err('La contraseña debe tener al menos 6 caracteres');
    try {
      const u = await auth.register({ name: d.name.trim(), email: d.email.trim(), password: d.password, phone: d.phone, newsletter: !!d.newsletter, color: '#0f766e', addresses: [], wishlist: [] });
      toast('¡Cuenta creada! Bienvenida/o a Raíz', 'success');
      location.href = destination(u);
    } catch (ex) { err(ex.message); }
  });
}
render();
