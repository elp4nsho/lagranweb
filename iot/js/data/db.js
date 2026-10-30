// Base de datos local, autenticación y permisos por rol de Sentinela.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('iot', { version: 3, seed });
export const ROLES = { admin: 'Administrador', ingeniero: 'Ingeniero', operador: 'Operador', lectura: 'Solo lectura' };
export const auth = createAuth(db, { roles: ROLES });
const ALL = Object.keys(ROLES);

// Permisos: sección → roles con lectura / escritura. Las secciones "app.*" son de la consola operativa
// y las "admin.*" del panel de administración.
export const PERMS = {
  'app.alarmas': { read: ALL, write: ['admin', 'ingeniero', 'operador'] },
  'app.reglas': { read: ALL, write: ['admin', 'ingeniero'] },
  'app.ordenes': { read: ALL, write: ['admin', 'ingeniero', 'operador'] },
  'app.turnos': { read: ALL, write: ['admin', 'ingeniero', 'operador'] },
  'admin.panel': { read: ['admin', 'ingeniero', 'lectura'], write: [] },
  'admin.sitios': { read: ['admin', 'ingeniero', 'lectura'], write: ['admin', 'ingeniero'] },
  'admin.dispositivos': { read: ['admin', 'ingeniero', 'lectura'], write: ['admin', 'ingeniero'] },
  'admin.firmware': { read: ['admin', 'ingeniero', 'lectura'], write: ['admin', 'ingeniero'] },
  'admin.usuarios': { read: ['admin', 'lectura'], write: ['admin'] },
  'admin.apikeys': { read: ['admin'], write: ['admin'] },
  'admin.auditoria': { read: ['admin', 'lectura'], write: [] },
  'admin.exportar': { read: ['admin', 'ingeniero', 'lectura'], write: [] },
  'admin.web': { read: ['admin', 'lectura'], write: ['admin'] },
};
export const can = (u, section, mode = 'read') => !!(u && PERMS[section]?.[mode].includes(u.role));

export function guard(roles, redirect = 'login.html') {
  const u = auth.current();
  if (!u || u.active === false || (roles && !roles.includes(u.role))) {
    location.replace(`${redirect}?next=${encodeURIComponent(location.pathname.split('/').pop() + location.hash)}`);
    return null;
  }
  return u;
}
export const userName = id => db.get('users', id)?.name || '—';
export const site = () => db.getValue('site', {});
