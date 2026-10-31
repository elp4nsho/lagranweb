// App del conductor (móvil primero): ruta del día con mapa, optimización, reordenamiento, próximas
// paradas, ficha de cada parada con indicaciones e historial de la dirección, entrega con prueba
// (firma, foto, RUT, PIN, cobro), intento fallido, retiros, pausas, combustible, checklist y cierre.
import './boot.js';
import { app, db, S, SHIP, ROUTE, machineOf, stBadge, userName, companyName, hhmm, km, kg, money, escape, FAIL_REASONS, RELATIONS, CHECK_ITEMS, NOTE_TAGS, todayStr } from './app.js';
import * as ops from './ops.js';
import { routeMap, proofCard, shipTimeline, capBars, progressOf, signaturePad, flagsHtml, chatBox, photoSvg, svcLabel, sigSvg } from './views.js';
import { cityMap, DEPOT, dist, stair, nearestComuna, pathOf, COMUNA } from './geo.js';
import { lastAttempt, isPending, dayAt } from './engine.js';
import { html, raw, toast, modal, confirm, dateTime, ago, date as fmtDate } from '../../assets/core/ui.js';
import { pageHead, kpis, card, emptyState, kv, badge, timeline } from '../../assets/core/blocks.js';
import { rut } from '../../assets/core/domain.js';

const myRoute = ctx => ops.driverRoute(ctx.user.id);
const sigOf = (r) => r ? JSON.stringify([r.status, r.order, r.lastAt, r.breaks, r.kmDone, ...r.order.map(id => { const s = ops.get(id); return s && [s.status, (s.notes || []).length, s.request, s.prefWin, s.safePlace]; }), db.count('messages', m => r.order.includes(m.shipmentId))]) : 'none';
// Refresco: repinta solo si cambió algo de mi ruta (las otras rutas simuladas escriben cada 20 s).
const live = (paint, ctx) => { let sig = sigOf(myRoute(ctx)); return { refresh() { const n = sigOf(myRoute(ctx)); if (n !== sig) { sig = n; paint(); } } }; };
const noRoute = () => emptyState({ icon: '🗓️', title: 'No tienes ruta asignada hoy', text: 'Despacho aún no te asigna paradas. Cuando lo haga, aparecerán aquí con su mapa.', action: '<a class="btn" href="#/historial">Ver mi historial</a>' });

// ================= Mi ruta =================
function routeView(view, ctx) {
  const paint = () => {
    const r = myRoute(ctx);
    if (!r) { view.innerHTML = pageHead('Mi ruta de hoy') + noRoute(); return; }
    const p = ops.plan(r), v = db.get('vehicles', r.vehicleId), z = db.get('zones', r.zoneId), pr = progressOf(r, p);
    const next = p.pending[0];
    const inBreak = p.inBreak;
    const late = p.ev.legs.filter(l => l.late > 0).length;
    const actions = [
      r.status === 'planificada' ? '<a class="btn btn-primary" href="#/inicio">▶ Iniciar jornada</a>' : '',
      r.status === 'en_curso' ? (inBreak ? '<button class="btn btn-accent" data-break="end">☕ Terminar colación</button>' : '<button class="btn" data-break="start">☕ Colación</button>') : '',
      r.status !== 'cerrada' && p.pending.length > 2 ? '<button class="btn" data-optimize>✨ Optimizar ruta</button>' : '',
      r.status === 'en_curso' ? '<a class="btn btn-ghost" href="#/cierre">🏁 Cierre</a>' : ''
    ].join('');
    view.innerHTML = html`${pageHead(`Ruta ${r.code}`, raw(`${ROUTE.badge(r.status)} · ${escape(z?.name || '')} · ${escape(v?.plate || '')} ${escape(v?.model || '')}`), actions)}
      ${r.status === 'planificada' ? raw(`<div class="rp-callout"><b>Antes de salir</b><span>Haz el checklist del vehículo, registra odómetro y combustible y escanea la carga. Puedes optimizar o reordenar las paradas ahora.</span><a class="btn btn-sm btn-primary" href="#/inicio">Ir al checklist</a></div>`) : ''}
      ${inBreak ? raw('<div class="rp-callout warn"><b>En colación</b><span>Las ETA de tus paradas ya consideran la pausa. Termínala para seguir entregando.</span></div>') : ''}
      ${kpis([
        { label: 'Paradas', value: `${pr.done}/${pr.total}`, hint: `${p.pending.length} pendientes`, icon: '📍' },
        { label: 'Recorrido', value: km(p.kmDone), hint: `faltan ${km(p.kmLeft)} (con regreso)`, icon: '🛣️' },
        { label: 'Término estimado', value: hhmm(p.end), hint: late ? `${late} fuera de ventana` : 'todas en ventana', icon: '🏁' },
        { label: 'Efectivo cobrado', value: money(r.cash || 0), hint: 'pagos contra entrega', icon: '💵' }
      ])}
      <div class="progress rp-bigprog" aria-label="Avance de la ruta"><i style="--v:${pr.pct}%"></i></div>
      ${next && r.status === 'en_curso' ? raw(nextCard(r, next, p)) : ''}
      ${!next && r.status === 'en_curso' ? raw(`<div class="rp-callout ok"><b>¡Ruta completa!</b><span>Vuelve al ${escape(DEPOT.name)} y cierra la jornada: devolución de paquetes y cuadratura de caja.</span><a class="btn btn-sm btn-primary" href="#/cierre">Cerrar jornada</a></div>`) : ''}
      <div class="rp-route-grid">
        <section class="card rp-mapcard">${raw(routeMap(r, { p }))}<div class="rp-legend small muted"><span><i class="lg next"></i>Siguiente</span><span><i class="lg stop"></i>Pendiente</span><span><i class="lg pickup"></i>Retiro</span><span><i class="lg done"></i>Hecha</span><span><i class="lg fail"></i>Fallida</span></div>${r.optimized ? raw(`<p class="small muted" style="margin:8px 0 0">Última optimización ${escape(hhmm(Date.parse(r.optimized.at)))}: ${km(r.optimized.kmBefore)} → <b>${km(r.optimized.kmAfter)}</b></p>`) : ''}</section>
        <section class="card">
          <div class="k-card-head"><div><h3>Próximos envíos</h3><p>Arrastra o usa ↑ ↓ para cambiar el orden.</p></div></div>
          ${p.pending.length ? raw(`<ol class="rp-queue" data-queue>${p.pending.map((s, i) => queueRow(s, i, p, r)).join('')}</ol>`) : raw('<p class="muted small">No quedan paradas pendientes.</p>')}
          ${p.done.length ? raw(`<details class="rp-donelist"><summary>Realizadas (${p.done.length})</summary><ul>${p.done.map(s => `<li><a href="#/parada/${s.id}"><span class="badge ${ops.isDone(s) ? 'badge-success' : 'badge-danger'}">${ops.isDone(s) ? '✓' : '✕'}</span> ${escape(s.code)} · ${escape(s.address)} <small class="muted">${escape(hhmm(Date.parse(lastAttempt(s, r.id).at)))}</small></a></li>`).join('')}</ul></details>`) : ''}
        </section>
      </div>
      ${raw(card('Carga del vehículo', capBars(r), { sub: `${v?.plate} · capacidad ${v?.capKg} kg / ${Math.round((v?.capL || 0) / 100) / 10} m³` }))}`;
    wire(r, p);
  };
  function wire(r, p) {
    view.querySelector('[data-optimize]')?.addEventListener('click', () => optimizeModal(r));
    view.querySelectorAll('[data-break]').forEach(b => b.addEventListener('click', () => { try { b.dataset.break === 'start' ? ops.startBreak(db.get('routes', r.id)) : ops.endBreak(db.get('routes', r.id)); toast(b.dataset.break === 'start' ? 'Colación iniciada' : 'De vuelta en ruta', 'success'); } catch (e) { toast(e.message, 'warning'); } }));
    const q = view.querySelector('[data-queue]');
    if (q) wireQueue(q, r);
    view.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => navigateModal(r, ops.get(b.dataset.nav))));
    view.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => callModal(ops.get(b.dataset.call))));
    view.querySelectorAll('[data-chatopen]').forEach(b => b.addEventListener('click', () => chatModal(ops.get(b.dataset.chatopen))));
  }
  paint();
  const lv = live(paint, ctx);
  const t = setInterval(() => { if (!view.isConnected) return clearInterval(t); if (!document.querySelector('.modal-backdrop') && !view.querySelector('.dragging')) paint(); }, 60000);
  return lv;
}
function nextCard(r, s, p) {
  const l = p.eta[s.id];
  const n = (s.notes || []).at(-1);
  return html`<section class="card rp-next">
    <div class="rp-next-head"><span class="eyebrow">Siguiente parada · ${s.kind === 'retiro' ? 'Retiro' : 'Entrega'}</span><span class="rp-eta"><b>${hhmm(l.eta)}</b><small>${km(l.km)} · ${Math.max(1, Math.round((l.km / ops.opts().speed) * 60))} min</small></span></div>
    <a class="rp-next-addr" href="#/parada/${s.id}"><b>${s.address}</b><span>${s.comuna} · ${s.rName}</span></a>
    <div class="rp-flags">${raw(flagsHtml(s))}</div>
    ${n ? html`<p class="rp-note">📝 ${[...(n.tags || []), n.text].filter(Boolean).join(' · ')}</p>` : ''}
    <div class="rp-next-acts">
      <button class="btn btn-primary" data-nav="${s.id}">🧭 Navegar</button>
      <button class="btn" data-call="${s.id}">📞 Llamar</button>
      <button class="btn" data-chatopen="${s.id}">💬 Chat</button>
      <a class="btn btn-accent" href="#/parada/${s.id}">${s.kind === 'retiro' ? '📥 Retirar' : '✓ Entregar'}</a>
    </div></section>`;
}
function queueRow(s, i, p, r) {
  const l = p.eta[s.id];
  const late = l?.late > 0;
  return `<li class="rp-qrow ${late ? 'late' : ''}" draggable="true" data-id="${escape(s.id)}">
    <span class="rp-qhandle" aria-hidden="true" title="Arrastrar">⋮⋮</span>
    <span class="rp-qnum" style="--mk:${escape(r.color)}">${i + 1}</span>
    <a class="rp-qmain" href="#/parada/${escape(s.id)}"><b>${escape(s.address)}</b><small>${escape(s.comuna)} · ${escape(s.rName)}</small><span class="rp-flags">${flagsHtml(s)}</span></a>
    <span class="rp-qeta"><b>${l ? escape(hhmm(l.eta)) : '—'}</b><small>${late ? `+${Math.round(l.late)} min` : l?.wait > 1 ? `espera ${Math.round(l.wait)}′` : l ? km(l.km) : ''}</small></span>
    <span class="rp-qmove"><button type="button" class="btn btn-ghost btn-sm btn-icon" data-up="${escape(s.id)}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn btn-ghost btn-sm btn-icon" data-down="${escape(s.id)}" aria-label="Bajar" ${i === p.pending.length - 1 ? 'disabled' : ''}>↓</button></span></li>`;
}
function wireQueue(q, r) {
  const ids = () => [...q.querySelectorAll('[data-id]')].map(li => li.dataset.id);
  const commit = order => { const fresh = db.get('routes', r.id); ops.reorder(fresh, order); toast('Orden actualizado: ETA recalculadas', 'success'); };
  q.addEventListener('click', e => {
    const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]');
    if (!up && !down) return;
    const o = ids(), id = (up || down).dataset[up ? 'up' : 'down'], i = o.indexOf(id), j = up ? i - 1 : i + 1;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    commit(o);
  });
  let dragEl = null;
  q.addEventListener('dragstart', e => { dragEl = e.target.closest('[data-id]'); if (!dragEl) return; dragEl.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragEl.dataset.id); } catch (er) {} });
  q.addEventListener('dragover', e => { if (!dragEl) return; e.preventDefault(); const over = e.target.closest('[data-id]'); if (!over || over === dragEl) return; const rect = over.getBoundingClientRect(); over[e.clientY > rect.top + rect.height / 2 ? 'after' : 'before'](dragEl); });
  q.addEventListener('dragend', () => { if (!dragEl) return; dragEl.classList.remove('dragging'); dragEl = null; const o = ids(); const cur = ops.plan(db.get('routes', r.id)).pending.map(s => s.id); if (o.join() !== cur.join()) commit(o); });
}

