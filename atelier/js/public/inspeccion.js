// Inspección digital multipunto: semáforo, fotos/videos, comentarios del técnico, batería EV y aprobación en línea.
import { escape, money, dateTime, toast, modal, barChart } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { LIGHT } from '../data/catalog.js';
import { vehicleById, userById, woTotal, inspectionStats, pendingApprovals, setWoStatus, vehicleName, kmFmt } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';

export function batteryBlock(b) {
  if (!b) return '';
  const avg = b.cells.reduce((a, x) => a + x, 0) / b.cells.length, spread = Math.round((Math.max(...b.cells) - Math.min(...b.cells)) * 1000);
  const tone = b.soh >= 90 ? 'success' : b.soh >= 80 ? 'warning' : 'danger';
  return `<div class="card stack"><div class="row between"><h3 style="margin:0">🔋 Batería de alta tensión</h3><span class="badge badge-${tone}">SOH ${b.soh}%</span></div>
    <div class="row" style="gap:24px"><span class="soh" style="--v:${b.soh}"><b>${b.soh}%</b></span>
      <dl class="dl"><dt>Estado de salud</dt><dd>${b.soh}% de la capacidad original</dd><dt>Desbalance de celdas</dt><dd>${spread} mV ${spread > 25 ? '⚠' : '✓'}</dd><dt>Temperatura</dt><dd>${b.tempC} °C</dd><dt>Ciclos equivalentes</dt><dd>${b.cycles}</dd><dt>Autonomía estimada</dt><dd>${b.rangeKm} km</dd></dl></div>
    <div class="cell-chart"><span class="label">Balance por módulo (voltaje promedio ${avg.toFixed(3)} V)</span>${barChart(b.cells.map((v, i) => ({ label: 'M' + (i + 1), value: Math.round((v - 3.80) * 1000), color: Math.abs(v - avg) > .015 ? 'var(--danger)' : Math.abs(v - avg) > .008 ? 'var(--warning)' : 'var(--success)' })), { height: 120, format: v => (3.8 + v / 1000).toFixed(3) + ' V' })}</div></div>`;
}
const media = (it, k) => `${it.m || it.v ? `<div class="media-row">${Array.from({ length: it.m || 0 }, (_, i) => `<button type="button" class="media-ph" data-media="${k}|foto|${i + 1}" aria-label="Ver foto ${i + 1}"><span><b>📷</b>Foto ${i + 1}</span></button>`).join('')}${it.v ? `<button type="button" class="media-ph video" data-media="${k}|video|1" aria-label="Ver video"><span><b>▶</b>Video</span></button>` : ''}</div>` : ''}`;

export function inspectionItems(ins, { approvable = false, choice = {}, filter = '' } = {}) {
  const cats = [...new Set(ins.items.map(i => i.cat))];
  return cats.map(cat => {
    const items = ins.items.map((it, k) => ({ it, k })).filter(({ it }) => it.cat === cat && (!filter || it.s === filter));
    if (!items.length) return '';
    return `<div class="stack" style="gap:8px"><h3 style="margin:8px 0 0">${escape(cat)}</h3><div class="insp-cat">${items.map(({ it, k }) => `<div class="insp-item ${it.s || ''}">
      <span class="light ${it.s || ''}" title="${escape(LIGHT[it.s]?.label || 'Pendiente')}"></span>
      <div><b>${escape(it.name)}</b>${it.val ? ` <span class="badge">${escape(it.val)}</span>` : ''}${it.c ? `<p class="small muted" style="margin:4px 0 0">💬 ${escape(it.c)}</p>` : ''}${media(it, k)}
        ${it.rec ? `<div class="rec-box"><span class="small"><b>Recomendado:</b> ${escape(it.rec.desc)}</span>${it.ap == null && approvable ? `<label class="check"><input type="checkbox" data-ap="${k}" ${choice[k] ? 'checked' : ''}> <b>${money(it.rec.price)}</b></label>` : `<span class="row" style="gap:6px"><b>${money(it.rec.price)}</b>${it.ap == null ? '<span class="badge badge-warning">Pendiente</span>' : it.ap ? '<span class="badge badge-success">Aprobado</span>' : '<span class="badge">No aprobado</span>'}</span>`}</div>` : ''}
      </div><span class="badge badge-${LIGHT[it.s]?.badge || ''} hide-sm">${escape(LIGHT[it.s]?.label || 'Pendiente')}</span></div>`).join('')}</div></div>`;
  }).join('');
}
export function lightSummary(ins) {
  const s = inspectionStats(ins);
  return `<div class="light-sum"><div class="tone-success"><b>${s.ok}</b><small>Bien</small></div><div class="tone-warning"><b>${s.atencion}</b><small>Atención pronto</small></div><div class="tone-danger"><b>${s.urgente}</b><small>Requiere acción</small></div></div>`;
}
export function openMedia(ins, spec) {
  const [k, kind, n] = spec.split('|'), it = ins.items[+k];
  modal({ title: `${it.name} · ${kind === 'video' ? 'Video' : 'Foto ' + n}`, size: 'lg', body: `<div class="stack">
    <svg viewBox="0 0 640 360" style="width:100%;border-radius:var(--radius-sm);background:var(--surface-2)" role="img" aria-label="Registro del técnico"><defs><pattern id="mp" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="24" style="fill:var(--surface-3, var(--surface))"/></pattern></defs><rect width="640" height="360" fill="url(#mp)"/>
      <circle cx="320" cy="170" r="70" fill="none" style="stroke:var(--${LIGHT[it.s]?.badge || 'primary'})" stroke-width="6" stroke-dasharray="14 10"/>
      <text x="320" y="186" text-anchor="middle" style="font-size:54px">${kind === 'video' ? '▶' : '📷'}</text><text x="320" y="290" text-anchor="middle" style="fill:var(--text);font:600 18px var(--font-body)">${escape(it.name)}</text>
      <text x="320" y="316" text-anchor="middle" style="fill:var(--muted);font:13px var(--font-body)">${kind === 'video' ? 'Video de 0:24 grabado por el técnico' : 'Registro fotográfico del técnico'} · marcador de posición</text></svg>
    ${it.c ? `<p class="callout">💬 ${escape(it.c)}</p>` : ''}</div>` });
}

