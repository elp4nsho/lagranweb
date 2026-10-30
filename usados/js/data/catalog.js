// Catálogos fijos de Ruta Certificada: modelos, estados, 150 puntos de inspección, regiones.
export const MODELS = [
  // [marca, modelo, versión, carrocería, combustible, transmisión, motor, CV, precio nuevo aprox. CLP]
  ['Toyota', 'Yaris', 'XLi 1.5', 'sedan', 'Bencina', 'Manual', '1.5', 107, 14990000], ['Toyota', 'Corolla Cross', 'XEI Hybrid', 'suv', 'Híbrido', 'Automática', '1.8', 140, 27990000],
  ['Toyota', 'RAV4', 'Limited 2.5', 'suv', 'Bencina', 'Automática', '2.5', 203, 32990000], ['Toyota', 'Hilux', 'SRV 2.8 4x4', 'pickup', 'Diésel', 'Automática', '2.8', 204, 36990000],
  ['Suzuki', 'Swift', 'GLX 1.2', 'hatch', 'Bencina', 'Manual', '1.2', 83, 11490000], ['Suzuki', 'Vitara', 'GLX AllGrip', 'suv', 'Bencina', 'Automática', '1.4', 140, 19990000],
  ['Hyundai', 'Accent', 'GL 1.4', 'sedan', 'Bencina', 'Manual', '1.4', 100, 12990000], ['Hyundai', 'Tucson', 'GLS 2.0', 'suv', 'Bencina', 'Automática', '2.0', 156, 25990000],
  ['Kia', 'Rio 5', 'EX 1.4', 'hatch', 'Bencina', 'Manual', '1.4', 100, 12490000], ['Kia', 'Sportage', 'EX 2.0', 'suv', 'Bencina', 'Automática', '2.0', 155, 24990000],
  ['Chevrolet', 'Sail', 'LT 1.5', 'sedan', 'Bencina', 'Manual', '1.5', 107, 10990000], ['Chevrolet', 'Tracker', 'Premier 1.2T', 'suv', 'Bencina', 'Automática', '1.2', 132, 19490000],
  ['Nissan', 'Versa', 'Advance 1.6', 'sedan', 'Bencina', 'Automática', '1.6', 118, 15490000], ['Nissan', 'Kicks', 'Exclusive', 'suv', 'Bencina', 'Automática', '1.6', 118, 19990000],
  ['Nissan', 'Navara', 'LE 2.3 4x4', 'pickup', 'Diésel', 'Automática', '2.3', 190, 31990000], ['Mazda', 'Mazda 3', 'Sport 2.0', 'hatch', 'Bencina', 'Automática', '2.0', 155, 20990000],
  ['Mazda', 'CX-5', 'R 2.5 AWD', 'suv', 'Bencina', 'Automática', '2.5', 192, 29990000], ['Peugeot', '208', 'Active 1.2', 'hatch', 'Bencina', 'Manual', '1.2', 82, 13490000],
  ['Peugeot', '3008', 'Allure 1.6T', 'suv', 'Bencina', 'Automática', '1.6', 165, 28990000], ['Volkswagen', 'T-Cross', 'Highline 1.4 TSI', 'suv', 'Bencina', 'Automática', '1.4', 150, 21990000],
  ['Ford', 'Ranger', 'XLT 3.2 4x4', 'pickup', 'Diésel', 'Automática', '3.2', 200, 33990000], ['Mitsubishi', 'L200', 'Katana 2.4 4x4', 'pickup', 'Diésel', 'Manual', '2.4', 181, 27990000],
  ['Subaru', 'Forester', '2.0i XS AWD', 'suv', 'Bencina', 'Automática', '2.0', 156, 27490000], ['MG', 'ZS EV', 'Comfort', 'suv', 'Eléctrico', 'Automática', 'EV', 176, 26990000],
  ['BYD', 'Dolphin', 'GS 60 kWh', 'hatch', 'Eléctrico', 'Automática', 'EV', 204, 24990000], ['Tesla', 'Model 3', 'RWD', 'sedan', 'Eléctrico', 'Automática', 'EV', 283, 42990000],
  ['BMW', 'Serie 3', '320i Sport', 'sedan', 'Bencina', 'Automática', '2.0', 184, 41990000], ['Audi', 'Q3', '35 TFSI', 'suv', 'Bencina', 'Automática', '1.4', 150, 34990000]
].map(([brand, model, version, body, fuel, transmission, engine, hp, newPrice]) => ({ brand, model, version, body, fuel, transmission, engine, hp, newPrice }));
export const BRANDS = [...new Set(MODELS.map(m => m.brand))];
export const REGIONS = ['Metropolitana', 'Valparaíso', 'Biobío', 'Antofagasta', 'O’Higgins', 'Maule', 'Los Lagos', 'Coquimbo'];
export const BODIES = { sedan: 'Sedán', hatch: 'Hatchback', suv: 'SUV', pickup: 'Camioneta', wagon: 'Station wagon', coupe: 'Coupé', van: 'Furgón' };
export const FUELS = ['Bencina', 'Diésel', 'Híbrido', 'Eléctrico'];
export const TRANS = ['Manual', 'Automática'];
export const PAINT = [['Blanco perla', '#eeeeea'], ['Gris plata', '#b8bdc3'], ['Negro', '#16171b'], ['Gris oscuro', '#4a4f57'], ['Rojo', '#b3221f'], ['Azul', '#24508f'], ['Celeste', '#5aa2d6'], ['Verde', '#3f6b4a'], ['Beige', '#cdbb98'], ['Naranjo', '#d9731f']];
export const EQUIP = ['Aire acondicionado', 'Climatizador bizona', 'Pantalla táctil', 'Apple CarPlay / Android Auto', 'Cámara de retroceso', 'Sensores de estacionamiento', 'Control crucero', 'Control crucero adaptativo', 'Llantas de aleación', 'Asientos de cuero', 'Techo solar', 'Botón de encendido', '6 airbags', 'Frenos ABS + ESP', 'Luces LED', 'Portalón eléctrico', 'Tracción 4x4', 'Carga rápida DC'];

