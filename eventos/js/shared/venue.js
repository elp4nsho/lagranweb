// Geometría del recinto y mapa de asientos SVG (sitio público, productor y generador del admin).
import { rowLetter } from '../data/seed.js';

export const ZONE_COLORS = ['var(--primary)', 'var(--accent)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--danger)'];
export const zonesOf = venue => [...new Set(venue.sections.map(s => s.zone))].concat(venue.gaCapacity > 0 ? ['ga'] : []);
export function zoneColor(venue, zone) { const i = zonesOf(venue).indexOf(zone); return ZONE_COLORS[(i < 0 ? 0 : i) % ZONE_COLORS.length]; }
export const seatCount = venue => venue.sections.reduce((s, x) => s + x.rows * x.seats, 0);
export const capacityOf = venue => seatCount(venue) + (+venue.gaCapacity || 0);

// Calcula posiciones: escenario arriba, cancha (general) debajo y secciones en filas centradas.
export function layout(venue, S = 16) {
  const secs = venue.sections.map(s => ({ ...s, w: s.seats * S + 24, h: s.rows * S + 26 }));
  const maxW = Math.max(560, ...secs.map(s => s.w));
  const lines = []; let cur = [], cw = 0;
  secs.forEach(s => { if (cur.length && cw + s.w + 24 > maxW + 1) { lines.push(cur); cur = []; cw = 0; } cur.push(s); cw += s.w + (cur.length > 1 ? 24 : 0); });
  if (cur.length) lines.push(cur);
  const W = maxW + 40;
  let y = 20;
  const stage = { x: W / 2 - 130, y, w: 260, h: 44 }; y += 70;
  let ga = null;
  if (+venue.gaCapacity > 0) { const gw = Math.min(W - 80, 340); ga = { x: W / 2 - gw / 2, y, w: gw, h: 90, label: venue.gaName || 'General' }; y += 112; }
  const out = [];
  lines.forEach(line => {
    const total = line.reduce((s, x) => s + x.w, 0) + (line.length - 1) * 24;
    let x = W / 2 - total / 2; const lh = Math.max(...line.map(s => s.h));
    line.forEach((s, i) => {
      const rot = line.length >= 3 ? (i === 0 ? 7 : i === line.length - 1 ? -7 : 0) : 0;
      const seats = [];
      for (let r = 0; r < s.rows; r++) for (let n = 1; n <= s.seats; n++) seats.push({ id: `${s.id}-${rowLetter(r)}-${n}`, row: rowLetter(r), num: n, cx: x + 12 + (n - .5) * S, cy: y + 22 + (r + .5) * S });
      out.push({ ...s, x, y, rot, seats });
      x += s.w + 24;
    });
    y += lh + 22;
  });
  return { W, H: y + 10, S, stage, ga, sections: out };
}

// states: Map(seatId → 'sold' | 'held' | 'mine'); selected: Set(seatId)
export function seatMapSVG(venue, { states = new Map(), selected = new Set(), interactive = false, tierByZone = {}, gaInfo = '' } = {}) {
  const L = layout(venue);
  const r = L.S * .34;
  const sec = L.sections.map(s => {
    const col = zoneColor(venue, s.zone);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const tier = tierByZone[s.zone];
    const seats = s.seats.map(st => {
      const state = selected.has(st.id) ? 'sel' : states.get(st.id) || 'free';
      const off = !tier && interactive;
      const title = `${s.name} · Fila ${st.row} · Asiento ${st.num}${tier ? ' · ' + tier.label : ''}${state === 'sold' ? ' (vendido)' : state === 'held' ? ' (reservado)' : ''}`;
      return `<circle class="seat s-${off ? 'off' : state}" data-seat="${st.id}" cx="${st.cx.toFixed(1)}" cy="${st.cy.toFixed(1)}" r="${state === 'sel' ? r * 1.15 : r}" style="--z:${col}"${interactive && (state === 'free' || state === 'sel') && !off ? ' tabindex="0" role="button"' : ''}><title>${title}</title></circle>`;
    }).join('');
    const rows = Array.from({ length: s.rows }, (_, i) => `<text class="row-l" x="${s.x + 4}" y="${s.y + 22 + (i + .5) * L.S + 3}">${rowLetter(i)}</text>`).join('');
    return `<g class="sec" ${s.rot ? `transform="rotate(${s.rot} ${cx} ${cy})"` : ''}>
      <rect class="sec-bg" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="8" style="--z:${col}"/>
      <text class="sec-l" x="${cx}" y="${s.y + 14}" text-anchor="middle">${s.name}${tier ? ' · ' + tier.short : ''}</text>${rows}${seats}</g>`;
  }).join('');
  const ga = L.ga ? `<g class="ga-area${interactive && tierByZone.ga ? ' clickable' : ''}" data-ga="1" style="--z:${zoneColor(venue, 'ga')}"><rect x="${L.ga.x}" y="${L.ga.y}" width="${L.ga.w}" height="${L.ga.h}" rx="12"/>
      <text x="${L.ga.x + L.ga.w / 2}" y="${L.ga.y + L.ga.h / 2 - 4}" text-anchor="middle" class="ga-l">${L.ga.label}</text>
      <text x="${L.ga.x + L.ga.w / 2}" y="${L.ga.y + L.ga.h / 2 + 16}" text-anchor="middle" class="ga-s">${gaInfo || `De pie · ${venue.gaCapacity} personas`}</text></g>` : '';
  return `<svg class="seatmap" viewBox="0 0 ${L.W} ${L.H}" role="group" aria-label="Mapa de asientos de ${venue.name}">
    <rect class="stage" x="${L.stage.x}" y="${L.stage.y}" width="${L.stage.w}" height="${L.stage.h}" rx="6"/>
    <text class="stage-l" x="${L.W / 2}" y="${L.stage.y + 28}" text-anchor="middle">ESCENARIO</text>${ga}${sec}</svg>`;
}

export function seatInfo(venue, seatId) {
  const [sid, row, num] = seatId.split('-');
  const s = venue.sections.find(x => x.id === sid);
  return s ? { section: s, row, num: +num, zone: s.zone, label: `${s.name} · Fila ${row} · Asiento ${num}` } : null;
}
