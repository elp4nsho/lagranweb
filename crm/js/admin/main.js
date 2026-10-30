// Administración de Pulso CRM (admin.html): usuarios, equipos, permisos, automatizaciones, CMS y datos.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { debounce } from '../../../assets/core/ui.js';
import { mountShell, forbidden, currentUserOrRedirect } from '../shared/shell.js';
import { can } from '../shared/perms.js';
import * as overview from './overview.js';
import * as users from './users.js';
import * as teams from './teams.js';
import * as roles from './roles.js';
import * as automations from './automations.js';
import * as site from './site.js';
import * as settings from './settings.js';
import * as log from './log.js';
import * as data from './data.js';

// Solo quien tenga permiso de administración entra; el resto vuelve al CRM.
const me = currentUserOrRedirect();
const allowed = me && can('admin.access', me);
if (me && !allowed) location.replace('app.html');

const NAV = [
  { section: 'Administración' },
  { href: '#/', label: 'Resumen', icon: 'chart' },
  { href: '#/usuarios', label: 'Usuarios', icon: 'users', perm: 'users.manage' },
  { href: '#/equipos', label: 'Equipos', icon: 'flag', perm: 'teams.manage' },
  { href: '#/roles', label: 'Roles y permisos', icon: 'key', perm: 'users.manage' },
  { href: '#/automatizaciones', label: 'Automatizaciones', icon: 'bolt', perm: 'automations.edit' },
  { section: 'Sitio y sistema' },
  { href: '#/sitio', label: 'Sitio web (CMS)', icon: 'globe', perm: 'site.edit' },
  { href: '#/configuracion', label: 'Configuración', icon: 'gear', perm: 'settings.edit' },
  { href: '#/bitacora', label: 'Bitácora', icon: 'list', perm: 'log.view' },
  { href: '#/datos', label: 'Datos y respaldo', icon: 'database', perm: 'data.reset' }
];
if (allowed) start();

function start() {
  const shell = mountShell({ nav: NAV, area: 'Admin', otherArea: { href: 'app.html', label: 'Volver al CRM', icon: 'kanban' } });
  const view = shell.view;
  let current = null;

  const guard = (mod, perm, what) => (p, q) => {
    current = () => {
      if (!can('admin.access')) { location.replace('app.html'); return; }
      if (perm && !can(perm)) return forbidden(view, what);
      mod.render(view, { user: auth.current(), params: p, query: q });
    };
    current();
    window.scrollTo(0, 0);
  };
  createRouter({
    '/': guard(overview),
    '/usuarios': guard(users, 'users.manage', 'la gestión de usuarios'),
    '/equipos': guard(teams, 'teams.manage', 'los equipos'),
    '/roles': guard(roles, 'users.manage', 'los roles y permisos'),
    '/automatizaciones': guard(automations, 'automations.edit', 'las automatizaciones'),
    '/sitio': guard(site, 'site.edit', 'el editor del sitio'),
    '/sitio/:tab': guard(site, 'site.edit', 'el editor del sitio'),
    '/configuracion': guard(settings, 'settings.edit', 'la configuración'),
    '/bitacora': guard(log, 'log.view', 'la bitácora'),
    '/datos': guard(data, 'data.reset', 'los datos del sistema')
  }, { notFound: () => { view.innerHTML = '<div class="card empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Ir al resumen</a></div>'; } }).start();

  const refresh = debounce(() => {
    if (!current || document.querySelector('.modal-backdrop')) return;
    const a = document.activeElement;
    if (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    const y = window.scrollY; current(); window.scrollTo(0, y);
  }, 150);
  db.subscribe(ch => { if (ch.type !== 'log' || location.hash.startsWith('#/bitacora') || location.hash === '#/' || !location.hash) refresh(); });
}
