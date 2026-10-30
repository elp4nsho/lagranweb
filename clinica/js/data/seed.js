// Datos semilla reproducibles del Centro Médico Alerce.
import { rng } from '../../../assets/core/db.js';
import { ymd, addDays, dow, toMin, fromMin, nowHM } from '../shared/dates.js';
import { makeRut } from '../shared/rut.js';
import { templateSlots } from '../shared/slots.js';
import { PREVISIONES, CIE10, DRUGS, EXAMS } from './catalog.js';

const COLORS = ['#0f766e', '#7c3aed', '#db2777', '#2563eb', '#ea580c', '#059669', '#9333ea', '#0891b2', '#c2410c', '#4f46e5', '#be123c', '#15803d'];
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const SPECIALTIES = [
  { id: 'mg', name: 'Medicina General', icon: 'steth', desc: 'Control de salud, enfermedades frecuentes, certificados y derivación oportuna a especialistas.', prices: { fonasa: 6800, isapre: 12000, particular: 32000 } },
  { id: 'ped', name: 'Pediatría', icon: 'baby', desc: 'Controles de niño sano, vacunas, enfermedades respiratorias y seguimiento del desarrollo.', prices: { fonasa: 8200, isapre: 14000, particular: 38000 } },
  { id: 'gin', name: 'Ginecología y Obstetricia', icon: 'female', desc: 'Control ginecológico, embarazo, planificación familiar y menopausia.', prices: { fonasa: 9500, isapre: 16000, particular: 45000 } },
  { id: 'car', name: 'Cardiología', icon: 'heart', desc: 'Hipertensión, arritmias, electrocardiograma y prevención cardiovascular.', prices: { fonasa: 12500, isapre: 20000, particular: 55000 } },
  { id: 'der', name: 'Dermatología', icon: 'sparkle', desc: 'Acné, dermatitis, control de lunares y tratamientos de la piel, pelo y uñas.', prices: { fonasa: 11000, isapre: 18000, particular: 48000 } },
  { id: 'tra', name: 'Traumatología', icon: 'bone', desc: 'Lesiones deportivas, dolor de espalda, rodilla y hombro, fracturas y esguinces.', prices: { fonasa: 11500, isapre: 19000, particular: 50000 } },
  { id: 'oft', name: 'Oftalmología', icon: 'eye', desc: 'Medición de la vista, receta de lentes, glaucoma y control de fondo de ojo.', prices: { fonasa: 10500, isapre: 17000, particular: 45000 } },
  { id: 'otr', name: 'Otorrinolaringología', icon: 'ear', desc: 'Oído, nariz y garganta: sinusitis, otitis, ronquidos y pérdida auditiva.', prices: { fonasa: 10500, isapre: 17000, particular: 45000 } },
  { id: 'psi', name: 'Psicología', icon: 'brain', desc: 'Psicoterapia para adultos y adolescentes: ansiedad, ánimo, estrés y relaciones.', prices: { fonasa: 9000, isapre: 15000, particular: 35000 } },
  { id: 'nut', name: 'Nutrición', icon: 'apple', desc: 'Planes de alimentación, control de peso, diabetes y nutrición deportiva.', prices: { fonasa: 7000, isapre: 12000, particular: 28000 } }
].map((s, i) => ({ ...s, active: true, order: i }));

