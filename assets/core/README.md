# Núcleo compartido de La Gran Web

Todas las webs del portafolio son **sistemas completos simulados en el navegador**: sitio público,
login con roles, panel admin/CMS y una "base de datos" en localStorage que comparten el sitio
y el panel (también entre pestañas). No hay backend real.

Ver `kit.html` para ver todos los componentes en los 30 estilos.

## Archivos

| Archivo | Tipo | Qué hace |
|---|---|---|
| `theme-boot.js` | script clásico, **síncrono en `<head>`** | 30 estilos, carga sus fuentes, carga `themes.css`, animaciones de entrada (WOW.js) en los estilos HTML5. Expone `window.LGWTheme`. |
| `themes.css` | CSS | Tokens + kit de componentes + overrides por estilo. Se carga solo (no lo enlaces). |
| `db.js` | módulo ES | `createDB(nombre, { version, seed })`, `api(fn)` (latencia simulada), `rng(seed)` (semillas reproducibles), `uid()`. |
| `auth.js` | módulo ES | `createAuth(db, { roles })`: login/logout/register, `require(roles)`, `mountDemoLogin(el)`, `initials()`. |
| `router.js` | módulo ES | `createRouter({ '/ruta/:id': fn })` por hash, `highlight()` de enlaces activos. |
| `ui.js` | módulo ES | `html```/`raw()`, `escape`, `money` (CLP), `date`, `ago`, `toast`, `modal`, `confirm`, `formModal`, `dataTable`, `barChart`, `lineChart`, `donutChart`, `downloadCSV`, `wireAdminShell`, `$`, `$$`, `norm`, `debounce`. |
| `../portfolio-bar.js` | script clásico (defer) | Pastilla "← La Gran Web" + selector de estilos (abajo a la izquierda). |

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
  `var(--primary)`, `var(--on-primary)`, `var(--accent)`, `var(--on-accent)`, `var(--success|warning|danger|info)`, `var(--radius)`,
  `var(--radius-sm)`, `var(--radius-pill)`, `var(--border-w)`, `var(--shadow)`, `var(--shadow-lg)`, `var(--font-head)`,
  `var(--font-body)`, `var(--font-mono)`, `var(--head-weight)`, `var(--head-transform)`, `var(--head-spacing)`, `var(--gap)`, `var(--pad)`, `var(--blur)`, `var(--ease)`.
  Nada de colores fijos salvo dentro de ilustraciones SVG (y aun ahí, prefiere tokens con `currentColor`/`var()`).
- Usa las clases del kit: `.container .section .stack .row .between .grid-2/3/4 .grid-auto .card(.hover) .btn(.btn-primary/.btn-accent/.btn-ghost/.btn-danger/.btn-sm/.btn-lg/.btn-icon/.btn-block) .field .input .select .textarea .check .switch .badge(-success/-warning/-danger/-info/-primary) .chip(.active) .table-wrap .table .tabs .tab .avatar .stat .progress .empty .skeleton .spinner .eyebrow .muted`.
- Panel admin: `.admin-shell > aside.admin-sidebar (.admin-brand, .nav-section, a.nav-link[.active] con .ico/.count) + .admin-main > header.admin-topbar (button.btn.admin-burger) + main.admin-content (.page-head)`. Llama `wireAdminShell()`.
- Marca con `data-anim` (opcional `data-anim="bounceIn"`, `data-anim-delay="150"`) los bloques del sitio público que deben animarse al aparecer en los estilos HTML5. Las `.card` públicas se animan solas.
- Debe verse bien en **los 30 estilos**, oscuros y claros, a 375 px y en escritorio. No pongas UI fija abajo a la izquierda (ahí va la barra del portafolio).

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

## Disposiciones (3 layouts)

Además del estilo, cada web tiene 3 **disposiciones** que reorganizan la página completa:
`html[data-layout="clasica" | "revista" | "app"]` (por defecto `clasica`, o `data-default-layout`).
Se eligen en el selector 🎨 de la barra flotante o con Alt + ↑ / ↓. API: `window.LGWLayout.set(id)`,
evento `lgw:layout`.

`layouts.css` (lo carga `theme-boot.js`) ya resuelve:

- **Panel admin** (`.admin-shell`): clásica = menú lateral; revista = menú horizontal arriba;
  app = riel de íconos que se expande al pasar el mouse. Para que el riel funcione, cada
  `.nav-link` debe tener su ícono en `<span class="ico">`.
- **Sitio público**, si marcas la estructura con estas clases-gancho:
  - `header.site-header` con `.site-brand`, `nav.site-nav` (enlaces directos `a`/`button`) y `.site-actions`
  - `main.site-main` con las secciones; la portada es `section.site-hero > .container > .hero-text + .hero-media`
  - `footer.site-footer`

  revista = cabecera centrada tipo diario, portada partida, secciones numeradas, grillas con
  pieza destacada; app = cabecera convertida en barra lateral fija (pestañas abajo en celular),
  portada tipo tarjeta, secciones como paneles y grillas bento.

Lo específico de cada web va en su CSS con `[data-layout="revista"] …` y `[data-layout="app"] …`:
orden de secciones (`order`, `grid-template-areas`), columnas del detalle de producto o del
checkout, listas vs. tarjetas, posición de filtros y resúmenes, etc. Las 3 disposiciones deben
verse claramente distintas y funcionar con los 30 estilos, a 375 px y en escritorio.
