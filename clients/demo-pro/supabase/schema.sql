-- ============================================================================================
-- Esquema Supabase para "Automotriz Cordillera" (demo-pro) · app taller · módulos: base, clientes, agenda, ordenes, portal
-- Generado por tools/supabase-schema.mjs el 2026-10-31. No editar a mano: vuelve a generarlo.
-- Roles: admin, asesor, jefe, mecanico, cliente. Idempotente: se puede ejecutar de nuevo al activar módulos.
-- ============================================================================================

begin;

-- ---------- Perfiles (users del kernel) ----------
create table if not exists public.profiles (
  id text primary key,
  auth_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  role text not null,
  active boolean not null default true,
  name text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'asesor', 'jefe', 'mecanico', 'cliente'));
create unique index if not exists profiles_email_key on public.profiles (lower(email));

-- ---------- Valores sueltos (configuración del sitio, correlativos) y bitácora ----------
create table if not exists public.kv (key text primary key, value jsonb, updated_at timestamptz default now());
create table if not exists public.activity_log (id text primary key, at timestamptz not null default now(), action text not null, detail text not null default '', user_id text references public.profiles(id) on delete set null);
create index if not exists activity_log_at_idx on public.activity_log (at desc);

-- ---------- Colecciones de los módulos activos ----------
-- Servicios del sitio (módulo base)
create table if not exists public.services (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);
alter table public.services add column if not exists active text generated always as (data->>'active') stored;
create index if not exists services_active_idx on public.services (active);

-- Mensajes de contacto (módulo base)
create table if not exists public.leads (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);
alter table public.leads add column if not exists status text generated always as (data->>'status') stored;
create index if not exists leads_status_idx on public.leads (status);

-- Clientes (módulo clientes)
create table if not exists public.customers (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);

-- Vehículos (módulo clientes)
create table if not exists public.vehicles (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);
alter table public.vehicles add column if not exists customer_id text generated always as (data->>'customerId') stored;
create index if not exists vehicles_customer_id_idx on public.vehicles (customer_id);
alter table public.vehicles add column if not exists plate text generated always as (data->>'plate') stored;
create unique index if not exists vehicles_plate_key on public.vehicles (plate) where plate is not null;

-- Citas (módulo agenda)
create table if not exists public.appointments (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);
alter table public.appointments add column if not exists date text generated always as (data->>'date') stored;
create index if not exists appointments_date_idx on public.appointments (date);
alter table public.appointments add column if not exists status text generated always as (data->>'status') stored;
create index if not exists appointments_status_idx on public.appointments (status);
alter table public.appointments add column if not exists customer_id text generated always as (data->>'customerId') stored;
create index if not exists appointments_customer_id_idx on public.appointments (customer_id);

-- Órdenes de trabajo (módulo ordenes)
create table if not exists public.ots (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz);
alter table public.ots add column if not exists code text generated always as (data->>'code') stored;
create unique index if not exists ots_code_key on public.ots (code) where code is not null;
alter table public.ots add column if not exists status text generated always as (data->>'status') stored;
create index if not exists ots_status_idx on public.ots (status);
alter table public.ots add column if not exists customer_id text generated always as (data->>'customerId') stored;
create index if not exists ots_customer_id_idx on public.ots (customer_id);
alter table public.ots add column if not exists vehicle_id text generated always as (data->>'vehicleId') stored;
create index if not exists ots_vehicle_id_idx on public.ots (vehicle_id);
alter table public.ots add column if not exists mechanic_id text generated always as (data->>'mechanicId') stored;
create index if not exists ots_mechanic_id_idx on public.ots (mechanic_id);

-- ---------- Funciones de apoyo para RLS (security definer: leen el perfil sin pasar por RLS) ----------
create or replace function public.lgw_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_id = auth.uid() and active limit 1 $$;
create or replace function public.lgw_has_role(roles text[]) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where auth_id = auth.uid() and active limit 1) = any(roles), false) $$;
-- Campo del perfil del usuario actual: 'id' o una clave de data (p. ej. customerId).
create or replace function public.lgw_profile_field(f text) returns text language sql stable security definer set search_path = public as $$
  select case when f = 'id' then id else data->>f end from public.profiles where auth_id = auth.uid() and active limit 1 $$;
create or replace function public.lgw_norm(t text) returns text language sql immutable as $$ select lower(regexp_replace(coalesce(t, ''), '[[:space:].·-]', '', 'g')) $$;
create or replace function public.lgw_touch() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- ---------- Row Level Security: todo cerrado salvo lo que permiten estas políticas ----------
alter table public.profiles enable row level security;
alter table public.kv enable row level security;
alter table public.activity_log enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.appointments enable row level security;
alter table public.ots enable row level security;

drop policy if exists "services_select_public" on public.services;
create policy "services_select_public" on public.services for select to anon, authenticated
  using (true);
drop policy if exists "services_insert" on public.services;
create policy "services_insert" on public.services for insert to authenticated
  with check (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "services_update" on public.services;
create policy "services_update" on public.services for update to authenticated
  using (public.lgw_has_role(array['admin']::text[]))
  with check (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "services_delete" on public.services;
create policy "services_delete" on public.services for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads for select to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]));
drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public" on public.leads for insert to anon, authenticated
  with check (true);
drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads for update to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]))
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]));
drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe', 'mecanico']::text[])
      or (public.lgw_role() = 'cliente' and id = public.lgw_profile_field('customerId')));
drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert to authenticated
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]));
drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers for update to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'cliente' and id = public.lgw_profile_field('customerId')))
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'cliente' and id = public.lgw_profile_field('customerId')));
drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select" on public.vehicles for select to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe', 'mecanico']::text[])
      or (public.lgw_role() = 'cliente' and data->>'customerId' = public.lgw_profile_field('customerId')));
drop policy if exists "vehicles_insert" on public.vehicles;
create policy "vehicles_insert" on public.vehicles for insert to authenticated
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'cliente' and data->>'customerId' = public.lgw_profile_field('customerId')));
drop policy if exists "vehicles_update" on public.vehicles;
create policy "vehicles_update" on public.vehicles for update to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'cliente' and data->>'customerId' = public.lgw_profile_field('customerId')))
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'cliente' and data->>'customerId' = public.lgw_profile_field('customerId')));
drop policy if exists "vehicles_delete" on public.vehicles;
create policy "vehicles_delete" on public.vehicles for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments for select to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'cliente' and data->>'customerId' = public.lgw_profile_field('customerId')));
drop policy if exists "appointments_insert_public" on public.appointments;
create policy "appointments_insert_public" on public.appointments for insert to anon, authenticated
  with check (true);
drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments for update to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]))
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]));
drop policy if exists "appointments_delete" on public.appointments;
create policy "appointments_delete" on public.appointments for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "ots_select" on public.ots;
create policy "ots_select" on public.ots for select to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'mecanico' and data->>'mechanicId' = public.lgw_profile_field('id'))
      or (public.lgw_role() = 'cliente' and data->>'customerId' = public.lgw_profile_field('customerId')));
drop policy if exists "ots_insert" on public.ots;
create policy "ots_insert" on public.ots for insert to authenticated
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[]));
drop policy if exists "ots_update" on public.ots;
create policy "ots_update" on public.ots for update to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'mecanico' and data->>'mechanicId' = public.lgw_profile_field('id')))
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe']::text[])
      or (public.lgw_role() = 'mecanico' and data->>'mechanicId' = public.lgw_profile_field('id')));
drop policy if exists "ots_delete" on public.ots;
create policy "ots_delete" on public.ots for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (auth_id = auth.uid() or public.lgw_has_role(array['admin', 'asesor', 'jefe', 'mecanico']::text[]));
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert to authenticated
  with check (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (auth_id = auth.uid() or public.lgw_has_role(array['admin']::text[]))
  with check (auth_id = auth.uid() or public.lgw_has_role(array['admin']::text[]));
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles for delete to authenticated
  using (public.lgw_has_role(array['admin']::text[]) and auth_id is distinct from auth.uid());
drop policy if exists "kv_select" on public.kv;
create policy "kv_select" on public.kv for select to anon, authenticated
  using (true);
drop policy if exists "kv_insert" on public.kv;
create policy "kv_insert" on public.kv for insert to authenticated
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe', 'mecanico']::text[]) and (key <> 'settings' or public.lgw_has_role(array['admin']::text[])));
drop policy if exists "kv_update" on public.kv;
create policy "kv_update" on public.kv for update to authenticated
  using (public.lgw_has_role(array['admin', 'asesor', 'jefe', 'mecanico']::text[]) and (key <> 'settings' or public.lgw_has_role(array['admin']::text[])))
  with check (public.lgw_has_role(array['admin', 'asesor', 'jefe', 'mecanico']::text[]) and (key <> 'settings' or public.lgw_has_role(array['admin']::text[])));
drop policy if exists "activity_log_select" on public.activity_log;
create policy "activity_log_select" on public.activity_log for select to authenticated
  using (public.lgw_has_role(array['admin']::text[]));
drop policy if exists "activity_log_insert_auth" on public.activity_log;
create policy "activity_log_insert_auth" on public.activity_log for insert to authenticated
  with check (user_id is null or user_id = public.lgw_profile_field('id'));
drop policy if exists "activity_log_insert_anon" on public.activity_log;
create policy "activity_log_insert_anon" on public.activity_log for insert to anon
  with check (user_id is null);

-- updated_at lo fija el servidor
drop trigger if exists lgw_touch on public.profiles;
create trigger lgw_touch before update on public.profiles for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.kv;
create trigger lgw_touch before update on public.kv for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.services;
create trigger lgw_touch before update on public.services for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.leads;
create trigger lgw_touch before update on public.leads for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.customers;
create trigger lgw_touch before update on public.customers for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.vehicles;
create trigger lgw_touch before update on public.vehicles for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.appointments;
create trigger lgw_touch before update on public.appointments for each row execute function public.lgw_touch();
drop trigger if exists lgw_touch on public.ots;
create trigger lgw_touch before update on public.ots for each row execute function public.lgw_touch();

-- ---------- Un usuario no puede subirse de rol, reactivarse, cambiar su correo ni sus campos ligados ----------
create or replace function public.lgw_protect_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.lgw_has_role(array['admin']::text[]) then return new; end if; -- SQL editor / service_role / admin
  if new.role is distinct from old.role or new.active is distinct from old.active or new.auth_id is distinct from old.auth_id or lower(new.email) is distinct from lower(old.email) or (new.data->'customerId') is distinct from (old.data->'customerId') then
    raise exception 'No puedes cambiar ese dato de tu perfil' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists lgw_protect_profile on public.profiles;
create trigger lgw_protect_profile before update on public.profiles for each row execute function public.lgw_protect_profile();

-- ---------- Nuevo usuario en Supabase Auth (invitación, enlace mágico o registro) ----------
-- 1) Si un admin ya creó su perfil con ese correo (Usuarios y roles), se liga por correo.
-- 2) Si no, se registra como «cliente» con su ficha en customers (reutiliza una existente con el mismo correo).
--    IMPORTANTE: deja activado "Confirm email" en Auth → Providers → Email.
create or replace function public.lgw_handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare n text := coalesce(new.raw_user_meta_data->>'name', ''); k text := substr(replace(new.id::text, '-', ''), 1, 12); cid text;
begin
  update public.profiles set auth_id = new.id where lower(email) = lower(new.email) and auth_id is null;
  if found then return new; end if;
  select id into cid from public.customers where lower(data->>'email') = lower(new.email) limit 1;
  if cid is null then
    cid := 'c-' || k;
    insert into public.customers (id, data) values (cid, jsonb_build_object('name', coalesce(nullif(n, ''), new.email), 'email', new.email, 'phone', coalesce(new.raw_user_meta_data->>'phone', '')));
  end if;
  insert into public.profiles (id, auth_id, email, role, name, data) values ('p-' || k, new.id, lower(new.email), 'cliente', n, jsonb_build_object('customerId', cid));
  return new;
