// Biblioteca de vistas de Grupo Cordillera (/rrhh): sitio de empleos, portal del colaborador y panel de RRHH.
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', jefatura: 'u-jef', empleado: 'u-emp', reclutador: 'u-rec' };
const TODOS = ['Empleado', 'Jefatura', 'Reclutador', 'Admin RRHH'];
const STAFF = ['Reclutador', 'Admin RRHH'];
// login.html redirige si ya hay sesión: se cierra la sesión antes de cambiar de usuario.
async function switchTo(h, uid) { await h.page.evaluate(() => localStorage.removeItem('lgw:session:rrhh')); await h.login(uid); }

// Llena la postulación a la vacante j1 con un CV simulado (la carga tiene barra de progreso).
async function fillApplication(h) {
  await h.fill('#ap-name', 'Martín Soto Araya');
  await h.fill('#ap-rut', '12.345.678-5');
  await h.fill('#ap-phone', '+56 9 6543 2109');
  await h.fill('#ap-email', 'martin.soto@demo.cl');
  await h.fill('#ap-sal', '1800000');
  await h.page.setInputFiles('#ap-cv', { name: 'CV_Martin_Soto.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') });
  await h.wait('[data-drop].has');
  await h.page.waitForFunction(() => document.querySelector('[data-cvlabel]')?.textContent.startsWith('✓'));
  await h.fill('#ap-cover', 'Me interesa el desafío técnico y la modalidad híbrida.');
  await h.check('[data-apply] [name="ok"]');
}

