// Base de datos y autenticación compartidas por todas las páginas de Tiquetera Volcán.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('eventos', { version: 7, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', soporte: 'Soporte', productor: 'Productor', staff: 'Staff de acceso', cliente: 'Cliente' }
});
export const settings = () => db.getValue('settings', {});
export const fees = () => settings().fees || {};
export function notify(userId, text) { if (userId) db.insert('notifications', { userId, text, read: false }); }
// Dónde aterriza cada rol después de iniciar sesión.
export const HOME_BY_ROLE = { admin: 'admin.html', soporte: 'admin.html', productor: 'productor.html', staff: 'acceso.html', cliente: 'index.html#/mis-entradas' };
