# La Gran Web — contexto del repositorio

Portafolio estático (HTML + CSS + módulos ES, **sin build ni backend** en el sitio de demostración) con
32 sistemas simulados en el navegador: sitio público + login con roles + panel/CMS + "base de datos" en
localStorage. Además, un camino para llevar una plantilla a **producción** para un cliente real
(módulos, marca, Supabase, build estático). Todo el texto de la UI y los comentarios van en **español (Chile)**.

## Estructura

- `index.html` + `projects.js` — landing y catálogo (`window.LGW_PROJECTS`, 32 entradas).
- `<app>/` — cada sistema: `index.html`, `login.html`, `admin.html` (+ otras páginas por rol), `css/app.css`, `js/…`.
  - **Legacy (30)**: escritas a mano sobre `createDB`/`createAuth`/`createRouter` (no tocar su forma salvo pedido).
  - **Kernel (2)**: `reparto/` y `polla/` usan `defineApp` (`assets/core/app.js`).
- `assets/core/` — núcleo compartido. Leer primero `README.md` (API), `ARCHITECTURE.md` (patrones, migración),
  `THEMES.md` (estilos) y `PRODUCTION.md` (módulos, ficha de cliente, adaptadores, Supabase).
  - `theme-boot.js`: **registro único** de los 60 estilos (`THEMES`) y 20 disposiciones (`LAYOUTS`); hojas en
    `themes/<id>.css` y `layouts/<id>.css`. `html[data-lock]` fija estilo/disposición (builds de clientes).
  - Kernel: `app.js` (defineApp, panel, sitio, módulos), `resource.js` (CRUD por esquema), `pages.js` (login,
    usuarios, configuración, bitácora), `blocks.js`, `domain.js` (stateMachine, RUT, correlativos), `modules.js`
    (resolver de módulos, puro), `client.js` (ficha de cliente, marca), `legal.js` (privacidad).
  - Datos: `db.js` (API síncrona) + `store/local.js` (localStorage) | `store/supabase.js` (+ `vendor/supabase.js`).
- `productos/taller/` — producto vendible sobre el kernel, dividido en módulos (`modules.js` puro +
  `js/modules/<id>.js`), `configurar.html` (configurador). La demo legacy `taller/` queda intacta.
- `clients/<slug>/client.config.js` — ficha de cada cliente (`demo-basico`, `demo-pro`); `clients/DEPLOY.md`.
- `biblioteca/` — biblioteca de vistas (capturas + textos por rol), generada con `tools/biblioteca/`.
- `docs/OPERACION.md` — runbook de producción (Supabase, DNS .cl, respaldos, día 2, autohospedado).
- `deploy/` — plantillas de GitHub Actions y Docker Compose (Caddy) + `backup.sh`.

## Comandos

```bash
python3 -m http.server 8890                        # servir el repo (los módulos ES no funcionan con file://)
npm i --prefix tools                               # esbuild + supabase-js (para build-client y vendor)
node tools/new-app.mjs <id> --name=… --title=… --theme=… --icon=…   # app nueva sobre el kernel
node tools/new-theme.mjs --id=… --bg=… --primary=… --accent=…       # estilo nuevo desde colores semilla
node tools/check-themes.mjs [--live]               # registro, tokens y contraste de los 60 estilos
node tools/check-layouts.mjs                       # (con server en 8872) cada web × disposición × tamaño
node tools/biblioteca/run.js <app> [--only=…]      # capturas de la biblioteca (npm i en tools/biblioteca)
node tools/check-legacy.mjs                        # humo de las 32 webs (con server en 8890)
node tools/build-client.mjs <slug> [--backend=supabase]   # → dist/<slug>/ publicable
node tools/supabase-schema.mjs <slug>              # → clients/<slug>/supabase/schema.sql (tablas + RLS)
node tools/supabase-import.mjs <slug> [--csv=dir]  # → seed.sql (cuentas, catálogos, textos, CSV)
node tools/serve-dist.mjs dist/<slug> --port=8890  # servir un build con _headers/CSP y 404 como en el hosting
node tools/test-adapter.mjs                        # motor de datos (local + supabase contra un doble)
node tools/test-schema.mjs --pg=postgresql://…     # SQL/RLS en un PostgreSQL real
node tools/check-produccion.mjs [--shots=dir]      # módulos, builds y modo supabase en Playwright (levanta su server)
```

## Convenciones (importantes)

- CSS de apps: **solo tokens** (`var(--surface)`, `var(--primary)`…) y clases del kit; nada de colores fijos.
  Clases propias del kernel con prefijo `k-` en `kernel.css`. Debe verse bien en los 60 estilos, claro/oscuro, 375 px y escritorio.
- **Clases-gancho** de las disposiciones: `site-header/site-brand/site-nav/site-actions/site-main/site-hero/site-footer`
  en el sitio; `.admin-shell > .admin-sidebar + .admin-main` con `.nav-link > .ico` en el panel. No usar `body::before/::after`.
- **Nada fijo abajo a la izquierda**: ahí va la barra del portafolio (`assets/portfolio-bar.js`).
- Usuarios demo: `{ demo: true, password: 'demo123' }` aparecen como botones en el login (solo modo demo).
- Si cambias la forma de una semilla, **sube `version`** en `createDB`/`defineApp` (si no, quedan datos viejos en localStorage).
- Estados con `stateMachine().move()`, nunca `db.update(... status)` + log a mano. Todo cambio deja `db.log`.
- HTML de usuario siempre por `html```/`escape`; `raw()` solo para HTML propio.
- Kernel opt‑in y aditivo: no cambiar firmas de `db.js`, `auth.js`, `router.js`, `ui.js`. Sin `modules`, `defineApp` se comporta igual que antes.
- Módulos: metadatos PUROS en `productos/<app>/modules.js` (los leen Node y el navegador); código en `js/modules/<id>.js`
  con `install(app)` y `app.contribute(...)`. Las colecciones declaran su acceso (`read/insert/update/delete/own`) → RLS.
- Datos de demo en `seed-demo.js` (el build de producción lo vacía); catálogos en `seed.js`.
- Scripts externos solo con versión exacta; supabase-js va empaquetado localmente (`tools/vendor-supabase.mjs`).

## Verificar antes de commitear

1. `python3 -m http.server 8890` y abrir lo tocado en 2–3 estilos y disposiciones, a 375 px y escritorio, sin errores de consola.
2. Si tocaste `assets/core`: `node tools/test-adapter.mjs`, `node tools/check-legacy.mjs` (32/32) y `node tools/check-produccion.mjs`.
3. Si tocaste estilos/disposiciones: `node tools/check-themes.mjs` y `node tools/check-layouts.mjs --layouts=<id>`.
4. Si tocaste módulos/colecciones: regenerar `clients/*/supabase/*.sql` y `node tools/test-schema.mjs --pg=…`.
5. Commits en español; agregar solo los archivos propios (`git add <rutas>`), nunca `dist/` ni `node_modules/`.
