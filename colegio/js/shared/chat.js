// Mensajería profesor ↔ apoderado (hilos con lectura) reutilizada por ambas apps.
import { db } from '../data/db.js';
import { escape, ago, dateTime, toast, modal } from '../../../assets/core/ui.js';
import { avatar, empty, formData } from './kit.js';
import { student, shortName } from './academic.js';

let active = null;
export function renderChat(el, { me, threads, other, newThread }) {
  const list = threads.slice().sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  if (!active || !list.some(t => t.id === active)) active = list[0]?.id || null;
  const t = list.find(x => x.id === active);
  el.innerHTML = `<div class="chat">
    <div class="card stack" style="gap:10px">
      <div class="row between"><b>Conversaciones</b>${newThread ? '<button class="btn btn-sm btn-primary" data-new>+ Nuevo</button>' : ''}</div>
      <div class="chat-list">${list.map(x => { const o = other(x); const last = x.messages.at(-1); return `<button class="chat-item ${x.id === active ? 'active' : ''}" data-th="${x.id}">${avatar(o, 32)}<span class="meta"><b>${escape(x.subject)}</b><small>${escape(o?.name || '')} · ${escape(shortName(student(x.studentId)))}</small><small>${escape(last?.text || '')}</small></span>${(x.unread || []).includes(me.id) ? '<span class="unread" aria-label="No leído"></span>' : ''}</button>`; }).join('') || empty('Sin conversaciones')}</div>
    </div>
    <div class="card chat-pane">${t ? `
      <div class="row between" style="border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:6px"><div><b>${escape(t.subject)}</b><div class="small muted">${escape(other(t)?.name || '')} · Estudiante: ${escape(shortName(student(t.studentId)))}</div></div></div>
      <div class="chat-msgs">${t.messages.map(m => `<div class="bubble ${m.from === me.id ? 'me' : ''}">${escape(m.text)}${m.file ? `<div class="file">📎 ${escape(m.file)}</div>` : ''}<small>${escape(db.get('users', m.from)?.name || '')} · ${dateTime(m.at)}</small></div>`).join('')}</div>
      <form class="chat-form" data-send><textarea class="textarea" name="text" placeholder="Escribe un mensaje…" aria-label="Mensaje"></textarea><button class="btn btn-primary">Enviar</button></form>` : empty('Selecciona o inicia una conversación', '✉')}
    </div></div>`;
  if (t && (t.unread || []).includes(me.id)) db.update('threads', t.id, { unread: t.unread.filter(x => x !== me.id) });
  el.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { active = b.dataset.th; renderChat(el, { me, threads: db.query('threads', x => threads.some(y => y.id === x.id)), other, newThread }); });
  const msgs = el.querySelector('.chat-msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  el.querySelector('[data-send]')?.addEventListener('submit', e => {
    e.preventDefault();
    const text = e.currentTarget.text.value.trim();
    if (!text) return;
    const o = other(t);
    db.update('threads', t.id, x => ({ messages: [...x.messages, { from: me.id, text, at: new Date().toISOString() }], lastAt: new Date().toISOString(), unread: [...new Set([...(x.unread || []).filter(u => u !== me.id), o?.id].filter(Boolean))] }));
    toast('Mensaje enviado', 'success');
  });
  el.querySelector('[data-new]')?.addEventListener('click', () => newThread(id => { active = id; }));
}

// Formulario para iniciar conversación. options: [{ value: 'guardianId|studentId', label }]
export function newThreadModal({ me, title = 'Nuevo mensaje', options, onCreate, role }) {
  const m = modal({
    title, body: `<form class="stack" novalidate>
      <div class="field"><label for="nt-to">Para</label><select class="select" id="nt-to" name="to">${options.map(o => `<option value="${escape(o.value)}">${escape(o.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="nt-s">Asunto *</label><input class="input" id="nt-s" name="subject" required></div>
      <div class="field"><label for="nt-t">Mensaje *</label><textarea class="textarea" id="nt-t" name="text" required></textarea></div>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar</button>'
  });
  m.el.querySelector('[data-ok]').onclick = () => {
    const v = formData(m.el.querySelector('form'));
    if (!v.subject || !v.text) return toast('Completa asunto y mensaje', 'warning');
    const [a, b, c] = v.to.split('|');
    const now = new Date().toISOString();
    const th = role === 'profesor'
      ? { teacherId: me.id, guardianId: a, studentId: b, unread: [a] }
      : { teacherId: a, guardianId: me.id, studentId: b, unread: [a] };
    const row = db.insert('threads', { ...th, subject: v.subject, lastAt: now, messages: [{ from: me.id, text: v.text, at: now }] });
    db.log('mensaje', `${me.name} inició conversación: ${v.subject}`, me.id);
    onCreate && onCreate(row.id);
    toast('Mensaje enviado', 'success');
    m.close();
    void c;
  };
}
export { ago };
