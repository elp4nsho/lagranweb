// Datos semilla de Fundación Raíces del Sur (ficticia), reproducibles con rng().
import { rng } from '../../../assets/core/db.js';

export const SITE_SEED = () => ({
  name: 'Fundación Raíces del Sur',
  heroEyebrow: 'Desde 2011 junto a comunidades rurales de Chile',
  heroTitle: 'Agua, bosque y educación para el Chile rural',
  heroText: 'Trabajamos codo a codo con comunidades del sur y norte de Chile para que cada familia tenga agua segura, un territorio vivo y oportunidades para sus hijos.',
  mission: 'Acompañamos a comunidades rurales a resolver sus necesidades más urgentes con soluciones sostenibles, transparentes y construidas en conjunto.',
  impact: [
    { icon: '💧', value: '1.240', label: 'familias con agua segura' },
    { icon: '🌳', value: '86.000', label: 'árboles nativos plantados' },
    { icon: '📚', value: '3.900', label: 'niñas y niños apoyados' },
    { icon: '🤝', value: '42', label: 'comunidades acompañadas' }
  ],
  presetsOnce: [5000, 10000, 25000, 50000],
  presetsMonthly: [3000, 5000, 10000, 20000],
  monthlyPitch: 'Con una donación mensual nos permites planificar proyectos de largo plazo. Puedes pausarla o cancelarla cuando quieras desde tu cuenta.',
  contactEmail: 'hola@raicesdelsur.cl',
  phone: '+56 2 2899 4410',
  address: 'Av. Los Leones 1234, Providencia, Santiago',
  certificateNote: 'Documento de demostración sin validez tributaria. Fundación ficticia.',
  overheadGoal: 20
});

export const CATEGORIES = ['Agua', 'Bosque nativo', 'Educación', 'Alimentación', 'Emergencia', 'Emprendimiento'];

