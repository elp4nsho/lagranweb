// Componentes de interfaz compartidos por el panel de organización, la app del participante,
// el panel de plataforma y el sitio. Funciones datos → HTML (con html``) + pequeños "mount" para eventos.
import { html, raw, escape, money, dateTime, ago, toast, modal } from '../../assets/core/ui.js';
import { initials } from '../../assets/core/auth.js';
import { emptyState, badge } from '../../assets/core/blocks.js';
import { fieldsModal, fieldType, fieldTypes } from '../../assets/core/resource.js';
import { db, auth, createReport, REPORT_KIND } from './app.js';
import * as L from './logic.js';

// Tipo de campo "archivo" (solo guarda el nombre: los comprobantes son simulados).
fieldType('file', { ...fieldTypes.text, input: (fd, v, id) => `<input class="input" id="${id}" name="${fd.name}" type="file" accept="image/*,.pdf">`, read: el => el.files?.[0]?.name || '', table: false });

export const U = id => db.get('users', id);
export const av = (u, size = 30) => (u ? html`<span class="avatar" style="--av:${u.color || 'var(--primary)'};--size:${size}px" title="${u.name}">${initials(u.name)}</span>` : '');
export const avStack = (users, size = 28) => html`<span class="g-avs">${users.filter(Boolean).slice(0, 6).map(u => raw(av(u, size)))}${users.length > 6 ? html`<span class="avatar g-more" style="--size:${size}px">+${users.length - 6}</span>` : ''}</span>`;
export const who = id => { const u = U(id); return u ? html`<span class="g-who">${raw(av(u, 24))}<span>${u.name}</span></span>` : html`<span class="muted">—</span>`; };
export const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n));
export const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
export const bar = (v, tone = '') => html`<div class="progress g-bar ${tone ? 'g-bar-' + tone : ''}" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><i style="--v:${v}%"></i></div>`;
export const tryDo = (fn, ok) => { try { const r = fn(); if (ok) toast(ok, 'success'); return r ?? true; } catch (e) { toast(e.message, 'warning'); return false; } };
// Evita dobles envíos: deshabilita el botón mientras corre la acción.
export async function once(btn, fn) { if (!btn || btn.disabled) return; btn.disabled = true; try { await fn(); } finally { if (btn.isConnected) btn.disabled = false; } }

// ---------- Tarjeta de polla ----------
export function pollaCard(p, { href, user } = {}) {
  const cur = L.currentRound(db, p.id), st = cur ? L.roundStats(db, cur) : null, nxt = L.nextPayout(db, p.id);
  const slots = db.count('slots', s => s.pollaId === p.id);
  const mine = user && db.find('members', m => m.pollaId === p.id && m.userId === user.id && m.status === 'activo');
  const ms = mine && L.slotOfMember(db, mine);
  return html`<a class="card hover g-pcard" href="${href || '#/pollas/' + p.id}">
    <div class="g-pcard-head"><span class="g-emoji" aria-hidden="true">${p.emoji || '🐣'}</span><div style="min-width:0"><b class="g-ellipsis">${p.name}</b><small class="muted">${p.code} · ${L.freqLabel(p)} · ${L.MODE_ICON[p.mode]} ${L.MODES[p.mode]}</small></div>${raw(L.POLLA.badge(p.status))}</div>
    <div class="g-pcard-nums"><div><small>Cuota</small><b>${money(p.amount)}</b></div><div><small>Pozo</small><b>${money(L.potOf(p))}</b></div><div><small>${p.status === 'en_curso' ? 'Ronda' : 'Cupos'}</small><b>${p.status === 'en_curso' && cur ? `${cur.n}/${p.cupos}` : `${slots}/${p.cupos}`}</b></div></div>
    ${st ? html`<div class="g-pcard-bar"><div class="row between small"><span>Ronda ${cur.n}: ${money(st.collected)} de ${money(st.expected)}</span><b>${st.pct}%</b></div>${raw(bar(st.pct, st.late.length ? 'danger' : ''))}</div>`
      : p.status === 'inscripcion' ? html`<div class="g-pcard-bar"><div class="row between small"><span>Inscripción</span><b>${slots}/${p.cupos}</b></div>${raw(bar(pct(slots, p.cupos)))}</div>` : ''}
    <div class="row between small muted">${nxt && p.status === 'en_curso' ? html`<span>Próximo pozo: ${L.fdate(nxt.dueDate)} → ${nxt.slotId ? L.slotLabel(db, db.get('slots', nxt.slotId)) : 'por rematar'}</span>` : html`<span>Parte el ${L.fdate(p.startDate)}</span>`}${ms ? html`<span class="badge badge-primary">Tu turno: ${ms.turn ?? '—'}</span>` : ''}</div>
  </a>`;
}

