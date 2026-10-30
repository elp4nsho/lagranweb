// Usuarios y roles (solo administrador).
import { usersSection, escape } from '../shared/admin-kit.js';
import { db, ROLES } from '../data/db.js';
import { AREAS } from '../data/seed.js';
import { getCompany } from '../data/model.js';

export function renderUsers(el, _p, ctx) {
  usersSection(el, ctx, {
    roles: ROLES, roleKinds: { admin: 'danger', prevencionista: 'warning', supervisor: 'info', trabajador: 'primary' },
    subtitle: 'Administra accesos de todo el personal. Prevencionistas gestionan contenido; supervisores ven solo su equipo; trabajadores realizan inducciones.',
    extraColumns: [{ key: 'area', label: 'Área / empresa', render: u => `${escape(u.area || '—')}<br><small class="muted">${escape(getCompany(u.companyId)?.name || '—')}</small>` }],
    extraFields: () => [
      { name: 'area', label: 'Área', type: 'select', options: AREAS, half: true },
      { name: 'companyId', label: 'Empresa', type: 'select', options: db.all('companies').map(c => [c.id, c.name]), half: true }
    ]
  });
  const p = document.createElement('p');
  p.className = 'ak-note small';
  p.innerHTML = '<b>Permisos por rol:</b> Administrador: todo. Prevencionista: contenido, trabajadores, evaluaciones, certificados y reportes (sin usuarios ni configuración). Supervisor: app de supervisor con su equipo. Trabajador: app de inducciones.';
  el.appendChild(p);
}
