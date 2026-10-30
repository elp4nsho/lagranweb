// Ilustración SVG de la botella Aquilo Pulse con variantes de color.
// Los colores del producto son parte de la ilustración (datos del catálogo), no del tema.
let n = 0;
export function bottleSVG(color, { cls = '', label = '', screen = '68%' } = {}) {
  const c = color || { base: '#00b3c7', light: '#6fe3ef', dark: '#00707e', name: 'Glaciar' };
  const id = 'aq' + (++n);
  return `<svg class="bottle ${cls}" viewBox="0 0 200 520" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} style="--b:${c.base};--bl:${c.light};--bd:${c.dark}">
    <defs>
      <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" style="stop-color:var(--bd)"/><stop offset=".35" style="stop-color:var(--b)"/><stop offset=".6" style="stop-color:var(--bl)"/><stop offset="1" style="stop-color:var(--bd)"/></linearGradient>
      <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#1a2233"/><stop offset=".45" stop-color="#4a5670"/><stop offset="1" stop-color="#121826"/></linearGradient>
      <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <ellipse cx="100" cy="505" rx="70" ry="10" fill="currentColor" opacity=".18"/>
    <rect x="62" y="10" width="76" height="70" rx="18" fill="url(#${id}c)"/>
    <rect x="84" y="2" width="32" height="16" rx="8" fill="#2c364b"/>
    <rect x="62" y="64" width="76" height="8" fill="#0b1220" opacity=".5"/>
    <rect class="led" x="58" y="78" width="84" height="10" rx="5" fill="#7ef9ff"/>
    <path d="M58 92 h84 q14 0 18 18 q6 28 6 60 v290 q0 38 -38 38 h-56 q-38 0 -38 -38 v-290 q0 -32 6 -60 q4 -18 18 -18z" fill="url(#${id}b)"/>
    <rect x="70" y="200" width="60" height="96" rx="14" fill="#0b1220" opacity=".88"/>
    <text x="100" y="246" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="24" fill="#7ef9ff">${screen}</text>
    <text x="100" y="266" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#cfe9f2">1,4 / 2 L</text>
    <circle cx="100" cy="282" r="3" fill="#7ef9ff"/>
    <rect x="62" y="110" width="22" height="370" rx="11" fill="url(#${id}s)" opacity=".7"/>
    <text x="100" y="420" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="16" letter-spacing="3" fill="#fff" opacity=".85">AQUILO</text>
  </svg>`;
}

export const swatch = c => `--sw:${c.base}`;
