// Geografía esquemática (Santiago en km), mapa SVG propio y optimizador de rutas.
// Sin librerías externas: los mapas se dibujan con SVG y tokens del estilo activo.
//
//   cityMap({ points, lines, vehicles, fit, zones })  → string <svg>
//   optimizeRoute(ids, ctx) → { order, before, after }   (vecino más cercano + 2-opt + reubicación)
//   evaluate(ids, ctx)      → { km, end, lateCount, lateMin, legs }

import { escape } from '../../assets/core/ui.js';

// ---------- Proyección: lat/lng → km (x al este, y al sur) ----------
const LNG0 = -70.83, LAT0 = -33.30, KX = 92.9, KY = 111.2;
export const xy = (lat, lng) => [+((lng - LNG0) * KX).toFixed(3), +((LAT0 - lat) * KY).toFixed(3)];
const P = arr => arr.map(([lat, lng]) => xy(lat, lng));

// [nombre, zona, lat, lng, calles]
const RAW = [
  ['Santiago', 'centro', -33.4489, -70.6693, ['San Diego', 'Lord Cochrane', 'Santa Rosa', 'Agustinas', 'Huérfanos', 'Portugal', 'Carmen', 'Lira']],
  ['Estación Central', 'centro', -33.4590, -70.6980, ['Av. Ecuador', 'Las Rejas Norte', 'San Borja', 'Toro Mazote', 'Obispo Umaña']],
  ['Quinta Normal', 'centro', -33.4280, -70.6970, ['Mapocho', 'Carrascal', 'Walker Martínez', 'Samuel Izquierdo']],
  ['Independencia', 'norte', -33.4170, -70.6650, ['Av. Independencia', 'Gamero', 'Maruri', 'Olivos']],
  ['Recoleta', 'norte', -33.4050, -70.6410, ['Av. Recoleta', 'Dominica', 'Zapadores', 'Einstein', 'Valdivieso']],
  ['Conchalí', 'norte', -33.3840, -70.6740, ['Av. Independencia', 'Guanaco', 'Cardenal Caro', 'El Guanaco']],
  ['Huechuraba', 'norte', -33.3670, -70.6340, ['Pedro Fontova', 'Los Libertadores', 'Santa Marta', 'El Bosque Norte']],
  ['Quilicura', 'norte', -33.3580, -70.7280, ['Manuel Antonio Matta', 'Lo Marcoleta', 'San Luis', 'Las Torres']],
  ['Renca', 'norte', -33.4060, -70.7270, ['Domingo Santa María', 'Brasil', 'José Miguel Infante', 'Condell']],
  ['Providencia', 'oriente', -33.4263, -70.6110, ['Av. Providencia', 'Los Leones', 'Manuel Montt', 'Pedro de Valdivia', 'Suecia', 'Holanda', 'Eliodoro Yáñez', 'Ricardo Lyon']],
  ['Ñuñoa', 'oriente', -33.4569, -70.5979, ['Irarrázaval', 'Grecia', 'José Pedro Alessandri', 'Dublé Almeyda', 'Pedro de Oña', 'Ramón Cruz']],
  ['Las Condes', 'oriente', -33.4110, -70.5560, ['Apoquindo', 'Cristóbal Colón', 'Manquehue Sur', 'Los Militares', 'Rosario Norte', 'Isidora Goyenechea']],
  ['Vitacura', 'oriente', -33.3900, -70.5720, ['Vitacura', 'Alonso de Córdova', 'Nueva Costanera', 'Espoz', 'Luis Pasteur']],
  ['La Reina', 'oriente', -33.4450, -70.5390, ['Príncipe de Gales', 'Larraín', 'Echeñique', 'Valenzuela Llanos']],
  ['Lo Barnechea', 'oriente', -33.3500, -70.5180, ['La Dehesa', 'El Rodeo', 'Camino Otoñal', 'Av. Lo Barnechea']],
  ['Macul', 'suroriente', -33.4890, -70.5990, ['Av. Macul', 'Quilín', 'Escuela Agrícola', 'Los Plátanos']],
  ['Peñalolén', 'suroriente', -33.4860, -70.5380, ['Grecia', 'Tobalaba', 'Las Parcelas', 'José Arrieta']],
  ['La Florida', 'suroriente', -33.5220, -70.5980, ['Vicuña Mackenna', 'Walker Martínez', 'Rojas Magallanes', 'La Florida', 'Froilán Roa']],
  ['Puente Alto', 'suroriente', -33.6110, -70.5760, ['Concha y Toro', 'Gabriela Mistral', 'Eyzaguirre', 'Ejército Libertador']],
  ['San Joaquín', 'sur', -33.4960, -70.6280, ['Carlos Valdovinos', 'Santa Rosa', 'Departamental', 'Sebastopol']],
  ['San Miguel', 'sur', -33.4970, -70.6510, ['Gran Avenida', 'Carlos Edwards', 'El Llano Subercaseaux', 'San Nicolás', 'Salesianos']],
  ['La Cisterna', 'sur', -33.5300, -70.6640, ['Gran Avenida', 'Fernández Albano', 'Goycolea', 'El Parrón']],
  ['El Bosque', 'sur', -33.5620, -70.6760, ['Lo Martínez', 'Padre Hurtado', 'Las Acacias', 'San Francisco']],
  ['La Granja', 'sur', -33.5400, -70.6250, ['Santa Rosa', 'Américo Vespucio', 'Coronel', 'San Gregorio']],
  ['San Bernardo', 'sur', -33.5920, -70.6990, ['Eyzaguirre', 'Covadonga', 'América', 'Colón']],
  ['Pedro Aguirre Cerda', 'sur', -33.4890, -70.6770, ['Club Hípico', 'Departamental', 'La Marina', 'Lo Valledor']],
  ['Maipú', 'poniente', -33.5100, -70.7570, ['Pajaritos', '5 de Abril', 'Los Pajaritos', 'Esquina Blanca', 'Américo Vespucio', 'El Rosal']],
  ['Cerrillos', 'poniente', -33.4960, -70.7160, ['Pedro Aguirre Cerda', 'Lo Errázuriz', 'Buzeta', 'Las Torres']],
  ['Pudahuel', 'poniente', -33.4400, -70.7640, ['San Pablo', 'Teniente Cruz', 'La Estrella', 'Serrano']],
  ['Lo Prado', 'poniente', -33.4440, -70.7250, ['San Pablo', 'Neptuno', 'General Bonilla', 'Las Torres']],
  ['Cerro Navia', 'poniente', -33.4250, -70.7440, ['Mapocho', 'Huelén', 'La Estrella', 'Neptuno']]
];
export const COMUNAS = RAW.map(([n, zone, lat, lng, streets]) => { const [x, y] = xy(lat, lng); return { n, zone, x, y, streets }; });
export const COMUNA = Object.fromEntries(COMUNAS.map(c => [c.n, c]));
export const COMUNA_NAMES = COMUNAS.map(c => c.n).sort((a, b) => a.localeCompare(b));

