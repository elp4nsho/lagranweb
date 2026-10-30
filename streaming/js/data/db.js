// Base de datos y autenticación compartidas por todas las páginas de Andes+.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('streaming', { version: 3, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', editor: 'Editor de contenido', soporte: 'Soporte', suscriptor: 'Suscriptor' } });
export const settings = () => db.getValue('settings', {});
export const STAFF = ['admin', 'editor', 'soporte'];
export const HOME_BY_ROLE = { admin: 'admin.html', editor: 'admin.html', soporte: 'admin.html', suscriptor: 'perfiles.html' };
export function notify(userId, text) { if (userId) db.insert('notifications', { userId, text, read: false }); }
