// Panel de administración de Sentinela: router con permisos por rol.
import { db, auth, guard, ROLES, can } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, toast, confirm } from '../../../assets/core/ui.js';
import { brand, userChip } from '../shared/layout.js';
import { denied } from '../shared/common.js';
import { tick } from '../shared/sim.js';
import * as dashboard from './dashboard.js';
import * as sites from './sites.js';
import * as devices from './devices.js';
import * as firmware from './firmware.js';
import { processRollouts } from './firmware.js';
import * as users from './users.js';
import * as apikeys from './apikeys.js';
import * as audit from './audit.js';
import * as exporter from './export.js';
import * as web from './web.js';

let user = guard(Object.keys(ROLES));
if (user && !can(user, 'admin.panel')) {
  // Los operadores no tienen acceso al panel de administración.
  document.body.innerHTML = '<main class="auth-wrap"><div class="card denied stack"><span style="font-size:48px">🔒</span><h1 style="font-size:28px;margin:0">Sin acceso a Administración</h1><p class="muted">Tu rol (Operador) solo puede usar la consola operativa.</p><a class="btn btn-primary" href="app.html">Ir a la consola</a></div></main>';
  user = null;
}

const NAV = [
  ['General', [['/', '📊', 'Resumen', 'admin.panel', dashboard]]],
  ['Infraestructura', [['/sitios', '🏭', 'Sitios y zonas', 'admin.sitios', sites], ['/dispositivos', '📡', 'Aprovisionamiento', 'admin.dispositivos', devices], ['/firmware', '⬆️', 'Firmware', 'admin.firmware', firmware]]],
  ['Accesos', [['/usuarios', '👥', 'Usuarios y roles', 'admin.usuarios', users], ['/api', '🔑', 'Claves API', 'admin.apikeys', apikeys]]],
  ['Datos', [['/auditoria', '📜', 'Auditoría', 'admin.auditoria', audit], ['/exportar', '⬇️', 'Exportar datos', 'admin.exportar', exporter], ['/web', '🌐', 'Sitio web y leads', 'admin.web', web, () => db.count('leads', l => l.status === 'nuevo')]]],
];
const view = $('#view');
let cleanup = null, tickers = new Set(), pending = false, lastPath = null;
const me = () => db.get('users', user.id);

function sidebar() {
  $('#sidebar').innerHTML = `<div class="admin-brand">${brand('index.html')}</div><span class="badge badge-primary" style="align-self:flex-start;margin:0 10px">Administración</span>` +
    NAV.map(([sec, items]) => { const vis = items.filter(i => can(me(), i[3])); return vis.length ? `<div class="nav-section">${sec}</div>` + vis.map(([p, ico, label, , , count]) => { const n = count ? count() : 0; return `<a class="nav-link" href="#${p}"><span class="ico">${ico}</span>${label}${n ? `<span class="count">${n}</span>` : ''}</a>`; }).join('') : ''; }).join('') +
    `<div class="nav-section">Ir a</div><a class="nav-link" href="app.html"><span class="ico">📈</span>Consola operativa</a><a class="nav-link" href="pantalla.html"><span class="ico">📺</span>Modo pantalla</a>
     <div style="padding:12px 6px"><button class="btn btn-sm btn-ghost" data-reset>↺ Restablecer datos demo</button></div>`;
  $('#userbar').innerHTML = userChip(me(), ROLES[me().role]);
  router.highlight($('#sidebar'));
}
async function show(section, mod, params = {}, query = {}) {
  cleanup && cleanup(); cleanup = null; tickers.clear();
  sidebar();
  if (!can(me(), section)) return denied(view);
  const ctx = { user: me(), params, query, canWrite: can(me(), section, 'write'), go: p => router.go(p), every: fn => tickers.add(fn), refresh: () => router.refresh() };
  cleanup = (await mod.render(view, ctx)) || null;
}
const table = {};
NAV.forEach(([, items]) => items.forEach(([p, , , s, mod]) => table[p] = (pa, q) => show(s, mod, pa, q)));
const router = createRouter(table, { notFound: () => router.go('/'), after: c => { if (c.path !== lastPath) { lastPath = c.path; scrollTo(0, 0); } } });

if (user) {
  wireAdminShell();
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; }
    if (e.target.closest('[data-reset]')) {
      if (!(await confirm('Se borrarán todos los cambios y se restaurarán los datos de ejemplo.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true }))) return;
      db.reset();
      if (!me()) { auth.logout(); location.href = 'login.html'; return; }
      toast('Datos demo restablecidos', 'success');
    }
  });
  router.start();
  const busy = () => document.querySelector('.modal-backdrop') || (view.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  db.subscribe(ch => {
    if (!me() || me().active === false) { auth.logout(); location.href = 'login.html'; return; }
    if (ch.type === 'log' || (ch.col === 'alarms' && ch.type === 'update')) return;
    if (busy()) { pending = true; return; }
    router.refresh();
  });
  setInterval(() => {
    tick();
    processRollouts();
    tickers.forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
    $('#clock').textContent = new Date().toLocaleTimeString('es-CL');
    if (pending && !busy()) { pending = false; router.refresh(); }
  }, 1000);
}
