// Operación sobre la base viva: plan y posición de cada ruta, simulación en vivo, inicio de jornada,
// entregas con prueba, intentos fallidos, pausas, combustible, cierre, planificación automática,
// reasignaciones, excepciones y acciones del destinatario. Cada cambio deja huella en la bitácora.
import { app, db, S, SHIP, PICK, ROUTE, INC, machineOf, notify, todayStr, tomorrowStr, addrKey, userName, companyName, CHECK_ITEMS, ROUTE_COLORS, hhmm } from './app.js';
import { planRoute, simulateRoute, isPending, iso, dayAt, nextDay, lastAttempt } from './engine.js';
import { optimizeRoute, evaluate, DEPOT, dist, lerp, stair, hrand } from './geo.js';
import { nextCode, rut } from '../../assets/core/domain.js';

export const get = id => db.get('shipments', id);
export const opts = () => { const s = S(); return { speed: +s.speed || 24, serviceMin: +s.serviceMin || 4, breakMin: +s.breakMin || 0, breakAt: s.breakAt || '13:30' }; };
export const plan = (route, now) => planRoute(route, get, { ...opts(), now, sim: !!route.sim });
export const todayRoutes = () => db.query('routes', r => r.date === todayStr());
export const driverRoute = uid => { const rs = db.query('routes', r => r.driverId === uid && r.date === todayStr()); return rs.find(r => r.status !== 'cerrada') || rs[0] || null; };
export const isDone = s => ['entregado', 'parcial', 'retirado', 'retirado_punto'].includes(s.status);
const uid = () => app.auth.current()?.id || null;
const by = () => uid();

// ---------- Capacidad ----------
export function load(route) {
  const v = db.get('vehicles', route.vehicleId) || { capKg: 1, capL: 1 };
  const items = route.order.map(get).filter(Boolean);
  const onBoard = items.filter(s => (s.kind === 'entrega' && (isPending(s) || s.status === 'fallido')));
  const picked = items.filter(s => s.kind === 'retiro' && s.status === 'retirado');
  const kgNow = onBoard.reduce((a, s) => a + (+s.weight || 0), 0) + picked.reduce((a, s) => a + (+s.weight || 0), 0);
  const lNow = onBoard.reduce((a, s) => a + (+s.vol || 0), 0) + picked.reduce((a, s) => a + (+s.vol || 0), 0);
  const kgPlan = items.filter(s => s.kind === 'entrega').reduce((a, s) => a + (+s.weight || 0), 0);
  const lPlan = items.filter(s => s.kind === 'entrega').reduce((a, s) => a + (+s.vol || 0), 0);
  const pickKg = items.filter(s => s.kind === 'retiro').reduce((a, s) => a + (+s.weight || 0), 0);
  const pickL = items.filter(s => s.kind === 'retiro').reduce((a, s) => a + (+s.vol || 0), 0);
  return { v, kgNow, lNow, kgPlan: kgPlan + pickKg, lPlan: lPlan + pickL, pctKg: Math.round(((route.status === 'planificada' ? kgPlan + pickKg : kgNow) / v.capKg) * 100), pctL: Math.round(((route.status === 'planificada' ? lPlan + pickL : lNow) / v.capL) * 100) };
}

// ---------- Posición del vehículo (interpolada en el tiempo, sin escribir datos) ----------
export function vehiclePos(route, p = plan(route), now = Date.now()) {
  if (route.status === 'planificada') return { ...DEPOT, state: 'En CD' };
  if (route.status === 'cerrada') return { ...DEPOT, state: 'Cerrada' };
  if (p.inBreak) return { x: p.pos.x, y: p.pos.y, state: 'En colación' };
  const leg = p.ev.legs[0];
  const target = leg ? get(leg.id) : DEPOT;
  const from = Date.parse(route.lastAt || route.startedAt);
  const travel = Math.max(6e4, ((leg ? leg.km : dist(p.pos, DEPOT)) / opts().speed) * 3600e3);
  const f = Math.max(0, Math.min(0.97, (now - from) / travel));
  const path = stair(p.pos, target);
  // recorre la escalera según f
  const segs = []; let tot = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); segs.push(l); tot += l; }
  let acc = 0, at = path[0];
  for (let i = 0; i < segs.length; i++) { if (acc + segs[i] >= f * tot) { at = lerp(path[i], path[i + 1], segs[i] ? (f * tot - acc) / segs[i] : 0); break; } acc += segs[i]; at = path[i + 1]; }
  return { x: at.x, y: at.y, state: leg ? (f >= 0.97 ? 'En la parada' : 'En camino') : 'Regresando al CD', next: leg ? target : null };
}

