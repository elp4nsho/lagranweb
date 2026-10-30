// Catálogo estático de Mecánica Integral Los Andes: etapas de la OT, checklist de ingreso,
// tipos de daño, servicios públicos, horas estándar (baremo) y repuestos base.

export const STAGES = [
  ['recepcion', 'Recepción', '📥', 'info'], ['diagnostico', 'Diagnóstico', '🩺', 'info'], ['presupuesto', 'Presupuesto', '🧮', 'warning'],
  ['aprobado', 'Aprobado', '👍', 'primary'], ['reparacion', 'En reparación', '🔧', 'primary'], ['control', 'Control de calidad', '🔍', 'warning'],
  ['listo', 'Listo', '✅', 'success'], ['entregado', 'Entregado', '🏁', '']
];
export const ST = Object.fromEntries(STAGES.map(([id, label, icon, badge], i) => [id, { id, label, icon, badge, i }]));
ST.cancelada = { id: 'cancelada', label: 'Cancelada', icon: '✕', badge: 'danger', i: -1 };
export const OPEN = STAGES.slice(0, 7).map(s => s[0]);

export const OT_TYPES = { mecanica: '🔧 Mecánica', carroceria: '🎨 Desabolladura y pintura', siniestro: '🛡️ Siniestro (seguro)', mantencion: '🛢️ Mantención' };

export const CHECKLIST = [
  ['docs', 'Padrón y permiso de circulación'], ['rueda', 'Rueda de repuesto'], ['gata', 'Gata y llave de ruedas'], ['triangulo', 'Triángulos y botiquín'],
  ['radio', 'Radio / pantalla'], ['tapas', 'Tapas de ruedas'], ['antena', 'Antena'], ['alfombras', 'Alfombras'],
  ['luces', 'Luces funcionando'], ['testigos', 'Testigos en tablero'], ['llaves', 'Llave + control'], ['objetos', 'Objetos de valor retirados']
];
export const DAMAGE = { abolladura: { label: 'Abolladura', icon: '●', tone: 'danger' }, rayon: { label: 'Rayón', icon: '╱', tone: 'warning' }, trizadura: { label: 'Trizadura', icon: '✶', tone: 'info' }, oxido: { label: 'Óxido', icon: '◆', tone: 'accent' } };

export const SERVICES = [
  { id: 'mecanica', name: 'Mecánica general', icon: '🔧', cat: 'Mecánica', from: 39990, desc: 'Mantenciones por kilometraje según pauta de fábrica, frenos, embrague, correas y fugas.', bullets: ['Mantención por pauta (10.000 a 100.000 km)', 'Frenos, discos y tambores', 'Embrague y volante bimasa', 'Correas de distribución y accesorios'] },
  { id: 'scanner', name: 'Diagnóstico computarizado', icon: '🖥️', cat: 'Mecánica', from: 29990, desc: 'Escáner multimarca, lectura de datos en vivo, osciloscopio y prueba de ruta con informe.', bullets: ['Escáner multimarca OBD2 y protocolos de fábrica', 'Datos en vivo y osciloscopio', 'Informe con fotos y prioridades', 'Se descuenta si reparas con nosotros'] },
  { id: 'motor', name: 'Motor y caja', icon: '⚙️', cat: 'Mecánica', from: 249990, desc: 'Ajuste de motor, culata, cajas manuales y automáticas, CVT y diferenciales.', bullets: ['Ajuste y rectificado de motor', 'Culata y empaquetadura', 'Caja automática, CVT y DSG', 'Diferencial y transfer 4x4'] },
  { id: 'suspension', name: 'Suspensión y dirección', icon: '🛞', cat: 'Mecánica', from: 59990, desc: 'Amortiguadores, bujes, rótulas, terminales, cremallera y alineación 3D.', bullets: ['Amortiguadores y espirales', 'Bujes, rótulas y terminales', 'Cremallera y dirección eléctrica', 'Alineación 3D con informe'] },
  { id: 'electricidad', name: 'Electricidad y electrónica', icon: '⚡', cat: 'Mecánica', from: 34990, desc: 'Alternador, motor de partida, cableado, sensores, módulos, cierres y alzavidrios.', bullets: ['Alternador y motor de partida', 'Sensores y actuadores', 'Programación de llaves', 'Iluminación LED y accesorios'] },
  { id: 'ac', name: 'Aire acondicionado', icon: '❄️', cat: 'Mecánica', from: 44990, desc: 'Carga de gas R134a / R1234yf, detección de fugas, compresores y filtros de cabina.', bullets: ['Vacío y carga de gas', 'Detección de fugas con trazador', 'Compresor y condensador', 'Higienización del sistema'] },
  { id: 'pintura', name: 'Desabolladura y pintura', icon: '🎨', cat: 'Carrocería', from: 89990, desc: 'Cabina de pintura presurizada, colorimetría computarizada y pulido. Paños, parachoques y pintura completa.', bullets: ['Desabolladura sin pintura (PDR)', 'Pintura por paño con colorimetría', 'Cabina presurizada con horno', 'Pulido y tratamiento cerámico'] },
  { id: 'siniestros', name: 'Siniestros con seguro', icon: '🛡️', cat: 'Carrocería', from: 0, desc: 'Taller en convenio con las principales aseguradoras: gestionamos la denuncia, el liquidador y el deducible.', bullets: ['Convenio directo con aseguradoras', 'Coordinación con liquidador', 'Auto de reemplazo (según póliza)', 'Pagas solo el deducible'] }
];

