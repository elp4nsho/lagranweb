// Base de datos y autenticación compartidas por el sitio, el panel y las apps por rol.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('colegio', { version: 3, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Dirección', utp: 'Jefe/a UTP', profesor: 'Profesor/a', apoderado: 'Apoderado/a', estudiante: 'Estudiante' }
});

// Página de inicio de cada rol después de entrar.
export const HOME_BY_ROLE = { admin: 'admin.html', utp: 'admin.html', profesor: 'profesor.html', apoderado: 'apoderado.html', estudiante: 'estudiante.html' };

// Protege una página: si no hay sesión o el rol no corresponde, redirige sin lanzar errores a la consola.
export function guardPage(roles) {
  const u = auth.current();
  if (!u || u.active === false || !roles.includes(u.role)) {
    const back = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
    location.replace(u && HOME_BY_ROLE[u.role] && !roles.includes(u.role) ? `login.html?denied=1&next=${back}` : `login.html?next=${back}`);
    return null;
  }
  return u;
}

export function logout() {
  auth.logout();
  location.href = 'login.html';
}