// Centro de distribución (CD Cerrillos)
export const DEPOT = { name: 'CD Cerrillos', address: 'Av. Pedro Aguirre Cerda 6100, Cerrillos', ...(([x, y]) => ({ x, y }))(xy(-33.4865, -70.7020)) };

const AVES = [
  ['Alameda', [[-33.455, -70.725], [-33.452, -70.70], [-33.444, -70.65], [-33.437, -70.634], [-33.426, -70.611], [-33.416, -70.594], [-33.410, -70.57], [-33.405, -70.545], [-33.400, -70.515]]],
  ['Vicuña Mackenna', [[-33.437, -70.634], [-33.48, -70.623], [-33.52, -70.598], [-33.57, -70.583], [-33.615, -70.576]]],
  ['Gran Avenida', [[-33.45, -70.655], [-33.50, -70.655], [-33.55, -70.665], [-33.595, -70.695]]],
  ['Ruta 5', [[-33.33, -70.705], [-33.42, -70.668], [-33.46, -70.672], [-33.55, -70.69], [-33.64, -70.715]]],
  ['Kennedy', [[-33.395, -70.515], [-33.405, -70.565], [-33.415, -70.60], [-33.425, -70.63]]],
  ['Pajaritos', [[-33.452, -70.70], [-33.48, -70.735], [-33.515, -70.762]]],
  ['Irarrázaval', [[-33.453, -70.632], [-33.455, -70.60], [-33.457, -70.565]]],
  ['Tobalaba', [[-33.40, -70.596], [-33.44, -70.585], [-33.49, -70.560], [-33.53, -70.555]]],
  ['Independencia', [[-33.437, -70.655], [-33.40, -70.665], [-33.36, -70.672]]],
  ['San Pablo', [[-33.437, -70.665], [-33.440, -70.72], [-33.444, -70.78]]]
];
export const AVENUES = AVES.map(([name, pts]) => ({ name, pts: P(pts) }));
export const RIVER = P([[-33.372, -70.505], [-33.386, -70.545], [-33.398, -70.575], [-33.415, -70.605], [-33.425, -70.628], [-33.430, -70.650], [-33.432, -70.675], [-33.438, -70.700], [-33.446, -70.730], [-33.452, -70.770], [-33.46, -70.81]]);
export const RING = (() => { const pts = []; for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2; pts.push(xy(-33.462 + Math.sin(a) * 0.098 + Math.sin(a * 3) * 0.006, -70.64 + Math.cos(a) * 0.112)); } return pts; })();
export const PARKS = [
  { n: 'Cerro San Cristóbal', c: xy(-33.4245, -70.6300), rx: 1.5, ry: 1.3 },
  { n: 'Parque O’Higgins', c: xy(-33.4640, -70.6610), rx: .7, ry: .6 },
  { n: 'Cerro Renca', c: xy(-33.3980, -70.7530), rx: 1.6, ry: 1.2 },
  { n: 'Cerro Manquehue', c: xy(-33.3600, -70.5550), rx: .9, ry: .9 },
  { n: 'Parque Intercomunal', c: xy(-33.5550, -70.6600), rx: .6, ry: .5 },
  { n: 'Precordillera', c: xy(-33.4600, -70.5000), rx: 1.8, ry: 5 }
];

