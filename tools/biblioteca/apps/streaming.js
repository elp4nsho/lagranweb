// Biblioteca de vistas de Andes+ (/streaming).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { suscriptor: 'u-sub', editor: 'u-editor', soporte: 'u-soporte', admin: 'u-admin' };

// El suscriptor entra a "¿Quién está viendo?"; para las vistas de la app se elige un perfil
// (p1 = Javier, p3 = Niños) y luego se abre la ruta pedida.
const asProfile = (target, waitFor, profile = 'p1') => async h => {
  await h.page.evaluate(p => localStorage.setItem('lgw:andes:profile:u-sub', p), profile);
  await h.goto(target, waitFor);
  return { url: target };
};

module.exports = {
  dir: 'streaming',
  name: 'Andes+',
  kind: 'Plataforma de streaming',
  theme: 'metro',
  description: 'Servicio de streaming de series y películas con landing de suscripción, perfiles con PIN y perfil infantil, catálogo con reproductor simulado, cuenta del suscriptor y un CMS para contenido, licencias, suscriptores y soporte.',
  accounts: {
    'u-sub': { name: 'Javier Muñoz', role: 'Suscriptor', email: 'javier@correo.cl', password: 'demo123' },
    'u-editor': { name: 'Martín Cárcamo', role: 'Editor de contenido', email: 'editor@andesplus.cl', password: 'demo123' },
    'u-soporte': { name: 'Paula Reyes', role: 'Soporte', email: 'soporte@andesplus.cl', password: 'demo123' },
    'u-admin': { name: 'Sofía Lagos', role: 'Administrador', email: 'admin@andesplus.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Landing de suscripción y alta con prueba gratis, sin iniciar sesión.' },
    { id: 'suscriptor', label: 'Suscriptor', desc: 'Perfiles, catálogo, reproductor y cuenta del cliente.' },
    { id: 'editor', label: 'Editor de contenido', desc: 'CMS del catálogo: títulos, filas de la portada, destacados, licencias y textos.' },
    { id: 'soporte', label: 'Soporte', desc: 'Atención de suscriptores y tickets de ayuda.' },
    { id: 'admin', label: 'Administrador', desc: 'Métricas del negocio, planes, usuarios y bitácora.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Metro" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '.land-hero',
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
      id: 'landing', section: 'publico', title: 'Landing', url: 'index.html', waitFor: '.land-hero', mobile: true,
      description: 'Página de venta del servicio con un mosaico del catálogo, el top 10 de la semana, ventajas, planes y preguntas frecuentes. Los textos y planes vienen del CMS.',
      actions: ['Ver el top 10 de la semana', 'Comparar los planes con precio, calidad y pantallas', 'Elegir un plan para comenzar la prueba gratis', 'Leer las preguntas frecuentes', 'Ir a ingresar con una cuenta existente']
    },
    {
      id: 'planes', section: 'publico', title: 'Planes', url: 'index.html', waitFor: '.plans .plan',
      setup: async h => { await h.scrollTo('#planes', 'start', -20); },
      description: 'Tarjetas de los planes activos con precio mensual, calidad, beneficios y el plan más elegido destacado.',
      actions: ['Comparar precio, calidad de imagen y beneficios', 'Ver qué plan incluye anuncios', 'Elegir un plan para suscribirse']
    },
    {
      id: 'suscripcion-plan', section: 'publico', kind: 'modal', from: 'Botón "Elegir plan" de la landing', title: 'Suscripción: plan', url: 'index.html', waitFor: '.plans .plan',
      setup: async h => { await h.click('[data-plan] >> nth=1'); await h.modal(); },
      description: 'Primer paso del alta en tres pasos (plan, cuenta y pago), con la lista de planes para confirmar o cambiar la elección.',
      actions: ['Confirmar o cambiar el plan', 'Ver pantallas y calidad de cada plan', 'Avanzar a crear la cuenta']
    },
    {
      id: 'suscripcion-pago', section: 'publico', kind: 'modal', from: 'Paso 3 del alta desde la landing', title: 'Suscripción: pago', url: 'index.html', waitFor: '.plans .plan',
      setup: async h => {
        await h.click('[data-plan] >> nth=1'); await h.modal(); await h.click('.modal #n1');
        await h.fill('.modal #su-n', 'Daniela Soto'); await h.fill('.modal #su-e', 'daniela.soto@demo.cl'); await h.fill('.modal #su-p', 'demo1234');
        await h.click('.modal #f2 button.btn-primary'); await h.wait('.modal #su-c'); await h.fill('.modal #su-c', '4242 4242 4242 4242');
      },
      description: 'Último paso del alta: resumen del plan, aviso de que hoy no se cobra nada durante la prueba y datos de la tarjeta (pago simulado).',
      actions: ['Revisar el plan elegido y la fecha del primer cobro', 'Ingresar la tarjeta (validada)', 'Comenzar la prueba gratis y entrar a crear perfiles']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para suscriptores y equipo, con cuentas de prueba para entrar con un clic. El suscriptor va a elegir perfil y el equipo al CMS.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como suscriptor, editor, soporte o administrador', 'Volver a la landing para suscribirse']
    },

    // ================= Suscriptor =================
    {
      id: 'perfiles', section: 'suscriptor', login: U.suscriptor, title: '¿Quién está viendo?', url: 'perfiles.html', waitFor: '.profiles .profile', mobile: true,
      description: 'Selector de perfiles de la cuenta (hasta 5), con perfil infantil y perfiles protegidos con PIN.',
      actions: ['Elegir el perfil con que se verá', 'Agregar un perfil nuevo', 'Entrar a administrar perfiles', 'Ir a la cuenta']
    },
    {
      id: 'perfil-pin', section: 'suscriptor', login: U.suscriptor, kind: 'modal', from: 'Perfil con candado en "¿Quién está viendo?"', title: 'Perfil bloqueado con PIN', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: async h => { await h.click('[data-p="p2"]'); await h.modal(); },
      description: 'Los perfiles con PIN piden los 4 dígitos antes de entrar.',
      actions: ['Ingresar el PIN de 4 dígitos', 'Ver el aviso si el PIN es incorrecto', 'Cancelar y elegir otro perfil']
    },
    {
      id: 'perfil-editar', section: 'suscriptor', login: U.suscriptor, kind: 'modal', from: 'Botón "Administrar perfiles" y clic en un perfil', title: 'Editar perfil', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: async h => { await h.click('#manage'); await h.click('[data-p="p3"]'); await h.modal(); },
      description: 'Edición de un perfil con nombre, avatar, color, opción de perfil infantil y PIN propio.',
      actions: ['Cambiar nombre, avatar y color', 'Marcarlo como perfil infantil (solo TE y 7+)', 'Ponerle o quitarle un PIN', 'Eliminar el perfil']
    },
    {
      id: 'inicio', section: 'suscriptor', login: U.suscriptor, title: 'Inicio', url: 'perfiles.html', waitFor: '.profiles .profile', mobile: true,
      setup: asProfile('app.html#/', '.billboard'),
      description: 'Portada del perfil con un destacado rotativo y carruseles curados desde el CMS, incluida la fila "Continuar viendo" con el avance de cada título.',
      actions: ['Reproducir o ver la ficha del destacado', 'Recorrer las filas por género y colección', 'Retomar lo que estaba viendo', 'Cambiar de perfil desde el menú']
    },
    {
      id: 'ficha-serie', section: 'suscriptor', login: U.suscriptor, kind: 'modal', from: 'Clic en una carátula del catálogo', title: 'Ficha de una serie', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: async h => { await asProfile('app.html#/titulo/t1', '.modal .tmodal-inner')(h); await h.pause(300); return { url: 'app.html#/titulo/t1' }; },
      description: 'Ventana de detalle con sinopsis, clasificación, elenco, tráiler simulado, temporadas con sus episodios y títulos similares.',
      actions: ['Reproducir o continuar el episodio pendiente', 'Agregar o quitar de Mi lista', 'Valorar con me gusta o no me gusta', 'Elegir temporada y episodio', 'Ver el tráiler y títulos similares']
    },
    {
      id: 'series', section: 'suscriptor', login: U.suscriptor, title: 'Series', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: asProfile('app.html#/series', '.title-grid .tile'),
      description: 'Todas las series disponibles para el perfil, con filtro por género y orden.',
      actions: ['Filtrar por género', 'Ordenar por popularidad, novedad, valoración o A–Z', 'Abrir la ficha de una serie']
    },
    {
      id: 'peliculas', section: 'suscriptor', login: U.suscriptor, title: 'Películas', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: asProfile('app.html#/peliculas', '.title-grid .tile'),
      description: 'Catálogo de películas con los mismos filtros por género y orden.',
      actions: ['Filtrar por género', 'Ordenar el listado', 'Abrir la ficha de una película']
    },
    {
      id: 'buscar', section: 'suscriptor', login: U.suscriptor, title: 'Búsqueda', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: async h => { await asProfile('app.html#/buscar', '#q')(h); await h.fill('#q', 'pata'); await h.pause(400); return { url: 'app.html#/buscar' }; },
      description: 'Buscador por título, persona o género con filtros de tipo, género y clasificación máxima.',
      actions: ['Buscar por título, elenco o género', 'Filtrar por serie o película', 'Limitar por clasificación', 'Ordenar los resultados']
    },
    {
      id: 'mi-lista', section: 'suscriptor', login: U.suscriptor, title: 'Mi lista', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: asProfile('app.html#/mi-lista', '.title-grid .tile'),
      description: 'Títulos guardados por el perfil para ver más tarde. Cada perfil tiene su propia lista.',
      actions: ['Ver los títulos guardados', 'Quitar títulos de la lista', 'Abrir la ficha para reproducir']
    },
    {
      id: 'inicio-infantil', section: 'suscriptor', login: U.suscriptor, title: 'Perfil infantil', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: asProfile('app.html#/', '.rows .tile', 'p3'),
      description: 'Inicio del perfil infantil: solo aparecen títulos con clasificación TE y 7+, en toda la app y en la búsqueda.',
      actions: ['Ver solo contenido apto para niños', 'Navegar series y películas filtradas', 'Volver a otro perfil (si no tiene PIN)']
    },
    {
      id: 'reproductor', section: 'suscriptor', login: U.suscriptor, title: 'Reproductor', url: 'perfiles.html', waitFor: '.profiles .profile', mobile: true,
      setup: async h => { await asProfile('ver.html?t=t2', '#pl')(h); await h.pause(1500); await h.hover('#seek'); return { url: 'ver.html?t=t2' }; },
      description: 'Reproductor simulado con escena animada, línea de tiempo, volumen, subtítulos, calidad según el plan y siguiente episodio. El avance se guarda para "Continuar viendo".',
      actions: ['Reproducir, pausar y adelantar o retroceder 10 s', 'Activar subtítulos en español o inglés', 'Cambiar la calidad (hasta la del plan) y la velocidad', 'Pasar al siguiente episodio', 'Retomar más tarde donde quedó']
    },
    {
      id: 'reproductor-ajustes', section: 'suscriptor', login: U.suscriptor, kind: 'modal', from: 'Botón ⚙ del reproductor', title: 'Calidad y velocidad', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: async h => { await asProfile('ver.html?t=t2', '#pl')(h); await h.click('#qBtn'); await h.wait('#menu:not([hidden])'); return { url: 'ver.html?t=t2' }; },
      description: 'Menú del reproductor para elegir calidad de imagen (limitada por el plan contratado) y velocidad de reproducción.',
      actions: ['Elegir la calidad de imagen', 'Ver qué calidades requieren un plan superior', 'Cambiar la velocidad de reproducción']
    },
    {
      id: 'pin-parental', section: 'suscriptor', login: U.suscriptor, kind: 'modal', from: 'Reproducir un título 18+', title: 'Control parental', url: 'perfiles.html', waitFor: '.profiles .profile',
      setup: async h => { await asProfile('ver.html?t=t5', '.modal')(h); await h.modal(); return { url: 'ver.html?t=t5' }; },
      description: 'Antes de reproducir un título con clasificación igual o superior a la definida en la cuenta, se pide el PIN parental.',
      actions: ['Ingresar el PIN parental', 'Bloquear títulos según su clasificación', 'Configurar el nivel desde la cuenta']
    },
    {
      id: 'cuenta-plan', section: 'suscriptor', login: U.suscriptor, title: 'Cuenta: plan y pago', url: 'cuenta.html#plan', waitFor: '.acct',
      description: 'Estado de la suscripción con plan, calidad, pantallas, próximo cobro y medio de pago, más el cambio de plan.',
      actions: ['Ver el plan y la fecha del próximo cobro', 'Cambiar de plan', 'Cambiar el medio de pago', 'Cancelar o reactivar la suscripción']
    },
    {
      id: 'cuenta-dispositivos', section: 'suscriptor', login: U.suscriptor, title: 'Cuenta: dispositivos', url: 'cuenta.html#dispositivos', waitFor: '.acct table',
      description: 'Dispositivos con sesión iniciada y su última actividad, según las pantallas que permite el plan.',
      actions: ['Ver qué dispositivos usan la cuenta', 'Cerrar la sesión en un dispositivo', 'Cerrar sesión en todos los demás']
    },
    {
      id: 'cuenta-historial', section: 'suscriptor', login: U.suscriptor, title: 'Cuenta: historial', url: 'cuenta.html#historial', waitFor: '.acct table',
      description: 'Historial de visualización de la cuenta con título, fecha, minutos y dispositivo, y el total de horas vistas.',
      actions: ['Revisar lo visto y cuándo', 'Ver el total de horas', 'Volver a abrir un título']
    },
    {
      id: 'cuenta-parental', section: 'suscriptor', login: U.suscriptor, title: 'Cuenta: control parental', url: 'cuenta.html#parental', waitFor: '#parental',
      description: 'Configuración del PIN parental y de la clasificación desde la que se exige, confirmando con la contraseña.',
      actions: ['Definir o cambiar el PIN de 4 dígitos', 'Elegir desde qué clasificación se pide', 'Confirmar con la contraseña']
    },
    {
      id: 'cuenta-soporte', section: 'suscriptor', login: U.suscriptor, title: 'Cuenta: ayuda y soporte', url: 'cuenta.html#soporte', waitFor: '#newTk',
      description: 'Consultas enviadas al equipo de soporte con su categoría, estado y conversación.',
      actions: ['Crear una consulta nueva', 'Ver las respuestas de soporte', 'Seguir el estado de cada consulta']
    },
    {
      id: 'cuenta-nueva-consulta', section: 'suscriptor', login: U.suscriptor, kind: 'modal', from: 'Botón "Nueva consulta" en Ayuda y soporte', title: 'Nueva consulta', url: 'cuenta.html#soporte', waitFor: '#newTk',
      setup: async h => { await h.click('#newTk'); await h.modal(); },
      description: 'Formulario para escribir a soporte eligiendo la categoría. La consulta llega a la bandeja de tickets del CMS.',
      actions: ['Elegir la categoría (reproducción, facturación, cuenta, catálogo)', 'Escribir el asunto y el mensaje', 'Enviar al equipo de soporte']
    },
    {
      id: 'cuenta-datos', section: 'suscriptor', login: U.suscriptor, title: 'Cuenta: datos personales', url: 'cuenta.html#datos', waitFor: '#datos',
      description: 'Nombre, correo y cambio de contraseña del titular.',
      actions: ['Actualizar nombre y correo', 'Cambiar la contraseña', 'Guardar los cambios']
    },

    // ================= Editor de contenido =================
    {
      id: 'cms-catalogo', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], title: 'Catálogo', url: 'admin.html#/catalogo', waitFor: '.admin-content table',
      description: 'Todos los títulos con tipo, año, géneros, clasificación, estado de publicación y ventana de licencia.',
      actions: ['Buscar y filtrar títulos', 'Crear una película o serie', 'Abrir el editor de un título', 'Exportar a CSV']
    },
    {
      id: 'cms-titulo', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], title: 'Editor de título', url: 'admin.html#/catalogo/t1', waitFor: '#e-title',
      description: 'Ficha completa del título: datos, géneros, sinopsis, elenco, carátula generada, estado, ventana de licencia y, en las series, temporadas y episodios.',
      actions: ['Editar título, año, clasificación, géneros y sinopsis', 'Ajustar la carátula (motivo, degradé y tono)', 'Publicar o dejar en borrador', 'Fijar fechas de disponibilidad', 'Agregar temporadas y episodios']
    },
    {
      id: 'cms-filas', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], title: 'Filas de la portada', url: 'admin.html#/colecciones', waitFor: '[data-edit]',
      description: 'Carruseles del inicio de la app en su orden. Los cambios se ven al instante en la app de los suscriptores.',
      actions: ['Subir o bajar una fila', 'Mostrar u ocultar filas', 'Crear una fila nueva', 'Editar o eliminar una fila']
    },
    {
      id: 'cms-fila-editar', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], kind: 'modal', from: 'Botón "Editar" en Filas de la portada', title: 'Editar fila', url: 'admin.html#/colecciones', waitFor: '[data-edit]',
      setup: async h => { await h.click('[data-edit]'); await h.modal(); },
      description: 'Configuración de un carrusel: por género, automático o curado a mano eligiendo los títulos en orden.',
      actions: ['Cambiar el nombre de la fila', 'Elegir el tipo de fila', 'Seleccionar títulos a mano en orden']
    },
    {
      id: 'cms-billboard', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], title: 'Billboard destacado', url: 'admin.html#/destacado', waitFor: '#addBtn',
      description: 'Títulos que rotan en el hero del inicio (hasta 5), en el orden en que aparecen.',
      actions: ['Agregar un título al destacado', 'Cambiar el orden', 'Quitar títulos']
    },
    {
      id: 'cms-licencias', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], title: 'Licencias', url: 'admin.html#/licencias', waitFor: '.admin-content [data-edit]',
      description: 'Línea de tiempo de la disponibilidad de cada título según su contrato, con alertas de vencimiento. Fuera de la ventana, el título se oculta solo de la app.',
      actions: ['Ver qué títulos vencen pronto', 'Editar las fechas de una licencia', 'Renovar una licencia', 'Exportar a CSV']
    },
    {
      id: 'cms-licencia-editar', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], kind: 'modal', from: 'Botón de edición en Licencias', title: 'Editar licencia', url: 'admin.html#/licencias', waitFor: '.admin-content [data-edit]',
      setup: async h => { await h.click('.admin-content [data-edit]'); await h.modal(); },
      description: 'Fechas de inicio y término de la licencia de un título.',
      actions: ['Cambiar la fecha de inicio', 'Cambiar la fecha de término', 'Guardar la nueva ventana']
    },
    {
      id: 'cms-landing', section: 'editor', login: U.editor, roles: ['Editor de contenido', 'Administrador'], title: 'Landing y textos', url: 'admin.html#/landing', waitFor: '.admin-content form, .admin-content .card',
      description: 'Textos de la página pública de suscripción: título, bajada, días de prueba y nota del pie.',
      actions: ['Editar el título y la bajada', 'Cambiar los días de prueba gratis', 'Editar la nota del pie', 'Abrir la landing para ver el cambio']
    },
    {
      id: 'cms-vista-previa', section: 'editor', login: U.editor, title: 'Vista previa de la app', url: 'app.html#/', waitFor: '.billboard',
      description: 'El equipo puede abrir la app de suscriptores con un perfil de vista previa para revisar cómo se ven las filas y destacados.',
      actions: ['Ver la portada tal como la ven los suscriptores', 'Revisar fichas y episodios', 'Comprobar el efecto de los cambios del CMS']
    },
    {
      id: 'cms-restringido', section: 'editor', login: U.editor, title: 'Ruta protegida por rol', url: 'admin.html#/suscriptores', waitFor: '.admin-content h2',
      description: 'Lo que ve el editor si intenta abrir una sección de suscriptores o configuración, que no corresponde a su rol.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a las secciones permitidas', 'Comprobar que cada rol solo ve sus menús']
    },

    // ================= Soporte =================
    {
      id: 'soporte-suscriptores', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], title: 'Suscriptores', url: 'admin.html#/suscriptores', waitFor: '.admin-content table',
      description: 'Cuentas de clientes con plan, estado de la suscripción, fecha de alta y perfiles, con indicadores de activas, en prueba, morosas e ingreso promedio.',
      actions: ['Filtrar por estado y plan', 'Buscar por nombre o correo', 'Abrir la ficha de un suscriptor', 'Cambiar plan o estado', 'Exportar a CSV']
    },
    {
      id: 'soporte-ficha', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], kind: 'modal', from: 'Clic en una fila de Suscriptores', title: 'Ficha del suscriptor', url: 'admin.html#/suscriptores', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click('.admin-content tbody tr >> nth=0 >> td >> nth=1'); await h.modal(); },
      description: 'Datos de la cuenta con sus perfiles, dispositivos e historial reciente de visualización.',
      actions: ['Revisar plan, estado y medio de pago', 'Ver perfiles y dispositivos', 'Consultar lo que ha visto', 'Editar la suscripción']
    },
    {
      id: 'soporte-suscripcion', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], kind: 'modal', from: 'Botón "Editar" de un suscriptor', title: 'Editar suscripción', url: 'admin.html#/suscriptores', waitFor: '.admin-content [data-edit]',
      setup: async h => { await h.click('.admin-content [data-edit]'); await h.modal(); },
      description: 'Cambio manual del plan y del estado de la suscripción (activa, prueba, morosa o cancelada).',
      actions: ['Cambiar el plan', 'Cambiar el estado de la suscripción', 'Guardar con registro en la bitácora']
    },
    {
      id: 'soporte-tickets', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], title: 'Tickets de soporte', url: 'admin.html#/soporte', waitFor: '.admin-content table',
      description: 'Bandeja de consultas enviadas desde la cuenta de los suscriptores, con prioridad, categoría y estado.',
      actions: ['Filtrar por estado', 'Buscar por asunto o cliente', 'Abrir la conversación', 'Exportar a CSV']
    },
    {
      id: 'soporte-ticket', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], kind: 'modal', from: 'Clic en un ticket', title: 'Conversación del ticket', url: 'admin.html#/soporte', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click('.admin-content tbody tr >> nth=0 >> td >> nth=0'); await h.modal(); },
      description: 'Hilo del ticket con los mensajes del cliente y del equipo, donde se responde y se cambia prioridad y estado.',
      actions: ['Leer la conversación completa', 'Responder al cliente', 'Cambiar prioridad y estado', 'Marcar como resuelto']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content .page-head',
      description: 'Métricas de los últimos 30 días: suscriptores, ingreso mensual recurrente, bajas, horas vistas, títulos más vistos, dispositivos y mezcla de planes.',
      actions: ['Ver suscriptores activos e ingreso mensual', 'Revisar la tasa de bajas', 'Ver los títulos más vistos', 'Comparar uso por dispositivo y por plan', 'Seguir la actividad reciente']
    },
    {
      id: 'admin-planes', section: 'admin', login: U.admin, title: 'Planes', url: 'admin.html#/planes', waitFor: '.admin-content [data-edit]',
      description: 'Planes con precio, calidad, pantallas, anuncios y beneficios. Los cambios se ven al instante en la landing y en la cuenta.',
      actions: ['Crear un plan', 'Editar precio, calidad y pantallas', 'Definir si tiene anuncios y sus beneficios', 'Eliminar un plan']
    },
    {
      id: 'admin-plan-editar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Editar" de un plan', title: 'Editar plan', url: 'admin.html#/planes', waitFor: '.admin-content [data-edit]',
      setup: async h => { await h.click('.admin-content [data-edit]'); await h.modal(); },
      description: 'Formulario del plan con nombre, precio, calidad máxima, pantallas simultáneas, anuncios, beneficios y si se destaca.',
      actions: ['Cambiar el precio mensual', 'Definir calidad y pantallas', 'Activar o quitar anuncios', 'Destacarlo como "Más elegido"']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Equipo interno (administración, editores, soporte) y suscriptores, con su rol y estado.',
      actions: ['Crear un usuario', 'Cambiar el rol', 'Desactivar una cuenta', 'Exportar a CSV']
    },
    {
      id: 'admin-usuario-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario"', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('#new'); await h.modal(); },
      description: 'Alta de una cuenta del equipo con nombre, correo, contraseña y rol.',
      actions: ['Ingresar nombre, correo y contraseña', 'Elegir el rol', 'Crear la cuenta']
    },
    {
      id: 'admin-actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: '.admin-content .page-head',
      description: 'Bitácora de acciones: altas, cambios de plan, cancelaciones, ediciones del catálogo y respuestas de soporte.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo o texto', 'Exportar a CSV', 'Restablecer los datos de demostración']
    }
  ]
};