// Baremo de horas estándar: [id, descripción, categoría, horas]
export const LABOR = [
  ['l-mant10', 'Mantención 10.000 km (pauta)', 'Mantención', 1.2], ['l-mant40', 'Mantención mayor 40.000 km', 'Mantención', 2.5], ['l-diag', 'Diagnóstico computarizado y prueba de ruta', 'Diagnóstico', 1],
  ['l-past', 'Cambio pastillas eje delantero', 'Frenos', 1], ['l-disc', 'Rectificado/cambio discos delanteros', 'Frenos', 1.5], ['l-embr', 'Cambio kit de embrague', 'Transmisión', 5.5],
  ['l-dist', 'Cambio kit distribución 4 cilindros', 'Motor', 4.5], ['l-culata', 'Desarme y armado de culata', 'Motor', 9], ['l-bomba', 'Cambio bomba de agua', 'Motor', 2.2],
  ['l-amort', 'Cambio amortiguadores delanteros (par)', 'Suspensión', 2], ['l-bujes', 'Cambio bujes y rótulas delanteras', 'Suspensión', 2.8], ['l-alin', 'Alineación 3D y balanceo', 'Suspensión', .8],
  ['l-alt', 'Cambio alternador', 'Electricidad', 1.5], ['l-part', 'Cambio motor de partida', 'Electricidad', 1.6], ['l-acgas', 'Vacío y carga gas A/C', 'Aire acondicionado', 1], ['l-comp', 'Cambio compresor A/C', 'Aire acondicionado', 3],
  ['l-desab', 'Desabolladura por paño', 'Carrocería', 3], ['l-pint', 'Preparación y pintura por paño', 'Pintura', 4], ['l-parach', 'Reparación y pintura parachoques', 'Pintura', 5], ['l-pulido', 'Pulido completo', 'Pintura', 3.5], ['l-desmon', 'Desmontaje/montaje de piezas carrocería', 'Carrocería', 1.5]
];

