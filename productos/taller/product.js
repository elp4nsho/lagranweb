// Ficha del producto "Taller" para las herramientas de producción (PURO: sin DOM).
// build-client copia solo las páginas cuyos módulos estén activos y genera <title>/meta por página.
import { MODULES, PACKAGES } from './modules.js';

export default {
  id: 'taller',
  name: 'Taller mecánico',
  dbName: 'producto-taller',
  dir: 'productos/taller',
  defaults: { theme: 'blueprint', layout: 'clasica' },
  modules: MODULES,
  packages: PACKAGES,
  // file → módulo dueño, entrada JS, si es pública (indexable) y título por defecto
  pages: [
    { file: 'index.html', module: 'base', entry: 'js/site.js', public: true, title: '{name} · {tagline}' },
    { file: 'login.html', module: 'base', entry: 'js/login.js', title: 'Ingresar · {name}' },
    { file: 'admin.html', module: 'base', entry: 'js/admin.js', title: 'Panel · {name}' },
    { file: 'portal.html', module: 'portal', entry: 'js/portal.js', title: 'Mi cuenta · {name}' }
  ],
  // Registro abierto (solo si el módulo `portal` está activo): el trigger SQL crea el perfil con este
  // rol y una ficha en `customers` ligada por customerId. Campos del perfil que el usuario no puede cambiar:
  signup: { module: 'portal', role: 'cliente', link: { collection: 'customers', field: 'customerId', copy: { name: 'name', email: 'email', phone: 'phone' } } },
  protectedProfileFields: ['customerId'],
  // Datos de demo: build-client lo reemplaza por funciones vacías en producción con data: 'empty'.
  demoSeed: 'seed-demo.js',
  schemaType: 'AutoRepair'
};
