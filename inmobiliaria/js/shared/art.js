// Ilustraciones SVG: íconos, fotos de propiedad (placeholders con tokens), plano y mapa de comunas.
import { escape } from '../../../assets/core/ui.js';
import { COMUNAS, OUTLINE, comunaCells } from './geo.js';

const ICONS = {
  bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M3 18v2M21 18v2M7 9V6h4v3"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
  area: '<path d="M4 4h16v16H4zM4 9h5M15 4v5M9 20v-5h11"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 13h.01M17 13h.01"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  compare: '<path d="M8 3v18M16 3v18M3 8h5M16 16h5M3 16h5M16 8h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  building: '<path d="M4 21V5l8-3v19M12 8h8v13M8 7h.01M8 11h.01M8 15h.01M16 12h.01M16 16h.01M2 21h20"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>', chevR: '<path d="m9 6 6 6-6 6"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-3.8M8.2 13l7.6 3.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'
};
export const icon = (name, size = 18) => `<svg class="ico-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// Combinaciones de tokens para variar las "fotos" sin colores fijos.
const NODATA = 'color-mix(in srgb, var(--text) 10%, var(--bg))';
const MIX = [['--primary', '--accent', 70], ['--accent', '--primary', 75], ['--primary', '--info', 60], ['--info', '--accent', 65], ['--success', '--primary', 55], ['--warning', '--primary', 50]];
let gid = 0;
const SCENES = ['fachada', 'living', 'cocina', 'dormitorio', 'bano', 'vista'];
export const sceneLabels = { fachada: 'Fachada', living: 'Living-comedor', cocina: 'Cocina', dormitorio: 'Dormitorio principal', bano: 'Baño', vista: 'Vista', plano: 'Plano' };

export function scenesFor(p) {
  if (p.type === 'terreno') return ['fachada', 'vista'];
  if (p.type === 'oficina' || p.type === 'local') return ['fachada', 'living', 'bano', 'vista'];
  return SCENES.slice();
}

function sceneArt(scene, type) {
  const L = 'stroke="var(--on-primary)" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="var(--on-primary)" opacity=".16"';
  switch (scene) {
    case 'fachada':
      if (type === 'casa') return `<path ${F} d="M90 250V140l110-70 110 70v110z"/><g ${L}><path d="M70 150 200 66l130 84M90 140v110h220V140M180 250v-60h40v60M115 165h40v35h-40zM245 165h40v35h-40z"/><path d="M290 108V70h18v50"/></g><path ${F} d="M0 250h400v10H0z"/>`;
      if (type === 'terreno') return `<path ${F} d="M0 200q100-60 200-20t200-10v90H0z"/><g ${L}><path d="M0 210q100-60 200-20t200-10M60 205v-30M50 185l10-20 10 20zM330 190v-40M318 170l12-26 12 26zM150 230h80M150 230v-30h80v30"/></g>`;
      if (type === 'local') return `<path ${F} d="M60 110h280v140H60z"/><g ${L}><path d="M60 110h280v140H60zM60 110l20-30h240l20 30M90 150h120v100H90zM230 150h80v60h-80zM100 80v30M140 80v30M180 80v30M220 80v30M260 80v30M300 80v30"/></g>`;
      return `<path ${F} d="M120 40h160v220H120z"/><g ${L}><path d="M120 40h160v220H120zM60 120h60v140M280 100h70v160M185 220h30v40h-30z"/>${[0, 1, 2, 3, 4].map(r => [0, 1, 2].map(c => `<rect x="${138 + c * 46}" y="${58 + r * 32}" width="30" height="18"/>`).join('')).join('')}<path d="M75 140h30M75 170h30M75 200h30M295 125h40M295 155h40M295 185h40M295 215h40"/></g>`;
    case 'living':
      return `<path ${F} d="M40 60h130v100H40z"/><g ${L}><path d="M40 60h130v100H40zM105 60v100M40 110h130M210 200h150M215 200v-40a12 12 0 0 1 12-12h116a12 12 0 0 1 12 12v40M225 200v20M345 200v20M200 175h20v25M350 175h20v25M90 250v-60M70 190h40l-8-30H78z"/><circle cx="300" cy="70" r="16"/><path d="M300 54V30"/></g><path ${F} d="M0 230h400v30H0z"/>`;
    case 'cocina':
      return `<g ${L}><path d="M40 140h320M40 140v110M360 140v110M40 195h320M110 140v110M180 140v110M250 140v110M60 60h120v50H60zM220 60h120v50H220zM120 165h8M190 165h8M260 165h8M130 220h8M280 125v15M268 125h24"/><circle cx="300" cy="125" r="0"/></g><path ${F} d="M40 140h320v110H40z"/><g ${L}><path d="M270 130c0-8 20-8 20 0"/></g>`;
    case 'dormitorio':
      return `<path ${F} d="M80 170h240v60H80z"/><g ${L}><path d="M80 230v-60h240v60M80 200h240M80 170v-50h240v50M100 170v-25a10 10 0 0 1 10-10h60a10 10 0 0 1 10 10v25M220 170v-25a10 10 0 0 1 10-10h60a10 10 0 0 1 10 10v25M80 230v18M320 230v18M30 160h40v70H30zM50 160v-30M38 130h24l-6-22H44z"/><rect x="250" y="40" width="100" height="60"/><path d="M300 40v60M250 70h100"/></g>`;
    case 'bano':
      return `<path ${F} d="M60 170h200v50H60z"/><g ${L}><path d="M50 170h220M60 170v30a20 20 0 0 0 20 20h160a20 20 0 0 0 20-20v-30M80 220l-10 25M240 220l10 25M80 170v-90a20 20 0 0 1 40 0M120 82h12M300 70h60v80h-60zM330 150v95M310 245h40"/><circle cx="330" cy="110" r="18"/></g>`;
    default:
      return `<path ${F} d="M0 200 70 120l50 50 90-110 80 90 40-40 70 80v70H0z"/><g ${L}><path d="M0 200 70 120l50 50 90-110 80 90 40-40 70 80M180 98l30-38 25 28M40 230h40v30M100 215h30v45M150 225h50v35M220 205h30v55M270 220h45v40M330 210h30v50"/></g><circle cx="330" cy="50" r="18" fill="var(--on-primary)" opacity=".5"/>`;
  }
}

export function propertyArt(p, scene = 'fachada', { label = true } = {}) {
  const [a, b, pct] = MIX[(p.art || 0) % MIX.length];
  const id = 'g' + (++gid);
  return `<svg class="ph" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(sceneLabels[scene] || scene)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb, var(${a}) ${pct}%, var(--bg))"/><stop offset="1" style="stop-color:color-mix(in srgb, var(${b}) 85%, var(--text))"/></linearGradient></defs>
    <rect width="400" height="260" fill="url(#${id})"/>${sceneArt(scene, p.type)}
    ${label ? `<text x="388" y="250" text-anchor="end" style="font:600 12px var(--font-body);fill:var(--on-primary);opacity:.8">${escape(sceneLabels[scene])}</text>` : ''}</svg>`;
}

// Plano esquemático generado a partir de dormitorios y baños.
export function floorPlan(p) {
  if (p.type === 'terreno') return `<svg class="plan" viewBox="0 0 400 260"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M30 40 370 20 380 240 20 230z" stroke-dasharray="8 6"/></g><text x="200" y="135" text-anchor="middle" fill="currentColor" style="font:600 14px var(--font-body)">Terreno ${p.m2} m²</text></svg>`;
  const top = [['Living-comedor', 3], ['Cocina', 1.3]];
  if (p.features.includes('Terraza')) top.push(['Terraza', 1.1]);
  const bottom = [];
  if (p.type === 'oficina' || p.type === 'local') { top[0][0] = p.type === 'local' ? 'Sala de ventas' : 'Planta libre'; top[1][0] = 'Kitchenette'; bottom.push(['Sala reuniones', 1.6], ['Bodega', 1]); }
  for (let i = 0; i < p.dorms; i++) bottom.push([i === 0 ? 'Dorm. principal' : 'Dorm. ' + (i + 1), i === 0 ? 1.8 : 1.4]);
  for (let i = 0; i < p.baths; i++) bottom.push(['Baño' + (p.baths > 1 ? ' ' + (i + 1) : ''), .8]);
  if (!bottom.length) bottom.push(['Hall', 1]);
  const W = 380, X = 10;
  const row = (items, y, h) => {
    const tot = items.reduce((s, i) => s + i[1], 0);
    let x = X;
    return items.map(([n, w]) => {
      const ww = (w / tot) * W, out = `<rect x="${x.toFixed(1)}" y="${y}" width="${ww.toFixed(1)}" height="${h}"/><text x="${(x + ww / 2).toFixed(1)}" y="${y + h / 2 + 4}" text-anchor="middle" style="font:600 ${ww < 70 ? 9 : 11}px var(--font-body)" fill="currentColor" stroke="none">${escape(n)}</text>
        <path d="M${(x + ww / 2 - 10).toFixed(1)} ${y + (y < 100 ? h : 0)}h20" stroke="var(--surface-2)" stroke-width="4"/>`;
      x += ww; return out;
    }).join('');
  };
  return `<svg class="plan" viewBox="0 0 400 260" role="img" aria-label="Plano de la propiedad"><g fill="none" stroke="currentColor" stroke-width="2.5">${row(top, 10, 120)}${row(bottom, 130, 110)}</g>
    <text x="390" y="256" text-anchor="end" fill="currentColor" style="font:11px var(--font-body);opacity:.7">Superficie útil ${p.m2} m² · esquema referencial</text></svg>`;
}

