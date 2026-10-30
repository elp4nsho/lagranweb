// Datos semilla reproducibles de Hogar Austral Propiedades.
import { rng } from '../../../assets/core/db.js';
import { COMUNAS } from '../shared/geo.js';

export const FEATURES = ['Piscina', 'Gimnasio', 'Quincho', 'Conserjería 24h', 'Ascensor', 'Terraza', 'Logia', 'Walk-in closet', 'Calefacción central',
  'Cocina americana', 'Vista despejada', 'Jardín', 'Sala multiuso', 'Estacionamiento visitas', 'Pet friendly', 'Cerca del metro', 'Bicicletero',
  'Lavandería', 'Termopanel', 'Cowork', 'Amoblado', 'Paneles solares'];

const FIRST = ['Valentina', 'Matías', 'Catalina', 'Benjamín', 'Javiera', 'Sebastián', 'Antonia', 'Tomás', 'Fernanda', 'Diego', 'Isidora', 'Joaquín',
  'Constanza', 'Nicolás', 'Martina', 'Felipe', 'Francisca', 'Cristóbal', 'Daniela', 'Vicente', 'Camila', 'Agustín', 'Josefa', 'Maximiliano', 'Paula', 'Gonzalo',
  'Trinidad', 'Ignacio', 'Florencia', 'Rodrigo', 'Macarena', 'Andrés', 'Bárbara', 'Pablo', 'Carolina', 'Héctor', 'Patricia', 'Jorge', 'Verónica', 'Luis'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López',
  'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro',
  'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa'];