// ---------- Optimizar ----------
function optimizeModal(r) {
  const fresh = db.get('routes', r.id);
  const res = ops.computeOptimization(fresh);
  const b = res.before, a = res.after;
  const preview = { ...fresh, order: [...fresh.order.filter(id => !res.order.includes(id)), ...res.order] };
  const diff = (x, y, f, better = 'down') => { const d = y - x; const good = better === 'down' ? d < 0 : d > 0; return `<span class="${d === 0 ? 'muted' : good ? 'rp-good' : 'rp-bad'}">${d === 0 ? 'sin cambio' : (d > 0 ? '+' : '−') + f(Math.abs(d))}</span>`; };
  const m = modal({
    title: 'Optimizar ruta', size: 'lg',
    body: html`<p class="muted" style="margin-top:0">Vecino más cercano desde tu posición actual + mejoras 2-opt y reubicación, respetando ventanas horarias y prioridad express. Solo se reordenan las ${res.order.length} paradas pendientes.</p>
      <div class="rp-opt">
        <div class="rp-opt-col"><span class="eyebrow">Orden actual</span><b>${km(b.km)}</b><span>Término ${hhmm(b.end)}</span><span>${b.lateCount} fuera de ventana${b.lateMin ? ` (${Math.round(b.lateMin)} min)` : ''}</span></div>
        <div class="rp-opt-arrow" aria-hidden="true">→</div>
        <div class="rp-opt-col best"><span class="eyebrow">Optimizado</span><b>${km(a.km)}</b><span>Término ${hhmm(a.end)}</span><span>${a.lateCount} fuera de ventana${a.lateMin ? ` (${Math.round(a.lateMin)} min)` : ''}</span></div>
      </div>
      <p class="small">${raw(diff(b.km, a.km, v => km(v)))} · ${raw(diff(b.end, a.end, v => `${Math.round(v / 6e4)} min`))} · ${raw(diff(b.lateCount, a.lateCount, v => `${v} atrasos`))}</p>
      ${res.changed ? raw(`<div class="rp-mapmini">${routeMap(preview, { vehicle: false, ratio: 1.8, label: 'Vista previa de la ruta optimizada' })}</div>`) : raw('<div class="rp-callout ok"><b>Tu orden ya es óptimo</b><span>No encontramos una secuencia mejor para las paradas pendientes.</span></div>')}`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button>${res.changed ? '<button class="btn btn-primary" data-apply>Aplicar nuevo orden</button>' : ''}`
  });
  m.el.querySelector('[data-apply]')?.addEventListener('click', () => { ops.applyOptimization(db.get('routes', r.id), res); m.close(); toast(`Ruta optimizada: ${km(b.km - a.km)} menos`, 'success'); });
}

// ---------- Navegar / llamar / chat (simulados) ----------
function navigateModal(r, s) {
  const p = ops.plan(r), pos = ops.vehiclePos(r, p);
  const path = stair(pos, s);
  const legs = [];
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y) * 1000;
    if (d < 30) continue;
    const c = nearestComuna(path[i]);
    const street = c.streets[Math.floor((path[i].x * 7 + path[i].y * 3) % c.streets.length + c.streets.length) % c.streets.length];
    const dir = i === 1 ? 'Sal' : Math.abs(path[i].x - path[i - 1].x) > Math.abs(path[i].y - path[i - 1].y) ? (path[i].x > path[i - 1].x ? 'Gira a la derecha' : 'Gira a la izquierda') : (path[i].y > path[i - 1].y ? 'Gira a la derecha' : 'Gira a la izquierda');
    legs.push(`${dir} por ${street} y sigue ${d > 950 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 10) * 10 + ' m'}`);
  }
  legs.push(`Llegas a ${s.address}${s.kind === 'retiro' ? ' (retiro)' : ''}`);
  const d = dist(pos, s), min = Math.max(1, Math.round((d / ops.opts().speed) * 60));
  const m = modal({ title: `Navegar a ${s.address}`, size: 'lg',
    body: html`<div class="rp-mapmini">${raw(cityMap({ points: [{ x: s.x, y: s.y, kind: 'next', label: '★' }], vehicles: [{ ...pos, color: r.color }], lines: [{ pts: path, kind: 'route', color: r.color }], fit: [pos, s], minW: 2.5, ratio: 1.8, label: 'Trayecto a la parada', depot: false }))}</div>
      <p class="rp-navsum"><b>${min} min</b> · ${km(d)} · llegada ${hhmm(Date.now() + min * 6e4)}</p>
      <ol class="rp-steps">${legs.map(l => html`<li>${l}</li>`)}</ol>
      <p class="small muted">Navegación simulada: en la app real se abre Waze o Google Maps con la dirección.</p>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-arrive>📍 Llegué</button>` });
  m.el.querySelector('[data-arrive]').onclick = () => { db.update('shipments', s.id, { arrivedAt: new Date().toISOString() }); db.log('ruta', `${s.code}: conductor llegó a la dirección`, app.auth.current()?.id); m.close(); location.hash = '#/parada/' + s.id; };
}
function callModal(s) {
  const masked = s.rPhone.replace(/\d(?=(?:\D*\d){4})/g, '•');
  const m = modal({ title: 'Llamada', body: html`<div class="rp-call"><span class="avatar rp-call-av">${s.rName.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><b>${s.rName}</b><span class="muted">${masked} · número protegido</span><span class="rp-call-t" data-t>Llamando…</span></div>`, foot: '<button class="btn btn-danger" data-close>Colgar</button>' });
  let t = 0;
  const iv = setInterval(() => { if (!m.el.isConnected) return clearInterval(iv); t++; const el = m.el.querySelector('[data-t]'); if (el) el.textContent = t < 3 ? 'Llamando…' : `En llamada ${String(Math.floor((t - 3) / 60)).padStart(2, '0')}:${String((t - 3) % 60).padStart(2, '0')}`; }, 1000);
  db.log('llamada', `Llamada a ${s.rName} (${s.code})`, app.auth.current()?.id);
}
export function chatModal(s, who = 'conductor') {
  const quick = who === 'conductor' ? ['Voy en camino 🚚', 'Estoy afuera', '¿Puede bajar a recibir?', 'Llego en 10 minutos', 'No encuentro la dirección, ¿me orienta?'] : ['Ok, gracias', 'Estoy en casa', 'Déjelo con el conserje'];
  const m = modal({ title: `Chat · ${s.code}`, body: html`<div data-box>${raw(chatBox(s, who))}</div><div class="rp-quick">${quick.map(q => html`<button type="button" class="chip" data-q="${q}">${q}</button>`)}</div><form class="row" data-f style="margin-top:10px;flex-wrap:nowrap"><input class="input" name="t" placeholder="Escribe un mensaje…" aria-label="Mensaje" maxlength="400" autocomplete="off"><button class="btn btn-primary">Enviar</button></form>`, foot: '<button class="btn btn-ghost" data-close>Cerrar</button>' });
  const box = m.el.querySelector('[data-box]');
  const paint = () => { box.innerHTML = chatBox(ops.get(s.id), who); const c = box.querySelector('.rp-chat'); c.scrollTop = c.scrollHeight; };
  paint();
  const off = db.subscribe(() => { if (!m.el.isConnected) return off(); paint(); });
  const send = t => { try { ops.sendMessage(ops.get(s.id), who, t); } catch (e) { toast(e.message, 'warning'); } };
  m.el.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
  m.el.querySelector('[data-f]').addEventListener('submit', e => { e.preventDefault(); const i = e.target.t; send(i.value); i.value = ''; i.focus(); });
}

// ================= Parada =================
function stopView(view, ctx) {
  const paint = () => {
    const s = ops.get(ctx.params.id);
    const r = myRoute(ctx);
    if (!s || !r || !r.order.includes(s.id)) { view.innerHTML = emptyState({ icon: '🔎', title: 'Parada no encontrada', text: 'No está en tu ruta de hoy.', action: '<a class="btn" href="#/">← Volver a mi ruta</a>' }); return; }
    const p = ops.plan(r), l = p.eta[s.id], idx = p.pending.findIndex(x => x.id === s.id);
    const pending = isPending(s), active = r.status === 'en_curso' && pending && !p.inBreak;
    const { notes, past } = ops.addressHistory(s);
    const c = db.get('companies', s.companyId);
    const isPick = s.kind === 'retiro';
    view.innerHTML = html`<a href="#/" class="small">← Mi ruta</a>
      ${pageHead(`${idx >= 0 ? idx + 1 + '. ' : ''}${s.address}`, raw(`${stBadge(s)} · ${escape(s.code)} · ${escape(s.comuna)}`), '')}
      ${s.request ? raw(`<div class="rp-callout warn"><b>${s.request.kind === 'reprogramar' ? `El destinatario pidió reprogramar para el ${escape(s.request.date)}` : `El destinatario pidió llevarlo a ${escape(db.get('points', s.request.pointId)?.name || 'un punto de retiro')}`}</b><span>No lo entregues hoy: márcalo como no entregado con el motivo "Reprogramado por el destinatario".</span></div>`) : ''}
      ${r.status === 'planificada' ? raw('<div class="rp-callout"><b>Tu ruta aún no comienza</b><span>Inicia la jornada para poder entregar.</span><a class="btn btn-sm btn-primary" href="#/inicio">Iniciar jornada</a></div>') : ''}
      ${p.inBreak && pending ? raw('<div class="rp-callout warn"><b>Estás en colación</b><span>Termínala desde "Mi ruta" para continuar.</span></div>') : ''}
      <div class="rp-stop-acts">
        <button class="btn" data-nav>🧭 Navegar</button><button class="btn" data-call>📞 Llamar</button><button class="btn" data-chat>💬 Chat</button>
        ${active ? html`<button class="btn btn-primary" data-deliver>${isPick ? '📥 Retiro realizado' : '✓ Entregar'}</button><button class="btn btn-danger" data-fail>✕ ${isPick ? 'Retiro fallido' : 'No entregado'}</button>` : ''}
        ${s.status === 'fallido' && r.status === 'en_curso' ? raw('<button class="btn" data-retry>↻ Reintentar hoy</button>') : ''}
      </div>
      <div class="k-grid-main">
        <div class="stack">
          <section class="card">
            <div class="k-card-head"><div><h3>${isPick ? 'Retiro en bodega' : 'Destinatario'}</h3><p>${s.rName} · ${s.rPhone.replace(/\d(?=(?:\D*\d){4})/g, '•')}</p></div>${l ? raw(`<span class="rp-eta"><b>${escape(hhmm(l.eta))}</b><small>ETA${l.late > 0 ? ` · ${Math.round(l.late)} min tarde` : ''}</small></span>`) : ''}</div>
            <div class="rp-flags">${raw(flagsHtml(s))}</div>
            ${(s.notes || []).length || s.safePlace || s.prefWin ? html`<ul class="rp-notes">${(s.notes || []).slice().reverse().map(n => html`<li><span>${(n.tags || []).map(t => html`<span class="chip active rp-tag">${t}</span>`)} ${n.text}</span><small>${n.by === 'destinatario' ? 'Destinatario' : n.by === 'remitente' ? 'Remitente' : 'Despacho'} · ${ago(n.at)}</small></li>`)}${s.safePlace ? html`<li><span><b>Lugar seguro:</b> ${s.safePlace}</span><small>Preferencia del destinatario</small></li>` : ''}${s.prefWin ? html`<li><span><b>Prefiere:</b> ${s.prefWin.replace('-', ' a ')}</span><small>Ventana preferida</small></li>` : ''}</ul>` : raw('<p class="muted small">Sin indicaciones del destinatario.</p>')}
          </section>
          <section class="card">
            <div class="k-card-head"><div><h3>Historial de la dirección</h3><p>Notas de conductores en entregas anteriores aquí.</p></div><button class="btn btn-sm" data-addnote>＋ Nota</button></div>
            ${notes.length ? html`<ul class="rp-notes">${notes.map(n => html`<li><span>${n.tag ? html`<span class="badge badge-info">${n.tag}</span> ` : ''}${n.text}</span><small>${userName(n.by)} · ${fmtDate(n.at)}</small></li>`)}</ul>` : raw('<p class="muted small">Nadie ha dejado notas en esta dirección.</p>')}
            ${past.length ? html`<details class="rp-donelist"><summary>Entregas anteriores (${past.length})</summary><ul>${past.slice(0, 6).map(x => { const a = lastAttempt(x); return html`<li><span class="badge ${a.ok ? 'badge-success' : 'badge-danger'}">${a.ok ? '✓' : '✕'}</span> ${fmtDate(a.at)} · ${a.ok ? `Recibió ${x.proof?.name || '—'} (${x.proof?.relation || ''})` : a.reason}</li>`; })}</ul></details>` : ''}
          </section>
          ${s.proof ? raw(card(isPick ? 'Comprobante de retiro' : 'Prueba de entrega', proofCard(s))) : ''}
        </div>
        <div class="stack">
          <section class="card rp-mapcard">${raw(routeMap(r, { p, focus: s.id, ratio: 1.3 }))}</section>
          ${raw(card(isPick ? 'Detalle del retiro' : 'Paquete', kv([
            ['Remitente', c?.name], ['Contenido', s.desc], ['Referencia', s.ref], ['Servicio', svcLabel(s)], ['Peso / volumen', `${kg(s.weight)} · ${s.vol} L`], ['Bultos', String(s.pieces)],
            s.cod ? ['Cobrar', raw(`<b>${money(s.cod)}</b>`)] : null, s.requirePin ? ['PIN', 'Exigir al entregar'] : null, ['Intentos', String((s.attempts || []).length)]
          ])))}
          ${raw(card('Seguimiento', shipTimeline(s)))}
        </div>
      </div>`;
    view.querySelector('[data-nav]').onclick = () => navigateModal(r, s);
    view.querySelector('[data-call]').onclick = () => callModal(s);
    view.querySelector('[data-chat]').onclick = () => chatModal(s);
    view.querySelector('[data-addnote]').onclick = () => addNoteModal(s);
    view.querySelector('[data-deliver]')?.addEventListener('click', () => deliverModal(r, s));
    view.querySelector('[data-fail]')?.addEventListener('click', () => failModal(r, s));
    view.querySelector('[data-retry]')?.addEventListener('click', () => { ops.retryLater(db.get('routes', r.id), ops.get(s.id)); toast('Parada al final de la ruta', 'success'); });
  };
  paint();
  return live(paint, ctx);
}
function addNoteModal(s) {
  const tags = ['Conserjería', 'Timbre malo', 'Perro bravo', 'Acceso', 'Estacionamiento', 'Horario', 'Escaleras', 'Condominio'];
  const m = modal({ title: 'Nota para próximas entregas', body: html`<p class="muted" style="margin-top:0">La verán todos los conductores que entreguen en ${s.address}, ${s.comuna}.</p><div class="field"><label for="an-tag">Tipo</label><select class="select" id="an-tag">${tags.map(t => html`<option>${t}</option>`)}</select></div><div class="field"><label for="an-t">Nota *</label><textarea class="textarea" id="an-t" maxlength="240" placeholder="Ej: el conserje recibe hasta las 20:00"></textarea></div>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar nota</button>' });
  m.el.querySelector('[data-ok]').onclick = () => { const t = m.el.querySelector('#an-t').value.trim(); if (t.length < 4) return toast('Escribe la nota (mínimo 4 caracteres)', 'warning'); ops.addAddressNote(s, t, m.el.querySelector('#an-tag').value); m.close(); toast('Nota guardada', 'success'); };
}

// ---------- Entregar ----------
function deliverModal(r, s0) {
  const s = ops.get(s0.id);
  const isPick = s.kind === 'retiro';
  let photo = false, busy = false;
  const body = html`<form class="stack rp-deliver" novalidate>
    ${isPick ? '' : html`<div class="k-form">
      <div class="field"><label for="dv-rel">Quién recibe *</label><select class="select" id="dv-rel" name="relation">${RELATIONS.map(x => html`<option ${x === 'Titular' ? 'selected' : ''}>${x}</option>`)}</select></div>
      <div class="field"><label for="dv-name">Nombre *</label><input class="input" id="dv-name" name="name" value="${s.rName}" autocomplete="off"></div>
      <div class="field"><label for="dv-rut">RUT ${s.cod || s.requirePin ? '*' : '(obligatorio si no es el titular)'}</label><input class="input" id="dv-rut" name="rut" placeholder="12.345.678-9" autocomplete="off"></div>
      ${s.requirePin ? html`<div class="field"><label for="dv-pin">PIN del destinatario *</label><input class="input" id="dv-pin" name="pin" inputmode="numeric" maxlength="4" placeholder="4 dígitos" autocomplete="off"><small class="muted">Lo recibió por SMS (demo: ${s.pin})</small></div>` : ''}
    </div>`}
    ${s.pieces > 1 ? html`<div class="k-form"><div class="field"><label for="dv-pc">${isPick ? 'Bultos retirados' : 'Bultos entregados'}</label><input class="input" id="dv-pc" name="pieces" type="number" min="1" max="${s.pieces}" value="${s.pieces}"></div><div class="field" data-partial hidden><label for="dv-pr">Motivo de entrega parcial *</label><select class="select" id="dv-pr" name="partialReason"><option value="">—</option><option>Un bulto dañado: vuelve al CD</option><option>Bulto faltante en la carga</option><option>Destinatario rechazó un bulto</option></select></div></div>` : ''}
    ${s.cod ? html`<fieldset class="rp-cod-box"><legend>Cobro contra entrega · <b>${money(s.cod)}</b></legend><div class="k-form">
      <div class="field"><label for="dv-pm">Medio de pago *</label><select class="select" id="dv-pm" name="method"><option value="">—</option><option>Efectivo</option><option>Tarjeta (POS)</option><option>Transferencia</option></select></div>
      <div class="field" data-cash hidden><label for="dv-rc">Efectivo recibido</label><input class="input" id="dv-rc" name="received" type="number" min="0" step="10" value="${s.cod}"><small class="muted" data-change>Vuelto: $0</small></div></div></fieldset>` : ''}
    ${isPick ? '' : html`<label class="check"><input type="checkbox" name="safe" ${s.safePlace ? '' : ''}> Dejar en lugar seguro sin firma (requiere foto)</label>
    <div class="field" data-safe hidden><label for="dv-sp">Lugar seguro</label><input class="input" id="dv-sp" name="safePlace" value="${s.safePlace || ''}" placeholder="Ej: conserjería, bodega del edificio"></div>`}
    <div data-sigwrap><div class="row between"><label>Firma de quien ${isPick ? 'entrega los bultos' : 'recibe'} *</label><button type="button" class="btn btn-ghost btn-sm" data-clear>Borrar</button></div><canvas class="rp-pad" aria-label="Recuadro para firmar"></canvas></div>
    <div class="row"><button type="button" class="btn" data-photo>📷 Tomar foto</button><span class="small muted" data-photoinfo>Sin foto</span></div>
    <div data-photoprev hidden></div>
    ${isPick ? '' : html`<details><summary class="small">Agregar nota para próximas entregas en esta dirección</summary><div class="field" style="margin-top:8px"><textarea class="textarea" name="addrNote" maxlength="240" placeholder="Ej: conserje recibe hasta las 20:00"></textarea></div></details>`}
  </form>`;
  const m = modal({ title: `${isPick ? 'Retiro' : 'Entrega'} · ${s.code}`, size: 'lg', body, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${isPick ? 'Confirmar retiro' : 'Confirmar entrega'}</button>` });
  const f = m.el.querySelector('form');
  const pad = signaturePad(f.querySelector('.rp-pad'));
  f.querySelector('[data-clear]').onclick = () => pad.clear();
  f.querySelector('[data-photo]').onclick = () => { photo = !photo; f.querySelector('[data-photoprev]').hidden = !photo; f.querySelector('[data-photoprev]').innerHTML = photo ? photoSvg(s.id + Date.now()) : ''; f.querySelector('[data-photoinfo]').textContent = photo ? 'Foto adjunta ✓ (toca para quitar)' : 'Sin foto'; f.querySelector('[data-photo]').textContent = photo ? '🗑 Quitar foto' : '📷 Tomar foto'; };
  const rel = f.elements.relation, name = f.elements.name;
  rel?.addEventListener('change', () => { if (rel.value === 'Titular') name.value = s.rName; else if (name.value === s.rName) name.value = ''; });
  f.elements.pieces?.addEventListener('input', () => { f.querySelector('[data-partial]').hidden = !(+f.elements.pieces.value < s.pieces); });
  f.elements.method?.addEventListener('change', () => { f.querySelector('[data-cash]').hidden = f.elements.method.value !== 'Efectivo'; });
  f.elements.received?.addEventListener('input', () => { const ch = +f.elements.received.value - s.cod; f.querySelector('[data-change]').textContent = ch >= 0 ? `Vuelto: ${money(ch)}` : `Faltan ${money(-ch)}`; });
  f.elements.safe?.addEventListener('change', () => { const on = f.elements.safe.checked; f.querySelector('[data-safe]').hidden = !on; f.querySelector('[data-sigwrap]').hidden = on; });
  m.el.querySelector('[data-ok]').onclick = () => {
    if (busy) return;
    const fr = db.get('routes', r.id), cur = ops.get(s.id);
    if (!isPending(cur)) { m.close(); return toast('Esta parada ya fue registrada', 'info'); }
    const d = isPick ? { name: s.rName, relation: 'Contacto', rut: '', sig: pad.strokes, photo, pieces: +(f.elements.pieces?.value || s.pieces) }
      : { relation: rel.value, name: name.value, rut: f.elements.rut.value.trim(), pin: f.elements.pin?.value, sig: pad.strokes, photo, safePlace: f.elements.safe.checked ? f.elements.safePlace.value.trim() || 'Lugar seguro' : '',
        pieces: +(f.elements.pieces?.value || s.pieces), partialReason: f.elements.partialReason?.value, payment: s.cod ? { method: f.elements.method.value, received: +(f.elements.received?.value || 0) } : null, addrNote: f.elements.addrNote?.value };
    if (isPick && pad.isEmpty()) return toast('Falta la firma del contacto', 'warning');
    busy = true;
    try {
      ops.deliver(fr, cur, d);
      m.close();
      toast(isPick ? `Retiro ${s.code} registrado` : `${s.code} entregado ✓`, 'success');
      const nxt = ops.plan(db.get('routes', r.id)).pending[0];
      location.hash = nxt ? '#/' : '#/cierre';
    } catch (e) { busy = false; toast(e.message, 'warning'); }
  };
}

// ---------- No entregado ----------
function failModal(r, s) {
  const pts = db.query('points', p => p.active !== false).map(p => ({ p, d: dist(p, s) })).sort((a, b) => a.d - b.d).slice(0, 4);
  const isPick = s.kind === 'retiro';
  const reasons = isPick ? ['Bodega cerrada', 'Carga no estaba lista', 'Excede la capacidad del vehículo', 'Sin tiempo en la jornada'] : FAIL_REASONS;
  const preset = s.request ? 'Reprogramado por el destinatario' : '';
  let busy = false;
  const m = modal({ title: `${isPick ? 'Retiro fallido' : 'No entregado'} · ${s.code}`, size: 'lg', body: html`<form class="stack" novalidate>
      <div class="field"><label for="fl-r">Motivo *</label><select class="select" id="fl-r" name="reason"><option value="">Elige un motivo…</option>${reasons.map(x => html`<option ${x === preset ? 'selected' : ''}>${x}</option>`)}</select></div>
      <div class="field"><label for="fl-n">Detalle</label><textarea class="textarea" id="fl-n" name="note" maxlength="240" placeholder="Ej: toqué 3 veces, nadie respondió; llamé sin respuesta"></textarea></div>
      ${isPick ? '' : raw('<label class="check"><input type="checkbox" name="notice" checked> Dejé aviso de visita en la puerta</label>')}
      <fieldset class="rp-radios"><legend>¿Qué hacemos con ${isPick ? 'el retiro' : 'el paquete'}?</legend>
        <label class="check"><input type="radio" name="next" value="reintentar"> Reintentar hoy más tarde (va al final de la ruta)</label>
        <label class="check"><input type="radio" name="next" value="manana" checked> Volver al CD y reprogramar</label>
        ${isPick ? '' : html`<label class="check"><input type="radio" name="next" value="punto" ${s.request?.kind === 'punto' ? 'checked' : ''}> Enviar a punto de retiro</label>
        <div class="field" data-pt hidden><label for="fl-p">Punto de retiro</label><select class="select" id="fl-p" name="pointId">${pts.map(({ p, d }) => html`<option value="${p.id}" ${s.request?.pointId === p.id ? 'selected' : ''}>${p.name} · ${km(d)}</option>`)}</select></div>`}
      </fieldset></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Registrar intento</button>' });
  const f = m.el.querySelector('form');
  const sync = () => { const pt = f.querySelector('[data-pt]'); if (pt) pt.hidden = f.elements.next.value !== 'punto'; };
  f.addEventListener('change', sync); sync();
  m.el.querySelector('[data-ok]').onclick = () => {
    if (busy) return;
    if (!isPending(ops.get(s.id))) { m.close(); return toast('Esta parada ya fue registrada', 'info'); }
    busy = true;
    try {
      ops.failStop(db.get('routes', r.id), ops.get(s.id), { reason: f.elements.reason.value, note: f.elements.note.value.trim(), next: f.elements.next.value, pointId: f.elements.pointId?.value || '', notice: !!f.elements.notice?.checked });
      m.close(); toast('Intento registrado; despacho fue notificado', 'success'); location.hash = '#/';
    } catch (e) { busy = false; toast(e.message, 'warning'); }
  };
}

// ================= Inicio de jornada =================
function startView(view, ctx) {
  const r = myRoute(ctx);
  if (!r) { view.innerHTML = pageHead('Inicio de jornada') + noRoute(); return; }
  const v = db.get('vehicles', r.vehicleId);
  if (r.status !== 'planificada') {
    const ck = r.checklist || { items: {} };
    view.innerHTML = html`${pageHead('Inicio de jornada', `Ruta ${r.code} iniciada ${r.startedAt ? 'a las ' + hhmm(Date.parse(r.startedAt)) : ''}`, '<a class="btn" href="#/">Ir a mi ruta</a>')}
      ${raw(card('Checklist del vehículo', `<ul class="rp-checksum">${CHECK_ITEMS.map(([k, l]) => `<li><span>${escape(l)}</span>${ck.items?.[k] === 'obs' ? '<span class="badge badge-warning">Observado</span>' : ck.items?.[k] === 'falla' ? '<span class="badge badge-danger">Falla</span>' : '<span class="badge badge-success">OK</span>'}</li>`).join('')}</ul>${ck.obs ? `<p class="small"><b>Observaciones:</b> ${escape(ck.obs)}</p>` : ''}`, { sub: `${v?.plate} · ${v?.model}` }))}
      ${raw(card('Registro de salida', kv([['Odómetro inicial', `${(r.odoStart || 0).toLocaleString('es-CL')} km`], ['Combustible', `${r.fuelStart ?? '—'} %`], ['Paquetes cargados', String((r.loaded || []).length)]])))}`;
    return;
  }
  const stops = r.order.map(ops.get).filter(Boolean);
  const loadOrder = stops.filter(s => s.kind === 'entrega').slice().reverse();
  const scanned = new Set();
  view.innerHTML = html`${pageHead('Inicio de jornada', `Ruta ${r.code} · ${v?.plate} ${v?.model}`, '<a class="btn btn-ghost" href="#/">← Mi ruta</a>')}
    <form class="stack" novalidate data-start>
      <section class="card"><div class="k-card-head"><div><h3>1. Checklist del vehículo</h3><p>Los ítems marcados con ⚠ son críticos: con falla no puedes salir.</p></div><button type="button" class="btn btn-sm" data-allok>Todo OK</button></div>
        <div class="rp-checklist">${CHECK_ITEMS.map(([k, l, crit]) => html`<div class="rp-check"><span>${crit ? '⚠ ' : ''}${l}</span><div class="rp-seg" role="radiogroup" aria-label="${l}">${[['ok', 'OK'], ['obs', 'Obs.'], ['falla', 'Falla']].map(([val, lab]) => html`<label><input type="radio" name="ck-${k}" value="${val}"><span>${lab}</span></label>`)}</div></div>`)}</div>
        <div class="field" style="margin-top:12px"><label for="ck-obs">Observaciones</label><textarea class="textarea" id="ck-obs" name="obs" maxlength="300" placeholder="Ej: rayón en puerta lateral"></textarea></div>
      </section>
      <section class="card"><h3 style="margin-top:0">2. Odómetro y combustible</h3><div class="k-form">
        <div class="field"><label for="ck-odo">Odómetro (km) *</label><input class="input" id="ck-odo" name="odo" type="number" min="${v?.odometer || 0}" value="${v?.odometer || 0}"><small class="muted">Último registro: ${(v?.odometer || 0).toLocaleString('es-CL')} km</small></div>
        <div class="field"><label for="ck-fuel">${v?.fuel === 'Eléctrico' ? 'Batería' : 'Combustible'}: <b data-fuelv>80 %</b></label><input id="ck-fuel" name="fuel" type="range" min="0" max="100" step="5" value="80" class="rp-range"></div>
      </div><div class="row" style="margin-top:8px"><button type="button" class="btn btn-sm" data-dash>📷 Foto del tablero</button><span class="small muted" data-dashinfo>Opcional</span></div></section>
      <section class="card"><div class="k-card-head"><div><h3>3. Carga del vehículo</h3><p>Orden de carga inverso: lo último que entregas va al fondo.</p></div><button type="button" class="btn btn-sm" data-scanall>📷 Escanear todo</button></div>
        <ol class="rp-loadlist">${loadOrder.map(s => html`<li data-sid="${s.id}"><label class="check"><input type="checkbox" data-scan="${s.id}"> <b>${s.code}</b> <span class="muted small">${s.address}, ${s.comuna} · ${kg(s.weight)}${s.pieces > 1 ? ` · ${s.pieces} bultos` : ''}</span></label><button type="button" class="btn btn-ghost btn-sm" data-miss="${s.id}" title="No está en el andén">No está</button></li>`)}</ol>
        <p class="small muted" data-scaninfo>0 de ${loadOrder.length} escaneados</p>
        ${stops.some(s => s.kind === 'retiro') ? raw(`<p class="small">Además tienes ${stops.filter(s => s.kind === 'retiro').length} retiro(s) en clientes durante la ruta: deja espacio en la caja.</p>`) : ''}
        ${raw(capBars(r))}
      </section>
      <button class="btn btn-primary btn-lg" type="submit">▶ Iniciar ruta</button>
    </form>`;
  const f = view.querySelector('[data-start]');
  const missing = new Set();
  const info = () => { view.querySelector('[data-scaninfo]').textContent = `${scanned.size} de ${loadOrder.length} escaneados${missing.size ? ` · ${missing.size} no encontrados` : ''}`; };
  f.querySelector('[data-allok]').onclick = () => f.querySelectorAll('input[value="ok"]').forEach(i => { i.checked = true; });
  f.elements.fuel.addEventListener('input', () => { f.querySelector('[data-fuelv]').textContent = f.elements.fuel.value + ' %'; });
  f.querySelector('[data-dash]').onclick = () => { f.querySelector('[data-dashinfo]').textContent = 'Foto del tablero adjunta ✓'; };
  f.addEventListener('change', e => { const c = e.target.closest('[data-scan]'); if (!c) return; c.checked ? (scanned.add(c.dataset.scan), missing.delete(c.dataset.scan)) : scanned.delete(c.dataset.scan); c.closest('li').classList.toggle('miss', false); info(); });
  f.addEventListener('click', e => { const b = e.target.closest('[data-miss]'); if (!b) return; const id = b.dataset.miss, li = b.closest('li'); const on = !missing.has(id); on ? missing.add(id) : missing.delete(id); li.classList.toggle('miss', on); const cb = li.querySelector('[data-scan]'); cb.checked = false; cb.disabled = on; scanned.delete(id); b.textContent = on ? 'Deshacer' : 'No está'; info(); });
  f.querySelector('[data-scanall]').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true;
    for (const s of loadOrder) { if (missing.has(s.id) || scanned.has(s.id)) continue; const cb = f.querySelector(`[data-scan="${s.id}"]`); if (!cb) break; cb.checked = true; scanned.add(s.id); info(); await new Promise(res => setTimeout(res, 60)); }
    btn.disabled = false; toast('Carga escaneada', 'success');
  };
  let busy = false;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const items = Object.fromEntries(CHECK_ITEMS.map(([k]) => [k, f.querySelector(`input[name="ck-${k}"]:checked`)?.value || '']));
    const unanswered = CHECK_ITEMS.filter(([k]) => !items[k]);
    if (unanswered.length) return toast(`Responde el checklist: ${unanswered[0][1]}`, 'warning');
    const notScanned = loadOrder.filter(s => !scanned.has(s.id) && !missing.has(s.id));
    if (notScanned.length) return toast(`Faltan ${notScanned.length} paquete(s) por escanear o marcar como "No está"`, 'warning');
    if (missing.size && !await confirm(`${missing.size} paquete(s) no están en el andén: saldrán de tu ruta y despacho será notificado.`, { title: 'Paquetes faltantes', ok: 'Continuar' })) return;
    busy = true;
    try {
      ops.startRoute(db.get('routes', r.id), { items, obs: f.elements.obs.value.trim(), odo: +f.elements.odo.value, fuel: +f.elements.fuel.value, missing: [...missing] });
      toast('¡Buena ruta! Avisamos a tus destinatarios con su ventana de llegada', 'success');
      location.hash = '#/';
    } catch (err) { busy = false; toast(err.message, 'error'); }
  });
}

// ================= Cierre =================
function closeView(view, ctx) {
  const r = myRoute(ctx);
  if (!r) { view.innerHTML = pageHead('Cierre del día') + noRoute(); return; }
  if (r.status === 'planificada') { view.innerHTML = pageHead('Cierre del día') + emptyState({ icon: '⏳', title: 'Tu ruta aún no comienza', text: 'El cierre se hace al volver al CD.', action: '<a class="btn btn-primary" href="#/inicio">Iniciar jornada</a>' }); return; }
  const sum = ops.closingSummary(r);
  if (r.status === 'cerrada') {
    const c = r.closing || {};
    view.innerHTML = html`${pageHead('Cierre del día', `Ruta ${r.code} cerrada a las ${hhmm(Date.parse(r.closedAt))}`)}
      ${kpis([{ label: 'Entregas', value: sum.delivered, icon: '✓' }, { label: 'Devueltos al CD', value: (c.returned || []).length, icon: '↩' }, { label: 'Km del día', value: km((r.odoEnd || 0) - (r.odoStart || 0)), icon: '🛣️' }, { label: 'Diferencia de caja', value: money(c.diff || 0), icon: '💵' }])}
      ${raw(card('Resumen', kv([['Efectivo esperado', money(c.cashExpected)], ['Efectivo declarado', money(c.cashDeclared)], ['Pagos con tarjeta/transferencia', money(c.card || 0)], ['Odómetro', `${(r.odoStart || 0).toLocaleString('es-CL')} → ${(r.odoEnd || 0).toLocaleString('es-CL')} km`], ['Combustible', `${r.fuelStart}% → ${r.fuelEnd}%`], ['Notas', c.notes]])))}`;
    return;
  }
  const fuelKm = Math.round((r.odoStart || 0) + (r.kmDone || 0) + ops.plan(r).kmLeft);
  view.innerHTML = html`${pageHead('Cierre del día', `Ruta ${r.code} · vuelve al ${DEPOT.name}`, '<a class="btn btn-ghost" href="#/">← Mi ruta</a>')}
    ${sum.pending ? raw(`<div class="rp-callout warn"><b>Te quedan ${sum.pending} parada(s) sin visitar</b><span>Si cierras ahora volverán al CD como "no visitadas" y se reprogramarán para mañana.</span></div>`) : ''}
    ${kpis([{ label: 'Entregados', value: sum.delivered, icon: '✓' }, { label: 'Fallidos', value: sum.failed, icon: '✕' }, { label: 'Sin visitar', value: sum.pending, icon: '⏳' }, { label: 'Retiros a descargar', value: sum.pickedUp.length, icon: '📥' }])}
    <form class="stack" novalidate data-close>
      <section class="card"><div class="k-card-head"><div><h3>Devolución de paquetes al CD</h3><p>Escanea o marca cada paquete al dejarlo en el andén.</p></div>${sum.toReturn.length ? raw('<button type="button" class="btn btn-sm" data-allret>Marcar todos</button>') : ''}</div>
        ${sum.toReturn.length ? html`<ul class="rp-loadlist">${sum.toReturn.map(s => html`<li><label class="check"><input type="checkbox" data-ret="${s.id}"> <b>${s.code}</b> <span class="small muted">${SHIP.label(s.status)}${s.status === 'parcial' ? ` · ${s.returnPieces} bulto(s) de vuelta` : ''} · ${s.address}</span></label></li>`)}</ul>` : raw('<p class="muted small">No tienes paquetes para devolver. ¡Excelente jornada!</p>')}
        ${sum.pickedUp.length ? html`<p class="small">Descarga también ${sum.pickedUp.length} retiro(s): ${sum.pickedUp.map(s => s.code).join(', ')}.</p>` : ''}
      </section>
      <section class="card"><h3 style="margin-top:0">Cuadratura de caja</h3>
        <div class="k-form">
          <div class="field"><label>Efectivo cobrado (sistema)</label><input class="input" value="${money(sum.cash)}" readonly></div>
          <div class="field"><label for="cl-cash">Efectivo que entregas *</label><input class="input" id="cl-cash" name="cash" type="number" min="0" step="10" value="${sum.cash}"><small class="muted" data-diff>Cuadra ✓</small></div>
          <div class="field"><label>Tarjeta / transferencia</label><input class="input" value="${money(sum.card)}" readonly></div>
        </div></section>
      <section class="card"><h3 style="margin-top:0">Vehículo</h3><div class="k-form">
        <div class="field"><label for="cl-odo">Odómetro final (km) *</label><input class="input" id="cl-odo" name="odo" type="number" min="${r.odoStart || 0}" value="${fuelKm}"><small class="muted">Salida: ${(r.odoStart || 0).toLocaleString('es-CL')} km · recorrido estimado ${km((r.kmDone || 0) + ops.plan(r).kmLeft)}</small></div>
        <div class="field"><label for="cl-fuel">Combustible final: <b data-fv>${Math.max(5, (r.fuelStart || 80) - 20)} %</b></label><input class="rp-range" id="cl-fuel" name="fuel" type="range" min="0" max="100" step="5" value="${Math.max(5, (r.fuelStart || 80) - 20)}"></div>
        <div class="field k-wide"><label for="cl-notes">Notas del cierre</label><textarea class="textarea" id="cl-notes" name="notes" maxlength="300" placeholder="Ej: vuelto mal entregado en una parada"></textarea></div>
      </div></section>
      <button class="btn btn-primary btn-lg" type="submit">🏁 Cerrar jornada</button>
    </form>`;
  const f = view.querySelector('[data-close]');
  f.querySelector('[data-allret]')?.addEventListener('click', () => f.querySelectorAll('[data-ret]').forEach(c => { c.checked = true; }));
  f.elements.cash.addEventListener('input', () => { const d = +f.elements.cash.value - sum.cash; const el = f.querySelector('[data-diff]'); el.textContent = d === 0 ? 'Cuadra ✓' : `Diferencia: ${d > 0 ? '+' : '−'}${money(Math.abs(d))}`; el.style.color = d === 0 ? 'var(--success)' : 'var(--danger)'; });
  f.elements.fuel.addEventListener('input', () => { f.querySelector('[data-fv]').textContent = f.elements.fuel.value + ' %'; });
  let busy = false;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const returned = [...f.querySelectorAll('[data-ret]:checked')].map(c => c.dataset.ret);
    const diff = +f.elements.cash.value - sum.cash;
    if (diff !== 0 && !await confirm(`La caja tiene una diferencia de ${money(diff)}. Se informará a despacho. ¿Cerrar igual?`, { title: 'Diferencia de caja', ok: 'Cerrar igual', danger: true })) return;
    busy = true;
    try { ops.closeRoute(db.get('routes', r.id), { returned, odoEnd: +f.elements.odo.value, fuelEnd: +f.elements.fuel.value, cashDeclared: +f.elements.cash.value, notes: f.elements.notes.value.trim() }); toast('Jornada cerrada. ¡Buen descanso!', 'success'); ctx.refresh(); }
    catch (err) { busy = false; toast(err.message, 'warning'); }
  });
}

