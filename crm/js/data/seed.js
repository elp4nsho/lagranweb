// Datos semilla de Pulso CRM. Generados con rng() para que sean reproducibles:
// el equipo comercial de Pulso usa su propio CRM para vender licencias y servicios.
import { rng } from '../../../assets/core/db.js';
import { STAGES, LEAD_SOURCES, INDUSTRIES, SIZES, CITIES, LOST_REASONS } from '../shared/constants.js';
import { DEFAULT_PERMS } from '../shared/perms-default.js';

const DAY = 864e5;
const iso = t => new Date(t).toISOString();
// Ajusta una fecha a horario laboral (9-18 h) y a minutos redondos.
function workHour(t, r) {
  const d = new Date(t);
  d.setHours(r.int(9, 17), r.pick([0, 0, 15, 30, 45]), 0, 0);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return d.getTime();
}

const FIRST = ['Valentina', 'Matías', 'Javiera', 'Benjamín', 'Catalina', 'Sebastián', 'Fernanda', 'Diego', 'Antonia', 'Tomás', 'Constanza', 'Nicolás', 'Isidora', 'Felipe', 'Martina', 'Joaquín', 'Francisca', 'Cristóbal', 'Daniela', 'Ignacio', 'Paula', 'Gonzalo', 'Carolina', 'Andrés', 'Macarena', 'Rodrigo', 'Pía', 'Vicente', 'Josefa', 'Pablo'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández'];
const TITLES = ['Gerente General', 'Gerente de Operaciones', 'Jefe de Ventas', 'Gerente Comercial', 'Jefa de TI', 'Gerente de Finanzas', 'Subgerente Comercial', 'Jefe de Marketing', 'Coordinadora de Proyectos', 'Director Ejecutivo', 'Analista de Procesos', 'Jefa de Administración'];
const COMPANIES = [
  ['Constructora Cordillera', 'Construcción'], ['Viña Los Aromos', 'Agroindustria'], ['Transportes Austral', 'Logística'],
  ['Clínica Bahía Serena', 'Salud'], ['Agrícola Valle Verde', 'Agroindustria'], ['Logística Pacífico Sur', 'Logística'],
  ['Inmobiliaria Altamira', 'Construcción'], ['Minera Cerro Blanco', 'Minería'], ['Mercado Norte Retail', 'Retail'],
  ['Salmones Fiordo Azul', 'Alimentos'], ['Seguros Andinos', 'Servicios financieros'], ['Ferretería El Roble', 'Retail'],
  ['Colegio Los Coihues', 'Educación'], ['Hotel Lago Esmeralda', 'Turismo'], ['Distribuidora Maule', 'Logística'],
  ['Solar Atacama Energía', 'Energía'], ['Laboratorio BioSur', 'Salud'], ['Ríos & Asociados Consultores', 'Servicios profesionales'],
  ['Café Patagonia Tostadores', 'Alimentos'], ['Gráfica Central Impresores', 'Manufactura'], ['Textil Andina', 'Manufactura'],
  ['Pesquera Mar Profundo', 'Alimentos'], ['Autopartes Ruta Cinco', 'Retail'], ['Veterinaria Huellitas', 'Salud'],
  ['Valdés Abogados', 'Servicios profesionales'], ['AgroExport Limarí', 'Agroindustria'], ['Turismo Fin del Mundo', 'Turismo'],
  ['Panificadora La Espiga', 'Alimentos'], ['Quintral Tecnologías', 'Tecnología'], ['Maderas del Biobío', 'Manufactura'],
  ['Finanzas Cumbre', 'Servicios financieros'], ['Ecolimpia Servicios', 'Servicios profesionales']
];
const domain = name => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 18) + '.cl';
const mailOf = (n, l, dom) => `${n[0]}${l}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '') + '@' + dom;
const rut = r => `${r.int(76, 78)}.${r.int(100, 999)}.${r.int(100, 999)}-${r.pick(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])}`;
const phone = r => `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;

// Nombre corto de la empresa para el título del negocio (sin cortar en «Los», «&», «de»…).
const shortName = n => { const w = n.split(' '); let k = 2; while (k < w.length && /^(los|las|la|el|de|del|y|&)$/i.test(w[k - 1])) k++; return w.slice(0, k).join(' '); };

