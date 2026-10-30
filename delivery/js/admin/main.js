// Consola de despacho / administración de Rayo Express.
import { db, authFor, STAFF, guard } from '../data/db.js';
const auth = authFor.staff;
import { createRouter } from '../../../assets/core/router.js';
import { html, raw, debounce, toast, time, escape } from '../../../assets/core/ui.js';
import { mountShell } from '../shared/shell.js';
import { startEngine } from '../shared/engine.js';
import * as ops from '../shared/ops.js';
import { SECTIONS, sectionFor, allowed, can } from './perms.js';
import { openShipment } from './shipment.js';
import { mountDashboard } from './dashboard.js';
import { mountOps } from './operaciones.js';
import { mountEnvios } from './envios.js';
import { mountRepartidores } from './repartidores.js';
import { mountClientes } from './clientes.js';
import { mountFacturacion } from './facturacion.js';
import { mountIncidencias } from './incidencias.js';
import { mountTarifas } from './tarifas.js';
import { mountReportes } from './reportes.js';
import { mountUsuarios } from './usuarios.js';
import { mountAjustes } from './ajustes.js';
import { mountActividad } from './actividad.js';

const user = await guard(auth, STAFF);
const groups = [...new Set(SECTIONS.map(s => s.group))];
const shell = mountShell(document.getElementById('app'), {
  title: 'Rayo Express', sub: 'Consola de despacho', user, auth,
  nav: groups.map(g => ({ title: g, items: SECTIONS.filter(s => s.group === g && allowed(user, s)).map(s => ({ href: '#' + s.path, label: s.label, ico: s.ico, id: s.id })) })).filter(g => g.items.length),
  search: '<form class="search top-search" role="search"><input class="input" type="search" placeholder="Buscar código RX, cliente o repartidor…" aria-label="Buscar"></form>'
});
shell.topRight.innerHTML = html`
  <div class="sim-clock" title="Reloj de simulación"><span class="dot-live"></span><span data-clock></span></div>
  <div class="notif"><button class="btn btn-icon btn-ghost" data-bell aria-label="Notificaciones" aria-expanded="false">🔔<span class="bell-n" hidden></span></button><div class="notif-panel card" hidden></div></div>`;

const ctx = { user, shell, can: a => can(user, a), go: p => router.go(p), open: id => openShipment(id, ctx) };
let current = null;
const VIEWS = { dashboard: mountDashboard, ops: mountOps, envios: mountEnvios, repartidores: mountRepartidores, clientes: mountClientes, facturacion: mountFacturacion, incidencias: mountIncidencias, tarifas: mountTarifas, reportes: mountReportes, usuarios: mountUsuarios, ajustes: mountAjustes, actividad: mountActividad };
function show(sec, params = {}, q = {}) {
  current?.destroy?.();
  shell.content.innerHTML = '';
  document.title = `${sec.label} · Rayo Express`;
  if (!allowed(user, sec)) {
    current = {};
    shell.content.innerHTML = html`<div class="card empty denied"><span class="icon">🔒</span><h2>Acceso restringido</h2><p>Tu rol (<b>${auth.roleName(user.role)}</b>) no tiene permiso para ver <b>${sec.label}</b>.</p><a class="btn btn-primary" href="#/">Volver al dashboard</a></div>`;
    toast(`Sin permiso para ${sec.label}`, 'error');
    return;
  }
  current = VIEWS[sec.id](shell.content, ctx, params, q) || {};
  window.scrollTo(0, 0);
}
const route = id => (params, q) => show(SECTIONS.find(s => s.id === id), params, q);
const router = createRouter({
  '/': route('dashboard'), '/operaciones': route('ops'), '/envios': route('envios'), '/envios/:id': (p, q) => { show(SECTIONS.find(s => s.id === 'envios'), {}, q); openShipment(p.id, ctx); },
  '/repartidores': route('repartidores'), '/clientes': route('clientes'), '/facturacion': route('facturacion'), '/incidencias': route('incidencias'),
  '/tarifas': route('tarifas'), '/reportes': route('reportes'), '/usuarios': route('usuarios'), '/ajustes': route('ajustes'), '/actividad': route('actividad')
}, { notFound: path => show(sectionFor(path)), after: r => shell.highlight(r.path) });
router.start();
startEngine();

