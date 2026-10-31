#!/usr/bin/env node
// Generador de estilos: crea assets/core/themes/<id>.css a partir de unos pocos colores semilla, con
// todos los tokens derivados y ajustados para pasar AA (texto, apagado, primario, insignias, botones).
//
//   node tools/new-theme.mjs --id=oceano --name="Océano" --group=tematicos --desc="Azul profundo y espuma" \
//        --bg=#06283d --primary=#47b5ff --accent=#ffd56b \
//        --head="Fraunces:wght@600;800" --body="Inter:wght@400;600" [--radius=12] [--register] [--force]
//
//   --bg / --primary / --accent   colores semilla (hex). Opcionales: --text, --surface.
//   --head / --body               familias de Google Fonts (con o sin eje: "Fraunces:wght@600;800").
//   --register                    agrega la entrada al registro THEMES de assets/core/theme-boot.js.
//
// El archivo resultante es un punto de partida: después dale carácter (bordes, sombras, fondo,
// decoración en body::before…) siguiendo assets/core/THEMES.md, y corre tools/check-themes.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse, mix, over, contrast, ensureContrast, readableOn, toHex, luminance } from './lib/theme-color.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = n => args.includes('--' + n);
const need = n => { const v = opt(n); if (!v) { console.error(`Falta --${n}. Uso: ver el encabezado de tools/new-theme.mjs`); process.exit(1); } return v; };

const id = need('id'), name = need('name'), group = opt('group', 'modernos'), desc = opt('desc', name);
if (!/^[a-z0-9-]+$/.test(id)) { console.error('--id: solo minúsculas, números y guiones'); process.exit(1); }
const file = path.join(ROOT, 'assets/core/themes', id + '.css');
if (fs.existsSync(file) && !flag('force')) { console.error(`Ya existe ${path.relative(ROOT, file)} (usa --force para reemplazarlo)`); process.exit(1); }

/** Deriva el juego completo de tokens desde las semillas. Exportado para reutilizarlo. */
export function derive({ bg, primary, accent, text, surface }) {
  bg = parse(bg);
  const dark = luminance(bg) < 0.2;
  const W = parse('#ffffff'), K = parse('#000000');
  const surf = surface ? parse(surface) : dark ? mix(W, bg, .06) : (luminance(bg) > .9 ? W : mix(W, bg, .65));
  const txt = text ? parse(text) : dark ? mix(parse(primary), W, .06) : mix(parse(primary), parse('#111118'), .08);
  const s2 = mix(txt, surf, dark ? .07 : .045), s3 = mix(txt, surf, dark ? .13 : .1);
  const fit = (c, min = 4.6) => { let x = parse(c); for (const b of [surf, bg, s2]) x = parse(ensureContrast(x, b, min)); return x; };
  const tintFit = c => { let x = fit(c); for (let i = 0; i < 40; i++) { const ok = [surf, bg].every(b => contrast(x, over(mix(x, parse('transparent'), .14), b)) >= 4.6); if (ok) break; x = mix(x, dark ? W : K, .96); } return x; };
  const txtF = fit(txt, 7), muted = fit(mix(txtF, surf, .38));
  let prim = tintFit(primary);
  let onP = readableOn(prim, toHex(mix(K, prim, .85)), '#ffffff');
  for (let i = 0; i < 30 && contrast(onP, prim) < 4.6; i++) { prim = mix(prim, dark ? W : K, .95); onP = readableOn(prim, toHex(mix(K, prim, .85)), '#ffffff'); }
  const acc = parse(accent), onA = readableOn(acc, toHex(mix(K, acc, .85)), '#ffffff');
  const status = { success: '#2e9d5b', warning: '#d08a00', danger: '#d83a3a', info: '#2f7fd8' };
  const st = Object.fromEntries(Object.entries(status).map(([k, v]) => [k, tintFit(dark ? mix(v, W, .7) : v)]));
  const onD = readableOn(st.danger, toHex(mix(K, st.danger, .85)), '#ffffff');
  const h = c => toHex(c);
  return {
    dark,
    tokens: {
      '--bg': h(bg), '--surface': h(surf), '--surface-2': h(s2), '--surface-3': h(s3),
      '--text': h(txtF), '--muted': h(muted), '--line': h(mix(txtF, surf, dark ? .2 : .16)),
      '--primary': h(prim), '--primary-2': h(mix(prim, dark ? W : K, .85)), '--on-primary': h(onP),
      '--accent': h(acc), '--on-accent': h(onA),
      '--success': h(st.success), '--warning': h(st.warning), '--danger': h(st.danger), '--info': h(st.info), '--on-danger': h(onD)
    }
  };
}

