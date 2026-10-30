// Datos semilla de Gremio (reproducibles con rng()): freelancers, clientes, servicios, pedidos e historial.
import { rng } from '../../../assets/core/db.js';

const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777', '#0d9488', '#9333ea', '#ea580c', '#4f46e5', '#16a34a'];
export const PKGS = ['basico', 'estandar', 'premium'];
export const PKG_NAMES = { basico: 'Básico', estandar: 'Estándar', premium: 'Premium' };

export const CATEGORIES = [
  { id: 'diseno', name: 'Diseño', icon: '✏️', description: 'Logos, identidad de marca, ilustración y diseño web.', order: 1 },
  { id: 'desarrollo', name: 'Desarrollo', icon: '💻', description: 'Sitios web, tiendas online, apps y automatizaciones.', order: 2 },
  { id: 'marketing', name: 'Marketing', icon: '📈', description: 'Redes sociales, SEO, publicidad digital y estrategia.', order: 3 },
  { id: 'traduccion', name: 'Traducción', icon: '🌐', description: 'Traducción, localización, subtítulos y corrección.', order: 4 },
  { id: 'video', name: 'Video', icon: '🎬', description: 'Edición, animación, motion graphics y reels.', order: 5 }
];

const FREELANCERS = [
  ['f1', 'Diego Araya', 'diego@gremio.cl', 'diseno', 'Diseñador de marca e identidad visual', 'Valparaíso', ['Branding', 'Logos', 'Illustrator', 'Figma'], true],
  ['f2', 'Fernanda Lillo', 'fernanda.lillo@correo.cl', 'diseno', 'Ilustradora y diseñadora editorial', 'Santiago', ['Ilustración', 'Editorial', 'Procreate']],
  ['f3', 'Matías Orellana', 'matias.dev@correo.cl', 'desarrollo', 'Desarrollador full stack', 'Concepción', ['React', 'Node.js', 'WordPress', 'Shopify']],
  ['f4', 'Camila Ríos', 'camila.rios@correo.cl', 'desarrollo', 'Desarrolladora de tiendas online', 'Santiago', ['Shopify', 'WooCommerce', 'Webpay']],
  ['f5', 'Joaquín Pavez', 'joaquin.pavez@correo.cl', 'desarrollo', 'Automatizaciones y apps no-code', 'Temuco', ['Zapier', 'Airtable', 'Bubble']],
  ['f6', 'Valentina Rojas', 'vale.rojas@correo.cl', 'marketing', 'Estratega de redes sociales', 'Viña del Mar', ['Instagram', 'TikTok', 'Contenido']],
  ['f7', 'Sebastián Cortés', 'seba.seo@correo.cl', 'marketing', 'Especialista SEO y Google Ads', 'Santiago', ['SEO', 'Google Ads', 'Analytics']],
  ['f8', 'Antonia Paredes', 'antonia.paredes@correo.cl', 'marketing', 'Copywriter y email marketing', 'La Serena', ['Copywriting', 'Mailchimp', 'Branding verbal']],
  ['f9', 'Isabel Thompson', 'isabel.t@correo.cl', 'traduccion', 'Traductora inglés–español certificada', 'Santiago', ['Inglés', 'Legal', 'Técnica']],
  ['f10', 'Lukas Weber', 'lukas.weber@correo.cl', 'traduccion', 'Traductor alemán y portugués', 'Puerto Varas', ['Alemán', 'Portugués', 'Localización']],
  ['f11', 'Rocío Figueroa', 'rocio.subs@correo.cl', 'traduccion', 'Subtituladora y correctora de estilo', 'Valdivia', ['Subtítulos', 'Corrección', 'SRT']],
  ['f12', 'Tomás Herrera', 'tomas.video@correo.cl', 'video', 'Editor de video y reels', 'Santiago', ['Premiere', 'Reels', 'YouTube']],
  ['f13', 'Martina Fuentes', 'martina.motion@correo.cl', 'video', 'Animadora 2D y motion graphics', 'Antofagasta', ['After Effects', 'Motion', 'Explainers']],
  ['f14', 'Nicolás Vera', 'nico.vera@correo.cl', 'video', 'Videógrafo y colorista', 'Puerto Montt', ['DaVinci', 'Color', 'Drone']],
  ['f15', 'Javiera Sanhueza', 'javi.ux@correo.cl', 'diseno', 'Diseñadora UX/UI', 'Santiago', ['UX', 'UI', 'Figma', 'Prototipos']],
  ['f16', 'Gabriel Muñoz', 'gabo.wp@correo.cl', 'desarrollo', 'Desarrollador WordPress', 'Rancagua', ['WordPress', 'Elementor', 'PHP']]
];

