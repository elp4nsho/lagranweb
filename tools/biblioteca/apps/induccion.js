// Biblioteca de vistas de Inducción XR · Minera Altiplano (/induccion): sitio público, app del trabajador
// con módulos 3D, panel del supervisor y panel de administración/prevención.
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', prev: 'u-prev', supervisor: 'u-sup', trabajador: 'u-cam', contratista: 'u-mat' };
const PANEL = ['Prevencionista', 'Administrador'];

// El reproductor carga Three.js desde un CDN; si no responde muestra la vista 2D equivalente.
// Se espera a que termine la carga (escena o vista 2D) antes de capturar.
const playerReady = async h => {
  await h.page.waitForFunction(() => { const l = document.querySelector('[data-loading]'); return l && l.hidden; }, null, { timeout: 15000 });
  await h.pause(400);
};

module.exports = {
  dir: 'induccion',
  name: 'Inducción XR · Minera Altiplano',
  kind: 'Plataforma de inducción de seguridad',
  theme: 'synthwave',
  description: 'Plataforma de inducción de seguridad para una minera con sitio público, app del trabajador con módulos 3D/VR, evaluación y certificado verificable, panel del supervisor para su equipo y panel de prevención con planes, módulos, banco de preguntas, asignaciones, evaluaciones prácticas y reportes.',
  accounts: {
    'u-admin': { name: 'Valentina Quispe', role: 'Administrador', email: 'admin@altiplano.cl', password: 'admin123' },
    'u-prev': { name: 'Rodrigo Mamani', role: 'Prevencionista', email: 'prevencion@altiplano.cl', password: 'prev123' },
    'u-sup': { name: 'Carolina Flores', role: 'Supervisor', email: 'supervisor@altiplano.cl', password: 'super123' },
    'u-cam': { name: 'Camila Rojas Soto', role: 'Trabajador', email: 'camila.rojas@altiplano.cl', password: '1234' },
    'u-mat': { name: 'Matías Soto Araya', role: 'Trabajador', email: 'msoto@montajescordillera.cl', password: '1234' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Presentación de la plataforma, ingreso y verificador público de certificados.' },
    { id: 'trabajador', label: 'Trabajador', desc: 'App donde cada persona hace sus inducciones, rinde la evaluación y descarga sus certificados.' },
    { id: 'supervisor', label: 'Supervisor', desc: 'Seguimiento de su equipo: avance, asignaciones, prácticas en terreno y vencimientos.' },
    { id: 'prevencion', label: 'Prevencionista', desc: 'Panel de contenidos y seguimiento: trabajadores, empresas, planes, módulos 3D, preguntas, evaluaciones y reportes.' },
    { id: 'admin', label: 'Administrador', desc: 'Lo anterior más usuarios y roles, sitio público y configuración.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Synthwave" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'blueprint', group: 'Estilo', label: 'Plano', desc: 'Estética de plano técnico.', theme: 'blueprint' },
      { id: 'brutal', group: 'Estilo', label: 'Brutal', desc: 'Bordes gruesos y contraste fuerte.', theme: 'brutal' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html', waitFor: '.site-hero', mobile: true,
      description: 'Presentación de la inducción en 3D con sus beneficios, los módulos interactivos, los planes por rol, los dispositivos compatibles (incluido visor VR) y un verificador de certificados. Los textos se editan desde el panel.',
      actions: ['Conocer los beneficios de la inducción interactiva', 'Ver los módulos y los planes por rol', 'Revisar si el dispositivo es compatible con WebXR', 'Verificar un certificado por su código', 'Ir a ingresar']
    },
    {
      id: 'portada-modulos', section: 'publico', title: 'Módulos y planes', url: 'index.html', waitFor: '#modulos',
      setup: async h => { await h.scrollTo('#modulos', 'start'); },
      description: 'Secciones de la portada con los módulos interactivos disponibles y los planes de inducción que combinan esos módulos para cada tipo de trabajador.',
      actions: ['Ver qué enseña cada módulo', 'Ver los planes para personal propio y contratistas', 'Conocer duración y vigencia de cada plan']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso con dos modos: los trabajadores entran con RUT y PIN, y el personal y supervisores con correo y clave. Incluye cuentas de demostración para cada rol.',
      actions: ['Entrar como trabajador con RUT y PIN', 'Entrar como personal con correo y clave', 'Usar una cuenta de demostración con un clic', 'Ir directo al panel que corresponde al rol']
    },
    {
      id: 'verificar', section: 'publico', title: 'Verificador de certificados', url: 'verificar.html?c=MA-RAP-2025-7QX4K', waitFor: '#result h2',
      description: 'Página pública donde cualquiera (por ejemplo, un mandante en portería) comprueba con el código si un certificado es válido, está vencido o fue revocado.',
      actions: ['Ingresar el código impreso en el certificado', 'Ver si es válido, vencido o revocado', 'Ver nombre, plan y fechas de vigencia', 'Abrir el certificado']
    },

    // ================= Trabajador =================
    {
      id: 'mis-inducciones', section: 'trabajador', login: U.trabajador, title: 'Mis inducciones', url: 'app.html#/', waitFor: '.site-main h1, main h1', mobile: true,
      description: 'Inicio del trabajador con recordatorios de plazo, las inducciones asignadas con su avance y el historial de las ya completadas.',
      actions: ['Ver las inducciones asignadas y su plazo', 'Seguir el avance de cada una', 'Continuar donde quedó', 'Revisar el historial de inducciones completadas']
    },
    {
      id: 'plan', section: 'trabajador', login: U.trabajador, title: 'Detalle de la inducción', url: 'app.html#/plan/a-cam-igs', waitFor: 'main h1',
      description: 'Módulos de una inducción en el orden definido, con su estado, los intentos de la evaluación y la evaluación práctica en terreno si el plan la exige.',
      actions: ['Ver los módulos en orden y cuáles faltan', 'Abrir el siguiente módulo', 'Ver los intentos de evaluación', 'Saber si falta la práctica en terreno']
    },
    {
      id: 'modulo-recorrido', section: 'trabajador', login: U.trabajador, title: 'Módulo: recorrido por la planta', url: 'app.html#/modulo/a-cam-igs/recorrido', waitFor: '.viewer',
      setup: playerReady,
      description: 'Recorrido por la planta con puntos de interés que explican cada riesgo. La vista real es una escena 3D navegable (y compatible con visores VR); si el motor 3D no carga, se muestra una vista 2D equivalente con los mismos puntos, que es la que aparece en esta captura.',
      actions: ['Recorrer la planta y abrir cada punto de interés', 'Activar el recorrido guiado', 'Entrar en modo VR con un visor compatible', 'Avanzar el porcentaje del módulo al revisar cada punto']
    },
    {
      id: 'modulo-epp', section: 'trabajador', login: U.trabajador, title: 'Módulo: equipo de protección', url: 'app.html#/modulo/a-cam-igs/epp', waitFor: '.viewer',
      setup: playerReady,
      description: 'Ejercicio para equipar al trabajador con el EPP correcto pieza por pieza. En la versión real el trabajador se viste sobre un modelo 3D; esta captura muestra la vista 2D que se usa cuando el motor 3D no está disponible.',
      actions: ['Elegir cada elemento de protección', 'Ver para qué sirve cada pieza', 'Completar el equipamiento para avanzar']
    },
    {
      id: 'evaluacion', section: 'trabajador', login: U.trabajador, title: 'Evaluación final', url: 'app.html#/evaluacion/a-cam-rap', waitFor: 'main h1',
      description: 'Portada de la evaluación con la cantidad de preguntas, el puntaje mínimo para aprobar y los intentos anteriores.',
      actions: ['Ver cuántas preguntas tiene y el puntaje para aprobar', 'Comenzar o volver a rendir la evaluación', 'Abrir el certificado si ya aprobó']
    },
    {
      id: 'evaluacion-pregunta', section: 'trabajador', login: U.trabajador, title: 'Evaluación: pregunta', url: 'app.html#/evaluacion/a-cam-rap', waitFor: '#q-start',
      setup: async h => { await h.click('#q-start'); await h.wait('#q-form'); await h.click('#q-form label >> nth=0'); },
      description: 'Preguntas de alternativas tomadas al azar del banco de los módulos del plan, con barra de avance y retroalimentación inmediata. El intento queda registrado y al aprobar se emite el certificado.',
      actions: ['Responder cada pregunta de alternativas', 'Ver si la respuesta es correcta y por qué', 'Avanzar con la barra de progreso', 'Conocer el puntaje final y si aprobó']
    },
    {
      id: 'certificados', section: 'trabajador', login: U.trabajador, title: 'Mis certificados', url: 'app.html#/certificados', waitFor: 'main h1',
      description: 'Certificaciones del trabajador con su vigencia y código de verificación.',
      actions: ['Ver los certificados vigentes y por vencer', 'Abrir el certificado imprimible', 'Copiar el código de verificación']
    },
    {
      id: 'certificado', section: 'trabajador', login: U.trabajador, title: 'Certificado imprimible', url: 'app.html#/certificado/cert-a-cam-rap', waitFor: 'main',
      setup: async h => { await h.pause(300); },
      description: 'Certificado listo para imprimir o guardar en PDF con nombre, RUT, plan, puntaje, fechas de vigencia y código verificable en el sitio público.',
      actions: ['Imprimir o guardar como PDF', 'Ver la vigencia del certificado', 'Compartir el código para verificarlo']
    },
    {
      id: 'notificaciones', section: 'trabajador', login: U.trabajador, title: 'Notificaciones', url: 'app.html#/notificaciones', waitFor: 'main h1',
      description: 'Avisos del trabajador: nuevas asignaciones, plazos por vencer, resultados de prácticas y certificados próximos a vencer.',
      actions: ['Leer los avisos recientes', 'Ir a la inducción relacionada', 'Marcarlos como leídos']
    },
    {
      id: 'perfil', section: 'trabajador', login: U.trabajador, title: 'Mi perfil', url: 'app.html#/perfil', waitFor: 'main h1',
      description: 'Datos del trabajador (empresa, área, cargo) y cambio del PIN de acceso.',
      actions: ['Revisar sus datos laborales', 'Cambiar el PIN de ingreso', 'Ver su resumen de inducciones']
    },

    // ================= Supervisor =================
    {
      id: 'sup-resumen', section: 'supervisor', login: U.supervisor, title: 'Resumen del equipo', url: 'supervisor.html#/', waitFor: '.admin-content h1', mobile: true,
      description: 'Indicadores del equipo a cargo: personas, finalización, prácticas por aprobar, asignaciones vencidas y certificados por vencer, con el estado de las inducciones.',
      actions: ['Ver el avance general del equipo', 'Detectar asignaciones vencidas', 'Ver cuántas prácticas esperan su evaluación', 'Anticipar certificados por vencer']
    },
    {
      id: 'sup-equipo', section: 'supervisor', login: U.supervisor, title: 'Mi equipo', url: 'supervisor.html#/equipo', waitFor: '.admin-content table',
      description: 'Integrantes del equipo (propios y contratistas) con avance, certificados vigentes y estado.',
      actions: ['Filtrar por tipo y cumplimiento', 'Ver el avance de cada persona', 'Asignar una inducción', 'Abrir la ficha de un integrante']
    },
    {
      id: 'sup-asignar', section: 'supervisor', login: U.supervisor, kind: 'modal', from: 'Botón "Asignar" en Mi equipo', title: 'Asignar inducción', url: 'supervisor.html#/equipo', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content [data-act="assign"]'); await h.modal(); },
      description: 'Asignación de un plan de inducción a una o varias personas con su plazo.',
      actions: ['Elegir el plan', 'Definir el plazo para completarlo', 'Asignarlo y notificar al trabajador']
    },
    {
      id: 'sup-asignaciones', section: 'supervisor', login: U.supervisor, title: 'Asignaciones del equipo', url: 'supervisor.html#/asignaciones', waitFor: '.admin-content table',
      description: 'Inducciones asignadas al equipo con su estado (pendiente, en curso, práctica, vencida, completada) y plazo.',
      actions: ['Filtrar por estado', 'Ver el avance y el plazo de cada asignación', 'Enviar recordatorios o extender plazos']
    },
    {
      id: 'sup-practicas', section: 'supervisor', login: U.supervisor, title: 'Evaluaciones prácticas', url: 'supervisor.html#/practicas', waitFor: '.admin-content h1',
      description: 'Prácticas en terreno pendientes de evaluación para quienes ya aprobaron la parte teórica.',
      actions: ['Ver quién espera su evaluación práctica', 'Aprobar o rechazar con observaciones', 'Revisar las prácticas ya resueltas']
    },
    {
      id: 'sup-practica', section: 'supervisor', login: U.supervisor, kind: 'modal', from: 'Botón "Evaluar" en Evaluaciones prácticas', title: 'Evaluación práctica en terreno', url: 'supervisor.html#/practicas', waitFor: '.admin-content h1',
      setup: async h => { await h.click('[data-act="eval"]'); await h.modal(); },
      description: 'Pauta de la evaluación práctica: el supervisor aprueba o rechaza y deja sus observaciones. Al aprobar se completa la inducción y se emite el certificado.',
      actions: ['Revisar la lista de verificación', 'Aprobar o rechazar la práctica', 'Dejar observaciones', 'Emitir el certificado al aprobar']
    },
    {
      id: 'sup-certificados', section: 'supervisor', login: U.supervisor, title: 'Certificados del equipo', url: 'supervisor.html#/vencimientos', waitFor: '.admin-content h1',
      description: 'Vigencia de los certificados del equipo, con los próximos a vencer destacados.',
      actions: ['Ver los certificados por vencer', 'Reasignar la reinducción a tiempo', 'Abrir cada certificado']
    },
    {
      id: 'sup-avisos', section: 'supervisor', login: U.supervisor, title: 'Avisos', url: 'supervisor.html#/avisos', waitFor: '.admin-content h1',
      description: 'Avisos del supervisor: prácticas por evaluar, vencimientos y avances de su equipo.',
      actions: ['Leer los avisos recientes', 'Marcarlos como leídos', 'Ir al registro relacionado']
    },

    // ================= Prevencionista =================
    {
      id: 'dashboard', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Dashboard', url: 'admin.html#/', waitFor: '.admin-content h1', mobile: true,
      description: 'Indicadores de la inducción: finalización, aprobación, tiempos por módulo y cumplimiento por área y por empresa contratista.',
      actions: ['Ver tasas de finalización y aprobación', 'Comparar el cumplimiento por área y contratista', 'Revisar el tiempo promedio por módulo', 'Detectar vencidas y certificados por vencer']
    },
    {
      id: 'trabajadores', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Trabajadores', url: 'admin.html#/trabajadores', waitFor: '.admin-content table',
      description: 'Personal propio y de empresas contratistas con su área, cargo, avance y estado.',
      actions: ['Buscar y filtrar por empresa, área o tipo', 'Crear y editar trabajadores', 'Asignar inducciones una a una o en masa', 'Abrir la ficha con su historial']
    },
    {
      id: 'trabajador-ficha', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Ficha del trabajador', url: 'admin.html#/trabajadores/u-cam', waitFor: '[data-assign]',
      description: 'Historial completo de una persona: asignaciones, intentos de evaluación, certificados y acciones disponibles.',
      actions: ['Ver todas sus inducciones y su avance', 'Extender plazos o cancelar asignaciones', 'Revisar intentos y certificados', 'Editar sus datos o asignar una inducción']
    },
    {
      id: 'empresas', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Empresas contratistas', url: 'admin.html#/empresas', waitFor: '.admin-content table',
      description: 'Empresa mandante y contratistas con su dotación y el porcentaje de cumplimiento de inducciones.',
      actions: ['Crear y editar empresas', 'Ver dotación por empresa', 'Comparar el cumplimiento entre contratistas']
    },
    {
      id: 'planes', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Planes de inducción', url: 'admin.html#/planes', waitFor: '.admin-content table',
      description: 'Planes que combinan módulos en un orden, con plazos, vigencia y a quién aplican.',
      actions: ['Ver los planes y sus módulos', 'Crear y editar planes', 'Abrir el constructor de cada plan']
    },
    {
      id: 'plan-editor', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Constructor de plan', url: 'admin.html#/planes/p-igs', waitFor: '[data-save]',
      description: 'Editor del plan: módulos y su orden, plazo para completarlo, vigencia del certificado, áreas y tipos de trabajador a los que aplica y si exige práctica en terreno.',
      actions: ['Agregar, quitar y ordenar módulos', 'Definir plazo y vigencia', 'Elegir a qué áreas y tipos aplica', 'Exigir evaluación práctica', 'Asignarlo en masa a quienes aplica']
    },
    {
      id: 'modulos', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Módulos 3D', url: 'admin.html#/modulos', waitFor: '.admin-content h1',
      description: 'Contenido de cada módulo (bienvenida, EPP, recorrido, emergencias, evaluación) con su tipo y cantidad de puntos de interés.',
      actions: ['Ver los módulos y su tipo', 'Abrir el editor de un módulo', 'Previsualizar el módulo como trabajador']
    },
    {
      id: 'modulo-editor', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Editor de módulo', url: 'admin.html#/modulos/recorrido', waitFor: '[data-save]',
      description: 'Editor con los datos del módulo, los puntos de interés de la escena (título, texto y ubicación), los elementos de EPP y la configuración de la evaluación.',
      actions: ['Editar título y descripción del módulo', 'Agregar o editar puntos de interés', 'Configurar los elementos de EPP', 'Guardar y verlo reflejado en la app del trabajador']
    },
    {
      id: 'preguntas', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Banco de preguntas', url: 'admin.html#/preguntas', waitFor: '.admin-content table',
      description: 'Preguntas de alternativas por módulo con su respuesta correcta; la evaluación final toma preguntas al azar de aquí.',
      actions: ['Filtrar por módulo', 'Crear y editar preguntas con sus alternativas', 'Marcar la respuesta correcta', 'Previsualizar la pregunta']
    },
    {
      id: 'asignaciones', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Asignaciones', url: 'admin.html#/asignaciones', waitFor: '.admin-content table',
      description: 'Seguimiento de todas las inducciones asignadas con estado, avance y plazo.',
      actions: ['Filtrar por estado, plan o empresa', 'Extender plazos y enviar recordatorios', 'Cancelar asignaciones', 'Asignar nuevas inducciones', 'Exportar a CSV']
    },
    {
      id: 'asignar', section: 'prevencion', login: U.prev, roles: PANEL, kind: 'modal', from: 'Botón "Asignar inducción" en Asignaciones', title: 'Asignar inducción', url: 'admin.html#/asignaciones', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Asignación de un plan a uno o varios trabajadores con plazo, desde el panel de prevención.',
      actions: ['Elegir el plan y las personas', 'Definir el plazo', 'Asignar y notificar']
    },
    {
      id: 'evaluaciones', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Evaluaciones', url: 'admin.html#/evaluaciones', waitFor: '[data-pr]',
      description: 'Prácticas en terreno por aprobar y todos los intentos de evaluación teórica con su puntaje.',
      actions: ['Aprobar o rechazar prácticas pendientes', 'Revisar los intentos y su puntaje', 'Abrir el detalle de un intento', 'Exportar los intentos a CSV']
    },
    {
      id: 'certificados-admin', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Certificados', url: 'admin.html#/certificados', waitFor: '.admin-content table',
      description: 'Registro de certificados emitidos con vigencia, vencimientos y opción de revocar; todos se pueden comprobar en el verificador público.',
      actions: ['Filtrar vigentes, por vencer y vencidos', 'Revocar un certificado con motivo', 'Abrir el verificador público', 'Exportar a CSV']
    },
    {
      id: 'reportes', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Reportes', url: 'admin.html#/reportes', waitFor: '.admin-content h1',
      description: 'Cumplimiento por área, por empresa y por plan, y tiempos por módulo, con exportaciones a CSV.',
      actions: ['Ver el cumplimiento por área y empresa', 'Comparar planes', 'Analizar tiempos por módulo', 'Exportar a CSV']
    },
    {
      id: 'bitacora', section: 'prevencion', login: U.prev, roles: PANEL, title: 'Bitácora', url: 'admin.html#/actividad', waitFor: '.admin-content h1',
      // La semilla parte con la bitácora vacía: se registran algunas acciones reales antes de capturar.
      setup: async h => {
        await h.goto('admin.html#/evaluaciones', '[data-pr]');
        await h.click('[data-act="eval"]'); await h.modal(); await h.click('.modal [data-submit]', { after: 500 });
        await h.goto('admin.html#/trabajadores/u-mat', '[data-assign]');
        await h.click('[data-assign]'); await h.modal(); await h.click('.modal [data-submit]', { after: 500 });
        await h.goto('admin.html#/actividad', '.admin-content table');
      },
      description: 'Registro de actividad: asignaciones, intentos, prácticas, certificados y cambios de contenido.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de acción', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Accesos de todo el personal: administradores, prevencionistas, supervisores y trabajadores, con su rol y estado.',
      actions: ['Crear y editar usuarios', 'Cambiar el rol', 'Activar o desactivar accesos', 'Reiniciar el PIN de un trabajador']
    },
    {
      id: 'configuracion', section: 'admin', login: U.admin, title: 'Sitio y configuración', url: 'admin.html#/configuracion', waitFor: '[data-default]',
      description: 'CMS del sitio público, parámetros del sistema (como el puntaje de aprobación) y restablecimiento de los datos demo.',
      actions: ['Editar los textos del sitio público', 'Ajustar los parámetros de evaluación y vigencia', 'Restaurar los textos por defecto', 'Restablecer los datos demo']
    }
  ]
};