// ---------- Distancias ----------
export const ROAD = 1.32; // factor de calles en damero sobre la distancia en línea recta
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * ROAD;
export function nearestComuna(p) {
  let best = COMUNAS[0], bd = Infinity;
  for (const c of COMUNAS) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const hrand = s => (hashStr(String(s)) % 10000) / 10000; // aleatorio determinista por texto
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// ---------- Evaluación de una secuencia de paradas ----------
// ctx: { start: {x,y}, startTime: ms, stop(id) → { x, y, service (min), from?, to? (ms), priority }, speed (km/h),
//        breakAt?: ms, breakMin?: min, back?: {x,y} }
export function evaluate(ids, ctx) {
  const speed = ctx.speed || 24;
  let pos = ctx.start, t = ctx.startTime, km = 0, lateCount = 0, lateMin = 0, waitMin = 0, prio = 0, brk = !!ctx.breakMin && ctx.breakAt != null;
  const legs = [];
  ids.forEach((id, i) => {
    const s = ctx.stop(id);
    if (!s) return;
    const d = dist(pos, s);
    km += d;
    t += (d / speed) * 3600e3;
    let brkAt = null;
    if (brk && t >= ctx.breakAt) { brkAt = t; t += ctx.breakMin * 6e4; brk = false; }
    let wait = 0;
    if (s.from && t < s.from) { wait = (s.from - t) / 6e4; t = s.from; waitMin += wait; }
    const arrive = t, late = s.to && arrive > s.to ? (arrive - s.to) / 6e4 : 0;
    if (late > 0) { lateCount++; lateMin += late; }
    if (s.priority) prio += (i + 1) * s.priority;
    t += (s.service || 4) * 6e4;
    legs.push({ id, km: d, eta: arrive, leave: t, wait, late, brk: brkAt != null, brkAt });
    pos = s;
  });
  let backKm = 0;
  if (ctx.back) { backKm = dist(pos, ctx.back); t += (backKm / speed) * 3600e3; }
  const total = km + backKm;
  return { km: total, kmStops: km, end: t, lateCount, lateMin, waitMin, legs, cost: total + lateMin * 0.6 + waitMin * 0.04 + prio * 0.02 };
}

// ---------- Optimización ----------
// 1) Vecino más cercano desde la posición actual (con preferencia por ventanas que cierran antes y prioridad).
// 2) 2-opt: invierte tramos mientras baje el costo (km + atraso en ventanas + espera + prioridad).
// 3) Reubicación (or-opt de 1 parada) para corregir ventanas horarias.
export function optimizeRoute(ids, ctx, { maxPasses = 40 } = {}) {
  const before = evaluate(ids, ctx);
  if (ids.length < 3) return { order: ids.slice(), before, after: before, changed: false };
  const speed = ctx.speed || 24;
  // 1. Vecino más cercano
  const left = new Set(ids);
  const nn = [];
  let pos = ctx.start, t = ctx.startTime;
  while (left.size) {
    let best = null, bs = Infinity;
    for (const id of left) {
      const s = ctx.stop(id), d = dist(pos, s), arr = t + (d / speed) * 3600e3;
      let score = d;
      if (s.to) score += Math.max(0, (arr - s.to) / 6e4) * 0.5 - Math.max(0, 90 - (s.to - arr) / 6e4) * 0.02; // urge si la ventana cierra pronto
      if (s.from && arr < s.from) score += ((s.from - arr) / 6e4) * 0.05;                            // no llegar antes de que abra
      if (s.priority) score -= s.priority * 0.4;
      if (score < bs) { bs = score; best = id; }
    }
    const s = ctx.stop(best), d = dist(pos, s);
    t += (d / speed) * 3600e3; if (s.from && t < s.from) t = s.from; t += (s.service || 4) * 6e4;
    nn.push(best); left.delete(best); pos = s;
  }
  let order = nn, cur = evaluate(order, ctx).cost;
  // 2. 2-opt + 3. reubicación
  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const cand = order.slice(0, i).concat(order.slice(i, k + 1).reverse(), order.slice(k + 1));
        const c = evaluate(cand, ctx).cost;
        if (c < cur - 1e-6) { order = cand; cur = c; improved = true; }
      }
    }
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order.length; j++) {
        if (i === j) continue;
        const cand = order.slice(); const [x] = cand.splice(i, 1); cand.splice(j, 0, x);
        const c = evaluate(cand, ctx).cost;
        if (c < cur - 1e-6) { order = cand; cur = c; improved = true; }
      }
    }
    if (!improved) break;
  }
  const after = evaluate(order, ctx);
  // Nunca empeorar: si el orden original ya era mejor, se mantiene.
  if (after.cost >= before.cost - 1e-6) return { order: ids.slice(), before, after: before, changed: false };
  return { order, before, after, changed: order.join() !== ids.join() };
}

