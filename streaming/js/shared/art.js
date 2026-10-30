// Carátulas generadas: degradé de tokens del tema + motivo SVG + hue-rotate por título.
// El título va como texto HTML encima (así no se ve afectado por el filtro de color).
import { escape } from '../../../assets/core/ui.js';

const ink = 'var(--on-primary)';
const MOTIF = {
  montanas: `<path d="M0 180 L70 90 L110 130 L170 50 L230 120 L270 85 L320 180Z" style="fill:${ink};opacity:.22"/><path d="M170 50 l14 18 -9 -3 -5 8 -5-8 -9 3z" style="fill:${ink};opacity:.5"/>`,
  ola: Array.from({ length: 5 }, (_, i) => `<path d="M0 ${110 + i * 16} q40 -22 80 0 t80 0 t80 0 t80 0" style="fill:none;stroke:${ink};stroke-width:5;opacity:${.12 + i * .06}"/>`).join(''),
  ciudad: [[20, 70], [55, 100], [85, 50], [125, 85], [160, 40], [200, 95], [235, 60], [270, 80]].map(([x, h]) => `<rect x="${x}" y="${180 - h}" width="30" height="${h}" style="fill:${ink};opacity:.2"/>`).join('') + Array.from({ length: 14 }, (_, i) => `<rect x="${30 + (i * 23) % 260}" y="${110 + (i * 13) % 50}" width="4" height="5" style="fill:${ink};opacity:.55"/>`).join(''),
  estrellas: Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 53) % 320}" cy="${(i * 37) % 160 + 6}" r="${1 + (i % 3)}" style="fill:${ink};opacity:${.3 + (i % 4) * .15}"/>`).join('') + `<circle cx="250" cy="55" r="26" style="fill:${ink};opacity:.25"/>`,
  bosque: Array.from({ length: 9 }, (_, i) => `<path d="M${10 + i * 36} 180 l18 -${60 + (i % 3) * 25} l18 ${60 + (i % 3) * 25}z" style="fill:${ink};opacity:${.14 + (i % 3) * .06}"/>`).join(''),
  desierto: `<circle cx="240" cy="60" r="30" style="fill:${ink};opacity:.3"/><path d="M0 150 q80 -40 160 0 t160 0 V180 H0z" style="fill:${ink};opacity:.2"/><path d="M60 150 v-40 m0 15 h-10 v-12 m10 20 h10 v-14" style="stroke:${ink};stroke-width:5;fill:none;opacity:.4"/>`,
  faro: `<path d="M150 180 l8 -110 h14 l8 110z" style="fill:${ink};opacity:.35"/><path d="M165 66 L320 20 L320 110Z" style="fill:${ink};opacity:.15"/><rect x="152" y="58" width="26" height="12" style="fill:${ink};opacity:.6"/><path d="M0 165 q50 -12 100 0 t100 0 t120 0 V180H0z" style="fill:${ink};opacity:.25"/>`,
  volcan: `<path d="M20 180 L130 70 L160 70 L280 180Z" style="fill:${ink};opacity:.25"/><path d="M130 70 L160 70 L150 95 L140 85Z" style="fill:${ink};opacity:.5"/><circle cx="148" cy="45" r="14" style="fill:${ink};opacity:.2"/><circle cx="160" cy="25" r="18" style="fill:${ink};opacity:.14"/>`
};
let n = 0;
export function artSVG(t, { anim = false } = {}) {
  const id = 'ag' + (++n), a = t.art || {};
  const [c1, c2] = a.variant % 2 ? ['var(--accent)', 'var(--primary)'] : ['var(--primary)', 'var(--accent)'];
  return `<svg class="art-svg${anim ? ' anim' : ''}" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="filter:hue-rotate(${a.hue || 0}deg)">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="${a.variant > 1 ? 0 : 1}" y2="1"><stop offset="0" style="stop-color:${c1}"/><stop offset="1" style="stop-color:${c2}"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#${id})"/><g class="motif">${MOTIF[a.motif] || MOTIF.montanas}</g></svg>`;
}
// Tarjeta 16:9 con título encima.
export function artCard(t, { title = true, badge = '' } = {}) {
  return `<div class="art">${artSVG(t)}${t.original ? '<span class="art-orig">A+</span>' : ''}${badge}${title ? `<span class="art-title">${escape(t.title)}</span>` : ''}</div>`;
}
