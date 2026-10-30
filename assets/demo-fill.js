// Relleno de formularios con datos ficticios para recorrer las demos sin escribir.
// Lo carga portfolio-bar.js. Agrega "⚡ Rellenar" a la barra flotante y, si el autorrelleno
// está activo, completa solo los campos vacíos de cada formulario o modal que aparece.
(function () {
  var appId = document.documentElement.getAttribute('data-app');
  if (appId === 'portal' || appId === 'biblioteca') return;

  var KEY_AUTO = 'lgw:autofill', KEY_TIP = 'lgw:autofill-tip';
  function getLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setLS(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var auto = getLS(KEY_AUTO) !== 'off';
  var isLogin = /login\.html$/.test(location.pathname);

  // ---------- Datos ficticios ----------
  var NOMBRES = ['Valentina', 'Matías', 'Camila', 'Benjamín', 'Javiera', 'Tomás', 'Antonia', 'Vicente', 'Florencia', 'Martín'];
  var APELLIDOS = ['Rojas', 'Muñoz', 'Soto', 'Contreras', 'Silva', 'Fuentes', 'Araya', 'Morales', 'Pizarro', 'Reyes'];
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var persona = {};
  function nuevaPersona() {
    var n = pick(NOMBRES), a1 = pick(APELLIDOS), a2 = pick(APELLIDOS);
    persona = { nombre: n, apellido: a1 + ' ' + a2, full: n + ' ' + a1 + ' ' + a2,
      email: (n + '.' + a1).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + Math.floor(Math.random() * 90 + 10) + '@demo.cl' };
  }
  nuevaPersona();
  function rut() {
    var n = Math.floor(10000000 + Math.random() * 15000000), s = 0, m = 2, t = n;
    while (t > 0) { s += (t % 10) * m; t = Math.floor(t / 10); m = m === 7 ? 2 : m + 1; }
    var dv = 11 - (s % 11), d = dv === 11 ? '0' : dv === 10 ? 'K' : String(dv);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + d;
  }
  function isoDate(days) { var d = new Date(Date.now() + days * 864e5); return d.toISOString().slice(0, 10); }
  function codeFromToasts() {
    var t = document.querySelector('.toasts, .toast, [role=status]');
    var m = t && t.textContent.match(/\b\d{4,8}\b/);
    return m ? m[0] : null;
  }

  // Texto que describe un campo: name, id, placeholder, autocomplete, aria-label y su <label>.
  function describe(el) {
    var lab = '';
    if (el.labels && el.labels[0]) lab = el.labels[0].textContent;
    else { var f = el.closest('.field, label, .form-group'); if (f) { var l = f.querySelector('label, .label'); lab = (l || f).textContent; } }
    return [el.name, el.id, el.placeholder, el.getAttribute('autocomplete'), el.getAttribute('aria-label'), lab].join(' ')
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  var has = function (d, re) { return re.test(d); };

  function valueFor(el) {
    var d = describe(el), type = (el.type || '').toLowerCase();
    if (type === 'email' || has(d, /e-?mail|correo/)) return persona.email;
    if (type === 'password' || has(d, /contrasen|password|clave(?! ?(dinamica|sms))/)) return 'Demo1234!';
    if (type === 'tel' || has(d, /telefono|celular|movil|phone|whatsapp|fono/)) return '+56 9 8' + Math.floor(1000000 + Math.random() * 8999999);
    if (type === 'date') {
      if (has(d, /nacimiento|birth/)) return '1990-05-14';
      var min = el.min ? Math.max(0, Math.ceil((new Date(el.min) - Date.now()) / 864e5)) : 0;
      return isoDate(Math.max(min, has(d, /hasta|salida|fin|check-?out|termino/) ? 5 : 3));
    }
    if (type === 'datetime-local') return isoDate(3) + 'T10:30';
    if (type === 'time') return '10:30';
    if (type === 'month') return has(d, /venc|exp/) ? '2029-12' : isoDate(30).slice(0, 7);
    if (type === 'color') return '#4f46e5';
    if (type === 'url' || has(d, /sitio web|url|linkedin|portafolio/)) return 'https://demo.cl';
    if (has(d, /codigo|otp|2fa|verificacion|token|pin/)) return codeFromToasts() || (has(d, /pin/) ? '1234' : '123456');
    if (has(d, /tarjeta|card|numero de la tarjeta|cc-number/) && !has(d, /nombre|titular|holder/)) return '4242 4242 4242 4242';
    if (has(d, /cvv|cvc|cod.*seguridad|csc/)) return '123';
    if (has(d, /venc|expir|mm\/aa|mm\/yy|cc-exp/)) return '12/29';
    if (has(d, /\brut\b|run\b|rol unico|dni|documento|cedula/)) return rut();
    if (has(d, /patente|placa|matricula/)) return 'KJTR-45';
    if (has(d, /\bvin\b|chasis/)) return '1HGBH41JXMN109186';
    if (has(d, /marca/)) return 'Toyota';
    if (has(d, /modelo/)) return 'Yaris';
    if (type === 'number' || type === 'range') return numberFor(el, d);
    if (has(d, /apellido|last/)) return persona.apellido;
    if (has(d, /titular|holder|nombre en la tarjeta/)) return persona.full.toUpperCase();
    if (has(d, /empresa|razon social|compania|organizacion/)) return 'Comercial Demo SpA';
    if (has(d, /\bgiro\b/)) return 'Servicios informáticos';
    if (has(d, /nombre|name|contacto|responsable|cliente|huesped|paciente/)) return has(d, /^\s*nombre\s*$|first/) ? persona.nombre : persona.full;
    if (has(d, /direccion|address|calle|domicilio/)) return 'Av. Providencia 1234, depto 56';
    if (has(d, /comuna/)) return 'Providencia';
    if (has(d, /ciudad|city/)) return 'Santiago';
    if (has(d, /region/)) return 'Metropolitana';
    if (has(d, /codigo postal|zip/)) return '7500000';
    if (has(d, /cargo|puesto|profesion/)) return 'Jefa de proyectos';
    if (has(d, /asunto|titulo|title|subject/)) return 'Solicitud de prueba';
    if (has(d, /\bkm\b|kilometraje/)) return '45000';
    if (has(d, /\bano\b|year/)) return '2021';
    if (has(d, /renta|sueldo|ingreso|remuneracion/)) return '1800000';
    if (has(d, /monto|precio|valor|amount|presupuesto/)) return '250000';
    if (has(d, /cantidad|qty|personas|huespedes|invitados/)) return '2';
    var ph = (el.placeholder || '').trim();
    var ej = ph.match(/^(?:ej(?:emplo)?\.?:?|p\. ?ej\.?:?|e\.g\.)\s*(.+)$/i);
    if (ej) return ej[1].replace(/[…\.]+$/, '');
    if (el.tagName === 'TEXTAREA') return 'Texto de prueba generado para la demo. Puedes editarlo o enviarlo tal cual.';
    return 'Dato de prueba';
  }
  function numberFor(el, d) {
    var min = el.min !== '' ? Number(el.min) : null, max = el.max !== '' ? Number(el.max) : null, v;
    if (has(d, /renta|sueldo|ingreso|remuneracion/)) v = 1800000;
    else if (has(d, /monto|precio|valor|amount|presupuesto|pie|abono/)) v = 250000;
    else if (has(d, /\bkm\b|kilometraje/)) v = 45000;
    else if (has(d, /\bano\b|year/)) v = 2021;
    else if (has(d, /plazo|cuotas|meses/)) v = 24;
    else if (has(d, /stock|cantidad|qty|unidades/)) v = 10;
    else v = min != null ? min : 1;
    if (min != null && v < min) v = min;
    if (max != null && v > max) v = max;
    return String(v);
  }

  // ---------- Qué campos tocar ----------
  var SKIP = /buscar|search|filtr|\bq\b|ordenar|sort|busqueda/;
  function fillable(el) {
    if (el.disabled || el.readOnly || el.__lgwFilled) return false;
    if (el.closest('.lgw-dock, .lgw-pal, .lgw-tip, header, nav, .admin-topbar, .admin-sidebar, [role=search], .filters, .toolbar')) return false;
    var type = (el.type || '').toLowerCase();
    if (/^(hidden|search|submit|button|reset|file|image)$/.test(type)) return false;
    if (!el.offsetParent && el.type !== 'radio' && el.type !== 'checkbox') return false;
    if (SKIP.test(describe(el))) return false;
    return true;
  }
  // Vacío o solo con un prefijo de teléfono (+56 9).
  function blank(el) { return !el.value.trim() || /^\+?\s*56\s*9?\s*$/.test(el.value); }
  function set(el, v) {
    el.__lgwFilled = true;
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function fillScope(scope, onlyEmpty) {
    var n = 0, radios = {};
    nuevaPersona();
    scope.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!fillable(el)) return;
      var type = (el.type || '').toLowerCase();
      if (type === 'checkbox') {
        if (el.required && !el.checked) { el.checked = true; el.__lgwFilled = true; el.dispatchEvent(new Event('change', { bubbles: true })); n++; }
        return;
      }
      if (type === 'radio') {
        if (radios[el.name]) return;
        radios[el.name] = 1;
        var group = scope.querySelectorAll('input[type=radio][name="' + (window.CSS && CSS.escape ? CSS.escape(el.name) : el.name) + '"]');
        if ([].some.call(group, function (r) { return r.checked; })) return;
        var first = [].find.call(group, function (r) { return !r.disabled; });
        if (first) { first.checked = true; first.__lgwFilled = true; first.dispatchEvent(new Event('change', { bubbles: true })); first.click && first.dispatchEvent(new Event('input', { bubbles: true })); n++; }
        return;
      }
      if (el.tagName === 'SELECT') {
        if (onlyEmpty && (el.value !== '' || !el.required)) return;
        var opt = [].find.call(el.options, function (o) { return o.value !== '' && !o.disabled; });
        if (opt && el.value === '') { set(el, opt.value); n++; }
        return;
      }
      if (onlyEmpty && !blank(el)) return;
      var v = valueFor(el);
      if (el.maxLength > 0 && v.length > el.maxLength) v = v.replace(/\s/g, '').slice(0, el.maxLength);
      set(el, v); n++;
    });
    return n;
  }
  // Ámbito: el modal abierto de más arriba, si no el formulario con foco, si no los formularios visibles.
  function currentScopes() {
    var modals = [].filter.call(document.querySelectorAll('.modal-backdrop, dialog[open], [role=dialog]:not(.lgw-pal), .drawer.open, .sheet.open'), function (m) { return m.offsetParent || m.open; });
    if (modals.length) return [modals[modals.length - 1]];
    var a = document.activeElement && document.activeElement.closest && document.activeElement.closest('form');
    if (a) return [a];
    return [].filter.call(document.querySelectorAll('form'), function (f) { return f.offsetParent; });
  }

  // ---------- UI ----------
  var css = '.lgw-tip{position:fixed;left:16px;bottom:64px;z-index:99998;width:min(360px,calc(100vw - 32px));padding:14px 16px;border-radius:16px;' +
    'background:rgba(14,14,22,.96);color:#fff;font:13px/1.45 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.45);animation:lgwTipIn .35s ease}' +
    '.lgw-tip b{display:block;font-size:14px;margin-bottom:4px}.lgw-tip code{background:rgba(255,255,255,.12);padding:1px 6px;border-radius:6px}' +
    '.lgw-tip .row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.lgw-tip button{border:0;border-radius:999px;padding:7px 14px;font:600 12px system-ui;cursor:pointer}' +
    '.lgw-tip .ok{background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#fff}.lgw-tip .off{background:rgba(255,255,255,.12);color:#fff}' +
    '.lgw-dock button.lgw-fill.on i{background:linear-gradient(135deg,#ffb000,#ff5c8a)}' +
    '@media (max-width:420px){.lgw-dock .lgw-fill span{display:none}.lgw-dock .lgw-fill{padding-right:8px}}' +
    '@keyframes lgwTipIn{from{opacity:0;transform:translateY(10px)}}@media print{.lgw-tip{display:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'lgw-tip'; t.style.bottom = '64px'; t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  function mountButton() {
    var dock = document.querySelector('.lgw-dock');
    if (!dock) return setTimeout(mountButton, 100);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'lgw-fill' + (auto ? ' on' : '');
    b.title = 'Rellenar el formulario visible con datos ficticios (clic derecho: activar/desactivar autorrelleno)';
    b.innerHTML = '<i>⚡</i><span>Rellenar</span>';
    dock.appendChild(b);
    b.addEventListener('click', function () {
      var n = 0;
      currentScopes().forEach(function (s) { s.querySelectorAll('*').forEach(function (el) { el.__lgwFilled = false; }); n += fillScope(s, false); });
      toast(n ? '<b>⚡ ' + n + ' campo' + (n === 1 ? '' : 's') + ' rellenado' + (n === 1 ? '' : 's') + '</b>Datos ficticios listos, ya puedes continuar.' : '<b>No hay formulario visible</b>Abre un formulario y vuelve a pulsar ⚡.');
    });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleAuto(); });
  }
  function toggleAuto() {
    auto = !auto; setLS(KEY_AUTO, auto ? 'on' : 'off');
    var b = document.querySelector('.lgw-fill'); b && b.classList.toggle('on', auto);
    toast(auto ? '<b>Autorrelleno activado</b>Los formularios nuevos aparecerán con datos ficticios.' : '<b>Autorrelleno desactivado</b>Usa ⚡ Rellenar cuando lo necesites.');
  }

  function showTip() {
    if (getLS(KEY_TIP)) return;
    var t = document.createElement('div');
    t.className = 'lgw-tip'; t.setAttribute('role', 'note');
    t.innerHTML = '<b>Demo con datos ficticios ⚡</b>' +
      'Nada es real: no ingreses datos verdaderos. Los formularios ' + (auto ? 'se rellenan solos' : 'se rellenan con <b style="display:inline">⚡ Rellenar</b>') +
      ' para que avances rápido. Tarjeta de prueba: <code>4242 4242 4242 4242</code>, venc. <code>12/29</code>, CVV <code>123</code>.' +
      '<div class="row"><button class="ok" type="button">Entendido</button><button class="off" type="button">' + (auto ? 'Prefiero rellenar yo' : 'Activar autorrelleno') + '</button></div>';
    document.body.appendChild(t);
    t.querySelector('.ok').onclick = function () { setLS(KEY_TIP, '1'); t.remove(); };
    t.querySelector('.off').onclick = function () { setLS(KEY_TIP, '1'); t.remove(); toggleAuto(); };
  }

  // Autorrelleno: cuando aparece un formulario o modal, completa sus campos vacíos una sola vez.
  var timer;
  function autoFill() {
    if (!auto || isLogin) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      document.querySelectorAll('.modal-backdrop, dialog[open], form').forEach(function (s) {
        if (!(s.offsetParent || s.open)) return;
        // Solo formularios de verdad: un chat o un comentario (1–2 campos) no se toca.
        var fields = [].filter.call(s.querySelectorAll('input, textarea'), function (el) {
          return fillable(el) && !/checkbox|radio/.test(el.type);
        });
        if (fields.length >= 3 && fields.some(blank)) fillScope(s, true);
      });
    }, 350);
  }

  function start() {
    mountButton();
    setTimeout(showTip, 900);
    autoFill();
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { autoFill(); break; }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', autoFill);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.LGWFill = { fill: function () { currentScopes().forEach(function (s) { fillScope(s, false); }); }, toggle: toggleAuto };
})();
