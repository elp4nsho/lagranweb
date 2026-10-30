// Administración de Atiende (admin.html): métricas, base de conocimiento, macros, SLA,
// automatizaciones, incidentes de la página de estado, grupos, usuarios y ajustes.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { debounce } from '../../../assets/core/ui.js';
import { mountShell, forbidden } from '../shared/shell.js';
import { can } from '../shared/perms.js';
import * as dashboard from './dashboard.js';
import * as articles from './articles.js';
import * as categories from './categories.js';
import * as macros from './macros.js';
import * as sla from './sla.js';
import * as automations from './automations.js';
import * as incidents from './incidents.js';
import * as groups from './groups.js';
import * as users from './users.js';
import * as settings from './settings.js';
import * as log from './log.js';
import * as data from './data.js';

const NAV = [
  { section: 'Análisis' },
  { href: '#/', label: 'Métricas', icon: 'chart', perm: 'reports.view' },
  { section: 'Contenido' },
  { href: '#/articulos', label: 'Artículos', icon: 'book', perm: 'kb.edit', count: () => db.count('articles', a => a.status === 'borrador') },
  { href: '#/categorias', label: 'Categorías', icon: 'list', perm: 'kb.edit' },
  { href: '#/macros', label: 'Macros', icon: 'macro', perm: 'macros.edit' },
  { href: '#/incidentes', label: 'Incidentes y estado', icon: 'activity', perm: 'incidents.edit', count: () => db.count('incidents', i => i.status !== 'resuelto') },
  { section: 'Operación' },
  { href: '#/sla', label: 'Políticas SLA', icon: 'clock', perm: 'sla.edit' },
  { href: '#/automatizaciones', label: 'Automatizaciones', icon: 'bolt', perm: 'automations.edit' },
  { href: '#/grupos', label: 'Grupos', icon: 'flag', perm: 'teams.manage' },
  { href: '#/usuarios', label: 'Usuarios y roles', icon: 'users', perm: 'users.manage' },
  { section: 'Sistema' },
  { href: '#/ajustes', label: 'Centro de ayuda', icon: 'globe', perm: 'settings.edit' },
  { href: '#/bitacora', label: 'Bitácora', icon: 'list', perm: 'log.view' },
  { href: '#/datos', label: 'Datos y respaldo', icon: 'database', perm: 'data.reset' }
];
const shell = mountShell({ nav: NAV, area: 'Admin', roles: ['admin', 'supervisor'], links: [
  { href: 'agente.html', label: 'Consola de agentes', icon: 'inbox' },
  { href: 'index.html', label: 'Centro de ayuda', icon: 'globe', blank: true },
  { href: 'estado.html', label: 'Página de estado', icon: 'activity', blank: true }
] });
if (shell) start();

function start() {
  const view = shell.view;
  let current = null;
  const guard = (mod, perm, what) => (p, q) => {
    current = () => (perm && !can(perm)) ? forbidden(view, what) : mod.render(view, { user: auth.current(), params: p, query: q });
    current(); window.scrollTo(0, 0);
  };
  createRouter({
    '/': guard(dashboard, 'reports.view', 'las métricas'),
    '/articulos': guard(articles, 'kb.edit', 'la base de conocimiento'),
    '/articulos/:id': guard(articles, 'kb.edit', 'la base de conocimiento'),
    '/categorias': guard(categories, 'kb.edit', 'las categorías'),
    '/macros': guard(macros, 'macros.edit', 'las macros'),
    '/incidentes': guard(incidents, 'incidents.edit', 'los incidentes'),
    '/sla': guard(sla, 'sla.edit', 'las políticas SLA'),
    '/automatizaciones': guard(automations, 'automations.edit', 'las automatizaciones'),
    '/grupos': guard(groups, 'teams.manage', 'los grupos'),
    '/usuarios': guard(users, 'users.manage', 'la gestión de usuarios'),
    '/ajustes': guard(settings, 'settings.edit', 'los ajustes del centro de ayuda'),
    '/bitacora': guard(log, 'log.view', 'la bitácora'),
    '/datos': guard(data, 'data.reset', 'los datos del sistema')
  }, { notFound: () => { view.innerHTML = '<div class="card empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Ir a métricas</a></div>'; } }).start();
  const refresh = debounce(() => {
    if (!current || document.querySelector('.modal-backdrop')) return;
    const a = document.activeElement;
    if (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    const y = window.scrollY; current(); window.scrollTo(0, y);
  }, 200);
  db.subscribe(ch => { if (ch.type !== 'log' || location.hash.startsWith('#/bitacora')) refresh(); });
}