export const CAR_STATES = {
  evaluacion: { label: 'En evaluación', badge: 'info' }, reacondicionamiento: { label: 'Reacondicionamiento', badge: 'warning' }, certificado: { label: 'Certificado', badge: 'primary' },
  publicado: { label: 'Publicado', badge: 'success' }, reservado: { label: 'Reservado', badge: 'warning' }, vendido: { label: 'Vendido', badge: 'danger' }
};
export const CAR_FLOW = ['evaluacion', 'reacondicionamiento', 'certificado', 'publicado', 'reservado', 'vendido'];
export const LEAD_TYPES = { reserva: { label: 'Reserva', icon: '💳' }, 'test-drive': { label: 'Test drive', icon: '🚗' }, visita: { label: 'Visita', icon: '🏢' }, tasacion: { label: 'Tasación', icon: '🏷️' }, financiamiento: { label: 'Financiamiento', icon: '🏦' }, contacto: { label: 'Consulta', icon: '💬' } };
export const LEAD_STATES = { nuevo: { label: 'Nuevo', badge: 'info' }, contactado: { label: 'Contactado', badge: 'primary' }, negociacion: { label: 'En negociación', badge: 'warning' }, ganado: { label: 'Ganado', badge: 'success' }, perdido: { label: 'Perdido', badge: 'danger' } };
export const VAL_STATES = { cotizada: { label: 'Cotizada', badge: 'info' }, agendada: { label: 'Inspección agendada', badge: 'primary' }, inspeccionada: { label: 'Inspeccionada', badge: 'warning' }, comprada: { label: 'Comprada', badge: 'success' }, rechazada: { label: 'Rechazada', badge: 'danger' } };
export const FIN_STATES = { pendiente: { label: 'En evaluación', badge: 'warning' }, aprobada: { label: 'Aprobada', badge: 'success' }, condicionada: { label: 'Aprobada con condiciones', badge: 'info' }, rechazada: { label: 'Rechazada', badge: 'danger' } };
export const RES_STATES = { activa: { label: 'Activa', badge: 'warning' }, convertida: { label: 'Convertida en venta', badge: 'success' }, expirada: { label: 'Expirada', badge: '' }, cancelada: { label: 'Cancelada', badge: 'danger' } };
export const SUB_STATES = { activa: { label: 'Activa', badge: 'success' }, pausada: { label: 'Pausada', badge: 'warning' }, cancelada: { label: 'Cancelada', badge: 'danger' } };
export const BOOK_STATES = { agendada: { label: 'Agendada', badge: 'info' }, confirmada: { label: 'Confirmada', badge: 'primary' }, 'en-proceso': { label: 'En proceso', badge: 'warning' }, completada: { label: 'Completada', badge: 'success' }, cancelada: { label: 'Cancelada', badge: 'danger' } };
export const ORDER_STATES = { pagado: { label: 'Pagado', badge: 'info' }, preparando: { label: 'Preparando', badge: 'warning' }, enviado: { label: 'Enviado', badge: 'primary' }, entregado: { label: 'Entregado', badge: 'success' }, cancelado: { label: 'Cancelado', badge: 'danger' } };
export const CONDITIONS = { excelente: ['Excelente', 1], bueno: ['Bueno', .93], regular: ['Regular', .82], malo: ['Con daños', .66] };
export const SLOTS = ['09:30', '11:00', '12:30', '15:00', '16:30', '18:00'];

