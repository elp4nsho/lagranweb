// Panel de administración de la comunidad. Roles: administrador (todo) y comité (consulta y comunicación).
import { toast } from '../../../assets/core/ui.js';
import { db, auth, settings } from '../data/db.js';
import { mountShell } from '../shared/kit.js';
import { icon } from '../shared/icons.js';
import { isOverdue } from '../shared/format.js';
import { renderDashboard } from './dashboard.js';
import { renderUnits } from './units.js';
import { renderExpenses } from './expenses.js';
import { renderDebtors } from './debtors.js';
import { renderSpaces } from './spaces.js';
import { renderTickets } from './tickets.js';
import { renderProviders } from './providers.js';
import { renderComms } from './comms.js';
import { renderAssemblies } from './assemblies.js';
import { renderStaff } from './staff.js';
import { renderUsers } from './users.js';
import { renderSettings } from './settings.js';
import { renderActivity } from './activity.js';

let user;
try { user = auth.require(['administrador', 'comite'], 'login.html'); } catch (e) { /* redirigiendo */ }
if (user) {
  const A = ['administrador'], AC = ['administrador', 'comite'];
  mountShell({
    auth, db, user, brand: 'Vecindario', logo: '⌂', subtitle: 'Plaza Ñuñoa · Admin',
    links: (user.unitId ? '<a class="btn btn-sm btn-block" href="residente.html">Mi app de residente</a>' : '<a class="btn btn-sm btn-block" href="conserjeria.html">Conserjería</a>') + '<a class="btn btn-sm btn-block btn-ghost" href="index.html" target="_blank" rel="noopener">Sitio público ↗</a>',
    onReset: user.role === 'administrador' ? () => { db.reset(); toast('Datos demo restablecidos', 'success'); setTimeout(() => location.reload(), 500); } : null,
    sections: [
      { id: 'dashboard', label: 'Dashboard', ico: icon('home', 17), group: 'General', render: renderDashboard },
      { id: 'gastos', label: 'Gastos comunes', ico: icon('money', 17), group: 'Finanzas', roles: AC, render: renderExpenses, count: () => db.count('periods', p => p.status === 'borrador') },
      { id: 'morosos', label: 'Morosidad', ico: icon('bell', 17), group: 'Finanzas', roles: AC, render: renderDebtors, count: () => new Set(db.query('charges', c => isOverdue(c, settings())).map(c => c.unitId)).size },
      { id: 'unidades', label: 'Unidades y residentes', ico: icon('building', 17), group: 'Comunidad', roles: A, render: renderUnits },
      { id: 'espacios', label: 'Espacios comunes', ico: icon('calendar', 17), group: 'Comunidad', roles: A, render: renderSpaces },
      { id: 'mantencion', label: 'Mantención', ico: icon('wrench', 17), group: 'Operación', roles: AC, render: renderTickets, count: () => db.count('tickets', t => t.status === 'abierto') },
      { id: 'proveedores', label: 'Proveedores', ico: icon('key', 17), group: 'Operación', roles: A, render: renderProviders },
      { id: 'personal', label: 'Personal y turnos', ico: icon('users', 17), group: 'Operación', roles: A, render: renderStaff },
      { id: 'comunicaciones', label: 'Avisos y votaciones', ico: icon('megaphone', 17), group: 'Participación', roles: AC, render: renderComms },
      { id: 'asambleas', label: 'Asambleas y documentos', ico: icon('doc', 17), group: 'Participación', roles: AC, render: renderAssemblies },
      { id: 'usuarios', label: 'Usuarios y roles', ico: icon('user', 17), group: 'Sistema', roles: A, render: renderUsers },
      { id: 'configuracion', label: 'Configuración', ico: icon('shield', 17), group: 'Sistema', roles: A, render: renderSettings },
      { id: 'bitacora', label: 'Bitácora', ico: icon('clock', 17), group: 'Sistema', roles: A, render: renderActivity }
    ]
  });
}