// ---------- Simulación en vivo (rutas de otros conductores) ----------
let ticking = false;
export function tick(now = Date.now()) {
  if (ticking) return 0;
  ticking = true;
  let total = 0;
  try {
    db.query('routes', r => r.sim && r.status === 'en_curso').forEach(r => {
      const live = db.get('routes', r.id);
      const evs = [];
      const n = simulateRoute(live, get, now, opts(), (t, d) => evs.push([t, d]));
      if (!n) return;
      total += n;
      db.update('routes', live.id, { simAt: iso(now) }); // persiste las filas mutadas por la simulación
      evs.forEach(([t, d]) => {
        if (t === 'incident') newIncident({ ...d, auto: true });
        if (t === 'vehicle') db.update('vehicles', d.id, { odometer: Math.max(db.get('vehicles', d.id)?.odometer || 0, d.odometer) });
        if (t === 'log') db.log('ruta', d, live.driverId);
      });
      const done = live.order.map(get).filter(s => s && isDone(s)).length;
      db.log('simulación', `${live.code}: ${done}/${live.order.length} paradas (${userName(live.driverId)})`, live.driverId);
    });
  } finally { ticking = false; }
  return total;
}

// La demo se renueva cada día: si los datos son de otro día, se vuelve a sembrar (rutas "de hoy").
export function ensureFreshDay() {
  if (db.getValue('seedDay') && db.getValue('seedDay') !== todayStr()) { db.reset(); return true; }
  return false;
}

// ---------- Excepciones ----------
export function newIncident(o) {
  const code = nextCode(db, 'inc', 'EX-', 3100);
  const row = db.insert('incidents', { code, status: 'abierta', priority: o.priority || (o.type === 'intento_fallido' ? 'media' : 'baja'), ...o, at: undefined, createdAt: o.at || iso(Date.now()) });
  if (!o.auto) db.log('excepción', `${code}: ${o.text}`, uid());
  return row;
}
export function resolveIncident(inc, resolution, status = 'resuelta') {
  const out = INC.move(db, 'incidents', inc.id, status, { by: by(), note: resolution, log: 'excepción', extra: status === 'resuelta' ? { resolution, resolvedBy: by(), resolvedAt: iso(Date.now()) } : {} });
  return out;
}

// ---------- Inicio de jornada ----------
export function startRoute(route, { items, obs, odo, fuel, missing = [] }) {
  const v = db.get('vehicles', route.vehicleId);
  const fails = CHECK_ITEMS.filter(([k, , critical]) => critical && items[k] === 'falla');
  if (fails.length) {
    newIncident({ type: 'checklist', routeId: route.id, driverId: route.driverId, priority: 'alta', text: `${route.code} · Falla crítica en checklist: ${fails.map(f => f[1]).join(', ')}. Vehículo ${v?.plate} no puede salir.` });
    throw new Error(`No puedes salir con fallas críticas (${fails.map(f => f[1]).join(', ')}). Despacho fue notificado.`);
  }
  if (!(odo >= (v?.odometer || 0))) throw new Error(`El odómetro no puede ser menor que el último registrado (${(v?.odometer || 0).toLocaleString('es-CL')} km)`);
  if (odo > (v?.odometer || 0) + 800) throw new Error('El odómetro parece incorrecto (más de 800 km sobre el último registro)');
  if (!(fuel >= 0 && fuel <= 100)) throw new Error('Nivel de combustible entre 0 y 100 %');
  const obsItems = CHECK_ITEMS.filter(([k]) => items[k] === 'obs' || items[k] === 'falla');
  if (obsItems.length) newIncident({ type: 'checklist', routeId: route.id, driverId: route.driverId, priority: 'baja', text: `${route.code} · Observaciones en checklist: ${obsItems.map(f => f[1]).join(', ')}${obs ? ` — ${obs}` : ''}` });
  // Paquetes que no estaban en el andén: salen de la ruta y vuelven a bodega.
  missing.forEach(id => {
    const s = get(id);
    if (!s) return;
    machineOf(s).move(db, 'shipments', id, s.kind === 'retiro' ? 'solicitado' : 'en_bodega', { by: by(), note: 'No cargado: no estaba en el andén', title: x => x.code, extra: { routeId: '' } });
    newIncident({ type: 'danio', shipmentId: id, routeId: route.id, driverId: route.driverId, priority: 'media', text: `${s.code} · No encontrado en el andén al cargar ${route.code}` });
  });
  const order = route.order.filter(id => !missing.includes(id));
  const now = iso(Date.now());
  ROUTE.move(db, 'routes', route.id, 'en_curso', { by: by(), log: 'ruta', title: r => r.code, extra: { order, startedAt: now, odoStart: odo, fuelStart: fuel, checklist: { at: now, items, obs }, loaded: order.filter(id => get(id)?.kind === 'entrega') } });
  const fresh = db.get('routes', route.id);
  const p = plan(fresh);
  order.forEach(id => {
    const s = get(id);
    if (!s || s.status !== 'asignado') return;
    machineOf(s).move(db, 'shipments', id, 'en_ruta', { by: by(), note: `Cargado en ${v?.plate || ''}`, title: x => x.code, log: false });
    const eta = p.eta[id]?.eta;
    if (s.kind === 'entrega' && S().notifyEta !== false) notify(s, 'SMS', `Pudú Envíos: tu pedido ${s.code} llega hoy${eta ? ` entre ${hhmm(eta - 30 * 6e4)} y ${hhmm(eta + 30 * 6e4)}` : ''}. Sigue a tu conductor en puduenvios.cl`);
  });
  db.log('ruta', `${fresh.code}: salida del CD con ${order.length} paradas (odómetro ${odo.toLocaleString('es-CL')} km, combustible ${fuel} %)`, by());
  return fresh;
}

