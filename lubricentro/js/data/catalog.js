// Catálogo estático de Pits Rápido: segmentos, modelos (ficha técnica de lubricación),
// plantillas de tareas y recomendaciones típicas que el técnico ofrece en la bahía.

export const SEGMENTS = [
  { id: 'city', name: 'Citycar', icon: '🚗', desc: 'Autos pequeños hasta 1.4 L', examples: 'Kia Morning, Suzuki Swift, Chevrolet Spark' },
  { id: 'sedan', name: 'Sedán / hatchback', icon: '🚘', desc: 'Compactos y medianos 1.4–2.0 L', examples: 'Toyota Yaris, Mazda 3, Hyundai Accent' },
  { id: 'suv', name: 'SUV / crossover', icon: '🚙', desc: 'Crossover y SUV medianos', examples: 'Toyota RAV4, Kia Sportage, MG ZS' },
  { id: 'pickup', name: 'Camioneta / pickup', icon: '🛻', desc: 'Pickups y SUV grandes, diésel o bencina', examples: 'Toyota Hilux, Mitsubishi L200, Ford Ranger' },
  { id: 'premium', name: 'Premium / deportivo', icon: '🏎️', desc: 'Marcas premium y alto desempeño', examples: 'BMW Serie 3, Audi A4, Porsche 911' }
];
export const SEG = Object.fromEntries(SEGMENTS.map(s => [s.id, s]));

// [marca, modelo, segmento, aceite, litros, desde, hasta, filtro aceite, filtro aire, combustible]
const M = [
  ['Kia', 'Morning', 'city', '10w40', 3.2, 2012, 2025, 'FM-1102', 'FA-210', 'Bencina'],
  ['Suzuki', 'Swift', 'city', '0w20', 3.1, 2014, 2025, 'FM-1108', 'FA-214', 'Bencina'],
  ['Chevrolet', 'Spark GT', 'city', '10w40', 3.5, 2011, 2019, 'FM-1102', 'FA-206', 'Bencina'],
  ['Hyundai', 'Grand i10', 'city', '5w30', 3.3, 2014, 2025, 'FM-1102', 'FA-212', 'Bencina'],
  ['Peugeot', '208', 'city', '5w30', 3.5, 2013, 2025, 'FM-1320', 'FA-305', 'Bencina'],
  ['Toyota', 'Yaris', 'sedan', '0w20', 3.4, 2010, 2025, 'FM-1108', 'FA-220', 'Bencina'],
  ['Hyundai', 'Accent', 'sedan', '5w30', 3.6, 2011, 2025, 'FM-1102', 'FA-222', 'Bencina'],
  ['Nissan', 'Versa', 'sedan', '5w30', 3.4, 2012, 2025, 'FM-1115', 'FA-230', 'Bencina'],
  ['Chevrolet', 'Sail', 'sedan', '10w40', 3.8, 2011, 2023, 'FM-1102', 'FA-206', 'Bencina'],
  ['Mazda', '3', 'sedan', '0w20', 4.2, 2010, 2025, 'FM-1130', 'FA-240', 'Bencina'],
  ['Toyota', 'Corolla Híbrido', 'sedan', '0w20', 4.2, 2019, 2025, 'FM-1108', 'FA-224', 'Híbrido'],
  ['Volkswagen', 'Golf', 'sedan', '5w40e', 4.0, 2013, 2025, 'FM-1450', 'FA-410', 'Bencina'],
  ['Toyota', 'RAV4', 'suv', '0w20', 4.4, 2013, 2025, 'FM-1108', 'FA-250', 'Bencina'],
  ['Kia', 'Sportage', 'suv', '5w30', 4.8, 2011, 2025, 'FM-1102', 'FA-252', 'Bencina'],
  ['Hyundai', 'Tucson', 'suv', '5w30', 4.8, 2011, 2025, 'FM-1102', 'FA-252', 'Bencina'],
  ['MG', 'ZS', 'suv', '5w30', 4.0, 2018, 2025, 'FM-1340', 'FA-260', 'Bencina'],
  ['Chery', 'Tiggo 2', 'suv', '5w30', 4.0, 2017, 2025, 'FM-1340', 'FA-262', 'Bencina'],
  ['Subaru', 'Forester', 'suv', '0w20', 5.1, 2013, 2025, 'FM-1160', 'FA-270', 'Bencina'],
  ['Mazda', 'CX-5', 'suv', '0w20', 4.5, 2013, 2025, 'FM-1130', 'FA-242', 'Bencina'],
  ['Renault', 'Duster', 'suv', '5w30', 4.8, 2012, 2025, 'FM-1320', 'FA-310', 'Bencina'],
  ['Toyota', 'Hilux 2.4 D', 'pickup', '15w40d', 7.5, 2016, 2025, 'FM-1200', 'FA-280', 'Diésel'],
  ['Mitsubishi', 'L200 2.4 D', 'pickup', '15w40d', 6.8, 2016, 2025, 'FM-1210', 'FA-282', 'Diésel'],
  ['Ford', 'Ranger 3.2 D', 'pickup', '5w30', 8.2, 2013, 2025, 'FM-1220', 'FA-290', 'Diésel'],
  ['Nissan', 'Navara 2.3 D', 'pickup', '15w40d', 6.9, 2016, 2025, 'FM-1115', 'FA-284', 'Diésel'],
  ['Chevrolet', 'Silverado 5.3', 'pickup', '0w20', 7.6, 2014, 2025, 'FM-1240', 'FA-295', 'Bencina'],
  ['Toyota', 'Land Cruiser Prado', 'pickup', '5w30', 6.2, 2010, 2025, 'FM-1200', 'FA-286', 'Diésel'],
  ['BMW', 'Serie 3', 'premium', '5w40e', 5.2, 2012, 2025, 'FM-1500', 'FA-500', 'Bencina'],
  ['Mercedes-Benz', 'Clase C', 'premium', '5w40e', 6.5, 2014, 2025, 'FM-1510', 'FA-510', 'Bencina'],
  ['Audi', 'A4', 'premium', '5w40e', 4.6, 2012, 2025, 'FM-1450', 'FA-520', 'Bencina'],
  ['Volvo', 'XC60', 'premium', '0w20', 5.6, 2014, 2025, 'FM-1530', 'FA-530', 'Híbrido'],
  ['Porsche', '911', 'premium', '0w40p', 8.5, 2012, 2025, 'FM-1600', 'FA-600', 'Bencina'],
  ['Lexus', 'NX 350h', 'premium', '0w20', 4.5, 2015, 2025, 'FM-1108', 'FA-540', 'Híbrido']
];
export const MODELS = M.map(([make, model, segment, oil, liters, from, to, fOil, fAir, fuel], i) => ({ id: 'm' + i, make, model, segment, oil, liters, from, to, fOil, fAir, fCab: 'FC-' + (100 + (i * 7) % 60), fuel }));
export const MAKES = [...new Set(MODELS.map(m => m.make))].sort();
export const modelById = id => MODELS.find(m => m.id === id) || null;
export const findModel = (make, model) => MODELS.find(m => m.make === make && m.model === model) || null;

