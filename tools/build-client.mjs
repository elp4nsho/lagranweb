#!/usr/bin/env node
// Construye la carpeta publicable de un cliente: dist/<slug>/ con SOLO su app, los módulos que compró,
// el estilo y la disposición elegidos, su marca, y nada del portafolio (sin barra 🎨, sin relleno demo,
// sin cuentas demo en producción). Sirve tal cual en Cloudflare Pages, Netlify o cualquier servidor estático.
//
//   cd tools && npm i            (una vez: esbuild)
//   node tools/build-client.mjs demo-pro [--out=dist] [--no-minify]
//
// Lee clients/<slug>/client.config.js (ver assets/core/client.js) y productos/<app>/product.js.
// Escribe además dist/<slug>.build.json (resumen: módulos, páginas, archivos, advertencias).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'tools/package.json'));
const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const minify = !args.includes('--no-minify');
if (!slug) { console.error('Uso: node tools/build-client.mjs <slug> [--out=dist]'); process.exit(1); }

let esbuild;
try { esbuild = require('esbuild'); } catch (e) { console.error('Falta esbuild: cd tools && npm i'); process.exit(1); }
const { defineClient, brandCss } = await import(pathToFileURL(path.join(ROOT, 'assets/core/client.js')));
const { resolveModules } = await import(pathToFileURL(path.join(ROOT, 'assets/core/modules.js')));
const { privacyHtml } = await import(pathToFileURL(path.join(ROOT, 'assets/core/legal.js')));

// ---------- 1. Configuración ----------
const cfgFile = path.join(ROOT, 'clients', slug, 'client.config.js');
if (!fs.existsSync(cfgFile)) { console.error(`No existe ${path.relative(ROOT, cfgFile)}`); process.exit(1); }
const raw = (await import(pathToFileURL(cfgFile) + '?t=' + Date.now())).default;
const beFlag = opt('backend', null); // --backend=supabase elige otra entrada de `backends`
const { config: C, errors, warnings } = defineClient(beFlag ? { ...raw, backend: beFlag } : raw);
if (C.slug !== slug) errors.push(`slug del archivo (${C.slug}) ≠ carpeta (${slug})`);
const prodFile = path.join(ROOT, 'productos', C.app, 'product.js');
if (!fs.existsSync(prodFile)) errors.push(`app "${C.app}": no existe productos/${C.app}/product.js`);
if (errors.length) { console.error('✗ Configuración inválida:\n  - ' + errors.join('\n  - ')); process.exit(1); }
const P = (await import(pathToFileURL(prodFile))).default;
const mods = resolveModules(P.modules, C.modules);
if (mods.unknown.length) { console.error('✗ Módulos desconocidos: ' + mods.unknown.join(', ')); process.exit(1); }
if (mods.added.length) warnings.push(`se agregaron por dependencia: ${mods.added.join(', ')}`);
const ids = mods.ids;
const pages = P.pages.filter(p => ids.includes(p.module));

// ---------- 2. Estilo y disposición (del registro de theme-boot.js) ----------
const bootSrc = fs.readFileSync(path.join(ROOT, 'assets/core/theme-boot.js'), 'utf8');
const themeId = C.theme || P.defaults.theme, layoutId = C.layout || P.defaults.layout || 'clasica';
const themeLine = bootSrc.split('\n').find(l => l.trim().startsWith(`{ id: '${themeId}',`));
if (!themeLine) { console.error(`✗ Estilo desconocido: ${themeId}`); process.exit(1); }
const theme = Function(`return (${themeLine.trim().replace(/,\s*$/, '')})`)();
if (C.fonts === 'system') theme.fonts = '';
const lStart = bootSrc.indexOf(`{ id: '${layoutId}',`);
if (lStart < 0) { console.error(`✗ Disposición desconocida: ${layoutId}`); process.exit(1); }
const lEnd = (() => { const a = bootSrc.indexOf('\n    { id:', lStart + 5), b = bootSrc.indexOf('\n  ];', lStart); return a > 0 && a < b ? a : b; })();
const layoutSrc = bootSrc.slice(lStart, lEnd).trim().replace(/,\s*$/, '');
const layoutCss = !/css:\s*false/.test(layoutSrc.split('\n')[0]);
// theme-boot recortado: un solo estilo y una sola disposición (nada que elegir ni descargar de más).
const themesStart = bootSrc.indexOf('  var THEMES = ['), themesEnd = bootSrc.indexOf('\n  ];', themesStart) + 5;
const layStart = bootSrc.indexOf('  var LAYOUTS = ['), layEnd = bootSrc.indexOf('\n  ];', layStart) + 5;
let boot = bootSrc.slice(0, themesStart) + `  var THEMES = [\n    ${JSON.stringify(theme)}\n  ];` + bootSrc.slice(themesEnd, layStart) + `  var LAYOUTS = [\n    ${layoutSrc}\n  ];` + bootSrc.slice(layEnd);
boot = `// theme-boot recortado por tools/build-client.mjs para ${slug}: estilo ${themeId}, disposición ${layoutId}.\n` + boot;

