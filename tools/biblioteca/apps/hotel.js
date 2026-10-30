// Biblioteca de vistas de Hotel Bahía Lumen (/hotel).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', recepcion: 'u-rec', limpieza: 'u-hk', revenue: 'u-rev', huesped: 'u-guest' };
const head = '.page-head';
const firstRow = '.admin-content tbody tr >> nth=0';
const DEMO = 'code=BL-DEMO1&email=emma%40correo.de';

// Pasos del motor de reservas (el estado vive en la pestaña, así que se recorre desde el paso 1).
const toRooms = async h => { await h.click('[data-next]'); await h.wait('[data-pick]'); };
const toExtras = async h => { await toRooms(h); await h.click('[data-pick]:not([disabled])'); await h.wait('[data-x]'); };
const toGuest = async h => { await toExtras(h); await h.click('label.extra:has([data-x]) >> nth=0'); await h.click('[data-next]'); await h.wait('#gf'); };
const toPay = async h => {
  await toGuest(h);
  await h.fill('#g-n', 'Martín Soto Araya'); await h.fill('#g-e', 'martin.soto@demo.cl'); await h.fill('#g-p', '+56 9 6543 2109');
  await h.check('#g-ok'); await h.click('#gf button.btn-primary'); await h.wait('#pf');
};

