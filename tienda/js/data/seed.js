// Datos semilla de Raíz: catálogo, clientes, pedidos de los últimos 6 meses, reseñas,
// cupones y analítica. Todo con rng() para que sea reproducible.
import { rng } from '../../../assets/core/db.js';

const DAY = 864e5;
const iso = ms => new Date(ms).toISOString();

export const CATEGORIES = [
  { id: 'cat-poleras', name: 'Poleras', slug: 'poleras', description: 'Algodón orgánico peinado, cortes relajados.', order: 1 },
  { id: 'cat-camisas', name: 'Camisas', slug: 'camisas', description: 'Lino, franela y popelina para todo el año.', order: 2 },
  { id: 'cat-polerones', name: 'Polerones', slug: 'polerones', description: 'Felpa francesa que no se deforma.', order: 3 },
  { id: 'cat-chaquetas', name: 'Chaquetas', slug: 'chaquetas', description: 'Capas para el viento y la lluvia del sur.', order: 4 },
  { id: 'cat-pantalones', name: 'Pantalones', slug: 'pantalones', description: 'Denim reciclado y sarga elástica.', order: 5 },
  { id: 'cat-vestidos', name: 'Vestidos y faldas', slug: 'vestidos', description: 'Viscosa ecológica y algodón liviano.', order: 6 },
  { id: 'cat-calzado', name: 'Calzado', slug: 'calzado', description: 'Lona, caucho natural y cuero curtido vegetal.', order: 7 },
  { id: 'cat-accesorios', name: 'Accesorios', slug: 'accesorios', description: 'Lo que completa el día a día.', order: 8 }
];

const C = {
  arcilla: ['Arcilla', '#c4623a'], hueso: ['Hueso', '#e9e1d3'], musgo: ['Musgo', '#5b6b4a'], pizarra: ['Pizarra', '#4a5560'],
  arena: ['Arena', '#d8c3a0'], oliva: ['Oliva', '#7a7f4f'], blanco: ['Blanco', '#f6f3ee'], vino: ['Vino', '#7b2f35'],
  bosque: ['Bosque', '#2f3e2c'], ceniza: ['Ceniza', '#8c8780'], niebla: ['Niebla', '#b9c0c4'], caqui: ['Caqui', '#a8915f'],
  carbon: ['Carbón', '#33363a'], indigo: ['Índigo', '#2e3f63'], lavado: ['Lavado', '#7b93b5'], terracota: ['Terracota', '#b5532f'],
  salvia: ['Salvia', '#9caf88'], crudo: ['Crudo', '#efe6d4'], mostaza: ['Mostaza', '#c99a3b'], cafe: ['Café', '#6b4528'],
  negro: ['Negro', '#1f1f1f'], marino: ['Marino', '#23324a'], ladrillo: ['Ladrillo', '#9c4a32'], liquen: ['Liquen', '#a3a66b']
};
const col = (...keys) => keys.map(k => ({ name: C[k][0], hex: C[k][1] }));
const ROPA = ['XS', 'S', 'M', 'L', 'XL'];

