// Datos semilla del Colegio Los Aromos (reproducibles con rng()).
import { rng } from '../../../assets/core/db.js';
import { YEAR, NOW, ymd, isWeekday, dayIndex, BLOCKS } from '../shared/school.js';

const FIRST_F = ['Martina', 'Sofía', 'Florencia', 'Isidora', 'Antonia', 'Agustina', 'Emilia', 'Josefa', 'Catalina', 'Trinidad', 'Maite', 'Amanda', 'Javiera', 'Fernanda', 'Rocío', 'Colomba', 'Ignacia', 'Julieta', 'Renata', 'Valentina'];
const FIRST_M = ['Benjamín', 'Vicente', 'Agustín', 'Matías', 'Tomás', 'Joaquín', 'Maximiliano', 'Lucas', 'Gaspar', 'Cristóbal', 'Martín', 'Felipe', 'Diego', 'Bastián', 'Alonso', 'Emiliano', 'Facundo', 'Simón', 'León', 'Santiago'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa', 'Riquelme'];
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777', '#0d9488', '#9333ea', '#ea580c', '#4f46e5', '#16a34a'];

export const SUBJECTS = [
  { id: 'len', name: 'Lenguaje y Comunicación', short: 'Lenguaje', code: 'LEN', hours: 6 },
  { id: 'mat', name: 'Matemática', short: 'Matemática', code: 'MAT', hours: 6 },
  { id: 'his', name: 'Historia, Geografía y Cs. Sociales', short: 'Historia', code: 'HIS', hours: 4 },
  { id: 'cie', name: 'Ciencias Naturales', short: 'Ciencias', code: 'CIE', hours: 4 },
  { id: 'ing', name: 'Inglés', short: 'Inglés', code: 'ING', hours: 3 },
  { id: 'art', name: 'Artes Visuales', short: 'Artes', code: 'ART', hours: 2 },
  { id: 'efi', name: 'Educación Física y Salud', short: 'Ed. Física', code: 'EFI', hours: 3 },
  { id: 'mus', name: 'Música', short: 'Música', code: 'MUS', hours: 2 },
  { id: 'tec', name: 'Tecnología', short: 'Tecnología', code: 'TEC', hours: 2 }
];
const BASICA = ['len', 'mat', 'his', 'cie', 'ing', 'art', 'efi', 'mus'];
const MEDIA = ['len', 'mat', 'his', 'cie', 'ing', 'art', 'efi', 'tec'];
const COURSES = [
  { id: 'k-a', name: 'Kínder A', level: 'parvularia', grade: 0, room: 'Sala Arcoíris', subjects: ['len', 'mat', 'ing', 'art', 'efi', 'mus'], head: 't9' },
  { id: '2b-a', name: '2° Básico A', level: 'basica', grade: 2, room: 'Sala 4', subjects: BASICA, head: 't11' },
  { id: '4b-a', name: '4° Básico A', level: 'basica', grade: 4, room: 'Sala 7', subjects: BASICA, head: 't3' },
  { id: '6b-a', name: '6° Básico A', level: 'basica', grade: 6, room: 'Sala 10', subjects: BASICA, head: 't2' },
  { id: '8b-a', name: '8° Básico A', level: 'basica', grade: 8, room: 'Sala 12', subjects: BASICA, head: 't1' },
  { id: '1m-a', name: 'I Medio A', level: 'media', grade: 9, room: 'Sala 15', subjects: MEDIA, head: 't4' },
  { id: '2m-a', name: 'II Medio A', level: 'media', grade: 10, room: 'Sala 16', subjects: MEDIA, head: 't10' },
  { id: '4m-a', name: 'IV Medio A', level: 'media', grade: 12, room: 'Sala 18', subjects: MEDIA, head: 't8' }
];
const TEACHERS = [
  ['t1', 'Camila Fuentes', 'cfuentes@losaromos.cl', ['mat'], 'Profesora de Matemática', true],
  ['t2', 'Jorge Muñoz', 'jmunoz@losaromos.cl', ['len'], 'Profesor de Lenguaje'],
  ['t3', 'Francisca Herrera', 'fherrera@losaromos.cl', ['his'], 'Profesora de Historia'],
  ['t4', 'Ignacio Vargas', 'ivargas@losaromos.cl', ['cie'], 'Profesor de Ciencias'],
  ['t5', 'Daniela Contreras', 'dcontreras@losaromos.cl', ['ing'], 'Profesora de Inglés'],
  ['t6', 'Pablo Sepúlveda', 'psepulveda@losaromos.cl', ['efi'], 'Profesor de Educación Física'],
  ['t7', 'Valentina Castro', 'vcastro@losaromos.cl', ['art', 'mus'], 'Profesora de Artes y Música'],
  ['t8', 'Tomás Reyes', 'treyes@losaromos.cl', ['mat'], 'Profesor de Matemática'],
  ['t9', 'María José Lagos', 'mlagos@losaromos.cl', ['len', 'mat', 'art', 'mus'], 'Educadora de Párvulos'],
  ['t10', 'Felipe Navarro', 'fnavarro@losaromos.cl', ['his', 'tec'], 'Profesor de Historia y Tecnología'],
  ['t11', 'Constanza Pizarro', 'cpizarro@losaromos.cl', ['len'], 'Profesora de Lenguaje'],
  ['t12', 'Andrés Bravo', 'abravo@losaromos.cl', ['cie'], 'Profesor de Biología']
];
// Asignación docente explícita: curso → asignatura → profesor
function teacherFor(course, subj) {
  if (course.id === 'k-a') return { len: 't9', mat: 't9', art: 't9', mus: 't7', ing: 't5', efi: 't6' }[subj];
  const media = course.level === 'media';
  switch (subj) {
    case 'mat': return ['6b-a', '8b-a', '1m-a', '2m-a'].includes(course.id) ? 't1' : 't8';
    case 'len': return ['6b-a', '8b-a', '1m-a', '4m-a'].includes(course.id) ? 't2' : 't11';
    case 'his': return media ? 't10' : 't3';
    case 'cie': return media ? 't12' : 't4';
    case 'ing': return 't5';
    case 'efi': return 't6';
    case 'art': case 'mus': return 't7';
    case 'tec': return 't10';
  }
}

const TOPICS = {
  len: ['Comprensión lectora: textos narrativos', 'El sustantivo y el adjetivo', 'Lectura domiciliaria: análisis', 'Producción de textos argumentativos', 'Figuras literarias', 'Ortografía acentual', 'Género lírico: el poema', 'Conectores y cohesión textual', 'Debate en clase', 'Texto informativo: la noticia'],
  mat: ['Fracciones y decimales', 'Ecuaciones de primer grado', 'Ejercitación guía N° 4', 'Teorema de Pitágoras', 'Proporcionalidad directa e inversa', 'Funciones lineales', 'Probabilidad y estadística', 'Potencias y raíces', 'Área y perímetro', 'Resolución de problemas'],
  his: ['La Independencia de Chile', 'Zonas naturales de Chile', 'Revolución Industrial', 'Formación ciudadana: derechos', 'El mundo griego y romano', 'Mapas y coordenadas', 'Pueblos originarios', 'Chile en el siglo XX'],
  cie: ['La célula y sus partes', 'Sistema digestivo', 'Estados de la materia', 'Fotosíntesis', 'Fuerza y movimiento', 'Laboratorio: mezclas', 'Ecosistemas y cadenas tróficas', 'Tabla periódica'],
  ing: ['Present simple routines', 'Vocabulary: food and drinks', 'Past simple: regular verbs', 'Reading comprehension', 'Speaking: describing people', 'Listening practice', 'Future with going to'],
  art: ['Teoría del color', 'Collage y texturas', 'Dibujo en perspectiva', 'Arte precolombino', 'Escultura en greda'],
  efi: ['Circuito de habilidades motrices', 'Vóleibol: golpe de antebrazo', 'Atletismo: velocidad', 'Juegos predeportivos', 'Vida activa y saludable'],
  mus: ['Ritmo y pulso', 'Flauta dulce: escala de Do', 'Música chilena: cueca', 'Ensamble instrumental'],
  tec: ['Diseño de un objeto tecnológico', 'Planilla de cálculo', 'Programación por bloques', 'Proyecto: prototipo']
};
const ANN_POS = ['Excelente participación en clase y apoyo a sus compañeros.', 'Entrega trabajos de manera responsable y ordenada.', 'Destacada presentación oral.', 'Muestra gran compromiso y esfuerzo en la asignatura.', 'Colabora activamente en el trabajo grupal.', 'Gran avance en sus resultados, felicitaciones.', 'Representó al colegio en el campeonato comunal.'];
const ANN_NEG = ['No trae materiales solicitados para la clase.', 'Interrumpe reiteradamente el desarrollo de la clase.', 'No entrega tarea en la fecha indicada.', 'Uso de celular durante la clase.', 'Llega atrasado(a) después del recreo.', 'Falta de respeto hacia un compañero.'];
const ANN_OBS = ['Se conversa con el estudiante sobre su rendimiento.', 'Se observa cansancio durante la jornada.', 'Se deriva a orientación para acompañamiento.'];

function rutFor(n) {
  let s = 0, m = 2;
  for (let x = n; x > 0; x = Math.floor(x / 10)) { s += (x % 10) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  const dv = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
export { rutFor };

const d = (m, day) => ymd(new Date(YEAR, m - 1, day));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r1 = v => Math.round(v * 10) / 10;
const iso = (date, h = 10, mi = 0) => { const x = new Date(date); x.setHours(h, mi, 0, 0); return x.toISOString(); };
const daysAgo = (n, h = 10) => { const x = new Date(NOW); x.setDate(x.getDate() - n); x.setHours(h, (n * 7) % 60, 0, 0); return x.toISOString(); };

export function seed() {
  const R = rng(4127);
  const users = [], students = [];
  const color = () => R.pick(COLORS);

  users.push({ id: 'u-admin', name: 'Patricia Morales', email: 'direccion@losaromos.cl', password: 'admin123', role: 'admin', title: 'Directora', color: '#7c3aed', demo: true, active: true, phone: '+56 9 8123 4501' });
  users.push({ id: 'u-utp', name: 'Rodrigo Silva', email: 'utp@losaromos.cl', password: 'utp123', role: 'utp', title: 'Jefe de UTP', color: '#0891b2', demo: true, active: true, phone: '+56 9 8123 4502' });
  TEACHERS.forEach(([id, name, email, subjects, title, demo], i) => users.push({ id, name, email, password: 'profe123', role: 'profesor', subjects, title, color: COLORS[i % COLORS.length], demo: !!demo, active: true, phone: `+56 9 7${R.int(100, 999)} ${R.int(1000, 9999)}` }));

  // --- Estudiantes y apoderados ---
  let rutBase = 22800000, gN = 0, sN = 0;
  const guardians = {};
  const ability = {}, attRate = {}, bias = {};
  const mkGuardian = (lastName, opts = {}) => {
    const id = opts.id || `g${++gN}`;
    const female = R.bool(.7);
    const first = female ? R.pick(['Andrea', 'Carolina', 'Paula', 'Claudia', 'Marcela', 'Lorena', 'Daniela', 'Francisca', 'Verónica', 'Natalia']) : R.pick(['Cristián', 'Rodrigo', 'Mauricio', 'Gonzalo', 'Patricio', 'Sergio', 'Álvaro', 'Ricardo']);
    const name = opts.name || `${first} ${lastName}`;
    const u = { id, name, email: opts.email || `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')}${gN}@correo.cl`, password: opts.password || 'apoderado123', role: 'apoderado', color: color(), demo: !!opts.demo, active: true, phone: `+56 9 ${R.int(5000, 9999)} ${R.int(1000, 9999)}`, rut: rutFor(R.int(9000000, 18000000)), children: [] };
    users.push(u); guardians[id] = u; return u;
  };
  const demoG = mkGuardian('Rojas', { id: 'g-demo', name: 'Andrea Rojas', email: 'andrea.rojas@correo.cl', demo: true });
  const siblings = [];
  COURSES.forEach((c, ci) => {
    const birthYear = YEAR - 6 - c.grade;
    for (let k = 0; k < 14; k++) {
      const id = `s${String(++sN).padStart(3, '0')}`;
      let first, last1 = R.pick(LAST), last2 = R.pick(LAST), female = R.bool();
      let g;
      if (c.id === '8b-a' && k === 0) { first = 'Martina'; last1 = 'Rojas'; last2 = 'Fuenzalida'; female = true; g = demoG; ability[id] = 5.9; attRate[id] = .97; }
      else if (c.id === '4b-a' && k === 0) { first = 'Benjamín'; last1 = 'Rojas'; last2 = 'Fuenzalida'; female = false; g = demoG; ability[id] = 4.9; attRate[id] = .9; bias[id] = { mat: -1.3 }; }
      else {
        first = female ? R.pick(FIRST_F) : R.pick(FIRST_M);
        // algunos hermanos comparten apoderado
        const sib = siblings.length && R.bool(.08) ? R.pick(siblings) : null;
        if (sib && !sib.used.includes(c.id)) { g = guardians[sib.g]; last1 = sib.l1; last2 = sib.l2; sib.used.push(c.id); }
        else { g = mkGuardian(last1); siblings.push({ g: g.id, l1: last1, l2: last2, used: [c.id] }); }
        const risk = R.bool(.1);
        ability[id] = risk ? 3.7 + R() * .6 : 4.6 + R() * 2;
        attRate[id] = risk ? .74 + R() * .1 : .86 + R() * .13;
        if (R.bool(.25)) bias[id] = { [R.pick(c.subjects)]: (R() - .5) * 2 };
      }
      g.children.push(id);
      students.push({
        id, firstName: first, lastName: last1, lastName2: last2, rut: rutFor(rutBase + ci * 1000 + R.int(0, 999) + k * 7),
        birth: ymd(new Date(birthYear, R.int(0, 11), R.int(1, 28))), gender: female ? 'F' : 'M', courseId: c.id, guardianId: g.id,
        status: 'activo', pie: R.bool(.08), enrolled: `${YEAR - R.int(0, c.grade + 1)}-03-01`, address: `${R.pick(['Los Aromos', 'Las Perdices', 'Grecia', 'Tobalaba', 'José Arrieta', 'Quilín'])} ${R.int(100, 9900)}, Peñalolén`, health: R.bool(.1) ? R.pick(['Asma leve', 'Alergia a frutos secos', 'Usa lentes ópticos']) : ''
      });
    }
  });
  users.push({ id: 'u-est', name: 'Martina Rojas', email: 'martina.rojas@alumnos.losaromos.cl', password: 'alumno123', role: 'estudiante', studentId: students.find(s => s.firstName === 'Martina' && s.lastName === 'Rojas').id, color: '#db2777', demo: true, active: true });
  users.push({ id: 'u-est2', name: 'Vicente Soto', email: 'vicente.soto@alumnos.losaromos.cl', password: 'alumno123', role: 'estudiante', studentId: students.find(s => s.courseId === '1m-a').id, color: '#2563eb', demo: false, active: true });

  // --- Cursos, asignación docente y horario ---
  const courses = COURSES.map(c => ({ id: c.id, name: c.name, level: c.level, grade: c.grade, room: c.room, headTeacherId: c.head, year: YEAR, capacity: 30, shift: 'Jornada completa' }));
  const teaching = [];
  COURSES.forEach(c => c.subjects.forEach(s => teaching.push({ id: `${c.id}|${s}`, courseId: c.id, subjectId: s, teacherId: teacherFor(c, s), createdAt: `${YEAR}-03` })));

  const schedule = [];
  const busy = {}; // teacher|day|block
  COURSES.forEach(c => {
    const pool = [];
    c.subjects.forEach(s => { const h = c.id === 'k-a' ? { len: 8, mat: 8, ing: 4, art: 4, efi: 3, mus: 3 }[s] : SUBJECTS.find(x => x.id === s).hours; for (let i = 0; i < h; i++) pool.push(s); });
    while (pool.length < 30) pool.push(pool.length % 2 ? 'len' : 'mat');
    pool.length = 30;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (let day = 0; day < 5; day++) for (let b = 0; b < BLOCKS.length; b++) {
      const usedToday = schedule.filter(x => x.courseId === c.id && x.day === day).map(x => x.subjectId);
      let idx = pool.findIndex(s => !busy[`${teacherFor(c, s)}|${day}|${b}`] && usedToday.filter(u => u === s).length < 2);
      if (idx < 0) idx = pool.findIndex(s => !busy[`${teacherFor(c, s)}|${day}|${b}`]);
      if (idx < 0) idx = 0;
      const s = pool.splice(idx, 1)[0], t = teacherFor(c, s);
      busy[`${t}|${day}|${b}`] = true;
      schedule.push({ id: `${c.id}|${day}|${b}`, courseId: c.id, day, block: b, subjectId: s, teacherId: t, createdAt: `${YEAR}-03` });
    }
  });

  // --- Libro de clases: últimos 15 días hábiles (sin hoy) ---
  const sessions = [];
  const lessonDays = [];
  for (let back = 1; lessonDays.length < 15 && back < 40; back++) { const x = new Date(NOW); x.setDate(x.getDate() - back); if (isWeekday(x)) lessonDays.unshift(ymd(x)); }
  const topicIdx = {};
  COURSES.forEach(c => {
    const kids = students.filter(s => s.courseId === c.id);
    lessonDays.forEach(day => {
      const absentToday = {};
      kids.forEach(s => { if (R() > attRate[s.id]) absentToday[s.id] = 'A'; else if (R() < .03) absentToday[s.id] = 'T'; });
      const di = dayIndex(day + 'T12:00');
      schedule.filter(x => x.courseId === c.id && x.day === di).forEach(bl => {
        const k = `${c.id}|${bl.subjectId}`; topicIdx[k] = (topicIdx[k] || 0) + 1;
        const list = TOPICS[bl.subjectId];
        const abs = {};
        Object.entries(absentToday).forEach(([sid, v]) => { abs[sid] = v === 'T' && bl.block > 0 ? undefined : v; if (!abs[sid]) delete abs[sid]; });
        sessions.push({ id: `${c.id}|${day}|${bl.block}`, courseId: c.id, subjectId: bl.subjectId, teacherId: bl.teacherId, date: day, block: bl.block, topic: list[(topicIdx[k] + c.grade) % list.length], abs, createdAt: day });
      });
    });
  });

  // --- Asistencia mensual histórica (marzo → mes anterior) ---
  const attendance = [];
  const curMonth = NOW.getMonth() + 1;
  for (let m = 3; m < curMonth; m++) {
    let days = 0; const last = new Date(YEAR, m, 0).getDate();
    for (let dd = 1; dd <= last; dd++) if (isWeekday(new Date(YEAR, m - 1, dd))) days++;
    if (m === 7) days = Math.round(days / 2); // vacaciones de invierno
    if (m === 9) days -= 3; // fiestas patrias
    students.forEach(s => {
      const absent = clamp(Math.round(days * (1 - attRate[s.id]) + (R() - .5) * 2), 0, days);
      attendance.push({ id: `${s.id}|${m}`, studentId: s.id, courseId: s.courseId, month: `${YEAR}-${String(m).padStart(2, '0')}`, days, absent, late: R.int(0, 2), createdAt: `${YEAR}-${m}` });
    });
  }

  // --- Evaluaciones y notas ---
  const evaluations = [];
  const S1 = [[3, 25], [4, 22], [5, 27], [6, 26]], S2 = [[8, 12], [9, 8], [10, 14], [11, 18]];
  const TYPES = ['Prueba', 'Control', 'Trabajo', 'Prueba'], WEIGHTS = [20, 25, 25, 30];
  const now = NOW.getTime();
  COURSES.forEach(c => c.subjects.forEach((s, si) => {
    [S1, S2].forEach((dates, semIdx) => dates.forEach(([m, day], i) => {
      let dt = new Date(YEAR, m - 1, Math.min(28, day + si + (c.grade % 3)));
      while (!isWeekday(dt)) dt.setDate(dt.getDate() + 1);
      const graded = dt.getTime() < now - 3 * 864e5;
      const scores = {};
      if (graded) students.filter(st => st.courseId === c.id).forEach(st => {
        const b = bias[st.id]?.[s] || 0;
        scores[st.id] = r1(clamp(ability[st.id] + b + (R() - .5) * 1.6 + (s === 'efi' || s === 'art' || s === 'mus' ? .5 : 0), 1, 7));
      });
      const type = s === 'efi' ? 'Evaluación práctica' : s === 'art' ? 'Trabajo' : TYPES[i];
      evaluations.push({
        id: `e-${c.id}-${s}-${semIdx + 1}-${i + 1}`, courseId: c.id, subjectId: s, teacherId: teacherFor(c, s), semester: semIdx + 1,
        name: `${type} ${i + 1}: ${TOPICS[s][(i + semIdx * 4) % TOPICS[s].length]}`, type, date: ymd(dt), weight: WEIGHTS[i],
        status: graded ? 'calificada' : dt.getTime() < now ? 'pendiente' : 'programada', scores, createdAt: `${YEAR}-03`
      });
    }));
  }));

  // --- Tareas ---
  const homework = [];
  const HW = { len: ['Lectura capítulos 1 al 5 y ficha', 'Escribir un cuento breve', 'Resumen de la noticia'], mat: ['Guía de ejercicios N° 6', 'Problemas de proporcionalidad', 'Ejercicios pág. 84-86'], his: ['Línea de tiempo siglo XIX', 'Investigación pueblos originarios'], cie: ['Informe de laboratorio', 'Maqueta de la célula'], ing: ['Worksheet unit 5', 'Write about your family'], art: ['Collage con materiales reciclados'], efi: ['Registro de actividad física semanal'], mus: ['Practicar escala en flauta'], tec: ['Prototipo en cartón'] };
  COURSES.forEach(c => {
    const kids = students.filter(s => s.courseId === c.id);
    [-18, -11, -6, -2, 3, 7, 12].forEach((off, i) => {
      const s = c.subjects[(i * 3 + c.grade) % c.subjects.length];
      const due = new Date(NOW); due.setDate(due.getDate() + off); while (!isWeekday(due)) due.setDate(due.getDate() + 1);
      const assigned = new Date(due); assigned.setDate(assigned.getDate() - 7);
      const subs = {};
      kids.forEach(k => {
        const p = off < 0 ? (ability[k.id] > 4.2 ? .92 : .6) : off < 5 ? .3 : .05;
        if (R() < p) {
          const late = off < 0 && R() < .12;
          const at = new Date(due); at.setDate(at.getDate() - (late ? -1 : R.int(0, 3))); at.setHours(R.int(15, 22), R.int(0, 59));
          const sub = { at: at.toISOString(), status: late ? 'atrasada' : 'entregada', note: R.bool(.3) ? 'Adjunto mi trabajo, gracias.' : '', file: `${HW[s][0].split(' ')[0].toLowerCase()}_${k.firstName.toLowerCase()}.pdf` };
          if (off < -5 && R.bool(.8)) { sub.grade = r1(clamp(ability[k.id] + (R() - .3), 2, 7)); sub.feedback = sub.grade >= 6 ? '¡Muy buen trabajo!' : sub.grade >= 4 ? 'Bien, revisa los detalles marcados.' : 'Debes reforzar los contenidos.'; }
          if (at.getTime() <= now) subs[k.id] = sub;
        }
      });
      homework.push({ id: `hw-${c.id}-${i}`, courseId: c.id, subjectId: s, teacherId: teacherFor(c, s), title: R.pick(HW[s]), description: 'Revisa las instrucciones entregadas en clase. Puedes subir tu trabajo en PDF o foto legible.', assigned: ymd(assigned), due: ymd(due), points: 7, submissions: subs, createdAt: assigned.toISOString() });
    });
  });

  // --- Anotaciones ---
  const annotations = [];
  for (let i = 0; i < 140; i++) {
    const st = R.pick(students), c = COURSES.find(x => x.id === st.courseId), s = R.pick(c.subjects);
    const roll = R();
    const type = ability[st.id] < 4.3 ? (roll < .65 ? 'negativa' : roll < .85 ? 'observacion' : 'positiva') : (roll < .6 ? 'positiva' : roll < .85 ? 'negativa' : 'observacion');
    const text = type === 'positiva' ? R.pick(ANN_POS) : type === 'negativa' ? R.pick(ANN_NEG) : R.pick(ANN_OBS);
    const back = R.int(1, 200);
    const dt = new Date(NOW); dt.setDate(dt.getDate() - back);
    if (dt.getMonth() < 2 && dt.getFullYear() === YEAR) continue;
    annotations.push({ studentId: st.id, courseId: st.courseId, subjectId: s, teacherId: teacherFor(c, s), type, text, date: ymd(dt), createdAt: dt.toISOString(), seenByGuardian: back > 10 || R.bool(.4) });
  }
  const martina = students.find(s => s.firstName === 'Martina' && s.lastName === 'Rojas');
  const benja = students.find(s => s.firstName === 'Benjamín' && s.lastName === 'Rojas');
  annotations.unshift(
    { studentId: martina.id, courseId: '8b-a', subjectId: 'mat', teacherId: 't1', type: 'positiva', text: 'Obtuvo el mejor resultado del curso en el ensayo de Matemática.', date: ymd(daysAgo(3)), createdAt: daysAgo(3), seenByGuardian: false },
    { studentId: benja.id, courseId: '4b-a', subjectId: 'mat', teacherId: 't8', type: 'negativa', text: 'No entrega la guía de ejercicios N° 6.', date: ymd(daysAgo(5)), createdAt: daysAgo(5), seenByGuardian: false }
  );

  // --- Mensajería profesor ↔ apoderado ---
  const threads = [];
  const t8b = students.filter(s => s.courseId === '8b-a');
  threads.push({ id: 'th-1', subject: 'Rendimiento de Benjamín en Matemática', teacherId: 't8', guardianId: 'g-demo', studentId: benja.id, lastAt: daysAgo(2, 17), unread: ['g-demo'],
    messages: [{ from: 't8', text: 'Estimada apoderada, le escribo porque Benjamín ha tenido dificultades en las últimas evaluaciones de Matemática. Le sugiero reforzar en casa la guía N° 6.', at: daysAgo(4, 9) }, { from: 'g-demo', text: 'Gracias profesor, vamos a trabajar con él durante la semana. ¿Hay material de apoyo adicional?', at: daysAgo(3, 20) }, { from: 't8', text: 'Sí, dejé una guía con ejercicios resueltos en la sección de tareas. Cualquier duda me escribe.', at: daysAgo(2, 17) }] });
  threads.push({ id: 'th-2', subject: 'Salida pedagógica 8° Básico', teacherId: 't1', guardianId: 'g-demo', studentId: martina.id, lastAt: daysAgo(6, 11), unread: [],
    messages: [{ from: 't1', text: 'Junto con saludar, recuerdo que el viernes es la salida al Museo Interactivo Mirador. Deben enviar la autorización firmada.', at: daysAgo(7, 10) }, { from: 'g-demo', text: 'Perfecto, Martina la lleva mañana firmada. ¡Gracias!', at: daysAgo(6, 11) }] });
  t8b.slice(1, 7).forEach((s, i) => {
    const g = guardians[s.guardianId];
    threads.push({ id: `th-${i + 3}`, subject: R.pick(['Justificación de inasistencia', 'Consulta por evaluación', 'Reunión de apoderados', 'Atraso en entrega de trabajo', 'Felicitaciones']), teacherId: 't1', guardianId: g.id, studentId: s.id, lastAt: daysAgo(i * 3 + 1, 15), unread: i % 2 ? ['t1'] : [],
      messages: [{ from: g.id, text: `Profesora, le escribo por ${s.firstName}. ${R.pick(['Ayer no pudo asistir por un control médico, adjunto certificado.', '¿Podría indicarme qué contenidos entran en la próxima prueba?', 'Quisiera saber cómo ha estado su comportamiento en clases.'])}`, at: daysAgo(i * 3 + 2, 21) }, ...(i % 2 ? [] : [{ from: 't1', text: 'Muchas gracias por avisar. Quedo atenta y le comento cualquier novedad.', at: daysAgo(i * 3 + 1, 15) }])] });
  });

  // --- Comunicados ---
  const allG = users.filter(u => u.role === 'apoderado');
  const COMMS = [
    ['Reunión de apoderados de noviembre', 'Estimadas familias: les invitamos a la reunión de apoderados que se realizará el martes a las 19:00 hrs. en las salas de cada curso. Se entregará el informe parcial de notas.', 'todos', null, 2, true],
    ['Salida pedagógica al Museo Interactivo Mirador', 'El 8° Básico A visitará el MIM. Salida 8:30, regreso 14:00. Enviar autorización firmada y colación.', 'curso', '8b-a', 8, true],
    ['Campaña solidaria de invierno', 'Durante este mes recolectaremos ropa de abrigo y alimentos no perecibles para la Fundación Techo Abierto. ¡Gracias por su generosidad!', 'todos', null, 120, false],
    ['Calendario de ensayos PAES', 'Se informa a los apoderados de IV Medio el calendario de ensayos PAES de Lenguaje, Matemática e Historia para el segundo semestre.', 'curso', '4m-a', 40, true],
    ['Vacunación escolar', 'El CESFAM Peñalolén realizará la vacunación escolar para 1° y 8° Básico. Si no desea que su pupilo(a) sea vacunado, debe enviar el formulario de rechazo.', 'nivel', 'basica', 25, true],
    ['Semana de la Chilenidad', 'Celebraremos Fiestas Patrias con muestra folclórica, cueca y juegos típicos. Los estudiantes pueden venir con vestimenta tradicional.', 'todos', null, 45, false],
    ['Cambio de horario de salida', 'Debido a jornada de perfeccionamiento docente, el viernes la salida será a las 12:30 hrs.', 'todos', null, 15, true],
    ['Talleres extraprogramáticos segundo semestre', 'Ya están abiertas las inscripciones para robótica, coro, básquetbol, ajedrez y teatro. Cupos limitados.', 'todos', null, 85, false],
    ['Período de adaptación Kínder', 'Recordamos a las familias de Kínder los horarios de ingreso diferido y la lista de materiales.', 'curso', 'k-a', 220, false]
  ];
  const communications = COMMS.map(([title, body, audience, target, back, ack], i) => {
    const reads = {};
    allG.forEach(g => { if (g.id !== 'g-demo' && R() < (back > 20 ? .85 : .55)) reads[g.id] = daysAgo(Math.max(0, back - R.int(0, 3))); });
    if (back > 5) reads['g-demo'] = daysAgo(back - 1);
    return { id: `com-${i + 1}`, title, body, audience, target, authorId: i % 3 ? 'u-utp' : 'u-admin', at: daysAgo(back, 9), requireAck: ack, reads, status: 'publicado', createdAt: daysAgo(back, 9) };
  });
  communications.push({ id: 'com-draft', title: 'Licenciatura IV Medio (borrador)', body: 'Información sobre la ceremonia de licenciatura, entradas e indicaciones.', audience: 'curso', target: '4m-a', authorId: 'u-admin', at: daysAgo(0), requireAck: false, reads: {}, status: 'borrador' });

  // --- Entrevistas ---
  const meetings = [
    { guardianId: 'g-demo', teacherId: 't8', studentId: benja.id, reason: 'Conversar sobre rendimiento en Matemática', preferred: ymd(daysAgo(-3)), slot: '15:30', status: 'confirmada', reply: 'Confirmado, la espero en sala de profesores.', createdAt: daysAgo(4) },
    { guardianId: 'g-demo', teacherId: 't1', studentId: martina.id, reason: 'Orientación vocacional y electivos de I Medio', preferred: ymd(daysAgo(40)), slot: '16:00', status: 'realizada', reply: 'Gracias por asistir.', createdAt: daysAgo(48) }
  ];
  t8b.slice(2, 6).forEach((s, i) => meetings.push({ guardianId: s.guardianId, teacherId: 't1', studentId: s.id, reason: R.pick(['Revisar notas del semestre', 'Conducta en clases', 'Seguimiento de asistencia', 'Apoyo PIE']), preferred: ymd(daysAgo(-(i + 2))), slot: R.pick(['15:00', '15:30', '16:00', '16:30']), status: i < 2 ? 'solicitada' : 'confirmada', reply: i < 2 ? '' : 'Nos vemos en la fecha indicada.', createdAt: daysAgo(i + 1) }));

  // --- Pagos (mensualidad) ---
  const payments = [];
  const FEE = 72000;
  students.forEach(s => {
    const beca = R.bool(.12) ? .5 : 0;
    const moroso = R.bool(.08);
    for (let m = 3; m <= 12; m++) {
      const due = new Date(YEAR, m - 1, 5);
      let status = 'futuro', paidAt = null, method = null;
      if (due.getTime() < now) {
        const late = (moroso && m >= curMonth - 2) || R.bool(.02);
        if (late) status = 'vencido';
        else { status = 'pagado'; const p = new Date(due); p.setDate(R.int(1, 9)); paidAt = p.toISOString(); method = R.pick(['Webpay', 'Transferencia', 'PAC', 'Webpay']); }
      } else if (m === curMonth || m === curMonth + 1 && NOW.getDate() > 25) status = R.bool(.35) ? 'pagado' : 'pendiente';
      if (status === 'pagado' && !paidAt) { paidAt = daysAgo(R.int(0, 4)); method = 'Webpay'; }
      const row = { id: `p${s.id}${m}`, studentId: s.id, guardianId: s.guardianId, month: `${YEAR}-${String(m).padStart(2, '0')}`, amount: Math.round(FEE * (1 - beca)), due: ymd(due), status, createdAt: ymd(due) };
      if (beca) row.beca = true;
      if (paidAt) { row.paidAt = paidAt.slice(0, 16); row.method = method; }
      payments.push(row);
    }
  });
  // la familia demo: hijos al día salvo el mes en curso
  payments.filter(p => p.guardianId === 'g-demo').forEach(p => { if (p.status === 'vencido') { p.status = 'pagado'; p.paidAt = iso(p.due); p.method = 'PAC'; } });

  // --- Admisión ---
  const applications = [];
  const STAT_W = [['recibida', 9], ['revision', 9], ['entrevista', 7], ['aceptada', 8], ['espera', 4], ['rechazada', 3], ['matriculada', 4]];
  const pickStatus = () => { let t = R() * STAT_W.reduce((a, b) => a + b[1], 0); for (const [s, w] of STAT_W) { if ((t -= w) < 0) return s; } return 'recibida'; };
  const FLOW = ['recibida', 'revision', 'entrevista', 'aceptada', 'matriculada'];
  for (let i = 0; i < 44; i++) {
    const female = R.bool(), first = female ? R.pick(FIRST_F) : R.pick(FIRST_M), l1 = R.pick(LAST), l2 = R.pick(LAST);
    const grade = R.pick(['Pre-kínder', 'Pre-kínder', 'Kínder', 'Kínder', '1° Básico', '1° Básico', '3° Básico', '5° Básico', '7° Básico', 'I Medio', 'I Medio', 'III Medio']);
    const status = pickStatus();
    const back = R.int(2, 120);
    const created = new Date(NOW); created.setDate(created.getDate() - back);
    const history = [{ status: 'recibida', at: created.toISOString(), note: 'Postulación recibida desde el sitio web.' }];
    const path = status === 'espera' || status === 'rechazada' ? ['revision', 'entrevista', status] : FLOW.slice(1, FLOW.indexOf(status) + 1);
    path.forEach((st, k) => { const at = new Date(created); at.setDate(at.getDate() + Math.round(back * (k + 1) / (path.length + 1))); history.push({ status: st, at: at.toISOString(), note: { revision: 'Documentación completa, en evaluación.', entrevista: 'Entrevista familiar agendada.', aceptada: 'Felicitaciones, su postulación fue aceptada.', espera: 'Quedó en lista de espera por falta de vacantes.', rechazada: 'No fue posible asignar vacante.', matriculada: 'Matrícula formalizada.' }[st] }); });
    const gName = `${R.pick(['Carolina', 'Felipe', 'Paula', 'Marcelo', 'Javiera', 'Ignacio', 'Camila'])} ${l1}`;
    applications.push({
      code: `ADM-${YEAR + 1}-${String(i + 101).padStart(4, '0')}`, studentName: `${first} ${l1} ${l2}`, rut: rutFor(R.int(25000000, 27900000)), birth: ymd(new Date(YEAR - 4 - GRADES_IDX(grade), R.int(0, 11), R.int(1, 28))),
      grade, guardianName: gName, email: `${gName.split(' ')[0].toLowerCase()}.${l1.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@correo.cl`, phone: `+56 9 ${R.int(5000, 9999)} ${R.int(1000, 9999)}`,
      prevSchool: grade.includes('kínder') || grade === 'Pre-kínder' ? R.pick(['Jardín Los Peques', 'Jardín Semillita', '—']) : R.pick(['Colegio San Esteban', 'Escuela Valle Hermoso', 'Colegio Monte Verde', 'Liceo Antupirén']),
      siblings: R.bool(.2), reason: R.pick(['Cercanía al domicilio', 'Proyecto educativo', 'Recomendación de otras familias', 'Talleres y deportes']),
      status, history, interview: status === 'entrevista' ? iso(daysAgo(-R.int(1, 10)), R.int(9, 16)) : null, score: ['recibida'].includes(status) ? null : R.int(55, 98), createdAt: created.toISOString()
    });
  }
  applications.push({ code: `ADM-${YEAR + 1}-0042`, studentName: 'Tomás Pérez Lagos', rut: '26.123.456-0', birth: `${YEAR - 6}-05-14`, grade: '1° Básico', guardianName: 'Carolina Lagos', email: 'carolina.lagos@correo.cl', phone: '+56 9 6543 2109', prevSchool: 'Jardín Semillita', siblings: false, reason: 'Proyecto educativo', status: 'entrevista', interview: iso(daysAgo(-4), 11), score: 82, createdAt: daysAgo(20), history: [{ status: 'recibida', at: daysAgo(20), note: 'Postulación recibida desde el sitio web.' }, { status: 'revision', at: daysAgo(14), note: 'Documentación completa, en evaluación.' }, { status: 'entrevista', at: daysAgo(6), note: 'Entrevista familiar agendada.' }] });

  // --- Noticias y eventos ---
  const NEWS = [
    ['Nuestro equipo de robótica clasificó al nacional', 'Académico', 'Los estudiantes del taller de robótica obtuvieron el segundo lugar regional con su proyecto de riego inteligente para huertos escolares.', 5, true],
    ['Feria científica: 40 proyectos y mucha curiosidad', 'Académico', 'Desde Kínder a IV Medio, nuestros estudiantes presentaron investigaciones sobre agua, energía y biodiversidad del piedemonte andino.', 12, false],
    ['Campeonas comunales de básquetbol sub-14', 'Deportes', 'La selección femenina de básquetbol se coronó campeona del torneo comunal de Peñalolén tras una final de infarto.', 19, false],
    ['Inauguramos la nueva biblioteca CRA', 'Institucional', 'Con más de 6.000 títulos, rincón de lectura infantil y sala de estudio silenciosa, la biblioteca abre de 8:00 a 17:30 hrs.', 33, true],
    ['Semana de la Chilenidad llenó de color el patio', 'Comunidad', 'Cueca, juegos típicos, empanadas y una muestra folclórica por curso marcaron una celebración inolvidable.', 44, false],
    ['Resultados SIMCE: avanzamos en Lectura y Matemática', 'Institucional', 'Los resultados del último SIMCE muestran un alza sostenida en 4° Básico y II Medio, fruto del trabajo de todo el equipo docente.', 60, false],
    ['Coro del colegio se presentó en el Teatro Municipal', 'Cultura', 'El coro de estudiantes de 5° a 8° Básico participó en el Encuentro de Coros Escolares con un repertorio de música latinoamericana.', 75, false],
    ['Huerto escolar: cosechamos nuestras primeras lechugas', 'Comunidad', 'El proyecto de huerto liderado por 2° Básico ya da frutos y se integra a las clases de Ciencias Naturales.', 96, false],
    ['Admisión 2027: inicia el proceso de postulación', 'Institucional', 'Ya puedes postular en línea a Pre-kínder, Kínder y cursos con vacantes. Conoce el proceso y las fechas clave.', 1, false]
  ];
  const news = NEWS.map(([title, category, excerpt, back, featured], i) => ({
    id: `n-${i + 1}`, title, category, excerpt, featured, published: true, author: i % 2 ? 'Comunicaciones' : 'Dirección', date: ymd(daysAgo(back)), createdAt: daysAgo(back), views: R.int(80, 1400),
    body: `${excerpt}\n\nLa actividad contó con la participación de estudiantes, docentes y familias, reafirmando el compromiso del Colegio Los Aromos con una educación integral, cercana y con identidad.\n\n"Estamos muy orgullosos del esfuerzo y la creatividad de nuestra comunidad", comentó la directora Patricia Morales. Agradecemos a todas las personas que hicieron posible esta iniciativa.`
  }));
  news.push({ id: 'n-draft', title: 'Licenciatura IV Medio: fecha y detalles', category: 'Institucional', excerpt: 'Información de la ceremonia de licenciatura de la generación.', body: 'Borrador pendiente de aprobación.', featured: false, published: false, author: 'Dirección', date: ymd(NOW), createdAt: NOW.toISOString(), views: 0 });

  const EVENTS = [
    [d(3, 4), 'Inicio del año escolar', 'academico'], [d(3, 26), 'Primera reunión de apoderados', 'reunion'], [d(4, 18), 'Feriado Semana Santa', 'feriado'],
    [d(5, 21), 'Día de las Glorias Navales', 'feriado'], [d(6, 20), 'Muestra de talleres', 'extra'], [d(7, 7), 'Inicio vacaciones de invierno', 'feriado'],
    [d(7, 22), 'Inicio segundo semestre', 'academico'], [d(8, 22), 'Feria científica', 'academico'], [d(9, 12), 'Semana de la Chilenidad', 'extra'],
    [d(9, 18), 'Fiestas Patrias', 'feriado'], [d(10, 16), 'Día del Profesor', 'extra'], [d(10, 23), 'Ensayo PAES IV Medio', 'academico'],
    [d(11, 4), 'Reunión de apoderados', 'reunion'], [d(11, 7), 'Jornada de puertas abiertas Admisión', 'extra'], [d(11, 13), 'Aniversario del colegio', 'extra'],
    [d(11, 20), 'Ensayo general Licenciatura', 'academico'], [d(11, 27), 'Licenciatura IV Medio', 'academico'], [d(12, 4), 'Muestra de fin de año', 'extra'],
    [d(12, 11), 'Último día de clases', 'academico'], [d(12, 16), 'Entrega de informes finales', 'reunion'], [d(10, 31), 'Día de las Iglesias Evangélicas', 'feriado'],
    [d(11, 1), 'Día de Todos los Santos', 'feriado'], [d(11, 10), 'Olimpiadas deportivas', 'extra'], [d(11, 18), 'Cierre de notas segundo semestre', 'academico']
  ];
  const events = EVENTS.map(([date, title, type], i) => ({ id: `ev-${i + 1}`, date, title, type, place: type === 'reunion' ? 'Salas de cada curso' : type === 'feriado' ? '' : R.pick(['Gimnasio', 'Patio central', 'Auditorio', 'Biblioteca CRA']), description: type === 'feriado' ? 'Sin clases.' : 'Actividad abierta a la comunidad escolar.', public: true }));

  const contacts = [
    ['Gabriela Ortiz', 'gabriela.ortiz@correo.cl', 'Consulta por vacantes', '¿Quedan cupos para 3° Básico el próximo año?', 1, 'nuevo'],
    ['Héctor Pino', 'hpino@correo.cl', 'Talleres deportivos', 'Quisiera saber si los talleres tienen costo adicional.', 3, 'nuevo'],
    ['Mónica Leiva', 'monica.leiva@correo.cl', 'Certificado de alumno regular', 'Necesito un certificado para la caja de compensación.', 6, 'respondido'],
    ['Juan Carlos Díaz', 'jcdiaz@correo.cl', 'Transporte escolar', '¿Tienen convenio con algún furgón escolar?', 9, 'respondido'],
    ['Sandra Vidal', 'svidal@correo.cl', 'Visita al colegio', 'Me gustaría agendar una visita guiada antes de postular.', 2, 'nuevo']
  ].map(([name, email, subject, message, back, status]) => ({ name, email, subject, message, status, createdAt: daysAgo(back, 12) }));

  const site = {
    name: 'Colegio Los Aromos', platform: 'Aula360', city: 'Peñalolén, Santiago',
    heroTitle: 'Aprender con raíces, crecer con alas',
    heroSubtitle: 'Colegio particular subvencionado, mixto y laico. Desde Pre-kínder a IV Medio formamos personas curiosas, respetuosas y comprometidas con su entorno, a los pies de la cordillera.',
    heroCta: `Postula ${YEAR + 1}`, announcement: `Admisión ${YEAR + 1} abierta · Jornada de puertas abiertas el ${new Date(YEAR, 10, 7).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}`,
    mission: 'Formar estudiantes integrales, con pensamiento crítico y sensibilidad social, a través de una educación de calidad que integra lo académico, lo artístico, lo deportivo y el cuidado del medio ambiente.',
    vision: 'Ser una comunidad educativa reconocida por su cercanía, innovación pedagógica y por formar ciudadanos que transforman positivamente su entorno.',
    values: [
      { title: 'Respeto', text: 'Valoramos la diversidad y el buen trato en cada espacio del colegio.' },
      { title: 'Curiosidad', text: 'Aprendemos preguntando, investigando y creando con otros.' },
      { title: 'Responsabilidad', text: 'Cumplimos compromisos con nosotros mismos y con la comunidad.' },
      { title: 'Cuidado del entorno', text: 'Huerto, reciclaje y conciencia ambiental en todos los niveles.' }
    ],
    address: 'Av. Los Aromos 1450, Peñalolén, Santiago', phone: '+56 2 2794 5100', email: 'contacto@losaromos.cl', hours: 'Lunes a viernes de 7:45 a 17:30 hrs.',
    admissionsOpen: true, admissionYear: YEAR + 1, monthlyFee: FEE, enrollmentFee: 3500,
    vacancies: { 'Pre-kínder': 36, 'Kínder': 8, '1° Básico': 6, '2° Básico': 2, '3° Básico': 3, '4° Básico': 0, '5° Básico': 2, '6° Básico': 1, '7° Básico': 4, '8° Básico': 0, 'I Medio': 10, 'II Medio': 1, 'III Medio': 3 },
    founded: 1988, showStats: true
  };

  return { users, students, courses, subjects: SUBJECTS.map(s => ({ ...s, active: true })), teaching, schedule, sessions, attendance, evaluations, homework, annotations, threads, communications, meetings, payments, applications, news, events, contacts, site };
}

function GRADES_IDX(g) {
  return { 'Pre-kínder': 0, 'Kínder': 1, '1° Básico': 2, '2° Básico': 3, '3° Básico': 4, '4° Básico': 5, '5° Básico': 6, '6° Básico': 7, '7° Básico': 8, '8° Básico': 9, 'I Medio': 10, 'II Medio': 11, 'III Medio': 12 }[g] ?? 2;
}
