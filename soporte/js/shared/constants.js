// Catálogos fijos de Atiende (mesa de ayuda de Fibra Austral).
export const STATUSES = [
  { id: 'nuevo', name: 'Nuevo', badge: 'info', open: true },
  { id: 'abierto', name: 'Abierto', badge: 'primary', open: true },
  { id: 'pendiente', name: 'Pendiente del cliente', badge: 'warning', open: true },
  { id: 'espera', name: 'En espera', badge: 'warning', open: true },
  { id: 'resuelto', name: 'Resuelto', badge: 'success', open: false },
  { id: 'cerrado', name: 'Cerrado', badge: 'plain', open: false }
];
export const status = id => STATUSES.find(s => s.id === id) || STATUSES[0];
export const OPEN = STATUSES.filter(s => s.open).map(s => s.id);
export const isOpen = t => OPEN.includes(t.status);
// Estado tal como lo ve el cliente en el portal.
export const customerStatus = id => ({ nuevo: 'Recibido', abierto: 'En revisión', pendiente: 'Esperando tu respuesta', espera: 'En revisión', resuelto: 'Resuelto', cerrado: 'Cerrado' }[id] || id);

export const PRIORITIES = [
  { id: 'baja', name: 'Baja', badge: 'plain', w: 1 },
  { id: 'normal', name: 'Normal', badge: 'info', w: 2 },
  { id: 'alta', name: 'Alta', badge: 'warning', w: 3 },
  { id: 'urgente', name: 'Urgente', badge: 'danger', w: 4 }
];
export const priority = id => PRIORITIES.find(p => p.id === id) || PRIORITIES[1];
export const CHANNELS = { web: 'Formulario web', portal: 'Portal de clientes', email: 'Correo', chat: 'Chat', telefono: 'Teléfono' };
export const IMPACTS = { menor: { name: 'Degradado', badge: 'warning', w: 1 }, mayor: { name: 'Interrupción parcial', badge: 'warning', w: 2 }, critico: { name: 'Caída total', badge: 'danger', w: 3 } };
export const INC_STATUS = { investigando: 'Investigando', identificado: 'Identificado', monitoreando: 'Monitoreando', resuelto: 'Resuelto' };
export const PLANS = ['Fibra 300 Mbps', 'Fibra 600 Mbps', 'Fibra 940 Mbps', 'Fibra 600 + TV', 'Fibra Empresa 1 Gbps'];
export const COMMUNES = ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Valdivia', 'Frutillar', 'Castro', 'Ancud', 'Llanquihue', 'Temuco', 'Purranque'];
export const TRIGGER_FIELDS = { subject: 'Asunto contiene', category: 'Categoría es', channel: 'Canal es', priority: 'Prioridad es', plan: 'Plan del cliente es' };
export const TRIGGER_ACTIONS = { priority: 'Cambiar prioridad a', group: 'Asignar al grupo', tag: 'Agregar etiqueta', notify: 'Notificar a supervisores', reply: 'Enviar respuesta automática' };
