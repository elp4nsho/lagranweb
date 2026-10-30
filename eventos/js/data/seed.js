// Datos semilla de Tiquetera Volcán. Todo es ficticio y reproducible (rng).
import { rng } from '../../../assets/core/db.js';

const DAY = 864e5;
const iso = ms => new Date(ms).toISOString();
// Fecha relativa a hoy a una hora fija (para que los eventos siempre sean "próximos").
const at = (days, h = 21, m = 0) => { const d = new Date(Date.now() + days * DAY); d.setHours(h, m, 0, 0); return d.toISOString(); };

export const CITIES = ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Temuco', 'Puerto Varas', 'Antofagasta'];
export const CATEGORIES = { conciertos: 'Conciertos', teatro: 'Teatro', deportes: 'Deportes', conferencias: 'Conferencias' };

const FIRST = ['Valentina', 'Matías', 'Catalina', 'Benjamín', 'Antonia', 'Vicente', 'Josefa', 'Tomás', 'Isidora', 'Agustín', 'Florencia', 'Martín', 'Emilia', 'Joaquín', 'Trinidad', 'Lucas', 'Fernanda', 'Diego', 'Javiera', 'Sebastián', 'Constanza', 'Ignacio', 'Francisca', 'Cristóbal', 'Amanda', 'Felipe', 'Renata', 'Gaspar', 'Maite', 'Bastián'];
const LAST = ['Rojas', 'Muñoz', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Pizarro', 'Carrasco', 'Núñez', 'Vergara'];
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#ea580c', '#16a34a', '#2563eb', '#db2777', '#0d9488', '#ca8a04', '#9333ea'];

const ROWL = i => (i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26));
export const rowLetter = ROWL;

function venues() {
  return [
    { id: 'v1', name: 'Arena Cordillera', city: 'Santiago', address: 'Av. Los Volcanes 1450, Ñuñoa', capacity: 0, gaCapacity: 240, gaName: 'Cancha', mapX: 62, mapY: 38,
      sections: [
        { id: 'pv', name: 'Platea VIP', rows: 4, seats: 16, zone: 'vip' },
        { id: 'pi', name: 'Platea Izquierda', rows: 6, seats: 10, zone: 'platea' },
        { id: 'pc', name: 'Platea Central', rows: 6, seats: 14, zone: 'platea' },
        { id: 'pd', name: 'Platea Derecha', rows: 6, seats: 10, zone: 'platea' },
        { id: 'tr', name: 'Tribuna Alta', rows: 4, seats: 26, zone: 'tribuna' }
      ] },
    { id: 'v2', name: 'Teatro Puerto Alto', city: 'Valparaíso', address: 'Cerro Alegre, Pasaje Las Gaviotas 210', capacity: 0, gaCapacity: 0, mapX: 30, mapY: 55,
      sections: [
        { id: 'ps', name: 'Platea', rows: 8, seats: 16, zone: 'platea' },
        { id: 'pa', name: 'Palco Izq.', rows: 3, seats: 6, zone: 'palco' },
        { id: 'pb', name: 'Palco Der.', rows: 3, seats: 6, zone: 'palco' },
        { id: 'ga', name: 'Galería', rows: 4, seats: 22, zone: 'galeria' }
      ] },
    { id: 'v3', name: 'Club Subterráneo', city: 'Santiago', address: 'Bellavista 0392, Providencia', capacity: 0, gaCapacity: 180, gaName: 'Pista', mapX: 48, mapY: 30, sections: [] },
    { id: 'v4', name: 'Coliseo Austral', city: 'Concepción', address: 'Av. Costanera Sur 800', capacity: 0, gaCapacity: 120, gaName: 'Galería norte', mapX: 70, mapY: 62,
      sections: [
        { id: 'lo', name: 'Lateral Oriente', rows: 6, seats: 22, zone: 'lateral' },
        { id: 'cp', name: 'Cancha Premium', rows: 3, seats: 20, zone: 'premium' },
        { id: 'lp', name: 'Lateral Poniente', rows: 6, seats: 22, zone: 'lateral' }
      ] },
    { id: 'v5', name: 'Centro de Convenciones Elqui', city: 'La Serena', address: 'Av. del Mar 3300', capacity: 0, gaCapacity: 0, mapX: 40, mapY: 44,
      sections: [
        { id: 'sa', name: 'Auditorio A', rows: 7, seats: 14, zone: 'general' },
        { id: 'sf', name: 'Primeras filas', rows: 2, seats: 14, zone: 'preferente' }
      ] },
    { id: 'v6', name: 'Anfiteatro del Lago', city: 'Puerto Varas', address: 'Costanera Vicente Pérez Rosales s/n', capacity: 0, gaCapacity: 160, gaName: 'Explanada', mapX: 55, mapY: 50,
      sections: [{ id: 'gr', name: 'Graderías', rows: 5, seats: 24, zone: 'graderia' }] },
    { id: 'v7', name: 'Domo Desierto', city: 'Antofagasta', address: 'Av. Grecia 2100', capacity: 0, gaCapacity: 200, gaName: 'Cancha', mapX: 36, mapY: 36, sections: [] },
    { id: 'v8', name: 'Gimnasio Araucanía', city: 'Temuco', address: 'Calle Prieto Norte 455', capacity: 0, gaCapacity: 0, mapX: 58, mapY: 42,
      sections: [
        { id: 'nn', name: 'Tribuna Norte', rows: 5, seats: 20, zone: 'tribuna' },
        { id: 'ss', name: 'Tribuna Sur', rows: 5, seats: 20, zone: 'tribuna' },
        { id: 'pp', name: 'Butacas Cancha', rows: 2, seats: 16, zone: 'cancha' }
      ] }
  ].map(v => ({ ...v, active: true, capacity: v.gaCapacity + v.sections.reduce((s, x) => s + x.rows * x.seats, 0) }));
}

