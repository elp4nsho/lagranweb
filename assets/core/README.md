# Núcleo compartido de La Gran Web

Todas las webs del portafolio son **sistemas completos simulados en el navegador**: sitio público,
login con roles, panel admin/CMS y una "base de datos" en localStorage que comparten el sitio
y el panel (también entre pestañas). No hay backend real.

Ver `kit.html` para ver todos los componentes en los 60 estilos (`kit.html?theme=<id>` abre uno directo).
Los estilos (registro, una hoja por estilo, validador y generador) se documentan en [`THEMES.md`](THEMES.md).

## Archivos

| Archivo | Tipo | Qué hace |
|---|---|---|
| `theme-boot.js` | script clásico, **síncrono en `<head>`** | Registro único de los 60 estilos (`THEMES`, `THEME_GROUPS`) y de las disposiciones; carga `themes.css`, la hoja del estilo activo y sus fuentes; animaciones de entrada (WOW.js). Expone `window.LGWTheme` y `window.LGWLayout`. |
| `themes.css` | CSS | Base: tokens por defecto (Aurora) + kit de componentes. Se carga solo (no lo enlaces). |
| `themes/<id>.css` | CSS | Una hoja por estilo (tokens + overrides + decoración), cargada a pedido. Ver `THEMES.md`. |
| `db.js` | módulo ES | `createDB(nombre, { version, seed })`, `api(fn)` (latencia simulada), `rng(seed)` (semillas reproducibles), `uid()`. |
| `auth.js` | módulo ES | `createAuth(db, { roles })`: login/logout/register, `require(roles)`, `mountDemoLogin(el)`, `initials()`. |
| `router.js` | módulo ES | `createRouter({ '/ruta/:id': fn })` por hash, `highlight()` de enlaces activos. |
| `ui.js` | módulo ES | `html```/`raw()`, `escape`, `money` (CLP), `date`, `ago`, `toast`, `modal`, `confirm`, `formModal`, `dataTable`, `barChart`, `lineChart`, `donutChart`, `downloadCSV`, `wireAdminShell`, `$`, `$$`, `norm`, `debounce`. |
| `app.js` | módulo ES · **kernel** | `defineApp()` (raíz de composición: db + auth + roles + páginas) → `app.panel()`, `app.site()`, `app.login()`. |
| `resource.js` | módulo ES · **kernel** | `resource(app, { fields, hooks })`: CRUD guiado por esquema. `fieldTypes`/`fieldType()`, `renderFields`, `readFields`, `fieldsModal`. |
| `blocks.js` | módulo ES · **kernel** | Bloques de página: `pageHead`, `kpis`, `card`/`chartCard`, `emptyState`, `kv`, `timeline`, `historyTimeline`, `activityFeed`, `badge`, `userChip`, `tabs`. |
| `pages.js` | módulo ES · **kernel** | `loginPage`, `usersSection`, `settingsSection` (con "Restablecer datos demo"), `logSection`, `accountSection`, `resetDemo`. |
| `domain.js` | módulo ES · **kernel** | `stateMachine()` (estados + historial + bitácora), `rut`, `nextCode`, `byMonth`, `byDay`, `countBy`, `sumBy`. |
| `kernel.css` | CSS | Clases `k-*` del kernel. La inyectan sus módulos (antes de `themes.css`); no la enlaces. |
| `ARCHITECTURE.md` | doc | Diagnóstico, patrones, cómo crear una app en 5 pasos y cómo migrar las antiguas. |
| `examples/bicicleteria/` | demo | App completa hecha con el kernel (≈ 180 líneas de JS). |
| `modules.js` | módulo ES puro · **producción** | Módulos (feature toggles): `resolveModules`, `mergeModules`, `blockedPages`. Ver `PRODUCTION.md`. |
| `client.js` | módulo ES · **producción** | Ficha de cliente: `defineClient` (valida), `brandCss`, `applyClient`, `devClient` (`?cliente=`/`?modulos=`), `adapterFor`. |
| `legal.js` | módulo ES puro | `privacyHtml(cliente)`: política de privacidad base (Ley 21.719). |
| `store/local.js` · `store/supabase.js` | módulos ES | Adaptadores de datos de `createDB` (interfaz en `PRODUCTION.md` §4). `vendor/supabase.js` = supabase-js empaquetado. |
| `PRODUCTION.md` | doc | De plantilla a producción: módulos, `client.config.js`, adaptadores, SQL/RLS, pruebas, checklist. |
| `../portfolio-bar.js` | script clásico (defer) | Pastilla "← La Gran Web" + selector de disposiciones y estilos (agrupados por categoría, con búsqueda y filtro claro/oscuro), abajo a la izquierda. |

