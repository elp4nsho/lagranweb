// Consola operativa de Sentinela: router, menú, reloj y motor de alarmas en vivo.
import { db, auth, guard, ROLES, can } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, toast } from '../../../assets/core/ui.js';
import { brand, userChip } from '../shared/layout.js';
import { tick } from '../shared/sim.js';
import * as live from './live.js';
import * as map from './map.js';
import * as devices from './devices.js';
import * as alarms from './alarms.js';
import * as rules from './rules.js';
import * as orders from './orders.js';
import * as energy from './energy.js';
import * as shifts from './shifts.js';

const user = guard(Object.keys(ROLES));
const NAV = [
  ['Monitoreo', [['/', '📈', 'Panel en vivo', live], ['/mapa', '🗺️', 'Mapa de sitio', map], ['/dispositivos', '📡', 'Dispositivos', devices]]],
  ['Alarmas', [['/alarmas', '🚨', 'Centro de alarmas', alarms, () => db.count('alarms', a => a.status === 'activa')], ['/reglas', '🎚️', 'Reglas de alarma', rules]]],
  ['Operación', [['/ordenes', '🛠️', 'Órdenes de trabajo', orders, () => db.count('orders', o => o.status !== 'completada')], ['/energia', '⚡', 'Energía', energy], ['/turnos', '📒', 'Bitácora de turno', shifts]]],
];
const view = $('#view');
let cleanup = null, tickers = new Set(), pending = false, lastPath = null;
const me = () => db.get('users', user.id);

function sidebar() {
  $('#sidebar').innerHTML = `<div class="admin-brand">${brand('index.html')}</div><span class="small muted" style="padding:0 12px">Acuícola Fiordo</span>` +
    NAV.map(([sec, items]) => `<div class="nav-section">${sec}</div>` + items.map(([p, ico, label, , count]) => { const n = count ? count() : 0; return `<a class="nav-link" href="#${p}"><span class="ico">${ico}</span>${label}${n ? `<span class="count">${n}</span>` : ''}</a>`; }).join('')).join('') +
    `<div class="nav-section">Más</div><a class="nav-link" href="pantalla.html"><span class="ico">📺</span>Modo pantalla</a>${can(me(), 'admin.panel') ? '<a class="nav-link" href="admin.html"><span class="ico">⚙️</span>Administración</a>' : ''}`;
  $('#userbar').innerHTML = userChip(me(), ROLES[me().role]);
  router.highlight($('#sidebar'));
}

async function show(mod, params = {}, query = {}) {
  cleanup && cleanup(); cleanup = null; tickers.clear();
  sidebar();
  const ctx = { user: me(), params, query, can: (s, m = 'write') => can(me(), s, m), go: p => router.go(p), every: fn => tickers.add(fn), refresh: () => router.refresh() };
  cleanup = (await mod.render(view, ctx)) || null;
}
const table = {};
NAV.forEach(([, items]) => items.forEach(([p, , , mod]) => table[p] = (pa, q) => show(mod, pa, q)));
table['/dispositivos/:id'] = (p, q) => show(devices, p, q);
table['/alarmas/:id'] = (p, q) => show(alarms, p, q);
const router = createRouter(table, { notFound: () => router.go('/'), after: c => { if (c.path !== lastPath) { lastPath = c.path; scrollTo(0, 0); } } });

if (user) {
  wireAdminShell();
  document.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; } });
  router.start();
  const busy = () => document.querySelector('.modal-backdrop') || (view.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  db.subscribe(ch => {
    if (!me() || me().active === false) { auth.logout(); location.href = 'login.html'; return; }
    if (ch.type === 'log') return;
    if (busy()) { pending = true; return; }
    router.refresh();
  });
  const SEV_TOAST = { critica: 'error', alta: 'warning', media: 'info', baja: 'info' };
  setInterval(() => {
    tick((a, d) => toast(`${a.code} · ${a.ruleName}: ${d.name}`, SEV_TOAST[a.severity] || 'warning', 6000));
    tickers.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    $('#clock').textContent = new Date().toLocaleTimeString('es-CL');
    if (pending && !busy()) { pending = false; router.refresh(); }
  }, 1000);
}
