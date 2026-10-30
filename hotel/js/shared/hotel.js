// Reglas de negocio del hotel: tarifas, disponibilidad, reservas, folio y políticas.
import { db } from '../data/db.js';
import { quoteCore, rateFor, seasonFor } from '../data/pricing-core.js';
import { today, addDays, diffDays, eachNight, overlaps } from './dates.js';

export const settings = () => db.getValue('settings', {});
export const saveSettings = patch => db.setValue('settings', { ...settings(), ...patch });

export const RES_STATES = {
  confirmada: { label: 'Confirmada', badge: 'info' },
  'check-in': { label: 'En casa', badge: 'success' },
  'check-out': { label: 'Check-out', badge: 'primary' },
  cancelada: { label: 'Cancelada', badge: 'danger' },
  'no-show': { label: 'No-show', badge: 'warning' }
};
export const HK_STATES = {
  sucia: { label: 'Sucia', badge: 'danger', icon: '🧺' },
  limpia: { label: 'Limpia', badge: 'info', icon: '🧽' },
  inspeccionada: { label: 'Inspeccionada', badge: 'success', icon: '✅' },
  fuera: { label: 'Fuera de servicio', badge: 'warning', icon: '🚧' }
};
export const ACTIVE = ['confirmada', 'check-in'];

export const typeById = id => db.get('roomTypes', id);
export const roomById = id => db.get('rooms', id);
export const guestById = id => db.get('guests', id);
export const channelName = id => db.get('channels', id)?.name || id;

export const nightlyRate = (typeId, day) => rateFor(typeById(typeId), day, db.all('seasons'), settings());
export const currentSeason = (day = today()) => seasonFor(day, db.all('seasons'));
export const minRate = (typeId, from = today(), days = 30) => Math.min(...Array.from({ length: days }, (_, i) => nightlyRate(typeId, addDays(from, i)).rate));

export function findOffer(code) {
  if (!code) return null;
  return db.find('offers', o => o.active && o.code.toUpperCase() === String(code).trim().toUpperCase());
}

export function quote(typeId, checkIn, checkOut, opts = {}) {
  return quoteCore(typeById(typeId), checkIn, checkOut, { seasons: db.all('seasons'), settings: settings(), extrasCatalog: db.all('extras'), ...opts, offer: opts.offer || findOffer(opts.promo) });
}

// Habitaciones libres de un tipo en un rango (excluye fuera de servicio y una reserva opcional)
export function freeRooms(typeId, a, b, excludeId = null) {
  const busy = new Set(db.query('reservations', x => x.id !== excludeId && ACTIVE.includes(x.status) && x.roomId && overlaps(a, b, x.checkIn, x.checkOut)).map(x => x.roomId));
  return db.query('rooms', r => (!typeId || r.typeId === typeId) && r.hk !== 'fuera' && !busy.has(r.id)).sort((x, y) => x.number.localeCompare(y.number));
}
// Disponibilidad por tipo considerando también reservas sin habitación asignada
export function availability(typeId, a, b, excludeId = null) {
  const unassigned = db.count('reservations', x => x.id !== excludeId && ACTIVE.includes(x.status) && !x.roomId && x.roomTypeId === typeId && overlaps(a, b, x.checkIn, x.checkOut));
  return Math.max(0, freeRooms(typeId, a, b, excludeId).length - unassigned);
}

export function nextCode() {
  const n = (db.getValue('seq', 5000) || 5000) + 1;
  db.setValue('seq', n);
  return 'BL-' + n;
}

export function upsertGuest({ name, email, phone = '', country = 'Chile', doc = '' }) {
  const g = db.find('guests', x => x.email.toLowerCase() === email.toLowerCase());
  if (g) { db.update('guests', g.id, { name, phone: phone || g.phone, country: country || g.country, doc: doc || g.doc }); return db.get('guests', g.id); }
  return db.insert('guests', { name, email, phone, country, doc, vip: false, tags: [], notes: '' });
}

export function createReservation({ guest, typeId, checkIn, checkOut, adults = 2, children = 0, extras = [], promo = '', channel = 'web', paid = 0, notes = '', status = 'confirmada', roomId = null, userId = null, payMethod = 'Tarjeta (web)' }) {
  const g = guest.id ? guest : upsertGuest(guest);
  const q = quote(typeId, checkIn, checkOut, { extras, adults, children, promo });
  const room = roomId ? db.get('rooms', roomId) : freeRooms(typeId, checkIn, checkOut)[0];
  const code = nextCode();
  const folio = paid ? [{ id: 'f' + Date.now().toString(36), date: today(), desc: paid >= q.total ? 'Pago total de la reserva' : 'Abono de reserva', amount: paid, kind: 'pago', method: payMethod }] : [];
  const res = db.insert('reservations', {
    code, guestId: g.id, guestName: g.name, roomTypeId: typeId, roomId: room?.id || '', checkIn, checkOut, nights: q.n, adults, children, status, channel,
    extras: q.extrasLines, roomTotal: q.roomTotal, extrasTotal: q.extrasTotal, discount: q.discount, offerCode: q.offerCode, total: q.total, paid, notes, checkin: null, folio
  });
  db.log('reserva', `Reserva ${code} · ${g.name} · ${typeById(typeId).name} · ${checkIn} → ${checkOut} (${channelName(channel)})`, userId);
  return res;
}

