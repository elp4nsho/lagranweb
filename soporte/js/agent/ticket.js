// Detalle de ticket en la consola: conversación, notas internas, macros, adjuntos, estado/prioridad/
// asignación/grupo/etiquetas, temporizadores SLA, fusión y barra lateral del cliente con su historial.
import { db, auth } from '../data/db.js';
import { escape, dateTime, ago, toast, confirm, modal, date } from '../../../assets/core/ui.js';
import { STATUSES, PRIORITIES, status as statusOf, priority as prioOf, isOpen, CHANNELS } from '../shared/constants.js';
import { can } from '../shared/perms.js';
import { avatar, requester, catName, userName, agents, fileSize, duration, isEmail, MIN } from '../shared/util.js';
import { sla, addMessage, updateTicket, mergeTickets, fillMacro, createTicket } from '../shared/tickets.js';
import { openForm, field, opt, filesOf } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

const ui = { mode: 'public', draft: {}, after: '' };

export function render(view, { user, params }) {
  const t = db.get('tickets', params.id);
  if (!t) { view.innerHTML = `<div class="card empty"><h2>Ticket no encontrado</h2><a class="btn" href="#/">Volver a la bandeja</a></div>`; return; }
  if (!can('tickets.all', user) && t.assigneeId !== user.id && !(user.groupIds || []).includes(t.groupId)) {
    view.innerHTML = `<div class="card empty"><span class="icon">${icon('shield', 40)}</span><h2>Ticket de otro grupo</h2><p>Este ticket pertenece a ${escape(db.get('groups', t.groupId)?.name || 'otro grupo')}.</p><a class="btn" href="#/">Volver</a></div>`; return;
  }
  const r = requester(t);
  const history = t.customerId ? db.query('tickets', x => x.customerId === t.customerId && x.id !== t.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : db.query('tickets', x => x.guest?.email === r?.email && x.id !== t.id);
  const s = sla(t);
  const draft = ui.draft[t.id] || '';
  const macros = db.all('macros');
  const pct = (due, done) => { const total = new Date(due) - new Date(t.createdAt); const used = (done ? new Date(done) : Date.now()) - new Date(t.createdAt); return Math.max(0, Math.min(100, used / total * 100)); };
  const timer = (label, due, done, met) => `<div class="sla-timer"><div class="row between small"><b>${label}</b><span class="${met === false || (!done && new Date(due) < Date.now()) ? 'late' : met ? 'ok' : ''}">${done ? (met ? `Cumplido en ${duration((new Date(done) - new Date(t.createdAt)) / MIN)}` : `Incumplido (${duration((new Date(done) - new Date(t.createdAt)) / MIN)})`) : new Date(due) < Date.now() ? `Vencido hace ${duration((Date.now() - new Date(due)) / MIN)}` : `Vence en ${duration((new Date(due) - Date.now()) / MIN)}`}</span></div><div class="progress ${(!done && new Date(due) < Date.now()) || met === false ? 'bad' : ''}"><i style="--v:${pct(due, done)}%"></i></div><small class="muted">Objetivo: ${dateTime(due)}</small></div>`;

  view.innerHTML = `
    <a class="btn btn-ghost btn-sm back" href="#/">${icon('back', 16)} Bandeja</a>
    <div class="page-head"><div style="min-width:0"><small class="muted mono">#${t.number} · ${escape(CHANNELS[t.channel] || t.channel)} · creado ${ago(t.createdAt)}</small><h1>${escape(t.subject)}</h1>
      <div class="row" style="gap:6px;margin-top:6px"><span class="badge badge-${statusOf(t.status).badge}">${statusOf(t.status).name}</span><span class="badge badge-${prioOf(t.priority).badge} plain">${prioOf(t.priority).name}</span>${t.tags.map(x => `<span class="tag">${escape(x)}</span>`).join('')}${t.mergedInto ? `<a class="badge badge-info" href="#/ticket/${t.mergedInto}">Fusionado →</a>` : ''}</div></div>
      <div class="row page-actions">${t.assigneeId !== user.id && isOpen(t) ? `<button class="btn btn-primary" data-take>Tomar ticket</button>` : ''}${can('tickets.merge') && isOpen(t) ? `<button class="btn" data-merge>${icon('merge', 16)} Fusionar</button>` : ''}${can('tickets.delete') ? `<button class="btn btn-ghost" data-del aria-label="Eliminar ticket">${icon('trash', 16)}</button>` : ''}</div></div>
    <div class="ticket-grid">
      <div class="stack" style="min-width:0">
        <div class="thread">${t.messages.map(m => {
          if (m.kind === 'system') return `<div class="msg-sys"><span>${escape(m.body)}</span><time>${dateTime(m.at)}</time></div>`;
          const a = m.authorId ? db.get('users', m.authorId) : null;
          const staff = a && a.role !== 'cliente';
          const name = m.kind === 'auto' ? 'Respuesta automática' : a ? a.name : (m.guestName || r?.name || 'Cliente');
          return `<div class="msg ${staff || m.kind === 'auto' ? 'staff' : 'customer'} ${m.kind}">${avatar(a || { name, color: '#64748b' }, 34)}<div class="bubble"><div class="msg-head"><b>${escape(name)}</b>${m.kind === 'internal' ? `<span class="badge badge-warning plain">${icon('lock', 12)} Nota interna</span>` : ''}${m.mergedFrom ? `<span class="badge plain">de #${m.mergedFrom}</span>` : ''}<small class="muted">${dateTime(m.at)}</small></div><div class="msg-body">${escape(m.body)}</div>${(m.attachments || []).map(f => `<span class="file-chip">${icon('paperclip', 14)} ${escape(f.name)} <small class="muted">${fileSize(f.size)}</small></span>`).join('')}</div></div>`;
        }).join('')}</div>
        ${t.status === 'cerrado' ? '<div class="card notice">Ticket cerrado. Para reabrir, cambia el estado en el panel lateral.</div>' : `
        <section class="card composer ${ui.mode}" data-composer>
          <div class="row between"><div class="seg"><button class="seg-btn ${ui.mode === 'public' ? 'active' : ''}" data-mode="public">${icon('mail', 14)} Respuesta pública</button><button class="seg-btn ${ui.mode === 'internal' ? 'active' : ''}" data-mode="internal">${icon('lock', 14)} Nota interna</button></div>
            <select class="select select-sm" data-macro aria-label="Aplicar macro"><option value="">Aplicar macro…</option>${macros.map(m => opt(m.id, m.name)).join('')}</select></div>
          <textarea class="textarea" data-body placeholder="${ui.mode === 'public' ? `Responder a ${escape(r?.name?.split(' ')[0] || 'el cliente')}…` : 'Nota visible solo para el equipo…'}">${escape(draft)}</textarea>
          <div class="row between composer-foot">
            <label class="attach">${icon('paperclip', 16)} <span data-fname>Adjuntar</span><input type="file" multiple hidden data-files></label>
            <div class="row" style="gap:6px"><label class="small muted" for="after">Al enviar:</label><select class="select select-sm" id="after" data-after>${[['', 'Mantener estado'], ['pendiente', 'Pendiente del cliente'], ['espera', 'En espera'], ['resuelto', 'Resuelto']].map(([k, l]) => opt(k, l, ui.after)).join('')}</select>
            <button class="btn btn-primary" data-send>${icon('send', 16)} ${ui.mode === 'public' ? 'Enviar' : 'Guardar nota'}</button></div>
          </div>
        </section>`}
      </div>
      <aside class="stack">
        <section class="card stack props">
          <h3 style="margin:0">Propiedades</h3>
          ${field('Estado', `<select class="select select-sm" data-f="status">${STATUSES.map(x => opt(x.id, x.name, t.status)).join('')}</select>`)}
          ${field('Prioridad', `<select class="select select-sm" data-f="priority">${PRIORITIES.map(x => opt(x.id, x.name, t.priority)).join('')}</select>`)}
          ${field('Asignado a', `<select class="select select-sm" data-f="assigneeId"><option value="">Sin asignar</option>${agents().map(a => opt(a.id, a.name, t.assigneeId)).join('')}</select>`)}
          ${field('Grupo', `<select class="select select-sm" data-f="groupId">${db.all('groups').map(g => opt(g.id, g.name, t.groupId)).join('')}</select>`)}
          ${field('Categoría', `<select class="select select-sm" data-f="categoryId">${db.all('categories').map(c => opt(c.id, c.name, t.categoryId)).join('')}</select>`)}
          <div class="field"><label>Etiquetas</label><div class="row" style="gap:4px">${t.tags.map(x => `<button class="tag" data-untag="${escape(x)}" title="Quitar">${escape(x)} ×</button>`).join('')}<input class="input select-sm" data-tag placeholder="+ etiqueta" style="width:110px" aria-label="Agregar etiqueta"></div></div>
        </section>
        <section class="card stack">
          <div class="row between"><h3 style="margin:0">SLA</h3><span class="badge ${s.breached ? 'badge-danger' : s.risk ? 'badge-warning' : 'badge-success'}">${s.breached ? 'Vencido' : s.risk ? 'En riesgo' : s.active ? 'A tiempo' : 'Detenido'}</span></div>
          ${timer('Primera respuesta', t.firstResponseDue, t.firstResponseAt, s.first.met)}
          ${timer('Resolución', t.resolutionDue, t.resolvedAt, s.res.met)}
          ${t.status === 'pendiente' ? '<small class="muted">El reloj de resolución sigue corriendo, pero el ticket no aparece en “en riesgo” mientras espera al cliente.</small>' : ''}
        </section>
        <section class="card stack">
          <h3 style="margin:0">Cliente</h3>
          <div class="user-chip">${avatar(r || { name: '?' }, 40)}<span><b>${escape(r?.name || '—')}</b><br><small class="muted">${r?.guest ? 'Sin cuenta (invitado)' : escape(r?.plan || '')}</small></span></div>
          <ul class="kv small"><li><span>Correo</span><b class="trunc">${escape(r?.email || '—')}</b></li>${r && !r.guest ? `<li><span>Teléfono</span><b>${escape(r.phone || '—')}</b></li><li><span>RUT</span><b>${escape(r.rut || '—')}</b></li><li><span>Comuna</span><b>${escape(r.commune || '—')}</b></li><li><span>Cliente desde</span><b>${date(r.createdAt, { month: 'short', year: 'numeric' })}</b></li>` : ''}</ul>
          ${t.customerId ? `<a class="btn btn-sm" href="#/clientes/${t.customerId}">Ver ficha del cliente</a>` : ''}
          <div class="nav-section" style="padding-left:0">Historial (${history.length})</div>
          <div class="hist-list">${history.slice(0, 6).map(h => `<a href="#/ticket/${h.id}" class="hist-row"><span class="trunc">#${h.number} ${escape(h.subject)}</span><small class="muted">${statusOf(h.status).name} · ${ago(h.createdAt)}${h.csat ? ` · ${'★'.repeat(h.csat.rating)}` : ''}</small></a>`).join('') || '<small class="muted">Primer contacto del cliente</small>'}</div>
        </section>
      </aside>
    </div>`;

  const rerender = () => render(view, { user, params });
  const body = view.querySelector('[data-body]');
  if (body) body.oninput = () => { ui.draft[t.id] = body.value; };
  view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { ui.mode = b.dataset.mode; rerender(); });
  view.querySelector('[data-macro]')?.addEventListener('change', e => {
    const m = db.get('macros', e.target.value);
    if (!m) return;
    ui.draft[t.id] = (body.value ? body.value + '\n\n' : '') + fillMacro(m.body, t);
    if (m.status) ui.after = m.status;
    ui.mode = 'public';
    const patch = {};
    if (m.priority) patch.priority = m.priority;
    if (m.tag && !t.tags.includes(m.tag)) patch.tags = [...t.tags, m.tag];
    if (Object.keys(patch).length) updateTicket(t.id, patch, user.id);
    toast(`Macro "${m.name}" aplicada`, 'info');
    rerender();
  });
  const files = view.querySelector('[data-files]');
  if (files) files.onchange = () => { view.querySelector('[data-fname]').textContent = filesOf(files).map(f => f.name).join(', ') || 'Adjuntar'; };
  view.querySelector('[data-after]')?.addEventListener('change', e => { ui.after = e.target.value; });
  view.querySelector('[data-send]')?.addEventListener('click', () => {
    const text = body.value.trim();
    if (!text) { body.classList.add('invalid'); return toast('Escribe un mensaje', 'warning'); }
    addMessage(t.id, { authorId: user.id, kind: ui.mode, body: text, attachments: filesOf(files) });
    if (ui.after) updateTicket(t.id, { status: ui.after }, user.id);
    delete ui.draft[t.id];
    toast(ui.mode === 'public' ? 'Respuesta enviada al cliente' : 'Nota interna guardada', 'success');
    ui.after = '';
  });
  view.querySelectorAll('[data-f]').forEach(sel => sel.onchange = () => { updateTicket(t.id, { [sel.dataset.f]: sel.value || null }, user.id); toast('Ticket actualizado', 'success'); });
  const tagIn = view.querySelector('[data-tag]');
  tagIn.onkeydown = e => { if (e.key === 'Enter' && tagIn.value.trim()) { e.preventDefault(); const v = tagIn.value.trim().toLowerCase().replace(/\s+/g, '-'); if (!t.tags.includes(v)) db.update('tickets', t.id, { tags: [...t.tags, v] }); tagIn.value = ''; tagIn.blur(); } };
  view.querySelectorAll('[data-untag]').forEach(b => b.onclick = () => db.update('tickets', t.id, { tags: t.tags.filter(x => x !== b.dataset.untag) }));
  view.querySelector('[data-take]')?.addEventListener('click', () => { updateTicket(t.id, { assigneeId: user.id, ...(t.status === 'nuevo' ? { status: 'abierto' } : {}) }, user.id); toast('Ticket asignado a ti', 'success'); });
  view.querySelector('[data-merge]')?.addEventListener('click', () => mergeModal(t, history, user));
  view.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Eliminar definitivamente el ticket #${t.number}?`, { danger: true, ok: 'Eliminar' })) return;
    db.remove('tickets', t.id); db.log('ticket', `Eliminó el ticket #${t.number}`, user.id); toast('Ticket eliminado', 'success'); location.hash = '#/';
  });
}

