// Biblioteca de vistas: lista los sistemas de projects.js, carga data/<app>.json de los que tienen
// capturas (según data/index.json) y muestra filtros, buscador, grilla y un visor con teclado.
// Enlaces directos: #<app> abre un sistema y #<app>/<vista> abre además el visor en esa vista.
(function () {
  'use strict';
  var P = window.LGW_PROJECTS || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  document.getElementById('y').textContent = new Date().getFullYear();

  var available = {};            // dir → resumen del índice
  var cache = {};                // dir → datos de la app
  var state = { app: null, data: null, section: 'todas', q: '', list: [], idx: -1, mode: 'desktop' };
  var sysEl = $('#systems'), appEl = $('#app'), lb = $('#lb');
  var lastFocus = null;

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); });
  }

  // ---------- Sistemas ----------
  function drawSystems() {
    var n = Object.keys(available).length;
    $('#avail').textContent = n + ' de ' + P.length + ' sistemas con biblioteca · el resto, próximamente';
    // Los disponibles primero, luego el orden del portafolio.
    var list = P.slice().sort(function (a, b) { return (available[b.dir] ? 1 : 0) - (available[a.dir] ? 1 : 0); });
    sysEl.innerHTML = list.map(function (p) {
      var a = available[p.dir];
      return '<button type="button" role="listitem" class="bib-sys' + (a ? '' : ' soon') + '" data-app="' + esc(p.dir) + '" aria-pressed="' + (p.dir === state.app) + '">' +
        '<span class="ico" aria-hidden="true">' + p.icon + '</span><span><b>' + esc(p.brand) + '</b><small>' + esc(p.name) + '</small>' +
        '<span class="st">' + (a ? a.views + ' vistas' : 'Próximamente') + '</span></span></button>';
    }).join('');
  }
  sysEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-app]'); if (!b) return;
    go(b.getAttribute('data-app'));
  });

  function go(dir, viewId, replace) {
    var h = '#' + dir + (viewId ? '/' + viewId : '');
    if (location.hash !== h) { replace ? history.replaceState(null, '', h) : history.pushState(null, '', h); }
    route();
  }

  // ---------- App seleccionada ----------
  function project(dir) { return P.filter(function (p) { return p.dir === dir; })[0]; }

  function selectApp(dir) {
    if (state.app === dir && (state.data || !available[dir])) return Promise.resolve();
    state.app = dir; state.section = 'todas'; state.q = ''; state.data = null;
    drawSystems();
    var cur = sysEl.querySelector('[aria-pressed="true"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    var p = project(dir);
    if (!available[dir]) { drawSoon(p); return Promise.resolve(); }
    appEl.innerHTML = '<div class="empty"><span class="spinner"></span><p>Cargando vistas…</p></div>';
    var load = cache[dir] ? Promise.resolve(cache[dir]) : fetchJSON('data/' + dir + '.json').then(function (d) { cache[dir] = d; return d; });
    return load.then(function (d) { if (state.app !== dir) return; state.data = d; drawApp(p, d); })
      .catch(function () { if (state.app === dir) drawSoon(p, true); });
  }

  function demoLink(p) { return '../' + p.dir + '/' + ((p.links && p.links[0] && p.links[0][1]) || 'index.html'); }

  function drawSoon(p, failed) {
    if (!p) { appEl.innerHTML = ''; return; }
    appEl.innerHTML = head(p, null) +
      '<div class="card bib-soon"><div><span class="badge">Próximamente</span><h3 style="margin:10px 0 6px">La biblioteca de ' + esc(p.brand) + ' está en preparación</h3>' +
      '<p class="muted" style="margin:0">' + (failed ? 'No se pudieron cargar las capturas. ' : '') + 'Mientras tanto puedes recorrer la demo en vivo: sitio público, login con cuentas de prueba y paneles de cada rol.</p></div>' +
      '<a class="btn btn-primary" href="' + esc(demoLink(p)) + '">Abrir la demo →</a></div>';
  }

  function head(p, d) {
    var shots = d ? d.views.filter(function (v) { return v.mobile; }).length : 0;
    var roles = d ? '<span class="badge plain">' + d.sections.length + ' secciones y roles</span>' + (shots ? '<span class="badge plain">' + shots + ' también en celular</span>' : '') : '';
    return '<div class="bib-app-head"><span class="ico" aria-hidden="true">' + p.icon + '</span>' +
      '<div><span class="eyebrow">' + esc(p.cat) + ' · ' + esc(p.name) + '</span><h2>' + esc(p.brand) + '</h2>' +
      '<p>' + esc(d && d.description || p.desc) + '</p>' +
      (d ? '<div class="bib-meta"><span class="badge badge-primary">' + d.views.length + ' vistas</span>' + roles + '</div>' : '') + '</div>' +
      '<div class="acts"><a class="btn btn-primary" href="' + esc(demoLink(p)) + '">Abrir la demo en vivo →</a>' +
      (p.links && p.links[1] ? '<a class="btn" href="../' + esc(p.dir) + '/' + esc(p.links[1][1]) + '">Cuentas de prueba</a>' : '') + '</div></div>';
  }

  function roleClass(d, sec) {
    var i = d.sections.map(function (s) { return s.id; }).indexOf(sec);
    return 'r' + (i < 0 ? 0 : i % 7);
  }
  function secLabel(d, id) { var s = d.sections.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }

  function drawApp(p, d) {
    var counts = {};
    d.views.forEach(function (v) { counts[v.section] = (counts[v.section] || 0) + 1; });
    appEl.innerHTML = head(p, d) +
      '<div class="bib-toolbar"><div class="bib-chips" role="group" aria-label="Filtrar por sección o rol">' +
      '<button type="button" class="chip" data-sec="todas" aria-pressed="true">Todas <span class="n">' + d.views.length + '</span></button>' +
      d.sections.map(function (s) { return '<button type="button" class="chip" data-sec="' + esc(s.id) + '" aria-pressed="false">' + esc(s.label) + ' <span class="n">' + counts[s.id] + '</span></button>'; }).join('') +
      '</div><label class="bib-search"><span aria-hidden="true">⌕</span><input class="input" type="search" id="bib-q" placeholder="Buscar vista o acción…" aria-label="Buscar vista o acción"></label></div>' +
      '<p class="bib-sec-desc" id="bib-sec-desc"></p><div id="bib-list"></div>' + looks(d);
    appEl.querySelector('.bib-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sec]'); if (!b) return;
      state.section = b.getAttribute('data-sec'); drawList();
    });
    $('#bib-q').addEventListener('input', function (e) { state.q = e.target.value; drawList(); });
    drawList();
  }

  function filtered() {
    var d = state.data, q = norm(state.q);
    return d.views.filter(function (v) {
      if (state.section !== 'todas' && v.section !== state.section) return false;
      if (!q) return true;
      return norm([v.title, v.description, v.actions.join(' '), secLabel(d, v.section), v.from || ''].join(' ')).indexOf(q) >= 0;
    });
  }

  function card(v, d) {
    var badge = '<span class="badge bib-role ' + roleClass(d, v.section) + '">' + esc(secLabel(d, v.section)) + '</span>';
    return '<button type="button" class="card hover bib-card" data-view="' + esc(v.id) + '" aria-label="' + esc(v.title + ' · ' + secLabel(d, v.section)) + '">' +
      '<span class="bib-thumb"><img src="' + esc(v.thumb) + '" alt="" loading="lazy" decoding="async" width="480" height="300">' +
      (v.kind === 'modal' ? '<span class="badge badge-info kind">Ventana</span>' : '') + '</span>' +
      '<span class="bib-card-body"><h4>' + esc(v.title) + '</h4><p>' + esc(v.description) + '</p>' +
      '<span class="bib-card-foot">' + badge + (v.login ? '<span class="lock" title="Requiere ingresar con una cuenta de prueba">🔒 ' + esc(v.login.role) + '</span>' : '') +
      (v.mobile ? '<span class="lock" title="Incluye captura de celular">📱</span>' : '') + '</span></span></button>';
  }

  function drawList() {
    var d = state.data, list = filtered(), box = $('#bib-list');
    state.list = list;
    appEl.querySelectorAll('.bib-chips [data-sec]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sec') === state.section)); });
    var sec = d.sections.filter(function (s) { return s.id === state.section; })[0];
    $('#bib-sec-desc').textContent = sec ? sec.desc : 'Todas las pantallas del sistema, ordenadas por rol. Haz clic en una para ver la captura completa y qué se puede hacer en ella.';
    if (!list.length) { box.innerHTML = '<div class="card bib-empty">No hay vistas que coincidan con “' + esc(state.q) + '”.</div>'; return; }
    // Agrupadas por sección cuando se muestran todas.
    if (state.section === 'todas') {
      box.innerHTML = d.sections.map(function (s) {
        var vs = list.filter(function (v) { return v.section === s.id; });
        return vs.length ? '<div class="bib-group"><h3>' + esc(s.label) + ' <small>' + vs.length + ' vista' + (vs.length === 1 ? '' : 's') + '</small></h3><div class="bib-grid">' + vs.map(function (v) { return card(v, d); }).join('') + '</div></div>' : '';
      }).join('');
      // El orden del visor sigue el orden visual (agrupado).
      state.list = d.sections.reduce(function (a, s) { return a.concat(list.filter(function (v) { return v.section === s.id; })); }, []);
    } else box.innerHTML = '<div class="bib-grid">' + list.map(function (v) { return card(v, d); }).join('') + '</div>';
  }

  appEl.addEventListener('click', function (e) {
    var c = e.target.closest('[data-view]');
    if (c) { go(state.app, c.getAttribute('data-view')); return; }
    var l = e.target.closest('[data-look]');
    if (l) openLook(l.getAttribute('data-look'));
  });

  // ---------- Elige el look ----------
  function looks(d) {
    if (!d.looks || !d.looks.items.length) return '';
    var groups = [];
    d.looks.items.forEach(function (it) { if (groups.indexOf(it.group) < 0) groups.push(it.group); });
    return '<section class="bib-looks" aria-labelledby="bib-looks-t"><div class="bib-looks-head"><div><span class="eyebrow">Personalización</span>' +
      '<h3 id="bib-looks-t">' + esc(d.looks.title) + '</h3><p>' + esc(d.looks.note) + '</p></div>' +
      '<a class="btn" href="../index.html#estilos">Ver los 30 estilos</a></div>' +
      groups.map(function (g) {
        return '<h4>' + esc(g === 'Disposición' ? '3 disposiciones de página' : 'Algunos de los 30 estilos') + '</h4><div class="bib-looks-row">' +
          d.looks.items.filter(function (it) { return it.group === g; }).map(function (it) {
            return '<button type="button" class="card hover bib-look" data-look="' + esc(it.id) + '"><span class="bib-thumb"><img src="' + esc(it.img) + '" alt="Portada con ' + esc(g.toLowerCase()) + ' ' + esc(it.label) + '" loading="lazy" decoding="async" width="960" height="600"></span>' +
              '<span class="cap"><b>' + esc(it.label) + '</b><small>' + esc(it.desc) + '</small></span></button>';
          }).join('') + '</div>';
      }).join('') + '</section>';
  }

  // ---------- Visor ----------
  function openLightbox() {
    if (lb.hidden) { lastFocus = document.activeElement; lb.hidden = false; document.body.classList.add('bib-lock'); }
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.hidden = true; document.body.classList.remove('bib-lock');
    if (state.app && /\//.test(location.hash)) history.pushState(null, '', '#' + state.app);
    var c = state.idx >= 0 && state.list[state.idx] && appEl.querySelector('[data-view="' + state.list[state.idx].id + '"]');
    var back = c || lastFocus;
    if (back && back.focus) back.focus();
    state.idx = -1;
  }

  function showView(id) {
    var d = state.data; if (!d) return;
    var i = state.list.map(function (v) { return v.id; }).indexOf(id);
    if (i < 0) { // la vista existe pero está fuera del filtro: se limpia el filtro
      if (!d.views.some(function (v) { return v.id === id; })) { history.replaceState(null, '', '#' + state.app); return; }
      state.section = 'todas'; state.q = ''; var qi = $('#bib-q'); if (qi) qi.value = ''; drawList();
      i = state.list.map(function (v) { return v.id; }).indexOf(id);
    }
    state.idx = i; state.mode = 'desktop';
    renderLightbox();
    openLightbox();
    $('#lb-next').disabled = i >= state.list.length - 1; $('#lb-prev').disabled = i <= 0;
    var f = lb.querySelector('.bib-lb-close'); if (document.activeElement === document.body || !lb.contains(document.activeElement)) f.focus();
  }

  function openUrl(v) {
    var u = v.url;
    if (v.login && /^index\.html/.test(u)) u = 'login.html?next=' + encodeURIComponent(u);
    return '../' + state.data.dir + '/' + u;
  }

  function renderLightbox() {
    var d = state.data, v = state.list[state.idx];
    if (!v) return;
    var mobile = state.mode === 'mobile' && v.mobile;
    $('#lb-switch').innerHTML = v.mobile ? '<button type="button" class="chip" data-mode="desktop" aria-pressed="' + !mobile + '">💻 Escritorio</button><button type="button" class="chip" data-mode="mobile" aria-pressed="' + mobile + '">📱 Celular</button>' : '<span class="badge plain">💻 Escritorio · 1440 × 900</span>';
    $('#lb-count').textContent = (state.idx + 1) + ' / ' + state.list.length;
    var fig = $('#lb-figure');
    fig.className = 'bib-lb-figure' + (mobile ? ' mobile' : '');
    fig.innerHTML = '<img src="' + esc(mobile ? v.mobile : v.img) + '" alt="Captura: ' + esc(v.title) + '" width="' + (mobile ? 390 : v.w) + '" height="' + (mobile ? 844 : v.h) + '">';
    var login = v.login ? '<div class="bib-login">🔒 Requiere ingresar como <b>' + esc(v.login.role) + '</b> (' + esc(v.login.name) + ').<br>Cuenta de prueba: <code>' + esc(v.login.email) + '</code> · <code>' + esc(v.login.password) + '</code>, o el botón de un clic en la página de ingreso.</div>' : '';
    $('#lb-info').innerHTML = '<div class="bib-lb-badges"><span class="badge bib-role ' + roleClass(d, v.section) + '">' + esc(secLabel(d, v.section)) + '</span>' +
      (v.kind === 'modal' ? '<span class="badge badge-info">Ventana</span>' : '') + '</div>' +
      '<h3 id="lb-title">' + esc(v.title) + '</h3><p>' + esc(v.description) + '</p>' +
      (v.from ? '<p class="bib-from">Se abre desde: ' + esc(v.from) + '.</p>' : '') +
      '<h4>Qué puede hacer aquí</h4><ul>' + v.actions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
      (v.roles && v.roles.length > 1 ? '<p class="bib-from">También disponible para: ' + esc(v.roles.filter(function (r) { return r !== secLabel(d, v.section); }).join(', ')) + '.</p>' : '') +
      login +
      '<div class="bib-lb-acts"><a class="btn btn-primary btn-block" href="' + esc(openUrl(v)) + '" target="_blank" rel="noopener">Abrir esta vista ↗</a>' +
      '<span class="hint">← → para recorrer · Esc para cerrar</span></div>';
    // Precarga las vecinas para que la navegación sea instantánea.
    [state.list[state.idx + 1], state.list[state.idx - 1]].forEach(function (n) { if (n) { var im = new Image(); im.src = n.img; } });
  }

  function openLook(id) {
    var d = state.data, it = d.looks.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    state.idx = -1;
    $('#lb-switch').innerHTML = '<span class="badge plain">' + esc(it.group) + '</span>';
    $('#lb-count').textContent = '';
    var fig = $('#lb-figure'); fig.className = 'bib-lb-figure';
    fig.innerHTML = '<img src="' + esc(it.img) + '" alt="Portada con ' + esc(it.label) + '" width="960" height="600">';
    $('#lb-prev').disabled = true; $('#lb-next').disabled = true;
    $('#lb-info').innerHTML = '<div class="bib-lb-badges"><span class="badge badge-primary">Elige el look</span></div><h3 id="lb-title">' + esc(it.group) + ': ' + esc(it.label) + '</h3><p>' + esc(it.desc) + '</p><p>' + esc(d.looks.note) + '</p>' +
      '<div class="bib-lb-acts"><a class="btn btn-block" href="../index.html#estilos">Ver los 30 estilos</a><span class="hint">Esc para cerrar</span></div>';
    openLightbox();
    lb.querySelector('.bib-lb-close').focus();
  }

  function step(n) {
    if (state.idx < 0) return;
    var i = state.idx + n; if (i < 0 || i >= state.list.length) return;
    go(state.app, state.list[i].id, true);
  }
  $('#lb-prev').addEventListener('click', function () { step(-1); });
  $('#lb-next').addEventListener('click', function () { step(1); });
  $('#lb-switch').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b) return; state.mode = b.getAttribute('data-mode'); renderLightbox(); });
  lb.addEventListener('click', function (e) { if (e.target.closest('[data-lb-close]')) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Tab') { // foco atrapado dentro del visor
      var f = Array.prototype.filter.call(lb.querySelectorAll('a[href], button:not([disabled])'), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  // Deslizar en pantallas táctiles.
  (function () {
    var x0 = null, fig = $('#lb-figure');
    fig.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    fig.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  })();

  // ---------- Rutas por hash ----------
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    var parts = h.split('/'), dir = parts[0], view = parts[1];
    if (!project(dir)) {
      var anchor = h && document.getElementById(h); // anclas de la página (#sistemas)
      if (anchor && state.app) return;
      dir = Object.keys(available)[0] || (P[0] && P[0].dir);
      if (!dir) return;
      view = null;
    }
    selectApp(dir).then(function () {
      if (view && state.data) showView(view);
      else if (!lb.hidden) { lb.hidden = true; document.body.classList.remove('bib-lock'); state.idx = -1; }
    });
  }
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  fetchJSON('data/index.json').then(function (ix) { available = ix.apps || {}; })
    .catch(function () { available = {}; })
    .then(function () {
      // Solo cuentan los sistemas que existen en el portafolio.
      Object.keys(available).forEach(function (k) { if (!project(k)) delete available[k]; });
      drawSystems(); route();
    });
})();