## Esqueleto de cada página

```html
<!doctype html>
<html lang="es" data-app="tienda" data-default-theme="brutal">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Raíz · Tienda</title>
  <script src="../assets/core/theme-boot.js"></script>
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  ...
  <script type="module" src="js/public/main.js"></script>
  <script src="../assets/portfolio-bar.js" defer></script>
</body>
</html>
```

`data-app` debe ser igual en todas las páginas de la app (así el estilo elegido se mantiene entre
sitio y panel). Las páginas usan módulos ES: hay que abrirlas desde un servidor
(`python3 -m http.server`), no con file://.

## Reglas de estilo (importante)

- El CSS propio de la app usa **solo tokens**: `var(--surface)`, `var(--text)`, `var(--muted)`, `var(--line)`,
  `var(--primary)`, `var(--on-primary)`, `var(--accent)`, `var(--on-accent)`, `var(--success|warning|danger|info)`, `var(--on-danger)`, `var(--radius)`,
  `var(--radius-sm)`, `var(--radius-pill)`, `var(--border-w)`, `var(--shadow)`, `var(--shadow-lg)`, `var(--font-head)`,
  `var(--font-body)`, `var(--font-mono)`, `var(--head-weight)`, `var(--head-transform)`, `var(--head-spacing)`, `var(--gap)`, `var(--pad)`, `var(--blur)`, `var(--ease)`.
  Nada de colores fijos salvo dentro de ilustraciones SVG (y aun ahí, prefiere tokens con `currentColor`/`var()`).
- Usa las clases del kit: `.container .section .stack .row .between .grid-2/3/4 .grid-auto .card(.hover) .btn(.btn-primary/.btn-accent/.btn-ghost/.btn-danger/.btn-sm/.btn-lg/.btn-icon/.btn-block) .field .input .select .textarea .check .switch .badge(-success/-warning/-danger/-info/-primary) .chip(.active) .table-wrap .table .tabs .tab .avatar .stat .progress .empty .skeleton .spinner .eyebrow .muted`.
- Panel admin: `.admin-shell > aside.admin-sidebar (.admin-brand, .nav-section, a.nav-link[.active] con .ico/.count) + .admin-main > header.admin-topbar (button.btn.admin-burger) + main.admin-content (.page-head)`. Llama `wireAdminShell()`.
- Marca con `data-anim` (opcional `data-anim="bounceIn"`, `data-anim-delay="150"`) los bloques del sitio público que deben animarse al aparecer en los estilos HTML5. Las `.card` públicas se animan solas.
- Debe verse bien en **los 60 estilos**, oscuros y claros, a 375 px y en escritorio (no uses `body::before/::after`: son de las decoraciones de los estilos). No pongas UI fija abajo a la izquierda (ahí va la barra del portafolio).

## Datos y roles

```js
import { createDB, rng } from '../../assets/core/db.js';
import { createAuth } from '../../assets/core/auth.js';
export const db = createDB('tienda', { version: 1, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', editor: 'Editor', customer: 'Cliente' } });
```

- Usuarios en la colección `users`: `{ name, email, password, role, color, demo: true, active: true }`.
  Las cuentas con `demo: true` aparecen como botones "entrar como…" en el login.
- Sube `version` si cambias la forma de la semilla (reinicia los datos guardados).
- `db.subscribe(fn)` para refrescar la vista cuando cambian datos (también desde otra pestaña).
- `db.log(acción, detalle, userId)` alimenta la bitácora de actividad del panel.
- Ofrece en el panel un botón "Restablecer datos demo" (`db.reset()`).

