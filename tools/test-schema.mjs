#!/usr/bin/env node
// Prueba el SQL generado (schema.sql + seed.sql) en un PostgreSQL REAL, con un stub del entorno
// Supabase (tools/lib/supabase-stub.sql): tablas, RLS por rol, triggers de perfiles y de alta de
// usuarios, búsqueda pública, realtime y storage. Cada caso corre como anon / authenticated con
// request.jwt.claims, igual que PostgREST.
//
//   node tools/test-schema.mjs --pg="postgresql://postgres@/postgres?host=/ruta/socket&port=5433" [--slug=demo-pro]
//   (o PGURL=…). Necesita psql en el PATH y un superusuario. Crea y borra la base lgw_schema_test.
// Un Postgres desechable: docker run --rm -p 5433:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
//                         → --pg=postgresql://postgres@localhost:5433/postgres
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadClient, generateSchema } from './supabase-schema.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || d;
const PG = arg('pg', process.env.PGURL);
const slug = arg('slug', 'demo-pro');
if (!PG) { console.error('Falta --pg=postgresql://… (o PGURL)'); process.exit(2); }
const DB = 'lgw_schema_test';
const urlFor = db => PG.replace(/(:\/\/[^/]*\/)[^?]*/, '$1' + db); // cambia solo el nombre de la base

function psql(sql, db = DB) {
  const r = spawnSync('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-d', urlFor(db)], { input: sql, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
// Corre `sql` como un rol de Supabase; sub = uuid del usuario de Auth (o null = anon). Siempre hace rollback.
function as(role, sub, sql) {
  const claims = JSON.stringify(sub ? { sub, role } : { role });
  return psql(`begin;\nselect set_config('request.jwt.claims', '${claims}', true) is null;\nset local role ${role};\n${sql}\nrollback;`);
}
const val = r => r.out.split('\n').slice(1).join('\n').trim(); // quita la salida de set_config
let pass = 0, fail = 0;
const check = (cond, msg, extra = '') => { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg + (extra ? '\n      ' + extra.split('\n').slice(0, 3).join('\n      ') : '')); } };
const denied = r => !r.ok && /permission denied|row-level security|No puedes|42501|no permitida/i.test(r.err);

const ctx = await loadClient(slug);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lgw-schema-'));
const schema = generateSchema(ctx);
fs.writeFileSync(path.join(tmp, 'schema.sql'), schema);
const seedFile = path.join(tmp, 'seed.sql');
const imp = spawnSync(process.execPath, [path.join(ROOT, 'tools/supabase-import.mjs'), slug, `--out=${seedFile}`, ...(fs.existsSync(path.join(ROOT, 'clients', slug, 'supabase/csv')) ? [`--csv=${path.join(ROOT, 'clients', slug, 'supabase/csv')}`] : [])], { encoding: 'utf8' });
if (imp.status !== 0) { console.error(imp.stderr); process.exit(1); }

console.log(`\nEsquema de ${slug} en PostgreSQL real (${ctx.ids.join(', ')})`);
psql(`drop database if exists ${DB};`, 'postgres');
check(psql(`create database ${DB};`, 'postgres').ok, 'base de datos de prueba creada');
let r = psql(fs.readFileSync(path.join(ROOT, 'tools/lib/supabase-stub.sql'), 'utf8'));
check(r.ok, 'stub de Supabase (auth, storage, roles, realtime)', r.err);
r = psql(schema); check(r.ok, 'schema.sql se aplica sin errores', r.err);
r = psql(schema); check(r.ok, 'schema.sql es idempotente (segunda pasada)', r.err);
r = psql(fs.readFileSync(seedFile, 'utf8')); check(r.ok, 'seed.sql (cuentas + catálogos + settings + CSV) se aplica', r.err);
r = psql(fs.readFileSync(seedFile, 'utf8')); check(r.ok, 'seed.sql es idempotente', r.err);

