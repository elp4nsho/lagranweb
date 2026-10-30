// Back-office de Cóndor Pay: shell, navegación por permisos y router.
import { db, auth, guard, ROLES, STAFF, can } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, toast, confirm } from '../../../assets/core/ui.js';
import { brand, userChip } from '../shared/layout.js';
import { denied } from './kit.js';
import * as dashboard from './dashboard.js';
import * as kyc from './kyc.js';
import * as cuentas from './customers.js';
import * as transacciones from './transactions.js';
import * as fraude from './fraud.js';
import * as creditos from './loans.js';
import * as tarjetas from './cards.js';
import * as productos from './products.js';
import * as soporte from './support.js';
import * as auditoria from './audit.js';
import * as usuarios from './users.js';

let user = guard(STAFF);
if (!user && auth.current()?.role === 'cliente') location.replace('app.html');

const NAV = [
  ['General', [['/', '📊', 'Resumen', 'dashboard', dashboard]]],
  ['Clientes', [['/kyc', '🪪', 'Revisión KYC', 'kyc', kyc, () => db.count('users', u => u.kyc === 'pendiente')], ['/cuentas', '👥', 'Clientes y cuentas', 'cuentas', cuentas], ['/transacciones', '💸', 'Transacciones', 'cuentas', transacciones]]],
  ['Riesgo', [['/fraude', '🛡️', 'Monitoreo de fraude', 'fraude', fraude, () => db.count('alerts', a => a.status === 'abierta')], ['/creditos', '🏦', 'Créditos', 'creditos', creditos, () => db.count('loans', l => ['solicitado', 'en evaluación'].includes(l.status))], ['/tarjetas', '💳', 'Tarjetas', 'tarjetas', tarjetas]]],
  ['Operación', [['/soporte', '💬', 'Soporte', 'soporte', soporte, () => db.count('tickets', t => t.status === 'abierto')], ['/productos', '⚙️', 'Productos y tarifas', 'productos', productos]]],
  ['Control', [['/auditoria', '📜', 'Auditoría', 'auditoria', auditoria], ['/usuarios', '🔑', 'Usuarios y roles', 'usuarios', usuarios]]],
];
const view = $('#view');
let cleanup = null, pending = false, lastPath = null;
const me = () => db.get('users', user.id);

function sidebar() {
  $('#sidebar').innerHTML = `<div class="admin-brand">${brand('index.html')}</div><span class="badge badge-primary" style="align-self:flex-start;margin:0 10px 6px">Back-office</span>` +
    NAV.map(([sec, items]) => {
      const vis = items.filter(([, , , s]) => can(me(), s));
      if (!vis.length) return '';
      return `<div class="nav-section">${sec}</div>` + vis.map(([path, ico, label, , , count]) => { const n = count ? count() : 0; return `<a class="nav-link" href="#${path}"><span class="ico">${ico}</span>${label}${n ? `<span class="count">${n}</span>` : ''}</a>`; }).join('');
    }).join('') +
    `<div style="margin-top:auto;padding:12px 6px" class="stack"><a class="nav-link" href="index.html"><span class="ico">🌐</span>Ver sitio público</a><button class="btn btn-sm btn-ghost" data-reset>↺ Restablecer datos demo</button></div>`;
  $('#userbar').innerHTML = userChip(me(), ROLES[me().role]);
  router.highlight($('#sidebar'));
}

async function show(section, mod, params = {}, query = {}) {
  cleanup && cleanup(); cleanup = null;
  sidebar();
  if (!can(me(), section)) { denied(view, 'esta sección'); return; }
  const ctx = { user: me(), params, query, canWrite: can(me(), section, 'write'), go: p => router.go(p), refresh: () => router.refresh() };
  cleanup = (await mod.render(view, ctx)) || null;
}

const table = {};
NAV.forEach(([, items]) => items.forEach(([path, , , section, mod]) => { table[path] = (p, q) => show(section, mod, p, q); }));
table['/cuentas/:id'] = (p, q) => show('cuentas', cuentas, p, q);
table['/fraude/:id'] = (p, q) => show('fraude', fraude, p, q);
table['/creditos/:id'] = (p, q) => show('creditos', creditos, p, q);
table['/soporte/:id'] = (p, q) => show('soporte', soporte, p, q);
const router = createRouter(table, { notFound: () => router.go('/'), after: cur => { if (cur.path !== lastPath) { lastPath = cur.path; window.scrollTo(0, 0); } } });

if (user) {
  wireAdminShell();
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; }
    if (e.target.closest('[data-reset]')) {
      if (!(await confirm('Se borrarán todos los cambios y se cargarán los datos de ejemplo. Tu sesión se mantiene si tu usuario existe en la semilla.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true }))) return;
      db.reset();
      if (!me()) { auth.logout(); location.href = 'login.html'; return; }
      toast('Datos demo restablecidos', 'success');
    }
  });
  $('#gsearch').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) router.go('/cuentas?q=' + encodeURIComponent(e.target.value.trim())); });
  router.start();
  const busy = () => document.querySelector('.modal-backdrop') || (view.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  db.subscribe(ch => {
    if (!me() || me().active === false || !STAFF.includes(me().role)) { auth.logout(); location.href = 'login.html'; return; }
    if (ch.type === 'log') return;
    if (busy()) { pending = true; return; }
    router.refresh();
  });
  setInterval(() => { if (pending && !busy()) { pending = false; router.refresh(); } }, 800);
}