## Disposiciones (layouts)

Además del estilo, cada web tiene varias **disposiciones** que reorganizan la página completa
(sitio público y panel): `html[data-layout="<id>"]` (por defecto `clasica`, o `data-default-layout`).
Se eligen en el selector 🎨 de la barra flotante o con Alt + ↑ / ↓; se guardan por web en
`localStorage['lgw:layout:<data-app>']`. API: `window.LGWLayout` (`list`, `current`, `find(id)`,
`set(id)`, `next(±1)`), evento `lgw:layout`.

| id | Público | Panel admin |
|---|---|---|
| `clasica` | barra superior, secciones apiladas | menú lateral izquierdo |
| `revista` | cabecera centrada tipo diario, portada partida, secciones numeradas | menú horizontal arriba |
| `app` | cabecera → barra lateral fija (pestañas abajo en celular), bento | riel de íconos que se expande |
| `portal` | cabezal + franja de secciones a color; portada densa en columnas 4\|2 / 2\|4 con filetes | barra superior + mega-barra de color con todo el menú |
| `inmersiva` | cabecera en píldora flotante, portada a pantalla completa, secciones-pantalla con imán | dock flotante abajo al centro + barra superior flotante |
| `dividida` | mitad izquierda fija tipo afiche (marca enorme, menú numerado), contenido a la derecha | menú a la derecha (sale desde la derecha en celular) |
| `tablero` | barra de herramientas compacta con menú segmentado; portada como tablero de tarjetas (mampostería) | cinta de mosaicos (ícono sobre texto) arriba |
| `documento` | una columna angosta; el menú es un índice numerado siempre visible; secciones § | índice del panel en columnas arriba del contenido |
| `carrusel` | menú en tira de fichas; portada como diapositiva con puntos; cada grilla de tarjetas es una fila que se desliza de lado (scroll-snap dentro de su sección) | fichas arriba; en escritorio el contenido son paneles-columna que se deslizan de lado |
| `terminal` | compacta: letra mono pequeña, línea de estado + sub-barra de comandos `[ … ]` pegada arriba, portada-prompt con cursor, listas densas | árbol angosto (├─) a la izquierda, todo denso |
| `kiosco` | táctil: marca centrada, menú en mosaicos enormes con flecha (2 por fila en celular), letra y botones grandes | lanzador de apps: íconos redondos con su nombre, arriba del contenido |
| `riel` | sin cabecera arriba: riel angosto fijo a la DERECHA con la marca y el menú escritos en vertical (también en celular) | riel de íconos a la derecha que se expande hacia la izquierda |
| `pestanas` | el menú son pestañas de carpeta apoyadas sobre una gran hoja enmarcada con todo el contenido | pestañas (varias filas) sobre un panel enmarcado |
| `acordeon` | cada sección es un panel de acordeón con barra de título numerada y −, siempre desplegado; menú en barras con ▸ | menú arriba en grupos apilados (barra ▾ + fichas) |
| `linea` | línea de tiempo: menú como línea de metro; secciones colgando de una columna central, alternadas a cada lado con hitos numerados (a la izquierda en angosto) | línea de pasos vertical (nodos unidos) a la izquierda |
| `diapositivas` | escenario oscuro; barra de herramientas con menú numerado; cada sección es una diapositiva 16:9 numerada | clasificador de miniaturas numeradas a la izquierda (tira arriba en celular) y contenido sobre una diapositiva |
| `ventana` | toda la web dentro de una ventana flotante centrada (barra de título con 3 botones) sobre un escritorio con trama | el panel completo como aplicación en ventana |
| `barra` | toda la cabecera es una barra fija ABAJO, también en escritorio (dos pisos en celular); la barra del portafolio sube | barra de tareas abajo a todo el ancho (inicio, botones, bandeja) |
| `escaparate` | la imagen primero: portada enorme a todo el ancho con el texto montado en una tarjeta; pocas piezas grandes por fila | barra superior como portada de color alta y menú en tarjeta de fichas montada sobre su borde |
| `diagonal` | asimétrica: fichas inclinadas, portada con imagen girada sobre franja diagonal, bandas cortadas en diagonal con números gigantes calados | lomo vertical a la izquierda con las secciones escritas de abajo hacia arriba |

