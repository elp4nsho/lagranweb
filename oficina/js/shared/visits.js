// Lógica de visitas compartida: registro, check-in/out, aviso al anfitrión y credencial.
import { toast } from '../../../assets/core/ui.js';
import { today, hm } from './dates.js';
import { showBadge } from './badge.js';

export const VISIT_REASONS = ['Reunión', 'Entrevista', 'Entrega / courier', 'Proveedor técnico', 'Otro'];
export const VISIT_BADGE = { esperada: 'badge-info', 'en sitio': 'badge-success', 'salió': '' };
export const VISIT_LABEL = { esperada: 'Esperada', 'en sitio': 'En el edificio', 'salió': 'Salió' };

export function hostWhere(idx, host) {
  if (!host) return 'Recepción';
  const sid = idx.seatOf(host);
  return sid ? `${idx.desk[sid].floor.name} · ${idx.desk[sid].desk.code}` : 'Recepción (anfitrión remoto)';
}
function nextCode(db, coId) {
  const T = today(), n = db.count('visitors', v => v.companyId === coId && v.date === T) + 1;
  return `V-${T.slice(5).replace('-', '')}-${String(n).padStart(3, '0')}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
}
export function notifyHost(db, idx, v) {
  const host = idx.byId[v.hostId];
  if (!host) return;
  db.insert('notifications', { personId: host.id, text: `${v.name}${v.org ? ` (${v.org})` : ''} llegó a recepción y te espera.`, at: new Date().toISOString(), read: false, kind: 'visita' });
  toast(`Avisamos a ${host.name} por la app, correo y SMS (simulado).`, 'success', 4200);
}
// Registra una visita (check-in inmediato salvo preRegistro).
export function registerVisit(db, idx, data, user, { pre = false } = {}) {
  const v = db.insert('visitors', {
    companyId: idx.company.id, name: data.name, doc: data.doc || '', org: data.org || '', hostId: data.hostId, reason: data.reason || 'Reunión', email: data.email || '',
    date: data.date || today(), expectedAt: data.expectedAt || hm(), checkIn: pre ? null : new Date().toISOString(), checkOut: null,
    status: pre ? 'esperada' : 'en sitio', code: nextCode(db, idx.company.id), notified: !pre, preRegistered: pre, by: user?.id || null
  });
  db.log('visita', pre ? `Pre-registró la visita de ${v.name} (${v.date} ${v.expectedAt})` : `Registró la llegada de ${v.name} para ${idx.byId[v.hostId]?.name || '—'}`, user?.id);
  if (!pre) notifyHost(db, idx, v);
  return v;
}
export function checkInVisit(db, idx, v, user) {
  const row = db.update('visitors', v.id, { status: 'en sitio', checkIn: new Date().toISOString(), notified: true });
  db.log('visita', `Check-in de ${v.name}`, user?.id);
  notifyHost(db, idx, row);
  return row;
}
export function checkOutVisit(db, v, user) {
  db.update('visitors', v.id, { status: 'salió', checkOut: new Date().toISOString() });
  db.log('visita', `Salida de ${v.name}`, user?.id);
  toast(`Salida registrada: ${v.name}`, 'success');
}
export const badgeFor = (db, idx, v) => showBadge(v, { company: idx.company, host: idx.byId[v.hostId], where: hostWhere(idx, idx.byId[v.hostId]), wifi: db.getValue('site', {}).wifi });
