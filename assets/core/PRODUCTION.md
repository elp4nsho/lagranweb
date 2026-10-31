# De plantilla a producción

Cómo convertir una plantilla del portafolio en el sistema real de un cliente: **solo los módulos que
compró**, con **su marca, estilo y disposición**, sobre un **backend real** (Supabase) y publicado como
sitio estático (Cloudflare Pages / Netlify / VPS propio). El primer producto hecho así es **Taller**
(`productos/taller/`). La demo histórica `taller/` sigue intacta.

Runbook operativo paso a paso (comandos exactos, DNS .cl, respaldos, día 2): [`docs/OPERACION.md`](../../docs/OPERACION.md).
Publicación en 5 minutos: [`clients/DEPLOY.md`](../../clients/DEPLOY.md).

## 1. El flujo completo

```
biblioteca/ ──► productos/taller/configurar.html ──► clients/<slug>/client.config.js
 (ver vistas)     (módulos, marca, estilo, backend)        (la ficha del cliente, versionada)
                                                                │
          node tools/build-client.mjs <slug> [--backend=supabase]
                                                                ▼
                        dist/<slug>/  (solo esa app, esos módulos, ese estilo; sin portafolio)
                                                                │
   backend supabase:  node tools/supabase-schema.mjs <slug>  → clients/<slug>/supabase/schema.sql
                      node tools/supabase-import.mjs <slug> --csv=…  → seed.sql
                                                                ▼
                  Cloudflare Pages / Netlify / Caddy  +  dominio .cl (NIC Chile)  +  HTTPS
```

1. **Elegir**: recorre la [biblioteca](../../biblioteca/) con el cliente y abre el
   [configurador](../../productos/taller/configurar.html) (paquetes Básico / Pro / Completo, o módulo a módulo;
   las dependencias se marcan solas). Copia el `client.config.js` que genera.
2. **Probar sin construir**: `productos/taller/index.html?cliente=<slug>` (lee `clients/<slug>/client.config.js`
   con datos demo y backend local) o `?modulos=base,agenda` para una combinación rápida; `?cliente=` vuelve a la demo completa.
3. **Construir**: `node tools/build-client.mjs <slug>` → `dist/<slug>/` + `dist/<slug>.build.json`.
   Falla si encuentra referencias fuera de la carpeta, restos del portafolio o cuentas demo en producción.
4. **Backend** (si el cliente opera con datos reales): crear el proyecto Supabase, aplicar `schema.sql` y
   `seed.sql`, configurar Auth (correo, SMTP, URL del sitio) y construir con `--backend=supabase`.
