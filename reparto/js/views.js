// Piezas de interfaz compartidas por el sitio, la app del conductor, despacho y el portal de empresas:
// mapas de ruta, prueba de entrega (firma + foto), etiqueta con código de barras, línea de tiempo,
// barras de capacidad y el pad de firma en canvas.
import { app, db, SHIP, machineOf, stBadge, userName, companyName, hhmm, km, kg, money, escape, todayStr } from './app.js';
import { cityMap, DEPOT, pathOf, hashStr } from './geo.js';
import { plan, vehiclePos, load, get, isDone, messagesOf } from './ops.js';
import { lastAttempt, isPending } from './engine.js';
import { html, raw, dateTime, date as fmtDate, modal } from '../../assets/core/ui.js';
import { timeline } from '../../assets/core/blocks.js';

// ---------- Mapas ----------
export function stopKind(s, next) {
  if (s.kind === 'retiro') return isDone(s) ? 'done pickup' : s.status === 'fallido' ? 'fail pickup' : next ? 'next pickup' : 'pickup';
  return isDone(s) ? 'done' : s.status === 'fallido' ? 'fail' : next ? 'next' : 'stop';
}
// Mapa de una ruta: recorrido hecho, pendiente (numerado en orden) y vehículo.
export function routeMap(route, { p = plan(route), focus = null, vehicle = true, cls = '', ratio = 1.6, label } = {}) {
  const pend = p.pending, done = p.done;
  const pos = vehiclePos(route, p);
  const nextId = pend[0]?.id;
  const points = [
    ...done.map(s => ({ x: s.x, y: s.y, kind: s.kind === 'retiro' ? (isDone(s) ? 'done pickup' : 'fail pickup') : stopKind(s), label: isDone(s) ? '✓' : '✕', title: `${s.code} · ${s.address}`, id: s.id })),
    ...p.skipped.map(s => ({ x: s.x, y: s.y, kind: 'dot', title: `${s.code} (fuera de ruta)` })),
    ...pend.map((s, i) => ({ x: s.x, y: s.y, kind: s.kind === 'retiro' ? (i === 0 ? 'next pickup' : 'pickup') : i === 0 ? 'next' : 'stop', label: i + 1, title: `${i + 1}. ${s.code} · ${s.address}${p.eta[s.id] ? ' · ETA ' + hhmm(p.eta[s.id].eta) : ''}`, id: s.id, color: route.color }))
  ];
  if (focus) points.forEach(pt => { if (pt.id === focus) pt.kind += ' focus'; });
  const donePath = pathOf([DEPOT, ...done]);
  const pendPath = pathOf([route.status === 'en_curso' ? pos : DEPOT, ...pend, DEPOT]);
  const lines = [{ pts: donePath, kind: 'done', color: route.color }, { pts: pendPath, kind: 'route', color: route.color }];
  const fit = [...done, ...pend, ...p.skipped, DEPOT];
  return cityMap({ points, lines, vehicles: vehicle && route.status === 'en_curso' ? [{ ...pos, color: route.color, title: `${userName(route.driverId)} · ${pos.state}` }] : [], fit, cls, ratio, label: label || `Mapa de la ruta ${route.code}` });
}
// Mapa de operación: todas las rutas del día con su avance y vehículos.
export function boardMap(routes, { highlight = null, ratio = 1.5, extra = [] } = {}) {
  const lines = [], points = [], vehicles = [], fit = [DEPOT];
  routes.forEach(r => {
    const p = plan(r);
    const dim = highlight && highlight !== r.id;
    const pos = vehiclePos(r, p);
    lines.push({ pts: pathOf([DEPOT, ...p.done]), kind: 'done' + (dim ? ' dim' : ''), color: r.color });
    lines.push({ pts: pathOf([r.status === 'en_curso' ? pos : DEPOT, ...p.pending]), kind: 'route' + (dim ? ' dim' : ''), color: r.color });
    p.done.forEach(s => points.push({ x: s.x, y: s.y, kind: 'dot' + (dim ? ' dim' : ''), color: r.color, title: `${r.code} · ${s.code} ✓` }));
    p.pending.forEach((s, i) => points.push({ x: s.x, y: s.y, kind: (s.kind === 'retiro' ? 'pickup' : 'stop') + ' small' + (dim ? ' dim' : ''), label: i + 1, color: r.color, title: `${r.code} · ${i + 1}. ${s.code}` }));
    if (r.status === 'en_curso') vehicles.push({ ...pos, color: r.color, label: userName(r.driverId).split(' ')[0], title: `${r.code} · ${userName(r.driverId)} · ${pos.state}` });
    fit.push(...p.stops);
  });
  extra.forEach(s => { points.push({ x: s.x, y: s.y, kind: 'point', label: '•', title: s.title || s.code }); fit.push(s); });
  return cityMap({ points, lines, vehicles, fit, ratio, label: 'Mapa de operación del día', zones: Object.fromEntries(db.all('zones').map(z => [z.key, z.color])) });
}