const GIGS = {
  diseno: [['Diseño de logo profesional con manual de marca', [35000, 75000, 150000], [3, 5, 7], ['Logo', 'Branding', 'Marca']], ['Ilustración personalizada para tu marca o libro', [25000, 60000, 120000], [4, 6, 10], ['Ilustración', 'Personajes']], ['Diseño de interfaz UX/UI para app o web', [90000, 220000, 450000], [5, 10, 18], ['UX', 'UI', 'Figma']], ['Kit de piezas para redes sociales', [20000, 45000, 85000], [2, 4, 6], ['Redes', 'Plantillas']]],
  desarrollo: [['Sitio web WordPress autoadministrable', [120000, 280000, 520000], [5, 10, 20], ['WordPress', 'Web']], ['Tienda Shopify lista para vender con Webpay', [180000, 350000, 690000], [7, 12, 21], ['Shopify', 'E-commerce']], ['Landing page en React rápida y optimizada', [90000, 180000, 320000], [4, 7, 12], ['React', 'Landing']], ['Automatiza tu negocio con Zapier y Airtable', [45000, 110000, 240000], [2, 5, 9], ['Automatización', 'No-code']]],
  marketing: [['Gestión mensual de Instagram y TikTok', [80000, 160000, 290000], [7, 7, 7], ['Instagram', 'TikTok']], ['Auditoría SEO completa y plan de acción', [60000, 140000, 260000], [4, 7, 12], ['SEO', 'Google']], ['Campaña de Google Ads configurada y optimizada', [70000, 150000, 300000], [3, 6, 10], ['Google Ads', 'SEM']], ['Textos que venden: copy para web y correos', [30000, 70000, 140000], [2, 4, 6], ['Copywriting', 'Email']]],
  traduccion: [['Traducción inglés–español nativa y precisa', [15000, 40000, 90000], [1, 3, 5], ['Inglés', 'Traducción']], ['Traducción alemán o portugués ↔ español', [22000, 55000, 110000], [2, 4, 7], ['Alemán', 'Portugués']], ['Subtítulos profesionales para tus videos', [18000, 42000, 85000], [1, 3, 5], ['Subtítulos', 'SRT']], ['Corrección de estilo y ortotipografía', [12000, 30000, 65000], [1, 3, 5], ['Corrección', 'Edición']]],
  video: [['Edición de reels y shorts que retienen', [20000, 55000, 110000], [2, 4, 7], ['Reels', 'Shorts']], ['Video animado explicativo 2D', [120000, 260000, 480000], [7, 12, 20], ['Animación', 'Explainer']], ['Edición profesional para YouTube', [35000, 80000, 160000], [2, 4, 6], ['YouTube', 'Edición']], ['Corrección de color cinematográfica', [40000, 90000, 180000], [3, 5, 8], ['Color', 'DaVinci']]]
};
const GIG_BY_FREELANCER = { f1: [['diseno', 0], ['diseno', 3]], f2: [['diseno', 1]], f15: [['diseno', 2], ['diseno', 3]], f3: [['desarrollo', 2], ['desarrollo', 0]], f4: [['desarrollo', 1]], f5: [['desarrollo', 3]], f16: [['desarrollo', 0]], f6: [['marketing', 0]], f7: [['marketing', 1], ['marketing', 2]], f8: [['marketing', 3]], f9: [['traduccion', 0], ['traduccion', 3]], f10: [['traduccion', 1]], f11: [['traduccion', 2], ['traduccion', 3]], f12: [['video', 0], ['video', 2]], f13: [['video', 1]], f14: [['video', 3]] };

