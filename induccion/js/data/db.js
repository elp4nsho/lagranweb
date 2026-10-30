// Base de datos y autenticación de la app (compartidas por sitio, app del trabajador, supervisor y panel).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('induccion', { version: 5, seed });
export const ROLES = { admin: 'Administrador', prevencionista: 'Prevencionista', supervisor: 'Supervisor', trabajador: 'Trabajador' };
export const auth = createAuth(db, { roles: ROLES });

// Página de inicio según rol
export const homeFor = role => ({ trabajador: 'app.html', supervisor: 'supervisor.html', admin: 'admin.html', prevencionista: 'admin.html' }[role] || 'index.html');
