/* Datos ficticios para la demo "¿Quién es quién?".
   Todo se genera de forma determinista (misma semilla => mismos datos). */
window.OFICINA_DATA = (function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var M = ['Mateo', 'Benjamín', 'Tomás', 'Joaquín', 'Lucas', 'Martín', 'Diego', 'Sebastián', 'Nicolás', 'Felipe', 'Gabriel', 'Ignacio', 'Vicente', 'Agustín', 'Cristóbal', 'Andrés', 'Rodrigo', 'Pablo', 'Javier', 'Emilio', 'Gonzalo', 'Matías', 'Simón', 'Daniel', 'Raúl', 'Hugo', 'Esteban', 'Bruno', 'Iván', 'Álvaro'];
  var F = ['Sofía', 'Valentina', 'Isidora', 'Emilia', 'Florencia', 'Catalina', 'Antonia', 'Martina', 'Josefa', 'Camila', 'Fernanda', 'Javiera', 'Constanza', 'Daniela', 'Paula', 'Lucía', 'Renata', 'Amanda', 'Trinidad', 'Agustina', 'Carolina', 'Elena', 'Victoria', 'Rocío', 'Ana', 'Julieta', 'Macarena', 'Gabriela', 'Beatriz', 'Isabel'];
  var LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa', 'Riquelme', 'García', 'Miranda', 'Bravo', 'Vera', 'Molina', 'Vega', 'Campos', 'Sandoval', 'Orellana', 'Cárdenas', 'Olivares', 'Alarcón', 'Gallardo', 'Ortiz', 'Garrido', 'Salazar', 'Guzmán', 'Saavedra', 'Navarro', 'Aguilera', 'Parra', 'Romero', 'Aravena', 'Vidal', 'Ibáñez', 'Paredes', 'Lagos', 'Cáceres', 'Bustos', 'Leiva', 'Quiroz', 'Poblete'];
  var CITIES_REMOTE = ['Valparaíso', 'Concepción', 'La Serena', 'Temuco', 'Puerto Varas', 'Antofagasta', 'Montevideo', 'Mendoza', 'Lima'];
  var SOFT = ['Comunicación', 'Liderazgo', 'Inglés avanzado', 'Excel', 'Negociación', 'Primeros auxilios'];

  /* Plantillas de planta. viewBox 0 0 1200 760. */
  var TEMPLATES = {
    T1: {
      rooms: [
        { type: 'reception', x: 40, y: 40, w: 300, h: 200 },
        { type: 'meeting', x: 360, y: 40, w: 200, h: 150, cap: 8 },
        { type: 'meeting', x: 580, y: 40, w: 170, h: 150, cap: 6 },
        { type: 'kitchen', x: 770, y: 40, w: 230, h: 150 },
        { type: 'wc', x: 1020, y: 40, w: 140, h: 150 },
        { type: 'lounge', x: 40, y: 260, w: 300, h: 200 },
        { type: 'elevator', x: 40, y: 480, w: 140, h: 240 },
        { type: 'booths', x: 200, y: 480, w: 140, h: 240 }
      ],
      clusters: [
        { x: 380, y: 260, cols: 3 }, { x: 680, y: 260, cols: 3 },
        { x: 380, y: 520, cols: 3 }, { x: 680, y: 520, cols: 3 },
        { x: 980, y: 260, cols: 2 }, { x: 980, y: 520, cols: 2 }
      ]
    },
    T2: {
      rooms: [
        { type: 'meeting', x: 40, y: 40, w: 220, h: 160, cap: 10 },
        { type: 'meeting', x: 280, y: 40, w: 180, h: 160, cap: 6 },
        { type: 'kitchen', x: 480, y: 40, w: 240, h: 160 },
        { type: 'wc', x: 740, y: 40, w: 130, h: 160 },
        { type: 'elevator', x: 890, y: 40, w: 120, h: 160 },
        { type: 'meeting', x: 1030, y: 40, w: 130, h: 160, cap: 4 },
        { type: 'booths', x: 1010, y: 240, w: 150, h: 480 }
      ],
      clusters: [
        { x: 60, y: 240, cols: 3 }, { x: 380, y: 240, cols: 3 }, { x: 700, y: 240, cols: 3 },
        { x: 60, y: 500, cols: 3 }, { x: 380, y: 500, cols: 3 }, { x: 700, y: 500, cols: 3 }
      ]
    },
    T3: {
      rooms: [
        { type: 'boardroom', x: 40, y: 40, w: 400, h: 220, cap: 14 },
        { type: 'meeting', x: 460, y: 40, w: 200, h: 160, cap: 6 },
        { type: 'wc', x: 680, y: 40, w: 140, h: 160 },
        { type: 'elevator', x: 840, y: 40, w: 120, h: 160 },
        { type: 'lounge', x: 980, y: 40, w: 180, h: 300 },
        { type: 'kitchen', x: 980, y: 360, w: 180, h: 170 },
        { type: 'it', x: 980, y: 550, w: 180, h: 170 }
      ],
      clusters: [
        { x: 60, y: 300, cols: 3 }, { x: 400, y: 300, cols: 3 },
        { x: 60, y: 530, cols: 3 }, { x: 400, y: 530, cols: 3 },
        { x: 720, y: 300, cols: 2 }, { x: 720, y: 530, cols: 2 }
      ]
    }
  };

  var ROOM_LABEL = {
    reception: 'Recepción', kitchen: 'Cocina', wc: 'Baños', lounge: 'Sala de espera',
    elevator: 'Ascensores', booths: 'Cabinas', boardroom: 'Directorio', it: 'TI · Bodega'
  };

  var CFG = [
    {
      id: 'nebula', name: 'Nébula Labs', short: 'NL', tagline: 'Software e IA aplicada', domain: 'nebulalabs.demo',
      brand: '#6d5efc', city: 'Santiago', address: 'Av. Andrés Bello 2457 (ficticia)', ext: 2, seed: 4242,
      meetingNames: ['Sala Orión', 'Sala Vega', 'Sala Lyra', 'Sala Draco', 'Sala Fénix', 'Sala Atlas', 'Sala Cygnus'],
      lounge: ['Sala de espera', 'Terraza Galaxia'],
      floors: [{ tpl: 'T1', use: [0, 1, 4] }, { tpl: 'T2', use: [0, 1, 2, 3] }, { tpl: 'T3', use: [0, 1, 4, 5] }],
      areas: [
        { name: 'Dirección', color: '#475569', head: 'CEO y cofundador|CEO y cofundadora', cargos: ['Asistente ejecutivo|Asistente ejecutiva'], n: 1, skills: ['Estrategia', 'Finanzas corporativas', 'Relación con inversionistas', 'Agenda ejecutiva'] },
        { name: 'Ingeniería', color: '#4f46e5', head: 'CTO', lead: 'Líder técnico|Líder técnica', cargos: ['Desarrollador backend|Desarrolladora backend', 'Desarrollador frontend|Desarrolladora frontend', 'Ingeniero DevOps|Ingeniera DevOps', 'Ingeniero QA|Ingeniera QA', 'Desarrollador full-stack|Desarrolladora full-stack'], n: 11, skills: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Kubernetes', 'AWS', 'React', 'PostgreSQL', 'Testing', 'CI/CD'] },
        { name: 'Producto', color: '#0284c7', head: 'Head of Product', cargos: ['Product Manager', 'Product Owner', 'Analista de producto'], n: 4, skills: ['Roadmapping', 'Discovery', 'Métricas', 'Scrum', 'SQL', 'Entrevistas'] },
        { name: 'Diseño', color: '#db2777', head: 'Director de Diseño|Directora de Diseño', cargos: ['Diseñador UX|Diseñadora UX', 'Diseñador UI|Diseñadora UI', 'UX Researcher', 'UX Writer'], n: 4, skills: ['Figma', 'Design systems', 'Prototipado', 'Accesibilidad', 'Investigación', 'Ilustración'] },
        { name: 'Datos', color: '#0d9488', head: 'Head of Data', cargos: ['Científico de datos|Científica de datos', 'Ingeniero de datos|Ingeniera de datos', 'Analista BI'], n: 3, skills: ['Python', 'Machine learning', 'SQL', 'dbt', 'Power BI', 'Estadística'] },
        { name: 'Personas', color: '#b45309', head: 'Gerente de Personas', cargos: ['People Partner', 'Reclutador|Reclutadora'], n: 2, skills: ['Selección', 'Onboarding', 'Clima laboral', 'Compensaciones'] },
        { name: 'Finanzas', color: '#4d7c0f', head: 'Gerente de Finanzas', cargos: ['Contador|Contadora', 'Analista financiero|Analista financiera'], n: 2, skills: ['Contabilidad', 'Tributación', 'Excel', 'Presupuestos', 'SAP'] },
        { name: 'Ventas', color: '#dc2626', head: 'Director Comercial|Directora Comercial', cargos: ['Ejecutivo de cuentas|Ejecutiva de cuentas', 'Customer Success', 'SDR'], n: 4, skills: ['Negociación', 'CRM', 'Prospección', 'Presentaciones', 'Inglés avanzado'] }
      ]
    },
    {
      id: 'andes', name: 'Andes Logística', short: 'AL', tagline: 'Transporte y distribución', domain: 'andeslogistica.demo',
      brand: '#ea580c', city: 'Santiago', address: 'Camino Lo Boza 1200 (ficticio)', ext: 3, seed: 1987,
      meetingNames: ['Sala Aconcagua', 'Sala Osorno', 'Sala Licancabur', 'Sala Villarrica', 'Sala Tupungato'],
      lounge: ['Sala de espera', 'Patio Cordillera'],
      floors: [{ tpl: 'T1', use: [0, 1, 2, 3] }, { tpl: 'T2', use: [0, 1, 3, 4] }],
      areas: [
        { name: 'Dirección', color: '#475569', head: 'Gerente General', cargos: ['Asistente de gerencia'], n: 1, skills: ['Estrategia', 'Gestión', 'Finanzas corporativas', 'Agenda ejecutiva'] },
        { name: 'Operaciones', color: '#ea580c', head: 'Gerente de Operaciones', lead: 'Jefe de turno|Jefa de turno', cargos: ['Planificador de rutas|Planificadora de rutas', 'Coordinador de bodega|Coordinadora de bodega', 'Analista de operaciones', 'Supervisor de despacho|Supervisora de despacho'], n: 8, skills: ['Lean', 'WMS', 'Ruteo', 'Seguridad industrial', 'Excel', 'Inventarios'] },
        { name: 'Flota', color: '#0284c7', head: 'Jefe de Flota|Jefa de Flota', cargos: ['Coordinador de flota|Coordinadora de flota', 'Analista de mantenimiento', 'Encargado de GPS|Encargada de GPS'], n: 5, skills: ['Telemetría', 'Mantenimiento', 'Normativa de transporte', 'GPS', 'Costos'] },
        { name: 'Comercial', color: '#16a34a', head: 'Gerente Comercial', cargos: ['Ejecutivo comercial|Ejecutiva comercial', 'Key Account Manager', 'Analista de pricing'], n: 5, skills: ['Negociación', 'CRM', 'Licitaciones', 'Pricing', 'Inglés avanzado'] },
        { name: 'Finanzas', color: '#4d7c0f', head: 'Gerente de Finanzas', cargos: ['Contador|Contadora', 'Analista de cobranza', 'Tesorero|Tesorera'], n: 3, skills: ['Contabilidad', 'Tributación', 'SAP', 'Cobranza', 'Excel'] },
        { name: 'Personas', color: '#b45309', head: 'Jefe de Personas|Jefa de Personas', cargos: ['Analista de remuneraciones', 'Prevencionista de riesgos'], n: 2, skills: ['Remuneraciones', 'Prevención de riesgos', 'Selección', 'Capacitación'] },
        { name: 'TI', color: '#7c3aed', head: 'Jefe de TI|Jefa de TI', cargos: ['Soporte TI', 'Desarrollador ERP|Desarrolladora ERP', 'Administrador de redes|Administradora de redes'], n: 3, skills: ['Redes', 'SAP', 'SQL', 'Soporte', 'Ciberseguridad'] }
      ]
    },
    {
      id: 'verdemar', name: 'Verdemar Seguros', short: 'VS', tagline: 'Seguros generales y de vida', domain: 'verdemar.demo',
      brand: '#0f9f8f', city: 'Viña del Mar', address: 'Av. Libertad 1500 (ficticia)', ext: 4, seed: 777,
      meetingNames: ['Sala Pacífico', 'Sala Atlántico', 'Sala Índico', 'Sala Caribe', 'Sala Egeo', 'Sala Báltico', 'Sala Coral'],
      lounge: ['Sala de espera', 'Terraza Mirador'],
      floors: [{ tpl: 'T1', use: [0, 2, 4, 5] }, { tpl: 'T2', use: [0, 1, 2, 4] }, { tpl: 'T3', use: [0, 1, 2, 4] }],
      areas: [
        { name: 'Dirección', color: '#475569', head: 'Gerente General', cargos: ['Asistente de gerencia', 'Jefe de gabinete|Jefa de gabinete'], n: 2, skills: ['Estrategia', 'Gobierno corporativo', 'Gestión', 'Agenda ejecutiva'] },
        { name: 'Suscripción', color: '#0f766e', head: 'Gerente de Suscripción', cargos: ['Suscriptor|Suscriptora', 'Analista de riesgos', 'Inspector de riesgos|Inspectora de riesgos'], n: 6, skills: ['Evaluación de riesgos', 'Reaseguros', 'Normativa CMF', 'Excel', 'Pólizas'] },
        { name: 'Siniestros', color: '#dc2626', head: 'Gerente de Siniestros', lead: 'Jefe de liquidaciones|Jefa de liquidaciones', cargos: ['Liquidador|Liquidadora', 'Analista de siniestros', 'Ejecutivo de atención|Ejecutiva de atención'], n: 7, skills: ['Liquidación', 'Atención al cliente', 'Peritaje', 'Detección de fraude', 'Negociación'] },
        { name: 'Comercial', color: '#2563eb', head: 'Gerente Comercial', cargos: ['Ejecutivo de canal|Ejecutiva de canal', 'Agente de seguros', 'Analista comercial'], n: 5, skills: ['Venta consultiva', 'CRM', 'Corredores', 'Presentaciones', 'Negociación'] },
        { name: 'Actuarial', color: '#7c3aed', head: 'Actuario jefe|Actuaria jefa', cargos: ['Actuario|Actuaria', 'Analista actuarial'], n: 3, skills: ['Estadística', 'R', 'Python', 'Modelos de tarificación', 'Solvencia'] },
        { name: 'Legal', color: '#475569', head: 'Fiscal', cargos: ['Abogado|Abogada', 'Procurador|Procuradora'], n: 2, skills: ['Derecho de seguros', 'Contratos', 'Cumplimiento', 'Litigios'] },
        { name: 'TI', color: '#0284c7', head: 'Gerente de TI', cargos: ['Desarrollador|Desarrolladora', 'Arquitecto de soluciones|Arquitecta de soluciones', 'Soporte TI', 'Analista de ciberseguridad'], n: 4, skills: ['Java', 'Azure', 'SQL', 'Ciberseguridad', 'Integraciones'] },
        { name: 'Personas', color: '#b45309', head: 'Gerente de Personas', cargos: ['People Partner', 'Analista de capacitación'], n: 2, skills: ['Capacitación', 'Clima laboral', 'Selección', 'Remuneraciones'] }
      ]
    }
  ];

  function slug(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function build(cfg) {
    var r = mulberry32(cfg.seed);
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var used = {};
    var people = [];
    var areaColor = {};
    cfg.areas.forEach(function (a) { areaColor[a.name] = a.color; });

    function gform(s, g) { var p = s.split('|'); return g === 'f' && p[1] ? p[1] : p[0]; }

    function mk(area, cargoSpec, managerId, level) {
      var g, first, last, key, guard = 0;
      do {
        g = r() < 0.5 ? 'm' : 'f';
        first = pick(g === 'm' ? M : F);
        last = pick(LAST);
        key = first + ' ' + last;
      } while (used[key] && guard++ < 200);
      used[key] = 1;
      var idx = people.length + 1;
      var skills = [];
      var pool = area.skills.slice();
      for (var i = 0; i < 3 && pool.length; i++) skills.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      if (r() < 0.45) { var s = pick(SOFT); if (skills.indexOf(s) < 0) skills.push(s); }
      var roll = r();
      var status = roll < 0.56 ? 'oficina' : roll < 0.76 ? 'remoto' : roll < 0.9 ? 'reunion' : 'vacaciones';
      var p = {
        id: cfg.id + '-' + idx,
        first: first, last: last, name: key, gender: g,
        initials: (first[0] + last[0]).toUpperCase(),
        area: area.name, color: area.color,
        cargo: gform(cargoSpec, g),
        level: level,
        managerId: managerId,
        email: slug(first) + '.' + slug(last) + '@' + cfg.domain,
        phone: '+56 9 5' + String(100 + Math.floor(r() * 900)) + ' ' + String(1000 + Math.floor(r() * 9000)),
        ext: String(cfg.ext) + String(100 + idx),
        skills: skills,
        status: status,
        since: 2014 + Math.floor(r() * 12),
        city: cfg.city,
        remoteOnly: false,
        seat: null
      };
      people.push(p);
      return p;
    }

    var dir = cfg.areas[0];
    var ceo = mk(dir, dir.head, null, 0);
    ceo.status = 'oficina';
    for (var d = 0; d < dir.n; d++) mk(dir, dir.cargos[d % dir.cargos.length], ceo.id, 1);

    cfg.areas.slice(1).forEach(function (area) {
      var head = mk(area, area.head, ceo.id, 1);
      var lead = null, remaining = area.n;
      if (area.lead && area.n >= 6) { lead = mk(area, area.lead, head.id, 2); remaining--; }
      for (var i = 0; i < remaining; i++) {
        var mgr = lead && i >= Math.floor(remaining / 2) ? lead.id : head.id;
        mk(area, area.cargos[i % area.cargos.length], mgr, mgr === head.id ? 2 : 3);
      }
    });

    // Algunas personas 100% remotas (sin puesto fijo), nunca jefaturas.
    var candidates = people.filter(function (p) { return p.level >= 2; });
    var nRemote = 3 + Math.floor(r() * 2);
    for (var k = 0; k < nRemote && candidates.length; k++) {
      var c = candidates.splice(Math.floor(r() * candidates.length), 1)[0];
      c.remoteOnly = true;
      c.status = r() < 0.8 ? 'remoto' : 'vacaciones';
      c.city = pick(CITIES_REMOTE);
    }

    // Pisos
    var meetingI = 0, loungeI = 0;
    var floors = cfg.floors.map(function (fc, fi) {
      var t = TEMPLATES[fc.tpl];
      var num = fi + 1;
      var rooms = t.rooms.map(function (rm) {
        var name = ROOM_LABEL[rm.type];
        if (rm.type === 'meeting') name = cfg.meetingNames[meetingI++ % cfg.meetingNames.length];
        if (rm.type === 'lounge') name = cfg.lounge[Math.min(loungeI++, cfg.lounge.length - 1)];
        if (rm.type === 'reception' && fi > 0) name = 'Recepción';
        return { type: rm.type, x: rm.x, y: rm.y, w: rm.w, h: rm.h, cap: rm.cap || 0, name: name, busy: (rm.type === 'meeting' || rm.type === 'boardroom') && r() < 0.45 };
      });
      var clusters = fc.use.map(function (ci, k) {
        var cl = t.clusters[ci];
        var letter = String.fromCharCode(65 + k);
        var seats = [];
        for (var row = 0; row < 2; row++) {
          for (var col = 0; col < cl.cols; col++) {
            var n = row * cl.cols + col + 1;
            seats.push({
              id: num + letter + '-' + n,
              cx: cl.x + 37 + 74 * col,
              cy: row === 0 ? cl.y + 22 : cl.y + 154,
              dx: cl.x + 4 + 74 * col,
              dy: row === 0 ? cl.y + 44 : cl.y + 90,
              pid: null
            });
          }
        }
        return { letter: letter, x: cl.x, y: cl.y, cols: cl.cols, seats: seats, area: null };
      });
      return { num: num, name: 'Piso ' + num, tpl: fc.tpl, rooms: rooms, clusters: clusters };
    });

    // Asignación de puestos: desde el piso más alto hacia abajo (Dirección arriba).
    var allSeats = [];
    for (var f = floors.length - 1; f >= 0; f--) {
      floors[f].clusters.forEach(function (cl) { cl.seats.forEach(function (s) { allSeats.push(s); }); });
    }
    var seated = people.filter(function (p) { return !p.remoteOnly; });
    var nFree = allSeats.length - seated.length;
    var freeSet = {};
    var guard2 = 0;
    while (Object.keys(freeSet).length < nFree && guard2++ < 5000) {
      freeSet[Math.floor(r() * allSeats.length)] = 1;
    }
    var pi = 0;
    allSeats.forEach(function (s, i) {
      if (freeSet[i] || pi >= seated.length) return;
      s.pid = seated[pi].id;
      seated[pi].seat = s.id;
      pi++;
    });
    var byId = {};
    people.forEach(function (p) { byId[p.id] = p; });
    floors.forEach(function (fl) {
      fl.clusters.forEach(function (cl) {
        var count = {};
        cl.seats.forEach(function (s) { if (s.pid) { var a = byId[s.pid].area; count[a] = (count[a] || 0) + 1; } });
        var best = null;
        Object.keys(count).forEach(function (a) { if (!best || count[a] > count[best]) best = a; });
        cl.area = best;
      });
    });

    return {
      id: cfg.id, name: cfg.name, short: cfg.short, tagline: cfg.tagline, domain: cfg.domain,
      brand: cfg.brand, city: cfg.city, address: cfg.address,
      areas: cfg.areas.map(function (a) { return { name: a.name, color: a.color }; }),
      areaColor: areaColor,
      people: people, floors: floors
    };
  }

  return { companies: CFG.map(build) };
})();
