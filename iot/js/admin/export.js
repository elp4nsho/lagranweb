// Exportación de datos a CSV: dispositivos, alarmas, órdenes, energía y telemetría histórica.
import { db, userName } from '../data/db.js';
import { toast } from '../../../assets/core/ui.js';
import { h } from '../shared/h.js';
import { history, dailyKwh, TYPES } from '../shared/sim.js';
import { pageHead, csv, zoneName, siteName, devName } from '../shared/common.js';

export function render(el, ctx) {
  const devs = db.all('devices');
  el.innerHTML = pageHead('Exportar datos', 'Descarga datos en CSV (separador ";", UTF-8) para Excel o BI.') + h`
  <div class="grid-2" style="align-items:start">
    <section class="card stack"><h3 style="margin:0">Telemetría histórica</h3>
      <div class="field"><label for="xd">Dispositivo</label><select class="select" id="xd">${devs.map(d => h`<option value="${d.id}">${d.name} (${d.code})</option>`)}</select></div>
      <div class="grid-2"><div class="field"><label for="xr">Rango</label><select class="select" id="xr"><option value="3600000">Última hora</option><option value="86400000" selected>Últimas 24 h</option><option value="604800000">7 días</option><option value="2592000000">30 días</option></select></div>
      <div class="field"><label for="xn">Resolución</label><select class="select" id="xn"><option value="60">60 puntos</option><option value="288" selected>288 puntos</option><option value="1000">1.000 puntos</option></select></div></div>
      <button class="btn btn-primary" data-tel>⬇ Descargar telemetría</button></section>
    <section class="card stack"><h3 style="margin:0">Datos maestros y operación</h3>
      ${[['devices', 'Dispositivos', `${devs.length} registros`], ['alarms', 'Alarmas', `${db.count('alarms')} registros`], ['orders', 'Órdenes de trabajo', `${db.count('orders')} registros`], ['energy', 'Energía diaria (30 días)', 'kWh por medidor'], ['shifts', 'Bitácora de turno', `${db.count('shifts')} registros`]].map(([k, l, s]) => h`<div class="row between"><span><b>${l}</b><br><span class="small muted">${s}</span></span><button class="btn btn-sm" data-x="${k}">⬇ CSV</button></div>`)}
    </section>
  </div>`;
  el.querySelector('[data-tel]').onclick = () => {
    const d = db.get('devices', el.querySelector('#xd').value), span = +el.querySelector('#xr').value, n = +el.querySelector('#xn').value, now = Date.now();
    csv(`telemetria-${d.code}.csv`, history(d, now - span, now, n).map(p => ({ fecha: new Date(p.t).toISOString(), dispositivo: d.code, variable: TYPES[d.type].label, unidad: TYPES[d.type].unit, valor: p.v == null ? '' : p.v.toFixed(3) })));
    db.log('exportar', `${ctx.user.name} exportó telemetría de ${d.code}`, ctx.user.id);
  };
  const SETS = {
    devices: () => devs.map(d => ({ codigo: d.code, nombre: d.name, tipo: d.type, sitio: siteName(d.siteId), zona: zoneName(d.zoneId), modelo: d.model, firmware: d.firmware, bateria: d.battery ?? '', estado: d.status })),
    alarms: () => db.all('alarms').map(a => ({ codigo: a.code, fecha: a.createdAt, regla: a.ruleName, dispositivo: devName(a.deviceId), valor: a.value, umbral: `${a.op} ${a.threshold}`, severidad: a.severity, estado: a.status, asignada: userName(a.assignee), resuelta: a.resolvedAt || '' })),
    orders: () => db.all('orders').map(o => ({ ot: o.code, trabajo: o.title, dispositivo: devName(o.deviceId), prioridad: o.priority, estado: o.status, responsable: userName(o.assignee), vence: o.due })),
    energy: () => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); return Array.from({ length: 30 }, (_, i) => d0.getTime() - (30 - i) * 864e5).flatMap(day => devs.filter(d => d.type === 'energia').map(m => ({ fecha: new Date(day).toISOString().slice(0, 10), medidor: m.name, kwh: dailyKwh(m, day) }))); },
    shifts: () => db.all('shifts').map(s => ({ fecha: s.at, turno: s.shift, sitio: siteName(s.siteId), autor: userName(s.author), texto: s.text })),
  };
  el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { csv(`${b.dataset.x}-sentinela.csv`, SETS[b.dataset.x]()); db.log('exportar', `${ctx.user.name} exportó ${b.dataset.x}`, ctx.user.id); });
  void toast;
}
