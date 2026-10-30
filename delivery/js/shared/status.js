// Estados de envío, etiquetas y badges.
import { html, raw } from '../../../assets/core/ui.js';

export const STATUS = {
  pendiente: { label: 'Pendiente', badge: 'warning', desc: 'Esperando repartidor' },
  asignado: { label: 'Asignado', badge: 'info', desc: 'Repartidor va al retiro' },
  retirado: { label: 'Retirado', badge: 'info', desc: 'Paquete retirado en origen' },
  en_camino: { label: 'En camino', badge: 'primary', desc: 'Rumbo al destino' },
  entregado: { label: 'Entregado', badge: 'success', desc: 'Entregado con firma' },
  fallido: { label: 'No entregado', badge: 'danger', desc: 'Intento fallido' },
  cancelado: { label: 'Cancelado', badge: '', desc: 'Envío cancelado' }
};
export const ACTIVE = ['pendiente', 'asignado', 'retirado', 'en_camino'];
export const isActive = s => ACTIVE.includes(s.status);
export const statusLabel = k => STATUS[k]?.label || k;
export function statusBadge(k, late = false) {
  const s = STATUS[k] || { label: k, badge: '' };
  return html`<span class="badge ${s.badge ? 'badge-' + s.badge : ''}">${s.label}</span>${late ? raw(' <span class="badge badge-danger">Atrasado</span>') : ''}`;
}
export const SERVICE_LABEL = { estandar: 'Estándar', express: 'Express', programado: 'Programado' };

export const INCIDENT_STATUS = {
  abierto: { label: 'Abierto', badge: 'warning' },
  en_revision: { label: 'En revisión', badge: 'info' },
  resuelto: { label: 'Resuelto', badge: 'success' },
  rechazado: { label: 'Rechazado', badge: 'danger' }
};
export const INCIDENT_TYPES = { retraso: 'Retraso', dano: 'Paquete dañado', extravio: 'Extravío', cobro: 'Cobro incorrecto', conducta: 'Conducta del repartidor', otro: 'Otro' };
export const PRIORITY = { baja: 'Baja', media: 'Media', alta: 'Alta' };

export const INVOICE_STATUS = {
  pagada: { label: 'Pagada', badge: 'success' },
  pendiente: { label: 'Pendiente', badge: 'warning' },
  vencida: { label: 'Vencida', badge: 'danger' },
  abierta: { label: 'En curso', badge: 'info' }
};
export const VEHICLES = { moto: 'Moto', bici: 'Bicicleta eléctrica', auto: 'Auto', furgon: 'Furgón' };
export const VEHICLE_ICON = { moto: '🛵', bici: '🚲', auto: '🚗', furgon: '🚐' };
export const DOC_STATUS = { aprobado: { label: 'Aprobado', badge: 'success' }, pendiente: { label: 'En revisión', badge: 'warning' }, vencido: { label: 'Vencido', badge: 'danger' }, rechazado: { label: 'Rechazado', badge: 'danger' } };
export const badgeOf = (map, k) => html`<span class="badge ${map[k]?.badge ? 'badge-' + map[k].badge : ''}">${map[k]?.label || k}</span>`;
