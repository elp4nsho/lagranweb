// Biblioteca de vistas de Pulso CRM (/crm): sitio público, espacio de trabajo comercial y administración.
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', gerente: 'u-ger', ejecutiva: 'u-val' };
const TODOS = ['Ejecutivo', 'Gerente', 'Administrador'];
const ADMIN_GER = ['Gerente', 'Administrador'];
const DEAL = 'app.html#/negocios/d6';

module.exports = {
  dir: 'crm',
  name: 'Pulso CRM',
  kind: 'CRM B2B',
  theme: 'flatui',
  description: 'CRM para equipos comerciales B2B con sitio público que captura leads, espacio de trabajo con pipeline, ficha de negocio, cotizador, correo y secuencias, reportes y metas, y una administración con usuarios, permisos, automatizaciones y CMS.',
  accounts: {
    'u-admin': { name: 'Camila Herrera', role: 'Administrador', email: 'admin@pulsocrm.cl', password: 'demo123' },
    'u-ger': { name: 'Rodrigo Fuentes', role: 'Gerente', email: 'gerente@pulsocrm.cl', password: 'demo123' },
    'u-val': { name: 'Valentina Rojas', role: 'Ejecutivo', email: 'ejecutiva@pulsocrm.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Página de producto que ve cualquier visitante y que alimenta el CRM con leads.' },
    { id: 'ejecutivo', label: 'Ejecutivo comercial', desc: 'Espacio de trabajo diario: leads, negocios, cuentas, agenda, correo y cotizaciones (solo su cartera).' },
    { id: 'gerente', label: 'Gerente comercial', desc: 'Vista de todo el equipo, reportes, metas y la parte de administración que le corresponde.' },
    { id: 'admin', label: 'Administrador', desc: 'Usuarios, roles y permisos, sitio web, configuración y datos del sistema.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Flat UI" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'aurora', group: 'Estilo', label: 'Aurora', desc: 'Degradados suaves y luminosos.', theme: 'aurora' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'bauhaus', group: 'Estilo', label: 'Bauhaus', desc: 'Geometría y colores primarios.', theme: 'bauhaus' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html', waitFor: '.site-hero', mobile: true,
      description: 'Página de producto con la propuesta de valor, prueba social y llamados a solicitar una demo. Todos los textos se editan desde el CMS de la administración y se actualizan en vivo.',
      actions: ['Ir a funciones, precios, clientes o preguntas', 'Solicitar una demo', 'Ver logos de clientes y cifras de uso', 'Iniciar sesión en el CRM']
    },
    {
      id: 'funciones', section: 'publico', title: 'Funciones y cómo funciona', url: 'index.html', waitFor: '#funciones',
      setup: async h => { await h.scrollTo('#funciones', 'start', -10); },
      description: 'Bloque de características del producto y el recorrido en tres pasos: capturar, avanzar y cerrar.',
      actions: ['Recorrer las características principales', 'Entender el flujo de captura, avance y cierre', 'Seguir hacia los planes']
    },
    {
      id: 'precios', section: 'publico', title: 'Planes y precios', url: 'index.html', waitFor: '#precios',
      setup: async h => { await h.scrollTo('#precios', 'start', -10); await h.click('[data-billing="a"]'); },
      description: 'Tres planes por usuario al mes en pesos chilenos, con selector mensual/anual que aplica el descuento anual configurado en el CMS.',
      actions: ['Comparar los planes Inicial, Crecimiento y Enterprise', 'Cambiar entre precio mensual y anual', 'Elegir un plan y saltar al formulario de demo con ese plan']
    },
    {
      id: 'clientes', section: 'publico', title: 'Testimonios y guía descargable', url: 'index.html', waitFor: '#clientes',
      setup: async h => { await h.scrollTo('#clientes', 'start', -10); },
      description: 'Testimonios de equipos que usan el producto y un formulario para descargar una guía, que también crea un lead en el CRM.',
      actions: ['Leer testimonios de clientes', 'Pedir la guía "10 claves para ordenar tu pipeline B2B"', 'Quedar registrado como lead de formulario web']
    },
    {
      id: 'demo', section: 'publico', title: 'Formulario de demo', url: 'index.html', waitFor: '#demo',
      setup: async h => { await h.scrollTo('#demo', 'start', -10); },
      description: 'Formulario web-to-lead para agendar una demo: el lead entra al CRM con puntaje automático y pasa por las automatizaciones (asignación, tarea y correo de bienvenida).',
      actions: ['Dejar nombre, correo, empresa y teléfono', 'Indicar tamaño de la empresa y plan de interés', 'Escribir un mensaje', 'Aceptar el tratamiento de datos y enviar']
    },
    {
      id: 'demo-enviada', section: 'publico', title: 'Demo solicitada', url: 'index.html', waitFor: '#demo',
      setup: async h => {
        await h.scrollTo('#demo', 'start', -10);
        await h.fill('#d-name', 'Martín Soto Araya'); await h.fill('#d-email', 'martin.soto@logisticasur.cl'); await h.fill('#d-company', 'Logística Sur SpA');
        await h.fill('#d-phone', '+56 9 6543 2109'); await h.fill('#d-msg', 'Somos 12 vendedores y hoy trabajamos con planillas.');
        await h.check('[data-demo] [name="consent"]'); await h.click('[data-demo] [type="submit"]'); await h.wait('.demo-ok'); await h.scrollTo('.demo-ok', 'center');
      },
      description: 'Confirmación de la solicitud con el ejecutivo asignado por round-robin y una nota "detrás de escena" que muestra el puntaje del lead y las automatizaciones que se ejecutaron.',
      actions: ['Ver qué ejecutivo lo contactará', 'Ver el puntaje con que entró el lead', 'Ver las automatizaciones disparadas', 'Saltar al CRM para ver el lead creado']
    },
    {
      id: 'faq', section: 'publico', title: 'Preguntas frecuentes', url: 'index.html', waitFor: '#faq',
      setup: async h => { await h.scrollTo('#faq', 'start', -10); },
      description: 'Preguntas frecuentes desplegables y el pie del sitio con datos de contacto, administrables desde el CMS.',
      actions: ['Abrir y cerrar cada pregunta', 'Ver los datos de contacto', 'Volver arriba o solicitar demo']
    },
    {
      id: 'login', section: 'publico', title: 'Inicio de sesión', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso al CRM con correo y contraseña, más cuentas de prueba para entrar con un clic como administradora, gerente o ejecutiva.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic a cada rol de prueba', 'Volver a la página que pidió el ingreso']
    },

    // ================= Ejecutivo =================
    {
      id: 'inicio', section: 'ejecutivo', login: U.ejecutiva, title: 'Inicio de la ejecutiva', url: 'app.html#/', waitFor: '.admin-content h1', mobile: true,
      description: 'Tablero personal con KPIs del pipeline propio, ingresos ganados por mes, actividades de hoy, pipeline por etapa, forecast, avance de la meta del mes, leads por fuente y negocios por cerrar.',
      actions: ['Ver pipeline abierto, ponderado y tasa de cierre', 'Revisar y completar las actividades de hoy', 'Seguir el avance de su meta mensual', 'Ver los negocios que cierran en 30 días', 'Crear un negocio o agendar una actividad']
    },
    {
      id: 'busqueda', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Buscador de la barra superior', title: 'Búsqueda global', url: 'app.html#/', waitFor: '.admin-content h1',
      setup: async h => { await h.fill('[data-gsearch]', 'Altamira'); await h.wait('[data-gresults]:not([hidden])'); },
      keepFocus: true,
      description: 'Buscador de la barra superior que encuentra negocios, empresas, contactos y leads mientras se escribe, respetando la cartera visible para cada rol.',
      actions: ['Buscar por nombre de negocio, empresa o persona', 'Ver resultados agrupados por tipo', 'Saltar directo a la ficha']
    },
    {
      id: 'notificaciones', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Campana de la barra superior', title: 'Notificaciones', url: 'app.html#/', waitFor: '.admin-content h1',
      setup: async h => { await h.click('[data-bell]'); await h.wait('[data-notifs]:not([hidden])'); },
      description: 'Avisos del sistema: leads asignados, tareas por vencer, negocios ganados y resultados de automatizaciones.',
      actions: ['Ver las notificaciones recientes', 'Abrir el registro relacionado', 'Marcar todas como leídas']
    },
    {
      id: 'leads', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Leads', url: 'app.html#/leads', waitFor: '.admin-content table',
      description: 'Listado de leads con puntaje automático, fuente, estado y responsable. La ejecutiva ve los suyos y los sin asignar; gerencia ve los de todo el equipo.',
      actions: ['Filtrar por estado (nuevos, contactados, calificados…)', 'Ordenar por puntaje o fecha', 'Crear un lead a mano', 'Convertir un lead en negocio', 'Exportar a CSV']
    },
    {
      id: 'lead-ficha', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Ficha del lead', url: 'app.html#/leads/l13', waitFor: '[data-log]',
      description: 'Ficha del lead con su estado, actividad registrada, desglose del puntaje y datos de la empresa.',
      actions: ['Cambiar el estado del lead', 'Registrar llamadas, correos o notas', 'Ver de dónde sale el puntaje', 'Editar los datos', 'Convertir en negocio']
    },
    {
      id: 'lead-actividad', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Registrar" en la ficha del lead', title: 'Registrar actividad del lead', url: 'app.html#/leads/l13', waitFor: '[data-log]',
      setup: async h => { await h.click('[data-log]'); await h.modal(); },
      description: 'Ventana para dejar registro de un contacto con el lead; cada actividad suma al puntaje.',
      actions: ['Elegir el tipo de actividad', 'Escribir el detalle', 'Actualizar el puntaje del lead']
    },
    {
      id: 'lead-convertir', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Convertir en negocio" en la ficha del lead', title: 'Convertir lead en negocio', url: 'app.html#/leads/l13', waitFor: '[data-log]',
      setup: async h => { await h.click('.page-head [data-convert]'); await h.modal(); },
      description: 'Conversión del lead: crea (o reutiliza) la empresa y el contacto y abre un negocio en el pipeline con monto y fecha de cierre.',
      actions: ['Confirmar la empresa y el contacto', 'Definir nombre, monto y cierre estimado del negocio', 'Crear el negocio en la etapa inicial']
    },
    {
      id: 'negocios', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Pipeline de negocios', url: 'app.html#/negocios', waitFor: '.kanban .kcard', mobile: true,
      description: 'Tablero kanban por etapa con monto total y ponderado por columna. Al arrastrar una tarjeta se registra el cambio de etapa y se ejecutan las automatizaciones.',
      actions: ['Arrastrar negocios entre etapas', 'Ver total y valor ponderado por etapa', 'Filtrar por nombre o empresa', 'Elegir cuántos días de cerrados mostrar', 'Cambiar a vista de lista']
    },
    {
      id: 'negocios-lista', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Negocios en lista', url: 'app.html#/negocios?vista=lista', waitFor: '.admin-content table',
      description: 'Los mismos negocios en una tabla filtrable por etapa, con monto, cierre estimado y responsable.',
      actions: ['Filtrar por etapa con chips', 'Ordenar por monto o fecha de cierre', 'Abrir la ficha de cada negocio']
    },
    {
      id: 'negocio-nuevo', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Nuevo negocio"', title: 'Nuevo negocio', url: 'app.html#/negocios', waitFor: '.kanban .kcard',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de alta de negocio con empresa, contacto, monto, etapa, cierre estimado, origen y responsable.',
      actions: ['Elegir empresa y contacto principal', 'Indicar monto y etapa', 'Definir la fecha de cierre estimada', 'Indicar el origen del negocio']
    },
    {
      id: 'negocio', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Ficha del negocio', url: DEAL, waitFor: '[data-composer]',
      description: 'Centro de trabajo de cada negocio: barra de etapas, línea de tiempo con notas, llamadas, reuniones y correos, datos del contacto e historial de etapas.',
      actions: ['Avanzar de etapa con un clic o marcar ganado / perdido', 'Registrar notas, llamadas y reuniones', 'Ver la línea de tiempo completa', 'Revisar contacto principal e historial de etapas', 'Editar o eliminar el negocio']
    },
    {
      id: 'negocio-tareas', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Negocio: tareas', url: DEAL + '?tab=tareas', waitFor: '.tabs',
      description: 'Pestaña de próximos pasos del negocio, con atajos para las tareas más comunes.',
      actions: ['Crear una tarea con fecha y recordatorio', 'Usar atajos como "Enviar propuesta" o "Agendar demo"', 'Marcar tareas como hechas']
    },
    {
      id: 'negocio-correo', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Negocio: correos', url: DEAL + '?tab=correo', waitFor: '[data-mail]',
      description: 'Redacción de correos al cliente desde el negocio, con plantillas y variables. El envío es simulado y queda en la línea de tiempo con su estado de apertura.',
      actions: ['Elegir destinatario entre los contactos de la empresa', 'Aplicar una plantilla con variables', 'Enviar el correo', 'Ver los enviados y si se abrieron']
    },
    {
      id: 'negocio-cotizacion', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Negocio: cotizador', url: DEAL + '?tab=cotizacion', waitFor: '.quote-table',
      description: 'Cotizador con productos del catálogo, cantidades, precios y descuentos por línea, con neto, IVA y total. Al guardar se actualiza el monto del negocio.',
      actions: ['Agregar y quitar productos', 'Ajustar cantidad, precio y descuento', 'Guardar el monto en el negocio', 'Generar una cotización numerada', 'Cambiar el estado de las cotizaciones emitidas']
    },
    {
      id: 'negocio-archivos', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Negocio: archivos', url: DEAL + '?tab=archivos', waitFor: '[data-dz]',
      description: 'Archivos adjuntos al negocio (propuestas, requerimientos, órdenes de compra) con zona para arrastrar nuevos.',
      actions: ['Subir archivos arrastrándolos', 'Ver nombre, tamaño y quién lo subió', 'Eliminar adjuntos']
    },
    {
      id: 'negocio-perdido', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Perdido" en la ficha del negocio', title: 'Marcar negocio como perdido', url: DEAL, waitFor: '[data-composer]',
      setup: async h => { await h.click('[data-lose]'); await h.modal(); },
      description: 'Cierre de un negocio perdido con su motivo, que alimenta el reporte de motivos de pérdida.',
      actions: ['Elegir el motivo de pérdida de una lista', 'Cerrar el negocio y registrarlo en el historial', 'Sumar el caso al reporte de motivos de pérdida']
    },
    {
      id: 'cotizacion', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Cotización imprimible', url: 'quote.html?id=q3', waitFor: '.q-table',
      description: 'Documento de cotización con aspecto de PDF: datos del cliente, contacto y ejecutivo, detalle de productos, neto, IVA, total y condiciones.',
      actions: ['Revisar el detalle y los totales', 'Imprimir o guardar como PDF', 'Enviarla por correo al contacto (simulado)', 'Ver la vigencia y el estado de la cotización']
    },
    {
      id: 'empresas', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Empresas', url: 'app.html#/empresas', waitFor: '.admin-content table',
      description: 'Cuentas cliente con industria, tamaño, ciudad, responsable y pipeline abierto.',
      actions: ['Buscar y filtrar por industria, tamaño o ciudad', 'Crear y editar empresas', 'Abrir la ficha de la cuenta', 'Exportar a CSV']
    },
    {
      id: 'empresa-ficha', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Ficha de empresa', url: 'app.html#/empresas/c6', waitFor: '[data-addc]',
      description: 'Vista de la cuenta con sus datos, contactos, negocios (abiertos y cerrados) y actividad reciente.',
      actions: ['Ver datos de la empresa', 'Agregar contactos', 'Crear un negocio para la cuenta', 'Revisar la actividad reciente']
    },
    {
      id: 'contactos', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Contactos', url: 'app.html#/contactos', waitFor: '.admin-content table',
      description: 'Personas de las empresas cliente con cargo, etiquetas y secuencias activas.',
      actions: ['Buscar y filtrar por etiqueta o empresa', 'Crear y editar contactos', 'Abrir la ficha con su historial', 'Exportar a CSV']
    },
    {
      id: 'contacto-ficha', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Ficha de contacto', url: 'app.html#/contactos/ct10', waitFor: '[data-act]',
      description: 'Ficha de la persona con datos de contacto, negocios en los que participa, secuencias y su historial de actividades.',
      actions: ['Ver datos y etiquetas', 'Agendar una actividad', 'Inscribirlo en una secuencia de correo', 'Ver sus negocios y su historial']
    },
    {
      id: 'calendario', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Calendario', url: 'app.html#/calendario', waitFor: '.admin-content h1',
      description: 'Semana de llamadas, reuniones y tareas en un calendario por horas. En el celular se muestra como agenda.',
      actions: ['Moverse entre semanas', 'Ver cada actividad por tipo y hora', 'Crear una actividad nueva', 'Abrir una actividad para editarla o completarla']
    },
    {
      id: 'actividad-nueva', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Nueva actividad" del calendario', title: 'Nueva actividad', url: 'app.html#/calendario', waitFor: '.admin-content h1',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de actividad (llamada, reunión o tarea) vinculada a un negocio, con fecha, hora y recordatorio.',
      actions: ['Elegir el tipo de actividad', 'Vincularla a un negocio', 'Definir fecha, hora y responsable', 'Activar un recordatorio']
    },
    {
      id: 'tareas', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Tareas', url: 'app.html#/tareas', waitFor: '.admin-content h1',
      description: 'Pendientes agrupados por vencimiento: vencidas, hoy, esta semana y más adelante.',
      actions: ['Ver primero lo vencido', 'Marcar tareas como hechas', 'Crear tareas nuevas', 'Exportar a CSV']
    },
    {
      id: 'correo-plantillas', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Plantillas de correo', url: 'app.html#/correo/plantillas', waitFor: '[data-preview]',
      description: 'Biblioteca de plantillas con variables como nombre, empresa o ejecutivo, usadas en los correos y las secuencias.',
      actions: ['Ver cada plantilla con su asunto', 'Abrir una vista previa con datos reales', 'Crear y editar plantillas (con permiso)']
    },
    {
      id: 'plantilla-preview', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Vista previa" de una plantilla', title: 'Vista previa de plantilla', url: 'app.html#/correo/plantillas', waitFor: '[data-preview]',
      setup: async h => { await h.click('[data-preview]'); await h.modal(); },
      description: 'La plantilla con sus variables reemplazadas por los datos de un contacto real.',
      actions: ['Revisar el asunto y el cuerpo final', 'Comprobar que las variables se completan bien', 'Volver a la biblioteca para usarla en un correo o secuencia']
    },
    {
      id: 'correo-secuencias', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Secuencias de correo', url: 'app.html#/correo/secuencias', waitFor: '[data-run]',
      description: 'Cadencias de seguimiento con sus pasos y días de espera, contactos inscritos y envíos pendientes (envío simulado).',
      actions: ['Ver los pasos de cada secuencia', 'Inscribir contactos', 'Procesar los envíos del día', 'Activar o pausar una secuencia (con permiso)']
    },
    {
      id: 'secuencia-inscribir', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, kind: 'modal', from: 'Botón "Inscribir contactos" en Secuencias', title: 'Inscribir en secuencia', url: 'app.html#/correo/secuencias', waitFor: '[data-run]',
      setup: async h => { await h.click('[data-enroll]'); await h.modal(); },
      description: 'Selección de contactos para sumarlos a una secuencia de seguimiento.',
      actions: ['Buscar y marcar contactos', 'Ver quiénes ya están inscritos', 'Inscribir a los seleccionados']
    },
    {
      id: 'correo-enviados', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Correos enviados', url: 'app.html#/correo/enviados', waitFor: '.admin-content table',
      description: 'Bandeja de correos enviados desde negocios y secuencias, con su estado de apertura.',
      actions: ['Ver destinatario, asunto y fecha', 'Saber si el correo se abrió', 'Abrir el correo o ir al negocio']
    },
    {
      id: 'productos', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Productos', url: 'app.html#/productos', waitFor: '.admin-content table',
      description: 'Catálogo de licencias y servicios con precio y unidad, usado por el cotizador.',
      actions: ['Ver precios y unidades', 'Buscar productos', 'Crear y editar productos (con permiso)', 'Exportar a CSV']
    },
    {
      id: 'importar', section: 'ejecutivo', login: U.ejecutiva, roles: TODOS, title: 'Importar contactos', url: 'app.html#/importar', waitFor: '[data-sample]',
      setup: async h => { await h.click('[data-sample]'); await h.click('[data-preview]'); await h.wait('[data-run]'); },
      description: 'Importador de contactos desde un CSV pegado o subido, con detección de columnas, validación de correos y control de duplicados antes de importar.',
      actions: ['Pegar o subir un CSV', 'Revisar las columnas reconocidas', 'Ver filas listas, con error y duplicadas', 'Crear empresas que no existan', 'Importar en un paso']
    },

    // ================= Gerente =================
    {
      id: 'inicio-gerente', section: 'gerente', login: U.gerente, title: 'Inicio del gerente', url: 'app.html#/', waitFor: '.admin-content h1',
      description: 'El mismo tablero de inicio pero con los números de todo el equipo y el ganado por ejecutivo de los últimos 90 días.',
      actions: ['Ver el pipeline de todo el equipo', 'Comparar lo ganado por ejecutivo', 'Revisar forecast y negocios por cerrar', 'Ver leads por fuente']
    },
    {
      id: 'reportes', section: 'gerente', login: U.gerente, roles: TODOS, title: 'Reportes', url: 'app.html#/reportes', waitFor: '.admin-content h1',
      description: 'Análisis comercial: embudo de conversión, motivos de pérdida, ingresos y negocios creados por mes, ranking de ejecutivos y conversión por fuente de leads.',
      actions: ['Ver el embudo de conversión por etapa', 'Analizar los motivos de pérdida', 'Seguir ingresos y negocios por mes', 'Ver el ranking del equipo y exportarlo']
    },
    {
      id: 'metas', section: 'gerente', login: U.gerente, roles: TODOS, title: 'Metas', url: 'app.html#/metas', waitFor: '.admin-content h1',
      description: 'Metas mensuales por ejecutivo con avance real y forecast del mes, más la comparación meta vs. ganado de los últimos 6 meses.',
      actions: ['Definir la meta de cada ejecutivo (con permiso)', 'Ver avance y forecast del mes', 'Comparar meta y ganado en 6 meses']
    },
    {
      id: 'admin-resumen', section: 'gerente', login: U.gerente, roles: ADMIN_GER, title: 'Resumen de administración', url: 'admin.html#/', waitFor: '.admin-content h1',
      description: 'Adopción del sistema: actividad por usuario, leads que llegan desde el sitio web y uso general.',
      actions: ['Ver cuánto usa el CRM cada persona', 'Revisar los leads del sitio web', 'Detectar usuarios inactivos']
    },
    {
      id: 'equipos', section: 'gerente', login: U.gerente, roles: ADMIN_GER, title: 'Equipos', url: 'admin.html#/equipos', waitFor: '.admin-content h1',
      description: 'Equipos comerciales con su líder, integrantes y desempeño.',
      actions: ['Crear y editar equipos', 'Asignar líder e integrantes', 'Comparar el desempeño entre equipos']
    },
    {
      id: 'automatizaciones', section: 'gerente', login: U.gerente, roles: ADMIN_GER, title: 'Automatizaciones', url: 'admin.html#/automatizaciones', waitFor: '[data-test]',
      description: 'Reglas "si pasa esto, entonces haz esto" sobre leads y negocios (asignar, crear tareas, enviar correos, notificar), con su registro de ejecuciones.',
      actions: ['Crear y editar reglas', 'Activar o pausar cada regla', 'Probar una regla en seco', 'Revisar las últimas ejecuciones']
    },
    {
      id: 'automatizacion-prueba', section: 'gerente', login: U.gerente, roles: ADMIN_GER, kind: 'modal', from: 'Botón "Probar" de una regla', title: 'Prueba en seco', url: 'admin.html#/automatizaciones', waitFor: '[data-test]',
      setup: async h => { await h.click('[data-test]'); await h.modal(); },
      description: 'Simulación de una regla sobre un registro real, mostrando qué acciones haría sin ejecutarlas.',
      actions: ['Ver si el registro cumple la condición', 'Ver las acciones que se ejecutarían', 'Probar sin modificar datos']
    },
    {
      id: 'bitacora', section: 'gerente', login: U.gerente, roles: ADMIN_GER, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content h1',
      // La semilla parte con la bitácora vacía: se generan algunas acciones reales antes de capturar.
      setup: async h => {
        await h.goto('index.html', '#demo');
        await h.fill('#d-name', 'Martín Soto Araya'); await h.fill('#d-email', 'martin.soto@logisticasur.cl'); await h.fill('#d-company', 'Logística Sur SpA');
        await h.check('[data-demo] [name="consent"]'); await h.click('[data-demo] [type="submit"]'); await h.wait('.demo-ok');
        await h.goto('app.html#/negocios/d6', '[data-composer]');
        await h.fill('[data-cbody]', 'Cliente pidió ajustar el alcance de la integración.'); await h.click('[data-csave]', { after: 400 });
        await h.click('.step[data-stage="negociacion"]', { after: 600 });
        await h.goto('admin.html#/bitacora', '.admin-content table');
      },
      description: 'Registro de actividad del sistema con filtros por usuario y tipo de evento.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por usuario y tipo', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas del equipo con rol, equipo, estado y fecha de alta.',
      actions: ['Crear y editar usuarios', 'Cambiar rol y equipo', 'Desactivar con traspaso de cartera', 'Exportar a CSV']
    },
    {
      id: 'usuario-desactivar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Desactivar" de un usuario', title: 'Desactivar usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-toggle="u-mat"]'); await h.modal(); },
      description: 'Desactivación de una cuenta que traspasa sus leads, negocios y tareas abiertas a otra persona del equipo.',
      actions: ['Elegir a quién traspasar la cartera', 'Ver cuántos registros se moverán', 'Desactivar el acceso']
    },
    {
      id: 'roles', section: 'admin', login: U.admin, title: 'Roles y permisos', url: 'admin.html#/roles', waitFor: '.perm-table',
      description: 'Matriz editable de permisos por rol (ventas, correo, análisis, datos, administración y sistema). El administrador conserva siempre todos.',
      actions: ['Activar o quitar permisos a gerente y ejecutivo', 'Ver qué controla cada permiso', 'Restaurar los valores por defecto']
    },
    {
      id: 'sitio', section: 'admin', login: U.admin, title: 'Sitio web (CMS)', url: 'admin.html#/sitio', waitFor: '.admin-content .tabs',
      description: 'Editor del sitio público por pestañas: portada, características, planes, testimonios, preguntas y contacto. Los cambios se ven al instante en la página.',
      actions: ['Editar textos y botones de la portada', 'Agregar o quitar características', 'Ajustar planes, precios y descuento anual', 'Editar testimonios y preguntas frecuentes', 'Cambiar datos de contacto']
    },
    {
      id: 'sitio-planes', section: 'admin', login: U.admin, title: 'CMS: planes', url: 'admin.html#/sitio/planes', waitFor: '.admin-content .tabs',
      description: 'Pestaña de planes del CMS con nombre, precio, nota, destacado y lista de características de cada plan.',
      actions: ['Cambiar precios y nombres de planes', 'Marcar el plan destacado', 'Editar las características incluidas', 'Definir el descuento anual']
    },
    {
      id: 'configuracion', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/configuracion', waitFor: '[data-save]',
      description: 'Parámetros del sistema: datos de la empresa, condiciones de las cotizaciones, probabilidad de cierre por etapa y pesos del scoring de leads.',
      actions: ['Editar datos de la empresa', 'Definir vigencia y notas de las cotizaciones', 'Ajustar la probabilidad de cada etapa', 'Ajustar los pesos del puntaje de leads']
    },
    {
      id: 'datos', section: 'admin', login: U.admin, title: 'Datos y respaldo', url: 'admin.html#/datos', waitFor: '[data-reset]',
      description: 'Volumen de registros por colección, exportación a CSV o JSON y restablecimiento de los datos de demostración.',
      actions: ['Ver cuántos registros hay por colección', 'Exportar colecciones a CSV', 'Descargar un respaldo JSON', 'Restablecer los datos demo']
    }
  ]
};
