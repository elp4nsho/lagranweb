// Biblioteca de vistas de Hogar Austral Propiedades (/inmobiliaria).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', editor: 'u-editor', corredor: 'u-ag1', propietario: 'u-owner', cliente: 'u-client' };
const firstRow = '.admin-content tbody tr >> nth=0';
const card = '.site-main a[href^="#/propiedad/"]';

// Avanza el formulario "Publica tu propiedad" hasta el paso indicado (2 = características, 5 = enviada).
async function publish(h, upTo) {
  const next = () => h.click('[data-pub] button[type="submit"]');
  await next(); await h.wait('#pb-address');
  await h.fill('#pb-address', 'Av. Irarrázaval 3120, depto 504'); await next(); await h.wait('[data-feats]');
  if (upTo === 2) { await h.click('[data-feats] [data-f] >> nth=0'); await h.click('[data-feats] [data-f] >> nth=2'); await h.click('[data-feats] [data-f] >> nth=5'); return; }
  await next(); await h.wait('#pb-price'); await h.fill('#pb-price', '5200'); await next(); await h.wait('#pb-name');
  await h.fill('#pb-name', 'Daniela Campos Ruiz'); await h.fill('#pb-email', 'daniela.campos@demo.cl'); await h.fill('#pb-phone', '+56 9 6123 4567'); await h.fill('#pb-rut', '15.234.567-4');
  await h.check('[data-pub] input[name="terms"]'); await next(); await h.wait('.site-main h1:has-text("Gracias")');
}