// Mapa de comunas con celdas coloreadas y pines.
// opts: { values: {comunaId: n}, pins: [{id, x, y, label, active}], highlight, compact }
export function comunaMap({ values = {}, pins = [], highlight = null, compact = false, labels = true } = {}) {
  const vals = Object.values(values).filter(v => v > 0), max = Math.max(1, ...vals), min = vals.length ? Math.min(...vals) : 0;
  const cells = comunaCells().map(c => {
    const v = values[c.id], t = v ? .15 + .55 * ((v - min) / Math.max(1, max - min)) : 0;
    const fill = highlight ? (c.id === highlight ? 'color-mix(in srgb, var(--primary) 55%, var(--bg))' : NODATA) : v ? `color-mix(in srgb, var(--primary) ${Math.round(t * 100)}%, var(--bg))` : NODATA;
    return `<path class="cell" data-comuna="${c.id}" d="${c.d}" style="fill:${fill}"><title>${escape(COMUNAS.find(x => x.id === c.id).name)}${v ? ' · ' + Math.round(v) : ''}</title></path>`;
  }).join('');
  const names = labels ? COMUNAS.map(c => `<text class="cname" x="${c.x}" y="${c.y + (compact ? 4 : 26)}" text-anchor="middle">${escape(c.name)}</text>`).join('') : '';
  // Pines: punto por propiedad; la etiqueta de precio aparece en el pin activo (o si hay pocos pines).
  const showAll = pins.length <= 3;
  const ordered = pins.slice().sort((a, b) => (a.active ? 1 : 0) - (b.active ? 1 : 0));
  const pinEls = ordered.map(p => {
    const w = Math.max(44, p.label.length * 6.6 + 14), lab = p.active || showAll;
    return `<g class="pin ${p.active ? 'active' : ''} ${lab ? 'labeled' : ''}" data-pin="${p.id}" transform="translate(${p.x},${p.y})" tabindex="0" role="button" aria-label="${escape(p.label)}">
      <title>${escape(p.label)}</title><circle class="pin-dot" r="${lab ? 4 : 6.5}"/>${lab ? `<path d="M0 -4 l-6 -9 h12z" class="pin-tip"/><rect x="${-w / 2}" y="-34" width="${w}" height="21" rx="10"/><text x="0" y="-19.5" text-anchor="middle">${escape(p.label)}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="cmap ${compact ? 'compact' : ''}" viewBox="0 0 600 545" role="img" aria-label="Mapa de comunas de Santiago">
    <path class="outline" d="M${OUTLINE.map(p => p.join(',')).join('L')}Z"/>${cells}${names}${pinEls}</svg>`;
}

// "Código QR" decorativo determinista.
export function fakeQR(text, size = 120) {
  let h = 0; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const n = 21, cell = size / n; let out = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    let on;
    if (finder) { const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5); }
    else { h = (h * 1103515245 + 12345) >>> 0; on = (h >> 16) & 1; }
    if (on) out += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
  }
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Código de acceso"><rect width="${size}" height="${size}" fill="var(--surface-2)"/><g fill="var(--text)">${out}</g></svg>`;
}