// ---------- 3. Carpeta de salida ----------
const OUT_ROOT = path.resolve(ROOT, opt('out', 'dist'));
const OUT = path.join(OUT_ROOT, beFlag ? `${slug}-${beFlag}` : slug);
fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const copy = (from, rel) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(path.join(ROOT, from), f); };
copy('assets/core/themes.css', 'assets/core/themes.css');
copy('assets/core/layouts.css', 'assets/core/layouts.css');
copy('assets/core/kernel.css', 'assets/core/kernel.css');
if (theme.css !== false) copy(`assets/core/themes/${themeId}.css`, `assets/core/themes/${themeId}.css`);
if (layoutCss) copy(`assets/core/layouts/${layoutId}.css`, `assets/core/layouts/${layoutId}.css`);
write('assets/core/theme-boot.js', boot);
copy(`${P.dir}/css/app.css`, 'assets/app.css');

// ---------- 4. JavaScript: un paquete por página, con la config fija y sin supabase-js si es local ----------
const clientModule = `// Configuración fija de ${slug} (generada por build-client)\nexport default ${JSON.stringify({ ...C, preview: false }, null, 1)};\n`;
const productClient = path.join(ROOT, P.dir, 'js/client.js');
const plugin = {
  name: 'lgw-client',
  setup(b) {
    b.onLoad({ filter: /[\\/]js[\\/]client\.js$/ }, a => (path.resolve(a.path) === productClient ? { contents: clientModule, loader: 'js' } : null));
    // Producción sin datos de demo: el archivo de semillas demo queda como funciones vacías (sin nombres ni cuentas demo).
    const demoFile = P.demoSeed && path.join(ROOT, P.dir, P.demoSeed);
    if (demoFile && C.mode === 'production' && C.data !== 'demo') b.onLoad({ filter: /\.js$/ }, a => {
      if (path.resolve(a.path) !== demoFile) return null;
      const names = [...fs.readFileSync(demoFile, 'utf8').matchAll(/export (?:function|const) (\w+)/g)].map(m => m[1]);
      return { contents: names.map(n => `export const ${n} = () => ({});`).join('\n'), loader: 'js' };
    });
    // Solo el código de los módulos activos: js/modules/index.js se regenera con esos instaladores.
    const modIndex = path.join(ROOT, P.dir, 'js/modules/index.js');
    b.onLoad({ filter: /[\\/]modules[\\/]index\.js$/ }, a => (path.resolve(a.path) === modIndex ? { contents: ids.map(id => `export { install as ${id} } from './${id}.js';`).join('\n'), loader: 'js', resolveDir: path.dirname(modIndex) } : null));
    if (C.backend.kind !== 'supabase') b.onLoad({ filter: /[\\/]store[\\/]supabase\.js$/ }, () => ({ contents: "export function supabaseAdapter() { throw new Error('Este build es solo local'); }", loader: 'js' }));
  }
};
const result = await esbuild.build({
  entryPoints: Object.fromEntries(pages.map(p => [path.basename(p.file, '.html'), path.join(ROOT, P.dir, p.entry)])),
  outdir: path.join(OUT, 'assets/js'), bundle: true, splitting: true, format: 'esm', target: 'es2022', minify,
  entryNames: '[name]-[hash]', chunkNames: 'chunk-[hash]', metafile: true, logLevel: 'error', legalComments: 'none', plugins: [plugin]
});
const entryOut = {}; // entrada absoluta → archivo publicado (con hash)
for (const [file, meta] of Object.entries(result.metafile.outputs)) if (meta.entryPoint) entryOut[path.resolve(meta.entryPoint)] = path.relative(OUT, path.resolve(file)).split(path.sep).join('/');