// ---------- Orden de paradas ----------
export function reorder(route, order, how = 'manual') {
  const fixed = route.order.filter(id => !order.includes(id));
  db.update('routes', route.id, { order: [...fixed, ...order], reorderedAt: iso(Date.now()) });
  db.log('ruta', `${route.code}: orden de paradas ${how === 'manual' ? 'cambiado a mano' : how}`, by());
}
// Calcula la optimización de las paradas pendientes (no la aplica).
export function computeOptimization(route) {
  const p = plan(route);
  return { ...optimizeRoute(p.pending.map(s => s.id), p.ctx), plan: p };
}
export function applyOptimization(route, res) {
  const done = route.order.filter(id => !res.order.includes(id));
  db.update('routes', route.id, { order: [...done, ...res.order], optimized: { at: iso(Date.now()), kmBefore: +res.before.km.toFixed(1), kmAfter: +res.after.km.toFixed(1), endBefore: iso(res.before.end), endAfter: iso(res.after.end), lateBefore: res.before.lateCount, lateAfter: res.after.lateCount } });
  db.log('ruta', `${route.code}: ruta optimizada ${res.before.km.toFixed(1)} → ${res.after.km.toFixed(1)} km, término ${hhmm(res.before.end)} → ${hhmm(res.after.end)}`, by());
}

// ---------- Entrega ----------
export function validateProof(s, d) {
  if (!d.name || d.name.trim().length < 3) return 'Escribe el nombre de quien recibe';
  const needRut = s.cod || s.requirePin || d.relation !== 'Titular';
  if (needRut && !d.rut) return 'Ingresa el RUT de quien recibe';
  if (d.rut && !rut.valid(d.rut)) return 'El RUT no es válido';
  if (s.requirePin && String(d.pin || '').trim() !== String(s.pin)) return 'El PIN no coincide: pídele al destinatario el código que recibió por SMS';
  if (!d.safePlace && !(d.sig && d.sig.some(st => st.length >= 4))) return 'Falta la firma de quien recibe';
  if (d.safePlace && !d.photo) return 'Para dejarlo en un lugar seguro debes tomar la foto';
  if (d.pieces != null && (d.pieces < 1 || d.pieces > s.pieces)) return `Bultos entregados entre 1 y ${s.pieces}`;
  if (d.pieces < s.pieces && !d.partialReason) return 'Indica por qué la entrega es parcial';
  if (s.cod) {
    if (!d.payment?.method) return 'Elige el medio de pago del cobro contra entrega';
    if (d.payment.method === 'Efectivo' && !(d.payment.received >= s.cod)) return `El efectivo recibido debe cubrir ${s.cod.toLocaleString('es-CL')}`;
  }
  return null;
}
function moveRouteState(route, s, extraRoute = {}) {
  const prev = (route.lastStop && get(route.lastStop)) || DEPOT;
  db.update('routes', route.id, { kmDone: +((route.kmDone || 0) + dist(prev, s)).toFixed(2), lastStop: s.id, lastAt: iso(Date.now()), ...extraRoute });
}
export function deliver(route, s, d) {
  const err = validateProof(s, d);
  if (err) throw new Error(err);
  const at = iso(Date.now());
  const partial = d.pieces < s.pieces;
  const to = s.kind === 'retiro' ? 'retirado' : partial ? 'parcial' : 'entregado';
  const payment = s.cod ? { method: d.payment.method, amount: s.cod, received: d.payment.received || s.cod, change: d.payment.method === 'Efectivo' ? (d.payment.received - s.cod) : 0 } : null;
  const proof = { at, name: d.name.trim(), rut: d.rut ? rut.format(d.rut) : '', relation: d.relation, sig: d.safePlace ? null : d.sig, photo: !!d.photo, pin: !!s.requirePin, pieces: d.pieces ?? s.pieces, safePlace: d.safePlace || '', payment, partialReason: partial ? d.partialReason : '' };
  machineOf(s).move(db, 'shipments', s.id, to, { by: by(), note: partial ? `${d.pieces}/${s.pieces} bultos · ${d.partialReason}` : d.safePlace ? `Dejado en: ${d.safePlace}` : `Recibe ${proof.name} (${d.relation})`, title: x => x.code, log: 'entrega',
    extra: { proof, deliveredAt: at, attempts: [...(s.attempts || []), { at, ok: true, by: by(), routeId: route.id, note: d.note || '' }], ...(partial ? { returnPieces: s.pieces - d.pieces } : {}) } });
  moveRouteState(route, s, payment?.method === 'Efectivo' ? { cash: (route.cash || 0) + s.cod } : {});
  if (d.addrNote) addAddressNote(s, d.addrNote, d.addrTag);
  if (s.kind === 'entrega') notify(s, 'SMS', `Pudú Envíos: tu pedido ${s.code} fue entregado a ${proof.name}${partial ? ` (${d.pieces} de ${s.pieces} bultos)` : ''}. ¡Cuéntanos cómo te fue!`);
  if (partial) newIncident({ type: 'danio', shipmentId: s.id, routeId: route.id, driverId: route.driverId, priority: 'media', text: `${s.code} · Entrega parcial (${d.pieces}/${s.pieces}): ${d.partialReason}` });
  return get(s.id);
}
export function failStop(route, s, { reason, note = '', next = 'manana', pointId = '', notice = false, date = '' }) {
  if (!reason) throw new Error('Elige el motivo');
  const at = iso(Date.now());
  const attempts = [...(s.attempts || []), { at, ok: false, reason, note, by: by(), routeId: route.id, notice }];
  machineOf(s).move(db, 'shipments', s.id, 'fallido', { by: by(), note: reason, title: x => x.code, log: 'entrega', extra: { attempts, nextAction: next, nextDate: date || '', redirectPointId: next === 'punto' ? pointId : s.redirectPointId || '' } });
  moveRouteState(route, s);
  const max = +S().maxAttempts || 3;
  const nFail = attempts.filter(a => !a.ok).length;
  newIncident({ type: 'intento_fallido', shipmentId: s.id, routeId: route.id, driverId: route.driverId, priority: nFail >= max ? 'alta' : 'media', text: `${s.code} · ${reason}${note ? ` — ${note}` : ''}${nFail >= max ? ` (intento ${nFail} de ${max}: evaluar devolución)` : ''}` });
  if (s.kind === 'entrega') notify(s, 'SMS', `Pudú Envíos: no pudimos entregar tu pedido ${s.code} (${reason}). ${next === 'reintentar' ? 'Volveremos a pasar hoy.' : next === 'punto' ? `Quedará disponible en ${db.get('points', pointId)?.name || 'un punto de retiro'}.` : 'Lo reprogramaremos: puedes elegir fecha o punto de retiro en puduenvios.cl.'}`);
  if (next === 'reintentar') retryLater(route, get(s.id));
  return get(s.id);
}
// Vuelve a poner la parada fallida al final de la ruta (reintento hoy).
export function retryLater(route, s) {
  machineOf(s).move(db, 'shipments', s.id, 'en_ruta', { by: by(), note: 'Reintento más tarde hoy', title: x => x.code, log: 'entrega', extra: { nextAction: '' } });
  const fresh = db.get('routes', route.id);
  db.update('routes', route.id, { order: [...fresh.order.filter(id => id !== s.id), s.id] });
}

