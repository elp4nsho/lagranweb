// Ilustración SVG de un auto de perfil. La carrocería toma el color del dato (hex);
// vidrios, neumáticos y llantas son fijos dentro de la ilustración, el resto usa tokens.
const P = {
  sedan: { x0: 24, x1: 378, ydeck: 88, cr: 116, rr: 168, rf: 248, wb: 292, ybelt: 86, yroof: 50, yhood: 92, wr: 104, wf: 304 },
  coupe: { x0: 26, x1: 378, ydeck: 90, cr: 74, rr: 172, rf: 226, wb: 292, ybelt: 92, yroof: 58, yhood: 102, wr: 100, wf: 304 },
  suv: { x0: 28, x1: 374, ydeck: 62, cr: 34, rr: 58, rf: 262, wb: 304, ybelt: 74, yroof: 34, yhood: 80, wr: 104, wf: 300 },
  wagon: { x0: 22, x1: 378, ydeck: 70, cr: 30, rr: 56, rf: 250, wb: 296, ybelt: 84, yroof: 48, yhood: 92, wr: 104, wf: 304 },
  hatch: { x0: 40, x1: 364, ydeck: 70, cr: 46, rr: 78, rf: 236, wb: 284, ybelt: 84, yroof: 48, yhood: 94, wr: 110, wf: 296 },
  van: { x0: 26, x1: 372, ydeck: 44, cr: 30, rr: 44, rf: 268, wb: 318, ybelt: 70, yroof: 26, yhood: 86, wr: 100, wf: 300 }
};
let n = 0;
export const BODY_LABEL = { sedan: 'Sedán', coupe: 'Coupé', suv: 'SUV', wagon: 'Station wagon', hatch: 'Hatchback', pickup: 'Camioneta', van: 'Furgón' };

function shell(t) {
  if (t === 'pickup') return {
    body: 'M24 124 L24 82 Q24 76 30 76 L156 76 L160 44 Q162 36 170 36 L246 36 C262 36 282 62 292 78 L356 84 Q376 87 376 104 L376 124 Z',
    glass: 'M172 44 L242 44 C254 44 270 62 278 76 L170 76 Z', pillar: 214, wr: 96, wf: 302, deck: 82, hood: 88, x0: 24, x1: 376,
    extra: '<path d="M30 80 L152 80" stroke="rgba(0,0,0,.25)" stroke-width="3"/>'
  };
  const p = P[t] || P.sedan;
  const body = `M${p.x0} 124 L${p.x0} ${p.ydeck + 10} Q${p.x0} ${p.ydeck} ${p.x0 + 14} ${p.ydeck} L${p.cr} ${p.ybelt} C${p.cr + (p.rr - p.cr) * 0.5} ${p.ybelt - 6} ${p.rr - 16} ${p.yroof} ${p.rr + 12} ${p.yroof} L${p.rf} ${p.yroof} C${p.rf + 22} ${p.yroof} ${p.wb - 18} ${p.ybelt - 14} ${p.wb} ${p.ybelt} L${p.x1 - 20} ${p.yhood} Q${p.x1} ${p.yhood + 2} ${p.x1} ${p.yhood + 18} L${p.x1} 124 Z`;
  const g0 = p.cr + 14, gy = p.ybelt - 3;
  const glass = `M${g0} ${gy} C${g0 + (p.rr - p.cr) * 0.4} ${gy - 6} ${p.rr - 10} ${p.yroof + 7} ${p.rr + 14} ${p.yroof + 7} L${p.rf - 2} ${p.yroof + 7} C${p.rf + 16} ${p.yroof + 7} ${p.wb - 26} ${gy - 12} ${p.wb - 12} ${gy} Z`;
  return { body, glass, pillar: Math.round((p.rr + p.rf) / 2 + 8), wr: p.wr, wf: p.wf, deck: p.ydeck, hood: p.yhood, x0: p.x0, x1: p.x1, yroof: p.yroof, ybelt: p.ybelt };
}

function wheel(x) {
  const spokes = Array.from({ length: 5 }, (_, i) => { const a = (i * 72 - 90) * Math.PI / 180; return `<line x1="${x}" y1="122" x2="${(x + Math.cos(a) * 14).toFixed(1)}" y2="${(122 + Math.sin(a) * 14).toFixed(1)}"/>`; }).join('');
  return `<g><circle cx="${x}" cy="122" r="29" fill="#0d0e11"/><circle cx="${x}" cy="122" r="24" fill="#1c1e23"/><circle cx="${x}" cy="122" r="16" fill="#c4c9d1"/>
    <g stroke="#7d8591" stroke-width="3.2" stroke-linecap="round">${spokes}</g><circle cx="${x}" cy="122" r="4" fill="#5b626c"/></g>`;
}

// carArt({ body: 'suv', color: '#1d3557', label, ev })
export function carArt({ body = 'sedan', color = '#5b6474', label = '', ev = false, cls = '' } = {}) {
  const id = 'ca' + (++n);
  const s = shell(body);
  const doorY1 = (s.ybelt || 80) + 4;
  return `<svg class="car-art ${cls}" viewBox="0 0 400 160" role="img" aria-label="${label}">
    <defs><linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4656"/><stop offset="1" stop-color="#11161d"/></linearGradient></defs>
    <ellipse cx="200" cy="150" rx="178" ry="7" class="car-shadow"/>
    <path d="${s.body}" style="fill:${color}"/>
    <path d="${s.body}" fill="url(#${id}h)"/>
    <path d="${s.glass}" fill="url(#${id}g)"/>
    <line x1="${s.pillar}" y1="${(s.yroof ?? 36) + 2}" x2="${s.pillar}" y2="${doorY1}" style="stroke:${color}" stroke-width="7"/>
    ${s.extra || ''}
    <path d="M${s.pillar} ${doorY1} L${s.pillar} 118 M${s.wr + 40} ${doorY1 + 2} L${s.wr + 36} 116" stroke="rgba(0,0,0,.22)" stroke-width="1.6" fill="none"/>
    <rect x="${s.pillar + 18}" y="${doorY1 + 8}" width="16" height="3.5" rx="1.5" fill="rgba(0,0,0,.35)"/>
    <rect x="${s.pillar - 46}" y="${doorY1 + 8}" width="16" height="3.5" rx="1.5" fill="rgba(0,0,0,.35)"/>
    <path d="M${s.x1 - 22} ${s.hood + 4} q12 1 18 8 l-16 1 z" fill="#fff6cf"/>
    <rect x="${s.x0 - 1}" y="${s.deck + 6}" width="8" height="10" rx="2" fill="#d6312b"/>
    <path d="M${s.x0 + 6} 112 L${s.x1 - 6} 112" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
    ${wheel(s.wr)}${wheel(s.wf)}
    ${ev ? `<g transform="translate(${s.pillar - 10} 98)"><circle r="9" class="car-ev"/><path d="M1 -6 L-4 1 L0 1 L-1 6 L4 -1 L0 -1 Z" fill="#fff"/></g>` : ''}
  </svg>`;
}
