// Bandeja de avisos del trabajador.
import { escape, ago } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';

export function renderNotifications(view) {
  const u = auth.current();
  const list = db.query('notifications', n => n.userId === u.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  view.innerHTML = `<div class="lx-head"><div><span class="eyebrow">Avisos</span><h1>Notificaciones</h1></div>${list.some(n => !n.read) ? '<button class="btn" id="read-all">Marcar todo como leído</button>' : ''}</div>
    ${list.length ? `<div class="card"><ul class="ak-list">${list.map(n => `<li><span class="badge badge-${n.kind || 'info'}" aria-hidden="true">${n.read ? 'Leído' : 'Nuevo'}</span><div class="grow"><b>${escape(n.title)}</b><small>${escape(n.text)}</small></div><span class="small muted">${ago(n.at)}</span></li>`).join('')}</ul></div>` : '<div class="card empty">No tienes notificaciones.</div>'}`;
  view.querySelector('#read-all')?.addEventListener('click', () => list.filter(n => !n.read).forEach(n => db.update('notifications', n.id, { read: true })));
}
