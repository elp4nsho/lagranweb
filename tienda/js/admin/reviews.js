// Moderación de reseñas: pendientes → aprobar / rechazar; las aprobadas se ven en la ficha del producto.
import { html, raw, date, ago, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, smartTable, log } from './common.js';

let tab = 'pendiente';
const LABEL = { pendiente: 'Pendientes', aprobada: 'Aprobadas', rechazada: 'Rechazadas' };

export function render(el) {
  const all = db.all('reviews');
  const rows = all.filter(r => r.status === tab).map(r => ({ ...r, pname: db.get('products', r.productId)?.name || '—' }));
  const avg = all.filter(r => r.status === 'aprobada').reduce((s, r, _, a) => s + r.rating / a.length, 0);
  el.innerHTML = html`${raw(pageHead('Reseñas', `Valoración promedio publicada: ★ ${avg.toFixed(2)}`, tab === 'pendiente' && rows.length ? '<button class="btn btn-primary" data-all>✓ Aprobar todas las de 4★ o más</button>' : ''))}
    <div class="tabs">${Object.entries(LABEL).map(([k, l]) => raw(`<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l} (${all.filter(r => r.status === k).length})</button>`))}</div><div data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'reviews-' + tab, rows, search: r => `${r.pname} ${r.author} ${r.title} ${r.body}`, defaultSort: { key: 'createdAt', dir: -1 },
    empty: tab === 'pendiente' ? 'No hay reseñas por moderar 🎉' : 'Sin reseñas',
    filters: [{ key: 'rating', label: 'Estrellas', options: [5, 4, 3, 2, 1].map(n => [n, n + '★']) }],
    columns: [
      { key: 'createdAt', label: 'Fecha', render: r => `${date(r.createdAt)}<br><small class="muted">${ago(r.createdAt)}</small>` },
      { key: 'pname', label: 'Producto', render: r => html`<a href="#/productos/${r.productId}">${r.pname}</a>` },
      { key: 'rating', label: 'Nota', render: r => `<span class="stars">${'★'.repeat(r.rating)}<span class="off">${'★'.repeat(5 - r.rating)}</span></span>` },
      { key: 'title', label: 'Reseña', render: r => html`<b>${r.title}</b><br><span class="small">${r.body}</span><br><small class="muted">${r.author}${r.verified ? ' · ✓ compra verificada' : ''}</small>` },
      { key: 'act', label: '', sort: false, class: 'actions', render: r => (r.status !== 'aprobada' ? `<button class="btn btn-sm btn-primary" data-set="aprobada" data-id="${r.id}">Aprobar</button>` : '') + (r.status !== 'rechazada' ? `<button class="btn btn-sm" data-set="rechazada" data-id="${r.id}">Rechazar</button>` : '') + `<button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>` }
    ]
  });
  el.addEventListener('click', async e => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; const n = document.createElement('div'); n.className = el.className; n.style.cssText = el.style.cssText; el.replaceWith(n); render(n); return; }
    const s = e.target.closest('[data-set]');
    if (s) {
      const r = db.get('reviews', s.dataset.id);
      db.update('reviews', r.id, { status: s.dataset.set });
      log('reseña', `${s.dataset.set === 'aprobada' ? 'Aprobó' : 'Rechazó'} reseña de ${r.author}`);
      toast(s.dataset.set === 'aprobada' ? 'Reseña publicada en la tienda' : 'Reseña rechazada', s.dataset.set === 'aprobada' ? 'success' : 'info');
    }
    const d = e.target.closest('[data-del]');
    if (d && await confirm('¿Eliminar esta reseña definitivamente?', { danger: true, ok: 'Eliminar' })) { db.remove('reviews', d.dataset.del); log('reseña', 'Eliminó una reseña'); toast('Reseña eliminada', 'info'); }
    if (e.target.closest('[data-all]')) {
      const list = db.query('reviews', r => r.status === 'pendiente' && r.rating >= 4);
      list.forEach(r => db.update('reviews', r.id, { status: 'aprobada' }));
      log('reseña', `Aprobó ${list.length} reseñas en lote`);
      toast(`${list.length} reseñas aprobadas`, 'success');
    }
  });
}
