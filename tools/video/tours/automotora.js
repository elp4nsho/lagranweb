// Recorrido en video de Autoplaza Pacífico (/automotora): sitio público, configurador,
// financiamiento, tasación, posventa, cuenta del cliente y las apps de ventas, gerencia,
// crédito, taller y administración, más un segmento en celular.
//
// Todo con interacciones reales (clics, teclado, arrastrar): el recorrido no lee ni escribe la
// base local directamente, así que también sirve como prueba de punta a punta.

const U = { cliente: 'u-cli', vendedor: 'u-v1', gerente: 'u-ger', analista: 'u-cred', asesor: 'u-pv1', admin: 'u-admin' };

// Personajes del video (lo que se escribe a mano)
const PROSPECTO = { name: 'Martín Soto Araya', msg: 'Necesito el auto antes de fin de mes.' };
const PRE = { badRut: '12.345.678-9', rut: '17.845.321-1', name: 'Valentina Rojas Muñoz', email: 'valentina.rojas@demo.cl', renta: '1850000' };

const meta = {
  dir: 'automotora',
  title: 'Autoplaza Pacífico',
  youtube: {
    title: 'Autoplaza Pacífico: sistema completo para concesionario de autos nuevos (demo) · La Gran Web',
    description: [
      'Recorrido completo por Autoplaza Pacífico, un concesionario multimarca ficticio construido como demo funcional en el navegador:',
      'sitio público con configurador y precios en vivo, simulador de crédito y pre-evaluación en línea, tasación de usados, test drive,',
      'posventa (mantenciones por kilometraje, recalls, desabolladura, repuestos), cuenta del cliente y apps internas para ventas,',
      'gerencia, crédito, taller y administración. Incluye 30 estilos visuales y 3 disposiciones de página.',
      '',
      'Pruébalo: https://elp4nsho.github.io/automotora/',
      'Cuentas demo con un clic en la página de ingreso. Todos los datos son ficticios.'
    ].join('\n'),
    tags: ['concesionario', 'automotora', 'configurador de autos', 'CRM automotriz', 'simulador de crédito', 'taller mecánico', 'demo web', 'La Gran Web']
  }
};

// ---------- Utilidades del recorrido ----------
const fill = d => d.click('.lgw-dock .lgw-fill', { after: .7 });          // ⚡ Rellenar (barra del portafolio)
const closeModal = d => d.click('.modal-backdrop >> nth=-1 >> .modal-head [data-close]', { after: .3 });

async function loginAs(d, uid, landing) {
  if (!/login\.html/.test(d.page.url())) await d.goto('login.html', { waitFor: '.demo-account' });
  await d.click(`.demo-account[data-id="${uid}"]`, { nav: { waitFor: landing }, after: .2 });
}
async function logoutPanel(d) {
  await d.click('.admin-sidebar [data-logout]', { nav: { waitFor: '.demo-account' }, after: .1 });
}
/** Cambia de usuario detrás de una tarjeta breve (no es capítulo, solo transición). */
async function switchUser(d, text, fn) {
  await d.hideCaption();
  await d.card(`<div class="num">Mientras tanto…</div><h2 style="font-size:64px">${text}</h2>`);
  const t0 = Date.now();
  await fn();
  const left = 1400 * Math.max(d.speed, .3) - (Date.now() - t0);
  if (left > 0) await new Promise(r => setTimeout(r, left));
  await d.hideCard();
}

