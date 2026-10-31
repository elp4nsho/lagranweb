// Base de datos y autenticación de Atelier Torque.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('atelier', { version: 3, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', gerente: 'Gerente de servicio', asesor: 'Asesor de servicio', tecnico: 'Técnico', chofer: 'Chofer concierge', cliente: 'Cliente' }
});
export const STAFF = ['admin', 'gerente', 'asesor'];
export const HOME = { admin: 'admin.html', gerente: 'admin.html', asesor: 'admin.html#/ordenes', tecnico: 'tecnico.html', chofer: 'chofer.html', cliente: 'index.html#/garage' };
export const PAGE_ROLES = { 'admin.html': STAFF, 'tecnico.html': ['admin', 'gerente', 'tecnico'], 'chofer.html': ['admin', 'gerente', 'asesor', 'chofer'], 'index.html': Object.keys(HOME) };
