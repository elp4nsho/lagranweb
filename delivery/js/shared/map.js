// Mapa de Santiago con dos motores:
//  · SVG esquemático propio (siempre disponible, colores por tokens del estilo activo).
//  · Leaflet 1.9.4 + OpenStreetMap (unpkg, versión fija). Si carga y llegan teselas, el mapa
//    se "mejora" a calles reales; si el CDN está bloqueado se queda en SVG.
// API: createMap(el, opts) → { setMarkers, setLines, setHeat, fit, fitAll, focus, mode, destroy }
import { COMUNAS, MAPOCHO, AVENUES, VESPUCIO, HILLS, BOUNDS, HQ } from '../data/geo.js';
import { escape } from '../../../assets/core/ui.js';

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
let leafletPromise = null;
export function loadLeaflet(timeout = 5000) {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css'; css.crossOrigin = '';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = LEAFLET + 'leaflet.js'; s.crossOrigin = ''; s.async = true;
    s.onload = () => finish(window.L && window.L.map ? window.L : null);
    s.onerror = () => finish(null);
    document.head.appendChild(s);
    setTimeout(() => finish(window.L && window.L.map ? window.L : null), timeout);
  });
  return leafletPromise;
}

// ---------- Proyección del mundo SVG ----------
const K = Math.cos(-33.47 * Math.PI / 180), S = 3000;
const WW = (BOUNDS.e - BOUNDS.w) * K * S, WH = (BOUNDS.n - BOUNDS.s) * S;
const P = ([lat, lng]) => [(lng - BOUNDS.w) * K * S, (BOUNDS.n - lat) * S];
const pts = arr => arr.map(p => P(p).map(v => v.toFixed(1)).join(',')).join(' ');
let mapSeq = 0;

const BOLT = 'M1.6 -8 -5.6 1.6h4.8l-.8 6.4 7.2 -8.8H.8z';
export function markerInner(m) {
  const lbl = m.label ? `<text class="rm-mklabel" y="${m.kind === 'courier' ? 26 : 22}" text-anchor="middle">${escape(m.label)}</text>` : '';
  switch (m.kind) {
    case 'courier': return `<circle class="rm-pulse" r="13"/><circle class="rm-body" r="11"/><path class="rm-glyph" d="${BOLT}"/>${lbl}`;
    case 'pickup': return `<circle class="rm-a" r="10"/><text class="rm-letter" y="4" text-anchor="middle">${escape(m.letter || 'A')}</text>${lbl}`;
    case 'drop': return `<circle class="rm-b" r="10"/><text class="rm-letter" y="4" text-anchor="middle">${escape(m.letter || 'B')}</text>${lbl}`;
    case 'pending': return `<rect class="rm-pend" x="-8" y="-8" width="16" height="16" rx="3" transform="rotate(45)"/><text class="rm-letter" y="4" text-anchor="middle">!</text>${lbl}`;
    case 'stop': return `<circle class="rm-stop" r="10"/><text class="rm-letter" y="4" text-anchor="middle">${escape(m.letter || '')}</text>${lbl}`;
    case 'hq': return `<rect class="rm-hq" x="-40" y="-11" width="80" height="22" rx="11"/><text class="rm-hqtext" y="4" text-anchor="middle">Base Rayo</text>`;
    default: return `<circle class="rm-body" r="7"/>${lbl}`;
  }
}

function baseSvg(id, zones) {
  let s = `<defs><pattern id="rmg${id}" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0v14" class="rm-grid"/></pattern></defs>`;
  s += `<rect class="rm-land" x="-400" y="-400" width="${WW + 800}" height="${WH + 800}"/><rect x="-400" y="-400" width="${WW + 800}" height="${WH + 800}" fill="url(#rmg${id})"/>`;
  s += '<g class="rm-zones">' + COMUNAS.map(c => { const [x, y] = P([c.lat, c.lng]); const z = zones ? zones[c.n] : c.z; return z ? `<circle class="rm-zone z-${z}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="40" data-n="${escape(c.n)}"/>` : ''; }).join('') + '</g>';
  s += HILLS.map(h => { const [x, y] = P(h.c); return `<ellipse class="rm-hill" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(h.rx * K * S).toFixed(1)}" ry="${(h.ry * S).toFixed(1)}"><title>${escape(h.n)}</title></ellipse>`; }).join('');
  s += `<polyline class="rm-ring" points="${pts(VESPUCIO)}"/>`;
  s += AVENUES.map(a => `<polyline class="rm-ave" points="${pts(a)}"/>`).join('');
  s += `<polyline class="rm-river" points="${pts(MAPOCHO)}"/>`;
  s += COMUNAS.map(c => { const [x, y] = P([c.lat, c.lng]); return `<circle class="rm-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" vector-effect="non-scaling-stroke"/>`; }).join('');
  return s;
}