export const PRODUCTS = [
  { id: 'p-ini', name: 'Plan Inicial', sku: 'LIC-INI', category: 'Licencias', price: 180000, unit: 'usuario/año', description: 'Pipeline, contactos y tareas para equipos que comienzan.' },
  { id: 'p-cre', name: 'Plan Crecimiento', sku: 'LIC-CRE', category: 'Licencias', price: 348000, unit: 'usuario/año', description: 'Automatizaciones, secuencias de correo y reportes avanzados.' },
  { id: 'p-ent', name: 'Plan Enterprise', sku: 'LIC-ENT', category: 'Licencias', price: 588000, unit: 'usuario/año', description: 'Permisos granulares, API ilimitada y soporte dedicado.' },
  { id: 'p-aut', name: 'Módulo de automatización', sku: 'MOD-AUT', category: 'Módulos', price: 96000, unit: 'usuario/año', description: 'Reglas si/entonces y flujos de seguimiento.' },
  { id: 'p-api', name: 'Paquete API adicional', sku: 'MOD-API', category: 'Módulos', price: 1200000, unit: 'año', description: '1 millón de llamadas extra al año.' },
  { id: 'p-onb', name: 'Onboarding guiado', sku: 'SRV-ONB', category: 'Servicios', price: 1200000, unit: 'único', description: 'Configuración inicial y puesta en marcha en 2 semanas.' },
  { id: 'p-erp', name: 'Integración con ERP', sku: 'SRV-ERP', category: 'Servicios', price: 3500000, unit: 'único', description: 'Conector bidireccional con tu ERP contable.' },
  { id: 'p-cap', name: 'Capacitación de equipo', sku: 'SRV-CAP', category: 'Servicios', price: 450000, unit: 'sesión', description: 'Taller práctico de 3 horas (hasta 15 personas).' },
  { id: 'p-mig', name: 'Migración de datos', sku: 'SRV-MIG', category: 'Servicios', price: 1800000, unit: 'único', description: 'Importación y limpieza desde planillas u otro CRM.' },
  { id: 'p-sop', name: 'Soporte premium', sku: 'SRV-SOP', category: 'Soporte', price: 2400000, unit: 'año', description: 'Atención prioritaria 24/7 con ejecutivo asignado.' },
  { id: 'p-wsp', name: 'Canal WhatsApp', sku: 'MOD-WSP', category: 'Módulos', price: 720000, unit: 'año', description: 'Conversaciones de WhatsApp dentro de cada negocio.' },
  { id: 'p-old', name: 'Plan Básico 2023 (descontinuado)', sku: 'LIC-B23', category: 'Licencias', price: 150000, unit: 'usuario/año', description: 'Plan antiguo, solo renovaciones.', active: false }
];

