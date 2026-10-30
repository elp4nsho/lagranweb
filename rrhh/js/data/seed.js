// Semilla de Grupo Cordillera: colaboradores, historial de remuneraciones, solicitudes,
// marcajes, vacantes y candidatos, evaluaciones y encuestas eNPS.
import { rng } from '../../../assets/core/db.js';
import { today, addDays, dkey, parseKey, fromMin } from '../shared/dates.js';
import { fmtRut } from '../shared/util.js';
import { AFP, ISAPRES, calcPayslip, slipRecord } from '../shared/payroll.js';
import { isWorkday, businessDays } from '../shared/vacation.js';

const M = ['Mateo', 'Benjamín', 'Tomás', 'Joaquín', 'Lucas', 'Martín', 'Diego', 'Sebastián', 'Nicolás', 'Felipe', 'Gabriel', 'Ignacio', 'Vicente', 'Agustín', 'Cristóbal', 'Andrés', 'Rodrigo', 'Pablo', 'Javier', 'Emilio', 'Gonzalo', 'Matías', 'Simón', 'Daniel', 'Raúl', 'Hugo', 'Esteban', 'Bruno', 'Álvaro', 'Francisco'];
const F = ['Sofía', 'Valentina', 'Isidora', 'Emilia', 'Florencia', 'Catalina', 'Antonia', 'Martina', 'Josefa', 'Camila', 'Fernanda', 'Javiera', 'Constanza', 'Daniela', 'Paula', 'Lucía', 'Renata', 'Amanda', 'Trinidad', 'Agustina', 'Carolina', 'Elena', 'Victoria', 'Rocío', 'Ana', 'Julieta', 'Macarena', 'Gabriela', 'Beatriz', 'Isabel'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa', 'Riquelme', 'Miranda', 'Bravo', 'Vera', 'Molina', 'Vega', 'Campos', 'Sandoval', 'Orellana', 'Cárdenas', 'Olivares', 'Alarcón', 'Gallardo', 'Ortiz', 'Garrido', 'Salazar', 'Guzmán', 'Saavedra', 'Navarro', 'Aguilera', 'Parra', 'Romero'];
const COMUNAS = ['Providencia', 'Ñuñoa', 'Las Condes', 'Santiago', 'Maipú', 'La Florida', 'Vitacura', 'Puente Alto', 'San Miguel', 'Macul', 'Peñalolén', 'La Reina'];
const LOCS = ['Santiago · Casa matriz', 'Santiago · Casa matriz', 'Santiago · Casa matriz', 'Antofagasta', 'Concepción'];
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

const DEPTS = [
  { id: 'd-ger', name: 'Gerencia General', color: '#475569', cc: 'CC-100', head: ['Gerente General', 4800000], roles: [['Asistente de Gerencia', 1250000]], n: 1 },
  { id: 'd-fin', name: 'Finanzas', color: '#4d7c0f', cc: 'CC-200', head: ['Gerente de Finanzas', 3900000], roles: [['Contador/a', 1650000], ['Analista Financiero/a', 1500000], ['Tesorero/a', 1450000]], n: 5 },
  { id: 'd-per', name: 'Personas', color: '#b45309', cc: 'CC-300', head: ['Gerente de Personas', 3700000], roles: [['Reclutador/a', 1350000], ['Analista de Remuneraciones', 1400000], ['People Partner', 1700000]], n: 4 },
  { id: 'd-tec', name: 'Tecnología', color: '#4f46e5', cc: 'CC-400', head: ['Gerente de Tecnología', 4300000], roles: [['Desarrollador/a Full-stack', 2100000], ['Ingeniero/a DevOps', 2300000], ['Analista QA', 1500000], ['Diseñador/a UX', 1800000]], n: 9 },
  { id: 'd-ope', name: 'Operaciones', color: '#ea580c', cc: 'CC-500', head: ['Gerente de Operaciones', 3800000], roles: [['Jefe/a de Turno', 1500000], ['Supervisor/a de Planta', 1250000], ['Operador/a', 750000], ['Analista de Procesos', 1300000]], n: 12 },
  { id: 'd-com', name: 'Comercial', color: '#dc2626', cc: 'CC-600', head: ['Gerente Comercial', 4000000], roles: [['Ejecutivo/a de Ventas', 1100000], ['Key Account Manager', 1900000], ['Analista Comercial', 1300000]], n: 8 },
  { id: 'd-mkt', name: 'Marketing', color: '#db2777', cc: 'CC-700', head: ['Gerente de Marketing', 3300000], roles: [['Diseñador/a Gráfico/a', 1200000], ['Community Manager', 1050000], ['Analista de Marketing', 1350000]], n: 4 },
  { id: 'd-log', name: 'Logística', color: '#0284c7', cc: 'CC-800', head: ['Jefe/a de Logística', 2600000], roles: [['Coordinador/a de Bodega', 1100000], ['Despachador/a', 720000], ['Planificador/a', 1250000]], n: 7 },
  { id: 'd-leg', name: 'Legal y Cumplimiento', color: '#7c3aed', cc: 'CC-900', head: ['Fiscal', 3600000], roles: [['Abogado/a', 2200000], ['Analista de Cumplimiento', 1450000]], n: 2 }
];
const gform = (s, g) => s.replace(/Jefe\/a/g, g === 'f' ? 'Jefa' : 'Jefe').replace(/(\w+)o\/a\b/g, (m, w) => g === 'f' ? w + 'a' : w + 'o').replace(/\/a\b/g, g === 'f' ? 'a' : '').replace(/(\w+)\/a/g, '$1');
const COMPETENCIES = ['Orientación a resultados', 'Trabajo en equipo', 'Comunicación', 'Innovación y mejora', 'Compromiso y seguridad'];

export function seed() {
  const r = rng(2026);
  const T = today(), Y = +T.slice(0, 4);
  const used = new Set();
  const employees = [];
  let seq = 0;
  function mk(dept, [pos, sal], managerId, level, opts = {}) {
    let g, first, last, last2, key;
    do { g = r() < .5 ? 'm' : 'f'; first = r.pick(g === 'm' ? M : F); last = r.pick(LAST); last2 = r.pick(LAST); key = first + last; } while (used.has(key));
    used.add(key);
    seq++;
    const hire = opts.hire || addDays(T, -r.int(40, 365 * (level <= 1 ? 12 : 7)));
    const birthY = Y - r.int(23, 58);
    const isapre = r() < .45;
    const contract = opts.contract || (level >= 3 && r() < .14 ? 'Plazo fijo' : 'Indefinido');
    const e = {
      id: `e${seq}`, rut: fmtRut(r.int(9000000, 22000000)), first, last: `${last} ${last2}`, name: `${first} ${last}`, gender: g,
      birth: `${birthY}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`,
      email: `${slug(first)}.${slug(last)}@grupocordillera.demo`, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`,
      address: `Calle ${r.pick(LAST)} ${r.int(100, 4999)}`, comuna: r.pick(COMUNAS), location: level <= 1 ? LOCS[0] : r.pick(LOCS),
      deptId: dept.id, position: gform(pos, g), managerId, level, hireDate: hire, contractType: contract,
      contractEnd: contract === 'Plazo fijo' ? addDays(hire, 365) : null,
      salary: Math.round(sal * (0.88 + r() * 0.3) / 1000) * 1000, afp: r.pick(Object.keys(AFP)), health: isapre ? r.pick(ISAPRES.slice(1)) : 'Fonasa', healthUF: isapre ? Math.round((2.2 + r() * 3.5) * 100) / 100 : 0,
      status: 'activo', exitDate: null, exitReason: '', jornada: '42 horas', color: dept.color, vacCarry: r.int(0, 9), priorYears: r.int(0, 8),
      emergency: `${r.pick(r() < .5 ? M : F)} ${r.pick(LAST)} · +56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, bank: `${r.pick(['Banco Austral', 'Banco del Pacífico', 'BancoEstado Demo'])} · Cta. vista`, ...opts.extra
    };
    employees.push(e);
    return e;
  }
  const departments = [];
  const ceo = mk(DEPTS[0], DEPTS[0].head, null, 0, { hire: addDays(T, -365 * 9) });
  departments.push({ id: DEPTS[0].id, name: DEPTS[0].name, headId: ceo.id, parentId: null, color: DEPTS[0].color, costCenter: DEPTS[0].cc });
  for (let i = 0; i < DEPTS[0].n; i++) mk(DEPTS[0], DEPTS[0].roles[0], ceo.id, 2);
  DEPTS.slice(1).forEach(d => {
    const head = mk(d, d.head, ceo.id, 1);
    departments.push({ id: d.id, name: d.name, headId: head.id, parentId: DEPTS[0].id, color: d.color, costCenter: d.cc });
    for (let i = 0; i < d.n; i++) mk(d, d.roles[i % d.roles.length], head.id, i < d.roles.length ? 2 : 3);
  });
  // Egresos de los últimos 12 meses (para rotación) y una persona con licencia.
  const exitable = employees.filter(e => e.level >= 2);
  const REASONS = ['Renuncia voluntaria', 'Renuncia voluntaria', 'Término de plazo fijo', 'Necesidades de la empresa', 'Mutuo acuerdo'];
  for (let i = 0; i < 9; i++) { const e = exitable.splice(Math.floor(r() * exitable.length), 1)[0]; e.status = 'desvinculado'; e.exitDate = addDays(T, -r.int(10, 360)); e.exitReason = r.pick(REASONS); if (e.hireDate > e.exitDate) e.hireDate = addDays(e.exitDate, -r.int(200, 900)); }
  const onLeave = exitable.splice(3, 1)[0]; onLeave.status = 'licencia';
  // Nuevos ingresos recientes (para onboarding).
  const recent = [mk(DEPTS[3], DEPTS[3].roles[0], employees.find(e => e.deptId === 'd-tec' && e.level === 1).id, 3, { hire: addDays(T, -6) }), mk(DEPTS[5], DEPTS[5].roles[0], employees.find(e => e.deptId === 'd-com' && e.level === 1).id, 3, { hire: addDays(T, -18) }), mk(DEPTS[4], DEPTS[4].roles[2], employees.find(e => e.deptId === 'd-ope' && e.level === 1).id, 3, { hire: addDays(T, 5), contract: 'Plazo fijo' })];

  const active = employees.filter(e => e.status !== 'desvinculado');
  const tecHead = employees.find(e => e.deptId === 'd-tec' && e.level === 1);
  const tecEmp = employees.find(e => e.deptId === 'd-tec' && e.managerId === tecHead.id && e.status === 'activo' && e.hireDate < addDays(T, -400));
  const perHead = employees.find(e => e.deptId === 'd-per' && e.level === 1);
  const recruiter = employees.find(e => e.deptId === 'd-per' && /Reclutador/.test(e.position));
  [tecHead, tecEmp, perHead, recruiter].forEach(e => { e.status = 'activo'; e.vacCarry = 10; });

  // Remuneraciones: últimos 6 meses cerrados.
  const payslips = [], payrollRuns = [];
  for (let m = 6; m >= 1; m--) {
    const d = parseKey(T); d.setDate(1); d.setMonth(d.getMonth() - m);
    const period = dkey(d).slice(0, 7);
    let total = 0, cost = 0, n = 0;
    employees.forEach(e => {
      if (e.hireDate > `${period}-28` || (e.exitDate && e.exitDate < `${period}-01`)) return;
      const ex = { horasExtra: e.deptId === 'd-ope' || e.deptId === 'd-log' ? r.int(0, 14) : r() < .15 ? r.int(1, 6) : 0, bonos: e.deptId === 'd-com' ? Math.round(r.int(0, 450) * 1000) : r() < .1 ? 100000 : 0, otrosDesc: r() < .12 ? r.int(10, 60) * 1000 : 0 };
      const ps = calcPayslip(e, period, ex);
      payslips.push(slipRecord(e, period, ex, `${period}-28T18:00:00.000Z`));
      total += ps.liquido; cost += ps.costoEmpresa; n++;
    });
    payrollRuns.push({ period, status: 'pagada', count: n, totalLiquido: total, costoTotal: cost, runAt: `${period}-27T16:00:00.000Z`, by: 'Sistema' });
  }

  // Solicitudes de vacaciones y permisos.
  const requests = [];
  const types = ['vacaciones', 'vacaciones', 'vacaciones', 'administrativo', 'licencia', 'sin_goce', 'vacaciones', 'nacimiento'];
  active.forEach(e => {
    const n = r.int(0, 3);
    for (let i = 0; i < n; i++) {
      const type = r.pick(types);
      let from = addDays(T, -r.int(5, 200)); while (!isWorkday(from)) from = addDays(from, 1);
      const len = type === 'vacaciones' ? r.int(2, 9) : type === 'licencia' ? r.int(2, 6) : type === 'nacimiento' ? 4 : 0;
      const to = addDays(from, len);
      if (from < e.hireDate) continue;
      requests.push({ employeeId: e.id, type, from, to, days: type === 'licencia' ? len + 1 : businessDays(from, to), reason: type === 'vacaciones' ? r.pick(['Viaje familiar', 'Descanso', 'Vacaciones de invierno', 'Trámites personales']) : type === 'licencia' ? 'Licencia médica electrónica' : 'Asunto personal', status: r() < .9 ? 'aprobada' : 'rechazada', approverId: e.managerId, decidedAt: new Date(parseKey(from).getTime() - 3 * 864e5).toISOString(), comment: '', createdAt: new Date(parseKey(from).getTime() - 8 * 864e5).toISOString(), doc: type === 'licencia' ? 'licencia.pdf' : null });
    }
  });
  // Pendientes para la jefatura demo (Tecnología) y otras.
  employees.filter(e => e.managerId === tecHead.id && e.status === 'activo').slice(0, 4).concat(active.filter(e => e.deptId === 'd-ope').slice(0, 3)).forEach((e, i) => {
    let from = addDays(T, 6 + i * 4); while (!isWorkday(from)) from = addDays(from, 1);
    const to = addDays(from, i % 2 ? 0 : r.int(3, 8)), type = i % 3 === 2 ? 'administrativo' : 'vacaciones';
    requests.push({ employeeId: e.id, type, from, to: type === 'administrativo' ? from : to, days: type === 'administrativo' ? 1 : businessDays(from, to), reason: type === 'vacaciones' ? 'Vacaciones con la familia' : 'Trámite personal', status: 'pendiente', approverId: e.managerId, createdAt: new Date(Date.now() - r.int(1, 4) * 864e5).toISOString(), comment: '' });
  });
  // Futuras aprobadas (calendario del equipo).
  active.slice(0, 22).forEach(e => { if (r() < .4) { let from = addDays(T, r.int(-3, 30)); while (!isWorkday(from)) from = addDays(from, 1); const to = addDays(from, r.int(1, 6)); requests.push({ employeeId: e.id, type: 'vacaciones', from, to, days: businessDays(from, to), reason: 'Vacaciones', status: 'aprobada', approverId: e.managerId, decidedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 12 * 864e5).toISOString(), comment: '' }); } });

  // Marcajes: últimos 15 días hábiles.
  const marks = [];
  let k = addDays(T, -1), days = 0;
  while (days < 15) {
    if (isWorkday(k)) {
      active.filter(e => e.hireDate <= k && e.status === 'activo').forEach(e => {
        if (r() < .04) return;
        const inM = 8 * 60 + 15 + Math.round((r() - .35) * 60), outM = inM + 9 * 60 + r.int(-20, 70);
        marks.push({ employeeId: e.id, date: k, in: fromMin(inM), out: fromMin(outM) });
      });
      days++;
    }
    k = addDays(k, -1);
  }

  // Documentos.
  const documents = [];
  active.forEach(e => {
    documents.push({ employeeId: e.id, name: `Contrato de trabajo · ${e.contractType}`, type: 'Contrato', date: e.hireDate, size: '214 KB', signed: true });
    if (r() < .5) documents.push({ employeeId: e.id, name: 'Anexo de contrato · reajuste de remuneración', type: 'Anexo', date: addDays(T, -r.int(30, 300)), size: '96 KB', signed: true });
    documents.push({ employeeId: e.id, name: 'Reglamento interno de orden, higiene y seguridad', type: 'Reglamento', date: e.hireDate, size: '1,2 MB', signed: r() < .9 });
  });

  // Vacantes y candidatos.
  const jobs = [
    { id: 'j1', title: 'Desarrollador/a Full-stack Senior', deptId: 'd-tec', location: 'Santiago', modality: 'Híbrido', type: 'Jornada completa', salaryMin: 2200000, salaryMax: 2900000, openings: 2, status: 'publicada', days: 12, desc: 'Buscamos a alguien que diseñe y construya nuestras plataformas internas y de clientes, con foco en calidad y buenas prácticas.', req: ['4+ años desarrollando aplicaciones web', 'JavaScript/TypeScript y una base de datos relacional', 'Experiencia con pruebas automatizadas', 'Deseable: nube (AWS/Azure)'], ben: ['Modalidad híbrida 3x2', 'Seguro complementario de salud', 'Presupuesto de capacitación'] },
    { id: 'j2', title: 'Analista de Remuneraciones', deptId: 'd-per', location: 'Santiago', modality: 'Presencial', type: 'Jornada completa', salaryMin: 1300000, salaryMax: 1600000, openings: 1, status: 'publicada', days: 20, desc: 'Serás responsable del proceso mensual de remuneraciones, finiquitos e imposiciones de más de 60 colaboradores.', req: ['Título técnico o profesional en RRHH, contabilidad o afín', '2+ años en remuneraciones', 'Manejo de Previred y legislación laboral'], ben: ['Seguro complementario', 'Aguinaldos fiestas patrias y navidad', 'Día libre de cumpleaños'] },
    { id: 'j3', title: 'Supervisor/a de Planta', deptId: 'd-ope', location: 'Antofagasta', modality: 'Presencial', type: 'Jornada completa · turnos', salaryMin: 1200000, salaryMax: 1500000, openings: 1, status: 'publicada', days: 5, desc: 'Liderarás un equipo de 10 operadores asegurando metas de producción, calidad y seguridad.', req: ['Experiencia liderando equipos operativos', 'Conocimiento de normas de seguridad', 'Disponibilidad para turnos 4x4'], ben: ['Bono de turno', 'Movilización de acercamiento', 'Casino'] },
    { id: 'j4', title: 'Ejecutivo/a Comercial', deptId: 'd-com', location: 'Concepción', modality: 'Híbrido', type: 'Jornada completa', salaryMin: 900000, salaryMax: 1300000, openings: 2, status: 'publicada', days: 9, desc: 'Gestionarás una cartera de clientes de la zona sur y abrirás nuevas oportunidades.', req: ['2+ años en venta consultiva B2B', 'Licencia de conducir clase B', 'Manejo de CRM'], ben: ['Comisiones sin tope', 'Auto de la empresa', 'Celular corporativo'] },
    { id: 'j5', title: 'Diseñador/a UX', deptId: 'd-tec', location: 'Santiago', modality: 'Remoto', type: 'Jornada completa', salaryMin: 1700000, salaryMax: 2200000, openings: 1, status: 'publicada', days: 30, desc: 'Diseñarás experiencias simples para nuestras apps, desde la investigación hasta el prototipo.', req: ['Portafolio con casos de UX', 'Figma y sistemas de diseño', 'Investigación con usuarios'], ben: ['100 % remoto', 'Equipo para trabajar en casa', 'Horario flexible'] },
    { id: 'j6', title: 'Práctica Profesional en Marketing', deptId: 'd-mkt', location: 'Santiago', modality: 'Híbrido', type: 'Práctica', salaryMin: 400000, salaryMax: 450000, openings: 2, status: 'publicada', days: 3, desc: 'Apoyarás campañas digitales, contenido para redes y análisis de resultados.', req: ['Estudiante de último año de Publicidad, Marketing o afín', 'Buena redacción', 'Manejo de redes sociales'], ben: ['Asignación de práctica', 'Posibilidad de contratación', 'Mentoría'] },
    { id: 'j7', title: 'Abogado/a Laboral', deptId: 'd-leg', location: 'Santiago', modality: 'Híbrido', type: 'Jornada completa', salaryMin: 2000000, salaryMax: 2600000, openings: 1, status: 'borrador', days: 0, desc: 'Asesoría laboral a las gerencias y gestión de causas.', req: ['3+ años en derecho laboral'], ben: ['Seguro complementario'] },
    { id: 'j8', title: 'Coordinador/a de Bodega', deptId: 'd-log', location: 'Santiago', modality: 'Presencial', type: 'Jornada completa', salaryMin: 1000000, salaryMax: 1200000, openings: 1, status: 'cerrada', days: 70, desc: 'Coordinación de recepción y despacho de mercadería.', req: ['Experiencia en WMS'], ben: ['Casino'] }
  ].map(j => ({ id: j.id, title: j.title, deptId: j.deptId, location: j.location, modality: j.modality, type: j.type, salaryMin: j.salaryMin, salaryMax: j.salaryMax, openings: j.openings, status: j.status, description: j.desc, requirements: j.req, benefits: j.ben, recruiterId: recruiter.id, publishedAt: j.status === 'borrador' ? null : addDays(T, -j.days), deadline: addDays(T, 30 - j.days), createdAt: new Date(parseKey(addDays(T, -j.days - 2))).toISOString() }));
  const applications = [], interviews = [], scorecards = [];
  const SOURCES = ['Sitio de empleos', 'Sitio de empleos', 'LinkedIn', 'Referido', 'Portal de empleo'];
  const stageOrder = ['postulado', 'entrevista', 'prueba', 'oferta', 'contratado'];
  let code = 4821;
  jobs.filter(j => j.status !== 'borrador').forEach(j => {
    const n = j.status === 'cerrada' ? 6 : r.int(5, 9);
    for (let i = 0; i < n; i++) {
      const g = r() < .5 ? M : F, first = r.pick(g), last = `${r.pick(LAST)} ${r.pick(LAST)}`;
      const applied = addDays(j.publishedAt, r.int(0, Math.max(1, -Math.round((parseKey(j.publishedAt) - parseKey(T)) / 864e5))));
      let stage = j.status === 'cerrada' ? (i === 0 ? 'contratado' : 'descartado') : r.pick(['postulado', 'postulado', 'postulado', 'entrevista', 'entrevista', 'prueba', 'oferta', 'descartado']);
      const reach = stage === 'descartado' ? r.int(0, 2) : stageOrder.indexOf(stage);
      const history = [{ stage: 'postulado', at: applied, by: 'Postulación web' }];
      const cap = k => (k > T ? T : k);
      for (let s = 1; s <= reach; s++) history.push({ stage: stageOrder[s], at: cap(addDays(applied, s * r.int(1, 3))), by: 'Reclutamiento' });
      if (stage === 'descartado') history.push({ stage: 'descartado', at: cap(addDays(applied, (reach + 1) * 2)), by: 'Reclutamiento' });
      const a = { id: `a${code}`, code: `GC-${code++}`, jobId: j.id, name: `${first} ${last}`, email: `${slug(first)}.${slug(last.split(' ')[0])}${r.int(1, 99)}@correo.demo`, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, rut: fmtRut(r.int(12000000, 24000000)), linkedin: `linkedin.com/in/${slug(first)}-${slug(last.split(' ')[0])}`, cvName: `CV_${first}_${last.split(' ')[0]}.pdf`.replace(/\s/g, ''), cvSize: `${r.int(90, 900)} KB`, cover: 'Me motiva el desafío y creo que mi experiencia aporta al equipo.', stage, rating: r.int(2, 5), source: r.pick(SOURCES), appliedAt: applied, history, notes: stage !== 'postulado' ? [{ text: 'Buen perfil, avanzar a siguiente etapa.', by: 'Reclutamiento', at: addDays(applied, 2) }] : [], rejectReason: stage === 'descartado' ? r.pick(['No cumple requisitos', 'Pretensiones fuera de rango', 'Eligió otra oferta']) : '', expectedSalary: Math.round((j.salaryMin + r() * (j.salaryMax - j.salaryMin) * 1.2) / 10000) * 10000 };
      applications.push(a);
      if (['entrevista', 'prueba', 'oferta'].includes(stage)) {
        interviews.push({ applicationId: a.id, date: addDays(T, r.int(-6, 7)), time: r.pick(['09:30', '11:00', '15:00', '16:30']), interviewer: r.pick([recruiter.name, tecHead.name, perHead.name]), mode: r.pick(['Videollamada', 'Presencial']), notes: '' });
        if (stage !== 'entrevista' || r() < .5) scorecards.push({ applicationId: a.id, by: r.pick([recruiter.name, perHead.name]), scores: { 'Experiencia técnica': r.int(2, 5), 'Comunicación': r.int(2, 5), 'Ajuste cultural': r.int(3, 5), 'Motivación': r.int(3, 5) }, recommendation: r.pick(['Avanzar', 'Avanzar', 'Dudas', 'No avanzar']), comment: 'Entrevista fluida, buenas respuestas en casos prácticos.', at: addDays(T, -r.int(1, 10)) });
      }
    }
  });

  // Onboarding de ingresos recientes.
  const TEMPLATE = [
    ['Firmar contrato y anexos', 'RRHH', -3], ['Crear cuenta de correo y accesos', 'TI', -2], ['Entregar notebook y credencial', 'TI', 0], ['Charla de bienvenida y cultura', 'RRHH', 0],
    ['Inducción de seguridad (ODI)', 'Prevención', 1], ['Reunión 1:1 con jefatura', 'Jefatura', 1], ['Asignar buddy / padrino', 'Jefatura', 2], ['Completar ficha personal en el portal', 'Colaborador', 3],
    ['Definir objetivos de los primeros 90 días', 'Jefatura', 14], ['Encuesta de onboarding (30 días)', 'RRHH', 30]
  ];
  const onboarding = recent.map(e => ({ employeeId: e.id, startDate: e.hireDate, buddyId: employees.find(x => x.deptId === e.deptId && x.level === 2)?.id || null, tasks: TEMPLATE.map(([title, owner, off], i) => ({ id: `t${i}`, title, owner, due: addDays(e.hireDate, off), done: addDays(e.hireDate, off) < T && r() < .85 })) }));

  // Evaluación de desempeño.
  const cycles = [
    { id: 'c1', name: 'Evaluación anual 2025', from: `${Y - 1}-11-01`, to: `${Y - 1}-12-15`, status: 'cerrado', competencies: COMPETENCIES },
    { id: 'c2', name: `Evaluación semestral ${Y}-S2`, from: addDays(T, -14), to: addDays(T, 21), status: 'abierto', competencies: COMPETENCIES }
  ];
  const reviews = [];
  active.filter(e => e.managerId && e.hireDate < `${Y - 1}-10-01`).forEach(e => {
    const sc = () => Object.fromEntries(COMPETENCIES.map(c => [c, r.int(2, 5)]));
    const m = sc(); const avg = Object.values(m).reduce((a, b) => a + b, 0) / COMPETENCIES.length;
    reviews.push({ cycleId: 'c1', employeeId: e.id, managerId: e.managerId, self: { scores: sc(), comment: 'Cumplí los objetivos principales del año.', goals: 'Fortalecer liderazgo.', at: `${Y - 1}-11-20` }, manager: { scores: m, comment: 'Buen desempeño general.', at: `${Y - 1}-12-05` }, final: Math.round(avg * 10) / 10 });
  });
  active.filter(e => e.managerId && e.hireDate < addDays(T, -90)).forEach(e => {
    const selfDone = e.id !== tecEmp.id && r() < .55, mgrDone = selfDone && r() < .4;
    const sc = () => Object.fromEntries(COMPETENCIES.map(c => [c, r.int(3, 5)]));
    reviews.push({ cycleId: 'c2', employeeId: e.id, managerId: e.managerId, self: selfDone ? { scores: sc(), comment: 'Semestre con buenos avances.', goals: 'Certificarme en mi área.', at: addDays(T, -r.int(1, 10)) } : null, manager: mgrDone ? { scores: sc(), comment: 'Aporte constante al equipo.', at: addDays(T, -r.int(0, 5)) } : null, final: null });
  });

  // Encuestas eNPS trimestrales.
  const surveys = [], responses = [];
  const COMMENTS = ['Buen ambiente y equipo comprometido.', 'Me gustaría más claridad en el plan de carrera.', 'Excelente flexibilidad horaria.', 'Faltan instancias de reconocimiento.', 'La comunicación interna ha mejorado mucho.', 'Necesitamos mejores herramientas de trabajo.', 'Muy buenos beneficios.', 'Carga laboral alta en cierre de mes.'];
  [['Q4 ' + (Y - 1), -330, 18], ['Q1 ' + Y, -240, 22], ['Q2 ' + Y, -150, 28], ['Q3 ' + Y, -60, 31]].forEach(([q, off, bias], i) => {
    const s = { id: `s${i + 1}`, title: `Pulso eNPS ${q}`, question: '¿Qué tan probable es que recomiendes Grupo Cordillera como lugar para trabajar?', status: 'cerrada', openedAt: addDays(T, off), closedAt: addDays(T, off + 14), respondents: [] };
    surveys.push(s);
    active.forEach(e => { if (r() < .72) { const score = Math.max(0, Math.min(10, Math.round(7 + (r() - .5) * 6 + bias / 30))); responses.push({ surveyId: s.id, score, deptId: e.deptId, comment: r() < .3 ? r.pick(COMMENTS) : '', date: addDays(s.openedAt, r.int(0, 13)) }); s.respondents.push(e.id); } });
  });
  const open = { id: 's5', title: `Pulso eNPS Q4 ${Y}`, question: '¿Qué tan probable es que recomiendes Grupo Cordillera como lugar para trabajar?', status: 'abierta', openedAt: addDays(T, -5), closedAt: null, respondents: [] };
  surveys.push(open);
  active.forEach(e => { if (e.id !== tecEmp.id && r() < .35) { const score = Math.max(0, Math.min(10, Math.round(7.6 + (r() - .5) * 5))); responses.push({ surveyId: 's5', score, deptId: e.deptId, comment: r() < .3 ? r.pick(COMMENTS) : '', date: addDays(T, -r.int(0, 4)) }); open.respondents.push(e.id); } });

  const ago = d => new Date(Date.now() - d * 864e5).toISOString();
  const announcements = [
    { title: 'Aguinaldo de Fiestas Patrias pagado', body: 'El aguinaldo se pagó junto a la remuneración de septiembre. Revisa tu liquidación en el portal.', category: 'Remuneraciones', date: ago(40), author: perHead.name, pinned: false, published: true },
    { title: 'Nueva jornada de 42 horas', body: 'Desde abril rige la jornada de 42 horas semanales. Tu horario actualizado está en tu contrato y en el módulo de asistencia.', category: 'Normativa', date: ago(12), author: perHead.name, pinned: true, published: true },
    { title: 'Abrimos la evaluación semestral', body: 'Completa tu autoevaluación antes del cierre del ciclo. Tu jefatura recibirá una notificación cuando la envíes.', category: 'Desempeño', date: ago(14), author: perHead.name, pinned: true, published: true },
    { title: 'Campaña de vacunación en casa matriz', body: 'El martes habrá vacunación contra la influenza en el piso 3, de 9:00 a 13:00.', category: 'Bienestar', date: ago(4), author: perHead.name, pinned: false, published: true },
    { title: 'Bienvenidos a nuestros nuevos colaboradores', body: `Damos la bienvenida a ${recent.map(e => e.name).join(', ')}. ¡Éxito en esta nueva etapa!`, category: 'Personas', date: ago(2), author: perHead.name, pinned: false, published: true },
    { title: 'Fiesta de fin de año (borrador)', body: 'Pronto compartiremos fecha y lugar.', category: 'Eventos', date: ago(0), author: perHead.name, pinned: false, published: false }
  ];
  const notifications = [
    { employeeId: tecEmp.id, text: 'Tu liquidación del último mes ya está disponible.', at: ago(2), read: false },
    { employeeId: tecEmp.id, text: 'Recuerda completar tu autoevaluación semestral.', at: ago(1), read: false },
    { employeeId: tecHead.id, text: 'Tienes solicitudes de tu equipo pendientes de aprobación.', at: ago(0.5), read: false }
  ];
  const users = [
    { id: 'u-admin', name: perHead.name, email: 'admin@grupocordillera.demo', password: 'demo123', role: 'admin', color: '#b45309', demo: true, active: true, employeeId: perHead.id },
    { id: 'u-jef', name: tecHead.name, email: 'jefatura@grupocordillera.demo', password: 'demo123', role: 'jefatura', color: '#4f46e5', demo: true, active: true, employeeId: tecHead.id },
    { id: 'u-emp', name: tecEmp.name, email: 'empleado@grupocordillera.demo', password: 'demo123', role: 'empleado', color: '#0284c7', demo: true, active: true, employeeId: tecEmp.id },
    { id: 'u-rec', name: recruiter.name, email: 'reclutador@grupocordillera.demo', password: 'demo123', role: 'reclutador', color: '#db2777', demo: true, active: true, employeeId: recruiter.id }
  ];
  const site = {
    heroTitle: 'Construyamos juntos lo que mueve a Chile', heroSubtitle: 'En Grupo Cordillera trabajamos más de 60 personas en operaciones, tecnología y servicios. Súmate a un equipo que crece contigo.',
    about: 'Somos un grupo de empresas chilenas (ficticio) con presencia en Santiago, Antofagasta y Concepción. Creemos en el trabajo bien hecho, la seguridad y el desarrollo de las personas.',
    benefits: ['Seguro complementario de salud y dental', 'Jornada de 42 horas y viernes corto', 'Día libre de cumpleaños', 'Presupuesto anual de capacitación', 'Modalidad híbrida en cargos compatibles', 'Aguinaldos de Fiestas Patrias y Navidad'],
    values: ['Seguridad primero', 'Personas en el centro', 'Trabajo bien hecho', 'Mejora continua'], contact: 'talento@grupocordillera.demo'
  };
  const policy = { diasBase: 15, progresivoDesdeAnios: 10, progresivoCadaAnios: 3, maxAcumulado: 30, anticipacionMin: 5, aprobacion: 'jefatura', medioDia: true, adminDias: 2 };
  const onboardingTemplate = TEMPLATE.map(([title, owner, off]) => ({ title, owner, offset: off }));
  return { employees, departments, requests, payslips, payrollRuns, marks, documents, jobs, applications, interviews, scorecards, onboarding, cycles, reviews, surveys, responses, announcements, notifications, users, site, policy, onboardingTemplate };
}