// [id, nombre, categoría, precio, precioAntes, costo, figura, tags, tallas, colores, descripción, destacado]
const RAW = [
  ['p01', 'Polera Tierra', 'poleras', 14990, 0, 5200, 'tee', ['Nuevo'], ROPA, col('arcilla', 'hueso', 'musgo'), 'Polera de algodón orgánico peinado, corte relajado y costuras reforzadas. Teñida con pigmentos de bajo impacto.', true],
  ['p02', 'Polera Cordillera', 'poleras', 16990, 0, 5900, 'tee', [], ['S', 'M', 'L', 'XL'], col('pizarra', 'hueso'), 'Estampado frontal de líneas topográficas inspirado en los Andes. Tela de 180 g, suave al tacto.', false],
  ['p03', 'Polera Manga Larga Liquen', 'poleras', 18990, 0, 6400, 'longsleeve', ['Nuevo'], ROPA, col('liquen', 'crudo', 'carbon'), 'Manga larga de punto jersey grueso con puños acanalados. La capa base perfecta para el otoño.', false],
  ['p04', 'Camisa Lino Brisa', 'camisas', 32990, 39990, 11800, 'shirt', ['Oferta'], ['S', 'M', 'L', 'XL'], col('arena', 'oliva', 'blanco'), 'Camisa de lino lavado, fresca y liviana. Ideal para el verano y para llevar abierta sobre una polera.', true],
  ['p05', 'Camisa Franela Sur', 'camisas', 29990, 0, 10900, 'shirt', [], ['M', 'L', 'XL'], col('vino', 'bosque'), 'Franela cepillada a cuadros, abrigada y resistente. Botones de corozo natural.', false],
  ['p06', 'Camisa Popelina Puerto', 'camisas', 27990, 0, 9800, 'shirt', [], ROPA, col('blanco', 'lavado', 'marino'), 'Popelina de algodón de fibra larga con cuello italiano. Se plancha sola si la cuelgas húmeda.', false],
  ['p07', 'Polerón Fogata', 'polerones', 39990, 0, 14200, 'hoodie', ['Top ventas'], ROPA, col('ceniza', 'arcilla', 'bosque'), 'Polerón con capucha de felpa francesa 100% algodón. Bolsillo canguro y puños acanalados.', true],
  ['p08', 'Polerón Crew Niebla', 'polerones', 34990, 0, 12100, 'crew', [], ['S', 'M', 'L'], col('niebla', 'hueso', 'marino'), 'Cuello redondo, corte clásico y tejido que no se deforma con los lavados.', false],
  ['p09', 'Chaqueta Viento Sur', 'chaquetas', 59990, 0, 22500, 'jacket', ['Nuevo'], ['S', 'M', 'L', 'XL'], col('caqui', 'marino', 'ladrillo'), 'Cortavientos de nylon reciclado con capucha guardable y costuras termoselladas.', true],
  ['p10', 'Parka Huemul', 'chaquetas', 89990, 109990, 36000, 'parka', ['Oferta'], ['S', 'M', 'L', 'XL'], col('bosque', 'negro', 'mostaza'), 'Parka acolchada con relleno sintético de botellas recicladas. Abriga hasta -5 °C.', true],
  ['p11', 'Pantalón Sendero', 'pantalones', 37990, 0, 13400, 'pants', [], ['38', '40', '42', '44', '46'], col('caqui', 'carbon'), 'Pantalón cargo de sarga elástica con bolsillos laterales. Pensado para caminar y trabajar.', false],
  ['p12', 'Jeans Raíz Recto', 'pantalones', 42990, 49990, 15800, 'pants', ['Oferta'], ['38', '40', '42', '44'], col('indigo', 'lavado'), 'Denim de 13 oz con corte recto y tiro medio. Algodón reciclado en un 30%.', true],
  ['p13', 'Short Costa', 'pantalones', 22990, 0, 7900, 'shorts', [], ROPA, col('arena', 'oliva', 'marino'), 'Short de algodón con pretina elástica y cordón. Para la playa o la plaza.', false],
  ['p14', 'Vestido Quillay', 'vestidos', 44990, 0, 16200, 'dress', ['Nuevo'], ['XS', 'S', 'M', 'L'], col('terracota', 'salvia'), 'Vestido midi de viscosa ecológica con tirantes ajustables y caída fluida.', true],
  ['p15', 'Vestido Lluvia', 'vestidos', 38990, 0, 13800, 'dress', [], ['S', 'M', 'L'], col('pizarra', 'arena'), 'Vestido camisero de algodón con cinturón del mismo tono. Fácil de combinar.', false],
  ['p16', 'Falda Copihue', 'vestidos', 29990, 0, 10200, 'skirt', [], ['XS', 'S', 'M', 'L'], col('vino', 'negro', 'mostaza'), 'Falda midi plisada de tela liviana con forro. Se mueve contigo.', false],
  ['p17', 'Zapatillas Raíz Lona', 'calzado', 49990, 0, 19500, 'sneaker', ['Top ventas'], ['37', '38', '39', '40', '41', '42', '43'], col('hueso', 'carbon'), 'Zapatillas de lona con suela de caucho natural. Plantilla de corcho que se adapta a tu pie.', true],
  ['p18', 'Botines Huella', 'calzado', 69990, 79990, 28000, 'boot', ['Oferta'], ['38', '39', '40', '41', '42', '43', '44'], col('cafe', 'negro'), 'Botines de cuero curtido vegetal, cosidos a mano. Duran años y mejoran con el uso.', false],
  ['p19', 'Jockey Cumbre', 'accesorios', 12990, 0, 3900, 'cap', [], ['Única'], col('arcilla', 'bosque', 'hueso'), 'Jockey de gabardina con bordado tono sobre tono y correa de cuero vegetal.', false],
  ['p20', 'Bolso Tote Mercado', 'accesorios', 15990, 0, 4800, 'tote', ['Top ventas'], ['Única'], col('crudo', 'musgo'), 'Tote de lona gruesa con bolsillo interior. Aguanta la compra de toda la semana.', false],
  ['p21', 'Gorro Lana Austral', 'accesorios', 13990, 0, 4600, 'beanie', [], ['Única'], col('mostaza', 'ceniza', 'vino'), 'Gorro tejido en lana merino de la Patagonia. Abriga sin picar.', false],
  ['p22', 'Calcetines Pack Trío', 'accesorios', 8990, 0, 2700, 'socks', [], ['35-38', '39-42', '43-46'], col('arcilla', 'ceniza'), 'Pack de 3 pares de algodón peinado con talón reforzado.', false],
  ['p23', 'Mochila Andes', 'accesorios', 54990, 0, 21000, 'backpack', ['Nuevo'], ['Única'], col('carbon', 'oliva', 'ladrillo'), 'Mochila de 22 L en lona encerada, compartimento acolchado para notebook de 15".', false],
  ['p24', 'Bufanda Telar', 'accesorios', 19990, 0, 6900, 'scarf', [], ['Única'], col('ceniza', 'vino', 'arena'), 'Bufanda tejida a telar por artesanas de Chiloé. Lana de oveja sin teñir y teñida con plantas.', false]
];

