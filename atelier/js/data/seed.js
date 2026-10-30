// Datos semilla de Atelier Torque (taller premium ficticio en Vitacura). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';
import { ymd, addDays, genRut, genPlate, fullName, emailOf, phone, round, DAY } from '../shared/util.js';
import { inspectionTemplate, REC_LIBRARY, COMUNAS, WINDOWS, PAINT, COLORS, DOC_TYPES } from './catalog.js';

const ICE_LV = (n1, n2, n3) => [
  { code: 'menor', name: n1, every: 1, hours: 2.5, base: 420000, tasks: ['Cambio de aceite sintético y filtro', 'Inspección multipunto digital', 'Revisión de frenos y neumáticos', 'Reset de intervalos de servicio'] },
  { code: 'mayor', name: n2, every: 2, hours: 4, base: 780000, tasks: ['Todo lo del servicio menor', 'Filtro de aire y filtro de cabina', 'Cambio de líquido de frenos', 'Actualización de software de fábrica'] },
  { code: 'integral', name: n3, every: 4, hours: 7, base: 1450000, tasks: ['Todo lo del servicio mayor', 'Bujías de encendido', 'Aceite de transmisión / diferencial', 'Correa de accesorios y poleas'] }
];
const EV_TASKS = { menor: ['Inspección de alta tensión y aislamiento', 'Filtro de cabina', 'Rotación de neumáticos', 'Actualización de software'], mayor: ['Todo lo de la inspección anual', 'Cambio de líquido de frenos', 'Diagnóstico SOH de batería con informe', 'Lubricación de frenos (desuso por regeneración)'], integral: ['Todo lo del servicio mayor', 'Refrigerante del sistema térmico de batería', 'Aceite de reductora', 'Calibración de sensores ADAS'] };
const PROGRAMS = [
  { id: 'pg-porsche', brand: 'Porsche', name: 'Programa Porsche', intervalKm: 15000, intervalMonths: 12, order: 1, active: true,
    note: 'Según el plan del fabricante: servicio menor cada 15.000 km o 1 año, mayor cada 30.000 km y servicio integral (bujías, aceite PDK) cada 60.000 km. Usamos repuestos originales y no afecta tu garantía.',
    models: [{ name: '911 Carrera S', body: 'coupe', fuel: 'bencina', factor: 1.55, hp: 450 }, { name: 'Cayenne E-Hybrid', body: 'suv', fuel: 'hibrido', factor: 1.35, hp: 470 }, { name: 'Macan S', body: 'suv', fuel: 'bencina', factor: 1.15, hp: 380 }, { name: 'Taycan 4S', body: 'sedan', fuel: 'electrico', factor: 1.05, hp: 530 }, { name: 'Panamera 4', body: 'sedan', fuel: 'bencina', factor: 1.45, hp: 353 }],
    levels: ICE_LV('Servicio menor', 'Servicio mayor', 'Servicio integral') },
  { id: 'pg-bmw', brand: 'BMW', name: 'Programa BMW M', intervalKm: 15000, intervalMonths: 12, order: 2, active: true,
    note: 'Intervalos según Condition Based Service (CBS): aceite cada 15.000 km, microfiltro y frenos cada 30.000 km, bujías y diferencial M cada 60.000 km.',
    models: [{ name: 'M3 Competition', body: 'sedan', fuel: 'bencina', factor: 1.2, hp: 510 }, { name: 'M4 Competition', body: 'coupe', fuel: 'bencina', factor: 1.25, hp: 510 }, { name: 'X5 M Competition', body: 'suv', fuel: 'bencina', factor: 1.4, hp: 625 }, { name: 'i4 M50', body: 'sedan', fuel: 'electrico', factor: .95, hp: 544 }, { name: 'iX M60', body: 'suv', fuel: 'electrico', factor: 1.15, hp: 619 }],
    levels: ICE_LV('Servicio de aceite', 'Servicio CBS mayor', 'Servicio M integral') },
  { id: 'pg-amg', brand: 'Mercedes-AMG', name: 'Programa Mercedes-AMG', intervalKm: 15000, intervalMonths: 12, order: 3, active: true,
    note: 'Servicio A y Servicio B alternados cada 15.000 km o 1 año, con servicio ampliado (bujías, transmisión MCT) cada 60.000 km.',
    models: [{ name: 'C 63 S E Performance', body: 'sedan', fuel: 'hibrido', factor: 1.35, hp: 680 }, { name: 'GLE 53 Coupé', body: 'suv', fuel: 'bencina', factor: 1.3, hp: 435 }, { name: 'AMG GT 63', body: 'coupe', fuel: 'bencina', factor: 1.6, hp: 585 }, { name: 'G 63', body: 'suv', fuel: 'bencina', factor: 1.7, hp: 585 }, { name: 'EQS 580', body: 'sedan', fuel: 'electrico', factor: 1.2, hp: 524 }],
    levels: ICE_LV('Servicio A', 'Servicio B', 'Servicio B ampliado') },
  { id: 'pg-audi', brand: 'Audi', name: 'Programa Audi RS', intervalKm: 15000, intervalMonths: 12, order: 4, active: true,
    note: 'Inspección con cambio de aceite cada 15.000 km; inspección ampliada con filtros cada 30.000 km y servicio de transmisión S tronic cada 60.000 km.',
    models: [{ name: 'RS 3 Sportback', body: 'hatch', fuel: 'bencina', factor: 1.0, hp: 400 }, { name: 'RS 6 Avant', body: 'wagon', fuel: 'bencina', factor: 1.45, hp: 630 }, { name: 'RS Q8', body: 'suv', fuel: 'bencina', factor: 1.5, hp: 600 }, { name: 'RS e-tron GT', body: 'sedan', fuel: 'electrico', factor: 1.15, hp: 646 }],
    levels: ICE_LV('Inspección con aceite', 'Inspección ampliada', 'Servicio S tronic') },
  { id: 'pg-tesla', brand: 'Tesla', name: 'Programa Tesla', intervalKm: 20000, intervalMonths: 24, order: 5, active: true,
    note: 'Los eléctricos casi no requieren mantención, pero el fabricante recomienda revisar frenos, filtro de cabina y refrigerante. Incluye informe de salud de batería (SOH).',
    models: [{ name: 'Model 3', body: 'sedan', fuel: 'electrico', factor: .6, hp: 498 }, { name: 'Model Y', body: 'suv', fuel: 'electrico', factor: .65, hp: 514 }, { name: 'Model S Plaid', body: 'sedan', fuel: 'electrico', factor: .9, hp: 1020 }, { name: 'Model X', body: 'suv', fuel: 'electrico', factor: .95, hp: 670 }],
    levels: ICE_LV('Inspección anual', 'Servicio de frenos y filtros', 'Servicio integral EV') },
  { id: 'pg-volvo', brand: 'Volvo', name: 'Programa Volvo Recharge', intervalKm: 15000, intervalMonths: 12, order: 6, active: true,
    note: 'Para Volvo eléctricos e híbridos enchufables: servicio anual con revisión del sistema de alta tensión, filtros y software.',
    models: [{ name: 'EX30', body: 'hatch', fuel: 'electrico', factor: .6, hp: 428 }, { name: 'XC40 Recharge', body: 'suv', fuel: 'electrico', factor: .7, hp: 408 }, { name: 'XC60 T8 Recharge', body: 'suv', fuel: 'hibrido', factor: .85, hp: 455 }, { name: 'XC90 T8 Recharge', body: 'suv', fuel: 'hibrido', factor: 1.0, hp: 455 }, { name: 'EX90', body: 'suv', fuel: 'electrico', factor: 1.05, hp: 517 }],
    levels: ICE_LV('Servicio anual', 'Servicio mayor', 'Servicio integral') }
];
PROGRAMS.forEach(p => p.levels.forEach(l => { l.tasksEv = EV_TASKS[l.code]; }));