// ---------- Ronda: barra y resumen ----------
export function roundSummary(r, p) {
  const st = L.roundStats(db, r), slot = r.slotId && db.get('slots', r.slotId), net = L.potOf(p) - (r.discount || 0);
  return html`<div class="g-round">
    <div class="g-round-top"><div><span class="eyebrow">Ronda ${r.n} de ${p.cupos}</span><h3 style="margin:2px 0 0">${L.fdateShort(r.dueDate)} <small class="muted">(${L.relDay(r.dueDate, L.today(db))})</small></h3></div>${raw(L.ROUND.badge(r.status))}</div>
    <div class="g-round-nums">
      <div><small>Esperado</small><b>${money(st.expected)}</b></div>
      <div><small>Recaudado</small><b class="g-ok">${money(st.collected)}</b></div>
      <div><small>Por confirmar</small><b class="g-info">${money(st.reported)}</b></div>
      <div><small>Falta</small><b class="${st.pending ? 'g-bad' : ''}">${money(st.pending)}</b></div>
    </div>
    <div class="g-stack-bar" aria-label="Recaudado ${st.pct}%"><i class="ok" style="--w:${pct(st.collected, st.expected)}%"></i><i class="info" style="--w:${pct(st.reported, st.expected)}%"></i></div>
    <p class="small muted" style="margin:8px 0 0">${st.paidCount}/${st.count} cuotas pagadas${st.late.length ? html` · <b class="g-bad">${st.late.length} atrasada${st.late.length === 1 ? '' : 's'}</b>` : ''} · Recibe: <b>${slot ? L.slotLabel(db, slot) : p.mode === 'remate' ? 'se remata' : '—'}</b>${slot && r.discount ? html` · ${money(net)} (descuento ${money(r.discount)})` : ''}</p>
  </div>`;
}

// ---------- Turnos ----------
export function turnsList(p, { userId = null, compact = false } = {}) {
  const rounds = L.roundsOf(db, p.id), slots = L.slotsOf(db, p.id);
  if (!rounds.length) {
    if (!slots.length) return emptyState({ icon: '🪑', title: 'Aún no hay cupos tomados', text: 'Comparte el código para que se sume la gallada.' });
    return html`<ol class="g-turns">${slots.map(s => html`<li class="g-turn ${holders(s).some(m => m.userId === userId) ? 'is-me' : ''}"><span class="g-turn-n">${s.turn ?? '?'}</span><span class="g-turn-who">${avStack(holders(s).map(m => U(m.userId)))}<span><b>${L.slotLabel(db, s)}</b><small class="muted">${s.code}${s.half ? ` · medio cupo${s.holders.length < 2 ? ' (falta pareja)' : ''}` : ''}</small></span></span><span class="small muted">${s.turn ? 'Turno ' + s.turn : 'Sin turno'}</span></li>`)}</ol>`;
  }
  const cur = L.currentRound(db, p.id);
  return html`<ol class="g-turns ${compact ? 'is-compact' : ''}">${rounds.map(r => {
    const s = r.slotId && db.get('slots', r.slotId), hs = s ? holders(s) : [], mine = hs.some(m => m.userId === userId);
    const done = ['entregada', 'confirmada'].includes(r.status);
    return html`<li class="g-turn ${done ? 'is-done' : ''} ${cur?.id === r.id ? 'is-current' : ''} ${mine ? 'is-me' : ''} ${r.status === 'anulada' ? 'is-void' : ''}">
      <span class="g-turn-n">${r.n}</span>
      <span class="g-turn-who">${s ? avStack(hs.map(m => U(m.userId))) : raw('<span class="avatar g-more" style="--size:28px">?</span>')}<span><b>${s ? L.slotLabel(db, s) : 'Por rematar'}${mine ? ' (tú)' : ''}</b><small class="muted">${L.fdateShort(r.dueDate)}${r.discount ? ` · descuento ${money(r.discount)}` : ''}${(r.dateChanges || []).length ? ' · fecha cambiada' : ''}</small></span></span>
      <span class="g-turn-st">${raw(done ? L.ROUND.badge(r.status) : cur?.id === r.id ? L.ROUND.badge(r.status) : `<span class="small muted">${L.relDay(r.dueDate, L.today(db))}</span>`)}</span>
    </li>`;
  })}</ol>`;
}
export const holders = s => L.holders(db, s);

