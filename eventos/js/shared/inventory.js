// Lógica de negocio: inventario, reservas temporales (holds), precios, compra, reembolsos,
// transferencias y reventa. Todo opera sobre la DB compartida.
import { db, fees, notify } from '../data/db.js';
import { makeCode } from '../data/seed.js';
import { rng } from '../../../assets/core/db.js';
import { seatInfo, seatCount } from './venue.js';
import { money } from '../../../assets/core/ui.js';

export const venueOf = ev => db.get('venues', ev.venueId);
export const orgOf = ev => db.get('organizers', ev.organizerId);
export const isPast = ev => Date.parse(ev.date) < Date.now() - 6 * 36e5;
export const isPublic = ev => ev.status === 'publicado' || ev.status === 'finalizado';

export const isEarly = (t, when = Date.now()) => !!(t.ebPrice && t.ebUntil && when < Date.parse(t.ebUntil));
export const tierPrice = (t, when = Date.now()) => (isEarly(t, when) ? t.ebPrice : t.price);

export function tierCapacity(ev, t, venue = venueOf(ev)) {
  if (t.zone === 'ga') return +t.capacity || 0;
  return (venue?.sections || []).filter(s => s.zone === t.zone).reduce((s, x) => s + x.rows * x.seats, 0);
}
const liveTicket = t => t.status !== 'anulado';
export function eventTickets(ev) { return db.query('tickets', t => t.eventId === ev.id && liveTicket(t)); }

export function eventStats(ev) {
  const venue = venueOf(ev), list = eventTickets(ev);
  const byTier = ev.tiers.map(t => {
    const tk = list.filter(x => x.tierId === t.id);
    return { tier: t, sold: tk.length, capacity: tierCapacity(ev, t, venue), revenue: tk.reduce((s, x) => s + x.price, 0) };
  });
  const sold = list.length, capacity = byTier.reduce((s, x) => s + x.capacity, 0);
  return { sold, capacity, revenue: byTier.reduce((s, x) => s + x.revenue, 0), byTier, used: list.filter(t => t.status === 'usado').length, pct: capacity ? sold / capacity * 100 : 0 };
}
export const isSoldOut = ev => { const s = eventStats(ev); return s.capacity > 0 && s.sold >= s.capacity; };
export const minPrice = ev => Math.min(...ev.tiers.map(t => tierPrice(t)));

// ---------- Holds (reservas temporales de 10 min) ----------
export function holdKey() {
  let k; try { k = sessionStorage.getItem('vlc:hold'); } catch (e) { /* */ }
  if (!k) { k = 'h' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('vlc:hold', k); } catch (e) { /* */ } }
  return k;
}
export function cleanHolds() {
  const now = Date.now();
  db.query('holds', h => Date.parse(h.expiresAt) < now).forEach(h => db.remove('holds', h.id));
}
export const getHold = (key = holdKey()) => { const h = db.find('holds', x => x.key === key); return h && Date.parse(h.expiresAt) > Date.now() ? h : null; };
export function setHold(eventId, seats, ga, key = holdKey()) {
  const prev = db.find('holds', x => x.key === key);
  const empty = !seats.length && !Object.values(ga).some(Boolean);
  if (empty) { if (prev) db.remove('holds', prev.id); return null; }
  const keepTimer = prev && prev.eventId === eventId && Date.parse(prev.expiresAt) > Date.now();
  const expiresAt = keepTimer ? prev.expiresAt : new Date(Date.now() + (fees().holdMinutes || 10) * 6e4).toISOString();
  if (prev) return db.update('holds', prev.id, { eventId, seats, ga, expiresAt });
  return db.insert('holds', { key, eventId, seats, ga, expiresAt });
}
export function releaseHold(key = holdKey()) { const h = db.find('holds', x => x.key === key); if (h) db.remove('holds', h.id); }

