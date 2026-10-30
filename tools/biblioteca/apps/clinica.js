// Biblioteca de vistas del Centro Médico Alerce (/clinica).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u1', recepcion: 'u2', medico: 'u3', paciente: 'u5' };
const firstRow = '.admin-content tbody tr >> nth=0';

// Recorre la reserva en línea hasta el paso indicado (3 = día y hora, 4 = datos, 5 = confirmada).
async function booking(h, upTo) {
  await h.click('.pick[data-id="mg"]');
  await h.click('[data-body] .pick:not([disabled]) >> nth=0');
  await h.click('.days-strip .day-btn:not([disabled]) >> nth=0');
  await h.wait('.slots .slot');
  if (upTo === 3) return;
  await h.click('.slots .slot >> nth=2');
  await h.wait('#b-rut');
  if (upTo === 4) return;
  await h.fill('#b-rut', '15.234.567-4'); await h.fill('#b-name', 'Martín Soto Araya'); await h.fill('#b-email', 'martin.soto@demo.cl');
  await h.fill('#b-phone', '+56 9 6543 2109'); await h.fill('#b-reason', 'Control anual y renovación de receta');
  await h.check('input[name="terms"]'); await h.click('[data-body] button[type="submit"]'); await h.wait('.ticket');
}

// La semilla arma la agenda de hoy según la hora real: de noche todas las citas del día ya pasaron
// y la cola queda vacía. Para que las capturas no dependan de la hora, se reabren algunas citas de
// hoy (no asistió / reservadas) como pacientes en sala de espera, igual que un check-in de recepción.
async function liven(h, { doctor = null, n = 4, call = false } = {}) {
  await h.page.evaluate(async ({ doctor, n, call }) => {
    const { db } = await import(new URL('js/data/db.js', location.href).href);
    const { setStatus } = await import(new URL('js/shared/domain.js', location.href).href);
    const { ymd } = await import(new URL('js/shared/dates.js', location.href).href);
    const today = ymd();
    const live = db.query('appointments', a => a.date === today && ['en_espera', 'llamado', 'en_atencion'].includes(a.status) && (!doctor || a.doctorId === doctor));
    const pool = db.query('appointments', a => a.date === today && a.mode !== 'tele' && ['no_show', 'reservada', 'confirmada'].includes(a.status) && (!doctor || a.doctorId === doctor)).sort((a, b) => a.time.localeCompare(b.time));
    pool.slice(0, Math.max(0, n - live.length)).forEach(a => setStatus(a, 'en_espera', { paid: false }));
    if (call && !db.count('appointments', a => a.date === today && ['llamado', 'en_atencion'].includes(a.status))) {
      const w = db.query('appointments', a => a.date === today && a.status === 'en_espera')[0];
      if (w) setStatus(w, 'llamado');
    }
  }, { doctor, n, call });
  await h.pause(500);
}

