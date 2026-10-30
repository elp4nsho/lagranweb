// Catálogo base de la semilla: marcas, modelos, colores, sucursales, planes de mantención, repuestos.
// (Las marcas y modelos son reales y genéricos; la automotora "Autoplaza Pacífico" es ficticia.)

export const BRANDS = [
  { id: 'toyota', name: 'Toyota', country: 'Japón', warrantyYears: 5, warrantyKm: 100000, plan: [10, 6] },
  { id: 'kia', name: 'Kia', country: 'Corea del Sur', warrantyYears: 7, warrantyKm: 150000, plan: [10, 12] },
  { id: 'hyundai', name: 'Hyundai', country: 'Corea del Sur', warrantyYears: 5, warrantyKm: 100000, plan: [10, 12] },
  { id: 'chevrolet', name: 'Chevrolet', country: 'EE.UU.', warrantyYears: 3, warrantyKm: 100000, plan: [10, 12] },
  { id: 'mazda', name: 'Mazda', country: 'Japón', warrantyYears: 3, warrantyKm: 100000, plan: [10, 12] },
  { id: 'bmw', name: 'BMW', country: 'Alemania', warrantyYears: 3, warrantyKm: 200000, plan: [15, 12] },
  { id: 'volvo', name: 'Volvo', country: 'Suecia', warrantyYears: 3, warrantyKm: 150000, plan: [15, 12] },
  { id: 'byd', name: 'BYD', country: 'China', warrantyYears: 6, warrantyKm: 150000, plan: [15, 12] }
];

// Paletas por marca: [nombre, hex, recargo]
export const PALETTES = {
  toyota: [['Blanco Súper', '#f1f1ee', 0], ['Plata Metálico', '#b9bdc3', 350000], ['Gris Oscuro', '#4b4f55', 350000], ['Negro Mica', '#16181b', 350000], ['Rojo Emoción', '#a3141e', 450000], ['Azul Celestial', '#2b4c7e', 350000]],
  kia: [['Blanco Nieve', '#f3f3f1', 0], ['Gris Gravedad', '#5a5e63', 390000], ['Negro Aurora', '#141518', 390000], ['Rojo Pista', '#b0101c', 390000], ['Azul Yate', '#1f3557', 390000], ['Verde Selva', '#3b5241', 490000]],
  hyundai: [['Blanco Atlas', '#f2f2f0', 0], ['Plata Tifón', '#b4b8bd', 350000], ['Gris Amazonas', '#575c5e', 350000], ['Negro Fantasma', '#121315', 350000], ['Azul Intenso', '#1d3f78', 350000], ['Naranja Lava', '#c4561c', 450000]],
  chevrolet: [['Blanco Summit', '#f4f4f2', 0], ['Plata Brillante', '#bfc3c8', 290000], ['Gris Satín', '#62666b', 290000], ['Negro Carbón', '#17181a', 290000], ['Rojo Carmín', '#9e1622', 390000], ['Azul Pacífico', '#24548f', 290000]],
  mazda: [['Blanco Perla', '#eeece6', 390000], ['Gris Máquina', '#6b6e72', 590000], ['Negro Jet', '#121213', 390000], ['Rojo Soul Crystal', '#9b0f1c', 690000], ['Azul Profundo', '#1d2c4c', 390000], ['Platino Cuarzo', '#c8c2b8', 490000]],
  bmw: [['Blanco Alpino', '#f3f3f3', 0], ['Negro Zafiro', '#101215', 990000], ['Gris Brooklyn', '#6d7377', 990000], ['Azul Portimao', '#1f4e9c', 990000], ['Gris Skyscraper', '#a9adb1', 990000], ['Rojo Fuego', '#8f1d1d', 1290000]],
  volvo: [['Blanco Cristal', '#efefec', 0], ['Negro Ónix', '#131416', 890000], ['Gris Trueno', '#7a7d7f', 890000], ['Azul Denim', '#4a5f7a', 890000], ['Verde Musgo', '#5b6650', 890000], ['Plata Brillante', '#c3c6c9', 890000]],
  byd: [['Blanco Ártico', '#f2f3f3', 0], ['Gris Atlántico', '#5f6870', 0], ['Negro Cosmos', '#15171a', 0], ['Azul Aurora', '#3a6ea5', 290000], ['Rosa Coral', '#e3897f', 290000], ['Verde Glaciar', '#7fb5a8', 290000]]
};

