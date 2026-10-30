#!/usr/bin/env node
// Graba el video de una demo del portafolio.
//
//   node tools/video/run.js automotora              → out/automotora.webm + .chapters.md + .timeline.json
//   node tools/video/run.js automotora --fast       → pausas cortas, sin video (prueba de punta a punta)
//   node tools/video/run.js automotora --preview    → video de baja calidad, codifica rápido
//   opciones: --no-video  --keep-frames  --crf=30  --port=8840  --headed-shots (capturas por capítulo)
//
// Levanta `python3 -m http.server` en la raíz del repo si el puerto no responde.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { Recorder } = require('./lib/recorder');
const { Director } = require('./lib/director');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const name = args.find(a => !a.startsWith('--'));
if (!name) { console.error('Uso: node tools/video/run.js <app> [--fast] [--preview] [--no-video]'); process.exit(1); }
const tourFile = path.join(__dirname, 'tours', name + '.js');
if (!fs.existsSync(tourFile)) { console.error(`No existe ${tourFile}`); process.exit(1); }

const fast = flag('fast');
const video = !flag('no-video') && !fast;
const port = +opt('port', 8840);
const outDir = path.join(__dirname, 'out');
const tmpDir = path.join(outDir, `.frames-${name}`);

const ping = () => new Promise(res => { const r = http.get(`http://localhost:${port}/`, x => { x.resume(); res(true); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); });
async function ensureServer() {
  if (await ping()) return null;
  const p = spawn('python3', ['-m', 'http.server', String(port)], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await ping()); i++) await new Promise(r => setTimeout(r, 150));
  if (!(await ping())) throw new Error('No se pudo levantar el servidor estático');
  return p;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const tour = require(tourFile);
  const server = await ensureServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'es-CL', timezoneId: 'America/Santiago',
    permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true
  });
  const page = await context.newPage();
  const base = `http://localhost:${port}/${tour.meta.dir}/`;
  const recorder = video ? new Recorder(page, { tmpDir }) : null;
  const d = new Director({ page, base, recorder, outDir, name, speed: fast ? .3 : 1 });
  await d.init();
  if (recorder) await recorder.start();
  const t0 = Date.now();
  let failed = null;
  try { await tour.run(d, { args }); }
  catch (e) { failed = e; console.error('\n✖ ' + e.message); }
  const rec = recorder ? await recorder.stop() : null;
  const outs = d.writeOutputs(tour.meta.youtube);
  await browser.close();
  if (server) server.kill();
  console.log(`\nRecorrido: ${((Date.now() - t0) / 1000).toFixed(0)} s reales · ${d.t().toFixed(0)} s de video`);
  console.log('Capítulos:\n  ' + outs.chapters.join('\n  '));
  console.log(`QA: ${outs.qa.length} incidencia(s)` + (outs.qa.length ? ` (ver out/${name}.timeline.md)` : ''));
  if (rec) console.log(`Cuadros: ${rec.frames} (${rec.mb.toFixed(0)} MB JPEG)`);
  if (failed && !flag('encode-on-fail')) { if (recorder && !flag('keep-frames')) recorder.cleanup(); process.exit(1); }
  if (recorder) {
    const out = path.join(outDir, `${name}.webm`);
    const t1 = Date.now();
    process.stdout.write('Codificando VP9…');
    await recorder.encode(out, { crf: +opt('crf', 30), preview: flag('preview'), onProgress: s => process.stdout.write(`\rCodificando VP9… ${s.toFixed(0)} s / ${rec.duration.toFixed(0)} s`) });
    console.log(`\nListo en ${((Date.now() - t1) / 1000).toFixed(0)} s → ${path.relative(ROOT, out)}`);
    try {
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=width,height,codec_name,r_frame_rate', '-of', 'json', out]).toString());
      const s = probe.streams[0], f = probe.format;
      console.log(`ffprobe: ${s.codec_name} ${s.width}×${s.height} @ ${s.r_frame_rate} · ${(+f.duration).toFixed(1)} s · ${(f.size / 1048576).toFixed(1)} MB`);
    } catch (e) { console.warn('ffprobe no disponible'); }
    if (!flag('keep-frames')) recorder.cleanup();
  }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