// Usuarios de Auth: el trigger liga perfiles existentes por correo o registra clientes.
const U = { admin: '11111111-1111-4111-8111-111111111111', jefe: '22222222-2222-4222-8222-222222222222', mec: '33333333-3333-4333-8333-333333333333', javiera: '44444444-4444-4444-8444-444444444444', nuevo: '55555555-5555-4555-8555-555555555555', otro: '66666666-6666-4666-8666-666666666666' };
r = psql(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${U.admin}', 'ADMIN@automotrizcordillera.cl', '{}'), ('${U.jefe}', 'jefe@automotrizcordillera.cl', '{}'), ('${U.mec}', 'mecanico1@automotrizcordillera.cl', '{}'),
  ('${U.javiera}', 'javiera.morales@correo.cl', '{"name":"Javiera Morales"}'), ('${U.nuevo}', 'nuevo@correo.cl', '{"name":"Nuevo Cliente","phone":"+56 9 1"}');`);
check(r.ok, 'alta de usuarios en auth.users (dispara lgw_handle_new_user)', r.err);
r = psql(`select string_agg(email || ':' || role || ':' || coalesce(data->>'customerId','-'), ',' order by email) from public.profiles where auth_id is not null;`);
check(r.out.includes('admin@automotrizcordillera.cl:admin') && r.out.includes('jefe@automotrizcordillera.cl:jefe') && r.out.includes('mecanico1@automotrizcordillera.cl:mecanico'), 'invitados por correo (accounts, users.csv) quedan ligados a su perfil, sin importar mayúsculas', r.out);
check(r.out.includes('javiera.morales@correo.cl:cliente:c-001'), 'registro de una clienta existente: se reutiliza su ficha (c-001)', r.out);
check(/nuevo@correo\.cl:cliente:c-[0-9a-f]{12}/.test(r.out) && psql(`select data->>'name' from public.customers where data->>'email' = 'nuevo@correo.cl';`).out === 'Nuevo Cliente', 'registro nuevo: perfil cliente + ficha en customers con nombre del metadata', r.out);
const mecId = psql(`select id from public.profiles where auth_id = '${U.mec}';`).out;
psql(`insert into public.ots (id, data) values ('ot-a', '{"code":"OT-1","plate":"KXTR-41","customerId":"c-001","mechanicId":"${mecId}","status":"reparacion","car":"Toyota Yaris"}'), ('ot-b', '{"code":"OT-2","plate":"PLJH-22","customerId":"c-002","mechanicId":"","status":"recepcion"}');`);

console.log('\nAnónimo (anon key, sin sesión)');
check(val(as('anon', null, `select count(*) from public.services;`)) === '8', 'lee el catálogo público de servicios');
check(val(as('anon', null, `select value->>'name' from public.kv where key = 'settings';`)) === ctx.C.brand.name, 'lee los textos del sitio (kv.settings)');
check(denied(as('anon', null, `select count(*) from public.customers;`)), 'NO lee clientes (permiso denegado)');
check(denied(as('anon', null, `select count(*) from public.profiles;`)), 'NO lee perfiles');
r = as('anon', null, `insert into public.leads (id, data) values ('ld-x', '{"name":"Visita","status":"nuevo"}'); select 'ok';`); check(val(r) === 'ok', 'inserta un mensaje de contacto', r.err);
r = as('anon', null, `insert into public.appointments (id, data) values ('ap-x', '{"code":"CITA-X","status":"solicitada"}'); select 'ok';`); check(val(r) === 'ok', 'reserva una cita', r.err);
check(denied(as('anon', null, `insert into public.ots (id, data) values ('ot-x', '{}');`)), 'NO crea OT');
check(denied(as('anon', null, `insert into public.activity_log (id, action, user_id) values ('l1', 'x', '${mecId}');`)), 'NO escribe en la bitácora a nombre de otro');
r = as('anon', null, `select public.lgw_lookup('ots', '{"code":"ot-1","plate":"kxtr41"}');`);
check(val(r).includes('"code": "OT-1"') && !val(r).includes('customerId') && !val(r).includes('mechanicId'), 'seguimiento público con código + patente: solo campos permitidos', val(r) || r.err);
check(val(as('anon', null, `select public.lgw_lookup('ots', '{"code":"OT-1","plate":"OTRA-99"}') is null;`)) === 't', 'seguimiento con otra patente → nada');
check(denied(as('anon', null, `select public.lgw_lookup('ots', '{"code":"OT-1"}');`)), 'seguimiento solo con código → rechazado (evita enumerar OT)');
check(denied(as('anon', null, `select public.lgw_lookup('customers', '{"name":"x"}');`)), 'búsqueda en otra colección → rechazada');

console.log('\nAdministrador');
check(val(as('authenticated', U.admin, `select count(*) from public.customers;`)) === psql(`select count(*) from public.customers;`).out, 've todos los clientes');
check(val(as('authenticated', U.admin, `select count(*) from public.activity_log where true; select count(*) from public.profiles;`)).split('\n').pop() >= '5', 've todos los perfiles');
r = as('authenticated', U.admin, `update public.profiles set role = 'asesor' where email = 'jefe@automotrizcordillera.cl' returning role;`); check(val(r) === 'asesor', 'cambia el rol de otro usuario', r.err);
r = as('authenticated', U.admin, `update public.kv set value = '{"name":"X"}' where key = 'settings' returning key;`); check(val(r) === 'settings', 'edita la configuración del sitio', r.err);
check(val(as('authenticated', U.admin, `delete from public.profiles where auth_id = '${U.admin}' returning id;`)) === '', 'no puede borrarse a sí mismo');

console.log('\nJefe de taller');
check(val(as('authenticated', U.jefe, `select count(*) from public.ots;`)) === '2', 've todas las OT');
r = as('authenticated', U.jefe, `insert into public.kv (key, value) values ('_seq:ot', '24800') on conflict (key) do update set value = excluded.value returning key;`); check(val(r) === '_seq:ot', 'actualiza correlativos (kv)', r.err);
r = as('authenticated', U.jefe, `update public.kv set value = '{}' where key = 'settings' returning key;`); check(val(r) === '' || denied(r), 'NO edita la configuración del sitio (solo admin)');
check(denied(as('authenticated', U.jefe, `update public.profiles set role = 'admin' where auth_id = '${U.jefe}';`)), 'NO se sube a admin (trigger lgw_protect_profile)');
check(val(as('authenticated', U.jefe, `select count(*) from public.activity_log;`)) === '0', 'NO lee la bitácora (solo admin)');

console.log('\nMecánico');
check(val(as('authenticated', U.mec, `select string_agg(id, ',') from public.ots;`)) === 'ot-a', 've solo sus OT');
check(val(as('authenticated', U.mec, `update public.ots set data = data || '{"status":"control"}' where id = 'ot-a' returning id;`)) === 'ot-a', 'actualiza su OT');
check(val(as('authenticated', U.mec, `update public.ots set data = data || '{"status":"listo"}' where id = 'ot-b' returning id;`)) === '', 'NO toca una OT ajena (0 filas)');
check(denied(as('authenticated', U.mec, `insert into public.ots (id, data) values ('ot-m', '{}');`)), 'NO crea OT');
check(Number(val(as('authenticated', U.mec, `select count(*) from public.customers;`))) >= 2, 'lee clientes (para ver de quién es el auto)');

console.log('\nCliente (portal)');
check(val(as('authenticated', U.javiera, `select string_agg(id, ',') from public.ots;`)) === 'ot-a', 've solo sus OT');
check(val(as('authenticated', U.javiera, `select string_agg(id, ',') from public.customers;`)) === 'c-001', 've solo su ficha');
check(val(as('authenticated', U.javiera, `select string_agg(id, ',') from public.vehicles;`)) === 'v-001', 've solo sus vehículos');
r = as('authenticated', U.javiera, `insert into public.vehicles (id, data) values ('v-j', '{"plate":"AAAA-11","customerId":"c-001"}'); select 'ok';`); check(val(r) === 'ok', 'agrega un vehículo propio', r.err);
check(denied(as('authenticated', U.javiera, `insert into public.vehicles (id, data) values ('v-k', '{"plate":"BBBB-22","customerId":"c-002"}');`)), 'NO agrega un vehículo a nombre de otro');
r = as('authenticated', U.javiera, `insert into public.appointments (id, data) values ('ap-j', '{"customerId":"c-001","status":"solicitada"}'); select count(*) from public.appointments;`); check(r.ok && val(r) === '1', 'agenda una cita propia y solo ve las suyas', r.err || val(r));
check(val(as('authenticated', U.javiera, `select count(*) from public.profiles;`)) === '1', 've solo su perfil');
r = as('authenticated', U.javiera, `update public.profiles set name = 'Javiera M.' where auth_id = '${U.javiera}' returning name;`); check(val(r) === 'Javiera M.', 'edita su nombre', r.err);
check(denied(as('authenticated', U.javiera, `update public.profiles set role = 'admin' where auth_id = '${U.javiera}';`)), 'NO cambia su rol');
check(denied(as('authenticated', U.javiera, `update public.profiles set data = '{"customerId":"c-002"}' where auth_id = '${U.javiera}';`)), 'NO se cambia de ficha de cliente (customerId protegido)');
check(denied(as('authenticated', U.javiera, `insert into public.profiles (id, email, role) values ('p-x', 'x@x.cl', 'admin');`)), 'NO crea perfiles');
check(val(as('authenticated', U.javiera, `select count(*) from public.leads;`)) === '0', 'NO lee los mensajes del sitio');

console.log('\nCuenta sin perfil / desactivada');
psql(`insert into auth.users (id, email) values ('${U.otro}', 'cualquiera@spam.cl');`);
// demo-pro tiene portal: quien se registra queda como cliente; probamos además una cuenta desactivada.
psql(`update public.profiles set active = false where auth_id = '${U.mec}';`);
check(val(as('authenticated', U.mec, `select count(*) from public.ots;`)) === '0', 'mecánico desactivado ya no ve OT');
check(val(as('authenticated', U.otro, `select count(*) from public.ots;`)) === '0', 'cuenta nueva sin OT no ve OT ajenas');

console.log('\nRealtime y Storage');
r = psql(`select string_agg(tablename, ',' order by tablename) from pg_publication_tables where pubname = 'supabase_realtime';`);
check(['profiles', 'ots', 'customers', 'kv', 'activity_log'].every(t => r.out.split(',').includes(t)), 'tablas en la publicación supabase_realtime', r.out);
check(psql(`select count(*) from storage.buckets where id = 'archivos' and public;`).out === '1', 'bucket «archivos» creado');
r = as('authenticated', U.jefe, `insert into storage.objects (bucket_id, name) values ('archivos', 'x/foto.jpg'); select 'ok';`); check(val(r) === 'ok', 'el equipo sube archivos', r.err);
check(denied(as('authenticated', U.javiera, `insert into storage.objects (bucket_id, name) values ('archivos', 'x/otra.jpg');`)), 'el cliente NO sube archivos');

psql(`drop database if exists ${DB};`, 'postgres');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} pruebas OK`);
process.exit(fail ? 1 : 0);
