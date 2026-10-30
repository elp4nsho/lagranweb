// Panel de administración de Fogón Andino.
import { mountAdmin } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { settings } from '../shared/logic.js';
import { isoDay } from '../data/seed.js';
import dashboard from './dashboard.js';
import pedidos from './pedidos.js';
import caja from './caja.js';
import reservas from './reservas.js';
import carta from './carta.js';
import mesas from './mesas.js';
import qr from './qr.js';
import opiniones from './opiniones.js';
import personal from './personal.js';
import inventario from './inventario.js';
import config from './config.js';
import usuarios from './usuarios.js';
import actividad from './actividad.js';

try {
  auth.require(['admin', 'chef', 'cajero', 'garzon']);
  mountAdmin({
    root: document.getElementById('app'), db, auth, brand: settings().name || 'Fogón Andino', logo: '🔥',
    sections: [dashboard, pedidos, caja, reservas, carta, mesas, qr, opiniones, personal, inventario, config, usuarios, actividad],
    links: [
      { href: 'cocina.html', icon: '👨‍🍳', label: 'Pantalla de cocina', roles: ['admin', 'chef'] },
      { href: 'garzon.html', icon: '🍽️', label: 'App de garzón', roles: ['admin', 'garzon', 'cajero'] },
      { href: 'index.html', icon: '🌐', label: 'Sitio público' }
    ],
    counts: () => ({
      caja: db.count('sessions', s => s.status === 'abierta'),
      reservas: db.count('reservations', r => r.status === 'pendiente' && r.date >= isoDay(Date.now())),
      inventario: db.count('ingredients', i => i.stock <= i.min),
      pedidos: db.count('orders', o => ['enviado', 'preparando'].includes(o.status)),
      carta: db.count('dishes', d => d.available === false)
    })
  });
} catch (e) { if (e.message !== 'auth-redirect') throw e; }
