// Biblioteca de vistas de Aquilo Pulse (/producto).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', marketing: 'u-mkt', soporte: 'u-sop' };
const firstRow = '.admin-content tbody tr >> nth=0';
const SOP = ['Soporte', 'Administrador'];
const MKT = ['Marketing', 'Administrador'];
const TODOS = ['Soporte', 'Marketing', 'Administrador'];

// Avanza el checkout hasta el paso indicado (1 pack … 5 listo).
async function checkoutTo(h, step) {
  if (step >= 2) await h.click('#next1', { after: 300 });
  if (step >= 3) {
    await h.fill('#s-name', 'Valentina Rojas Muñoz'); await h.fill('#s-email', 'valentina.rojas@correo.cl'); await h.fill('#s-phone', '+56 9 7123 4567');
    await h.select('#s-region', 'Metropolitana'); await h.fill('#s-address', 'Av. Italia 1450, depto 302'); await h.fill('#s-city', 'Ñuñoa');
    await h.click('#shipForm button[type="submit"]', { after: 300 });
  }
  if (step >= 4) {
    await h.fill('#p-num', '4242 4242 4242 4242'); await h.fill('#p-exp', '08/29'); await h.fill('#p-cvc', '123');
    await h.click('#payForm [data-pay]'); await h.wait('#upYes');
  }
  if (step >= 5) { await h.click('#upNo', { after: 300 }); }
  await h.pause(200);
  await h.page.evaluate(() => window.scrollTo(0, 0));
}

