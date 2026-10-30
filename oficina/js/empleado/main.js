// App de empleado: inicio, reservas de puesto, salas, equipo, calendario, visitas y perfil.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { escape, ago } from '../../../assets/core/ui.js';
import { buildIndex } from '../shared/util.js';
import { mountTopbar } from '../shared/topnav.js';
import * as inicio from './inicio.js';
import * as reservas from './reservas.js';
import * as salas from './salas.js';
import * as equipo from './equipo.js';
import * as calendario from './calendario.js';
import * as visitas from './visitas.js';
import * as perfil from './perfil.js';

const user = auth.require(['admin', 'rrhh', 'recepcion', 'empleado']);
const view = document.getElementById('view');
const me = () => db.get('people', auth.current()?.personId);
const ctx = {
  db, auth,
  get user() { return auth.current(); },
  get me() { return me(); },
  idx: null,
  go: p => router.go(p),
  rebuild() { const p = me(); ctx.idx = p ? buildIndex(db, p.companyId) : null; }
};
ctx.rebuild();

function bell() {
  const p = me(); if (!p) return '';
  const list = db.query('notifications', n => n.personId === p.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const unread = list.filter(n => !n.read).length;
  return `<details class="menu" data-bell><summary class="btn btn-ghost btn-sm btn-icon notif-btn" aria-label="Notificaciones (${unread} sin leer)">🔔${unread ? `<span class="dot">${unread}</span>` : ''}</summary>
    <div class="menu-pop card"><div class="menu-head row between" style="flex-direction:row"><b>Notificaciones</b>${unread ? '<button type="button" class="btn btn-sm btn-ghost" data-readall>Marcar leídas</button>' : ''}</div>
    ${list.length ? list.map(n => `<div class="menu-link" style="cursor:default${n.read ? ';opacity:.65' : ''}">${n.read ? '' : '● '}${escape(n.text)}<br><small class="muted">${escape(ago(n.at))}</small></div>`).join('') : '<p class="muted small" style="padding:8px">Sin notificaciones.</p>'}</div></details>`;
}

const LINKS = [{ href: '#/', label: 'Inicio', ico: '🏠' }, { href: '#/reservas', label: 'Reservar puesto', ico: '🪑' }, { href: '#/salas', label: 'Salas', ico: '📅' }, { href: '#/equipo', label: 'Equipo', ico: '👥' }, { href: '#/calendario', label: 'Calendario', ico: '🗓️' }, { href: '#/visitas', label: 'Mis visitas', ico: '🛎️' }, { href: '#/perfil', label: 'Mi perfil', ico: '🙋' }];
const topEl = document.getElementById('topbar');
const top = mountTopbar(topEl, { db, auth, links: LINKS, showCompany: false });
topEl.addEventListener('click', e => {
  if (e.target.closest('[data-readall]')) { db.query('notifications', n => n.personId === me()?.id && !n.read).forEach(n => db.update('notifications', n.id, { read: true })); }
});

let active = null, lastUnread = null;
function show(mod, params, query) {
  active = { mod, params, query };
  const p = me();
  if (!p) {
    view.innerHTML = `<div class="card no-access"><div style="font-size:48px">🙋</div><h1 style="font-size:26px">Tu cuenta no tiene ficha de empleado</h1><p class="muted">«Mi espacio» es para personas del directorio. Pide a un administrador que vincule tu usuario a una persona.</p><a class="btn btn-primary" href="admin.html">Ir al panel</a></div>`;
    return;
  }
  mod.render(view, ctx, params, query);
  router.highlight(topEl);
}
const router = createRouter({
  '/': () => show(inicio), '/reservas': (p, q) => show(reservas, p, q), '/salas': () => show(salas), '/equipo': () => show(equipo),
  '/calendario': () => show(calendario), '/visitas': () => show(visitas), '/perfil': () => show(perfil)
}, { notFound: () => router.go('/') });

function paintTop() {
  top.redraw();
  const old = topEl.querySelector('[data-bell]'); const open = old?.open;
  const holder = topEl.querySelector('.topbar-end');
  old?.remove();
  holder.insertAdjacentHTML('afterbegin', bell());
  if (open) holder.querySelector('[data-bell]').open = true;
  router.highlight(topEl);
}

let t;
db.subscribe(ch => {
  clearTimeout(t);
  t = setTimeout(() => {
    const u = auth.current();
    if (!u || u.active === false) { location.replace('login.html'); return; }
    ctx.rebuild();
    const unread = db.count('notifications', n => n.personId === me()?.id && !n.read);
    if (lastUnread !== null && unread > lastUnread && ch?.type === 'sync') {
      const n = db.query('notifications', x => x.personId === me()?.id && !x.read).sort((a, b) => b.at.localeCompare(a.at))[0];
      if (n) import('../../../assets/core/ui.js').then(m => m.toast(`🔔 ${n.text}`, 'info', 6000));
    }
    lastUnread = unread;
    paintTop();
    if (!active || document.querySelector('.modal-backdrop')) return;
    const ae = document.activeElement;
    if (ae && /INPUT|TEXTAREA/.test(ae.tagName) && view.contains(ae)) return;
    if (active.mod.live === false) return;
    active.mod.render(view, ctx, active.params, active.query);
  }, 60);
});
lastUnread = db.count('notifications', n => n.personId === me()?.id && !n.read);
paintTop();
router.start();