// ================= Combustible =================
function fuelView(view, ctx) {
  const r = myRoute(ctx);
  const u = ctx.user, v = db.get('vehicles', r?.vehicleId || u.vehicleId);
  const logs = db.query('fuelLogs', f => f.driverId === u.id).slice(0, 12);
  view.innerHTML = html`${pageHead('Combustible', v ? `${v.plate} · ${v.model} · ${v.fuel}` : '')}
    <div class="k-grid-main">
      <section class="card"><h3 style="margin-top:0">Registrar carga</h3>${r?.status === 'en_curso' ? html`<form class="k-form" novalidate data-fuel>
        <div class="field"><label for="fu-l">Litros *</label><input class="input" id="fu-l" name="liters" type="number" min="1" max="120" step="0.1" placeholder="35"></div>
        <div class="field"><label for="fu-a">Monto pagado *</label><input class="input" id="fu-a" name="amount" type="number" min="1" step="10" placeholder="41000"></div>
        <div class="field"><label for="fu-o">Odómetro *</label><input class="input" id="fu-o" name="odo" type="number" value="${Math.round((r.odoStart || 0) + (r.kmDone || 0))}"></div>
        <div class="field"><label for="fu-s">Estación *</label><input class="input" id="fu-s" name="station" placeholder="Copec Pajaritos"></div>
        <div class="field k-wide"><button class="btn btn-primary">Guardar carga</button></div></form>` : raw('<p class="muted small">Puedes registrar cargas con la ruta en curso.</p>')}</section>
      ${raw(card('Mis cargas', logs.length ? `<ul class="rp-mini">${logs.map(f => `<li><b>${f.liters} L</b> · ${money(f.amount)} <small>${escape(f.station)} · ${new Date(f.at).toLocaleDateString('es-CL')} · ${f.odometer.toLocaleString('es-CL')} km</small></li>`).join('')}</ul>` : '<p class="muted small">Sin cargas registradas.</p>'))}
    </div>`;
  view.querySelector('[data-fuel]')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (!f.station.value.trim()) return toast('Indica la estación', 'warning');
    try { ops.addFuel(db.get('routes', r.id), { liters: +f.liters.value, amount: +f.amount.value, odometer: +f.odo.value, station: f.station.value.trim() }); toast('Carga registrada', 'success'); ctx.refresh(); }
    catch (err) { toast(err.message, 'warning'); }
  });
}

