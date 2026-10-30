// Ilustración SVG paramétrica de autos: 4 carrocerías × 3 vistas (lateral, frontal, trasera).
// La pintura viene de los datos (color del modelo); lo demás son tonos neutros de ilustración.
let seq = 0;
const GLASS_TOP = '#33475a', GLASS_BOT = '#0d1620', TIRE = '#15171a', DARK = '#1b1e22';
const RIMS = { silver: ['#cfd4db', '#3b3f45'], black: ['#30343a', '#0c0d0f'], two: ['#e4e7eb', '#55595f'], graphite: ['#858b93', '#2a2d31'] };

function hexRgb(h) { const x = String(h).replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map(c => c + c).join('') : x, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function shade(hex, f) { // f<0 oscurece, f>0 aclara
  const [r, g, b] = hexRgb(hex);
  const m = c => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
export const isLight = hex => { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000 > 150; };

const SIDE = {
  sedan: { r: 24, cy: 134, w: [100, 300],
    body: 'M24 128C20 112 26 102 44 99L104 94C126 78 148 64 172 59C200 54 236 54 258 58C278 62 298 78 314 91L360 98C377 101 384 110 382 122L380 134L330 134A30 30 0 0 0 270 134L130 134A30 30 0 0 0 70 134L26 134Z',
    glass: 'M118 94C136 80 154 68 174 64C200 60 232 60 254 63C270 67 288 80 300 92Z', pillars: [208],
    lines: 'M150 97L152 130M212 96L212 130M292 93C296 106 294 116 288 124', handles: [188, 256], hy: 104,
    head: 'M356 100L379 105L378 112L360 110Z', tail: 'M25 108L44 102L46 110L26 116Z', mirror: 'M296 90L309 86L313 95L300 97Z', belt: 'M44 100L358 101', rocker: 'M130 126L270 126L270 134L130 134Z', grille: 'M362 124L381 124L380 132L360 132Z' },
  hatch: { r: 23, cy: 135, w: [105, 285],
    body: 'M40 130C38 112 40 92 52 80C66 66 92 58 122 56L222 56C244 58 264 72 282 86L330 94C346 97 354 106 352 120L350 135L313 135A29 29 0 0 0 257 135L133 135A29 29 0 0 0 77 135L42 135Z',
    glass: 'M60 92C64 76 90 64 122 62L218 62C238 64 256 76 270 90Z', pillars: [90, 166],
    lines: 'M168 95L168 132M254 92C260 104 260 116 254 128', handles: [148, 228], hy: 102,
    head: 'M328 96L350 102L349 108L332 106Z', tail: 'M41 96L50 92L52 106L42 108Z', mirror: 'M268 87L280 83L284 91L272 93Z', belt: 'M50 93L330 97', rocker: 'M133 127L257 127L257 135L133 135Z', grille: 'M334 124L352 124L351 132L332 132Z' },
  suv: { r: 27, cy: 131, w: [98, 304],
    body: 'M22 126C20 104 24 86 34 78L50 52C54 45 62 42 74 42L238 42C256 44 272 58 290 76L352 86C372 90 380 100 380 114L378 131L338 131A34 34 0 0 0 270 131L132 131A34 34 0 0 0 64 131L24 131Z',
    glass: 'M52 80L66 52C68 49 72 48 78 48L234 48C248 50 264 64 278 80Z', pillars: [130, 204],
    lines: 'M134 84L134 128M208 84L208 128M284 80C292 96 292 108 288 118', handles: [176, 250], hy: 92,
    head: 'M352 90L378 96L377 103L356 100Z', tail: 'M23 88L36 82L38 98L24 102Z', mirror: 'M282 78L294 74L298 83L286 85Z', belt: 'M34 82L354 88', rocker: 'M24 121L378 121L378 131L24 131Z', grille: 'M358 118L380 118L379 128L356 128Z', rails: 'M74 39L232 39', clad: true },
  pickup: { r: 27, cy: 131, w: [96, 308],
    body: 'M20 126L18 84L168 84L172 52C174 45 180 42 190 42L248 42C264 44 278 58 294 76L354 86C373 90 381 100 381 114L379 131L342 131A34 34 0 0 0 274 131L130 131A34 34 0 0 0 62 131L22 131Z',
    glass: 'M180 80L184 52C185 49 188 48 192 48L244 48C256 50 270 64 282 80Z', pillars: [226],
    lines: 'M168 84L168 128M228 84L228 128M288 80C296 96 296 108 292 118', handles: [204, 262], hy: 92,
    head: 'M354 90L380 96L379 103L358 100Z', tail: 'M19 90L28 90L28 106L19 106Z', mirror: 'M286 78L298 74L302 83L290 85Z', belt: 'M20 88L356 88', rocker: 'M22 121L379 121L379 131L22 131Z', grille: 'M360 118L381 118L380 128L358 128Z', bed: 'M18 84L168 84', clad: true }
};
const FRONT = { sedan: { W: 128, roof: 58, belt: 94 }, hatch: { W: 120, roof: 52, belt: 90 }, suv: { W: 136, roof: 38, belt: 82 }, pickup: { W: 140, roof: 38, belt: 84 } };

function wheel(cx, cy, r, style = 'std', rim = 'silver') {
  const [face, barrel] = RIMS[rim] || RIMS.silver, rr = r * .64;
  let spokes = '';
  const spoke = (a, w, len = rr) => `<path d="M${cx - w / 2} ${cy}L${cx - w * .35} ${cy - len}L${cx + w * .35} ${cy - len}L${cx + w / 2} ${cy}Z" transform="rotate(${a} ${cx} ${cy})"/>`;
  if (style === 'aero') spokes = `<circle cx="${cx}" cy="${cy}" r="${rr * .96}"/>` + [0, 120, 240].map(a => `<path d="M${cx} ${cy - rr * .3}Q${cx + rr * .6} ${cy - rr * .7} ${cx + rr * .2} ${cy - rr * .92}" stroke="${barrel}" stroke-width="${r * .12}" fill="none" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
  else if (style === 'sport') spokes = Array.from({ length: 10 }, (_, k) => spoke(k * 36, r * .1)).join('');
  else if (style === 'multi') spokes = Array.from({ length: 6 }, (_, k) => spoke(k * 60 - 7, r * .09) + spoke(k * 60 + 7, r * .09)).join('');
  else spokes = Array.from({ length: 5 }, (_, k) => spoke(k * 72, r * .2)).join('');
  return `<g class="wheel"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${TIRE}"/><circle cx="${cx}" cy="${cy}" r="${r - 2.5}" fill="none" stroke="#2c3035" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${rr}" fill="${barrel}"/>${style === 'sport' ? `<rect x="${cx + rr * .25}" y="${cy - rr * .55}" width="${rr * .32}" height="${rr * .7}" rx="2" fill="#c1121f"/>` : ''}
    <g class="spin" fill="${face}">${spokes}<circle cx="${cx}" cy="${cy}" r="${rr * .26}"/></g><circle cx="${cx}" cy="${cy}" r="${rr * .1}" fill="${barrel}"/></g>`;
}

function defs(id, paint) {
  return `<defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GLASS_TOP}"/><stop offset="1" stop-color="${GLASS_BOT}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".32" stop-color="#fff" stop-opacity=".06"/><stop offset=".58" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>
    <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(paint, -.12)}"/><stop offset=".5" stop-color="${paint}"/><stop offset="1" stop-color="${shade(paint, -.08)}"/></linearGradient>
  </defs>`;
}
const shadow = (cx, w) => `<ellipse class="car-shadow" cx="${cx}" cy="159" rx="${w}" ry="7" fill="#000" opacity=".16"/>`;

function side(body, paint, wh, id) {
  const g = SIDE[body] || SIDE.sedan, dark = shade(paint, -.35);
  return `${shadow(200, 182)}
    <path d="${g.body}" fill="url(#${id}p)"/>
    ${g.clad ? `<path d="${g.rocker}" fill="${DARK}" opacity=".55"/>` : `<path d="${g.rocker}" fill="#000" opacity=".22"/>`}
    <path d="${g.glass}" fill="url(#${id}g)"/>
    <path d="${g.glass}" fill="#fff" opacity=".08" transform="translate(6 2) scale(.96 .9)"/>
    <clipPath id="${id}gc"><path d="${g.glass}"/></clipPath><g clip-path="url(#${id}gc)">${g.pillars.map(x => `<rect x="${x}" y="40" width="7" height="60" fill="${shade(paint, -.18)}"/>`).join('')}</g>
    <path d="${g.body}" fill="url(#${id}s)"/>
    <path d="${g.lines}" stroke="${dark}" stroke-width="1.4" fill="none" opacity=".75"/>
    <path d="${g.belt}" stroke="#fff" stroke-width="1.6" opacity=".28" fill="none"/>
    ${g.rails ? `<path d="${g.rails}" stroke="${DARK}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
    ${g.bed ? `<path d="${g.bed}" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>` : ''}
    ${g.handles.map(x => `<rect x="${x}" y="${g.hy}" width="15" height="3.2" rx="1.6" fill="${dark}"/>`).join('')}
    <path d="${g.mirror}" fill="${shade(paint, -.1)}" stroke="${dark}" stroke-width=".8"/>
    <path d="${g.head}" fill="#fff6cf" stroke="#9aa1a8" stroke-width=".8"/>
    <path d="${g.tail}" fill="#c1121f" stroke="#5a0a10" stroke-width=".8"/>
    <path d="${g.grille}" fill="${DARK}"/>
    ${g.clad ? g.w.map(x => `<path d="M${x - g.r - 7} ${g.cy}A${g.r + 7} ${g.r + 7} 0 0 1 ${x + g.r + 7} ${g.cy}" fill="none" stroke="${DARK}" stroke-width="6"/>`).join('') : ''}
    ${g.w.map(x => `<path d="M${x - g.r - 5} ${g.cy}A${g.r + 5} ${g.r + 5} 0 0 1 ${x + g.r + 5} ${g.cy}Z" fill="#08090a"/>`).join('')}
    ${g.w.map(x => wheel(x, g.cy, g.r, wh.style, wh.rim)).join('')}`;
}

function frontRear(body, paint, id, rear, plate, ev) {
  const { W, roof, belt } = FRONT[body] || FRONT.sedan, L = 200 - W, R = 200 + W, dark = shade(paint, -.35);
  const tires = `<rect x="${L + 8}" y="122" width="36" height="38" rx="8" fill="${TIRE}"/><rect x="${R - 44}" y="122" width="36" height="38" rx="8" fill="${TIRE}"/>`;
  const house = `M${L + 16} ${belt}L${L + 40} ${roof + 6}Q${L + 44} ${roof} ${L + 52} ${roof}L${R - 52} ${roof}Q${R - 44} ${roof} ${R - 40} ${roof + 6}L${R - 16} ${belt}Z`;
  const glass = `M${L + 25} ${belt - 2}L${L + 45} ${roof + 8}L${R - 45} ${roof + 8}L${R - 25} ${belt - 2}Z`;
  const lower = `M${L} ${belt + 10}Q${L} ${belt} ${L + 12} ${belt - 2}L${R - 12} ${belt - 2}Q${R} ${belt} ${R} ${belt + 10}L${R} 140Q${R} 147 ${R - 7} 147L${L + 7} 147Q${L} 147 ${L} 140Z`;
  const mirrors = `<ellipse cx="${L - 2}" cy="${belt - 6}" rx="11" ry="6" fill="${paint}" stroke="${dark}"/><ellipse cx="${R + 2}" cy="${belt - 6}" rx="11" ry="6" fill="${paint}" stroke="${dark}"/>`;
  const plateEl = (y, w = 58) => `<rect x="${200 - w / 2}" y="${y}" width="${w}" height="15" rx="2" fill="#f4f5f6" stroke="#333" stroke-width="1"/><text x="200" y="${y + 11}" text-anchor="middle" font-family="monospace" font-size="9.5" font-weight="700" fill="#111">${plate}</text>`;
  const lamp = rear
    ? `<path d="M${L + 6} ${belt + 12}L${L + 62} ${belt + 12}L${L + 60} ${belt + 25}L${L + 8} ${belt + 27}Z" fill="#c1121f" stroke="#5a0a10"/>`
    : `<path d="M${L + 10} ${belt + 13}L${L + 60} ${belt + 17}L${L + 58} ${belt + 29}L${L + 12} ${belt + 27}Z" fill="#fff6cf" stroke="#9aa1a8"/><path d="M${L + 16} ${belt + 19}L${L + 54} ${belt + 21}" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
  const lamps = `${lamp}<g transform="translate(400 0) scale(-1 1)">${lamp}</g>`;
  const middle = rear
    ? `${ev || body === 'suv' ? `<rect x="${L + 60}" y="${belt + 15}" width="${2 * W - 120}" height="4" rx="2" fill="#8e0f19"/>` : ''}
       <circle cx="200" cy="${belt + 8}" r="5" fill="#d9dde3"/>${plateEl(belt + 28)}
       <rect x="${L + 6}" y="134" width="${2 * W - 12}" height="10" rx="4" fill="${DARK}" opacity=".85"/>
       ${ev ? '' : `<ellipse cx="${L + 34}" cy="146" rx="9" ry="3.5" fill="#0a0a0a" stroke="#888"/>`}
       ${body === 'pickup' ? `<path d="M${L + 14} ${belt + 2}L${R - 14} ${belt + 2}" stroke="${dark}" stroke-width="1.5"/>` : ''}`
    : `<rect x="152" y="${belt + 14}" width="96" height="26" rx="7" fill="${DARK}"/>${ev ? `<rect x="152" y="${belt + 14}" width="96" height="26" rx="7" fill="${paint}" opacity=".9"/>` : [0, 1, 2, 3].map(k => `<path d="M158 ${belt + 20 + k * 5.5}L242 ${belt + 20 + k * 5.5}" stroke="#3a3f46" stroke-width="2"/>`).join('')}
       <circle cx="200" cy="${belt + 27}" r="6" fill="#d9dde3" stroke="#777"/>
       <rect x="${L + 22}" y="${belt + 46}" width="${2 * W - 44}" height="9" rx="4" fill="${DARK}"/>${plateEl(132, 50)}
       <path d="M${L + 22} ${belt + 6}Q200 ${belt + 1} ${R - 22} ${belt + 6}" stroke="${dark}" stroke-width="1.2" fill="none"/>`;
  return `${shadow(200, W + 18)}${tires}<path d="${house}" fill="${paint}"/><path d="${glass}" fill="url(#${id}g)"/>
    <path d="M${L + 50} ${roof + 10}L${L + 70} ${roof + 10}L${L + 40} ${belt - 4}L${L + 30} ${belt - 4}Z" fill="#fff" opacity=".1"/>
    ${body === 'suv' ? `<rect x="${L + 46}" y="${roof - 4}" width="14" height="4" fill="${DARK}"/><rect x="${R - 60}" y="${roof - 4}" width="14" height="4" fill="${DARK}"/>` : ''}
    ${mirrors}<path d="${lower}" fill="url(#${id}p)"/><path d="${lower}" fill="url(#${id}s)"/>${lamps}${middle}`;
}

// carSVG({ body, paint, view: 'side'|'front'|'rear', wheel: {style, rim}, plate, fuel })
export function carSVG({ body = 'sedan', paint = '#9aa0a6', view = 'side', wheel: wh = {}, plate = 'AUTO·26', fuel = '', cls = '', title = '' } = {}) {
  const id = 'car' + (++seq);
  const inner = view === 'side' ? side(body, paint, wh, id) : frontRear(body, paint, id, view === 'rear', plate, fuel === 'electrico');
  return `<svg class="car-svg ${cls}" viewBox="0 0 400 172" role="img" aria-label="${title || 'Ilustración del auto'}" xmlns="http://www.w3.org/2000/svg">${defs(id, paint)}${inner}</svg>`;
}
export const carOf = (m, colorHex, opts = {}) => carSVG({ body: m.body, paint: colorHex || m.colors[0]?.hex, fuel: m.fuel, title: m.name, wheel: { style: m.fuel === 'electrico' ? 'aero' : 'std', rim: 'silver' }, ...opts });

// Diagrama de paneles para cotizar desabolladura y pintura (vista lateral sedán)
export const PANELS = [['parachoques_tras', 'Parachoques trasero', 18, 48], ['maleta', 'Tapa de maleta y guardabarro trasero', 48, 140], ['puerta_tras', 'Puerta trasera', 140, 212], ['puerta_del', 'Puerta delantera', 212, 292], ['guardabarro_del', 'Guardabarro delantero', 292, 340], ['capo', 'Capó', 300, 362, 1], ['parachoques_del', 'Parachoques delantero', 352, 386], ['techo', 'Techo', 150, 270, 1]];
export function panelsSVG(selected = [], paint = '#b9bdc3') {
  const id = 'pn' + (++seq), g = SIDE.sedan;
  const zones = PANELS.map(([k, label, x1, x2, top]) => {
    const y1 = top ? (k === 'techo' ? 40 : 80) : (k === 'techo' ? 40 : 40), y2 = top ? (k === 'techo' ? 64 : 98) : 140;
    return `<rect fill="transparent" class="panel-zone ${selected.includes(k) ? 'on' : ''}" data-part="${k}" x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" clip-path="url(#${id}c)" tabindex="0" role="button" aria-label="${label}"><title>${label}</title></rect>`;
  });
  // las zonas "superiores" (capó, techo) se dibujan al final para quedar encima
  const order = [...zones.filter((_, i) => !PANELS[i][4]), ...zones.filter((_, i) => PANELS[i][4])];
  return `<svg class="car-svg panels-svg" viewBox="0 0 400 172" xmlns="http://www.w3.org/2000/svg">${defs(id, paint)}<clipPath id="${id}c"><path d="${g.body}"/></clipPath>${side('sedan', paint, { style: 'std' }, id)}${order.join('')}</svg>`;
}
