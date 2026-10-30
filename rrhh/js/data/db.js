// Base de datos simulada de Grupo Cordillera (portal de empleos, autoservicio y RRHH).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('rrhh', { version: 1, seed });
export const auth = createAuth(db, { roles: { admin: 'Admin RRHH', jefatura: 'Jefatura', empleado: 'Empleado', reclutador: 'Reclutador' } });
export const homeFor = u => !u ? 'login.html' : ['admin', 'reclutador'].includes(u.role) ? 'admin.html' : 'portal.html';