// ---------- Mapa SVG ----------
// points: [{ x, y, label, kind: 'stop'|'next'|'done'|'fail'|'pickup'|'point'|'home'|'dot', title, id }]
// lines: [{ pts: [{x,y}], kind: 'route'|'done'|'plan'|'leg', color }]
// vehicles: [{ x, y, label, color, title }] · fit: [{x,y}] (encuadre) · zones: { zoneId: color } tiñe comunas
export function cityMap({ points = [], lines = [], vehicles = [], fit = null, zones = null, depot = true, ratio = 1.6, minW = 4, label = 'Mapa', pad = 0.12, labels = true, cls = '' } = {}) {
  const pts = (fit && fit.length ? fit : [...points, ...vehicles, ...(depot ? [DEPOT] : [])]);
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  if (!isFinite(x0)) { x0 = 5; x1 = 30; y0 = 5; y1 = 30; }
  let w = Math.max(minW, x1 - x0), h = Math.max(minW / ratio, y1 - y0);
  w *= 1 + pad * 2; h *= 1 + pad * 2;
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const vb = { x: cx - w / 2, y: cy - h / 2, w, h };
  const s = w / 100; // unidad de dibujo (1 % del ancho)
  const f = n => n.toFixed(2);
  const poly = arr => arr.map(p => `${f(p.x ?? p[0])},${f(p.y ?? p[1])}`).join(' ');
  // Calles menores en damero (solo las que caen en el encuadre)
  const step = w > 18 ? 2 : w > 8 ? 1 : 0.5;
  let grid = '';
  for (let gx = Math.floor(vb.x / step) * step; gx < vb.x + w; gx += step) grid += `M${f(gx)} ${f(vb.y)}V${f(vb.y + h)}`;
  for (let gy = Math.floor(vb.y / step) * step; gy < vb.y + h; gy += step) grid += `M${f(vb.x)} ${f(gy)}H${f(vb.x + w)}`;
  const inView = c => c.x > vb.x - 1 && c.x < vb.x + w + 1 && c.y > vb.y - 1 && c.y < vb.y + h + 1;
  const fs = Math.max(s * 1.9, 0.12);
  let out = `<svg class="rp-map ${cls}" viewBox="${f(vb.x)} ${f(vb.y)} ${f(w)} ${f(h)}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(label)}" style="aspect-ratio:${ratio}">`;
  out += `<rect class="rp-land" x="${f(vb.x)}" y="${f(vb.y)}" width="${f(w)}" height="${f(h)}"/>`;
  if (zones) out += COMUNAS.filter(inView).map(c => zones[c.zone] ? `<circle class="rp-zone" cx="${f(c.x)}" cy="${f(c.y)}" r="2.6" fill="${escape(zones[c.zone])}"/>` : '').join('');
  out += PARKS.map(p => `<ellipse class="rp-park" cx="${f(p.c[0])}" cy="${f(p.c[1])}" rx="${p.rx}" ry="${p.ry}"><title>${escape(p.n)}</title></ellipse>`).join('');
  out += `<path class="rp-street" d="${grid}"/>`;
  out += `<polyline class="rp-ring" points="${poly(RING)}"/>`;
  out += AVENUES.map((a, i) => `<polyline class="rp-ave" id="ave-${i}-${Math.round(vb.x * 10)}" points="${poly(a.pts)}"/>`).join('');
  out += `<polyline class="rp-river" points="${poly(RIVER)}"/>`;
  if (labels) {
    out += AVENUES.map((a, i) => `<text class="rp-avelbl" style="font-size:${f(fs * .8)}px"><textPath href="#ave-${i}-${Math.round(vb.x * 10)}" startOffset="${w > 18 ? 30 : 50}%">${escape(a.name)}</textPath></text>`).join('');
    out += COMUNAS.filter(inView).map(c => `<text class="rp-clbl" x="${f(c.x)}" y="${f(c.y)}" text-anchor="middle" style="font-size:${f(fs)}px">${escape(c.n)}</text>`).join('');
  }
  out += lines.map(l => `<polyline class="rp-line ${l.kind || 'route'}" points="${poly(l.pts)}" ${l.color ? `style="stroke:${escape(l.color)}"` : ''}/>`).join('');
  if (depot) out += `<g class="rp-depot" transform="translate(${f(DEPOT.x)} ${f(DEPOT.y)}) scale(${f(s * .5)})"><title>${escape(DEPOT.name)}</title><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.2"/><path d="M-1.8 1.4V-.6L0-2l1.8 1.4v2z"/></g>`;
  const r = 2.6;
  out += points.map(p => {
    const k = p.kind || 'stop';
    const body = k === 'pickup' ? `<rect class="rp-mk-b" x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" rx=".6"/>`
      : k === 'point' ? `<path class="rp-mk-b" d="M0 ${-r * 1.2}L${r * 1.1} 0 0 ${r * 1.2} ${-r * 1.1} 0z"/>`
      : k === 'home' ? `<path class="rp-mk-b" d="M0 ${-r * 1.3}L${r * 1.2} ${-r * .1}V${r}H${-r * 1.2}V${-r * .1}z"/>`
      : k === 'dot' ? `<circle class="rp-mk-b" r="${r * .55}"/>`
      : `<circle class="rp-mk-b" r="${r}"/>`;
    const txt = p.label != null && k !== 'dot' ? `<text class="rp-mk-t" y="${r * .38}" text-anchor="middle" style="font-size:${r * (String(p.label).length > 2 ? .8 : 1.05)}px">${escape(p.label)}</text>` : '';
    return `<g class="rp-mk ${k}" transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(s * .5)})" ${p.id ? `data-stop="${escape(p.id)}"` : ''} ${p.color ? `style="--mk:${escape(p.color)}"` : ''}>${p.title ? `<title>${escape(p.title)}</title>` : ''}${k === 'next' ? `<circle class="rp-pulse" r="${r * 1.7}"/>` : ''}${body}${txt}</g>`;
  }).join('');
  out += vehicles.map(v => `<g class="rp-veh" transform="translate(${f(v.x)} ${f(v.y)}) scale(${f(s * .55)})" style="--mk:${escape(v.color || 'var(--primary)')}">${v.title ? `<title>${escape(v.title)}</title>` : ''}<circle class="rp-pulse" r="5"/><circle class="rp-veh-b" r="3.4"/><path class="rp-veh-g" d="M-2 -1h2.4l1.2 1.2V1.4H-2z M-1.2 1.9a.55 .55 0 1 0 .01 0 M1 1.9a.55 .55 0 1 0 .01 0"/>${v.label ? `<text class="rp-veh-t" y="-4.6" text-anchor="middle" style="font-size:3px">${escape(v.label)}</text>` : ''}</g>`).join('');
  return out + '</svg>';
}

// Tramo "en escalera" entre dos puntos (imita calles en damero) para dibujar trayectos.
export function stair(a, b) {
  return Math.abs(a.x - b.x) > Math.abs(a.y - b.y) ? [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b] : [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
}
export const pathOf = list => list.reduce((acc, p, i) => (i ? acc.concat(stair(list[i - 1], p).slice(1)) : [p]), []);