// ---------- 5. Marca: favicon, imagen OG ----------
const S = { name: C.brand.name, tagline: C.brand.tagline || C.settings.tagline || P.modules.find(m => m.base)?.settings?.tagline || '' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const primary = C.brand.colors?.primary || theme.sw?.[1] || '#4f46e5';
const bgc = theme.sw?.[0] || '#ffffff';
const brandDir = path.join(ROOT, 'clients', slug);
let favicon = 'favicon.svg';
if (C.brand.logoFile && fs.existsSync(path.join(brandDir, C.brand.logoFile))) { favicon = 'assets/' + path.basename(C.brand.logoFile); copy(path.join('clients', slug, C.brand.logoFile), favicon); }
else write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${esc(primary)}"/><text x="32" y="44" font-size="34" text-anchor="middle" font-family="system-ui,sans-serif">${esc(C.brand.logo || C.brand.name[0])}</text></svg>`);
let ogImage = null;
if (C.seo.ogImage && fs.existsSync(path.join(brandDir, C.seo.ogImage))) { ogImage = 'assets/' + path.basename(C.seo.ogImage); copy(path.join('clients', slug, C.seo.ogImage), ogImage); }
else {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${esc(bgc)}"/><rect x="0" y="560" width="1200" height="70" fill="${esc(primary)}"/><text x="80" y="290" font-size="76" font-weight="700" font-family="DejaVu Sans,Arial,sans-serif" fill="${esc(primary)}">${esc(C.brand.name)}</text><text x="80" y="370" font-size="34" font-family="DejaVu Sans,Arial,sans-serif" fill="${esc(theme.dark ? '#ffffff' : '#222222')}">${esc(S.tagline).slice(0, 70)}</text><text x="80" y="606" font-size="28" font-family="DejaVu Sans,Arial,sans-serif" fill="#ffffff">${esc(C.domain || '')}</text></svg>`;
  try { const sharp = createRequire(path.join(ROOT, 'tools/biblioteca/package.json'))('sharp'); await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, 'og.png')); ogImage = 'og.png'; }
  catch (e) { write('og.svg', svg); ogImage = 'og.svg'; warnings.push('sin sharp: imagen OG en SVG (algunas redes exigen PNG/JPG; agrega seo.ogImage)'); }
}

