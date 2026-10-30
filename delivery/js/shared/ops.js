// Operaciones sobre envíos (crear, asignar, avanzar estados, entregar, calificar, chat).
// Las usan el sitio público, el portal cliente, la app del repartidor, el panel y el motor.
import { db } from '../data/db.js';
import { quote, zoneOf } from './pricing.js';
import { buildGeo, makePlan, slaFor, courierPos, hasLeg, ACTIVE_ST, isLate as lateAt, etaMs } from './sim.js';
import { prng, nearestComuna } from '../data/geo.js';

// ---------- Reloj de simulación compartido ----------
export function simNow() {
  const c = db.getValue('clock') || { base: Date.now(), anchor: Date.now(), speed: 1 };
  if (c.paused) return c.base;
  return c.base + (Date.now() - c.anchor) * (c.speed || 1);
}
export function setClock({ speed, paused }) {
  const t = simNow(), c = db.getValue('clock') || {};
  db.setValue('clock', { base: t, anchor: Date.now(), speed: speed ?? c.speed ?? 1, paused: paused ?? false });
}
export const nowIso = () => new Date(simNow()).toISOString();
export const settings = () => db.getValue('settings') || {};
export const pricing = () => db.getValue('pricing');

// ---------- Feed de operación (eventos para toasts y panel) ----------
export function feed(text, kind = 'info', ref = null) {
  const list = db.getValue('feed', []) || [];
  list.unshift({ id: Math.random().toString(36).slice(2, 9), at: nowIso(), text, kind, ref });
  db.setValue('feed', list.slice(0, 60));
}

export const isLate = s => lateAt(s, simNow());
// Envíos históricos no guardan geometría: se reconstruye (determinista) para mostrar el mapa.
export function withGeo(s) { return !s || s.route ? s : { ...s, ...buildGeo(s.code, s.sender.comuna, s.receiver.comuna) }; }
export const courierOf = s => (s.courierId ? db.get('couriers', s.courierId) : null);
export const customerOf = s => (s.customerId ? db.get('customers', s.customerId) : null);
export const activeShipments = () => db.query('shipments', s => ACTIVE_ST.includes(s.status));
export const findByCode = code => db.find('shipments', s => s.code.toUpperCase() === String(code).trim().toUpperCase());
export function courierQueue(courierId) {
  return db.query('shipments', s => s.courierId === courierId && ACTIVE_ST.includes(s.status) && s.status !== 'pendiente')
    .sort((a, b) => (hasLeg(b) - hasLeg(a)) || Date.parse(a.assignedAt) - Date.parse(b.assignedAt));
}
export const courierFree = id => courierQueue(id).length === 0;
export function posOf(c) { return courierPos(c, activeShipments(), simNow()); }
// ETA de un envío considerando la cola de su repartidor.
export function etaOf(s) {
  const t = simNow();
  if (s.status === 'asignado' && !hasLeg(s) && s.courierId) {
    let q = 0;
    for (const o of courierQueue(s.courierId)) { if (o.id === s.id) break; q += etaMs(o, t); }
    return etaMs(s, t, q);
  }
  return etaMs(s, t);
}

export function newCode() {
  let c;
  do { c = 'RX-' + Math.floor(10000 + Math.random() * 90000); } while (findByCode(c));
  return c;
}

