// Moderación de reseñas: aprobar, rechazar, destacar, responder y eliminar.
import { db, colorByKey, rating } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, date, toast, confirm, formModal, num } from '../../../assets/core/ui.js';
import { stars } from '../public/common.js';

const ST = { pendiente: ['Pendiente', 'warning'], aprobada: ['Aprobada', 'success'], rechazada: ['Rechazada', 'danger'] };

export default {
  id: 'resenas', label: 'Reseñas', ico: '⭐', group: 'Ventas', roles: ['admin', 'soporte', 'marketing'],
  count: () => db.count('reviews', r => r.status === 'pendiente'),
  render(view, ctx) {
    const rows = db.all('reviews');
    const r = rating();
    view.innerHTML = `${pageHead('Reseñas', 'Solo las reseñas aprobadas aparecen en la landing (las destacadas, primero).', '<button class="btn btn-primary" data-new>＋ Agregar reseña</button>')}
      <div class="kpis">
        ${kpi('Promedio publicado', r.avg.toFixed(2).replace('.', ',') + ' ★', { ico: '⭐', sub: `${r.count} aprobadas` })}
        ${kpi('Pendientes', num(rows.filter(x => x.status === 'pendiente').length), { ico: '⏳' })}
        ${kpi('Verificadas', num(rows.filter(x => x.verified).length), { ico: '✅' })}
        ${kpi('Rechazadas', num(rows.filter(x => x.status === 'rechazada').length), { ico: '🚫' })}
      </div>
      <div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'reviews', rows, pageSize: 10, sort: { key: 'createdAt', dir: -1 },
      search: x => `${x.name} ${x.title} ${x.text} ${x.city} ${x.orderNumber}`,
      filters: [
        { key: 'status', label: 'Estado', options: Object.entries(ST).map(([k, v]) => [k, v[0]]) },
        { key: 'rating', label: 'Estrellas', options: [5, 4, 3, 2, 1].map(n => [String(n), n + '★']) },
        { key: 'verified', label: 'Tipo', options: [['true', 'Verificada'], ['false', 'No verificada']] }
      ],
      columns: [
        { key: 'rating', label: 'Nota', render: x => stars(x.rating) },
        { key: 'title', label: 'Reseña', render: x => `<b>${escape(x.title)}</b>${x.featured ? ' <span class="badge badge-primary plain">Destacada</span>' : ''}<br><span class="small muted">${escape(x.text.length > 110 ? x.text.slice(0, 110) + '…' : x.text)}</span>${x.reply ? `<br><span class="small">↳ <i>${escape(x.reply)}</i></span>` : ''}` },
        { key: 'name', label: 'Autor', render: x => `${escape(x.name)}<br><small class="muted">${escape(x.city || '')}${x.verified ? ' · ✓ ' + escape(x.orderNumber) : ''}</small>` },
        { key: 'color', label: 'Color', render: x => { const c = colorByKey(x.color); return c ? `<span class="row" style="gap:6px;flex-wrap:nowrap"><i class="sw" style="--sw:${c.base}"></i>${escape(c.name)}</span>` : ''; } },
        { key: 'createdAt', label: 'Fecha', render: x => escape(date(x.createdAt)) },
        { key: 'status', label: 'Estado', render: x => badge(...ST[x.status]) },
        { key: 'act', label: '', sort: false, render: x => `<div class="t-actions">
          ${x.status !== 'aprobada' ? `<button class="btn btn-sm" data-st="aprobada" data-id="${x.id}">✓ Aprobar</button>` : `<button class="btn btn-sm" data-feat="${x.id}">${x.featured ? '☆ Quitar' : '★ Destacar'}</button>`}
          ${x.status !== 'rechazada' ? `<button class="btn btn-sm btn-ghost" data-st="rechazada" data-id="${x.id}">Rechazar</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-reply="${x.id}" title="Responder">↩</button>
          <button class="btn btn-sm btn-ghost" data-del="${x.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'resenas-aquilo.csv', map: x => ({ fecha: x.createdAt.slice(0, 10), autor: x.name, ciudad: x.city, nota: x.rating, titulo: x.title, texto: x.text, estado: x.status, verificada: x.verified ? 'sí' : 'no', pedido: x.orderNumber }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.st) { const x = db.update('reviews', t.dataset.id, { status: t.dataset.st }); db.log(`Reseña ${t.dataset.st}`, `${x.name}: «${x.title}»`, ctx.user.id); toast(`Reseña ${t.dataset.st}`, t.dataset.st === 'aprobada' ? 'success' : 'warning'); }
      if (t.dataset.feat) { const x = db.get('reviews', t.dataset.feat); db.update('reviews', x.id, { featured: !x.featured }); toast(x.featured ? 'Ya no es destacada' : 'Reseña destacada en la landing', 'success'); }
      if (t.dataset.reply) {
        const x = db.get('reviews', t.dataset.reply);
        const v = await formModal({ title: 'Responder reseña', fields: [{ name: 'reply', label: `Respuesta pública a ${x.name}`, type: 'textarea', value: x.reply || '' }] });
        if (v) { db.update('reviews', x.id, { reply: v.reply }); toast('Respuesta guardada', 'success'); }
      }
      if (t.dataset.del && await confirm('¿Eliminar esta reseña?', { danger: true, ok: 'Eliminar' })) { db.remove('reviews', t.dataset.del); db.log('Reseña eliminada', '', ctx.user.id); toast('Reseña eliminada', 'success'); }
      if (t.matches('[data-new]')) {
        const v = await formModal({ title: 'Agregar reseña', fields: [
          { name: 'name', label: 'Autor', required: true }, { name: 'city', label: 'Ciudad' },
          { name: 'rating', label: 'Estrellas', type: 'select', options: ['5', '4', '3', '2', '1'] },
          { name: 'title', label: 'Título', required: true }, { name: 'text', label: 'Texto', type: 'textarea', required: true },
          { name: 'approve', label: 'Publicar de inmediato', type: 'checkbox', value: true }
        ] });
        if (!v) return;
        db.insert('reviews', { name: v.name, city: v.city, rating: +v.rating, title: v.title, text: v.text, color: 'glaciar', orderNumber: '', verified: false, status: v.approve ? 'aprobada' : 'pendiente', featured: false });
        db.log('Reseña creada', v.title, ctx.user.id); toast('Reseña agregada', 'success');
      }
    };
  }
};
