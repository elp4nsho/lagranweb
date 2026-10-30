// Catálogos fijos de Atelier Torque: estados, líneas de servicio, plantilla de inspección y mapa.
export const LINES = {
  mantencion: { label: 'Mantención de marca', short: 'Mantención', icon: '🔧', color: 'var(--primary)' },
  performance: { label: 'Performance y dyno', short: 'Performance', icon: '🏁', color: 'var(--accent)' },
  estetica: { label: 'Estética y protección', short: 'Estética', icon: '✨', color: 'var(--info)' },
  ev: { label: 'Eléctricos e híbridos', short: 'EV', icon: '⚡', color: 'var(--success)' },
  diagnostico: { label: 'Diagnóstico y reparación', short: 'Diagnóstico', icon: '🩺', color: 'var(--warning)' }
};
export const WO_STATES = {
  agendada: { label: 'Agendada', badge: 'info', step: 0 },
  recepcion: { label: 'Recepción', badge: 'info', step: 1 },
  inspeccion: { label: 'En inspección', badge: 'warning', step: 2 },
  aprobacion: { label: 'Esperando aprobación', badge: 'warning', step: 3 },
  'en-proceso': { label: 'En proceso', badge: 'primary', step: 4 },
  control: { label: 'Control de calidad', badge: 'primary', step: 5 },
  lista: { label: 'Lista para entrega', badge: 'success', step: 6 },
  entregada: { label: 'Entregada', badge: 'success', step: 7 },
  cancelada: { label: 'Cancelada', badge: 'danger', step: -1 }
};
export const WO_FLOW = ['agendada', 'recepcion', 'inspeccion', 'aprobacion', 'en-proceso', 'control', 'lista', 'entregada'];
export const CONC_STATES = {
  programado: { label: 'Programado', badge: 'info', icon: '🗓️' },
  'en-camino': { label: 'Chofer en camino', badge: 'warning', icon: '🚘' },
  retirado: { label: 'Vehículo retirado', badge: 'primary', icon: '🔑' },
  'en-taller': { label: 'En taller', badge: 'primary', icon: '🛠️' },
  listo: { label: 'Listo para entrega', badge: 'success', icon: '✅' },
  'en-entrega': { label: 'En ruta de entrega', badge: 'warning', icon: '🚘' },
  entregado: { label: 'Entregado', badge: 'success', icon: '🏁' },
  cancelado: { label: 'Cancelado', badge: 'danger', icon: '✕' }
};
export const CONC_FLOW = ['programado', 'en-camino', 'retirado', 'en-taller', 'listo', 'en-entrega', 'entregado'];
export const TRACK_STEPS = [['en-camino', 'Chofer en camino'], ['retirado', 'Retirado'], ['en-taller', 'En taller'], ['listo', 'Listo'], ['entregado', 'Entregado']];
export const LIGHT = { ok: { label: 'Bien', badge: 'success', icon: '●' }, atencion: { label: 'Atención pronto', badge: 'warning', icon: '●' }, urgente: { label: 'Requiere acción', badge: 'danger', icon: '●' } };
export const PART_ORDER_STATES = { solicitado: { label: 'Solicitado', badge: 'info' }, transito: { label: 'En tránsito', badge: 'warning' }, aduana: { label: 'En aduana', badge: 'warning' }, recibido: { label: 'Recibido', badge: 'success' }, instalado: { label: 'Instalado', badge: 'primary' }, cancelado: { label: 'Cancelado', badge: 'danger' } };
export const FLEET_STATES = { disponible: { label: 'Disponible', badge: 'success' }, 'en-uso': { label: 'En uso', badge: 'warning' }, mantencion: { label: 'En mantención', badge: 'danger' } };
export const FUEL = { bencina: 'Bencina', 'electrico': 'Eléctrico', hibrido: 'Híbrido enchufable', diesel: 'Diésel' };
export const DOC_TYPES = ['Permiso de circulación', 'SOAP', 'Revisión técnica', 'Póliza de seguro', 'Padrón', 'Garantía de fábrica'];

