// Simulación pura (sin DB): geometría de rutas, duraciones y posiciones en función del tiempo.
// Todas las tabs calculan lo mismo a partir de los datos guardados, así que el mapa del
// despachador, la app del repartidor y el seguimiento público siempre coinciden.
import { COM, jitter, staircase, along, prng, clamp, haversine, round5, doneTo } from '../data/geo.js';

export const WAIT_MS = 10000;
export const ACTIVE_ST = ['pendiente', 'asignado', 'retirado', 'en_camino'];

// Coordenadas de retiro/entrega y ruta entre ambos (deterministas por código).
export function buildGeo(code, from, to) {
  const r = prng(code);
  const a = COM[from] || COM.Santiago, b = COM[to] || COM.Providencia;
  const pickup = jitter(a, r, 0.014);
  let drop = jitter(b, r, 0.014);
  if (from === to) drop = round5([pickup[0] + 0.011, pickup[1] - 0.013]);
  const km = haversine(pickup, drop);
  const route = staircase(pickup, drop, r, clamp(3 + Math.floor(km / 3), 3, 7));
  return { pickup, drop, route };
}

export function transitDuration(km, service, slow) {
  let s = clamp(45 + km * 8, 55, 200) * 1000;
  if (service === 'express') s *= 0.8;
  if (slow) s *= 2.3;
  return Math.round(s);
}
export function preDuration(fromPos, pickup) {
  return Math.round(clamp(25 + haversine(fromPos, pickup) * 7, 30, 90) * 1000);
}
// Compromiso de entrega (SLA) en tiempo de simulación.
export function slaFor(createdMs, km, service) {
  return createdMs + Math.round((25000 + 60000 + WAIT_MS + transitDuration(km, service, false)) * 1.35);
}

// Inicia el tramo activo de un envío desde la posición actual del repartidor.
export function makePlan(s, startPos, t) {
  const r = prng(s.code + ':' + t);
  const start = round5(startPos);
  return {
    start, pre: staircase(start, s.pickup, r, 2), preStart: t, preDur: preDuration(start, s.pickup),
    wait: WAIT_MS, transitStart: null, transitDur: transitDuration(s.km, s.service, s.slow)
  };
}

const T = v => (typeof v === 'number' ? v : Date.parse(v));
export const hasLeg = s => !!(s.plan && s.plan.preStart != null);
export function preFrac(s, t) { return s.plan ? clamp((t - s.plan.preStart) / s.plan.preDur, 0, 1) : 0; }
export function transitFrac(s, t) {
  if (s.status === 'entregado') return 1;
  if (s.status !== 'en_camino' || !s.plan || s.plan.transitStart == null) return 0;
  return clamp((t - s.plan.transitStart) / s.plan.transitDur, 0, 1);
}
export function legPos(s, t) {
  if (s.status === 'entregado' || s.status === 'fallido') return s.drop || null;
  if (!hasLeg(s)) return null;
  if (s.status === 'asignado') return along(s.plan.pre, preFrac(s, t)).pos;
  if (s.status === 'retirado') return s.pickup;
  if (s.status === 'en_camino') return along(s.route, transitFrac(s, t)).pos;
  return null;
}
// Progreso total 0..1 (para barras).
export function progress(s, t) {
  switch (s.status) {
    case 'pendiente': return 0.03;
    case 'asignado': return hasLeg(s) ? 0.06 + 0.24 * preFrac(s, t) : 0.06;
    case 'retirado': return 0.32;
    case 'en_camino': return 0.36 + 0.64 * transitFrac(s, t);
    case 'entregado': return 1;
    default: return 0;
  }
}
export const isNear = (s, t) => s.status === 'en_camino' && transitFrac(s, t) >= 0.8;
// Tiempo restante estimado (ms). queueMs: tiempo de envíos previos del mismo repartidor.
export function etaMs(s, t, queueMs = 0) {
  const p = s.plan;
  const transit = p?.transitDur || transitDuration(s.km || 5, s.service, s.slow);
  switch (s.status) {
    case 'pendiente': return 20000 + 60000 + WAIT_MS + transit;
    case 'asignado': return queueMs + (hasLeg(s) ? Math.max(0, p.preDur - (t - p.preStart)) : 60000) + WAIT_MS + transit;
    case 'retirado': return Math.max(0, WAIT_MS - (t - T(s.pickedAt || t))) + transit;
    case 'en_camino': return Math.max(0, transit - (t - p.transitStart));
    default: return 0;
  }
}
export const isLate = (s, t) => ACTIVE_ST.includes(s.status) && s.slaAt && t > T(s.slaAt);

// Posición de reposo: el repartidor "da vueltas" cerca de su última entrega.
export function idlePos(c, t) {
  const base = c.pos || [-33.44, -70.62];
  if (!c.online) return base;
  const ph = (c.phase || 0) + t / 90000 * Math.PI * 2;
  return [base[0] + Math.sin(ph) * 0.0022, base[1] + Math.cos(ph * 0.8) * 0.0028];
}
export function courierPos(c, shipments, t) {
  const leg = shipments.find(s => s.courierId === c.id && ACTIVE_ST.includes(s.status) && hasLeg(s));
  return leg ? legPos(leg, t) : idlePos(c, t);
}
// Líneas para dibujar el envío en el mapa.
export function shipmentLines(s, t) {
  const out = [];
  if (hasLeg(s) && s.status === 'asignado') {
    out.push({ id: s.id + ':pre', pts: s.plan.pre, kind: 'pre' });
    out.push({ id: s.id + ':pdone', pts: doneTo(s.plan.pre, preFrac(s, t)), kind: 'done' });
  }
  if (s.route) out.push({ id: s.id + ':route', pts: s.route, kind: 'route' });
  if (s.status === 'en_camino' && s.route) out.push({ id: s.id + ':done', pts: doneTo(s.route, transitFrac(s, t)), kind: 'done' });
  if (s.status === 'entregado' && s.route) out.push({ id: s.id + ':done', pts: s.route, kind: 'done' });
  return out;
}
export function fmtEta(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m} min ${String(r).padStart(2, '0')} s` : `${m} min`;
}