// ================= Historial =================
function historyView(view, ctx) {
  const rs = db.query('routes', r => r.driverId === ctx.user.id).sort((a, b) => b.date.localeCompare(a.date));
  view.innerHTML = html`${pageHead('Mi historial', 'Rutas, entregas y evaluaciones de los destinatarios')}
    ${rs.length ? html`<div class="table-wrap card"><table class="table"><thead><tr><th>Ruta</th><th>Fecha</th><th>Paradas</th><th>Entregadas</th><th>Km</th><th>Caja</th><th>Estado</th></tr></thead><tbody>${rs.map(r => { const items = r.order.map(ops.get).filter(Boolean); const ok = items.filter(s => lastAttempt(s, r.id)?.ok).length; return html`<tr><td><b>${r.code}</b></td><td>${r.date === todayStr() ? 'Hoy' : fmtDate(r.date + 'T12:00')}</td><td>${items.length}</td><td>${ok}</td><td>${km(r.odoEnd ? r.odoEnd - r.odoStart : r.kmDone)}</td><td>${r.closing ? (r.closing.diff ? raw(`<span class="badge badge-danger">${escape(money(r.closing.diff))}</span>`) : raw('<span class="badge badge-success">Cuadra</span>')) : '—'}</td><td>${raw(ROUTE.badge(r.status))}</td></tr>`; })}</tbody></table></div>` : raw(emptyState({ icon: '🗂️', title: 'Aún no tienes rutas' }))}
    ${(() => { const rated = db.query('shipments', s => s.rating && (s.attempts || []).some(a => a.ok && a.by === ctx.user.id)); return raw(card('Evaluaciones recibidas', rated.length ? `<ul class="rp-mini">${rated.slice(0, 8).map(s => `<li><b>${'★'.repeat(s.rating.stars)}${'☆'.repeat(5 - s.rating.stars)}</b> ${escape(s.rating.comment || (s.rating.tags || []).join(', ') || '')}<small>${escape(s.code)} · ${escape(fmtDate(s.rating.at))}</small></li>`).join('')}</ul>` : '<p class="muted small">Aún no hay evaluaciones.</p>')); })()}`;
}

