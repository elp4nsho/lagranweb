// Datos semilla de Aquilo Pulse: generados con rng() para que sean reproducibles.
import { rng } from '../../../assets/core/db.js';

export const COLOR_SEED = [
  { key: 'glaciar', name: 'Glaciar', base: '#00b3c7', light: '#6fe3ef', dark: '#00707e', stock: 184, reorderAt: 40, order: 1 },
  { key: 'coral', name: 'Coral', base: '#ff6f61', light: '#ffb0a6', dark: '#b8392e', stock: 96, reorderAt: 40, order: 2 },
  { key: 'salvia', name: 'Salvia', base: '#7f9c80', light: '#b9d1b6', dark: '#4b634c', stock: 31, reorderAt: 40, order: 3 },
  { key: 'arena', name: 'Arena', base: '#d9b98c', light: '#f3e2c6', dark: '#9c7b4f', stock: 142, reorderAt: 40, order: 4 },
  { key: 'noche', name: 'Noche', base: '#2a3247', light: '#56627e', dark: '#141a29', stock: 7, reorderAt: 40, order: 5 }
];

export const BUNDLE_SEED = [
  { id: 'b1', qty: 1, name: '1 Aquilo', desc: 'Para empezar tu hábito.', price: 39990, listPrice: 54990, badge: '', gift: '', perks: ['Botella + cargador magnético', 'App gratuita', 'Envío gratis'], active: true, order: 1 },
  { id: 'b2', qty: 2, name: '2 Aquilo', desc: 'Para ti y alguien que quieres.', price: 69990, listPrice: 109980, badge: 'Más popular', gift: 'Funda de neopreno', perks: ['2 botellas + 2 cargadores', 'Funda de neopreno de regalo', 'Envío express gratis'], active: true, order: 2 },
  { id: 'b3', qty: 3, name: '3 Aquilo', desc: 'Para toda la familia u oficina.', price: 89990, listPrice: 164970, badge: 'Mejor precio', gift: '3 fundas de neopreno', perks: ['3 botellas + 3 cargadores', '3 fundas de regalo', 'Envío express gratis'], active: true, order: 3 }
];

