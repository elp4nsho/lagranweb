// Ilustraciones SVG de productos (no hay fotos reales). La prenda se pinta con el color de la
// variante (dato del producto); el fondo, contorno y detalles usan tokens del estilo activo.

const SHAPES = {
  tee: 'M70 40 L88 32 Q100 44 112 32 L130 40 L156 62 L142 82 L128 74 L128 160 L72 160 L72 74 L58 82 L44 62 Z',
  longsleeve: 'M70 40 L88 32 Q100 44 112 32 L130 40 L150 60 L162 132 L146 136 L130 80 L128 160 L72 160 L70 80 L54 136 L38 132 L50 60 Z',
  shirt: 'M70 38 L88 30 L100 46 L112 30 L130 38 L154 60 L162 128 L146 132 L130 82 L130 162 L70 162 L70 82 L54 132 L38 128 L46 60 Z',
  hoodie: 'M72 46 Q78 22 100 22 Q122 22 128 46 L150 60 L162 136 L146 140 L130 86 L130 162 L70 162 L70 86 L54 140 L38 136 L50 60 Z',
  crew: 'M70 42 L86 34 Q100 46 114 34 L130 42 L150 60 L162 136 L146 140 L130 86 L130 162 L70 162 L70 86 L54 140 L38 136 L50 60 Z',
  jacket: 'M70 40 L86 30 L100 40 L114 30 L130 40 L152 58 L164 140 L148 144 L132 88 L132 166 L68 166 L68 88 L52 144 L36 140 L48 58 Z',
  parka: 'M68 46 Q74 18 100 18 Q126 18 132 46 L156 60 L168 150 L150 154 L136 96 L136 172 L64 172 L64 96 L50 154 L32 150 L44 60 Z',
  pants: 'M70 30 L130 30 L136 168 L108 168 L100 80 L92 168 L64 168 Z',
  shorts: 'M66 52 L134 52 L142 128 L108 132 L100 88 L92 132 L58 128 Z',
  dress: 'M84 30 L92 30 Q100 40 108 30 L116 30 L118 70 L146 166 L54 166 L82 70 Z',
  skirt: 'M74 52 L126 52 L150 156 L50 156 Z',
  sneaker: 'M40 120 L40 96 Q60 92 76 78 L96 70 Q110 92 132 98 L160 106 Q166 116 162 126 L40 126 Z',
  boot: 'M62 44 L104 44 L106 102 Q130 108 156 116 Q164 124 160 138 L58 138 Z',
  cap: 'M54 110 Q54 60 100 58 Q146 60 146 110 Z M100 110 L168 112 Q170 122 156 124 L100 120 Z',
  tote: 'M56 76 L144 76 L150 166 L50 166 Z',
  beanie: 'M56 128 Q54 58 100 54 Q146 58 144 128 Z',
  socks: 'M80 36 L112 36 L112 118 L136 136 Q146 150 132 160 L92 158 Q76 156 78 138 Z',
  backpack: 'M62 62 Q62 40 100 40 Q138 40 138 62 L142 166 L58 166 Z',
  scarf: 'M70 34 L130 34 L130 60 L112 66 L118 168 L94 168 L90 70 L70 60 Z'
};
const DETAILS = {
  tee: '<path d="M88 32 Q100 44 112 32" fill="none"/>',
  longsleeve: '<path d="M88 32 Q100 44 112 32" fill="none"/>',
  shirt: '<path d="M100 46 L100 162 M88 30 L96 56 L100 46 L104 56 L112 30" fill="none"/><circle cx="104" cy="74" r="2"/><circle cx="104" cy="98" r="2"/><circle cx="104" cy="122" r="2"/>',
  hoodie: '<path d="M84 46 Q100 64 116 46 M80 118 L120 118 L116 142 L84 142 Z M94 60 L92 80 M106 60 L108 80" fill="none"/>',
  crew: '<path d="M86 34 Q100 46 114 34 M70 152 L130 152" fill="none"/>',
  jacket: '<path d="M100 40 L100 166 M76 110 L90 110 M110 110 L124 110" fill="none"/>',
  parka: '<path d="M100 44 L100 172 M64 86 L136 86 M64 120 L136 120 M64 150 L136 150" fill="none"/>',
  pants: '<path d="M70 42 L130 42 M100 30 L100 80 M78 42 Q82 60 72 66" fill="none"/>',
  shorts: '<path d="M66 64 L134 64 M100 52 L100 88" fill="none"/>',
  dress: '<path d="M82 70 L118 70" fill="none"/>',
  skirt: '<path d="M88 52 L80 156 M100 52 L100 156 M112 52 L120 156" fill="none"/>',
  sneaker: '<path d="M40 116 L162 116 M80 82 L90 96 M88 78 L98 92" fill="none"/>',
  boot: '<path d="M58 126 L160 126 M80 56 L92 56 M80 68 L92 68 M80 80 L92 80" fill="none"/>',
  cap: '<path d="M100 58 L100 110" fill="none"/><circle cx="100" cy="58" r="3"/>',
  tote: '<path d="M78 76 Q78 40 100 40 Q122 40 122 76" fill="none" stroke-width="6"/>',
  beanie: '<path d="M56 112 L144 112" fill="none"/><circle cx="100" cy="50" r="10"/>',
  socks: '<path d="M80 52 L112 52 M80 60 L112 60" fill="none"/>',
  backpack: '<path d="M76 100 L124 100 L124 140 L76 140 Z M84 40 Q84 24 100 24 Q116 24 116 40" fill="none"/>',
  scarf: '<path d="M94 150 L94 168 M100 150 L100 168 M106 150 L106 168 M112 150 L112 168" fill="none"/>'
};

// view: 0 frente, 1 detalle (zoom), 2 ambiente
export function productArt(p, hex, { view = 0, label = '' } = {}) {
  const shape = SHAPES[p.shape] || SHAPES.tee;
  const det = DETAILS[p.shape] || '';
  const fill = hex || (p.colors[0] || {}).hex || 'var(--primary)';
  const tf = view === 1 ? 'translate(-60 -40) scale(1.6)' : view === 2 ? 'translate(30 24) scale(.7)' : '';
  const bg = view === 2
    ? `<rect width="200" height="200" fill="var(--surface-3)"/><circle cx="160" cy="44" r="22" fill="var(--accent)" opacity=".55"/><path d="M0 150 Q60 120 110 146 T200 140 V200 H0Z" fill="var(--primary)" opacity=".22"/>`
    : `<rect width="200" height="200" fill="var(--surface-2)"/><circle cx="100" cy="104" r="78" fill="var(--surface-3)"/>`;
  return `<svg class="art" viewBox="0 0 200 200" role="img" aria-label="${label || p.name}" preserveAspectRatio="xMidYMid slice">
    ${bg}
    <g transform="${tf}">
      <ellipse cx="100" cy="178" rx="56" ry="6" fill="var(--text)" opacity=".12"/>
      <path d="${shape}" fill="${fill}" stroke="var(--text)" stroke-opacity=".55" stroke-width="2" stroke-linejoin="round"/>
      <g fill="var(--text)" fill-opacity=".35" stroke="var(--text)" stroke-opacity=".45" stroke-width="2" stroke-linecap="round">${det}</g>
    </g>
  </svg>`;
}

export const SHAPE_OPTIONS = Object.keys(SHAPES);
