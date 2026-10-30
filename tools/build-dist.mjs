// Genera una copia publicable del portafolio con el JavaScript de cada página empaquetado
// en un solo archivo (el visor de artifacts admite como máximo 511 archivos por versión).
//
//   npm i --no-save esbuild@0.24.0
//   git archive HEAD | tar -x -C /ruta/dist
//   node tools/build-dist.mjs /ruta/dist
//
// Reemplaza cada <script type="module" src="js/..."> por bundle-<página>.js y borra las carpetas js/.
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const D = path.resolve(process.argv[2] || 'dist');
const apps = fs.readdirSync(D, { withFileTypes: true })
  .filter(d => d.isDirectory() && !['assets', 'tools', '.git'].includes(d.name));
let n = 0;
for (const app of apps) {
  const dir = path.join(D, app.name);
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const page = path.join(dir, file);
    let src = fs.readFileSync(page, 'utf8');
    for (const m of [...src.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)]) {
      const out = `bundle-${path.basename(file, '.html')}.js`;
      await build({
        entryPoints: [path.join(dir, m[1])], outfile: path.join(dir, out),
        bundle: true, format: 'esm', target: 'es2022', minify: true, logLevel: 'error',
        external: ['three', 'three/*']
      });
      src = src.replace(m[0], `<script type="module" src="${out}"></script>`);
      n++;
    }
    fs.writeFileSync(page, src);
  }
  fs.rmSync(path.join(dir, 'js'), { recursive: true, force: true });
}
fs.rmSync(path.join(D, 'tools'), { recursive: true, force: true });
console.log(`${n} páginas empaquetadas`);
