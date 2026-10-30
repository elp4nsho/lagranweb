// Panel de administración de Autoplaza Pacífico (roles: admin, gerente, analista, asesor).
import { createRouter } from '../../../assets/core/router.js';
import { db, auth, PAGE_ROLES } from '../data/db.js';
import { mountShell, startPanel, host } from '../shared/shell.js';
import { ymd } from '../shared/util.js';
import { renderDashboard } from './dashboard.js';
import { renderModels, renderModel } from './modelos.js';
import { renderAccessories } from './accesorios.js';
import { renderCampaigns } from './campanas.js';
import { renderInventory } from './inventario.js';
import { renderLeads } from './leads.js';
import { renderQuotes } from './cotizaciones.js';
import { renderSales } from './ventas.js';
import { renderDeliveries } from './entregas.js';
import { renderTradeIns } from './tasaciones.js';
import { renderFinProducts, renderFinApps } from './financiamiento.js';
import { renderAppointments } from './citas.js';
import { renderWorkOrders } from './ot.js';
import { renderPlans } from './planes.js';
import { renderRecalls } from './recalls.js';
import { renderParts } from './repuestos.js';
import { renderShowrooms } from './sucursales.js';
import { renderCMS } from './cms.js';
import { renderUsers } from './usuarios.js';
import { renderSettings } from './config.js';
import { renderLog } from './bitacora.js';

let user;
try { user = auth.require(PAGE_ROLES['admin.html']); } catch (e) { /* redirigiendo */ }

if (user) {
  const A = ['admin'], AG = ['admin', 'gerente'], FIN = ['admin', 'gerente', 'analista'], PV = ['admin', 'asesor'];
  const NAV = [
    { section: 'General' },
    { href: '#/', label: 'Dashboard', ico: 'chart', roles: AG },
    { section: 'Comercial' },
    { href: '#/modelos', label: 'Modelos y versiones', ico: 'car', roles: AG },
    { href: '#/accesorios', label: 'Accesorios', ico: 'box', roles: AG },
    { href: '#/campanas', label: 'Precios y campañas', ico: 'tag', roles: AG },
    { href: '#/inventario', label: 'Inventario por VIN', ico: 'grid', roles: AG, count: () => db.count('units', u => u.status === 'transito' && u.eta <= ymd()) },
    { href: '#/leads', label: 'Leads y asignación', ico: 'target', roles: AG, count: () => db.count('leads', l => l.stage === 'nuevo' && !l.sellerId) },
    { href: '#/cotizaciones', label: 'Cotizaciones', ico: 'file', roles: AG, count: () => db.count('quotes', q => q.status === 'pendiente_aprobacion') },
    { href: '#/ventas', label: 'Ventas y contratos', ico: 'handshake', roles: AG },
    { href: '#/entregas', label: 'Entregas', ico: 'key', roles: AG, count: () => db.count('units', u => u.status === 'vendido' && u.deliveryDate === ymd()) },
    { href: '#/tasaciones', label: 'Tasaciones', ico: 'swap', roles: AG, count: () => db.count('tradeins', t => t.status === 'estimada' || t.status === 'inspeccion') },
    { section: 'Financiamiento' },
    { href: '#/fin/solicitudes', label: 'Solicitudes de crédito', ico: 'card', roles: FIN, count: () => db.count('finApps', f => f.status === 'recibida') },
    { href: '#/fin/productos', label: 'Productos y tasas', ico: 'percent', roles: A },
    { section: 'Posventa' },
    { href: '#/citas', label: 'Citas de taller', ico: 'calendar', roles: PV, count: () => db.count('appointments', a => a.date === ymd() && a.status === 'agendada') },
    { href: '#/ot', label: 'Órdenes de trabajo', ico: 'wrench', roles: PV },
    { href: '#/pautas', label: 'Pautas y precios', ico: 'clipboard', roles: PV },
    { href: '#/recalls', label: 'Campañas recall', ico: 'alert', roles: PV },
    { href: '#/repuestos', label: 'Repuestos y solicitudes', ico: 'spray', roles: PV, count: () => db.count('requests', r => r.status === 'nueva') },
    { section: 'Sitio y sistema' },
    { href: '#/cms', label: 'Contenido del sitio', ico: 'megaphone', roles: AG },
    { href: '#/sucursales', label: 'Sucursales', ico: 'store', roles: A },
    { href: '#/usuarios', label: 'Usuarios y roles', ico: 'shield', roles: A },
    { href: '#/config', label: 'Configuración', ico: 'sliders', roles: A },
    { href: '#/bitacora', label: 'Bitácora', ico: 'list', roles: A }
  ];
  const apps = { gerente: '<a class="btn btn-sm hide-sm" href="vendedor.html">App ventas</a>', admin: '<a class="btn btn-sm hide-sm" href="vendedor.html">Ventas</a><a class="btn btn-sm hide-sm" href="credito.html">Crédito</a><a class="btn btn-sm hide-sm" href="posventa.html">Taller</a>', analista: '<a class="btn btn-sm" href="credito.html">App crédito</a>', asesor: '<a class="btn btn-sm" href="posventa.html">App taller</a>' };
  const shell = mountShell({ brand: 'Autoplaza', sub: 'Panel de gestión', user, auth, db, nav: NAV, topExtra: apps[user.role] || '', onReset: user.role === 'admin' ? () => router.refresh() : null });
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(host(v), params, query, { user, shell }); };
  const router = createRouter({
    '/': page('Dashboard', renderDashboard),
    '/modelos': page('Modelos y versiones', renderModels),
    '/modelos/:id': page('Editar modelo', renderModel),
    '/accesorios': page('Accesorios', renderAccessories),
    '/campanas': page('Precios y campañas', renderCampaigns),
    '/inventario': page('Inventario por VIN', renderInventory),
    '/leads': page('Leads y asignación', renderLeads),
    '/cotizaciones': page('Cotizaciones', renderQuotes),
    '/ventas': page('Ventas y contratos', renderSales),
    '/entregas': page('Entregas', renderDeliveries),
    '/tasaciones': page('Tasaciones', renderTradeIns),
    '/fin/solicitudes': page('Solicitudes de crédito', renderFinApps),
    '/fin/productos': page('Productos y tasas', renderFinProducts),
    '/citas': page('Citas de taller', renderAppointments),
    '/ot': page('Órdenes de trabajo', renderWorkOrders),
    '/pautas': page('Pautas y precios', renderPlans),
    '/recalls': page('Campañas recall', renderRecalls),
    '/repuestos': page('Repuestos y solicitudes', renderParts),
    '/cms': page('Contenido del sitio', renderCMS),
    '/sucursales': page('Sucursales', renderShowrooms),
    '/usuarios': page('Usuarios y roles', renderUsers),
    '/config': page('Configuración', renderSettings),
    '/bitacora': page('Bitácora', renderLog)
  }, {
    before: path => {
      if (!shell.can(path)) {
        if (path === '/') { const first = NAV.find(n => n.href && (!n.roles || n.roles.includes(user.role))); if (first) { router.go(first.href.slice(1)); return false; } }
        shell.crumb('Acceso restringido'); shell.denied(); router.highlight(document.querySelector('.admin-sidebar')); return false;
      }
    },
    notFound: () => { v.innerHTML = '<div class="card empty"><h2>Sección no encontrada</h2><a class="btn" href="#/">Ir al inicio</a></div>'; },
    after: () => router.highlight(document.querySelector('.admin-sidebar'))
  });
  startPanel({ shell, router, db, auth });
}
