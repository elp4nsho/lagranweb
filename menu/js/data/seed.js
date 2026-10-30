// Datos semilla de Fogón Andino (restaurante ficticio). Todo reproducible con rng().
import { rng } from '../../../assets/core/db.js';

const L = (es, en) => ({ es, en });

export const STATIONS = {
  caliente: 'Cocina caliente',
  parrilla: 'Parrilla',
  fria: 'Cocina fría',
  postres: 'Pastelería',
  barra: 'Barra'
};

export const TAGS = {
  vegano: { ...L('Vegano', 'Vegan'), icon: '🌱' },
  vegetariano: { ...L('Vegetariano', 'Vegetarian'), icon: '🥕' },
  sinGluten: { ...L('Sin gluten', 'Gluten free'), icon: '🌾' },
  picante: { ...L('Picante', 'Spicy'), icon: '🌶️' }
};

const opt = (id, es, en, price = 0) => ({ id, es, en, price });

function modGroups() {
  return [
    { id: 'punto', name: L('Punto de la carne', 'Doneness'), type: 'single', required: true, options: [opt('p1', 'Jugoso', 'Medium rare'), opt('p2', 'A punto', 'Medium'), opt('p3', 'Bien cocido', 'Well done')] },
    { id: 'acomp', name: L('Acompañamiento', 'Side'), type: 'single', required: true, options: [opt('a1', 'Papas nativas al rescoldo', 'Ember-roasted native potatoes'), opt('a2', 'Ensalada chilena', 'Chilean tomato & onion salad'), opt('a3', 'Puré rústico de zapallo', 'Rustic squash mash'), opt('a4', 'Quínoa salteada', 'Sautéed quinoa', 900)] },
    { id: 'extrasFondo', name: L('Extras', 'Extras'), type: 'multi', required: false, options: [opt('e1', 'Huevo frito', 'Fried egg', 1200), opt('e2', 'Palta', 'Avocado', 1500), opt('e3', 'Pebre de la casa', 'House pebre salsa', 800), opt('e4', 'Merkén extra', 'Extra merkén')] },
    { id: 'extrasVeg', name: L('Extras veggie', 'Veggie extras'), type: 'multi', required: false, options: [opt('v1', 'Palta', 'Avocado', 1500), opt('v2', 'Champiñones salteados', 'Sautéed mushrooms', 1800), opt('v3', 'Pebre de la casa', 'House pebre salsa', 800)] },
    { id: 'empanadaPack', name: L('Cantidad', 'Quantity'), type: 'single', required: true, options: [opt('k1', 'Unidad', 'Single'), opt('k2', 'Trío (3 un.)', 'Trio (3 pcs)', 6400)] },
    { id: 'salsaPicante', name: L('Nivel de picante', 'Spice level'), type: 'single', required: true, options: [opt('s1', 'Suave', 'Mild'), opt('s2', 'Medio', 'Medium'), opt('s3', 'Fuego andino', 'Andean fire')] },
    { id: 'helado', name: L('Agrega', 'Add'), type: 'multi', required: false, options: [opt('h1', 'Bola de helado de canela', 'Cinnamon ice-cream scoop', 1900), opt('h2', 'Crema batida', 'Whipped cream', 700)] },
    { id: 'tamano', name: L('Tamaño', 'Size'), type: 'single', required: true, options: [opt('t1', 'Vaso (350 ml)', 'Glass (350 ml)'), opt('t2', 'Jarra (1 L)', 'Pitcher (1 L)', 4500)] },
    { id: 'endulzar', name: L('Endulzar', 'Sweetness'), type: 'single', required: true, options: [opt('n1', 'Natural', 'Natural'), opt('n2', 'Con stevia', 'With stevia'), opt('n3', 'Con azúcar', 'With sugar')] },
    { id: 'copa', name: L('Formato', 'Serving'), type: 'single', required: true, options: [opt('c1', 'Copa', 'Glass'), opt('c2', 'Botella', 'Bottle', 14000)] }
  ];
}

function categories() {
  return [
    { id: 'entradas', name: L('Para compartir', 'To share'), icon: '🫓', order: 1, active: true },
    { id: 'empanadas', name: L('Empanadas', 'Empanadas'), icon: '🥟', order: 2, active: true },
    { id: 'fondos', name: L('Platos de fondo', 'Main courses'), icon: '🍲', order: 3, active: true },
    { id: 'parrilla', name: L('Del fogón', 'From the grill'), icon: '🔥', order: 4, active: true },
    { id: 'postres', name: L('Postres', 'Desserts'), icon: '🍮', order: 5, active: true },
    { id: 'bebidas', name: L('Bebidas', 'Drinks'), icon: '🥤', order: 6, active: true }
  ];
}

