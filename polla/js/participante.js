// App del participante: pagar, ver el pozo de cada ronda, su turno, cambios de turno, muro, estado de cuenta y reputación.
import { app, db, joined, me } from './app.js';
import * as L from './logic.js';
import * as V from './views.js';
import { joinHTML, mountJoin, findByCode, notFound } from './join.js';
import { accountSection } from '../../assets/core/pages.js';
import { pageHead, kpis, card, emptyState, kv } from '../../assets/core/blocks.js';
import { html, raw, money, toast, confirm, dateTime, downloadCSV, escape } from '../../assets/core/ui.js';
import { fieldsModal } from '../../assets/core/resource.js';

const { tryDo, once, who } = V;
const monthOf = q => (/^\d{4}-\d{2}$/.test(q?.m || '') ? q.m : L.today(db).slice(0, 7));
const page = view => { const w = document.createElement('div'); w.className = 'g-page'; w.append(...view.childNodes); view.appendChild(w); return w; };
const myOpen = uid => db.query('payments', x => x.userId === uid && ['pendiente', 'atrasado', 'rechazado', 'informado'].includes(x.status) && L.pollaOf(db, x.pollaId)?.status === 'en_curso')
  .map(x => ({ x, p: L.pollaOf(db, x.pollaId), r: db.get('rounds', x.roundId) })).sort((a, b) => a.r.dueDate.localeCompare(b.r.dueDate));
const toReceive = uid => db.query('rounds', r => r.status === 'entregada' && r.slotId && V.holders(db.get('slots', r.slotId)).some(m => m.userId === uid) && !(r.receiptBy || []).includes(uid));
const myTurns = uid => db.query('members', m => m.userId === uid && m.status === 'activo').map(m => { const p = L.pollaOf(db, m.pollaId), s = L.slotOfMember(db, m), r = s && L.roundOfSlot(db, s); return { m, p, s, r }; }).filter(o => o.p && ['en_curso', 'inscripcion'].includes(o.p.status));
const fee = x => (x.feeWaived ? 0 : x.lateFee || 0);

function payRow({ x, p, r }, { showPolla = true } = {}) {
  const t = L.today(db), d = L.diffDays(r.dueDate, t);
  return html`<li class="g-payrow st-${x.status}"><span class="g-date ${x.status === 'atrasado' ? 'is-late' : ''}"><b>${L.parseYmd(r.dueDate).getDate()}</b><small>${L.fdate(r.dueDate).split(' ')[1]}</small></span>
    <div style="flex:1;min-width:0"><b>${money(x.amount + fee(x))}</b>${fee(x) ? html` <small class="g-bad">incl. multa ${money(fee(x))}</small>` : ''}<small class="muted" style="display:block">${showPolla ? `${p.emoji} ${p.name} · ` : ''}ronda ${r.n} · ${x.status === 'atrasado' ? 'atrasada' : d < 0 ? `venció ${L.relDay(r.dueDate, t)}` : `vence ${L.relDay(r.dueDate, t)}`}</small>${x.status === 'rechazado' ? html`<small class="g-bad" style="display:block">Rechazado: ${x.history.at(-1)?.note}</small>` : ''}</div>
    ${x.status === 'informado' ? raw('<span class="badge badge-info">En revisión</span>') : html`<button type="button" class="btn btn-sm ${x.status === 'atrasado' ? 'btn-danger' : 'btn-primary'}" data-pay="${x.id}">Pagar</button>`}</li>`;
}
function wirePay(el, u) { el.addEventListener('click', e => { const b = e.target.closest('[data-pay]'); if (b) once(b, () => V.payModal(db.get('payments', b.dataset.pay), u)); }); }
function receiveCards(u) {
  return toReceive(u.id).map(r => { const p = L.pollaOf(db, r.pollaId), mv = db.query('movements', m => m.roundId === r.id && m.type === 'pago_pozo' && m.userId === u.id).reduce((s, m) => s + m.amount, 0); return html`<section class="card g-celebrate"><div class="g-celebrate-ico" aria-hidden="true">🎉</div><div style="flex:1;min-width:0"><h3 style="margin:0">¡Te entregaron el pozo de ${p.name}!</h3><p class="muted" style="margin:4px 0 0">Ronda ${r.n} · ${money(mv)} el ${dateTime(r.paidAt)}${r.payRef ? ` · operación N° ${r.payRef}` : ''}. Confirma que lo recibiste para cerrar la ronda.</p></div><div class="row" style="gap:6px"><button type="button" class="btn btn-primary" data-rcv="${r.id}">✓ Sí, lo recibí</button><a class="btn btn-ghost" href="#/comprobante/${r.receipt}">Comprobante</a></div></section>`; });
}
function wireReceive(el, u) { el.querySelectorAll('[data-rcv]').forEach(b => b.addEventListener('click', () => once(b, () => tryDo(() => L.confirmReceipt(db, b.dataset.rcv, u.id), '¡Gracias! Recepción confirmada')))); }

