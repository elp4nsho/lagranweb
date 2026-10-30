/* Minera Altiplano · Inducción XR
   Script clásico (funciona incluso desde file://). La escena 3D (scene.js, ES module + Three.js)
   se carga con import() dinámico; si falla, se usa una vista 2D equivalente. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Datos                                                                */
  /* ------------------------------------------------------------------ */
  var MODULES = [
    {
      id: 'bienvenida', num: 1, title: 'Bienvenida', mode: 'plant', minutes: 5, tags: ['3D', 'Guía virtual'],
      desc: 'Conoce a Ana, tu guía, la operación de la planta y nuestras Reglas que Salvan Vidas.',
      intro: 'Ana te acompañará en un recorrido guiado de 4 paradas. Puedes reproducirlo automáticamente o visitar cada parada a tu ritmo.',
      kicker: 'Parada',
      view: { cam: [-10, 16, 30], target: [0, 0, 2] },
      points: [
        { id: 'guia', title: '¡Hola! Soy Ana, tu guía', pos: [-6, 2.1, 11], cam: [-3.2, 2.8, 16.5],
          text: 'Bienvenida o bienvenido a Minera Altiplano. Durante esta inducción conocerás nuestra planta de procesamiento, los riesgos principales y cómo actuar ante una emergencia. Tu seguridad es lo primero.' },
        { id: 'planta', title: 'Nuestra planta Altiplano Norte', pos: [0, 0.5, -2], cam: [2, 30, 26],
          text: 'Aquí recibimos, chancamos y almacenamos mineral e insumos. La planta se divide en zonas: almacenamiento con racks, tránsito de grúas horquilla, chancado y pasillos peatonales demarcados.' },
        { id: 'operacion', title: 'Qué hacemos', pos: [10, 4.5, -9], cam: [1, 10, 4],
          text: 'El chancador reduce el tamaño del mineral y la correa transportadora lo lleva al acopio. Son equipos de alta energía: sólo personal autorizado puede ingresar a la zona achurada.' },
        { id: 'reglas', title: 'Reglas que Salvan Vidas', pos: [2, 0.5, 6], cam: [8, 6, 17],
          text: '1) Usa siempre tu EPP. 2) Camina sólo por pasillos peatonales. 3) Nunca intervengas un equipo sin bloqueo (LOTO). 4) Respeta la distancia con equipos móviles. 5) Si algo no es seguro, detén el trabajo y repórtalo.' }
      ]
    },
    {
      id: 'epp', num: 2, title: 'Seguridad y EPP', mode: 'epp', minutes: 7, tags: ['3D', 'Interactivo'],
      desc: 'Equipa a un maniquí 3D con el Elemento de Protección Personal correcto para ingresar a planta.',
      intro: 'Selecciona los 5 elementos de protección obligatorios para ingresar a la planta. Cuidado: hay opciones que no corresponden. También puedes tocar una parte del cuerpo en el modelo para recibir una pista.',
      points: [
        { id: 'casco', label: 'Casco de seguridad', e: '⛑️', part: 'head', why: 'Protege la cabeza de golpes y caída de objetos. Debe tener barbiquejo y estar vigente.' },
        { id: 'lentes', label: 'Lentes de seguridad', e: '🥽', part: 'eyes', why: 'Protegen los ojos de partículas y proyecciones. Úsalos siempre, incluso sobre lentes ópticos (sobrelentes).' },
        { id: 'guantes', label: 'Guantes de seguridad', e: '🧤', part: 'hands', why: 'Previenen cortes, abrasiones y contacto con sustancias. Elige el tipo según la tarea.' },
        { id: 'zapatos', label: 'Zapatos de seguridad', e: '🥾', part: 'feet', why: 'Puntera y plantilla de acero protegen contra aplastamiento y perforación.' },
        { id: 'chaleco', label: 'Chaleco reflectante', e: '🦺', part: 'torso', why: 'Te hace visible para operadores de equipos móviles, de día y de noche.' }
      ],
      distractors: [
        { id: 'gorro', label: 'Gorro de lana', e: '🧶', why: 'Un gorro no protege contra impactos. En planta el casco es obligatorio (puedes usar una capucha bajo el casco).' },
        { id: 'audifonos', label: 'Audífonos con música', e: '🎧', why: 'Distraen e impiden oír alarmas y bocinas. Cuando hay ruido se usa protector auditivo certificado, no audífonos.' },
        { id: 'sandalias', label: 'Sandalias', e: '🩴', why: 'Dejan el pie expuesto a aplastamientos, cortes y derrames. Se requieren zapatos de seguridad.' }
      ],
      parts: {
        head: 'La cabeza puede recibir golpes o caída de objetos. ¿Qué la protege?',
        eyes: 'Los ojos están expuestos a polvo y proyección de partículas. ¿Qué elemento usarías?',
        hands: 'Las manos manipulan materiales con bordes y sustancias. ¿Cómo las proteges?',
        feet: 'Los pies pueden sufrir aplastamientos o perforaciones. ¿Qué calzado corresponde?',
        torso: 'Debes ser visible para los operadores de grúas horquilla. ¿Qué te ayuda?'
      }
    },
    {
      id: 'recorrido', num: 3, title: 'Recorrido por la planta', mode: 'plant', minutes: 10, tags: ['3D', 'VR'],
      desc: 'Explora la planta en 3D y descubre 7 puntos de interés: zonas de riesgo, equipos y salidas.',
      intro: 'Visita los 7 puntos de interés. Toca los marcadores numerados en la escena o usa la lista. El modo “Recorrido guiado” anima la cámara entre cada punto.',
      kicker: 'Punto de interés',
      view: { cam: [-12, 20, 30], target: [0, 0, 0] },
      points: [
        { id: 'acceso', title: 'Control de acceso', pos: [-8, 2.4, 14], cam: [-3, 6, 24],
          text: 'Registra tu ingreso con tu credencial en el torniquete. Aquí se verifica que traigas tu EPP completo. Visitas siempre acompañadas.' },
        { id: 'pasillo', title: 'Pasillos peatonales', pos: [-15, 0.6, 6], cam: [-9, 5, 15],
          text: 'Las líneas amarillas delimitan el pasillo peatonal. Camina siempre dentro de él, sin usar el celular, y cruza sólo por los pasos cebra.' },
        { id: 'racks', title: 'Zona de almacenamiento (racks)', pos: [-12, 4.6, -7], cam: [-1, 10, 9],
          text: 'Nunca escales un rack ni superes la carga máxima indicada en la placa. Si ves un montante dañado o una carga inestable, repórtalo de inmediato.' },
        { id: 'grua', title: 'Tránsito de grúas horquilla', pos: [-8, 3, 1.5], cam: [-1, 5, 10],
          text: 'Mantén al menos 3 metros de distancia de un equipo en movimiento y establece contacto visual con el operador antes de cruzar. El equipo móvil no siempre puede verte.' },
        { id: 'chancador', title: 'Chancador y correa transportadora', pos: [10, 5, -9], cam: [3, 9, 3],
          text: 'Zona restringida (achurado amarillo/negro). Antes de cualquier intervención se aplica bloqueo y etiquetado (LOTO) con candado personal. Nunca retires una guarda.' },
        { id: 'extintor', title: 'Extintores', pos: [21.3, 1.6, 1.5], cam: [14, 4, 7],
          text: 'Hay extintores PQS cada 15 a 20 m, señalizados en rojo. Para usarlo: retira el pasador, apunta a la base del fuego, aprieta la palanca y barre de lado a lado.' },
        { id: 'salida', title: 'Salidas de emergencia', pos: [21.6, 3, 6], cam: [12, 5, 13],
          text: 'Señalizadas en verde y con iluminación de emergencia. Nunca deben estar obstruidas ni bloqueadas con llave. Ubica siempre la salida más cercana a tu puesto.' }
      ]
    },
    {
      id: 'emergencias', num: 4, title: 'Emergencias y evacuación', mode: 'plant', minutes: 8, tags: ['3D', 'Simulacro'],
      desc: 'Aprende el protocolo de evacuación y sigue la ruta animada hasta el punto de encuentro.',
      intro: 'Revisa los 5 pasos del protocolo y luego ejecuta el simulacro: verás la ruta de evacuación animada desde la zona de chancado hasta el punto de encuentro.',
      kicker: 'Paso',
      route: true,
      view: { cam: [-2, 24, 32], target: [8, 0, 2] },
      points: [
        { id: 'alarma', title: '1. Reconoce la alarma', pos: [0, 6.6, -14.4], cam: [2, 6, -2],
          text: 'Sirena continua y balizas rojas = evacuación general. Mantén la calma y escucha las instrucciones por altavoz.' },
        { id: 'detener', title: '2. Detén tu trabajo de forma segura', pos: [10, 2.2, -4.6], cam: [6, 5, 3],
          text: 'Detén el equipo que operas, deja las herramientas en un lugar seguro y no te detengas a buscar pertenencias.' },
        { id: 'ruta', title: '3. Sigue la ruta de evacuación', pos: [15, 0.8, 6], cam: [9, 5, 14],
          text: 'Sigue las flechas verdes por el pasillo peatonal. Camina rápido, sin correr, y ayuda a quien lo necesite. Nunca uses un equipo móvil para evacuar.' },
        { id: 'salidaE', title: '4. Sal por la salida de emergencia', pos: [22, 3, 6], cam: [16, 5, 13],
          text: 'Usa la salida más cercana. Si hay humo, avanza agachado. Una vez fuera, no vuelvas a entrar por ningún motivo.' },
        { id: 'encuentro', title: '5. Dirígete al punto de encuentro', pos: [30, 2.4, 12], cam: [24, 6, 20],
          text: 'Repórtate con el líder de evacuación para el conteo de personas. Permanece allí hasta que se autorice el regreso.' }
      ],
      extra: ['simulacro']
    },
    {
      id: 'evaluacion', num: 5, title: 'Evaluación final', mode: 'quiz', minutes: 10, tags: ['Quiz', 'Certificado'],
      desc: '10 preguntas sobre lo aprendido. Con 80% o más obtienes tu certificado digital.'
    }
  ];

  var PASS = 0.8;
  var QUESTIONS = [
    { q: '¿Qué elemento protege la cabeza ante la caída de objetos?', o: ['Gorro de lana', 'Casco de seguridad', 'Lentes de seguridad', 'Chaleco reflectante'], a: 1, why: 'El casco con barbiquejo es obligatorio en toda la planta.' },
    { q: '¿De qué color es la señalética de las salidas de emergencia?', o: ['Rojo', 'Amarillo', 'Verde', 'Azul'], a: 2, why: 'Verde indica condición segura: salidas, rutas de evacuación y puntos de encuentro.' },
    { q: 'Suena la alarma de evacuación. ¿Qué haces primero?', o: ['Termino mi tarea y luego salgo', 'Detengo mi trabajo de forma segura y sigo la ruta de evacuación', 'Voy a buscar mis pertenencias', 'Espero a ver si es un simulacro'], a: 1, why: 'Detén el trabajo de forma segura y evacúa de inmediato, sin buscar pertenencias.' },
    { q: '¿Qué distancia mínima debes mantener con una grúa horquilla en movimiento?', o: ['50 cm', '1 metro', '3 metros', 'No hay distancia mínima'], a: 2, why: 'Al menos 3 metros, y contacto visual con el operador antes de cruzar.' },
    { q: '¿Cómo se demarcan los pasillos peatonales en la planta?', o: ['Con líneas amarillas en el piso', 'Con conos rojos', 'No están demarcados', 'Con cinta azul'], a: 0, why: 'Las líneas amarillas delimitan por dónde se puede caminar con seguridad.' },
    { q: 'Antes de intervenir una máquina como el chancador, se debe:', o: ['Pedir a un compañero que vigile', 'Aplicar bloqueo y etiquetado (LOTO)', 'Retirar la guarda para ver mejor', 'Hacerlo rápido mientras está detenida'], a: 1, why: 'El bloqueo con candado personal evita que el equipo se energice durante la intervención.' },
    { q: 'Al usar un extintor, ¿hacia dónde debes apuntar?', o: ['A la parte alta de las llamas', 'Al humo', 'A la base del fuego', 'Al techo'], a: 2, why: 'Apuntar a la base del fuego ataca el combustible. Luego barre de lado a lado.' },
    { q: 'Detectas una condición insegura en tu área. ¿Qué corresponde?', o: ['Ignorarla si no es mi tarea', 'Detener el trabajo y reportarla a mi supervisor', 'Comentarla al final del turno', 'Sacarle una foto para redes sociales'], a: 1, why: 'Todas las personas tienen la facultad y el deber de detener un trabajo inseguro.' },
    { q: 'Al llegar al punto de encuentro debes:', o: ['Retirarte a tu casa', 'Volver por tus herramientas', 'Reportarte con el líder de evacuación para el conteo', 'Esperar dentro de tu vehículo'], a: 2, why: 'El conteo permite saber si falta alguien y dirigir el rescate.' },
    { q: '¿Por qué no se deben usar audífonos con música en la planta?', o: ['Porque se pueden perder', 'Porque impiden oír alarmas, bocinas y advertencias', 'Porque gastan batería', 'Sí se pueden usar a bajo volumen'], a: 1, why: 'Necesitas oír tu entorno. Ante ruido se usa protector auditivo certificado.' }
  ];

  var STORE_KEY = 'ma-induccion-v1';
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                           */
  /* ------------------------------------------------------------------ */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function modById(id) { for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i]; return null; }
  function toast(msg, warn) {
    var t = document.createElement('div');
    t.className = 'toast' + (warn ? ' warn' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }

  /* ------------------------------------------------------------------ */
  /* Persistencia (localStorage con try/catch y respaldo en memoria)      */
  /* ------------------------------------------------------------------ */
  var db = { current: null, users: {} };
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.users) db = parsed; }
  } catch (e) { /* almacenamiento no disponible: se usa memoria */ }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* noop */ } }
  function user() { return db.current ? db.users[db.current] : null; }

  function checkpointsOf(m) {
    if (m.mode === 'quiz') return ['aprobado'];
    var ids = m.points.map(function (p) { return p.id; });
    return m.extra ? ids.concat(m.extra) : ids;
  }
  function doneSet(m) { var u = user(); return (u && u.progress[m.id]) || []; }
  function modPct(m) {
    var u = user(); if (!u) return 0;
    if (m.mode === 'quiz') return u.quiz && u.quiz.passed ? 1 : 0;
    var all = checkpointsOf(m), d = doneSet(m);
    return all.filter(function (c) { return d.indexOf(c) >= 0; }).length / all.length;
  }
  function totalPct() { return MODULES.reduce(function (s, m) { return s + modPct(m); }, 0) / MODULES.length; }
  function quizUnlocked() {
    var u = user(); if (!u) return false;
    if (u.unlocked) return true;
    return MODULES.filter(function (m) { return m.mode !== 'quiz'; }).every(function (m) { return modPct(m) >= 1; });
  }
  function markDone(modId, cp) {
    var u = user(); if (!u) return;
    var m = modById(modId);
    var before = modPct(m);
    var arr = u.progress[modId] || (u.progress[modId] = []);
    if (arr.indexOf(cp) < 0) { arr.push(cp); save(); }
    if (before < 1 && modPct(m) >= 1) {
      toast('✓ Módulo «' + m.title + '» completado');
    }
    if (currentModule && currentModule.id === modId) updateModuleProgress();
  }

  /* ------------------------------------------------------------------ */
  /* RUT                                                                  */
  /* ------------------------------------------------------------------ */
  function rutDV(body) {
    var sum = 0, mul = 2;
    for (var i = body.length - 1; i >= 0; i--) { sum += parseInt(body[i], 10) * mul; mul = mul === 7 ? 2 : mul + 1; }
    var r = 11 - (sum % 11);
    return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  }
  function parseId(input) {
    var v = String(input || '').toUpperCase().replace(/[.\s]/g, '');
    var m = v.match(/^(\d{7,8})-?([\dK])$/);
    if (m) {
      if (rutDV(m[1]) !== m[2]) return { error: 'El dígito verificador del RUT no es válido.' };
      var b = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return { id: m[1] + '-' + m[2], display: b + '-' + m[2] };
    }
    if (/^[A-Z0-9-]{5,16}$/.test(v)) return { id: v, display: v };
    return { error: 'Ingresa un RUT (ej: 12.345.678-5) o un ID de 5 a 16 caracteres.' };
  }

  /* ------------------------------------------------------------------ */
  /* Router                                                               */
  /* ------------------------------------------------------------------ */
  var currentModule = null;
  function route() {
    var h = location.hash || '';
    if (h.indexOf('#/') !== 0) {
      leaveModule();
      document.body.dataset.screen = 'landing';
      updateHeader();
      return;
    }
    document.body.dataset.screen = 'app';
    var parts = h.slice(2).split('/');
    var view = parts[0];
    if (!user() && view !== 'ingresar') { location.replace('#/ingresar'); return; }
    if (view !== 'modulo') leaveModule();
    $$('.view').forEach(function (v) { v.hidden = true; });
    updateHeader();
    window.scrollTo(0, 0);
    if (view === 'ingresar') showLogin();
    else if (view === 'panel') showDashboard();
    else if (view === 'modulo' && modById(parts[1]) && modById(parts[1]).mode !== 'quiz') showModule(modById(parts[1]));
    else if (view === 'evaluacion') showQuiz();
    else if (view === 'certificado') showCert();
    else { location.replace('#/panel'); return; }
    var title = $('.view:not([hidden]) .view-title');
    if (title) { title.setAttribute('tabindex', '-1'); try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); } }
  }

  function updateHeader() {
    var u = user();
    var chip = $('#user-chip'), cta = $('#top-cta'), out = $('#logout');
    if (u) {
      chip.hidden = false; chip.textContent = u.name;
      cta.textContent = 'Mi panel'; cta.setAttribute('href', '#/panel');
      out.hidden = false;
    } else {
      chip.hidden = true; out.hidden = true;
      cta.textContent = 'Ingresar'; cta.setAttribute('href', '#/ingresar');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Landing                                                              */
  /* ------------------------------------------------------------------ */
  var ICONS = {
    bienvenida: '<path d="M20 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM8 34c1-7 6-11 12-11s11 4 12 11"/>',
    epp: '<path d="M8 22a12 12 0 0 1 24 0zM5 22h30v3H5zM20 10v6"/>',
    recorrido: '<path d="M5 30 20 8l15 22zM14 30v-7h12v7"/>',
    emergencias: '<path d="M6 32h28M10 32V20a10 10 0 0 1 20 0v12M20 4v4M32 10l-3 3M8 10l3 3"/>',
    evaluacion: '<path d="M10 5h20v30H10zM15 14l3 3 6-6M15 25h10"/>'
  };
  function renderLanding() {
    $('#landing-modules').innerHTML = MODULES.map(function (m) {
      return '<li class="mod-item"><svg class="mod-ico" viewBox="0 0 40 40" fill="none" stroke="#ffc533" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[m.id] + '</svg>' +
        '<span class="num">MÓDULO 0' + m.num + '</span><h3>' + esc(m.title) + '</h3><p>' + esc(m.desc) + '</p>' +
        '<div class="tags"><span class="tag gray">' + m.minutes + ' min</span>' + m.tags.map(function (t, i) { return '<span class="tag' + (i ? ' amber' : '') + '">' + esc(t) + '</span>'; }).join('') + '</div></li>';
    }).join('');
  }
  function detectXR() {
    var el = $('#xr-status');
    if (!('xr' in navigator) || !window.isSecureContext) {
      el.textContent = 'Tu navegador actual no expone WebXR: podrás usar el modo 3D con mouse o pantalla táctil. En Meta Quest, abre esta página desde su navegador (HTTPS).';
      return;
    }
    navigator.xr.isSessionSupported('immersive-vr').then(function (ok) {
      if (ok) { el.textContent = '✓ Dispositivo compatible con realidad virtual: verás el botón «Entrar en VR» en los módulos 3D.'; el.classList.add('ok'); }
      else el.textContent = 'No se detectó un visor VR. Puedes usar el modo 3D; en Meta Quest aparecerá el botón «Entrar en VR».';
    }).catch(function () { el.textContent = 'No se pudo comprobar la compatibilidad VR. El modo 3D funciona igual.'; });
  }

  /* ------------------------------------------------------------------ */
  /* Login                                                                */
  /* ------------------------------------------------------------------ */
  function showLogin() {
    $('#view-login').hidden = false;
    var u = user(), r = $('#resume');
    if (u) {
      r.hidden = false;
      r.innerHTML = '<span>Sesión activa: <strong>' + esc(u.name) + '</strong> (' + Math.round(totalPct() * 100) + '%)</span><a class="btn btn-sm btn-green" href="#/panel">Continuar</a>';
    } else r.hidden = true;
  }
  function setErr(input, errEl, msg) {
    errEl.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  $('#login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nameI = $('#f-name'), rutI = $('#f-rut');
    var name = nameI.value.trim().replace(/\s+/g, ' ');
    var ok = true;
    if (name.length < 3 || !/[a-záéíóúñü]/i.test(name)) { setErr(nameI, $('#e-name'), 'Ingresa tu nombre completo.'); ok = false; } else setErr(nameI, $('#e-name'));
    var p = parseId(rutI.value);
    if (p.error) { setErr(rutI, $('#e-rut'), p.error); ok = false; } else setErr(rutI, $('#e-rut'));
    if (!ok) { ($('[aria-invalid="true"]') || nameI).focus(); return; }
    var existing = db.users[p.id];
    if (existing) { existing.name = name; }
    else db.users[p.id] = { name: name, rut: p.display, progress: {}, quiz: null, created: Date.now() };
    db.current = p.id;
    save();
    toast(existing ? 'Bienvenido de vuelta, ' + name.split(' ')[0] : 'Perfil creado. ¡Comencemos!');
    location.hash = '#/panel';
  });
  $('#logout').addEventListener('click', function () {
    db.current = null; save();
    toast('Sesión cerrada');
    location.hash = '#inicio';
  });

  /* ------------------------------------------------------------------ */
  /* Dashboard                                                            */
  /* ------------------------------------------------------------------ */
  function showDashboard() {
    var u = user();
    $('#view-dashboard').hidden = false;
    $('#dash-hello').textContent = 'Hola, ' + u.name.split(' ')[0];
    var tp = Math.round(totalPct() * 100);
    $('#dash-sub').textContent = tp >= 100 ? '¡Completaste tu inducción! Ya puedes descargar tu certificado.' : 'RUT/ID ' + u.rut + ' · Completa los módulos en orden recomendado. Tu avance se guarda automáticamente.';
    $('#ring-pct').textContent = tp + '%';
    $('#dash-ring').setAttribute('aria-label', 'Progreso total: ' + tp + '%');
    $('#ring-fg').style.strokeDashoffset = String(326.7 * (1 - tp / 100));
    var unlocked = quizUnlocked();
    $('#dash-grid').innerHTML = MODULES.map(function (m) {
      var p = modPct(m), pct = Math.round(p * 100);
      var isQuiz = m.mode === 'quiz';
      var locked = isQuiz && !unlocked && p < 1;
      var st = locked ? ['s-lock', 'Bloqueado'] : p >= 1 ? ['s-done', 'Completado'] : (p > 0 || (isQuiz && u.quiz)) ? ['s-prog', 'En curso'] : ['s-new', 'Pendiente'];
      var href = isQuiz ? (p >= 1 ? '#/certificado' : '#/evaluacion') : '#/modulo/' + m.id;
      var label = isQuiz ? (p >= 1 ? 'Ver certificado' : locked ? 'Ver requisitos' : 'Rendir evaluación') : p >= 1 ? 'Repasar' : p > 0 ? 'Continuar' : 'Comenzar';
      var extra = isQuiz && u.quiz ? ' · Mejor puntaje ' + Math.round(u.quiz.best * 100) + '%' : '';
      return '<li><article class="dcard' + (p >= 1 ? ' done' : '') + (locked ? ' locked' : '') + '" style="--p:' + pct + '%">' +
        '<div class="top"><span class="num">MÓDULO 0' + m.num + '</span><span class="status ' + st[0] + '">' + st[1] + '</span></div>' +
        '<h2>' + esc(m.title) + '</h2><p>' + esc(m.desc) + '</p>' +
        '<div class="meta"><span class="pct">' + (isQuiz ? (p >= 1 ? 'Aprobado' : '—') : pct + '%') + ' · ' + m.minutes + ' min' + extra + '</span>' +
        '<a class="btn btn-sm ' + (locked ? 'btn-ghost' : 'btn-primary') + '" href="' + href + '" aria-label="' + label + ': ' + esc(m.title) + '">' + label + '</a></div></article></li>';
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Experiencia 3D (carga diferida)                                      */
  /* ------------------------------------------------------------------ */
  var expPromise = null, exp = null, threeFailed = false;
  function ensureExperience() {
    if (expPromise) return expPromise;
    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 15000); });
    expPromise = Promise.race([import('./scene.js'), timeout]).then(function (mod) {
      exp = mod.createExperience({
        container: $('#stage'),
        markers: $('#markers'),
        vrSlot: $('#vr-slot'),
        reducedMotion: reducedMotion,
        onSelect: function (id) { if (currentModule) selectPoint(id, { from3d: true }); },
        onPart: function (part) { if (currentModule && currentModule.id === 'epp') eppHint(part); }
      });
      return exp;
    }).catch(function (err) {
      threeFailed = true;
      if (window.console) console.warn('[Inducción XR] 3D no disponible, se usa vista 2D:', err && err.message);
      throw err;
    });
    return expPromise;
  }

  /* ------------------------------------------------------------------ */
  /* Vista módulo                                                         */
  /* ------------------------------------------------------------------ */
  var tour = { on: false, i: 0, timer: null };
  var activePoint = null;
  var simRunning = false;

  function leaveModule() {
    if (!currentModule) return;
    stopTour();
    closeCard();
    stopAlarm();
    if (exp) exp.pause();
    currentModule = null;
  }

  function showModule(m) {
    var switching = currentModule !== m;
    if (switching) leaveModule();
    currentModule = m;
    $('#view-module').hidden = false;
    $('#mod-eyebrow').textContent = 'Módulo ' + m.num + ' de ' + MODULES.length + ' · ' + m.minutes + ' min';
    $('#mod-title').textContent = m.title;
    $('#t-tour').hidden = m.mode !== 'plant';
    $('#t-tour').setAttribute('aria-pressed', 'false');
    $('#viewer-hint').textContent = m.mode === 'epp' ? 'Arrastra para girar el maniquí · Toca una parte del cuerpo para una pista' : 'Arrastra para girar · Rueda o pellizco para acercar · Toca los puntos numerados';
    renderPanel(m);
    restoreEppButtons();
    updateModuleProgress();
    closeCard();
    $('#markers').innerHTML = '';
    var viewer = $('#viewer');
    if (threeFailed) { showFallback(m); return; }
    $('#viewer-loading').hidden = false;
    ensureExperience().then(function (e) {
      if (currentModule !== m) return;
      $('#viewer-loading').hidden = true;
      viewer.classList.remove('is-fallback');
      $('#viewer-fallback').hidden = true;
      e.setMode(m.mode, { points: m.mode === 'plant' ? m.points : [], view: m.view, route: !!m.route });
      e.setVisited(doneSet(m));
      if (m.mode === 'epp') { e.resetEquip(); doneSet(m).forEach(function (id) { e.equip(id, true); }); }
      e.resume();
    }).catch(function () {
      if (currentModule !== m) return;
      showFallback(m);
    });
  }

  function updateModuleProgress() {
    var m = currentModule; if (!m) return;
    var pct = Math.round(modPct(m) * 100);
    $('#mod-bar').style.width = pct + '%';
    $('#mod-pct').textContent = pct + '%';
    var d = doneSet(m);
    $$('#mod-panel [data-cp]').forEach(function (b) {
      var done = d.indexOf(b.dataset.cp) >= 0;
      b.classList.toggle('done', done);
      var n = b.querySelector('.n'); if (n) n.textContent = done ? '✓' : n.dataset.n;
    });
    $$('.hs-marker').forEach(function (mk) { mk.classList.toggle('visited', d.indexOf(mk.dataset.id) >= 0); });
    if (exp && !threeFailed) exp.setVisited(d);
    var box = $('#complete-box');
    if (box) box.hidden = pct < 100;
  }

  function nextModuleHref(m) {
    var idx = MODULES.indexOf(m), nx = MODULES[idx + 1];
    if (!nx) return '#/panel';
    return nx.mode === 'quiz' ? '#/evaluacion' : '#/modulo/' + nx.id;
  }
  function completeBox(m) {
    var nx = MODULES[MODULES.indexOf(m) + 1];
    return '<div class="complete-box" id="complete-box" hidden><p>✓ ¡Módulo completado!</p><div class="panel-actions">' +
      '<a class="btn btn-sm btn-primary" href="' + nextModuleHref(m) + '">' + (nx ? 'Siguiente: ' + esc(nx.title) : 'Ir al panel') + '</a>' +
      '<a class="btn btn-sm btn-ghost" href="#/panel">Mi panel</a></div></div>';
  }

  function renderPanel(m) {
    var html = '<h2>' + (m.mode === 'epp' ? 'Equipa al trabajador' : m.id === 'emergencias' ? 'Protocolo de evacuación' : m.id === 'bienvenida' ? 'Recorrido de bienvenida' : 'Puntos de interés') + '</h2><p>' + esc(m.intro) + '</p>';
    if (m.mode === 'epp') {
      var opts = m.points.concat(m.distractors);
      // orden intercalado fijo para que las respuestas no queden agrupadas
      var order = [0, 5, 1, 2, 6, 3, 7, 4].map(function (i) { return opts[i]; });
      html += '<div class="epp-grid" role="group" aria-label="Elementos disponibles">' + order.map(function (o) {
        return '<button type="button" class="epp-opt" data-epp="' + o.id + '"><span class="e" aria-hidden="true">' + o.e + '</span>' + esc(o.label) + '</button>';
      }).join('') + '</div>';
      html += '<p class="feedback" id="epp-fb" role="status" aria-live="polite"></p>';
      html += '<h2 style="margin-top:16px">Equipado</h2><ul class="checklist">' + m.points.map(function (p, i) {
        return '<li><div class="ck" data-cp="' + p.id + '"><span class="n" data-n="' + (i + 1) + '">' + (i + 1) + '</span><span><b>' + esc(p.label) + '</b><small>' + esc(p.why) + '</small></span></div></li>';
      }).join('') + '</ul><div class="panel-actions"><button type="button" class="btn btn-sm btn-ghost" id="epp-reset">Quitar todo y reintentar</button></div>';
    } else {
      if (m.id === 'emergencias') {
        html += '<div class="panel-actions" style="margin:0 0 6px"><button type="button" class="btn btn-sm btn-primary" id="sim-btn">🚨 Iniciar simulacro</button></div>' +
          '<p class="feedback" id="sim-fb" role="status" aria-live="polite"></p>';
      } else {
        html += '<div class="panel-actions" style="margin:0 0 6px"><button type="button" class="btn btn-sm btn-primary" id="tour-btn2">▶ Iniciar recorrido guiado</button></div>';
      }
      html += '<ul class="checklist">' + m.points.map(function (p, i) {
        return '<li><button type="button" class="ck" data-cp="' + p.id + '" data-point="' + p.id + '"><span class="n" data-n="' + (i + 1) + '">' + (i + 1) + '</span><span><b>' + esc(p.title.replace(/^\d\.\s*/, '')) + '</b><small>' + esc(p.text.slice(0, 70)) + '…</small></span></button></li>';
      }).join('');
      if (m.id === 'emergencias') html += '<li><div class="ck" data-cp="simulacro"><span class="n" data-n="★">★</span><span><b>Simulacro de evacuación</b><small>Completa el simulacro con la ruta animada.</small></span></div></li>';
      html += '</ul>';
    }
    html += completeBox(m);
    $('#mod-panel').innerHTML = html;
  }

  // Delegación de eventos del panel
  $('#mod-panel').addEventListener('click', function (ev) {
    var t = ev.target.closest('button'); if (!t || !currentModule) return;
    if (t.dataset.point) { stopTour(); selectPoint(t.dataset.point); }
    else if (t.dataset.epp) chooseEpp(t.dataset.epp, t);
    else if (t.id === 'epp-reset') resetEpp();
    else if (t.id === 'tour-btn2') toggleTour();
    else if (t.id === 'sim-btn') runSimulation();
  });

  function selectPoint(id, opts) {
    var m = currentModule; if (!m || m.mode !== 'plant') return;
    var idx = -1;
    m.points.forEach(function (p, i) { if (p.id === id) idx = i; });
    if (idx < 0) return;
    var p = m.points[idx];
    activePoint = id;
    if (exp && !threeFailed) { exp.focus(id); exp.setActive(id); }
    $$('.hs-marker').forEach(function (mk) { mk.classList.toggle('active', mk.dataset.id === id); });
    $$('#mod-panel .ck').forEach(function (b) { b.classList.toggle('active', b.dataset.point === id); });
    openCard(p, idx, m);
    markDone(m.id, id);
  }

  function openCard(p, idx, m) {
    var card = $('#info-card');
    $('#ic-kicker').textContent = (m.kicker || 'Punto') + ' ' + (idx + 1) + ' de ' + m.points.length;
    $('#ic-title').textContent = p.title;
    $('#ic-text').textContent = p.text;
    $('#ic-next').hidden = idx >= m.points.length - 1;
    card.hidden = false;
  }
  function closeCard() {
    $('#info-card').hidden = true;
    activePoint = null;
    $$('.hs-marker.active').forEach(function (mk) { mk.classList.remove('active'); });
    if (exp && !threeFailed) exp.setActive(null);
  }
  $('#ic-ok').addEventListener('click', function () { stopTour(); closeCard(); });
  $('#ic-next').addEventListener('click', function () {
    var m = currentModule; if (!m) return;
    var idx = m.points.findIndex(function (p) { return p.id === activePoint; });
    if (tour.on) { clearTimeout(tour.timer); tour.i = idx + 1; tourStep(); }
    else selectPoint(m.points[Math.min(idx + 1, m.points.length - 1)].id);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#info-card').hidden) { stopTour(); closeCard(); } });

  // Recorrido guiado
  function toggleTour() { if (tour.on) { stopTour(); closeCard(); } else startTour(); }
  function startTour() {
    var m = currentModule; if (!m || m.mode !== 'plant') return;
    tour.on = true; tour.i = 0;
    setTourUI(true);
    tourStep();
  }
  function tourStep() {
    var m = currentModule; if (!tour.on || !m) return;
    if (tour.i >= m.points.length) { stopTour(); toast('Recorrido guiado finalizado'); if (exp && !threeFailed) exp.resetView(); return; }
    selectPoint(m.points[tour.i].id);
    tour.timer = setTimeout(function () { tour.i++; tourStep(); }, reducedMotion ? 9000 : 7500);
  }
  function stopTour() {
    tour.on = false; clearTimeout(tour.timer);
    setTourUI(false);
  }
  function setTourUI(on) {
    $('#t-tour').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('#t-tour').textContent = on ? '❚❚ Detener recorrido' : '▶ Recorrido guiado';
    var b2 = $('#tour-btn2'); if (b2) b2.textContent = on ? '❚❚ Detener recorrido' : '▶ Iniciar recorrido guiado';
  }
  $('#t-tour').addEventListener('click', toggleTour);
  $('#t-reset').addEventListener('click', function () { stopTour(); closeCard(); if (exp && !threeFailed) exp.resetView(); });

  // EPP
  function chooseEpp(id, btn) {
    var m = currentModule, fb = $('#epp-fb');
    var good = m.points.filter(function (p) { return p.id === id; })[0];
    var bad = m.distractors.filter(function (p) { return p.id === id; })[0];
    if (good) {
      btn.classList.remove('bad'); btn.classList.add('ok');
      fb.className = 'feedback ok';
      fb.textContent = '✓ Correcto: ' + good.label + '. ' + good.why;
      markDone(m.id, id);
      if (exp && !threeFailed) exp.equip(id); else updateEpp2d();
      if (modPct(m) >= 1) fb.textContent += ' ¡Trabajador completamente equipado!';
    } else if (bad) {
      btn.classList.remove('bad'); void btn.offsetWidth; btn.classList.add('bad');
      fb.className = 'feedback bad';
      fb.textContent = '✗ ' + bad.label + ' no es un EPP adecuado. ' + bad.why;
    }
  }
  function eppHint(part) {
    var m = currentModule, fb = $('#epp-fb'); if (!fb) return;
    var item = m.points.filter(function (p) { return p.part === part; })[0];
    fb.className = 'feedback';
    if (item && doneSet(m).indexOf(item.id) >= 0) fb.textContent = '✓ Esta zona ya está protegida con: ' + item.label + '.';
    else fb.textContent = 'Pista: ' + m.parts[part];
  }
  function resetEpp() {
    var u = user(); u.progress.epp = []; save();
    $$('.epp-opt').forEach(function (b) { b.classList.remove('ok', 'bad'); });
    var fb = $('#epp-fb'); fb.textContent = ''; fb.className = 'feedback';
    if (exp && !threeFailed) exp.resetEquip(); else updateEpp2d();
    updateModuleProgress();
  }

  // Simulacro
  function runSimulation() {
    if (simRunning) return;
    simRunning = true; stopTour(); closeCard();
    var btn = $('#sim-btn'), fb = $('#sim-fb');
    btn.disabled = true;
    fb.className = 'feedback';
    fb.textContent = '🚨 Alarma activada. Siguiendo la ruta verde hacia la salida de emergencia…';
    $('#alarm').classList.add('on');
    var dur = reducedMotion ? 4000 : 9000;
    var p = (exp && !threeFailed) ? exp.runEvacuation(dur) : run2dEvac(dur);
    p.then(function () {
      stopAlarm();
      simRunning = false;
      if (!currentModule || currentModule.id !== 'emergencias') return;
      btn.disabled = false; btn.textContent = '↻ Repetir simulacro';
      fb.className = 'feedback ok';
      fb.textContent = '✓ Llegaste al punto de encuentro. Repórtate con el líder de evacuación.';
      markDone('emergencias', 'simulacro');
    });
  }
  function stopAlarm() { $('#alarm').classList.remove('on'); }

  /* ------------------------------------------------------------------ */
  /* Vista 2D de respaldo                                                 */
  /* ------------------------------------------------------------------ */
  var ROUTE = [[10, -3.5], [10, 4], [12, 6], [21, 6], [24, 6.5], [28, 10], [30, 12]];
  function showFallback(m) {
    var viewer = $('#viewer');
    viewer.classList.add('is-fallback');
    $('#viewer-loading').hidden = true;
    $('#viewer-fallback').hidden = false;
    var body = $('#fb-body');
    if (m.mode === 'epp') { body.innerHTML = epp2dSVG(); updateEpp2d(); return; }
    body.innerHTML = map2d(m);
    $$('.map2d .hs-marker', body).forEach(function (b) {
      b.addEventListener('click', function () { stopTour(); selectPoint(b.dataset.id); });
    });
    updateModuleProgress();
  }
  function map2d(m) {
    var pts = ROUTE.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    var svg = '<svg viewBox="-24 -17 60 34" role="img" aria-label="Plano de la planta visto desde arriba">' +
      '<rect x="-24" y="-17" width="60" height="34" fill="#1a1d22"/>' +
      '<rect x="-22" y="-15" width="44" height="30" fill="#2a3240" stroke="#5b6b85" stroke-width=".3"/>' +
      // racks
      '<g fill="#3567c9">' + [-11, -7, -3].map(function (z) { return '<rect x="-19" y="' + (z - .6) + '" width="14" height="1.2"/>'; }).join('') + '</g>' +
      // zona achurada
      '<defs><pattern id="hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width=".7" height="1.4" fill="#ffc533"/></pattern></defs>' +
      '<rect x="5" y="-14" width="16" height="10" fill="url(#hatch)" opacity=".35"/>' +
      '<circle cx="10" cy="-9" r="2.4" fill="#8a96a8"/><rect x="12" y="-9.5" width="7" height="1" fill="#555"/>' +
      // pasillo peatonal
      '<rect x="-21" y="5" width="42" height="2" fill="#ffc533" opacity=".18"/>' +
      '<path d="M-21 5H21M-21 7H21" stroke="#ffc533" stroke-width=".25"/>' +
      '<rect x="-20" y="0" width="24" height="3" fill="#fff" opacity=".05"/>' +
      // salidas y extintores
      '<rect x="21.4" y="5" width="1.2" height="2" fill="#2bd47d"/><rect x="-22.6" y="5" width="1.2" height="2" fill="#2bd47d"/>' +
      '<g fill="#ff4d5e"><circle cx="21.3" cy="1.5" r=".6"/><circle cx="-21.3" cy="1.5" r=".6"/><circle cx="2" cy="-14.4" r=".6"/></g>' +
      // punto de encuentro
      '<circle cx="30" cy="12" r="2.6" fill="none" stroke="#2bd47d" stroke-width=".4"/><text x="30" y="12.6" font-size="1.6" text-anchor="middle" fill="#2bd47d" font-weight="700">PE</text>' +
      '<rect x="-9" y="14.6" width="2" height=".8" fill="#3ee6ff"/>' +
      (m.route ? '<polyline points="' + pts + '" fill="none" stroke="#2bd47d" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round" class="map-route"/><circle id="walker2d" r=".9" cx="10" cy="-3.5" fill="#ffc533" stroke="#111" stroke-width=".2"/>' : '') +
      '</svg>';
    var markers = m.points.map(function (p, i) {
      var left = (p.pos[0] + 24) / 60 * 100, top = (p.pos[2] + 17) / 34 * 100;
      return '<button type="button" class="hs-marker" data-id="' + p.id + '" style="left:' + left + '%;top:' + top + '%" aria-label="' + esc(p.title) + '">' + (i + 1) + '</button>';
    }).join('');
    return '<div class="map2d">' + svg + markers + '</div>';
  }
  function run2dEvac(dur) {
    return new Promise(function (resolve) {
      var w = document.getElementById('walker2d');
      var segs = [], total = 0;
      for (var i = 1; i < ROUTE.length; i++) {
        var a = ROUTE[i - 1], b = ROUTE[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push({ a: a, b: b, len: len }); total += len;
      }
      var t0 = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur), d = k * total;
        if (w) {
          for (var j = 0; j < segs.length; j++) {
            if (d <= segs[j].len || j === segs.length - 1) {
              var f = Math.min(1, d / segs[j].len);
              w.setAttribute('cx', segs[j].a[0] + (segs[j].b[0] - segs[j].a[0]) * f);
              w.setAttribute('cy', segs[j].a[1] + (segs[j].b[1] - segs[j].a[1]) * f);
              break;
            }
            d -= segs[j].len;
          }
        }
        if (k < 1) requestAnimationFrame(step); else resolve();
      })(t0);
    });
  }
  function epp2dSVG() {
    return '<svg class="epp2d" viewBox="0 0 200 320" role="img" aria-label="Maniquí con los elementos de protección seleccionados">' +
      '<g fill="#7d8aa3">' +
      '<circle cx="100" cy="48" r="24"/><rect x="92" y="70" width="16" height="10"/>' +
      '<rect x="68" y="80" width="64" height="96" rx="20"/>' +
      '<rect x="46" y="86" width="16" height="84" rx="8" transform="rotate(8 54 86)"/><rect x="138" y="86" width="16" height="84" rx="8" transform="rotate(-8 146 86)"/>' +
      '<rect x="74" y="170" width="22" height="110" rx="10"/><rect x="104" y="170" width="22" height="110" rx="10"/></g>' +
      '<g class="item" data-item="chaleco"><path d="M70 92q30-16 60 0v74q-30 10-60 0z" fill="#ff7a1a"/><path d="M70 130h60M70 146h60" stroke="#e6eef8" stroke-width="5"/></g>' +
      '<g class="item" data-item="casco"><path d="M74 44a26 26 0 0 1 52 0z" fill="#ffc533"/><rect x="68" y="42" width="64" height="6" rx="3" fill="#e0a800"/></g>' +
      '<g class="item" data-item="lentes"><rect x="80" y="46" width="40" height="11" rx="5" fill="#3ee6ff" opacity=".75" stroke="#1d2b44" stroke-width="2"/></g>' +
      '<g class="item" data-item="guantes" fill="#ff9f1c"><circle cx="44" cy="172" r="11"/><circle cx="156" cy="172" r="11"/></g>' +
      '<g class="item" data-item="zapatos" fill="#1c2230"><rect x="68" y="276" width="32" height="16" rx="6"/><rect x="100" y="276" width="32" height="16" rx="6"/><rect x="68" y="286" width="32" height="6" fill="#ffc533"/><rect x="100" y="286" width="32" height="6" fill="#ffc533"/></g>' +
      '</svg>';
  }
  function updateEpp2d() {
    var d = currentModule ? doneSet(currentModule) : [];
    $$('.epp2d .item').forEach(function (g) { g.classList.toggle('on', d.indexOf(g.getAttribute('data-item')) >= 0); });
  }
  function restoreEppButtons() {
    if (!currentModule || currentModule.id !== 'epp') return;
    var d = doneSet(currentModule);
    $$('.epp-opt').forEach(function (b) { if (d.indexOf(b.dataset.epp) >= 0) b.classList.add('ok'); });
  }

  /* ------------------------------------------------------------------ */
  /* Evaluación                                                           */
  /* ------------------------------------------------------------------ */
  var quiz = null;
  function showQuiz() {
    $('#view-quiz').hidden = false;
    var card = $('#quiz-card');
    if (!quizUnlocked()) {
      var pend = MODULES.filter(function (m) { return m.mode !== 'quiz' && modPct(m) < 1; });
      card.innerHTML = '<div class="locked-box"><p class="eyebrow">Evaluación final</p><h1 class="view-title">Aún no está disponible</h1>' +
        '<p class="muted">Completa primero estos módulos:</p><ul class="checklist">' + pend.map(function (m) {
          return '<li><a class="ck" href="#/modulo/' + m.id + '" style="text-decoration:none"><span class="n">' + m.num + '</span><span><b>' + esc(m.title) + '</b><small>' + Math.round(modPct(m) * 100) + '% completado</small></span></a></li>';
        }).join('') + '</ul><button type="button" class="btn btn-sm btn-ghost" id="demo-unlock">Desbloquear para demo</button><p class="tiny">Atajo sólo para visitantes del portafolio.</p></div>';
      $('#demo-unlock').addEventListener('click', function () { user().unlocked = true; save(); showQuiz(); });
      return;
    }
    quiz = { i: 0, answers: [], checked: false };
    renderIntro();
  }
  function renderIntro() {
    var u = user(), prev = u.quiz;
    $('#quiz-card').innerHTML = '<p class="eyebrow">Evaluación final</p><h1 class="view-title">Pon a prueba lo aprendido</h1>' +
      '<p class="muted">' + QUESTIONS.length + ' preguntas de alternativas. Necesitas ' + Math.round(PASS * 100) + '% (' + Math.ceil(PASS * QUESTIONS.length) + ' correctas) para aprobar y obtener tu certificado.</p>' +
      (prev ? '<p class="muted">Intentos previos: ' + prev.attempts + ' · Mejor puntaje: ' + Math.round(prev.best * 100) + '%</p>' : '') +
      '<div class="q-actions"><button type="button" class="btn btn-primary" id="q-start">Comenzar evaluación</button>' +
      (prev && prev.passed ? '<a class="btn btn-ghost" href="#/certificado">Ver certificado</a>' : '') + '</div>';
    $('#q-start').addEventListener('click', function () { quiz = { i: 0, answers: [], checked: false }; renderQuestion(); });
  }
  function renderQuestion() {
    var q = QUESTIONS[quiz.i], n = QUESTIONS.length;
    $('#quiz-card').innerHTML = '<div class="q-top"><span>Pregunta ' + (quiz.i + 1) + ' de ' + n + '</span><div class="bar"><span style="width:' + (quiz.i / n * 100) + '%"></span></div></div>' +
      '<form id="q-form"><fieldset><legend class="q-legend" id="q-legend" tabindex="-1">' + esc(q.q) + '</legend>' +
      q.o.map(function (o, i) { return '<label class="opt"><input type="radio" name="q" value="' + i + '"> <span>' + esc(o) + '</span></label>'; }).join('') +
      '</fieldset><p class="feedback" id="q-fb" role="status" aria-live="polite"></p>' +
      '<div class="q-actions"><span class="muted" style="font-size:.85rem">Correctas: ' + quiz.answers.filter(function (a, i) { return a === QUESTIONS[i].a; }).length + '</span>' +
      '<button type="submit" class="btn btn-primary" id="q-submit" disabled>Responder</button></div></form>';
    quiz.checked = false;
    var form = $('#q-form');
    form.addEventListener('change', function () { if (!quiz.checked) $('#q-submit').disabled = false; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!quiz.checked) {
        var sel = form.querySelector('input:checked'); if (!sel) return;
        var v = +sel.value;
        quiz.answers[quiz.i] = v; quiz.checked = true;
        $$('.opt', form).forEach(function (l, i) {
          l.querySelector('input').disabled = true;
          if (i === q.a) l.classList.add('correct'); else if (i === v) l.classList.add('wrong');
        });
        var fb = $('#q-fb');
        fb.className = 'feedback ' + (v === q.a ? 'ok' : 'bad');
        fb.textContent = (v === q.a ? '✓ Correcto. ' : '✗ Incorrecto. ') + q.why;
        var b = $('#q-submit'); b.textContent = quiz.i < QUESTIONS.length - 1 ? 'Siguiente →' : 'Ver resultado'; b.focus();
      } else {
        quiz.i++;
        if (quiz.i < QUESTIONS.length) { renderQuestion(); $('#q-legend').focus(); }
        else finishQuiz();
      }
    });
  }
  function certCode(u, date) {
    var s = (db.current || '') + '|' + u.name + '|' + date, h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    var c = (h >>> 0).toString(36).toUpperCase();
    while (c.length < 7) c = '0' + c;
    return 'MA-IND-' + new Date(date).getFullYear() + '-' + c.slice(0, 7);
  }
  function finishQuiz() {
    var u = user();
    var correct = quiz.answers.filter(function (a, i) { return a === QUESTIONS[i].a; }).length;
    var score = correct / QUESTIONS.length, passed = score >= PASS;
    var q = u.quiz || { best: 0, attempts: 0, passed: false };
    q.attempts++; q.last = score;
    if (score > q.best) q.best = score;
    if (passed && (!q.passed || score >= (q.score || 0))) {
      var now = Date.now();
      q.passed = true; q.score = score; q.correct = correct; q.date = now; q.code = certCode(u, now);
    }
    u.quiz = q; save();
    if (passed) toast('🎉 ¡Aprobaste la evaluación!');
    $('#quiz-card').innerHTML = '<p class="eyebrow">Resultado</p><h1 class="view-title">' + (passed ? '¡Felicitaciones, aprobaste!' : 'No alcanzaste el puntaje mínimo') + '</h1>' +
      '<p class="score-big ' + (passed ? 'pass' : 'fail') + '">' + Math.round(score * 100) + '%</p>' +
      '<p class="muted">' + correct + ' de ' + QUESTIONS.length + ' respuestas correctas · Mínimo para aprobar: ' + Math.round(PASS * 100) + '%</p>' +
      '<div class="q-actions" style="justify-content:flex-start">' + (passed ? '<a class="btn btn-primary" href="#/certificado" id="go-cert">Ver mi certificado</a>' : '') +
      '<button type="button" class="btn ' + (passed ? 'btn-ghost' : 'btn-primary') + '" id="q-retry">Reintentar</button>' +
      (!passed ? '<a class="btn btn-ghost" href="#/modulo/recorrido">Repasar módulos</a>' : '') + '</div>' +
      '<h2 style="font-size:1.05rem;margin-top:24px">Revisión</h2><ol class="review">' + QUESTIONS.map(function (qq, i) {
        var ok = quiz.answers[i] === qq.a;
        return '<li class="' + (ok ? '' : 'x') + '">' + (ok ? '✓ ' : '✗ ') + esc(qq.q) + '<small>Respuesta correcta: ' + esc(qq.o[qq.a]) + '</small></li>';
      }).join('') + '</ol>';
    $('#q-retry').addEventListener('click', function () { quiz = { i: 0, answers: [], checked: false }; renderQuestion(); });
    var t = $('#quiz-card .view-title'); t.setAttribute('tabindex', '-1'); t.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Certificado                                                          */
  /* ------------------------------------------------------------------ */
  function showCert() {
    $('#view-cert').hidden = false;
    var u = user(), q = u.quiz;
    var host = $('#cert-host');
    $('#print-cert').hidden = !(q && q.passed);
    if (!q || !q.passed) {
      host.innerHTML = '<div class="card locked-box"><h1 class="view-title">Certificado no disponible</h1><p class="muted">Aprueba la evaluación final para generar tu certificado.</p><a class="btn btn-primary" href="#/evaluacion">Ir a la evaluación</a></div>';
      return;
    }
    var date = new Date(q.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    host.innerHTML = '<article class="certificate" aria-label="Certificado de inducción">' +
      '<div class="cert-top"><div class="cert-brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 26 13 8l5 9 3-5 8 14z" fill="currentColor"/></svg>Minera Altiplano</div>' +
      '<div class="cert-code">Código de verificación<br><strong>' + esc(q.code) + '</strong></div></div>' +
      '<div class="cert-mid"><p class="k">Certificado de aprobación</p><h1 class="view-title" style="font:700 clamp(1.1rem,3.6vw,2.6rem)/1.1 var(--font-h);color:#111827;margin:0 0 .3em">Inducción General de Seguridad</h1>' +
      '<p>Se certifica que</p><p class="name">' + esc(u.name) + '</p><p>RUT/ID ' + esc(u.rut) + '</p>' +
      '<p>completó satisfactoriamente los 5 módulos de la inducción en 3D/VR (Bienvenida, Seguridad y EPP, Recorrido por la planta, Emergencias y evacuación y Evaluación final), obteniendo un puntaje de <strong>' + Math.round(q.score * 100) + '%</strong> (' + q.correct + '/' + QUESTIONS.length + ').</p></div>' +
      '<div class="cert-bottom"><div class="sig"><strong>Valentina Quispe M.</strong>Gerencia de Personas</div>' +
      '<div class="seal">INDUCCIÓN<br>APROBADA<br>' + new Date(q.date).getFullYear() + '</div>' +
      '<div class="sig"><strong>' + esc(date) + '</strong>Fecha de emisión · Planta Altiplano Norte</div></div>' +
      '</article>';
  }
  $('#print-cert').addEventListener('click', function () { window.print(); });

  /* ------------------------------------------------------------------ */
  /* Inicio                                                               */
  /* ------------------------------------------------------------------ */
  renderLanding();
  detectXR();
  window.addEventListener('hashchange', route);
  route();
  // exponer para pruebas
  window.__induccion = { db: function () { return db; }, threeFailed: function () { return threeFailed; } };
})();
