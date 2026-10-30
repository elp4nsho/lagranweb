(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav: sombra al hacer scroll + menú móvil ---------- */
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');

  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 760) setMenu(false); });

  /* Resaltar sección actual en el menú */
  var links = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]:not(.btn)'));
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) { var s = document.querySelector(l.getAttribute('href')); if (s) secObs.observe(s); });
  }

  /* ---------- Titular rotativo ---------- */
  var rot = document.querySelector('.rotator em');
  if (rot && !reduce) {
    var words = JSON.parse(rot.getAttribute('data-words'));
    var i = 0;
    setInterval(function () {
      rot.classList.add('out');
      setTimeout(function () {
        i = (i + 1) % words.length;
        rot.textContent = words[i];
        rot.classList.remove('out');
      }, 350);
    }, 2600);
  }

  /* ---------- Contadores ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduce) { el.textContent = target; return; }
    var start = null, dur = 1600;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.hasAttribute('data-count')) animateCount(el);
        else el.classList.add('is-visible');
        obs.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, idx) {
      // pequeño escalonado entre hermanos
      var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sibs, 4) * 80 + 'ms';
      obs.observe(el);
    });
    counters.forEach(function (el) { obs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* ---------- Filtro de portafolio ---------- */
  var chips = document.querySelectorAll('.chip');
  var cards = document.querySelectorAll('.card');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      cards.forEach(function (card) {
        var show = f === 'all' || card.getAttribute('data-cat') === f;
        card.classList.remove('is-entering');
        card.classList.toggle('is-hidden', !show);
        if (show) { void card.offsetWidth; card.classList.add('is-entering'); }
      });
    });
  });

  /* ---------- Carrusel de testimonios ---------- */
  var carousel = document.querySelector('.carousel');
  var slides = carousel.querySelectorAll('.quote');
  var dotsBox = carousel.querySelector('.dots');
  var current = 0, timer = null;
  slides.forEach(function (s, idx) {
    var d = document.createElement('button');
    d.className = 'dot';
    d.type = 'button';
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', 'Testimonio ' + (idx + 1));
    d.addEventListener('click', function () { go(idx); restart(); });
    dotsBox.appendChild(d);
  });
  var dots = dotsBox.querySelectorAll('.dot');
  function go(n) {
    current = (n + slides.length) % slides.length;
    slides.forEach(function (s, idx) {
      var on = idx === current;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', String(!on));
    });
    dots.forEach(function (d, idx) {
      d.setAttribute('aria-selected', String(idx === current));
      d.tabIndex = idx === current ? 0 : -1;
    });
  }
  function restart() {
    clearInterval(timer);
    if (!reduce) timer = setInterval(function () { go(current + 1); }, 6000);
  }
  carousel.querySelectorAll('.round').forEach(function (b) {
    b.addEventListener('click', function () { go(current + parseInt(b.getAttribute('data-dir'), 10)); restart(); });
  });
  dotsBox.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      go(current + (e.key === 'ArrowRight' ? 1 : -1)); dots[current].focus(); restart();
    }
  });
  carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
  carousel.addEventListener('mouseleave', restart);
  carousel.addEventListener('focusin', function () { clearInterval(timer); });
  // swipe táctil
  var x0 = null;
  carousel.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart(); }
    x0 = null;
  });
  go(0); restart();

  /* ---------- Formulario de contacto ---------- */
  var form = document.getElementById('contact-form');
  var success = document.getElementById('success');
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Escribe tu nombre (mínimo 2 caracteres).'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Ingresa un correo válido, por ejemplo nombre@dominio.cl.'; },
    type: function (v) { return v ? '' : 'Elige el tipo de proyecto.'; },
    message: function (v) { return v.trim().length >= 20 ? '' : 'Cuéntanos un poco más (mínimo 20 caracteres).'; }
  };
  var errIds = { name: 'e-name', email: 'e-email', type: 'e-type', message: 'e-msg' };

  function validateField(name) {
    var el = form.elements[name];
    var msg = rules[name](el.value);
    var field = el.closest('.field');
    field.classList.toggle('has-error', !!msg);
    el.setAttribute('aria-invalid', String(!!msg));
    document.getElementById(errIds[name]).textContent = msg;
    return !msg;
  }
  function validateOk() {
    var ok = form.elements.ok.checked;
    form.elements.ok.setAttribute('aria-invalid', String(!ok));
    document.getElementById('e-ok').textContent = ok ? '' : 'Necesitamos tu autorización para responderte.';
    return ok;
  }
  Object.keys(rules).forEach(function (n) {
    var el = form.elements[n];
    el.addEventListener('blur', function () { if (el.value) validateField(n); });
    el.addEventListener('input', function () { if (el.closest('.field').classList.contains('has-error')) validateField(n); });
  });
  form.elements.ok.addEventListener('change', validateOk);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    Object.keys(rules).forEach(function (n) { if (!validateField(n) && !firstBad) firstBad = form.elements[n]; });
    if (!validateOk() && !firstBad) firstBad = form.elements.ok;
    if (firstBad) { firstBad.focus(); return; }
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    setTimeout(function () {
      document.getElementById('success-name').textContent = form.elements.name.value.trim().split(' ')[0];
      success.hidden = false;
      success.querySelector('button').focus();
      btn.disabled = false;
      btn.innerHTML = 'Enviar mensaje <span aria-hidden="true">→</span>';
    }, 900);
  });
  document.getElementById('reset-form').addEventListener('click', function () {
    form.reset();
    success.hidden = true;
    form.elements.name.focus();
  });
})();
