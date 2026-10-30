// Biblioteca de vistas de Fogón Andino (/menu).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.
//
// La semilla deja mesas ocupadas con pedidos en distintos estados: la 3 con platos entregados y
// por cobrar, la 13 con platos listos y en preparación, la 11 llamando al garzón; la 4 está libre.

const U = { admin: 'u-admin', chef: 'u-chef', garzon: 'u-garzon', cajero: 'u-cajero' };
const head = '.page-head';
const firstRow = '.admin-content tbody tr >> nth=0';

// Agrega un plato desde la carta de la mesa, eligiendo la primera opción de cada grupo obligatorio.
async function addDish(h, n) {
  await h.click(`[data-dish] >> nth=${n}`); await h.modal();
  const groups = h.page.locator('.modal [data-req="1"]');
  for (let i = 0; i < await groups.count(); i++) await groups.nth(i).locator('label').first().click();
  await h.click('.modal [data-add]'); await h.wait('.modal-backdrop', 'detached');
}
// Busca un día próximo con al menos 7 horarios libres (de noche los de hoy ya pasaron y hay días cerrados).
async function nextOpenDay(h) {
  for (let k = 1; k <= 8; k++) {
    const d = new Date(Date.now() + k * 864e5);
    await h.fill('#r-date', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    await h.pause(250);
    if (await h.page.locator('[data-slot]:not([disabled])').count() >= 7) return;
  }
}

module.exports = {
  dir: 'menu',
  name: 'Fogón Andino',
  kind: 'Restaurante con carta digital y pedidos en mesa',
  theme: 'vintage',
  description: 'Restaurante con sitio público, carta digital bilingüe, pedidos y pago desde la mesa por QR, reservas en línea, pantalla de cocina, app del garzón y panel de gestión con caja, carta, mesas, inventario y personal.',
  accounts: {
    'u-admin': { name: 'Rosa Huenchumilla', role: 'Administrador', email: 'admin@fogonandino.cl', password: 'demo123' },
    'u-chef': { name: 'Tomás Catrileo', role: 'Jefe de cocina', email: 'cocina@fogonandino.cl', password: 'demo123' },
    'u-garzon': { name: 'Camila Fuentes', role: 'Garzón', email: 'garzon@fogonandino.cl', password: 'demo123' },
    'u-cajero': { name: 'Pedro Alarcón', role: 'Cajero', email: 'caja@fogonandino.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante: portada, carta y reservas.' },
    { id: 'mesa', label: 'Comensal en la mesa', desc: 'Lo que abre el comensal al escanear el QR de su mesa: pedir, seguir el pedido y pagar.' },
    { id: 'cocina', label: 'Jefe de cocina', desc: 'Pantalla de comandas de cocina y disponibilidad de platos.' },
    { id: 'garzon', label: 'Garzón', desc: 'App de salón: plano de mesas en vivo, pedidos, avisos y llamados.' },
    { id: 'cajero', label: 'Cajero', desc: 'Caja, cobros, historial de pedidos y agenda de reservas.' },
    { id: 'admin', label: 'Administrador', desc: 'Panel completo: indicadores, carta, mesas, QR, opiniones, personal, inventario y configuración.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Vintage" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero, .hero-text',
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
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.hero-text', mobile: true,
      description: 'Página de inicio del restaurante con horario de hoy, valoración de los comensales, platos favoritos, opiniones y datos de contacto. Todo se edita desde la configuración del panel y está en español e inglés.',
      actions: ['Ver si está abierto y hasta qué hora', 'Revisar los platos favoritos de la casa', 'Leer opiniones publicadas', 'Ir a la carta o reservar mesa', 'Cambiar el idioma a inglés']
    },
    {
      id: 'carta', section: 'publico', title: 'Carta digital', url: 'index.html#/carta', waitFor: '[data-dish]', mobile: true,
      description: 'Carta completa por categorías con fotos ilustradas, precios y etiquetas. Desde el sitio solo se consulta; para pedir se escanea el QR de la mesa.',
      actions: ['Saltar entre categorías', 'Buscar un plato por nombre', 'Filtrar vegano, vegetariano, sin gluten o picante', 'Ver el detalle y las opciones de cada plato', 'Cambiar el idioma']
    },
    {
      id: 'reservas', section: 'publico', title: 'Reservar mesa', url: 'reservas.html', waitFor: '[data-slot]', mobile: true,
      description: 'Formulario de reserva con fecha, número de personas, horarios disponibles, zona preferida y datos de contacto, más la consulta o cancelación de una reserva existente con su código.',
      actions: ['Elegir fecha, personas y horario libre', 'Indicar zona preferida (salón, terraza o barra) y comentarios', 'Enviar la reserva y recibir un código', 'Consultar o cancelar una reserva con código y correo']
    },
    {
      id: 'reserva-recibida', section: 'publico', title: 'Reserva recibida', url: 'reservas.html', waitFor: '[data-slot]',
      setup: async h => {
        await nextOpenDay(h); await h.click('[data-slot]:not([disabled]) >> nth=6'); await h.fill('#r-name', 'Martín Soto'); await h.fill('#r-phone', '+56 9 6543 2109'); await h.fill('#r-email', 'martin.soto@demo.cl');
        await h.click('.res-grid button.btn-primary'); await h.wait('#again');
      },
      description: 'Confirmación con el código de reserva, fecha, hora y personas. Queda pendiente hasta que el equipo la confirma desde el panel.',
      actions: ['Anotar el código de la reserva', 'Ver el estado "pendiente de confirmación"', 'Hacer otra reserva']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso del equipo', url: 'login.html', waitFor: '.demo-account',
      description: 'Ingreso para el personal del restaurante. Cada rol entra a su pantalla: panel, cocina, salón o caja.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, jefe de cocina, garzón o cajero', 'Volver al sitio']
    },

    // ================= Comensal en la mesa =================
    {
      id: 'mesa-carta', section: 'mesa', title: 'Carta para pedir', url: 'index.html?mesa=4#/', waitFor: '[data-dish]', mobile: true,
      description: 'La carta que abre el QR de cada mesa: igual a la pública, pero con botón para agregar platos, carrito, llamado al garzón y cambio de idioma.',
      actions: ['Agregar platos al carrito', 'Llamar al garzón con un botón', 'Buscar y filtrar platos', 'Cambiar entre español e inglés']
    },
    {
      id: 'mesa-plato', section: 'mesa', kind: 'modal', from: 'Clic en un plato de la carta de la mesa', title: 'Detalle del plato', url: 'index.html?mesa=4#/', waitFor: '[data-dish]', mobile: true,
      setup: async h => { await h.scrollTo('[data-dish] >> nth=6', 'center'); await h.click('[data-dish] >> nth=6'); await h.modal(); },
      description: 'Ficha del plato con descripción, etiquetas, modificadores (punto, acompañamiento, agregados), nota para cocina y cantidad. El precio se recalcula con cada opción.',
      actions: ['Elegir opciones obligatorias y agregados con precio', 'Escribir una nota para cocina', 'Ajustar la cantidad', 'Agregar al carrito']
    },
    {
      id: 'mesa-carrito', section: 'mesa', kind: 'modal', from: 'Botón del carrito en la mesa', title: 'Carrito y envío a cocina', url: 'index.html?mesa=4#/', waitFor: '[data-dish]',
      setup: async h => {
        await addDish(h, 0); await addDish(h, 4);
        await h.click('#cartBtn'); await h.modal();
      },
      description: 'Resumen del pedido antes de enviarlo: platos con sus opciones, cantidades, número de comensales y nota general. Al enviar, la comanda aparece en la pantalla de cocina.',
      actions: ['Cambiar cantidades o quitar platos', 'Indicar cuántos comensales son', 'Agregar una nota para todo el pedido', 'Enviar el pedido a cocina']
    },
    {
      id: 'mesa-pedido', section: 'mesa', title: 'Estado del pedido', url: 'index.html?mesa=13#/pedido', waitFor: '.item-status, .card', mobile: true,
      description: 'Seguimiento en vivo de cada plato pedido: pendiente, en preparación, listo o entregado. Se actualiza solo cuando cocina o el garzón cambian el estado.',
      actions: ['Ver el estado de cada plato', 'Recibir aviso cuando algo está listo', 'Llamar al garzón', 'Seguir pidiendo desde la carta']
    },
    {
      id: 'mesa-cuenta', section: 'mesa', title: 'Cuenta y pago', url: 'index.html?mesa=3#/cuenta', waitFor: '[data-pay]', mobile: true,
      description: 'La cuenta de la mesa con lo consumido, propina sugerida, división en partes iguales o por platos, y pago desde el celular (simulado) o pedido de la cuenta al garzón.',
      actions: ['Elegir el porcentaje de propina', 'Dividir la cuenta en partes iguales o por lo que consumió cada uno', 'Elegir tarjeta, efectivo o transferencia', 'Pagar desde la app o pedir la cuenta al garzón']
    },
    {
      id: 'mesa-calificar', section: 'mesa', title: 'Pago listo y calificación', url: 'index.html?mesa=3#/cuenta', waitFor: '[data-pay]',
      setup: async h => { await h.click('[data-pay]'); await h.wait('#rate'); },
      description: 'Confirmación del pago con el total y una encuesta breve de comida, atención y ambiente. Las opiniones llegan al panel, que decide cuáles publicar en la portada.',
      actions: ['Ver el total pagado y el medio de pago', 'Calificar comida, atención y ambiente', 'Dejar un comentario', 'Iniciar una nueva visita']
    },

    // ================= Jefe de cocina =================
    {
      id: 'cocina-kds', section: 'cocina', login: U.chef, roles: ['Administrador', 'Jefe de cocina'], title: 'Pantalla de cocina', url: 'cocina.html', waitFor: '.kds-col-head', mobile: true,
      description: 'Pantalla de comandas en tres columnas (nuevos, en preparación, listos) con tiempo transcurrido, notas de los comensales y filtro por estación.',
      actions: ['Comenzar una comanda o un plato', 'Marcar platos listos uno a uno o la comanda completa', 'Filtrar por estación (cocina caliente, parrilla, fría, barra)', 'Ver comandas atrasadas', 'Recuperar una comanda despachada por error']
    },
    {
      id: 'cocina-agotados', section: 'cocina', login: U.chef, roles: ['Administrador', 'Jefe de cocina'], kind: 'modal', from: 'Botón "Agotados" de la pantalla de cocina', title: 'Disponibilidad de platos', url: 'cocina.html', waitFor: '.kds-col-head',
      setup: async h => { await h.click('button:has-text("Agotados")'); await h.modal(); },
      description: 'Lista de platos por categoría con un interruptor de disponibilidad. Lo que se marca como agotado desaparece al instante de los pedidos de las mesas.',
      actions: ['Marcar un plato como agotado', 'Volver a habilitarlo', 'Revisar la disponibilidad por categoría']
    },

    // ================= Garzón =================
    {
      id: 'garzon-plano', section: 'garzon', login: U.garzon, roles: ['Administrador', 'Garzón', 'Cajero'], title: 'Plano del salón', url: 'garzon.html', waitFor: '[data-t]', mobile: true,
      description: 'Plano de mesas en vivo con su estado (libre, ocupada, pidió la cuenta, llamando) y filtro por zona, más contador de avisos pendientes.',
      actions: ['Ver el estado de todas las mesas', 'Filtrar por salón, terraza o barra', 'Abrir el detalle de una mesa', 'Ir a los avisos de platos listos y llamados']
    },
    {
      id: 'garzon-mesa', section: 'garzon', login: U.garzon, roles: ['Administrador', 'Garzón', 'Cajero'], kind: 'modal', from: 'Clic en una mesa ocupada del plano', title: 'Detalle de mesa', url: 'garzon.html', waitFor: '[data-t]',
      setup: async h => { await h.click('[data-t="t13"]'); await h.modal(); },
      description: 'Ficha de la mesa con personas, hora de apertura, pedidos y el estado de cada plato, consumo acumulado y acciones.',
      actions: ['Entregar platos listos', 'Atender un llamado', 'Agregar un pedido', 'Cobrar la mesa o verla como el cliente']
    },
    {
      id: 'garzon-pedido', section: 'garzon', login: U.garzon, roles: ['Administrador', 'Garzón', 'Cajero'], kind: 'modal', from: 'Botón "Tomar pedido" en una mesa libre', title: 'Tomar pedido', url: 'garzon.html', waitFor: '[data-t]',
      setup: async h => { await h.click('[data-t="t4"]'); await h.modal(); await h.click('.modal [data-take]'); await h.modal(); },
      description: 'Toma de pedido en la mesa con la carta por categorías y buscador. Se arma la comanda y se envía a cocina.',
      actions: ['Buscar platos o recorrer categorías', 'Agregar platos con sus opciones y notas', 'Revisar la comanda y quitar platos', 'Enviar a cocina']
    },
    {
      id: 'garzon-avisos', section: 'garzon', login: U.garzon, roles: ['Administrador', 'Garzón', 'Cajero'], title: 'Avisos', url: 'garzon.html', waitFor: '[data-t]',
      setup: async h => { await h.click('.tabs [data-tab="avisos"]'); await h.wait('[data-deliver], [data-attend]'); },
      description: 'Platos listos para llevar a las mesas y llamados de los comensales (garzón o cuenta), ordenados por antigüedad.',
      actions: ['Marcar platos como entregados (uno o todos)', 'Atender llamados de mesa', 'Ver cuánto llevan esperando']
    },

    // ================= Cajero =================
    {
      id: 'cajero-caja', section: 'cajero', login: U.cajero, roles: ['Administrador', 'Cajero'], title: 'Caja', url: 'admin.html#/caja', waitFor: '[data-charge]',
      description: 'Cuentas abiertas con su consumo, cobrado del día, propinas a repartir, cierre de caja por medio de pago y cobros de hoy.',
      actions: ['Ver las mesas por cobrar', 'Cobrar una mesa', 'Revisar el cierre de caja por medio de pago', 'Ver el detalle de los cobros del día', 'Exportar a CSV']
    },
    {
      id: 'cajero-cobrar', section: 'cajero', login: U.cajero, roles: ['Administrador', 'Cajero', 'Garzón'], kind: 'modal', from: 'Botón "Cobrar" en Caja o en una mesa del garzón', title: 'Cobrar mesa', url: 'admin.html#/caja', waitFor: '[data-charge]',
      setup: async h => { await h.click('[data-charge]'); await h.modal(); },
      description: 'Cobro de una mesa con el detalle del consumo, propina y medio de pago. Al cobrar, la mesa queda libre.',
      actions: ['Revisar el consumo', 'Elegir la propina', 'Elegir efectivo, tarjeta o transferencia', 'Registrar el pago y liberar la mesa']
    },
    {
      id: 'cajero-pedidos', section: 'cajero', login: U.cajero, roles: ['Administrador', 'Cajero', 'Jefe de cocina'], title: 'Pedidos', url: 'admin.html#/pedidos', waitFor: firstRow,
      description: 'Historial de comandas con mesa, platos, total, origen (QR o garzón) y estado.',
      actions: ['Filtrar por estado, origen, fecha y mesa', 'Buscar un pedido', 'Abrir el detalle de un pedido', 'Exportar a CSV']
    },
    {
      id: 'cajero-pedido', section: 'cajero', login: U.cajero, roles: ['Administrador', 'Cajero', 'Jefe de cocina'], kind: 'modal', from: 'Clic en un pedido del historial', title: 'Detalle de pedido', url: 'admin.html#/pedidos', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Comanda con sus platos, opciones, estados y tiempos, con acciones para entregar, anular un plato o cancelar el pedido.',
      actions: ['Ver cada plato con sus opciones', 'Marcar como entregado', 'Anular un plato', 'Cancelar el pedido']
    },
    {
      id: 'cajero-reservas', section: 'cajero', login: U.cajero, roles: ['Administrador', 'Cajero', 'Garzón'], title: 'Reservas', url: 'admin.html#/reservas', waitFor: '[data-st]',
      description: 'Agenda del día por horario con cada reserva y su estado, más la tabla de todas las reservas.',
      actions: ['Confirmar, sentar o marcar "no asistió"', 'Cancelar una reserva', 'Asignar mesa y editar datos', 'Cambiar de día o ver todas', 'Crear una reserva telefónica']
    },
    {
      id: 'cajero-reserva', section: 'cajero', login: U.cajero, roles: ['Administrador', 'Cajero', 'Garzón'], kind: 'modal', from: 'Botón "Nueva reserva" o "Editar" en Reservas', title: 'Nueva reserva', url: 'admin.html#/reservas', waitFor: '[data-st]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de reserva interna con fecha, hora, personas, zona, mesa asignada, datos de contacto y estado.',
      actions: ['Registrar una reserva telefónica', 'Asignar una mesa', 'Definir el estado', 'Agregar notas']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, roles: ['Administrador', 'Cajero', 'Jefe de cocina'], title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: head, mobile: true,
      description: 'Indicadores del restaurante: ventas de hoy y de 7 días, ticket promedio, cubiertos, rotación de mesas y satisfacción, con ventas por hora, ventas diarias, top platos, ventas por categoría y el estado del salón en vivo.',
      actions: ['Comparar ventas con la semana anterior', 'Ver las horas de más venta', 'Revisar los platos más pedidos', 'Ver ventas por categoría y rotación por mesa', 'Seguir el salón y los llamados en vivo']
    },
    {
      id: 'admin-carta', section: 'admin', login: U.admin, roles: ['Administrador', 'Jefe de cocina'], title: 'Carta', url: 'admin.html#/carta', waitFor: firstRow,
      description: 'Editor de la carta en tres pestañas: platos (precio, margen, estación, etiquetas y disponibilidad), categorías y grupos de modificadores. Los cambios se ven al instante en la carta pública y en las mesas.',
      actions: ['Crear y editar platos en español e inglés', 'Activar o desactivar la disponibilidad', 'Revisar el margen de cada plato', 'Ordenar categorías', 'Configurar modificadores con precio']
    },
    {
      id: 'admin-plato', section: 'admin', login: U.admin, roles: ['Administrador', 'Jefe de cocina'], kind: 'modal', from: 'Botón "Nuevo plato" o clic en un plato de la carta', title: 'Editor de plato', url: 'admin.html#/carta', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ficha del plato con nombre y descripción bilingües, precio y costo, categoría, estación de cocina, etiquetas, ilustración y modificadores.',
      actions: ['Editar nombre y descripción en dos idiomas', 'Definir precio y costo', 'Asignar categoría y estación', 'Marcar etiquetas (vegano, sin gluten, picante, favorito)', 'Asociar grupos de modificadores']
    },
    {
      id: 'admin-mesas', section: 'admin', login: U.admin, title: 'Mesas y plano', url: 'admin.html#/mesas', waitFor: '[data-floor]',
      description: 'Plano editable del local: se arrastran las mesas para ubicarlas y se edita su número, capacidad, zona y forma.',
      actions: ['Arrastrar mesas por el plano', 'Crear, editar o eliminar mesas', 'Definir capacidad, zona y forma', 'Ver el estado actual de cada mesa']
    },
    {
      id: 'admin-qr', section: 'admin', login: U.admin, title: 'Códigos QR', url: 'admin.html#/qr', waitFor: '[data-print]',
      description: 'Un código QR por mesa con su enlace, listos para imprimir y pegar. El comensal abre la carta con su mesa ya elegida.',
      actions: ['Imprimir todos los QR', 'Abrir la carta de una mesa', 'Copiar el enlace de una mesa']
    },
    {
      id: 'admin-opiniones', section: 'admin', login: U.admin, title: 'Opiniones', url: 'admin.html#/opiniones', waitFor: head,
      description: 'Calificaciones enviadas desde la mesa con promedio general, por comida, atención y ambiente, distribución de estrellas y comentarios.',
      actions: ['Ver promedios por aspecto', 'Revisar la distribución de estrellas', 'Publicar u ocultar comentarios en la portada', 'Eliminar opiniones', 'Exportar a CSV']
    },
    {
      id: 'admin-personal', section: 'admin', login: U.admin, roles: ['Administrador', 'Jefe de cocina'], title: 'Personal y turnos', url: 'admin.html#/personal', waitFor: head,
      description: 'Planificación semanal de turnos por integrante con horas y costo estimado, y ficha del equipo con cargo y área.',
      actions: ['Asignar o editar turnos por día', 'Ver horas semanales y costo estimado', 'Cambiar de semana', 'Administrar el equipo (cargo, área, valor hora)']
    },
    {
      id: 'admin-inventario', section: 'admin', login: U.admin, roles: ['Administrador', 'Jefe de cocina'], title: 'Inventario', url: 'admin.html#/inventario', waitFor: '[data-adj]',
      description: 'Insumos con stock, mínimo, costo y proveedor. El stock se descuenta solo según la receta de cada plato pedido y se alerta lo que está bajo el mínimo.',
      actions: ['Ver alertas de stock crítico', 'Registrar entradas, salidas o mermas', 'Reponer todo lo que está bajo el mínimo', 'Crear o editar insumos', 'Filtrar por categoría, nivel y proveedor']
    },
    {
      id: 'admin-movimiento', section: 'admin', login: U.admin, roles: ['Administrador', 'Jefe de cocina'], kind: 'modal', from: 'Botón "Stock" de un insumo', title: 'Movimiento de stock', url: 'admin.html#/inventario', waitFor: '[data-adj]',
      setup: async h => { await h.click('[data-adj]'); await h.modal(); },
      description: 'Registro de un movimiento de inventario para un insumo, con tipo, cantidad y nota.',
      actions: ['Elegir entrada, salida o merma', 'Indicar la cantidad', 'Agregar una nota (proveedor, motivo)']
    },
    {
      id: 'admin-config', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/config', waitFor: '[data-sec="info"]',
      description: 'Datos del restaurante, portada y avisos bilingües, horario de atención y parámetros de operación. Lo que se cambia se refleja de inmediato en la portada, la carta y las reservas.',
      actions: ['Editar nombre, dirección, contacto y lema', 'Cambiar los textos de la portada y el aviso de la carta', 'Definir el horario por día', 'Activar o pausar los pedidos desde las mesas y ajustar propinas sugeridas']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas del equipo con rol, último acceso y estado, más la matriz de permisos por rol.',
      actions: ['Crear usuarios y asignar rol', 'Activar o desactivar cuentas', 'Eliminar usuarios', 'Revisar qué ve cada rol']
    },
    {
      id: 'admin-actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: head,
      description: 'Registro de acciones del equipo y del sistema: pedidos, cobros, reservas y cambios en la carta.',
      actions: ['Filtrar por acción y usuario', 'Buscar en el registro', 'Exportar a CSV']
    }
  ]
};