export function addAddressNote(s, text, tag = '') {
  if (!text?.trim()) return;
  db.insert('addressNotes', { addrKey: addrKey(s.address, s.comuna), address: s.address, comuna: s.comuna, text: text.trim(), tag, by: uid(), at: iso(Date.now()) });
  db.log('dirección', `Nota en ${s.address}, ${s.comuna}: ${text.trim()}`, uid());
}
export function addressHistory(s) {
  const k = addrKey(s.address, s.comuna);
  const notes = db.query('addressNotes', n => n.addrKey === k).sort((a, b) => b.at.localeCompare(a.at));
  const past = db.query('shipments', x => x.id !== s.id && x.kind === s.kind && addrKey(x.address, x.comuna) === k && (x.attempts || []).length).sort((a, b) => String(lastAttempt(b)?.at).localeCompare(String(lastAttempt(a)?.at)));
  return { notes, past };
}

// ---------- Pausas y combustible ----------
export function startBreak(route) {
  if ((route.breaks || []).some(b => !b.end)) throw new Error('Ya estás en pausa');
  db.update('routes', route.id, { breaks: [...(route.breaks || []), { start: iso(Date.now()) }] });
  db.log('ruta', `${route.code}: inicio de colación`, by());
}
export function endBreak(route) {
  const br = (route.breaks || []).map(b => (b.end ? b : { ...b, end: iso(Date.now()) }));
  db.update('routes', route.id, { breaks: br });
  db.log('ruta', `${route.code}: fin de colación`, by());
}
export function addFuel(route, { liters, amount, odometer, station }) {
  if (!(liters > 0 && liters <= 120)) throw new Error('Litros entre 1 y 120');
  if (!(amount > 0)) throw new Error('Ingresa el monto pagado');
  const v = db.get('vehicles', route.vehicleId);
  if (route.odoStart && odometer < route.odoStart) throw new Error('El odómetro no puede ser menor al de la salida');
  db.insert('fuelLogs', { vehicleId: route.vehicleId, driverId: route.driverId, routeId: route.id, liters, amount, odometer, station, at: iso(Date.now()) });
  db.log('combustible', `${v?.plate}: ${liters} L por $${amount.toLocaleString('es-CL')} en ${station}`, by());
}

