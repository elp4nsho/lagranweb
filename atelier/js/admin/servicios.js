// Menú de servicios (performance, estética, EV, diagnóstico): CRUD, precios, destacados y visibilidad.
import { escape, money, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { LINES } from '../data/catalog.js';

async function edit(s, ctx) {
  const v = await formModal({ title: s ? `Editar · ${s.name}` : 'Nuevo servicio', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'line', label: 'Línea', type: 'select', options: Object.entries(LINES).filter(([k]) => k !== 'mantencion').map(([k, l]) => [k, l.label]), value: s?.line },
    { name: 'icon', label: 'Ícono (emoji)', value: s?.icon || '🔧' }, { name: 'price', label: 'Precio (CLP, IVA incl.)', type: 'number', required: true, value: s?.price },
    { name: 'priceFrom', label: 'Mostrar como "desde"', type: 'checkbox', value: s?.priceFrom }, { name: 'hours', label: 'Horas estimadas', type: 'number', step: '0.5', value: s?.hours || 2 },
    { name: 'desc', label: 'Descripción', type: 'textarea', value: s?.desc }, { name: 'includes', label: 'Incluye (una línea por ítem)', type: 'textarea', value: (s?.includes || []).join('\n') },
    { name: 'featured', label: 'Destacado en portada', type: 'checkbox', value: s?.featured }, { name: 'active', label: 'Activo (visible y agendable)', type: 'checkbox', value: s ? s.active : true }] });
  if (!v) return;
  if (!(v.price > 0)) { toast('El precio debe ser mayor a 0', 'warning'); return; }
  const data = { ...v, includes: v.includes.split('\n').map(x => x.trim()).filter(Boolean) };
  if (s) db.update('services', s.id, data); else db.insert('services', { ...data, order: db.count('services') });
  db.log('servicios', `${s ? 'Servicio editado' : 'Servicio creado'}: ${v.name} (${money(v.price)})`, ctx.user.id); toast('Servicio guardado', 'success');
}
export default {
  id: 'servicios', label: 'Menú de servicios', icon: '🏁', group: 'Catálogo', roles: ['admin', 'gerente'],
  watch: ['services'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Menú de servicios', 'Precios y contenido de cada servicio publicado en el sitio')}<div data-t></div>`;
    el.addEventListener('change', e => {
      const t = e.target.closest('[data-flag]'); if (!t) return;
      const [id, k] = t.dataset.flag.split('|'); db.update('services', id, { [k]: t.checked });
      db.log('servicios', `${db.get('services', id).name}: ${k === 'active' ? (t.checked ? 'activado' : 'desactivado') : (t.checked ? 'destacado' : 'sin destacar')}`, ctx.user.id); toast('Actualizado en el sitio', 'success');
    });
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) edit(null, ctx);
      const d = e.target.closest('[data-del]');
      if (d) { const s = db.get('services', d.dataset.del); if (await confirm(`¿Eliminar ${s.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('services', s.id); db.log('servicios', `Servicio eliminado: ${s.name}`, ctx.user.id); toast('Eliminado', 'success'); } }
    });
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('services'),
      filters: [{ key: 'line', label: 'Línea', options: Object.entries(LINES).filter(([k]) => k !== 'mantencion').map(([k, l]) => [k, l.short]) }, { key: 'active', label: 'Estado', options: [['true', 'Activos'], ['false', 'Inactivos']], test: (r, v) => String(!!r.active) === v }],
      search: r => `${r.name} ${r.desc}`,
      columns: [
        { key: 'name', label: 'Servicio', render: r => `<span class="row nowrap" style="gap:8px"><span aria-hidden="true">${escape(r.icon)}</span><b>${escape(r.name)}</b></span>` },
        { key: 'line', label: 'Línea', render: r => escape(LINES[r.line]?.short || r.line) },
        { key: 'price', label: 'Precio', render: r => `${r.priceFrom ? 'desde ' : ''}${money(r.price)}` },
        { key: 'hours', label: 'Horas', render: r => r.hours + ' h' },
        { key: 'featured', label: 'Destacado', render: r => `<label class="switch"><input type="checkbox" data-flag="${r.id}|featured" ${r.featured ? 'checked' : ''} aria-label="Destacado"><span></span></label>` },
        { key: 'active', label: 'Activo', render: r => `<label class="switch"><input type="checkbox" data-flag="${r.id}|active" ${r.active ? 'checked' : ''} aria-label="Activo"><span></span></label>` },
        { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>` }
      ],
      onRow: r => edit(db.get('services', r.id), ctx),
      actions: '<button class="btn btn-sm btn-primary" data-new>+ Servicio</button>',
      csv: { name: 'servicios', map: r => ({ servicio: r.name, linea: r.line, precio: r.price, horas: r.hours, activo: r.active ? 'sí' : 'no' }) }
    });
  }
};