export function renderInspection(el, { id }) {
  const choice = {};
  let filter = '';
  const paint = () => {
    const ins = db.get('inspections', id);
    if (!ins) { el.innerHTML = '<section class="section"><div class="container card empty">Inspección no encontrada.</div></section>'; return; }
    const wo = db.get('workOrders', ins.woId), v = vehicleById(ins.vehicleId), tech = userById(ins.techId);
    const pend = pendingApprovals(ins), approvable = !!pend.length && wo && wo.status === 'aprobacion';
    const extra = ins.items.reduce((a, it, k) => a + (it.rec && it.ap == null && choice[k] ? it.rec.price : 0), 0);
    const base = wo ? woTotal(wo) : 0;
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow">Inspección digital multipunto · ${escape(wo?.code || '')}</span><h1>${escape(vehicleName(v))}</h1><p class="muted" style="margin:0">${escape(v?.plate || '')} · ${kmFmt(ins.km)} · ${dateTime(ins.at)} · Técnico: <b>${escape(tech?.name || '')}</b></p></div>
        ${wo ? `<a class="btn btn-sm btn-ghost" href="#/seguimiento/${wo.code}">Seguimiento</a>` : ''}</div>
      <div class="grid-2" style="align-items:center"><div class="car-frame">${carArt({ body: v?.body, color: v?.color, ev: v?.fuel === 'electrico' })}</div><div class="stack">${lightSummary(ins)}${ins.summary ? `<p class="callout small">${escape(ins.summary)}</p>` : ''}</div></div>
      ${batteryBlock(ins.battery)}
      <div class="row">${[['', 'Todos'], ['urgente', '🔴 Requiere acción'], ['atencion', '🟡 Atención'], ['ok', '🟢 Bien']].map(([k, l]) => `<button class="chip ${filter === k ? 'active' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      ${inspectionItems(ins, { approvable, choice, filter })}
      ${approvable ? `<div class="card approve-bar row between"><span><span class="label">Presupuesto actualizado</span><br><b class="price">${money(base + extra)}</b> <small class="muted">base ${money(base)}${extra ? ` + ${money(extra)} aprobados` : ''}</small></span>
        <span class="row"><button class="btn btn-ghost" data-none>Continuar sin adicionales</button><button class="btn btn-primary" data-ok>Aprobar ${Object.values(choice).filter(Boolean).length || ''} trabajo(s)</button></span></div>`
        : pend.length ? '' : `<div class="callout ok">${ins.items.some(i => i.rec) ? 'Las recomendaciones ya fueron revisadas. ¡Gracias!' : 'Sin trabajos adicionales recomendados.'}</div>`}
    </div></section>`;
  };
  el.addEventListener('change', e => { const c = e.target.closest('[data-ap]'); if (c) { choice[c.dataset.ap] = c.checked; paint(); } });
  el.addEventListener('click', e => {
    const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; paint(); return; }
    const m = e.target.closest('[data-media]'); if (m) { openMedia(db.get('inspections', id), m.dataset.media); return; }
    if (e.target.closest('[data-ok]') || e.target.closest('[data-none]')) approve(id, e.target.closest('[data-none]') ? {} : choice);
  });
  paint();
  return { refresh: paint };
}
export function approve(insId, choice, by = 'cliente') {
  const ins = db.get('inspections', insId), wo = db.get('workOrders', ins.woId);
  const items = ins.items.map((it, k) => it.rec && it.ap == null ? { ...it, ap: !!choice[k] } : it);
  const ok = items.filter((it, k) => it.rec && ins.items[k].ap == null && it.ap);
  db.update('inspections', insId, { items, approvedAt: new Date().toISOString(), approvedBy: by });
  if (wo) {
    db.update('workOrders', wo.id, { items: [...wo.items, ...ok.map(it => ({ desc: it.rec.desc, kind: 'rec', qty: 1, price: it.rec.price }))], approvedAt: new Date().toISOString() });
    setWoStatus(wo.id, 'en-proceso', auth.current()?.id || null, ok.length ? `${by === 'cliente' ? 'Cliente aprobó' : 'Aprobación registrada:'} ${ok.length} trabajo(s) adicional(es)` : 'Cliente continúa sin adicionales');
  }
  toast(ok.length ? `Aprobaste ${ok.length} trabajo(s). ¡Manos a la obra!` : 'Seguimos solo con lo agendado', 'success');
}
