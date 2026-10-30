// Bandeja de mensajes del formulario de contacto del sitio.
import { escape, modal, toast, confirm as ask, downloadCSV, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/kit.js';

export function render(el, { db, me }) {
  const rows = db.all('contacts');
  el.innerHTML = `${pageHead('Mensajes web', `${rows.filter(r => r.status === 'nuevo').length} sin responder`, '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'contacts', rows, search: r => r.name + r.email + r.subject + r.message,
    filters: [{ key: 'status', label: 'Estado', options: [['nuevo', 'Nuevos'], ['respondido', 'Respondidos']] }],
    columns: [
      { key: 'createdAt', label: 'Fecha', render: r => `<span class="small nowrap">${dateTime(r.createdAt)}</span>` },
      { key: 'name', label: 'Remitente', render: r => `<b>${escape(r.name)}</b><div class="small muted">${escape(r.email)}</div>` },
      { key: 'subject', label: 'Asunto', render: r => `<b class="small">${escape(r.subject)}</b><div class="small muted">${escape(r.message.slice(0, 70))}${r.message.length > 70 ? '…' : ''}</div>` },
      { key: 'status', label: 'Estado', render: r => r.status === 'nuevo' ? badge('Nuevo', 'warning') : badge('Respondido', 'success') },
      { key: 'x', label: '', sort: false, render: () => '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>' }
    ],
    onRow: r => {
      const m = modal({ title: r.subject, body: `<div class="stack"><p class="small muted mb-0">${escape(r.name)} · ${escape(r.email)} · ${dateTime(r.createdAt)}</p><p>${escape(r.message)}</p>${r.reply ? `<div class="notice ok"><b>Respuesta enviada:</b> ${escape(r.reply)}</div>` : '<div class="field"><label for="ct-r">Respuesta</label><textarea class="textarea" id="ct-r"></textarea></div>'}</div>`, foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${r.reply ? '' : '<button class="btn btn-primary" data-send>Responder por correo</button>'}` });
      m.el.querySelector('[data-send]')?.addEventListener('click', () => {
        const t = m.el.querySelector('textarea').value.trim();
        if (!t) return toast('Escribe una respuesta', 'warning');
        db.update('contacts', r.id, { status: 'respondido', reply: t, repliedBy: me.id }); db.log('contacto', `Respuesta enviada a ${r.name}`, me.id); toast('Respuesta enviada', 'success'); m.close();
      });
    },
    onAction: async (act, r) => { if (await ask('¿Eliminar este mensaje?', { danger: true, ok: 'Eliminar' })) { db.remove('contacts', r.id); toast('Mensaje eliminado', 'success'); } }
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('mensajes-web.csv', rows.map(r => ({ fecha: r.createdAt.slice(0, 10), nombre: r.name, correo: r.email, asunto: r.subject, mensaje: r.message, estado: r.status })));
}
