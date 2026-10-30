// Base de datos y autenticación de Rayo Express (compartida por todas las páginas).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('rayo', { version: 5, seed });
const ROLES = { admin: 'Administrador', despachador: 'Despachador', soporte: 'Soporte', repartidor: 'Repartidor', cliente: 'Cliente' };
// Sesión "base" (la usa login.html para autenticar).
export const auth = createAuth(db, { roles: ROLES });

// El núcleo guarda UNA sesión por app y se comparte entre pestañas. Para que la consola,
// la app del repartidor y el portal cliente puedan estar abiertos a la vez en el mismo
// navegador (con distintos usuarios), cada área usa su propia clave de sesión: se crea
// la auth sobre una "vista" de la DB con otro nombre (mismos datos, otra clave).
const view = area => Object.assign(Object.create(db), { name: `rayo:${area}` });
export const STAFF = ['admin', 'despachador', 'soporte'];
export const areaOf = role => (STAFF.includes(role) ? 'staff' : role === 'repartidor' ? 'courier' : 'cliente');
export const authFor = {
  staff: createAuth(view('staff'), { roles: ROLES }),
  courier: createAuth(view('courier'), { roles: ROLES }),
  cliente: createAuth(view('cliente'), { roles: ROLES })
};
// Tras autenticar en login.html, abre la sesión del área correspondiente al rol.
export function openArea(u) { authFor[areaOf(u.role)].loginAs(u.id); }
// Usuario con sesión en cualquier área (para la cabecera pública).
export function anyUser() { return authFor.staff.current() || authFor.cliente.current() || authFor.courier.current() || null; }

// Datos de más de 5 días: se regeneran para que los gráficos y la operación sigan "al día".
if (Date.now() - (db.getValue('seededAt') || 0) > 5 * 864e5) db.reset();

// Protege una página sin lanzar errores: si no hay sesión válida redirige al login y
// detiene el módulo con una promesa que nunca se resuelve (core auth.require lanza 'auth-redirect').
export function guard(a, roles) {
  const u = a.current();
  if (u && u.active !== false && roles.includes(u.role)) return Promise.resolve(u);
  const back = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
  location.replace(`login.html?next=${back}`);
  return new Promise(() => {});
}

export function homeFor(u) {
  if (!u) return 'login.html';
  if (STAFF.includes(u.role)) return 'admin.html';
  if (u.role === 'repartidor') return 'repartidor.html';
  return 'cliente.html';
}
