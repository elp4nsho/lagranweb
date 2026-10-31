// Sistema de estilos de La Gran Web. Script clásico: cárgalo SINCRÓNICO en <head>
// para aplicar el estilo antes del primer pintado.
//   <html data-app="tienda" data-default-theme="brutal">
//   <script src="../assets/core/theme-boot.js"></script>
(function () {
  var THEMES = [
    { id: 'aurora',    name: 'Aurora',    desc: 'SaaS limpio y luminoso',  sw: ['#f6f7fb', '#4f46e5', '#0ea5e9'], fonts: 'Inter:wght@400;500;600;700' },
    { id: 'noir',      name: 'Noir Neón', desc: 'Oscuro cyber con brillo', sw: ['#05060a', '#00e5ff', '#ff2bd6'], fonts: 'Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600' },
    { id: 'brutal',    name: 'Brutal',    desc: 'Neo-brutalismo crudo',     sw: ['#fff4d6', '#111111', '#ff5c8a'], fonts: 'Archivo+Black&family=Archivo:wght@400;600;800' },
    { id: 'glass',     name: 'Cristal',   desc: 'Glassmorphism y degradé',  sw: ['#7b5cff', '#ffffff', '#ff8ad8'], fonts: 'Outfit:wght@300;400;600;700' },
    { id: 'neumorph',  name: 'Relieve',   desc: 'Neumorfismo suave',        sw: ['#e4e9f0', '#5b7cfa', '#a3b1c6'], fonts: 'Nunito:wght@400;600;800' },
    { id: 'editorial', name: 'Editorial', desc: 'Revista impresa clásica',  sw: ['#f4efe6', '#1a1a1a', '#c8102e'], fonts: 'Playfair+Display:ital,wght@0,500;0,800;1,500&family=Source+Serif+4:wght@400;600' },
    { id: 'terminal',  name: 'Terminal',  desc: 'Fósforo verde de consola', sw: ['#020a03', '#33ff66', '#ffb000'], fonts: 'VT323&family=IBM+Plex+Mono:wght@400;600' },
    { id: 'synthwave', name: 'Synthwave', desc: 'Atardecer retro 80s',      sw: ['#1a0533', '#ff3cac', '#ffd319'], fonts: 'Orbitron:wght@500;800&family=Rajdhani:wght@400;600' },
    { id: 'luxury',    name: 'Lujo',      desc: 'Negro y oro, serif fina',  sw: ['#0c0b09', '#c9a35b', '#f2e7d0'], fonts: 'Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;600' },
    { id: 'candy',     name: 'Caramelo',  desc: 'Pastel juguetón',          sw: ['#fff6fb', '#ff7eb6', '#7ad7f0'], fonts: 'Fredoka:wght@400;500;600;700' },
    { id: 'bauhaus',   name: 'Bauhaus',   desc: 'Geometría y primarios',    sw: ['#f2ede3', '#e63322', '#1e4db7'], fonts: 'Josefin+Sans:wght@400;600;700' },
    { id: 'nordic',    name: 'Nórdico',   desc: 'Minimal blanco y aire',    sw: ['#ffffff', '#111111', '#9aa0a6'], fonts: 'Manrope:wght@300;400;600;800' },
    { id: 'forest',    name: 'Bosque',    desc: 'Orgánico verde y tierra',  sw: ['#eef0e4', '#2f5d3a', '#c9803b'], fonts: 'DM+Serif+Display&family=DM+Sans:wght@400;500;700' },
    { id: 'pixel',     name: 'Pixel',     desc: 'Videojuego 8 bits',        sw: ['#1d1b3a', '#ffcd00', '#00d26a'], fonts: 'Press+Start+2P&family=Silkscreen' },
    { id: 'memphis',   name: 'Memphis',   desc: 'Pop 90s con formas',       sw: ['#fffdf5', '#ff6b35', '#00a6a6'], fonts: 'Poppins:wght@400;600;800' },
    { id: 'blueprint', name: 'Plano',     desc: 'Plano técnico azul',       sw: ['#0b3d91', '#ffffff', '#7fd1ff'], fonts: 'Share+Tech+Mono&family=Barlow+Condensed:wght@500;700' },
    { id: 'sketch',    name: 'Boceto',    desc: 'Dibujado a mano en papel', sw: ['#fdfbf3', '#2b2b2b', '#ff6f59'], fonts: 'Caveat:wght@500;700&family=Patrick+Hand' },
    { id: 'graphite',  name: 'Grafito',   desc: 'Dashboard pro oscuro',     sw: ['#0f1218', '#3b82f6', '#22c55e'], fonts: 'IBM+Plex+Sans:wght@400;500;600;700' },
    { id: 'chrome',    name: 'Cromo Y2K', desc: 'Metal líquido 2000',       sw: ['#d9dde3', '#7a5cff', '#00e0c7'], fonts: 'Syne:wght@500;700;800' },
    { id: 'contrast',  name: 'Contraste', desc: 'Alto contraste accesible', sw: ['#000000', '#ffff00', '#ffffff'], fonts: 'Atkinson+Hyperlegible:wght@400;700' },
    // Era HTML5 (2010–2014): animaciones de entrada al estilo WOW.js / animate.css.
    { id: 'web2',      name: 'Web 2.0',      group: 'html5', anim: 'bounceIn',    desc: 'Brillo, reflejos y "beta"', sw: ['#eef6ff', '#2b8de0', '#ff7a00'], fonts: 'Ubuntu:wght@400;700' },
    { id: 'skeuo',     name: 'iOS 6',        group: 'html5', anim: 'fadeInUp',    desc: 'Lino, cuero y relieve',     sw: ['#cfd4dc', '#3d6bb3', '#6b4a2e'], fonts: 'Lato:wght@400;700' },
    { id: 'metro',     name: 'Metro',        group: 'html5', anim: 'turnIn',      desc: 'Windows 8, mosaicos planos', sw: ['#1d1d1d', '#00a300', '#2d89ef'], fonts: 'Open+Sans:wght@300;400;600' },
    { id: 'bootstrap2',name: 'Bootstrap 2',  group: 'html5', anim: 'fadeIn',      desc: 'Barra negra y degradés',    sw: ['#ffffff', '#0074cc', '#222222'], fonts: 'Arimo:wght@400;700' },
    { id: 'flatui',    name: 'Flat UI',      group: 'html5', anim: 'zoomIn',      desc: 'Plano 2013 turquesa',       sw: ['#ecf0f1', '#1abc9c', '#34495e'], fonts: 'Lato:wght@300;400;700;900' },
    { id: 'parallax',  name: 'Parallax',     group: 'html5', anim: 'fadeInUp',    desc: 'One-page con fondos fijos', sw: ['#1b1f24', '#ffffff', '#e74c3c'], fonts: 'Raleway:wght@200;400;700' },
    { id: 'aqua',      name: 'Aqua',         group: 'html5', anim: 'flipInX',     desc: 'Mac OS X gel y rayas',      sw: ['#e8e8e8', '#3a8ee6', '#9ac5f5'], fonts: 'Lucida+Sans:wght@400' },
    { id: 'nativo',    name: 'HTML nativo',  group: 'html5', anim: 'none',        desc: 'Controles del navegador',   sw: ['#ffffff', '#0000ee', '#551a8b'], fonts: '' },
    { id: 'vintage',   name: 'Vintage',      group: 'html5', anim: 'slideInLeft', desc: 'Hipster 2012, cintas',      sw: ['#f3e9d2', '#c0392b', '#2c3e50'], fonts: 'Lobster&family=Arvo:wght@400;700' },
    { id: 'material',  name: 'Material 14',  group: 'html5', anim: 'fadeInUp',    desc: 'Papel, sombras y FAB',      sw: ['#fafafa', '#3f51b5', '#ff4081'], fonts: 'Roboto:wght@300;400;500;700' }
  ];
  var root = document.documentElement;
  var app = root.getAttribute('data-app') || 'global';
  var key = 'lgw:theme:' + app;
  function read() { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(id) { try { localStorage.setItem(key, id); } catch (e) {} }
  function find(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return null; }

  // Hoja de estilos de los temas (misma carpeta que este script).
  var base = (document.currentScript && document.currentScript.src || '').replace(/theme-boot\.js.*$/, '');
  if (base && !document.querySelector('link[data-lgw-themes]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + 'themes.css'; l.setAttribute('data-lgw-themes', '');
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

  function apply(id, persist) {
    var t = find(id) || find(root.getAttribute('data-default-theme')) || THEMES[0];
    root.setAttribute('data-theme', t.id);
    loadFonts(t);
    if (persist) save(t.id);
    try { window.dispatchEvent(new CustomEvent('lgw:theme', { detail: t })); } catch (e) {}
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
      thumb: '<rect x="24" y="3" width="32" height="4" rx="1"/><rect x="24" y="10" width="32" height="9" rx="1" opacity=".35"/><rect x="24" y="22" width="32" height="2" rx="1" opacity=".6"/><rect x="24" y="26" width="28" height="2" rx="1" opacity=".5"/><rect x="24" y="30" width="32" height="2" rx="1" opacity=".5"/><rect x="24" y="34" width="22" height="2" rx="1" opacity=".5"/><rect x="24" y="38" width="30" height="2" rx="1" opacity=".5"/>' }
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
    if (persist) { try { localStorage.setItem(lkey, l.id); } catch (e) {} }
    try { window.dispatchEvent(new CustomEvent('lgw:layout', { detail: l })); } catch (e) {}
    return l;
  }
  var savedLayout = null;
  try { savedLayout = localStorage.getItem(lkey); } catch (e) {}
  applyLayout(savedLayout);
  window.LGWLayout = {
    list: LAYOUTS,
    get current() { return root.getAttribute('data-layout'); },
    find: findLayout,
    set: function (id) { return applyLayout(id, true); },
    next: function (dir) {
      var i = LAYOUTS.indexOf(findLayout(root.getAttribute('data-layout')));
      return applyLayout(LAYOUTS[(i + (dir || 1) + LAYOUTS.length) % LAYOUTS.length].id, true);
    }
  };

  apply(read());
  window.LGWTheme = {
    list: THEMES,
    get current() { return root.getAttribute('data-theme'); },
    set: function (id) { return apply(id, true); },
    next: function (dir) {
      var i = THEMES.findIndex(function (t) { return t.id === root.getAttribute('data-theme'); });
      return apply(THEMES[(i + (dir || 1) + THEMES.length) % THEMES.length].id, true);
    }
  };
})();
