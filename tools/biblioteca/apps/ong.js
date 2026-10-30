// Biblioteca de vistas de Fundación Raíces del Sur (/ong).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { donante: 'u-don', voluntario: 'u-vol', coordinador: 'u-coord', contador: 'u-cont', admin: 'u-admin' };
const firstRow = '.admin-content tbody tr >> nth=0 >> td >> nth=0';

// Donación de $10.000 a la campaña de agua, hasta el paso indicado (2 = datos, 3 = pago, 4 = lista).
async function donateTo(h, upTo) {
  await h.select('#d-camp', 'c1');
  await h.click('[data-next]'); await h.wait('#dForm');
  await h.fill('#d-name', 'Josefa Morales Pino'); await h.fill('#d-email', 'josefa.morales@demo.cl'); await h.fill('#d-phone', '+56 9 7788 1122'); await h.fill('#d-region', 'Biobío');
  if (upTo === 2) return;
  await h.click('#dForm button[type="submit"]'); await h.wait('#pForm');
  await h.fill('#p-num', '4242 4242 4242 4242'); await h.fill('#p-exp', '12/29'); await h.fill('#p-cvc', '123');
  if (upTo === 3) return;
  await h.click('[data-pay]'); await h.wait('[data-receipt]');
}

module.exports = {
  dir: 'ong',
  name: 'Fundación Raíces del Sur',
  kind: 'ONG / fundación',
  theme: 'forest',
  description: 'Sitio de una fundación con campañas de recaudación, donaciones únicas y mensuales con certificado, voluntariado con calendario y transparencia de gastos, más la cuenta de donantes y voluntarios y un panel con CRM, rendición de gastos y comunicaciones.',
  accounts: {
    'u-don': { name: 'Ana María Leiva', role: 'Donante', email: 'donante@raices.cl', password: 'dona123' },
    'u-vol': { name: 'Diego Vergara', role: 'Voluntario', email: 'voluntario@raices.cl', password: 'volun123' },
    'u-coord': { name: 'Pedro Huenchullán', role: 'Coordinador', email: 'coordinador@raices.cl', password: 'coord123' },
    'u-cont': { name: 'Sofía Riquelme', role: 'Contador', email: 'contador@raices.cl', password: 'conta123' },
    'u-admin': { name: 'Marcela Quilodrán', role: 'Administrador', email: 'admin@raices.cl', password: 'admin123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante: campañas, donación, voluntariado, transparencia y noticias.' },
    { id: 'donante', label: 'Donante', desc: 'Cuenta personal con historial, certificados y donación mensual.' },
    { id: 'voluntario', label: 'Voluntario', desc: 'Cuenta del voluntario con sus actividades y horas.' },
    { id: 'coordinador', label: 'Coordinador', desc: 'Panel de campañas, voluntariado, proyectos y comunicaciones.' },
    { id: 'contador', label: 'Contador', desc: 'Libro de donaciones, suscripciones y rendición de gastos.' },
    { id: 'admin', label: 'Administrador', desc: 'Dashboard, contenido del sitio, usuarios, bitácora y ajustes.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Forest" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
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
      id: 'inicio', section: 'publico', title: 'Inicio', url: 'index.html#/', waitFor: '.site-hero', mobile: true,
      description: 'Portada de la fundación con cifras de impacto, campañas destacadas, uso de los fondos, próximas actividades de voluntariado y noticias. Textos y cifras se editan desde el panel.',
      actions: ['Ver el impacto acumulado de la fundación', 'Entrar a las campañas destacadas', 'Ver cómo se usan los fondos', 'Sumarse a una actividad de voluntariado', 'Hacerse donante mensual']
    },
    {
      id: 'campanas', section: 'publico', title: 'Campañas', url: 'index.html#/campanas', waitFor: '.camp-card',
      description: 'Listado de campañas vigentes y finalizadas con meta, avance, donantes y días restantes.',
      actions: ['Buscar campañas por texto', 'Filtrar por causa y estado', 'Ver el avance de cada meta', 'Entrar a una campaña para donar']
    },
    {
      id: 'campana', section: 'publico', title: 'Página de campaña', url: 'index.html#/campanas/c1', waitFor: '.camp-hero-art', mobile: true,
      description: 'Página de una campaña con su ilustración, meta y avance, el proyecto asociado, actualizaciones del equipo y el muro de donantes.',
      actions: ['Ver cuánto se ha recaudado y cuánto falta', 'Leer las actualizaciones de la campaña', 'Ver el muro de mensajes de donantes', 'Donar a la campaña', 'Copiar el enlace o compartir']
    },
    {
      id: 'donar-monto', section: 'publico', title: 'Donar: monto', url: 'index.html#/donar', waitFor: '[data-next]', mobile: true,
      description: 'Primer paso de la donación: única o mensual, montos sugeridos con su equivalencia en impacto, destino y mensaje para el muro.',
      actions: ['Elegir donación única o mensual', 'Elegir un monto sugerido u otro', 'Ver a qué equivale el aporte', 'Elegir la campaña o el fondo general', 'Dejar un mensaje o donar anónimo']
    },
    {
      id: 'donar-datos', section: 'publico', title: 'Donar: tus datos', url: 'index.html#/donar', waitFor: '[data-next]',
      setup: async h => { await donateTo(h, 2); },
      description: 'Datos del donante y opción de crear una cuenta para descargar certificados y administrar la donación mensual.',
      actions: ['Ingresar nombre, correo, teléfono y región', 'Crear una cuenta en el mismo paso', 'Volver a cambiar el monto']
    },
    {
      id: 'donar-pago', section: 'publico', title: 'Donar: pago', url: 'index.html#/donar', waitFor: '[data-next]',
      setup: async h => { await donateTo(h, 3); },
      description: 'Pago simulado con tarjeta. En la donación mensual se indica el día de cada cargo.',
      actions: ['Ingresar la tarjeta de prueba', 'Revisar el resumen de la donación', 'Confirmar la donación']
    },
    {
      id: 'donar-gracias', section: 'publico', title: 'Donación recibida', url: 'index.html#/donar', waitFor: '[data-next]',
      setup: async h => { await donateTo(h, 4); },
      description: 'Agradecimiento con el número de comprobante, acceso al certificado de donación y botones para compartir.',
      actions: ['Ver o descargar el certificado', 'Compartir la campaña', 'Ir a la cuenta (si inició sesión)']
    },
    {
      id: 'certificado', section: 'publico', kind: 'modal', from: 'Botón "Ver certificado" al terminar la donación', title: 'Certificado de donación', url: 'index.html#/donar', waitFor: '[data-next]',
      setup: async h => { await donateTo(h, 4); await h.click('[data-receipt]'); await h.modal(); },
      description: 'Comprobante imprimible de la donación con número, donante, monto, destino y fecha, útil para rendición o beneficios tributarios.',
      actions: ['Revisar los datos del comprobante', 'Imprimir o guardar en PDF', 'Descargarlo como archivo']
    },
    {
      id: 'voluntariado', section: 'publico', title: 'Voluntariado', url: 'index.html#/voluntariado', waitFor: '#volForm',
      description: 'Calendario de actividades con cupos disponibles y formulario de postulación para nuevos voluntarios.',
      actions: ['Ver las próximas actividades y sus cupos', 'Abrir una actividad e inscribirse', 'Postular como voluntario con disponibilidad']
    },
    {
      id: 'actividad', section: 'publico', kind: 'modal', from: 'Clic en una actividad del calendario', title: 'Detalle de actividad', url: 'index.html#/voluntariado', waitFor: '[data-ev]',
      setup: async h => { await h.click('[data-ev] >> nth=0'); await h.modal(); },
      description: 'Ficha de la actividad con fecha, horario, lugar, proyecto, cupos restantes y un formulario corto de inscripción.',
      actions: ['Revisar fecha, lugar y horas', 'Ver cuántos cupos quedan', 'Inscribirse con nombre y correo']
    },
    {
      id: 'transparencia', section: 'publico', title: 'Transparencia', url: 'index.html#/transparencia', waitFor: '#tCat',
      description: 'Ingresos y gastos de la fundación, distribución por categoría y por proyecto, y el detalle de cada gasto publicado.',
      actions: ['Comparar ingresos y gastos', 'Ver en qué se gasta por categoría y proyecto', 'Filtrar el detalle de gastos', 'Revisar cada gasto con su respaldo']
    },
    {
      id: 'noticias', section: 'publico', title: 'Noticias', url: 'index.html#/noticias', waitFor: '.news-card',
      description: 'Noticias publicadas desde el panel y suscripción al boletín.',
      actions: ['Leer las noticias de la fundación', 'Abrir una noticia completa', 'Suscribirse al boletín']
    },
    {
      id: 'noticia', section: 'publico', title: 'Noticia', url: 'index.html#/noticias/n0', waitFor: '.site-main h1',
      description: 'Página de una noticia con su categoría, fecha y texto completo.',
      actions: ['Leer la noticia completa', 'Volver al listado', 'Ir a donar o a la campaña relacionada']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso para donantes, voluntarios y equipo, con cuentas de prueba para entrar con un clic. El equipo va al panel y donantes y voluntarios a su cuenta.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic con cada rol', 'Volver al sitio']
    },

    // ================= Donante =================
    {
      id: 'cuenta-donaciones', section: 'donante', login: U.donante, title: 'Mis donaciones', url: 'cuenta.html', waitFor: '[data-tab="donaciones"]', mobile: true,
      description: 'Resumen del donante con total aportado e historial de donaciones, con comprobantes y certificados anuales.',
      actions: ['Ver el total donado y el impacto', 'Revisar el historial con estado', 'Ver o descargar cada comprobante', 'Descargar el certificado anual']
    },
    {
      id: 'cuenta-comprobante', section: 'donante', login: U.donante, kind: 'modal', from: 'Botón "Ver" de una donación', title: 'Comprobante de donación', url: 'cuenta.html', waitFor: '[data-rc]',
      setup: async h => { await h.click('[data-rc] >> nth=0'); await h.modal(); },
      description: 'Comprobante de una donación del historial, listo para imprimir.',
      actions: ['Revisar el comprobante', 'Imprimir o guardar en PDF', 'Descargarlo']
    },
    {
      id: 'cuenta-mensual', section: 'donante', login: U.donante, title: 'Donación mensual', url: 'cuenta.html', waitFor: '[data-tab="mensual"]',
      setup: async h => { await h.click('[data-tab="mensual"]'); await h.pause(300); },
      description: 'Estado de la donación mensual con monto, destino, tarjeta y próximo cargo.',
      actions: ['Cambiar el monto o el destino', 'Cambiar la tarjeta', 'Pausar o reanudar', 'Cancelar la donación mensual']
    },
    {
      id: 'cuenta-cambiar-monto', section: 'donante', login: U.donante, kind: 'modal', from: 'Botón "Cambiar monto" en Donación mensual', title: 'Cambiar monto mensual', url: 'cuenta.html', waitFor: '[data-tab="mensual"]',
      setup: async h => { await h.click('[data-tab="mensual"]'); await h.click('[data-sub-amt]'); await h.modal(); },
      description: 'Formulario para ajustar el monto y el destino de la donación mensual.',
      actions: ['Subir o bajar el monto mensual', 'Cambiar la campaña de destino', 'Guardar el cambio']
    },
    {
      id: 'cuenta-perfil', section: 'donante', login: U.donante, title: 'Perfil', url: 'cuenta.html', waitFor: '[data-tab="perfil"]',
      setup: async h => { await h.click('[data-tab="perfil"]'); await h.wait('#profForm'); },
      description: 'Datos de contacto del donante y preferencias de comunicación.',
      actions: ['Actualizar nombre, teléfono y región', 'Elegir si recibe el boletín', 'Cambiar la contraseña']
    },

    // ================= Voluntario =================
    {
      id: 'cuenta-voluntariado', section: 'voluntario', login: U.voluntario, title: 'Mi voluntariado', url: 'cuenta.html', waitFor: '[data-tab="voluntariado"]', mobile: true,
      description: 'Ficha del voluntario con horas acumuladas, sus próximas actividades y las actividades abiertas para inscribirse.',
      actions: ['Ver horas y actividades realizadas', 'Inscribirse en actividades abiertas', 'Anular una inscripción', 'Revisar también sus donaciones']
    },

    // ================= Coordinador =================
    {
      id: 'panel-campanas', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], title: 'Campañas', url: 'admin.html#/campanas', waitFor: '.admin-content table',
      description: 'Campañas con meta, avance, donantes, fecha de término y estado (borrador, publicada, pausada o finalizada).',
      actions: ['Crear una campaña', 'Publicar, pausar o finalizar', 'Destacar en la portada', 'Abrir el detalle de una campaña', 'Exportar a CSV']
    },
    {
      id: 'panel-campana', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], title: 'Detalle de campaña', url: 'admin.html#/campanas/c1', waitFor: '.admin-content .page-head',
      description: 'Ficha interna de la campaña con recaudación, donantes, actualizaciones publicadas y últimas donaciones.',
      actions: ['Ver el avance contra la meta', 'Publicar una actualización', 'Editar la campaña', 'Revisar las donaciones recibidas']
    },
    {
      id: 'panel-campana-editar', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], kind: 'modal', from: 'Botón "Nueva campaña"', title: 'Nueva campaña', url: 'admin.html#/campanas', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de campaña con título, causa, región, proyecto, meta, fechas, ilustración de portada y textos.',
      actions: ['Definir título, causa y región', 'Fijar meta y fechas', 'Asociar un proyecto', 'Elegir la ilustración de portada']
    },
    {
      id: 'panel-voluntariado', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], title: 'Voluntariado: actividades', url: 'admin.html#/voluntariado', waitFor: '.admin-content .tabs',
      description: 'Programación de actividades con calendario, cupos e inscritos. Lo que se publica aparece en el calendario del sitio.',
      actions: ['Crear una actividad', 'Ver las próximas actividades', 'Revisar inscritos y cupos', 'Registrar asistencia y horas']
    },
    {
      id: 'panel-actividad', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], kind: 'modal', from: 'Clic en una actividad', title: 'Actividad e inscritos', url: 'admin.html#/voluntariado', waitFor: '.admin-content tbody tr',
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Detalle de una actividad con los voluntarios inscritos y el registro de asistencia.',
      actions: ['Ver los inscritos', 'Marcar asistencia', 'Editar la actividad']
    },
    {
      id: 'panel-voluntarios', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], title: 'Voluntariado: fichas', url: 'admin.html#/voluntariado', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="voluntarios"]'); await h.wait('.admin-content table'); },
      description: 'Fichas de voluntarios con estado de la postulación, región y horas acumuladas.',
      actions: ['Revisar postulaciones nuevas', 'Aprobar o desactivar voluntarios', 'Ver horas por voluntario', 'Crear una ficha']
    },
    {
      id: 'panel-proyectos', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Contador', 'Administrador'], title: 'Proyectos', url: 'admin.html#/proyectos', waitFor: '.admin-content table',
      description: 'Proyectos y comunidades beneficiarias con presupuesto contra ejecutado (calculado desde los gastos) y campañas asociadas.',
      actions: ['Ver presupuesto y ejecución', 'Crear o editar proyectos', 'Revisar beneficiarios y comunidad', 'Ver campañas asociadas']
    },
    {
      id: 'panel-noticias', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], title: 'Comunicaciones: noticias', url: 'admin.html#/comunicaciones', waitFor: '.admin-content table',
      description: 'Noticias del sitio en borrador o publicadas.',
      actions: ['Escribir una noticia', 'Publicar o pasar a borrador', 'Editar o eliminar']
    },
    {
      id: 'panel-boletines', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], title: 'Comunicaciones: boletines', url: 'admin.html#/comunicaciones', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="boletines"]'); await h.wait('[data-prev]'); },
      description: 'Compositor de boletines por segmento de donantes, con vista previa y envío simulado.',
      actions: ['Crear un boletín', 'Elegir el segmento de destino', 'Ver la vista previa personalizada', 'Enviarlo (simulado)']
    },
    {
      id: 'panel-boletin-vista', section: 'coordinador', login: U.coordinador, roles: ['Coordinador', 'Administrador'], kind: 'modal', from: 'Botón "Vista previa" de un boletín', title: 'Vista previa del boletín', url: 'admin.html#/comunicaciones', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="boletines"]'); await h.click('[data-prev]'); await h.modal(); },
      description: 'Cómo se verá el boletín con el nombre del destinatario reemplazado y el número de personas del segmento.',
      actions: ['Revisar el texto final', 'Ver a cuántas personas llegará', 'Volver a editar o enviar']
    },

    // ================= Contador =================
    {
      id: 'panel-donaciones', section: 'contador', login: U.contador, roles: ['Contador', 'Administrador'], title: 'Libro de donaciones', url: 'admin.html#/donaciones', waitFor: '.admin-content table',
      description: 'Todas las donaciones con totales, filtros, comprobantes, reembolsos y registro manual de transferencias.',
      actions: ['Filtrar por estado, tipo, campaña y fechas', 'Registrar una donación por transferencia', 'Reembolsar una donación', 'Ver el comprobante', 'Exportar a CSV']
    },
    {
      id: 'panel-donacion-manual', section: 'contador', login: U.contador, roles: ['Contador', 'Administrador'], kind: 'modal', from: 'Botón "Registrar donación"', title: 'Registrar donación manual', url: 'admin.html#/donaciones', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para ingresar donaciones recibidas por transferencia o en efectivo, que generan su comprobante.',
      actions: ['Elegir o crear el donante', 'Indicar monto, campaña y medio', 'Generar el comprobante']
    },
    {
      id: 'panel-suscripciones', section: 'contador', login: U.contador, roles: ['Contador', 'Administrador'], title: 'Suscripciones mensuales', url: 'admin.html#/suscripciones', waitFor: '.admin-content table',
      description: 'Donaciones mensuales con estado, ingreso recurrente, fallos de cobro y ejecución simulada de los cargos del mes.',
      actions: ['Ver el ingreso mensual recurrente', 'Revisar cobros fallidos', 'Ejecutar los cargos del día (simulado)', 'Cambiar monto, pausar o cancelar']
    },
    {
      id: 'panel-gastos', section: 'contador', login: U.contador, roles: ['Contador', 'Administrador'], title: 'Gastos y transparencia', url: 'admin.html#/gastos', waitFor: '.admin-content table',
      description: 'Rendición de gastos con registro, aprobación y publicación. Los gastos aprobados y publicados alimentan la página de transparencia.',
      actions: ['Registrar un gasto con su proyecto y categoría', 'Aprobar o rechazar gastos', 'Publicarlos en transparencia', 'Exportar a CSV']
    },
    {
      id: 'panel-gasto-nuevo', section: 'contador', login: U.contador, roles: ['Contador', 'Administrador'], kind: 'modal', from: 'Botón "Registrar gasto"', title: 'Registrar gasto', url: 'admin.html#/gastos', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario de gasto con fecha, proveedor, monto, categoría, proyecto y documento de respaldo.',
      actions: ['Ingresar proveedor, monto y fecha', 'Asignar categoría y proyecto', 'Adjuntar el número de documento']
    },
    {
      id: 'panel-donantes', section: 'contador', login: U.contador, roles: ['Coordinador', 'Contador', 'Administrador'], title: 'Donantes (CRM)', url: 'admin.html#/donantes', waitFor: '.admin-content table',
      description: 'CRM de donantes con segmentos automáticos (nuevo, recurrente, mayor, inactivo), etiquetas, total donado y última donación.',
      actions: ['Buscar y filtrar por segmento', 'Ver el total y la cantidad de aportes', 'Abrir la ficha de un donante', 'Crear un donante', 'Exportar a CSV']
    },
    {
      id: 'panel-donante', section: 'contador', login: U.contador, roles: ['Coordinador', 'Contador', 'Administrador'], title: 'Ficha del donante', url: 'admin.html#/donantes/d-ana', waitFor: '.admin-content .page-head',
      description: 'Perfil del donante con historial de aportes, donación mensual, etiquetas y notas del equipo.',
      actions: ['Revisar el historial completo', 'Agregar etiquetas y notas', 'Ver la suscripción mensual', 'Editar sus datos']
    },

    // ================= Administrador =================
    {
      id: 'panel-dashboard', section: 'admin', login: U.admin, roles: ['Todos los roles del equipo'], title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: '.admin-content .page-head',
      description: 'Recaudación del mes, donantes recurrentes, avance de las campañas, gráficos de ingresos y avisos pendientes para cada rol.',
      actions: ['Ver la recaudación del mes y la tendencia', 'Seguir el avance de las campañas', 'Atender postulaciones y gastos por aprobar', 'Revisar la actividad reciente']
    },
    {
      id: 'panel-cms', section: 'admin', login: U.admin, title: 'Sitio (CMS)', url: 'admin.html#/cms', waitFor: '.admin-content .page-head',
      description: 'Textos del inicio, cifras de impacto, montos sugeridos de donación y datos de contacto del sitio público.',
      actions: ['Editar textos de la portada', 'Actualizar las cifras de impacto', 'Cambiar los montos sugeridos', 'Editar los datos de contacto']
    },
    {
      id: 'panel-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas del equipo, donantes y voluntarios, con la matriz de permisos por rol.',
      actions: ['Crear o editar usuarios', 'Cambiar el rol', 'Desactivar cuentas', 'Restablecer una clave', 'Consultar la matriz de permisos']
    },
    {
      id: 'panel-bitacora', section: 'admin', login: U.admin, title: 'Bitácora de actividad', url: 'admin.html#/actividad', waitFor: '.admin-content table',
      description: 'Registro de acciones del sitio y del panel: donaciones, inscripciones, gastos, publicaciones y cambios de usuarios.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar y buscar', 'Exportar a CSV']
    },
    {
      id: 'panel-ajustes', section: 'admin', login: U.admin, title: 'Ajustes', url: 'admin.html#/ajustes', waitFor: '.admin-content .page-head',
      description: 'Herramientas de la demostración: exportar los datos y restablecer los datos de ejemplo.',
      actions: ['Exportar todos los datos en JSON', 'Restablecer los datos de demostración', 'Volver a empezar la demo desde cero']
    },
    {
      id: 'panel-restringido', section: 'admin', login: U.contador, title: 'Ruta protegida por rol', url: 'admin.html#/campanas', waitFor: '.admin-content',
      setup: async h => { await h.wait('text=Acceso restringido'); },
      description: 'Lo que ve un usuario del equipo si abre una sección que no corresponde a su rol (aquí, el contador entrando a campañas).',
      actions: ['Ver el aviso de sección restringida', 'Volver a las secciones permitidas', 'Comprobar que cada rol solo ve sus menús']
    }
  ]
};
