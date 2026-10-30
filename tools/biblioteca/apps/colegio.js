// Biblioteca de vistas del Colegio Los Aromos · plataforma Aula360 (/colegio).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', utp: 'u-utp', profe: 't1', apoderado: 'g-demo', estudiante: 'u-est' };
const AU = ['Dirección', 'Jefe/a UTP'];
const firstRow = '.admin-content tbody tr.clickable >> nth=0';
// Abre la primera fila de una tabla con detalle y devuelve la URL a la que llegó.
const openFirst = (sel = firstRow) => async h => { await h.click(sel + ' >> td >> nth=1', { after: 400 }); await h.wait('.admin-content .page-head'); return { url: h.here() }; };

module.exports = {
  dir: 'colegio',
  name: 'Colegio Los Aromos · Aula360',
  kind: 'Colegio',
  theme: 'candy',
  description: 'Colegio particular subvencionado con sitio institucional (proyecto educativo, noticias, calendario y admisión en línea) y la plataforma Aula360 con apps para Dirección/UTP, profesores, apoderados y estudiantes.',
  accounts: {
    'u-admin': { name: 'Patricia Morales', role: 'Dirección', email: 'direccion@losaromos.cl', password: 'admin123' },
    'u-utp': { name: 'Rodrigo Silva', role: 'Jefe/a UTP', email: 'utp@losaromos.cl', password: 'utp123' },
    't1': { name: 'Camila Fuentes', role: 'Profesor/a', email: 'cfuentes@losaromos.cl', password: 'profe123' },
    'g-demo': { name: 'Andrea Rojas', role: 'Apoderado/a', email: 'andrea.rojas@correo.cl', password: 'apoderado123' },
    'u-est': { name: 'Martina Rojas', role: 'Estudiante', email: 'martina.rojas@alumnos.losaromos.cl', password: 'alumno123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier familia o visitante, sin iniciar sesión.' },
    { id: 'direccion', label: 'Dirección', desc: 'Panel de gestión del colegio: académico, comunidad, sitio web y administración.' },
    { id: 'utp', label: 'Jefe/a UTP', desc: 'El mismo panel, limitado a lo académico y a la comunidad.' },
    { id: 'profesor', label: 'Profesor/a', desc: 'App docente: libro de clases, notas, tareas, anotaciones y comunicación con apoderados.' },
    { id: 'apoderado', label: 'Apoderado/a', desc: 'App de la familia: seguimiento del pupilo, comunicados, entrevistas, pagos y mensajes.' },
    { id: 'estudiante', label: 'Estudiante', desc: 'App del alumno: horario, tareas con entrega, notas y asistencia.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Candy" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
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
      description: 'Página de inicio del colegio con el mensaje principal, cifras de la comunidad, niveles, últimas noticias, próximos eventos y el estado de la admisión. Los textos y avisos se editan desde el panel.',
      actions: ['Ir a la admisión o al proyecto educativo', 'Ver años de historia, estudiantes, docentes y alumnos por curso', 'Revisar las 3 noticias más recientes', 'Ver los próximos eventos del calendario', 'Postular en línea o consultar el estado de una postulación']
    },
    {
      id: 'proyecto', section: 'publico', title: 'Proyecto educativo', url: 'index.html#/proyecto', waitFor: '.page-hero',
      description: 'Misión, visión, sellos institucionales, historia del colegio y equipo directivo. La misión, la visión y los sellos se administran desde la configuración del sitio.',
      actions: ['Leer la misión y la visión', 'Conocer los sellos del colegio', 'Recorrer la línea de tiempo de la historia', 'Ver quiénes integran el equipo directivo']
    },
    {
      id: 'niveles', section: 'publico', title: 'Niveles', url: 'index.html#/niveles', waitFor: '.page-hero',
      description: 'Educación Parvularia, Básica y Media con su enfoque, destacados y los cursos del año, más el horario de la jornada.',
      actions: ['Ver el enfoque de cada nivel', 'Revisar talleres y programas destacados', 'Ver los cursos que existen este año en cada nivel', 'Consultar el horario de ingreso, clases y talleres']
    },
    {
      id: 'noticias', section: 'publico', title: 'Noticias', url: 'index.html#/noticias', waitFor: '.news-card',
      description: 'Listado de noticias publicadas por el colegio, de la más reciente a la más antigua.',
      actions: ['Filtrar por categoría', 'Buscar por texto en título y bajada', 'Abrir una noticia completa']
    },
    {
      id: 'noticia', section: 'publico', title: 'Detalle de noticia', url: 'index.html#/noticias', waitFor: '.news-card',
      setup: async h => { await h.click('.news-card >> nth=0'); await h.wait('.article'); return { url: h.here() }; },
      description: 'Artículo completo con categoría, fecha, autor y cuerpo, seguido de otras noticias. Cada lectura suma una visita que se ve en el panel.',
      actions: ['Leer la noticia completa', 'Ver fecha, autor y categoría', 'Seguir con otras noticias recientes', 'Volver al listado']
    },
    {
      id: 'calendario', section: 'publico', title: 'Calendario de eventos', url: 'index.html#/calendario', waitFor: '.cal', mobile: true,
      description: 'Calendario mensual con los eventos públicos del colegio, coloreados por tipo, y la lista de actividades del mes.',
      actions: ['Moverse entre meses', 'Distinguir eventos académicos, extraprogramáticos, reuniones y feriados', 'Hacer clic en un día para ver el detalle de sus eventos', 'Revisar la lista de eventos del mes']
    },
    {
      id: 'admision', section: 'publico', title: 'Admisión', url: 'index.html#/admision', waitFor: '.steps',
      description: 'Página del proceso de admisión con los 4 pasos, vacantes por curso y aranceles. Las vacantes y montos se actualizan desde el panel.',
      actions: ['Conocer las etapas del proceso', 'Ver las vacantes disponibles por curso', 'Revisar matrícula, mensualidad y becas', 'Postular en línea o consultar el estado']
    },
    {
      id: 'postular', section: 'publico', title: 'Postulación en línea', url: 'index.html#/admision/postular', waitFor: '#wiz', mobile: true,
      description: 'Formulario de postulación en 3 pasos (estudiante, apoderado y confirmación). Valida el RUT y advierte si el curso no tiene vacantes.',
      actions: ['Ingresar nombre, RUT y fecha de nacimiento del estudiante', 'Elegir el curso al que postula y el colegio de origen', 'Indicar si tiene hermanos en el colegio', 'Dejar los datos de contacto del apoderado', 'Revisar todo antes de enviar']
    },
    {
      id: 'postular-enviada', section: 'publico', title: 'Postulación enviada', url: 'index.html#/admision/postular', waitFor: '#wiz',
      setup: async h => {
        await h.fill('#a-name', 'Sofía Herrera Campos'); await h.fill('#a-rut', '25.432.198-7'); await h.fill('#a-birth', '2019-03-12'); await h.fill('#a-prev', 'Jardín Los Peumos');
        await h.click('#wiz button[type="submit"]'); await h.wait('#a-gname');
        await h.fill('#a-gname', 'Daniela Campos Ruiz'); await h.fill('#a-email', 'daniela.campos@demo.cl'); await h.fill('#a-phone', '+56 9 6123 4567');
        await h.click('#wiz button[type="submit"]'); await h.check('#wiz input[name="accept"]');
        await h.click('#wiz button[type="submit"]'); await h.wait('[data-code]');
      },
      description: 'Confirmación con el código de seguimiento de la postulación. La postulación entra al módulo de Admisión del panel con estado "Recibida".',
      actions: ['Ver el código de seguimiento', 'Ir directo al estado de la postulación', 'Guardar el código junto al RUT para consultas futuras']
    },
    {
      id: 'estado-postulacion', section: 'publico', title: 'Estado de postulación', url: 'index.html#/admision/estado', waitFor: '#lookup',
      setup: async h => {
        const code = await h.page.evaluate(() => (document.querySelector('#lookup .small.muted').textContent.match(/ADM-\d+-\d+/) || [])[0]);
        await h.fill('#l-code', code); await h.fill('#l-rut', '26.123.456-0'); await h.click('#lookup button[type="submit"]'); await h.wait('[data-status]');
      },
      description: 'Consulta pública con código y RUT del estudiante. Muestra el estado actual, la fecha de la entrevista familiar si corresponde y el historial de etapas.',
      actions: ['Consultar con el código y el RUT', 'Ver en qué etapa está la postulación', 'Ver la fecha y hora de la entrevista agendada', 'Revisar el historial con fechas y notas']
    },
    {
      id: 'contacto', section: 'publico', title: 'Contacto', url: 'index.html#/contacto', waitFor: '#contact-form',
      description: 'Formulario de contacto con dirección, teléfono, correo y horario del colegio. Los mensajes llegan a la bandeja "Mensajes web" del panel.',
      actions: ['Escribir nombre, correo y mensaje', 'Elegir el asunto (admisión, certificados, visita, etc.)', 'Ver dirección, teléfono y horario de atención']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso a Aula360', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso único a la plataforma. Cada perfil entra a su propia app; incluye cuentas de demostración para entrar con un clic.',
      actions: ['Ingresar con correo institucional y contraseña', 'Entrar con un clic como Dirección, UTP, profesora, apoderada o estudiante', 'Continuar o cerrar una sesión activa', 'Volver al sitio del colegio']
    },

    // ================= Dirección =================
    {
      id: 'dir-resumen', section: 'direccion', login: U.admin, roles: AU, title: 'Resumen académico', url: 'admin.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Inicio del panel con indicadores del colegio: asistencia mensual, promedio por curso, estudiantes en riesgo académico, embudo de admisión, anotaciones del año y próximas evaluaciones.',
      actions: ['Ver asistencia y promedio general del colegio', 'Detectar estudiantes en riesgo y abrir su ficha', 'Seguir el embudo de admisión', 'Revisar próximas evaluaciones y actividad reciente']
    },
    {
      id: 'dir-cursos', section: 'direccion', login: U.admin, roles: AU, title: 'Cursos', url: 'admin.html#/cursos', waitFor: '.admin-content table',
      description: 'Listado de cursos del año con nivel, profesor jefe, matrícula y promedio.',
      actions: ['Crear, editar o eliminar cursos', 'Filtrar por nivel y buscar', 'Abrir el detalle de un curso', 'Exportar a CSV']
    },
    {
      id: 'dir-curso-nuevo', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Nuevo curso" en Cursos', title: 'Nuevo curso', url: 'admin.html#/cursos', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario para crear o editar un curso.',
      actions: ['Definir nombre y nivel', 'Asignar sala y capacidad', 'Elegir al profesor o profesora jefe']
    },
    {
      id: 'dir-curso-detalle', section: 'direccion', login: U.admin, roles: AU, title: 'Detalle de curso: nómina', url: 'admin.html#/cursos/8b-a', waitFor: '.admin-content .kpi-row',
      description: 'Ficha del curso con matrícula, promedio, asistencia y estudiantes en riesgo, más la nómina con promedio, asistencia y nivel de riesgo de cada alumno.',
      actions: ['Ver los indicadores del curso', 'Revisar la nómina y abrir la ficha de un estudiante', 'Ir al informe de notas del curso', 'Editar los datos del curso']
    },
    {
      id: 'dir-curso-asignaturas', section: 'direccion', login: U.admin, roles: AU, title: 'Detalle de curso: asignaturas y docentes', url: 'admin.html#/cursos/8b-a', waitFor: '.admin-content .kpi-row',
      setup: async h => { await h.click('[data-tab="asignaturas"]'); },
      description: 'Pestaña del curso con las asignaturas del plan y el docente a cargo de cada una.',
      actions: ['Cambiar el docente de una asignatura', 'Agregar asignaturas al curso', 'Quitar una asignatura', 'Ver el horario del curso en otra pestaña']
    },
    {
      id: 'dir-asignaturas', section: 'direccion', login: U.admin, roles: AU, title: 'Asignaturas', url: 'admin.html#/asignaturas', waitFor: '.admin-content table',
      description: 'Plan de estudios del colegio con código, horas semanales sugeridas, cursos y docentes de cada asignatura.',
      actions: ['Crear, editar o eliminar asignaturas', 'Definir horas semanales sugeridas', 'Activar o desactivar una asignatura', 'Exportar a CSV']
    },
    {
      id: 'dir-docentes', section: 'direccion', login: U.admin, roles: AU, title: 'Docentes', url: 'admin.html#/docentes', waitFor: '.admin-content table',
      description: 'Planta docente con especialidades, cursos, bloques semanales y jefatura.',
      actions: ['Agregar o editar docentes', 'Filtrar por estado y especialidad', 'Ver la carga horaria de cada uno', 'Abrir la ficha del docente']
    },
    {
      id: 'dir-docente-detalle', section: 'direccion', login: U.admin, roles: AU, title: 'Ficha de docente', url: 'admin.html#/docentes/t1', waitFor: '.admin-content .page-head',
      description: 'Ficha de un docente con sus asignaciones curso/asignatura, datos de contacto y horario semanal.',
      actions: ['Ver los cursos y asignaturas a cargo', 'Reasignar una asignatura a otro docente', 'Revisar su horario semanal', 'Editar sus datos']
    },
    {
      id: 'dir-docente-editar', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Nuevo docente" en Docentes', title: 'Nuevo docente', url: 'admin.html#/docentes', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de alta o edición de un docente, que crea también su cuenta de acceso a la app del profesor.',
      actions: ['Ingresar nombre, correo y cargo', 'Marcar sus especialidades', 'Activar o desactivar la cuenta']
    },
    {
      id: 'dir-horarios', section: 'direccion', login: U.admin, roles: AU, title: 'Constructor de horarios', url: 'admin.html#/horarios', waitFor: '.admin-content [data-cell]', mobile: true,
      description: 'Grilla semanal por curso para asignar asignatura y docente a cada bloque. Detecta y marca en rojo los choques de un docente en dos cursos a la vez.',
      actions: ['Elegir el curso a editar', 'Asignar asignatura y docente a un bloque', 'Ver la carga asignada versus las horas del plan', 'Revisar los choques de horario', 'Vaciar el curso o exportar a CSV']
    },
    {
      id: 'dir-horario-bloque', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Clic en un bloque del constructor de horarios', title: 'Editar bloque de horario', url: 'admin.html#/horarios', waitFor: '.admin-content [data-cell]',
      setup: async h => { await h.click('.admin-content [data-cell="1|2"]'); await h.modal(); },
      description: 'Ventana para definir la asignatura y el docente de un bloque. Avisa si el docente ya está ocupado en otro curso a esa hora.',
      actions: ['Elegir la asignatura del bloque', 'Elegir el docente y ver si está ocupado', 'Guardar o dejar el bloque libre']
    },
    {
      id: 'dir-evaluaciones', section: 'direccion', login: U.admin, roles: AU, title: 'Calendario de evaluaciones', url: 'admin.html#/evaluaciones', waitFor: '.admin-content table',
      description: 'Vista mensual de las evaluaciones de todos los cursos y listado con ponderación y estado. Indica las que tienen notas pendientes de ingreso.',
      actions: ['Moverse entre meses en el calendario', 'Programar, editar o eliminar evaluaciones', 'Filtrar por estado, semestre y asignatura', 'Exportar a CSV']
    },
    {
      id: 'dir-evaluacion-nueva', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Programar evaluación"', title: 'Programar evaluación', url: 'admin.html#/evaluaciones', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario para agendar una evaluación en un curso y asignatura.',
      actions: ['Elegir curso, asignatura y docente', 'Poner nombre, fecha y semestre', 'Definir la ponderación en el promedio']
    },
    {
      id: 'dir-informes', section: 'direccion', login: U.admin, roles: AU, title: 'Informes de notas', url: 'admin.html#/informes', waitFor: '.admin-content table',
      description: 'Sábana de notas por curso con el promedio de cada asignatura, promedio general y asistencia de cada estudiante.',
      actions: ['Elegir curso y semestre', 'Ver la sábana completa del curso', 'Abrir el informe individual de un estudiante', 'Imprimir los informes de todo el curso', 'Exportar a CSV']
    },
    {
      id: 'dir-informe-vista', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Informe" en la sábana de notas', title: 'Vista previa del informe de notas', url: 'admin.html#/informes', waitFor: '.admin-content [data-rc]',
      setup: async h => { await h.click('.admin-content [data-rc] >> nth=0'); await h.modal(); },
      description: 'Informe de notas individual listo para entregar a la familia, con notas por asignatura, promedios y asistencia.',
      actions: ['Revisar el informe antes de imprimir', 'Ver promedios por asignatura y asistencia', 'Imprimir o guardar en PDF']
    },
    {
      id: 'dir-estudiantes', section: 'direccion', login: U.admin, roles: AU, title: 'Estudiantes', url: 'admin.html#/estudiantes', waitFor: '.admin-content table',
      description: 'Listado de estudiantes con curso, promedio, asistencia, nivel de riesgo y estado.',
      actions: ['Matricular, editar o retirar estudiantes', 'Filtrar por curso, estado y riesgo', 'Buscar por nombre o RUT', 'Abrir la ficha del estudiante', 'Exportar a CSV']
    },
    {
      id: 'dir-matricular', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Matricular" en Estudiantes', title: 'Matricular estudiante', url: 'admin.html#/estudiantes', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Ficha de matrícula de un estudiante nuevo o edición de uno existente.',
      actions: ['Ingresar nombre, RUT y fecha de nacimiento', 'Asignar el curso', 'Vincular al apoderado', 'Marcar si pertenece al Programa de Integración (PIE)']
    },
    {
      id: 'dir-estudiante-notas', section: 'direccion', login: U.admin, roles: AU, title: 'Ficha de estudiante: notas', url: 'admin.html#/estudiantes', waitFor: '.admin-content table',
      setup: openFirst(),
      description: 'Ficha completa del estudiante con pestañas de notas, asistencia, anotaciones, tareas, pagos y datos personales. Se abre en notas por semestre.',
      actions: ['Ver las notas por asignatura y semestre', 'Cambiar a asistencia, anotaciones, tareas o pagos', 'Imprimir su informe de notas', 'Editar la ficha']
    },
    {
      id: 'dir-estudiante-anotaciones', section: 'direccion', login: U.admin, roles: AU, title: 'Ficha de estudiante: hoja de vida', url: 'admin.html#/estudiantes', waitFor: '.admin-content table',
      setup: async h => { const r = await openFirst()(h); await h.click('[data-tab="anotaciones"]'); return r; },
      description: 'Pestaña de anotaciones de la ficha: registro positivo, negativo y de observaciones a lo largo del año.',
      actions: ['Revisar las anotaciones del estudiante', 'Registrar una anotación nueva', 'Ver si el apoderado ya la vio']
    },
    {
      id: 'dir-anotacion', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Registrar anotación" en la hoja de vida', title: 'Registrar anotación', url: 'admin.html#/estudiantes', waitFor: '.admin-content table',
      setup: async h => { const r = await openFirst()(h); await h.click('[data-tab="anotaciones"]'); await h.click('[data-ann]'); await h.modal(); return r; },
      description: 'Formulario para dejar una anotación en la hoja de vida. El apoderado la recibe en su app.',
      actions: ['Elegir el tipo: positiva, negativa u observación', 'Indicar la asignatura', 'Escribir la descripción']
    },
    {
      id: 'dir-apoderados', section: 'direccion', login: U.admin, roles: AU, title: 'Apoderados', url: 'admin.html#/apoderados', waitFor: '.admin-content table',
      description: 'Familias registradas con sus pupilos, teléfono, estado de pagos y cuenta de acceso.',
      actions: ['Agregar o editar apoderados', 'Filtrar por curso del pupilo y estado de pagos', 'Activar o desactivar la cuenta', 'Abrir la ficha de la familia']
    },
    {
      id: 'dir-apoderado-detalle', section: 'direccion', login: U.admin, roles: AU, title: 'Ficha de apoderado', url: 'admin.html#/apoderados/g-demo', waitFor: '.admin-content .page-head',
      description: 'Ficha de una familia con sus pupilos, comunicados recibidos y su acuse, entrevistas y mensualidades.',
      actions: ['Ver los pupilos y abrir su ficha', 'Revisar qué comunicados leyó', 'Ver entrevistas solicitadas', 'Revisar el estado de sus mensualidades']
    },
    {
      id: 'dir-admision', section: 'direccion', login: U.admin, roles: AU, title: 'Admisión', url: 'admin.html#/admision', waitFor: '.admin-content table',
      description: 'Postulaciones del proceso de admisión con filtros por estado y gráfico de postulaciones por curso. Incluye las que llegan desde el sitio.',
      actions: ['Filtrar por estado (recibida, revisión, entrevista, aceptada, etc.)', 'Ver postulaciones por curso', 'Abrir una postulación', 'Exportar a CSV']
    },
    {
      id: 'dir-admision-detalle', section: 'direccion', login: U.admin, roles: AU, title: 'Detalle de postulación', url: 'admin.html#/admision', waitFor: '.admin-content table',
      setup: openFirst(),
      description: 'Postulación con antecedentes del estudiante y apoderado, evaluación, acciones de cambio de estado e historial. Cada cambio se refleja en la consulta pública.',
      actions: ['Revisar antecedentes y puntaje', 'Avanzar la postulación de estado', 'Agendar la entrevista familiar', 'Formalizar la matrícula de un aceptado', 'Ver el historial']
    },
    {
      id: 'dir-admision-entrevista', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Acción "Entrevista" en el detalle de una postulación', title: 'Agendar entrevista familiar', url: 'admin.html#/admision', waitFor: '.admin-content table',
      setup: async h => {
        await h.click('.admin-content [data-st="revision"]');
        const r = await openFirst()(h); await h.click('.admin-content [data-to="entrevista"]'); await h.modal(); return r;
      },
      description: 'Ventana para fijar fecha y hora de la entrevista con la familia. La cita aparece en la consulta de estado del sitio.',
      actions: ['Elegir fecha y hora', 'Confirmar la entrevista', 'Pasar la postulación a la etapa "Entrevista"']
    },
    {
      id: 'dir-comunicados', section: 'direccion', login: U.admin, roles: AU, title: 'Comunicados', url: 'admin.html#/comunicados', waitFor: '.admin-content table',
      description: 'Mensajes masivos a las familias, por colegio, nivel o curso, con control de acuse de recibo.',
      actions: ['Redactar, publicar o editar comunicados', 'Ver cuántas familias confirmaron la lectura', 'Enviar recordatorio a quienes no han leído', 'Exportar a CSV']
    },
    {
      id: 'dir-comunicado-nuevo', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Nuevo comunicado"', title: 'Nuevo comunicado', url: 'admin.html#/comunicados', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Editor de comunicado con destinatarios y opción de exigir confirmación de lectura.',
      actions: ['Escribir título y mensaje', 'Elegir destinatarios: todo el colegio, un nivel o un curso', 'Pedir acuse de recibo', 'Guardar borrador o publicar y enviar']
    },
    {
      id: 'dir-comunicado-acuses', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Acuses" de un comunicado publicado', title: 'Acuses de recibo', url: 'admin.html#/comunicados', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-act="reads"] >> nth=0'); await h.modal(); await h.page.evaluate(() => { document.querySelectorAll('.modal-backdrop, .modal, .modal-body').forEach(e => { e.scrollTop = 0; }); }); },
      description: 'Lista de familias destinatarias de un comunicado con quién confirmó la lectura y cuándo.',
      actions: ['Ver el porcentaje de lectura', 'Identificar a las familias que no han leído', 'Enviarles un recordatorio']
    },
    {
      id: 'dir-contenido', section: 'direccion', login: U.admin, roles: AU, title: 'Noticias y eventos', url: 'admin.html#/contenido', waitFor: '.admin-content table',
      description: 'CMS de las noticias del sitio, con categoría, fecha, visitas y estado de publicación. Lo que se publica aparece al instante en el sitio.',
      actions: ['Crear, editar o eliminar noticias', 'Publicar o despublicar', 'Ver las visitas de cada noticia', 'Cambiar a la pestaña de eventos', 'Exportar a CSV']
    },
    {
      id: 'dir-noticia-editar', section: 'direccion', login: U.admin, roles: AU, kind: 'modal', from: 'Botón "Nueva" en Noticias y eventos', title: 'Editar noticia', url: 'admin.html#/contenido', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de noticia del sitio público.',
      actions: ['Escribir título, bajada y cuerpo', 'Elegir la categoría y fecha', 'Marcarla como publicada en el sitio']
    },
    {
      id: 'dir-eventos', section: 'direccion', login: U.admin, roles: AU, title: 'Eventos del calendario', url: 'admin.html#/contenido', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-tab="events"]'); },
      description: 'Pestaña de eventos con tipo, lugar y si se muestran en el calendario público del sitio.',
      actions: ['Crear, editar o eliminar eventos', 'Definir tipo, fecha y lugar', 'Decidir si el evento es público', 'Exportar a CSV']
    },
    {
      id: 'dir-mensajes-web', section: 'direccion', login: U.admin, title: 'Mensajes web', url: 'admin.html#/contacto', waitFor: '.admin-content table',
      description: 'Bandeja de los mensajes enviados desde el formulario de contacto del sitio, con estado nuevo o leído. Solo la ve Dirección.',
      actions: ['Leer los mensajes recibidos', 'Responder por correo', 'Eliminar mensajes', 'Exportar a CSV']
    },
    {
      id: 'dir-mensaje-web', section: 'direccion', login: U.admin, kind: 'modal', from: 'Clic en un mensaje de la bandeja', title: 'Mensaje de contacto', url: 'admin.html#/contacto', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Detalle de un mensaje de contacto con remitente, asunto y texto. Al abrirlo queda marcado como leído.',
      actions: ['Leer el mensaje completo', 'Responder por correo', 'Cerrar y volver a la bandeja']
    },
    {
      id: 'dir-configuracion', section: 'direccion', login: U.admin, title: 'Configuración del sitio', url: 'admin.html#/sitio', waitFor: '.admin-content .page-head',
      description: 'Textos de la portada, proyecto educativo, datos de contacto, proceso de admisión, vacantes y aranceles. Los cambios se publican al instante en el sitio.',
      actions: ['Editar el título, bajada y aviso de la portada', 'Editar misión, visión y sellos', 'Actualizar dirección, teléfono y horario', 'Abrir o cerrar la admisión y fijar vacantes y aranceles', 'Restablecer los datos de demostración']
    },
    {
      id: 'dir-mensualidades', section: 'direccion', login: U.admin, title: 'Mensualidades', url: 'admin.html#/pagos', waitFor: '.admin-content table', mobile: true,
      description: 'Recaudación del año con gráfico mensual, morosidad y la lista de cuotas por apoderado y estudiante.',
      actions: ['Ver la recaudación por mes', 'Filtrar por estado (pagada, pendiente, vencida)', 'Registrar un pago manual o anularlo', 'Enviar recordatorio a los morosos', 'Exportar a CSV']
    },
    {
      id: 'dir-registrar-pago', section: 'direccion', login: U.admin, kind: 'modal', from: 'Botón "Registrar pago" en una cuota', title: 'Registrar pago', url: 'admin.html#/pagos', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-act="pay"] >> nth=0'); await h.modal(); },
      description: 'Registro manual de un pago hecho en secretaría o por transferencia.',
      actions: ['Elegir el medio de pago', 'Anotar el número de comprobante', 'Dejar la cuota como pagada']
    },
    {
      id: 'dir-usuarios', section: 'direccion', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Todas las cuentas de la plataforma con su rol y último ingreso, más la matriz de permisos que define qué secciones del panel ve cada rol.',
      actions: ['Crear cuentas nuevas', 'Cambiar el rol o desactivar una cuenta', 'Consultar la matriz de permisos', 'Exportar a CSV']
    },
    {
      id: 'dir-usuario-editar', section: 'direccion', login: U.admin, kind: 'modal', from: 'Botón "Nueva cuenta" en Usuarios y roles', title: 'Nueva cuenta', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de cuenta de usuario.',
      actions: ['Ingresar nombre, correo y contraseña', 'Asignar el rol', 'Activar o desactivar el acceso']
    },
    {
      id: 'dir-bitacora', section: 'direccion', login: U.admin, title: 'Bitácora de actividad', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Registro de los últimos 300 eventos del sistema, hechos en el sitio, en el panel y en las apps de cada rol.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción y buscar', 'Exportar a CSV']
    },

    // ================= Jefe/a UTP =================
    {
      id: 'utp-resumen', section: 'utp', login: U.utp, roles: ['Jefe/a UTP'], title: 'Panel de UTP', url: 'admin.html#/', waitFor: '.admin-content .page-head',
      description: 'El jefe de UTP entra al mismo panel, pero su menú solo muestra el resumen, la gestión académica y la comunidad. No ve mensualidades, usuarios, configuración del sitio ni bitácora.',
      actions: ['Ver los indicadores académicos del colegio', 'Gestionar cursos, asignaturas, docentes y horarios', 'Programar evaluaciones e imprimir informes', 'Gestionar estudiantes, apoderados, admisión y comunicados']
    },
    {
      id: 'utp-acceso-restringido', section: 'utp', login: U.utp, roles: ['Jefe/a UTP'], title: 'Sección restringida', url: 'admin.html#/pagos', waitFor: '.admin-content .denied',
      description: 'Si UTP intenta abrir una sección reservada a Dirección (como Mensualidades), el panel muestra un aviso de acceso restringido en lugar del contenido.',
      actions: ['Ver qué secciones son solo de Dirección', 'Comprobar que el menú de UTP no las muestra', 'Volver a una sección permitida desde el menú']
    },

    // ================= Profesor/a =================
    {
      id: 'prof-inicio', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Inicio del profesor', url: 'profesor.html#/', waitFor: '.admin-content .kpi-row', mobile: true,
      description: 'Resumen del día: clases de hoy con su estado de registro, notas por ingresar, entregas por revisar, mensajes sin leer y solicitudes de entrevista.',
      actions: ['Ver las clases del día y abrirlas en el libro de clases', 'Revisar pendientes: notas, entrevistas y mensajes', 'Entrar a sus cursos', 'Ver las últimas anotaciones registradas']
    },
    {
      id: 'prof-cursos', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Mis cursos', url: 'profesor.html#/cursos', waitFor: '.admin-content .grid-auto .card',
      description: 'Tarjetas de los cursos donde hace clases, con nivel, sala, número de estudiantes y su promedio por asignatura. Marca el curso de su jefatura.',
      actions: ['Ver los cursos y asignaturas a cargo', 'Comparar promedios por asignatura', 'Abrir la nómina de un curso']
    },
    {
      id: 'prof-curso-detalle', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Nómina del curso', url: 'profesor.html#/cursos', waitFor: '.admin-content .grid-auto .card',
      setup: async h => { await h.click('.admin-content .grid-auto a.card >> nth=0'); await h.wait('.admin-content table'); return { url: h.here() }; },
      description: 'Nómina de un curso con promedio en sus asignaturas, promedio general y asistencia de cada estudiante.',
      actions: ['Revisar el rendimiento de cada estudiante', 'Ver la asistencia individual', 'Registrar una anotación desde la nómina']
    },
    {
      id: 'prof-libro', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Libro de clases', url: 'profesor.html#/libro', waitFor: '.admin-content [data-allp]', mobile: true,
      description: 'Libro de clases digital: asistencia por clase con un toque (presente, ausente, atrasado) y registro del contenido tratado, con el leccionario de clases anteriores.',
      actions: ['Elegir curso, asignatura, fecha y bloque', 'Marcar P / A / T por estudiante o todos presentes', 'Registrar el contenido de la clase', 'Revisar el leccionario']
    },
    {
      id: 'prof-notas', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Libro de notas', url: 'profesor.html#/notas', waitFor: '.admin-content table',
      description: 'Planilla de notas por curso, asignatura y semestre, con escala 1,0 a 7,0 y promedio ponderado en vivo. Avisa si las ponderaciones no suman 100 %.',
      actions: ['Elegir curso, asignatura y semestre', 'Ingresar o corregir notas', 'Ver promedios ponderados al instante', 'Crear evaluaciones nuevas', 'Exportar a CSV']
    },
    {
      id: 'prof-evaluacion-nueva', section: 'profesor', login: U.profe, roles: ['Profesor/a'], kind: 'modal', from: 'Botón "Evaluación" en el libro de notas', title: 'Nueva evaluación', url: 'profesor.html#/notas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario para agregar una evaluación a la planilla; queda también en el calendario de evaluaciones de Dirección.',
      actions: ['Poner nombre y fecha', 'Definir la ponderación', 'Elegir el semestre']
    },
    {
      id: 'prof-tareas', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Tareas', url: 'profesor.html#/tareas', waitFor: '.admin-content table',
      description: 'Tareas publicadas por el docente con curso, fecha de entrega, entregas recibidas y cuántas faltan por revisar.',
      actions: ['Publicar una tarea nueva', 'Editar o eliminar tareas', 'Ver cuántas entregas hay por revisar', 'Abrir una tarea para calificar']
    },
    {
      id: 'prof-tarea-nueva', section: 'profesor', login: U.profe, roles: ['Profesor/a'], kind: 'modal', from: 'Botón "Nueva tarea"', title: 'Nueva tarea', url: 'profesor.html#/tareas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario para publicar una tarea; aparece en la app de los estudiantes y apoderados del curso.',
      actions: ['Elegir curso y asignatura', 'Escribir título e instrucciones', 'Fijar fecha de entrega', 'Adjuntar un archivo (simulado)']
    },
    {
      id: 'prof-tarea-detalle', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Entregas de una tarea', url: 'profesor.html#/tareas', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1', { after: 400 }); await h.wait('.admin-content [data-save]'); return { url: h.here() }; },
      description: 'Detalle de una tarea con la lista de estudiantes del curso, quién entregó y cuándo, para calificar y dejar un comentario a cada uno.',
      actions: ['Ver quién entregó y quién no', 'Poner nota a cada entrega', 'Escribir retroalimentación', 'Guardar las calificaciones']
    },
    {
      id: 'prof-anotaciones', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Anotaciones', url: 'profesor.html#/anotaciones', waitFor: '.admin-content table',
      description: 'Anotaciones registradas por el docente con tipo, descripción y si el apoderado ya la vio.',
      actions: ['Registrar una anotación nueva', 'Filtrar por curso y tipo', 'Ver si la familia la leyó', 'Eliminar una anotación']
    },
    {
      id: 'prof-anotacion-nueva', section: 'profesor', login: U.profe, roles: ['Profesor/a'], kind: 'modal', from: 'Botón "Nueva anotación" (tras elegir al estudiante)', title: 'Nueva anotación', url: 'profesor.html#/anotaciones', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); await h.click('.modal [data-ok]', { after: 500 }); await h.modal(); },
      description: 'Dos pasos: primero se elige al estudiante entre los cursos del docente y luego se completa la anotación, que llega a la app del apoderado.',
      actions: ['Elegir al estudiante por curso', 'Definir el tipo de anotación', 'Escribir la descripción y registrarla']
    },
    {
      id: 'prof-mensajes', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Mensajes', url: 'profesor.html#/mensajes', waitFor: '.admin-content .chat',
      description: 'Mensajería directa con los apoderados de sus cursos, organizada en conversaciones con indicador de no leídos.',
      actions: ['Leer y responder conversaciones', 'Iniciar un mensaje nuevo a un apoderado', 'Ver archivos adjuntos (simulados)']
    },
    {
      id: 'prof-mensaje-nuevo', section: 'profesor', login: U.profe, roles: ['Profesor/a'], kind: 'modal', from: 'Botón "Nuevo" en Mensajes', title: 'Mensaje a apoderado/a', url: 'profesor.html#/mensajes', waitFor: '.admin-content .chat',
      setup: async h => { await h.click('.admin-content .chat [data-new]'); await h.modal(); },
      description: 'Ventana para iniciar una conversación nueva con el apoderado de un estudiante.',
      actions: ['Elegir el destinatario', 'Escribir asunto y mensaje', 'Enviar']
    },
    {
      id: 'prof-entrevistas', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Entrevistas', url: 'profesor.html#/entrevistas', waitFor: '.admin-content .page-head',
      description: 'Solicitudes de entrevista hechas por los apoderados, con fecha propuesta y motivo.',
      actions: ['Confirmar o rechazar con un mensaje', 'Marcar una entrevista como realizada', 'Ver el historial de entrevistas']
    },
    {
      id: 'prof-horario', section: 'profesor', login: U.profe, roles: ['Profesor/a'], title: 'Mi horario', url: 'profesor.html#/horario', waitFor: '.admin-content .page-head',
      description: 'Horario semanal del docente con los bloques asignados por UTP en el constructor de horarios.',
      actions: ['Ver sus bloques por día', 'Identificar curso y asignatura de cada bloque', 'Ver el horario de cada bloque']
    },

    // ================= Apoderado/a =================
    {
      id: 'apo-resumen', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Resumen del pupilo', url: 'apoderado.html#/', waitFor: '.admin-content .kpi-row', mobile: true,
      description: 'Inicio de la app del apoderado con promedio, asistencia, anotaciones nuevas y pagos pendientes del pupilo, más últimas notas, próximas evaluaciones y tareas. Avisa si hay comunicados por confirmar.',
      actions: ['Cambiar de pupilo si tiene más de uno', 'Ver promedio general y asistencia', 'Revisar últimas notas y próximas evaluaciones', 'Ver tareas pendientes', 'Ir a confirmar comunicados']
    },
    {
      id: 'apo-notas', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Notas', url: 'apoderado.html#/notas', waitFor: '.admin-content .page-head',
      description: 'Notas del pupilo por asignatura y semestre, con promedios y el detalle de cada evaluación.',
      actions: ['Elegir el semestre', 'Ver el promedio de cada asignatura', 'Revisar el detalle de evaluaciones']
    },
    {
      id: 'apo-asistencia', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Asistencia', url: 'apoderado.html#/asistencia', waitFor: '.admin-content .page-head',
      description: 'Porcentaje de asistencia por mes y registro reciente del libro de clases con ausencias y atrasos.',
      actions: ['Ver la asistencia mensual', 'Revisar ausencias y atrasos recientes', 'Controlar el mínimo de 85 %']
    },
    {
      id: 'apo-horario', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Horario', url: 'apoderado.html#/horario', waitFor: '.admin-content .page-head',
      description: 'Horario semanal del curso del pupilo.',
      actions: ['Ver las asignaturas de cada bloque', 'Saber qué docente dicta cada clase', 'Ver los horarios de inicio y término']
    },
    {
      id: 'apo-tareas', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Tareas', url: 'apoderado.html#/tareas', waitFor: '.admin-content .page-head',
      description: 'Tareas del curso del pupilo, separadas en por entregar y anteriores, con estado de entrega y nota.',
      actions: ['Ver tareas pendientes y su fecha de entrega', 'Revisar si fueron entregadas y su nota', 'Leer el comentario del profesor']
    },
    {
      id: 'apo-anotaciones', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Anotaciones', url: 'apoderado.html#/anotaciones', waitFor: '.admin-content .page-head',
      description: 'Hoja de vida del pupilo con anotaciones positivas, negativas y observaciones registradas por los profesores.',
      actions: ['Leer las anotaciones nuevas', 'Marcarlas como vistas (el profesor lo ve)', 'Revisar el historial del año']
    },
    {
      id: 'apo-comunicados', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Comunicados', url: 'apoderado.html#/comunicados', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Comunicados del colegio dirigidos a la familia, con los que requieren confirmación de lectura destacados.',
      actions: ['Leer los comunicados', 'Confirmar la lectura (el colegio recibe el acuse)', 'Ver cuáles están pendientes']
    },
    {
      id: 'apo-mensajes', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Mensajes', url: 'apoderado.html#/mensajes', waitFor: '.admin-content .chat',
      description: 'Conversaciones con los profesores de sus pupilos.',
      actions: ['Leer y responder mensajes', 'Escribir a un profesor', 'Ver mensajes no leídos']
    },
    {
      id: 'apo-entrevistas', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Entrevistas', url: 'apoderado.html#/entrevistas', waitFor: '.admin-content .page-head',
      description: 'Entrevistas solicitadas a los profesores, con su estado y la respuesta del docente.',
      actions: ['Solicitar una entrevista', 'Ver si fue confirmada o rechazada', 'Leer el mensaje del profesor']
    },
    {
      id: 'apo-entrevista-solicitar', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], kind: 'modal', from: 'Botón "Solicitar entrevista"', title: 'Solicitar entrevista', url: 'apoderado.html#/entrevistas', waitFor: '.admin-content .page-head',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de solicitud de entrevista que llega a la app del profesor elegido.',
      actions: ['Elegir al profesor jefe o de asignatura', 'Proponer fecha y horario', 'Escribir el motivo']
    },
    {
      id: 'apo-pagos', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], title: 'Pagos', url: 'apoderado.html#/pagos', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Mensualidades del año con su estado (pagada, pendiente o vencida), pago en línea y comprobantes.',
      actions: ['Ver las cuotas del año', 'Pagar una cuota o todas las pendientes', 'Descargar el comprobante de una cuota pagada']
    },
    {
      id: 'apo-pago-linea', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], kind: 'modal', from: 'Botón "Pagar" o "Pagar todo" en Pagos', title: 'Pago en línea', url: 'apoderado.html#/pagos', waitFor: '.admin-content [data-pay]',
      setup: async h => { await h.click('.admin-content [data-pay] >> nth=0'); await h.modal(); },
      description: 'Pago simulado de una o varias cuotas. Al pagar, la cuota queda al día también en el panel de Dirección.',
      actions: ['Revisar el monto a pagar', 'Elegir el medio de pago', 'Confirmar el pago']
    },
    {
      id: 'apo-comprobante', section: 'apoderado', login: U.apoderado, roles: ['Apoderado/a'], kind: 'modal', from: 'Botón "Comprobante" de una cuota pagada', title: 'Comprobante de pago', url: 'apoderado.html#/pagos', waitFor: '.admin-content [data-receipt]',
      setup: async h => { await h.click('.admin-content [data-receipt] >> nth=0'); await h.modal(); },
      description: 'Comprobante de una mensualidad pagada con concepto, fecha, medio de pago y monto.',
      actions: ['Ver el detalle del pago', 'Revisar medio de pago y fecha', 'Guardarlo como respaldo']
    },

    // ================= Estudiante =================
    {
      id: 'est-inicio', section: 'estudiante', login: U.estudiante, roles: ['Estudiante'], title: 'Inicio del estudiante', url: 'estudiante.html#/', waitFor: '.admin-content .kpi-row', mobile: true,
      description: 'Resumen personal con promedio, asistencia, anotaciones y tareas por entregar, más últimas notas, próximas evaluaciones y tareas pendientes.',
      actions: ['Ver su promedio y asistencia', 'Revisar próximas evaluaciones', 'Ver tareas pendientes', 'Ir a sus notas']
    },
    {
      id: 'est-horario', section: 'estudiante', login: U.estudiante, roles: ['Estudiante'], title: 'Mi horario', url: 'estudiante.html#/horario', waitFor: '.admin-content .page-head',
      description: 'Horario semanal de su curso.',
      actions: ['Ver las clases de cada día', 'Saber qué docente dicta cada bloque', 'Ver los horarios de inicio y término']
    },
    {
      id: 'est-tareas', section: 'estudiante', login: U.estudiante, roles: ['Estudiante'], title: 'Tareas', url: 'estudiante.html#/tareas', waitFor: '.admin-content .page-head',
      description: 'Tareas de su curso por entregar y anteriores, con botón de entrega y la nota y comentario del profesor cuando ya fueron revisadas.',
      actions: ['Ver tareas pendientes y su fecha límite', 'Entregar una tarea', 'Ver la nota y retroalimentación']
    },
    {
      id: 'est-entregar', section: 'estudiante', login: U.estudiante, roles: ['Estudiante'], kind: 'modal', from: 'Botón "Entregar tarea"', title: 'Entregar tarea', url: 'estudiante.html#/tareas', waitFor: '.admin-content [data-sub]',
      setup: async h => { await h.click('.admin-content [data-sub] >> nth=0'); await h.modal(); },
      description: 'Ventana de entrega con archivo (simulado) y comentario. La entrega aparece en la app del profesor para calificar.',
      actions: ['Adjuntar el archivo', 'Escribir un comentario', 'Confirmar la entrega']
    },
    {
      id: 'est-notas', section: 'estudiante', login: U.estudiante, roles: ['Estudiante'], title: 'Mis notas', url: 'estudiante.html#/notas', waitFor: '.admin-content .page-head',
      description: 'Notas por asignatura y semestre con el detalle de cada evaluación.',
      actions: ['Elegir el semestre', 'Ver promedios por asignatura', 'Revisar cada evaluación']
    },
    {
      id: 'est-asistencia', section: 'estudiante', login: U.estudiante, roles: ['Estudiante'], title: 'Asistencia', url: 'estudiante.html#/asistencia', waitFor: '.admin-content .page-head',
      description: 'Asistencia mensual y registro reciente de ausencias y atrasos.',
      actions: ['Ver su porcentaje por mes', 'Revisar ausencias y atrasos', 'Controlar el mínimo de 85 %']
    }
  ]
};
