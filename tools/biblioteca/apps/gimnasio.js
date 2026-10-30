// Biblioteca de vistas de Titán Fit (/gimnasio).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u1', recepcion: 'u2', coach: 'u3', socio: 'u4', moroso: 'u5' };
const firstRow = '.admin-content tbody tr >> nth=0';

// Avanza la inscripción en línea del plan Full hasta el paso indicado (2 = datos, 3 = pago, 4 = listo).
async function signup(h, upTo) {
  await h.click('[data-bill="anual"]'); await h.click('[data-br="prov"]'); await h.click('[data-next]');
  await h.wait('#s-name');
  if (upTo === 2) return;
  await h.fill('#s-name', 'Martín Soto Araya'); await h.fill('#s-rut', '15.234.567-4'); await h.fill('#s-email', 'martin.soto@demo.cl');
  await h.fill('#s-phone', '+56 9 6543 2109'); await h.fill('#s-birth', '1992-05-14'); await h.fill('#s-pass', 'titan2026');
  await h.check('[data-body] input[name="terms"]'); await h.click('[data-body] form button.btn-primary');
  await h.wait('#c-num');
  if (upTo === 3) return;
  await h.fill('#c-num', '4111 1111 1111 1111'); await h.fill('#c-exp', '12/29'); await h.fill('#c-cvv', '123');
  await h.click('[data-pay]'); await h.wait('.ticket, h2:has-text("Bienvenido")');
}

