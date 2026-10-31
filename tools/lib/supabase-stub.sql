-- Stub mínimo del entorno Supabase para probar schema.sql en un PostgreSQL común (tools/test-schema.mjs).
-- Imita: roles anon/authenticated/service_role, auth.users, auth.uid() leyendo request.jwt.claims
-- (igual que PostgREST), el esquema storage y la publicación supabase_realtime.
-- NO imita: GoTrue (correos, contraseñas, tokens), PostgREST, Realtime ni la API de Storage.
do $$ begin create role anon nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin noinherit bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, delete on storage.objects to authenticated;
do $$ begin create publication supabase_realtime; exception when duplicate_object then null; end $$;
