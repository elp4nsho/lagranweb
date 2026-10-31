// Configuración del cliente. EN DESARROLLO: demo completa, o la vista previa que pidas con
//   index.html?cliente=demo-pro     (lee clients/demo-pro/client.config.js; datos demo, backend local)
//   index.html?modulos=base,agenda  (combinación ad hoc de módulos)
//   index.html?cliente=             (vuelve a la demo completa)
// EN UN BUILD: tools/build-client.mjs reemplaza este archivo entero por `export default { …config fija… }`.
import { devClient } from '../../../assets/core/client.js';

export default await devClient({
  app: 'taller',
  clientsBase: '../../clients/',
  fallback: { slug: 'demo', app: 'taller', mode: 'demo', data: 'demo', brand: { name: 'Mecánica Integral Los Andes', short: 'Los Andes', logo: '🔧' }, modules: null }
});