const T0 = ['6 airbags', 'Control de estabilidad (ESC)', 'Pantalla táctil 8"', 'Apple CarPlay / Android Auto', 'Aire acondicionado', 'Sensores de estacionamiento traseros'];
const T1 = ['Cámara de retroceso', 'Llantas de aleación', 'Control crucero', 'Climatizador automático', 'Encendido sin llave'];
const T2 = ['Tapiz de cuero', 'Techo solar', 'Cargador inalámbrico', 'ADAS: frenado autónomo y mantención de carril', 'Sonido premium', 'Faros full LED'];
export const tierFeatures = t => [...T0, ...(t >= 1 ? T1 : []), ...(t >= 2 ? T2 : [])];

// [nombre, precio lista, motor, hp, transmisión, consumo/autonomía, tracción]
export const MODELS = [
  // Toyota
  { id: 'yaris', brand: 'toyota', name: 'Yaris Hatchback', segment: 'citycar', body: 'hatch', fuel: 'bencina', seats: 5, trunk: 286, tagline: 'Ágil, eficiente y lista para la ciudad.', versions: [['XS 1.5 MT', 13990000, '1.5 bencina', 107, 'Manual 6V', '17,8 km/l'], ['XLS 1.5 CVT', 15690000, '1.5 bencina', 107, 'CVT', '18,2 km/l'], ['GR-S 1.5 CVT', 17290000, '1.5 bencina', 107, 'CVT', '17,6 km/l']] },
  { id: 'corolla', brand: 'toyota', name: 'Corolla Hybrid', segment: 'sedan', body: 'sedan', fuel: 'hibrido', seats: 5, trunk: 470, featured: true, tagline: 'El sedán más vendido del mundo, ahora híbrido.', versions: [['XEI HEV', 23990000, '1.8 híbrido', 138, 'e-CVT', '24,1 km/l'], ['SEG HEV', 26490000, '1.8 híbrido', 138, 'e-CVT', '23,8 km/l'], ['GR-Sport HEV', 27990000, '1.8 híbrido', 138, 'e-CVT', '23,1 km/l']] },
  { id: 'rav4', brand: 'toyota', name: 'RAV4 Hybrid', segment: 'suv', body: 'suv', fuel: 'hibrido', seats: 5, trunk: 580, featured: true, tagline: 'SUV híbrido con tracción integral inteligente.', versions: [['LE 2.5 HEV 4x2', 33990000, '2.5 híbrido', 215, 'e-CVT', '19,8 km/l', '4x2'], ['XLE 2.5 HEV AWD', 37490000, '2.5 híbrido', 219, 'e-CVT', '18,9 km/l', 'AWD-i'], ['Limited 2.5 HEV AWD', 40990000, '2.5 híbrido', 219, 'e-CVT', '18,7 km/l', 'AWD-i']] },
  { id: 'hilux', brand: 'toyota', name: 'Hilux', segment: 'pickup', body: 'pickup', fuel: 'diesel', seats: 5, trunk: 1100, tagline: 'Indestructible. Para la faena y el fin de semana.', versions: [['DX 2.4 4x2 MT', 25990000, '2.4 diésel', 148, 'Manual 6V', '12,4 km/l', '4x2'], ['SR 2.4 4x4 MT', 30990000, '2.4 diésel', 148, 'Manual 6V', '11,6 km/l', '4x4'], ['SRV 2.8 4x4 AT', 36490000, '2.8 diésel', 201, 'Automática 6V', '10,9 km/l', '4x4'], ['GR-Sport 2.8 4x4 AT', 41990000, '2.8 diésel', 221, 'Automática 6V', '10,5 km/l', '4x4']] },
  // Kia
  { id: 'morning', brand: 'kia', name: 'Morning', segment: 'citycar', body: 'hatch', fuel: 'bencina', seats: 5, trunk: 255, tagline: 'El citycar que se estaciona en cualquier parte.', versions: [['EX 1.0 MT', 9990000, '1.0 bencina', 66, 'Manual 5V', '21,3 km/l'], ['EX 1.2 AT', 11490000, '1.2 bencina', 83, 'Automática 4V', '17,9 km/l'], ['GT-Line 1.2 AT', 12690000, '1.2 bencina', 83, 'Automática 4V', '17,6 km/l']] },
  { id: 'sonet', brand: 'kia', name: 'Sonet', segment: 'suv', body: 'suv', fuel: 'bencina', seats: 5, trunk: 392, tagline: 'SUV compacto con equipamiento de segmento superior.', versions: [['LX 1.5 MT', 14990000, '1.5 bencina', 113, 'Manual 6V', '16,2 km/l'], ['EX 1.5 IVT', 16790000, '1.5 bencina', 113, 'IVT', '16,8 km/l'], ['GT-Line 1.5 IVT', 18490000, '1.5 bencina', 113, 'IVT', '16,5 km/l']] },
  { id: 'sportage', brand: 'kia', name: 'Sportage', segment: 'suv', body: 'suv', fuel: 'bencina', seats: 5, trunk: 587, featured: true, tagline: 'Diseño audaz, pantalla curva y tecnología de sobra.', versions: [['LX 2.0 AT', 24990000, '2.0 bencina', 154, 'Automática 6V', '12,1 km/l'], ['EX 1.6T DCT', 28490000, '1.6 turbo', 177, 'DCT 7V', '13,0 km/l'], ['GT-Line 1.6T HEV AWD', 34990000, '1.6 turbo híbrido', 230, 'Automática 6V', '17,2 km/l', 'AWD']] },
  { id: 'ev6', brand: 'kia', name: 'EV6', segment: 'electrico', body: 'suv', fuel: 'electrico', seats: 5, trunk: 490, tagline: '100% eléctrico, carga ultrarrápida 800V.', versions: [['Light RWD', 42990000, 'Eléctrico 77 kWh', 229, 'Directa', 'Autonomía 528 km', 'RWD'], ['GT-Line AWD', 49990000, 'Eléctrico 77 kWh', 325, 'Directa', 'Autonomía 484 km', 'AWD']] },
  // Hyundai
  { id: 'i10', brand: 'hyundai', name: 'Grand i10', segment: 'citycar', body: 'hatch', fuel: 'bencina', seats: 5, trunk: 260, tagline: 'Espacio inteligente en formato ciudad.', versions: [['GL 1.2 MT', 10490000, '1.2 bencina', 83, 'Manual 5V', '19,6 km/l'], ['GLS 1.2 AT', 11890000, '1.2 bencina', 83, 'Automática 4V', '17,1 km/l']] },
  { id: 'accent', brand: 'hyundai', name: 'Accent', segment: 'sedan', body: 'sedan', fuel: 'bencina', seats: 5, trunk: 528, tagline: 'Sedán amplio, seguro y eficiente.', versions: [['GL 1.5 MT', 14990000, '1.5 bencina', 115, 'Manual 6V', '17,0 km/l'], ['GLS 1.5 IVT', 16490000, '1.5 bencina', 115, 'IVT', '17,9 km/l'], ['Limited 1.5 IVT', 17990000, '1.5 bencina', 115, 'IVT', '17,5 km/l']] },
  { id: 'tucson', brand: 'hyundai', name: 'Tucson', segment: 'suv', body: 'suv', fuel: 'bencina', seats: 5, trunk: 620, featured: true, tagline: 'Faros paramétricos y espacio para todo.', versions: [['GL 2.0 AT', 26990000, '2.0 bencina', 156, 'Automática 6V', '11,8 km/l'], ['GLS 1.6T DCT', 30490000, '1.6 turbo', 180, 'DCT 7V', '12,6 km/l'], ['Limited 1.6T HEV AWD', 36990000, '1.6 turbo híbrido', 230, 'Automática 6V', '16,9 km/l', 'AWD']] },
  { id: 'ioniq5', brand: 'hyundai', name: 'Ioniq 5', segment: 'electrico', body: 'hatch', fuel: 'electrico', seats: 5, trunk: 527, featured: true, tagline: 'Diseño pixel, sala de estar sobre ruedas.', versions: [['Standard RWD 63 kWh', 42990000, 'Eléctrico 63 kWh', 170, 'Directa', 'Autonomía 440 km', 'RWD'], ['Long Range AWD 84 kWh', 51990000, 'Eléctrico 84 kWh', 325, 'Directa', 'Autonomía 520 km', 'AWD']] },
  // Chevrolet
  { id: 'onix', brand: 'chevrolet', name: 'Onix Sedán', segment: 'sedan', body: 'sedan', fuel: 'bencina', seats: 5, trunk: 469, tagline: 'Turbo, conectado y con WiFi a bordo.', versions: [['LT 1.0T MT', 12490000, '1.0 turbo', 116, 'Manual 6V', '19,2 km/l'], ['LTZ 1.0T AT', 14290000, '1.0 turbo', 116, 'Automática 6V', '17,4 km/l'], ['Premier 1.0T AT', 15490000, '1.0 turbo', 116, 'Automática 6V', '17,1 km/l']] },
  { id: 'tracker', brand: 'chevrolet', name: 'Tracker', segment: 'suv', body: 'suv', fuel: 'bencina', seats: 5, trunk: 393, tagline: 'SUV urbano turbo con 6 airbags de serie.', versions: [['LT 1.2T MT', 17990000, '1.2 turbo', 132, 'Manual 6V', '15,8 km/l'], ['LTZ 1.2T AT', 19990000, '1.2 turbo', 132, 'Automática 6V', '14,6 km/l'], ['Premier 1.2T AT', 21490000, '1.2 turbo', 132, 'Automática 6V', '14,4 km/l']] },
  { id: 'colorado', brand: 'chevrolet', name: 'Colorado', segment: 'pickup', body: 'pickup', fuel: 'diesel', seats: 5, trunk: 1150, tagline: 'Pickup mediana con alma de camioneta grande.', versions: [['LT 2.8 4x2 MT', 26990000, '2.8 diésel', 200, 'Manual 6V', '11,2 km/l', '4x2'], ['LTZ 2.8 4x4 AT', 33490000, '2.8 diésel', 200, 'Automática 6V', '10,4 km/l', '4x4'], ['Z71 2.8 4x4 AT', 37990000, '2.8 diésel', 200, 'Automática 6V', '10,1 km/l', '4x4']] },
  // Mazda
  { id: 'mazda2', brand: 'mazda', name: 'Mazda2 Sport', segment: 'citycar', body: 'hatch', fuel: 'bencina', seats: 5, trunk: 280, tagline: 'Diseño Kodo en formato compacto.', versions: [['V 1.5 MT', 13490000, '1.5 Skyactiv-G', 110, 'Manual 6V', '18,0 km/l'], ['GT 1.5 AT', 15790000, '1.5 Skyactiv-G', 110, 'Automática 6V', '17,2 km/l']] },
  { id: 'mazda3', brand: 'mazda', name: 'Mazda3 Sedán', segment: 'sedan', body: 'sedan', fuel: 'bencina', seats: 5, trunk: 444, tagline: 'Premium accesible, manejo de verdad.', versions: [['V 2.0 AT', 21990000, '2.0 Skyactiv-G', 155, 'Automática 6V', '15,4 km/l'], ['GT 2.5 AT', 25490000, '2.5 Skyactiv-G', 186, 'Automática 6V', '14,1 km/l']] },
  { id: 'cx5', brand: 'mazda', name: 'CX-5', segment: 'suv', body: 'suv', fuel: 'bencina', seats: 5, trunk: 506, tagline: 'El SUV que se maneja como un deportivo.', versions: [['R 2.0 2WD AT', 27990000, '2.0 Skyactiv-G', 155, 'Automática 6V', '13,6 km/l'], ['GT 2.5 AWD AT', 33990000, '2.5 Skyactiv-G', 194, 'Automática 6V', '12,2 km/l', 'AWD'], ['Signature 2.5T AWD', 38990000, '2.5 turbo', 231, 'Automática 6V', '11,0 km/l', 'AWD']] },
  // BMW
  { id: 'serie3', brand: 'bmw', name: 'Serie 3 Sedán', segment: 'premium', body: 'sedan', fuel: 'bencina', seats: 5, trunk: 480, featured: true, tagline: 'El placer de conducir, en su forma más pura.', versions: [['320i Sport', 49990000, '2.0 TwinPower Turbo', 184, 'Steptronic 8V', '15,6 km/l'], ['330e M Sport PHEV', 58990000, '2.0 híbrido enchufable', 292, 'Steptronic 8V', '58 km eléctricos'], ['M340i xDrive', 74990000, '3.0 TwinPower Turbo', 374, 'Steptronic 8V', '11,6 km/l', 'xDrive']] },
  { id: 'x3', brand: 'bmw', name: 'X3', segment: 'premium', body: 'suv', fuel: 'bencina', seats: 5, trunk: 570, tagline: 'SAV premium con xDrive inteligente.', versions: [['sDrive20i', 62990000, '2.0 TwinPower Turbo', 208, 'Steptronic 8V', '13,1 km/l'], ['xDrive30e PHEV', 72990000, '2.0 híbrido enchufable', 299, 'Steptronic 8V', '80 km eléctricos', 'xDrive']] },
  { id: 'ix1', brand: 'bmw', name: 'iX1', segment: 'electrico', body: 'suv', fuel: 'electrico', seats: 5, trunk: 490, tagline: 'Premium y 100% eléctrico.', versions: [['eDrive20', 54990000, 'Eléctrico 65 kWh', 204, 'Directa', 'Autonomía 475 km'], ['xDrive30 M Sport', 62990000, 'Eléctrico 65 kWh', 313, 'Directa', 'Autonomía 440 km', 'xDrive']] },
  // Volvo
  { id: 'xc40', brand: 'volvo', name: 'XC40', segment: 'premium', body: 'suv', fuel: 'hibrido', seats: 5, trunk: 452, tagline: 'Diseño escandinavo con mild hybrid.', versions: [['B3 Core', 39990000, '2.0 mild hybrid', 163, 'Automática 7V', '14,2 km/l'], ['B4 Plus Dark', 45990000, '2.0 mild hybrid', 197, 'Automática 7V', '13,6 km/l'], ['B5 Ultimate AWD', 51990000, '2.0 mild hybrid', 250, 'Automática 8V', '12,8 km/l', 'AWD']] },
  { id: 'ex30', brand: 'volvo', name: 'EX30', segment: 'electrico', body: 'suv', fuel: 'electrico', seats: 5, trunk: 318, featured: true, tagline: 'El Volvo más pequeño, la huella más baja.', versions: [['Single Motor', 32990000, 'Eléctrico 51 kWh', 272, 'Directa', 'Autonomía 344 km'], ['Single Motor Extended', 36990000, 'Eléctrico 69 kWh', 272, 'Directa', 'Autonomía 476 km'], ['Twin Motor Performance', 42990000, 'Eléctrico 69 kWh', 428, 'Directa', 'Autonomía 450 km', 'AWD']] },
  // BYD
  { id: 'dolphin', brand: 'byd', name: 'Dolphin', segment: 'electrico', body: 'hatch', fuel: 'electrico', seats: 5, trunk: 345, tagline: 'Eléctrico accesible con batería Blade.', versions: [['GS 45 kWh', 22990000, 'Eléctrico 45 kWh', 95, 'Directa', 'Autonomía 340 km'], ['Comfort 60 kWh', 26490000, 'Eléctrico 60 kWh', 204, 'Directa', 'Autonomía 427 km']] },
  { id: 'seal', brand: 'byd', name: 'Seal', segment: 'electrico', body: 'sedan', fuel: 'electrico', seats: 5, trunk: 400, tagline: 'Sedán eléctrico de 0 a 100 en 3,8 s.', versions: [['Design RWD', 38990000, 'Eléctrico 82,5 kWh', 313, 'Directa', 'Autonomía 570 km', 'RWD'], ['Excellence AWD', 44990000, 'Eléctrico 82,5 kWh', 530, 'Directa', 'Autonomía 520 km', 'AWD']] },
  { id: 'shark', brand: 'byd', name: 'Shark', segment: 'pickup', body: 'pickup', fuel: 'phev', seats: 5, trunk: 1200, tagline: 'La primera pickup híbrida enchufable.', versions: [['GS DM-O 4x4', 39990000, '1.5 turbo PHEV', 430, 'DHT', '100 km eléctricos', '4x4']] }
];

