// App del ejecutivo de ventas: pipeline, ficha de lead, cotizaciones, agenda, stock y meta.
import { createRouter } from '../../../assets/core/router.js';
import { db, auth, PAGE_ROLES } from '../data/db.js';
import { mountShell, startPanel, host } from '../shared/shell.js';
import { isOpenLead } from '../shared/domain.js';
import { ymd } from '../shared/util.js';
import { renderPipeline } from './pipeline.js';
import { renderLead } from './lead.js';
import { renderMyQuotes, renderAgenda, renderStockSearch, renderGoal, renderApprovals } from './other.js';

let user;
try { user = auth.require(PAGE_ROLES['vendedor.html']); } catch (e) { /* redirigiendo */ }
if (user) {
  const mine = l => user.role !== 'vendedor' || l.sellerId === user.id;
  const MGR = ['gerente', 'admin'];
  const NAV = [
    { section: 'Ventas' },
    { href: '#/', label: 'Pipeline', ico: 'kanban', count: () => db.count('leads', l => mine(l) && l.stage === 'nuevo') },
    { href: '#/cotizaciones', label: 'Mis cotizaciones', ico: 'file' },
    { href: '#/agenda', label: 'Agenda test drives', ico: 'calendar', count: () => db.count('testdrives', t => t.date === ymd() && t.status === 'agendado' && (user.role !== 'vendedor' || t.sellerId === user.id)) },
    { href: '#/stock', label: 'Stock disponible', ico: 'grid' },
    { href: '#/meta', label: 'Meta y comisiones', ico: 'target' },
    { section: 'Gerencia' },
    { href: '#/aprobaciones', label: 'Aprobar descuentos', ico: 'check', roles: MGR, count: () => db.count('quotes', q => q.status === 'pendiente_aprobacion') }
  ];
  const shell = mountShell({ brand: 'Autoplaza', sub: 'App de ventas', logo: 'handshake', user, auth, db, nav: NAV, topExtra: MGR.includes(user.role) ? '<a class="btn btn-sm hide-sm" href="admin.html">Panel</a>' : '', appClass: 'app-ventas' });
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(host(shell.view), params, query, { user, mine }); };
  const router = createRouter({
    '/': page('Pipeline de leads', renderPipeline),
    '/lead/:id': page('Ficha del lead', renderLead),
    '/cotizaciones': page('Mis cotizaciones', renderMyQuotes),
    '/agenda': page('Agenda de test drives', renderAgenda),
    '/stock': page('Stock disponible', renderStockSearch),
    '/meta': page('Meta y comisiones', renderGoal),
    '/aprobaciones': page('Aprobación de descuentos', renderApprovals)
  }, {
    before: path => { if (!shell.can(path)) { shell.crumb('Acceso restringido'); shell.denied(); return false; } },
    notFound: () => { shell.view.innerHTML = '<div class="card empty">Sección no encontrada. <a href="#/">Pipeline</a></div>'; },
    after: () => router.highlight(document.querySelector('.admin-sidebar'))
  });
  startPanel({ shell, router, db, auth });
  window.__openLeads = () => db.count('leads', l => mine(l) && isOpenLead(l));
}
