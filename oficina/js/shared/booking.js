// Reglas de reserva de puestos flexibles (compartido por la app de empleado y el panel).
import { today, addDays, isWeekend, startOfWeek, daysBetween, fmtDay } from './dates.js';

export const DEFAULT_RULES = { maxDaysAhead: 14, maxPerWeek: 4, checkinDeadline: '10:30', restrictNeighborhoods: false, allowWeekends: false, autoRelease: true };
export const rulesFor = (db, coId) => ({ ...DEFAULT_RULES, ...(db.getValue('rules', {})[coId] || {}) });

// Puestos reservables para una persona en una fecha (flexibles, libres y según barrio).
export function canBookDesk(idx, rules, person, d, zone) {
  if (d.type !== 'flexible') return false;
  if (idx.owner[d.id]) return false;
  if (rules.restrictNeighborhoods && zone?.areaId && zone.areaId !== person.areaId) return false;
  return true;
}

// Valida una reserva nueva. Devuelve mensaje de error o null.
export function validateBooking(db, idx, rules, person, deskId, date) {
  const T = today();
  if (date < T) return 'No puedes reservar en una fecha pasada';
  if (daysBetween(T, date) > rules.maxDaysAhead) return `Solo se puede reservar con hasta ${rules.maxDaysAhead} días de anticipación`;
  if (!rules.allowWeekends && isWeekend(date)) return 'Las reservas de fin de semana están deshabilitadas';
  const info = idx.desk[deskId];
  if (!info) return 'Puesto no encontrado';
  if (!canBookDesk(idx, rules, person, info.desk, info.zone)) return info.zone?.areaId && rules.restrictNeighborhoods && info.zone.areaId !== person.areaId ? `Ese puesto pertenece al barrio de ${idx.areaById[info.zone.areaId]?.name}` : 'Ese puesto no es reservable';
  const active = r => r.status !== 'cancelada' && r.status !== 'liberada';
  if (db.find('reservations', r => r.deskId === deskId && r.date === date && active(r))) return 'Ese puesto ya está reservado ese día';
  if (db.find('reservations', r => r.personId === person.id && r.date === date && active(r))) return `Ya tienes una reserva el ${fmtDay(date)}`;
  const w0 = startOfWeek(date), w1 = addDays(w0, 6);
  const n = db.count('reservations', r => r.personId === person.id && r.date >= w0 && r.date <= w1 && active(r));
  if (n >= rules.maxPerWeek) return `Alcanzaste el máximo de ${rules.maxPerWeek} reservas por semana`;
  return null;
}
