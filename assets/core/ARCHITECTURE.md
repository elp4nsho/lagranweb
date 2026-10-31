# Arquitectura de reutilización: el kernel de apps

Este documento explica **por qué** existe el kernel (`app.js`, `resource.js`, `blocks.js`,
`pages.js`, `domain.js`, `kernel.css`), qué patrones usa, cómo migrar las apps existentes de a
poco y cómo crear una app nueva en pocos pasos. La referencia rápida de la API está en
[`README.md`](README.md#kernel-de-apps-opt-in).

## 1. Diagnóstico (octubre 2026)

Medido sobre las 30 apps (≈ 81.900 líneas de JS propio de las apps, sin contar el núcleo):

| Patrón repetido | Dónde | Volumen |
|---|---|---|
| **Shell del panel** (menú por rol, guardas de ruta, "Acceso restringido", salir, restablecer demo, contadores, refresco en vivo) | 29 apps pintan `.admin-shell` a mano; 12 copias distintas de `mountShell`, 8 de `mountAdmin` | `js/admin/main.js` suma 2.397 líneas en 30 apps |
| **Mini‑frameworks de listado** (búsqueda + filtros + CSV + acciones por fila) | 12 `smartTable`, 3 `listView`, 6 `formDialog`, 12 `pageHead` | 36 archivos "kit/shell/admin-kit/table/common" = 4.358 líneas |
| **Páginas estándar** | Usuarios y roles: 29 archivos (1.878 líneas) · Bitácora: 25 (1.010) · Configuración: 17 (713) · Dashboards: 32 (2.014) | ≈ 5.600 líneas |
| **Login** | 30 `login.html` (871 líneas) + 17 `login.js` (754): mismo formulario, mismo `?next=`, mismo mapa rol → página | ≈ 1.600 líneas |
| **Restablecer datos demo** | 42 archivos en las 30 apps, con variantes (algunas no cerraban sesión si el usuario desaparecía) | — |
| **Estados con historial** | 23 apps con su propio mapa `STATUS/STATES`, 6 `setStatus` distintos, 22 sitios que arman `history/timeline/log` a mano, 281 `db.update(… status …)` | Bug "X → X": `db.get()` devuelve el objeto vivo y `db.update()` lo muta; si se registra *después* el origen ya cambió (quedaba en `eventos`, corregido) |
| **Utilidades de dominio** | 7 `rutDV` + 7 `validRut`, 4 `exportCSV`, 5 `lastMonths`, varios `badge`/`kv`/`statCard` | — |

Conclusión: el ~20 % del código de cada app es infraestructura de panel que se reescribe con
pequeñas diferencias, y cada copia arrastra sus propios bugs (foco de modales, refrescos que
borran lo que se está escribiendo, bitácoras incoherentes).

## 2. Patrones usados

| Patrón | Pieza | Qué resuelve |
|---|---|---|
| **Composition root** | `defineApp()` en `app.js` | Un único punto donde se ensamblan base de datos, autenticación, roles, páginas y configuración. Cada HTML importa `app` y llama `app.panel()`, `app.site()` o `app.login()`. |
| **Configuración declarativa** | `nav: [...]` del panel, `pages`/`home` de la app | El menú, las rutas y los permisos salen de *una* lista. Las guardas (rol por página y por sección), el "Acceso restringido", el título y los contadores se derivan de ahí. |
| **Scaffold guiado por esquema** | `resource()` en `resource.js` | Una lista de campos produce columnas, búsqueda, filtros, formulario con validación, detalle, CSV, eliminación con confirmación y bitácora. |
| **Hooks / template method** | `validate`, `beforeSave`, `afterSave`, `canDelete`, `columns`, `rowActions`, `detail.render`… | Se sobrescribe solo la parte que cambia; el resto viene hecho. |
| **Registry / plugin** | `fieldTypes` + `fieldType()`; `app.use(plugin)` + `app.contribute(page, items)` | Tipos de campo nuevos (p. ej. `patente`) sin tocar el kernel; plugins que agregan secciones al menú de una página. |
| **State machine** | `stateMachine()` en `domain.js` | Etiquetas, tonos, transiciones, guardas, efectos `onEnter`, historial y bitácora en un solo lugar; lee el estado de origen *antes* de mutar. |
| **Componentes de presentación puros** | `blocks.js` | Funciones `datos → HTML` (KPIs, tarjetas, línea de tiempo, vacío, kv) que respetan los 30 estilos porque solo usan clases del kit y tokens. |
| **Observer** | `db.subscribe` dentro de `app.panel()` | Refresco en vivo con cola: no repinta bajo un modal ni mientras se escribe; si la vista devolvió `{ refresh }` se actualiza sin perder filtros. |
| **Strangler fig** | Todo es opt‑in | Las apps antiguas no cambian; se migran sección por sección (ver §4). |

### Capas

```
 HTML de cada página ── js/<página>.js ── app.panel / app.site / app.login
                                   │
                         js/app.js │ defineApp({ name, seed, roles, pages, home })
                                   │ resource(app, { fields, hooks })   stateMachine({ states })
 ─────────────────────────────── kernel (assets/core) ───────────────────────────────
  app.js  ──>  pages.js  ──>  resource.js  ──>  blocks.js  ──>  ui.js / auth.js / db.js / router.js
                      domain.js (estados, RUT, correlativos, agregados)      kernel.css (clases k-*)
```

Las dependencias van en un solo sentido (de arriba hacia el núcleo), sin ciclos. `db.js`,
`auth.js`, `router.js` y `ui.js` siguen siendo la base y no cambiaron de firma.

## 3. Crear una app nueva (5 pasos)

1. `node tools/new-app.mjs mi-app --name="Mi Marca" --title="Sistema de X" --theme=aurora --icon=🚚`
   (agrega `--register --cat=Logística --desc="…"` para sumarla a `projects.js`).
2. En `mi-app/js/app.js` define la semilla, los roles, `pages` (quién abre cada HTML) y `home`
   (adónde va cada rol al entrar). Sube `version` cada vez que cambies la semilla.
3. Declara tus estados con `stateMachine()` y tus recursos con `resource()`; usa `rows(ctx)` para
   acotar por rol (p. ej. el repartidor solo ve sus entregas) y `permissions` para crear/editar/eliminar.
4. En `js/admin.js` arma el menú: dashboard con `blocks.js`, `recurso.section()`, y las secciones
   estándar `usersSection`, `settingsSection`, `logSection`. Para otra app de rol
   (`repartidor.html`) crea otro HTML + `app.panel({ page: 'repartidor.html', nav })`.
5. Sitio público en `js/site.js` con `app.site({ nav, routes })` y estilos propios en
   `css/app.css` (solo tokens). Verifica a 375 px y escritorio en varios estilos y disposiciones.

Ejemplo completo y funcionando: [`examples/bicicleteria/`](examples/bicicleteria/) — sitio con
seguimiento por código, login, panel con dashboard, 3 recursos (clientes, órdenes con estados,
repuestos), usuarios, configuración y bitácora en ≈ 180 líneas de JS.

## 4. Migrar una app existente (sin big bang)

La migración es **por sección** y cada paso deja la app funcionando:

1. **Datos**: reemplaza `createDB` + `createAuth` de `js/data/db.js` por `defineApp()` y
   reexporta `db`/`auth` (`export const { db, auth } = app;`). Nada más cambia.
2. **Estados**: mueve el mapa `STATUS` + `setStatus` a un `stateMachine()`; deja `setStatus`
   como envoltorio (`ORDER.move(db, 'orders', id, to, { by, note })`) para no tocar los llamadores.
3. **Una sección CRUD**: en el router del panel antiguo, monta `recurso.renderList(view, ctx)` en
   la ruta de esa sección (la función acepta cualquier contenedor). Repite sección por sección.
4. **Páginas estándar**: reemplaza Usuarios, Bitácora y Configuración por `usersSection`,
   `logSection` y `settingsSection` (sus `render` también funcionan dentro de un router propio).
5. **Shell**: cuando la mayoría de las secciones ya son ítems `{ id, label, icon, roles, render }`,
   cambia el `main.js` del panel por `app.panel({ nav })` y elimina el `shell.js`/`admin-kit.js` local.
6. **Login**: `login.js` → `app.login()` y `login.html` → `<div id="app">` (si quieres conservar el
   diseño propio, deja el HTML y usa solo `app.homeFor(u)` / `app.canOpen(page, rol)` para redirigir).

Recomendación: migrar primero las apps con `admin-kit.js` basado en `sections` (hotel, menu,
taller, atelier, lubricentro, usados, producto, ong): su forma ya es casi la de `nav`.

## 5. Reglas del kernel

- Opt‑in y aditivo: nunca cambiar firmas de `db.js`, `auth.js`, `router.js`, `ui.js`.
- Solo clases del kit y tokens; las clases nuevas llevan prefijo `k-` y viven en `kernel.css`,
  que se carga **antes** de `themes.css` (a igual especificidad ganan el estilo, la disposición y la app).
- Todo lo que se escribe al usuario pasa por `html```/`escape`; `raw()` solo para HTML propio.
- Cada operación que cambia datos deja una línea en la bitácora (`db.log`).
- Los estados se cambian con `machine.move()` (nunca `db.update(... { status })` + log a mano).
- Las delegaciones de eventos que `resource()` pone sobre el contenedor de la vista se dan de baja al
  volver a pintar el mismo recurso en ese contenedor (el panel reutiliza `#view` entre rutas), para no
  duplicar acciones (dos modales al editar).
