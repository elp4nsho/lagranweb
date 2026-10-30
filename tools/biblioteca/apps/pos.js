// Biblioteca de vistas de Almacén Pampa (/pos).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', supervisor: 'u-super', cajero: 'u-cajero', bodega: 'u-bodega' };
const firstRow = '.admin-content tbody tr >> nth=0';
const SUP = ['Supervisor', 'Administrador'];
const INV = ['Bodeguero', 'Supervisor', 'Administrador'];

// Abre el turno de la caja libre de la demo (Caja 1 · Pampa Centro).
async function openShift(h) {
  await h.click('[data-open]', { after: 400 });
  await h.wait('.tiles .tile');
}
// Turno abierto con una venta en curso de varias líneas.
async function withSale(h) {
  await openShift(h);
  for (const n of [0, 1, 1, 3, 5]) await h.click(`.tiles .tile:not([disabled]) >> nth=${n}`, { after: 120 });
}
// Venta cobrada en efectivo con vuelto (deja la boleta abierta).
async function paidSale(h) {
  await withSale(h);
  await h.click('[data-pay]'); await h.modal();
  await h.click('.modal [data-quick] >> nth=2', { after: 200 });
  await h.click('.modal [data-confirm]', { after: 600 });
}

module.exports = {
  dir: 'pos',
  name: 'Almacén Pampa',
  kind: 'Punto de venta multi-sucursal',
  theme: 'graphite',
  description: 'Sistema de punto de venta para una cadena de cafeterías y minimarkets: caja táctil con turnos y arqueo, pagos mixtos, puntos de fidelización y modo sin conexión, más un back-office de inventario, compras, caja, clientes y personal.',
  accounts: {
    'u-admin': { name: 'Carolina Vidal', role: 'Administrador', email: 'admin@pampa.cl', password: 'pampa123' },
    'u-super': { name: 'Jorge Ramírez', role: 'Supervisor', email: 'supervisor@pampa.cl', password: 'pampa123' },
    'u-cajero': { name: 'Daniela Pérez', role: 'Cajero', email: 'cajero@pampa.cl', password: 'pampa123' },
    'u-bodega': { name: 'Luis Herrera', role: 'Bodeguero', email: 'bodega@pampa.cl', password: 'pampa123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Presentación del sistema e ingreso, sin iniciar sesión.' },
    { id: 'cajero', label: 'Cajero', desc: 'La caja: turno, venta, cobro, boleta, retiros y cierre con arqueo.' },
    { id: 'bodeguero', label: 'Bodeguero', desc: 'Productos, stock por sucursal, movimientos, órdenes de compra y proveedores.' },
    { id: 'supervisor', label: 'Supervisor', desc: 'Dashboard, reportes de caja, clientes y puntos, empleados y turnos; autoriza descuentos en caja.' },
    { id: 'admin', label: 'Administrador', desc: 'Todo lo anterior más sucursales, usuarios, ajustes y actividad.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Grafito" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'aurora', group: 'Estilo', label: 'Aurora', desc: 'SaaS limpio y luminoso.', theme: 'aurora' },
      { id: 'terminal', group: 'Estilo', label: 'Terminal', desc: 'Pantalla de consola monoespaciada.', theme: 'terminal' },
      { id: 'metro', group: 'Estilo', label: 'Metro', desc: 'Bloques planos de color.', theme: 'metro' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Presentación del sistema', url: 'index.html', waitFor: '.site-hero', mobile: true,
      description: 'Página pública que presenta el punto de venta con cifras en vivo de la base demo (ventas de la semana, transacciones, cajas abiertas), funciones, sucursales con su actividad del día y planes.',
      actions: ['Ver las cifras de ventas en vivo', 'Revisar las funciones de caja e inventario', 'Ver cada sucursal con sus cajas y ventas de hoy', 'Comparar los planes por caja', 'Entrar a probar la caja o al back-office']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso único para la caja y el back-office. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como cajero, supervisor, bodeguero o administrador', 'Ir a la caja o al back-office según el rol']
    },

    // ================= Cajero =================
    {
      id: 'caja-abrir-turno', section: 'cajero', login: U.cajero, title: 'Apertura de turno', url: 'pos.html', waitFor: '[data-open]', mobile: true,
      description: 'Antes de vender, el cajero elige sucursal y caja y cuenta el fondo inicial, en total o por denominación. Si la caja está tomada por otra persona, se avisa.',
      actions: ['Elegir sucursal y caja', 'Ingresar el fondo inicial', 'Contar billetes y monedas por denominación', 'Abrir el turno']
    },
    {
      id: 'caja', section: 'cajero', login: U.cajero, title: 'Caja: venta en curso', url: 'pos.html', waitFor: '[data-open]', mobile: true,
      setup: async h => withSale(h),
      description: 'Pantalla de venta con grilla táctil de productos por categoría (con stock de la sucursal en cada botón), buscador, lector de código de barras y la venta en curso con totales e IVA.',
      actions: ['Agregar productos tocando, buscando o escaneando', 'Cambiar cantidades y aplicar descuentos por línea o generales', 'Asociar un cliente para sumar puntos', 'Retener la venta y recuperarla después', 'Cobrar con F9']
    },
    {
      id: 'caja-cliente', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Botón de cliente en la venta en curso (F4)', title: 'Cliente de la venta', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => { await withSale(h); await h.click('[data-customer]'); await h.modal(); },
      description: 'Búsqueda de cliente por RUT, nombre, teléfono o correo, con su nivel y puntos, y registro rápido de un cliente nuevo con validación de RUT.',
      actions: ['Buscar un cliente frecuente', 'Ver su nivel y saldo de puntos', 'Registrar un cliente nuevo y asociarlo', 'Quitar el cliente de la venta']
    },
    {
      id: 'caja-descuento', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Descuento de línea mayor al permitido al cajero', title: 'Autorización de supervisor', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => {
        await withSale(h); await h.click('[data-ldisc="0"]'); await h.modal();
        await h.click('.modal [data-pct="20"]', { after: 300 }); await h.wait('.modal-backdrop .modal [data-pin], .modal input#pin');
      },
      description: 'Si el cajero aplica un descuento mayor a su máximo (10 % en la demo), la caja pide el PIN de un supervisor antes de aplicarlo.',
      actions: ['Elegir un porcentaje de descuento rápido o escribirlo', 'Pedir autorización con PIN de supervisor', 'Aplicar el descuento autorizado']
    },
    {
      id: 'caja-cobro', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Botón "Cobrar" (F9)', title: 'Cobro con pagos mixtos', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => {
        await withSale(h); await h.click('[data-pay]'); await h.modal();
        await h.click('.modal [data-method="tarjeta"]'); await h.fill('.modal #pay-amt', '5000'); await h.page.locator('.modal [data-addpay]').evaluate(f => f.requestSubmit()); await h.pause(200);
        await h.click('.modal [data-method="efectivo"]');
      },
      description: 'Ventana de cobro que combina efectivo (con montos rápidos y cálculo de vuelto), tarjeta, transferencia y canje de puntos en una misma venta.',
      actions: ['Elegir medio de pago y monto', 'Usar montos rápidos en efectivo y ver el vuelto', 'Combinar varios medios de pago', 'Canjear puntos del cliente', 'Confirmar la venta']
    },
    {
      id: 'caja-boleta', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Al confirmar el cobro', title: 'Venta registrada y boleta', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => { await paidSale(h); await h.wait('.modal [data-print]'); },
      description: 'Boleta de la venta recién registrada con número, detalle, IVA, medios de pago y vuelto, lista para imprimir.',
      actions: ['Revisar la boleta', 'Imprimirla', 'Empezar una venta nueva']
    },
    {
      id: 'caja-ventas', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Botón "Ventas" de la barra superior', title: 'Ventas del turno', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => { await paidSale(h); await h.click('.modal-foot [data-close]', { after: 300 }); await h.click('[data-sales]'); await h.modal(); },
      description: 'Listado de las boletas del turno con hora, total y medio de pago. Desde aquí se reimprime o se anula una boleta con motivo.',
      actions: ['Ver las ventas del turno', 'Reabrir una boleta para reimprimirla', 'Anular una boleta indicando el motivo']
    },
    {
      id: 'caja-movimiento', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Botón "Caja" de la barra superior', title: 'Retiro o ingreso de efectivo', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => { await openShift(h); await h.click('[data-move]'); await h.modal(); },
      description: 'Registro de retiros (depósito a caja fuerte, pago a proveedor) o ingresos de efectivo durante el turno, que se descuentan o suman en el arqueo.',
      actions: ['Elegir retiro o ingreso', 'Indicar monto y motivo', 'Dejarlo registrado para el cierre']
    },
    {
      id: 'caja-sin-conexion', section: 'cajero', login: U.cajero, title: 'Modo sin conexión', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => { await paidSale(h); await h.click('.modal-foot [data-close]', { after: 300 }); await h.click('[data-net]', { after: 300 }); await paidSale2(h); },
      description: 'Simulación de corte de internet: la caja sigue vendiendo, las ventas quedan en cola (se ve el contador junto al indicador) y se sincronizan al reconectar.',
      actions: ['Simular un corte de conexión', 'Seguir vendiendo sin internet', 'Ver cuántas ventas quedan en cola', 'Reconectar y sincronizar']
    },
    {
      id: 'caja-retenidas', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Botón "Retenidas" (F7)', title: 'Ventas retenidas', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => {
        await withSale(h); await h.click('[data-hold]', { after: 300 });
        for (const n of [2, 4]) await h.click(`.tiles .tile:not([disabled]) >> nth=${n}`, { after: 120 });
        await h.click('[data-hold]', { after: 300 }); await h.click('[data-held]'); await h.modal();
      },
      description: 'Ventas puestas en espera (por ejemplo, un cliente que fue a buscar algo) para atender a otro y recuperarlas después.',
      actions: ['Ver las ventas en espera con hora y monto', 'Recuperar una venta', 'Descartar una venta retenida']
    },
    {
      id: 'caja-cierre', section: 'cajero', login: U.cajero, kind: 'modal', from: 'Botón "Cerrar turno"', title: 'Arqueo y cierre de turno', url: 'pos.html', waitFor: '[data-open]',
      setup: async h => { await paidSale(h); await h.click('.modal-foot [data-close]', { after: 300 }); await h.click('[data-close-shift]'); await h.modal(); await h.click('.modal [data-fill]', { after: 200 }); },
      description: 'Cierre del turno con el resumen de ventas por medio de pago, fondo, retiros y efectivo esperado, conteo por denominación y diferencia.',
      actions: ['Revisar ventas por medio de pago', 'Contar el efectivo por denominación', 'Ver la diferencia contra lo esperado', 'Dejar observaciones y cerrar el turno', 'Imprimir el reporte de cierre']
    },

    // ================= Bodeguero =================
    {
      id: 'stock', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Stock por sucursal', url: 'admin.html#/inventario', waitFor: '.admin-content table', mobile: true,
      description: 'Inventario valorizado a costo con una columna por sucursal; las celdas bajo el mínimo se marcan en color. El bodeguero entra directo aquí.',
      actions: ['Ver el stock de cada producto en cada sucursal', 'Filtrar por categoría o productos bajo mínimo', 'Registrar entradas, mermas o transferencias', 'Exportar a CSV']
    },
    {
      id: 'stock-movimiento', section: 'bodeguero', login: U.bodega, roles: INV, kind: 'modal', from: 'Botón "Mover" en Stock por sucursal', title: 'Movimiento de inventario', url: 'admin.html#/inventario', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-mv] >> nth=0'); await h.modal(); },
      description: 'Registro de entrada, merma, ajuste o transferencia entre sucursales para un producto, con cantidad y nota.',
      actions: ['Elegir el tipo de movimiento', 'Indicar sucursal de origen y destino', 'Ingresar cantidad y motivo']
    },
    {
      id: 'movimientos', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Movimientos de stock', url: 'admin.html#/movimientos', waitFor: '.admin-content table',
      description: 'Historial de entradas, ventas, mermas, ajustes, transferencias y recepciones de compra, con sucursal, usuario y nota.',
      actions: ['Filtrar por tipo, sucursal o producto', 'Registrar un movimiento nuevo', 'Exportar a CSV']
    },
    {
      id: 'productos', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Productos', url: 'admin.html#/productos', waitFor: '.admin-content table',
      description: 'Catálogo con SKU, código de barras, categoría, costo, precio, margen y stock total.',
      actions: ['Buscar por nombre, SKU o código de barras', 'Filtrar por categoría', 'Abrir la ficha de un producto', 'Exportar a CSV']
    },
    {
      id: 'producto-ficha', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Ficha del producto', url: 'admin.html#/productos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.wait('.admin-content [data-move]'); return { url: h.here() }; },
      description: 'Ficha con precio, margen y ventas, unidades vendidas por día, stock en cada sucursal (con su mínimo) y los últimos movimientos del producto.',
      actions: ['Ver las ventas diarias', 'Revisar el stock por sucursal', 'Registrar un movimiento desde la ficha', 'Ver los últimos movimientos']
    },
    {
      id: 'compras', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Órdenes de compra', url: 'admin.html#/compras', waitFor: '.admin-content table',
      description: 'Órdenes de compra a proveedores con lo pendiente por recibir, borradores y compras del mes.',
      actions: ['Crear una orden de compra', 'Filtrar por estado o sucursal', 'Abrir una orden', 'Exportar a CSV']
    },
    {
      id: 'compra-nueva', section: 'bodeguero', login: U.bodega, roles: INV, kind: 'modal', from: 'Botón "Nueva orden de compra"', title: 'Nueva orden de compra', url: 'admin.html#/compras', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de orden de compra con proveedor, sucursal de destino, fecha de entrega y líneas de productos con cantidad y costo.',
      actions: ['Elegir proveedor y sucursal', 'Agregar líneas con cantidad y costo', 'Guardar como borrador o enviar al proveedor']
    },
    {
      id: 'compra-detalle', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Orden de compra', url: 'admin.html#/compras', waitFor: '.admin-content table',
      setup: async h => { await h.select('[data-f="status"]', 'enviada'); await h.click(firstRow + ' >> td >> nth=0'); await h.wait('.admin-content .doc'); return { url: h.here() }; },
      description: 'Documento de la orden con proveedor, destino, líneas, neto, IVA y total, con las acciones según su estado.',
      actions: ['Imprimir la orden', 'Registrar la recepción', 'Cancelar o duplicar la orden']
    },
    {
      id: 'compra-recepcion', section: 'bodeguero', login: U.bodega, roles: INV, kind: 'modal', from: 'Botón "Registrar recepción" en una orden enviada', title: 'Recepción de mercadería', url: 'admin.html#/compras', waitFor: '.admin-content table',
      setup: async h => { await h.select('[data-f="status"]', 'enviada'); await h.click(firstRow + ' >> td >> nth=0'); await h.wait('[data-receive]'); await h.click('[data-receive]'); await h.modal(); return { url: h.here() }; },
      description: 'Recepción total o parcial de una orden: se indica cuánto llegó de cada línea y el stock de la sucursal se actualiza al instante.',
      actions: ['Indicar las unidades recibidas por línea', 'Registrar una recepción parcial', 'Sumar lo recibido al stock de la sucursal']
    },
    {
      id: 'proveedores', section: 'bodeguero', login: U.bodega, roles: INV, title: 'Proveedores', url: 'admin.html#/proveedores', waitFor: '.admin-content table',
      description: 'Proveedores con RUT, contacto, plazo de entrega y órdenes asociadas.',
      actions: ['Crear o editar proveedores', 'Ver sus datos de contacto', 'Revisar sus órdenes de compra']
    },

    // ================= Supervisor =================
    {
      id: 'dashboard', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content .kpis', mobile: true,
      description: 'Resumen del negocio por período: ventas por día y por sucursal, venta promedio por hora, medios de pago, productos más vendidos, margen por categoría, cajas abiertas ahora y productos bajo mínimo.',
      actions: ['Cambiar el período del análisis', 'Comparar sucursales y horas punta', 'Ver medios de pago y margen por categoría', 'Revisar cajas abiertas y alertas de stock']
    },
    {
      id: 'reportes-caja', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Reportes de caja', url: 'admin.html#/caja', waitFor: '.admin-content table',
      description: 'Turnos de todas las cajas con apertura, cierre, ventas, efectivo esperado, contado y diferencia.',
      actions: ['Ver cajas abiertas y cierres de la semana', 'Detectar cierres con diferencia', 'Filtrar por estado o sucursal', 'Abrir el detalle de un turno']
    },
    {
      id: 'turno-detalle', section: 'supervisor', login: U.supervisor, roles: SUP, kind: 'modal', from: 'Fila de Reportes de caja', title: 'Detalle de turno', url: 'admin.html#/caja', waitFor: '.admin-content table',
      setup: async h => { await h.select('[data-f="status"]', 'cerrado'); await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Reporte de un turno con ventas por medio de pago, movimientos de efectivo, arqueo y la lista de boletas, que se pueden abrir o anular.',
      actions: ['Revisar el arqueo y su diferencia', 'Ver retiros e ingresos', 'Abrir o anular boletas', 'Imprimir el reporte', 'Cerrar a distancia un turno abierto']
    },
    {
      id: 'clientes', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Clientes y puntos', url: 'admin.html#/clientes', waitFor: '.admin-content table',
      description: 'Clientes del programa de fidelización con RUT, nivel, puntos, visitas y total comprado.',
      actions: ['Buscar por nombre, RUT o teléfono', 'Filtrar por nivel', 'Crear un cliente', 'Abrir la ficha de un cliente', 'Exportar a CSV']
    },
    {
      id: 'cliente-ficha', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Ficha del cliente', url: 'admin.html#/clientes', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=0'); await h.wait('.admin-content [data-adjust]'); return { url: h.here() }; },
      description: 'Ficha del cliente con compras recientes, contacto, lo que más compra y los ajustes manuales de puntos.',
      actions: ['Ver sus compras recientes y productos favoritos', 'Ajustar puntos manualmente con motivo', 'Editar o eliminar el cliente']
    },
    {
      id: 'empleados', section: 'supervisor', login: U.supervisor, roles: SUP, title: 'Empleados y turnos', url: 'admin.html#/empleados', waitFor: '.admin-content table',
      description: 'Personal agrupado por jornada (mañana, tarde, completo) y tabla con sucursal, turnos de caja, ventas y diferencia acumulada en los arqueos de cada persona.',
      actions: ['Ver quién trabaja en cada jornada', 'Comparar ventas y diferencias de caja por persona', 'Asignar sucursal, jornada y PIN', 'Filtrar por sucursal, rol o jornada', 'Exportar a CSV']
    },
    {
      id: 'empleado-asignar', section: 'supervisor', login: U.supervisor, roles: SUP, kind: 'modal', from: 'Botón "Asignar" en Empleados y turnos', title: 'Asignar sucursal y jornada', url: 'admin.html#/empleados', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-assign] >> nth=0'); await h.modal(); },
      description: 'Ventana para asignar a una persona su sucursal, su jornada y el PIN de 4 dígitos que usa en la caja.',
      actions: ['Cambiar la sucursal', 'Elegir jornada mañana, tarde o completa', 'Definir el PIN de caja']
    },
    {
      id: 'supervisor-caja', section: 'supervisor', login: U.supervisor, title: 'Caja en uso (supervisor)', url: 'pos.html', waitFor: '.gate',
      setup: async h => { await h.select('#g-reg', { index: 1 }); await h.wait('.gate'); await h.pause(200); },
      description: 'Un supervisor que abre una caja con turno ajeno puede tomarla o cerrar ese turno a distancia; un cajero solo vería el aviso.',
      actions: ['Ver quién tiene abierta la caja y desde qué hora', 'Tomar la caja', 'Cerrar el turno de otra persona con arqueo']
    },

    // ================= Administrador =================
    {
      id: 'sucursales', section: 'admin', login: U.admin, title: 'Sucursales', url: 'admin.html#/sucursales', waitFor: '.admin-content .card',
      description: 'Sucursales con dirección, horario y sus cajas. Se pueden agregar o quitar cajas y desactivar locales.',
      actions: ['Crear o editar una sucursal', 'Agregar o quitar cajas', 'Activar o desactivar un local']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas con rol, sucursal y estado, más la tabla de permisos por rol. El rol se cambia directo en la tabla.',
      actions: ['Crear una cuenta nueva', 'Cambiar el rol desde la tabla', 'Asignar una contraseña nueva', 'Desactivar usuarios', 'Revisar los permisos de cada rol']
    },
    {
      id: 'usuario-modal', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario" en Usuarios y roles', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de cuenta con nombre, correo, rol y contraseña inicial, con opción de mostrarla como cuenta de demostración en el login. La sucursal, jornada y PIN se asignan en Empleados y turnos.',
      actions: ['Ingresar nombre y correo', 'Asignar rol (administrador, supervisor, cajero o bodeguero)', 'Definir la contraseña inicial']
    },
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Ajustes', url: 'admin.html#/ajustes', waitFor: '.admin-content [data-prev]',
      description: 'Datos de la empresa y la boleta (nombre, razón social, RUT, giro, IVA, pie) con vista previa, reglas de caja (fondo sugerido y descuento máximo sin supervisor), programa de puntos con niveles y restablecimiento de los datos demo.',
      actions: ['Editar razón social, RUT y pie de boleta', 'Fijar fondo inicial y descuento máximo del cajero', 'Configurar el programa de puntos y sus niveles', 'Ver la vista previa de la boleta', 'Restablecer los datos demo']
    },
    {
      id: 'actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: '.admin-content table',
      description: 'Registro de lo que pasa en las cajas y el back-office: aperturas y cierres de turno, anulaciones, movimientos de stock, compras y cambios de configuración.',
      actions: ['Filtrar por tipo de acción o usuario', 'Buscar en el detalle', 'Exportar a CSV']
    }
  ]
};

// Segunda venta (con la conexión cortada): queda en cola.
async function paidSale2(h) {
  for (const n of [2, 4]) await h.click(`.tiles .tile:not([disabled]) >> nth=${n}`, { after: 120 });
  await h.click('[data-pay]'); await h.modal();
  await h.click('.modal [data-quick] >> nth=0', { after: 200 });
  await h.click('.modal [data-confirm]', { after: 600 });
  await h.click('.modal-foot [data-close]', { after: 300 });
}
