# Operación: de plantilla a producción (runbook)

Manual para hacerlo uno mismo, sin asistente. Asume Node 22, git, `psql` 16 y una cuenta en Supabase,
Cloudflare (o Netlify) y GitHub. Contexto técnico y API: [`assets/core/PRODUCTION.md`](../assets/core/PRODUCTION.md).

Convenciones: `<slug>` = carpeta del cliente (p. ej. `taller-don-lucho`). Todo se corre desde la raíz del repo.

---

## 0. Preparación (una vez por máquina)

```bash
git clone git@github.com:<tu-usuario>/lagranweb.git && cd lagranweb
npm i --prefix tools                 # esbuild + supabase-js (solo para empaquetar)
node tools/test-adapter.mjs          # 23/23: motor de datos OK en tu máquina
```

## 1. Simulacro completo «plantilla → producción» (práctica, ~1 h)

Hazlo una vez con `demo-pro` antes del primer cliente real. Cada paso dice cómo verificarlo.

### 1.1 Crear el cliente desde la configuración

1. Abre `productos/taller/configurar.html` (con `python3 -m http.server 8890` → http://localhost:8890/productos/taller/configurar.html).
2. Elige paquete/módulos, marca, estilo, disposición, backend `supabase`, datos de contacto y correo del admin.
3. Guarda el resultado:
   ```bash
   mkdir -p clients/<slug>
   # pega el texto en clients/<slug>/client.config.js (o usa "Descargar" y muévelo)
   cp docs/FICHA-cliente.md clients/<slug>/FICHA.md      # y complétala
   ```
4. Vista previa sin construir: `http://localhost:8890/productos/taller/index.html?cliente=<slug>` (datos demo, backend local).
   Para volver a la demo completa: `?cliente=`.

### 1.2 Construir (primero local, para revisar)

```bash
node tools/build-client.mjs <slug>                     # → dist/<slug>/ ; revisa las ⚠
node tools/serve-dist.mjs dist/<slug> --port=8890      # http://localhost:8890 (aplica _headers y 404)
```

Verifica: sin barra 🎨, sin "Cuentas demo", estilo fijo, `/no-existe` muestra la 404, `/robots.txt` bloquea
`admin.html`. Automático: `node tools/check-produccion.mjs --only=B` (adapta el slug en el script si usas otro).

### 1.3 Crear el proyecto Supabase

1. supabase.com → *New project* · nombre `<slug>` · región **South America (São Paulo)** · contraseña de BD larga
   (guárdala en tu gestor de claves; va en la ficha como referencia, no el valor).
2. *Project Settings → API*: copia **Project URL** y **anon public key** a `backends.supabase` del `client.config.js`.
   La `service_role` key **no** se usa en el sitio; solo en scripts tuyos si la necesitas.
3. *Authentication → Providers → Email*: activo, **Confirm email** activo.
4. *Authentication → URL Configuration*: Site URL `https://www.cliente.cl`; Redirect URLs: `https://www.cliente.cl/login.html*`
   y, para probar, `http://localhost:8890/login.html*`.
5. *Authentication → Emails → SMTP Settings*: SMTP propio (Resend / Brevo / Amazon SES). El SMTP incluido sirve solo
   para pruebas (pocos correos por hora). Traduce las plantillas (confirmación, enlace mágico, invitación).

### 1.4 Aplicar esquema + RLS e importar datos

```bash
node tools/supabase-schema.mjs <slug>                                  # clients/<slug>/supabase/schema.sql
node tools/supabase-import.mjs <slug> --csv=clients/<slug>/supabase/csv  # seed.sql (cuentas, catálogos, textos, CSV)
export DATABASE_URL='postgresql://postgres.<ref>:<CLAVE>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'  # Settings → Database → Session pooler
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f clients/<slug>/supabase/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f clients/<slug>/supabase/seed.sql
```

(o pega cada archivo en *SQL Editor → Run*). Ambos son idempotentes: se pueden repetir.

CSV: un archivo por colección con los nombres de campo del kernel en la primera fila
(ejemplos en `clients/demo-pro/supabase/csv/`: `customers.csv`, `vehicles.csv`, `users.csv`). Exporta desde la
planilla del cliente como CSV UTF‑8. `users.csv` crea perfiles (correo + rol) que se ligan al entrar.

Verifica en *Table Editor*: `profiles` con el admin, `services` con el catálogo, `kv` con `settings`.
Opcional, antes de tocar el proyecto real, prueba el SQL en un Postgres desechable:
`docker run --rm -d -p 5433:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16` y
`node tools/test-schema.mjs --pg=postgresql://postgres@localhost:5433/postgres --slug=<slug>` (las aserciones están
escritas para el paquete Pro; con otros módulos algunas no aplican).

### 1.5 Primer acceso del admin

*Authentication → Users → Invite user* con el correo de `accounts` (o, desde el sitio, "Recibir un enlace de acceso").
El trigger `lgw_handle_new_user` liga la cuenta con su perfil por correo. Para que tenga contraseña: *Users → ⋯ →
Send password recovery* o que la defina tras entrar con el enlace.

### 1.6 Construir con Supabase y publicar

```bash
node tools/build-client.mjs <slug> --backend=supabase        # → dist/<slug>-supabase/
node tools/serve-dist.mjs dist/<slug>-supabase --port=8890   # prueba con el proyecto real
```

**Cloudflare Pages con GitHub Actions** (recomendado):

1. Repo privado por cliente (o este repo con una rama por cliente). Copia `deploy/github-actions/deploy-cloudflare.yml`
   a `.github/workflows/deploy.yml`.
2. Cloudflare → *My Profile → API Tokens → Create* (plantilla "Edit Cloudflare Workers" o permiso *Pages: Edit*).
   En GitHub: *Settings → Secrets → Actions*: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; *Variables*: `CLIENT_SLUG=<slug>`,
   `BACKEND=supabase`.
3. Crea el proyecto una vez: `npx wrangler pages project create <slug> --production-branch=main`. Push a `main` → publica.

**Netlify**: `npx netlify-cli deploy --dir=dist/<slug>-supabase --prod` (o conecta el repo con build command
`npm i --prefix tools && node tools/build-client.mjs <slug> --backend=supabase` y publish dir `dist/<slug>-supabase`).

### 1.7 Dominio .cl (NIC Chile) + DNS + SSL

1. Registra en [nic.cl](https://www.nic.cl) **a nombre del cliente** (RUT de la empresa), contacto técnico tú.
   Activa la renovación y anota el vencimiento en la ficha.
2. DNS, opción A (recomendada con Pages): crea la zona en Cloudflare (*Add site*), y en NIC Chile → *Servidores de
   nombre* pon los dos nameservers que te da Cloudflare. Luego Pages → *Custom domains* → `cliente.cl` y `www.cliente.cl`.
3. DNS, opción B (DNS de NIC u otro): `www` CNAME → `<slug>.pages.dev` (o `<sitio>.netlify.app`); apex: ALIAS/ANAME si el
   DNS lo permite, o redirige el apex a `www` desde el proveedor.
4. SSL: automático (Pages/Netlify/Caddy). Verifica `https://` sin advertencias y que `http://` redirige.
   `curl -sI https://www.cliente.cl | grep -i -E 'strict-transport|content-security'`.
5. Correo del dominio (SMTP de Auth y casilla del cliente): registros **SPF** (TXT `v=spf1 include:… ~all`),
   **DKIM** (los que entregue el proveedor) y **DMARC** (TXT `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:…`).
6. Agrega `https://www.cliente.cl/login.html*` en Redirect URLs de Supabase.

### 1.8 Prueba de humo (15 min, con el dominio final)

- [ ] Portada en incógnito, en celular y escritorio; `privacidad.html`; `robots.txt`; `sitemap.xml`.
- [ ] Formulario de contacto → aparece en *Mensajes* del panel (y en `leads` en Supabase).
- [ ] Login del admin con enlace mágico y con contraseña; "Salir" deja la sesión cerrada.
- [ ] Crear cliente, vehículo y OT; abrir la OT en otra pestaña/dispositivo: los cambios aparecen en vivo.
- [ ] Seguimiento público por código + patente (con otra patente no muestra nada).
- [ ] Si hay portal: crear cuenta de cliente, confirmar correo, ver solo lo propio.
- [ ] Un mecánico ve solo sus OT; un asesor no ve Usuarios.
- [ ] DevTools → Consola sin errores (CSP incluida).

---

## 2. Día 2: operación

| Tarea | Cómo |
|---|---|
| **Agregar un usuario del equipo** | Panel → *Usuarios y roles* → Nuevo (correo + rol). Luego Supabase → *Auth → Invite user* con ese correo (o que pida un enlace en el login). En modo local: se crea con contraseña en el panel. |
| **Desactivar a alguien** | Panel → *Usuarios y roles* → interruptor *Activa*. RLS lo deja sin acceso al instante (y bórralo de Auth si se fue). |
| **Cambiar textos del sitio** | Panel → *Configuración* (se guarda en `kv.settings`, sin publicar de nuevo). |
| **Cambiar marca, colores, estilo o disposición** | Editar `client.config.js` → `build-client` → publicar (push). |
| **Activar un módulo** | Agregarlo en `modules` → `node tools/supabase-schema.mjs <slug>` y aplicar `schema.sql` (idempotente: crea solo lo nuevo) → si el módulo trae catálogo (p. ej. inventario), `supabase-import.mjs <slug>` y aplicar `seed.sql` → `build-client` → publicar. |
| **Desactivar un módulo** | Quitarlo de `modules` y publicar. Las tablas quedan (con sus datos y RLS); bórralas a mano solo si el cliente lo pide (respalda antes). |
| **Importar más datos** | CSV nuevos → `supabase-import.mjs <slug> --csv=… --no-catalog` → `psql -f seed.sql`. |
| **Actualizar el kernel** | `git pull` en el repo base, `node tools/test-adapter.mjs`, `check-produccion.mjs`, rebuild y publicar cada cliente. |

### Respaldos y restauración

- **Base**: el plan gratuito de Supabase no tiene respaldos descargables ni PITR (y pausa proyectos inactivos);
  el plan Pro guarda 7 días. Haz además tu propio `pg_dump` diario:
  - GitHub Actions: `deploy/github-actions/backup-supabase.yml` (secreto `SUPABASE_DB_URL`), o
  - cron en tu VPS: `deploy/selfhosted/backup.sh` (rotación y copia opcional con rclone a B2/S3).
- **Archivos (Storage)**: bucket `archivos`. Copia con la API S3 de Supabase (*Storage → Settings → S3 Connection*) y
  `rclone sync supabase:archivos /srv/lgw/archivos`.
- **Restaurar** (pruébalo una vez al mes en un proyecto de pruebas):
  ```bash
  psql "$DB_PRUEBA" -f clients/<slug>/supabase/schema.sql
  pg_restore --no-owner --data-only --disable-triggers -n public -d "$DB_PRUEBA" respaldo-AAAA-MM-DD.dump
  ```
- **Exportación rápida** para el cliente: Panel → *Configuración* → "Exportar datos" (JSON de lo que ve su cuenta).

### Monitoreo y renovaciones

- Disponibilidad: UptimeRobot / Better Stack cada 5 min a `https://www.cliente.cl/` y a
  `https://<ref>.supabase.co/rest/v1/` (responde 401 sin clave = vivo). Aviso a tu correo y al del cliente.
- Supabase: *Reports* (uso de BD, auth, egress) y alertas de facturación. Revisa *Advisors → Security* tras cada cambio de esquema.
- Calendario (en la ficha): vencimiento del dominio .cl (anual), plan Supabase, hosting, SMTP, certificados (automáticos).
- Seguridad: rota la contraseña de la BD si alguien deja el equipo; revisa `activity_log` (Bitácora) ante incidentes.
  Ley 21.719: una brecha de datos se notifica a la Agencia de Protección de Datos Personales y, si hay riesgo, a los titulares.

---

## 3. Ficha por cliente

Cada cliente tiene `clients/<slug>/FICHA.md` (plantilla: [`docs/FICHA-cliente.md`](FICHA-cliente.md); ejemplo:
`clients/demo-pro/FICHA.md`): contactos, servicios contratados, cuentas/proveedores (sin claves), DNS, vencimientos,
respaldos y bitácora de cambios. Las claves van en tu gestor de contraseñas, nunca en el repo.

## 4. Archivos que produce el sistema

| Archivo | Lo genera | ¿Se versiona? |
|---|---|---|
| `clients/<slug>/client.config.js`, `FICHA.md`, `supabase/csv/*.csv` | tú | sí (repo privado si tiene datos personales) |
| `clients/<slug>/supabase/schema.sql`, `seed.sql` | `supabase-schema.mjs`, `supabase-import.mjs` | sí (es la verdad del esquema) |
| `dist/<slug>/`, `dist/<slug>.build.json` | `build-client.mjs` | no (`.gitignore`) |

## 5. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| "No pudimos conectar con el servidor" | URL/anon key mal copiadas, proyecto pausado, o falta una tabla (aplica `schema.sql`). |
| "Tu cuenta no tiene acceso a este sistema" | El correo de Auth no coincide con ningún perfil activo (créalo en Usuarios y roles). |
| El enlace mágico vuelve con error | Falta la URL en *Redirect URLs* o el enlace expiró. |
| "No se pudo guardar en el servidor: … (RLS)" | El rol no tiene ese permiso según `modules.js` → `collections`; ajusta y regenera el esquema. |
| La consola muestra "Refused to connect … CSP" | Cambiaste de proyecto Supabase sin reconstruir (la CSP lleva la URL del proyecto). |

## 6. Ruta autohospedada (VPS propio)

Para quien prefiere no depender de Cloudflare/Netlify, o del todo de la nube:

- **Sitio**: `deploy/selfhosted/` trae `docker-compose.yml` + `Caddyfile` (Caddy 2 con HTTPS automático de
  Let's Encrypt y los mismos encabezados que `_headers`) y `backup.sh` para cron. Pasos:
  ```bash
  rsync -a deploy/selfhosted/ vps:/srv/lgw/ && rsync -a --delete dist/<slug>-supabase/ vps:/srv/lgw/sitio/
  ssh vps 'cd /srv/lgw && cp .env.example .env && nano .env && docker compose up -d'
  # DNS: A/AAAA de www.cliente.cl → IP del VPS (puertos 80/443 abiertos)
  # cron: 17 4 * * * /srv/lgw/backup.sh >> /var/log/lgw-backup.log 2>&1
  ```
  Copia la línea `Content-Security-Policy` de `dist/<slug>/_headers` al `Caddyfile`.
- **Backend autohospedado, opción 1 — Supabase self‑hosted**: el repo oficial `supabase/supabase` (carpeta `docker/`)
  levanta Postgres, GoTrue, PostgREST, Realtime y Storage con Docker Compose. El adaptador y el `schema.sql` son los
  mismos (cambia solo `url`/`anonKey`). Requiere ~4 GB RAM, mantener actualizaciones y respaldar el volumen de Postgres
  (`backup.sh` sirve igual). No probado en este repo.
- **Backend autohospedado, opción 2 — PocketBase** (un binario Go + SQLite, ideal para un VPS chico): **no
  implementado**. Haría falta `assets/core/store/pocketbase.js` con la misma interfaz (`open/write/watch/auth/files`),
  colecciones creadas desde `modules.js` (reglas de API en vez de RLS) y respaldo de `pb_data/`. Queda como opción futura.
- Si usas el VPS solo para el sitio, la base sigue en Supabase Cloud y los respaldos con `backup.sh` contra el pooler.
