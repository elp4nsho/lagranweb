// Carta del restaurante ficticio "Fogón Andino". Textos bilingües { es, en }.
window.FOGON = {
  info: {
    name: 'Fogón Andino',
    tagline: { es: 'Cocina de fuego y montaña', en: 'Fire & mountain cooking' },
    address: 'Pasaje Los Copihues 482, Valparaíso',
    phone: '+56 32 555 0182',
    // 0 = domingo. Rangos en minutos desde medianoche; el fin puede pasar de 1440 (cierra después de medianoche).
    hours: {
      0: [[12 * 60 + 30, 17 * 60]],
      1: [],
      2: [[12 * 60 + 30, 16 * 60], [19 * 60 + 30, 23 * 60 + 30]],
      3: [[12 * 60 + 30, 16 * 60], [19 * 60 + 30, 23 * 60 + 30]],
      4: [[12 * 60 + 30, 16 * 60], [19 * 60 + 30, 23 * 60 + 30]],
      5: [[12 * 60 + 30, 24 * 60 + 30]],
      6: [[12 * 60 + 30, 24 * 60 + 30]]
    }
  },
  tags: {
    vegano: { es: 'Vegano', en: 'Vegan', icon: '🌱' },
    vegetariano: { es: 'Vegetariano', en: 'Vegetarian', icon: '🥕' },
    sinGluten: { es: 'Sin gluten', en: 'Gluten free', icon: '🌾' },
    picante: { es: 'Picante', en: 'Spicy', icon: '🌶️' }
  },
  // Grupos de modificadores reutilizables
  mods: {
    punto: { name: { es: 'Punto de la carne', en: 'Doneness' }, type: 'single', required: true, noDefault: true, options: [
      { es: 'Jugoso', en: 'Medium rare', price: 0 }, { es: 'A punto', en: 'Medium', price: 0 }, { es: 'Bien cocido', en: 'Well done', price: 0 }] },
    acomp: { name: { es: 'Acompañamiento', en: 'Side' }, type: 'single', required: true, options: [
      { es: 'Papas nativas al rescoldo', en: 'Ember-roasted native potatoes', price: 0 },
      { es: 'Ensalada chilena', en: 'Chilean tomato & onion salad', price: 0 },
      { es: 'Puré rústico de zapallo', en: 'Rustic squash mash', price: 0 },
      { es: 'Quínoa salteada', en: 'Sautéed quinoa', price: 900 }] },
    extrasFondo: { name: { es: 'Extras', en: 'Extras' }, type: 'multi', options: [
      { es: 'Huevo frito', en: 'Fried egg', price: 1200 }, { es: 'Palta', en: 'Avocado', price: 1500 },
      { es: 'Pebre de la casa', en: 'House pebre salsa', price: 800 }, { es: 'Merkén extra', en: 'Extra merkén', price: 0 }] },
    extrasVeg: { name: { es: 'Extras', en: 'Extras' }, type: 'multi', options: [
      { es: 'Palta', en: 'Avocado', price: 1500 }, { es: 'Champiñones salteados', en: 'Sautéed mushrooms', price: 1800 }, { es: 'Pebre de la casa', en: 'House pebre salsa', price: 800 }] },
    empanadaPack: { name: { es: 'Cantidad', en: 'Quantity' }, type: 'single', required: true, options: [
      { es: 'Unidad', en: 'Single', price: 0 }, { es: 'Trío (3 un.)', en: 'Trio (3 pcs)', price: 6400 }] },
    salsaPicante: { name: { es: 'Nivel de picante', en: 'Spice level' }, type: 'single', required: true, options: [
      { es: 'Suave', en: 'Mild', price: 0 }, { es: 'Medio', en: 'Medium', price: 0 }, { es: 'Fuego andino 🔥', en: 'Andean fire 🔥', price: 0 }] },
    helado: { name: { es: 'Agrega', en: 'Add' }, type: 'multi', options: [
      { es: 'Bola de helado de canela', en: 'Cinnamon ice-cream scoop', price: 1900 }, { es: 'Crema batida', en: 'Whipped cream', price: 700 }] },
    tamano: { name: { es: 'Tamaño', en: 'Size' }, type: 'single', required: true, options: [
      { es: 'Vaso (350 ml)', en: 'Glass (350 ml)', price: 0 }, { es: 'Jarra (1 L)', en: 'Pitcher (1 L)', price: 4500 }] },
    endulzar: { name: { es: 'Endulzar', en: 'Sweetness' }, type: 'single', required: true, options: [
      { es: 'Natural', en: 'Natural', price: 0 }, { es: 'Con stevia', en: 'With stevia', price: 0 }, { es: 'Con azúcar', en: 'With sugar', price: 0 }] },
    copa: { name: { es: 'Formato', en: 'Serving' }, type: 'single', required: true, options: [
      { es: 'Copa', en: 'Glass', price: 0 }, { es: 'Botella', en: 'Bottle', price: 14000 }] }
  },
  categories: [
    { id: 'entradas', es: 'Para compartir', en: 'To share', icon: '🫓' },
    { id: 'empanadas', es: 'Empanadas', en: 'Empanadas', icon: '🥟' },
    { id: 'fondos', es: 'Platos de fondo', en: 'Main courses', icon: '🍲' },
    { id: 'parrilla', es: 'Del fogón', en: 'From the grill', icon: '🔥' },
    { id: 'postres', es: 'Postres', en: 'Desserts', icon: '🍮' },
    { id: 'bebidas', es: 'Bebidas', en: 'Drinks', icon: '🥤' }
  ],
  dishes: [
    { id: 'd1', cat: 'entradas', emoji: '🫓', bg: '#f2b84b', price: 5900, tags: ['vegano'], mods: ['salsaPicante'],
      es: { n: 'Sopaipillas con pebre', d: 'Cinco sopaipillas de zapallo recién fritas con pebre cuchareado y ají verde.' },
      en: { n: 'Sopaipillas with pebre', d: 'Five freshly fried pumpkin flatbreads with chunky pebre salsa and green chili.' } },
    { id: 'd2', cat: 'entradas', emoji: '🧀', bg: '#e8c27a', price: 8900, tags: ['vegetariano', 'sinGluten'], popular: true,
      es: { n: 'Provoleta al fogón', d: 'Queso provolone fundido en sartén de fierro, orégano de la sierra y tomates confitados.' },
      en: { n: 'Grilled provoleta', d: 'Provolone melted in a cast-iron pan with mountain oregano and confit tomatoes.' } },
    { id: 'd3', cat: 'entradas', emoji: '🥗', bg: '#9fc27a', price: 7400, tags: ['vegano', 'sinGluten'], mods: ['extrasVeg'],
      es: { n: 'Ensalada de quínoa y palta', d: 'Quínoa del altiplano, palta, choclo, tomate cherry y vinagreta de limón de Pica.' },
      en: { n: 'Quinoa & avocado salad', d: 'Highland quinoa, avocado, sweet corn, cherry tomatoes and Pica lime vinaigrette.' } },
    { id: 'd4', cat: 'entradas', emoji: '🦐', bg: '#f08a6b', price: 10900, tags: ['sinGluten', 'picante'],
      es: { n: 'Camarones al pil pil', d: 'Camarones salteados en aceite de oliva, ajo laminado y ají cacho de cabra.' },
      en: { n: 'Pil pil shrimp', d: 'Shrimp sizzled in olive oil with sliced garlic and cacho de cabra chili.' } },

    { id: 'd5', cat: 'empanadas', emoji: '🥟', bg: '#e0a35a', price: 3600, tags: [], mods: ['empanadaPack'], popular: true,
      es: { n: 'Empanada de pino', d: 'Carne picada a cuchillo, cebolla, huevo, aceituna y pasas. Horneada en horno de barro.' },
      en: { n: 'Beef pino empanada', d: 'Hand-cut beef, onion, egg, olive and raisins. Baked in a clay oven.' } },
    { id: 'd6', cat: 'empanadas', emoji: '🥟', bg: '#f2c25b', price: 3400, tags: ['vegetariano'], mods: ['empanadaPack'],
      es: { n: 'Empanada de queso y albahaca', d: 'Masa frita y crujiente rellena de queso mantecoso y albahaca fresca.' },
      en: { n: 'Cheese & basil empanada', d: 'Crispy fried pastry filled with creamy cheese and fresh basil.' } },
    { id: 'd7', cat: 'empanadas', emoji: '🥟', bg: '#c9a46b', price: 3800, tags: ['vegano', 'picante'], mods: ['empanadaPack'],
      es: { n: 'Empanada de champiñón y merkén', d: 'Champiñones, cebolla caramelizada y merkén ahumado en masa sin lácteos.' },
      en: { n: 'Mushroom & merkén empanada', d: 'Mushrooms, caramelised onion and smoky merkén in a dairy-free pastry.' } },

    { id: 'd8', cat: 'fondos', emoji: '🍲', bg: '#e9a03b', price: 12900, tags: ['sinGluten'], popular: true, mods: ['extrasFondo'],
      es: { n: 'Pastel de choclo', d: 'Pino de carne y pollo bajo una capa dorada de choclo molido con albahaca. En greda.' },
      en: { n: 'Corn pie', d: 'Beef and chicken filling under a golden crust of ground sweet corn and basil. Served in clay.' } },
    { id: 'd9', cat: 'fondos', emoji: '🥘', bg: '#d4734a', price: 11900, tags: ['sinGluten'], mods: ['extrasFondo'],
      es: { n: 'Cazuela de vacuno', d: 'Caldo lento con osobuco, papa, zapallo, choclo y porotos verdes.' },
      en: { n: 'Beef cazuela', d: 'Slow-cooked broth with beef shank, potato, squash, corn and green beans.' } },
    { id: 'd10', cat: 'fondos', emoji: '🐟', bg: '#6fa8c7', price: 14500, tags: ['sinGluten'], mods: ['acomp'],
      es: { n: 'Reineta a la mantequilla de ají', d: 'Filete de reineta a la plancha con mantequilla de ají amarillo y alcaparras.' },
      en: { n: 'Pomfret in chili butter', d: 'Griddled pomfret fillet with yellow chili butter and capers.' } },
    { id: 'd11', cat: 'fondos', emoji: '🍛', bg: '#8bb174', price: 10500, tags: ['vegano', 'sinGluten', 'picante'], mods: ['salsaPicante', 'extrasVeg'],
      es: { n: 'Guiso de porotos y zapallo', d: 'Porotos granados, zapallo camote, choclo y albahaca, con un toque de cacho de cabra.' },
      en: { n: 'Bean & squash stew', d: 'Fresh cranberry beans, squash, corn and basil with a hint of chili.' } },
    { id: 'd12', cat: 'fondos', emoji: '🍝', bg: '#e7b86a', price: 11400, tags: ['vegetariano'], mods: ['extrasVeg'],
      es: { n: 'Pantrucas de la abuela', d: 'Pasta casera cortada a mano en caldo de verduras, huevo pochado y queso de cabra.' },
      en: { n: 'Grandma\'s pantrucas', d: 'Hand-torn pasta in vegetable broth with a poached egg and goat cheese.' } },

    { id: 'd13', cat: 'parrilla', emoji: '🥩', bg: '#b9563f', price: 18900, tags: ['sinGluten'], popular: true, mods: ['punto', 'acomp', 'extrasFondo'],
      es: { n: 'Lomo vetado al rescoldo', d: '350 g de lomo vetado madurado, sellado a la leña de espino y sal de Cáhuil.' },
      en: { n: 'Ember-grilled ribeye', d: '350 g dry-aged ribeye seared over espino wood with Cáhuil sea salt.' } },
    { id: 'd14', cat: 'parrilla', emoji: '🍗', bg: '#d9894a', price: 13900, tags: ['sinGluten', 'picante'], mods: ['acomp', 'extrasFondo'],
      es: { n: 'Pollo al merkén', d: 'Truto deshuesado marinado en merkén y miel de ulmo, a las brasas.' },
      en: { n: 'Merkén chicken', d: 'Boneless thigh marinated in merkén and ulmo honey, char-grilled.' } },
    { id: 'd15', cat: 'parrilla', emoji: '🌭', bg: '#c96b4f', price: 9900, tags: [], mods: ['acomp'],
      es: { n: 'Tabla de longanizas', d: 'Longaniza de Chillán y prietas a la parrilla con pebre y pan amasado.' },
      en: { n: 'Sausage board', d: 'Grilled Chillán longaniza and blood sausage with pebre and homemade bread.' } },
    { id: 'd16', cat: 'parrilla', emoji: '🌽', bg: '#9db86b', price: 11900, tags: ['vegano', 'sinGluten'], mods: ['acomp', 'extrasVeg'],
      es: { n: 'Parrillada de verduras', d: 'Choclo, zapallo italiano, pimentón, berenjena y champiñones con chimichurri.' },
      en: { n: 'Grilled vegetable platter', d: 'Corn, zucchini, peppers, eggplant and mushrooms with chimichurri.' } },

    { id: 'd17', cat: 'postres', emoji: '🍮', bg: '#e7b05a', price: 4900, tags: ['vegetariano', 'sinGluten'], mods: ['helado'],
      es: { n: 'Leche asada', d: 'Flan horneado al estilo campo con caramelo tostado.' },
      en: { n: 'Leche asada', d: 'Country-style baked custard with toasted caramel.' } },
    { id: 'd18', cat: 'postres', emoji: '🥧', bg: '#d98c5f', price: 5600, tags: ['vegetariano'], popular: true, mods: ['helado'],
      es: { n: 'Kuchen de murta', d: 'Masa quebrada con murta del sur y crumble de avena tibio.' },
      en: { n: 'Murta berry kuchen', d: 'Shortcrust tart with southern murta berries and warm oat crumble.' } },
    { id: 'd19', cat: 'postres', emoji: '🍨', bg: '#b28fc9', price: 4500, tags: ['vegano', 'sinGluten'],
      es: { n: 'Sorbete de maqui y frambuesa', d: 'Dos bolas de sorbete artesanal sin lácteos.' },
      en: { n: 'Maqui & raspberry sorbet', d: 'Two scoops of dairy-free artisan sorbet.' } },

    { id: 'd20', cat: 'bebidas', emoji: '🍹', bg: '#f0a35b', price: 3500, tags: ['vegano', 'sinGluten'], mods: ['tamano', 'endulzar'],
      es: { n: 'Jugo natural de temporada', d: 'Frambuesa, mango o piña. Pregunta por el sabor del día.' },
      en: { n: 'Seasonal fresh juice', d: 'Raspberry, mango or pineapple. Ask for today\'s flavour.' } },
    { id: 'd21', cat: 'bebidas', emoji: '🍋', bg: '#c6d36b', price: 3900, tags: ['vegano', 'sinGluten'], mods: ['tamano', 'endulzar'],
      es: { n: 'Limonada de menta y jengibre', d: 'Limón exprimido, menta fresca y jengibre rallado.' },
      en: { n: 'Mint & ginger lemonade', d: 'Fresh-squeezed lemon, mint and grated ginger.' } },
    { id: 'd22', cat: 'bebidas', emoji: '🍷', bg: '#a8445a', price: 5200, tags: ['vegano', 'sinGluten'], mods: ['copa'],
      es: { n: 'Carmenere del valle', d: 'Tinto de cepa carmenere, notas de pimentón y frutos rojos. (+18)' },
      en: { n: 'Valley Carmenere', d: 'Red Carmenere with notes of bell pepper and red fruit. (18+)' } },
    { id: 'd23', cat: 'bebidas', emoji: '🧉', bg: '#7fa35a', price: 2900, tags: ['vegano'],
      es: { n: 'Mote con huesillo', d: 'El clásico refresco chileno: duraznos deshidratados, mote de trigo y almíbar.' },
      en: { n: 'Mote con huesillo', d: 'The classic Chilean refresher: dried peaches, husked wheat and syrup.' } },
    { id: 'd24', cat: 'bebidas', emoji: '☕', bg: '#8a6247', price: 2500, tags: ['vegano', 'sinGluten'],
      es: { n: 'Café de grano', d: 'Espresso, americano o cortado con bebida vegetal.' },
      en: { n: 'Coffee', d: 'Espresso, americano or cortado with plant milk.' } }
  ]
};
