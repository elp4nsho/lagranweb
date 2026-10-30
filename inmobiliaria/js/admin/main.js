// Panel de administración de Hogar Austral. Permisos por rol: admin (todo) y editor (contenido).
import { toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/kit.js';
import { renderDashboard } from './dashboard.js';
import { renderProperties } from './properties.js';
import { renderProjects } from './projects.js';
import { renderAgents } from './agents.js';
import { renderLeads } from './leads.js';
import { renderVisits } from './visits.js';
import { renderOwners } from './owners.js';
import { renderContracts } from './contracts.js';
import { renderCMS } from './cms.js';
import { renderSettings } from './settings.js';
import { renderUsers } from './users.js';
import { renderActivity } from './activity.js';

let user;
try { user = auth.require(['admin', 'editor'], 'login.html'); } catch (e) { /* redirigiendo al login */ }

if (user) {
  const ALL = ['admin'], CONTENT = ['admin', 'editor'];
  mountShell({
    auth, db, user, brand: 'Hogar Austral', logo: 'H', subtitle: 'Panel de gestión',
    links: '<a class="btn btn-sm btn-block" href="index.html" target="_blank" rel="noopener">Ver sitio público ↗</a><a class="btn btn-sm btn-block btn-ghost" href="agente.html">App corredores</a>',
    onReset: () => { db.reset(); toast('Datos demo restablecidos', 'success'); setTimeout(() => location.reload(), 500); },
    sections: [
      { id: 'dashboard', label: 'Dashboard', ico: '📊', group: 'General', render: renderDashboard },
      { id: 'propiedades', label: 'Propiedades', ico: '🏠', group: 'Inventario', roles: CONTENT, render: renderProperties, count: () => db.count('properties', p => p.status === 'revision') },
      { id: 'proyectos', label: 'Proyectos nuevos', ico: '🏗️', group: 'Inventario', roles: CONTENT, render: renderProjects },
      { id: 'leads', label: 'Leads', ico: '📥', group: 'Comercial', roles: ALL, render: renderLeads, count: () => db.count('leads', l => !l.agentId) },
      { id: 'visitas', label: 'Visitas', ico: '📅', group: 'Comercial', roles: ALL, render: renderVisits, count: () => db.count('visits', v => v.status === 'pendiente') },
      { id: 'agentes', label: 'Corredores y oficinas', ico: '🧑‍💼', group: 'Comercial', roles: ALL, render: renderAgents },
      { id: 'propietarios', label: 'Propietarios', ico: '🔑', group: 'Comercial', roles: ALL, render: renderOwners },
      { id: 'contratos', label: 'Contratos y arriendos', ico: '📄', group: 'Comercial', roles: ALL, render: renderContracts, count: () => db.all('contracts').filter(c => c.status === 'vigente').reduce((s, c) => s + c.payments.filter(p => p.status === 'atrasado').length, 0) },
      { id: 'cms', label: 'Contenido del sitio', ico: '🖼️', group: 'Sitio', roles: CONTENT, render: renderCMS },
      { id: 'configuracion', label: 'Configuración y UF', ico: '⚙️', group: 'Sistema', roles: ALL, render: renderSettings },
      { id: 'usuarios', label: 'Usuarios y roles', ico: '👥', group: 'Sistema', roles: ALL, render: renderUsers },
      { id: 'bitacora', label: 'Bitácora', ico: '🧾', group: 'Sistema', roles: ALL, render: renderActivity }
    ]
  });
}
