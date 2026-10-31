// Biblioteca de vistas de Gallada (/polla): plataforma de pollas (rondas de ahorro y crédito entre personas).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si requiere
// ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Las pollas de la semilla tienen ids fijos (p-pega, p-familia, p-feria, p-aromos, p-vacaciones, p-cumple,
// p-peluqueria, p-club, p-colectivo, p-fondo); rondas y miembros se abren con clics.

const U = { par: 'u-par', luis: 'u-luis', org: 'u-org', tes: 'u-tes', admin: 'u-admin' };
const panel = '.admin-content .page-head';

// Deja la ronda 5 de la Polla Familia Soto con el pozo completo: confirma el pago informado y cubre las dos cuotas atrasadas.
async function completeFamilia(h) {
  await h.goto('organizador.html#/pollas/p-familia', '.g-round');
  await h.click('a:has-text("Abrir ronda")', { after: 500 });
  await h.wait('.g-pays');
  await h.click('[data-pact="ok"]', { after: 500 });
  for (let i = 0; i < 2; i++) { await h.click('[data-pact="cover"]'); await h.modal(); await h.click('.modal [data-submit]', { after: 600 }); }
  await h.wait('[data-pay]');
}

module.exports = {
  dir: 'polla',
  name: 'Gallada',
  kind: 'Plataforma de pollas (ahorro entre amigos)',
  theme: 'forest',
  description: 'Plataforma para organizar pollas —grupos que aportan una cuota fija cada período y se turnan para recibir el pozo— con sitio público (simulador, unirse con código, verificación de sorteos y comprobantes), app del participante, panel de organización y tesorería, y panel de la plataforma. El libro de cada polla se cuadra solo.',
  accounts: {
    'u-par': { name: 'Javiera Soto Henríquez', role: 'Participante', email: 'participante@gallada.cl', password: 'demo123' },
    'u-luis': { name: 'Luis Henríquez Toro', role: 'Participante (atrasado)', email: 'luis@gallada.cl', password: 'demo123' },
    'u-org': { name: 'Marisol Cárcamo Vidal', role: 'Organizador/a', email: 'organiza@gallada.cl', password: 'demo123' },
    'u-tes': { name: 'Patricio Vergara Rojas', role: 'Tesorero/a', email: 'tesorero@gallada.cl', password: 'demo123' },
    'u-admin': { name: 'Andrea Lagos Prieto', role: 'Administrador/a de plataforma', email: 'admin@gallada.cl', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'participante', label: 'Participante', desc: 'App de quien aporta en una o más pollas: pagar, seguir el pozo, su turno y su historial.' },
    { id: 'organizador', label: 'Organizador/a', desc: 'Panel para crear pollas, asignar turnos, confirmar pagos, entregar pozos y manejar morosos.' },
    { id: 'tesorero', label: 'Tesorero/a', desc: 'Co-organización: confirma pagos, entrega pozos y recuerda cuotas, sin cambiar las reglas.' },
    { id: 'admin', label: 'Plataforma', desc: 'Administración de Gallada: todas las pollas, personas, disputas, plantillas y configuración.' }
  ],

  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Bosque" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de las disposiciones de página combinada con uno de los estilos visuales del catálogo, adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.g-hero-art',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'portal', group: 'Disposición', label: 'Portal', desc: 'Portada densa en columnas con franja de secciones.', layout: 'portal' },
      { id: 'dividida', group: 'Disposición', label: 'Dividida', desc: 'Mitad fija tipo afiche y contenido a la derecha.', layout: 'dividida' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'candy', group: 'Estilo', label: 'Caramelo', desc: 'Pastel juguetón.', theme: 'candy' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.g-hero-art', mobile: true,
      description: 'Página de inicio que explica qué es una polla con una ilustración de la gallada en ronda alrededor del pozo, los cuatro pasos, un ejemplo de calendario, las modalidades y cifras reales de la plataforma.',
      actions: ['Escribir el código de una polla y ver su ficha antes de unirse', 'Ir al simulador con sus propios números', 'Conocer las seis modalidades: sorteo, orden fijo, por llegada, remate, medio cupo y frecuencias', 'Ver cuántas pollas están en curso y qué porcentaje de cuotas se paga a tiempo', 'Leer testimonios de organizadoras, tesoreros y participantes']
    },
    {
      id: 'como-funciona', section: 'publico', title: 'Cómo funciona', url: 'index.html#/como-funciona', waitFor: '.k-kv',
      description: 'Guía para quien nunca ha participado: qué es una polla, por qué el riesgo está en quien recibe primero, un glosario y el flujo de cada ronda, más lo que hace cada rol.',
      actions: ['Entender cuota, cupo, turno, pozo, gracia, fondo común, cubrir y remate', 'Ver el flujo de una ronda: informado, confirmado, pozo completo, entregado y recibido', 'Conocer qué hace la organización, la tesorería, cada participante y la plataforma', 'Entrar con una cuenta demo de cada rol']
    },
    {
      id: 'simulador', section: 'publico', title: 'Simulador', url: 'index.html#/simulador', waitFor: '.g-sim [data-out] table', mobile: true,
      description: 'Simulador que arma la polla con la cuota, las personas, la frecuencia y la primera fecha, y muestra al instante el pozo, la duración y el calendario completo de turnos.',
      actions: ['Cambiar cuota y número de cupos (con deslizador)', 'Elegir frecuencia semanal, quincenal (día 1 y 16), mensual (respeta fin de mes) o cada N días', 'Ver la fecha y el monto que recibe cada turno', 'Saber cuánto aporta cada persona y cuándo termina', 'Pasar a crear la polla con esos números']
    },
    {
      id: 'simulador-remate', section: 'publico', title: 'Simulador con remate', url: 'index.html#/simulador', waitFor: '.g-sim [data-out] table',
      setup: async h => { await h.check('.g-sim-form [name="remate"]'); await h.fill('.g-sim-form [name="disc"]', '18'); await h.scrollTo('.g-netchart', 'center'); },
      description: 'El mismo simulador con remate activado: el primer turno ofrece un descuento que baja hasta cero en el último, y cada descuento se reparte entre los demás. Un gráfico muestra quién paga por recibir antes y quién gana por esperar.',
      actions: ['Ajustar el descuento del primer turno con un deslizador', 'Ver cuánto recibe cada turno y cuánto le llega de los remates ajenos', 'Comparar el resultado neto de cada turno en el gráfico', 'Comprobar que la suma total siempre da cero']
    },
    {
      id: 'unirse', section: 'publico', title: 'Unirse con código', url: 'index.html#/unirse?code=AROMOS-24', waitFor: '.g-join', mobile: true,
      description: 'Ficha pública de una polla a partir de su código: cuota, pozo, cupos libres, modalidad de turnos, calendario, multas y la reputación de quien organiza, antes de comprometerse.',
      actions: ['Buscar una polla por su código', 'Revisar la cuota, el pozo, los cupos libres y la modalidad', 'Ver la reputación de la organizadora en otras pollas', 'Leer las reglas completas', 'Crear una cuenta o ingresar para unirse']
    },
    {
      id: 'unirse-cerrada', section: 'publico', title: 'Polla sin inscripciones', url: 'index.html#/unirse?code=PEGA-482', waitFor: '.g-join',
      description: 'Ficha de una polla que ya partió: se muestran sus datos y un aviso de que no recibe inscripciones.',
      actions: ['Ver los datos de una polla en curso', 'Saber que ya no acepta inscripciones', 'Buscar otro código']
    },
    {
      id: 'registro', section: 'publico', title: 'Crear cuenta', url: 'index.html#/registro?code=AROMOS-24', waitFor: '[data-reg]',
      description: 'Registro en un paso. Si se llega desde una invitación, al terminar lleva directo a unirse a esa polla.',
      actions: ['Crear la cuenta con nombre, correo, WhatsApp y contraseña', 'Marcar que también quiere organizar sus propias pollas', 'Continuar a la polla de la invitación', 'Ir al ingreso si ya tiene cuenta']
    },
    {
      id: 'verificar-sorteo', section: 'publico', title: 'Verificar sorteo', url: 'index.html#/verificar', waitFor: '[data-draw]',
      setup: async h => { await h.click('[data-load]'); await h.wait('[data-draw-out] .g-turn'); },
      description: 'Herramienta de transparencia: con la semilla publicada y la lista de cupos cualquiera repite el sorteo y obtiene el mismo orden. Avisa si coincide con el sorteo registrado.',
      actions: ['Cargar un sorteo publicado con un clic', 'Pegar una semilla y una lista propia', 'Ver el orden resultante turno por turno', 'Confirmar que coincide con el sorteo de la polla']
    },
    {
      id: 'verificar-comprobante', section: 'publico', title: 'Verificar comprobante', url: 'index.html#/verificar?c=ENT-5001', waitFor: '[data-rc-out] .g-receipt',
      setup: async h => { await h.scrollTo('[data-rc-out]', 'start', -100); },
      description: 'Comprobación pública de un comprobante de aporte (CMP-…) o de entrega de pozo (ENT-…): muestra el documento si está registrado en Gallada.',
      actions: ['Ingresar el código de un comprobante', 'Ver si es auténtico', 'Revisar polla, ronda, montos, medio de pago y quién confirmó']
    },
    {
      id: 'ayuda', section: 'publico', title: 'Preguntas frecuentes', url: 'index.html#/ayuda', waitFor: '.g-faq',
      description: 'Respuestas a las dudas típicas: dónde está la plata, qué pasa si alguien no paga, el remate, el medio cupo, las multas, los cambios de fecha y el término anticipado.',
      actions: ['Saber que Gallada no custodia dinero', 'Entender cómo se maneja a quien no paga o deja de pagar después de recibir', 'Leer cómo se reparten remates, multas y liquidaciones', 'Contactar a la plataforma por correo o WhatsApp']
    },
    {
      id: 'login', section: 'publico', title: 'Ingresar', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso con correo y contraseña, o con un clic en las cuentas demo de cada rol. Cada rol abre su propio panel.',
      actions: ['Ingresar con correo y contraseña', 'Entrar como organizadora, tesorero, participante (al día o atrasado) o plataforma', 'Crear una cuenta nueva', 'Volver al sitio']
    },

    // ================= Participante =================
    {
      id: 'part-inicio', section: 'participante', login: U.par, title: 'Inicio del participante', url: 'participante.html#/', waitFor: panel, mobile: true,
      description: 'Resumen personal con lo que tiene por pagar, su próximo pozo, las solicitudes de cambio de turno que le llegaron, cómo va el pozo de cada polla y sus últimas novedades.',
      actions: ['Pagar las próximas cuotas desde la lista', 'Ver cuánto y cuándo recibe su próximo pozo', 'Responder un pedido de cambio de turno', 'Seguir la recaudación de la ronda actual de cada polla', 'Revisar sus turnos y notificaciones']
    },
    {
      id: 'part-pagar', section: 'participante', login: U.par, title: 'Pagar', url: 'participante.html#/pagar', waitFor: '.g-pays-list',
      description: 'Todas las cuotas abiertas agrupadas en atrasadas, próximas dos semanas, en revisión y futuras (que se pueden adelantar), más las deudas por cuotas que otra persona cubrió.',
      actions: ['Informar el pago de cualquier cuota', 'Adelantar cuotas de rondas futuras', 'Ver qué pagos están en revisión', 'Avisar que pagó una deuda a quien lo cubrió']
    },
    {
      id: 'part-pagar-modal', section: 'participante', kind: 'modal', from: 'Botón "Pagar" de una cuota', login: U.par, title: 'Informar un pago', url: 'participante.html#/pagar', waitFor: '[data-pay]',
      setup: async h => { await h.click('[data-pay]'); await h.modal(); await h.fill('.modal [name="ref"]', '48213377'); },
      description: 'Ventana para informar un pago con el total (cuota más multa si corresponde), los datos de transferencia de la polla, el número de operación y la foto del comprobante, o marcarlo como efectivo.',
      actions: ['Ver el total exacto a pagar', 'Copiar los datos bancarios de la organización', 'Indicar transferencia con N° de operación o efectivo', 'Adjuntar la foto o PDF del comprobante (simulado)']
    },
    {
      id: 'part-pollas', section: 'participante', login: U.par, title: 'Mis pollas', url: 'participante.html#/pollas', waitFor: '.g-pcard',
      description: 'Tarjetas de cada polla en la que participa, separadas en activas, en inscripción y terminadas, con cuota, pozo, avance de la ronda y su turno.',
      actions: ['Ver el avance de la ronda actual de cada polla', 'Saber qué turno tiene en cada una', 'Abrir el detalle de una polla', 'Unirse a otra con un código']
    },
    {
      id: 'part-polla', section: 'participante', login: U.par, title: 'Polla: resumen', url: 'participante.html#/pollas/p-familia', waitFor: '.g-round', mobile: true,
      description: 'Detalle de una polla desde el lado del participante: el pozo de la ronda actual (esperado, recaudado, por confirmar y falta), su cuota de esta ronda, el orden de turnos y los datos de la organización.',
      actions: ['Ver cuánto falta para completar el pozo', 'Pagar su cuota de la ronda', 'Revisar su cupo, turno y cuánto recibirá', 'Ver con quién comparte un medio cupo', 'Contactar a la organización']
    },
    {
      id: 'part-polla-aportes', section: 'participante', login: U.par, title: 'Polla: mis aportes', url: 'participante.html#/pollas/p-pega?tab=aportes', waitFor: '.admin-content table',
      description: 'Todas sus cuotas en esa polla, ronda por ronda, con su vencimiento, estado, multa si la hubo y el comprobante de las que ya están pagadas.',
      actions: ['Pagar o adelantar cualquier cuota', 'Abrir el comprobante de cada pago', 'Ver multas aplicadas o condonadas']
    },
    {
      id: 'part-polla-turnos', section: 'participante', login: U.par, title: 'Polla: turnos y cambios', url: 'participante.html#/pollas/p-pega?tab=turnos', waitFor: '.g-turns',
      description: 'El orden completo de turnos con quién ya recibió, la ronda actual y su propio turno destacado, más el formulario para pedirle a otro cupo que cambie de turno.',
      actions: ['Ver quién recibe en cada fecha', 'Identificar los turnos ya entregados y el actual', 'Pedir un cambio de turno con un mensaje', 'Saber si su cupo ya no puede cambiar']
    },
    {
      id: 'part-polla-remate', section: 'participante', login: U.par, title: 'Polla: remate', url: 'participante.html#/pollas/p-feria?tab=turnos', waitFor: '[data-bid]',
      description: 'En una polla de remate, el participante puja un descuento para recibir el pozo de la ronda abierta. Ve la mejor oferta actual y cuánto recibiría con su puja.',
      actions: ['Pujar o cambiar su puja', 'Ver la mejor oferta actual', 'Calcular cuánto recibiría', 'Revisar quién se adjudicó las rondas anteriores y con qué descuento']
    },
    {
      id: 'part-polla-muro', section: 'participante', login: U.par, title: 'Polla: muro', url: 'participante.html#/pollas/p-pega?tab=muro', waitFor: '.g-wall',
      description: 'Muro de la gallada con los avisos fijados de la organización y los mensajes de los miembros.',
      actions: ['Escribir a todo el grupo', 'Leer los avisos fijados', 'Avisar cuándo va a pagar']
    },
    {
      id: 'part-polla-cuenta', section: 'participante', login: U.par, title: 'Polla: mi cuenta', url: 'participante.html#/pollas/p-pega?tab=cuenta', waitFor: '.k-kpis',
      description: 'Su posición en esa polla: cuánto ha aportado, cuánto ha recibido, su posición neta y su deuda, con cada movimiento y el neto acumulado.',
      actions: ['Ver aportado vs recibido', 'Entender si le toca recibir o le queda por aportar', 'Revisar cada movimiento con su comprobante']
    },
    {
      id: 'part-polla-reglas', section: 'participante', login: U.par, title: 'Polla: reglas', url: 'participante.html#/pollas/p-pega?tab=reglas', waitFor: '[data-report]',
      description: 'Las reglas escritas por la organización y los datos para pagar, con un acceso para reportar un problema a la plataforma.',
      actions: ['Leer plazos, multas y qué pasa si alguien no paga', 'Copiar los datos para transferir', 'Reportar un problema']
    },
    {
      id: 'part-reportar', section: 'participante', kind: 'modal', from: 'Botón "Reportar un problema" en Reglas', login: U.par, title: 'Reportar un problema', url: 'participante.html#/pollas/p-pega?tab=reglas', waitFor: '[data-report]',
      setup: async h => { await h.click('[data-report]'); await h.modal(); },
      description: 'Formulario para levantar un reporte a la plataforma sobre una polla o una persona: no paga, no entregó el pozo, sospecha de fraude u otro.',
      actions: ['Elegir el motivo', 'Indicar sobre quién es el reporte', 'Contar qué pasó', 'Enviarlo a la plataforma, que lo revisa en Disputas']
    },
    {
      id: 'part-calendario', section: 'participante', login: U.par, title: 'Calendario', url: 'participante.html#/calendario', waitFor: '.g-cal',
      description: 'Calendario mensual con sus cuotas de todas las pollas (pagadas, pendientes o atrasadas) y los días en que recibe un pozo.',
      actions: ['Navegar mes a mes', 'Distinguir cuotas pagadas, pendientes y atrasadas', 'Ver el día en que recibe cada pozo', 'Abrir la polla de cada evento']
    },
    {
      id: 'part-cambios', section: 'participante', login: U.par, title: 'Cambios de turno', url: 'participante.html#/cambios', waitFor: '.g-list',
      description: 'Solicitudes de cambio de turno que le llegan y las que ha pedido, con su estado: esperando al otro cupo, esperando a la organización, aprobado o rechazado.',
      actions: ['Aceptar o rechazar un pedido de cambio', 'Cancelar una solicitud propia', 'Ver el mensaje de quien pide el cambio']
    },
    {
      id: 'part-estado', section: 'participante', login: U.par, title: 'Estado de cuenta', url: 'participante.html#/estado', waitFor: '.g-statement',
      description: 'Estado de cuenta personal de todas sus pollas con lo aportado, lo recibido y el neto acumulado, listo para imprimir o exportar.',
      actions: ['Ver totales aportados y recibidos', 'Revisar cada movimiento con su comprobante', 'Exportar a CSV', 'Imprimir el estado de cuenta']
    },
    {
      id: 'part-comprobante', section: 'participante', login: U.par, title: 'Comprobante imprimible', url: 'participante.html#/estado', waitFor: '.g-statement',
      setup: async h => { await h.click('.g-statement a[href^="#/comprobante/"]'); await h.wait('.g-receipt'); },
      description: 'Comprobante de un aporte o de una entrega de pozo con su número, polla, ronda, montos, medio de pago y quién lo confirmó, listo para imprimir o guardar en PDF.',
      actions: ['Ver el detalle del pago o entrega', 'Imprimir o guardar como PDF', 'Verificarlo luego en el sitio con su código']
    },
    {
      id: 'part-reputacion', section: 'participante', login: U.par, title: 'Reputación', url: 'participante.html#/reputacion', waitFor: '.g-rep',
      description: 'Puntaje de 0 a 100 construido con su historial en todas las pollas. Las organizaciones lo ven cuando pide unirse a una.',
      actions: ['Ver su puntaje, estrellas y etiqueta', 'Entender cómo se calcula (pagos a tiempo, atrasos, cuotas cubiertas, pollas terminadas)', 'Revisar su historial polla por polla', 'Leer consejos para subirlo']
    },
    {
      id: 'part-notificaciones', section: 'participante', login: U.par, title: 'Notificaciones', url: 'participante.html#/notificaciones', waitFor: '.g-notifs',
      description: 'Centro de notificaciones: pagos confirmados o rechazados, recordatorios, sorteos, pozos entregados, cambios de fecha y de turno.',
      actions: ['Leer cada aviso con su polla', 'Ir directo a la acción (pagar, ver comprobante, responder)', 'Marcar todas como leídas']
    },
    {
      id: 'part-unirse', section: 'participante', login: U.par, title: 'Unirme con código', url: 'participante.html#/unirse?code=AROMOS-24', waitFor: '[data-join]',
      setup: async h => { await h.click('.g-tp:not(.is-busy)'); await h.scrollTo('[data-join]', 'center'); },
      description: 'Desde su app, el participante busca una polla por código y se une: elige cupo completo o medio cupo y, si es por orden de llegada, toma uno de los turnos libres en el calendario.',
      actions: ['Elegir cupo completo o medio cupo', 'Tomar un turno libre (por llegada)', 'Aceptar las reglas', 'Enviar la solicitud cuando la polla pide aprobación']
    },
    {
      id: 'part-pozo-recibido', section: 'participante', login: U.par, title: 'Pozo recibido', url: 'participante.html#/', waitFor: panel,
      setup: async h => {
        await h.login('u-org'); await completeFamilia(h);
        await h.click('[data-pay]'); await h.modal(); await h.fill('.modal [name="ref"]', '77120345'); await h.click('.modal [data-submit]', { after: 600 });
        await h.login('u-par'); await h.goto('participante.html#/', '.g-celebrate');
      },
      description: 'Cuando la organización entrega el pozo aparece una tarjeta de celebración con el monto, la fecha y el número de operación, para confirmar que lo recibió y cerrar la ronda.',
      actions: ['Ver el monto y la operación de la entrega', 'Confirmar con un clic que lo recibió', 'Abrir el comprobante de entrega']
    },
    {
      id: 'luis-inicio', section: 'participante', login: U.luis, title: 'Participante atrasado', url: 'participante.html#/', waitFor: panel,
      description: 'La misma app vista por alguien que ya recibió su pozo y dejó de pagar: deuda por una cuota que le cubrieron, reputación "en observación" y el recordatorio de la organización.',
      actions: ['Ver la deuda con quien lo cubrió', 'Pagar las cuotas pendientes', 'Leer los recordatorios recibidos', 'Ver cómo baja su reputación']
    },
    {
      id: 'part-cuenta', section: 'participante', login: U.par, title: 'Mi cuenta', url: 'participante.html#/cuenta', waitFor: '.admin-content form',
      description: 'Datos personales del participante, incluida la cuenta bancaria donde quiere recibir sus pozos.',
      actions: ['Editar nombre, correo y teléfono', 'Registrar RUT y cuenta para recibir pozos', 'Cambiar la contraseña']
    },

    // ================= Organizador/a =================
    {
      id: 'org-resumen', section: 'organizador', login: U.org, title: 'Resumen de la organización', url: 'organizador.html#/', waitFor: '.g-round', mobile: true,
      description: 'Panel de inicio con lo recaudado en el mes, pagos por confirmar, cuotas atrasadas y la plata en caja, una alerta de riesgo cuando alguien que ya recibió deja de pagar, el avance de cada ronda y las próximas entregas.',
      actions: ['Ver la recaudación de cada ronda en curso', 'Ir a entregar un pozo completo', 'Revisar las alertas de riesgo', 'Seguir las pollas en preparación y su siguiente paso', 'Crear una polla nueva']
    },
    {
      id: 'org-pollas', section: 'organizador', login: U.org, title: 'Pollas', url: 'organizador.html#/pollas', waitFor: '.admin-content table',
      description: 'Listado de las pollas que organiza o en las que es tesorera, con código, cuota, frecuencia, cupos ocupados y estado.',
      actions: ['Buscar y filtrar por estado o modalidad', 'Abrir el detalle de una polla', 'Crear una polla nueva', 'Exportar a CSV con la caja de cada una']
    },
    {
      id: 'org-nueva-polla', section: 'organizador', kind: 'modal', from: 'Botón "Nueva polla"', login: U.org, title: 'Nueva polla', url: 'organizador.html#/pollas', waitFor: '[data-new]',
      setup: async h => { await h.click('[data-new]'); await h.modal(); await h.fill('.modal [name="name"]', 'Polla Asado de Fin de Año'); await h.fill('.modal [name="amount"]', '20000'); },
      description: 'Formulario de creación con nombre, ícono, cuota, frecuencia (incluida cada N días), primera fecha, cupos, modalidad de turnos, puja máxima, multa, días de gracia, medios cupos, aprobación, tesorería, datos de pago y reglas. Valida los topes de la plataforma.',
      actions: ['Definir cuota, frecuencia y cupos', 'Elegir sorteo, orden fijo, por llegada o remate', 'Fijar multa y días de gracia', 'Permitir medios cupos o exigir aprobación', 'Nombrar un tesorero/a']
    },
    {
      id: 'org-polla', section: 'organizador', login: U.org, title: 'Polla: ronda actual', url: 'organizador.html#/pollas/p-pega', waitFor: '.g-round', mobile: true,
      description: 'Resumen de una polla en curso: la ronda actual con esperado, recaudado, por confirmar y falta, quién pagó y quién no, las alertas de riesgo, la cuadratura del libro y los datos de la polla.',
      actions: ['Confirmar o rechazar pagos informados', 'Registrar un pago en efectivo', 'Recordar a quien no ha pagado', 'Ver el riesgo de quien ya recibió y no paga', 'Comprobar que el libro cuadra']
    },
    {
      id: 'org-polla-rondas', section: 'organizador', login: U.org, title: 'Polla: rondas', url: 'organizador.html#/pollas/p-pega?tab=rondas', waitFor: '.admin-content table',
      description: 'Todas las rondas con su fecha (marcando las movidas), quién recibe, la recaudación y el estado.',
      actions: ['Ver el avance de cada ronda', 'Detectar fechas cambiadas', 'Abrir el detalle de una ronda']
    },
    {
      id: 'org-ronda', section: 'organizador', login: U.org, title: 'Detalle de ronda', url: 'organizador.html#/pollas/p-pega', waitFor: '.g-round',
      setup: async h => { await h.click('a:has-text("Abrir ronda")'); await h.wait('.g-pays'); },
      description: 'Una ronda en detalle: el pozo, cada cuota con su estado, comprobante, medio de pago y acciones, el historial de estados y los cambios de fecha.',
      actions: ['Confirmar, rechazar o registrar pagos', 'Cubrir la cuota de alguien que no pagó', 'Condonar una multa', 'Cambiar la fecha de la ronda', 'Recordar a los pendientes']
    },
    {
      id: 'org-cubrir', section: 'organizador', kind: 'modal', from: 'Botón "Cubrir" de una cuota atrasada', login: U.org, title: 'Cubrir una cuota', url: 'organizador.html#/pollas/p-familia', waitFor: '.g-round',
      setup: async h => { await h.click('a:has-text("Abrir ronda")'); await h.wait('.g-pays'); await h.click('[data-pact="cover"]'); await h.modal(); },
      description: 'Para no atrasar el pozo, alguien (la organización u otro miembro) adelanta la cuota de quien no pagó. Queda registrada como deuda y se reembolsa al regularizar.',
      actions: ['Elegir quién adelanta la plata', 'Dejar una nota', 'Completar el pozo sin esperar al moroso']
    },
    {
      id: 'org-entregar', section: 'organizador', kind: 'modal', from: 'Botón "Entregar pozo" de una ronda completa', login: U.org, title: 'Entregar el pozo', url: 'organizador.html#/', waitFor: '.g-round',
      setup: async h => { await completeFamilia(h); await h.click('[data-pay]'); await h.modal(); },
      description: 'Entrega del pozo de una ronda completa: muestra lo recaudado, el descuento de remate si lo hay, cuánto recibe cada titular (medio cupo incluido) y sus datos bancarios. Genera el comprobante y abre la siguiente ronda.',
      actions: ['Ver el desglose de lo que se entrega', 'Registrar el medio y el N° de operación', 'Generar el comprobante de entrega', 'Abrir automáticamente la siguiente ronda']
    },
    {
      id: 'org-cambiar-fecha', section: 'organizador', kind: 'modal', from: 'Botón "Cambiar fecha" de una ronda', login: U.org, title: 'Cambiar fecha de ronda', url: 'organizador.html#/pollas/p-pega', waitFor: '.g-round',
      setup: async h => { await h.click('a:has-text("Abrir ronda")'); await h.wait('.g-pays'); await h.click('[data-date]'); await h.modal(); },
      description: 'Mueve la fecha de una ronda (por ejemplo por un feriado) con un motivo obligatorio, y opcionalmente corre todas las siguientes. Todos los miembros reciben el aviso.',
      actions: ['Elegir la nueva fecha', 'Correr las rondas siguientes', 'Explicar el motivo a la gallada']
    },
    {
      id: 'org-polla-miembros', section: 'organizador', login: U.org, title: 'Polla: miembros', url: 'organizador.html#/pollas/p-pega?tab=miembros', waitFor: '.admin-content table',
      description: 'Miembros con su reputación, cupo, turno, cuota, pagos al día y deuda viva, más el historial de reemplazos.',
      actions: ['Ver quién ya recibió y quién debe', 'Reemplazar a alguien que aún no recibe', 'Abrir el detalle de un miembro', 'Exportar a CSV con aportado, recibido y neto']
    },
    {
      id: 'org-miembro', section: 'organizador', login: U.org, title: 'Detalle de miembro', url: 'organizador.html#/pollas/p-pega?tab=miembros', waitFor: '.admin-content table',
      setup: async h => { await h.click('a.g-link:has-text("Luis Henríquez")'); await h.wait('.g-rep'); },
      description: 'Ficha de un miembro dentro de la polla: aportado, recibido, posición neta y deuda, cada cuota con su estado, sus movimientos y su reputación en Gallada. Muestra el aviso de riesgo si corresponde.',
      actions: ['Enviarle un recordatorio', 'Ver su historial de pagos y comprobantes', 'Revisar su reputación en otras pollas', 'Reportarlo a la plataforma']
    },
    {
      id: 'org-reemplazar', section: 'organizador', kind: 'modal', from: 'Botón "Reemplazar" de un miembro', login: U.org, title: 'Reemplazar miembro', url: 'organizador.html#/pollas/p-pega?tab=miembros', waitFor: '.admin-content table',
      setup: async h => { await h.click('tr:has-text("Camila Fuentes") [data-rep]'); await h.modal(); },
      description: 'La persona nueva hereda el cupo, el turno y las cuotas que faltan, y le devuelve a la anterior lo que ya aportó (traspaso registrado en el libro). No se permite si el cupo ya recibió el pozo.',
      actions: ['Elegir una cuenta existente o invitar a alguien nuevo', 'Ver el monto del traspaso', 'Dejar el motivo registrado']
    },
    {
      id: 'org-polla-libro', section: 'organizador', login: U.org, title: 'Polla: libro y cuadratura', url: 'organizador.html#/pollas/p-pega?tab=libro', waitFor: '.g-recon',
      description: 'El libro de la polla: revisión automática de seis cuadraturas, la posición neta de cada persona (aportado vs recibido) y cada movimiento con su saldo de caja acumulado.',
      actions: ['Comprobar que cada ronda entregada quedó en cero', 'Ver la caja y el fondo común de multas', 'Revisar la posición neta y la deuda de cada persona', 'Exportar el libro a CSV']
    },
    {
      id: 'org-polla-turnos-remate', section: 'organizador', login: U.org, title: 'Polla: remate', url: 'organizador.html#/pollas/p-feria?tab=turnos', waitFor: '.g-turns',
      description: 'Turnos de una polla de remate: cada ronda adjudicada con su descuento y acceso a las pujas de la ronda abierta.',
      actions: ['Ver quién se adjudicó cada ronda y con qué descuento', 'Abrir las pujas de la ronda actual', 'Revisar las solicitudes de cambio']
    },
    {
      id: 'org-ronda-remate', section: 'organizador', login: U.org, title: 'Pujas de una ronda', url: 'organizador.html#/pollas/p-feria?tab=turnos', waitFor: '.g-turns',
      setup: async h => { await h.click('a:has-text("Ver pujas")'); await h.wait('[data-award]'); await h.scrollTo('.admin-content table >> nth=1', 'center'); },
      description: 'Ronda de remate abierta con todas las pujas ordenadas por descuento y cuánto recibiría cada cupo. Al adjudicar gana la mejor puja; si no hay, se sortea con semilla.',
      actions: ['Comparar las pujas', 'Adjudicar la ronda', 'Ver la puja máxima permitida']
    },
    {
      id: 'org-sorteo', section: 'organizador', login: U.org, title: 'Sorteo verificable', url: 'organizador.html#/pollas/p-vacaciones?tab=turnos', waitFor: '[data-draw]',
      description: 'Con los cupos completos, la organización hace el sorteo en vivo: la lista ordenada por código se baraja con una semilla pública que cualquiera puede repetir.',
      actions: ['Ver la lista de cupos que entra al sorteo', 'Realizar el sorteo en vivo con animación', 'Entender cómo se verifica']
    },
    {
      id: 'org-sorteo-hecho', section: 'organizador', login: U.org, title: 'Sorteo realizado', url: 'organizador.html#/pollas/p-vacaciones?tab=turnos', waitFor: '[data-draw]',
      setup: async h => { await h.click('[data-draw]'); await h.modal(); await h.click('.modal [data-ok]', { after: 1500 }); await h.wait('.g-draw-seed'); },
      description: 'Resultado del sorteo con el orden de turnos y la semilla publicada. Cada miembro recibe una notificación con su turno y el enlace para verificarlo.',
      actions: ['Ver el orden final de turnos', 'Copiar la semilla', 'Verificar el sorteo en el sitio público', 'Iniciar la polla']
    },
    {
      id: 'org-orden-fijo', section: 'organizador', login: U.org, title: 'Orden fijo de turnos', url: 'organizador.html#/pollas/p-cumple?tab=turnos', waitFor: '[data-order]',
      description: 'En las pollas de orden fijo los cupos se ordenan arrastrando o con flechas (también en celular) y se guarda el orden acordado.',
      actions: ['Arrastrar cupos para ordenarlos', 'Subir o bajar con flechas', 'Guardar el orden']
    },
    {
      id: 'org-inscripcion', section: 'organizador', login: U.org, title: 'Polla en inscripción', url: 'organizador.html#/pollas/p-aromos', waitFor: '.g-checks',
      description: 'Lista de verificación antes de partir (inscripciones, cupos completos, solicitudes, turnos y datos de pago), los cupos tomados con sus turnos y el código para invitar.',
      actions: ['Ver qué falta para iniciar', 'Compartir la invitación', 'Revisar los turnos elegidos por llegada', 'Iniciar la polla cuando todo está listo']
    },
    {
      id: 'org-invitar', section: 'organizador', kind: 'modal', from: 'Botón "Invitar"', login: U.org, title: 'Invitar a la polla', url: 'organizador.html#/pollas/p-aromos', waitFor: '[data-invite]',
      setup: async h => { await h.click('[data-invite]'); await h.modal(); },
      description: 'Código y enlace de invitación con un mensaje listo para WhatsApp que resume cuota, frecuencia y pozo.',
      actions: ['Copiar el código', 'Copiar el enlace', 'Copiar el mensaje para WhatsApp']
    },
    {
      id: 'org-solicitudes-miembros', section: 'organizador', login: U.org, title: 'Solicitudes para unirse', url: 'organizador.html#/pollas/p-aromos?tab=miembros', waitFor: '.g-req',
      description: 'Cuando la polla exige aprobación, cada solicitud muestra la reputación de la persona y su historial antes de aceptarla o rechazarla. Incluye el medio cupo que espera pareja.',
      actions: ['Aceptar o rechazar con un mensaje', 'Ver reputación y pagos a tiempo de quien pide', 'Sumar a alguien manualmente', 'Retirar a alguien antes de partir']
    },
    {
      id: 'org-polla-ajustes', section: 'organizador', login: U.org, title: 'Polla: ajustes y cierre', url: 'organizador.html#/pollas/p-pega?tab=ajustes', waitFor: '[data-cancel]',
      description: 'Datos y reglas de la polla, historial de estados y las acciones de ciclo de vida: volver a borrador, finalizar repartiendo el fondo, terminar antes con liquidación o eliminar.',
      actions: ['Editar reglas, datos de pago, multa y tesorería', 'Finalizar y repartir el fondo común', 'Terminar antes y liquidar', 'Reportar un problema']
    },
    {
      id: 'org-terminar', section: 'organizador', kind: 'modal', from: 'Botón "Terminar antes"', login: U.org, title: 'Terminar antes (liquidación)', url: 'organizador.html#/pollas/p-pega?tab=ajustes', waitFor: '[data-cancel]',
      setup: async h => { await h.click('[data-cancel]'); await h.modal(); },
      description: 'Vista previa de la liquidación: la caja disponible se devuelve a quienes aportaron más de lo que recibieron, en proporción a lo que se les debe, y queda registrada la deuda de quienes ya recibieron.',
      actions: ['Ver cuánto se devuelve a cada persona', 'Ver quién queda debiendo', 'Indicar el motivo del término']
    },
    {
      id: 'org-polla-calendario', section: 'organizador', login: U.org, title: 'Polla: calendario', url: 'organizador.html#/pollas/p-pega?tab=calendario', waitFor: '.g-cal',
      description: 'Calendario mensual de la polla con cada ronda, quién recibe y su estado.',
      actions: ['Navegar mes a mes', 'Ver quién recibe cada fecha', 'Abrir la ronda de cada día']
    },
    {
      id: 'org-polla-muro', section: 'organizador', login: U.org, title: 'Polla: muro', url: 'organizador.html#/pollas/p-pega?tab=muro', waitFor: '.g-wall',
      description: 'Muro del grupo con la opción de publicar avisos fijados.',
      actions: ['Publicar un aviso fijado', 'Fijar o desfijar mensajes', 'Conversar con la gallada']
    },
    {
      id: 'org-pagos', section: 'organizador', login: U.org, title: 'Pagos por confirmar', url: 'organizador.html#/pagos', waitFor: '.admin-content table',
      description: 'Bandeja de pagos informados de todas sus pollas con monto, número de operación y comprobante adjunto, más las deudas por cuotas cubiertas por regularizar.',
      actions: ['Confirmar uno a uno o varios a la vez', 'Rechazar con un motivo', 'Regularizar una deuda cuando la persona avisa que pagó']
    },
    {
      id: 'org-riesgo', section: 'organizador', login: U.org, title: 'Morosos y riesgo', url: 'organizador.html#/riesgo', waitFor: '.g-risks',
      description: 'Alertas de riesgo (alto: ya recibió y no paga; medio: cuotas impagas; bajo: reputación baja con turno cercano) y todas las cuotas atrasadas con su deuda.',
      actions: ['Priorizar a quien ya recibió', 'Recordar por WhatsApp', 'Cubrir una cuota', 'Abrir la ficha del miembro']
    },
    {
      id: 'org-recordar', section: 'organizador', kind: 'modal', from: 'Botón 📣 de una cuota atrasada', login: U.org, title: 'Recordar a un miembro', url: 'organizador.html#/riesgo', waitFor: '.g-risks',
      setup: async h => { await h.click('[data-pact="remind"]'); await h.modal(); },
      description: 'Vista previa del mensaje con los datos de la persona (monto, fecha, deuda) y la plantilla elegida, como burbuja de WhatsApp o correo.',
      actions: ['Elegir la plantilla', 'Ver el mensaje personalizado', 'Enviarlo (simulado)']
    },
    {
      id: 'org-solicitudes', section: 'organizador', login: U.org, title: 'Solicitudes', url: 'organizador.html#/cambios', waitFor: '.admin-content table',
      description: 'Cambios de turno que ya aceptó el otro cupo y esperan aprobación, más las inscripciones por aprobar de todas sus pollas.',
      actions: ['Aprobar un cambio de turno (se intercambian las rondas)', 'Rechazarlo con un motivo', 'Aceptar inscripciones pendientes']
    },
    {
      id: 'org-recordatorios', section: 'organizador', login: U.org, title: 'Recordatorios', url: 'organizador.html#/recordatorios', waitFor: '.g-bubble',
      description: 'Envío masivo de recordatorios: elige la polla y la plantilla, marca a quién (por defecto quienes están atrasados o vencen en 7 días) y ve la vista previa personalizada. Abajo, el historial de envíos.',
      actions: ['Elegir polla y plantilla', 'Marcar o desmarcar destinatarios', 'Ver la vista previa por persona', 'Revisar y exportar el historial']
    },
    {
      id: 'org-calendario', section: 'organizador', login: U.org, title: 'Calendario', url: 'organizador.html#/calendario', waitFor: '.g-cal',
      description: 'Calendario con todas las rondas de sus pollas, coloreadas por estado: pozo completo, con atrasos o entregadas.',
      actions: ['Navegar mes a mes', 'Ver qué pozos vienen', 'Abrir la ronda de cada evento']
    },
    {
      id: 'org-notificaciones', section: 'organizador', login: U.org, title: 'Notificaciones', url: 'organizador.html#/notificaciones', waitFor: '.g-notifs',
      description: 'Avisos para la organización: pagos por confirmar, pozos completos, solicitudes, pujas y cambios de turno.',
      actions: ['Ir directo a confirmar o entregar', 'Ver de qué polla es cada aviso', 'Marcar todas como leídas']
    },

    // ================= Tesorero/a =================
    {
      id: 'tes-resumen', section: 'tesorero', login: U.tes, title: 'Resumen del tesorero', url: 'organizador.html#/', waitFor: '.g-round',
      description: 'El mismo panel acotado a las pollas donde es tesorero: rondas en curso, pagos por confirmar y alertas.',
      actions: ['Ver la recaudación de sus pollas', 'Ir a confirmar pagos', 'Revisar alertas de riesgo']
    },
    {
      id: 'tes-polla', section: 'tesorero', login: U.tes, title: 'Polla vista por tesorería', url: 'organizador.html#/pollas/p-feria', waitFor: '.g-round',
      description: 'Detalle de una polla con los permisos de tesorería: confirma pagos, entrega pozos y recuerda, pero no edita reglas ni cierra la polla.',
      actions: ['Confirmar pagos y registrar efectivo', 'Entregar el pozo', 'Enviar recordatorios', 'Consultar el libro']
    },
    {
      id: 'tes-pagos', section: 'tesorero', login: U.tes, title: 'Pagos por confirmar', url: 'organizador.html#/pagos', waitFor: '.admin-content .card',
      description: 'Bandeja de pagos informados de las pollas en las que lleva la tesorería.',
      actions: ['Confirmar varios pagos a la vez', 'Rechazar con motivo', 'Regularizar deudas']
    },

    // ================= Plataforma =================
    {
      id: 'admin-resumen', section: 'admin', login: U.admin, title: 'Resumen de la plataforma', url: 'admin.html#/', waitFor: '.k-kpis', mobile: true,
      description: 'Salud de Gallada: pollas en curso, personas, plata en circulación, aportes del mes, morosidad y disputas abiertas, la revisión de que todos los libros cuadran, gráficos y quienes están en riesgo alto.',
      actions: ['Ver la morosidad de la plataforma', 'Confirmar que los libros de todas las pollas cuadran', 'Revisar aportes por mes y pollas por modalidad', 'Detectar riesgo alto en cualquier polla']
    },
    {
      id: 'admin-pollas', section: 'admin', login: U.admin, title: 'Todas las pollas', url: 'admin.html#/pollas', waitFor: '.admin-content table',
      description: 'Supervisión de todas las pollas con organizadora, cuota, modalidad, estado, caja y si su libro cuadra.',
      actions: ['Buscar y filtrar por modalidad y estado', 'Ver la caja de cada polla', 'Abrir una polla en detalle', 'Exportar a CSV']
    },
    {
      id: 'admin-polla', section: 'admin', login: U.admin, title: 'Polla en detalle', url: 'admin.html#/pollas/p-pega', waitFor: '.g-recon',
      description: 'Ficha de supervisión con la ronda actual, la cuadratura del libro, las posiciones de cada persona, los turnos y el historial.',
      actions: ['Revisar la cuadratura', 'Ver posiciones y deudas', 'Abrir la polla en el panel de organización']
    },
    {
      id: 'admin-cancelada', section: 'admin', login: U.admin, title: 'Polla terminada antes', url: 'organizador.html#/pollas/p-colectivo', waitFor: '.admin-content table',
      description: 'Una polla que terminó antes de tiempo, con la liquidación registrada: cuánto aportó y recibió cada socio, cuánto se le devolvió y quién quedó debiendo.',
      actions: ['Ver la liquidación por persona', 'Leer el motivo del término', 'Consultar el libro de la polla']
    },
    {
      id: 'admin-finalizada', section: 'admin', login: U.admin, title: 'Polla finalizada', url: 'organizador.html#/pollas/p-club?tab=libro', waitFor: '.g-recon',
      description: 'Libro de una polla terminada: todas las rondas entregadas, el fondo de multas repartido y la caja en cero.',
      actions: ['Comprobar que la caja quedó en cero', 'Ver el reparto del fondo común', 'Revisar posiciones finales']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content table',
      description: 'Cuentas de la plataforma con su rol, comuna y reputación.',
      actions: ['Crear, editar o desactivar cuentas', 'Cambiar el rol', 'Ver la reputación de cada persona', 'Exportar a CSV']
    },
    {
      id: 'admin-disputas', section: 'admin', login: U.admin, title: 'Disputas y reportes', url: 'admin.html#/disputas', waitFor: '.admin-content table',
      description: 'Reportes levantados por participantes u organizaciones, con su motivo, polla, quién reporta y estado.',
      actions: ['Filtrar por motivo y estado', 'Abrir el detalle de un reporte', 'Cambiar su estado con la resolución']
    },
    {
      id: 'admin-disputa', section: 'admin', login: U.admin, title: 'Detalle de disputa', url: 'admin.html#/disputas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.admin-content tbody tr >> nth=0'); await h.wait('.k-timeline'); },
      description: 'Ficha del reporte con su historial y el contexto de la polla (caja, si el libro cuadra y la reputación de la persona reportada).',
      actions: ['Pasar a revisión, resolver o descartar con nota', 'Ver la reputación del reportado', 'Abrir el libro de la polla']
    },
    {
      id: 'admin-plantillas', section: 'admin', login: U.admin, title: 'Plantillas de mensajes', url: 'admin.html#/plantillas', waitFor: '.admin-content table',
      description: 'Plantillas de WhatsApp y correo que usan los recordatorios, con variables como {nombre}, {monto} o {deuda} y su vista previa.',
      actions: ['Crear o editar plantillas', 'Activar o desactivar cada una', 'Ver la vista previa con datos de ejemplo']
    },
    {
      id: 'admin-config', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/config', waitFor: '.admin-content form',
      description: 'Eslogan y contacto del sitio, y reglas de la plataforma que se validan en cada polla: máximo de cupos, cuota mínima, puja máxima, gracia y multa sugeridas.',
      actions: ['Editar eslogan y contacto', 'Fijar topes de cupos, cuota y puja', 'Exportar todos los datos', 'Restablecer los datos demo']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Registro de las últimas 300 acciones: pagos, entregas, sorteos, cambios de fecha y turno, recordatorios, inscripciones y configuración.',
      actions: ['Buscar y filtrar por acción', 'Ver quién hizo qué y cuándo', 'Exportar a CSV']
    }
  ]
};