// [título, categoría, venueId, díasDesdeHoy, organizador, estado, tiers [nombre, zona, precio, cupoGA?], vendido(0-1), extra]
const EVENTS = [
  ['Los Cóndores Eléctricos · Gira Magma', 'conciertos', 'v1', 18, 'o1', 'publicado', [['VIP', 'vip', 89000], ['Platea', 'platea', 54000], ['Tribuna', 'tribuna', 32000], ['Cancha', 'ga', 28000]], .5, { featured: true, lineup: [['Marea Baja', '20:00', 'Telonero'], ['Los Cóndores Eléctricos', '21:15', 'Principal']], eb: true }],
  ['Festival Volcán Sonoro 2026', 'conciertos', 'v6', 37, 'o1', 'publicado', [['Graderías', 'graderia', 46000], ['Explanada', 'ga', 35000]], .44, { featured: true, lineup: [['Aurora Boreal Trío', '15:00', 'Escenario Lago'], ['DJ Lickan', '17:30', 'Escenario Bosque'], ['Niebla Sur', '19:00', 'Escenario Lago'], ['Los Cóndores Eléctricos', '21:30', 'Cierre']], eb: true, hour: 15 }],
  ['Marea Baja · Noche acústica', 'conciertos', 'v2', 9, 'o1', 'publicado', [['Platea', 'platea', 38000], ['Palco', 'palco', 52000], ['Galería', 'galeria', 22000]], 1, { lineup: [['Marea Baja', '20:30', 'Principal']] }],
  ['DJ Lickan · Desierto Live', 'conciertos', 'v7', 25, 'o1', 'publicado', [['Cancha', 'ga', 25000], ['Cancha Fast Pass', 'ga', 39000]], .35, { lineup: [['Kaleidosur', '22:00', 'Warm up'], ['DJ Lickan', '23:30', 'Principal']], hour: 22 }],
  ['Club Subterráneo presenta: Niebla Sur', 'conciertos', 'v3', 4, 'o1', 'publicado', [['General', 'ga', 15000]], 1, { lineup: [['Niebla Sur', '22:30', 'Principal']], hour: 22 }],
  ['Orquesta Pacífico Sur · Sinfonía de los Glaciares', 'conciertos', 'v2', 52, 'o2', 'publicado', [['Platea', 'platea', 30000], ['Palco', 'palco', 45000], ['Galería', 'galeria', 14000]], .21, { lineup: [['Orquesta Pacífico Sur', '19:30', 'Dir. Inés Valdivia']], hour: 19 }],
  ['La casa de los vientos', 'teatro', 'v2', 13, 'o2', 'publicado', [['Platea', 'platea', 24000], ['Palco', 'palco', 32000], ['Galería', 'galeria', 12000]], .55, { lineup: [['Compañía Teatro Andante', '20:00', 'Elenco'], ['Rosa Quiroga', '', 'Dirección']], hour: 20, featured: true }],
  ['Pancho Risas · Stand-up "Sin filtro"', 'teatro', 'v5', 21, 'o2', 'publicado', [['Preferente', 'preferente', 26000], ['General', 'general', 18000]], .48, { lineup: [['Pancho Risas', '21:00', 'Comediante']] }],
  ['Ballet Nieve · El Cascanueces Austral', 'teatro', 'v8', 44, 'o2', 'publicado', [['Butacas', 'cancha', 28000], ['Tribuna', 'tribuna', 16000]], .18, { lineup: [['Ballet Nieve', '19:00', 'Compañía']], hour: 19, eb: true }],
  ['Improvisa Puerto · Temporada', 'teatro', 'v3', 11, 'o2', 'publicado', [['General', 'ga', 9000]], .4, { lineup: [['Colectivo Improvisa', '20:30', 'Elenco']], hour: 20 }],
  ['Final Liga Austral: Leones vs. Pumas del Sur', 'deportes', 'v4', 16, 'o3', 'publicado', [['Cancha Premium', 'premium', 42000], ['Lateral', 'lateral', 19000], ['Galería', 'ga', 9000]], .7, { featured: true, lineup: [['Leones de Concepción', '20:00', 'Local'], ['Pumas del Sur', '20:00', 'Visita']], hour: 20 }],
  ['Clásico del Norte · Futsal', 'deportes', 'v8', 7, 'o3', 'publicado', [['Butacas', 'cancha', 15000], ['Tribuna', 'tribuna', 7000]], .58, { lineup: [['Mineros FS', '19:00', 'Local'], ['Araucanía FS', '19:00', 'Visita']], hour: 19 }],
  ['Copa Volcán de Vóleibol', 'deportes', 'v4', 30, 'o3', 'publicado', [['Cancha Premium', 'premium', 18000], ['Lateral', 'lateral', 9000], ['Galería', 'ga', 5000]], .22, { lineup: [['8 selecciones regionales', '10:00', 'Fase final']], hour: 10 }],
  ['TechAndes 2026 · Conferencia de innovación', 'conferencias', 'v5', 28, 'o4', 'publicado', [['Preferente', 'preferente', 95000], ['General', 'general', 65000]], .5, { featured: true, lineup: [['Daniela Oyarzún', '09:30', 'Keynote: IA en el sur'], ['Rodrigo Paillán', '11:00', 'Energía y datos'], ['Panel abierto', '15:00', 'Startups regionales']], hour: 9, eb: true }],
  ['Foro Futuro: Minería Verde', 'conferencias', 'v7', 40, 'o4', 'publicado', [['General', 'ga', 45000]], .3, { lineup: [['Marcela Ríos', '09:00', 'Apertura'], ['Hugo Tapia', '10:30', 'Hidrógeno verde']], hour: 9 }],
  ['Encuentro Emprende Sur', 'conferencias', 'v6', 59, 'o4', 'publicado', [['Graderías', 'graderia', 20000], ['Explanada', 'ga', 12000]], .08, { lineup: [['Fabiola Ancán', '10:00', 'Charla inaugural']], hour: 10 }],
  // Pendientes / borradores
  ['Jazz en el Lago · Edición invierno', 'conciertos', 'v6', 66, 'o1', 'pendiente', [['Graderías', 'graderia', 32000], ['Explanada', 'ga', 22000]], 0, { lineup: [['Cuarteto Calbuco', '19:00', 'Principal']], hour: 19 }],
  ['Hackatón Austral 48h', 'conferencias', 'v5', 72, 'o4', 'pendiente', [['General', 'general', 10000]], 0, { lineup: [['Equipos de 4 personas', '09:00', 'Inicio']], hour: 9 }],
  ['Noche de Boleros', 'conciertos', 'v3', 80, 'o2', 'borrador', [['General', 'ga', 12000]], 0, { lineup: [] }],
  // Pasados
  ['Aurora Boreal Trío · Lanzamiento', 'conciertos', 'v3', -12, 'o1', 'finalizado', [['General', 'ga', 14000]], .92, { lineup: [['Aurora Boreal Trío', '21:00', 'Principal']] }],
  ['Semifinal Liga Austral', 'deportes', 'v4', -26, 'o3', 'finalizado', [['Cancha Premium', 'premium', 35000], ['Lateral', 'lateral', 16000], ['Galería', 'ga', 8000]], .5, { lineup: [['Leones de Concepción', '20:00', 'Local'], ['Delfines de Coquimbo', '20:00', 'Visita']] }],
  ['Monólogos del Puerto', 'teatro', 'v2', -40, 'o2', 'finalizado', [['Platea', 'platea', 18000], ['Palco', 'palco', 26000], ['Galería', 'galeria', 9000]], .5, { lineup: [['Varios comediantes', '21:00', 'Elenco']] }],
  ['Data Summit Norte', 'conferencias', 'v7', -63, 'o4', 'finalizado', [['General', 'ga', 55000]], .4, { lineup: [['Ana Lagos', '09:00', 'Keynote']] }],
  ['Niebla Sur · Gira Otoño', 'conciertos', 'v3', -130, 'o1', 'finalizado', [['General', 'ga', 13000]], .45, { lineup: [['Niebla Sur', '22:00', 'Principal']] }],
  ['Foro Futuro: Ciudades', 'conferencias', 'v5', -165, 'o4', 'finalizado', [['Preferente', 'preferente', 60000], ['General', 'general', 40000]], .35, { lineup: [['Marcela Ríos', '09:00', 'Apertura']] }],
  ['Copa Invierno de Básquetbol', 'deportes', 'v8', -200, 'o3', 'finalizado', [['Butacas', 'cancha', 12000], ['Tribuna', 'tribuna', 6000]], .4, { lineup: [['Leones', '19:00', 'Local'], ['Mineros', '19:00', 'Visita']] }],
  ['El jardín de las mareas', 'teatro', 'v2', -240, 'o2', 'finalizado', [['Platea', 'platea', 20000], ['Palco', 'palco', 28000], ['Galería', 'galeria', 10000]], .35, { lineup: [['Compañía Teatro Andante', '20:00', 'Elenco']] }],
  ['DJ Lickan · Sunset Lago', 'conciertos', 'v6', -280, 'o1', 'finalizado', [['Explanada', 'ga', 18000]], .5, { lineup: [['DJ Lickan', '19:00', 'Principal']] }],
  ['Marea Baja · Primer disco', 'conciertos', 'v3', -320, 'o1', 'finalizado', [['General', 'ga', 10000]], .5, { lineup: [['Marea Baja', '21:30', 'Principal']] }],
  ['Los Cóndores Eléctricos · Unplugged', 'conciertos', 'v1', -95, 'o1', 'finalizado', [['VIP', 'vip', 79000], ['Platea', 'platea', 49000], ['Tribuna', 'tribuna', 29000], ['Cancha', 'ga', 25000]], .38, { lineup: [['Los Cóndores Eléctricos', '21:00', 'Principal']] }]
];

