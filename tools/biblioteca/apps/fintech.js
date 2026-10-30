// Biblioteca de vistas de Cóndor Pay (/fintech).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'u-cliente', ejecutivo: 'u-ejec', riesgo: 'u-riesgo', auditor: 'u-audit', admin: 'u-admin' };
const firstRow = '.admin-content tbody tr >> nth=0 >> td >> nth=0';

// Transferencia hasta el paso de monto con el primer contacto.
async function toAmount(h) {
  await h.click('[data-contacts] [data-c] >> nth=0');
  await h.wait('#amt');
  await h.click('[data-quick="25000"]');
  await h.fill('#note', 'Arriendo octubre');
}
// El código 2FA llega en un aviso flotante (oculto en las capturas); se lee del DOM y se escribe.
async function typeOtp(h) {
  const code = await h.page.evaluate(() => (document.querySelector('.toasts')?.textContent.match(/\d{6}/) || [])[0]);
  const inputs = h.page.locator('.modal .otp input');
  for (let i = 0; i < 6; i++) await inputs.nth(i).fill(code[i]);
  await h.pause(400);
}
// Apertura de cuenta completa (deja la sesión iniciada como cliente con KYC pendiente).
async function onboard(h, upTo = 5) {
  await h.fill('#rut', '11.111.111-1'); await h.fill('#phone', '+56 9 6123 4567'); await h.fill('#email', 'martina.rojas@demo.cl');
  await h.click('#step button.btn-primary'); await h.wait('#name');
  if (upTo === 1) return;
  await h.fill('#name', 'Martina Rojas Soto'); await h.fill('#birth', '1994-05-12'); await h.fill('#address', 'Av. Grecia 1520, depto 302'); await h.fill('#job', 'Diseñadora');
  await h.click('#step button.btn-primary'); await h.wait('[data-shot="selfie"]');
  await h.click('[data-shot="selfie"]', { after: 1600 }); await h.click('[data-shot="doc"]', { after: 1600 });
  if (upTo === 2) return;
  await h.click('[data-next]'); await h.wait('#checks'); await h.wait('[data-next]:not([disabled])');
  if (upTo === 3) return;
  await h.click('[data-next]'); await h.wait('#pw');
  await h.fill('#pw', 'Condor2026!'); await h.fill('#pw2', 'Condor2026!'); await h.check('#terms');
  if (upTo === 4) return;
  await h.click('#step button.btn-primary'); await h.wait('#step .feature-ic');
}

