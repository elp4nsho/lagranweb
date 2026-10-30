// Biblioteca de vistas de Tiquetera Volcán (/eventos).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'u-cli', productor: 'u-prod', staff: 'u-staff', soporte: 'u-soporte', admin: 'u-admin' };

// Elige dos asientos libres de la Platea Central del primer evento (quedan reservados 10 minutos).
async function pickSeats(h) {
  await h.goto('index.html#/evento/e1/entradas', '#mapwrap svg');
  await h.click('#mapwrap .seat[role="button"][data-seat^="pc-"] >> nth=20');
  await h.click('#mapwrap .seat[role="button"][data-seat^="pc-"] >> nth=21');
}
// Las pantallas de resultado del escáner se cierran solas a los 1,8–3,2 s: para la captura se mantienen abiertas.
const keepOverlay = h => h.page.evaluate(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => (ms >= 1500 ? 0 : st(f, ms, ...a)); });

module.exports = {
  dir: 'eventos',
  name: 'Tiquetera Volcán',
  kind: 'Venta de entradas',
  theme: 'parallax',
  description: 'Plataforma de venta de entradas para conciertos, teatro, deportes y conferencias, con mapa de asientos, entradas digitales con QR, reventa oficial, portal para productoras, app de control de acceso y panel de administración.',
  accounts: {
    'u-cli': { name: 'Valentina Rojas', role: 'Cliente', email: 'cliente@volcan.cl', password: 'demo123' },
    'u-prod': { name: 'Ignacio Vergara', role: 'Productor', email: 'productor@sursonoro.cl', password: 'demo123' },
    'u-staff': { name: 'Diego Paredes', role: 'Staff de acceso', email: 'acceso@volcan.cl', password: 'demo123' },
    'u-soporte': { name: 'Rodrigo Pizarro', role: 'Soporte', email: 'soporte@volcan.cl', password: 'demo123' },
    'u-admin': { name: 'Camila Fuentes', role: 'Administrador', email: 'admin@volcan.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Cartelera, fichas de evento y selección de entradas, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Compra, pago y billetera de entradas del comprador.' },
    { id: 'productor', label: 'Productora', desc: 'Portal de la productora: sus eventos, ventas en vivo, asistentes, promociones y liquidaciones.' },
    { id: 'staff', label: 'Staff de acceso', desc: 'App de celular para validar entradas en la puerta del recinto.' },
    { id: 'soporte', label: 'Soporte', desc: 'Panel con acceso limitado a pedidos, eventos y actividad.' },
    { id: 'admin', label: 'Administrador', desc: 'Panel completo: eventos, pedidos, recintos, productoras, tarifas, contenido y usuarios.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Parallax" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '#featured .card',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'brutal', group: 'Estilo', label: 'Brutalista', desc: 'Bordes gruesos y contraste alto.', theme: 'brutal' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '#featured .card', mobile: true,
      description: 'Página de inicio con buscador, eventos destacados, accesos por categoría y lo que viene esta semana. El título, el banner superior y los destacados se editan desde el panel.',
      actions: ['Buscar por artista, obra, equipo o recinto', 'Filtrar por ciudad y fecha desde el buscador', 'Ver los eventos destacados y los de esta semana', 'Entrar a una categoría (conciertos, teatro, deportes, conferencias)']
    },
    {
      id: 'explorar', section: 'publico', title: 'Cartelera', url: 'index.html#/explorar', waitFor: '#results .card',
      description: 'Listado de todos los próximos eventos publicados con filtros combinables. Los filtros quedan en la dirección, así que la búsqueda se puede compartir.',
      actions: ['Buscar por nombre, artista o recinto', 'Filtrar por categoría, ciudad y fecha (o un rango de fechas)', 'Mostrar solo eventos con entradas disponibles', 'Ordenar por fecha, precio más bajo o más vendidos']
    },
    {
      id: 'evento', section: 'publico', title: 'Ficha del evento', url: 'index.html#/evento/e1', waitFor: '.buy-box', mobile: true,
      description: 'Página de cada evento con afiche, cuenta regresiva, lineup o programa, recinto con su mapa y la caja de precios por tipo de entrada.',
      actions: ['Ver fecha, hora, recinto y edad mínima', 'Revisar el lineup con horarios', 'Ver precios por zona, preventa y porcentaje vendido', 'Ir a elegir asientos o comprar entradas', 'Descubrir eventos relacionados']
    },
    {
      id: 'evento-agotado', section: 'publico', title: 'Evento agotado y lista de espera', url: 'index.html#/evento/e3', waitFor: '.buy-box',
      description: 'Cuando un evento se agota, la caja de compra ofrece unirse a la lista de espera indicando cuántas entradas se necesitan. Si se liberan entradas por reembolsos, se avisa a quienes esperan.',
      actions: ['Ver que el evento está agotado', 'Elegir cuántas entradas necesita', 'Unirse a la lista de espera (pide iniciar sesión)', 'Salir de la lista más tarde']
    },
    {
      id: 'evento-reventa', section: 'publico', title: 'Reventa oficial en la ficha', url: 'index.html#/evento/e11', waitFor: '.ev-resale',
      setup: async h => { await h.scrollTo('.ev-resale', 'center'); },
      description: 'Entradas que otros asistentes publicaron en la reventa oficial, con precio tope sobre el valor original. Al comprarla, la entrada se reemite a nombre del comprador con un código nuevo.',
      actions: ['Ver ubicación y precio de cada entrada en reventa', 'Comparar con el precio original', 'Comprarla con tarjeta en una ventana de pago', 'Recibir la entrada con un código nuevo']
    },
    {
      id: 'evento-finalizado', section: 'publico', title: 'Evento ya realizado', url: 'index.html#/evento/e20', waitFor: '.buy-box',
      description: 'Ficha de un evento pasado: se mantiene visible con su información, pero la caja de compra indica que ya se realizó.',
      actions: ['Consultar la información del evento pasado', 'Ver el recinto y el lineup', 'Ir a otros eventos de la cartelera']
    },
    {
      id: 'asientos', section: 'publico', title: 'Mapa de asientos', url: 'index.html#/evento/e1/entradas', waitFor: '#mapwrap svg', mobile: true,
      setup: async h => {
        await h.click('#mapwrap .seat[role="button"][data-seat^="pc-"] >> nth=20');
        await h.click('#mapwrap .seat[role="button"][data-seat^="pc-"] >> nth=21');
        await h.page.evaluate(() => window.scrollTo(0, 0));
      },
      description: 'Mapa interactivo del recinto por sectores, con precio por zona y asientos vendidos o reservados. Las entradas elegidas quedan guardadas por 10 minutos mientras se paga.',
      actions: ['Tocar asientos libres para agregarlos o quitarlos', 'Acercar o alejar el mapa', 'Sumar entradas generales (de pie) por cantidad', 'Ver el subtotal y el cargo por servicio', 'Liberar la reserva o continuar al pago']
    },
    {
      id: 'entrada-general', section: 'publico', title: 'Entradas generales', url: 'index.html#/evento/e4/entradas', waitFor: '#summary [data-ga]',
      setup: async h => { await h.click('#summary [data-ga][data-d="1"] >> nth=0'); await h.click('#summary [data-ga][data-d="1"] >> nth=0'); },
      description: 'Selección para eventos sin asientos numerados: se elige la cantidad por tipo de entrada y se avisa cuando quedan pocas.',
      actions: ['Sumar o restar entradas por tipo', 'Ver cuántas quedan disponibles', 'Revisar el total con cargos', 'Continuar al pago']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para clientes y equipo, con registro de cliente nuevo y cuentas de prueba para entrar con un clic. Cada rol aterriza en su propia aplicación.',
      actions: ['Ingresar con correo y contraseña', 'Crear una cuenta de cliente', 'Entrar con un clic como cliente, productor, staff, soporte o administrador', 'Volver a la cartelera']
    },

    // ================= Cliente =================
    {
      id: 'checkout', section: 'cliente', login: U.cliente, title: 'Pago', url: 'index.html#/', waitFor: '#featured .card',
      setup: async h => { await pickSeats(h); await h.click('#go'); await h.wait('#payform'); await h.fill('#payform [name="num"]', '4242 4242 4242 4242'); await h.fill('#payform [name="exp"]', '12/29'); await h.fill('#payform [name="cvv"]', '123'); return { url: 'index.html#/evento/e1/entradas' }; },
      description: 'Checkout con los datos del comprador, el medio de pago y el resumen del pedido. Un contador muestra cuánto queda de la reserva de asientos.',
      actions: ['Confirmar nombre, correo, RUT y teléfono', 'Pagar con tarjeta (con vista previa) o débito/transferencia simulada', 'Aplicar un código promocional', 'Ver subtotal, descuento, cargos y total', 'Volver a cambiar las entradas']
    },
    {
      id: 'confirmacion', section: 'cliente', login: U.cliente, title: 'Compra confirmada', url: 'index.html#/', waitFor: '#featured .card',
      setup: async h => {
        await pickSeats(h); await h.click('#go'); await h.wait('#payform');
        await h.fill('#payform [name="num"]', '4242 4242 4242 4242'); await h.fill('#payform [name="exp"]', '12/29'); await h.fill('#payform [name="cvv"]', '123');
        await h.click('#paybtn'); await h.wait('#app h1:has-text("Compra confirmada")'); return { url: 'index.html#/evento/e1/entradas' };
      },
      description: 'Comprobante del pedido con número, cantidad de entradas y total pagado. Las entradas aparecen de inmediato en la billetera del cliente.',
      actions: ['Ver el número de pedido y el total', 'Ir a Mis entradas', 'Abrir la primera entrada con su QR']
    },
    {
      id: 'mis-entradas', section: 'cliente', login: U.cliente, title: 'Mis entradas', url: 'index.html#/mis-entradas', waitFor: '.wallet-grid .ticket', mobile: true,
      description: 'Billetera con las entradas de próximos eventos, cada una con sector, fila y asiento. Desde aquí se transfiere o revende una entrada.',
      actions: ['Ver las entradas de próximos eventos y las pasadas', 'Abrir la entrada con su código QR', 'Transferir una entrada a otra persona', 'Publicarla en la reventa oficial o retirarla']
    },
    {
      id: 'mis-pedidos', section: 'cliente', login: U.cliente, title: 'Mis pedidos', url: 'index.html#/mis-entradas', waitFor: '.wallet-grid .ticket',
      setup: async h => { await h.click('[data-tab="pedidos"]'); await h.wait('#tabbody table'); },
      description: 'Historial de compras con medio de pago, total y estado. Los pedidos dentro del plazo permiten pedir reembolso, que revisa el equipo de soporte.',
      actions: ['Revisar cada pedido con su total y medio de pago', 'Solicitar el reembolso de un pedido dentro del plazo', 'Seguir el estado de las solicitudes']
    },
    {
      id: 'entrada-qr', section: 'cliente', login: U.cliente, title: 'Entrada digital', url: 'index.html#/mis-entradas', waitFor: '.wallet-grid .ticket',
      setup: async h => { await h.click('.wallet-grid .ticket .actions a.btn-primary'); await h.wait('.wallet-pass .qrbox'); return { url: h.here() }; },
      mobile: true,
      description: 'Entrada en formato pase de billetera con el código QR que se escanea en la puerta, titular, sector, fila y asiento.',
      actions: ['Mostrar el QR en la entrada del recinto', 'Copiar el código de la entrada', 'Agregarla a la billetera del celular (simulado)', 'Pasar a las otras entradas del mismo pedido']
    },
    {
      id: 'transferir', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Transferir" en Mis entradas', title: 'Transferir entrada', url: 'index.html#/mis-entradas', waitFor: '.wallet-grid .ticket',
      setup: async h => { await h.click('[data-transfer]'); await h.modal(); },
      description: 'Envía la entrada a otra persona con cuenta en la plataforma. La entrada se reemite con un código nuevo y la anterior deja de valer.',
      actions: ['Indicar el correo de la persona', 'Transferir la entrada al instante', 'Invalidar el código anterior']
    },
    {
      id: 'revender', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Revender" en Mis entradas', title: 'Publicar en reventa', url: 'index.html#/mis-entradas', waitFor: '.wallet-grid .ticket',
      setup: async h => { await h.click('[data-resell]'); await h.modal(); },
      description: 'Publica la entrada en la reventa oficial con un precio que no puede superar el tope fijado por la plataforma sobre el valor original.',
      actions: ['Fijar el precio de venta dentro del tope', 'Ver el precio original de referencia', 'Publicarla en la ficha del evento']
    },

    // ================= Productora =================
    {
      id: 'prod-resumen', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Resumen de la productora', url: 'productor.html#/', waitFor: '.admin-content .page-head',
      description: 'Inicio del portal con los indicadores de venta de la productora, la recaudación mensual, sus eventos por estado y los próximos eventos.',
      actions: ['Ver entradas vendidas y recaudación', 'Revisar la recaudación de los últimos meses', 'Ver cuántos eventos hay en cada estado', 'Crear un evento nuevo']
    },
    {
      id: 'prod-eventos', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Mis eventos', url: 'productor.html#/eventos', waitFor: '.admin-content table',
      description: 'Eventos de la productora con fecha, estado (borrador, pendiente, publicado, rechazado o finalizado), entradas vendidas y recaudación.',
      actions: ['Buscar entre sus eventos', 'Enviar un borrador a aprobación', 'Editar o eliminar eventos sin ventas', 'Abrir el panel de ventas de un evento', 'Exportar a CSV']
    },
    {
      id: 'prod-crear-detalles', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Crear evento: detalles', url: 'productor.html#/nuevo', waitFor: '#wiz .wizard-steps',
      setup: async h => { await h.fill('#w-title', 'Marea Baja · Gira 2027'); },
      description: 'Primer paso del asistente de creación: nombre, categoría, edad mínima, descripción, estilo del afiche y lineup.',
      actions: ['Escribir nombre y descripción', 'Elegir categoría y edad mínima', 'Elegir uno de los estilos de afiche', 'Armar el lineup o programa con horarios']
    },
    {
      id: 'prod-crear-entradas', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Crear evento: entradas y precios', url: 'productor.html#/nuevo', waitFor: '#wiz .wizard-steps',
      setup: async h => { await h.fill('#w-title', 'Marea Baja · Gira 2027'); await h.click('#wnext'); await h.select('#w-venue', 'v1'); await h.click('#wnext'); await h.wait('#w-tiers'); },
      description: 'Tercer paso del asistente (tras elegir recinto y fecha): tipos de entrada asociados a cada zona del recinto, con precio, preventa y cupo.',
      actions: ['Definir nombre y precio de cada tipo de entrada', 'Asociar cada tipo a una zona del recinto', 'Fijar precio y fecha de preventa', 'Proponer tipos automáticamente según las zonas']
    },
    {
      id: 'prod-crear-revision', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Crear evento: revisión', url: 'productor.html#/nuevo', waitFor: '#wiz .wizard-steps',
      setup: async h => { await h.fill('#w-title', 'Marea Baja · Gira 2027'); for (let i = 0; i < 4; i++) await h.click('#wnext'); await h.wait('#wsubmit'); },
      description: 'Último paso con el afiche, la fecha, la capacidad total y la recaudación potencial. El evento se guarda como borrador o se envía a aprobación del equipo.',
      actions: ['Revisar todos los datos del evento', 'Ver capacidad y recaudación potencial', 'Guardar como borrador', 'Enviar a aprobación']
    },
    {
      id: 'prod-ventas', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Ventas del evento en vivo', url: 'productor.html#/eventos/e1', waitFor: '#live .card',
      description: 'Panel de un evento que se actualiza con cada compra, incluso si ocurre en otra pestaña: vendidas por tipo, ventas diarias, últimas ventas y mapa de ocupación.',
      actions: ['Ver vendidas, recaudación y ventas de hoy', 'Revisar ventas por tipo y por día', 'Ver el mapa de ocupación del recinto', 'Simular ventas en vivo para la demo', 'Editar el evento']
    },
    {
      id: 'prod-asistentes', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Asistentes', url: 'productor.html#/asistentes', waitFor: '.admin-content table',
      description: 'Entradas emitidas por evento con titular, código, ubicación y estado de ingreso.',
      actions: ['Elegir el evento y filtrar por estado', 'Buscar por nombre, correo o código', 'Marcar un ingreso manual', 'Exportar la lista a CSV']
    },
    {
      id: 'prod-promos', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Códigos promocionales', url: 'productor.html#/promos', waitFor: '.admin-content table',
      description: 'Descuentos propios de la productora para sus eventos, con usos y vigencia.',
      actions: ['Crear un código nuevo', 'Editar valor, usos máximos y vigencia', 'Eliminar un código']
    },
    {
      id: 'prod-promo-nuevo', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], kind: 'modal', from: 'Botón "Nuevo código" en Códigos promocionales', title: 'Nuevo código promocional', url: 'productor.html#/promos', waitFor: '.admin-content table',
      setup: async h => { await h.click('#new'); await h.modal(); },
      description: 'Formulario para crear un descuento porcentual o de monto fijo para uno de los eventos de la productora.',
      actions: ['Definir el código y el tipo de descuento', 'Elegir el evento al que aplica', 'Fijar usos máximos y fecha de vencimiento']
    },
    {
      id: 'prod-liquidaciones', section: 'productor', login: U.productor, roles: ['Productor', 'Administrador'], title: 'Liquidaciones', url: 'productor.html#/liquidaciones', waitFor: '.admin-content table',
      description: 'Saldo por evento con el bruto, la comisión de la plataforma, lo liquidado y lo pendiente, más el historial de pagos.',
      actions: ['Ver lo disponible para liquidar y lo por liberar', 'Solicitar el pago de un evento ya realizado', 'Pedir un anticipo de hasta 30 % del neto', 'Exportar a CSV']
    },

    // ================= Staff de acceso =================
    {
      id: 'acceso', section: 'staff', login: U.staff, roles: ['Staff de acceso', 'Productor', 'Administrador'], title: 'App de control de acceso', url: 'acceso.html', waitFor: '#f', mobile: true,
      description: 'App de celular para la puerta: se elige el evento, se escanea o escribe el código de la entrada y se ve el conteo de ingresados en tiempo real.',
      actions: ['Elegir el evento del día', 'Validar un código escrito o pegado', 'Ver ingresados, pendientes y porcentaje', 'Revisar los últimos escaneos', 'Simular entradas válidas o inválidas']
    },
    {
      id: 'acceso-valida', section: 'staff', login: U.staff, kind: 'modal', from: 'Botón "Validar" de la app de acceso', title: 'Resultado: entrada válida', url: 'acceso.html', waitFor: '#f',
      setup: async h => { await keepOverlay(h); await h.click('#simOk'); await h.wait('.scan-result'); },
      description: 'Pantalla completa en verde con el nombre del titular, el tipo de entrada y la ubicación. La entrada queda marcada como usada.',
      actions: ['Confirmar el ingreso de un vistazo', 'Ver titular, tipo y ubicación', 'Volver al escáner con un toque']
    },
    {
      id: 'acceso-invalida', section: 'staff', login: U.staff, kind: 'modal', from: 'Botón "Validar" de la app de acceso', title: 'Resultado: entrada rechazada', url: 'acceso.html', waitFor: '#f',
      setup: async h => { await keepOverlay(h); await h.fill('#code', 'VLC-FAKE-1234'); await h.click('#f button.btn-primary'); await h.wait('.scan-result'); },
      description: 'Pantalla de alerta cuando el código no existe, es de otro evento o ya fue usado (en ese caso indica a qué hora ingresó).',
      actions: ['Detectar entradas falsas o de otro evento', 'Detectar entradas ya usadas y su hora de ingreso', 'Registrar el intento en el historial']
    },

    // ================= Soporte =================
    {
      id: 'soporte-pedidos', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], title: 'Pedidos y reembolsos', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      description: 'Todas las compras de la plataforma con buscador por número de pedido, comprador o código de entrada, y el flujo de reembolsos. Soporte ve solo pedidos, eventos y actividad.',
      actions: ['Buscar un pedido por número, comprador o código de entrada', 'Filtrar por estado, canal y evento', 'Aprobar o rechazar solicitudes de reembolso', 'Reembolsar un pedido pagado', 'Exportar a CSV']
    },
    {
      id: 'soporte-pedido', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], kind: 'modal', from: 'Clic en una fila de Pedidos y reembolsos', title: 'Detalle del pedido', url: 'admin.html#/pedidos', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click('.admin-content tbody tr >> nth=0 >> td >> nth=1'); await h.modal(); },
      description: 'Ventana con el estado, comprador, evento, medio de pago y cada entrada del pedido con su código, ubicación y estado.',
      actions: ['Revisar las entradas y sus códigos', 'Ver subtotal, descuento, cargos y total', 'Reembolsar el pedido desde la misma ventana']
    },
    {
      id: 'soporte-reembolso', section: 'soporte', login: U.soporte, roles: ['Soporte', 'Administrador'], kind: 'modal', from: 'Botón "Reembolsar" de un pedido', title: 'Reembolsar pedido', url: 'admin.html#/pedidos', waitFor: '.admin-content [data-refund]',
      setup: async h => { await h.click('.admin-content [data-refund]'); await h.modal(); },
      description: 'Confirmación del reembolso con el motivo. Las entradas del pedido se anulan y se avisa a la lista de espera si el evento estaba agotado.',
      actions: ['Indicar el motivo del reembolso', 'Anular las entradas del pedido', 'Liberar cupos para la lista de espera']
    },
    {
      id: 'soporte-restringido', section: 'soporte', login: U.soporte, title: 'Ruta protegida por rol', url: 'admin.html#/tarifas', waitFor: '.admin-content h2',
      description: 'Lo que ve soporte si intenta abrir una sección de configuración que no corresponde a su rol.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a las secciones permitidas desde el menú', 'Comprobar que cada rol solo ve sus menús']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content .page-head',
      description: 'Resumen de los últimos 30 días: ventas brutas, entradas vendidas, ventas por día, por ciudad y por categoría, top de eventos y pendientes de aprobación.',
      actions: ['Ver ventas brutas y entradas vendidas', 'Revisar ventas mensuales, diarias y por ciudad', 'Ver los eventos más vendidos', 'Atender los eventos pendientes de aprobación', 'Seguir la actividad reciente']
    },
    {
      id: 'admin-eventos', section: 'admin', login: U.admin, title: 'Eventos', url: 'admin.html#/eventos', waitFor: '.admin-content table',
      description: 'Todos los eventos de la plataforma con estado, porcentaje vendido y recaudación. Los eventos que envían las productoras se aprueban o rechazan aquí.',
      actions: ['Filtrar por estado, categoría y ciudad', 'Aprobar o rechazar eventos pendientes', 'Destacar eventos en la portada', 'Abrir el detalle de un evento', 'Exportar a CSV']
    },
    {
      id: 'admin-rechazar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Rechazar" de un evento pendiente', title: 'Rechazar evento', url: 'admin.html#/eventos?status=pendiente', waitFor: '.admin-content [data-reject]',
      setup: async h => { await h.click('.admin-content [data-reject]'); await h.modal(); },
      description: 'Ventana para rechazar un evento enviado por una productora indicando el motivo, que la productora ve en su listado.',
      actions: ['Escribir el motivo del rechazo', 'Devolver el evento a la productora', 'Notificar a la productora']
    },
    {
      id: 'admin-evento-detalle', section: 'admin', login: U.admin, title: 'Detalle del evento', url: 'admin.html#/eventos/e1', waitFor: '.admin-content .kpis',
      description: 'Ficha interna del evento con vendidas, recaudación, cargos e ingresados, ventas diarias y por tipo, últimos pedidos y lista de espera.',
      actions: ['Ver los indicadores del evento', 'Revisar ventas por día y por tipo de entrada', 'Ver los últimos pedidos y la lista de espera', 'Editar, cancelar con reembolso masivo o eliminar el evento', 'Abrirlo en el sitio público']
    },
    {
      id: 'admin-evento-editar', section: 'admin', login: U.admin, title: 'Editar evento', url: 'admin.html#/eventos/e17/editar', waitFor: '#wiz .wizard-steps',
      description: 'El mismo asistente de cinco pasos que usan las productoras, con la opción de guardar y publicar directamente.',
      actions: ['Modificar detalles, recinto, fecha y entradas', 'Ajustar precios y preventa', 'Gestionar los códigos del evento', 'Guardar los cambios']
    },
    {
      id: 'admin-pedidos', section: 'admin', login: U.admin, title: 'Pedidos y reembolsos', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      description: 'Listado de todas las compras con indicadores de pedidos, ventas y reembolsos, y filtros por estado, canal y evento.',
      actions: ['Buscar por número de pedido, comprador o código de entrada', 'Filtrar por estado, canal (web o reventa) y evento', 'Abrir el detalle de un pedido', 'Reembolsar o resolver solicitudes', 'Exportar a CSV']
    },
    {
      id: 'admin-recintos', section: 'admin', login: U.admin, title: 'Recintos', url: 'admin.html#/recintos', waitFor: '.admin-content table',
      description: 'Lugares donde se realizan los eventos, con ciudad, secciones numeradas, asientos, cupo de pie y capacidad total.',
      actions: ['Buscar recintos', 'Crear un recinto nuevo', 'Abrir el editor del mapa de asientos', 'Eliminar recintos sin eventos', 'Exportar a CSV']
    },
    {
      id: 'admin-recinto-editor', section: 'admin', login: U.admin, title: 'Editor de recinto', url: 'admin.html#/recintos/v1', waitFor: '.admin-content svg',
      description: 'Datos del recinto y generador del mapa de asientos: cada sección se define con filas, asientos por fila y zona, con vista previa inmediata.',
      actions: ['Editar nombre, ciudad, dirección y cupo de pie', 'Agregar, ordenar o quitar secciones', 'Definir filas, asientos y zona de cada sección', 'Ver la vista previa del mapa']
    },
    {
      id: 'admin-productoras', section: 'admin', login: U.admin, title: 'Productoras', url: 'admin.html#/productoras', waitFor: '.admin-content table',
      description: 'Organizadores que publican en la plataforma con sus ventas, comisión y estado, más las liquidaciones solicitadas.',
      actions: ['Aprobar productoras nuevas', 'Crear o editar una productora y su comisión', 'Marcar liquidaciones como pagadas', 'Abrir el detalle de una productora', 'Exportar a CSV']
    },
    {
      id: 'admin-productora-detalle', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en una fila de Productoras', title: 'Detalle de productora', url: 'admin.html#/productoras', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click('.admin-content tbody tr >> nth=0 >> td >> nth=0'); await h.modal(); },
      description: 'Datos de la productora (RUT, contacto, cuenta bancaria, comisión), sus eventos con ventas y su historial de liquidaciones.',
      actions: ['Revisar datos y cuenta bancaria', 'Ver los eventos con vendidas y recaudación', 'Revisar las liquidaciones']
    },
    {
      id: 'admin-promos', section: 'admin', login: U.admin, title: 'Códigos promocionales', url: 'admin.html#/promos', waitFor: '.admin-content table',
      description: 'Descuentos globales o por evento con tipo, valor, usos y vigencia.',
      actions: ['Crear o editar códigos', 'Activar o desactivar un código', 'Ver usos contra el máximo', 'Eliminar códigos', 'Exportar a CSV']
    },
    {
      id: 'admin-promo-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo código" en Códigos promocionales', title: 'Nuevo código promocional', url: 'admin.html#/promos', waitFor: '.admin-content table',
      setup: async h => { await h.click('#new'); await h.modal(); },
      description: 'Formulario para crear un descuento porcentual o fijo, global o limitado a un evento o productora.',
      actions: ['Definir código, tipo y valor', 'Limitarlo a un evento o dejarlo global', 'Fijar usos máximos y vencimiento']
    },
    {
      id: 'admin-tarifas', section: 'admin', login: U.admin, title: 'Tarifas y cargos', url: 'admin.html#/tarifas', waitFor: '#ff',
      description: 'Cargo por servicio, cargo fijo por entrada, máximo por compra, minutos de reserva, tope de reventa y plazo de reembolso, con un simulador de precio final. Se aplican al instante en el checkout.',
      actions: ['Ajustar el cargo porcentual y el fijo', 'Definir máximo de entradas y minutos de reserva', 'Fijar el tope de reventa y el plazo de reembolso', 'Simular el precio final de una compra']
    },
    {
      id: 'admin-contenido', section: 'admin', login: U.admin, title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: '#cms',
      description: 'Editor de la portada pública: título, bajada y botón principal, banner superior, correo de soporte y eventos destacados. Los cambios se ven al instante en el sitio.',
      actions: ['Editar título, bajada y texto del botón de la portada', 'Mostrar u ocultar el banner superior', 'Elegir los eventos destacados', 'Cambiar el correo de soporte']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de la plataforma con su rol y productora asignada, más la tabla de permisos de cada rol.',
      actions: ['Filtrar por rol', 'Crear o editar usuarios', 'Asignar una productora a un productor', 'Desactivar una cuenta', 'Consultar los permisos por rol']
    },
    {
      id: 'admin-usuario-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario" en Usuarios y roles', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('#new'); await h.modal(); },
      description: 'Formulario para crear una cuenta con nombre, correo, contraseña, rol y, si es productor, la productora a la que pertenece.',
      actions: ['Ingresar nombre, correo y contraseña', 'Elegir el rol', 'Asociar la cuenta a una productora']
    },
    {
      id: 'admin-actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: '#list',
      description: 'Bitácora de las últimas 300 acciones: compras, reembolsos, cambios de estado de eventos, tarifas y registros.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción o texto', 'Exportar a CSV', 'Restablecer los datos de demostración desde el menú']
    },
    {
      id: 'admin-como-productora', section: 'admin', login: U.admin, title: 'Portal productor como administrador', url: 'productor.html#/', waitFor: '#asOrg',
      setup: async h => { await h.select('#asOrg', 'o3'); await h.wait('.admin-content .page-head'); },
      description: 'El administrador puede abrir el portal de productoras y ver los datos de cualquiera de ellas eligiéndola en el menú lateral.',
      actions: ['Elegir la productora a revisar', 'Ver su resumen, eventos y liquidaciones', 'Dar soporte viendo lo mismo que la productora']
    }
  ]
};
