// App del repartidor (mobile-first): conexión, ofertas, ruta, entregas, ganancias.
import { db, authFor, guard } from '../data/db.js';
const auth = authFor.courier;
import { createRouter } from '../../../assets/core/router.js';
import { html, raw, debounce, toast, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { startEngine } from '../shared/engine.js';
import * as ops from '../shared/ops.js';
import { mountRuta } from './ruta.js';
import { watchOffers } from './offer.js';
import { mountGanancias } from './ganancias.js';
import { mountHistorial } from './historial.js';
import { mountPerfil } from './perfil.js';

const user = await guard(auth, ['repartidor']);
const courier = () => db.get('couriers', user.courierId);
const app = document.getElementById('app');
if (!courier()) { app.innerHTML = '<div class="container section"><div class="card empty">Tu usuario no tiene un perfil de repartidor asociado. <a href="login.html">Volver</a></div></div>'; await new Promise(() => {}); }

// Latido: mientras la app esté abierta, este repartidor lo maneja una persona (no el motor).
const beat = () => { try { localStorage.setItem(ops.heartbeatKey(user.courierId), String(Date.now())); } catch (e) { /* */ } };
beat(); setInterval(beat, 4000);
window.addEventListener('beforeunload', () => { try { localStorage.removeItem(ops.heartbeatKey(user.courierId)); } catch (e) { /* */ } });

app.innerHTML = html`<div class="rider">
  <header class="rider-top">
    <a class="brand" href="index.html"><span class="brand-logo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span class="rider-brand">Rayo <b>Driver</b></span></a>
    <label class="online-toggle"><span data-ol-text>En línea</span><span class="switch"><input type="checkbox" data-online aria-label="Conectado"><span></span></span></label>
    <button class="btn btn-icon btn-ghost" data-menu aria-label="Menú"><span class="avatar" style="--av:${courier().color};--size:32px">${initials(user.name)}</span></button>
  </header>
  <nav class="tabs rider-tabs" aria-label="Secciones">
    <a class="tab" href="#/">🗺 Ruta</a><a class="tab" href="#/ganancias">$ Ganancias</a><a class="tab" href="#/historial">☰ Historial</a><a class="tab" href="#/perfil">☺ Perfil</a>
  </nav>
  <main class="rider-main" id="rv"></main>
</div>`;
const view = document.getElementById('rv');
const sw = app.querySelector('[data-online]');
const syncOnline = () => { const c = courier(); sw.checked = !!c.online; app.querySelector('[data-ol-text]').textContent = c.online ? 'En línea' : 'Desconectado'; app.querySelector('.rider').classList.toggle('is-offline', !c.online); };
sw.addEventListener('change', () => setOnline(sw.checked));
export function setOnline(on) {
  const c = courier();
  if (c.status !== 'activo') { toast('Tu cuenta está suspendida. Contacta a despacho.', 'error'); syncOnline(); return; }
  db.update('couriers', c.id, { online: on });
  db.log(on ? 'conexión' : 'desconexión', `${c.name} ${on ? 'se conectó' : 'se desconectó'} desde la app`, user.id);
  ops.feed(`${c.name} ${on ? 'está en línea' : 'se desconectó'}`, on ? 'success' : 'info');
  toast(on ? 'Estás en línea: recibirás ofertas cercanas' : 'Te desconectaste', on ? 'success' : 'info');
  syncOnline();
}
app.querySelector('[data-menu]').onclick = async () => {
  if (await confirm(`Sesión de ${user.name}. ¿Cerrar sesión?`, { title: 'Cuenta', ok: 'Cerrar sesión' })) {
    try { localStorage.removeItem(ops.heartbeatKey(user.courierId)); } catch (e) { /* */ }
    auth.logout(); location.href = 'login.html';
  }
};

const ctx = { user, courier, setOnline };
let current = null;
const show = (fn, ...a) => { current?.destroy?.(); view.innerHTML = ''; current = fn(view, ctx, ...a) || {}; window.scrollTo(0, 0); };
const router = createRouter({
  '/': () => show(mountRuta),
  '/ganancias': () => show(mountGanancias),
  '/historial': () => show(mountHistorial),
  '/perfil': () => show(mountPerfil)
}, { notFound: () => router.go('/'), after: () => router.highlight(app.querySelector('.rider-tabs')) });
router.start();
startEngine();
syncOnline();
const offers = watchOffers(ctx);
db.subscribe(debounce(() => { if (!auth.current() || auth.current().active === false) { location.href = 'login.html'; return; } syncOnline(); offers.check(); current?.refresh?.(); }, 120));
setInterval(() => { current?.tick?.(); offers.tick(); }, 1000);
