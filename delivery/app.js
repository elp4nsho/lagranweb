/* Rayo Express — demo de courier con seguimiento simulado (100% en el navegador). */
(function () {
  'use strict';

  /* ================= Utilidades ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clp = (function () {
    try {
      var f = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
      return function (n) { return f.format(Math.round(n)); };
    } catch (e) { return function (n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }; }
  })();
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function icon(id, cls) { return '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function startOfDay(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }

  /* ================= Datos ================= */
  var COMUNAS = [
    ['Santiago', 'A', -33.4489, -70.6693, 1], ['Providencia', 'A', -33.4263, -70.6110, 1], ['Ñuñoa', 'A', -33.4569, -70.5979, 1],
    ['Las Condes', 'A', -33.4110, -70.5560, 1], ['Vitacura', 'A', -33.3900, -70.5720, 1], ['Recoleta', 'A', -33.4050, -70.6410, 1],
    ['Independencia', 'A', -33.4170, -70.6650, 0], ['Estación Central', 'A', -33.4590, -70.6980, 1], ['San Miguel', 'A', -33.4970, -70.6510, 1],
    ['Macul', 'A', -33.4890, -70.5990, 1], ['La Reina', 'A', -33.4450, -70.5390, 1],
    ['Maipú', 'B', -33.5100, -70.7570, 1], ['La Florida', 'B', -33.5220, -70.5980, 1], ['Peñalolén', 'B', -33.4860, -70.5380, 1],
    ['Lo Barnechea', 'B', -33.3500, -70.5180, 1], ['Huechuraba', 'B', -33.3670, -70.6340, 1], ['Quinta Normal', 'B', -33.4280, -70.6970, 1],
    ['Cerrillos', 'B', -33.4960, -70.7160, 1], ['San Joaquín', 'B', -33.4960, -70.6280, 0], ['Conchalí', 'B', -33.3840, -70.6740, 1],
    ['La Cisterna', 'B', -33.5300, -70.6640, 1], ['Lo Prado', 'B', -33.4440, -70.7250, 0], ['Pedro Aguirre Cerda', 'B', -33.4890, -70.6770, 0],
    ['Puente Alto', 'C', -33.6110, -70.5760, 1], ['San Bernardo', 'C', -33.5920, -70.6990, 1], ['Pudahuel', 'C', -33.4400, -70.7640, 1],
    ['Quilicura', 'C', -33.3580, -70.7280, 1], ['Renca', 'C', -33.4060, -70.7270, 1], ['La Pintana', 'C', -33.5830, -70.6340, 1],
    ['El Bosque', 'C', -33.5620, -70.6760, 1], ['Cerro Navia', 'C', -33.4250, -70.7440, 0], ['La Granja', 'C', -33.5400, -70.6250, 0]
  ].map(function (c) { return { n: c[0], z: c[1], lat: c[2], lng: c[3], lbl: c[4] }; });
  var COM = {}; COMUNAS.forEach(function (c) { COM[c.n] = c; });

  var ZONES = {
    A: { name: 'Zona A · Centro-Oriente', extra: 0, pickup: 20, color: '#FFCF1F' },
    B: { name: 'Zona B · Anillo intermedio', extra: 600, pickup: 30, color: '#FF8A3D' },
    C: { name: 'Zona C · Periferia', extra: 1400, pickup: 45, color: '#8F7CFF' }
  };
  var SIZES = {
    S: { name: 'Sobre', max: '1 kg · documentos', base: 2490, box: [18, 12] },
    M: { name: 'Pequeño', max: '5 kg · caja de zapatos', base: 3490, box: [20, 16] },
    L: { name: 'Mediano', max: '15 kg · caja mudanza', base: 4990, box: [26, 20] },
    XL: { name: 'Grande', max: '30 kg · requiere furgón', base: 7990, box: [32, 24] }
  };
  var SERVICES = {
    estandar: { name: 'Estándar', desc: 'Mismo día', mult: 1, extraPickup: 15 },
    express: { name: 'Express', desc: 'Directo, sin paradas', mult: 1.45, extraPickup: 0 },
    programado: { name: 'Programado', desc: 'Mañana, por bloque', mult: 0.85, extraPickup: 25 }
  };
  var COURIERS = [
    { id: 'c1', name: 'Camila Rojas', vehicle: 'Moto Honda CB125F', plate: 'RXPL21', rating: 4.9, trips: 1284, color: '#FFCF1F', phone: '+56 9 5555 0143', week: [38, 52, 41, 47, 60, 33] },
    { id: 'c2', name: 'Matías Soto', vehicle: 'Bicicleta eléctrica', plate: 'BICI-07', rating: 4.8, trips: 862, color: '#7EE0B5', phone: '+56 9 5555 0178', week: [29, 31, 40, 22, 35, 44] },
    { id: 'c3', name: 'Javiera Muñoz', vehicle: 'Furgón Peugeot Partner', plate: 'KXTR55', rating: 4.95, trips: 2110, color: '#B9A9FF', phone: '+56 9 5555 0112', week: [61, 58, 72, 49, 66, 70] },
    { id: 'c4', name: 'Diego Fuentes', vehicle: 'Moto Yamaha FZ', plate: 'RXDF09', rating: 4.7, trips: 540, color: '#FFB08A', phone: '+56 9 5555 0190', week: [25, 39, 30, 44, 28, 36] }
  ];
  function courier(id) { for (var i = 0; i < COURIERS.length; i++) if (COURIERS[i].id === id) return COURIERS[i]; return COURIERS[0]; }
  function initials(n) { return n.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join(''); }

  var STATUS = [
    { k: 'creado', label: 'Creado', desc: 'Pedido recibido; el repartidor va hacia el retiro', ic: 'box' },
    { k: 'retirado', label: 'Retirado', desc: 'Paquete retirado en origen', ic: 'check' },
    { k: 'en_camino', label: 'En camino', desc: 'Rumbo a la dirección de entrega', ic: 'moto' },
    { k: 'cerca', label: 'Cerca', desc: 'A menos de 5 minutos del destino', ic: 'pin' },
    { k: 'entregado', label: 'Entregado', desc: 'Entregado con firma del receptor', ic: 'pen' }
  ];
  var SPEEDS = [1, 4, 12];
  var PRE = 25, WAIT = 10; // segundos simulados (a 1×)
  var DEMO_CODES = ['RX-48213', 'RX-51027', 'RX-30981'];

  /* ================= Cotización ================= */
  function haversine(a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function quote(from, to, size, service) {
    var a = COM[from], b = COM[to];
    if (!a || !b) return null;
    var km = Math.max(1.8, haversine([a.lat, a.lng], [b.lat, b.lng]) * 1.35);
    km = Math.round(km * 10) / 10;
    var zone = [a.z, b.z].sort().pop();
    var sv = SERVICES[service] || SERVICES.estandar, sz = SIZES[size] || SIZES.M;
    var price = (sz.base + km * 390 + ZONES[zone].extra) * sv.mult;
    price = Math.max(2990, Math.round(price / 10) * 10);
    var pickupMin = ZONES[a.z].pickup + sv.extraPickup;
    var transitMin = Math.round(6 + km * (service === 'express' ? 2.1 : 2.7) * (size === 'XL' ? 1.15 : 1));
    return { km: km, zone: zone, price: price, pickupMin: pickupMin, transitMin: transitMin, totalMin: pickupMin + 4 + transitMin };
  }

  /* ================= Almacenamiento ================= */
  var KEY = 'rayoexpress.v1';
  var memStore = null;
  function loadDB() {
    try { var s = window.localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* sin storage */ }
    return memStore ? JSON.parse(memStore) : null;
  }
  function saveDB() {
    var s = JSON.stringify(db);
    memStore = s;
    try { window.localStorage.setItem(KEY, s); } catch (e) { /* modo privado o lleno */ }
  }
  var db = loadDB();
  if (!db || typeof db !== 'object' || !db.orders) db = { orders: {}, mine: [], driverId: 'c1', online: {}, seededAt: 0 };
  db.mine = db.mine || []; db.online = db.online || {};

  /* ================= Rutas y simulación ================= */
  function jitter(c, r, amt) { return [c.lat + (r() - 0.5) * amt, c.lng + (r() - 0.5) * amt]; }
  function staircase(a, b, r, steps) {
    var pts = [a.slice()], cur = a.slice();
    for (var i = 1; i <= steps; i++) {
      var f = i / steps;
      var t = i === steps ? b.slice() : [a[0] + (b[0] - a[0]) * f + (r() - 0.5) * 0.006, a[1] + (b[1] - a[1]) * f + (r() - 0.5) * 0.006];
      if (i % 2) { cur = [cur[0], t[1]]; pts.push(cur.slice()); cur = [t[0], t[1]]; }
      else { cur = [t[0], cur[1]]; pts.push(cur.slice()); cur = [t[0], t[1]]; }
      pts.push(cur.slice());
    }
    return pts;
  }
  function plen(a, b) { var k = Math.cos(a[0] * Math.PI / 180); var dx = (b[1] - a[1]) * k, dy = b[0] - a[0]; return Math.sqrt(dx * dx + dy * dy); }
  function along(pts, f) {
    f = clamp(f, 0, 1);
    var total = 0, i, segs = [];
    for (i = 1; i < pts.length; i++) { var l = plen(pts[i - 1], pts[i]); segs.push(l); total += l; }
    var target = total * f, acc = 0;
    for (i = 0; i < segs.length; i++) {
      if (acc + segs[i] >= target) {
        var t = segs[i] ? (target - acc) / segs[i] : 0, p = pts[i], q = pts[i + 1];
        return { pos: [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], idx: i };
      }
      acc += segs[i];
    }
    return { pos: pts[pts.length - 1].slice(), idx: pts.length - 2 };
  }

  function thresholds(o) { var t = o.sim.transit; return [0, PRE, PRE + WAIT, PRE + WAIT + t * 0.8, PRE + WAIT + t]; }
  function realTh(o) { var p = o.pickupMin, t = o.transitMin; return [0, p, p + 4, p + 4 + t * 0.8, p + 4 + t]; }
  function elapsed(o, now) {
    if (o.driverState === 'pendiente') return 0;
    var th = thresholds(o);
    return clamp(o.sim.base + Math.max(0, (now || Date.now()) - o.sim.anchor) / 1000 * o.sim.speed, 0, th[4]);
  }
  function statusIdx(o, e) {
    if (e == null) e = elapsed(o);
    var th = thresholds(o), i = 0;
    for (var k = 0; k < 5; k++) if (e >= th[k] - 1e-6) i = k;
    return i;
  }
  function simToReal(o, e) { // minutos "realistas" desde el inicio de la simulación
    var th = thresholds(o), R = realTh(o);
    for (var k = 0; k < 4; k++) {
      if (e <= th[k + 1]) return R[k] + (e - th[k]) / (th[k + 1] - th[k]) * (R[k + 1] - R[k]);
    }
    return R[4];
  }
  function eventTime(o, i) { return i === 0 ? o.createdAt : o.clock0 + realTh(o)[i] * 60000; }
  function courierPos(o, e) {
    if (o.driverState === 'pendiente') return o.pre[0];
    if (e < PRE) return along(o.pre, e / PRE).pos;
    if (e < PRE + WAIT) return o.pickup;
    return along(o.route, (e - PRE - WAIT) / o.sim.transit).pos;
  }
  function rebase(o, now) { o.sim.base = elapsed(o, now); o.sim.anchor = now; }
  function setSpeed(o, s) { var now = Date.now(); rebase(o, now); o.sim.speed = s; }
  function jumpTo(o, idx) {
    var now = Date.now();
    if (o.driverState === 'pendiente') accept(o, now);
    var th = thresholds(o);
    o.sim.base = idx >= 4 ? th[4] : th[idx] + 0.01;
    o.sim.anchor = now;
  }
  function accept(o, now) {
    o.driverState = 'aceptado'; o.acceptedAt = now; o.autoAcceptAt = null;
    o.sim.base = 0; o.sim.anchor = now; o.clock0 = now;
  }

  function newCode() {
    var c;
    do { c = 'RX-' + (10000 + Math.floor(Math.random() * 90000)); } while (db.orders[c]);
    return c;
  }
  function buildOrder(d, code) {
    var q = quote(d.from, d.to, d.size, d.service);
    var r = rng(code);
    var pickup = jitter(COM[d.from], r, 0.012), drop = jitter(COM[d.to], r, 0.012);
    if (d.from === d.to) drop = [pickup[0] + 0.012, pickup[1] - 0.014];
    var start = [pickup[0] + (r() - 0.5) * 0.03, pickup[1] + (r() - 0.5) * 0.03];
    var steps = clamp(3 + Math.floor(q.km / 3), 3, 7);
    var now = Date.now();
    return {
      code: code, demo: !!d.demo, createdAt: now, clock0: now,
      sender: { name: d.sname, phone: d.sphone, addr: d.saddr, comuna: d.from },
      receiver: { name: d.rname, phone: d.rphone, addr: d.raddr, comuna: d.to },
      size: d.size, service: d.service, notes: d.notes || '',
      km: q.km, zone: q.zone, price: q.price, pickupMin: q.pickupMin, transitMin: q.transitMin,
      tip: d.tip || 0,
      courierId: d.courierId || db.driverId || 'c1',
      driverState: 'pendiente', autoAcceptAt: now + 12000, acceptedAt: null, rejectedBy: [],
      pickup: pickup, drop: drop, pre: staircase(start, pickup, r, 2), route: staircase(pickup, drop, r, steps),
      sim: { base: 0, anchor: now, speed: 1, transit: clamp(Math.round(60 + q.km * 7), 70, 220) },
      chat: [], pod: null
    };
  }

  function seedDemo() {
    var now = Date.now();
    Object.keys(db.orders).forEach(function (k) { if (db.orders[k].demo) delete db.orders[k]; });
    var sod = startOfDay(now);
    function mk(code, d, state, e0, minsAgo) {
      d.demo = true;
      var o = buildOrder(d, code);
      if (state === 'pendiente') { o.autoAcceptAt = null; db.orders[code] = o; return o; }
      o.driverState = 'aceptado';
      var th = thresholds(o);
      var e = e0 === 'end' ? th[4] : e0;
      o.sim.base = e; o.sim.anchor = now;
      if (e0 === 'end') {
        o.clock0 = Math.max(sod + 60000, now - (minsAgo + realTh(o)[4]) * 60000);
        o.pod = { name: d.rname, sig: 'auto', t: o.clock0 + realTh(o)[4] * 60000 };
      } else {
        o.clock0 = now - simToReal(o, e) * 60000;
      }
      o.acceptedAt = o.clock0; o.createdAt = o.clock0 - 90000;
      db.orders[code] = o;
      return o;
    }
    var o1 = mk('RX-48213', { from: 'Ñuñoa', to: 'Vitacura', size: 'M', service: 'express', sname: 'Librería Andes', sphone: '+56 9 4444 1020', saddr: 'Irarrázaval 3150', rname: 'Valentina Pérez', rphone: '+56 9 4444 2233', raddr: 'Av. Vitacura 5480, depto 1203', notes: 'Dejar en conserjería si no estoy', courierId: 'c1', tip: 1000 }, 'aceptado', 0);
    o1.sim.base = PRE + WAIT + o1.sim.transit * 0.38; o1.clock0 = now - simToReal(o1, o1.sim.base) * 60000; o1.acceptedAt = o1.clock0; o1.createdAt = o1.clock0 - 90000;
    o1.chat = [
      { from: 'sys', text: 'Chat simulado con tu repartidor.', t: now - 600000 },
      { from: 'them', text: '¡Hola Valentina! Ya retiré tu pedido en Librería Andes, voy en camino.', t: now - 420000 }
    ];
    mk('RX-51027', { from: 'Santiago', to: 'Providencia', size: 'S', service: 'estandar', sname: 'Notaría Mapocho', sphone: '+56 2 2600 1111', saddr: 'Huérfanos 1160, of. 402', rname: 'Andrés Lagos', rphone: '+56 9 4444 7788', raddr: 'Av. Nueva Providencia 2155', courierId: 'c1' }, 'aceptado', 6);
    mk('RX-30981', { from: 'Las Condes', to: 'La Reina', size: 'L', service: 'estandar', sname: 'Tienda Nómade', sphone: '+56 9 4444 5566', saddr: 'Apoquindo 4400', rname: 'Josefina Rivas', rphone: '+56 9 4444 9900', raddr: 'Príncipe de Gales 6820', courierId: 'c1', tip: 1500 }, 'aceptado', 'end', 25);
    mk('RX-27764', { from: 'Providencia', to: 'Santiago', size: 'S', service: 'express', sname: 'Estudio Pino', sphone: '+56 9 4444 0001', saddr: 'Suecia 84', rname: 'Ignacio Vera', rphone: '+56 9 4444 0002', raddr: 'Agustinas 1070', courierId: 'c1' }, 'aceptado', 'end', 110);
    mk('RX-29115', { from: 'Macul', to: 'Ñuñoa', size: 'M', service: 'estandar', sname: 'Panadería Trigal', sphone: '+56 9 4444 0003', saddr: 'Av. Macul 2890', rname: 'Carla Soto', rphone: '+56 9 4444 0004', raddr: 'Av. Grecia 1420', courierId: 'c1', tip: 500 }, 'aceptado', 'end', 190);
    mk('RX-62750', { from: 'Recoleta', to: 'Las Condes', size: 'M', service: 'express', sname: 'Ferretería Bellavista', sphone: '+56 9 4444 0005', saddr: 'Pío Nono 210', rname: 'Martina Olave', rphone: '+56 9 4444 0006', raddr: 'Isidora Goyenechea 3000', courierId: 'c1' }, 'pendiente');
    mk('RX-55408', { from: 'Maipú', to: 'Estación Central', size: 'L', service: 'estandar', sname: 'Distribuidora Sur', sphone: '+56 9 4444 0007', saddr: 'Av. Pajaritos 2400', rname: 'Rocío Díaz', rphone: '+56 9 4444 0008', raddr: 'Av. Ecuador 3600', courierId: 'c2' }, 'aceptado', PRE + WAIT + 20);
    db.seededAt = now;
    saveDB();
  }
  if (!db.seededAt || Date.now() - db.seededAt > 20 * 60000 || !db.orders['RX-48213']) seedDemo();

  /* Avance automático: auto-aceptación y prueba de entrega */
  function housekeeping() {
    var now = Date.now(), changed = false;
    Object.keys(db.orders).forEach(function (k) {
      var o = db.orders[k];
      if (o.driverState === 'pendiente' && o.autoAcceptAt && now >= o.autoAcceptAt) {
        accept(o, now); changed = true;
        if (k === currentCode || currentView === 'panel') toast('bolt', o.code + ' asignado a ' + courier(o.courierId).name);
      }
      if (o.driverState !== 'pendiente' && !o.pod && statusIdx(o) === 4) {
        o.pod = { name: o.receiver.name, sig: null, t: eventTime(o, 4) }; changed = true;
      }
    });
    if (changed) saveDB();
  }

  /* ================= Toasts ================= */
  function toast(ic, msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>';
    var box = $('#toasts'); box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 320); }, 3200);
  }

  /* ================= Formularios comunes ================= */
  function fillComunas() {
    $$('select[data-comunas]').forEach(function (sel) {
      var ph = sel.getAttribute('data-placeholder');
      var html = ph ? '<option value="">' + esc(ph) + '</option>' : '';
      ['A', 'B', 'C'].forEach(function (z) {
        html += '<optgroup label="' + esc(ZONES[z].name) + '">';
        COMUNAS.filter(function (c) { return c.z === z; }).sort(function (a, b) { return a.n.localeCompare(b.n, 'es'); })
          .forEach(function (c) { html += '<option value="' + esc(c.n) + '">' + esc(c.n) + '</option>'; });
        html += '</optgroup>';
      });
      sel.innerHTML = html;
    });
  }
  function buildSizes() {
    $$('[data-sizes]').forEach(function (box) {
      var name = box.getAttribute('data-sizes');
      box.innerHTML = Object.keys(SIZES).map(function (k, i) {
        var s = SIZES[k], id = name + '-' + k;
        return '<div class="sizeopt"><input type="radio" name="' + name + '" id="' + id + '" value="' + k + '"' + (k === 'M' ? ' checked' : '') + '>' +
          '<label for="' + id + '"><span class="box" style="width:' + s.box[0] + 'px;height:' + s.box[1] + 'px"></span><b>' + s.name + '</b><small>' + s.max + '</small></label></div>';
      }).join('');
    });
    $$('[data-services]').forEach(function (box) {
      var name = box.getAttribute('data-services');
      box.setAttribute('role', 'radiogroup');
      box.innerHTML = Object.keys(SERVICES).map(function (k) {
        var s = SERVICES[k], id = name + '-' + k;
        return '<div class="seg__opt"><input type="radio" name="' + name + '" id="' + id + '" value="' + k + '"' + (k === 'estandar' ? ' checked' : '') + '><label for="' + id + '">' + s.name + '<small>' + s.desc + '</small></label></div>';
      }).join('');
    });
  }
  function radioVal(name) { var r = $('input[name="' + name + '"]:checked'); return r ? r.value : null; }
  function setRadio(name, v) { var r = $('input[name="' + name + '"][value="' + v + '"]'); if (r) r.checked = true; }

  /* ================= Landing: calculadora ================= */
  function initLanding() {
    $('#rate-rows').innerHTML = Object.keys(SIZES).map(function (k) { var s = SIZES[k]; return '<tr><td><b>' + s.name + '</b></td><td>' + s.max + '</td><td>' + clp(s.base) + '</td></tr>'; }).join('');
    $('#calc-from').value = 'Providencia'; $('#calc-to').value = 'Las Condes';
    var calc = $('#calc');
    function update() {
      var q = quote($('#calc-from').value, $('#calc-to').value, radioVal('calc-size'), radioVal('calc-service'));
      if (!q) return;
      var sv = radioVal('calc-service');
      var when = sv === 'programado' ? 'Mañana' : '~' + q.totalMin + ' min';
      $('#calc-out').innerHTML =
        '<div class="q-price"><div class="q-k">Precio final</div><div class="q-v">' + clp(q.price) + '</div></div>' +
        '<div><div class="q-k">Distancia</div><div class="q-v">' + q.km.toString().replace('.', ',') + ' km</div></div>' +
        '<div><div class="q-k">Entrega</div><div class="q-v">' + when + '</div></div>' +
        '<p class="q-note">Retiro en ~' + q.pickupMin + ' min · ' + ZONES[q.zone].name + (ZONES[q.zone].extra ? ' (recargo ' + clp(ZONES[q.zone].extra) + ')' : ' (sin recargo)') + '</p>';
    }
    calc.addEventListener('change', update);
    $('#calc-swap').addEventListener('click', function () { var a = $('#calc-from').value; $('#calc-from').value = $('#calc-to').value; $('#calc-to').value = a; update(); });
    $('#calc-go').addEventListener('click', function () {
      $('#f-from').value = $('#calc-from').value; $('#f-to').value = $('#calc-to').value;
      setRadio('size', radioVal('calc-size')); setRadio('service', radioVal('calc-service'));
      updateSummary();
      location.hash = '#solicitar';
    });
    update();

    // Cobertura
    $('#zones').innerHTML = ['A', 'B', 'C'].map(function (z) {
      var list = COMUNAS.filter(function (c) { return c.z === z; }).map(function (c) { return c.n; });
      return '<li class="zone"><span class="zone__sw" style="background:' + ZONES[z].color + '"></span><div><b>' + ZONES[z].name + '</b><small>' + list.length + ' comunas · retiro en ~' + ZONES[z].pickup + ' min · ' + esc(list.slice(0, 4).join(', ')) + '…</small></div><span class="zone__p">' + (ZONES[z].extra ? '+' + clp(ZONES[z].extra) : 'Sin recargo') + '</span></li>';
    }).join('');
    drawCoverage();
    $('#cov-sel').addEventListener('change', function () {
      var c = COM[this.value];
      $$('#cov-map .cm').forEach(function (el) { el.classList.toggle('hl', el.getAttribute('data-n') === (c && c.n)); });
      $('#cov-res').textContent = c ? '¡Sí llegamos a ' + c.n + '! ' + ZONES[c.z].name + (ZONES[c.z].extra ? ', recargo ' + clp(ZONES[c.z].extra) + '.' : ', sin recargo.') : '';
    });

    $('#hero-track').addEventListener('submit', function (e) { e.preventDefault(); goTrack($('#hero-code').value); });
    $$('[data-demo]').forEach(function (b) { b.addEventListener('click', function () { goTrack(b.getAttribute('data-demo')); }); });
  }

  var MAPOCHO = [[-33.372, -70.505], [-33.386, -70.545], [-33.398, -70.575], [-33.415, -70.605], [-33.425, -70.628], [-33.430, -70.650], [-33.432, -70.675], [-33.438, -70.700], [-33.446, -70.730], [-33.452, -70.770], [-33.46, -70.80]];
  function drawCoverage() {
    var W = 600, H = 560, b = { s: -33.63, n: -33.33, w: -70.80, e: -70.49 };
    var k = Math.cos(-33.47 * Math.PI / 180);
    var sc = Math.min((W - 40) / ((b.e - b.w) * k), (H - 40) / (b.n - b.s));
    var cx = (b.e + b.w) / 2, cy = (b.n + b.s) / 2;
    function P(lat, lng) { return [W / 2 + (lng - cx) * k * sc, H / 2 - (lat - cy) * sc]; }
    var s = '<title id="cov-title">Mapa de cobertura de Rayo Express en Santiago por zonas</title>';
    s += '<defs><pattern id="cg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" fill="none" stroke="rgba(255,255,255,.05)"/></pattern></defs><rect width="600" height="560" fill="url(#cg)"/>';
    // halos de zonas
    ['C', 'B', 'A'].forEach(function (z) {
      COMUNAS.filter(function (c) { return c.z === z; }).forEach(function (c) { var p = P(c.lat, c.lng); s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="40" fill="' + ZONES[z].color + '" opacity=".08"/>'; });
    });
    s += '<polyline points="' + MAPOCHO.map(function (q) { return P(q[0], q[1]).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ') + '" fill="none" stroke="#5aa9ff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>';
    var hq = P(-33.4263, -70.6110);
    COMUNAS.forEach(function (c) {
      var p = P(c.lat, c.lng);
      s += '<g><circle class="cm" data-n="' + esc(c.n) + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (c.z === 'A' ? 9 : 8) + '" fill="' + ZONES[c.z].color + '"><title>' + esc(c.n) + ' · ' + ZONES[c.z].name + '</title></circle>';
      if (c.lbl) s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 21).toFixed(1) + '" text-anchor="middle">' + esc(c.n) + '</text>';
      s += '</g>';
    });
    s += '<g transform="translate(' + hq[0].toFixed(1) + ',' + (hq[1] - 30).toFixed(1) + ')"><rect x="-44" y="-13" width="88" height="22" rx="11" fill="#fff"/><text x="0" y="3" text-anchor="middle" style="fill:#14161c;stroke:none;font-weight:800">Base Rayo</text></g>';
    s += '<text x="20" y="540" style="font-size:10px;fill:#8a8fa0;stroke:none">Mapa esquemático · río Mapocho en azul</text>';
    $('#cov-map').innerHTML = s;
  }

  /* ================= Solicitar ================= */
  function formData() {
    var f = $('#order-form');
    return {
      sname: f.sname.value.trim(), sphone: f.sphone.value.trim(), saddr: f.saddr.value.trim(), from: f.from.value,
      rname: f.rname.value.trim(), rphone: f.rphone.value.trim(), raddr: f.raddr.value.trim(), to: f.to.value,
      size: radioVal('size') || 'M', service: radioVal('service') || 'estandar', notes: f.notes.value.trim()
    };
  }
  function updateSummary() {
    var d = formData(), q = quote(d.from, d.to, d.size, d.service);
    if (!q) return;
    $('#summary').innerHTML = '<h2>Resumen del envío</h2>' +
      '<div class="summary__route"><i></i><div><b>' + esc(d.from) + '</b><br><small class="muted">' + esc(d.saddr || 'Dirección de retiro') + '</small></div><i class="b"></i><div><b>' + esc(d.to) + '</b><br><small class="muted">' + esc(d.raddr || 'Dirección de entrega') + '</small></div></div>' +
      '<dl><dt>Paquete</dt><dd>' + SIZES[d.size].name + '</dd><dt>Servicio</dt><dd>' + SERVICES[d.service].name + '</dd><dt>Distancia</dt><dd>' + q.km.toString().replace('.', ',') + ' km</dd><dt>Retiro</dt><dd>~' + q.pickupMin + ' min</dd><dt>Entrega estimada</dt><dd>' + (d.service === 'programado' ? 'Mañana' : '~' + q.totalMin + ' min') + '</dd></dl>' +
      '<div class="summary__total"><span>Total</span><strong>' + clp(q.price) + '</strong></div>';
    $('#f-total-btn').textContent = '· ' + clp(q.price);
  }
  function initForm() {
    var f = $('#order-form');
    f.from.value = 'Providencia'; f.to.value = 'Las Condes';
    f.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); updateSummary(); });
    f.addEventListener('change', updateSummary);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      $$('[required]', f).forEach(function (el) {
        var v = el.value.trim(), ok = !!v;
        if (ok && el.type === 'tel') ok = v.replace(/\D/g, '').length >= 8;
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) { bad.push(el); el.setAttribute('aria-describedby', 'form-err'); }
      });
      if (bad.length) {
        $('#form-err').textContent = 'Revisa ' + bad.length + (bad.length === 1 ? ' campo marcado' : ' campos marcados') + ' (los teléfonos necesitan al menos 8 dígitos).';
        bad[0].focus();
        return;
      }
      $('#form-err').textContent = '';
      var d = formData();
      var code = newCode();
      var o = buildOrder(d, code);
      db.orders[code] = o;
      db.mine = [code].concat(db.mine.filter(function (c) { return c !== code; })).slice(0, 6);
      saveDB();
      showSuccess(o);
    });
  }
  function showSuccess(o) {
    $('#order-form').hidden = true; $('.sol__side').hidden = true;
    var s = $('#order-success');
    s.hidden = false;
    s.innerHTML = '<div class="success__icon">' + icon('check') + '</div>' +
      '<h2>¡Envío creado!</h2><p class="muted">Tu código de seguimiento es</p>' +
      '<div class="codebig"><span id="new-code">' + o.code + '</span><button class="iconbtn" type="button" id="copy-code" aria-label="Copiar código">' + icon('copy') + '</button></div>' +
      '<p>Total ' + clp(o.price) + ' · ' + esc(o.sender.comuna) + ' → ' + esc(o.receiver.comuna) + '<br><span class="muted">' + esc(courier(o.courierId).name) + ' recibió tu solicitud y la confirmará en segundos.</span></p>' +
      '<div class="success__actions"><a class="btn btn--primary btn--lg" href="#rastrear/' + o.code + '">Rastrear ahora ' + icon('arrow') + '</a><button class="btn btn--ghost btn--lg" type="button" id="new-order">Crear otro envío</button></div>';
    s.focus();
    $('#copy-code').addEventListener('click', function () {
      var done = function () { toast('copy', 'Código ' + o.code + ' copiado'); };
      try { navigator.clipboard.writeText(o.code).then(done, done); } catch (e) { done(); }
    });
    $('#new-order').addEventListener('click', function () {
      s.hidden = true; $('#order-form').hidden = false; $('.sol__side').hidden = false;
      $('#order-form').reset(); $('#f-from').value = 'Providencia'; $('#f-to').value = 'Las Condes'; setRadio('size', 'M'); setRadio('service', 'estandar');
      updateSummary(); $('#f-sname').focus();
    });
  }

  /* ================= Mapa (Leaflet + respaldo SVG) ================= */
  function TrackMap() {
    this.lEl = $('#map-leaflet'); this.sEl = $('#map-svg'); this.note = $('#map-note');
    this.mode = (window.L && typeof window.L.map === 'function') ? 'leaflet' : 'svg';
    this.order = null;
    if (this.mode === 'leaflet') {
      try { this.initLeaflet(); } catch (e) { this.mode = 'svg'; }
    }
    this.applyMode();
  }
  TrackMap.prototype.applyMode = function () {
    var svg = this.mode === 'svg';
    this.lEl.hidden = svg; this.sEl.hidden = !svg; this.note.hidden = !svg;
  };
  TrackMap.prototype.initLeaflet = function () {
    var self = this, L = window.L;
    this.lmap = L.map(this.lEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    this.lmap.setView([-33.44, -70.62], 12);
    var ok = false, errs = 0;
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; colaboradores de OpenStreetMap' });
    tiles.on('tileload', function () { ok = true; });
    tiles.on('tileerror', function () { errs++; if (!ok && errs >= 4) self.fallback(); });
    tiles.addTo(this.lmap);
    this.fbTimer = setTimeout(function () { if (!ok) self.fallback(); }, 6000);
    function ic(cls, html, size) { return L.divIcon({ className: 'mkwrap', html: '<div class="mk ' + cls + '">' + html + '</div>', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }); }
    this.icA = ic('mk--a', 'A', 30); this.icB = ic('mk--b', 'B', 30);
    this.icC = ic('mk--c', '<svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>', 42);
  };
  TrackMap.prototype.fallback = function () {
    if (this.mode === 'svg') return;
    clearTimeout(this.fbTimer);
    try { this.lmap.remove(); } catch (e) { /* noop */ }
    this.lmap = null; this.mode = 'svg'; this.applyMode();
    if (this.order) { var o = this.order; this.order = null; this.setOrder(o); this.update(o); }
  };
  TrackMap.prototype.setOrder = function (o) {
    if (this.order && this.order.code === o.code && this.lastCourier === o.courierId) return;
    this.order = o; this.lastCourier = o.courierId;
    if (this.mode === 'leaflet') {
      var L = window.L, m = this.lmap;
      if (this.layer) m.removeLayer(this.layer);
      this.layer = L.layerGroup().addTo(m);
      L.polyline(o.pre, { color: '#14161c', weight: 3, opacity: 0.45, dashArray: '4 8' }).addTo(this.layer);
      L.polyline(o.route, { color: '#14161c', weight: 7, opacity: 0.18 }).addTo(this.layer);
      L.polyline(o.route, { color: '#14161c', weight: 3, opacity: 0.6, dashArray: '6 8' }).addTo(this.layer);
      this.done = L.polyline([o.pickup], { color: '#FFCF1F', weight: 6, opacity: 1 }).addTo(this.layer);
      L.marker(o.pickup, { icon: this.icA, title: 'Retiro: ' + o.sender.comuna, keyboard: false }).addTo(this.layer);
      L.marker(o.drop, { icon: this.icB, title: 'Entrega: ' + o.receiver.comuna, keyboard: false }).addTo(this.layer);
      this.cm = L.marker(o.pre[0], { icon: this.icC, zIndexOffset: 1000, title: 'Repartidor', keyboard: false }).addTo(this.layer);
      m.invalidateSize();
      m.fitBounds(L.latLngBounds(o.pre.concat(o.route)), { padding: [36, 36] });
    } else {
      this.buildSvg(o);
    }
  };
  TrackMap.prototype.buildSvg = function (o) {
    var W = this.sEl.clientWidth || 800, H = this.sEl.clientHeight || 520;
    var pts = o.pre.concat(o.route);
    var la = pts.map(function (p) { return p[0]; }), ln = pts.map(function (p) { return p[1]; });
    var s0 = Math.min.apply(null, la), n0 = Math.max.apply(null, la), w0 = Math.min.apply(null, ln), e0 = Math.max.apply(null, ln);
    var k = Math.cos((s0 + n0) / 2 * Math.PI / 180);
    var sc = Math.min((W * 0.78) / Math.max((e0 - w0) * k, 0.004), (H * 0.74) / Math.max(n0 - s0, 0.004));
    var cx = (e0 + w0) / 2, cy = (s0 + n0) / 2;
    var P = function (p) { return [W / 2 + (p[1] - cx) * k * sc, H / 2 - (p[0] - cy) * sc]; };
    var pstr = function (arr) { return arr.map(function (p) { var q = P(p); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); };
    this.P = P;
    var latMin = cy - (H / 2) / sc, latMax = cy + (H / 2) / sc, lngMin = cx - (W / 2) / (k * sc), lngMax = cx + (W / 2) / (k * sc);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa simplificado de la ruta del repartidor"><rect width="' + W + '" height="' + H + '" fill="#ebe7da"/>';
    var step = 0.0045, i = 0, v, q;
    for (v = Math.floor(latMin / step) * step; v < latMax; v += step, i++) { q = P([v, lngMin]); s += '<line x1="0" x2="' + W + '" y1="' + q[1].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="#fff" stroke-width="' + (i % 4 ? 3 : 7) + '"/>'; }
    for (i = 0, v = Math.floor(lngMin / step) * step; v < lngMax; v += step, i++) { q = P([latMin, v]); s += '<line y1="0" y2="' + H + '" x1="' + q[0].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" stroke="#fff" stroke-width="' + (i % 4 ? 3 : 7) + '"/>'; }
    var cerro = P([-33.425, -70.633]), r0 = 0.011 * sc;
    s += '<circle cx="' + cerro[0].toFixed(1) + '" cy="' + cerro[1].toFixed(1) + '" r="' + r0.toFixed(1) + '" fill="#cfe3c0" opacity=".9"/>';
    s += '<polyline points="' + pstr(MAPOCHO) + '" fill="none" stroke="#9cc8f0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
    COMUNAS.forEach(function (c) {
      if (c.lat > latMin && c.lat < latMax && c.lng > lngMin && c.lng < lngMax) { var p = P([c.lat, c.lng]); s += '<text x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="13" font-weight="700" fill="#9a937f" letter-spacing="1">' + esc(c.n.toUpperCase()) + '</text>'; }
    });
    s += '<polyline points="' + pstr(o.pre) + '" fill="none" stroke="#14161c" stroke-opacity=".45" stroke-width="3" stroke-dasharray="4 8"/>';
    s += '<polyline points="' + pstr(o.route) + '" fill="none" stroke="#14161c" stroke-opacity=".18" stroke-width="9" stroke-linejoin="round"/>';
    s += '<polyline points="' + pstr(o.route) + '" fill="none" stroke="#14161c" stroke-opacity=".6" stroke-width="3" stroke-dasharray="6 8" stroke-linejoin="round"/>';
    s += '<polyline id="svg-done" points="" fill="none" stroke="#FFCF1F" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
    var a = P(o.pickup), b = P(o.drop);
    s += '<g transform="translate(' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ')"><circle r="15" fill="#14161c" stroke="#fff" stroke-width="3"/><text y="5" text-anchor="middle" fill="#fff" font-weight="800" font-size="14" font-family="sans-serif">A</text></g>';
    s += '<g transform="translate(' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + ')"><circle r="15" fill="#FFCF1F" stroke="#14161c" stroke-width="3"/><text y="5" text-anchor="middle" fill="#14161c" font-weight="800" font-size="14" font-family="sans-serif">B</text></g>';
    s += '<g id="svg-courier"><circle r="20" fill="none" stroke="#FFCF1F" stroke-width="3"><animate attributeName="r" values="16;30" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite"/></circle><circle r="19" fill="#FFCF1F" stroke="#14161c" stroke-width="3"/><path d="M2 -10 -7 2h6l-1 8 9-11H1l1-9z" fill="#14161c"/></g>';
    s += '</svg>';
    this.sEl.innerHTML = s;
  };
  TrackMap.prototype.update = function (o) {
    if (!this.order) return;
    var e = elapsed(o), pos = courierPos(o, e), done = [];
    if (o.driverState !== 'pendiente' && e >= PRE + WAIT) {
      var a = along(o.route, (e - PRE - WAIT) / o.sim.transit);
      done = o.route.slice(0, a.idx + 1).concat([a.pos]);
    }
    if (this.mode === 'leaflet' && this.lmap) {
      this.cm.setLatLng(pos);
      this.done.setLatLngs(done.length ? done : [o.pickup]);
    } else if (this.P) {
      var P = this.P, c = P(pos), g = $('#svg-courier'), d = $('#svg-done');
      if (g) g.setAttribute('transform', 'translate(' + c[0].toFixed(1) + ',' + c[1].toFixed(1) + ')');
      if (d) d.setAttribute('points', done.map(function (p) { var q = P(p); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '));
    }
  };
  TrackMap.prototype.refresh = function () {
    if (this.mode === 'leaflet' && this.lmap) this.lmap.invalidateSize();
    else if (this.order) { var o = this.order; this.order = null; this.setOrder(o); this.update(o); }
  };

  /* ================= Rastrear ================= */
  var currentView = null, currentCode = null, trackKey = '', tmap = null;

  function normCode(v) {
    v = String(v || '').toUpperCase().replace(/\s+/g, '');
    var m = v.match(/(\d{5})$/);
    return m ? 'RX-' + m[1] : v;
  }
  function goTrack(v) { var c = normCode(v); location.hash = c ? '#rastrear/' + encodeURIComponent(c) : '#rastrear'; }

  function renderChips() {
    var codes = DEMO_CODES.concat(db.mine.filter(function (c) { return DEMO_CODES.indexOf(c) < 0 && db.orders[c]; }).slice(0, 4));
    $('#demochips').innerHTML = '<span class="muted">Códigos de prueba:</span>' + codes.map(function (c) {
      var o = db.orders[c]; if (!o) return '';
      var st = o.driverState === 'pendiente' ? 'Por confirmar' : STATUS[statusIdx(o)].label;
      return '<button type="button" class="chip" data-code="' + c + '"' + (c === currentCode ? ' aria-current="true"' : '') + '><span class="mono">' + c + '</span><small>' + (DEMO_CODES.indexOf(c) < 0 ? 'Tuyo · ' : '') + st + '</small></button>';
    }).join('');
  }

  function openTrack(code) {
    currentCode = code;
    $('#track-code').value = code || '';
    renderChips();
    var o = code && db.orders[code];
    if (!o) {
      $('#track-result').hidden = true;
      $('#track-empty').innerHTML = code
        ? '<div class="empty">' + icon('search') + '<h2>No encontramos ' + esc(code) + '</h2><p class="muted">Revisa el código o prueba con uno de los códigos de ejemplo.</p></div>'
        : '<div class="empty">' + icon('route') + '<h2>Ingresa tu código de seguimiento</h2><p class="muted">Lo encuentras en el correo de confirmación (formato RX-00000). También puedes probar con los códigos de arriba.</p></div>';
      return;
    }
    $('#track-empty').innerHTML = '';
    $('#track-result').hidden = false;
    if (!tmap) tmap = new TrackMap();
    trackKey = '';
    tmap.setOrder(o);
    tmap.refresh();
    renderTrackInfo(true);
  }

  function structKey(o) { return [o.code, o.driverState, o.courierId, statusIdx(o), o.sim.speed, o.pod ? (o.pod.sig ? 's' : 'p') : '-', (o.chat || []).length].join('|'); }

  function renderTrackInfo(force) {
    var o = db.orders[currentCode];
    if (!o) return;
    var key = structKey(o);
    if (!force && key === trackKey) return updateTrackDynamic(o);
    trackKey = key;
    var e = elapsed(o), si = statusIdx(o, e), pend = o.driverState === 'pendiente', c = courier(o.courierId);
    var pill = pend ? '<span class="pill pill--pendiente">Asignando repartidor</span>' : '<span class="pill pill--' + STATUS[si].k + '">' + STATUS[si].label + '</span>';
    var h = '';
    // Estado + ETA
    h += '<section class="card tcard" aria-labelledby="t-code"><div class="tstatus"><div><p class="tiny muted" style="margin:0">Código de seguimiento</p><h2 class="tstatus__code" id="t-code">' + o.code + '</h2></div>' + pill + '</div>';
    if (pend) {
      h += '<div class="eta"><div><div class="eta__lbl">Estado</div><div class="eta__big" style="font-size:1.6rem">Esperando confirmación</div></div></div><p class="muted" data-autoleft></p>';
    } else if (si === 4) {
      h += '<div class="eta"><div><div class="eta__lbl">Entregado a las</div><div class="eta__big">' + hhmm(eventTime(o, 4)) + '</div></div><div><div class="eta__lbl">Recibió</div><div class="eta__at">' + esc(o.pod ? o.pod.name : o.receiver.name) + '</div></div></div>';
    } else {
      h += '<div class="eta"><div><div class="eta__lbl">Llega en</div><div class="eta__big" data-eta>--</div></div><div><div class="eta__lbl">Hora estimada</div><div class="eta__at" data-eta-at>--</div></div></div>';
    }
    h += '<div class="progress' + (si === 4 ? ' progress--done' : '') + '" role="progressbar" aria-label="Avance del envío" aria-valuemin="0" aria-valuemax="100" data-progress-wrap><span data-progress></span></div>';
    h += '<div class="tmeta"><span>' + icon('pin', 'ic--xs') + ' ' + esc(o.sender.comuna) + '</span><span>' + o.km.toString().replace('.', ',') + ' km</span><span>' + esc(o.receiver.comuna) + '</span></div></section>';

    // Línea de tiempo
    h += '<section class="card tcard" aria-labelledby="t-tl"><h2 id="t-tl" style="font-size:1.15rem">Línea de tiempo</h2><ol class="timeline">';
    STATUS.forEach(function (s, i) {
      var cls = pend ? (i === 0 ? 'now' : '') : (i < si ? 'done' : i === si ? (si === 4 ? 'done' : 'now') : '');
      var t = (pend && i > 0) ? '—' : (i <= si || pend) ? hhmm(eventTime(o, i)) : 'est. ' + hhmm(eventTime(o, i));
      var desc = s.desc;
      if (i === 0 && pend) desc = 'Esperando que un repartidor confirme';
      if (i === 1) desc = 'Retiro en ' + o.sender.addr + ', ' + o.sender.comuna;
      if (i === 4) desc = 'Entrega en ' + o.receiver.addr + ', ' + o.receiver.comuna;
      h += '<li class="tl ' + cls + '"' + (cls === 'now' ? ' aria-current="step"' : '') + '><span class="tl__dot">' + icon(cls === 'done' ? 'check' : s.ic) + '</span><div class="tl__t"><b>' + s.label + '</b><small>' + esc(desc) + '</small></div><span class="tl__time">' + t + '</span></li>';
    });
    h += '</ol></section>';

    // Prueba de entrega
    if (si === 4 && o.pod) h += podHtml(o);

    // Repartidor
    var unread = (o.chat || []).filter(function (m) { return m.from === 'them' && !m.read; }).length;
    h += '<section class="card tcard" aria-labelledby="t-cour"><h2 id="t-cour" class="sr-only">Repartidor</h2><div class="courier"><div class="avatar" style="background:' + c.color + '">' + initials(c.name) + '</div><div><p class="courier__name">' + esc(c.name) + (pend ? ' <span class="tiny muted">(por confirmar)</span>' : '') + '</p><p class="courier__meta">' + icon('star', 'ic--star') + '<b>' + c.rating.toString().replace('.', ',') + '</b> · ' + c.trips.toLocaleString('es-CL') + ' entregas</p><p class="courier__meta">' + icon('moto') + esc(c.vehicle) + ' <span class="plate">' + c.plate + '</span></p></div>' +
      '<div class="courier__act"><button class="btn btn--dark" type="button" data-act="call"' + (pend || si === 4 ? ' disabled' : '') + '>' + icon('phone') + ' Llamar</button><button class="btn btn--primary" type="button" data-act="chat"' + (pend ? ' disabled' : '') + '>' + icon('chat') + ' Chat' + (unread ? ' <span class="badge" aria-label="' + unread + ' sin leer">' + unread + '</span>' : '') + '</button></div></div></section>';

    // Detalles
    h += '<section class="card tcard" aria-labelledby="t-det"><h2 id="t-det" style="font-size:1.15rem">Detalle del envío</h2><div class="details">' +
      '<div><h3>Retiro</h3><p><b>' + esc(o.sender.name) + '</b><br>' + esc(o.sender.addr) + '<br>' + esc(o.sender.comuna) + '</p></div>' +
      '<div><h3>Entrega</h3><p><b>' + esc(o.receiver.name) + '</b><br>' + esc(o.receiver.addr) + '<br>' + esc(o.receiver.comuna) + '</p></div>' +
      '<div><h3>Paquete</h3><p>' + SIZES[o.size].name + ' · ' + SIZES[o.size].max + '</p></div>' +
      '<div><h3>Servicio y valor</h3><p>' + SERVICES[o.service].name + ' · <b>' + clp(o.price) + '</b></p></div>' +
      (o.notes ? '<div style="grid-column:1/-1"><h3>Instrucciones</h3><p>' + esc(o.notes) + '</p></div>' : '') +
      '</div></section>';

    $('#track-info').innerHTML = h;
    var call = $('[data-act="call"]'), chat = $('[data-act="chat"]');
    if (call) call.addEventListener('click', function () { openCall(o.code); });
    if (chat) chat.addEventListener('click', function () { openChat(o.code); });
    if ($('#pod-canvas')) initPodPad(o);
    renderSpeed(o, si, pend);
    renderChips();
    updateTrackDynamic(o);
  }

  function renderSpeed(o, si, pend) {
    var fin = si === 4;
    $('#speed-seg').innerHTML = SPEEDS.map(function (s) {
      return '<div class="seg__opt"><input type="radio" name="speed" id="sp-' + s + '" value="' + s + '"' + (o.sim.speed === s ? ' checked' : '') + (fin || pend ? ' disabled' : '') + '><label for="sp-' + s + '">' + s + '×</label></div>';
    }).join('');
    $('#sim-faster').disabled = fin || pend;
    $('#sim-skip').disabled = fin;
    $('#sim-skip').innerHTML = icon('skip') + (pend ? ' Confirmar repartidor' : ' Siguiente etapa');
  }

  function updateTrackDynamic(o) {
    var now = Date.now(), e = elapsed(o, now), si = statusIdx(o, e);
    var R = realTh(o), real = simToReal(o, e), total = R[4];
    var pct = o.driverState === 'pendiente' ? 2 : Math.round(real / total * 100);
    var bar = $('[data-progress]'); if (bar) bar.style.width = pct + '%';
    var wrap = $('[data-progress-wrap]'); if (wrap) wrap.setAttribute('aria-valuenow', pct);
    var eta = $('[data-eta]');
    if (eta) {
      var rem = Math.max(0, (total - real) * 60), m = Math.floor(rem / 60), s = Math.floor(rem % 60);
      eta.innerHTML = m >= 60 ? Math.floor(m / 60) + '<small>h</small> ' + pad(m % 60) + '<small>min</small>' : pad(m) + ':' + pad(s) + '<small>min</small>';
      var at = $('[data-eta-at]'); if (at) at.textContent = hhmm(o.clock0 + total * 60000) + (o.sim.speed > 1 ? ' · sim ' + o.sim.speed + '×' : '');
    }
    var al = $('[data-autoleft]');
    if (al) al.textContent = o.autoAcceptAt ? 'Asignación automática en ' + Math.max(0, Math.ceil((o.autoAcceptAt - now) / 1000)) + ' s (o acéptalo desde el Panel del repartidor).' : 'Acepta este pedido desde el Panel del repartidor o usa “Confirmar repartidor”.';
    if (tmap) tmap.update(o);
    void si;
  }

  /* Prueba de entrega */
  function scribble(seed) {
    var r = rng(seed), x = 30, d = 'M' + x + ' ' + (80 + r() * 20);
    for (var i = 0; i < 7; i++) { var nx = x + 30 + r() * 25; d += ' C' + (x + 10).toFixed(0) + ' ' + (20 + r() * 40).toFixed(0) + ',' + (nx - 10).toFixed(0) + ' ' + (100 + r() * 40).toFixed(0) + ',' + nx.toFixed(0) + ' ' + (60 + r() * 40).toFixed(0); x = nx; }
    return '<svg viewBox="0 0 320 150" role="img" aria-label="Firma del receptor"><path d="' + d + '" fill="none" stroke="#1d2a6b" stroke-width="3" stroke-linecap="round"/><path d="M40 125 H 280" stroke="#ddd6c4"/></svg>';
  }
  function photoSvg(o) {
    return '<svg viewBox="0 0 320 150" role="img" aria-label="Foto de respaldo: paquete en la puerta"><rect width="320" height="150" fill="#d9d2c0"/><rect x="0" y="118" width="320" height="32" fill="#bfb6a0"/>' +
      '<rect x="110" y="10" width="100" height="112" fill="#8a5a3c"/><rect x="118" y="18" width="84" height="96" fill="#9b6a4a"/><circle cx="196" cy="70" r="4" fill="#e8c56d"/>' +
      '<rect x="88" y="120" width="144" height="18" rx="3" fill="#5c6b4a"/><g transform="translate(128 86)"><rect width="56" height="40" fill="#e0b277"/><rect x="24" width="8" height="40" fill="#FFCF1F"/><path d="M0 0 L28 -10 L56 0" fill="#ecc690"/></g>' +
      '<rect x="8" y="8" width="150" height="20" rx="4" fill="rgba(20,22,28,.75)"/><text x="16" y="22" fill="#fff" font-size="11" font-family="monospace">' + hhmm(o.pod.t) + ' · ' + o.drop[0].toFixed(4) + ', ' + o.drop[1].toFixed(4) + '</text></svg>';
  }
  function podHtml(o) {
    var sig = o.pod.sig;
    var sigBlock = sig === 'auto' ? '<div class="pod__sig">' + scribble(o.code) + '</div>'
      : sig ? '<div class="pod__sig"><img src="' + sig + '" alt="Firma de ' + esc(o.pod.name) + '"></div>'
      : '<div class="sigpad"><canvas id="pod-canvas" aria-label="Área para firmar con el dedo o el mouse" role="img"></canvas><span class="sigpad__line"></span><span class="sigpad__hint" id="pod-hint">Firma aquí</span></div>';
    return '<section class="card tcard pod" aria-labelledby="t-pod"><div class="pod__head">' + icon('shield') + '<div><h2 id="t-pod">Prueba de entrega</h2><p class="tiny muted" style="margin:0">Recibido por ' + esc(o.pod.name) + ' · ' + hhmm(o.pod.t) + '</p></div></div>' +
      (sig ? '' : '<p class="tiny">El repartidor marcó la entrega. Como receptor, confirma con tu firma:</p>') +
      '<div class="pod__grid"><figure class="pod__box" style="margin:0">' + sigBlock + '<figcaption>' + icon('pen') + ' Firma del receptor</figcaption></figure>' +
      '<figure class="pod__box" style="margin:0"><div class="pod__photo">' + photoSvg(o) + '</div><figcaption>' + icon('camera') + ' Foto de respaldo (simulada)</figcaption></figure></div>' +
      (sig ? '' : '<div class="sigpad__actions"><button type="button" class="btn btn--ghost btn--sm" id="pod-clear">Borrar</button><button type="button" class="btn btn--ok btn--sm" id="pod-save">' + icon('check') + ' Confirmar recepción</button></div>') +
      '</section>';
  }
  function sigPad(canvas, onDraw) {
    var ctx = canvas.getContext('2d'), drawing = false, empty = true, last = null;
    function size() {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1d2a6b';
    }
    size();
    function pt(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener('pointerdown', function (e) { drawing = true; last = pt(e); try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* noop */ } e.preventDefault(); });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return; var p = pt(e);
      ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p;
      if (empty) { empty = false; if (onDraw) onDraw(); }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { canvas.addEventListener(ev, function () { drawing = false; }); });
    return {
      isEmpty: function () { return empty; },
      clear: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; },
      data: function () { return canvas.toDataURL('image/png'); }
    };
  }
  function initPodPad(o) {
    var hint = $('#pod-hint');
    var pad = sigPad($('#pod-canvas'), function () { if (hint) hint.hidden = true; });
    $('#pod-clear').addEventListener('click', function () { pad.clear(); if (hint) hint.hidden = false; });
    $('#pod-save').addEventListener('click', function () {
      if (pad.isEmpty()) { toast('pen', 'Dibuja tu firma antes de confirmar'); return; }
      o.pod.sig = pad.data(); o.pod.t = o.pod.t || Date.now(); saveDB();
      toast('check', '¡Gracias! Recepción confirmada');
      renderTrackInfo(true);
    });
  }

  /* ================= Chat y llamada ================= */
  var chatCode = null, lastFocus = null;
  function nearestComuna(p) {
    var best = null, bd = 1e9;
    COMUNAS.forEach(function (c) { var d = plen(p, [c.lat, c.lng]); if (d < bd) { bd = d; best = c; } });
    return best ? best.n : 'Santiago';
  }
  function replyFor(o, text) {
    var t = text.toLowerCase(), e = elapsed(o), si = statusIdx(o, e);
    var remMin = Math.max(1, Math.round(realTh(o)[4] - simToReal(o, e)));
    if (/d[oó]nde|ubica|vas|vienes/.test(t)) {
      return [
        'Voy saliendo hacia el retiro en ' + o.sender.comuna + ', llego en unos minutos.',
        'Estoy en ' + o.sender.addr + ' cargando tu paquete.',
        'Voy por ' + nearestComuna(courierPos(o, e)) + ', avanzando bien.',
        '¡Estoy a un par de cuadras! Ya casi llego.',
        'Ya entregué el paquete, quedó con firma y foto.'
      ][si];
    }
    if (/cu[aá]nto|demora|tarda|hora|llega|falta/.test(t)) return si >= 4 ? 'Ya está entregado.' : 'Según el GPS llego en unos ' + remMin + ' minutos.';
    if (/conserj|porter|dejar|vecin|recep/.test(t)) return 'Perfecto, si no hay nadie lo dejo en conserjería y te mando foto de respaldo.';
    if (/gracias|vale|ok|perfecto|bac[aá]n|genial/.test(t)) return '¡A ti! Cualquier cosa me escribes por aquí.';
    if (/hola|buen/.test(t)) return '¡Hola! Soy ' + courier(o.courierId).name.split(' ')[0] + ', voy a cargo de tu envío ' + o.code + '.';
    if (/timbre|piso|depto|departamento|casa/.test(t)) return 'Anotado, lo tengo en cuenta al llegar.';
    var r = ['Dale, lo tengo anotado.', 'Entendido, gracias por avisar.', 'Ok, te aviso apenas llegue.'];
    return r[Math.floor(Math.random() * r.length)];
  }
  function renderChat() {
    var o = db.orders[chatCode]; if (!o) return;
    var c = courier(o.courierId);
    $('#chat-avatar').textContent = initials(c.name); $('#chat-avatar').style.background = c.color;
    $('#chat-title').textContent = c.name;
    $('#chat-sub').textContent = statusIdx(o) === 4 ? 'Envío entregado' : 'En línea · ' + o.code;
    (o.chat || []).forEach(function (m) { if (m.from === 'them') m.read = true; });
    $('#chat-log').innerHTML = (o.chat || []).map(function (m) {
      if (m.from === 'sys') return '<li class="msg msg--sys">' + esc(m.text) + '</li>';
      return '<li class="msg msg--' + (m.from === 'me' ? 'me' : 'them') + '">' + esc(m.text) + '<time>' + hhmm(m.t) + '</time></li>';
    }).join('') + (typing ? '<li class="msg msg--them msg--typing">' + esc(c.name.split(' ')[0]) + ' está escribiendo…</li>' : '');
    var log = $('#chat-log'); log.scrollTop = log.scrollHeight;
  }
  var typing = false;
  function openChat(code) {
    var o = db.orders[code]; if (!o) return;
    chatCode = code; lastFocus = document.activeElement;
    o.chat = o.chat || [];
    if (!o.chat.length) {
      o.chat.push({ from: 'sys', text: 'Chat simulado con tu repartidor.', t: Date.now() });
      o.chat.push({ from: 'them', text: '¡Hola! Soy ' + courier(o.courierId).name.split(' ')[0] + ' y llevo tu envío ' + o.code + '. ¿Alguna indicación?', t: Date.now() });
    }
    saveDB();
    $('#chat-quick').innerHTML = ['¿Dónde vienes?', '¿Cuánto falta?', 'Déjalo en conserjería', '¡Gracias!'].map(function (q) { return '<button type="button" class="chip" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('');
    $('#chat').hidden = false;
    renderChat();
    $('#chat-input').focus();
  }
  function sendChat(text) {
    text = text.trim(); if (!text || !chatCode) return;
    var code = chatCode, o = db.orders[code];
    o.chat.push({ from: 'me', text: text, t: Date.now() }); saveDB(); renderChat();
    setTimeout(function () { if (chatCode === code) { typing = true; renderChat(); } }, 500);
    setTimeout(function () {
      var cur = db.orders[code]; if (!cur) return;
      cur.chat.push({ from: 'them', text: replyFor(cur, text), t: Date.now(), read: chatCode === code });
      typing = false; saveDB();
      if (chatCode === code) renderChat();
      if (currentView === 'rastrear') renderTrackInfo();
    }, 1600);
  }
  function closeChat() { $('#chat').hidden = true; chatCode = null; typing = false; if (currentView === 'rastrear') renderTrackInfo(true); if (lastFocus) lastFocus.focus(); }

  var modalCleanup = null;
  function openModal(html, onOpen) {
    lastFocus = document.activeElement;
    $('#modal-panel').innerHTML = '<button class="iconbtn modal__close" type="button" data-close aria-label="Cerrar">' + icon('x') + '</button>' + html;
    $('#modal').hidden = false;
    modalCleanup = onOpen ? onOpen($('#modal-panel')) : null;
    var f = $('#modal-panel').querySelector('input, button:not(.modal__close)') || $('.modal__close');
    if (f) f.focus();
  }
  function closeModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true;
    if (typeof modalCleanup === 'function') modalCleanup();
    modalCleanup = null;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function openCall(code) {
    var o = db.orders[code]; if (!o) return;
    var c = courier(o.courierId);
    openModal('<div class="call" id="call-box"><div class="avatar" style="background:' + c.color + '">' + initials(c.name) + '</div><h2 id="modal-title">' + esc(c.name) + '</h2><p class="muted" style="margin:0">' + esc(c.phone) + ' · llamada simulada</p><p class="call__time" id="call-time" aria-live="polite">Llamando…</p><button class="call__end" type="button" id="call-end" aria-label="Colgar">' + icon('phone') + '</button></div>', function (root) {
      var t0 = null, iv;
      var to = setTimeout(function () { t0 = Date.now(); $('#call-box').classList.add('live'); }, 2200);
      iv = setInterval(function () { if (t0) { var s = Math.floor((Date.now() - t0) / 1000); $('#call-time').textContent = 'En llamada ' + pad(Math.floor(s / 60)) + ':' + pad(s % 60); } }, 500);
      root.querySelector('#call-end').addEventListener('click', closeModal);
      return function () { clearTimeout(to); clearInterval(iv); if (t0) toast('phone', 'Llamada finalizada'); };
    });
  }

  /* ================= Panel del repartidor ================= */
  var panelKey = '';
  function panelOrders() {
    var id = db.driverId;
    return Object.keys(db.orders).map(function (k) { return db.orders[k]; }).filter(function (o) { return o.courierId === id; });
  }
  function deliveredAt(o) { return o.clock0 + realTh(o)[4] * 60000; }
  function renderPanel(force) {
    var d = courier(db.driverId), now = Date.now(), sod = startOfDay(now);
    var mine = panelOrders();
    var online = db.online[d.id] !== false;
    var key = JSON.stringify([d.id, online, mine.map(function (o) { return [o.code, o.driverState, statusIdx(o), o.pod ? 1 : 0]; })]);
    if (!force && key === panelKey) return updatePanelDynamic();
    panelKey = key;
    var pend = mine.filter(function (o) { return o.driverState === 'pendiente'; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var active = mine.filter(function (o) { return o.driverState !== 'pendiente' && statusIdx(o) < 4; }).sort(function (a, b) { return elapsed(b) - elapsed(a); });
    var done = mine.filter(function (o) { return o.driverState !== 'pendiente' && statusIdx(o) === 4 && deliveredAt(o) >= sod; }).sort(function (a, b) { return deliveredAt(b) - deliveredAt(a); });
    var earn = done.reduce(function (s, o) { return s + Math.round(o.price * 0.75) + (o.tip || 0); }, 0);
    var tips = done.reduce(function (s, o) { return s + (o.tip || 0); }, 0);
    var km = done.reduce(function (s, o) { return s + o.km; }, 0);
    var goal = 45000;

    var h = '<div class="panel"><div>';
    h += '<div class="card card--dark drvhead"><div class="avatar" style="background:' + d.color + '">' + initials(d.name) + '</div><div class="drvhead__txt"><h2>Hola, ' + esc(d.name.split(' ')[0]) + '</h2><p>' + esc(d.vehicle) + ' · ' + d.plate + ' · ' + new Date(now).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p></div>' +
      '<label class="switch"><input type="checkbox" id="online-sw"' + (online ? ' checked' : '') + '> ' + (online ? 'En línea' : 'Desconectado') + '</label></div>';
    h += '<div class="stats">' +
      '<div class="card stat stat--hl"><div class="stat__k">' + icon('wallet') + ' Ganancias hoy</div><div class="stat__v">' + clp(earn) + '</div></div>' +
      '<div class="card stat"><div class="stat__k">' + icon('box') + ' Entregas</div><div class="stat__v">' + done.length + '</div></div>' +
      '<div class="card stat"><div class="stat__k">' + icon('route') + ' Km</div><div class="stat__v">' + km.toFixed(1).replace('.', ',') + '</div></div>' +
      '<div class="card stat"><div class="stat__k">' + icon('star') + ' Calificación</div><div class="stat__v">' + d.rating.toString().replace('.', ',') + '</div></div></div>';
    var gp = Math.min(100, Math.round(earn / goal * 100));
    h += '<div class="card goal"><div class="goal__row"><b>Meta diaria ' + clp(goal) + '</b><span>' + gp + '% · propinas ' + clp(tips) + '</span></div><div class="progress' + (gp >= 100 ? ' progress--done' : '') + '" role="progressbar" aria-label="Avance meta diaria" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + gp + '"><span style="width:' + gp + '%"></span></div></div>';

    if (!online) h += '<p class="offline-note">Estás desconectado: los pedidos nuevos no se te asignarán automáticamente.</p>';

    h += '<h2 class="ptitle">Nuevas solicitudes <span class="count">' + pend.length + '</span></h2>';
    h += pend.length ? '<ul class="olist">' + pend.map(function (o) { return orderCard(o, 'new'); }).join('') + '</ul>' : '<p class="muted">Sin solicitudes nuevas. Crea una desde <a href="#solicitar">Solicitar envío</a> y aparecerá aquí.</p>';
    h += '<h2 class="ptitle">En curso <span class="count">' + active.length + '</span></h2>';
    h += active.length ? '<ul class="olist">' + active.map(function (o) { return orderCard(o, 'active'); }).join('') + '</ul>' : '<p class="muted">No tienes envíos en curso.</p>';
    h += '</div>';

    // Lateral
    var stops = [];
    active.forEach(function (o) {
      var e = elapsed(o), si = statusIdx(o, e), real = simToReal(o, e), R = realTh(o);
      if (si < 1) stops.push({ kind: 'A', o: o, min: Math.max(0, R[1] - real), addr: o.sender.addr, comuna: o.sender.comuna, who: o.sender.name });
      stops.push({ kind: 'B', o: o, min: Math.max(0, R[4] - real), addr: o.receiver.addr, comuna: o.receiver.comuna, who: o.receiver.name });
    });
    stops.sort(function (a, b) { return a.min - b.min; });
    h += '<div class="side-stack"><section class="card card--dark side-card" aria-labelledby="h-route"><h2 id="h-route">' + icon('route') + ' Ruta del día</h2>';
    h += stops.length ? '<ol class="routelist">' + stops.map(function (s, i) {
      return '<li><span class="n ' + (s.kind === 'B' ? 'b' : '') + '">' + (i + 1) + '</span><div><b>' + (s.kind === 'A' ? 'Retiro' : 'Entrega') + ' · ' + esc(s.comuna) + '</b><small>' + esc(s.addr) + ' · ' + esc(s.who) + '</small><small class="mono">' + s.o.code + '</small></div><span class="t" data-stopeta="' + s.o.code + '|' + s.kind + '">' + Math.round(s.min) + ' min</span></li>';
    }).join('') + '</ol>' : '<p class="tiny" style="color:#a6abb8;margin:0">Acepta un pedido para armar tu ruta.</p>';
    h += '</section>';
    h += '<section class="card side-card" aria-labelledby="h-done"><h2 id="h-done">' + icon('check') + ' Completados hoy</h2>';
    h += done.length ? '<ul class="done-list">' + done.map(function (o) { return '<li><span><a class="mono" href="#rastrear/' + o.code + '">' + o.code + '</a><br><small class="muted">' + hhmm(deliveredAt(o)) + ' · ' + esc(o.receiver.comuna) + '</small></span><b>' + clp(Math.round(o.price * 0.75) + (o.tip || 0)) + '</b></li>'; }).join('') + '</ul>' : '<p class="muted tiny" style="margin:0">Aún no hay entregas hoy.</p>';
    var week = d.week.concat([Math.round(earn / 1000)]), mx = Math.max.apply(null, week.concat([1]));
    var days = ['L', 'M', 'M', 'J', 'V', 'S', 'Hoy'];
    h += '<h3 style="margin-top:16px;font-size:.9rem">Últimos 7 días (miles de $)</h3><div class="minibars" role="img" aria-label="Ganancias últimos 7 días: ' + week.join(', ') + ' mil pesos">' + week.map(function (v, i) { return '<span class="' + (i === 6 ? 'today' : '') + '" style="height:' + Math.max(6, Math.round(v / mx * 100)) + '%" title="' + v + ' mil"></span>'; }).join('') + '</div><div class="minibars-l" aria-hidden="true">' + days.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
    h += '</section><button type="button" class="btn btn--ghost btn--sm" id="reset-demo">' + icon('refresh') + ' Reiniciar datos de demo</button></div></div>';

    $('#panel-root').innerHTML = h;
    updatePanelDynamic();
  }
  function orderCard(o, kind) {
    var e = elapsed(o), si = statusIdx(o, e), earn = Math.round(o.price * 0.75);
    var h = '<li class="card ocard' + (kind === 'new' ? ' ocard--new' : '') + '"><div class="ocard__top"><span class="ocard__code">' + o.code + '</span>' +
      (kind === 'new' ? '<span class="pill pill--pendiente">Nueva · ' + SERVICES[o.service].name + '</span>' : '<span class="pill pill--' + STATUS[si].k + '">' + STATUS[si].label + '</span>') + '</div>' +
      '<div class="ocard__route"><i></i><div><b>' + esc(o.sender.comuna) + '</b> · ' + esc(o.sender.addr) + '<br><small>' + esc(o.sender.name) + '</small></div><i class="b"></i><div><b>' + esc(o.receiver.comuna) + '</b> · ' + esc(o.receiver.addr) + '<br><small>' + esc(o.receiver.name) + '</small></div></div>' +
      '<div class="ocard__facts"><span>Ganas <b>' + clp(earn) + '</b></span><span><b>' + o.km.toString().replace('.', ',') + '</b> km</span><span>' + SIZES[o.size].name + '</span>' + (o.notes ? '<span>“' + esc(o.notes) + '”</span>' : '') + '</div>';
    if (kind === 'new') {
      h += '<div class="ocard__act"><button class="btn btn--ok" type="button" data-accept="' + o.code + '">' + icon('check') + ' Aceptar</button><button class="btn btn--no" type="button" data-reject="' + o.code + '">' + icon('x') + ' Rechazar</button></div>' +
        (o.autoAcceptAt ? '<p class="autoassign" data-auto="' + o.code + '"></p>' : '');
    } else {
      h += '<div class="steps-mini" role="group" aria-label="Cambiar estado de ' + o.code + '">' + STATUS.map(function (s, i) {
        var cls = i < si ? 'done' : i === si ? 'now' : '';
        return '<button type="button" class="' + cls + '" data-set="' + o.code + '|' + i + '"' + (i <= si ? ' disabled aria-pressed="true"' : '') + '>' + s.label + '</button>';
      }).join('') + '</div>' +
        '<div class="ocard__act"><button class="btn btn--primary btn--sm" type="button" data-set="' + o.code + '|' + (si + 1) + '">' + icon('arrow') + ' Marcar ' + STATUS[si + 1].label.toLowerCase() + '</button><a class="btn btn--ghost btn--sm" href="#rastrear/' + o.code + '">' + icon('pin') + ' Ver seguimiento</a><button class="btn btn--ghost btn--sm" type="button" data-chat="' + o.code + '">' + icon('chat') + ' Chat</button></div>';
    }
    return h + '</li>';
  }
  function updatePanelDynamic() {
    var now = Date.now();
    $$('[data-auto]').forEach(function (el) {
      var o = db.orders[el.getAttribute('data-auto')];
      if (o && o.autoAcceptAt) el.textContent = 'Se aceptará automáticamente en ' + Math.max(0, Math.ceil((o.autoAcceptAt - now) / 1000)) + ' s';
    });
    $$('[data-stopeta]').forEach(function (el) {
      var p = el.getAttribute('data-stopeta').split('|'), o = db.orders[p[0]]; if (!o) return;
      var R = realTh(o), real = simToReal(o, elapsed(o, now));
      el.textContent = Math.max(0, Math.round((p[1] === 'A' ? R[1] : R[4]) - real)) + ' min';
    });
  }
  function rejectOrder(o) {
    o.rejectedBy = (o.rejectedBy || []).concat([o.courierId]);
    var next = COURIERS.filter(function (c) { return o.rejectedBy.indexOf(c.id) < 0; })[0] || COURIERS[(COURIERS.indexOf(courier(o.courierId)) + 1) % COURIERS.length];
    o.courierId = next.id; o.autoAcceptAt = Date.now() + 4000;
    saveDB();
    toast('route', o.code + ' rechazado · reasignado a ' + next.name);
  }
  function openPodModal(o) {
    openModal('<h2 id="modal-title">Confirmar entrega ' + o.code + '</h2><p class="muted">Pide a quien recibe que firme en la pantalla.</p>' +
      '<div class="field"><label for="pod-name">Nombre de quien recibe</label><input id="pod-name" class="input" value="' + esc(o.receiver.name) + '"></div>' +
      '<div class="sigpad"><canvas id="pod-modal-canvas" aria-label="Área de firma" role="img"></canvas><span class="sigpad__line"></span><span class="sigpad__hint" id="pm-hint">Firma aquí</span></div>' +
      '<div class="pod__box" style="margin-top:12px"><div class="pod__photo" style="height:110px;display:grid;place-items:center;color:var(--muted)">' + icon('camera') + '<span class="tiny">Foto de respaldo adjunta (simulada)</span></div></div>' +
      '<p class="form-err" id="pm-err" role="alert"></p><div class="sigpad__actions"><button type="button" class="btn btn--ghost" id="pm-clear">Borrar firma</button><button type="button" class="btn btn--ok" id="pm-ok" style="flex:1">' + icon('check') + ' Confirmar entrega</button></div>', function (root) {
      var hint = root.querySelector('#pm-hint');
      var pad = sigPad(root.querySelector('#pod-modal-canvas'), function () { hint.hidden = true; });
      root.querySelector('#pm-clear').addEventListener('click', function () { pad.clear(); hint.hidden = false; });
      root.querySelector('#pm-ok').addEventListener('click', function () {
        var name = root.querySelector('#pod-name').value.trim();
        if (!name) { root.querySelector('#pm-err').textContent = 'Indica el nombre de quien recibe.'; return; }
        if (pad.isEmpty()) { root.querySelector('#pm-err').textContent = 'Falta la firma del receptor.'; return; }
        jumpTo(o, 4);
        o.pod = { name: name, sig: pad.data(), t: eventTime(o, 4) };
        saveDB(); closeModal();
        toast('check', o.code + ' entregado. ¡Bien hecho!');
        renderPanel(true);
      });
    });
  }
  function initPanel() {
    var sel = $('#driver-sel');
    sel.innerHTML = COURIERS.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + ' · ' + esc(c.vehicle.split(' ')[0]) + '</option>'; }).join('');
    sel.value = db.driverId;
    sel.addEventListener('change', function () { db.driverId = sel.value; saveDB(); renderPanel(true); });
    $('#panel-root').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var o;
      if (b.hasAttribute('data-accept')) { o = db.orders[b.getAttribute('data-accept')]; accept(o, Date.now()); saveDB(); toast('check', 'Aceptaste ' + o.code + '. Ve a retirarlo a ' + o.sender.comuna); renderPanel(true); }
      else if (b.hasAttribute('data-reject')) { o = db.orders[b.getAttribute('data-reject')]; rejectOrder(o); renderPanel(true); }
      else if (b.hasAttribute('data-set')) {
        var p = b.getAttribute('data-set').split('|'); o = db.orders[p[0]]; var i = +p[1];
        if (i >= 4) { openPodModal(o); return; }
        jumpTo(o, i); saveDB(); toast('bolt', o.code + ' → ' + STATUS[i].label); renderPanel(true);
      }
      else if (b.hasAttribute('data-chat')) openChat(b.getAttribute('data-chat'));
      else if (b.id === 'reset-demo') { seedDemo(); toast('refresh', 'Datos de demo reiniciados'); renderPanel(true); }
    });
    $('#panel-root').addEventListener('change', function (e) {
      if (e.target.id === 'online-sw') { db.online[db.driverId] = e.target.checked; saveDB(); renderPanel(true); }
    });
  }

  /* ================= Router ================= */
  var VIEWS = ['inicio', 'solicitar', 'rastrear', 'panel'];
  function route() {
    var h = (location.hash || '#inicio').slice(1).split('/');
    var view = VIEWS.indexOf(h[0]) >= 0 ? h[0] : 'inicio';
    var param = h[1] ? decodeURIComponent(h[1]) : null;
    var changed = view !== currentView;
    currentView = view;
    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
    $$('[data-nav]').forEach(function (a) {
      var n = a.getAttribute('data-nav');
      var on = view === 'inicio' ? (param === 'tarifas' ? n === 'tarifas' : n === 'inicio') : n === view;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#mainnav').classList.remove('open'); $('.navtoggle').setAttribute('aria-expanded', 'false');
    var titles = { inicio: 'Rayo Express — Mensajería y delivery en Santiago', solicitar: 'Solicitar envío · Rayo Express', rastrear: 'Rastrear envío · Rayo Express', panel: 'Panel del repartidor · Rayo Express' };
    document.title = titles[view];
    if (view === 'rastrear') openTrack(param ? normCode(param) : null);
    if (view === 'panel') renderPanel(true);
    if (view === 'solicitar') updateSummary();
    if (view === 'inicio' && param && document.getElementById(param)) {
      var el = document.getElementById(param);
      setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, changed ? 30 : 0);
    } else if (changed || view === 'rastrear') {
      window.scrollTo(0, 0);
      var hd = $('[data-view="' + view + '"] h1');
      if (hd && changed && document.readyState === 'complete') hd.focus({ preventScroll: true });
    }
  }

  /* ================= Arranque ================= */
  function init() {
    fillComunas(); buildSizes();
    initLanding(); initForm(); initPanel();
    updateSummary();

    $('.navtoggle').addEventListener('click', function () {
      var open = $('#mainnav').classList.toggle('open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
      this.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    $('#track-form').addEventListener('submit', function (e) { e.preventDefault(); goTrack($('#track-code').value); });
    $('#demochips').addEventListener('click', function (e) { var b = e.target.closest('[data-code]'); if (b) goTrack(b.getAttribute('data-code')); });
    $('#speed-seg').addEventListener('change', function (e) {
      var o = db.orders[currentCode]; if (!o || e.target.name !== 'speed') return;
      setSpeed(o, +e.target.value); saveDB(); renderTrackInfo(true);
    });
    $('#sim-faster').addEventListener('click', function () {
      var o = db.orders[currentCode]; if (!o) return;
      var i = SPEEDS.indexOf(o.sim.speed), next = SPEEDS[(i + 1) % SPEEDS.length];
      setSpeed(o, next); saveDB(); renderTrackInfo(true);
      toast('ff', next === 1 ? 'Simulación a velocidad normal' : 'Simulación acelerada ' + next + '×');
    });
    $('#sim-skip').addEventListener('click', function () {
      var o = db.orders[currentCode]; if (!o) return;
      if (o.driverState === 'pendiente') { accept(o, Date.now()); toast('check', courier(o.courierId).name + ' confirmó tu envío'); }
      else { var si = statusIdx(o); if (si < 4) { jumpTo(o, si + 1); toast('skip', 'Etapa: ' + STATUS[si + 1].label); } }
      housekeeping(); saveDB(); renderTrackInfo(true);
    });

    // Chat / modal
    $('#chat').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeChat(); var q = e.target.closest('[data-q]'); if (q) sendChat(q.getAttribute('data-q')); });
    $('#chat-form').addEventListener('submit', function (e) { e.preventDefault(); var i = $('#chat-input'); sendChat(i.value); i.value = ''; });
    $('#modal').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('#modal').hidden) closeModal(); else if (!$('#chat').hidden) closeChat();
      else if ($('#mainnav').classList.contains('open')) $('.navtoggle').click();
    });

    // Sincronización entre pestañas
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY || !e.newValue) return;
      try { db = JSON.parse(e.newValue); db.mine = db.mine || []; db.online = db.online || {}; } catch (x) { return; }
      if (currentView === 'rastrear') { trackKey = ''; if (tmap && db.orders[currentCode]) { tmap.order = null; tmap.setOrder(db.orders[currentCode]); } }
      if (currentView === 'panel') panelKey = '';
      if (chatCode) renderChat();
    });
    var resizeT;
    window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (tmap && currentView === 'rastrear') tmap.refresh(); }, 200); });

    window.addEventListener('hashchange', route);
    route();

    setInterval(function () {
      housekeeping();
      if (currentView === 'rastrear' && currentCode && db.orders[currentCode]) renderTrackInfo();
      if (currentView === 'panel') renderPanel();
    }, 250);
    setInterval(function () { if (currentView === 'rastrear') renderChips(); }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
