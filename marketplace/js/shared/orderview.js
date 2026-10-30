// Detalle de pedido compartido (cliente, freelancer y staff): estados, garantía, entregas, chat, revisión, reseña y disputa.
import { db } from '../data/db.js';
import { escape, money, date, dateTime, ago, toast, modal, confirm as ask } from '../../../assets/core/ui.js';
import { pageHead, badge, empty, avatar, formData } from './kit.js';
import { user, gig, ORDER_STATUS, ESCROW, statusBadge, net, PKG_NAMES, orderUnread } from './market.js';

const STEPS = [['pendiente', 'Pedido'], ['en_progreso', 'En progreso'], ['entregado', 'Entregado'], ['completado', 'Completado']];
const filesOf = input => [...(input?.files || [])].map(f => ({ name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB` }));
const fileChips = files => (files || []).map(f => `<span class="file-chip">📎 ${escape(f.name || f)}${f.size ? ` <span class="muted">${escape(f.size)}</span>` : ''}</span>`).join('');

function push(o, patch, text, me) {
  db.update('orders', o.id, x => ({ ...patch, timeline: [...x.timeline, { at: new Date().toISOString(), text, by: me.id }] }));
}

export function chatHTML(o, me) {
  const msgs = db.query('messages', m => m.orderId === o.id).sort((a, b) => a.at.localeCompare(b.at));
  return `<div class="chat-msgs" data-msgs>${msgs.map(m => { const u = user(m.from); return `<div class="bubble ${m.from === me.id ? 'me' : ''}">${escape(m.text)}${m.files?.length ? `<div class="attach-list">${fileChips(m.files)}</div>` : ''}<small>${escape(u?.name || '')} · ${dateTime(m.at)}</small></div>`; }).join('') || '<p class="muted small">Aún no hay mensajes. Escribe para coordinar el trabajo.</p>'}</div>
    ${['cancelado'].includes(o.status) || ['admin', 'moderador', 'soporte'].includes(me.role) ? '' : `<form class="chat-form" data-send><textarea class="textarea" name="text" placeholder="Escribe un mensaje…" aria-label="Mensaje"></textarea><label class="btn btn-icon btn-ghost" title="Adjuntar archivo" style="flex:none">📎<input type="file" name="file" multiple class="sr-only"></label><button class="btn btn-primary">Enviar</button></form><div class="small muted" data-attached></div>`}`;
}
export function wireChat(root, o, me) {
  const m = root.querySelector('[data-msgs]'); if (m) m.scrollTop = m.scrollHeight;
  const f = root.querySelector('[data-send]'); if (!f) return;
  f.file.onchange = () => { root.querySelector('[data-attached]').textContent = f.file.files.length ? `Adjuntos: ${[...f.file.files].map(x => x.name).join(', ')}` : ''; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const text = f.text.value.trim(), files = filesOf(f.file);
    if (!text && !files.length) return;
    const now = new Date().toISOString();
    db.insert('messages', { orderId: o.id, from: me.id, text: text || 'Archivo adjunto', files, at: now });
    db.update('orders', o.id, x => ({ readBy: { ...(x.readBy || {}), [me.id]: now } }));
    toast('Mensaje enviado', 'success');
  });
}
export function markRead(o, me) {
  if (orderUnread(o, me.id)) db.update('orders', o.id, x => ({ readBy: { ...(x.readBy || {}), [me.id]: new Date().toISOString() } }));
}

export function renderOrder(el, ctx, id, { back = '#/pedidos' } = {}) {
  const { me } = ctx;
  const o = db.get('orders', id);
  const role = me.role === 'cliente' ? 'cliente' : me.role === 'freelancer' ? 'freelancer' : 'staff';
  if (!o || (role === 'cliente' && o.clientId !== me.id) || (role === 'freelancer' && o.freelancerId !== me.id)) { el.innerHTML = empty('Pedido no encontrado'); return; }
  const g = gig(o.gigId), c = user(o.clientId), f = user(o.freelancerId), other = role === 'cliente' ? f : c;
  const dispute = db.find('disputes', d => d.orderId === o.id);
  const late = ['pendiente', 'en_progreso', 'revision'].includes(o.status) && new Date(o.due) < new Date();
  const stepIdx = o.status === 'revision' ? 2 : STEPS.findIndex(s => s[0] === o.status);
  const acts = [];
  if (role === 'freelancer') {
    if (o.status === 'pendiente') acts.push('<button class="btn btn-primary" data-a="start">Aceptar y comenzar</button>', '<button class="btn btn-ghost" data-a="decline">Rechazar pedido</button>');
    if (['en_progreso', 'revision'].includes(o.status)) acts.push('<button class="btn btn-primary" data-a="deliver">📦 Entregar trabajo</button>');
    if (['entregado', 'revision'].includes(o.status)) acts.push('<button class="btn btn-ghost" data-a="dispute">Abrir disputa</button>');
  }
  if (role === 'cliente') {
    if (o.status === 'pendiente') acts.push('<button class="btn btn-ghost" data-a="cancel">Cancelar y reembolsar</button>');
    if (o.status === 'entregado') acts.push('<button class="btn btn-primary" data-a="approve">✓ Aprobar y liberar fondos</button>', `<button class="btn" data-a="revision" ${o.revisionsUsed >= o.revisionsMax ? 'disabled title="Sin revisiones disponibles"' : ''}>↻ Solicitar revisión (${o.revisionsMax - o.revisionsUsed} disp.)</button>`);
    if (['en_progreso', 'entregado', 'revision'].includes(o.status)) acts.push('<button class="btn btn-ghost" data-a="dispute">Abrir disputa</button>');
    if (o.status === 'completado' && !o.reviewed) acts.push('<button class="btn btn-primary" data-a="review">★ Dejar reseña</button>');
  }
  if (role === 'staff' && dispute) acts.push(`<a class="btn btn-primary" href="#/disputas/${dispute.id}">Ver disputa</a>`);
  const review = db.find('reviews', r => r.orderId === o.id);
  el.innerHTML = `
    ${pageHead(o.title, `<span class="mono">${escape(o.code)}</span> · Paquete ${PKG_NAMES[o.pkg] || o.pkg} · ${statusBadge(ORDER_STATUS, o.status)} ${statusBadge(ESCROW, o.escrow)} ${late ? badge('Atrasado', 'danger') : ''}`, `<a class="btn btn-ghost btn-sm" href="${back}">← Volver</a>${g ? `<a class="btn btn-ghost btn-sm" href="index.html#/servicio/${g.id}">Ver servicio</a>` : ''}`)}
    ${o.status === 'cancelado' ? '' : `<div class="steps-bar">${STEPS.map(([k, l], i) => `<span class="${i < stepIdx || o.status === 'completado' ? 'done' : i === stepIdx ? 'now' : ''}">${i === 2 && o.status === 'revision' ? 'En revisión' : l}</span>`).join('')}</div>`}
    ${o.status === 'disputa' ? `<div class="notice danger"><b>Pedido en disputa.</b> El equipo de soporte está revisando la evidencia de ambas partes. Los fondos siguen retenidos.${dispute ? ` Motivo: ${escape(dispute.reason)}.` : ''}</div>` : ''}
    ${dispute && dispute.status === 'resuelta' ? `<div class="notice">Disputa resuelta: <b>${{ liberar: 'fondos liberados al freelancer', reembolso: 'reembolso total al cliente', parcial: `reembolso parcial (${dispute.refundPct}%)` }[dispute.decision]}</b>. ${escape(dispute.note || '')}</div>` : ''}
    <div class="split">
      <div class="stack">
        ${acts.length ? `<div class="card"><div class="row">${acts.join('')}</div>${role === 'cliente' && o.status === 'entregado' ? '<p class="small muted mb-0" style="margin-top:10px">Revisa la entrega. Al aprobar, se liberan los fondos retenidos al freelancer.</p>' : ''}${role === 'freelancer' && o.status === 'pendiente' ? '<p class="small muted mb-0" style="margin-top:10px">El pago ya está retenido en garantía. Acepta para comenzar el plazo de entrega.</p>' : ''}</div>` : ''}
        ${o.deliveries.length ? `<div class="card"><h3>Entregas</h3><div class="stack">${o.deliveries.map((d, i) => `<div class="delivery"><b class="small">Entrega ${i + 1} · ${dateTime(d.at)}</b><p style="margin:6px 0">${escape(d.note)}</p><div class="attach-list">${fileChips(d.files)}</div></div>`).join('')}</div></div>` : ''}
        <div class="card chat-pane"><div class="card-head"><h3>Conversación con ${escape(role === 'staff' ? `${c?.name} y ${f?.name}` : other?.name || '')}</h3></div>${chatHTML(o, me)}</div>
        ${review ? `<div class="card"><h3>Reseña del cliente</h3><p><span class="stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span> ${escape(review.text)}</p>${review.reply ? `<p class="small muted mb-0">↳ ${escape(review.reply)}</p>` : role === 'freelancer' ? '<button class="btn btn-sm" data-a="reply">Responder reseña</button>' : ''}</div>` : ''}
      </div>
      <div class="stack">
        <div class="card"><h3>Resumen</h3>
          <div class="row" style="gap:10px;margin-bottom:10px">${avatar(other || c, 36)}<span class="small"><b>${escape((role === 'staff' ? c : other)?.name || '')}</b><br><span class="muted">${role === 'cliente' ? 'Freelancer' : 'Cliente'}${(role === 'staff' ? c : other)?.company ? ' · ' + escape((role === 'staff' ? c : other).company) : ''}</span></span></div>
          ${role === 'staff' ? `<p class="small mb-0">Freelancer: <b>${escape(f?.name || '')}</b></p>` : ''}
          <div class="summary-row"><span>Precio</span><span>${money(o.price)}</span></div>
          ${role !== 'freelancer' ? `<div class="summary-row"><span>Cargo por servicio (${o.feePct}%)</span><span>${money(o.serviceFee)}</span></div><div class="summary-row total"><span>Total pagado</span><span>${money(o.total)}</span></div>` : ''}
          ${role !== 'cliente' ? `<div class="summary-row"><span>Comisión Gremio (${o.comPct}%)</span><span>−${money(o.commission)}</span></div><div class="summary-row total"><span>${role === 'staff' ? 'Neto freelancer' : 'Tu ganancia'}</span><span>${money(net(o))}</span></div>` : ''}
          <hr><dl class="dl small"><dt>Fecha</dt><dd>${date(o.createdAt)}</dd><dt>Entrega</dt><dd class="${late ? 'text-danger' : ''}">${date(o.due)}</dd><dt>Revisiones</dt><dd>${o.revisionsUsed} de ${o.revisionsMax}</dd><dt>Garantía</dt><dd>${statusBadge(ESCROW, o.escrow)}</dd></dl></div>
        <div class="card"><h3>Requisitos</h3><p class="small mb-0">${escape(o.requirements || '—')}</p></div>
        <div class="card"><h3>Historial</h3><ul class="timeline">${[...o.timeline].reverse().map((t, i) => `<li class="${i === 0 ? 'current' : 'done'}"><span class="small">${escape(t.text)}</span><div class="small muted">${dateTime(t.at)}</div></li>`).join('')}</ul></div>
      </div>
    </div>`;
  wireChat(el, o, me);
  markRead(o, me);
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => action(b.dataset.a, o, me));
}

async function action(a, o, me) {
  const who = me.name.split(' ')[0];
  if (a === 'start') { push(o, { status: 'en_progreso' }, `${who} aceptó el pedido y comenzó a trabajar`, me); db.log('pedido', `${o.code} en progreso`, me.id); return toast('¡Manos a la obra! El cliente fue notificado.', 'success'); }
  if (a === 'decline' || a === 'cancel') {
    if (!await ask(a === 'cancel' ? '¿Cancelar el pedido? Se reembolsará el total pagado.' : '¿Rechazar este pedido? El cliente recibirá el reembolso completo.', { danger: true, ok: a === 'cancel' ? 'Cancelar pedido' : 'Rechazar' })) return;
    push(o, { status: 'cancelado', escrow: 'reembolsado' }, a === 'cancel' ? 'El cliente canceló el pedido. Fondos reembolsados.' : 'El freelancer rechazó el pedido. Fondos reembolsados.', me);
    db.log('pedido', `${o.code} cancelado (${a === 'cancel' ? 'cliente' : 'freelancer'})`, me.id); return toast('Pedido cancelado y reembolsado', 'success');
  }
  if (a === 'deliver') {
    const m = modal({ title: 'Entregar trabajo', body: `<form class="stack" novalidate><div class="field"><label for="dv-n">Mensaje de entrega *</label><textarea class="textarea" id="dv-n" name="note" required placeholder="Describe lo que entregas y cómo usarlo"></textarea></div><div class="field"><label for="dv-f">Archivos</label><input class="input" id="dv-f" type="file" name="file" multiple></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Entregar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const f = m.el.querySelector('form'), note = f.note.value.trim();
      if (!note) { f.note.classList.add('invalid'); return toast('Escribe un mensaje de entrega', 'warning'); }
      const files = filesOf(f.file); if (!files.length) files.push({ name: `entrega_${o.code.toLowerCase()}.zip`, size: '2,4 MB' });
      const now = new Date().toISOString();
      db.update('orders', o.id, x => ({ status: 'entregado', deliveredAt: now, deliveries: [...x.deliveries, { at: now, note, files }], timeline: [...x.timeline, { at: now, text: `Trabajo entregado (entrega ${x.deliveries.length + 1})`, by: me.id }] }));
      db.log('pedido', `${o.code} entregado`, me.id); toast('Entrega enviada al cliente', 'success'); m.close();
    };
    return;
  }
  if (a === 'approve') {
    if (!await ask(`¿Aprobar la entrega y liberar ${money(o.total)} retenidos? El freelancer recibirá ${money(net(o))}.`, { ok: 'Aprobar y liberar' })) return;
    push(o, { status: 'completado', escrow: 'liberado', completedAt: new Date().toISOString() }, 'El cliente aprobó la entrega y se liberaron los fondos', me);
    db.log('pedido', `${o.code} completado · fondos liberados`, me.id); toast('¡Pedido completado! Fondos liberados al freelancer.', 'success');
    setTimeout(() => action('review', db.get('orders', o.id), me), 400);
    return;
  }
  if (a === 'revision') {
    const m = modal({ title: `Solicitar revisión (${o.revisionsMax - o.revisionsUsed} disponibles)`, body: `<form class="stack"><div class="field"><label for="rv-t">¿Qué debe ajustarse? *</label><textarea class="textarea" id="rv-t" name="text" required></textarea></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Solicitar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const t = m.el.querySelector('textarea').value.trim();
      if (!t) return toast('Describe los ajustes', 'warning');
      const now = new Date().toISOString();
      db.insert('messages', { orderId: o.id, from: me.id, text: `Solicitud de revisión: ${t}`, files: [], at: now });
      push(o, { status: 'revision', revisionsUsed: o.revisionsUsed + 1 }, 'El cliente solicitó una revisión', me);
      db.log('pedido', `${o.code} en revisión`, me.id); toast('Revisión solicitada', 'success'); m.close();
    };
    return;
  }
  if (a === 'review') {
    const m = modal({ title: 'Califica el trabajo', body: `<form class="stack"><div class="row" role="radiogroup" aria-label="Calificación">${[5, 4, 3, 2, 1].map(n => `<label class="check chip"><input type="radio" name="rating" value="${n}" ${n === 5 ? 'checked' : ''}> ${'★'.repeat(n)}</label>`).join('')}</div><div class="field"><label for="rw-t">Comentario *</label><textarea class="textarea" id="rw-t" name="text" required placeholder="¿Cómo fue trabajar con este freelancer?"></textarea></div></form>`, foot: '<button class="btn btn-ghost" data-close>Más tarde</button><button class="btn btn-primary" data-ok>Publicar reseña</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const v = formData(m.el.querySelector('form'));
      if (!v.text) return toast('Escribe un comentario', 'warning');
      db.insert('reviews', { gigId: o.gigId, orderId: o.id, freelancerId: o.freelancerId, clientId: me.id, rating: +v.rating, text: v.text });
      db.update('orders', o.id, { reviewed: true });
      db.log('reseña', `Reseña ${v.rating}★ para ${o.code}`, me.id); toast('¡Gracias por tu reseña!', 'success'); m.close();
    };
    return;
  }
  if (a === 'reply') {
    const r = db.find('reviews', x => x.orderId === o.id);
    const m = modal({ title: 'Responder reseña', body: '<form class="stack"><div class="field"><label for="rr-t">Respuesta pública</label><textarea class="textarea" id="rr-t" name="t"></textarea></div></form>', foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Publicar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => { const t = m.el.querySelector('textarea').value.trim(); if (!t) return; db.update('reviews', r.id, { reply: t }); toast('Respuesta publicada', 'success'); m.close(); };
    return;
  }
  if (a === 'dispute') {
    const m = modal({ title: 'Abrir disputa', body: `<form class="stack" novalidate><p class="small muted">Úsalo si no logran un acuerdo por el chat. Soporte revisará la evidencia y decidirá si liberar o reembolsar los fondos retenidos.</p>
      <div class="field"><label for="ds-r">Motivo</label><select class="select" id="ds-r" name="reason">${(me.role === 'cliente' ? ['La entrega no corresponde a lo acordado', 'El freelancer no responde', 'Entrega fuera de plazo', 'Calidad insuficiente'] : ['El cliente no responde ni aprueba', 'El cliente pide trabajo fuera del alcance', 'Otro']).map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="field"><label for="ds-d">Describe lo ocurrido *</label><textarea class="textarea" id="ds-d" name="text" required></textarea></div>
      <div class="field"><label for="ds-f">Evidencia (archivos)</label><input class="input" id="ds-f" type="file" name="file" multiple></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Abrir disputa</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const f = m.el.querySelector('form'), v = formData(f);
      if (!v.text) { f.text.classList.add('invalid'); return toast('Describe lo ocurrido', 'warning'); }
      const now = new Date().toISOString();
      db.insert('disputes', { orderId: o.id, openedBy: me.id, reason: v.reason, status: 'abierta', evidence: [{ by: me.id, text: v.text, files: filesOf(f.file).map(x => x.name), at: now }] });
      push(o, { status: 'disputa', prevStatus: o.status }, `${who} abrió una disputa: ${v.reason}`, me);
      db.log('disputa', `Disputa abierta en ${o.code}: ${v.reason}`, me.id); toast('Disputa abierta. Soporte te contactará en 24 h.', 'warning'); m.close();
    };
  }
}

// Bandeja de mensajes agrupada por pedido.
let activeOrder = null;
export function renderInbox(el, ctx, orders, { orderHref }) {
  const { me } = ctx;
  const withLast = orders.map(o => { const ms = db.query('messages', m => m.orderId === o.id); const last = ms.sort((a, b) => b.at.localeCompare(a.at))[0]; return { o, last, unread: orderUnread(o, me.id) }; }).filter(x => x.last || ['pendiente', 'en_progreso', 'entregado', 'revision', 'disputa'].includes(x.o.status))
    .sort((a, b) => (b.last?.at || b.o.createdAt).localeCompare(a.last?.at || a.o.createdAt));
  if (!activeOrder || !withLast.some(x => x.o.id === activeOrder)) activeOrder = withLast[0]?.o.id;
  const cur = withLast.find(x => x.o.id === activeOrder);
  el.innerHTML = `${pageHead('Mensajes', 'Conversaciones por pedido, con archivos adjuntos')}
    <div class="chat"><div class="card stack" style="gap:8px"><b>Pedidos</b><div class="chat-list">${withLast.map(({ o, last, unread }) => { const other = user(me.id === o.clientId ? o.freelancerId : o.clientId); return `<button class="chat-item ${o.id === activeOrder ? 'active' : ''}" data-o="${o.id}">${avatar(other, 32)}<span class="meta"><b>${escape(other?.name || '')}</b><small>${escape(o.code)} · ${escape(o.title)}</small><small>${escape(last?.text || 'Sin mensajes')}${last ? ' · ' + ago(last.at) : ''}</small></span>${unread ? '<span class="unread" aria-label="No leído"></span>' : ''}</button>`; }).join('') || empty('Sin conversaciones')}</div></div>
    <div class="card chat-pane">${cur ? `<div class="row between" style="border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:6px"><div><b>${escape(cur.o.title)}</b><div class="small muted">${escape(cur.o.code)} · ${statusBadge(ORDER_STATUS, cur.o.status)}</div></div><a class="btn btn-sm" href="${orderHref(cur.o)}">Ver pedido</a></div>${chatHTML(cur.o, me)}` : empty('Selecciona una conversación', '✉')}</div></div>`;
  el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { activeOrder = b.dataset.o; renderInbox(el, ctx, orders, { orderHref }); });
  if (cur) { wireChat(el, cur.o, me); markRead(cur.o, me); }
}
