// Biblioteca de vistas de Autoplaza Pacífico (/automotora).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { cliente: 'u-cli', vendedor: 'u-v1', gerente: 'u-ger', analista: 'u-cred', asesor: 'u-pv1', admin: 'u-admin' };

// Emite como ejecutiva una cotización con 5 % de descuento (sobre su margen de 3 %) para que
// gerencia tenga algo que aprobar; la semilla parte sin cotizaciones pendientes.
async function pendingQuote(h) {
  await h.login(U.vendedor);
  await h.goto('vendedor.html#/lead/l-cam', '.timeline');
  await h.click('[data-quote]');
  await h.modal();
  await h.fill('.modal #q-d', '5');
  await h.click('.modal [data-ok]', { after: 500 });
}
const firstRow = '.admin-content tbody tr >> nth=0';

module.exports = {
  dir: 'automotora',
  name: 'Autoplaza Pacífico',
  kind: 'Automotora 0 km',
  theme: 'aqua',
  description: 'Concesionario multimarca de autos nuevos con sitio público (configurador, crédito, tasación, test drive y posventa), cuenta del cliente y apps internas para ventas, gerencia, crédito, taller y administración.',
  accounts: {
    'u-cli': { name: 'Camila Fuentes Rojas', role: 'Cliente', email: 'cliente@autoplaza.cl', password: 'cliente123' },
    'u-v1': { name: 'Catalina Muñoz', role: 'Ejecutivo de ventas', email: 'vendedor@autoplaza.cl', password: 'vende123' },
    'u-ger': { name: 'Rodrigo Valenzuela', role: 'Gerente comercial', email: 'gerente@autoplaza.cl', password: 'gerente123' },
    'u-cred': { name: 'Ignacio Pérez', role: 'Analista de crédito', email: 'credito@autoplaza.cl', password: 'credito123' },
    'u-pv1': { name: 'Paula Herrera', role: 'Asesor de servicio', email: 'posventa@autoplaza.cl', password: 'servicio123' },
    'u-admin': { name: 'Sofía Lagos', role: 'Administrador', email: 'admin@autoplaza.cl', password: 'admin123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Lo que ve cualquier visitante, sin iniciar sesión.' },
    { id: 'cliente', label: 'Cliente', desc: 'Cuenta personal del comprador: autos, cotizaciones, crédito y taller.' },
    { id: 'vendedor', label: 'Ejecutivo de ventas', desc: 'App de ventas: pipeline, ficha del lead y cotización formal.' },
    { id: 'gerente', label: 'Gerente comercial', desc: 'Panel comercial: catálogo, precios, inventario, leads, ventas y contenido.' },
    { id: 'analista', label: 'Analista de crédito', desc: 'App de crédito automotriz: bandeja, scoring y resolución.' },
    { id: 'asesor', label: 'Asesor de servicio', desc: 'App del taller y módulos de posventa del panel.' },
    { id: 'admin', label: 'Administrador', desc: 'Configuración del sistema: tasas, sucursales, usuarios y bitácora.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Aqua" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '.billboard',
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
      id: 'portada', section: 'publico', title: 'Portada', url: 'index.html#/', waitFor: '.billboard', mobile: true,
      description: 'Página de inicio del concesionario con un carrusel de modelos destacados, accesos rápidos a las herramientas y las campañas vigentes. Todo su contenido se administra desde el panel.',
      actions: ['Recorrer el carrusel y entrar al configurador o al test drive de cada modelo', 'Ir directo al simulador de crédito, la tasación, el test drive o la mantención', 'Filtrar el catálogo por una de las 8 marcas', 'Ver destacados, campañas con su vigencia y próximos lanzamientos', 'Revisar las 3 sucursales con dirección, horario y marcas']
    },
    {
      id: 'portada-avisame', section: 'publico', kind: 'modal', from: 'Botón "Avísame" de un lanzamiento en la portada', title: 'Aviso de lanzamiento', url: 'index.html#/', waitFor: '.billboard',
      setup: async h => { await h.scrollTo('.launches-sec', 'center'); await h.click('[data-notify]'); await h.modal(); },
      description: 'Formulario para pre-registrarse a un modelo que aún no llega. Cada registro entra como lead de lanzamiento al CRM de ventas.',
      actions: ['Dejar nombre, correo y teléfono', 'Elegir la sucursal preferida', 'Quedar en la lista de aviso del modelo', 'Generar un lead que ve el equipo de ventas']
    },
    {
      id: 'catalogo', section: 'publico', title: 'Catálogo de modelos', url: 'index.html#/modelos', waitFor: '.model-card', mobile: true,
      description: 'Listado de todos los modelos 0 km con precio desde, bonos y disponibilidad. Los filtros se combinan y el resultado se actualiza al instante.',
      actions: ['Filtrar por segmento, marca, motorización y transmisión', 'Ajustar el precio máximo con un deslizador y ordenar por precio o bono', 'Mostrar solo modelos con stock inmediato', 'Cambiar entre vista de grilla y de lista', 'Marcar hasta 3 modelos para compararlos']
    },
    {
      id: 'comparador', section: 'publico', title: 'Comparador de modelos', url: 'index.html#/comparar', waitFor: '.cmp-table',
      setup: async h => { await h.select('[data-slot="2"]', 'sportage'); await h.wait('.cmp-table'); },
      description: 'Tabla lado a lado de hasta 3 modelos. En cada fila se destaca el mejor valor.',
      actions: ['Elegir o cambiar los modelos a comparar', 'Comparar precio, bonos y precio final con bonos', 'Revisar motor, potencia, consumo, maletero y garantía', 'Ver versiones, equipamiento tope y disponibilidad', 'Pasar al configurador de cualquiera de ellos']
    },
    {
      id: 'configurador', section: 'publico', title: 'Configurador: versión', url: 'index.html#/modelo/tucson', waitFor: '.configurator', mobile: true,
      description: 'Ficha interactiva de cada modelo para armar el auto paso a paso (versión, color, llantas, packs y accesorios). El resumen de precio con bonos se recalcula con cada elección.',
      actions: ['Comparar versiones con motor, potencia, consumo y equipamiento', 'Ver el auto en vista lateral, frontal o trasera y girarlo', 'Revisar el precio final con bonos de financiamiento y retoma', 'Ver la disponibilidad por sucursal', 'Guardar, compartir o imprimir la configuración']
    },
    {
      id: 'configurador-color', section: 'publico', title: 'Configurador: color', url: 'index.html#/modelo/tucson?paso=color', waitFor: '.configurator',
      setup: async h => { await h.click('.swatch[data-v="c3"]'); },
      description: 'Paso de pintura del configurador: el auto se recolorea en la ilustración y el recargo del color se suma al precio.',
      actions: ['Elegir entre los colores disponibles del modelo', 'Ver el recargo de cada pintura', 'Cambiar la vista del auto o activar el giro 360°', 'Avanzar o volver entre los pasos']
    },
    {
      id: 'configurador-accesorios', section: 'publico', title: 'Configurador: accesorios', url: 'index.html#/modelo/tucson?paso=acc', waitFor: '.configurator',
      setup: async h => { await h.click('label.opt:has(input[value="acc-barras"])'); },
      description: 'Último paso del configurador con los accesorios que aplican al modelo, agrupados por categoría. Cada uno suma su precio al resumen.',
      actions: ['Agregar o quitar accesorios por categoría', 'Ver cómo cambia el total y la cuota estimada', 'Activar el bono de financiamiento o de retoma en el resumen', 'Solicitar cotización o simular el crédito con esta configuración']
    },
    {
      id: 'configurador-compartir', section: 'publico', kind: 'modal', from: 'Botón "Compartir" del configurador', title: 'Compartir configuración', url: 'index.html#/modelo/tucson', waitFor: '.configurator',
      setup: async h => { await h.click('[data-share]'); await h.modal(); },
      description: 'Ventana con un enlace que reproduce exactamente la configuración armada (versión, color, llantas, packs y accesorios).',
      actions: ['Copiar el enlace al portapapeles', 'Enviarlo a otra persona para que vea el mismo auto', 'Abrirlo más tarde para seguir editando']
    },
    {
      id: 'ficha-tecnica', section: 'publico', title: 'Ficha técnica imprimible', url: 'index.html#/modelo/tucson', waitFor: '.configurator',
      setup: async h => { await h.click('[data-summary] a[href^="#/ficha/"]'); await h.wait('.spec-page .paper'); return { url: h.here() }; },
      description: 'Documento listo para imprimir o guardar en PDF con las tres vistas del auto, especificaciones, equipamiento de serie y el detalle de precio de la configuración.',
      actions: ['Revisar especificaciones y equipamiento de la versión', 'Ver el desglose de precio con bonos y regalos', 'Imprimir o guardar como PDF', 'Volver al configurador con la misma configuración']
    },
    {
      id: 'lanzamiento', section: 'publico', title: 'Página de lanzamiento', url: 'index.html#/modelo/ev3', waitFor: '.launch-hero',
      description: 'Página de un modelo que todavía no está a la venta, con precio estimado, fecha de llegada y cuenta regresiva.',
      actions: ['Ver precio estimado y fecha de lanzamiento', 'Pre-registrarse con nombre y correo', 'Quedar como lead de lanzamiento para el equipo de ventas']
    },
    {
      id: 'ofertas', section: 'publico', title: 'Ofertas y bonos', url: 'index.html#/ofertas', waitFor: '.offer-card',
      description: 'Todas las campañas vigentes ordenadas por monto, con su tipo, alcance y fecha de término. Vienen del módulo de campañas del panel.',
      actions: ['Filtrar por tipo de campaña (bono directo, financiamiento, retoma, regalo)', 'Ver a qué modelos o marcas aplica cada bono', 'Ver cuántos días quedan de cada campaña', 'Configurar el modelo en oferta o tasar un usado']
    },
    {
      id: 'financiamiento', section: 'publico', title: 'Simulador de crédito', url: 'index.html#/financiamiento', waitFor: '.fin-result', mobile: true,
      description: 'Simulador que compara contado, crédito convencional, Compra Inteligente y leasing para el modelo y versión elegidos, con cuota, CAE y costo total.',
      actions: ['Elegir modelo, versión y forma de pago', 'Ajustar el pie con un deslizador y elegir el plazo', 'Usar una tasación como parte del pie', 'Comparar cuota, CAE y costo total entre plazos', 'Pasar a la pre-evaluación en línea']
    },
    {
      id: 'pre-evaluacion', section: 'publico', title: 'Pre-evaluación de crédito', url: 'index.html#/financiamiento', waitFor: '.fin-result',
      setup: async h => {
        await h.fill('#p-rut', '17.845.321-1'); await h.fill('#p-name', 'Valentina Rojas Muñoz'); await h.fill('#p-email', 'valentina.rojas@demo.cl');
        await h.fill('#p-phone', '+56 9 7123 4567'); await h.fill('#p-renta', '1850000'); await h.check('[data-pre] input[name="ok"]');
        await h.click('[data-pre] button.btn-primary'); await h.wait('.pre-result'); await h.scrollTo('#preeval', 'start', -10);
      },
      description: 'Formulario de evaluación preliminar con RUT y renta líquida que entrega un puntaje y un resultado inmediato. La solicitud queda en la bandeja del analista de crédito.',
      actions: ['Ingresar RUT (se valida el dígito verificador), renta y situación laboral', 'Declarar antigüedad laboral y otras deudas', 'Ver el puntaje y la carga financiera estimada', 'Enviar la solicitud al analista para su confirmación']
    },
    {
      id: 'tasacion', section: 'publico', title: 'Tasación de usados', url: 'index.html#/tasacion', waitFor: '.trade-layout [data-form]',
      description: 'Formulario para tasar el auto actual del cliente y usarlo en parte de pago. Muestra el bono retoma vigente.',
      actions: ['Ingresar patente, marca, modelo, año y kilometraje', 'Indicar número de dueños y estado general', 'Declarar si tiene mantenciones al día', 'Dejar los datos para recibir la oferta']
    },
    {
      id: 'tasacion-resultado', section: 'publico', title: 'Resultado de la tasación', url: 'index.html#/tasacion', waitFor: '.trade-layout [data-form]',
      setup: async h => {
        await h.fill('#t-pat', 'KJTR45'); await h.select('#t-brand', 'Toyota'); await h.fill('#t-model', 'Yaris'); await h.select('#t-year', '2019');
        await h.fill('#t-km', '62000'); await h.click('label.cond:has(input[value="excelente"])'); await h.fill('#t-name', 'Martín Soto Araya'); await h.fill('#t-email', 'martin.soto@demo.cl');
        await h.click('[data-form] button.btn-primary'); await h.wait('.trade-result'); await h.scrollTo('.trade-layout', 'start', -90);
      },
      description: 'Rango de precio estimado según año, kilometraje y estado, más el bono retoma al comprar un 0 km. La tasación queda registrada para que el equipo haga la oferta firme.',
      actions: ['Ver el rango estimado de su auto', 'Sumar el bono retoma vigente', 'Usar la tasación como pie en el simulador de crédito', 'Recibir una oferta firme tras la inspección']
    },
    {
      id: 'test-drive', section: 'publico', title: 'Agendar test drive', url: 'index.html#/test-drive', waitFor: '[data-slots] .slot',
      description: 'Agenda de pruebas de manejo en cuatro pasos: modelo, sucursal, día y hora, y datos de contacto. Solo se ofrecen los horarios libres.',
      actions: ['Elegir el modelo a probar', 'Elegir la sucursal que vende esa marca', 'Escoger día y horario disponible', 'Confirmar con sus datos y licencia vigente']
    },
    {
      id: 'test-drive-confirmado', section: 'publico', title: 'Test drive confirmado', url: 'index.html#/test-drive', waitFor: '[data-slots] .slot',
      setup: async h => {
        await h.select('select[name="modelId"]', 'tucson'); await h.click('[data-days] .day-btn:nth-child(2)'); await h.click('[data-slots] .slot:not([disabled]) >> nth=2');
        await h.fill('[data-form] [name="name"]', 'Martín Soto Araya'); await h.fill('[data-form] [name="email"]', 'martin.soto@demo.cl'); await h.fill('[data-form] [name="phone"]', '+56 9 6543 2109');
        await h.check('[data-form] [name="license"]'); await h.click('[data-form] button.btn-primary'); await h.wait('.ticket'); await h.scrollTo('.ticket', 'center');
      },
      description: 'Comprobante de la prueba de manejo con código, modelo, sucursal y horario. La solicitud crea un lead asignado a un ejecutivo.',
      actions: ['Ver el código y el detalle de la reserva', 'Saber qué ejecutivo lo atenderá', 'Revisar o cancelar el test drive desde su cuenta']
    },
    {
      id: 'cotizar', section: 'publico', title: 'Solicitar cotización', url: 'index.html#/cotizar', waitFor: '.booking-layout [data-form]',
      description: 'Formulario de solicitud de cotización formal con el resumen del auto elegido y su precio referencial con bonos.',
      actions: ['Elegir modelo y versión (o traer una configuración guardada)', 'Indicar forma de pago y si deja un auto en parte de pago', 'Dejar datos de contacto y un mensaje', 'Ver el precio referencial antes de enviar']
    },
    {
      id: 'cotizar-enviada', section: 'publico', title: 'Cotización solicitada', url: 'index.html#/cotizar', waitFor: '.booking-layout [data-form]',
      setup: async h => {
        await h.fill('[data-form] [name="name"]', 'Martín Soto Araya'); await h.fill('[data-form] [name="email"]', 'martin.soto@demo.cl'); await h.fill('[data-form] [name="phone"]', '+56 9 6543 2109');
        await h.click('[data-form] button.btn-primary'); await h.wait('.ticket'); await h.scrollTo('.ticket', 'center');
      },
      description: 'Confirmación de la solicitud con el ejecutivo asignado automáticamente según las reglas de asignación de la sucursal.',
      actions: ['Ver qué ejecutivo preparará la cotización', 'Saber el plazo de respuesta', 'Seguir la cotización desde su cuenta']
    },
    {
      id: 'stock', section: 'publico', title: 'Stock disponible', url: 'index.html#/stock', waitFor: '.stock-card',
      description: 'Unidades físicas en los patios y en tránsito desde fábrica, agrupadas por modelo, con versión, color, sucursal y fecha estimada de llegada.',
      actions: ['Filtrar por sucursal, marca y modelo', 'Separar entrega inmediata de unidades en tránsito', 'Ver versión, color y sucursal de cada unidad', 'Ir al configurador del modelo']
    },
    {
      id: 'sucursales', section: 'publico', title: 'Sucursales', url: 'index.html#/sucursales', waitFor: '.showroom-row',
      description: 'Las tres sucursales con dirección, horario, teléfono, marcas que venden y ocupación del taller del día.',
      actions: ['Ver dirección, horario y teléfono de cada sucursal', 'Revisar qué marcas atiende cada una', 'Ver la ocupación del taller hoy', 'Agendar test drive o taller, o ver el stock de la sucursal']
    },
    {
      id: 'posventa-agendar', section: 'publico', title: 'Posventa: agendar servicio', url: 'index.html#/posventa', waitFor: '[data-plan] h3',
      description: 'Agenda del taller con la pauta de mantención recomendada según marca y kilometraje, con precio fijo y lista de trabajos.',
      actions: ['Ingresar patente, marca, modelo, año y kilometraje', 'Elegir el tipo de servicio (mantención, diagnóstico, recall, carrocería)', 'Ver la pauta recomendada, su precio y la lista de precios de la marca', 'Elegir taller, día y hora libre', 'Confirmar la hora con sus datos']
    },
    {
      id: 'posventa-recall', section: 'publico', title: 'Posventa: consulta de recall', url: 'index.html#/posventa/recall', waitFor: '[data-form]',
      setup: async h => { await h.fill('[data-form] input[name="q"]', 'SKTR42'); await h.click('[data-form] button.btn-primary'); await h.wait('[data-res] .card'); },
      description: 'Buscador de campañas de seguridad por patente o VIN. Si la patente no está registrada se consulta por marca, modelo y año.',
      actions: ['Buscar por patente o VIN', 'Ver si el auto tiene una campaña pendiente y en qué consiste', 'Revisar las campañas activas', 'Agendar la atención del recall sin costo']
    },
    {
      id: 'posventa-garantia', section: 'publico', title: 'Posventa: garantía', url: 'index.html#/posventa/garantia', waitFor: '[data-form]',
      setup: async h => { await h.fill('[data-form] input[name="q"]', 'SKTR42'); await h.click('[data-form] button.btn-primary'); await h.wait('[data-res] .card'); },
      description: 'Tabla de garantía de fábrica por marca y consulta del estado de garantía de un auto por patente.',
      actions: ['Ver años, kilometraje y pauta de garantía por marca', 'Consultar si un auto mantiene la garantía y hasta cuándo', 'Revisar qué cubre y qué no cubre la garantía']
    },
    {
      id: 'posventa-repuestos', section: 'publico', title: 'Posventa: repuestos y accesorios', url: 'index.html#/posventa/repuestos', waitFor: '[data-list] [data-add]',
      setup: async h => { await h.click('[data-cat="Frenos"]'); await h.click('[data-list] [data-add] >> nth=0'); await h.click('[data-list] [data-add] >> nth=1'); },
      description: 'Catálogo de repuestos y accesorios con stock por pieza. Se arma una solicitud de cotización que llega al panel de posventa.',
      actions: ['Buscar repuestos o filtrar por categoría', 'Ver precio referencial y stock', 'Agregar piezas a la solicitud', 'Enviar la solicitud con sus datos']
    },
    {
      id: 'posventa-carroceria', section: 'publico', title: 'Posventa: desabolladura y pintura', url: 'index.html#/posventa/carroceria', waitFor: '[data-svg] .panel-zone',
      setup: async h => { await h.click('[data-chips] [data-part="puerta_del"]'); await h.click('[data-chips] [data-part="capo"]'); await h.click('[data-sev="capo"][data-v="grave"]'); },
      description: 'Presupuesto estimado de carrocería: se marcan las piezas dañadas sobre la ilustración del auto y la gravedad de cada una.',
      actions: ['Marcar piezas dañadas tocando el auto o con chips', 'Indicar la gravedad de cada daño', 'Ver el rango de presupuesto estimado', 'Enviar la solicitud para agendar la inspección']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Página de ingreso para clientes y equipo. Incluye cuentas de prueba para entrar con un clic a cada rol.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como cliente, ejecutivo, gerente, analista, asesor o administrador', 'Crear una cuenta de cliente nueva', 'Volver al sitio']
    },
    {
      id: 'cuenta-ingresar', section: 'publico', title: 'Mi cuenta (sin sesión)', url: 'index.html#/cuenta', waitFor: '[data-reg]',
      description: 'Lo que ve un visitante al abrir "Mi cuenta" sin haber ingresado: acceso al login y registro de cliente nuevo.',
      actions: ['Ir a ingresar con su cuenta', 'Crear una cuenta con nombre, RUT, correo y contraseña', 'Ver los datos de la cuenta demo de cliente']
    },

    // ================= Cliente =================
    {
      id: 'cuenta-autos', section: 'cliente', login: U.cliente, title: 'Mis autos', url: 'index.html#/cuenta/autos', waitFor: '.my-car', mobile: true,
      description: 'Inicio de la cuenta del cliente con sus autos registrados, la próxima mantención, el estado de la garantía y alertas de recall pendientes.',
      actions: ['Ver próxima mantención por kilometraje o fecha', 'Revisar garantía y última mantención', 'Agendar la atención de un recall pendiente', 'Actualizar el kilometraje', 'Ver el padrón o tasar el auto para renovarlo']
    },
    {
      id: 'cuenta-padron', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Padrón" en Mis autos', title: 'Padrón del vehículo', url: 'index.html#/cuenta/autos', waitFor: '.my-car',
      setup: async h => { await h.click('[data-padron]'); await h.modal(); },
      description: 'Certificado de inscripción simulado del vehículo con patente, VIN, motor y propietario.',
      actions: ['Revisar los datos de inscripción del auto', 'Imprimir o guardar en PDF', 'Tenerlo a mano para trámites']
    },
    {
      id: 'cuenta-configuraciones', section: 'cliente', login: U.cliente, title: 'Mis configuraciones', url: 'index.html#/cuenta/configuraciones', waitFor: '.cfg-card',
      description: 'Configuraciones guardadas desde el configurador, con su versión, color, packs, accesorios y precio.',
      actions: ['Reabrir una configuración en el configurador', 'Pedir cotización de una configuración', 'Eliminar las que ya no le interesan']
    },
    {
      id: 'configurador-guardar', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Guardar" del configurador', title: 'Guardar configuración', url: 'index.html#/modelo/tucson', waitFor: '.configurator',
      setup: async h => { await h.click('[data-save]'); await h.modal(); },
      description: 'Con la sesión de cliente iniciada, el botón "Guardar" del configurador pide un nombre y guarda la configuración en su cuenta. Sin sesión se guarda solo en el navegador.',
      actions: ['Nombrar la configuración', 'Guardarla para retomarla después', 'Encontrarla luego en "Mi cuenta → Configuraciones"']
    },
    {
      id: 'cuenta-cotizaciones', section: 'cliente', login: U.cliente, title: 'Mis cotizaciones', url: 'index.html#/cuenta/cotizaciones', waitFor: '[data-quote]',
      description: 'Cotizaciones formales emitidas por su ejecutivo y solicitudes aún en preparación, con vencimiento y estado.',
      actions: ['Ver cada cotización en formato documento', 'Aceptar una cotización en línea para reservar la unidad', 'Revisar vencimiento y ejecutivo a cargo', 'Seguir las solicitudes en preparación']
    },
    {
      id: 'cuenta-cotizacion-documento', section: 'cliente', login: U.cliente, kind: 'modal', from: 'Botón "Ver cotización" en Mis cotizaciones', title: 'Documento de cotización', url: 'index.html#/cuenta/cotizaciones', waitFor: '[data-quote]',
      setup: async h => { await h.click('[data-quote="q-cam"]'); await h.modal(); },
      description: 'Cotización formal imprimible con el auto configurado, precio lista, bonos, descuento, total y un ejemplo de crédito.',
      actions: ['Revisar el desglose de precio y la vigencia', 'Ver un ejemplo de cuota con crédito convencional', 'Imprimir o guardar en PDF']
    },
    {
      id: 'cuenta-test-drives', section: 'cliente', login: U.cliente, title: 'Mis test drives', url: 'index.html#/cuenta/test-drives', waitFor: '.account-body .card',
      description: 'Pruebas de manejo agendadas y pasadas, con fecha, hora, sucursal y estado.',
      actions: ['Ver los test drives agendados', 'Cancelar uno que ya no podrá asistir', 'Agendar uno nuevo']
    },
    {
      id: 'cuenta-financiamiento', section: 'cliente', login: U.cliente, title: 'Mi crédito', url: 'index.html#/cuenta/financiamiento', waitFor: '.account-body .card',
      description: 'Estado de las solicitudes de crédito en tres etapas (recibida, en evaluación, resolución), con las condiciones si las hay.',
      actions: ['Seguir el avance de su solicitud', 'Ver producto, plazo, cuota y pie', 'Revisar condiciones de aprobación o el siguiente paso', 'Simular un crédito nuevo']
    },
    {
      id: 'cuenta-servicio', section: 'cliente', login: U.cliente, title: 'Servicio en línea', url: 'index.html#/cuenta/servicio', waitFor: '.svc-card',
      description: 'Horas de taller con el avance de cada orden de trabajo en tiempo real: etapa, checklist y total.',
      actions: ['Ver en qué etapa está su auto en el taller', 'Aprobar o rechazar trabajos adicionales que propone el asesor', 'Revisar el total actualizado y la orden de trabajo', 'Cancelar una hora agendada']
    },
    {
      id: 'cuenta-documentos', section: 'cliente', login: U.cliente, title: 'Mis documentos', url: 'index.html#/cuenta/documentos', waitFor: '.doc-rows',
      description: 'Facturas de compra, padrones y órdenes de trabajo cerradas en un solo lugar.',
      actions: ['Abrir facturas, padrones y órdenes de trabajo', 'Imprimir o guardar cada documento en PDF', 'Tener el historial de su auto ordenado']
    },

    // ================= Ejecutivo de ventas =================
    {
      id: 'ventas-pipeline', section: 'vendedor', login: U.vendedor, roles: ['Ejecutivo de ventas', 'Gerente comercial', 'Administrador'], title: 'Pipeline de leads', url: 'vendedor.html#/', waitFor: '.kanban .kcard',
      description: 'Tablero kanban con los leads del ejecutivo por etapa, desde nuevo hasta vendido o perdido. Los leads nuevos muestran el aviso de SLA de primer contacto. Gerencia ve a todos los ejecutivos.',
      actions: ['Arrastrar tarjetas entre etapas (o usar "Mover a…" en pantallas táctiles)', 'Buscar por cliente o modelo y filtrar por temperatura', 'Ver el valor total del pipeline abierto', 'Abrir la ficha de un lead', 'Ingresar un lead de showroom o teléfono']
    },
    {
      id: 'ventas-nuevo-lead', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Lead de showroom" del pipeline', title: 'Nuevo lead de showroom', url: 'vendedor.html#/', waitFor: '.kanban .kcard',
      setup: async h => { await h.click('[data-new]'); await h.modal(); },
      description: 'Formulario para registrar a un cliente atendido en el showroom o por teléfono. El lead queda asignado al ejecutivo y en etapa "Contactado".',
      actions: ['Registrar nombre, teléfono y correo', 'Indicar el modelo de interés y el origen', 'Agregar una nota inicial', 'Abrir directamente la ficha del lead creado']
    },
    {
      id: 'ventas-ficha-lead', section: 'vendedor', login: U.vendedor, title: 'Ficha del lead', url: 'vendedor.html#/lead/l-cam', waitFor: '.timeline',
      description: 'Todo el historial de un prospecto: etapas, línea de tiempo de actividades, cotizaciones, test drive, crédito y unidad reservada.',
      actions: ['Registrar notas, llamadas, WhatsApp o correos', 'Cambiar la etapa y la temperatura del lead', 'Emitir una cotización formal', 'Agendar test drive o ingresar una solicitud de crédito', 'Reservar un VIN, cerrar la venta o marcarlo como perdido']
    },
    {
      id: 'ventas-cotizacion-formal', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Nueva cotización" en la ficha del lead', title: 'Cotización formal', url: 'vendedor.html#/lead/l-cam', waitFor: '.timeline',
      setup: async h => { await h.click('[data-quote]'); await h.modal(); await h.fill('.modal #q-d', '5'); await h.pause(200); },
      description: 'Armado de la cotización con versión, color, llantas, packs, accesorios y descuento comercial. Calcula total y utilidad, y avisa si el descuento requiere aprobación de gerencia.',
      actions: ['Elegir versión, color, llantas, packs y accesorios', 'Aplicar bonos de financiamiento o retoma', 'Ingresar un descuento y ver la utilidad bruta estimada', 'Emitir la cotización (o enviarla a aprobación si supera su margen)']
    },
    {
      id: 'ventas-reservar-vin', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Reservar VIN" en la ficha del lead', title: 'Reserva de unidad por VIN', url: 'vendedor.html#/lead/l-cam', waitFor: '.timeline',
      setup: async h => { await h.click('[data-reserve]'); await h.modal(); },
      description: 'Lista de unidades en stock y en tránsito del modelo en las tres sucursales para reservar una por VIN a nombre del cliente.',
      actions: ['Ver VIN, versión, color, sucursal y estado de cada unidad', 'Reservar una unidad para el cliente', 'Cambiar una reserva (libera la anterior)']
    },
    {
      id: 'ventas-cerrar-venta', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Cerrar venta" en la ficha del lead', title: 'Cierre de venta', url: 'vendedor.html#/lead/l-cam', waitFor: '.timeline',
      setup: async h => { await h.click('.page-head [data-close]'); await h.modal(); },
      description: 'Registro de la nota de venta con la unidad, el precio final, la forma de pago, la retoma y la fecha de entrega. Avisa si el crédito aún no está aprobado.',
      actions: ['Elegir la unidad (VIN) que se vende', 'Confirmar precio final y forma de pago', 'Registrar el valor de la retoma', 'Programar la fecha de entrega']
    },
    {
      id: 'ventas-solicitud-credito', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Ingresar solicitud" en la ficha del lead', title: 'Solicitud de crédito', url: 'vendedor.html#/', waitFor: '.kanban .kcard',
      setup: async h => { await h.click('.kcol[data-stage="test_drive"] .kcard >> nth=0'); await h.wait('.timeline'); const url = h.here(); await h.click('[data-fin]'); await h.modal(); return { url }; },
      description: 'Ingreso de una solicitud de crédito desde la ficha, con los datos del cliente y de la operación. Se calcula el puntaje y la solicitud llega a la bandeja del analista.',
      actions: ['Ingresar RUT, renta líquida y situación laboral', 'Elegir producto financiero, pie y plazo', 'Enviar la solicitud a crédito', 'Ver el estado de la resolución en la ficha']
    },
    {
      id: 'ventas-perdido', section: 'vendedor', login: U.vendedor, kind: 'modal', from: 'Botón "Perdido" en la ficha del lead', title: 'Marcar lead como perdido', url: 'vendedor.html#/lead/l-cam', waitFor: '.timeline',
      setup: async h => { await h.click('[data-lost]'); await h.modal(); },
      description: 'Cierre de un lead sin venta con el motivo de pérdida, que luego alimenta los reportes de gerencia. Si tenía una unidad reservada, se libera.',
      actions: ['Elegir el motivo de pérdida', 'Agregar un comentario', 'Liberar la unidad reservada automáticamente']
    },
    {
      id: 'ventas-cotizaciones', section: 'vendedor', login: U.vendedor, title: 'Mis cotizaciones', url: 'vendedor.html#/cotizaciones', waitFor: '.admin-content table',
      description: 'Listado de las cotizaciones formales emitidas por el ejecutivo, con descuento, total y estado (incluidas las que esperan aprobación de gerencia).',
      actions: ['Buscar por número o cliente', 'Filtrar por estado', 'Abrir la ficha del lead de cada cotización', 'Exportar a CSV']
    },
    {
      id: 'ventas-agenda', section: 'vendedor', login: U.vendedor, title: 'Agenda de test drives', url: 'vendedor.html#/agenda', waitFor: '.admin-content .card',
      description: 'Pruebas de manejo del ejecutivo agrupadas por día, con el cliente, el modelo y la sucursal.',
      actions: ['Ver los test drives de hoy y los próximos días', 'Marcar uno como realizado o "no asistió"', 'Actualizar automáticamente la etapa del lead']
    },
    {
      id: 'ventas-stock', section: 'vendedor', login: U.vendedor, title: 'Stock para vender', url: 'vendedor.html#/stock', waitFor: '.admin-content table',
      description: 'Unidades por VIN en stock, en tránsito o reservadas en las tres sucursales, con días en stock, para ofrecer al cliente.',
      actions: ['Buscar por modelo o VIN', 'Filtrar por estado, sucursal y marca', 'Ver antigüedad de cada unidad en stock', 'Exportar a CSV']
    },
    {
      id: 'ventas-meta', section: 'vendedor', login: U.vendedor, title: 'Meta y comisiones', url: 'vendedor.html#/meta', waitFor: '.admin-content .grid-4',
      description: 'Avance de la meta mensual de unidades, proyección a fin de mes, utilidad generada, comisión estimada y ranking del equipo.',
      actions: ['Ver unidades vendidas contra la meta', 'Revisar la proyección y la comisión estimada', 'Comparar su posición en el ranking del mes', 'Ver la historia de los últimos 6 meses']
    },
    {
      id: 'ventas-acceso-restringido', section: 'vendedor', login: U.vendedor, title: 'Ruta protegida por rol', url: 'vendedor.html#/aprobaciones', waitFor: '.admin-content .empty',
      description: 'Lo que ve un ejecutivo si intenta abrir una sección que no corresponde a su rol (en este caso, la aprobación de descuentos de gerencia).',
      actions: ['Ver el aviso de acceso restringido', 'Volver a las secciones permitidas desde el menú', 'Confirmar que cada rol solo ve sus menús y rutas']
    },

    // ================= Gerente comercial =================
    {
      id: 'gerencia-dashboard', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Dashboard comercial', url: 'admin.html#/', waitFor: '.admin-content .grid-4',
      description: 'Resumen del negocio: ventas, utilidad, embudo de leads, unidades por marca, mix de financiamiento, ingresos y ocupación del taller, ranking de ejecutivos y actividad reciente.',
      actions: ['Ver los indicadores del mes de ventas y posventa', 'Revisar el embudo de leads y la facturación por mes', 'Ver la ocupación de cada taller', 'Atender los descuentos por aprobar', 'Seguir la actividad reciente del sistema']
    },
    {
      id: 'gerencia-aprobar-descuentos', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Aprobación de descuentos', url: 'vendedor.html#/aprobaciones', waitFor: '.admin-content',
      setup: async h => { await pendingQuote(h); await h.login(U.gerente); await h.goto('vendedor.html#/aprobaciones', '.admin-content .card [data-ok]'); },
      description: 'Cotizaciones cuyo descuento supera el margen del ejecutivo, con precio lista, bonos, total y ejecutivo. Gerencia decide dentro de su propio máximo.',
      actions: ['Revisar el descuento pedido y su monto', 'Ver la cotización completa', 'Aprobar el descuento', 'Rechazarlo con un motivo o contrapropuesta']
    },
    {
      id: 'gerencia-modelos', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Modelos y versiones', url: 'admin.html#/modelos', waitFor: '.admin-content table',
      description: 'Catálogo de modelos con marca, segmento, precio desde, stock y estado (activo, lanzamiento o inactivo).',
      actions: ['Buscar y filtrar modelos', 'Marcar modelos como destacados en la portada', 'Crear un modelo nuevo', 'Aplicar un ajuste masivo de precios por marca', 'Abrir el editor de un modelo']
    },
    {
      id: 'gerencia-ajuste-precios', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Botón de ajuste masivo en Modelos y versiones', title: 'Ajuste masivo de precios', url: 'admin.html#/modelos', waitFor: '.admin-content table',
      setup: async h => { await h.click('[data-bulk]'); await h.modal(); },
      description: 'Ventana para subir o bajar en un porcentaje los precios de todas las versiones de una marca o de todo el catálogo.',
      actions: ['Elegir una marca o todas', 'Indicar la variación porcentual', 'Confirmar el ajuste antes de aplicarlo']
    },
    {
      id: 'gerencia-modelo-general', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Editor de modelo: general', url: 'admin.html#/modelos/tucson', waitFor: '.admin-content [data-gen]',
      description: 'Datos generales de un modelo (nombre, marca, segmento, carrocería, motorización, estado) con vista previa de la ilustración.',
      actions: ['Editar nombre, eslogan, segmento y motorización', 'Cambiar el estado (activo, lanzamiento, inactivo)', 'Elegir la carrocería de la ilustración', 'Ver la vista previa con cada color']
    },
    {
      id: 'gerencia-modelo-versiones', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Editor de modelo: versiones y precios', url: 'admin.html#/modelos/tucson?tab=versions', waitFor: '.admin-content .sub-table',
      description: 'Tabla editable de versiones con precio lista, costo, margen, motor, potencia, transmisión, consumo y tracción.',
      actions: ['Editar precios y costos con el margen calculado', 'Modificar la ficha técnica de cada versión', 'Agregar o quitar versiones', 'Pasar a colores, llantas o packs']
    },
    {
      id: 'gerencia-modelo-colores', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Editor de modelo: colores', url: 'admin.html#/modelos/tucson?tab=colors', waitFor: '.admin-content .sub-table',
      description: 'Colores del modelo con nombre, tono, recargo y vista previa del auto pintado.',
      actions: ['Agregar o quitar colores', 'Elegir el tono con un selector de color', 'Definir el recargo de cada pintura', 'Ver la vista previa del auto con ese color']
    },
    {
      id: 'gerencia-accesorios', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Accesorios', url: 'admin.html#/accesorios', waitFor: '.admin-content table',
      description: 'Catálogo de accesorios que aparecen en el paso "Accesorios" del configurador según segmento o motorización.',
      actions: ['Crear, editar o eliminar accesorios', 'Definir categoría y precio', 'Indicar a qué segmentos aplica', 'Activar o desactivar cada uno']
    },
    {
      id: 'gerencia-campanas', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Precios y campañas', url: 'admin.html#/campanas', waitFor: '.admin-content table',
      description: 'Bonos y campañas con fecha de inicio y término. El sitio aplica automáticamente los vigentes según la forma de pago.',
      actions: ['Crear o editar campañas', 'Activar o desactivar un bono y verlo reflejado al instante en el sitio', 'Destacar campañas en la portada', 'Filtrar por estado y tipo']
    },
    {
      id: 'gerencia-campana-editar', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Botón "Nueva campaña" en Precios y campañas', title: 'Editar campaña', url: 'admin.html#/campanas', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Formulario de campaña con nombre, tipo, monto, vigencia, alcance (modelos, marca o todo el catálogo) y visibilidad en la portada.',
      actions: ['Definir tipo de bono y monto', 'Fijar fechas de inicio y término', 'Elegir el alcance: modelos, una marca o todos', 'Mostrarla o no en la portada']
    },
    {
      id: 'gerencia-lista-precios', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Lista de precios', url: 'admin.html#/campanas?tab=precios', waitFor: '.admin-content table',
      description: 'Todas las versiones con precio lista, bonos vigentes, precio con bonos y margen, con el precio editable en la misma tabla.',
      actions: ['Editar el precio lista de una versión en línea', 'Ver bonos vigentes y precio final', 'Revisar el margen de cada versión', 'Filtrar por marca y exportar a CSV']
    },
    {
      id: 'gerencia-inventario', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Inventario por VIN', url: 'admin.html#/inventario', waitFor: '.admin-content table',
      description: 'Unidades físicas por sucursal y su ciclo: tránsito, stock, reservado, vendido y entregado, con costo y días en stock.',
      actions: ['Filtrar por estado, sucursal y marca', 'Recibir en stock unidades que llegan de fábrica', 'Traspasar unidades entre sucursales', 'Ingresar una unidad nueva', 'Ver la antigüedad del stock y exportar a CSV']
    },
    {
      id: 'gerencia-ingresar-unidad', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Botón "Ingresar unidad" en Inventario por VIN', title: 'Ingresar unidad', url: 'admin.html#/inventario', waitFor: '.admin-content table',
      setup: async h => { await h.click('.page-head [data-new]'); await h.modal(); },
      description: 'Alta de una unidad nueva con modelo, versión, color, sucursal, VIN y estado inicial.',
      actions: ['Elegir modelo, versión y color', 'Asignarla a una sucursal', 'Registrar VIN y costo', 'Dejarla en stock o en tránsito con fecha estimada']
    },
    {
      id: 'gerencia-leads', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Leads y asignación', url: 'admin.html#/leads', waitFor: '.admin-content table',
      description: 'Todos los prospectos del sitio, showroom, teléfono y redes, con origen, interés, etapa y ejecutivo asignado.',
      actions: ['Buscar y filtrar por etapa, origen, sucursal o ejecutivo', 'Reasignar un lead a otro ejecutivo', 'Asignar automáticamente los leads sin dueño', 'Abrir el detalle de un lead', 'Exportar a CSV']
    },
    {
      id: 'gerencia-lead-detalle', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Clic en una fila de Leads y asignación', title: 'Detalle del lead', url: 'admin.html#/leads', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Resumen de un lead para gerencia: interés, etapa, ejecutivo, datos de contacto y línea de tiempo completa.',
      actions: ['Revisar la historia de contacto del lead', 'Ver interés, etapa y ejecutivo asignado', 'Detectar leads sin atención']
    },
    {
      id: 'gerencia-reglas-asignacion', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Reglas de asignación', url: 'admin.html#/leads?tab=reglas', waitFor: '.admin-content [data-form]',
      description: 'Configuración de cómo se reparten los leads del sitio entre los ejecutivos y la carga actual de cada uno.',
      actions: ['Activar o desactivar la asignación automática', 'Elegir el método: rotativo, por carga o manual', 'Priorizar especialistas de marca', 'Fijar el máximo de leads por ejecutivo y el SLA de primer contacto', 'Definir la especialidad de cada ejecutivo']
    },
    {
      id: 'gerencia-cotizaciones', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Cotizaciones', url: 'admin.html#/cotizaciones', waitFor: '.admin-content table',
      setup: async h => { await pendingQuote(h); await h.login(U.gerente); await h.goto('admin.html#/cotizaciones', '.admin-content table [data-act="ok"]'); },
      description: 'Todas las cotizaciones emitidas, con cliente, vehículo, descuento, total, ejecutivo y estado. Las que superan el margen del ejecutivo se aprueban o rechazan aquí.',
      actions: ['Filtrar por estado y ejecutivo', 'Ver el documento de cualquier cotización', 'Aprobar o rechazar descuentos sobre margen', 'Exportar a CSV']
    },
    {
      id: 'gerencia-ventas', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Ventas y contratos', url: 'admin.html#/ventas', waitFor: '.admin-content table',
      description: 'Notas de venta con vehículo, cliente, ejecutivo, forma de pago, precio, margen y estado (por entregar, facturado, entregado).',
      actions: ['Filtrar por estado, sucursal, marca o ejecutivo', 'Abrir el detalle de una venta', 'Ver la factura', 'Revisar el margen de cada operación', 'Exportar a CSV']
    },
    {
      id: 'gerencia-venta-detalle', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Clic en una fila de Ventas y contratos', title: 'Detalle de venta', url: 'admin.html#/ventas', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Ficha de una venta con el vehículo, cliente, versión, VIN, precios, bonos, descuento, retoma, forma de pago y estado.',
      actions: ['Revisar todos los datos de la operación', 'Cambiar el estado de la venta', 'Abrir la factura electrónica (simulada)']
    },
    {
      id: 'gerencia-factura', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Botón "Factura" en el detalle de una venta', title: 'Factura de venta', url: 'admin.html#/ventas', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); await h.click('.modal [data-inv]'); await h.wait('.modal-backdrop >> nth=1'); await h.pause(250); },
      description: 'Factura electrónica simulada con neto, IVA y total, VIN del vehículo y forma de pago.',
      actions: ['Revisar el detalle tributario de la venta', 'Imprimir o guardar en PDF', 'Cerrar y volver al detalle de la venta']
    },
    {
      id: 'gerencia-entregas', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Entregas', url: 'admin.html#/entregas', waitFor: '.admin-content .card',
      description: 'Programa de entregas de 0 km vendidos por día y sucursal, con un checklist de cinco pasos antes de entregar las llaves.',
      actions: ['Ver las entregas de cada día por sucursal', 'Marcar el checklist: documentos, patente, lavado, estanque e inducción', 'Reprogramar una entrega', 'Registrar la entrega y ver las últimas realizadas']
    },
    {
      id: 'gerencia-tasaciones', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Tasaciones', url: 'admin.html#/tasaciones', waitFor: '.admin-content table',
      description: 'Usados ofrecidos en parte de pago y su flujo: estimación en línea, inspección, oferta firme y recepción.',
      actions: ['Filtrar por estado', 'Ver la estimación de cada auto', 'Registrar la inspección y la oferta firme', 'Exportar a CSV']
    },
    {
      id: 'gerencia-tasacion-oferta', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], kind: 'modal', from: 'Clic en una fila de Tasaciones', title: 'Oferta firme de tasación', url: 'admin.html#/tasaciones', waitFor: '.admin-content table',
      setup: async h => { await h.click(firstRow + ' >> td >> nth=1'); await h.modal(); },
      description: 'Ventana para registrar la oferta firme por un usado, su estado físico y las observaciones de la inspección.',
      actions: ['Ingresar el monto de la oferta firme', 'Registrar el estado físico y observaciones', 'Avanzar el estado de la tasación']
    },
    {
      id: 'gerencia-solicitudes-credito', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador', 'Analista de crédito'], title: 'Solicitudes de crédito (panel)', url: 'admin.html#/fin/solicitudes', waitFor: '.admin-content table',
      description: 'Listado de pre-evaluaciones del sitio y solicitudes de los ejecutivos, con monto, renta, puntaje, producto, analista y estado.',
      actions: ['Filtrar por estado y producto', 'Abrir la evaluación de una solicitud', 'Ver el puntaje y la renta de cada solicitante', 'Ir a la app de crédito']
    },
    {
      id: 'gerencia-contenido', section: 'gerente', login: U.gerente, roles: ['Gerente comercial', 'Administrador'], title: 'Contenido del sitio', url: 'admin.html#/cms', waitFor: '.admin-content .card',
      description: 'Editor del contenido de la portada pública: carrusel, barra de anuncio, secciones visibles, ofertas, lanzamientos y testimonios.',
      actions: ['Editar, ordenar o quitar diapositivas del carrusel', 'Cambiar la barra de anuncio', 'Mostrar u ocultar secciones de la portada', 'Editar títulos y testimonios', 'Abrir el sitio para ver los cambios al instante']
    },

    // ================= Analista de crédito =================
    {
      id: 'credito-bandeja', section: 'analista', login: U.analista, roles: ['Analista de crédito', 'Gerente comercial', 'Administrador'], title: 'Bandeja de solicitudes', url: 'credito.html#/', waitFor: '.admin-content .appt-row',
      description: 'Solicitudes de crédito por orden de llegada, con monto, plazo, renta, puntaje y estado. Separa pendientes, aprobadas y rechazadas.',
      actions: ['Ver recibidas, en evaluación y resoluciones del analista', 'Cambiar entre pendientes, aprobadas y rechazadas', 'Distinguir las pre-evaluaciones que llegaron del sitio', 'Abrir una solicitud para evaluarla']
    },
    {
      id: 'credito-evaluacion', section: 'analista', login: U.analista, roles: ['Analista de crédito', 'Gerente comercial', 'Administrador'], title: 'Evaluación y resolución', url: 'credito.html#/solicitud/f-cam', waitFor: '.score-grid',
      description: 'Ficha del solicitante y de la operación con scoring: carga financiera, pie, LTV, historial, antigüedad y recomendación del motor. Desde aquí se resuelve.',
      actions: ['Tomar la solicitud para evaluarla', 'Revisar el puntaje y cada factor del scoring', 'Aprobar, aprobar con condiciones o rechazar con motivo', 'Agregar notas internas']
    },
    {
      id: 'credito-simulador', section: 'analista', login: U.analista, roles: ['Analista de crédito', 'Gerente comercial', 'Administrador'], title: 'Simulador interno', url: 'credito.html#/simulador', waitFor: '.admin-content [data-out] .big-num',
      description: 'Simulador para consultas de ejecutivos y clientes por teléfono: cuota, CAE, costo total y una pre-evaluación con RUT y renta.',
      actions: ['Elegir modelo y producto financiero', 'Ajustar precio, pie y plazo', 'Ingresar renta y RUT para ver carga financiera y puntaje', 'Ver el desglose de costos y la cuota final (VFMG)']
    },
    {
      id: 'credito-productos', section: 'analista', login: U.analista, roles: ['Analista de crédito', 'Gerente comercial', 'Administrador'], title: 'Productos y tasas (consulta)', url: 'credito.html#/productos', waitFor: '.admin-content .card',
      description: 'Tasas vigentes de cada producto por plazo con una cuota de ejemplo y su CAE. Las tasas se administran en el panel.',
      actions: ['Consultar la tasa mensual por plazo', 'Ver la cuota y el CAE de ejemplo', 'Revisar el pie mínimo y la cuota final de Compra Inteligente']
    },
    {
      id: 'credito-indicadores', section: 'analista', login: U.analista, roles: ['Analista de crédito', 'Gerente comercial', 'Administrador'], title: 'Indicadores de crédito', url: 'credito.html#/indicadores', waitFor: '.admin-content .grid-4',
      description: 'Tasa de aprobación, tiempo de respuesta, puntaje promedio y monto aprobado, con gráficos por estado, rango de puntaje y producto.',
      actions: ['Ver la tasa de aprobación y el tiempo de respuesta', 'Revisar la distribución de puntajes', 'Comparar solicitudes por producto', 'Ver el monto total aprobado']
    },

    // ================= Asesor de servicio =================
    {
      id: 'taller-citas-hoy', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Citas de hoy', url: 'posventa.html#/', waitFor: '.admin-content .appt-row',
      description: 'Agenda del día en el taller de la sucursal con patente, cliente, servicio y alertas de recall pendiente. Desde aquí se recepciona cada auto.',
      actions: ['Ver citas, autos por recepcionar, en taller y facturado del día', 'Recepcionar un vehículo y crear su orden de trabajo', 'Marcar a un cliente que no llegó', 'Cambiar de sucursal en la barra superior']
    },
    {
      id: 'taller-recepcion', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], kind: 'modal', from: 'Botón "Recepcionar" en Citas de hoy', title: 'Recepción del vehículo', url: 'posventa.html#/', waitFor: '.admin-content .appt-row',
      setup: async h => { await h.click('[data-recv="a-cam"]'); await h.modal(); },
      description: 'Formulario de recepción con kilometraje, nivel de combustible, daños existentes, solicitud del cliente y firma. Al confirmar se crea la orden de trabajo.',
      actions: ['Registrar kilometraje y combustible', 'Marcar daños visibles en la inspección', 'Anotar lo que pide el cliente', 'Registrar la firma y crear la OT']
    },
    {
      id: 'taller-tablero', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Tablero de taller', url: 'posventa.html#/taller', waitFor: '.board',
      description: 'Órdenes de trabajo de la sucursal por estado, con avance del checklist, total y adicionales por aprobar. El cliente ve estos cambios en su cuenta.',
      actions: ['Ver cada OT según su estado', 'Revisar el avance y el total de cada una', 'Detectar adicionales pendientes de aprobación', 'Abrir una orden de trabajo']
    },
    {
      id: 'taller-orden', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Orden de trabajo', url: 'posventa.html#/taller', waitFor: '.board .ot-card',
      setup: async h => { await h.click('.board .ot-card >> nth=0'); await h.wait('.check-row'); return { url: h.here() }; },
      description: 'Detalle de una OT con datos del vehículo, checklist de la pauta, detalle de cobro, trabajos adicionales propuestos al cliente e historial.',
      actions: ['Avanzar el estado de la orden', 'Marcar ítems del checklist', 'Agregar repuestos o mano de obra al cobro', 'Proponer un trabajo adicional que el cliente aprueba en línea', 'Imprimir la OT']
    },
    {
      id: 'taller-orden-documento', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], kind: 'modal', from: 'Botón "Imprimir OT" en la orden de trabajo', title: 'Documento de orden de trabajo', url: 'posventa.html#/taller', waitFor: '.board .ot-card',
      setup: async h => { await h.click('.board .ot-card >> nth=0'); await h.wait('.check-row'); const url = h.here(); await h.click('[data-print]'); await h.modal(); return { url }; },
      description: 'OT imprimible con vehículo, cliente, checklist, detalle de cobro y espacios de firma.',
      actions: ['Revisar el checklist y el detalle de cobro', 'Imprimir o guardar en PDF', 'Entregar una copia al cliente']
    },
    {
      id: 'taller-entrega', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], kind: 'modal', from: 'Botón "Entregar" en una orden lista para retiro', title: 'Entrega del vehículo', url: 'posventa.html#/taller', waitFor: '.board .ot-card',
      setup: async h => {
        await h.click(h.page.locator('.board .kcol', { has: h.page.locator('.kcol-head', { hasText: /Lista/ }) }).locator('.ot-card').first());
        await h.wait('.check-row'); const url = h.here(); await h.click('[data-next]'); await h.modal(); return { url };
      },
      description: 'Cierre de la orden con el total a pagar y el medio de pago. Al confirmar, la OT y la cita quedan entregadas.',
      actions: ['Ver el total a pagar', 'Elegir el medio de pago', 'Registrar la entrega del vehículo']
    },
    {
      id: 'taller-proximos-dias', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Próximos días', url: 'posventa.html#/agenda', waitFor: '.admin-content .card',
      description: 'Citas de los próximos 7 días con la ocupación del taller por día, para preparar repuestos y bahías.',
      actions: ['Ver las citas por día y hora', 'Revisar la ocupación de cada jornada', 'Anticipar la pauta y los repuestos de cada auto']
    },
    {
      id: 'taller-vehiculos', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Vehículos y clientes', url: 'posventa.html#/vehiculos', waitFor: '.admin-content .my-car',
      description: 'Buscador por patente, VIN o nombre con el historial de taller, la garantía, los recalls y la próxima mantención de cada auto.',
      actions: ['Buscar por patente, VIN o cliente', 'Ver próxima mantención y estado de garantía', 'Detectar recalls pendientes', 'Revisar el historial de visitas al taller']
    },
    {
      id: 'posventa-citas', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Citas de taller (panel)', url: 'admin.html#/citas', waitFor: '.admin-content table',
      description: 'Agenda de servicio de las tres sucursales con fecha, hora, vehículo, cliente, servicio, asesor y estado.',
      actions: ['Ver el resumen de hoy por sucursal', 'Filtrar por sucursal, estado y tipo', 'Reagendar una cita', 'Ir a la app del taller', 'Exportar a CSV']
    },
    {
      id: 'posventa-ordenes', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Órdenes de trabajo (panel)', url: 'admin.html#/ot', waitFor: '.admin-content table',
      description: 'Todas las OT abiertas y cerradas recientes con avance, total y estado, más indicadores de abiertas, listas, esperando repuestos y facturado.',
      actions: ['Filtrar por estado y sucursal', 'Buscar por número, patente o cliente', 'Abrir el detalle de una orden', 'Exportar a CSV']
    },
    {
      id: 'posventa-pautas', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Pautas y precios', url: 'admin.html#/pautas', waitFor: '.admin-content table',
      description: 'Pautas de mantención por marca con kilometraje, meses, horas, precio fijo y trabajos incluidos. El sitio las muestra al agendar.',
      actions: ['Elegir la marca', 'Editar precio, horas y trabajos de cada pauta', 'Crear o eliminar pautas', 'Ajustar todos los precios de una marca en un porcentaje']
    },
    {
      id: 'posventa-recalls', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Campañas recall', url: 'admin.html#/recalls', waitFor: '.admin-content table',
      description: 'Campañas de seguridad con código, marca, modelos y años afectados, riesgo, solución y autos pendientes en la base del concesionario.',
      actions: ['Crear o editar una campaña', 'Definir modelos y años afectados', 'Ver cuántos autos de clientes siguen pendientes', 'Activar o desactivar la campaña']
    },
    {
      id: 'posventa-repuestos-catalogo', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Repuestos: catálogo', url: 'admin.html#/repuestos', waitFor: '.admin-content table',
      description: 'Catálogo de repuestos y accesorios publicado en el sitio, con SKU, categoría, precio, stock y visibilidad.',
      actions: ['Crear o editar repuestos', 'Ajustar el stock', 'Publicar u ocultar piezas en el sitio', 'Exportar a CSV']
    },
    {
      id: 'posventa-repuestos-solicitudes', section: 'asesor', login: U.asesor, roles: ['Asesor de servicio', 'Administrador'], title: 'Repuestos: solicitudes', url: 'admin.html#/repuestos?tab=solicitudes', waitFor: '.admin-content table',
      description: 'Solicitudes de repuestos y presupuestos de carrocería que llegan desde el sitio, con cliente, detalle, monto y estado.',
      actions: ['Revisar cada solicitud con su detalle', 'Responder con un monto cotizado y un mensaje', 'Cambiar el estado de la solicitud']
    },

    // ================= Administrador =================
    {
      id: 'admin-productos-tasas', section: 'admin', login: U.admin, title: 'Productos y tasas', url: 'admin.html#/fin/productos', waitFor: '.admin-content .sub-table',
      description: 'Productos financieros con tasas mensuales por plazo y cuota final (VFMG). El simulador del sitio y las cotizaciones usan estos valores al instante.',
      actions: ['Editar la tasa de cada plazo', 'Agregar plazos o productos nuevos', 'Ver la cuota y el CAE de ejemplo por plazo', 'Activar o desactivar productos']
    },
    {
      id: 'admin-sucursales', section: 'admin', login: U.admin, title: 'Sucursales', url: 'admin.html#/sucursales', waitFor: '.admin-content table',
      description: 'Datos de las sucursales que usa el sitio (sucursales, test drive, taller y stock): dirección, horario, teléfono, bahías y marcas.',
      actions: ['Editar dirección, horario y teléfono', 'Definir las marcas que vende cada sucursal', 'Indicar las bahías del taller', 'Activar o desactivar una sucursal']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: '.admin-content .perm-table',
      description: 'Cuentas del equipo y clientes con su rol, sucursal y estado, más la matriz de permisos que define qué menús y rutas ve cada rol.',
      actions: ['Crear, editar o eliminar usuarios', 'Asignar rol, sucursal y meta mensual', 'Desactivar una cuenta para cortar su acceso', 'Consultar la matriz de permisos por rol']
    },
    {
      id: 'admin-configuracion', section: 'admin', login: U.admin, title: 'Configuración', url: 'admin.html#/config', waitFor: '.admin-content [data-form]',
      description: 'Datos generales de la empresa, horarios, política comercial (márgenes de descuento) y marcas representadas.',
      actions: ['Editar nombre, eslogan y datos de contacto', 'Fijar los horarios de test drive y taller', 'Definir el descuento máximo del ejecutivo y de gerencia', 'Activar o desactivar marcas']
    },
    {
      id: 'admin-bitacora', section: 'admin', login: U.admin, title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: '.admin-content table',
      description: 'Registro de las últimas 300 acciones del sistema, hechas en el sitio público, en las apps de cada rol y en el panel.',
      actions: ['Ver quién hizo qué y cuándo', 'Buscar y filtrar por acción o usuario', 'Exportar a CSV', 'Restablecer los datos de demostración desde el menú']
    }
  ]
};