module.exports = {
  dir: 'fintech',
  name: 'Cóndor Pay',
  kind: 'Banca digital',
  theme: 'blueprint',
  description: 'Banco digital con apertura de cuenta en línea, app del cliente (saldos, transferencias con código de verificación, pagos, QR, tarjeta, metas, inversiones y créditos) y back-office con revisión de identidad, monitoreo de fraude, créditos, soporte y auditoría por roles.',
  accounts: {
    'u-cliente': { name: 'Camila Fuentes Araya', role: 'Cliente', email: 'cliente@condorpay.demo', password: 'cliente123' },
    'u-ejec': { name: 'Tomás Herrera', role: 'Ejecutivo', email: 'ejecutivo@condorpay.demo', password: 'ejecutivo123' },
    'u-riesgo': { name: 'Valeria Muñoz', role: 'Analista de riesgo', email: 'riesgo@condorpay.demo', password: 'riesgo123' },
    'u-audit': { name: 'Paula Contreras', role: 'Auditor (solo lectura)', email: 'auditor@condorpay.demo', password: 'auditor123' },
    'u-admin': { name: 'Rodrigo Pizarro', role: 'Administrador', email: 'admin@condorpay.demo', password: 'admin123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Landing del banco y apertura de cuenta en línea, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'App bancaria del cliente: dinero, pagos, ahorro, inversión y crédito.' },
    { id: 'ejecutivo', label: 'Ejecutivo', desc: 'Back-office de atención: revisión de identidad, clientes, tarjetas y soporte.' },
    { id: 'riesgo', label: 'Analista de riesgo', desc: 'Monitoreo de fraude, transacciones y aprobación de créditos.' },
    { id: 'auditor', label: 'Auditor', desc: 'Acceso de solo lectura al back-office y a la bitácora de auditoría.' },
    { id: 'admin', label: 'Administrador', desc: 'Resumen del negocio, productos y tarifas, contenido del sitio y usuarios.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Blueprint" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '.site-hero',
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
      id: 'landing', section: 'publico', title: 'Landing', url: 'index.html', waitFor: '.site-hero', mobile: true,
      description: 'Página de presentación del banco con beneficios, tarjetas, tarifas, seguridad y preguntas frecuentes. Los textos, tarifas y fondos se administran desde el back-office.',
      actions: ['Conocer los beneficios de la cuenta', 'Comparar las tarjetas disponibles', 'Revisar tarifas y rentabilidad de los fondos', 'Leer las preguntas frecuentes', 'Empezar la apertura de cuenta']
    },
    {
      id: 'landing-tarifas', section: 'publico', title: 'Tarjetas y tarifas', url: 'index.html', waitFor: '#tarjetas',
      setup: async h => { await h.scrollTo('#tarjetas', 'start', -10); },
      description: 'Secciones de la landing con las tarjetas, sus beneficios y la tabla de tarifas, que se actualizan al instante cuando el administrador las cambia.',
      actions: ['Comparar tarjetas por segmento', 'Ver comisiones y límites vigentes', 'Revisar la rentabilidad simulada de los fondos']
    },
    {
      id: 'apertura-rut', section: 'publico', title: 'Apertura: identificación', url: 'abrir-cuenta.html', waitFor: '#rut', mobile: true,
      description: 'Primer paso del asistente de apertura en cinco pasos. Valida el dígito verificador del RUT y que no exista otra cuenta con el mismo RUT o correo.',
      actions: ['Ingresar RUT, celular y correo', 'Ver el aviso si el RUT no es válido', 'Avanzar a los datos personales']
    },
    {
      id: 'apertura-datos', section: 'publico', title: 'Apertura: datos personales', url: 'abrir-cuenta.html', waitFor: '#rut',
      setup: async h => { await onboard(h, 1); },
      description: 'Datos para la ficha del cliente: nombre, nacimiento, comuna, dirección, ocupación, renta y declaración de persona expuesta políticamente.',
      actions: ['Completar nombre, fecha de nacimiento y dirección', 'Indicar ocupación y tramo de renta', 'Declarar si es persona expuesta políticamente', 'Volver o continuar']
    },
    {
      id: 'apertura-selfie', section: 'publico', title: 'Apertura: selfie y carnet', url: 'abrir-cuenta.html', waitFor: '#rut',
      setup: async h => { await onboard(h, 2); },
      description: 'Captura simulada de la selfie y del carnet (no se usa la cámara real).',
      actions: ['Tomar la selfie simulada', 'Fotografiar el carnet', 'Pasar a la verificación de identidad']
    },
    {
      id: 'apertura-verificacion', section: 'publico', title: 'Apertura: verificación', url: 'abrir-cuenta.html', waitFor: '#rut',
      setup: async h => { await onboard(h, 3); },
      description: 'Validación simulada contra registro civil, comparación facial, listas restrictivas y perfil de riesgo, con el porcentaje de coincidencia.',
      actions: ['Ver cada verificación completarse', 'Conocer el porcentaje de coincidencia facial', 'Continuar a crear la clave']
    },
    {
      id: 'apertura-lista', section: 'publico', title: 'Apertura: solicitud enviada', url: 'abrir-cuenta.html', waitFor: '#rut',
      setup: async h => { await onboard(h, 5); },
      description: 'Confirmación final tras crear la clave: la cuenta queda en revisión y la solicitud aparece en la cola de identidad del back-office.',
      actions: ['Ver el resumen de la solicitud', 'Entrar a la app mientras se revisa', 'Esperar la aprobación del ejecutivo']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para clientes y equipo interno, con cuentas de prueba para entrar con un clic. Los clientes van a su app y el equipo al back-office.',
      actions: ['Ingresar con correo y clave', 'Entrar con un clic como cliente, ejecutivo, analista, auditor o administrador', 'Ir a abrir una cuenta nueva']
    },

    // ================= Cliente =================
    {
      id: 'inicio', section: 'cliente', login: U.cliente, title: 'Inicio', url: 'app.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Resumen del cliente con los saldos de sus cuentas, accesos rápidos, últimos movimientos y gasto del mes.',
      actions: ['Ver saldos de cuenta vista y ahorro', 'Ir directo a transferir, pagar o cobrar con QR', 'Revisar los últimos movimientos', 'Ver el resumen de gastos del mes']
    },
    {
      id: 'movimientos', section: 'cliente', login: U.cliente, title: 'Movimientos', url: 'app.html#/movimientos', waitFor: '[data-list] [data-tx]',
      description: 'Cartola con búsqueda y filtros por cuenta, categoría, tipo y fechas, más el gráfico de gasto mensual por categoría.',
      actions: ['Buscar un movimiento por texto', 'Filtrar por cuenta, categoría, cargos o abonos y fechas', 'Ver el gasto por categoría de cada mes', 'Abrir el detalle de un movimiento', 'Descargar en CSV']
    },
    {
      id: 'movimiento-detalle', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Clic en un movimiento', title: 'Detalle del movimiento', url: 'app.html#/movimientos', waitFor: '[data-list] [data-tx]',
      setup: async h => { await h.click('[data-list] [data-tx] >> nth=0'); await h.modal(); },
      description: 'Ventana con el detalle de una operación: fecha, cuenta, categoría, contraparte, estado y número de operación.',
      actions: ['Revisar todos los datos de la operación', 'Ver si fue retenida o revertida', 'Guardar el número de operación']
    },
    {
      id: 'transferir', section: 'cliente', login: U.cliente, title: 'Transferir: destinatario', url: 'app.html#/transferir', waitFor: '[data-contacts]',
      description: 'Primer paso de la transferencia con los contactos guardados (favoritos primero), el disponible y el uso del límite diario.',
      actions: ['Buscar un contacto', 'Agregar un destinatario nuevo', 'Ver el disponible y el límite diario usado', 'Revisar las transferencias recientes']
    },
    {
      id: 'transferir-monto', section: 'cliente', login: U.cliente, title: 'Transferir: monto', url: 'app.html#/transferir', waitFor: '[data-contacts]',
      setup: toAmount,
      description: 'Paso del monto con montos rápidos, mensaje y la comisión según el banco de destino. Valida saldo, mínimo y límite diario.',
      actions: ['Escribir el monto o elegir uno rápido', 'Agregar un mensaje', 'Ver la comisión', 'Revisar la transferencia']
    },
    {
      id: 'transferir-codigo', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Revisar transferencia"', title: 'Código de verificación', url: 'app.html#/transferir', waitFor: '[data-contacts]',
      setup: async h => { await toAmount(h); await h.click('[data-review]'); await h.modal(); },
      description: 'Confirmación con un código de 6 dígitos enviado por SMS simulado. Se usa en transferencias y otras operaciones sensibles.',
      actions: ['Revisar el resumen de la operación', 'Ingresar el código de 6 dígitos', 'Reenviar el código o ver el SMS de prueba']
    },
    {
      id: 'transferir-comprobante', section: 'cliente', login: U.cliente, title: 'Transferir: comprobante', url: 'app.html#/transferir', waitFor: '[data-contacts]',
      setup: async h => { await toAmount(h); await h.click('[data-review]'); await h.modal(); await typeOtp(h); await h.wait('[data-again]'); },
      description: 'Comprobante con monto, destinatario, banco, cuenta y número de operación. Si el motor antifraude retiene la operación, lo indica aquí.',
      actions: ['Ver el detalle de la transferencia', 'Imprimir el comprobante', 'Hacer otra transferencia', 'Ir a los movimientos']
    },
    {
      id: 'nuevo-destinatario', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Nuevo destinatario" en Transferir', title: 'Nuevo destinatario', url: 'app.html#/transferir', waitFor: '[data-contacts]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de destinatario con nombre, RUT validado, banco, tipo y número de cuenta, y opción de guardarlo como contacto.',
      actions: ['Ingresar nombre y RUT', 'Elegir banco y tipo de cuenta', 'Guardar el contacto para la próxima vez']
    },
    {
      id: 'pagos', section: 'cliente', login: U.cliente, title: 'Pagar cuentas', url: 'app.html#/pagos', waitFor: '.admin-content .page-head',
      description: 'Cuentas de servicios inscritas con su monto y vencimiento, y empresas disponibles para inscribir nuevas.',
      actions: ['Pagar una cuenta o varias a la vez', 'Ver los días que faltan para cada vencimiento', 'Inscribir una cuenta de luz, agua, gas, telefonía u otra', 'Revisar los pagos hechos']
    },
    {
      id: 'qr', section: 'cliente', login: U.cliente, title: 'Pagos QR', url: 'app.html#/qr', waitFor: '.admin-content .tabs',
      description: 'Pago en comercios escaneando un código QR (simulado) y generación de un código propio para cobrar.',
      actions: ['Simular el escaneo del QR de un comercio', 'Confirmar el pago', 'Generar un QR para cobrar un monto']
    },
    {
      id: 'qr-cobrar', section: 'cliente', login: U.cliente, title: 'Cobrar con QR', url: 'app.html#/qr', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="cobrar"]'); await h.wait('#camt'); await h.fill('#camt', '12500'); await h.fill('#cdesc', 'Almuerzo'); await h.click('[data-gen]'); await h.wait('.qr-box'); },
      description: 'Generador de un código QR con monto y descripción para que otra persona pague.',
      actions: ['Definir monto y descripción', 'Mostrar el código para que lo escaneen', 'Recibir el abono en la cuenta']
    },
    {
      id: 'tarjeta', section: 'cliente', login: U.cliente, title: 'Mi tarjeta', url: 'app.html#/tarjeta', waitFor: '[data-freeze]', mobile: true,
      description: 'Tarjeta con sus datos ocultos, opción de congelarla, compras online e internacionales y límites de uso.',
      actions: ['Ver los datos de la tarjeta tras confirmar con código', 'Congelar o descongelar la tarjeta', 'Activar o desactivar compras online e internacionales', 'Ajustar límites diarios', 'Pedir una tarjeta de reemplazo']
    },
    {
      id: 'metas', section: 'cliente', login: U.cliente, title: 'Metas de ahorro', url: 'app.html#/metas', waitFor: '[data-new]',
      description: 'Metas con lo ahorrado, el objetivo y el avance de cada una.',
      actions: ['Crear una meta nueva', 'Aportar o retirar dinero de una meta', 'Editar o eliminar metas', 'Ver el total ahorrado contra el objetivo']
    },
    {
      id: 'meta-nueva', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Nueva meta"', title: 'Nueva meta', url: 'app.html#/metas', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para crear una meta de ahorro con nombre, monto objetivo y fecha.',
      actions: ['Ponerle nombre a la meta', 'Fijar monto objetivo y fecha', 'Crearla y empezar a aportar']
    },
    {
      id: 'inversiones', section: 'cliente', login: U.cliente, title: 'Inversiones', url: 'app.html#/inversiones', waitFor: '[data-buy]',
      description: 'Mini portafolio de fondos mutuos con la evolución de lo invertido y la rentabilidad simulada de cada fondo.',
      actions: ['Ver el valor actual del portafolio', 'Comparar fondos conservador, moderado y agresivo', 'Invertir en un fondo', 'Rescatar una inversión']
    },
    {
      id: 'creditos', section: 'cliente', login: U.cliente, title: 'Créditos', url: 'app.html#/creditos', waitFor: '#la',
      description: 'Simulador de crédito de consumo con monto y plazo, cuota y costo total, y los créditos del cliente con su estado.',
      actions: ['Simular monto y plazo con deslizadores', 'Ver la cuota, tasa y costo total', 'Solicitar el crédito (pasa a evaluación)', 'Pagar cuotas de un crédito desembolsado']
    },
    {
      id: 'notificaciones', section: 'cliente', login: U.cliente, title: 'Notificaciones', url: 'app.html#/notificaciones', waitFor: '.admin-content .page-head',
      description: 'Centro de avisos: abonos, cargos, alertas de seguridad y novedades de solicitudes.',
      actions: ['Filtrar por tipo de aviso', 'Marcar como leídas', 'Eliminar notificaciones']
    },
    {
      id: 'perfil', section: 'cliente', login: U.cliente, title: 'Perfil y seguridad', url: 'app.html#/perfil', waitFor: '.admin-content .page-head',
      description: 'Datos personales, preferencias de avisos, cambio de clave y dispositivos conectados.',
      actions: ['Editar sus datos de contacto', 'Cambiar la clave', 'Activar o desactivar avisos', 'Cerrar sesión en otros dispositivos']
    },
    {
      id: 'ayuda', section: 'cliente', login: U.cliente, title: 'Ayuda', url: 'app.html#/ayuda', waitFor: '[data-new]',
      description: 'Casos de soporte del cliente con su conversación. Los responde un ejecutivo desde el back-office.',
      actions: ['Abrir un caso nuevo', 'Leer las respuestas del ejecutivo', 'Responder dentro del mismo caso']
    },
    {
      id: 'cuenta-en-revision', section: 'cliente', title: 'Cuenta en revisión', url: 'abrir-cuenta.html', waitFor: '#rut',
      setup: async h => { await onboard(h, 5); await h.goto('app.html#/transferir', '.notice'); return { url: 'app.html#/transferir' }; },
      description: 'Lo que ve un cliente recién registrado mientras su identidad está en revisión: puede entrar a la app, pero transferencias, pagos y productos se habilitan solo al aprobarse.',
      actions: ['Ver el aviso de cuenta en revisión', 'Navegar la app en modo limitado', 'Recibir el aviso cuando aprueben la cuenta']
    },

    // ================= Ejecutivo =================
    {
      id: 'bo-kyc', section: 'ejecutivo', login: U.ejecutivo, roles: ['Ejecutivo', 'Analista de riesgo', 'Administrador'], title: 'Revisión de identidad (KYC)', url: 'admin.html#/kyc', waitFor: '.admin-content table',
      description: 'Cola de solicitudes de apertura con la coincidencia facial, alertas (PEP, listas, documento) y estado.',
      actions: ['Ver las solicitudes pendientes, aprobadas y rechazadas', 'Priorizar por coincidencia facial y alertas', 'Abrir una solicitud para revisarla', 'Exportar a CSV']
    },
    {
      id: 'bo-kyc-revision', section: 'ejecutivo', login: U.ejecutivo, roles: ['Ejecutivo', 'Analista de riesgo', 'Administrador'], kind: 'modal', from: 'Botón "Revisar" en la cola KYC', title: 'Revisión de solicitud', url: 'admin.html#/kyc', waitFor: '.admin-content [data-review]',
      setup: async h => { await h.click('.admin-content [data-review]'); await h.modal(); },
      description: 'Ficha del solicitante con sus datos, la selfie y el carnet simulados y la lista de verificaciones. Al aprobar se activan sus cuentas y su tarjeta.',
      actions: ['Revisar datos y verificaciones', 'Aprobar y activar la cuenta', 'Rechazar con un motivo', 'Notificar al cliente automáticamente']
    },
    {
      id: 'bo-clientes', section: 'ejecutivo', login: U.ejecutivo, roles: ['Todos los roles internos'], title: 'Clientes y cuentas', url: 'admin.html#/cuentas', waitFor: '.admin-content table',
      description: 'Listado de clientes con segmento, nivel de riesgo, estado de identidad y saldos.',
      actions: ['Buscar por nombre, RUT o correo', 'Filtrar por segmento, riesgo y estado', 'Abrir la ficha 360° del cliente', 'Exportar a CSV']
    },
    {
      id: 'bo-cliente-360', section: 'ejecutivo', login: U.ejecutivo, roles: ['Todos los roles internos'], title: 'Ficha 360° del cliente', url: 'admin.html#/cuentas/u-cliente', waitFor: '.admin-content .kpis .card',
      description: 'Todo sobre un cliente: datos, cuentas con saldo, tarjetas, créditos, movimientos recientes, alertas y casos de soporte.',
      actions: ['Revisar cuentas, tarjetas y créditos', 'Ver los movimientos recientes', 'Editar el perfil del cliente', 'Congelar una cuenta o hacer un ajuste manual (según rol)']
    },
    {
      id: 'bo-tarjetas', section: 'ejecutivo', login: U.ejecutivo, roles: ['Todos los roles internos'], title: 'Tarjetas', url: 'admin.html#/tarjetas', waitFor: '.admin-content table',
      description: 'Tarjetas emitidas con titular, tipo, estado y límites.',
      actions: ['Buscar y filtrar tarjetas', 'Bloquear o desbloquear una tarjeta', 'Reemplazarla', 'Ajustar sus límites']
    },
    {
      id: 'bo-tarjeta-gestion', section: 'ejecutivo', login: U.ejecutivo, roles: ['Ejecutivo', 'Analista de riesgo', 'Administrador'], kind: 'modal', from: 'Clic en una tarjeta', title: 'Gestión de tarjeta', url: 'admin.html#/tarjetas', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ventana con los datos de la tarjeta y las acciones disponibles para el ejecutivo.',
      actions: ['Ver estado, titular y límites', 'Bloquear con un motivo', 'Reemplazar la tarjeta', 'Cambiar límites']
    },
    {
      id: 'bo-soporte', section: 'ejecutivo', login: U.ejecutivo, roles: ['Ejecutivo', 'Auditor', 'Administrador'], title: 'Soporte', url: 'admin.html#/soporte', waitFor: '.admin-content table',
      description: 'Bandeja de casos abiertos por los clientes desde la app, con prioridad, categoría y estado.',
      actions: ['Filtrar por estado y prioridad', 'Buscar un caso', 'Abrir la conversación']
    },
    {
      id: 'bo-caso', section: 'ejecutivo', login: U.ejecutivo, roles: ['Ejecutivo', 'Auditor', 'Administrador'], title: 'Conversación del caso', url: 'admin.html#/soporte', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.wait('#rp'); return { url: h.here() }; },
      description: 'Hilo del caso con los mensajes del cliente y del equipo. La respuesta aparece al instante en la sección Ayuda de la app del cliente.',
      actions: ['Leer la conversación', 'Responder al cliente', 'Cambiar estado, prioridad y asignación']
    },

    // ================= Analista de riesgo =================
    {
      id: 'bo-fraude', section: 'riesgo', login: U.riesgo, roles: ['Analista de riesgo', 'Auditor', 'Administrador'], title: 'Monitoreo de fraude', url: 'admin.html#/fraude', waitFor: '.admin-content table',
      description: 'Alertas generadas en tiempo real por el motor de reglas, con cliente, monto, regla gatillada y estado del caso.',
      actions: ['Revisar las alertas abiertas', 'Abrir un caso de fraude', 'Simular una operación de cliente para probar las reglas', 'Pasar al editor de reglas']
    },
    {
      id: 'bo-fraude-caso', section: 'riesgo', login: U.riesgo, roles: ['Analista de riesgo', 'Auditor', 'Administrador'], title: 'Caso de fraude', url: 'admin.html#/fraude', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.wait('.admin-content .page-head'); await h.pause(300); return { url: h.here() }; },
      description: 'Detalle de una alerta con la operación, el historial del cliente y las acciones del caso.',
      actions: ['Revisar la operación sospechosa', 'Liberar la operación retenida', 'Confirmar fraude y revertirla', 'Agregar notas al caso']
    },
    {
      id: 'bo-reglas', section: 'riesgo', login: U.riesgo, roles: ['Analista de riesgo', 'Auditor', 'Administrador'], title: 'Reglas antifraude', url: 'admin.html#/fraude', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="reglas"]'); await h.wait('.admin-content [data-edit]'); },
      description: 'Editor de reglas del motor (monto alto, velocidad, destinatario nuevo, horario, etc.) con su umbral y acción.',
      actions: ['Activar o desactivar reglas', 'Editar umbrales y acción (alertar o retener)', 'Crear o eliminar reglas']
    },
    {
      id: 'bo-simular', section: 'riesgo', login: U.riesgo, roles: ['Analista de riesgo', 'Administrador'], kind: 'modal', from: 'Botón "Simular operación" en Monitoreo de fraude', title: 'Simular operación', url: 'admin.html#/fraude', waitFor: '[data-sim]',
      setup: async h => { await h.click('[data-sim]'); await h.modal(); },
      description: 'Herramienta para ejecutar una operación de un cliente y ver en vivo si el motor genera una alerta o la retiene.',
      actions: ['Elegir cliente, tipo y monto', 'Marcar si va a un destinatario nuevo', 'Ejecutar y ver la alerta resultante']
    },
    {
      id: 'bo-transacciones', section: 'riesgo', login: U.riesgo, roles: ['Todos los roles internos'], title: 'Transacciones', url: 'admin.html#/transacciones', waitFor: '.admin-content table',
      description: 'Explorador de todas las transacciones con filtros por tipo, estado, monto y fecha.',
      actions: ['Filtrar por tipo, estado, monto y fechas', 'Buscar por cliente o descripción', 'Abrir el detalle', 'Liberar o reversar operaciones (según rol)']
    },
    {
      id: 'bo-transaccion', section: 'riesgo', login: U.riesgo, roles: ['Todos los roles internos'], kind: 'modal', from: 'Clic en una transacción', title: 'Detalle de transacción', url: 'admin.html#/transacciones', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ventana con todos los datos de la operación y las acciones de liberación o reversa.',
      actions: ['Ver cliente, cuenta, monto y contraparte', 'Liberar una operación retenida', 'Reversar una operación']
    },
    {
      id: 'bo-creditos', section: 'riesgo', login: U.riesgo, roles: ['Analista de riesgo', 'Ejecutivo', 'Auditor', 'Administrador'], title: 'Créditos', url: 'admin.html#/creditos', waitFor: '.admin-content table',
      description: 'Flujo de aprobación de créditos de consumo: solicitado, en evaluación, aprobado, rechazado y desembolsado.',
      actions: ['Filtrar por etapa', 'Abrir una solicitud', 'Ver monto, plazo y cliente']
    },
    {
      id: 'bo-credito', section: 'riesgo', login: U.riesgo, roles: ['Analista de riesgo', 'Ejecutivo', 'Auditor', 'Administrador'], title: 'Evaluación de crédito', url: 'admin.html#/creditos', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.wait('.admin-content .page-head'); await h.pause(300); return { url: h.here() }; },
      description: 'Ficha de la solicitud con los datos del cliente, su capacidad de pago y la cuota propuesta.',
      actions: ['Revisar renta, carga financiera y riesgo', 'Aprobar con condiciones', 'Rechazar con motivo', 'Desembolsar el crédito aprobado']
    },

    // ================= Auditor =================
    {
      id: 'bo-auditoria', section: 'auditor', login: U.auditor, roles: ['Auditor', 'Administrador'], title: 'Auditoría', url: 'admin.html#/auditoria', waitFor: '.admin-content .page-head',
      description: 'Bitácora de todas las acciones de clientes y equipo, con filtros y exportación.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo, usuario o texto', 'Exportar a CSV']
    },
    {
      id: 'bo-solo-lectura', section: 'auditor', login: U.auditor, title: 'Vista de solo lectura', url: 'admin.html#/kyc', waitFor: '.admin-content table',
      description: 'El auditor ve las mismas secciones que el resto del equipo, pero marcadas como solo lectura y sin botones de acción.',
      actions: ['Consultar solicitudes, clientes y alertas', 'Revisar sin poder modificar', 'Verificar la matriz de permisos por rol']
    },

    // ================= Administrador =================
    {
      id: 'bo-resumen', section: 'admin', login: U.admin, title: 'Resumen', url: 'admin.html#/', waitFor: '.admin-content .page-head',
      description: 'Indicadores del banco: clientes, depósitos, volumen transado, créditos y alertas de fraude, con sus gráficos.',
      actions: ['Ver clientes y depósitos totales', 'Revisar el volumen transado por día', 'Seguir alertas y créditos pendientes']
    },
    {
      id: 'bo-productos', section: 'admin', login: U.admin, title: 'Productos y tarifas', url: 'admin.html#/productos', waitFor: '#ltd',
      description: 'Tarifas y límites de la operación (transferencias, QR, máximos) que se aplican al instante en la app y en la landing.',
      actions: ['Editar comisiones', 'Cambiar límites diarios de transferencia y QR', 'Pasar a editar portada, tarjetas, fondos y preguntas frecuentes']
    },
    {
      id: 'bo-portada', section: 'admin', login: U.admin, title: 'Contenido de la portada', url: 'admin.html#/productos', waitFor: '#ltd',
      setup: async h => { await h.click('[data-tab="sitio"]'); await h.wait('#ht'); },
      description: 'Textos principales de la landing pública y sus cifras destacadas.',
      actions: ['Editar título y bajada de la portada', 'Cambiar el texto del botón principal', 'Actualizar las cifras destacadas']
    },
    {
      id: 'bo-fondos', section: 'admin', login: U.admin, title: 'Fondos de inversión', url: 'admin.html#/productos', waitFor: '#ltd',
      setup: async h => { await h.click('[data-tab="fondos"]'); await h.pause(300); },
      description: 'Fondos mutuos que se ofrecen en la app y en la landing, con riesgo y rentabilidad.',
      actions: ['Crear o editar un fondo', 'Definir nivel de riesgo y rentabilidad', 'Activar o desactivar fondos']
    },
    {
      id: 'bo-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Equipo interno y clientes, con la matriz de permisos de lectura y escritura de cada rol. Solo el administrador puede modificar.',
      actions: ['Crear un usuario interno', 'Cambiar el rol', 'Desactivar o eliminar cuentas', 'Consultar la matriz de permisos']
    },
    {
      id: 'bo-usuario-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario interno"', title: 'Nuevo usuario interno', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content .page-head .btn-primary'); await h.modal(); },
      description: 'Alta de una persona del equipo con nombre, correo, clave y rol.',
      actions: ['Ingresar nombre, correo y clave', 'Asignar el rol', 'Crear la cuenta']
    }
  ]
};