// [sku, nombre, categoría, precio, costo, mínimo, stock, proveedor]
export const PARTS = [
  ['FA-1108', 'Filtro de aceite (línea asiática)', 'Filtros', 6990, 2200, 10, 26, 'pv1'], ['FA-1450', 'Filtro de aceite (línea europea)', 'Filtros', 11990, 4100, 6, 14, 'pv1'], ['FI-220', 'Filtro de aire motor', 'Filtros', 12990, 4300, 8, 19, 'pv1'], ['FC-108', 'Filtro de cabina carbón', 'Filtros', 13990, 4600, 8, 15, 'pv1'],
  ['AC-0530-5', 'Aceite sintético 5W-30 (bidón 5 L)', 'Lubricantes', 49990, 24000, 8, 22, 'pv1'], ['AC-0020-4', 'Aceite sintético 0W-20 (bidón 4 L)', 'Lubricantes', 46990, 22500, 8, 17, 'pv1'],
  ['PF-A01', 'Pastillas de freno delanteras (asiático)', 'Frenos', 34990, 15500, 6, 12, 'pv2'], ['PF-E01', 'Pastillas de freno delanteras (europeo)', 'Frenos', 69990, 33000, 3, 5, 'pv2'], ['DF-A01', 'Par de discos delanteros ventilados', 'Frenos', 89990, 44000, 3, 6, 'pv2'], ['LF-DOT4', 'Líquido de frenos DOT 4 (1 L)', 'Frenos', 9990, 3500, 6, 18, 'pv2'],
  ['KD-4C01', 'Kit distribución + bomba de agua 4 cil.', 'Motor', 219990, 118000, 2, 4, 'pv3'], ['EM-KIT1', 'Kit de embrague (disco, prensa, collarín)', 'Transmisión', 279990, 152000, 2, 3, 'pv3'], ['BU-ENC4', 'Juego bujías iridio (4)', 'Motor', 59990, 26000, 4, 9, 'pv3'], ['EMP-CUL', 'Empaquetadura de culata', 'Motor', 69990, 31000, 2, 2, 'pv3'],
  ['AM-DEL2', 'Amortiguadores delanteros (par)', 'Suspensión', 159990, 82000, 2, 5, 'pv4'], ['BJ-KIT', 'Kit bujes y rótulas delanteras', 'Suspensión', 99990, 47000, 2, 4, 'pv4'], ['TD-01', 'Terminal de dirección', 'Suspensión', 29990, 12500, 4, 7, 'pv4'],
  ['ALT-90', 'Alternador 90 A remanufacturado', 'Electricidad', 249990, 139000, 1, 2, 'pv3'], ['MP-12', 'Motor de partida remanufacturado', 'Electricidad', 199990, 108000, 1, 1, 'pv3'], ['BAT-70', 'Batería 70 Ah', 'Electricidad', 99990, 58000, 3, 6, 'pv3'],
  ['GAS-134', 'Gas refrigerante R134a (kg)', 'Aire acondicionado', 39990, 16000, 4, 9, 'pv5'], ['GAS-1234', 'Gas refrigerante R1234yf (kg)', 'Aire acondicionado', 129990, 74000, 2, 3, 'pv5'], ['COMP-AC', 'Compresor A/C remanufacturado', 'Aire acondicionado', 389990, 221000, 1, 1, 'pv5'],
  ['PIN-BASE', 'Pintura base color (litro preparado)', 'Pintura', 69990, 31000, 6, 14, 'pv6'], ['PIN-BAR', 'Barniz alto sólido (litro)', 'Pintura', 39990, 17000, 6, 11, 'pv6'], ['MAS-POL', 'Masilla poliéster (kg)', 'Pintura', 14990, 5500, 6, 13, 'pv6'], ['PAR-DEL', 'Parachoques delantero (genérico, imprimado)', 'Carrocería', 189990, 98000, 1, 2, 'pv6'], ['FOCO-DEL', 'Óptico delantero', 'Carrocería', 229990, 121000, 1, 2, 'pv6'], ['ESP-LAT', 'Espejo lateral eléctrico', 'Carrocería', 119990, 61000, 1, 2, 'pv6']
];

export const VEHICLES = [
  ['Toyota', 'Yaris'], ['Toyota', 'Hilux'], ['Toyota', 'RAV4'], ['Hyundai', 'Accent'], ['Hyundai', 'Tucson'], ['Kia', 'Rio 5'], ['Kia', 'Sportage'], ['Chevrolet', 'Sail'], ['Chevrolet', 'Captiva'], ['Nissan', 'Qashqai'], ['Nissan', 'Navara'], ['Mazda', 'CX-5'], ['Mazda', '3'], ['Suzuki', 'Swift'], ['Peugeot', '208'], ['Peugeot', '3008'], ['Volkswagen', 'Golf'], ['Volkswagen', 'Amarok'], ['Mitsubishi', 'L200'], ['Ford', 'Ranger'], ['Subaru', 'Outback'], ['BMW', 'Serie 3'], ['Mercedes-Benz', 'Clase C'], ['Audi', 'Q5'], ['Volvo', 'XC60'], ['Porsche', 'Cayenne'], ['MG', 'ZS'], ['Chery', 'Tiggo 7']
];
export const COLORS = ['#0b3d91', '#c0392b', '#16a085', '#d68910', '#8e44ad', '#2e86c1', '#7f8c8d', '#27ae60', '#d35400', '#34495e'];
export const PAY = [['debito', 'Débito'], ['credito', 'Crédito'], ['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['seguro', 'Pago aseguradora']];
