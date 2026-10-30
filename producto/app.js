(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fmt = function (n) { return '$' + n.toLocaleString('es-CL'); };

  /* ---------- Datos ---------- */
  var COLORS = {
    glaciar: { name: 'Glaciar', base: '#00b3c7', light: '#6fe3ef', dark: '#00707e' },
    coral:   { name: 'Coral',   base: '#ff6f61', light: '#ffb0a6', dark: '#b8392e' },
    salvia:  { name: 'Salvia',  base: '#7f9c80', light: '#b9d1b6', dark: '#4b634c' },
    arena:   { name: 'Arena',   base: '#d9b98c', light: '#f3e2c6', dark: '#9c7b4f' },
    noche:   { name: 'Noche',   base: '#2a3247', light: '#56627e', dark: '#141a29' }
  };
  var PACKS = {
    1: { price: 39990, list: 54990, label: '1 unidad' },
    2: { price: 69990, list: 109980, label: '2 unidades', gift: 'Funda de neopreno' },
    3: { price: 89990, list: 164970, label: '3 unidades', gift: '3 fundas de neopreno' }
  };
  var state = { color: 'glaciar', qty: 2, ship: 0, order: null };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Nav ---------- */
  var nav = $('.nav');
  var buybar = $('#buybar');
  var hero = $('#hero');
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
    var show = hero.getBoundingClientRect().bottom < 0 && !$('#checkout').open;
    buybar.classList.toggle('is-on', show);
    buybar.setAttribute('aria-hidden', String(!show));
    buybar.querySelector('button').tabIndex = show ? 0 : -1;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------- Color ---------- */
  function setColor(key, announce) {
    var c = COLORS[key];
    if (!c) return;
    state.color = key;
    root.style.setProperty('--bottle', c.base);
    root.style.setProperty('--bottle-light', c.light);
    root.style.setProperty('--bottle-dark', c.dark);
    $('#color-name').textContent = c.name;
    $$('[data-color-label]').forEach(function (el) { el.textContent = c.name; });
    $$('input[name="color"]').forEach(function (i) { i.checked = i.value === key; });
    $$('.mini-swatches button').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-color') === key)); b.tabIndex = b.getAttribute('data-color') === key ? 0 : -1; });
    store('aquilo-color', key);
    if (announce) toast('Color ' + c.name + ' seleccionado');
    renderSummaries();
  }
  $$('input[name="color"]').forEach(function (i) {
    i.addEventListener('change', function () { setColor(i.value, true); });
  });
  var miniBox = $('.mini-swatches');
  miniBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (b) setColor(b.getAttribute('data-color'));
  });
  miniBox.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
    e.preventDefault();
    var keys = Object.keys(COLORS);
    var idx = keys.indexOf(state.color) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    setColor(keys[(idx + keys.length) % keys.length]);
    miniBox.querySelector('[aria-checked="true"]').focus();
  });

  /* ---------- Scroll reveal ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(function (el) {
      var i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
      obs.observe(el);
    });
  } else reveals.forEach(function (el) { el.classList.add('is-visible'); });

  /* ---------- Cuenta regresiva (persistente por visitante) ---------- */
  var end = parseInt(store('aquilo-offer-end'), 10);
  if (!end || end < Date.now()) {
    end = Date.now() + (3 * 3600 + 17 * 60 + 42) * 1000;
    store('aquilo-offer-end', String(end));
  }
  var cdH = $('[data-cd="h"]'), cdM = $('[data-cd="m"]'), cdS = $('[data-cd="s"]'), cdInline = $('[data-countdown-inline]');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var left = Math.max(0, end - Date.now());
    if (left === 0) { end = Date.now() + 3 * 3600 * 1000; store('aquilo-offer-end', String(end)); }
    var s = Math.floor(left / 1000);
    var h = pad(Math.floor(s / 3600)), m = pad(Math.floor(s % 3600 / 60)), sec = pad(s % 60);
    cdH.textContent = h; cdM.textContent = m; cdS.textContent = sec;
    cdInline.textContent = h + ':' + m + ':' + sec;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- FAQ: solo uno abierto a la vez ---------- */
  var faqs = $$('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Checkout ---------- */
  var dlg = $('#checkout');
  var steps = $$('.co__steps li');
  var panels = $$('.co__panel');
  var current = 1;
  var lastFocus = null;

  function totals() {
    var p = PACKS[state.qty];
    return { pack: p, sub: p.price, save: p.list - p.price, ship: state.ship, total: p.price + state.ship };
  }
  function renderSummaries() {
    var t = totals();
    var html =
      '<div><span>Aquilo Pulse · ' + COLORS[state.color].name + ' × ' + state.qty + '</span><span>' + fmt(t.pack.list) + '</span></div>' +
      '<div class="save"><span>Descuento de lanzamiento</span><span>−' + fmt(t.save) + '</span></div>' +
      (t.pack.gift ? '<div class="save"><span>🎁 ' + t.pack.gift + '</span><span>Gratis</span></div>' : '') +
      '<div><span>Envío</span><span>' + (t.ship ? fmt(t.ship) : 'Gratis') + '</span></div>' +
      '<div class="total"><span>Total</span><span>' + fmt(t.total) + '</span></div>';
    $$('[data-summary]').forEach(function (el) { el.innerHTML = html; });
    var pay = $('[data-pay]');
    if (pay && !pay.disabled) pay.textContent = 'Pagar ' + fmt(t.total);
  }

  function goStep(n) {
    current = n;
    panels.forEach(function (p) { p.classList.toggle('is-active', +p.getAttribute('data-step') === n); });
    steps.forEach(function (s, i) {
      s.classList.toggle('is-active', i + 1 === n);
      s.classList.toggle('is-done', i + 1 < n);
      if (i + 1 === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
    renderSummaries();
    var panel = $('.co__panel[data-step="' + n + '"]');
    var focusable = panel.querySelector('input:not([type="radio"]), select, button.btn');
    if (n === 1) focusable = panel.querySelector('input[name="qty"]:checked');
    if (n === 4) focusable = panel.querySelector('h3');
    if (focusable) { if (n === 4) focusable.tabIndex = -1; focusable.focus({ preventScroll: true }); }
    dlg.scrollTop = 0;
  }

  function openCheckout(qty) {
    if (qty) state.qty = +qty;
    $$('input[name="qty"]').forEach(function (i) { i.checked = +i.value === state.qty; });
    lastFocus = document.activeElement;
    if (current === 4) resetCheckout();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    goStep(current);
    onScroll();
  }
  function closeCheckout() {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  }
  dlg.addEventListener('close', function () {
    document.body.style.overflow = '';
    if (current === 4) resetCheckout();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    onScroll();
  });
  function resetCheckout() {
    $$('form', dlg).forEach(function (f) { f.reset(); $$('.f', f).forEach(function (x) { x.classList.remove('bad'); $('.err', x).textContent = ''; }); });
    state.ship = 0;
    updateCard();
    current = 1;
  }

  $$('[data-buy]').forEach(function (b) {
    b.addEventListener('click', function () { openCheckout(b.getAttribute('data-buy')); });
  });
  $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', closeCheckout); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeCheckout(); });
  $$('[data-back]', dlg).forEach(function (b) { b.addEventListener('click', function () { goStep(current - 1); }); });
  $('[data-next]', dlg).addEventListener('click', function () { goStep(2); });
  $$('input[name="qty"]').forEach(function (i) { i.addEventListener('change', function () { state.qty = +i.value; renderSummaries(); }); });
  $$('input[name="ship"]').forEach(function (i) { i.addEventListener('change', function () { state.ship = +i.value; renderSummaries(); }); });

  /* Validación genérica */
  function setErr(input, msg) {
    var f = input.closest('.f');
    f.classList.toggle('bad', !!msg);
    input.setAttribute('aria-invalid', String(!!msg));
    var err = $('.err', f);
    if (!err.id) err.id = input.id + '-err';
    input.setAttribute('aria-describedby', err.id);
    err.textContent = msg || '';
    return !msg;
  }
  function validateForm(form, rules) {
    var first = null;
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      var ok = setErr(el, rules[name](el.value.trim()));
      if (!ok && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }
  function liveValidate(form, rules) {
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      el.addEventListener('blur', function () { if (el.value) setErr(el, rules[name](el.value.trim())); });
      el.addEventListener('input', function () { if (el.closest('.f').classList.contains('bad')) setErr(el, rules[name](el.value.trim())); });
    });
  }

  var shipForm = $('form[data-step="2"]');
  var shipRules = {
    name: function (v) { return v.split(/\s+/).length >= 2 && v.length >= 5 ? '' : 'Ingresa nombre y apellido.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Correo no válido.'; },
    phone: function (v) { return v.replace(/\D/g, '').length >= 8 ? '' : 'Teléfono no válido (mínimo 8 dígitos).'; },
    region: function (v) { return v ? '' : 'Selecciona tu región.'; },
    address: function (v) { return v.length >= 5 && /\d/.test(v) ? '' : 'Incluye calle y número.'; },
    city: function (v) { return v.length >= 2 ? '' : 'Ingresa tu comuna.'; }
  };
  liveValidate(shipForm, shipRules);
  shipForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (validateForm(shipForm, shipRules)) goStep(3);
  });

  /* Pago (simulado) */
  var payForm = $('form[data-step="3"]');
  function luhn(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var n = +num[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  var payRules = {
    num: function (v) { var d = v.replace(/\D/g, ''); return d.length >= 15 && luhn(d) ? '' : 'Número de tarjeta no válido.'; },
    cname: function (v) { return v.length >= 3 ? '' : 'Escribe el nombre como aparece en la tarjeta.'; },
    exp: function (v) {
      var m = /^(\d{2})\/(\d{2})$/.exec(v);
      if (!m || +m[1] < 1 || +m[1] > 12) return 'Usa el formato MM/AA.';
      var now = new Date(), y = 2000 + +m[2];
      if (y < now.getFullYear() || (y === now.getFullYear() && +m[1] < now.getMonth() + 1)) return 'La tarjeta está vencida.';
      return '';
    },
    cvc: function (v) { return /^\d{3,4}$/.test(v) ? '' : 'CVC de 3 o 4 dígitos.'; }
  };
  liveValidate(payForm, payRules);
  var numIn = payForm.elements.num, expIn = payForm.elements.exp, cvcIn = payForm.elements.cvc, cnameIn = payForm.elements.cname;
  numIn.addEventListener('input', function () {
    numIn.value = numIn.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    updateCard();
  });
  expIn.addEventListener('input', function (e) {
    var d = expIn.value.replace(/\D/g, '').slice(0, 4);
    expIn.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : (d.length === 2 && e.inputType !== 'deleteContentBackward' ? d + '/' : d);
    updateCard();
  });
  cvcIn.addEventListener('input', function () { cvcIn.value = cvcIn.value.replace(/\D/g, '').slice(0, 4); });
  cnameIn.addEventListener('input', updateCard);
  function updateCard() {
    var d = numIn.value.replace(/\D/g, '');
    var masked = (d + '################').slice(0, 16).replace(/#/g, '•').replace(/(.{4})(?=.)/g, '$1 ');
    $('[data-cp="num"]').textContent = masked;
    $('[data-cp="name"]').textContent = cnameIn.value.trim() || 'NOMBRE APELLIDO';
    $('[data-cp="exp"]').textContent = expIn.value || 'MM/AA';
  }

  payForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm(payForm, payRules)) return;
    var btn = $('[data-pay]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Procesando pago…';
    setTimeout(function () {
      btn.disabled = false;
      state.order = 'AQ-' + Math.floor(100000 + Math.random() * 900000);
      $('[data-order]').textContent = '#' + state.order;
      $('[data-done-name]').textContent = shipForm.elements.name.value.trim().split(/\s+/)[0];
      $('[data-done-email]').textContent = shipForm.elements.email.value.trim();
      goStep(4);
    }, 1600);
  });

  /* ---------- Init ---------- */
  var saved = store('aquilo-color');
  setColor(COLORS[saved] ? saved : 'glaciar');
})();
