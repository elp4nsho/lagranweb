// Motor de operación puro (sin base de datos): plan de ruta con ETA, simulación del avance de los
// conductores en función de la hora y registro de intentos. Lo usan la semilla (antes de que exista
// la base) y ops.js (sobre las filas vivas de la base).
import { DEPOT, dist, evaluate, hrand } from './geo.js';

export const PENDING = ['asignado', 'en_ruta'];
export const isPending = s => PENDING.includes(s.status);
export const dayAt = (date, hm) => new Date(`${date}T${hm}:00`).getTime();
export const iso = ms => new Date(ms).toISOString();
export const nextDay = date => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const hm = ms => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function winMs(win, date) {
  if (!win) return null;
  const [a, b] = win.split('-');
  const from = dayAt(date, a), to = dayAt(date, b);
  return isFinite(from) && isFinite(to) ? { from, to } : null;
}
// Minutos de servicio en la puerta y restricciones de una parada.
export function stopCtx(s, route, o = {}) {
  if (!s) return null;
  const w = winMs(s.win || s.prefWin, route.date);
  const express = s.service === 'express';
  const service = (o.serviceMin || 4) + Math.max(0, (s.pieces || 1) - 1) * 0.6 + (s.cod ? 2 : 0) + (s.requirePin ? 1 : 0) + (s.kind === 'retiro' ? 4 + (s.pieces || 1) * 0.3 : 0);
  return { x: s.x, y: s.y, service, from: w?.from, to: w ? w.to : express && route.expressBy ? Date.parse(route.expressBy) : undefined, priority: express ? 2 : s.service === 'mismo_dia' ? 1 : 0 };
}
export const lastAttempt = (s, routeId) => (s.attempts || []).filter(a => !routeId || a.routeId === routeId).at(-1) || null;

// Plan de la ruta: paradas hechas/pendientes, ETA de cada pendiente, km y hora de término.
// o: { now, speed, serviceMin, breakMin, breakAt, sim }  (sim: el reloj parte del último intento, no de "ahora")
export function planRoute(route, get, o = {}) {
  const now = o.now ?? Date.now();
  const stops = route.order.map(get).filter(Boolean);
  const pending = stops.filter(isPending);
  const done = stops.filter(s => !isPending(s) && lastAttempt(s, route.id)).sort((a, b) => Date.parse(lastAttempt(a, route.id).at) - Date.parse(lastAttempt(b, route.id).at));
  const skipped = stops.filter(s => !isPending(s) && !lastAttempt(s, route.id));
  const pos = (route.lastStop && get(route.lastStop)) || DEPOT;
  const base = route.status === 'planificada' ? Date.parse(route.plannedStart) : Date.parse(route.lastAt || route.startedAt);
  let start = o.sim ? base : Math.max(now, base);
  const breaks = route.breaks || [];
  const open = breaks.find(b => !b.end);
  const breakMin = o.breakMin ?? 30;
  if (open) start = Math.max(start, Date.parse(open.start) + breakMin * 6e4);
  const breakAt = !breaks.length && route.status !== 'cerrada' && breakMin ? dayAt(route.date, o.breakAt || '13:30') : null;
  const ctx = { start: pos, startTime: start, stop: id => stopCtx(get(id), route, o), speed: o.speed || 24, breakAt, breakMin, back: DEPOT };
  const ev = evaluate(pending.map(s => s.id), ctx);
  return { stops, pending, done, skipped, ev, ctx, eta: Object.fromEntries(ev.legs.map(l => [l.id, l])), kmDone: route.kmDone || 0, kmLeft: ev.km, end: ev.end, pos, start, inBreak: !!open };
}

// Firma simulada (trazos dentro de 300×100) determinista por texto.
export function scribble(seed) {
  const h = k => hrand(seed + k);
  const strokes = [];
  let x = 20 + h('a') * 30;
  const n = 2 + Math.floor(h('n') * 2);
  for (let s = 0; s < n; s++) {
    const pts = [], len = 14 + Math.floor(h('l' + s) * 10), amp = 18 + h('m' + s) * 22, fr = 0.5 + h('f' + s) * 0.9, base = 45 + h('b' + s) * 20;
    for (let i = 0; i < len; i++) { x += 4 + h('x' + s + i) * 6; pts.push([Math.round(Math.min(290, x)), Math.round(base + Math.sin(i * fr + s) * amp * (0.6 + h('y' + s + i) * 0.5))]); }
    strokes.push(pts);
    x += 10;
  }
  return strokes;
}

const RECEIVERS = ['Titular', 'Titular', 'Titular', 'Conserje', 'Familiar', 'Vecino'];
const CONSERJES = ['Juan Carrasco', 'Ana Vergara', 'Luis Ortega', 'Rosa Paredes', 'Héctor Lagos'];
const SIM_FAILS = ['Nadie en el domicilio', 'Nadie en el domicilio', 'Dirección incorrecta o incompleta', 'Sin acceso (conserjería cerrada / condominio)', 'Rechazado por el destinatario', 'Sin dinero para el pago contra entrega'];