export function seatStates(ev, key = holdKey()) {
  const m = new Map(), now = Date.now();
  eventTickets(ev).forEach(t => t.seat && m.set(t.seat, 'sold'));
  db.query('holds', h => h.eventId === ev.id && Date.parse(h.expiresAt) > now).forEach(h => h.seats.forEach(s => { if (!m.has(s)) m.set(s, h.key === key ? 'mine' : 'held'); }));
  return m;
}
export function gaAvailable(ev, t, key = holdKey()) {
  const sold = eventTickets(ev).filter(x => x.tierId === t.id).length;
  const held = db.query('holds', h => h.eventId === ev.id && h.key !== key && Date.parse(h.expiresAt) > Date.now()).reduce((s, h) => s + (+h.ga?.[t.id] || 0), 0);
  return Math.max(0, tierCapacity(ev, t) - sold - held);
}

// ---------- Carrito → líneas ----------
export function cartLines(ev, hold) {
  if (!hold) return [];
  const venue = venueOf(ev), lines = [];
  hold.seats.forEach(sid => {
    const info = seatInfo(venue, sid); if (!info) return;
    const t = ev.tiers.find(x => x.zone === info.zone); if (!t) return;
    lines.push({ tier: t, seat: sid, label: `${t.name} · ${info.label}`, price: tierPrice(t) });
  });
  Object.entries(hold.ga || {}).forEach(([tid, q]) => {
    const t = ev.tiers.find(x => x.id === tid);
    for (let i = 0; i < q && t; i++) lines.push({ tier: t, seat: null, label: `${t.name} · General (sin numerar)`, price: tierPrice(t) });
  });
  return lines;
}

export function findPromo(code, ev) {
  const p = db.find('promos', x => x.code.toUpperCase() === String(code).trim().toUpperCase());
  if (!p) throw new Error('El código no existe');
  if (!p.active) throw new Error('El código no está activo');
  if (p.validUntil && Date.parse(p.validUntil) < Date.now()) throw new Error('El código expiró');
  if (p.maxUses && p.uses >= p.maxUses) throw new Error('El código alcanzó su límite de usos');
  if (p.eventId && p.eventId !== ev.id) throw new Error('El código no aplica a este evento');
  if (p.organizerId && p.organizerId !== ev.organizerId) throw new Error('El código no aplica a esta productora');
  return p;
}

export function totals(lines, promo) {
  const f = fees();
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const discount = !promo ? 0 : promo.type === 'pct' ? Math.round(subtotal * promo.value / 100) : Math.min(subtotal, promo.value);
  const service = lines.length ? Math.round((subtotal - discount) * (f.servicePct || 0) / 100) + (f.perTicket || 0) * lines.length : 0;
  return { subtotal, discount, service, total: subtotal - discount + service };
}

let seq = Date.now() % 100000;
export function purchase({ ev, buyer, lines, promo, payment }) {
  const t = totals(lines, promo);
  const r = rng(Date.now() + (seq++));
  const number = 'VLC-' + (12000 + db.count('orders'));
  const order = db.insert('orders', { number, eventId: ev.id, buyerId: buyer.id, tickets: [], subtotal: t.subtotal, discount: t.discount, fees: t.service, total: t.total, promo: promo?.code || '', status: 'pagada', payment, channel: 'web' });
  const ids = lines.map(l => db.insert('tickets', { code: makeCode(r), eventId: ev.id, orderId: order.id, ownerId: buyer.id, tierId: l.tier.id, seat: l.seat, price: l.price, status: 'valido' }).id);
  db.update('orders', order.id, { tickets: ids });
  if (promo) db.update('promos', promo.id, p => ({ uses: (p.uses || 0) + 1 }));
  releaseHold();
  db.log('compra', `${buyer.name} compró ${lines.length} entrada(s) para ${ev.title} (${money(t.total)})`, buyer.id);
  notify(buyer.id, `¡Compra confirmada! ${lines.length} entrada(s) para "${ev.title}". Pedido ${number}.`);
  return db.get('orders', order.id);
}

