// "Backend" de Cóndor Pay: base de datos local + autenticación + permisos por rol.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('fintech', { version: 4, seed });

export const ROLES = {
  admin: 'Administrador',
  riesgo: 'Analista de riesgo',
  ejecutivo: 'Ejecutivo',
  auditor: 'Auditor (solo lectura)',
  cliente: 'Cliente',
};
export const auth = createAuth(db, { roles: ROLES });
export const STAFF = ['admin', 'riesgo', 'ejecutivo', 'auditor'];

// Matriz de permisos del back-office: sección → roles que pueden ver / modificar.
const ALL = STAFF;
export const PERMS = {
  dashboard: { read: ALL, write: [] },
  kyc: { read: ALL, write: ['admin', 'riesgo', 'ejecutivo'] },
  cuentas: { read: ALL, write: ['admin', 'riesgo'] },
  fraude: { read: ['admin', 'riesgo', 'auditor'], write: ['admin', 'riesgo'] },
  creditos: { read: ['admin', 'riesgo', 'ejecutivo', 'auditor'], write: ['admin', 'riesgo'] },
  tarjetas: { read: ALL, write: ['admin', 'riesgo', 'ejecutivo'] },
  productos: { read: ['admin', 'auditor'], write: ['admin'] },
  soporte: { read: ['admin', 'ejecutivo', 'auditor'], write: ['admin', 'ejecutivo'] },
  auditoria: { read: ['admin', 'auditor'], write: [] },
  usuarios: { read: ['admin', 'auditor'], write: ['admin'] },
};
export function can(user, section, mode = 'read') {
  const p = PERMS[section];
  return !!(user && p && p[mode].includes(user.role));
}

// Protege una página: devuelve el usuario o redirige (sin lanzar errores a la consola).
export function guard(roles, redirect = 'login.html') {
  const u = auth.current();
  if (!u || u.active === false || (roles && !roles.includes(u.role))) {
    const back = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
    location.replace(`${redirect}?next=${back}`);
    return null;
  }
  return u;
}

export const site = () => db.getValue('site', {});
export const fee = id => (site().fees || []).find(f => f.id === id)?.value ?? 0;
export const userName = id => db.get('users', id)?.name || '—';