// ---------- Cierre del día ----------
export function closingSummary(route) {
  const items = route.order.map(get).filter(Boolean);
  const toReturn = items.filter(s => s.kind === 'entrega' && (isPending(s) || s.status === 'fallido' || (s.status === 'parcial' && s.returnPieces)));
  const pickedUp = items.filter(s => s.kind === 'retiro' && s.status === 'retirado');
  const cash = items.filter(s => s.proof?.payment?.method === 'Efectivo' && lastAttempt(s, route.id)?.ok).reduce((a, s) => a + s.proof.payment.amount, 0);
  const card = items.filter(s => s.proof?.payment && s.proof.payment.method !== 'Efectivo' && lastAttempt(s, route.id)?.ok).reduce((a, s) => a + s.proof.payment.amount, 0);
  return { items, toReturn, pickedUp, cash, card, delivered: items.filter(isDone).length, failed: items.filter(s => s.status === 'fallido').length, pending: items.filter(isPending).length };
}
export function closeRoute(route, { returned = [], odoEnd, fuelEnd, cashDeclared, notes = '' }) {
  const sum = closingSummary(route);
  const missing = sum.toReturn.filter(s => !returned.includes(s.id));
  if (missing.length) throw new Error(`Confirma la devolución de ${missing.length} paquete(s) al CD`);
  if (!(odoEnd >= (route.odoStart || 0))) throw new Error('El odómetro final no puede ser menor al de salida');
  if (odoEnd > (route.odoStart || 0) + 600) throw new Error('Odómetro final fuera de rango (más de 600 km en el día)');
  if (!(fuelEnd >= 0 && fuelEnd <= 100)) throw new Error('Combustible final entre 0 y 100 %');
  if (!(cashDeclared >= 0)) throw new Error('Declara el efectivo entregado (0 si no hubo)');
  const at = iso(Date.now());
  const tmw = nextDay(route.date);
  sum.toReturn.forEach(s => {
    const m = machineOf(s);
    if (s.status === 'parcial') return; // el resto de bultos vuelve físicamente; el envío queda como parcial
    if (isPending(s) && s.status === 'en_ruta') m.move(db, 'shipments', s.id, 'en_bodega', { by: by(), note: 'No visitado: vuelve al CD', title: x => x.code, log: false, extra: { routeId: '', date: tmw } });
    else if (s.status === 'fallido') {
      m.move(db, 'shipments', s.id, 'en_bodega', { by: by(), note: 'Devuelto al CD en el cierre', title: x => x.code, log: false, extra: { routeId: '', date: s.nextAction === 'reprogramar' && s.nextDate ? s.nextDate : tmw } });
      if (s.nextAction === 'punto' && s.redirectPointId) SHIP.move(db, 'shipments', s.id, 'en_punto', { by: by(), note: db.get('points', s.redirectPointId)?.name || '', title: x => x.code, log: false });
      if (s.nextAction === 'devolver') SHIP.move(db, 'shipments', s.id, 'devuelto', { by: by(), note: 'Devolución al remitente tras intentos fallidos', title: x => x.code, log: false });
    }
  });
  // retiros fallidos o no visitados → vuelven a "solicitado" para mañana
  sum.items.filter(s => s.kind === 'retiro' && (s.status === 'fallido' || isPending(s))).forEach(s => PICK.move(db, 'shipments', s.id, 'solicitado', { by: by(), note: 'Retiro reprogramado', title: x => x.code, log: false, extra: { routeId: '', date: tmw }, force: true }));
  const diff = cashDeclared - sum.cash;
  ROUTE.move(db, 'routes', route.id, 'cerrada', { by: by(), log: 'ruta', title: r => r.code, extra: { closedAt: at, odoEnd, fuelEnd, closing: { at, returned, cashExpected: sum.cash, cashDeclared, diff, card: sum.card, notes } } });
  db.update('vehicles', route.vehicleId, { odometer: odoEnd });
  if (diff !== 0) newIncident({ type: 'caja', routeId: route.id, driverId: route.driverId, priority: Math.abs(diff) > 5000 ? 'alta' : 'media', text: `${route.code} · Diferencia de caja de ${diff > 0 ? '+' : '-'}$${Math.abs(diff).toLocaleString('es-CL')} (esperado $${sum.cash.toLocaleString('es-CL')})${notes ? ` — ${notes}` : ''}` });
  db.log('ruta', `${route.code}: cierre — ${sum.delivered} entregas, ${sum.toReturn.length} devueltos, ${odoEnd - (route.odoStart || 0)} km`, by());
}

