// Centro de notificaciones del cliente.
import { db } from '../data/db.js';
import { ago, toast } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead } from './common.js';

const ICON = { abono: '💰', seguridad: '🛡️', meta: '🎯', pago: '🧾', inversion: '📈', credito: '🏦', soporte: '💬', info: 'ℹ️' };
const st = { filter: 'todas' };

export function render(el, { user }) {
  const all = db.query('notifications', n => n.userId === user.id).sort((a, b) => (b.at || b.createdAt).localeCompare(a.at || a.createdAt));
  const list = all.filter(n => st.filter === 'todas' || (st.filter === 'no leídas' ? !n.read : n.kind === st.filter));
  const unread = all.filter(n => !n.read).length;
  el.innerHTML = h`${raw(pageHead('Notificaciones', `${unread} sin leer`, unread ? '<button class="btn btn-sm" data-all>Marcar todas como leídas</button>' : ''))}
  <div class="chips">${['todas', 'no leídas', 'seguridad', 'abono', 'pago', 'credito'].map(f => h`<button class="chip ${st.filter === f ? 'active' : ''}" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`)}</div>
  <section class="card" style="padding:0">${list.map(n => h`<div class="notif ${n.read ? '' : 'unread'}"><span class="tx-ic">${ICON[n.kind] || 'ℹ️'}</span><div class="tx-main"><b>${n.title}</b><p class="small" style="margin:2px 0">${n.body}</p><small class="muted">${ago(n.at || n.createdAt)}</small></div>
    <div class="row" style="gap:4px;flex-wrap:nowrap">${!n.read ? raw(`<button class="btn btn-sm btn-ghost" data-read="${n.id}" aria-label="Marcar como leída">✓</button>`) : ''}<button class="btn btn-sm btn-ghost" data-del="${n.id}" aria-label="Eliminar">🗑</button></div></div>`)}
  ${!list.length ? raw('<div class="empty">No hay notificaciones.</div>') : ''}</section>`;
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { st.filter = b.dataset.f; render(el, { user }); });
  el.querySelectorAll('[data-read]').forEach(b => b.onclick = () => db.update('notifications', b.dataset.read, { read: true }));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { db.remove('notifications', b.dataset.del); toast('Notificación eliminada', 'info'); });
  el.querySelector('[data-all]')?.addEventListener('click', () => all.filter(n => !n.read).forEach(n => db.update('notifications', n.id, { read: true })));
}
