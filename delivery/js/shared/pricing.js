// Tarifas: valores por defecto (semilla) y cotizador. El panel edita `pricing` y el
// cotizador público se recalcula al instante.
import { COMUNAS, COM, haversine } from '../data/geo.js';

export const DEFAULT_PRICING = {
  perKm: 390,
  minPrice: 2990,
  courierShare: 70,
  sizes: {
    S: { name: 'Sobre', max: '1 kg · documentos', base: 2490, box: [18, 12] },
    M: { name: 'Pequeño', max: '5 kg · caja de zapatos', base: 3490, box: [22, 16] },
    L: { name: 'Mediano', max: '15 kg · caja de mudanza', base: 4990, box: [28, 20] },
    XL: { name: 'Grande', max: '30 kg · requiere furgón', base: 7990, box: [34, 24] }
  },
  services: {
    estandar: { name: 'Estándar', desc: 'Mismo día', mult: 1, extraPickup: 15, active: true },
    express: { name: 'Express', desc: 'Directo, sin paradas', mult: 1.45, extraPickup: 0, active: true },
    programado: { name: 'Programado', desc: 'Mañana, por bloque', mult: 0.85, extraPickup: 25, active: true }
  },
  zones: {
    A: { name: 'Zona A · Centro-Oriente', extra: 0, pickup: 20 },
    B: { name: 'Zona B · Anillo intermedio', extra: 600, pickup: 30 },
    C: { name: 'Zona C · Periferia', extra: 1400, pickup: 45 }
  },
  comunaZone: Object.fromEntries(COMUNAS.map(c => [c.n, c.z])),
  rules: [
    { id: 'r1', name: 'Recargo por lluvia', kind: 'lluvia', pct: 15, active: false },
    { id: 'r2', name: 'Recargo nocturno (21:00–07:00)', kind: 'nocturno', pct: 20, active: true },
    { id: 'r3', name: 'Descuento cuentas empresa', kind: 'empresa', pct: -10, active: true },
    { id: 'r4', name: 'Promo primer envío RAYO10', kind: 'promo', pct: -10, active: false }
  ]
};

export const ZONE_KEYS = ['A', 'B', 'C'];
export const zoneOf = (pricing, comuna) => pricing.comunaZone?.[comuna] || null;
export const coveredComunas = pricing => COMUNAS.filter(c => zoneOf(pricing, c.n));

export function kmBetween(from, to) {
  const a = COM[from], b = COM[to];
  if (!a || !b) return 0;
  return Math.round(Math.max(1.8, haversine([a.lat, a.lng], [b.lat, b.lng]) * 1.35) * 10) / 10;
}

// opts: { business: bool, at: Date, first: bool }
export function quote(pricing, from, to, size = 'M', service = 'estandar', opts = {}) {
  const za = zoneOf(pricing, from), zb = zoneOf(pricing, to);
  if (!za || !zb) return null;
  const sz = pricing.sizes[size] || pricing.sizes.M;
  const sv = pricing.services[service] || pricing.services.estandar;
  const km = kmBetween(from, to);
  const zone = [za, zb].sort().pop();
  const zoneExtra = pricing.zones[zone]?.extra || 0;
  const subtotal = (sz.base + km * pricing.perKm + zoneExtra) * sv.mult;
  const at = opts.at ? new Date(opts.at) : new Date();
  const h = at.getHours();
  const applied = [];
  for (const r of pricing.rules || []) {
    if (!r.active) continue;
    const ok = r.kind === 'lluvia' || (r.kind === 'nocturno' && (h >= 21 || h < 7)) || (r.kind === 'empresa' && opts.business) || (r.kind === 'promo' && opts.first);
    if (ok) applied.push(r);
  }
  const pct = applied.reduce((s, r) => s + Number(r.pct || 0), 0);
  let price = subtotal * (1 + pct / 100);
  price = Math.max(pricing.minPrice, Math.round(price / 10) * 10);
  const pickupMin = (pricing.zones[za]?.pickup || 30) + (sv.extraPickup || 0);
  const transitMin = Math.round(6 + km * (service === 'express' ? 2.1 : 2.7) * (size === 'XL' ? 1.15 : 1));
  return {
    km, zone, price, pickupMin, transitMin, totalMin: pickupMin + 4 + transitMin,
    breakdown: { base: sz.base, perKm: Math.round(km * pricing.perKm), zoneExtra, mult: sv.mult, rules: applied.map(r => ({ name: r.name, pct: r.pct })) }
  };
}
