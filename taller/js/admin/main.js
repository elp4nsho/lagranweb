// Panel de Mecánica Integral Los Andes (administración, jefe de taller, asesores y bodega).
import { mountAdmin } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { settings, openOTs } from '../shared/domain.js';
import dashboard from './dashboard.js';
import board from './board.js';
import ots from './ots.js';
import requests from './requests.js';
import parts from './parts.js';
import customers from './customers.js';
import insurance from './insurance.js';
import { invoices, warranties } from './docs.js';
import mechanics from './mechanics.js';
import content from './content.js';
import users from './users.js';
import log from './log.js';

try {
  auth.require(['admin', 'jefe', 'asesor', 'bodega']);
  mountAdmin({
    root: document.getElementById('app'), db, auth, brand: settings().short || 'Los Andes', logo: '🔧',
    sections: [dashboard, board, ots, requests, mechanics, customers, insurance, warranties, invoices, parts, content, users, log],
    links: [{ href: 'mecanico.html', icon: '📱', label: 'App del mecánico', roles: ['admin', 'jefe'] }, { href: 'aseguradora.html', icon: '🛡️', label: 'Portal aseguradoras', roles: ['admin'] }, { href: 'index.html', icon: '🌐', label: 'Sitio público' }],
    home: u => ({ admin: 'dashboard', jefe: 'tablero', asesor: 'tablero', bodega: 'repuestos' })[u.role],
    counts: () => ({
      tablero: openOTs().filter(o => Date.parse(o.promisedAt) < Date.now()).length,
      solicitudes: db.count('requests', r => r.status === 'nueva'),
      repuestos: db.count('partRequests', r => r.status === 'solicitado'),
      seguros: db.count('claims', c => ['denunciado', 'mas-info'].includes(c.status))
    })
  });
} catch (e) { if (e.message !== 'auth-redirect') throw e; }
