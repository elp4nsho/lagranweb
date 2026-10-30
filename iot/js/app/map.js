// Mapa de sitio: plano SVG con sensores coloreados por estado; clic para ver el detalle.
import { db } from '../data/db.js';
import { ago } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, value, fmt, status, history, STATUS_LABEL, STATUS_COLOR } from '../shared/sim.js';
import { siteMap, sparkline } from '../shared/viz.js';
import { pageHead, stBadge, zoneName } from '../shared/common.js';

const st = { site: null, sel: null, type: '' };

export function render(el, ctx) {
  const sites = db.all('sites');
  if (!sites.find(s => s.id === st.site)) st.site = sites[0]?.id;
  const site = db.get('sites', st.site);
  if (!site) { el.innerHTML = pageHead('Mapa de sitio') + '<div class="empty">No hay sitios configurados.</div>'; return; }
  el.innerHTML = pageHead('Mapa de sitio', site.location) + h`
  <div class="row between">
    <div class="tabs">${sites.map(s => h`<button class="tab ${s.id === st.site ? 'active' : ''}" data-site="${s.id}">${s.name}</button>`)}</div>
    <div class="chips">${[['', 'Todos'], ...Object.entries(TYPES).map(([k, t]) => [k, t.icon + ' ' + t.label])].map(([k, l]) => h`<button class="chip ${st.type === k ? 'active' : ''}" data-type="${k}">${l}</button>`)}</div>
  </div>
  <div class="map-layout">
    <section class="card stack"><div data-map></div>
      <div class="legend">${Object.entries(STATUS_LABEL).map(([k, [l]]) => raw(`<span><i style="background:${STATUS_COLOR[k]}"></i>${l}</span>`))}<span data-counts></span></div></section>
    <aside class="card stack" data-panel></aside>
  </div>`;

  const paint = () => {
    const devs = db.query('devices', d => d.siteId === site.id && (!st.type || d.type === st.type));
    const now = Date.now();
    const sts = Object.fromEntries(devs.map(d => [d.id, status(d, value(d, now))]));
    el.querySelector('[data-map]').innerHTML = siteMap(site, db.query('zones', z => z.siteId === site.id), devs, d => sts[d.id], { selected: st.sel });
    const c = {}; Object.values(sts).forEach(s => c[s] = (c[s] || 0) + 1);
    el.querySelector('[data-counts]').textContent = `· ${devs.length} sensores · ${c.alarm || 0} en alarma · ${c.warn || 0} en precaución`;
    const d = db.get('devices', st.sel);
    const panel = el.querySelector('[data-panel]');
    if (!d || d.siteId !== site.id) {
      const hot = devs.filter(x => ['alarm', 'warn', 'offline'].includes(sts[x.id]));
      panel.innerHTML = h`<h3 style="margin:0">Selecciona un sensor</h3><p class="muted small" style="margin:0">Haz clic en un punto del mapa para ver su lectura en vivo.</p>
        <b class="small">Requieren atención</b><ul class="list">${hot.map(x => h`<li class="clickable" data-pick="${x.id}"><span class="ic">${TYPES[x.type].icon}</span><span class="main"><b>${x.name}</b><small>${zoneName(x.zoneId)} · ${fmt(x, value(x, now))}</small></span>${raw(stBadge(sts[x.id]))}</li>`)}</ul>${!hot.length ? raw('<p class="small muted">Todo en rango normal.</p>') : ''}`;
    } else {
      const v = value(d, now);
      panel.innerHTML = h`<div class="row between"><span class="ic">${TYPES[d.type].icon}</span><button class="btn btn-sm btn-ghost" data-close-panel aria-label="Cerrar">✕</button></div>
        <h3 style="margin:0">${d.name}</h3><span class="small muted">${d.code} · ${zoneName(d.zoneId)}</span>
        <div class="big-value" style="color:${STATUS_COLOR[sts[d.id]]}">${fmt(d, v)}</div>${raw(stBadge(sts[d.id]))}
        <div>${raw(sparkline(history(d, now - 300000, now, 60), { w: 280, h: 50 }))}<div class="small muted">Últimos 5 minutos</div></div>
        <dl class="kv"><dt>Modelo</dt><dd>${d.model}</dd><dt>Firmware</dt><dd>${d.firmware}</dd><dt>Batería</dt><dd>${d.battery == null ? 'Red eléctrica' : d.battery + '%'}</dd><dt>Última lectura</dt><dd>${d.offline ? ago(d.lastSeen) : 'hace 1 s'}</dd></dl>
        <a class="btn btn-primary btn-sm" href="#/dispositivos/${d.id}">Ver historial y detalle</a>`;
    }
  };
  paint();
  ctx.every(paint);
  el.querySelectorAll('[data-site]').forEach(b => b.onclick = () => { st.site = b.dataset.site; st.sel = null; ctx.refresh(); });
  el.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { st.type = b.dataset.type; ctx.refresh(); });
  const pick = id => { st.sel = id; paint(); };
  el.querySelector('.map-layout').addEventListener('click', e => {
    const dot = e.target.closest('[data-dev]'); if (dot) return pick(dot.dataset.dev);
    const p = e.target.closest('[data-pick]'); if (p) return pick(p.dataset.pick);
    if (e.target.closest('[data-close-panel]')) return pick(null);
  });
  el.querySelector('[data-map]').addEventListener('keydown', e => { const dot = e.target.closest('[data-dev]'); if (dot && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(dot.dataset.dev); } });
  return () => {};
}
