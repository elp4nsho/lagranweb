// Biblioteca de vistas de Academia Faro (/academia): sitio de cursos con carrito y checkout, aula del
// estudiante, app del instructor y panel de administración/soporte.
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', soporte: 'u-soporte', instructor: 'i-diego', estudiante: 'u-sofia' };
const PANEL = ['Soporte', 'Administrador'];
const COURSE = 'index.html#/curso/javascript-moderno';
const LESSON = 'aprender.html#/curso/k14/l14-2';
const firstRow = '.admin-content tbody tr >> nth=0';

// Agrega un curso al carrito y aplica un cupón (el carrito se guarda en el navegador).
async function fillCart(h) {
  await h.goto(COURSE, '[data-cart]');
  await h.click('[data-cart]');
  await h.goto('index.html#/carrito', '[data-coupon]');
  await h.fill('[data-coupon] [name="code"]', 'FARO10');
  await h.click('[data-coupon] button', { after: 400 });
}

module.exports = {
  dir: 'academia',
  name: 'Academia Faro',
  kind: 'Plataforma de cursos online',
  theme: 'memphis',
  description: 'Marketplace de cursos online con catálogo, ficha de curso, carrito con cupones y pago simulado, aula del estudiante con reproductor, quizzes y certificados, app del instructor para crear cursos y ver ganancias, y panel de administración con revisión de cursos, pedidos, reembolsos, pagos y moderación.',
  accounts: {
    'u-admin': { name: 'Ana Torres', role: 'Administrador', email: 'admin@faro.cl', password: 'admin123' },
    'u-soporte': { name: 'Pablo Reyes', role: 'Soporte', email: 'soporte@faro.cl', password: 'sop123' },
    'i-diego': { name: 'Diego Fuentes', role: 'Instructor', email: 'instructor@faro.cl', password: 'inst123' },
    'u-sofia': { name: 'Sofía Muñoz', role: 'Estudiante', email: 'estudiante@faro.cl', password: 'est123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante: catálogo, fichas de curso, instructores y verificación de certificados.' },
    { id: 'estudiante', label: 'Estudiante', desc: 'Compra de cursos y aula personal: progreso, reproductor, certificados y pedidos.' },
    { id: 'instructor', label: 'Instructor', desc: 'App para crear cursos, armar el currículo, atender estudiantes y ver ganancias.' },
    { id: 'soporte', label: 'Soporte', desc: 'Atención de pedidos, reembolsos, reseñas y preguntas de la comunidad.' },
    { id: 'admin', label: 'Administrador', desc: 'Catálogo, revisión de cursos, cupones, pagos a instructores, usuarios y CMS.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Memphis" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'aurora', group: 'Estilo', label: 'Aurora', desc: 'Degradados suaves y luminosos.', theme: 'aurora' },
      { id: 'terminal', group: 'Estilo', label: 'Terminal', desc: 'Monoespaciado sobre fondo oscuro.', theme: 'terminal' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Inicio de la academia con banners rotativos, categorías, cursos destacados y llamados a explorar el catálogo o enseñar. Todo se administra desde el CMS del panel.',
      actions: ['Buscar un curso desde la portada', 'Recorrer los banners de campañas', 'Entrar a una categoría', 'Ver los cursos destacados y más populares']
    },
    {
      id: 'catalogo', section: 'publico', title: 'Catálogo de cursos', url: 'index.html#/cursos', waitFor: '.course-card', mobile: true,
      description: 'Todos los cursos publicados con filtros combinables y orden. El estado de los filtros queda en la dirección, así que se puede compartir.',
      actions: ['Buscar por título o tema', 'Filtrar por categoría, nivel, precio y valoración', 'Ordenar por popularidad, valoración o precio', 'Limpiar los filtros', 'Abrir la ficha de un curso']
    },
    {
      id: 'categorias', section: 'publico', title: 'Categorías', url: 'index.html#/categorias', waitFor: 'main h1',
      description: 'Las áreas temáticas del catálogo con la cantidad de cursos de cada una.',
      actions: ['Ver todas las categorías', 'Comparar cuántos cursos tiene cada una', 'Entrar al catálogo filtrado por una categoría']
    },
    {
      id: 'curso', section: 'publico', title: 'Ficha del curso', url: COURSE, waitFor: '[data-cart]', mobile: true,
      description: 'Página de venta del curso con lo que se aprende, temario por secciones, instructor, reseñas, lecciones de muestra y precio.',
      actions: ['Revisar el temario y la duración', 'Ver lecciones de muestra gratis', 'Leer las reseñas de estudiantes', 'Agregar al carrito o comprar ahora', 'Ver el perfil del instructor']
    },
    {
      id: 'curso-preview', section: 'publico', kind: 'modal', from: 'Botón de lección de muestra en la ficha del curso', title: 'Lección de muestra', url: COURSE, waitFor: '[data-cart]',
      setup: async h => { await h.click('[data-prev]'); await h.modal(); },
      description: 'Vista previa gratuita de una lección marcada como muestra, para conocer el estilo del curso antes de comprar.',
      actions: ['Ver la lección de muestra', 'Decidir la compra', 'Volver al temario']
    },
    {
      id: 'instructor-perfil', section: 'publico', title: 'Perfil del instructor', url: 'index.html#/instructor/i-diego', waitFor: 'main h1',
      description: 'Perfil público con biografía, cifras (estudiantes, valoración, cursos) y todos los cursos publicados del instructor.',
      actions: ['Conocer la trayectoria del instructor', 'Ver su valoración y número de estudiantes', 'Explorar sus cursos']
    },
    {
      id: 'ensena', section: 'publico', title: 'Enseña en Faro', url: 'index.html#/ensena', waitFor: 'main h1',
      description: 'Página para captar instructores: cómo funciona, reparto de ingresos y pasos para publicar un curso.',
      actions: ['Conocer el modelo de ingresos', 'Ver los pasos para publicar un curso', 'Postular como instructor']
    },
    {
      id: 'verificar', section: 'publico', title: 'Verificar certificado', url: 'index.html#/certificado/FARO-SOJ3DA', waitFor: 'main h1',
      description: 'Verificación pública de un certificado por su código: muestra a quién se emitió, el curso y la fecha.',
      actions: ['Ingresar el código del certificado', 'Comprobar que es auténtico', 'Ver estudiante, curso y fecha de emisión']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso y registro', url: 'login.html', waitFor: '.demo-account',
      description: 'Ingreso para estudiantes, instructores y equipo, registro de estudiantes nuevos y cuentas demo para cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Crear una cuenta de estudiante', 'Entrar con un clic a cada rol demo', 'Volver a la página que pidió ingresar']
    },

    // ================= Estudiante =================
    {
      id: 'carrito', section: 'estudiante', login: U.estudiante, title: 'Carrito', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => { await fillCart(h); },
      description: 'Carrito con los cursos elegidos, cupón de descuento aplicado y resumen del total antes de pagar.',
      actions: ['Revisar los cursos del carrito', 'Aplicar o quitar un cupón', 'Quitar cursos', 'Pasar al checkout']
    },
    {
      id: 'checkout', section: 'estudiante', login: U.estudiante, title: 'Checkout', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => {
        await fillCart(h); await h.goto('index.html#/checkout', '[data-pay]');
        await h.fill('#cn', '4242 4242 4242 4242'); await h.fill('#cx', '12/28'); await h.fill('#cv', '123'); await h.check('[data-pay] [name="terms"]');
      },
      description: 'Pago simulado con datos del comprador y elección de medio de pago (tarjeta, Webpay o transferencia). La tarjeta se valida con el algoritmo de Luhn y el resumen muestra el descuento del cupón.',
      actions: ['Confirmar nombre y correo', 'Ingresar la tarjeta de prueba', 'Ver el total con el cupón aplicado', 'Aceptar los términos', 'Pagar y obtener acceso inmediato']
    },
    {
      id: 'compra-ok', section: 'estudiante', login: U.estudiante, title: 'Compra confirmada', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => {
        await fillCart(h); await h.goto('index.html#/checkout', '[data-pay]');
        await h.fill('#cn', '4242 4242 4242 4242'); await h.fill('#cx', '12/28'); await h.fill('#cv', '123'); await h.check('[data-pay] [name="terms"]');
        await h.click('[data-submit]'); await h.page.waitForFunction(() => location.hash.startsWith('#/gracias/'), null, { timeout: 10000 }); await h.wait('main h1');
      },
      description: 'Confirmación de la compra con el número de pedido y acceso directo a los cursos recién comprados.',
      actions: ['Ver el número y detalle del pedido', 'Empezar el curso de inmediato', 'Seguir explorando el catálogo']
    },
    {
      id: 'aula', section: 'estudiante', login: U.estudiante, title: 'Mi aprendizaje', url: 'aprender.html#/', waitFor: 'main h1', mobile: true,
      description: 'Panel del estudiante con racha de estudio, puntos de experiencia, insignias, el curso para continuar y todos sus cursos con su avance.',
      actions: ['Continuar el último curso', 'Ver su racha, XP e insignias', 'Revisar el avance de cada curso', 'Ir a certificados y pedidos']
    },
    {
      id: 'reproductor', section: 'estudiante', login: U.estudiante, title: 'Reproductor del curso', url: LESSON, waitFor: 'main h1', mobile: true,
      description: 'Aula del curso con video simulado y su progreso, temario lateral con lecciones completadas y pestañas de resumen, notas, preguntas, recursos y reseña.',
      actions: ['Ver la lección y marcarla como completada', 'Navegar el temario por secciones', 'Tomar notas personales', 'Hacer preguntas al instructor', 'Descargar recursos y dejar una reseña']
    },
    {
      id: 'reproductor-quiz', section: 'estudiante', login: U.estudiante, title: 'Lección de quiz', url: 'aprender.html#/curso/k14/l14-6', waitFor: 'main h1',
      description: 'Quiz dentro del curso con preguntas de alternativas y corrección inmediata, que cuenta para el avance.',
      actions: ['Responder las preguntas', 'Ver las respuestas correctas', 'Repetir el quiz', 'Avanzar a la siguiente lección']
    },
    {
      id: 'reproductor-tarea', section: 'estudiante', login: U.estudiante, title: 'Lección de tarea', url: 'aprender.html#/curso/k14/l14-10', waitFor: 'main h1',
      description: 'Tarea práctica con enunciado y entrega, que el instructor revisa y califica desde su app.',
      actions: ['Leer el enunciado', 'Escribir o adjuntar la entrega', 'Enviarla al instructor', 'Ver la nota y el comentario cuando la corrija']
    },
    {
      id: 'reproductor-notas', section: 'estudiante', login: U.estudiante, title: 'Notas del curso', url: LESSON, waitFor: 'main h1',
      setup: async h => { await h.click('[data-tab="notas"]'); await h.fill('#note', 'Repasar la diferencia entre JOIN y LEFT JOIN antes del quiz.'); },
      description: 'Pestaña de notas personales asociadas al curso, que se guardan en la cuenta del estudiante.',
      actions: ['Escribir notas mientras estudia', 'Guardarlas para repasar después', 'Verlas junto a la lección']
    },
    {
      id: 'certificados', section: 'estudiante', login: U.estudiante, title: 'Mis certificados', url: 'aprender.html#/certificados', waitFor: 'main h1',
      description: 'Certificados obtenidos al completar cursos, con su código de verificación.',
      actions: ['Ver los certificados obtenidos', 'Abrir la versión imprimible', 'Compartir el código de verificación']
    },
    {
      id: 'certificado', section: 'estudiante', login: U.estudiante, title: 'Certificado imprimible', url: 'aprender.html#/certificado/cert-e-u-sofia-k0', waitFor: '[data-print]',
      description: 'Certificado de finalización listo para imprimir o guardar en PDF, con código verificable en el sitio público.',
      actions: ['Imprimir o guardar como PDF', 'Ver curso, horas y fecha de emisión', 'Copiar el código de verificación']
    },
    {
      id: 'pedidos', section: 'estudiante', login: U.estudiante, title: 'Mis pedidos', url: 'aprender.html#/pedidos', waitFor: 'main h1',
      description: 'Historial de compras con fecha, cursos, total y estado, y la opción de pedir reembolso dentro del plazo.',
      actions: ['Ver cada pedido y su estado', 'Solicitar un reembolso', 'Seguir el estado de una solicitud']
    },
    {
      id: 'reembolso', section: 'estudiante', login: U.estudiante, kind: 'modal', from: 'Botón "Solicitar reembolso" en Mis pedidos', title: 'Solicitar reembolso', url: 'aprender.html#/pedidos', waitFor: '[data-refund]',
      setup: async h => { await h.click('[data-refund]'); await h.modal(); },
      description: 'Solicitud de reembolso con su motivo. Soporte la revisa en el panel y, si se aprueba, se pierde el acceso a los cursos del pedido.',
      actions: ['Elegir el motivo', 'Agregar un comentario', 'Enviar la solicitud a soporte']
    },
    {
      id: 'notificaciones', section: 'estudiante', login: U.estudiante, title: 'Notificaciones', url: 'aprender.html#/notificaciones', waitFor: 'main h1',
      description: 'Avisos del estudiante: respuestas del instructor, tareas corregidas, certificados y estado de reembolsos.',
      actions: ['Leer los avisos', 'Ir al curso o pedido relacionado', 'Marcar todo como leído']
    },

    // ================= Instructor =================
    {
      id: 'inst-resumen', section: 'instructor', login: U.instructor, title: 'Resumen del instructor', url: 'instructor.html#/', waitFor: '.admin-content h1', mobile: true,
      description: 'Ingresos, matrículas, valoración promedio y actividad reciente de los cursos del instructor.',
      actions: ['Ver ingresos y matrículas del periodo', 'Seguir la valoración de sus cursos', 'Revisar la actividad reciente', 'Saltar a preguntas sin responder']
    },
    {
      id: 'inst-cursos', section: 'instructor', login: U.instructor, title: 'Mis cursos', url: 'instructor.html#/cursos', waitFor: '.admin-content table',
      description: 'Cursos del instructor con su estado (borrador, en revisión, publicado, archivado), estudiantes, valoración e ingresos.',
      actions: ['Crear un curso nuevo', 'Abrir el editor de cada curso', 'Ver estado, estudiantes y valoración', 'Enviar un borrador a revisión']
    },
    {
      id: 'inst-editor', section: 'instructor', login: U.instructor, title: 'Editor de curso', url: 'instructor.html#/cursos/k23', waitFor: '.admin-content h1',
      description: 'Editor con la información comercial del curso, su precio y el constructor de currículo por secciones y lecciones (video, lectura, quiz o tarea), con orden ajustable.',
      actions: ['Editar título, descripción, nivel y categoría', 'Definir precio y precio promocional', 'Agregar secciones y lecciones de distintos tipos', 'Ordenar lecciones con flechas', 'Enviar a revisión o despublicar']
    },
    {
      id: 'inst-estudiantes', section: 'instructor', login: U.instructor, title: 'Estudiantes', url: 'instructor.html#/estudiantes', waitFor: '.admin-content table',
      description: 'Estudiantes matriculados en los cursos del instructor con su avance y las tareas por corregir.',
      actions: ['Filtrar por curso', 'Ver el avance de cada estudiante', 'Corregir tareas entregadas', 'Exportar a CSV']
    },
    {
      id: 'inst-preguntas', section: 'instructor', login: U.instructor, title: 'Preguntas de estudiantes', url: 'instructor.html#/preguntas', waitFor: '.admin-content h1',
      description: 'Preguntas hechas desde el reproductor, con las que aún no tienen respuesta destacadas.',
      actions: ['Ver preguntas sin responder', 'Responder a cada estudiante', 'Filtrar por curso']
    },
    {
      id: 'inst-ganancias', section: 'instructor', login: U.instructor, title: 'Ganancias', url: 'instructor.html#/ganancias', waitFor: '.admin-content h1',
      description: 'Ventas del instructor con su parte de cada venta, ingresos por mes y pagos recibidos de la plataforma.',
      actions: ['Ver ingresos por mes', 'Revisar cada venta y su comisión', 'Ver pagos recibidos y pendientes', 'Exportar ventas a CSV']
    },

    // ================= Soporte =================
    {
      id: 'dashboard', section: 'soporte', login: U.soporte, roles: PANEL, title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content h1',
      description: 'Indicadores de la plataforma: ingresos, matrículas, tasa de finalización y cursos más vendidos.',
      actions: ['Ver ingresos y matrículas por mes', 'Seguir la tasa de finalización', 'Ver los cursos top']
    },
    {
      id: 'pedidos-admin', section: 'soporte', login: U.soporte, roles: PANEL, title: 'Pedidos y reembolsos', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      description: 'Todos los pedidos con estado (pagado, fallido, reembolso solicitado, reembolsado) y el flujo para aprobar o rechazar reembolsos.',
      actions: ['Filtrar por estado y buscar', 'Abrir el detalle de un pedido', 'Aprobar o rechazar reembolsos', 'Exportar a CSV']
    },
    {
      id: 'pedido-detalle', section: 'soporte', login: U.soporte, roles: PANEL, kind: 'modal', from: 'Clic en un pedido', title: 'Detalle del pedido', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Detalle del pedido con comprador, cursos, cupón, totales, pago y su historial.',
      actions: ['Ver cursos, descuentos y total', 'Revisar el estado del pago', 'Gestionar un reembolso']
    },
    {
      id: 'resenas', section: 'soporte', login: U.soporte, roles: PANEL, title: 'Moderación de reseñas', url: 'admin.html#/resenas', waitFor: '.admin-content h1',
      description: 'Reseñas pendientes y reportadas por la comunidad, para publicarlas u ocultarlas.',
      actions: ['Ver reseñas pendientes y reportadas', 'Publicar u ocultar reseñas', 'Filtrar por curso y estrellas']
    },
    {
      id: 'preguntas-admin', section: 'soporte', login: U.soporte, roles: PANEL, title: 'Preguntas de la comunidad', url: 'admin.html#/preguntas', waitFor: '.admin-content h1',
      description: 'Preguntas de todos los cursos, para responder las que el instructor no ha atendido u ocultar las inapropiadas.',
      actions: ['Ver preguntas sin respuesta', 'Responder en nombre de la academia', 'Ocultar preguntas inapropiadas']
    },
    {
      id: 'bitacora', section: 'soporte', login: U.soporte, roles: PANEL, title: 'Bitácora', url: 'admin.html#/actividad', waitFor: '.admin-content h1',
      // La semilla parte con la bitácora vacía: se registran algunas acciones reales antes de capturar.
      setup: async h => {
        await h.goto('admin.html#/resenas', '.admin-content table');
        await h.click('.admin-content button:has-text("Publicar")', { after: 400 });
        await h.click('.admin-content button:has-text("Ocultar")', { after: 400 });
        await h.goto('admin.html#/actividad', '.admin-content table');
      },
      description: 'Registro de actividad de la plataforma: compras, reembolsos, publicaciones, moderación y cambios del CMS.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'revision', section: 'admin', login: U.admin, title: 'Revisión de cursos', url: 'admin.html#/revision', waitFor: '[data-approve]',
      description: 'Cola de cursos enviados por instructores para revisión antes de publicarse.',
      actions: ['Ver el currículo completo del curso', 'Aprobar y publicar', 'Rechazar con comentarios para el instructor']
    },
    {
      id: 'revision-rechazar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Rechazar" en Revisión de cursos', title: 'Rechazar curso', url: 'admin.html#/revision', waitFor: '[data-approve]',
      setup: async h => { await h.click('[data-reject]'); await h.modal(); },
      description: 'Rechazo de un curso con el motivo, que el instructor recibe para corregir y volver a enviar.',
      actions: ['Marcar los motivos (audio, descripción incompleta, lección de muestra…)', 'Escribir un comentario para el instructor', 'Devolver el curso a borrador y notificarlo']
    },
    {
      id: 'cursos-admin', section: 'admin', login: U.admin, title: 'Cursos', url: 'admin.html#/cursos', waitFor: '.admin-content table',
      description: 'Todos los cursos de la plataforma con instructor, estado, precio, estudiantes y valoración.',
      actions: ['Filtrar por estado, categoría o instructor', 'Editar datos comerciales y precio', 'Destacar cursos en la portada', 'Archivar cursos']
    },
    {
      id: 'categorias-admin', section: 'admin', login: U.admin, title: 'Categorías', url: 'admin.html#/categorias', waitFor: '.admin-content table',
      description: 'Categorías que organizan el catálogo y los filtros del sitio.',
      actions: ['Crear y editar categorías', 'Ver cuántos cursos tiene cada una', 'Eliminar categorías sin cursos']
    },
    {
      id: 'cupones', section: 'admin', login: U.admin, title: 'Cupones', url: 'admin.html#/cupones', waitFor: '.admin-content table',
      description: 'Cupones de descuento por porcentaje o monto fijo, con límite de usos, vigencia y alcance.',
      actions: ['Crear cupones por porcentaje o monto', 'Limitar usos y fechas', 'Ver cuántas veces se usó cada uno', 'Activar o desactivar cupones']
    },
    {
      id: 'pagos', section: 'admin', login: U.admin, title: 'Pagos a instructores', url: 'admin.html#/pagos', waitFor: '.admin-content h1',
      description: 'Liquidación del mes para cada instructor, pagos pendientes y pagados.',
      actions: ['Ver lo que corresponde a cada instructor', 'Pagar los pendientes en lote', 'Revisar pagos anteriores', 'Exportar a CSV']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Estudiantes, instructores, soporte y administradores con su rol y estado.',
      actions: ['Buscar y filtrar por rol', 'Crear y editar usuarios', 'Cambiar el rol', 'Activar o desactivar cuentas']
    },
    {
      id: 'sitio', section: 'admin', login: U.admin, title: 'Sitio (CMS)', url: 'admin.html#/sitio', waitFor: '[data-def]',
      description: 'Editor del sitio público: portada, banners rotativos, cursos destacados, aviso superior y parámetros comerciales como la comisión del instructor.',
      actions: ['Editar los textos de la portada', 'Agregar y ordenar banners', 'Elegir los cursos destacados', 'Configurar el aviso y la comisión', 'Restaurar los textos por defecto']
    }
  ]
};
