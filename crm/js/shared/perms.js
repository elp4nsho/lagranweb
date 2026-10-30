// Permisos efectivos: el administrador siempre puede todo; el resto según la matriz guardada.
import { db, auth } from '../data/db.js';
import { DEFAULT_PERMS } from './perms-default.js';
export { PERMS, DEFAULT_PERMS } from './perms-default.js';

export function can(perm, user = auth.current()) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const matrix = db.getValue('perms', DEFAULT_PERMS);
  return (matrix[user.role] || []).includes(perm);
}
// ¿Puede ver todo el equipo o solo lo propio?
export const seesAll = (user = auth.current()) => can('team.view', user);
// Filtros de visibilidad por propietario.
export const visibleDeals = (user = auth.current()) => db.query('deals', d => seesAll(user) || d.ownerId === user.id);
export const visibleLeads = (user = auth.current()) => db.query('leads', l => seesAll(user) || l.ownerId === user.id || !l.ownerId);
export const visibleActs = (user = auth.current()) => db.query('activities', a => seesAll(user) || a.ownerId === user.id);
export const canSeeDeal = (d, user = auth.current()) => !!d && (seesAll(user) || d.ownerId === user.id);
