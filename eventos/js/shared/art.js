// Ilustraciones SVG generadas: afiches de eventos, código QR de la entrada y mapa del recinto.
// Usan solo tokens del tema (var(--primary), var(--accent)...) para verse bien en los 30 estilos.

let n = 0;
const PAIRS = [
  ['var(--primary)', 'var(--accent)'], ['var(--accent)', 'var(--primary)'], ['var(--primary)', 'var(--info)'],
  ['var(--info)', 'var(--accent)'], ['var(--accent)', 'var(--warning)'], ['var(--success)', 'var(--primary)']
];

// Afiche del evento (16:9). variant = 0..5 cambia colores y motivo.
export function poster(ev, { cls = '' } = {}) {
  const v = (ev.art ?? 0) % 6, id = 'pg' + (++n);
  const [a, b] = PAIRS[v];
  const ink = 'var(--on-primary)';
  const motifs = [
    // Volcán y montañas
    `<path d="M0 225 L90 120 L140 170 L215 70 L250 110 L280 95 L400 225Z" style="fill:${ink};opacity:.22"/><path d="M200 86 l15-16 15 16 q-15 -8 -30 0z" style="fill:${ink};opacity:.45"/><circle cx="325" cy="55" r="22" style="fill:${ink};opacity:.25"/>`,
    // Ondas de sonido
    Array.from({ length: 9 }, (_, i) => `<path d="M0 ${70 + i * 18} C 80 ${30 + i * 18}, 140 ${130 + i * 18}, 200 ${80 + i * 18} S 330 ${40 + i * 18}, 400 ${90 + i * 18}" style="fill:none;stroke:${ink};stroke-width:2;opacity:${.12 + i * .03}"/>`).join(''),
    // Focos de escenario
    `<path d="M70 0 L20 225 L150 225Z" style="fill:${ink};opacity:.14"/><path d="M200 0 L140 225 L260 225Z" style="fill:${ink};opacity:.2"/><path d="M330 0 L250 225 L380 225Z" style="fill:${ink};opacity:.14"/><rect x="0" y="190" width="400" height="35" style="fill:${ink};opacity:.25"/>`,
    // Círculos concéntricos
    Array.from({ length: 6 }, (_, i) => `<circle cx="300" cy="110" r="${20 + i * 26}" style="fill:none;stroke:${ink};stroke-width:3;opacity:${.32 - i * .045}"/>`).join('') + `<circle cx="300" cy="110" r="14" style="fill:${ink};opacity:.4"/>`,
    // Cancha / grilla
    `<rect x="40" y="40" width="320" height="145" rx="6" style="fill:none;stroke:${ink};stroke-width:3;opacity:.3"/><line x1="200" y1="40" x2="200" y2="185" style="stroke:${ink};stroke-width:3;opacity:.3"/><circle cx="200" cy="112" r="28" style="fill:none;stroke:${ink};stroke-width:3;opacity:.3"/>`,
    // Constelación / red
    (() => { const p = [[40, 60], [110, 30], [170, 90], [240, 50], [310, 110], [360, 40], [90, 150], [200, 170], [300, 190]]; return p.map((q, i) => (i ? `<line x1="${p[i - 1][0]}" y1="${p[i - 1][1]}" x2="${q[0]}" y2="${q[1]}" style="stroke:${ink};stroke-width:1.5;opacity:.3"/>` : '')).join('') + p.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="5" style="fill:${ink};opacity:.5"/>`).join(''); })()
  ];
  return `<svg class="poster ${cls}" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Afiche de ${esc(ev.title)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${a}"/><stop offset="1" style="stop-color:${b}"/></linearGradient></defs>
    <rect width="400" height="225" fill="url(#${id})"/>${motifs[v]}</svg>`;
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// Código "QR" determinista a partir del código de la entrada (decorativo, no escaneable).
export function qr(code, { size = 180 } = {}) {
  const N = 29; let s = hash(code);
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const finder = (x, y) => `<path d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  const inF = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  let d = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (inF(x, y)) continue;
    const timing = (x === 6 || y === 6) ? (x + y) % 2 === 0 : rnd() < .48;
    if (timing) d += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg class="qr" viewBox="-2 -2 ${N + 4} ${N + 4}" width="${size}" height="${size}" role="img" aria-label="Código QR de la entrada ${esc(code)}" shape-rendering="crispEdges">
    <rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><g fill="#111">${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}<path d="${d}"/></g></svg>`;
}

// Mini mapa ficticio con el recinto marcado.
export function venueMap(venue) {
  const x = venue.mapX ?? 50, y = venue.mapY ?? 50;
  const px = x * 6, py = y * 3;
  return `<svg class="venue-map" viewBox="0 0 600 300" role="img" aria-label="Mapa de ubicación de ${esc(venue.name)}">
    <rect width="600" height="300" style="fill:var(--surface-2)"/>
    <path d="M0 250 C120 230 200 290 330 262 S 520 230 600 248 V300 H0Z" style="fill:color-mix(in srgb, var(--info) 30%, transparent)"/>
    <rect x="${(px + 140) % 520}" y="40" width="70" height="50" rx="10" style="fill:color-mix(in srgb, var(--success) 28%, transparent)"/>
    <rect x="40" y="${(py + 90) % 200}" width="90" height="40" rx="10" style="fill:color-mix(in srgb, var(--success) 22%, transparent)"/>
    <g style="stroke:var(--line);stroke-width:10;fill:none;stroke-linecap:round">
      <path d="M0 ${py} H600"/><path d="M${px} 0 V300"/><path d="M0 60 L600 ${120 + y}"/><path d="M${(px + 200) % 600} 0 L${(px + 120) % 600} 300"/>
    </g>
    <g style="stroke:var(--surface);stroke-width:2;fill:none;stroke-dasharray:8 8"><path d="M0 ${py} H600"/><path d="M${px} 0 V300"/></g>
    <g transform="translate(${px} ${py})">
      <circle r="34" style="fill:var(--primary);opacity:.18"><animate attributeName="r" values="18;40;18" dur="2.4s" repeatCount="indefinite"/></circle>
      <path d="M0 0 C -14 -18 -16 -26 -16 -32 a16 16 0 0 1 32 0 c0 6 -2 14 -16 32z" style="fill:var(--primary);stroke:var(--surface);stroke-width:2"/>
      <circle cy="-32" r="6" style="fill:var(--on-primary)"/>
    </g>
    <text x="${Math.min(px + 24, 440)}" y="${py - 30}" style="fill:var(--text);font:700 15px var(--font-body)">${esc(venue.name)}</text>
  </svg>`;
}

// Volcán decorativo para el hero (usa currentColor + tokens).
export function volcano() {
  return `<svg class="volcano" viewBox="0 0 600 360" aria-hidden="true">
    <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--primary)"/></linearGradient></defs>
    <circle cx="430" cy="90" r="48" style="fill:var(--accent);opacity:.35"/>
    <path d="M0 360 L120 230 L180 270 L260 170 L300 120 L340 120 L380 170 L470 250 L520 220 L600 290 V360Z" style="fill:url(#vg);opacity:.85"/>
    <path d="M300 120 L340 120 L330 150 L318 138 L308 152Z" style="fill:var(--surface);opacity:.6"/>
    <g style="fill:var(--muted);opacity:.5"><circle cx="318" cy="92" r="16"><animate attributeName="cy" values="100;40" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0" dur="5s" repeatCount="indefinite"/></circle>
    <circle cx="330" cy="70" r="22"><animate attributeName="cy" values="90;20" dur="6s" begin="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0" dur="6s" begin="1.5s" repeatCount="indefinite"/></circle></g>
    <path d="M0 360 L90 300 L170 330 L260 290 L360 320 L460 285 L600 330 V360Z" style="fill:var(--text);opacity:.18"/>
  </svg>`;
}
