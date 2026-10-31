// Sitio público de Pudú Envíos: portada, seguimiento por código (sin cuenta; con verificación del
// teléfono para dejar indicaciones), "Mis envíos" del destinatario (indicaciones, ventana preferida,
// lugar seguro, reprogramar, punto de retiro, chat con el conductor y evaluación), empresas con
// cotizador, puntos de retiro y cobertura. Usa las clases-gancho de las disposiciones.
import './boot.js';
import { app, db, S, SHIP, stBadge, machineOf, companyName, userName, hhmm, km, kg, money, escape, todayStr, tomorrowStr, priceFor, NOTE_TAGS, WINDOWS, SERVICES, COMUNA } from './app.js';
import * as ops from './ops.js';
import { routeMap, proofCard, shipTimeline, chatBox, flagsHtml, photoSvg, svcLabel } from './views.js';
import { cityMap, DEPOT, COMUNAS, COMUNA_NAMES, dist, pathOf } from './geo.js';
import { isPending } from './engine.js';
import { html, raw, toast, modal, dateTime, ago, date as fmtDate, norm } from '../../assets/core/ui.js';
import { emptyState, kv, card } from '../../assets/core/blocks.js';

const RATE_TAGS = ['Puntual', 'Amable', 'Cuidó el paquete', 'Siguió mis indicaciones', 'Llegó tarde', 'Paquete dañado'];
const verifiedKey = 'reparto:verified';
const verified = () => { try { return JSON.parse(sessionStorage.getItem(verifiedKey) || '[]'); } catch (e) { return []; } };
const addVerified = id => { try { sessionStorage.setItem(verifiedKey, JSON.stringify([...new Set([...verified(), id])])); } catch (e) {} };
const user = () => app.auth.current();
const isMine = s => { const u = user(); return !!u && u.role === 'destinatario' && (s.rUserId === u.id || (s.rEmail && s.rEmail === u.email)); };
const canAct = s => isMine(s) || verified().includes(s.id);
const findByCode = code => { const c = String(code || '').trim().toUpperCase(); return c ? db.find('shipments', s => s.code.toUpperCase() === c || (s.ref && s.ref.toUpperCase() === c)) : null; };

