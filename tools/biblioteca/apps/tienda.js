// Biblioteca de vistas de Raíz (/tienda).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', gestor: 'u-gestor', bodega: 'u-bodega', cliente: 'u-camila' };
const firstRow = '.admin-content tbody tr >> nth=0';
const GES = ['Gestor de tienda', 'Administrador'];
const BOD = ['Bodega', 'Gestor de tienda', 'Administrador'];

// Agrega un producto al carro desde su ficha (abre el carro lateral al terminar).
async function addToCart(h, id = 'p07') {
  await h.goto(`index.html#/producto/${id}`, '.size-grid');
  await h.click('.size-grid .size-btn:not([disabled]) >> nth=1');
  await h.click('[data-add]', { after: 500 });
}
// Cierra el carro lateral (navegar solo por hash no lo cierra).
const closeCart = h => h.click('.drawer-head [data-close-drawer]', { after: 400 });
// Avanza el checkout (con sesión de cliente) hasta el paso indicado (0 contacto … 3 revisión).
async function checkoutTo(h, step) {
  await addToCart(h); await closeCart(h);
  await h.goto('index.html#/checkout', '#co-form');
  const next = () => h.click('#co-form button.btn-primary', { after: 400 });
  if (step >= 1) await next();
  if (step >= 2) await next();
  if (step >= 3) {
    await h.fill('#co-card', '4111 1111 1111 1111'); await h.fill('#co-cname', 'Camila Soto');
    await h.fill('#co-exp', '08/29'); await h.fill('#co-cvv', '123');
    await next();
  }
  await h.page.evaluate(() => window.scrollTo(0, 0));
}

