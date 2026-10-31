// Cliente de ejemplo · paquete "Básico": solo el módulo base (sitio + ingreso + usuarios + panel).
// Construir: node tools/build-client.mjs demo-basico   → dist/demo-basico/
// Vista previa sin construir: productos/taller/index.html?cliente=demo-basico
export default {
  slug: 'demo-basico',
  app: 'taller',
  mode: 'production',          // sin cuentas demo, sin "Restablecer datos demo", sin barra del portafolio
  data: 'empty',               // parte solo con el catálogo de servicios + las cuentas de abajo
  brand: {
    name: 'Taller Don Lucho', short: 'Don Lucho', logo: '🔧',
    tagline: 'Mecánica general y mantenciones en Ñuñoa',
    colors: { primary: '#c2410c', accent: '#0f766e' }
  },
  theme: 'nordic',
  layout: 'clasica',
  fonts: 'google',
  modules: ['base'],
  backend: { kind: 'local' },
  domain: 'www.tallerdonlucho.cl',
  contact: { email: 'contacto@tallerdonlucho.cl', phone: '+56 2 2345 6789', whatsapp: '+56 9 8765 4321', address: 'Av. Irarrázaval 2450, Ñuñoa', city: 'Ñuñoa', hours: 'Lun–Vie 9:00–18:00 · Sáb 9:00–13:00' },
  legal: { razonSocial: 'Servicios Automotrices Don Lucho SpA', rut: '76.543.210-3', privacyEmail: 'privacidad@tallerdonlucho.cl' },
  seo: { title: 'Taller Don Lucho · Mecánica general en Ñuñoa', description: 'Mantenciones, frenos, embrague y diagnóstico computarizado en Ñuñoa. Cotiza en línea.' },
  // Modo local: la cuenta vive en el navegador de quien la use. CAMBIA la clave antes de entregar.
  accounts: [{ name: 'Luis Contreras', email: 'luis@tallerdonlucho.cl', role: 'admin', password: 'CAMBIAR-esta-clave' }],
  settings: {
    heroTitle: 'Tu auto en buenas manos, a 2 cuadras de Plaza Ñuñoa.',
    heroText: 'Más de 20 años haciendo mantenciones, frenos y embragues. Te explicamos qué tiene tu auto antes de cobrarte un peso.',
    guarantee: 'Garantía de 3 meses en mano de obra.'
  }
};
