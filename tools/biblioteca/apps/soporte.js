// Biblioteca de vistas de Fibra Austral · Atiende (/soporte): centro de ayuda, portal de clientes,
// consola de agentes y administración de la mesa de soporte.
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', supervisor: 'u-sup', agente: 'u-cam', cliente: 'u-cli' };
const CONSOLA = ['Agente', 'Supervisor', 'Administrador'];
const SUP = ['Supervisor', 'Administrador'];
const TICKET = 'agente.html#/ticket/t8';

module.exports = {
  dir: 'soporte',
  name: 'Fibra Austral · Atiende',
  kind: 'Mesa de ayuda y centro de soporte',
  theme: 'web2',
  description: 'Mesa de ayuda para una empresa de internet y TV: centro de ayuda con base de conocimiento, chat en vivo y página de estado, portal de tickets para clientes, consola de agentes con SLA y macros, y una administración con métricas, artículos, incidentes, automatizaciones y usuarios.',
  accounts: {
    'u-admin': { name: 'Andrea Vidal', role: 'Administrador', email: 'admin@fibraustral.cl', password: 'demo123' },
    'u-sup': { name: 'Jorge Mansilla', role: 'Supervisor', email: 'supervisor@fibraustral.cl', password: 'demo123' },
    'u-cam': { name: 'Camila Oyarzún', role: 'Agente', email: 'agente@fibraustral.cl', password: 'demo123' },
    'u-cli': { name: 'Daniela Pérez Soto', role: 'Cliente', email: 'cliente@correo.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Centro de ayuda', desc: 'Lo que ve cualquier visitante: base de conocimiento, contacto, chat y estado del servicio.' },
    { id: 'cliente', label: 'Cliente', desc: 'Portal donde el cliente sigue sus tickets, responde y califica la atención.' },
    { id: 'agente', label: 'Agente', desc: 'Consola de trabajo: bandeja de tickets de su grupo, detalle con SLA, chats en vivo y clientes.' },
    { id: 'supervisor', label: 'Supervisor', desc: 'Administración operativa: métricas, base de conocimiento, macros, incidentes, grupos y bitácora.' },
    { id: 'admin', label: 'Administrador', desc: 'Configuración del sistema: SLA, automatizaciones, usuarios, centro de ayuda y datos.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Web 2.0" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '#main h1',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'glass', group: 'Estilo', label: 'Cristal', desc: 'Paneles translúcidos sobre fondos suaves.', theme: 'glass' },
      { id: 'contrast', group: 'Estilo', label: 'Contraste', desc: 'Alto contraste y máxima legibilidad.', theme: 'contrast' },
      { id: 'candy', group: 'Estilo', label: 'Caramelo', desc: 'Colores alegres y bordes redondeados.', theme: 'candy' }
    ]
  },

  views: [
    // ================= Centro de ayuda =================
    {
      id: 'portada', section: 'publico', title: 'Portada del centro de ayuda', url: 'index.html#/', waitFor: '#main h1', mobile: true,
      description: 'Inicio del centro de ayuda con buscador, estado del servicio, temas de la base de conocimiento, guías destacadas, artículos más leídos y vías de contacto. Los textos se editan desde la administración.',
      actions: ['Buscar en la base de conocimiento con sugerencias al escribir', 'Entrar a un tema o a una guía destacada', 'Ver si hay incidentes activos', 'Abrir el chat, escribir o llamar']
    },
    {
      id: 'categoria', section: 'publico', title: 'Tema de ayuda', url: 'index.html#/categoria/cat-int', waitFor: '#main h1',
      description: 'Listado de los artículos publicados de un tema, por ejemplo "Internet y WiFi".',
      actions: ['Ver todos los artículos del tema', 'Abrir un artículo', 'Saltar a otros temas']
    },
    {
      id: 'articulo', section: 'publico', title: 'Artículo de ayuda', url: 'index.html#/articulo/a-lento', waitFor: '.art-title', mobile: true,
      description: 'Artículo de la base de conocimiento con pasos, votación de utilidad, artículos relacionados y caminos de contacto si el problema sigue.',
      actions: ['Leer la guía paso a paso', 'Votar si el artículo sirvió', 'Ir a artículos relacionados', 'Abrir el chat o escribir a soporte']
    },
    {
      id: 'busqueda', section: 'publico', title: 'Resultados de búsqueda', url: 'index.html#/buscar?q=router', waitFor: '#main h1',
      description: 'Resultados de la búsqueda en la base de conocimiento, ordenados por relevancia.',
      actions: ['Ver los artículos que coinciden', 'Refinar la búsqueda', 'Escribir a soporte si no aparece la respuesta']
    },
    {
      id: 'contacto', section: 'publico', title: 'Formulario de contacto', url: 'index.html#/contacto', waitFor: '[data-contact]',
      setup: async h => { await h.fill('[data-contact] [name="subject"]', 'Internet lento en las noches'); await h.wait('[data-deflect]:not([hidden])'); },
      description: 'Formulario para abrir un ticket sin iniciar sesión. Mientras se escribe el asunto sugiere artículos que podrían resolver el problema antes de enviar.',
      actions: ['Escribir nombre, correo, asunto y detalle', 'Ver artículos sugeridos según lo que escribe', 'Indicar la urgencia', 'Adjuntar fotos o boletas', 'Crear el ticket y recibir su número']
    },
    {
      id: 'contacto-enviado', section: 'publico', title: 'Solicitud recibida', url: 'index.html#/contacto', waitFor: '[data-contact]',
      setup: async h => {
        await h.fill('[data-contact] [name="name"]', 'Martín Soto Araya'); await h.fill('[data-contact] [name="email"]', 'martin.soto@correo.cl');
        await h.fill('[data-contact] [name="subject"]', 'Router se reinicia solo'); await h.fill('[data-contact] [name="body"]', 'Desde ayer el router se reinicia cada media hora y pierdo la conexión.');
        await h.click('[data-contact] [type="submit"]'); await h.wait('[data-again]');
      },
      description: 'Confirmación con el número de ticket. Las automatizaciones lo asignan a un grupo y el cliente puede seguirlo en el portal con su correo.',
      actions: ['Ver el número de ticket', 'Saber cuándo responderán según el SLA', 'Enviar otra consulta']
    },
    {
      id: 'chat', section: 'publico', kind: 'modal', from: 'Botón "¿Necesitas ayuda?" de las páginas públicas', title: 'Chat en vivo', url: 'index.html#/', waitFor: '#main h1',
      setup: async h => {
        await h.click('[data-fab]'); await h.wait('.chatw-panel:not([hidden])');
        await h.click('.chatw-quick [data-q="Internet lento"]'); await h.wait('.chatw-links', 'visible');
      },
      description: 'Chat que primero atiende un asistente con artículos de la base de conocimiento y, si el cliente lo pide, deriva a un agente que responde desde la consola.',
      actions: ['Elegir una consulta rápida o escribir', 'Recibir artículos sugeridos por el asistente', 'Pedir hablar con una persona', 'Ver su posición en la fila', 'Conversar con el agente en tiempo real']
    },
    {
      id: 'estado', section: 'publico', title: 'Estado del servicio', url: 'estado.html', waitFor: '[data-sub]', mobile: true,
      description: 'Página de estado con la situación general, disponibilidad de 90 días por servicio, incidentes activos con su bitácora de actualizaciones e historial.',
      actions: ['Ver si hay una falla masiva activa', 'Revisar la disponibilidad de cada servicio', 'Leer las actualizaciones de un incidente', 'Suscribirse a avisos por correo']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account',
      description: 'Ingreso común para clientes y equipo de soporte, con cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar como administradora, supervisor, agente o cliente', 'Recuperar la contraseña (simulado)', 'Cambiar a la pestaña de registro']
    },
    {
      id: 'registro', section: 'publico', title: 'Crear cuenta de cliente', url: 'login.html', waitFor: '.demo-account',
      setup: async h => { await h.click('[data-tab="registro"]'); await h.wait('#register-form'); },
      description: 'Registro de clientes con datos del titular y del servicio. Si ya había escrito antes con ese correo, sus tickets aparecen en el portal.',
      actions: ['Ingresar nombre, correo y contraseña', 'Agregar RUT y teléfono', 'Elegir plan contratado y comuna', 'Crear la cuenta y entrar al portal']
    },

    // ================= Cliente =================
    {
      id: 'portal', section: 'cliente', login: U.cliente, title: 'Mis tickets', url: 'portal.html#/', waitFor: '.portal-tabs', mobile: true,
      description: 'Portal del cliente con todos sus tickets, su estado y la última respuesta, más un resumen de su servicio.',
      actions: ['Filtrar tickets por estado', 'Abrir la conversación de un ticket', 'Crear un ticket nuevo', 'Ver los datos de su servicio']
    },
    {
      id: 'portal-ticket', section: 'cliente', login: U.cliente, title: 'Ticket y calificación', url: 'portal.html#/ticket/t0', waitFor: '[data-csat]',
      description: 'Conversación de un ticket con las respuestas del equipo. Cuando el ticket queda resuelto, el cliente lo califica con estrellas y un comentario (CSAT).',
      actions: ['Leer las respuestas del agente', 'Responder con texto y adjuntos', 'Marcar que el problema se resolvió', 'Calificar la atención de 1 a 5 estrellas']
    },
    {
      id: 'portal-nuevo', section: 'cliente', login: U.cliente, title: 'Nuevo ticket', url: 'portal.html#/nuevo', waitFor: '[name="subject"]',
      description: 'Formulario de ticket para clientes con sesión: los datos de contacto ya vienen completos.',
      actions: ['Escribir asunto y detalle', 'Indicar la urgencia', 'Adjuntar archivos', 'Enviar y seguir el ticket en el portal']
    },
    {
      id: 'portal-perfil', section: 'cliente', login: U.cliente, title: 'Mi cuenta', url: 'portal.html#/perfil', waitFor: '[data-prof]',
      description: 'Datos de contacto y dirección del cliente, que el equipo ve en la ficha de cada ticket.',
      actions: ['Actualizar nombre y teléfono', 'Cambiar la dirección del servicio', 'Guardar los cambios']
    },

    // ================= Agente =================
    {
      id: 'bandeja', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Bandeja de tickets', url: 'agente.html#/', waitFor: '.inbox-table', mobile: true,
      description: 'Bandeja ordenada por urgencia de SLA con vistas rápidas (mis tickets, sin asignar, urgentes, SLA en riesgo, esperando cliente, resueltos), filtros y paginación. El agente ve los tickets de su grupo.',
      actions: ['Cambiar entre vistas con su contador', 'Filtrar por grupo y prioridad o buscar', 'Ver el tiempo restante del SLA de cada ticket', 'Crear un ticket a nombre de un cliente', 'Exportar a CSV']
    },
    {
      id: 'bandeja-masiva', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Acciones masivas', url: 'agente.html#/?vista=abiertos', waitFor: '.inbox-table',
      setup: async h => { await h.click('[data-sel] >> nth=0'); await h.click('[data-sel] >> nth=1'); await h.wait('[data-bulk]'); },
      description: 'Al seleccionar varios tickets aparece la barra de acciones para trabajarlos juntos.',
      actions: ['Asignarse los tickets seleccionados', 'Cambiar el estado de todos', 'Fusionar tickets duplicados', 'Limpiar la selección']
    },
    {
      id: 'ticket-nuevo', section: 'agente', login: U.agente, roles: CONSOLA, kind: 'modal', from: 'Botón "Nuevo ticket" de la bandeja', title: 'Nuevo ticket', url: 'agente.html#/', waitFor: '.inbox-table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Alta de un ticket recibido por teléfono u otro canal, a nombre de un cliente existente.',
      actions: ['Elegir el cliente', 'Escribir asunto y detalle', 'Definir canal, prioridad y grupo', 'Crear el ticket con su SLA']
    },
    {
      id: 'ticket', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Detalle del ticket', url: TICKET, waitFor: '[data-composer]',
      description: 'Conversación completa con el cliente, editor de respuesta, propiedades del ticket, temporizadores de SLA y la ficha del cliente con su historial.',
      actions: ['Responder al cliente con adjuntos', 'Aplicar una macro con respuesta y acciones', 'Cambiar estado, prioridad, grupo y responsable', 'Agregar o quitar etiquetas', 'Ver el SLA de primera respuesta y resolución']
    },
    {
      id: 'ticket-nota', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Nota interna', url: TICKET, waitFor: '[data-composer]',
      setup: async h => { await h.click('[data-mode="internal"]'); await h.fill('[data-composer] [data-body]', 'Revisar con terreno si hay corte en la zona antes de responder.'); },
      description: 'El mismo editor en modo nota interna: el texto queda en el ticket solo para el equipo y no se envía al cliente.',
      actions: ['Dejar contexto para otros agentes', 'Diferenciar visualmente notas y respuestas', 'Mantener el historial interno del caso']
    },
    {
      id: 'ticket-fusionar', section: 'agente', login: U.agente, roles: CONSOLA, kind: 'modal', from: 'Botón "Fusionar" en el detalle del ticket', title: 'Fusionar tickets', url: TICKET, waitFor: '[data-composer]',
      setup: async h => { await h.click('[data-merge]'); await h.modal(); },
      description: 'Une un ticket duplicado con otro del mismo cliente: la conversación se traslada y el duplicado queda cerrado.',
      actions: ['Indicar el número del ticket destino', 'Mover los mensajes al ticket principal', 'Cerrar el duplicado con referencia']
    },
    {
      id: 'chats', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Chats en vivo', url: 'agente.html#/chats', waitFor: '[data-queue]',
      setup: async h => { await h.click('[data-take]'); await h.wait('[data-msgs]'); },
      description: 'Cola de chats que derivó el asistente del sitio. El agente toma uno y conversa en tiempo real con el visitante, que está en otra pestaña.',
      actions: ['Ver los chats en espera y su tiempo', 'Atender un chat', 'Responder con textos rápidos', 'Cerrar el chat', 'Convertir la conversación en ticket']
    },
    {
      id: 'clientes', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Clientes', url: 'agente.html#/clientes', waitFor: '.admin-content table',
      description: 'Listado de clientes con plan, comuna, tickets abiertos y satisfacción.',
      actions: ['Buscar clientes', 'Ver tickets abiertos y CSAT de cada uno', 'Abrir la ficha del cliente', 'Exportar a CSV']
    },
    {
      id: 'cliente-ficha', section: 'agente', login: U.agente, roles: CONSOLA, title: 'Ficha del cliente', url: 'agente.html#/clientes/u-cli', waitFor: '.admin-content table',
      description: 'Historial de un cliente: datos del servicio, todos sus tickets, sus chats y los comentarios que dejó al calificar.',
      actions: ['Ver datos de contacto y plan', 'Revisar todos sus tickets', 'Leer sus chats anteriores', 'Ver los comentarios de CSAT', 'Crear un ticket a su nombre']
    },

    // ================= Supervisor =================
    {
      id: 'metricas', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Métricas de soporte', url: 'admin.html#/', waitFor: '.admin-content h1', mobile: true,
      description: 'Indicadores de la mesa: volumen semanal, primera respuesta mediana, CSAT mensual, cumplimiento de SLA, tickets por canal y categoría, y desempeño por agente.',
      actions: ['Seguir volumen y tiempos de respuesta', 'Ver CSAT y cumplimiento de SLA por mes', 'Comparar canales y categorías', 'Revisar el desempeño de cada agente', 'Exportar los datos']
    },
    {
      id: 'bandeja-supervisor', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Bandeja de toda la mesa', url: 'agente.html#/?vista=sla', waitFor: '.inbox-table',
      description: 'La supervisión ve los tickets de todos los grupos; aquí, la vista de tickets con SLA en riesgo o vencido.',
      actions: ['Detectar tickets por vencer en cualquier grupo', 'Reasignar a otro agente o grupo', 'Filtrar por grupo y prioridad']
    },
    {
      id: 'articulos', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Artículos', url: 'admin.html#/articulos', waitFor: '.admin-content table',
      description: 'Base de conocimiento con estado (publicado o borrador), tema, vistas y votos de utilidad.',
      actions: ['Filtrar por tema y estado', 'Ver vistas y porcentaje de utilidad', 'Crear o editar artículos', 'Exportar a CSV']
    },
    {
      id: 'articulo-editor', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Editor de artículo', url: 'admin.html#/articulos/a-lento', waitFor: '.admin-content h1',
      description: 'Editor con barra de formato y vista previa en vivo. Al publicar, el artículo aparece al instante en el centro de ayuda.',
      actions: ['Escribir con formato (títulos, listas, negritas)', 'Ver la vista previa mientras escribe', 'Elegir tema y etiquetas', 'Guardar como borrador o publicar']
    },
    {
      id: 'categorias', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Categorías', url: 'admin.html#/categorias', waitFor: '.admin-content h1',
      description: 'Temas de la base de conocimiento con su ícono, descripción, orden y cantidad de artículos.',
      actions: ['Crear y editar categorías', 'Definir el orden en la portada', 'Elegir el ícono y la descripción']
    },
    {
      id: 'macros', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Macros', url: 'admin.html#/macros', waitFor: '[data-new]',
      description: 'Respuestas predefinidas que además cambian estado, prioridad o etiquetas del ticket al aplicarlas.',
      actions: ['Ver las macros y cuántas veces se usaron', 'Crear y editar macros', 'Definir las acciones que ejecuta cada una']
    },
    {
      id: 'macro-editar', section: 'supervisor', login: U.supervisor, roles: SUP, kind: 'modal', from: 'Botón "Nueva macro"', title: 'Nueva macro', url: 'admin.html#/macros', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de macro con el texto de respuesta (con variables) y las acciones automáticas.',
      actions: ['Escribir el nombre y el texto de respuesta', 'Usar variables como el nombre del cliente', 'Definir estado, prioridad y etiqueta a aplicar']
    },
    {
      id: 'incidentes', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Incidentes y estado', url: 'admin.html#/incidentes', waitFor: '[data-upd]',
      description: 'Gestión de las fallas masivas que se publican en la página de estado: incidente activo con su bitácora y el historial.',
      actions: ['Declarar un incidente nuevo', 'Publicar actualizaciones del avance', 'Marcar un incidente como resuelto', 'Ver el historial de incidentes']
    },
    {
      id: 'incidente-actualizar', section: 'supervisor', login: U.supervisor, roles: SUP, kind: 'modal', from: 'Botón "Publicar actualización" de un incidente', title: 'Actualización de incidente', url: 'admin.html#/incidentes', waitFor: '[data-upd]',
      setup: async h => { await h.click('[data-upd]'); await h.modal(); },
      description: 'Nueva entrada en la bitácora pública del incidente, con cambio de etapa (investigando, identificado, monitoreando).',
      actions: ['Cambiar la etapa del incidente', 'Escribir el mensaje para los clientes', 'Publicarlo al instante en la página de estado']
    },
    {
      id: 'incidente-declarar', section: 'supervisor', login: U.supervisor, roles: SUP, kind: 'modal', from: 'Botón "Declarar incidente"', title: 'Declarar incidente', url: 'admin.html#/incidentes', waitFor: '[data-upd]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Alta de una falla masiva con título, servicios afectados, impacto y primer mensaje.',
      actions: ['Escribir el título del incidente', 'Marcar los servicios afectados', 'Definir el impacto', 'Publicar el primer aviso']
    },
    {
      id: 'grupos', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Grupos', url: 'admin.html#/grupos', waitFor: '[data-new]',
      description: 'Equipos de agentes (Soporte N1, Facturación, Terreno) con integrantes y carga actual de tickets.',
      actions: ['Ver integrantes y tickets abiertos por grupo', 'Crear y editar grupos', 'Cambiar quién pertenece a cada grupo']
    },
    {
      id: 'bitacora', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content h1',
      // La semilla parte con la bitácora vacía: se generan algunas acciones reales antes de capturar.
      setup: async h => {
        await h.goto('index.html#/contacto', '[data-contact]');
        await h.fill('[data-contact] [name="name"]', 'Martín Soto Araya'); await h.fill('[data-contact] [name="email"]', 'martin.soto@correo.cl');
        await h.fill('[data-contact] [name="subject"]', 'Router se reinicia solo'); await h.fill('[data-contact] [name="body"]', 'Se reinicia cada media hora.');
        await h.click('[data-contact] [type="submit"]'); await h.wait('[data-again]');
        await h.goto('agente.html#/ticket/t8', '[data-composer]');
        await h.fill('[data-composer] [data-body]', 'Hola Natalia, ya revisamos la línea y quedó normalizada.'); await h.click('[data-send]', { after: 500 });
        await h.goto('admin.html#/bitacora', '.admin-content table');
      },
      description: 'Registro de actividad del sistema: tickets, respuestas, chats, artículos e incidentes, filtrable y exportable.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por usuario y tipo', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'sla', section: 'admin', login: U.admin, title: 'Políticas SLA', url: 'admin.html#/sla', waitFor: '[data-save]',
      description: 'Objetivos de primera respuesta y de resolución para cada prioridad, que alimentan los temporizadores y alertas de la consola.',
      actions: ['Definir tiempos por prioridad (urgente, alta, normal, baja)', 'Ajustar primera respuesta y resolución', 'Guardar y aplicar a los tickets']
    },
    {
      id: 'automatizaciones', section: 'admin', login: U.admin, title: 'Automatizaciones', url: 'admin.html#/automatizaciones', waitFor: '[data-new]',
      description: 'Reglas que se aplican al crear un ticket: si se cumple una condición (canal, texto, categoría), se ejecuta una acción (grupo, prioridad, etiqueta).',
      actions: ['Ver las reglas activas y cuántas veces se aplicaron', 'Crear y editar reglas', 'Activar o pausar cada regla']
    },
    {
      id: 'automatizacion-editar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nueva regla"', title: 'Nueva regla', url: 'admin.html#/automatizaciones', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de regla con su condición y su acción.',
      actions: ['Elegir el campo y el valor de la condición', 'Elegir la acción a ejecutar', 'Activar la regla']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Personal de soporte (administración, supervisión, agentes) y cuentas de clientes, con su rol, grupos y estado.',
      actions: ['Crear y editar usuarios', 'Cambiar el rol y los grupos', 'Activar o desactivar cuentas', 'Exportar a CSV']
    },
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Centro de ayuda (CMS)', url: 'admin.html#/ajustes', waitFor: '[data-save]',
      description: 'Textos de la portada del centro de ayuda, aviso superior, datos de contacto y configuración del chat y su asistente.',
      actions: ['Editar título y bajada de la portada', 'Activar un aviso superior', 'Cambiar teléfono, correo y horario', 'Activar el chat y editar el saludo del asistente', 'Publicar los cambios al instante']
    },
    {
      id: 'datos', section: 'admin', login: U.admin, title: 'Datos y respaldo', url: 'admin.html#/datos', waitFor: '[data-reset]',
      description: 'Volumen de registros por colección, exportación a CSV o JSON y restablecimiento de los datos de demostración.',
      actions: ['Ver cuántos registros hay por colección', 'Exportar colecciones a CSV', 'Descargar un respaldo JSON', 'Restablecer los datos demo']
    }
  ]
};
