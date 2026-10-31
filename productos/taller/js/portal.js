// Portal del cliente (módulo `portal`): sus vehículos, OT, presupuestos, citas y documentos.
import { app } from './app.js';

app.panel({ page: 'portal.html', sub: 'Mi cuenta', nav: [{ slot: 'inicio' }, { section: 'Mis cosas' }, { slot: 'portal' }, { section: 'Cuenta' }, { slot: 'cuenta' }] });
