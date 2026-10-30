// Panel en vivo: KPIs, medidores y gráficos que se actualizan cada segundo.
import { db } from '../data/db.js';
import { ago } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, value, fmt, status, history, rulesFor } from '../shared/sim.js';
import { lineSvg, gauge } from '../shared/viz.js';
import { pageHead, sevBadge, alarmBadge, siteName } from '../shared/common.js';

const RANGE = { temperatura: null, oxigeno: [0, 12], ph: [5, 9], energia: [0, 500], vibracion: [0, 12] };
const st = { sel: {}, site: '', window: 60 };

export function render(el, ctx) {
  const sites = db.all('sites');
  const all = db.all('devices').filter(d => !st.site || d.siteId === st.site);
  const byType = Object.keys(TYPES).map(t => [t, all.filter(d => d.type === t)]).filter(([, l]) => l.length);
  byType.forEach(([t, list]) => { if (!list.find(d => d.id === st.sel[t])) st.sel[t] = (list.find(d => d.anomaly) || list[0]).id; });
  const active = db.query('alarms', a => a.status !== 'resuelta' && (!st.site || a.siteId === st.site)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  el.innerHTML = pageHead('Panel en vivo', 'Lecturas simuladas cada segundo · Acuícola Fiordo', `<select class="select" id="lsite" style="width:auto" aria-label="Sitio"><option value="">Todos los sitios</option>${sites.map(s => `<option value="${s.id}" ${st.site === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select><select class="select" id="lwin" style="width:auto" aria-label="Ventana">${[[60, 'Último minuto'], [300, 'Últimos 5 min'], [900, 'Últimos 15 min']].map(([v, l]) => `<option value="${v}" ${st.window === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`) + h`
  <div class="kpis">
    <div class="card"><div class="stat"><span class="label">Dispositivos en línea</span><span class="value" data-k="online"></span><span class="small muted" data-k="online-sub"></span></div></div>
    <div class="card"><div class="stat"><span class="label">Alarmas activas</span><span class="value" data-k="alarms"></span><span class="small muted" data-k="alarms-sub"></span></div></div>
    <div class="card"><div class="stat"><span class="label">O₂ promedio jaulas</span><span class="value" data-k="o2"></span><span class="small muted">mg/L · mínimo seguro 5,0</span></div></div>
    <div class="card"><div class="stat"><span class="label">Potencia total</span><span class="value" data-k="kw"></span><span class="small muted">suma de medidores</span></div></div>
  </div>
  <div class="gauges">${byType.map(([t, list]) => h`<div class="card gauge-card" data-g="${t}"><span class="name">${TYPES[t].icon} ${TYPES[t].label}</span><div data-gsvg></div>
    <select class="select" data-gsel="${t}" aria-label="Sensor de ${TYPES[t].label}">${list.map(d => h`<option value="${d.id}" ${st.sel[t] === d.id ? 'selected' : ''}>${d.name}</option>`)}</select></div>`)}</div>
  <div class="grid-2">${byType.map(([t]) => h`<section class="card" data-c="${t}"><div class="chart-head"><span><b>${TYPES[t].label}</b><br><a class="small" href="#/dispositivos/${st.sel[t]}" data-name></a></span><span class="big" data-big></span></div><div data-svg></div></section>`)}
    <section class="card"><div class="chart-head"><b>Alarmas abiertas</b><a class="small" href="#/alarmas">Centro de alarmas →</a></div>
      <ul class="list">${active.slice(0, 6).map(a => { const d = db.get('devices', a.deviceId); return h`<li class="clickable" data-al="${a.id}"><span class="ic">${TYPES[d?.type]?.icon || '🚨'}</span><span class="main"><b>${a.ruleName}</b><small>${d?.name} · ${siteName(a.siteId)} · ${ago(a.createdAt)}</small></span>${raw(sevBadge(a.severity))}${raw(alarmBadge(a.status))}</li>`; })}</ul>
      ${!active.length ? raw('<p class="muted">Sin alarmas abiertas. 👌</p>') : ''}</section>
  </div>`;

  const paint = () => {
    const now = Date.now();
    const devs = db.all('devices').filter(d => !st.site || d.siteId === st.site);
    const online = devs.filter(d => !d.offline && d.status === 'activo');
    el.querySelector('[data-k="online"]').textContent = `${online.length}/${devs.length}`;
    el.querySelector('[data-k="online-sub"]').textContent = `${devs.filter(d => d.offline).length} sin conexión · ${devs.filter(d => d.status === 'mantenimiento').length} en mantención`;
    const act = db.query('alarms', a => a.status === 'activa' && (!st.site || a.siteId === st.site));
    el.querySelector('[data-k="alarms"]').textContent = act.length;
    el.querySelector('[data-k="alarms-sub"]').textContent = `${act.filter(a => a.severity === 'critica').length} críticas · ${db.count('alarms', a => a.status === 'reconocida')} reconocidas`;
    const o2 = online.filter(d => d.type === 'oxigeno').map(d => value(d, now));
    el.querySelector('[data-k="o2"]').textContent = o2.length ? (o2.reduce((s, v) => s + v, 0) / o2.length).toFixed(2).replace('.', ',') : '—';
    el.querySelector('[data-k="kw"]').textContent = `${Math.round(online.filter(d => d.type === 'energia').reduce((s, d) => s + value(d, now), 0))} kW`;
    byType.forEach(([t]) => {
      const d = db.get('devices', st.sel[t]); if (!d) return;
      const v = value(d, now), s = status(d, v);
      const rg = RANGE[t] || (d.tag === 'camara' ? [-25, 0] : [0, 20]);
      el.querySelector(`[data-g="${t}"] [data-gsvg]`).innerHTML = gauge(v, { min: rg[0], max: rg[1], text: fmt(d, v), state: s, label: d.name });
      const c = el.querySelector(`[data-c="${t}"]`);
      c.querySelector('[data-name]').textContent = d.name;
      c.querySelector('[data-name]').href = `#/dispositivos/${d.id}`;
      c.querySelector('[data-big]').textContent = fmt(d, v);
      c.querySelector('[data-big]').style.color = s === 'alarm' ? 'var(--danger)' : s === 'warn' ? 'var(--warning)' : '';
      const th = rulesFor(d).filter(r => r.active).map(r => ({ value: r.threshold, label: `${r.op} ${r.threshold}` }));
      c.querySelector('[data-svg]').innerHTML = lineSvg(history(d, now - st.window * 1000, now, 61), { height: 170, thresholds: th, dec: TYPES[t].dec === 0 ? 0 : 1 });
    });
  };
  paint();
  ctx.every(paint);
  el.querySelectorAll('[data-gsel]').forEach(s => s.onchange = () => { st.sel[s.dataset.gsel] = s.value; s.blur(); paint(); });
  el.querySelector('#lsite').onchange = e => { st.site = e.target.value; e.target.blur(); ctx.refresh(); };
  el.querySelector('#lwin').onchange = e => { st.window = +e.target.value; e.target.blur(); paint(); };
  el.querySelectorAll('[data-al]').forEach(li => li.onclick = () => ctx.go('/alarmas/' + li.dataset.al));
}