module.exports = {
  dir: 'gimnasio',
  name: 'Titán Fit',
  kind: 'Cadena de gimnasios',
  theme: 'chrome',
  description: 'Red de gimnasios con sitio público (planes, inscripción con pago en línea, horario de clases, sedes y entrenadores), app del socio y apps para recepción, entrenadores y administración.',
  accounts: {
    'u1': { name: 'Carolina Méndez', role: 'Administrador', email: 'admin@titanfit.cl', password: 'demo123' },
    'u2': { name: 'Kevin Salinas', role: 'Recepción', email: 'recepcion@titanfit.cl', password: 'demo123' },
    'u3': { name: 'Matías Leiva', role: 'Entrenador', email: 'coach@titanfit.cl', password: 'demo123' },
    'u4': { name: 'Sofía Navarro Bustos', role: 'Socio', email: 'socio@titanfit.cl', password: 'demo123' },
    'u5': { name: 'Rodrigo Pino Lagos', role: 'Socio (moroso)', email: 'moroso@titanfit.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'socio', label: 'Socio', desc: 'App del socio: clases, carnet digital, rutina, progreso, desafíos y pagos.' },
    { id: 'recepcion', label: 'Recepción', desc: 'Kiosco de check-in, tienda (POS) y cobros en el mesón.' },
    { id: 'entrenador', label: 'Entrenador', desc: 'App del coach: clases y asistencia, rutinas y seguimiento de clientes.' },
    { id: 'admin', label: 'Administrador', desc: 'Panel de la red: socios, cobranza, tienda, planes, horario, sedes, marketing y configuración.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Cromo" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Página de inicio de la red con el mensaje principal, los planes, las próximas clases del día, las disciplinas y las sedes. Los textos se editan desde la configuración del sitio.',
      actions: ['Ver los planes y pasar a inscribirse', 'Revisar las próximas clases', 'Conocer las disciplinas por nivel', 'Ver dirección de cada sede']
    },
    {
      id: 'planes', section: 'publico', title: 'Planes y precios', url: 'index.html#/planes', waitFor: '[data-b]', mobile: true,
      description: 'Planes de membresía con precio mensual o anual y una tabla comparativa de lo que incluye cada uno. Se administran desde el panel.',
      actions: ['Cambiar entre precio mensual y anual', 'Comparar clases semanales, sedes y beneficios', 'Elegir un plan e inscribirse en línea']
    },
    {
      id: 'inscripcion', section: 'publico', title: 'Inscripción: modalidad y sede', url: 'index.html#/inscripcion/full', waitFor: '[data-next]',
      description: 'Primer paso de la inscripción en línea: modalidad de pago (mensual o anual) y sede principal, con el resumen del plan, la matrícula y el total.',
      actions: ['Elegir pago mensual o anual', 'Elegir la sede principal', 'Ver el resumen con matrícula y total', 'Continuar a los datos personales']
    },
    {
      id: 'inscripcion-datos', section: 'publico', title: 'Inscripción: datos del socio', url: 'index.html#/inscripcion/full', waitFor: '[data-next]',
      setup: async h => { await signup(h, 2); },
      description: 'Formulario de datos del nuevo socio, que también crea su cuenta para la app.',
      actions: ['Ingresar nombre, RUT, correo y celular', 'Indicar fecha de nacimiento y objetivo', 'Crear la contraseña de la app', 'Aceptar el reglamento interno']
    },
    {
      id: 'inscripcion-pago', section: 'publico', title: 'Inscripción: pago', url: 'index.html#/inscripcion/full', waitFor: '[data-next]',
      setup: async h => { await signup(h, 3); },
      description: 'Pago simulado con tarjeta, con la opción de dejar activo el pago automático mensual (PAT).',
      actions: ['Ingresar número, vencimiento y CVV', 'Activar o no el pago automático', 'Pagar el primer mes o el año más la matrícula']
    },
    {
      id: 'inscripcion-lista', section: 'publico', title: 'Inscripción confirmada', url: 'index.html#/inscripcion/full', waitFor: '[data-next]',
      setup: async h => { await signup(h, 4); },
      description: 'Bienvenida al nuevo socio con su código de socio. La membresía y el pago quedan registrados en el panel y la cuenta ya puede entrar a la app.',
      actions: ['Ver su código de socio', 'Entrar a la app del socio', 'Revisar el horario para reservar su primera clase']
    },
    {
      id: 'horario', section: 'publico', title: 'Horario de clases', url: 'index.html#/horario', waitFor: '.timetable', mobile: true,
      description: 'Horario semanal de clases por sede con disciplina, entrenador, duración y cupos disponibles.',
      actions: ['Elegir la sede', 'Filtrar por disciplina', 'Ver cupos libres o clases llenas', 'Ir a inscribirse para reservar']
    },
    {
      id: 'sedes', section: 'publico', title: 'Sedes', url: 'index.html#/sedes', waitFor: 'main h2',
      description: 'Las sedes de la red con dirección, horarios, servicios y aforo.',
      actions: ['Ver dirección y comuna', 'Revisar horarios de lunes a viernes y fin de semana', 'Conocer los servicios de cada sede']
    },
    {
      id: 'entrenadores', section: 'publico', title: 'Entrenadores', url: 'index.html#/entrenadores', waitFor: 'main h3',
      description: 'Staff de entrenadores con su especialidad y biografía, administrado desde el panel.',
      actions: ['Conocer a cada entrenador', 'Ver sus especialidades', 'Saber qué clases dicta']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para socios y equipo, con cuentas de prueba para entrar con un clic a cada rol (incluye un socio con pago atrasado).',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administración, recepción, entrenador o socio', 'Probar la cuenta de un socio moroso', 'Volver al sitio']
    },

    // ================= Socio =================
    {
      id: 'socio-inicio', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Inicio del socio', url: 'socio.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Inicio de la app con el estado de la membresía, visitas, próximas clases reservadas, la rutina asignada y el desafío activo.',
      actions: ['Ver el estado y vencimiento de la membresía', 'Revisar sus próximas clases', 'Ir a la rutina del día', 'Ver su posición en el desafío']
    },
    {
      id: 'socio-clases', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Reservar clases', url: 'socio.html#/clases', waitFor: '.admin-content .timetable', mobile: true,
      description: 'Horario semanal con cupos en vivo para reservar clases, más la lista de reservas propias. El plan limita cuántas clases se pueden reservar por semana.',
      actions: ['Elegir sede y disciplina', 'Reservar una clase con cupo', 'Quedar en lista de espera si está llena', 'Gestionar o cancelar sus reservas']
    },
    {
      id: 'socio-clase', section: 'socio', login: U.socio, roles: ['Socio'], kind: 'modal', from: 'Clic en una clase del horario', title: 'Detalle y reserva de clase', url: 'socio.html#/clases', waitFor: '.admin-content .timetable',
      setup: async h => { await h.click('.admin-content .timetable button.cls:not(.past) >> nth=0'); await h.modal(); },
      description: 'Ventana de una clase con hora, sala, entrenador y cupos, para reservarla o cancelar la reserva.',
      actions: ['Ver detalles de la clase y el entrenador', 'Reservar el cupo', 'Cancelar una reserva existente']
    },
    {
      id: 'socio-carnet', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Carnet digital', url: 'socio.html#/carnet', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Carnet con código QR y código de socio para validar el ingreso en el kiosco de la sede, más las últimas visitas.',
      actions: ['Mostrar el QR en el kiosco', 'Dictar el código en recepción', 'Revisar las últimas visitas']
    },
    {
      id: 'socio-rutina', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Mi rutina', url: 'socio.html#/rutina', waitFor: '.admin-content .page-head',
      description: 'Rutina asignada por el entrenador, organizada por días, con series, repeticiones y carga de cada ejercicio, y el historial de cargas registradas.',
      actions: ['Elegir el día de la rutina', 'Ver series, repeticiones y carga sugerida', 'Registrar la carga usada en cada ejercicio', 'Revisar su historial']
    },
    {
      id: 'socio-progreso', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Mi progreso', url: 'socio.html#/progreso', waitFor: '.admin-content .page-head',
      description: 'Evolución del peso y del porcentaje de grasa en gráficos, con la tabla de mediciones corporales.',
      actions: ['Ver la evolución de peso y grasa', 'Revisar mediciones de cintura, cadera y brazo', 'Registrar una medición nueva']
    },
    {
      id: 'socio-medicion', section: 'socio', login: U.socio, roles: ['Socio'], kind: 'modal', from: 'Botón "Nueva medición" en Progreso', title: 'Nueva medición', url: 'socio.html#/progreso', waitFor: '.admin-content [data-add]',
      setup: async h => { await h.click('.admin-content [data-add]'); await h.modal(); },
      description: 'Formulario de medición corporal; el entrenador asignado la ve en la ficha del cliente.',
      actions: ['Ingresar peso y % de grasa', 'Registrar cintura, cadera y brazo', 'Guardar y ver el gráfico actualizado']
    },
    {
      id: 'socio-desafios', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Desafíos', url: 'socio.html#/desafios', waitFor: '.admin-content .page-head',
      description: 'Retos de la red (visitas, clases, temporadas) con su ranking, que se actualiza con cada visita.',
      actions: ['Ver los desafíos activos y su premio', 'Revisar su posición en el ranking', 'Ver cuánto le falta para la meta']
    },
    {
      id: 'socio-pagos', section: 'socio', login: U.socio, roles: ['Socio'], title: 'Pagos y membresía', url: 'socio.html#/pagos', waitFor: '.admin-content .page-head',
      description: 'Estado de la membresía, historial de pagos y gestiones de la cuenta: pagar, congelar o cambiar de plan.',
      actions: ['Pagar la membresía en línea', 'Revisar el historial de pagos', 'Congelar la membresía por un periodo', 'Solicitar un cambio de plan']
    },
    {
      id: 'socio-congelar', section: 'socio', login: U.socio, roles: ['Socio'], kind: 'modal', from: 'Botón "Congelar" en Pagos y membresía', title: 'Congelar membresía', url: 'socio.html#/pagos', waitFor: '.admin-content [data-freeze]',
      setup: async h => { await h.click('.admin-content [data-freeze]'); await h.modal(); },
      description: 'Solicitud de congelamiento de la membresía (viaje, lesión, etc.) por un número de días.',
      actions: ['Elegir cuántos días congelar', 'Indicar el motivo', 'Confirmar; el vencimiento se corre automáticamente']
    },
    {
      id: 'socio-moroso', section: 'socio', login: U.moroso, roles: ['Socio'], title: 'Inicio con pago atrasado', url: 'socio.html#/', waitFor: '.admin-content .page-head',
      description: 'Lo que ve un socio con la membresía impaga: un aviso destacado con el monto adeudado y el botón para pagar. En el kiosco su ingreso aparece rechazado.',
      actions: ['Ver el aviso de pago pendiente', 'Pagar la deuda en línea', 'Seguir usando la app mientras regulariza']
    },
    {
      id: 'socio-pagar', section: 'socio', login: U.moroso, roles: ['Socio'], kind: 'modal', from: 'Botón "Pagar" del aviso de deuda', title: 'Pagar membresía', url: 'socio.html#/', waitFor: '.admin-content [data-pay]',
      setup: async h => { await h.click('.admin-content [data-pay]'); await h.modal(); },
      description: 'Pago simulado de la membresía pendiente. Al pagar, el socio queda al día en recepción y en el panel.',
      actions: ['Revisar el monto y el concepto', 'Pagar con tarjeta', 'Quedar habilitado para ingresar']
    },

    // ================= Recepción =================
    {
      id: 'rec-kiosco', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Kiosco de check-in', url: 'recepcion.html#/', waitFor: '.admin-content [data-scan]', mobile: true,
      setup: async h => { await h.click('.admin-content [data-demo] >> nth=0'); await h.wait('.admin-content [data-result] *'); },
      description: 'Validación de ingreso por código o QR del carnet: indica si el socio está al día, moroso, congelado o dado de baja, y registra la visita. Al lado, los ingresos del día por hora.',
      actions: ['Escanear o escribir el código del socio', 'Ver si el ingreso está permitido y por qué', 'Cambiar de sede', 'Revisar los ingresos de hoy']
    },
    {
      id: 'rec-kiosco-moroso', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Kiosco: ingreso rechazado', url: 'recepcion.html#/', waitFor: '.admin-content [data-scan]',
      setup: async h => { await h.click('.admin-content [data-demo="TF-10002"]'); await h.wait('.admin-content [data-result] *'); },
      description: 'Resultado del kiosco para un socio con deuda: el ingreso se rechaza y se ofrece cobrar en el mesón.',
      actions: ['Ver el motivo del rechazo', 'Cobrar la deuda en el momento', 'Registrar el ingreso una vez pagado']
    },
    {
      id: 'rec-pos', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Tienda (POS)', url: 'recepcion.html#/pos', waitFor: '.admin-content [data-p]', mobile: true,
      setup: async h => { await h.click('.admin-content [data-p] >> nth=0'); await h.click('.admin-content [data-p] >> nth=3'); await h.click('.admin-content [data-p] >> nth=3'); },
      description: 'Punto de venta de recepción con productos por categoría, carro de venta y stock que se descuenta al cobrar.',
      actions: ['Buscar productos por nombre o SKU', 'Filtrar por categoría', 'Agregar o quitar unidades del carro', 'Asociar la venta a un socio', 'Cobrar y ver las ventas del día']
    },
    {
      id: 'rec-socios', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Socios y cobros', url: 'recepcion.html#/socios', waitFor: '.admin-content table',
      description: 'Buscador de socios con su estado y plan, para cobrar la membresía en el mesón.',
      actions: ['Buscar socios por nombre, RUT o código', 'Filtrar por estado', 'Cobrar la membresía', 'Abrir la ficha del socio']
    },
    {
      id: 'rec-cobro', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], kind: 'modal', from: 'Botón "Cobrar" en Socios y cobros', title: 'Cobro de membresía', url: 'recepcion.html#/socios', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-act="pay"] >> nth=0'); await h.modal(); },
      description: 'Registro de un pago de membresía hecho en recepción.',
      actions: ['Ver el monto del plan', 'Elegir el medio de pago', 'Registrar el pago y dejar al socio al día']
    },

    // ================= Entrenador =================
    {
      id: 'coach-clases', section: 'entrenador', login: U.coach, roles: ['Entrenador'], title: 'Mis clases', url: 'entrenador.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Clases del entrenador para hoy y el resto de la semana, con ocupación de cada una.',
      actions: ['Ver las clases de hoy', 'Revisar la ocupación', 'Abrir la lista de asistencia de una clase']
    },
    {
      id: 'coach-asistencia', section: 'entrenador', login: U.coach, roles: ['Entrenador'], title: 'Asistencia de la clase', url: 'entrenador.html#/', waitFor: '.admin-content a[href^="#/clase/"]',
      setup: async h => { await h.click('.admin-content a[href^="#/clase/"] >> nth=0'); await h.wait('.admin-content [data-walk]'); return { url: h.here() }; },
      description: 'Lista de inscritos de una clase para marcar presentes y ausentes, liberar cupos a la lista de espera y agregar socios sin reserva.',
      actions: ['Marcar presente o ausente', 'Dar el cupo a quien está en espera', 'Agregar un socio que llegó sin reserva']
    },
    {
      id: 'coach-rutinas', section: 'entrenador', login: U.coach, roles: ['Entrenador'], title: 'Rutinas', url: 'entrenador.html#/rutinas', waitFor: '.admin-content table',
      description: 'Rutinas creadas por el entrenador y asignadas a sus clientes. Se ven en la app del socio.',
      actions: ['Crear una rutina nueva', 'Editar o eliminar rutinas', 'Ver a quién está asignada cada una']
    },
    {
      id: 'coach-rutina-editor', section: 'entrenador', login: U.coach, roles: ['Entrenador'], title: 'Constructor de rutinas', url: 'entrenador.html#/rutinas', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=0'); await h.wait('.admin-content [data-save]'); return { url: h.here() }; },
      description: 'Editor de rutinas por días con ejercicios, series, repeticiones y carga, y la asignación al socio.',
      actions: ['Nombrar la rutina y escribir notas', 'Agregar o quitar días', 'Agregar ejercicios con series, repeticiones y carga', 'Guardar y asignar a un cliente']
    },
    {
      id: 'coach-clientes', section: 'entrenador', login: U.coach, roles: ['Entrenador'], title: 'Mis clientes', url: 'entrenador.html#/clientes', waitFor: '.admin-content table',
      description: 'Socios asignados al entrenador con plan, último peso y última visita.',
      actions: ['Buscar a un cliente', 'Ver su último peso y visita', 'Abrir su ficha de seguimiento']
    },
    {
      id: 'coach-cliente', section: 'entrenador', login: U.coach, roles: ['Entrenador'], title: 'Ficha del cliente', url: 'entrenador.html#/clientes', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=0'); await h.wait('.admin-content [data-add]'); return { url: h.here() }; },
      description: 'Seguimiento de un cliente con gráficos de peso y grasa, mediciones y los últimos registros de entrenamiento.',
      actions: ['Ver la evolución corporal', 'Registrar una medición', 'Revisar los entrenamientos registrados']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Resumen de la red con socios activos, morosidad e ingresos, gráficos de ingresos por membresía, socios por plan, check-ins por hora, ocupación por disciplina y altas por mes.',
      actions: ['Ver ingresos de los últimos 6 meses', 'Analizar socios por plan y altas por mes', 'Detectar horas peak de check-in', 'Ver la ocupación de clases por disciplina']
    },
    {
      id: 'admin-socios', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Socios', url: 'admin.html#/socios', waitFor: '.admin-content table',
      description: 'Base de socios con plan, sede, estado y vencimiento.',
      actions: ['Buscar y filtrar por estado, plan y sede', 'Crear o editar socios', 'Dar de baja', 'Abrir la ficha del socio', 'Exportar a CSV']
    },
    {
      id: 'admin-socio-ficha', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Ficha de socio', url: 'admin.html#/socios/m0', waitFor: '.admin-content .page-head',
      description: 'Ficha del socio con datos, plan, estado, pagos y reservas de clases.',
      actions: ['Ver datos y estado de la membresía', 'Revisar pagos y reservas', 'Descongelar una membresía', 'Editar la ficha']
    },
    {
      id: 'admin-socio-editar', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Botón "Nuevo socio" en Socios', title: 'Nuevo socio', url: 'admin.html#/socios', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de alta o edición de socio.',
      actions: ['Ingresar datos personales y RUT', 'Asignar plan y sede', 'Definir estado y vencimiento']
    },
    {
      id: 'admin-pagos', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Pagos y cobranza', url: 'admin.html#/pagos', waitFor: '.admin-content table',
      description: 'Socios morosos con días de atraso y monto, y el registro de todos los pagos de membresía.',
      actions: ['Ver la lista de morosos por días de atraso', 'Cobrar una deuda', 'Enviar recordatorio a los morosos', 'Ver todos los pagos y exportar']
    },
    {
      id: 'admin-tienda', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Tienda y stock', url: 'admin.html#/tienda', waitFor: '.admin-content table',
      description: 'Productos que se venden en el POS de recepción, con stock, ventas de los últimos 30 días y los más vendidos.',
      actions: ['Crear o editar productos', 'Controlar el stock bajo', 'Ver los más vendidos', 'Ir al POS de recepción']
    },
    {
      id: 'admin-planes', section: 'admin', login: U.admin, title: 'Planes', url: 'admin.html#/planes', waitFor: '.admin-content table',
      description: 'Planes de membresía con precio mensual y anual, clases por semana y sedes incluidas. Los activos se publican en la página de precios.',
      actions: ['Crear, editar o eliminar planes', 'Fijar precios mensual y anual', 'Definir beneficios y sedes', 'Activar o desactivar un plan']
    },
    {
      id: 'admin-plan-editar', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en un plan', title: 'Editar plan', url: 'admin.html#/planes', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Editor de un plan con precios, límites y la lista de beneficios que se muestra en el sitio.',
      actions: ['Editar nombre y precios', 'Fijar clases por semana', 'Elegir si incluye todas las sedes', 'Editar la lista de beneficios']
    },
    {
      id: 'admin-horario', section: 'admin', login: U.admin, title: 'Clases y horario', url: 'admin.html#/horario', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Constructor del horario semanal por sede, en grilla o lista. Lo publicado aparece en el sitio y en la app de socios.',
      actions: ['Elegir la sede', 'Crear, editar o eliminar clases', 'Ver el horario en grilla o en lista', 'Agregar clases por disciplina']
    },
    {
      id: 'admin-clase-editar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nueva clase" en Clases y horario', title: 'Nueva clase', url: 'admin.html#/horario', waitFor: '.admin-content .page-head',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de clase del horario.',
      actions: ['Elegir disciplina, entrenador y sala', 'Definir día, hora y duración', 'Fijar el cupo máximo']
    },
    {
      id: 'admin-sedes', section: 'admin', login: U.admin, title: 'Sedes', url: 'admin.html#/sedes', waitFor: '.admin-content table',
      description: 'Sedes de la red con horarios, servicios, aforo y clases por semana.',
      actions: ['Crear o editar sedes', 'Definir horarios de semana y fin de semana', 'Indicar servicios y aforo']
    },
    {
      id: 'admin-entrenadores', section: 'admin', login: U.admin, title: 'Entrenadores', url: 'admin.html#/entrenadores', waitFor: '.admin-content table',
      description: 'Staff que aparece en el sitio y dicta clases, con su carga semanal.',
      actions: ['Crear o editar entrenadores', 'Escribir su biografía y especialidades', 'Ver cuántas clases dicta por semana']
    },
    {
      id: 'admin-campanas', section: 'admin', login: U.admin, title: 'Campañas', url: 'admin.html#/campanas', waitFor: '.admin-content table',
      description: 'Campañas de marketing y retención por correo o SMS (envío simulado) con segmento, alcance y conversiones.',
      actions: ['Crear o editar campañas', 'Elegir el segmento (morosos, ex socios, todos)', 'Enviar una campaña', 'Ver alcance y conversiones']
    },
    {
      id: 'admin-campana-editar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nueva campaña"', title: 'Nueva campaña', url: 'admin.html#/campanas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de campaña con canal, segmento y mensaje.',
      actions: ['Poner nombre y canal', 'Elegir el segmento de socios', 'Escribir el mensaje']
    },
    {
      id: 'admin-desafios', section: 'admin', login: U.admin, title: 'Desafíos', url: 'admin.html#/desafios', waitFor: '.admin-content table',
      description: 'Retos de fidelización que los socios ven en su app, con su líder actual.',
      actions: ['Crear o editar desafíos', 'Definir meta, fechas y premio', 'Ver quién lidera cada uno']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de acceso con su rol y vínculo (sede, entrenador o ficha de socio).',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol', 'Vincular a un entrenador, sede o socio', 'Desactivar una cuenta']
    },
    {
      id: 'admin-config', section: 'admin', login: U.admin, title: 'Configuración del sitio', url: 'admin.html#/config', waitFor: '.admin-content form',
      description: 'Marca, textos de la portada, promoción de la barra superior, contacto y reglas del negocio (matrícula, cancelación de clases y congelamiento). Se reflejan de inmediato en el sitio y en las apps.',
      actions: ['Editar marca, eslogan y textos de la portada', 'Publicar u ocultar la promoción de la barra superior', 'Actualizar teléfono, correo e Instagram', 'Fijar la matrícula (0 = promoción)', 'Definir plazo de cancelación y reglas de congelamiento']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Últimos 300 eventos del sistema: inicios de sesión, check-ins, pagos, reservas y cambios de configuración.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción y buscar', 'Exportar a CSV', 'Restablecer los datos de demostración']
    }
  ]
};
