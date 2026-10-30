// Portal de clientes (personas y empresas).
import { db, authFor, guard } from '../data/db.js';
const auth = authFor.cliente;
import { createRouter } from '../../../assets/core/router.js';
import { debounce, html } from '../../../assets/core/ui.js';
import { mountShell } from '../shared/shell.js';
import { startEngine } from '../shared/engine.js';
import * as ops from '../shared/ops.js';
import { mountResumen } from './resumen.js';
import { mountNuevo } from './nuevo.js';
import { mountMasivo } from './masivo.js';
import { mountEnvios, mountEnvio } from './envios.js';
import { mountDirecciones } from './direcciones.js';
import { mountFacturas } from './facturas.js';
import { mountReclamos } from './reclamos.js';
import { mountPerfil } from './perfil.js';

const user = await guard(auth, ['cliente']);
const customer = () => db.get('customers', user.customerId) || { id: user.customerId, name: user.name, type: 'persona' };
const biz = customer().type === 'empresa';
const shell = mountShell(document.getElementById('app'), {
  title: 'Rayo Express', sub: biz ? 'Portal empresas' : 'Mi cuenta', user, auth,
  nav: [
    { items: [{ href: '#/', label: 'Resumen', ico: '◧', id: 'home' }, { href: '#/nuevo', label: 'Nuevo envío', ico: '＋', id: 'new' }, { href: '#/masivo', label: 'Carga masiva', ico: '⇪', id: 'bulk' }] },
    { title: 'Mis envíos', items: [{ href: '#/envios', label: 'Historial', ico: '📦', id: 'ship' }, { href: '#/direcciones', label: 'Direcciones', ico: '⌂', id: 'addr' }] },
    { title: 'Cuenta', items: [{ href: '#/facturas', label: biz ? 'Facturas y pagos' : 'Boletas y pagos', ico: '$', id: 'inv' }, { href: '#/reclamos', label: 'Reclamos', ico: '!', id: 'claims' }, { href: '#/perfil', label: 'Perfil', ico: '☺', id: 'profile' }] }
  ]
});
shell.topRight.innerHTML = html`<form class="top-track" role="search"><input class="input" placeholder="Rastrear código RX-…" aria-label="Rastrear código"><button class="btn btn-sm">Ir</button></form>`;
shell.topRight.querySelector('form').addEventListener('submit', e => {
  e.preventDefault();
  const v = e.target.querySelector('input').value.trim().toUpperCase();
  const s = v && ops.findByCode(/^\d{5}$/.test(v) ? 'RX-' + v : v);
  if (s && s.customerId === user.customerId) router.go('/envios/' + s.id); else if (v) location.href = 'index.html#/rastrear/' + encodeURIComponent(v);
});
const ctx = { user, customer, biz, shell, go: p => router.go(p) };
let current = null;
const show = (fn, ...a) => { current?.destroy?.(); shell.content.innerHTML = ''; current = fn(shell.content, ctx, ...a) || {}; shell.content.focus({ preventScroll: true }); window.scrollTo(0, 0); };
const router = createRouter({
  '/': () => show(mountResumen),
  '/nuevo': (_, q) => show(mountNuevo, q),
  '/masivo': () => show(mountMasivo),
  '/envios': (_, q) => show(mountEnvios, q),
  '/envios/:id': ({ id }) => show(mountEnvio, id),
  '/direcciones': () => show(mountDirecciones),
  '/facturas': () => show(mountFacturas),
  '/reclamos': () => show(mountReclamos),
  '/perfil': () => show(mountPerfil)
}, { notFound: () => router.go('/'), after: r => shell.highlight(r.path) });
router.start();
startEngine();
const counts = () => {
  const mine = db.query('shipments', s => s.customerId === user.customerId);
  shell.setCount('ship', mine.filter(s => ops.isLate(s) || ['pendiente', 'asignado', 'retirado', 'en_camino'].includes(s.status)).length);
  shell.setCount('inv', db.count('invoices', i => i.customerId === user.customerId && ['pendiente', 'vencida'].includes(i.status)));
};
counts();
db.subscribe(debounce(() => { if (!auth.current() || auth.current().active === false) { location.href = 'login.html'; return; } counts(); current?.refresh?.(); }, 150));
setInterval(() => current?.tick?.(), 1000);
