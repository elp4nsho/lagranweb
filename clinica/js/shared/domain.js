// Reglas de negocio del centro médico (disponibilidad, precios, reservas, recordatorios).
import { db, auth } from '../data/db.js';
import { PREVISIONES, PREV_TYPES, STATUS, ACTIVE_STATUS } from '../data/catalog.js';
import { templateSlots } from './slots.js';
import { ymd, addDays, dow, toMin, nowHM, fmtDay } from './dates.js';
import { sameRut, fmtRut } from './rut.js';
import { money, escape } from '../../../assets/core/ui.js';

export const settings = () => db.getValue('settings', {});
export const specialty = id => db.get('specialties', id);
export const doctor = id => db.get('doctors', id);
export const patient = id => db.get('patients', id);
export const box = id => db.get('boxes', id);
export const prevision = id => PREVISIONES.find(p => p.id === id) || PREVISIONES.at(-1);
export const prevType = id => prevision(id).type;
export const prevTypeLabel = id => PREV_TYPES[prevType(id)];
export const activeSpecialties = () => db.query('specialties', s => s.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
export const activeDoctors = (sid) => db.query('doctors', d => d.active !== false && (!sid || d.specialtyId === sid));
export const shortName = name => String(name || '').replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '').split(' ').slice(0, 2).join(' ');
export const firstName = name => String(name || '').replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '').split(' ')[0];
// "C. Fuentes" para la pantalla pública (privacidad)
export const screenName = name => { const p = String(name).split(' '); return `${p[0]} ${p[1] ? p[1][0] + '.' : ''}`; };

export function statusBadge(st) {
  const s = STATUS[st] || { label: st, badge: '' };
  return `<span class="badge ${s.badge ? 'badge-' + s.badge : ''}">${escape(s.label)}</span>`;
}
export const isActive = a => ACTIVE_STATUS.includes(a.status);

// Precio a pagar por el paciente según especialidad y previsión
export function priceFor(specialtyId, previsionId) {
  const s = specialty(specialtyId);
  if (!s) return 0;
  return s.prices[prevType(previsionId)] ?? s.prices.particular;
}

export function blocksFor(doctorId, date) { return db.query('blocks', b => b.doctorId === doctorId && b.date === date); }
export function isBlocked(doctorId, date, time) {
  const m = toMin(time);
  return blocksFor(doctorId, date).some(b => m >= toMin(b.start) && m < toMin(b.end));
}
export function taken(doctorId, date) {
  return new Set(db.query('appointments', a => a.doctorId === doctorId && a.date === date && a.status !== 'cancelada').map(a => a.time));
}
// Horas libres de un médico en un día (plantilla − bloqueos − reservadas − pasadas)
export function freeSlots(doc, date) {
  if (!doc || doc.active === false || !doc.schedule.days.includes(dow(date))) return [];
  const t = taken(doc.id, date), today = ymd(), lead = toMin(nowHM()) + 30;
  return templateSlots(doc.schedule).filter(s => !t.has(s) && !isBlocked(doc.id, date, s) && (date > today || (date === today && toMin(s) >= lead)));
}
// Primeros días con disponibilidad
export function nextAvailable(doc, days = 21) {
  const today = ymd();
  for (let i = 0; i <= days; i++) { const d = addDays(today, i); const f = freeSlots(doc, d); if (f.length) return { date: d, time: f[0], count: f.length }; }
  return null;
}

const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() {
  let c;
  do c = 'AL-' + Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
  while (db.find('appointments', a => a.code === c));
  return c;
}

export function findPatientByRut(rut) { return db.find('patients', p => sameRut(p.rut, rut)); }

// Crea (o reutiliza) el paciente y la cita. Devuelve la cita.
export function book({ doctorId, date, time, mode = 'presencial', reason = '', patientData, patientId, by = 'web' }) {
  const doc = doctor(doctorId);
  if (!freeSlots(doc, date).includes(time) && by === 'web') throw new Error('Esa hora acaba de ser tomada. Elige otra, por favor.');
  if (taken(doctorId, date).has(time)) throw new Error('La hora ya está ocupada.');
  let p = patientId ? patient(patientId) : findPatientByRut(patientData.rut);
  if (!p) {
    p = db.insert('patients', { ...patientData, rut: fmtRut(patientData.rut) });
    db.log('paciente', `Nuevo paciente: ${p.name}`, auth.current()?.id);
  } else if (patientData) {
    db.update('patients', p.id, { phone: patientData.phone || p.phone, email: patientData.email || p.email, prevision: patientData.prevision || p.prevision });
  }
  const a = db.insert('appointments', {
    code: newCode(), patientId: p.id, doctorId, specialtyId: doc.specialtyId, date, time, mode,
    status: 'reservada', prevision: p.prevision, price: priceFor(doc.specialtyId, p.prevision), paid: false, reason, channel: by
  });
  db.log('reserva', `${a.code} · ${p.name} con ${doc.name} el ${date} ${time} (${by})`, auth.current()?.id);
  notify(a, 'email', 'confirmacion');
  return a;
}

export function fill(tpl, a) {
  const p = patient(a.patientId), d = doctor(a.doctorId);
  return String(tpl).replace('{paciente}', firstName(p?.name)).replace('{medico}', d?.name || '').replace('{fecha}', fmtDay(a.date)).replace('{hora}', a.time).replace('{codigo}', a.code);
}
// Registra un SMS / email simulado
export function notify(a, channel = 'sms', kind = 'recordatorio', status = 'enviado') {
  const p = patient(a.patientId);
  const msg = kind === 'confirmacion' ? fill('Hola {paciente}, tu hora con {medico} quedó reservada para el {fecha} a las {hora}. Código {codigo}.', a)
    : kind === 'cancelacion' ? fill('Hola {paciente}, tu hora del {fecha} a las {hora} con {medico} fue cancelada. Código {codigo}.', a)
    : fill(settings().reminderTemplate, a);
  return db.insert('reminders', { appointmentId: a.id, patientId: p?.id, channel, to: channel === 'sms' ? p?.phone : p?.email, kind, status, sentAt: new Date().toISOString(), message: msg });
}

export function setStatus(a, status, extra = {}) {
  const patch = { status, ...extra };
  if (status === 'en_espera' && !a.checkinAt) patch.checkinAt = new Date().toISOString();
  if (status === 'llamado' || status === 'en_atencion') { patch.calledAt = patch.calledAt || new Date().toISOString(); patch.boxId = patch.boxId || a.boxId || doctor(a.doctorId)?.boxId; }
  const row = db.update('appointments', a.id, patch);
  db.log('cita', `${a.code} → ${STATUS[status]?.label || status}`, auth.current()?.id);
  if (status === 'cancelada') notify(row, 'email', 'cancelacion');
  return row;
}

export const apptTitle = a => `${doctor(a.doctorId)?.name || '—'} · ${specialty(a.specialtyId)?.name || ''}`;
export const priceLabel = a => `${money(a.price)} <small class="muted">(${prevTypeLabel(a.prevision)})</small>`;
export const ageOf = birth => { if (!birth) return ''; const b = new Date(birth), n = new Date(); let y = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--; return y; };
