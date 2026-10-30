// Panel de gestión de Atelier Torque.
import { mountAdmin } from '../shared/admin-kit.js';
import { db, auth, STAFF } from '../data/db.js';
import { settings } from '../shared/domain.js';
import dashboard from './dashboard.js';
import ordenes from './ordenes.js';
import concierge from './concierge.js';
import clientes from './clientes.js';
import programas from './programas.js';
import servicios from './servicios.js';
import repuestos from './repuestos.js';
import membresias from './membresias.js';
import tecnicos from './tecnicos.js';
import contenido from './contenido.js';
import usuarios from './usuarios.js';
import actividad from './actividad.js';
import { ymd } from '../shared/util.js';

try {
  auth.require(STAFF);
  mountAdmin({
    root: document.getElementById('app'), db, auth, brand: settings().name || 'Atelier Torque', logo: 'AT',
    sections: [dashboard, ordenes, concierge, clientes, programas, servicios, repuestos, membresias, tecnicos, contenido, usuarios, actividad],
    links: [{ href: 'tecnico.html', icon: '🔧', label: 'App técnico', roles: ['admin', 'gerente'] }, { href: 'chofer.html', icon: '🚘', label: 'App chofer' }, { href: 'index.html', icon: '🌐', label: 'Sitio público' }],
    counts: () => ({
      ordenes: db.count('workOrders', w => w.status === 'aprobacion'),
      concierge: db.count('concierge', c => c.date === ymd() && !['entregado', 'cancelado', 'en-taller'].includes(c.status)),
      repuestos: db.count('parts', p => p.stock <= p.min)
    })
  });
} catch (e) { if (e.message !== 'auth-redirect') throw e; }