// Estado "humano" con ETA para el destinatario.
function liveStatus(s) {
  const r = s.routeId && db.get('routes', s.routeId);
  if (s.status === 'en_ruta' && r?.status === 'en_curso') {
    const p = ops.plan(r), l = p.eta[s.id];
    const before = p.pending.findIndex(x => x.id === s.id);
    if (l) return { title: 'Tu pedido va en camino', sub: `Llega hoy entre ${hhmm(l.eta - 30 * 6e4)} y ${hhmm(l.eta + 30 * 6e4)}`, extra: before > 0 ? `El conductor tiene ${before} parada${before > 1 ? 's' : ''} antes de la tuya` : 'Eres la próxima parada', tone: 'primary', r, p };
  }
  if (s.status === 'asignado' && r) { const p = ops.plan(r), l = p.eta[s.id]; return { title: 'Saldrá a reparto hoy', sub: l ? `Llegada estimada entre ${hhmm(l.eta - 45 * 6e4)} y ${hhmm(l.eta + 45 * 6e4)}` : 'En preparación', tone: 'info', r, p }; }
  if (ops.isDone(s)) return { title: s.status === 'parcial' ? 'Entrega parcial' : s.status === 'retirado_punto' ? 'Retirado en punto' : 'Entregado', sub: s.deliveredAt ? dateTime(s.deliveredAt) : '', tone: 'success' };
  if (s.status === 'fallido') return { title: 'No pudimos entregarlo', sub: (s.attempts || []).filter(a => !a.ok).at(-1)?.reason || '', extra: 'Puedes reprogramar o pedir que lo dejemos en un punto de retiro.', tone: 'danger' };
  if (s.status === 'en_punto') { const p = db.get('points', s.redirectPointId); return { title: `Disponible en ${p?.name || 'punto de retiro'}`, sub: p ? `${p.address}, ${p.comuna} · ${p.hours}` : '', extra: `Muestra el PIN ${s.pin} y tu carnet para retirarlo.`, tone: 'warning' }; }
  if (s.status === 'en_bodega') return { title: 'En nuestro centro de distribución', sub: s.date === todayStr() ? 'Se planifica para hoy' : s.date === tomorrowStr() ? 'Sale a reparto mañana' : s.date ? `Programado para el ${fmtDate(s.date + 'T12:00')}` : 'Por programar', tone: 'info' };
  if (s.status === 'creado') return { title: 'Etiquetado por la tienda', sub: 'Esperando que llegue a nuestro centro de distribución', tone: 'info' };
  return { title: machineOf(s).label(s.status), sub: '', tone: '' };
}
function trackMap(s, st) {
  if (st?.r && st.r.status === 'en_curso' && isPending(s)) {
    const pos = ops.vehiclePos(st.r, st.p);
    return cityMap({ points: [{ x: s.x, y: s.y, kind: 'home', title: 'Tu dirección' }], vehicles: [{ ...pos, color: st.r.color, title: 'Tu conductor' }], lines: [{ pts: pathOf([pos, ...st.p.pending.slice(0, Math.max(0, st.p.pending.findIndex(x => x.id === s.id)) + 1)]), kind: 'route', color: st.r.color }], fit: [s, pos], minW: 4, ratio: 1.7, label: 'Tu conductor y tu dirección', depot: false });
  }
  return cityMap({ points: [{ x: s.x, y: s.y, kind: 'home', title: 'Destino' }], fit: [s, DEPOT], minW: 5, ratio: 1.7, label: 'Destino del envío' });
}
function actionsBar(s) {
  if (!canAct(s)) return '';
  const changeable = ops.canChange(s);
  const r = s.routeId && db.get('routes', s.routeId);
  return html`<div class="rp-acts">
    ${changeable ? raw('<button class="btn btn-sm" data-act="notes">📝 Indicaciones</button><button class="btn btn-sm" data-act="prefs">🕑 Horario y lugar seguro</button><button class="btn btn-sm" data-act="resched">📅 Reprogramar</button><button class="btn btn-sm" data-act="point">🏪 Punto de retiro</button>') : ''}
    ${s.status === 'fallido' ? raw('<button class="btn btn-sm" data-act="resched">📅 Reprogramar</button><button class="btn btn-sm" data-act="point">🏪 Punto de retiro</button>') : ''}
    ${r?.status === 'en_curso' && isPending(s) ? raw('<button class="btn btn-sm btn-primary" data-act="chat">💬 Chat con el conductor</button>') : ''}
    ${ops.isDone(s) && !s.rating ? raw('<button class="btn btn-sm btn-primary" data-act="rate">⭐ Evaluar entrega</button>') : ''}
  </div>`;
}
function wireActions(root) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const s = ops.get(b.closest('[data-ship]')?.dataset.ship);
    if (!s) return;
    ({ notes: notesModal, prefs: prefsModal, resched: reschedModal, point: pointModal, chat: chatModal, rate: rateModal })[b.dataset.act]?.(s);
  });
}
function shipCard(s, { full = false } = {}) {
  const st = liveStatus(s);
  const r = s.routeId && db.get('routes', s.routeId);
  return html`<article class="card rp-track" data-ship="${s.id}">
    <header class="rp-track-head"><div><span class="eyebrow">${s.code} · ${companyName(s.companyId)}</span><h3>${st.title}</h3>${st.sub ? html`<p class="rp-track-sub">${st.sub}</p>` : ''}${st.extra ? html`<p class="small muted">${st.extra}</p>` : ''}</div>${raw(stBadge(s))}</header>
    <div class="rp-track-body">
      <div class="rp-mapmini">${raw(trackMap(s, st))}</div>
      <div class="stack">
        ${raw(kv([['Destino', canAct(s) ? `${s.address}, ${s.comuna}` : `${s.comuna}`], ['Para', canAct(s) ? s.rName : s.rName.split(' ')[0] + ' ' + (s.rName.split(' ')[1] || '').charAt(0) + '.'], ['Servicio', svcLabel(s)], s.win || s.prefWin ? ['Ventana', (s.win || s.prefWin).replace('-', ' a ')] : null, s.cod ? ['Pago contra entrega', money(s.cod)] : null, s.requirePin && canAct(s) ? ['PIN de entrega', raw(`<b class="rp-pin">${escape(s.pin)}</b>`)] : null, r?.status === 'en_curso' && isPending(s) ? ['Conductor', userName(r.driverId).split(' ')[0]] : null]))}
        ${(s.notes || []).length && canAct(s) ? html`<ul class="rp-notes">${s.notes.slice(-3).reverse().map(n => html`<li><span>${(n.tags || []).map(t => html`<span class="chip active rp-tag">${t}</span>`)} ${n.text}</span><small>${n.by === 'destinatario' ? 'Tú' : n.by} · ${ago(n.at)}</small></li>`)}</ul>` : ''}
        ${s.request ? html`<p class="rp-callout warn small"><b>Solicitud enviada</b><span>${s.request.kind === 'reprogramar' ? `Reprogramar para el ${s.request.date}` : `Llevar a ${db.get('points', s.request.pointId)?.name || 'punto de retiro'}`}: el conductor ya fue avisado.</span></p>` : ''}
        ${raw(actionsBar(s))}
      </div>
    </div>
    ${full ? html`<div class="grid-2 rp-track-more">${raw(card('Seguimiento', shipTimeline(s, { publicView: true })))}${s.proof ? raw(card('Prueba de entrega', canAct(s) ? proofCard(s) : `<p class="small">Recibido por <b>${escape(s.proof.name.split(' ')[0])}</b> (${escape(s.proof.relation || '')}) el ${escape(dateTime(s.proof.at))}.</p>`)) : ''}${s.rating ? raw(card('Tu evaluación', `<p>${'★'.repeat(s.rating.stars)}${'☆'.repeat(5 - s.rating.stars)} ${escape((s.rating.tags || []).join(', '))}</p><p class="small muted">${escape(s.rating.comment || '')}</p>`)) : ''}</div>` : ''}
  </article>`;
}