// ---------- Planificación ----------
export const backlog = () => db.query('shipments', s => !s.routeId && ((s.kind === 'entrega' && s.status === 'en_bodega') || (s.kind === 'retiro' && s.status === 'solicitado')) && (!s.date || s.date <= todayStr()));
export function assign(ids, route) {
  const fresh = db.get('routes', route.id);
  if (fresh.status === 'cerrada') throw new Error('La ruta ya está cerrada');
  const to = 'asignado';
  ids.forEach(id => {
    const s = get(id);
    if (!s) return;
    const m = machineOf(s);
    if (s.routeId && s.routeId !== route.id) {
      const src = db.get('routes', s.routeId);
      if (src) db.update('routes', src.id, { order: src.order.filter(x => x !== id) });
    }
    const target = fresh.status === 'en_curso' && s.status === 'en_ruta' ? 'en_ruta' : to;
    if (s.status !== target) m.move(db, 'shipments', id, target, { by: by(), note: fresh.code, title: x => x.code, log: false, extra: { routeId: route.id, date: fresh.date } });
    else db.update('shipments', id, { routeId: route.id, date: fresh.date, history: [...(s.history || []), { at: iso(Date.now()), from: s.status, to: s.status, by: by(), note: `Transbordo a ${fresh.code}` }] });
  });
  const r2 = db.get('routes', route.id);
  db.update('routes', route.id, { order: [...r2.order.filter(x => !ids.includes(x)), ...ids] });
  db.log('ruta', `${fresh.code}: ${ids.length} parada(s) asignadas`, by());
}
export function unassign(ids) {
  ids.forEach(id => {
    const s = get(id);
    if (!s?.routeId) return;
    const src = db.get('routes', s.routeId);
    if (src) db.update('routes', src.id, { order: src.order.filter(x => x !== id) });
    machineOf(s).move(db, 'shipments', id, s.kind === 'retiro' ? 'solicitado' : 'en_bodega', { by: by(), note: `Quitado de ${src?.code || 'la ruta'}`, title: x => x.code, log: false, extra: { routeId: '' }, force: true });
  });
  db.log('ruta', `${ids.length} parada(s) devueltas a la bodega`, by());
}
export function createRoute({ driverId, vehicleId, zoneId }) {
  if (!driverId || !vehicleId || !zoneId) throw new Error('Elige conductor, vehículo y zona');
  if (todayRoutes().some(r => r.driverId === driverId && r.status !== 'cerrada')) throw new Error(`${userName(driverId)} ya tiene una ruta activa hoy`);
  if (todayRoutes().some(r => r.vehicleId === vehicleId && r.status !== 'cerrada')) throw new Error('Ese vehículo ya está en una ruta activa');
  const v = db.get('vehicles', vehicleId);
  if (v?.status !== 'operativo') throw new Error(`El vehículo ${v?.plate} no está operativo`);
  const start = Math.ceil((Date.now() + 15 * 6e4) / 9e5) * 9e5;
  const code = nextCode(db, 'route', 'R-', 2051);
  const used = todayRoutes().map(r => r.color);
  const r = db.insert('routes', { code, date: todayStr(), driverId, vehicleId, zoneId, color: ROUTE_COLORS.find(c => !used.includes(c)) || ROUTE_COLORS[0], status: 'planificada', order: [], plannedStart: iso(start), expressBy: iso(Math.max(dayAt(todayStr(), '13:00'), start + 3.5 * 3600e3)), sim: false, breaks: [], kmDone: 0, cash: 0, history: [{ at: iso(Date.now()), from: null, to: 'planificada', by: by(), note: '' }] });
  db.log('ruta', `${code} creada para ${userName(driverId)} (${v.plate})`, by());
  return r;
}
// Arma rutas por zona y capacidad: primero llena las rutas "por iniciar" de la zona, luego crea rutas
// nuevas con conductores y vehículos libres (bin packing por peso y volumen, máx. 28 paradas) y optimiza.
export function autoPlan({ zoneIds = null, maxStops = 28 } = {}) {
  const pool = backlog().filter(s => !zoneIds || zoneIds.includes(s.zoneId));
  const byZone = {};
  pool.forEach(s => (byZone[s.zoneId] ||= []).push(s));
  const touched = new Set(), created = [];
  let assigned = 0;
  const left = [];
  const freeDrivers = () => db.query('users', u => u.role === 'conductor' && u.active !== false && !todayRoutes().some(r => r.driverId === u.id && r.status !== 'cerrada'));
  const freeVehicles = () => db.query('vehicles', v => v.status === 'operativo' && !todayRoutes().some(r => r.vehicleId === v.id && r.status !== 'cerrada'));
  Object.entries(byZone).sort((a, b) => b[1].length - a[1].length).forEach(([zoneId, list]) => {
    list.sort((a, b) => (b.service === 'express') - (a.service === 'express') || b.weight - a.weight);
    const bins = todayRoutes().filter(r => r.zoneId === zoneId && r.status === 'planificada').map(r => ({ r, ...load(r), n: r.order.length }));
    const fits = (b, s) => b.n < maxStops && b.kgPlan + (+s.weight || 0) <= b.v.capKg * 0.95 && b.lPlan + (+s.vol || 0) <= b.v.capL * 0.95;
    for (const s of list) {
      let b = bins.find(x => fits(x, s));
      if (!b) {
        const drv = freeDrivers().sort((a, c) => (c.zoneId === zoneId) - (a.zoneId === zoneId))[0];
        const veh = freeVehicles().filter(v => v.capKg >= s.weight && v.capL >= s.vol).sort((a, c) => (c.id === drv?.vehicleId) - (a.id === drv?.vehicleId) || c.capKg - a.capKg)[0];
        if (!drv || !veh) { left.push(s); continue; }
        const r = createRoute({ driverId: drv.id, vehicleId: veh.id, zoneId });
        created.push(r);
        b = { r, ...load(r), n: 0 };
        bins.push(b);
      }
      assign([s.id], b.r);
      b.kgPlan += +s.weight || 0; b.lPlan += +s.vol || 0; b.n++;
      touched.add(b.r.id); assigned++;
    }
  });
  touched.forEach(id => { const r = db.get('routes', id); const res = computeOptimization(r); if (res.changed) applyOptimization(r, res); });
  db.log('planificación', `Planificación automática: ${assigned} asignados, ${created.length} rutas nuevas, ${left.length} sin cupo`, by());
  return { assigned, created, left, touched: [...touched] };
}

