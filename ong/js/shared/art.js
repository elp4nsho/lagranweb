// Ilustraciones de portada de campañas (SVG con tokens del tema: se adaptan a los 30 estilos).
const TONES = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--info)', 'var(--danger)', 'var(--warning)'];
const ICON = {
  Agua: '<path d="M300 70 C 280 105 262 125 262 148 a38 38 0 0 0 76 0 C 338 125 320 105 300 70Z" class="ic"/>',
  'Bosque nativo': '<path d="M300 58 l38 62 h-20 l30 46 h-96 l30 -46 h-20z" class="ic"/><rect x="292" y="166" width="16" height="22" class="ic"/>',
  Educación: '<path d="M250 92 q50 -18 50 4 q0 -22 50 -4 v86 q-50 -18 -50 4 q0 -22 -50 -4z" class="ic"/><path d="M300 96 v90" class="ln"/>',
  Alimentación: '<path d="M300 186 v-70" class="ln"/><path d="M300 130 q-40 -6 -44 -46 q40 4 44 46z M300 116 q36 -8 44 -44 q-40 2 -44 44z" class="ic"/>',
  Emergencia: '<path d="M300 72 l58 46 v62 h-116 v-62z" class="ic"/><path d="M300 108 q-14 -14 -24 0 q-6 12 24 34 q30 -22 24 -34 q-10 -14 -24 0z" class="hole"/>',
  Emprendimiento: '<rect x="258" y="80" width="84" height="100" rx="6" class="ic"/><path d="M270 98 h60 M270 116 h60 M270 134 h60 M270 152 h60" class="hole-ln"/>'
};
export function coverArt(c, { cls = '' } = {}) {
  const tone = TONES[(c.cover ?? c.hue ?? 0) % TONES.length];
  return `<svg class="cover-art ${cls}" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustración: ${c.category}" style="--tone:${tone}">
    <rect width="600" height="240" class="sky"/>
    <circle cx="470" cy="70" r="34" class="sun"/>
    <path d="M0 170 Q120 110 240 160 T600 140 V240 H0Z" class="hill1"/>
    <path d="M0 200 Q160 160 320 196 T600 186 V240 H0Z" class="hill2"/>
    ${ICON[c.category] || ICON.Agua}
  </svg>`;
}