const COLORS = ['#e63322', '#1e4db7', '#2a9d3f', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4d7c0f', '#b45309', '#0f766e'];

const iso = d => new Date(d).toISOString();
const DAY = 864e5;
function rut(r) {
  const n = r.int(7000000, 24999999);
  let s = 0, m = 2;
  for (const ch of String(n).split('').reverse()) { s += +ch * m; m = m === 7 ? 2 : m + 1; }
  const dv = 11 - (s % 11);
  return `${n.toLocaleString('es-CL')}-${dv === 11 ? 0 : dv === 10 ? 'K' : dv}`;
}
const mail = (name, dom) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@' + dom;
const phone = r => `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;

export function seed() {
  const r = rng(2026);
  const person = () => `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const now = Date.now();

  // ---------- Oficinas y corredores ----------
  const offices = [
    { id: 'of1', name: 'Oficina Providencia', address: 'Av. Providencia 1890, of. 402', comuna: 'providencia', phone: '+56 2 2940 1100', manager: 'a1' },
    { id: 'of2', name: 'Oficina Las Condes', address: 'Av. Apoquindo 4500, piso 8', comuna: 'las-condes', phone: '+56 2 2940 1200', manager: 'a3' },
    { id: 'of3', name: 'Oficina Ñuñoa', address: 'Av. Irarrázaval 3120, local 5', comuna: 'nunoa', phone: '+56 2 2940 1300', manager: 'a5' }
  ];
  const agentNames = ['Ignacio Valdés', 'Francisca Morales', 'Rodrigo Saavedra', 'Antonia Lagos', 'Cristián Navarro', 'Daniela Fuenzalida'];
  const agents = agentNames.map((name, i) => ({
    id: 'a' + (i + 1), name, email: mail(name, 'hogaraustral.cl'), phone: phone(r), officeId: offices[Math.floor(i / 2)].id,
    userId: 'u-ag' + (i + 1), color: COLORS[i], rating: +(4.3 + r() * .7).toFixed(1), active: true,
    bio: r.pick(['Especialista en departamentos para inversión.', 'Experta en casas familiares del sector oriente.', 'Corredor con 12 años de experiencia en arriendos.', 'Asesora en proyectos nuevos y crédito hipotecario.', 'Foco en propiedades comerciales y oficinas.', 'Conoce cada rincón de Ñuñoa y Providencia.'])
  }));

  // ---------- Usuarios ----------
  const users = [
    { id: 'u-admin', name: 'Camila Herrera', email: 'admin@hogaraustral.cl', password: 'admin123', role: 'admin', color: '#e63322', demo: true, active: true, phone: '+56 9 6123 4501' },
    { id: 'u-editor', name: 'Martín Ossandón', email: 'editor@hogaraustral.cl', password: 'editor123', role: 'editor', color: '#7c3aed', demo: true, active: true, phone: '+56 9 6123 4502' },
    ...agents.map((a, i) => ({ id: a.userId, name: a.name, email: i === 0 ? 'corredor@hogaraustral.cl' : a.email, password: 'corredor123', role: 'corredor', color: a.color, demo: i === 0, active: true, phone: a.phone })),
    { id: 'u-owner', name: 'Rodrigo Fuentes', email: 'propietario@demo.cl', password: 'prop123', role: 'propietario', color: '#2a9d3f', demo: true, active: true, phone: '+56 9 7788 1122' },
    { id: 'u-client', name: 'Valentina Rojas', email: 'cliente@demo.cl', password: 'cliente123', role: 'cliente', color: '#1e4db7', demo: true, active: true, phone: '+56 9 8899 3344' }
  ];
  agents[0].email = 'corredor@hogaraustral.cl';
  for (let i = 0; i < 9; i++) {
    const name = person();
    users.push({ id: 'u-c' + i, name, email: mail(name, r.pick(['gmail.com', 'outlook.com', 'yahoo.es'])), password: 'demo123', role: r.bool(.7) ? 'cliente' : 'propietario', color: r.pick(COLORS), active: r.bool(.92), phone: phone(r), createdAt: r.daysAgo(300, 5) });
  }

  // ---------- Propietarios ----------
  const owners = [{ id: 'ow0', name: 'Rodrigo Fuentes', rut: rut(r), email: 'propietario@demo.cl', phone: '+56 9 7788 1122', userId: 'u-owner', createdAt: iso(now - 240 * DAY), notes: 'Inversionista, 3 propiedades con nosotros.' }];
  for (let i = 1; i < 26; i++) {
    const name = person();
    owners.push({ id: 'ow' + i, name, rut: rut(r), email: mail(name, r.pick(['gmail.com', 'outlook.com', 'vtr.net'])), phone: phone(r), createdAt: r.daysAgo(400, 30), notes: r.bool(.3) ? r.pick(['Prefiere contacto por WhatsApp.', 'Vive en el extranjero, firma con poder.', 'Acepta mascotas.', 'Quiere vender antes de marzo.']) : '' });
  }

  // ---------- Propiedades ----------
  const casaHeavy = ['la-reina', 'lo-barnechea', 'penalolen', 'la-florida', 'maipu', 'puente-alto', 'huechuraba'];
  const ORIENT = ['Norte', 'Nororiente', 'Oriente', 'Poniente', 'Norponiente', 'Sur'];
  const ADJ = { venta: ['luminoso', 'con vista despejada', 'remodelado', 'cerca del metro', 'esquina', 'impecable', 'para inversión', 'a pasos de parque'], arriendo: ['amoblado', 'luminoso', 'cerca del metro', 'con terraza', 'pet friendly', 'listo para entrar', 'con estacionamiento'] };
  const TYPE_N = { departamento: 'Departamento', casa: 'Casa', oficina: 'Oficina', local: 'Local comercial', terreno: 'Terreno' };
  const props = [];
  const comunaW = COMUNAS.flatMap(c => Array(['providencia', 'las-condes', 'nunoa', 'santiago', 'vitacura'].includes(c.id) ? 4 : 2).fill(c));
  for (let i = 0; i < 96; i++) {
    const c = r.pick(comunaW);
    const tr = r();
    let type = casaHeavy.includes(c.id) ? (tr < .5 ? 'casa' : tr < .85 ? 'departamento' : tr < .93 ? 'terreno' : 'local')
      : (tr < .7 ? 'departamento' : tr < .8 ? 'casa' : tr < .9 ? 'oficina' : tr < .95 ? 'local' : 'terreno');
    const op = type === 'terreno' ? 'venta' : r.bool(.6) ? 'venta' : 'arriendo';
    let dorms = 0, baths = 1, m2 = 0;
    if (type === 'departamento') { dorms = r.pick([1, 1, 2, 2, 2, 3, 3, 4]); baths = Math.max(1, dorms - r.int(0, 1)); m2 = 30 + dorms * 20 + r.int(-6, 18); }
    else if (type === 'casa') { dorms = r.int(3, 5); baths = r.int(2, 4); m2 = 85 + dorms * 26 + r.int(-10, 60); }
    else if (type === 'oficina') { baths = r.int(1, 2); m2 = r.int(38, 220); }
    else if (type === 'local') { baths = 1; m2 = r.int(28, 160); }
    else { baths = 0; m2 = r.int(320, 2200); }
    const m2Total = type === 'terreno' ? m2 : type === 'casa' ? m2 + r.int(80, 400) : Math.round(m2 * (1.08 + r() * .2));
    const factor = .86 + r() * .3;
    let price, currency;
    if (op === 'venta') { currency = 'UF'; price = Math.round(m2 * c.uf * factor * (type === 'terreno' ? .22 : type === 'casa' ? .82 : 1) / 50) * 50; }
    else { currency = 'CLP'; price = Math.round(m2 * c.rent * factor * (type === 'casa' ? .7 : 1) / 10000) * 10000; }
    const sr = r();
    let status = sr < .64 ? 'publicada' : sr < .72 ? 'reservada' : sr < .82 ? (op === 'venta' ? 'vendida' : 'arrendada') : sr < .91 ? 'revision' : 'borrador';
    const created = now - r.int(6, 260) * DAY;
    const features = [];
    const pool = FEATURES.filter(f => type === 'departamento' || !['Ascensor', 'Conserjería 24h', 'Logia'].includes(f) || type === 'oficina');
    const nf = type === 'terreno' ? 2 : r.int(3, 7);
    while (features.length < nf) { const f = r.pick(pool); if (!features.includes(f)) features.push(f); }
    const agent = r.pick(agents);
    const owner = i < 3 ? owners[0] : r.pick(owners.slice(1));
    if (i === 1) status = 'revision';
    if (i === 0) status = 'publicada';
    const adj = r.pick(ADJ[op]);
    const title = type === 'departamento' || type === 'casa' ? `${TYPE_N[type]} ${dorms}D${baths}B ${adj} en ${c.name}` : `${TYPE_N[type]} ${m2} m² ${adj} en ${c.name}`;
    const history = [{ at: iso(created), to: 'borrador', by: agent.name, note: 'Ficha creada' }];
    const add = (to, d, note) => history.push({ at: iso(created + d * DAY), to, by: to === 'revision' ? agent.name : 'Camila Herrera', note });
    if (status !== 'borrador') add('revision', 1, 'Enviada a revisión');
    if (['publicada', 'reservada', 'vendida', 'arrendada'].includes(status)) add('publicada', 2, 'Aprobada y publicada');
    if (['reservada', 'vendida', 'arrendada'].includes(status)) add('reservada', 3 + r.int(5, 40), 'Reserva con promesa firmada');
    if (['vendida', 'arrendada'].includes(status)) add(status, 4 + r.int(45, 60), op === 'venta' ? 'Escritura firmada' : 'Contrato de arriendo firmado');
    const lastAt = history.at(-1).at;
    props.push({
      id: 'p' + String(i + 1).padStart(3, '0'), code: 'HA-' + (2100 + i * 7), title, op, type, comuna: c.id,
      address: `${r.pick(c.streets)} ${r.int(100, 9800)}${type === 'departamento' || type === 'oficina' ? `, depto ${r.int(2, 22)}0${r.int(1, 8)}` : ''}`,
      price, currency, dorms, baths, m2, m2Total, parking: type === 'terreno' ? 0 : r.int(0, type === 'casa' ? 3 : 2), storage: type === 'departamento' ? r.int(0, 1) : 0,
      year: type === 'terreno' ? null : r.int(1982, 2025), floor: type === 'departamento' || type === 'oficina' ? r.int(1, 24) : null,
      orientation: r.pick(ORIENT), expenses: type === 'departamento' || type === 'oficina' ? Math.round(m2 * (1400 + r.int(0, 1200)) / 1000) * 1000 : 0,
      features, status, agentId: agent.id, ownerId: owner.id, featured: false, views: r.int(40, 2400),
      description: `${title}. ${type === 'terreno' ? 'Terreno plano con factibilidad de agua y luz, ideal para proyecto habitacional.' : `Propiedad de ${m2} m² útiles con orientación ${r.pick(ORIENT).toLowerCase()}, ${r.pick(['excelente luz natural', 'muy silenciosa', 'terminaciones de primer nivel', 'espacios bien distribuidos'])}.`} ${r.pick(['Entorno con comercio, colegios y áreas verdes.', 'A pocas cuadras de transporte público y ciclovías.', 'Barrio residencial consolidado y tranquilo.', 'Excelente conectividad con autopistas urbanas.'])} ${op === 'arriendo' ? 'Se solicita renta líquida de 3 veces el valor del arriendo y aval.' : 'Acepta crédito hipotecario.'}`,
      x: Math.round(c.x + r.int(-17, 17)), y: Math.round(c.y + r.int(-15, 15)), art: r.int(0, 5),
      createdAt: iso(created), publishedAt: history.find(h => h.to === 'publicada')?.at || null, statusAt: lastAt, history
    });
  }
  // Destacadas
  const featuredIds = props.filter(p => p.status === 'publicada').slice(0, 6).map(p => p.id);
  featuredIds.forEach(id => { props.find(p => p.id === id).featured = true; });

  // ---------- Proyectos nuevos ----------
  const devs = ['Inmobiliaria Cordillera Sur', 'Grupo Andesur', 'Altavista Desarrollos', 'Valle Alto Inmobiliaria'];
  const projDefs = [
    ['Edificio Mirador Los Leones', 'providencia', 'entrega inmediata'], ['Parque Irarrázaval', 'nunoa', 'en blanco'], ['Altos de La Dehesa', 'lo-barnechea', 'en verde'],
    ['Terrazas de Macul', 'macul', 'en blanco'], ['Condominio Las Araucarias', 'la-florida', 'entrega inmediata'], ['Barrio Yungay Vivo', 'santiago', 'en verde'], ['Plaza Apoquindo Lofts', 'las-condes', 'en blanco']
  ];
  const projects = projDefs.map(([name, com, stage], i) => {
    const c = COMUNAS.find(x => x.id === com);
    const isHouse = com === 'lo-barnechea' || com === 'la-florida';
    const typologies = (isHouse ? [[3, 2, 110], [4, 3, 142], [4, 4, 168]] : [[1, 1, 38], [2, 2, 58], [3, 2, 78]]).map(([d, b, m], k) => ({
      name: isHouse ? `Casa tipo ${'ABC'[k]}` : `Tipo ${'ABC'[k]} · ${d}D${b}B`, dorms: d, baths: b, m2: m, fromUF: Math.round(m * c.uf * (isHouse ? .78 : 1.04) / 10) * 10, stock: r.int(2, 18)
    }));
    return {
      id: 'pr' + (i + 1), name, comuna: com, developer: r.pick(devs), stage, delivery: stage === 'entrega inmediata' ? 'Inmediata' : `${r.pick(['1er', '2do'])} semestre ${stage === 'en blanco' ? 2027 : 2028}`,
      address: `${r.pick(c.streets)} ${r.int(200, 7000)}`, units: r.int(60, 240), typologies, fromUF: Math.min(...typologies.map(t => t.fromUF)),
      amenities: r.pick([['Piscina temperada', 'Gimnasio', 'Cowork', 'Quincho', 'Bicicletero'], ['Áreas verdes', 'Sala de juegos', 'Lavandería', 'Quincho'], ['Rooftop', 'Piscina', 'Gimnasio', 'Sala de cine', 'Pet spa']]),
      description: `${name} es un proyecto de ${devs[i % devs.length]} en ${c.name}, con ${isHouse ? 'casas de dos pisos en condominio cerrado' : 'departamentos eficientes, terminaciones de calidad y certificación energética'}. ${r.pick(['Subsidio DS19 disponible en algunas unidades.', 'Pie en cuotas hasta la entrega.', 'Bono pie de hasta 10%.'])}`,
      published: i !== 6, featured: i < 3, art: i % 6, x: c.x, y: c.y, createdAt: r.daysAgo(200, 20)
    };
  });

  // ---------- Leads ----------
  const SOURCES = ['web', 'web', 'web', 'portal', 'teléfono', 'referido', 'redes'];
  const MSG = ['Hola, me interesa la propiedad. ¿Sigue disponible?', '¿Aceptan crédito hipotecario con subsidio?', 'Quisiera coordinar una visita esta semana.', '¿El precio es conversable?', '¿Tiene estacionamiento incluido?', 'Busco algo similar en la misma comuna.', '¿Se aceptan mascotas?', '¿Cuánto son los gastos comunes?'];
  const leads = [];
  const visible = props.filter(p => p.status !== 'borrador');
  for (let i = 0; i < 170; i++) {
    const age = Math.floor(Math.pow(r(), 1.5) * 120);
    const p = r.pick(visible);
    const name = person();
    let status = age < 3 ? r.pick(['nuevo', 'nuevo', 'contactado']) : age < 15 ? r.pick(['nuevo', 'contactado', 'contactado', 'visita', 'negociacion']) : r.pick(['contactado', 'visita', 'negociacion', 'ganado', 'perdido', 'perdido', 'ganado']);
    const assigned = status === 'nuevo' && r.bool(.35) ? null : p.agentId;
    const at = now - age * DAY - r.int(0, 20) * 3600e3;
    const notes = [];
    if (status !== 'nuevo') notes.push({ id: 'n' + i + 'a', at: iso(at + 3600e3 * r.int(2, 30)), by: agents.find(a => a.id === p.agentId).name, text: r.pick(['Llamé, interesado. Envío ficha por correo.', 'No contesta, dejé mensaje por WhatsApp.', 'Tiene preaprobación bancaria.', 'Busca mudarse en 2 meses.', 'Pide rebaja de 5%.']) });
    if (['negociacion', 'ganado'].includes(status)) notes.push({ id: 'n' + i + 'b', at: iso(at + DAY * r.int(2, 8)), by: agents.find(a => a.id === p.agentId).name, text: r.pick(['Oferta formal enviada al propietario.', 'Propietario acepta contraoferta.', 'Firmamos orden de visita y reserva.']) });
    leads.push({ id: 'l' + String(i + 1).padStart(3, '0'), propertyId: p.id, name, email: mail(name, r.pick(['gmail.com', 'outlook.com', 'icloud.com'])), phone: phone(r), message: r.pick(MSG), source: r.pick(SOURCES), status, agentId: assigned, createdAt: iso(at), notes, userId: i % 23 === 0 ? 'u-client' : null });
  }

  // ---------- Visitas ----------
  const visits = [];
  const pub = props.filter(p => ['publicada', 'reservada'].includes(p.status));
  for (let i = 0; i < 96; i++) {
    const offset = r.int(-75, 16);
    const p = r.pick(pub);
    const d = new Date(now + offset * DAY); d.setHours(r.pick([10, 11, 12, 15, 16, 17, 18]), 0, 0, 0);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    const lead = r.bool(.6) ? r.pick(leads) : null;
    const name = lead ? lead.name : person();
    visits.push({ id: 'v' + String(i + 1).padStart(3, '0'), propertyId: p.id, agentId: p.agentId, clientName: name, email: lead ? lead.email : mail(name, 'gmail.com'), phone: lead ? lead.phone : phone(r), leadId: lead?.id || null,
      date: iso(d), status: offset < 0 ? r.pick(['realizada', 'realizada', 'realizada', 'cancelada']) : r.pick(['pendiente', 'confirmada', 'confirmada']), userId: i % 17 === 0 ? 'u-client' : null, createdAt: iso(d.getTime() - r.int(1, 8) * DAY),
      feedback: offset < 0 && r.bool(.5) ? r.pick(['Le gustó, evaluará con su familia.', 'Encontró pequeña la cocina.', 'Muy interesado, pedirá crédito.', 'Prefiere piso más alto.']) : '' });
  }
  visits.sort((a, b) => b.date.localeCompare(a.date));

  // ---------- Contratos de arriendo ----------
  const rentals = props.filter(p => p.op === 'arriendo' && ['arrendada', 'reservada', 'publicada'].includes(p.status)).slice(0, 14);
  const contracts = rentals.map((p, i) => {
    const months = r.pick([12, 12, 24]);
    const startAgo = p.status === 'arrendada' ? r.int(1, 14) : r.int(13, 20);
    const start = new Date(now); start.setDate(1); start.setMonth(start.getMonth() - startAgo);
    const ended = startAgo >= months;
    const payments = [];
    const cur = new Date(now); cur.setDate(1);
    for (let m = 0; m <= Math.min(startAgo, months - 1); m++) {
      const d = new Date(start); d.setMonth(d.getMonth() + m);
      if (d > cur) break;
      const key = d.toISOString().slice(0, 7);
      const isCur = key === cur.toISOString().slice(0, 7);
      const late = !isCur && r.bool(.08);
      const paid = isCur ? r.bool(.55) : !late;
      payments.push({ month: key, amount: p.price, status: paid ? 'pagado' : isCur ? 'pendiente' : 'atrasado', paidAt: paid ? iso(new Date(d.getFullYear(), d.getMonth(), r.int(1, 8), 12)) : null, method: paid ? r.pick(['Transferencia', 'Transferencia', 'Depósito', 'PAC']) : null });
    }
    const tenant = person();
    return { id: 'c' + (i + 1), propertyId: p.id, ownerId: p.ownerId, agentId: p.agentId, tenantName: tenant, tenantRut: rut(r), tenantEmail: mail(tenant, 'gmail.com'), tenantPhone: phone(r),
      start: start.toISOString().slice(0, 10), months, rent: p.price, deposit: p.price, commission: Math.round(p.price * .5), status: ended ? 'terminado' : 'vigente', payments, createdAt: start.toISOString() };
  });

  // ---------- Cuenta del cliente demo ----------
  const pubIds = props.filter(p => p.status === 'publicada').map(p => p.id);
  const favorites = [pubIds[2], pubIds[5], pubIds[9], pubIds[14], pubIds[20]].map((pid, i) => ({ id: 'f' + i, userId: 'u-client', propertyId: pid, createdAt: iso(now - (i + 2) * 4 * DAY) }));
  const savedSearches = [
    { id: 's1', userId: 'u-client', name: 'Depto 2D en Ñuñoa o Providencia', query: { op: 'venta', tipo: 'departamento', comuna: 'nunoa', dorm: '2', max: '6500', unit: 'UF' }, alerts: true, createdAt: iso(now - 30 * DAY), lastSeen: iso(now - 6 * DAY) },
    { id: 's2', userId: 'u-client', name: 'Arriendo cerca del metro', query: { op: 'arriendo', comuna: 'providencia', max: '900000', unit: 'CLP' }, alerts: false, createdAt: iso(now - 12 * DAY), lastSeen: iso(now - 12 * DAY) }
  ];
  const notifications = [
    { id: 'nt1', userId: 'u-client', text: 'Nueva propiedad coincide con «Depto 2D en Ñuñoa o Providencia»', link: '#/propiedad/' + pubIds[3], read: false, createdAt: iso(now - 2 * DAY) },
    { id: 'nt2', userId: 'u-client', text: 'Tu visita fue confirmada por el corredor', link: '#/cuenta/visitas', read: false, createdAt: iso(now - 4 * DAY) },
    { id: 'nt3', userId: 'u-client', text: 'Bajó el precio de una propiedad en tus favoritos', link: '#/propiedad/' + pubIds[5], read: true, createdAt: iso(now - 9 * DAY) },
    { id: 'nt4', userId: 'u-owner', text: 'Tu propiedad está en revisión por nuestro equipo', link: '#/cuenta/propiedades', read: false, createdAt: iso(now - 1 * DAY) }
  ];

  // ---------- Bitácora inicial ----------
  const LOGS = [['login', 'Camila Herrera inició sesión', 'u-admin'], ['propiedad', 'HA-2107: revision → publicada', 'u-admin'], ['lead', 'Nuevo contacto web por HA-2135', null], ['visita', 'Visita confirmada para HA-2142', 'u-ag1'],
    ['cms', 'Camila Herrera actualizó la portada', 'u-admin'], ['cobranza', 'Arriendo de octubre registrado como pagado', 'u-admin'], ['usuarios', 'Camila Herrera creó una cuenta de corredor', 'u-admin'], ['propiedad', 'Ignacio Valdés creó HA-2310', 'u-ag1'],
    ['configuración', 'Valor UF actualizado', 'u-admin'], ['lead', 'Camila Herrera distribuyó 6 leads automáticamente', 'u-admin'], ['proyecto', 'Martín Ossandón editó Parque Irarrázaval', 'u-editor'], ['propiedad', 'HA-2163: publicada → reservada', 'u-ag3']];
  const _log = Array.from({ length: 36 }, (_, i) => { const [action, detail, user] = LOGS[i % LOGS.length]; return { id: 'lg' + i, at: iso(now - (i * 9 + r.int(1, 8)) * 3600e3), action, detail, user }; });
  return {
    _log, users, agents, offices, owners, properties: props, projects, leads, visits, contracts, favorites, savedSearches, notifications,
    settings: {
      brand: 'Hogar Austral', heroTitle: 'Encuentra tu lugar en Santiago', heroSubtitle: 'Más de 90 propiedades verificadas en venta y arriendo, con corredores que conocen cada barrio.',
      heroCta: 'Buscar propiedades', uf: 40215.37, ufDate: new Date(now).toISOString().slice(0, 10), rate: 4.39, years: 25, downPct: 20,
      phone: '+56 2 2940 1000', email: 'contacto@hogaraustral.cl', whatsapp: '+56 9 4000 2026', address: 'Av. Providencia 1890, Providencia',
      featuredIds, showProjects: true, showComunas: true,
      banners: [
        { id: 'b1', title: 'Tasa preferente 4,2% para clientes Hogar Austral', text: 'Convenio con banco asociado para crédito hipotecario hasta el 31 de diciembre.', link: '#/buscar?op=venta', active: true, tone: 'primary' },
        { id: 'b2', title: '¿Quieres vender o arrendar?', text: 'Publica gratis y un corredor te contacta en menos de 24 horas.', link: '#/publicar', active: true, tone: 'accent' },
        { id: 'b3', title: 'Feria de proyectos nuevos', text: 'Bono pie de hasta 10% en proyectos seleccionados.', link: '#/proyectos', active: false, tone: 'info' }
      ]
    }
  };
}
