// Biblioteca de vistas de Ruta Certificada (/usados).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'u-c1', clienteReserva: 'u-c2', vendedor: 'u-v1', gerente: 'u-gerente', inspector: 'u-i1', taller: 'u-t1', admin: 'u-admin' };
// Datos estables de la semilla: un auto destacado publicado, uno reservado (por la cuenta demo) y uno en evaluación.
const CAR = { publicado: 'car1114', otro: 'car1112', tercero: 'car1113', evaluacion: 'car1154', leadReserva: 'ld262' };
const COMERCIAL = ['Vendedor', 'Gerente comercial', 'Administrador'];
const firstRow = '.admin-content tbody tr >> nth=0';
// El modal enfoca el botón principal del pie y queda desplazado hacia abajo: lo devuelve arriba.
const modalTop = h => h.page.evaluate(() => document.querySelectorAll('.modal').forEach(m => { m.scrollTop = 0; }));
// Deja 2 autos en el comparador (se guarda en la sesión del navegador) antes de abrir la vista.
const preCompare = h => h.page.evaluate(ids => { sessionStorage.setItem('ruta:compare', JSON.stringify(ids)); }, [CAR.publicado, CAR.otro, CAR.tercero]);

module.exports = {
  dir: 'usados',
  name: 'Ruta Certificada',
  kind: 'Automotora de seminuevos',
  theme: 'flatui',
  description: 'Automotora de autos usados certificados con sitio público (buscador, ficha con informe de 150 puntos, reserva en línea, crédito, tasación, planes, servicios y tienda), cuenta del cliente, panel comercial y apps para vendedores e inspectores.',
  accounts: {
    'u-c1': { name: 'Camila Rojas', role: 'Cliente', email: 'cliente@correo.cl', password: 'demo123' },
    'u-c2': { name: 'Tomás Pérez', role: 'Cliente', email: 'tomas@correo.cl', password: 'demo123' },
    'u-v1': { name: 'Sofía Muñoz', role: 'Vendedor', email: 'vendedor@rutacertificada.cl', password: 'demo123' },
    'u-gerente': { name: 'Ricardo Sepúlveda', role: 'Gerente comercial', email: 'gerente@rutacertificada.cl', password: 'demo123' },
    'u-i1': { name: 'Benjamín Torres', role: 'Inspector', email: 'inspector@rutacertificada.cl', password: 'demo123' },
    'u-t1': { name: 'Felipe Contreras', role: 'Taller y servicios', email: 'taller@rutacertificada.cl', password: 'demo123' },
    'u-admin': { name: 'Paula Fuentes', role: 'Administrador', email: 'admin@rutacertificada.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Mi cuenta: autos, reservas, tasaciones, suscripciones, pedidos, servicios y créditos.' },
    { id: 'vendedor', label: 'Vendedor', desc: 'App de ventas y módulos comerciales del panel: leads, cotizaciones, ventas y créditos.' },
    { id: 'gerente', label: 'Gerente comercial', desc: 'Indicadores, inventario con márgenes, compras desde tasaciones y sucursales.' },
    { id: 'inspector', label: 'Inspector', desc: 'App móvil de certificación de 150 puntos.' },
    { id: 'taller', label: 'Taller y servicios', desc: 'Agenda de servicios, planes de mantención y tienda de repuestos.' },
    { id: 'admin', label: 'Administrador', desc: 'Contenido del sitio, usuarios y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Flat UI" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '#qs',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'web2', group: 'Estilo', label: 'Web 2.0', desc: 'Brillos, degradados y botones redondeados.', theme: 'web2' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '#qs', mobile: true,
      description: 'Página de inicio con buscador rápido, autos destacados, la certificación de 150 puntos, la tasación de usados, planes, servicios, tienda, testimonios y preguntas frecuentes. Los textos y secciones visibles se editan desde el panel.',
      actions: ['Buscar por marca, precio y carrocería', 'Ver los autos destacados', 'Conocer la certificación de 150 puntos', 'Ir a tasar su auto', 'Revisar planes, servicios y tienda']
    },
    {
      id: 'buscar', section: 'publico', title: 'Buscador de autos', url: 'index.html#/autos', waitFor: '[data-results] .card', mobile: true,
      description: 'Stock certificado con filtros combinables (marca, modelo, año, precio, kilometraje, transmisión, combustible, carrocería y región) y orden. Cada auto se puede sumar al comparador.',
      actions: ['Filtrar por marca, modelo, año, precio y km', 'Filtrar por transmisión, combustible, carrocería y región', 'Ordenar los resultados', 'Marcar hasta 3 autos para comparar', 'Abrir la ficha de un auto']
    },
    {
      id: 'comparador', section: 'publico', title: 'Comparador', url: 'index.html#/autos', waitFor: '[data-results] .card',
      setup: async h => { await preCompare(h); await h.goto('index.html#/comparar', '.cmp-table'); return { url: h.here() }; },
      description: 'Tabla lado a lado de hasta 3 autos con precio, año, kilometraje, motor, transmisión, equipamiento y resultado de la certificación.',
      actions: ['Comparar precio, año y kilometraje', 'Revisar motor, transmisión y equipamiento', 'Ver el puntaje de certificación', 'Ir a la ficha de cualquiera']
    },
    {
      id: 'auto', section: 'publico', title: 'Ficha del auto', url: `index.html#/auto/${CAR.publicado}`, waitFor: '#cert', mobile: true,
      description: 'Ficha completa del auto con galería ilustrada, ficha técnica, informe de certificación de 150 puntos, historial e informe legal, precio comparado con el mercado y simulador de cuota.',
      actions: ['Revisar ficha técnica y equipamiento', 'Abrir el informe de 150 puntos por categoría', 'Comparar el precio con el mercado', 'Simular la cuota', 'Reservar en línea o agendar test drive o visita']
    },
    {
      id: 'auto-certificacion', section: 'publico', title: 'Informe de certificación', url: `index.html#/auto/${CAR.publicado}`, waitFor: '#cert',
      setup: async h => { await h.scrollTo('#cert', 'start', -90); },
      description: 'Informe de la inspección de 150 puntos en 10 categorías, con los puntos aprobados, las observaciones y lo reparado antes de publicar.',
      actions: ['Ver el puntaje de cada categoría', 'Leer las observaciones del inspector', 'Revisar el historial y el informe legal']
    },
    {
      id: 'auto-test-drive', section: 'publico', kind: 'modal', from: 'Botón "Agendar test drive" de la ficha', title: 'Agendar test drive', url: `index.html#/auto/${CAR.publicado}`, waitFor: '#cert',
      setup: async h => { await h.click('[data-visit="test-drive"]'); await h.modal(); },
      description: 'Formulario para agendar una prueba de manejo o una visita en la sucursal donde está el auto. Queda como lead en el CRM y en la agenda del vendedor.',
      actions: ['Elegir día y hora', 'Dejar nombre, correo y teléfono', 'Confirmar la cita en la sucursal del auto']
    },
    {
      id: 'reservar', section: 'publico', title: 'Reserva en línea', url: `index.html#/reservar/${CAR.publicado}`, waitFor: '#rf',
      setup: async h => { await h.fill('#r-n', 'Valentina Rojas Muñoz'); await h.fill('#r-rut', '17.845.321-1'); await h.fill('#r-e', 'valentina.rojas@demo.cl'); await h.fill('#r-p', '+56 9 7123 4567'); await h.fill('#r-cc', '4242 4242 4242 4242'); await h.fill('#r-exp', '12/29'); await h.fill('#r-cvv', '123'); },
      description: 'Reserva del auto con abono pagado en línea (simulado). El auto queda reservado por unos días y el abono se descuenta del precio o se devuelve completo.',
      actions: ['Ingresar nombre, RUT, correo y teléfono', 'Pagar el abono con tarjeta (simulado)', 'Ver precio, abono y saldo en el resumen', 'Aceptar las condiciones de la reserva']
    },
    {
      id: 'reservar-ok', section: 'publico', title: 'Auto reservado', url: `index.html#/reservar/${CAR.publicado}`, waitFor: '#rf',
      setup: async h => { await h.fill('#r-n', 'Valentina Rojas Muñoz'); await h.fill('#r-rut', '17.845.321-1'); await h.fill('#r-e', 'valentina.rojas@demo.cl'); await h.fill('#r-p', '+56 9 7123 4567'); await h.fill('#r-cc', '4242 4242 4242 4242'); await h.fill('#r-exp', '12/29'); await h.fill('#r-cvv', '123'); await h.check('#rf [name="terms"]'); await h.click('#rf button.btn-primary'); await h.wait('.success-hero'); },
      description: 'Confirmación con el código de reserva y la fecha de vencimiento. El auto pasa a "reservado" en el sitio y en el inventario, y se crea un lead para el vendedor.',
      actions: ['Ver el código y el vencimiento de la reserva', 'Pasar a simular el financiamiento', 'Seguir viendo autos']
    },
    {
      id: 'financiamiento', section: 'publico', title: 'Simulador de crédito', url: `index.html#/financiamiento?car=${CAR.publicado}`, waitFor: '#fa',
      description: 'Simulador de crédito automotriz con pie, número de cuotas y tasa, que entrega cuota mensual, CAE y costo total, más la postulación en línea a la financiera.',
      actions: ['Elegir el auto o ingresar el precio', 'Ajustar pie y número de cuotas', 'Ver cuota, CAE y costo total', 'Postular en línea con su renta']
    },
    {
      id: 'vende', section: 'publico', title: 'Vende o permuta tu auto', url: 'index.html#/vende', waitFor: '#vf',
      setup: async h => { await h.select('#vf-b', 'Toyota'); await h.fill('#vf-m', 'Yaris'); await h.select('#vf-y', '2019'); await h.fill('#vf-k', '62000'); },
      description: 'Tasación en tres pasos: datos del auto y su estado, oferta referencial y agenda de la inspección gratuita.',
      actions: ['Indicar marca, modelo, año y kilometraje', 'Elegir el estado general', 'Ver la oferta en un minuto', 'Agendar la inspección gratuita']
    },
    {
      id: 'vende-oferta', section: 'publico', title: 'Oferta por tu auto', url: 'index.html#/vende', waitFor: '#vf',
      setup: async h => { await h.select('#vf-b', 'Toyota'); await h.fill('#vf-m', 'Yaris'); await h.select('#vf-y', '2019'); await h.fill('#vf-k', '62000'); await h.click('#vf button.btn-primary'); await h.wait('.offer-box'); },
      description: 'Rango de oferta referencial según el valor de mercado del modelo, año, kilometraje y estado. Puede venderse con pago en 24 horas o usarse como pie de un auto certificado.',
      actions: ['Ver el rango de oferta y el valor de mercado', 'Conocer las condiciones (pago en 24 h, transferencia, prenda)', 'Agendar la inspección para confirmar la oferta']
    },
    {
      id: 'planes', section: 'publico', title: 'Planes de mantención', url: 'index.html#/planes', waitFor: '.plan-card',
      description: 'Suscripción mensual de mantención para cualquier auto, con lo que incluye cada plan y sin permanencia.',
      actions: ['Comparar los planes y su precio mensual', 'Ver mantenciones, asistencia en ruta y descuentos incluidos', 'Contratar un plan']
    },
    {
      id: 'planes-contratar', section: 'publico', kind: 'modal', from: 'Botón de contratar un plan', title: 'Contratar plan', url: 'index.html#/planes', waitFor: '.plan-card',
      setup: async h => { await h.click('[data-plan] >> nth=1'); await h.modal(); },
      description: 'Alta del plan con los datos del cliente, el auto y el pago mensual simulado con tarjeta.',
      actions: ['Ingresar sus datos y los del auto', 'Pagar la primera mensualidad (simulado)', 'Ver el plan en su cuenta']
    },
    {
      id: 'servicios', section: 'publico', title: 'Agenda de servicios', url: 'index.html#/servicios', waitFor: '#sv',
      description: 'Agenda de mantención, preparación para revisión técnica, inspección precompra y diagnóstico, en sucursal o a domicilio, con precio y horarios.',
      actions: ['Elegir el servicio', 'Elegir sucursal o domicilio', 'Escoger día y hora', 'Dejar sus datos y los del auto', 'Confirmar la hora']
    },
    {
      id: 'sucursales', section: 'publico', title: 'Sucursales', url: 'index.html#/sucursales', waitFor: '.container .card',
      description: 'Red de sucursales con dirección, horario, contacto, autos disponibles y servicios de cada una.',
      actions: ['Ver dirección, horario y contacto', 'Saber cuántos autos tiene cada sucursal', 'Ver sus autos o agendar un servicio']
    },
    {
      id: 'tienda', section: 'publico', title: 'Tienda de repuestos', url: 'index.html#/tienda', waitFor: '[data-add]',
      description: 'Catálogo de repuestos y accesorios con filtros por categoría, compatibilidad y stock, despacho a todo Chile o retiro en sucursal.',
      actions: ['Filtrar por categoría', 'Ver compatibilidad y stock', 'Agregar productos al carrito']
    },
    {
      id: 'carrito', section: 'publico', title: 'Carrito y pago', url: 'index.html#/tienda', waitFor: '[data-add]',
      setup: async h => { await h.click('[data-add] >> nth=0'); await h.click('[data-add] >> nth=3'); await h.goto('index.html#/carrito', '[data-inc]'); return { url: h.here() }; },
      description: 'Carrito con cantidades, despacho o retiro en sucursal, envío gratis sobre un monto y checkout con pago simulado.',
      actions: ['Cambiar cantidades o quitar productos', 'Elegir despacho o retiro en sucursal', 'Ver el costo de envío y el total', 'Pagar el pedido (simulado)']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account',
      description: 'Página de ingreso para clientes y equipo, con cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, gerente, vendedor, inspector, taller o cliente', 'Crear una cuenta de cliente', 'Volver al sitio']
    },
    {
      id: 'cuenta-sin-sesion', section: 'publico', title: 'Mi cuenta (sin sesión)', url: 'index.html#/cuenta', waitFor: '.big-ico',
      description: 'Lo que ve un visitante al abrir "Mi cuenta" sin haber ingresado: la invitación a entrar con su cuenta.',
      actions: ['Ir a ingresar con su cuenta', 'Saber qué encontrará en su cuenta', 'Volver a navegar el sitio']
    },

    // ================= Cliente =================
    {
      id: 'cuenta', section: 'cliente', login: U.cliente, title: 'Mi cuenta: mis autos', url: 'index.html#/cuenta', waitFor: '.tabs', mobile: true,
      description: 'Cuenta del cliente con sus autos (comprados en la automotora o registrados por él) y pestañas para reservas, tasaciones, suscripciones, pedidos, servicios y créditos.',
      actions: ['Ver sus autos', 'Registrar un auto propio', 'Moverse entre reservas, tasaciones, planes, pedidos, servicios y créditos', 'Cerrar sesión']
    },
    {
      id: 'cuenta-reservas', section: 'cliente', login: U.clienteReserva, title: 'Mi cuenta: reservas', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="res"]'); },
      description: 'Reservas del cliente con el auto, el abono, el vencimiento y su estado.',
      actions: ['Ver el auto reservado y el abono', 'Revisar cuándo vence la reserva', 'Cancelar la reserva con devolución del abono']
    },
    {
      id: 'cuenta-suscripciones', section: 'cliente', login: U.cliente, title: 'Mi cuenta: suscripciones', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="subs"]'); },
      description: 'Planes de mantención contratados con el auto, la mensualidad, el próximo cobro y el estado.',
      actions: ['Ver el plan y la mensualidad', 'Revisar el próximo cobro', 'Pausar o cancelar la suscripción']
    },
    {
      id: 'cuenta-servicios', section: 'cliente', login: U.cliente, title: 'Mi cuenta: servicios', url: 'index.html#/cuenta', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="svc"]'); },
      description: 'Horas de servicio agendadas e historial, con el auto, la fecha, el lugar y el estado.',
      actions: ['Ver las horas agendadas', 'Revisar servicios anteriores', 'Cancelar una hora']
    },

    // ================= Vendedor =================
    {
      id: 'vendedor', section: 'vendedor', login: U.vendedor, roles: COMERCIAL, title: 'App del vendedor: bandeja', url: 'vendedor.html', waitFor: '.lead-row', mobile: true,
      description: 'Bandeja de leads del vendedor (reservas, test drives, visitas, tasaciones, créditos y consultas) con indicadores de nuevos, negociación, ventas del mes y conversión.',
      actions: ['Ver sus leads, los sin asignar o todos', 'Filtrar por tipo de lead', 'Tomar un lead sin asignar', 'Abrir la ficha de un lead']
    },
    {
      id: 'vendedor-lead', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Un lead de la bandeja', title: 'Ficha del lead', url: `vendedor.html#/lead/${CAR.leadReserva}`, waitFor: '.modal',
      setup: async h => { await h.modal(); await modalTop(h); },
      description: 'Ficha del lead con cliente, auto, reserva, crédito o tasación asociados, estado, vendedor y notas de negociación.',
      actions: ['Cambiar estado y vendedor', 'Agregar notas de la negociación', 'Generar una cotización', 'Cerrar la venta', 'Marcarlo como perdido con motivo']
    },
    {
      id: 'vendedor-cotizacion', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Generar cotización" en la ficha del lead', title: 'Generar cotización', url: `vendedor.html#/lead/${CAR.leadReserva}`, waitFor: '.modal',
      setup: async h => { await h.click('.modal [data-quote]'); await h.wait('.modal >> text=Cotización ·'); await h.pause(300); },
      description: 'Formulario de cotización formal con precio, descuento, pie y cuotas. Genera un documento imprimible para el cliente.',
      actions: ['Ajustar precio y descuento', 'Definir pie y número de cuotas', 'Generar el documento de cotización']
    },
    {
      id: 'vendedor-agenda', section: 'vendedor', login: U.vendedor, title: 'App del vendedor: agenda', url: 'vendedor.html#/agenda', waitFor: '.week-cal',
      description: 'Agenda de la semana con test drives, visitas e inspecciones de tasación por horario.',
      actions: ['Ver las citas de los próximos 6 días', 'Abrir la ficha de cada cita', 'Distinguir test drives, visitas y tasaciones']
    },
    {
      id: 'vendedor-ventas', section: 'vendedor', login: U.vendedor, title: 'App del vendedor: ventas', url: 'vendedor.html#/ventas', waitFor: '.table',
      description: 'Cotizaciones abiertas y ventas del vendedor con precio, margen y acceso al contrato.',
      actions: ['Revisar cotizaciones abiertas', 'Ver sus ventas y márgenes', 'Abrir el contrato de una venta']
    },
    {
      id: 'leads', section: 'vendedor', login: U.vendedor, roles: COMERCIAL, title: 'Leads (CRM)', url: 'admin.html#/leads', waitFor: firstRow,
      description: 'CRM con todos los contactos del sitio, WhatsApp y sucursales, con indicadores de atención, negociación y conversión.',
      actions: ['Filtrar por estado, tipo y vendedor', 'Repartir los leads sin asignar', 'Abrir la ficha de un lead', 'Exportar a CSV']
    },
    {
      id: 'ventas', section: 'vendedor', login: U.vendedor, roles: COMERCIAL, title: 'Ventas y contratos', url: 'admin.html#/ventas', waitFor: firstRow,
      description: 'Ventas registradas con auto, comprador, vendedor, forma de pago, precio y margen. Cada venta genera su contrato de compraventa.',
      actions: ['Filtrar por forma de pago y vendedor', 'Ver facturación y margen de 30 días', 'Abrir el contrato de una venta', 'Exportar a CSV']
    },
    {
      id: 'contrato', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Fila de la tabla de Ventas', title: 'Contrato de compraventa', url: 'admin.html#/ventas', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); await modalTop(h); },
      description: 'Contrato de compraventa de vehículo motorizado listo para imprimir, con vendedor, comprador, auto, precio y forma de pago.',
      actions: ['Revisar las partes y el vehículo', 'Ver precio y forma de pago', 'Imprimir el contrato']
    },
    {
      id: 'financiamiento-admin', section: 'vendedor', login: U.vendedor, roles: COMERCIAL, title: 'Postulaciones a crédito', url: 'admin.html#/financiamiento', waitFor: firstRow,
      description: 'Postulaciones a crédito del sitio con monto, pie, cuotas, CAE, renta y estado, e indicadores de aprobación.',
      actions: ['Filtrar por estado', 'Revisar la relación cuota/renta', 'Resolver una postulación', 'Exportar a CSV']
    },
    {
      id: 'credito-resolucion', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Fila de la tabla de Financiamiento', title: 'Resolver crédito', url: 'admin.html#/financiamiento', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Resolución de una postulación con la relación cuota/renta (política de 25 %), la financiera y las condiciones.',
      actions: ['Aprobar o rechazar la postulación', 'Elegir la financiera', 'Dejar condiciones o comentarios']
    },

    // ================= Gerente comercial =================
    {
      id: 'dashboard', section: 'gerente', login: U.gerente, roles: COMERCIAL, title: 'Dashboard comercial', url: 'admin.html#/dashboard', waitFor: '.kpi-grid',
      description: 'Indicadores de la red: valor del inventario, días en stock, autos vendidos, margen por auto, conversión de leads, tasación a compra y suscripciones, con gráficos de ventas, márgenes, antigüedad del stock y vendedores.',
      actions: ['Ver valor del inventario y días en stock', 'Revisar ventas y margen por mes', 'Comparar leads por origen y ventas por vendedor', 'Detectar los autos con más días publicados', 'Seguir el ingreso mensual de planes']
    },
    {
      id: 'inventario', section: 'gerente', login: U.gerente, roles: COMERCIAL, title: 'Inventario', url: 'admin.html#/inventario', waitFor: firstRow,
      description: 'Stock con su estado en el flujo (evaluación, reacondicionamiento, certificado, publicado, reservado, vendido), precio, costo, margen y días en stock.',
      actions: ['Filtrar por estado, marca y sucursal', 'Ver margen y días en stock de cada auto', 'Ingresar un auto al inventario', 'Abrir la ficha de un auto', 'Exportar a CSV']
    },
    {
      id: 'inventario-ficha', section: 'gerente', login: U.gerente, kind: 'modal', from: 'Fila de la tabla de Inventario', title: 'Ficha de inventario', url: 'admin.html#/inventario', waitFor: firstRow,
      setup: async h => { await h.fill('.admin-content input[type="search"]', 'Tucson'); await h.click(firstRow); await h.modal(); await modalTop(h); },
      description: 'Ficha interna del auto con su flujo, precio comparado con el mercado, costo con reacondicionamiento, margen bruto, costos de reacondicionamiento, informe de certificación y destacado en portada.',
      actions: ['Avanzar el auto en el flujo hasta publicarlo', 'Agregar costos de reacondicionamiento', 'Ver el margen bruto', 'Editar la ficha y el precio', 'Destacarlo en la portada o despublicarlo']
    },
    {
      id: 'compras', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Compras desde tasaciones', url: 'admin.html#/compras', waitFor: firstRow,
      description: 'Autos ofrecidos por clientes en el sitio, desde la cotización y la inspección hasta la oferta final y su ingreso al inventario.',
      actions: ['Filtrar tasaciones por estado', 'Registrar la oferta final tras la inspección', 'Comprar el auto e ingresarlo al inventario', 'Rechazar una tasación']
    },
    {
      id: 'sucursales-admin', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Sucursales', url: 'admin.html#/sucursales', waitFor: '.admin-content',
      description: 'Red de sucursales con datos de contacto, stock y si ofrecen servicios de taller.',
      actions: ['Editar datos de cada sucursal', 'Ver el stock por sucursal', 'Activar servicios o la sucursal en el sitio']
    },
    {
      id: 'actividad', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Actividad', url: 'admin.html#/actividad', waitFor: firstRow,
      description: 'Registro de las últimas 300 acciones del equipo y del sistema: reservas, leads, inspecciones, ventas y cambios de inventario.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción', 'Buscar por detalle o usuario', 'Exportar a CSV']
    },

    // ================= Inspector =================
    {
      id: 'inspector', section: 'inspector', login: U.inspector, roles: ['Inspector', 'Gerente comercial', 'Administrador'], title: 'Cola de inspección', url: 'inspector.html', waitFor: '.role-wrap .card',
      description: 'App móvil del inspector con los autos en evaluación o reacondicionamiento, su avance en la inspección y las últimas completadas.',
      actions: ['Ver los autos por inspeccionar', 'Ver el avance de cada inspección', 'Reinspeccionar fallas tras el reacondicionamiento', 'Abrir una inspección']
    },
    {
      id: 'inspector-checklist', section: 'inspector', login: U.inspector, title: 'Checklist de 150 puntos', url: `inspector.html#/auto/${CAR.evaluacion}`, waitFor: '.cat-block', mobile: true,
      setup: async h => { await h.click('[data-allok="0"]'); await h.page.evaluate(() => scrollTo(0, 0)); },
      description: 'Inspección de 150 puntos en 10 categorías: cada punto se marca aprobado, con observación o con falla, con detalle y fotos. Al finalizar se certifica el auto o se envía a reacondicionamiento.',
      actions: ['Marcar cada punto como aprobado, observación o falla', 'Aprobar en bloque los pendientes de una categoría', 'Agregar detalle y fotos (simuladas)', 'Finalizar y publicar el informe en la ficha del auto']
    },

    // ================= Taller y servicios =================
    {
      id: 'servicios-agenda', section: 'taller', login: U.taller, roles: ['Taller y servicios', 'Gerente comercial', 'Administrador'], title: 'Servicios: agenda', url: 'admin.html#/servicios/agenda', waitFor: '.kpi-grid',
      description: 'Horas de servicio agendadas desde el sitio (mantención, revisión técnica, precompra, diagnóstico) con su estado, en sucursal o a domicilio.',
      actions: ['Ver las horas de hoy y los próximos días', 'Confirmar o avanzar una hora', 'Cancelar una hora', 'Ver si es en sucursal o a domicilio']
    },
    {
      id: 'servicios-catalogo', section: 'taller', login: U.taller, title: 'Servicios: catálogo', url: 'admin.html#/servicios/catalogo', waitFor: firstRow,
      description: 'Servicios que se ofrecen en el sitio con precio, duración y modalidades (sucursal o domicilio).',
      actions: ['Editar precio y duración', 'Definir si se ofrece a domicilio', 'Crear o desactivar servicios']
    },
    {
      id: 'suscripciones', section: 'taller', login: U.taller, roles: ['Taller y servicios', 'Gerente comercial', 'Administrador'], title: 'Planes y suscripciones', url: 'admin.html#/suscripciones/subs', waitFor: firstRow,
      description: 'Suscripciones de mantención con cliente, auto, plan, próximo cobro y estado, e indicadores de ingreso mensual, altas y bajas.',
      actions: ['Ver ingreso mensual, altas y bajas', 'Filtrar suscripciones por plan y estado', 'Editar o pausar una suscripción', 'Revisar y editar los planes']
    },
    {
      id: 'tienda-pedidos', section: 'taller', login: U.taller, roles: ['Taller y servicios', 'Gerente comercial', 'Administrador'], title: 'Tienda: pedidos', url: 'admin.html#/tienda/pedidos', waitFor: firstRow,
      description: 'Pedidos web de repuestos y accesorios con despacho o retiro, total y estado de preparación.',
      actions: ['Ver pedidos por preparar', 'Avanzar el estado de un pedido', 'Abrir el detalle del pedido', 'Exportar a CSV']
    },
    {
      id: 'tienda-pedido', section: 'taller', login: U.taller, kind: 'modal', from: 'Fila de la tabla de Pedidos', title: 'Detalle del pedido', url: 'admin.html#/tienda/pedidos', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Detalle del pedido con productos, cliente, dirección o sucursal de retiro, total y avance del estado.',
      actions: ['Revisar los productos y el total', 'Ver los datos de despacho', 'Marcar como preparado, despachado o entregado']
    },
    {
      id: 'tienda-productos', section: 'taller', login: U.taller, title: 'Tienda: productos', url: 'admin.html#/tienda/productos', waitFor: firstRow,
      description: 'Catálogo de la tienda con precio, compatibilidad, stock y estado.',
      actions: ['Editar precio y stock', 'Ver productos agotados', 'Crear o desactivar productos']
    },

    // ================= Administrador =================
    {
      id: 'contenido', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: '.admin-content form',
      description: 'Textos de portada, contacto, condiciones comerciales (abono y días de reserva, garantía, tasa y pie mínimo, despacho) y secciones visibles del sitio.',
      actions: ['Editar título, texto y anuncio de la portada', 'Cambiar teléfono, WhatsApp, correo y horario', 'Fijar abono, días de reserva y garantía', 'Definir tasa referencial, pie mínimo y despacho', 'Mostrar u ocultar planes, tienda y testimonios']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas del equipo con rol, sucursal y estado, y la matriz de permisos por rol.',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol y sucursal', 'Desactivar una cuenta', 'Consultar la matriz de permisos']
    },
    {
      id: 'acceso-restringido', section: 'admin', login: U.taller, title: 'Ruta protegida por rol', url: 'admin.html#/inventario', waitFor: '.admin-content .empty',
      description: 'Lo que ve un rol sin permiso al abrir una sección ajena (aquí, el taller intentando entrar a Inventario): el menú solo muestra lo permitido y la ruta queda bloqueada.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a su inicio desde el botón', 'Confirmar que cada rol solo ve sus menús']
    }
  ]
};