module.exports = {
  dir: 'rrhh',
  name: 'Grupo Cordillera · Personas',
  kind: 'Portal de empleos y RRHH',
  theme: 'material',
  description: 'Sistema de recursos humanos con sitio público de empleos y postulación, portal de autoservicio para colaboradores y jefaturas, y panel de RRHH con dotación, remuneraciones, vacaciones, reclutamiento (ATS), onboarding, desempeño y clima.',
  accounts: {
    'u-admin': { name: 'Isidora Díaz', role: 'Admin RRHH', email: 'admin@grupocordillera.demo', password: 'demo123' },
    'u-jef': { name: 'Isabel Garrido', role: 'Jefatura', email: 'jefatura@grupocordillera.demo', password: 'demo123' },
    'u-emp': { name: 'Amanda Alarcón', role: 'Empleado', email: 'empleado@grupocordillera.demo', password: 'demo123' },
    'u-rec': { name: 'Raúl Soto', role: 'Reclutador', email: 'reclutador@grupocordillera.demo', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio de empleos', desc: 'Lo que ve cualquier postulante, sin iniciar sesión.' },
    { id: 'empleado', label: 'Colaborador', desc: 'Portal de autoservicio: vacaciones, liquidaciones, asistencia, documentos y desempeño.' },
    { id: 'jefatura', label: 'Jefatura', desc: 'Sección "Mi equipo" del portal para quien tiene personas a cargo.' },
    { id: 'reclutador', label: 'Reclutador', desc: 'Módulos de talento del panel: vacantes, candidatos (ATS) y onboarding.' },
    { id: 'admin', label: 'Admin RRHH', desc: 'Panel completo de Personas: colaboradores, estructura, remuneraciones, políticas, desempeño, clima y sistema.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Material 14" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' },
      { id: 'graphite', group: 'Estilo', label: 'Grafito', desc: 'Oscuro sobrio, de herramienta profesional.', theme: 'graphite' },
      { id: 'forest', group: 'Estilo', label: 'Bosque', desc: 'Tonos verdes y cálidos.', theme: 'forest' }
    ]
  },

  views: [
    // ================= Sitio de empleos =================
    {
      id: 'portada', section: 'publico', title: 'Portada del sitio de empleos', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Página de inicio de "Trabaja con nosotros" con cifras de la empresa, empleos destacados, quiénes somos y beneficios. Los textos se editan desde el panel de RRHH.',
      actions: ['Ver cuántas vacantes hay abiertas y entrar al listado', 'Revisar los 4 empleos publicados más recientes', 'Conocer los valores y beneficios de la empresa', 'Ir a revisar el estado de una postulación']
    },
    {
      id: 'empleos', section: 'publico', title: 'Listado de empleos', url: 'index.html#/empleos', waitFor: '.job-card',
      description: 'Todas las vacantes publicadas con área, ciudad, modalidad, tipo de jornada y rango de renta. Los filtros se combinan y la lista se actualiza al instante.',
      actions: ['Buscar por cargo o palabra clave', 'Filtrar por área, ciudad y modalidad', 'Ver el rango de sueldo bruto de cada vacante', 'Abrir el detalle de un cargo para postular']
    },
    {
      id: 'vacante', section: 'publico', title: 'Detalle de vacante y postulación', url: 'index.html#/empleos/j1', waitFor: '[data-apply]', mobile: true,
      description: 'Ficha del cargo con descripción, requisitos, beneficios y plazo, junto al formulario para postular con carga de CV.',
      actions: ['Leer requisitos, beneficios y rango de renta', 'Completar datos de contacto (se valida el RUT)', 'Adjuntar el CV arrastrándolo o eligiendo el archivo (PDF o Word, máx. 5 MB)', 'Indicar pretensión de renta y una carta breve', 'Enviar la postulación al ATS del equipo de selección']
    },
    {
      id: 'postulacion-enviada', section: 'publico', title: 'Postulación enviada', url: 'index.html#/empleos/j1', waitFor: '[data-apply]',
      setup: async h => { await fillApplication(h); await h.click('[data-apply] button[type="submit"]'); await h.wait('[data-code]'); },
      description: 'Confirmación de la postulación con el código de seguimiento. El candidato entra de inmediato a la etapa "Postulado" del pipeline del reclutador.',
      actions: ['Ver el código de seguimiento', 'Ir directo al estado de la postulación', 'Seguir viendo otras vacantes']
    },
    {
      id: 'estado', section: 'publico', title: 'Estado de postulación', url: 'index.html#/estado', waitFor: '[data-sample]',
      setup: async h => { await h.click('[data-sample]'); await h.wait('[data-res] .timeline'); },
      description: 'Consulta pública con código y correo que muestra en qué etapa va el proceso, con la fecha de cada paso. Refleja los cambios que hace el reclutador en el ATS.',
      actions: ['Consultar con el código y el correo de la postulación', 'Ver la línea de tiempo del proceso por etapa', 'Saber si el proceso se cerró', 'Cargar un código de ejemplo para probar']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso común al portal del colaborador y al panel de RRHH. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como Admin RRHH, Jefatura, Empleado o Reclutador', 'Ir al portal o al panel según el rol', 'Volver al sitio de empleos']
    },

    // ================= Colaborador =================
    {
      id: 'portal-inicio', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Inicio del portal', url: 'portal.html#/', waitFor: '.clock-card', mobile: true,
      description: 'Resumen personal del colaborador: saldo de vacaciones, último sueldo líquido, solicitudes en curso, estado de la evaluación, marcaje del día, encuesta abierta, comunicados y cumpleaños del mes.',
      actions: ['Marcar entrada y salida', 'Responder la encuesta eNPS anónima de 0 a 10', 'Ver saldo de vacaciones y último líquido', 'Revisar sus solicitudes recientes y crear una nueva', 'Leer comunicados y ver los cumpleaños del mes']
    },
    {
      id: 'portal-notificaciones', section: 'empleado', login: U.empleado, roles: TODOS, kind: 'modal', from: 'Campana de la barra superior del portal', title: 'Notificaciones', url: 'portal.html#/', waitFor: '.clock-card',
      setup: async h => { await h.click('.notif-btn'); await h.wait('#bellBox .menu-pop'); },
      description: 'Avisos personales del colaborador: respuestas a sus solicitudes, liquidaciones disponibles, recordatorios de evaluación y mensajes de RRHH.',
      actions: ['Ver los últimos 8 avisos con su antigüedad', 'Distinguir los no leídos', 'Marcar todos como leídos']
    },
    {
      id: 'portal-solicitudes', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Vacaciones y permisos', url: 'portal.html#/solicitudes', waitFor: '[data-req]',
      description: 'Saldo de vacaciones con su desglose y formulario de solicitud que calcula los días hábiles y valida las reglas de la política antes de enviar a la jefatura.',
      actions: ['Ver derecho anual, arrastre, devengado, usados y en trámite', 'Solicitar vacaciones, días administrativos (incluso medio día), licencia u otros permisos', 'Adjuntar el comprobante cuando el permiso lo exige', 'Ver sus ausencias en un calendario mensual', 'Revisar el historial y anular solicitudes pendientes']
    },
    {
      id: 'portal-liquidaciones', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Liquidaciones de sueldo', url: 'portal.html#/liquidaciones', waitFor: '.table',
      description: 'Historial de liquidaciones con la evolución del líquido de los últimos meses y el detalle del último periodo (haberes, descuentos, AFP y salud).',
      actions: ['Ver el gráfico de líquido de los últimos 6 meses', 'Revisar haberes y descuentos de cada mes', 'Abrir cualquier liquidación para verla o imprimirla']
    },
    {
      id: 'portal-liquidacion', section: 'empleado', login: U.empleado, roles: TODOS, kind: 'modal', from: 'Botón "Ver liquidación" en Liquidaciones', title: 'Liquidación de sueldo', url: 'portal.html#/liquidaciones', waitFor: '.table',
      setup: async h => { await h.click('.stack [data-open]'); await h.modal(); },
      description: 'Documento de liquidación del mes con haberes imponibles y no imponibles, cotizaciones de AFP, salud y seguro de cesantía, impuesto único y líquido a pago. El cálculo es simulado.',
      actions: ['Revisar cada haber y descuento', 'Ver la AFP y el plan de salud aplicados', 'Imprimir o guardar como PDF']
    },
    {
      id: 'portal-asistencia', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Asistencia', url: 'portal.html#/asistencia', waitFor: '.clock-card',
      description: 'Reloj de marcaje con la jornada del colaborador, resumen de horas y atrasos y la lista de todas sus marcas.',
      actions: ['Marcar entrada y salida del día', 'Ver días registrados, horas trabajadas y promedio', 'Revisar atrasos y horas sobre la jornada', 'Detectar días sin marca de salida']
    },
    {
      id: 'portal-documentos', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Mis documentos', url: 'portal.html#/documentos', waitFor: '.doc-row',
      description: 'Contratos, anexos, reglamentos y certificados del colaborador, con firma electrónica simulada de los pendientes.',
      actions: ['Firmar documentos pendientes', 'Descargar cualquier documento', 'Generar al instante un certificado de antigüedad o de renta']
    },
    {
      id: 'portal-desempeno', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Desempeño', url: 'portal.html#/evaluacion', waitFor: '[data-self]',
      description: 'Autoevaluación del ciclo abierto con una escala de 1 a 5 por competencia, más los resultados de ciclos anteriores.',
      actions: ['Calificar cada competencia del ciclo', 'Escribir logros y objetivos de desarrollo', 'Enviar o actualizar la autoevaluación (se avisa a la jefatura)', 'Ver si la jefatura ya evaluó y los resultados anteriores']
    },
    {
      id: 'portal-comunicados', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Comunicados', url: 'portal.html#/anuncios', waitFor: '.admin-content h1',
      description: 'Comunicados internos publicados por RRHH, con los fijados primero y su categoría.',
      actions: ['Leer los comunicados vigentes', 'Ver primero los fijados', 'Identificar la categoría de cada aviso']
    },
    {
      id: 'portal-celebraciones', section: 'empleado', login: U.empleado, roles: TODOS, title: 'Cumpleaños y aniversarios', url: 'portal.html#/celebraciones', waitFor: '.cele',
      description: 'Próximos cumpleaños, aniversarios laborales y nuevos ingresos de los siguientes 45 días.',
      actions: ['Ver quién está de cumpleaños', 'Ver aniversarios con los años cumplidos', 'Conocer a las personas que ingresaron o ingresarán']
    },

    // ================= Jefatura =================
    {
      id: 'equipo-aprobaciones', section: 'jefatura', login: U.jefatura, title: 'Mi equipo: aprobaciones', url: 'portal.html#/equipo', waitFor: '.tabs', mobile: true,
      description: 'Bandeja de solicitudes pendientes de las personas a cargo, con el saldo de vacaciones de cada una. Al decidir, el colaborador recibe una notificación.',
      actions: ['Ver tipo, fechas, días y saldo de cada solicitud', 'Aprobar con un clic', 'Rechazar indicando el motivo', 'Saltar al calendario, evaluaciones o listado del equipo']
    },
    {
      id: 'equipo-rechazar', section: 'jefatura', login: U.jefatura, kind: 'modal', from: 'Botón "Rechazar" en una solicitud del equipo', title: 'Rechazar solicitud', url: 'portal.html#/equipo', waitFor: '.tabs',
      setup: async h => { await h.click('[data-no]'); await h.modal(); },
      description: 'Ventana para rechazar una solicitud con un motivo que se envía al colaborador.',
      actions: ['Escribir el motivo del rechazo', 'Confirmar el rechazo', 'Notificar al colaborador con el comentario']
    },
    {
      id: 'equipo-calendario', section: 'jefatura', login: U.jefatura, title: 'Mi equipo: calendario', url: 'portal.html#/equipo', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="calendario"]'); await h.wait('.card-h'); },
      description: 'Calendario mensual con las ausencias aprobadas, pendientes y licencias de todo el equipo.',
      actions: ['Navegar mes a mes', 'Ver quién está ausente cada día', 'Distinguir aprobadas, pendientes y licencias por color']
    },
    {
      id: 'equipo-evaluaciones', section: 'jefatura', login: U.jefatura, title: 'Mi equipo: evaluaciones', url: 'portal.html#/equipo', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="evaluaciones"]'); await h.wait('.admin-content table'); },
      description: 'Avance del ciclo de desempeño abierto para cada persona del equipo: autoevaluación recibida y evaluación de la jefatura.',
      actions: ['Ver quién envió su autoevaluación', 'Ver el puntaje y nivel ya asignados', 'Abrir la evaluación de cada colaborador']
    },
    {
      id: 'equipo-evaluar', section: 'jefatura', login: U.jefatura, kind: 'modal', from: 'Botón "Evaluar" en la pestaña Evaluaciones', title: 'Evaluar a un colaborador', url: 'portal.html#/equipo', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="evaluaciones"]'); await h.click('tr:has(.badge-success) [data-eval]'); await h.modal(); },
      description: 'Formulario de evaluación de la jefatura que muestra al lado la autoevaluación del colaborador, competencia por competencia.',
      actions: ['Leer la autoevaluación, logros y objetivos', 'Calificar cada competencia de 1 a 5', 'Escribir la retroalimentación', 'Guardar y notificar al colaborador']
    },
    {
      id: 'equipo-listado', section: 'jefatura', login: U.jefatura, title: 'Mi equipo: personas', url: 'portal.html#/equipo', waitFor: '.tabs',
      setup: async h => { await h.click('[data-tab="equipo"]'); await h.wait('.admin-content table'); },
      description: 'Listado de las personas a cargo con fecha de ingreso, tipo de contrato, vacaciones disponibles y si están ausentes hoy.',
      actions: ['Ver la antigüedad y el contrato de cada persona', 'Revisar el saldo de vacaciones', 'Saber quién está ausente hoy y por qué']
    },

    // ================= Reclutador =================
    {
      id: 'rec-dashboard', section: 'reclutador', login: U.reclutador, title: 'Dashboard del reclutador', url: 'admin.html#/', waitFor: '.admin-content .card',
      description: 'Versión del dashboard para el rol de reclutamiento: dotación, ingresos, egresos, ausentismo, eNPS y pipeline de candidatos, sin costos de planilla ni bitácora.',
      actions: ['Ver la dotación de los últimos 12 meses y por área', 'Revisar ingresos y egresos por mes', 'Ver cuántos candidatos hay en cada etapa del pipeline', 'Entrar a vacantes, candidatos u onboarding desde el menú']
    },
    {
      id: 'vacantes', section: 'reclutador', login: U.reclutador, roles: STAFF, title: 'Vacantes', url: 'admin.html#/vacantes', waitFor: '.admin-content table',
      description: 'Administración de las vacantes del sitio de empleos con su estado, plazo, reclutador y cantidad de postulantes.',
      actions: ['Crear y editar vacantes', 'Publicar, pausar o cerrar una vacante', 'Ver postulantes por vacante', 'Filtrar y buscar', 'Abrir el sitio público para revisarla']
    },
    {
      id: 'vacante-nueva', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Botón "Nueva vacante"', title: 'Nueva vacante', url: 'admin.html#/vacantes', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-act="new"]'); await h.modal(); },
      description: 'Formulario completo del aviso: cargo, área, ciudad, modalidad, jornada, rango de renta, descripción, requisitos, beneficios, plazo y estado de publicación.',
      actions: ['Definir cargo, área, ciudad y modalidad', 'Fijar el rango de renta y el número de vacantes', 'Escribir descripción, requisitos y beneficios', 'Asignar reclutador y fecha límite', 'Guardar como borrador o publicar']
    },
    {
      id: 'candidatos', section: 'reclutador', login: U.reclutador, roles: STAFF, title: 'Candidatos (ATS)', url: 'admin.html#/candidatos', waitFor: '.kanban .kcard', mobile: true,
      description: 'Pipeline de selección en tablero kanban por etapa (postulado, revisión, entrevista, prueba, oferta, contratado). Las tarjetas se arrastran entre columnas.',
      actions: ['Mover candidatos entre etapas arrastrando', 'Filtrar por vacante', 'Ver puntaje y antigüedad de cada postulación', 'Agregar un candidato a mano', 'Abrir el perfil completo']
    },
    {
      id: 'candidato-perfil', section: 'reclutador', login: U.reclutador, roles: STAFF, title: 'Perfil del candidato', url: 'admin.html#/candidatos/a4830', waitFor: '[data-stage]',
      description: 'Ficha del postulante con datos de contacto, etapa, entrevistas agendadas, scorecards del equipo, historial del proceso y notas internas.',
      actions: ['Cambiar la etapa del proceso', 'Ver el CV adjunto', 'Agendar entrevistas y registrar scorecards', 'Dejar notas internas', 'Descartar o contratar']
    },
    {
      id: 'candidato-cv', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Botón "Ver CV" en el perfil del candidato', title: 'CV del candidato', url: 'admin.html#/candidatos/a4830', waitFor: '[data-stage]',
      setup: async h => { await h.click('[data-cv]'); await h.modal(); },
      description: 'Vista previa del currículum adjunto en la postulación (simulada) con experiencia, formación y contacto.',
      actions: ['Revisar experiencia y formación', 'Ver los datos de contacto y LinkedIn', 'Volver al perfil para decidir']
    },
    {
      id: 'candidato-entrevista', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Botón "Agendar" en Entrevistas del perfil', title: 'Agendar entrevista', url: 'admin.html#/candidatos/a4830', waitFor: '[data-stage]',
      setup: async h => { await h.click('[data-int]'); await h.modal(); },
      description: 'Formulario para agendar una entrevista con fecha, hora, entrevistador y modalidad.',
      actions: ['Elegir fecha y hora', 'Asignar entrevistador entre las jefaturas', 'Definir la modalidad', 'Dejarla registrada en el perfil']
    },
    {
      id: 'candidato-scorecard', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Botón "Evaluar" en Scorecards del perfil', title: 'Scorecard de entrevista', url: 'admin.html#/candidatos/a4830', waitFor: '[data-stage]',
      setup: async h => { await h.click('[data-sc]'); await h.modal(); },
      description: 'Pauta de evaluación estructurada después de una entrevista, con nota de 1 a 5 por criterio y una recomendación.',
      actions: ['Calificar cada criterio de 1 a 5', 'Recomendar avanzar, con dudas o no avanzar', 'Dejar un comentario', 'Actualizar el promedio del candidato']
    },
    {
      id: 'candidato-contratar', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Etapa "Contratado" en el perfil o el kanban', title: 'Contratar candidato', url: 'admin.html#/candidatos/a4833', waitFor: '[data-stage]',
      setup: async h => { await h.select('[data-stage]', 'contratado'); await h.modal(); },
      description: 'Cierre del proceso: al contratar se crea la ficha del colaborador, su contrato pendiente de firma y el checklist de onboarding.',
      actions: ['Definir fecha de ingreso y sueldo base', 'Elegir tipo de contrato y AFP', 'Crear la ficha del colaborador automáticamente', 'Generar el onboarding y cerrar la vacante si se completan los cupos']
    },
    {
      id: 'candidato-descartar', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Botón "Descartar" en el perfil del candidato', title: 'Descartar candidato', url: 'admin.html#/candidatos/a4830', waitFor: '[data-stage]',
      setup: async h => { await h.click('[data-discard]'); await h.modal(); },
      description: 'Cierre de una postulación con su motivo. El postulante ve el proceso como cerrado en la consulta pública.',
      actions: ['Elegir el motivo del descarte', 'Decidir si se envía aviso al postulante', 'Mover la tarjeta a descartados']
    },
    {
      id: 'onboarding', section: 'reclutador', login: U.reclutador, roles: STAFF, title: 'Onboarding', url: 'admin.html#/onboarding', waitFor: '[data-open]',
      description: 'Procesos de ingreso de las nuevas personas con su avance y el checklist de tareas por responsable y fecha. Se crean solos al contratar desde el ATS.',
      actions: ['Ver el avance de cada ingreso', 'Marcar tareas como hechas', 'Ver responsable y fecha de cada tarea', 'Crear un onboarding a mano', 'Editar la plantilla de tareas']
    },
    {
      id: 'onboarding-plantilla', section: 'reclutador', login: U.reclutador, roles: STAFF, kind: 'modal', from: 'Botón "Plantilla" en Onboarding', title: 'Plantilla de onboarding', url: 'admin.html#/onboarding', waitFor: '[data-open]',
      setup: async h => { await h.click('[data-tpl]'); await h.modal(); },
      description: 'Editor de la lista base de tareas de ingreso: título, responsable y días desde la fecha de ingreso.',
      actions: ['Agregar, quitar o reordenar tareas', 'Asignar el responsable de cada una', 'Definir el plazo en días desde el ingreso']
    },

    // ================= Admin RRHH =================
    {
      id: 'dashboard', section: 'admin', login: U.admin, title: 'Dashboard de RRHH', url: 'admin.html#/', waitFor: '.admin-content .card',
      description: 'Indicadores de personas: dotación, rotación, ausentismo, costo de planilla, eNPS y pipeline de reclutamiento, más la actividad reciente.',
      actions: ['Ver dotación de 12 meses y distribución por área', 'Revisar ingresos, egresos y rotación', 'Seguir el ausentismo y el costo empresa mensual', 'Ver la evolución del eNPS y el pipeline de candidatos', 'Revisar la actividad reciente del sistema']
    },
    {
      id: 'colaboradores', section: 'admin', login: U.admin, title: 'Colaboradores', url: 'admin.html#/colaboradores', waitFor: '.admin-content table',
      description: 'Nómina completa con RUT, área, contrato, sueldo base y estado. Incluye a las personas desvinculadas.',
      actions: ['Buscar y filtrar por área, estado y tipo de contrato', 'Crear y editar fichas', 'Registrar una desvinculación', 'Abrir la ficha completa', 'Exportar a CSV']
    },
    {
      id: 'colaborador-ficha', section: 'admin', login: U.admin, title: 'Ficha del colaborador', url: 'admin.html#/colaboradores/e1', waitFor: '.admin-content .kv',
      description: 'Vista 360° de una persona: datos personales, contrato, previsión, saldo de vacaciones, liquidaciones, solicitudes y documentos.',
      actions: ['Ver datos personales, contrato y jornada', 'Revisar el saldo de vacaciones', 'Abrir sus liquidaciones', 'Ver sus solicitudes y documentos firmados o pendientes', 'Editar o desvincular']
    },
    {
      id: 'colaborador-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo colaborador"', title: 'Nuevo colaborador', url: 'admin.html#/colaboradores', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-act="new"]'); await h.modal(); },
      description: 'Formulario de alta con datos personales, contrato y remuneración y previsión, en tres bloques.',
      actions: ['Ingresar nombre, RUT, nacimiento y contacto', 'Definir cargo, área, jefatura, lugar y jornada', 'Elegir tipo de contrato y fechas', 'Fijar sueldo base, AFP, salud y plan Isapre', 'Registrar banco y contacto de emergencia']
    },
    {
      id: 'colaborador-desvincular', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Desvincular" en Colaboradores', title: 'Desvincular colaborador', url: 'admin.html#/colaboradores', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-act="exit"]'); await h.modal(); },
      description: 'Registro del egreso de una persona con fecha de término, causal y observaciones.',
      actions: ['Indicar la fecha de término', 'Elegir la causal legal', 'Dejar observaciones', 'Pasar a la persona a desvinculados']
    },
    {
      id: 'estructura', section: 'admin', login: U.admin, title: 'Estructura organizacional', url: 'admin.html#/organizacion', waitFor: '.org-tree',
      description: 'Organigrama por áreas con su jefatura y dotación, y la tabla de áreas con centro de costo.',
      actions: ['Ver el organigrama por niveles', 'Crear, editar y eliminar áreas', 'Asignar jefatura y área superior', 'Revisar dotación y centro de costo por área']
    },
    {
      id: 'admin-solicitudes', section: 'admin', login: U.admin, title: 'Vacaciones y permisos', url: 'admin.html#/solicitudes', waitFor: '.tabs',
      description: 'Todas las solicitudes de la empresa con su estado. RRHH puede aprobar o rechazar en reemplazo de la jefatura.',
      actions: ['Filtrar por estado, tipo y área', 'Aprobar o rechazar solicitudes pendientes', 'Ver el aprobador y el comentario', 'Exportar a CSV']
    },
    {
      id: 'admin-ausencias', section: 'admin', login: U.admin, title: 'Calendario de ausencias', url: 'admin.html#/solicitudes', waitFor: '.tabs',
      setup: async h => { await h.click('[data-v="cal"]'); await h.wait('.admin-content [data-m]'); },
      description: 'Calendario mensual con las ausencias aprobadas y pendientes de toda la empresa.',
      actions: ['Navegar mes a mes', 'Ver quién está ausente cada día', 'Distinguir pendientes y licencias médicas']
    },
    {
      id: 'politicas', section: 'admin', login: U.admin, title: 'Políticas de vacaciones y permisos', url: 'admin.html#/politicas', waitFor: '.admin-content form',
      description: 'Parámetros que usan el cálculo de saldos y las validaciones del portal, basados en el Código del Trabajo.',
      actions: ['Definir días base y feriado progresivo', 'Fijar el máximo acumulable y la anticipación mínima', 'Elegir quién aprueba y si se permite medio día', 'Definir los días administrativos al año', 'Revisar los tipos de permiso y sus reglas']
    },
    {
      id: 'remuneraciones', section: 'admin', login: U.admin, title: 'Remuneraciones', url: 'admin.html#/remuneraciones', waitFor: '.admin-content table',
      description: 'Procesos mensuales de sueldos con el costo empresa por mes y las liquidaciones de cada periodo. Usa parámetros simulados de UF, UTM e ingreso mínimo.',
      actions: ['Procesar el mes siguiente', 'Revisar haberes, descuentos, líquido y costo empresa por persona', 'Marcar un proceso como pagado o reprocesarlo', 'Ver cada liquidación', 'Descargar el archivo Previred (simulado)']
    },
    {
      id: 'remuneraciones-procesar', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Procesar" en Remuneraciones', title: 'Procesar remuneraciones', url: 'admin.html#/remuneraciones', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-run]'); await h.modal(); },
      description: 'Previsualización del cálculo masivo del mes antes de emitir las liquidaciones, con totales y detalle por persona.',
      actions: ['Ajustar horas extra y bonos de cada persona', 'Ver el líquido estimado de cada liquidación', 'Emitir todas las liquidaciones de una vez', 'Notificar a cada colaborador en su portal']
    },
    {
      id: 'desempeno', section: 'admin', login: U.admin, title: 'Desempeño', url: 'admin.html#/desempeno', waitFor: '.tabs',
      description: 'Ciclos de evaluación con la distribución de resultados, el avance de las jefaturas por área y el estado de cada evaluación.',
      actions: ['Crear un ciclo con sus competencias', 'Ver la distribución de resultados', 'Seguir el avance por área', 'Enviar recordatorios a quienes faltan', 'Cerrar el ciclo y calcular resultados finales']
    },
    {
      id: 'encuestas', section: 'admin', login: U.admin, title: 'Encuestas eNPS', url: 'admin.html#/encuestas', waitFor: '.admin-content table',
      description: 'Encuestas de clima con la evolución del eNPS. Las respuestas llegan anónimas desde el portal del colaborador.',
      actions: ['Crear una encuesta con su pregunta', 'Abrir o cerrar encuestas', 'Ver respuestas y eNPS de cada una', 'Seguir la tendencia entre trimestres']
    },
    {
      id: 'encuesta-resultados', section: 'admin', login: U.admin, title: 'Resultados de encuesta', url: 'admin.html#/encuestas/s4', waitFor: '.admin-content .card',
      description: 'Resultados de una encuesta eNPS: promotores, pasivos y detractores, distribución de puntajes, eNPS por área y comentarios anónimos.',
      actions: ['Ver el eNPS y sus segmentos', 'Revisar la distribución de 0 a 10', 'Comparar el eNPS por área (con resguardo de anonimato)', 'Leer los comentarios']
    },
    {
      id: 'admin-comunicados', section: 'admin', login: U.admin, title: 'Comunicados', url: 'admin.html#/anuncios', waitFor: '.admin-content table',
      description: 'Gestión de los comunicados internos que se muestran al instante en el portal del colaborador.',
      actions: ['Crear, editar y eliminar comunicados', 'Fijar los importantes arriba', 'Publicar o dejar en borrador', 'Filtrar por categoría']
    },
    {
      id: 'comunicado-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo comunicado"', title: 'Nuevo comunicado', url: 'admin.html#/anuncios', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-act="new"]'); await h.modal(); },
      description: 'Formulario para redactar un comunicado interno con su categoría y opciones de publicación.',
      actions: ['Escribir título y cuerpo', 'Elegir la categoría', 'Fijarlo y publicarlo', 'Notificar a todos los colaboradores']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de acceso con su rol, persona vinculada y estado. Define quién entra al panel y quién solo al portal.',
      actions: ['Crear usuarios con contraseña', 'Cambiar el rol (Admin RRHH, Reclutador, Jefatura, Empleado)', 'Vincular la cuenta a la ficha de un colaborador', 'Activar o desactivar el acceso']
    },
    {
      id: 'ajustes', section: 'admin', login: U.admin, title: 'Sitio de empleos (CMS)', url: 'admin.html#/ajustes', waitFor: '.reset-box',
      description: 'Textos del sitio público de empleos que se publican al instante, y la opción de restablecer los datos de demostración.',
      actions: ['Editar título y bajada de la portada', 'Editar quiénes somos, valores y beneficios', 'Cambiar el correo de contacto', 'Abrir el sitio para revisar', 'Restablecer los datos demo']
    },
    {
      id: 'bitacora', section: 'admin', login: U.admin, title: 'Bitácora de actividad', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      // La semilla parte con la bitácora vacía: se generan algunas acciones reales antes de capturar.
      setup: async h => {
        await switchTo(h, U.empleado);
        await h.goto('portal.html#/documentos', '.doc-row'); await h.click('[data-cert="renta"]', { after: 400 });
        const sign = h.page.locator('[data-sign]'); if (await sign.count()) await h.click('[data-sign]', { after: 400 });
        await switchTo(h, U.jefatura);
        await h.goto('portal.html#/equipo', '.tabs'); await h.click('[data-ok]', { after: 400 });
        await switchTo(h, U.admin);
        await h.goto('admin.html#/bitacora', '.admin-content table');
      },
      description: 'Registro de las últimas 300 acciones hechas en el sitio de empleos, el portal y el panel.',
      actions: ['Ver quién hizo qué y cuándo', 'Buscar y filtrar por tipo de acción', 'Exportar a CSV']
    }
  ]
};