// [id, cat, emoji, tone, price, tags, mods, station, prep, popular, nameEs, nameEn, descEs, descEn, recipe]
const DISHES = [
  ['d1', 'entradas', '🫓', 'warning', 5900, ['vegano'], ['salsaPicante'], 'caliente', 8, false, 'Sopaipillas con pebre', 'Sopaipillas with pebre', 'Cinco sopaipillas de zapallo recién fritas con pebre cuchareado y ají verde.', 'Five freshly fried pumpkin flatbreads with chunky pebre salsa and green chili.', { harina: .25, zapallo: .2, tomate: .15, aceite: .05 }],
  ['d2', 'entradas', '🧀', 'warning', 8900, ['vegetariano', 'sinGluten'], [], 'parrilla', 10, true, 'Provoleta al fogón', 'Grilled provoleta', 'Queso provolone fundido en sartén de fierro, orégano de la sierra y tomates confitados.', 'Provolone melted in a cast-iron pan with mountain oregano and confit tomatoes.', { provolone: .2, tomate: .08 }],
  ['d3', 'entradas', '🥗', 'success', 7400, ['vegano', 'sinGluten'], ['extrasVeg'], 'fria', 7, false, 'Ensalada de quínoa y palta', 'Quinoa & avocado salad', 'Quínoa del altiplano, palta, choclo, tomate cherry y vinagreta de limón de Pica.', 'Highland quinoa, avocado, sweet corn, cherry tomatoes and Pica lime vinaigrette.', { quinoa: .12, palta: .15, choclo: .1, tomate: .08, limon: .05 }],
  ['d4', 'entradas', '🦐', 'danger', 10900, ['sinGluten', 'picante'], [], 'caliente', 10, false, 'Camarones al pil pil', 'Pil pil shrimp', 'Camarones salteados en aceite de oliva, ajo laminado y ají cacho de cabra.', 'Shrimp sizzled in olive oil with sliced garlic and cacho de cabra chili.', { camaron: .25, ajo: .03, aceite: .06, merken: .01 }],
  ['d5', 'empanadas', '🥟', 'warning', 3600, [], ['empanadaPack'], 'caliente', 12, true, 'Empanada de pino', 'Beef pino empanada', 'Carne picada a cuchillo, cebolla, huevo, aceituna y pasas. Horneada en horno de barro.', 'Hand-cut beef, onion, egg, olive and raisins. Baked in a clay oven.', { harina: .12, vacuno: .1, cebolla: .08, huevo: .5 }],
  ['d6', 'empanadas', '🥟', 'warning', 3400, ['vegetariano'], ['empanadaPack'], 'caliente', 9, false, 'Empanada de queso y albahaca', 'Cheese & basil empanada', 'Masa frita y crujiente rellena de queso mantecoso y albahaca fresca.', 'Crispy fried pastry filled with creamy cheese and fresh basil.', { harina: .12, queso: .1, albahaca: .01, aceite: .05 }],
  ['d7', 'empanadas', '🥟', 'accent', 3800, ['vegano', 'picante'], ['empanadaPack'], 'caliente', 12, false, 'Empanada de champiñón y merkén', 'Mushroom & merkén empanada', 'Champiñones, cebolla caramelizada y merkén ahumado en masa sin lácteos.', 'Mushrooms, caramelised onion and smoky merkén in a dairy-free pastry.', { harina: .12, champinon: .1, cebolla: .06, merken: .005 }],
  ['d8', 'fondos', '🍲', 'warning', 12900, ['sinGluten'], ['extrasFondo'], 'caliente', 18, true, 'Pastel de choclo', 'Corn pie', 'Pino de carne y pollo bajo una capa dorada de choclo molido con albahaca. En greda.', 'Beef and chicken filling under a golden crust of ground sweet corn and basil. Served in clay.', { choclo: .35, vacuno: .12, pollo: .1, cebolla: .08, albahaca: .01 }],
  ['d9', 'fondos', '🥘', 'danger', 11900, ['sinGluten'], ['extrasFondo'], 'caliente', 15, false, 'Cazuela de vacuno', 'Beef cazuela', 'Caldo lento con osobuco, papa, zapallo, choclo y porotos verdes.', 'Slow-cooked broth with beef shank, potato, squash, corn and green beans.', { vacuno: .3, papa: .2, zapallo: .15, choclo: .1 }],
  ['d10', 'fondos', '🐟', 'info', 14500, ['sinGluten'], ['acomp'], 'caliente', 16, false, 'Reineta a la mantequilla de ají', 'Pomfret in chili butter', 'Filete de reineta a la plancha con mantequilla de ají amarillo y alcaparras.', 'Griddled pomfret fillet with yellow chili butter and capers.', { reineta: .25, mantequilla: .03, papa: .2 }],
  ['d11', 'fondos', '🍛', 'success', 10500, ['vegano', 'sinGluten', 'picante'], ['salsaPicante', 'extrasVeg'], 'caliente', 14, false, 'Guiso de porotos y zapallo', 'Bean & squash stew', 'Porotos granados, zapallo camote, choclo y albahaca, con un toque de cacho de cabra.', 'Fresh cranberry beans, squash, corn and basil with a hint of chili.', { porotos: .25, zapallo: .2, choclo: .1, albahaca: .01 }],
  ['d12', 'fondos', '🍝', 'warning', 11400, ['vegetariano'], ['extrasVeg'], 'caliente', 14, false, 'Pantrucas de la abuela', 'Grandma\'s pantrucas', 'Pasta casera cortada a mano en caldo de verduras, huevo pochado y queso de cabra.', 'Hand-torn pasta in vegetable broth with a poached egg and goat cheese.', { harina: .2, huevo: 1, queso: .05 }],
  ['d13', 'parrilla', '🥩', 'danger', 18900, ['sinGluten'], ['punto', 'acomp', 'extrasFondo'], 'parrilla', 20, true, 'Lomo vetado al rescoldo', 'Ember-grilled ribeye', '350 g de lomo vetado madurado, sellado a la leña de espino y sal de Cáhuil.', '350 g dry-aged ribeye seared over espino wood with Cáhuil sea salt.', { lomo: .35, papa: .2, lena: .8 }],
  ['d14', 'parrilla', '🍗', 'warning', 13900, ['sinGluten', 'picante'], ['acomp', 'extrasFondo'], 'parrilla', 18, false, 'Pollo al merkén', 'Merkén chicken', 'Truto deshuesado marinado en merkén y miel de ulmo, a las brasas.', 'Boneless thigh marinated in merkén and ulmo honey, char-grilled.', { pollo: .3, merken: .01, miel: .02, lena: .5 }],
  ['d15', 'parrilla', '🌭', 'danger', 9900, [], ['acomp'], 'parrilla', 14, false, 'Tabla de longanizas', 'Sausage board', 'Longaniza de Chillán y prietas a la parrilla con pebre y pan amasado.', 'Grilled Chillán longaniza and blood sausage with pebre and homemade bread.', { longaniza: .3, harina: .1, lena: .5 }],
  ['d16', 'parrilla', '🌽', 'success', 11900, ['vegano', 'sinGluten'], ['acomp', 'extrasVeg'], 'parrilla', 15, false, 'Parrillada de verduras', 'Grilled vegetable platter', 'Choclo, zapallo italiano, pimentón, berenjena y champiñones con chimichurri.', 'Corn, zucchini, peppers, eggplant and mushrooms with chimichurri.', { choclo: .2, champinon: .1, zapallo: .15, lena: .4 }],
  ['d17', 'postres', '🍮', 'warning', 4900, ['vegetariano', 'sinGluten'], ['helado'], 'postres', 4, false, 'Leche asada', 'Leche asada', 'Flan horneado al estilo campo con caramelo tostado.', 'Country-style baked custard with toasted caramel.', { leche: .2, huevo: 1, azucar: .05 }],
  ['d18', 'postres', '🥧', 'accent', 5600, ['vegetariano'], ['helado'], 'postres', 5, true, 'Kuchen de murta', 'Murta berry kuchen', 'Masa quebrada con murta del sur y crumble de avena tibio.', 'Shortcrust tart with southern murta berries and warm oat crumble.', { harina: .1, murta: .08, mantequilla: .03, azucar: .04 }],
  ['d19', 'postres', '🍨', 'primary', 4500, ['vegano', 'sinGluten'], [], 'postres', 3, false, 'Sorbete de maqui y frambuesa', 'Maqui & raspberry sorbet', 'Dos bolas de sorbete artesanal sin lácteos.', 'Two scoops of dairy-free artisan sorbet.', { frambuesa: .12, azucar: .04 }],
  ['d20', 'bebidas', '🍹', 'warning', 3500, ['vegano', 'sinGluten'], ['tamano', 'endulzar'], 'barra', 3, false, 'Jugo natural de temporada', 'Seasonal fresh juice', 'Frambuesa, mango o piña. Pregunta por el sabor del día.', 'Raspberry, mango or pineapple. Ask for today\'s flavour.', { frambuesa: .15 }],
  ['d21', 'bebidas', '🍋', 'success', 3900, ['vegano', 'sinGluten'], ['tamano', 'endulzar'], 'barra', 3, true, 'Limonada de menta y jengibre', 'Mint & ginger lemonade', 'Limón exprimido, menta fresca y jengibre rallado.', 'Fresh-squeezed lemon, mint and grated ginger.', { limon: .12, menta: .01 }],
  ['d22', 'bebidas', '🍷', 'danger', 5200, ['vegano', 'sinGluten'], ['copa'], 'barra', 1, false, 'Carmenere del valle', 'Valley Carmenere', 'Tinto de cepa carmenere, notas de pimentón y frutos rojos. (+18)', 'Red Carmenere with notes of bell pepper and red fruit. (18+)', { vino: .2 }],
  ['d23', 'bebidas', '🧉', 'warning', 2900, ['vegano'], [], 'barra', 2, false, 'Mote con huesillo', 'Mote con huesillo', 'El clásico refresco chileno: duraznos deshidratados, mote de trigo y almíbar.', 'The classic Chilean refresher: dried peaches, husked wheat and syrup.', { huesillo: .1, azucar: .03 }],
  ['d24', 'bebidas', '☕', 'accent', 2500, ['vegano', 'sinGluten'], [], 'barra', 2, false, 'Café de grano', 'Coffee', 'Espresso, americano o cortado con bebida vegetal.', 'Espresso, americano or cortado with plant milk.', { cafe: .02 }],
  ['d25', 'bebidas', '🍺', 'warning', 4200, ['vegano'], [], 'barra', 1, false, 'Cerveza artesanal Cumbre', 'Cumbre craft beer', 'Cerveza ámbar de la casa, 500 ml. (+18)', 'House amber ale, 500 ml. (18+)', { cerveza: 1 }]
];