// ---------- Folio ----------
export function folioOf(res) {
  if (res.folio) return res.folio;
  const items = [];
  const nights = eachNight(res.checkIn, res.checkOut);
  const per = res.nights ? Math.round(res.roomTotal / res.nights) : 0;
  nights.forEach((d, i) => items.push({ id: 'n' + i, date: d, desc: `Alojamiento · noche ${i + 1}`, amount: per, kind: 'cargo' }));
  (res.extras || []).forEach((e, i) => items.push({ id: 'e' + i, date: res.checkIn, desc: e.name, amount: e.total, kind: 'cargo' }));
  if (res.discount) items.push({ id: 'd', date: res.checkIn, desc: `Descuento ${res.offerCode || ''}`.trim(), amount: -res.discount, kind: 'cargo' });
  if (res.paid) items.push({ id: 'p', date: res.checkIn, desc: 'Pagos recibidos', amount: res.paid, kind: 'pago', method: res.channel === 'web' ? 'Tarjeta (web)' : 'Varios' });
  return items;
}
// Cargos de estadía (alojamiento + extras) siempre presentes + cargos/pagos manuales del folio
export function folioLines(res) {
  const base = [];
  const nights = eachNight(res.checkIn, res.checkOut);
  const per = res.nights ? Math.round(res.roomTotal / res.nights) : 0;
  nights.forEach((d, i) => base.push({ id: 'n' + i, date: d, desc: `Alojamiento ${typeById(res.roomTypeId)?.name || ''} · noche ${i + 1}`, amount: i === nights.length - 1 ? res.roomTotal - per * (nights.length - 1) : per, kind: 'cargo', fixed: true }));
  (res.extras || []).forEach((e, i) => base.push({ id: 'e' + i, date: res.checkIn, desc: `${e.name}${e.units > 1 ? ` ×${e.units}` : ''}`, amount: e.total, kind: 'cargo', fixed: true }));
  if (res.discount) base.push({ id: 'd', date: res.checkIn, desc: `Descuento ${res.offerCode || ''}`.trim(), amount: -res.discount, kind: 'cargo', fixed: true });
  const manual = res.folio || (res.paid ? [{ id: 'p', date: res.checkIn, desc: 'Pagos recibidos', amount: res.paid, kind: 'pago', method: 'Varios' }] : []);
  return [...base, ...manual];
}
export function folioTotals(res) {
  const lines = folioLines(res);
  const charges = lines.filter(l => l.kind === 'cargo').reduce((a, l) => a + l.amount, 0);
  const payments = lines.filter(l => l.kind === 'pago').reduce((a, l) => a + l.amount, 0);
  return { lines, charges, payments, balance: charges - payments };
}
export function addFolio(resId, line, userId) {
  const res = db.get('reservations', resId);
  const folio = (res.folio || (res.paid ? [{ id: 'p', date: res.checkIn, desc: 'Pagos recibidos', amount: res.paid, kind: 'pago', method: 'Varios' }] : [])).concat({ id: 'f' + Date.now().toString(36), date: today(), ...line });
  const paid = folio.filter(l => l.kind === 'pago').reduce((a, l) => a + l.amount, 0);
  db.update('reservations', resId, { folio, paid });
  db.log('folio', `${res.code}: ${line.kind === 'pago' ? 'pago' : 'cargo'} ${line.desc} ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(line.amount)}`, userId);
}

// ---------- Políticas ----------
export function cancelTerms(res, at = today()) {
  const s = settings();
  const daysLeft = diffDays(at, res.checkIn);
  const free = daysLeft >= (s.freeCancelDays ?? 3);
  const firstNights = eachNight(res.checkIn, res.checkOut).slice(0, s.penaltyNights ?? 1).reduce((a, d) => a + nightlyRate(res.roomTypeId, d).rate, 0);
  const penalty = free ? 0 : Math.min(res.total, firstNights);
  return { free, daysLeft, penalty, refund: Math.max(0, (res.paid || 0) - penalty) };
}

export function setStatus(resId, status, userId, extra = {}) {
  const res = db.get('reservations', resId);
  const patch = { status, ...extra };
  if (status === 'check-in') patch.checkin = { ...(res.checkin || {}), done: true, at: new Date().toISOString() };
  if (status === 'check-out') { patch.checkedOutAt = new Date().toISOString(); if (res.roomId) db.update('rooms', res.roomId, { hk: 'sucia' }); }
  if (status === 'cancelada') patch.cancelledAt = new Date().toISOString();
  db.update('reservations', resId, patch);
  db.log('estado', `${res.code} (${res.guestName}) → ${RES_STATES[status].label}`, userId);
}

// ---------- Indicadores ----------
export function occupancyOn(day) {
  const rooms = db.count('rooms', r => r.hk !== 'fuera') || 1;
  const occ = db.query('reservations', x => ['confirmada', 'check-in', 'check-out'].includes(x.status) && x.checkIn <= day && day < x.checkOut);
  const revenue = occ.reduce((a, x) => a + (x.nights ? x.roomTotal / x.nights : 0), 0);
  return { rooms, sold: occ.length, occ: occ.length / rooms, revenue, adr: occ.length ? revenue / occ.length : 0, revpar: revenue / rooms };
}

export const guestStays = gid => db.query('reservations', x => x.guestId === gid).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
export { today, addDays, diffDays, eachNight, overlaps };