### Cómo está armado (registro + una hoja por disposición)

- **Registro único**: `LAYOUTS` en `theme-boot.js` (`id`, `name`, `icon`, `desc`, `thumb` SVG, `css`).
  De ahí salen el panel 🎨 (grilla de miniaturas), el atajo Alt + ↑ / ↓ y la validación del valor guardado.
- **Una hoja por disposición**: `assets/core/layouts/<id>.css`. `theme-boot.js` inserta solo la de la
  disposición activa, justo después de `layouts.css` (reglas compartidas) y **antes** del CSS de la app,
  para que las reglas `[data-layout]` de cada web ganen. La clásica no tiene hoja (`css: false`).
- **Agregar una disposición**: 1) entrada en `LAYOUTS` (con `thumb` en `viewBox="0 0 80 46"`);
  2) `assets/core/layouts/<id>.css` con todas sus reglas bajo `[data-layout="<id>"]`, cubriendo sitio
  público (clases-gancho) y panel (`.admin-shell`), escritorio y ≤ 900 px; 3) `node tools/check-layouts.mjs --layouts=<id>`
  y mirar las hojas de contactos. No hay que tocar el panel ni el revisor.

### Clases-gancho

- **Panel admin** (`.admin-shell`): cada `.nav-link` debe tener su ícono en `<span class="ico">`
  (lo usan el riel, el dock y la cinta de mosaicos). El pie del menú (salir, restablecer…) es cualquier
  hijo directo de `.admin-sidebar` que no sea `.admin-brand`, `nav`, `.nav-section` ni `.nav-link`.
- **Sitio público**:
  - `header.site-header` con `.site-brand`, `nav.site-nav` (enlaces `a`/`button`, directos o dentro de un
    envoltorio) y `.site-actions`. Botón de menú móvil: `[class*="burger"]`, `.nav-toggle`, `.menu-toggle`
    o `.mobile-nav-btn`; panel móvil aparte: `.site-header .mobile-nav`.
  - `main.site-main` con las secciones (directas o dentro de un único envoltorio); la portada es
    `section.site-hero > .container > .hero-text + .hero-media`. Portal y Tablero reordenan la página que
    tiene `.site-hero` (cada hijo del contenedor es una pieza/tarjeta y sus grillas se pliegan con
    *container queries*).
  - `footer.site-footer`

Lo específico de cada web va en su CSS con `[data-layout="<id>"] …`: orden de secciones, columnas del
detalle o del checkout, listas vs. tarjetas, etc. Todas deben funcionar con todos los estilos, a 375 px
y en escritorio, sin desborde horizontal ni nada fijo sobre la barra del portafolio (abajo a la izquierda).

### Revisión automática

`node tools/check-layouts.mjs` (con `python3 -m http.server 8872` corriendo) abre cada web × cada
disposición del registro × 1440 y 375 px: portada, una página interior y el panel, rotando 3 estilos
contrastados (`--styles=all` para los 3 en todo). Falla ante errores de página/consola, desborde
horizontal o menú inalcanzable y deja hojas de contactos por web (`--out=`, por defecto en el tmp del sistema).

## Kernel de apps (opt-in)

> Para vender una plantilla a un cliente (solo algunos módulos, su marca, backend Supabase, build estático) ver
> [`PRODUCTION.md`](PRODUCTION.md). `createDB` acepta ahora `{ adapter }` (por defecto `local`, idéntico al de siempre).

Para apps **nuevas** (y para migrar secciones de las antiguas, ver `ARCHITECTURE.md`). Las 30 apps
existentes siguen usando `createDB`/`createAuth`/`createRouter` y no cambian.

```bash
node tools/new-app.mjs reparto --name="Ruta Corta" --title="Planificador de reparto" --icon=🚚 --theme=nordic
```

crea `reparto/` (index/login/admin.html, `css/app.css`, `js/app.js|admin.js|site.js|login.js`) lista para abrir.

