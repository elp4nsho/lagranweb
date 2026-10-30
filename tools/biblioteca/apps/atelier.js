// Biblioteca de vistas de Atelier Torque (/atelier).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { martina: 'u-cli1', rodrigo: 'u-cli2', asesor: 'u-asesor', gerente: 'u-gerente', tecnico: 'u-tec1', chofer: 'u-ch1', admin: 'u-admin' };
// Datos estables de la semilla: OT en espera de aprobación (Martina), EV en proceso y corrida en camino (Rodrigo).
const W = { aprobacion: 'OT-24329', insAprobacion: 'in24329', ev: 'OT-24330', insEv: 'in24330', enCamino: 'OT-24331', woRecepcion: 'wo24317', woEvInspeccion: 'wo24327', runEnCamino: 'cc24331' };
const firstRow = '.admin-content tbody tr >> nth=0';
// El modal enfoca el botón principal del pie y queda desplazado hacia abajo: lo devuelve arriba.
const modalTop = h => h.page.evaluate(() => document.querySelectorAll('.modal').forEach(m => { m.scrollTop = 0; }));

// Avanza la agenda concierge hasta el paso indicado (0 = vehículo … 3 = datos).
async function bookingTo(h, step) {
  if (step >= 1) { await h.fill('#b-km', '28000'); await h.fill('#b-plate', 'PRSC-91'); await h.click('#bk button.btn-primary'); }
  if (step >= 2) { await h.click('#bk label.opt:has(input[name="svc"]) >> nth=0'); await h.click('#bk button.btn-primary'); }
  if (step >= 3) { await h.click('[data-win]:not([disabled]) >> nth=1'); await h.fill('#b-addr', 'Av. Alonso de Córdova 3420, depto 81'); await h.click('#bk button.btn-primary'); }
}

