// Plantillas HTML con escape automático. A diferencia de html`` del núcleo, los arrays de
// strings (resultado de .map(x => h`...`)) se insertan tal cual, así se pueden anidar plantillas.
import { escape, raw } from '../../../assets/core/ui.js';
export { raw };
export function h(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? fmt(vals[i]) : ''), '');
}
function fmt(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? x : fmt(x))).join('');
  if (v && v.__raw) return v.value;
  return escape(v);
}