const FIRST = ['Ana', 'Luis', 'Carmen', 'Jorge', 'Patricia', 'Claudio', 'Verónica', 'Andrés', 'Javiera', 'Rodrigo', 'Loreto', 'Felipe', 'Macarena', 'Cristián', 'Daniela', 'Mauricio', 'Paula', 'Gonzalo', 'Valentina', 'Héctor', 'Camila', 'Ricardo', 'Fernanda', 'Pablo', 'Isabel', 'Tomás', 'Carolina', 'Esteban', 'Marta', 'Ignacio', 'Rocío', 'Sergio', 'Bárbara', 'Matías', 'Gabriela', 'Nicolás'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Huenchullán', 'Catrileo', 'Painemal', 'Quilodrán'];
const REGIONS = ['Metropolitana', 'Valparaíso', 'Biobío', 'La Araucanía', 'Los Lagos', 'Los Ríos', 'Coquimbo', 'Antofagasta', 'Maule', 'Ñuble'];
const COMPANIES = ['Constructora Andes Sur', 'Café Altiplano', 'Banco Austral (ficticio)', 'Viña Cerro Azul', 'Transportes Ruta 5', 'Librería Puerto Letras'];
const MSGS = ['¡Fuerza a las familias!', 'Con cariño desde Santiago', 'Por un sur con agua', 'En memoria de mi abuela', 'Gracias por su trabajo', 'Que crezcan muchos árboles', '', '', '', '', ''];

const iso = d => new Date(d).toISOString();
const plain = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

export function seed() {
  const r = rng(1911);
  const now = Date.now(), day = 864e5;
  const ago = (d, h = r.int(8, 21)) => { const x = new Date(now - d * day); x.setHours(h, r.int(0, 59), 0, 0); return x.getTime() > now ? now - r.int(5, 200) * 6e4 : x.getTime(); };
  const dkey = t => new Date(t).toISOString().slice(0, 10);

  const projects = [
    { id: 'p1', name: 'Sistemas de agua rural Lonquimay', community: 'Comunidad Pehuenche Lolén', region: 'La Araucanía', type: 'Agua', beneficiaries: 320, families: 86, status: 'En ejecución', budget: 52_000_000, lead: 'Pedro Huenchullán', startDate: dkey(ago(400)), summary: 'Captación de vertientes, estanques y redes de distribución para 86 familias.' },
    { id: 'p2', name: 'Restauración Cordillera de Nahuelbuta', community: 'Contulmo y Cañete', region: 'Biobío', type: 'Bosque nativo', beneficiaries: 1200, families: 0, status: 'En ejecución', budget: 38_000_000, lead: 'Pedro Huenchullán', startDate: dkey(ago(330)), summary: 'Vivero comunitario y plantación de 40.000 árboles nativos con escuelas locales.' },
    { id: 'p3', name: 'Escuelas rurales de Chiloé', community: '12 escuelas de Quemchi y Dalcahue', region: 'Los Lagos', type: 'Educación', beneficiaries: 640, families: 0, status: 'En ejecución', budget: 18_000_000, lead: 'Marcela Quilodrán', startDate: dkey(ago(250)), summary: 'Útiles, conectividad y tutorías para estudiantes de escuelas unidocentes.' },
    { id: 'p4', name: 'Huertos y riego en Petorca', community: 'Chincolco y Pedegua', region: 'Valparaíso', type: 'Alimentación', beneficiaries: 210, families: 64, status: 'En ejecución', budget: 21_000_000, lead: 'Pedro Huenchullán', startDate: dkey(ago(200)), summary: 'Huertos familiares con riego por goteo y cosecha de aguas lluvia.' },
    { id: 'p5', name: 'Respuesta a incendios Ñuble', community: 'Quillón y Florida', region: 'Ñuble', type: 'Emergencia', beneficiaries: 480, families: 140, status: 'En ejecución', budget: 60_000_000, lead: 'Marcela Quilodrán', startDate: dkey(ago(90)), summary: 'Kits de emergencia, viviendas de transición y reforestación post incendio.' },
    { id: 'p6', name: 'Biblioteca rodante Atacama', community: 'Valle del Huasco', region: 'Atacama', type: 'Educación', beneficiaries: 900, families: 0, status: 'Finalizado', budget: 7_200_000, lead: 'Marcela Quilodrán', startDate: dkey(ago(420)), summary: 'Camioneta biblioteca que recorre 14 localidades del valle cada mes.' },
    { id: 'p7', name: 'Mujeres mapuche emprendedoras', community: 'Tirúa', region: 'Biobío', type: 'Emprendimiento', beneficiaries: 75, families: 75, status: 'Planificación', budget: 12_000_000, lead: 'Pedro Huenchullán', startDate: dkey(ago(30)), summary: 'Capital semilla y formación para tejedoras y huerteras.' }
  ];

  const campaigns = [
    { id: 'c1', slug: 'agua-lonquimay', title: 'Agua para Lonquimay', category: 'Agua', region: 'La Araucanía', projectId: 'p1', goal: 18_000_000, target: .78, start: 120, end: -45, status: 'publicada', featured: true, hue: 0,
      summary: '86 familias pehuenche aún acarrean agua en bidones. Ayúdanos a terminar la red de agua potable rural.',
      story: 'En invierno la nieve corta los caminos y en verano las vertientes se secan. Con tu aporte construiremos tres estanques de acumulación y 6 km de red de distribución, diseñados junto a la comunidad Lolén.\n\nCada familia recibirá una conexión domiciliaria y capacitación para mantener el sistema. La comunidad forma su propio comité de agua para administrarlo.' },
    { id: 'c2', slug: 'bosque-nahuelbuta', title: 'Bosque nativo para Nahuelbuta', category: 'Bosque nativo', region: 'Biobío', projectId: 'p2', goal: 25_000_000, target: .52, start: 150, end: -90, status: 'publicada', featured: true, hue: 2,
      summary: 'Cada $2.500 plantamos un roble, coigüe o araucaria en la cordillera más antigua de Chile.',
      story: 'Nahuelbuta perdió más del 60% de su bosque nativo. Junto a escuelas y viveristas locales producimos plantas de semillas del mismo territorio y las plantamos con cuidado y seguimiento por 3 años.' },
    { id: 'c3', slug: 'utiles-chiloe', title: 'Útiles y conectividad para Chiloé', category: 'Educación', region: 'Los Lagos', projectId: 'p3', goal: 6_500_000, target: .91, start: 60, end: -12, status: 'publicada', featured: true, hue: 1,
      summary: '640 estudiantes de escuelas rurales necesitan útiles, tablets y conexión para el segundo semestre.',
      story: 'Las escuelas unidocentes de Quemchi y Dalcahue funcionan con lo mínimo. Entregaremos kits escolares, 40 tablets y antenas satelitales para 12 escuelas.' },
    { id: 'c4', slug: 'huertos-petorca', title: 'Huertos que resisten la sequía', category: 'Alimentación', region: 'Valparaíso', projectId: 'p4', goal: 9_000_000, target: .37, start: 45, end: -75, status: 'publicada', featured: false, hue: 3,
      summary: 'Riego por goteo y cosecha de lluvia para que 64 familias de Petorca cultiven sus alimentos.',
      story: 'En Petorca el agua es escasa. Con sistemas de riego eficientes y estanques de aguas lluvia, cada familia puede producir verduras todo el año.' },
    { id: 'c5', slug: 'emergencia-nuble', title: 'Emergencia incendios Ñuble', category: 'Emergencia', region: 'Ñuble', projectId: 'p5', goal: 40_000_000, target: .66, start: 80, end: -20, status: 'publicada', featured: true, hue: 4, urgent: true,
      summary: '140 familias perdieron su casa. Necesitamos viviendas de transición antes del invierno.',
      story: 'Los incendios de este verano arrasaron Quillón y Florida. Ya entregamos 300 kits de emergencia; ahora construimos viviendas de transición y comenzaremos la reforestación.' },
    { id: 'c6', slug: 'biblioteca-atacama', title: 'Biblioteca rodante Atacama', category: 'Educación', region: 'Atacama', projectId: 'p6', goal: 7_200_000, target: 1.06, start: 330, end: 200, status: 'finalizada', featured: false, hue: 5,
      summary: '¡Lo logramos! La biblioteca ya recorre 14 localidades del Valle del Huasco.',
      story: 'Gracias a 312 donantes compramos y equipamos una camioneta con 2.000 libros. Hoy recorre el valle cada mes.' },
    { id: 'c7', slug: 'tejedoras-tirua', title: 'Semillas para tejedoras de Tirúa', category: 'Emprendimiento', region: 'Biobío', projectId: 'p7', goal: 12_000_000, target: .14, start: 20, end: -100, status: 'publicada', featured: false, hue: 1,
      summary: 'Capital semilla y formación para 75 mujeres mapuche emprendedoras.',
      story: 'Las tejedoras de Tirúa mantienen vivo el arte del telar mapuche. Con capital semilla y una tienda en línea podrán vender a todo Chile.' },
    { id: 'c8', slug: 'invierno-aysen', title: 'Invierno sin frío en Aysén', category: 'Emergencia', region: 'Aysén', projectId: '', goal: 15_000_000, target: 0, start: -10, end: -120, status: 'borrador', featured: false, hue: 2,
      summary: 'Leña seca, aislación y estufas eficientes para adultos mayores de Aysén.',
      story: 'Borrador en preparación.' }
  ].map(c => ({ ...c, startDate: dkey(now - c.start * day), endDate: dkey(now - c.end * day), cover: c.hue, updates: [] }));

  // ---------- Donantes ----------
  const donors = [];
  const used = new Set();
  for (let i = 0; i < 130; i++) {
    let f, l, email;
    do { f = r.pick(FIRST); l = r.pick(LAST); email = `${plain(f)}.${plain(l)}@correo.cl`; } while (used.has(email));
    used.add(email);
    donors.push({ id: 'd' + i, name: `${f} ${l}`, email, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, region: r.pick(REGIONS), type: 'persona', tags: [], notes: [], createdAt: iso(ago(r.int(30, 400))) });
  }
  COMPANIES.forEach((c, i) => donors.push({ id: 'dc' + i, name: c, email: `rse@${plain(c).slice(0, 14)}.cl`, phone: '+56 2 2' + r.int(100, 999) + ' ' + r.int(1000, 9999), region: 'Metropolitana', type: 'empresa', tags: ['Empresa'], notes: [], createdAt: iso(ago(r.int(60, 380))) }));
  // Donante demo
  donors[0] = { ...donors[0], id: 'd-ana', name: 'Ana María Leiva', email: 'donante@raices.cl', region: 'Metropolitana', tags: ['Embajadora'], notes: [{ text: 'Asistió al aniversario 2025. Interesada en visitar Lonquimay.', by: 'Pedro Huenchullán', at: iso(ago(60)) }], createdAt: iso(ago(380)) };
  donors[1] = { ...donors[1], id: 'd-diego', name: 'Diego Vergara', email: 'voluntario@raices.cl', region: 'Metropolitana', createdAt: iso(ago(200)) };

  const donations = [];
  let rec = 1;
  const receipt = t => `RS-${new Date(t).getFullYear()}-${String(rec++).padStart(5, '0')}`;
  const method = () => r.pick(['tarjeta', 'tarjeta', 'tarjeta', 'PagoSur', 'transferencia']);
  const pushDon = (d) => donations.push({ status: 'aprobada', message: '', anonymous: false, ...d });

  // ---------- Suscripciones mensuales ----------
  const subs = [];
  const subDonors = donors.filter(d => d.type === 'persona').slice(0, 58);
  subDonors.forEach((d, i) => {
    const startD = d.id === 'd-ana' ? 330 : r.int(20, 360);
    const amount = d.id === 'd-ana' ? 10000 : r.pick([3000, 5000, 5000, 10000, 10000, 15000, 20000]);
    const status = d.id === 'd-ana' ? 'activa' : i % 9 === 4 ? 'cancelada' : i % 11 === 6 ? 'pausada' : 'activa';
    const campaignId = d.id === 'd-ana' ? '' : r.bool(.7) ? '' : r.pick(['c1', 'c2', 'c5']);
    const chargeDay = r.int(1, 28);
    const stopD = status === 'cancelada' ? r.int(5, Math.max(6, startD - 20)) : status === 'pausada' ? r.int(5, 40) : 0;
    const s = { id: 's' + i, donorId: d.id, amount, campaignId, chargeDay, status, card: String(r.int(1000, 9999)), startedAt: iso(ago(startD)), endedAt: stopD ? iso(ago(stopD)) : '', failed: 0 };
    subs.push(s);
    for (let m = startD; m >= stopD; m -= 30) {
      const t = ago(m);
      const failed = r.bool(.04);
      pushDon({ id: `dn-s${i}-${m}`, donorId: d.id, donorName: d.name, email: d.email, amount, campaignId, type: 'mensual', subscriptionId: s.id, method: 'tarjeta', status: failed ? 'rechazada' : 'aprobada', receiptNo: failed ? '' : receipt(t), createdAt: iso(t) });
      if (failed) s.failed++;
    }
    if (status === 'activa') { const n = new Date(); n.setDate(chargeDay); if (n.getTime() < now) n.setMonth(n.getMonth() + 1); s.nextCharge = i % 9 === 2 ? dkey(now) : dkey(n); } else s.nextCharge = '';
  });

  // ---------- Donaciones únicas por campaña hasta su meta ----------
  campaigns.forEach(c => {
    const target = c.goal * c.target;
    let sum = donations.filter(d => d.campaignId === c.id && d.status === 'aprobada').reduce((s, d) => s + d.amount, 0);
    const span = Math.max(1, c.start - Math.max(0, c.end));
    let guard = 0;
    while (sum < target && guard++ < 400) {
      const corporate = r.bool(.05);
      const d = corporate ? r.pick(donors.filter(x => x.type === 'empresa')) : r.pick(donors.filter(x => x.type === 'persona'));
      const amount = corporate ? r.pick([500_000, 1_000_000, 1_500_000, 2_000_000]) : r.pick([5000, 10000, 10000, 15000, 20000, 25000, 30000, 50000, 50000, 100000, 200000]);
      // más donaciones al inicio y cerca del final de la campaña
      const pos = r() < .5 ? r() * r() : 1 - r() * r();
      const t = ago(Math.max(0, c.end) + Math.round(span * (1 - pos)));
      pushDon({ id: 'dn' + donations.length, donorId: d.id, donorName: d.name, email: d.email, amount, campaignId: c.id, type: 'unica', subscriptionId: '', method: corporate ? 'transferencia' : method(), anonymous: r.bool(.15), message: corporate ? 'Aporte de responsabilidad social' : r.pick(MSGS), receiptNo: receipt(t), createdAt: iso(t) });
      sum += amount;
    }
  });
  // Donaciones al fondo general.
  for (let i = 0; i < 260; i++) {
    const d = r.pick(donors.filter(x => x.type === 'persona'));
    const t = ago(r.int(0, 360));
    pushDon({ id: 'dg' + i, donorId: d.id, donorName: d.name, email: d.email, amount: r.pick([5000, 10000, 20000, 30000, 50000, 100000, 150000]), campaignId: '', type: 'unica', subscriptionId: '', method: method(), message: r.pick(MSGS), receiptNo: receipt(t), createdAt: iso(t) });
  }
  // Algunas rechazadas/reembolsadas.
  for (let i = 0; i < 8; i++) { const d = r.pick(donors); const t = ago(r.int(0, 200)); pushDon({ id: 'dx' + i, donorId: d.id, donorName: d.name, email: d.email, amount: r.pick([10000, 20000]), campaignId: r.pick(['c1', 'c2', '']), type: 'unica', subscriptionId: '', method: 'tarjeta', status: i < 6 ? 'rechazada' : 'reembolsada', receiptNo: '', createdAt: iso(t) }); }
  donations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // renumera recibos en orden cronológico
  rec = 1;
  [...donations].reverse().forEach(d => { if (d.receiptNo) d.receiptNo = receipt(d.createdAt); });

  // Segmentos y última donación del CRM.
  donors.forEach(d => {
    const mine = donations.filter(x => x.donorId === d.id && x.status === 'aprobada');
    if (mine.length && !d.tags.includes('Empresa') && mine.reduce((s, x) => s + x.amount, 0) > 400000) d.tags.push('Donante mayor');
  });

  // ---------- Actualizaciones de campañas ----------
  const UPD = {
    c1: [[100, 'Comenzó la obra', 'Llegaron los materiales para el primer estanque de 30.000 litros.'], [55, 'Primer estanque listo', 'La comunidad terminó el primer estanque en una minga de 3 días.'], [12, '¡Agua en 30 casas!', 'Las primeras 30 familias ya tienen agua en su llave. Faltan 56.']],
    c2: [[120, 'Vivero en marcha', 'Germinaron 12.000 semillas de roble y coigüe.'], [40, 'Plantación con escuelas', '180 estudiantes plantaron 3.000 árboles en Contulmo.']],
    c3: [[45, 'Kits en camino', 'Compramos 640 kits escolares a proveedores locales.'], [8, 'Antenas instaladas', '8 de 12 escuelas ya tienen conexión satelital.']],
    c4: [[30, 'Primeros huertos', '15 familias instalaron riego por goteo.']],
    c5: [[75, '300 kits entregados', 'Entregamos kits de emergencia en Quillón y Florida.'], [35, 'Viviendas de transición', 'Iniciamos la construcción de las primeras 20 viviendas.'], [5, 'Se necesita más ayuda', 'Faltan 60 viviendas antes de junio. ¡Comparte la campaña!']],
    c6: [[260, 'Camioneta comprada', 'Ya tenemos el vehículo y los primeros 1.200 libros.'], [205, '¡Meta cumplida!', 'La biblioteca hizo su primer recorrido por el valle.']],
    c7: [[10, 'Lanzamos la campaña', 'Conoce a las 75 tejedoras que participarán.']]
  };
  campaigns.forEach(c => { c.updates = (UPD[c.id] || []).map(([d, title, text], i) => ({ id: c.id + 'u' + i, date: iso(ago(d)), title, text })); });

  // ---------- Voluntariado ----------
  const SKILLS = ['Construcción', 'Educación', 'Salud', 'Logística', 'Comunicaciones', 'Plantación', 'Cocina', 'Fotografía'];
  const volunteers = [];
  for (let i = 0; i < 44; i++) {
    const f = r.pick(FIRST), l = r.pick(LAST);
    volunteers.push({ id: 'v' + i, name: `${f} ${l}`, email: `${plain(f)}${i}@voluntarios.cl`, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, region: r.pick(REGIONS.slice(0, 5)), skills: [r.pick(SKILLS), r.pick(SKILLS)].filter((x, j, a) => a.indexOf(x) === j), availability: r.pick(['Fines de semana', 'Fines de semana', 'Semana', 'Vacaciones']), status: i < 5 ? 'postulante' : i % 13 === 7 ? 'inactivo' : 'activo', hours: i < 5 ? 0 : r.int(4, 160), createdAt: iso(ago(i < 5 ? r.int(0, 10) : r.int(30, 500))) });
  }
  volunteers[5] = { ...volunteers[5], id: 'v-diego', name: 'Diego Vergara', email: 'voluntario@raices.cl', skills: ['Construcción', 'Logística'], status: 'activo', hours: 46 };
  const ACT = [
    ['Minga de construcción de estanque', 'Construcción', 'Lonquimay, La Araucanía', 'p1'], ['Plantación de nativos', 'Plantación', 'Contulmo, Biobío', 'p2'], ['Tutorías de lectura online', 'Educación', 'En línea', 'p3'],
    ['Instalación de riego por goteo', 'Construcción', 'Chincolco, Valparaíso', 'p4'], ['Armado de kits de emergencia', 'Logística', 'Bodega Santiago', 'p5'], ['Construcción vivienda de transición', 'Construcción', 'Quillón, Ñuble', 'p5'],
    ['Jornada de vivero', 'Plantación', 'Vivero Cañete, Biobío', 'p2'], ['Feria solidaria', 'Comunicaciones', 'Plaza Ñuñoa, Santiago', ''], ['Cocina comunitaria', 'Cocina', 'Florida, Ñuble', 'p5']
  ];
  const activities = [];
  for (let i = 0; i < 22; i++) {
    const [title, type, place, projectId] = ACT[i % ACT.length];
    const offset = -40 + i * 4 + r.int(0, 2); // días desde hoy
    const date = new Date(now + offset * day);
    if ([0, 6].includes(date.getDay()) === false && type !== 'Educación') date.setDate(date.getDate() + (6 - date.getDay()));
    const slots = r.pick([8, 10, 12, 15, 20]);
    const pool = volunteers.filter(v => v.status === 'activo');
    const enrolled = [];
    const n = offset < 0 ? r.int(Math.round(slots * .6), slots) : r.int(1, slots - 1);
    for (let k = 0; k < n; k++) { const v = r.pick(pool); if (!enrolled.includes(v.id)) enrolled.push(v.id); }
    if ((i === 11 || i === 13 || i === 6) && !enrolled.includes('v-diego')) enrolled.push('v-diego');
    activities.push({ id: 'a' + i, title, type, place, projectId, date: dkey(date), start: r.pick(['09:00', '09:30', '10:00', '15:00']), hours: r.pick([3, 4, 6, 8]), slots, enrolled, coordinator: 'Pedro Huenchullán', description: `${title} junto a la comunidad. Incluye traslado desde Santiago cuando corresponde, almuerzo y seguro.`, status: offset < 0 ? 'realizada' : 'abierta', createdAt: iso(ago(Math.max(0, -offset + 20))) });
  }

  // ---------- Gastos (alimentan transparencia) ----------
  const expenses = [];
  const PROV = { Agua: ['Ferretería Sur', 'Hidro Austral', 'Plásticos del Pacífico'], 'Bosque nativo': ['Vivero Nahuel', 'Herramientas Bío Bío'], Educación: ['Librería Puerto Letras', 'TecnoAula', 'SatNet Rural'], Alimentación: ['Riegos del Valle', 'Semillas Andinas'], Emergencia: ['Maderas Ñuble', 'Kit Ayuda SpA', 'Transportes Ruta 5'], Emprendimiento: ['Lanas del Sur'] };
  for (let m = 11; m >= 0; m--) {
    const base = new Date(now); base.setDate(1); base.setMonth(base.getMonth() - m);
    const at = d => { const x = new Date(base); x.setDate(d); return x.getTime() > now ? now - day : x.getTime(); };
    projects.filter(p => p.status !== 'Planificación' || m < 1).forEach(p => {
      const n = p.status === 'Finalizado' ? (m > 7 ? 1 : 0) : r.int(1, 2);
      for (let k = 0; k < n; k++) { const t = at(r.int(2, 26)); expenses.push({ id: `x${expenses.length}`, date: dkey(t), category: 'Programas', projectId: p.id, description: r.pick(['Materiales', 'Traslado de equipo', 'Mano de obra local', 'Insumos', 'Capacitación comunitaria']) + ' · ' + p.name.split(' ').slice(0, 3).join(' '), provider: r.pick(PROV[p.type]), amount: Math.round(r.int(400, 2600) * 1000 * (p.type === 'Emergencia' ? 1.6 : 1)), status: m === 0 && k === 1 ? 'pendiente' : 'aprobado', published: !(m === 0 && k === 1), createdAt: iso(t) }); }
    });
    [['Operación', 'Arriendo oficina', 'Inmobiliaria Los Leones', 650_000], ['Operación', 'Remuneraciones equipo central', 'Planilla', 1_300_000], ['Operación', 'Contabilidad y auditoría', 'Auditores Sur', 200_000], ['Recaudación', 'Plataforma de pagos y comisiones', 'PagoSur', 0], ['Recaudación', 'Campañas digitales', 'Agencia Brote', 450_000]].forEach(([cat, desc, prov, amt]) => {
      const t = at(r.int(1, 10));
      const amount = amt || Math.round(donations.filter(d => d.status === 'aprobada' && d.createdAt.slice(0, 7) === dkey(base).slice(0, 7)).reduce((s, d) => s + d.amount, 0) * .029);
      expenses.push({ id: `x${expenses.length}`, date: dkey(t), category: cat, projectId: '', description: desc, provider: prov, amount: Math.round(amount * (0.9 + r() * .2)), status: 'aprobado', published: true, createdAt: iso(t) });
    });
  }

  // ---------- Noticias y newsletters ----------
  const news = [
    ['¡Agua en las primeras 30 casas de Lonquimay!', 'Agua', 12, 'La comunidad Lolén celebró la llegada del agua potable con una ceremonia tradicional.'],
    ['Viviendas de transición para Ñuble', 'Emergencia', 20, 'Ya construimos 20 viviendas para familias que lo perdieron todo en los incendios.'],
    ['180 estudiantes plantaron 3.000 árboles', 'Bosque nativo', 40, 'Una jornada histórica en Contulmo junto a cinco escuelas rurales.'],
    ['Publicamos nuestra memoria anual', 'Transparencia', 75, 'Conoce en detalle cómo usamos cada peso donado durante el último año.'],
    ['Conectividad para escuelas de Chiloé', 'Educación', 8, '8 escuelas unidocentes ya tienen internet satelital.'],
    ['Nueva campaña: tejedoras de Tirúa', 'Emprendimiento', 10, 'Lanzamos una campaña para apoyar a 75 mujeres mapuche emprendedoras.'],
    ['Buscamos voluntarios para el invierno', 'Voluntariado', 3, 'Se vienen mingas de construcción en Ñuble y La Araucanía. ¡Súmate!'],
    ['Borrador: balance del tercer trimestre', 'Transparencia', 0, 'Resumen de ingresos y gastos del trimestre.']
  ].map(([title, category, d, excerpt], i) => ({ id: 'n' + i, title, category, excerpt, body: `${excerpt}\n\nEste logro fue posible gracias a las donaciones de cientos de personas y empresas, y al trabajo de nuestros voluntarios. Seguiremos informando los avances en nuestras redes y en esta sección.\n\nSi quieres sumarte, puedes donar, inscribirte como voluntario o compartir esta noticia con tu familia y amigos.`, status: i === 7 ? 'borrador' : 'publicada', author: i % 2 ? 'Marcela Quilodrán' : 'Pedro Huenchullán', publishedAt: iso(ago(d)), createdAt: iso(ago(d + 1)) }));

  const newsletters = [
    { id: 'nl1', subject: 'Así va el agua en Lonquimay 💧', segment: 'todos', body: 'Hola {nombre}, gracias a ti 30 familias ya tienen agua...', status: 'enviado', sentAt: iso(ago(11)), recipients: 128, opens: 74, clicks: 21 },
    { id: 'nl2', subject: 'Emergencia en Ñuble: necesitamos tu ayuda', segment: 'todos', body: 'Hola {nombre}, 140 familias perdieron su hogar...', status: 'enviado', sentAt: iso(ago(34)), recipients: 120, opens: 81, clicks: 33 },
    { id: 'nl3', subject: 'Tu impacto del trimestre', segment: 'recurrentes', body: 'Hola {nombre}, como donante mensual hiciste posible...', status: 'enviado', sentAt: iso(ago(62)), recipients: 52, opens: 39, clicks: 12 },
    { id: 'nl4', subject: 'Invitación: minga de invierno', segment: 'voluntarios', body: 'Hola {nombre}, te invitamos a la minga...', status: 'programado', sentAt: iso(now + 3 * day), recipients: 39, opens: 0, clicks: 0 },
    { id: 'nl5', subject: 'Borrador: memoria anual', segment: 'todos', body: 'Hola {nombre}, ...', status: 'borrador', sentAt: '', recipients: 0, opens: 0, clicks: 0 }
  ];

  const users = [
    { id: 'u-admin', name: 'Marcela Quilodrán', email: 'admin@raices.cl', password: 'admin123', role: 'admin', color: '#2f5d3a', demo: true, active: true, createdAt: iso(ago(900)) },
    { id: 'u-coord', name: 'Pedro Huenchullán', email: 'coordinador@raices.cl', password: 'coord123', role: 'coordinador', color: '#c9803b', demo: true, active: true, createdAt: iso(ago(700)) },
    { id: 'u-cont', name: 'Sofía Riquelme', email: 'contador@raices.cl', password: 'conta123', role: 'contador', color: '#3f6e7a', demo: true, active: true, createdAt: iso(ago(500)) },
    { id: 'u-vol', name: 'Diego Vergara', email: 'voluntario@raices.cl', password: 'volun123', role: 'voluntario', color: '#7a4f9a', demo: true, active: true, volunteerId: 'v-diego', donorId: 'd-diego', createdAt: iso(ago(200)) },
    { id: 'u-don', name: 'Ana María Leiva', email: 'donante@raices.cl', password: 'dona123', role: 'donante', color: '#a8432f', demo: true, active: true, donorId: 'd-ana', createdAt: iso(ago(380)) },
    { id: 'u-old', name: 'Rafael Toro', email: 'rafael@raices.cl', password: 'raices123', role: 'coordinador', color: '#5f6b58', demo: false, active: false, createdAt: iso(ago(800)) }
  ];

  const _log = [
    { id: 'l1', at: iso(ago(0, 9)), action: 'Donación recibida', detail: 'Aporte a Emergencia incendios Ñuble', user: null },
    { id: 'l2', at: iso(ago(1, 16)), action: 'Campaña actualizada', detail: 'Agua para Lonquimay: nueva actualización', user: 'u-coord' },
    { id: 'l3', at: iso(ago(2, 11)), action: 'Gasto registrado', detail: 'Materiales · Sistemas de agua rural', user: 'u-cont' },
    { id: 'l4', at: iso(ago(3, 10)), action: 'Newsletter enviado', detail: 'Así va el agua en Lonquimay', user: 'u-coord' },
    { id: 'l5', at: iso(ago(5, 12)), action: 'Voluntario aprobado', detail: 'Nueva voluntaria para mingas', user: 'u-coord' }
  ];

  return { users, campaigns, donations, donors, subscriptions: subs, volunteers, activities, projects, expenses, news, newsletters, site: SITE_SEED(), _log };
}