// ---------- Indicadores ----------
export function kpisToday() {
  const rs = todayRoutes();
  const items = rs.flatMap(r => r.order.map(get).filter(Boolean).map(s => ({ s, r })));
  const att = items.filter(({ s, r }) => lastAttempt(s, r.id));
  const ok = att.filter(({ s }) => isDone(s));
  const onTime = ok.filter(({ s, r }) => {
    const at = Date.parse(s.deliveredAt);
    if (s.win) { const [, b] = s.win.split('-'); return at <= dayAt(r.date, b); }
    if (s.service === 'express') return at <= Date.parse(r.expressBy);
    return true;
  });
  const first = ok.filter(({ s }) => (s.attempts || []).length === 1);
  const hours = rs.filter(r => r.startedAt).reduce((a, r) => a + Math.max(0.25, ((r.status === 'cerrada' ? Date.parse(r.closedAt) : Date.parse(r.lastAt || r.startedAt)) - Date.parse(r.startedAt)) / 3600e3), 0);
  return {
    total: items.length, attempted: att.length, delivered: ok.length, failed: att.length - ok.length, pending: items.filter(({ s }) => isPending(s)).length,
    onTimePct: ok.length ? Math.round((onTime.length / ok.length) * 100) : 0, firstPct: att.length ? Math.round((first.length / att.length) * 100) : 0,
    stopsHour: hours ? +(att.length / hours).toFixed(1) : 0, km: rs.reduce((a, r) => a + (r.kmDone || 0), 0), routes: rs.length, active: rs.filter(r => r.status === 'en_curso').length,
    cash: rs.reduce((a, r) => a + (r.cash || 0), 0), backlog: backlog().length
  };
}