### 1. Definir la app (`js/app.js`)

```js
import { defineApp } from '../../assets/core/app.js';
import { resource } from '../../assets/core/resource.js';
import { stateMachine, nextCode } from '../../assets/core/domain.js';

export const app = defineApp({
  name: 'reparto', version: 1, seed,                       // seed() → { users: [...], stops: [...] }
  brand: { name: 'Ruta Corta', logo: '🚚' },
  roles: { admin: 'Administrador', despacho: 'Despacho', chofer: 'Chofer' },
  pages: { 'admin.html': ['admin', 'despacho'], 'chofer.html': ['chofer', 'admin'] },  // guardas por página
  home: { admin: 'admin.html', despacho: 'admin.html#/paradas', chofer: 'chofer.html' },
  settings: { tagline: 'Entregas a tiempo' }               // app.settings() = defaults + lo guardado
});

export const STOP = stateMachine({
  states: { pendiente: { label: 'Pendiente', tone: 'info' }, en_ruta: { label: 'En ruta', tone: 'primary' },
            entregada: { label: 'Entregada', tone: 'success', final: true }, fallida: { label: 'Fallida', tone: 'danger', note: true } },
  transitions: { pendiente: ['en_ruta'], en_ruta: ['entregada', 'fallida'], fallida: ['en_ruta'] },
  onEnter: { entregada: (row, patch) => { patch.deliveredAt = new Date().toISOString(); } },
  guard: (row, to) => to !== 'en_ruta' || row.driverId ? true : 'Asigna un chofer'
});

export const stops = resource(app, {
  collection: 'stops', id: 'paradas', singular: 'parada', plural: 'Paradas', feminine: true, icon: '📍',
  title: s => s.code, subtitle: s => s.address,
  fields: [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'address', label: 'Dirección', required: true, search: true, wide: true },
    { name: 'driverId', label: 'Chofer', type: 'ref', ref: 'users', refFilter: u => u.role === 'chofer', filter: true },
    { name: 'cod', label: 'Cobro contra entrega', type: 'money' },
    { name: 'window', label: 'Ventana', type: 'select', options: ['09–12', '12–15', '15–18'] },
    { name: 'status', label: 'Estado', type: 'status', machine: STOP }
  ],
  rows: ctx => app.db.query('stops', s => ctx.user?.role !== 'chofer' || s.driverId === ctx.user.id),
  permissions: { create: ['admin', 'despacho'], delete: ['admin'] },
  beforeSave: (v, row) => (row ? v : { ...v, code: nextCode(app.db, 'stop', 'P-', 1001) }),
  detail: { render: s => `<section class="card">…mapa…</section>` },
  count: () => app.db.count('stops', s => s.status === 'fallida')
});
```

### 2. Panel por rol (`js/admin.js`)

```js
import { app, stops } from './app.js';
import { usersSection, settingsSection, logSection } from '../../assets/core/pages.js';
import { pageHead, kpis, chartCard } from '../../assets/core/blocks.js';

app.panel({
  page: 'admin.html', sub: 'Despacho', topbar: '<a class="btn btn-sm" href="chofer.html">App chofer</a>',
  nav: [
    { section: 'Operación' },
    { id: '', label: 'Resumen', icon: '📊', render: view => { view.innerHTML = pageHead('Hoy') + kpis([{ label: 'Paradas', value: 42 }]); } },
    stops.section(),                                       // #/paradas y #/paradas/:id
    { id: 'rutas', label: 'Rutas', icon: '🗺️', roles: ['admin'], render: (view, ctx) => {/* vista libre */},
      routes: { ':id': { label: 'Ruta', render: (view, { params }) => {/* detalle */} } }, watch: ['routes'] },
    { section: 'Sistema' },
    usersSection(app, { roles: ['admin'] }),
    settingsSection(app, { roles: ['admin'], groups: [{ title: 'Sitio', fields: [{ name: 'tagline', label: 'Eslogan' }] }] }),
    logSection(app, { roles: ['admin'] })
  ]
});
```

