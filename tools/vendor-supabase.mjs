#!/usr/bin/env node
// Empaqueta @supabase/supabase-js como un único módulo ES local (assets/core/vendor/supabase.js),
// para no depender de un CDN en producción ni en desarrollo.
//
//   cd tools && npm i && node vendor-supabase.mjs
//
// Solo lo carga el adaptador `supabase` (assets/core/store/supabase.js), y build-client lo copia
// únicamente a los clientes con backend: { kind: 'supabase' }.
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../assets/core/vendor/supabase.js');
const pkg = JSON.parse(fs.readFileSync(path.join(HERE, 'node_modules/@supabase/supabase-js/package.json'), 'utf8'));
await build({
  stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: HERE, loader: 'js' },
  outfile: OUT, bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, legalComments: 'none', logLevel: 'error',
  banner: { js: `// @supabase/supabase-js ${pkg.version} (MIT, © Supabase) empaquetado con tools/vendor-supabase.mjs. No editar a mano.` }
});
console.log(`${path.relative(process.cwd(), OUT)} · supabase-js ${pkg.version} · ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