export function createMap(el, opts = {}) {
  const id = ++mapSeq;
  const state = { markers: new Map(), lines: [], heat: [], fitPts: null };
  el.classList.add('rmap');
  el.innerHTML = `<div class="rm-stage"></div>
    <div class="rm-ctrls"><button type="button" class="btn btn-sm btn-icon" data-z="1" aria-label="Acercar">+</button><button type="button" class="btn btn-sm btn-icon" data-z="-1" aria-label="Alejar">−</button><button type="button" class="btn btn-sm btn-icon" data-z="0" aria-label="Encuadrar" title="Encuadrar">⤢</button></div>
    <div class="rm-note"><span data-note>Mapa esquemático</span><button type="button" class="rm-switch" data-switch hidden>Ver calles</button></div>`;
  const stage = el.querySelector('.rm-stage');
  let mode = 'svg', svgR = null, lfR = null, destroyed = false, prefer = opts.prefer || 'auto';

  // ---------------- Motor SVG ----------------
  function SvgRenderer() {
    stage.innerHTML = `<svg class="rm-svg" role="img" aria-label="${escape(opts.label || 'Mapa de Santiago')}" preserveAspectRatio="xMidYMid meet">
      <g class="rm-base">${baseSvg(id, opts.zones)}</g><g class="rm-heatl"></g><g class="rm-lines"></g><g class="rm-labels"></g><g class="rm-marks"></g></svg>`;
    const svg = stage.querySelector('svg'), gLines = svg.querySelector('.rm-lines'), gMarks = svg.querySelector('.rm-marks'), gLabels = svg.querySelector('.rm-labels'), gHeat = svg.querySelector('.rm-heatl');
    let vb = { x: 0, y: 0, w: WW, h: WH }, k = 1, lastFit = undefined, moved = false;
    if (opts.labels !== false) {
      gLabels.innerHTML = COMUNAS.filter(c => c.lbl).map(c => { const [x, y] = P([c.lat, c.lng]); return `<g class="rm-lbl" data-x="${x}" data-y="${y + 6}"><text text-anchor="middle" y="9">${escape(c.n)}</text></g>`; }).join('')
        + (opts.hq ? (() => { const [x, y] = P(HQ); return `<g class="rm-lbl rm-mk hq" data-x="${x}" data-y="${y - 22}">${markerInner({ kind: 'hq' })}</g>`; })() : '');
    }
    const apply = () => {
      svg.setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
      const cw = svg.clientWidth || el.clientWidth || 600, ch = svg.clientHeight || el.clientHeight || 400;
      k = Math.max(vb.w / cw, vb.h / ch);
      gLabels.querySelectorAll('.rm-lbl').forEach(g => { g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})`); });
      gMarks.querySelectorAll('.rm-mk').forEach(g => place(g, g.__p, false));
      gLabels.classList.toggle('dense', vb.w > WW * 0.75 && (svg.clientWidth || 600) < 520);
    };
    const place = (g, p, anim) => {
      if (!p) return;
      g.__p = p;
      const [x, y] = P(p);
      if (!anim) { g.classList.add('no-anim'); requestAnimationFrame(() => requestAnimationFrame(() => g.classList.remove('no-anim'))); }
      g.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${k})`;
    };
    function fitWorld(b) { // b: {x0,y0,x1,y1}
      const cw = el.clientWidth || 600, ch = el.clientHeight || 400, ar = cw / ch;
      let w = Math.max(70, b.x1 - b.x0), h = Math.max(70, b.y1 - b.y0);
      w = w * 1.3 + 30; h = h * 1.3 + 40;
      if (w / h < ar) w = h * ar; else h = w / ar;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      vb = { x: cx - w / 2, y: cy - h / 2, w, h };
      apply();
    }
    const r = {
      fit(list) {
        lastFit = list; moved = false;
        if (!list || !list.length) { fitWorld({ x0: 40, y0: 40, x1: WW - 40, y1: WH - 60 }); return; }
        const xy = list.map(P);
        fitWorld({ x0: Math.min(...xy.map(p => p[0])), y0: Math.min(...xy.map(p => p[1])), x1: Math.max(...xy.map(p => p[0])), y1: Math.max(...xy.map(p => p[1])) });
      },
      zoom(f, cx, cy) {
        moved = true;
        const nw = Math.min(WW * 1.6, Math.max(40, vb.w * f)), nh = nw * vb.h / vb.w;
        cx = cx ?? vb.x + vb.w / 2; cy = cy ?? vb.y + vb.h / 2;
        vb = { x: cx - (cx - vb.x) * (nw / vb.w), y: cy - (cy - vb.y) * (nh / vb.h), w: nw, h: nh };
        apply();
      },
      lines(list) {
        gLines.innerHTML = list.map(l => `<polyline class="rm-line ${l.kind}" vector-effect="non-scaling-stroke" points="${pts(l.pts)}"/>`).join('');
      },
      heat(list) {
        const max = Math.max(1, ...list.map(h => h.value));
        gHeat.innerHTML = list.map(h => { const [x, y] = P(h.pos); const f = h.value / max; return `<circle class="rm-heat" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(10 + f * 42).toFixed(1)}" style="opacity:${(.18 + f * .6).toFixed(2)}"><title>${escape(h.label)}</title></circle>`; }).join('');
      },
      marker(m) {
        let g = gMarks.querySelector(`[data-id="${CSS.escape(m.id)}"]`);
        const sig = m.kind + '|' + (m.label || '') + '|' + (m.letter || '');
        const cls = `rm-mk ${m.kind} ${m.state || ''} ${m.onClick ? 'clickable' : ''}`;
        const fresh = !g;
        if (fresh) {
          g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.dataset.id = m.id;
          const firstCourier = gMarks.querySelector('.rm-mk.courier');
          if (m.kind === 'courier' || !firstCourier) gMarks.appendChild(g); else gMarks.insertBefore(g, firstCourier);
          g.addEventListener('click', () => g.__click && g.__click(g.dataset.id));
        }
        if (g.__cls !== cls) { g.setAttribute('class', cls + (fresh ? ' no-anim' : '')); g.__cls = cls; }
        place(g, m.pos, !fresh);
        if (g.__sig !== sig) { g.innerHTML = markerInner(m) + (m.title ? `<title>${escape(m.title)}</title>` : ''); g.__sig = sig; }
        else if (m.title) { const t = g.querySelector('title'); if (t && t.textContent !== m.title) t.textContent = m.title; }
        g.__click = m.onClick;
      },
      removeMarker(mid) { gMarks.querySelector(`[data-id="${CSS.escape(mid)}"]`)?.remove(); },
      focus(p) { moved = true; const [x, y] = P(p); vb = { ...vb, x: x - vb.w / 2, y: y - vb.h / 2 }; apply(); },
      zones(z) { svg.querySelectorAll('.rm-zone').forEach(c => { const v = z[c.dataset.n]; c.setAttribute('class', `rm-zone ${v ? 'z-' + v : 'z-none'}`); }); },
      highlight(n) { svg.querySelectorAll('.rm-zone').forEach(c => c.classList.toggle('hl', c.dataset.n === n)); },
      resize() { if (!moved && lastFit !== undefined) r.fit(lastFit); else apply(); },
      destroy() { stage.innerHTML = ''; }
    };
    // Arrastre para mover
    let drag = null;
    svg.addEventListener('pointerdown', e => { if (e.target.closest('.clickable')) return; drag = { x: e.clientX, y: e.clientY, vb: { ...vb } }; svg.setPointerCapture(e.pointerId); svg.classList.add('dragging'); });
    svg.addEventListener('pointermove', e => { if (!drag) return; moved = true; vb = { ...drag.vb, x: drag.vb.x - (e.clientX - drag.x) * k, y: drag.vb.y - (e.clientY - drag.y) * k }; apply(); });
    const end = () => { drag = null; svg.classList.remove('dragging'); };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    if (opts.wheel) svg.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cx = vb.x + (e.clientX - rect.left) * k - ((rect.width * k - vb.w) / 2), cy = vb.y + (e.clientY - rect.top) * k - ((rect.height * k - vb.h) / 2);
      r.zoom(e.deltaY > 0 ? 1.15 : 0.87, cx, cy);
    }, { passive: false });
    return r;
  }

  // ---------------- Motor Leaflet ----------------
  function LeafletRenderer(L, host) {
    const m = L.map(host, { zoomControl: false, attributionControl: true, scrollWheelZoom: !!opts.wheel, preferCanvas: false }).setView([-33.45, -70.64], 11);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© colaboradores de OpenStreetMap' }).addTo(m);
    const lineLayer = L.layerGroup().addTo(m), heatLayer = L.layerGroup().addTo(m), marks = new Map();
    const icon = mk => L.divIcon({ className: 'rm-div', html: `<svg class="rm-pin ${mk.kind} ${mk.state || ''}" width="${mk.kind === 'hq' ? 90 : 60}" height="60" viewBox="${mk.kind === 'hq' ? '-45' : '-30'} -30 ${mk.kind === 'hq' ? 90 : 60} 60">${markerInner(mk)}</svg>`, iconSize: [mk.kind === 'hq' ? 90 : 60, 60], iconAnchor: [mk.kind === 'hq' ? 45 : 30, 30] });
    if (opts.hq) L.marker(HQ, { icon: icon({ kind: 'hq' }), interactive: false, keyboard: false }).addTo(m);
    return {
      map: m, tiles,
      fit(list) { if (!list || !list.length) m.fitBounds([[BOUNDS.s + .03, BOUNDS.w + .03], [BOUNDS.n - .02, BOUNDS.e - .02]]); else if (list.length === 1) m.setView(list[0], 15); else m.fitBounds(L.latLngBounds(list), { padding: [40, 40] }); },
      zoom(f) { f < 1 ? m.zoomIn() : m.zoomOut(); },
      lines(list) { lineLayer.clearLayers(); list.forEach(l => L.polyline(l.pts, { className: `rm-line ${l.kind}`, interactive: false }).addTo(lineLayer)); },
      heat(list) { heatLayer.clearLayers(); const max = Math.max(1, ...list.map(h => h.value)); list.forEach(h => { const f = h.value / max; L.circle(h.pos, { radius: 500 + f * 1800, className: 'rm-heat', fillOpacity: .18 + f * .5, stroke: false }).bindTooltip(h.label).addTo(heatLayer); }); },
      marker(mk) {
        let x = marks.get(mk.id);
        const sig = mk.kind + '|' + (mk.state || '') + '|' + (mk.label || '') + '|' + (mk.letter || '');
        if (!x) { x = L.marker(mk.pos, { icon: icon(mk), title: mk.title || '', keyboard: false, zIndexOffset: mk.kind === 'courier' ? 1000 : 0 }).addTo(m); x.on('click', () => x.__click && x.__click(mk.id)); marks.set(mk.id, x); x.__sig = sig; }
        else { x.setLatLng(mk.pos); if (x.__sig !== sig) { x.setIcon(icon(mk)); x.__sig = sig; } }
        x.__click = mk.onClick;
      },
      removeMarker(mid) { const x = marks.get(mid); if (x) { x.remove(); marks.delete(mid); } },
      focus(p) { m.panTo(p); },
      zones() {}, highlight() {},
      resize() { m.invalidateSize(); },
      destroy() { m.remove(); }
    };
  }

  const R = () => (mode === 'leaflet' ? lfR : svgR);
  function replay(r) {
    r.lines(state.lines); r.heat(state.heat);
    for (const mk of state.markers.values()) r.marker(mk);
    r.fit(state.fitPts);
  }
  svgR = SvgRenderer();
  requestAnimationFrame(() => svgR && svgR.fit(state.fitPts));
  const note = el.querySelector('[data-note]'), sw = el.querySelector('[data-switch]');
  note.textContent = opts.noteText || 'Mapa esquemático';

  // Intento de mejora a Leaflet
  let lfHost = null;
  if (prefer !== 'svg') loadLeaflet().then(L => {
    if (!L || destroyed) { note.textContent = 'Mapa esquemático · sin conexión al servidor de mapas'; return; }
    lfHost = document.createElement('div');
    lfHost.className = 'rm-leaflet';
    lfHost.style.visibility = 'hidden';
    stage.appendChild(lfHost);
    let ok = false, errs = 0;
    try { lfR = LeafletRenderer(L, lfHost); } catch (e) { lfHost.remove(); lfR = null; return; }
    lfR.tiles.on('tileload', () => {
      if (ok || destroyed) return;
      ok = true;
      sw.hidden = false;
      switchTo('leaflet');
    });
    lfR.tiles.on('tileerror', () => { errs++; if (!ok && errs >= 4) { lfR.destroy(); lfHost.remove(); lfR = null; note.textContent = 'Mapa esquemático · teselas bloqueadas'; } });
    lfR.fit(state.fitPts);
  });
  function switchTo(m) {
    if (m === 'leaflet' && !lfR) return;
    mode = m;
    if (lfHost) lfHost.style.visibility = m === 'leaflet' ? 'visible' : 'hidden';
    stage.querySelector('.rm-svg').style.visibility = m === 'leaflet' ? 'hidden' : 'visible';
    el.classList.toggle('is-leaflet', m === 'leaflet');
    note.textContent = m === 'leaflet' ? 'Mapa de calles · OpenStreetMap' : 'Mapa esquemático';
    sw.textContent = m === 'leaflet' ? 'Ver esquema' : 'Ver calles';
    if (m === 'leaflet') { lfR.resize(); replay(lfR); } else replay(svgR);
  }
  sw.addEventListener('click', () => switchTo(mode === 'leaflet' ? 'svg' : 'leaflet'));
  el.querySelector('.rm-ctrls').addEventListener('click', e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    const z = +b.dataset.z;
    if (z === 0) R().fit(state.fitPts); else R().zoom(z > 0 ? 0.7 : 1.4);
  });
  const dark = () => el.classList.toggle('rm-dark', /dark/.test(getComputedStyle(document.documentElement).colorScheme || ''));
  dark();
  const onTheme = () => setTimeout(dark, 50);
  window.addEventListener('lgw:theme', onTheme);
  const ro = new ResizeObserver(() => { svgR && svgR.resize(); lfR && lfR.resize(); });
  ro.observe(el);

  const api = {
    get mode() { return mode; },
    setMarkers(list) {
      const ids = new Set(list.map(m => m.id));
      for (const k of [...state.markers.keys()]) if (!ids.has(k)) { state.markers.delete(k); svgR.removeMarker(k); lfR && lfR.removeMarker(k); }
      list.forEach(m => { if (!m.pos) return; state.markers.set(m.id, m); svgR.marker(m); lfR && lfR.marker(m); });
    },
    setLines(list) { state.lines = list.map(l => ({ ...l, pts: (l.pts || []).filter(Boolean) })).filter(l => l.pts.length > 1); svgR.lines(state.lines); lfR && lfR.lines(state.lines); },
    setHeat(list) { state.heat = list; svgR.heat(list); lfR && lfR.heat(list); },
    fit(list) { list = (list || []).filter(Boolean); state.fitPts = list.length ? list : null; R().fit(state.fitPts); },
    fitAll() { state.fitPts = null; R().fit(null); },
    focus(p) { R().focus(p); },
    zones(z) { svgR.zones(z); },
    highlight(n) { svgR.highlight(n); },
    destroy() { destroyed = true; ro.disconnect(); window.removeEventListener('lgw:theme', onTheme); svgR.destroy(); lfR && lfR.destroy(); }
  };
  return api;
}