// ---------- Recorrido ----------
async function run(d) {
  // ===== Intro =====
  d.recorder?.pause();                       // el primer cuadro del video ya es la tarjeta
  await d.goto('index.html#/', { waitFor: '.billboard' });
  await d.intro({
    kicker: 'La Gran Web presenta',
    title: 'Autoplaza Pacífico',
    lead: 'Concesionario multimarca de autos nuevos (ficticio): sitio público con configurador, financiamiento, tasación, posventa y apps internas para cada rol.',
    chips: [['6', 'roles'], 'Cliente', 'Ejecutivo de ventas', 'Gerente comercial', 'Analista de crédito', 'Asesor de servicio', 'Administrador'],
    foot: 'Sistema funcional en el navegador · datos simulados · 30 estilos y 3 disposiciones'
  }, 0);
  await new Promise(r => setTimeout(r, 500));   // que la tarjeta termine de aparecer antes del primer cuadro
  d.recorder?.resume();
  await d.hold(5);

  // ===== 1. Sitio público =====
  await d.chapter('Sitio público y estilos', 'Portada administrable, 30 estilos visuales y 3 disposiciones de página');
  await d.step('Portada', async () => {
    await d.caption('Portada con carrusel administrable', 'Banners, textos y secciones se editan desde el panel de contenido', { read: .9 });
    await d.click('.billboard [data-next]', { after: 1.1 });
  });
  await d.step('Recorrer secciones', async () => {
    await d.caption('Destacados, campañas vigentes y lanzamientos', 'Los bonos y su vigencia vienen del módulo de campañas', { read: .2 });
    await d.tour(['.featured-sec .model-grid', '.offers-sec .offer-grid', '.launches-sec .launch-grid'], { read: 1.1 });
    await d.scrollTo(0);
  });
  // Nota: el panel 🎨 se cierra solo tras cada elección (se re-pinta y el clic queda "fuera"),
  // así que se vuelve a abrir antes de cada cambio.
  const palette = () => d.click('.lgw-dock button[title="Estilo y disposición"]', { after: .25 });
  await d.step('Disposiciones', async () => {
    await d.caption('Selector de estilo y disposición', 'La misma web, reorganizada por completo sin recargar', { read: .3 });
    await palette();
    await d.click('.lgw-pal [data-l="revista"]', { after: 0 });
    await d.caption('Disposición "Revista"', 'Cabecera centrada tipo diario y columnas asimétricas', { read: 1.5 });
    await palette();
    await d.click('.lgw-pal [data-l="app"]', { after: 0 });
    await d.caption('Disposición "App"', 'Navegación lateral fija y mosaicos tipo bento', { read: 1.5 });
    await palette();
    await d.click('.lgw-pal [data-l="clasica"]', { after: .2 });
  });
  await d.step('Estilos', async () => {
    await d.scrollTo(0);
    await d.caption('30 estilos visuales', 'Modernos y de la era HTML5: colores, tipografías, bordes y animaciones', { read: .2 });
    for (const t of ['noir', 'brutal', 'metro', 'aqua']) { await palette(); await d.click(`.lgw-pal [data-t="${t}"]`, { after: t === 'aqua' ? .3 : 1.3 }); }
  });

  // ===== 2. Catálogo =====
  await d.chapter('Catálogo y comparador', 'Filtros combinables, grilla o lista y comparación lado a lado');
  await d.step('Filtros', async () => {
    await d.click('.site-nav a[href="#/modelos"]', { after: .3 });
    await d.caption('Catálogo con filtros en vivo', 'Segmento, marca, motorización, transmisión, precio y stock inmediato', { read: .3 });
    await d.click('[data-seg="suv"]', { after: .5 });
    await d.slide('#f-max', 40000000, { after: .6 });
    await d.click('[data-view="list"]', { after: 1.1 });
    await d.click('[data-view="grid"]', { after: .3 });
  });
  await d.step('Comparar', async () => {
    await d.caption('Comparador de hasta 3 modelos', 'Se marcan desde cualquier tarjeta del catálogo', { read: .2 });
    for (const m of ['tucson', 'sportage', 'rav4']) await d.click(`label:has([data-compare="${m}"])`, { after: .3 });
    await d.click('label:has([data-compare="cx5"])', { after: .1 });
    await d.expectToast(/hasta 3 modelos/);
    await d.caption('Un cuarto modelo no entra', 'El sistema avisa el límite y deja la casilla sin marcar', { read: 1.2 });
    await d.click('#cmp-tray .btn-primary', { after: .3 });
    await d.page.locator('.cmp-table').waitFor();
    await d.caption('Lado a lado, con lo mejor de cada fila destacado', 'Precio con bonos, potencia, maletero, garantía, equipamiento y stock', { read: .8 });
    await d.tour(['.cmp-table tbody tr:nth-child(8)'], { read: 1.2 });
  });

  // ===== 3. Configurador =====
  await d.chapter('Configurador', 'Versión, pintura, vistas, llantas, packs y accesorios con precio y bonos en vivo');
  await d.step('Versión', async () => {
    await d.click('.cmp-table a[href="#/modelo/tucson"]', { after: .2 });
    await d.page.locator('.configurator').waitFor();
    await d.caption('Configura tu Tucson', 'Cada versión muestra motor, potencia, consumo y su equipamiento', { read: .3 });
    await d.click('.opt[data-v="tucson-3"]', { after: .8 });
  });
  await d.step('Color y vistas', async () => {
    await d.click('[data-go="color"]', { after: .2 });
    await d.caption('Pintura en vivo', 'El auto se recolorea y el recargo del color suma al precio', { read: 0 });
    for (const c of ['c1', 'c3', 'c5']) await d.click(`.swatch[data-v="${c}"]`, { after: .7 });
    await d.caption('Vistas y giro 360°', 'Lateral, frontal y trasera; también se gira arrastrando', { read: 0 });
    await d.click('.stage-tabs [data-view="front"]', { after: .7 });
    await d.click('.stage-tabs [data-anim]', { after: 2.6 });
    await d.click('.stage-tabs [data-anim]', { after: .2 });
  });
  await d.step('Llantas, packs y accesorios', async () => {
    await d.click('[data-go="wheels"]', { after: .2 });
    await d.caption('Llantas, packs y accesorios', 'El resumen de la derecha se recalcula con cada elección', { read: 0 });
    await d.click('.opt[data-v="w3"]', { after: .6 });
    await d.click('[data-go="packs"]', { after: .2 });
    await d.click('label.opt:has(input[value="p-tech"])', { after: .4 });
    await d.click('[data-go="acc"]', { after: .2 });
    await d.click('label.opt:has(input[value="acc-barras"])', { after: .4 });
  });
  await d.step('Resumen con bonos', async () => {
    await d.caption('Precio final con bonos vigentes', 'Bono de financiamiento y bono retoma según la forma de pago', { read: 0 });
    await d.ring('[data-summary] .sum-lines', 1.3);
    await d.click('.sum-toggles label:has([data-trade])', { after: .3 });
    await d.ring('[data-summary] .sum-total', 1.1);
  });
  await d.step('Guardar, compartir y ficha', async () => {
    await d.click('[data-save]', { after: .2 });
    await d.expectToast(/Guardada/);
    await d.caption('Guardar, compartir y ficha imprimible', 'El enlace reproduce exactamente esta configuración', { read: .2 });
    await d.click('[data-share]', { after: .3 });
    await d.click('.modal [data-copy]', { after: .2 });
    await d.expectToast(/Enlace copiado/);
    await d.pause(.5);
    await closeModal(d);
    await d.click('[data-summary] a[href^="#/ficha/"]', { after: .2 });
    await d.page.locator('.spec-page .paper').waitFor();
    await d.pause(.8);
    await d.tour(['.spec-page .doc-cols'], { read: 1.1 });
    await d.click('.spec-page a[href^="#/config/"]', { after: .2 });
    await d.page.locator('.configurator').waitFor();
  });

  // ===== 4. Financiamiento =====
  await d.chapter('Financiamiento y pre-evaluación', 'Contado, convencional, Compra Inteligente y leasing · evaluación en línea con RUT');
  await d.step('Simulador', async () => {
    await d.click('[data-summary] .sum-cuota', { after: .2 });
    await d.page.locator('.fin-result').waitFor();
    await d.caption('El simulador recibe tu configuración', 'Cuota, CAE, costo total y cuota final (VFMG) según el producto', { read: .3 });
    for (const k of ['contado', 'convencional', 'leasing', 'inteligente']) await d.click(`[data-kind="${k}"]`, { after: .8 });
    await d.slide('#fpie', 40, { after: .3 });
    await d.click('[data-plazo="24"]', { after: .3 });
    await d.ring('.fin-table-card', 1.1);
  });
  await d.step('Pre-evaluación: RUT inválido', async () => {
    await d.click('.fin-result [data-goeval]', { after: .5 });
    await d.caption('Pre-evaluación en línea', 'Primero con un RUT mal escrito…', { read: 0 });
    await d.type('#p-rut', PRE.badRut);
    await d.type('#p-name', PRE.name, { delay: 30 });
    await d.type('#p-email', PRE.email, { delay: 25 });
    await d.type('#p-renta', PRE.renta);
    await d.click('label:has(input[name="ok"])', { after: .1 });
    await d.click('[data-pre] button.btn-primary', { after: .1 });
    await d.expectToast(/Revisa los campos/);
    await d.caption('El dígito verificador no cuadra', 'El campo se marca en rojo y la solicitud no se envía', { read: 1.2 });
  });
  await d.step('Pre-evaluación: RUT válido', async () => {
    await d.type('#p-rut', PRE.rut);
    await d.click('[data-pre] button.btn-primary', { after: .1 });
    await d.page.locator('.pre-result').waitFor();
    await d.caption('Resultado inmediato con puntaje', 'La solicitud queda en la bandeja del analista de crédito', { read: 0 });
    await d.ring('.pre-result', 1.8);
  });

  // ===== 5. Tasación =====
  await d.chapter('Tasación de usados', 'Precio estimado en 2 minutos, usable como pie en el simulador');
  await d.step('Formulario con ⚡', async () => {
    await d.click('.site-nav a[href="#/tasacion"]', { after: .2 });
    await d.caption('⚡ Rellenar', 'En formularios largos, la barra del portafolio completa datos ficticios', { read: .1 });
    await fill(d);
    await d.select('#t-year', '2019', { after: .2 });
    await d.click('label.cond:has(input[value="excelente"])', { after: .2 });
    await d.click('[data-form] button.btn-primary', { after: .2 });
    await d.page.locator('.trade-result').waitFor();
    await d.caption('Rango según año, kilometraje y estado', 'Más el bono retoma vigente al comprar un 0 km', { read: 0 });
    await d.ring('.trade-result', 1.4);
  });
  await d.step('Usar como pie', async () => {
    await d.click('.trade-result [data-use]', { after: .2 });
    await d.page.locator('.trade-use').waitFor();
    await d.caption('La tasación pasa al simulador como pie', 'Se suma al pie en efectivo y baja la cuota', { read: 0 });
    await d.ring('.trade-use', 1.2);
    await d.ring('.fin-result .big-num', 1.2);
  });

  // ===== 6. Test drive y cotización =====
  await d.chapter('Test drive y cotización', 'Cada solicitud crea un lead asignado automáticamente a un ejecutivo');
  await d.step('Agendar test drive', async () => {
    await d.click('.site-nav a[href="#/test-drive"]', { after: .2 });
    await d.caption('Agenda de test drive', 'Modelo, sucursal y horarios libres reales', { read: .1 });
    await d.select('select[name="modelId"]', 'tucson', { after: .3 });
    await d.click('[data-days] .day-btn:nth-child(2)', { after: .3 });
    await d.click('[data-slots] .slot:not([disabled]) >> nth=2', { after: .3 });
    await fill(d);
    await d.click('[data-form] button.btn-primary', { after: .2 });
    await d.page.locator('.ticket').waitFor();
    await d.ring('.ticket', 1.4);
  });
  await d.step('Solicitar cotización', async () => {
    await d.click('.header-cta a[href="#/cotizar"]', { after: .2 });
    await d.caption('Solicitud de cotización', 'Con precio referencial y bonos según la forma de pago', { read: .1 });
    await d.select('#q-v', 'tucson-3', { after: .2 });
    await fill(d);
    await d.type('#c-name', PROSPECTO.name, { delay: 35 });
    await d.type('#q-msg', PROSPECTO.msg, { delay: 25 });
    await d.click('[data-form] button.btn-primary', { after: .2 });
    await d.page.locator('.ticket').waitFor();
    await d.caption('Lead creado y asignado', 'La regla round-robin lo asigna a un ejecutivo de la sucursal', { read: 0 });
    await d.ring('.ticket', 1.6);
  });

  // ===== 7. Posventa =====
  await d.chapter('Posventa', 'Mantención por kilometraje, recalls, desabolladura y repuestos');
  await d.step('Agendar mantención', async () => {
    await d.click('.site-nav a[href="#/posventa"]', { after: .2 });
    await d.caption('Mantención con precio fijo por pauta', 'La pauta se elige según la marca y el kilometraje', { read: .1 });
    await d.type('#s-pat', 'PRTZ58', { blur: true });
    await d.select('#s-brand', 'toyota', { after: .2 });
    await d.select('#s-model', 'corolla', { after: .2 });
    await d.type('#s-km', '38500', { blur: true, after: .3 });
    await d.ring('[data-plan]', 1.4);
    await d.click('[data-days] .day-btn:not([disabled]) >> nth=1', { after: .2 });
    await d.click('[data-slots] .slot:not([disabled]) >> nth=1', { after: .2 });
    await fill(d);
    await d.click('[data-form] button.btn-lg', { after: .2 });
    await d.page.locator('.ticket').waitFor();
    await d.ring('.ticket', 1.3);
  });
  await d.step('Recall', async () => {
    await d.click('.service-tabs a[href="#/posventa/recall"]', { after: .2 });
    await d.caption('Consulta de recall por patente o VIN', 'Un Sportage 2025 con campaña de seguridad pendiente…', { read: 0 });
    await d.type('[data-form] input[name="q"]', 'SKTR42');
    await d.click('[data-form] button.btn-primary', { after: .2 });
    await d.ring('[data-res] .card', 1.5);
    await d.caption('…y un Yaris 2023 sin campañas', 'Si la patente no está registrada, se consulta por marca, modelo y año', { read: 0 });
    await d.type('[data-form] input[name="q"]', 'HJPW71');
    await d.click('[data-form] button.btn-primary', { after: .2 });
    await d.ring('[data-res] .card', 1.3);
  });
  await d.step('Desabolladura y pintura', async () => {
    await d.click('.service-tabs a[href="#/posventa/carroceria"]', { after: .2 });
    await d.caption('Presupuesto de carrocería', 'Se marcan las piezas dañadas sobre el auto y su gravedad', { read: 0 });
    for (const p of ['puerta_del', 'capo']) await d.click(`[data-svg] .panel-zone[data-part="${p}"]`, { after: .4 });
    await d.click('[data-sev="capo"][data-v="grave"]', { after: .3 });
    await d.ring('[data-sum]', 1.3);
  });
  await d.step('Repuestos', async () => {
    await d.click('.service-tabs a[href="#/posventa/repuestos"]', { after: .2 });
    await d.caption('Cotización de repuestos y accesorios', 'Con stock por pieza; se arma una solicitud y se envía', { read: 0 });
    await d.click('[data-cat="Frenos"]', { after: .3 });
    await d.click('[data-list] [data-add] >> nth=0', { after: .2 });
    await d.click('[data-list] [data-add] >> nth=1', { after: .2 });
    await fill(d);
    await d.click('[data-cart] [data-form] button', { after: .2 });
    await d.expectToast(/Solicitud enviada/);
    await d.pause(.6);
  });

  // ===== 8. Cuenta del cliente =====
  await d.chapter('Cuenta del cliente', 'Mis autos, configuraciones, cotizaciones, crédito y servicio en línea');
  await d.step('Ingresar como cliente', async () => {
    await d.click('.header-cta a[href^="login.html"]', { nav: { waitFor: '.demo-account' } });
    await d.caption('Cuentas demo con un clic', 'Cada rol abre un sistema distinto', { read: .6 });
    await d.click(`.demo-account[data-id="${U.cliente}"]`, { nav: { waitFor: '.account-layout' } });
  });
  await d.step('Mis autos', async () => {
    await d.caption('Mis autos', 'Próxima mantención, garantía y alerta de recall pendiente', { read: 0 });
    await d.ring('.my-car .alert-box', 1.3);
    await d.ring('.my-car .next-svc', 1.1);
  });
  await d.step('Aceptar cotización', async () => {
    await d.click('.account-nav a[href="#/cuenta/cotizaciones"]', { after: .2 });
    await d.caption('Cotización formal del ejecutivo', 'Se ve en PDF y se acepta en línea', { read: .1 });
    await d.click('[data-quote="q-cam"]', { after: 1.2 });
    await closeModal(d);
    await d.click('[data-accept="q-cam"]', { after: .3 });
    await d.click('.modal-backdrop [data-ok]', { after: .1 });
    await d.expectToast(/aceptada/);
    await d.pause(.8);
  });
  await d.step('Crédito y servicio', async () => {
    await d.click('.account-nav a[href="#/cuenta/financiamiento"]', { after: .2 });
    await d.caption('Estado del crédito', 'Recibida → En evaluación → Resolución', { read: 1 });
    await d.click('.account-nav a[href="#/cuenta/servicio"]', { after: .2 });
    await d.caption('Servicio en línea', 'Su Sportage entra hoy al taller: aquí verá cada avance', { read: 1.3 });
    await d.click('.account-head [data-logout]', { nav: { waitFor: '.billboard' }, after: 0 });
  });

  // ===== 9. App de ventas =====
  await d.chapter('App del ejecutivo de ventas', 'Pipeline, ficha del lead y cotización formal con control de descuentos', async () => {
    await loginAs(d, U.vendedor, '.kanban');
  });
  await d.step('Pipeline', async () => {
    await d.caption('Pipeline de Catalina Muñoz', 'Arrastra las tarjetas entre etapas; los leads nuevos tienen SLA de primer contacto', { read: .5 });
    const martin = d.page.locator('.kcol[data-stage="nuevo"] .kcard', { hasText: PROSPECTO.name }).first();
    if (!(await martin.count())) throw new Error(`El lead de ${PROSPECTO.name} no está en "Nuevo" de Catalina`);
    await d.drag(martin, '.kcol[data-stage="contactado"]', { after: .1 });
    await d.expectToast(/Contactado/);
    await d.pause(.6);
  });
  await d.step('Ficha del lead', async () => {
    await d.click(d.page.locator('.kcard', { hasText: PROSPECTO.name }).first(), { after: .3 });
    await d.page.locator('.timeline').first().waitFor();
    await d.caption('Ficha del lead', 'Línea de tiempo, datos, test drive, crédito y cotizaciones', { read: .1 });
    await d.click('[data-act] label.seg-tab:nth-child(2)', { after: .1 });
    await d.type('[data-act] input[name="text"]', 'Llamé: quiere 36 cuotas y retoma.', { delay: 25 });
    await d.click('[data-act] button.btn-primary', { after: .1 });
    await d.expectToast(/Actividad registrada/);
    await d.pause(.5);
  });
  await d.step('Cotización con 2%', async () => {
    await d.click('[data-quote]', { after: .3 });
    await d.caption('Cotización formal', 'Descuento de 2%: dentro del margen del ejecutivo (3%)', { read: 0, pos: 'top' });
    await d.type('.modal #q-d', '2', { after: .8 });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.expectToast(/emitida/);
    await d.pause(1.1);
    await closeModal(d);
  });
  await d.step('Descuentos de 10% y 5%', async () => {
    await d.click('[data-quote]', { after: .3 });
    await d.type('.modal #q-d', '10', { after: .1 });
    await d.caption('10%: supera el máximo de gerencia (8%)', 'No se puede emitir', { read: .2, pos: 'top' });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.expectToast(/máximo es 8%/);
    await d.pause(.6);
    await d.type('.modal #q-d', '5', { after: .1 });
    await d.caption('5%: sobre el margen del ejecutivo', 'Queda pendiente de aprobación de gerencia', { read: .7, pos: 'top' });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.expectToast(/aprobación de gerencia/);
    await d.pause(.6);
    await d.ring('.grid-main .table-wrap', 1.2);
  });
  await d.step('Solicitud de crédito', async () => {
    await d.click('[data-fin]', { after: .3 });
    await d.caption('Solicitud de crédito desde la ficha', 'Martín declara una renta baja para esa cuota', { read: 0, pos: 'top' });
    await d.type('.modal [name="renta"]', '850000');
    await d.select('.modal [name="employment"]', 'independiente', { after: .2 });
    await d.click('.modal .modal-foot .btn-primary', { after: .1 });
    await d.expectToast(/enviada al analista/);
    await d.pause(.7);
  });
  await d.step('Ruta protegida', async () => {
    await d.caption('Rutas protegidas por rol', 'Un ejecutivo no puede abrir la aprobación de descuentos', { read: 0 });
    await d.goto('vendedor.html#/aprobaciones', { waitFor: '.empty h2', settle: .2 });
    await d.ring('.admin-content .empty', 1.4);
  });

  // ===== 10. Gerencia =====
  await d.chapter('Gerencia aprueba el descuento', 'El gerente comercial ve las cotizaciones sobre margen y decide', async () => {
    await logoutPanel(d);
    await loginAs(d, U.gerente, '.admin-shell');
    await d.page.locator('.nav-link[href="#/cotizaciones"]').click();
    await d.page.locator('.admin-content table').waitFor();
  });
  await d.step('Aprobar 5%', async () => {
    await d.caption('Cotizaciones por aprobar', 'Descuento, total y ejecutivo de cada caso', { read: .4 });
    const row = d.page.locator('.admin-content tbody tr', { hasText: PROSPECTO.name }).first();
    await d.click(row.locator('[data-act="ok"]'), { after: .3 });
    await d.click('.modal-backdrop [data-ok]', { after: .1 });
    await d.expectToast(/Descuento aprobado/);
    await d.pause(1);
  });

  // ===== 11. Crédito =====
  await d.chapter('Analista de crédito', 'Bandeja, scoring y resolución con condiciones', async () => {
    await logoutPanel(d);
    await loginAs(d, U.analista, '.admin-content');
  });
  await d.step('Bandeja', async () => {
    await d.caption('Bandeja de solicitudes', 'Llegan la pre-evaluación web de Valentina y la solicitud de Martín', { read: 1.2 });
  });
  await d.step('Aprobar con condiciones', async () => {
    await d.click('a[href="#/solicitud/f-cam"]', { after: .3 });
    await d.page.locator('.score-grid').waitFor();
    await d.caption('Scoring de la solicitud de Camila', 'Carga financiera, pie, LTV, historial y recomendación del motor', { read: 0 });
    await d.ring('.score-grid', 1.5);
    await d.type('[data-dec] #cn', 'Pie mínimo 30% y últimas 3 liquidaciones', { delay: 22 });
    await d.click('[data-dec] [data-d="aprobada_condiciones"]', { after: .1 });
    await d.expectToast(/aprobada con condiciones/i);
    await d.pause(.8);
  });
  await d.step('Rechazar otra', async () => {
    await d.click('.admin-sidebar a[href="#/"]', { after: .3 });
    await d.click(d.page.locator('a.appt-row', { hasText: PROSPECTO.name }).first(), { after: .3 });
    await d.page.locator('.score-grid').waitFor();
    await d.caption('La solicitud de Martín', 'Carga financiera muy alta para su renta: el motor recomienda rechazar', { read: 0 });
    await d.ring('.score-grid', 1.5);
    await d.type('[data-dec] #cn', 'Carga financiera sobre 50%: ofrecer más pie o codeudor', { delay: 22 });
    await d.click('[data-dec] [data-d="rechazada"]', { after: .1 });
    await d.expectToast(/rechazada/i);
    await d.pause(.8);
  });

  // ===== 12. Cierre de venta =====
  await d.chapter('Reserva de VIN y cierre de venta', 'Con el crédito aprobado, el ejecutivo reserva la unidad y cierra', async () => {
    await logoutPanel(d);
    await loginAs(d, U.vendedor, '.kanban');
  });
  await d.step('Descuento aprobado', async () => {
    await d.click('.nav-link[href="#/cotizaciones"]', { after: .3 });
    await d.caption('Mis cotizaciones', 'El 5% de Martín ya viene aprobado por gerencia', { read: 0 });
    await d.ring(d.page.locator('.admin-content tbody tr', { hasText: PROSPECTO.name }).first(), 1.4);
    await d.click('.nav-link[href="#/"]', { after: .2 });
    await d.page.locator('.kanban').waitFor();
  });
  await d.step('Ficha de Camila', async () => {
    await d.click(d.page.locator('.kcard', { hasText: 'Camila Fuentes Rojas' }).first(), { after: .3 });
    await d.page.locator('.timeline').first().waitFor();
    await d.caption('Todo el historial en la ficha', 'Aceptó la cotización en línea y su crédito fue aprobado con condiciones', { read: 0 });
    await d.ring('.timeline', 1.8);
  });
  await d.step('Reservar VIN', async () => {
    await d.click('[data-reserve]', { after: .3 });
    await d.caption('Reserva de una unidad por VIN', 'Stock y tránsito de las 3 sucursales', { read: .1, pos: 'top' });
    await d.click('.modal input[name="u"] >> nth=0', { after: .3 });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.expectToast(/Unidad reservada/);
    await d.pause(.5);
  });
  await d.step('Cerrar venta', async () => {
    await d.click('.page-head [data-close]', { after: .3 });
    await d.caption('Cierre de la venta', 'Precio final, forma de pago, retoma y fecha de entrega', { read: .4, pos: 'top' });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.expectToast(/registrada/);
    await d.pause(.6);
    await d.ring('.steps', 1.2);
  });

  // ===== 13. Taller =====
  let otUrl;
  await d.chapter('Asesor de servicio', 'Recepción, orden de trabajo, adicionales aprobados por el cliente y entrega', async () => {
    await logoutPanel(d);
    await loginAs(d, U.asesor, '.admin-content');
  });
  await d.step('Citas de hoy', async () => {
    await d.caption('Citas de hoy en Santiago', 'Con alerta de recall pendiente para el Sportage de Camila', { read: 0 });
    await d.ring('.appt-row:has([data-recv="a-cam"])', 1.5);
  });
  await d.step('Recepción', async () => {
    await d.click('[data-recv="a-cam"]', { after: .3 });
    await d.caption('Recepción del vehículo', 'Kilometraje, combustible, daños existentes y firma del cliente', { read: 0, pos: 'top' });
    await d.type('.modal #rk', '19350');
    await d.click('.modal .fuel-picker label:has(input[value="75"])', { after: .1 });
    await d.click('.modal label:has(input[value="Rayones"])', { after: .1 });
    await d.click('.modal label:has(input[name="sign"])', { after: .2 });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.page.locator('.check-row').first().waitFor();
    otUrl = d.page.url();
    await d.expectToast(/creada/);
  });
  await d.step('Orden de trabajo', async () => {
    await d.caption('Orden de trabajo', 'Checklist de la pauta, detalle de cobro e historial', { read: 0 });
    await d.click('[data-next]', { after: .4 });
    for (let i = 0; i < 3; i++) await d.click(`.check-row >> nth=${i}`, { after: .25 });
    await d.caption('Trabajo adicional', 'Se propone al cliente, que lo aprueba desde su cuenta', { read: 0 });
    await d.type('[data-addup] input[name="desc"]', 'Pastillas de freno delanteras (desgaste 80%)', { delay: 22 });
    await d.type('[data-addup] input[name="price"]', '89990');
    await d.click('[data-addup] button', { after: .1 });
    await d.expectToast(/Propuesta enviada/);
    await d.pause(.6);
  });
  await switchUser(d, 'Camila revisa su cuenta', async () => {
    await logoutPanel(d);
    await loginAs(d, U.cliente, '.account-layout');
    await d.goto('index.html#/cuenta/servicio', { waitFor: '.svc-card', settle: .2 });
  });
  await d.step('Cliente aprueba el adicional', async () => {
    await d.caption('El cliente ve el avance y el adicional', 'Estado de la OT, checklist y recomendación del asesor', { read: .1 });
    await d.ring('.svc-card .alert-box', 1.3);
    await d.click('.svc-card [data-upsell$="|aceptado"]', { after: .1 });
    await d.expectToast(/aprobado/);
    await d.pause(.8);
  });
  await switchUser(d, 'De vuelta en el taller', async () => {
    await d.page.locator('.account-head [data-logout]').click();
    await d.page.waitForLoadState('load');
    await loginAs(d, U.asesor, '.admin-content');
    await d.goto(otUrl.replace(d.base, ''), { waitFor: '.check-row', settle: .2 });
  });
  await d.step('Lista y entrega', async () => {
    await d.caption('Adicional aprobado: el total se actualiza', 'Se completa el checklist y se entrega el vehículo', { read: 0 });
    await d.ring('.grid-main > .stack:last-child .card:first-child', 1.3);
    const n = await d.page.locator('.check-row').count();
    for (let i = 3; i < n; i++) await d.click(`.check-row >> nth=${i}`, { after: .15 });
    await d.click('[data-next]', { after: .4 });
    await d.click('[data-next]', { after: .3 });
    await d.click('.modal [data-ok]', { after: .1 });
    await d.expectToast(/entregado/);
    await d.pause(.8);
  });

  // ===== 14. Administración =====
  await d.chapter('Administración', 'Dashboard, precios y campañas, inventario por VIN, usuarios y bitácora', async () => {
    await logoutPanel(d);
    await loginAs(d, U.admin, '.admin-content .grid-4');
  });
  await d.step('Dashboard', async () => {
    await d.caption('Dashboard comercial y de posventa', 'Ventas, utilidad, embudo de leads, stock, financiamiento y taller', { read: .4 });
    await d.tour(['.admin-content .grid-main', '.admin-content .grid-2 >> nth=1'], { read: 1.2 });
    await d.scrollTo(0);
  });
  await d.step('Campaña → sitio', async () => {
    await d.click('.nav-link[href="#/campanas"]', { after: .3 });
    await d.caption('Precios y campañas con vigencia', 'Desactivamos el "Bono Sportage"…', { read: .1 });
    const row = d.page.locator('.admin-content tbody tr', { hasText: 'Bono Sportage' }).first();
    await d.click(row.locator('label.switch:has([data-act-change="active"])'), { after: .1 });
    await d.expectToast(/Actualizado/);
    await d.pause(.4);
    await d.goto('index.html#/modelo/sportage', { waitFor: '.configurator', settle: .3 });
    await d.caption('…y el configurador público lo refleja al instante', 'El Sportage ya no muestra el bono de $1.500.000', { read: 0 });
    await d.ring('[data-summary] .sum-lines', 1.8);
    await d.goto('admin.html#/inventario', { waitFor: '.admin-content table', settle: .3 });
  });
  await d.step('Inventario por VIN', async () => {
    await d.caption('Inventario por VIN', 'Tránsito → stock → reservado → vendido → entregado, con antigüedad', { read: .2 });
    await d.select('.admin-content [data-f="status"]', 'transito', { after: .3 });
    await d.click('.admin-content [data-act="receive"] >> nth=0', { after: .1 });
    await d.expectToast(/Unidad en stock/);
    await d.pause(.4);
    await d.click('.admin-content [data-csv]', { after: .1 });
    await d.expectToast(/Exportadas/);
    await d.caption('Exportación a CSV', 'Todas las tablas del panel se exportan con sus filtros', { read: .6 });
  });
  await d.step('Usuarios y permisos', async () => {
    await d.click('.nav-link[href="#/usuarios"]', { after: .3 });
    await d.caption('Usuarios, roles y matriz de permisos', 'El rol define menús y rutas; desactivar una cuenta corta su acceso', { read: .2 });
    await d.tour(['.perm-table'], { read: 1.5 });
  });
  await d.step('Bitácora', async () => {
    await d.click('.nav-link[href="#/bitacora"]', { after: .3 });
    await d.caption('Bitácora de actividad', 'Todo lo que hicimos en este video quedó registrado', { read: 0 });
    await d.ring('.admin-content table', 1.8);
  });
  await d.step('Restablecer datos demo', async () => {
    await d.click('.admin-sidebar [data-reset]', { after: .3 });
    await d.click('.modal-backdrop [data-ok]', { after: .1 });
    await d.expectToast(/restablecidos/);
    await d.caption('Restablecer datos demo', 'Vuelve todo a la semilla inicial para el próximo visitante', { read: 1 });
  });

  // ===== 15. Celular =====
  let phone;
  await d.chapter('En el celular', 'El mismo sitio en 390 px con la disposición "App" y pestañas abajo', async () => {
    await logoutPanel(d);
    await d.page.evaluate(() => window.LGWLayout && window.LGWLayout.set('app'));
    phone = await d.phone({
      src: '/automotora/index.html#/',
      label: 'Vista celular · disposición App',
      title: 'Autoplaza en el bolsillo',
      lead: 'Pestañas abajo, tarjetas a todo el ancho y el configurador completo en la palma de la mano.',
      bullets: ['Pestañas de navegación fijas abajo', 'Catálogo y configurador táctiles', 'Simulador de crédito y tasación', 'Agenda de taller y cuenta del cliente']
    });
    await phone.locator('.site-nav').waitFor();
  });
  await d.step('Pestañas y configurador', async () => {
    // Sin subtítulo: taparía la barra de pestañas; los textos laterales de la maqueta explican.
    await d.pause(1);
    await d.click(phone.locator('.site-nav a[href="#/modelos"]'), { after: .5 });
    const tray = phone.locator('#cmp-tray [data-clear]');           // la bandeja del comparador quedó con 3 modelos
    if (await tray.count()) await d.click(tray, { after: .3 });
    await d.click(phone.locator('.model-card a.btn-primary[href="#/modelo/sportage"]'), { after: .6 });
    await phone.locator('.configurator').waitFor();
    await d.click(phone.locator('[data-step="color"]'), { after: .3 });
    for (const c of ['c3', 'c1']) await d.click(phone.locator(`.swatch[data-v="${c}"]`), { after: .6 });
    await d.reveal(phone.locator('[data-summary] .sum-total'));
    await d.pause(1.1);
    await d.click(phone.locator('.site-nav a[href="#/financiamiento"]'), { after: 1.3 });
  });

  // ===== Cierre =====
  await d.outro({
    title: 'Autoplaza Pacífico',
    lead: 'Un concesionario completo, de la web al taller, funcionando en el navegador.',
    list: ['Catálogo, comparador y configurador', 'Crédito, pre-evaluación y tasación', 'Pipeline, cotizaciones y aprobaciones', 'Taller con OT y adicionales en línea', 'Panel con inventario por VIN y bitácora', '30 estilos × 3 disposiciones'],
    url: 'https://elp4nsho.github.io/automotora/',
    foot: 'La Gran Web · portafolio de sistemas web · demo con datos ficticios'
  }, 0);
  await d.hold(6);
  // Deja la disposición por defecto para la próxima vez (fuera de cámara, tras la tarjeta)
  await phone.locator('body').evaluate(() => window.LGWLayout && window.LGWLayout.set('clasica')).catch(() => {});
}

module.exports = { meta, run };
