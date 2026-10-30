// Widget de chat en vivo para las páginas públicas. Un bot responde con artículos de la base de
// conocimiento y, si el cliente lo pide, deriva a un agente. El agente contesta desde la consola
// (otra pestaña): los mensajes viajan por la base compartida (db.subscribe + evento storage).
import { db, auth } from '../data/db.js';
import { escape, time } from '../../../assets/core/ui.js';
import { uid } from '../../../assets/core/db.js';
import { icon } from './icons.js';
import { searchArticles } from './util.js';
import { notify } from './tickets.js';

const VKEY = 'atiende:visitor';
export function visitorId() {
  let v = null;
  try { v = localStorage.getItem(VKEY); if (!v) { v = uid('v-'); localStorage.setItem(VKEY, v); } } catch (e) { v = v || 'v-anon'; }
  return v;
}
const myChat = () => db.query('chats', c => c.visitorId === visitorId() && !c.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
const push = (id, m) => db.update('chats', id, c => ({ messages: [...c.messages, { at: new Date().toISOString(), ...m }] }));

export function mountChat({ articleHref = id => `index.html#/articulo/${id}` } = {}) {
  const help = db.getValue('help', {});
  if (help.chatEnabled === false) return;
  const el = document.createElement('div');
  el.className = 'chatw';
  el.innerHTML = `<button class="chatw-fab btn btn-primary" aria-expanded="false" aria-controls="chatw-panel" data-fab>${icon('chat', 20)}<span>¿Necesitas ayuda?</span><i class="chatw-unread" hidden></i></button>
    <section class="chatw-panel card" id="chatw-panel" role="dialog" aria-label="Chat de ayuda" hidden>
      <header class="chatw-head"><span class="avatar" style="--size:34px">${icon('chat', 16)}</span><div><b>${escape(help.botName || 'Austral')} · Fibra Austral</b><small data-sub>Asistente virtual</small></div><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Cerrar chat">${icon('x', 16)}</button></header>
      <div class="chatw-body" data-body aria-live="polite"></div>
      <form class="chatw-form" data-form><input class="input" name="msg" placeholder="Escribe tu mensaje…" autocomplete="off" aria-label="Mensaje"><button class="btn btn-primary btn-icon" aria-label="Enviar">${icon('send', 16)}</button></form>
    </section>`;
  document.body.appendChild(el);
  const panel = el.querySelector('.chatw-panel'), body = el.querySelector('[data-body]'), fab = el.querySelector('[data-fab]');
  let open = false, seen = 0, typing = false;

  function render() {
    const c = myChat();
    const user = auth.current();
    const sub = el.querySelector('[data-sub]');
    if (!c) {
      sub.textContent = 'Asistente virtual · responde al instante';
      body.innerHTML = `<div class="chatw-msg bot">${escape(help.botGreeting || '¡Hola! ¿En qué te puedo ayudar?')}</div>
        <div class="chatw-quick">${['Internet lento', 'No tengo internet', 'Pagar mi boleta', 'Cambiar clave WiFi'].map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('')}</div>
        ${user ? '' : '<small class="muted chatw-note">Puedes chatear sin iniciar sesión.</small>'}`;
      return;
    }
    const agent = c.agentId ? db.get('users', c.agentId) : null;
    sub.textContent = c.status === 'activo' ? `${agent?.name || 'Agente'} está en línea` : c.status === 'esperando' ? 'Esperando a un agente…' : c.status === 'cerrado' ? 'Conversación finalizada' : 'Asistente virtual';
    body.innerHTML = c.messages.map(m => `<div class="chatw-msg ${m.from}">${m.from === 'agente' ? `<small class="chatw-who">${escape(agent?.name?.split(' ')[0] || 'Agente')}</small>` : ''}${escape(m.body)}
        ${m.articles ? `<span class="chatw-links">${m.articles.map(id => { const a = db.get('articles', id); return a ? `<a href="${articleHref(id)}" target="_blank" rel="noopener">${icon('book', 14)} ${escape(a.title)}</a>` : ''; }).join('')}</span>` : ''}
        <time>${time(m.at)}</time></div>`).join('') +
      (typing ? '<div class="chatw-msg bot typing"><i></i><i></i><i></i></div>' : '') +
      (c.status === 'bot' && c.messages.at(-1)?.from === 'bot' && c.messages.length > 1 ? `<div class="chatw-quick"><button class="chip" data-ok>Sí, me sirvió</button><button class="chip active" data-handoff>Hablar con un agente</button></div>` : '') +
      (c.status === 'esperando' ? `<div class="chatw-wait"><span class="spinner"></span> Un agente se unirá en breve. Posición en la fila: ${db.query('chats', x => x.status === 'esperando' && x.createdAt <= c.createdAt).length}</div>` : '') +
      (c.status === 'cerrado' ? `<div class="chatw-quick"><button class="chip active" data-new>Iniciar un nuevo chat</button></div>` : '');
    el.querySelector('[data-form] input').disabled = c.status === 'cerrado';
    body.scrollTop = body.scrollHeight;
    const agentMsgs = c.messages.filter(m => m.from !== 'cliente').length;
    if (!open && agentMsgs > seen) el.querySelector('.chatw-unread').hidden = false;
    if (open) seen = agentMsgs;
  }

  function send(text) {
    text = text.trim();
    if (!text) return;
    const user = auth.current();
    let c = myChat();
    if (!c || c.status === 'cerrado') {
      c = db.insert('chats', { visitorId: visitorId(), name: user?.role === 'cliente' ? user.name : 'Visitante web', email: user?.email || '', customerId: user?.role === 'cliente' ? user.id : null, status: 'bot', agentId: null, page: location.pathname.split('/').pop(), messages: [{ from: 'bot', body: help.botGreeting || '¡Hola!', at: new Date().toISOString() }] });
    }
    push(c.id, { from: 'cliente', body: text });
    if (c.status === 'activo') { notify(c.agentId, `Nuevo mensaje de ${c.name} en el chat`, 'agente.html#/chats'); return; }
    if (c.status !== 'bot') return;
    if (/agente|persona|humano|ejecutivo/i.test(text)) return handoff(c.id);
    typing = true; render();
    setTimeout(() => {
      typing = false;
      const found = searchArticles(text, { limit: 2 });
      if (found.length) push(c.id, { from: 'bot', body: `Encontré ${found.length === 1 ? 'esta guía' : 'estas guías'} que podrían ayudarte. ¿Te sirvió?`, articles: found.map(a => a.id) });
      else push(c.id, { from: 'bot', body: 'No encontré una guía para eso. Si quieres, te derivo con un agente de nuestro equipo.' });
    }, 700);
  }
  function handoff(id) {
    db.update('chats', id, { status: 'esperando', waitingSince: new Date().toISOString() });
    push(id, { from: 'bot', body: 'Te estoy derivando con un agente. Mientras esperas, cuéntanos tu RUT o dirección para agilizar la atención.' });
    db.query('users', u => ['agente', 'supervisor'].includes(u.role) && u.active !== false).forEach(u => notify(u.id, `Chat en espera: ${myChat()?.name || 'Visitante'}`, 'agente.html#/chats'));
    db.log('chat', `Chat derivado a agente desde ${location.pathname.split('/').pop()}`);
  }

  const toggle = v => { open = v ?? !open; panel.hidden = !open; fab.setAttribute('aria-expanded', open); el.classList.toggle('is-open', open); if (open) { el.querySelector('.chatw-unread').hidden = true; render(); setTimeout(() => el.querySelector('[data-form] input').focus(), 50); } };
  fab.onclick = () => toggle();
  el.querySelector('[data-close]').onclick = () => toggle(false);
  el.querySelector('[data-form]').addEventListener('submit', e => { e.preventDefault(); const i = e.target.msg; send(i.value); i.value = ''; });
  body.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (q) send(q.dataset.q);
    if (e.target.closest('[data-handoff]')) handoff(myChat().id);
    if (e.target.closest('[data-ok]')) { const c = myChat(); push(c.id, { from: 'cliente', body: 'Sí, me sirvió' }); push(c.id, { from: 'bot', body: '¡Qué bueno! Si necesitas algo más, aquí estaré.' }); db.update('chats', c.id, { status: 'cerrado', resolvedByBot: true, closedAt: new Date().toISOString() }); }
    if (e.target.closest('[data-new]')) { db.update('chats', myChat().id, { hidden: true }); render(); }
  });
  db.subscribe(ch => { if (ch.type === 'sync' || ch.type === 'reset' || ch.col === 'chats') render(); });
  render();
  return { open: () => toggle(true) };
}