const SERVICES = [
  { id: 'sv-stage1', line: 'performance', name: 'Stage 1 · software + dyno', desc: 'Reprogramación de ECU con mapa a medida, medición antes/después en nuestro dinamómetro de rodillos y registro de datos en pista.', price: 1290000, hours: 6, icon: '📈', featured: true, includes: ['Medición dyno antes y después', 'Mapa a medida para tu combustible', 'Datalog en carretera', 'Archivo original respaldado'] },
  { id: 'sv-stage2', line: 'performance', name: 'Stage 2 · intercooler + escape + mapa', desc: 'Intercooler de alto flujo, downpipe deportivo y mapa Stage 2. Para quien quiere más sin perder confiabilidad.', price: 4900000, hours: 22, icon: '🔥', includes: ['Intercooler de alto flujo', 'Downpipe con catalizador', 'Mapa Stage 2', '3 sesiones dyno'] },
  { id: 'sv-dyno', line: 'performance', name: 'Sesión de dinamómetro', desc: 'Medición de potencia y torque en rueda con informe y curva comparativa. Ideal para validar el estado del motor.', price: 180000, hours: 1.5, icon: '⏱️', includes: ['3 pasadas con promedio', 'Curva de potencia y torque', 'Informe PDF'] },
  { id: 'sv-escape', line: 'performance', name: 'Escape deportivo valvulado', desc: 'Sistema cat-back en titanio con válvulas controladas desde el habitáculo.', price: 3200000, hours: 8, icon: '🎺', includes: ['Instalación y ajuste', 'Control de válvulas', 'Medición de ruido homologable'] },
  { id: 'sv-coilover', line: 'performance', name: 'Suspensión coilover regulable', desc: 'Coilovers de 3 vías con setup de alturas, alineación de pista y corner balance.', price: 2800000, hours: 10, icon: '🛞', includes: ['Instalación', 'Corner balance', 'Alineación de pista'] },
  { id: 'sv-ceramico', line: 'estetica', name: 'Recubrimiento cerámico 9H', desc: 'Descontaminación, corrección de pintura en una etapa y cerámico de 5 años en carrocería, llantas y vidrios.', price: 890000, hours: 14, icon: '💎', featured: true, includes: ['Corrección 1 etapa', 'Cerámico 5 años', 'Llantas y vidrios', 'Mantención a los 6 meses'] },
  { id: 'sv-ppf-front', line: 'estetica', name: 'PPF frontal (paquete pista)', desc: 'Film de poliuretano autorregenerable en capó, parachoques, focos, tapabarros y espejos.', price: 1450000, hours: 12, icon: '🛡️', includes: ['Film 10 años', 'Corte por plotter', 'Bordes envueltos'] },
  { id: 'sv-ppf-full', line: 'estetica', name: 'PPF integral', desc: 'Protección total de la carrocería con PPF brillante o satinado. Cambia el acabado sin tocar la pintura.', price: 5900000, hours: 40, icon: '🛡️', includes: ['Carrocería completa', 'Acabado brillante o satinado', 'Garantía 10 años'] },
  { id: 'sv-detail', line: 'estetica', name: 'Detailing interior premium', desc: 'Limpieza profunda de cueros, alcántara y alfombras con sanitización por ozono.', price: 220000, hours: 5, icon: '🧽', includes: ['Hidratación de cueros', 'Alcántara', 'Ozono'] },
  { id: 'sv-correccion', line: 'estetica', name: 'Corrección de pintura 2 etapas', desc: 'Eliminamos swirls y rayas superficiales con corte y abrillantado.', price: 480000, hours: 10, icon: '🪞', includes: ['Medición de espesor', 'Corte y abrillantado', 'Sellante'] },
  { id: 'sv-soh', line: 'ev', name: 'Diagnóstico de batería (SOH)', desc: 'Informe de estado de salud de la batería de alta tensión, balance de celdas, temperatura y autonomía real.', price: 120000, hours: 1.5, icon: '🔋', featured: true, includes: ['SOH % certificado', 'Balance de celdas', 'Historial de carga', 'Informe para venta'] },
  { id: 'sv-wallbox7', line: 'ev', name: 'Cargador domiciliario 7,4 kW', desc: 'Wallbox monofásico instalado en tu casa con visita técnica, empalme y declaración SEC (TE6).', price: 1190000, hours: 6, icon: '🏠', featured: true, includes: ['Visita técnica', 'Wallbox 7,4 kW', 'Protecciones', 'Declaración TE6 ante SEC'] },
  { id: 'sv-wallbox11', line: 'ev', name: 'Cargador trifásico 11 kW', desc: 'Para casas con empalme trifásico: carga completa en una noche y gestión dinámica de potencia.', price: 1590000, hours: 8, icon: '⚡', includes: ['Wallbox 11 kW', 'Gestión dinámica', 'App y RFID', 'Declaración TE6'] },
  { id: 'sv-termico', line: 'ev', name: 'Servicio sistema térmico de batería', desc: 'Cambio de refrigerante de batería y prueba de bomba y válvulas del circuito térmico.', price: 260000, hours: 3, icon: '❄️', includes: ['Refrigerante OEM', 'Prueba de estanqueidad', 'Purgado al vacío'] },
  { id: 'sv-adas', line: 'ev', name: 'Calibración ADAS', desc: 'Calibración de cámaras y radares tras cambio de parabrisas o alineación.', price: 180000, hours: 2, icon: '🎯', includes: ['Cámara frontal', 'Radar', 'Informe'] },
  { id: 'sv-scan', line: 'diagnostico', name: 'Diagnóstico electrónico completo', desc: 'Escáner de fábrica, lectura de módulos, prueba en ruta y presupuesto detallado.', price: 90000, hours: 1.5, icon: '🩺', includes: ['Escáner de fábrica', 'Prueba en ruta', 'Presupuesto'] },
  { id: 'sv-align', line: 'diagnostico', name: 'Alineación 3D y balanceo', desc: 'Alineación con especificaciones de fábrica o setup deportivo.', price: 85000, hours: 1.5, icon: '📐', includes: ['Alineación 3D', 'Balanceo', 'Informe antes/después'] },
  { id: 'sv-frenos', line: 'diagnostico', name: 'Frenos: discos y pastillas', desc: 'Cambio de discos y pastillas OEM o cerámicos con purga de líquido.', price: 1200000, priceFrom: true, hours: 4, icon: '🛑', includes: ['Discos y pastillas', 'Purga de líquido', 'Asentamiento'] },
  { id: 'sv-precompra', line: 'diagnostico', name: 'Inspección precompra premium', desc: 'Antes de comprar un usado de alta gama: 160 puntos, escáner, medición de pintura y prueba en ruta.', price: 150000, hours: 2.5, icon: '🔎', includes: ['160 puntos', 'Espesor de pintura', 'Escáner', 'Informe'] }
].map((s, i) => ({ active: true, featured: false, priceFrom: false, order: i, ...s }));