// ---------- Prueba de entrega ----------
export function sigSvg(strokes, cls = '') {
  if (!strokes?.length) return '';
  return `<svg class="rp-sig ${cls}" viewBox="0 0 300 110" role="img" aria-label="Firma">${strokes.map(st => `<polyline points="${st.map(p => p.join(',')).join(' ')}"/>`).join('')}</svg>`;
}
// Foto simulada (ilustración SVG) de un paquete en la puerta.
export function photoSvg(seed, label = 'Foto de entrega') {
  const h = hashStr(String(seed));
  const door = ['#8b5e3c', '#3f6e5a', '#55607a', '#7a4b4b'][h % 4], wall = ['#e8dccb', '#d9e2e7', '#efe3d3', '#dcd6e8'][(h >>> 3) % 4];
  const bx = 120 + (h % 60), bw = 60 + (h >>> 5) % 30;
  return `<svg class="rp-photo" viewBox="0 0 320 200" role="img" aria-label="${escape(label)}"><rect width="320" height="200" fill="${wall}"/><rect x="0" y="160" width="320" height="40" fill="#9b958c"/><rect x="${70 + (h % 30)}" y="30" width="90" height="130" rx="3" fill="${door}"/><circle cx="${150 + (h % 30)}" cy="98" r="4" fill="#e9c46a"/><rect x="${bx}" y="${160 - bw * .7}" width="${bw}" height="${bw * .7}" fill="#c89b6d" stroke="#8a6440" stroke-width="2"/><path d="M${bx} ${160 - bw * .7 + 8}H${bx + bw}" stroke="#e8d5b5" stroke-width="6"/><rect x="${bx + bw * .25}" y="${160 - bw * .7 + 16}" width="${bw * .5}" height="12" fill="#fff" opacity=".85"/><text x="10" y="192" font-size="11" fill="#fff" font-family="monospace">${escape(new Date().getFullYear())} · GPS ✓</text></svg>`;
}
export function proofCard(s) {
  const p = s.proof;
  if (!p) return '';
  return html`<div class="rp-proof">
    <div class="rp-proof-media">${raw(p.photo ? photoSvg(s.id, `Foto de entrega de ${s.code}`) : '<div class="rp-photo-empty muted small">Sin foto</div>')}${raw(p.sig ? `<div class="rp-sigbox">${sigSvg(p.sig)}<small class="muted">Firma</small></div>` : '')}</div>
    <dl class="k-kv">
      <dt>Recibió</dt><dd>${p.name}${p.relation ? ` (${p.relation})` : ''}</dd>
      ${p.rut ? html`<dt>RUT</dt><dd>${p.rut}</dd>` : ''}
      <dt>Fecha</dt><dd>${dateTime(p.at)}</dd>
      ${p.pin ? raw('<dt>PIN</dt><dd>Validado ✓</dd>') : ''}
      ${p.safePlace ? html`<dt>Lugar seguro</dt><dd>${p.safePlace}</dd>` : ''}
      ${p.pieces && p.pieces !== s.pieces ? html`<dt>Bultos</dt><dd>${p.pieces} de ${s.pieces} · ${p.partialReason || ''}</dd>` : ''}
      ${p.payment ? html`<dt>Cobro</dt><dd>${money(p.payment.amount)} · ${p.payment.method}${p.payment.change ? ` (vuelto ${money(p.payment.change)})` : ''}</dd>` : ''}
    </dl></div>`;
}