module.exports = {
  dir: 'atelier',
  name: 'Atelier Torque',
  kind: 'Taller premium y performance',
  theme: 'noir',
  description: 'Taller premium para autos de alta gama, deportivos y eléctricos, con sitio público (programas por marca, agenda con retiro concierge, seguimiento en vivo, inspección digital y dyno), garage del cliente, panel de gestión y apps para técnicos y choferes.',
  accounts: {
    'u-cli1': { name: 'Martina Larraín', role: 'Cliente', email: 'martina@correo.cl', password: 'demo123' },
    'u-cli2': { name: 'Rodrigo Echeverría', role: 'Cliente', email: 'rodrigo@correo.cl', password: 'demo123' },
    'u-asesor': { name: 'Fernanda Tapia', role: 'Asesor de servicio', email: 'asesor@ateliertorque.cl', password: 'demo123' },
    'u-gerente': { name: 'Andrés Undurraga', role: 'Gerente de servicio', email: 'gerente@ateliertorque.cl', password: 'demo123' },
    'u-tec1': { name: 'Diego Morales', role: 'Técnico', email: 'tecnico@ateliertorque.cl', password: 'demo123' },
    'u-ch1': { name: 'Joaquín Soto', role: 'Chofer concierge', email: 'chofer@ateliertorque.cl', password: 'demo123' },
    'u-admin': { name: 'Camila Bascuñán', role: 'Administrador', email: 'admin@ateliertorque.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Mi garage: autos, membresía, libro de mantenciones, documentos, inspecciones y dyno.' },
    { id: 'asesor', label: 'Asesor de servicio', desc: 'Panel: órdenes de trabajo, aprobaciones, concierge, clientes y repuestos.' },
    { id: 'gerente', label: 'Gerente de servicio', desc: 'Indicadores, catálogo (programas y servicios), membresías y técnicos.' },
    { id: 'tecnico', label: 'Técnico', desc: 'App del taller: tarjetas de trabajo, cronómetro e inspección multipunto.' },
    { id: 'chofer', label: 'Chofer concierge', desc: 'App móvil de corridas con acta de retiro y entrega.' },
    { id: 'admin', label: 'Administrador', desc: 'Contenido del sitio, usuarios y permisos.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Noir Neón" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'luxury', group: 'Estilo', label: 'Lujo', desc: 'Negro, dorado y serif elegante.', theme: 'luxury' },
      { id: 'chrome', group: 'Estilo', label: 'Cromo Y2K', desc: 'Metálico y brillante.', theme: 'chrome' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '[data-qc] form', mobile: true,
      description: 'Página de inicio con calculadora rápida de la próxima mantención, las cinco especialidades del taller, cómo funciona el concierge, servicios destacados, último resultado de dinamómetro, membresías, testimonios y preguntas frecuentes. Las secciones visibles se activan desde el panel.',
      actions: ['Calcular qué mantención le toca según marca, modelo y km', 'Entrar a una especialidad (mantención, performance, estética, eléctricos, diagnóstico)', 'Agendar un servicio destacado', 'Ver la última curva de dyno', 'Comparar membresías y leer las preguntas frecuentes']
    },
    {
      id: 'programas', section: 'publico', title: 'Programas por marca', url: 'index.html#/programas?brand=Porsche&km=42000', waitFor: '.svc-timeline',
      description: 'Calculadora de mantención según el plan del fabricante: con marca, modelo y kilometraje muestra el servicio que corresponde, los siguientes, sus tareas y precio, y la ilustración del modelo elegido.',
      actions: ['Elegir marca y modelo', 'Ajustar el kilometraje con el campo o el deslizador', 'Ver el servicio que le corresponde y los próximos', 'Revisar tareas, horas y precio de cada uno', 'Agendar directamente el servicio calculado']
    },
    {
      id: 'servicios', section: 'publico', title: 'Servicios', url: 'index.html#/servicios', waitFor: '.svc-list-grid',
      description: 'Menú de servicios de performance, estética, eléctricos y diagnóstico con lo que incluye cada uno, horas aproximadas y precio. Precios y destacados vienen del panel.',
      actions: ['Filtrar por línea de servicio', 'Revisar qué incluye cada servicio', 'Ver precio y horas estimadas', 'Agendar un servicio']
    },
    {
      id: 'servicios-ev', section: 'publico', title: 'Servicios para eléctricos', url: 'index.html#/servicios/ev', waitFor: '.svc-list-grid',
      description: 'Línea de eléctricos e híbridos con el ejemplo del informe de salud de batería (SOH): capacidad útil, desbalance de celdas y autonomía real.',
      actions: ['Conocer el informe de salud de batería', 'Ver servicios de alta tensión y cargadores domiciliarios', 'Agendar el informe SOH']
    },
    {
      id: 'agendar', section: 'publico', title: 'Agenda concierge: vehículo', url: 'index.html#/agendar', waitFor: '#bk',
      setup: async h => { await h.select('#b-brand', 'Porsche'); await h.fill('#b-km', '28000'); await h.fill('#b-plate', 'PRSC-91'); },
      description: 'Primer paso de la agenda en cuatro pasos (vehículo, servicio, retiro y entrega, confirmación). El resumen lateral muestra el auto y el precio estimado.',
      actions: ['Elegir marca, modelo y año', 'Indicar kilometraje y patente', 'Ver el auto en el resumen', 'Avanzar al siguiente paso']
    },
    {
      id: 'agendar-servicio', section: 'publico', title: 'Agenda concierge: servicio', url: 'index.html#/agendar?brand=Porsche&model=911%20Carrera%20S&km=28000', waitFor: '#bk',
      setup: async h => { await bookingTo(h, 1); await h.click('#bk label.opt:has(input[name="svc"]) >> nth=0'); },
      description: 'Paso de servicios: propone la mantención programada que corresponde según el plan de la marca y permite sumar servicios de las otras líneas. Si el cliente es socio, aplica su descuento.',
      actions: ['Incluir la mantención programada calculada', 'Sumar servicios de performance, estética, eléctricos o diagnóstico', 'Ver el precio de cada uno', 'Revisar el total en el resumen']
    },
    {
      id: 'agendar-retiro', section: 'publico', title: 'Agenda concierge: retiro y entrega', url: 'index.html#/agendar?brand=Porsche&model=911%20Carrera%20S&km=28000', waitFor: '#bk',
      setup: async h => { await bookingTo(h, 2); await h.click('[data-win]:not([disabled]) >> nth=1'); await h.fill('#b-addr', 'Av. Alonso de Córdova 3420, depto 81'); await h.check('[name="courtesy"]'); },
      description: 'Logística del concierge: retiro en domicilio u oficina (o llevarlo uno mismo), día, ventana de 2 horas según choferes libres, dirección y auto de cortesía eléctrico si hay disponible.',
      actions: ['Elegir retiro en domicilio, oficina o llegar al taller', 'Escoger día y ventana horaria con choferes libres', 'Indicar la dirección y comuna', 'Pedir auto de cortesía eléctrico', 'Dejar indicaciones para el chofer']
    },
    {
      id: 'agendar-confirmada', section: 'publico', title: 'Agenda confirmada', url: 'index.html#/agendar?brand=Porsche&model=911%20Carrera%20S&km=28000', waitFor: '#bk',
      setup: async h => { await bookingTo(h, 3); await h.fill('#b-name', 'Tomás Ossa Vial'); await h.fill('#b-email', 'tomas.ossa@demo.cl'); await h.fill('#b-phone', '+56 9 8123 4411'); await h.check('[name="terms"]'); await h.click('#bk button.btn-primary'); await h.wait('.success-hero'); },
      description: 'Confirmación con el código de seguimiento, el total estimado y la ventana de retiro. La OT y la corrida del chofer se crean al instante en el panel y en la app del chofer.',
      actions: ['Ver el código de seguimiento', 'Seguir el auto en vivo', 'Agendar otro servicio']
    },
    {
      id: 'seguimiento-buscar', section: 'publico', title: 'Seguimiento: buscar orden', url: 'index.html#/seguimiento', waitFor: '#sf',
      description: 'Búsqueda de la orden por su código, con un enlace a un seguimiento de ejemplo en curso.',
      actions: ['Ingresar el código de la OT', 'Abrir un seguimiento de ejemplo', 'Ver sus órdenes activas si ingresó']
    },
    {
      id: 'seguimiento', section: 'publico', title: 'Seguimiento concierge en vivo', url: `index.html#/seguimiento/${W.enCamino}`, waitFor: '.track', mobile: true,
      description: 'Seguimiento de la corrida: llegada estimada, pasos del concierge, mapa esquemático (SVG) con la ruta del chofer entre el taller y el cliente, datos del chofer y resumen de la orden.',
      actions: ['Ver cuántos minutos faltan para que llegue el chofer', 'Seguir los pasos del retiro, el taller y la entrega', 'Ver la ruta en el mapa esquemático', 'Contactar al chofer', 'Avanzar la demo con "simular siguiente paso"']
    },
    {
      id: 'seguimiento-taller', section: 'publico', title: 'Seguimiento: auto en el taller', url: `index.html#/seguimiento/${W.aprobacion}`, waitFor: '.track',
      description: 'Cuando el auto ya está en el atelier, el seguimiento muestra la etapa dentro del taller y el acceso a la inspección digital cuando hay trabajos por aprobar.',
      actions: ['Ver la etapa en el taller', 'Abrir la inspección digital para aprobar', 'Revisar el resumen de la orden']
    },
    {
      id: 'inspeccion', section: 'publico', title: 'Inspección digital y aprobación', url: `index.html#/inspeccion/${W.insAprobacion}`, waitFor: '.insp-cat', mobile: true,
      setup: async h => { await h.click('[data-f="urgente"]'); await h.check('[data-ap] >> nth=0'); await h.page.evaluate(() => scrollTo(0, 0)); },
      description: 'Informe multipunto con semáforo (bien, atención, requiere acción), fotos y videos por punto, comentarios del técnico y trabajos recomendados con precio. El cliente aprueba en línea solo lo que quiere.',
      actions: ['Filtrar puntos por color del semáforo', 'Ver fotos y videos de cada punto', 'Marcar los trabajos recomendados que aprueba', 'Ver el presupuesto actualizado', 'Aprobar o seguir sin adicionales']
    },
    {
      id: 'inspeccion-ev', section: 'publico', title: 'Inspección de un eléctrico', url: `index.html#/inspeccion/${W.insEv}`, waitFor: '.insp-cat',
      description: 'La misma inspección para un auto eléctrico, con el bloque de batería de alta tensión: salud (SOH), temperatura, ciclos, autonomía y voltaje de cada módulo.',
      actions: ['Ver la salud de la batería', 'Revisar el balance de voltaje por módulo', 'Leer el resumen del técnico']
    },
    {
      id: 'inspeccion-media', section: 'publico', kind: 'modal', from: 'Foto o video de un punto de la inspección', title: 'Foto de la inspección', url: `index.html#/inspeccion/${W.insAprobacion}`, waitFor: '.insp-cat',
      setup: async h => { await h.click('[data-media]'); await h.modal(); },
      description: 'Visor de la foto o el video que el técnico adjuntó a un punto de la inspección, con su comentario.',
      actions: ['Ver la evidencia del punto revisado', 'Leer el comentario del técnico', 'Volver al informe']
    },
    {
      id: 'dyno', section: 'publico', title: 'Resultados dyno', url: 'index.html#/dyno', waitFor: '.container .card',
      description: 'Galería de mediciones de potencia en rueda antes y después de cada reprogramación, publicadas con autorización del cliente.',
      actions: ['Ver la ganancia de potencia de cada auto', 'Abrir la curva completa', 'Agendar una reprogramación']
    },
    {
      id: 'dyno-detalle', section: 'publico', title: 'Curva de dinamómetro', url: 'index.html#/dyno/dy24296', waitFor: '.container .card svg',
      description: 'Detalle de una medición con las curvas de potencia y torque antes y después, y los valores máximos de cada una.',
      actions: ['Comparar las curvas antes y después', 'Ver potencia y torque máximos', 'Agendar la misma etapa para su auto']
    },
    {
      id: 'membresias', section: 'publico', title: 'Membresías', url: 'index.html#/membresias', waitFor: '.tier-card',
      description: 'Planes anuales Silver, Gold y Black con precio, descuento, retiros concierge incluidos y tabla comparativa de beneficios. Se administran desde el panel.',
      actions: ['Comparar los tres niveles', 'Ver precio anual y mensual equivalente', 'Revisar la tabla de beneficios', 'Ingresar para activar una membresía']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Página de ingreso para clientes y equipo, con cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, gerente, asesor, técnico, chofer o cliente', 'Crear una cuenta de cliente', 'Volver al sitio']
    },
    {
      id: 'garage-sin-sesion', section: 'publico', title: 'Mi garage (sin sesión)', url: 'index.html#/garage', waitFor: '.big-ico',
      description: 'Lo que ve un visitante al abrir "Mi garage" sin haber ingresado: la invitación a entrar con su cuenta.',
      actions: ['Ir a ingresar con su cuenta', 'Saber qué encontrará en su garage', 'Volver a navegar el sitio']
    },

    // ================= Cliente =================
    {
      id: 'garage', section: 'cliente', login: U.martina, title: 'Mi garage', url: 'index.html#/garage', waitFor: '.garage-cars', mobile: true,
      description: 'Inicio del cliente con su membresía, las órdenes en curso (y las inspecciones por aprobar), sus autos y la ficha del auto elegido con los próximos servicios de su plan.',
      actions: ['Ver la membresía y sus beneficios', 'Abrir una orden en curso o aprobar su inspección', 'Cambiar entre sus autos', 'Revisar los próximos servicios del plan', 'Agendar o agregar un auto']
    },
    {
      id: 'garage-libro', section: 'cliente', login: U.martina, title: 'Libro de mantenciones digital', url: 'index.html#/garage', waitFor: '.garage-cars',
      setup: async h => { await h.click('[data-tab="libro"]'); await h.wait('.book-log'); await h.scrollTo('.garage-cars + .card .tabs, .card .tabs', 'start', -110); },
      description: 'Historial sellado de cada servicio del auto, con fecha, kilometraje, línea, ítems realizados y enlace a la inspección digital de esa visita.',
      actions: ['Revisar cada servicio realizado', 'Ver los ítems de cada visita', 'Abrir la inspección de esa visita']
    },
    {
      id: 'garage-documentos', section: 'cliente', login: U.martina, title: 'Documentos del auto', url: 'index.html#/garage', waitFor: '.garage-cars',
      setup: async h => { await h.click('[data-tab="docs"]'); await h.scrollTo('.garage-cars + .card .tabs, .card .tabs', 'start', -110); },
      description: 'Documentos del auto (permiso de circulación, revisión técnica, SOAP y otros) con su vencimiento. El taller avisa 30 días antes.',
      actions: ['Ver los documentos y su vencimiento', 'Subir un documento nuevo', 'Recibir aviso antes de que venzan']
    },
    {
      id: 'garage-inspecciones', section: 'cliente', login: U.martina, title: 'Inspecciones del auto', url: 'index.html#/garage', waitFor: '.garage-cars',
      setup: async h => { await h.click('[data-tab="insp"]'); await h.scrollTo('.garage-cars + .card .tabs, .card .tabs', 'start', -110); },
      description: 'Listado de inspecciones digitales del auto con su fecha, kilometraje y resumen del semáforo.',
      actions: ['Ver cuántos puntos quedaron en cada color', 'Abrir una inspección completa', 'Comparar visitas']
    },
    {
      id: 'garage-dyno', section: 'cliente', login: U.martina, title: 'Dyno del auto', url: 'index.html#/garage', waitFor: '.garage-cars',
      setup: async h => { await h.click('[data-tab="dyno"]'); await h.scrollTo('.garage-cars + .card .tabs, .card .tabs', 'start', -110); },
      description: 'Pestaña del garage con las mediciones de dinamómetro del auto del cliente (aparece solo si tiene alguna).',
      actions: ['Ver la ganancia de potencia', 'Abrir la curva completa', 'Agendar una nueva etapa']
    },
    {
      id: 'garage-agregar', section: 'cliente', login: U.martina, kind: 'modal', from: 'Botón "+ Agregar auto" en Mi garage', title: 'Agregar auto', url: 'index.html#/garage', waitFor: '.garage-cars',
      setup: async h => { await h.click('[data-addcar]'); await h.modal(); },
      description: 'Formulario para sumar un auto al garage: marca y modelo del catálogo de programas, año, patente y kilometraje.',
      actions: ['Elegir marca y modelo', 'Indicar año, patente y kilometraje', 'Ver al instante su próximo servicio del plan']
    },

    // ================= Asesor de servicio =================
    {
      id: 'ordenes', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Gerente de servicio', 'Administrador'], title: 'Órdenes de trabajo', url: 'admin.html#/ordenes/lista', waitFor: firstRow,
      description: 'Listado de todas las OT con vehículo, cliente, trabajo, técnico, estado y total. Tiene vistas de tablero y de aprobaciones pendientes.',
      actions: ['Filtrar por estado, línea, técnico o solo abiertas', 'Buscar por código, patente o cliente', 'Abrir la ficha de una OT', 'Crear una OT', 'Exportar a CSV']
    },
    {
      id: 'ordenes-tablero', section: 'asesor', login: U.asesor, title: 'Tablero de OT', url: 'admin.html#/ordenes/tablero', waitFor: '.kanban .kcard',
      description: 'Columnas por etapa (agendada, recepción, inspección, aprobación, en proceso, control y lista) con cada OT abierta.',
      actions: ['Ver cuántas OT hay en cada etapa', 'Abrir una OT desde su tarjeta', 'Detectar cuellos de botella']
    },
    {
      id: 'ordenes-aprobaciones', section: 'asesor', login: U.asesor, title: 'Aprobaciones pendientes', url: 'admin.html#/ordenes/aprobaciones', waitFor: '.admin-content .card',
      description: 'OT cuyo cliente aún no responde la inspección digital, con el semáforo y el monto de adicionales sugeridos.',
      actions: ['Ver qué clientes tienen trabajos por aprobar', 'Revisar el monto en adicionales', 'Gestionar la aprobación por teléfono']
    },
    {
      id: 'orden-ficha', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Fila de Órdenes o botón "Gestionar" en Aprobaciones', title: 'Ficha de la OT', url: 'admin.html#/ordenes/aprobaciones', waitFor: '.admin-content .card',
      setup: async h => { await h.click('[data-wo]'); await h.modal(); await modalTop(h); },
      description: 'Ficha con el flujo de etapas, vehículo y cliente, técnico y asesor, ítems con total, resumen de la inspección digital, corrida concierge, notas e historial. Permite avanzar la OT de etapa.',
      actions: ['Avanzar la OT a la siguiente etapa', 'Asignar técnico y asesor', 'Agregar ítems desde el inventario o libres', 'Registrar la aprobación telefónica del cliente', 'Ver historial y registro de tiempos']
    },
    {
      id: 'orden-nueva', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Botón "+ Nueva OT"', title: 'Nueva orden de trabajo', url: 'admin.html#/ordenes/lista', waitFor: firstRow,
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para abrir una OT desde el panel: vehículo del cliente, trabajo (mantención según programa o un servicio del menú), kilometraje, fecha y técnico.',
      actions: ['Elegir el vehículo y su cliente', 'Calcular la mantención del programa o elegir un servicio', 'Indicar km y fecha', 'Asignar técnico y dejar notas']
    },
    {
      id: 'concierge-agenda', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Gerente de servicio', 'Administrador'], title: 'Concierge: agenda', url: 'admin.html#/concierge/agenda', waitFor: '.sched',
      description: 'Agenda de retiros y entregas de los próximos 5 días por ventana horaria, con la carga de cada chofer en el día.',
      actions: ['Ver las corridas por día y ventana', 'Revisar cuántas corridas tiene cada chofer hoy', 'Abrir una corrida para reasignar chofer o cambiar estado']
    },
    {
      id: 'concierge-corrida', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Una corrida de la agenda o del listado', title: 'Detalle de corrida', url: 'admin.html#/concierge/corridas', waitFor: firstRow,
      setup: async h => { await h.click('.admin-content tbody tr:has-text("OT-24331")'); await h.modal(); await modalTop(h); },
      description: 'Detalle de una corrida concierge con el mapa esquemático (SVG) de la ruta, los pasos, cliente, vehículo, dirección, ventana y auto de cortesía, más el acta de retiro con firma cuando existe.',
      actions: ['Ver la ruta y el paso actual', 'Reasignar el chofer', 'Cambiar el estado de la corrida', 'Revisar el acta de retiro y la firma']
    },
    {
      id: 'concierge-corridas', section: 'asesor', login: U.asesor, title: 'Concierge: corridas', url: 'admin.html#/concierge/corridas', waitFor: firstRow,
      description: 'Listado de todas las corridas con fecha, ventana, cliente, vehículo, comuna, chofer, estado y tarifa.',
      actions: ['Filtrar por estado, chofer o comuna', 'Buscar por código, cliente o dirección', 'Abrir el detalle de una corrida', 'Exportar a CSV']
    },
    {
      id: 'concierge-flota', section: 'asesor', login: U.asesor, title: 'Flota de cortesía', url: 'admin.html#/concierge/flota', waitFor: firstRow,
      description: 'Autos de cortesía y plataforma del taller con su carga, kilometraje y estado (disponible, prestado o en mantención).',
      actions: ['Ver el estado y la carga de cada auto', 'Agregar o editar autos de la flota', 'Marcar un auto en mantención', 'Exportar a CSV']
    },
    {
      id: 'clientes', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Gerente de servicio', 'Administrador'], title: 'Clientes y vehículos', url: 'admin.html#/clientes/clientes', waitFor: firstRow,
      description: 'Clientes con su membresía, comuna, autos, total facturado y última visita; y la pestaña de vehículos con documentos vencidos.',
      actions: ['Filtrar por membresía o comuna', 'Ver vehículos por marca, motor y documentos vencidos', 'Abrir la ficha de un cliente', 'Crear clientes y vehículos', 'Exportar a CSV']
    },
    {
      id: 'cliente-ficha', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Fila de la tabla de Clientes', title: 'Ficha del cliente', url: 'admin.html#/clientes/clientes', waitFor: firstRow,
      setup: async h => { await h.fill('.admin-content input[type="search"]', 'Martina'); await h.click(firstRow); await h.modal(); await modalTop(h); },
      description: 'Ficha del cliente con contacto, membresía, sus autos con documentos y el historial de órdenes.',
      actions: ['Editar datos y membresía', 'Agregar o editar autos', 'Revisar las órdenes del cliente', 'Eliminar el cliente']
    },
    {
      id: 'repuestos', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Gerente de servicio', 'Administrador'], title: 'Repuestos OEM', url: 'admin.html#/repuestos/inventario', waitFor: firstRow,
      description: 'Inventario de repuestos originales con stock y mínimo, precio, ubicación, valor del inventario y alertas de reposición.',
      actions: ['Filtrar por marca o stock bajo', 'Ajustar el stock de un repuesto', 'Crear o editar repuestos', 'Exportar a CSV']
    },
    {
      id: 'repuestos-pedidos', section: 'asesor', login: U.asesor, title: 'Pedidos especiales', url: 'admin.html#/repuestos/pedidos', waitFor: firstRow,
      description: 'Repuestos importados a pedido con proveedor, OT asociada, fecha de pedido, ETA y estado; los atrasados se marcan.',
      actions: ['Seguir los pedidos en camino y su ETA', 'Ver los atrasados', 'Crear o editar un pedido especial', 'Exportar a CSV']
    },

    // ================= Gerente de servicio =================
    {
      id: 'dashboard', section: 'gerente', login: U.gerente, roles: ['Gerente de servicio', 'Administrador', 'Asesor de servicio'], title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: '.kpi-grid', mobile: true,
      description: 'Indicadores del atelier: ingresos y ticket de 30 días, NPS, OT abiertas, participación de eléctricos y corridas concierge del día, con gráficos por línea de servicio, productividad técnica y semanas de concierge.',
      actions: ['Ver ingresos, ticket y NPS contra el periodo anterior', 'Revisar ingresos por línea y el mix del mes', 'Comparar horas facturadas por técnico', 'Seguir la participación de eléctricos', 'Ver aprobaciones pendientes y el concierge de hoy']
    },
    {
      id: 'programas-admin', section: 'gerente', login: U.gerente, roles: ['Gerente de servicio', 'Administrador'], title: 'Programas por marca', url: 'admin.html#/programas', waitFor: '.admin-content .card',
      description: 'Planes de mantención de cada marca: intervalo, niveles de servicio con precio base y horas, y modelos con su factor de precio. Es lo que usa la calculadora del sitio.',
      actions: ['Publicar u ocultar un programa', 'Editar intervalos y descripción', 'Editar niveles de servicio y sus tareas', 'Agregar modelos con su factor de precio', 'Crear un programa nuevo']
    },
    {
      id: 'programa-nivel', section: 'gerente', login: U.gerente, kind: 'modal', from: 'Fila de un nivel de servicio en Programas', title: 'Editar nivel de servicio', url: 'admin.html#/programas', waitFor: '.admin-content .card',
      setup: async h => { await h.click('[data-lvl]'); await h.modal(); },
      description: 'Nivel de servicio de un programa: nombre, cada cuántos intervalos se aplica, precio base, horas y las tareas para autos a combustión y eléctricos.',
      actions: ['Cambiar nombre y frecuencia', 'Fijar precio base y horas', 'Editar las tareas de combustión y de eléctricos']
    },
    {
      id: 'servicios-admin', section: 'gerente', login: U.gerente, roles: ['Gerente de servicio', 'Administrador'], title: 'Menú de servicios', url: 'admin.html#/servicios', waitFor: firstRow,
      description: 'Servicios publicados en el sitio con línea, precio y horas, y los interruptores de destacado y activo.',
      actions: ['Filtrar por línea o estado', 'Destacar un servicio en la portada', 'Activar o desactivar un servicio', 'Crear o editar servicios', 'Exportar a CSV']
    },
    {
      id: 'servicio-editor', section: 'gerente', login: U.gerente, kind: 'modal', from: 'Fila de la tabla de Menú de servicios', title: 'Editor de servicio', url: 'admin.html#/servicios', waitFor: firstRow,
      setup: async h => { await h.click('.admin-content tbody tr >> nth=0 >> td >> nth=0'); await h.modal(); },
      description: 'Ficha del servicio con línea, ícono, precio (con opción "desde"), horas, descripción, lista de lo que incluye, destacado y activo.',
      actions: ['Editar nombre, línea e ícono', 'Fijar precio y horas', 'Escribir descripción y lo que incluye', 'Destacarlo o desactivarlo']
    },
    {
      id: 'membresias-admin', section: 'gerente', login: U.gerente, roles: ['Gerente de servicio', 'Administrador'], title: 'Membresías y socios', url: 'admin.html#/membresias', waitFor: '.kpi-grid',
      description: 'Niveles de membresía con precio, descuento y beneficios, indicadores de socios e ingreso recurrente, y la tabla de socios.',
      actions: ['Ver socios activos e ingreso anual recurrente', 'Editar precio, descuento y beneficios de cada nivel', 'Cambiar la membresía de un socio', 'Filtrar socios por nivel']
    },
    {
      id: 'tecnicos', section: 'gerente', login: U.gerente, roles: ['Gerente de servicio', 'Administrador'], title: 'Técnicos y certificaciones', url: 'admin.html#/tecnicos', waitFor: '.kpi-grid',
      description: 'Técnicos con especialidad, nivel, carga actual, horas facturadas y certificaciones con su vencimiento (se alertan las que vencen en 60 días).',
      actions: ['Ver certificaciones por vencer', 'Agregar una certificación', 'Revisar carga y horas de cada técnico', 'Crear o editar técnicos']
    },
    {
      id: 'actividad', section: 'gerente', login: U.gerente, roles: ['Gerente de servicio', 'Administrador'], title: 'Actividad', url: 'admin.html#/actividad', waitFor: firstRow,
      description: 'Registro de las últimas 300 acciones del equipo y del sistema: agendas, corridas, inspecciones, aprobaciones y cambios en el catálogo.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción', 'Buscar por detalle o usuario', 'Exportar a CSV']
    },

    // ================= Técnico =================
    {
      id: 'tecnico', section: 'tecnico', login: U.tecnico, roles: ['Técnico', 'Gerente de servicio', 'Administrador'], title: 'Tarjetas de trabajo', url: 'tecnico.html', waitFor: '.job-grid',
      setup: async h => { await h.click('[data-scope="all"]'); await h.wait('.job'); },
      description: 'App del técnico con las tarjetas de trabajo del taller: estado, auto, trabajo, técnico asignado y si hay cronómetro en marcha. Se filtra entre mis trabajos, sin asignar y todo el taller.',
      actions: ['Ver mis trabajos, los sin asignar o todo el taller', 'Abrir una tarjeta de trabajo', 'Ver qué OT tienen cronómetro en marcha', 'Revisar sus tiempos registrados']
    },
    {
      id: 'tecnico-ot', section: 'tecnico', login: U.tecnico, title: 'Tarjeta de trabajo', url: `tecnico.html#/ot/${W.woRecepcion}`, waitFor: '[data-timer]', mobile: true,
      description: 'Detalle de la OT para el técnico: tareas del plan o del servicio para marcar, cronómetro contra las horas estándar, acceso a la inspección digital y el botón para avanzar la etapa.',
      actions: ['Marcar las tareas realizadas', 'Iniciar y detener el cronómetro o registrar tiempo manual', 'Abrir el formulario de inspección', 'Avanzar la OT (inspección, control de calidad, lista)', 'Tomar un trabajo sin asignar']
    },
    {
      id: 'tecnico-inspeccion', section: 'tecnico', login: U.tecnico, title: 'Formulario de inspección', url: `tecnico.html#/ot/${W.woEvInspeccion}/inspeccion`, waitFor: '.tri',
      setup: async h => { await h.click('[data-light$="|atencion"] >> nth=3'); await h.click('[data-allok]'); await h.click('[data-scan]'); await h.page.evaluate(() => scrollTo(0, 0)); },
      description: 'Inspección multipunto que llena el técnico: semáforo por punto, comentario y trabajo recomendado con precio, mediciones, fotos y videos, y lecturas de la batería de alta tensión para eléctricos.',
      actions: ['Marcar cada punto en verde, ámbar o rojo', 'Proponer un trabajo con su precio', 'Adjuntar fotos y videos (simulado)', 'Leer las celdas de la batería desde el escáner', 'Enviar el informe al cliente para que apruebe']
    },

    // ================= Chofer concierge =================
    {
      id: 'chofer', section: 'chofer', login: U.chofer, roles: ['Chofer concierge', 'Asesor de servicio', 'Gerente de servicio', 'Administrador'], title: 'Corridas del día', url: 'chofer.html', waitFor: '.run-card', mobile: true,
      description: 'App móvil del chofer con sus retiros y entregas pendientes, las hechas hoy y las próximas, con dirección, ventana, auto y si debe llevar auto de cortesía.',
      actions: ['Ver retiros y entregas de hoy por ventana', 'Revisar las corridas de los próximos días', 'Abrir una corrida', 'Saber si lleva auto de cortesía']
    },
    {
      id: 'chofer-acta', section: 'chofer', login: U.chofer, title: 'Acta de retiro', url: `chofer.html#/corrida/${W.runEnCamino}`, waitFor: '#act', mobile: true,
      setup: async h => { await h.click('[data-photo="0"]'); await h.click('[data-photo="1"]'); await h.click('[data-photo="5"]'); await h.fill('#a-km', '18420'); },
      description: 'Corrida en curso con el mapa esquemático de la ruta y el acta de retiro: fotos en 6 ángulos, kilometraje, nivel de carga o combustible, daños, entrega del auto de cortesía y firma del cliente con el dedo.',
      actions: ['Capturar fotos en 6 ángulos (simulado)', 'Registrar kilometraje y nivel de carga', 'Anotar daños u objetos de valor', 'Recoger la firma del cliente en pantalla', 'Confirmar el retiro y llevarlo al atelier']
    },

    // ================= Administrador =================
    {
      id: 'contenido', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: '#cms',
      description: 'Textos de portada, auto ilustrado del hero (carrocería y color), contacto, tarifa y radio del concierge, secciones visibles del sitio, testimonios y preguntas frecuentes.',
      actions: ['Editar título, texto y anuncio de la portada', 'Elegir carrocería y color del auto del hero', 'Fijar tarifa y radio del concierge', 'Mostrar u ocultar dyno, membresías y testimonios', 'Administrar testimonios y preguntas frecuentes']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas del equipo con rol y estado, y la matriz de permisos que define qué módulos ve cada rol.',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol', 'Desactivar una cuenta', 'Consultar la matriz de permisos']
    },
    {
      id: 'acceso-restringido', section: 'admin', login: U.asesor, title: 'Ruta protegida por rol', url: 'admin.html#/usuarios', waitFor: '.admin-content .empty',
      description: 'Lo que ve un rol sin permiso al abrir una sección ajena (aquí, el asesor intentando entrar a Usuarios): el menú solo muestra lo permitido y la ruta queda bloqueada.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a su inicio desde el botón', 'Confirmar que cada rol solo ve sus menús']
    }
  ]
};
