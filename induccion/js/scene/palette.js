// Lee los tokens CSS del estilo activo para teñir la escena 3D (así sigue los 30 estilos).
let probe;
function rgbOf(token) {
  if (!probe) { probe = document.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none'; document.body.appendChild(probe); }
  probe.style.color = '';
  probe.style.color = `var(--${token})`;
  const s = getComputedStyle(probe).color;
  const m = s.match(/[\d.]+/g);
  if (!m) return [128, 128, 128];
  if (s.startsWith('color(')) return m.slice(0, 3).map(v => Math.round(parseFloat(v) * 255));
  return m.slice(0, 3).map(Number);
}
const toHex = ([r, g, b]) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export const TOKENS = ['bg', 'surface', 'text', 'primary', 'accent', 'success', 'warning', 'danger', 'info', 'muted'];
export function readPalette() {
  const raw = Object.fromEntries(TOKENS.map(t => [t, rgbOf(t)]));
  const dark = lum(raw.bg) < 0.45;
  // Cielo: el fondo del estilo, algo más profundo en estilos claros para que el modelo destaque.
  const sky = dark ? raw.bg : mix(raw.bg, raw.text, 0.12);
  const hex = {};
  for (const k of TOKENS) hex[k] = toHex(raw[k]);
  return {
    ...hex, dark, sky: toHex(sky),
    wall: toHex(mix([58, 72, 96], raw.primary, 0.3)),
    wallTint: toHex(mix([255, 255, 255], raw.primary, 0.35)),
    floorTint: toHex(mix([255, 255, 255], raw.bg, 0.25)),
    holo: toHex(lum(raw.info) > 0.2 ? raw.info : raw.primary),
    css: c => `#${toHex(raw[c]).toString(16).padStart(6, '0')}`
  };
}

// Registro de colores teñidos: tint(material.color, 'warning'); retint() al cambiar el estilo.
export function createTinter() {
  const list = [];
  let pal = readPalette();
  return {
    get pal() { return pal; },
    tint(color, key, fn) { list.push({ color, key, fn }); color.setHex(fn ? fn(pal) : pal[key]); return color; },
    retint() { pal = readPalette(); list.forEach(({ color, key, fn }) => color.setHex(fn ? fn(pal) : pal[key])); return pal; }
  };
}