// Plantilla de inspección multipunto (las 4 últimas solo aplican a eléctricos; tren motriz solo a combustión).
export const INSPECTION = [
  ['Neumáticos y frenos', ['Neumático delantero izq.', 'Neumático delantero der.', 'Neumático trasero izq.', 'Neumático trasero der.', 'Pastillas delanteras', 'Pastillas traseras', 'Discos de freno', 'Líquido de frenos']],
  ['Fluidos y filtros', ['Aceite y nivel', 'Refrigerante', 'Filtro de aire', 'Filtro de cabina (polen)', 'Líquido limpiaparabrisas']],
  ['Suspensión y dirección', ['Amortiguadores', 'Bujes y rótulas', 'Terminales de dirección', 'Alineación']],
  ['Sistema eléctrico', ['Batería 12 V', 'Luces exteriores', 'Escáner de fallas (OBD)', 'Software y actualizaciones']],
  ['Carrocería e interior', ['Pintura y carrocería', 'Parabrisas', 'Plumillas', 'Climatización']],
  ['Tren motriz', ['Correas y poleas', 'Fugas de aceite', 'Escape', 'Transmisión y embrague'], 'ice'],
  ['Alta tensión (EV)', ['Batería HV · estado de salud', 'Refrigeración de batería', 'Puerto y cable de carga', 'Aislamiento HV'], 'ev']
];
export const inspectionTemplate = isEv => INSPECTION.filter(([, , only]) => !only || (only === 'ev') === isEv).flatMap(([cat, items]) => items.map(name => ({ cat, name })));
export const REC_LIBRARY = {
  'Pastillas delanteras': ['Cambio de pastillas delanteras OEM', 420000], 'Pastillas traseras': ['Cambio de pastillas traseras OEM', 360000], 'Discos de freno': ['Rectificado / cambio de discos', 980000],
  'Líquido de frenos': ['Cambio de líquido de frenos DOT 4', 95000], 'Filtro de cabina (polen)': ['Filtro de cabina con carbón activado', 68000], 'Filtro de aire': ['Filtro de aire de motor', 89000],
  'Amortiguadores': ['Reemplazo de amortiguadores (par)', 1350000], 'Alineación': ['Alineación 3D y balanceo', 85000], 'Batería 12 V': ['Batería 12 V AGM', 290000],
  'Plumillas': ['Juego de plumillas', 54000], 'Climatización': ['Recarga A/C y sanitización', 120000], 'Neumático delantero izq.': ['Neumáticos delanteros (par)', 980000],
  'Neumático trasero der.': ['Neumáticos traseros (par)', 1080000], 'Refrigeración de batería': ['Servicio de refrigerante de batería', 260000], 'Bujes y rótulas': ['Cambio de bujes de suspensión', 540000],
  'Software y actualizaciones': ['Actualización de software de fábrica', 75000], 'Correas y poleas': ['Cambio de correa de accesorios', 210000], 'Fugas de aceite': ['Sello de cárter y limpieza', 320000]
};
// Mapa simplificado de Santiago oriente (coordenadas SVG 600×320).
export const COMUNAS = {
  'Vitacura': [318, 118], 'Las Condes': [392, 160], 'Lo Barnechea': [462, 82], 'Providencia': [252, 168], 'Ñuñoa': [262, 236], 'La Reina': [388, 232],
  'Santiago': [160, 186], 'Colina (Chicureo)': [286, 38], 'Huechuraba': [206, 86], 'Peñalolén': [446, 276]
};
export const WORKSHOP_XY = [300, 146];
export const WINDOWS = ['08:00–10:00', '10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00'];
export const COLORS = ['#c08a2d', '#2f6f73', '#7a4f9a', '#a8432f', '#3d6bb3', '#5b8c51', '#8a6247', '#c06c84', '#4a5568', '#0f766e'];
export const PAINT = [['Negro Jet', '#121317'], ['Blanco Carrara', '#e9e9e4'], ['Gris Nardo', '#8a8f93'], ['Azul Gentian', '#1f3d7a'], ['Rojo Guards', '#b3191f'], ['Plata GT', '#b9bec4'], ['Verde Python', '#3f6b3a'], ['Gris Ártico', '#c9ccd0'], ['Azul Yas', '#2b74b8'], ['Amarillo Racing', '#e2b100'], ['Grafito', '#3b3f45'], ['Burdeos', '#5a1a25']];