module.exports = {
  dir: 'producto',
  name: 'Aquilo Pulse',
  kind: 'Landing de producto único',
  theme: 'glass',
  description: 'Página de venta de un solo producto (una botella inteligente) con colores, reseñas, packs y cuenta regresiva, checkout en cinco pasos con order bump y upsell, seguimiento de pedidos y un panel con pedidos, inventario, CMS de la landing, pruebas A/B, cupones, afiliados y automatizaciones.',
  accounts: {
    'u-admin': { name: 'Camila Ortega', role: 'Administrador', email: 'admin@aquilo.cl', password: 'admin123' },
    'u-mkt': { name: 'Tomás Fuentes', role: 'Marketing', email: 'marketing@aquilo.cl', password: 'marketing123' },
    'u-sop': { name: 'Javiera Soto', role: 'Soporte', email: 'soporte@aquilo.cl', password: 'soporte123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Landing, checkout y seguimiento, sin iniciar sesión.' },
    { id: 'soporte', label: 'Soporte', desc: 'Pedidos, carritos abandonados, reseñas e inventario.' },
    { id: 'marketing', label: 'Marketing', desc: 'CMS de la landing, pruebas A/B, cupones, afiliados y automatizaciones.' },
    { id: 'admin', label: 'Administrador', desc: 'Todo lo anterior más usuarios, bitácora y ajustes.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Cristal" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '#heroTitle',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'candy', group: 'Estilo', label: 'Caramelo', desc: 'Colores dulces y formas redondeadas.', theme: 'candy' },
      { id: 'luxury', group: 'Estilo', label: 'Lujo', desc: 'Oscuro con dorados y serif elegante.', theme: 'luxury' },
      { id: 'memphis', group: 'Estilo', label: 'Memphis', desc: 'Formas geométricas y color pop.', theme: 'memphis' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Landing: portada', url: 'index.html', waitFor: '#heroTitle', mobile: true,
      description: 'Inicio de la página de venta con nota promedio, titular (que puede variar por prueba A/B), beneficios clave, precio desde y medios que hablaron del producto. Todo el contenido se edita en el CMS del panel.',
      actions: ['Leer la propuesta y los beneficios principales', 'Ver el precio de lanzamiento', 'Ir directo a comprar', 'Bajar a colores, reseñas, precios o preguntas frecuentes']
    },
    {
      id: 'beneficios', section: 'publico', title: 'Landing: beneficios', url: 'index.html', waitFor: '#heroTitle',
      setup: async h => { await h.scrollTo('#beneficios', 'start', -70); },
      description: 'Bloque de beneficios del producto con ícono y explicación breve. Se editan, agregan y reordenan desde el CMS.',
      actions: ['Revisar los beneficios principales', 'Entender cómo funciona la botella', 'Seguir bajando a colores y reseñas']
    },
    {
      id: 'comparativa', section: 'publico', title: 'Landing: comparativa', url: 'index.html', waitFor: '#compare',
      setup: async h => { await h.scrollTo('.sec-compare', 'start', -70); },
      description: 'Tabla que compara el producto con otras botellas punto por punto: recordatorio luminoso, medición del consumo, horas de frío, batería, lavavajillas, prueba sin riesgo y garantía.',
      actions: ['Comparar característica por característica', 'Ver en qué se diferencia de una botella común', 'Pasar a las reseñas']
    },
    {
      id: 'colores', section: 'publico', title: 'Landing: colores', url: 'index.html', waitFor: '#swatches button',
      setup: async h => { await h.click('#swatches button >> nth=2'); await h.scrollTo('#colores', 'start', -70); },
      description: 'Selector de color con la botella recoloreada, especificaciones y stock por color. Un color sin stock aparece como agotado y no se puede comprar.',
      actions: ['Elegir un color y verlo en la botella', 'Ver si queda poco stock', 'Revisar capacidad, peso, batería y resistencia', 'Comprar en el color elegido']
    },
    {
      id: 'resenas', section: 'publico', title: 'Landing: reseñas', url: 'index.html', waitFor: '#reviews',
      setup: async h => { await h.scrollTo('#resenas', 'start', -70); },
      description: 'Reseñas verificadas con puntaje promedio y distribución por estrellas; solo se muestran las aprobadas en el panel, las destacadas primero.',
      actions: ['Ver el puntaje y la distribución de notas', 'Leer reseñas con su color y fecha', 'Cargar más reseñas', 'Escribir una reseña']
    },
    {
      id: 'resena-modal', section: 'publico', kind: 'modal', from: 'Botón "Escribir una reseña" en la landing', title: 'Escribir una reseña', url: 'index.html', waitFor: '#reviews',
      setup: async h => { await h.click('#writeReview'); await h.modal(); },
      description: 'Formulario para dejar una reseña con nota, color comprado, título y comentario. Queda pendiente hasta que el equipo la aprueba.',
      actions: ['Elegir la nota de 1 a 5', 'Indicar el color de su botella', 'Escribir título y comentario', 'Enviarla a moderación']
    },
    {
      id: 'precios', section: 'publico', title: 'Landing: packs y oferta', url: 'index.html', waitFor: '#plans',
      setup: async h => { await h.scrollTo('#precios', 'start', -70); },
      description: 'Packs de 1, 2 o más botellas con precio de lanzamiento, ahorro, regalo, cuenta regresiva de la oferta y la garantía de devolución.',
      actions: ['Comparar packs y su ahorro', 'Ver cuánto queda de la oferta', 'Elegir un pack e ir al checkout', 'Revisar la garantía']
    },
    {
      id: 'faq', section: 'publico', title: 'Landing: preguntas frecuentes', url: 'index.html', waitFor: '#faqList',
      setup: async h => { await h.scrollTo('#faq', 'start', -70); },
      description: 'Preguntas frecuentes desplegables y el llamado final a comprar.',
      actions: ['Abrir cada pregunta', 'Resolver dudas de envío, garantía y uso', 'Comprar desde el cierre de la página']
    },
    {
      id: 'afiliado-modal', section: 'publico', kind: 'modal', from: 'Enlace "Programa de afiliados" del pie de página', title: 'Postular como afiliado', url: 'index.html', waitFor: '#heroTitle',
      setup: async h => { await h.click('#affApply'); await h.modal(); },
      description: 'Formulario para postular al programa de afiliados con nombre, canal y correo. La postulación queda pendiente de aprobación en el panel.',
      actions: ['Dejar nombre y correo', 'Indicar su canal (Instagram, blog, club)', 'Enviar la postulación']
    },
    {
      id: 'referido', section: 'publico', title: 'Visita referida por un afiliado', url: 'index.html?ref=FRAN', waitFor: '.ref-banner',
      description: 'Lo que ve quien llega con el enlace de un afiliado (?ref=CÓDIGO): un aviso de quién lo recomendó. La visita y la compra quedan atribuidas al afiliado por 30 días.',
      actions: ['Ver quién lo recomendó', 'Comprar con la atribución al afiliado', 'Seguir navegando la landing']
    },
    {
      id: 'checkout-pack', section: 'publico', title: 'Checkout: pack y colores', url: 'checkout.html', waitFor: '#next1', mobile: true,
      description: 'Primer paso del checkout: elegir el pack y el color de cada botella, con el resumen del pedido, cupón y totales al costado.',
      actions: ['Cambiar de pack', 'Elegir el color de cada botella', 'Aplicar un cupón de descuento', 'Continuar al envío']
    },
    {
      id: 'checkout-envio', section: 'publico', title: 'Checkout: envío', url: 'checkout.html', waitFor: '#next1',
      setup: async h => checkoutTo(h, 2),
      description: 'Datos de envío con región y comuna, y método estándar o express (gratis desde 2 botellas).',
      actions: ['Ingresar nombre, correo y teléfono', 'Escribir la dirección', 'Elegir envío estándar o express']
    },
    {
      id: 'checkout-pago', section: 'publico', title: 'Checkout: pago y order bump', url: 'checkout.html', waitFor: '#next1',
      setup: async h => { await checkoutTo(h, 3); await h.fill('#p-num', '4242 4242 4242 4242'); await h.check('#payForm [name="bump"]'); },
      description: 'Pago con tarjeta simulada (con vista previa de la tarjeta) y una oferta complementaria de un clic (order bump) antes de pagar.',
      actions: ['Ingresar los datos de la tarjeta', 'Sumar el kit complementario con un clic', 'Ver el total actualizado y pagar']
    },
    {
      id: 'checkout-upsell', section: 'publico', title: 'Checkout: oferta posterior al pago', url: 'checkout.html', waitFor: '#next1',
      setup: async h => checkoutTo(h, 4),
      description: 'Oferta de un clic que aparece después del pago aprobado (upsell), con elección de color. Se configura en el CMS.',
      actions: ['Elegir el color de la unidad extra', 'Agregarla al pedido con un clic', 'Rechazar la oferta y terminar']
    },
    {
      id: 'checkout-listo', section: 'publico', title: 'Pedido confirmado', url: 'checkout.html', waitFor: '#next1',
      setup: async h => checkoutTo(h, 5),
      description: 'Confirmación con número de pedido, detalle, envío y acceso al seguimiento. El pedido aparece al instante en el panel.',
      actions: ['Ver el número del pedido', 'Revisar lo comprado y el envío', 'Ir al seguimiento del pedido']
    },
    {
      id: 'seguimiento', section: 'publico', title: 'Seguimiento de pedido', url: 'seguimiento.html', waitFor: '#trackForm',
      setup: async h => { await h.click('#samples [data-n] >> nth=0'); await h.wait('#result .card'); await h.page.evaluate(() => window.scrollTo(0, 0)); },
      description: 'Búsqueda de un pedido con su número y correo, con la línea de tiempo del envío, el historial y el detalle de la compra.',
      actions: ['Buscar el pedido con número y correo', 'Ver en qué etapa va', 'Revisar el historial y el detalle', 'Probar con los pedidos de ejemplo']
    },
    {
      id: 'login', section: 'publico', title: 'Acceso del equipo', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso al panel para el equipo. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, marketing o soporte', 'Volver a la landing']
    },

    // ================= Soporte =================
    {
      id: 'dashboard', section: 'soporte', login: U.soporte, roles: TODOS, title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: '.admin-content .kpis', mobile: true,
      description: 'Resumen del negocio: ingresos, embudo de conversión de la landing, unidades por color, pedidos por pack, ingresos por mes, alertas, últimos pedidos y actividad reciente.',
      actions: ['Ver ingresos y conversión', 'Revisar qué colores y packs se venden más', 'Atender las alertas de stock y moderación', 'Abrir los últimos pedidos']
    },
    {
      id: 'pedidos', section: 'soporte', login: U.soporte, roles: SOP, title: 'Pedidos', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      description: 'Pedidos con número, cliente, pack, total, origen (afiliado, cupón) y estado, con avance rápido de estado desde la tabla.',
      actions: ['Filtrar por estado y buscar', 'Avanzar un pedido de etapa con un clic', 'Crear un pedido manual', 'Abrir el detalle de un pedido', 'Exportar a CSV']
    },
    {
      id: 'pedido-detalle', section: 'soporte', login: U.soporte, roles: SOP, title: 'Detalle del pedido', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-mail]'); return { url: h.here() }; },
      description: 'Ficha del pedido con estado y siguiente paso, productos, historial, datos del cliente y acciones de soporte.',
      actions: ['Avanzar el pedido a preparando, enviado o entregado', 'Cancelar o reembolsar', 'Editar los datos del cliente', 'Reenviar la confirmación por correo']
    },
    {
      id: 'pedido-manual', section: 'soporte', login: U.soporte, roles: SOP, kind: 'modal', from: 'Botón "Pedido manual" en Pedidos', title: 'Nuevo pedido manual', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para registrar un pedido tomado por teléfono o redes, con cliente, pack, color y dirección.',
      actions: ['Ingresar los datos del cliente', 'Elegir pack y color', 'Registrar el pedido y descontar stock']
    },
    {
      id: 'carritos', section: 'soporte', login: U.soporte, roles: TODOS, title: 'Carritos abandonados', url: 'admin.html#/carritos', waitFor: '.admin-content table',
      description: 'Checkouts que se empezaron y no se pagaron, con el paso en que quedaron, el monto y si se recuperaron.',
      actions: ['Ver en qué paso se abandonó cada compra', 'Enviar un recordatorio (simulado)', 'Ver cuáles se recuperaron']
    },
    {
      id: 'resenas-admin', section: 'soporte', login: U.soporte, roles: TODOS, title: 'Reseñas', url: 'admin.html#/resenas', waitFor: '.admin-content table',
      description: 'Moderación de reseñas: solo las aprobadas aparecen en la landing y las destacadas van primero.',
      actions: ['Aprobar o rechazar reseñas', 'Destacar una reseña', 'Responder públicamente', 'Agregar una reseña a mano']
    },
    {
      id: 'resena-responder', section: 'soporte', login: U.soporte, roles: TODOS, kind: 'modal', from: 'Botón "Responder" en Reseñas', title: 'Responder reseña', url: 'admin.html#/resenas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-reply] >> nth=0'); await h.modal(); },
      description: 'Respuesta pública de la marca a una reseña, que se muestra bajo ella en la landing.',
      actions: ['Leer la reseña original', 'Escribir la respuesta de la marca', 'Publicarla en la landing']
    },
    {
      id: 'inventario', section: 'soporte', login: U.soporte, roles: SOP, title: 'Inventario por color', url: 'admin.html#/inventario', waitFor: '.admin-content [data-restock]',
      description: 'Stock de cada color con su punto de reposición. Si un color llega a 0 se muestra agotado en la landing.',
      actions: ['Reponer stock de un color', 'Ajustar el stock con motivo', 'Ver qué colores están bajo el mínimo', 'Exportar a CSV']
    },
    {
      id: 'inventario-reponer', section: 'soporte', login: U.soporte, roles: SOP, kind: 'modal', from: 'Botón "Reponer" en Inventario', title: 'Reponer stock', url: 'admin.html#/inventario', waitFor: '.admin-content [data-restock]',
      setup: async h => { await h.click('.admin-content [data-restock] >> nth=0'); await h.modal(); },
      description: 'Ingreso de unidades nuevas de un color con el proveedor o guía de despacho; quedan disponibles al instante en la landing.',
      actions: ['Indicar las unidades recibidas', 'Anotar proveedor o guía', 'Volver a habilitar un color agotado']
    },
    {
      id: 'soporte-restringido', section: 'soporte', login: U.soporte, title: 'Ruta protegida por rol', url: 'admin.html#/landing', waitFor: '.admin-content .empty',
      description: 'Lo que ve soporte si intenta abrir una sección de marketing (en este caso, el CMS de la landing).',
      actions: ['Ver el aviso de acceso restringido', 'Volver a sus secciones desde el menú', 'Confirmar que cada rol solo ve sus menús']
    },

    // ================= Marketing =================
    {
      id: 'cms-hero', section: 'marketing', login: U.marketing, roles: MKT, title: 'Landing (CMS): hero', url: 'admin.html#/landing', waitFor: '.admin-content .cms-tabs',
      description: 'Editor de la landing por pestañas. En el hero se cambian titular, bajada, viñetas y medios; los cambios se ven al instante en la landing abierta en otra pestaña.',
      actions: ['Editar titular, bajada y viñetas', 'Cambiar la barra promocional y los medios', 'Guardar y publicar', 'Pasar a beneficios, comparativa, FAQ, precios, oferta, garantía o checkout']
    },
    {
      id: 'cms-precios', section: 'marketing', login: U.marketing, roles: MKT, title: 'Landing (CMS): precios y packs', url: 'admin.html#/landing', waitFor: '.admin-content .cms-tabs',
      setup: async h => { await h.click('.cms-tabs [data-tab="precios"]'); },
      description: 'Packs de la oferta con nombre, precio, precio de lista, insignia, regalo y descripción, y si están activos.',
      actions: ['Cambiar precios y precio de lista', 'Editar insignia, regalo y descripción', 'Activar o desactivar un pack']
    },
    {
      id: 'cms-oferta', section: 'marketing', login: U.marketing, roles: MKT, title: 'Landing (CMS): oferta y cuenta regresiva', url: 'admin.html#/landing', waitFor: '.admin-content .cms-tabs',
      setup: async h => { await h.click('.cms-tabs [data-tab="oferta"]'); },
      description: 'Fecha de término de la oferta de lanzamiento, con atajos para extenderla 24 horas, 3 o 7 días.',
      actions: ['Definir cuándo termina la oferta', 'Extenderla con un clic', 'Ver la cuenta regresiva en la landing']
    },
    {
      id: 'cms-checkout', section: 'marketing', login: U.marketing, roles: MKT, title: 'Landing (CMS): order bump y upsell', url: 'admin.html#/landing', waitFor: '.admin-content .cms-tabs',
      setup: async h => { await h.click('.cms-tabs [data-tab="checkout"]'); },
      description: 'Configuración de la oferta complementaria del paso de pago (order bump) y de la oferta posterior al pago (upsell).',
      actions: ['Activar o desactivar el order bump', 'Definir producto, precio y texto de cada oferta', 'Guardar los cambios del checkout']
    },
    {
      id: 'abtest', section: 'marketing', login: U.marketing, roles: MKT, title: 'Pruebas A/B', url: 'admin.html#/abtest', waitFor: '.admin-content .preview-frame',
      description: 'Prueba de dos titulares del hero con visitantes, compras, conversión y confianza estadística de cada variante, más el historial de pruebas.',
      actions: ['Comparar la conversión de cada variante', 'Simular 500 visitas para ver avanzar la prueba', 'Declarar una variante ganadora', 'Pausar, editar o crear una prueba nueva']
    },
    {
      id: 'abtest-editar', section: 'marketing', login: U.marketing, roles: MKT, kind: 'modal', from: 'Botón "Editar" en Pruebas A/B', title: 'Editar prueba A/B', url: 'admin.html#/abtest', waitFor: '.admin-content .preview-frame',
      setup: async h => { await h.click('[data-edit]'); await h.modal(); },
      description: 'Formulario de la prueba con nombre, reparto de tráfico y el titular y bajada de cada variante.',
      actions: ['Nombrar la prueba', 'Definir el porcentaje de tráfico de cada variante', 'Escribir titular y bajada de A y B']
    },
    {
      id: 'cupones', section: 'marketing', login: U.marketing, roles: MKT, title: 'Cupones', url: 'admin.html#/cupones', waitFor: '.admin-content table',
      description: 'Cupones que se aplican en el checkout con tipo, valor, usos, ingresos generados, vencimiento y estado.',
      actions: ['Crear un cupón', 'Activar o desactivar con un interruptor', 'Ver usos e ingresos de cada cupón', 'Editar o eliminar cupones']
    },
    {
      id: 'cupon-modal', section: 'marketing', login: U.marketing, roles: MKT, kind: 'modal', from: 'Botón "Nuevo cupón" en Cupones', title: 'Nuevo cupón', url: 'admin.html#/cupones', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario del cupón con código, tipo de descuento, valor, mínimo, límite de usos y vencimiento.',
      actions: ['Definir código y tipo de descuento', 'Fijar mínimo de compra y límite de usos', 'Poner fecha de vencimiento']
    },
    {
      id: 'afiliados', section: 'marketing', login: U.marketing, roles: MKT, title: 'Afiliados', url: 'admin.html#/afiliados', waitFor: '.admin-content table',
      description: 'Afiliados con su código de enlace, clics, ventas atribuidas, comisión, saldo por pagar y estado, más los pagos registrados.',
      actions: ['Aprobar postulaciones pendientes', 'Copiar el enlace de un afiliado', 'Ver ventas y comisión de cada uno', 'Registrar un pago de comisión']
    },
    {
      id: 'afiliado-pagar', section: 'marketing', login: U.marketing, roles: MKT, kind: 'modal', from: 'Botón "Pagar" en Afiliados', title: 'Pagar comisión', url: 'admin.html#/afiliados', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-pay] >> nth=0'); await h.modal(); },
      description: 'Registro del pago de comisión a un afiliado con monto (hasta su saldo) y método; el saldo se descuenta y el pago queda en el historial.',
      actions: ['Revisar el saldo pendiente', 'Indicar el monto y el método de pago', 'Dejar el pago registrado']
    },
    {
      id: 'automatizaciones', section: 'marketing', login: U.marketing, roles: MKT, title: 'Automatizaciones de correo', url: 'admin.html#/automatizaciones', waitFor: '.admin-content [data-prev]',
      description: 'Flujos de correo simulados (carrito abandonado, post compra, pedir reseña) con su disparador, demora, envíos y el registro de correos.',
      actions: ['Activar o desactivar cada flujo', 'Ver la vista previa del correo', 'Enviar una prueba', 'Revisar el registro de envíos']
    },
    {
      id: 'automatizacion-preview', section: 'marketing', login: U.marketing, roles: MKT, kind: 'modal', from: 'Botón "Vista previa" en Automatizaciones', title: 'Vista previa del correo', url: 'admin.html#/automatizaciones', waitFor: '.admin-content [data-prev]',
      setup: async h => { await h.click('.admin-content [data-prev] >> nth=0'); await h.modal(); },
      description: 'Vista del correo tal como lo recibiría el cliente, con asunto y cuerpo personalizados.',
      actions: ['Revisar asunto y texto', 'Ver los datos personalizados del cliente', 'Volver a editar el flujo']
    },

    // ================= Administrador =================
    {
      id: 'color-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo color" en Inventario', title: 'Nuevo color', url: 'admin.html#/inventario', waitFor: '.admin-content [data-restock]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Solo el administrador crea o edita colores: nombre, color base, tonos claro y oscuro de la ilustración, stock, punto de reposición y visibilidad en la landing.',
      actions: ['Nombrar el color y elegir sus tonos', 'Definir stock y punto de reposición', 'Mostrarlo u ocultarlo en la landing']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas del equipo con rol, último acceso y estado, más la tabla de permisos por rol.',
      actions: ['Crear una cuenta', 'Cambiar rol o datos', 'Asignar una clave nueva', 'Desactivar usuarios', 'Revisar los permisos por rol']
    },
    {
      id: 'usuario-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario" en Usuarios y roles', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de cuenta con nombre, correo, rol, contraseña inicial, estado y opción de mostrarla como cuenta demo en el login.',
      actions: ['Ingresar nombre y correo', 'Asignar rol (administrador, marketing o soporte)', 'Definir la contraseña']
    },
    {
      id: 'bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/actividad', waitFor: '.admin-content table',
      description: 'Registro de lo que pasa en la tienda: compras, reseñas, cambios de stock, del CMS y de las pruebas A/B.',
      actions: ['Filtrar por tipo o usuario', 'Buscar en el detalle', 'Exportar a CSV']
    },
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Ajustes', url: 'admin.html#/ajustes', waitFor: '.admin-content form, .admin-content .card',
      description: 'Datos de la tienda (nombre comercial, correo y teléfono de soporte, transportista por defecto), simulador de tráfico para la demo y herramientas de datos (exportar en JSON y restablecer).',
      actions: ['Editar los datos de contacto de la tienda', 'Elegir el transportista por defecto', 'Simular visitas en la landing', 'Exportar los datos en JSON', 'Restablecer los datos demo']
    }
  ]
};