const FIRST = ['Camila', 'Valentina', 'Martina', 'Isidora', 'Josefa', 'Catalina', 'Antonia', 'Fernanda', 'Javiera', 'Constanza', 'Sofía', 'Florencia', 'Matías', 'Benjamín', 'Vicente', 'Joaquín', 'Tomás', 'Agustín', 'Cristóbal', 'Diego', 'Felipe', 'Sebastián', 'Ignacio', 'Nicolás', 'Francisca', 'Paula', 'Daniela', 'Rodrigo', 'Gonzalo', 'Andrés'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández'];
const PLACES = [
  ['Providencia', 'Metropolitana'], ['Ñuñoa', 'Metropolitana'], ['Las Condes', 'Metropolitana'], ['Santiago', 'Metropolitana'], ['Maipú', 'Metropolitana'],
  ['La Florida', 'Metropolitana'], ['Puente Alto', 'Metropolitana'], ['Viña del Mar', 'Valparaíso'], ['Valparaíso', 'Valparaíso'], ['Concepción', 'Biobío'],
  ['Temuco', 'Araucanía'], ['La Serena', 'Coquimbo'], ['Antofagasta', 'Antofagasta'], ['Puerto Montt', 'Los Lagos'], ['Valdivia', 'Los Ríos'], ['Rancagua', "O'Higgins"]
];
const STREETS = ['Av. Italia', 'Los Aromos', 'Pasaje El Roble', 'Av. Grecia', 'Calle Larga', 'Los Castaños', 'Av. Libertad', 'Errázuriz', 'Blanco Encalada', 'Los Boldos', 'Av. Alemania', 'Prat', 'O’Higgins', 'Caupolicán', 'Las Acacias'];
const AV_COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777', '#4d7c0f', '#9333ea', '#0f766e'];

const REVIEW_TXT = [
  [5, 'Me encantó', 'La tela es suave y el corte calza perfecto. Ya pedí otro color.'],
  [5, 'Calidad real', 'Se nota la diferencia con otras marcas. Después de varios lavados sigue igual.'],
  [4, 'Muy buena, talla grande', 'Muy linda, pero recomiendo pedir una talla menos.'],
  [5, 'Llegó rapidísimo', 'Pedí el lunes y el miércoles ya la tenía en Concepción. Impecable.'],
  [4, 'Buen producto', 'Cumple lo que promete. El color es un poco más oscuro que en la foto.'],
  [3, 'Correcto', 'Está bien, aunque esperaba una tela un poco más gruesa por el precio.'],
  [5, 'Mi favorita', 'La uso casi todos los días. Combina con todo.'],
  [5, 'Regalo perfecto', 'La compré para mi pareja y quedó feliz. El empaque es precioso y sin plástico.'],
  [4, 'Linda terminación', 'Las costuras se ven muy bien hechas. Le pongo 4 porque demoró un poco el despacho.'],
  [2, 'No me convenció', 'El color no era lo que esperaba y el cambio tomó más de lo pensado.'],
  [5, 'Excelente', 'Cómoda, abrigada y con estilo. 100% recomendable.'],
  [4, 'Volveré a comprar', 'Buena atención y buen producto. Ojalá saquen más colores.']
];

export function seed() {
  const r = rng(20261);
  const now = Date.now();

  // ---------- Productos con variantes ----------
  const products = RAW.map(([id, name, cat, price, compare, cost, shape, tags, sizes, colors, description, featured], i) => {
    const variants = [];
    colors.forEach((c, ci) => sizes.forEach((s, si) => {
      let stock = r.int(6, 28);
      if (r.bool(.05)) stock = 0; else if (r.bool(.07)) stock = r.int(1, 4);
      variants.push({ sku: `RZ-${id.slice(1)}-${c.name.slice(0, 3).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}-${s}`, size: s, color: c.name, stock });
    }));
    return {
      id, name, categoryId: 'cat-' + cat, price, comparePrice: compare || 0, cost, shape, tags, sizes, colors, variants,
      description, featured, status: i === 23 ? 'borrador' : 'activo', sold: 0, views: r.int(300, 4200),
      createdAt: iso(now - (200 - i * 6) * DAY - r.int(0, 3) * DAY)
    };
  });
  // Un par de productos agotados en varias tallas para que las alertas tengan contenido.
  products[9].variants.forEach((v, i) => { if (i % 3 === 0) v.stock = r.int(0, 2); });
  products[16].variants.slice(0, 4).forEach(v => { v.stock = r.int(1, 3); });

  // ---------- Usuarios ----------
  const users = [
    { id: 'u-admin', name: 'Antonia Fuentes', email: 'admin@raiz.cl', password: 'raiz123', role: 'admin', color: '#7c3aed', demo: true, active: true, createdAt: iso(now - 420 * DAY) },
    { id: 'u-gestor', name: 'Diego Morales', email: 'gestor@raiz.cl', password: 'raiz123', role: 'manager', color: '#0891b2', demo: true, active: true, createdAt: iso(now - 300 * DAY) },
    { id: 'u-bodega', name: 'Rosa Contreras', email: 'bodega@raiz.cl', password: 'raiz123', role: 'warehouse', color: '#d97706', demo: true, active: true, createdAt: iso(now - 260 * DAY) },
    { id: 'u-camila', name: 'Camila Soto', email: 'camila@correo.cl', password: 'cliente123', role: 'customer', color: '#e11d48', demo: true, active: true, phone: '+56 9 8123 4567', createdAt: iso(now - 190 * DAY),
      addresses: [
        { id: 'a1', label: 'Casa', name: 'Camila Soto', street: 'Av. Italia 1450, depto 302', comuna: 'Ñuñoa', region: 'Metropolitana', phone: '+56 9 8123 4567', isDefault: true },
        { id: 'a2', label: 'Oficina', name: 'Camila Soto', street: 'Av. Providencia 2133, of. 501', comuna: 'Providencia', region: 'Metropolitana', phone: '+56 9 8123 4567', isDefault: false }
      ], wishlist: ['p10', 'p14', 'p23'], newsletter: true },
    { id: 'u-pedro', name: 'Pedro Lagos', email: 'pedro@raiz.cl', password: 'raiz123', role: 'manager', color: '#4d7c0f', demo: false, active: false, createdAt: iso(now - 380 * DAY) }
  ];
  for (let i = 0; i < 46; i++) {
    const fn = FIRST[(i * 7 + 3) % FIRST.length], ln = LAST[(i * 11 + 5) % LAST.length];
    const [comuna, region] = r.pick(PLACES);
    const email = `${fn}.${ln}${i}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@correo.cl';
    const phone = `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;
    users.push({
      id: `u-c${i}`, name: `${fn} ${ln}`, email, password: 'cliente123', role: 'customer', color: r.pick(AV_COLORS), demo: false, active: !r.bool(.04), phone,
      addresses: [{ id: 'a1', label: 'Casa', name: `${fn} ${ln}`, street: `${r.pick(STREETS)} ${r.int(100, 4800)}`, comuna, region, phone, isDefault: true }],
      wishlist: [r.pick(products).id], newsletter: r.bool(.5), createdAt: iso(now - r.int(20, 360) * DAY)
    });
  }
  const customers = users.filter(u => u.role === 'customer');
  const buyers = customers.slice(1, 40);

  // ---------- Pedidos (6 meses, con crecimiento) ----------
  const shippingRates = [
    { id: 'std', name: 'Despacho estándar', price: 3990, days: '3 a 5 días hábiles' },
    { id: 'exp', name: 'Express 24 h (RM)', price: 6990, days: '1 día hábil' },
    { id: 'pickup', name: 'Retiro en tienda Barrio Italia', price: 0, days: 'Desde 2 h' }
  ];
  const orders = [];
  const N = 430;
  const stamps = [];
  for (let i = 0; i < N; i++) stamps.push(now - Math.pow(r(), 1.22) * 182 * DAY - r() * 3600e3);
  stamps.sort((a, b) => a - b);
  const coupons = ['BIENVENIDA10', 'OTONO15', 'ENVIOGRATIS', '', '', '', '', '', '', ''];
  stamps.forEach((t, i) => {
    const cust = i % 36 === 4 ? users[3] : buyers[Math.floor(Math.pow(r(), 1.4) * buyers.length)];
    const n = r.bool(.55) ? 1 : r.bool(.6) ? 2 : r.int(3, 4);
    const items = [];
    for (let k = 0; k < n; k++) {
      const p = products[Math.floor(Math.pow(r(), 1.3) * 23)];
      const v = r.pick(p.variants);
      const ex = items.find(x => x.sku === v.sku);
      if (ex) { ex.qty++; continue; }
      items.push({ productId: p.id, name: p.name, sku: v.sku, size: v.size, color: v.color, price: p.price, qty: r.bool(.85) ? 1 : 2 });
    }
    const subtotal = items.reduce((s, x) => s + x.price * x.qty, 0);
    const code = r.pick(coupons);
    let discount = 0;
    if (code === 'BIENVENIDA10') discount = Math.round(subtotal * .1);
    if (code === 'OTONO15') discount = Math.round(subtotal * .15);
    const rate = r.bool(.7) ? shippingRates[0] : r.bool(.6) ? shippingRates[1] : shippingRates[2];
    const shipping = code === 'ENVIOGRATIS' || subtotal - discount >= 50000 ? 0 : rate.price;
    const ageDays = (now - t) / DAY;
    let status;
    if (ageDays > 9) status = r.bool(.05) ? 'cancelado' : r.bool(.04) ? 'reembolsado' : 'entregado';
    else if (ageDays > 5) status = r.bool(.6) ? 'entregado' : 'enviado';
    else if (ageDays > 2) status = r.bool(.5) ? 'enviado' : 'preparando';
    else if (ageDays > .6) status = r.bool(.5) ? 'preparando' : 'pagado';
    else status = r.bool(.25) ? 'pendiente' : 'pagado';
    const payment = status === 'pendiente' ? 'transferencia' : r.bool(.78) ? 'tarjeta' : 'transferencia';
    const flow = ['pagado', 'preparando', 'enviado', 'entregado'];
    const history = [{ status: 'pendiente', at: iso(t), note: 'Pedido recibido' }];
    const reached = status === 'cancelado' ? 0 : status === 'reembolsado' ? 4 : status === 'pendiente' ? -1 : flow.indexOf(status);
    let tt = t + (payment === 'tarjeta' ? 60e3 : 3 * 3600e3);
    for (let k = 0; k <= reached; k++) {
      history.push({ status: flow[k], at: iso(tt), note: ['Pago confirmado', 'Pedido en bodega', 'Entregado a Starken', 'Entregado al cliente'][k] });
      tt += (k === 0 ? 0.6 : 1.2 + r() * 1.6) * DAY;
    }
    if (status === 'cancelado') history.push({ status: 'cancelado', at: iso(t + 0.3 * DAY), note: 'Cancelado a pedido del cliente' });
    if (status === 'reembolsado') history.push({ status: 'reembolsado', at: iso(tt), note: 'Devolución por talla' });
    const addr = cust.addresses[0];
    const total = subtotal - discount + shipping;
    orders.push({
      id: `o-${1001 + i}`, number: 1001 + i, userId: cust.id,
      customer: { name: cust.name, email: cust.email, phone: cust.phone },
      address: rate.id === 'pickup' ? null : { street: addr.street, comuna: addr.comuna, region: addr.region },
      items, subtotal, discount, couponCode: code, shipping, shippingMethod: rate.name, shippingId: rate.id, total,
      payment, status, history, tracking: ['enviado', 'entregado', 'reembolsado'].includes(status) ? `STK${r.int(10000000, 99999999)}` : '',
      refunded: status === 'reembolsado' ? total : 0, notes: [], createdAt: iso(t)
    });
    if (!['cancelado'].includes(status)) items.forEach(x => { products.find(p => p.id === x.productId).sold += x.qty; });
  });
  orders.reverse();

  // ---------- Reseñas ----------
  const reviews = [];
  for (let i = 0; i < 96; i++) {
    const p = products[Math.floor(Math.pow(r(), 1.2) * 23)];
    const [rating, title, body] = r.pick(REVIEW_TXT);
    const u = r.pick(customers);
    const age = r.int(0, 170);
    reviews.push({
      id: `rv${i}`, productId: p.id, userId: u.id, author: u.name.split(' ')[0] + ' ' + u.name.split(' ')[1][0] + '.',
      rating, title, body, status: age < 4 ? 'pendiente' : r.bool(.06) ? 'rechazada' : 'aprobada', verified: r.bool(.8), createdAt: iso(now - age * DAY - r.int(0, 20) * 3600e3)
    });
  }

  // ---------- Analítica diaria (visitas → carritos → checkout) ----------
  const analytics = [];
  for (let d = 181; d >= 0; d--) {
    const day = new Date(now - d * DAY);
    const growth = 1 + (181 - d) / 181 * .7;
    const weekend = [0, 6].includes(day.getDay()) ? 1.25 : 1;
    const visits = Math.round((105 + r.int(0, 60)) * growth * weekend);
    const carts = Math.round(visits * (0.1 + r() * .03));
    const checkouts = Math.round(carts * (0.5 + r() * .1));
    analytics.push({ id: 'an-' + day.toISOString().slice(0, 10), date: day.toISOString().slice(0, 10), visits, carts, checkouts, createdAt: day.toISOString() });
  }

  // ---------- Cupones ----------
  const couponRows = [
    { id: 'cp1', code: 'BIENVENIDA10', type: 'percent', value: 10, minTotal: 0, usageLimit: 0, used: orders.filter(o => o.couponCode === 'BIENVENIDA10').length, active: true, expiresAt: '', description: '10% en tu primera compra' },
    { id: 'cp2', code: 'OTONO15', type: 'percent', value: 15, minTotal: 40000, usageLimit: 300, used: orders.filter(o => o.couponCode === 'OTONO15').length, active: true, expiresAt: iso(now + 25 * DAY).slice(0, 10), description: 'Colección otoño: 15% sobre $40.000' },
    { id: 'cp3', code: 'ENVIOGRATIS', type: 'shipping', value: 0, minTotal: 20000, usageLimit: 0, used: orders.filter(o => o.couponCode === 'ENVIOGRATIS').length, active: true, expiresAt: '', description: 'Despacho gratis sobre $20.000' },
    { id: 'cp4', code: 'RAIZ5000', type: 'fixed', value: 5000, minTotal: 30000, usageLimit: 100, used: 37, active: true, expiresAt: iso(now + 60 * DAY).slice(0, 10), description: '$5.000 de descuento sobre $30.000' },
    { id: 'cp5', code: 'CYBER25', type: 'percent', value: 25, minTotal: 0, usageLimit: 500, used: 500, active: false, expiresAt: iso(now - 120 * DAY).slice(0, 10), description: 'CyberDay (finalizado)' },
    { id: 'cp6', code: 'VIP20', type: 'percent', value: 20, minTotal: 60000, usageLimit: 50, used: 12, active: true, expiresAt: '', description: 'Clientes frecuentes' }
  ];

  // ---------- Movimientos de inventario ----------
  const stockMoves = [];
  for (let i = 0; i < 30; i++) {
    const p = r.pick(products), v = r.pick(p.variants);
    const type = r.bool(.6) ? 'ingreso' : r.bool(.5) ? 'ajuste' : 'merma';
    const qty = type === 'ingreso' ? r.int(6, 30) : type === 'merma' ? -r.int(1, 3) : r.pick([-2, -1, 1, 2]);
    stockMoves.push({ id: `sm${i}`, productId: p.id, sku: v.sku, type, qty, note: type === 'ingreso' ? 'Reposición de proveedor' : type === 'merma' ? 'Prenda con falla' : 'Conteo cíclico', userId: 'u-bodega', createdAt: iso(now - r.int(0, 60) * DAY) });
  }
  stockMoves.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const subscribers = customers.filter(u => u.newsletter).map(u => ({ email: u.email, createdAt: u.createdAt }));

  // Bitácora inicial para que el panel tenga historia.
  const LOGS = [
    ['u-admin', 'login', 'Antonia Fuentes inició sesión'], ['u-gestor', 'producto', 'Editó Parka Huemul: precio $109.990 → $89.990'],
    ['u-bodega', 'inventario', 'Ingreso de 40 unidades de Polerón Fogata'], ['u-gestor', 'cupón', 'Creó OTONO15'],
    ['u-gestor', 'contenido', 'Publicó cambios en la portada: “Ropa con origen, hecha para durar.”'], ['u-bodega', 'pedido', 'Pedido #1418 → Enviado'],
    ['u-admin', 'usuarios', 'Desactivó a Pedro Lagos'], ['u-gestor', 'reseña', 'Aprobó 6 reseñas en lote'], ['u-admin', 'ajustes', 'Actualizó ajustes (envío gratis desde $50.000)'],
    ['u-bodega', 'inventario', 'Conteo cíclico de Calzado'], ['u-gestor', 'pedido', 'Pedido #1402 → Reembolsado (Devolución por talla)'], ['u-admin', 'exportar', 'Exportó 120 filas de pedidos']
  ];
  const _log = LOGS.map(([user, action, detail], i) => ({ id: 'lg' + i, at: iso(now - (i * 1.7 + r()) * DAY), action, detail, user }));

  return {
    _log,
    categories: CATEGORIES.map(c => ({ ...c, active: true })),
    products, users, orders, reviews, analytics, coupons: couponRows, stockMoves, subscribers,
    settings: {
      storeName: 'Raíz',
      tagline: 'Ropa con origen',
      contactEmail: 'hola@raiz.cl',
      phone: '+56 2 2345 6789',
      address: 'Av. Italia 1180, Barrio Italia, Providencia',
      banner: { active: true, text: 'Envío gratis sobre $50.000 · Usa BIENVENIDA10 y obtén 10% en tu primera compra' },
      hero: {
        eyebrow: 'Colección Otoño · Hecho en Chile',
        title: 'Ropa con origen, hecha para durar.',
        subtitle: 'Algodón orgánico, lino y cuero curtido vegetal. Prendas simples que se ven mejor con cada lavado.',
        cta: 'Ver colección', ctaCategory: '', productId: 'p07'
      },
      about: 'Somos un taller de Santiago que trabaja con costureras de barrio y materiales trazables. Cada prenda indica de dónde viene y quién la hizo.',
      shipping: { rates: shippingRates, freeThreshold: 50000 },
      lowStock: 5,
      showReviews: true
    },
    orderSeq: 1001 + N
  };
}