// ======================= Inicio =======================
function inicio(view, ctx) {
  const u = ctx.user, open = myOpen(u.id), turns = myTurns(u.id), rep = L.reputation(db, u.id), list = joined(u).filter(p => p.status === 'en_curso');
  const nextMine = turns.filter(o => o.r && !['entregada', 'confirmada'].includes(o.r.status)).sort((a, b) => a.r.dueDate.localeCompare(b.r.dueDate))[0];
  const late = open.filter(o => o.x.status === 'atrasado');
  const swapsIn = db.query('swaps', s => s.status === 'solicitado' && V.holders(db.get('slots', s.toSlotId)).some(m => m.userId === u.id));
  view.innerHTML = html`${pageHead(`Hola, ${u.name.split(' ')[0]} 🐣`, raw(`Tu reputación: <span class="badge badge-${rep.tone}">★ ${rep.score} · ${escape(rep.label)}</span>`), '<a class="btn" href="#/unirse">＋ Unirme con código</a>')}
    ${receiveCards(u)}
    ${late.length ? html`<div class="g-alert is-danger" role="alert"><b>Tienes ${late.length} cuota${late.length === 1 ? '' : 's'} atrasada${late.length === 1 ? '' : 's'}.</b> Mientras no pagues, el pozo de esa ronda no se puede entregar. <a href="#/pagar">Pagar ahora</a></div>` : ''}
    ${L.debtOf(db, null, u.id) && db.count('payments', x => x.userId === u.id && x.status === 'cubierto') ? html`<div class="g-alert is-warning"><b>Tienes una deuda de ${money(db.query('payments', x => x.userId === u.id && x.status === 'cubierto').reduce((s, x) => s + x.amount + fee(x), 0))}</b> por cuotas que otra persona cubrió por ti. <a href="#/pagar">Ver cómo pagarla</a></div>` : ''}
    ${swapsIn.length ? html`<div class="g-alert is-info"><b>🔁 ${L.userName(db, swapsIn[0].fromUserId)}</b> te pide cambiar de turno (${swapsIn[0].fromTurn} ↔ ${swapsIn[0].toTurn}). <a href="#/cambios">Responder</a></div>` : ''}
    ${raw(kpis([
      { label: 'Por pagar', value: money(open.filter(o => o.x.status !== 'informado').reduce((s, o) => s + o.x.amount + fee(o.x), 0)), icon: '💸', href: '#/pagar', hint: `${open.filter(o => o.x.status !== 'informado').length} cuota(s) · ${open.filter(o => o.x.status === 'informado').length} en revisión` },
      { label: 'Tu próximo pozo', value: nextMine ? money(L.potOf(nextMine.p) - (nextMine.r.discount || 0)) : '—', icon: '🎁', hint: nextMine ? `${nextMine.p.name} · ${L.fdate(nextMine.r.dueDate)}` : 'sin turno pendiente' },
      { label: 'Pollas activas', value: list.length, icon: '🐣', href: '#/pollas' },
      { label: 'Reputación', value: rep.score, icon: '⭐', href: '#/reputacion', hint: rep.label }
    ]))}
    <div class="k-grid-main"><div class="stack">
      ${raw(card('Tus próximos pagos', open.length ? html`<ul class="g-pays-list">${open.slice(0, 5).map(o => payRow(o))}</ul>` : emptyState({ icon: '✅', title: 'Estás al día', text: 'No tienes cuotas pendientes. ¡Bien ahí!' }), { actions: open.length > 5 ? '<a class="btn btn-sm btn-ghost" href="#/pagar">Ver todas</a>' : '' }))}
      ${list.length ? raw(card('Cómo va el pozo', html`<div class="g-pgrid">${list.map(p => raw(V.pollaCard(p, { user: u })))}</div>`)) : ''}
    </div><div class="stack">
      ${raw(card('Tus turnos', turns.length ? html`<ul class="g-list">${turns.map(({ p, s, r }) => html`<li><a class="g-row-link" href="#/pollas/${p.id}?tab=turnos"><span class="g-emoji">${p.emoji}</span><span style="flex:1;min-width:0"><b>${p.name}</b><small class="muted" style="display:block">${s?.turn ? `Turno ${s.turn} de ${p.cupos}` : p.mode === 'remate' ? 'Remate: puja por una ronda' : 'Turno por definir'}${r ? ` · ${L.fdate(r.dueDate)}` : ''}</small></span>${r && ['entregada', 'confirmada'].includes(r.status) ? raw('<span class="badge badge-success">Recibido</span>') : r ? html`<span class="badge badge-primary">${L.relDay(r.dueDate, L.today(db))}</span>` : ''}</a></li>`)}</ul>` : '<p class="muted small">Aún no estás en ninguna polla.</p>'))}
      ${raw(card('Últimas novedades', V.notifList(u.id, { limit: 5, page: 'participante.html' }), { actions: '<a class="btn btn-sm btn-ghost" href="#/notificaciones">Ver todas</a>' }))}
    </div></div>`;
  const w = page(view);
  wirePay(w, u); wireReceive(w, u); V.mountNotifs(w);
}