module.exports = {
  dir: 'tienda',
  name: 'Raíz',
  kind: 'Tienda de ropa online',
  theme: 'brutal',
  description: 'Tienda de ropa con catálogo filtrable, ficha de producto con tallas y colores, carro, checkout en cuatro pasos, seguimiento de pedidos y cuenta del cliente, más un panel para pedidos, productos, inventario, clientes y marketing.',
  accounts: {
    'u-admin': { name: 'Antonia Fuentes', role: 'Administrador', email: 'admin@raiz.cl', password: 'raiz123' },
    'u-gestor': { name: 'Diego Morales', role: 'Gestor de tienda', email: 'gestor@raiz.cl', password: 'raiz123' },
    'u-bodega': { name: 'Rosa Contreras', role: 'Bodega', email: 'bodega@raiz.cl', password: 'raiz123' },
    'u-camila': { name: 'Camila Soto', role: 'Cliente', email: 'camila@correo.cl', password: 'cliente123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Compra con sesión iniciada y cuenta personal: pedidos, direcciones, favoritos y perfil.' },
    { id: 'bodega', label: 'Bodega', desc: 'Preparación y despacho de pedidos y control de stock.' },
    { id: 'gestor', label: 'Gestor de tienda', desc: 'Catálogo, pedidos, clientes, inventario, cupones, reseñas y contenido del sitio.' },
    { id: 'admin', label: 'Administrador', desc: 'Todo lo anterior más ajustes de la tienda, usuarios y actividad.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Brutal" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' },
      { id: 'forest', group: 'Estilo', label: 'Bosque', desc: 'Verdes naturales y tonos tierra.', theme: 'forest' },
      { id: 'synthwave', group: 'Estilo', label: 'Synthwave', desc: 'Oscuro retro con neón.', theme: 'synthwave' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Portada de la tienda con producto protagonista, categorías, destacados de la temporada, novedades, más vendidos, opiniones de clientes y la historia de la marca. El hero y la barra promocional se editan desde el panel.',
      actions: ['Entrar al catálogo o a una categoría', 'Ver destacados, novedades y más vendidos', 'Marcar productos como favoritos', 'Leer reseñas de clientes', 'Buscar prendas desde la cabecera']
    },
    {
      id: 'catalogo', section: 'publico', title: 'Catálogo', url: 'index.html#/catalogo', waitFor: '.p-card', mobile: true,
      description: 'Listado de productos con filtros combinables en una barra lateral y orden configurable. El conteo de resultados se actualiza al instante.',
      actions: ['Filtrar por categoría, talla y color', 'Ajustar el precio máximo', 'Ver solo ofertas o solo productos con stock', 'Buscar dentro del catálogo y ordenar', 'Limpiar todos los filtros']
    },
    {
      id: 'catalogo-filtrado', section: 'publico', title: 'Catálogo filtrado', url: 'index.html#/catalogo', waitFor: '.p-card',
      setup: async h => { await h.click('[data-sale]'); await h.click('.catalog [data-size="M"]'); await h.page.evaluate(() => window.scrollTo(0, 0)); },
      description: 'El mismo catálogo con los filtros de ofertas y talla M activos: el listado y el conteo se actualizan al instante y los filtros se pueden limpiar de una vez.',
      actions: ['Combinar varios filtros a la vez', 'Ver cuántos productos cumplen los filtros', 'Limpiar los filtros con un clic']
    },
    {
      id: 'producto', section: 'publico', title: 'Ficha de producto', url: 'index.html#/producto/p07', waitFor: '.size-grid', mobile: true,
      description: 'Ficha con galería de vistas, precio, colores, tallas con disponibilidad por variante, cantidad, detalles de la prenda, reseñas y productos relacionados.',
      actions: ['Cambiar color y ver la prenda recoloreada', 'Elegir talla (las agotadas aparecen deshabilitadas)', 'Agregar al carro o a favoritos', 'Leer reseñas y dejar una nueva', 'Ver productos relacionados']
    },
    {
      id: 'producto-resena', section: 'publico', title: 'Reseñas del producto', url: 'index.html#/producto/p07', waitFor: '#review-form',
      setup: async h => { await h.scrollTo('#review-form', 'center'); },
      description: 'Sección de reseñas de la ficha con promedio, opiniones aprobadas (las de compradores llevan el sello de compra verificada) y el formulario para escribir una nueva, que queda pendiente de moderación.',
      actions: ['Leer opiniones con nota y fecha', 'Escribir una reseña con nota de 1 a 5', 'Ver cuáles son de compradores verificados']
    },
    {
      id: 'carro', section: 'publico', kind: 'modal', from: 'Botón "Agregar al carro" o ícono del carro en la cabecera', title: 'Carro lateral', url: 'index.html#/producto/p07', waitFor: '.size-grid',
      setup: async h => {
        await addToCart(h);
        await h.fill('.drawer-foot input[aria-label="Cupón"]', 'BIENVENIDA10'); await h.page.locator('.drawer-foot form').evaluate(f => f.requestSubmit()); await h.pause(300);
      },
      description: 'Carro deslizable con las prendas agregadas, barra de avance hacia el envío gratis, cupón de descuento y resumen con envío y total.',
      actions: ['Cambiar cantidades o quitar prendas', 'Ver cuánto falta para el envío gratis', 'Aplicar o quitar un cupón', 'Ir a pagar']
    },
    {
      id: 'checkout-invitado', section: 'publico', title: 'Checkout como invitado', url: 'index.html#/producto/p07', waitFor: '.size-grid',
      setup: async h => { await addToCart(h); await closeCart(h); await h.goto('index.html#/checkout', '#co-form'); return { url: 'index.html#/checkout' }; },
      description: 'Primer paso del checkout sin cuenta: datos de contacto, con el resumen del carro al costado. Se puede comprar sin registrarse.',
      actions: ['Ingresar correo, nombre y teléfono', 'Revisar el resumen del pedido', 'Avanzar a despacho, pago y revisión']
    },
    {
      id: 'seguimiento', section: 'publico', title: 'Seguimiento de pedido', url: 'index.html#/seguimiento', waitFor: '#track',
      description: 'Formulario para seguir un pedido con su número y el correo de la compra, sin necesidad de iniciar sesión.',
      actions: ['Ingresar número de pedido y correo', 'Ir al estado del pedido', 'Entrar a su cuenta para ver todos sus pedidos']
    },
    {
      id: 'seguimiento-pedido', section: 'publico', title: 'Estado del pedido', url: 'index.html#/seguimiento', waitFor: '#track',
      setup: async h => {
        const o = await h.page.evaluate(() => { const d = JSON.parse(localStorage.getItem('lgw:db:tienda')); const x = d.orders.find(o => o.status === 'enviado'); return { n: x.number, e: x.customer.email }; });
        await h.fill('#tr-n', o.n); await h.fill('#tr-e', o.e); await h.click('#track button.btn-primary'); await h.wait('.detail-grid');
        return { url: h.here() };
      },
      description: 'Estado de un pedido con la línea de tiempo (pagado, preparando, enviado, entregado), número de seguimiento, productos, despacho y totales.',
      actions: ['Ver en qué etapa va el pedido', 'Revisar el número de seguimiento del courier', 'Ver productos, dirección y totales']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para clientes y equipo: los clientes van a su cuenta y el equipo al panel. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como cliente, bodega, gestor o administrador', 'Pasar a crear una cuenta', 'Volver a la tienda']
    },
    {
      id: 'registro', section: 'publico', title: 'Crear cuenta', url: 'login.html?tab=registro', waitFor: '#register',
      description: 'Registro de clientes con nombre, correo, teléfono y contraseña, y opción de recibir novedades.',
      actions: ['Crear una cuenta de cliente', 'Suscribirse a las novedades', 'Entrar directo a su cuenta']
    },

    // ================= Cliente =================
    {
      id: 'checkout-despacho', section: 'cliente', login: U.cliente, title: 'Checkout: despacho', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => { await checkoutTo(h, 1); return { url: 'index.html#/checkout' }; },
      description: 'Paso de despacho con las tarifas configuradas en el panel (incluido retiro en tienda) y las direcciones guardadas del cliente, o una nueva.',
      actions: ['Elegir el tipo de despacho y ver su costo', 'Usar una dirección guardada o ingresar otra', 'Guardar la dirección nueva en su cuenta']
    },
    {
      id: 'checkout-pago', section: 'cliente', login: U.cliente, title: 'Checkout: pago', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => { await checkoutTo(h, 2); return { url: 'index.html#/checkout' }; },
      description: 'Paso de pago con tarjeta (simulada) o transferencia bancaria. Las tarjetas terminadas en 0000 simulan un pago rechazado.',
      actions: ['Pagar con tarjeta de crédito o débito', 'Elegir transferencia y recibir los datos bancarios', 'Volver a corregir el despacho']
    },
    {
      id: 'checkout-revision', section: 'cliente', login: U.cliente, title: 'Checkout: revisión', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => { await checkoutTo(h, 3); return { url: 'index.html#/checkout' }; },
      description: 'Último paso con el resumen de contacto, despacho y pago antes de confirmar. Al pagar se descuenta el stock y el pedido aparece en el panel.',
      actions: ['Revisar todos los datos del pedido', 'Aceptar términos y política de cambios', 'Confirmar y pagar']
    },
    {
      id: 'pedido-confirmado', section: 'cliente', login: U.cliente, title: 'Pedido confirmado', url: 'index.html#/', waitFor: '.site-hero',
      setup: async h => { await checkoutTo(h, 3); await h.check('#co-form [name="terms"]'); await h.click('#co-form button.btn-primary'); await h.page.waitForURL(/pedido\//, { timeout: 8000 }); await h.wait('.detail-grid'); return { url: h.here() }; },
      description: 'Confirmación de compra con número de pedido, estado, productos, despacho y totales.',
      actions: ['Ver el número y el estado del pedido', 'Revisar productos y montos', 'Seguir el pedido desde su cuenta']
    },
    {
      id: 'cuenta', section: 'cliente', login: U.cliente, title: 'Mi cuenta: resumen', url: 'index.html#/cuenta', waitFor: '.account-nav', mobile: true,
      description: 'Inicio de la cuenta del cliente con sus últimos pedidos, total comprado, dirección principal y accesos a cada sección.',
      actions: ['Ver sus pedidos recientes y su estado', 'Ir a direcciones, favoritos o perfil', 'Cerrar sesión']
    },
    {
      id: 'cuenta-pedidos', section: 'cliente', login: U.cliente, title: 'Mis pedidos', url: 'index.html#/cuenta/pedidos', waitFor: '.account-nav',
      description: 'Historial de pedidos del cliente con número, fecha, total y estado.',
      actions: ['Revisar todos sus pedidos', 'Abrir el detalle y seguimiento de cada uno', 'Volver a comprar']
    },
    {
      id: 'cuenta-pedido', section: 'cliente', login: U.cliente, title: 'Detalle de mi pedido', url: 'index.html#/cuenta/pedidos', waitFor: '.account-nav',
      setup: async h => { await h.click('a[href*="#/cuenta/pedidos/"]'); await h.wait('.account-nav'); await h.pause(200); return { url: h.here() }; },
      description: 'Detalle de un pedido dentro de la cuenta, con la línea de tiempo, el seguimiento, los productos y los totales.',
      actions: ['Seguir el avance del pedido', 'Ver el número de seguimiento', 'Revisar productos, dirección y pago']
    },
    {
      id: 'cuenta-direcciones', section: 'cliente', login: U.cliente, title: 'Mis direcciones', url: 'index.html#/cuenta/direcciones', waitFor: '[data-addr-new]',
      description: 'Direcciones de despacho guardadas, con una marcada como principal, que se ofrecen en el checkout.',
      actions: ['Agregar una dirección nueva', 'Editar o eliminar direcciones', 'Elegir la dirección principal']
    },
    {
      id: 'cuenta-favoritos', section: 'cliente', login: U.cliente, title: 'Favoritos', url: 'index.html#/cuenta/favoritos', waitFor: '.p-card',
      description: 'Prendas guardadas como favoritas para comprarlas después.',
      actions: ['Ver sus prendas favoritas', 'Quitar favoritos', 'Ir a la ficha para comprar']
    },
    {
      id: 'cuenta-perfil', section: 'cliente', login: U.cliente, title: 'Perfil', url: 'index.html#/cuenta/perfil', waitFor: '.account-nav',
      description: 'Datos personales del cliente, preferencia de novedades y cambio de contraseña.',
      actions: ['Editar nombre, correo y teléfono', 'Activar o desactivar las novedades', 'Cambiar la contraseña']
    },

    // ================= Bodega =================
    {
      id: 'bodega-pedidos', section: 'bodega', login: U.bodega, roles: BOD, title: 'Pedidos por preparar', url: 'admin.html#/pedidos', waitFor: '.admin-content table', mobile: true,
      description: 'La bodega entra directo a los pedidos: ve el menú reducido a Pedidos e Inventario y avanza cada pedido por sus etapas.',
      actions: ['Filtrar pedidos por estado', 'Abrir un pedido para prepararlo', 'Marcarlo como preparado o enviado', 'Ver cuántos pedidos esperan en el menú']
    },
    {
      id: 'bodega-restringido', section: 'bodega', login: U.bodega, title: 'Ruta protegida por rol', url: 'admin.html#/clientes', waitFor: '.admin-content .empty',
      description: 'Lo que ve la bodega si intenta abrir una sección que no le corresponde (en este caso, Clientes).',
      actions: ['Ver el aviso de acceso restringido', 'Volver a Pedidos o Inventario', 'Confirmar que cada rol solo ve sus menús']
    },

    // ================= Gestor de tienda =================
    {
      id: 'dashboard', section: 'gestor', login: U.gestor, roles: GES, title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content .kpis', mobile: true,
      description: 'Resumen de la tienda en 7, 30 o 90 días: ventas, pedidos, ticket promedio y conversión, curva de ventas, embudo de conversión, ventas por mes, pedidos por estado, unidades por categoría, más vendidos, últimos pedidos y alertas de inventario.',
      actions: ['Cambiar el rango entre 7, 30 y 90 días', 'Ver ventas, ticket promedio y conversión contra el período anterior', 'Revisar el embudo y los pedidos por estado', 'Ver los productos más vendidos y los últimos pedidos', 'Atender las alertas de stock bajo']
    },
    {
      id: 'pedidos', section: 'gestor', login: U.gestor, roles: BOD, title: 'Pedidos', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      description: 'Todos los pedidos con número, cliente, fecha, total, pago y estado.',
      actions: ['Buscar por número, cliente o correo', 'Filtrar por estado y forma de pago', 'Abrir el detalle de un pedido', 'Exportar a CSV']
    },
    {
      id: 'pedido-detalle', section: 'gestor', login: U.gestor, roles: BOD, title: 'Detalle del pedido', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-note]'); return { url: h.here() }; },
      description: 'Ficha del pedido con productos, cliente, despacho, historial de estados y notas internas.',
      actions: ['Avanzar el pedido a la siguiente etapa', 'Registrar el número de seguimiento', 'Agregar notas internas', 'Cancelar o reembolsar', 'Imprimir la boleta']
    },
    {
      id: 'pedido-seguimiento', section: 'gestor', login: U.gestor, roles: BOD, kind: 'modal', from: 'Botón de seguimiento en el detalle del pedido', title: 'Número de seguimiento', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-track]'); await h.click('[data-track]'); await h.modal(); return { url: h.here() }; },
      description: 'Ventana para registrar el courier y el número de seguimiento, que luego ve el cliente en su pedido.',
      actions: ['Ingresar el número de seguimiento', 'Dejarlo visible para el cliente', 'Registrar el cambio en el historial']
    },
    {
      id: 'pedido-reembolso', section: 'gestor', login: U.gestor, roles: GES, kind: 'modal', from: 'Botón "Reembolsar" en el detalle del pedido', title: 'Reembolso', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.select('[data-f="status"]', 'entregado'); await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-refund]'); await h.click('[data-refund]'); await h.modal(); return { url: h.here() }; },
      description: 'Ventana para reembolsar un pedido total o parcialmente (hasta el monto pagado), con motivo y opción de reingresar las prendas al inventario.',
      actions: ['Indicar el monto a reembolsar', 'Escribir el motivo', 'Reponer el stock de las prendas devueltas']
    },
    {
      id: 'boleta', section: 'gestor', login: U.gestor, roles: BOD, title: 'Boleta del pedido', url: 'admin.html#/pedidos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-note]'); await h.goto(h.here() + '/boleta', '[data-print]'); return { url: h.here() }; },
      description: 'Boleta electrónica simulada del pedido lista para imprimir, con datos de la tienda, del cliente, detalle y totales con IVA.',
      actions: ['Revisar el detalle y los totales', 'Imprimir o guardar en PDF', 'Volver al pedido']
    },
    {
      id: 'productos', section: 'gestor', login: U.gestor, roles: GES, title: 'Productos', url: 'admin.html#/productos', waitFor: '.admin-content table',
      description: 'Catálogo con categoría, precio, stock total, ventas y estado de cada producto.',
      actions: ['Buscar y filtrar por categoría o estado', 'Crear un producto nuevo', 'Abrir la ficha de un producto', 'Exportar a CSV']
    },
    {
      id: 'producto-ficha', section: 'gestor', login: U.gestor, roles: GES, title: 'Ficha del producto', url: 'admin.html#/productos/p07', waitFor: '.admin-content [data-edit]',
      description: 'Ficha interna del producto con unidades vendidas por semana, variantes con su stock, pedidos recientes que lo incluyen y sus reseñas.',
      actions: ['Ver las ventas semanales', 'Revisar y ajustar el stock de cada variante', 'Ver los pedidos recientes con el producto', 'Editar o eliminar el producto']
    },
    {
      id: 'producto-editar', section: 'gestor', login: U.gestor, roles: GES, kind: 'modal', from: 'Botón "Editar" en la ficha o "Nuevo producto"', title: 'Editar producto', url: 'admin.html#/productos/p07', waitFor: '.admin-content [data-edit]',
      setup: async h => { await h.click('[data-edit]'); await h.modal(); },
      description: 'Formulario del producto con nombre, categoría, precio, precio anterior, costo y margen, descripción, colores, tallas y matriz de variantes con stock, más vista previa.',
      actions: ['Editar nombre, descripción y categoría', 'Definir precio, oferta y costo (con el margen calculado)', 'Agregar colores y tallas', 'Cargar el stock de cada variante', 'Marcar como destacado o cambiar su estado']
    },
    {
      id: 'categorias', section: 'gestor', login: U.gestor, roles: GES, title: 'Categorías', url: 'admin.html#/categorias', waitFor: '.admin-content table',
      description: 'Categorías de la tienda con orden, cantidad de productos y visibilidad en el menú.',
      actions: ['Crear o editar una categoría', 'Cambiar su orden en el menú', 'Ocultar una categoría completa', 'Eliminar las que no tengan productos']
    },
    {
      id: 'categoria-modal', section: 'gestor', login: U.gestor, roles: GES, kind: 'modal', from: 'Botón "Nueva categoría" en Categorías', title: 'Nueva categoría', url: 'admin.html#/categorias', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de categoría con nombre, descripción y orden en el menú. La visibilidad se cambia con el interruptor de la tabla.',
      actions: ['Definir el nombre', 'Escribir la descripción', 'Elegir el orden en el menú']
    },
    {
      id: 'inventario', section: 'gestor', login: U.gestor, roles: BOD, title: 'Inventario', url: 'admin.html#/inventario', waitFor: '.admin-content table',
      description: 'Stock por variante (talla y color) con unidades en bodega, valor a costo, variantes con stock bajo y agotadas.',
      actions: ['Filtrar por estado de stock o categoría', 'Sumar o restar unidades con un clic', 'Ajustar el stock con un motivo', 'Exportar a CSV']
    },
    {
      id: 'inventario-ajuste', section: 'gestor', login: U.gestor, roles: BOD, kind: 'modal', from: 'Botón "Ajustar" en Inventario', title: 'Ajustar stock', url: 'admin.html#/inventario', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-adj] >> nth=0'); await h.modal(); },
      description: 'Ventana para fijar o corregir el stock de una variante con un motivo (recepción, merma, conteo), que queda en los movimientos.',
      actions: ['Indicar la nueva cantidad o la diferencia', 'Elegir el motivo del ajuste', 'Dejar el movimiento registrado']
    },
    {
      id: 'inventario-movimientos', section: 'gestor', login: U.gestor, roles: BOD, title: 'Movimientos de stock', url: 'admin.html#/inventario', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-tab="movs"]'); await h.wait('.admin-content table'); },
      description: 'Historial de entradas y salidas de stock: ventas, ajustes, reembolsos y recepciones, con usuario y motivo.',
      actions: ['Ver cada movimiento con fecha y usuario', 'Filtrar los movimientos', 'Buscar por producto o SKU']
    },
    {
      id: 'clientes', section: 'gestor', login: U.gestor, roles: GES, title: 'Clientes', url: 'admin.html#/clientes', waitFor: '.admin-content table',
      description: 'Base de clientes con indicadores (clientes con compras, recurrentes, gasto promedio, VIP) y una tabla con comuna, pedidos, total gastado, última compra y segmento.',
      actions: ['Buscar por nombre o correo', 'Filtrar por segmento o estado', 'Ordenar por total gastado', 'Crear un cliente nuevo', 'Abrir la ficha de un cliente', 'Exportar a CSV']
    },
    {
      id: 'cliente-ficha', section: 'gestor', login: U.gestor, roles: GES, title: 'Ficha del cliente', url: 'admin.html#/clientes/u-camila', waitFor: '.admin-content [data-edit]',
      description: 'Ficha del cliente con sus pedidos, datos de contacto, direcciones, favoritos y reseñas.',
      actions: ['Ver el historial de pedidos', 'Revisar direcciones y favoritos', 'Editar los datos del cliente', 'Activar o bloquear la cuenta']
    },
    {
      id: 'cupones', section: 'gestor', login: U.gestor, roles: GES, title: 'Cupones y descuentos', url: 'admin.html#/cupones', waitFor: '.admin-content table',
      description: 'Cupones con tipo (porcentaje, monto fijo o envío gratis), mínimo de compra, usos, vencimiento y estado.',
      actions: ['Crear un cupón nuevo', 'Ver cuántas veces se usó cada uno', 'Activar o desactivar cupones', 'Exportar a CSV']
    },
    {
      id: 'cupon-modal', section: 'gestor', login: U.gestor, roles: GES, kind: 'modal', from: 'Botón "Nuevo cupón" en Cupones', title: 'Nuevo cupón', url: 'admin.html#/cupones', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario del cupón con código, tipo, valor, compra mínima, límite de usos, vencimiento y descripción.',
      actions: ['Definir código y tipo de descuento', 'Fijar compra mínima y límite de usos', 'Poner fecha de vencimiento', 'Activarlo o dejarlo inactivo']
    },
    {
      id: 'resenas', section: 'gestor', login: U.gestor, roles: GES, title: 'Reseñas', url: 'admin.html#/resenas', waitFor: '.admin-content .tabs',
      description: 'Moderación de reseñas de productos en pestañas (pendientes, aprobadas, rechazadas), con la valoración promedio publicada.',
      actions: ['Aprobar o rechazar reseñas', 'Aprobar de una vez todas las de 4 estrellas o más', 'Filtrar por número de estrellas', 'Buscar por producto o autor']
    },
    {
      id: 'contenido', section: 'gestor', login: U.gestor, roles: GES, title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: '#cms',
      description: 'Editor de la portada de la tienda con vista previa: hero, producto protagonista, barra promocional y texto de la historia.',
      actions: ['Editar el título, bajada y botón del hero', 'Elegir el producto protagonista', 'Mostrar u ocultar la barra promocional', 'Publicar o restaurar los textos originales']
    },

    // ================= Administrador =================
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Ajustes de tienda', url: 'admin.html#/ajustes', waitFor: '[data-rates]',
      description: 'Datos de la tienda, tarifas de despacho, envío gratis desde cierto monto y alerta de stock bajo, con un resumen de cómo se verá en el sitio, el uso de almacenamiento de la demo y el botón para restablecer los datos.',
      actions: ['Editar nombre, lema, contacto y dirección de la tienda física', 'Crear y editar tarifas de despacho', 'Definir el monto para envío gratis', 'Fijar la alerta de stock bajo', 'Restablecer los datos demo']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas del equipo y de clientes con rol, alta, último acceso y estado. El rol se cambia directo en la tabla.',
      actions: ['Crear una cuenta del equipo', 'Cambiar rol o datos', 'Desactivar usuarios', 'Asignar una contraseña nueva', 'Revisar los permisos de cada rol']
    },
    {
      id: 'usuario-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario" en Usuarios y roles', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de cuenta con nombre, correo, rol y contraseña inicial, con opción de mostrarla como cuenta de demostración en el login.',
      actions: ['Ingresar nombre y correo', 'Asignar rol (administrador, gestor o bodega)', 'Definir la contraseña inicial']
    },
    {
      id: 'actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: '.admin-content table',
      description: 'Registro de lo que pasa en la tienda: pedidos, cambios de estado, ajustes de stock, reseñas y cambios del equipo.',
      actions: ['Filtrar por tipo de acción o usuario', 'Buscar en el detalle', 'Ver quién hizo cada cambio']
    }
  ]
};