// ---------- Modales del destinatario ----------
function notesModal(s) {
  const sel = new Set();
  const m = modal({ title: `Indicaciones para ${s.code}`, body: html`<p class="muted" style="margin-top:0">Las ve tu conductor en su app al llegar a tu dirección.</p><div class="rp-quick">${NOTE_TAGS.map(t => html`<button type="button" class="chip" data-tag="${t}" aria-pressed="false">${t}</button>`)}</div><div class="field" style="margin-top:12px"><label for="nt-t">Detalle</label><textarea class="textarea" id="nt-t" maxlength="280" placeholder="Ej: el conserje se llama Héctor; el timbre del 1203 no suena"></textarea><small class="muted"><span data-c>0</span>/280</small></div>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar al conductor</button>' });
  m.el.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => { const t = b.dataset.tag; sel.has(t) ? sel.delete(t) : sel.add(t); b.setAttribute('aria-pressed', sel.has(t)); b.classList.toggle('active', sel.has(t)); }));
  const ta = m.el.querySelector('#nt-t');
  ta.addEventListener('input', () => { m.el.querySelector('[data-c]').textContent = ta.value.length; });
  m.el.querySelector('[data-ok]').onclick = () => { try { ops.recipientNote(ops.get(s.id), { text: ta.value, tags: [...sel] }); m.close(); toast('Indicaciones enviadas', 'success'); } catch (e) { toast(e.message, 'warning'); } };
}
function prefsModal(s) {
  const m = modal({ title: 'Horario preferido y lugar seguro', body: html`<div class="field"><label for="pf-w">Ventana preferida</label><select class="select" id="pf-w"><option value="">Cualquier hora</option>${WINDOWS.map(w => html`<option value="${w}" ${s.prefWin === w ? 'selected' : ''}>${w.replace('-', ' a ')}</option>`)}</select><small class="muted">${s.win ? `La tienda ya fijó la ventana ${s.win}; tu preferencia se usará si se reprograma.` : 'Optimizamos la ruta para llegar dentro de tu ventana.'}</small></div><div class="field"><label for="pf-s">Lugar seguro (si no estás)</label><input class="input" id="pf-s" maxlength="120" value="${s.safePlace || ''}" placeholder="Ej: conserjería, bodega del edificio, con la vecina del 12"></div><p class="small muted">Si autorizas un lugar seguro, el conductor deja el paquete allí con una foto como prueba.</p>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>' });
  m.el.querySelector('[data-ok]').onclick = () => { ops.setPrefs(ops.get(s.id), { prefWin: m.el.querySelector('#pf-w').value, safePlace: m.el.querySelector('#pf-s').value.trim() }); m.close(); toast('Preferencias guardadas', 'success'); };
}
function reschedModal(s) {
  const max = todayStr(new Date(Date.now() + 14 * 864e5));
  const m = modal({ title: `Reprogramar ${s.code}`, body: html`<div class="field"><label for="rs-d">Nueva fecha</label><input class="input" type="date" id="rs-d" min="${tomorrowStr()}" max="${max}" value="${tomorrowStr()}"></div>${s.status === 'en_ruta' ? raw('<p class="small rp-callout warn"><b>Tu paquete ya va en el vehículo</b><span>Le avisaremos al conductor para que no lo entregue hoy.</span></p>') : ''}`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Reprogramar</button>' });
  m.el.querySelector('[data-ok]').onclick = () => { try { ops.reschedule(ops.get(s.id), m.el.querySelector('#rs-d').value); m.close(); toast('Listo, reprogramado', 'success'); } catch (e) { toast(e.message, 'warning'); } };
}
function pointModal(s) {
  const pts = db.query('points', p => p.active !== false).map(p => ({ p, d: dist(p, s), used: ops.get && db.count('shipments', x => x.status === 'en_punto' && x.redirectPointId === p.id) })).sort((a, b) => a.d - b.d);
  const m = modal({ title: 'Retirar en un punto', size: 'lg', body: html`<div class="rp-mapmini">${raw(cityMap({ points: [{ x: s.x, y: s.y, kind: 'home', title: 'Tu dirección' }, ...pts.map(({ p }, i) => ({ x: p.x, y: p.y, kind: 'point', label: i + 1, title: p.name }))], fit: [s, ...pts.slice(0, 3).map(x => x.p)], ratio: 1.8, label: 'Puntos de retiro cercanos', depot: false }))}</div>
    <div class="rp-points">${pts.map(({ p, d, used }, i) => html`<label class="card rp-point"><input type="radio" name="pt" value="${p.id}" ${i === 0 ? 'checked' : ''} ${used >= p.capacity ? 'disabled' : ''}><span><b>${i + 1}. ${p.name}</b><small>${p.address}, ${p.comuna} · ${km(d)}</small><small>${p.hours} · ${used >= p.capacity ? 'Sin casilleros' : `${p.capacity - used} disponibles`}</small></span></label>`)}</div>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar a este punto</button>' });
  m.el.querySelector('[data-ok]').onclick = () => { const v = m.el.querySelector('input[name=pt]:checked')?.value; try { ops.redirectToPoint(ops.get(s.id), v); m.close(); toast('Te avisaremos cuando esté disponible', 'success'); } catch (e) { toast(e.message, 'warning'); } };
}
function chatModal(s) {
  const m = modal({ title: `Chat con tu conductor · ${s.code}`, body: html`<div data-box></div><div class="rp-quick">${['¿A qué hora llega?', 'Estoy en casa', 'Déjelo con el conserje', 'Voy saliendo, ¿lo puede dejar con el vecino?'].map(q => html`<button type="button" class="chip" data-q="${q}">${q}</button>`)}</div><form class="row" data-f style="margin-top:10px;flex-wrap:nowrap"><input class="input" name="t" maxlength="400" placeholder="Escribe un mensaje…" aria-label="Mensaje" autocomplete="off"><button class="btn btn-primary">Enviar</button></form><p class="small muted">Tu número y el del conductor están protegidos.</p>`, foot: '<button class="btn btn-ghost" data-close>Cerrar</button>' });
  const box = m.el.querySelector('[data-box]');
  const paint = () => { box.innerHTML = chatBox(ops.get(s.id), 'destinatario'); const c = box.querySelector('.rp-chat'); c.scrollTop = c.scrollHeight; };
  paint();
  const off = db.subscribe(() => { if (!m.el.isConnected) return off(); paint(); });
  const send = t => { try { ops.sendMessage(ops.get(s.id), 'destinatario', t); } catch (e) { toast(e.message, 'warning'); } };
  m.el.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
  m.el.querySelector('[data-f]').addEventListener('submit', e => { e.preventDefault(); send(e.target.t.value); e.target.t.value = ''; });
}
function rateModal(s) {
  const sel = new Set();
  const m = modal({ title: `¿Cómo estuvo tu entrega? · ${s.code}`, body: html`<div class="rp-stars" role="radiogroup" aria-label="Estrellas">${[1, 2, 3, 4, 5].map(n => html`<label><input type="radio" name="st" value="${n}" ${n === 5 ? 'checked' : ''}><span aria-hidden="true">★</span><b class="sr">${n} estrellas</b></label>`)}</div><div class="rp-quick">${RATE_TAGS.map(t => html`<button type="button" class="chip" data-tag="${t}" aria-pressed="false">${t}</button>`)}</div><div class="field" style="margin-top:12px"><label for="rt-c">Comentario (opcional)</label><textarea class="textarea" id="rt-c" maxlength="300"></textarea></div>`, foot: '<button class="btn btn-ghost" data-close>Ahora no</button><button class="btn btn-primary" data-ok>Enviar evaluación</button>' });
  m.el.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => { const t = b.dataset.tag; sel.has(t) ? sel.delete(t) : sel.add(t); b.classList.toggle('active', sel.has(t)); b.setAttribute('aria-pressed', sel.has(t)); }));
  m.el.querySelector('[data-ok]').onclick = () => { try { ops.rate(ops.get(s.id), { stars: +m.el.querySelector('input[name=st]:checked').value, tags: [...sel], comment: m.el.querySelector('#rt-c').value }); m.close(); toast('¡Gracias por tu evaluación!', 'success'); } catch (e) { toast(e.message, 'warning'); } };
}

// ---------- Páginas ----------
function home(view) {
  const s = S();
  const stats = db.all('dailyStats');
  const total = stats.reduce((a, d) => a + d.total, 0), onTime = stats.reduce((a, d) => a + d.onTime, 0), deliv = stats.reduce((a, d) => a + d.delivered, 0);
  const live = ops.todayRoutes().find(r => r.status === 'en_curso' && !r.sim) || ops.todayRoutes().find(r => r.status === 'en_curso') || ops.todayRoutes()[0];
  view.innerHTML = html`<section class="section site-hero rp-hero"><div class="container">
      <div class="hero-text stack">
        <span class="eyebrow">Reparto de última milla · Región Metropolitana</span>
        <h1>${s.tagline}</h1>
        <p class="lead muted">Seguimos tu paquete parada por parada: te avisamos la ventana de llegada, puedes dejarle indicaciones al conductor, reprogramar o retirarlo en un punto cercano.</p>
        <form class="rp-trackform" data-track><input class="input" name="code" placeholder="Código de seguimiento (ej. PE-482115)" aria-label="Código de seguimiento" autocomplete="off"><button class="btn btn-primary">Seguir envío</button></form>
        <div class="row small muted">¿Eres empresa? <a href="#/empresas">Despacha con nosotros →</a></div>
      </div>
      <div class="hero-media"><div class="rp-hero-map card">${live ? raw(routeMap(live, { ratio: 1.25, label: 'Una ruta de hoy en vivo' })) : ''}<div class="rp-hero-badge"><b>● En vivo</b><span>${live ? `${ops.plan(live).done.length} de ${live.order.length} paradas hechas` : ''}</span></div></div></div>
    </div></section>
    <section class="section"><div class="container"><div class="grid-4 rp-stats" data-anim>
      <div class="stat card"><span class="label">Envíos en 30 días</span><span class="value">${total.toLocaleString('es-CL')}</span></div>
      <div class="stat card"><span class="label">Entregados a tiempo</span><span class="value">${deliv ? Math.round(onTime / deliv * 100) : 0}%</span></div>
      <div class="stat card"><span class="label">Comunas con cobertura</span><span class="value">${COMUNAS.length}</span></div>
      <div class="stat card"><span class="label">Puntos de retiro</span><span class="value">${db.count('points', p => p.active !== false)}</span></div>
    </div></div></section>
    <section class="section"><div class="container stack">
      <div><span class="eyebrow">Para quien recibe</span><h2>Tú decides cómo recibir</h2></div>
      <div class="grid-3">
        <article class="card"><h3>🕑 Ventana de llegada</h3><p class="muted">Al salir el vehículo te enviamos un SMS con una ventana de 1 hora y ves cuántas paradas faltan para la tuya.</p></article>
        <article class="card"><h3>📝 Indicaciones al conductor</h3><p class="muted">"Dejar con conserje", "timbre malo", "perro bravo"… el conductor las ve al llegar, junto al historial de entregas en tu dirección.</p></article>
        <article class="card"><h3>🏪 Reprograma o retira</h3><p class="muted">¿No vas a estar? Cambia la fecha o pide que lo dejemos en un locker o tienda aliada cerca de ti.</p></article>
      </div></div></section>
    <section class="section"><div class="container stack">
      <div><span class="eyebrow">Cómo funciona</span><h2>Del andén a tu puerta</h2></div>
      <ol class="rp-steps-h">
        <li><b>1. La tienda etiqueta</b><span>Crea el envío o sube su planilla; pasamos a retirar a su bodega.</span></li>
        <li><b>2. Planificamos por zona</b><span>Agrupamos por comuna y capacidad del vehículo y optimizamos el orden de las paradas.</span></li>
        <li><b>3. Sale a reparto</b><span>El conductor hace su checklist, escanea la carga y te avisamos la ventana.</span></li>
        <li><b>4. Prueba de entrega</b><span>Firma, foto, nombre y RUT de quien recibe. Si hay cobro, pagas en efectivo o tarjeta.</span></li>
      </ol></div></section>
    <section class="section"><div class="container"><div class="card rp-cta" data-anim><div><h2>¿Tienes una tienda online?</h2><p class="muted">Tarifas desde ${money(Math.min(...db.all('rates').map(r => r.base)))} por envío, retiro en tu bodega, cobro contra entrega y pruebas de entrega descargables.</p></div><div class="row"><a class="btn btn-primary btn-lg" href="#/empresas">Ver tarifas</a><a class="btn btn-lg" href="login.html">Entrar al portal</a></div></div></div></section>`;
  view.querySelector('[data-track]').addEventListener('submit', e => { e.preventDefault(); const c = e.target.code.value.trim(); if (!c) return toast('Ingresa tu código de seguimiento', 'warning'); location.hash = '#/seguimiento?code=' + encodeURIComponent(c); });
}

function tracking(view, ctx) {
  const s = findByCode(ctx.query.code);
  const sample = db.find('shipments', x => x.status === 'en_ruta' && db.get('routes', x.routeId)?.status === 'en_curso');
  view.innerHTML = html`<section class="section"><div class="container stack rp-narrow">
      <div><span class="eyebrow">Seguimiento</span><h1>¿Dónde está mi paquete?</h1></div>
      <form class="rp-trackform" data-track><input class="input" name="code" value="${ctx.query.code || ''}" placeholder="Código PE-… o número de pedido de la tienda" aria-label="Código de seguimiento" autocomplete="off"><button class="btn btn-primary">Buscar</button></form>
      ${!ctx.query.code && sample ? html`<p class="small muted">¿Sin código a mano? Prueba con <a href="#/seguimiento?code=${sample.code}">${sample.code}</a>.</p>` : ''}
      ${s ? raw(shipCard(s, { full: true })) : ctx.query.code ? raw(emptyState({ icon: '🔎', title: 'No encontramos ese envío', text: 'Revisa el código del correo o SMS que te enviamos (empieza con PE-), o el número de pedido de la tienda.' })) : ''}
      ${s && !canAct(s) && !['entregado', 'devuelto', 'cancelado'].includes(s.status) ? html`<section class="card rp-verify"><h3>¿Eres el destinatario?</h3><p class="muted small">Verifica con los 4 últimos dígitos de tu teléfono para dejar indicaciones, reprogramar o elegir un punto de retiro.</p><form class="row" data-verify style="flex-wrap:nowrap"><input class="input" name="d" inputmode="numeric" maxlength="4" placeholder="Ej. 4567" aria-label="Últimos 4 dígitos del teléfono"><button class="btn">Verificar</button></form></section>` : ''}
    </div></section>`;
  view.querySelector('[data-track]').addEventListener('submit', e => { e.preventDefault(); const c = e.target.code.value.trim(); if (!c) return toast('Ingresa un código', 'warning'); location.hash = '#/seguimiento?code=' + encodeURIComponent(c); });
  let tries = 0;
  view.querySelector('[data-verify]')?.addEventListener('submit', e => {
    e.preventDefault();
    const d = e.target.d.value.trim();
    if (!/^\d{4}$/.test(d)) return toast('Ingresa 4 dígitos', 'warning');
    if (++tries > 4) return toast('Demasiados intentos. Intenta más tarde.', 'error');
    if (s.rPhone.replace(/\D/g, '').endsWith(d)) { addVerified(s.id); db.log('verificación', `${s.code}: destinatario verificado en el sitio`, null); toast('Verificado. Ya puedes gestionar tu entrega.', 'success'); ctx.refresh(); }
    else toast('Los dígitos no coinciden con el teléfono del envío', 'error');
  });
  wireActions(view.firstElementChild);
}

function myShipments(view) {
  const u = user();
  if (!u || u.role !== 'destinatario') {
    view.innerHTML = html`<section class="section"><div class="container rp-narrow">${raw(emptyState({ icon: '👤', title: 'Mis envíos', text: u ? `Estás conectado como ${app.auth.roleName(u.role)}. Esta sección es para destinatarios.` : 'Ingresa con tu cuenta para ver todos los paquetes que vienen hacia ti, dejar indicaciones y reprogramar.', action: u ? `<a class="btn" href="${app.homeFor(u)}">Ir a mi panel</a>` : '<a class="btn btn-primary" href="login.html?next=index.html%23%2Fmis-envios">Ingresar</a>' }))}</div></section>`;
    return;
  }
  const mine = db.query('shipments', s => s.kind === 'entrega' && isMine(s));
  const active = mine.filter(s => !ops.isDone(s) && !['devuelto', 'cancelado'].includes(s.status)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const past = mine.filter(s => ops.isDone(s) || ['devuelto', 'cancelado'].includes(s.status)).sort((a, b) => String(b.deliveredAt || b.statusAt).localeCompare(String(a.deliveredAt || a.statusAt)));
  const toRate = past.filter(s => ops.isDone(s) && !s.rating);
  view.innerHTML = html`<section class="section"><div class="container stack">
      <div class="row between"><div><span class="eyebrow">Hola, ${u.name.split(' ')[0]}</span><h1>Mis envíos</h1></div><a class="btn" href="#/seguimiento">Buscar otro código</a></div>
      ${toRate.length ? html`<div class="rp-callout"><b>Tienes ${toRate.length} entrega(s) por evaluar</b><span>Tu opinión ayuda a mejorar el servicio de los conductores.</span></div>` : ''}
      <h2 class="rp-h2">Próximas entregas (${active.length})</h2>
      ${active.length ? html`<div class="stack">${active.map(s => raw(shipCard(s)))}</div>` : raw(emptyState({ icon: '📭', title: 'No tienes envíos en camino' }))}
      <h2 class="rp-h2">Entregados</h2>
      ${past.length ? html`<div class="stack">${past.map(s => raw(shipCard(s, { full: true })))}</div>` : raw('<p class="muted">Aún no hay entregas.</p>')}
    </div></section>`;
  wireActions(view.firstElementChild);
}

function business(view) {
  const rs = db.all('rates');
  view.innerHTML = html`<section class="section"><div class="container stack">
      <div class="site-hero-lite"><span class="eyebrow">Empresas</span><h1>Despachos para tu tienda, con prueba de entrega</h1><p class="muted lead">Retiramos en tu bodega, entregamos en 31 comunas y te mostramos cada intento con foto, firma y RUT de quien recibe.</p></div>
      <div class="grid-3">${rs.map(r => html`<article class="card rp-plan"><span class="eyebrow">Plan</span><h3>${r.name}</h3><p class="rp-price">${money(r.base)}<small> hasta 1 kg</small></p><ul class="rp-mini"><li>Kilo adicional ${money(r.perKg)}</li><li>Bulto adicional ${money(r.perPiece)}</li><li>Express +${money(r.express)} · Mismo día +${money(r.sameDay)}</li><li>Contra entrega ${String(r.codPct).replace('.', ',')} % del monto</li></ul></article>`)}</div>
      <div class="k-grid-main">
        <section class="card"><h2 style="margin-top:0">Cotiza un envío</h2><form class="k-form" data-q novalidate>
          <div class="field"><label for="q-plan">Plan</label><select class="select" id="q-plan" name="plan">${rs.map(r => html`<option value="${r.id}">${r.name}</option>`)}</select></div>
          <div class="field"><label for="q-com">Comuna de destino</label><select class="select" id="q-com" name="comuna">${COMUNA_NAMES.map(c => html`<option ${c === 'Providencia' ? 'selected' : ''}>${c}</option>`)}</select></div>
          <div class="field"><label for="q-kg">Peso (kg)</label><input class="input" id="q-kg" name="weight" type="number" min="0.1" max="70" step="0.1" value="2"></div>
          <div class="field"><label for="q-pc">Bultos</label><input class="input" id="q-pc" name="pieces" type="number" min="1" max="20" value="1"></div>
          <div class="field"><label for="q-sv">Servicio</label><select class="select" id="q-sv" name="service">${SERVICES.map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select></div>
          <div class="field"><label for="q-cod">Cobro contra entrega</label><input class="input" id="q-cod" name="cod" type="number" min="0" step="10" value="0"></div>
        </form></section>
        <section class="card rp-quote"><span class="eyebrow">Precio por envío</span><b data-price>—</b><small class="muted" data-detail></small><a class="btn btn-primary" href="login.html">Crear cuenta empresa</a></section>
      </div>
      <div class="grid-3">
        <article class="card"><h3>⇪ Carga masiva</h3><p class="muted">Sube tu planilla CSV; validamos cada fila (comuna, teléfono, peso) antes de crear los envíos y sus etiquetas.</p></article>
        <article class="card"><h3>🖊️ Pruebas de entrega</h3><p class="muted">Foto, firma, nombre y RUT de quien recibe, descargables para tus reclamos y tu servicio al cliente.</p></article>
        <article class="card"><h3>🧾 Facturación mensual</h3><p class="muted">Una factura al mes con el detalle de envíos, y lo recaudado contra entrega se abona en tu liquidación.</p></article>
      </div>
    </div></section>`;
  const f = view.querySelector('[data-q]');
  const calc = () => {
    const v = { comuna: f.comuna.value, weight: +f.weight.value, pieces: +f.pieces.value || 1, service: f.service.value, cod: +f.cod.value || 0 };
    if (!(v.weight > 0 && v.weight <= 70)) { view.querySelector('[data-price]').textContent = '—'; view.querySelector('[data-detail]').textContent = 'Peso entre 0,1 y 70 kg'; return; }
    const z = db.get('zones', 'z-' + COMUNA[v.comuna].zone);
    view.querySelector('[data-price]').textContent = money(priceFor(v, { rateId: f.plan.value }));
    view.querySelector('[data-detail]').textContent = `Zona ${z?.name}${z?.surcharge ? ` (recargo ${money(z.surcharge)})` : ''} · corte ${z?.cutoff} · IVA incluido`;
  };
  f.addEventListener('input', calc); f.addEventListener('change', calc); calc();
}

function pointsPage(view, ctx) {
  const q = ctx.query.comuna || '';
  const pts = db.query('points', p => p.active !== false && (!q || p.comuna === q));
  view.innerHTML = html`<section class="section"><div class="container stack">
      <div><span class="eyebrow">Puntos de retiro</span><h1>Retira cuando quieras</h1><p class="muted">Lockers y tiendas aliadas. Si no vas a estar en casa, elige uno al seguir tu envío.</p></div>
      <div class="k-toolbar"><select class="select" data-c aria-label="Comuna"><option value="">Todas las comunas</option>${[...new Set(db.all('points').map(p => p.comuna))].sort().map(c => html`<option ${c === q ? 'selected' : ''}>${c}</option>`)}</select></div>
      <div class="rp-route-grid">
        <section class="card rp-mapcard">${raw(cityMap({ points: pts.map((p, i) => ({ x: p.x, y: p.y, kind: 'point', label: i + 1, title: p.name })), fit: pts.length ? pts : null, ratio: 1.4, label: 'Mapa de puntos de retiro', depot: false }))}</section>
        <div class="stack">${pts.length ? pts.map((p, i) => { const used = db.count('shipments', s => s.status === 'en_punto' && s.redirectPointId === p.id); return html`<article class="card rp-point"><span class="rp-qnum">${i + 1}</span><span><b>${p.name}</b><small>${p.kind} · ${p.address}, ${p.comuna}</small><small>${p.hours}</small></span><span class="badge ${used >= p.capacity ? 'badge-danger' : 'badge-success'}">${used >= p.capacity ? 'Lleno' : `${p.capacity - used} libres`}</span></article>`; }) : raw(emptyState({ icon: '🏪', title: 'Sin puntos en esa comuna' }))}</div>
      </div></div></section>`;
  view.querySelector('[data-c]').addEventListener('change', e => { location.hash = '#/puntos' + (e.target.value ? '?comuna=' + encodeURIComponent(e.target.value) : ''); });
}

function coverage(view) {
  const zs = db.all('zones');
  view.innerHTML = html`<section class="section"><div class="container stack">
      <div><span class="eyebrow">Cobertura</span><h1>${COMUNAS.length} comunas en 6 zonas</h1><p class="muted">Cada zona tiene su hora de corte: lo que llega al centro de distribución antes, sale a reparto el mismo día.</p></div>
      <section class="card rp-check-cov"><label for="cv-c"><b>¿Llegamos a tu comuna?</b></label><div class="row" style="flex-wrap:nowrap"><select class="select" id="cv-c"><option value="">Elige tu comuna…</option>${COMUNA_NAMES.map(c => html`<option>${c}</option>`)}</select></div><p data-res class="small" aria-live="polite"></p></section>
      <div class="rp-route-grid">
        <section class="card rp-mapcard">${raw(cityMap({ points: COMUNAS.map(c => ({ x: c.x, y: c.y, kind: 'dot', title: c.n, color: zs.find(z => z.key === c.zone)?.color })), zones: Object.fromEntries(zs.map(z => [z.key, z.color])), ratio: 1, label: 'Zonas de reparto' }))}</section>
        <div class="stack">${zs.map(z => html`<article class="card rp-zonecov" style="--mk:${z.color}"><header><span class="rp-sw"></span><b>${z.name}</b><span class="badge">corte ${z.cutoff}</span>${z.surcharge ? html`<span class="badge badge-warning">+${money(z.surcharge)}</span>` : ''}</header><p class="small muted">${z.comunas.join(' · ')}</p></article>`)}</div>
      </div></div></section>`;
  view.querySelector('#cv-c').addEventListener('change', e => {
    const c = COMUNA[e.target.value], out = view.querySelector('[data-res]');
    if (!c) { out.textContent = ''; return; }
    const z = zs.find(x => x.key === c.zone);
    const [h, m] = z.cutoff.split(':').map(Number), now = new Date();
    const before = now.getHours() * 60 + now.getMinutes() < h * 60 + m;
    out.innerHTML = html`✅ Sí, ${c.n} está en la zona <b>${z.name}</b>. ${before ? `Si tu tienda despacha antes de las ${z.cutoff}, llega hoy.` : `Hoy ya pasó la hora de corte (${z.cutoff}): lo que se despache ahora llega mañana.`}`;
  });
}

app.site({
  nav: [['Inicio', '#/'], ['Seguimiento', '#/seguimiento'], ['Mis envíos', '#/mis-envios'], ['Empresas', '#/empresas'], ['Puntos de retiro', '#/puntos'], ['Cobertura', '#/cobertura']],
  footer: `<div class="rp-foot"><b>📦 Pudú Envíos</b><span>${escape(S().phone)} · ${escape(S().email)}</span><span>Centro de distribución: ${escape(DEPOT.address)}</span><span class="muted">Demo simulada en el navegador · los datos se renuevan cada día</span></div>`,
  routes: {
    '/': home,
    '/seguimiento': tracking,
    '/mis-envios': myShipments,
    '/empresas': business,
    '/puntos': pointsPage,
    '/cobertura': coverage
  }
});
