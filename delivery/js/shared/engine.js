// Motor de simulación. Corre en UNA sola pestaña a la vez (elección de líder vía
// localStorage) y escribe en la DB solo cuando hay transiciones; el resto de pestañas
// recibe los cambios por el evento storage y calcula posiciones con el mismo reloj.
import { db } from '../data/db.js';
import { COMUNAS, haversine } from '../data/geo.js';
import { hasLeg, WAIT_MS, ACTIVE_ST } from './sim.js';
import * as ops from './ops.js';

const LEADER = 'lgw:rayo:leader';
const me = Math.random().toString(36).slice(2);
let timer = null, lastGen = 0;
const NAMES = ['Camila', 'Pedro', 'Sofía', 'Martín', 'Elena', 'Raúl', 'Inés', 'Hugo', 'Lucía', 'Bruno', 'Amanda', 'Iván'];
const LASTS = ['Rojas', 'Lagos', 'Paredes', 'Molina', 'Ortiz', 'Campos', 'Vidal', 'Sáez', 'Garrido', 'Ríos'];
const STREETS = ['Av. Matta', 'Av. Grecia', 'Av. Italia', 'Av. Ossa', 'Av. Los Leones', 'Av. Tobalaba', 'Av. Macul', 'Av. Recoleta', 'Pedro de Valdivia', 'Av. Santa Rosa'];
const pick = a => a[Math.floor(Math.random() * a.length)];

function isLeader() {
  try {
    const cur = JSON.parse(localStorage.getItem(LEADER) || 'null');
    const now = Date.now();
    if (!cur || cur.id === me || now - cur.ts > 4000) { localStorage.setItem(LEADER, JSON.stringify({ id: me, ts: now })); return true; }
    return false;
  } catch (e) { return true; }
}

function bestCourier(s, exclude = []) {
  const ships = ops.activeShipments();
  const busy = new Set(ships.filter(x => x.courierId && x.status !== 'pendiente').map(x => x.courierId));
  const offered = new Set(ships.filter(x => x.offer).map(x => x.offer.courierId));
  const cands = db.query('couriers', c => c.online && c.status === 'activo' && !busy.has(c.id) && !offered.has(c.id) && !exclude.includes(c.id) && (s.size !== 'XL' || ['furgon', 'auto'].includes(c.vehicle)));
  let best = null, bd = Infinity;
  for (const c of cands) { const d = haversine(ops.posOf(c), s.pickup); if (d < bd) { bd = d; best = c; } }
  return best;
}

function tick() {
  if (!isLeader()) return;
  const t = ops.simNow();
  const set = ops.settings();
  const ships = ops.activeShipments();
  for (const s0 of ships) {
    const s = db.get('shipments', s0.id);
    if (!s || !ACTIVE_ST.includes(s.status)) continue;
    const ctrl = s.courierId && ops.isControlled(s.courierId);
    if (s.status === 'pendiente') {
      if (s.offer) {
        const oc = ops.isControlled(s.offer.courierId);
        if (t >= s.offer.expiresAt) ops.rejectOffer(s, 'expirada');
        else if (!oc && s.offer.autoAt && t >= s.offer.autoAt) {
          const c = db.get('couriers', s.offer.courierId);
          ops.assign(s, s.offer.courierId, { note: `Aceptado por ${c?.name}` });
          ops.feed(`${c?.name} aceptó ${s.code}`, 'info', s.id);
        }
      } else if (set.autoAssign && t - Date.parse(s.createdAt) > 2500) {
        const c = bestCourier(s, s.rejectedBy || []);
        if (c) ops.offer(s, c.id, !ops.isControlled(c.id));
        else if ((s.rejectedBy || []).length) db.update('shipments', s.id, { rejectedBy: [] });
      }
      continue;
    }
    if (!hasLeg(s)) {
      if (!ops.courierQueue(s.courierId).some(hasLeg)) ops.startLeg(s, t);
      continue;
    }
    if (ctrl) continue; // lo maneja una persona en la app del repartidor
    const p = s.plan;
    if (s.status === 'asignado' && t >= p.preStart + p.preDur) ops.markPicked(s);
    else if (s.status === 'retirado' && t >= Date.parse(s.pickedAt) + WAIT_MS) ops.markOnTheWay(s);
    else if (s.status === 'en_camino' && p.transitStart != null && t >= p.transitStart + p.transitDur) {
      const d = ops.deliver(s, { name: Math.random() < .8 ? s.receiver.name : 'Conserjería' });
      const cust = ops.customerOf(s);
      if (d && Math.random() < .45 && !s.demo && cust && !cust.userId) ops.rate(d, Math.random() < .75 ? 5 : 4, '');
    }
  }
  // Nuevos pedidos para mantener viva la operación
  const max = Number(set.simMaxActive) || 12;
  if (set.simGenerate && Date.now() - lastGen > 22000 && ships.length < max) {
    lastGen = Date.now();
    generate();
  }
}

export function generate(opts = {}) {
  const P = ops.pricing();
  const covered = COMUNAS.filter(c => P.comunaZone[c.n]);
  const custs = db.query('customers', c => c.active !== false);
  const biz = Math.random() < .65;
  const cust = pick(custs.filter(c => (c.type === 'empresa') === biz)) || custs[0];
  const addr = db.find('addresses', a => a.customerId === cust.id && a.isDefault);
  const from = opts.from || (addr && P.comunaZone[addr.comuna] ? addr.comuna : pick(covered).n);
  const to = opts.to || pick(covered).n;
  try {
    const s = ops.createShipment({
      customerId: cust.id, channel: biz ? pick(['api', 'portal', 'masivo']) : 'web',
      sender: { name: cust.name, phone: cust.phone, addr: addr ? addr.addr : `${pick(STREETS)} ${100 + Math.floor(Math.random() * 3000)}`, comuna: from },
      receiver: { name: `${pick(NAMES)} ${pick(LASTS)}`, phone: `+56 9 ${5000 + Math.floor(Math.random() * 4999)} ${1000 + Math.floor(Math.random() * 8999)}`, addr: `${pick(STREETS)} ${100 + Math.floor(Math.random() * 6000)}`, comuna: to },
      size: pick(['S', 'M', 'M', 'L']), service: pick(['estandar', 'estandar', 'express']), slow: Math.random() < .12
    }, { business: biz });
    ops.feed(`Nuevo envío ${s.code}: ${from} → ${to}`, 'info', s.id);
    return s;
  } catch (e) { return null; }
}

export function startEngine() {
  if (timer) return;
  tick();
  timer = setInterval(tick, 1000);
  window.addEventListener('beforeunload', () => {
    try { const cur = JSON.parse(localStorage.getItem(LEADER) || 'null'); if (cur && cur.id === me) localStorage.removeItem(LEADER); } catch (e) { /* */ }
  });
}
