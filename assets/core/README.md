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
