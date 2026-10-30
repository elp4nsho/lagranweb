// Grabación de alta calidad con CDP Page.startScreencast (JPEG por cuadro con marca de tiempo)
// y codificación posterior con ffmpeg a WebM VP9 a 30 fps constantes.
//
// Por qué no recordVideo de Playwright: graba a bitrate bajo (VP8 ~1 Mbps) y se nota en texto
// chico. Aquí guardamos cada cuadro que pinta Chromium (calidad JPEG 92) y su hora exacta;
// cuando la página está quieta Chromium no manda cuadros, así que el último se mantiene en
// pantalla el tiempo que corresponda (demuxer concat con duraciones) y luego -fps_mode cfr
// lo convierte en 30 fps reales.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class Recorder {
  /**
   * @param {import('playwright').Page} page
   * @param {{ tmpDir: string, width?: number, height?: number, quality?: number, minGap?: number }} opts
   */
  constructor(page, { tmpDir, width = 1920, height = 1080, quality = 92, minGap = 1 / 45 } = {}) {
    this.page = page;
    this.tmpDir = tmpDir;
    this.width = width; this.height = height; this.quality = quality;
    this.minGap = minGap;          // cuadros más juntos que esto reemplazan al anterior (tope ~45 fps)
    this.frames = [];              // { file, t } con t en segundos de video (descontando pausas)
    this.writes = new Set();
    this.paused = false;
    this.pausedTotal = 0;
    this.pauseStart = 0;
    this.pendingDuringPause = null;
    this.started = false;
    this.seq = 0;
    this.bytes = 0;
  }

  async start() {
    fs.mkdirSync(this.tmpDir, { recursive: true });
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on('Page.screencastFrame', f => this._onFrame(f));
    this.t0 = Date.now() / 1000;
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: this.quality, maxWidth: this.width, maxHeight: this.height, everyNthFrame: 1 });
    this.started = true;
  }

  /** Segundos de video transcurridos (lo que se usa para la línea de tiempo / capítulos). */
  now() {
    const wall = Date.now() / 1000;
    return wall - this.t0 - this.pausedTotal - (this.paused ? wall - this.pauseStart : 0);
  }

  _onFrame(f) {
    this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    if (!this.started) return;
    const wall = f.metadata.timestamp || Date.now() / 1000;
    if (this.paused) { this.pendingDuringPause = f.data; return; }
    const t = Math.max(0, wall - this.t0 - this.pausedTotal);
    this._store(f.data, t);
  }

  _store(b64, t) {
    const buf = Buffer.from(b64, 'base64');
    const last = this.frames[this.frames.length - 1];
    // Siempre un archivo nuevo (nunca dos escrituras simultáneas al mismo archivo).
    const file = path.join(this.tmpDir, `f${String(++this.seq).padStart(6, '0')}.jpg`);
    if (last && t - last.t < this.minGap) last.file = file;          // reemplaza el cuadro muy cercano
    else this.frames.push({ file, t: Math.max(t, last ? last.t + 0.001 : 0) });
    this.bytes += buf.length;
    const w = fs.promises.writeFile(file, buf).finally(() => this.writes.delete(w));
    this.writes.add(w);
  }

  /** Corta la grabación (lo que pase en medio no aparece en el video). */
  pause() { if (this.paused) return; this.paused = true; this.pauseStart = Date.now() / 1000; this.pendingDuringPause = null; }
  resume() {
    if (!this.paused) return;
    this.pausedTotal += Date.now() / 1000 - this.pauseStart;
    this.paused = false;
    if (this.pendingDuringPause) this._store(this.pendingDuringPause, this.now());
    this.pendingDuringPause = null;
  }

  async stop() {
    if (!this.started) return;
    this.endT = this.now();
    this.started = false;
    try { await this.cdp.send('Page.stopScreencast'); } catch (e) { /* página cerrada */ }
    await Promise.all([...this.writes]);
    return { frames: this.frames.length, duration: this.endT, mb: this.bytes / 1048576 };
  }

  /** Escribe la lista para el demuxer concat (cada cuadro con su duración real). */
  _concatList() {
    const lines = ['ffconcat version 1.0'];
    const fr = this.frames;
    for (let i = 0; i < fr.length; i++) {
      const next = i + 1 < fr.length ? fr[i + 1].t : this.endT;
      const d = Math.max(0.001, next - fr[i].t);
      lines.push(`file '${path.basename(fr[i].file)}'`, `duration ${d.toFixed(4)}`);
    }
    // El demuxer concat ignora la duración del último archivo si no se repite.
    if (fr.length) lines.push(`file '${path.basename(fr[fr.length - 1].file)}'`);
    const list = path.join(this.tmpDir, 'frames.ffconcat');
    fs.writeFileSync(list, lines.join('\n'));
    return list;
  }

  /**
   * Codifica a WebM VP9, 30 fps constantes, yuv420p, sin audio.
   * @param {string} out  ruta del .webm
   * @param {{ crf?: number, preview?: boolean, fps?: number, onProgress?: (s:number)=>void }} o
   */
  encode(out, { crf = 30, preview = false, fps = 30, onProgress } = {}) {
    if (!this.frames.length) throw new Error('No hay cuadros grabados');
    const list = this._concatList();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const speed = preview ? ['-deadline', 'realtime', '-cpu-used', '8'] : ['-deadline', 'good', '-cpu-used', '2'];
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-stats',
      '-f', 'concat', '-safe', '0', '-i', list,
      // JPEG = rango completo; VP9 web = rango limitado (tv). Convertimos explícitamente.
      '-vf', `scale=${this.width}:${this.height}:in_range=full:out_range=tv:flags=lanczos,format=yuv420p`,
      '-fps_mode', 'cfr', '-r', String(fps),
      '-c:v', 'libvpx-vp9', '-crf', String(preview ? Math.max(crf, 36) : crf), '-b:v', '0',
      '-row-mt', '1', '-tile-columns', '2', '-threads', '4', '-g', String(fps * 10), ...speed,
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-an', out];
    return new Promise((resolve, reject) => {
      const p = spawn('ffmpeg', args, { cwd: this.tmpDir });
      let err = '';
      p.stderr.on('data', d => {
        const s = d.toString(); err += s;
        const m = s.match(/time=(\d+):(\d+):([\d.]+)/);
        if (m && onProgress) onProgress(+m[1] * 3600 + +m[2] * 60 + +m[3]);
      });
      p.on('close', code => code === 0 ? resolve(out) : reject(new Error('ffmpeg falló:\n' + err.slice(-2000))));
    });
  }

  /** Borra los cuadros temporales. */
  cleanup() { fs.rmSync(this.tmpDir, { recursive: true, force: true }); }
}

module.exports = { Recorder };
