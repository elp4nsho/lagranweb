(function () {
  'use strict';
  var D = window.FOGON;
  var KEY = 'fogon_state_v1';
  var PREP_AT = 6000, READY_AT = 22000; // simulación de cocina (ms)

  var T = {
    es: {
      skip: 'Saltar a la carta', reviews: '1.240 reseñas', callWaiter: 'Llamar al garzón', waiterComing: 'Garzón en camino…',
      filter: 'Filtrar:', viewOrder: 'Ver pedido', yourOrder: 'Tu pedido', orderStatus: 'Estado del pedido', chooseTable: '¿En qué mesa estás?',
      legal: 'Precios en pesos chilenos, IVA incluido. Propina sugerida no incluida. Fogón Andino es un restaurante ficticio creado como demo.',
      table: 'Mesa', popular: 'Favorito de la casa', required: 'Obligatorio', optional: 'Opcional', chooseOne: 'Elige 1',
      notes: 'Notas para la cocina', notesPh: 'Ej: sin cebolla, salsa aparte…', add: 'Agregar', update: 'Actualizar',
      added: 'agregado al pedido', chooseReq: 'Elige una opción en', emptyOrder: 'Aún no agregas platos.', browse: 'Ver la carta',
      orderNotes: 'Comentarios generales', orderNotesPh: 'Ej: somos 4, traer los platos al mismo tiempo', subtotal: 'Subtotal', tip: 'Propina sugerida', noTip: 'Sin propina',
      total: 'Total', send: 'Enviar pedido a cocina', edit: 'Editar', remove: 'Quitar', items: 'productos', item: 'producto',
      st0: 'Pedido recibido', st0d: 'La cocina recibió tu pedido', st1: 'En preparación', st1d: 'Nuestro equipo está cocinando a fuego lento', st2: '¡Listo!', st2d: 'Va camino a tu mesa',
      orderNo: 'Pedido', sentToast: 'Pedido enviado a cocina 🔥', readyToast: '¡Tu pedido está listo! Va camino a la mesa', newOrder: 'Seguir pidiendo', close: 'Cerrar',
      waiterToast: 'Avisamos al garzón. Va camino a la mesa', waiterWait: 'El garzón ya fue avisado, llegará en un momento',
      openNow: 'Abierto ahora', closesAt: 'cierra a las', closesSoon: 'Cierra pronto', closedNow: 'Cerrado', opensToday: 'abre hoy a las', opensTomorrow: 'abre mañana a las', opensOn: 'abre el', at: 'a las',
      days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], noResults: 'No hay platos que cumplan con todos los filtros.', clear: 'Limpiar filtros',
      dishes: 'platos', tableSet: 'Mesa seleccionada:', each: 'c/u', minutes: 'Tiempo estimado: 15–20 min', removed: 'eliminado del pedido', sentAtTable: 'para la mesa'
    },
    en: {
      skip: 'Skip to menu', reviews: '1,240 reviews', callWaiter: 'Call the waiter', waiterComing: 'Waiter on the way…',
      filter: 'Filter:', viewOrder: 'View order', yourOrder: 'Your order', orderStatus: 'Order status', chooseTable: 'Which table are you at?',
      legal: 'Prices in Chilean pesos, VAT included. Suggested tip not included. Fogón Andino is a fictional restaurant made as a demo.',
      table: 'Table', popular: 'House favourite', required: 'Required', optional: 'Optional', chooseOne: 'Pick 1',
      notes: 'Notes for the kitchen', notesPh: 'E.g. no onion, sauce on the side…', add: 'Add', update: 'Update',
      added: 'added to your order', chooseReq: 'Please choose an option in', emptyOrder: 'You haven\'t added any dishes yet.', browse: 'Browse the menu',
      orderNotes: 'General comments', orderNotesPh: 'E.g. we are 4, bring all dishes together', subtotal: 'Subtotal', tip: 'Suggested tip', noTip: 'No tip',
      total: 'Total', send: 'Send order to kitchen', edit: 'Edit', remove: 'Remove', items: 'items', item: 'item',
      st0: 'Order received', st0d: 'The kitchen has your order', st1: 'Being prepared', st1d: 'Our team is cooking over the fire', st2: 'Ready!', st2d: 'On its way to your table',
      orderNo: 'Order', sentToast: 'Order sent to the kitchen 🔥', readyToast: 'Your order is ready! On its way to your table', newOrder: 'Keep ordering', close: 'Close',
      waiterToast: 'We notified the waiter. On the way to table', waiterWait: 'The waiter has been notified and will be with you shortly',
      openNow: 'Open now', closesAt: 'closes at', closesSoon: 'Closing soon', closedNow: 'Closed', opensToday: 'opens today at', opensTomorrow: 'opens tomorrow at', opensOn: 'opens on', at: 'at',
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], noResults: 'No dishes match all the selected filters.', clear: 'Clear filters',
      dishes: 'dishes', tableSet: 'Table selected:', each: 'each', minutes: 'Estimated time: 15–20 min', removed: 'removed from your order', sentAtTable: 'for table'
    }
  };

  // ---------- utilidades ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clp = function (n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dish = function (id) { for (var i = 0; i < D.dishes.length; i++) if (D.dishes[i].id === id) return D.dishes[i]; return null; };
  var t = function (k) { return T[state.lang][k]; };
  var L = function (o) { return o[state.lang] || o.es; };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ lang: state.lang, table: state.table, cart: state.cart, order: state.order, tip: state.tip, notes: state.notes })); } catch (e) {}
  }

  // ---------- estado ----------
  var saved = load();
  var urlTable = parseInt(new URLSearchParams(location.search).get('mesa'), 10);
  var state = {
    lang: saved.lang === 'en' ? 'en' : 'es',
    table: urlTable >= 1 && urlTable <= 40 ? urlTable : (saved.table || 12),
    cart: Array.isArray(saved.cart) ? saved.cart.filter(function (l) { return l && dish(l.id) && l.qty > 0; }) : [],
    order: saved.order && saved.order.no ? saved.order : null,
    tip: typeof saved.tip === 'number' ? saved.tip : 10,
    notes: saved.notes || '',
    filters: []
  };

  function unitPrice(line) {
    var d = dish(line.id), p = d.price;
    Object.keys(line.sel || {}).forEach(function (g) {
      var grp = D.mods[g]; if (!grp) return;
      line.sel[g].forEach(function (i) { if (grp.options[i]) p += grp.options[i].price; });
    });
    return p;
  }
  function selText(line) {
    var out = [];
    (dish(line.id).mods || []).forEach(function (g) {
      var grp = D.mods[g];
      (line.sel[g] || []).forEach(function (i) { out.push(L(grp.options[i])); });
    });
    return out.join(' · ');
  }
  function totals() {
    var sub = state.cart.reduce(function (s, l) { return s + unitPrice(l) * l.qty; }, 0);
    var tip = Math.round(sub * state.tip / 100);
    return { sub: sub, tip: tip, total: sub + tip, count: state.cart.reduce(function (s, l) { return s + l.qty; }, 0) };
  }

  // ---------- toasts ----------
  function toast(msg) {
    var box = $('#toasts'), el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg; box.appendChild(el);
    if (typeof box.showPopover === 'function') { try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch (e) {} }
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, 2800);
  }

  // ---------- horario ----------
  function nowParts() {
    try {
      var f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      var parts = {}; f.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
      if (day >= 0) return { day: day, min: (+parts.hour % 24) * 60 + (+parts.minute) };
    } catch (e) {}
    var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
  }
  var hhmm = function (m) { m = m % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function renderStatus() {
    var n = nowParts(), H = D.info.hours, el = $('#status'), closeAt = null;
    (H[n.day] || []).forEach(function (r) { if (n.min >= r[0] && n.min < r[1]) closeAt = r[1]; });
    var prev = (n.day + 6) % 7;
    (H[prev] || []).forEach(function (r) { if (r[1] > 1440 && n.min + 1440 < r[1]) closeAt = r[1] - 1440; });
    if (closeAt !== null) {
      var soon = closeAt - n.min <= 45;
      el.className = 'status is-open';
      el.innerHTML = '<i aria-hidden="true"></i><span><b>' + (soon ? t('closesSoon') : t('openNow')) + '</b> · ' + t('closesAt') + ' ' + hhmm(closeAt) + '</span>';
      return;
    }
    var msg = '';
    for (var k = 0; k < 8 && !msg; k++) {
      var d = (n.day + k) % 7;
      var ranges = (H[d] || []).filter(function (r) { return k > 0 || r[0] > n.min; });
      if (ranges.length) msg = (k === 0 ? t('opensToday') : k === 1 ? t('opensTomorrow') : t('opensOn') + ' ' + t('days')[d] + ' ' + t('at')) + ' ' + hhmm(ranges[0][0]);
    }
    el.className = 'status is-closed';
    el.innerHTML = '<i aria-hidden="true"></i><span><b>' + t('closedNow') + '</b> · ' + msg + '</span>';
  }

  // ---------- carta ----------
  function tagsHtml(tags) {
    return '<span class="tags">' + tags.map(function (k) { var g = D.tags[k]; return '<span class="tagi tagi--' + k + '"><span aria-hidden="true">' + g.icon + '</span> ' + L(g) + '</span>'; }).join('') + '</span>';
  }
  function plate(d, extra) {
    return '<span class="plate" style="background:radial-gradient(circle at 35% 30%,' + d.bg + ',' + shade(d.bg, -.35) + ')" aria-hidden="true"><span>' + d.emoji + '</span>' + (extra || '') + '</span>';
  }
  function shade(hex, p) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(c * (1 + p)))); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function visible(d) { return state.filters.every(function (f) { return d.tags.indexOf(f) >= 0; }); }
  function qtyInCart(id) { return state.cart.reduce(function (s, l) { return s + (l.id === id ? l.qty : 0); }, 0); }

  function renderTabs() {
    $('#tabsTrack').innerHTML = D.categories.map(function (c) {
      var has = D.dishes.some(function (d) { return d.cat === c.id && visible(d); });
      return has ? '<button type="button" class="tab" data-tab="' + c.id + '"><span aria-hidden="true">' + c.icon + '</span>' + L(c) + '</button>' : '';
    }).join('');
    spy(true);
  }
  function renderFilters() {
    $('#filterChips').innerHTML = Object.keys(D.tags).map(function (k) {
      var g = D.tags[k];
      return '<button type="button" class="fchip" data-filter="' + k + '" aria-pressed="' + (state.filters.indexOf(k) >= 0) + '"><span aria-hidden="true">' + g.icon + '</span> ' + L(g) + '</button>';
    }).join('');
  }
  function renderMenu() {
    var any = false;
    $('#sections').innerHTML = D.categories.map(function (c) {
      var list = D.dishes.filter(function (d) { return d.cat === c.id && visible(d); });
      if (!list.length) return '';
      any = true;
      return '<section class="section" id="sec-' + c.id + '" data-sec="' + c.id + '" aria-labelledby="h-' + c.id + '"><h2 id="h-' + c.id + '">' + L(c) + ' <small>' + list.length + ' ' + t('dishes') + '</small></h2>' +
        list.map(function (d) {
          var q = qtyInCart(d.id), tx = L(d);
          return '<button type="button" class="dish" data-dish="' + d.id + '">' +
            '<span class="dish__body">' + (d.popular ? '<span class="popular">★ ' + t('popular') + '</span>' : '') +
            '<h3>' + esc(tx.n) + '</h3><p>' + esc(tx.d) + '</p>' +
            '<span class="dish__foot"><span class="price">' + clp(d.price) + '</span>' + tagsHtml(d.tags) + '</span></span>' +
            plate(d, q ? '<span class="in-cart">' + q + '</span>' : '') +
            (q ? '<span class="sr-only">(' + q + ' en tu pedido)</span>' : '') + '</button>';
        }).join('') + '</section>';
    }).join('');
    var nr = $('#noResults'); nr.hidden = any;
    nr.innerHTML = any ? '' : esc(t('noResults')) + '<br><br><button type="button" class="btn btn--ghost btn--center" style="display:inline-flex;flex:none" data-clear>' + t('clear') + '</button>';
  }

  // ---------- scroll-spy ----------
  var spyLock = 0;
  function stickyOffset() {
    var h = $('#tabs').offsetHeight, tr = $('#orderTrack');
    if (!tr.hidden) h += tr.offsetHeight;
    return h;
  }
  function setActiveTab(id) {
    $$('.tab').forEach(function (b) {
      var on = b.dataset.tab === id;
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      if (on) { var tr = $('#tabsTrack'); var target = b.offsetLeft - (tr.clientWidth - b.offsetWidth) / 2; tr.scrollTo({ left: Math.max(0, target), behavior: 'smooth' }); }
    });
  }
  function spy(force) {
    if (!force && Date.now() < spyLock) return;
    var secs = $$('.section'), off = stickyOffset() + 24, cur = secs[0] && secs[0].dataset.sec;
    secs.forEach(function (s) { if (s.getBoundingClientRect().top - off <= 0) cur = s.dataset.sec; });
    // al llegar al final de la página, activa la última sección
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && secs.length) cur = secs[secs.length - 1].dataset.sec;
    var active = $('.tab[aria-current="true"]');
    if (!active || active.dataset.tab !== cur) setActiveTab(cur);
  }
  var spyRaf = 0;
  window.addEventListener('scroll', function () { if (!spyRaf) spyRaf = requestAnimationFrame(function () { spyRaf = 0; spy(); }); }, { passive: true });

  // ---------- hoja de plato ----------
  var editing = null; // { id, sel, qty, note, editIndex }
  function openDish(id, editIndex) {
    var d = dish(id), tx = L(d), line = editIndex != null ? state.cart[editIndex] : null;
    var sel = {};
    (d.mods || []).forEach(function (g) {
      var grp = D.mods[g];
      sel[g] = line ? (line.sel[g] || []).slice() : (grp.type === 'single' && grp.required && !grp.noDefault ? [0] : []);
    });
    editing = { id: id, sel: sel, qty: line ? line.qty : 1, note: line ? line.note || '' : '', editIndex: editIndex };
    var f = $('#dishForm');
    f.innerHTML =
      '<div class="ds-hero" style="background:radial-gradient(circle at 50% 60%,' + d.bg + '55,transparent 70%)">' + plate(d) +
      '<button type="button" class="close" data-close aria-label="' + t('close') + '">✕</button></div>' +
      (d.popular ? '<span class="popular">★ ' + t('popular') + '</span>' : '') +
      '<h2 class="ds-title" id="dsTitle">' + esc(tx.n) + '</h2><p class="ds-desc">' + esc(tx.d) + '</p>' + tagsHtml(d.tags) +
      (d.mods || []).map(function (g) {
        var grp = D.mods[g], single = grp.type === 'single';
        return '<fieldset class="mod" data-group="' + g + '"><legend><span>' + L(grp.name) + '</span><small class="' + (grp.required ? 'req' : '') + '">' + (grp.required ? t('required') + ' · ' + t('chooseOne') : t('optional')) + '</small></legend>' +
          grp.options.map(function (o, i) {
            var checked = sel[g].indexOf(i) >= 0;
            return '<label class="mopt"><input type="' + (single ? 'radio' : 'checkbox') + '" name="m-' + g + '" value="' + i + '"' + (checked ? ' checked' : '') + '><span>' + esc(L(o)) + '</span><em>' + (o.price ? '+' + clp(o.price) : '') + '</em></label>';
          }).join('') + '</fieldset>';
      }).join('') +
      '<label class="field-lbl" for="dishNote">' + t('notes') + '</label><textarea id="dishNote" maxlength="140" placeholder="' + esc(t('notesPh')) + '">' + esc(editing.note) + '</textarea>' +
      '<div class="sheet-actions"><div class="stepper" role="group" aria-label="Cantidad"><button type="button" data-dq="-1" aria-label="−1">−</button><output id="dQty" aria-live="polite">' + editing.qty + '</output><button type="button" data-dq="1" aria-label="+1">+</button></div>' +
      '<button type="submit" class="btn" id="dAdd"><span>' + (line ? t('update') : t('add')) + '</span><span id="dTotal"></span></button></div>';
    updateDishTotal();
    var dlg = $('#dishSheet');
    if (!dlg.open) dlg.showModal();
    f.scrollTop = 0; $('.sheet__inner', dlg) && ($('.sheet__inner', dlg).scrollTop = 0);
    $('[data-close]', f).focus();
  }
  function updateDishTotal() {
    var u = unitPrice({ id: editing.id, sel: editing.sel });
    $('#dQty').textContent = editing.qty;
    $('#dTotal').textContent = clp(u * editing.qty);
  }
  function commitDish() {
    var d = dish(editing.id);
    for (var i = 0; i < (d.mods || []).length; i++) {
      var g = d.mods[i], grp = D.mods[g];
      if (grp.required && !editing.sel[g].length) {
        var fs = $('[data-group="' + g + '"]'), badge = $('small', fs);
        badge.classList.add('bad'); fs.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('input', fs).focus({ preventScroll: true });
        toast(t('chooseReq') + ' "' + L(grp.name) + '"');
        return;
      }
    }
    editing.note = $('#dishNote').value.trim();
    var line = { id: editing.id, sel: editing.sel, qty: editing.qty, note: editing.note };
    var sig = function (l) { return l.id + JSON.stringify(l.sel) + (l.note || ''); };
    if (editing.editIndex != null) state.cart.splice(editing.editIndex, 1);
    var same = state.cart.filter(function (l) { return sig(l) === sig(line); })[0];
    if (same) same.qty = Math.min(20, same.qty + line.qty); else state.cart.push(line);
    var wasEdit = editing.editIndex != null;
    save(); $('#dishSheet').close();
    renderMenu(); renderFab(true);
    if (wasEdit) { renderOrder(); $('#orderSheet').showModal(); }
    else toast(editing.qty + '× ' + L(d).n + ' ' + t('added'));
  }

  // ---------- pedido ----------
  function renderFab(bump) {
    var tt = totals(), fab = $('#fab');
    fab.hidden = tt.count === 0;
    $('#fabCount').textContent = tt.count;
    $('#fabTotal').textContent = clp(tt.sub);
    fab.setAttribute('aria-label', t('viewOrder') + ': ' + tt.count + ' ' + (tt.count === 1 ? t('item') : t('items')) + ', ' + clp(tt.sub));
    if (bump && !fab.hidden) { fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump'); }
  }
  function renderOrder() {
    var b = $('#orderBody');
    if (!state.cart.length) {
      b.innerHTML = '<div class="empty"><span aria-hidden="true">🍽️</span><p>' + t('emptyOrder') + '</p><button type="button" class="btn btn--ghost btn--center" data-close>' + t('browse') + '</button></div>';
      return;
    }
    var tt = totals();
    b.innerHTML = state.cart.map(function (l, i) {
      var d = dish(l.id), s = selText(l), u = unitPrice(l);
      return '<div class="oline">' + plate(d) + '<div class="oline__body"><h3>' + esc(L(d).n) + '</h3>' +
        '<small>' + (s ? esc(s) : '') + (l.note ? (s ? '<br>' : '') + '📝 ' + esc(l.note) : '') + (l.qty > 1 ? (s || l.note ? '<br>' : '') + clp(u) + ' ' + t('each') : '') + '</small>' +
        '<div style="display:flex;gap:10px;align-items:center"><div class="stepper" role="group" aria-label="Cantidad ' + esc(L(d).n) + '"><button type="button" data-oq="-1" data-i="' + i + '" aria-label="−1">−</button><span>' + l.qty + '</span><button type="button" data-oq="1" data-i="' + i + '" aria-label="+1">+</button></div>' +
        ((d.mods || []).length ? '<button type="button" class="btn btn--ghost btn--center" style="flex:none;min-height:34px;padding:6px 12px;font-size:13px" data-edit="' + i + '">' + t('edit') + '</button>' : '') + '</div></div>' +
        '<span class="oline__price">' + clp(u * l.qty) + '</span></div>';
    }).join('') +
      '<label class="field-lbl" for="orderNotes">' + t('orderNotes') + '</label><textarea id="orderNotes" maxlength="200" placeholder="' + esc(t('orderNotesPh')) + '">' + esc(state.notes) + '</textarea>' +
      '<div class="order-table"><label for="orderTable"><span aria-hidden="true">🪑</span> ' + t('table') + '</label><select id="orderTable">' + tableOptions() + '</select></div>' +
      '<div class="sum"><div><span>' + t('subtotal') + '</span><span>' + clp(tt.sub) + '</span></div>' +
      '<div><span>' + t('tip') + ' (' + state.tip + '%)</span><span>' + clp(tt.tip) + '</span></div>' +
      '<div class="tip" role="group" aria-label="' + t('tip') + '">' + [0, 10, 15].map(function (p) { return '<button type="button" data-tip="' + p + '" aria-pressed="' + (state.tip === p) + '">' + (p ? p + '%' : t('noTip')) + '</button>'; }).join('') + '</div>' +
      '<div class="total"><span>' + t('total') + '</span><span>' + clp(tt.total) + '</span></div></div>' +
      '<div class="sheet-actions"><button type="button" class="btn" id="sendOrder"><span>' + t('send') + '</span><span aria-hidden="true">🔥</span></button></div>';
  }
  function tableOptions() {
    var out = '', max = Math.max(20, state.table);
    for (var i = 1; i <= max; i++) out += '<option value="' + i + '"' + (i === state.table ? ' selected' : '') + '>' + i + '</option>';
    return out;
  }
  function sendOrder() {
    var notesEl = $('#orderNotes'); if (notesEl) state.notes = notesEl.value.trim();
    var tt = totals(), now = new Date();
    state.order = {
      no: String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + '-' + Math.floor(10 + Math.random() * 90),
      sentAt: Date.now(), table: state.table, total: tt.total, notes: state.notes,
      items: state.cart.map(function (l) { return { id: l.id, qty: l.qty, sel: l.sel, note: l.note, unit: unitPrice(l) }; }),
      notifiedReady: false
    };
    state.cart = []; state.notes = '';
    save(); renderMenu(); renderFab();
    $('#orderSheet').close();
    toast(t('sentToast'));
    renderStatusSheet(); $('#statusSheet').showModal();
    tick();
  }

  // ---------- estado del pedido ----------
  function stage(o) {
    var el = Date.now() - o.sentAt;
    return { idx: el >= READY_AT ? 2 : el >= PREP_AT ? 1 : 0, pct: Math.min(100, 8 + el / READY_AT * 92) };
  }
  function renderStatusSheet() {
    var o = state.order, b = $('#statusBody'); if (!o) { b.innerHTML = ''; return; }
    var s = stage(o), emoji = ['🧾', '👩‍🍳', '🛎️'][s.idx];
    var time = function (ms) { var d = new Date(o.sentAt + ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    b.innerHTML = '<div class="st-hero"><span class="st-emoji" aria-hidden="true">' + emoji + '</span><h3>' + t('st' + s.idx) + '</h3>' +
      '<p>' + t('orderNo') + ' <span class="st-no">#' + o.no + '</span> · ' + t('sentAtTable') + ' ' + o.table + '</p>' + (s.idx < 2 ? '<p>' + t('minutes') + '</p>' : '') + '</div>' +
      '<div class="progress" role="progressbar" aria-label="' + t('orderStatus') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(s.pct) + '"><i style="width:' + s.pct + '%"></i></div>' +
      '<ol class="timeline">' + [0, 1, 2].map(function (i) {
        var cls = i < s.idx || s.idx === 2 ? 'done' : i === s.idx ? 'current' : '';
        return '<li class="' + cls + '"><b aria-hidden="true">' + (cls === 'done' ? '✓' : ['🧾', '🔥', '🛎️'][i]) + '</b><span>' + t('st' + i) + '<small>' + (i <= s.idx ? time([0, PREP_AT, READY_AT][i]) + ' · ' : '') + t('st' + i + 'd') + '</small></span></li>';
      }).join('') + '</ol>' +
      '<div class="st-items">' + o.items.map(function (it) { var d = dish(it.id); return d ? '<div><span>' + it.qty + '× ' + esc(L(d).n) + '</span><span>' + clp(it.unit * it.qty) + '</span></div>' : ''; }).join('') +
      '<div style="border-top:1px dashed var(--line);margin-top:6px;padding-top:6px;font-weight:700"><span>' + t('total') + '</span><span>' + clp(o.total) + '</span></div></div>' +
      '<button type="button" class="btn btn--ghost btn--center" data-close>' + t('newOrder') + '</button>';
  }
  var lastStage = -1;
  function tick() {
    var o = state.order, tr = $('#orderTrack');
    if (!o || Date.now() - o.sentAt > 30 * 60 * 1000) { tr.hidden = true; return; }
    var s = stage(o);
    tr.hidden = false;
    $('#orderTrackBtn').innerHTML = '<span aria-hidden="true">' + ['🧾', '👩‍🍳', '🛎️'][s.idx] + '</span><span>#' + o.no + ' · <b>' + t('st' + s.idx) + '</b></span><span class="mini-bar" aria-hidden="true"><i style="width:' + s.pct + '%"></i></span>';
    if ($('#statusSheet').open) {
      if (s.idx !== lastStage) renderStatusSheet();
      else { var bar = $('#statusBody .progress'); if (bar) { $('i', bar).style.width = s.pct + '%'; bar.setAttribute('aria-valuenow', Math.round(s.pct)); } }
    }
    lastStage = s.idx;
    if (s.idx === 2 && !o.notifiedReady) { o.notifiedReady = true; save(); toast(t('readyToast')); }
  }
  setInterval(tick, 500);

  // ---------- mesa / garzón / idioma ----------
  function renderTable() {
    $('#tableLabel').textContent = t('table') + ' ' + state.table;
    $('#tableChip').setAttribute('aria-label', t('chooseTable') + ' (' + t('table') + ' ' + state.table + ')');
    var g = '', max = Math.max(20, state.table);
    for (var i = 1; i <= max; i++) g += '<button type="button" data-table="' + i + '" aria-pressed="' + (i === state.table) + '">' + i + '</button>';
    $('#tableGrid').innerHTML = g;
  }
  var waiterUntil = 0;
  function callWaiter() {
    var btn = $('#waiterBtn');
    if (Date.now() < waiterUntil) { toast(t('waiterWait')); return; }
    waiterUntil = Date.now() + 30000;
    btn.classList.add('is-ringing'); btn.setAttribute('aria-disabled', 'true');
    $('[data-i18n="callWaiter"]', btn).textContent = t('waiterComing');
    toast('🛎️ ' + t('waiterToast') + ' ' + state.table);
    setTimeout(function () {
      waiterUntil = 0; btn.classList.remove('is-ringing'); btn.removeAttribute('aria-disabled');
      $('[data-i18n="callWaiter"]', btn).textContent = t('callWaiter');
    }, 30000);
  }
  function applyLang() {
    document.documentElement.lang = state.lang;
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === state.lang); });
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    if (Date.now() < waiterUntil) $('#waiterBtn [data-i18n]').textContent = t('waiterComing');
    $('#tagline').textContent = L(D.info.tagline);
    $$('.close').forEach(function (c) { c.setAttribute('aria-label', t('close')); });
    $('#tabs').setAttribute('aria-label', state.lang === 'en' ? 'Menu categories' : 'Categorías de la carta');
    renderStatus(); renderFilters(); renderMenu(); renderTabs(); renderFab(); renderTable();
    if ($('#orderSheet').open) renderOrder();
    if ($('#statusSheet').open) renderStatusSheet();
    if ($('#dishSheet').open && editing) { var e = editing; openDish(e.id, e.editIndex); editing.sel = e.sel; editing.qty = e.qty; syncDishInputs(); }
    lastStage = -1; tick();
  }
  function syncDishInputs() {
    Object.keys(editing.sel).forEach(function (g) {
      $$('input[name="m-' + g + '"]').forEach(function (inp) { inp.checked = editing.sel[g].indexOf(+inp.value) >= 0; });
    });
    updateDishTotal();
  }

  // ---------- eventos ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var ds = b.dataset;
    if (ds.dish) { openDish(ds.dish); return; }
    if (ds.tab) {
      var sec = $('#sec-' + ds.tab); if (!sec) return;
      spyLock = Date.now() + 900; setActiveTab(ds.tab);
      window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - stickyOffset() - 4, behavior: 'smooth' });
      return;
    }
    if (ds.filter) {
      var i = state.filters.indexOf(ds.filter);
      if (i >= 0) state.filters.splice(i, 1); else state.filters.push(ds.filter);
      renderFilters(); renderMenu(); renderTabs(); return;
    }
    if (b.hasAttribute('data-clear')) { state.filters = []; renderFilters(); renderMenu(); renderTabs(); return; }
    if (ds.lang) { state.lang = ds.lang; save(); applyLang(); return; }
    if (ds.dq) { editing.qty = Math.max(1, Math.min(20, editing.qty + +ds.dq)); updateDishTotal(); return; }
    if (ds.oq) {
      var l = state.cart[+ds.i]; l.qty += +ds.oq;
      if (l.qty <= 0) { state.cart.splice(+ds.i, 1); toast(L(dish(l.id)).n + ' ' + t('removed')); }
      if (l.qty > 20) l.qty = 20;
      var notesEl = $('#orderNotes'); if (notesEl) state.notes = notesEl.value;
      save(); renderOrder(); renderMenu(); renderFab();
      var focusBtn = $('#orderBody [data-oq][data-i="' + Math.min(+ds.i, state.cart.length - 1) + '"][data-oq="' + ds.oq + '"]') || $('#orderBody button');
      if (focusBtn) focusBtn.focus();
      return;
    }
    if (ds.edit) { var idx = +ds.edit; $('#orderSheet').close(); openDish(state.cart[idx].id, idx); return; }
    if (ds.tip) { state.tip = +ds.tip; var ne = $('#orderNotes'); if (ne) state.notes = ne.value; save(); renderOrder(); $('#orderBody [data-tip="' + ds.tip + '"]').focus(); return; }
    if (ds.table) { state.table = +ds.table; save(); renderTable(); $('#tableSheet').close(); toast(t('tableSet') + ' ' + state.table); return; }
    if (b.hasAttribute('data-close')) { var dl = b.closest('dialog'); if (dl) dl.close(); return; }
    switch (b.id) {
      case 'fab': renderOrder(); $('#orderSheet').showModal(); break;
      case 'sendOrder': sendOrder(); break;
      case 'waiterBtn': callWaiter(); break;
      case 'tableChip': $('#tableSheet').showModal(); var cur = $('#tableGrid [aria-pressed="true"]'); if (cur) cur.focus(); break;
      case 'orderTrackBtn': lastStage = -1; renderStatusSheet(); $('#statusSheet').showModal(); break;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.name && el.name.indexOf('m-') === 0 && editing) {
      var g = el.name.slice(2), grp = D.mods[g];
      if (grp.type === 'single') editing.sel[g] = [+el.value];
      else editing.sel[g] = $$('input[name="' + el.name + '"]:checked').map(function (x) { return +x.value; });
      var badge = $('[data-group="' + g + '"] small'); if (badge) badge.classList.remove('bad');
      updateDishTotal();
    }
    if (el.id === 'orderTable') { state.table = +el.value; save(); renderTable(); }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'orderNotes') { state.notes = e.target.value; save(); } });
  $('#dishForm').addEventListener('submit', function (e) { e.preventDefault(); commitDish(); });
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); // clic en el fondo
  });

  // ---------- inicio ----------
  if (urlTable) save();
  applyLang();
  setInterval(renderStatus, 60000);
})();
