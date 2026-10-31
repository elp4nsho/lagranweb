#!/usr/bin/env node
// Servidor estático mínimo que imita a Netlify / Cloudflare Pages: aplica el archivo _headers (incluida
// la CSP) y responde 404.html con estado 404. Sirve para probar un build tal como quedará publicado.
//
//   node tools/serve-dist.mjs dist/demo-pro [--port=8890]
import http from 'http';
import fs from 'fs';
import path from 'path';

const dir = path.resolve(process.argv[2] || '.');
const port = +(process.argv.find(a => a.startsWith('--port=')) || '--port=8890').split('=')[1];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.toml': 'text/plain', '.webp': 'image/webp', '.ico': 'image/x-icon' };

// _headers: bloques "ruta-con-*" seguidos de líneas indentadas "Nombre: valor".
function parseHeaders() {
  const f = path.join(dir, '_headers');
  if (!fs.existsSync(f)) return [];
  const rules = [];
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), headers: {} });
    else { const i = line.indexOf(':'); rules.at(-1).headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  return rules;
}
const rules = parseHeaders();
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(dir, p);
  let status = 200;
  if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { file = path.join(dir, '404.html'); status = 404; p = '/404.html'; }
  for (const r of rules) if (r.re.test(p)) for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Sirviendo ${dir} en http://localhost:${port}`));
