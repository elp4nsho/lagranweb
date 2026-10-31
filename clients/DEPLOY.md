# Publicar un cliente (sitio estático)

`node tools/build-client.mjs <slug>` deja en `dist/<slug>/` todo lo necesario: HTML, JS empaquetado con
hash, CSS del estilo elegido, `favicon.svg`, `og.png`, `robots.txt`, `sitemap.xml`, `404.html`,
`privacidad.html`, `_headers` (CSP, HSTS, caché) y `netlify.toml`. No hay paso de build en el hosting.

Probar local tal como quedará publicado (aplica `_headers` y la página 404):

```bash
node tools/serve-dist.mjs dist/<slug> --port=8890
```

## Cloudflare Pages

```bash
npx wrangler pages project create <slug> --production-branch=main
npx wrangler pages deploy dist/<slug> --project-name=<slug>
```

Dominio: Pages → proyecto → *Custom domains* → `www.cliente.cl` (y el apex si el dominio usa los nameservers
de Cloudflare). `_headers` y `404.html` se aplican solos.

## Netlify

```bash
npx netlify-cli deploy --dir=dist/<slug> --prod      # la primera vez pregunta o crea el sitio
```

O arrastrar la carpeta en app.netlify.com → *Add new site → Deploy manually*. Dominio: *Domain management* →
`www.cliente.cl` como CNAME a `<sitio>.netlify.app`; el apex con ALIAS/ANAME o el registro A que indique Netlify.

## Automático desde GitHub

Plantilla de GitHub Actions (build + deploy a Pages en cada push): `deploy/github-actions/deploy-cloudflare.yml`.
Cópiala al repo del cliente como `.github/workflows/deploy.yml` y define los secretos `CLOUDFLARE_API_TOKEN` y
`CLOUDFLARE_ACCOUNT_ID`.

## Backend Supabase

```bash
node tools/supabase-schema.mjs <slug>          # → clients/<slug>/supabase/schema.sql
node tools/supabase-import.mjs <slug> --csv=…   # → clients/<slug>/supabase/seed.sql
node tools/build-client.mjs <slug> --backend=supabase
```

Aplica los dos SQL en el SQL Editor (o `psql`), configura Auth y publica `dist/<slug>-supabase/`.
La anon key va en el sitio (es pública por diseño; protege RLS). La service_role key **nunca** sale de tu máquina.
Detalle y lo que falta verificar: `assets/core/PRODUCTION.md` §5–§7 · runbook: `docs/OPERACION.md`.