// [key, nombre, unidad, stock, mínimo, costo unitario, proveedor, categoría]
const INGREDIENTS = [
  ['harina', 'Harina', 'kg', 42, 15, 1100, 'Molino El Trigal', 'Secos'],
  ['zapallo', 'Zapallo camote', 'kg', 18, 8, 1300, 'Feria La Vega Sur', 'Verduras'],
  ['tomate', 'Tomate', 'kg', 14, 10, 1600, 'Feria La Vega Sur', 'Verduras'],
  ['aceite', 'Aceite de oliva', 'l', 9, 6, 7800, 'Olivares del Valle', 'Secos'],
  ['provolone', 'Queso provolone', 'kg', 3.2, 4, 12900, 'Lácteos Ranco', 'Lácteos'],
  ['quinoa', 'Quínoa', 'kg', 6, 3, 5200, 'Altiplano Orgánico', 'Secos'],
  ['palta', 'Palta Hass', 'kg', 7, 5, 4800, 'Feria La Vega Sur', 'Verduras'],
  ['choclo', 'Choclo', 'kg', 22, 10, 1500, 'Feria La Vega Sur', 'Verduras'],
  ['limon', 'Limón de Pica', 'kg', 5, 4, 2900, 'Frutos del Norte', 'Frutas'],
  ['camaron', 'Camarón ecuatoriano', 'kg', 2.4, 3, 14500, 'Pesquera Caleta Azul', 'Mar'],
  ['ajo', 'Ajo chilote', 'kg', 2, 1, 6900, 'Feria La Vega Sur', 'Verduras'],
  ['merken', 'Merkén ahumado', 'kg', 1.1, .5, 18900, 'Especias Wallmapu', 'Secos'],
  ['vacuno', 'Posta y osobuco', 'kg', 16, 10, 8900, 'Carnes Los Andes', 'Carnes'],
  ['cebolla', 'Cebolla', 'kg', 20, 8, 900, 'Feria La Vega Sur', 'Verduras'],
  ['huevo', 'Huevos', 'un', 180, 90, 190, 'Granja Doña Rosa', 'Lácteos'],
  ['queso', 'Queso mantecoso', 'kg', 5, 3, 8900, 'Lácteos Ranco', 'Lácteos'],
  ['albahaca', 'Albahaca', 'kg', .8, .5, 9900, 'Huerto Urbano', 'Verduras'],
  ['champinon', 'Champiñón', 'kg', 4, 3, 4900, 'Hongos del Sur', 'Verduras'],
  ['pollo', 'Truto de pollo', 'kg', 14, 8, 4200, 'Avícola San Pedro', 'Carnes'],
  ['papa', 'Papa nativa', 'kg', 26, 12, 1700, 'Chiloé Nativo', 'Verduras'],
  ['reineta', 'Reineta', 'kg', 3, 4, 11900, 'Pesquera Caleta Azul', 'Mar'],
  ['mantequilla', 'Mantequilla', 'kg', 4, 2, 7900, 'Lácteos Ranco', 'Lácteos'],
  ['porotos', 'Porotos granados', 'kg', 9, 5, 3200, 'Feria La Vega Sur', 'Verduras'],
  ['lomo', 'Lomo vetado madurado', 'kg', 11, 8, 18900, 'Carnes Los Andes', 'Carnes'],
  ['lena', 'Leña de espino', 'kg', 140, 80, 350, 'Leñas Colliguay', 'Insumos'],
  ['miel', 'Miel de ulmo', 'kg', 2, 1, 9800, 'Apícola Puyehue', 'Secos'],
  ['longaniza', 'Longaniza de Chillán', 'kg', 6, 4, 7900, 'Cecinas Ñuble', 'Carnes'],
  ['leche', 'Leche entera', 'l', 24, 12, 1050, 'Lácteos Ranco', 'Lácteos'],
  ['azucar', 'Azúcar', 'kg', 15, 6, 1200, 'Molino El Trigal', 'Secos'],
  ['murta', 'Murta del sur', 'kg', 1.2, 2, 12900, 'Frutos del Bosque', 'Frutas'],
  ['frambuesa', 'Frambuesa congelada', 'kg', 7, 4, 5900, 'Frutos del Bosque', 'Frutas'],
  ['menta', 'Menta fresca', 'kg', .6, .4, 8900, 'Huerto Urbano', 'Verduras'],
  ['vino', 'Carmenere (botella)', 'l', 38, 20, 6200, 'Viña Cerro Alto', 'Bebidas'],
  ['huesillo', 'Huesillos', 'kg', 4, 2, 6500, 'Frutos del Norte', 'Frutas'],
  ['cafe', 'Café de grano', 'kg', 3, 2, 21900, 'Tostaduría Cerro Alegre', 'Bebidas'],
  ['cerveza', 'Cerveza Cumbre 500 ml', 'un', 96, 48, 1400, 'Cervecera Cumbre', 'Bebidas']
];

