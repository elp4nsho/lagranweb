#!/usr/bin/env node
// Genera el SQL de Supabase (tablas + RLS por rol + triggers + realtime + storage + búsqueda pública)
// a partir de las colecciones que declaran los módulos ACTIVOS del cliente.
//
//   node tools/supabase-schema.mjs demo-pro [--out=clients/demo-pro/supabase/schema.sql]
//
// Aplicar: Supabase → SQL Editor → pegar y ejecutar (o psql "$DATABASE_URL" -f schema.sql).
// Es idempotente: se puede volver a correr al activar un módulo (crea lo que falta, rehace políticas).
// Probado contra PostgreSQL 16 con un stub de auth/storage de Supabase: node tools/test-schema.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function loadClient(slug) {
  const { defineClient } = await import(pathToFileURL(path.join(ROOT, 'assets/core/client.js')));
  const { resolveModules, mergeModules } = await import(pathToFileURL(path.join(ROOT, 'assets/core/modules.js')));
  const raw = (await import(pathToFileURL(path.join(ROOT, 'clients', slug, 'client.config.js')))).default;
  const { config, errors } = defineClient({ ...raw, backend: raw.backends?.supabase ? 'supabase' : raw.backend });
  if (errors.length) throw new Error(errors.join('; '));
  const P = (await import(pathToFileURL(path.join(ROOT, 'productos', config.app, 'product.js')))).default;
  const { active, ids } = resolveModules(P.modules, config.modules);
  return { C: config, P, active, ids, merged: mergeModules(active) };
}

const snake = s => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
export const tableFor = c => (c === 'users' ? 'profiles' : c === '_log' ? 'activity_log' : snake(c));
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const arr = rs => `array[${rs.map(q).join(', ')}]::text[]`;

