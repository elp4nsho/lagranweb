// Cliente de ejemplo · paquete "Pro": base + agenda + órdenes + portal (clientes entra solo, por dependencia).
// Local:     node tools/build-client.mjs demo-pro                      → dist/demo-pro/
// Supabase:  node tools/build-client.mjs demo-pro --backend=supabase   → dist/demo-pro-supabase/
//            node tools/supabase-schema.mjs demo-pro                   → clients/demo-pro/supabase/schema.sql
// Vista previa sin construir: productos/taller/index.html?cliente=demo-pro
export default {
  slug: 'demo-pro',
  app: 'taller',
  mode: 'production',
  data: 'empty',
  brand: {
    name: 'Automotriz Cordillera', short: 'Cordillera', logo: '⚙️',
    tagline: 'Servicio técnico automotriz · Puente Alto',
    colors: { primary: '#2563eb', accent: '#f59e0b' }
  },
  theme: 'graphite',
  layout: 'app',
  modules: ['agenda', 'ordenes', 'portal'],
  backend: 'local',
  backends: {
    local: { kind: 'local' },
    // Reemplaza con los datos de Project Settings → API de tu proyecto. La anon key es pública por diseño:
    // la seguridad la dan las políticas RLS de schema.sql. NUNCA pongas aquí la service_role key.
    supabase: { kind: 'supabase', url: 'https://TU-PROYECTO.supabase.co', anonKey: 'REEMPLAZAR-anon-key', bucket: 'archivos' }
  },
  domain: 'www.automotrizcordillera.cl',
  contact: { email: 'contacto@automotrizcordillera.cl', phone: '+56 2 2850 1200', whatsapp: '+56 9 5555 1200', address: 'Av. Concha y Toro 1550, Puente Alto', city: 'Puente Alto', hours: 'Lun–Vie 8:30–18:30 · Sáb 9:00–14:00' },
  legal: { razonSocial: 'Automotriz Cordillera Ltda.', rut: '77.123.456-K', privacyEmail: 'privacidad@automotrizcordillera.cl' },
  seo: { title: 'Automotriz Cordillera · Agenda tu hora y sigue tu OT en línea', description: 'Taller en Puente Alto: agenda online, órdenes de trabajo con seguimiento por patente y portal para clientes.' },
  // Solo backend local (con Supabase el admin se crea en Auth y se liga por correo, ver docs/OPERACION.md).
  accounts: [{ name: 'Marcela Fuentes', email: 'admin@automotrizcordillera.cl', role: 'admin', password: 'CAMBIAR-esta-clave' }],
  settings: { heroTitle: 'Agenda en línea y sigue tu auto etapa por etapa.', announcement: 'Nuevo: agenda tu hora en línea y sigue tu OT con el código y la patente.' }
};
