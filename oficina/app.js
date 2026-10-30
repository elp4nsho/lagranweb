/* ¿Quién es quién? — directorio, mapa de oficina, organigrama y recepción. */
(function () {
  'use strict';

  var D = window.OFICINA_DATA;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var norm = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var todayKey = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Persistencia ---------- */
  var KEY = 'lgw-oficina-v1';
  var store = { co: null, theme: null, me: {}, res: {}, visits: {} };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') Object.keys(store).forEach(function (k) { if (parsed[k] != null) store[k] = parsed[k]; }); }
  } catch (e) { /* almacenamiento no disponible */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignorar */ } }

  var STATUS = {
    oficina: { label: 'En oficina' },
    reunion: { label: 'En reunión' },
    remoto: { label: 'Remoto' },
    vacaciones: { label: 'Vacaciones' }
  };
  var STATUS_ORDER = ['oficina', 'reunion', 'remoto', 'vacaciones'];

  var ICON = {
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 7h4M9 11h1m2 0h1m2 0h0M9 14h1m2 0h1m2 0h0M9 17h1m2 0h1"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.3-6 8-6s7 2 8 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  /* ---------- Estado ---------- */
  var C = null;          // empresa actual
  var IDX = null;        // índices
  var ui = { view: 'directorio', floor: 0, q: '', area: '', skill: '', floorF: '', status: '', sort: 'name', profile: null, kSel: null, hlSeat: null, orgCollapsed: {} };

  function buildIndex() {
    IDX = { byId: {}, seat: {}, reports: {} };
    C.people.forEach(function (p) {
      IDX.byId[p.id] = p;
      p._hay = norm([p.name, p.cargo, p.area, p.skills.join(' '), p.email, p.ext].join(' '));
      if (p.managerId) (IDX.reports[p.managerId] = IDX.reports[p.managerId] || []).push(p);
    });
    C.floors.forEach(function (f, fi) {
      f.clusters.forEach(function (cl) {
        cl.seats.forEach(function (s) { IDX.seat[s.id] = { s: s, floor: fi, cluster: cl }; });
      });
    });
  }
  function reports(id) { return IDX.reports[id] || []; }

  /* Reservas del día (hot-desk) */
  function resToday() {
    var r = store.res[C.id];
    if (!r || r.date !== todayKey()) { r = store.res[C.id] = { date: todayKey(), items: {} }; }
    return r.items;
  }
  function resOf(pid) {
    var it = resToday();
    for (var sid in it) if (it[sid].pid === pid && IDX.seat[sid]) return { sid: sid, pid: pid, in: it[sid].in };
    return null;
  }
  function statusOf(p) { var r = resOf(p.id); return r && r.in ? 'oficina' : p.status; }
  function seatOf(p) { var r = resOf(p.id); return r ? r.sid : p.seat; }
  function seatState(sid) {
    var it = resToday()[sid];
    if (it && IDX.byId[it.pid]) return { state: it.in ? 'checked' : 'res', person: IDX.byId[it.pid] };
    var s = IDX.seat[sid].s;
    if (s.pid) {
      var p = IDX.byId[s.pid];
      return { state: p.status === 'oficina' ? 'occ' : p.status === 'reunion' ? 'meet' : 'away', person: p };
    }
    return { state: 'free' };
  }
  function seatLabel(sid) { return 'Puesto ' + sid; }
  function whereText(p) {
    var sid = seatOf(p);
    if (!sid) return 'Remoto · ' + p.city;
    var info = IDX.seat[sid];
    return C.floors[info.floor].name + ' · ' + sid;
  }

  /* ---------- Utilidades UI ---------- */
  function avatar(p, size, withDot) {
    var st = statusOf(p);
    return '<span class="av ' + (size || '') + '" style="--c:' + p.color + '" aria-hidden="true">' + esc(p.initials) +
      (withDot ? '<i class="dot st-' + st + '"></i>' : '') + '</span>';
  }
  function statusPill(p) {
    var st = statusOf(p);
    return '<span class="status st-' + st + '"><i class="dot"></i>' + STATUS[st].label + '</span>';
  }
  function areaTag(name) { return '<span class="tag" style="--c:' + (C.areaColor[name] || '#64748b') + '">' + esc(name) + '</span>'; }
  function hl(text, terms) {
    var t = esc(text);
    if (!terms.length) return t;
    var n = norm(text), marks = [];
    terms.forEach(function (term) {
      var i = n.indexOf(term);
      if (i >= 0) marks.push([i, i + term.length]);
    });
    if (!marks.length) return t;
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    marks.forEach(function (m) {
      if (m[0] < pos) return;
      out += esc(text.slice(pos, m[0])) + '<mark>' + esc(text.slice(m[0], m[1])) + '</mark>';
      pos = m[1];
    });
    return out + esc(text.slice(pos));
  }
  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<i class="ti"></i><span></span>';
    el.lastChild.textContent = msg;
    var box = $('#toasts');
    while (box.children.length >= 2) box.removeChild(box.firstChild);
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 2800);
    setTimeout(function () { el.remove(); }, 3200);
  }
  function searchPeople(q, limit) {
    var terms = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var res = C.people.filter(function (p) { return terms.every(function (t) { return p._hay.indexOf(t) >= 0; }); });
    res.sort(function (a, b) {
      var an = norm(a.name).indexOf(terms[0]) === 0 ? 0 : 1, bn = norm(b.name).indexOf(terms[0]) === 0 ? 0 : 1;
      return an - bn || a.name.localeCompare(b.name, 'es');
    });
    return limit ? res.slice(0, limit) : res;
  }

  /* ---------- Tema ---------- */
  function effectiveDark() {
    if (store.theme) return store.theme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme() {
    if (store.theme) document.documentElement.setAttribute('data-theme', store.theme);
    else document.documentElement.removeAttribute('data-theme');
    $('#themeBtn').setAttribute('aria-label', effectiveDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  $('#themeBtn').addEventListener('click', function () {
    store.theme = effectiveDark() ? 'light' : 'dark';
    save(); applyTheme();
  });

  /* ---------- Empresa ---------- */
  var coSel = $('#coSelect');
  coSel.innerHTML = D.companies.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
  coSel.addEventListener('change', function () { setCompany(coSel.value, true); });

  function setCompany(id, announce) {
    C = D.companies.filter(function (c) { return c.id === id; })[0] || D.companies[0];
    store.co = C.id; save();
    coSel.value = C.id;
    buildIndex();
    var root = document.documentElement.style;
    root.setProperty('--brand', C.brand);
    $('#coLogo').textContent = C.short;
    ui.floor = 0; ui.q = ''; ui.area = ''; ui.skill = ''; ui.floorF = ''; ui.status = ''; ui.kSel = null; ui.hlSeat = null; ui.orgCollapsed = {};
    $('#q').value = ''; $('#mapQ').value = ''; $('#kQ').value = ''; $('#orgQ').value = '';
    closeProfile(true);
    hideTip();
    setupFilters();
    fillPeopleSelects();
    resetView(true);
    renderAll();
    if (announce) toast('Empresa: ' + C.name);
  }

  /* ---------- Vistas ---------- */
  var VIEWS = ['directorio', 'mapa', 'organigrama', 'recepcion'];
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () { setView(t.dataset.view); });
    t.addEventListener('keydown', function (e) {
      var i = VIEWS.indexOf(t.dataset.view);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var n = VIEWS[(i + (e.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length];
        setView(n); $('#tab-' + n).focus();
      }
    });
  });
  function setView(v) {
    if (VIEWS.indexOf(v) < 0) v = 'directorio';
    if (v !== ui.view && window.scrollY > 0) window.scrollTo(0, 0);
    ui.view = v;
    $$('.tab').forEach(function (t) {
      var on = t.dataset.view === v;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    VIEWS.forEach(function (x) { $('#view-' + x).hidden = x !== v; });
    try { history.replaceState(null, '', '#' + v); } catch (e) { /* file:// en algunos navegadores */ }
    hideTip();
    renderView(v);
  }
  function renderView(v) {
    if (v === 'directorio') renderDirectory();
    if (v === 'mapa') renderMap();
    if (v === 'organigrama') renderOrg();
    if (v === 'recepcion') renderReception();
  }
  function renderAll() { renderView(ui.view); }

  /* ---------- Directorio ---------- */
  function setupFilters() {
    var areas = C.areas.map(function (a) { return a.name; });
    $('#fArea').innerHTML = '<option value="">Todas las áreas</option>' + areas.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
    var skills = {};
    C.people.forEach(function (p) { p.skills.forEach(function (s) { skills[s] = 1; }); });
    $('#fSkill').innerHTML = '<option value="">Todas las habilidades</option>' + Object.keys(skills).sort(function (a, b) { return a.localeCompare(b, 'es'); }).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
    $('#fFloor').innerHTML = '<option value="">Todos los pisos</option>' + C.floors.map(function (f, i) { return '<option value="' + i + '">' + f.name + '</option>'; }).join('') + '<option value="remoto">Sin puesto (remoto)</option>';
    $('#fSort').value = ui.sort;
  }

  function renderStatusChips() {
    var counts = {};
    C.people.forEach(function (p) { var s = statusOf(p); counts[s] = (counts[s] || 0) + 1; });
    $('#fStatus').innerHTML = STATUS_ORDER.map(function (s) {
      return '<button type="button" class="chip st-' + s + '" data-status="' + s + '" aria-pressed="' + (ui.status === s) + '"><i class="dot"></i>' + STATUS[s].label + ' <b>' + (counts[s] || 0) + '</b></button>';
    }).join('');
  }

  function filteredPeople() {
    var terms = norm(ui.q.trim()).split(/\s+/).filter(Boolean);
    var list = C.people.filter(function (p) {
      if (ui.area && p.area !== ui.area) return false;
      if (ui.skill && p.skills.indexOf(ui.skill) < 0) return false;
      if (ui.status && statusOf(p) !== ui.status) return false;
      if (ui.floorF !== '') {
        var sid = seatOf(p);
        if (ui.floorF === 'remoto') { if (sid) return false; }
        else if (!sid || String(IDX.seat[sid].floor) !== ui.floorF) return false;
      }
      return terms.every(function (t) { return p._hay.indexOf(t) >= 0; });
    });
    list.sort(function (a, b) {
      if (ui.sort === 'area') return a.area.localeCompare(b.area, 'es') || a.level - b.level || a.name.localeCompare(b.name, 'es');
      if (ui.sort === 'status') return STATUS_ORDER.indexOf(statusOf(a)) - STATUS_ORDER.indexOf(statusOf(b)) || a.name.localeCompare(b.name, 'es');
      return a.name.localeCompare(b.name, 'es');
    });
    return { list: list, terms: terms };
  }

  function renderDirectory() {
    renderStatusChips();
    var inOffice = C.people.filter(function (p) { var s = statusOf(p); return s === 'oficina' || s === 'reunion'; }).length;
    $('#dirSub').textContent = C.people.length + ' personas en ' + C.name + ' · ' + inOffice + ' hoy en la oficina · ' + C.city;
    var r = filteredPeople();
    $('#dirCount').textContent = r.list.length === C.people.length ? 'Mostrando a todas las personas' : r.list.length + ' de ' + C.people.length + ' personas';
    if (!r.list.length) {
      $('#dirGrid').innerHTML = '<div class="empty">' + ICON.search + '<p><strong>Sin resultados</strong></p><p>Prueba con otro nombre, área o habilidad.</p><button class="btn sm" type="button" data-clear>Limpiar filtros</button></div>';
      return;
    }
    $('#dirGrid').innerHTML = r.list.map(function (p) {
      var mgr = p.managerId ? IDX.byId[p.managerId] : null;
      var sid = seatOf(p);
      var skillHit = r.terms.length ? p.skills.filter(function (s) { return r.terms.some(function (t) { return norm(s).indexOf(t) >= 0; }); }) : [];
      return '<article class="pcard">' +
        '<button type="button" class="pcard-main" data-open="' + p.id + '" aria-label="Ver perfil de ' + esc(p.name) + '">' + avatar(p, '', true) +
        '<span><span class="nm">' + hl(p.name, r.terms) + '</span><span class="cg">' + hl(p.cargo, r.terms) + '</span></span></button>' +
        '<div class="meta">' + areaTag(p.area) + statusPill(p) + skillHit.map(function (s) { return '<span class="skill">' + hl(s, r.terms) + '</span>'; }).join('') + '</div>' +
        '<ul class="contact">' +
        '<li><span class="row-ic" aria-hidden="true">' + ICON.mail + '</span><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></li>' +
        '<li><span class="row-ic" aria-hidden="true">' + ICON.phone + '</span><span>Anexo <strong>' + esc(p.ext) + '</strong> · ' + esc(p.phone) + '</span></li>' +
        '<li><span class="row-ic" aria-hidden="true">' + ICON.pin + '</span><span>' + esc(whereText(p)) + '</span></li>' +
        '<li><span class="row-ic" aria-hidden="true">' + ICON.user + '</span><span>' + (mgr ? 'Reporta a ' + esc(mgr.name) : 'Dirige ' + esc(C.name)) + '</span></li>' +
        '</ul>' +
        '<div class="pcard-actions"><button type="button" class="btn sm" data-open="' + p.id + '">Perfil</button>' +
        '<button type="button" class="btn sm primary" data-locate="' + p.id + '"' + (sid ? '' : ' disabled title="Trabaja en remoto: sin puesto asignado"') + '>' + ICON.pin.replace('<svg', '<svg aria-hidden="true"') + 'Ver en el mapa</button></div>' +
        '</article>';
    }).join('');
  }

  $('#q').addEventListener('input', function (e) { ui.q = e.target.value; renderDirectory(); });
  $('#fArea').addEventListener('change', function (e) { ui.area = e.target.value; renderDirectory(); });
  $('#fSkill').addEventListener('change', function (e) { ui.skill = e.target.value; renderDirectory(); });
  $('#fFloor').addEventListener('change', function (e) { ui.floorF = e.target.value; renderDirectory(); });
  $('#fSort').addEventListener('change', function (e) { ui.sort = e.target.value; renderDirectory(); });
  $('#fStatus').addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]'); if (!b) return;
    ui.status = ui.status === b.dataset.status ? '' : b.dataset.status;
    renderDirectory();
  });
  function clearFilters() {
    ui.q = ''; ui.area = ''; ui.skill = ''; ui.floorF = ''; ui.status = '';
    $('#q').value = ''; $('#fArea').value = ''; $('#fSkill').value = ''; $('#fFloor').value = '';
    renderDirectory();
  }
  $('#fClear').addEventListener('click', clearFilters);
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { openProfile(o.dataset.open, o); return; }
    var l = e.target.closest('[data-locate]');
    if (l && !l.disabled) { closeProfile(); locate(l.dataset.locate); return; }
    if (e.target.closest('[data-clear]')) clearFilters();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && ui.view === 'directorio') {
      e.preventDefault(); $('#q').focus();
    }
  });

  /* ---------- Perfil ---------- */
  var lastFocus = null;
  function openProfile(id, from) {
    var p = IDX.byId[id]; if (!p) return;
    ui.profile = id;
    if (from) lastFocus = from;
    else if (!$('#profile').contains(document.activeElement)) lastFocus = document.activeElement;
    hideTip();
    var mgr = p.managerId ? IDX.byId[p.managerId] : null;
    var reps = reports(p.id);
    var sid = seatOf(p);
    var res = resOf(p.id);
    var loc;
    if (sid) {
      var info = IDX.seat[sid];
      loc = '<div class="loc-card"><div><span class="muted sm">' + (res ? (res.in ? 'Hot-desk hoy (check-in)' : 'Reserva de hoy') : 'Puesto asignado') + '</span><strong>' + C.floors[info.floor].name + ' · ' + esc(sid) + '</strong><span class="muted sm">Zona ' + info.cluster.letter + (info.cluster.area ? ' · ' + esc(info.cluster.area) : '') + '</span></div>' +
        '<button type="button" class="btn primary" data-locate="' + p.id + '">' + ICON.pin.replace('<svg', '<svg aria-hidden="true"') + 'Ver en el mapa</button></div>';
    } else {
      loc = '<div class="loc-card"><div><span class="muted sm">Sin puesto asignado</span><strong>Trabajo remoto</strong><span class="muted sm">' + esc(p.city) + '</span></div>' +
        '<button type="button" class="btn" disabled title="Sin puesto en la oficina">Ver en el mapa</button></div>';
    }
    var plink = function (q) {
      return '<button type="button" class="person-link" data-open="' + q.id + '">' + avatar(q, 'sm', true) + '<span><span class="nm">' + esc(q.name) + '</span><span class="sub">' + esc(q.cargo) + '</span></span></button>';
    };
    $('#profileBody').innerHTML =
      '<div class="pf-top"><button type="button" class="icon-btn" id="pfClose" aria-label="Cerrar perfil">' + ICON.close + '</button></div>' +
      '<div class="pf-hero">' + avatar(p, 'lg', true) + '<h2 id="pfName">' + esc(p.name) + '</h2><div class="cg">' + esc(p.cargo) + '</div><div class="meta">' + areaTag(p.area) + statusPill(p) + '</div></div>' +
      '<div class="pf-sec"><h3>Ubicación</h3>' + loc + '</div>' +
      '<div class="pf-sec"><h3>Contacto</h3><div class="kv">' +
      '<div class="kv-row"><span class="k">Correo</span><a class="v" href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a><button type="button" class="copy" data-copy="' + esc(p.email) + '">Copiar</button></div>' +
      '<div class="kv-row"><span class="k">Teléfono</span><a class="v" href="tel:' + esc(p.phone.replace(/\s/g, '')) + '">' + esc(p.phone) + '</a><button type="button" class="copy" data-copy="' + esc(p.phone) + '">Copiar</button></div>' +
      '<div class="kv-row"><span class="k">Anexo</span><span class="v"><strong>' + esc(p.ext) + '</strong></span><button type="button" class="copy" data-copy="' + esc(p.ext) + '">Copiar</button></div>' +
      '<div class="kv-row"><span class="k">Ciudad</span><span class="v">' + esc(p.city) + '</span></div>' +
      '<div class="kv-row"><span class="k">En la empresa</span><span class="v">Desde ' + p.since + '</span></div>' +
      '</div></div>' +
      '<div class="pf-sec"><h3>Jefatura</h3>' + (mgr ? plink(mgr) : '<p class="muted sm">Máxima autoridad de ' + esc(C.name) + '.</p>') + '</div>' +
      (reps.length ? '<div class="pf-sec"><h3>Equipo directo (' + reps.length + ')</h3><div class="plist">' + reps.map(plink).join('') + '</div></div>' : '') +
      '<div class="pf-sec"><h3>Habilidades</h3><div class="skills">' + p.skills.map(function (s) { return '<span class="skill">' + esc(s) + '</span>'; }).join('') + '</div></div>';
    $('#profile').hidden = false;
    $('#scrim').hidden = false;
    $('#profile').scrollTop = 0;
    $('#pfClose').addEventListener('click', function () { closeProfile(); });
    $('#pfClose').focus();
  }
  function closeProfile(silent) {
    if ($('#profile').hidden) return;
    $('#profile').hidden = true;
    $('#scrim').hidden = true;
    ui.profile = null;
    if (!silent && lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null) { try { lastFocus.focus(); } catch (e) { /* */ } }
  }
  $('#scrim').addEventListener('click', function () { closeProfile(); });
  $('#profile').addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]'); if (!c) return;
    var txt = c.dataset.copy;
    var done = function () { c.textContent = 'Copiado'; setTimeout(function () { c.textContent = 'Copiar'; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { toast('No se pudo copiar', 'warn'); });
    else toast('Copia manual: ' + txt);
  });
  $('#profile').addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = $$('button, a[href], input, select', $('#profile')).filter(function (x) { return !x.disabled; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#profile').hidden) { closeProfile(); return; }
    if (!$('#tip').hidden) hideTip();
  });

  /* ---------- Plano SVG ---------- */
  function furniture(rm) {
    var x = rm.x, y = rm.y, w = rm.w, h = rm.h, o = '';
    var cx = x + w / 2, cy = y + h / 2 + 14;
    if (rm.type === 'meeting') {
      var tw = Math.min(w * 0.58, 140), th = Math.min(h * 0.3, 46);
      o += '<rect class="furn" x="' + (cx - tw / 2) + '" y="' + (cy - th / 2) + '" width="' + tw + '" height="' + th + '" rx="10"/>';
      var n = Math.max(2, Math.floor(tw / 30));
      for (var i = 0; i < n; i++) {
        var px = cx - tw / 2 + (tw / n) * (i + 0.5);
        o += '<circle class="furn" cx="' + px + '" cy="' + (cy - th / 2 - 10) + '" r="7"/><circle class="furn" cx="' + px + '" cy="' + (cy + th / 2 + 10) + '" r="7"/>';
      }
    } else if (rm.type === 'boardroom') {
      o += '<ellipse class="furn" cx="' + cx + '" cy="' + cy + '" rx="' + (w * 0.33) + '" ry="' + (h * 0.18) + '"/>';
      for (var k = 0; k < 14; k++) {
        var a = (k / 14) * Math.PI * 2;
        o += '<circle class="furn" cx="' + (cx + Math.cos(a) * (w * 0.33 + 14)).toFixed(1) + '" cy="' + (cy + Math.sin(a) * (h * 0.18 + 12)).toFixed(1) + '" r="7"/>';
      }
    } else if (rm.type === 'kitchen') {
      o += '<rect class="furn" x="' + (x + 12) + '" y="' + (y + h - 30) + '" width="' + (w - 24) + '" height="18" rx="4"/>';
      var tables = w > 200 ? 2 : 1;
      for (var t = 0; t < tables; t++) {
        var tx = x + (w / (tables + 1)) * (t + 1), ty = y + h / 2 + 2;
        o += '<circle class="furn" cx="' + tx + '" cy="' + ty + '" r="17"/>';
        [[-27, 0], [27, 0], [0, -27], [0, 27]].forEach(function (d) { if (ty + d[1] < y + h - 34) o += '<circle class="furn" cx="' + (tx + d[0]) + '" cy="' + (ty + d[1]) + '" r="6"/>'; });
      }
    } else if (rm.type === 'wc') {
      var stalls = 3, sw = (w - 24) / stalls;
      for (var s = 0; s < stalls; s++) o += '<rect class="furn-s" x="' + (x + 12 + s * sw) + '" y="' + (y + h - 62) + '" width="' + (sw - 6) + '" height="50" rx="4"/>';
    } else if (rm.type === 'reception') {
      o += '<path class="furn-s" style="stroke-width:14;stroke-linecap:round" d="M' + (x + 60) + ' ' + (y + 120) + ' Q ' + (x + w / 2) + ' ' + (y + 175) + ' ' + (x + w - 60) + ' ' + (y + 120) + '"/>';
      o += '<circle class="furn" cx="' + (x + w / 2) + '" cy="' + (y + 120) + '" r="9"/>';
      o += '<circle class="room-ok" cx="' + (x + w - 28) + '" cy="' + (y + h - 28) + '" r="11" opacity=".35"/>';
    } else if (rm.type === 'lounge') {
      o += '<rect class="furn" x="' + (x + 24) + '" y="' + (y + h - 48) + '" width="' + Math.min(w - 48, 160) + '" height="26" rx="10"/>';
      o += '<rect class="furn" x="' + (x + 24) + '" y="' + (y + 56) + '" width="26" height="' + (h - 110) + '" rx="10"/>';
      o += '<circle class="furn" cx="' + (x + Math.min(w * 0.55, 120)) + '" cy="' + (y + h / 2 + 10) + '" r="20"/>';
      o += '<circle class="room-ok" cx="' + (x + w - 34) + '" cy="' + (y + 50) + '" r="13" opacity=".3"/>';
    } else if (rm.type === 'elevator') {
      var ew = Math.min(w - 36, 70), eh = 46;
      for (var e2 = 0; e2 < 2; e2++) {
        var ey = y + 52 + e2 * (eh + 16);
        if (ey + eh > y + h - 8) break;
        o += '<rect class="furn" x="' + (x + (w - ew) / 2) + '" y="' + ey + '" width="' + ew + '" height="' + eh + '" rx="4"/><line class="door" x1="' + (x + w / 2) + '" y1="' + (ey + 4) + '" x2="' + (x + w / 2) + '" y2="' + (ey + eh - 4) + '" style="stroke-width:2"/>';
      }
    } else if (rm.type === 'booths') {
      var bh = 50, nb = Math.floor((h - 50) / (bh + 8));
      for (var b = 0; b < nb; b++) o += '<rect class="furn-s" x="' + (x + 14) + '" y="' + (y + 44 + b * (bh + 8)) + '" width="' + (w - 28) + '" height="' + bh + '" rx="6"/>';
    } else if (rm.type === 'it') {
      for (var q = 0; q < 4; q++) o += '<rect class="furn" x="' + (x + 16 + q * 38) + '" y="' + (y + h - 70) + '" width="28" height="56" rx="3"/>';
    }
    return o;
  }

  function floorSVG(fi, opts) {
    opts = opts || {};
    var f = C.floors[fi], o = '';
    o += '<rect class="fl-floor" x="20" y="20" width="1160" height="720" rx="18"/>';
    var g = '';
    for (var gx = 60; gx < 1180; gx += 40) g += 'M' + gx + ' 24V736';
    for (var gy = 60; gy < 740; gy += 40) g += 'M24 ' + gy + 'H1176';
    o += '<path class="fl-grid" d="' + g + '"/>';
    f.rooms.forEach(function (rm) {
      o += '<rect class="room r-' + rm.type + '" x="' + rm.x + '" y="' + rm.y + '" width="' + rm.w + '" height="' + rm.h + '" rx="10"/>';
      // puerta
      var doorY = rm.y + rm.h, doorX = rm.x + rm.w / 2 - 22;
      if (rm.y + rm.h < 700) o += '<line class="door" x1="' + doorX + '" y1="' + doorY + '" x2="' + (doorX + 44) + '" y2="' + doorY + '"/>';
      else o += '<line class="door" x1="' + (rm.x + rm.w) + '" y1="' + (rm.y + 40) + '" x2="' + (rm.x + rm.w) + '" y2="' + (rm.y + 84) + '"/>';
      o += furniture(rm);
      o += '<text class="room-label" x="' + (rm.x + 14) + '" y="' + (rm.y + 26) + '">' + esc(rm.name) + '</text>';
      if (rm.cap) {
        o += '<circle class="' + (rm.busy ? 'room-busy' : 'room-ok') + '" cx="' + (rm.x + 19) + '" cy="' + (rm.y + 42) + '" r="4.5"/>' +
          '<text class="room-sub" x="' + (rm.x + 29) + '" y="' + (rm.y + 46) + '">' + (rm.busy ? 'En uso' : 'Disponible') + ' · ' + rm.cap + ' pers.</text>';
      }
    });
    f.clusters.forEach(function (cl) {
      cl.seats.forEach(function (s) { o += '<rect class="desk" x="' + s.dx + '" y="' + s.dy + '" width="66" height="42" rx="5"/>'; });
      o += '<text class="cl-label" x="' + (cl.x + 4) + '" y="' + (cl.y + 196) + '">Zona ' + cl.letter + (cl.area ? ' · ' + esc(cl.area) : ' · Hot-desk') + '</text>';
    });
    var me = store.me[C.id];
    f.clusters.forEach(function (cl) {
      cl.seats.forEach(function (s) { o += seatSVG(s, me, opts); });
    });
    o += '<g transform="translate(1146 714)"><circle r="14" fill="none" class="furn-s" style="stroke-width:2"/><path d="M0 -10 L5 4 L0 1 L-5 4Z" class="compass"/><text class="compass" y="-18" text-anchor="middle">N</text></g>';
    if (opts.highlight) {
      var hs = IDX.seat[opts.highlight];
      if (hs && hs.floor === fi) o += pulseSVG(hs.s.cx, hs.s.cy);
    }
    return o;
  }
  function pulseSVG(cx, cy) {
    return '<circle class="pulse" cx="' + cx + '" cy="' + cy + '" r="22"/><circle class="pulse p2" cx="' + cx + '" cy="' + cy + '" r="22"/>';
  }
  function seatSVG(s, me, opts) {
    var st = seatState(s.id), p = st.person;
    var cls = 'seat s-' + st.state + (p && me && p.id === me ? ' mine' : '') + (opts.highlight === s.id ? ' hl' : '');
    var label, inner;
    if (st.state === 'free') {
      label = seatLabel(s.id) + ': libre, disponible para reservar hoy';
      inner = '<circle class="bg" r="17"/><text>+</text>';
    } else {
      var desc = { occ: 'en oficina', meet: 'en reunión', away: STATUS[p.status].label.toLowerCase() + ' (ausente)', res: 'reservado hoy, aún sin check-in', checked: 'hot-desk hoy, en oficina' }[st.state];
      label = seatLabel(s.id) + ': ' + p.name + ', ' + p.cargo + ', ' + desc;
      var fill = st.state === 'res' ? '' : ' style="fill:' + p.color + '"';
      inner = '<circle class="bg" r="19"' + fill + '/><text>' + esc(p.initials) + '</text>';
      if (st.state === 'meet') inner += '<circle class="badge-dot" cx="14" cy="-14" r="6" fill="var(--warn)"/>';
      if (st.state === 'checked') inner += '<circle class="badge-dot" cx="14" cy="-14" r="6" fill="var(--brand)"/>';
    }
    var attrs = opts.static ? ' aria-hidden="true"' : ' tabindex="0" role="button" aria-label="' + esc(label) + '"';
    return '<g class="' + cls + '" data-seat="' + s.id + '" transform="translate(' + s.cx + ' ' + s.cy + ')"' + (p ? ' style="--sc:' + p.color + '"' : '') + attrs + '>' +
      '<circle class="ring" r="24"/>' + inner + '</g>';
  }

  /* ---------- Mapa: render ---------- */
  var svg = $('#mapSvg'), vp = $('#vp'), stage = $('#stage');
  var view = { s: 1, x: 0, y: 0 };

  function renderMap() {
    $('#floorSeg').innerHTML = C.floors.map(function (f, i) {
      var free = f.clusters.reduce(function (n, cl) { return n + cl.seats.filter(function (s) { return seatState(s.id).state === 'free'; }).length; }, 0);
      return '<button type="button" data-floor="' + i + '" aria-pressed="' + (i === ui.floor) + '">' + f.name + '<small>' + free + ' libres</small></button>';
    }).join('');
    vp.innerHTML = floorSVG(ui.floor, { highlight: ui.hlSeat });
    $('#floorBadge').textContent = C.name + ' · ' + C.floors[ui.floor].name;
    applyView();
    renderStats();
    renderLegend();
    renderHot();
  }

  function renderStats() {
    var f = C.floors[ui.floor], c = { occ: 0, meet: 0, away: 0, free: 0, res: 0, checked: 0 }, total = 0;
    f.clusters.forEach(function (cl) { cl.seats.forEach(function (s) { c[seatState(s.id).state]++; total++; }); });
    var occ = c.occ + c.meet + c.checked + c.res;
    var pct = function (n) { return Math.round((n / total) * 100); };
    $('#occTitle').textContent = 'Ocupación · ' + f.name;
    $('#occDate').textContent = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' });
    var bar = $('#occBar');
    bar.innerHTML = '<span style="width:' + pct(occ) + '%;background:var(--brand)"></span><span style="width:' + pct(c.away) + '%;background:var(--faint);opacity:.5"></span><span style="width:' + pct(c.free) + '%;background:var(--free)"></span>';
    bar.setAttribute('aria-label', 'Ocupadas ' + pct(occ) + '%, ausentes ' + pct(c.away) + '%, libres ' + pct(c.free) + '%');
    $('#occStats').innerHTML =
      '<div><dt><i class="sw" style="background:var(--brand)"></i>Ocupadas</dt><dd>' + occ + '<small>' + pct(occ) + '%</small></dd></div>' +
      '<div><dt><i class="sw" style="background:var(--free)"></i>Libres</dt><dd>' + c.free + '<small>' + pct(c.free) + '%</small></dd></div>' +
      '<div><dt><i class="sw" style="background:var(--faint);opacity:.5"></i>Asignadas ausentes</dt><dd>' + c.away + '<small>' + pct(c.away) + '%</small></dd></div>' +
      '<div><dt><i class="sw" style="background:var(--warn)"></i>Reservas hot-desk</dt><dd>' + (c.res + c.checked) + '<small>de ' + total + '</small></dd></div>';
  }

  function legendSeat(cls, fill, txt, extra) {
    return '<svg viewBox="-26 -26 52 52" aria-hidden="true"><g class="seat ' + cls + '" style="--sc:#64748b"><circle class="bg" r="19"' + (fill ? ' style="fill:' + fill + '"' : '') + '/><text>' + txt + '</text>' + (extra || '') + '</g></svg>';
  }
  function renderLegend() {
    var used = {};
    C.floors[ui.floor].clusters.forEach(function (cl) { cl.seats.forEach(function (s) { if (s.pid) used[IDX.byId[s.pid].area] = 1; }); });
    $('#legend').innerHTML =
      '<li>' + legendSeat('s-occ', '#64748b', 'AB') + 'Ocupado (en oficina)</li>' +
      '<li>' + legendSeat('s-meet', '#64748b', 'AB', '<circle class="badge-dot" cx="14" cy="-14" r="6" fill="var(--warn)"/>') + 'En reunión</li>' +
      '<li>' + legendSeat('s-away', '', 'AB') + 'Asignado, persona ausente</li>' +
      '<li>' + legendSeat('s-free', '', '+') + 'Libre · reservable hoy</li>' +
      '<li>' + legendSeat('s-res', '', 'AB') + 'Reservado (sin check-in)</li>' +
      '<li class="areas">' + C.areas.filter(function (a) { return used[a.name]; }).map(function (a) { return areaTag(a.name); }).join('') + '</li>';
  }

  /* ---------- Hot-desk ---------- */
  function fillPeopleSelects() {
    var sorted = C.people.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    var opts = sorted.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' — ' + esc(p.area) + '</option>'; }).join('');
    $('#meSel').innerHTML = '<option value="">Selecciona tu nombre…</option>' + opts;
    $('#meSel').value = store.me[C.id] || '';
    $('#hostSel').innerHTML = '<option value="">Selecciona a quién visitas…</option>' + opts;
  }
  $('#meSel').addEventListener('change', function (e) {
    store.me[C.id] = e.target.value || null; save();
    renderMap();
    if (e.target.value) toast('Hola, ' + IDX.byId[e.target.value].first + '. Toca un puesto libre para reservarlo.');
  });

  function renderHot() {
    var me = store.me[C.id] ? IDX.byId[store.me[C.id]] : null;
    var box = $('#myRes');
    if (!me) {
      box.innerHTML = '<p class="muted" style="margin:0">Elige tu nombre para reservar un puesto libre por el día de hoy y hacer check-in al llegar.</p>';
      return;
    }
    var r = resOf(me.id);
    if (r) {
      var info = IDX.seat[r.sid];
      box.innerHTML = '<div class="box"><span class="muted sm">' + (r.in ? 'Check-in realizado · estás en la oficina' : 'Reserva para hoy · pendiente de check-in') + '</span><strong>' + C.floors[info.floor].name + ' · ' + esc(r.sid) + '</strong><span class="muted sm">Zona ' + info.cluster.letter + (info.cluster.area ? ' · ' + esc(info.cluster.area) : '') + '</span></div>' +
        '<div class="row">' + (r.in ? '<button type="button" class="btn primary" data-act="checkout">Check-out</button>' : '<button type="button" class="btn primary" data-act="checkin">Check-in</button><button type="button" class="btn danger" data-act="cancel">Cancelar</button>') +
        '<button type="button" class="btn" data-locate="' + me.id + '">Ver</button></div>';
    } else {
      var fixed = me.seat ? '<p class="muted sm" style="margin:0">Tu puesto fijo es <strong>' + esc(me.seat) + '</strong>. También puedes reservar un hot-desk.</p>' : '';
      box.innerHTML = '<div class="box"><strong>Sin reserva para hoy</strong><span class="muted sm">Toca un puesto libre <span style="color:var(--free);font-weight:700">(+)</span> en el mapa para reservarlo.</span></div>' + fixed +
        '<button type="button" class="btn" data-act="suggest">Sugerir un puesto libre</button>';
    }
  }
  $('#myRes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'checkin') checkIn();
    if (act === 'checkout') checkOut();
    if (act === 'cancel') cancelRes();
    if (act === 'suggest') suggestSeat();
  });
  function meId() { return store.me[C.id] || null; }
  function reserve(sid) {
    var me = meId();
    if (!me) { toast('Primero elige tu nombre en «Soy…»', 'warn'); $('#meSel').focus(); return; }
    if (seatState(sid).state !== 'free') { toast('Ese puesto ya no está libre', 'warn'); return; }
    var it = resToday(), prev = resOf(me);
    if (prev) delete it[prev.sid];
    it[sid] = { pid: me, in: false, t: Date.now() };
    save(); hideTip(); ui.hlSeat = sid; renderMap();
    toast((prev ? 'Reserva movida a ' : 'Reservaste el ') + seatLabel(sid) + ' para hoy', 'ok');
  }
  function checkIn() {
    var r = resOf(meId()); if (!r) return;
    resToday()[r.sid].in = true; save(); hideTip(); renderMap();
    toast('Check-in en ' + seatLabel(r.sid) + '. ¡Buen día!', 'ok');
  }
  function checkOut() {
    var r = resOf(meId()); if (!r) return;
    delete resToday()[r.sid]; save(); hideTip(); ui.hlSeat = null; renderMap();
    toast('Check-out registrado. El puesto quedó libre.', 'ok');
  }
  function cancelRes() {
    var r = resOf(meId()); if (!r) return;
    delete resToday()[r.sid]; save(); hideTip(); ui.hlSeat = null; renderMap();
    toast('Reserva cancelada');
  }
  function suggestSeat() {
    var me = IDX.byId[meId()];
    var order = [ui.floor].concat(C.floors.map(function (_, i) { return i; }).filter(function (i) { return i !== ui.floor; }));
    for (var k = 0; k < order.length; k++) {
      var fl = C.floors[order[k]];
      var cls = fl.clusters.slice().sort(function (a, b) { return (b.area === me.area) - (a.area === me.area); });
      for (var c = 0; c < cls.length; c++) {
        for (var s = 0; s < cls[c].seats.length; s++) {
          var seat = cls[c].seats[s];
          if (seatState(seat.id).state === 'free') { focusSeat(seat.id, true); return; }
        }
      }
    }
    toast('No quedan puestos libres hoy', 'warn');
  }

  /* ---------- Mapa: pan & zoom ---------- */
  var MIN_S = 0.8, MAX_S = 5;
  function clampView() {
    view.s = Math.max(MIN_S, Math.min(MAX_S, view.s));
    var W = 1200, H = 760, m = 260;
    var minX = Math.min(0, W - W * view.s) - m, maxX = Math.max(0, W - W * view.s) + m;
    var minY = Math.min(0, H - H * view.s) - m, maxY = Math.max(0, H - H * view.s) + m;
    view.x = Math.max(minX, Math.min(maxX, view.x));
    view.y = Math.max(minY, Math.min(maxY, view.y));
  }
  function applyView() {
    clampView();
    vp.setAttribute('transform', 'translate(' + view.x.toFixed(2) + ' ' + view.y.toFixed(2) + ') scale(' + view.s.toFixed(4) + ')');
  }
  function resetView(silent) {
    // En pantallas angostas/altas, acercar para aprovechar el alto disponible.
    var r = stage.getBoundingClientRect();
    var s = 1;
    if (r.width && r.height) {
      var fit = r.height / r.width; // relación de aspecto del escenario
      if (fit > 0.9) s = Math.min(1.9, fit / 0.633 * 0.75);
    }
    var target = { s: s, x: 600 - 600 * s, y: 380 - 380 * s };
    if (silent) { view = target; applyView(); } else animateTo(target);
  }
  function svgPoint(clientX, clientY) {
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: 600, y: 380 };
    var pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    var p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }
  function zoomAt(px, py, factor) {
    var s2 = Math.max(MIN_S, Math.min(MAX_S, view.s * factor));
    view.x = px - (px - view.x) * (s2 / view.s);
    view.y = py - (py - view.y) * (s2 / view.s);
    view.s = s2;
    applyView();
  }
  var anim = null;
  function animateTo(t, done) {
    if (anim) cancelAnimationFrame(anim);
    if (reduceMotion) { view = t; applyView(); if (done) done(); return; }
    var from = { s: view.s, x: view.x, y: view.y }, start = performance.now(), dur = 650;
    var ease = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    (function step(now) {
      var k = Math.min(1, (now - start) / dur), e = ease(k);
      view.s = from.s + (t.s - from.s) * e; view.x = from.x + (t.x - from.x) * e; view.y = from.y + (t.y - from.y) * e;
      applyView();
      if (k < 1) anim = requestAnimationFrame(step); else { anim = null; if (done) done(); }
    })(start);
  }
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    hideTip();
    var p = svgPoint(e.clientX, e.clientY);
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)));
  }, { passive: false });

  function zoomCenter(f) { hideTip(); animateTo((function () { var s2 = Math.max(MIN_S, Math.min(MAX_S, view.s * f)); return { s: s2, x: 600 - (600 - view.x) * (s2 / view.s), y: 380 - (380 - view.y) * (s2 / view.s) }; })()); }
  $('#zIn').addEventListener('click', function () { zoomCenter(1.4); });
  $('#zOut').addEventListener('click', function () { zoomCenter(1 / 1.4); });
  $('#zFit').addEventListener('click', function () { hideTip(); resetView(false); });

  var pointers = {}, gesture = null;
  function pcount() { return Object.keys(pointers).length; }
  function twoPointers() { var k = Object.keys(pointers); return [pointers[k[0]], pointers[k[1]]]; }
  svg.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    if (pcount() === 1) {
      var seatEl = e.target.closest ? e.target.closest('.seat') : null;
      gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, seat: seatEl ? seatEl.dataset.seat : null, ptype: e.pointerType };
    } else if (pcount() === 2) {
      var pp = twoPointers();
      var mid = svgPoint((pp[0].x + pp[1].x) / 2, (pp[0].y + pp[1].y) / 2);
      gesture = { type: 'pinch', d0: Math.hypot(pp[0].x - pp[1].x, pp[0].y - pp[1].y) || 1, mid0: mid, s0: view.s, x0: view.x, y0: view.y, moved: true };
      hideTip();
    }
  });
  svg.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) {
      return;
    }
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!gesture) return;
    if (gesture.type === 'pan' && pcount() === 1) {
      var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) > 6) { gesture.moved = true; svg.classList.add('dragging'); hideTip(); }
      if (gesture.moved) {
        var ctm = svg.getScreenCTM(); var k = ctm ? ctm.a : 1;
        view.x = gesture.vx + dx / k; view.y = gesture.vy + dy / k; applyView();
      }
    } else if (gesture.type === 'pinch' && pcount() >= 2) {
      var pp = twoPointers();
      var d = Math.hypot(pp[0].x - pp[1].x, pp[0].y - pp[1].y);
      var midNow = svgPoint((pp[0].x + pp[1].x) / 2, (pp[0].y + pp[1].y) / 2);
      var s2 = Math.max(MIN_S, Math.min(MAX_S, gesture.s0 * d / gesture.d0));
      view.s = s2;
      view.x = gesture.mid0.x - (gesture.mid0.x - gesture.x0) * (s2 / gesture.s0) + (midNow.x - gesture.mid0.x);
      view.y = gesture.mid0.y - (gesture.mid0.y - gesture.y0) * (s2 / gesture.s0) + (midNow.y - gesture.mid0.y);
      applyView();
    }
  });
  function endPointer(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    svg.classList.remove('dragging');
    if (gesture && gesture.type === 'pan' && !gesture.moved && e.type === 'pointerup') {
      if (gesture.seat) seatActivate(gesture.seat, gesture.ptype);
      else hideTip();
    }
    if (pcount() === 1 && gesture && gesture.type === 'pinch') {
      // continuar como arrastre con el dedo restante
      var k = Object.keys(pointers)[0], p = pointers[k];
      gesture = { type: 'pan', sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: true };
    } else if (pcount() === 0) gesture = null;
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  // Hover (ratón) y foco (teclado)
  vp.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse' || gesture && gesture.moved) return;
    var g = e.target.closest('.seat'); if (!g) return;
    if ($('#tip').classList.contains('interactive') && !$('#tip').hidden) return;
    showTip(g.dataset.seat, false);
  });
  vp.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse') return;
    var g = e.target.closest('.seat'); if (!g) return;
    if (e.relatedTarget && g.contains(e.relatedTarget)) return;
    if (!$('#tip').classList.contains('interactive')) hideTip();
  });
  vp.addEventListener('focusin', function (e) {
    var g = e.target.closest('.seat'); if (!g) return;
    var tip = $('#tip');
    if (!tip.hidden && tip.classList.contains('interactive')) return;
    var kb = true; try { kb = g.matches(':focus-visible'); } catch (err) { /* */ }
    if (kb) showTip(g.dataset.seat, false);
  });
  vp.addEventListener('focusout', function () { if (!$('#tip').classList.contains('interactive')) hideTip(); });
  vp.addEventListener('keydown', function (e) {
    var g = e.target.closest('.seat'); if (!g) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seatActivate(g.dataset.seat, 'keyboard'); }
  });

  function seatActivate(sid, ptype) {
    var st = seatState(sid);
    var mine = st.person && st.person.id === meId() && (st.state === 'res' || st.state === 'checked');
    if (st.state === 'free' || mine || ptype === 'touch' || ptype === 'pen') {
      showTip(sid, true);
    } else if (st.person) {
      openProfile(st.person.id);
    }
  }

  function showTip(sid, interactive) {
    var tip = $('#tip');
    var g = vp.querySelector('[data-seat="' + sid + '"]'); if (!g) return;
    var st = seatState(sid), p = st.person, info = IDX.seat[sid];
    var zone = 'Zona ' + info.cluster.letter + (info.cluster.area ? ' · ' + esc(info.cluster.area) : '');
    var html = '<div class="seat-id">' + esc(seatLabel(sid)) + ' · ' + zone + '</div>';
    if (!p) {
      html += '<div class="tip-row"><div><div class="nm">Puesto libre</div><div class="sub">Disponible para reservar hoy</div></div></div>';
      if (interactive) {
        html += '<div class="tip-actions">' + (meId() ? '<button type="button" class="btn primary sm" data-tip="reserve">' + (resOf(meId()) ? 'Mover mi reserva aquí' : 'Reservar para hoy') + '</button>' : '<button type="button" class="btn sm" data-tip="who">Elegir «Soy…» para reservar</button>') + '</div>';
      }
    } else {
      var extra = { occ: 'En oficina', meet: 'En reunión', away: STATUS[p.status].label + ' · puesto sin usar', res: 'Reservado hoy · sin check-in', checked: 'Hot-desk hoy · en oficina' }[st.state];
      html += '<div class="tip-row">' + avatar(p, 'sm') + '<div><div class="nm">' + esc(p.name) + '</div><div class="sub">' + esc(p.cargo) + '</div><div class="sub">' + extra + ' · Anexo ' + esc(p.ext) + '</div></div></div>';
      if (interactive) {
        var mine = p.id === meId() && (st.state === 'res' || st.state === 'checked');
        html += '<div class="tip-actions">' +
          (mine && st.state === 'res' ? '<button type="button" class="btn primary sm" data-tip="checkin">Check-in</button><button type="button" class="btn sm danger" data-tip="cancel">Cancelar</button>' : '') +
          (mine && st.state === 'checked' ? '<button type="button" class="btn primary sm" data-tip="checkout">Check-out</button>' : '') +
          '<button type="button" class="btn sm" data-tip="profile" data-pid="' + p.id + '">Ver perfil</button></div>';
      } else {
        html += '<div class="sub" style="margin-top:6px;color:var(--faint)">Clic para ver el perfil</div>';
      }
    }
    tip.innerHTML = html;
    tip.classList.toggle('interactive', !!interactive);
    tip.hidden = false;
    tip.dataset.seat = sid;
    positionTip(g);
  }
  function positionTip(g) {
    var tip = $('#tip');
    var r = g.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var x = r.left + r.width / 2 - sr.left, y = r.top - sr.top;
    var tw = tip.offsetWidth || 220, th = tip.offsetHeight || 90;
    var below = y - th - 14 < 0;
    tip.classList.toggle('below', below);
    x = Math.max(tw / 2 + 8, Math.min(sr.width - tw / 2 - 8, x));
    tip.style.left = x + 'px';
    tip.style.top = (below ? r.bottom - sr.top : y) + 'px';
  }
  function hideTip() { var t = $('#tip'); if (t) { t.hidden = true; t.classList.remove('interactive'); } }
  $('#tip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tip]'); if (!b) return;
    var sid = $('#tip').dataset.seat, a = b.dataset.tip;
    if (a === 'reserve') reserve(sid);
    if (a === 'who') { hideTip(); $('#meSel').focus(); $('#hotCard').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); }
    if (a === 'checkin') checkIn();
    if (a === 'checkout') checkOut();
    if (a === 'cancel') cancelRes();
    if (a === 'profile') openProfile(b.dataset.pid);
  });
  document.addEventListener('pointerdown', function (e) {
    var tip = $('#tip');
    if (!tip.hidden && tip.classList.contains('interactive') && !tip.contains(e.target) && !e.target.closest('.seat')) hideTip();
  });
  window.addEventListener('resize', hideTip);

  $('#floorSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-floor]'); if (!b) return;
    setFloor(+b.dataset.floor);
  });
  function setFloor(i) {
    if (i === ui.floor) return;
    ui.floor = i; hideTip();
    if (ui.hlSeat && IDX.seat[ui.hlSeat].floor !== i) ui.hlSeat = null;
    resetView(true);
    renderMap();
  }

  /* Ubicar persona / puesto */
  function focusSeat(sid, openPopover) {
    var info = IDX.seat[sid]; if (!info) return;
    if (ui.view !== 'mapa') setView('mapa');
    ui.hlSeat = sid;
    if (info.floor !== ui.floor) { ui.floor = info.floor; resetView(true); }
    renderMap();
    var sr = stage.getBoundingClientRect();
    var s = sr.width < 600 ? 3 : 2.2;
    var target = { s: s, x: 600 - info.s.cx * s, y: 380 - info.s.cy * s };
    if (stage.scrollIntoView && sr.top < 0) stage.scrollIntoView({ block: 'start' });
    animateTo(target, function () { showTip(sid, !!openPopover); });
  }
  function locate(pid) {
    var p = IDX.byId[pid]; if (!p) return;
    var sid = seatOf(p);
    if (!sid) { toast(p.name + ' trabaja en remoto hoy: no tiene puesto en la oficina.', 'warn'); return; }
    $('#mapQ').value = p.name;
    focusSeat(sid, false);
    var stt = statusOf(p);
    if (stt === 'remoto' || stt === 'vacaciones') toast(p.first + ' está ' + (stt === 'remoto' ? 'en remoto' : 'de vacaciones') + ' hoy; este es su puesto.');
    else toast('Ubicando a ' + p.name + ' · ' + whereText(p), 'ok');
  }

  /* Combobox de búsqueda en el mapa */
  (function combo() {
    var input = $('#mapQ'), list = $('#mapList'), items = [], active = -1;
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
    function draw() {
      items = searchPeople(input.value, 8);
      if (!items.length) {
        if (input.value.trim()) { list.innerHTML = '<li aria-disabled="true"><span class="sub">Sin coincidencias</span></li>'; list.hidden = false; input.setAttribute('aria-expanded', 'true'); }
        else close();
        return;
      }
      list.innerHTML = items.map(function (p, i) {
        return '<li role="option" id="opt-' + i + '" data-i="' + i + '" aria-selected="' + (i === active) + '">' + avatar(p, 'xs') + '<span><span class="nm">' + esc(p.name) + '</span><br><span class="sub">' + esc(p.cargo) + '</span></span><span class="where">' + esc(whereText(p)) + '</span></li>';
      }).join('');
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
      if (active >= 0) input.setAttribute('aria-activedescendant', 'opt-' + active);
    }
    function choose(i) { var p = items[i]; if (!p) return; close(); input.value = p.name; locate(p.id); }
    input.addEventListener('input', function () { active = 0; draw(); if (!items.length) active = -1; });
    input.addEventListener('focus', function () { if (input.value.trim()) { input.select(); } });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) draw(); active = Math.min(items.length - 1, active + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? active : 0); }
      else if (e.key === 'Escape') { close(); }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) choose(+li.dataset.i); });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
  })();

  /* ---------- Organigrama ---------- */
  function onode(p, cls) {
    var n = reports(p.id).length;
    return '<button type="button" class="onode ' + (cls || '') + '" style="--c:' + p.color + '" data-open="' + p.id + '" data-pid="' + p.id + '">' + avatar(p, 'sm', true) +
      '<span><span class="nm">' + esc(p.name) + '</span><span class="sub">' + esc(p.cargo) + (n ? ' · ' + n + ' a cargo' : '') + '</span></span></button>';
  }
  function orgList(p) {
    var reps = reports(p.id);
    if (!reps.length) return '';
    return '<ul class="org-list">' + reps.map(function (r) { return '<li>' + onode(r) + orgList(r) + '</li>'; }).join('') + '</ul>';
  }
  function countAll(p) { return reports(p.id).reduce(function (n, r) { return n + 1 + countAll(r); }, 0); }
  function renderOrg() {
    var ceo = C.people.filter(function (p) { return !p.managerId; })[0];
    var direct = reports(ceo.id);
    var staff = direct.filter(function (p) { return !reports(p.id).length && p.area === ceo.area; });
    var heads = direct.filter(function (p) { return staff.indexOf(p) < 0; });
    $('#orgSub').textContent = C.name + ' · ' + C.people.length + ' personas · ' + heads.length + ' áreas';
    var allCollapsed = heads.every(function (h) { return ui.orgCollapsed[h.id]; });
    $('#orgToggleAll').textContent = allCollapsed ? 'Expandir todo' : 'Contraer todo';
    $('#orgWrap').innerHTML = '<div class="org">' +
      '<div class="org-top">' + onode(ceo, 'ceo') + (staff.length ? '<div class="org-staff">' + staff.map(function (s) { return onode(s); }).join('') + '</div>' : '') + '</div>' +
      '<div class="org-vline"></div>' +
      '<div class="org-cols">' + heads.map(function (h) {
        var n = countAll(h), collapsed = !!ui.orgCollapsed[h.id];
        return '<div class="org-col"><div class="org-col-h">' + areaTag(h.area) + onode(h) +
          (n ? '<button type="button" class="org-toggle" data-toggle="' + h.id + '" aria-expanded="' + !collapsed + '" aria-controls="org-' + h.id + '">' + ICON.chev.replace('<svg', '<svg aria-hidden="true"') + n + ' persona' + (n === 1 ? '' : 's') + '</button>' : '') +
          '</div><div id="org-' + h.id + '"' + (collapsed ? ' hidden' : '') + '>' + orgList(h) + '</div></div>';
      }).join('') + '</div></div>';
    applyOrgSearch();
  }
  $('#orgWrap').addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]'); if (!t) return;
    ui.orgCollapsed[t.dataset.toggle] = !ui.orgCollapsed[t.dataset.toggle];
    renderOrg();
  });
  $('#orgToggleAll').addEventListener('click', function () {
    var ceo = C.people.filter(function (p) { return !p.managerId; })[0];
    var heads = reports(ceo.id).filter(function (p) { return reports(p.id).length; });
    var collapse = !heads.every(function (h) { return ui.orgCollapsed[h.id]; });
    heads.forEach(function (h) { ui.orgCollapsed[h.id] = collapse; });
    renderOrg();
  });
  function applyOrgSearch() {
    var q = $('#orgQ').value;
    var hits = q.trim() ? searchPeople(q) : null;
    var ids = {};
    if (hits) hits.forEach(function (p) {
      ids[p.id] = 1;
      // expandir rama
      var m = p;
      while (m.managerId) { var up = IDX.byId[m.managerId]; if (!up.managerId) { if (ui.orgCollapsed[m.id]) { ui.orgCollapsed[m.id] = false; var box = $('#org-' + m.id); if (box) box.hidden = false; var tg = $('[data-toggle="' + m.id + '"]'); if (tg) tg.setAttribute('aria-expanded', 'true'); } } m = up; }
    });
    $$('.onode', $('#orgWrap')).forEach(function (n) {
      n.classList.toggle('match', !!(hits && ids[n.dataset.pid]));
      n.classList.toggle('nomatch', !!(hits && !ids[n.dataset.pid]));
    });
    return hits;
  }
  $('#orgQ').addEventListener('input', function () {
    var hits = applyOrgSearch();
    if (hits && hits.length) {
      var el = $('.onode.match', $('#orgWrap'));
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });

  /* ---------- Recepción / kiosko ---------- */
  function renderReception() {
    $('#kWelcomeCo').textContent = C.name + ' · ' + C.address;
    renderKResults();
    renderKLoc();
    renderVisits();
  }
  function renderKResults() {
    var q = $('#kQ').value, box = $('#kResults');
    if (!q.trim()) { box.innerHTML = '<p class="k-hint">Escribe el nombre de la persona que vienes a visitar. Te mostraremos dónde se encuentra.</p>'; return; }
    var res = searchPeople(q, 6);
    if (!res.length) { box.innerHTML = '<p class="k-hint">No encontramos a nadie con ese nombre. Revisa la ortografía o consulta en recepción.</p>'; return; }
    box.innerHTML = res.map(function (p) {
      var sid = seatOf(p);
      return '<button type="button" class="k-res" data-k="' + p.id + '" aria-pressed="' + (ui.kSel === p.id) + '">' + avatar(p, '', true) + '<span><span class="nm">' + esc(p.name) + '</span><span class="sub">' + esc(p.cargo) + ' · ' + esc(p.area) + '</span></span>' +
        '<span class="where">' + (sid ? C.floors[IDX.seat[sid].floor].name + '<small>' + esc(sid) + '</small>' : 'Remoto<small>' + STATUS[statusOf(p)].label + '</small>') + '</span></button>';
    }).join('');
  }
  function renderKLoc() {
    var box = $('#kLoc');
    var p = ui.kSel ? IDX.byId[ui.kSel] : null;
    if (!p) { box.innerHTML = ''; return; }
    var sid = seatOf(p), st = statusOf(p);
    var info = sid ? IDX.seat[sid] : null;
    var msg;
    if (!sid) msg = '<div class="big">' + esc(p.first) + ' trabaja en remoto</div><p>Podemos avisarle por correo o llamar a su anexo ' + esc(p.ext) + '.</p>';
    else {
      var steps = C.floors[info.floor].num === 1 ? 'Está en este mismo piso' : 'Toma el ascensor al ' + C.floors[info.floor].name.toLowerCase();
      msg = '<div class="big">' + C.floors[info.floor].name + ' · Puesto ' + esc(sid) + '</div><p>' + steps + ' y busca la zona ' + info.cluster.letter + (info.cluster.area ? ' (' + esc(info.cluster.area) + ')' : '') + '.' +
        (st === 'reunion' ? ' Ahora está en reunión.' : st === 'remoto' ? ' Hoy trabaja en remoto.' : st === 'vacaciones' ? ' Está de vacaciones.' : '') + '</p>';
    }
    var map = '';
    if (info) {
      var cx = info.s.cx, cy = info.s.cy, w = 640, h = 380;
      var vx = Math.max(0, Math.min(1200 - w, cx - w / 2)), vy = Math.max(0, Math.min(760 - h, cy - h / 2));
      map = '<svg class="mini-map" viewBox="' + vx + ' ' + vy + ' ' + w + ' ' + h + '" role="img" aria-label="Plano del ' + C.floors[info.floor].name + ' con el puesto ' + esc(sid) + ' destacado">' + floorSVG(info.floor, { static: true, highlight: sid }) + '</svg>';
    }
    box.innerHTML = '<div class="k-loc-card"><div class="k-loc-info">' + avatar(p, 'lg', true) + '<div>' + msg + '</div>' +
      '<div class="k-loc-actions"><button type="button" class="btn primary" data-visit="' + p.id + '">Registrar visita</button>' + (info ? '<button type="button" class="btn" data-locate="' + p.id + '">Abrir mapa</button>' : '') + '</div></div>' + map + '</div>';
  }
  $('#kQ').addEventListener('input', function () { renderKResults(); });
  $('#kQ').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var r = searchPeople(e.target.value, 1)[0]; if (r) { ui.kSel = r.id; renderKResults(); renderKLoc(); } }
  });
  $('#kResults').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]'); if (!b) return;
    ui.kSel = b.dataset.k; renderKResults(); renderKLoc();
    if (window.innerWidth < 1100) $('#kLoc').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
  $('#kLoc').addEventListener('click', function (e) {
    var b = e.target.closest('[data-visit]'); if (!b) return;
    $('#hostSel').value = b.dataset.visit;
    var nm = $('#visitForm [name=name]');
    nm.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    nm.focus({ preventScroll: true });
  });

  function visitsToday() {
    var v = store.visits[C.id];
    if (!v || v.date !== todayKey()) v = store.visits[C.id] = { date: todayKey(), list: [] };
    return v.list;
  }
  function renderVisits() {
    var list = visitsToday();
    var inside = list.filter(function (v) { return !v.out; }).length;
    $('#visitCount').textContent = inside + ' dentro · ' + list.length + ' hoy';
    if (!list.length) { $('#visitList').innerHTML = '<li><span class="sub">Aún no hay visitas registradas hoy.</span></li>'; return; }
    $('#visitList').innerHTML = list.slice().reverse().map(function (v) {
      var host = IDX.byId[v.host];
      return '<li class="' + (v.out ? 'gone' : '') + '"><span class="av sm" style="--c:' + C.brand + '" aria-hidden="true">' + esc(initials(v.name)) + '</span><span><span class="nm">' + esc(v.name) + '</span><span class="sub">' + esc(v.code) + ' · visita a ' + esc(host ? host.name : '—') + ' · ' + esc(v.time) + (v.out ? ' → ' + esc(v.out) : '') + '</span></span>' +
        (v.out ? '<span class="out sub">Salió</span>' : '<span class="out"><button type="button" class="btn sm" data-badge="' + v.id + '">Credencial</button> <button type="button" class="btn sm" data-out="' + v.id + '">Salida</button></span>') + '</li>';
    }).join('');
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  $('#visitList').addEventListener('click', function (e) {
    var o = e.target.closest('[data-out]'), b = e.target.closest('[data-badge]');
    var list = visitsToday();
    if (o) {
      var v = list.filter(function (x) { return x.id === o.dataset.out; })[0];
      if (v) { var d = new Date(); v.out = pad(d.getHours()) + ':' + pad(d.getMinutes()); save(); renderVisits(); toast('Salida registrada: ' + v.name, 'ok'); }
    }
    if (b) { var v2 = list.filter(function (x) { return x.id === b.dataset.badge; })[0]; if (v2) showBadge(v2); }
  });
  $('#visitForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, err = $('#formError');
    var name = f.name.value.trim(), host = f.host.value;
    var email = f.email.value.trim();
    var problem = !name ? ['name', 'Ingresa el nombre completo de la visita.'] :
      !host ? ['host', 'Selecciona a la persona que visitas.'] :
      email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? ['email', 'El correo no parece válido.'] :
      !f.ok.checked ? ['ok', 'Debes aceptar las normas de seguridad.'] : null;
    $$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (problem) { err.textContent = problem[1]; f[problem[0]].setAttribute('aria-invalid', 'true'); f[problem[0]].focus(); return; }
    err.textContent = '';
    var list = visitsToday();
    var d = new Date();
    var v = {
      id: 'v' + Date.now(),
      name: name, doc: f.doc.value.trim(), company: f.company.value.trim(), host: host, reason: f.reason.value, email: email,
      time: pad(d.getHours()) + ':' + pad(d.getMinutes()),
      code: 'V-' + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + String(list.length + 1).padStart(3, '0'),
      out: null
    };
    list.push(v); save();
    f.reset();
    renderVisits();
    showBadge(v);
    toast('Visita registrada. Avisamos a ' + IDX.byId[host].first + '.', 'ok');
  });

  /* QR decorativo (patrón tipo QR, no escaneable) */
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function qrSVG(text) {
    var N = 25, seed = hash(text), cells = [];
    var rnd = function () { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; seed ^= seed >>> 13; return (seed >>> 0) / 4294967296; };
    for (var y = 0; y < N; y++) { cells.push([]); for (var x = 0; x < N; x++) cells[y].push(rnd() < 0.48); }
    function finder(ox, oy) {
      for (var yy = -1; yy <= 7; yy++) for (var xx = -1; xx <= 7; xx++) {
        var X = ox + xx, Y = oy + yy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
        var on = xx >= 0 && xx <= 6 && yy >= 0 && yy <= 6 && (xx === 0 || xx === 6 || yy === 0 || yy === 6 || (xx >= 2 && xx <= 4 && yy >= 2 && yy <= 4));
        cells[Y][X] = on;
      }
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    for (var t = 8; t < N - 8; t++) { cells[6][t] = t % 2 === 0; cells[t][6] = t % 2 === 0; }
    for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) cells[N - 7 + ay][N - 7 + ax] = Math.max(Math.abs(ax), Math.abs(ay)) !== 1;
    var d = '';
    for (var row = 0; row < N; row++) {
      var run = -1;
      for (var col = 0; col <= N; col++) {
        var on2 = col < N && cells[row][col];
        if (on2 && run < 0) run = col;
        if (!on2 && run >= 0) { d += 'M' + run + ' ' + row + 'h' + (col - run) + 'v1h-' + (col - run) + 'z'; run = -1; }
      }
    }
    return '<svg class="badge-qr" viewBox="-2 -2 ' + (N + 4) + ' ' + (N + 4) + '" role="img" aria-label="Código de la credencial"><rect x="-2" y="-2" width="' + (N + 4) + '" height="' + (N + 4) + '" fill="#fff"/><path d="' + d + '" fill="#111827" shape-rendering="crispEdges"/></svg>';
  }
  function showBadge(v) {
    var host = IDX.byId[v.host];
    var hostSeat = host ? seatOf(host) : null;
    var dateStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    $('#badgeBox').innerHTML = '<div class="badge" id="badge">' +
      '<div class="badge-top" style="background:linear-gradient(135deg,' + C.brand + ',' + 'color-mix(in srgb,' + C.brand + ' 60%,#000))"><span class="co"><span>' + esc(C.short) + '</span>' + esc(C.name) + '</span><span class="kind">VISITA</span></div>' +
      '<div class="badge-body"><span class="av lg" style="--c:' + C.brand + '" aria-hidden="true">' + esc(initials(v.name)) + '</span>' +
      '<div class="badge-name">' + esc(v.name) + '</div>' + (v.company ? '<div class="badge-co">' + esc(v.company) + '</div>' : '') +
      '<dl class="badge-dl"><dt>Visita a</dt><dd>' + esc(host ? host.name : '—') + '</dd>' +
      '<dt>Destino</dt><dd>' + (hostSeat ? C.floors[IDX.seat[hostSeat].floor].name + ' · ' + esc(hostSeat) : 'Recepción') + '</dd>' +
      '<dt>Motivo</dt><dd>' + esc(v.reason) + '</dd>' +
      '<dt>Fecha</dt><dd>' + esc(dateStr) + ' · ' + esc(v.time) + '</dd></dl>' +
      qrSVG(v.code + v.name + C.id) + '<div class="badge-code">' + esc(v.code) + '</div></div>' +
      '<div class="badge-foot">Válida solo por hoy · Devuélvela en recepción al salir</div></div>';
    var dlg = $('#badgeDlg');
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); }
    else dlg.setAttribute('open', '');
  }
  $('#badgeDlg').addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target === e.currentTarget) { if (this.close) this.close(); else this.removeAttribute('open'); }
  });
  $('#badgePrint').addEventListener('click', function () {
    document.body.classList.add('printing');
    var done = function () { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  });

  // Modo kiosko
  function setKiosk(on) {
    document.body.classList.toggle('kiosk', on);
    if (on) {
      if (ui.view !== 'recepcion') setView('recepcion');
      var el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(function () { /* opcional */ });
      $('#kQ').focus();
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () { /* */ });
    }
  }
  $('#kioskBtn').addEventListener('click', function () { setKiosk(true); });
  $('#kioskExit').addEventListener('click', function () { setKiosk(false); });

  function tickClock() {
    var d = new Date();
    $('#clock').textContent = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  tickClock(); setInterval(tickClock, 15000);

  /* ---------- Inicio ---------- */
  applyTheme();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', applyTheme);
  }
  var startView = (location.hash || '').replace('#', '');
  ui.view = VIEWS.indexOf(startView) >= 0 ? startView : 'directorio';
  setCompany(store.co || D.companies[0].id, false);
  setView(ui.view);
  window.addEventListener('hashchange', function () {
    var v = location.hash.replace('#', '');
    if (VIEWS.indexOf(v) >= 0 && v !== ui.view) setView(v);
  });
  // Ajustar el encuadre inicial cuando el mapa se muestra por primera vez
  var mapFitted = false;
  var obs = new MutationObserver(function () {
    if (!$('#view-mapa').hidden && !mapFitted && !ui.hlSeat) { mapFitted = true; resetView(true); }
  });
  obs.observe($('#view-mapa'), { attributes: true, attributeFilter: ['hidden'] });
  if (ui.view === 'mapa') { mapFitted = true; resetView(true); }
})();
