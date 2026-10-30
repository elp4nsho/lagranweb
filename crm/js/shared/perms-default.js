// Catálogo de permisos y su asignación por defecto a cada rol.
export const PERMS = [
  ['team.view', 'Ver métricas y negocios de todo el equipo', 'Ventas'],
  ['deals.delete', 'Eliminar negocios y leads', 'Ventas'],
  ['leads.assign', 'Asignar leads a otros ejecutivos', 'Ventas'],
  ['products.edit', 'Editar catálogo de productos', 'Ventas'],
  ['templates.edit', 'Crear y editar plantillas y secuencias', 'Correo'],
  ['reports.view', 'Ver reportes', 'Análisis'],
  ['goals.edit', 'Definir metas por ejecutivo', 'Análisis'],
  ['import', 'Importar contactos', 'Datos'],
  ['export', 'Exportar a CSV', 'Datos'],
  ['admin.access', 'Entrar a Administración', 'Administración'],
  ['teams.manage', 'Gestionar equipos', 'Administración'],
  ['automations.edit', 'Gestionar automatizaciones', 'Administración'],
  ['site.edit', 'Editar el sitio web (CMS)', 'Administración'],
  ['log.view', 'Ver bitácora de actividad', 'Administración'],
  ['users.manage', 'Gestionar usuarios y roles', 'Sistema'],
  ['settings.edit', 'Configuración del sistema', 'Sistema'],
  ['data.reset', 'Restablecer datos demo', 'Sistema']
];
export const DEFAULT_PERMS = {
  admin: PERMS.map(p => p[0]),
  gerente: ['team.view', 'deals.delete', 'leads.assign', 'products.edit', 'templates.edit', 'reports.view', 'goals.edit', 'import', 'export', 'admin.access', 'teams.manage', 'automations.edit', 'log.view'],
  ejecutivo: ['reports.view', 'import', 'export']
};
