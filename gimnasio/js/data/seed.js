// Datos semilla reproducibles de Titán Fit.
import { rng } from '../../../assets/core/db.js';
import { ymd, addDays, dow, fromMin, toMin, nowHM } from '../shared/dates.js';
import { makeRut } from '../shared/rut.js';
import { EXERCISES, GOALS, PAY_METHODS } from './catalog.js';

const COLORS = ['#7a5cff', '#00a6a6', '#e11d48', '#f59e0b', '#2563eb', '#16a34a', '#db2777', '#0891b2', '#9333ea', '#ea580c'];
const FN_F = ['Camila', 'Valentina', 'Martina', 'Isidora', 'Catalina', 'Francisca', 'Josefa', 'Antonia', 'Fernanda', 'Constanza', 'Daniela', 'Javiera', 'Paula', 'Macarena', 'Rocío', 'Trinidad', 'Florencia', 'Emilia'];
const FN_M = ['Benjamín', 'Vicente', 'Martín', 'Matías', 'Joaquín', 'Agustín', 'Tomás', 'Cristóbal', 'Sebastián', 'Diego', 'Felipe', 'Nicolás', 'Ignacio', 'Maximiliano', 'Gaspar', 'Lucas', 'Bastián', 'Rodrigo'];
const LN = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Carrasco', 'Cortés', 'Núñez'];

export const DISCIPLINES = [
  ['spin', 'Spinning', 'fire', 3, 'Ciclismo indoor al ritmo de la música. Quema hasta 600 kcal.'],
  ['cross', 'CrossTraining', 'dumbbell', 3, 'Entrenamiento funcional de alta intensidad con pesas y gimnásticos.'],
  ['yoga', 'Yoga Flow', 'sparkle', 1, 'Movilidad, respiración y fuerza. Para todos los niveles.'],
  ['pilates', 'Pilates', 'pulse', 2, 'Core, postura y control con implementos.'],
  ['zumba', 'Zumba', 'star', 2, 'Baile fitness con ritmos latinos. ¡Pura energía!'],
  ['box', 'Box Fit', 'shield', 3, 'Técnica de boxeo y acondicionamiento sin contacto.'],
  ['hiit', 'HIIT 45', 'clock', 3, 'Intervalos cortos e intensos para máxima quema.'],
  ['pump', 'Body Pump', 'dumbbell', 2, 'Barras y discos con muchas repeticiones para tonificar.']
].map(([id, name, icon, intensity, desc], i) => ({ id, name, icon, intensity, desc, color: COLORS[i], active: true }));

