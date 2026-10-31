// Biblioteca de vistas de Pudú Envíos (/reparto).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', despacho: 'u-coord', jorge: 'u-c1', daniela: 'u-c2', empresa: 'u-rem', destinatario: 'u-dest' };
// Ids fijos de la semilla: PE-482106 es el envío de Catalina en la ruta de Jorge; RT-7051 su retiro en Lana Austral.
const CATA = 's482106', PICKUP = 'p7051';
const nextStop = async h => { await h.click('.rp-next-addr'); await h.wait('.rp-stop-acts [data-deliver]'); };

module.exports = {
  dir: 'reparto',
  name: 'Pudú Envíos',
  kind: 'Reparto de última milla',
  theme: 'institucional',
  description: 'Empresa de paquetería con rutas multiparada: app del conductor para planificar y ejecutar su ruta (optimización, prueba de entrega, cobros, cierre), consola de despacho en vivo, portal para empresas remitentes, seguimiento y autogestión para quien recibe, y administración de flota, zonas y tarifas.',
  accounts: {
    'u-admin': { name: 'Paula Sepúlveda', role: 'Administrador', email: 'admin@puduenvios.cl', password: 'admin123' },
    'u-coord': { name: 'Rodrigo Álvarez', role: 'Coordinador de despacho', email: 'despacho@puduenvios.cl', password: 'despacho123' },
    'u-c1': { name: 'Jorge Fuentes', role: 'Conductor (ruta por iniciar)', email: 'conductor@puduenvios.cl', password: 'conductor123' },
    'u-c2': { name: 'Daniela Contreras', role: 'Conductor (ruta en curso)', email: 'daniela@puduenvios.cl', password: 'conductor123' },
    'u-rem': { name: 'Francisca Ibarra', role: 'Cliente empresa', email: 'empresa@lanaaustral.cl', password: 'empresa123' },
    'u-dest': { name: 'Catalina Rojas Medina', role: 'Destinatario', email: 'catalina@correo.cl', password: 'cliente123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier persona, sin iniciar sesión.' },
    { id: 'destinatario', label: 'Destinatario', desc: 'Quien recibe: sus paquetes en camino, indicaciones, cambios y evaluación.' },
    { id: 'conductor', label: 'Conductor', desc: 'App móvil del conductor: su ruta del día de principio a fin.' },
    { id: 'despacho', label: 'Coordinador de despacho', desc: 'Consola de operación: tablero en vivo, rutas, planificación y excepciones.' },
    { id: 'empresa', label: 'Cliente empresa', desc: 'Portal del remitente: crear envíos, etiquetas, retiros, pruebas y facturas.' },
    { id: 'admin', label: 'Administrador', desc: 'Flota, conductores, zonas, puntos, tarifas, usuarios, configuración y bitácora.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Institucional" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una disposición de página combinada con uno de los estilos visuales del catálogo, adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.rp-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'portal', group: 'Disposición', label: 'Portal', desc: 'Cabezal con franja de secciones y portada densa.', layout: 'portal' },
      { id: 'dividida', group: 'Disposición', label: 'Dividida', desc: 'Mitad izquierda tipo afiche, contenido a la derecha.', layout: 'dividida' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.rp-hero', mobile: true,
      description: 'Página de inicio con el buscador de seguimiento y una ruta real del día dibujada en vivo sobre el mapa propio de la ciudad. Explica qué puede hacer quien recibe y cómo funciona el reparto.',
      actions: ['Buscar un envío por su código', 'Ver una ruta del día con su avance en vivo', 'Revisar los indicadores de los últimos 30 días', 'Conocer las opciones para quien recibe', 'Ir a tarifas para empresas']
    },
    {
      id: 'seguimiento', section: 'publico', title: 'Seguimiento de un envío', url: 'index.html#/seguimiento?code=PE-482106', waitFor: '.rp-track', mobile: true,
      description: 'Estado del paquete en lenguaje simple con la ventana de llegada estimada, el mapa del destino (y del conductor cuando va en camino) y la línea de tiempo pública. Los datos personales se ocultan hasta verificar.',
      actions: ['Buscar por código PE- o por número de pedido de la tienda', 'Ver la ventana de llegada y cuántas paradas faltan', 'Revisar el historial público del envío', 'Verificarse con los 4 últimos dígitos del teléfono para gestionar la entrega']
    },
    {
      id: 'empresas', section: 'publico', title: 'Empresas y tarifas', url: 'index.html#/empresas', waitFor: '.rp-plan',
      description: 'Página para tiendas: los planes del tarifario (salen de la tabla de tarifas del panel) y un cotizador que calcula el precio con zona, peso, bultos, servicio y cobro contra entrega.',
      actions: ['Comparar los planes Pyme, Empresa y Marketplace', 'Cotizar un envío según comuna, peso y servicio', 'Ver recargos de zona y hora de corte', 'Conocer la carga masiva, las pruebas de entrega y la facturación']
    },
    {
      id: 'puntos', section: 'publico', title: 'Puntos de retiro', url: 'index.html#/puntos', waitFor: '.rp-point', mobile: true,
      description: 'Lockers y tiendas aliadas en el mapa, con dirección, horario y casilleros disponibles en tiempo real.',
      actions: ['Filtrar los puntos por comuna', 'Ver cada punto numerado en el mapa', 'Revisar horario y disponibilidad de casilleros']
    },
    {
      id: 'cobertura', section: 'publico', title: 'Cobertura', url: 'index.html#/cobertura', waitFor: '.rp-zonecov',
      description: 'Mapa de las 6 zonas de reparto y sus 31 comunas, con la hora de corte y el recargo de cada zona.',
      actions: ['Consultar si una comuna tiene cobertura', 'Saber si un envío llega hoy o mañana según la hora de corte', 'Ver las comunas de cada zona y sus recargos']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso con correo y contraseña o con una de las cuentas demo; cada rol entra a su propia app.',
      actions: ['Entrar con correo y contraseña', 'Entrar con un clic como conductor, despacho, empresa, destinatario o administrador', 'Volver al sitio público']
    },

    // ================= Destinatario =================
    {
      id: 'mis-envios', section: 'destinatario', login: U.destinatario, title: 'Mis envíos', url: 'index.html#/mis-envios', waitFor: '.rp-track', mobile: true,
      description: 'Todos los paquetes que vienen hacia la persona, con su estado, ventana de llegada y PIN de entrega; abajo, los ya entregados con su prueba de entrega.',
      actions: ['Ver cuándo llega cada paquete y quién lo trae', 'Dejar indicaciones al conductor', 'Elegir ventana horaria y lugar seguro', 'Reprogramar o enviar a un punto de retiro', 'Evaluar las entregas recibidas']
    },
    {
      id: 'dest-indicaciones', section: 'destinatario', login: U.destinatario, kind: 'modal', from: 'Botón "Indicaciones" de un envío', title: 'Indicaciones para el conductor', url: 'index.html#/mis-envios', waitFor: '.rp-track',
      setup: async h => { await h.click('[data-act="notes"]'); await h.modal(); await h.click('.modal [data-tag="Dejar con conserje"]'); await h.click('.modal [data-tag="Timbre malo"]'); },
      description: 'Etiquetas rápidas ("dejar con conserje", "timbre malo", "perro bravo"…) y un detalle libre que el conductor ve al llegar. Si el paquete ya va en el vehículo, despacho recibe una excepción.',
      actions: ['Marcar una o varias etiquetas', 'Escribir un detalle de hasta 280 caracteres', 'Enviar las indicaciones al conductor']
    },
    {
      id: 'dest-preferencias', section: 'destinatario', login: U.destinatario, kind: 'modal', from: 'Botón "Horario y lugar seguro"', title: 'Horario preferido y lugar seguro', url: 'index.html#/mis-envios', waitFor: '.rp-track',
      setup: async h => { await h.click('[data-act="prefs"]'); await h.modal(); },
      description: 'La ventana preferida pasa a ser una restricción del optimizador de la ruta; el lugar seguro autoriza dejar el paquete sin firma, con foto.',
      actions: ['Elegir una ventana de 3 horas', 'Autorizar un lugar seguro', 'Guardar las preferencias para esta entrega']
    },
    {
      id: 'dest-reprogramar', section: 'destinatario', login: U.destinatario, kind: 'modal', from: 'Botón "Reprogramar"', title: 'Reprogramar entrega', url: 'index.html#/mis-envios', waitFor: '.rp-track',
      setup: async h => { await h.click('[data-act="resched"]'); await h.modal(); },
      description: 'Cambio de fecha desde mañana y hasta 14 días. Si la ruta no ha salido, el paquete vuelve a bodega; si ya va en el vehículo, se avisa al conductor y a despacho.',
      actions: ['Elegir una nueva fecha', 'Sacar el paquete de la ruta de hoy', 'Avisar al conductor si el paquete ya está en camino']
    },
    {
      id: 'dest-punto', section: 'destinatario', login: U.destinatario, kind: 'modal', from: 'Botón "Punto de retiro"', title: 'Enviar a un punto de retiro', url: 'index.html#/mis-envios', waitFor: '.rp-track',
      setup: async h => { await h.click('[data-act="point"]'); await h.modal(); },
      description: 'Puntos de retiro ordenados por distancia a la dirección, en el mapa y con los casilleros disponibles. No deja elegir puntos llenos.',
      actions: ['Comparar puntos cercanos por distancia y horario', 'Ver la ocupación de cada punto', 'Redirigir el paquete y recibir el PIN para retirarlo']
    },
    {
      id: 'dest-chat', section: 'destinatario', login: U.destinatario, kind: 'modal', from: 'Botón "Chat con el conductor" (paquete en camino)', title: 'Chat con el conductor', url: 'index.html#/mis-envios', waitFor: '.rp-track',
      setup: async h => { await h.click('[data-act="chat"]'); await h.modal(); },
      description: 'Conversación con el conductor del paquete en ruta, con respuestas rápidas y números protegidos. Se actualiza en vivo (también entre pestañas).',
      actions: ['Enviar respuestas rápidas o un mensaje libre', 'Ver las respuestas del conductor en vivo', 'Coordinar la entrega sin compartir el teléfono']
    },
    {
      id: 'dest-evaluar', section: 'destinatario', login: U.destinatario, kind: 'modal', from: 'Botón "Evaluar entrega" en un envío entregado', title: 'Evaluar la entrega', url: 'index.html#/mis-envios', waitFor: '.rp-track',
      setup: async h => { await h.click('[data-act="rate"]'); await h.modal(); await h.click('.modal [data-tag="Puntual"]'); },
      description: 'Evaluación de 1 a 5 estrellas con etiquetas y comentario. Las de 1 o 2 estrellas abren un reclamo en la bandeja de excepciones de despacho.',
      actions: ['Poner de 1 a 5 estrellas', 'Marcar etiquetas como "Puntual" o "Cuidó el paquete"', 'Dejar un comentario para el conductor']
    },

    // ================= Conductor =================
    {
      id: 'cond-ruta-planificada', section: 'conductor', login: U.jorge, title: 'Mi ruta (por iniciar)', url: 'conductor.html#/', waitFor: '.rp-queue', mobile: true,
      description: 'Ruta del día antes de salir: mapa propio con las paradas numeradas en orden, cola de "próximos envíos" con ETA, ventanas, cobros y retiros mezclados, y la carga del vehículo contra su capacidad.',
      actions: ['Ver las paradas en el mapa y en la lista con su ETA', 'Reordenar arrastrando o con ↑ ↓ (las ETA se recalculan)', 'Optimizar la ruta', 'Revisar peso y volumen contra la capacidad del vehículo', 'Ir al checklist de inicio de jornada']
    },
    {
      id: 'cond-optimizar', section: 'conductor', login: U.jorge, kind: 'modal', from: 'Botón "Optimizar ruta"', title: 'Optimizar ruta', url: 'conductor.html#/', waitFor: '.rp-queue',
      setup: async h => { await h.click('[data-optimize]'); await h.modal(); },
      description: 'Heurística real de vecino más cercano + 2-opt + reubicación sobre las coordenadas de las paradas, que respeta ventanas horarias y prioridad express. Muestra km, hora de término y atrasos antes y después, con la vista previa en el mapa.',
      actions: ['Comparar km y hora de término antes y después', 'Ver cuántas paradas quedarían fuera de ventana', 'Previsualizar el nuevo orden en el mapa', 'Aplicar el orden optimizado']
    },
    {
      id: 'cond-inicio', section: 'conductor', login: U.jorge, title: 'Inicio de jornada', url: 'conductor.html#/inicio', waitFor: '.rp-checklist', mobile: true,
      description: 'Checklist del vehículo (con ítems críticos que bloquean la salida), odómetro y combustible, y escaneo de la carga en orden inverso de entrega. Al iniciar, cada destinatario recibe un SMS con su ventana de llegada.',
      actions: ['Responder el checklist (OK, observación o falla)', 'Registrar odómetro y nivel de combustible', 'Escanear los paquetes uno a uno o todos', 'Marcar paquetes que no están en el andén', 'Iniciar la ruta']
    },
    {
      id: 'cond-parada-planificada', section: 'conductor', login: U.jorge, title: 'Ficha de parada', url: `conductor.html#/parada/${CATA}`, waitFor: '.rp-stop-acts',
      description: 'Ficha de una parada con las indicaciones del destinatario, su ventana preferida y lugar seguro, y el historial de la dirección: notas de conductores anteriores y entregas previas en ese mismo lugar.',
      actions: ['Leer las indicaciones del destinatario', 'Ver notas y entregas anteriores en la dirección', 'Navegar, llamar o chatear (simulado)', 'Agregar una nota para próximas entregas', 'Revisar paquete, cobro, PIN y seguimiento']
    },
    {
      id: 'cond-nota', section: 'conductor', login: U.jorge, kind: 'modal', from: 'Botón "＋ Nota" del historial de la dirección', title: 'Nota para próximas entregas', url: `conductor.html#/parada/${CATA}`, waitFor: '.rp-stop-acts',
      setup: async h => { await h.click('[data-addnote]'); await h.modal(); },
      description: 'Nota asociada a la dirección (no al envío): la verán todos los conductores que entreguen ahí en el futuro.',
      actions: ['Elegir el tipo de nota (conserjería, acceso, perro…)', 'Escribir la indicación', 'Guardarla en el historial de la dirección']
    },
    {
      id: 'cond-ruta-curso', section: 'conductor', login: U.daniela, title: 'Mi ruta (en curso)', url: 'conductor.html#/', waitFor: '.rp-next', mobile: true,
      description: 'Ruta a mitad de jornada: tarjeta de la siguiente parada con ETA, distancia e indicaciones, accesos a navegar, llamar, chatear y entregar, avance, km, término estimado y efectivo cobrado.',
      actions: ['Ir a la siguiente parada', 'Tomar y terminar la colación (las ETA la consideran)', 'Ver las paradas hechas y fallidas', 'Reordenar u optimizar lo que queda', 'Pasar al cierre al terminar']
    },
    {
      id: 'cond-navegar', section: 'conductor', login: U.daniela, kind: 'modal', from: 'Botón "Navegar" de la siguiente parada', title: 'Navegación (simulada)', url: 'conductor.html#/', waitFor: '.rp-next',
      setup: async h => { await h.click('.rp-next [data-nav]'); await h.modal(); },
      description: 'Trayecto desde la posición del vehículo hasta la parada con instrucciones paso a paso, minutos, km y hora de llegada.',
      actions: ['Seguir las instrucciones de giro', 'Ver el trayecto en el mapa', 'Marcar "Llegué" y abrir la ficha de la parada']
    },
    {
      id: 'cond-llamar', section: 'conductor', login: U.daniela, kind: 'modal', from: 'Botón "Llamar"', title: 'Llamada enmascarada', url: 'conductor.html#/', waitFor: '.rp-next',
      setup: async h => { await h.click('.rp-next [data-call]'); await h.modal(); },
      description: 'Llamada simulada con número protegido y cronómetro; queda registrada en la bitácora.',
      actions: ['Llamar al destinatario sin ver su número', 'Ver la duración de la llamada', 'Colgar']
    },
    {
      id: 'cond-chat', section: 'conductor', login: U.daniela, kind: 'modal', from: 'Botón "Chat"', title: 'Chat con el destinatario', url: 'conductor.html#/', waitFor: '.rp-next',
      setup: async h => { await h.click('.rp-next [data-chatopen]'); await h.modal(); },
      description: 'Chat con respuestas rápidas para el camino ("voy en camino", "estoy afuera"…). El destinatario simulado responde solo; la cuenta demo de destinatario puede contestar desde el sitio.',
      actions: ['Enviar respuestas rápidas', 'Escribir un mensaje libre', 'Ver la conversación en vivo']
    },
    {
      id: 'cond-parada', section: 'conductor', login: U.daniela, title: 'Parada en curso', url: 'conductor.html#/', waitFor: '.rp-next', mobile: true,
      setup: nextStop,
      description: 'Ficha de la parada actual con los botones de entrega y de intento fallido, indicaciones, historial de la dirección, mapa con la parada destacada y seguimiento.',
      actions: ['Registrar la entrega con prueba', 'Registrar un intento fallido', 'Reintentar más tarde una parada fallida', 'Revisar indicaciones y entregas anteriores']
    },
    {
      id: 'cond-entregar', section: 'conductor', login: U.daniela, kind: 'modal', from: 'Botón "Entregar" de una parada', title: 'Prueba de entrega', url: 'conductor.html#/', waitFor: '.rp-next',
      setup: async h => { await nextStop(h); await h.click('[data-deliver]'); await h.modal(); },
      description: 'Registro de la entrega: quién recibe y su RUT, PIN si el envío lo exige, bultos (entrega parcial con motivo), cobro contra entrega con vuelto, firma en el recuadro o lugar seguro con foto, y una nota para la dirección. Valida todo antes de confirmar.',
      actions: ['Elegir quién recibe y validar su RUT', 'Pedir el PIN del destinatario', 'Cobrar en efectivo, tarjeta o transferencia con vuelto', 'Firmar en pantalla o dejar en lugar seguro con foto', 'Registrar una entrega parcial']
    },
    {
      id: 'cond-fallido', section: 'conductor', login: U.daniela, kind: 'modal', from: 'Botón "No entregado"', title: 'Intento fallido', url: 'conductor.html#/', waitFor: '.rp-next',
      setup: async h => { await nextStop(h); await h.click('[data-fail]'); await h.modal(); },
      description: 'Motivo del intento fallido, detalle, aviso de visita y qué hacer con el paquete: reintentar hoy al final de la ruta, volver al CD o enviarlo al punto de retiro más cercano. Notifica al destinatario y abre una excepción.',
      actions: ['Elegir el motivo', 'Indicar si dejó aviso de visita', 'Reintentar hoy, devolver al CD o enviar a punto de retiro', 'Avisar automáticamente a despacho y al destinatario']
    },
    {
      id: 'cond-cierre', section: 'conductor', login: U.daniela, title: 'Cierre del día', url: 'conductor.html#/cierre', waitFor: '[data-close]', mobile: true,
      description: 'Cierre de jornada al volver al CD: devolución de paquetes no entregados (escaneo uno a uno), cuadratura del efectivo cobrado, odómetro y combustible final. Las diferencias de caja generan una excepción.',
      actions: ['Confirmar la devolución de cada paquete', 'Declarar el efectivo y ver la diferencia', 'Registrar odómetro y combustible final', 'Cerrar la jornada']
    },
    {
      id: 'cond-combustible', section: 'conductor', login: U.daniela, title: 'Combustible', url: 'conductor.html#/combustible', waitFor: '[data-fuel]',
      description: 'Registro de cargas de combustible durante la ruta (litros, monto, odómetro y estación) y el historial del conductor.',
      actions: ['Registrar una carga', 'Ver las cargas anteriores', 'Validar el odómetro contra el de salida']
    },
    {
      id: 'cond-mensajes', section: 'conductor', login: U.daniela, title: 'Mensajes', url: 'conductor.html#/mensajes', waitFor: '.rp-thread',
      description: 'Conversaciones con los destinatarios y despacho de la ruta del día, ordenadas por la más reciente.',
      actions: ['Abrir una conversación', 'Responder al destinatario', 'Ver mensajes de despacho']
    },
    {
      id: 'cond-historial', section: 'conductor', login: U.daniela, title: 'Mi historial', url: 'conductor.html#/historial', waitFor: '.admin-content table',
      description: 'Rutas del conductor con paradas, entregas, km y cuadratura de caja, más las evaluaciones que dejaron los destinatarios.',
      actions: ['Revisar rutas anteriores', 'Ver diferencias de caja de cada cierre', 'Leer las evaluaciones recibidas']
    },

    // ================= Despacho =================
    {
      id: 'despacho-tablero', section: 'despacho', login: U.despacho, title: 'Tablero de operación', url: 'admin.html#/', waitFor: '.rp-routes', mobile: true,
      description: 'Operación en vivo: KPIs del día (a tiempo, éxito al primer intento, paradas por hora, km), mapa con todas las rutas y los vehículos moviéndose, excepciones recientes y una tarjeta por ruta con avance y barras de capacidad.',
      actions: ['Seguir los vehículos en el mapa (se mueven solos)', 'Destacar una ruta en el mapa', 'Ver avance, atrasos, fallidos y carga de cada ruta', 'Ir a las excepciones o a planificar', 'Revisar la actividad reciente']
    },
    {
      id: 'despacho-rutas', section: 'despacho', login: U.despacho, title: 'Rutas', url: 'admin.html#/rutas', waitFor: '.admin-content table',
      description: 'Listado de rutas de hoy, anteriores o todas, con conductor, vehículo, zona, avance y km.',
      actions: ['Filtrar por período', 'Crear una ruta nueva', 'Abrir el detalle de una ruta', 'Exportar a CSV']
    },
    {
      id: 'despacho-ruta', section: 'despacho', login: U.despacho, title: 'Detalle de ruta', url: 'admin.html#/rutas/r-dani', waitFor: '.rp-stoptable',
      description: 'Una ruta con su mapa, carga, paradas con ETA y atrasos, y los datos de jornada (checklist, colación, combustible, optimización y cierre).',
      actions: ['Seleccionar paradas pendientes y moverlas a otro conductor (con transbordo)', 'Devolver paradas a la bodega', 'Optimizar la ruta', 'Revisar checklist, colación y cierre de caja']
    },
    {
      id: 'despacho-nueva-ruta', section: 'despacho', login: U.despacho, kind: 'modal', from: 'Botón "Nueva ruta"', title: 'Nueva ruta', url: 'admin.html#/rutas', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Creación de una ruta con conductor, vehículo y zona; solo ofrece conductores y vehículos operativos sin ruta activa hoy.',
      actions: ['Elegir conductor libre', 'Elegir vehículo operativo', 'Asignar la zona']
    },
    {
      id: 'despacho-planificar', section: 'despacho', login: U.despacho, title: 'Planificación', url: 'admin.html#/planificar', waitFor: '.rp-zones',
      description: 'Envíos y retiros en bodega por zona (cantidad, kilos y m³) sobre el mapa, recursos libres, rutas por iniciar con su capacidad y la recepción de paquetes en el CD.',
      actions: ['Filtrar por zona', 'Asignar envíos a una ruta validando capacidad', 'Armar rutas automáticamente', 'Recibir en el CD los paquetes etiquetados', 'Crear rutas nuevas']
    },
    {
      id: 'despacho-auto', section: 'despacho', login: U.despacho, kind: 'modal', from: 'Botón "Armar rutas automáticamente"', title: 'Resultado de la planificación', url: 'admin.html#/planificar', waitFor: '.rp-zones',
      setup: async h => { await h.click('[data-auto]'); await h.modal(); await h.click('.modal [data-ok]', { after: 600 }); await h.modal(); },
      description: 'Agrupa por zona y capacidad de peso y volumen: llena las rutas por iniciar, crea rutas con conductores y vehículos libres y optimiza cada una. Informa lo que quedó sin cupo.',
      actions: ['Ver cuántos envíos se asignaron', 'Abrir las rutas creadas o modificadas', 'Revisar los envíos que quedaron sin cupo']
    },
    {
      id: 'despacho-excepciones', section: 'despacho', login: U.despacho, title: 'Excepciones', url: 'admin.html#/excepciones', waitFor: '.rp-inbox',
      description: 'Bandeja de casos: intentos fallidos, notas y cambios pedidos con el paquete en ruta, diferencias de caja, observaciones de checklist y reclamos, ordenados por prioridad.',
      actions: ['Filtrar por estado y tipo', 'Gestionar un caso', 'Exportar a CSV']
    },
    {
      id: 'despacho-gestionar', section: 'despacho', login: U.despacho, kind: 'modal', from: 'Botón "Gestionar" de una excepción', title: 'Gestionar excepción', url: 'admin.html#/excepciones', waitFor: '.rp-inbox',
      setup: async h => { await h.click('[data-handle]'); await h.modal(); },
      description: 'Acciones según el caso: reintentar hoy, reprogramar, enviar a punto de retiro, devolver al remitente, avisar al conductor por chat o mandar el vehículo a mantención; luego se registra la resolución.',
      actions: ['Reintentar la entrega hoy', 'Reprogramar o enviar a punto de retiro', 'Avisar al conductor', 'Marcar en gestión o resolver con nota']
    },
    {
      id: 'despacho-envios', section: 'despacho', login: U.despacho, title: 'Envíos', url: 'admin.html#/envios', waitFor: '.admin-content table',
      description: 'Todos los envíos con búsqueda, filtros por remitente, comuna, servicio, estado y fecha, y exportación.',
      actions: ['Buscar por código, destinatario o referencia', 'Filtrar por estado, fecha o remitente', 'Imprimir la etiqueta', 'Recibir en el CD', 'Exportar a CSV']
    },
    {
      id: 'despacho-envio', section: 'despacho', login: U.despacho, title: 'Detalle de envío', url: `admin.html#/envios/${CATA}`, waitFor: '.k-timeline',
      description: 'Ficha completa del envío: datos, mapa, prueba de entrega, intentos, indicaciones, chat, ruta y la línea de tiempo con estados y SMS enviados.',
      actions: ['Cambiar el estado con su historial', 'Editar datos del envío', 'Ver intentos, indicaciones y chat', 'Imprimir la etiqueta']
    },
    {
      id: 'despacho-etiqueta', section: 'despacho', login: U.despacho, kind: 'modal', from: 'Botón "Etiqueta" del detalle de envío', title: 'Etiqueta', url: `admin.html#/envios/${CATA}`, waitFor: '.k-timeline',
      setup: async h => { await h.click('.page-head [data-act="label"]'); await h.modal(); },
      description: 'Etiqueta 10×15 con zona, comuna destacada, destinatario, remitente, peso, bultos, cobro y código de barras.',
      actions: ['Revisar destinatario, remitente y zona', 'Confirmar peso, bultos y cobro', 'Imprimirla en A4 o rollo térmico']
    },
    {
      id: 'despacho-retiros', section: 'despacho', login: U.despacho, title: 'Retiros', url: 'admin.html#/retiros', waitFor: '.admin-content table',
      description: 'Retiros en bodegas de clientes que se suman a las rutas del día.',
      actions: ['Crear un retiro', 'Filtrar por cliente o comuna', 'Abrir su detalle y comprobante']
    },
    {
      id: 'despacho-retiro', section: 'despacho', login: U.despacho, title: 'Detalle de retiro', url: `admin.html#/retiros/${PICKUP}`, waitFor: '.k-timeline',
      description: 'Ficha del retiro con el cliente, bultos estimados, ruta asignada y su historial.',
      actions: ['Cambiar el estado', 'Editar bultos y ventana', 'Ver la ruta asignada']
    },
    {
      id: 'despacho-indicadores', section: 'despacho', login: U.despacho, title: 'Indicadores', url: 'admin.html#/indicadores', waitFor: '.chart',
      description: 'KPIs de hoy y de los últimos 30 días: envíos por día, % a tiempo, % al primer intento, motivos de fallo y una tabla por conductor.',
      actions: ['Comparar días', 'Ver los motivos de fallo', 'Comparar conductores', 'Exportar 30 días a CSV']
    },

    // ================= Empresa =================
    {
      id: 'empresa-resumen', section: 'empresa', login: U.empresa, title: 'Resumen', url: 'empresa.html#/', waitFor: '.chart', mobile: true,
      description: 'Panel del remitente: envíos del mes, en tránsito, éxito al primer intento, recaudado contra entrega, satisfacción, gráficos y los envíos que requieren atención.',
      actions: ['Ver el estado de todos sus envíos', 'Atender envíos con problemas', 'Crear un envío o hacer una carga masiva']
    },
    {
      id: 'empresa-envios', section: 'empresa', login: U.empresa, title: 'Mis envíos', url: 'empresa.html#/envios', waitFor: '.admin-content table',
      description: 'Solo los envíos de la empresa, con búsqueda, filtros y exportación.',
      actions: ['Buscar por código o referencia', 'Filtrar por estado o fecha', 'Imprimir etiquetas', 'Exportar a CSV']
    },
    {
      id: 'empresa-envio', section: 'empresa', login: U.empresa, title: 'Detalle de envío', url: `empresa.html#/envios/${CATA}`, waitFor: '.k-timeline',
      description: 'Seguimiento del envío con mapa, intentos, prueba de entrega descargable y evaluación del destinatario.',
      actions: ['Ver el seguimiento', 'Descargar el comprobante de entrega', 'Imprimir la etiqueta']
    },
    {
      id: 'empresa-nuevo', section: 'empresa', login: U.empresa, title: 'Nuevo envío', url: 'empresa.html#/nuevo', waitFor: '[data-f]',
      description: 'Formulario con validación y cotización en vivo (plan, zona, peso, bultos, servicio, cobro) y mapa del destino. Decide solo si sale hoy o mañana según la hora de corte.',
      actions: ['Completar destinatario y dirección', 'Elegir servicio, ventana y cobro contra entrega', 'Exigir PIN para envíos de alto valor', 'Ver el precio antes de crear', 'Imprimir la etiqueta al terminar']
    },
    {
      id: 'empresa-masiva', section: 'empresa', login: U.empresa, title: 'Carga masiva CSV', url: 'empresa.html#/masiva', waitFor: '#bk-t',
      setup: async h => { await h.click('[data-example]'); await h.wait('[data-import]'); },
      description: 'Pegado de una planilla CSV con validación fila a fila (comuna con cobertura, teléfono, peso, ventana) y precio de cada envío antes de importar.',
      actions: ['Pegar el CSV o cargar el ejemplo', 'Ver errores por fila', 'Importar solo las filas válidas', 'Descargar la plantilla', 'Imprimir todas las etiquetas creadas']
    },
    {
      id: 'empresa-etiquetas', section: 'empresa', login: U.empresa, title: 'Etiquetas', url: 'empresa.html#/etiquetas', waitFor: '.rp-label',
      description: 'Envíos pendientes de etiquetar con selección múltiple y vista previa.',
      actions: ['Seleccionar envíos', 'Imprimir varias etiquetas a la vez', 'Revisar la vista previa']
    },
    {
      id: 'empresa-retiros', section: 'empresa', login: U.empresa, title: 'Retiros', url: 'empresa.html#/retiros', waitFor: '.admin-content table',
      description: 'Solicitudes de retiro en la bodega de la empresa y su estado.',
      actions: ['Pedir un retiro', 'Ver si ya fue asignado a una ruta', 'Revisar el comprobante']
    },
    {
      id: 'empresa-nuevo-retiro', section: 'empresa', login: U.empresa, kind: 'modal', from: 'Botón "Nuevo retiro"', title: 'Solicitar retiro', url: 'empresa.html#/retiros', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario prellenado con la dirección y el contacto de la empresa para pedir que un conductor pase a buscar los paquetes.',
      actions: ['Confirmar dirección y contacto', 'Indicar bultos, peso y volumen', 'Elegir una ventana horaria']
    },
    {
      id: 'empresa-pruebas', section: 'empresa', login: U.empresa, title: 'Pruebas de entrega', url: 'empresa.html#/pruebas', waitFor: '.rp-proofcard',
      description: 'Galería con foto, firma y datos de quién recibió cada paquete, más la evaluación del destinatario.',
      actions: ['Buscar por código, destinatario o referencia', 'Ver foto y firma', 'Exportar a CSV']
    },
    {
      id: 'empresa-facturas', section: 'empresa', login: U.empresa, title: 'Facturas', url: 'empresa.html#/facturas', waitFor: '.admin-content table',
      description: 'Facturas mensuales de la empresa con envíos del período, total y estado de pago.',
      actions: ['Ver facturas pendientes y vencidas', 'Filtrar por estado', 'Exportar a CSV']
    },
    {
      id: 'empresa-cuenta', section: 'empresa', login: U.empresa, title: 'Mi cuenta', url: 'empresa.html#/cuenta', waitFor: '.admin-content form',
      description: 'Datos personales del usuario de la empresa.',
      actions: ['Editar nombre, correo y teléfono', 'Cambiar la contraseña', 'Guardar']
    },

    // ================= Administrador =================
    {
      id: 'admin-conductores', section: 'admin', login: U.admin, title: 'Conductores', url: 'admin.html#/conductores', waitFor: '.admin-content table',
      description: 'Conductores propios con RUT, licencia, vehículo y zona habituales.',
      actions: ['Crear o editar conductores', 'Activar o desactivar', 'Abrir sus últimas rutas', 'Exportar a CSV']
    },
    {
      id: 'admin-conductor', section: 'admin', login: U.admin, title: 'Detalle de conductor', url: 'admin.html#/conductores/u-c1', waitFor: '.k-kv',
      description: 'Ficha del conductor con sus datos y últimas rutas.',
      actions: ['Editar licencia y vehículo', 'Ver sus rutas', 'Desactivarlo']
    },
    {
      id: 'admin-vehiculos', section: 'admin', login: U.admin, title: 'Vehículos', url: 'admin.html#/vehiculos', waitFor: '.admin-content table',
      description: 'Flota con capacidad en kg y litros, kilometraje, próxima mantención, revisión técnica y estado.',
      actions: ['Crear o editar vehículos', 'Marcar en mantención', 'Filtrar por tipo o estado', 'Exportar a CSV']
    },
    {
      id: 'admin-vehiculo', section: 'admin', login: U.admin, title: 'Detalle de vehículo', url: 'admin.html#/vehiculos/v1', waitFor: '.k-kv',
      description: 'Ficha del vehículo con sus cargas de combustible.',
      actions: ['Editar capacidad y documentos', 'Ver cargas de combustible', 'Cambiar su estado']
    },
    {
      id: 'admin-zonas', section: 'admin', login: U.admin, title: 'Zonas', url: 'admin.html#/zonas', waitFor: '.admin-content table',
      description: 'Zonas de reparto con sus comunas, color, hora de corte y recargo.',
      actions: ['Editar las comunas de una zona', 'Fijar hora de corte y recargo', 'Cambiar el color del mapa']
    },
    {
      id: 'admin-puntos', section: 'admin', login: U.admin, title: 'Puntos de retiro', url: 'admin.html#/puntos', waitFor: '.admin-content table',
      description: 'Lockers y tiendas aliadas con horario, capacidad y ocupación actual.',
      actions: ['Crear o editar puntos', 'Ajustar capacidad', 'Activar o desactivar']
    },
    {
      id: 'admin-empresas', section: 'admin', login: U.admin, title: 'Clientes empresa', url: 'admin.html#/empresas', waitFor: '.admin-content table',
      description: 'Remitentes con contrato, su tarifa y volumen de envíos.',
      actions: ['Crear o editar clientes', 'Asignar tarifa', 'Desactivar un cliente']
    },
    {
      id: 'admin-tarifas', section: 'admin', login: U.admin, title: 'Tarifas', url: 'admin.html#/tarifas', waitFor: '.admin-content table',
      description: 'Tarifario por plan: base, kilo y bulto adicional, recargos express y mismo día, comisión de cobro contra entrega.',
      actions: ['Editar precios por plan', 'Crear un plan', 'Ver qué usa el cotizador del sitio']
    },
    {
      id: 'admin-facturacion', section: 'admin', login: U.admin, title: 'Facturación', url: 'admin.html#/facturas', waitFor: '.admin-content table',
      description: 'Facturas mensuales por cliente con su estado de pago.',
      actions: ['Registrar pagos', 'Filtrar vencidas', 'Emitir una factura', 'Exportar a CSV']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de todos los roles y cuáles aparecen como demo en el login.',
      actions: ['Crear, editar o desactivar usuarios', 'Cambiar el rol', 'Marcar cuentas demo']
    },
    {
      id: 'admin-configuracion', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/config', waitFor: '.admin-content form',
      description: 'Datos del sitio y parámetros de operación que usan las ETA y el optimizador: velocidad media, minutos por parada, colación, hora de corte, intentos máximos y SMS.',
      actions: ['Editar eslogan y contacto', 'Ajustar velocidad y minutos por parada', 'Configurar colación y hora de corte', 'Exportar datos o restablecer la demo']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Últimos 300 eventos: rutas, entregas, excepciones, planificación, simulación y configuración.',
      actions: ['Buscar y filtrar por acción', 'Ver quién hizo qué', 'Exportar a CSV']
    }
  ]
};
