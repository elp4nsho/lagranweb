// Portal de productoras: sus eventos, asistente de creación, ventas en vivo, asistentes, promos y liquidaciones.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, escape, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { LOGO } from '../shared/format.js';
import { denied } from '../shared/admin-kit.js';
import * as overview from './overview.js';
import * as events from './events.js';
import * as sales from './sales.js';
import * as attendees from './attendees.js';
import * as promos from './promos.js';
import * as payouts from './payouts.js';

let user;
// Sin sesión o sin rol: redirige al login y detiene el módulo sin lanzar errores.
try { user = auth.require(['productor', 'admin'], 'login.html'); } catch (e) { await new Promise(() => {}); }
// El admin puede ver el portal "como" cualquier productora.
const orgKey = 'vlc:asOrg';
const orgId = () => (user.role === 'productor' ? user.organizerId : (sessionStorage.getItem(orgKey) || 'o1'));
let view = $('#view'), handle = null;

const NAV = [
  { path: '/', label: 'Resumen', ico: '📊' },
  { path: '/eventos', label: 'Mis eventos', ico: '🎫' },
  { path: '/nuevo', label: 'Crear evento', ico: '➕' },
  { path: '/asistentes', label: 'Asistentes', ico: '🧑‍🤝‍🧑' },
  { path: '/promos', label: 'Códigos promo', ico: '🏷️' },
  { path: '/liquidaciones', label: 'Liquidaciones', ico: '💸' }
];
function chrome() {
  const org = db.get('organizers', orgId());
  $('#sidebar').innerHTML = `<div class="admin-brand"><span class="logo">${LOGO}</span><span>Productoras</span></div>
    <div class="card" style="padding:10px 12px;margin-bottom:6px"><small class="muted">Productora</small><br><b>${escape(org?.name || '—')}</b>
    ${user.role === 'admin' ? `<select class="select" id="asOrg" style="margin-top:8px" aria-label="Ver como productora">${db.all('organizers').map(o => `<option value="${o.id}" ${o.id === orgId() ? 'selected' : ''}>${escape(o.name)}</option>`).join('')}</select>` : ''}</div>
    <div class="nav-section">Gestión</div>` + NAV.map(n => `<a class="nav-link" href="#${n.path}"><span class="ico">${n.ico}</span>${n.label}</a>`).join('') +
    `<div style="margin-top:auto;padding-top:16px" class="stack"><a class="nav-link" href="acceso.html"><span class="ico">📲</span>App de acceso</a><a class="nav-link" href="index.html" target="_blank"><span class="ico">🌐</span>Ver sitio público</a>${user.role === 'admin' ? '<a class="nav-link" href="admin.html"><span class="ico">🛠️</span>Volver al admin</a>' : ''}</div>`;
  router.highlight($('#sidebar'));
  $('#asOrg')?.addEventListener('change', e => { sessionStorage.setItem(orgKey, e.target.value); router.refresh(); });
  const notes = db.query('notifications', n => n.userId === user.id && !n.read);
  $('#topuser').innerHTML = `<div class="rel"><button class="btn btn-ghost btn-icon icon-btn" id="bell" aria-label="Notificaciones">🔔${notes.length ? `<span class="dot">${notes.length}</span>` : ''}</button>
    <div class="menu-pop" id="bellPop" hidden>${notes.length ? notes.map(n => `<div class="notif unread">${escape(n.text)}<br><small class="muted">${ago(n.createdAt)}</small></div>`).join('') + '<button class="item" id="readAll">Marcar como leídas</button>' : '<div class="empty">Sin notificaciones nuevas</div>'}</div></div>
    <span class="user-chip"><span class="avatar" style="--av:${user.color}">${initials(user.name)}</span><span class="hide-sm"><b>${escape(user.name)}</b><br><small class="muted">${auth.roleName(user.role)}</small></span></span><button class="btn btn-sm btn-ghost" id="logout">Salir</button>`;
  $('#bell').onclick = e => { e.stopPropagation(); $('#bellPop').hidden = !$('#bellPop').hidden; };
  $('#readAll')?.addEventListener('click', () => notes.forEach(n => db.update('notifications', n.id, { read: true })));
  $('#logout').onclick = () => { auth.logout(); location.href = 'login.html'; };
}
document.addEventListener('click', e => { if (!e.target.closest('.menu-pop')) document.querySelectorAll('.menu-pop').forEach(x => (x.hidden = true)); });

function mount(mod, fn, params = {}, query = {}) {
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;
  const org = db.get('organizers', orgId());
  if (!org) { view.innerHTML = denied('Tu usuario no tiene una productora asignada.'); return; }
  if (org.status === 'suspendido') { view.innerHTML = denied('La productora está suspendida. Contacta a soporte.'); return; }
  // Un productor solo puede ver eventos propios.
  if (params.id) { const ev = db.get('events', params.id); if (!ev || ev.organizerId !== org.id) { view.innerHTML = denied('Este evento no pertenece a tu productora.'); return; } }
  const h = mod[fn](view, { user, org, params, query, go: p => router.go(p) });
  handle = h && typeof h === 'object' ? h : null;
}
const router = createRouter({
  '/': (p, q) => mount(overview, 'render', p, q),
  '/eventos': (p, q) => mount(events, 'render', p, q),
  '/nuevo': (p, q) => mount(events, 'create', p, q),
  '/eventos/:id': (p, q) => mount(sales, 'render', p, q),
  '/eventos/:id/editar': (p, q) => mount(events, 'edit', p, q),
  '/asistentes': (p, q) => mount(attendees, 'render', p, q),
  '/promos': (p, q) => mount(promos, 'render', p, q),
  '/liquidaciones': (p, q) => mount(payouts, 'render', p, q)
}, {
  notFound: () => { view.innerHTML = denied('La sección no existe.'); },
  before: () => { handle?.destroy?.(); handle = null; },
  after: () => chrome()
});
$('#gsearch').addEventListener('keydown', e => { if (e.key === 'Enter') router.go('/asistentes?q=' + encodeURIComponent(e.target.value.trim())); });

let t;
db.subscribe(() => {
  clearTimeout(t);
  t = setTimeout(() => {
    const fresh = db.get('users', user.id);
    if (!fresh || fresh.active === false || !['productor', 'admin'].includes(fresh.role)) { auth.logout(); location.href = 'login.html'; return; }
    chrome();
    if (handle?.update) handle.update(); else if (!handle?.static) router.refresh();
  }, 80);
});
wireAdminShell();
router.start();
