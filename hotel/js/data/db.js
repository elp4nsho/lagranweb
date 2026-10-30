// Base de datos y autenticación de Hotel Bahía Lumen.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('hotel', { version: 2, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', recepcion: 'Recepción', housekeeping: 'Housekeeping', revenue: 'Revenue manager', guest: 'Huésped' }
});
export const HOME = { admin: 'admin.html', recepcion: 'admin.html#/recepcion', housekeeping: 'limpieza.html', revenue: 'admin.html#/dashboard', guest: 'index.html#/portal' };
