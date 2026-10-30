// Permisos por rol de la consola (se aplican al menú, a las rutas y a las acciones).
const ALL = ['admin', 'despachador', 'soporte'];
export const SECTIONS = [
  { group: 'Operación', id: 'dashboard', path: '/', label: 'Dashboard', ico: '◧', roles: ALL },
  { group: 'Operación', id: 'ops', path: '/operaciones', label: 'Operaciones en vivo', ico: '🗺', roles: ['admin', 'despachador'] },
  { group: 'Operación', id: 'envios', path: '/envios', label: 'Envíos', ico: '📦', roles: ALL },
  { group: 'Operación', id: 'repartidores', path: '/repartidores', label: 'Repartidores', ico: '🛵', roles: ['admin', 'despachador'] },
  { group: 'Clientes', id: 'clientes', path: '/clientes', label: 'Clientes', ico: '🏢', roles: ['admin', 'soporte'] },
  { group: 'Clientes', id: 'facturacion', path: '/facturacion', label: 'Facturación', ico: '$', roles: ['admin', 'soporte'] },
  { group: 'Clientes', id: 'incidencias', path: '/incidencias', label: 'Incidencias', ico: '!', roles: ALL },
  { group: 'Negocio', id: 'tarifas', path: '/tarifas', label: 'Tarifas y zonas', ico: '⚖', roles: ['admin'] },
  { group: 'Negocio', id: 'reportes', path: '/reportes', label: 'Reportes', ico: '📈', roles: ['admin', 'despachador'] },
  { group: 'Sistema', id: 'usuarios', path: '/usuarios', label: 'Usuarios y roles', ico: '👥', roles: ['admin'] },
  { group: 'Sistema', id: 'ajustes', path: '/ajustes', label: 'Ajustes y CMS', ico: '⚙', roles: ['admin'] },
  { group: 'Sistema', id: 'actividad', path: '/actividad', label: 'Actividad', ico: '⏱', roles: ['admin'] }
];
export const ACTIONS = {
  'envios.create': ALL,
  'envios.assign': ['admin', 'despachador'],
  'envios.status': ['admin', 'despachador'],
  'envios.cancel': ['admin', 'despachador', 'soporte'],
  'envios.delete': ['admin'],
  'envios.chat': ALL,
  'couriers.edit': ['admin', 'despachador'],
  'couriers.delete': ['admin'],
  'couriers.docs': ['admin', 'despachador'],
  'clientes.edit': ['admin', 'soporte'],
  'clientes.delete': ['admin'],
  'facturas.edit': ['admin', 'soporte'],
  'incidencias.edit': ['admin', 'soporte'],
  'sim.control': ['admin', 'despachador']
};
export const can = (user, action) => !!user && (ACTIONS[action] || []).includes(user.role);
export const sectionFor = path => SECTIONS.filter(s => s.path !== '/').find(s => path === s.path || path.startsWith(s.path + '/')) || SECTIONS[0];
export const allowed = (user, sec) => sec.roles.includes(user.role);
