// Biblioteca de vistas de Brújula Noticias (/blog).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', editora: 'u-editor', periodista: 'u-periodista', lector: 'u-lector', lectora: 'u-lectora' };
const firstRow = '.admin-content tbody tr >> nth=0';
const JEFE = ['Editor/a jefe', 'Administrador'];

// Abre el primer artículo premium de la franja "Para suscriptores" de la portada.
async function openPremium(h) {
  await h.click('.premium-strip a[href*="#/articulo/"]');
  await h.wait('#art-title');
  await h.page.evaluate(() => window.scrollTo(0, 0));
  return { url: h.here() };
}
// Abre en el CMS el primer artículo con el estado indicado.
async function openByStatus(h, status) {
  await h.select('[data-f="status"]', status);
  await h.click(firstRow + ' >> td >> nth=0');
  await h.wait('.editor-grid');
  return { url: h.here() };
}

module.exports = {
  dir: 'blog',
  name: 'Brújula Noticias',
  kind: 'Medio digital',
  theme: 'nordic',
  description: 'Diario digital con portada, secciones, buscador, comentarios, newsletter y muro de pago con suscripciones, más un CMS de redacción con flujo editorial, moderación, publicidad e ingresos.',
  accounts: {
    'u-admin': { name: 'Ana Torres', role: 'Administrador', email: 'admin@brujula.cl', password: 'admin123' },
    'u-editor': { name: 'Carolina Méndez', role: 'Editor/a jefe', email: 'editora@brujula.cl', password: 'editora123' },
    'u-periodista': { name: 'Rodrigo Saavedra', role: 'Periodista', email: 'periodista@brujula.cl', password: 'periodista123' },
    'u-lector': { name: 'Diego Fuentes', role: 'Lector/a (suscriptor)', email: 'lector@brujula.cl', password: 'lector123' },
    'u-lectora': { name: 'Fernanda Rojas', role: 'Lector/a (sin suscripción)', email: 'lectora@brujula.cl', password: 'lectora123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'lector', label: 'Lector/a', desc: 'Cuenta del lector: artículos guardados, comentarios, newsletter y suscripción.' },
    { id: 'periodista', label: 'Periodista', desc: 'CMS limitado a sus propios artículos: escribir borradores y enviarlos a revisión.' },
    { id: 'editora', label: 'Editor/a jefe', desc: 'Flujo editorial completo, secciones, autores, comentarios, newsletter y publicidad.' },
    { id: 'admin', label: 'Administrador', desc: 'Todo lo anterior más suscripciones e ingresos, usuarios, ajustes y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Nórdico" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.front-lead',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'vintage', group: 'Estilo', label: 'Vintage', desc: 'Papel envejecido y tipografía clásica.', theme: 'vintage' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.front-lead', mobile: true,
      description: 'Portada del diario con la nota principal, notas secundarias, "Lo último", bloques por sección, franja para suscriptores, más leídos, publicidad y newsletter. El ticker de último minuto se alimenta de las notas marcadas en el CMS.',
      actions: ['Leer la nota principal y las secundarias', 'Seguir "Lo último" con su hora de publicación', 'Entrar a cada sección desde su bloque', 'Ver los más leídos y las notas premium', 'Suscribirse al newsletter diario o semanal']
    },
    {
      id: 'seccion', section: 'publico', title: 'Sección', url: 'index.html#/seccion/economia', waitFor: '.sec-lead',
      description: 'Portada de una sección con su descripción, etiquetas frecuentes, nota principal y el resto de las notas paginadas.',
      actions: ['Leer las notas de la sección', 'Filtrar por una etiqueta frecuente', 'Cargar más notas', 'Ver los más leídos en la barra lateral']
    },
    {
      id: 'etiqueta', section: 'publico', title: 'Etiqueta', url: 'index.html#/tag/cobre', waitFor: '.list-head',
      description: 'Listado de todas las notas publicadas con una etiqueta, con su conteo.',
      actions: ['Ver todas las notas de un tema', 'Saber cuántas notas hay', 'Abrir cualquiera de ellas']
    },
    {
      id: 'autor', section: 'publico', title: 'Página de autor', url: 'index.html#/autor/rodrigo-saavedra', waitFor: '.author-head',
      description: 'Perfil de un periodista o columnista con su área, biografía y todas sus notas publicadas.',
      actions: ['Conocer el área y la biografía del autor', 'Ver todas sus notas', 'Seguirlo en redes']
    },
    {
      id: 'buscar', section: 'publico', title: 'Buscador', url: 'index.html#/buscar?q=cobre', waitFor: '.search-big',
      description: 'Buscador en titulares, bajadas, etiquetas y texto de las notas, con resultados ordenados por relevancia y filtro por sección.',
      actions: ['Buscar por palabras clave', 'Filtrar los resultados por sección', 'Abrir una nota desde los resultados']
    },
    {
      id: 'articulo', section: 'publico', title: 'Artículo', url: 'index.html#/', waitFor: '.front-lead',
      setup: async h => { await h.click('.front-lead h2 a, .front-lead h3 a'); await h.wait('#art-title'); await h.page.evaluate(() => window.scrollTo(0, 0)); return { url: h.here() }; },
      mobile: true,
      description: 'Página de lectura con titular, bajada, autor, tiempo de lectura, cuerpo con citas y destacados, caja del autor, comentarios y notas relacionadas.',
      actions: ['Leer la nota completa', 'Copiar el enlace o guardar la nota en su cuenta', 'Ver la caja del autor', 'Leer y dar "me gusta" a los comentarios', 'Seguir con notas relacionadas']
    },
    {
      id: 'articulo-muro', section: 'publico', title: 'Artículo premium (muro de pago)', url: 'index.html#/', waitFor: '.premium-strip',
      setup: async h => { const r = await openPremium(h); await h.scrollTo('.paywall', 'center'); return r; },
      description: 'Una nota premium vista sin suscripción: se muestra el comienzo y luego el muro con la invitación a suscribirse. El muro se activa o desactiva en los ajustes.',
      actions: ['Leer el inicio de la nota', 'Ver los planes de suscripción', 'Ingresar si ya es suscriptor']
    },
    {
      id: 'planes', section: 'publico', title: 'Planes de suscripción', url: 'index.html#/planes', waitFor: '[data-plan]',
      description: 'Página de planes digitales con precio, período y beneficios, más preguntas frecuentes. Los planes se editan en el CMS.',
      actions: ['Comparar los planes y sus beneficios', 'Elegir un plan y pagar (simulado)', 'Leer las preguntas frecuentes']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para lectores y redacción. Los lectores van a su cuenta y la redacción al CMS. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como lector, periodista, editora o administradora', 'Pasar a crear una cuenta gratis', 'Volver a la portada']
    },
    {
      id: 'registro', section: 'publico', title: 'Crear cuenta', url: 'login.html#registro', waitFor: '#register-form',
      description: 'Registro gratuito de lectores con la opción de quedar suscrito al newsletter diario.',
      actions: ['Crear una cuenta con nombre, correo y contraseña', 'Suscribirse al newsletter diario', 'Aceptar los términos y entrar a su cuenta']
    },
    {
      id: 'cuenta-sin-sesion', section: 'publico', title: 'Mi cuenta (sin sesión)', url: 'index.html#/cuenta', waitFor: '.empty.card',
      description: 'Lo que ve un visitante al abrir "Mi cuenta" sin haber ingresado.',
      actions: ['Ir a iniciar sesión', 'Crear una cuenta', 'Volver a la portada']
    },

    // ================= Lector =================
    {
      id: 'cuenta', section: 'lector', login: U.lector, title: 'Mi cuenta', url: 'index.html#/cuenta', waitFor: '[data-profile]', mobile: true,
      description: 'Cuenta del lector con su suscripción (plan, estado, renovación y pagos), newsletter, perfil, artículos guardados y sus comentarios.',
      actions: ['Ver el plan, la renovación y los pagos', 'Cambiar de plan o cancelar la suscripción', 'Activar o desactivar el newsletter', 'Editar su nombre', 'Revisar artículos guardados y sus comentarios']
    },
    {
      id: 'articulo-suscriptor', section: 'lector', login: U.lector, title: 'Artículo premium con suscripción', url: 'index.html#/', waitFor: '.premium-strip',
      setup: async h => openPremium(h),
      description: 'La misma nota premium vista por un suscriptor: se lee completa, sin muro, y puede guardarla o comentar.',
      actions: ['Leer el contenido premium completo', 'Guardar la nota en su cuenta', 'Comentar con su nombre']
    },
    {
      id: 'comentarios', section: 'lector', login: U.lector, title: 'Comentar una nota', url: 'index.html#/', waitFor: '.front-lead',
      setup: async h => { await h.click('.front-lead h2 a, .front-lead h3 a'); await h.wait('#art-title'); await h.scrollTo('.comments', 'start', -80); return { url: h.here() }; },
      description: 'Zona de comentarios de una nota con la sesión iniciada. Según el modo de moderación, el comentario se publica al instante o queda pendiente de aprobación.',
      actions: ['Escribir un comentario', 'Dar "me gusta" a otros comentarios', 'Ver si su comentario quedó pendiente de moderación']
    },
    {
      id: 'checkout', section: 'lector', login: U.lectora, kind: 'modal', from: 'Botón de un plan en la página de planes', title: 'Pago de la suscripción', url: 'index.html#/planes', waitFor: '[data-plan]',
      setup: async h => { await h.click('[data-plan] >> nth=1'); await h.modal(); },
      description: 'Pago simulado de un plan con tarjeta. Al pagar, la suscripción queda activa, se registra el pago y se desbloquean las notas premium.',
      actions: ['Revisar el plan y su renovación', 'Ingresar los datos de la tarjeta (simulados)', 'Aceptar los términos y pagar', 'Volver a la nota que quería leer']
    },

    // ================= Periodista =================
    {
      id: 'escritorio-periodista', section: 'periodista', login: U.periodista, title: 'Escritorio del periodista', url: 'admin.html#/', waitFor: '.admin-content .kpis',
      description: 'Resumen personal: lecturas totales, notas publicadas en 30 días, comentarios recibidos, sus notas más leídas, sus borradores y su estado.',
      actions: ['Ver el desempeño de sus notas', 'Revisar sus borradores', 'Ver sus notas por estado', 'Crear un artículo nuevo']
    },
    {
      id: 'articulos-periodista', section: 'periodista', login: U.periodista, title: 'Mis artículos', url: 'admin.html#/articulos', waitFor: '.admin-content table',
      description: 'Listado de las notas del periodista con estado, sección, fecha y lecturas. Puede ver toda la redacción en modo lectura.',
      actions: ['Filtrar por estado, sección o acceso', 'Cambiar a "Toda la redacción" en lectura', 'Abrir un borrador para seguir editando', 'Eliminar sus borradores']
    },
    {
      id: 'editor-periodista', section: 'periodista', login: U.periodista, title: 'Editor de borrador', url: 'admin.html#/articulos', waitFor: '.admin-content table',
      setup: async h => openByStatus(h, 'draft'),
      description: 'Editor por bloques de un borrador propio con vista previa en vivo. El periodista guarda y envía a revisión; no puede publicar.',
      actions: ['Escribir titular, bajada y bloques (párrafo, subtítulo, cita, lista, destacado, imagen)', 'Reordenar, duplicar o borrar bloques', 'Elegir sección, etiquetas y si es premium', 'Enviar a revisión de la edición', 'Ver el historial de cambios']
    },
    {
      id: 'periodista-restringido', section: 'periodista', login: U.periodista, title: 'Ruta protegida por rol', url: 'admin.html#/comentarios', waitFor: '.admin-content .empty',
      description: 'Lo que ve un periodista si intenta abrir una sección reservada a la edición (en este caso, la moderación de comentarios).',
      actions: ['Ver el aviso de acceso restringido', 'Volver a sus secciones desde el menú', 'Confirmar que cada rol solo ve sus menús']
    },

    // ================= Editor/a jefe =================
    {
      id: 'escritorio-editora', section: 'editora', login: U.editora, title: 'Escritorio de la edición', url: 'admin.html#/', waitFor: '.admin-content .kpis', mobile: true,
      description: 'Resumen del medio: páginas vistas, visitantes únicos, notas por revisar, comentarios por moderar, lecturas por sección, flujo editorial y programados.',
      actions: ['Ver páginas vistas diarias y lecturas por sección', 'Revisar lo que espera aprobación', 'Ver los artículos programados', 'Seguir la actividad reciente']
    },
    {
      id: 'articulos', section: 'editora', login: U.editora, roles: JEFE, title: 'Artículos', url: 'admin.html#/articulos', waitFor: '.admin-content table',
      description: 'Todas las notas de la redacción con conteo por estado (borrador, revisión, programado, publicado, archivado), sección, autor y lecturas.',
      actions: ['Filtrar por estado, sección, autor o acceso', 'Buscar por titular, etiqueta o autor', 'Ver la nota en el sitio', 'Abrir una nota para editarla', 'Exportar a CSV']
    },
    {
      id: 'editor-revision', section: 'editora', login: U.editora, roles: JEFE, title: 'Revisión de un artículo', url: 'admin.html#/articulos', waitFor: '.admin-content table',
      setup: async h => openByStatus(h, 'review'),
      description: 'Editor de una nota enviada a revisión. La edición puede corregirla, aprobarla y publicarla, programarla o devolverla con una nota.',
      actions: ['Corregir el texto y los bloques', 'Aprobar y publicar al instante', 'Programar la publicación', 'Devolver al periodista con una nota', 'Marcarla como último minuto o destacada en portada']
    },
    {
      id: 'editor-devolver', section: 'editora', login: U.editora, roles: JEFE, kind: 'modal', from: 'Botón "Devolver con nota" en una nota en revisión', title: 'Devolver a borrador', url: 'admin.html#/articulos', waitFor: '.admin-content table',
      setup: async h => { const r = await openByStatus(h, 'review'); await h.click('[data-do="return"]'); await h.modal(); return r; },
      description: 'Ventana para devolver una nota al periodista con una nota de edición, que verá arriba del editor.',
      actions: ['Escribir la nota para el periodista', 'Devolver la nota a borrador', 'Dejar el cambio en el historial']
    },
    {
      id: 'editor-nuevo', section: 'editora', login: U.editora, roles: JEFE, title: 'Nuevo artículo', url: 'admin.html#/articulos/nuevo', waitFor: '.editor-grid',
      description: 'Editor en blanco para una nota nueva, con la barra para agregar bloques y las opciones de publicación de la edición.',
      actions: ['Agregar bloques de contenido', 'Elegir sección, autor, etiquetas y URL', 'Escribir la descripción SEO', 'Publicar ahora o programar']
    },
    {
      id: 'secciones', section: 'editora', login: U.editora, roles: JEFE, title: 'Secciones', url: 'admin.html#/secciones', waitFor: '.admin-content table',
      description: 'Secciones del diario con su color, descripción, orden y cantidad de notas.',
      actions: ['Crear o editar una sección', 'Cambiar color, descripción y orden', 'Ver cuántas notas tiene cada una']
    },
    {
      id: 'seccion-modal', section: 'editora', login: U.editora, roles: JEFE, kind: 'modal', from: 'Botón "Nueva sección" o editar en Secciones', title: 'Editar sección', url: 'admin.html#/secciones', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> [data-act="edit"]'); await h.modal(); },
      description: 'Formulario de una sección con nombre, color, descripción y orden en el menú.',
      actions: ['Editar nombre y descripción', 'Elegir el color de la sección', 'Cambiar su orden en el menú']
    },
    {
      id: 'etiquetas', section: 'editora', login: U.editora, roles: JEFE, title: 'Etiquetas', url: 'admin.html#/secciones', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-tab="tags"]'); await h.wait('.admin-content table'); },
      description: 'Etiquetas usadas en las notas con su cantidad de usos.',
      actions: ['Crear una etiqueta', 'Renombrar una etiqueta', 'Fusionar dos etiquetas en una', 'Eliminar etiquetas sin uso']
    },
    {
      id: 'etiqueta-fusionar', section: 'editora', login: U.editora, roles: JEFE, kind: 'modal', from: 'Acción "Fusionar" en Etiquetas', title: 'Fusionar etiquetas', url: 'admin.html#/secciones', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-tab="tags"]'); await h.click(firstRow + ' >> [data-act="merge"]'); await h.modal(); },
      description: 'Ventana para fusionar una etiqueta en otra: todas las notas pasan a usar la etiqueta de destino.',
      actions: ['Elegir la etiqueta de destino', 'Fusionar y actualizar todas las notas', 'Ordenar el archivo de temas']
    },
    {
      id: 'autores', section: 'editora', login: U.editora, roles: JEFE, title: 'Autores', url: 'admin.html#/autores', waitFor: '.admin-content table',
      description: 'Periodistas, columnistas y firmas de la redacción con su área, usuario asociado y cantidad de notas.',
      actions: ['Crear un autor o columnista invitado', 'Editar área y biografía', 'Asociarlo a una cuenta del CMS', 'Ver cuántas notas firma']
    },
    {
      id: 'autor-modal', section: 'editora', login: U.editora, roles: JEFE, kind: 'modal', from: 'Fila de la tabla Autores', title: 'Editar autor', url: 'admin.html#/autores', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> [data-act="edit"]'); await h.modal(); },
      description: 'Formulario del autor con nombre, área, biografía, color del avatar, cuenta de X y la cuenta de usuario del CMS asociada.',
      actions: ['Editar nombre, área y biografía', 'Elegir color del avatar', 'Asociar la cuenta del CMS']
    },
    {
      id: 'comentarios-moderacion', section: 'editora', login: U.editora, roles: JEFE, title: 'Moderación de comentarios', url: 'admin.html#/comentarios', waitFor: '.admin-content [data-c]',
      description: 'Bandeja de comentarios pendientes, aprobados, rechazados y spam, con aviso en los que parecen spam y acciones masivas.',
      actions: ['Aprobar, rechazar o marcar como spam', 'Seleccionar varios y moderar en bloque', 'Buscar en los comentarios', 'Ver en qué nota se escribió cada uno']
    },
    {
      id: 'newsletter', section: 'editora', login: U.editora, roles: JEFE, title: 'Newsletter: campañas', url: 'admin.html#/newsletter', waitFor: '.admin-content table',
      description: 'Resumen del newsletter con altas por mes y suscriptores por lista, y la tabla de campañas con destinatarios, aperturas y clics.',
      actions: ['Ver altas por mes y tamaño de cada lista', 'Revisar aperturas y clics de cada campaña', 'Crear una campaña nueva', 'Pasar a la lista de suscriptores']
    },
    {
      id: 'newsletter-suscriptores', section: 'editora', login: U.editora, roles: JEFE, title: 'Newsletter: suscriptores', url: 'admin.html#/newsletter', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-tab="subs"]'); await h.wait('.admin-content table'); },
      description: 'Suscriptores del newsletter con listas, origen (portada, registro, etc.) y estado.',
      actions: ['Agregar un suscriptor a mano', 'Filtrar por lista o estado', 'Dar de baja o reactivar', 'Exportar a CSV']
    },
    {
      id: 'newsletter-campana', section: 'editora', login: U.editora, roles: JEFE, title: 'Nueva campaña de newsletter', url: 'admin.html#/newsletter/nueva', waitFor: '.admin-content [data-f]',
      description: 'Editor de campaña con asunto, lista, introducción y selección de notas, con vista previa del correo en vivo.',
      actions: ['Escribir asunto e introducción', 'Elegir la lista de destino', 'Marcar las notas que incluye', 'Enviar una prueba o enviar ahora (simulado)']
    },
    {
      id: 'publicidad', section: 'editora', login: U.editora, roles: JEFE, title: 'Publicidad', url: 'admin.html#/publicidad', waitFor: '.admin-content table',
      description: 'Anuncios por ubicación (portada, barra lateral, dentro de la nota) con vigencia, impresiones, clics y CTR medidos en el sitio.',
      actions: ['Crear un anuncio con anunciante y ubicación', 'Ver impresiones, clics y CTR', 'Activar o pausar anuncios', 'Editar o eliminar anuncios']
    },
    {
      id: 'anuncio-modal', section: 'editora', login: U.editora, roles: JEFE, kind: 'modal', from: 'Botón "Nuevo anuncio" o fila de Publicidad', title: 'Editar anuncio', url: 'admin.html#/publicidad', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> [data-act="edit"]'); await h.modal(); },
      description: 'Formulario del anuncio con anunciante, ubicación, título, texto, llamado a la acción, fechas de vigencia y estado.',
      actions: ['Elegir anunciante y ubicación', 'Escribir el texto y el botón', 'Definir fechas de inicio y término', 'Activarlo o pausarlo']
    },

    // ================= Administrador =================
    {
      id: 'escritorio-admin', section: 'admin', login: U.admin, title: 'Escritorio del administrador', url: 'admin.html#/', waitFor: '.admin-content .kpis',
      description: 'El escritorio de la edición más el ingreso mensual recurrente (MRR) y las suscripciones activas.',
      actions: ['Ver audiencia e ingresos en un solo lugar', 'Revisar el flujo editorial', 'Ir a cualquier sección del CMS']
    },
    {
      id: 'suscripciones', section: 'admin', login: U.admin, title: 'Suscripciones e ingresos', url: 'admin.html#/suscripciones', waitFor: '.admin-content .kpis',
      description: 'MRR, ARR, suscripciones activas, pagos atrasados y bajas, con ingresos por mes, mix de planes y crecimiento, más la tabla de suscriptores.',
      actions: ['Ver MRR, ARR y tasa de bajas', 'Revisar ingresos por mes y mix de planes', 'Buscar suscriptores y filtrar por plan o estado', 'Pasar a pagos y planes']
    },
    {
      id: 'suscripciones-pagos', section: 'admin', login: U.admin, title: 'Pagos', url: 'admin.html#/suscripciones', waitFor: '.admin-content .kpis',
      setup: async h => { await h.click('[data-tab="pays"]'); await h.scrollTo('.admin-content .tabs', 'start', -80); },
      description: 'Historial de cobros de las suscripciones con fecha, lector, plan, monto y estado.',
      actions: ['Revisar cada cobro', 'Filtrar por estado del pago', 'Exportar a CSV para contabilidad']
    },
    {
      id: 'planes-admin', section: 'admin', login: U.admin, title: 'Planes', url: 'admin.html#/suscripciones', waitFor: '.admin-content .kpis',
      setup: async h => { await h.click('[data-tab="plans"]'); await h.scrollTo('.admin-content .tabs', 'start', -80); },
      description: 'Planes de suscripción que se muestran en la página de planes, con precio, período y suscriptores activos.',
      actions: ['Crear un plan nuevo', 'Editar precio, período y beneficios', 'Destacar un plan en la página pública']
    },
    {
      id: 'plan-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo plan" o editar en Planes', title: 'Editar plan', url: 'admin.html#/suscripciones', waitFor: '.admin-content .kpis',
      setup: async h => { await h.click('[data-tab="plans"]'); await h.click('.admin-content [data-t] [data-plan] >> nth=0'); await h.modal(); },
      description: 'Formulario del plan con nombre, precio, período, orden, beneficios, si se destaca y si está activo.',
      actions: ['Definir nombre y precio', 'Elegir período mensual o anual', 'Escribir los beneficios', 'Marcarlo como destacado']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de la redacción y de lectores (en pestañas separadas) con su rol, último acceso, estado y la matriz de permisos por sección.',
      actions: ['Crear una cuenta nueva', 'Cambiar el rol de un usuario', 'Activar o desactivar cuentas', 'Revisar la matriz de permisos']
    },
    {
      id: 'usuario-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario" en Usuarios y roles', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de cuenta con nombre, cargo, correo, rol, contraseña y estado.',
      actions: ['Ingresar los datos de la persona', 'Asignar rol (administrador, editor/a jefe, periodista o lector)', 'Definir la contraseña', 'Activar o desactivar la cuenta']
    },
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Ajustes del medio', url: 'admin.html#/ajustes', waitFor: '.admin-content [data-save]',
      description: 'Identidad del medio, ticker de último minuto, muro de pago, modo de moderación de comentarios, contacto, SEO y texto del newsletter.',
      actions: ['Editar nombre y lema', 'Activar el ticker y escribir un mensaje manual', 'Encender el muro de pago y elegir cuántos bloques se ven antes', 'Elegir pre o post-moderación de comentarios', 'Restablecer los datos demo']
    },
    {
      id: 'bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/actividad', waitFor: '.admin-content table',
      setup: async h => {
        // La base recién sembrada parte casi vacía: se generan algunos eventos reales antes de abrirla.
        await h.goto('admin.html#/comentarios', '.admin-content [data-c]');
        await h.click('.admin-content [data-c] >> nth=0 >> [data-set="approved"]');
        await h.click('.admin-content [data-c] >> nth=0 >> [data-set="spam"]');
        await h.goto('admin.html#/articulos', '.admin-content table');
        await openByStatus(h, 'review'); await h.click('[data-do="publish"]', { after: 600 });
        await h.goto('admin.html#/actividad', '.admin-content table');
      },
      description: 'Registro de lo que pasa en el medio: publicaciones, cambios de estado, moderación, suscripciones y cambios de la redacción.',
      actions: ['Filtrar por tipo de acción o usuario', 'Buscar en el detalle', 'Exportar a CSV']
    }
  ]
};
