// Base de datos y autenticación compartidas por el sitio, el aula, la app de instructores y el panel.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('academia', { version: 3, seed });
export const ROLES = { admin: 'Administrador', soporte: 'Soporte', instructor: 'Instructor', estudiante: 'Estudiante' };
export const auth = createAuth(db, { roles: ROLES });
export const homeFor = role => ({ estudiante: 'aprender.html', instructor: 'instructor.html', admin: 'admin.html', soporte: 'admin.html' }[role] || 'index.html');
