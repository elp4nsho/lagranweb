// Permisos por rol de Atiende. Se aplican al menú y a cada ruta.
import { auth } from '../data/db.js';

const MATRIX = {
  'console': ['admin', 'supervisor', 'agente'],
  'tickets.all': ['admin', 'supervisor'],          // ver tickets de todos los grupos
  'tickets.merge': ['admin', 'supervisor', 'agente'],
  'tickets.delete': ['admin'],
  'admin.access': ['admin', 'supervisor'],
  'reports.view': ['admin', 'supervisor'],
  'kb.edit': ['admin', 'supervisor'],
  'macros.edit': ['admin', 'supervisor'],
  'incidents.edit': ['admin', 'supervisor'],
  'teams.manage': ['admin', 'supervisor'],
  'sla.edit': ['admin'],
  'automations.edit': ['admin'],
  'users.manage': ['admin'],
  'settings.edit': ['admin'],
  'log.view': ['admin', 'supervisor'],
  'data.reset': ['admin']
};
export const PERM_LABELS = {
  console: 'Consola de agentes', 'tickets.all': 'Ver tickets de todos los grupos', 'tickets.merge': 'Fusionar tickets', 'tickets.delete': 'Eliminar tickets',
  'admin.access': 'Entrar a Administración', 'reports.view': 'Ver métricas', 'kb.edit': 'Editar base de conocimiento', 'macros.edit': 'Editar macros',
  'incidents.edit': 'Publicar incidentes', 'teams.manage': 'Gestionar grupos', 'sla.edit': 'Editar políticas SLA', 'automations.edit': 'Editar automatizaciones',
  'users.manage': 'Gestionar usuarios y roles', 'settings.edit': 'Configurar centro de ayuda', 'log.view': 'Ver bitácora', 'data.reset': 'Restablecer datos demo'
};
export const MATRIX_VIEW = MATRIX;
export const can = (perm, user = auth.current()) => !!user && user.active !== false && (MATRIX[perm] || []).includes(user.role);
