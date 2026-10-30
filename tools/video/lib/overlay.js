// Capa de dirección que se inyecta en cada documento (page.addInitScript) ANTES que los scripts
// de la app. Dibuja el cursor falso, los subtítulos (lower-third), las tarjetas de capítulo y un
// anillo de foco, y expone utilidades de scroll suave. Corre en el navegador, no en Node.
//
// - Solo el frame superior pinta la UI; los iframes (maqueta de celular) reenvían sus eventos
//   de mouse al frame superior con el desplazamiento del iframe.
// - El estado (posición del cursor, subtítulo y tarjeta visibles) se guarda en sessionStorage,
//   así la capa sobrevive a las navegaciones sin parpadeos: al cargar la página nueva se
//   restaura de inmediato, incluso antes de que exista <body>.
// - Todo vive en un shadow DOM con pointer-events: none y z-index máximo: la app no lo ve,
//   no lo puede estilar y no recibe clics de él.
(function () {
  'use strict';
  if (window.__rec) return;
  var KEY = '__rec_state';
  var isTop = window === window.top;
  var state;
  try { state = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin storage */ } }

  // Preferencias de la demo para el video: sin el aviso de bienvenida y sin autorrelleno
  // automático (los campos se escriben a mano y ⚡ se usa a propósito en formularios largos).
  try {
    if (!localStorage.getItem('lgw:autofill-tip')) localStorage.setItem('lgw:autofill-tip', '1');
    if (!localStorage.getItem('lgw:autofill')) localStorage.setItem('lgw:autofill', 'off');
  } catch (e) { /* sin storage */ }

  // ---------- Utilidades presentes en todos los frames ----------
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function animate(dur, fn) {
    return new Promise(function (res) {
      var t0 = performance.now();
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        fn(ease(k));
        if (k < 1) requestAnimationFrame(tick); else res();
      })(t0);
    });
  }
  function scrollerOf(el) {
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) return p;
    }
    return document.scrollingElement || document.documentElement;
  }
  function scrollElTo(sc, top, left, dur) {
    var y0 = sc.scrollTop, x0 = sc.scrollLeft;
    var maxY = sc.scrollHeight - sc.clientHeight, maxX = sc.scrollWidth - sc.clientWidth;
    top = Math.max(0, Math.min(maxY, top)); left = Math.max(0, Math.min(maxX, left == null ? x0 : left));
    var dy = top - y0, dx = left - x0;
    if (Math.abs(dy) < 2 && Math.abs(dx) < 2) return Promise.resolve();
    // Desactiva el scroll-behavior:smooth de la app para que mande nuestra curva.
    var prev = sc.style.scrollBehavior; sc.style.scrollBehavior = 'auto';
    var d = dur || Math.max(300, Math.min(850, Math.abs(dy) * .45 + Math.abs(dx) * .35));
    return animate(d, function (k) { sc.scrollTop = y0 + dy * k; sc.scrollLeft = x0 + dx * k; }).then(function () { sc.style.scrollBehavior = prev; });
  }
  // Lleva un elemento a la zona visible "cómoda" (bajo el encabezado fijo y sobre el subtítulo).
  // ¿Está dentro de algo fijo (barra del portafolio, modal, panel 🎨)? Entonces no tiene sentido
  // desplazar la página: el elemento no se mueve con ella.
  function inFixed(el) {
    for (var p = el; p && p !== document.documentElement; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') return true;
    return false;
  }
  function reveal(el, opts) {
    opts = opts || {};
    if (!el || !el.getBoundingClientRect) return Promise.resolve(false);
    var fixed = inFixed(el);
    var chain = [], sc = scrollerOf(el);
    var rootSc = document.scrollingElement || document.documentElement;
    while (sc) { if (!(fixed && sc === rootSc)) chain.push(sc); if (sc === rootSc) break; sc = scrollerOf(sc); }
    var p = Promise.resolve();
    chain.forEach(function (s) {
      p = p.then(function () {
        var r = el.getBoundingClientRect();
        var root = s === (document.scrollingElement || document.documentElement);
        var box = root ? { top: 0, bottom: innerHeight, left: 0, right: innerWidth, height: innerHeight, width: innerWidth } : s.getBoundingClientRect();
        var topPad = root ? (opts.top != null ? opts.top : 120) : 16;
        var botPad = root ? (opts.bottom != null ? opts.bottom : (isTop ? 190 : 90)) : 16;
        var visTop = box.top + topPad, visBot = box.bottom - botPad;
        // Contenedores internos (menú lateral, modales): igual se evita la franja inferior de la
        // pantalla, donde están la barra del portafolio y el subtítulo.
        if (!root) { visTop = Math.max(visTop, 16); visBot = Math.min(visBot, innerHeight - (isTop ? 110 : 16)); }
        var dy = 0;
        if (opts.center || r.top < visTop || r.bottom > visBot) {
          var room = visBot - visTop;
          dy = r.height > room ? r.top - visTop : (r.top + r.height / 2) - (visTop + room / 2);
          if (!opts.center && r.height <= room) {
            // Solo lo justo para que entre, salvo que esté muy fuera de vista
            if (r.top >= visTop - 300 && r.bottom <= visBot + 300) dy = r.top < visTop ? r.top - visTop : r.bottom - visBot;
          }
        }
        var dx = 0;
        if (r.left < box.left + 8 || r.right > box.right - 8) dx = (r.left + r.width / 2) - (box.left + box.width / 2);
        if (Math.abs(dy) < 2 && Math.abs(dx) < 2) return;
        return scrollElTo(s, s.scrollTop + dy, s.scrollLeft + dx, opts.duration);
      });
    });
    return p.then(function () { return true; });
  }
  function scrollToY(y, dur) { return scrollElTo(document.scrollingElement || document.documentElement, y, null, dur); }

  var api = { reveal: reveal, scrollToY: scrollToY, scrollElTo: scrollElTo, isTop: isTop };
  window.__rec = api;

  // Los iframes reenvían el mouse al frame superior (misma procedencia).
  if (!isTop) {
    var fwd = function (type) {
      return function (e) {
        try {
          var fe = window.frameElement, R = window.top.__rec; if (!fe || !R) return;
          var b = fe.getBoundingClientRect(), sx = b.width / fe.offsetWidth || 1;
          R._pointer(type, b.left + fe.clientLeft + e.clientX * sx, b.top + fe.clientTop + e.clientY * sx);
        } catch (err) { /* otra procedencia */ }
      };
    };
    addEventListener('mousemove', fwd('move'), true);
    addEventListener('mousedown', fwd('down'), true);
    return;
  }

  // ---------- UI (solo frame superior) ----------
  var CSS = `
  :host{all:initial}
  *{box-sizing:border-box}
  .root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Inter,'Segoe UI',system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
  .cursor{position:absolute;left:0;top:0;width:34px;height:34px;transform:translate3d(-100px,-100px,0);will-change:transform;filter:drop-shadow(0 3px 6px rgba(0,0,0,.45))}
  .cursor svg{width:34px;height:34px;display:block;transition:transform .12s}
  .cursor.down svg{transform:scale(.86)}
  .cursor{transition:opacity .3s}.card.on ~ .cursor{opacity:0}
  .ripple{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:3px solid #ffb000;background:rgba(255,176,0,.25);animation:rip .55s ease-out forwards}
  @keyframes rip{from{transform:scale(.25);opacity:1}to{transform:scale(1.25);opacity:0}}
  .ring{position:absolute;border:4px solid #ffb000;border-radius:14px;box-shadow:0 0 0 9999px rgba(8,10,25,.28),0 0 30px rgba(255,176,0,.6);opacity:0;transition:opacity .35s, all .45s cubic-bezier(.2,.8,.2,1)}
  .ring.on{opacity:1}
  .cap{position:absolute;left:50%;bottom:34px;transform:translate(-50%,24px);opacity:0;max-width:min(1180px,calc(100vw - 760px));min-width:520px;display:flex;gap:18px;align-items:stretch;
    padding:16px 26px 17px 20px;border-radius:18px;background:rgba(10,12,28,.84);backdrop-filter:blur(14px);box-shadow:0 18px 50px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.1);transition:opacity .4s, transform .5s cubic-bezier(.2,.8,.2,1)}
  .cap.top{bottom:auto;top:26px;transform:translate(-50%,-24px)}
  .cap.on{opacity:1;transform:translate(-50%,0)}
  .cap .bar{flex:none;width:6px;border-radius:6px;background:linear-gradient(180deg,#ffb000,#ff5c8a 55%,#7c5cff)}
  .cap .kick{font-size:14px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#ffcf66;margin-bottom:4px}
  .cap .t{font-size:29px;font-weight:800;line-height:1.15;letter-spacing:-.01em}
  .cap .s{font-size:19px;line-height:1.38;color:#d6d9ee;margin-top:5px}
  .card{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:opacity .5s;background:#070a1a}
  .card.on{opacity:1}
  .card .bg{position:absolute;inset:0;background:radial-gradient(1200px 700px at 15% 10%,rgba(124,92,255,.55),transparent 60%),radial-gradient(1000px 650px at 90% 95%,rgba(0,212,255,.38),transparent 60%),radial-gradient(800px 500px at 80% 10%,rgba(255,92,138,.28),transparent 60%),#070a1a}
  .card .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(circle at 50% 50%,#000 30%,transparent 75%)}
  .card .in{position:relative;width:min(1400px,86vw);animation:cin .9s cubic-bezier(.2,.8,.2,1) both}
  @keyframes cin{from{transform:translateY(30px);opacity:0}}
  .card .brand{display:inline-flex;align-items:center;gap:12px;font-weight:700;font-size:22px;letter-spacing:.04em;color:#cfd3ff}
  .card .brand i{display:inline-grid;place-items:center;width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#7c5cff,#00d4ff);font-style:normal;font-size:20px;color:#fff}
  .card h1{font-size:104px;line-height:1;margin:26px 0 18px;font-weight:800;letter-spacing:-.035em}
  .card h2{font-size:84px;line-height:1.02;margin:16px 0 18px;font-weight:800;letter-spacing:-.03em}
  .card .num{font-size:24px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#ffcf66}
  .card p.lead{font-size:31px;line-height:1.4;color:#d8dbf2;margin:0;max-width:1180px}
  .card .chips{display:flex;flex-wrap:wrap;gap:12px;margin-top:36px}
  .card .chips span{padding:10px 18px;border-radius:999px;background:rgba(255,255,255,.09);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);font-size:21px;font-weight:600}
  .card .chips span b{color:#ffcf66;font-weight:700;margin-right:8px}
  .card ul.list{margin:30px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 40px;font-size:24px;color:#e3e5fb}
  .card ul.list li::before{content:'›';color:#ffcf66;font-weight:800;margin-right:12px}
  .card .url{display:inline-block;margin-top:34px;font-size:30px;font-weight:700;padding:14px 26px;border-radius:16px;background:linear-gradient(135deg,rgba(124,92,255,.35),rgba(0,212,255,.25));box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
  .card .foot{margin-top:44px;font-size:19px;color:#9ea3c7}
  `;
  var host, root, cursorEl, capEl, cardEl, ringEl;
  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('lgw-rec');
    host.setAttribute('aria-hidden', 'true');
    var sh = host.attachShadow({ mode: 'open' });
    sh.innerHTML = '<style>' + CSS + '</style><div class="root"><div class="card"></div><div class="ring"></div><div class="cap"></div><div class="cursor"><svg viewBox="0 0 32 32"><path d="M6 3.5 L6 26 L11.6 20.6 L15.4 29 L19.6 27.1 L15.8 18.9 L23.6 18.9 Z" fill="#fff" stroke="#111" stroke-width="1.8" stroke-linejoin="round"/></svg></div></div>';
    root = sh.querySelector('.root'); cursorEl = sh.querySelector('.cursor'); capEl = sh.querySelector('.cap'); cardEl = sh.querySelector('.card'); ringEl = sh.querySelector('.ring');
    (document.documentElement).appendChild(host);
    if (state.cursor) place(state.cursor.x, state.cursor.y);
    if (state.caption) showCaption(state.caption, true);
    if (state.card) showCard(state.card, true);
  }
  function place(x, y) { cursorEl.style.transform = 'translate3d(' + (x - 6) + 'px,' + (y - 3) + 'px,0)'; }
  function pointer(type, x, y) {
    if (!cursorEl) return;
    state.cursor = { x: x, y: y };
    place(x, y);
    if (type === 'down') {
      var r = document.createElement('div'); r.className = 'ripple'; r.style.left = x + 'px'; r.style.top = y + 'px';
      root.appendChild(r); setTimeout(function () { r.remove(); }, 650);
      cursorEl.classList.add('down'); setTimeout(function () { cursorEl.classList.remove('down'); }, 160);
    }
    clearTimeout(pointer.t); pointer.t = setTimeout(save, 120);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function showCaption(c, instant) {
    capEl.className = 'cap' + (c.pos === 'top' ? ' top' : '');
    capEl.innerHTML = '<div class="bar"></div><div>' + (c.kicker ? '<div class="kick">' + esc(c.kicker) + '</div>' : '') + '<div class="t">' + esc(c.title) + '</div>' + (c.sub ? '<div class="s">' + esc(c.sub) + '</div>' : '') + '</div>';
    if (instant) capEl.classList.add('on');
    else requestAnimationFrame(function () { requestAnimationFrame(function () { capEl.classList.add('on'); }); });
  }
  function showCard(c, instant) {
    cardEl.innerHTML = '<div class="bg"></div><div class="grid"></div><div class="in">' + c.html + '</div>';
    if (instant) { cardEl.style.transition = 'none'; cardEl.classList.add('on'); void cardEl.offsetWidth; cardEl.style.transition = ''; var i = cardEl.querySelector('.in'); if (i) i.style.animation = 'none'; }
    else requestAnimationFrame(function () { cardEl.classList.add('on'); });
  }

  api._pointer = pointer;
  api.cursor = function (x, y) { pointer('move', x, y); };
  api.ripple = function (x, y) { pointer('down', x, y); };
  api.caption = function (title, sub, opts) {
    opts = opts || {};
    state.caption = { title: title, sub: sub || '', kicker: opts.kicker || '', pos: opts.pos || 'bottom' }; save();
    capEl.classList.remove('on');
    var c = state.caption;
    return new Promise(function (res) { setTimeout(function () { showCaption(c); setTimeout(res, 250); }, capEl.innerHTML ? 200 : 0); });
  };
  api.hideCaption = function () { state.caption = null; save(); capEl.classList.remove('on'); return new Promise(function (r) { setTimeout(r, 420); }); };
  api.card = function (html) { state.card = { html: html }; save(); showCard(state.card); return new Promise(function (r) { setTimeout(r, 550); }); };
  api.hideCard = function () { state.card = null; save(); cardEl.classList.remove('on'); return new Promise(function (r) { setTimeout(function () { cardEl.innerHTML = ''; r(); }, 520); }); };
  api.ring = function (rect, ms) {
    var pad = 8;
    ringEl.style.left = (rect.x - pad) + 'px'; ringEl.style.top = (rect.y - pad) + 'px';
    ringEl.style.width = (rect.width + pad * 2) + 'px'; ringEl.style.height = (rect.height + pad * 2) + 'px';
    ringEl.classList.add('on');
    clearTimeout(api.ring.t);
    if (ms) api.ring.t = setTimeout(function () { ringEl.classList.remove('on'); }, ms);
  };
  api.unring = function () { ringEl.classList.remove('on'); };
  api.state = function () { return state; };

  addEventListener('mousemove', function (e) { pointer('move', e.clientX, e.clientY); }, true);
  addEventListener('mousedown', function (e) { pointer('down', e.clientX, e.clientY); }, true);
  // El script corre antes de que exista <html>: se monta apenas el parser lo crea. Si la app
  // llegara a sacar la capa del árbol, se vuelve a montar.
  function start() {
    mount();
    new MutationObserver(function () { if (!host.isConnected) mount(); }).observe(document.documentElement, { childList: true });
  }
  if (document.documentElement) start();
  else new MutationObserver(function (m, o) { if (document.documentElement) { o.disconnect(); start(); } }).observe(document, { childList: true });
  // Fuente de la capa (Inter) en el documento, para que el shadow DOM la herede.
  var addFont = function () {
    if (document.getElementById('lgw-rec-font') || !document.head) return;
    var l = document.createElement('link'); l.id = 'lgw-rec-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap';
    document.head.appendChild(l);
  };
  if (document.head) addFont(); else document.addEventListener('DOMContentLoaded', addFont);
})();
