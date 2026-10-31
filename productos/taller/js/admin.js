// Panel del equipo: el menú son huecos con nombre que llenan los módulos activos (ver js/modules/*).
import { app } from './app.js';

app.panel({
  page: 'admin.html', sub: 'Taller',
  nav: [
    { section: 'General' }, { slot: 'inicio' },
    { section: 'Operación' }, { slot: 'operacion' },
    { section: 'Ventas' }, { slot: 'ventas' },
    { section: 'Bodega' }, { slot: 'bodega' },
    { section: 'Sitio web' }, { slot: 'sitio' },
    { section: 'Sistema' }, { slot: 'sistema' }
  ]
});