// ---------- Libro ----------
export function ledgerTable(pid, { userId = null, limit = 0 } = {}) {
  let caja = 0;
  let rows = L.movesOf(db, pid).map(m => { caja += m.dir === 'in' ? m.amount : -m.amount; return { ...m, caja }; });
  if (userId) { let net = 0; rows = rows.filter(m => m.userId === userId).map(m => { net += m.dir === 'in' ? -m.amount : m.amount; return { ...m, net }; }); }
  rows = rows.reverse();
  if (limit) rows = rows.slice(0, limit);
  if (!rows.length) return emptyState({ icon: '📒', title: 'Sin movimientos todavía', text: 'Cada aporte confirmado, entrega de pozo o multa queda anotado aquí.' });
  return html`<div class="table-wrap"><table class="table g-ledger"><thead><tr><th>Fecha</th><th>Movimiento</th>${userId ? '' : raw('<th>Persona</th>')}<th class="k-num">Entra</th><th class="k-num">Sale</th><th class="k-num">${userId ? 'Tu neto' : 'Caja'}</th></tr></thead><tbody>
    ${rows.map(m => { const r = m.roundId && db.get('rounds', m.roundId); return html`<tr><td><small class="k-nowrap">${dateTime(m.at)}</small></td><td><b>${L.MOVE[m.type]?.label}</b>${r ? html` <span class="badge">R${r.n}</span>` : ''}<small class="muted" style="display:block">${m.note}${m.ref ? ` · ${m.ref}` : ''}</small></td>${userId ? '' : raw(`<td>${who(m.userId)}</td>`)}<td class="k-num g-ok">${m.dir === 'in' ? money(m.amount) : ''}</td><td class="k-num g-bad">${m.dir === 'out' ? money(m.amount) : ''}</td><td class="k-num"><b>${money(userId ? m.net : m.caja)}</b></td></tr>`; })}
  </tbody></table></div>`;
}
export function positionsTable(pid, { href } = {}) {
  const rows = L.positions(db, pid).sort((a, b) => a.net - b.net);
  return html`<div class="table-wrap"><table class="table"><thead><tr><th>Persona</th><th class="k-num">Aportado</th><th class="k-num">Recibido</th><th class="k-num">Posición neta</th><th class="k-num">Deuda viva</th></tr></thead><tbody>
    ${rows.map(r => html`<tr><td>${href ? raw(`<a href="${escape(href(r.userId))}" class="g-link">${who(r.userId)}</a>`) : who(r.userId)}${r.anticipos ? html`<small class="muted" style="display:block">incluye ${money(r.anticipos)} en anticipos</small>` : ''}</td><td class="k-num">${money(r.aportado)}</td><td class="k-num">${money(r.recibido)}</td><td class="k-num"><b class="${r.net > 0 ? 'g-info' : r.net < 0 ? '' : 'g-ok'}">${signed(r.net)}</b></td><td class="k-num">${r.debt ? html`<b class="g-bad">${money(r.debt)}</b>` : '—'}</td></tr>`)}
    <tr class="g-total"><td><b>Total</b></td><td class="k-num"><b>${money(rows.reduce((s, r) => s + r.aportado, 0))}</b></td><td class="k-num"><b>${money(rows.reduce((s, r) => s + r.recibido, 0))}</b></td><td class="k-num"><b>${signed(rows.reduce((s, r) => s + r.net, 0))}</b></td><td class="k-num"><b>${money(rows.reduce((s, r) => s + r.debt, 0))}</b></td></tr>
  </tbody></table></div><p class="small muted" style="margin:8px 0 0">Posición neta = recibido − aportado. Positiva: ya recibió más de lo que lleva aportado (le queda por pagar). Negativa: lleva aportado más de lo recibido (le toca recibir).</p>`;
}
export function reconcileCard(pid) {
  const rec = L.reconcile(db, pid);
  return html`<section class="card g-recon ${rec.ok ? 'is-ok' : 'is-bad'}">
    <div class="k-card-head"><div><h3>${rec.ok ? '✓ El libro cuadra' : '✕ El libro no cuadra'}</h3><p>Revisión automática de todos los movimientos</p></div></div>
    <div class="g-recon-nums"><div><small>Ingresos</small><b>${money(rec.cash.in)}</b></div><div><small>Egresos</small><b>${money(rec.cash.out)}</b></div><div><small>Caja</small><b>${money(rec.cash.caja)}</b></div><div><small>Fondo común</small><b>${money(rec.fondo)}</b></div></div>
    <ul class="g-checks">${rec.checks.map(c => html`<li class="${c.ok ? 'ok' : 'bad'}"><span aria-hidden="true">${c.ok ? '✓' : '✕'}</span>${c.label}${c.detail ? html` <small class="muted">(${c.detail})</small>` : ''}</li>`)}</ul>
  </section>`;
}