export const LANDING_SEED = () => ({
  promoBar: '🔥 Lanzamiento: hasta 45% dcto. + envío gratis',
  headline: 'Bebe mejor. Siéntete increíble.',
  subheadline: 'Aquilo Pulse es la botella inteligente que brilla cuando es hora de hidratarte, mide cada sorbo y mantiene tu agua helada 24 horas.',
  heroBullets: ['Recordatorios luminosos personalizados', 'Sensor de consumo + app gratuita', 'Acero inoxidable libre de BPA'],
  benefits: [
    { icon: '💡', title: 'Te avisa con luz', text: 'El anillo LED brilla suavemente cuando llevas mucho sin beber. Sin notificaciones molestas.' },
    { icon: '📊', title: 'Mide cada sorbo', text: 'Su sensor registra lo que bebes y ajusta tu meta según actividad y clima.' },
    { icon: '🧊', title: '24 h helada, 12 h caliente', text: 'Doble pared de acero al vacío. Tu agua como te gusta, todo el día.' },
    { icon: '🔋', title: '30 días de batería', text: 'Carga magnética en 90 minutos. Olvídate del cargador por un mes.' },
    { icon: '🌱', title: 'Adiós al plástico', text: 'Una Aquilo reemplaza cerca de 1.400 botellas desechables al año.' },
    { icon: '🧼', title: 'Fácil de limpiar', text: 'Boca ancha y electrónica sellada en la tapa: el cuerpo va al lavavajillas.' }
  ],
  comparison: [
    ['Recordatorio luminoso', 'Sí', 'No'],
    ['Mide tu consumo', 'Sí', 'No'],
    ['Frío', '24 horas', '8–12 h'],
    ['Batería', '30 días', '3–7 días'],
    ['Apta para lavavajillas', 'Sí', 'No'],
    ['Prueba sin riesgo', '60 días', '14 días'],
    ['Garantía', '2 años', '6 meses']
  ],
  faq: [
    { q: '¿Necesito el teléfono para usarla?', a: 'No. Los recordatorios luminosos funcionan solos desde el primer día. La app es opcional para ver tu historial y personalizar metas.' },
    { q: '¿Cuánto demora el envío?', a: 'Despachamos en 24 horas hábiles. Llega en 2–4 días a ciudades principales y en 5–7 días a zonas extremas.' },
    { q: '¿Puedo meterla al lavavajillas?', a: 'Sí, el cuerpo de acero es apto para lavavajillas. La tapa, que contiene la electrónica, se lava a mano con agua tibia.' },
    { q: '¿Es compatible con iPhone y Android?', a: 'Sí, la app funciona en iOS 15+ y Android 9+ mediante Bluetooth de bajo consumo.' },
    { q: '¿Cómo funciona la garantía?', a: 'Escríbenos dentro del plazo desde que la recibes, coordinamos el retiro gratis y te reembolsamos el total en menos de 5 días hábiles.' },
    { q: '¿Puedo seguir mi pedido?', a: 'Sí. Con tu número de pedido (AQ-XXXXX) y tu correo puedes ver el estado en la página de seguimiento.' }
  ],
  guaranteeDays: 60,
  guaranteeTitle: 'Garantía de 60 días, sin preguntas',
  guaranteeText: 'Pruébala dos meses. Si no bebes más agua o simplemente no te convence, te devolvemos el 100% de tu dinero y retiramos la botella sin costo.',
  countdownEnd: new Date(Date.now() + (2 * 24 + 7) * 36e5 + 17 * 6e4).toISOString(),
  countdownLabel: 'La oferta de lanzamiento termina en',
  finalTitle: 'Tu cuerpo es 60% agua. Trátalo como tal.',
  finalText: 'Únete a más de 12.000 personas que ya beben mejor con Aquilo.',
  expressPrice: 4990,
  bump: { enabled: true, name: 'Kit Pro: funda térmica + tapa deportiva', desc: 'Protege tu Aquilo y bebe con una mano al entrenar. Solo en esta compra.', price: 9990, listPrice: 19990 },
  upsell: { enabled: true, name: 'Una Aquilo extra con 40% dcto.', desc: 'Oferta única post-compra: agrega otra botella al mismo envío.', price: 23990, listPrice: 39990 },
  press: ['Revista Pulso', 'TecnoDiario', 'Vida Sana', 'Radio Andes']
});