export function generateSchema({ C, P, ids, merged }) {
  const roles = Object.keys(merged.roles);
  const staff = roles.filter(r => r !== 'cliente');
  const only = list => (list === 'public' ? 'public' : (list || []).filter(r => roles.includes(r)));
  const bucket = C.backend.bucket || 'archivos';
  const out = [];
  const L = (...s) => out.push(...s);
  L(`-- ============================================================================================`,
    `-- Esquema Supabase para "${C.brand.name}" (${C.slug}) · app ${C.app} · módulos: ${ids.join(', ')}`,
    `-- Generado por tools/supabase-schema.mjs el ${new Date().toISOString().slice(0, 10)}. No editar a mano: vuelve a generarlo.`,
    `-- Roles: ${roles.join(', ')}. Idempotente: se puede ejecutar de nuevo al activar módulos.`,
    `-- ============================================================================================`, '',
    'begin;', '',
    '-- ---------- Perfiles (users del kernel) ----------',
    `create table if not exists public.profiles (`,
    `  id text primary key,`,
    `  auth_id uuid unique references auth.users(id) on delete set null,`,
    `  email text not null,`,
    `  role text not null,`,
    `  active boolean not null default true,`,
    `  name text not null default '',`,
    `  data jsonb not null default '{}'::jsonb,`,
    `  created_at timestamptz not null default now(),`,
    `  updated_at timestamptz`,
    `);`,
    `alter table public.profiles drop constraint if exists profiles_role_check;`,
    `alter table public.profiles add constraint profiles_role_check check (role in (${roles.map(q).join(', ')}));`,
    `create unique index if not exists profiles_email_key on public.profiles (lower(email));`, '',
    '-- ---------- Valores sueltos (configuración del sitio, correlativos) y bitácora ----------',
    `create table if not exists public.kv (key text primary key, value jsonb, updated_at timestamptz default now());`,
    `create table if not exists public.activity_log (id text primary key, at timestamptz not null default now(), action text not null, detail text not null default '', user_id text references public.profiles(id) on delete set null);`,
    `create index if not exists activity_log_at_idx on public.activity_log (at desc);`, '');

  // ---------- Colecciones ----------
  const cols = Object.entries(merged.collections);
  L('-- ---------- Colecciones de los módulos activos ----------');
  for (const [c, d] of cols) {
    const t = tableFor(c);
    L(`-- ${d.label || c} (módulo ${d.module})`,
      `create table if not exists public.${t} (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);`);
    for (const f of [...new Set([...(d.index || []), ...(d.unique || [])])]) {
      const colName = snake(f);
      L(`alter table public.${t} add column if not exists ${colName} text generated always as (data->>${q(f)}) stored;`);
      L((d.unique || []).includes(f) ? `create unique index if not exists ${t}_${colName}_key on public.${t} (${colName}) where ${colName} is not null;` : `create index if not exists ${t}_${colName}_idx on public.${t} (${colName});`);
    }
    L('');
  }

  // ---------- Funciones de apoyo ----------
  L('-- ---------- Funciones de apoyo para RLS (security definer: leen el perfil sin pasar por RLS) ----------',
    `create or replace function public.lgw_role() returns text language sql stable security definer set search_path = public as $$`,
    `  select role from public.profiles where auth_id = auth.uid() and active limit 1 $$;`,
    `create or replace function public.lgw_has_role(roles text[]) returns boolean language sql stable security definer set search_path = public as $$`,
    `  select coalesce((select role from public.profiles where auth_id = auth.uid() and active limit 1) = any(roles), false) $$;`,
    `-- Campo del perfil del usuario actual: 'id' o una clave de data (p. ej. customerId).`,
    `create or replace function public.lgw_profile_field(f text) returns text language sql stable security definer set search_path = public as $$`,
    `  select case when f = 'id' then id else data->>f end from public.profiles where auth_id = auth.uid() and active limit 1 $$;`,
    `create or replace function public.lgw_norm(t text) returns text language sql immutable as $$ select lower(regexp_replace(coalesce(t, ''), '[[:space:].·-]', '', 'g')) $$;`,
    `create or replace function public.lgw_touch() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;`, '');

  // ---------- RLS ----------
  const policies = [];
  const pol = (t, name, op, to, using, check) => policies.push(`drop policy if exists ${q(name).replace(/'/g, '"')} on public.${t};\ncreate policy ${q(name).replace(/'/g, '"')} on public.${t} for ${op} to ${to}${using ? `\n  using (${using})` : ''}${check ? `\n  with check (${check})` : ''};`);
  const ownExpr = (rule, role) => `(public.lgw_role() = ${q(role)} and ${rule.field === 'id' ? 'id' : `data->>${q(rule.field)}`} = public.lgw_profile_field(${q(rule.profile || 'id')}))`;
  const anonTables = { select: new Set(['kv']), insert: new Set(['activity_log']) };
  for (const [c, d] of cols) {
    const t = tableFor(c);
    for (const op of ['select', 'insert', 'update', 'delete']) {
      const key = op === 'select' ? 'read' : op;
      let list = d[key] ?? (op !== 'select' ? d.write : undefined);
      list = only(list);
      const own = Object.entries(d.own || {}).filter(([r, rule]) => roles.includes(r) && (rule.ops || ['select']).includes(op));
      if (list === 'public') {
        if (op === 'update' || op === 'delete') throw new Error(`${c}: ${op} público no está permitido`);
        anonTables[op].add(t);
        pol(t, `${t}_${op}_public`, op, 'anon, authenticated', op === 'select' ? 'true' : null, op === 'insert' ? 'true' : null);
        continue;
      }
      const parts = [...(list?.length ? [`public.lgw_has_role(${arr(list)})`] : []), ...own.map(([r, rule]) => ownExpr(rule, r))];
      if (!parts.length) continue; // sin política = nadie (RLS niega por defecto)
      const expr = parts.join('\n      or ');
      pol(t, `${t}_${op}`, op, 'authenticated', op === 'insert' ? null : expr, op === 'select' || op === 'delete' ? null : expr);
    }
  }
  // profiles: el equipo ve a todos (nombres en listas); cada uno ve y edita su perfil; el admin administra.
  pol('profiles', 'profiles_select', 'select', 'authenticated', `auth_id = auth.uid() or public.lgw_has_role(${arr(staff)})`);
  pol('profiles', 'profiles_insert', 'insert', 'authenticated', null, `public.lgw_has_role(array['admin']::text[])`);
  pol('profiles', 'profiles_update', 'update', 'authenticated', `auth_id = auth.uid() or public.lgw_has_role(array['admin']::text[])`, `auth_id = auth.uid() or public.lgw_has_role(array['admin']::text[])`);
  pol('profiles', 'profiles_delete', 'delete', 'authenticated', `public.lgw_has_role(array['admin']::text[]) and auth_id is distinct from auth.uid()`);
  // kv: lectura pública (textos del sitio; no guardes secretos aquí); escribe el equipo; 'settings' solo admin.
  pol('kv', 'kv_select', 'select', 'anon, authenticated', 'true');
  pol('kv', 'kv_insert', 'insert', 'authenticated', null, `public.lgw_has_role(${arr(staff)}) and (key <> 'settings' or public.lgw_has_role(array['admin']::text[]))`);
  pol('kv', 'kv_update', 'update', 'authenticated', `public.lgw_has_role(${arr(staff)}) and (key <> 'settings' or public.lgw_has_role(array['admin']::text[]))`, `public.lgw_has_role(${arr(staff)}) and (key <> 'settings' or public.lgw_has_role(array['admin']::text[]))`);
  // bitácora: el admin la lee; cualquiera agrega a su nombre (o anónima, desde el sitio); nadie edita ni borra.
  pol('activity_log', 'activity_log_select', 'select', 'authenticated', `public.lgw_has_role(array['admin']::text[])`);
  pol('activity_log', 'activity_log_insert_auth', 'insert', 'authenticated', null, `user_id is null or user_id = public.lgw_profile_field('id')`);
  pol('activity_log', 'activity_log_insert_anon', 'insert', 'anon', null, `user_id is null`);

  const allTables = ['profiles', 'kv', 'activity_log', ...cols.map(([c]) => tableFor(c))];
  L('-- ---------- Row Level Security: todo cerrado salvo lo que permiten estas políticas ----------');
  allTables.forEach(t => L(`alter table public.${t} enable row level security;`));
  L('', ...policies, '');
  L('-- updated_at lo fija el servidor', ...allTables.filter(t => t !== 'activity_log').map(t => `drop trigger if exists lgw_touch on public.${t};\ncreate trigger lgw_touch before update on public.${t} for each row execute function public.lgw_touch();`), '');

  // ---------- Protección de perfiles ----------
  const prot = P.protectedProfileFields || [];
  L('-- ---------- Un usuario no puede subirse de rol, reactivarse, cambiar su correo ni sus campos ligados ----------',
    `create or replace function public.lgw_protect_profile() returns trigger language plpgsql security definer set search_path = public as $$`,
    `begin`,
    `  if auth.uid() is null or public.lgw_has_role(array['admin']::text[]) then return new; end if; -- SQL editor / service_role / admin`,
    `  if new.role is distinct from old.role or new.active is distinct from old.active or new.auth_id is distinct from old.auth_id or lower(new.email) is distinct from lower(old.email)${prot.map(f => ` or (new.data->${q(f)}) is distinct from (old.data->${q(f)})`).join('')} then`,
    `    raise exception 'No puedes cambiar ese dato de tu perfil' using errcode = '42501';`,
    `  end if;`,
    `  return new;`,
    `end $$;`,
    `drop trigger if exists lgw_protect_profile on public.profiles;`,
    `create trigger lgw_protect_profile before update on public.profiles for each row execute function public.lgw_protect_profile();`, '');

  // ---------- Alta de usuarios de Auth ----------
  const su = P.signup && ids.includes(P.signup.module) && roles.includes(P.signup.role) ? P.signup : null;
  const link = su?.link && merged.collections[su.link.collection] ? su.link : null;
  L('-- ---------- Nuevo usuario en Supabase Auth (invitación, enlace mágico o registro) ----------',
    `-- 1) Si un admin ya creó su perfil con ese correo (Usuarios y roles), se liga por correo.`,
    su ? `-- 2) Si no, se registra como «${su.role}»${link ? ` con su ficha en ${link.collection} (reutiliza una existente con el mismo correo)` : ''}.` : `-- 2) Si no, no se crea perfil: la cuenta de Auth existe pero no ve nada (RLS).`,
    `--    IMPORTANTE: deja activado "Confirm email" en Auth → Providers → Email.`,
    `create or replace function public.lgw_handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$`,
    `declare n text := coalesce(new.raw_user_meta_data->>'name', ''); k text := substr(replace(new.id::text, '-', ''), 1, 12);${link ? ' cid text;' : ''}`,
    `begin`,
    `  update public.profiles set auth_id = new.id where lower(email) = lower(new.email) and auth_id is null;`,
    `  if found then return new; end if;`,
    ...(su ? [
      ...(link ? [
        `  select id into cid from public.${tableFor(link.collection)} where lower(data->>'email') = lower(new.email) limit 1;`,
        `  if cid is null then`,
        `    cid := 'c-' || k;`,
        `    insert into public.${tableFor(link.collection)} (id, data) values (cid, jsonb_build_object(${Object.entries(link.copy || {}).map(([to, from]) => `${q(to)}, ${from === 'email' ? 'new.email' : from === 'name' ? "coalesce(nullif(n, ''), new.email)" : `coalesce(new.raw_user_meta_data->>${q(from)}, '')`}`).join(', ')}));`,
        `  end if;`] : []),
      `  insert into public.profiles (id, auth_id, email, role, name, data) values ('p-' || k, new.id, lower(new.email), ${q(su.role)}, n, ${link ? `jsonb_build_object(${q(link.field)}, cid)` : `'{}'::jsonb`});`] : []),
    `  return new;`,
    `end $$;`,
    `drop trigger if exists lgw_on_auth_user_created on auth.users;`,
    `create trigger lgw_on_auth_user_created after insert on auth.users for each row execute function public.lgw_handle_new_user();`, '');

  // ---------- Búsqueda pública acotada ----------
  const lookups = cols.filter(([, d]) => d.lookup);
  L('-- ---------- Búsqueda pública (seguimiento): solo con TODOS los campos de match y solo devuelve los campos listados ----------',
    `create or replace function public.lgw_lookup(p_collection text, p_match jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $$`,
    `declare r jsonb; keys text[] := (select array_agg(k order by k) from jsonb_object_keys(p_match) as k);`,
    `begin`,
    ...lookups.flatMap(([c, d]) => [
      `  if p_collection = ${q(c)} then`,
      `    if keys is distinct from ${arr([...d.lookup.match].sort())} then raise exception 'búsqueda no permitida' using errcode = '42501'; end if;`,
      `    select jsonb_build_object(${d.lookup.fields.map(f => `${q(f)}, data->${q(f)}`).join(', ')}) into r from public.${tableFor(c)}`,
      `      where ${d.lookup.match.map(f => `public.lgw_norm(data->>${q(f)}) = public.lgw_norm(p_match->>${q(f)})`).join(' and ')} limit 1;`,
      `    return r;`,
      `  end if;`]),
    `  raise exception 'búsqueda no permitida' using errcode = '42501';`,
    `end $$;`,
    `revoke all on function public.lgw_lookup(text, jsonb) from public;`,
    `grant execute on function public.lgw_lookup(text, jsonb) to anon, authenticated;`, '');

  // ---------- Permisos de tabla (RLS filtra por fila encima de esto) ----------
  L('-- ---------- Privilegios de tabla (RLS decide fila por fila) ----------',
    `grant usage on schema public to anon, authenticated;`,
    `grant select, insert, update, delete on ${allTables.map(t => 'public.' + t).join(', ')} to authenticated;`,
    `revoke all on ${allTables.map(t => 'public.' + t).join(', ')} from anon;`,
    `grant select on ${[...anonTables.select].map(t => 'public.' + t).join(', ')} to anon;`,
    `grant insert on ${[...anonTables.insert].map(t => 'public.' + t).join(', ')} to anon;`,
    `grant execute on function public.lgw_role(), public.lgw_has_role(text[]), public.lgw_profile_field(text) to anon, authenticated;`, '');

  // ---------- Realtime y Storage (solo si existen, p. ej. en Supabase) ----------
  L('-- ---------- Realtime: cambios en vivo (postgres_changes respeta RLS) ----------',
    `do $$ begin`,
    `  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then`,
    ...allTables.map(t => `    begin alter publication supabase_realtime add table public.${t}; exception when duplicate_object then null; end;`),
    `  end if;`,
    `end $$;`, '');
  if (cols.some(([, d]) => d.files)) {
    L(`-- ---------- Storage: bucket «${bucket}» público con rutas aleatorias; sube el equipo, borra el admin ----------`,
      `do $$ begin`,
      `  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then`,
      `    insert into storage.buckets (id, name, public) values (${q(bucket)}, ${q(bucket)}, true) on conflict (id) do nothing;`,
      `    execute 'drop policy if exists "lgw_files_insert" on storage.objects';`,
      `    execute ${q(`create policy "lgw_files_insert" on storage.objects for insert to authenticated with check (bucket_id = ${q(bucket)} and public.lgw_has_role(${arr(staff)}))`)};`,
      `    execute 'drop policy if exists "lgw_files_delete" on storage.objects';`,
      `    execute ${q(`create policy "lgw_files_delete" on storage.objects for delete to authenticated using (bucket_id = ${q(bucket)} and public.lgw_has_role(array['admin']::text[]))`)};`,
      `  end if;`,
      `end $$;`, '');
  }
  L('commit;', '');
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const slug = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!slug) { console.error('Uso: node tools/supabase-schema.mjs <slug> [--out=archivo.sql]'); process.exit(1); }
  const ctx = await loadClient(slug);
  const sql = generateSchema(ctx);
  const outArg = process.argv.find(a => a.startsWith('--out='));
  const out = outArg ? path.resolve(outArg.slice(6)) : path.join(ROOT, 'clients', slug, 'supabase', 'schema.sql');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, sql);
  console.log(`✓ ${path.relative(ROOT, out)} · ${ctx.ids.length} módulos · ${Object.keys(ctx.merged.collections).length} colecciones · roles: ${Object.keys(ctx.merged.roles).join(', ')}`);
  console.log(`  → datos iniciales: node tools/supabase-import.mjs ${slug} [--csv=carpeta]`);
}
