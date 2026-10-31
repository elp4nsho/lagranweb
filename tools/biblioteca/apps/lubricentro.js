// Biblioteca de vistas de Pits Rápido (/lubricentro).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'u-cli', recepcion: 'u-recep', tecnico: 'u-tec', jefe: 'u-jefe', admin: 'u-admin' };
const PANEL = ['Administrador', 'Jefe de sucursal'];
const firstRow = '.admin-content tbody tr >> nth=0';
// El modal enfoca el botón principal del pie y queda desplazado hacia abajo: lo devuelve arriba.
const modalTop = h => h.page.evaluate(() => document.querySelectorAll('.modal').forEach(m => { m.scrollTop = 0; }));

// Avanza la reserva online hasta el paso indicado (0 = vehículo … 4 = confirmar).
async function bookingTo(h, step) {
  for (let i = 0; i < step; i++) {
    if (i === 3) await h.click('.slot:not([disabled]) >> nth=1');
    await h.click('[data-next]');
  }
}

module.exports = {
  dir: 'lubricentro',
  name: 'Pits Rápido',
  kind: 'Lubricentro express',
  theme: 'bootstrap2',
  description: 'Cadena de lubricentros express con sitio público (precios por segmento, reservas, check-in "Llegué" y seguimiento en vivo), cuenta del cliente y apps internas para recepción y caja, tablero de bahías y panel de administración.',
  accounts: {
    'u-cli': { name: 'Javiera Morales', role: 'Cliente', email: 'cliente@pitsrapido.cl', password: 'demo123' },
    'u-recep': { name: 'Daniela Soto', role: 'Recepcionista', email: 'recepcion@pitsrapido.cl', password: 'demo123' },
    'u-tec': { name: 'Felipe Araya', role: 'Técnico', email: 'tecnico@pitsrapido.cl', password: 'demo123' },
    'u-jefe': { name: 'Rodrigo Muñoz', role: 'Jefe de sucursal', email: 'jefe@pitsrapido.cl', password: 'demo123' },
    'u-admin': { name: 'Carolina Fuentes', role: 'Administrador', email: 'admin@pitsrapido.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Cuenta personal: vehículos, historial con kilometraje, planes, boletas y datos.' },
    { id: 'recepcion', label: 'Recepcionista', desc: 'App de recepción y caja, más las atenciones y clientes del panel.' },
    { id: 'tecnico', label: 'Técnico', desc: 'Tablero de bahías con checklist, cronómetro y recomendaciones al cliente.' },
    { id: 'jefe', label: 'Jefe de sucursal', desc: 'Panel de gestión: indicadores, inventario, compras, turnos, planes y recordatorios.' },
    { id: 'admin', label: 'Administrador', desc: 'Precios, sucursales, promociones, contenido del sitio y usuarios.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Bootstrap 2" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.site-hero',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'brutal', group: 'Estilo', label: 'Brutal', desc: 'Bordes gruesos y contraste alto.', theme: 'brutal' },
      { id: 'nordic', group: 'Estilo', label: 'Nórdico', desc: 'Minimalista, blanco y aire.', theme: 'nordic' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.site-hero [data-pf] form', mobile: true,
      description: 'Página de inicio con buscador de precio por patente, la espera en vivo de cada sucursal, los servicios más pedidos, planes prepagados y cupones vigentes. Los textos y el anuncio superior se editan desde el panel.',
      actions: ['Escribir la patente y ver el precio para su auto', 'Ver la espera actual y las bahías ocupadas de cada sucursal', 'Entrar a un servicio o a la lista completa de precios', 'Comprar un plan prepagado o copiar un cupón', 'Ir a reservar, al check-in "Llegué" o al seguimiento del auto']
    },
    {
      id: 'precios', section: 'publico', title: 'Servicios y precios', url: 'index.html#/precios', waitFor: '.price-table',
      description: 'Lista de precios de todos los servicios en los 5 segmentos de vehículo (city car, sedán, SUV, camioneta y premium), con el precio por litro de cada aceite. Se puede identificar el auto por patente o por marca, modelo y año.',
      actions: ['Elegir marca, modelo y año para ver sus precios', 'Buscar el vehículo por patente', 'Filtrar servicios por categoría', 'Comparar la matriz de precios por segmento', 'Revisar el precio por litro y el intervalo de cambio de cada aceite']
    },
    {
      id: 'precios-mi-auto', section: 'publico', title: 'Precio para mi auto', url: 'index.html#/precios?p=KJTR-45', waitFor: '.spec-card', mobile: true,
      description: 'Resultado de buscar una patente: ficha del vehículo con el aceite y los filtros recomendados, y el precio exacto de cada servicio para ese auto, con IVA incluido.',
      actions: ['Ver aceite recomendado, litros, filtros y cada cuántos km cambiarlo', 'Revisar el precio de cada servicio para su vehículo', 'Reservar un servicio puntual desde su tarjeta', 'Cambiar de vehículo']
    },
    {
      id: 'sucursales', section: 'publico', title: 'Sucursales y tiempos de espera', url: 'index.html#/sucursales', waitFor: '.branch-card',
      description: 'Las sucursales con su espera estimada en vivo, calculada con los autos en bahía, lo que les falta y la fila. La página se actualiza sola.',
      actions: ['Ver la espera estimada si llega ahora', 'Revisar autos en fila, en bahía y bahías libres', 'Ver dirección, horario, teléfono y si abre hoy', 'Reservar en esa sucursal o hacer check-in "Llegué"']
    },
    {
      id: 'reservar', section: 'publico', title: 'Reserva: vehículo', url: 'index.html#/reservar?p=KJTR-45', waitFor: '.stepper',
      description: 'Primer paso de la reserva online en cinco pasos. El auto se identifica por patente o por marca, modelo y año, y el resumen lateral va sumando el precio.',
      actions: ['Buscar el vehículo por patente', 'Elegir marca, modelo y año si no tiene la patente a mano', 'Ver el aceite recomendado para su auto', 'Avanzar o volver entre los pasos']
    },
    {
      id: 'reservar-servicios', section: 'publico', title: 'Reserva: servicios y cupón', url: 'index.html#/reservar?p=KJTR-45&b=b1', waitFor: '.stepper',
      setup: async h => { await bookingTo(h, 2); await h.click('.opt:has([data-svc="filtros"])'); await h.fill('#bk-cp', 'PITS10'); await h.click('[data-cp]'); await h.scrollTo('.stepper', 'start', -130); },
      description: 'Paso de servicios: cada uno muestra su duración y el precio para el vehículo elegido. El cupón de descuento se valida al momento.',
      actions: ['Marcar uno o varios servicios', 'Ver la duración total estimada', 'Aplicar un cupón de descuento', 'Revisar el total en el resumen']
    },
    {
      id: 'reservar-horario', section: 'publico', title: 'Reserva: día y hora', url: 'index.html#/reservar?p=KJTR-45&b=b1', waitFor: '.stepper',
      setup: async h => { await bookingTo(h, 3); await h.click('.slot:not([disabled]) >> nth=1'); },
      description: 'Calendario de los próximos días con los horarios de la sucursal y los cupos libres de cada bloque. Los bloques llenos o pasados aparecen deshabilitados.',
      actions: ['Elegir un día disponible', 'Ver cuántos cupos quedan por horario', 'Elegir la hora de llegada', 'Volver a cambiar sucursal o servicios']
    },
    {
      id: 'reservar-confirmar', section: 'publico', title: 'Reserva: datos y confirmación', url: 'index.html#/reservar?p=KJTR-45&b=b1', waitFor: '.stepper',
      setup: async h => { await bookingTo(h, 4); await h.fill('#bk-n', 'Martín Soto Araya'); await h.fill('#bk-e', 'martin.soto@demo.cl'); await h.fill('#bk-t', '+56 9 7123 4567'); await h.fill('#bk-o', 'Ruido al frenar en bajadas'); },
      description: 'Último paso con los datos de contacto, el kilometraje y comentarios para el técnico. Se puede activar el recordatorio de mantención en el mismo formulario.',
      actions: ['Ingresar nombre, correo y celular', 'Indicar el kilometraje aproximado', 'Dejar comentarios para el técnico', 'Activar recordatorios por WhatsApp', 'Confirmar la reserva']
    },
    {
      id: 'reservar-confirmada', section: 'publico', title: 'Reserva confirmada', url: 'index.html#/reservar?p=KJTR-45&b=b1', waitFor: '.stepper',
      setup: async h => { await bookingTo(h, 4); await h.fill('#bk-n', 'Martín Soto Araya'); await h.fill('#bk-e', 'martin.soto@demo.cl'); await h.fill('#bk-t', '+56 9 7123 4567'); await h.click('[data-cf] button.btn-primary'); await h.wait('.code-box'); },
      description: 'Confirmación con el código de atención, sucursal, día y hora. La reserva aparece al instante en la recepción y en el panel, y se envía la confirmación por WhatsApp (simulada).',
      actions: ['Ver el código de atención', 'Seguir la atención en vivo', 'Ir al check-in "Llegué" de esa sucursal', 'Hacer otra reserva']
    },
    {
      id: 'llegue', section: 'publico', title: 'Check-in "Llegué"', url: 'index.html#/llegue', waitFor: '[data-ck]', mobile: true,
      description: 'Check-in desde el celular al llegar a la sucursal: con la patente se marca la llegada de una reserva del día o se entra a la fila sin cita.',
      actions: ['Elegir la sucursal donde está', 'Ver la espera y la fila de esa sucursal', 'Ingresar la patente', 'Quedar en la fila sin pasar por el mesón']
    },
    {
      id: 'llegue-sin-reserva', section: 'publico', title: 'Check-in sin reserva', url: 'index.html#/llegue', waitFor: '[data-ck]',
      setup: async h => { await h.fill('#ck-p', 'HJLK-22'); await h.click('[data-ck] button.btn-primary'); await h.wait('[data-walk]'); await h.fill('#ck-n', 'Sofía Pérez'); await h.fill('#ck-t', '+56 9 6234 1180'); await h.scrollTo('.phone-frame', 'start', -110); },
      description: 'Si la patente no tiene reserva para hoy, el check-in ofrece entrar a la fila eligiendo los servicios. Los datos del auto vienen del historial o del registro de vehículos (simulado).',
      actions: ['Elegir los servicios que necesita', 'Dejar nombre y celular si es cliente nuevo', 'Indicar el kilometraje del tablero', 'Ponerse en la fila de la sucursal']
    },
    {
      id: 'llegue-en-fila', section: 'publico', title: 'Posición en la fila', url: 'index.html#/llegue', waitFor: '[data-ck]',
      setup: async h => { await h.fill('#ck-p', 'HJLK-22'); await h.click('[data-ck] button.btn-primary'); await h.wait('[data-walk]'); await h.fill('#ck-n', 'Sofía Pérez'); await h.fill('#ck-t', '+56 9 6234 1180'); await h.click('[data-walk] button.btn-primary'); await h.wait('.pos-big'); await h.scrollTo('.phone-frame', 'start', -110); },
      description: 'Tras el check-in, el cliente ve su posición en la fila y en cuánto entra a bahía. La recepción y el tablero de bahías lo ven al instante.',
      actions: ['Ver su posición y la espera estimada', 'Pasar al seguimiento en vivo', 'Hacer check-in de otro auto']
    },
    {
      id: 'estado', section: 'publico', title: 'Seguimiento en vivo', url: 'index.html#/estado/KJTR-45', waitFor: '.track-head', mobile: true,
      description: 'Estado de la atención por código o patente: etapa actual, bahía y técnico, cronómetro, avance del checklist y las recomendaciones del técnico, que el cliente aprueba o rechaza desde el teléfono.',
      actions: ['Buscar la atención por código o patente', 'Ver la etapa, la bahía, el técnico y el tiempo en bahía', 'Seguir las tareas completadas', 'Aprobar o rechazar una recomendación con su precio', 'Ver el detalle y la boleta al terminar']
    },
    {
      id: 'planes', section: 'publico', title: 'Planes prepagados', url: 'index.html#/planes', waitFor: '.plan-card',
      description: 'Planes de mantención que se pagan una vez y se usan en cualquier sucursal. El precio cambia según el segmento del vehículo e incluye el aceite recomendado.',
      actions: ['Elegir el segmento del vehículo', 'Comparar servicios incluidos, vigencia y ahorro', 'Comprar un plan', 'Leer las preguntas frecuentes']
    },
    {
      id: 'planes-comprar', section: 'publico', kind: 'modal', from: 'Botón "Comprar plan" en Planes', title: 'Compra de plan', url: 'index.html#/planes', waitFor: '.plan-card',
      setup: async h => { await h.click('[data-buy] >> nth=1'); await h.modal(); await h.fill('.modal #pb-p', 'KJTR-45'); await h.fill('.modal #pb-n', 'Martín Soto Araya'); await h.fill('.modal #pb-e', 'martin.soto@demo.cl'); },
      description: 'Ventana de compra con pago simulado con tarjeta. El precio se recalcula según el segmento de la patente y el plan queda asociado a ese vehículo.',
      actions: ['Ingresar la patente y ver el precio de su segmento', 'Dejar sus datos (o usar su cuenta si ya ingresó)', 'Pagar con tarjeta (simulado)', 'Recibir el código del plan para usarlo en caja']
    },
    {
      id: 'recordatorios', section: 'publico', title: 'Recordatorios de mantención', url: 'index.html#/recordatorios', waitFor: '[data-f]',
      setup: async h => { await h.fill('#rm-n', 'Martín Soto Araya'); await h.fill('#rm-t', '+56 9 7123 4567'); await h.fill('#rm-p', 'KJTR-45'); },
      description: 'Inscripción para recibir avisos de mantención por WhatsApp, SMS o correo, según kilometraje o fecha. Muestra una vista previa del mensaje con los datos del auto.',
      actions: ['Ingresar nombre, celular y patente', 'Ver cuándo le toca el próximo cambio', 'Elegir canal y si avisar por km o fecha', 'Ver cómo llegará el mensaje', 'Activar el recordatorio']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account',
      description: 'Página de ingreso para clientes y equipo, con el resumen de lo que ve cada rol y cuentas de prueba para entrar con un clic.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administrador, jefe, recepcionista, técnico o cliente', 'Crear una cuenta de cliente nueva', 'Volver al sitio']
    },
    {
      id: 'cuenta-sin-sesion', section: 'publico', title: 'Mi cuenta (sin sesión)', url: 'index.html#/cuenta', waitFor: '.empty',
      description: 'Lo que ve un visitante al abrir "Mi cuenta" sin haber ingresado: el acceso al login con los datos de la cuenta demo.',
      actions: ['Ir a ingresar', 'Ver los datos de la cuenta demo de cliente', 'Volver a navegar el sitio']
    },

    // ================= Cliente =================
    {
      id: 'cuenta-vehiculos', section: 'cliente', login: U.cliente, title: 'Mis vehículos', url: 'index.html#/cuenta?tab=vehiculos', waitFor: '.veh-card', mobile: true,
      description: 'Inicio de la cuenta del cliente con sus atenciones en curso o reservadas y cada vehículo con su kilometraje, próximo cambio y estado de la mantención.',
      actions: ['Ver atenciones activas y abrir su seguimiento', 'Anular una reserva', 'Revisar el próximo cambio por km o fecha', 'Actualizar el kilometraje de un auto', 'Agregar un vehículo o reservar para uno']
    },
    {
      id: 'cuenta-agregar-vehiculo', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Tarjeta "Agregar vehículo" en Mis vehículos', title: 'Agregar vehículo', url: 'index.html#/cuenta?tab=vehiculos', waitFor: '.veh-card',
      setup: async h => { await h.click('[data-addveh]'); await h.modal(); },
      description: 'Formulario para sumar un auto a la cuenta. Si la patente ya existe en el historial de la cadena, se asocia con sus servicios anteriores.',
      actions: ['Ingresar patente, marca y modelo', 'Indicar año y kilometraje', 'Asociar un auto ya atendido antes']
    },
    {
      id: 'cuenta-historial', section: 'cliente', login: U.cliente, title: 'Historial de servicios', url: 'index.html#/cuenta?tab=historial', waitFor: '.timeline',
      description: 'Línea de tiempo con todos los servicios de sus vehículos, con fecha, kilometraje, sucursal, monto y número de boleta.',
      actions: ['Ver qué se hizo en cada visita', 'Revisar el kilometraje de cada servicio', 'Ver la sucursal y el total pagado']
    },
    {
      id: 'cuenta-planes', section: 'cliente', login: U.cliente, title: 'Mis planes', url: 'index.html#/cuenta?tab=planes', waitFor: '.tab.active',
      description: 'Planes prepagados del cliente con su código, patente, vencimiento y los servicios que le quedan disponibles.',
      actions: ['Ver el saldo de servicios de cada plan', 'Revisar la fecha de vencimiento', 'Ir a comprar un plan si no tiene']
    },
    {
      id: 'cuenta-boletas', section: 'cliente', login: U.cliente, title: 'Mis boletas', url: 'index.html#/cuenta?tab=boletas', waitFor: '[data-bol]',
      description: 'Listado de boletas electrónicas (simuladas) de todos sus servicios, con fecha, vehículo, detalle y total.',
      actions: ['Buscar una boleta por fecha o vehículo', 'Abrir el detalle de la boleta', 'Imprimirla o guardarla']
    },
    {
      id: 'cuenta-boleta', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Ver" en Mis boletas', title: 'Boleta electrónica', url: 'index.html#/cuenta?tab=boletas', waitFor: '[data-bol]',
      setup: async h => { await h.click('[data-bol]'); await h.modal(); },
      description: 'Boleta con los datos del cliente y del vehículo, el detalle de servicios, neto, IVA y total, más la garantía del servicio.',
      actions: ['Revisar el detalle y el medio de pago', 'Ver neto, IVA y total', 'Imprimir o guardar en PDF']
    },
    {
      id: 'cuenta-datos', section: 'cliente', login: U.cliente, title: 'Mis datos', url: 'index.html#/cuenta?tab=datos', waitFor: '[data-me]',
      description: 'Datos personales del cliente y los canales por los que acepta recibir recordatorios.',
      actions: ['Editar nombre, RUT, celular y comuna', 'Elegir WhatsApp, SMS o correo para los avisos', 'Cerrar sesión']
    },

    // ================= Recepcionista =================
    {
      id: 'recepcion', section: 'recepcion', login: U.recepcion, roles: ['Recepcionista', 'Jefe de sucursal', 'Administrador'], title: 'Recepción: operación', url: 'recepcion.html', waitFor: '.ops-cols',
      description: 'Pantalla de trabajo del mesón con tres columnas: llegadas y fila, autos en bahía y autos listos para cobrar. Se actualiza sola con lo que pasa en el sitio y en las bahías.',
      actions: ['Recibir una reserva o marcarla como "no llegó"', 'Enviar un auto de la fila a una bahía', 'Ver el avance de cada auto en bahía', 'Responder recomendaciones por teléfono del cliente', 'Cobrar y entregar los autos listos']
    },
    {
      id: 'recepcion-ingreso', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Botón "+ Ingreso sin cita" en Recepción', title: 'Ingreso de vehículo', url: 'recepcion.html', waitFor: '.ops-cols',
      setup: async h => { await h.click('[data-intake]'); await h.modal(); await h.fill('.modal #in-p', 'KJTR-45'); await h.fill('.modal #in-k', '68900'); await h.click('.modal [data-shot="0"]'); await h.click('.modal [data-shot="4"]'); },
      description: 'Ficha de ingreso con patente, kilometraje del tablero, datos del cliente, fotos de ingreso y servicios. Si el auto ya es cliente, completa sus datos y muestra el estado de su mantención y su plan.',
      actions: ['Buscar el auto por patente', 'Registrar el kilometraje', 'Marcar las fotos de ingreso (frontal, tablero, daños previos)', 'Elegir servicios con su precio', 'Dejarlo en la fila o mandarlo directo a bahía']
    },
    {
      id: 'recepcion-recibir', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Botón "Recibir" de una reserva del día', title: 'Recibir reserva', url: 'recepcion.html', waitFor: '.ops-cols',
      setup: async h => { await h.click('[data-recv]'); await h.modal(); await h.fill('.modal #in-k', '84200'); await h.click('.modal [data-shot="0"]'); await h.click('.modal [data-shot="1"]'); await h.click('.modal [data-shot="4"]'); },
      description: 'La misma ficha de ingreso, abierta desde una reserva del día: la patente, el cliente y los servicios ya vienen cargados y solo falta registrar el kilometraje y las fotos.',
      actions: ['Confirmar la llegada del cliente con reserva', 'Registrar el kilometraje del tablero', 'Marcar las fotos de ingreso', 'Agregar observaciones', 'Pasarlo a la fila o directo a una bahía']
    },
    {
      id: 'recepcion-asignar-bahia', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Botón "Bahía" de un auto en la fila', title: 'Asignar bahía', url: 'recepcion.html', waitFor: '.ops-cols',
      setup: async h => { await h.click('[data-bay]'); await h.modal(); },
      description: 'Ventana para pasar un auto de la fila a una bahía libre con el técnico que lo atenderá.',
      actions: ['Elegir entre las bahías libres', 'Asignar el técnico de la sucursal', 'Enviar el auto a bahía y arrancar su cronómetro']
    },
    {
      id: 'recepcion-cobro', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Botón "Cobrar y entregar" de un auto listo', title: 'Caja', url: 'recepcion.html', waitFor: '.ops-cols',
      setup: async h => { await h.click('[data-pay]'); await h.modal(); },
      description: 'Cobro de la atención con el detalle de servicios y recomendaciones aprobadas. Descuenta servicios de un plan activo, aplica cupones y emite la boleta.',
      actions: ['Revisar el detalle y el total', 'Cubrir servicios con el plan prepagado del cliente', 'Aplicar un cupón', 'Elegir el medio de pago', 'Cobrar y emitir la boleta']
    },
    {
      id: 'recepcion-boleta', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Al cobrar en Caja', title: 'Boleta emitida', url: 'recepcion.html', waitFor: '.ops-cols',
      setup: async h => { await h.click('[data-pay]'); await h.modal(); await h.click('.modal [data-pay]', { after: 500 }); await h.modal(); },
      description: 'Boleta electrónica (simulada) que se genera al cobrar. El stock se descuenta y el historial del vehículo se actualiza con el kilometraje.',
      actions: ['Ver la boleta recién emitida', 'Imprimirla para el cliente', 'Seguir con el siguiente auto']
    },
    {
      id: 'recepcion-caja-dia', section: 'recepcion', login: U.recepcion, title: 'Caja del día', url: 'recepcion.html', waitFor: '.ops-cols',
      setup: async h => { await h.click('[data-view="caja"]'); },
      description: 'Arqueo del día por medio de pago y la lista de boletas emitidas en la sucursal.',
      actions: ['Ver el total por medio de pago', 'Revisar cada boleta emitida hoy', 'Abrir una boleta']
    },
    {
      id: 'panel-atenciones', section: 'recepcion', login: U.recepcion, roles: ['Recepcionista', 'Jefe de sucursal', 'Administrador'], title: 'Atenciones', url: 'admin.html#/atenciones', waitFor: firstRow,
      description: 'Listado de todas las atenciones (reservas, fila, bahía, caja e historial) con filtros por periodo, estado, sucursal y origen.',
      actions: ['Filtrar por hoy, próximas reservas, últimos 7 días o en curso', 'Buscar por código, patente o cliente', 'Crear una atención o reserva telefónica', 'Abrir la ficha de cualquier atención', 'Exportar a CSV']
    },
    {
      id: 'panel-atencion-ficha', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Fila de la tabla de Atenciones', title: 'Ficha de la atención', url: 'admin.html#/atenciones', waitFor: firstRow,
      setup: async h => { await h.select('.admin-content select >> nth=0', 'activas'); await h.click('.admin-content tbody tr:has-text("KJTR-45") >> nth=0'); await h.modal(); },
      description: 'Detalle de una atención con vehículo, cliente, tiempos, fotos de ingreso, servicios, checklist y recomendaciones. Los botones cambian según la etapa.',
      actions: ['Marcar llegada, asignar bahía, marcar listo o cobrar', 'Responder una recomendación del técnico', 'Editar servicios y notas', 'Cancelar o eliminar la atención', 'Ver la boleta si ya se pagó']
    },
    {
      id: 'panel-nueva-atencion', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Botón "+ Nueva atención" en Atenciones', title: 'Nueva atención o reserva', url: 'admin.html#/atenciones', waitFor: firstRow,
      setup: async h => { await h.click('[data-new]'); await h.modal(); await h.fill('.modal #jf-p', 'BBCL-12'); await h.select('.modal #jf-s', 'reservado'); },
      description: 'Formulario para registrar un ingreso inmediato o una reserva tomada por teléfono. Con la patente se reconocen el vehículo y el cliente.',
      actions: ['Identificar el auto y el cliente por patente', 'Elegir la sucursal y los servicios', 'Registrar el ingreso ahora o una reserva con fecha y hora', 'Agregar notas']
    },
    {
      id: 'panel-clientes', section: 'recepcion', login: U.recepcion, roles: ['Recepcionista', 'Jefe de sucursal', 'Administrador'], title: 'Clientes y vehículos', url: 'admin.html#/clientes', waitFor: firstRow,
      description: 'Base de clientes y su flota, con pestaña de vehículos que marca la mantención al día, próxima o vencida.',
      actions: ['Buscar por nombre, RUT, correo o patente', 'Filtrar por comuna o permiso de WhatsApp', 'Ver vehículos por segmento, marca y estado de mantención', 'Crear clientes y vehículos', 'Exportar a CSV']
    },
    {
      id: 'panel-cliente-ficha', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Fila de la tabla de Clientes', title: 'Ficha del cliente', url: 'admin.html#/clientes', waitFor: firstRow,
      setup: async h => { await h.fill('.admin-content input[type="search"]', 'Javiera'); await h.click(firstRow); await h.modal(); await modalTop(h); },
      description: 'Ficha con contacto, canales autorizados, gasto acumulado, notas, cada vehículo con su historial por kilometraje y los planes del cliente.',
      actions: ['Editar datos y permisos de contacto', 'Agregar o editar vehículos', 'Revisar el historial de cada auto', 'Crear una atención para el cliente', 'Eliminar el cliente']
    },
    {
      id: 'panel-acceso-restringido', section: 'recepcion', login: U.recepcion, title: 'Ruta protegida por rol', url: 'admin.html#/usuarios', waitFor: '.admin-content .empty',
      description: 'Lo que ve un rol sin permiso al abrir una sección ajena: el menú solo muestra lo permitido y la ruta queda bloqueada.',
      actions: ['Ver el aviso de acceso restringido', 'Volver a su inicio desde el botón', 'Confirmar que cada rol solo ve sus menús']
    },

    // ================= Técnico =================
    {
      id: 'bahias', section: 'tecnico', login: U.tecnico, roles: ['Técnico', 'Jefe de sucursal', 'Administrador'], title: 'Tablero de bahías', url: 'operario.html', waitFor: '.bay-board .bay', mobile: true,
      description: 'Tablero para trabajar desde la bahía: auto asignado con cronómetro contra el tiempo estándar, checklist de tareas, recomendaciones enviadas y la fila de espera.',
      actions: ['Tomar el siguiente auto de la fila en una bahía libre', 'Marcar cada tarea del checklist', 'Seguir el cronómetro (se marca atrasado si pasa el estándar)', 'Enviar una recomendación al celular del cliente', 'Terminar la atención y avisar a recepción']
    },
    {
      id: 'bahias-recomendar', section: 'tecnico', login: U.tecnico, kind: 'modal', from: 'Botón "Recomendar" de una bahía', title: 'Enviar recomendación', url: 'operario.html', waitFor: '.bay-board .bay',
      setup: async h => { await h.click('[data-upsell]'); await h.modal(); await h.fill('.modal #up-n', 'Quedan 3 mm de pastilla'); },
      description: 'Ventana para recomendar un trabajo adicional con su precio para ese auto. El cliente la recibe en la página de seguimiento y la aprueba o rechaza.',
      actions: ['Elegir de la lista de recomendaciones con precio', 'Escribir una recomendación distinta con su precio', 'Agregar una nota para el cliente', 'Enviarla al celular del cliente']
    },
    {
      id: 'bahias-todas', section: 'tecnico', login: U.jefe, roles: ['Jefe de sucursal', 'Administrador'], title: 'Todas las bahías (vista del jefe)', url: 'operario.html', waitFor: '.bay-board .bay',
      setup: async h => { await h.click('[data-mine="0"]'); },
      description: 'El mismo tablero con todas las bahías de la sucursal, como lo ve el jefe. Puede cambiar de sucursal y ver las bahías libres, ocupadas o fuera de servicio.',
      actions: ['Ver el estado de cada bahía', 'Cambiar de sucursal', 'Mover el siguiente auto de la fila a una bahía libre', 'Aprobar en persona una recomendación']
    },

    // ================= Jefe de sucursal =================
    {
      id: 'dashboard', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Dashboard', url: 'admin.html#/dashboard', waitFor: '.kpi-grid',
      description: 'Indicadores de los últimos 30 días comparados con el periodo anterior: autos, ingresos, ticket, uso de bahías, espera y conversión de recomendaciones, con gráficos y el estado en vivo de las sucursales.',
      actions: ['Filtrar por sucursal o ver toda la cadena', 'Ver autos por día e ingresos por mes', 'Comparar sucursales en autos, ingresos, espera y uso', 'Revisar el mix de servicios y la conversión de recomendaciones', 'Ver stock crítico y actividad reciente']
    },
    {
      id: 'inventario', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Inventario', url: 'admin.html#/inventario', waitFor: firstRow,
      description: 'Stock por sucursal de aceites, filtros, baterías, neumáticos y frenos, con alerta de productos bajo el mínimo. El stock se descuenta solo al cobrar cada atención.',
      actions: ['Ver el stock de cada sucursal y su valor', 'Filtrar por categoría, alerta o proveedor', 'Generar una orden de compra para el stock bajo', 'Crear productos', 'Exportar a CSV']
    },
    {
      id: 'inventario-producto', section: 'jefe', login: U.jefe, kind: 'modal', from: 'Fila de la tabla de Inventario', title: 'Ficha de producto', url: 'admin.html#/inventario', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Ficha del producto con SKU, proveedor, precio, costo y stock mínimo, más el ajuste manual de stock por sucursal con su motivo.',
      actions: ['Editar datos, precio y costo', 'Definir el stock mínimo', 'Ajustar el stock de cada sucursal', 'Registrar el motivo del ajuste (conteo, merma, traspaso)']
    },
    {
      id: 'compras', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Compras y proveedores', url: 'admin.html#/compras', waitFor: firstRow,
      description: 'Órdenes de compra por sucursal con su estado (borrador, enviada, recibida o cancelada) y la ficha de proveedores.',
      actions: ['Filtrar órdenes por estado y sucursal', 'Abrir una orden y recibir la mercadería (suma stock)', 'Crear una orden de compra', 'Administrar proveedores', 'Exportar a CSV']
    },
    {
      id: 'compras-orden', section: 'jefe', login: U.jefe, kind: 'modal', from: 'Botón "+ Orden de compra" en Compras', title: 'Nueva orden de compra', url: 'admin.html#/compras', waitFor: firstRow,
      setup: async h => { await h.click('[data-new]'); await h.modal(); await h.click('.modal [data-add]'); await h.click('.modal [data-add]'); },
      description: 'Formulario de orden de compra con proveedor, sucursal de destino y líneas de productos con cantidad y costo.',
      actions: ['Elegir proveedor y sucursal destino', 'Agregar productos con cantidad y costo', 'Ver el subtotal de cada línea', 'Guardar como borrador o enviar al proveedor']
    },
    {
      id: 'personal', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Personal y turnos', url: 'admin.html#/personal', waitFor: '.shift-grid',
      description: 'Grilla semanal de turnos del personal de la sucursal con la cobertura de técnicos por jornada, y la productividad de cada técnico en los últimos días.',
      actions: ['Cambiar un turno con un clic (mañana, tarde, completo o libre)', 'Ver días con poca cobertura de técnicos', 'Comparar autos, eficiencia y recomendaciones aprobadas por técnico', 'Editar celular y sucursal de una persona']
    },
    {
      id: 'planes-vendidos', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Planes prepagados', url: 'admin.html#/planes', waitFor: '.admin-content .tabs',
      setup: async h => { await h.click('[data-tab="ventas"]'); await h.wait(firstRow); },
      description: 'Planes vendidos con cliente, patente, monto pagado, saldo de servicios y estado. La pestaña de planes muestra la oferta con su precio por segmento.',
      actions: ['Filtrar por plan, estado o segmento', 'Ajustar el saldo o la fecha de vencimiento de un plan vendido', 'Revisar los planes a la venta y sus precios', 'Exportar a CSV']
    },
    {
      id: 'recordatorios-campanas', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Recordatorios y campañas', url: 'admin.html#/recordatorios', waitFor: '.kpi-grid',
      description: 'Campañas de recordatorio por WhatsApp, SMS o correo con su audiencia y resultados (enviados, entregados, clics y reservas). Los envíos son simulados.',
      actions: ['Crear una campaña con audiencia y mensaje con variables', 'Enviarla a clientes con mantención vencida, próxima o con plan', 'Ver los resultados de cada envío', 'Revisar la bitácora de mensajes y los inscritos del sitio']
    },
    {
      id: 'recordatorios-enviar', section: 'jefe', login: U.jefe, kind: 'modal', from: 'Botón "Enviar ahora" de una campaña', title: 'Confirmar envío de campaña', url: 'admin.html#/recordatorios', waitFor: '.kpi-grid',
      setup: async h => { await h.click('[data-send] >> nth=0'); await h.modal(); },
      description: 'Confirmación antes de enviar una campaña: indica cuántos mensajes saldrán por el canal elegido y muestra un ejemplo ya personalizado.',
      actions: ['Ver cuántos contactos recibirán el mensaje', 'Revisar un mensaje de ejemplo con los datos reales', 'Confirmar o cancelar el envío']
    },
    {
      id: 'actividad', section: 'jefe', login: U.jefe, roles: PANEL, title: 'Actividad', url: 'admin.html#/actividad', waitFor: firstRow,
      description: 'Bitácora de los últimos 300 eventos del sistema: reservas, check-ins, bahías, caja, cambios de precios y accesos.',
      actions: ['Ver quién hizo qué y cuándo', 'Filtrar por tipo de evento', 'Buscar por detalle o usuario', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'servicios-precios', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Servicios y precios', url: 'admin.html#/servicios', waitFor: '.matrix',
      description: 'Matriz editable con el precio de cada servicio en los 5 segmentos. Al guardar, el sitio público muestra los precios nuevos. El jefe de sucursal la ve en solo lectura.',
      actions: ['Editar precios por segmento directamente en la tabla', 'Aplicar un ajuste masivo en %', 'Activar u ocultar servicios del sitio', 'Crear o editar un servicio con su checklist', 'Fijar el precio por litro de cada aceite']
    },
    {
      id: 'servicios-editor', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón de editar un servicio en la matriz', title: 'Editor de servicio', url: 'admin.html#/servicios', waitFor: '.matrix',
      setup: async h => { await h.loc('[data-edit]').evaluate(b => b.click()); await h.modal(); },
      description: 'Ficha del servicio con categoría, duración estándar, descripción pública, checklist de tareas para el técnico y precios por segmento.',
      actions: ['Editar nombre, ícono, categoría y duración', 'Escribir el checklist que verá el técnico', 'Fijar los 5 precios por segmento', 'Indicar si suma el aceite y si se destaca en portada']
    },
    {
      id: 'servicios-ajuste', section: 'admin', login: U.admin, kind: 'modal', from: 'Botón "Ajuste masivo %" en Servicios y precios', title: 'Ajuste masivo de precios', url: 'admin.html#/servicios', waitFor: '.matrix',
      setup: async h => { await h.click('[data-pct]'); await h.modal(); },
      description: 'Ventana para subir o bajar todos los precios en un porcentaje, para todas las categorías o una sola.',
      actions: ['Indicar la variación en %', 'Limitarla a una categoría', 'Aplicar el ajuste a la matriz']
    },
    {
      id: 'servicios-aceites', section: 'admin', login: U.admin, title: 'Aceites (precio por litro)', url: 'admin.html#/servicios', waitFor: '.matrix',
      setup: async h => { await h.click('[data-tab="aceites"]'); await h.wait('[data-oil]'); },
      description: 'Precio por litro e intervalo de cambio de cada aceite. Los servicios con aceite suman los litros que pide cada motor.',
      actions: ['Editar el precio por litro', 'Definir cada cuántos km se cambia', 'Ver el costo de ejemplo con 4 litros', 'Guardar y publicar en el sitio']
    },
    {
      id: 'sucursales-bahias', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Sucursales y bahías', url: 'admin.html#/sucursales', waitFor: '.admin-content .card',
      description: 'Sucursales con sus datos públicos y horarios, y las bahías de cada una. Las bahías activas definen los cupos de reserva y el cálculo de espera del sitio.',
      actions: ['Editar dirección, teléfono y horarios', 'Agregar, editar o eliminar bahías', 'Dejar una bahía fuera de servicio', 'Ver qué bahías están ocupadas ahora', 'Crear una sucursal nueva']
    },
    {
      id: 'promociones', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Promociones y cupones', url: 'admin.html#/promociones', waitFor: firstRow,
      description: 'Cupones de descuento con su vigencia, usos y monto descontado. Los públicos aparecen en la portada y se aplican al reservar o en caja.',
      actions: ['Crear cupones por porcentaje o monto fijo', 'Limitar a un servicio y a un número de usos', 'Pausar o reactivar un cupón', 'Mostrarlo u ocultarlo en la portada', 'Exportar a CSV']
    },
    {
      id: 'promociones-cupon', section: 'admin', login: U.admin, kind: 'modal', from: 'Fila de la tabla de Promociones', title: 'Editor de cupón', url: 'admin.html#/promociones', waitFor: firstRow,
      setup: async h => { await h.click(firstRow); await h.modal(); },
      description: 'Formulario del cupón con código, descripción pública, tipo y valor del descuento, servicio al que aplica, vigencia y límite de usos.',
      actions: ['Definir código y descripción', 'Elegir porcentaje o monto fijo', 'Limitar a un servicio', 'Fijar vigencia y usos máximos', 'Activarlo y publicarlo en la portada']
    },
    {
      id: 'contenido', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Contenido del sitio', url: 'admin.html#/contenido', waitFor: '[data-f]',
      description: 'Textos de la portada, barra de anuncio, contacto y parámetros de operación del sitio (días de reserva, bahías para clientes sin cita). Se publican al guardar.',
      actions: ['Editar título, bajada y texto de portada', 'Escribir o quitar la barra de anuncio', 'Cambiar teléfono, WhatsApp y correo', 'Definir días de reserva y bahías sin cita', 'Editar la garantía y el mensaje de recordatorio']
    },
    {
      id: 'usuarios', section: 'admin', login: U.admin, roles: ['Administrador'], title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas del equipo y clientes con rol, sucursal, último acceso y estado, más la matriz de permisos por rol que aplica el panel.',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol y sucursal', 'Desactivar una cuenta para cortar su acceso', 'Consultar la matriz de permisos por rol', 'Exportar a CSV']
    }
  ]
};