const { dark, tokens } = derive({ bg: need('bg'), primary: need('primary'), accent: need('accent'), text: opt('text'), surface: opt('surface') });
const fam = s => s ? s.split(':')[0].replace(/\+/g, ' ') : '';
const head = opt('head', ''), body = opt('body', '');
const radius = +opt('radius', 12);
const css = `/* ${name} · ${group} · ${dark ? 'oscuro' : 'claro'} — ${desc}.
   Generado con tools/new-theme.mjs: los colores ya pasan AA; falta darle carácter (ver assets/core/THEMES.md). */
[data-theme="${id}"] {
  --font-body: ${body ? `'${fam(body)}', ` : ''}system-ui, sans-serif; --font-head: ${head ? `'${fam(head)}', ` : ''}system-ui, sans-serif;
  --head-weight: 700; --head-transform: none; --head-spacing: -0.01em; --body-size: 15px;
  --bg: ${tokens['--bg']}; --bg-image: none;
  --surface: ${tokens['--surface']}; --surface-2: ${tokens['--surface-2']}; --surface-3: ${tokens['--surface-3']};
  --text: ${tokens['--text']}; --muted: ${tokens['--muted']}; --line: ${tokens['--line']};
  --primary: ${tokens['--primary']}; --primary-2: ${tokens['--primary-2']}; --on-primary: ${tokens['--on-primary']};
  --accent: ${tokens['--accent']}; --on-accent: ${tokens['--on-accent']};
  --success: ${tokens['--success']}; --warning: ${tokens['--warning']}; --danger: ${tokens['--danger']}; --info: ${tokens['--info']}; --on-danger: ${tokens['--on-danger']};
  --radius: ${radius}px; --radius-sm: ${Math.round(radius * .66)}px; --radius-pill: 999px; --border-w: 1px;
  --shadow: 0 1px 2px rgba(0, 0, 0, ${dark ? '.4' : '.06'}), 0 10px 24px -12px rgba(0, 0, 0, ${dark ? '.7' : '.2'});
  --shadow-lg: 0 30px 60px -24px rgba(0, 0, 0, ${dark ? '.8' : '.3'});
  --focus: 0 0 0 3px color-mix(in srgb, ${tokens['--primary']} 45%, transparent);
  color-scheme: ${dark ? 'dark' : 'light'};
}
/* Personaliza aquí (siempre con [data-theme="${id}"] delante):
[data-theme="${id}"] h1 { }
[data-theme="${id}"] .eyebrow::before { content: '✦ '; }
:where([data-theme="${id}"]) .card { }
[data-theme="${id}"] .btn { }
[data-theme="${id}"] .table th { }
[data-theme="${id}"] .nav-link.active { }
[data-theme="${id}"] body::before { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; }
@keyframes lgw-${id}-algo { }
*/
`;
fs.writeFileSync(file, css);
const fonts = [head, body].filter(Boolean).map(f => f.replace(/ /g, '+')).join('&family=');
const entry = `    { id: '${id}', name: '${name.replace(/'/g, "\\'")}', group: '${group}', dark: ${dark}, desc: '${desc.replace(/'/g, "\\'")}', sw: ['${tokens['--bg']}', '${tokens['--primary']}', '${tokens['--accent']}'], fonts: '${fonts}' }`;
console.log(`✓ ${path.relative(ROOT, file)}`);
if (flag('register')) {
  const bootFile = path.join(ROOT, 'assets/core/theme-boot.js');
  let src = fs.readFileSync(bootFile, 'utf8');
  const i = src.indexOf('var THEMES = [');
  let depth = 0, k = src.indexOf('[', i);
  for (; k < src.length; k++) { if (src[k] === '[') depth++; else if (src[k] === ']' && --depth === 0) break; }
  if (src.slice(i, k).includes(`id: '${id}'`)) console.log('  (ya estaba en el registro)');
  else {
    const before = src.slice(0, k).replace(/\s*$/, '');
    src = before + ',\n' + entry + '\n  ' + src.slice(k);
    fs.writeFileSync(bootFile, src);
    console.log('✓ registrado en assets/core/theme-boot.js (THEMES)');
  }
} else console.log('Agrega esta entrada a THEMES en assets/core/theme-boot.js (o vuelve a correr con --register):\n' + entry);
console.log('Luego: node tools/check-themes.mjs --themes=' + id + ' [--live]');
