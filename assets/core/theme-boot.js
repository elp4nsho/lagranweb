// Sistema de estilos y disposiciones de La Gran Web. Script clásico: cárgalo SINCRÓNICO en <head>
// para aplicar el estilo antes del primer pintado.
//   <html data-app="tienda" data-default-theme="brutal">
//   <script src="../assets/core/theme-boot.js"></script>
// Para fijar un estilo sin guardarlo (capturas, enlaces): ?theme=<id> en la URL.
(function () {
  // ---------- Estilos: REGISTRO ÚNICO ----------
  // Lo usan el panel 🎨 (agrupado por categoría, con búsqueda), Alt + ← / →, la landing, kit.html,
  // la validación del valor guardado y tools/check-themes.mjs (que lee este arreglo).
  // Agregar un estilo = una entrada aquí + el archivo assets/core/themes/<id>.css (ver assets/core/THEMES.md).
  // Solo se descarga la hoja del estilo activo (css: false = sin hoja propia: sus tokens están en themes.css).
  //   id    → valor de html[data-theme] y nombre del archivo CSS
  //   name  → nombre visible · desc → una línea · group → id de THEME_GROUPS
  //   dark  → true si el fondo es oscuro (filtro claro/oscuro del panel)
  //   sw    → muestras [fondo, primario, acento] para las miniaturas
  //   fonts → familias de Google Fonts (parámetro family= de css2; '' = fuentes del sistema)
  //   anim  → animación de entrada (estilo animate.css) de [data-anim] y las .card del sitio público
  var THEME_GROUPS = [
    { id: 'modernos',  name: 'Modernos',               icon: '✦' },
    { id: 'html5',     name: 'Era HTML5 · animate.css', icon: '⟲' },
    { id: 'formales',  name: 'Formales',               icon: '⚖️' },
    { id: 'terror',    name: 'Terror',                 icon: '🦇' },
    { id: 'fiestas',   name: 'Fiestas y fechas',       icon: '🎉' },
    { id: 'locos',     name: 'Locos',                  icon: '🌀' },
    { id: 'tematicos', name: 'Temáticos',              icon: '🧭' }
  ];
  var THEMES = [
    { id: 'aurora',    name: 'Aurora',    group: 'modernos', dark: false, css: false, desc: 'SaaS limpio y luminoso',  sw: ['#f6f7fb', '#4f46e5', '#0ea5e9'], fonts: 'Inter:wght@400;500;600;700' },
    { id: 'noir',      name: 'Noir Neón', group: 'modernos', dark: true,  desc: 'Oscuro cyber con brillo', sw: ['#05060a', '#00e5ff', '#ff2bd6'], fonts: 'Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600' },
    { id: 'brutal',    name: 'Brutal',    group: 'modernos', dark: false, desc: 'Neo-brutalismo crudo',     sw: ['#fff4d6', '#111111', '#ff5c8a'], fonts: 'Archivo+Black&family=Archivo:wght@400;600;800' },
    { id: 'glass',     name: 'Cristal',   group: 'modernos', dark: true,  desc: 'Glassmorphism y degradé',  sw: ['#7b5cff', '#ffffff', '#ff8ad8'], fonts: 'Outfit:wght@300;400;600;700' },
    { id: 'neumorph',  name: 'Relieve',   group: 'modernos', dark: false, desc: 'Neumorfismo suave',        sw: ['#e4e9f0', '#5b7cfa', '#a3b1c6'], fonts: 'Nunito:wght@400;600;800' },
    { id: 'editorial', name: 'Editorial', group: 'modernos', dark: false, desc: 'Revista impresa clásica',  sw: ['#f4efe6', '#1a1a1a', '#c8102e'], fonts: 'Playfair+Display:ital,wght@0,500;0,800;1,500&family=Source+Serif+4:wght@400;600' },
    { id: 'terminal',  name: 'Terminal',  group: 'modernos', dark: true,  desc: 'Fósforo verde de consola', sw: ['#020a03', '#33ff66', '#ffb000'], fonts: 'VT323&family=IBM+Plex+Mono:wght@400;600' },
    { id: 'synthwave', name: 'Synthwave', group: 'modernos', dark: true,  desc: 'Atardecer retro 80s',      sw: ['#1a0533', '#ff3cac', '#ffd319'], fonts: 'Orbitron:wght@500;800&family=Rajdhani:wght@400;600' },
    { id: 'luxury',    name: 'Lujo',      group: 'modernos', dark: true,  desc: 'Negro y oro, serif fina',  sw: ['#0c0b09', '#c9a35b', '#f2e7d0'], fonts: 'Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;600' },
    { id: 'candy',     name: 'Caramelo',  group: 'modernos', dark: false, desc: 'Pastel juguetón',          sw: ['#fff6fb', '#ff7eb6', '#7ad7f0'], fonts: 'Fredoka:wght@400;500;600;700' },
    { id: 'bauhaus',   name: 'Bauhaus',   group: 'modernos', dark: false, desc: 'Geometría y primarios',    sw: ['#f2ede3', '#e63322', '#1e4db7'], fonts: 'Josefin+Sans:wght@400;600;700' },
    { id: 'nordic',    name: 'Nórdico',   group: 'modernos', dark: false, desc: 'Minimal blanco y aire',    sw: ['#ffffff', '#111111', '#9aa0a6'], fonts: 'Manrope:wght@300;400;600;800' },
    { id: 'forest',    name: 'Bosque',    group: 'modernos', dark: false, desc: 'Orgánico verde y tierra',  sw: ['#eef0e4', '#2f5d3a', '#c9803b'], fonts: 'DM+Serif+Display&family=DM+Sans:wght@400;500;700' },
    { id: 'pixel',     name: 'Pixel',     group: 'modernos', dark: true,  desc: 'Videojuego 8 bits',        sw: ['#1d1b3a', '#ffcd00', '#00d26a'], fonts: 'Press+Start+2P&family=Silkscreen' },
    { id: 'memphis',   name: 'Memphis',   group: 'modernos', dark: false, desc: 'Pop 90s con formas',       sw: ['#fffdf5', '#ff6b35', '#00a6a6'], fonts: 'Poppins:wght@400;600;800' },
    { id: 'blueprint', name: 'Plano',     group: 'modernos', dark: true,  desc: 'Plano técnico azul',       sw: ['#0b3d91', '#ffffff', '#7fd1ff'], fonts: 'Share+Tech+Mono&family=Barlow+Condensed:wght@500;700' },
    { id: 'sketch',    name: 'Boceto',    group: 'modernos', dark: false, desc: 'Dibujado a mano en papel', sw: ['#fdfbf3', '#2b2b2b', '#ff6f59'], fonts: 'Caveat:wght@500;700&family=Patrick+Hand' },
    { id: 'graphite',  name: 'Grafito',   group: 'modernos', dark: true,  desc: 'Dashboard pro oscuro',     sw: ['#0f1218', '#3b82f6', '#22c55e'], fonts: 'IBM+Plex+Sans:wght@400;500;600;700' },
    { id: 'chrome',    name: 'Cromo Y2K', group: 'modernos', dark: false, desc: 'Metal líquido 2000',       sw: ['#d9dde3', '#7a5cff', '#00e0c7'], fonts: 'Syne:wght@500;700;800' },
    { id: 'contrast',  name: 'Contraste', group: 'modernos', dark: true,  desc: 'Alto contraste accesible', sw: ['#000000', '#ffff00', '#ffffff'], fonts: 'Atkinson+Hyperlegible:wght@400;700' },
    // Era HTML5 (2010–2014): animaciones de entrada al estilo WOW.js / animate.css.
    { id: 'web2',      name: 'Web 2.0',      group: 'html5', dark: false, anim: 'bounceIn',    desc: 'Brillo, reflejos y "beta"', sw: ['#eef6ff', '#2b8de0', '#ff7a00'], fonts: 'Ubuntu:wght@400;700' },
    { id: 'skeuo',     name: 'iOS 6',        group: 'html5', dark: false, anim: 'fadeInUp',    desc: 'Lino, cuero y relieve',     sw: ['#cfd4dc', '#3d6bb3', '#6b4a2e'], fonts: 'Lato:wght@400;700' },
    { id: 'metro',     name: 'Metro',        group: 'html5', dark: true,  anim: 'turnIn',      desc: 'Windows 8, mosaicos planos', sw: ['#1d1d1d', '#00a300', '#2d89ef'], fonts: 'Open+Sans:wght@300;400;600' },
    { id: 'bootstrap2',name: 'Bootstrap 2',  group: 'html5', dark: false, anim: 'fadeIn',      desc: 'Barra negra y degradés',    sw: ['#ffffff', '#0074cc', '#222222'], fonts: 'Arimo:wght@400;700' },
    { id: 'flatui',    name: 'Flat UI',      group: 'html5', dark: false, anim: 'zoomIn',      desc: 'Plano 2013 turquesa',       sw: ['#ecf0f1', '#1abc9c', '#34495e'], fonts: 'Lato:wght@300;400;700;900' },
    { id: 'parallax',  name: 'Parallax',     group: 'html5', dark: true,  anim: 'fadeInUp',    desc: 'One-page con fondos fijos', sw: ['#1b1f24', '#ffffff', '#e74c3c'], fonts: 'Raleway:wght@200;400;700' },
    { id: 'aqua',      name: 'Aqua',         group: 'html5', dark: false, anim: 'flipInX',     desc: 'Mac OS X gel y rayas',      sw: ['#e8e8e8', '#3a8ee6', '#9ac5f5'], fonts: 'Lucida+Sans:wght@400' },
    { id: 'nativo',    name: 'HTML nativo',  group: 'html5', dark: false, anim: 'none',        desc: 'Controles del navegador',   sw: ['#ffffff', '#0000ee', '#551a8b'], fonts: '' },
    { id: 'vintage',   name: 'Vintage',      group: 'html5', dark: false, anim: 'slideInLeft', desc: 'Hipster 2012, cintas',      sw: ['#f3e9d2', '#c0392b', '#2c3e50'], fonts: 'Lobster&family=Arvo:wght@400;700' },
    { id: 'material',  name: 'Material 14',  group: 'html5', dark: false, anim: 'fadeInUp',    desc: 'Papel, sombras y FAB',      sw: ['#fafafa', '#3f51b5', '#ff4081'], fonts: 'Roboto:wght@300;400;500;700' },
    // Formales
    { id: 'bufete',        name: 'Bufete',          group: 'formales', dark: false, desc: 'Estudio jurídico, marino y oro viejo', sw: ['#f4f1e9', '#1f2f56', '#7d5f1a'], fonts: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Libre+Franklin:wght@400;500;600;700' },
    { id: 'banca',         name: 'Banca privada',   group: 'formales', dark: false, desc: 'Verde botella, latón y cifras',        sw: ['#f2f4f3', '#0b3b2e', '#b08d57'], fonts: 'Spectral:wght@500;600;700&family=Figtree:wght@400;500;600;700' },
    { id: 'institucional', name: 'Institucional',   group: 'formales', dark: false, desc: 'Servicio público, foco amarillo',      sw: ['#ffffff', '#0b0c0c', '#00703c'], fonts: 'Noto+Sans:wght@400;600;700' },
    { id: 'academico',     name: 'Académico',       group: 'formales', dark: false, desc: 'Paper, versalitas y booktabs',          sw: ['#fffff8', '#8c1515', '#2b5a7a'], fonts: 'STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400&family=Courier+Prime' },
    // Terror
    { id: 'halloween',     name: 'Halloween',       group: 'terror', dark: true,  anim: 'fadeInUp', desc: 'Calabazas, telarañas y murciélagos', sw: ['#140b1f', '#ff7a1a', '#9be564'], fonts: 'Creepster&family=Lexend:wght@400;500;600;700' },
    { id: 'dracula',       name: 'Drácula',         group: 'terror', dark: true,  desc: 'Gótico carmesí, arcos y velas',      sw: ['#0c0607', '#e8394b', '#d9c7a3'], fonts: 'Pirata+One&family=EB+Garamond:ital,wght@0,400;0,600;1,400' },
    { id: 'slasher',       name: 'Slasher VHS',     group: 'terror', dark: true,  desc: 'Cinta gastada, sangre y REC',        sw: ['#070707', '#ff3030', '#3cf2ff'], fonts: 'Anton&family=Roboto+Condensed:wght@400;500;700&family=Courier+Prime:wght@400;700' },
    { id: 'lovecraft',     name: 'Cósmico',         group: 'terror', dark: true,  desc: 'Abismo lovecraftiano que te mira',   sw: ['#031110', '#5fe0b0', '#b48cff'], fonts: 'IM+Fell+English:ital@0;1&family=Crimson+Text:ital,wght@0,400;0,600;1,400' },
    { id: 'embrujada',     name: 'Casa embrujada',  group: 'terror', dark: false, desc: 'Papel tapiz, niebla y un fantasma',  sw: ['#e7e0d2', '#5b3a6b', '#3e5d59'], fonts: 'Henny+Penny&family=Lora:ital,wght@0,400;0,600;1,400;1,600' },
    // Fiestas y fechas
    { id: 'navidad',       name: 'Navidad',         group: 'fiestas', dark: false, desc: 'Rojo, pino, nieve y bastones',     sw: ['#fbf6ee', '#b3122e', '#0f6b3a'], fonts: 'Mountains+of+Christmas:wght@400;700&family=Nunito:wght@400;600;700' },
    { id: 'anonuevo',      name: 'Año Nuevo',       group: 'fiestas', dark: true,  anim: 'zoomIn', desc: 'Medianoche, champaña y confeti', sw: ['#070b24', '#f5c542', '#ff5aa8'], fonts: 'Big+Shoulders+Display:wght@600;800&family=Plus+Jakarta+Sans:wght@400;500;700' },
    { id: 'dieciocho',     name: 'Fiestas Patrias', group: 'fiestas', dark: false, desc: 'Dieciocho chileno con banderines',  sw: ['#fbf7ef', '#0039a6', '#c8261b'], fonts: 'Alfa+Slab+One&family=Nunito+Sans:wght@400;600;700;800' },
    { id: 'sanvalentin',   name: 'San Valentín',    group: 'fiestas', dark: false, desc: 'Rosa, frambuesa y corazones',       sw: ['#fff1f4', '#c2185b', '#6a1b9a'], fonts: 'Dancing+Script:wght@600;700&family=Quicksand:wght@400;500;600;700' },
    { id: 'pascua',        name: 'Pascua',          group: 'fiestas', dark: false, anim: 'bounceIn', desc: 'Huevos pintados lila y menta',  sw: ['#fbf8ff', '#6b3fd1', '#ffd84d'], fonts: 'Baloo+2:wght@500;600;700;800' },
    { id: 'muertos',       name: 'Día de Muertos',  group: 'fiestas', dark: true,  desc: 'Cempasúchil y papel picado',       sw: ['#170a26', '#ff9f1c', '#ff4fa3'], fonts: 'Lilita+One&family=Mulish:wght@400;600;700' },
    { id: 'carnaval',      name: 'Carnaval',        group: 'fiestas', dark: true,  anim: 'rubberBand', desc: 'Arlequín, serpentinas y oro', sw: ['#2a0a45', '#ffc93c', '#18e0d0'], fonts: 'Luckiest+Guy&family=Rubik:wght@400;500;700' },
    { id: 'chino',         name: 'Año Nuevo Chino', group: 'fiestas', dark: true,  desc: 'Laca roja, oro y faroles',          sw: ['#6d0a12', '#ffd166', '#46d39a'], fonts: 'Noto+Serif+TC:wght@600;900&family=Mukta:wght@400;500;700' },
    // Locos
    { id: 'vaporwave',     name: 'Vaporwave',       group: 'locos', dark: false, desc: 'Sol a rayas y ventanas 90s',         sw: ['#f6d6f0', '#a8128a', '#00c2c7'], fonts: 'Righteous&family=Work+Sans:wght@400;500;600' },
    { id: 'glitch',        name: 'Glitch',          group: 'locos', dark: true,  anim: 'lightSpeedIn', desc: 'Señal rota y separación RGB', sw: ['#050505', '#00ff9c', '#ff2a6d'], fonts: 'Rubik+Glitch&family=Rubik:wght@400;500;800&family=Red+Hat+Mono:wght@400;600' },
    { id: 'comic',         name: 'Cómic',           group: 'locos', dark: false, anim: 'bounceIn', desc: 'Pop-art, tinta y globos',       sw: ['#fff6cf', '#d4001a', '#ffe100'], fonts: 'Bangers&family=Comic+Neue:wght@400;700' },
    { id: 'psicodelico',   name: 'Psicodélico 70s', group: 'locos', dark: false, desc: 'Ondas groovy y sombras apiladas',    sw: ['#fff1d6', '#b53a0b', '#7b2d8e'], fonts: 'Shrikhand&family=Kumbh+Sans:wght@400;600;700' },
    { id: 'geocities',     name: 'GeoCities 98',    group: 'locos', dark: true,  anim: 'flipInX', desc: 'Estrellas, biseles y arcoíris',  sw: ['#000018', '#00ffff', '#ff66ff'], fonts: 'Bungee&family=Bungee+Shade&family=Tinos:ital,wght@0,400;0,700;1,400' },
    { id: 'riso',          name: 'Risografía',      group: 'locos', dark: false, desc: 'Rosa flúor, azul y desregistro',     sw: ['#f6f1e6', '#d1166f', '#0063ab'], fonts: 'Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800' },
    // Temáticos
    { id: 'espacial',      name: 'Espacial',        group: 'tematicos', dark: true,  desc: 'Estrellas, nebulosa y HUD',      sw: ['#04030d', '#7cf3ff', '#ffb347'], fonts: 'Audiowide&family=Exo+2:wght@400;500;700' },
    { id: 'submarino',     name: 'Submarino',       group: 'tematicos', dark: true,  desc: 'Profundidad, burbujas y bronce', sw: ['#021a2b', '#3fe0d0', '#ffb84d'], fonts: 'Comfortaa:wght@500;700&family=Sora:wght@400;600' },
    { id: 'western',       name: 'Lejano Oeste',    group: 'tematicos', dark: false, desc: 'Cartel de "Se busca" y madera',  sw: ['#e9d6b0', '#8b2e16', '#2f4a5c'], fonts: 'Rye&family=Bitter:wght@400;600;700' },
    { id: 'steampunk',     name: 'Steampunk',       group: 'tematicos', dark: true,  desc: 'Latón, remaches y engranajes',   sw: ['#1e140c', '#d9a24f', '#4fb3a9'], fonts: 'Cinzel:wght@600;800&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400' },
    { id: 'medieval',      name: 'Medieval',        group: 'tematicos', dark: false, desc: 'Pergamino y letra uncial',       sw: ['#ecdcb9', '#8e1b1b', '#1f3f7a'], fonts: 'Uncial+Antiqua&family=Alegreya:ital,wght@0,400;0,700;1,400' },
    { id: 'zen',           name: 'Zen japonés',     group: 'tematicos', dark: false, desc: 'Washi, sumi y sello bermellón',  sw: ['#f4f1ea', '#1f1d1a', '#b02a30'], fonts: 'Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700' },
    { id: 'estadio',       name: 'Estadio',         group: 'tematicos', dark: true,  anim: 'slideInLeft', desc: 'Cancha de noche y marcador LED', sw: ['#0b3d1e', '#ffd400', '#ff5a3c'], fonts: 'Bebas+Neue&family=Barlow:wght@400;500;700' }
  ];
  var root = document.documentElement;
  var app = root.getAttribute('data-app') || 'global';
  var key = 'lgw:theme:' + app;
  // html[data-lock]: estilo y disposición FIJOS (builds de producción de un cliente): se ignoran el valor
  // guardado y ?theme=, y nada se guarda. Los builds además traen el registro recortado a un solo estilo.
  var locked = root.hasAttribute('data-lock');
  function read() { if (locked) return null; try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(id) { if (locked) return; try { localStorage.setItem(key, id); } catch (e) {} }
  function find(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return null; }
  function urlTheme() { if (locked) return null; try { return new URLSearchParams(location.search).get('theme'); } catch (e) { return null; } }

  // Hojas base (misma carpeta que este script): themes.css = tokens + kit de componentes;
  // layouts.css = reglas compartidas de las disposiciones.
  var base = (document.currentScript && document.currentScript.src || '').replace(/theme-boot\.js.*$/, '');
  if (base && !document.querySelector('link[data-lgw-themes]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + 'themes.css'; l.setAttribute('data-lgw-themes', ''); l.setAttribute('blocking', 'render');
    document.head.appendChild(l);
    var lay = document.createElement('link');
    lay.rel = 'stylesheet'; lay.href = base + 'layouts.css'; lay.setAttribute('data-lgw-layouts', '');
    document.head.appendChild(lay);
  }

  function loadFonts(t) {
    var id = 'lgw-font-' + t.id;
    if (!t.fonts || document.getElementById(id)) return;
    var f = document.createElement('link');
    f.id = id; f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=' + t.fonts + '&display=swap';
    document.head.appendChild(f);
  }

  // Hoja de cada estilo (assets/core/themes/<id>.css): se inserta justo después de themes.css, antes
  // de layouts.css y del CSS de la app (mismo orden de cascada que cuando todo vivía en themes.css).
  // Una vez cargada se queda (sus reglas solo aplican con html[data-theme="<id>"]).
  // cb(): se llama cuando la hoja está lista (de inmediato si ya lo estaba o si el estilo no tiene hoja).
  function loadThemeCss(t, cb) {
    if (!base || t.css === false) return cb && cb();
    var k = document.querySelector('link[data-lgw-theme="' + t.id + '"]');
    if (k) { if (k.__ready) cb && cb(); else (k.__wait || (k.__wait = [])).push(cb); return; }
    k = document.createElement('link');
    k.rel = 'stylesheet'; k.href = base + 'themes/' + t.id + '.css'; k.setAttribute('data-lgw-theme', t.id);
    if (document.readyState === 'loading') k.setAttribute('blocking', 'render');
    k.__wait = cb ? [cb] : [];
    k.onload = k.onerror = function () { k.__ready = 1; var w = k.__wait; k.__wait = []; w.forEach(function (f) { f && f(); }); };
    var anchor = document.querySelector('link[data-lgw-themes]'), after = anchor;
    while (after && after.nextElementSibling && after.nextElementSibling.hasAttribute('data-lgw-theme')) after = after.nextElementSibling;
    if (after && after.parentNode) after.parentNode.insertBefore(k, after.nextSibling); else document.head.appendChild(k);
  }

  var pending = null, readyCbs = [];
  function flushReady() { var w = readyCbs; readyCbs = []; w.forEach(function (f) { try { f(find(root.getAttribute('data-theme'))); } catch (e) {} }); }
  // Al arrancar se aplica de inmediato (la hoja bloquea el pintado). Al cambiar en caliente se espera
  // a que la hoja nueva cargue para no mostrar un instante el estilo a medias.
  function apply(id, persist, boot) {
    var t = find(id) || find(root.getAttribute('data-default-theme')) || THEMES[0];
    loadFonts(t);
    if (persist) save(t.id);
    pending = t.id;
    var done = function () {
      if (pending !== t.id) return;
      pending = null;
      root.setAttribute('data-theme', t.id);
      try { window.dispatchEvent(new CustomEvent('lgw:theme', { detail: t })); } catch (e) {}
      flushReady();
    };
    if (boot) { root.setAttribute('data-theme', t.id); loadThemeCss(t, function () { if (!pending || pending === t.id) { pending = null; flushReady(); } }); }
    else loadThemeCss(t, done);
    return t;
  }

  // Animaciones de entrada al hacer scroll (WOW.js / animate.css) para los estilos HTML5.
  // Se animan [data-anim], .reveal y las .card del sitio público (no las del panel admin).
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, t = find(root.getAttribute('data-theme')) || {};
      var name = el.getAttribute('data-anim') || t.anim || 'fadeInUp';
      if (name && name !== 'none' && t.anim && t.anim !== 'none') {
        el.style.animationDelay = (el.getAttribute('data-anim-delay') || 0) + 'ms';
        el.classList.add('lgw-animated', 'lgw-' + name);
      }
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { threshold: .12 }) : null;
  var SEL = '[data-anim], .reveal, .card';
  function watch(node) {
    if (!io || node.nodeType !== 1) return;
    var list = node.matches && node.matches(SEL) ? [node] : [];
    list.push.apply(list, node.querySelectorAll ? node.querySelectorAll(SEL) : []);
    list.forEach(function (el) {
      if (el.__lgw || el.closest('.admin-shell, .modal-backdrop, .toasts')) return;
      el.__lgw = 1;
      io.observe(el);
    });
  }
  function startWatch() {
    watch(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(watch); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startWatch); else startWatch();

  // ---------- Disposiciones: reorganizan la página completa (independiente del estilo) ----------
  // REGISTRO ÚNICO. Lo usan el panel 🎨, el atajo Alt + ↑ / ↓ y la validación del valor guardado.
  // Agregar una disposición = una entrada aquí + el archivo assets/core/layouts/<id>.css
  // (css: false si no necesita hoja, como la clásica). Solo se descarga la hoja de la disposición activa.
  //   id     → valor de html[data-layout] y nombre del archivo CSS
  //   name   → nombre visible · icon → emoji corto · desc → una línea (público + panel)
  //   thumb  → miniatura SVG (viewBox 0 0 80 46, fill=currentColor; usa opacity para los planos)
  var LAYOUTS = [
    { id: 'clasica', name: 'Clásica', icon: '▤', css: false,
      desc: 'Barra superior y secciones apiladas · panel con menú lateral',
      thumb: '<rect x="4" y="4" width="72" height="6" rx="2"/><rect x="14" y="14" width="52" height="12" rx="2" opacity=".6"/><rect x="4" y="30" width="22" height="12" rx="2" opacity=".4"/><rect x="29" y="30" width="22" height="12" rx="2" opacity=".4"/><rect x="54" y="30" width="22" height="12" rx="2" opacity=".4"/>' },
    { id: 'revista', name: 'Revista', icon: '📰',
      desc: 'Cabecera centrada tipo diario y columnas asimétricas · panel con menú superior',
      thumb: '<rect x="26" y="3" width="28" height="5" rx="1"/><rect x="4" y="11" width="72" height="1.5"/><rect x="4" y="16" width="38" height="14" rx="2" opacity=".6"/><rect x="45" y="16" width="31" height="14" rx="2" opacity=".35"/><rect x="4" y="33" width="46" height="10" rx="2" opacity=".4"/><rect x="53" y="33" width="23" height="10" rx="2" opacity=".4"/>' },
    { id: 'app', name: 'App', icon: '📱',
      desc: 'Navegación lateral fija y mosaicos bento · panel con riel de íconos',
      thumb: '<rect x="4" y="4" width="16" height="38" rx="2"/><rect x="24" y="4" width="52" height="11" rx="2" opacity=".6"/><rect x="24" y="18" width="33" height="11" rx="2" opacity=".4"/><rect x="60" y="18" width="16" height="11" rx="2" opacity=".4"/><rect x="24" y="32" width="16" height="10" rx="2" opacity=".4"/><rect x="43" y="32" width="33" height="10" rx="2" opacity=".4"/>' },
    { id: 'portal', name: 'Portal', icon: '🗞️',
      desc: 'Portal de noticias: franja de secciones a color y portada densa en columnas · panel con mega-barra',
      thumb: '<rect x="4" y="3" width="20" height="5" rx="1"/><rect x="58" y="3" width="18" height="5" rx="1" opacity=".4"/><rect x="4" y="10" width="72" height="4"/><rect x="4" y="17" width="46" height="13" rx="1" opacity=".6"/><rect x="53" y="17" width="23" height="13" rx="1" opacity=".4"/><rect x="4" y="33" width="23" height="10" rx="1" opacity=".4"/><rect x="30" y="33" width="46" height="10" rx="1" opacity=".5"/>' },
    { id: 'inmersiva', name: 'Inmersiva', icon: '🌌',
      desc: 'Pantallas completas con imán al desplazar y menú flotante en píldora · panel con dock inferior',
      thumb: '<rect x="4" y="2" width="72" height="42" rx="2" opacity=".3"/><rect x="24" y="5" width="32" height="5" rx="2.5"/><rect x="14" y="17" width="52" height="7" rx="1" opacity=".8"/><rect x="26" y="27" width="28" height="3" rx="1" opacity=".6"/><rect x="28" y="37" width="24" height="5" rx="2.5"/>' },
    { id: 'dividida', name: 'Dividida', icon: '◧',
      desc: 'Mitad izquierda fija con marca y menú, contenido que corre a la derecha · panel con menú a la derecha',
      thumb: '<rect x="4" y="4" width="30" height="38" rx="2" opacity=".8"/><rect x="38" y="4" width="38" height="12" rx="2" opacity=".5"/><rect x="38" y="19" width="38" height="10" rx="2" opacity=".35"/><rect x="38" y="32" width="38" height="10" rx="2" opacity=".35"/>' },
    { id: 'tablero', name: 'Tablero', icon: '▦',
      desc: 'Barra de herramientas compacta y todo en tarjetas tipo tablero · panel con cinta de mosaicos',
      thumb: '<rect x="4" y="3" width="72" height="5" rx="1"/><rect x="4" y="11" width="35" height="18" rx="2" opacity=".6"/><rect x="42" y="11" width="16" height="8" rx="2" opacity=".4"/><rect x="61" y="11" width="15" height="18" rx="2" opacity=".4"/><rect x="42" y="21" width="16" height="8" rx="2" opacity=".4"/><rect x="4" y="32" width="16" height="11" rx="2" opacity=".4"/><rect x="23" y="32" width="53" height="11" rx="2" opacity=".5"/>' },
    { id: 'documento', name: 'Documento', icon: '📄',
      desc: 'Una sola columna angosta, como un documento, con el menú como índice · panel con índice arriba',
      thumb: '<rect x="24" y="3" width="32" height="4" rx="1"/><rect x="24" y="10" width="32" height="9" rx="1" opacity=".35"/><rect x="24" y="22" width="32" height="2" rx="1" opacity=".6"/><rect x="24" y="26" width="28" height="2" rx="1" opacity=".5"/><rect x="24" y="30" width="32" height="2" rx="1" opacity=".5"/><rect x="24" y="34" width="22" height="2" rx="1" opacity=".5"/><rect x="24" y="38" width="30" height="2" rx="1" opacity=".5"/>' },
    { id: 'carrusel', name: 'Carrusel', icon: '🎠',
      desc: 'Filas de tarjetas que se deslizan de lado y portada como diapositiva · panel en columnas deslizables',
      thumb: '<rect x="4" y="3" width="72" height="4" rx="1"/><rect x="4" y="10" width="72" height="13" rx="2" opacity=".6"/><rect x="4" y="27" width="20" height="15" rx="2" opacity=".45"/><rect x="27" y="27" width="20" height="15" rx="2" opacity=".45"/><rect x="50" y="27" width="20" height="15" rx="2" opacity=".45"/><rect x="73" y="27" width="7" height="15" rx="2" opacity=".2"/>' },
    { id: 'terminal', name: 'Terminal', icon: '⌨️',
      desc: 'Compacta: letra monoespaciada, sub-barra de comandos fija y listas densas · panel con árbol angosto',
      thumb: '<rect x="4" y="3" width="72" height="4" rx="1"/><rect x="4" y="9" width="40" height="2" rx="1" opacity=".7"/><rect x="4" y="15" width="6" height="3" rx="1"/><rect x="12" y="15" width="34" height="3" rx="1" opacity=".6"/><rect x="4" y="21" width="72" height="1" opacity=".4"/><rect x="4" y="25" width="34" height="2" rx="1" opacity=".5"/><rect x="42" y="25" width="34" height="2" rx="1" opacity=".5"/><rect x="4" y="30" width="34" height="2" rx="1" opacity=".5"/><rect x="42" y="30" width="34" height="2" rx="1" opacity=".5"/><rect x="4" y="35" width="34" height="2" rx="1" opacity=".5"/><rect x="42" y="35" width="34" height="2" rx="1" opacity=".5"/><rect x="4" y="40" width="34" height="2" rx="1" opacity=".5"/>' },
    { id: 'kiosco', name: 'Kiosco', icon: '👆',
      desc: 'Pantalla táctil: menú en mosaicos enormes y todo más grande · panel como lanzador de apps',
      thumb: '<rect x="28" y="3" width="24" height="5" rx="1"/><rect x="4" y="11" width="22" height="13" rx="3" opacity=".6"/><rect x="29" y="11" width="22" height="13" rx="3" opacity=".6"/><rect x="54" y="11" width="22" height="13" rx="3" opacity=".6"/><rect x="4" y="27" width="22" height="13" rx="3" opacity=".4"/><rect x="29" y="27" width="22" height="13" rx="3" opacity=".4"/><rect x="54" y="27" width="22" height="13" rx="3" opacity=".4"/>' },
    { id: 'riel', name: 'Riel derecho', icon: '⫽',
      desc: 'Navegación en un riel angosto a la derecha con el menú en vertical · panel con riel de íconos a la derecha',
      thumb: '<rect x="66" y="3" width="10" height="40" rx="2"/><rect x="4" y="4" width="58" height="15" rx="2" opacity=".6"/><rect x="4" y="22" width="28" height="10" rx="2" opacity=".4"/><rect x="34" y="22" width="28" height="10" rx="2" opacity=".4"/><rect x="4" y="35" width="58" height="8" rx="2" opacity=".35"/>' },
    { id: 'pestanas', name: 'Pestañas', icon: '🗂️',
      desc: 'Menú en pestañas de carpeta sobre una hoja enmarcada con el contenido · panel con pestañas',
      thumb: '<rect x="4" y="3" width="22" height="4" rx="1"/><rect x="6" y="10" width="14" height="6" rx="1.5"/><rect x="21" y="11" width="14" height="5" rx="1.5" opacity=".45"/><rect x="36" y="11" width="14" height="5" rx="1.5" opacity=".45"/><rect x="4" y="16" width="72" height="27" rx="2" opacity=".3"/><rect x="9" y="21" width="34" height="8" rx="1" opacity=".6"/><rect x="9" y="32" width="62" height="7" rx="1" opacity=".45"/>' },
    { id: 'acordeon', name: 'Acordeón', icon: '☰',
      desc: 'Secciones apiladas como paneles de acordeón con su barra de título · panel con grupos plegables arriba',
      thumb: '<rect x="4" y="3" width="72" height="5" rx="1"/><rect x="8" y="11" width="64" height="4" rx="1"/><rect x="8" y="15" width="64" height="10" rx="1" opacity=".3"/><rect x="8" y="28" width="64" height="4" rx="1" opacity=".7"/><rect x="8" y="35" width="64" height="4" rx="1" opacity=".5"/><rect x="8" y="42" width="64" height="3" rx="1" opacity=".4"/>' },
    { id: 'linea', name: 'Línea de tiempo', icon: '⏳',
      desc: 'Recorrido con columna central y secciones alternadas a cada lado; menú como línea de metro · panel con línea de pasos',
      thumb: '<rect x="4" y="3" width="72" height="4" rx="1" opacity=".6"/><rect x="39" y="10" width="2" height="34" opacity=".7"/><circle cx="40" cy="15" r="2.5"/><circle cx="40" cy="27" r="2.5"/><circle cx="40" cy="39" r="2.5"/><rect x="8" y="11" width="27" height="9" rx="2" opacity=".5"/><rect x="45" y="23" width="27" height="9" rx="2" opacity=".5"/><rect x="8" y="35" width="27" height="8" rx="2" opacity=".5"/>' },
    { id: 'diapositivas', name: 'Diapositivas', icon: '🖼️',
      desc: 'Cada sección es una diapositiva 16:9 numerada sobre un escenario · panel con clasificador de diapositivas',
      thumb: '<rect x="0" y="0" width="80" height="46" rx="2" opacity=".18"/><rect x="4" y="3" width="72" height="4" rx="1"/><rect x="14" y="10" width="52" height="15" rx="1.5" opacity=".75"/><rect x="14" y="28" width="52" height="15" rx="1.5" opacity=".45"/><rect x="59" y="21" width="5" height="2" rx=".5" opacity=".5"/>' },
    { id: 'ventana', name: 'Ventana', icon: '🪟',
      desc: 'Toda la web dentro de una ventana flotante centrada sobre un escritorio · panel como aplicación en ventana',
      thumb: '<rect x="0" y="0" width="80" height="46" rx="2" opacity=".2"/><rect x="10" y="4" width="60" height="38" rx="3" opacity=".45"/><rect x="10" y="4" width="60" height="5" rx="2"/><rect x="15" y="13" width="50" height="10" rx="1" opacity=".7"/><rect x="15" y="26" width="24" height="12" rx="1" opacity=".6"/><rect x="41" y="26" width="24" height="12" rx="1" opacity=".6"/>' },
    { id: 'barra', name: 'Barra inferior', icon: '⬓',
      desc: 'Toda la navegación en una barra fija abajo, también en escritorio · panel con barra de tareas abajo',
      thumb: '<rect x="4" y="3" width="72" height="16" rx="2" opacity=".6"/><rect x="4" y="22" width="35" height="12" rx="2" opacity=".4"/><rect x="41" y="22" width="35" height="12" rx="2" opacity=".4"/><rect x="2" y="38" width="76" height="7" rx="1.5"/>' },
    { id: 'escaparate', name: 'Escaparate', icon: '🛍️',
      desc: 'La imagen primero: portada enorme a todo el ancho con el texto montado y piezas grandes · panel con portada de color',
      thumb: '<rect x="4" y="2" width="72" height="3" rx="1"/><rect x="0" y="7" width="80" height="22" opacity=".45"/><rect x="10" y="22" width="34" height="11" rx="1.5"/><rect x="4" y="36" width="35" height="9" rx="1.5" opacity=".5"/><rect x="41" y="36" width="35" height="9" rx="1.5" opacity=".5"/>' },
    { id: 'diagonal', name: 'Diagonal', icon: '◩',
      desc: 'Asimétrica: portada en ángulo, bandas cortadas en diagonal y números gigantes · panel con lomo vertical',
      thumb: '<rect x="4" y="3" width="72" height="4" rx="1"/><polygon points="0,12 80,9 80,26 0,29" opacity=".3"/><rect x="8" y="12" width="24" height="13" rx="1.5" opacity=".75" transform="rotate(-4 20 18)"/><rect x="38" y="14" width="34" height="4" rx="1"/><rect x="38" y="20" width="24" height="2" rx="1" opacity=".6"/><polygon points="0,33 80,31 80,46 0,46" opacity=".4"/>' }
  ];
  var lkey = 'lgw:layout:' + app;
  function findLayout(id) { for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i]; return null; }
  // Hoja de cada disposición: se inserta justo después de layouts.css (antes del CSS de la app,
  // para que las reglas [data-layout] propias de cada web sigan ganando). Una vez cargada se queda.
  function loadLayoutCss(l) {
    if (!base || l.css === false || document.querySelector('link[data-lgw-layout="' + l.id + '"]')) return;
    var k = document.createElement('link');
    k.rel = 'stylesheet'; k.href = base + 'layouts/' + l.id + '.css'; k.setAttribute('data-lgw-layout', l.id);
    var anchor = document.querySelector('link[data-lgw-layouts]');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(k, anchor.nextSibling); else document.head.appendChild(k);
  }
  function applyLayout(id, persist) {
    var l = findLayout(id) || findLayout(root.getAttribute('data-default-layout')) || LAYOUTS[0];
    loadLayoutCss(l);
    root.setAttribute('data-layout', l.id);
    if (persist && !locked) { try { localStorage.setItem(lkey, l.id); } catch (e) {} }
    try { window.dispatchEvent(new CustomEvent('lgw:layout', { detail: l })); } catch (e) {}
    return l;
  }
  var savedLayout = null;
  if (!locked) { try { savedLayout = localStorage.getItem(lkey); } catch (e) {} }
  applyLayout(savedLayout);
  window.LGWLayout = {
    list: LAYOUTS,
    get current() { return root.getAttribute('data-layout'); },
    find: findLayout,
    set: function (id) { return applyLayout(id, true); },
    use: function (id) { return applyLayout(id, false); }, // aplica sin guardar (vista previa de un cliente)
    locked: locked,
    next: function (dir) {
      var i = LAYOUTS.indexOf(findLayout(root.getAttribute('data-layout')));
      return applyLayout(LAYOUTS[(i + (dir || 1) + LAYOUTS.length) % LAYOUTS.length].id, true);
    }
  };

  apply(urlTheme() || read(), false, true);
  window.LGWTheme = {
    list: THEMES,
    groups: THEME_GROUPS,
    find: find,
    get current() { return pending || root.getAttribute('data-theme'); },
    set: function (id) { return apply(id, true); },
    use: function (id) { return apply(id, false); }, // aplica sin guardar (vista previa de un cliente)
    locked: locked,
    next: function (dir) {
      var i = THEMES.indexOf(find(this.current));
      return apply(THEMES[(i + (dir || 1) + THEMES.length) % THEMES.length].id, true);
    },
    // ready(fn): fn(estilo) cuando la hoja del estilo activo (o del que se está cargando) está lista.
    ready: function (fn) { if (pending) readyCbs.push(fn); else { var t = find(root.getAttribute('data-theme')); var k = t && t.css !== false && document.querySelector('link[data-lgw-theme="' + t.id + '"]'); if (k && !k.__ready) readyCbs.push(fn); else fn(t); } }
  };
})();
