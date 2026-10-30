// PMS de Hotel Bahía Lumen.
import { mountAdmin } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { settings, today } from '../shared/hotel.js';
import dashboard from './dashboard.js';
import calendario from './calendario.js';
import reservas from './reservas.js';
import recepcion from './recepcion.js';
import housekeeping from './housekeeping.js';
import huespedes from './huespedes.js';
import habitaciones from './habitaciones.js';
import tarifas from './tarifas.js';
import canales from './canales.js';
import reportes from './reportes.js';
import contenido from './contenido.js';
import config from './config.js';
import usuarios from './usuarios.js';
import actividad from './actividad.js';

try {
  auth.require(['admin', 'recepcion', 'housekeeping', 'revenue']);
  mountAdmin({
    root: document.getElementById('app'), db, auth, brand: settings().name || 'Bahía Lumen', logo: '✦',
    sections: [dashboard, recepcion, calendario, reservas, huespedes, housekeeping, habitaciones, tarifas, canales, reportes, contenido, config, usuarios, actividad],
    links: [{ href: 'limpieza.html', icon: '📱', label: 'App de limpieza', roles: ['admin', 'housekeeping', 'recepcion'] }, { href: 'index.html', icon: '🌐', label: 'Sitio público' }],
    counts: () => {
      const T = today();
      return {
        recepcion: db.count('reservations', r => (r.checkIn === T && r.status === 'confirmada') || (r.checkOut <= T && r.status === 'check-in')),
        housekeeping: db.count('rooms', r => r.hk === 'sucia'),
        contenido: 0
      };
    }
  });
} catch (e) { if (e.message !== 'auth-redirect') throw e; }
