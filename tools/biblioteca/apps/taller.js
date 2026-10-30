// Biblioteca de vistas de Mecánica Integral Los Andes (/taller).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'u-cli', asesor: 'u-asesor', mecanico: 'u-mec', jefe: 'u-jefe', bodega: 'u-bod', aseguradora: 'u-seg', admin: 'u-admin' };
// OT de la semilla (ids estables): presupuesto de la clienta demo, una en reparación y una lista para entregar.
const OT = { demo: 'OT-24848', demoId: 'ot58', reparacionId: 'ot48', listoId: 'ot56', diagnosticoId: 'ot40' };
const PANEL = ['Asesor de servicio', 'Jefe de taller', 'Administrador'];
const firstRow = '.admin-content tbody tr >> nth=0';
// El modal enfoca el botón principal del pie y queda desplazado hacia abajo: lo devuelve arriba.
const modalTop = h => h.page.evaluate(() => document.querySelectorAll('.modal').forEach(m => { m.scrollTop = 0; }));

module.exports = {
  dir: 'taller',
  name: 'Mecánica Integral Los Andes',
  kind: 'Taller mecánico',
  theme: 'blueprint',
  description: 'Taller mecánico y de carrocería con sitio público (cotización, aprobación del presupuesto ítem por ítem, seguimiento de la OT y garantías), cuenta del cliente, panel del taller, app del mecánico y portal para liquidadores de seguros.',
  accounts: {
    'u-cli': { name: 'Ignacio Pérez', role: 'Cliente', email: 'cliente@losandes.cl', password: 'demo123' },
    'u-asesor': { name: 'Camila Bustos', role: 'Asesor de servicio', email: 'asesor@losandes.cl', password: 'demo123' },
    'u-mec': { name: 'Juan Carrasco', role: 'Mecánico', email: 'mecanico@losandes.cl', password: 'demo123' },
    'u-jefe': { name: 'Hernán Alarcón', role: 'Jefe de taller', email: 'jefe@losandes.cl', password: 'demo123' },
    'u-bod': { name: 'Raúl Medina', role: 'Bodega', email: 'bodega@losandes.cl', password: 'demo123' },
    'u-seg': { name: 'Marcela Ibáñez', role: 'Aseguradora', email: 'liquidador@segcordillera.cl', password: 'demo123' },
    'u-admin': { name: 'Patricia Rojas', role: 'Administrador', email: 'admin@losandes.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Cuenta personal: OT en curso, vehículos, historial y documentos.' },
    { id: 'asesor', label: 'Asesor de servicio', desc: 'Panel del taller: tablero de OT, ficha de la OT, solicitudes web, clientes, seguros y documentos.' },
    { id: 'mecanico', label: 'Mecánico', desc: 'App móvil con sus trabajos, cronómetro por tarea, repuestos y hallazgos.' },
    { id: 'jefe', label: 'Jefe de taller', desc: 'Indicadores del taller, mecánicos, baremo y tarifas.' },
    { id: 'bodega', label: 'Bodega', desc: 'Inventario de repuestos, pedidos de mecánicos, compras y proveedores.' },
    { id: 'aseguradora', label: 'Aseguradora', desc: 'Portal del liquidador para evaluar siniestros del taller.' },
    { id: 'admin', label: 'Administrador', desc: 'Contenido del sitio, usuarios y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Plano" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero [data-lk] form',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'graphite', group: 'Estilo', label: 'Grafito', desc: 'Sobrio, gris oscuro y tipografía firme.', theme: 'graphite' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'material', group: 'Estilo', label: 'Material 14', desc: 'Tarjetas con sombra y colores planos.', theme: 'material' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero [data-lk] form', mobile: true,
      description: 'Página de inicio con buscador de OT, un resumen en vivo de los autos que están hoy en el taller por etapa, los servicios, el proceso de trabajo y los convenios con aseguradoras.',
      actions: ['Buscar su OT por código o patente', 'Ver cuántas OT hay en cada etapa del taller', 'Entrar a un servicio o pedir cotización', 'Ingresar un siniestro con su seguro', 'Consultar una garantía']
    },
    {
      id: 'servicios', section: 'publico', title: 'Servicios', url: 'index.html#/servicios', waitFor: '.svc-card',
      description: 'Todos los servicios del taller agrupados por área (mecánica, diagnóstico, carrocería y siniestros), con precio referencial desde.',
      actions: ['Recorrer los servicios por área', 'Ver el precio desde de cada uno', 'Abrir la ficha de un servicio']
    },
    {
      id: 'servicio-ficha', section: 'publico', title: 'Ficha de servicio', url: 'index.html#/servicios/mecanica', waitFor: '.hero-media',
      description: 'Detalle de un servicio con lo que incluye, la tarifa por hora y la tabla de trabajos frecuentes con sus horas estándar y mano de obra referencial (baremo).',
      actions: ['Ver qué incluye el servicio', 'Revisar los trabajos típicos y sus horas estándar', 'Ver el valor de mano de obra referencial', 'Pedir cotización de ese servicio']
    },
    {
      id: 'cotizar', section: 'publico', title: 'Cotizar o agendar', url: 'index.html#/cotizar', waitFor: '[data-f]', mobile: true,
      setup: async h => { await h.click('[data-kind="hora"]'); await h.fill('#q-p', 'KJTR-45'); await h.fill('#q-c', 'Toyota Yaris 2018'); await h.fill('#q-sy', 'Ruido metálico al frenar y vibración en el volante'); await h.click('[data-shot="0"]'); await h.scrollTo('[data-f]', 'start', -110); },
      description: 'Formulario para pedir una cotización o agendar hora: servicio, vehículo, síntomas, fotos y horario preferido. Para siniestros pide la aseguradora y el número de siniestro.',
      actions: ['Elegir entre cotización o agendar hora', 'Indicar servicio, patente y vehículo', 'Describir los síntomas o el daño', 'Adjuntar fotos (simulado)', 'Elegir día y hora de ingreso']
    },
    {
      id: 'cotizar-enviada', section: 'publico', title: 'Solicitud recibida', url: 'index.html#/cotizar', waitFor: '[data-f]',
      setup: async h => { await h.fill('#q-p', 'KJTR-45'); await h.fill('#q-c', 'Toyota Yaris 2018'); await h.fill('#q-sy', 'Ruido metálico al frenar y vibración en el volante'); await h.fill('#q-nm', 'Martín Soto Araya'); await h.fill('#q-t', '+56 9 7123 4567'); await h.click('[data-f] button.btn-primary'); await h.wait('.code-box'); },
      description: 'Confirmación con el número de solicitud. La solicitud entra al panel del taller, donde el asesor la contacta y la convierte en OT.',
      actions: ['Ver el número de solicitud', 'Saber cuándo lo contactarán', 'Hacer otra solicitud']
    },
    {
      id: 'presupuesto-ingreso', section: 'publico', title: 'Aprobar presupuesto: acceso', url: 'index.html#/presupuesto', waitFor: '[data-f]',
      description: 'Acceso al presupuesto en línea con el código de OT y la patente, que el cliente recibe por WhatsApp.',
      actions: ['Ingresar el código de OT', 'Validar con la patente del vehículo', 'Abrir el presupuesto']
    },
    {
      id: 'presupuesto', section: 'publico', title: 'Presupuesto en línea', url: 'index.html#/presupuesto', waitFor: '[data-f]', mobile: true,
      setup: async h => { await h.fill('#b-c', OT.demo); await h.fill('#b-p', 'PRWT-63'); await h.click('[data-f] button.btn-primary'); await h.wait('.approve-bar'); },
      description: 'Presupuesto detallado con diagnóstico, fotos, hallazgos y el estado del auto al ingreso. El cliente activa o desactiva cada repuesto y mano de obra, y ve el total y el abono al instante.',
      actions: ['Leer el diagnóstico y ver las fotos', 'Revisar el diagrama de daños del ingreso', 'Aprobar o rechazar cada ítem (los urgentes se destacan)', 'Ver el total y el abono con lo seleccionado', 'Aprobar y pagar el abono, o rechazar todo']
    },
    {
      id: 'presupuesto-abono', section: 'publico', kind: 'modal', from: 'Botón "Aprobar y pagar abono" del presupuesto', title: 'Pago del abono', url: 'index.html#/presupuesto', waitFor: '[data-f]',
      setup: async h => { await h.fill('#b-c', OT.demo); await h.fill('#b-p', 'PRWT-63'); await h.click('[data-f] button.btn-primary'); await h.wait('.approve-bar'); await h.click('[data-approve]'); await h.modal(); await h.fill('.modal #pay-n', '4242 4242 4242 4242'); await h.fill('.modal #pay-x', '12/29'); },
      description: 'Pago simulado con tarjeta del abono sobre los ítems aprobados. Al pagar, la OT pasa a "Aprobado" y el taller puede empezar a trabajar.',
      actions: ['Ver cuántos ítems aprueba y el monto del abono', 'Pagar con tarjeta de crédito o débito (simulado)', 'Dejar el saldo para el retiro']
    },
    {
      id: 'seguimiento', section: 'publico', title: 'Seguimiento de la OT', url: `index.html#/ot/OT-24838`, waitFor: '.track-grid', mobile: true,
      description: 'Seguimiento en línea de la orden de trabajo con sus 8 etapas, fecha y responsable de cada una, avance de los trabajos, entrega comprometida y montos (aprobado, abono y saldo).',
      actions: ['Ver la etapa actual y el historial con fecha y hora', 'Seguir los trabajos terminados y en curso', 'Revisar el asesor, el mecánico y la entrega comprometida', 'Ver el saldo a pagar al retirar', 'Abrir el presupuesto o la factura']
    },
    {
      id: 'seguimiento-buscar', section: 'publico', title: 'Buscar mi OT', url: 'index.html#/ot', waitFor: '[data-lk] form',
      description: 'Búsqueda de la orden de trabajo por código o patente para ver su estado.',
      actions: ['Buscar por código de OT', 'Buscar por patente', 'Pasar al seguimiento de la OT']
    },
    {
      id: 'garantia', section: 'publico', title: 'Consulta de garantía', url: 'index.html#/garantia', waitFor: '[data-f]',
      setup: async h => { await h.fill('#w-q', 'GAR-3311'); await h.click('[data-f] button'); await h.wait('[data-claim]'); },
      description: 'Consulta de garantías por patente o código: trabajo cubierto, vigencia en meses y kilómetros, y opción de pedir una revisión en garantía.',
      actions: ['Buscar por patente o código GAR', 'Ver qué cubre y hasta cuándo', 'Solicitar una revisión en garantía', 'Ver el estado de solicitudes anteriores']
    },
    {
      id: 'garantia-revision', section: 'publico', kind: 'modal', from: 'Botón "Solicitar revisión en garantía"', title: 'Solicitud de revisión en garantía', url: 'index.html#/garantia', waitFor: '[data-f]',
      setup: async h => { await h.fill('#w-q', 'GAR-3311'); await h.click('[data-f] button'); await h.click('[data-claim]'); await h.modal(); },
      description: 'Formulario breve para reportar un problema sobre un trabajo en garantía. La solicitud queda registrada en la garantía y en la bitácora del taller.',
      actions: ['Describir el problema', 'Dejar un celular de contacto', 'Enviar la solicitud al taller']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Página de ingreso para clientes, equipo del taller y liquidadores, con cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, jefe, asesor, mecánico, bodega, aseguradora o cliente', 'Crear una cuenta de cliente', 'Volver al sitio']
    },
    {
      id: 'cuenta-sin-sesion', section: 'publico', title: 'Mi cuenta (sin sesión)', url: 'index.html#/cuenta', waitFor: '.empty',
      description: 'Lo que ve un visitante al abrir "Mi cuenta" sin haber ingresado: el acceso al login con los datos de la cuenta demo.',
      actions: ['Ir a ingresar', 'Ver los datos de la cuenta demo de cliente', 'Volver a navegar el sitio']
    },

    // ================= Cliente =================
    {
      id: 'cuenta-vehiculos', section: 'cliente', login: U.cliente, title: 'Mi cuenta: vehículos', url: 'index.html#/cuenta', waitFor: '.tabs', mobile: true,
      description: 'Inicio de la cuenta con las OT en curso (y los ítems por aprobar) y los vehículos del cliente con kilometraje, VIN y número de visitas.',
      actions: ['Ver las OT abiertas y su etapa', 'Ir a aprobar los ítems pendientes', 'Seguir una OT en línea', 'Revisar sus vehículos', 'Agendar una visita']
    },
    {
      id: 'cuenta-presupuesto', section: 'cliente', login: U.cliente, title: 'Presupuesto (con sesión)', url: `index.html#/presupuesto/${OT.demo}`, waitFor: '.approve-bar',
      description: 'Con la sesión iniciada, el cliente abre su presupuesto directo desde la cuenta, sin escribir el código ni la patente.',
      actions: ['Abrir el presupuesto desde "Mi cuenta"', 'Aprobar o rechazar ítems', 'Pagar el abono']
    },
    {
      id: 'cuenta-siniestro', section: 'cliente', login: U.cliente, title: 'Presupuesto con seguro', url: 'index.html#/presupuesto/OT-24849', waitFor: '.budget, .card',
      description: 'Presupuesto de una reparación por siniestro: muestra el estado de la evaluación de la aseguradora y el deducible que paga el cliente; el resto lo cubre el seguro una vez aprobado.',
      actions: ['Ver el estado del siniestro y la aseguradora', 'Conocer el deducible en UF y en pesos', 'Revisar el presupuesto enviado al liquidador', 'Confirmar su aprobación']
    },
    {
      id: 'cuenta-historial', section: 'cliente', login: U.cliente, title: 'Mi cuenta: historial', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="historial"]'); await h.wait('.timeline'); },
      description: 'Historial de visitas de todos sus vehículos con fecha, kilometraje, trabajo realizado, OT y monto.',
      actions: ['Ver cada visita al taller', 'Revisar el kilometraje de cada trabajo', 'Ver el monto pagado y la OT']
    },
    {
      id: 'cuenta-documentos', section: 'cliente', login: U.cliente, title: 'Mi cuenta: documentos', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="documentos"]'); await h.wait('[data-inv]'); },
      description: 'Facturas y boletas emitidas, presupuestos de cada OT y garantías vigentes del cliente.',
      actions: ['Abrir una factura o boleta', 'Volver a ver un presupuesto', 'Revisar las garantías y su vigencia']
    },
    {
      id: 'cuenta-factura', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Ver" de una factura en Documentos', title: 'Factura o boleta', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="documentos"]'); await h.click('[data-inv]'); await h.modal(); },
      description: 'Documento tributario (simulado) con el detalle de repuestos y mano de obra, neto, IVA y total.',
      actions: ['Revisar el detalle de la reparación', 'Ver neto, IVA y total', 'Imprimir o guardar']
    },
    {
      id: 'cuenta-datos', section: 'cliente', login: U.cliente, title: 'Mi cuenta: datos', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="datos"]'); await h.wait('[data-me]'); },
      description: 'Datos personales del cliente.',
      actions: ['Editar nombre, RUT y celular', 'Actualizar la dirección', 'Cerrar sesión']
    },

    // ================= Asesor de servicio =================
    {
      id: 'tablero', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Tablero de OT', url: 'admin.html#/tablero', waitFor: '.kanban .kcard', mobile: true,
      description: 'Kanban con todas las OT abiertas por etapa, desde recepción hasta listo. Las tarjetas se arrastran entre columnas y el sistema valida las reglas del flujo. Abajo, la carga de cada mecánico y la ocupación de elevadores.',
      actions: ['Mover una OT de etapa arrastrando su tarjeta', 'Ver ítems por aprobar, OT atrasadas y con seguro', 'Filtrar por mecánico o asesor', 'Revisar la carga de horas por mecánico y los elevadores ocupados', 'Crear una OT nueva']
    },
    {
      id: 'ot-nueva', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Botón "+ Nueva OT"', title: 'Nueva orden de trabajo', url: 'admin.html#/ots', waitFor: firstRow,
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de recepción para abrir una OT: patente, vehículo, cliente, tipo de trabajo, kilometraje, combustible y motivo de ingreso. Si la patente ya existe, toma el vehículo y el cliente registrados.',
      actions: ['Registrar la patente (y marca, modelo y año si es nuevo)', 'Asociar o crear el cliente', 'Elegir el tipo de trabajo', 'Indicar kilometraje y combustible', 'Anotar el motivo de ingreso o los síntomas']
    },
    {
      id: 'ots', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Órdenes de trabajo', url: 'admin.html#/ots', waitFor: firstRow,
      description: 'Listado de todas las OT del taller con vehículo, cliente, tipo de trabajo, mecánico, total y estado.',
      actions: ['Filtrar por estado o tipo de trabajo', 'Buscar por código, patente o cliente', 'Abrir la ficha completa', 'Crear una OT', 'Exportar a CSV']
    },
    {
      id: 'ot-resumen', section: 'asesor', login: U.asesor, title: 'Ficha de OT: resumen', url: `admin.html#/ots/${OT.reparacionId}`, waitFor: '.ot-timeline',
      description: 'Ficha de la OT con la línea de tiempo de etapas, asignación de asesor, mecánico, bahía y entrega, diagnóstico y hallazgos del mecánico. Desde aquí se avanza la OT a la siguiente etapa.',
      actions: ['Avanzar o devolver la OT de etapa', 'Asignar mecánico, bahía y fecha de entrega', 'Escribir el diagnóstico', 'Revisar los hallazgos del mecánico', 'Abrir la vista del cliente']
    },
    {
      id: 'ot-ingreso', section: 'asesor', login: U.asesor, title: 'Ficha de OT: ingreso e inventario', url: `admin.html#/ots/${OT.diagnosticoId}`, waitFor: '.ot-timeline',
      setup: async h => { await h.click('.admin-content [data-tab="ingreso"]'); await h.wait('.check-grid'); },
      description: 'Inventario de recepción: kilometraje, combustible, checklist de accesorios y un diagrama del auto donde se marcan rayones, abolladuras y trizaduras previas.',
      actions: ['Registrar kilometraje y nivel de combustible', 'Marcar el checklist de accesorios', 'Marcar daños previos en el diagrama', 'Agregar fotos (simuladas)', 'Guardar el inventario']
    },
    {
      id: 'ot-presupuesto', section: 'asesor', login: U.asesor, title: 'Ficha de OT: presupuesto', url: `admin.html#/ots/${OT.demoId}`, waitFor: '.ot-timeline',
      setup: async h => { await h.click('.admin-content [data-tab="presupuesto"]'); await h.wait('[data-add="mano"]'); },
      description: 'Armado del presupuesto con mano de obra desde el baremo, repuestos del catálogo con su stock e ítems libres, con prioridad (urgente, recomendado u opcional). Se envía al cliente por WhatsApp.',
      actions: ['Agregar mano de obra según horas estándar', 'Agregar repuestos con su stock', 'Marcar la prioridad de cada ítem', 'Enviar el presupuesto al cliente', 'Registrar una aprobación presencial o un abono']
    },
    {
      id: 'ot-item', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Botón de editar un ítem del presupuesto', title: 'Editar ítem del presupuesto', url: `admin.html#/ots/${OT.demoId}`, waitFor: '.ot-timeline',
      setup: async h => { await h.click('.admin-content [data-tab="presupuesto"]'); await h.click('[data-edit-item]'); await h.modal(); },
      description: 'Ventana para ajustar un ítem del presupuesto: descripción, cantidad, precio, horas, prioridad, estado, nota para el cliente y foto del técnico.',
      actions: ['Cambiar cantidad, precio y horas', 'Definir la prioridad', 'Marcarlo aprobado o rechazado (por ejemplo, si el cliente llamó)', 'Escribir una nota para el cliente', 'Adjuntar la foto del técnico']
    },
    {
      id: 'ot-trabajos', section: 'asesor', login: U.asesor, title: 'Ficha de OT: trabajos', url: `admin.html#/ots/${OT.reparacionId}`, waitFor: '.ot-timeline',
      setup: async h => { await h.click('.admin-content [data-tab="trabajos"]'); await h.pause(300); },
      description: 'Tareas aprobadas de la OT con el mecánico asignado a cada una, horas estándar y tiempo real registrado con el cronómetro de la app del mecánico.',
      actions: ['Ver el avance de cada tarea', 'Comparar horas estándar y reales', 'Reasignar una tarea a otro mecánico']
    },
    {
      id: 'ot-entregar', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Botón "Entregar y facturar" de una OT lista', title: 'Entrega y facturación', url: `admin.html#/ots/${OT.listoId}`, waitFor: '.ot-timeline',
      setup: async h => { await h.click('[data-deliver]'); await h.modal(); },
      description: 'Cierre de la OT con el total, el abono recibido (y lo que paga la aseguradora si hay siniestro) y el saldo a cobrar. Al confirmar se emite el documento y se genera la garantía.',
      actions: ['Ver el saldo a cobrar', 'Elegir el medio de pago del saldo', 'Emitir boleta o factura', 'Registrar la conformidad del cliente', 'Generar la garantía automáticamente']
    },
    {
      id: 'solicitudes', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Solicitudes web', url: 'admin.html#/solicitudes', waitFor: firstRow,
      description: 'Cotizaciones y horas pedidas desde el sitio, con su estado (nueva, contactada, agendada, convertida o descartada).',
      actions: ['Filtrar por estado, tipo o servicio', 'Buscar por cliente o patente', 'Abrir una solicitud', 'Exportar a CSV']
    },
    {
      id: 'solicitud-detalle', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Fila de la tabla de Solicitudes web', title: 'Detalle de solicitud', url: 'admin.html#/solicitudes', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Detalle de la solicitud con vehículo, contacto, síntomas, fotos y hora pedida. Se convierte en OT con los datos ya cargados.',
      actions: ['Marcarla como contactada o agendada', 'Descartarla', 'Convertirla en OT con un clic']
    },
    {
      id: 'clientes', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Clientes y vehículos', url: 'admin.html#/clientes', waitFor: firstRow,
      description: 'Base de clientes con su flota, número de OT y última visita, y pestaña de vehículos con VIN y kilometraje.',
      actions: ['Buscar por nombre, RUT o patente', 'Ver vehículos y su historial', 'Crear clientes y vehículos', 'Exportar a CSV']
    },
    {
      id: 'cliente-ficha', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Fila de la tabla de Clientes', title: 'Ficha del cliente', url: 'admin.html#/clientes', waitFor: firstRow,
      setup: async h => { await h.fill('.admin-content input[type="search"]', 'Ignacio'); await h.click(firstRow); await h.modal(); await modalTop(h); },
      description: 'Ficha del cliente con contacto, notas, vehículos y sus OT anteriores.',
      actions: ['Editar datos del cliente', 'Agregar o editar vehículos', 'Revisar las OT de cada vehículo', 'Eliminar el cliente']
    },
    {
      id: 'seguros', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Seguros y siniestros', url: 'admin.html#/seguros', waitFor: firstRow,
      description: 'Siniestros en curso con aseguradora, OT, presupuesto, monto aprobado, deducible y estado; y la pestaña de aseguradoras en convenio.',
      actions: ['Filtrar por estado o aseguradora', 'Abrir el detalle de un siniestro', 'Denunciar un siniestro para una OT abierta', 'Administrar aseguradoras y su tope de tarifa', 'Exportar a CSV']
    },
    {
      id: 'siniestro-denuncia', section: 'asesor', login: U.asesor, kind: 'modal', from: 'Botón "+ Siniestro" en Seguros (después de elegir la OT)', title: 'Denunciar siniestro', url: 'admin.html#/seguros', waitFor: firstRow,
      setup: async h => { await h.click('[data-newc]'); await h.modal(); await h.click('.modal [data-submit]', { after: 600 }); await h.modal(); },
      description: 'Registro de un siniestro para una OT abierta: aseguradora, número de siniestro, póliza, deducible y descripción del evento. Queda visible en el portal del liquidador.',
      actions: ['Elegir la aseguradora', 'Ingresar número de siniestro y póliza', 'Fijar el deducible en UF', 'Describir el evento']
    },
    {
      id: 'facturas', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Facturas y boletas', url: 'admin.html#/facturas', waitFor: firstRow,
      description: 'Documentos emitidos al entregar cada OT, con totales del mes separados en repuestos y mano de obra, y lo que falta cobrar a aseguradoras.',
      actions: ['Ver lo emitido en el mes', 'Filtrar por tipo de documento y pago', 'Abrir e imprimir un documento', 'Exportar a CSV']
    },
    {
      id: 'garantias', section: 'asesor', login: U.asesor, roles: PANEL, title: 'Garantías', url: 'admin.html#/garantias', waitFor: firstRow,
      description: 'Garantías generadas al entregar cada OT, con lo que cubren, su vencimiento y las solicitudes de revisión que llegan desde el sitio.',
      actions: ['Filtrar garantías vigentes, vencidas o anuladas', 'Revisar solicitudes de revisión', 'Anular una garantía con motivo', 'Exportar a CSV']
    },

    // ================= Mecánico =================
    {
      id: 'mecanico', section: 'mecanico', login: U.mecanico, roles: ['Mecánico', 'Jefe de taller', 'Administrador'], title: 'App del mecánico', url: 'mecanico.html', waitFor: '.ot-card', mobile: true,
      description: 'App pensada para el celular con las OT asignadas al mecánico: tareas con horas estándar, cronómetro para iniciar, pausar y terminar cada una, pedidos de repuestos y hallazgos.',
      actions: ['Iniciar, pausar y terminar cada tarea con cronómetro', 'Ver si va sobre el tiempo estándar', 'Pedir un repuesto a bodega', 'Registrar un hallazgo con foto', 'Enviar la OT a control de calidad']
    },
    {
      id: 'mecanico-repuesto', section: 'mecanico', login: U.mecanico, kind: 'modal', from: 'Botón "Pedir repuesto" de una OT', title: 'Pedir repuesto', url: 'mecanico.html', waitFor: '.ot-card',
      setup: async h => { await h.click('[data-part]'); await h.modal(); },
      description: 'Pedido de repuesto a bodega con cantidad y nota. Bodega lo ve en su bandeja y lo entrega descontando el stock.',
      actions: ['Elegir el repuesto con su stock', 'Indicar la cantidad', 'Agregar una nota', 'Enviar el pedido a bodega']
    },
    {
      id: 'mecanico-hallazgo', section: 'mecanico', login: U.mecanico, kind: 'modal', from: 'Botón "Hallazgo" de una OT', title: 'Registrar hallazgo', url: 'mecanico.html', waitFor: '.ot-card',
      setup: async h => { await h.click('[data-find]'); await h.modal(); await h.fill('.modal #fd-t', 'Correa de accesorios agrietada'); await h.click('.modal [data-ph]'); await h.check('.modal [name="sug"]'); },
      description: 'Registro de algo encontrado durante la reparación, con foto. Puede proponerse como ítem nuevo del presupuesto para que el cliente lo apruebe en línea.',
      actions: ['Describir el hallazgo', 'Adjuntar una foto (simulada)', 'Proponer mano de obra o repuesto al cliente', 'Avisar al asesor en la OT']
    },
    {
      id: 'mecanico-terminados', section: 'mecanico', login: U.mecanico, title: 'Trabajos terminados', url: 'mecanico.html', waitFor: '.ot-card',
      setup: async h => { await h.click('[data-tab="hechos"]'); },
      description: 'Resumen de horas registradas por el mecánico y las OT donde ya terminó tareas.',
      actions: ['Ver el total de horas registradas', 'Revisar las OT con tareas terminadas', 'Ver la etapa de cada OT']
    },

    // ================= Jefe de taller =================
    {
      id: 'dashboard', section: 'jefe', login: U.jefe, roles: ['Jefe de taller', 'Administrador'], title: 'Dashboard del taller', url: 'admin.html#/dashboard', waitFor: '.kpi-grid',
      description: 'Indicadores de productividad, ventas y tiempos: facturación, ticket, aprobación de presupuestos, horas facturadas contra disponibles y eficiencia por mecánico, con gráficos de 12 meses.',
      actions: ['Ver facturación, ticket y tasa de aprobación', 'Comparar horas facturadas y disponibles', 'Revisar ingresos de repuestos vs. mano de obra', 'Ver OT abiertas por etapa y tiempos promedio', 'Detectar OT atrasadas y alertas']
    },
    {
      id: 'mecanicos', section: 'jefe', login: U.jefe, roles: ['Jefe de taller', 'Administrador'], title: 'Mecánicos', url: 'admin.html#/mecanicos', waitFor: firstRow,
      description: 'Mecánicos con especialidad, nivel, costo hora, eficiencia del último mes, carga pendiente y margen de mano de obra.',
      actions: ['Comparar eficiencia y carga de cada mecánico', 'Ver el margen sobre la tarifa de venta', 'Editar especialidad, nivel y costo hora', 'Exportar a CSV']
    },
    {
      id: 'baremo', section: 'jefe', login: U.jefe, roles: ['Jefe de taller', 'Administrador'], title: 'Baremo de horas estándar', url: 'admin.html#/mecanicos', waitFor: firstRow,
      setup: async h => { await h.click('[data-tab="baremo"]'); await h.wait(firstRow); },
      description: 'Catálogo de trabajos con sus horas estándar por área y el precio de mano de obra que resulta de la tarifa. Lo usan el presupuesto y el sitio público.',
      actions: ['Filtrar trabajos por área', 'Editar las horas estándar', 'Crear trabajos nuevos', 'Exportar a CSV']
    },
    {
      id: 'tarifas', section: 'jefe', login: U.jefe, roles: ['Jefe de taller', 'Administrador'], title: 'Tarifas', url: 'admin.html#/mecanicos', waitFor: firstRow,
      setup: async h => { await h.click('[data-tab="tarifas"]'); await h.wait('[data-f]'); },
      description: 'Tarifa hora de venta para mecánica y para pintura y carrocería, porcentaje de abono y valor de la UF para deducibles.',
      actions: ['Fijar la tarifa hora mecánica', 'Fijar la tarifa hora de pintura', 'Definir el % de abono', 'Actualizar el valor UF']
    },
    {
      id: 'actividad', section: 'jefe', login: U.jefe, roles: ['Jefe de taller', 'Administrador'], title: 'Actividad', url: 'admin.html#/actividad', waitFor: firstRow,
      description: 'Bitácora de los últimos eventos del taller: OT, presupuestos, aprobaciones, bodega, seguros, mensajes de WhatsApp (simulados) y accesos.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de evento', 'Buscar por detalle o usuario', 'Exportar a CSV']
    },

    // ================= Bodega =================
    {
      id: 'bodega', section: 'bodega', login: U.bodega, roles: ['Bodega', 'Jefe de taller', 'Asesor de servicio', 'Administrador'], title: 'Bodega: inventario', url: 'admin.html#/repuestos', waitFor: firstRow,
      description: 'Inventario de repuestos con stock, mínimo, unidades reservadas por pedidos, ubicación en bodega, costo, precio y margen, con alerta de stock bajo.',
      actions: ['Filtrar por categoría, alerta o proveedor', 'Ver unidades reservadas por mecánicos', 'Generar una orden de compra para el stock bajo', 'Crear o editar repuestos', 'Exportar a CSV']
    },
    {
      id: 'bodega-repuesto', section: 'bodega', login: U.bodega, kind: 'modal', from: 'Fila de la tabla de Inventario', title: 'Ficha de repuesto', url: 'admin.html#/repuestos', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ficha del repuesto con SKU, categoría, proveedor, precio, costo, stock, mínimo y ubicación en bodega.',
      actions: ['Editar precio y costo', 'Ajustar el stock (queda en la bitácora)', 'Definir el mínimo y la ubicación', 'Desactivar el repuesto']
    },
    {
      id: 'bodega-solicitudes', section: 'bodega', login: U.bodega, title: 'Pedidos de mecánicos', url: 'admin.html#/repuestos', waitFor: firstRow,
      setup: async h => { await h.click('[data-tab="solicitudes"]'); await h.pause(300); },
      description: 'Bandeja de repuestos pedidos desde la app del mecánico, con la OT, el mecánico y la cantidad. Al entregar se descuenta del stock.',
      actions: ['Ver pedidos pendientes y entregados', 'Entregar un repuesto y descontarlo', 'Abrir la OT asociada', 'Exportar a CSV']
    },
    {
      id: 'bodega-compras', section: 'bodega', login: U.bodega, title: 'Órdenes de compra', url: 'admin.html#/repuestos', waitFor: firstRow,
      setup: async h => { await h.click('[data-tab="compras"]'); await h.wait(firstRow); },
      description: 'Órdenes de compra a proveedores con su estado. Al recibir la mercadería, el stock se suma solo.',
      actions: ['Filtrar órdenes por estado', 'Abrir una orden y recibirla', 'Crear una orden de compra', 'Exportar a CSV']
    },
    {
      id: 'bodega-oc', section: 'bodega', login: U.bodega, kind: 'modal', from: 'Botón "OC para stock bajo" en Bodega', title: 'Nueva orden de compra', url: 'admin.html#/repuestos', waitFor: firstRow,
      setup: async h => { await h.click('[data-po-low]'); await h.modal(); },
      description: 'Orden de compra prellenada con los repuestos bajo el mínimo del proveedor, con cantidades sugeridas y costo.',
      actions: ['Revisar las líneas sugeridas', 'Cambiar proveedor, repuestos o cantidades', 'Guardar como borrador o enviar']
    },

    // ================= Aseguradora =================
    {
      id: 'aseguradora', section: 'aseguradora', login: U.aseguradora, roles: ['Aseguradora', 'Administrador'], title: 'Portal del liquidador', url: 'aseguradora.html', waitFor: '.claim-card', mobile: true,
      setup: async h => { await h.click('[data-open]:has-text("HKLS-21")'); await h.page.evaluate(() => scrollTo(0, 0)); },
      description: 'Bandeja de siniestros de la aseguradora en el taller. Al abrir uno se ven el asegurado, la póliza, los daños del ingreso, las fotos del peritaje y el presupuesto detallado.',
      actions: ['Filtrar siniestros por evaluar, aprobados o rechazados', 'Revisar daños, fotos y presupuesto', 'Aprobar el presupuesto con monto y deducible', 'Pedir antecedentes al taller', 'Rechazar el siniestro con motivo']
    },
    {
      id: 'aseguradora-aprobar', section: 'aseguradora', login: U.aseguradora, kind: 'modal', from: 'Botón "Aprobar presupuesto" de un siniestro', title: 'Aprobar siniestro', url: 'aseguradora.html', waitFor: '.claim-card',
      setup: async h => { await h.click('[data-open]:has-text("HKLS-21")'); await h.click('[data-approve]'); await h.modal(); },
      description: 'Aprobación del siniestro con el monto aprobado, el deducible en UF y una observación para el taller. Al aprobar, los ítems quedan aprobados y la OT se libera para reparar.',
      actions: ['Fijar el monto aprobado', 'Ajustar el deducible', 'Dejar una observación al taller', 'Liberar la OT para reparación']
    },

    // ================= Administrador =================
    {
      id: 'contenido', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: '[data-f]',
      description: 'Nombre, textos de la portada, anuncio superior, dirección, contacto, horario y política de garantía del sitio público. Se publican al guardar.',
      actions: ['Editar título y texto de portada', 'Cambiar o quitar el anuncio', 'Actualizar dirección, teléfono, WhatsApp y horario', 'Editar el texto de garantía']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas del equipo, liquidadores y clientes con su rol y estado, más la matriz de permisos por rol que aplica el panel.',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol (y aseguradora a los liquidadores)', 'Desactivar una cuenta', 'Consultar la matriz de permisos', 'Exportar a CSV']
    },
    {
      id: 'acceso-restringido', section: 'admin', login: U.bodega, title: 'Ruta protegida por rol', url: 'admin.html#/seguros', waitFor: '.admin-content .empty',
      description: 'Lo que ve un rol sin permiso al abrir una sección ajena (aquí, bodega intentando entrar a Seguros): el menú solo muestra lo permitido y la ruta queda bloqueada.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a su inicio desde el botón', 'Confirmar que cada rol solo ve sus menús']
    }
  ]
};
