// Constantes y cálculos del dominio de condominios (gastos comunes, mora, estados).
import { escape, money } from '../../../assets/core/ui.js';

export const CATEGORIES = ['Remuneraciones', 'Leyes sociales', 'Electricidad áreas comunes', 'Agua áreas comunes', 'Ascensores', 'Aseo y jardines', 'Seguridad y CCTV', 'Piscina', 'Administración', 'Seguros', 'Reparaciones', 'Gastos bancarios'];
export const TSTATUS = { abierto: ['Abierto', 'danger'], asignado: ['Asignado', 'info'], progreso: ['En progreso', 'warning'], resuelto: ['Resuelto', 'success'], cerrado: ['Cerrado', ''] };
export const TFLOW = ['abierto', 'asignado', 'progreso', 'resuelto', 'cerrado'];
export const TCATS = ['Gasfitería', 'Electricidad', 'Ascensores', 'Áreas verdes', 'Aseo', 'Seguridad', 'Piscina', 'Ruidos / convivencia', 'Estacionamientos', 'Otro'];
export const PRIORITY = { baja: ['Baja', ''], media: ['Media', 'info'], alta: ['Alta', 'warning'], urgente: ['Urgente', 'danger'] };
export const VISTATUS = { esperada: ['Esperada', 'info'], dentro: ['Dentro', 'success'], salio: ['Salió', ''], expirada: ['Expirada', 'warning'], cancelada: ['Cancelada', 'danger'] };
export const PARSTATUS = { conserjeria: ['En conserjería', 'warning'], entregada: ['Entregada', 'success'] };
export const PERSTATUS = { borrador: ['Borrador', 'warning'], publicado: ['Publicado', 'success'] };
export const POLLSTATUS = { borrador: ['Borrador', ''], abierta: ['Abierta', 'success'], cerrada: ['Cerrada', 'info'] };

export function badge(map, key) {
  const [label, tone] = map[key] || [key, ''];
  return `<span class="badge ${tone ? 'badge-' + tone : ''}">${escape(label)}</span>`;
}
export const periodLabel = p => { const s = new Date(p + '-15').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
export const periodShort = p => new Date(p + '-15').toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
export const curPeriod = () => new Date().toISOString().slice(0, 7);
export const addMonths = (p, n) => { const d = new Date(p + '-15'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
// Vencimiento: día X del mes siguiente al período.
export const dueDate = (p, day = 10) => { const d = new Date(addMonths(p, 1) + '-01T12:00'); d.setDate(day); return d; };

// Intereses por mora: % mensual simple por cada mes (o fracción) vencido.
export function interest(charge, settings) {
  if (charge.paid) return 0;
  const due = dueDate(charge.period, settings.dueDay || 10);
  const days = (Date.now() - due) / 864e5;
  if (days <= 0) return 0;
  return Math.round(charge.total * ((settings.interestPct || 1.5) / 100) * Math.ceil(days / 30));
}
export const owed = (charge, s) => (charge.paid ? 0 : charge.total + interest(charge, s));
export const isOverdue = (charge, s) => !charge.paid && Date.now() > dueDate(charge.period, s.dueDay || 10);
export const unitLabel = u => (u ? `Torre ${u.tower} · Depto ${u.number}` : '—');
export const pctFmt = n => `${(n || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
export { money };