// ======================= Mis pollas =======================
function misPollas(view, ctx) {
  const u = ctx.user, list = joined(u), reqs = db.query('members', m => m.userId === u.id && m.status === 'solicitud');
  const groups = [['Activas', list.filter(p => p.status === 'en_curso')], ['En inscripción', list.filter(p => ['inscripcion', 'borrador'].includes(p.status))], ['Terminadas', list.filter(p => ['finalizada', 'cancelada'].includes(p.status))]];
  view.innerHTML = html`${pageHead('Mis pollas', `${list.length} polla(s) en las que participas`, '<a class="btn btn-primary" href="#/unirse">＋ Unirme con código</a>')}
    ${reqs.length ? html`<div class="g-alert is-info">Solicitudes esperando aprobación: ${reqs.map(m => L.pollaOf(db, m.pollaId)?.name).join(', ')}.</div>` : ''}
    ${list.length ? groups.filter(g => g[1].length).map(([t, ps]) => html`<h2 class="g-h2">${t}</h2><div class="g-pgrid">${ps.map(p => raw(V.pollaCard(p, { user: u })))}</div>`) : raw(emptyState({ icon: '🐣', title: 'Aún no estás en ninguna polla', text: 'Pídele el código a quien organiza y únete en un minuto.', action: '<a class="btn btn-primary" href="#/unirse">Unirme con código</a>' }))}`;
}

