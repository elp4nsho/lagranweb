// Semilla de datos: 3 empresas ficticias con pisos, puestos, personas e historial.
import { rng } from '../../../assets/core/db.js';
import { today, addDays, isWeekend, dow, weekdaysBack, fromMin } from '../shared/dates.js';
import { fmtRut } from '../shared/util.js';

const M = ['Mateo', 'Benjamín', 'Tomás', 'Joaquín', 'Lucas', 'Martín', 'Diego', 'Sebastián', 'Nicolás', 'Felipe', 'Gabriel', 'Ignacio', 'Vicente', 'Agustín', 'Cristóbal', 'Andrés', 'Rodrigo', 'Pablo', 'Javier', 'Emilio', 'Gonzalo', 'Matías', 'Simón', 'Daniel', 'Raúl', 'Hugo', 'Esteban', 'Bruno', 'Iván', 'Álvaro'];
const F = ['Sofía', 'Valentina', 'Isidora', 'Emilia', 'Florencia', 'Catalina', 'Antonia', 'Martina', 'Josefa', 'Camila', 'Fernanda', 'Javiera', 'Constanza', 'Daniela', 'Paula', 'Lucía', 'Renata', 'Amanda', 'Trinidad', 'Agustina', 'Carolina', 'Elena', 'Victoria', 'Rocío', 'Ana', 'Julieta', 'Macarena', 'Gabriela', 'Beatriz', 'Isabel'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa', 'Riquelme', 'García', 'Miranda', 'Bravo', 'Vera', 'Molina', 'Vega', 'Campos', 'Sandoval', 'Orellana', 'Cárdenas', 'Olivares', 'Alarcón', 'Gallardo', 'Ortiz', 'Garrido', 'Salazar', 'Guzmán', 'Saavedra', 'Navarro', 'Aguilera', 'Parra', 'Romero', 'Aravena', 'Vidal', 'Ibáñez', 'Paredes', 'Lagos', 'Cáceres', 'Bustos', 'Leiva', 'Quiroz', 'Poblete'];
const CITIES_REMOTE = ['Valparaíso', 'Concepción', 'La Serena', 'Temuco', 'Puerto Varas', 'Antofagasta', 'Montevideo', 'Mendoza', 'Lima'];
const SOFT = ['Comunicación', 'Liderazgo', 'Inglés avanzado', 'Excel', 'Negociación', 'Primeros auxilios'];
const VISIT_ORGS = ['Consultora Pampa', 'Estudio Lirio', 'Grupo Maitén', 'Austral Data', 'Transportes Quillay', 'Banco Ficticio del Sur', 'Agencia Copihue', 'Imprenta Boldo', 'Courier Rápido', 'Clínica Ulmo', 'Auditores Peumo', 'Particular'];
const VISIT_REASONS = ['Reunión', 'Reunión', 'Entrevista', 'Entrega / courier', 'Proveedor técnico', 'Otro'];
const MEET_TITLES = ['Daily del equipo', 'Revisión de sprint', 'Comité de gerencia', 'Entrevista candidato', 'Planificación trimestral', 'Uno a uno', 'Demo con cliente', 'Capacitación interna', 'Retro', 'Reunión con proveedor', 'Taller de ideas', 'Revisión presupuesto'];

const TEMPLATES = {
  T1: {
    rooms: [
      { type: 'reception', x: 40, y: 40, w: 300, h: 200 }, { type: 'meeting', x: 360, y: 40, w: 200, h: 150, cap: 8 },
      { type: 'meeting', x: 580, y: 40, w: 170, h: 150, cap: 6 }, { type: 'kitchen', x: 770, y: 40, w: 230, h: 150 },
      { type: 'wc', x: 1020, y: 40, w: 140, h: 150 }, { type: 'lounge', x: 40, y: 260, w: 300, h: 200 },
      { type: 'elevator', x: 40, y: 480, w: 140, h: 240 }, { type: 'booths', x: 200, y: 480, w: 140, h: 240 }
    ],
    clusters: [{ x: 380, y: 260, cols: 3 }, { x: 680, y: 260, cols: 3 }, { x: 380, y: 520, cols: 3 }, { x: 680, y: 520, cols: 3 }, { x: 980, y: 260, cols: 2 }, { x: 980, y: 520, cols: 2 }]
  },
  T2: {
    rooms: [
      { type: 'meeting', x: 40, y: 40, w: 220, h: 160, cap: 10 }, { type: 'meeting', x: 280, y: 40, w: 180, h: 160, cap: 6 },
      { type: 'kitchen', x: 480, y: 40, w: 240, h: 160 }, { type: 'wc', x: 740, y: 40, w: 130, h: 160 },
      { type: 'elevator', x: 890, y: 40, w: 120, h: 160 }, { type: 'meeting', x: 1030, y: 40, w: 130, h: 160, cap: 4 },
      { type: 'booths', x: 1010, y: 240, w: 150, h: 480 }
    ],
    clusters: [{ x: 60, y: 240, cols: 3 }, { x: 380, y: 240, cols: 3 }, { x: 700, y: 240, cols: 3 }, { x: 60, y: 500, cols: 3 }, { x: 380, y: 500, cols: 3 }, { x: 700, y: 500, cols: 3 }]
  },
  T3: {
    rooms: [
      { type: 'boardroom', x: 40, y: 40, w: 400, h: 220, cap: 14 }, { type: 'meeting', x: 460, y: 40, w: 200, h: 160, cap: 6 },
      { type: 'wc', x: 680, y: 40, w: 140, h: 160 }, { type: 'elevator', x: 840, y: 40, w: 120, h: 160 },
      { type: 'lounge', x: 980, y: 40, w: 180, h: 300 }, { type: 'kitchen', x: 980, y: 360, w: 180, h: 170 },
      { type: 'it', x: 980, y: 550, w: 180, h: 170 }
    ],
    clusters: [{ x: 60, y: 300, cols: 3 }, { x: 400, y: 300, cols: 3 }, { x: 60, y: 530, cols: 3 }, { x: 400, y: 530, cols: 3 }, { x: 720, y: 300, cols: 2 }, { x: 720, y: 530, cols: 2 }]
  }
};
const ROOM_LABEL = { reception: 'Recepción', kitchen: 'Cocina', wc: 'Baños', lounge: 'Sala de estar', elevator: 'Ascensores', booths: 'Cabinas', boardroom: 'Directorio', it: 'TI · Bodega' };

export const CFG = [
  {
    id: 'nebula', name: 'Nébula Labs', short: 'NL', tagline: 'Software e IA aplicada', domain: 'nebulalabs.demo',
    brand: '#6d5efc', city: 'Santiago', address: 'Av. Andrés Bello 2457, piso 1 (ficticia)', ext: 2, seed: 4242,
    meetingNames: ['Sala Orión', 'Sala Vega', 'Sala Lyra', 'Sala Draco', 'Sala Fénix', 'Sala Atlas', 'Sala Cygnus'], lounge: ['Sala de estar', 'Terraza Galaxia'],
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
    meetingNames: ['Sala Aconcagua', 'Sala Osorno', 'Sala Licancabur', 'Sala Villarrica', 'Sala Tupungato'], lounge: ['Sala de estar', 'Patio Cordillera'],
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
    meetingNames: ['Sala Pacífico', 'Sala Atlántico', 'Sala Índico', 'Sala Caribe', 'Sala Egeo', 'Sala Báltico', 'Sala Coral'], lounge: ['Sala de estar', 'Terraza Mirador'],
    floors: [{ tpl: 'T1', use: [0, 2, 4, 5] }, { tpl: 'T2', use: [0, 1, 2, 4] }, { tpl: 'T3', use: [0, 1, 2, 4] }],
    areas: [
      { name: 'Dirección', color: '#475569', head: 'Gerente General', cargos: ['Asistente de gerencia', 'Jefe de gabinete|Jefa de gabinete'], n: 2, skills: ['Estrategia', 'Gobierno corporativo', 'Gestión', 'Agenda ejecutiva'] },
      { name: 'Suscripción', color: '#0f766e', head: 'Gerente de Suscripción', cargos: ['Suscriptor|Suscriptora', 'Analista de riesgos', 'Inspector de riesgos|Inspectora de riesgos'], n: 6, skills: ['Evaluación de riesgos', 'Reaseguros', 'Normativa CMF', 'Excel', 'Pólizas'] },
      { name: 'Siniestros', color: '#dc2626', head: 'Gerente de Siniestros', lead: 'Jefe de liquidaciones|Jefa de liquidaciones', cargos: ['Liquidador|Liquidadora', 'Analista de siniestros', 'Ejecutivo de atención|Ejecutiva de atención'], n: 7, skills: ['Liquidación', 'Atención al cliente', 'Peritaje', 'Detección de fraude', 'Negociación'] },
      { name: 'Comercial', color: '#2563eb', head: 'Gerente Comercial', cargos: ['Ejecutivo de canal|Ejecutiva de canal', 'Agente de seguros', 'Analista comercial'], n: 5, skills: ['Venta consultiva', 'CRM', 'Corredores', 'Presentaciones', 'Negociación'] },
      { name: 'Actuarial', color: '#7c3aed', head: 'Actuario jefe|Actuaria jefa', cargos: ['Actuario|Actuaria', 'Analista actuarial'], n: 3, skills: ['Estadística', 'R', 'Python', 'Modelos de tarificación', 'Solvencia'] },
      { name: 'Legal', color: '#64748b', head: 'Fiscal', cargos: ['Abogado|Abogada', 'Procurador|Procuradora'], n: 2, skills: ['Derecho de seguros', 'Contratos', 'Cumplimiento', 'Litigios'] },
      { name: 'TI', color: '#0284c7', head: 'Gerente de TI', cargos: ['Desarrollador|Desarrolladora', 'Arquitecto de soluciones|Arquitecta de soluciones', 'Soporte TI', 'Analista de ciberseguridad'], n: 4, skills: ['Java', 'Azure', 'SQL', 'Ciberseguridad', 'Integraciones'] },
      { name: 'Personas', color: '#b45309', head: 'Gerente de Personas', cargos: ['People Partner', 'Analista de capacitación'], n: 2, skills: ['Capacitación', 'Clima laboral', 'Selección', 'Remuneraciones'] }
    ]
  }
];

const slugName = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const gform = (s, g) => { const p = s.split('|'); return g === 'f' && p[1] ? p[1] : p[0]; };

// Construye habitaciones, zonas y escritorios de un piso a partir de una plantilla.
export function floorFromTemplate(tplId, num, use, names = {}) {
  const t = TEMPLATES[tplId];
  let mi = 0, li = 0;
  const rooms = t.rooms.map((rm, i) => {
    let name = ROOM_LABEL[rm.type];
    if (rm.type === 'meeting') name = (names.meeting || [])[names.mi = (names.mi ?? -1) + 1] || `Sala ${num}.${++mi}`;
    if (rm.type === 'lounge') name = (names.lounge || [])[li++] || 'Sala de estar';
    return { id: `r${num}-${i + 1}`, type: rm.type, name, x: rm.x, y: rm.y, w: rm.w, h: rm.h, cap: rm.cap || 0 };
  });
  const zones = [], desks = [];
  (use || t.clusters.map((_, i) => i)).forEach((ci, k) => {
    const cl = t.clusters[ci], letter = String.fromCharCode(65 + k);
    const zid = `z${num}${letter}`;
    zones.push({ id: zid, letter, name: `Zona ${letter}`, areaId: null });
    for (let row = 0; row < 2; row++) for (let col = 0; col < cl.cols; col++) {
      const code = `${num}${letter}-${row * cl.cols + col + 1}`;
      desks.push({ id: code, code, x: cl.x + 37 + 74 * col, y: row === 0 ? cl.y + 65 : cl.y + 111, rot: row === 0 ? 0 : 180, zoneId: zid, type: 'fijo' });
    }
  });
  return { rooms, zones, desks };
}
export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function seed() {
  const T = today();
  const companies = [], areas = [], floors = [], people = [], reservations = [], roomBookings = [], visitors = [], leaves = [], notifications = [];

  CFG.forEach(cfg => {
    const r = rng(cfg.seed);
    const used = {}, list = [];
    companies.push({ id: cfg.id, name: cfg.name, short: cfg.short, tagline: cfg.tagline, domain: cfg.domain, brand: cfg.brand, city: cfg.city, address: cfg.address, ext: cfg.ext, active: true });
    const areaIds = {};
    cfg.areas.forEach((a, i) => { const id = `${cfg.id}-a${i + 1}`; areaIds[a.name] = id; areas.push({ id, companyId: cfg.id, name: a.name, color: a.color, headId: null, description: '' }); });

    function mk(area, cargoSpec, managerId, level) {
      let g, first, last, key, guard = 0;
      do { g = r() < .5 ? 'm' : 'f'; first = r.pick(g === 'm' ? M : F); last = r.pick(LAST); key = first + ' ' + last; } while (used[key] && guard++ < 200);
      used[key] = 1;
      const idx = list.length + 1, pool = area.skills.slice(), skills = [];
      for (let i = 0; i < 3 && pool.length; i++) skills.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      if (r() < .45) { const s = r.pick(SOFT); if (!skills.includes(s)) skills.push(s); }
      const roll = r();
      const nDays = level <= 1 ? 4 + (r() < .5 ? 1 : 0) : r.int(2, 4);
      const days = [1, 2, 3, 4, 5].sort(() => r() - .5).slice(0, nDays).sort();
      const p = {
        id: `${cfg.id}-${idx}`, companyId: cfg.id, first, last, name: key, gender: g,
        areaId: areaIds[area.name], cargo: gform(cargoSpec, g), level, managerId,
        email: `${slugName(first)}.${slugName(last)}@${cfg.domain}`,
        phone: `+56 9 5${r.int(100, 999)} ${r.int(1000, 9999)}`, ext: `${cfg.ext}${100 + idx}`,
        skills, status: roll < .56 ? 'oficina' : roll < .76 ? 'remoto' : roll < .9 ? 'reunion' : 'vacaciones',
        since: 2014 + Math.floor(r() * 12), city: cfg.city, remoteOnly: false, deskId: null, workDays: days,
        bio: '', pronouns: '', createdAt: new Date(Date.now() - r.int(30, 900) * 864e5).toISOString()
      };
      list.push(p);
      return p;
    }
    const dir = cfg.areas[0];
    const ceo = mk(dir, dir.head, null, 0); ceo.status = 'oficina';
    areas.find(a => a.id === areaIds[dir.name]).headId = ceo.id;
    for (let d = 0; d < dir.n; d++) mk(dir, dir.cargos[d % dir.cargos.length], ceo.id, 1);
    cfg.areas.slice(1).forEach(area => {
      const head = mk(area, area.head, ceo.id, 1);
      areas.find(a => a.id === areaIds[area.name]).headId = head.id;
      let lead = null, remaining = area.n;
      if (area.lead && area.n >= 6) { lead = mk(area, area.lead, head.id, 2); remaining--; }
      for (let i = 0; i < remaining; i++) {
        const mgr = lead && i >= Math.floor(remaining / 2) ? lead.id : head.id;
        mk(area, area.cargos[i % area.cargos.length], mgr, mgr === head.id ? 2 : 3);
      }
    });
    // Personas 100 % remotas y personas "flex" (sin puesto fijo, reservan).
    const cands = list.filter(p => p.level >= 2);
    for (let k = 0, n = 3 + Math.floor(r() * 2); k < n && cands.length; k++) {
      const c = cands.splice(Math.floor(r() * cands.length), 1)[0];
      c.remoteOnly = true; c.workDays = []; c.status = r() < .8 ? 'remoto' : 'vacaciones'; c.city = r.pick(CITIES_REMOTE);
    }
    const flex = new Set();
    for (let k = 0, n = Math.round(cands.length * .3); k < n && cands.length; k++) flex.add(cands.splice(Math.floor(r() * cands.length), 1)[0].id);
    if (cfg.id === 'nebula') { const eng = list.find(p => p.level === 3 && !p.remoteOnly) || list.find(p => p.level === 2 && !p.remoteOnly); flex.add(eng.id); eng.demo = 'flex'; }

    // Pisos
    const names = { meeting: cfg.meetingNames, lounge: cfg.lounge };
    const fl = cfg.floors.map((fc, fi) => {
      const f = floorFromTemplate(fc.tpl, fi + 1, fc.use, names);
      f.desks.forEach(d => { d.id = `${cfg.id}-${d.code}`; });
      return { id: `${cfg.id}-f${fi + 1}`, companyId: cfg.id, num: fi + 1, name: `Piso ${fi + 1}`, template: fc.tpl, w: 1200, h: 760, ...f };
    });
    // Asignación: Dirección en el piso más alto, se llena hacia abajo.
    const allSeats = [];
    for (let f = fl.length - 1; f >= 0; f--) fl[f].desks.forEach(d => allSeats.push(d));
    const seated = list.filter(p => !p.remoteOnly && !flex.has(p.id));
    const nFree = allSeats.length - seated.length;
    const freeSet = new Set();
    let guard = 0;
    while (freeSet.size < nFree && guard++ < 5000) freeSet.add(Math.floor(r() * allSeats.length));
    let pi = 0;
    allSeats.forEach((s, i) => {
      if (freeSet.has(i) || pi >= seated.length) { s.type = 'flexible'; return; }
      seated[pi].deskId = s.id; pi++;
    });
    // Barrios: zona → área mayoritaria.
    fl.forEach(f => f.zones.forEach(z => {
      const cnt = {};
      f.desks.filter(d => d.zoneId === z.id).forEach(d => { const p = list.find(x => x.deskId === d.id); if (p) cnt[p.areaId] = (cnt[p.areaId] || 0) + 1; });
      const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      const flexCount = f.desks.filter(d => d.zoneId === z.id && d.type === 'flexible').length;
      z.areaId = best && flexCount <= 3 ? best : null;
      if (!z.areaId) z.name = `Zona ${z.letter} · Flexible`;
    }));
    floors.push(...fl);

    // Reservas de puestos flexibles (historial y próximos días).
    const flexDesks = fl.flatMap(f => f.desks.filter(d => d.type === 'flexible').map(d => ({ d, f })));
    const flexPeople = list.filter(p => flex.has(p.id));
    for (let o = -28; o <= 9; o++) {
      const k = addDays(T, o);
      if (isWeekend(k)) continue;
      const taken = new Set();
      flexPeople.forEach(p => {
        if (!p.workDays.includes(dow(k)) || r() > .85) return;
        if (p.demo && o === 0) return; // la persona demo reserva hoy desde la app
        let pick, g = 0;
        do { pick = r.pick(flexDesks); } while (taken.has(pick.d.id) && g++ < 40);
        if (taken.has(pick.d.id)) return;
        taken.add(pick.d.id);
        const status = o < 0 ? (r() < .08 ? 'no-show' : 'completada') : o === 0 ? (r() < .6 ? 'checkin' : 'reservada') : 'reservada';
        reservations.push({ companyId: cfg.id, personId: p.id, deskId: pick.d.id, floorId: pick.f.id, date: k, status, createdAt: new Date(Date.now() + (o - r.int(1, 6)) * 864e5).toISOString(), checkinAt: status === 'checkin' || status === 'completada' ? `${k}T0${r.int(8, 9)}:${r.int(10, 59)}` : null });
      });
    }
    // Salas: reservas de -7 a +7 días.
    const bookable = fl.flatMap(f => f.rooms.filter(x => x.type === 'meeting' || x.type === 'boardroom').map(x => ({ x, f })));
    for (let o = -7; o <= 7; o++) {
      const k = addDays(T, o);
      if (isWeekend(k)) continue;
      bookable.forEach(({ x, f }) => {
        let t = 8 * 60 + r.int(0, 4) * 30;
        const n = r.int(0, 3);
        for (let i = 0; i < n; i++) {
          const dur = r.pick([30, 60, 60, 90, 120]);
          if (t + dur > 19 * 60) break;
          const org = r.pick(list);
          roomBookings.push({ companyId: cfg.id, floorId: f.id, roomId: x.id, date: k, start: fromMin(t), end: fromMin(t + dur), title: r.pick(MEET_TITLES), organizerId: org.id, attendees: r.int(2, Math.max(2, x.cap)) });
          t += dur + r.int(1, 5) * 30;
        }
      });
    }
    // Visitas: historial de 45 días hábiles + hoy.
    const hosts = list.filter(p => !p.remoteOnly);
    let seq = 1;
    const visitor = (k, status, hh, mm) => {
      const g = r() < .5 ? M : F;
      const name = `${r.pick(g)} ${r.pick(LAST)} ${r.pick(LAST)}`;
      const inAt = `${k}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
      const outAt = status === 'salió' ? new Date(new Date(inAt).getTime() + r.int(25, 180) * 6e4).toISOString() : null;
      const host = r.pick(hosts);
      return {
        companyId: cfg.id, name, doc: fmtRut(r.int(8000000, 24000000)), org: r.pick(VISIT_ORGS), hostId: host.id, reason: r.pick(VISIT_REASONS),
        email: '', date: k, expectedAt: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, checkIn: status === 'esperada' ? null : new Date(inAt).toISOString(),
        checkOut: outAt, status, code: `V-${k.slice(5).replace('-', '')}-${String(seq++).padStart(3, '0')}`, notified: status !== 'esperada', preRegistered: r() < .4
      };
    };
    weekdaysBack(45, addDays(T, -1)).forEach(k => { for (let i = 0, n = r.int(0, 5); i < n; i++) visitors.push(visitor(k, 'salió', r.int(9, 16), r.int(0, 59))); });
    if (!isWeekend(T)) {
      for (let i = 0; i < 2; i++) visitors.push(visitor(T, 'salió', 9, r.int(0, 50)));
      for (let i = 0; i < 2; i++) visitors.push(visitor(T, 'en sitio', 10 + i, r.int(0, 50)));
      for (let i = 0; i < 3; i++) visitors.push(visitor(T, 'esperada', 14 + i, r.pick([0, 15, 30, 45])));
    }
    // Vacaciones registradas.
    list.filter(p => p.status === 'vacaciones').forEach(p => leaves.push({ companyId: cfg.id, personId: p.id, from: addDays(T, -r.int(1, 6)), to: addDays(T, r.int(2, 9)), type: 'Vacaciones' }));
    for (let i = 0; i < 6; i++) { const p = r.pick(list); const s = r.int(3, 30); leaves.push({ companyId: cfg.id, personId: p.id, from: addDays(T, s), to: addDays(T, s + r.int(2, 8)), type: r.pick(['Vacaciones', 'Vacaciones', 'Capacitación', 'Permiso']) }); }

    people.push(...list);
  });

  const neb = people.find(p => p.demo === 'flex');
  const andesFixed = people.find(p => p.companyId === 'andes' && p.level === 2 && p.deskId);
  // Las personas demo parten disponibles (sin vacaciones) para que la demo tenga sentido.
  neb.status = 'remoto'; andesFixed.status = 'oficina';
  for (let i = leaves.length - 1; i >= 0; i--) if (leaves[i].personId === neb.id || leaves[i].personId === andesFixed.id) leaves.splice(i, 1);
  const users = [
    { name: 'Carla Muñoz', email: 'admin@quienesquien.demo', password: 'demo123', role: 'admin', color: '#4f46e5', demo: true, active: true, personId: null, companyId: null },
    { name: 'Rodrigo Fuentes', email: 'rrhh@quienesquien.demo', password: 'demo123', role: 'rrhh', color: '#b45309', demo: true, active: true, personId: null, companyId: null },
    { name: 'Daniela Pizarro', email: 'recepcion@quienesquien.demo', password: 'demo123', role: 'recepcion', color: '#0d9488', demo: true, active: true, personId: null, companyId: null },
    { name: neb.name, email: neb.email, password: 'demo123', role: 'empleado', color: '#4f46e5', demo: true, active: true, personId: neb.id, companyId: 'nebula' },
    { name: andesFixed.name, email: andesFixed.email, password: 'demo123', role: 'empleado', color: '#ea580c', demo: true, active: true, personId: andesFixed.id, companyId: 'andes' },
    { name: 'Tomás Vergara', email: 'tomas.vergara@quienesquien.demo', password: 'demo123', role: 'recepcion', color: '#64748b', demo: false, active: false, personId: null, companyId: null }
  ];
  notifications.push(
    { personId: neb.id, text: 'Recuerda reservar tu puesto para mañana: quedan pocos en el Piso 2.', at: new Date(Date.now() - 3 * 36e5).toISOString(), read: false, kind: 'reserva' },
    { personId: neb.id, text: 'Nuevo anuncio: Simulacro de evacuación este jueves.', at: new Date(Date.now() - 26 * 36e5).toISOString(), read: true, kind: 'anuncio' }
  );
  const ago = d => new Date(Date.now() - d * 864e5).toISOString();
  const announcements = [
    { title: 'Simulacro de evacuación', body: 'El jueves a las 11:00 haremos un simulacro. Sigue a los líderes de piso y reúnete en el punto de encuentro de la plaza.', audience: 'todos', companyId: null, pinned: true, published: true, date: ago(1), author: 'Carla Muñoz' },
    { title: 'Nuevas cabinas telefónicas en el Piso 2', body: 'Ya están disponibles 4 cabinas para llamadas. No requieren reserva: úsalas por un máximo de 45 minutos.', audience: 'empleados', companyId: 'nebula', pinned: false, published: true, date: ago(3), author: 'Carla Muñoz' },
    { title: 'Bienvenida a nuestras visitas', body: 'Por favor solicita tu credencial en recepción y mantenla visible durante tu estadía. Wi-Fi invitados: «Visitas» · clave en tu credencial.', audience: 'kiosko', companyId: null, pinned: true, published: true, date: ago(5), author: 'Daniela Pizarro' },
    { title: 'Día de la fruta: viernes en la cocina', body: 'Cada viernes habrá fruta de temporada en las cocinas de todos los pisos. ¡Pasa a buscar la tuya!', audience: 'empleados', companyId: null, pinned: false, published: true, date: ago(8), author: 'Rodrigo Fuentes' },
    { title: 'Mantención de ascensores', body: 'El sábado se realizará mantención preventiva de los ascensores entre 9:00 y 13:00.', audience: 'todos', companyId: 'andes', pinned: false, published: true, date: ago(2), author: 'Carla Muñoz' },
    { title: 'Encuesta de espacios de trabajo (borrador)', body: 'Queremos saber cómo usas la oficina para rediseñar los barrios del Piso 3.', audience: 'empleados', companyId: null, pinned: false, published: false, date: ago(0), author: 'Rodrigo Fuentes' }
  ];
  const rules = Object.fromEntries(CFG.map(c => [c.id, { maxDaysAhead: 14, maxPerWeek: 4, checkinDeadline: '10:30', restrictNeighborhoods: false, allowWeekends: false, autoRelease: true }]));
  const site = {
    heroTitle: '¿Quién es quién?', heroSubtitle: 'Encuentra a cualquier persona, su puesto y cómo contactarla en segundos.',
    kioskWelcome: 'Bienvenido/a. ¿A quién vienes a ver?', kioskSubtitle: 'Regístrate en un minuto y avisaremos a tu anfitrión.',
    showPhones: true, showOrg: true, wifi: 'Visitas-2026'
  };
  return { companies, areas, floors, people, reservations, roomBookings, visitors, leaves, notifications, announcements, users, rules, site };
}