// Próximos lanzamientos (no configurables todavía)
export const LAUNCHES = [
  { id: 'ev3', brand: 'kia', name: 'EV3', segment: 'electrico', body: 'suv', fuel: 'electrico', seats: 5, trunk: 460, tagline: 'SUV eléctrico compacto con 600 km de autonomía.', from: 31990000, inDays: 38, color: '#3d6a5a' },
  { id: 'prado', brand: 'toyota', name: 'Land Cruiser Prado', segment: 'suv', body: 'suv', fuel: 'diesel', seats: 7, trunk: 620, tagline: 'Leyenda off-road totalmente renovada.', from: 64990000, inDays: 62, color: '#8a8070' },
  { id: 'sealion7', brand: 'byd', name: 'Sealion 7', segment: 'electrico', body: 'suv', fuel: 'electrico', seats: 5, trunk: 520, tagline: 'SUV coupé eléctrico de alto desempeño.', from: 45990000, inDays: 21, color: '#2f3d52' }
];

export const SHOWROOMS = [
  { id: 'scl', name: 'Autoplaza Santiago', city: 'Santiago', address: 'Av. Las Condes 11.250, Vitacura', phone: '+56 2 2940 5500', hours: 'Lun a Vie 9:00–19:30 · Sáb 10:00–14:00', brands: ['toyota', 'kia', 'hyundai', 'chevrolet', 'mazda', 'bmw', 'volvo', 'byd'], bays: 14, img: 'Showroom de 3 pisos, 60 autos exhibidos y taller de 14 bahías.' },
  { id: 'vina', name: 'Autoplaza Viña del Mar', city: 'Viña del Mar', address: 'Av. Libertad 1.150, Viña del Mar', phone: '+56 32 268 4400', hours: 'Lun a Vie 9:00–19:00 · Sáb 10:00–14:00', brands: ['toyota', 'kia', 'hyundai', 'chevrolet', 'mazda', 'byd'], bays: 8, img: 'Frente al estero, con zona de carga rápida para eléctricos.' },
  { id: 'ccp', name: 'Autoplaza Concepción', city: 'Concepción', address: 'Av. Paicaví 2.450, Concepción', phone: '+56 41 279 3300', hours: 'Lun a Vie 9:00–19:00 · Sáb 10:00–14:00', brands: ['toyota', 'kia', 'hyundai', 'chevrolet', 'volvo', 'byd'], bays: 10, img: 'Centro de pickups y flotas para empresas del sur.' }
];

