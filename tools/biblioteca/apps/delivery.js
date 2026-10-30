// Biblioteca de vistas de Rayo Express (/delivery).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.
//
// Ojo: los ids de envíos se generan al sembrar (cambian en cada contexto limpio), así que las
// vistas de detalle se abren por código RX haciendo clic en la fila correspondiente.
// Los mapas usan Leaflet + OpenStreetMap si hay red; sin red la app dibuja su mapa SVG propio.

const U = { persona: 'u-cli', empresa: 'u-emp', repartidor: 'u-c1', admin: 'u-admin', despacho: 'u-desp', soporte: 'u-sop' };
const head = '.page-head';
const row = code => `tr:has-text("${code}")`;
const LIVE = 'RX-48213'; // envío en camino de Librería Andes con Camila Rojas
const PEND = 'RX-41926'; // envío pendiente de Librería Andes

module.exports = {
  dir: 'delivery',
  name: 'Rayo Express',
  kind: 'Courier y delivery urbano',
  theme: 'noir',
  description: 'Courier urbano en Santiago con sitio público (cotizador, cobertura, solicitud y seguimiento en vivo), portal de clientes personas y empresas, app del repartidor y consola de despacho con operación en tiempo real.',
  accounts: {
    'u-cli': { name: 'Valentina Pérez', role: 'Cliente (persona)', email: 'valentina@correo.cl', password: 'demo123' },
    'u-emp': { name: 'Librería Andes', role: 'Cliente (empresa)', email: 'contacto@libreriaandes.cl', password: 'demo123' },
    'u-c1': { name: 'Camila Rojas', role: 'Repartidor', email: 'camila@rayoexpress.cl', password: 'demo123' },
    'u-admin': { name: 'Francisca Ibáñez', role: 'Administrador', email: 'admin@rayoexpress.cl', password: 'demo123' },
    'u-desp': { name: 'Tomás Herrera', role: 'Despachador', email: 'despacho@rayoexpress.cl', password: 'demo123' },
    'u-sop': { name: 'Daniela Fuentes', role: 'Soporte', email: 'soporte@rayoexpress.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Portal de clientes: personas (pago con tarjeta) y empresas (factura mensual y carga masiva).' },
    { id: 'repartidor', label: 'Repartidor', desc: 'App móvil del repartidor: conexión, ruta, entregas con firma, ganancias y documentos.' },
    { id: 'despachador', label: 'Despachador', desc: 'Consola de despacho: operación en vivo, envíos, flota y reportes.' },
    { id: 'soporte', label: 'Soporte', desc: 'Clientes, facturación e incidencias.' },
    { id: 'admin', label: 'Administrador', desc: 'Tarifas y zonas, usuarios y permisos, contenidos del sitio y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Noir Neón" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '#hero-track',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'aqua', group: 'Estilo', label: 'Aqua', desc: 'Claro, brillante y redondeado.', theme: 'aqua' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '#hero-track', mobile: true,
      description: 'Página de inicio con buscador de seguimiento, mapa de la flota en vivo, cifras de la operación, cotizador, cobertura, opiniones y preguntas frecuentes. Los textos se editan desde la consola. El mapa muestra calles reales con conexión; sin ella, el plano esquemático propio de la app.',
      actions: ['Rastrear un envío por su código RX', 'Ver cuántos repartidores están en ruta ahora', 'Revisar entregas del día, puntualidad y calificación', 'Ir a solicitar un envío o a cotizar', 'Leer opiniones y preguntas frecuentes']
    },
    {
      id: 'tarifas', section: 'publico', title: 'Cotizador de tarifas', url: 'index.html#/tarifas', waitFor: '.calc', keepScroll: true,
      description: 'Calculadora de precio por comuna de origen y destino, tamaño del paquete y tipo de servicio, con la tabla de tamaños y la explicación del cálculo. Usa las tarifas vigentes de la consola.',
      actions: ['Elegir comunas de origen y destino (o intercambiarlas)', 'Elegir tamaño: sobre, pequeño, mediano o grande', 'Comparar servicio estándar, express o programado', 'Ver precio, distancia, tiempo de entrega y recargos', 'Pasar a solicitar con esos datos']
    },
    {
      id: 'cobertura', section: 'publico', title: 'Cobertura', url: 'index.html#/cobertura', waitFor: '#cov-sel', keepScroll: true,
      description: 'Mapa de las 32 comunas atendidas agrupadas en 3 zonas, con tiempo de retiro y recargo de cada zona y un buscador por comuna.',
      actions: ['Consultar si una comuna tiene cobertura', 'Ver la zona, el tiempo de retiro y el recargo', 'Revisar las comunas de cada zona en el mapa']
    },
    {
      id: 'rastrear', section: 'publico', title: 'Rastrear envío', url: 'index.html#/rastrear', waitFor: '#tf',
      description: 'Buscador de seguimiento por código, con accesos a los envíos de demostración que están en ruta en ese momento.',
      actions: ['Ingresar un código RX (o solo sus 5 dígitos)', 'Abrir uno de los envíos en ruta de la demo', 'Ver un envío ya entregado']
    },
    {
      id: 'seguimiento', section: 'publico', title: 'Seguimiento en vivo', url: `index.html#/rastrear/${LIVE}`, waitFor: '.status-card', mobile: true,
      description: 'Seguimiento de un envío en camino: el repartidor avanza sobre el mapa, con cuenta regresiva de llegada, progreso, datos del repartidor y línea de tiempo. Con conexión el mapa es de calles reales; la captura muestra el plano esquemático que la app usa sin conexión.',
      actions: ['Ver la posición del repartidor y la ruta en el mapa', 'Seguir la hora estimada de llegada', 'Chatear o llamar al repartidor (simulado)', 'Revisar cada etapa del envío con su hora', 'Reportar un problema']
    },
    {
      id: 'seguimiento-entregado', section: 'publico', title: 'Envío entregado', url: 'index.html#/rastrear/RX-30981', waitFor: '.status-card',
      description: 'El mismo seguimiento cuando el envío ya llegó: muestra la prueba de entrega con firma, foto de respaldo y quién recibió, y permite calificar.',
      actions: ['Ver la firma y la foto de la entrega', 'Saber quién recibió y a qué hora', 'Calificar el servicio con estrellas y comentario', 'Revisar la línea de tiempo completa']
    },
    {
      id: 'solicitar', section: 'publico', title: 'Solicitar envío', url: 'index.html#/solicitar', waitFor: '#req',
      description: 'Formulario de solicitud para invitados o clientes con sesión: datos de retiro y entrega, paquete, servicio, propina y pago con tarjeta simulado, con resumen de precio al lado.',
      actions: ['Ingresar remitente y destinatario con comuna y teléfono', 'Elegir tamaño, servicio y propina', 'Agregar indicaciones para el repartidor', 'Ver el precio con recargos antes de confirmar', 'Pagar con tarjeta (simulado)']
    },
    {
      id: 'solicitar-listo', section: 'publico', title: 'Envío solicitado', url: 'index.html#/solicitar', waitFor: '#req',
      setup: async h => {
        await h.fill('[name="sname"]', 'Martín Soto'); await h.fill('[name="sphone"]', '+56 9 6543 2109'); await h.fill('[name="saddr"]', 'Av. Providencia 1208, of. 51');
        await h.fill('[name="rname"]', 'Josefa Castro'); await h.fill('[name="rphone"]', '+56 9 5511 2233'); await h.fill('[name="raddr"]', 'Av. Apoquindo 4500, depto 802');
        await h.click('#req button[type="submit"]'); await h.wait('.success-card');
      },
      description: 'Confirmación con el código de seguimiento. El envío entra a la cola de despacho y se busca al repartidor más cercano.',
      actions: ['Copiar el código de seguimiento', 'Abrir el seguimiento en vivo', 'Solicitar otro envío']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso y registro', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso común para clientes, repartidores y equipo, con registro de clientes persona o empresa. Cada rol abre su propia aplicación.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, despachador, soporte, repartidor o cliente', 'Crear una cuenta persona o empresa (factura mensual con descuento)']
    },

    // ================= Cliente =================
    {
      id: 'cliente-resumen', section: 'cliente', login: U.empresa, title: 'Resumen del cliente', url: 'cliente.html#/', waitFor: head, mobile: true,
      description: 'Inicio del portal con envíos en curso y su progreso, gasto y saldo del mes, envíos por semana y últimas entregas por calificar.',
      actions: ['Ver envíos en curso con su etapa', 'Revisar envíos del mes, gasto y saldo por pagar', 'Seguir la tendencia semanal', 'Calificar las últimas entregas', 'Crear un envío o una carga masiva']
    },
    {
      id: 'cliente-nuevo', section: 'cliente', login: U.empresa, title: 'Nuevo envío', url: 'cliente.html#/nuevo', waitFor: '[data-sum]',
      description: 'Alta de envío desde el portal usando la libreta de direcciones. En cuentas empresa se carga a la factura mensual con descuento; las personas pagan con tarjeta.',
      actions: ['Elegir retiro y entrega desde la libreta de direcciones', 'Definir paquete y servicio', 'Ver el resumen con descuento de empresa', 'Crear el envío y seguirlo en vivo']
    },
    {
      id: 'cliente-masivo', section: 'cliente', login: U.empresa, title: 'Carga masiva', url: 'cliente.html#/masivo', waitFor: '[data-sample]',
      setup: async h => { await h.click('[data-sample]'); await h.wait('[data-create]'); await h.scrollTo('[data-create]', 'center'); },
      description: 'Creación de decenas de envíos de una vez pegando filas o subiendo un CSV. Cada fila se valida y se muestra una vista previa con el total.',
      actions: ['Pegar filas o subir un archivo .csv', 'Cargar un ejemplo con el formato esperado', 'Validar y ver qué filas tienen errores', 'Crear todos los envíos válidos en un lote']
    },
    {
      id: 'cliente-envios', section: 'cliente', login: U.empresa, title: 'Historial de envíos', url: 'cliente.html#/envios', waitFor: 'tbody tr',
      description: 'Todos los envíos del cliente con destinatario, servicio, total y estado en vivo.',
      actions: ['Filtrar en curso, entregados o fallidos', 'Buscar por código o destinatario', 'Exportar a CSV', 'Abrir el detalle de un envío']
    },
    {
      id: 'cliente-envio', section: 'cliente', login: U.empresa, title: 'Detalle de envío', url: 'cliente.html#/envios', waitFor: 'tbody tr',
      setup: async h => { await h.click(row(LIVE)); await h.wait('[data-prog]'); return { url: h.here() }; },
      description: 'Detalle de un envío del portal con mapa de la ruta, progreso, repartidor, línea de tiempo y acciones según el estado. Con conexión el mapa es de calles reales; la captura muestra el plano esquemático.',
      actions: ['Seguir la ruta y la llegada estimada', 'Chatear con el repartidor', 'Cancelar un envío que aún no se retira', 'Calificar la entrega o reportar un problema']
    },
    {
      id: 'cliente-reclamo', section: 'cliente', login: U.empresa, kind: 'modal', from: 'Botón "Nuevo reclamo" en Reclamos o "Reportar un problema" en un envío', title: 'Nuevo reclamo', url: 'cliente.html#/reclamos', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para reclamar sobre un envío. El caso llega al tablero de incidencias de soporte con prioridad según el motivo.',
      actions: ['Elegir el envío afectado', 'Indicar el motivo (retraso, daño, extravío, cobro, etc.)', 'Describir lo ocurrido', 'Enviar el reclamo a soporte']
    },
    {
      id: 'cliente-reclamos', section: 'cliente', login: U.empresa, title: 'Reclamos', url: 'cliente.html#/reclamos', waitFor: '[data-open]',
      description: 'Casos abiertos con soporte y su estado (abierto, en revisión, resuelto o rechazado). Cada uno abre su conversación.',
      actions: ['Ver el estado de cada reclamo', 'Abrir la conversación con soporte', 'Crear un reclamo nuevo']
    },
    {
      id: 'cliente-direcciones', section: 'cliente', login: U.empresa, title: 'Direcciones', url: 'cliente.html#/direcciones', waitFor: '[data-add]',
      description: 'Libreta de direcciones para retiros y entregas frecuentes, con una dirección predeterminada.',
      actions: ['Agregar una dirección', 'Editar o eliminar direcciones', 'Marcar una como predeterminada']
    },
    {
      id: 'cliente-facturas', section: 'cliente', login: U.empresa, title: 'Facturas y pagos', url: 'cliente.html#/facturas', waitFor: 'tbody tr',
      description: 'Facturas mensuales de la empresa (o boletas, en cuentas persona) con saldo pendiente, mes en curso, pagos recientes y línea de crédito.',
      actions: ['Ver saldo pendiente y línea de crédito', 'Abrir el detalle imprimible de cada documento', 'Pagar un documento pendiente (simulado)', 'Exportar a CSV']
    },
    {
      id: 'cliente-factura', section: 'cliente', login: U.empresa, kind: 'modal', from: 'Clic en un documento de Facturas y pagos', title: 'Detalle de factura', url: 'cliente.html#/facturas', waitFor: 'tbody tr',
      setup: async h => { await h.click('tbody tr >> nth=0'); await h.modal(); },
      description: 'Documento con el periodo, los envíos incluidos y los montos, listo para imprimir.',
      actions: ['Revisar los envíos facturados', 'Ver neto, IVA y total', 'Imprimir o guardar en PDF']
    },
    {
      id: 'cliente-perfil', section: 'cliente', login: U.empresa, title: 'Perfil', url: 'cliente.html#/perfil', waitFor: head,
      description: 'Datos de la cuenta (razón social, contacto, RUT, teléfono y correo), avisos por correo y cambio de contraseña.',
      actions: ['Actualizar los datos de la empresa o persona', 'Activar avisos de estado por correo', 'Cambiar la contraseña', 'Ver el plan contratado']
    },
    {
      id: 'cliente-persona', section: 'cliente', login: U.persona, title: 'Cuenta persona', url: 'cliente.html#/', waitFor: head,
      description: 'El mismo portal para una persona: incluye los envíos que va a recibir, paga con tarjeta y ve boletas en vez de facturas.',
      actions: ['Ver los envíos que le están llegando', 'Enviar paquetes pagando con tarjeta', 'Revisar boletas y pagos']
    },

    // ================= Repartidor =================
    {
      id: 'repartidor-ruta', section: 'repartidor', login: U.repartidor, title: 'Ruta activa', url: 'repartidor.html#/', waitFor: '[data-do="pod"]', mobile: true,
      description: 'Pantalla principal de la app: interruptor de conexión, mapa con las paradas y la tarjeta del envío actual con los botones de cada etapa. Con conexión el mapa es de calles reales; la captura muestra el plano esquemático.',
      actions: ['Conectarse o desconectarse para recibir ofertas', 'Aceptar o rechazar ofertas con cuenta regresiva', 'Marcar retirado, en camino o entregado', 'Llamar o chatear con el destinatario', 'Registrar una entrega fallida']
    },
    {
      id: 'repartidor-entrega', section: 'repartidor', login: U.repartidor, kind: 'modal', from: 'Botón "Entregar" de la ruta activa', title: 'Prueba de entrega', url: 'repartidor.html#/', waitFor: '[data-do="pod"]', mobile: true,
      setup: async h => {
        await h.click('[data-do="pod"]'); await h.modal();
        // Firma de ejemplo trazada con el mouse sobre el lienzo.
        const b = await h.page.locator('.modal canvas').boundingBox();
        if (b) { const m = h.page.mouse; await m.move(b.x + b.width * .15, b.y + b.height * .6); await m.down(); for (let i = 1; i <= 24; i++) await m.move(b.x + b.width * (.15 + i * .028), b.y + b.height * (.55 + .2 * Math.sin(i / 2.2))); await m.up(); }
        await h.click('.modal [data-shot]');
      },
      description: 'Cierre de la entrega con nombre de quien recibe, firma en pantalla y foto de respaldo con hora y GPS (simulada). El cliente la ve en su seguimiento.',
      actions: ['Confirmar quién recibe y su RUT', 'Marcar entrega en conserjería', 'Capturar la firma con el dedo', 'Tomar la foto de respaldo', 'Confirmar la entrega']
    },
    {
      id: 'repartidor-fallido', section: 'repartidor', login: U.repartidor, kind: 'modal', from: 'Botón "No entregado" de la ruta activa', title: 'Entrega fallida', url: 'repartidor.html#/', waitFor: '[data-do="fail"]',
      setup: async h => { await h.click('[data-do="fail"]'); await h.modal(); },
      description: 'Registro de un intento sin éxito con su motivo. El envío vuelve a despacho para reprogramarlo.',
      actions: ['Elegir el motivo (ausente, dirección incorrecta, rechazo, etc.)', 'Agregar una nota', 'Devolver el envío a despacho']
    },
    {
      id: 'repartidor-ganancias', section: 'repartidor', login: U.repartidor, title: 'Ganancias', url: 'repartidor.html#/ganancias', waitFor: '.rider-main .card', mobile: true,
      description: 'Ganancias del día, la semana y el mes con propinas, gráfico de los últimos 14 días, próximo pago y detalle de cada viaje.',
      actions: ['Ver lo ganado hoy, en la semana y en el mes', 'Revisar el gráfico de 14 días', 'Saber el monto y la fecha del próximo pago', 'Ver cuánto dejó cada viaje y sus propinas']
    },
    {
      id: 'repartidor-historial', section: 'repartidor', login: U.repartidor, title: 'Historial de viajes', url: 'repartidor.html#/historial', waitFor: '.rider-main .card',
      description: 'Viajes realizados con ruta, estado, ganancia y calificación recibida.',
      actions: ['Ver viajes, calificación promedio y fallidos', 'Filtrar entregados, fallidos o con calificación', 'Revisar la ganancia de cada viaje']
    },
    {
      id: 'repartidor-perfil', section: 'repartidor', login: U.repartidor, title: 'Perfil y documentos', url: 'repartidor.html#/perfil', waitFor: '[data-veh]', mobile: true,
      description: 'Datos del repartidor, vehículo, zonas asignadas y documentos con su vencimiento y estado de revisión.',
      actions: ['Editar tipo, modelo y patente del vehículo', 'Ver las zonas donde trabaja', 'Subir documentos (simulado)', 'Revisar vencimientos y aprobaciones']
    },

    // ================= Despachador =================
    {
      id: 'despacho-dashboard', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador', 'Soporte'], title: 'Dashboard', url: 'admin.html#/', waitFor: head, mobile: true,
      description: 'Resumen de la operación en tiempo real: envíos de hoy, en curso y atrasados, puntualidad, ingresos, flota en línea, entregas de 30 días, alertas de SLA e incidencias abiertas.',
      actions: ['Ver los indicadores del día', 'Atender alertas de SLA con su atraso', 'Revisar estados de hoy e ingresos diarios', 'Ver el top de repartidores de la semana', 'Crear un envío o ir al mapa en vivo']
    },
    {
      id: 'despacho-operaciones', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador'], title: 'Operaciones en vivo', url: 'admin.html#/operaciones', waitFor: '[data-list]',
      description: 'Mapa de Santiago con toda la flota moviéndose, cola de envíos por asignar, envíos en curso y control del reloj de simulación. Con conexión el mapa es de calles reales; la captura muestra el plano esquemático.',
      actions: ['Ver repartidores libres, en ruta y envíos atrasados en el mapa', 'Asignar manualmente o activar la asignación automática', 'Revisar la cola, los envíos en curso y la flota', 'Acelerar o pausar la simulación', 'Generar envíos de prueba']
    },
    {
      id: 'despacho-envios', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador', 'Soporte'], title: 'Envíos', url: 'admin.html#/envios', waitFor: 'tbody tr',
      description: 'Todos los envíos con cliente, ruta, repartidor, SLA, total y estado, con filtros combinables.',
      actions: ['Filtrar por estado, fecha, servicio, comuna y repartidor', 'Ver los atrasados respecto del SLA', 'Buscar por código o cliente', 'Exportar a CSV', 'Abrir el detalle de un envío']
    },
    {
      id: 'despacho-envio', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador', 'Soporte'], kind: 'modal', from: 'Clic en un envío de la tabla, el dashboard o el buscador', title: 'Detalle de envío', url: 'admin.html#/envios', waitFor: 'tbody tr',
      setup: async h => { await h.fill('.admin-content input[type="search"], [data-q]', LIVE); await h.pause(300); await h.click(row(LIVE)); await h.modal(); },
      description: 'Ficha en vivo de un envío para la consola: mini mapa, progreso, repartidor, línea de tiempo, cliente, chat y notas internas. Los botones dependen del rol y del estado.',
      actions: ['Asignar o reasignar repartidor', 'Cambiar la etapa o registrar un intento fallido', 'Chatear con el repartidor como soporte', 'Agregar notas internas', 'Cancelar o eliminar el envío']
    },
    {
      id: 'despacho-asignar', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador'], kind: 'modal', from: 'Botón "Asignar" en la cola de Operaciones en vivo o en un envío pendiente', title: 'Asignar repartidor', url: 'admin.html#/operaciones', waitFor: '[data-list]',
      // Con la asignación automática encendida la cola se vacía sola: se apaga y se genera un envío de prueba.
      setup: async h => { await h.click('label.check:has([data-auto])'); await h.click('[data-gen]'); await h.click('[data-assign]'); await h.modal(); },
      description: 'Lista de repartidores disponibles ordenados por cercanía al retiro, con vehículo, carga actual y calificación.',
      actions: ['Comparar distancia al retiro de cada repartidor', 'Ver vehículo, carga y calificación', 'Asignar el envío a uno']
    },
    {
      id: 'despacho-nuevo', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador', 'Soporte'], kind: 'modal', from: 'Botón "Nuevo envío" de la consola', title: 'Nuevo envío (consola)', url: 'admin.html#/envios', waitFor: 'tbody tr',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Alta de un envío tomado por teléfono, para un cliente existente u ocasional, con precio calculado al instante.',
      actions: ['Elegir el cliente o dejarlo como ocasional', 'Ingresar retiro, entrega y paquete', 'Ver precio, distancia y zona', 'Crear el envío y abrir su ficha']
    },
    {
      id: 'despacho-repartidores', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador'], title: 'Repartidores', url: 'admin.html#/repartidores', waitFor: 'tbody tr',
      description: 'Flota con vehículo, zonas, estado, calificación, viajes y documentos, más indicadores de flota activa y documentos por revisar.',
      actions: ['Filtrar en línea, en ruta, con documentos por revisar o suspendidos', 'Crear o editar repartidores', 'Abrir la ficha de un repartidor', 'Exportar a CSV']
    },
    {
      id: 'despacho-repartidor', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador'], kind: 'modal', from: 'Clic en un repartidor de la tabla', title: 'Ficha de repartidor', url: 'admin.html#/repartidores', waitFor: 'tbody tr',
      setup: async h => { await h.click('tbody tr >> nth=0'); await h.modal(); },
      description: 'Ficha con datos del repartidor, viajes recientes, calificaciones y documentos para aprobar o rechazar.',
      actions: ['Aprobar o rechazar documentos', 'Conectarlo o desconectarlo', 'Suspender o reactivar la cuenta', 'Editar sus datos y zonas']
    },
    {
      id: 'despacho-reportes', section: 'despachador', login: U.despacho, roles: ['Administrador', 'Despachador'], title: 'Reportes', url: 'admin.html#/reportes', waitFor: head,
      description: 'Desempeño por periodo: envíos, entregas, puntualidad, ingresos, ticket promedio, ingresos por servicio, desempeño por repartidor y mapa de calor por comuna.',
      actions: ['Elegir 7, 30 o 60 días', 'Comparar con el periodo anterior', 'Ver entregas, ingresos y % a tiempo por semana', 'Ver el mapa de calor por comuna de origen o destino', 'Exportar el resumen diario a CSV']
    },

    // ================= Soporte =================
    {
      id: 'soporte-clientes', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], title: 'Clientes', url: 'admin.html#/clientes', waitFor: 'tbody tr',
      description: 'Clientes personas y empresas con plan, envíos y gasto de 30 días, saldo y estado.',
      actions: ['Filtrar empresas, personas, con saldo pendiente o inactivos', 'Crear o editar clientes', 'Abrir la ficha de un cliente', 'Exportar a CSV']
    },
    {
      id: 'soporte-cliente', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], kind: 'modal', from: 'Clic en un cliente de la tabla', title: 'Ficha de cliente', url: 'admin.html#/clientes', waitFor: 'tbody tr',
      setup: async h => { await h.click('tbody tr >> nth=0'); await h.modal(); },
      description: 'Ficha del cliente con sus últimos envíos, facturas, direcciones e incidencias.',
      actions: ['Revisar últimos envíos y abrir cualquiera', 'Ver facturas y saldo', 'Consultar direcciones e incidencias', 'Crear un envío para el cliente']
    },
    {
      id: 'soporte-facturacion', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], title: 'Facturación', url: 'admin.html#/facturacion', waitFor: 'tbody tr',
      description: 'Documentos emitidos con monto, vencimiento y estado, más indicadores de cobranza.',
      actions: ['Ver por cobrar, vencido y facturado en curso', 'Emitir las facturas del periodo', 'Registrar pagos', 'Enviar recordatorios de cobro', 'Exportar a CSV']
    },
    {
      id: 'soporte-incidencias', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Despachador', 'Soporte'], title: 'Incidencias', url: 'admin.html#/incidencias', waitFor: '[data-open]',
      description: 'Tablero de reclamos por estado (abierto, en revisión, resuelto, rechazado) con prioridad, responsable y compensaciones.',
      actions: ['Filtrar por tipo, prioridad o texto', 'Crear una incidencia', 'Abrir un caso para gestionarlo', 'Exportar a CSV']
    },
    {
      id: 'soporte-incidencia', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Despachador', 'Soporte'], kind: 'modal', from: 'Clic en una tarjeta del tablero de incidencias', title: 'Gestión de incidencia', url: 'admin.html#/incidencias', waitFor: '[data-open]',
      setup: async h => { await h.click('[data-open]'); await h.modal(); },
      description: 'Caso con cliente, envío, descripción y notas, y el flujo para tomarlo, resolverlo con compensación o rechazarlo.',
      actions: ['Tomar el caso o asignarlo a alguien de soporte', 'Cambiar la prioridad', 'Agregar notas', 'Resolver con compensación o rechazar con motivo', 'Abrir el envío asociado']
    },

    // ================= Administrador =================
    {
      id: 'admin-tarifas', section: 'admin', login: U.admin, title: 'Tarifas y zonas', url: 'admin.html#/tarifas', waitFor: '[data-preview]',
      description: 'Editor de precios: precio por km, mínimo, % del repartidor, tamaños, servicios, zonas, reglas de recargo y asignación de comunas a zonas, con vista previa. Al guardar, el cotizador público y los nuevos envíos usan los valores al instante.',
      actions: ['Ajustar precio por km, mínimo y % del repartidor', 'Editar tamaños, servicios y zonas', 'Crear reglas de recargo (p. ej. nocturno)', 'Mover comunas entre zonas', 'Probar un precio en la vista previa antes de guardar']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: 'tbody tr',
      description: 'Cuentas de la consola, repartidores y clientes con su rol, estado y último acceso, más la matriz de permisos por rol.',
      actions: ['Crear usuarios y cambiar su rol', 'Activar o desactivar cuentas', 'Restablecer contraseñas', 'Revisar qué puede hacer cada rol']
    },
    {
      id: 'admin-ajustes', section: 'admin', login: U.admin, title: 'Ajustes y CMS', url: 'admin.html#/ajustes', waitFor: '[data-save]',
      description: 'Contenidos del sitio público (portada, anuncio, secciones, preguntas frecuentes y contacto) y parámetros de operación y simulación.',
      actions: ['Editar textos de portada y la barra de anuncio', 'Administrar preguntas frecuentes', 'Actualizar datos de contacto y horario', 'Configurar asignación automática y velocidad de la simulación', 'Exportar o restablecer los datos demo']
    },
    {
      id: 'admin-actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: 'tbody tr',
      description: 'Bitácora de acciones de todo el sistema (consola, app del repartidor y portal de clientes).',
      actions: ['Filtrar por tipo de acción', 'Buscar en el registro', 'Ver quién hizo cada cambio y cuándo', 'Exportar a CSV']
    }
  ]
};
