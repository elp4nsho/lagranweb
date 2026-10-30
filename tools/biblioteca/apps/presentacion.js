// Biblioteca de vistas de Estudio Nébula (/presentacion).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', editor: 'u-editor', ventas: 'u-sales' };
const firstRow = '.admin-content tbody tr >> nth=0';
const ED = ['Editor', 'Administrador'];
const VE = ['Ventas', 'Administrador'];

// Avanza el cotizador hasta el paso indicado (0 = servicios … 4 = resumen).
async function quoteTo(h, step) {
  await h.click('.pick:has(input[value="sv-id"])');
  await h.click('.pick:has(input[value="sv-web"])');
  if (step >= 1) { await h.click('[data-next]'); await h.click('.pick:has(input[value="l"])'); await h.click('label.check:has(input[value="copy"])'); }
  if (step >= 2) { await h.click('[data-next]'); await h.click('.pick:has(input[value="1 mes"])'); }
  if (step >= 3) {
    await h.click('[data-next]');
    await h.fill('#q-name', 'Valentina Rojas Muñoz'); await h.fill('#q-email', 'valentina@verdeo.cl');
    await h.fill('#q-company', 'Verdeo Alimentos'); await h.fill('#q-phone', '+56 9 7123 4567');
  }
  if (step >= 4) await h.click('[data-next]');
  await h.page.evaluate(() => window.scrollTo(0, 0));
}