// Pautas de mantención: precio base por marca (se escala por km)
export const PLAN_BASE = { toyota: 129000, kia: 119000, hyundai: 119000, chevrolet: 109000, mazda: 139000, bmw: 289000, volvo: 259000, byd: 89000 };
export const PLAN_ITEMS = {
  base: ['Cambio de aceite de motor', 'Cambio de filtro de aceite', 'Revisión de niveles (refrigerante, frenos, dirección)', 'Inspección de frenos', 'Rotación de neumáticos', 'Escaneo electrónico'],
  m20: ['Cambio de filtro de aire', 'Cambio de filtro de polen'],
  m40: ['Cambio de líquido de frenos', 'Revisión de suspensión y tren delantero'],
  m60: ['Cambio de bujías', 'Cambio de refrigerante', 'Revisión de correa de accesorios'],
  ev: ['Diagnóstico de batería de alto voltaje', 'Revisión de sistema de carga', 'Cambio de filtro de polen', 'Inspección de frenos', 'Rotación de neumáticos', 'Actualización de software']
};

export const PARTS = [
  ['Filtro de aceite', 'Filtros', 12990], ['Filtro de aire motor', 'Filtros', 18990], ['Filtro de polen con carbón activado', 'Filtros', 21990],
  ['Pastillas de freno delanteras', 'Frenos', 54990], ['Discos de freno delanteros (par)', 'Frenos', 129990], ['Líquido de frenos DOT4 1L', 'Frenos', 14990],
  ['Aceite sintético 0W-20 4L', 'Lubricantes', 46990], ['Aceite sintético 5W-30 5L', 'Lubricantes', 52990], ['Refrigerante larga vida 4L', 'Lubricantes', 24990],
  ['Batería 12V 60Ah', 'Eléctrico', 109990], ['Ampolleta LED H11 (par)', 'Eléctrico', 39990], ['Plumillas limpiaparabrisas (par)', 'Carrocería', 22990],
  ['Espejo lateral completo', 'Carrocería', 149990], ['Parachoques delantero (sin pintar)', 'Carrocería', 289990], ['Neumático 205/55 R16', 'Neumáticos', 89990],
  ['Neumático 225/65 R17', 'Neumáticos', 119990], ['Neumático AT 265/65 R17', 'Neumáticos', 169990], ['Bujías iridio (juego 4)', 'Motor', 69990],
  ['Correa de accesorios', 'Motor', 39990], ['Kit de embrague', 'Motor', 389990],
  ['Pisos de goma a medida', 'Accesorios', 49990], ['Barras de techo', 'Accesorios', 219990], ['Enganche de arrastre', 'Accesorios', 349990],
  ['Cubre pickup / lona marítima', 'Accesorios', 289990], ['Portabicicletas de techo', 'Accesorios', 159990], ['Cargador portátil EV modo 2', 'Accesorios', 389990],
  ['Wallbox 7 kW con instalación', 'Accesorios', 990000], ['Láminas de seguridad', 'Accesorios', 179990], ['Kit de emergencia', 'Accesorios', 29990], ['Cámara frontal / dashcam', 'Accesorios', 119990]
];

