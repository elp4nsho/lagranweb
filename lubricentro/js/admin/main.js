// Panel de administración de Pits Rápido.
import { mountAdmin } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { settings, lowStock, today, iso } from '../shared/domain.js';
import dashboard from './dashboard.js';
import jobs from './jobs.js';
import services from './services.js';
import inventory from './inventory.js';
import purchases from './purchases.js';
import branches from './branches.js';
import staff from './staff.js';
import customers from './customers.js';
import plans from './plans.js';
import coupons from './coupons.js';
import campaigns from './campaigns.js';
import content from './content.js';
import users from './users.js';
import log from './log.js';

try {
  auth.require(['admin', 'jefe', 'recepcion']);
  mountAdmin({
    root: document.getElementById('app'), db, auth, brand: settings().name || 'Pits Rápido', logo: '🛢️',
    sections: [dashboard, jobs, customers, services, inventory, purchases, branches, staff, plans, coupons, campaigns, content, users, log],
    links: [{ href: 'recepcion.html', icon: '🧾', label: 'Recepción y caja', roles: ['admin', 'jefe', 'recepcion'] }, { href: 'operario.html', icon: '🔧', label: 'Tablero de bahías', roles: ['admin', 'jefe'] }, { href: 'index.html', icon: '🌐', label: 'Sitio público' }],
    home: u => u.role === 'recepcion' ? 'atenciones' : 'dashboard',
    counts: () => {
      const u = auth.current(), b = u?.role === 'admin' ? '' : u?.branchId;
      return {
        atenciones: db.count('jobs', j => (!b || j.branchId === b) && ['en-fila', 'listo'].includes(j.status)),
        inventario: lowStock(b).length,
        compras: db.count('purchaseOrders', p => p.status === 'enviada' && (!b || p.branchId === b))
      };
    }
  });
} catch (e) { if (e.message !== 'auth-redirect') throw e; }
