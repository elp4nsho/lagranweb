// Biblioteca de vistas de Sentinela (/iot).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { operador: 'u-op', ingeniero: 'u-ing', lectura: 'u-ro', admin: 'u-admin' };
const firstRow = '.admin-content tbody tr >> nth=0 >> td >> nth=0';

module.exports = {
  dir: 'iot',
  name: 'Sentinela',
  kind: 'Monitoreo IoT industrial',
  theme: 'terminal',
  description: 'Plataforma de monitoreo industrial con sensores simulados en tiempo real: página de producto, consola operativa (panel en vivo, mapa de planta, alarmas, órdenes de trabajo, energía y bitácora de turno), modo pantalla para sala de control y panel de administración.',
  accounts: {
    'u-op': { name: 'Rosa Millán', role: 'Operador', email: 'operador@sentinela.demo', password: 'operador123' },
    'u-ing': { name: 'Matías Cárcamo', role: 'Ingeniero', email: 'ingeniero@sentinela.demo', password: 'ingeniero123' },
    'u-ro': { name: 'Felipe Andrade', role: 'Solo lectura', email: 'lectura@sentinela.demo', password: 'lectura123' },
    'u-admin': { name: 'Javiera Ortiz', role: 'Administrador', email: 'admin@sentinela.demo', password: 'admin123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Página de producto y solicitud de demo, sin iniciar sesión.' },
    { id: 'operador', label: 'Operador', desc: 'Consola operativa: monitoreo en vivo, alarmas, órdenes de trabajo y bitácora.' },
    { id: 'ingeniero', label: 'Ingeniero', desc: 'Reglas de alarma, infraestructura, aprovisionamiento y firmware.' },
    { id: 'lectura', label: 'Solo lectura', desc: 'Consulta de la consola y del panel sin poder modificar.' },
    { id: 'admin', label: 'Administrador', desc: 'Usuarios, claves API, auditoría, exportación y sitio web.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Terminal" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
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
      id: 'landing', section: 'publico', title: 'Página de producto', url: 'index.html', waitFor: '.site-hero', mobile: true,
      description: 'Presentación del producto con un mini panel que muestra datos simulados en vivo, funciones, casos de uso, planes y formulario de contacto. Textos y planes se editan desde el panel.',
      actions: ['Ver el mini panel con lecturas en vivo', 'Conocer funciones y casos de uso', 'Comparar planes y cotizar', 'Solicitar una demo']
    },
    {
      id: 'landing-planes', section: 'publico', title: 'Planes y contacto', url: 'index.html', waitFor: '#precios',
      setup: async h => { await h.scrollTo('#precios', 'start', -10); },
      description: 'Planes con precio y características, y el formulario "Agenda una demo" que crea una solicitud en el panel de administración.',
      actions: ['Comparar planes', 'Elegir un plan para cotizar', 'Enviar nombre, empresa, correo y necesidad', 'Generar un lead para el equipo comercial']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso con cuentas de prueba para cada rol. Todos entran a la consola operativa; administración, ingeniería y solo lectura también ven el panel de administración.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como operador, ingeniero, solo lectura o administrador', 'Volver a la página de producto']
    },

    // ================= Operador =================
    {
      id: 'panel-en-vivo', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Panel en vivo', url: 'app.html#/', waitFor: '.admin-content .page-head', mobile: true,
      description: 'Indicadores, medidores y gráficos que se actualizan cada segundo con la telemetría simulada de los sensores, más las alarmas activas.',
      actions: ['Ver sensores en línea, alarmas y consumo', 'Seguir medidores de temperatura, presión, humedad y energía', 'Elegir qué sensor muestra cada gráfico', 'Abrir una alarma activa']
    },
    {
      id: 'mapa', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Mapa de planta', url: 'app.html#/mapa', waitFor: '[data-map] svg',
      setup: async h => { await h.click('[data-panel] [data-pick] >> nth=0'); await h.pause(300); },
      description: 'Plano de cada sitio dibujado en la app, con los sensores coloreados según su estado. Al elegir uno se ve su lectura y su historial reciente.',
      actions: ['Cambiar de sitio', 'Filtrar por tipo de sensor', 'Elegir un sensor en el plano para ver su detalle', 'Ver los sensores que requieren atención']
    },
    {
      id: 'dispositivos', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Dispositivos', url: 'app.html#/dispositivos', waitFor: '.admin-content table',
      description: 'Listado de sensores con tipo, sitio, zona, última lectura, batería, señal y estado.',
      actions: ['Buscar y filtrar por tipo, sitio y estado', 'Ver la última lectura de cada sensor', 'Abrir la ficha de un dispositivo', 'Exportar a CSV']
    },
    {
      id: 'dispositivo', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Ficha del dispositivo', url: 'app.html#/dispositivos', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.wait('[data-chart]'); await h.pause(400); return { url: h.here() }; },
      description: 'Lectura en vivo, gráfico histórico por rango (hora, día, semana), estadísticas y alarmas del sensor.',
      actions: ['Ver la lectura en tiempo real', 'Cambiar el rango del historial', 'Revisar mínimo, máximo y promedio', 'Crear una orden de trabajo para el equipo']
    },
    {
      id: 'alarmas', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Centro de alarmas', url: 'app.html#/alarmas', waitFor: '.admin-content table',
      description: 'Alarmas generadas por el motor de reglas, con severidad, sensor, sitio, estado y responsable.',
      actions: ['Filtrar abiertas, activas, reconocidas o resueltas', 'Filtrar por severidad y sitio', 'Reconocer todas las activas', 'Abrir una alarma', 'Exportar a CSV']
    },
    {
      id: 'alarma', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Detalle de alarma', url: 'app.html#/alarmas', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.wait('.admin-content [data-comment]'); return { url: h.here() }; },
      description: 'Ficha de la alarma con la regla gatillada, el valor medido, su línea de tiempo y comentarios del equipo.',
      actions: ['Reconocer la alarma', 'Comentar', 'Resolverla con una causa', 'Crear una orden de trabajo desde la alarma', 'Reabrirla si vuelve a ocurrir']
    },
    {
      id: 'alarma-resolver', section: 'operador', login: U.operador, kind: 'modal', from: 'Botón "Resolver" en el detalle de alarma', title: 'Resolver alarma', url: 'app.html#/alarmas', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.click('.admin-content [data-resolve]'); await h.modal(); return { url: h.here() }; },
      description: 'Cierre de la alarma indicando la causa y la acción tomada, que quedan en su historial.',
      actions: ['Elegir la causa', 'Describir la acción tomada', 'Cerrar la alarma']
    },
    {
      id: 'ordenes', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Órdenes de trabajo', url: 'app.html#/ordenes', waitFor: '.admin-content table',
      description: 'Órdenes de mantención creadas a mano o desde alarmas, con prioridad, responsable, vencimiento y estado.',
      actions: ['Crear una orden de trabajo', 'Filtrar por estado y prioridad', 'Abrir el detalle de una orden', 'Exportar a CSV']
    },
    {
      id: 'orden', section: 'operador', login: U.operador, kind: 'modal', from: 'Clic en una orden de trabajo', title: 'Detalle de orden de trabajo', url: 'app.html#/ordenes', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Orden con el equipo, la alarma de origen, la lista de tareas para marcar y el cambio de estado.',
      actions: ['Marcar tareas del checklist', 'Agregar tareas', 'Cambiar el estado', 'Editar o eliminar la orden']
    },
    {
      id: 'energia', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Energía', url: 'app.html#/energia', waitFor: '.admin-content .page-head',
      description: 'Consumo diario por medidor y por zona, con el costo estimado en pesos según la tarifa configurada.',
      actions: ['Ver el consumo diario y del mes', 'Comparar zonas y medidores', 'Revisar el costo estimado', 'Exportar a CSV']
    },
    {
      id: 'bitacora', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Bitácora de turno', url: 'app.html#/turnos', waitFor: '[data-add]',
      description: 'Novedades registradas en cada turno (A, B, C) por sitio, para el traspaso entre equipos.',
      actions: ['Registrar una novedad del turno', 'Filtrar por sitio y turno', 'Revisar lo ocurrido en turnos anteriores']
    },
    {
      id: 'modo-pantalla', section: 'operador', login: U.operador, roles: ['Todos los roles'], title: 'Modo pantalla', url: 'pantalla.html', waitFor: '[data-map]',
      description: 'Vista para la TV de la sala de control con indicadores gigantes, gráfico en vivo, mapa que rota entre sitios y alarmas activas.',
      actions: ['Proyectar el estado de la planta en una pantalla grande', 'Ver alarmas activas de un vistazo', 'Activar pantalla completa']
    },
    {
      id: 'admin-sin-acceso', section: 'operador', login: U.operador, title: 'Administración sin acceso', url: 'admin.html', waitFor: '.denied',
      description: 'Lo que ve el operador si intenta abrir el panel de administración, que no corresponde a su rol.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a la consola operativa', 'Comprobar que cada rol solo ve sus secciones']
    },

    // ================= Ingeniero =================
    {
      id: 'reglas', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], title: 'Reglas de alarma', url: 'app.html#/reglas', waitFor: '[data-new]',
      description: 'Reglas del motor de alarmas por sensor: condición, umbral, duración, severidad y destinatarios.',
      actions: ['Crear o duplicar reglas', 'Activar o desactivar una regla', 'Editar umbral, duración y severidad', 'Eliminar reglas']
    },
    {
      id: 'regla-editar', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], kind: 'modal', from: 'Botón "Nueva regla"', title: 'Nueva regla de alarma', url: 'app.html#/reglas', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de la regla: sensor o tipo, condición (mayor, menor, fuera de rango), umbral, duración mínima, severidad y a quién avisar.',
      actions: ['Elegir el sensor y la condición', 'Fijar umbral y duración', 'Definir severidad', 'Elegir destinatarios del aviso']
    },
    {
      id: 'admin-resumen', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Solo lectura', 'Administrador'], title: 'Resumen de administración', url: 'admin.html#/', waitFor: '.admin-content .page-head',
      description: 'Estado de la flota de dispositivos, alarmas de los últimos 30 días, versiones de firmware y volumen de datos.',
      actions: ['Ver dispositivos en línea y con batería baja', 'Revisar alarmas por día y severidad', 'Ver la distribución de firmware', 'Seguir el volumen de datos recibidos']
    },
    {
      id: 'sitios', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], title: 'Sitios y zonas', url: 'admin.html#/sitios', waitFor: '.admin-content svg',
      description: 'Sitios de la empresa y sus zonas, con vista previa del plano que usa el mapa de la consola.',
      actions: ['Crear o editar sitios', 'Agregar zonas al plano', 'Ver la vista previa del plano', 'Eliminar sitios o zonas']
    },
    {
      id: 'aprovisionamiento', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], title: 'Aprovisionamiento', url: 'admin.html#/dispositivos', waitFor: '.admin-content table',
      description: 'Alta, edición y baja de dispositivos con su tipo, zona, rango de operación y posición en el plano.',
      actions: ['Agregar un dispositivo', 'Editar tipo, zona y rango', 'Dar de baja un dispositivo', 'Exportar a CSV']
    },
    {
      id: 'dispositivo-nuevo', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], kind: 'modal', from: 'Botón "Agregar dispositivo"', title: 'Nuevo dispositivo', url: 'admin.html#/dispositivos', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de alta con nombre, tipo, sitio y zona, y un plano donde se hace clic para ubicar el sensor.',
      actions: ['Ingresar nombre y tipo', 'Elegir sitio y zona', 'Ubicarlo con un clic en el plano', 'Guardar el dispositivo']
    },
    {
      id: 'firmware', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], title: 'Firmware', url: 'admin.html#/firmware', waitFor: '[data-newfw]',
      description: 'Versiones de firmware publicadas y despliegues por aire simulados con el avance por dispositivo.',
      actions: ['Publicar una versión nueva', 'Lanzar un despliegue a un grupo de equipos', 'Seguir el avance y cancelar', 'Reintentar en los equipos que fallaron']
    },
    {
      id: 'firmware-publicar', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Administrador'], kind: 'modal', from: 'Botón "Publicar versión"', title: 'Publicar versión de firmware', url: 'admin.html#/firmware', waitFor: '[data-newfw]',
      setup: async h => { await h.click('[data-newfw]'); await h.modal(); },
      description: 'Registro de una versión con número, tipo de dispositivo y notas de cambios.',
      actions: ['Indicar versión y tipo de equipo', 'Escribir las notas de cambios', 'Dejarla disponible para desplegar']
    },
    {
      id: 'exportar', section: 'ingeniero', login: U.ingeniero, roles: ['Ingeniero', 'Solo lectura', 'Administrador'], title: 'Exportar datos', url: 'admin.html#/exportar', waitFor: '[data-tel]',
      description: 'Descarga en CSV de dispositivos, alarmas, órdenes, energía y telemetría histórica por sensor y rango.',
      actions: ['Descargar cada conjunto de datos', 'Elegir sensor y rango de la telemetría', 'Llevar los datos a otras herramientas']
    },

    // ================= Solo lectura =================
    {
      id: 'lectura-alarmas', section: 'lectura', login: U.lectura, title: 'Consola en solo lectura', url: 'app.html#/alarmas', waitFor: '.admin-content table',
      description: 'El rol de solo lectura ve la consola completa, pero sin botones para reconocer, resolver o editar.',
      actions: ['Consultar alarmas y su estado', 'Revisar dispositivos y energía', 'Seguir el panel en vivo sin modificar nada']
    },
    {
      id: 'lectura-permisos', section: 'lectura', login: U.lectura, title: 'Matriz de permisos', url: 'admin.html#/usuarios', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="permisos"]'); await h.pause(300); },
      description: 'Tabla que muestra qué puede ver y modificar cada rol en la consola y en el panel.',
      actions: ['Ver los permisos de lectura y escritura por sección', 'Comparar los roles', 'Auditar los accesos']
    },

    // ================= Administrador =================
    {
      id: 'usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de la empresa con su rol, estado y último acceso.',
      actions: ['Crear o editar usuarios', 'Cambiar el rol', 'Activar o desactivar cuentas', 'Exportar a CSV']
    },
    {
      id: 'usuario-nuevo', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Nuevo usuario"', title: 'Nuevo usuario', url: 'admin.html#/usuarios', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Alta de una cuenta con nombre, correo, contraseña y rol.',
      actions: ['Ingresar nombre, correo y contraseña', 'Elegir el rol', 'Crear la cuenta']
    },
    {
      id: 'claves-api', section: 'admin', login: U.admin, title: 'Claves API', url: 'admin.html#/api', waitFor: '[data-new]',
      description: 'Claves ficticias para integrar otros sistemas, con su alcance, fecha de creación y último uso.',
      actions: ['Crear una clave nueva', 'Ver la clave una sola vez al crearla', 'Revocar una clave']
    },
    {
      id: 'auditoria', section: 'admin', login: U.admin, roles: ['Administrador', 'Solo lectura'], title: 'Auditoría', url: 'admin.html#/auditoria', waitFor: '.admin-content table',
      description: 'Registro de acciones de la consola y del panel: alarmas reconocidas, reglas, órdenes, despliegues y cambios de usuarios.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar y buscar', 'Exportar a CSV']
    },
    {
      id: 'sitio-web', section: 'admin', login: U.admin, roles: ['Administrador', 'Solo lectura'], title: 'Sitio web', url: 'admin.html#/web', waitFor: '.admin-content .tabs',
      description: 'Editor de la página de producto: textos de portada, planes y precios, y tarifa de energía usada en los reportes.',
      actions: ['Editar los textos de la portada', 'Crear o editar planes', 'Cambiar la tarifa de energía']
    },
    {
      id: 'leads', section: 'admin', login: U.admin, roles: ['Administrador', 'Solo lectura'], title: 'Solicitudes de demo', url: 'admin.html#/web', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="leads"]'); await h.wait('[data-lead]'); },
      description: 'Solicitudes enviadas desde el formulario de la página de producto, con contacto, plan, mensaje y estado.',
      actions: ['Revisar cada solicitud', 'Cambiar su estado (nuevo, contactado, ganado, perdido)', 'Ver el plan de interés']
    }
  ]
};
