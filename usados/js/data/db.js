// Base de datos y autenticación de Ruta Certificada.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('usados', { version: 1, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', gerente: 'Gerente comercial', vendedor: 'Vendedor', inspector: 'Inspector', taller: 'Taller y servicios', cliente: 'Cliente' }
});
export const STAFF = ['admin', 'gerente', 'vendedor', 'taller'];
export const HOME = { admin: 'admin.html', gerente: 'admin.html', vendedor: 'vendedor.html', inspector: 'inspector.html', taller: 'admin.html#/servicios', cliente: 'index.html#/cuenta' };
export const PAGE_ROLES = { 'admin.html': STAFF, 'vendedor.html': ['admin', 'gerente', 'vendedor'], 'inspector.html': ['admin', 'gerente', 'inspector'], 'index.html': Object.keys(HOME) };