// ---------- Calendario mensual ----------
// events: [{ date: 'YYYY-MM-DD', label, tone, href }]; ym: 'YYYY-MM'; base: hash sin ?m= para navegar
export function calendar(events, ym, base) {
  const [y, m] = ym.split('-').map(Number), first = new Date(y, m - 1, 1, 12), days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7, t = L.today(db);
  const prev = L.ymd(new Date(y, m - 2, 1, 12)).slice(0, 7), next = L.ymd(new Date(y, m, 1, 12)).slice(0, 7);
  const by = {};
  events.forEach(e => { if (e.date.startsWith(ym)) (by[e.date] ||= []).push(e); });
  const sep = base.includes('?') ? '&' : '?';
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(html`<div class="g-cal-cell is-out" aria-hidden="true"></div>`);
  for (let d = 1; d <= days; d++) {
    const ds = `${ym}-${String(d).padStart(2, '0')}`, evs = by[ds] || [];
    cells.push(html`<div class="g-cal-cell ${ds === t ? 'is-today' : ''} ${evs.length ? 'has-ev' : ''}"><span class="g-cal-d">${d}</span>${evs.slice(0, 3).map(e => html`<a class="g-ev g-ev-${e.tone || 'primary'}" href="${e.href || '#'}" title="${e.label}">${e.label}</a>`)}${evs.length > 3 ? html`<small class="muted">+${evs.length - 3} más</small>` : ''}</div>`);
  }
  const list = events.filter(e => e.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date));
  return html`<div class="g-cal-wrap">
    <div class="row between g-cal-nav"><a class="btn btn-sm btn-ghost" href="${base}${sep}m=${prev}" aria-label="Mes anterior">←</a><h3 style="margin:0">${L.MONTHS_LONG[m - 1]} ${y}</h3><a class="btn btn-sm btn-ghost" href="${base}${sep}m=${next}" aria-label="Mes siguiente">→</a></div>
    <div class="g-cal" role="grid">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => html`<div class="g-cal-h">${d}</div>`)}${cells}</div>
    <ul class="g-cal-list">${list.length ? list.map(e => html`<li><span class="badge badge-${e.tone || 'primary'}">${L.fdateShort(e.date)}</span> <a href="${e.href || '#'}">${e.label}</a></li>`) : raw('<li class="muted small">Sin eventos este mes.</li>')}</ul>
  </div>`;
}
export function pollaEvents(list, { userId = null, link } = {}) {
  const ev = [];
  list.forEach(p => L.roundsOf(db, p.id).forEach(r => {
    const s = r.slotId && db.get('slots', r.slotId), mine = s && holders(s).some(m => m.userId === userId);
    const myPay = userId && db.find('payments', x => x.roundId === r.id && x.userId === userId);
    const done = ['entregada', 'confirmada'].includes(r.status);
    if (r.status === 'anulada') return;
    if (mine) ev.push({ date: r.dueDate, label: `${p.emoji} ¡Recibes el pozo! ${p.name}`, tone: 'success', href: link(p, r) });
    else if (userId && myPay) ev.push({ date: r.dueDate, label: `${p.emoji} ${L.PAID.includes(myPay.status) ? '✓ ' : ''}Cuota ${money(myPay.amount)} · ${p.name}`, tone: L.PAID.includes(myPay.status) ? '' : myPay.status === 'atrasado' ? 'danger' : 'primary', href: link(p, r) });
    else if (!userId) ev.push({ date: r.dueDate, label: `${p.emoji} R${r.n} ${p.name}${s ? ' → ' + L.slotLabel(db, s) : ''}`, tone: done ? 'success' : r.status === 'completa' ? 'warning' : L.roundStats(db, r).late.length ? 'danger' : 'primary', href: link(p, r) });
  }));
  return ev;
}