// Registra un intento mutando la fila (semilla y simulación). emit(tipo, datos) para efectos.
export function applyAttempt(s, route, atMs, ok, data = {}, emit = () => {}) {
  const at = iso(atMs);
  const from = s.status;
  const to = ok ? (s.kind === 'retiro' ? 'retirado' : data.pieces && data.pieces < s.pieces ? 'parcial' : 'entregado') : 'fallido';
  const prev = (route.lastStop && data.get && data.get(route.lastStop)) || DEPOT;
  s.history = [...(s.history || []), { at, from, to, by: route.driverId, note: ok ? (data.note || '') : data.reason }];
  s.status = to; s.statusAt = at;
  s.attempts = [...(s.attempts || []), { at, ok, reason: ok ? '' : data.reason, note: data.note || '', by: route.driverId, routeId: route.id }];
  if (ok) {
    s.deliveredAt = at;
    if (s.kind !== 'retiro') {
      const rel = data.relation || RECEIVERS[Math.floor(hrand(s.id + 'rel') * RECEIVERS.length)];
      s.proof = { at, name: data.name || (rel === 'Titular' ? s.rName : rel === 'Conserje' ? CONSERJES[Math.floor(hrand(s.id) * 5)] : s.rName.split(' ')[0] === 'María' ? 'Pedro ' + s.rName.split(' ').at(-1) : 'María ' + s.rName.split(' ').at(-1)),
        rut: data.rut || '', relation: rel, sig: data.sig || scribble(s.id), photo: data.photo ?? hrand(s.id + 'ph') > 0.3, pin: !!s.requirePin, pieces: data.pieces || s.pieces,
        payment: s.cod ? (data.payment || { method: hrand(s.id + 'pay') > 0.45 ? 'Efectivo' : 'Tarjeta (POS)', amount: s.cod }) : null };
      if (s.proof.payment?.method === 'Efectivo') route.cash = (route.cash || 0) + s.proof.payment.amount;
    } else s.proof = { at, name: s.rName, relation: 'Contacto', sig: data.sig || scribble(s.id), pieces: data.pieces || s.pieces, photo: true };
  }
  route.kmDone = +((route.kmDone || 0) + dist(prev, s)).toFixed(2);
  route.lastStop = s.id; route.lastAt = at;
  if (!ok) emit('incident', { type: 'intento_fallido', shipmentId: s.id, routeId: route.id, driverId: route.driverId, text: `${s.code} · ${data.reason}`, at });
  return to;
}

// Avanza una ruta simulada hasta "now": entrega (o falla) cada parada cuya hora de salida ya pasó.
export function simulateRoute(route, get, now, o = {}, emit = () => {}) {
  let n = 0;
  if (route.status !== 'en_curso') return 0;
  for (let i = 0; i < 80; i++) {
    const p = planRoute(route, get, { ...o, now, sim: true });
    const leg = p.ev.legs[0];
    if (!leg) {
      if (p.end <= now) { closeRouteAuto(route, get, p, emit); n++; }
      break;
    }
    if (leg.leave > now) break;
    if (leg.brk) route.breaks = [...(route.breaks || []), { start: iso(leg.brkAt), end: iso(leg.brkAt + (o.breakMin ?? 30) * 6e4) }];
    const s = get(leg.id);
    const ok = hrand(s.id + 'ok') > (s.kind === 'retiro' ? 0.04 : 0.1);
    applyAttempt(s, route, leg.leave - 6e4, ok, { reason: SIM_FAILS[Math.floor(hrand(s.id + 'r') * SIM_FAILS.length)], get }, emit);
    n++;
  }
  return n;
}

export function closeRouteAuto(route, get, p, emit = () => {}) {
  const at = iso(p.end);
  const back = p.ev.km || 0;
  const failed = route.order.map(get).filter(s => s && s.status === 'fallido');
  failed.forEach(s => { const back = s.kind === 'retiro' ? 'solicitado' : 'en_bodega'; s.history = [...(s.history || []), { at, from: 'fallido', to: back, by: route.driverId, note: s.kind === 'retiro' ? 'Retiro reprogramado' : 'Devuelto al CD en el cierre de ruta' }]; s.status = back; s.statusAt = at; s.routeId = ''; s.date = nextDay(route.date); s.nextAction = s.nextAction || 'reintento'; });
  const partial = route.order.map(get).filter(s => s && s.status === 'parcial').map(s => s.id);
  route.status = 'cerrada'; route.closedAt = at;
  route.history = [...(route.history || []), { at, from: 'en_curso', to: 'cerrada', by: route.driverId, note: 'Cierre automático (simulación)' }];
  route.odoEnd = Math.round((route.odoStart || 0) + (route.kmDone || 0) + back);
  route.fuelEnd = Math.max(10, (route.fuelStart || 80) - Math.round(((route.kmDone || 0) + back) * 0.45));
  route.closing = { at, returned: failed.map(s => s.id).concat(partial), cashExpected: route.cash || 0, cashDeclared: route.cash || 0, diff: 0, notes: '', auto: true };
  emit('vehicle', { id: route.vehicleId, odometer: route.odoEnd });
  emit('log', `${route.code}: ruta cerrada (${failed.length} paquetes devueltos al CD)`);
}