// Plano: coordenadas en % del lienzo (100 × 62)
function tables() {
  const t = [];
  const add = (number, zone, x, y, seats, shape = 'square') => t.push({ id: 't' + number, number, zone, x, y, seats, shape, status: 'libre', calling: false, billRequested: false, sessionId: null });
  // Salón
  [[1, 8, 10, 2], [2, 22, 10, 2], [3, 36, 10, 4], [4, 50, 10, 4], [5, 8, 30, 4], [6, 22, 30, 4], [7, 36, 30, 6], [8, 50, 30, 2], [9, 8, 48, 6], [10, 30, 48, 8]].forEach(([n, x, y, s]) => add(n, 'Salón', x, y, s, s >= 6 ? 'rect' : n % 2 ? 'round' : 'square'));
  // Terraza
  [[11, 68, 10, 2], [12, 82, 10, 2], [13, 68, 27, 4], [14, 82, 27, 4], [15, 68, 44, 4], [16, 82, 44, 6]].forEach(([n, x, y, s]) => add(n, 'Terraza', x, y, s, 'round'));
  // Barra
  [[17, 50, 52, 2], [18, 58, 52, 2]].forEach(([n, x, y, s]) => add(n, 'Barra', x, y, s, 'round'));
  return t;
}

const FIRST = ['Valentina', 'Matías', 'Camila', 'Benjamín', 'Antonia', 'Vicente', 'Josefa', 'Martín', 'Isidora', 'Tomás', 'Florencia', 'Agustín', 'Catalina', 'Joaquín', 'Fernanda', 'Diego', 'Javiera', 'Cristóbal', 'Constanza', 'Ignacio', 'Daniela', 'Sebastián', 'Trinidad', 'Felipe'];
const LAST = ['Rojas', 'Muñoz', 'González', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Fuentes', 'Araya', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Pizarro', 'Carrasco', 'Vergara'];
const COMMENTS = [
  'La cazuela estaba increíble, como la de mi abuela.', 'Muy buena atención, el garzón súper atento.', 'El lomo vetado en su punto perfecto.',
  'Demoró un poco la comida, pero valió la pena.', 'Excelente ambiente en la terraza.', 'Las empanadas de pino, lo mejor.',
  'Pedir desde la mesa con el QR es comodísimo.', 'Postres muy ricos, el kuchen de murta imperdible.', 'Buena relación precio-calidad.',
  'Volveremos con la familia.', 'La limonada de menta y jengibre, un siete.', 'Un poco ruidoso el viernes, pero la comida de primera.'
];