export function refundOrder(order, by, reason = '') {
  order.tickets.forEach(id => db.update('tickets', id, { status: 'anulado' }));
  db.update('orders', order.id, { status: 'reembolsada', refundedAt: new Date().toISOString(), refundReason: reason });
  const ev = db.get('events', order.eventId);
  db.log('reembolso', `Pedido ${order.number} reembolsado (${money(order.total)})${reason ? ' · ' + reason : ''}`, by?.id);
  notify(order.buyerId, `Tu pedido ${order.number} fue reembolsado: ${money(order.total)}.`);
  // Avisar a la lista de espera que se liberaron entradas
  db.query('waitlist', w => w.eventId === order.eventId && w.status === 'esperando').slice(0, 3).forEach(w => {
    db.update('waitlist', w.id, { status: 'notificado', notifiedAt: new Date().toISOString() });
    notify(w.userId, `Se liberaron entradas para "${ev?.title}". ¡Corre a comprarlas!`);
  });
}

export function transferTicket(t, email, by) {
  const to = db.find('users', u => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.active !== false);
  if (!to) throw new Error('No existe una cuenta activa con ese correo');
  if (to.id === t.ownerId) throw new Error('No puedes transferirte la entrada a ti mismo');
  const r = rng(Date.now());
  db.update('tickets', t.id, { ownerId: to.id, status: 'valido', code: makeCode(r), transferredFrom: by.id, transferredAt: new Date().toISOString(), resalePrice: null });
  const ev = db.get('events', t.eventId);
  db.log('transferencia', `${by.name} transfirió una entrada de ${ev?.title} a ${to.name}`, by.id);
  notify(to.id, `${by.name} te transfirió una entrada para "${ev?.title}".`);
  return to;
}
export function listResale(t, price, by) {
  db.update('tickets', t.id, { status: 'reventa', resalePrice: price, resaleAt: new Date().toISOString() });
  db.log('reventa', `${by.name} publicó una entrada en reventa a ${money(price)}`, by.id);
}
export function cancelResale(t) { db.update('tickets', t.id, { status: 'valido', resalePrice: null }); }
export function buyResale(t, buyer, payment) {
  const ev = db.get('events', t.eventId), seller = db.get('users', t.ownerId);
  const service = Math.round(t.resalePrice * (fees().servicePct || 0) / 100) + (fees().perTicket || 0);
  const order = db.insert('orders', { number: 'VLC-' + (12000 + db.count('orders')), eventId: ev.id, buyerId: buyer.id, tickets: [t.id], subtotal: t.resalePrice, discount: 0, fees: service, total: t.resalePrice + service, promo: '', status: 'pagada', payment, channel: 'reventa', sellerId: seller?.id });
  db.update('tickets', t.id, { ownerId: buyer.id, status: 'valido', code: makeCode(rng(Date.now())), price: t.resalePrice, resalePrice: null, orderId: order.id, resoldFrom: seller?.id });
  db.log('reventa', `${buyer.name} compró en reventa una entrada de ${ev.title}`, buyer.id);
  notify(seller?.id, `¡Vendiste tu entrada de "${ev.title}" por ${money(t.resalePrice)}! El monto se abonará en 48 h.`);
  notify(buyer.id, `Compraste una entrada de reventa para "${ev.title}".`);
  return order;
}

// ---------- Control de acceso ----------
export function scan(code, eventId, by) {
  const c = String(code).trim().toUpperCase().replace(/\s+/g, '');
  const t = db.find('tickets', x => x.code === c);
  if (!t) return { result: 'invalid', reason: 'Código no encontrado' };
  const ev = db.get('events', t.eventId);
  if (eventId && t.eventId !== eventId) return { result: 'invalid', reason: `Entrada de otro evento: ${ev?.title}`, ticket: t };
  if (t.status === 'anulado') return { result: 'invalid', reason: 'Entrada anulada (reembolsada)', ticket: t };
  if (t.status === 'usado') return { result: 'used', reason: 'Ya ingresó', ticket: t };
  db.update('tickets', t.id, { status: 'usado', scannedAt: new Date().toISOString(), scannedBy: by?.id });
  db.insert('scans', { eventId: t.eventId, ticketId: t.id, code: c, by: by?.id });
  return { result: 'valid', ticket: db.get('tickets', t.id) };
}

export { seatCount };
export { fees } from '../data/db.js';
