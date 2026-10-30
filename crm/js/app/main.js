// Espacio de trabajo comercial (app.html): router, guardas por permiso y refresco en vivo.
import { db } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { mountShell, forbidden } from '../shared/shell.js';
import { can, visibleLeads, visibleActs } from '../shared/perms.js';
import { debounce } from '../../../assets/core/ui.js';
import * as dashboard from './dashboard.js';
import * as leads from './leads.js';
import * as deals from './deals.js';
import * as dealDetail from './deal-detail.js';
import * as companies from './companies.js';
import * as contacts from './contacts.js';
import * as calendar from './calendar.js';
import * as tasks from './tasks.js';
import * as email from './email.js';
import * as products from './products.js';
import * as reports from './reports.js';
import * as goals from './goals.js';
import * as importer from './import.js';

const NAV = [
  { section: 'Ventas' },
  { href: '#/', label: 'Inicio', icon: 'home' },
  { href: '#/leads', label: 'Leads', icon: 'target', count: u => visibleLeads(u).filter(l => l.status === 'nuevo').length },
  { href: '#/negocios', label: 'Negocios', icon: 'kanban' },
  { href: '#/empresas', label: 'Empresas', icon: 'building' },
  { href: '#/contactos', label: 'Contactos', icon: 'user' },
  { section: 'Agenda' },
  { href: '#/calendario', label: 'Calendario', icon: 'calendar' },
  { href: '#/tareas', label: 'Tareas', icon: 'checklist', count: u => visibleActs(u).filter(a => a.type === 'tarea' && !a.done && a.ownerId === u.id && new Date(a.dueAt) < Date.now() + 864e5).length },
  { href: '#/correo', label: 'Correo y secuencias', icon: 'mail' },
  { section: 'Catálogo y análisis' },
  { href: '#/productos', label: 'Productos', icon: 'box' },
  { href: '#/reportes', label: 'Reportes', icon: 'chart', perm: 'reports.view' },
  { href: '#/metas', label: 'Metas', icon: 'flag' },
  { href: '#/importar', label: 'Importar contactos', icon: 'upload', perm: 'import' }
];

const shell = mountShell({ nav: NAV, area: 'CRM', otherArea: { href: 'admin.html', label: 'Administración', icon: 'shield', perm: 'admin.access' } });
if (shell) start();

function start() {
  const view = shell.view;
  let current = null;

  function show(mod, params = {}, query = {}, perm = null, what = '') {
    current = () => {
      if (perm && !can(perm)) return forbidden(view, what);
      mod.render(view, { user: shell.user, params, query, router });
    };
    current();
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  const router = createRouter({
    '/': () => show(dashboard),
    '/leads': (p, q) => show(leads, p, q),
    '/leads/:id': (p, q) => show(leads, p, q),
    '/negocios': (p, q) => show(deals, p, q),
    '/negocios/:id': (p, q) => show(dealDetail, p, q),
    '/empresas': (p, q) => show(companies, p, q),
    '/empresas/:id': (p, q) => show(companies, p, q),
    '/contactos': (p, q) => show(contacts, p, q),
    '/contactos/:id': (p, q) => show(contacts, p, q),
    '/calendario': (p, q) => show(calendar, p, q),
    '/tareas': (p, q) => show(tasks, p, q),
    '/correo': (p, q) => show(email, p, q),
    '/correo/:tab': (p, q) => show(email, p, q),
    '/productos': (p, q) => show(products, p, q),
    '/reportes': (p, q) => show(reports, p, q, 'reports.view', 'los reportes'),
    '/metas': (p, q) => show(goals, p, q),
    '/importar': (p, q) => show(importer, p, q, 'import', 'la importación de contactos')
  }, { notFound: () => { view.innerHTML = '<div class="card empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Ir al inicio</a></div>'; } });
  router.start();

  // Refresco en vivo cuando cambian los datos (también desde otra pestaña), sin pisar lo que el usuario edita.
  const refresh = debounce(() => {
    if (!current || document.querySelector('.modal-backdrop') || document.body.classList.contains('dragging')) return;
    const a = document.activeElement;
    if (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    const y = window.scrollY;
    current();
    window.scrollTo(0, y);
  }, 120);
  db.subscribe(ch => { if (ch.type !== 'log') refresh(); });
}
