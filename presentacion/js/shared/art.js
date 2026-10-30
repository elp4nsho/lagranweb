// Ilustraciones placeholder generadas con SVG + tokens del tema (sin colores fijos).
// art({ c1:'primary', c2:'accent', shape:'orbit', seed: 3 }, { ratio:'4/3', label:'' })
import { escape } from '../../../assets/core/ui.js';

export const PALETTE = ['primary', 'accent', 'info', 'success', 'warning', 'danger'];
export const SHAPES = ['orbit', 'grid', 'wave', 'blob', 'stripes', 'stack', 'sun', 'mesh'];
export const SHAPE_NAMES = { orbit: 'Órbitas', grid: 'Retícula', wave: 'Ondas', blob: 'Orgánico', stripes: 'Franjas', stack: 'Capas', sun: 'Sol', mesh: 'Malla' };
export const COLOR_NAMES = { primary: 'Primario', accent: 'Acento', info: 'Info', success: 'Éxito', warning: 'Aviso', danger: 'Peligro' };

function shapes(shape, s = 1) {
  const k = (n) => ((s * 9301 + n * 49297) % 233280) / 233280; // pseudoaleatorio estable
  switch (shape) {
    case 'orbit': return `<circle class="s1" cx="${200 + k(1) * 60}" cy="150" r="${70 + k(2) * 30}"/><circle class="ln" cx="200" cy="150" r="120" /><circle class="ln" cx="200" cy="150" r="170"/><circle class="s2" cx="${90 + k(3) * 40}" cy="${60 + k(4) * 40}" r="18"/><circle class="s3" cx="320" cy="240" r="10"/>`;
    case 'grid': { let o = ''; for (let x = 0; x < 8; x++) for (let y = 0; y < 6; y++) if (k(x * 7 + y) > .45) o += `<rect class="${k(x + y * 3) > .7 ? 's1' : 's2'}" x="${x * 50 + 8}" y="${y * 50 + 8}" width="34" height="34" rx="4"/>`; return o; }
    case 'wave': return [0, 1, 2, 3].map(i => `<path class="${i % 2 ? 's2' : 's1'}" d="M0 ${150 + i * 40} C 100 ${100 + i * 40 - k(i) * 60}, 300 ${200 + i * 40 + k(i + 3) * 40}, 400 ${130 + i * 40} L400 300 L0 300 Z"/>`).join('');
    case 'blob': return `<path class="s1" d="M${120 + k(1) * 30} 60 C 260 20, 360 110, 300 190 S 120 300, 80 200 S 40 90, ${120 + k(1) * 30} 60Z"/><circle class="s2" cx="${280 + k(2) * 50}" cy="80" r="40"/><circle class="s3" cx="90" cy="250" r="22"/>`;
    case 'stripes': return Array.from({ length: 9 }, (_, i) => `<rect class="${i % 3 === 0 ? 's1' : 's2'}" x="${i * 50 - 100}" y="-50" width="${18 + k(i) * 14}" height="420" transform="rotate(25 200 150)"/>`).join('');
    case 'stack': return [0, 1, 2].map(i => `<rect class="s${i + 1}" x="${90 + i * 40}" y="${50 + i * 35}" width="200" height="130" rx="14"/>`).join('');
    case 'sun': return `<circle class="s1" cx="200" cy="${200 + k(1) * 20}" r="100"/>${[0, 1, 2, 3, 4].map(i => `<rect class="bg-band" x="0" y="${215 + i * 18}" width="400" height="${4 + i * 1.5}"/>`).join('')}<circle class="s3" cx="${60 + k(2) * 40}" cy="70" r="6"/><circle class="s3" cx="330" cy="50" r="4"/>`;
    case 'mesh': { let o = ''; for (let i = 0; i < 12; i++) o += `<line class="ln" x1="${i * 36}" y1="0" x2="${400 - i * 30}" y2="300"/>`; return o + `<circle class="s1" cx="${150 + k(5) * 100}" cy="${120 + k(6) * 60}" r="46"/>`; }
    default: return '';
  }
}

export function art(a = {}, { ratio = '4/3', label = '', cls = '', icon = '' } = {}) {
  const c1 = PALETTE.includes(a.c1) ? a.c1 : 'primary', c2 = PALETTE.includes(a.c2) ? a.c2 : 'accent';
  return `<div class="art ${cls}" style="--c1:var(--${c1});--c2:var(--${c2});aspect-ratio:${ratio}" ${label ? `role="img" aria-label="${escape(label)}"` : 'aria-hidden="true"'}>
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${shapes(a.shape || 'orbit', a.seed || 1)}</svg>${icon ? `<span class="art-icon">${escape(icon)}</span>` : ''}</div>`;
}

// Selector de ilustración para formularios (colores + forma) con vista previa.
export function artPicker(name, a = {}) {
  const v = { c1: a.c1 || 'primary', c2: a.c2 || 'accent', shape: a.shape || 'orbit', seed: a.seed || 1 };
  return `<div class="art-picker" data-art-picker="${name}">
    <div class="art-prev">${art(v, { ratio: '16/9' })}</div>
    <div class="grid-3" style="gap:8px">
      <div class="field"><label>Color 1</label><select class="select" name="${name}_c1">${PALETTE.map(p => `<option value="${p}" ${p === v.c1 ? 'selected' : ''}>${COLOR_NAMES[p]}</option>`).join('')}</select></div>
      <div class="field"><label>Color 2</label><select class="select" name="${name}_c2">${PALETTE.map(p => `<option value="${p}" ${p === v.c2 ? 'selected' : ''}>${COLOR_NAMES[p]}</option>`).join('')}</select></div>
      <div class="field"><label>Forma</label><select class="select" name="${name}_shape">${SHAPES.map(p => `<option value="${p}" ${p === v.shape ? 'selected' : ''}>${SHAPE_NAMES[p]}</option>`).join('')}</select></div>
    </div><input type="hidden" name="${name}_seed" value="${v.seed}"></div>`;
}
export function wireArtPickers(root) {
  root.querySelectorAll('[data-art-picker]').forEach(p => {
    const n = p.dataset.artPicker;
    const upd = () => { p.querySelector('.art-prev').innerHTML = art(readArt(root, n), { ratio: '16/9' }); };
    p.addEventListener('change', upd);
  });
}
export function readArt(root, n) {
  const g = k => root.querySelector(`[name="${n}_${k}"]`)?.value;
  return { c1: g('c1'), c2: g('c2'), shape: g('shape'), seed: Number(g('seed')) || 1 };
}
export function pickArtFields(values, n) {
  const out = { c1: values[`${n}_c1`], c2: values[`${n}_c2`], shape: values[`${n}_shape`], seed: Number(values[`${n}_seed`]) || 1 };
  ['c1', 'c2', 'shape', 'seed'].forEach(k => delete values[`${n}_${k}`]);
  return out;
}
