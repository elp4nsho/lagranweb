// Biblioteca de vistas de Vecindario · Condominio Plaza Ñuñoa (/condominio).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', comite: 'u-comite', conserje: 'u-conserje', residente: 'u-res' };
const firstRow = '.admin-content tbody tr >> nth=0';
const AC = ['Administrador', 'Comité'];

module.exports = {
  dir: 'condominio',
  name: 'Vecindario · Condominio Plaza Ñuñoa',
  kind: 'Administración de condominios',
  theme: 'skeuo',
  description: 'Plataforma de administración de edificios con landing pública y apps para la administración y el comité (gastos comunes, morosidad, mantención, asambleas), la conserjería (visitas, encomiendas, novedades) y los residentes.',
  accounts: {
    'u-admin': { name: 'Patricia Lagos', role: 'Administrador', email: 'admin@vecindario.cl', password: 'admin123' },
    'u-comite': { name: 'Jorge Muñoz', role: 'Comité', email: 'comite@plazanunoa.cl', password: 'comite123' },
    'u-conserje': { name: 'Luis Carrasco', role: 'Conserje', email: 'conserje@plazanunoa.cl', password: 'conserje123' },
    'u-res': { name: 'Fernanda Soto', role: 'Residente', email: 'residente@plazanunoa.cl', password: 'residente123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Landing de la plataforma e ingreso, sin iniciar sesión.' },
    { id: 'residente', label: 'Residente', desc: 'App del departamento: gastos comunes, reservas, visitas, encomiendas, incidencias y comunidad.' },
    { id: 'conserje', label: 'Conserje', desc: 'App de conserjería: turno, visitas, encomiendas, libro de novedades y búsqueda de residentes.' },
    { id: 'admin', label: 'Administrador', desc: 'Panel completo: finanzas, unidades, espacios, mantención, personal, participación y sistema.' },
    { id: 'comite', label: 'Comité', desc: 'El panel en modo comité: finanzas, mantención y participación, sin configuración del edificio.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Skeuomórfico" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Landing de la plataforma', url: 'index.html', waitFor: '.site-hero', mobile: true,
      description: 'Página pública de la plataforma con sus funciones, los últimos avisos publicados por la comunidad demo, planes por departamento y preguntas frecuentes. Los textos se editan desde la configuración del panel.',
      actions: ['Conocer las funciones para administración, conserjería y residentes', 'Ver los avisos que la comunidad marcó como públicos', 'Comparar los planes por departamento', 'Leer las preguntas frecuentes', 'Ingresar a la plataforma']
    },
    {
      id: 'portada-planes', section: 'publico', title: 'Planes y preguntas frecuentes', url: 'index.html', waitFor: '.site-hero',
      setup: async h => { await h.scrollTo('#planes', 'start', -20); },
      description: 'Sección de precios por departamento y preguntas frecuentes de la landing.',
      actions: ['Ver el precio por departamento de cada plan', 'Revisar qué incluye cada uno', 'Resolver dudas frecuentes antes de contratar']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso a la plataforma con cuentas de demostración para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administración, comité, conserjería o residente', 'Volver a la landing']
    },

    // ================= Residente =================
    {
      id: 'res-inicio', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Inicio del residente', url: 'residente.html#/inicio', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Inicio del departamento con el saldo de gastos comunes, encomiendas por retirar, próximas reservas, votaciones abiertas, avisos y sus solicitudes.',
      actions: ['Ver cuánto debe y pagar', 'Saber si tiene encomiendas en conserjería', 'Revisar sus próximas reservas', 'Votar en las votaciones abiertas', 'Leer los avisos para su unidad']
    },
    {
      id: 'res-gastos', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Gastos comunes', url: 'residente.html#/gastos', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Estado de cuenta del mes con el detalle del prorrateo por alícuota (gasto común, fondo de reserva, agua, reservas y multas) y cómo se calcula.',
      actions: ['Ver el detalle del cobro del mes', 'Entender el cálculo por alícuota', 'Pagar en línea', 'Descargar el comprobante', 'Ver los datos para transferencia']
    },
    {
      id: 'res-pagar', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], kind: 'modal', from: 'Botón "Pagar este mes" en Gastos comunes', title: 'Pago de gastos comunes', url: 'residente.html#/gastos', waitFor: '.admin-content [data-pay]',
      setup: async h => { await h.click('.admin-content [data-pay]'); await h.modal(); },
      description: 'Pago simulado con tarjeta del gasto común. Al pagar, la unidad queda al día en el panel de administración.',
      actions: ['Revisar el monto a pagar', 'Ingresar los datos de la tarjeta', 'Pagar y descargar el comprobante']
    },
    {
      id: 'res-pagos', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Historial de pagos', url: 'residente.html#/pagos', waitFor: '.admin-content .page-head',
      description: 'Historial de cobros mensuales con su estado de pago y el porcentaje de meses al día.',
      actions: ['Ver los pagos de cada mes', 'Detectar meses pendientes', 'Exportar el historial a CSV']
    },
    {
      id: 'res-reservas', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Reservas de espacios comunes', url: 'residente.html#/reservas', waitFor: '.admin-content [data-space]', mobile: true,
      setup: async h => { await h.click('.admin-content [data-mv="1"]'); await h.click('.admin-content .cal-d.pick >> nth=5'); await h.wait('.admin-content [data-slot]'); },
      description: 'Reserva de quinchos, salas y otros espacios: se elige el espacio, el día en el calendario y el turno. Muestra las reglas de uso y el valor, que se carga al gasto común.',
      actions: ['Elegir el espacio común', 'Ver la disponibilidad por día en el calendario', 'Elegir un turno libre', 'Revisar reglas, valor y garantía', 'Cancelar una reserva propia']
    },
    {
      id: 'res-reserva-confirmar', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], kind: 'modal', from: 'Clic en un turno libre de Reservas', title: 'Confirmar reserva', url: 'residente.html#/reservas', waitFor: '.admin-content [data-space]',
      setup: async h => { await h.click('.admin-content [data-mv="1"]'); await h.click('.admin-content .cal-d.pick >> nth=5'); await h.check('#bk-ok'); await h.click('.admin-content [data-slot]:not([disabled]) >> nth=0'); await h.modal(); },
      description: 'Confirmación de la reserva con espacio, fecha, turno y el monto que se sumará al gasto común.',
      actions: ['Revisar el detalle de la reserva', 'Ver el valor y la garantía', 'Confirmar o cancelar']
    },
    {
      id: 'res-visitas', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Visitas', url: 'residente.html#/visitas', waitFor: '.admin-content .page-head',
      description: 'Visitas pre-autorizadas con su código de ingreso y el historial de ingresos registrados por conserjería.',
      actions: ['Autorizar una visita nueva', 'Ver y compartir el código QR', 'Cancelar una autorización', 'Revisar quién ingresó y cuándo']
    },
    {
      id: 'res-visita-autorizar', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], kind: 'modal', from: 'Botón "Autorizar visita"', title: 'Autorizar visita', url: 'residente.html#/visitas', waitFor: '.admin-content .page-head',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de pre-autorización con nombre, RUT, patente y fecha de la visita. Genera un código que conserjería valida al llegar.',
      actions: ['Ingresar nombre y RUT de la visita', 'Indicar patente si viene en auto', 'Elegir la fecha', 'Generar el pase']
    },
    {
      id: 'res-pase', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], kind: 'modal', from: 'Botón "Ver QR" de una visita autorizada', title: 'Pase de visita', url: 'residente.html#/visitas', waitFor: '.admin-content [data-qr]',
      setup: async h => { await h.click('.admin-content [data-qr] >> nth=0'); await h.modal(); },
      description: 'Pase con código QR y código de 6 caracteres para enviar a la visita.',
      actions: ['Mostrar el QR', 'Copiar el mensaje con el código para enviarlo', 'Cerrar el pase']
    },
    {
      id: 'res-encomiendas', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Encomiendas', url: 'residente.html#/encomiendas', waitFor: '.admin-content .page-head',
      description: 'Encomiendas recibidas en conserjería que esperan retiro, más el historial de entregas con quién retiró.',
      actions: ['Ver qué paquetes esperan retiro', 'Revisar remitente y fecha de recepción', 'Consultar el historial de entregas']
    },
    {
      id: 'res-incidencias', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Incidencias y mantención', url: 'residente.html#/incidencias', waitFor: '.admin-content .page-head',
      description: 'Solicitudes de mantención del residente, en su depto o en áreas comunes, con su estado.',
      actions: ['Reportar una incidencia nueva', 'Ver el estado de sus solicitudes', 'Abrir el seguimiento de una solicitud']
    },
    {
      id: 'res-incidencia', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Seguimiento de incidencia', url: 'residente.html#/incidencias', waitFor: '.admin-content a[href^="#/incidencias/"]',
      setup: async h => { await h.click('.admin-content a[href^="#/incidencias/"] >> nth=0'); await h.wait('.admin-content h3:has-text("Seguimiento")'); return { url: h.here() }; },
      description: 'Detalle de una solicitud con su línea de tiempo, el proveedor asignado y la opción de confirmar si quedó resuelta.',
      actions: ['Ver el avance paso a paso', 'Agregar un comentario', 'Conocer el proveedor asignado', 'Cerrar o reabrir la solicitud']
    },
    {
      id: 'res-incidencia-nueva', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], kind: 'modal', from: 'Botón "Reportar incidencia"', title: 'Reportar incidencia', url: 'residente.html#/incidencias', waitFor: '.admin-content .page-head',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario para reportar un problema; llega al módulo de mantención de la administración.',
      actions: ['Elegir categoría y lugar', 'Describir el problema', 'Indicar la prioridad']
    },
    {
      id: 'res-avisos', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Avisos de la comunidad', url: 'residente.html#/avisos', waitFor: '.admin-content .page-head',
      description: 'Muro de avisos publicados por la administración, con los destacados primero.',
      actions: ['Leer los avisos', 'Filtrar por categoría', 'Ver los destacados']
    },
    {
      id: 'res-votaciones', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Votaciones', url: 'residente.html#/votaciones', waitFor: '.admin-content .page-head',
      description: 'Votaciones de la comunidad con un voto por departamento y resultados por unidades y ponderados por alícuota.',
      actions: ['Votar en las votaciones abiertas', 'Ver resultados por unidades', 'Ver resultados ponderados por alícuota']
    },
    {
      id: 'res-documentos', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], title: 'Documentos', url: 'residente.html#/documentos', waitFor: '.admin-content .page-head',
      description: 'Reglamentos, actas de asamblea, presupuestos y contratos de la comunidad.',
      actions: ['Ver los documentos por categoría', 'Abrir un documento', 'Descargarlo']
    },
    {
      id: 'res-documento', section: 'residente', login: U.residente, roles: ['Residente', 'Comité'], kind: 'modal', from: 'Botón "Ver" de un documento', title: 'Documento de la comunidad', url: 'residente.html#/documentos', waitFor: '.admin-content [data-doc]',
      setup: async h => { await h.click('.admin-content [data-doc] >> nth=0'); await h.modal(); },
      description: 'Vista de un documento oficial con su categoría y contenido.',
      actions: ['Leer el documento', 'Ver categoría y fecha', 'Descargarlo']
    },

    // ================= Conserje =================
    {
      id: 'con-turno', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], title: 'Mi turno', url: 'conserjeria.html#/turno', waitFor: '.admin-content [data-code]', mobile: true,
      description: 'Pantalla principal de conserjería: validación rápida del código de una visita, visitas esperadas hoy, personas dentro del edificio y encomiendas por entregar.',
      actions: ['Validar el código de una visita pre-autorizada', 'Dar ingreso a las visitas esperadas', 'Registrar la salida de quienes están dentro', 'Ver las encomiendas pendientes']
    },
    {
      id: 'con-visitas', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], title: 'Registro de visitas', url: 'conserjeria.html#/visitas', waitFor: '.admin-content .page-head',
      description: 'Registro de ingresos y salidas con las visitas pre-autorizadas y el historial.',
      actions: ['Registrar una visita sin aviso', 'Dar ingreso o salida', 'Buscar en el historial de visitas']
    },
    {
      id: 'con-visita-nueva', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], kind: 'modal', from: 'Botón "Registrar visita sin aviso"', title: 'Visita sin aviso', url: 'conserjeria.html#/visitas', waitFor: '.admin-content .page-head',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Registro de una visita que llega sin pre-autorización.',
      actions: ['Elegir el departamento de destino', 'Anotar nombre, RUT y patente', 'Dejar el motivo u observación']
    },
    {
      id: 'con-encomiendas', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], title: 'Encomiendas', url: 'conserjeria.html#/encomiendas', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Paquetes en conserjería por departamento, con recepción (que avisa al residente) y entrega con registro de quién retira.',
      actions: ['Recibir una encomienda y avisar al residente', 'Entregarla registrando quién retira', 'Filtrar por tamaño y estado']
    },
    {
      id: 'con-recibir', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], kind: 'modal', from: 'Botón "Recibir encomienda"', title: 'Recibir encomienda', url: 'conserjeria.html#/encomiendas', waitFor: '.admin-content .page-head',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de recepción de un paquete; el residente recibe el aviso en su app.',
      actions: ['Elegir el departamento', 'Anotar remitente o courier', 'Indicar tamaño y número de seguimiento']
    },
    {
      id: 'con-novedades', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], title: 'Novedades y rondas', url: 'conserjeria.html#/bitacora', waitFor: '.admin-content .page-head',
      description: 'Libro de novedades digital: rondas con puntos de control, novedades e incidentes del turno.',
      actions: ['Registrar una ronda, novedad o incidente', 'Marcar los puntos de control revisados', 'Revisar los registros anteriores']
    },
    {
      id: 'con-buscar', section: 'conserje', login: U.conserje, roles: ['Conserje', 'Administrador'], title: 'Buscar residente', url: 'conserjeria.html#/residentes', waitFor: '.admin-content .page-head',
      setup: async h => { await h.fill('.admin-content input[placeholder="Escribe para buscar…"]', 'B-3'); await h.pause(300); },
      description: 'Búsqueda rápida de residentes por nombre, departamento, RUT o patente, con sus teléfonos y vehículos.',
      actions: ['Buscar por nombre, depto, RUT o patente', 'Ver los residentes de un departamento', 'Consultar teléfonos y patentes registradas']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, roles: AC, title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Resumen del edificio con recaudación por mes, gasto mensual, gastos por categoría, morosidad por torre, reservas por espacio, incidencias por estado y actividad reciente.',
      actions: ['Seguir la recaudación mes a mes', 'Ver en qué se gasta el presupuesto', 'Detectar la morosidad por torre', 'Revisar reservas e incidencias']
    },
    {
      id: 'admin-gastos', section: 'admin', login: U.admin, roles: AC, title: 'Gastos comunes', url: 'admin.html#/gastos', waitFor: '.admin-content table',
      description: 'Períodos mensuales de gastos comunes con su estado (borrador o publicado), total y recaudación.',
      actions: ['Crear un período nuevo con los gastos recurrentes', 'Ver el estado de cada mes', 'Abrir el cálculo de un período']
    },
    {
      id: 'admin-periodo', section: 'admin', login: U.admin, roles: AC, title: 'Cálculo del período', url: 'admin.html#/gastos', waitFor: '.admin-content a[href^="#/gastos/"]',
      setup: async h => { await h.click('.admin-content a[href^="#/gastos/"] >> nth=0'); await h.wait('.admin-content h3:has-text("Prorrateo")'); return { url: h.here() }; },
      description: 'Cálculo mensual: gastos del edificio, fondo de reserva y prorrateo por alícuota de cada unidad, listo para generar los cobros y publicarlos a los residentes.',
      actions: ['Agregar, editar o quitar gastos del mes', 'Ajustar el porcentaje del fondo de reserva', 'Revisar el prorrateo por unidad', 'Publicar los gastos a los residentes', 'Registrar pagos manuales']
    },
    {
      id: 'admin-morosidad', section: 'admin', login: U.admin, roles: AC, title: 'Morosidad', url: 'admin.html#/morosos', waitFor: '.admin-content .page-head',
      description: 'Unidades con gastos vencidos, meses adeudados, intereses por mora y último recordatorio enviado.',
      actions: ['Ver deuda e intereses por unidad', 'Enviar un recordatorio individual o masivo', 'Registrar un pago manual']
    },
    {
      id: 'admin-pago-manual', section: 'admin', login: U.admin, roles: AC, kind: 'modal', from: 'Botón "Pago" en Morosidad', title: 'Registrar pago', url: 'admin.html#/morosos', waitFor: '.admin-content [data-pay]',
      setup: async h => { await h.click('.admin-content [data-pay] >> nth=0'); await h.modal(); },
      description: 'Registro de un pago recibido por transferencia o en oficina para una unidad morosa.',
      actions: ['Ver el monto adeudado', 'Elegir medio de pago y fecha', 'Dejar la unidad al día']
    },
    {
      id: 'admin-unidades', section: 'admin', login: U.admin, title: 'Unidades y residentes', url: 'admin.html#/unidades', waitFor: '.admin-content table',
      description: 'Departamentos por torre y piso con superficie, estacionamientos, bodegas y alícuota, más los residentes de cada uno.',
      actions: ['Crear o editar unidades', 'Recalcular las alícuotas por superficie', 'Abrir la ficha de una unidad', 'Gestionar residentes']
    },
    {
      id: 'admin-unidad', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en una unidad', title: 'Ficha de unidad', url: 'admin.html#/unidades', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=0'); await h.modal(); },
      description: 'Ficha de un departamento con sus residentes, deuda, cobros y solicitudes.',
      actions: ['Ver quiénes viven en la unidad', 'Revisar su deuda y cobros', 'Ver sus solicitudes de mantención']
    },
    {
      id: 'admin-espacios', section: 'admin', login: U.admin, title: 'Espacios comunes', url: 'admin.html#/espacios', waitFor: '.admin-content .page-head',
      description: 'Configuración de quinchos, salas y otros espacios (turnos, precio, garantía, capacidad y límite mensual) y la lista de reservas.',
      actions: ['Crear o editar espacios', 'Definir turnos, precio y garantía', 'Limitar reservas por depto al mes', 'Cancelar una reserva']
    },
    {
      id: 'admin-mantencion', section: 'admin', login: U.admin, roles: AC, title: 'Mantención', url: 'admin.html#/mantencion', waitFor: '.admin-content .kanban', mobile: true,
      description: 'Tablero de tickets por estado (abierto, asignado, en progreso, resuelto, cerrado) con prioridad, proveedor y costo. También se puede ver como tabla.',
      actions: ['Ver los tickets por estado en el tablero', 'Crear un ticket de mantención', 'Abrir un ticket para asignarlo o avanzarlo', 'Cambiar a vista de tabla']
    },
    {
      id: 'admin-ticket', section: 'admin', login: U.admin, roles: AC, kind: 'modal', from: 'Clic en un ticket del tablero', title: 'Detalle de ticket', url: 'admin.html#/mantencion', waitFor: '.admin-content .kanban [data-t]',
      setup: async h => { await h.click('.admin-content .kanban [data-t] >> nth=0'); await h.modal(); },
      description: 'Ticket con su descripción, unidad o área, estado, proveedor asignado, costo y comentarios. El residente ve los cambios en su app.',
      actions: ['Cambiar el estado del ticket', 'Asignar un proveedor', 'Registrar el costo', 'Agregar un comentario de seguimiento']
    },
    {
      id: 'admin-proveedores', section: 'admin', login: U.admin, title: 'Proveedores', url: 'admin.html#/proveedores', waitFor: '.admin-content table',
      description: 'Empresas y técnicos que prestan servicios a la comunidad, con rubro, evaluación y trabajos asignados.',
      actions: ['Crear o editar proveedores', 'Evaluarlos de 1 a 5', 'Ver los trabajos asignados a cada uno']
    },
    {
      id: 'admin-personal', section: 'admin', login: U.admin, title: 'Personal y turnos', url: 'admin.html#/personal', waitFor: '.admin-content .page-head',
      description: 'Personal del edificio con una grilla semanal editable de turnos (mañana, tarde, noche o libre).',
      actions: ['Asignar el turno de cada persona por día', 'Moverse entre semanas', 'Crear o editar personal']
    },
    {
      id: 'admin-avisos', section: 'admin', login: U.admin, roles: AC, title: 'Avisos', url: 'admin.html#/comunicaciones', waitFor: '.admin-content .page-head',
      description: 'Avisos para los residentes con categoría, destacado y opción de mostrarlos también en la landing pública.',
      actions: ['Crear, editar o eliminar avisos', 'Publicar un borrador', 'Destacar un aviso', 'Mostrarlo en el sitio público']
    },
    {
      id: 'admin-votaciones', section: 'admin', login: U.admin, roles: AC, title: 'Votaciones', url: 'admin.html#/comunicaciones?tab=votaciones', waitFor: '.admin-content .page-head',
      description: 'Votaciones de la comunidad con sus opciones, estado y resultados ponderados por alícuota.',
      actions: ['Crear una votación', 'Abrirla o cerrarla', 'Ver resultados por unidades y ponderados', 'Editar o eliminar']
    },
    {
      id: 'admin-asambleas', section: 'admin', login: U.admin, roles: AC, title: 'Asambleas', url: 'admin.html#/asambleas', waitFor: '.admin-content .page-head',
      description: 'Asambleas programadas y realizadas, con citación a los residentes, quórum y acta.',
      actions: ['Programar una asamblea', 'Enviar la citación', 'Registrar realización, quórum y acta', 'Abrir los documentos asociados']
    },
    {
      id: 'admin-documentos', section: 'admin', login: U.admin, roles: AC, title: 'Documentos', url: 'admin.html#/asambleas?tab=documentos', waitFor: '.admin-content .page-head',
      description: 'Documentos oficiales de la comunidad que los residentes ven en su app.',
      actions: ['Subir o editar documentos', 'Clasificarlos por categoría', 'Eliminar documentos']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de acceso con su rol y unidad, más la matriz de permisos por rol.',
      actions: ['Crear o editar usuarios', 'Asignar rol y unidad', 'Desactivar una cuenta o restablecer la clave', 'Consultar los permisos por rol']
    },
    {
      id: 'admin-configuracion', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/configuracion', waitFor: '.admin-content .page-head',
      description: 'Datos de la comunidad, parámetros financieros (vencimiento, interés por mora, fondo de reserva) y contenido de la landing pública.',
      actions: ['Editar nombre y datos de la comunidad', 'Fijar día de vencimiento e interés por mora', 'Editar los textos de la landing', 'Restablecer los datos de demostración']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Registro de las últimas 300 acciones de usuarios y del sistema.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por acción y buscar', 'Exportar a CSV']
    },

    // ================= Comité =================
    {
      id: 'comite-panel', section: 'comite', login: U.comite, roles: ['Comité'], title: 'Panel del comité', url: 'admin.html#/gastos', waitFor: '.admin-content table',
      description: 'El comité entra al mismo panel con un menú reducido: dashboard, gastos comunes, morosidad, mantención, avisos, votaciones y asambleas. Revisa los gastos pero no crea períodos.',
      actions: ['Revisar los gastos comunes de cada mes', 'Controlar la morosidad', 'Seguir la mantención', 'Publicar avisos y llevar votaciones y asambleas']
    },
    {
      id: 'comite-restringido', section: 'comite', login: U.comite, roles: ['Comité'], title: 'Sección restringida', url: 'admin.html#/usuarios', waitFor: '.admin-content .card',
      description: 'Si el comité abre una sección reservada a la administración (como Usuarios y roles), el panel muestra un aviso de permiso insuficiente.',
      actions: ['Ver que la sección no está permitida para su rol', 'Volver a una sección permitida desde el menú', 'Pedir el cambio a la administración']
    }
  ]
};
