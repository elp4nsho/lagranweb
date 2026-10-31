#!/usr/bin/env node
// Datos iniciales para Supabase: genera clients/<slug>/supabase/seed.sql con
//   1) las cuentas del cliente (accounts → profiles; entran por enlace mágico o con la contraseña que
//      definan en Supabase Auth: el trigger las liga por correo),
//   2) los catálogos de los módulos activos (servicios, repuestos, proveedores…),
//   3) los textos del sitio (kv.settings) desde la ficha del cliente,
//   4) lo que haya en CSV: <carpeta>/<coleccion>.csv (customers.csv, vehicles.csv, parts.csv…; users.csv → perfiles).
//
//   node tools/supabase-import.mjs demo-pro [--csv=clients/demo-pro/supabase/csv] [--no-catalog] [--out=…]
//   psql "$DATABASE_URL" -f clients/demo-pro/supabase/seed.sql      (o pegarlo en el SQL Editor)
//
// CSV: primera fila = nombres de campo del kernel (name, rut, phone, customerId…). Columna id opcional
// (si falta se genera estable a partir del contenido). Números y true/false se convierten; [..] o {..} = JSON.
// Idempotente: on conflict (id) actualiza.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadClient, tableFor } from './supabase-schema.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
if (!slug) { console.error('Uso: node tools/supabase-import.mjs <slug> [--csv=carpeta]'); process.exit(1); }

export function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',' || ch === ';') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(c => c !== '')) rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell); if (row.some(c => c !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), conv(r[i] ?? '')])));
}
function conv(v) {
  const s = v.trim();
  if (s === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s)) return Number(s);
  if (s === 'true' || s === 'false') return s === 'true';
  if (/^[[{]/.test(s)) { try { return JSON.parse(s); } catch (e) {} }
  return s;
}
const lit = v => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const jsonLit = o => `${lit(JSON.stringify(o))}::jsonb`;
const stableId = (prefix, o) => prefix + crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 10);

const ctx = await loadClient(slug);
const { C, active, ids, merged } = ctx;
const out = [`-- Datos iniciales para ${C.slug} (generado por tools/supabase-import.mjs el ${new Date().toISOString().slice(0, 10)})`, 'begin;', ''];
const counts = {};
const rowSQL = (col, r) => {
  const { id, createdAt, updatedAt, ...data } = r;
  return `insert into public.${tableFor(col)} (id, data, created_at) values (${lit(id)}, ${jsonLit(data)}, ${createdAt ? lit(createdAt) : 'now()'}) on conflict (id) do update set data = excluded.data;`;
};
const profileSQL = u => `insert into public.profiles (id, email, role, name, active, data) values (${lit(u.id)}, lower(${lit(u.email)}), ${lit(u.role)}, ${lit(u.name || '')}, ${u.active === false ? 'false' : 'true'}, ${jsonLit(Object.fromEntries(Object.entries(u).filter(([k]) => !['id', 'email', 'role', 'name', 'active', 'password', 'demo', 'authId'].includes(k))))}) on conflict (id) do update set role = excluded.role, name = excluded.name, active = excluded.active, data = excluded.data;`;

// 1) Cuentas
out.push('-- Cuentas del equipo (sin contraseña: se crean/ligan en Supabase Auth por correo)');
for (const a of C.accounts || []) { out.push(profileSQL({ id: a.id || 'u-' + a.email.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...a })); counts.profiles = (counts.profiles || 0) + 1; }

// 2) Catálogos
if (!args.includes('--no-catalog')) {
  const { rng } = await import(pathToFileURL(path.join(ROOT, 'assets/core/db.js')));
  const data = {};
  const keep = new Set(active.flatMap(m => m.catalog || []));
  for (const m of active) { const part = m.seed ? m.seed({ has: id => ids.includes(id), data, rng, mode: 'production', client: C }) || {} : {}; for (const [k, v] of Object.entries(part)) data[k] = Array.isArray(v) && Array.isArray(data[k]) ? [...data[k], ...v] : v; }
  out.push('', '-- Catálogos de los módulos activos');
  for (const col of keep) for (const r of data[col] || []) { out.push(rowSQL(col, r)); counts[col] = (counts[col] || 0) + 1; }
}

// 3) Textos del sitio
const settings = { ...merged.settings, name: C.brand.name, short: C.brand.short, ...(C.brand.tagline ? { tagline: C.brand.tagline } : {}), ...Object.fromEntries(['phone', 'whatsapp', 'email', 'address', 'hours'].filter(k => C.contact?.[k]).map(k => [k, C.contact[k]])), ...(C.settings || {}) };
out.push('', '-- Textos del sitio (se editan luego en Configuración)', `insert into public.kv (key, value) values ('settings', ${jsonLit(settings)}) on conflict (key) do nothing;`);

// 4) CSV
const csvDir = opt('csv', null);
if (csvDir) {
  const dir = path.resolve(csvDir);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.csv')).sort((a, b) => (a === 'users.csv' ? -1 : b === 'users.csv' ? 1 : 0))) {
    const col = path.basename(f, '.csv');
    const rows = parseCSV(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (col !== 'users' && !merged.collections[col]) { console.warn(`  ⚠ ${f}: la colección "${col}" no está en los módulos activos; se omite`); continue; }
    out.push('', `-- ${f} (${rows.length} filas)`);
    for (const r of rows) {
      if (col === 'users') { if (!r.email || !r.role) { console.warn(`  ⚠ users.csv: fila sin email/role`); continue; } out.push(profileSQL({ id: r.id || 'u-' + r.email.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...r })); }
      else out.push(rowSQL(col, { ...r, id: r.id || stableId(col.slice(0, 2) + '-', r) }));
      counts[col] = (counts[col] || 0) + 1;
    }
  }
}
out.push('', 'commit;', '');
const file = path.resolve(opt('out', path.join(ROOT, 'clients', slug, 'supabase', 'seed.sql')));
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, out.join('\n'));
console.log(`✓ ${path.relative(ROOT, file)} · ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