// 150 puntos de inspección en 10 categorías de 15.
export const INSPECTION = [
  ['Motor', ['Arranque en frío', 'Ralentí estable', 'Ruidos anormales', 'Nivel y estado del aceite', 'Fugas de aceite', 'Correa de distribución / cadena', 'Correa de accesorios', 'Soportes de motor', 'Sistema de admisión', 'Filtro de aire', 'Bujías / inyectores', 'Turbo (si aplica)', 'Compresión', 'Humo de escape', 'Escáner de fallas del motor']],
  ['Transmisión y tracción', ['Cambios suaves', 'Embrague / convertidor', 'Ruidos de caja', 'Nivel de aceite de caja', 'Fugas de transmisión', 'Palanca y selector', 'Homocinéticas', 'Fuelles', 'Diferencial', 'Tracción 4x4 / AWD', 'Cardán', 'Soportes de caja', 'Marcha atrás', 'Modo deportivo / manual', 'Escáner de transmisión']],
  ['Frenos', ['Pastillas delanteras', 'Pastillas traseras', 'Discos delanteros', 'Discos traseros', 'Líquido de frenos', 'Freno de mano', 'ABS', 'Control de estabilidad', 'Mangueras de freno', 'Pinzas / calipers', 'Pedal de freno', 'Servofreno', 'Frenado en línea recta', 'Ruidos al frenar', 'Luces de freno']],
  ['Suspensión y dirección', ['Amortiguadores delanteros', 'Amortiguadores traseros', 'Espirales', 'Bujes', 'Rótulas', 'Terminales de dirección', 'Barra estabilizadora', 'Cremallera', 'Dirección asistida', 'Alineación', 'Holgura del volante', 'Ruidos en baches', 'Cazoletas', 'Brazos de control', 'Comportamiento en curva']],
  ['Neumáticos y llantas', ['Neumático delantero izq.', 'Neumático delantero der.', 'Neumático trasero izq.', 'Neumático trasero der.', 'Neumático de repuesto', 'Desgaste parejo', 'Fecha de fabricación', 'Presión', 'Llantas sin golpes', 'Pernos y seguro', 'Gata y llave', 'Balanceo', 'Válvulas', 'Misma marca y medida', 'Sensor TPMS']],
  ['Sistema eléctrico', ['Batería', 'Alternador / carga', 'Motor de arranque', 'Luces bajas', 'Luces altas', 'Intermitentes', 'Luces de retroceso', 'Tablero e indicadores', 'Bocina', 'Alzavidrios', 'Cierre centralizado', 'Espejos eléctricos', 'Limpiaparabrisas', 'Radio / pantalla', 'Fusibles y relés']],
  ['Carrocería y pintura', ['Capó', 'Techo', 'Maleta / portalón', 'Puerta delantera izq.', 'Puerta delantera der.', 'Puerta trasera izq.', 'Puerta trasera der.', 'Tapabarros', 'Parachoques delantero', 'Parachoques trasero', 'Espesor de pintura', 'Óxido / corrosión', 'Ajuste de paneles', 'Chasis sin choques estructurales', 'Número de chasis y motor']],
  ['Vidrios y visibilidad', ['Parabrisas', 'Luneta trasera', 'Vidrios laterales', 'Espejos laterales', 'Espejo interior', 'Plumillas', 'Ópticas delanteras', 'Focos traseros', 'Neblineros', 'Desempañador', 'Eyectores de agua', 'Láminas de seguridad', 'Grabado de patente', 'Sensores de lluvia/luz', 'Cámara de retroceso']],
  ['Interior y confort', ['Asiento conductor', 'Asientos pasajeros', 'Tapiz y alfombras', 'Cinturones de seguridad', 'Airbags (testigo)', 'Aire acondicionado', 'Calefacción', 'Ventilación', 'Volante y mandos', 'Techo interior', 'Olores / humedad', 'Guantera y consolas', 'Manual y llaves', 'Kilometraje coherente', 'Conectividad / USB']],
  ['Prueba en ruta y documentación', ['Aceleración', 'Velocidad crucero', 'Vibraciones', 'Temperatura de motor', 'Consumo estimado', 'Ruido de rodadura', 'Ruido aerodinámico', 'Asistentes de manejo', 'Padrón y CAV', 'Permiso de circulación', 'Revisión técnica', 'SOAP vigente', 'Sin multas impagas', 'Sin prendas ni prohibiciones', 'Historial de mantenciones']]
];
export const POINTS = INSPECTION.flatMap(([cat, items]) => items.map(name => ({ cat, name })));
export const RESULT = { p: { label: 'Aprobado', badge: 'success', icon: '✓' }, o: { label: 'Observación', badge: 'warning', icon: '!' }, f: { label: 'Falla', badge: 'danger', icon: '✕' }, '-': { label: 'Pendiente', badge: '', icon: '·' } };
export const COLORS = ['#1abc9c', '#2980b9', '#8e44ad', '#e67e22', '#c0392b', '#16a085', '#2c3e50', '#d35400'];