export const COLORS = ['#c0392b', '#2c3e50', '#16a085', '#8e44ad', '#d35400', '#2980b9', '#7f8c8d', '#27ae60'];

function pad2(n) { return String(n).padStart(2, '0'); }
export function isoDay(d) { const x = new Date(d); return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`; }

export function seed() {
  const r = rng(20261);
  const now = Date.now();
  const mods = modGroups();
  const modById = Object.fromEntries(mods.map(m => [m.id, m]));
  const dishes = DISHES.map(([id, cat, emoji, tone, price, tags, dmods, station, prepMin, popular, nEs, nEn, dEs, dEn, recipe]) => ({
    id, cat, emoji, tone, price, tags, mods: dmods, station, prepMin, popular, available: true,
    name: L(nEs, nEn), desc: L(dEs, dEn),
    recipe: Object.entries(recipe).map(([ing, qty]) => ({ ing: 'i-' + ing, qty })),
    cost: Math.round(Object.entries(recipe).reduce((s, [ing, q]) => s + q * (INGREDIENTS.find(x => x[0] === ing)?.[5] || 0), 0))
  }));
  dishes.find(d => d.id === 'd10').available = false; // reineta agotada para el demo
  const ingredients = INGREDIENTS.map(([k, name, unit, stock, min, cost, supplier, category]) => ({ id: 'i-' + k, name, unit, stock, min, cost, supplier, category }));

  const tbl = tables();
  const users = [
    { id: 'u-admin', name: 'Rosa Huenchumilla', email: 'admin@fogonandino.cl', password: 'demo123', role: 'admin', color: COLORS[0], demo: true, active: true },
    { id: 'u-chef', name: 'Tomás Catrileo', email: 'cocina@fogonandino.cl', password: 'demo123', role: 'chef', color: COLORS[3], demo: true, active: true },
    { id: 'u-garzon', name: 'Camila Fuentes', email: 'garzon@fogonandino.cl', password: 'demo123', role: 'garzon', color: COLORS[2], demo: true, active: true },
    { id: 'u-cajero', name: 'Pedro Alarcón', email: 'caja@fogonandino.cl', password: 'demo123', role: 'cajero', color: COLORS[5], demo: true, active: true },
    { id: 'u-garzon2', name: 'Ignacio Paredes', email: 'ignacio@fogonandino.cl', password: 'demo123', role: 'garzon', color: COLORS[4], demo: false, active: true },
    { id: 'u-chef2', name: 'Daniela Millán', email: 'daniela@fogonandino.cl', password: 'demo123', role: 'chef', color: COLORS[6], demo: false, active: false }
  ];
  const waiters = ['u-garzon', 'u-garzon2'];

  // Ponderación de popularidad por plato
  const weight = d => (d.popular ? 3 : 1) * (d.cat === 'bebidas' ? 1.4 : 1);
  const pool = []; dishes.forEach(d => { for (let i = 0; i < weight(d) * 2; i++) pool.push(d); });
  const mains = pool.filter(d => d.cat !== 'bebidas' && d.cat !== 'postres');
  const drinks = pool.filter(d => d.cat === 'bebidas');
  const sweets = pool.filter(d => d.cat === 'postres');

  function pickMods(d) {
    const out = []; let extra = 0;
    (d.mods || []).forEach(gid => {
      const g = modById[gid]; if (!g) return;
      if (g.type === 'single') { const o = r.pick(g.options); out.push(o.es); extra += o.price; }
      else if (r.bool(.3)) { const o = r.pick(g.options); out.push(o.es); extra += o.price; }
    });
    return { mods: out, extra };
  }
  function makeItem(d, status = 'entregado', hist = false) {
    const { mods: m, extra } = pickMods(d);
    if (hist) return { dishId: d.id, qty: r.bool(.15) ? 2 : 1, price: d.price + extra, mods: m };
    return { id: 'it' + Math.floor(r() * 1e9).toString(36), dishId: d.id, name: d.name.es, qty: r.bool(.15) ? 2 : 1, price: d.price + extra, mods: m, note: '', station: d.station, status };
  }

  const orders = [], sessions = [], ratings = [];
  let seq = 1000;
  // Historial: 42 días (lunes cerrado)
  for (let back = 42; back >= 1; back--) {
    const day = new Date(now - back * 864e5);
    const dow = day.getDay();
    if (dow === 1) continue;
    const boost = dow === 5 || dow === 6 ? 1.5 : dow === 0 ? 1.2 : 1;
    const services = [[12.5, 16], [19.5, 23.5]];
    services.forEach(([from, to], si) => {
      if (dow === 0 && si === 1) return; // domingo sin cena
      const n = Math.round(r.int(6, 11) * boost * (si === 1 ? 1.15 : 1));
      for (let k = 0; k < n; k++) {
        const t = r.pick(tbl);
        const hour = from + r() * (to - from - 1);
        const open = new Date(day); open.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), r.int(0, 59), 0);
        const guests = Math.max(1, Math.min(t.seats, r.int(1, t.seats)));
        const items = [];
        for (let g = 0; g < guests; g++) {
          items.push(makeItem(r.pick(mains), 0, true));
          if (r.bool(.75)) items.push(makeItem(r.pick(drinks), 0, true));
          if (r.bool(.3)) items.push(makeItem(r.pick(sweets), 0, true));
        }
        if (r.bool(.5)) items.push(makeItem(r.pick(pool.filter(d => d.cat === 'entradas')), 0, true));
        const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
        const tipPct = r.pick([0, 10, 10, 10, 10, 15, 15, 20]);
        const tip = Math.round(subtotal * tipPct / 100 / 10) * 10;
        const closed = new Date(+open + r.int(45, 115) * 6e4);
        const sid = 's' + (seq + 1);
        const waiterId = r.pick(waiters);
        const num = ++seq;
        orders.push({ id: 'o' + num, number: num, tableId: t.id, tableNumber: t.number, sessionId: sid, items, status: 'pagado', source: r.bool(.62) ? 'mesa' : 'garzon', waiterId, note: '', createdAt: new Date(+open + r.int(3, 12) * 6e4).toISOString(), closedAt: closed.toISOString() });
        const s = { id: sid, tableId: t.id, tableNumber: t.number, guests, status: 'pagada', openedAt: open.toISOString(), closedAt: closed.toISOString(), createdAt: open.toISOString(), subtotal, tipPct, tip, total: subtotal + tip, method: r.pick(['Tarjeta', 'Tarjeta', 'Tarjeta', 'Efectivo', 'Transferencia', 'App']), split: r.bool(.25) ? r.int(2, guests || 2) : 1, waiterId };
        sessions.push(s);
        if (r.bool(.22)) {
          const stars = r.pick([5, 5, 5, 4, 4, 4, 3, 5, 2]);
          ratings.push({ id: 'r' + num, sessionId: sid, tableNumber: t.number, food: Math.min(5, stars + r.int(-1, 1) || 1), service: stars, ambience: Math.min(5, r.int(3, 5)), stars, comment: r.bool(.7) ? r.pick(COMMENTS) : '', createdAt: closed.toISOString(), published: stars >= 4 });
        }
      }
    });
  }

  // Estado en vivo: algunas mesas ocupadas con pedidos en distintos estados
  const live = [
    { n: 3, guests: 4, mins: 38, states: ['entregado', 'entregado', 'listo', 'preparando'], waiter: 'u-garzon' },
    { n: 5, guests: 3, mins: 22, states: ['preparando', 'preparando', 'pendiente'], waiter: 'u-garzon' },
    { n: 7, guests: 6, mins: 64, states: ['entregado', 'entregado', 'entregado', 'entregado', 'entregado'], waiter: 'u-garzon2', bill: true },
    { n: 11, guests: 2, mins: 9, states: ['pendiente', 'pendiente'], waiter: 'u-garzon', calling: true },
    { n: 13, guests: 4, mins: 17, states: ['listo', 'listo', 'preparando', 'pendiente'], waiter: 'u-garzon2' },
    { n: 17, guests: 2, mins: 4, states: ['pendiente', 'pendiente'], waiter: 'u-garzon2' }
  ];
  const calls = [];
  live.forEach(l => {
    const t = tbl.find(x => x.number === l.n);
    const open = new Date(now - l.mins * 6e4);
    const sid = 's-live-' + l.n;
    const items = l.states.map((st, i) => {
      const src = i === 0 && r.bool(.5) ? drinks : mains;
      let d = r.pick(src); if (!d.available) d = dishes[0];
      const it = makeItem(d, st);
      if (st === 'listo' || st === 'entregado') it.readyAt = new Date(+open + (l.mins - 2) * 6e4).toISOString();
      if (st === 'preparando') it.startedAt = new Date(+open + 3 * 6e4).toISOString();
      return it;
    });
    if (l.n === 5) items[0].note = 'Sin cebolla, por favor';
    const num = ++seq;
    const status = items.every(i => i.status === 'entregado') ? 'entregado' : items.every(i => ['listo', 'entregado'].includes(i.status)) ? 'listo' : items.some(i => i.status !== 'pendiente') ? 'preparando' : 'enviado';
    orders.push({ id: 'o' + num, number: num, tableId: t.id, tableNumber: t.number, sessionId: sid, items, status, source: l.n % 2 ? 'mesa' : 'garzon', waiterId: l.waiter, note: '', createdAt: new Date(+open + 2 * 6e4).toISOString() });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    sessions.push({ id: sid, tableId: t.id, tableNumber: t.number, guests: l.guests, status: 'abierta', openedAt: open.toISOString(), createdAt: open.toISOString(), subtotal, tip: 0, total: subtotal, waiterId: l.waiter });
    Object.assign(t, { status: 'ocupada', sessionId: sid, calling: !!l.calling, billRequested: !!l.bill, waiterId: l.waiter });
    if (l.calling) calls.push({ id: 'c-' + l.n, tableId: t.id, tableNumber: t.number, type: 'garzon', status: 'pendiente', createdAt: new Date(now - 90e3).toISOString() });
    if (l.bill) calls.push({ id: 'cb-' + l.n, tableId: t.id, tableNumber: t.number, type: 'cuenta', status: 'pendiente', createdAt: new Date(now - 3 * 6e4).toISOString() });
  });

  // Reservas: pasadas y próximas
  const reservations = [];
  for (let back = 20; back >= -14; back--) {
    const day = new Date(now - back * 864e5);
    if (day.getDay() === 1) continue;
    const n = r.int(1, back < 0 ? 4 : 5);
    for (let k = 0; k < n; k++) {
      const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
      const time = r.pick(['13:00', '13:30', '14:00', '20:00', '20:30', '21:00', '21:30']);
      const party = r.int(2, 8);
      let status;
      if (back > 0) status = r.pick(['sentada', 'sentada', 'sentada', 'sentada', 'no-show', 'cancelada']);
      else if (back === 0) status = r.pick(['confirmada', 'confirmada', 'pendiente']);
      else status = r.pick(['confirmada', 'confirmada', 'pendiente', 'pendiente', 'cancelada']);
      const t = tbl.filter(x => x.seats >= party);
      reservations.push({
        id: 'rs' + back + '-' + k, code: 'FA-' + (4100 + reservations.length * 7 + k), name, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`,
        email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@correo.cl',
        date: isoDay(day), time, party, zone: r.pick(['Salón', 'Salón', 'Terraza', 'Sin preferencia']),
        notes: r.bool(.25) ? r.pick(['Cumpleaños, traer vela', 'Una persona celíaca', 'Silla de bebé', 'Aniversario']) : '',
        status, tableId: status !== 'pendiente' && t.length ? r.pick(t).id : '', source: r.pick(['web', 'web', 'teléfono', 'presencial']),
        createdAt: new Date(+day - r.int(1, 10) * 864e5).toISOString()
      });
    }
  }

  // Personal y turnos de la semana actual
  const staff = [
    ['Tomás Catrileo', 'Jefe de cocina', 'caliente'], ['Daniela Millán', 'Cocinera', 'caliente'], ['Luis Ancamil', 'Parrillero', 'parrilla'],
    ['Marta Quilodrán', 'Ayudante de cocina', 'fria'], ['Sofía Lienlaf', 'Pastelera', 'postres'], ['Camila Fuentes', 'Garzona', 'salon'],
    ['Ignacio Paredes', 'Garzón', 'salon'], ['Josefa Painemal', 'Garzona', 'terraza'], ['Andrés Cayul', 'Bartender', 'barra'],
    ['Pedro Alarcón', 'Cajero', 'caja'], ['Rocío Nahuel', 'Anfitriona', 'salon']
  ].map(([name, position, area], i) => ({ id: 'st' + i, name, position, area, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, color: COLORS[i % COLORS.length], active: i !== 4 || true, hourly: r.pick([3800, 4200, 4500, 5200, 6900]), hiredAt: new Date(now - r.int(60, 1500) * 864e5).toISOString() }));
  const shifts = [];
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let w = 0; w < 2; w++) for (let d = 1; d < 7; d++) {
    const day = new Date(+monday + (w * 7 + d) * 864e5);
    staff.forEach((s, i) => {
      if (r.bool(.28)) return;
      const t = (i + d + w) % 3 === 0 ? ['11:30', '17:00'] : (i + d) % 3 === 1 ? ['18:30', '00:30'] : ['12:00', '23:30'];
      shifts.push({ id: `sh${w}${d}${i}`, staffId: s.id, date: isoDay(day), start: t[0], end: t[1], note: '' });
    });
  }

  const settings = {
    name: 'Fogón Andino',
    tagline: L('Cocina de fuego y montaña', 'Fire & mountain cooking'),
    heroTitle: L('Cocina chilena al fuego, desde el cerro a tu mesa', 'Chilean fire cooking, from the hills to your table'),
    heroText: L('Leña de espino, productos de temporada y recetas de familia en pleno Cerro Alegre.', 'Espino wood, seasonal produce and family recipes in the heart of Cerro Alegre.'),
    announcement: L('Esta semana: cazuela de vacuno con choclo nuevo 🌽', 'This week: beef cazuela with new-season corn 🌽'),
    address: 'Pasaje Los Copihues 482, Cerro Alegre, Valparaíso',
    phone: '+56 32 555 0182', email: 'hola@fogonandino.cl', instagram: '@fogonandino',
    hours: [
      { day: 0, label: 'Domingo', open: '12:30', close: '17:00', closed: false },
      { day: 1, label: 'Lunes', open: '', close: '', closed: true },
      { day: 2, label: 'Martes', open: '12:30', close: '23:30', closed: false },
      { day: 3, label: 'Miércoles', open: '12:30', close: '23:30', closed: false },
      { day: 4, label: 'Jueves', open: '12:30', close: '23:30', closed: false },
      { day: 5, label: 'Viernes', open: '12:30', close: '00:30', closed: false },
      { day: 6, label: 'Sábado', open: '12:30', close: '00:30', closed: false }
    ],
    tipOptions: [0, 10, 15, 20], defaultTip: 10,
    kdsWarn: 10, kdsLate: 18,
    reservationsOpen: true, maxParty: 10,
    lowStockAlerts: true, decrementStock: true,
    orderingEnabled: true
  };

  return {
    settings, orderSeq: seq, categories: categories(), modGroups: mods, dishes, ingredients, tables: tbl, users,
    orders, sessions, calls, ratings, reservations, staff, shifts
  };
}
