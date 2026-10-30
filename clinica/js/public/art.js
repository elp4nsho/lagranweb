// Ilustraciones SVG con tokens de color.
export const heroArt = () => `<svg viewBox="0 0 440 380" role="img" aria-label="Ilustración de agenda médica">
  <circle cx="330" cy="90" r="70" style="fill:var(--accent);opacity:.18"/>
  <circle cx="90" cy="300" r="56" style="fill:var(--primary);opacity:.14"/>
  <rect x="60" y="50" width="300" height="270" rx="22" style="fill:var(--surface-2);stroke:var(--muted);stroke-opacity:.35;stroke-width:2"/>
  <rect x="60" y="50" width="300" height="58" rx="22" style="fill:var(--primary)"/>
  <rect x="60" y="86" width="300" height="22" style="fill:var(--primary)"/>
  <circle cx="110" cy="50" r="8" style="fill:var(--surface-2);stroke:var(--primary);stroke-width:4"/>
  <circle cx="310" cy="50" r="8" style="fill:var(--surface-2);stroke:var(--primary);stroke-width:4"/>
  <text x="84" y="88" style="fill:var(--on-primary);font:700 18px var(--font-head)">Noviembre</text>
  ${Array.from({ length: 20 }, (_, i) => { const x = 84 + (i % 5) * 54, y = 128 + Math.floor(i / 5) * 44; const on = [3, 7, 12, 16].includes(i); return `<rect x="${x}" y="${y}" width="40" height="32" rx="8" style="fill:${on ? 'var(--primary)' : 'var(--muted)'};opacity:${on ? 1 : .16}"/>${on ? `<path d="M${x + 12} ${y + 16}l6 6 10-11" style="fill:none;stroke:var(--on-primary);stroke-width:3;stroke-linecap:round;stroke-linejoin:round"/>` : ''}`; }).join('')}
  <g transform="translate(270 230)">
    <circle r="62" style="fill:var(--surface-2);stroke:var(--muted);stroke-opacity:.35;stroke-width:2"/>
    <path d="M-34 0h16l9-22 16 44 9-22h20" style="fill:none;stroke:var(--accent);stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/>
  </g>
  <g transform="translate(40 200)">
    <rect width="110" height="70" rx="14" style="fill:var(--surface-2);stroke:var(--muted);stroke-opacity:.35;stroke-width:2"/>
    <rect x="14" y="14" width="26" height="26" rx="6" style="fill:var(--success);opacity:.85"/>
    <path d="M27 20v14M20 27h14" style="stroke:var(--surface-2);stroke-width:4;stroke-linecap:round"/>
    <rect x="48" y="16" width="48" height="8" rx="4" style="fill:var(--muted);opacity:.25"/>
    <rect x="48" y="30" width="34" height="8" rx="4" style="fill:var(--surface-3)"/>
    <rect x="14" y="50" width="82" height="8" rx="4" style="fill:var(--surface-2)"/>
  </g>
</svg>`;

export const mapArt = () => `<svg viewBox="0 0 400 220" role="img" aria-label="Mapa de ubicación" style="width:100%;height:auto;display:block;border-radius:var(--radius-sm)">
  <rect width="400" height="220" style="fill:var(--surface-3)"/>
  <path d="M0 150 L400 90" style="stroke:var(--surface-2);stroke-width:18"/>
  <path d="M120 0 L170 220" style="stroke:var(--surface-2);stroke-width:14"/>
  <path d="M300 0 L280 220" style="stroke:var(--surface-2);stroke-width:10"/>
  <path d="M0 40 L400 60" style="stroke:var(--surface-2);stroke-width:8"/>
  <rect x="190" y="130" width="60" height="50" rx="6" style="fill:var(--muted);opacity:.22"/>
  <rect x="30" y="70" width="70" height="60" rx="6" style="fill:var(--muted);opacity:.22"/>
  <circle cx="320" cy="170" r="26" style="fill:var(--success);opacity:.25"/>
  <g transform="translate(222 92)"><path d="M0 0c-14 0-24 10-24 23 0 17 24 37 24 37s24-20 24-37C24 10 14 0 0 0z" style="fill:var(--primary)"/><circle cy="22" r="8" style="fill:var(--surface-2)"/></g>
</svg>`;