// ---------- 6. HTML ----------
const origin = C.domain ? `https://${C.domain}` : '';
const fill = t => t.replace('{name}', C.brand.name).replace('{tagline}', S.tagline);
const description = C.seo.description || `${C.brand.name}: ${S.tagline}`;
const bcss = brandCss(C.brand);
const fontsOrigin = theme.fonts ? '\n  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' : '';
const ct = C.contact || {};
const jsonLd = { '@context': 'https://schema.org', '@type': P.schemaType || 'LocalBusiness', name: C.brand.name, description, ...(origin ? { url: origin + '/' } : {}), ...(ct.phone ? { telephone: ct.phone } : {}), ...(ct.email ? { email: ct.email } : {}), ...(ct.address ? { address: { '@type': 'PostalAddress', streetAddress: ct.address, addressLocality: ct.city || '', addressCountry: 'CL' } } : {}), ...(ct.hours ? { openingHours: ct.hours } : {}) };
function htmlPage({ file, title, body, module: entry = null, index = false, extraHead = '' }) {
  const url = origin ? `${origin}/${file === 'index.html' ? '' : file}` : '';
  return `<!doctype html>
<html lang="es-CL" data-app="${esc(slug)}" data-default-theme="${esc(themeId)}" data-default-layout="${esc(layoutId)}" data-lock data-mode="${esc(C.mode)}" data-brand>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${index ? 'index, follow' : 'noindex, nofollow'}">
  <meta name="theme-color" content="${esc(primary)}">
  ${url ? `<link rel="canonical" href="${esc(url)}">` : ''}
  <meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:locale" content="es_CL">
  ${url ? `<meta property="og:url" content="${esc(url)}">` : ''}${ogImage ? `<meta property="og:image" content="${esc((origin ? origin + '/' : '') + ogImage)}"><meta name="twitter:card" content="summary_large_image">` : ''}
  <link rel="icon" href="${esc(favicon)}">${fontsOrigin}
  <link rel="stylesheet" href="assets/core/kernel.css" data-lgw-kernel>
  <script src="assets/core/theme-boot.js"></script>
  <link rel="stylesheet" href="assets/app.css">
  ${bcss ? `<style data-lgw-brand>${bcss}</style>` : ''}${extraHead}
</head>
<body>
  ${body}
  ${entry ? `<script type="module" src="${esc(entry)}"></script>` : ''}
</body>
</html>
`;
}
for (const p of pages) {
  const name = path.basename(p.file, '.html');
  write(p.file, htmlPage({ file: p.file, title: fill(C.seo.titles?.[p.file] || (p.public && C.seo.title) || p.title), index: !!p.public, module: entryOut[path.join(ROOT, P.dir, p.entry)],
    body: `<div id="app"></div>\n  <noscript><p style="padding:24px">Este sitio necesita JavaScript. Llámanos al ${esc(ct.phone || '')}.</p></noscript>`,
    extraHead: p.public ? `\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '' }));
}
const staticPage = (inner) => `<div class="k-auth" style="place-items:start center"><main class="card stack" style="width:min(820px,100%)"><a href="index.html" class="row" style="gap:10px;text-decoration:none;color:inherit"><b>${esc(C.brand.logo || '')} ${esc(C.brand.name)}</b></a>${inner}</main></div>`;
write('privacidad.html', htmlPage({ file: 'privacidad.html', title: `Política de privacidad · ${C.brand.name}`, index: true, body: staticPage(privacyHtml(C, { modules: ids }) + '<p><a class="btn" href="index.html">← Volver al sitio</a></p>') }));
write('404.html', htmlPage({ file: '404.html', title: `Página no encontrada · ${C.brand.name}`, body: staticPage('<h1>Página no encontrada</h1><p class="muted">La dirección no existe o cambió.</p><p><a class="btn btn-primary" href="/">Ir al inicio</a></p>') }));

// ---------- 7. SEO y despliegue ----------
const priv = pages.filter(p => !p.public).map(p => p.file);
write('robots.txt', `User-agent: *\n${priv.map(f => `Disallow: /${f}`).join('\n')}\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`);
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', 'privacidad.html'].map(u => `  <url><loc>${esc((origin || 'https://EJEMPLO.cl') + '/' + u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
if (!origin) warnings.push('sin domain: canonical/og:url vacíos y sitemap con dominio de ejemplo');
// _headers lo entienden Netlify y Cloudflare Pages. CSP: solo este origen + Google Fonts + Supabase si corresponde.
const sbOrigin = C.backend.kind === 'supabase' ? new URL(C.backend.url).origin : '';
const csp = [
  "default-src 'self'", "script-src 'self'", `style-src 'self' 'unsafe-inline'${theme.fonts ? ' https://fonts.googleapis.com' : ''}`,
  `font-src 'self' data:${theme.fonts ? ' https://fonts.gstatic.com' : ''}`, `img-src 'self' data: blob:${sbOrigin ? ' ' + sbOrigin : ''}`,
  `connect-src 'self'${sbOrigin ? ` ${sbOrigin} ${sbOrigin.replace('https://', 'wss://')}` : ''}`, "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"
].join('; ');
write('_headers', `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n\n/assets/js/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/core/*\n  Cache-Control: public, max-age=3600\n\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n`);
write('netlify.toml', `# Netlify: sitio estático, sin build (ya viene construido). Encabezados en _headers.\n[build]\n  publish = "."\n`);

// ---------- 8. Verificaciones del resultado ----------
const files = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.relative(OUT, path.join(d, e.name)).split(path.sep).join('/'))));
walk(OUT);
const problems = [];
for (const f of files.filter(f => /\.(html|js|css)$/.test(f))) {
  const s = fs.readFileSync(path.join(OUT, f), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n'); // sin líneas de comentario
  if (/(["'(])\.\.\//.test(s) && !f.startsWith('assets/js/')) problems.push(`${f}: referencia fuera de la carpeta (../)`);
  if (/portfolio-bar|demo-fill/.test(s)) problems.push(`${f}: restos del portafolio (portfolio-bar/demo-fill)`);
}
for (const f of files.filter(f => f.startsWith('assets/js/'))) { const s = fs.readFileSync(path.join(OUT, f), 'utf8'); if (/import\(["']\.\.\/\.\./.test(s)) problems.push(`${f}: import dinámico fuera de la carpeta`); }
if (C.backend.kind !== 'supabase' && files.some(f => f.startsWith('assets/js/') && fs.readFileSync(path.join(OUT, f), 'utf8').includes('supabase-js'))) problems.push('build local con supabase-js adentro');
if (C.mode === 'production' && C.data !== 'demo') { const js = files.filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(OUT, f), 'utf8')).join(''); if (/@losandes\.cl|password:\s*["']demo123/.test(js) && !(C.accounts || []).some(a => a.email === 'admin@losandes.cl')) problems.push('el JS publicado contiene cuentas demo (demo123 / @losandes.cl)'); }
const summary = { slug, app: C.app, mode: C.mode, backend: C.backend.kind, theme: themeId, layout: layoutId, modules: ids, pages: pages.map(p => p.file), files, warnings, problems, builtAt: new Date().toISOString() };
fs.writeFileSync(`${OUT}.build.json`, JSON.stringify(summary, null, 2));
const kb = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1024;
console.log(`✓ ${path.relative(ROOT, OUT)}/ · ${C.mode} · backend ${C.backend.kind} · ${themeId}/${layoutId} · módulos: ${ids.join(', ')}`);
console.log(`  ${pages.length} páginas + privacidad/404 · ${files.length} archivos · ${kb.toFixed(0)} KB`);
warnings.forEach(w => console.log('  ⚠ ' + w));
problems.forEach(p => console.log('  ✗ ' + p));
if (C.backend.kind === 'supabase') console.log(`  → esquema: node tools/supabase-schema.mjs ${slug}`);
console.log(`  → probar: npx serve ${path.relative(process.cwd(), OUT)}  ·  publicar: ver clients/DEPLOY.md`);
process.exit(problems.length ? 1 : 0);