// input: { sender:{name,phone,addr,comuna}, receiver:{...}, size, service, notes, tip, customerId, channel, slow }
export function createShipment(input, { by = null, business = false, paid } = {}) {
  const P = pricing();
  const q = quote(P, input.sender.comuna, input.receiver.comuna, input.size, input.service, { business, at: new Date(simNow()) });
  if (!q) throw new Error('Comuna fuera de cobertura');
  const code = input.code || newCode();
  const t = simNow();
  const s = db.insert('shipments', {
    code, customerId: input.customerId || null, courierId: null,
    sender: input.sender, receiver: input.receiver, notes: input.notes || '', size: input.size, service: input.service,
    km: q.km, zone: q.zone, price: q.price, tip: Number(input.tip) || 0, status: 'pendiente',
    paid: paid ?? !business, channel: input.channel || 'web', batch: input.batch || null, slow: !!input.slow,
    createdAt: new Date(t).toISOString(), slaAt: new Date(slaFor(t, q.km, input.service)).toISOString(),
    history: [{ s: 'pendiente', at: new Date(t).toISOString(), by }], chat: [{ from: 'sys', text: 'Chat con tu repartidor (simulado).', at: new Date(t).toISOString() }],
    ...buildGeo(code, input.sender.comuna, input.receiver.comuna)
  });
  return s;
}

function push(s, st, extra = {}, note = '', by = null) {
  const at = new Date(simNow()).toISOString();
  return db.update('shipments', s.id, x => ({ status: st, ...extra, history: [...(x.history || []), { s: st, at, note, by }] }));
}

