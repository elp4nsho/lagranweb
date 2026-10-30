// Opiniones de comensales: moderación (publicar en la portada) y métricas.
import { escape, date as fmtDate, toast, confirm, barChart } from '../../../assets/core/ui.js';
import { pageHead, kpi, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';

const stars = n => `<span class="stars-static" aria-label="${n} de 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
export default {
  id: 'opiniones', label: 'Opiniones', icon: '⭐', group: 'Contenido', roles: ['admin'], watch: ['ratings'],
  render(el, ctx) {
    const all = db.all('ratings');
    const avg = k => all.length ? (all.reduce((a, r) => a + (r[k] || 0), 0) / all.length).toFixed(1) : '—';
    const dist = [5, 4, 3, 2, 1].map(n => ({ label: n + '★', value: all.filter(r => r.stars === n).length }));
    el.innerHTML = `${pageHead('Opiniones', 'Calificaciones enviadas desde la app de la mesa. Las publicadas aparecen en la portada.')}
      <div class="kpi-grid">${kpi('Promedio general', avg('stars') + ' ★', all.length + ' opiniones')}${kpi('Comida', avg('food') + ' ★')}${kpi('Atención', avg('service') + ' ★')}${kpi('Ambiente', avg('ambience') + ' ★')}</div>
      <div class="grid-2"><div class="card"><h3>Distribución</h3>${barChart(dist, { height: 160 })}</div><div class="card stack"><h3 style="margin:0">Últimos comentarios</h3><ul class="mini-list">${all.filter(r => r.comment).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(r => `<li>${stars(r.stars)} “${escape(r.comment)}” <small class="muted">Mesa ${r.tableNumber}</small></li>`).join('')}</ul></div></div>
      <div data-list></div>`;
    el.addEventListener('change', e => { const s = e.target.closest('[data-pub]'); if (s) { db.update('ratings', s.dataset.pub, { published: s.checked }); db.log('opiniones', `Opinión ${s.checked ? 'publicada' : 'ocultada'}`, ctx.user.id); toast(s.checked ? 'Publicada en la portada' : 'Oculta de la portada', 'success'); } });
    el.addEventListener('click', async e => { const d = e.target.closest('[data-delr]'); if (d && await confirm('¿Eliminar esta opinión?', { danger: true, ok: 'Eliminar' })) { db.remove('ratings', d.dataset.delr); db.log('opiniones', 'Opinión eliminada', ctx.user.id); } });
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('ratings'),
      filters: [{ key: 'stars', label: 'Estrellas', options: [5, 4, 3, 2, 1].map(n => [n, n + '★']) }, { key: 'published', label: 'Publicación', options: [['true', 'Publicadas'], ['false', 'Ocultas']], test: (r, v) => String(!!r.published) === v }],
      search: r => r.comment || '',
      columns: [
        { key: 'createdAt', label: 'Fecha', render: r => fmtDate(r.createdAt) },
        { key: 'tableNumber', label: 'Mesa' },
        { key: 'stars', label: 'General', render: r => stars(r.stars) },
        { key: 'comment', label: 'Comentario', render: r => r.comment ? escape(r.comment) : '<span class="muted">—</span>' },
        { key: 'published', label: 'Publicada', render: r => `<label class="switch"><input type="checkbox" data-pub="${r.id}" ${r.published ? 'checked' : ''} aria-label="Publicar"><span></span></label>` },
        { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost" data-delr="${r.id}" aria-label="Eliminar">🗑</button>` }
      ],
      csv: { name: 'opiniones', map: r => ({ fecha: r.createdAt, mesa: r.tableNumber, general: r.stars, comida: r.food, atencion: r.service, ambiente: r.ambience, comentario: r.comment, publicada: r.published ? 'sí' : 'no' }) }
    });
  }
};