// ---------- Etiqueta ----------
export function barcode(code, h = 46) {
  let x = 0, out = '';
  const bits = [...String(code)].flatMap(ch => { const c = ch.charCodeAt(0); return [c & 1, (c >> 1) & 3, (c >> 3) & 1, (c >> 4) & 3, 1]; });
  [2, 1, 1, ...bits, 1, 1, 2].forEach((w, i) => { const ww = (w % 3) + 1; if (i % 2 === 0) out += `<rect x="${x}" y="0" width="${ww}" height="${h}"/>`; x += ww + 1; });
  return `<svg class="rp-barcode" viewBox="0 0 ${x} ${h}" preserveAspectRatio="none" role="img" aria-label="Código de barras ${escape(code)}">${out}</svg>`;
}
export function labelHtml(s) {
  const c = db.get('companies', s.companyId);
  const z = db.get('zones', s.zoneId);
  return html`<article class="rp-label">
    <header><b>📦 Pudú Envíos</b><span class="rp-label-svc">${s.service === 'express' ? 'EXPRESS' : s.service === 'mismo_dia' ? 'MISMO DÍA' : 'ESTÁNDAR'}</span></header>
    <div class="rp-label-zone"><span>${z?.name || '—'}</span><b>${s.comuna}</b></div>
    <div class="rp-label-to"><small>Para</small><b>${s.rName}</b><span>${s.address}</span><span>${s.comuna} · ${s.rPhone}</span></div>
    <div class="rp-label-from"><small>De</small><span>${c?.name || ''} · ${c?.address || ''}, ${c?.comuna || ''}</span></div>
    <div class="rp-label-meta"><span>${kg(s.weight)}</span><span>${s.pieces} bulto${s.pieces > 1 ? 's' : ''}</span>${s.cod ? html`<span class="rp-cod">COBRAR ${money(s.cod)}</span>` : ''}${s.win ? html`<span>${s.win}</span>` : ''}</div>
    ${raw(barcode(s.code))}<div class="rp-label-code">${s.code}${s.ref ? html` · Ref. ${s.ref}` : ''}</div></article>`;
}