// Accesorios ofrecidos en el configurador. applies: segmentos o combustibles; vacío = todos.
export const ACCESSORIES = [
  { id: 'acc-pisos', name: 'Pisos de goma a medida', price: 49990, cat: 'Interior', applies: [] },
  { id: 'acc-laminas', name: 'Láminas de seguridad y control solar', price: 179990, cat: 'Protección', applies: [] },
  { id: 'acc-cerami', name: 'Tratamiento cerámico de pintura', price: 349990, cat: 'Protección', applies: [] },
  { id: 'acc-dashcam', name: 'Dashcam frontal y trasera', price: 119990, cat: 'Tecnología', applies: [] },
  { id: 'acc-barras', name: 'Barras de techo', price: 219990, cat: 'Exterior', applies: ['suv', 'electrico', 'premium'] },
  { id: 'acc-bici', name: 'Portabicicletas de techo', price: 159990, cat: 'Exterior', applies: ['suv', 'pickup'] },
  { id: 'acc-enganche', name: 'Enganche de arrastre', price: 349990, cat: 'Exterior', applies: ['suv', 'pickup'] },
  { id: 'acc-lona', name: 'Cubre pickup / lona marítima', price: 289990, cat: 'Exterior', applies: ['pickup'] },
  { id: 'acc-barra-antivuelco', name: 'Barra antivuelco cromada', price: 459990, cat: 'Exterior', applies: ['pickup'] },
  { id: 'acc-wallbox', name: 'Wallbox 7 kW con instalación', price: 990000, cat: 'Carga', applies: ['electrico', 'phev'] },
  { id: 'acc-cargador', name: 'Cargador portátil modo 2', price: 389990, cat: 'Carga', applies: ['electrico', 'phev'] },
  { id: 'acc-mantencion', name: 'Mantenciones prepagadas (3 primeras)', price: 390000, cat: 'Servicio', applies: [] },
  { id: 'acc-garantia', name: 'Extensión de garantía +2 años', price: 690000, cat: 'Servicio', applies: [] }
];

