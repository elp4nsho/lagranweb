// Códigos promocionales de la productora (reutiliza formularios del admin).
import { db } from '../data/db.js';
import { $, money, formModal, dataTable, date, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { promoFields, savePromo, promoStatus } from '../admin/promos.js';

export function render(el, { org, user }) {
  el.innerHTML = `${pageHead('Códigos promocionales', 'Descuentos para tus eventos', '<button class="btn btn-primary" id="new">+ Nuevo código</button>')}<div id="tbl"></div>`;
  const events = () => db.query('events', e => e.organizerId === org.id && ['publicado', 'pendiente', 'borrador'].includes(e.status));
  const rows = () => db.query('promos', p => p.organizerId === org.id).map(p => ({ ...p, ev: p.eventId ? db.get('events', p.eventId)?.title : 'Todos mis eventos' }));
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.code} ${r.ev}`, empty: 'Aún no creas códigos',
    columns: [
      { key: 'code', label: 'Código', render: r => `<b class="mono">${r.code}</b>` },
      { key: 'value', label: 'Descuento', render: r => (r.type === 'pct' ? `${r.value}%` : money(r.value)) },
      { key: 'ev', label: 'Evento' },
      { key: 'uses', label: 'Usos', render: r => `${r.uses} / ${r.maxUses || '∞'}` },
      { key: 'validUntil', label: 'Vence', render: r => date(r.validUntil) },
      { key: 'active', label: 'Estado', render: r => promoStatus(r) },
      { key: 'id', label: '', sort: false, render: r => `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button></span>` }
    ]
  });
  const edit = async (p = {}) => { const r = await formModal({ title: p.id ? `Editar ${p.code}` : 'Nuevo código', fields: promoFields(p, { events: events(), organizerLocked: true }) }); if (r) savePromo(p, r, user, org.id); };
  el.addEventListener('click', async e => {
    if (e.target.id === 'new') edit();
    const ed = e.target.closest('[data-edit]'); if (ed) edit(db.get('promos', ed.dataset.edit));
    const d = e.target.closest('[data-del]'); if (d && await confirm('¿Eliminar el código?', { danger: true, ok: 'Eliminar' })) { db.remove('promos', d.dataset.del); toast('Código eliminado'); }
  });
  return { update: () => t.update(rows()) };
}