module.exports = {
  dir: 'presentacion',
  name: 'Estudio Nébula',
  kind: 'Estudio creativo',
  theme: 'editorial',
  description: 'Sitio de un estudio de branding y diseño digital con portafolio, blog, carreras, contacto y cotizador en línea, más un panel para gestionar contenidos, leads y postulaciones.',
  accounts: {
    'u-admin': { name: 'Camila Rojas', role: 'Administrador', email: 'admin@nebula.cl', password: 'admin123' },
    'u-editor': { name: 'Tomás Vidal', role: 'Editor', email: 'editor@nebula.cl', password: 'editor123' },
    'u-sales': { name: 'Antonia Muñoz', role: 'Ventas', email: 'ventas@nebula.cl', password: 'ventas123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'editor', label: 'Editor', desc: 'Gestión de contenidos: páginas, portafolio, equipo, blog, medios y talento.' },
    { id: 'ventas', label: 'Ventas', desc: 'Bandeja y pipeline de leads y cotizaciones que llegan desde el sitio.' },
    { id: 'admin', label: 'Administrador', desc: 'Todo lo anterior más ajustes del sitio, usuarios y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Editorial" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'bauhaus', group: 'Estilo', label: 'Bauhaus', desc: 'Geometría y colores primarios.', theme: 'bauhaus' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Página de inicio del estudio con titular de palabras rotativas, servicios, cifras, trabajos destacados, proceso, testimonios y últimos artículos. Cada bloque se edita y se puede ocultar desde el panel.',
      actions: ['Ver los servicios con su precio de referencia', 'Recorrer los proyectos destacados', 'Leer testimonios de clientes en un carrusel', 'Ir al cotizador o al formulario de contacto', 'Suscribirse al boletín desde el pie de página']
    },
    {
      id: 'trabajos', section: 'publico', title: 'Portafolio', url: 'index.html#/trabajos', waitFor: '[data-grid] .card', mobile: true,
      description: 'Listado de proyectos publicados con filtro por categoría y buscador por proyecto o cliente.',
      actions: ['Filtrar por branding, web, motion, packaging o estrategia', 'Buscar por nombre de proyecto o cliente', 'Ver cuántos proyectos hay en cada categoría', 'Abrir el caso completo de un proyecto']
    },
    {
      id: 'proyecto', section: 'publico', title: 'Caso de estudio', url: 'index.html#/trabajos/lumbre-cafe', waitFor: '.project-page',
      description: 'Ficha de un proyecto con el desafío, la respuesta del estudio, galería de imágenes, resultados y el testimonio del cliente.',
      actions: ['Leer el desafío y la solución propuesta', 'Recorrer la galería del proyecto', 'Ver los resultados medidos y el testimonio del cliente', 'Pasar a otros proyectos o pedir una cotización']
    },
    {
      id: 'estudio', section: 'publico', title: 'El estudio', url: 'index.html#/estudio', waitFor: '.team-grid',
      description: 'Presentación del estudio con sus cifras, el equipo, el proceso de trabajo y los clientes con los que ha trabajado.',
      actions: ['Conocer al equipo con cargo, biografía y habilidades', 'Revisar las etapas del proceso de trabajo', 'Ver la lista de clientes', 'Ir a Carreras o a Contacto']
    },
    {
      id: 'blog', section: 'publico', title: 'Blog', url: 'index.html#/blog', waitFor: '[data-grid] .card',
      description: 'Artículos y noticias del estudio con un artículo destacado arriba, filtros por categoría y buscador.',
      actions: ['Leer el artículo destacado', 'Filtrar por categoría', 'Buscar en el blog', 'Ver fecha y tiempo de lectura de cada artículo']
    },
    {
      id: 'articulo', section: 'publico', title: 'Artículo', url: 'index.html#/blog/design-systems-para-equipos-pequenos', waitFor: '.prose',
      description: 'Página de lectura de un artículo con autor, fecha, tiempo de lectura y artículos relacionados al final.',
      actions: ['Leer el artículo completo', 'Ver autor, categoría y etiquetas', 'Copiar el enlace para compartirlo', 'Seguir con artículos relacionados']
    },
    {
      id: 'carreras', section: 'publico', title: 'Carreras', url: 'index.html#/carreras', waitFor: '.job-row',
      description: 'Ofertas de trabajo abiertas del estudio, filtrables por área. Se publican y cierran desde el panel.',
      actions: ['Filtrar ofertas por área', 'Ver ubicación, modalidad y tipo de jornada', 'Abrir el detalle de una oferta para postular']
    },
    {
      id: 'oferta', section: 'publico', title: 'Oferta y postulación', url: 'index.html#/carreras/disenador-a-de-producto-senior', waitFor: '[data-apply]', mobile: true,
      description: 'Detalle de una oferta con renta, requisitos y formulario de postulación. Cada postulación llega a la sección Postulantes del panel.',
      actions: ['Revisar descripción, requisitos y renta', 'Dejar nombre, correo y teléfono', 'Indicar portafolio o LinkedIn y adjuntar CV', 'Contar por qué quiere trabajar en el estudio', 'Enviar la postulación']
    },
    {
      id: 'oferta-enviada', section: 'publico', title: 'Postulación recibida', url: 'index.html#/carreras/disenador-a-de-producto-senior', waitFor: '[data-apply]',
      setup: async h => {
        await h.fill('#ap-name', 'Martina Soto Araya'); await h.fill('#ap-email', 'martina.soto@gmail.com'); await h.fill('#ap-phone', '+56 9 6543 2109');
        await h.fill('#ap-port', 'behance.net/martinasoto'); await h.check('[data-apply] [name="ok"]'); await h.click('[data-apply] button.btn-primary'); await h.wait('.apply-card .success-box');
      },
      description: 'Confirmación que reemplaza el formulario al enviar la postulación, con el plazo de respuesta del estudio.',
      actions: ['Confirmar que la postulación fue recibida', 'Saber en cuánto tiempo responden', 'Volver a las ofertas']
    },
    {
      id: 'contacto', section: 'publico', title: 'Contacto', url: 'index.html#/contacto', waitFor: '[data-contact]', mobile: true,
      description: 'Formulario de contacto con tipo de proyecto y presupuesto aproximado, junto a los datos del estudio. Cada mensaje entra como lead al panel.',
      actions: ['Dejar nombre, correo, empresa y teléfono', 'Elegir el tipo de proyecto', 'Indicar un rango de presupuesto', 'Escribir el mensaje y enviarlo', 'Ir al cotizador para obtener un número rápido']
    },
    {
      id: 'contacto-enviado', section: 'publico', title: 'Mensaje enviado', url: 'index.html#/contacto', waitFor: '[data-contact]',
      setup: async h => {
        await h.fill('#ct-name', 'Martín Soto Araya'); await h.fill('#ct-email', 'martin@lumbre.cl'); await h.fill('#ct-company', 'Lumbre Café');
        await h.select('#ct-svc', { index: 2 }); await h.fill('#ct-msg', 'Queremos renovar la marca y el sitio antes de abrir nuestra segunda tienda.');
        await h.check('[data-contact] [name="ok"]'); await h.click('[data-contact] button.btn-primary'); await h.wait('.contact-card .success-box');
      },
      description: 'Confirmación del envío con el plazo de respuesta. El mensaje queda como lead nuevo en la bandeja de ventas.',
      actions: ['Confirmar que el mensaje llegó', 'Saber cuándo responderán', 'Seguir viendo trabajos del estudio']
    },
    {
      id: 'cotizador', section: 'publico', title: 'Cotizador: servicios', url: 'index.html#/cotizar', waitFor: '.wizard',
      setup: async h => { await quoteTo(h, 0); },
      description: 'Primer paso del cotizador en línea: se eligen uno o varios servicios y la estimación lateral se recalcula al instante.',
      actions: ['Elegir uno o varios servicios', 'Ver el precio desde de cada servicio', 'Seguir la estimación en el panel lateral', 'Avanzar por los 5 pasos del cotizador']
    },
    {
      id: 'cotizador-alcance', section: 'publico', title: 'Cotizador: alcance y extras', url: 'index.html#/cotizar', waitFor: '.wizard',
      setup: async h => { await quoteTo(h, 1); },
      description: 'Paso de tamaño del proyecto (cada tamaño aplica un multiplicador) y extras opcionales como redacción, fotografía o mantención.',
      actions: ['Elegir el tamaño del proyecto', 'Sumar extras con su precio', 'Ver cómo cambia el rango estimado']
    },
    {
      id: 'cotizador-plazos', section: 'publico', title: 'Cotizador: plazos', url: 'index.html#/cotizar', waitFor: '.wizard',
      setup: async h => { await quoteTo(h, 2); },
      description: 'Paso de plazos con la opción de marcar el proyecto como urgente, que suma un recargo porcentual.',
      actions: ['Elegir el plazo deseado', 'Marcar el proyecto como urgente', 'Ver el recargo por urgencia en la estimación']
    },
    {
      id: 'cotizador-resumen', section: 'publico', title: 'Cotizador: resumen', url: 'index.html#/cotizar', waitFor: '.wizard',
      setup: async h => { await quoteTo(h, 4); },
      description: 'Último paso con el resumen de servicios, alcance, plazo, datos de contacto y el rango estimado antes de enviar.',
      actions: ['Revisar todo lo elegido', 'Ver el rango de presupuesto más IVA', 'Volver atrás para corregir', 'Enviar la solicitud']
    },
    {
      id: 'cotizador-enviado', section: 'publico', title: 'Cotización enviada', url: 'index.html#/cotizar', waitFor: '.wizard',
      setup: async h => { await quoteTo(h, 4); await h.click('[data-next]'); await h.wait('.success-box'); await h.page.evaluate(() => window.scrollTo(0, 0)); },
      description: 'Confirmación con folio y rango estimado. La solicitud llega a la bandeja de leads con todo el detalle del cotizador.',
      actions: ['Ver el folio de la solicitud', 'Revisar el rango estimado', 'Saber en cuánto tiempo los contactarán']
    },
    {
      id: 'login', section: 'publico', title: 'Acceso del equipo', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso al panel de gestión para el equipo del estudio. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, editor o ventas', 'Volver al sitio']
    },

    // ================= Editor =================
    {
      id: 'escritorio-editor', section: 'editor', login: U.editor, title: 'Escritorio del editor', url: 'admin.html#/', waitFor: '.admin-content .kpis',
      description: 'Resumen del sitio para el rol editor: visitas, leads del mes, proyectos publicados, postulaciones nuevas, artículos más leídos y accesos rápidos.',
      actions: ['Ver visitas semanales y leads por estado', 'Revisar proyectos publicados y postulaciones nuevas', 'Ver los artículos más leídos', 'Ir directo a editar la portada o crear contenido']
    },
    {
      id: 'paginas-portada', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: portada', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      description: 'Editor de la portada del sitio: antetítulo, título principal, palabras rotativas y bajada. Los cambios se publican al guardar.',
      actions: ['Editar el titular y la bajada', 'Definir las palabras que rotan en el título', 'Guardar y publicar al instante', 'Pasar a las otras pestañas de contenido']
    },
    {
      id: 'paginas-cifras', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: cifras', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="stats"]'); },
      description: 'Lista editable de las cifras del estudio que aparecen en la portada y en la página Estudio.',
      actions: ['Editar etiqueta, valor y sufijo de cada cifra', 'Agregar o quitar cifras', 'Guardar y publicar']
    },
    {
      id: 'paginas-estudio', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: estudio y llamado final', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="about"]'); },
      description: 'Textos del bloque "El estudio" (portada y página Estudio) y del llamado final a contactar, que también encabeza la página de Contacto.',
      actions: ['Editar título y párrafos del estudio', 'Editar el título y texto del llamado final', 'Guardar y publicar']
    },
    {
      id: 'paginas-proceso', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: proceso', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="process"]'); },
      description: 'Etapas del proceso de trabajo con título, descripción y duración, que se muestran en la portada y en Estudio.',
      actions: ['Editar cada etapa del proceso', 'Agregar una etapa nueva', 'Guardar y publicar']
    },
    {
      id: 'paginas-servicios', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: servicios', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="services"]'); await h.wait('.admin-content table'); },
      description: 'Servicios del estudio con su precio base, que alimentan la portada, el formulario de contacto y el cotizador.',
      actions: ['Crear, editar o eliminar servicios', 'Cambiar el precio base que usa el cotizador', 'Mostrar u ocultar un servicio con un interruptor', 'Filtrar por visibles u ocultos']
    },
    {
      id: 'paginas-servicio-modal', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Botón "Nuevo servicio" o editar en Páginas → Servicios', title: 'Editar servicio', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="services"]'); await h.click(firstRow + ' >> [data-act="edit"]'); await h.modal(); },
      description: 'Formulario de un servicio con nombre, ícono, descripción, etiquetas, precio base, orden y visibilidad.',
      actions: ['Editar nombre, ícono y descripción', 'Definir etiquetas y precio base', 'Cambiar el orden en el sitio', 'Ocultarlo sin eliminarlo']
    },
    {
      id: 'paginas-clientes', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: clientes', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="clients"]'); },
      description: 'Lista de clientes que aparecen en la banda de la portada y en la página Estudio.',
      actions: ['Agregar un cliente por nombre', 'Subir o bajar su posición', 'Ocultar o eliminar clientes']
    },
    {
      id: 'paginas-bloques', section: 'editor', login: U.editor, roles: ED, title: 'Páginas: secciones visibles', url: 'admin.html#/paginas', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="blocks"]'); },
      description: 'Interruptores para mostrar u ocultar cada bloque de la portada (servicios, cifras, trabajos, estudio, proceso, testimonios, clientes, blog y llamado final) y la barra de anuncio superior con su texto.',
      actions: ['Activar o desactivar bloques de la portada', 'Mostrar u ocultar la barra de anuncio y editar su texto', 'Guardar y ver el cambio en el sitio', 'Armar portadas más cortas o más completas']
    },
    {
      id: 'proyectos', section: 'editor', login: U.editor, roles: ED, title: 'Proyectos', url: 'admin.html#/proyectos', waitFor: '.admin-content table',
      description: 'Portafolio del estudio en una tabla con categoría, año, destacado y estado de publicación.',
      actions: ['Buscar y filtrar por categoría, estado o destacado', 'Marcar proyectos como destacados en la portada', 'Duplicar, ocultar o eliminar proyectos', 'Editar las categorías del portafolio', 'Crear un proyecto nuevo']
    },
    {
      id: 'proyectos-categorias', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Botón "Categorías" en Proyectos', title: 'Categorías del portafolio', url: 'admin.html#/proyectos', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-cats]'); await h.modal(); },
      description: 'Ventana para renombrar las categorías del portafolio y agregar una nueva. Muestra cuántos proyectos tiene cada una.',
      actions: ['Renombrar categorías existentes', 'Ver cuántos proyectos usa cada una', 'Agregar una categoría nueva']
    },
    {
      id: 'proyecto-editor', section: 'editor', login: U.editor, roles: ED, title: 'Editor de proyecto', url: 'admin.html#/proyectos/p-lumbre-cafe', waitFor: '.admin-content [data-f]',
      description: 'Formulario completo de un caso de estudio: datos, textos, resultados, galería, publicación y portada.',
      actions: ['Editar título, cliente, categoría, año y URL amigable', 'Escribir el desafío y la respuesta', 'Agregar indicadores de resultados', 'Armar la galería de imágenes', 'Publicar, destacar u ordenar el proyecto']
    },
    {
      id: 'proyecto-galeria', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Botón "Agregar imagen" en el editor de proyecto', title: 'Agregar imagen a la galería', url: 'admin.html#/proyectos/p-lumbre-cafe', waitFor: '.admin-content [data-f]',
      setup: async h => { await h.click('[data-add-g]'); await h.modal(); },
      description: 'Ventana para sumar una imagen a la galería del proyecto con su pie de foto. En la demo las imágenes son ilustraciones generadas con los colores del estilo.',
      actions: ['Escribir el pie de foto', 'Elegir los colores de la ilustración', 'Elegir la composición', 'Agregarla a la galería']
    },
    {
      id: 'equipo', section: 'editor', login: U.editor, roles: ED, title: 'Equipo', url: 'admin.html#/equipo', waitFor: '.admin-content table',
      description: 'Personas del estudio que aparecen en la página Estudio, con cargo, habilidades y visibilidad.',
      actions: ['Agregar un integrante nuevo', 'Editar cargo, biografía y habilidades', 'Ocultar o mostrar personas en el sitio', 'Cambiar el orden']
    },
    {
      id: 'equipo-modal', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Fila de la tabla Equipo', title: 'Editar integrante', url: 'admin.html#/equipo', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Formulario de un integrante con nombre, cargo, biografía, habilidades, color del avatar, orden, LinkedIn y visibilidad.',
      actions: ['Editar los datos del integrante', 'Elegir el color del avatar', 'Agregar su LinkedIn', 'Ocultarlo del sitio']
    },
    {
      id: 'testimonios', section: 'editor', login: U.editor, roles: ED, title: 'Testimonios', url: 'admin.html#/testimonios', waitFor: '.admin-content table',
      description: 'Citas de clientes que se muestran en el carrusel de la portada y en la ficha de cada proyecto.',
      actions: ['Crear un testimonio nuevo', 'Editar cita, autor, empresa y nota', 'Publicar o dejar en borrador', 'Ordenar o eliminar testimonios']
    },
    {
      id: 'testimonio-modal', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Botón "Nuevo testimonio" o fila de la tabla', title: 'Editar testimonio', url: 'admin.html#/testimonios', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Formulario del testimonio con la cita, autor, cargo, empresa, calificación, proyecto asociado, orden y estado de publicación.',
      actions: ['Escribir o corregir la cita', 'Indicar autor, cargo y empresa', 'Asignar una calificación de 1 a 5', 'Publicarlo o dejarlo como borrador']
    },
    {
      id: 'blog-lista', section: 'editor', login: U.editor, roles: ED, title: 'Blog y noticias', url: 'admin.html#/blog', waitFor: '.admin-content table',
      description: 'Artículos del blog con categoría, fecha, lecturas y estado (publicado, borrador o programado).',
      actions: ['Buscar y filtrar por estado o categoría', 'Publicar al instante o pasar a borrador', 'Ver cuántas lecturas tiene cada artículo', 'Crear o editar un artículo']
    },
    {
      id: 'blog-editor', section: 'editor', login: U.editor, roles: ED, title: 'Editor de artículo', url: 'admin.html#/blog/b-2', waitFor: '.admin-content [data-f]',
      description: 'Editor de un artículo con vista previa en vivo, fecha de publicación (si es futura queda programado), categoría, autor, etiquetas e imagen de portada.',
      actions: ['Escribir título, bajada y contenido', 'Ver la vista previa y el conteo de palabras', 'Programar la publicación con fecha futura', 'Elegir categoría, autor y etiquetas', 'Marcar como destacado y elegir la portada']
    },
    {
      id: 'medios', section: 'editor', login: U.editor, roles: ED, title: 'Biblioteca de medios', url: 'admin.html#/medios', waitFor: '.admin-content .card',
      description: 'Archivos del sitio organizados por carpeta, con el espacio usado y buscador.',
      actions: ['Subir imágenes desde el computador', 'Generar una ilustración nueva', 'Buscar archivos y filtrar por carpeta', 'Editar el texto alternativo o eliminar un archivo']
    },
    {
      id: 'medios-generar', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Botón "Generar ilustración" en Biblioteca de medios', title: 'Generar ilustración', url: 'admin.html#/medios', waitFor: '.admin-content .card',
      setup: async h => { await h.click('[data-gen]'); await h.modal(); },
      description: 'Ventana para crear una ilustración de la demo eligiendo colores y composición, y guardarla en una carpeta con su texto alternativo.',
      actions: ['Nombrar el archivo y elegir la carpeta', 'Elegir dos colores y la composición', 'Escribir el texto alternativo']
    },
    {
      id: 'ofertas', section: 'editor', login: U.editor, roles: ED, title: 'Ofertas de trabajo', url: 'admin.html#/ofertas', waitFor: '.admin-content table',
      description: 'Ofertas de la página Carreras con tipo, número de postulantes, fecha y estado (abierta, cerrada o borrador).',
      actions: ['Crear una oferta nueva', 'Abrir o cerrar una oferta', 'Ver cuántas postulaciones nuevas tiene cada una', 'Filtrar por estado o modalidad']
    },
    {
      id: 'oferta-modal', section: 'editor', login: U.editor, roles: ED, kind: 'modal', from: 'Botón "Nueva oferta" o fila de la tabla', title: 'Editar oferta', url: 'admin.html#/ofertas', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Formulario de la oferta con cargo, área, ubicación, modalidad, tipo, renta, estado, descripción y requisitos.',
      actions: ['Definir cargo, área y ubicación', 'Elegir modalidad, tipo de jornada y renta', 'Escribir descripción y requisitos', 'Publicarla, cerrarla o dejarla en borrador']
    },
    {
      id: 'postulantes', section: 'editor', login: U.editor, roles: ED, title: 'Postulantes', url: 'admin.html#/postulantes', waitFor: '.admin-content table',
      description: 'Postulaciones recibidas desde Carreras con la oferta, evaluación, fecha y estado del proceso.',
      actions: ['Filtrar por oferta o estado', 'Buscar por nombre o correo', 'Abrir la ficha de un postulante', 'Exportar a CSV']
    },
    {
      id: 'postulante-ficha', section: 'editor', login: U.editor, roles: ED, title: 'Ficha del postulante', url: 'admin.html#/postulantes/a-1', waitFor: '.admin-content .detail-grid',
      description: 'Detalle de una postulación con datos de contacto, portafolio, CV, mensaje, notas del equipo y evaluación.',
      actions: ['Mover la postulación entre etapas (revisión, entrevista, oferta)', 'Evaluar con estrellas', 'Agregar notas internas', 'Invitar a entrevista', 'Eliminar la postulación']
    },

    // ================= Ventas =================
    {
      id: 'escritorio-ventas', section: 'ventas', login: U.ventas, title: 'Escritorio comercial', url: 'admin.html#/', waitFor: '.admin-content .kpis', mobile: true,
      description: 'Resumen para ventas: visitas, leads del mes, monto ganado, pipeline abierto, ingresos por mes, origen de los leads y últimos leads recibidos.',
      actions: ['Ver leads e ingresos ganados del mes', 'Revisar el pipeline abierto y la conversión', 'Ver de dónde llegan los leads', 'Abrir los últimos leads']
    },
    {
      id: 'leads', section: 'ventas', login: U.ventas, roles: VE, title: 'Bandeja de leads', url: 'admin.html#/leads', waitFor: '.admin-content table',
      description: 'Todos los contactos y cotizaciones del sitio en una tabla con servicio, valor, responsable, fecha y estado.',
      actions: ['Filtrar por estado, tipo, responsable u origen', 'Buscar por nombre, empresa o servicio', 'Cambiar a la vista de pipeline', 'Crear un lead manual', 'Exportar a CSV']
    },
    {
      id: 'leads-pipeline', section: 'ventas', login: U.ventas, roles: VE, title: 'Pipeline de leads', url: 'admin.html#/leads', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-view="kanban"]'); await h.wait('.kanban'); },
      description: 'Tablero kanban con una columna por estado, desde nuevo hasta ganado o perdido. Las tarjetas se arrastran entre columnas para cambiar el estado.',
      actions: ['Arrastrar leads entre etapas', 'Ver el valor acumulado de cada columna', 'Abrir la ficha de un lead']
    },
    {
      id: 'lead-ficha', section: 'ventas', login: U.ventas, roles: VE, title: 'Ficha del lead', url: 'admin.html#/leads', waitFor: '.admin-content table',
      setup: async h => { await h.select('[data-f="type"]', 'cotizacion'); await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content .detail-grid'); return { url: h.here() }; },
      description: 'Detalle de un lead con sus datos, lo que eligió en el cotizador, notas de seguimiento, responsable y valor del negocio.',
      actions: ['Avanzar el estado o elegir cualquier etapa', 'Asignar responsable y valor del negocio', 'Agregar notas de seguimiento', 'Enviar un correo (simulado)', 'Generar una propuesta en PDF (simulado)']
    },
    {
      id: 'lead-correo', section: 'ventas', login: U.ventas, roles: VE, kind: 'modal', from: 'Botón "Enviar correo" en la ficha del lead', title: 'Correo al lead', url: 'admin.html#/leads', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content .detail-grid'); await h.click('[data-mail]'); await h.modal(); return { url: h.here() }; },
      description: 'Correo prellenado para el lead con asunto y mensaje editables. Al enviarlo queda registrado en las notas y el lead pasa a "Contactado".',
      actions: ['Editar destinatario, asunto y mensaje', 'Enviar el correo (simulado)', 'Dejar el envío registrado en el seguimiento']
    },
    {
      id: 'lead-nuevo', section: 'ventas', login: U.ventas, roles: VE, kind: 'modal', from: 'Botón "Nuevo lead" en Leads', title: 'Nuevo lead manual', url: 'admin.html#/leads', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para registrar un lead que llegó por otro canal (referido, LinkedIn, evento) con servicio, valor y responsable.',
      actions: ['Ingresar nombre, empresa, correo y teléfono', 'Elegir servicio y valor estimado', 'Indicar el origen y el responsable', 'Dejar notas iniciales']
    },
    {
      id: 'ventas-restringido', section: 'ventas', login: U.ventas, title: 'Ruta protegida por rol', url: 'admin.html#/proyectos', waitFor: '.admin-content .empty',
      description: 'Lo que ve una persona de ventas si intenta abrir una sección de contenidos que no corresponde a su rol.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a las secciones permitidas desde el menú', 'Confirmar que cada rol solo ve sus menús']
    },

    // ================= Administrador =================
    {
      id: 'escritorio-admin', section: 'admin', login: U.admin, title: 'Escritorio del administrador', url: 'admin.html#/', waitFor: '.admin-content .kpis',
      description: 'Escritorio con los indicadores comerciales y de contenido juntos, el menú completo y la actividad reciente del sistema.',
      actions: ['Ver visitas, leads, monto ganado y pipeline', 'Revisar últimos leads y actividad reciente', 'Usar los accesos rápidos de contenido', 'Buscar en todo el panel desde la barra superior']
    },
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Ajustes del sitio', url: 'admin.html#/ajustes', waitFor: '.admin-content [data-save]',
      description: 'Identidad, contacto, redes, SEO con vista previa en buscadores, reglas del cotizador y modo mantenimiento.',
      actions: ['Editar nombre, bajada y datos de contacto', 'Configurar redes sociales', 'Ajustar título y descripción SEO con vista previa', 'Cambiar multiplicadores y recargo del cotizador', 'Activar el modo mantenimiento']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas del equipo con rol, último acceso y estado, más la matriz de permisos que muestra qué secciones ve cada rol. El rol se cambia directo en la tabla.',
      actions: ['Crear una cuenta nueva', 'Cambiar el rol desde la tabla', 'Activar o desactivar cuentas', 'Filtrar por rol o estado', 'Revisar la matriz de permisos por sección']
    },
    {
      id: 'usuario-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario" en Usuarios y roles', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de una cuenta del equipo con nombre, cargo, correo, rol, contraseña y estado.',
      actions: ['Ingresar nombre, cargo y correo', 'Asignar rol (administrador, editor o ventas)', 'Definir la contraseña', 'Dejar la cuenta activa o inactiva']
    },
    {
      id: 'bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/actividad', waitFor: '.admin-content table',
      setup: async h => {
        // La base recién sembrada parte casi vacía: se generan algunos eventos reales antes de abrirla.
        await h.goto('index.html#/contacto', '[data-contact]');
        await h.fill('#ct-name', 'Martín Soto Araya'); await h.fill('#ct-email', 'martin@lumbre.cl'); await h.fill('#ct-company', 'Lumbre Café');
        await h.select('#ct-svc', { index: 2 }); await h.fill('#ct-msg', 'Queremos renovar la marca.'); await h.check('[data-contact] [name="ok"]');
        await h.click('[data-contact] button.btn-primary'); await h.wait('.success-box');
        await h.goto('index.html#/cotizar', '.wizard'); await quoteTo(h, 4); await h.click('[data-next]'); await h.wait('.success-box');
        await h.goto('admin.html#/proyectos', '.admin-content table'); await h.click(firstRow + ' >> [data-act="star"]');
        await h.goto('admin.html#/actividad', '.admin-content table');
      },
      description: 'Registro de lo que pasa en el sistema: leads y postulaciones que llegan desde el sitio y cambios hechos por el equipo.',
      actions: ['Filtrar por tipo de acción o usuario', 'Buscar en el detalle', 'Exportar a CSV']
    }
  ]
};
