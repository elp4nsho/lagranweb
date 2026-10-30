// Biblioteca de vistas de Gremio (/marketplace).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'c1', freelancer: 'f1', admin: 'u-admin', moderador: 'u-mod', soporte: 'u-sop' };
const head = '.admin-content .page-head';
const STAFF = ['Administrador', 'Moderador', 'Soporte'];

module.exports = {
  dir: 'marketplace',
  name: 'Gremio',
  kind: 'Marketplace de servicios freelance',
  theme: 'sketch',
  description: 'Marketplace de servicios freelance con pago protegido: sitio público con servicios y proyectos, app del cliente, app del freelancer y panel del equipo para moderación, disputas, pagos y comisiones.',
  accounts: {
    'c1': { name: 'Carla Méndez', role: 'Cliente', email: 'carla@cafebrote.cl', password: 'cliente123' },
    'f1': { name: 'Diego Araya', role: 'Freelancer', email: 'diego@gremio.cl', password: 'free123' },
    'u-admin': { name: 'Ignacia Vidal', role: 'Administrador', email: 'admin@gremio.cl', password: 'admin123' },
    'u-mod': { name: 'Bruno Lagos', role: 'Moderador', email: 'mod@gremio.cl', password: 'mod123' },
    'u-sop': { name: 'Paz Molina', role: 'Soporte', email: 'soporte@gremio.cl', password: 'soporte123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Quien contrata: compra de servicios, pedidos con garantía, proyectos y pagos.' },
    { id: 'freelancer', label: 'Freelancer', desc: 'Quien vende: servicios con paquetes, pedidos, propuestas, ganancias y perfil.' },
    { id: 'moderador', label: 'Moderador', desc: 'Revisión de servicios nuevos, categorías y portada.' },
    { id: 'soporte', label: 'Soporte', desc: 'Pedidos, intervención y mediación de disputas.' },
    { id: 'admin', label: 'Administrador', desc: 'Todo el panel: comunidad, pagos a freelancers, comisiones, usuarios y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Sketch" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.hero-search',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.hero-search', mobile: true,
      description: 'Página de inicio con buscador, categorías, servicios destacados, explicación del pago protegido y freelancers con más pedidos. Los textos y destacados se editan desde el panel.',
      actions: ['Buscar servicios por palabra clave o con etiquetas populares', 'Entrar a una de las 5 categorías', 'Ver servicios destacados y guardarlos en favoritos', 'Conocer los 4 pasos del pago protegido', 'Ir al perfil de un freelancer o empezar a vender']
    },
    {
      id: 'servicios', section: 'publico', title: 'Explorar servicios', url: 'index.html#/servicios', waitFor: '.gig-grid .card', mobile: true,
      description: 'Listado de servicios activos con filtros combinables. El orden por relevancia pondera valoración, cantidad de reseñas y pedidos.',
      actions: ['Buscar por palabra clave', 'Filtrar por categoría, precio del paquete básico y tiempo de entrega', 'Filtrar por valoración y nivel del freelancer', 'Ordenar por relevancia, valoración, pedidos o precio', 'Guardar servicios en favoritos']
    },
    {
      id: 'servicio', section: 'publico', title: 'Detalle de servicio', url: 'index.html#/servicio/g-f1-0', waitFor: '[data-buybox]', mobile: true,
      description: 'Ficha de un servicio con descripción, tres paquetes (Básico, Estándar y Premium), comparación detallada, preguntas frecuentes, reseñas y datos del freelancer.',
      actions: ['Cambiar entre paquetes y ver precio, plazo, revisiones e inclusiones', 'Ver el total con el cargo por servicio', 'Comparar los 3 paquetes en una tabla', 'Leer preguntas frecuentes y reseñas con respuesta del freelancer', 'Continuar al pago protegido o ver el perfil del freelancer']
    },
    {
      id: 'perfil-freelancer', section: 'publico', title: 'Perfil del freelancer', url: 'index.html#/freelancer/f1', waitFor: '.profile-head',
      description: 'Perfil público con nivel de vendedor, verificación, estadísticas de cumplimiento, portafolio, servicios activos y reseñas.',
      actions: ['Ver pedidos completados, entregas a tiempo y tiempo de respuesta', 'Revisar bio, habilidades y portafolio', 'Ver todos sus servicios activos', 'Leer las últimas reseñas de clientes']
    },
    {
      id: 'proyectos', section: 'publico', title: 'Proyectos publicados', url: 'index.html#/proyectos', waitFor: '.brief-card',
      description: 'Proyectos que publicaron los clientes para recibir propuestas, con presupuesto, plazo, cantidad de propuestas y estado.',
      actions: ['Ver los proyectos abiertos primero', 'Revisar categoría, presupuesto y plazo', 'Ver cuántas propuestas lleva cada uno', 'Publicar un proyecto propio']
    },
    {
      id: 'proyecto', section: 'publico', title: 'Detalle de proyecto', url: 'index.html#/proyectos/b1', waitFor: '.dl',
      description: 'Descripción completa de un proyecto con presupuesto, plazo y propuestas recibidas. El botón cambia según quién lo mira: visitante, freelancer o el cliente que lo publicó.',
      actions: ['Leer la descripción y el presupuesto', 'Ingresar como freelancer para postular', 'Ver si ya envió una propuesta (freelancer)', 'Ir a las propuestas recibidas (cliente dueño)']
    },
    {
      id: 'checkout-sin-sesion', section: 'publico', title: 'Contratar sin sesión', url: 'index.html#/checkout/g-f1-0/estandar', waitFor: '.tile-icon',
      description: 'Lo que ve un visitante al intentar contratar un paquete sin haber ingresado: se le pide ingresar o crear una cuenta de cliente y luego vuelve al mismo pago.',
      actions: ['Ir a ingresar o crear una cuenta de cliente', 'Volver al pago después de ingresar', 'Regresar al servicio']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Página de ingreso para clientes, freelancers y equipo, con cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, moderador, soporte, freelancer o cliente', 'Pasar a crear una cuenta', 'Volver al marketplace']
    },
    {
      id: 'registro', section: 'publico', title: 'Crear cuenta', url: 'login.html?modo=freelancer', waitFor: '#register',
      description: 'Registro de cuenta nueva como cliente ("Quiero contratar") o como freelancer ("Quiero vender"). El formulario cambia según el tipo elegido.',
      actions: ['Elegir entre cuenta de cliente o de freelancer', 'Ingresar nombre, correo y contraseña', 'Indicar la especialidad (freelancer) o la empresa (cliente)', 'Entrar directo a su app al terminar']
    },

    // ================= Cliente =================
    {
      id: 'checkout', section: 'cliente', login: U.cliente, title: 'Confirmar pedido y pago', url: 'index.html#/checkout/g-f1-0/estandar', waitFor: '#co',
      setup: async h => { await h.fill('#co-req', 'Logo para una cafetería de especialidad en Providencia. Público joven, estilo cálido y artesanal. Referencias en Instagram @cafebrote.'); await h.check('#co [name="terms"]'); },
      description: 'Pago de un paquete con requisitos para el freelancer y resumen de precio. El total queda retenido en garantía hasta que el cliente apruebe la entrega (pago simulado).',
      actions: ['Escribir los requisitos y adjuntar archivos', 'Elegir medio de pago (crédito, débito o transferencia)', 'Ver precio, cargo por servicio y total', 'Pagar y abrir el pedido con el pago retenido']
    },
    {
      id: 'publicar-proyecto', section: 'cliente', login: U.cliente, title: 'Publicar proyecto', url: 'index.html#/proyectos/nuevo', waitFor: '#nb',
      description: 'Formulario para publicar un proyecto y recibir propuestas de freelancers con precio y plazo. Sin sesión de cliente se pide ingresar primero.',
      actions: ['Escribir título y descripción', 'Elegir categoría y plazo en días', 'Definir presupuesto mínimo y máximo', 'Publicarlo en el listado de proyectos']
    },
    {
      id: 'cliente-resumen', section: 'cliente', login: U.cliente, title: 'Resumen del cliente', url: 'cliente.html#/', waitFor: '.kpi-row', mobile: true,
      description: 'Inicio de la app del cliente con aviso de entregas por aprobar, dinero en garantía y pedidos activos con mensajes sin leer.',
      actions: ['Ver pedidos activos, fondos retenidos y total invertido', 'Ir directo a una entrega pendiente de aprobación', 'Abrir un pedido activo', 'Explorar servicios o publicar un proyecto']
    },
    {
      id: 'cliente-pedidos', section: 'cliente', login: U.cliente, title: 'Mis pedidos', url: 'cliente.html#/pedidos', waitFor: '.admin-content tbody tr',
      description: 'Tabla con todos los pedidos del cliente, su estado y el estado de la garantía.',
      actions: ['Buscar por código, servicio o freelancer', 'Filtrar por estado del pedido', 'Ver mensajes sin leer por pedido', 'Exportar la lista a CSV', 'Abrir el detalle de un pedido']
    },
    {
      id: 'cliente-pedido', section: 'cliente', login: U.cliente, title: 'Pedido entregado', url: 'cliente.html#/pedidos/demo1', waitFor: '.chat-pane',
      description: 'Detalle de un pedido con barra de etapas, entregas con archivos, chat con el freelancer, resumen del pago e historial. Cuando hay una entrega, el cliente decide si la aprueba.',
      actions: ['Aprobar la entrega y liberar los fondos al freelancer', 'Solicitar una revisión incluida en el paquete', 'Conversar y adjuntar archivos en el chat', 'Abrir una disputa', 'Revisar requisitos, plazo e historial del pedido']
    },
    {
      id: 'cliente-revision', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Solicitar revisión" en un pedido entregado', title: 'Solicitar revisión', url: 'cliente.html#/pedidos/demo1', waitFor: '.chat-pane',
      setup: async h => { await h.click('[data-a="revision"]'); await h.modal(); },
      description: 'Pedido de cambios al freelancer, descontando una de las revisiones que incluye el paquete. El pedido vuelve a "En revisión".',
      actions: ['Explicar qué debe ajustarse', 'Ver cuántas revisiones quedan', 'Devolver el pedido al freelancer con un mensaje en el chat']
    },
    {
      id: 'cliente-disputa', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Abrir disputa" en un pedido', title: 'Abrir disputa', url: 'cliente.html#/pedidos/demo2', waitFor: '.chat-pane',
      setup: async h => { await h.click('[data-a="dispute"]'); await h.modal(); },
      description: 'Reclamo formal sobre un pedido. Los fondos siguen retenidos y el caso llega al equipo de soporte para su mediación.',
      actions: ['Elegir el motivo del reclamo', 'Describir lo ocurrido y adjuntar evidencia', 'Enviar el caso a soporte']
    },
    {
      id: 'cliente-resena', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Dejar reseña" en un pedido completado', title: 'Calificar el trabajo', url: 'cliente.html#/pedidos/o54', waitFor: '.chat-pane',
      setup: async h => { await h.click('[data-a="review"]'); await h.modal(); },
      description: 'Reseña con estrellas y comentario que se publica en el servicio y en el perfil del freelancer.',
      actions: ['Calificar de 1 a 5 estrellas', 'Escribir un comentario', 'Publicar la reseña en el servicio']
    },
    {
      id: 'cliente-mensajes', section: 'cliente', login: U.cliente, title: 'Mensajes', url: 'cliente.html#/mensajes', waitFor: head,
      description: 'Bandeja de dos columnas con las conversaciones de cada pedido, ordenadas por actividad, y el chat del pedido elegido al lado.',
      actions: ['Cambiar entre las conversaciones de cada pedido', 'Identificar mensajes sin leer', 'Responder y adjuntar archivos sin salir de la bandeja', 'Abrir el pedido completo']
    },
    {
      id: 'cliente-proyectos', section: 'cliente', login: U.cliente, title: 'Mis proyectos y propuestas', url: 'cliente.html#/proyectos', waitFor: head,
      description: 'Proyectos publicados por el cliente con las propuestas recibidas, ordenadas por precio, con nivel y valoración de cada freelancer.',
      actions: ['Comparar precio, plazo y mensaje de cada propuesta', 'Contratar una propuesta (crea el pedido con pago retenido)', 'Rechazar propuestas', 'Cerrar un proyecto para no recibir más']
    },
    {
      id: 'cliente-favoritos', section: 'cliente', login: U.cliente, title: 'Favoritos', url: 'cliente.html#/favoritos', waitFor: '.gig-grid .card',
      description: 'Servicios guardados con el corazón desde el sitio, listos para volver a ellos.',
      actions: ['Ver los servicios guardados', 'Quitar un servicio de favoritos', 'Abrir un servicio para contratarlo']
    },
    {
      id: 'cliente-pagos', section: 'cliente', login: U.cliente, title: 'Pagos', url: 'cliente.html#/pagos', waitFor: '.admin-content table',
      description: 'Historial de cargos con precio, cargo por servicio, total y estado de la garantía de cada pedido.',
      actions: ['Ver total pagado, retenido y reembolsado', 'Revisar el desglose de cada cargo', 'Ver si cada pago está retenido, liberado o reembolsado', 'Abrir el pedido asociado']
    },

    // ================= Freelancer =================
    {
      id: 'freelancer-resumen', section: 'freelancer', login: U.freelancer, title: 'Resumen del freelancer', url: 'freelancer.html#/', waitFor: '.kpi-row', mobile: true,
      description: 'Inicio de la app del freelancer con saldo disponible y en garantía, ganancias netas por mes, avance hacia el siguiente nivel de vendedor y pedidos en curso.',
      actions: ['Ver saldo disponible, en garantía y pedidos activos', 'Seguir las ganancias netas de los últimos 8 meses', 'Ver qué falta para subir de nivel', 'Abrir un pedido en curso', 'Crear un servicio o buscar proyectos']
    },
    {
      id: 'freelancer-pedidos', section: 'freelancer', login: U.freelancer, title: 'Pedidos', url: 'freelancer.html#/pedidos', waitFor: '.admin-content tbody tr',
      description: 'Todos los pedidos recibidos con cliente, ganancia neta tras comisión, plazo y estado.',
      actions: ['Buscar y filtrar por estado', 'Ver la ganancia neta de cada pedido', 'Detectar pedidos atrasados o con mensajes', 'Exportar a CSV', 'Abrir el detalle de un pedido']
    },
    {
      id: 'freelancer-pedido', section: 'freelancer', login: U.freelancer, title: 'Pedido nuevo por aceptar', url: 'freelancer.html#/pedidos/demo3', waitFor: '.chat-pane',
      description: 'Detalle de un pedido recién pagado: el freelancer ve los requisitos, el pago ya retenido y su ganancia neta, y decide si lo acepta.',
      actions: ['Aceptar y comenzar el trabajo', 'Rechazar el pedido (se reembolsa al cliente)', 'Conversar con el cliente', 'Ver comisión de Gremio y ganancia neta']
    },
    {
      id: 'freelancer-entregar', section: 'freelancer', login: U.freelancer, kind: 'modal', from: 'Botón "Entregar trabajo" en un pedido en progreso', title: 'Entregar trabajo', url: 'freelancer.html#/pedidos/demo2', waitFor: '.chat-pane',
      setup: async h => { await h.click('[data-a="deliver"]'); await h.modal(); },
      description: 'Entrega del trabajo con mensaje y archivos. El pedido pasa a "Entregado" y el cliente puede aprobarlo o pedir una revisión.',
      actions: ['Escribir el mensaje de entrega', 'Adjuntar los archivos finales', 'Enviar la entrega al cliente']
    },
    {
      id: 'freelancer-servicios', section: 'freelancer', login: U.freelancer, title: 'Mis servicios', url: 'freelancer.html#/servicios', waitFor: '.admin-content tbody tr',
      description: 'Servicios del freelancer con precio desde, pedidos, impresiones, valoración y estado (activo, pausado, pendiente o rechazado con la nota del moderador).',
      actions: ['Pausar o reactivar un servicio', 'Editar un servicio', 'Eliminar uno sin pedidos en curso', 'Ver la nota de moderación si fue rechazado', 'Crear un servicio nuevo']
    },
    {
      id: 'freelancer-editor', section: 'freelancer', login: U.freelancer, title: 'Editor de servicio', url: 'freelancer.html#/servicios/g-f1-0', waitFor: '#ge',
      description: 'Edición completa de un servicio: datos generales, los tres paquetes y preguntas frecuentes. Los servicios nuevos pasan por moderación antes de publicarse.',
      actions: ['Editar título, categoría, etiquetas y descripción', 'Definir precio, días, revisiones e inclusiones de cada paquete', 'Agregar o quitar preguntas frecuentes', 'Guardar como borrador o enviar a publicar']
    },
    {
      id: 'freelancer-mensajes', section: 'freelancer', login: U.freelancer, title: 'Mensajes', url: 'freelancer.html#/mensajes', waitFor: head,
      description: 'Bandeja de dos columnas con las conversaciones con cada cliente, agrupadas por pedido, y el chat del pedido elegido al lado.',
      actions: ['Cambiar entre las conversaciones de cada pedido', 'Detectar mensajes sin leer', 'Responder y adjuntar archivos desde la bandeja', 'Abrir el pedido completo']
    },
    {
      id: 'freelancer-proyectos', section: 'freelancer', login: U.freelancer, title: 'Proyectos y propuestas', url: 'freelancer.html#/proyectos', waitFor: '.brief-card',
      description: 'Proyectos abiertos (primero los de su categoría) y el estado de las propuestas que ya envió.',
      actions: ['Revisar proyectos con presupuesto y plazo', 'Enviar una propuesta', 'Ver si cada propuesta fue aceptada o no seleccionada']
    },
    {
      id: 'freelancer-propuesta', section: 'freelancer', login: U.freelancer, kind: 'modal', from: 'Botón "Enviar propuesta" de un proyecto', title: 'Enviar propuesta', url: 'freelancer.html#/proyectos?brief=b0', waitFor: '.brief-card',
      setup: async h => { await h.modal(); await h.fill('#pp-t', 'Hola, puedo encargarme del diseño de la interfaz y la identidad visual. Propongo 3 propuestas iniciales, 2 rondas de ajustes y entrega en Figma.'); },
      description: 'Propuesta para un proyecto con precio, plazo y mensaje al cliente. Muestra cuánto recibiría después de la comisión.',
      actions: ['Proponer precio y plazo', 'Escribir el mensaje al cliente', 'Ver la ganancia neta estimada', 'Enviar la propuesta']
    },
    {
      id: 'freelancer-ganancias', section: 'freelancer', login: U.freelancer, title: 'Ganancias', url: 'freelancer.html#/ganancias', waitFor: '.kpi-row',
      description: 'Saldo disponible, en garantía, retiros en proceso y retirado, con historial de retiros, ganancias por categoría y pedidos liberados.',
      actions: ['Ver el saldo por estado', 'Solicitar un retiro de fondos', 'Revisar el historial de retiros', 'Ver ganancias por categoría y por pedido']
    },
    {
      id: 'freelancer-retiro', section: 'freelancer', login: U.freelancer, kind: 'modal', from: 'Botón "Retirar fondos" en Ganancias', title: 'Retirar fondos', url: 'freelancer.html#/ganancias', waitFor: '.kpi-row',
      setup: async h => { await h.click('[data-w]'); await h.modal(); },
      description: 'Solicitud de retiro del saldo disponible a la cuenta bancaria registrada. Queda pendiente hasta que administración registra el pago.',
      actions: ['Ver el saldo disponible', 'Indicar el monto (respetando el mínimo)', 'Ver la cuenta de destino y el plazo de transferencia', 'Enviar la solicitud de retiro']
    },
    {
      id: 'freelancer-perfil', section: 'freelancer', login: U.freelancer, title: 'Mi perfil', url: 'freelancer.html#/perfil', waitFor: '[data-port]',
      description: 'Datos del perfil público y de pago: especialidad, bio, habilidades, idiomas, cuenta bancaria y portafolio.',
      actions: ['Editar especialidad, ciudad, bio y tiempo de respuesta', 'Actualizar habilidades e idiomas', 'Registrar banco y número de cuenta', 'Agregar o quitar trabajos del portafolio']
    },
    {
      id: 'freelancer-portafolio', section: 'freelancer', login: U.freelancer, kind: 'modal', from: 'Botón "Agregar trabajo" en Mi perfil', title: 'Agregar trabajo al portafolio', url: 'freelancer.html#/perfil', waitFor: '[data-port]',
      setup: async h => { await h.click('[data-addp]'); await h.modal(); },
      description: 'Alta de un trabajo en el portafolio, que luego aparece en el perfil público.',
      actions: ['Escribir el título del trabajo', 'Sumarlo al portafolio', 'Guardar el perfil para publicarlo']
    },

    // ================= Moderador =================
    {
      id: 'mod-resumen', section: 'moderador', login: U.moderador, roles: STAFF, title: 'Resumen del panel', url: 'admin.html#/', waitFor: '.kpi-row', mobile: true,
      description: 'Inicio del panel con GMV, ingresos por comisiones, pedidos por estado, categorías top y una cola de tareas según el rol. El menú solo muestra las secciones que el rol puede usar.',
      actions: ['Ver GMV de 30 días y su variación', 'Seguir GMV mensual e ingresos por comisiones', 'Ver pedidos por estado y categorías top', 'Ir a las tareas pendientes de su rol']
    },
    {
      id: 'mod-moderacion', section: 'moderador', login: U.moderador, roles: ['Administrador', 'Moderador'], title: 'Moderación de servicios', url: 'admin.html#/moderacion', waitFor: '[data-ok]',
      description: 'Cola de servicios nuevos por revisar, con alertas automáticas, y tabla de todos los servicios publicados.',
      actions: ['Aprobar un servicio para publicarlo', 'Rechazar con motivo para el freelancer', 'Ver la vista previa pública', 'Despublicar o reactivar servicios existentes']
    },
    {
      id: 'mod-rechazar', section: 'moderador', login: U.moderador, roles: ['Administrador', 'Moderador'], kind: 'modal', from: 'Botón "Rechazar" en la cola de moderación', title: 'Rechazar servicio', url: 'admin.html#/moderacion', waitFor: '[data-no]',
      setup: async h => { await h.click('[data-no]'); await h.modal(); },
      description: 'Rechazo de un servicio con motivo y comentario. El freelancer ve la nota en "Mis servicios".',
      actions: ['Elegir uno de los motivos predefinidos', 'Agregar un comentario adicional', 'Dejar la nota visible para el freelancer']
    },
    {
      id: 'mod-categorias', section: 'moderador', login: U.moderador, roles: ['Administrador', 'Moderador'], title: 'Categorías', url: 'admin.html#/categorias', waitFor: '.admin-content tbody tr',
      description: 'Categorías del marketplace con servicios activos y GMV. Los cambios se reflejan en la portada, los filtros y los formularios.',
      actions: ['Crear y editar categorías', 'Cambiar el orden en la portada', 'Ocultar o mostrar una categoría', 'Eliminar categorías', 'Exportar a CSV']
    },
    {
      id: 'mod-categoria-editar', section: 'moderador', login: U.moderador, roles: ['Administrador', 'Moderador'], kind: 'modal', from: 'Botón "Editar" en Categorías', title: 'Editar categoría', url: 'admin.html#/categorias', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click('[data-act="edit"]'); await h.modal(); },
      description: 'Formulario de la categoría con nombre, ícono, descripción, orden y visibilidad.',
      actions: ['Cambiar nombre, ícono y descripción', 'Definir el orden en la portada', 'Ocultarla del marketplace']
    },
    {
      id: 'mod-destacados', section: 'moderador', login: U.moderador, roles: ['Administrador', 'Moderador'], title: 'Portada y destacados', url: 'admin.html#/destacados', waitFor: '#hero',
      description: 'Editor de la portada: título, subtítulo, eslogan, barra de aviso y cifras, más la lista ordenada de servicios destacados.',
      actions: ['Editar los textos de la portada', 'Activar una barra de aviso', 'Mostrar u ocultar las cifras', 'Agregar, quitar y reordenar destacados']
    },

    // ================= Soporte =================
    {
      id: 'sop-pedidos', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], title: 'Pedidos', url: 'admin.html#/pedidos', waitFor: '.admin-content tbody tr',
      description: 'Todos los pedidos del marketplace con cliente, freelancer, precio, ingreso de Gremio, estado y garantía.',
      actions: ['Buscar y filtrar por estado, garantía, categoría y plazo', 'Ver el ingreso de Gremio por pedido', 'Exportar a CSV', 'Abrir el detalle de un pedido']
    },
    {
      id: 'sop-pedido', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], title: 'Pedido visto por soporte', url: 'admin.html#/pedidos/o36', waitFor: '.chat-pane',
      description: 'El mismo detalle de pedido con la conversación de ambas partes, comisiones y una caja de intervención para cancelar y reembolsar.',
      actions: ['Leer el chat entre cliente y freelancer', 'Ver precio, cargo, comisión y neto', 'Cancelar el pedido y reembolsar al cliente', 'Ir a la disputa si existe']
    },
    {
      id: 'sop-disputas', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], title: 'Disputas', url: 'admin.html#/disputas', waitFor: '.admin-content tbody tr',
      description: 'Disputas abiertas, en revisión y resueltas, con el pedido, el motivo y el monto en juego.',
      actions: ['Filtrar por estado', 'Ver motivo y monto en juego', 'Abrir el caso para mediar']
    },
    {
      id: 'sop-disputa', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], title: 'Mediación de disputa', url: 'admin.html#/disputas/d0', waitFor: '[data-dec]',
      description: 'Caso de disputa con la evidencia de cada parte, la conversación del pedido y las tres resoluciones posibles.',
      actions: ['Tomar el caso y dejarlo en revisión', 'Agregar notas o pedir información', 'Liberar los fondos al freelancer', 'Reembolsar total o parcialmente al cliente']
    },
    {
      id: 'sop-resolver', section: 'soporte', login: U.soporte, roles: ['Administrador', 'Soporte'], kind: 'modal', from: 'Botón "Reembolso parcial" en una disputa', title: 'Resolver disputa', url: 'admin.html#/disputas/d0', waitFor: '[data-dec]',
      setup: async h => { await h.click('[data-dec="parcial"]'); await h.modal(); },
      description: 'Cierre de la disputa con el porcentaje a reembolsar y el fundamento. Los fondos se mueven y el pedido se actualiza.',
      actions: ['Definir el porcentaje de reembolso', 'Escribir el fundamento de la decisión', 'Cerrar el caso y mover los fondos']
    },

    // ================= Administrador =================
    {
      id: 'admin-resumen', section: 'admin', login: U.admin, title: 'Resumen completo', url: 'admin.html#/', waitFor: '.kpi-row',
      description: 'El resumen con todas las secciones del panel y la cola completa: moderación, disputas, retiros por pagar y freelancers sin verificar.',
      actions: ['Ver los indicadores del marketplace', 'Atender las tareas de todas las áreas', 'Revisar los últimos pedidos', 'Restablecer los datos de demostración']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, roles: STAFF, title: 'Clientes y freelancers', url: 'admin.html#/usuarios', waitFor: '.admin-content tbody tr',
      description: 'Comunidad del marketplace con tipo de cuenta, pedidos, monto facturado o gastado, verificación de identidad y estado.',
      actions: ['Buscar y filtrar por tipo, verificación y estado', 'Verificar la identidad de un freelancer', 'Suspender o reactivar una cuenta con motivo', 'Abrir la ficha del miembro', 'Exportar a CSV']
    },
    {
      id: 'admin-miembro', section: 'admin', login: U.admin, roles: STAFF, title: 'Ficha de miembro', url: 'admin.html#/usuarios/f1', waitFor: '.admin-content table',
      description: 'Ficha de un freelancer o cliente con nivel, valoración, saldos y sus últimos pedidos.',
      actions: ['Ver nivel, valoración y saldos', 'Revisar sus últimos 20 pedidos', 'Ver su perfil público']
    },
    {
      id: 'admin-retiros', section: 'admin', login: U.admin, title: 'Pagos a freelancers', url: 'admin.html#/retiros', waitFor: '.admin-content tbody tr',
      description: 'Solicitudes de retiro de los freelancers con monto, cuenta y estado.',
      actions: ['Registrar el pago de un retiro', 'Rechazar un retiro con motivo', 'Pagar todos los pendientes de una vez', 'Exportar a CSV']
    },
    {
      id: 'admin-comisiones', section: 'admin', login: U.admin, title: 'Comisiones y ajustes', url: 'admin.html#/comisiones', waitFor: '#fees',
      description: 'Porcentajes de cargo al cliente y comisión al freelancer con un ejemplo calculado, reglas de retiro y requisitos de cada nivel de vendedor.',
      actions: ['Cambiar las comisiones y ver el ejemplo al instante', 'Definir el retiro mínimo y la liberación automática', 'Ajustar pedidos y valoración de cada nivel', 'Restablecer los datos de demostración']
    },
    {
      id: 'admin-equipo', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/equipo', waitFor: '.admin-content tbody tr',
      description: 'Cuentas con su rol, último ingreso y estado, más la matriz de permisos que muestra qué secciones ve cada rol del equipo.',
      actions: ['Crear cuentas de cualquier rol', 'Cambiar rol, cargo o contraseña', 'Desactivar una cuenta', 'Revisar la matriz de permisos por rol']
    },
    {
      id: 'admin-cuenta', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nueva cuenta" en Usuarios y roles', title: 'Nueva cuenta', url: 'admin.html#/equipo', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Alta de una cuenta con nombre, correo, contraseña, rol, cargo y estado.',
      actions: ['Ingresar nombre y correo', 'Asignar rol y cargo', 'Definir la contraseña inicial', 'Dejarla activa o inactiva']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content tbody tr',
      description: 'Registro de acciones del sistema: pedidos, disputas, moderación, comisiones y cambios del equipo.',
      actions: ['Buscar en el registro', 'Filtrar por tipo de acción', 'Ver quién hizo cada cambio y cuándo', 'Exportar a CSV']
    }
  ]
};