// ================= Mensajes =================
function messagesView(view, ctx) {
  const paint = () => {
    const r = myRoute(ctx);
    const ids = r ? r.order : [];
    const threads = ids.map(ops.get).filter(Boolean).map(s => ({ s, ms: ops.messagesOf(s) })).filter(t => t.ms.length).sort((a, b) => b.ms.at(-1).at.localeCompare(a.ms.at(-1).at));
    view.innerHTML = html`${pageHead('Mensajes', 'Chat con destinatarios y despacho (número protegido)')}
      ${threads.length ? html`<div class="stack">${threads.map(({ s, ms }) => html`<button type="button" class="card hover rp-thread" data-open="${s.id}"><b>${s.rName} · ${s.code}</b><span class="muted small">${ms.at(-1).from === 'conductor' ? 'Tú: ' : ''}${ms.at(-1).text}</span><small class="muted">${ago(ms.at(-1).at)}</small></button>`)}</div>` : raw(emptyState({ icon: '💬', title: 'Sin conversaciones', text: 'Abre el chat desde cualquier parada para escribirle al destinatario.' }))}`;
    view.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => chatModal(ops.get(b.dataset.open))));
  };
  paint();
  return { refresh: paint };
}

app.panel({
  page: 'conductor.html', sub: 'App del conductor', siteHref: 'index.html',
  nav: [
    { section: 'Hoy' },
    { id: '', label: 'Mi ruta', icon: '🗺️', render: routeView, watch: ['routes', 'shipments', 'messages'] },
    { id: 'parada', label: 'Parada', icon: '📍', hidden: true, routes: { ':id': { label: 'Parada', render: stopView } }, render: v => { location.hash = '#/'; } , watch: ['routes', 'shipments', 'messages', 'addressNotes'] },
    { id: 'inicio', label: 'Inicio de jornada', icon: '✅', render: startView, watch: [] },
    { id: 'mensajes', label: 'Mensajes', icon: '💬', render: messagesView, watch: ['messages'], count: () => { const r = ops.driverRoute(app.auth.current()?.id); return r ? db.count('messages', m => r.order.includes(m.shipmentId) && m.from !== 'conductor' && Date.now() - Date.parse(m.at) < 3600e3) : 0; } },
    { id: 'combustible', label: 'Combustible', icon: '⛽', render: fuelView, watch: ['fuelLogs'] },
    { id: 'cierre', label: 'Cierre del día', icon: '🏁', render: closeView, watch: ['routes'] },
    { section: 'Yo' },
    { id: 'historial', label: 'Mi historial', icon: '🗂️', render: historyView, watch: ['routes'] }
  ]
});
