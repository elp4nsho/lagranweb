// Consola de agentes (agente.html): bandeja con vistas, detalle de ticket, chats en vivo y clientes.
import { db } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { debounce } from '../../../assets/core/ui.js';
import { mountShell } from '../shared/shell.js';
import * as inbox from './inbox.js';
import * as ticket from './ticket.js';
import * as chats from './chats.js';
import * as customers from './customers.js';

const NAV = [
  { section: 'Tickets' },
  { href: '#/', label: 'Bandeja', icon: 'inbox' },
  { href: '#/?vista=mios', label: 'Mis tickets', icon: 'user', count: u => inbox.viewCount(u, 'mios') },
  { href: '#/?vista=sin-asignar', label: 'Sin asignar', icon: 'tag', count: u => inbox.viewCount(u, 'sin-asignar') },
  { href: '#/?vista=urgentes', label: 'Urgentes', icon: 'bolt', count: u => inbox.viewCount(u, 'urgentes') },
  { href: '#/?vista=sla', label: 'SLA en riesgo', icon: 'clock', count: u => inbox.viewCount(u, 'sla') },
  { section: 'Canales' },
  { href: '#/chats', label: 'Chats en vivo', icon: 'chat', count: () => chats.waitingCount() },
  { href: '#/clientes', label: 'Clientes', icon: 'users' }
];
const shell = mountShell({ nav: NAV, area: 'Consola', roles: ['admin', 'supervisor', 'agente'], links: [
  { href: 'admin.html', label: 'Administración', icon: 'shield', perm: 'admin.access' },
  { href: 'index.html', label: 'Centro de ayuda', icon: 'globe', blank: true },
  { href: 'estado.html', label: 'Página de estado', icon: 'activity', blank: true }
] });
if (shell) start();

function start() {
  const view = shell.view;
  let current = null;
  const show = (mod, p = {}, q = {}) => { current = () => mod.render(view, { user: shell.user, params: p, query: q }); current(); window.scrollTo(0, 0); };
  createRouter({
    '/': (p, q) => show(inbox, p, q),
    '/ticket/:id': (p, q) => show(ticket, p, q),
    '/chats': (p, q) => show(chats, p, q),
    '/clientes': (p, q) => show(customers, p, q),
    '/clientes/:id': (p, q) => show(customers, p, q)
  }, { notFound: () => { view.innerHTML = '<div class="card empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Ir a la bandeja</a></div>'; } }).start();
  const refresh = debounce(() => {
    if (!current || document.querySelector('.modal-backdrop') || location.hash.startsWith('#/chats')) return;
    const a = document.activeElement;
    if (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    const y = window.scrollY; current(); window.scrollTo(0, y);
  }, 150);
  db.subscribe(ch => { if (ch.type !== 'log' && ch.col !== 'chats') refresh(); });
  setInterval(refresh, 30000); // temporizadores SLA en vivo
}