// Tareas de checklist por servicio (las ve el técnico en su bahía).
export const TASKS = {
  aceite: ['Drenar aceite usado', 'Cambiar filtro de aceite', 'Cargar aceite nuevo', 'Revisar niveles (refrigerante, frenos, dirección)', 'Resetear indicador y pegar sticker'],
  filtros: ['Cambiar filtro de aire', 'Cambiar filtro de cabina'],
  frenos: ['Desmontar ruedas y calipers', 'Medir discos', 'Instalar pastillas nuevas', 'Prueba de frenado'],
  'liquido-frenos': ['Purgar circuito', 'Cargar líquido DOT 4', 'Medir humedad final'],
  neumaticos: ['Desmontar neumáticos', 'Montar neumáticos nuevos', 'Balancear 4 ruedas', 'Torque de pernos'],
  rotacion: ['Rotar en cruz', 'Ajustar presiones'],
  alineacion: ['Montar en alineadora', 'Ajustar convergencia y caída', 'Balancear 4 ruedas', 'Imprimir reporte'],
  bateria: ['Test de batería y alternador', 'Reemplazar batería', 'Limpiar bornes'],
  pretecnica: ['Luces y señalizadores', 'Frenos y suspensión', 'Emisiones (simulación)', 'Neumáticos y vidrios', 'Informe 40 puntos'],
  lavado: ['Prelavado y espuma', 'Lavado y secado', 'Aspirado interior'],
  refrigerante: ['Vaciar refrigerante', 'Cargar refrigerante orgánico', 'Purgar aire del sistema'],
  scanner: ['Conectar escáner OBD2', 'Leer y borrar códigos', 'Informe al cliente']
};

// Recomendaciones (venta sugerida) que el técnico agrega desde la bahía.
export const UPSELLS = [
  { id: 'u-pastillas', label: 'Pastillas de freno delanteras al 20%', serviceId: 'frenos', icon: '🛑' },
  { id: 'u-filtro-aire', label: 'Filtro de aire saturado de polvo', serviceId: 'filtros', icon: '💨' },
  { id: 'u-bateria', label: 'Batería con 45% de salud (test)', serviceId: 'bateria', icon: '🔋' },
  { id: 'u-alineacion', label: 'Desgaste irregular en neumáticos delanteros', serviceId: 'alineacion', icon: '🎯' },
  { id: 'u-liquido', label: 'Líquido de frenos con 3% de humedad', serviceId: 'liquido-frenos', icon: '💧' },
  { id: 'u-refrigerante', label: 'Refrigerante degradado (pH bajo)', serviceId: 'refrigerante', icon: '🌡️' },
  { id: 'u-plumillas', label: 'Plumillas limpiaparabrisas agrietadas', price: 14990, icon: '🌧️' }
];

export const PAY_METHODS = [['debito', 'Tarjeta de débito'], ['credito', 'Tarjeta de crédito'], ['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['plan', 'Plan prepagado']];
export const COLORS = ['#0074cc', '#d9534f', '#5cb85c', '#f0ad4e', '#5bc0de', '#8e44ad', '#16a085', '#c0392b', '#2c3e50', '#e67e22'];

// Días de historial con detalle completo (antes de eso, estadística diaria agregada).
export const DETAIL_DAYS = 8;