const sch = (days, start, end, slot, breakStart = '', breakEnd = '') => ({ days, start, end, slot, breakStart, breakEnd });
export const DOCTORS = [
  ['d1', 'Dra. Antonia Vergara Ríos', 'mg', sch([1, 2, 3, 4, 5], '08:30', '13:30', 20), true, 'b1', 'Médica cirujana, Universidad de Concepción. 12 años de experiencia en atención primaria y medicina familiar.'],
  ['d2', 'Dr. Felipe Contreras Muñoz', 'mg', sch([1, 3, 5], '14:00', '19:00', 20, '16:20', '16:40'), true, 'b2', 'Médico general con diplomado en geriatría. Atiende adultos y adultos mayores.'],
  ['d3', 'Dra. Javiera Paredes Soto', 'ped', sch([1, 2, 3, 4], '09:00', '13:00', 20), false, 'b3', 'Pediatra, especialista en lactancia y desarrollo infantil. Mamá de dos.'],
  ['d4', 'Dr. Tomás Henríquez Lagos', 'ped', sch([2, 4, 6], '09:00', '13:00', 20), true, 'b3', 'Pediatra con subespecialidad en broncopulmonar infantil.'],
  ['d5', 'Dra. Carolina Espinoza Díaz', 'gin', sch([1, 3], '09:00', '14:00', 30, '11:30', '12:00'), false, 'b4', 'Ginecóloga obstetra. Control de embarazo, ecografías y salud de la mujer.'],
  ['d6', 'Dr. Rodrigo Saavedra Pino', 'car', sch([2, 4, 5], '08:00', '13:00', 30), true, 'b5', 'Cardiólogo, Pontificia Universidad Católica. Prevención cardiovascular e hipertensión.'],
  ['d7', 'Dra. Magdalena Ortiz Fuentes', 'der', sch([1, 4], '14:00', '18:40', 20), true, 'b6', 'Dermatóloga. Dermatología clínica, acné y control de lunares con dermatoscopía.'],
  ['d8', 'Dr. Ignacio Rebolledo Vega', 'tra', sch([1, 3, 5], '08:30', '13:30', 20), false, 'b4', 'Traumatólogo deportivo. Rodilla, hombro y lesiones del deportista.'],
  ['d9', 'Dra. Paula Cifuentes Araya', 'oft', sch([2, 5], '09:00', '13:00', 20), false, 'b6', 'Oftalmóloga. Vicios de refracción, glaucoma y salud visual infantil.'],
  ['d10', 'Dr. Sebastián Godoy Alarcón', 'otr', sch([3, 5], '14:30', '18:30', 20), false, 'b5', 'Otorrinolaringólogo. Sinusitis, rinitis alérgica y trastornos del sueño.'],
  ['d11', 'Ps. Valentina Morales Castro', 'psi', sch([1, 2, 3, 4], '15:00', '20:00', 45), true, 'b8', 'Psicóloga clínica con enfoque cognitivo-conductual. Adultos y adolescentes.'],
  ['d12', 'Nut. Diego Sepúlveda Rojas', 'nut', sch([2, 4], '09:00', '13:00', 30), true, 'b7', 'Nutricionista deportivo y clínico. Planes personalizados y control metabólico.'],
  ['d13', 'Dr. Martín Bravo Navarro', 'car', sch([1, 3], '14:00', '18:00', 30), false, 'b1', 'Cardiólogo. Ecocardiografía, arritmias y rehabilitación cardíaca.'],
  ['d14', 'Dra. Fernanda Riquelme Toro', 'der', sch([3, 5, 6], '09:00', '13:00', 20), true, 'b2', 'Dermatóloga pediátrica y de adultos. Dermatitis y enfermedades de la piel.']
].map(([id, name, specialtyId, schedule, tele, boxId, bio], i) => ({ id, name, specialtyId, schedule, tele, boxId, bio, color: COLORS[i % COLORS.length], active: true, rating: (4.5 + (i % 5) / 10).toFixed(1), reviews: 40 + i * 13, rut: makeRut(9000000 + i * 731457) }));

const FN_F = ['Camila', 'Valentina', 'Martina', 'Isidora', 'Catalina', 'Francisca', 'Josefa', 'Antonella', 'Fernanda', 'Constanza', 'Daniela', 'Javiera', 'Paula', 'Macarena', 'Carolina', 'Rocío', 'Gabriela', 'Pía', 'Trinidad', 'María José', 'Ana', 'Rosa', 'Margarita', 'Gloria'];
const FN_M = ['Benjamín', 'Vicente', 'Martín', 'Matías', 'Joaquín', 'Agustín', 'Tomás', 'Cristóbal', 'Sebastián', 'Diego', 'Felipe', 'Nicolás', 'Ignacio', 'Francisco', 'José', 'Juan Pablo', 'Rodrigo', 'Claudio', 'Patricio', 'Luis', 'Hernán', 'Jorge'];
const LN = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Carrasco', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara'];
const REASONS = ['Control', 'Dolor persistente', 'Revisión de exámenes', 'Primera consulta', 'Renovar receta', 'Malestar general', 'Seguimiento de tratamiento', 'Certificado médico', ''];

