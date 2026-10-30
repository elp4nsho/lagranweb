// Cola de chats en vivo: tomar chats en espera, conversar en tiempo real con el visitante
// (que está en otra pestaña, en el sitio público), cerrar y convertir en ticket.
import { db } from '../data/db.js';
import { escape, time, ago, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { avatar } from '../shared/util.js';
import { notify } from '../shared/tickets.js';
import { icon } from '../shared/icons.js';
import { newTicketModal } from './ticket.js';

const state = { sel: null };
let mounted = null, me = null;
// Actualiza solo la cola y los mensajes cuando llegan datos, sin tocar lo que el agente escribe.
db.subscribe(ch => { if (mounted && document.body.contains(mounted) && (ch.col === 'chats' || ch.type === 'sync')) paintLive(); });

export const waitingCount = () => db.count('chats', c => c.status === 'esperando');

export function render(view, { user }) {
  me = user;
  if (!state.sel || !db.get('chats', state.sel)) state.sel = (db.find('chats', c => c.status === 'activo' && c.agentId === user.id) || db.find('chats', c => c.status === 'esperando'))?.id || null;
  view.innerHTML = `${pageHead('Chats en vivo', 'Los visitantes escriben desde el widget del centro de ayuda. Abre index.html en otra pestaña para probarlo.')}
    <div class="chat-console"><aside class="card chat-queue" data-queue></aside><section class="card chat-pane" data-pane></section></div>`;
  mounted = view.querySelector('.chat-console');
  paintLive(true);
  view.querySelector('[data-queue]').addEventListener('click', e => { const b = e.target.closest('[data-chat]'); if (b) { state.sel = b.dataset.chat; paintLive(true); } });
}

function paintLive(full = false) {
  const q = mounted.querySelector('[data-queue]'), pane = mounted.querySelector('[data-pane]');
  const all = db.all('chats').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sect = (title, list) => `<div class="nav-section" style="padding-left:4px">${title} (${list.length})</div>${list.map(c => `<button class="chat-item ${c.id === state.sel ? 'active' : ''} st-${c.status}" data-chat="${c.id}">${avatar({ name: c.name, color: '#64748b' }, 30)}<span><b>${escape(c.name)}</b><small class="muted trunc">${escape(c.messages.at(-1)?.body || '')}</small></span><small class="muted">${ago(c.messages.at(-1)?.at || c.createdAt).replace('hace ', '')}</small></button>`).join('') || '<small class="muted" style="padding:4px">—</small>'}`;
  q.innerHTML = sect('En espera', all.filter(c => c.status === 'esperando')) + sect('Mis chats activos', all.filter(c => c.status === 'activo' && c.agentId === me.id)) + sect('Otros activos', all.filter(c => c.status === 'activo' && c.agentId !== me.id)) + sect('Con el bot', all.filter(c => c.status === 'bot')) + sect('Cerrados', all.filter(c => c.status === 'cerrado').slice(0, 6));
  const c = db.get('chats', state.sel);
  if (!c) { pane.innerHTML = `<div class="empty">${icon('chat', 40)}<p>No hay chats seleccionados. Cuando un visitante pida hablar con un agente aparecerá en “En espera”.</p></div>`; return; }
  const agent = c.agentId ? db.get('users', c.agentId) : null;
  const msgs = `<div class="chat-msgs" data-msgs>${c.messages.map(m => `<div class="chatw-msg ${m.from}">${m.from === 'agente' ? `<small class="chatw-who">${escape(agent?.name.split(' ')[0] || 'Agente')}</small>` : m.from === 'bot' ? '<small class="chatw-who">Bot</small>' : ''}${escape(m.body)}${m.articles ? `<span class="chatw-links">${m.articles.map(id => `<span>${icon('book', 12)} ${escape(db.get('articles', id)?.title || '')}</span>`).join('')}</span>` : ''}<time>${time(m.at)}</time></div>`).join('')}</div>`;
  if (!full && pane.querySelector('[data-msgs]') && pane.dataset.chat === c.id && pane.dataset.status === c.status) {
    const box = pane.querySelector('[data-msgs]'); box.outerHTML = msgs; pane.querySelector('[data-msgs]').scrollTop = 1e6; return;
  }
  pane.dataset.chat = c.id; pane.dataset.status = c.status;
  const mine = c.status === 'activo' && c.agentId === me.id;
  pane.innerHTML = `<header class="row between chat-head"><div class="user-chip">${avatar({ name: c.name, color: '#64748b' }, 36)}<span><b>${escape(c.name)}</b><br><small class="muted">${escape(c.email || 'sin correo')} · desde ${escape(c.page || 'index.html')} · ${{ esperando: 'esperando agente', activo: `atendido por ${agent?.name || '—'}`, bot: 'conversando con el bot', cerrado: 'cerrado' }[c.status]}</small></span></div>
      <div class="row" style="gap:6px">${c.status === 'esperando' || (c.status === 'bot') ? `<button class="btn btn-primary btn-sm" data-take>Atender chat</button>` : ''}${c.status !== 'cerrado' && (mine || c.status === 'esperando') ? '<button class="btn btn-sm" data-close>Cerrar chat</button>' : ''}${!c.ticketId ? '<button class="btn btn-sm" data-ticket>Crear ticket</button>' : `<a class="btn btn-sm" href="#/ticket/${c.ticketId}">Ver ticket</a>`}</div></header>
    ${msgs}
    ${mine ? `<form class="chat-input" data-send><input class="input" name="msg" placeholder="Escribe al visitante…" autocomplete="off" aria-label="Mensaje"><button class="btn btn-primary">${icon('send', 16)} Enviar</button></form>
      <div class="row quick-replies">${['Hola, soy ' + me.name.split(' ')[0] + ', ¿en qué te ayudo?', '¿Me indicas tu RUT o dirección?', 'Estoy revisando tu servicio, dame un momento.', '¿Te puedo ayudar en algo más?'].map(t => `<button class="chip" data-quick="${escape(t)}">${escape(t)}</button>`).join('')}</div>` : c.status === 'cerrado' ? '<p class="muted small center">Conversación cerrada.</p>' : c.status === 'activo' ? '<p class="muted small center">Este chat lo atiende otro agente.</p>' : ''}`;
  pane.querySelector('[data-msgs]').scrollTop = 1e6;
  const send = text => { if (!text.trim()) return; db.update('chats', c.id, x => ({ messages: [...x.messages, { from: 'agente', body: text.trim(), at: new Date().toISOString() }] })); };
  pane.querySelector('[data-take]')?.addEventListener('click', () => {
    db.update('chats', c.id, x => ({ status: 'activo', agentId: me.id, takenAt: new Date().toISOString(), messages: [...x.messages, { from: 'bot', body: `${me.name.split(' ')[0]} se unió a la conversación.`, at: new Date().toISOString() }] }));
    db.log('chat', `${me.name} atendió el chat de ${c.name}`, me.id);
    toast('Chat asignado a ti', 'success');
    paintLive(true);
  });
  pane.querySelector('[data-close]')?.addEventListener('click', () => {
    db.update('chats', c.id, x => ({ status: 'cerrado', closedAt: new Date().toISOString(), messages: [...x.messages, { from: 'bot', body: 'El agente cerró la conversación. ¡Gracias por escribirnos!', at: new Date().toISOString() }] }));
    toast('Chat cerrado', 'success'); paintLive(true);
  });
  pane.querySelector('[data-ticket]')?.addEventListener('click', () => {
    const cust = c.customerId || db.find('users', u => u.role === 'cliente' && c.email && u.email === c.email)?.id;
    newTicketModal({ customerId: cust, channel: 'chat', gname: c.name, gemail: c.email, subject: `Chat: ${c.messages.find(m => m.from === 'cliente')?.body.slice(0, 60) || 'consulta'}`, body: c.messages.map(m => `[${time(m.at)}] ${m.from}: ${m.body}`).join('\n'), onCreated: t => { db.update('chats', c.id, { ticketId: t.id }); notify(me.id, `Ticket #${t.number} creado desde chat`, `agente.html#/ticket/${t.id}`); paintLive(true); } });
  });
  const f = pane.querySelector('[data-send]');
  f?.addEventListener('submit', e => { e.preventDefault(); send(f.msg.value); f.msg.value = ''; f.msg.focus(); });
  pane.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => send(b.dataset.quick));
}