const CLIENTS = ['Carla Méndez|Café Brote', 'Rodrigo Salinas|Ferretería Salinas', 'Paula Ibáñez|Estudio Ibáñez Arquitectos', 'Felipe Contreras|Viña Cerro Azul', 'Daniela Soto|Yoga Raíz', 'Andrés Poblete|Poblete Abogados', 'María Paz Guzmán|Tienda Lana Sur', 'Cristóbal Ramírez|App Rutea', 'Francisca León|Pastelería Dulce Nido', 'Ignacio Bravo|Bravo Bikes', 'Catalina Muñoz|Clínica Dental Sonríe', 'Pablo Espinoza|Podcast Sobremesa', 'Josefina Aguirre|Editorial Pehuén', 'Vicente Lagos|Constructora Lagos', 'Constanza Vidal|Moda Circular', 'Martín Toro|Startup Agrolink', 'Trinidad Cáceres|Agencia Nómade', 'Benjamín Silva|Cervecería Kunza', 'Agustina Reyes|ONG Mar Limpio', 'Gonzalo Pino|Inmobiliaria Pino', 'Sofía Navarro|Escuela de Música Allegro', 'Matías Núñez|Gimnasio Núcleo', 'Emilia Castro|Florería Pétalo', 'Lucas Jara|Turismo Patagonia Viva'];
const REVIEWS_POS = ['Excelente trabajo, superó mis expectativas. Muy recomendable.', 'Rápido, profesional y muy buena comunicación durante todo el proceso.', 'Entendió perfecto lo que necesitaba. Volveré a contratar.', 'La calidad es increíble para el precio. ¡Gracias!', 'Muy atento a los detalles e hizo los ajustes sin problema.', 'Cumplió los plazos y el resultado quedó impecable.'];
const REVIEWS_MID = ['Buen resultado, aunque tomó un poco más de lo esperado.', 'Correcto, cumplió con lo pedido. Faltó algo de creatividad.', 'Trabajo aceptable, tuve que pedir varias correcciones.'];
const FAQS = [['¿Qué necesitas para comenzar?', 'Un breve con tus objetivos, referencias que te gusten y los textos o materiales que tengas.'], ['¿Puedo pedir cambios?', 'Sí, cada paquete incluye revisiones. Cambios adicionales se cotizan aparte.'], ['¿Entregas archivos editables?', 'En los paquetes Estándar y Premium entrego los archivos fuente.']];

