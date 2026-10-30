(function () {
  'use strict';
  var PRODUCTS = window.RAIZ_PRODUCTS, CATS = window.RAIZ_CATEGORIES;
  var FREE_SHIP = 50000, SHIP_STD = 3990, SHIP_EXP = 6990;
  var COUPONS = { BIENVENIDA10: { pct: 10, label: '10% de bienvenida' }, RAIZ15: { pct: 15, label: '15% clientes Raíz' } };
  var CART_KEY = 'raiz_cart_v1', WISH_KEY = 'raiz_wish_v1', COUPON_KEY = 'raiz_coupon_v1';

  // ---------- utilidades ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clp = function (n) { return '$' + Math.round(n).toLocaleString('es-CL').replace(/,/g, '.'); };
  // Fallback de formato por si el navegador no tiene locale es-CL
  if (clp(12990) !== '$12.990') clp = function (n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var byId = function (id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; };
  var catName = function (c) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === c) return CATS[i][1]; return c; };
  function store(key, val) {
    try {
      if (val === undefined) { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function mix(hex, pct) { // mezcla con blanco
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.round(c + (255 - c) * pct); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function mediaBg(hex) { return 'radial-gradient(circle at 30% 25%, ' + mix(hex, .82) + ', ' + mix(hex, .45) + ' 70%, ' + mix(hex, .25) + ')'; }
  var stars = function (r) { return '★ ' + r.toFixed(1); };
  var heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

  // ---------- estado ----------
  var state = {
    cat: 'todos', q: '', max: 70000, sale: false, onlyWish: false, sort: 'rel',
    cart: sanitizeCart(store(CART_KEY)),
    wish: (store(WISH_KEY) || []).filter(byId),
    coupon: (function (c) { return c && COUPONS[c] ? c : null; })(store(COUPON_KEY))
  };
  function sanitizeCart(c) {
    if (!Array.isArray(c)) return [];
    return c.filter(function (l) { return l && byId(l.id) && l.qty > 0; }).map(function (l) {
      return { key: l.key, id: l.id, size: l.size, color: l.color, qty: Math.min(10, Math.max(1, l.qty | 0)) };
    });
  }
  function saveCart() { store(CART_KEY, state.cart); store(COUPON_KEY, state.coupon); }

  // ---------- toasts ----------
  function toast(msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast' + (kind === 'warn' ? ' toast--warn' : '');
    t.innerHTML = msg;
    var box = $('#toasts');
    box.appendChild(t);
    raiseToasts(box);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  // Los toasts usan popover para quedar sobre los <dialog> modales (top layer)
  function raiseToasts(box) {
    if (typeof box.showPopover !== 'function') return;
    try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch (e) {}
  }

  // ---------- catálogo ----------
  function renderChips() {
    $('#categoryChips').innerHTML = CATS.map(function (c) {
      return '<button class="chip" role="tab" data-cat="' + c[0] + '" aria-selected="' + (state.cat === c[0]) + '">' + c[1] + '</button>';
    }).join('');
  }
  function filtered() {
    var q = state.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var list = PRODUCTS.filter(function (p) {
      if (state.cat !== 'todos' && p.cat !== state.cat) return false;
      if (p.price > state.max) return false;
      if (state.sale && !p.oldPrice) return false;
      if (state.onlyWish && state.wish.indexOf(p.id) < 0) return false;
      if (q) {
        var hay = (p.name + ' ' + p.cat + ' ' + p.desc + ' ' + p.colors.map(function (c) { return c[0]; }).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    });
    var s = state.sort;
    if (s === 'asc') list.sort(function (a, b) { return a.price - b.price; });
    if (s === 'desc') list.sort(function (a, b) { return b.price - a.price; });
    if (s === 'rating') list.sort(function (a, b) { return b.rating - a.rating; });
    if (s === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    return list;
  }
  function renderGrid() {
    var list = filtered();
    $('#resultCount').textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
    $('#emptyState').hidden = list.length > 0;
    $('#grid').innerHTML = list.map(function (p, i) {
      var w = state.wish.indexOf(p.id) >= 0;
      return '<article class="card" style="animation-delay:' + Math.min(i * 30, 300) + 'ms">' +
        '<button class="card__media" style="background:' + mediaBg(p.colors[0][1]) + '" data-open="' + p.id + '" aria-label="Ver detalle de ' + esc(p.name) + '"><span class="emoji" aria-hidden="true">' + p.emoji + '</span></button>' +
        (p.tag ? '<span class="tag' + (p.oldPrice ? ' tag--oferta' : '') + '">' + p.tag + '</span>' : '') +
        '<button class="wish" data-wish="' + p.id + '" aria-pressed="' + w + '" aria-label="' + (w ? 'Quitar de' : 'Agregar a') + ' favoritos: ' + esc(p.name) + '">' + heart + '</button>' +
        '<div class="card__body"><div class="card__cat">' + catName(p.cat) + '</div>' +
        '<h3 class="card__title"><button data-open="' + p.id + '">' + esc(p.name) + '</button></h3>' +
        '<div class="card__row"><span class="price">' + clp(p.price) + (p.oldPrice ? '<s>' + clp(p.oldPrice) + '</s>' : '') + '</span><span class="stars" aria-label="Evaluación ' + p.rating + ' de 5">' + stars(p.rating) + '</span></div>' +
        '<div class="swatches" aria-label="Colores: ' + p.colors.map(function (c) { return c[0]; }).join(', ') + '">' + p.colors.map(function (c) { return '<i style="background:' + c[1] + '"></i>'; }).join('') + '</div>' +
        '<button class="quick-add" data-open="' + p.id + '">Elegir talla</button></div></article>';
    }).join('');
  }
  function renderAll() { renderChips(); renderGrid(); $('#priceLabel').textContent = clp(state.max); }

  // ---------- favoritos ----------
  function toggleWish(id) {
    var i = state.wish.indexOf(id), p = byId(id);
    if (i >= 0) { state.wish.splice(i, 1); toast('Quitaste <b>' + esc(p.name) + '</b> de favoritos'); }
    else { state.wish.push(id); toast('♥ <b>' + esc(p.name) + '</b> agregado a favoritos'); }
    store(WISH_KEY, state.wish);
    updateBadges(); renderGrid(); renderWish();
    var mb = $('#pmWish'); if (mb && mb.dataset.wish === id) syncPmWish(id);
  }
  function renderWish() {
    var list = state.wish.map(byId);
    $('#wishItems').innerHTML = list.length ? list.map(function (p) {
      return '<div class="line"><div class="line__thumb" style="background:' + mediaBg(p.colors[0][1]) + '" aria-hidden="true">' + p.emoji + '</div>' +
        '<div><h3>' + esc(p.name) + '</h3><small>' + clp(p.price) + '</small><button class="btn btn--ghost" style="padding:6px 14px;font-size:13px" data-open="' + p.id + '">Ver producto</button></div>' +
        '<div class="line__right"><button class="link-btn" data-wish="' + p.id + '">Quitar</button></div></div>';
    }).join('') : '<div class="cart-empty"><span aria-hidden="true">🤍</span>Aún no tienes favoritos.<br>Toca el corazón en un producto para guardarlo.</div>';
  }

  // ---------- detalle de producto ----------
  var pmState = null, lastFocus = null;
  function openProduct(id) {
    var p = byId(id); if (!p) return;
    pmState = { id: id, size: p.sizes.length === 1 ? p.sizes[0] : null, color: p.colors[0][0], qty: 1 };
    var body = $('#productModalBody');
    body.innerHTML =
      '<button class="icon-btn modal__close" data-close-modal aria-label="Cerrar detalle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<div class="pd"><div class="pd__media" id="pmMedia" style="background:' + mediaBg(p.colors[0][1]) + '"><span class="emoji" aria-hidden="true">' + p.emoji + '</span></div>' +
      '<div class="pd__info"><div class="card__cat">' + catName(p.cat) + ' · <span class="stars">' + stars(p.rating) + '</span></div>' +
      '<h2 id="pmTitle">' + esc(p.name) + '</h2>' +
      '<div class="pd__price">' + clp(p.price) + (p.oldPrice ? '<s>' + clp(p.oldPrice) + '</s>' : '') + '</div>' +
      '<p class="pd__desc">' + esc(p.desc) + '</p>' +
      '<span class="opt-label" id="colorLbl">Color: <span id="pmColorName">' + p.colors[0][0] + '</span></span>' +
      '<div class="color-list" role="radiogroup" aria-labelledby="colorLbl">' + p.colors.map(function (c, i) {
        return '<label title="' + c[0] + '"><input type="radio" name="pmColor" value="' + c[0] + '" data-hex="' + c[1] + '"' + (i === 0 ? ' checked' : '') + ' aria-label="' + c[0] + '"><span style="background:' + c[1] + '"></span></label>';
      }).join('') + '</div>' +
      '<span class="opt-label" id="sizeLbl">Talla' + (p.sizes.length > 1 ? ' <span>(elige una)</span>' : '') + '</span>' +
      '<div class="size-list" role="radiogroup" aria-labelledby="sizeLbl">' + p.sizes.map(function (s) {
        return '<label><input type="radio" name="pmSize" value="' + s + '"' + (pmState.size === s ? ' checked' : '') + '><span>' + s + '</span></label>';
      }).join('') + '</div>' +
      '<div class="pd__actions"><div class="qty" aria-label="Cantidad"><button type="button" data-pmqty="-1" aria-label="Disminuir cantidad">−</button><output id="pmQty" aria-live="polite">1</output><button type="button" data-pmqty="1" aria-label="Aumentar cantidad">+</button></div>' +
      '<button class="btn btn--primary" id="pmAdd">Agregar · ' + clp(p.price) + '</button>' +
      '<button class="icon-btn wish" style="position:static;border:1.5px solid var(--line);width:48px;height:48px" id="pmWish" data-wish="' + p.id + '">' + heart + '</button></div>' +
      '<ul class="pd__perks"><li>🚚 Envío gratis sobre ' + clp(FREE_SHIP) + '</li><li>🔁 Cambio de talla gratis por 30 días</li><li>🌱 Materiales de origen responsable</li></ul>' +
      '</div></div>';
    syncPmWish(id);
    lastFocus = document.activeElement;
    var dlg = $('#productModal');
    if (!dlg.open) dlg.showModal();
    var first = $('input[name="pmColor"]:checked', body); if (first) first.focus();
  }
  function syncPmWish(id) {
    var b = $('#pmWish'); if (!b) return;
    var w = state.wish.indexOf(id) >= 0;
    b.setAttribute('aria-pressed', w);
    b.setAttribute('aria-label', w ? 'Quitar de favoritos' : 'Agregar a favoritos');
  }
  function updatePmAdd() {
    var p = byId(pmState.id);
    $('#pmQty').textContent = pmState.qty;
    $('#pmAdd').textContent = 'Agregar · ' + clp(p.price * pmState.qty);
  }

  // ---------- carrito ----------
  function cartCount() { return state.cart.reduce(function (s, l) { return s + l.qty; }, 0); }
  function totals(shipMethod) {
    var sub = state.cart.reduce(function (s, l) { return s + byId(l.id).price * l.qty; }, 0);
    var disc = state.coupon ? Math.round(sub * COUPONS[state.coupon].pct / 100) : 0;
    var base = sub - disc, free = base >= FREE_SHIP;
    var ship = 0;
    if (sub > 0) {
      if (shipMethod === 'exp') ship = free ? SHIP_EXP - SHIP_STD : SHIP_EXP;
      else if (shipMethod === 'pick') ship = 0;
      else ship = free ? 0 : SHIP_STD;
    }
    return { sub: sub, disc: disc, base: base, ship: ship, free: free, total: base + ship };
  }
  function addToCart(id, size, color, qty) {
    var key = id + '|' + size + '|' + color;
    var line = state.cart.filter(function (l) { return l.key === key; })[0];
    if (line) line.qty = Math.min(10, line.qty + qty);
    else state.cart.push({ key: key, id: id, size: size, color: color, qty: qty });
    saveCart(); renderCart(); updateBadges(true);
  }
  function setQty(key, delta) {
    var line = state.cart.filter(function (l) { return l.key === key; })[0]; if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) return removeLine(key);
    if (line.qty > 10) { line.qty = 10; toast('Máximo 10 unidades por producto', 'warn'); }
    saveCart(); renderCart(); updateBadges();
  }
  function removeLine(key) {
    var line = state.cart.filter(function (l) { return l.key === key; })[0];
    state.cart = state.cart.filter(function (l) { return l.key !== key; });
    if (!state.cart.length) state.coupon = null;
    saveCart(); renderCart(); updateBadges();
    if (line) toast('Eliminaste <b>' + esc(byId(line.id).name) + '</b> del carrito');
    var f = $('#cartDrawer .qty button') || $('#cartDrawer [data-close-drawer]'); if (f && $('#cartDrawer').classList.contains('is-open')) f.focus();
  }
  function hexOf(p, colorName) { for (var i = 0; i < p.colors.length; i++) if (p.colors[i][0] === colorName) return p.colors[i][1]; return p.colors[0][1]; }
  function renderCart() {
    var t = totals();
    var missing = Math.max(0, FREE_SHIP - t.base), pct = Math.min(100, t.base / FREE_SHIP * 100);
    $('#shipProgress').innerHTML = !state.cart.length ? 'Agrega productos y obtén <b>envío gratis</b> sobre ' + clp(FREE_SHIP) + '.' + '<div class="bar"><i style="width:0%"></i></div>'
      : (missing > 0 ? 'Te faltan <b>' + clp(missing) + '</b> para envío gratis 🚚' : '🎉 ¡Tienes <b>envío gratis</b>!') +
        '<div class="bar" role="progressbar" aria-label="Progreso hacia envío gratis" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><i style="width:' + pct + '%"></i></div>';
    if (!state.cart.length) {
      $('#cartItems').innerHTML = '<div class="cart-empty"><span aria-hidden="true">🧺</span>Tu carrito está vacío.<br><button class="btn btn--ghost" style="margin-top:14px" data-close-drawer>Explorar productos</button></div>';
      $('#cartFoot').innerHTML = '';
      return;
    }
    $('#cartItems').innerHTML = state.cart.map(function (l) {
      var p = byId(l.id);
      return '<div class="line"><div class="line__thumb" style="background:' + mediaBg(hexOf(p, l.color)) + '" aria-hidden="true">' + p.emoji + '</div>' +
        '<div><h3>' + esc(p.name) + '</h3><small>' + esc(l.color) + ' · Talla ' + esc(l.size) + '</small>' +
        '<div class="qty" role="group" aria-label="Cantidad de ' + esc(p.name) + '"><button data-qty="-1" data-key="' + esc(l.key) + '" aria-label="Disminuir">−</button><span>' + l.qty + '</span><button data-qty="1" data-key="' + esc(l.key) + '" aria-label="Aumentar">+</button></div></div>' +
        '<div class="line__right"><b>' + clp(p.price * l.qty) + '</b><button class="link-btn" data-remove="' + esc(l.key) + '">Eliminar</button></div></div>';
    }).join('');
    $('#cartFoot').innerHTML =
      (state.coupon
        ? '<div class="coupon-ok"><span>🏷️ <b>' + state.coupon + '</b> · ' + COUPONS[state.coupon].label + '</span><button class="link-btn" id="rmCoupon">Quitar</button></div>'
        : '<form class="coupon" id="couponForm"><label for="couponIn" class="sr-only">Código de descuento</label><input id="couponIn" placeholder="Código de descuento" autocomplete="off"><button>Aplicar</button></form>') +
      '<div class="totals"><div><span>Subtotal</span><span>' + clp(t.sub) + '</span></div>' +
      (t.disc ? '<div class="disc"><span>Descuento</span><span>−' + clp(t.disc) + '</span></div>' : '') +
      '<div><span>Envío estándar</span><span>' + (t.ship ? clp(t.ship) : 'Gratis') + '</span></div>' +
      '<div class="total"><span>Total</span><span>' + clp(t.total) + '</span></div></div>' +
      '<button class="btn btn--primary btn--block" id="goCheckout">Ir a pagar</button>';
  }
  function updateBadges(bump) {
    var c = cartCount(), b = $('#cartCount');
    b.hidden = c === 0; b.textContent = c;
    $('#cartBtn').setAttribute('aria-label', 'Abrir carrito (' + c + ' productos)');
    if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    var w = $('#wishCount'); w.hidden = !state.wish.length; w.textContent = state.wish.length;
  }

  // ---------- drawers ----------
  var openDrawerEl = null, drawerReturn = null;
  function openDrawer(id) {
    closeDrawer(true);
    var d = $(id); drawerReturn = document.activeElement; openDrawerEl = d;
    var s = $('#scrim'); s.hidden = false;
    requestAnimationFrame(function () { s.classList.add('is-on'); d.classList.add('is-open'); });
    d.removeAttribute('inert'); d.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var c = $('[data-close-drawer]', d); if (c) c.focus(); }, 50);
  }
  function closeDrawer(silent) {
    if (!openDrawerEl) return;
    var d = openDrawerEl; openDrawerEl = null;
    d.classList.remove('is-open'); d.setAttribute('inert', ''); d.setAttribute('aria-hidden', 'true');
    var s = $('#scrim'); s.classList.remove('is-on');
    setTimeout(function () { if (!openDrawerEl) s.hidden = true; }, 300);
    document.body.style.overflow = '';
    if (!silent && drawerReturn && drawerReturn.focus) drawerReturn.focus();
  }

  // ---------- checkout ----------
  var coStep = 0;
  function openCheckout() {
    if (!state.cart.length) return;
    closeDrawer(true);
    coStep = 0;
    $('#coError').textContent = '';
    $$('#coForm [aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    showStep();
    $('#checkoutModal').showModal();
    setTimeout(function () { $('#fName').focus(); }, 50);
  }
  function shipMethod() { var r = $('input[name="ship"]:checked'); return r ? r.value : 'std'; }
  function renderSummary(snapshot) {
    var t = snapshot ? snapshot.t : totals(coStep >= 1 ? shipMethod() : 'std');
    var lines = snapshot ? snapshot.lines : state.cart;
    var t0 = totals();
    $('[data-ship-price="std"]').textContent = t0.free ? 'Gratis' : clp(SHIP_STD);
    $('[data-ship-price="exp"]').textContent = clp(t0.free ? SHIP_EXP - SHIP_STD : SHIP_EXP);
    $('#coSummary').innerHTML = '<h3>Resumen (' + lines.reduce(function (s, l) { return s + l.qty; }, 0) + ')</h3><ul>' + lines.map(function (l) {
      var p = byId(l.id);
      return '<li><span class="mini" style="background:' + mediaBg(hexOf(p, l.color)) + '" aria-hidden="true">' + p.emoji + '</span><span>' + esc(p.name) + '<br><small class="muted">' + esc(l.size) + ' · ' + esc(l.color) + ' · ×' + l.qty + '</small></span><b>' + clp(p.price * l.qty) + '</b></li>';
    }).join('') + '</ul><div class="totals"><div><span>Subtotal</span><span>' + clp(t.sub) + '</span></div>' +
      (t.disc ? '<div class="disc"><span>Descuento</span><span>−' + clp(t.disc) + '</span></div>' : '') +
      '<div><span>Envío</span><span>' + (t.ship ? clp(t.ship) : 'Gratis') + '</span></div>' +
      '<div class="total"><span>Total</span><span>' + clp(t.total) + '</span></div></div>';
  }
  function showStep(snapshot) {
    $$('.co-step').forEach(function (s) { s.hidden = +s.dataset.step !== coStep; });
    $$('#steps li').forEach(function (li, i) { li.classList.toggle('is-active', i === coStep); li.classList.toggle('is-done', i < coStep); if (i === coStep) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    $('#coBack').style.visibility = coStep === 0 ? 'hidden' : 'visible';
    $('#coNav').hidden = coStep === 3;
    $('.co-layout').classList.toggle('is-done', coStep === 3);
    if (coStep === 3) $('#checkoutModal').scrollTop = 0;
    $('#coNext').textContent = coStep === 2 ? 'Pagar ' + clp(totals(shipMethod()).total) : 'Continuar';
    $('#cardFields').hidden = ($('input[name="pay"]:checked') || {}).value !== 'card';
    renderSummary(snapshot);
  }
  function validateStep() {
    var fs = $('.co-step[data-step="' + coStep + '"]'), ok = true, firstBad = null;
    $$('input,select', fs).forEach(function (el) {
      if (el.type === 'radio') return;
      if (el.closest('[hidden]') && el.closest('[hidden]') !== fs) { el.removeAttribute('aria-invalid'); return; }
      var valid = el.checkValidity();
      if (valid && el.id === 'fCard') valid = /^\d{15,16}$/.test(el.value.replace(/\s/g, ''));
      if (valid && el.id === 'fExp') valid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(el.value);
      if (valid && el.id === 'fCvv') valid = /^\d{3,4}$/.test(el.value);
      if (el.id === 'fName' || el.id === 'fAddr' || el.id === 'fComuna') valid = valid && el.value.trim().length > 1;
      if (!valid) { ok = false; el.setAttribute('aria-invalid', 'true'); firstBad = firstBad || el; }
      else el.removeAttribute('aria-invalid');
    });
    $('#coError').textContent = ok ? '' : 'Revisa los campos marcados para continuar.';
    if (firstBad) firstBad.focus();
    return ok;
  }
  function placeOrder() {
    var t = totals(shipMethod());
    var snap = { t: t, lines: state.cart.map(function (l) { return Object.assign({}, l); }) };
    var d = new Date();
    var no = 'RZ-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000);
    $('#orderNo').textContent = no;
    var name = $('#fName').value.trim().split(' ')[0];
    var m = shipMethod();
    $('#orderMsg').textContent = name + ', enviamos la confirmación a ' + $('#fEmail').value.trim() + '. ' +
      (m === 'pick' ? 'Te avisaremos cuando esté lista para retiro.' : m === 'exp' ? 'Llega en 24 a 48 horas.' : 'Llega en 3 a 5 días hábiles.');
    state.cart = []; state.coupon = null; saveCart(); renderCart(); updateBadges();
    coStep = 3; showStep(snap);
    toast('✓ Pedido <b>' + no + '</b> confirmado');
  }

  // ---------- eventos ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-open]'); if (!t) return;
    if (t.dataset.open) { e.preventDefault(); if (openDrawerEl) closeDrawer(true); openProduct(t.dataset.open); return; }
    if (t.dataset.wish) { toggleWish(t.dataset.wish); return; }
    if (t.dataset.cat) { state.cat = t.dataset.cat; renderAll(); return; }
    if (t.dataset.qty) { setQty(t.dataset.key, +t.dataset.qty); return; }
    if (t.dataset.remove) { removeLine(t.dataset.remove); return; }
    if (t.dataset.pmqty) { pmState.qty = Math.max(1, Math.min(10, pmState.qty + +t.dataset.pmqty)); updatePmAdd(); return; }
    if (t.hasAttribute('data-close-drawer')) { closeDrawer(); return; }
    if (t.hasAttribute('data-close-modal')) { var dl = t.closest('dialog'); if (dl) dl.close(); return; }
    switch (t.id) {
      case 'cartBtn': renderCart(); openDrawer('#cartDrawer'); break;
      case 'wishBtn': renderWish(); openDrawer('#wishDrawer'); break;
      case 'pmAdd':
        if (!pmState.size) { toast('Elige una talla antes de agregar', 'warn'); var sz = $('input[name="pmSize"]'); if (sz) sz.focus(); return; }
        var p = byId(pmState.id);
        addToCart(pmState.id, pmState.size, pmState.color, pmState.qty);
        $('#productModal').close();
        toast('🛍️ <b>' + esc(p.name) + '</b> (' + pmState.size + ', ' + pmState.color + ') agregado al carrito');
        break;
      case 'rmCoupon': state.coupon = null; saveCart(); renderCart(); toast('Cupón eliminado'); break;
      case 'goCheckout': openCheckout(); break;
      case 'coBack': if (coStep > 0) { coStep--; $('#coError').textContent = ''; showStep(); } break;
      case 'resetFilters':
        state.cat = 'todos'; state.q = ''; state.max = 70000; state.sale = false; state.onlyWish = false; state.sort = 'rel';
        $('#search').value = ''; $('#priceRange').value = 70000; $('#onlySale').checked = false; $('#onlyWish').checked = false; $('#sortSel').value = 'rel';
        renderAll(); break;
    }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'couponForm') {
      e.preventDefault();
      var code = $('#couponIn').value.trim().toUpperCase();
      if (COUPONS[code]) { state.coupon = code; saveCart(); renderCart(); toast('🏷️ Cupón <b>' + code + '</b> aplicado: ' + COUPONS[code].pct + '% de descuento'); }
      else { toast(code ? 'El código <b>' + esc(code) + '</b> no es válido' : 'Ingresa un código', 'warn'); $('#couponIn').focus(); }
    }
    if (e.target.id === 'coForm') {
      e.preventDefault();
      if (!validateStep()) return;
      if (coStep === 2) return placeOrder();
      coStep++; showStep();
      var f = $('.co-step[data-step="' + coStep + '"] input:not([type=radio])'); if (f) f.focus();
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'pmColor') {
      pmState.color = t.value; $('#pmColorName').textContent = t.value;
      $('#pmMedia').style.background = mediaBg(t.dataset.hex);
    }
    if (t.name === 'pmSize') pmState.size = t.value;
    if (t.name === 'ship' || t.name === 'pay') showStep();
    if (t.id === 'onlySale') { state.sale = t.checked; renderGrid(); }
    if (t.id === 'onlyWish') { state.onlyWish = t.checked; renderGrid(); }
    if (t.id === 'sortSel') { state.sort = t.value; renderGrid(); }
  });
  var searchT;
  $('#search').addEventListener('input', function (e) {
    clearTimeout(searchT);
    searchT = setTimeout(function () { state.q = e.target.value; renderGrid(); }, 120);
  });
  $('#search').addEventListener('keydown', function (e) { if (e.key === 'Enter') { var c = $('#catalogo'); c.scrollIntoView({ behavior: 'smooth' }); } });
  $('#priceRange').addEventListener('input', function (e) { state.max = +e.target.value; $('#priceLabel').textContent = clp(state.max); renderGrid(); });
  // formato de tarjeta / vencimiento
  $('#fCard').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
  $('#fExp').addEventListener('input', function (e) { var v = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; });
  $('#fCvv').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('#scrim').addEventListener('click', function () { closeDrawer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openDrawerEl) closeDrawer(); });
  // cerrar dialogs al hacer clic en el fondo
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.addEventListener('close', function () {
      if (d.id === 'productModal' && lastFocus && document.contains(lastFocus)) lastFocus.focus();
      if (d.id === 'checkoutModal' && coStep === 3) { $('#coForm').reset(); coStep = 0; }
    });
  });
  window.addEventListener('storage', function (e) { // sincroniza entre pestañas
    if (e.key === CART_KEY) { state.cart = sanitizeCart(store(CART_KEY)); renderCart(); updateBadges(); }
  });

  // ---------- inicio ----------
  $('#priceRange').value = state.max;
  renderAll(); renderCart(); renderWish(); updateBadges();
})();