// ---------- Comprobante imprimible ----------
export function findReceipt(code) {
  code = String(code || '').trim().toUpperCase();
  const pay = db.find('payments', x => x.receipt === code);
  if (pay) return { kind: 'pago', pay, p: L.pollaOf(db, pay.pollaId), r: db.get('rounds', pay.roundId) };
  const r = db.find('rounds', x => x.receipt === code);
  if (r) return { kind: 'entrega', r, p: L.pollaOf(db, r.pollaId) };
  return null;
}
export function receiptHTML(code, { publicView = false } = {}) {
  const f = findReceipt(code);
  if (!f) return emptyState({ icon: '🧾', title: 'No encontramos ese comprobante', text: 'Revisa el código (ej: CMP-10001 o ENT-5001).' });
  const { p } = f;
  let rows, title, total, person;
  if (f.kind === 'pago') {
    const x = f.pay; person = U(x.userId); title = 'Comprobante de aporte'; total = x.amount + (x.feePaid || 0);
    rows = [['Polla', `${p.name} (${p.code})`], ['Ronda', `${f.r.n} de ${p.cupos} · vence ${L.fdate(f.r.dueDate)}`], ['Aportante', person?.name], ['Cuota', money(x.amount)], x.feePaid ? ['Multa por atraso', money(x.feePaid)] : null, ['Medio de pago', x.method === 'efectivo' ? 'Efectivo' : `Transferencia${x.ref ? ' N° ' + x.ref : ''}`], ['Estado', x.status === 'regularizado' ? 'Deuda regularizada' : 'Pagado y confirmado'], ['Confirmado por', L.userName(db, x.confirmedBy)], ['Fecha', dateTime(x.confirmedAt)]];
  } else {
    const r = f.r, s = db.get('slots', r.slotId), hs = holders(s); person = U(hs[0]?.userId); title = 'Comprobante de entrega de pozo'; total = r.netPaid ?? L.potOf(p) - (r.discount || 0);
    rows = [['Polla', `${p.name} (${p.code})`], ['Ronda', `${r.n} de ${p.cupos}`], ['Recibe', L.slotLabel(db, s) + (hs.length > 1 ? ' (medio cupo c/u)' : '')], ['Pozo recaudado', money(L.roundStats(db, r).collected)], r.discount ? ['Descuento de remate (repartido)', '− ' + money(r.discount)] : null, ['Medio', r.payMethod === 'efectivo' ? 'Efectivo' : `Transferencia${r.payRef ? ' N° ' + r.payRef : ''}`], ['Entregado por', L.userName(db, r.paidBy)], ['Fecha', dateTime(r.paidAt)], ['Recepción', r.status === 'confirmada' ? 'Confirmada por quien recibe ✓' : 'Pendiente de confirmar']];
  }
  return html`<article class="g-receipt card">
    <header class="g-receipt-head"><span class="g-receipt-logo" aria-hidden="true">🐣</span><div><b>Gallada</b><small class="muted">Pollas claras y al día</small></div><div class="g-receipt-code"><small>N°</small><b>${code.toUpperCase()}</b></div></header>
    <h2 style="margin:6px 0 2px">${title}</h2><p class="muted small" style="margin:0 0 12px">Documento interno de la polla, sin valor tributario.</p>
    <dl class="k-kv">${rows.filter(Boolean).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
    <div class="g-receipt-total"><span>Total</span><b>${money(total)}</b></div>
    <p class="small muted" style="margin:10px 0 0">Verifica este comprobante en gallada.cl → Verificar, con el código ${code.toUpperCase()}.</p>
    ${publicView ? '' : raw('<div class="row g-noprint" style="margin-top:14px"><button type="button" class="btn btn-primary" data-print>🖨 Imprimir / guardar PDF</button></div>')}
  </article>`;
}
export function mountPrint(view) { view.querySelector('[data-print]')?.addEventListener('click', () => window.print()); }