function mergeModal(t, history, user) {
  const candidates = history.filter(h => isOpen(h));
  const m = modal({
    title: `Fusionar #${t.number}`,
    body: `<div class="stack"><p class="muted" style="margin:0">Fusiona este ticket en otro del mismo cliente (o indica un número). La conversación se mueve al ticket destino y este queda cerrado.</p>
      ${candidates.length ? `<div class="stack" style="gap:6px">${candidates.map(c => `<label class="check"><input type="radio" name="target" value="${c.id}"> #${c.number} · ${escape(c.subject)}</label>`).join('')}</div>` : '<small class="muted">El cliente no tiene otros tickets abiertos.</small>'}
      <div class="field"><label for="mn">…o número de ticket destino</label><input class="input" id="mn" placeholder="Ej: 10375" inputmode="numeric"></div></div>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Fusionar</button>'
  });
  m.el.querySelector('[data-ok]').onclick = () => {
    const sel = m.el.querySelector('input[name=target]:checked')?.value;
    const num = m.el.querySelector('#mn').value.trim().replace('#', '');
    const target = sel ? db.get('tickets', sel) : db.find('tickets', x => String(x.number) === num);
    if (!target || target.id === t.id) return toast('Elige un ticket destino válido', 'warning');
    mergeTickets(t.id, target.id, user.id);
    m.close();
    toast(`Fusionado en #${target.number}`, 'success');
    location.hash = `#/ticket/${target.id}`;
  };
}

// Ticket creado por un agente (p. ej. por teléfono).
export function newTicketModal(defaults = {}) {
  const user = auth.current();
  const clients = db.query('users', u => u.role === 'cliente' && u.active !== false).sort((a, b) => a.name.localeCompare(b.name));
  openForm({
    title: 'Nuevo ticket', size: 'lg',
    body: `<div class="grid-2">
      ${field('Cliente', `<select class="select" name="customerId"><option value="">— Sin cuenta (invitado) —</option>${clients.map(c => opt(c.id, `${c.name} · ${c.email}`, defaults.customerId)).join('')}</select>`)}
      ${field('Canal', `<select class="select" name="channel">${Object.entries(CHANNELS).map(([k, l]) => opt(k, l, defaults.channel || 'telefono')).join('')}</select>`)}
      ${field('Nombre (si es invitado)', `<input class="input" name="gname" value="${escape(defaults.gname || '')}">`)}
      ${field('Correo (si es invitado)', `<input class="input" name="gemail" type="email" value="${escape(defaults.gemail || '')}">`)}
      ${field('Categoría', `<select class="select" name="categoryId">${db.all('categories').map(c => opt(c.id, c.name)).join('')}</select>`)}
      ${field('Prioridad', `<select class="select" name="priority">${PRIORITIES.map(p => opt(p.id, p.name, 'normal')).join('')}</select>`)}
    </div>
    ${field('Asunto *', `<input class="input" name="subject" required value="${escape(defaults.subject || '')}">`)}
    ${field('Descripción *', `<textarea class="textarea" name="body" required>${escape(defaults.body || '')}</textarea>`)}
    <label class="check"><input type="checkbox" name="mine" checked> Asignarme el ticket</label>`,
    onSubmit: (f, v) => {
      if (!v.customerId && (!v.gname.trim() || !isEmail(v.gemail))) { toast('Elige un cliente o indica nombre y correo válidos', 'warning'); return false; }
      const { ticket } = createTicket({ subject: v.subject, body: v.body, categoryId: v.categoryId, priority: v.priority, channel: v.channel, customerId: v.customerId || null, guest: v.customerId ? null : { name: v.gname.trim(), email: v.gemail.trim() }, actorId: user.id, assigneeId: v.mine ? user.id : null });
      toast(`Ticket #${ticket.number} creado`, 'success');
      defaults.onCreated ? defaults.onCreated(ticket) : (location.hash = `#/ticket/${ticket.id}`);
    }
  });
}