export function seed() {
  const R = rng(9911);
  const now = Date.now();
  const ago = (d, h = 12) => new Date(now - d * 864e5 + (h - 12) * 36e5).toISOString();
  const users = [
    { id: 'u-admin', name: 'Ignacia Vidal', email: 'admin@gremio.cl', password: 'admin123', role: 'admin', title: 'Gerenta de operaciones', color: '#7c3aed', demo: true, active: true, createdAt: ago(600) },
    { id: 'u-mod', name: 'Bruno Lagos', email: 'mod@gremio.cl', password: 'mod123', role: 'moderador', title: 'Moderador de contenido', color: '#0891b2', demo: true, active: true, createdAt: ago(400) },
    { id: 'u-sop', name: 'Paz Molina', email: 'soporte@gremio.cl', password: 'soporte123', role: 'soporte', title: 'Soporte y disputas', color: '#059669', demo: true, active: true, createdAt: ago(380) }
  ];
  FREELANCERS.forEach(([id, name, email, cat, title, city, skills, demo], i) => users.push({
    id, name, email, password: 'free123', role: 'freelancer', title, city, skills, mainCategory: cat, color: COLORS[i % COLORS.length], demo: !!demo, active: true,
    verified: i % 5 !== 3, languages: cat === 'traduccion' ? ['Español', 'Inglés', ...(id === 'f10' ? ['Alemán', 'Portugués'] : [])] : ['Español', ...(R.bool(.5) ? ['Inglés'] : [])],
    bio: `Hola, soy ${name.split(' ')[0]}. ${title} con ${R.int(3, 12)} años de experiencia ayudando a pymes y emprendimientos chilenos a crecer. Trabajo de forma ordenada, con plazos claros y comunicación constante.`,
    responseHrs: R.pick([1, 2, 3, 6, 12]), payout: { bank: R.pick(['Banco Estado', 'Banco de Chile', 'Santander', 'BCI']), account: `****${R.int(1000, 9999)}` },
    portfolio: Array.from({ length: R.int(3, 6) }, (_, k) => ({ id: `${id}-p${k}`, title: R.pick(['Proyecto para cafetería', 'Rebranding tienda online', 'Campaña de lanzamiento', 'Sitio corporativo', 'Video institucional', 'Manual de marca', 'Traducción de catálogo', 'App de reservas']), hue: (i * 37 + k * 61) % 6 })),
    createdAt: ago(R.int(120, 900))
  }));
  CLIENTS.forEach((c, i) => { const [name, company] = c.split('|'); users.push({ id: i === 0 ? 'c1' : `c${i + 1}`, name, company, email: i === 0 ? 'carla@cafebrote.cl' : `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i}@correo.cl`, password: 'cliente123', role: 'cliente', color: COLORS[(i + 5) % COLORS.length], demo: i === 0, active: i !== 17, verified: R.bool(.7), favorites: [], city: R.pick(['Santiago', 'Valparaíso', 'Concepción', 'Puerto Montt', 'Talca', 'La Serena']), createdAt: ago(R.int(20, 500)) }); });
  users.push({ id: 'f-new', name: 'Renata Silva', email: 'renata.silva@correo.cl', password: 'free123', role: 'freelancer', title: 'Diseñadora gráfica junior', city: 'Talca', skills: ['Canva', 'Illustrator'], mainCategory: 'diseno', color: '#db2777', active: true, verified: false, languages: ['Español'], bio: 'Recién egresada, con muchas ganas de aprender y crear.', responseHrs: 4, portfolio: [], payout: null, createdAt: ago(3) });

  // --- Servicios (gigs) ---
  const gigs = [];
  Object.entries(GIG_BY_FREELANCER).forEach(([fid, list]) => list.forEach(([cat, idx], k) => {
    const [title, prices, days, tags] = GIGS[cat][idx];
    const f = (p, i) => Math.round(p * (0.85 + R() * 0.3) / 1000) * 1000;
    const pk = {};
    PKGS.forEach((p, i) => {
      pk[p] = { name: PKG_NAMES[p], desc: ['Lo esencial para partir.', 'La opción más elegida: completo y equilibrado.', 'Todo incluido, prioridad y extras.'][i], price: f(prices[i], i), days: days[i], revisions: [1, 3, 6][i], features: [['1 propuesta', 'Archivo final en alta'], ['3 propuestas', 'Archivos fuente', 'Uso comercial'], ['5 propuestas', 'Archivos fuente', 'Uso comercial', 'Entrega prioritaria', 'Soporte 30 días']][i] };
    });
    gigs.push({ id: `g-${fid}-${k}`, freelancerId: fid, categoryId: cat, title, tags, packages: pk, faq: FAQS.slice(0, 2 + (k % 2)).map(([q, a]) => ({ q, a })),
      description: `${title}. Trabajo contigo paso a paso: primero entendemos tu negocio y objetivos, luego propongo, ajustamos juntos y entrego todo listo para usar.\n\nIdeal para emprendimientos, pymes y profesionales independientes que buscan un resultado profesional sin complicaciones.`,
      status: 'activo', featured: false, hue: (gigs.length * 41) % 6, impressions: R.int(300, 9000), createdAt: ago(R.int(60, 400)) });
  }));
  gigs.push({ id: 'g-new-0', freelancerId: 'f-new', categoryId: 'diseno', title: 'Diseño de flyers y afiches para tu evento', tags: ['Flyer', 'Afiche'], packages: { basico: { name: 'Básico', desc: 'Un flyer.', price: 8000, days: 2, revisions: 1, features: ['1 diseño'] }, estandar: { name: 'Estándar', desc: 'Flyer + historia.', price: 15000, days: 3, revisions: 2, features: ['2 formatos'] }, premium: { name: 'Premium', desc: 'Pack completo.', price: 28000, days: 4, revisions: 4, features: ['4 formatos', 'Editable'] } }, faq: [], description: 'Diseño flyers atractivos para fiestas, ferias y eventos.', status: 'pendiente', featured: false, hue: 2, impressions: 0, createdAt: ago(1) });
  gigs.push({ id: 'g-f8-x', freelancerId: 'f8', categoryId: 'marketing', title: 'Seguidores reales garantizados para Instagram', tags: ['Instagram'], packages: { basico: { name: 'Básico', desc: '1.000 seguidores.', price: 9000, days: 1, revisions: 0, features: ['1.000 seguidores'] }, estandar: { name: 'Estándar', desc: '5.000.', price: 30000, days: 2, revisions: 0, features: ['5.000 seguidores'] }, premium: { name: 'Premium', desc: '20.000.', price: 90000, days: 3, revisions: 0, features: ['20.000 seguidores'] } }, faq: [], description: 'Aumenta tus seguidores rápidamente.', status: 'pendiente', featured: false, hue: 4, impressions: 0, createdAt: ago(2), flags: 2 });
  gigs.push({ id: 'g-f5-x', freelancerId: 'f5', categoryId: 'desarrollo', title: 'Chatbot de WhatsApp para atención de clientes', tags: ['WhatsApp', 'Bot'], packages: { basico: { name: 'Básico', desc: 'Menú simple.', price: 60000, days: 4, revisions: 1, features: ['Menú de 5 opciones'] }, estandar: { name: 'Estándar', desc: 'Con integración.', price: 140000, days: 7, revisions: 2, features: ['Integración planilla'] }, premium: { name: 'Premium', desc: 'IA y CRM.', price: 290000, days: 12, revisions: 4, features: ['Respuestas inteligentes', 'CRM'] } }, faq: [], description: 'Automatiza respuestas frecuentes de tu negocio en WhatsApp.', status: 'pendiente', featured: false, hue: 1, impressions: 0, createdAt: ago(0.5) });
  gigs.find(g => g.id === 'g-f12-1').status = 'pausado';

  // --- Pedidos con historial de 8 meses ---
  const active = gigs.filter(g => g.status === 'activo' || g.status === 'pausado');
  const clients = users.filter(u => u.role === 'cliente');
  const orders = [], reviews = [], messages = [], disputes = [];
  const FEE = 5, COM = 15;
  const popularity = Object.fromEntries(active.map(g => [g.id, 0.4 + R() * 1.6]));
  const weighted = () => { const tot = active.reduce((a, g) => a + popularity[g.id], 0); let t = R() * tot; for (const g of active) { if ((t -= popularity[g.id]) < 0) return g; } return active[0]; };
  for (let i = 0; i < 170; i++) {
    const g = weighted();
    const daysBack = Math.pow(R(), 1.3) * 240;
    const pkg = R() < .35 ? 'basico' : R() < .75 ? 'estandar' : 'premium';
    const c = i % 9 === 0 ? clients[0] : R.pick(clients);
    const p = g.packages[pkg];
    const created = now - daysBack * 864e5;
    const due = created + p.days * 864e5;
    let status = 'completado';
    if (daysBack < p.days + 4) status = R.pick(['pendiente', 'en_progreso', 'en_progreso', 'entregado', 'revision']);
    else if (R() < .05) status = 'cancelado';
    const code = `GR-${String(10230 + i)}`;
    const o = {
      id: `o${i}`, code, gigId: g.id, title: g.title, clientId: c.id, freelancerId: g.freelancerId, categoryId: g.categoryId, pkg, price: p.price,
      serviceFee: Math.round(p.price * FEE / 100), commission: Math.round(p.price * COM / 100), feePct: FEE, comPct: COM, total: p.price + Math.round(p.price * FEE / 100),
      status, escrow: status === 'completado' ? 'liberado' : status === 'cancelado' ? 'reembolsado' : 'retenido',
      due: new Date(due).toISOString(), revisionsMax: p.revisions, revisionsUsed: status === 'revision' ? 1 : (status === 'completado' && R() < .3 ? 1 : 0),
      requirements: R.pick(['Adjunto logo actual y referencias. Colores: verde y crema.', 'Necesito que sea moderno y cercano. Público 25–45 años.', 'Les envío el documento original en Word.', 'Ojalá listo antes del lanzamiento.']),
      deliveries: [], timeline: [{ at: new Date(created).toISOString(), text: 'Pedido realizado y pago retenido en garantía' }],
      createdAt: new Date(created).toISOString(), readBy: {}
    };
    if (['entregado', 'revision', 'completado'].includes(status)) {
      const dAt = new Date(Math.min(now - 3600e3, created + p.days * 864e5 * (0.6 + R() * 0.5))).toISOString();
      o.deliveries.push({ at: dAt, note: 'Te envío la entrega. Quedo atento a tus comentarios.', files: [`entrega_${code.toLowerCase()}.zip`] });
      o.timeline.push({ at: new Date(created + 36e5 * 3).toISOString(), text: 'El freelancer comenzó a trabajar' }, { at: dAt, text: 'Trabajo entregado' });
      o.deliveredAt = dAt;
    } else if (status === 'en_progreso') o.timeline.push({ at: new Date(created + 36e5 * 3).toISOString(), text: 'El freelancer comenzó a trabajar' });
    if (status === 'revision') o.timeline.push({ at: ago(0.5), text: 'El cliente solicitó una revisión' });
    if (status === 'completado') {
      const doneAt = new Date(Math.min(now - 1800e3, new Date(o.deliveries[0].at).getTime() + R.int(1, 3) * 864e5)).toISOString();
      o.completedAt = doneAt; o.timeline.push({ at: doneAt, text: 'El cliente aprobó la entrega y se liberaron los fondos' });
      if (R() < .78) {
        const stars = R() < .75 ? 5 : R() < .7 ? 4 : R() < .6 ? 3 : 2;
        reviews.push({ id: `r${i}`, gigId: g.id, orderId: o.id, freelancerId: g.freelancerId, clientId: c.id, rating: stars, text: stars >= 4 ? R.pick(REVIEWS_POS) : R.pick(REVIEWS_MID), createdAt: doneAt });
        o.reviewed = true;
      }
    }
    if (status === 'cancelado') o.timeline.push({ at: new Date(created + 864e5).toISOString(), text: 'Pedido cancelado y reembolsado al cliente' });
    orders.push(o);
  }
  // Pedidos de la cuenta demo con conversación
  const carlaActive = orders.filter(o => o.clientId === 'c1' && o.status !== 'completado').slice(0, 3);
  const diegoGig = gigs.find(g => g.freelancerId === 'f1');
  const mk = (id, status, daysBack, pkg = 'estandar', clientId = 'c1', gig = diegoGig) => {
    const p = gig.packages[pkg], created = now - daysBack * 864e5;
    const o = { id, code: `GR-${id.toUpperCase()}`, gigId: gig.id, title: gig.title, clientId, freelancerId: gig.freelancerId, categoryId: gig.categoryId, pkg, price: p.price, serviceFee: Math.round(p.price * FEE / 100), commission: Math.round(p.price * COM / 100), feePct: FEE, comPct: COM, total: p.price + Math.round(p.price * FEE / 100), status, escrow: 'retenido', due: new Date(created + p.days * 864e5).toISOString(), revisionsMax: p.revisions, revisionsUsed: 0, requirements: 'Necesitamos renovar la marca de la cafetería: algo cálido, artesanal y moderno. Adjunto fotos del local.', deliveries: [], timeline: [{ at: new Date(created).toISOString(), text: 'Pedido realizado y pago retenido en garantía' }, { at: new Date(created + 5 * 36e5).toISOString(), text: 'El freelancer comenzó a trabajar' }], createdAt: new Date(created).toISOString(), readBy: {} };
    orders.push(o); return o;
  };
  const od = mk('demo1', 'entregado', 5);
  od.deliveries.push({ at: ago(0.3), note: 'Hola Carla, adjunto 3 propuestas de logo y una aplicación en vaso y letrero. ¡Cuéntame cuál te gusta más!', files: ['brote_propuestas_v1.pdf', 'brote_mockups.zip'] });
  od.timeline.push({ at: ago(0.3), text: 'Trabajo entregado' }); od.deliveredAt = ago(0.3);
  const od2 = mk('demo2', 'en_progreso', 2, 'basico', 'c1', gigs.find(g => g.id === 'g-f1-1'));
  const od3 = mk('demo3', 'pendiente', 0.2, 'estandar', 'c5');
  od3.timeline = od3.timeline.slice(0, 1);
  [[od, [['c1', 'Hola Diego! Te dejo las fotos del local y nuestra paleta actual.', ['local_brote.jpg']], ['f1', '¡Gracias Carla! Me encanta el espacio. Empiezo hoy con los bocetos.'], ['f1', 'Hola Carla, adjunto 3 propuestas de logo. ¡Cuéntame cuál te gusta más!', ['brote_propuestas_v1.pdf']]]],
    [od2, [['c1', 'Hola, ¿podrías incluir la versión en blanco y negro?'], ['f1', 'Claro, la incluyo sin costo adicional 👍']]],
    [od3, [['c5', 'Hola Diego, necesito el logo para mi estudio de yoga. ¿Cuándo podrías partir?']]]].forEach(([o, list]) => list.forEach(([from, text, files], k) => messages.push({ id: `m-${o.id}-${k}`, orderId: o.id, from, text, files: (files || []).map(n => ({ name: n, size: `${R.int(200, 4800)} KB` })), at: new Date(new Date(o.createdAt).getTime() + (k + 1) * 3 * 36e5).toISOString() })));
  od.readBy = { f1: ago(0.2) }; od2.readBy = { c1: ago(0.1), f1: ago(0.1) };
  orders.filter(o => !o.id.startsWith('demo') && o.status !== 'completado' && o.status !== 'cancelado').forEach((o, k) => {
    messages.push({ id: `m-x${k}a`, orderId: o.id, from: o.clientId, text: 'Hola, adjunto la información para comenzar. ¡Gracias!', files: [{ name: 'brief.pdf', size: '820 KB' }], at: new Date(new Date(o.createdAt).getTime() + 36e5).toISOString() });
    messages.push({ id: `m-x${k}b`, orderId: o.id, from: o.freelancerId, text: 'Recibido, comienzo de inmediato. Te mantengo al tanto.', files: [], at: new Date(new Date(o.createdAt).getTime() + 3 * 36e5).toISOString() });
  });
  void carlaActive;

  // --- Disputas ---
  const dispCand = orders.filter(o => o.status === 'completado' && !o.reviewed).slice(0, 3);
  const dispActive = orders.filter(o => ['entregado', 'revision', 'en_progreso'].includes(o.status) && !o.id.startsWith('demo')).slice(0, 3);
  dispActive.forEach((o, k) => {
    o.status = 'disputa'; o.timeline.push({ at: ago(k + 0.5), text: 'Se abrió una disputa' });
    disputes.push({ id: `d${k}`, orderId: o.id, openedBy: o.clientId, reason: ['La entrega no corresponde a lo acordado', 'El freelancer no responde', 'Entrega fuera de plazo'][k], status: k === 2 ? 'en_revision' : 'abierta', createdAt: ago(k + 0.5),
      evidence: [{ by: o.clientId, text: ['Pedí un estilo minimalista y recibí algo totalmente distinto. Adjunto el brief original.', 'Han pasado 5 días sin respuesta a mis mensajes.', 'El plazo venció hace 3 días y aún no recibo nada.'][k], files: ['brief_original.pdf'], at: ago(k + 0.5) }, ...(k !== 1 ? [{ by: o.freelancerId, text: 'Entregué según el brief y ofrecí revisiones sin costo. Adjunto conversación.', files: ['captura_chat.png'], at: ago(k + 0.2) }] : [])] });
  });
  dispCand.forEach((o, k) => {
    const decision = ['liberar', 'reembolso', 'parcial'][k];
    o.status = decision === 'liberar' ? 'completado' : 'cancelado'; o.escrow = decision === 'liberar' ? 'liberado' : 'reembolsado';
    if (decision === 'parcial') { o.escrow = 'parcial'; o.refundPct = 50; o.status = 'completado'; }
    disputes.push({ id: `dr${k}`, orderId: o.id, openedBy: o.clientId, reason: 'Desacuerdo con la calidad de la entrega', status: 'resuelta', decision, refundPct: decision === 'parcial' ? 50 : decision === 'reembolso' ? 100 : 0, note: 'Resuelto tras revisar la evidencia de ambas partes.', resolvedBy: 'u-sop', resolvedAt: o.completedAt || ago(20), createdAt: ago(30 + k * 10), evidence: [{ by: o.clientId, text: 'El resultado no cumple lo prometido en la descripción del servicio.', files: [], at: ago(30 + k * 10) }] });
  });

  // --- Proyectos (briefs) y propuestas ---
  const BRIEFS = [['Rediseño de sitio web para viña boutique', 'desarrollo', 350000, 600000, 30, 'c4'], ['Logo y etiquetas para cerveza artesanal', 'diseno', 150000, 300000, 15, 'c18'], ['Traducción de catálogo turístico al inglés y portugués', 'traduccion', 120000, 220000, 10, 'c24'], ['Video institucional de 2 minutos para ONG', 'video', 250000, 450000, 25, 'c19'], ['Estrategia de contenidos para clínica dental', 'marketing', 180000, 320000, 30, 'c11'], ['App de reservas para gimnasio', 'desarrollo', 900000, 1600000, 60, 'c22'], ['Ilustraciones para libro infantil (12 páginas)', 'diseno', 400000, 700000, 40, 'c13'], ['Subtítulos para serie de podcast en video', 'traduccion', 60000, 120000, 7, 'c12'], ['Campaña de lanzamiento en Instagram para tienda de lana', 'marketing', 200000, 350000, 20, 'c7'], ['Menú digital y piezas para pastelería', 'diseno', 50000, 90000, 5, 'c1']];
  const briefs = BRIEFS.map(([title, categoryId, budgetMin, budgetMax, days, clientId], i) => ({ id: `b${i}`, title, categoryId, budgetMin, budgetMax, days, clientId, status: i === 2 ? 'adjudicado' : i === 8 ? 'cerrado' : 'abierto', description: `Buscamos un profesional para: ${title.toLowerCase()}. Tenemos referencias y materiales listos. Valoramos experiencia en proyectos similares, buena comunicación y cumplimiento de plazos.`, createdAt: ago(R.int(1, 25)) }));
  const proposals = [];
  briefs.forEach(b => {
    const fs = users.filter(u => u.role === 'freelancer' && u.mainCategory === b.categoryId);
    fs.slice(0, R.int(1, fs.length)).forEach((f, k) => proposals.push({ id: `pr-${b.id}-${f.id}`, briefId: b.id, freelancerId: f.id, price: Math.round((b.budgetMin + R() * (b.budgetMax - b.budgetMin)) / 5000) * 5000, days: Math.max(3, b.days - R.int(0, 6)), text: `Hola, me interesa mucho tu proyecto. He realizado trabajos similares (puedes ver mi portafolio). Propongo comenzar con una reunión breve para alinear objetivos y entregar un primer avance en ${R.int(2, 5)} días.`, status: b.status === 'adjudicado' && k === 0 ? 'aceptada' : b.status !== 'abierto' ? 'rechazada' : 'enviada', createdAt: new Date(new Date(b.createdAt).getTime() + (k + 1) * 5 * 36e5).toISOString() }));
  });

  // --- Retiros ---
  const withdrawals = [];
  users.filter(u => u.role === 'freelancer' && u.payout).forEach(f => {
    const earned = orders.filter(o => o.freelancerId === f.id && o.escrow === 'liberado').reduce((a, o) => a + o.price - o.commission, 0);
    let left = earned * (0.55 + R() * 0.3);
    for (let k = 0; left > 30000 && k < 4; k++) {
      const amt = Math.round(Math.min(left, left * (0.3 + R() * 0.5)) / 1000) * 1000;
      left -= amt;
      withdrawals.push({ id: `w-${f.id}-${k}`, freelancerId: f.id, amount: amt, method: 'Transferencia', account: `${f.payout.bank} ${f.payout.account}`, status: k === 0 && R() < .4 ? 'solicitado' : 'pagado', createdAt: ago(R.int(k * 30 + 1, k * 30 + 28)) });
    }
  });
  withdrawals.forEach(w => { if (w.status === 'pagado') w.processedAt = new Date(new Date(w.createdAt).getTime() + 2 * 864e5).toISOString(); });

  // favoritos de la cliente demo
  users.find(u => u.id === 'c1').favorites = ['g-f1-0', 'g-f6-0', 'g-f12-0'];

  const settings = {
    name: 'Gremio', tagline: 'Talento independiente chileno, listo para tu proyecto',
    heroTitle: 'El talento freelance que tu proyecto necesita',
    heroSubtitle: 'Diseño, desarrollo, marketing, traducción y video. Paga seguro: tu dinero queda retenido hasta que apruebes la entrega.',
    announcement: 'Nuevo: paga en cuotas sin interés con tarjetas de crédito nacionales',
    serviceFeePct: FEE, commissionPct: COM, minWithdrawal: 20000, autoReleaseDays: 3,
    featured: ['g-f1-0', 'g-f4-0', 'g-f6-0', 'g-f13-0', 'g-f9-0', 'g-f7-0', 'g-f3-0', 'g-f12-0'],
    levels: { nivel1: { orders: 5, rating: 4.5 }, nivel2: { orders: 15, rating: 4.7 }, top: { orders: 30, rating: 4.8 } },
    showStats: true
  };
  return { users, categories: CATEGORIES.map(c => ({ ...c, active: true, createdAt: ago(700) })), gigs, orders, reviews, messages, disputes, briefs, proposals, withdrawals, settings };
}