const FIRST = ['Valentina', 'Diego', 'Carolina', 'Javier', 'Fernanda', 'Matías', 'Camila', 'Sebastián', 'Antonia', 'Benjamín', 'Isidora', 'Tomás', 'Catalina', 'Joaquín', 'Martina', 'Felipe', 'Josefa', 'Vicente', 'Florencia', 'Cristóbal', 'Constanza', 'Nicolás', 'Daniela', 'Ignacio', 'Paula', 'Rodrigo', 'Francisca', 'Gabriel', 'Trinidad', 'Andrés'];
const LAST = ['Rojas', 'Muñoz', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez'];
const PLACES = [['Metropolitana', ['Santiago', 'Providencia', 'Ñuñoa', 'Las Condes', 'Maipú', 'La Florida', 'Puente Alto']], ['Valparaíso', ['Viña del Mar', 'Valparaíso', 'Quilpué']], ['Biobío', ['Concepción', 'Talcahuano', 'Los Ángeles']], ['Antofagasta', ['Antofagasta', 'Calama']], ['Coquimbo', ['La Serena', 'Coquimbo']], ['Los Ríos', ['Valdivia']], ['Los Lagos', ['Puerto Montt', 'Osorno']], ['Magallanes', ['Punta Arenas']], ["O'Higgins", ['Rancagua']]];
const STREETS = ['Av. Providencia', 'Los Aromos', 'Av. Matta', 'Pasaje Las Rosas', 'Av. Grecia', 'Calle Larga', 'Los Carrera', 'Av. Alemania', 'Freire', 'O\'Higgins'];

const REVIEW_TXT = [
  ['Pasé de 3 vasos a 2 litros diarios', 'La luz es sutil pero efectiva. Mis dolores de cabeza de la tarde desaparecieron en una semana.'],
  ['El hielo dura todo el día', 'La llevo a la obra con 30 °C y en la tarde todavía tiene hielo. La app es simple y bonita.'],
  ['Regalo perfecto', 'Compré el pack de 3 para la familia. Les encantó. Quería más colores, pero igual feliz.'],
  ['La batería es real', 'Llevo 4 semanas sin cargarla. Elegante, se ve premium y no gotea en la mochila.'],
  ['Me cambió la rutina', 'Trabajo frente al computador y siempre olvidaba tomar agua. Ahora la luz me avisa y cumplo la meta.'],
  ['Muy buena calidad', 'Se nota el acero grueso. Llegó en 2 días a Concepción, muy bien embalada.'],
  ['Ideal para el gimnasio', 'La tapa deportiva del Kit Pro es lo mejor. Mide bastante bien lo que tomo.'],
  ['Bonita y práctica', 'El color Salvia es precioso en persona. La app podría tener más estadísticas.'],
  ['Cumple lo que promete', 'Frío de verdad por 24 horas. El sensor a veces se demora en sincronizar, pero funciona.'],
  ['Mis hijos la aman', 'Compramos 2 y ahora compiten por quién toma más agua. Recomendada.'],
  ['Buena, pero pesada', 'Es un poco más pesada que mi botella anterior, pero la calidad lo compensa.'],
  ['Atención excelente', 'Tuve un problema con el cargador y me enviaron otro en 48 horas sin costo.']
];

const iso = d => d.toISOString();
const dayKey = d => d.toISOString().slice(0, 10);

export function seed() {
  const r = rng(2026);
  const now = Date.now();
  const at = (daysAgo, h = r.int(8, 22), m = r.int(0, 59)) => { const d = new Date(now - daysAgo * 864e5); d.setHours(h, m, r.int(0, 59), 0); return d.getTime() > now ? new Date(now - r.int(5, 90) * 6e4) : d; };

  const users = [
    { id: 'u-admin', name: 'Camila Ortega', email: 'admin@aquilo.cl', password: 'admin123', role: 'admin', color: '#7b5cff', demo: true, active: true, createdAt: iso(at(320)) },
    { id: 'u-mkt', name: 'Tomás Fuentes', email: 'marketing@aquilo.cl', password: 'marketing123', role: 'marketing', color: '#e8437a', demo: true, active: true, createdAt: iso(at(250)) },
    { id: 'u-sop', name: 'Javiera Soto', email: 'soporte@aquilo.cl', password: 'soporte123', role: 'soporte', color: '#0f9d8a', demo: true, active: true, createdAt: iso(at(200)) },
    { id: 'u-sop2', name: 'Ignacio Paredes', email: 'ignacio@aquilo.cl', password: 'aquilo123', role: 'soporte', color: '#d48a1a', demo: false, active: true, createdAt: iso(at(120)) },
    { id: 'u-old', name: 'Renata Lagos', email: 'renata@aquilo.cl', password: 'aquilo123', role: 'marketing', color: '#5b6b8a', demo: false, active: false, createdAt: iso(at(300)) }
  ];

  const affiliates = [
    { id: 'af1', name: 'Fran Vidal', channel: 'Instagram · Vida Activa', email: 'fran@vidaactiva.cl', code: 'FRAN', commission: 12, clicks: 0, status: 'activo', createdAt: iso(at(170)) },
    { id: 'af2', name: 'Runners Sur', channel: 'Club de running', email: 'hola@runnerssur.cl', code: 'RUNSUR', commission: 10, clicks: 0, status: 'activo', createdAt: iso(at(160)) },
    { id: 'af3', name: 'Dra. Paz Herrera', channel: 'Nutrición · YouTube', email: 'paz@nutripaz.cl', code: 'NUTRIPAZ', commission: 15, clicks: 0, status: 'activo', createdAt: iso(at(140)) },
    { id: 'af4', name: 'Oficina Verde', channel: 'Blog sustentable', email: 'contacto@oficinaverde.cl', code: 'VERDE', commission: 8, clicks: 0, status: 'activo', createdAt: iso(at(110)) },
    { id: 'af5', name: 'Martín Aliaga', channel: 'TikTok · Gym', email: 'martin@correo.cl', code: 'MARTIN', commission: 10, clicks: 0, status: 'pausado', createdAt: iso(at(90)) },
    { id: 'af6', name: 'Yoga Cordillera', channel: 'Estudio de yoga', email: 'yoga@cordillera.cl', code: 'YOGA', commission: 10, clicks: 0, status: 'pendiente', createdAt: iso(at(3)) }
  ];

  const coupons = [
    { id: 'c1', code: 'BIENVENIDA10', type: 'pct', value: 10, active: true, uses: 0, maxUses: 0, expires: '', note: 'Popup de bienvenida', createdAt: iso(at(180)) },
    { id: 'c2', code: 'AGUA5000', type: 'fixed', value: 5000, active: true, uses: 0, maxUses: 500, expires: '', note: 'Correo carrito abandonado', createdAt: iso(at(150)) },
    { id: 'c3', code: 'CYBER15', type: 'pct', value: 15, active: true, uses: 0, maxUses: 0, expires: dayKey(new Date(now + 20 * 864e5)), note: 'Campaña Cyber', createdAt: iso(at(40)) },
    { id: 'c4', code: 'VERANO20', type: 'pct', value: 20, active: true, uses: 0, maxUses: 0, expires: dayKey(new Date(now - 30 * 864e5)), note: 'Temporada verano (vencido)', createdAt: iso(at(200)) },
    { id: 'c5', code: 'PRENSA25', type: 'pct', value: 25, active: false, uses: 0, maxUses: 20, expires: '', note: 'Solo prensa', createdAt: iso(at(100)) }
  ];

  const bundles = BUNDLE_SEED.map(b => ({ ...b, perks: [...b.perks], createdAt: iso(at(330)) }));
  const colors = COLOR_SEED.map(c => ({ id: 'col-' + c.key, ...c, sold: 0, createdAt: iso(at(330)) }));
  const landing = LANDING_SEED();

  const abStart = 21;
  const orders = [], traffic = [];
  let num = 10001;
  const colorW = ['glaciar', 'glaciar', 'glaciar', 'coral', 'coral', 'salvia', 'salvia', 'arena', 'arena', 'noche', 'noche', 'noche'];
  const carriers = ['Rápido Sur', 'Chilexpreso', 'Ruta Austral'];
  for (let d = 179; d >= 0; d--) {
    const trend = 1 + (179 - d) / 55;
    const weekend = [0, 6].includes(new Date(now - d * 864e5).getDay()) ? 1.25 : 1;
    const n = Math.max(0, Math.round(trend * weekend * (0.4 + r() * 1.1)));
    for (let k = 0; k < n; k++) {
      const first = r.pick(FIRST), last = r.pick(LAST);
      const [region, cities] = r.pick(PLACES);
      const roll = r();
      const b = roll < .45 ? bundles[0] : roll < .83 ? bundles[1] : bundles[2];
      const items = Array.from({ length: b.qty }, () => r.pick(colorW));
      const bump = r.bool(.34), upsell = r.bool(.14);
      const upsellColor = upsell ? r.pick(colorW) : null;
      if (upsell) items.push(upsellColor);
      const couponRoll = r();
      const coupon = couponRoll < .12 ? 'BIENVENIDA10' : couponRoll < .17 ? 'AGUA5000' : couponRoll < .2 && d < 40 ? 'CYBER15' : couponRoll < .23 && d > 30 && d < 120 ? 'VERANO20' : '';
      const ref = r.bool(.2) ? r.pick(['FRAN', 'FRAN', 'RUNSUR', 'NUTRIPAZ', 'NUTRIPAZ', 'VERDE', ...(d > 30 ? ['MARTIN'] : [])]) : '';
      const express = b.qty === 1 && r.bool(.18);
      const subtotal = b.price + (bump ? landing.bump.price : 0) + (upsell ? landing.upsell.price : 0);
      const cp = coupons.find(c => c.code === coupon);
      const discount = cp ? (cp.type === 'pct' ? Math.round(b.price * cp.value / 100) : cp.value) : 0;
      const shipping = express ? landing.expressPrice : 0;
      const created = at(d);
      // Estado según antigüedad.
      let status;
      if (d > 10) status = r.bool(.04) ? 'reembolsado' : r.bool(.02) ? 'cancelado' : 'entregado';
      else if (d > 5) status = r.bool(.7) ? 'entregado' : 'enviado';
      else if (d > 2) status = r.bool(.6) ? 'enviado' : 'preparando';
      else if (d > 0) status = r.bool(.5) ? 'preparando' : 'pagado';
      else status = 'pagado';
      const flow = ['pagado', 'preparando', 'enviado', 'entregado'];
      const history = [{ status: 'pagado', at: iso(created), note: 'Pago aprobado' }];
      const steps = status === 'cancelado' ? 1 : status === 'reembolsado' ? 4 : flow.indexOf(status) + 1;
      for (let i = 1; i < steps; i++) history.push({ status: flow[i], at: iso(new Date(created.getTime() + (i === 1 ? .4 : i === 2 ? 1.3 : 3.2) * 864e5)), note: ['', 'Pedido en preparación', 'Entregado a transporte', 'Recibido por el cliente'][i] });
      if (status === 'cancelado') history.push({ status: 'cancelado', at: iso(new Date(created.getTime() + 3 * 36e5)), note: 'Cancelado a solicitud del cliente' });
      if (status === 'reembolsado') history.push({ status: 'reembolsado', at: iso(new Date(created.getTime() + 18 * 864e5)), note: 'Devolución por garantía de satisfacción' });
      const city = r.pick(cities);
      orders.push({
        id: 'o' + num, number: 'AQ-' + num++, createdAt: iso(created),
        customer: { name: `${first} ${last}`, email: `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + r.int(1, 99) + '@correo.cl', phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, region, city, address: `${r.pick(STREETS)} ${r.int(100, 3999)}` },
        bundleId: b.id, bundleName: b.name, bundlePrice: b.price, items,
        bump, bumpPrice: bump ? landing.bump.price : 0, upsell, upsellPrice: upsell ? landing.upsell.price : 0,
        coupon, discount, shipping, shipMethod: express ? 'express' : 'estandar',
        subtotal, total: subtotal - discount + shipping,
        status, history, ref, variant: d < abStart ? (r.bool(.5) ? 'A' : 'B') : '',
        carrier: steps >= 3 ? r.pick(carriers) : '', tracking: steps >= 3 ? 'RS' + r.int(10000000, 99999999) : '',
        notes: []
      });
    }
  }
  // Numeración correlativa según la fecha real de cada pedido.
  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((o, i) => { o.id = 'o' + (10001 + i); o.number = 'AQ-' + (10001 + i); });
  // Tráfico diario coherente con las compras (visitas → checkout → compra).
  for (let d = 179; d >= 0; d--) {
    const key = dayKey(new Date(now - d * 864e5));
    const buys = orders.filter(o => o.createdAt.slice(0, 10) === key).length;
    const conv = .022 + r() * .014;
    const visits = Math.round(Math.max(buys, 1) / conv + r.int(20, 90));
    const checkouts = Math.max(buys, Math.round(buys / (.38 + r() * .14)) + r.int(0, 4));
    traffic.push({ id: 't' + key, date: key, visits: d === 0 ? Math.round(visits * .55) : visits, checkouts: d === 0 ? Math.max(buys, Math.round(checkouts * .55)) : checkouts });
  }
  orders.reverse();

  // Uso de cupones, ventas por color y clics de afiliados.
  coupons.forEach(c => { c.uses = orders.filter(o => o.coupon === c.code).length; });
  colors.forEach(c => { c.sold = orders.filter(o => !['cancelado'].includes(o.status)).reduce((s, o) => s + o.items.filter(i => i === c.key).length, 0); });
  affiliates.forEach(a => { a.clicks = orders.filter(o => o.ref === a.code).length * r.int(14, 26) + r.int(10, 60); });

  // Pagos a afiliados: meses cerrados pagados.
  const payouts = [];
  const monthKey = iso => iso.slice(0, 7);
  const thisMonth = monthKey(new Date(now).toISOString());
  affiliates.forEach(a => {
    const byMonth = {};
    orders.filter(o => o.ref === a.code && !['cancelado', 'reembolsado'].includes(o.status)).forEach(o => {
      const m = monthKey(o.createdAt);
      byMonth[m] = (byMonth[m] || 0) + Math.round((o.total - o.shipping) * a.commission / 100);
    });
    Object.entries(byMonth).filter(([m]) => m < thisMonth).sort().slice(0, -1).forEach(([m, amount]) => {
      const paid = new Date(m + '-05T12:00:00'); paid.setMonth(paid.getMonth() + 1);
      payouts.push({ id: `po-${a.id}-${m}`, affiliateId: a.id, period: m, amount, method: 'Transferencia', status: 'pagado', createdAt: iso(paid) });
    });
  });

  // Reseñas.
  const reviews = [];
  const delivered = orders.filter(o => o.status === 'entregado');
  for (let i = 0; i < 46; i++) {
    const o = delivered[(i * 7 + 3) % delivered.length];
    const [title, text] = REVIEW_TXT[i % REVIEW_TXT.length];
    const rating = i % 11 === 10 ? 3 : i % 5 === 4 ? 4 : 5;
    const status = i < 4 ? 'pendiente' : i === 9 || i === 23 ? 'rechazada' : 'aprobada';
    const [name, last] = o.customer.name.split(' ');
    reviews.push({ id: 'r' + i, name: `${name} ${last[0]}.`, city: o.customer.city, rating: status === 'rechazada' ? 2 : rating, title: status === 'rechazada' ? 'No me llegó a tiempo' : title, text: status === 'rechazada' ? 'Visiten mi tienda con mejores precios en www.otra-tienda.cl' : text, color: o.items[0], orderNumber: o.number, verified: true, status, featured: i < 10 && status === 'aprobada', createdAt: iso(at(i < 4 ? r.int(0, 2) : 4 + i * 3)) });
  }

  // Carritos abandonados.
  const carts = [];
  for (let i = 0; i < 28; i++) {
    const first = r.pick(FIRST), last = r.pick(LAST);
    const b = r.pick(bundles);
    const days = i < 6 ? r() * 1.5 : r.int(2, 40);
    const recovered = i >= 6 && r.bool(.28);
    carts.push({ id: 'k' + i, name: `${first} ${last}`, email: `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@correo.cl', bundleId: b.id, bundleName: b.name, total: b.price, step: r.pick(['Envío', 'Pago', 'Pago']), reminders: i < 3 ? 0 : r.int(1, 2), recovered, createdAt: iso(new Date(now - days * 864e5)) });
  }

  const automations = [
    { id: 'au1', name: 'Carrito abandonado · 1 hora', trigger: 'carrito', delayHours: 1, subject: '¿Olvidaste tu Aquilo? 💧', body: 'Hola {nombre}, tu pack {pack} te está esperando. Termina tu compra antes de que se agote tu color.', coupon: '', active: true, sent: 412, opened: 233, clicked: 97, revenue: 2_940_000 },
    { id: 'au2', name: 'Carrito abandonado · 24 horas + cupón', trigger: 'carrito', delayHours: 24, subject: 'Te regalamos $5.000 para tu Aquilo', body: 'Hola {nombre}, usa el código AGUA5000 y llévate tu pack {pack} con $5.000 de descuento.', coupon: 'AGUA5000', active: true, sent: 318, opened: 171, clicked: 84, revenue: 3_120_000 },
    { id: 'au3', name: 'Bienvenida post-compra', trigger: 'compra', delayHours: 0, subject: 'Tu pedido {pedido} está confirmado', body: 'Gracias {nombre}. Te avisaremos cuando tu Aquilo salga a despacho.', coupon: '', active: true, sent: 1104, opened: 902, clicked: 310, revenue: 0 },
    { id: 'au4', name: 'Pedir reseña · 7 días tras entrega', trigger: 'entrega', delayHours: 168, subject: '¿Cómo te va con tu Aquilo?', body: 'Hola {nombre}, cuéntanos tu experiencia y ayuda a otros a beber mejor.', coupon: '', active: true, sent: 820, opened: 455, clicked: 141, revenue: 0 },
    { id: 'au5', name: 'Recompra · 90 días', trigger: 'compra', delayHours: 2160, subject: 'Un regalo para alguien que quieres', body: 'Hola {nombre}, llévate una segunda Aquilo con 20% de descuento.', coupon: 'BIENVENIDA10', active: false, sent: 96, opened: 41, clicked: 9, revenue: 359_910 }
  ];

  const emails = carts.filter(c => c.reminders).slice(0, 14).map((c, i) => ({ id: 'e' + i, to: c.email, subject: i % 2 ? automations[1].subject : automations[0].subject, automation: i % 2 ? 'au2' : 'au1', status: c.recovered ? 'clic' : r.pick(['enviado', 'abierto', 'abierto']), createdAt: iso(new Date(new Date(c.createdAt).getTime() + (i % 2 ? 24 : 1) * 36e5)) }));

  const variantStats = { A: { visitors: 0, conversions: 0 }, B: { visitors: 0, conversions: 0 } };
  traffic.slice(-abStart).forEach(t => { const a = Math.round(t.visits * (0.48 + r() * .04)); variantStats.A.visitors += a; variantStats.B.visitors += t.visits - a; });
  orders.filter(o => o.variant).forEach(o => variantStats[o.variant].conversions++);
  // B convierte un poco mejor en la simulación.
  variantStats.B.conversions = Math.round(variantStats.B.conversions * 1.18);

  const abtest = {
    id: 'ab-1', name: 'Titular del hero: beneficio vs. hábito', status: 'activo', split: 50,
    startedAt: iso(at(abStart)), goal: 'Compra',
    variants: {
      A: { label: 'Control', headline: landing.headline, subheadline: landing.subheadline },
      B: { label: 'Variante', headline: 'Tu hábito de hidratación, en piloto automático.', subheadline: 'La botella que se ilumina cuando necesitas beber, cuenta cada sorbo y conserva el frío 24 horas. Tú solo disfruta.' }
    },
    stats: variantStats,
    history: [{ name: 'Precio tachado vs. sin tachar', winner: 'A', lift: 9.4, endedAt: iso(at(40)) }]
  };

  const _log = [
    { id: 'l1', at: iso(at(0, 9, 12)), action: 'Pedido actualizado', detail: `${orders[3].number} → preparando`, user: 'u-sop' },
    { id: 'l2', at: iso(at(1, 18, 2)), action: 'Landing', detail: 'Se actualizó la sección de preguntas frecuentes', user: 'u-mkt' },
    { id: 'l3', at: iso(at(1, 11, 40)), action: 'Cupón creado', detail: 'CYBER15 (15%)', user: 'u-mkt' },
    { id: 'l4', at: iso(at(2, 16, 25)), action: 'Inventario', detail: 'Reposición Glaciar +120 unidades', user: 'u-admin' },
    { id: 'l5', at: iso(at(3, 10, 5)), action: 'Reseña aprobada', detail: 'Reseña de Daniela R.', user: 'u-sop' },
    { id: 'l6', at: iso(at(5, 13, 30)), action: 'Prueba A/B', detail: 'Se inició «Titular del hero»', user: 'u-mkt' }
  ];

  return { users, bundles, colors, orders, traffic, reviews, coupons, affiliates, payouts, carts, automations, emails, landing, abtest, shop: { name: 'Aquilo', supportEmail: 'hola@aquilo.cl', phone: '+56 2 2940 1180', carrier: 'Rápido Sur', freeShippingFrom: 0 }, _log };
}
