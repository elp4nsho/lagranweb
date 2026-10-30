// Base de datos y autenticación de Atiende (compartidas por centro de ayuda, portal, consola y admin).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('soporte', { version: 1, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', supervisor: 'Supervisor', agente: 'Agente', cliente: 'Cliente' } });
export const ROLE_IDS = ['admin', 'supervisor', 'agente', 'cliente'];
export const STAFF = ['admin', 'supervisor', 'agente'];
// Página de inicio según rol
export const homeFor = u => !u ? 'login.html' : u.role === 'cliente' ? 'portal.html' : u.role === 'admin' ? 'admin.html' : 'agente.html';
