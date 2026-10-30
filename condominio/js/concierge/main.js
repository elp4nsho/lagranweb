// App de conserjería: visitas (check-in/out y validación de códigos), encomiendas, bitácora de novedades y búsqueda de residentes.
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/kit.js';
import { icon } from '../shared/icons.js';
import { renderDesk } from './desk.js';
import { renderVisits } from './visits.js';
import { renderParcels } from './parcels.js';
import { renderLog } from './log.js';
import { renderLookup } from './lookup.js';

let user;
try { user = auth.require(['conserje', 'administrador'], 'login.html'); } catch (e) { /* redirigiendo */ }
if (user) {
  const today = () => new Date().toISOString().slice(0, 10);
  mountShell({
    auth, db, user, brand: 'Conserjería', logo: '⌂', subtitle: 'Comunidad Plaza Ñuñoa',
    links: user.role === 'administrador' ? '<a class="btn btn-sm btn-block" href="admin.html">Panel de administración</a>' : '',
    sections: [
      { id: 'turno', label: 'Mi turno', ico: icon('shield', 17), render: renderDesk },
      { id: 'visitas', label: 'Visitas', ico: icon('qr', 17), render: renderVisits, count: () => db.count('visitors', v => v.status === 'dentro') },
      { id: 'encomiendas', label: 'Encomiendas', ico: icon('box', 17), render: renderParcels, count: () => db.count('parcels', p => p.status === 'conserjeria') },
      { id: 'bitacora', label: 'Novedades y rondas', ico: icon('doc', 17), render: renderLog, count: () => db.count('logbook', l => l.at.slice(0, 10) === today()) },
      { id: 'residentes', label: 'Buscar residente', ico: icon('search', 17), render: renderLookup }
    ]
  });
}
