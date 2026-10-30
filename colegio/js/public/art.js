// Ilustraciones SVG hechas solo con tokens del tema (se adaptan a los 30 estilos).
export function heroArt() {
  return `<svg viewBox="0 0 420 340" role="img" aria-label="Ilustración del colegio a los pies de la cordillera">
    <circle cx="330" cy="70" r="34" fill="var(--accent)" opacity=".85"/>
    <path d="M0 210 L80 110 L130 160 L200 70 L270 150 L320 100 L420 200 L420 340 L0 340Z" fill="var(--surface-3)" stroke="var(--line)" stroke-width="2"/>
    <path d="M180 95 L200 70 L222 96 L210 92 L200 100 L190 92Z M300 120 L320 100 L338 118 L326 116 L318 122Z" fill="var(--surface)"/>
    <rect x="0" y="250" width="420" height="90" fill="var(--surface-2)"/>
    <g stroke="var(--text)" stroke-width="2.5" stroke-linejoin="round">
      <rect x="110" y="170" width="200" height="110" fill="var(--surface)"/>
      <path d="M96 176 L210 120 L324 176Z" fill="var(--primary)"/>
      <rect x="190" y="215" width="40" height="65" fill="var(--accent)"/>
      <rect x="128" y="192" width="34" height="28" fill="var(--surface-2)"/><rect x="258" y="192" width="34" height="28" fill="var(--surface-2)"/>
      <rect x="128" y="236" width="34" height="28" fill="var(--surface-2)"/><rect x="258" y="236" width="34" height="28" fill="var(--surface-2)"/>
      <circle cx="210" cy="152" r="12" fill="var(--surface)"/>
    </g>
    <path d="M210 145 v7 l5 4" stroke="var(--text)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g fill="var(--success)" stroke="var(--text)" stroke-width="2">
      <circle cx="62" cy="236" r="26"/><circle cx="360" cy="240" r="22"/><circle cx="388" cy="252" r="16"/>
    </g>
    <g stroke="var(--text)" stroke-width="2.5"><line x1="62" y1="260" x2="62" y2="288"/><line x1="360" y1="262" x2="360" y2="288"/></g>
    <g fill="var(--warning)"><circle cx="50" cy="226" r="4"/><circle cx="72" cy="244" r="4"/><circle cx="64" cy="222" r="3"/><circle cx="356" cy="232" r="3.5"/></g>
    <path d="M0 300 Q 105 284 210 300 T 420 296 L420 340 L0 340Z" fill="var(--primary)" opacity=".18"/>
  </svg>`;
}

const ICONS = {
  'Académico': '<path d="M60 70 l40-18 40 18 -40 18z" fill="var(--surface)" stroke="currentColor" stroke-width="4"/><path d="M76 78 v18 c0 8 48 8 48 0 v-18" fill="none" stroke="currentColor" stroke-width="4"/>',
  'Deportes': '<circle cx="100" cy="76" r="26" fill="var(--surface)" stroke="currentColor" stroke-width="4"/><path d="M74 76 h52 M100 50 c-12 14 -12 38 0 52 M100 50 c12 14 12 38 0 52" stroke="currentColor" stroke-width="3" fill="none"/>',
  'Institucional': '<path d="M66 100 h68 M72 100 v-30 M88 100 v-30 M112 100 v-30 M128 100 v-30 M64 70 l36-20 36 20z" stroke="currentColor" stroke-width="4" fill="var(--surface)" stroke-linejoin="round"/>',
  'Comunidad': '<circle cx="84" cy="66" r="11" fill="var(--surface)" stroke="currentColor" stroke-width="4"/><circle cx="116" cy="66" r="11" fill="var(--surface)" stroke="currentColor" stroke-width="4"/><path d="M64 102 c4-20 36-20 40 0 M96 102 c4-20 36-20 40 0" stroke="currentColor" stroke-width="4" fill="none"/>',
  'Cultura': '<path d="M86 96 v-40 l34 -8 v40" stroke="currentColor" stroke-width="4" fill="none"/><circle cx="80" cy="96" r="8" fill="currentColor"/><circle cx="114" cy="88" r="8" fill="currentColor"/>'
};
export function newsThumb(category = 'Institucional', seed = 0) {
  const icon = ICONS[category] || ICONS['Institucional'];
  const dx = (seed * 37) % 60;
  return `<svg viewBox="0 0 200 112" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="112" fill="var(--surface-2)"/>
    <circle cx="${30 + dx}" cy="20" r="46" fill="currentColor" opacity=".14"/>
    <circle cx="${180 - dx / 2}" cy="104" r="40" fill="var(--accent)" opacity=".22"/>
    <path d="M0 96 Q 50 80 100 96 T 200 92 V112 H0Z" fill="currentColor" opacity=".18"/>
    <g>${icon}</g>
  </svg>`;
}

export function mapArt() {
  return `<svg viewBox="0 0 400 300" role="img" aria-label="Mapa de ubicación del colegio">
    <rect width="400" height="300" fill="var(--surface-2)"/>
    <g stroke="var(--line)" stroke-width="14" stroke-linecap="round" fill="none"><path d="M-10 90 H410"/><path d="M-10 210 Q200 180 410 230"/><path d="M120 -10 V310"/><path d="M290 -10 Q270 150 300 310"/></g>
    <g stroke="var(--surface)" stroke-width="2" stroke-dasharray="8 8" fill="none"><path d="M-10 90 H410"/><path d="M120 -10 V310"/></g>
    <rect x="150" y="110" width="110" height="70" rx="6" fill="var(--success)" opacity=".35"/>
    <text x="205" y="150" text-anchor="middle" font-size="12" fill="var(--text)" font-family="var(--font-body)">Plaza Los Aromos</text>
    <path d="M205 40 c-18 0 -30 13 -30 29 c0 22 30 50 30 50 s30 -28 30 -50 c0 -16 -12 -29 -30 -29z" fill="var(--primary)" stroke="var(--text)" stroke-width="2.5"/>
    <circle cx="205" cy="69" r="10" fill="var(--surface)"/>
    <text x="128" y="84" font-size="11" fill="var(--muted)" font-family="var(--font-body)">Av. Los Aromos</text>
  </svg>`;
}

export const LEVEL_ICONS = { parvularia: '✿', basica: '✎', media: '⚗' };