module.exports = {
  dir: 'hotel',
  name: 'Hotel Bahía Lumen',
  kind: 'Hotel boutique con motor de reservas y PMS',
  theme: 'luxury',
  description: 'Hotel boutique en Valparaíso con sitio público y motor de reservas directo, gestión de la reserva y check-in online, portal del huésped, app de limpieza y un PMS con recepción, calendario, housekeeping, tarifas, channel manager y reportes.',
  accounts: {
    'u-admin': { name: 'Isabel Undurraga', role: 'Administrador', email: 'admin@bahialumen.cl', password: 'demo123' },
    'u-rec': { name: 'Felipe Navarro', role: 'Recepción', email: 'recepcion@bahialumen.cl', password: 'demo123' },
    'u-hk': { name: 'Marisol Vidal', role: 'Housekeeping', email: 'limpieza@bahialumen.cl', password: 'demo123' },
    'u-rev': { name: 'Andrés Lagos', role: 'Revenue manager', email: 'revenue@bahialumen.cl', password: 'demo123' },
    'u-guest': { name: 'Emma Schmidt', role: 'Huésped', email: 'emma@correo.de', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante: hotel, habitaciones, reserva directa y gestión de su reserva.' },
    { id: 'huesped', label: 'Huésped', desc: 'Portal del huésped con cuenta: estadías y Club Lumen.' },
    { id: 'recepcion', label: 'Recepción', desc: 'Front desk: llegadas, salidas, folios, calendario, reservas y huéspedes.' },
    { id: 'housekeeping', label: 'Housekeeping', desc: 'Limpieza de habitaciones: app móvil de camareras y tablero por estado.' },
    { id: 'revenue', label: 'Revenue manager', desc: 'Indicadores, tarifas y temporadas, canales de venta, habitaciones y reportes.' },
    { id: 'admin', label: 'Administrador', desc: 'Contenido del sitio, configuración, usuarios y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Lujo" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '[data-search]',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' },
      { id: 'aqua', group: 'Estilo', label: 'Aqua', desc: 'Claro, brillante y redondeado.', theme: 'aqua' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '[data-search]', mobile: true,
      description: 'Página de inicio con buscador de disponibilidad, habitaciones destacadas, spa, restaurante y ofertas. Los textos y el aviso superior se editan desde el panel.',
      actions: ['Elegir fechas, adultos, niños y código promocional', 'Ver disponibilidad y pasar al motor de reservas', 'Conocer las habitaciones con precio desde', 'Ir al spa, al restaurante o a las ofertas']
    },
    {
      id: 'habitaciones', section: 'publico', title: 'Habitaciones', url: 'index.html#/habitaciones', waitFor: '[data-book], .card',
      description: 'Los 5 tipos de habitación con superficie, camas, capacidad y precio desde por noche, con buscador de fechas y personas.',
      actions: ['Buscar disponibilidad por fechas y personas', 'Comparar superficie, camas y capacidad', 'Ver el detalle de cada habitación', 'Reservar directo']
    },
    {
      id: 'habitacion', section: 'publico', title: 'Ficha de habitación', url: 'index.html#/habitacion/superior', waitFor: '[data-main], [data-book]', mobile: true,
      description: 'Ficha con galería ilustrada, descripción, amenidades y la tarifa de los próximos días según temporada y fin de semana.',
      actions: ['Recorrer la galería', 'Revisar amenidades y capacidad', 'Ver el precio por noche de los próximos días', 'Reservar esta habitación']
    },
    {
      id: 'reservar-fechas', section: 'publico', title: 'Reserva: fechas', url: 'index.html#/reservar', waitFor: '[data-next]', mobile: true,
      description: 'Primer paso del motor de reservas: calendario de dos meses con precio desde por noche, adultos, niños y código promocional.',
      actions: ['Elegir llegada y salida en el calendario', 'Ver el precio desde de cada día', 'Indicar adultos y niños', 'Aplicar un código promocional']
    },
    {
      id: 'reservar-habitacion', section: 'publico', title: 'Reserva: habitación', url: 'index.html#/reservar', waitFor: '[data-next]',
      setup: toRooms,
      description: 'Tipos disponibles para las fechas elegidas con el total de la estadía, descuento aplicado y cupos restantes. Los agotados aparecen deshabilitados.',
      actions: ['Comparar el total por tipo de habitación', 'Ver cuántas quedan disponibles', 'Elegir la habitación']
    },
    {
      id: 'reservar-extras', section: 'publico', title: 'Reserva: extras', url: 'index.html#/reservar', waitFor: '[data-next]',
      setup: async h => { await toExtras(h); await h.click('label.extra:has([data-x]) >> nth=0'); await h.click('label.extra:has([data-x]) >> nth=1'); },
      description: 'Servicios adicionales para sumar a la estadía (desayuno, circuito spa, traslados, etc.), con cantidad y resumen de precio al lado.',
      actions: ['Agregar o quitar extras', 'Ajustar cantidades', 'Ver cómo cambia el total']
    },
    {
      id: 'reservar-datos', section: 'publico', title: 'Reserva: datos del huésped', url: 'index.html#/reservar', waitFor: '[data-next]',
      setup: toGuest,
      description: 'Datos del huésped principal, hora estimada de llegada, solicitudes especiales y aceptación de la política de cancelación. Con cuenta de huésped se completa solo.',
      actions: ['Ingresar nombre, correo, teléfono, país y documento', 'Indicar la hora de llegada', 'Dejar solicitudes especiales', 'Aceptar la política de cancelación']
    },
    {
      id: 'reservar-pago', section: 'publico', title: 'Reserva: pago', url: 'index.html#/reservar', waitFor: '[data-next]',
      setup: async h => { await toPay(h); await h.fill('#c-n', '4242 4242 4242 4242'); await h.fill('#c-e', '12/29'); await h.fill('#c-c', '123'); },
      description: 'Pago simulado con tarjeta: total o abono inicial, con vista previa de la tarjeta y resumen de la estadía.',
      actions: ['Elegir pagar el total o un abono', 'Ingresar los datos de la tarjeta', 'Revisar el resumen antes de confirmar', 'Pagar y confirmar']
    },
    {
      id: 'reservar-confirmada', section: 'publico', title: 'Reserva confirmada', url: 'index.html#/reservar', waitFor: '[data-next]',
      setup: async h => {
        await toPay(h); await h.fill('#c-n', '4242 4242 4242 4242'); await h.fill('#c-e', '12/29'); await h.fill('#c-c', '123');
        await h.click('[data-pay]'); await h.wait('.confirm'); return { url: 'index.html#/reservar?paso=6' };
      },
      description: 'Confirmación con el código de reserva, habitación, fechas, total y plazo de cancelación gratuita. La reserva aparece al instante en el PMS.',
      actions: ['Ver el código y el detalle de la reserva', 'Saber hasta cuándo puede cancelar gratis', 'Ir a gestionar la reserva', 'Hacer otra reserva']
    },
    {
      id: 'mi-reserva', section: 'publico', title: 'Gestionar mi reserva', url: 'index.html#/mi-reserva', waitFor: '[data-panel], form',
      description: 'Búsqueda de una reserva con su código y el correo usado al reservar.',
      actions: ['Buscar la reserva con código y correo', 'Ver el detalle y el folio', 'Hacer el check-in online', 'Cambiar fechas o cancelar según la política']
    },
    {
      id: 'mi-reserva-detalle', section: 'publico', title: 'Detalle de mi reserva', url: `index.html#/mi-reserva?${DEMO}&tab=detalle`, waitFor: '.bk-panel',
      description: 'Panel de la reserva con habitación, fechas, personas y el folio con cargos y pagos.',
      actions: ['Revisar el folio con cargos y pagos', 'Ver el saldo pendiente', 'Pasar al check-in online, cambio de fechas o cancelación']
    },
    {
      id: 'mi-reserva-checkin', section: 'publico', title: 'Check-in online', url: `index.html#/mi-reserva?${DEMO}&tab=checkin`, waitFor: '#pc',
      description: 'Pre-registro antes de llegar: documento, hora de llegada y aceptación de normas. Recepción lo ve marcado en la tarjeta de llegada.',
      actions: ['Completar documento y datos de contacto', 'Indicar la hora estimada de llegada', 'Aceptar las normas del hotel', 'Enviar el check-in']
    },
    {
      id: 'mi-reserva-fechas', section: 'publico', title: 'Cambiar fechas', url: `index.html#/mi-reserva?${DEMO}&tab=modificar`, waitFor: '[data-cal]',
      description: 'Cambio de fechas con calendario: revisa la disponibilidad y muestra la diferencia de precio antes de aplicar.',
      actions: ['Elegir nuevas fechas', 'Ver si hay disponibilidad', 'Revisar la diferencia de precio', 'Aplicar el cambio']
    },
    {
      id: 'mi-reserva-cancelar', section: 'publico', title: 'Cancelar reserva', url: `index.html#/mi-reserva?${DEMO}&tab=cancelar`, waitFor: '.bk-panel',
      description: 'Cancelación según la política del hotel: indica si es gratuita o cuántas noches se cobran de penalidad.',
      actions: ['Ver si la cancelación es gratuita', 'Conocer la penalidad si corresponde', 'Cancelar la reserva']
    },
    {
      id: 'spa', section: 'publico', title: 'Spa', url: 'index.html#/spa', waitFor: '[data-req]',
      description: 'Página del spa con horario, instalaciones y tratamientos con duración y precio. Todo se edita desde el panel.',
      actions: ['Conocer las instalaciones y el horario', 'Ver los tratamientos con duración y precio', 'Solicitar la reserva de un tratamiento']
    },
    {
      id: 'spa-solicitud', section: 'publico', kind: 'modal', from: 'Botón "Reservar" de un tratamiento o "Reservar mesa" del restaurante', title: 'Solicitud de spa o restaurante', url: 'index.html#/spa', waitFor: '[data-req]',
      setup: async h => { await h.click('[data-req]'); await h.modal(); },
      description: 'Formulario para pedir hora en el spa o mesa en el restaurante. La solicitud llega a la pestaña "Solicitudes" de recepción.',
      actions: ['Elegir fecha y hora', 'Indicar personas', 'Dejar nombre, contacto y número de reserva si es huésped', 'Enviar la solicitud']
    },
    {
      id: 'restaurante', section: 'publico', title: 'Restaurante', url: 'index.html#/restaurante', waitFor: '[data-req], .card',
      description: 'Página del restaurante con horario y carta por secciones (entradas, fondos y postres) con precios.',
      actions: ['Ver la carta con precios', 'Revisar el horario', 'Solicitar una mesa']
    },
    {
      id: 'ofertas', section: 'publico', title: 'Ofertas', url: 'index.html#/ofertas', waitFor: '.card',
      description: 'Beneficios de reservar directo con códigos de descuento vigentes y sus condiciones (mínimo de noches, anticipación).',
      actions: ['Ver los descuentos y sus condiciones', 'Usar un código directo en el motor de reservas', 'Revisar lo que siempre incluye la reserva directa']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso común para huéspedes (portal) y equipo (PMS), con registro de cuenta de huésped y cuentas de prueba de un clic.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, recepción, housekeeping, revenue o huésped', 'Crear una cuenta de huésped']
    },

    // ================= Huésped =================
    {
      id: 'portal', section: 'huesped', login: U.huesped, title: 'Portal del huésped', url: 'index.html#/portal', waitFor: '.card', mobile: true,
      description: 'Cuenta del huésped con sus datos, próximas y pasadas estadías y su nivel en el programa Club Lumen.',
      actions: ['Ver próximas y pasadas estadías', 'Abrir una estadía para su detalle, check-in o cambios', 'Revisar su nivel y beneficios Club Lumen', 'Reservar con sus datos ya completos']
    },

    // ================= Recepción =================
    {
      id: 'recepcion-llegadas', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], title: 'Recepción: llegadas', url: 'admin.html#/recepcion', waitFor: '[data-walkin]', mobile: true,
      description: 'Front desk del día con pestañas de llegadas, salidas, huéspedes en casa y solicitudes. Cada llegada permite elegir habitación libre y hacer el check-in.',
      actions: ['Asignar habitación y hacer check-in', 'Ver quién completó el check-in online', 'Hacer check-out y revisar saldos', 'Atender solicitudes de spa y restaurante', 'Registrar un walk-in']
    },
    {
      id: 'recepcion-folio', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Botón "Folio" en salidas, huéspedes en casa o una reserva', title: 'Folio de la estadía', url: 'admin.html#/recepcion/encasa', waitFor: '[data-walkin]',
      setup: async h => { await h.click('[data-folio]'); await h.modal(); await h.page.evaluate(() => { document.querySelector('.modal').scrollTop = 0; }); },
      description: 'Cuenta de la estadía con alojamiento, extras y consumos, pagos registrados y saldo, con emisión de boleta.',
      actions: ['Agregar cargos (minibar, restaurante, lavandería)', 'Registrar pagos', 'Ver el saldo pendiente', 'Emitir la boleta electrónica (demo)']
    },
    {
      id: 'recepcion-walkin', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Botón "Walk-in" de Recepción o "Nueva reserva"', title: 'Nueva reserva / walk-in', url: 'admin.html#/recepcion', waitFor: '[data-walkin]',
      setup: async h => { await h.click('[data-walkin]'); await h.modal(); },
      description: 'Alta de reserva interna con huésped, tipo y habitación, fechas, personas, canal, extras y estado, con el total calculado.',
      actions: ['Elegir o crear el huésped', 'Asignar tipo, habitación y fechas', 'Indicar canal y extras', 'Ver el total y guardar']
    },
    {
      id: 'recepcion-calendario', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción', 'Revenue manager'], title: 'Calendario', url: 'admin.html#/calendario', waitFor: '[data-res]',
      description: 'Grilla de habitaciones por día con las reservas como barras de color según su estado. Un clic en una barra abre la reserva; en una celda vacía crea una nueva.',
      actions: ['Ver 7, 14 o 21 días', 'Moverse entre semanas o volver a hoy', 'Abrir una reserva desde su barra', 'Crear una reserva en una celda libre']
    },
    {
      id: 'recepcion-reservas', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], title: 'Reservas', url: 'admin.html#/reservas', waitFor: firstRow,
      description: 'Todas las reservas de todos los canales con huésped, fechas, tipo, habitación, canal, total y estado.',
      actions: ['Filtrar por estado, canal, tipo y periodo', 'Buscar por código o huésped', 'Abrir el detalle de una reserva', 'Crear una reserva', 'Exportar a CSV']
    },
    {
      id: 'recepcion-reserva', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Clic en una reserva de la tabla o del calendario', title: 'Detalle de reserva', url: 'admin.html#/reservas', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ficha de la reserva con huésped, habitación, fechas, extras, saldo y el flujo de estados.',
      actions: ['Cambiar el estado (check-in, check-out, no-show, cancelada)', 'Editar la reserva', 'Abrir el folio', 'Eliminar la reserva']
    },
    {
      id: 'recepcion-huespedes', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], title: 'Huéspedes', url: 'admin.html#/huespedes', waitFor: firstRow,
      description: 'CRM de huéspedes con país, estadías, gasto total y próxima o última visita, con marca VIP.',
      actions: ['Filtrar por país o VIP', 'Buscar un huésped', 'Abrir su ficha', 'Crear o editar huéspedes', 'Exportar a CSV']
    },
    {
      id: 'recepcion-huesped', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'Recepción'], kind: 'modal', from: 'Clic en un huésped de la tabla', title: 'Ficha del huésped', url: 'admin.html#/huespedes', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ficha con datos de contacto, preferencias, etiquetas, gasto total e historial de estadías.',
      actions: ['Revisar preferencias y etiquetas', 'Ver el historial de estadías y abrir cualquiera', 'Marcar como VIP', 'Editar los datos']
    },

    // ================= Housekeeping =================
    {
      id: 'limpieza-app', section: 'housekeeping', login: U.limpieza, roles: ['Administrador', 'Recepción', 'Housekeeping'], title: 'App de limpieza', url: 'limpieza.html', waitFor: '[data-hk], .card', mobile: true,
      description: 'App móvil para camareras con sus habitaciones asignadas, el estado de cada una y si está ocupada o libre.',
      actions: ['Ver solo sus habitaciones o todas', 'Marcar una habitación como limpia', 'Reportar un problema de mantención', 'Seguir el avance del turno']
    },
    {
      id: 'limpieza-problema', section: 'housekeeping', login: U.limpieza, roles: ['Administrador', 'Recepción', 'Housekeeping'], kind: 'modal', from: 'Botón "Reportar" de una habitación', title: 'Reportar problema', url: 'limpieza.html', waitFor: '[data-issue]',
      setup: async h => { await h.click('[data-issue]'); await h.modal(); },
      description: 'Reporte de un desperfecto en la habitación. Queda como nota visible en el tablero de housekeeping.',
      actions: ['Elegir el tipo de problema', 'Describirlo', 'Enviar el reporte']
    },
    {
      id: 'housekeeping-tablero', section: 'housekeeping', login: U.limpieza, roles: ['Administrador', 'Recepción', 'Housekeeping'], title: 'Tablero de housekeeping', url: 'admin.html#/housekeeping', waitFor: '[data-hk]',
      description: 'Habitaciones en columnas por estado (sucia, limpia, inspeccionada, fuera de servicio) con filtro por piso, camarera asignada y notas.',
      actions: ['Cambiar el estado de limpieza', 'Asignar camarera', 'Dejar notas por habitación', 'Marcar fuera de servicio con motivo', 'Filtrar por piso']
    },

    // ================= Revenue =================
    {
      id: 'revenue-dashboard', section: 'revenue', login: U.revenue, roles: ['Administrador', 'Recepción', 'Revenue manager'], title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: head, mobile: true,
      description: 'Indicadores hoteleros de hoy y de 30 días (ocupación, ADR, RevPAR) con llegadas y salidas del día, huéspedes en casa, ocupación de 30 días y pronóstico de 14 días.',
      actions: ['Ver ocupación, ADR y RevPAR', 'Comparar con los 30 días previos', 'Revisar llegadas y salidas de hoy', 'Ver el estado de limpieza', 'Anticipar la ocupación de las próximas 2 semanas']
    },
    {
      id: 'revenue-tarifas', section: 'revenue', login: U.revenue, roles: ['Administrador', 'Revenue manager'], title: 'Tarifas y temporadas', url: 'admin.html#/tarifas', waitFor: '[data-newseason]',
      description: 'Tarifa base por tipo, recargo de fin de semana, temporadas con multiplicador y un calendario de precios de 21 días. Los cambios actualizan el sitio y el motor de reservas.',
      actions: ['Editar la tarifa base de cada tipo', 'Ajustar el recargo de viernes y sábado', 'Crear, editar o desactivar temporadas', 'Revisar el precio resultante por día']
    },
    {
      id: 'revenue-temporada', section: 'revenue', login: U.revenue, roles: ['Administrador', 'Revenue manager'], kind: 'modal', from: 'Botón "Temporada" o "Editar" en Tarifas', title: 'Temporada', url: 'admin.html#/tarifas', waitFor: '[data-newseason]',
      setup: async h => { await h.click('[data-newseason]'); await h.modal(); },
      description: 'Definición de una temporada con nombre, fechas de inicio y término y multiplicador sobre la tarifa base.',
      actions: ['Nombrar la temporada', 'Definir el rango de fechas', 'Fijar el multiplicador', 'Activarla o desactivarla']
    },
    {
      id: 'revenue-canales', section: 'revenue', login: U.revenue, roles: ['Administrador', 'Revenue manager'], title: 'Channel manager', url: 'admin.html#/canales', waitFor: '[data-sync]',
      description: 'Canales de venta simulados (sitio directo, agencias en línea, teléfono y corporativo) con comisión, markup, cupos por tipo, reservas de 90 días y última sincronización.',
      actions: ['Ver la proporción de reservas directas y comisiones pagadas', 'Activar o pausar canales', 'Editar comisión, markup y cupos', 'Sincronizar un canal o todos']
    },
    {
      id: 'revenue-habitaciones', section: 'revenue', login: U.revenue, roles: ['Administrador', 'Revenue manager'], title: 'Habitaciones', url: 'admin.html#/habitaciones', waitFor: firstRow,
      description: 'Tipos de habitación (descripción, superficie, capacidad, tarifa base y visibilidad en el sitio) y habitaciones físicas con número y piso.',
      actions: ['Crear y editar tipos de habitación', 'Ocultar un tipo del sitio', 'Administrar las habitaciones físicas', 'Exportar a CSV']
    },
    {
      id: 'revenue-reportes', section: 'revenue', login: U.revenue, roles: ['Administrador', 'Revenue manager'], title: 'Reportes', url: 'admin.html#/reportes', waitFor: head,
      description: 'Estadía promedio, anticipación, tasa de cancelación y no-shows, con ocupación por mes, ingresos por tipo y reservas por canal.',
      actions: ['Ver ocupación mensual', 'Comparar ingresos por tipo de habitación', 'Analizar reservas por canal', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'admin-contenido', section: 'admin', login: U.admin, title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: head,
      description: 'CMS del sitio en pestañas: textos de portada, spa y restaurante, ofertas con código, extras, tratamientos y carta. Lo publicado aparece de inmediato en el sitio.',
      actions: ['Editar los textos de cada página y el aviso superior', 'Crear ofertas con código y condiciones', 'Administrar extras y tratamientos del spa', 'Editar la carta del restaurante']
    },
    {
      id: 'admin-config', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/config', waitFor: head,
      description: 'Datos del hotel y políticas que usa el motor de reservas: horarios de check-in y check-out, días de cancelación gratuita, penalidad y abono mínimo.',
      actions: ['Editar nombre, dirección, teléfono y correo', 'Definir horarios de check-in y check-out', 'Ajustar la política de cancelación y la penalidad', 'Fijar el abono mínimo de la reserva web']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas del equipo y huéspedes con rol, último acceso y estado, más la matriz de permisos por rol.',
      actions: ['Crear usuarios y asignar rol', 'Activar o desactivar cuentas', 'Eliminar usuarios', 'Revisar los permisos de cada rol']
    },
    {
      id: 'admin-actividad', section: 'admin', login: U.admin, title: 'Actividad', url: 'admin.html#/actividad', waitFor: head,
      description: 'Registro de acciones del PMS y del sitio: reservas, check-ins, cambios de tarifa y contenido.',
      actions: ['Filtrar por acción y usuario', 'Buscar en el registro', 'Exportar a CSV']
    }
  ]
};
