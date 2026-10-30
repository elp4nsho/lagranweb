// Reclamos del cliente: listado, detalle con conversación y nuevo reclamo.
import { db } from '../data/db.js';
import { html, raw, dateTime, modal, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { INCIDENT_STATUS, INCIDENT_TYPES, badgeOf } from '../shared/status.js';
import { newClaim } from './envios.js';
import * as ops from '../shared/ops.js';

export function mountReclamos(el, ctx) {
  let sig = '';
  const draw = () => {
    const list = db.query('incidents', i => i.customerId === ctx.customer().id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const ns = JSON.stringify(list.map(i => [i.id, i.status, (i.notes || []).length])); if (ns === sig) return; sig = ns;
    el.innerHTML = html`${raw(pageHead('Reclamos', 'Seguimiento de tus casos con soporte.', '<button class="btn btn-primary" data-new>＋ Nuevo reclamo</button>'))}
    <div class="card"><div class="list">${list.length ? list.map(i => raw(html`<button class="list-item btn-reset" data-open="${i.id}"><span class="grow"><b>${i.number} · ${INCIDENT_TYPES[i.type]}</b><small class="muted">${i.shipmentCode} · ${dateTime(i.createdAt)} · ${i.description}</small></span>${raw(badgeOf(INCIDENT_STATUS, i.status))}</button>`)) : raw('<div class="empty-inline">No tienes reclamos. ¡Bien!</div>')}</div></div>`;
  };
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-new]')) { await newClaim(ctx); return; }
    const b = e.target.closest('[data-open]'); if (!b) return;
    const i = db.get('incidents', b.dataset.open);
    const users = Object.fromEntries(db.all('users').map(u => [u.id, u.name]));
    const m = modal({ title: `${i.number} · ${INCIDENT_TYPES[i.type]}`, body: html`<div class="stack">
      <div class="row">${raw(badgeOf(INCIDENT_STATUS, i.status))}<span class="muted small">Envío ${i.shipmentCode} · abierto ${dateTime(i.createdAt)}</span></div>
      <p>${i.description}</p>${i.compensation ? raw(html`<div class="notice ok">Compensación aprobada: <b>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(i.compensation)}</b> como nota de crédito.</div>`) : ''}
      <b>Conversación</b><div class="chat-log" style="height:auto;max-height:260px">${(i.notes || []).filter(n => !n.internal).map(n => raw(html`<div class="msg ${n.by === ctx.user.id ? 'me' : 'them'}"><small>${n.by === ctx.user.id ? 'Tú' : (users[n.by] || 'Soporte') + ' · Soporte'} · ${dateTime(n.at)}</small><p>${n.text}</p></div>`)) || raw('<div class="msg sys">Soporte aún no responde.</div>')}</div>
      ${['resuelto', 'rechazado'].includes(i.status) ? '' : raw('<form class="chat-form row" data-f><input class="input" name="t" placeholder="Agregar comentario…"><button class="btn btn-primary">Enviar</button></form>')}</div>` });
    m.el.querySelector('[data-f]')?.addEventListener('submit', ev => {
      ev.preventDefault(); const t = ev.target.elements.t.value.trim(); if (!t) return;
      db.update('incidents', i.id, x => ({ notes: [...(x.notes || []), { by: ctx.user.id, text: t, at: ops.nowIso() }] }));
      m.close(); toast('Comentario enviado', 'success');
    });
  });
  draw();
  return { refresh: draw };
}