// Búsqueda global
shell.content.parentElement.querySelector('.top-search').addEventListener('submit', e => {
  e.preventDefault();
  const v = e.target.querySelector('input').value.trim();
  if (!v) return;
  const s = ops.findByCode(/^\d{5}$/.test(v) ? 'RX-' + v : v);
  if (s) { openShipment(s.id, ctx); return; }
  router.go('/envios?q=' + encodeURIComponent(v));
});

// Notificaciones (feed de operación + alertas SLA)
const bell = shell.topRight.querySelector('[data-bell]'), panel = shell.topRight.querySelector('.notif-panel'), bellN = shell.topRight.querySelector('.bell-n');
let seen = (() => { try { return localStorage.getItem('lgw:rayo:seen:' + user.id) || ''; } catch (e) { return ''; } })();
let lastToast = (db.getValue('feed', []) || [])[0]?.id;
function notif() {
  const feed = db.getValue('feed', []) || [];
  const idx = feed.findIndex(f => f.id === seen);
  const unread = idx < 0 ? Math.min(feed.length, 9) : idx;
  const late = ops.activeShipments().filter(ops.isLate);
  bellN.hidden = !(unread + late.length); bellN.textContent = unread + late.length;
  if (!panel.hidden) drawPanel(feed, late);
  // Toasts solo para eventos relevantes
  const fresh = [];
  for (const f of feed) { if (f.id === lastToast) break; fresh.push(f); }
  if (feed[0]) lastToast = feed[0].id;
  fresh.slice(0, 3).reverse().forEach(f => { if (f.kind === 'warning' || f.kind === 'error' || /reclamo|incidencia|app/i.test(f.text)) toast(f.text, f.kind === 'error' ? 'error' : f.kind === 'success' ? 'success' : 'warning'); });
  shell.setCount('envios', late.length);
  shell.setCount('incidencias', db.count('incidents', i => i.status === 'abierto'));
  shell.setCount('ops', ops.activeShipments().filter(s => s.status === 'pendiente').length);
}
function drawPanel(feed, late) {
  panel.innerHTML = html`<div class="card-title"><h3>Notificaciones</h3><button class="btn btn-sm btn-ghost" data-read>Marcar leídas</button></div>
    ${late.length ? raw(html`<div class="notice err small">⏰ <span><b>${late.length} envío${late.length > 1 ? 's' : ''} atrasado${late.length > 1 ? 's' : ''}</b>: ${late.slice(0, 4).map(s => s.code).join(', ')}${late.length > 4 ? '…' : ''} <a href="#/envios?f=atrasados">Ver</a></span></div>`) : ''}
    <div class="list">${feed.slice(0, 14).map(f => raw(html`<div class="list-item feed-${f.kind}" ${f.ref ? raw(`data-ref="${escape(f.ref)}"`) : ''}><span class="feed-dot"></span><span class="grow"><b class="small">${f.text}</b><small class="muted">${time(f.at)}</small></span></div>`)) || raw('<div class="empty-inline">Sin novedades</div>')}</div>`;
}
bell.onclick = e => {
  e.stopPropagation();
  panel.hidden = !panel.hidden; bell.setAttribute('aria-expanded', !panel.hidden);
  if (!panel.hidden) { drawPanel(db.getValue('feed', []) || [], ops.activeShipments().filter(ops.isLate)); }
};
panel.addEventListener('click', e => {
  e.stopPropagation();
  if (e.target.closest('[data-read]')) { seen = (db.getValue('feed', []) || [])[0]?.id || ''; try { localStorage.setItem('lgw:rayo:seen:' + user.id, seen); } catch (x) { /* */ } notif(); }
  const r = e.target.closest('[data-ref]'); if (r && db.get('shipments', r.dataset.ref)) { panel.hidden = true; openShipment(r.dataset.ref, ctx); }
});
document.addEventListener('click', () => { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); });
const clock = () => {
  const c = db.getValue('clock') || {};
  shell.topRight.querySelector('[data-clock]').textContent = `${time(ops.simNow())}${c.paused ? ' · en pausa' : c.speed > 1 ? ` · ${c.speed}×` : ''}`;
};
notif(); clock();
db.subscribe(debounce(() => {
  const u = auth.current();
  if (!u || !STAFF.includes(u.role) || u.active === false) { location.href = 'login.html'; return; }
  if (u.role !== user.role) { location.reload(); return; }
  notif(); current?.refresh?.();
}, 200));
setInterval(() => { current?.tick?.(); clock(); }, 1000);
