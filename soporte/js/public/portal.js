// Portal de clientes (portal.html): mis tickets, conversación, responder con adjuntos, calificar (CSAT) y perfil.
import { db, auth, homeFor } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { escape, date, dateTime, ago, toast } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';
import { customerStatus, isOpen, status as statusOf } from '../shared/constants.js';
import { catName, userById, avatar, fileSize } from '../shared/util.js';
import { addMessage, rateTicket, createTicket } from '../shared/tickets.js';
import { filesOf } from '../shared/forms.js';
import { header, footer, wireLayout } from './layout.js';
import { mountChat } from '../shared/chat-widget.js';

const me = auth.current();
const root = document.getElementById('site');
if (!me || me.active === false) location.replace(`login.html?next=${encodeURIComponent('portal.html' + location.hash)}`);
else if (me.role !== 'cliente') location.replace(homeFor(me));
else start();

function start() {
  root.innerHTML = `<div data-head></div><main id="main" class="section site-main"><div class="container portal" data-view></div></main><div data-foot></div>`;
  const view = root.querySelector('[data-view]');
  const state = { filter: 'abiertos' };
  let current = () => {};
  const chrome = () => { root.querySelector('[data-head]').innerHTML = header('portal'); root.querySelector('[data-foot]').innerHTML = footer(); };
  const show = fn => { current = fn; chrome(); fn(); };
  const tabs = act => `<nav class="tabs portal-tabs"><a class="tab ${act === 'list' ? 'active' : ''}" href="#/">Mis tickets</a><a class="tab ${act === 'new' ? 'active' : ''}" href="#/nuevo">Nuevo ticket</a><a class="tab ${act === 'perfil' ? 'active' : ''}" href="#/perfil">Mi cuenta</a></nav>`;

  function list() {
    const u = auth.current();
    const mine = db.query('tickets', t => t.customerId === u.id && !t.mergedInto).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const rows = mine.filter(t => state.filter === 'todos' || (state.filter === 'abiertos' ? isOpen(t) : !isOpen(t)));
    const waiting = mine.filter(t => t.status === 'pendiente').length;
    const toRate = mine.filter(t => t.status === 'resuelto' && !t.csat).length;
    view.innerHTML = `<div class="page-head"><div><span class="eyebrow">Portal de clientes</span><h1 style="margin:0">Hola, ${escape(u.name.split(' ')[0])}</h1><p class="muted" style="margin:4px 0 0">${escape(u.plan || '')} · ${escape(u.address || '')}, ${escape(u.commune || '')}</p></div><a class="btn btn-primary" href="#/nuevo">${icon('plus', 16)} Nuevo ticket</a></div>
      ${tabs('list')}
      ${waiting ? `<div class="card notice warn">${icon('clock', 18)} Tienes ${waiting} ticket${waiting > 1 ? 's' : ''} esperando tu respuesta.</div>` : ''}
      ${toRate ? `<div class="card notice">${icon('smile', 18)} Tienes ${toRate} ticket${toRate > 1 ? 's' : ''} resuelto${toRate > 1 ? 's' : ''} por calificar. ¡Tu opinión nos ayuda!</div>` : ''}
      <div class="row filters">${[['abiertos', 'Abiertos'], ['cerrados', 'Resueltos'], ['todos', 'Todos']].map(([k, l]) => `<button class="chip ${state.filter === k ? 'active' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="ticket-cards">${rows.map(t => `<a class="card hover tcard" href="#/ticket/${t.id}">
        <div class="row between"><small class="muted mono">#${t.number} · ${escape(catName(t.categoryId))}</small><span class="badge badge-${statusOf(t.status).badge}">${customerStatus(t.status)}</span></div>
        <b>${escape(t.subject)}</b>
        <small class="muted">Creado ${date(t.createdAt)} · última actividad ${ago(t.updatedAt)} · ${t.messages.filter(m => m.kind === 'public').length} mensajes${t.csat ? ` · calificado ${'★'.repeat(t.csat.rating)}` : ''}</small>
      </a>`).join('') || `<div class="card empty"><span class="icon">${icon('inbox', 36)}</span><p>No tienes tickets en esta vista.</p><a class="btn" href="index.html">Ir al centro de ayuda</a></div>`}</div>`;
    view.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { state.filter = b.dataset.f; list(); });
  }

  function detail(id) {
    const u = auth.current();
    const t = db.get('tickets', id);
    if (!t || t.customerId !== u.id) { view.innerHTML = `<div class="card empty"><h2>Ticket no encontrado</h2><a class="btn" href="#/">Volver</a></div>`; return; }
    if (t.mergedInto) { location.hash = `#/ticket/${t.mergedInto}`; return; }
    const agent = userById(t.assigneeId);
    const msgs = t.messages.filter(m => m.kind === 'public' || m.kind === 'auto');
    view.innerHTML = `<a class="btn btn-ghost btn-sm" href="#/">${icon('back', 16)} Mis tickets</a>
      <div class="page-head"><div><small class="muted mono">#${t.number} · ${escape(catName(t.categoryId))}</small><h1 style="margin:0">${escape(t.subject)}</h1></div><span class="badge badge-${statusOf(t.status).badge}">${customerStatus(t.status)}</span></div>
      <div class="detail-grid">
        <div class="stack" style="min-width:0">
          ${t.status === 'resuelto' && !t.csat ? `<div class="card csat-box stack" data-csat><b>¿Cómo evaluarías la atención recibida?</b><div class="stars" role="radiogroup" aria-label="Calificación">${[1, 2, 3, 4, 5].map(n => `<button class="star" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} de 5">★</button>`).join('')}</div><textarea class="textarea" data-comment placeholder="Comentario opcional" style="min-height:70px"></textarea><div><button class="btn btn-primary" data-rate disabled>Enviar calificación</button></div></div>` : ''}
          ${t.csat ? `<div class="card notice">${icon('smile', 18)} Calificaste esta atención con <b>${'★'.repeat(t.csat.rating)}${'☆'.repeat(5 - t.csat.rating)}</b>${t.csat.comment ? ` — “${escape(t.csat.comment)}”` : ''}. ¡Gracias!</div>` : ''}
          <div class="thread">${msgs.map(m => {
            const a = m.authorId ? userById(m.authorId) : null;
            const mine = m.authorId === u.id;
            return `<div class="msg ${mine ? 'mine' : 'staff'} ${m.kind === 'auto' ? 'auto' : ''}">${avatar(a || { name: m.kind === 'auto' ? 'Fibra Austral' : (m.guestName || 'Tú'), color: '#64748b' }, 32)}<div class="bubble"><div class="msg-head"><b>${escape(mine ? 'Tú' : a ? `${a.name.split(' ')[0]} · Fibra Austral` : 'Respuesta automática')}</b><small class="muted">${dateTime(m.at)}</small></div><div class="msg-body">${escape(m.body)}</div>${(m.attachments || []).map(f => `<span class="file-chip">${icon('paperclip', 14)} ${escape(f.name)} <small class="muted">${fileSize(f.size)}</small></span>`).join('')}</div></div>`;
          }).join('')}</div>
          ${t.status === 'cerrado' ? '<div class="card notice">Este ticket está cerrado. Si necesitas más ayuda, crea un ticket nuevo.</div>' : `
          <form class="card stack" data-reply novalidate>
            <label for="reply" class="label">${t.status === 'resuelto' ? 'Responder reabrirá el ticket' : 'Responder'}</label>
            <textarea class="textarea" id="reply" name="body" required placeholder="Escribe tu respuesta…"></textarea>
            <div class="row between"><label class="attach">${icon('paperclip', 16)} <span data-fname>Adjuntar</span><input type="file" name="files" multiple hidden></label><button class="btn btn-primary">${icon('send', 16)} Enviar</button></div>
          </form>`}
        </div>
        <aside class="stack">
          <div class="card stack"><h3 style="margin:0">Detalles</h3><ul class="kv small"><li><span>Estado</span><b>${customerStatus(t.status)}</b></li><li><span>Creado</span><b>${dateTime(t.createdAt)}</b></li><li><span>Tema</span><b>${escape(catName(t.categoryId))}</b></li><li><span>Agente</span><b>${escape(agent ? agent.name : 'Por asignar')}</b></li></ul></div>
          ${isOpen(t) && t.status !== 'resuelto' ? '<button class="btn" data-solved>Mi problema ya se resolvió</button>' : ''}
        </aside>
      </div>`;
    const f = view.querySelector('[data-reply]');
    if (f) {
      f.files.onchange = () => { f.querySelector('[data-fname]').textContent = filesOf(f.files).map(x => x.name).join(', ') || 'Adjuntar'; };
      f.addEventListener('submit', e => {
        e.preventDefault();
        if (!f.body.value.trim()) { f.body.classList.add('invalid'); return toast('Escribe un mensaje', 'warning'); }
        addMessage(id, { authorId: u.id, kind: 'public', body: f.body.value, attachments: filesOf(f.files) });
        toast('Respuesta enviada', 'success');
      });
    }
    let rating = 0;
    view.querySelectorAll('[data-star]').forEach(s => s.onclick = () => {
      rating = +s.dataset.star;
      view.querySelectorAll('[data-star]').forEach(x => { const on = +x.dataset.star <= rating; x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.dataset.star === rating); });
      view.querySelector('[data-rate]').disabled = false;
    });
    view.querySelector('[data-rate]')?.addEventListener('click', () => { rateTicket(id, rating, view.querySelector('[data-comment]').value.trim()); toast('¡Gracias por calificarnos!', 'success'); });
    view.querySelector('[data-solved]')?.addEventListener('click', () => {
      addMessage(id, { authorId: u.id, kind: 'public', body: 'El cliente indicó que su problema ya se resolvió.' });
      db.update('tickets', id, { status: 'resuelto', resolvedAt: new Date().toISOString() });
      toast('¡Qué bueno! Marcamos el ticket como resuelto', 'success');
    });
  }

  function newTicket() {
    const cats = db.all('categories').sort((a, b) => a.order - b.order);
    view.innerHTML = `<div class="page-head"><h1 style="margin:0">Nuevo ticket</h1></div>${tabs('new')}
      <form class="card stack" data-new novalidate style="max-width:720px">
        <div class="grid-2"><div class="field"><label for="n-cat">Tema</label><select class="select" id="n-cat" name="categoryId">${cats.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="n-pr">¿Te impide usar el servicio?</label><select class="select" id="n-pr" name="priority"><option value="normal">No, es una consulta</option><option value="alta">Sí, parcialmente</option><option value="urgente">Sí, estoy sin servicio</option></select></div></div>
        <div class="field"><label for="n-s">Asunto *</label><input class="input" id="n-s" name="subject" required></div>
        <div class="field"><label for="n-b">Detalle *</label><textarea class="textarea" id="n-b" name="body" required></textarea></div>
        <label class="attach">${icon('paperclip', 16)} <span data-fname>Adjuntar archivos</span><input type="file" name="files" multiple hidden></label>
        <div><button class="btn btn-primary">Crear ticket</button></div>
      </form>`;
    const f = view.querySelector('[data-new]');
    f.files.onchange = () => { f.querySelector('[data-fname]').textContent = filesOf(f.files).map(x => x.name).join(', ') || 'Adjuntar archivos'; };
    f.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      ['subject', 'body'].forEach(n => { const bad = !f[n].value.trim(); f[n].classList.toggle('invalid', bad); if (bad) ok = false; });
      if (!ok) return toast('Completa asunto y detalle', 'warning');
      const { ticket } = createTicket({ subject: f.subject.value, body: f.body.value, categoryId: f.categoryId.value, priority: f.priority.value, channel: 'portal', customerId: auth.current().id, attachments: filesOf(f.files) });
      toast(`Ticket #${ticket.number} creado`, 'success');
      location.hash = `#/ticket/${ticket.id}`;
    });
  }

  function profile() {
    const u = auth.current();
    view.innerHTML = `<div class="page-head"><h1 style="margin:0">Mi cuenta</h1></div>${tabs('perfil')}
      <div class="grid-2"><form class="card stack" data-prof novalidate>
        <div class="field"><label for="p-n">Nombre</label><input class="input" id="p-n" name="name" value="${escape(u.name)}" required></div>
        <div class="field"><label for="p-ph">Teléfono</label><input class="input" id="p-ph" name="phone" value="${escape(u.phone || '')}"></div>
        <div class="field"><label for="p-ad">Dirección</label><input class="input" id="p-ad" name="address" value="${escape(u.address || '')}"></div>
        <div><button class="btn btn-primary">Guardar cambios</button></div></form>
        <div class="card stack"><h3 style="margin:0">Mi servicio</h3><ul class="kv small"><li><span>Plan</span><b>${escape(u.plan || '—')}</b></li><li><span>RUT</span><b>${escape(u.rut || '—')}</b></li><li><span>Comuna</span><b>${escape(u.commune || '—')}</b></li><li><span>Correo</span><b>${escape(u.email)}</b></li><li><span>Cliente desde</span><b>${date(u.createdAt)}</b></li></ul><a class="btn" href="estado.html">${icon('activity', 16)} Ver estado del servicio</a></div></div>`;
    view.querySelector('[data-prof]').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      if (!f.name.value.trim()) return toast('El nombre es obligatorio', 'warning');
      db.update('users', u.id, { name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim() });
      toast('Datos actualizados', 'success');
    });
  }

  createRouter({ '/': () => show(list), '/ticket/:id': ({ id }) => show(() => detail(id)), '/nuevo': () => show(newTicket), '/perfil': () => show(profile) }, { notFound: () => show(list) }).start();
  wireLayout(root);
  mountChat();
  db.subscribe(ch => {
    if (ch.type === 'log' || ch.col === 'chats' || ch.col === 'votes') return;
    const a = document.activeElement;
    const typing = a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value;
    if (!auth.current()) { location.replace('login.html'); return; }
    chrome();
    if (!typing) current();
  });
}