const DESCS = {
  conciertos: 'Una noche para cantar fuerte: producción completa de luces y sonido, barras y food trucks en el recinto. Apertura de puertas 90 minutos antes del show.',
  teatro: 'Una puesta en escena íntima y potente. Recomendado para mayores de 14 años. Duración aproximada: 100 minutos sin intermedio.',
  deportes: 'Vive la emoción en vivo con la mejor ubicación. Ingreso por accesos numerados según tu sector. Prohibido el ingreso de bengalas.',
  conferencias: 'Charlas, paneles y networking con líderes de la industria. Incluye café, almuerzo y certificado de asistencia digital.'
};

const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeCode(r) {
  const p = n => Array.from({ length: n }, () => ALPH[Math.floor(r() * ALPH.length)]).join('');
  return `VLC-${p(4)}-${p(4)}`;
}

export function seed() {
  const r = rng(2026);
  const V = venues();
  const organizers = [
    { id: 'o1', name: 'Sur Sonoro Producciones', rut: '76.412.880-3', email: 'contacto@sursonoro.cl', phone: '+56 2 2940 1100', commissionPct: 7, status: 'activo', bank: 'Banco Austral · Cta. Cte. 0012-4455', createdAt: iso(Date.now() - 400 * DAY) },
    { id: 'o2', name: 'Teatro Andante Cía.', rut: '65.118.402-K', email: 'hola@teatroandante.cl', phone: '+56 32 233 8899', commissionPct: 6, status: 'activo', bank: 'Banco Pacífico · Cta. Vista 8899-21', createdAt: iso(Date.now() - 300 * DAY) },
    { id: 'o3', name: 'Liga Austral Eventos', rut: '77.901.233-5', email: 'tickets@ligaaustral.cl', phone: '+56 41 228 7700', commissionPct: 8, status: 'activo', bank: 'Banco Austral · Cta. Cte. 4410-0021', createdAt: iso(Date.now() - 250 * DAY) },
    { id: 'o4', name: 'Foro Futuro SpA', rut: '76.889.120-1', email: 'eventos@forofuturo.cl', phone: '+56 51 221 4040', commissionPct: 8, status: 'activo', bank: 'Banco del Norte · Cta. Cte. 7781-33', createdAt: iso(Date.now() - 200 * DAY) },
    { id: 'o5', name: 'Ritmo Patagón', rut: '77.230.551-8', email: 'ritmo@patagon.cl', phone: '+56 61 220 1188', commissionPct: 8, status: 'pendiente', bank: '', createdAt: iso(Date.now() - 6 * DAY) }
  ];

  const users = [
    { id: 'u-admin', name: 'Camila Fuentes', email: 'admin@volcan.cl', password: 'demo123', role: 'admin', color: '#e11d48', demo: true, active: true, createdAt: iso(Date.now() - 500 * DAY) },
    { id: 'u-soporte', name: 'Rodrigo Pizarro', email: 'soporte@volcan.cl', password: 'demo123', role: 'soporte', color: '#0891b2', demo: true, active: true, createdAt: iso(Date.now() - 320 * DAY) },
    { id: 'u-prod', name: 'Ignacio Vergara', email: 'productor@sursonoro.cl', password: 'demo123', role: 'productor', organizerId: 'o1', color: '#7c3aed', demo: true, active: true, createdAt: iso(Date.now() - 390 * DAY) },
    { id: 'u-prod2', name: 'Rosa Quiroga', email: 'rosa@teatroandante.cl', password: 'demo123', role: 'productor', organizerId: 'o2', color: '#db2777', active: true, createdAt: iso(Date.now() - 290 * DAY) },
    { id: 'u-prod3', name: 'Hernán Leiva', email: 'hernan@ligaaustral.cl', password: 'demo123', role: 'productor', organizerId: 'o3', color: '#ea580c', active: true, createdAt: iso(Date.now() - 240 * DAY) },
    { id: 'u-prod4', name: 'Daniela Oyarzún', email: 'daniela@forofuturo.cl', password: 'demo123', role: 'productor', organizerId: 'o4', color: '#0d9488', active: true, createdAt: iso(Date.now() - 190 * DAY) },
    { id: 'u-staff', name: 'Diego Paredes', email: 'acceso@volcan.cl', password: 'demo123', role: 'staff', color: '#16a34a', demo: true, active: true, createdAt: iso(Date.now() - 150 * DAY) },
    { id: 'u-cli', name: 'Valentina Rojas', email: 'cliente@volcan.cl', password: 'demo123', role: 'cliente', color: '#2563eb', demo: true, active: true, city: 'Santiago', createdAt: iso(Date.now() - 260 * DAY) },
    { id: 'u-cli2', name: 'Tomás Herrera', email: 'tomas@correo.cl', password: 'demo123', role: 'cliente', color: '#ca8a04', active: true, city: 'Valparaíso', createdAt: iso(Date.now() - 120 * DAY) }
  ];
  for (let i = 0; i < 70; i++) {
    const f = FIRST[i % FIRST.length], l = LAST[(i * 7 + 3) % LAST.length];
    users.push({ id: 'c' + i, name: `${f} ${l}`, email: `${f}.${l}${i}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@correo.cl', password: 'demo123', role: 'cliente', color: COLORS[i % COLORS.length], active: r.bool(.96), city: r.pick(CITIES), createdAt: r.daysAgo(360, 5) });
  }
  const clients = users.filter(u => u.role === 'cliente' && u.id !== 'u-cli');

  const events = [], tickets = [], orders = [], waitlist = [];
  let orderNo = 10230;
  const fees = { servicePct: 10, perTicket: 690, maxPerOrder: 8, holdMinutes: 10, resaleCapPct: 10, refundWindowDays: 7 };

  EVENTS.forEach(([title, category, venueId, days, organizerId, status, tierDefs, soldRatio, extra], ei) => {
    const v = V.find(x => x.id === venueId);
    const id = 'e' + (ei + 1);
    const date = at(days, extra.hour || 21, extra.hour === 9 || extra.hour === 10 ? 0 : 0);
    const tiers = tierDefs.map(([name, zone, price], ti) => ({
      id: `${id}t${ti + 1}`, name, zone, price,
      ebPrice: extra.eb ? Math.round(price * .8 / 1000) * 1000 : 0,
      ebUntil: extra.eb ? at(Math.max(-30, days - 14), 23, 59) : null,
      capacity: zone === 'ga' ? Math.round(v.gaCapacity / tierDefs.filter(t => t[1] === 'ga').length) : 0
    }));
    const ev = {
      id, title, category, venueId, city: v.city, date, organizerId, status, tiers,
      description: DESCS[category], minAge: category === 'teatro' ? 14 : category === 'conciertos' ? 18 : 0,
      lineup: extra.lineup.map(([name, time, role]) => ({ name, time, role })),
      art: ei % 6, featured: !!extra.featured, tags: [],
      createdAt: iso(Date.parse(date) - (days > 0 ? 40 + days : 70) * DAY),
      salesStart: iso(Date.parse(date) - (days > 0 ? 35 + days : 60) * DAY)
    };
    if (status === 'rechazado') ev.rejectReason = 'Falta documentación del recinto';
    events.push(ev);
    if (!soldRatio) return;

    // Asientos e inventario por tier
    const start = Date.parse(ev.salesStart), end = Math.min(Date.now() - 36e5, Date.parse(date) - 36e5);
    const pool = [];
    tiers.forEach(t => {
      if (t.zone === 'ga') { const n = Math.round(t.capacity * soldRatio * (soldRatio >= 1 ? 1 : .8 + r() * .3)); for (let k = 0; k < Math.min(n, t.capacity); k++) pool.push({ tier: t, seat: null }); }
      else {
        v.sections.filter(s => s.zone === t.zone).forEach(s => {
          for (let ri = 0; ri < s.rows; ri++) for (let n = 1; n <= s.seats; n++) {
            const pFront = soldRatio >= 1 ? 1 : Math.min(1, soldRatio * (1.35 - ri / s.rows * .7));
            if (r() < pFront) pool.push({ tier: t, seat: `${s.id}-${ROWL(ri)}-${n}` });
          }
        });
      }
    });
    // Agrupar en órdenes de 1–4 entradas (asientos contiguos ya vienen ordenados)
    let i = 0;
    while (i < pool.length) {
      const n = Math.min(pool.length - i, r.pick([1, 2, 2, 2, 3, 4]));
      const items = pool.slice(i, i + n); i += n;
      // Las compras se concentran cerca del inicio de venta y del evento
      const u = r(), shaped = u < .5 ? u * u * 2 * .5 : 1 - (1 - u) * (1 - u) * 2 * .5, when = start + (end - start) * (r.bool(.45) ? r() : shaped);
      const buyer = ei === 0 && orders.filter(o => o.buyerId === 'u-cli').length < 1 ? users.find(x => x.id === 'u-cli') : r.pick(clients);
      const oid = 'o' + orderNo;
      const promo = r.bool(.08) ? 'VOLCAN10' : '';
      const subtotal = items.reduce((s, x) => s + (x.tier.ebPrice && when < Date.parse(x.tier.ebUntil) ? x.tier.ebPrice : x.tier.price), 0);
      const discount = promo ? Math.round(subtotal * .1) : 0;
      const fee = Math.round((subtotal - discount) * fees.servicePct / 100) + fees.perTicket * n;
      const past = status === 'finalizado';
      const refunded = !past && soldRatio < 1 && r.bool(.025);
      const order = { id: oid, number: 'VLC-' + orderNo++, eventId: id, buyerId: buyer.id, tickets: [], subtotal, discount, fees: fee, total: subtotal - discount + fee, promo, status: refunded ? 'reembolsada' : 'pagada', payment: { brand: r.pick(['Visa', 'Mastercard', 'Débito', 'Visa']), last4: String(r.int(1000, 9999)) }, channel: 'web', createdAt: iso(when) };
      items.forEach(x => {
        const tid = 't' + tickets.length.toString(36);
        order.tickets.push(tid);
        tickets.push({ id: tid, code: makeCode(r), eventId: id, orderId: oid, ownerId: buyer.id, tierId: x.tier.id, seat: x.seat, price: x.tier.ebPrice && when < Date.parse(x.tier.ebUntil) ? x.tier.ebPrice : x.tier.price, status: refunded ? 'anulado' : past ? (r.bool(.88) ? 'usado' : 'valido') : 'valido', createdAt: iso(when) });
        const tk = tickets[tickets.length - 1]; if (tk.status === 'usado') tk.scannedAt = iso(Date.parse(date) - r.int(0, 90) * 6e4);
      });
      orders.push(order);
    }
  });

  // La cliente demo tiene entradas en varios eventos (incluida una pasada y una en reventa)
  const demo = users.find(u => u.id === 'u-cli');
  ['e3', 'e7', 'e11', 'e14', 'e20'].forEach((eid, k) => {
    const o = orders.find(x => x.eventId === eid && x.status === 'pagada' && x.buyerId !== 'u-cli' && x.tickets.length >= 2);
    if (!o) return;
    o.buyerId = demo.id;
    o.tickets.forEach(tid => { const t = tickets.find(x => x.id === tid); t.ownerId = demo.id; });
    if (k === 2) { const t = tickets.find(x => x.id === o.tickets[1]); t.status = 'reventa'; t.resalePrice = Math.round(t.price * 1.05 / 500) * 500; t.resaleAt = iso(Date.now() - 2 * DAY); }
  });
  // Lista de espera de los eventos agotados
  ['e3', 'e5'].forEach(eid => { for (let k = 0; k < 6; k++) { const u = r.pick(clients); waitlist.push({ eventId: eid, userId: u.id, name: u.name, email: u.email, qty: r.int(1, 4), status: 'esperando', createdAt: r.daysAgo(8, 0) }); } });

  const promos = [
    { code: 'VOLCAN10', type: 'pct', value: 10, eventId: '', organizerId: '', maxUses: 500, uses: orders.filter(o => o.promo === 'VOLCAN10').length, validUntil: at(60, 23, 59), active: true, createdAt: iso(Date.now() - 90 * DAY) },
    { code: 'CONDORES5K', type: 'fixed', value: 5000, eventId: 'e1', organizerId: 'o1', maxUses: 200, uses: 37, validUntil: at(15, 23, 59), active: true, createdAt: iso(Date.now() - 20 * DAY) },
    { code: 'TECHANDES20', type: 'pct', value: 20, eventId: 'e14', organizerId: 'o4', maxUses: 80, uses: 52, validUntil: at(20, 23, 59), active: true, createdAt: iso(Date.now() - 30 * DAY) },
    { code: 'TEATRO2X1', type: 'pct', value: 50, eventId: 'e7', organizerId: 'o2', maxUses: 40, uses: 40, validUntil: at(5, 23, 59), active: false, createdAt: iso(Date.now() - 45 * DAY) },
    { code: 'ESTUDIANTE', type: 'pct', value: 15, eventId: '', organizerId: '', maxUses: 1000, uses: 214, validUntil: at(-3, 23, 59), active: true, createdAt: iso(Date.now() - 200 * DAY) }
  ];

  // Liquidaciones a productoras: pagadas para eventos pasados, pendientes para los próximos
  const payouts = [];
  events.filter(e => e.status === 'finalizado').forEach((e, k) => {
    const gross = orders.filter(o => o.eventId === e.id && o.status === 'pagada').reduce((s, o) => s + o.subtotal - o.discount, 0);
    const org = organizers.find(o => o.id === e.organizerId);
    payouts.push({ id: 'p' + k, organizerId: e.organizerId, eventId: e.id, gross, commission: Math.round(gross * org.commissionPct / 100), amount: Math.round(gross * (1 - org.commissionPct / 100)), status: 'pagado', paidAt: iso(Date.parse(e.date) + 5 * DAY), createdAt: iso(Date.parse(e.date) + 2 * DAY) });
  });
  payouts.push({ id: 'pa', organizerId: 'o1', eventId: 'e5', gross: 1850000, commission: 129500, amount: 1720500, status: 'solicitado', paidAt: null, createdAt: iso(Date.now() - 1 * DAY), advance: true });

  const notifications = [
    { userId: 'u-cli', text: 'Tu entrada para "La casa de los vientos" está lista en Mis entradas.', read: false, createdAt: iso(Date.now() - 3 * DAY) },
    { userId: 'u-cli', text: '¡Quedan pocas entradas para la Final Liga Austral!', read: false, createdAt: iso(Date.now() - 1 * DAY) },
    { userId: 'u-admin', text: '2 eventos esperan aprobación.', read: false, createdAt: iso(Date.now() - 5 * 36e5) },
    { userId: 'u-admin', text: 'Nueva productora registrada: Ritmo Patagón.', read: false, createdAt: iso(Date.now() - 6 * DAY) }
  ];

  // Bitácora inicial para que el panel tenga historia.
  const _log = [];
  orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 18).forEach(o => {
    const u = users.find(x => x.id === o.buyerId), e = events.find(x => x.id === o.eventId);
    _log.push({ at: o.createdAt, action: 'compra', detail: `${u.name} compró ${o.tickets.length} entrada(s) para ${e.title}`, user: u.id });
  });
  _log.push({ at: iso(Date.now() - 5 * 36e5), action: 'evento creado', detail: 'Jazz en el Lago · Edición invierno (pendiente)', user: 'u-prod' });
  _log.push({ at: iso(Date.now() - 26 * 36e5), action: 'tarifas', detail: 'Cargo 10% + $690 · reserva 10 min', user: 'u-admin' });
  _log.push({ at: iso(Date.now() - 2 * DAY), action: 'estado evento', detail: 'Encuentro Emprende Sur: pendiente → publicado', user: 'u-admin' });
  _log.push({ at: iso(Date.now() - 3 * DAY), action: 'reembolso', detail: 'Pedido reembolsado por cobro duplicado', user: 'u-soporte' });
  _log.push({ at: iso(Date.now() - 6 * DAY), action: 'register', detail: 'Nueva productora: Ritmo Patagón', user: null });
  _log.sort((a, b) => b.at.localeCompare(a.at));

  return {
    _log,
    venues: V, organizers, users, events, tickets, orders, promos, payouts, waitlist, notifications, holds: [],
    settings: {
      fees,
      heroTitle: 'Vive lo que te hace vibrar',
      heroSubtitle: 'Conciertos, teatro, deportes y conferencias en todo Chile. Elige tu asiento, paga seguro y lleva tu entrada en el celular.',
      heroCta: 'Explorar eventos',
      banner: '🔥 Preventa Festival Volcán Sonoro: 20% de descuento hasta agotar stock',
      bannerOn: true,
      supportEmail: 'ayuda@tiqueteravolcan.cl'
    }
  };
}
