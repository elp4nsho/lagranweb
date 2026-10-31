// Utilidades de color para los estilos de La Gran Web (sin dependencias).
// Las usan tools/check-themes.mjs (validador) y tools/new-theme.mjs (generador).
//
//   parse('#ff7a00') → { r, g, b, a }      (hex, rgb(), rgba(), hsl(), hsla(), transparent, black/white)
//   mix(a, b, pesoA)                       (como color-mix(in srgb, a pesoA%, b))
//   over(arriba, abajo)                    (compone un color con alfa sobre otro opaco)
//   contrast(a, b)                         (razón WCAG 2.x, 1–21)
//   ensureContrast(color, fondo, min)      (oscurece/aclara el color hasta llegar al mínimo)

const NAMED = { black: '#000000', white: '#ffffff', red: '#ff0000', transparent: 'rgba(0,0,0,0)' };

export function parse(input) {
  if (input && typeof input === 'object') return input;
  let s = String(input || '').trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m;
  if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const ch = v => v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v);
    const a = p[3] == null ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a };
  }
  if ((m = s.match(/^hsla?\(([^)]+)\)$/))) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const h = parseFloat(p[0]) / 360, sat = parseFloat(p[1]) / 100, l = parseFloat(p[2]) / 100;
    const a = p[3] == null ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    const f = n => { const k = (n + h * 12) % 12, q = sat * Math.min(l, 1 - l); return 255 * (l - q * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return { r: f(0), g: f(8), b: f(4), a };
  }
  return null;
}

export const toHex = c => {
  c = parse(c);
  const h = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b) + (c.a < 1 ? h(c.a * 255) : '');
};

/** color-mix(in srgb, a w, b) con w en 0–1 (alfa premultiplicado, como el navegador). */
export function mix(a, b, w) {
  a = parse(a); b = parse(b);
  const aa = a.a * w, ba = b.a * (1 - w), al = aa + ba;
  if (!al) return { r: 0, g: 0, b: 0, a: 0 };
  return { r: (a.r * aa + b.r * ba) / al, g: (a.g * aa + b.g * ba) / al, b: (a.b * aa + b.b * ba) / al, a: al };
}

/** Compone `top` (con alfa) sobre `bottom` (se asume opaco). */
export function over(top, bottom) {
  top = parse(top); bottom = parse(bottom);
  const a = top.a;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

export function luminance(c) {
  c = parse(c);
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const isDark = c => luminance(c) < 0.18;

/** Lleva `color` hacia negro o blanco (lo que dé más contraste con `bg`) hasta llegar a `min`. */
export function ensureContrast(color, bg, min = 4.5) {
  let c = parse(color);
  if (contrast(c, bg) >= min) return toHex(c);
  const target = contrast('#000', bg) > contrast('#fff', bg) ? '#000000' : '#ffffff';
  for (let w = 0.95; w >= 0; w -= 0.05) {
    const t = mix(c, target, w);
    if (contrast(t, bg) >= min) return toHex(t);
  }
  return target;
}

/** Texto legible (negro o blanco, o los dados) sobre un fondo. */
export function readableOn(bg, dark = '#111111', light = '#ffffff') {
  return contrast(dark, bg) >= contrast(light, bg) ? dark : light;
}