const tabLink = (p, id, label, cur) => html`<a class="tab ${cur === id ? 'active' : ''}" href="#/pollas/${p.id}?tab=${id}">${label}</a>`;
function pollaView(view, ctx) {
  const u = ctx.user, p = db.get('pollas', ctx.params.id);
  const m = p && db.find('members', x => x.pollaId === p.id && x.userId === u.id && ['activo', 'reemplazado'].includes(x.status));
  if (!p || !m) { view.innerHTML = emptyState({ icon: '🔎', title: 'No participas en esta polla', action: '<a class="btn" href="#/pollas">← Mis pollas</a>' }); return; }
  const tab = ctx.query.tab || 'resumen', staff = L.isStaff(p, u);
  view.innerHTML = html`<a class="small g-back" href="#/pollas">← Mis pollas</a>
    ${pageHead(`${p.emoji} ${p.name}`, raw(`${L.POLLA.badge(p.status)} <span class="muted">· ${escape(p.code)} · ${money(L.cuotaOf(db, m))} ${escape(L.freqLabel(p).toLowerCase())}</span>`), staff ? `<a class="btn" href="organizador.html#/pollas/${p.id}">⚙️ Gestionar</a>` : '')}
    <nav class="tabs g-tabs" aria-label="Secciones">${tabLink(p, 'resumen', 'Resumen', tab)}${tabLink(p, 'aportes', 'Mis aportes', tab)}${tabLink(p, 'turnos', 'Turnos', tab)}${tabLink(p, 'muro', 'Muro', tab)}${tabLink(p, 'cuenta', 'Mi cuenta', tab)}${tabLink(p, 'reglas', 'Reglas', tab)}</nav><div data-body class="g-tab-body"></div>`;
  const body = view.querySelector('[data-body]');
  ({ resumen: pResumen, aportes: pAportes, turnos: pTurnos, muro: pMuro, cuenta: pCuenta, reglas: pReglas }[tab] || pResumen)(body, p, m, u, ctx);
}
function pResumen(el, p, m, u) {
  const s = L.slotOfMember(db, m), r = L.currentRound(db, p.id), mine = s && L.roundOfSlot(db, s), myPay = r && db.find('payments', x => x.roundId === r.id && x.userId === u.id);
  const net = mine ? L.splitInt(L.potOf(p) - (mine.discount || 0), s.holders.map(() => 1))[s.holders.indexOf(m.id)] : null;
  const myRec = toReceive(u.id).filter(x => x.pollaId === p.id);
  el.innerHTML = html`${myRec.length ? receiveCards(u).filter((_, i) => toReceive(u.id)[i].pollaId === p.id) : ''}<div class="k-grid-main"><div class="stack">
    ${p.status === 'en_curso' && r ? raw(card('Pozo de la ronda actual', html`${V.roundSummary(r, p)}${myPay ? html`<div class="g-mine"><span>Tu cuota de esta ronda</span>${raw(L.PAY.badge(myPay.status))}${['pendiente', 'atrasado', 'rechazado'].includes(myPay.status) ? html`<button type="button" class="btn btn-primary btn-sm" data-pay="${myPay.id}">Pagar ${money(myPay.amount + fee(myPay))}</button>` : myPay.receipt ? html`<a class="btn btn-sm btn-ghost" href="#/comprobante/${myPay.receipt}">🧾 ${myPay.receipt}</a>` : ''}</div>` : ''}`)) : ''}
    ${p.status === 'inscripcion' || p.status === 'borrador' ? raw(card('Esperando que parta', html`<p>La polla parte el <b>${L.fdate(p.startDate)}</b>. Van ${db.count('slots', x => x.pollaId === p.id)} de ${p.cupos} cupos.</p>${raw(V.bar(V.pct(db.count('slots', x => x.pollaId === p.id), p.cupos)))}<p class="small muted">${p.mode === 'sorteo' ? (p.draw ? `Sorteo listo: tu turno es el ${s?.turn}.` : 'Cuando se completen los cupos se hará el sorteo en vivo.') : p.mode === 'fijo' ? 'La organización está definiendo el orden.' : p.mode === 'llegada' ? `Elegiste el turno ${s?.turn ?? '—'}.` : 'Las rondas se rematan una a una.'}</p>`)) : ''}
    ${p.status === 'cancelada' ? raw(card('La polla terminó antes', settlementMine(p, u))) : ''}
    ${p.status === 'finalizada' ? raw(card('', emptyState({ icon: '🎉', title: 'Polla terminada', text: 'Se entregaron todos los pozos. ¡Gracias por cumplir!' }))) : ''}
    ${raw(card('Turnos', V.turnsList(p, { userId: u.id, compact: true }), { actions: `<a class="btn btn-sm btn-ghost" href="#/pollas/${p.id}?tab=turnos">Ver y pedir cambio</a>` }))}
  </div><div class="stack">
    ${raw(card('Tu cupo', kv([['Cupo', s ? `${s.code}${s.half ? ' (medio cupo, compartido con ' + V.holders(s).filter(h => h.id !== m.id).map(h => L.userName(db, h.userId)).join(', ') + ')' : ''}` : '—'], ['Turno', s?.turn ? `${s.turn} de ${p.cupos}` : p.mode === 'remate' ? 'Se define en remate' : 'Por definir'], ['Recibes', mine ? `${money(net)} el ${L.fdate(mine.dueDate)}` : '—'], ['Estado', mine ? L.ROUND.label(mine.status) : '—'], ['Tu cuota', money(L.cuotaOf(db, m))]])))}
    ${raw(card('Organiza', html`<div class="g-join-org">${raw(V.av(V.U(p.organizerId), 40))}<div><b>${L.userName(db, p.organizerId)}</b><small class="muted" style="display:block">${V.U(p.organizerId)?.phone || ''}${p.treasurerId ? ` · tesorería: ${L.userName(db, p.treasurerId)}` : ''}</small></div></div><p class="small"><b>Para pagar:</b> ${p.paymentInfo || '—'}</p>`))}
  </div></div>`;
  wirePay(el, u); wireReceive(el, u);
}
function settlementMine(p, u) {
  const s = p.settlement, row = s?.rows.find(r => r.userId === u.id);
  if (!row) return '<p class="muted small">Sin liquidación registrada.</p>';
  return html`<p class="small muted" style="margin-top:0">Motivo: ${p.history.at(-1)?.note || ''}</p>${kv([['Aportaste', money(row.aportado)], ['Recibiste', money(row.recibido)], ['Se te devolvió', money(row.refund)], ['Queda por recibir', row.pendingIn ? money(row.pendingIn) : '—'], ['Debes', row.owes ? money(row.owes) : '—']])}`;
}
function pAportes(el, p, m, u) {
  const pays = db.query('payments', x => x.pollaId === p.id && x.userId === u.id).map(x => ({ x, p, r: db.get('rounds', x.roundId) })).sort((a, b) => a.r.n - b.r.n);
  el.innerHTML = card('Mis cuotas', pays.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Ronda</th><th>Vence</th><th class="k-num">Monto</th><th>Estado</th><th></th></tr></thead><tbody>${pays.map(({ x, r }) => html`<tr><td>R${r.n}</td><td class="k-nowrap">${L.fdate(r.dueDate)}</td><td class="k-num">${money(x.amount)}${fee(x) ? html`<small class="g-bad" style="display:block">+ multa ${money(fee(x))}</small>` : ''}</td><td>${raw(L.PAY.badge(x.status))}</td><td>${['pendiente', 'atrasado', 'rechazado'].includes(x.status) && p.status === 'en_curso' ? html`<button type="button" class="btn btn-sm btn-primary" data-pay="${x.id}">Pagar</button>` : x.receipt ? html`<a class="btn btn-sm btn-ghost" href="#/comprobante/${x.receipt}">🧾 ${x.receipt}</a>` : x.status === 'cubierto' ? html`<a class="btn btn-sm" href="#/pagar">Pagar deuda</a>` : ''}</td></tr>`)}</tbody></table></div>` : emptyState({ icon: '📅', title: 'Tus cuotas aparecerán cuando parta la polla' }), { sub: 'Puedes adelantar cuotas de rondas futuras.' });
  wirePay(el, u);
}
function pTurnos(el, p, m, u) {
  const s = L.slotOfMember(db, m), canSwap = ['en_curso', 'inscripcion'].includes(p.status) && s?.turn && !L.received(db, s) && p.mode !== 'remate';
  const open = p.mode === 'remate' && p.status === 'en_curso' ? L.roundsOf(db, p.id).find(r => !r.slotId) : null;
  const myBid = open && (open.bids || []).find(b => b.slotId === s?.id);
  const iReceived = s && L.roundOfSlot(db, s);
  el.innerHTML = html`<div class="k-grid-main"><section class="card"><div class="k-card-head"><h3>Orden de turnos</h3></div>${V.turnsList(p, { userId: u.id })}</section><div class="stack">
    ${open ? raw(card(`🔨 Remate de la ronda ${open.n}`, iReceived ? `<p class="small muted">Tu cupo ya tiene turno (ronda ${iReceived.n}): no puedes pujar de nuevo.</p>` : html`<p class="small">Pozo: <b>${money(L.potOf(p))}</b>. Ofrece un descuento para recibirlo el <b>${L.fdate(open.dueDate)}</b>. El descuento se reparte entre los demás cupos. Mejor oferta actual: <b>${(open.bids || []).length ? money(Math.max(...open.bids.map(b => b.amount))) : 'ninguna'}</b>.</p><form class="row" data-bid novalidate><input class="input" type="number" name="amount" min="1000" step="500" max="${Math.floor(L.potOf(p) * (p.maxBidPct || 25) / 100)}" placeholder="Descuento, ej: 20000" value="${myBid?.amount || ''}" aria-label="Monto de tu puja" style="flex:1;min-width:140px"><button class="btn btn-primary" type="submit">${myBid ? 'Cambiar puja' : 'Pujar'}</button></form><small class="muted">Máximo ${p.maxBidPct || 25}% del pozo (${money(Math.floor(L.potOf(p) * (p.maxBidPct || 25) / 100))}). ${myBid ? `Tu puja: ${money(myBid.amount)} → recibirías ${money(L.potOf(p) - myBid.amount)}.` : ''}</small>`)) : ''}
    ${raw(card('¿Necesitas otro turno?', canSwap ? html`<p class="small muted" style="margin-top:0">Pídele a otro cupo que cambie contigo. Si acepta, la organización lo aprueba y quedan intercambiados.</p><form class="stack" data-swap novalidate><div class="field"><label for="sw-to">Cambiar mi turno ${s.turn} por</label><select class="select" id="sw-to" name="to">${L.slotsOf(db, p.id).filter(x => x.id !== s.id && x.turn && !L.received(db, x)).map(x => html`<option value="${x.id}">Turno ${x.turn} · ${L.slotLabel(db, x)}</option>`)}</select></div><div class="field"><label for="sw-msg">Mensaje</label><textarea class="textarea" id="sw-msg" name="msg" rows="2" placeholder="Cuéntale por qué te sirve el cambio"></textarea></div><button class="btn" type="submit">🔁 Pedir cambio</button></form>` : `<p class="small muted">${p.mode === 'remate' ? 'En remate los turnos se ganan pujando.' : L.received(db, s) ? 'Tu cupo ya recibió el pozo.' : 'Los cambios se piden cuando los turnos están asignados.'}</p>`))}
  </div></div>`;
  el.querySelector('[data-bid]')?.addEventListener('submit', e => { e.preventDefault(); const b = e.target.querySelector('button'); once(b, () => tryDo(() => L.bid(db, open.id, m.id, e.target.amount.value), 'Puja registrada')); });
  el.querySelector('[data-swap]')?.addEventListener('submit', e => { e.preventDefault(); const b = e.target.querySelector('button'); once(b, () => tryDo(() => L.requestSwap(db, p.id, m.id, e.target.to.value, e.target.msg.value.trim()), 'Solicitud enviada')); });
}
function pMuro(el, p, m, u) { el.innerHTML = card('Muro de la gallada', V.wallHTML(p.id, u, { staff: L.isStaff(p, u) })); V.mountWall(el, p.id, u); }
function pCuenta(el, p, m, u) {
  const pos = L.positions(db, p.id).find(x => x.userId === u.id) || { aportado: 0, recibido: 0, net: 0, debt: 0 };
  el.innerHTML = html`${raw(kpis([{ label: 'Aportado', value: money(pos.aportado), icon: '⬆️' }, { label: 'Recibido', value: money(pos.recibido), icon: '⬇️' }, { label: 'Tu posición', value: V.signed(pos.net), icon: '⚖️', hint: pos.net > 0 ? 'ya recibiste: te queda por aportar' : pos.net < 0 ? 'te toca recibir' : 'parejo' }, { label: 'Deuda', value: money(pos.debt), icon: '⏰' }]))}
    ${p.status === 'cancelada' ? raw(card('Liquidación', settlementMine(p, u))) : ''}${raw(card('Mis movimientos en esta polla', V.ledgerTable(p.id, { userId: u.id })))}`;
}
function pReglas(el, p, m, u) {
  el.innerHTML = html`<div class="k-grid-main">${raw(card('Reglas', `<p class="g-pre">${escape(p.rules || 'Sin reglas escritas.')}</p>`))}<div class="stack">${raw(card('Datos para pagar', `<p class="g-pre small">${escape(p.paymentInfo || '—')}</p>`))}${raw(card('¿Algún problema?', '<p class="small muted">Si alguien no paga o no te entregan lo que corresponde, conversa primero en el muro. Si no se resuelve, repórtalo a Gallada.</p><button type="button" class="btn btn-sm" data-report>⚖️ Reportar un problema</button>'))}</div></div>`;
  el.querySelector('[data-report]').addEventListener('click', () => V.reportModal(p, u));
}

// ======================= Pagar =======================
function pagar(view, ctx) {
  const u = ctx.user, open = myOpen(u.id), t = L.today(db);
  const late = open.filter(o => o.x.status === 'atrasado' || (o.x.status !== 'informado' && L.diffDays(o.r.dueDate, t) < 0));
  const soon = open.filter(o => !late.includes(o) && o.x.status !== 'informado' && L.diffDays(o.r.dueDate, t) <= 14);
  const later = open.filter(o => !late.includes(o) && !soon.includes(o) && o.x.status !== 'informado');
  const review = open.filter(o => o.x.status === 'informado');
  const debts = db.query('payments', x => x.userId === u.id && x.status === 'cubierto').map(x => ({ x, p: L.pollaOf(db, x.pollaId), r: db.get('rounds', x.roundId) }));
  view.innerHTML = html`${pageHead('Pagar', 'Transfiere con los datos de cada polla e informa tu pago aquí. Cuando la organización lo confirme recibirás tu comprobante.')}
    ${debts.length ? raw(card('Deudas por cuotas que te cubrieron', html`<ul class="g-pays-list">${debts.map(({ x, p, r }) => html`<li class="g-payrow"><span class="g-date is-late"><b>R${r.n}</b></span><div style="flex:1;min-width:0"><b>${money(x.amount + fee(x))}</b><small class="muted" style="display:block">${p.emoji} ${p.name} · te cubrió ${L.userName(db, x.coveredBy)}</small>${x.debtReported ? html`<small class="g-info" style="display:block">Avisaste que pagaste ${dateTime(x.debtReported.at)}: esperando confirmación</small>` : ''}</div>${x.debtReported ? '' : html`<button type="button" class="btn btn-sm btn-danger" data-debt="${x.id}">Avisar que pagué</button>`}</li>`)}</ul>`, { sub: 'Págale directamente a quien te cubrió (o a la organización) y avisa aquí.' })) : ''}
    ${!open.length && !debts.length ? raw(card('', emptyState({ icon: '✅', title: 'No tienes nada por pagar', text: 'Estás al día en todas tus pollas.' }))) : ''}
    ${late.length ? raw(card('⏰ Atrasadas', html`<ul class="g-pays-list">${late.map(o => payRow(o))}</ul>`)) : ''}
    ${soon.length ? raw(card('Próximas dos semanas', html`<ul class="g-pays-list">${soon.map(o => payRow(o))}</ul>`)) : ''}
    ${review.length ? raw(card('En revisión', html`<ul class="g-pays-list">${review.map(o => payRow(o))}</ul>`, { sub: 'Ya informaste estos pagos; la organización los está confirmando.' })) : ''}
    ${later.length ? raw(card('Más adelante (puedes adelantar)', html`<ul class="g-pays-list">${later.slice(0, 12).map(o => payRow(o))}</ul>`)) : ''}`;
  const w = page(view);
  wirePay(w, u);
  w.querySelectorAll('[data-debt]').forEach(b => b.addEventListener('click', () => once(b, async () => {
    const x = db.get('payments', b.dataset.debt), p = L.pollaOf(db, x.pollaId);
    const v = await fieldsModal({ title: 'Avisar pago de deuda', size: '', submit: 'Avisar', intro: `Le pagaste <b>${money(x.amount + fee(x))}</b> a ${escape(L.userName(db, x.coveredBy))}. La organización lo regularizará en el libro.`, fields: [{ name: 'ref', label: 'N° de operación o comentario', required: true }] });
    if (!v) return;
    db.update('payments', x.id, { debtReported: { at: new Date().toISOString(), ref: v.ref } });
    [p.organizerId, x.coveredBy].filter((id, i, a) => id && a.indexOf(id) === i).forEach(id => L.notify(db, id, { pollaId: p.id, title: 'Avisaron pago de una deuda', text: `${u.name} dice que pagó la ronda ${db.get('rounds', x.roundId).n} de ${p.name} (${v.ref}).`, link: 'organizador.html#/pagos', kind: 'pago' }));
    db.log('pago', `${u.name} avisó pago de deuda en ${p.code}`, u.id);
    toast('Aviso enviado a la organización', 'success');
  })));
}

// ======================= Cambios, calendario, estado de cuenta, reputación, notificaciones =======================
function cambios(view, ctx) {
  const u = ctx.user, mySlots = new Set(db.query('members', m => m.userId === u.id && m.status === 'activo').map(m => m.slotId));
  const inc = db.query('swaps', s => mySlots.has(s.toSlotId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const out = db.query('swaps', s => s.fromUserId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const row = (s, mine) => { const p = L.pollaOf(db, s.pollaId); return html`<li class="g-swap"><div style="flex:1;min-width:0"><b>${p.emoji} ${p.name}</b> · turno <b>${s.fromTurn}</b> ↔ <b>${s.toTurn}</b><small class="muted" style="display:block">${mine ? `Pediste a ${L.slotLabel(db, db.get('slots', s.toSlotId))}` : `${L.userName(db, s.fromUserId)} te pide su turno ${s.fromTurn} por tu turno ${s.toTurn}`}${s.message ? ` · "${s.message}"` : ''}</small></div>${raw(L.SWAP.badge(s.status))}<div class="row" style="gap:6px">${!mine && s.status === 'solicitado' ? html`<button type="button" class="btn btn-sm btn-primary" data-sw="aceptado" data-id="${s.id}">Aceptar</button><button type="button" class="btn btn-sm btn-ghost" data-sw="rechazado" data-id="${s.id}">Rechazar</button>` : ''}${mine && ['solicitado', 'aceptado'].includes(s.status) ? html`<button type="button" class="btn btn-sm btn-ghost" data-sw="cancelado" data-id="${s.id}">Cancelar</button>` : ''}</div></li>`; };
  view.innerHTML = html`${pageHead('Cambios de turno', 'Si los dos cupos están de acuerdo, la organización aprueba y se intercambian los turnos.')}
    ${raw(card('Te piden a ti', inc.length ? html`<ul class="g-list">${inc.map(s => row(s, false))}</ul>` : '<p class="muted small">Nadie te ha pedido cambios.</p>'))}
    ${raw(card('Tus solicitudes', out.length ? html`<ul class="g-list">${out.map(s => row(s, true))}</ul>` : '<p class="muted small">No has pedido cambios. Hazlo desde la pestaña Turnos de cada polla.</p>'))}`;
  page(view).querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => once(b, async () => {
    let note = '';
    if (b.dataset.sw === 'rechazado') { const v = await fieldsModal({ title: 'Rechazar cambio', size: '', submit: 'Rechazar', fields: [{ name: 'note', label: 'Motivo (opcional)', type: 'textarea' }] }); if (!v) return; note = v.note; }
    tryDo(() => L.answerSwap(db, b.dataset.id, b.dataset.sw, u.id, note), { aceptado: 'Aceptaste: falta la aprobación de la organización', rechazado: 'Cambio rechazado', cancelado: 'Solicitud cancelada' }[b.dataset.sw]);
  })));
}
function calendario(view, ctx) {
  const list = joined(ctx.user).filter(p => ['en_curso', 'inscripcion'].includes(p.status));
  view.innerHTML = html`${pageHead('Calendario', 'Tus cuotas y el día en que recibes cada pozo.')}${raw(card('', V.calendar(V.pollaEvents(list, { userId: ctx.user.id, link: p => `#/pollas/${p.id}` }), monthOf(ctx.query), '#/calendario')))}`;
}
function estado(view, ctx) {
  const u = ctx.user;
  let net = 0;
  const rows = db.query('movements', m => m.userId === u.id).sort((a, b) => a.at.localeCompare(b.at)).map(m => { net += m.dir === 'in' ? -m.amount : m.amount; return { m, p: L.pollaOf(db, m.pollaId), net }; }).reverse();
  const ap = rows.filter(o => o.m.dir === 'in').reduce((s, o) => s + o.m.amount, 0), rc = rows.filter(o => o.m.dir === 'out').reduce((s, o) => s + o.m.amount, 0);
  const debt = L.debtOf(db, null, u.id);
  view.innerHTML = html`${pageHead('Estado de cuenta', `Todo lo que has aportado y recibido en Gallada · ${u.name}`, rows.length ? '<button type="button" class="btn" data-csv>⇩ CSV</button><button type="button" class="btn btn-ghost" data-print>🖨 Imprimir</button>' : '')}
    ${raw(kpis([{ label: 'Total aportado', value: money(ap), icon: '⬆️' }, { label: 'Total recibido', value: money(rc), icon: '⬇️' }, { label: 'Posición neta', value: V.signed(rc - ap), icon: '⚖️', hint: 'recibido − aportado' }, { label: 'Deuda viva', value: money(debt), icon: '⏰' }]))}
    <section class="card g-statement">${rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Polla</th><th>Movimiento</th><th class="k-num">Aportado</th><th class="k-num">Recibido</th><th class="k-num">Neto acumulado</th></tr></thead><tbody>${rows.map(({ m, p, net: n }) => html`<tr><td><small class="k-nowrap">${dateTime(m.at)}</small></td><td><small>${p?.emoji} ${p?.name}</small></td><td>${L.MOVE[m.type].label}<small class="muted" style="display:block">${m.note}${m.ref ? ' · ' : ''}${m.ref ? raw(m.ref.startsWith('CMP') || m.ref.startsWith('ENT') ? `<a href="#/comprobante/${escape(m.ref)}">${escape(m.ref)}</a>` : escape(m.ref)) : ''}</small></td><td class="k-num">${m.dir === 'in' ? money(m.amount) : ''}</td><td class="k-num g-ok">${m.dir === 'out' ? money(m.amount) : ''}</td><td class="k-num"><b>${money(n)}</b></td></tr>`)}</tbody></table></div>` : raw(emptyState({ icon: '📒', title: 'Aún no tienes movimientos', text: 'Aparecerán cuando la organización confirme tu primer aporte.' }))}</section>`;
  view.querySelector('[data-csv]')?.addEventListener('click', () => downloadCSV('estado-de-cuenta.csv', rows.map(({ m, p, net: n }) => ({ fecha: m.at, polla: p?.name, movimiento: L.MOVE[m.type].label, aportado: m.dir === 'in' ? m.amount : '', recibido: m.dir === 'out' ? m.amount : '', neto: n, comprobante: m.ref || '' }))));
  view.querySelector('[data-print]')?.addEventListener('click', () => window.print());
}
function reputacion(view, ctx) {
  const u = ctx.user, rep = L.reputation(db, u.id);
  const ps = db.query('members', m => m.userId === u.id && m.status !== 'solicitud' && m.status !== 'rechazado').map(m => ({ m, p: L.pollaOf(db, m.pollaId) })).filter(o => o.p);
  view.innerHTML = html`${pageHead('Tu reputación', 'La ven las organizaciones cuando pides unirte a una polla. Se construye pagando a tiempo.')}
    <div class="k-grid-main"><div class="stack">
      <section class="card g-rep-hero"><div class="g-rep"><b class="g-rep-n">${rep.score}</b><div>${raw(V.stars(rep.stars))}<h3 style="margin:4px 0 0">${rep.label}</h3><small class="muted">de 100 puntos</small></div></div>${raw(V.bar(rep.score, rep.tone === 'danger' ? 'danger' : ''))}</section>
      ${raw(card('Tu historial', html`<ul class="g-list">${ps.map(({ m, p }) => { const pays = db.query('payments', x => x.memberId === m.id), ok = pays.filter(x => ['confirmado', 'regularizado'].includes(x.status) && !(x.history || []).some(h => h.to === 'atrasado')).length; return html`<li><span class="g-emoji">${p.emoji}</span><span style="flex:1;min-width:0"><b>${p.name}</b><small class="muted" style="display:block">${L.POLLA.label(p.status)} · ${ok}/${pays.length} cuotas a tiempo${m.status === 'reemplazado' ? ' · saliste (reemplazo)' : ''}</small></span>${raw(L.POLLA.badge(p.status))}</li>`; })}</ul>`))}
    </div><div class="stack">
      ${raw(card('Cómo se calcula', kv([['Pagos a tiempo', `${rep.onTime} de ${rep.done}`], ['Pagos con atraso', rep.late], ['Cuotas que te cubrieron', rep.covered], ['Atrasos o deudas hoy', rep.lateNow], ['Pollas terminadas', rep.completed], ['Recepciones confirmadas', rep.confirmedReceipts]])))}
      ${raw(card('Para subir tu puntaje', '<ul class="small g-tips"><li>Paga antes del vencimiento (cuentan los días de gracia, pero no los uses siempre).</li><li>Si no puedes pagar, avisa en el muro antes de la fecha.</li><li>Confirma cuando recibas tu pozo.</li><li>Termina las pollas en las que entras.</li></ul>'))}
    </div></div>`;
}
function notificaciones(view, ctx) {
  view.innerHTML = html`${pageHead('Notificaciones', '', '<button type="button" class="btn btn-sm" data-all>Marcar todas como leídas</button>')}${raw(card('', V.notifList(ctx.user.id, { page: 'participante.html' })))}`;
  V.mountNotifs(view);
  view.querySelector('[data-all]').onclick = () => db.query('notifs', n => n.userId === ctx.user.id && !n.read).forEach(n => db.update('notifs', n.id, { read: true }));
}
function unirse(view, ctx) {
  const u = ctx.user, code = ctx.query.code || '', p = code && findByCode(code);
  view.innerHTML = html`${pageHead('Unirme a una polla', 'Pídele el código a quien organiza (por ejemplo AROMOS-24).')}
    <section class="card" style="max-width:640px"><form class="row" data-code novalidate><input class="input" name="code" value="${code}" placeholder="Código de la polla" aria-label="Código" style="flex:1;min-width:160px;text-transform:uppercase"><button class="btn btn-primary" type="submit">Buscar</button></form></section>
    <div data-res style="max-width:760px">${p ? '' : code ? raw(notFound(code)) : ''}</div>`;
  view.querySelector('[data-code]').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/unirse?code=' + encodeURIComponent(e.target.code.value.trim().toUpperCase()); });
  if (p) { const res = view.querySelector('[data-res]'); res.innerHTML = joinHTML(p, u, {}); mountJoin(res, p, u, m => { location.hash = m.status === 'solicitud' ? '#/pollas' : `#/pollas/${p.id}`; }); }
}
function receiptView(view, ctx) {
  view.innerHTML = html`<a class="small g-back g-noprint" href="javascript:history.back()">← Volver</a>${raw(V.receiptHTML(ctx.params.code))}`;
  V.mountPrint(view);
}

const u0 = me();
const myOpenCount = () => { const u = me(); return u ? myOpen(u.id).filter(o => o.x.status === 'atrasado' || (o.x.status !== 'informado' && L.diffDays(o.r.dueDate, L.today(db)) <= 7)).length : 0; };
app.panel({
  page: 'participante.html', sub: 'Mi polla',
  topbar: u0 && u0.role !== 'participante' ? `<a class="btn btn-sm" href="${u0.role === 'admin' ? 'admin.html' : 'organizador.html'}">⚙️ ${u0.role === 'admin' ? 'Plataforma' : 'Organización'}</a>` : '',
  nav: [
    { section: 'Mi polla' },
    { id: '', label: 'Inicio', icon: '🏠', render: inicio },
    { id: 'pollas', label: 'Mis pollas', icon: '🐣', render: misPollas, routes: { ':id': { label: 'Polla', render: pollaView } } },
    { id: 'pagar', label: 'Pagar', icon: '💸', render: pagar, count: myOpenCount },
    { id: 'calendario', label: 'Calendario', icon: '📅', render: calendario },
    { id: 'cambios', label: 'Cambios de turno', icon: '🔁', render: cambios, count: () => { const u = me(); if (!u) return 0; const ss = new Set(db.query('members', m => m.userId === u.id && m.status === 'activo').map(m => m.slotId)); return db.count('swaps', s => s.status === 'solicitado' && ss.has(s.toSlotId)); } },
    { id: 'unirse', label: 'Unirme con código', icon: '🔑', render: unirse },
    { section: 'Mis números' },
    { id: 'estado', label: 'Estado de cuenta', icon: '📒', render: estado },
    { id: 'reputacion', label: 'Reputación', icon: '⭐', render: reputacion },
    { id: 'notificaciones', label: 'Notificaciones', icon: '🔔', render: notificaciones, count: () => V.unread(me()?.id) },
    { id: 'comprobante', label: 'Comprobante', icon: '🧾', hidden: true, render: receiptView, routes: { ':code': { label: 'Comprobante', render: receiptView } } },
    { section: 'Cuenta' },
    { href: 'organizador.html', label: 'Panel de organización', icon: '⚙️', roles: ['organizador', 'tesorero', 'admin'] },
    accountSection(app, { fields: [{ name: 'phone', label: 'Teléfono', type: 'tel' }, { name: 'rut', label: 'RUT', type: 'rut' }, { name: 'bank', label: 'Cuenta para recibir pozos', placeholder: 'Banco, tipo y N° de cuenta' }] })
  ]
});
