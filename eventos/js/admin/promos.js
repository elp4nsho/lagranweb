// Códigos promocionales: CRUD, activación, usos y vigencia.
import { db } from '../data/db.js';
import { html, raw, $, money, toast, confirm, formModal, dataTable, date } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV } from '../shared/admin-kit.js';

export function promoFields(p = {}, { events, organizerLocked } = {}) {
  return [
    { name: 'code', label: 'Código', required: true, value: p.code, placeholder: 'VERANO20' },
    { name: 'type', label: 'Tipo de descuento', type: 'select', options: [['pct', 'Porcentaje (%)'], ['fixed', 'Monto fijo ($)']], value: p.type || 'pct' },
    { name: 'value', label: 'Valor', type: 'number', required: true, value: p.value ?? 10 },
    { name: 'eventId', label: 'Evento', type: 'select', options: [[organizerLocked ? '' : '', organizerLocked ? 'Todos mis eventos' : 'Todos los eventos'], ...events.map(e => [e.id, e.title])], value: p.eventId || '' },
    { name: 'maxUses', label: 'Usos máximos', type: 'number', value: p.maxUses ?? 100 },
    { name: 'validUntil', label: 'Válido hasta', type: 'date', value: (p.validUntil || new Date(Date.now() + 30 * 864e5).toISOString()).slice(0, 10) },
    { name: 'active', label: 'Activo', type: 'checkbox', value: p.active !== false }
  ];
}
export function savePromo(p, r, user, organizerId = '') {
  r.code = r.code.toUpperCase().replace(/\s+/g, '');
  if (db.find('promos', x => x.code === r.code && x.id !== p.id)) { toast('Ese código ya existe', 'error'); return false; }
  if (!(r.value > 0) || (r.type === 'pct' && r.value > 100)) { toast('Valor de descuento inválido', 'error'); return false; }
  r.validUntil = new Date(r.validUntil + 'T23:59').toISOString();
  r.organizerId = r.eventId ? db.get('events', r.eventId).organizerId : organizerId;
  if (p.id) db.update('promos', p.id, r); else db.insert('promos', { ...r, uses: 0 });
  db.log(p.id ? 'promo editada' : 'promo creada', r.code, user.id);
  toast('Código guardado', 'success');
  return true;
}
export const promoStatus = p => (!p.active ? '<span class="badge">Inactivo</span>' : Date.parse(p.validUntil) < Date.now() ? '<span class="badge badge-danger">Vencido</span>' : p.maxUses && p.uses >= p.maxUses ? '<span class="badge badge-warning">Agotado</span>' : '<span class="badge badge-success">Vigente</span>');

export function render(el, { user }) {
  el.innerHTML = `${pageHead('Códigos promocionales', 'Descuentos globales o por evento', `${csvButton()}<button class="btn btn-primary" id="new">+ Nuevo código</button>`)}<div id="tbl"></div>`;
  const events = () => db.query('events', e => ['publicado', 'pendiente'].includes(e.status));
  const rows = () => db.all('promos').map(p => ({ ...p, ev: p.eventId ? db.get('events', p.eventId)?.title || '—' : 'Todos', org: p.organizerId ? db.get('organizers', p.organizerId)?.name : 'Plataforma' }));
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.code} ${r.ev} ${r.org}`,
    columns: [
      { key: 'code', label: 'Código', render: r => `<b class="mono">${r.code}</b>` },
      { key: 'value', label: 'Descuento', render: r => (r.type === 'pct' ? `${r.value}%` : money(r.value)) },
      { key: 'ev', label: 'Aplica a', render: r => html`${r.ev}<br><small class="muted">${r.org}</small>` },
      { key: 'uses', label: 'Usos', render: r => `${r.uses} / ${r.maxUses || '∞'}<div class="progress" style="width:80px"><i style="--v:${r.maxUses ? Math.min(100, r.uses / r.maxUses * 100) : 0}%"></i></div>` },
      { key: 'validUntil', label: 'Vence', render: r => date(r.validUntil) },
      { key: 'active', label: 'Estado', render: r => promoStatus(r) },
      { key: 'id', label: '', sort: false, render: r => `<span class="row" style="gap:4px;flex-wrap:nowrap"><label class="switch" title="Activar/desactivar"><input type="checkbox" data-tog="${r.id}" ${r.active ? 'checked' : ''}><span></span></label><button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button></span>` }
    ]
  });
  const edit = async (p = {}) => { const r = await formModal({ title: p.id ? `Editar ${p.code}` : 'Nuevo código', fields: promoFields(p, { events: events() }) }); if (r) savePromo(p, r, user); };
  el.addEventListener('click', async e => {
    if (e.target.id === 'new') edit();
    const ed = e.target.closest('[data-edit]'); if (ed) edit(db.get('promos', ed.dataset.edit));
    const del = e.target.closest('[data-del]');
    if (del) { const p = db.get('promos', del.dataset.del); if (await confirm(`¿Eliminar el código ${p.code}?`, { danger: true, ok: 'Eliminar' })) { db.remove('promos', p.id); db.log('promo eliminada', p.code, user.id); toast('Código eliminado'); } }
  });
  el.addEventListener('change', e => { const tg = e.target.closest('[data-tog]'); if (tg) { const p = db.update('promos', tg.dataset.tog, { active: tg.checked }); toast(`${p.code} ${p.active ? 'activado' : 'desactivado'}`); } });
  wireCSV(el, 'promos.csv', () => rows().map(r => ({ codigo: r.code, tipo: r.type, valor: r.value, evento: r.ev, usos: r.uses, maximo: r.maxUses, vence: r.validUntil, activo: r.active })));
  return { update: () => t.update(rows()) };
}
void raw;