// ---------- Muro de la polla ----------
export function wallHTML(pid, user, { staff = false } = {}) {
  const posts = db.query('posts', x => x.pollaId === pid).sort((a, b) => (b.pinned - a.pinned) || b.at.localeCompare(a.at));
  return html`<div class="g-wall">
    <form class="g-wall-form" data-wall novalidate><textarea class="textarea" name="text" rows="2" maxlength="600" placeholder="Escribe a la gallada…" aria-label="Mensaje"></textarea><div class="row between">${staff ? raw('<label class="check small"><input type="checkbox" name="aviso"> Publicar como aviso fijado</label>') : raw('<span></span>')}<button class="btn btn-primary btn-sm" type="submit">Publicar</button></div></form>
    ${posts.length ? html`<ul class="g-posts">${posts.map(x => { const u = U(x.userId), mine = x.userId === user.id; return html`<li class="g-post ${x.kind === 'aviso' ? 'is-notice' : ''} ${mine ? 'is-mine' : ''}">${raw(av(u, 34))}<div class="g-post-body"><div class="row between" style="gap:6px"><b>${u?.name || '—'}${x.kind === 'aviso' ? html` <span class="badge badge-warning">${x.pinned ? '📌 Aviso' : 'Aviso'}</span>` : ''}</b><small class="muted">${ago(x.at)}</small></div><p>${x.text}</p>${staff ? html`<button type="button" class="btn btn-ghost btn-sm" data-pin="${x.id}">${x.pinned ? 'Desfijar' : 'Fijar'}</button>` : ''}</div></li>`; })}</ul>`
      : raw(emptyState({ icon: '💬', title: 'Nadie ha escrito todavía', text: 'Usa el muro para avisos, dudas y para celebrar cuando llega el pozo.' }))}
  </div>`;
}
export function mountWall(view, pid, user) {
  const f = view.querySelector('[data-wall]');
  f?.addEventListener('submit', e => {
    e.preventDefault();
    const b = f.querySelector('[type=submit]');
    once(b, () => { if (tryDo(() => L.post(db, pid, user.id, f.text.value, f.aviso?.checked ? { kind: 'aviso', pinned: true } : {}))) { db.log('muro', `${user.name} publicó en ${L.pollaOf(db, pid).code}`, user.id); f.reset(); } });
  });
  view.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', () => { const x = db.get('posts', b.dataset.pin); db.update('posts', x.id, { pinned: !x.pinned, kind: 'aviso' }); }));
}

// ---------- Notificaciones ----------
const NK = { pago: '💸', pozo: '🎉', alerta: '⚠️', turno: '🔁', sorteo: '🎲', remate: '🔨', calendario: '📅', recordatorio: '📣', solicitud: '🙋', miembro: '👥', polla: '🐣', info: '🔔' };
export function notifList(userId, { limit = 0, page = '' } = {}) {
  let list = db.query('notifs', n => n.userId === userId).sort((a, b) => b.at.localeCompare(a.at));
  if (limit) list = list.slice(0, limit);
  if (!list.length) return emptyState({ icon: '🔔', title: 'Sin notificaciones', text: 'Aquí te avisamos de pagos, pozos, sorteos y cambios de turno.' });
  const fix = l => (page && l.startsWith(page) ? l.slice(page.length) : l);
  return html`<ul class="g-notifs">${list.map(n => html`<li class="${n.read ? '' : 'is-new'}"><span class="g-notif-ico" aria-hidden="true">${NK[n.kind] || '🔔'}</span><div style="min-width:0"><b>${n.title}</b><p>${n.text}</p><small class="muted">${ago(n.at)}${n.pollaId ? ' · ' + (L.pollaOf(db, n.pollaId)?.name || '') : ''}</small></div>${n.link ? html`<a class="btn btn-sm btn-ghost" href="${fix(n.link)}" data-read="${n.id}">Ver</a>` : ''}</li>`)}</ul>`;
}
export function mountNotifs(view) { view.querySelectorAll('[data-read]').forEach(a => a.addEventListener('click', () => db.update('notifs', a.dataset.read, { read: true }))); }
export const unread = uid => db.count('notifs', n => n.userId === uid && !n.read);

