// App del residente: gastos comunes, pagos, reservas, visitas, encomiendas, incidencias, avisos, votaciones y documentos.
import { db, auth, settings, isPublished } from '../data/db.js';
import { mountShell } from '../shared/kit.js';
import { icon } from '../shared/icons.js';
import { renderHome } from './home.js';
import { renderExpenses, renderPayments } from './expenses.js';
import { renderBookings } from './bookings.js';
import { renderVisitors } from './visitors.js';
import { renderParcels } from './parcels.js';
import { renderTickets } from './tickets.js';
import { renderBoard, renderPolls } from './board.js';
import { renderDocuments } from './documents.js';

let user;
try { user = auth.require(['residente', 'comite'], 'login.html'); } catch (e) { /* redirigiendo */ }
if (user) {
  const unit = db.get('units', user.unitId);
  if (!unit) {
    document.getElementById('app').innerHTML = '<div class="login-wrap"><div class="card empty"><h2>Tu cuenta no tiene una unidad asociada</h2><p>Pide a la administración que vincule tu departamento.</p><a class="btn" href="login.html">Volver</a></div></div>';
  } else {
    const U = { unit, unitId: unit.id };
    const wrap = fn => (el, p, q, ctx) => fn(el, p, q, ctx, U);
    mountShell({
      auth, db, user, brand: 'Vecindario', logo: '⌂', subtitle: `Depto ${unit.tower}-${unit.number}`,
      links: (user.role === 'comite' ? '<a class="btn btn-sm btn-block" href="admin.html">Panel del comité</a>' : '') + '<a class="btn btn-sm btn-block btn-ghost" href="index.html">Sitio de Vecindario</a>',
      sections: [
        { id: 'inicio', label: 'Inicio', ico: icon('home', 17), group: 'Mi depto', render: wrap(renderHome) },
        { id: 'gastos', label: 'Gastos comunes', ico: icon('money', 17), group: 'Mi depto', render: wrap(renderExpenses), count: () => db.count('charges', c => isPublished(c.period) && c.unitId === unit.id && !c.paid) },
        { id: 'pagos', label: 'Historial de pagos', ico: icon('check', 17), group: 'Mi depto', render: wrap(renderPayments) },
        { id: 'reservas', label: 'Reservas', ico: icon('calendar', 17), group: 'Servicios', render: wrap(renderBookings) },
        { id: 'visitas', label: 'Visitas', ico: icon('qr', 17), group: 'Servicios', render: wrap(renderVisitors), count: () => db.count('visitors', v => v.unitId === unit.id && v.status === 'esperada') },
        { id: 'encomiendas', label: 'Encomiendas', ico: icon('box', 17), group: 'Servicios', render: wrap(renderParcels), count: () => db.count('parcels', p => p.unitId === unit.id && p.status === 'conserjeria') },
        { id: 'incidencias', label: 'Incidencias', ico: icon('wrench', 17), group: 'Servicios', render: wrap(renderTickets), count: () => db.count('tickets', t => t.unitId === unit.id && !['resuelto', 'cerrado'].includes(t.status)) },
        { id: 'avisos', label: 'Avisos', ico: icon('megaphone', 17), group: 'Comunidad', render: wrap(renderBoard) },
        { id: 'votaciones', label: 'Votaciones', ico: icon('vote', 17), group: 'Comunidad', render: wrap(renderPolls), count: () => db.count('polls', p => p.status === 'abierta' && !p.votes.some(v => v.unitId === unit.id)) },
        { id: 'documentos', label: 'Documentos', ico: icon('doc', 17), group: 'Comunidad', render: wrap(renderDocuments) }
      ]
    });
  }
}
export { settings };
