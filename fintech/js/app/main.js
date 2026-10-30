// App del cliente (banca web/móvil). Router por hash con un módulo por sección.
import { db, auth, guard, ROLES, STAFF } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, toast } from '../../../assets/core/ui.js';
import { brand, userChip } from '../shared/layout.js';
import * as home from './home.js';
import * as movements from './movements.js';
import * as transfers from './transfers.js';
import * as bills from './bills.js';
import * as qr from './qr.js';
import * as card from './card.js';
import * as goals from './goals.js';
import * as invest from './invest.js';
import * as loans from './loans.js';
import * as notifications from './notifications.js';
import * as profile from './profile.js';
import * as help from './help.js';

let user = guard(['cliente', ...STAFF]);
if (user && user.role !== 'cliente') {
  // El equipo interno no tiene cuenta de cliente: lo mandamos al back-office.
  location.replace('admin.html');
  user = null;
}

const NAV = [
  ['Mi dinero', [['/', '🏠', 'Inicio', home], ['/movimientos', '📄', 'Movimientos', movements], ['/transferir', '↔️', 'Transferir', transfers, true], ['/pagos', '🧾', 'Pagar cuentas', bills, true], ['/qr', '📷', 'Pagos QR', qr, true], ['/tarjeta', '💳', 'Mi tarjeta', card]]],
  ['Crecer', [['/metas', '🎯', 'Metas de ahorro', goals, true], ['/inversiones', '📈', 'Inversiones', invest, true], ['/creditos', '🏦', 'Créditos', loans, true]]],
  ['Cuenta', [['/notificaciones', '🔔', 'Notificaciones', notifications], ['/perfil', '🛡️', 'Perfil y seguridad', profile], ['/ayuda', '💬', 'Ayuda', help]]],
];
const ROUTES = NAV.flatMap(([, items]) => items);
const view = $('#view');
let cleanup = null, pending = false, lastPath = null;

function me() { return db.get('users', user.id); }
const active = () => me()?.kyc === 'aprobado';

function sidebar() {
  const unread = db.count('notifications', n => n.userId === user.id && !n.read);
  $('#sidebar').innerHTML = `<div class="admin-brand">${brand('index.html')}</div>` + NAV.map(([sec, items]) =>
    `<div class="nav-section">${sec}</div>` + items.map(([path, ico, label]) => `<a class="nav-link" href="#${path}"><span class="ico">${ico}</span>${label}${path === '/notificaciones' && unread ? `<span class="count">${unread}</span>` : ''}</a>`).join('')).join('')
    + `<div style="margin-top:auto;padding:12px" class="small muted">Cóndor Pay es ficticio. Ningún monto es real.</div>`;
  $('#userbar').innerHTML = userChip(me(), ROLES.cliente);
  router.highlight($('#sidebar'));
}

function kycGate() {
  const u = me();
  const msg = u.kyc === 'rechazado'
    ? `<div class="notice danger"><b>Tu solicitud fue rechazada.</b> ${u.kycReason ? 'Motivo: ' + u.kycReason + '. ' : ''}Escríbenos desde Ayuda si crees que es un error.</div>`
    : `<div class="notice warn"><b>Tu cuenta está en revisión.</b> Un ejecutivo está validando tu identidad (KYC). Esta función se habilita apenas aprueben tu solicitud. <br><span class="small muted">Tip demo: entra al back-office como Ejecutivo y apruébala en "Revisión KYC".</span></div>`;
  return `<div class="page-head"><h1>Función no disponible</h1></div>${msg}`;
}

async function show(mod, needsActive) {
  if (!user) return;
  cleanup && cleanup(); cleanup = null;
  sidebar();
  if (needsActive && !active()) { view.innerHTML = kycGate(); return; }
  const ctx = { user: me(), go: p => router.go(p), active: active() };
  cleanup = (await mod.render(view, ctx)) || null;
}

const table = Object.fromEntries(ROUTES.map(([path, , , mod, needs]) => [path, () => show(mod, needs)]));
const router = createRouter(table, { notFound: () => router.go('/'), after: cur => { if (cur.path !== lastPath) { lastPath = cur.path; window.scrollTo(0, 0); } } });

if (user) {
  wireAdminShell();
  document.addEventListener('click', e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; }
  });
  router.start();
  // Repinta cuando cambian los datos (incluye cambios hechos en el back-office en otra pestaña).
  const busy = () => document.querySelector('.modal-backdrop') || (view.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  db.subscribe(ch => {
    if (!me()) { auth.logout(); location.href = 'login.html'; return; }
    if (me().active === false) { toast('Tu cuenta fue desactivada', 'error'); auth.logout(); setTimeout(() => location.href = 'login.html', 800); return; }
    if (ch.type === 'log') return;
    if (busy()) { pending = true; return; }
    router.refresh();
  });
  setInterval(() => { if (pending && !busy()) { pending = false; router.refresh(); } }, 800);
}
