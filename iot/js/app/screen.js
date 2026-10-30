// Modo pantalla (TV / muro de la sala de control): KPIs gigantes, gráfico en vivo, mapa rotativo y alarmas.
import { db, guard, ROLES } from '../data/db.js';
import { ago, toast } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { tick, value, fmt, status, history, TYPES, rulesFor } from '../shared/sim.js';
import { lineSvg, siteMap } from '../shared/viz.js';
import { sevBadge, siteName } from '../shared/common.js';
import { brand } from '../shared/layout.js';

const user = guard(Object.keys(ROLES));
const tv = document.getElementById('tv');
let siteIdx = 0, rotateAt = Date.now() + 15000;

function layout() {
  tv.innerHTML = h`<div class="tv-head"><div class="row">${raw(brand('app.html'))}<span class="live-pill">EN VIVO · ACUÍCOLA FIORDO</span></div>
    <div class="row"><span class="tv-clock" data-clock></span><a class="btn btn-sm" href="app.html">Salir</a><button class="btn btn-sm" data-fs>⛶ Pantalla completa</button></div></div>
  <div class="tv-kpis">
    <div class="card tv-kpi" data-k="alarms"><span class="label">Alarmas activas</span><div class="value"></div></div>
    <div class="card tv-kpi" data-k="online"><span class="label">Sensores en línea</span><div class="value"></div></div>
    <div class="card tv-kpi" data-k="o2"><span class="label">O₂ mínimo jaulas</span><div class="value"></div></div>
    <div class="card tv-kpi" data-k="kw"><span class="label">Potencia total</span><div class="value"></div></div>
  </div>
  <div class="tv-grid">
    <div class="stack"><section class="card"><div class="chart-head"><b data-c1n></b><span class="big" data-c1v></span></div><div data-c1></div></section>
      <section class="card"><div class="chart-head"><b data-c2n></b><span class="big" data-c2v></span></div><div data-c2></div></section></div>
    <div class="stack"><section class="card"><div class="chart-head"><b data-mapn></b><span class="small muted">rota cada 15 s</span></div><div data-map></div></section>
      <section class="card"><b>Alarmas abiertas</b><div data-alarms></div></section></div>
  </div>`;
  tv.querySelector('[data-fs]').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {});
}

function paint() {
  const now = Date.now();
  const devs = db.all('devices');
  const online = devs.filter(d => !d.offline && d.status === 'activo');
  const act = db.query('alarms', a => a.status !== 'resuelta').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const k = (id, v, danger) => { const c = tv.querySelector(`[data-k="${id}"]`); c.querySelector('.value').textContent = v; c.classList.toggle('danger', !!danger); };
  const activeN = act.filter(a => a.status === 'activa').length;
  k('alarms', activeN, activeN > 0);
  k('online', `${online.length}/${devs.length}`);
  const o2 = online.filter(d => d.type === 'oxigeno').map(d => value(d, now));
  const minO2 = o2.length ? Math.min(...o2) : null;
  k('o2', minO2 == null ? '—' : minO2.toFixed(1).replace('.', ','), minO2 != null && minO2 < 5);
  k('kw', Math.round(online.filter(d => d.type === 'energia').reduce((s, d) => s + value(d, now), 0)));
  tv.querySelector('[data-clock]').textContent = new Date().toLocaleTimeString('es-CL');
  const charts = [devs.find(d => d.type === 'oxigeno' && d.anomaly) || devs.find(d => d.type === 'oxigeno'), devs.find(d => d.tag === 'camara' && d.anomaly) || devs.find(d => d.type === 'temperatura')];
  charts.forEach((d, i) => {
    if (!d) return;
    const v = value(d, now), s = status(d, v);
    tv.querySelector(`[data-c${i + 1}n]`).textContent = `${TYPES[d.type].icon} ${d.name}`;
    const big = tv.querySelector(`[data-c${i + 1}v]`); big.textContent = fmt(d, v); big.style.color = s === 'alarm' ? 'var(--danger)' : s === 'warn' ? 'var(--warning)' : '';
    tv.querySelector(`[data-c${i + 1}]`).innerHTML = lineSvg(history(d, now - 180000, now, 90), { height: 150, thresholds: rulesFor(d).filter(r => r.active).map(r => ({ value: r.threshold, label: `${r.op} ${r.threshold}` })), dec: 1 });
  });
  const sites = db.all('sites');
  if (now > rotateAt) { siteIdx++; rotateAt = now + 15000; }
  const site = sites[siteIdx % sites.length];
  if (site) {
    tv.querySelector('[data-mapn]').textContent = site.name;
    const sd = devs.filter(d => d.siteId === site.id);
    tv.querySelector('[data-map]').innerHTML = siteMap(site, db.query('zones', z => z.siteId === site.id), sd, d => status(d, value(d, now)));
  }
  tv.querySelector('[data-alarms]').innerHTML = act.length ? act.slice(0, 6).map(a => h`<div class="alarm-row">${{ __raw: true, value: sevBadge(a.severity) }}<span style="flex:1;min-width:0"><b>${a.ruleName}</b><br><span class="small muted">${db.get('devices', a.deviceId)?.name} · ${siteName(a.siteId)} · ${ago(a.createdAt)}</span></span><span class="small">${a.status}</span></div>`).join('') : '<p class="muted">Sin alarmas abiertas.</p>';
}

if (user) {
  layout(); paint();
  setInterval(() => { tick((a, d) => toast(`${a.code} · ${a.ruleName}: ${d.name}`, a.severity === 'critica' ? 'error' : 'warning', 6000)); paint(); }, 1000);
  db.subscribe(ch => { if (ch.type === 'reset') location.reload(); });
}