const TIERS = [
  { id: 'silver', name: 'Silver', price: 290000, discount: 5, conciergeFree: 2, order: 1, tone: 'info', active: true, perks: ['5% en mano de obra', '2 retiros concierge al año', 'Lavado de cortesía en cada visita', 'Libro de mantenciones digital'] },
  { id: 'gold', name: 'Gold', price: 490000, discount: 10, conciergeFree: 99, order: 2, tone: 'warning', active: true, perks: ['10% en mano de obra y repuestos', 'Concierge ilimitado (radio 25 km)', 'Auto de cortesía eléctrico', 'Prioridad de agenda en 48 h', 'Detailing interior anual'] },
  { id: 'black', name: 'Black', price: 1290000, discount: 15, conciergeFree: 99, order: 3, tone: 'primary', active: true, perks: ['15% en todo el atelier', 'Concierge ilimitado y plataforma cama baja', 'Auto de cortesía premium garantizado', 'Asesor dedicado y WhatsApp directo', 'Sesión dyno y cerámico anual incluidos', 'Guarda de neumáticos de temporada'] }
];

const STREETS = ['Av. Vitacura', 'Los Militares', 'Camino La Dehesa', 'Av. Kennedy', 'Alonso de Córdova', 'Av. Apoquindo', 'Isidora Goyenechea', 'Av. Las Condes', 'Av. Los Leones', 'Av. Larraín', 'Camino Real', 'Av. Santa María', 'Padre Hurtado Norte', 'Av. Irarrázaval', 'Av. Chicureo'];
const COMS = Object.keys(COMUNAS);
const COMW = ['Vitacura', 'Vitacura', 'Las Condes', 'Las Condes', 'Las Condes', 'Lo Barnechea', 'Lo Barnechea', 'Providencia', 'Ñuñoa', 'La Reina', 'Colina (Chicureo)', 'Santiago', 'Huechuraba', 'Peñalolén'];

const PARTS = [
  ['PO-99610722553', 'Filtro de aceite', 'Porsche', '911 / Cayenne / Macan', 18, 6, 21000, 38000, 'A1'], ['PO-9A110715300', 'Filtro de aire (par)', 'Porsche', '911 992', 6, 4, 64000, 112000, 'A1'],
  ['PO-9J1698151', 'Pastillas delanteras PCCB', 'Porsche', 'Taycan / 911', 2, 2, 690000, 1180000, 'B3'], ['PO-0W30-1L', 'Aceite Mobil 1 0W-40 (L)', 'Porsche', 'Motores bóxer', 64, 30, 9800, 18500, 'L1'],
  ['BM-11428575211', 'Filtro de aceite', 'BMW', 'S58 (M3/M4)', 14, 6, 17000, 32000, 'A2'], ['BM-34112284369', 'Pastillas delanteras M', 'BMW', 'M3 / M4 G8x', 4, 3, 290000, 520000, 'B1'],
  ['BM-12120039664', 'Bujía de encendido', 'BMW', 'S58', 24, 12, 18000, 34000, 'A2'], ['BM-64119382886', 'Microfiltro de cabina', 'BMW', 'G8x / iX', 9, 5, 39000, 72000, 'A2'],
  ['MB-A2761800009', 'Filtro de aceite', 'Mercedes-AMG', 'M177 / M139', 12, 6, 16000, 30000, 'A3'], ['MB-A0004209006', 'Pastillas traseras AMG', 'Mercedes-AMG', 'C 63 / GT', 3, 2, 240000, 430000, 'B2'],
  ['MB-0W40-1L', 'Aceite AMG 0W-40 (L)', 'Mercedes-AMG', 'V8 biturbo', 40, 24, 10500, 19500, 'L1'], ['AU-06L115562B', 'Filtro de aceite', 'Audi', 'RS 3 / RS 6', 10, 5, 15000, 28000, 'A3'],
  ['AU-4K0698151', 'Pastillas delanteras', 'Audi', 'RS 6 / RS Q8', 2, 2, 310000, 560000, 'B2'], ['AU-8W0819439', 'Filtro de cabina', 'Audi', 'RS 3 / e-tron GT', 7, 4, 28000, 52000, 'A3'],
  ['TS-1107681', 'Filtro HEPA de cabina', 'Tesla', 'Model Y / X', 11, 6, 38000, 69000, 'A4'], ['TS-1188343', 'Pastillas delanteras', 'Tesla', 'Model 3 / Y', 8, 4, 98000, 175000, 'B4'],
  ['TS-1129990', 'Refrigerante G-48 (5 L)', 'Tesla', 'Toda la gama', 6, 4, 42000, 79000, 'L2'], ['VO-32221188', 'Filtro de cabina', 'Volvo', 'XC40 / EX30', 9, 5, 26000, 49000, 'A4'],
  ['VO-31492265', 'Pastillas delanteras', 'Volvo', 'XC60 / XC90', 5, 3, 120000, 215000, 'B4'], ['VO-32211231', 'Batería 12 V AGM', 'Volvo', 'Recharge', 3, 2, 160000, 290000, 'C1'],
  ['GN-DOT4-1L', 'Líquido de frenos DOT 4 LV (L)', 'Genérico OEM', 'Universal', 22, 10, 9000, 19000, 'L2'], ['GN-PPF-152', 'Rollo PPF autorregenerable 1,52 m', 'Estética', 'Universal', 3, 2, 690000, 0, 'E1'],
  ['GN-CER-9H', 'Kit cerámico 9H profesional', 'Estética', 'Universal', 7, 4, 85000, 0, 'E1'], ['GN-WB7', 'Wallbox 7,4 kW', 'EV', 'Universal tipo 2', 5, 3, 520000, 790000, 'C2'],
  ['GN-WB11', 'Wallbox 11 kW trifásico', 'EV', 'Universal tipo 2', 2, 2, 680000, 990000, 'C2'], ['GN-T2CABLE', 'Cable tipo 2 de 7 m', 'EV', 'Universal', 6, 3, 110000, 189000, 'C2'],
  ['PI-PZERO-245', 'Neumático P Zero 245/35 R20', 'Neumáticos', '911 / M4 / RS 3', 6, 4, 290000, 420000, 'N1'], ['MI-PS4S-275', 'Neumático Pilot Sport 4S 275/35 R21', 'Neumáticos', 'Taycan / RS e-tron GT', 4, 4, 340000, 495000, 'N1']
];