// Asignación directa (despacho manual o aceptación de oferta).
export function assign(s, courierId, { by = null, note = '' } = {}) {
  const c = db.get('couriers', courierId);
  if (!c) return null;
  const t = simNow();
  const free = courierFree(courierId);
  const extra = { courierId, assignedAt: new Date(t).toISOString(), offer: null, plan: free ? makePlan(s, posOf(c), t) : null };
  if (s.status === 'pendiente') return push(s, 'asignado', extra, note || `Asignado a ${c.name}`, by);
  // Reasignación de un envío ya asignado
  return db.update('shipments', s.id, x => ({ ...extra, status: 'asignado', pickedAt: null, history: [...x.history, { s: 'asignado', at: new Date(t).toISOString(), note: `Reasignado a ${c.name}`, by }] }));
}
export function offer(s, courierId, auto) {
  const t = simNow();
  const secs = Number(settings().offerSeconds) || 30;
  const r = prng(s.code + courierId);
  db.update('shipments', s.id, { offer: { courierId, at: t, expiresAt: t + secs * 1000, autoAt: auto ? t + 2500 + r() * 4000 : null } });
}
export function rejectOffer(s, reason = 'Rechazada') {
  const c = db.get('couriers', s.offer?.courierId);
  db.update('shipments', s.id, x => ({ offer: null, rejectedBy: [...(x.rejectedBy || []), x.offer?.courierId].filter(Boolean) }));
  feed(`${c ? c.name : 'Repartidor'} ${reason === 'expirada' ? 'no respondió la oferta de' : 'rechazó'} ${s.code}`, 'warning', s.id);
}
export function startLeg(s, t = simNow()) {
  const c = db.get('couriers', s.courierId);
  if (!c) return;
  db.update('shipments', s.id, { plan: makePlan(s, courierPos(c, activeShipments().filter(x => x.id !== s.id), t), t) });
}
export function markPicked(s, by = null) {
  return push(s, 'retirado', { pickedAt: new Date(simNow()).toISOString() }, 'Paquete retirado en origen', by);
}
export function markOnTheWay(s, by = null) {
  const t = simNow();
  return push(s, 'en_camino', { plan: { ...(s.plan || makePlan(s, s.pickup, t)), transitStart: t } }, '', by);
}
export function deliver(s, pod = {}, by = null) {
  const t = simNow();
  const done = push(s, 'entregado', { deliveredAt: new Date(t).toISOString(), offer: null, pod: { name: pod.name || s.receiver.name, sig: pod.sig || null, auto: pod.sig === undefined, photo: pod.photo ?? true, at: new Date(t).toISOString(), rut: pod.rut || '' } }, pod.note || '', by);
  if (s.courierId) db.update('couriers', s.courierId, c => ({ pos: s.drop || c.pos, trips: (c.trips || 0) + 1 }));
  feed(`${s.code} entregado en ${s.receiver.comuna}`, 'success', s.id);
  startNextFor(s.courierId);
  return done;
}
export function fail(s, reason, by = null) {
  const done = push(s, 'fallido', { failedAt: nowIso(), failReason: reason, offer: null }, reason, by);
  if (s.courierId) db.update('couriers', s.courierId, c => ({ pos: s.drop || c.pos }));
  feed(`${s.code}: no se pudo entregar (${reason})`, 'error', s.id);
  startNextFor(s.courierId);
  return done;
}
export function cancel(s, reason = 'Cancelado', by = null) {
  const done = push(s, 'cancelado', { offer: null, plan: null, cancelReason: reason }, reason, by);
  feed(`${s.code} cancelado`, 'warning', s.id);
  if (s.courierId) startNextFor(s.courierId);
  return done;
}
export function startNextFor(courierId) {
  if (!courierId) return;
  const q = courierQueue(courierId);
  if (q.length && !q.some(hasLeg)) startLeg(q[0]);
}
export function rate(s, stars, comment = '') {
  db.update('shipments', s.id, { rating: { stars: Number(stars), comment, at: nowIso() } });
  if (s.courierId) {
    const rs = db.query('shipments', x => x.courierId === s.courierId && x.rating);
    db.update('couriers', s.courierId, { rating: Math.round(rs.reduce((a, x) => a + x.rating.stars, 0) / rs.length * 100) / 100, ratings: rs.length });
  }
}
export function addChat(s, from, text) {
  return db.update('shipments', s.id, x => ({ chat: [...(x.chat || []), { from, text, at: nowIso() }] }));
}
export function heartbeatKey(courierId) { return `lgw:rayo:hb:${courierId}`; }
// ¿El repartidor lo controla una persona en la app (y no el motor)?
export function isControlled(courierId) {
  try { return Date.now() - Number(localStorage.getItem(heartbeatKey(courierId)) || 0) < 15000; } catch (e) { return false; }
}
// Respuesta automática del repartidor en el chat (cuando nadie lo controla).
export function courierReply(s, text) {
  const t = text.toLowerCase();
  const c = courierOf(s);
  const where = c ? nearestComuna(posOf(c)) : s.sender.comuna;
  const mins = Math.max(1, Math.round(etaOf(s) / 60000));
  if (/d[oó]nde|ubica|vas|vienes/.test(t)) return { pendiente: 'Aún no me asignan tu envío, ¡pronto!', asignado: `Voy hacia el retiro en ${s.sender.comuna}, llego en unos minutos.`, retirado: `Estoy en ${s.sender.addr} cargando tu paquete.`, en_camino: `Voy por ${where}, avanzando bien.` }[s.status] || 'Ya entregué el paquete, quedó con firma y foto.';
  if (/cu[aá]nto|demora|tarda|hora|llega|falta/.test(t)) return s.status === 'entregado' ? 'Ya está entregado.' : `Según el GPS llego en unos ${mins} min.`;
  if (/conserj|porter|dejar|vecin|recep/.test(t)) return 'Perfecto, si no hay nadie lo dejo en conserjería y te mando foto de respaldo.';
  if (/gracias|vale|ok|perfecto|bac[aá]n|genial/.test(t)) return '¡A ti! Cualquier cosa me escribes por aquí.';
  if (/hola|buen/.test(t)) return `¡Hola! Soy ${c ? c.name.split(' ')[0] : 'tu repartidor'}, voy a cargo de tu envío ${s.code}.`;
  if (/timbre|piso|depto|departamento|casa/.test(t)) return 'Anotado, lo tengo en cuenta al llegar.';
  return ['Dale, lo tengo anotado.', 'Entendido, gracias por avisar.', 'Ok, te aviso apenas llegue.'][Math.floor(Math.random() * 3)];
}
export function quoteFor(from, to, size, service, opts = {}) { return quote(pricing(), from, to, size, service, { at: new Date(simNow()), ...opts }); }
export { zoneOf };