5. **Publicar** la carpeta y apuntar el dominio. Verificar con `node tools/check-produccion.mjs` (o a mano con
   la lista de [§8](#8-lista-de-verificación-antes-de-entregar)).

## 2. Módulos (feature toggles) en el kernel

Un módulo declara **qué aporta**; `defineApp()` solo instala los activos. Lo desactivado no existe:
no aparece en el menú, sus rutas dan "Sección no encontrada", sus páginas quedan bloqueadas (y en el build
ni se copian), sus KPIs y secciones del sitio no se pintan, su semilla no corre y su código no se publica.
**Sin `modules` todo funciona como antes** (las 30 apps antiguas, `reparto` y `polla` no cambian).

Metadatos (archivo PURO, sin DOM: lo leen el navegador y las herramientas de Node) — `productos/taller/modules.js`:

```js
{
  id: 'agenda', name: 'Agenda y citas', icon: '📅', tier: 'Pro', deps: ['clientes'],
  description: 'Reserva de horas desde el sitio…',
  roles: { asesor: 'Asesor de servicio' },          // se unen entre módulos activos
  pages: { 'admin.html': ['asesor'] },               // guardas por página (unión de roles)
  home: { asesor: 'admin.html#/citas' },             // adónde entra cada rol
  settings: { slots: '09:00, 10:00, …' },            // valores por defecto de app.settings()
  collections: {                                     // → tablas y RLS en Supabase (§5)
    appointments: { insert: 'public', read: OFFICE, update: OFFICE, delete: ['admin'],
                    index: ['date', 'status'], own: { cliente: { field: 'customerId', profile: 'customerId', ops: ['select', 'insert'] } } }
  },
  catalog: [],                                       // colecciones que sobreviven en producción con data: 'empty'
  seed: seedAgenda                                   // (ctx) → { appointments: [...] } ; ctx = { has, data, rng, mode }
}
```

Código de navegador de cada módulo — `productos/taller/js/modules/<id>.js` exporta `install(app)`:

```js
export function install(app) {
  const citas = resource(app, { collection: 'appointments', id: 'citas', … });
  app.contribute('admin.html', citas.section({ roles: OFFICE }), { slot: 'operacion' }); // menú del panel
  app.contribute('kpis', { order: 10, roles: OFFICE, kpi: ctx => ({ label: 'Citas hoy', value: … }) });
  app.contribute('dashboard', { order: 20, roles: OFFICE, render: ctx => card('Próximas citas', …) });
  app.contribute('settings', { title: 'Agenda', fields: [ … ] });                           // grupo en Configuración
  app.contribute('site:nav', { label: 'Agendar hora', href: '#/agendar' }, { slot: 'nav' });
  app.contribute('site:home', { order: 30, render: () => '<section>…</section>' });       // sección de la portada
  app.contribute('site:routes', { path: '/agendar', render: (view, ctx) => { … } });
  if (app.has('portal')) app.contribute('portal.html', misCitas.section({ roles: ['cliente'] }), { slot: 'portal' });
  if (app.has('ordenes')) { /* integración opcional: botón "Crear OT" */ }
}
```

Composición — `productos/taller/js/app.js`:

```js
const modules = product.modules.map(m => ({ ...m, install: installers[m.id] }));
export const app = defineApp({ name: 'producto-taller', version: 1, modules, client, adapter: await adapterFor(client.backend) });
// app.has('agenda') · app.modules · app.blocked('portal.html') · app.kpis(ctx) · app.ordered('site:home')
```

El panel declara **huecos** y los módulos los llenan (las secciones vacías desaparecen solas):

```js
app.panel({ page: 'admin.html', nav: [{ section: 'Operación' }, { slot: 'operacion' }, { section: 'Sistema' }, { slot: 'sistema' }] });
app.site({ nav: [['Inicio', '#/'], { slot: 'nav' }, ['Contacto', '#/contacto']], routes: { '/': view => … app.ordered('site:home') … } });
```

API nueva de `defineApp` (todo opcional): `modules`, `enabled` (o `client.modules`), `client`, `mode`
(`'demo'` | `'production'`), `adapter`. En `app`: `has(id)`, `modules`, `allModules`, `blocked(page)`,
`canReset`, `production`, `contribute(clave, ítems, { slot })`, `contributions(clave)`, `ordered(clave)`,
`kpis(ctx)`, `whenReady(el, fn)`. `canOpen()` y `homeFor()` ya consideran las páginas bloqueadas.
Funciones puras en `assets/core/modules.js`: `resolveModules(modules, enabled)` (base siempre + dependencias),
`mergeModules(activos)`, `blockedPages(todos, activos)`.

**Base siempre activo**: portada pública, login, usuarios y roles, panel (shell + resumen), configuración y bitácora.

### Módulos del producto Taller

| Módulo | Paquete | Aporta | Roles |
|---|---|---|---|
| `base` | Básico | Portada, servicios (CMS), contacto → Mensajes, privacidad, login, resumen, usuarios, configuración, bitácora | admin |
| `clientes` | (dependencia) | Clientes con RUT, vehículos con patente; detalle maestro‑detalle | asesor |
| `agenda` | Pro | Reserva pública sin cuenta, agenda con estados, "Crear OT" si hay órdenes, citas en el portal | asesor |
| `ordenes` | Pro | OT con 8 etapas + cancelada, kanban, mecánicos (ven solo lo suyo), foto de ingreso, seguimiento público código + patente | jefe, mecanico |
| `presupuestos` | Pro+ | Líneas mano de obra/repuesto (tipo de campo `lines`), neto + IVA, aprobación en panel o portal; mueve la OT | — |
| `inventario` | Pro+ | Repuestos, stock mínimo, ingresos/salidas con bitácora, proveedores | bodega |
| `portal` | Pro | `portal.html` para clientes: vehículos, OT, presupuestos, citas, documentos; registro abierto | cliente |
| `facturacion` | Pro+ | Boletas/facturas internas, IVA, por cobrar, ventas por mes (sin DTE del SII) | — |

`clients/demo-basico` = solo `base`. `clients/demo-pro` = `agenda`, `ordenes`, `portal` (+ `clientes` por dependencia).

## 3. Ficha del cliente (`clients/<slug>/client.config.js`)

| Clave | Valores | Efecto |
|---|---|---|
| `slug` | `a-z0-9-` | Carpeta, nombre de la base local (`<app>--<slug>`), `data-app` |
| `app` | `'taller'` | Producto en `productos/<app>/` |
| `mode` | `'production'` (def.) \| `'demo'` | Producción: sin cuentas demo, sin "Restablecer datos demo", sin avisos de demo |
| `data` | `'empty'` (def.) \| `'demo'` | Empty: solo catálogos (`catalog` de cada módulo) + `accounts`; el build además vacía `seed-demo.js` |
| `brand` | `{ name, short, logo, logoFile?, tagline, colors: { primary, accent } }` | Nombre, favicon, colores (pisan los tokens del estilo con contraste calculado) |
| `theme`, `layout` | id del registro (`theme-boot.js`) | Fijos en el build (`data-lock`, registro recortado a uno) |
| `fonts` | `'google'` (def.) \| `'system'` | System = sin pedidos a Google Fonts |
| `modules` | `['agenda', …]` | Módulos activos (base implícito; dependencias automáticas) |
| `backend` | `{ kind: 'local' }` \| `{ kind: 'supabase', url, anonKey, bucket }` \| nombre de `backends` | Motor de datos; `--backend=supabase` elige otra entrada de `backends` |
| `domain` | `'www.cliente.cl'` | canonical, og:url, sitemap, robots |
| `contact`, `legal` | correo, teléfono, WhatsApp, dirección, horario · razón social, RUT, correo de privacidad | Textos del sitio, JSON‑LD, política de privacidad |
| `seo` | `{ title, description, titles: { 'login.html': … }, ogImage }` | `<title>`, meta, Open Graph (si no hay imagen se genera `og.png`) |
| `accounts` | `[{ name, email, role, password? }]` | Cuentas iniciales (con Supabase: sin contraseña, se ligan por correo) |
| `settings` | `{ heroTitle, … }` | Textos iniciales (luego se editan en Configuración) |

`defineClient(cfg)` (en `assets/core/client.js`) valida y avisa: marcadores sin reemplazar, contraseñas de
ejemplo, producción con backend local, falta de cuentas.

## 4. Datos: interfaz de almacenamiento y adaptadores

`createDB(nombre, { version, seed, adapter })` mantiene la API síncrona de siempre (`all/get/find/query/
insert/update/remove/getValue/setValue/log/subscribe`) sobre una foto en memoria, y delega la persistencia:

```js
adapter = {
  kind: 'local' | 'supabase',
  open({ name, version, fresh }) → { data, ready? }   // foto síncrona y/o hidratación remota
  write(change, data) → void | Promise                // tras cada mutación (rechazo → evento 'error' + recover)
  watch(apply)                                        // cambios externos: { type: 'sync', data } o por fila
  recover?(change), refresh?()                        // volver a leer (tras un rechazo, tras iniciar sesión)
  lookup?(col, match, fields)                         // búsqueda pública acotada
  files?: { upload(file, { folder }), url(path), remove(path) }
  auth?: { session(), signIn, magicLink, signUp, signOut, capabilities }
  canReset?: false
}
```

Novedades de `db`: `db.ready` (Promise), `db.isReady`, `db.adapter`, `db.refresh()`, `db.lookup()`, `db.files`.
`createAuth` usa `adapter.auth` si existe (`auth.remote`, `auth.capabilities`, `auth.magicLink()`).
`defineApp` espera la hidratación (`app.whenReady`: "Conectando…", y error con "Reintentar").
Nuevo tipo de campo `file` en `resource()` (sube con `db.files` al guardar).

- **`local`** (`store/local.js`): el motor histórico (JSON en `localStorage`, sincroniza pestañas, LRU si se
  llena la cuota). Sirve para demos y para un sitio vitrina; **no** para operar: los datos quedan en un solo navegador
  y las contraseñas de `accounts` van en el JavaScript publicado.
- **`supabase`** (`store/supabase.js` + `vendor/supabase.js`, supabase-js empaquetado localmente con
  `tools/vendor-supabase.mjs`; solo se publica en clientes con backend supabase):

| Kernel | Supabase |
|---|---|
| colección `ots` | tabla `ots (id text pk, data jsonb, created_at, updated_at)` + columnas generadas de `index` |
| `users` | `profiles (id, auth_id → auth.users, email, role, active, name, data)` |
| `db.log` / `getValue` | `activity_log` / `kv (key, value jsonb)` |
| login | `signInWithPassword`, `signInWithOtp` (enlace mágico), `signUp` (registro del portal) |
| `db.subscribe` | Realtime `postgres_changes` de todas las tablas (respeta RLS) |
| campo `file` | Storage, bucket `archivos` público con rutas aleatorias |
| seguimiento público | RPC `lgw_lookup(p_collection, p_match)` |

Consistencia: lecturas síncronas sobre la foto hidratada; escrituras optimistas en una cola ordenada; si el
servidor rechaza (RLS, red, unicidad) se avisa con un toast y se rehidrata. UPDATE/DELETE que RLS filtra (0 filas)
se tratan como rechazo. Ecos atrasados de Realtime no pisan una edición local más nueva. **Último en escribir
gana** (sin merge por campo). "Restablecer datos demo" no existe con Supabase.

## 5. Esquema SQL y RLS generados

`node tools/supabase-schema.mjs <slug>` lee las `collections` de los módulos **activos** y escribe
`clients/<slug>/supabase/schema.sql` (idempotente):

- tablas + columnas generadas/índices (`index`) + índices únicos (`unique`, p. ej. código de OT, patente);
- funciones `lgw_role()`, `lgw_has_role(text[])`, `lgw_profile_field(f)` (security definer);
- RLS en todas las tablas, una política por operación: `read/insert/update/delete/write` = `'public'` o lista de roles,
  y `own: { rol: { field, profile, ops } }` (el mecánico solo sus OT; el cliente solo lo suyo);
- `profiles`: el equipo ve a todos, cada uno su perfil, el admin administra; trigger `lgw_protect_profile` impide
  subirse de rol, reactivarse, cambiar correo o campos ligados (`customerId`);
- trigger `lgw_handle_new_user` en `auth.users`: liga por correo los perfiles creados por el admin; con el portal
  activo, registra clientes con su ficha (reutiliza una existente con el mismo correo);
- `kv` lectura pública (no guardes secretos ahí), `settings` solo admin; `activity_log` solo admin la lee;
- `lgw_lookup` exige **todos** los campos de `match` (código + patente) y devuelve solo `fields`;
- Realtime (`supabase_realtime`) y bucket `archivos` con políticas (sube el equipo, borra el admin).

`node tools/supabase-import.mjs <slug> --csv=carpeta` escribe `seed.sql`: cuentas → `profiles`, catálogos de los
módulos, `kv.settings` desde la ficha, y cada `<coleccion>.csv` (más `users.csv` → perfiles). Idempotente.

## 6. Pruebas y su alcance

| Prueba | Qué cubre | Resultado actual |
|---|---|---|
| `node tools/test-adapter.mjs` | Adaptador local (CRUD, persistencia, versión, storage event, LRU, lookup, archivos, auth) y adaptador supabase contra `tools/lib/fake-supabase.mjs`: hidratación y paginación, login/errores en español, RLS distinta tras login, forma de filas, cola de escrituras, realtime (insert/update/delete/kv), eco atrasado, rechazo de UPDATE (0 filas) e INSERT (42501) con recuperación, enlace mágico, registro, logout inmediato, Storage, RPC, tabla faltante, reset bloqueado | 23/23 |
| `node tools/test-schema.mjs --pg=…` | `schema.sql` + `seed.sql` en **PostgreSQL 16 real** con stub de auth/storage: idempotencia, triggers de alta y protección, RLS de anon / admin / jefe / mecánico / cliente / desactivado, lookup, realtime, storage | 55/55 |
| `node tools/check-produccion.mjs` | Playwright: combinaciones de módulos (menús, rutas, guardas, portada, roles), builds servidos solos con `_headers`/CSP, y el build supabase contra el doble inyectado (hidratación, insert anónimo, login, RLS, escritura, realtime, logout) | ver reporte del commit |
| `node tools/check-legacy.mjs` | Las 32 webs: portada, login y entrada con cuenta demo, sin errores | 32/32 |

## 7. Qué NO está probado (verificar contra un proyecto Supabase real)

No hubo acceso a un proyecto Supabase desde el entorno de desarrollo. El doble emula la superficie de supabase-js
que usa el adaptador, y el SQL se probó en Postgres real, pero **falta verificar en un proyecto de verdad**:

1. **Transporte real**: que `vendor/supabase.js` (supabase-js 2.117.3) hable con PostgREST/GoTrue/Realtime de tu
   proyecto: `select … order … range`, `insert`, `update … select('id')`, `upsert(onConflict: 'key')`, `rpc`.
2. **Auth**: correo de confirmación, enlace mágico con `emailRedirectTo` (agregar la URL del sitio en Auth →
   URL Configuration → Redirect URLs), expiración/refresco de tokens, `detectSessionInUrl` al volver a `login.html`.
3. **Realtime**: que la publicación entregue cambios con RLS para usuarios autenticados y que el canal se re‑autentique tras el login.
4. **Storage**: subida con la política generada, URL pública, límite de tamaño del bucket.
5. **Triggers sobre `auth.users`** en Supabase (el esquema `auth` real tiene más columnas; el trigger usa
   `id`, `email`, `raw_user_meta_data`).
6. **Rendimiento**: la hidratación lee tablas completas (paginadas de a 1000). Bien para un taller (miles de filas);
   para decenas de miles hace falta paginar por vista.
7. **Concurrencia de correlativos**: `nextCode()` usa `kv`; dos usuarios creando OT al mismo tiempo pueden chocar
   (el índice único sobre `code` lo convierte en error visible, no en duplicado). Pendiente: RPC atómica.
8. **Cliente editando presupuestos**: RLS deja al cliente actualizar *sus* presupuestos (para aprobar); con jsonb no
   se restringe por columna. La UI solo cambia el estado; un trigger que limite el cambio a `status/history` es una mejora pendiente.
9. Correo transaccional, pagos y DTE: no implementados (ver §9).

Prueba de humo en un proyecto real (15 min): aplicar `schema.sql` y `seed.sql`; invitar al admin desde Auth;
construir con `--backend=supabase`; servir con `node tools/serve-dist.mjs`; entrar con enlace mágico; crear
cliente/OT; ver la OT en otra pestaña en vivo; abrir el sitio en incógnito y enviar un mensaje; buscar la OT por
código + patente; entrar como cliente y confirmar que solo ve lo suyo.

## 8. Lista de verificación antes de entregar

- [ ] `client.config.js` sin marcadores (`TU-PROYECTO`, `REEMPLAZAR`, `CAMBIAR-…`); `build-client` sin ✗ ni ⚠ importantes.
- [ ] **Dominio .cl** registrado en [NIC Chile](https://www.nic.cl) a nombre del cliente (RUT de la empresa), con
      renovación automática y correo de contacto que el cliente controle.
- [ ] **DNS**: `www` como CNAME al hosting; apex con ALIAS/A o delegando a Cloudflare; **SSL** activo (automático en
      Pages/Netlify/Caddy) y redirección a HTTPS; HSTS viene en `_headers`.
- [ ] **Correo**: SMTP propio en Supabase Auth (Resend, Brevo, SES…) con SPF, DKIM y DMARC del dominio; plantillas en español.
- [ ] **Supabase**: "Confirm email" activo; Site URL y Redirect URLs con el dominio; región São Paulo; plan con
      respaldos diarios (el gratuito se pausa por inactividad y no tiene PITR).
- [ ] **Respaldos**: `pg_dump` diario fuera de Supabase + copia del bucket (ver `docs/OPERACION.md`); probar una restauración.
- [ ] **Privacidad**: `privacidad.html` revisada por abogado. La **Ley 21.719** de protección de datos (modifica la
      Ley 19.628) rige plenamente desde el **1 de diciembre de 2026**: base de licitud, deber de información,
      derechos ARCO + portabilidad, registro de encargados (Supabase, hosting, correo), medidas de seguridad,
      notificación de brechas a la Agencia de Protección de Datos Personales.
- [ ] **Accesos**: el admin entró y cambió su clave; no quedan cuentas de prueba; el cliente tiene acceso de dueño
      a Supabase, al hosting y al dominio (tú como colaborador).
- [ ] **Monitoreo**: chequeo de disponibilidad (UptimeRobot, Better Stack) a la portada y a `/rest/v1/` del proyecto.
- [ ] Prueba de humo de §7 hecha con el dominio final.

## 9. Integraciones futuras

- **Pagos**: Webpay Plus (Transbank), Mercado Pago (Checkout Pro) y Flow requieren un servidor que firme y confirme
  la transacción con claves secretas → Supabase Edge Function (`create` / `commit` / webhook) que escriba el pago en
  la tabla del módulo. Nunca claves secretas en el sitio estático.
- **Boleta/factura electrónica (DTE)**: integrar un proveedor certificado ante el SII desde una Edge Function al
  emitir el documento del módulo `facturacion`.
- **Avisos por correo/WhatsApp** (cita confirmada, OT lista): Edge Function disparada por trigger o Database Webhook.
- **Adaptador PocketBase** (autohospedado, ver `docs/OPERACION.md` §6): misma interfaz que `store/supabase.js`.