export const RECALLS = [
  { code: 'RC-2026-014', brand: 'kia', models: ['sportage'], yearFrom: 2024, yearTo: 2025, title: 'Revisión de conector del módulo de frenos ABS', remedy: 'Inspección y reemplazo preventivo del conector. Duración 1,5 horas. Sin costo.', risk: 'Alto' },
  { code: 'RC-2026-009', brand: 'toyota', models: ['hilux'], yearFrom: 2023, yearTo: 2025, title: 'Actualización de software de airbag del acompañante', remedy: 'Reprogramación del módulo SRS. Duración 45 minutos. Sin costo.', risk: 'Alto' },
  { code: 'RC-2025-031', brand: 'hyundai', models: ['tucson'], yearFrom: 2022, yearTo: 2024, title: 'Reemplazo de fusible de la bomba de aceite (ICCU)', remedy: 'Instalación de fusible mejorado y actualización de software. Duración 2 horas.', risk: 'Medio' },
  { code: 'RC-2026-002', brand: 'chevrolet', models: ['onix', 'tracker'], yearFrom: 2023, yearTo: 2025, title: 'Cinturón de seguridad trasero central', remedy: 'Reemplazo del anclaje del cinturón trasero central. Duración 1 hora.', risk: 'Medio' },
  { code: 'RC-2025-018', brand: 'volvo', models: ['xc40'], yearFrom: 2023, yearTo: 2024, title: 'Actualización de cámara de retroceso', remedy: 'Actualización OTA o en taller del módulo de infotainment. 30 minutos.', risk: 'Bajo' }
];