export function seed() {
  const r = rng(2026);
  const now = Date.now();

  // ---------- Equipo ----------
  const teams = [
    { id: 't-ent', name: 'Enterprise Santiago', description: 'Cuentas grandes de la Región Metropolitana', leaderId: 'u-ger' },
    { id: 't-reg', name: 'PyME Regiones', description: 'Pequeñas y medianas empresas de regiones', leaderId: 'u-ger' }
  ];
  const users = [
    { id: 'u-admin', name: 'Camila Herrera', email: 'admin@pulsocrm.cl', password: 'demo123', role: 'admin', color: '#7c3aed', title: 'Administradora del sistema', teamId: null, demo: true, active: true },
    { id: 'u-ger', name: 'Rodrigo Fuentes', email: 'gerente@pulsocrm.cl', password: 'demo123', role: 'gerente', color: '#0f766e', title: 'Gerente comercial', teamId: 't-ent', demo: true, active: true },
    { id: 'u-val', name: 'Valentina Rojas', email: 'ejecutiva@pulsocrm.cl', password: 'demo123', role: 'ejecutivo', color: '#e11d48', title: 'Ejecutiva enterprise', teamId: 't-ent', demo: true, active: true },
    { id: 'u-mat', name: 'Matías Soto', email: 'matias@pulsocrm.cl', password: 'demo123', role: 'ejecutivo', color: '#2563eb', title: 'Ejecutivo enterprise', teamId: 't-ent', active: true },
    { id: 'u-jav', name: 'Javiera Muñoz', email: 'javiera@pulsocrm.cl', password: 'demo123', role: 'ejecutivo', color: '#ca8a04', title: 'Ejecutiva PyME', teamId: 't-reg', active: true },
    { id: 'u-ben', name: 'Benjamín Araya', email: 'benjamin@pulsocrm.cl', password: 'demo123', role: 'ejecutivo', color: '#059669', title: 'Ejecutivo PyME', teamId: 't-reg', active: true },
    { id: 'u-ign', name: 'Ignacio Tapia', email: 'ignacio@pulsocrm.cl', password: 'demo123', role: 'ejecutivo', color: '#64748b', title: 'Ex ejecutivo PyME', teamId: 't-reg', active: false }
  ].map(u => ({ ...u, phone: phone(r), createdAt: iso(now - r.int(200, 700) * DAY) }));
  const reps = ['u-val', 'u-mat', 'u-jav', 'u-ben'];
  const repWeight = () => r.pick(['u-val', 'u-val', 'u-mat', 'u-mat', 'u-jav', 'u-ben', 'u-ben', 'u-val']);

  // ---------- Empresas y contactos ----------
  const companies = COMPANIES.map(([name, industry], i) => ({
    id: 'c' + i, name, industry, rut: rut(r), city: r.pick(CITIES), size: r.pick(SIZES), website: 'www.' + domain(name),
    phone: `+56 ${r.pick(['2', '32', '41', '45', '65', '55'])} ${r.int(2000, 2999)} ${r.int(1000, 9999)}`,
    ownerId: repWeight(), createdAt: iso(now - r.int(30, 420) * DAY)
  }));
  const contacts = [];
  companies.forEach(c => {
    const n = r.int(1, 4);
    for (let k = 0; k < n; k++) {
      const fn = r.pick(FIRST), ln = r.pick(LAST);
      contacts.push({
        id: 'ct' + contacts.length, name: `${fn} ${ln}`, email: mailOf(fn, ln, domain(c.name)), phone: phone(r),
        title: r.pick(TITLES), companyId: c.id, ownerId: c.ownerId, tags: r.bool(.3) ? ['decisor'] : r.bool(.3) ? ['influenciador'] : [],
        createdAt: c.createdAt
      });
    }
  });

  // ---------- Negocios ----------
  const activities = [];
  const files = [];
  const deals = [];
  const addAct = a => activities.push({ id: 'a' + activities.length, done: true, reminded: true, ...a });
  const nameOf = id => users.find(u => u.id === id).name;
  const dealNames = ['Licencias equipo comercial', 'Renovación anual', 'Ampliación a sucursales', 'Implementación CRM', 'Piloto 3 meses', 'Migración desde planillas', 'Expansión regional', 'Integración ERP + licencias', 'Upgrade a Enterprise', 'Proyecto omnicanal'];
  for (let i = 0; i < 66; i++) {
    const comp = companies[i % companies.length];
    const cts = contacts.filter(c => c.companyId === comp.id);
    const owner = i < companies.length ? comp.ownerId : repWeight();
    const age = r.int(3, 330);
    const created = now - age * DAY;
    // Los negocios antiguos suelen estar cerrados; los recientes, abiertos.
    let st;
    const closedChance = Math.min(.92, age / 160);
    if (r.bool(closedChance)) st = r.bool(.58) ? 'ganado' : 'perdido';
    else st = r.pick(['prospeccion', 'prospeccion', 'calificado', 'calificado', 'propuesta', 'propuesta', 'negociacion']);
    // Productos de la cotización
    const lic = r.pick(['p-ini', 'p-cre', 'p-cre', 'p-ent']);
    const items = [{ productId: lic, qty: r.pick([5, 8, 10, 12, 15, 20, 25, 30, 40, 60]), price: PRODUCTS.find(p => p.id === lic).price, discount: r.pick([0, 0, 5, 10]) }];
    if (r.bool(.6)) items.push({ productId: 'p-onb', qty: 1, price: 1200000, discount: 0 });
    if (r.bool(.25)) items.push({ productId: r.pick(['p-erp', 'p-mig', 'p-sop', 'p-cap', 'p-aut']), qty: 1, price: 0, discount: 0 });
    items.forEach(it => { if (!it.price) it.price = PRODUCTS.find(p => p.id === it.productId).price; if (it.productId === 'p-aut') it.qty = items[0].qty; if (it.productId === 'p-cap') it.qty = r.int(1, 3); });
    const amount = Math.round(items.reduce((s, it) => s + it.qty * it.price * (1 - it.discount / 100), 0));
    // Historial de etapas
    const path = st === 'perdido' ? STAGES.slice(0, r.int(1, 4)).map(s => s.id).concat('perdido') : STAGES.slice(0, STAGES.findIndex(s => s.id === st) + 1).map(s => s.id);
    const end = ['ganado', 'perdido'].includes(st) ? Math.min(now - DAY, created + r.int(14, 80) * DAY) : now - r.int(0, Math.max(1, Math.min(age, 20))) * DAY;
    const history = path.map((s, k) => ({ stage: s, at: iso(k === 0 ? created : created + (end - created) * (k / (path.length - 1 || 1))) }));
    const id = 'd' + i;
    const deal = {
      id, title: `${shortName(comp.name)} · ${r.pick(dealNames)}`, companyId: comp.id, contactId: cts.length ? r.pick(cts).id : null,
      ownerId: owner, stage: st, amount, items, history, source: r.pick(LEAD_SOURCES),
      closeDate: iso(['ganado', 'perdido'].includes(st) ? end : now + r.int(4, 95) * DAY),
      closedAt: ['ganado', 'perdido'].includes(st) ? iso(end) : null,
      lostReason: st === 'perdido' ? r.pick(LOST_REASONS) : null,
      createdAt: iso(created), updatedAt: iso(end)
    };
    deals.push(deal);
    // Actividades históricas
    const nAct = r.int(2, 6);
    for (let k = 0; k < nAct; k++) {
      const t = workHour(created + (Math.min(end, now) - created) * ((k + .5) / nAct), r);
      if (t > now) continue;
      const type = r.pick(['llamada', 'reunion', 'email', 'nota', 'llamada', 'email']);
      const contact = deal.contactId ? contacts.find(c => c.id === deal.contactId) : null;
      const subj = {
        llamada: r.pick(['Llamada de descubrimiento', 'Seguimiento de propuesta', 'Llamada con finanzas', 'Revisión de requisitos']),
        reunion: r.pick(['Demo del producto', 'Reunión con gerencia', 'Taller de levantamiento', 'Reunión de cierre']),
        email: r.pick(['Envío de propuesta comercial', 'Resumen de la demo', 'Material de casos de éxito', 'Respuesta a dudas técnicas']),
        nota: r.pick(['Contexto de la cuenta', 'Competencia en evaluación', 'Presupuesto aprobado en marzo', 'Decisor: gerencia general'])
      }[type];
      addAct({
        type, subject: subj, dealId: id, companyId: comp.id, contactId: deal.contactId, ownerId: owner,
        body: type === 'nota' ? r.pick(['Están comparando con otra herramienta; valoran la integración con su ERP.', 'El equipo usa planillas compartidas y pierde seguimiento de cotizaciones.', 'Piden referencia de otro cliente del mismo rubro.', 'La decisión pasa por el directorio de fin de mes.'])
          : type === 'email' ? `Hola ${contact ? contact.name.split(' ')[0] : ''}, te comparto lo conversado. Quedo atento a tus comentarios.` : r.pick(['Buena disposición, piden propuesta formal.', 'Se acordó una segunda reunión con TI.', 'Interés alto en automatizaciones.', 'Revisan presupuesto con finanzas.']),
        dueAt: iso(t), doneAt: iso(t), createdAt: iso(t), opened: type === 'email' ? r.bool(.7) : undefined
      });
    }
    history.slice(1).forEach(h => addAct({ type: 'sistema', subject: `Etapa cambiada a ${STAGES.find(s => s.id === h.stage).name}`, dealId: id, companyId: comp.id, ownerId: owner, dueAt: h.at, doneAt: h.at, createdAt: h.at }));
    // Próximas actividades para negocios abiertos
    if (!deal.closedAt) {
      const n = r.int(1, 2);
      for (let k = 0; k < n; k++) {
        const t = workHour(now + r.int(-4, 9) * DAY, r);
        const type = r.pick(['llamada', 'reunion', 'tarea', 'tarea']);
        addAct({
          type, dealId: id, companyId: comp.id, contactId: deal.contactId, ownerId: owner, done: false, reminded: t < now,
          subject: { llamada: 'Llamar para revisar propuesta', reunion: r.pick(['Demo con equipo de ventas', 'Reunión de negociación', 'Presentación a directorio']), tarea: r.pick(['Enviar cotización actualizada', 'Preparar caso de negocio', 'Confirmar cantidad de usuarios', 'Solicitar orden de compra', 'Enviar contrato para firma']) }[type],
          body: '', dueAt: iso(t), reminder: r.pick([15, 30, 60, 1440]), createdAt: iso(now - r.int(1, 10) * DAY)
        });
      }
    }
    if (r.bool(.5)) files.push({ id: 'f' + files.length, dealId: id, name: r.pick(['Propuesta_comercial.pdf', 'Requerimientos.docx', 'Cotizacion_firmada.pdf', 'Organigrama.png', 'Planilla_clientes.xlsx']), size: r.int(80, 4200) * 1024, uploadedBy: owner, createdAt: iso(created + DAY) });
  }
  // Algunos cierres ganados en el mes en curso para que las metas tengan avance real.
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(10, 0, 0, 0);
  deals.filter(d => d.stage === 'ganado').slice(0, 7).forEach((d, k) => {
    const t = Math.min(now - 3600000, monthStart.getTime() + (k * 3 + 1) * DAY);
    d.closedAt = d.closeDate = d.updatedAt = iso(t);
    if (new Date(d.createdAt) > t) d.createdAt = iso(t - 30 * DAY);
    d.history.forEach((h, i) => { if (i === d.history.length - 1 || new Date(h.at) > t) h.at = iso(t - (d.history.length - 1 - i) * 2 * DAY); });
    activities.filter(a => a.dealId === d.id && new Date(a.dueAt) > t).forEach(a => { a.dueAt = a.doneAt = a.createdAt = iso(t - DAY); });
    const sys = activities.find(a => a.dealId === d.id && a.type === 'sistema' && /Ganado/.test(a.subject));
    if (sys) sys.dueAt = sys.doneAt = sys.createdAt = iso(t);
  });
  // Dos tareas con recordatorio inminente para mostrar las alertas.
  ['u-val', 'u-ger'].forEach((u, k) => addAct({ type: 'tarea', subject: k ? 'Revisar forecast semanal con el equipo' : 'Llamar a Constructora Cordillera por renovación', dealId: k ? null : 'd0', companyId: k ? null : 'c0', ownerId: u, done: false, reminded: false, dueAt: iso(now + 20 * 60000), reminder: 30, body: '', createdAt: iso(now - DAY) }));

  // ---------- Leads ----------
  const leads = [];
  for (let i = 0; i < 52; i++) {
    const fn = r.pick(FIRST), ln = r.pick(LAST);
    const cname = r.pick(['Comercial', 'Servicios', 'Inversiones', 'Distribuidora', 'Agrícola', 'Transportes', 'Importadora', 'Consultora', 'Clínica', 'Constructora']) + ' ' + r.pick(['Los Andes', 'Pehuén', 'Del Pacífico', 'San Pedro', 'Llanquihue', 'Altos del Sur', 'Mirador', 'Cóndor', 'Aconcagua', 'Tierra Fértil', 'Puerto Claro', 'Raulí']);
    const age = r.int(0, 140);
    const status = age > 60 ? r.pick(['convertido', 'descartado', 'calificado', 'convertido']) : age > 15 ? r.pick(['contactado', 'calificado', 'nuevo', 'descartado', 'convertido']) : r.pick(['nuevo', 'nuevo', 'contactado']);
    const source = r.pick(LEAD_SOURCES);
    leads.push({
      id: 'l' + i, name: `${fn} ${ln}`, company: cname, email: mailOf(fn, ln, domain(cname)), phone: r.bool(.8) ? phone(r) : '',
      title: r.pick(TITLES), source, status, size: r.pick(SIZES), industry: r.pick(INDUSTRIES), city: r.pick(CITIES),
      ownerId: status === 'nuevo' && r.bool(.4) ? null : repWeight(), interest: r.pick(['Plan Inicial', 'Plan Crecimiento', 'Plan Enterprise']),
      message: r.bool(.5) ? r.pick(['Queremos ordenar el seguimiento de cotizaciones.', 'Somos 12 vendedores y usamos Excel.', 'Necesitamos integrar con nuestro ERP.', 'Buscamos reemplazar nuestro CRM actual.']) : '',
      createdAt: iso(now - age * DAY - r.int(0, 600) * 60000)
    });
  }

  // ---------- Correo ----------
  const templates = [
    { id: 'tp1', name: 'Bienvenida a la demo', category: 'Prospección', subject: '{{nombre}}, gracias por tu interés en Pulso', body: 'Hola {{nombre}}:\n\nGracias por solicitar una demo para {{empresa}}. Te propongo agendar 30 minutos esta semana para conocer cómo trabaja tu equipo.\n\nSaludos,\n{{ejecutivo}}' },
    { id: 'tp2', name: 'Envío de propuesta', category: 'Propuesta', subject: 'Propuesta comercial para {{empresa}}', body: 'Hola {{nombre}}:\n\nAdjunto la propuesta conversada. Incluye licencias, onboarding guiado y soporte durante el primer mes.\n\nQuedo atento,\n{{ejecutivo}}' },
    { id: 'tp3', name: 'Seguimiento sin respuesta', category: 'Seguimiento', subject: '¿Pudiste revisar la propuesta, {{nombre}}?', body: 'Hola {{nombre}}:\n\nQuería saber si tuviste oportunidad de revisar la propuesta para {{empresa}}. ¿Te acomoda una llamada breve?\n\n{{ejecutivo}}' },
    { id: 'tp4', name: 'Caso de éxito del rubro', category: 'Nutrición', subject: 'Cómo un equipo como el de {{empresa}} aumentó su tasa de cierre', body: 'Hola {{nombre}}:\n\nTe comparto el caso de un cliente de tu industria que redujo a la mitad el tiempo de seguimiento usando secuencias automáticas.\n\n{{ejecutivo}}' },
    { id: 'tp5', name: 'Cierre y próximos pasos', category: 'Cierre', subject: 'Bienvenidos a Pulso, {{empresa}}', body: 'Hola {{nombre}}:\n\n¡Gracias por confiar en nosotros! Esta semana te contactará nuestro equipo de onboarding para comenzar.\n\n{{ejecutivo}}' },
    { id: 'tp6', name: 'Reactivación', category: 'Seguimiento', subject: '{{nombre}}, ¿retomamos la conversación?', body: 'Hola {{nombre}}:\n\nHace unos meses conversamos sobre ordenar el proceso comercial de {{empresa}}. Lanzamos nuevas funciones que podrían interesarte.\n\n{{ejecutivo}}' }
  ];
  const sequences = [
    { id: 'sq1', name: 'Nutrición de leads de demo', active: true, steps: [{ day: 0, templateId: 'tp1' }, { day: 3, templateId: 'tp4' }, { day: 7, templateId: 'tp3' }], enrolled: [] },
    { id: 'sq2', name: 'Seguimiento de propuesta', active: true, steps: [{ day: 2, templateId: 'tp3' }, { day: 6, templateId: 'tp4' }], enrolled: [] },
    { id: 'sq3', name: 'Reactivación de perdidos', active: false, steps: [{ day: 0, templateId: 'tp6' }, { day: 10, templateId: 'tp4' }], enrolled: [] }
  ];
  sequences.forEach((s, k) => {
    for (let i = 0; i < 6 + k * 2; i++) {
      const c = contacts[r.int(0, contacts.length - 1)];
      if (s.enrolled.some(e => e.contactId === c.id)) continue;
      const step = r.int(0, s.steps.length);
      s.enrolled.push({ contactId: c.id, step, startedAt: iso(now - r.int(1, 30) * DAY), done: step >= s.steps.length });
    }
    s.sent = s.enrolled.reduce((a, e) => a + e.step, 0) + r.int(20, 80);
    s.opens = Math.round(s.sent * (.45 + r() * .25));
    s.replies = Math.round(s.sent * (.05 + r() * .1));
  });

  // ---------- Metas, cotizaciones, automatizaciones ----------
  const goals = [];
  for (let m = -6; m <= 2; m++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    reps.forEach(u => goals.push({ id: `g-${u}-${month}`, userId: u, month, target: (u === 'u-val' || u === 'u-mat' ? r.int(22, 34) : r.int(10, 18)) * 1000000 }));
  }
  const quotes = deals.filter(d => ['propuesta', 'negociacion', 'ganado'].includes(d.stage)).slice(0, 14).map((d, k) => ({
    id: 'q' + k, number: 1040 + k, dealId: d.id, items: d.items.map(x => ({ ...x })), validDays: 30,
    status: d.stage === 'ganado' ? 'aceptada' : 'enviada', createdAt: d.history.find(h => h.stage === 'propuesta')?.at || d.createdAt, createdBy: d.ownerId
  }));
  const automations = [
    { id: 'au1', name: 'Asignar leads web por round-robin', trigger: 'lead.created', condition: { field: 'source', op: 'in', value: 'Demo web,Formulario web' }, action: 'assign', active: true, runs: 38 },
    { id: 'au2', name: 'Tarea de primer contacto en 24 h', trigger: 'lead.created', condition: null, action: 'task', params: { subject: 'Primer contacto con el lead', days: 1 }, active: true, runs: 51 },
    { id: 'au3', name: 'Correo de bienvenida a demos', trigger: 'lead.created', condition: { field: 'source', op: 'in', value: 'Demo web' }, action: 'email', params: { templateId: 'tp1' }, active: true, runs: 22 },
    { id: 'au4', name: 'Avisar al gerente en negociaciones grandes', trigger: 'deal.stage', condition: { field: 'amount', op: 'gt', value: 15000000 }, action: 'notify', active: true, runs: 9 },
    { id: 'au5', name: 'Onboarding al ganar', trigger: 'deal.won', condition: null, action: 'task', params: { subject: 'Coordinar kickoff de onboarding', days: 2 }, active: true, runs: 27 },
    { id: 'au6', name: 'Encuesta de motivo de pérdida', trigger: 'deal.lost', condition: null, action: 'task', params: { subject: 'Registrar aprendizaje del negocio perdido', days: 3 }, active: false, runs: 4 }
  ].map(a => ({ ...a, lastRun: iso(now - r.int(1, 200) * 3600000) }));

  const notifications = [
    { userId: 'u-val', text: 'Te asignaron el lead de Comercial Los Andes', link: 'app.html#/leads', read: false },
    { userId: 'u-val', text: 'Agrícola Valle Verde abrió tu correo "Envío de propuesta"', link: 'app.html#/negocios', read: false },
    { userId: 'u-ger', text: 'Negocio grande en negociación: Minera Cerro Blanco', link: 'app.html#/negocios', read: false },
    { userId: 'u-ger', text: 'Matías Soto superó el 80% de su meta mensual', link: 'app.html#/metas', read: true },
    { userId: 'u-admin', text: 'Nuevo usuario pendiente de revisar permisos', link: 'admin.html#/usuarios', read: false }
  ].map((n, k) => ({ ...n, id: 'n' + k, createdAt: iso(now - (k + 1) * 3 * 3600000) }));

  const site = {
    announcement: { on: true, text: 'Nuevo: secuencias de correo con IA para redactar seguimientos. Pruébalo 14 días gratis.' },
    hero: {
      eyebrow: 'CRM para equipos B2B en Chile',
      title: 'Tu pipeline, claro y con pulso propio',
      subtitle: 'Pulso CRM ordena leads, negocios y seguimientos en un solo lugar para que tu equipo comercial cierre más y adivine menos.',
      cta: 'Solicitar demo gratis', cta2: 'Ver planes'
    },
    stats: [{ value: '+1.200', label: 'equipos comerciales' }, { value: '32%', label: 'más tasa de cierre' }, { value: '4,8/5', label: 'satisfacción' }],
    logos: ['Constructora Cordillera', 'Viña Los Aromos', 'Seguros Andinos', 'Solar Atacama', 'Quintral', 'BioSur'],
    features: [
      { icon: 'kanban', title: 'Pipeline visual', text: 'Arrastra negocios entre etapas y mira el valor ponderado de tu forecast en tiempo real.' },
      { icon: 'target', title: 'Scoring de leads', text: 'Prioriza automáticamente a quién llamar primero según fuente, tamaño y engagement.' },
      { icon: 'mail', title: 'Secuencias de correo', text: 'Plantillas con variables y cadencias que se detienen solas cuando el cliente responde.' },
      { icon: 'bolt', title: 'Automatizaciones', text: 'Reglas si/entonces: asigna leads, crea tareas y avisa al gerente sin mover un dedo.' },
      { icon: 'doc', title: 'Cotizaciones en 1 clic', text: 'Arma cotizaciones con tu catálogo, IVA incluido, listas para imprimir o enviar.' },
      { icon: 'chart', title: 'Reportes y metas', text: 'Embudo de conversión, ingresos por mes y ranking del equipo contra sus metas.' }
    ],
    plans: [
      { id: 'pl1', name: 'Inicial', price: 15000, note: 'por usuario / mes', highlight: false, features: ['Pipeline y contactos', 'Tareas y calendario', 'App móvil', 'Soporte por correo'] },
      { id: 'pl2', name: 'Crecimiento', price: 29000, note: 'por usuario / mes', highlight: true, features: ['Todo lo de Inicial', 'Secuencias de correo', 'Automatizaciones', 'Reportes avanzados', 'Cotizaciones'] },
      { id: 'pl3', name: 'Enterprise', price: 49000, note: 'por usuario / mes', highlight: false, features: ['Todo lo de Crecimiento', 'Permisos granulares', 'API ilimitada', 'Ejecutivo de éxito dedicado', 'SSO'] }
    ],
    testimonials: [
      { id: 'ts1', name: 'Francisca Morales', role: 'Gerenta Comercial', company: 'Viña Los Aromos', quote: 'Pasamos de cinco planillas a un solo pipeline. Hoy sé exactamente qué vamos a facturar el próximo mes.' },
      { id: 'ts2', name: 'Andrés Valenzuela', role: 'Jefe de Ventas', company: 'Transportes Austral', quote: 'Las secuencias de seguimiento nos devolvieron horas cada semana. El equipo vende en vez de perseguir correos.' },
      { id: 'ts3', name: 'Macarena Castillo', role: 'Directora Ejecutiva', company: 'Solar Atacama Energía', quote: 'La implementación tomó dos semanas y el soporte en español hizo toda la diferencia.' }
    ],
    faq: [
      { q: '¿Puedo probar Pulso antes de pagar?', a: 'Sí. Todos los planes incluyen 14 días de prueba sin tarjeta de crédito.' },
      { q: '¿Emiten factura electrónica?', a: 'Sí, emitimos factura electrónica chilena mensual o anual.' },
      { q: '¿Puedo importar mis contactos desde Excel?', a: 'Claro. Pega o sube tu planilla y Pulso detecta duplicados automáticamente.' },
      { q: '¿Qué pasa con mis datos si me voy?', a: 'Puedes exportar toda tu información en CSV en cualquier momento.' }
    ],
    contactEmail: 'ventas@pulsocrm.cl', contactPhone: '+56 2 2940 1200', annualDiscount: 20
  };
  const settings = { companyName: 'Pulso CRM SpA', fiscalStart: 1, quoteValidity: 30, quoteNotes: 'Precios en pesos chilenos. Válido por 30 días. Licencias facturadas anualmente.', probabilities: Object.fromEntries(STAGES.map(s => [s.id, s.prob])), scoring: { 'Demo web': 30, 'Referido': 28, 'Partner': 22, 'Evento': 18, 'LinkedIn': 14, 'Formulario web': 16, 'Llamada en frío': 6 } };

  // Bitácora inicial
  const _log = [];
  return { users, teams, companies, contacts, deals, activities, leads, products: PRODUCTS.map(p => ({ active: true, ...p, createdAt: iso(now - 400 * DAY) })), templates, sequences, goals, quotes, automations, notifications, files, site, settings, perms: DEFAULT_PERMS, quoteSeq: 1054, rrIndex: 0, _log };
}