module.exports = {
  dir: 'inmobiliaria',
  name: 'Hogar Austral Propiedades',
  kind: 'Corredora de propiedades',
  theme: 'bauhaus',
  description: 'Corredora de propiedades con portal público (búsqueda con mapa, fichas, comparador, proyectos nuevos y publicación), cuenta de clientes y propietarios, app de corredores y panel de gestión con contratos de arriendo.',
  accounts: {
    'u-admin': { name: 'Camila Herrera', role: 'Administrador', email: 'admin@hogaraustral.cl', password: 'admin123' },
    'u-editor': { name: 'Martín Ossandón', role: 'Editor de contenidos', email: 'editor@hogaraustral.cl', password: 'editor123' },
    'u-ag1': { name: 'Ignacio Valdés', role: 'Corredor', email: 'corredor@hogaraustral.cl', password: 'corredor123' },
    'u-owner': { name: 'Rodrigo Fuentes', role: 'Propietario', email: 'propietario@demo.cl', password: 'prop123' },
    'u-client': { name: 'Valentina Rojas', role: 'Cliente', email: 'cliente@demo.cl', password: 'cliente123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Cuenta de quien busca: favoritos, búsquedas con alerta, avisos y visitas.' },
    { id: 'propietario', label: 'Propietario', desc: 'Seguimiento de las propiedades que el dueño entregó a la corredora.' },
    { id: 'corredor', label: 'Corredor', desc: 'App comercial: cartera, bandeja de leads, agenda de visitas y notas CRM.' },
    { id: 'admin', label: 'Administrador', desc: 'Panel de gestión: inventario, leads, visitas, equipo, propietarios, contratos, contenido y sistema.' },
    { id: 'editor', label: 'Editor de contenidos', desc: 'El mismo panel, limitado al inventario y al contenido del sitio.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Bauhaus" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-main h1',
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
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-main h1', mobile: true,
      description: 'Página de inicio con buscador de compra o arriendo, banners, propiedades destacadas, comunas con más oferta, proyectos nuevos y llamado a publicar. Todo se administra desde el CMS del panel.',
      actions: ['Buscar por operación, tipo, comuna y precio', 'Ver las propiedades destacadas', 'Explorar las comunas con más oferta', 'Ver proyectos en verde, en blanco o con entrega inmediata', 'Ir a publicar una propiedad']
    },
    {
      id: 'buscar', section: 'publico', title: 'Resultados de búsqueda', url: 'index.html#/buscar?op=venta', waitFor: card, mobile: true,
      description: 'Listado de propiedades con filtros combinables, orden y paginación. Cada tarjeta permite guardar en favoritos o sumar al comparador.',
      actions: ['Filtrar por operación, tipo, comuna, precio, dormitorios y m²', 'Buscar por texto (metro, piscina, código)', 'Ordenar resultados y paginar', 'Marcar favoritos y agregar al comparador', 'Guardar la búsqueda con alerta']
    },
    {
      id: 'buscar-mapa', section: 'publico', title: 'Búsqueda en mapa', url: 'index.html#/buscar?op=venta&view=mapa', waitFor: '[data-mlist]',
      description: 'Vista de mapa de Santiago dibujada por comunas, con los precios por zona y la lista de propiedades del área visible. No usa mapas externos: es una ilustración propia del sistema.',
      actions: ['Ver la oferta repartida por comuna', 'Comparar precios por zona', 'Abrir una propiedad desde el mapa', 'Volver a la vista de lista']
    },
    {
      id: 'propiedad', section: 'publico', title: 'Ficha de propiedad', url: 'index.html#/buscar?op=venta', waitFor: card, mobile: true,
      setup: async h => { await h.click(card + ' >> nth=0'); await h.wait('[data-form="visit"]'); return { url: h.here() }; },
      description: 'Ficha completa con galería, características, plano, calculadora de crédito hipotecario, ubicación, corredor a cargo y propiedades similares.',
      actions: ['Recorrer la galería de fotos', 'Revisar características y plano', 'Simular el dividendo con pie, plazo y tasa', 'Agendar una visita o contactar al corredor', 'Comparar o compartir la propiedad']
    },
    {
      id: 'propiedad-visita', section: 'publico', title: 'Agendar visita', url: 'index.html#/buscar?op=venta', waitFor: card,
      setup: async h => {
        await h.click(card + ' >> nth=0'); await h.wait('[data-form="visit"]'); const url = h.here();
        await h.click('[data-days] [data-day="1"]'); await h.click('[data-slots] [data-slot]:not([disabled]) >> nth=1');
        await h.fill('#v-name', 'Martín Soto Araya'); await h.fill('#v-email', 'martin.soto@demo.cl'); await h.fill('#v-phone', '+56 9 6543 2109');
        await h.scrollTo('[data-form="visit"]', 'center'); return { url };
      },
      keepScroll: true,
      description: 'Agenda de visitas de la ficha: días próximos y horarios libres, con los ocupados deshabilitados. La solicitud crea un lead y avisa al corredor.',
      actions: ['Elegir día y horario libre', 'Dejar nombre, correo y teléfono', 'Solicitar la visita', 'Cambiar a la pestaña de contacto para escribir un mensaje']
    },
    {
      id: 'comparador', section: 'publico', title: 'Comparador', url: 'index.html#/buscar?op=venta', waitFor: card,
      setup: async h => {
        for (const i of [0, 1, 2]) await h.click(`.site-main [data-cmp] >> nth=${i}`);
        await h.goto('index.html#/comparar', '[data-clear]'); return { url: 'index.html#/comparar' };
      },
      description: 'Tabla lado a lado de hasta 3 propiedades con precio, UF/m², superficie, dormitorios, gastos comunes y características.',
      actions: ['Comparar precio y valor por m²', 'Revisar superficie, dormitorios y baños', 'Quitar una propiedad o vaciar el comparador', 'Abrir la ficha de cualquiera']
    },
    {
      id: 'proyectos', section: 'publico', title: 'Proyectos nuevos', url: 'index.html#/proyectos', waitFor: '[data-stage]',
      description: 'Proyectos inmobiliarios con etapa (en verde, en blanco, entrega inmediata), comuna, inmobiliaria y precio desde.',
      actions: ['Filtrar por etapa de construcción', 'Ver precio desde y fecha de entrega', 'Abrir la ficha de un proyecto']
    },
    {
      id: 'proyecto', section: 'publico', title: 'Ficha de proyecto', url: 'index.html#/proyecto/pr1', waitFor: '.site-main h1',
      description: 'Ficha de un proyecto con descripción, tipologías disponibles con superficie y precio, ubicación y formulario de cotización.',
      actions: ['Revisar las tipologías disponibles', 'Ver superficie y precio de cada una', 'Ubicar el proyecto', 'Pedir una cotización (llega como lead al panel)']
    },
    {
      id: 'publicar', section: 'publico', title: 'Publica tu propiedad', url: 'index.html#/publicar', waitFor: '[data-pub]', mobile: true,
      description: 'Formulario en 5 pasos para que un dueño ofrezca su propiedad: operación, ubicación, características, precio y fotos, y contacto. Sugiere un precio según la comuna.',
      actions: ['Elegir vender o arrendar y el tipo de propiedad', 'Ver cómo funciona el proceso', 'Avanzar o volver entre los pasos']
    },
    {
      id: 'publicar-caracteristicas', section: 'publico', title: 'Publicar: características', url: 'index.html#/publicar', waitFor: '[data-pub]',
      setup: async h => { await publish(h, 2); },
      description: 'Paso de características con dormitorios, baños, superficie, estacionamientos y una lista de atributos para marcar.',
      actions: ['Indicar dormitorios, baños y m²', 'Marcar atributos como piscina, quincho o bodega', 'Agregar estacionamientos y año de construcción']
    },
    {
      id: 'publicar-enviada', section: 'publico', title: 'Propiedad enviada a revisión', url: 'index.html#/publicar', waitFor: '[data-pub]',
      setup: async h => { await publish(h, 5); },
      description: 'Confirmación con el código asignado. La propiedad entra al panel en estado "En revisión", se asigna a un corredor y se avisa al administrador.',
      actions: ['Ver el código de la propiedad', 'Saber que un corredor lo contactará', 'Crear una cuenta para seguir el estado']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso y registro', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para el equipo y los usuarios, registro de clientes y propietarios, y cuentas de demostración para entrar con un clic.',
      actions: ['Ingresar con correo y contraseña', 'Registrarse como cliente o propietario', 'Entrar con un clic como administrador, editor, corredor, propietario o cliente', 'Volver al sitio']
    },

    // ================= Cliente =================
    {
      id: 'cuenta-favoritos', section: 'cliente', login: U.cliente, roles: ['Cliente', 'Propietario'], title: 'Mis favoritos', url: 'index.html#/cuenta/favoritos', waitFor: '.tab.active', mobile: true,
      description: 'Inicio de la cuenta con las propiedades guardadas como favoritas y pestañas para el resto de la actividad.',
      actions: ['Ver sus propiedades favoritas', 'Quitar de favoritos o comparar', 'Moverse a búsquedas, alertas, visitas y perfil']
    },
    {
      id: 'cuenta-busquedas', section: 'cliente', login: U.cliente, roles: ['Cliente', 'Propietario'], title: 'Búsquedas guardadas', url: 'index.html#/cuenta/busquedas', waitFor: '.tab.active',
      description: 'Búsquedas guardadas con sus filtros y la opción de recibir alertas cuando se publica una propiedad que coincide.',
      actions: ['Repetir una búsqueda guardada', 'Activar o desactivar alertas', 'Eliminar búsquedas']
    },
    {
      id: 'guardar-busqueda', section: 'cliente', login: U.cliente, roles: ['Cliente', 'Propietario'], kind: 'modal', from: 'Botón "Guardar búsqueda" en los resultados', title: 'Guardar búsqueda', url: 'index.html#/buscar?op=venta', waitFor: card,
      setup: async h => { await h.click('[data-save]'); await h.modal(); },
      description: 'Ventana para guardar los filtros actuales con un nombre y activar la alerta de nuevas publicaciones.',
      actions: ['Poner un nombre a la búsqueda', 'Activar la alerta por nuevas coincidencias', 'Guardar']
    },
    {
      id: 'cuenta-alertas', section: 'cliente', login: U.cliente, roles: ['Cliente', 'Propietario'], title: 'Alertas y avisos', url: 'index.html#/cuenta/alertas', waitFor: '.tab.active',
      description: 'Avisos del sistema: nuevas propiedades que coinciden con sus búsquedas, cambios en sus visitas y novedades de sus propiedades.',
      actions: ['Leer las alertas nuevas', 'Abrir la propiedad o la visita relacionada', 'Marcar todo como leído']
    },
    {
      id: 'cuenta-visitas', section: 'cliente', login: U.cliente, roles: ['Cliente', 'Propietario'], title: 'Mis visitas', url: 'index.html#/cuenta/visitas', waitFor: '.tab.active',
      description: 'Visitas solicitadas con la propiedad, fecha, hora, corredor y estado (pendiente, confirmada o realizada).',
      actions: ['Ver sus próximas visitas', 'Saber si el corredor la confirmó', 'Cancelar una visita']
    },
    {
      id: 'cuenta-perfil', section: 'cliente', login: U.cliente, roles: ['Cliente', 'Propietario'], title: 'Perfil', url: 'index.html#/cuenta/perfil', waitFor: '.tab.active',
      description: 'Datos personales de la cuenta y cambio de contraseña.',
      actions: ['Actualizar nombre y teléfono', 'Cambiar la contraseña', 'Cerrar sesión']
    },

    // ================= Propietario =================
    {
      id: 'propietario-propiedades', section: 'propietario', login: U.propietario, roles: ['Propietario'], title: 'Mis propiedades', url: 'index.html#/cuenta/propiedades', waitFor: '.tab.active', mobile: true,
      description: 'Propiedades que el dueño entregó a la corredora, con estado (revisión, publicada, reservada, vendida o arrendada), visitas, leads y corredor a cargo.',
      actions: ['Ver el estado de cada propiedad', 'Revisar cuántas visitas y consultas tiene', 'Conocer al corredor asignado', 'Publicar una propiedad nueva']
    },
    {
      id: 'propietario-alertas', section: 'propietario', login: U.propietario, roles: ['Propietario'], title: 'Avisos del propietario', url: 'index.html#/cuenta/alertas', waitFor: '.tab.active',
      description: 'Avisos automáticos cuando una de sus propiedades cambia de estado (publicada, reservada, vendida o arrendada).',
      actions: ['Enterarse de cada cambio de estado', 'Abrir la propiedad relacionada', 'Marcar los avisos como leídos']
    },

    // ================= Corredor =================
    {
      id: 'corredor-dia', section: 'corredor', login: U.corredor, roles: ['Corredor'], title: 'Mi día', url: 'agente.html#/resumen', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Resumen del corredor: visitas de hoy, leads nuevos por contactar, propiedades en borrador y su desempeño.',
      actions: ['Ver las visitas del día', 'Contactar los leads nuevos', 'Revisar propiedades por enviar a revisión', 'Ver sus indicadores']
    },
    {
      id: 'corredor-propiedades', section: 'corredor', login: U.corredor, roles: ['Corredor'], title: 'Mis propiedades', url: 'agente.html#/propiedades', waitFor: '.admin-content table',
      description: 'Cartera del corredor. Las captaciones nuevas quedan en borrador hasta que las envía a revisión.',
      actions: ['Captar una propiedad nueva', 'Enviar a revisión, reservar o cerrar', 'Abrir la ficha de una propiedad', 'Filtrar por estado']
    },
    {
      id: 'corredor-captar', section: 'corredor', login: U.corredor, roles: ['Corredor'], kind: 'modal', from: 'Botón "Captar propiedad"', title: 'Captar propiedad', url: 'agente.html#/propiedades', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario completo de ficha de propiedad: operación, tipo, ubicación, características, precio, propietario y descripción.',
      actions: ['Cargar operación, tipo y comuna', 'Ingresar superficie, dormitorios y atributos', 'Fijar precio en UF o CLP', 'Asociar el propietario']
    },
    {
      id: 'corredor-ficha', section: 'corredor', login: U.corredor, roles: ['Corredor'], title: 'Ficha de propiedad (corredor)', url: 'agente.html#/propiedades', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-edit]'); return { url: h.here() }; },
      description: 'Ficha interna de una propiedad de su cartera con acciones de estado, leads, visitas e historial.',
      actions: ['Cambiar el estado según el flujo', 'Ver leads y visitas de la propiedad', 'Revisar el historial de cambios', 'Editar la ficha']
    },
    {
      id: 'corredor-leads', section: 'corredor', login: U.corredor, roles: ['Corredor'], title: 'Bandeja de leads', url: 'agente.html#/leads', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Bandeja de interesados asignados al corredor con el detalle del lead, su etapa en el pipeline, notas CRM y acciones rápidas.',
      actions: ['Filtrar por etapa y buscar', 'Avanzar el lead en el pipeline o marcarlo perdido', 'Agregar notas CRM', 'Agendar una visita con el lead', 'Llamar o escribir por correo']
    },
    {
      id: 'corredor-visita-lead', section: 'corredor', login: U.corredor, roles: ['Corredor'], kind: 'modal', from: 'Botón "Agendar visita con este lead"', title: 'Agendar visita con lead', url: 'agente.html#/leads', waitFor: '.admin-content [data-visit]',
      setup: async h => { await h.click('.admin-content [data-visit]'); await h.modal(); },
      description: 'Agenda una visita para el lead en la propiedad que consultó.',
      actions: ['Elegir fecha y hora', 'Dejar un comentario', 'Guardar; el lead pasa a etapa de visita']
    },
    {
      id: 'corredor-agenda', section: 'corredor', login: U.corredor, roles: ['Corredor'], title: 'Agenda de visitas', url: 'agente.html#/visitas', waitFor: '.admin-content .page-head',
      description: 'Calendario mensual con las visitas del corredor coloreadas por estado, con vista alternativa en lista.',
      actions: ['Moverse entre meses', 'Cambiar entre calendario y lista', 'Confirmar, cancelar o marcar realizada una visita', 'Agendar una visita nueva']
    },
    {
      id: 'corredor-notas', section: 'corredor', login: U.corredor, roles: ['Corredor'], title: 'Notas CRM', url: 'agente.html#/notas', waitFor: '.admin-content .page-head',
      description: 'Historial de notas registradas en todos sus leads, de la más reciente a la más antigua.',
      actions: ['Revisar el seguimiento de cada lead', 'Ver la etapa actual del lead', 'Abrir el lead desde la nota']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Resumen con inventario, leads y visitas por semana, UF/m² promedio por comuna, propiedades por estado, embudo comercial, leads por origen y propiedades por aprobar.',
      actions: ['Ver la evolución semanal de leads y visitas', 'Comparar UF/m² por comuna', 'Seguir el embudo comercial', 'Aprobar las propiedades en revisión']
    },
    {
      id: 'admin-propiedades', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], title: 'Propiedades', url: 'admin.html#/propiedades', waitFor: '.admin-content table',
      description: 'Inventario completo con estado, operación, comuna, precio y corredor. Las propiedades avanzan por el flujo borrador → revisión → publicada → reservada → vendida o arrendada.',
      actions: ['Filtrar por estado, operación y comuna', 'Aprobar o rechazar propiedades en revisión', 'Crear, editar o eliminar fichas', 'Abrir la ficha interna']
    },
    {
      id: 'admin-propiedad', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], title: 'Ficha interna de propiedad', url: 'admin.html#/propiedades/p001', waitFor: '.admin-content .page-head',
      description: 'Ficha interna con acciones de flujo, opción de destacarla en la portada, leads, visitas, corredor, propietario, contrato vigente e historial de estados.',
      actions: ['Cambiar el estado de la propiedad', 'Destacarla en la portada del sitio', 'Reasignar el corredor', 'Ver leads, visitas y contrato', 'Revisar el historial']
    },
    {
      id: 'admin-propiedad-editar', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], kind: 'modal', from: 'Botón "Nueva propiedad"', title: 'Nueva propiedad', url: 'admin.html#/propiedades', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de ficha de propiedad del panel.',
      actions: ['Cargar operación, tipo y ubicación', 'Ingresar características y precio', 'Asignar corredor y propietario', 'Definir el estado inicial']
    },
    {
      id: 'admin-proyectos', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], title: 'Proyectos nuevos', url: 'admin.html#/proyectos', waitFor: '.admin-content table',
      description: 'Desarrollos inmobiliarios que se muestran en la sección Proyectos del sitio.',
      actions: ['Crear, editar o eliminar proyectos', 'Publicar u ocultar un proyecto', 'Abrir el detalle con tipologías']
    },
    {
      id: 'admin-proyecto', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], title: 'Detalle de proyecto', url: 'admin.html#/proyectos/pr1', waitFor: '.admin-content .page-head',
      description: 'Proyecto con sus tipologías (dormitorios, baños, m², precio y stock) y las cotizaciones recibidas desde el sitio.',
      actions: ['Agregar, editar o quitar tipologías', 'Ver las cotizaciones recibidas', 'Editar los datos del proyecto']
    },
    {
      id: 'admin-leads', section: 'admin', login: U.admin, title: 'Leads', url: 'admin.html#/leads', waitFor: '.admin-content table',
      description: 'Bandeja general de interesados con origen, propiedad, corredor y etapa, más la carga de cada corredor.',
      actions: ['Asignar leads a mano o distribuirlos automáticamente por carga', 'Filtrar por etapa, origen y corredor', 'Crear un lead manual', 'Abrir un lead para seguirlo']
    },
    {
      id: 'admin-lead', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en un lead', title: 'Detalle de lead', url: 'admin.html#/leads', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Ficha del lead con su mensaje, propiedad de interés, corredor asignado, etapa y notas de seguimiento.',
      actions: ['Cambiar la etapa del lead', 'Reasignar el corredor', 'Agregar una nota de seguimiento']
    },
    {
      id: 'admin-visitas', section: 'admin', login: U.admin, title: 'Visitas', url: 'admin.html#/visitas', waitFor: '.admin-content .page-head',
      description: 'Calendario con las visitas de todos los corredores, coloreadas por estado, con vista en lista.',
      actions: ['Moverse entre meses', 'Cambiar entre calendario y lista', 'Abrir una visita para confirmarla o cancelarla', 'Agendar una visita']
    },
    {
      id: 'admin-visita', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en una visita del calendario', title: 'Detalle de visita', url: 'admin.html#/visitas', waitFor: '.admin-content .cal-ev[data-v]',
      setup: async h => { await h.click('.admin-content .cal-ev[data-v] >> nth=0'); await h.modal(); },
      description: 'Visita con propiedad, interesado, corredor y fecha, con acciones de estado y comentario.',
      actions: ['Confirmar la visita', 'Marcarla como realizada o cancelarla', 'Guardar un comentario']
    },
    {
      id: 'admin-corredores', section: 'admin', login: U.admin, title: 'Corredores y oficinas', url: 'admin.html#/agentes', waitFor: '.admin-content .page-head',
      description: 'Equipo comercial con cartera, leads, ventas y nota de cada corredor, y la pestaña de oficinas.',
      actions: ['Crear o editar corredores', 'Ver el desempeño de cada uno', 'Vincular un corredor a su cuenta de usuario', 'Gestionar oficinas']
    },
    {
      id: 'admin-propietarios', section: 'admin', login: U.admin, title: 'Propietarios', url: 'admin.html#/propietarios', waitFor: '.admin-content table',
      description: 'Mandantes de venta y arriendo con datos de contacto y número de propiedades.',
      actions: ['Crear o editar propietarios', 'Ver la cartera de cada uno', 'Eliminar propietarios']
    },
    {
      id: 'admin-propietario', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en un propietario', title: 'Cartera del propietario', url: 'admin.html#/propietarios', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=0'); await h.modal(); },
      description: 'Ficha del propietario con sus datos y la lista de sus propiedades con estado.',
      actions: ['Ver sus propiedades y su estado', 'Abrir una propiedad', 'Revisar notas del propietario']
    },
    {
      id: 'admin-contratos', section: 'admin', login: U.admin, title: 'Contratos y arriendos', url: 'admin.html#/contratos', waitFor: '.admin-content table',
      description: 'Contratos de arriendo administrados con la recaudación de los últimos 6 meses y el estado de cobranza de cada uno.',
      actions: ['Crear un contrato de arriendo', 'Generar los cobros del mes', 'Ver la recaudación mensual', 'Abrir el detalle de un contrato']
    },
    {
      id: 'admin-contrato', section: 'admin', login: U.admin, title: 'Detalle de contrato', url: 'admin.html#/contratos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content h3:has-text("Cobranza")'); return { url: h.here() }; },
      description: 'Contrato con la cobranza mes a mes, datos del arrendatario y del propietario.',
      actions: ['Registrar el pago de un mes', 'Ver rentas pagadas y pendientes', 'Revisar datos del arrendatario y propietario', 'Terminar el contrato']
    },
    {
      id: 'admin-contrato-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo contrato"', title: 'Nuevo contrato de arriendo', url: 'admin.html#/contratos', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario para formalizar un arriendo sobre una propiedad de la cartera.',
      actions: ['Elegir la propiedad', 'Ingresar los datos del arrendatario', 'Fijar renta, inicio y duración']
    },
    {
      id: 'admin-cms', section: 'admin', login: U.admin, roles: ['Administrador', 'Editor de contenidos'], title: 'Contenido del sitio', url: 'admin.html#/cms', waitFor: '.admin-content .page-head',
      description: 'CMS de la portada: textos del hero, banners y selección de propiedades destacadas. Los cambios se ven al instante en el sitio.',
      actions: ['Editar título y bajada de la portada', 'Crear, editar o quitar banners', 'Elegir las propiedades destacadas', 'Mostrar u ocultar secciones de la portada']
    },
    {
      id: 'admin-configuracion', section: 'admin', login: U.admin, title: 'Configuración y UF', url: 'admin.html#/configuracion', waitFor: '.admin-content .page-head',
      description: 'Valor de la UF (afecta todas las conversiones de precio), parámetros del simulador hipotecario y datos de contacto.',
      actions: ['Actualizar el valor de la UF', 'Fijar tasa, plazo y pie del simulador', 'Editar teléfono, correo y dirección', 'Restablecer los datos de demostración']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de acceso con su rol, más la matriz de permisos por rol.',
      actions: ['Crear o editar usuarios', 'Cambiar el rol o desactivar una cuenta', 'Restablecer la contraseña', 'Consultar los permisos por rol']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Registro de las últimas 300 acciones de usuarios y del sistema.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por acción y buscar', 'Exportar a CSV']
    },

    // ================= Editor =================
    {
      id: 'editor-panel', section: 'editor', login: U.editor, roles: ['Editor de contenidos'], title: 'Panel del editor', url: 'admin.html#/propiedades', waitFor: '.admin-content table',
      description: 'El editor entra al mismo panel, pero su menú solo muestra dashboard, propiedades, proyectos y contenido del sitio.',
      actions: ['Mantener las fichas de propiedades', 'Gestionar proyectos nuevos', 'Editar portada, banners y destacadas']
    },
    {
      id: 'editor-restringido', section: 'editor', login: U.editor, roles: ['Editor de contenidos'], title: 'Sección restringida', url: 'admin.html#/leads', waitFor: '.admin-content .card',
      description: 'Si el editor abre una sección comercial o de sistema (como Leads), el panel muestra un aviso de permiso insuficiente en lugar del contenido.',
      actions: ['Ver que la sección no está permitida para su rol', 'Volver a una sección permitida desde el menú', 'Pedir acceso a un administrador']
    }
  ]
};