export function seed() {
  const r = rng(1450);
  // "Hora clínica": fuera del horario se simula media mañana/tarde para que la sala de espera tenga movimiento
  const today = ymd(), now = Math.min(Math.max(toMin(nowHM()), 615), 1170);
  const stamp = (date, hm = '10:00') => `${date}T${hm}`; // fecha local compacta (Date la interpreta como hora local)
  const code = () => 'AL-' + Array.from({ length: 4 }, () => CODE_CH[Math.floor(r() * CODE_CH.length)]).join('');
  const prevWeights = ['fonasa-a', 'fonasa-b', 'fonasa-b', 'fonasa-c', 'fonasa-c', 'fonasa-d', 'fonasa-d', 'cordillera', 'austral', 'vitalia', 'pacifico', 'cordillera', 'particular'];

  // ---- Pacientes
  const patients = [
    { id: 'p0', rut: '16.543.210-K', name: 'Camila Fuentes Herrera', birth: '1988-04-12', sex: 'F', phone: '+56 9 8765 4321', email: 'paciente@alerce.cl', prevision: 'cordillera', allergies: 'Penicilina', chronic: 'Hipotiroidismo', createdAt: stamp(addDays(today, -400)) },
    { id: 'p0a', rut: makeRut(24876543), name: 'Tomás Fuentes Herrera', birth: '2017-09-03', sex: 'M', phone: '+56 9 8765 4321', email: 'paciente@alerce.cl', prevision: 'cordillera', holderId: 'p0', relation: 'Hijo', allergies: '', chronic: 'Asma leve', createdAt: stamp(addDays(today, -380)) },
    { id: 'p0b', rut: makeRut(26112908), name: 'Sofía Fuentes Herrera', birth: '2020-02-21', sex: 'F', phone: '+56 9 8765 4321', email: 'paciente@alerce.cl', prevision: 'cordillera', holderId: 'p0', relation: 'Hija', allergies: '', chronic: '', createdAt: stamp(addDays(today, -380)) }
  ];
  for (let i = 1; i <= 72; i++) {
    const f = r.bool(.56), fn = r.pick(f ? FN_F : FN_M), ln = `${r.pick(LN)} ${r.pick(LN)}`;
    const year = r.bool(.2) ? r.int(2010, 2022) : r.int(1945, 2004);
    const email = `${fn.split(' ')[0]}.${ln.split(' ')[0]}${i}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@correo.cl';
    patients.push({ id: 'p' + i, rut: makeRut(r.int(year < 2000 ? 5000000 : 19000000, year < 2000 ? 19000000 : 27000000)), name: `${fn} ${ln}`, birth: `${year}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`, sex: f ? 'F' : 'M', phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, email, prevision: r.pick(prevWeights), allergies: r.bool(.15) ? r.pick(['Penicilina', 'AINES', 'Sulfas', 'Látex', 'Mariscos']) : '', chronic: r.bool(.25) ? r.pick(['Hipertensión', 'Diabetes tipo 2', 'Asma', 'Hipotiroidismo', 'Dislipidemia']) : '', createdAt: r.daysAgo(700, 30) });
  }
  const spec = Object.fromEntries(SPECIALTIES.map(s => [s.id, s]));
  const prevType = id => PREVISIONES.find(p => p.id === id).type;
  const priceOf = (sid, prev) => spec[sid].prices[prevType(prev)];
  const payMethods = { fonasa: ['Bono Fonasa', 'Bono Fonasa', 'Débito'], isapre: ['Bono Isapre (IMED)', 'Bono Isapre (IMED)', 'Crédito'], particular: ['Débito', 'Crédito', 'Efectivo'] };

  // ---- Citas
  const appointments = [];
  const taken = new Set();
  let n = 0;
  const add = (doc, date, time, patient, extra = {}) => {
    const key = `${doc.id}|${date}|${time}`;
    if (taken.has(key)) return null;
    taken.add(key);
    const prev = patient.prevision;
    const a = { id: 'a' + (n++).toString(36), code: code(), patientId: patient.id, doctorId: doc.id, specialtyId: doc.specialtyId, date, time, mode: doc.tele && r.bool(.18) ? 'tele' : 'presencial', status: 'confirmada', prevision: prev, price: priceOf(doc.specialtyId, prev), paid: false, reason: r.pick(REASONS), createdAt: stamp(addDays(date, -r.int(1, 14)), fromMin(r.int(480, 1200))), ...extra };
    appointments.push(a);
    return a;
  };
  const DOCS = DOCTORS;
  const doc = id => DOCS.find(d => d.id === id);
  const nextWork = (d, from) => { for (let k = from; k < from + 14; k++) { const dt = addDays(today, k); if (d.schedule.days.includes(dow(dt))) return dt; } };
  // Citas fijas del paciente demo (para probar portal, gestión y telemedicina)
  const d1 = doc('d1'), d6 = doc('d6'), d3 = doc('d3');
  add(d1, nextWork(d1, 1), '10:10', patients[0], { mode: 'tele', status: 'confirmada', code: 'AL-TELE', reason: 'Control hipotiroidismo' });
  add(d6, nextWork(d6, 3), '09:00', patients[0], { mode: 'presencial', status: 'reservada', code: 'AL-7K2Q', reason: 'Chequeo cardiovascular' });
  add(d3, nextWork(d3, 2), '11:00', patients[1], { mode: 'presencial', status: 'reservada', reason: 'Control asma' });

  for (let off = -32; off <= 21; off++) {
    const date = addDays(today, off), wd = dow(date);
    for (const d of DOCS) {
      if (!d.schedule.days.includes(wd)) continue;
      const slots = templateSlots(d.schedule);
      const ratio = off < 0 ? .3 + r() * .2 : off === 0 ? .55 : Math.max(.06, .45 - off * .02);
      for (const t of slots) {
        if (!r.bool(ratio)) continue;
        const pat = r.bool(.03) ? r.pick(patients.slice(0, 3)) : patients[r.int(3, patients.length - 1)];
        const a = add(d, date, t, pat);
        if (!a) continue;
        const tm = toMin(t);
        if (off < 0 || (off === 0 && tm + 30 < now)) {
          const x = r();
          a.status = x < .1 ? 'no_show' : x < .21 ? 'cancelada' : 'atendida';
          if (a.status !== 'atendida' && off < 0) delete a.reason;
          if (a.status === 'atendida') {
            a.paid = true; a.payMethod = r.pick(payMethods[prevType(a.prevision)]); if (off < 0) delete a.reason;
            a.checkinAt = stamp(date, fromMin(Math.max(0, tm - r.int(3, 20)))); a.boxId = d.boxId;
          }
        } else if (off === 0) {
          // Hoy: algunos ya llegaron
          if (tm - now <= 45 && r.bool(.75) && a.mode !== 'tele') { a.status = 'en_espera'; a.checkinAt = stamp(date, fromMin(Math.max(0, Math.min(now, tm) - r.int(2, 15)))); a.paid = r.bool(.7); if (a.paid) { a.payMethod = r.pick(payMethods[prevType(a.prevision)]); a.paidAt = a.checkinAt; } }
          else a.status = r.bool(.8) ? 'confirmada' : 'reservada';
        } else {
          a.status = off <= 2 && r.bool(.6) ? 'confirmada' : r.bool(.08) ? 'cancelada' : 'reservada';
        }
      }
    }
  }
  // Una llamada reciente para la pantalla
  const waiting = appointments.filter(a => a.date === today && a.status === 'en_espera').sort((a, b) => a.time.localeCompare(b.time));
  if (waiting[0]) { waiting[0].status = 'en_atencion'; waiting[0].calledAt = new Date(Date.now() - 6 * 60e3).toISOString(); waiting[0].boxId = doc(waiting[0].doctorId).boxId; }

  // ---- Fichas clínicas (últimas atenciones de algunos médicos y del paciente demo)
  const records = [];
  const notes = ['Paciente refiere molestias de una semana de evolución, sin fiebre.', 'Consulta por control de patología crónica. Adherente a tratamiento.', 'Refiere dolor intermitente que aumenta con la actividad física.', 'Acude por resultados de exámenes solicitados en control anterior.', 'Sin antecedentes relevantes nuevos desde último control.'];
  appointments.filter(a => a.status === 'atendida' && (['p0', 'p0a', 'p0b'].includes(a.patientId) || (['d1', 'd6'].includes(a.doctorId) && a.date >= addDays(today, -12)))).forEach((a, i) => {
    const dx = CIE10[(i * 7 + 3) % CIE10.length];
    records.push({ id: 'r' + i, appointmentId: a.id, patientId: a.patientId, doctorId: a.doctorId, date: a.date, anamnesis: notes[i % notes.length], exam: `PA ${r.int(105, 145)}/${r.int(65, 92)} mmHg · FC ${r.int(60, 95)} lpm · T° ${(36 + r() * 1.2).toFixed(1)} °C`, diagnosis: [{ code: dx[0], name: dx[1] }], indications: r.pick(['Reposo relativo por 3 días. Hidratación abundante.', 'Mantener tratamiento. Control en 3 meses con exámenes.', 'Dieta liviana, evitar irritantes. Control si persisten síntomas.', 'Ejercicio aeróbico 30 minutos diarios. Reducir sal.']), prescription: r.bool(.75) ? [{ drug: r.pick(DRUGS), dose: '1 comprimido', freq: r.pick(['cada 8 horas', 'cada 12 horas', 'una vez al día']), days: r.pick([5, 7, 10, 30]) }] : [], createdAt: stamp(a.date, a.time) });
  });

  // ---- Exámenes
  const exams = [];
  const examPatients = [patients[0], patients[0], patients[0], patients[1], ...Array.from({ length: 24 }, () => patients[r.int(3, patients.length - 1)])];
  examPatients.forEach((p, i) => {
    const type = i === 0 ? 'Perfil tiroideo' : i === 1 ? 'Hemograma completo' : i === 2 ? 'Perfil lipídico' : r.pick(Object.keys(EXAMS));
    const status = i === 2 || (i > 3 && r.bool(.15)) ? 'en_proceso' : 'disponible';
    exams.push({ id: 'e' + i, folio: String(480120 + i * 37), patientId: p.id, type, date: addDays(today, -(i < 3 ? [6, 20, 1][i] : r.int(1, 50))), status, doctorId: r.pick(DOCS).id,
      values: status === 'disponible' ? EXAMS[type].map(([name, unit, lo, hi]) => { const span = hi - lo || hi; const v = lo + span * (r() * 1.3 - .1); return { name, unit, ref: `${lo} – ${hi}`, value: +v.toFixed(hi < 10 ? 2 : 0), flag: v < lo ? 'bajo' : v > hi ? 'alto' : '' }; }) : [] });
  });

  // ---- Recordatorios (log simulado de SMS / email)
  const reminders = [];
  appointments.filter(a => a.date >= addDays(today, -7) && a.date <= addDays(today, 2) && a.status !== 'cancelada').slice(0, 70).forEach((a, i) => {
    const p = patients.find(x => x.id === a.patientId);
    const ch = i % 3 === 0 ? 'email' : 'sms';
    reminders.push({ id: 'm' + i, appointmentId: a.id, patientId: p.id, channel: ch, to: ch === 'sms' ? p.phone : p.email, kind: 'recordatorio', status: a.date > today ? (r.bool(.5) ? 'programado' : 'enviado') : r.bool(.06) ? 'fallido' : 'enviado', sentAt: stamp(addDays(a.date, -1), '18:00'), message: `Recordatorio: hora el ${a.date} a las ${a.time}. Código ${a.code}.`, createdAt: stamp(addDays(a.date, -1), '18:00') });
  });

  // ---- Bloqueos de agenda
  const blocks = [
    { id: 'k1', doctorId: 'd8', date: nextWork(doc('d8'), 5), start: '08:30', end: '13:30', reason: 'Congreso de traumatología' },
    { id: 'k2', doctorId: 'd1', date: nextWork(d1, 4), start: '12:10', end: '13:30', reason: 'Reunión clínica' }
  ];

  const users = [
    { id: 'u1', name: 'Patricia Lagos Ibáñez', email: 'admin@alerce.cl', password: 'demo123', role: 'admin', color: '#4f46e5', demo: true, active: true },
    { id: 'u2', name: 'Jorge Muñoz Tapia', email: 'recepcion@alerce.cl', password: 'demo123', role: 'recepcion', color: '#0891b2', demo: true, active: true },
    { id: 'u3', name: 'Dra. Antonia Vergara Ríos', email: 'medico@alerce.cl', password: 'demo123', role: 'medico', doctorId: 'd1', color: DOCTORS[0].color, demo: true, active: true },
    { id: 'u4', name: 'Dr. Rodrigo Saavedra Pino', email: 'cardiologia@alerce.cl', password: 'demo123', role: 'medico', doctorId: 'd6', color: DOCTORS[5].color, demo: true, active: true },
    { id: 'u5', name: 'Camila Fuentes Herrera', email: 'paciente@alerce.cl', password: 'demo123', role: 'paciente', patientId: 'p0', color: '#db2777', demo: true, active: true },
    { id: 'u6', name: 'Lorena Pizarro Núñez', email: 'lpizarro@alerce.cl', password: 'demo123', role: 'recepcion', color: '#ea580c', active: false },
    { id: 'u7', name: 'Dr. Felipe Contreras Muñoz', email: 'fcontreras@alerce.cl', password: 'demo123', role: 'medico', doctorId: 'd2', color: DOCTORS[1].color, active: true }
  ];

  const boxes = [
    ['b1', 'Box 1', 1, 'Consulta'], ['b2', 'Box 2', 1, 'Consulta'], ['b3', 'Box 3', 1, 'Pediatría'], ['b4', 'Box 4', 2, 'Consulta'],
    ['b5', 'Box 5', 2, 'Cardiología (ECG)'], ['b6', 'Box 6', 2, 'Procedimientos menores'], ['b7', 'Sala Nutrición', 2, 'Consulta'], ['b8', 'Sala Telemedicina', 3, 'Telemedicina']
  ].map(([id, name, floor, type]) => ({ id, name, floor, type, active: true }));

  return {
    settings: {
      name: 'Centro Médico Alerce', tagline: 'Salud cercana, sin filas',
      heroTitle: 'Tu salud, a la hora que tú necesitas',
      heroText: 'Reserva en línea con 14 especialistas, atiéndete por telemedicina y revisa tus exámenes desde casa. Convenio con Fonasa e Isapres.',
      announcement: 'Campaña de vacunación influenza: lunes a viernes de 9:00 a 13:00, sin hora previa.',
      phone: '+56 2 2940 1200', whatsapp: '+56 9 4455 1200', email: 'contacto@alerce.cl',
      address: 'Av. Los Alerces 1450, Ñuñoa, Santiago', hours: 'Lun a Vie 8:00–20:00 · Sáb 9:00–14:00',
      bookingDays: 21, teleEnabled: true, cancelHours: 2,
      reminderTemplate: 'Hola {paciente}, te recordamos tu hora con {medico} el {fecha} a las {hora}. Código {codigo}. Responde 1 para confirmar.'
    },
    seededOn: today,
    specialties: SPECIALTIES, doctors: DOCTORS, boxes, patients, appointments, records, exams, reminders, blocks, users, telechat: []
  };
}
