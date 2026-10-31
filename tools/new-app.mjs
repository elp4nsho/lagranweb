#!/usr/bin/env node
// Crea una app nueva sobre el kernel (assets/core/app.js): sitio público + login con cuentas demo +
// panel por rol con un recurso CRUD, estados con historial, usuarios, configuración y bitácora.
//
//   node tools/new-app.mjs <carpeta> [--name="Mi Marca"] [--title="Sistema de X"] [--theme=aurora]
//                          [--icon=◆] [--force] [--register --cat=Logística --desc="…"]
//
//   --register  agrega la app a projects.js (la landing del portafolio).
// Luego: python3 -m http.server  →  http://localhost:8000/<carpeta>/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = n => args.includes('--' + n);
const dir = args.find(a => !a.startsWith('--'));
if (!dir || !/^[a-z][a-z0-9-]*$/.test(dir)) {
  console.error('Uso: node tools/new-app.mjs <carpeta-en-minúsculas> [--name="Marca"] [--title="Descripción"] [--theme=aurora] [--icon=◆] [--force] [--register]');
  process.exit(1);
}
const target = path.join(ROOT, dir);
if (fs.existsSync(target) && !flag('force')) { console.error(`Ya existe ${dir}/ (usa --force para sobrescribir)`); process.exit(1); }

const brand = opt('name', dir.charAt(0).toUpperCase() + dir.slice(1));
const title = opt('title', 'Sistema de gestión');
const theme = opt('theme', 'aurora');
const icon = opt('icon', '◆');
const domain = dir.replace(/-/g, '') + '.cl';
const js = s => JSON.stringify(s);

const page = (t, entry) => `<!doctype html>
<html lang="es" data-app="${dir}" data-default-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t} · ${brand}</title>
  <script src="../assets/core/theme-boot.js"></script>
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="js/${entry}.js"></script>
  <script src="../assets/portfolio-bar.js" defer></script>
</body>
</html>
`;