end $$;
drop trigger if exists lgw_on_auth_user_created on auth.users;
create trigger lgw_on_auth_user_created after insert on auth.users for each row execute function public.lgw_handle_new_user();

-- ---------- Búsqueda pública (seguimiento): solo con TODOS los campos de match y solo devuelve los campos listados ----------
create or replace function public.lgw_lookup(p_collection text, p_match jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb; keys text[] := (select array_agg(k order by k) from jsonb_object_keys(p_match) as k);
begin
  if p_collection = 'ots' then
    if keys is distinct from array['code', 'plate']::text[] then raise exception 'búsqueda no permitida' using errcode = '42501'; end if;
    select jsonb_build_object('code', data->'code', 'status', data->'status', 'statusAt', data->'statusAt', 'history', data->'history', 'car', data->'car', 'promisedAt', data->'promisedAt', 'type', data->'type') into r from public.ots
      where public.lgw_norm(data->>'code') = public.lgw_norm(p_match->>'code') and public.lgw_norm(data->>'plate') = public.lgw_norm(p_match->>'plate') limit 1;
    return r;
  end if;
  raise exception 'búsqueda no permitida' using errcode = '42501';
end $$;
revoke all on function public.lgw_lookup(text, jsonb) from public;
grant execute on function public.lgw_lookup(text, jsonb) to anon, authenticated;

-- ---------- Privilegios de tabla (RLS decide fila por fila) ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.kv, public.activity_log, public.services, public.leads, public.customers, public.vehicles, public.appointments, public.ots to authenticated;
revoke all on public.profiles, public.kv, public.activity_log, public.services, public.leads, public.customers, public.vehicles, public.appointments, public.ots from anon;
grant select on public.kv, public.services to anon;
grant insert on public.activity_log, public.leads, public.appointments to anon;
grant execute on function public.lgw_role(), public.lgw_has_role(text[]), public.lgw_profile_field(text) to anon, authenticated;

-- ---------- Realtime: cambios en vivo (postgres_changes respeta RLS) ----------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.kv; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.activity_log; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.services; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.leads; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.customers; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.vehicles; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.appointments; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.ots; exception when duplicate_object then null; end;
  end if;
end $$;

-- ---------- Storage: bucket «archivos» público con rutas aleatorias; sube el equipo, borra el admin ----------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('archivos', 'archivos', true) on conflict (id) do nothing;
    execute 'drop policy if exists "lgw_files_insert" on storage.objects';
    execute 'create policy "lgw_files_insert" on storage.objects for insert to authenticated with check (bucket_id = ''archivos'' and public.lgw_has_role(array[''admin'', ''asesor'', ''jefe'', ''mecanico'']::text[]))';
    execute 'drop policy if exists "lgw_files_delete" on storage.objects';
    execute 'create policy "lgw_files_delete" on storage.objects for delete to authenticated using (bucket_id = ''archivos'' and public.lgw_has_role(array[''admin'']::text[]))';
  end if;
end $$;

commit;