// ---------- Informar un pago (participante) ----------
export async function payModal(x, user) {
  const p = L.pollaOf(db, x.pollaId), r = db.get('rounds', x.roundId), fee = x.feeWaived ? 0 : x.lateFee || 0;
  const v = await fieldsModal({
    title: `Pagar ronda ${r.n} · ${p.name}`, submit: 'Informar pago', size: '',
    intro: html`<span class="g-paybox"><span>Total a pagar</span><b>${money(x.amount + fee)}</b>${fee ? html`<small>Cuota ${money(x.amount)} + multa ${money(fee)}</small>` : ''}</span><span class="g-bankbox"><b>Datos para transferir</b><br>${p.paymentInfo || 'Pídelos a la organización'}</span>`,
    fields: [
      { name: 'method', label: 'Cómo pagaste', type: 'select', required: true, options: [['transferencia', 'Transferencia'], ['efectivo', 'Efectivo (en mano)']], default: 'transferencia' },
      { name: 'ref', label: 'N° de operación', placeholder: 'Ej: 48213377', help: 'Lo encuentras en el correo de tu banco.' },
      { name: 'file', label: 'Comprobante (foto o PDF)', type: 'file' }
    ],
    onSubmit: vals => { try { L.reportPayment(db, x.id, { method: vals.method, ref: vals.method === 'efectivo' ? '' : vals.ref, file: vals.method === 'efectivo' ? '' : vals.file, by: user.id }); return true; } catch (e) { return e.message; } }
  });
  if (v) toast('Pago informado: la organización lo confirmará', 'success');
  return v;
}

// ---------- Sorteo animado ----------
// Baraja tarjetas y revela turno por turno. El resultado YA está calculado con la semilla (shuffle):
// la animación solo lo muestra. Respeta "reducir movimiento".
export function drawStage(el, order, { seed, onDone } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = html`<div class="g-draw"><div class="g-draw-seed"><small>Semilla pública</small><code>${seed}</code></div><div class="g-draw-drum" aria-hidden="true">${order.map((o, i) => html`<span class="g-chip-ball" style="--i:${i}">${o.label.split(' ')[0]}</span>`)}</div><ol class="g-draw-list" aria-live="polite"></ol></div>`;
  const list = el.querySelector('.g-draw-list'), drum = el.querySelector('.g-draw-drum');
  let i = 0;
  const step = () => {
    if (i >= order.length) { drum.classList.add('is-done'); onDone && onDone(); return; }
    const o = order[i];
    drum.querySelector(`.g-chip-ball:nth-child(${[...drum.children].findIndex(c => c.textContent === o.label.split(' ')[0]) + 1})`)?.classList.add('is-out');
    const li = document.createElement('li');
    li.innerHTML = `<span class="g-turn-n">${i + 1}</span><span>${escape(o.label)}</span>`;
    list.appendChild(li);
    i++;
    setTimeout(step, reduce ? 0 : 650);
  };
  drum.classList.add('is-spinning');
  setTimeout(() => { drum.classList.remove('is-spinning'); step(); }, reduce ? 0 : 1300);
}

// ---------- Reputación ----------
export function repBadge(userId) { const r = L.reputation(db, userId); return html`<span class="badge badge-${r.tone}" title="${r.label}">★ ${r.score}</span>`; }
export function stars(n) { const full = Math.floor(n), half = n - full >= 0.5; return html`<span class="g-stars" aria-label="${n} de 5 estrellas">${'★'.repeat(full)}${half ? '⯪' : ''}<span class="muted">${'☆'.repeat(5 - full - (half ? 1 : 0))}</span></span>`; }

// Mensaje estilo WhatsApp / correo para la vista previa de recordatorios
export const bubble = (text, channel = 'whatsapp') => html`<div class="g-bubble ${channel === 'email' ? 'is-mail' : ''}"><small>${channel === 'email' ? '✉️ Correo' : '🟢 WhatsApp'}</small><p>${text}</p></div>`;

// ---------- Reportar a la plataforma ----------
export async function reportModal(p, u, againstId = '') {
  await fieldsModal({ title: `Reportar · ${p.name}`, submit: 'Enviar reporte', size: '',
    fields: [{ name: 'kind', label: 'Motivo', type: 'select', required: true, options: REPORT_KIND }, { name: 'againstId', label: 'Sobre quién (opcional)', type: 'select', options: L.membersOf(db, p.id).map(m => [m.userId, L.userName(db, m.userId)]).concat([[p.organizerId, L.userName(db, p.organizerId) + ' (organiza)']]).filter((x, i, a) => x[0] !== u.id && a.findIndex(y => y[0] === x[0]) === i), default: againstId }, { name: 'text', label: 'Qué pasó', type: 'textarea', required: true }],
    onSubmit: v => { try { const r = createReport({ pollaId: p.id, reporterId: u.id, againstId: v.againstId, kind: v.kind, text: v.text }); toast(`Reporte ${r.code} enviado a la plataforma`, 'success'); return true; } catch (e) { return e.message; } } });
}


export { badge, auth };