module.exports = {
  dir: 'clinica',
  name: 'Centro Médico Alerce',
  kind: 'Centro médico',
  theme: 'neumorph',
  description: 'Centro médico ambulatorio con sitio público (especialidades, staff, reserva en línea, telemedicina y resultados), portal del paciente y apps para recepción, médicos y administración, más la pantalla de la sala de espera.',
  accounts: {
    'u1': { name: 'Patricia Lagos Ibáñez', role: 'Administrador', email: 'admin@alerce.cl', password: 'demo123' },
    'u2': { name: 'Jorge Muñoz Tapia', role: 'Recepción', email: 'recepcion@alerce.cl', password: 'demo123' },
    'u3': { name: 'Dra. Antonia Vergara Ríos', role: 'Médico', email: 'medico@alerce.cl', password: 'demo123' },
    'u5': { name: 'Camila Fuentes Herrera', role: 'Paciente', email: 'paciente@alerce.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier paciente, sin iniciar sesión.' },
    { id: 'paciente', label: 'Paciente', desc: 'Portal personal: horas, historial, recetas, exámenes y grupo familiar.' },
    { id: 'recepcion', label: 'Recepción', desc: 'Check-in, sala de espera, caja y la pantalla de llamados.' },
    { id: 'medico', label: 'Médico', desc: 'App del profesional: cola del día, ficha clínica, agenda y bloqueos.' },
    { id: 'admin', label: 'Administrador', desc: 'Panel completo: citas, pacientes, staff, precios, recordatorios y configuración.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Neumorfismo" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Página de inicio del centro médico con accesos a reserva, telemedicina y resultados, especialidades, profesionales destacados, ubicación y previsiones atendidas. Los textos se editan desde la configuración del sitio.',
      actions: ['Reservar hora o entrar a telemedicina', 'Ver las especialidades y profesionales destacados', 'Revisar dirección, horario y contacto', 'Ver qué previsiones se atienden (Fonasa, isapres, particular)']
    },
    {
      id: 'especialidades', section: 'publico', title: 'Especialidades', url: 'index.html#/especialidades', waitFor: '.card',
      description: 'Listado de especialidades activas con su descripción y número de profesionales. Se administran desde el panel.',
      actions: ['Ver todas las especialidades', 'Saber cuántos profesionales atienden cada una', 'Entrar a la página de una especialidad']
    },
    {
      id: 'especialidad', section: 'publico', title: 'Página de especialidad', url: 'index.html#/especialidades/car', waitFor: '.card',
      description: 'Detalle de una especialidad con su descripción y los profesionales que la atienden, con su próxima hora disponible.',
      actions: ['Leer en qué consiste la especialidad', 'Ver los profesionales y su próxima hora', 'Reservar directamente con uno de ellos']
    },
    {
      id: 'medicos', section: 'publico', title: 'Directorio de profesionales', url: 'index.html#/medicos', waitFor: '.card',
      description: 'Directorio del staff médico con especialidad, modalidad de atención y próxima hora libre.',
      actions: ['Buscar por nombre', 'Filtrar por especialidad', 'Mostrar solo quienes atienden por telemedicina', 'Abrir el perfil de un profesional']
    },
    {
      id: 'medico-perfil', section: 'publico', title: 'Perfil del profesional', url: 'index.html#/medicos/d1', waitFor: '.card',
      description: 'Perfil de un médico con su formación, horario de atención semanal y las próximas horas disponibles, generadas desde su plantilla de horario.',
      actions: ['Revisar especialidad, formación y modalidad', 'Ver el horario de atención por día', 'Elegir una de las próximas horas libres para reservar']
    },
    {
      id: 'reservar', section: 'publico', title: 'Reserva: especialidad', url: 'index.html#/reservar', waitFor: '.pick', mobile: true,
      description: 'Primer paso de la reserva en línea, en 5 pasos (especialidad, profesional, día y hora, datos y confirmación), con un resumen que muestra el valor según la previsión.',
      actions: ['Elegir la especialidad', 'Ver cuántos profesionales atienden cada una', 'Seguir el avance en la barra de pasos', 'Ver el resumen de la reserva y su valor']
    },
    {
      id: 'reservar-hora', section: 'publico', title: 'Reserva: día y hora', url: 'index.html#/reservar', waitFor: '.pick',
      setup: async h => { await booking(h, 3); },
      description: 'Paso de agenda con los días de la semana que tienen cupos y las horas libres de la mañana y la tarde. Solo aparecen los cupos que genera la plantilla de horario del médico, sin los bloqueados.',
      actions: ['Moverse entre semanas', 'Elegir un día con cupos disponibles', 'Elegir una hora de la mañana o de la tarde', 'Volver a cambiar de profesional']
    },
    {
      id: 'reservar-datos', section: 'publico', title: 'Reserva: datos del paciente', url: 'index.html#/reservar', waitFor: '.pick',
      setup: async h => { await booking(h, 4); },
      description: 'Formulario de datos del paciente. Valida el RUT y, si el paciente ya existe, completa su ficha automáticamente; el valor se recalcula al cambiar la previsión.',
      actions: ['Ingresar RUT, nombre y fecha de nacimiento', 'Elegir la previsión y ver el copago', 'Dejar correo, celular y motivo de consulta', 'Aceptar las condiciones y confirmar']
    },
    {
      id: 'reservar-confirmada', section: 'publico', title: 'Reserva confirmada', url: 'index.html#/reservar', waitFor: '.pick',
      setup: async h => { await booking(h, 5); },
      description: 'Comprobante de la reserva con código, profesional, fecha, lugar y valor. La hora aparece al instante en recepción, en la agenda del médico y en el panel.',
      actions: ['Ver el código de la reserva', 'Agregar la hora al calendario (.ics o Google Calendar)', 'Gestionar la hora (confirmar, anular o cambiar)', 'Hacer una nueva reserva']
    },
    {
      id: 'mi-hora', section: 'publico', title: 'Gestionar mi hora', url: 'index.html#/mi-hora', waitFor: '[data-find]', mobile: true,
      setup: async h => { await h.fill('#m-code', 'AL-7K2Q'); await h.fill('#m-rut', '16.543.210-K'); await h.click('[data-find] button[type="submit"]'); await h.wait('[data-result] .card'); },
      description: 'Búsqueda de una hora con el código y el RUT del paciente para confirmarla, anularla o cambiarla. La anulación sin costo respeta el plazo mínimo configurado.',
      actions: ['Buscar la hora con código y RUT', 'Confirmar la asistencia', 'Anular la hora dentro del plazo', 'Reagendar a otro día u hora', 'Agregarla al calendario']
    },
    {
      id: 'telemedicina', section: 'publico', title: 'Telemedicina: ingreso', url: 'index.html#/telemedicina', waitFor: 'form',
      description: 'Ingreso a la sala de espera virtual con código y RUT, con recomendaciones antes de la teleconsulta.',
      actions: ['Entrar a la sala con código de reserva y RUT', 'Ver sus próximas teleconsultas si tiene sesión', 'Revisar los requisitos de cámara y micrófono']
    },
    {
      id: 'telemedicina-sala', section: 'publico', title: 'Sala de espera virtual', url: 'index.html#/telemedicina', waitFor: 'form',
      setup: async h => { await h.fill('#t-code', 'AL-TELE'); await h.fill('#t-rut', '16.543.210-K'); await h.click('main form button[type="submit"]'); await h.wait('[data-leave]'); await h.pause(400); },
      description: 'Sala de teleconsulta con video simulado, controles de cámara y micrófono y chat con el médico. El paciente queda "en espera" y el médico lo ve en su app.',
      actions: ['Esperar a que el médico se conecte', 'Encender o apagar cámara y micrófono', 'Escribir en el chat de la consulta', 'Probar sonido o salir de la sala']
    },
    {
      id: 'resultados', section: 'publico', title: 'Resultados de exámenes', url: 'index.html#/resultados', waitFor: 'main form',
      setup: async h => { await h.fill('#r-rut', '16.543.210-K'); await h.fill('#r-folio', '480120'); await h.click('main form button[type="submit"]'); await h.wait('[data-out] .card'); },
      description: 'Consulta de resultados de laboratorio con RUT y folio. Muestra el estado del examen y, si está validado, permite ver el informe.',
      actions: ['Consultar con RUT y folio', 'Ver si el informe está disponible o en proceso', 'Abrir el informe en PDF']
    },
    {
      id: 'resultado-informe', section: 'publico', kind: 'modal', from: 'Botón "Ver PDF" de un examen disponible', title: 'Informe de examen', url: 'index.html#/resultados', waitFor: 'main form',
      setup: async h => { await h.fill('#r-rut', '16.543.210-K'); await h.fill('#r-folio', '480120'); await h.click('main form button[type="submit"]'); await h.click('[data-out] [data-exam]'); await h.modal(); },
      description: 'Informe de laboratorio con los resultados, valores de referencia y el profesional que lo validó, listo para imprimir.',
      actions: ['Revisar los resultados y rangos de referencia', 'Ver quién validó el informe', 'Imprimir o guardar en PDF']
    },
    {
      id: 'portal-ingreso', section: 'publico', title: 'Portal paciente (sin sesión)', url: 'index.html#/portal', waitFor: '[data-demo]',
      description: 'Lo que ve un paciente al abrir el portal sin haber ingresado: inicio de sesión, registro de cuenta nueva y cuenta de prueba.',
      actions: ['Ingresar con correo y contraseña', 'Crear una cuenta con RUT y datos personales', 'Entrar con la cuenta de prueba de paciente']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso de funcionarios', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para el equipo y los pacientes, con cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administración, recepción, médico o paciente', 'Ir a crear una cuenta de paciente', 'Volver al sitio']
    },

    // ================= Paciente =================
    {
      id: 'portal-proximas', section: 'paciente', login: U.paciente, roles: ['Paciente'], title: 'Próximas horas', url: 'index.html#/portal/proximas', waitFor: '.tab.active', mobile: true,
      description: 'Inicio del portal con las horas futuras del paciente y de sus cargas familiares.',
      actions: ['Confirmar o anular una hora', 'Agregarla al calendario', 'Entrar a la sala virtual de una teleconsulta', 'Reservar una hora nueva']
    },
    {
      id: 'portal-historial', section: 'paciente', login: U.paciente, roles: ['Paciente'], title: 'Historial de atenciones', url: 'index.html#/portal/historial', waitFor: '.tab.active',
      description: 'Atenciones anteriores con profesional, especialidad, estado y acceso a la receta emitida.',
      actions: ['Revisar atenciones pasadas', 'Ver el diagnóstico e indicaciones', 'Abrir la receta de una atención']
    },
    {
      id: 'portal-recetas', section: 'paciente', login: U.paciente, roles: ['Paciente'], title: 'Recetas', url: 'index.html#/portal/recetas', waitFor: '.tab.active',
      description: 'Recetas emitidas por los médicos del centro, con medicamentos, dosis y fecha.',
      actions: ['Ver las recetas vigentes', 'Revisar medicamentos y dosis', 'Abrir o imprimir una receta']
    },
    {
      id: 'portal-receta', section: 'paciente', login: U.paciente, roles: ['Paciente'], kind: 'modal', from: 'Botón "Ver / imprimir" en Recetas', title: 'Receta médica', url: 'index.html#/portal/recetas', waitFor: '[data-rx]',
      setup: async h => { await h.click('[data-rx] >> nth=0'); await h.modal(); },
      description: 'Receta con los datos del paciente, el profesional, los medicamentos con dosis y frecuencia, lista para imprimir.',
      actions: ['Revisar la prescripción', 'Ver el profesional que la emitió', 'Imprimir o guardar en PDF']
    },
    {
      id: 'portal-examenes', section: 'paciente', login: U.paciente, roles: ['Paciente'], title: 'Exámenes', url: 'index.html#/portal/examenes', waitFor: '.tab.active',
      description: 'Exámenes del paciente con folio, fecha y estado, sin necesidad de ingresar el folio a mano.',
      actions: ['Ver los exámenes realizados', 'Saber cuáles están disponibles', 'Abrir el informe en PDF']
    },
    {
      id: 'portal-familia', section: 'paciente', login: U.paciente, roles: ['Paciente'], title: 'Grupo familiar', url: 'index.html#/portal/familia', waitFor: '.tab.active',
      description: 'Cargas familiares asociadas a la cuenta, para reservar y ver las horas de hijos u otros familiares desde el mismo portal.',
      actions: ['Ver las cargas registradas', 'Agregar una carga familiar', 'Quitar una carga']
    },
    {
      id: 'portal-carga', section: 'paciente', login: U.paciente, roles: ['Paciente'], kind: 'modal', from: 'Botón "Agregar" en Grupo familiar', title: 'Agregar carga familiar', url: 'index.html#/portal/familia', waitFor: '[data-add]',
      setup: async h => { await h.click('[data-add]'); await h.modal(); },
      description: 'Formulario para sumar un familiar al grupo del titular.',
      actions: ['Ingresar nombre, RUT y fecha de nacimiento', 'Indicar la relación con el titular', 'Elegir su previsión']
    },
    {
      id: 'portal-datos', section: 'paciente', login: U.paciente, roles: ['Paciente'], title: 'Mis datos', url: 'index.html#/portal/datos', waitFor: '.tab.active',
      description: 'Datos personales del paciente y cambio de contraseña.',
      actions: ['Actualizar teléfono, correo y previsión', 'Revisar alergias y enfermedades crónicas registradas', 'Cambiar la contraseña']
    },

    // ================= Recepción =================
    {
      id: 'rec-checkin', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Check-in de hoy', url: 'recepcion.html#/', waitFor: '.admin-content [data-walk]', mobile: true,
      setup: async h => { await liven(h, { n: 6, call: true }); await h.select('.admin-content [data-st]', ''); },
      description: 'Lista de las citas del día para marcar la llegada del paciente, cobrar y llamarlo a box, con buscador por RUT, nombre o código.',
      actions: ['Buscar al paciente por RUT, nombre o código', 'Hacer check-in (queda en la sala de espera)', 'Cobrar la consulta', 'Llamar al paciente a la pantalla', 'Agendar un sobrecupo']
    },
    {
      id: 'rec-sobrecupo', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], kind: 'modal', from: 'Botón "Sobrecupo / agendar" en Check-in', title: 'Agendar paciente presencial', url: 'recepcion.html#/', waitFor: '.admin-content [data-walk]',
      setup: async h => { await h.click('.admin-content [data-walk]'); await h.modal(); },
      description: 'Agenda rápida para un paciente que llega sin hora o pide un sobrecupo, buscando su ficha por RUT o creándola.',
      actions: ['Buscar o crear al paciente', 'Elegir profesional, día y hora', 'Agendar como sobrecupo si no hay cupos']
    },
    {
      id: 'rec-cobrar', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], kind: 'modal', from: 'Botón "Cobrar" en Check-in o Caja', title: 'Cobro de consulta', url: 'recepcion.html#/pagos', waitFor: '.admin-content .page-head',
      setup: async h => { await liven(h, { n: 6 });
        await h.click('.admin-content [data-pay] >> nth=0'); await h.modal();
      },
      description: 'Registro del pago de una consulta con el copago según previsión.',
      actions: ['Ver el valor a pagar según previsión', 'Elegir medio de pago (efectivo, tarjeta, bono electrónico)', 'Registrar el pago']
    },
    {
      id: 'rec-sala', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Sala de espera', url: 'recepcion.html#/sala', waitFor: '.admin-content .page-head',
      setup: async h => { await liven(h, { n: 6, call: true }); },
      description: 'Pacientes esperando agrupados por profesional, con tiempo de espera promedio y los últimos llamados.',
      actions: ['Ver quién espera a cada médico', 'Llamar al siguiente paciente', 'Repetir un llamado', 'Controlar la espera promedio']
    },
    {
      id: 'rec-caja', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Caja: pagos y bonos', url: 'recepcion.html#/pagos', waitFor: '.admin-content .page-head',
      setup: async h => { await liven(h, { n: 6 }); },
      description: 'Caja del día con las atenciones pendientes de cobro, el total por medio de pago y los pagos registrados hoy.',
      actions: ['Cobrar las atenciones pendientes', 'Ver la recaudación por medio de pago', 'Revisar los pagos del día']
    },
    {
      id: 'rec-panel', section: 'recepcion', login: U.recepcion, roles: ['Recepción', 'Administrador'], title: 'Panel con permisos de recepción', url: 'admin.html#/medicos', waitFor: '.admin-content',
      setup: async h => { await h.wait('.admin-content .card'); },
      description: 'Recepción también entra al panel de administración, pero solo ve dashboard, citas, pacientes y recordatorios; si abre una sección de administrador, como Médicos y horarios, aparece un aviso de acceso restringido.',
      actions: ['Usar dashboard, citas, pacientes y recordatorios del panel', 'Ver qué secciones son solo del administrador', 'Volver a una sección permitida desde el menú']
    },
    {
      id: 'pantalla', section: 'recepcion', title: 'Pantalla de sala de espera', url: 'pantalla.html', waitFor: 'h3',
      setup: async h => { await liven(h, { n: 6, call: true }); },
      description: 'Pantalla tipo TV para la sala de espera: muestra el llamado actual con el box, los últimos llamados y los pacientes en espera. Se actualiza sola cuando recepción o el médico llaman a alguien.',
      actions: ['Mostrar el paciente llamado y su box', 'Ver los últimos llamados', 'Ver la cola de espera', 'Funcionar en un televisor sin intervención']
    },

    // ================= Médico =================
    {
      id: 'med-hoy', section: 'medico', login: U.medico, roles: ['Médico'], title: 'Agenda y cola de hoy', url: 'medico.html#/', waitFor: '.admin-content .page-head', mobile: true,
      setup: async h => { await liven(h, { doctor: 'd1', n: 3 }); },
      description: 'Inicio de la app del médico con la cola del día: pacientes en espera, el que está en atención y las próximas horas, presenciales y por telemedicina.',
      actions: ['Llamar al siguiente paciente (aparece en la pantalla)', 'Abrir la ficha y comenzar la atención', 'Marcar un no-show', 'Ver el resumen del día']
    },
    {
      id: 'med-atencion', section: 'medico', login: U.medico, roles: ['Médico'], title: 'Ficha clínica de la atención', url: 'medico.html#/', waitFor: '.admin-content .page-head',
      setup: async h => { await liven(h, { doctor: 'd1', n: 3 }); await h.click('.admin-content a.btn-primary[href^="#/atencion/"] >> nth=0'); await h.wait('.admin-content [data-finish]'); return { url: h.here() }; },
      description: 'Registro de la atención: anamnesis y examen físico, diagnóstico con buscador CIE-10, indicaciones y receta, junto a los datos del paciente y sus atenciones anteriores. En teleconsultas incluye la sala virtual con chat.',
      actions: ['Escribir anamnesis y examen físico', 'Agregar diagnósticos CIE-10', 'Dejar indicaciones', 'Armar la receta con dosis y frecuencia', 'Guardar borrador o finalizar la atención']
    },
    {
      id: 'med-receta', section: 'medico', login: U.medico, roles: ['Médico'], kind: 'modal', from: 'Botón "Receta" en la ficha de la atención', title: 'Vista de receta', url: 'medico.html#/', waitFor: '.admin-content .page-head',
      setup: async h => { await liven(h, { doctor: 'd1', n: 3 });
        await h.click('.admin-content a.btn-primary[href^="#/atencion/"] >> nth=0'); await h.wait('.admin-content [data-finish]'); const url = h.here();
        await h.click('[data-addrx]'); await h.fill('.admin-content input[placeholder="Medicamento"] >> nth=-1', 'Paracetamol 500 mg');
        await h.fill('.admin-content input[placeholder="Dosis"] >> nth=-1', '1 comprimido'); await h.fill('.admin-content input[placeholder="Frecuencia"] >> nth=-1', 'cada 8 horas por 5 días');
        await h.click('.page-head [data-rx]'); await h.modal(); return { url };
      },
      description: 'Receta generada desde la ficha, con los datos del paciente y del profesional, lista para imprimir; al finalizar queda disponible en el portal del paciente.',
      actions: ['Revisar los medicamentos antes de emitir', 'Imprimir o guardar en PDF', 'Volver a la ficha para corregir']
    },
    {
      id: 'med-semana', section: 'medico', login: U.medico, roles: ['Médico'], title: 'Agenda semanal', url: 'medico.html#/semana', waitFor: '.admin-content .page-head',
      description: 'Agenda de la semana del médico por día y hora, con el estado de cada cita y los bloqueos.',
      actions: ['Moverse entre semanas o volver a hoy', 'Ver las citas de cada día', 'Abrir el detalle de una cita']
    },
    {
      id: 'med-pacientes', section: 'medico', login: U.medico, roles: ['Médico'], title: 'Mis pacientes', url: 'medico.html#/pacientes', waitFor: '.admin-content table',
      description: 'Pacientes atendidos por el médico con previsión, última atención y próxima hora.',
      actions: ['Buscar a un paciente', 'Ver su última y próxima atención', 'Abrir su historial clínico']
    },
    {
      id: 'med-historial', section: 'medico', login: U.medico, roles: ['Médico'], kind: 'modal', from: 'Clic en un paciente de Mis pacientes', title: 'Historial del paciente', url: 'medico.html#/pacientes', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=0'); await h.modal(); },
      description: 'Historial clínico de un paciente con sus registros, recetas y últimas citas.',
      actions: ['Revisar los registros clínicos', 'Abrir una receta anterior', 'Ver las últimas citas']
    },
    {
      id: 'med-bloqueos', section: 'medico', login: U.medico, roles: ['Médico'], title: 'Bloquear horario', url: 'medico.html#/bloqueos', waitFor: '.admin-content .page-head',
      description: 'Bloqueos de agenda por vacaciones, congresos o trámites. Cada bloqueo quita esos cupos de la reserva en línea.',
      actions: ['Crear un bloqueo con fecha, horario y motivo', 'Ver los bloqueos próximos', 'Quitar un bloqueo']
    },

    // ================= Administrador =================
    {
      id: 'admin-dashboard', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Resumen operativo con citas de hoy, ocupación de la semana, ingresos y no-show, gráficos de citas por día, ingresos por previsión, ocupación por profesional y próximas atenciones.',
      actions: ['Comparar indicadores con la semana pasada', 'Ver la ocupación por profesional', 'Analizar ingresos por previsión y no-show por día', 'Revisar las próximas atenciones y la actividad reciente']
    },
    {
      id: 'admin-citas', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Citas', url: 'admin.html#/citas', waitFor: '.admin-content table',
      description: 'Agenda de todo el centro con estado, profesional, previsión y pago de cada cita.',
      actions: ['Filtrar por fecha, profesional y estado', 'Abrir una cita para cambiar su estado', 'Crear una cita nueva', 'Exportar a CSV']
    },
    {
      id: 'admin-cita-detalle', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Clic en una cita', title: 'Detalle de cita', url: 'admin.html#/citas', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Detalle de una cita con el paciente, el profesional y su flujo de estados (reservada, confirmada, en espera, en atención, atendida).',
      actions: ['Avanzar el estado de la cita', 'Cobrar la consulta', 'Reprogramar o cancelar', 'Enviar un recordatorio', 'Marcar que no asistió']
    },
    {
      id: 'admin-cita-nueva', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Botón "Nueva cita" en Citas', title: 'Nueva cita', url: 'admin.html#/citas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Agendamiento interno de una cita, con búsqueda del paciente y los cupos libres del profesional.',
      actions: ['Buscar o crear al paciente', 'Elegir profesional y modalidad', 'Elegir día y hora libre', 'Confirmar la cita']
    },
    {
      id: 'admin-pacientes', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Pacientes', url: 'admin.html#/pacientes', waitFor: '.admin-content table',
      description: 'Base de pacientes con RUT, previsión y última atención.',
      actions: ['Buscar por nombre o RUT', 'Filtrar por previsión', 'Crear, editar o eliminar pacientes', 'Abrir la ficha del paciente']
    },
    {
      id: 'admin-paciente-ficha', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Ficha de paciente', url: 'admin.html#/pacientes/p0', waitFor: '.admin-content .page-head',
      description: 'Ficha completa con datos personales, alergias, citas, atenciones registradas, grupo familiar y exámenes.',
      actions: ['Ver citas y abrir su detalle', 'Revisar atenciones y recetas', 'Ver el grupo familiar y los exámenes', 'Agendar una nueva cita', 'Editar los datos']
    },
    {
      id: 'admin-paciente-editar', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Botón "Nuevo paciente" en Pacientes', title: 'Nuevo paciente', url: 'admin.html#/pacientes', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de ficha de paciente.',
      actions: ['Ingresar RUT, nombre y fecha de nacimiento', 'Registrar previsión y contacto', 'Anotar alergias y enfermedades crónicas']
    },
    {
      id: 'admin-medicos', section: 'admin', login: U.admin, title: 'Médicos y horarios', url: 'admin.html#/medicos', waitFor: '.admin-content table',
      description: 'Staff médico con especialidad, días de atención, cupos semanales y próxima hora. La plantilla de horario de cada uno genera los cupos de la reserva en línea.',
      actions: ['Agregar o editar profesionales', 'Ver cupos por semana y próxima hora', 'Activar o desactivar un profesional', 'Exportar a CSV']
    },
    {
      id: 'admin-medico-editar', section: 'admin', login: U.admin, kind: 'modal', from: 'Clic en un profesional de Médicos y horarios', title: 'Editar profesional y horario', url: 'admin.html#/medicos', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Datos del profesional y su plantilla de horario (días, horas y duración de cada cita) con la vista previa de los cupos que genera.',
      actions: ['Editar nombre, RUT, especialidad y box', 'Definir días y horario de atención', 'Fijar la duración de cada cita', 'Activar la atención por telemedicina', 'Ver la vista previa de cupos']
    },
    {
      id: 'admin-especialidades', section: 'admin', login: U.admin, title: 'Especialidades', url: 'admin.html#/especialidades', waitFor: '.admin-content table',
      description: 'Especialidades del centro con descripción e ícono. Se muestran en el sitio, el directorio y la reserva.',
      actions: ['Crear, editar o eliminar especialidades', 'Elegir el ícono', 'Ordenar cómo aparecen en el sitio']
    },
    {
      id: 'admin-boxes', section: 'admin', login: U.admin, title: 'Boxes y salas', url: 'admin.html#/boxes', waitFor: '.admin-content .page-head',
      description: 'Espacios de atención con su tipo o equipamiento y el uso de cada uno hoy.',
      actions: ['Crear, editar o eliminar boxes', 'Indicar tipo y equipamiento', 'Ver la ocupación del día']
    },
    {
      id: 'admin-precios', section: 'admin', login: U.admin, title: 'Precios y previsión', url: 'admin.html#/precios', waitFor: '.admin-content [data-save]',
      description: 'Copago por consulta según especialidad y previsión. Se usa en la reserva en línea y en la caja de recepción.',
      actions: ['Editar el copago por especialidad y previsión', 'Aplicar un ajuste masivo en porcentaje', 'Guardar la tabla de precios']
    },
    {
      id: 'admin-ajuste-precios', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Ajuste masivo %" en Precios', title: 'Ajuste masivo de precios', url: 'admin.html#/precios', waitFor: '.admin-content [data-save]',
      setup: async h => { await h.click('.page-head [data-pct]'); await h.modal(); },
      description: 'Ajuste porcentual de todos los precios de una vez, hacia arriba o hacia abajo.',
      actions: ['Ingresar el porcentaje de ajuste', 'Aplicar a toda la tabla', 'Revisar antes de guardar']
    },
    {
      id: 'admin-recordatorios', section: 'admin', login: U.admin, roles: ['Administrador', 'Recepción'], title: 'Recordatorios', url: 'admin.html#/recordatorios', waitFor: '.admin-content .page-head',
      description: 'Registro simulado de SMS y correos de recordatorio enviados a los pacientes, con su estado y la plantilla del mensaje.',
      actions: ['Ver los recordatorios enviados y fallidos', 'Reintentar los fallidos', 'Editar la plantilla del recordatorio']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de acceso con su rol y vínculo (profesional o ficha de paciente).',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol', 'Vincular un médico a su perfil o un paciente a su ficha', 'Desactivar una cuenta']
    },
    {
      id: 'admin-config', section: 'admin', login: U.admin, title: 'Configuración del sitio', url: 'admin.html#/config', waitFor: '.admin-content form',
      description: 'Textos del sitio público, datos de contacto y reglas de reserva (días de anticipación y plazo para anular). Se reflejan de inmediato en el sitio.',
      actions: ['Editar título, bajada y aviso del sitio', 'Actualizar dirección, teléfono y horario', 'Definir cuántos días se puede reservar', 'Fijar el plazo mínimo para anular sin costo']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Últimos 300 eventos del sistema: inicios de sesión, reservas, cambios de estado y configuración.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción y buscar', 'Exportar a CSV', 'Restablecer los datos de demostración']
    }
  ]
};