// ---------- Destinatario ----------
const inVan = s => s.status === 'en_ruta' && db.get('routes', s.routeId)?.status === 'en_curso';
export const canChange = s => ['creado', 'en_bodega', 'asignado', 'en_ruta'].includes(s.status) && s.kind === 'entrega';
export function recipientNote(s, { text, tags = [] }, who = 'destinatario') {
  if (!text?.trim() && !tags.length) throw new Error('Escribe una indicación o elige una etiqueta');
  if (text && text.length > 280) throw new Error('Máximo 280 caracteres');
  const notes = [...(s.notes || []), { at: iso(Date.now()), by: who, text: (text || '').trim(), tags }];
  db.update('shipments', s.id, { notes });
  db.log('indicación', `${s.code}: ${[...tags, text].filter(Boolean).join(' · ')}`, uid());
  if (inVan(s)) newIncident({ type: 'nota', shipmentId: s.id, routeId: s.routeId, driverId: db.get('routes', s.routeId)?.driverId, text: `${s.code} · Nueva indicación con el paquete en ruta: ${[...tags, text].filter(Boolean).join(' · ')}` });
}
export function setPrefs(s, { safePlace, prefWin }) {
  db.update('shipments', s.id, { safePlace: safePlace || '', prefWin: prefWin || '' });
  db.log('indicación', `${s.code}: preferencias (${[prefWin && 'ventana ' + prefWin, safePlace && 'lugar seguro: ' + safePlace].filter(Boolean).join(', ') || 'sin preferencias'})`, uid());
}
export function reschedule(s, date) {
  if (!canChange(s)) throw new Error('Este envío ya no se puede reprogramar');
  if (!date || date < tomorrowStr()) throw new Error('Elige una fecha desde mañana');
  const max = todayStr(new Date(Date.now() + 14 * 864e5));
  if (date > max) throw new Error('Puedes reprogramar hasta 14 días');
  if (inVan(s)) {
    db.update('shipments', s.id, { request: { kind: 'reprogramar', date, at: iso(Date.now()) } });
    newIncident({ type: 'cambio', shipmentId: s.id, routeId: s.routeId, driverId: db.get('routes', s.routeId)?.driverId, priority: 'media', text: `${s.code} · El destinatario pidió reprogramar para el ${date} (paquete ya en ruta)` });
  } else {
    if (s.routeId) unassign([s.id]);
    db.update('shipments', s.id, { date, request: null });
  }
  db.log('reprogramación', `${s.code}: nueva fecha ${date}`, uid());
}
export function redirectToPoint(s, pointId) {
  const p = db.get('points', pointId);
  if (!canChange(s)) throw new Error('Este envío ya no se puede redirigir');
  if (!p || p.active === false) throw new Error('Elige un punto de retiro activo');
  if (db.count('shipments', x => x.status === 'en_punto' && x.redirectPointId === p.id) >= p.capacity) throw new Error(`${p.name} no tiene casilleros disponibles: elige otro`);
  if (inVan(s)) {
    db.update('shipments', s.id, { request: { kind: 'punto', pointId, at: iso(Date.now()) }, redirectPointId: pointId });
    newIncident({ type: 'cambio', shipmentId: s.id, routeId: s.routeId, driverId: db.get('routes', s.routeId)?.driverId, text: `${s.code} · El destinatario pidió enviarlo a ${p.name} (paquete ya en ruta)` });
  } else {
    if (s.routeId) unassign([s.id]);
    const fresh = get(s.id);
    if (fresh.status === 'creado') db.update('shipments', s.id, { redirectPointId: pointId, nextAction: 'punto' });
    else SHIP.move(db, 'shipments', s.id, 'en_punto', { by: uid(), note: `Redirigido por el destinatario a ${p.name}`, title: x => x.code, log: 'reprogramación', extra: { redirectPointId: pointId, request: null } });
    notify(get(s.id), 'SMS', `Pudú Envíos: tu pedido ${s.code} estará en ${p.name} (${p.address}). Muestra el PIN ${s.pin} para retirarlo.`);
  }
}
export function rate(s, { stars, tags = [], comment = '' }) {
  if (!isDone(s)) throw new Error('Solo puedes evaluar envíos entregados');
  if (s.rating) throw new Error('Este envío ya fue evaluado');
  if (!(stars >= 1 && stars <= 5)) throw new Error('Elige de 1 a 5 estrellas');
  db.update('shipments', s.id, { rating: { stars, tags, comment: comment.trim().slice(0, 300), at: iso(Date.now()) } });
  db.log('evaluación', `${s.code}: ${stars}★`, uid());
  if (stars <= 2) newIncident({ type: 'reclamo', shipmentId: s.id, priority: 'media', text: `${s.code} · Evaluación de ${stars}★${comment ? `: "${comment.trim().slice(0, 120)}"` : ''}` });
}

// ---------- Chat simulado ----------
const AUTO_RECIPIENT = ['¡Perfecto, gracias!', 'Ok, lo espero.', 'Estoy en casa, toque el timbre fuerte.', 'Si no estoy, déjelo con el conserje por favor.', 'Bajo altiro.'];
const AUTO_DRIVER = ['Hola, voy en camino. Estoy a un par de paradas.', 'Recibido, tomo nota. ¡Gracias!', 'Ok, le aviso al llegar.'];
export function sendMessage(s, from, text) {
  text = String(text || '').trim();
  if (!text) throw new Error('Escribe un mensaje');
  if (text.length > 400) throw new Error('Máximo 400 caracteres');
  db.insert('messages', { shipmentId: s.id, from, userId: uid(), text, at: iso(Date.now()) });
  const route = db.get('routes', s.routeId);
  // Respuestas automáticas: el destinatario simulado (si no es la cuenta demo) y los conductores simulados.
  if (from === 'conductor' && !s.rUserId) setTimeout(() => db.insert('messages', { shipmentId: s.id, from: 'destinatario', userId: '', text: AUTO_RECIPIENT[Math.floor(hrand(s.id + text) * AUTO_RECIPIENT.length)], at: iso(Date.now()) }), 2600);
  if (from === 'destinatario' && route?.sim) setTimeout(() => db.insert('messages', { shipmentId: s.id, from: 'conductor', userId: route.driverId, text: AUTO_DRIVER[Math.floor(hrand(s.id + text) * AUTO_DRIVER.length)], at: iso(Date.now()) }), 3000);
}
export const messagesOf = s => db.query('messages', m => m.shipmentId === s.id).sort((a, b) => a.at.localeCompare(b.at));

// ---------- Remitente ----------
export function receiveAtDepot(s) { SHIP.move(db, 'shipments', s.id, 'en_bodega', { by: by(), note: 'Recibido en CD Cerrillos', title: x => x.code, log: 'bodega' }); }
export { companyName, userName };