export function labelModal(list) {
  const m = modal({ title: list.length > 1 ? `${list.length} etiquetas` : `Etiqueta ${list[0].code}`, size: 'lg', body: html`<div class="rp-labels">${list.map(s => raw(labelHtml(s)))}</div>`, foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-print>🖨 Imprimir</button>' });
  m.el.querySelector('[data-print]').onclick = () => { document.body.classList.add('rp-printing'); window.print(); setTimeout(() => document.body.classList.remove('rp-printing'), 500); db.log('etiqueta', `${list.length} etiqueta(s) impresas`, app.auth.current()?.id || null); };
}


// ---------- Línea de tiempo del envío ----------
export function shipTimeline(s, { publicView = false } = {}) {
  const m = machineOf(s);
  const items = (s.history || []).map(h => ({ at: h.at, tone: m.tone(h.to), title: m.label(h.to), text: publicView && h.note && /Recibido|Cargado|Recibe|Dejado|R-\d/.test(h.note) ? h.note.replace(/^R-\d+$/, 'Ruta de reparto asignada') : publicView ? (h.to === 'fallido' ? h.note : '') : h.note, who: publicView ? '' : h.by ? userName(h.by) : '' }));
  if (!publicView) db.query('notifications', n => n.shipmentId === s.id).forEach(n => items.push({ at: n.at, tone: 'info', title: `${n.channel} al destinatario`, text: n.text }));
  return timeline(items.sort((a, b) => String(b.at).localeCompare(String(a.at))));
}

// ---------- Capacidad ----------
export function capBars(route) {
  const l = load(route);
  const bar = (pct, label, txt) => html`<div class="rp-cap"><div class="row between small"><span>${label}</span><b>${txt}</b></div><div class="progress ${pct > 100 ? 'over' : pct > 85 ? 'high' : ''}"><i style="--v:${Math.min(100, pct)}%"></i></div></div>`;
  return html`<div class="rp-caps">${bar(l.pctKg, 'Peso', `${Math.round(route.status === 'planificada' ? l.kgPlan : l.kgNow)} / ${l.v.capKg} kg`)}${bar(l.pctL, 'Volumen', `${Math.round((route.status === 'planificada' ? l.lPlan : l.lNow) / 100) / 10} / ${Math.round(l.v.capL / 100) / 10} m³`)}</div>`;
}
export function progressOf(route, p = plan(route)) {
  const total = p.stops.length, done = p.done.length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ---------- Pad de firma (canvas) ----------
export function signaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let strokes = [], cur = null;
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(r.height * devicePixelRatio));
    draw();
  };
  const col = () => getComputedStyle(canvas).color || '#111';
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.4 * devicePixelRatio; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col();
    const sx = canvas.width / 300, sy = canvas.height / 110;
    strokes.forEach(st => { ctx.beginPath(); st.forEach(([x, y], i) => (i ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy))); ctx.stroke(); });
  }
  const pt = e => { const r = canvas.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 300), Math.round(((e.clientY - r.top) / r.height) * 110)]; };
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); draw(); });
  canvas.addEventListener('pointermove', e => { if (!cur) return; const p = pt(e), l = cur.at(-1); if (Math.abs(p[0] - l[0]) + Math.abs(p[1] - l[1]) >= 2) { cur.push(p); draw(); } });
  const end = () => { cur = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('pointerleave', end);
  requestAnimationFrame(fit);
  return {
    get strokes() { return strokes.map(st => (st.length > 60 ? st.filter((_, i) => i % Math.ceil(st.length / 60) === 0) : st)); },
    clear() { strokes = []; draw(); },
    isEmpty: () => !strokes.some(st => st.length >= 4),
    demo(seedStrokes) { strokes = seedStrokes.map(st => st.slice()); draw(); }
  };
}

// ---------- Varios ----------
export const svcLabel = s => (s.service === 'express' ? 'Express' : s.service === 'mismo_dia' ? 'Mismo día' : 'Estándar');
export function stopFlags(s) {
  const f = [];
  if (s.kind === 'retiro') f.push(['📥 Retiro', 'info']);
  if (s.service === 'express') f.push(['⚡ Express', 'warning']);
  if (s.win || s.prefWin) f.push([`🕑 ${(s.win || s.prefWin).replace('-', '–')}`, 'primary']);
  if (s.cod) f.push([`💵 ${money(s.cod)}`, 'success']);
  if (s.requirePin) f.push(['🔐 PIN', '']);
  if (s.pieces > 1) f.push([`${s.pieces} bultos`, '']);
  if (s.request) f.push([s.request.kind === 'reprogramar' ? `🔁 Reprogramar ${s.request.date}` : '🏪 Llevar a punto', 'danger']);
  if ((s.notes || []).length) f.push(['📝 Indicaciones', 'info']);
  return f;
}
export const flagsHtml = s => stopFlags(s).map(([t, tone]) => html`<span class="badge ${tone ? 'badge-' + tone : ''}">${t}</span>`).join('');
export function chatBox(s, who) {
  const ms = messagesOf(s);
  return html`<div class="rp-chat" data-chat="${s.id}">${ms.length ? ms.map(m => html`<div class="rp-msg ${m.from === who ? 'me' : ''}"><small>${m.from === 'conductor' ? 'Conductor' : m.from === 'despacho' ? 'Despacho' : 'Destinatario'} · ${hhmm(Date.parse(m.at))}</small><span>${m.text}</span></div>`) : raw('<p class="muted small" style="margin:0">Sin mensajes todavía.</p>')}</div>`;
}
export { isPending, lastAttempt, fmtDate };
