// Catálogos fijos del CRM: etapas del pipeline, tipos de actividad, fuentes de leads, etc.

export const STAGES = [
  { id: 'prospeccion', name: 'Prospección', prob: 10, badge: 'info' },
  { id: 'calificado', name: 'Calificado', prob: 25, badge: 'primary' },
  { id: 'propuesta', name: 'Propuesta', prob: 50, badge: 'warning' },
  { id: 'negociacion', name: 'Negociación', prob: 75, badge: 'warning' },
  { id: 'ganado', name: 'Ganado', prob: 100, badge: 'success' },
  { id: 'perdido', name: 'Perdido', prob: 0, badge: 'danger' }
];
export const OPEN_STAGES = ['prospeccion', 'calificado', 'propuesta', 'negociacion'];
export const stage = id => STAGES.find(s => s.id === id) || STAGES[0];
export const stageName = id => stage(id).name;

export const ACT_TYPES = {
  llamada: { name: 'Llamada', ico: 'phone' },
  reunion: { name: 'Reunión', ico: 'users' },
  email: { name: 'Correo', ico: 'mail' },
  nota: { name: 'Nota', ico: 'note' },
  tarea: { name: 'Tarea', ico: 'check' },
  sistema: { name: 'Sistema', ico: 'bolt' }
};

export const LEAD_SOURCES = ['Demo web', 'Formulario web', 'Referido', 'LinkedIn', 'Evento', 'Llamada en frío', 'Partner'];
export const LEAD_STATUS = [
  { id: 'nuevo', name: 'Nuevo', badge: 'info' },
  { id: 'contactado', name: 'Contactado', badge: 'primary' },
  { id: 'calificado', name: 'Calificado', badge: 'success' },
  { id: 'descartado', name: 'Descartado', badge: 'danger' },
  { id: 'convertido', name: 'Convertido', badge: 'success' }
];
export const leadStatus = id => LEAD_STATUS.find(s => s.id === id) || LEAD_STATUS[0];

export const INDUSTRIES = ['Construcción', 'Agroindustria', 'Logística', 'Salud', 'Retail', 'Minería', 'Servicios financieros', 'Educación', 'Turismo', 'Manufactura', 'Tecnología', 'Alimentos', 'Energía', 'Servicios profesionales'];
export const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
export const CITIES = ['Santiago', 'Valparaíso', 'Viña del Mar', 'Concepción', 'Temuco', 'Puerto Montt', 'Antofagasta', 'La Serena', 'Talca', 'Rancagua', 'Punta Arenas'];
export const LOST_REASONS = ['Precio', 'Eligió a la competencia', 'Sin presupuesto', 'Proyecto postergado', 'Sin respuesta', 'Funcionalidad faltante'];

export const TRIGGERS = {
  'lead.created': 'Se crea un lead',
  'deal.stage': 'Un negocio cambia de etapa',
  'deal.won': 'Se gana un negocio',
  'deal.lost': 'Se pierde un negocio',
  'task.overdue': 'Una tarea queda vencida'
};
export const ACTIONS = {
  assign: 'Asignar ejecutivo (round-robin)',
  task: 'Crear tarea de seguimiento',
  email: 'Enviar correo con plantilla',
  notify: 'Notificar al gerente',
  score: 'Sumar puntos al lead'
};
export const IVA = 0.19;
