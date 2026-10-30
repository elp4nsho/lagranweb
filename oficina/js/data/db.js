// Base de datos simulada compartida por el sitio público, las apps y el panel.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('oficina', { version: 5, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', rrhh: 'RRHH', recepcion: 'Recepción', empleado: 'Empleado' } });

// Qué secciones del panel ve cada rol (se aplica en menú y rutas).
export const ADMIN_ROLES = ['admin', 'rrhh', 'recepcion'];
export const homeFor = u => !u ? 'login.html' : u.role === 'empleado' ? 'empleado.html' : u.role === 'recepcion' ? 'recepcion.html' : 'admin.html';
