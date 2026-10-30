// Panel de gestión de Ruta Certificada.
import { mountAdmin } from '../shared/admin-kit.js';
import { db, auth, STAFF } from '../data/db.js';
import { settings } from '../shared/domain.js';
import dashboard from './dashboard.js';
import inventario from './inventario.js';
import compras from './compras.js';
import leads from './leads.js';
import ventas from './ventas.js';
import financiamiento from './financiamiento.js';
import suscripciones from './suscripciones.js';
import servicios from './servicios.js';
import tienda from './tienda.js';
import sucursales from './sucursales.js';
import contenido from './contenido.js';
import usuarios from './usuarios.js';
import actividad from './actividad.js';

try {
  auth.require(STAFF);
  mountAdmin({
    root: document.getElementById('app'), db, auth, brand: settings().name || 'Ruta Certificada', logo: '✓',
    sections: [dashboard, inventario, compras, leads, ventas, financiamiento, suscripciones, servicios, tienda, sucursales, contenido, usuarios, actividad],
    links: [{ href: 'vendedor.html', icon: '🤝', label: 'App vendedor', roles: ['admin', 'gerente', 'vendedor'] }, { href: 'inspector.html', icon: '🔎', label: 'App inspector', roles: ['admin', 'gerente'] }, { href: 'index.html', icon: '🌐', label: 'Sitio público' }],
    counts: () => ({
      leads: db.count('leads', l => l.status === 'nuevo'),
      compras: db.count('valuations', v => v.status === 'inspeccionada'),
      financiamiento: db.count('financing', f => f.status === 'pendiente'),
      tienda: db.count('orders', o => o.status === 'pagado'),
      servicios: db.count('bookings', b => b.status === 'agendada')
    })
  });
} catch (e) { if (e.message !== 'auth-redirect') throw e; }
