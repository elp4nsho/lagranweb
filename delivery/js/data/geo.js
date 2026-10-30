// Geografía de Santiago para la simulación: comunas, río, avenidas y utilidades de ruta.

// [nombre, zona por defecto, lat, lng, etiqueta visible en el mapa]
export const COMUNAS = [
  ['Santiago', 'A', -33.4489, -70.6693, 1], ['Providencia', 'A', -33.4263, -70.6110, 1], ['Ñuñoa', 'A', -33.4569, -70.5979, 1],
  ['Las Condes', 'A', -33.4110, -70.5560, 1], ['Vitacura', 'A', -33.3900, -70.5720, 1], ['Recoleta', 'A', -33.4050, -70.6410, 1],
  ['Independencia', 'A', -33.4170, -70.6650, 0], ['Estación Central', 'A', -33.4590, -70.6980, 1], ['San Miguel', 'A', -33.4970, -70.6510, 1],
  ['Macul', 'A', -33.4890, -70.5990, 1], ['La Reina', 'A', -33.4450, -70.5390, 1],
  ['Maipú', 'B', -33.5100, -70.7570, 1], ['La Florida', 'B', -33.5220, -70.5980, 1], ['Peñalolén', 'B', -33.4860, -70.5380, 1],
  ['Lo Barnechea', 'B', -33.3500, -70.5180, 1], ['Huechuraba', 'B', -33.3670, -70.6340, 1], ['Quinta Normal', 'B', -33.4280, -70.6970, 1],
  ['Cerrillos', 'B', -33.4960, -70.7160, 1], ['San Joaquín', 'B', -33.4960, -70.6280, 0], ['Conchalí', 'B', -33.3840, -70.6740, 1],
  ['La Cisterna', 'B', -33.5300, -70.6640, 1], ['Lo Prado', 'B', -33.4440, -70.7250, 0], ['Pedro Aguirre Cerda', 'B', -33.4890, -70.6770, 0],
  ['Puente Alto', 'C', -33.6110, -70.5760, 1], ['San Bernardo', 'C', -33.5920, -70.6990, 1], ['Pudahuel', 'C', -33.4400, -70.7640, 1],
  ['Quilicura', 'C', -33.3580, -70.7280, 1], ['Renca', 'C', -33.4060, -70.7270, 1], ['La Pintana', 'C', -33.5830, -70.6340, 1],
  ['El Bosque', 'C', -33.5620, -70.6760, 1], ['Cerro Navia', 'C', -33.4250, -70.7440, 0], ['La Granja', 'C', -33.5400, -70.6250, 0]
].map(([n, z, lat, lng, lbl]) => ({ n, z, lat, lng, lbl: !!lbl }));

export const COM = Object.fromEntries(COMUNAS.map(c => [c.n, c]));
export const HQ = [-33.4263, -70.6110];
export const BOUNDS = { s: -33.65, n: -33.31, w: -70.82, e: -70.48 };

export const MAPOCHO = [[-33.372, -70.505], [-33.386, -70.545], [-33.398, -70.575], [-33.415, -70.605], [-33.425, -70.628], [-33.430, -70.650], [-33.432, -70.675], [-33.438, -70.700], [-33.446, -70.730], [-33.452, -70.770], [-33.46, -70.81]];
export const AVENUES = [
  // Alameda · Providencia · Apoquindo
  [[-33.455, -70.72], [-33.452, -70.70], [-33.444, -70.65], [-33.437, -70.634], [-33.426, -70.611], [-33.416, -70.594], [-33.410, -70.57], [-33.405, -70.545], [-33.400, -70.52]],
  // Vicuña Mackenna
  [[-33.437, -70.634], [-33.48, -70.623], [-33.52, -70.598], [-33.57, -70.583], [-33.61, -70.576]],
  // Gran Avenida
  [[-33.45, -70.655], [-33.50, -70.655], [-33.55, -70.665], [-33.595, -70.695]],
  // Ruta 5
  [[-33.33, -70.705], [-33.42, -70.668], [-33.46, -70.672], [-33.55, -70.69], [-33.64, -70.715]],
  // Costanera / Kennedy
  [[-33.395, -70.515], [-33.405, -70.565], [-33.415, -70.60], [-33.425, -70.63]],
  // Pajaritos
  [[-33.452, -70.70], [-33.48, -70.735], [-33.51, -70.757]]
];
export const VESPUCIO = (() => {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push([-33.462 + Math.sin(a) * 0.098 + Math.sin(a * 3) * 0.006, -70.64 + Math.cos(a) * 0.112]);
  }
  return pts;
})();
export const HILLS = [
  { c: [-33.4245, -70.6300], rx: 0.016, ry: 0.012, n: 'Cerro San Cristóbal' },
  { c: [-33.3980, -70.7530], rx: 0.018, ry: 0.012, n: 'Cerros de Renca' },
  { c: [-33.3600, -70.5550], rx: 0.010, ry: 0.009, n: 'Cerro Manquehue' },
  { c: [-33.4400, -70.5050], rx: 0.020, ry: 0.050, n: 'Precordillera' }
];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function haversine(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// PRNG rápido para rutas (determinista por código de envío).
export function prng(seed) {
  let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const round5 = p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
export function jitter(c, r, amt) { return round5([c.lat + (r() - 0.5) * amt, c.lng + (r() - 0.5) * amt]); }
// Ruta "en escalera" que imita calles en damero.
export function staircase(a, b, r, steps) {
  const pts = [a.slice()];
  let cur = a.slice();
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    const t = i === steps ? b.slice() : [a[0] + (b[0] - a[0]) * f + (r() - 0.5) * 0.005, a[1] + (b[1] - a[1]) * f + (r() - 0.5) * 0.005];
    if (i % 2) { cur = [cur[0], t[1]]; pts.push(cur.slice()); cur = [t[0], t[1]]; }
    else { cur = [t[0], cur[1]]; pts.push(cur.slice()); cur = [t[0], t[1]]; }
    pts.push(cur.slice());
  }
  return pts.map(round5);
}
export function plen(a, b) { const k = Math.cos(a[0] * Math.PI / 180); const dx = (b[1] - a[1]) * k, dy = b[0] - a[0]; return Math.sqrt(dx * dx + dy * dy); }
export function along(pts, f) {
  f = clamp(f, 0, 1);
  if (!pts || !pts.length) return { pos: HQ.slice(), idx: 0 };
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = plen(pts[i - 1], pts[i]); segs.push(l); total += l; }
  const target = total * f; let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target) {
      const t = segs[i] ? (target - acc) / segs[i] : 0, p = pts[i], q = pts[i + 1];
      return { pos: [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], idx: i };
    }
    acc += segs[i];
  }
  return { pos: pts[pts.length - 1].slice(), idx: pts.length - 2 };
}
// Puntos recorridos hasta la fracción f (para pintar el tramo "hecho").
export function doneTo(pts, f) { const a = along(pts, f); return pts.slice(0, a.idx + 1).concat([a.pos]); }
export function nearestComuna(p) {
  let best = COMUNAS[0], bd = Infinity;
  for (const c of COMUNAS) { const d = plen(p, [c.lat, c.lng]); if (d < bd) { bd = d; best = c; } }
  return best.n;
}
export function pathKm(pts) { let k = 0; for (let i = 1; i < pts.length; i++) k += haversine(pts[i - 1], pts[i]); return k; }