- Sin sesión → `login.html?next=…`; rol sin permiso para la página → `app.homeFor(usuario)`.
- Ítems con `roles` se ocultan del menú y su ruta muestra "Acceso restringido"; las secciones vacías desaparecen.
- `render(view, ctx)` recibe `ctx = { app, db, auth, user, params, query, item, panel, refresh }`. Si devuelve
  `{ refresh }`, el panel la actualiza en vivo sin perder filtros; si no, la vuelve a pintar (nunca bajo
  un modal ni mientras se escribe). `watch: ['col']` limita qué colecciones la refrescan.
- `count: () => n` pinta el contador del menú. `{ href: 'otra.html', label, icon }` = enlace externo.
- Incluye pie con usuario, "Datos demo" (restablecer) y "Salir", y se adapta solo a las disposiciones.

### 3. Login y sitio

```js
app.login({ demoText: 'Cada rol ve un sistema distinto.' });              // js/login.js (login.html = <div id="app">)
app.site({ nav: [['Inicio', '#/'], ['Seguimiento', '#/seguimiento']],    // js/site.js
           routes: { '/': (view, ctx) => { view.innerHTML = '…'; } } });
```

`app.site()` usa las clases-gancho de las disposiciones (`site-header`, `site-nav`, `site-main`…),
muestra "Ingresar" o "Mi panel/Salir" según la sesión y se refresca cuando cambian los datos.

### 4. `resource()` en detalle

| Opción | Para qué |
|---|---|
| `fields[]` | `{ name, label, type, required, options, help, placeholder, wide, default, min, max, step, search, filter, table: false, form: false, detail: false, csv: false, createOnly, render(v,row), check(v,values) }` |
| tipos | `text email tel url password color number money textarea select date datetime bool (toggle: true → interruptor en la tabla) tags rut ref (ref, refLabel, refFilter) status (machine)` · nuevos con `fieldType('nombre', {...fieldTypes.text, read, cell, text, check})` |
| datos | `rows(ctx)`, `defaults(ctx)`, `sort(a,b)`, `filters: [{ key, label, options, test }]`, `search(row)` |
| hooks | `validate → texto`, `beforeSave → valores \| false`, `afterSave(row, { isNew, before })`, `canDelete → true \| texto`, `afterDelete`, `afterStatus` |
| UI | `title(row)`, `subtitle(row)`, `columns(cols) → cols`, `rowActions: [{ id, label, icon, when, run }]`, `pageActions: [{ label, icon, primary, run }]`, `detail: true \| { render, aside, mount }`, `intro`, `empty`, `below(ctx)`, `pageSize`, `csv(row) \| false`, `log: 'acción' \| false`, `feminine` |
| permisos | `permissions: { create, edit, delete }` (listas de roles) · `readonly: true` |
| API | `.section(extra)`, `.renderList(view, ctx, { embedded, title, where, preset, onRow })` (maestro‑detalle: p. ej. pagos dentro del detalle de una polla, desde `detail.mount`), `.renderDetail(view, ctx)`, `.form(row?, ctx, preset)`, `.save(values, row?)`, `.remove(row)`, `.changeStatus(row, to?)`, `.columns()`, `.can(acción)` |

`renderList`/`renderDetail` funcionan en cualquier contenedor: sirven para migrar una sección de
una app antigua dentro de su router propio.

### 5. Estados (`domain.stateMachine`)

`m.label(s)`, `m.tone(s)`, `m.badge(s)`, `m.options()`, `m.next(row)`, `m.can(row, to)`,
`m.move(db, col, idOFila, to, { by, note, log, title, extra, at })`, `m.seedHistory(['a','b'], { start, stepHours })`.
`move()` guarda `{ at, from, to, by, note }` en `row.history`, fija `statusAt`, corre `onEnter[to]` y
escribe "CÓDIGO: Origen → Destino" en la bitácora leyendo el origen **antes** de mutar (las filas de
`db.get()` son objetos vivos). `at` (ISO, opcional) fecha el cambio en el pasado: sirve para semillas que
simulan la historia con las mismas funciones de la app (ver `polla/js/seed.js`). Estados con `note: true` piden motivo desde el panel.
