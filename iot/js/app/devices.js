// Dispositivos: listado con filtros y ficha con historial de telemetría por rango.
import { db, userName } from '../data/db.js';
import { ago, date, toast, formModal, dateTime } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, value, fmt, status, history, rulesFor, STATUS_COLOR } from '../shared/sim.js';
import { lineSvg } from '../shared/viz.js';
import { pageHead, table, csv, selectFilter, stBadge, sevBadge, alarmBadge, zoneName, siteName } from '../shared/common.js';

const st = { site: '', type: '', status: '', range: '1h' };
const RANGES = { '15m': [15 * 6e4, 'Últimos 15 min'], '1h': [36e5, 'Última hora'], '24h': [864e5, 'Últimas 24 h'], '7d': [7 * 864e5, '7 días'], '30d': [30 * 864e5, '30 días'] };

export function render(el, ctx) {
  if (ctx.params.id) return detail(el, ctx);
  const now = Date.now();
  const rows = db.all('devices').map(d => { const v = value(d, now); return { ...d, v, st: status(d, v), zone: zoneName(d.zoneId), siteN: siteName(d.siteId), bat: d.battery ?? 101 }; })
    .filter(d => (!st.site || d.siteId === st.site) && (!st.type || d.type === st.type) && (!st.status || d.st === st.status));
  el.innerHTML = pageHead('Dispositivos', `${db.count('devices')} sensores en ${db.count('sites')} sitios`, '<button class="btn btn-sm" data-csv>⬇ CSV</button>') +
    `<div class="card filters">${selectFilter('fs', 'Sitio', db.all('sites').map(s => [s.id, s.name]), st.site)}${selectFilter('ft', 'Tipo', Object.entries(TYPES).map(([k, t]) => [k, t.label]), st.type)}${selectFilter('fe', 'Estado', [['ok', 'Normal'], ['warn', 'Precaución'], ['alarm', 'En alarma'], ['offline', 'Sin conexión'], ['maint', 'Mantención']], st.status)}</div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, pageSize: 12, search: d => `${d.code} ${d.name} ${d.zone} ${d.model}`,
    columns: [
      { key: 'name', label: 'Dispositivo', render: d => h`<b>${TYPES[d.type].icon} ${d.name}</b><br><span class="small muted mono">${d.code}</span>` },
      { key: 'zone', label: 'Ubicación', render: d => h`${d.zone}<br><span class="small muted">${d.siteN}</span>` },
      { key: 'v', label: 'Lectura', render: d => h`<b class="mono">${fmt(d, d.v)}</b>` },
      { key: 'bat', label: 'Batería', render: d => d.battery == null ? raw('<span class="muted small">Red</span>') : raw(`<span class="badge badge-${d.battery < 20 ? 'danger' : d.battery < 40 ? 'warning' : 'success'}">${d.battery}%</span>`) },
      { key: 'firmware', label: 'Firmware', render: d => h`<span class="mono">${d.firmware}</span>` },
      { key: 'st', label: 'Estado', render: d => raw(stBadge(d.st)) },
    ],
    onRow: d => ctx.go('/dispositivos/' + d.id),
  });
  [['#fs', 'site'], ['#ft', 'type'], ['#fe', 'status']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; ctx.refresh(); });
  el.querySelector('[data-csv]').onclick = () => csv('dispositivos-sentinela.csv', rows.map(d => ({ codigo: d.code, nombre: d.name, tipo: d.type, sitio: d.siteN, zona: d.zone, modelo: d.model, firmware: d.firmware, bateria: d.battery ?? '', lectura: d.v == null ? '' : d.v.toFixed(2), estado: d.st })));
}

function detail(el, ctx) {
  const d = db.get('devices', ctx.params.id);
  if (!d) { el.innerHTML = '<div class="empty">Dispositivo no encontrado. <a href="#/dispositivos">Volver</a></div>'; return; }
  const t = TYPES[d.type];
  const rules = rulesFor(d);
  const alarms = db.query('alarms', a => a.deviceId === d.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orders = db.query('orders', o => o.deviceId === d.id);
  el.innerHTML = h`<div class="page-head"><div><a href="#/dispositivos" class="small">← Dispositivos</a><h1>${t.icon} ${d.name}</h1><p class="muted" style="margin:4px 0 0">${d.code} · ${zoneName(d.zoneId)} · ${siteName(d.siteId)}</p></div>
    <div class="row">${ctx.can('app.ordenes') ? raw('<button class="btn btn-primary btn-sm" data-wo>+ Orden de trabajo</button>') : ''}<a class="btn btn-sm" href="#/mapa">Ver en mapa</a></div></div>
  <div class="kpis">
    <div class="card"><div class="stat"><span class="label">Lectura actual</span><span class="big-value" data-live></span><span data-livest></span></div></div>
    <div class="card"><dl class="kv"><dt>Modelo</dt><dd>${d.model}</dd><dt>Firmware</dt><dd class="mono">${d.firmware}</dd><dt>Instalado</dt><dd>${date(d.installedAt)}</dd><dt>Estado</dt><dd>${d.status}</dd></dl></div>
    <div class="card"><dl class="kv"><dt>Batería</dt><dd>${d.battery == null ? 'Red eléctrica' : raw(`${d.battery}% <div class="progress" style="margin-top:4px"><i style="--v:${d.battery}%"></i></div>`)}</dd><dt>Última conexión</dt><dd>${d.offline ? ago(d.lastSeen) : 'en línea (hace 1 s)'}</dd><dt>Señal</dt><dd>${d.offline ? '—' : 'LoRaWAN · −' + (88 + (d.code.length * 7) % 20) + ' dBm'}</dd></dl></div>
  </div>
  ${d.offline ? raw('<div class="notice danger">El dispositivo no reporta datos. Revisa la alimentación o el gateway LoRaWAN de la zona.</div>') : ''}
  <section class="card"><div class="chart-head"><h3 style="margin:0">Historial de telemetría</h3><div class="chips">${Object.entries(RANGES).map(([k, [, l]]) => h`<button class="chip ${st.range === k ? 'active' : ''}" data-range="${k}">${l}</button>`)}</div></div>
    <div data-chart></div><div class="row small muted" data-stats></div></section>
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Reglas de alarma</h3><ul class="list">${rules.map(r => h`<li><span class="main"><b>${r.name}</b><small>${t.label} ${r.op} ${r.threshold} ${t.unit} durante ${r.duration} s · notifica: ${r.notify}</small></span>${raw(sevBadge(r.severity))}${raw(r.active ? '' : '<span class="badge">Inactiva</span>')}</li>`)}</ul>${!rules.length ? raw('<p class="muted">Sin reglas.</p>') : ''}<a class="small" href="#/reglas">Gestionar reglas →</a></section>
    <section class="card"><h3>Alarmas y órdenes</h3><ul class="list">${alarms.slice(0, 6).map(a => h`<li class="clickable" data-al="${a.id}"><span class="main"><b>${a.code} · ${a.ruleName}</b><small>${dateTime(a.createdAt)} · valor ${a.value}</small></span>${raw(alarmBadge(a.status))}</li>`)}
      ${orders.map(o => h`<li><span class="main"><b>${o.code} · ${o.title}</b><small>${o.status} · ${userName(o.assignee)}</small></span></li>`)}</ul>${!alarms.length && !orders.length ? raw('<p class="muted">Sin historial.</p>') : ''}</section>
  </div>`;

  const th = rules.filter(r => r.active).map(r => ({ value: r.threshold, label: `${r.op} ${r.threshold}` }));
  let lastChart = 0;
  const paint = force => {
    const now = Date.now(), v = value(d, now), s = status(d, v);
    el.querySelector('[data-live]').textContent = fmt(d, v);
    el.querySelector('[data-live]').style.color = STATUS_COLOR[s];
    el.querySelector('[data-livest]').innerHTML = stBadge(s);
    if (force || (st.range === '15m' || st.range === '1h') && now - lastChart > 4000) {
      lastChart = now;
      const span = RANGES[st.range][0];
      const pts = history(d, now - span, now, st.range === '30d' ? 240 : 180);
      const longFmt = span > 864e5 ? (x => new Date(x).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })) : (x => new Date(x).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
      el.querySelector('[data-chart]').innerHTML = lineSvg(pts, { height: 220, thresholds: th, dec: t.dec ? 1 : 0, unit: t.unit, timeFmt: longFmt });
      const vals = pts.map(p => p.v).filter(x => x != null);
      el.querySelector('[data-stats]').innerHTML = vals.length ? `<span>Mín <b>${fmt(d, Math.min(...vals))}</b></span><span>Máx <b>${fmt(d, Math.max(...vals))}</b></span><span>Promedio <b>${fmt(d, vals.reduce((a, b) => a + b, 0) / vals.length)}</b></span><span>${pts.length} muestras</span>` : 'Sin datos en el rango';
    }
  };
  paint(true);
  ctx.every(() => paint(false));
  el.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { st.range = b.dataset.range; el.querySelectorAll('[data-range]').forEach(x => x.classList.toggle('active', x === b)); paint(true); });
  el.querySelectorAll('[data-al]').forEach(li => li.onclick = () => ctx.go('/alarmas/' + li.dataset.al));
  el.querySelector('[data-wo]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Nueva orden de trabajo', fields: [{ name: 'title', label: 'Trabajo a realizar', required: true, value: `Revisión ${d.name}` }, { name: 'priority', label: 'Prioridad', type: 'select', options: ['alta', 'media', 'baja'], value: 'media' }, { name: 'assignee', label: 'Responsable', type: 'select', options: db.query('users', u => u.active !== false && u.role !== 'lectura').map(u => [u.id, u.name]) }, { name: 'due', label: 'Fecha límite', type: 'date', value: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) }] });
    if (!v) return;
    const o = db.insert('orders', { code: `OT-${1500 + db.count('orders')}`, ...v, deviceId: d.id, alarmId: null, status: 'abierta', checklist: [{ text: 'Bloqueo y etiquetado (LOTO)', done: false }, { text: 'Ejecutar trabajo', done: false }, { text: 'Prueba de funcionamiento', done: false }], notes: '' });
    db.log('orden', `${ctx.user.name} creó ${o.code}: ${v.title}`, ctx.user.id);
    toast(`${o.code} creada`, 'success');
  });
}