const files = {
  'index.html': page(brand, 'site'),
  'login.html': page('Ingresar', 'login'),
  'admin.html': page('Panel', 'admin'),
  'css/app.css': `/* Estilos propios de ${brand}. Solo tokens (var(--primary), var(--surface)…) y clases del kit:
   así se ve bien en los 30 estilos. Las disposiciones: [data-layout="revista"] …, [data-layout="app"] … */
.site-hero h1 { font-size: clamp(32px, 5vw, 56px); margin: 0; }
`,
  'js/app.js': `// ${brand}: configuración declarativa de la app (datos, roles, páginas, estados y recursos).
// La importan todas las páginas. Ver assets/core/README.md (sección Kernel) y ARCHITECTURE.md.
import { defineApp } from '../../assets/core/app.js';
import { resource } from '../../assets/core/resource.js';
import { stateMachine, nextCode } from '../../assets/core/domain.js';
import { rng } from '../../assets/core/db.js';

// Estados de un registro principal (renómbralo a lo que tu sistema gestione: pedidos, rutas, cuotas…)
export const STATUS = stateMachine({
  states: {
    nuevo: { label: 'Nuevo', tone: 'info' },
    en_curso: { label: 'En curso', tone: 'primary' },
    listo: { label: 'Listo', tone: 'success', final: true },
    cancelado: { label: 'Cancelado', tone: 'danger', note: true, final: true }
  },
  transitions: { nuevo: ['en_curso', 'cancelado'], en_curso: ['listo', 'cancelado'] }
});

function seed() {
  const r = rng(11);
  const users = [
    { id: 'u-admin', name: 'Admin Demo', email: 'admin@${domain}', password: 'demo123', role: 'admin', color: '#4f46e5', demo: true, active: true },
    { id: 'u-staff', name: 'Equipo Demo', email: 'equipo@${domain}', password: 'demo123', role: 'staff', color: '#059669', demo: true, active: true }
  ];
  const PATH = ['nuevo', 'en_curso', 'listo'];
  const items = Array.from({ length: 12 }, (_, i) => {
    const path = PATH.slice(0, (i % 3) + 1), start = Date.now() - r.int(1, 90) * 864e5;
    return { id: 'it' + i, code: 'R-' + (101 + i), name: r.pick(['Alfa', 'Beta', 'Gamma', 'Delta', 'Épsilon']) + ' ' + (i + 1), amount: r.int(10, 200) * 1000,
      ownerId: r.pick(['u-admin', 'u-staff']), status: path.at(-1), history: STATUS.seedHistory(path, { start, by: 'u-admin' }), createdAt: new Date(start).toISOString() };
  });
  return { users, items, '_seq:item': 112 };
}

export const app = defineApp({
  name: ${js(dir)}, version: 1, seed,
  brand: { name: ${js(brand)}, logo: ${js(icon)} },
  roles: { admin: 'Administrador', staff: 'Equipo' },
  pages: { 'admin.html': ['admin', 'staff'] },
  home: { admin: 'admin.html', staff: 'admin.html#/registros' },
  settings: { tagline: ${js(title)} }
});

export const items = resource(app, {
  collection: 'items', id: 'registros', singular: 'registro', plural: 'Registros', icon: '🗂️',
  title: x => \`\${x.code} · \${x.name}\`,
  fields: [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'amount', label: 'Monto', type: 'money', required: true },
    { name: 'ownerId', label: 'Responsable', type: 'ref', ref: 'users', filter: true },
    { name: 'status', label: 'Estado', type: 'status', machine: STATUS },
    { name: 'notes', label: 'Notas', type: 'textarea' }
  ],
  permissions: { delete: ['admin'] },
  beforeSave: (v, row) => (row ? v : { ...v, code: nextCode(app.db, 'item', 'R-', 101) }),
  detail: true
});
`,
  'js/admin.js': `// Panel de ${brand}: el menú, las rutas y los permisos salen de esta lista.
import { app, items, STATUS } from './app.js';
import { usersSection, settingsSection, logSection } from '../../assets/core/pages.js';
import { pageHead, kpis, chartCard, card, activityFeed } from '../../assets/core/blocks.js';
import { byMonth, countBy, sumBy } from '../../assets/core/domain.js';
import { html, raw, money, barChart, donutChart } from '../../assets/core/ui.js';

const { db } = app;
const ADMIN = ['admin'];

function dashboard(view) {
  const all = db.all('items'), open = all.filter(x => !STATUS.isFinal(x.status));
  view.innerHTML = html\`\${pageHead('Resumen', 'Indicadores principales')}
    \${kpis([
      { label: 'Abiertos', value: open.length, icon: '🗂️', href: '#/registros' },
      { label: 'Listos', value: all.filter(x => x.status === 'listo').length, icon: '✅' },
      { label: 'Monto total', value: money(sumBy(all, 'amount')), icon: '💰' }
    ])}
    <div class="k-grid-main">
      \${raw(chartCard('Registros por mes', barChart(byMonth(all, 'createdAt'))))}
      \${raw(chartCard('Por estado', donutChart(countBy(all, 'status', STATUS.label), { label: all.length })))}
    </div>
    \${raw(card('Actividad reciente', activityFeed(db)))}\`;
}

app.panel({
  page: 'admin.html', sub: 'Panel',
  nav: [
    { section: 'General' },
    { id: '', label: 'Resumen', icon: '📊', render: dashboard },
    items.section(),
    { section: 'Sistema' },
    usersSection(app, { roles: ADMIN }),
    settingsSection(app, { roles: ADMIN, groups: [{ title: 'Sitio público', fields: [{ name: 'tagline', label: 'Eslogan', required: true }] }] }),
    logSection(app, { roles: ADMIN })
  ]
});
`,
  'js/login.js': `import { app } from './app.js';
app.login({ demoText: 'Administrador ve todo; Equipo, la operación diaria.' });
`,
  'js/site.js': `// Sitio público de ${brand} (usa las clases-gancho de las disposiciones).
import { app } from './app.js';
import { html } from '../../assets/core/ui.js';

app.site({
  nav: [['Inicio', '#/'], ['Nosotros', '#/nosotros']],
  routes: {
    '/': view => {
      const s = app.settings();
      view.innerHTML = html\`<section class="section site-hero"><div class="container"><div class="hero-text stack">
        <span class="eyebrow">\${app.brand.name}</span><h1>\${s.tagline}</h1>
        <p class="muted">Demo simulada en el navegador: entra al panel con una cuenta de prueba.</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="login.html">Entrar al panel</a></div></div></div></section>\`;
    },
    '/nosotros': view => { view.innerHTML = html\`<section class="section"><div class="container stack"><h1>Nosotros</h1><p class="muted">Cuenta aquí la historia de \${app.brand.name}.</p></div></section>\`; }
  }
});
`
};

for (const [rel, content] of Object.entries(files)) {
  const f = path.join(target, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

if (flag('register')) {
  const pf = path.join(ROOT, 'projects.js');
  const src = fs.readFileSync(pf, 'utf8');
  if (src.includes(`dir: '${dir}'`)) console.log('projects.js ya tenía la app; no se modifica.');
  else {
    const entry = `  { dir: ${js(dir).replace(/"/g, "'")}, icon: ${js(icon)}, cat: ${js(opt('cat', 'Empresas'))}, name: ${js(title)}, brand: ${js(brand)}, desc: ${js(opt('desc', title))}, tags: [], links: [['Ver sitio', 'index.html'], ['Entrar', 'login.html']] }`;
    const i = src.lastIndexOf('];');
    fs.writeFileSync(pf, src.slice(0, i).replace(/\s*$/, '') + ',\n' + entry + '\n' + src.slice(i));
    console.log('→ agregada a projects.js');
  }
}

console.log(`✓ ${dir}/ creada (${Object.keys(files).length} archivos)
  ${Object.keys(files).map(f => dir + '/' + f).join('\n  ')}
Siguiente: python3 -m http.server  →  http://localhost:8000/${dir}/login.html`);
