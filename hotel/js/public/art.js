// Ilustraciones SVG de las habitaciones (placeholders de galería) pintadas con tokens del tema.
let uid = 0;
const SCENES = ['Vista desde la ventana', 'Dormitorio', 'Baño', 'Terraza al atardecer'];
export const sceneName = i => SCENES[i % SCENES.length];

export function roomArt(typeId = 'clasica', scene = 0, { label = '' } = {}) {
  const id = 'ra' + (++uid);
  const seed = [...typeId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const tone = { clasica: 'accent', superior: 'info', deluxe: 'success', suite: 'primary', panoramica: 'warning' }[typeId] || 'primary';
  const houses = Array.from({ length: 9 }, (_, i) => {
    const x = i * 46 + ((seed * (i + 3)) % 14), h = 26 + ((seed * (i + 7)) % 30), y = 150 - h - (i % 3) * 8;
    const c = ['var(--primary)', 'var(--accent)', 'var(--warning)', 'var(--success)', 'var(--info)', 'var(--danger)'][(seed + i) % 6];
    return `<rect x="${x}" y="${y}" width="38" height="${h + 40}" rx="2" style="fill:${c}" opacity=".85"/><rect x="${x + 8}" y="${y + 10}" width="8" height="10" class="ra-win"/><rect x="${x + 22}" y="${y + 10}" width="8" height="10" class="ra-win"/>`;
  }).join('');
  const sky = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--${scene === 3 ? 'warning' : tone})" stop-opacity="${scene === 3 ? .9 : .55}"/><stop offset="1" style="stop-color:var(--surface-2, #eee)" stop-opacity=".9"/></linearGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--info)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--info)" stop-opacity=".45"/></linearGradient></defs>`;
  let body;
  if (scene === 0) body = `<rect width="400" height="260" fill="url(#${id}s)"/><circle cx="${300 - (seed % 60)}" cy="60" r="22" style="fill:var(--warning)" opacity=".8"/>
      <rect y="150" width="400" height="110" fill="url(#${id}w)"/>${houses}
      <path d="M40 186 h50 l-8 12 h-36z M250 200 h70 l-10 14 h-52z" style="fill:var(--text)" opacity=".55"/>
      <rect x="0" y="0" width="400" height="260" fill="none" class="ra-frame" stroke-width="22"/><line x1="200" y1="0" x2="200" y2="260" class="ra-frame" stroke-width="10"/><line x1="0" y1="130" x2="400" y2="130" class="ra-frame" stroke-width="8"/>`;
  else if (scene === 1) body = `<rect width="400" height="260" class="ra-wall"/><rect x="250" y="30" width="110" height="110" fill="url(#${id}s)" rx="3"/><rect y="150" width="0" height="0"/>
      <rect x="250" y="30" width="110" height="110" fill="none" class="ra-frame" stroke-width="8"/><line x1="305" y1="30" x2="305" y2="140" class="ra-frame" stroke-width="5"/>
      <rect x="40" y="120" width="190" height="34" rx="6" style="fill:var(--${tone})" opacity=".9"/><rect x="30" y="150" width="210" height="60" rx="8" class="ra-bed"/>
      <rect x="48" y="128" width="60" height="22" rx="8" class="ra-pillow"/><rect x="120" y="128" width="60" height="22" rx="8" class="ra-pillow"/>
      <rect x="30" y="170" width="210" height="16" style="fill:var(--${tone})" opacity=".55"/><rect x="0" y="210" width="400" height="50" class="ra-floor"/>
      <rect x="262" y="160" width="40" height="50" rx="3" class="ra-bed"/><circle cx="282" cy="150" r="10" style="fill:var(--warning)" opacity=".8"/>`;
  else if (scene === 2) body = `<rect width="400" height="260" class="ra-wall"/>${Array.from({ length: 10 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="200" class="ra-tile"/>`).join('')}${Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="400" y2="${i * 40}" class="ra-tile"/>`).join('')}
      <rect x="0" y="200" width="400" height="60" class="ra-floor"/><path d="M70 150 h220 a10 10 0 0 1 10 10 c0 40 -30 56 -60 56 h-120 c-30 0 -60 -16 -60 -56 a10 10 0 0 1 10 -10z" class="ra-bed"/>
      <path d="M85 165 h190 c-4 30 -26 40 -50 40 h-90 c-24 0 -46 -10 -50 -40z" fill="url(#${id}w)"/><rect x="290" y="60" width="8" height="90" class="ra-metal"/><path d="M298 60 h30 v10 h-30z" class="ra-metal"/>
      <rect x="330" y="40" width="50" height="70" rx="25" fill="url(#${id}s)"/><circle cx="120" cy="80" r="16" style="fill:var(--success)" opacity=".7"/><rect x="116" y="96" width="8" height="40" style="fill:var(--success)" opacity=".7"/>`;
  else body = `<rect width="400" height="260" fill="url(#${id}s)"/><circle cx="200" cy="150" r="46" style="fill:var(--danger)" opacity=".55"/>
      <rect y="150" width="400" height="110" fill="url(#${id}w)"/>${houses}<rect x="0" y="196" width="400" height="64" class="ra-floor"/>
      ${Array.from({ length: 21 }, (_, i) => `<rect x="${i * 20}" y="170" width="4" height="30" class="ra-metal"/>`).join('')}<rect x="0" y="166" width="400" height="6" class="ra-metal"/>
      <rect x="60" y="206" width="60" height="30" rx="4" style="fill:var(--${tone})" opacity=".85"/><rect x="250" y="206" width="70" height="12" rx="3" class="ra-bed"/><rect x="262" y="218" width="6" height="22" class="ra-metal"/><rect x="302" y="218" width="6" height="22" class="ra-metal"/>`;
  return `<svg class="room-art" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label || sceneName(scene)}">${sky}${body}</svg>`;
}
