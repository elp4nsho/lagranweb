// Ayuda: casos de soporte del cliente (los responde un ejecutivo desde el back-office).
import { db, userName } from '../data/db.js';
import { ago, toast, formModal, modal, dateTime } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge } from '../shared/bank.js';
import { pageHead } from './common.js';

export function render(el, { user }) {
  const tickets = db.query('tickets', t => t.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const faq = db.getValue('site').faq;
  el.innerHTML = h`${raw(pageHead('Ayuda', 'Escríbenos y un ejecutivo te responderá aquí mismo.', '<button class="btn btn-primary" data-new>+ Nuevo caso</button>'))}
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Mis casos</h3><ul class="tx-list">${tickets.map(t => h`<li class="clickable" data-t="${t.id}"><span class="tx-ic">💬</span><span class="tx-main"><b>${t.subject}</b><small>${t.code} · ${t.category} · ${ago(t.updatedAt || t.createdAt)}</small></span>${raw(badge(t.status))}</li>`)}</ul>${!tickets.length ? raw('<div class="empty">No tienes casos abiertos.</div>') : ''}</section>
    <section class="card faq"><h3>Preguntas frecuentes</h3>${faq.map(f => h`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}</section>
  </div>`;
  el.querySelector('[data-new]').onclick = async () => {
    const v = await formModal({ title: 'Nuevo caso de soporte', fields: [{ name: 'category', label: 'Tema', type: 'select', options: ['Consulta', 'Reclamo', 'Tarjetas', 'Transferencias', 'Pagos', 'Seguridad', 'Cuentas'] }, { name: 'subject', label: 'Asunto', required: true }, { name: 'text', label: 'Cuéntanos qué pasó', type: 'textarea', required: true }] });
    if (!v) return;
    const n = db.count('tickets') + 4100;
    db.insert('tickets', { code: `CP-${n}`, userId: user.id, subject: v.subject, category: v.category, priority: v.category === 'Reclamo' || v.category === 'Seguridad' ? 'alta' : 'media', status: 'abierto', assignee: null, messages: [{ from: 'cliente', by: user.id, text: v.text, at: new Date().toISOString() }] });
    db.log('soporte', `${user.name} abrió el caso CP-${n}: ${v.subject}`, user.id);
    toast('Caso creado. Te responderemos pronto.', 'success');
  };
  el.querySelectorAll('[data-t]').forEach(li => li.onclick = () => openTicket(user, li.dataset.t));
}

function openTicket(user, id) {
  const t = db.get('tickets', id);
  const m = modal({
    title: `${t.code} · ${t.subject}`, size: 'lg',
    body: h`<div class="stack"><div class="row">${raw(badge(t.status))}<span class="small muted">${t.category}</span></div>
      <div class="thread">${t.messages.map(x => h`<div class="msg ${x.from === 'cliente' ? 'me' : ''}">${x.text}<small>${x.from === 'cliente' ? 'Tú' : userName(x.by) + ' · Cóndor Pay'} · ${dateTime(x.at)}</small></div>`)}</div>
      ${t.status !== 'resuelto' ? raw('<div class="field"><label for="rp">Responder</label><textarea class="textarea" id="rp" style="min-height:80px"></textarea></div>') : raw('<div class="notice ok">Este caso fue resuelto.</div>')}</div>`,
    foot: t.status !== 'resuelto' ? '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-send>Enviar</button>' : '<button class="btn" data-close>Cerrar</button>',
  });
  m.el.querySelector('[data-send]')?.addEventListener('click', () => {
    const text = m.el.querySelector('#rp').value.trim();
    if (!text) return toast('Escribe un mensaje', 'warning');
    m.close();
    db.update('tickets', id, x => ({ messages: [...x.messages, { from: 'cliente', by: user.id, text, at: new Date().toISOString() }], status: x.status === 'esperando cliente' ? 'en curso' : x.status }));
    toast('Mensaje enviado', 'success');
  });
}
