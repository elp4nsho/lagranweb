// Base de datos y autenticación compartidas por el sitio, el panel y las apps de cliente y freelancer.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('marketplace', { version: 2, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', moderador: 'Moderador', soporte: 'Soporte', freelancer: 'Freelancer', cliente: 'Cliente' }
});
export const HOME_BY_ROLE = { admin: 'admin.html', moderador: 'admin.html', soporte: 'admin.html', freelancer: 'freelancer.html', cliente: 'cliente.html' };

// Protege una página sin lanzar errores a la consola.
export function guardPage(roles) {
  const u = auth.current();
  if (!u || u.active === false || !roles.includes(u.role)) {
    const back = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
    location.replace(`login.html?${u ? 'denied=1&' : ''}next=${back}`);
    return null;
  }
  return u;
}
export function logout() { auth.logout(); location.href = 'login.html'; }
