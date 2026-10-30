// Resumen de administración: estado de la flota, alarmas de 30 días, firmware y volumen de datos.
import { db, userName } from '../data/db.js';
import { num, ago, barChart, donutChart, lineChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, SEVERITY } from '../shared/sim.js';
import { pageHead } from '../shared/common.js';

export function render(el, ctx) {
  const devs = db.all('devices'), alarms = db.all('alarms');
  const latest = [...db.all('firmware')].filter(f => f.channel === 'estable').sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]?.version;
  const since = Date.now() - 30 * 864e5;
  const a30 = alarms.filter(a => new Date(a.createdAt) >= since);
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const perDay = Array.from({ length: 30 }, (_, i) => { const s = day0.getTime() - (29 - i) * 864e5; return { label: String(new Date(s).getDate()), value: alarms.filter(a => { const t = new Date(a.createdAt).getTime(); return t >= s && t < s + 864e5; }).length }; });
  const sev = Object.keys(SEVERITY).map(k => ({ label: SEVERITY[k][0], value: a30.filter(a => a.severity === k).length }));
  const fw = {}; devs.forEach(d => fw[d.firmware] = (fw[d.firmware] || 0) + 1);
  const msgs = Array.from({ length: 14 }, (_, i) => { const d = new Date(day0.getTime() - (13 - i) * 864e5); return { label: String(d.getDate()), value: Math.round(devs.filter(x => !x.offline).length * 86400 / 1000 * (0.97 + ((i * 37) % 7) / 100)) }; });
  const mttr = (() => { const r = alarms.filter(a => a.resolvedAt); return r.length ? Math.round(r.reduce((s, a) => s + (new Date(a.resolvedAt) - new Date(a.createdAt)), 0) / r.length / 6e4) : 0; })();
  const log = db.getValue('_log', []).slice(0, 8);
  el.innerHTML = pageHead('Resumen', `Hola ${ctx.user.name.split(' ')[0]} · flota de Acuícola Fiordo`) + h`
  <div class="dash">
  <div class="kpis d-kpis">
    <div class="card"><div class="stat"><span class="label">Dispositivos</span><span class="value">${devs.length}</span><span class="small muted">${devs.filter(d => d.offline).length} sin conexión · ${devs.filter(d => d.status === 'mantenimiento').length} en mantención</span></div></div>
    <div class="card"><div class="stat"><span class="label">Sitios / zonas</span><span class="value">${db.count('sites')} / ${db.count('zones')}</span><span class="small muted">Los Lagos, Chile</span></div></div>
    <div class="card"><div class="stat"><span class="label">Firmware al día (${latest})</span><span class="value">${Math.round(devs.filter(d => d.firmware === latest).length / Math.max(1, devs.length) * 100)}%</span><span class="small muted">${devs.filter(d => d.firmware !== latest).length} por actualizar</span></div></div>
    <div class="card"><div class="stat"><span class="label">Batería baja (&lt;20%)</span><span class="value">${devs.filter(d => d.battery != null && d.battery < 20).length}</span><span class="small muted">reemplazar en próxima ronda</span></div></div>
    <div class="card"><div class="stat"><span class="label">Alarmas 30 días</span><span class="value">${a30.length}</span><span class="small muted">MTTR ${mttr} min</span></div></div>
  </div>
  <div class="grid-2">
    <section class="card d-al"><h3>Alarmas por día (30 días)</h3>${raw(barChart(perDay))}</section>
    <section class="card d-msg"><h3>Mensajes de telemetría por día (miles)</h3>${raw(lineChart(msgs, { format: v => num(v) + ' mil' }))}</section>
    <section class="card d-sev"><h3>Alarmas por severidad</h3>${raw(donutChart(sev, { label: String(a30.length) }))}</section>
    <section class="card d-fw"><h3>Versiones de firmware</h3>${raw(donutChart(Object.entries(fw).sort().map(([label, value]) => ({ label: 'v' + label, value })), { label: String(devs.length) }))}
      <h3 class="mt">Por tipo</h3>${raw(barChart(Object.entries(TYPES).map(([k, t]) => ({ label: t.label.split(' ')[0], value: devs.filter(d => d.type === k).length })), { height: 140 }))}</section>
  </div>
  <section class="card d-act"><div class="row between"><h3 style="margin:0">Actividad reciente</h3><a class="small" href="#/auditoria">Auditoría →</a></div>
    <ul class="list mt">${log.map(l => h`<li><span class="ic">📌</span><span class="main"><b>${l.detail}</b><small>${l.action} · ${l.user ? userName(l.user) : 'Sistema'} · ${ago(l.at)}</small></span></li>`)}</ul></section>
  </div>`;
}