export function seed() {
  const r = rng(924);
  const NOW = Date.now();
  const at = (daysAgo, h = r.int(8, 17)) => { const d = new Date(NOW - daysAgo * DAY); d.setHours(h, r.int(0, 59), 0, 0); return d.toISOString(); };

  // ---------- Equipo ----------
  const users = [
    { id: 'u-admin', name: 'Camila Bascuñán', email: 'admin@ateliertorque.cl', role: 'admin', color: '#c08a2d' },
    { id: 'u-gerente', name: 'Andrés Undurraga', email: 'gerente@ateliertorque.cl', role: 'gerente', color: '#2f6f73' },
    { id: 'u-asesor', name: 'Fernanda Tapia', email: 'asesor@ateliertorque.cl', role: 'asesor', color: '#7a4f9a' },
    { id: 'u-asesor2', name: 'Gonzalo Cruz', email: 'gonzalo@ateliertorque.cl', role: 'asesor', color: '#3d6bb3', demo: false },
    { id: 'u-tec1', name: 'Diego Morales', email: 'tecnico@ateliertorque.cl', role: 'tecnico', color: '#a8432f', specialty: 'Porsche y alto desempeño', level: 'Master', certs: [['Porsche Technician Level 3', 'Fabricante', 18], ['Alta tensión nivel 2', 'SEC / OEM', 9]] },
    { id: 'u-tec2', name: 'Paula Reyes', email: 'paula@ateliertorque.cl', role: 'tecnico', color: '#0f766e', demo: false, specialty: 'Eléctricos y alta tensión', level: 'Master', certs: [['Alta tensión nivel 3 (HV Expert)', 'OEM', 14], ['Tesla Certified Body & EV', 'Fabricante', 3], ['Instalador eléctrico clase B', 'SEC', 30]] },
    { id: 'u-tec3', name: 'Sebastián Araya', email: 'sebastian@ateliertorque.cl', role: 'tecnico', color: '#3d6bb3', demo: false, specialty: 'BMW M y Mercedes-AMG', level: 'Senior', certs: [['BMW M Master Technician', 'Fabricante', 11], ['AMG Performance Specialist', 'Fabricante', -1]] },
    { id: 'u-tec4', name: 'Ignacio Fuentes', email: 'ignacio@ateliertorque.cl', role: 'tecnico', color: '#5b8c51', demo: false, specialty: 'Diagnóstico electrónico y Audi', level: 'Senior', certs: [['Diagnóstico CAN/LIN avanzado', 'Bosch', 20], ['Audi Service Technician', 'Fabricante', 6]] },
    { id: 'u-tec5', name: 'Constanza Silva', email: 'constanza@ateliertorque.cl', role: 'tecnico', color: '#c06c84', demo: false, specialty: 'PPF, cerámico y detailing', level: 'Senior', certs: [['Instaladora PPF certificada', 'Proveedor film', 16], ['Cerámico profesional', 'Proveedor', 1]] },
    { id: 'u-tec6', name: 'Tomás Castillo', email: 'tomas@ateliertorque.cl', role: 'tecnico', color: '#8a6247', demo: false, specialty: 'Performance, calibración y dyno', level: 'Técnico', certs: [['Calibración ECU', 'Software tuning', 12], ['Operación de dinamómetro', 'Fabricante dyno', 22]] },
    { id: 'u-ch1', name: 'Joaquín Soto', email: 'chofer@ateliertorque.cl', role: 'chofer', color: '#4a5568', license: 'A2 · B', shift: 'Mañana' },
    { id: 'u-ch2', name: 'Felipe Rojas', email: 'felipe@ateliertorque.cl', role: 'chofer', color: '#2f6f73', demo: false, license: 'A3 · B', shift: 'Completo' },
    { id: 'u-ch3', name: 'Antonia Díaz', email: 'antonia@ateliertorque.cl', role: 'chofer', color: '#c08a2d', demo: false, license: 'B', shift: 'Tarde' },
    { id: 'u-cli1', name: 'Martina Larraín', email: 'martina@correo.cl', role: 'cliente', color: '#7a4f9a', customerId: 'c-martina' },
    { id: 'u-cli2', name: 'Rodrigo Echeverría', email: 'rodrigo@correo.cl', role: 'cliente', color: '#3d6bb3', customerId: 'c-rodrigo' }
  ].map(u => ({ password: 'demo123', active: true, demo: true, phone: phone(r), ...u, certs: u.certs ? u.certs.map(([name, issuer, m]) => ({ name, issuer, exp: ymd(addDays(new Date(), m * 30)) })) : undefined, createdAt: at(400) }));
  const techs = users.filter(u => u.role === 'tecnico'), drivers = users.filter(u => u.role === 'chofer');

  // ---------- Clientes y vehículos ----------
  const allModels = PROGRAMS.flatMap(p => p.models.map(m => ({ ...m, brand: p.brand })));
  const customers = [], vehicles = [];
  const addr = () => `${r.pick(STREETS)} ${r.int(100, 9900)}${r.bool(.4) ? ', depto ' + r.int(21, 1802) : ''}`;
  const mkVehicle = (customerId, m, extra = {}) => {
    const [colorName, color] = r.pick(PAINT);
    const year = r.int(2018, 2026);
    const km = Math.max(1200, Math.round((2026 - year) * r.int(7000, 16000) + r.int(0, 5000)));
    const v = { id: 'v' + (vehicles.length + 1), customerId, brand: m.brand, model: m.name, year, plate: genPlate(r), vin: 'WP0' + Array.from({ length: 14 }, () => r.pick('ABCDEFGHJKLMNPRSTUVWXYZ0123456789')).join(''), color, colorName, km, fuel: m.fuel, body: m.body, hp: m.hp, addedAt: at(r.int(200, 700)), ...extra };
    v.docs = DOC_TYPES.slice(0, 4).map((type, i) => ({ type, exp: ymd(addDays(new Date(), i === 0 ? r.int(-20, 160) : r.int(-30, 330))), file: `${type.toLowerCase().replace(/[^a-z]+/g, '-')}-${v.plate}.pdf` }));
    vehicles.push(v); return v;
  };
  const tiers = ['black', 'gold', 'gold', 'silver', 'silver', 'silver', null, null, null, null, null];
  customers.push({ id: 'c-martina', name: 'Martina Larraín Vial', rut: genRut(r), email: 'martina@correo.cl', phone: '+56 9 8812 4410', address: 'Camino La Dehesa 1450', comuna: 'Lo Barnechea', tier: 'black', tierSince: ymd(addDays(new Date(), -420)), since: at(900), notes: 'Prefiere contacto por WhatsApp. Guarda neumáticos de invierno en el atelier.' });
  customers.push({ id: 'c-rodrigo', name: 'Rodrigo Echeverría Ossa', rut: genRut(r), email: 'rodrigo@correo.cl', phone: '+56 9 7720 1934', address: 'Isidora Goyenechea 3120, of. 801', comuna: 'Las Condes', tier: 'gold', tierSince: ymd(addDays(new Date(), -190)), since: at(500), notes: 'Retiros en la oficina, ventana de la mañana.' });
  const mm = (b, n) => ({ ...allModels.find(x => x.brand === b && x.name === n) });
  mkVehicle('c-martina', mm('Porsche', '911 Carrera S'), { year: 2022, km: 38400, color: '#8a8f93', colorName: 'Gris Nardo' });
  mkVehicle('c-martina', mm('Porsche', 'Taycan 4S'), { year: 2023, km: 29800, color: '#1f3d7a', colorName: 'Azul Gentian' });
  mkVehicle('c-rodrigo', mm('Tesla', 'Model Y'), { year: 2024, km: 21500, color: '#e9e9e4', colorName: 'Blanco Carrara' });
  mkVehicle('c-rodrigo', mm('BMW', 'M3 Competition'), { year: 2021, km: 44100, color: '#3f6b3a', colorName: 'Verde Python' });
  for (let i = 0; i < 40; i++) {
    const name = fullName(r);
    const c = { id: 'c' + (i + 1), name, rut: genRut(r), email: emailOf(name, r.pick(['gmail.com', 'outlook.com', 'empresa.cl', 'icloud.com'])), phone: phone(r), address: addr(), comuna: r.pick(COMW), tier: r.pick(tiers), since: at(r.int(60, 900)), notes: '' };
    if (c.tier) c.tierSince = ymd(addDays(new Date(), -r.int(20, 600)));
    customers.push(c);
    const nv = r.bool(.35) ? 2 : 1;
    for (let k = 0; k < nv; k++) mkVehicle(c.id, r.pick(allModels));
  }

  // ---------- Órdenes de trabajo ----------
  const programOf = v => PROGRAMS.find(p => p.brand === v.brand);
  const levelAt = (p, km) => { const n = Math.max(1, Math.round(km / p.intervalKm)); return { n, km: n * p.intervalKm, level: [...p.levels].sort((a, b) => b.every - a.every).find(l => n % l.every === 0) }; };
  const techFor = (line, v) => line === 'estetica' ? 'u-tec5' : line === 'performance' ? r.pick(['u-tec6', 'u-tec1', 'u-tec3']) : line === 'ev' || v.fuel === 'electrico' ? 'u-tec2'
    : line === 'diagnostico' ? r.pick(['u-tec4', 'u-tec1', 'u-tec3']) : ({ Porsche: 'u-tec1', 'BMW': 'u-tec3', 'Mercedes-AMG': 'u-tec3', 'Audi': 'u-tec4', Tesla: 'u-tec2', Volvo: 'u-tec2' }[v.brand]);
  const pickLine = v => { const x = r(); return v.fuel === 'electrico' ? (x < .38 ? 'ev' : x < .7 ? 'mantencion' : x < .9 ? 'estetica' : 'diagnostico') : (x < .44 ? 'mantencion' : x < .58 ? 'performance' : x < .8 ? 'estetica' : x < .93 ? 'diagnostico' : v.fuel === 'hibrido' ? 'ev' : 'mantencion'); };
  const workOrders = [], concierge = [], inspections = [], dyno = [];
  let seq = 24001;
  const NPS = [10, 10, 10, 10, 9, 9, 9, 9, 8, 8, 7, 10, 6, 9, 10, 5];
  const NPS_TXT = ['Impecable, el concierge es otro nivel.', 'Me mandaron fotos y video de todo. Muy transparente.', 'El auto volvió lavado y con el informe en el celular.', 'Excelente, aunque la entrega se atrasó una hora.', 'Atención de primera, volveré.', 'Muy buen trabajo con el PPF.', 'El dyno antes/después vale la pena.'];

  function makeWO(v, created, { line, status, svcIds, delivered, km } = {}) {
    line = line || pickLine(v);
    const cust = customers.find(c => c.id === v.customerId);
    const items = []; let hours = 0, title = '', serviceIds = [];
    if (line === 'mantencion') {
      const p = programOf(v), m = p.models.find(x => x.name === v.model) || { factor: 1 };
      const { km: skm, level } = levelAt(p, km || v.km);
      const price = round(level.base * m.factor * (v.fuel === 'electrico' ? .7 : 1));
      title = `${level.name} ${skm.toLocaleString('es-CL')} km`; hours = level.hours;
      items.push({ desc: `${title} · mano de obra`, kind: 'mo', qty: 1, price: round(price * .45) }, { desc: 'Repuestos y lubricantes originales', kind: 'rep', qty: 1, price: round(price * .55) });
    } else {
      const pool = SERVICES.filter(s => s.line === line && (line !== 'ev' || v.fuel !== 'bencina'));
      const picks = svcIds ? SERVICES.filter(s => svcIds.includes(s.id)) : [r.pick(pool.length ? pool : SERVICES.filter(s => s.line === 'diagnostico'))];
      if (!svcIds && r.bool(.25)) { const extra = r.pick(pool); if (extra && !picks.includes(extra)) picks.push(extra); }
      picks.forEach(s => { items.push({ desc: s.name, kind: 'mo', qty: 1, price: s.price }); hours += s.hours; serviceIds.push(s.id); });
      title = picks.map(s => s.name.split(' · ')[0]).join(' + ');
      line = picks[0].line;
    }
    if (r.bool(.18) && delivered) { const [d, p] = r.pick(Object.values(REC_LIBRARY)); items.push({ desc: d, kind: 'rec', qty: 1, price: p }); hours += 1; }
    const useConc = r.bool(cust?.tier === 'black' ? .85 : cust?.tier === 'gold' ? .7 : .38);
    const wo = { id: 'wo' + seq, code: 'OT-' + seq++, customerId: v.customerId, vehicleId: v.id, line, title, serviceIds, status: status || 'entregada', advisorId: r.bool(.62) ? 'u-asesor' : 'u-asesor2', techId: techFor(line, v),
      createdAt: created, scheduledAt: created, km: km || v.km, items, laborHours: Math.round(hours * 10) / 10, loggedMins: Math.round(hours * 60 * (0.78 + r() * .35)), courtesyCar: useConc && r.bool(.4) };
    if (wo.status === 'entregada') { wo.deliveredAt = new Date(new Date(created).getTime() + Math.max(1, Math.ceil(hours / 8)) * DAY + r.int(2, 6) * 3600e3).toISOString(); if (r.bool(.66)) { wo.nps = r.pick(NPS); if (r.bool(.4)) wo.npsComment = r.pick(NPS_TXT); } }
    if (useConc) {
      const c = { id: 'cc' + wo.code.slice(3), woId: wo.id, code: wo.code, customerId: v.customerId, vehicleId: v.id, kind: r.bool(.7) ? 'domicilio' : 'oficina', address: cust.address, comuna: cust.comuna, date: created.slice(0, 10), window: r.pick(WINDOWS), driverId: r.pick(drivers).id, status: 'entregado', fee: cust.tier === 'gold' || cust.tier === 'black' ? 0 : 35000, courtesyCarId: wo.courtesyCar ? r.pick(['fl1', 'fl2', 'fl3', 'fl4']) : null };
      concierge.push(c); wo.conciergeId = c.id;
      if (c.fee) items.push({ desc: 'Servicio concierge (retiro y entrega)', kind: 'conc', qty: 1, price: c.fee });
    }
    workOrders.push(wo);
    return wo;
  }

  // Historial: ~8 meses hábiles
  for (let d = 240; d >= 3; d--) {
    const day = new Date(NOW - d * DAY).getDay();
    if (day === 0) continue;
    const n = day === 6 ? r.int(0, 1) : r.int(1, 2) + (r.bool(d < 70 ? .45 : .15) ? 1 : 0);
    for (let k = 0; k < n; k++) { const v = r.pick(vehicles.slice(4)); makeWO(v, at(d), { km: Math.max(1000, v.km - Math.round(d * r.int(20, 45))) }); }
  }
  // Historial garantizado para las cuentas demo (libro de mantenciones)
  const [v911, vTay, vMY, vM3] = vehicles;
  [[600, 9000, 'mantencion'], [330, 22500, 'mantencion'], [210, 30100, 'estetica', ['sv-ppf-front']], [150, 33000, 'performance', ['sv-stage1']], [40, 37900, 'mantencion']].forEach(([d, km, line, svc]) => makeWO(v911, at(d), { km, line, svcIds: svc }));
  [[380, 12000, 'mantencion'], [160, 21000, 'ev', ['sv-soh']], [60, 27800, 'estetica', ['sv-ceramico']]].forEach(([d, km, line, svc]) => makeWO(vTay, at(d), { km, line, svcIds: svc }));
  [[220, 9800, 'ev', ['sv-wallbox11']], [90, 17000, 'mantencion']].forEach(([d, km, line, svc]) => makeWO(vMY, at(d), { km, line, svcIds: svc }));
  [[420, 28000, 'mantencion'], [250, 36000, 'diagnostico', ['sv-align']], [100, 41000, 'mantencion']].forEach(([d, km, line, svc]) => makeWO(vM3, at(d), { km, line, svcIds: svc }));

  // Trabajo en curso (últimos días) con distintos estados
  const ACTIVE = ['recepcion', 'inspeccion', 'aprobacion', 'aprobacion', 'en-proceso', 'en-proceso', 'en-proceso', 'control', 'lista', 'lista', 'inspeccion', 'en-proceso'];
  const pool = vehicles.slice(4);
  ACTIVE.forEach((st, i) => { const v = pool[(i * 7 + 3) % pool.length]; makeWO(v, at(r.int(0, 4)), { status: st }); });
  // Casos guiados de las cuentas demo
  const woTay = makeWO(vTay, at(1, 9), { status: 'aprobacion', line: 'mantencion', km: 29800 });
  const woMY = makeWO(vMY, at(2, 10), { status: 'en-proceso', line: 'ev', svcIds: ['sv-soh', 'sv-termico'] });
  const woM3 = makeWO(vM3, at(0, 8), { status: 'agendada', line: 'performance', svcIds: ['sv-stage1'] });
  const wo911 = makeWO(v911, at(0, 9), { status: 'agendada', line: 'estetica', svcIds: ['sv-ceramico'] });
  wo911.scheduledAt = addDays(new Date(), 1).toISOString();
  // Agendadas próximas
  for (let i = 0; i < 7; i++) { const v = pool[(i * 11 + 5) % pool.length]; const w = makeWO(v, at(r.int(0, 3)), { status: 'agendada' }); w.scheduledAt = addDays(new Date(), r.int(0, 6)).toISOString(); }

  // Concierge de los trabajos activos: estado coherente con la OT
  const concOf = wo => concierge.find(c => c.id === wo.conciergeId);
  const ensureConc = (wo, extra) => {
    let c = concOf(wo);
    const cust = customers.find(x => x.id === wo.customerId);
    if (!c) { c = { id: 'cc' + wo.code.slice(3), woId: wo.id, code: wo.code, customerId: wo.customerId, vehicleId: wo.vehicleId, kind: 'domicilio', address: cust.address, comuna: cust.comuna, window: WINDOWS[1], driverId: 'u-ch1', fee: cust.tier === 'gold' || cust.tier === 'black' ? 0 : 35000, courtesyCarId: null }; concierge.push(c); wo.conciergeId = c.id; }
    Object.assign(c, { date: (wo.scheduledAt || wo.createdAt).slice(0, 10) }, extra);
    return c;
  };
  workOrders.filter(w => w.status !== 'entregada').forEach(w => {
    const c = concOf(w); if (!c) return;
    c.status = w.status === 'agendada' ? 'programado' : w.status === 'lista' ? 'listo' : 'en-taller';
    c.date = (w.scheduledAt || w.createdAt).slice(0, 10);
    if (c.status !== 'programado') c.pickup = { at: w.createdAt, km: w.km, charge: r.int(20, 90), photos: 6, damages: r.bool(.3) ? 'Piquete leve en parachoques trasero' : '', driverId: c.driverId };
  });
  ensureConc(woTay, { status: 'en-taller', kind: 'domicilio', courtesyCarId: 'fl5', pickup: { at: woTay.createdAt, km: 29800, charge: 64, photos: 6, damages: '', driverId: 'u-ch1' } }); woTay.courtesyCar = true;
  ensureConc(woMY, { status: 'en-taller', kind: 'oficina', pickup: { at: woMY.createdAt, km: 21500, charge: 48, photos: 6, damages: 'Rayón superficial llanta delantera derecha', driverId: 'u-ch2' } });
  ensureConc(woM3, { status: 'en-camino', kind: 'oficina', window: WINDOWS[0], driverId: 'u-ch1', startedAt: new Date(NOW - 14 * 60e3).toISOString() });
  ensureConc(wo911, { status: 'programado', kind: 'domicilio', window: WINDOWS[1], driverId: 'u-ch1', courtesyCarId: 'fl5' }); wo911.courtesyCar = true;
  // Una entrega para hoy asignada al chofer demo
  const listo = workOrders.find(w => w.status === 'lista');
  if (listo) ensureConc(listo, { status: 'listo', driverId: 'u-ch1', deliveryWindow: WINDOWS[3], pickup: { at: listo.createdAt, km: listo.km, charge: 70, photos: 6, damages: '', driverId: 'u-ch2' } });

  // ---------- Inspecciones digitales ----------
  const COMMENTS = { atencion: ['Desgaste dentro de tolerancia, recomendamos cambio en la próxima visita.', 'Se observa leve fuga/humedad, monitorear.', 'Medición en el límite inferior del rango de fábrica.', 'Sugerimos reemplazo en los próximos 3.000 km.'], urgente: ['Bajo el mínimo de seguridad: recomendamos cambio inmediato.', 'Falla registrada en escáner, requiere reparación.', 'Desgaste irregular por desalineación: riesgo en frenado.'] };
  function buildInspection(wo, { pending = false, forceIssues = false } = {}) {
    const v = vehicles.find(x => x.id === wo.vehicleId), isEv = v.fuel === 'electrico';
    const items = inspectionTemplate(isEv).map(({ cat, name }) => {
      const x = r();
      let s = x < (forceIssues ? .84 : .8) ? 'ok' : x < .93 ? 'atencion' : 'urgente';
      if (forceIssues && ['Pastillas delanteras', 'Filtro de cabina (polen)', 'Líquido de frenos'].includes(name)) s = name === 'Pastillas delanteras' ? 'urgente' : 'atencion';
      const it = { cat, name, s };
      if (name.startsWith('Neumático')) it.val = `${s === 'ok' ? r.int(5, 8) : s === 'atencion' ? 4 : 2} mm`;
      if (name === 'Pastillas delanteras' || name === 'Pastillas traseras') it.val = `${s === 'ok' ? r.int(6, 10) : s === 'atencion' ? 4 : 2} mm`;
      if (s !== 'ok') {
        it.c = r.pick(COMMENTS[s]); it.m = r.int(1, 3); it.v = r.bool(.4) ? 1 : 0;
        const rec = REC_LIBRARY[name];
        if (rec) { it.rec = { desc: rec[0], price: rec[1] }; it.ap = pending ? null : r.bool(.65); }
      } else if (r.bool(.12)) it.m = 1;
      return it;
    });
    const ins = { id: 'in' + wo.code.slice(3), woId: wo.id, vehicleId: v.id, techId: wo.techId, at: new Date(new Date(wo.createdAt).getTime() + 3 * 3600e3).toISOString(), km: wo.km, items, summary: pending ? 'Vehículo en buen estado general. Encontramos puntos que requieren tu aprobación antes de continuar.' : 'Inspección completada.' };
    if (isEv || v.fuel === 'hibrido') {
      const base = 3.88 + r() * .06, weak = r.int(0, 23);
      ins.battery = { soh: Math.round((isEv ? 88 + r() * 10 : 90 + r() * 8) * 10) / 10, tempC: r.int(22, 31), cycles: r.int(60, 520), rangeKm: isEv ? r.int(360, 520) : r.int(45, 70), cells: Array.from({ length: 24 }, (_, i) => Math.round((base + (r() - .5) * .018 - (i === weak && forceIssues ? .035 : 0)) * 1000) / 1000) };
    }
    inspections.push(ins); wo.inspectionId = ins.id;
    if (!pending) items.filter(i => i.ap).forEach(i => wo.items.push({ desc: i.rec.desc, kind: 'rec', qty: 1, price: i.rec.price }));
    return ins;
  }
  workOrders.filter(w => ['mantencion', 'diagnostico', 'ev'].includes(w.line) && (w.status === 'entregada' ? (NOW - new Date(w.createdAt)) < 16 * DAY : WO_AFTER_INSPECTION.includes(w.status)))
    .forEach(w => buildInspection(w, { pending: w.status === 'aprobacion' }));
  workOrders.filter(w => w.status === 'aprobacion' && !w.inspectionId).forEach(w => buildInspection(w, { pending: true }));
  inspections.find(i => i.woId === woTay.id) && inspections.splice(inspections.findIndex(i => i.woId === woTay.id), 1);
  buildInspection(woTay, { pending: true, forceIssues: true });
  [v911, vTay, vMY, vM3].forEach(v => workOrders.filter(w => w.vehicleId === v.id && w.status === 'entregada' && !w.inspectionId && w.line !== 'estetica').slice(-1).forEach(w => buildInspection(w)));

  // Registro de tiempos en trabajos activos
  workOrders.filter(w => ['inspeccion', 'aprobacion', 'en-proceso', 'control', 'lista'].includes(w.status)).forEach(w => {
    w.timeLogs = Array.from({ length: r.int(1, 3) }, (_, i) => ({ techId: w.techId, at: new Date(new Date(w.createdAt).getTime() + (i + 1) * 2 * 3600e3).toISOString(), mins: r.int(25, 140), note: r.pick(['Recepción e inspección', 'Desmontaje', 'Diagnóstico con escáner', 'Trabajo principal', 'Prueba en ruta']) }));
    w.loggedMins = w.timeLogs.reduce((a, t) => a + t.mins, 0);
  });
  workOrders.forEach(w => { if (w.status !== 'entregada') w.history = [{ status: 'agendada', at: w.createdAt }, ...(w.status !== 'agendada' ? [{ status: w.status, at: w.createdAt }] : [])]; if (w.scheduledAt === w.createdAt) delete w.scheduledAt; if (!w.courtesyCar) delete w.courtesyCar; });

  // ---------- Dyno ----------
  workOrders.filter(w => w.serviceIds.some(s => s === 'sv-stage1' || s === 'sv-stage2') && w.status === 'entregada').slice(-14).forEach((w, i) => {
    const v = vehicles.find(x => x.id === w.vehicleId);
    const st2 = w.serviceIds.includes('sv-stage2');
    const hp = Math.round(v.hp * (0.86 + r() * .05)); // potencia en rueda
    dyno.push({ id: 'dy' + w.code.slice(3), woId: w.id, vehicleId: v.id, at: w.deliveredAt || w.createdAt, stage: st2 ? 'Stage 2' : 'Stage 1', tempC: r.int(14, 27), fuel: '97 octanos',
      before: { hp, rpm: r.int(56, 66) * 100 }, after: { hp: Math.round(hp * (st2 ? 1.27 + r() * .08 : 1.12 + r() * .07)), rpm: r.int(58, 67) * 100 }, redline: v.body === 'coupe' ? 7500 : 7000, public: r.bool(.85), techId: 'u-tec6',
      notes: st2 ? 'Mezcla estable, temperaturas de admisión controladas con el nuevo intercooler.' : 'Ganancia limpia en todo el rango; sin golpe de biela ni retardo de encendido.' });
  });

  // ---------- Flota concierge ----------
  const fleet = [
    { id: 'fl1', name: 'Volvo XC40 Recharge', plate: 'RTKZ-21', type: 'cortesia', status: 'disponible', charge: 82, km: 18400, color: '#e9e9e4', body: 'suv', fuel: 'electrico' },
    { id: 'fl2', name: 'Volvo EX30', plate: 'SBHL-63', type: 'cortesia', status: 'disponible', charge: 64, km: 9200, color: '#2b74b8', body: 'hatch', fuel: 'electrico' },
    { id: 'fl3', name: 'Tesla Model 3', plate: 'RXWP-08', type: 'cortesia', status: 'en-uso', charge: 51, km: 31200, color: '#121317', body: 'sedan', fuel: 'electrico' },
    { id: 'fl4', name: 'Tesla Model 3', plate: 'SCFD-44', type: 'cortesia', status: 'mantencion', charge: 90, km: 27750, color: '#b9bec4', body: 'sedan', fuel: 'electrico' },
    { id: 'fl5', name: 'Porsche Macan Electric', plate: 'TDRG-17', type: 'cortesia-premium', status: 'en-uso', charge: 73, km: 6100, color: '#3b3f45', body: 'suv', fuel: 'electrico' },
    { id: 'fl6', name: 'Camión plataforma cama baja', plate: 'KJTR-45', type: 'plataforma', status: 'disponible', charge: null, km: 88200, color: '#e9e9e4', body: 'van', fuel: 'diesel' }
  ];

  // ---------- Repuestos ----------
  const parts = PARTS.map(([sku, name, brand, compat, stock, min, cost, price, loc], i) => ({ id: 'pt' + (i + 1), sku, name, brand, compat, stock: stock - (i % 5 === 0 ? min : 0), min, cost, price: price || Math.round(cost * 1.7), location: loc, oem: !['Estética', 'EV', 'Neumáticos'].includes(brand) }));
  const SO = [['Turbo izquierdo 911 Turbo S', 'PO-9A2145701', 'Porsche Ibérica (importación)', 'aduana', 4200000], ['Faro Matrix LED derecho RS 6', 'AU-4K9941036', 'Audi AG Ingolstadt', 'transito', 3100000], ['Módulo de batería 12 (Taycan)', 'PO-9J1915591', 'Porsche AG', 'solicitado', 5600000],
    ['Pinza de freno carbono-cerámica', 'MB-A2224210698', 'Mercedes-AMG Affalterbach', 'transito', 2900000], ['Llanta forjada 21" Model S', 'TS-1505421', 'Tesla Shanghai', 'recibido', 1250000], ['Parabrisas con HUD M4', 'BM-51318498215', 'BMW Group', 'aduana', 1890000],
    ['Kit embrague bimasa RS 3', 'AU-0CQ141015', 'Audi AG', 'instalado', 1480000], ['Sensor de radar delantero XC90', 'VO-32296326', 'Volvo Cars Gent', 'transito', 980000], ['Escape Akrapovič titanio 992', 'GN-AKR-992', 'Proveedor performance', 'solicitado', 6900000], ['Bomba de refrigerante HV iX', 'BM-17119846911', 'BMW Group', 'recibido', 760000]];
  const specialOrders = SO.map(([part, sku, supplier, status, cost], i) => {
    const w = workOrders[workOrders.length - 1 - i * 2];
    return { id: 'so' + (i + 1), part, sku, supplier, status, cost, price: Math.round(cost * 1.35), woId: w.id, customerId: w.customerId, orderedAt: at(r.int(5, 40)), eta: ymd(addDays(new Date(), status === 'recibido' || status === 'instalado' ? -r.int(1, 8) : r.int(3, 35))), tracking: 'DHL ' + r.int(1000000000, 9999999999) };
  });

  const testimonials = [
    { name: 'Martina L.', car: 'Porsche 911 Carrera S', text: 'Me retiraron el auto en la casa, me dejaron un Macan eléctrico y recibí la inspección con fotos y video en el celular. Así debería ser siempre.', rating: 5, active: true },
    { name: 'Rodrigo E.', car: 'BMW M3 Competition', text: 'El Stage 1 con dyno antes y después fue transparente: 68 CV más, curva limpia y todo documentado.', rating: 5, active: true },
    { name: 'Josefina V.', car: 'Tesla Model Y', text: 'Instalaron el cargador de 11 kW en una mañana y hicieron el trámite TE6. Cero estrés.', rating: 5, active: true },
    { name: 'Cristóbal M.', car: 'Audi RS 6 Avant', text: 'PPF integral satinado: quedó perfecto y el auto se ve nuevo después de un año.', rating: 5, active: true },
    { name: 'Isidora R.', car: 'Volvo XC60 Recharge', text: 'Buen servicio, aunque tuve que esperar un repuesto importado. Me mantuvieron informada del ETA.', rating: 4, active: true }
  ];
  const faqs = [
    { q: '¿Mantener mi auto en Atelier Torque afecta la garantía de fábrica?', a: 'No. Seguimos el plan del fabricante, usamos repuestos originales o equivalentes OEM y registramos cada servicio en tu libro de mantenciones digital.', active: true },
    { q: '¿Cómo funciona el retiro concierge?', a: 'Eliges una ventana de 2 horas y la dirección. Un chofer certificado retira el auto, registra fotos, kilometraje y nivel de carga, y te lo devuelve lavado.', active: true },
    { q: '¿Qué es la inspección digital?', a: 'Durante la recepción revisamos más de 30 puntos con semáforo verde, ámbar y rojo, con fotos, videos y comentarios del técnico. Tú apruebas en línea solo lo que quieras hacer.', active: true },
    { q: '¿Atienden autos eléctricos e híbridos?', a: 'Sí. Contamos con técnicos certificados en alta tensión, diagnóstico de salud de batería (SOH) e instalación de cargadores domiciliarios con declaración SEC.', active: true },
    { q: '¿Hacen reprogramaciones legales?', a: 'Trabajamos mapas que respetan normas de emisiones y sensores originales. Siempre respaldamos el archivo original.', active: true }
  ];

  const settings = {
    name: 'Atelier Torque', tagline: 'Taller de autor para autos de alto desempeño y eléctricos',
    heroTitle: 'Tu auto, atendido como una pieza de colección.', heroText: 'Mantenciones según el plan de fábrica, performance medida en dinamómetro y especialistas en eléctricos. Retiramos y devolvemos tu auto donde estés.',
    announcement: 'Nuevo: diagnóstico de batería SOH con informe certificado para venta de tu eléctrico.',
    phone: '+56 2 2940 7100', whatsapp: '+56 9 4410 7100', email: 'concierge@ateliertorque.cl', address: 'Av. Las Hualtatas 9450, Vitacura, Santiago', hours: 'Lun a vie 08:00–19:00 · Sáb 09:00–14:00',
    conciergeFee: 35000, conciergeRadiusKm: 25, heroCar: { body: 'coupe', color: '#8a8f93', label: 'Porsche 911 Carrera S en Gris Nardo' }, courtesyEnabled: true, showDyno: true, showMemberships: true, showTestimonials: true, stats: [['+2.400', 'autos atendidos'], ['4,9', 'calificación promedio'], ['38%', 'eléctricos e híbridos'], ['72 h', 'tiempo promedio en taller']]
  };

  // Bitácora inicial
  const LOG = [['ordenes', 'u-asesor', w => `${w.code}: Recepción`], ['concierge', 'u-ch1', w => `${w.code}: Vehículo retirado`], ['ordenes', 'u-tec1', w => `${w.code}: inspección digital enviada al cliente`], ['ordenes', 'u-asesor2', w => `${w.code}: Lista para entrega`], ['agenda', null, w => `Nueva agenda ${w.code} desde el sitio web`], ['repuestos', 'u-gerente', () => 'Pedido especial actualizado: Faro Matrix LED derecho RS 6 · En tránsito'], ['login', 'u-admin', () => 'Camila Bascuñán inició sesión']];
  const _log = workOrders.slice(-28).map((w, i) => { const [action, user, f] = LOG[i % LOG.length]; return { id: 'lg' + i, at: new Date(NOW - (28 - i) * 3 * 3600e3).toISOString(), action, detail: f(w), user }; }).reverse();

  return { _log, users, customers, vehicles, programs: PROGRAMS, services: SERVICES, tiers: TIERS, workOrders, inspections, concierge, dyno, fleet, parts, specialOrders, testimonials, faqs, settings };
}
const WO_AFTER_INSPECTION = ['aprobacion', 'en-proceso', 'control', 'lista'];