export function seed() {
  const r = rng(777);
  const today = ymd();
  const stamp = (date, hm = '10:00') => `${date}T${hm}`;
  const rnd = arr => arr[Math.floor(r() * arr.length)];

  const plans = [
    { id: 'basico', name: 'Básico', monthly: 19990, annual: 199900, desc: 'Sala de máquinas en tu sede, ideal para entrenar a tu ritmo.', features: ['Sala de máquinas y cardio', '1 sede a elección', '2 clases grupales por semana', 'App de socio y carnet digital'], missing: ['Todas las sedes', 'Plan de entrenamiento personalizado'], classesPerWeek: 2, allBranches: false, highlight: false, order: 1 },
    { id: 'full', name: 'Full', monthly: 29990, annual: 299900, desc: 'Todo lo que necesitas: clases ilimitadas y rutina personalizada.', features: ['Sala de máquinas y cardio', '1 sede a elección', 'Clases grupales ilimitadas', 'Rutina personalizada por entrenador', 'Evaluación física trimestral'], missing: ['Todas las sedes'], classesPerWeek: 99, allBranches: false, highlight: true, order: 2 },
    { id: 'black', name: 'Black', monthly: 39990, annual: 399900, desc: 'Acceso total a la red Titán, invitado y evaluación mensual.', features: ['Todas las sedes', 'Clases grupales ilimitadas', 'Rutina personalizada', 'Evaluación física mensual', '1 invitado al mes', 'Toalla y casillero'], missing: [], classesPerWeek: 99, allBranches: true, highlight: false, order: 3 },
    { id: 'estudiante', name: 'Estudiante', monthly: 16990, annual: 169900, desc: 'Precio especial con credencial universitaria vigente.', features: ['Sala de máquinas y cardio', '1 sede', '3 clases grupales por semana', 'Horario 06:00 a 17:00'], missing: ['Rutina personalizada'], classesPerWeek: 3, allBranches: false, highlight: false, order: 4 }
  ].map(p => ({ ...p, active: true }));

  const branches = [
    { id: 'prov', name: 'Providencia', address: 'Av. Nueva Providencia 2150', commune: 'Providencia', phone: '+56 2 2710 4400', hours: { semana: '06:00 – 23:00', sabado: '08:00 – 20:00', domingo: '09:00 – 14:00' }, amenities: ['Estacionamiento', 'Duchas', 'Sala de spinning', 'Zona funcional'], capacity: 180 },
    { id: 'lc', name: 'Las Condes', address: 'Av. Apoquindo 5530', commune: 'Las Condes', phone: '+56 2 2710 4410', hours: { semana: '05:30 – 23:00', sabado: '08:00 – 20:00', domingo: '09:00 – 16:00' }, amenities: ['Piscina temperada', 'Sauna', 'Estacionamiento', 'Kids club'], capacity: 260 },
    { id: 'nunoa', name: 'Ñuñoa', address: 'Av. Irarrázaval 3890', commune: 'Ñuñoa', phone: '+56 2 2710 4420', hours: { semana: '06:00 – 22:30', sabado: '08:00 – 19:00', domingo: 'Cerrado' }, amenities: ['Box de CrossTraining', 'Duchas', 'Bicicletero'], capacity: 140 },
    { id: 'maipu', name: 'Maipú', address: 'Av. Pajaritos 1720', commune: 'Maipú', phone: '+56 2 2710 4430', hours: { semana: '06:00 – 23:00', sabado: '08:00 – 20:00', domingo: '09:00 – 14:00' }, amenities: ['Estacionamiento', 'Ring de box', 'Duchas'], capacity: 200 }
  ].map(b => ({ ...b, active: true }));

  const trainers = [
    ['t1', 'Javiera Ortiz', ['spin', 'hiit'], 'prov', 'Instructora certificada en ciclismo indoor y HIIT. Ex atleta de triatlón.'],
    ['t2', 'Matías Leiva', ['cross', 'pump'], 'prov', 'Coach de CrossTraining nivel 2. Especialista en fuerza y técnica olímpica.'],
    ['t3', 'Daniela Fuentes', ['yoga', 'pilates'], 'lc', 'Profesora de yoga (RYT 500) y pilates mat. Enfoque en movilidad.'],
    ['t4', 'Cristóbal Herrera', ['box', 'hiit'], 'maipu', 'Boxeador amateur y preparador físico. Energía garantizada.'],
    ['t5', 'Fernanda Rojas', ['zumba', 'pump'], 'nunoa', 'Instructora de baile fitness con 8 años animando clases.'],
    ['t6', 'Ignacio Paredes', ['cross', 'hiit'], 'nunoa', 'Kinesiólogo deportivo y coach funcional. Prevención de lesiones.'],
    ['t7', 'Antonia Vidal', ['spin', 'yoga'], 'lc', 'Instructora de spinning y yoga restaurativo.'],
    ['t8', 'Bastián Morales', ['pump', 'box'], 'maipu', 'Entrenador personal, especialista en hipertrofia y nutrición deportiva.']
  ].map(([id, name, specialties, branchId, bio], i) => ({ id, name, specialties, branchId, bio, color: COLORS[(i + 3) % COLORS.length], certifications: ['Preparador físico', 'Primeros auxilios'], active: true, instagram: '@' + name.split(' ')[0].toLowerCase() + '.titan' }));

  // ---- Horario semanal (plantillas de clase)
  const classes = [];
  const TIMES = ['07:00', '08:00', '09:30', '12:30', '18:00', '19:00', '20:00'];
  let ci = 0;
  for (const b of branches) {
    const tb = trainers.filter(t => t.branchId === b.id);
    for (const day of [1, 2, 3, 4, 5, 6]) {
      const times = day === 6 ? ['09:00', '10:30', '12:00'] : TIMES.filter(() => r.bool(.45));
      for (const time of times) {
        const t = rnd(tb), disc = rnd(t.specialties);
        classes.push({ id: 'c' + (ci++), disciplineId: disc, branchId: b.id, trainerId: t.id, day, time, duration: disc === 'yoga' || disc === 'pilates' ? 60 : 45, capacity: disc === 'spin' ? 24 : disc === 'cross' ? 16 : 20, room: disc === 'spin' ? 'Sala Spinning' : disc === 'cross' ? 'Box' : 'Sala 1', active: true });
      }
    }
  }

  // ---- Socios
  const members = [];
  const planW = ['basico', 'basico', 'full', 'full', 'full', 'black', 'estudiante'];
  members.push({ id: 'm0', code: 'TF-10001', name: 'Sofía Navarro Bustos', rut: makeRut(18234567), email: 'socio@titanfit.cl', phone: '+56 9 7654 3210', birth: '1995-06-18', gender: 'F', planId: 'full', billing: 'mensual', branchId: 'prov', status: 'activo', since: addDays(today, -410), nextDue: addDays(today, 6), trainerId: 't2', goal: 'Ganar masa muscular', color: '#7a5cff', createdAt: stamp(addDays(today, -410)) });
  members.push({ id: 'm1', code: 'TF-10002', name: 'Rodrigo Pino Lagos', rut: makeRut(16987321), email: 'moroso@titanfit.cl', phone: '+56 9 6123 4455', birth: '1988-11-02', gender: 'M', planId: 'basico', billing: 'mensual', branchId: 'prov', status: 'moroso', since: addDays(today, -220), nextDue: addDays(today, -12), trainerId: '', goal: 'Bajar de peso', color: '#e11d48', createdAt: stamp(addDays(today, -220)) });
  for (let i = 2; i < 92; i++) {
    const f = r.bool(.5), name = `${rnd(f ? FN_F : FN_M)} ${rnd(LN)} ${rnd(LN)}`;
    const since = addDays(today, -r.int(5, 720));
    const x = r(), status = x < .74 ? 'activo' : x < .85 ? 'moroso' : x < .9 ? 'congelado' : 'baja';
    const planId = rnd(planW), billing = r.bool(.22) ? 'anual' : 'mensual';
    const b = rnd(branches);
    members.push({ id: 'm' + i, code: 'TF-' + (10001 + i), name, rut: makeRut(r.int(12000000, 22000000)), email: name.split(' ').slice(0, 2).join('.').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + i + '@correo.cl', phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, birth: `${r.int(1965, 2006)}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`, gender: f ? 'F' : 'M', planId, billing, branchId: b.id, status, since,
      nextDue: status === 'moroso' ? addDays(today, -r.int(3, 40)) : addDays(today, r.int(1, billing === 'anual' ? 300 : 30)),
      freezeUntil: status === 'congelado' ? addDays(today, r.int(5, 25)) : '', leftAt: status === 'baja' ? addDays(today, -r.int(1, 120)) : '',
      trainerId: planId !== 'basico' && r.bool(.5) ? rnd(trainers.filter(t => t.branchId === b.id)).id : '', goal: rnd(GOALS), color: COLORS[i % COLORS.length], createdAt: stamp(since) });
  }
  const planById = Object.fromEntries(plans.map(p => [p.id, p]));

  // ---- Pagos (6 meses)
  const payments = [];
  let pi = 0;
  for (const m of members) {
    const p = planById[m.planId];
    for (let k = 0; k < 6; k++) {
      const date = addDays(today, -k * 30 - r.int(0, 3));
      if (date < m.since || (m.leftAt && date > m.leftAt)) continue;
      if (m.billing === 'anual' && k > 0) continue;
      if (m.status === 'moroso' && k === 0) { payments.push({ id: 'p' + pi++, memberId: m.id, amount: p.monthly, concept: `Mensualidad ${p.name}`, method: 'PAT automático', at: stamp(m.nextDue, '09:00'), status: 'fallido' }); continue; }
      payments.push({ id: 'p' + pi++, memberId: m.id, amount: m.billing === 'anual' ? p.annual : p.monthly, concept: `${m.billing === 'anual' ? 'Anualidad' : 'Mensualidad'} ${p.name}`, method: rnd(PAY_METHODS), at: stamp(date, fromMin(r.int(420, 1260))), status: 'pagado' });
    }
  }

  // ---- Check-ins (28 días, con horas punta)
  const checkins = [];
  const HOURS = [6, 7, 7, 8, 8, 9, 10, 11, 12, 13, 13, 14, 16, 17, 18, 18, 19, 19, 19, 20, 20, 21];
  const actives = members.filter(m => m.status === 'activo' || m.status === 'moroso');
  let ki = 0;
  for (let off = 27; off >= 0; off--) {
    const date = addDays(today, -off), wd = dow(date);
    const n = wd === 0 ? 8 : wd === 6 ? 18 : 30;
    for (let j = 0; j < n; j++) {
      const m = r.bool(.08) ? members[0] : rnd(actives);
      const h = wd === 0 ? r.int(9, 13) : wd === 6 ? r.int(8, 18) : rnd(HOURS);
      if (off === 0 && h * 60 > toMin(nowHM())) continue;
      checkins.push({ id: 'k' + ki++, memberId: m.id, branchId: m.planId === 'black' && r.bool(.3) ? rnd(branches).id : m.branchId, at: stamp(date, `${String(h).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}`) });
    }
  }

  // ---- Sesiones pasadas (asistencia agregada, 14 días) y reservas (hoy + 7 días)
  const sessions = [], bookings = [];
  let bi = 0;
  for (let off = -14; off <= 7; off++) {
    const date = addDays(today, off), wd = dow(date);
    for (const c of classes.filter(c => c.day === wd)) {
      const fill = Math.min(1, (c.time >= '18:00' || c.time <= '08:00' ? .7 : .45) + r() * .35 - (off > 2 ? (off - 2) * .08 : 0));
      if (off < 0) { const booked = Math.round(c.capacity * fill); sessions.push({ id: 's' + sessions.length, classId: c.id, date, booked, attended: Math.round(booked * (.78 + r() * .18)) }); continue; }
      const pool = members.filter(m => m.status === 'activo' && (m.branchId === c.branchId || m.planId === 'black') && m.id !== 'm0');
      const n = Math.min(pool.length, Math.round(c.capacity * fill) + (r.bool(.25) ? r.int(1, 3) : 0));
      const picked = new Set();
      for (let j = 0; j < n; j++) {
        const m = rnd(pool); if (picked.has(m.id)) continue; picked.add(m.id);
        const over = picked.size > c.capacity;
        const past = off === 0 && toMin(c.time) + c.duration < toMin(nowHM());
        bookings.push({ id: 'b' + bi++, classId: c.id, date, memberId: m.id, status: over ? 'espera' : past ? (r.bool(.85) ? 'asistio' : 'ausente') : 'reservada', createdAt: stamp(addDays(date, -r.int(0, 3)), '12:00') });
      }
    }
  }
  // Reservas del socio demo
  const demoClasses = classes.filter(c => c.branchId === 'prov');
  for (const off of [0, 1, 3]) {
    const date = addDays(today, off), c = demoClasses.find(x => x.day === dow(date) && x.time >= (off === 0 ? '18:00' : '07:00'));
    if (c) bookings.push({ id: 'b' + bi++, classId: c.id, date, memberId: 'm0', status: 'reservada', createdAt: stamp(today, '08:00') });
  }
  for (let off = -21; off < 0; off += 3) { const date = addDays(today, off), c = demoClasses.find(x => x.day === dow(date)); if (c) bookings.push({ id: 'b' + bi++, classId: c.id, date, memberId: 'm0', status: 'asistio', createdAt: stamp(date, '07:00') }); }

  // ---- Rutinas
  const routines = [];
  const mkDay = (name, list) => ({ name, exercises: list.map(([ex, sets, reps, weight]) => ({ ex, sets, reps, weight })) });
  routines.push({ id: 'r0', memberId: 'm0', trainerId: 't2', name: 'Hipertrofia · Fase 2', notes: 'Descanso 90 s entre series. Subir carga cuando completes todas las reps.', active: true, assignedAt: addDays(today, -24), days: [
    mkDay('Día A · Tren inferior', [['Sentadilla con barra', 4, '8', 50], ['Prensa de piernas', 3, '12', 120], ['Hip thrust', 4, '10', 70], ['Zancadas', 3, '12', 12]]),
    mkDay('Día B · Empuje', [['Press banca', 4, '8', 35], ['Press militar', 3, '10', 20], ['Fondos en paralelas', 3, '10', 0], ['Extensión de tríceps', 3, '12', 15]]),
    mkDay('Día C · Tracción', [['Peso muerto', 4, '6', 60], ['Jalón al pecho', 3, '10', 40], ['Remo con barra', 3, '10', 35], ['Curl de bíceps', 3, '12', 10]])] });
  members.filter(m => m.trainerId && m.id !== 'm0').slice(0, 16).forEach((m, i) => routines.push({ id: 'r' + (i + 1), memberId: m.id, trainerId: m.trainerId, name: rnd(['Full body inicial', 'Fuerza 5x5', 'Quema grasa', 'Acondicionamiento']), notes: '', active: true, assignedAt: addDays(today, -r.int(3, 60)), days: [mkDay('Día A', [[rnd(EXERCISES), 3, '12', r.int(10, 40)], [rnd(EXERCISES), 3, '10', r.int(10, 40)], [rnd(EXERCISES), 3, '15', 0]]), mkDay('Día B', [[rnd(EXERCISES), 4, '8', r.int(20, 60)], [rnd(EXERCISES), 3, '12', r.int(5, 20)]])] }));

  // ---- Registro de entrenamientos del socio demo
  const logs = [];
  for (let w = 3; w >= 0; w--) routines[0].days.forEach((d, di) => {
    const date = addDays(today, -w * 7 - (5 - di * 2));
    if (date > today) return;
    d.exercises.forEach(e => logs.push({ id: 'l' + logs.length, memberId: 'm0', routineId: 'r0', day: di, date, ex: e.ex, sets: e.sets, reps: e.reps, weight: e.weight ? Math.max(0, e.weight - w * 2.5) : 0 }));
  });

  // ---- Progreso corporal
  const progress = [];
  for (let k = 11; k >= 0; k--) progress.push({ id: 'g' + progress.length, memberId: 'm0', date: addDays(today, -k * 7 - 1), weight: +(64.5 - (11 - k) * .25 + (r() - .5) * .4).toFixed(1), fat: +(27 - (11 - k) * .35 + (r() - .5) * .3).toFixed(1), waist: +(76 - (11 - k) * .3).toFixed(1), hip: +(98 - (11 - k) * .15).toFixed(1), arm: +(27 + (11 - k) * .1).toFixed(1) });
  members.filter(m => m.trainerId && m.id !== 'm0').slice(0, 12).forEach(m => { const w0 = r.int(58, 98); for (let k = 5; k >= 0; k--) progress.push({ id: 'g' + progress.length, memberId: m.id, date: addDays(today, -k * 14 - 2), weight: +(w0 - (5 - k) * (m.goal === 'Bajar de peso' ? .6 : -.2)).toFixed(1), fat: +(r.int(16, 32) - (5 - k) * .3).toFixed(1), waist: r.int(70, 100), hip: r.int(90, 110), arm: r.int(26, 38) }); });

  // ---- Desafíos
  const monthStart = today.slice(0, 8) + '01';
  const challenges = [
    { id: 'ch1', name: 'Reto 20 visitas', metric: 'checkins', goal: 20, start: addDays(today, -20), end: addDays(today, 10), prize: '1 mes gratis de plan Black para el 1° lugar', desc: 'Suma 20 visitas a cualquier sede en 30 días.', active: true },
    { id: 'ch2', name: 'Maratón de clases', metric: 'clases', goal: 12, start: addDays(today, -14), end: addDays(today, 16), prize: 'Polerón Titán edición limitada', desc: 'Asiste a 12 clases grupales durante el reto.', active: true },
    { id: 'ch3', name: 'Septiembre Fit', metric: 'checkins', goal: 16, start: addDays(today, -60), end: addDays(today, -31), prize: 'Shaker + proteína', desc: 'Reto de fiestas patrias: 16 visitas.', active: false }
  ];

  // ---- Tienda
  const products = [
    ['Agua mineral 600 ml', 'Bebidas', 990, 48], ['Bebida isotónica', 'Bebidas', 1490, 36], ['Proteína whey 30 g (sachet)', 'Suplementos', 2490, 40], ['Barra proteica', 'Snacks', 1690, 55],
    ['Creatina 300 g', 'Suplementos', 18990, 8], ['Shaker Titán', 'Accesorios', 5990, 20], ['Toalla microfibra', 'Accesorios', 7990, 15], ['Guantes de entrenamiento', 'Accesorios', 12990, 10],
    ['Candado casillero', 'Accesorios', 4990, 12], ['Polera Titán Fit', 'Ropa', 14990, 18], ['Café helado proteico', 'Bebidas', 2290, 3], ['Pre-entreno (dosis)', 'Suplementos', 1990, 30]
  ].map(([name, category, price, stock], i) => ({ id: 'x' + i, sku: 'TF' + String(100 + i), name, category, price, stock, active: true }));
  const sales = [];
  for (let i = 0; i < 70; i++) {
    const items = Array.from({ length: r.int(1, 3) }, () => { const p = rnd(products); return { productId: p.id, name: p.name, qty: r.int(1, 2), price: p.price }; });
    const date = addDays(today, -r.int(0, 29));
    sales.push({ id: 'v' + i, items, total: items.reduce((s, x) => s + x.qty * x.price, 0), method: rnd(['Efectivo', 'Tarjeta débito', 'Tarjeta crédito']), branchId: rnd(branches).id, memberId: r.bool(.5) ? rnd(actives).id : '', at: stamp(date, fromMin(r.int(400, 1300))) });
  }

  const campaigns = [
    { id: 'cp1', name: 'Matrícula $0 noviembre', channel: 'email', segment: 'leads', status: 'enviada', sentAt: stamp(addDays(today, -6), '10:00'), reach: 4820, opens: 1735, conversions: 41, message: 'Inscríbete en noviembre y no pagas matrícula.' },
    { id: 'cp2', name: 'Vuelve a Titán (ex socios)', channel: 'sms', segment: 'baja', status: 'enviada', sentAt: stamp(addDays(today, -15), '18:00'), reach: 312, opens: 0, conversions: 9, message: 'Te extrañamos: 50% dcto. tu primer mes de regreso.' },
    { id: 'cp3', name: 'Recordatorio pago pendiente', channel: 'whatsapp', segment: 'moroso', status: 'enviada', sentAt: stamp(addDays(today, -3), '11:00'), reach: 14, opens: 12, conversions: 6, message: 'Tu mensualidad está pendiente. Regulariza y sigue entrenando.' },
    { id: 'cp4', name: 'Lanzamiento Box Fit Maipú', channel: 'push', segment: 'activo', status: 'programada', sentAt: stamp(addDays(today, 2), '09:00'), reach: 0, opens: 0, conversions: 0, message: 'Nueva clase de Box Fit en Maipú. ¡Reserva tu cupo!' },
    { id: 'cp5', name: 'Black Friday plan anual', channel: 'email', segment: 'activo', status: 'borrador', sentAt: '', reach: 0, opens: 0, conversions: 0, message: 'Plan anual con 25% de descuento solo este fin de semana.' }
  ];

  const users = [
    { id: 'u1', name: 'Carolina Méndez', email: 'admin@titanfit.cl', password: 'demo123', role: 'admin', color: '#7a5cff', demo: true, active: true },
    { id: 'u2', name: 'Kevin Salinas', email: 'recepcion@titanfit.cl', password: 'demo123', role: 'recepcion', branchId: 'prov', color: '#00a6a6', demo: true, active: true },
    { id: 'u3', name: 'Matías Leiva', email: 'coach@titanfit.cl', password: 'demo123', role: 'entrenador', trainerId: 't2', color: trainers[1].color, demo: true, active: true },
    { id: 'u4', name: 'Sofía Navarro Bustos', email: 'socio@titanfit.cl', password: 'demo123', role: 'socio', memberId: 'm0', color: '#7a5cff', demo: true, active: true },
    { id: 'u5', name: 'Rodrigo Pino Lagos', email: 'moroso@titanfit.cl', password: 'demo123', role: 'socio', memberId: 'm1', color: '#e11d48', demo: true, active: true },
    { id: 'u6', name: 'Javiera Ortiz', email: 'jortiz@titanfit.cl', password: 'demo123', role: 'entrenador', trainerId: 't1', color: trainers[0].color, active: true },
    { id: 'u7', name: 'Pablo Ríos', email: 'pablo@titanfit.cl', password: 'demo123', role: 'recepcion', branchId: 'lc', color: '#ea580c', active: false }
  ];

  return {
    settings: {
      name: 'Titán Fit', tagline: 'Entrena sin límites',
      heroTitle: 'Forja tu mejor versión', heroText: '4 sedes en Santiago, más de 60 clases semanales y entrenadores que te acompañan de verdad. Sin contratos amarrados.',
      promo: 'Matrícula $0 hasta el 30 de noviembre', phone: '+56 2 2710 4400', email: 'hola@titanfit.cl', instagram: '@titanfit.cl',
      cancelHours: 2, freezeFee: 4990, freezeMaxDays: 60, enrollFee: 0
    },
    seededOn: today,
    plans, branches, disciplines: DISCIPLINES, trainers, classes, members, payments, checkins, sessions, bookings, routines, logs, progress, challenges, products, sales, campaigns, users
  };
}
