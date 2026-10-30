// Libreta de direcciones del cliente (CRUD).
import { db } from '../data/db.js';
import { html, raw, formModal, confirm, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { COMUNAS } from '../data/geo.js';
import * as ops from '../shared/ops.js';

export function mountDirecciones(el, ctx) {
  const fields = (a = {}) => {
    const P = ops.pricing();
    return [
      { name: 'label', label: 'Etiqueta', required: true, value: a.label, placeholder: 'Casa, Oficina, Bodega…' },
      { name: 'name', label: 'Nombre de contacto', required: true, value: a.name },
      { name: 'phone', label: 'Teléfono', type: 'tel', required: true, value: a.phone },
      { name: 'addr', label: 'Dirección', required: true, value: a.addr },
      { name: 'comuna', label: 'Comuna', type: 'select', options: COMUNAS.filter(c => P.comunaZone[c.n]).map(c => c.n).sort((x, y) => x.localeCompare(y, 'es')), value: a.comuna || 'Providencia' },
      { name: 'isDefault', label: 'Usar como dirección de retiro predeterminada', type: 'checkbox', value: a.isDefault }
    ];
  };
  const setDefault = id => db.query('addresses', a => a.customerId === ctx.customer().id).forEach(a => { if (a.isDefault !== (a.id === id)) db.update('addresses', a.id, { isDefault: a.id === id }); });
  let sig = '';
  const draw = () => {
    const list = db.query('addresses', a => a.customerId === ctx.customer().id);
    const ns = JSON.stringify(list); if (ns === sig) return; sig = ns;
    el.innerHTML = html`${raw(pageHead('Direcciones', 'Tu libreta para retiros y entregas frecuentes.', '<button class="btn btn-primary" data-add>＋ Agregar dirección</button>'))}
      <div class="grid-auto">${list.length ? list.map(a => raw(html`<div class="card stack" style="gap:8px"><div class="row between"><b>${a.label}</b>${a.isDefault ? raw('<span class="badge badge-primary">Predeterminada</span>') : ''}</div>
        <span>${a.name} · ${a.phone}</span><span class="muted">${a.addr}, ${a.comuna}</span>
        <div class="row" style="gap:6px"><button class="btn btn-sm" data-edit="${a.id}">Editar</button>${a.isDefault ? '' : raw(html`<button class="btn btn-sm btn-ghost" data-def="${a.id}">Predeterminar</button>`)}<button class="btn btn-sm btn-ghost" data-del="${a.id}" aria-label="Eliminar">🗑</button></div></div>`)) : raw('<div class="card empty-inline">Aún no tienes direcciones guardadas.</div>')}</div>`;
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add !== undefined) {
      const v = await formModal({ title: 'Nueva dirección', fields: fields() }); if (!v) return;
      const a = db.insert('addresses', { ...v, customerId: ctx.customer().id });
      if (v.isDefault) setDefault(a.id);
      toast('Dirección guardada', 'success');
    } else if (b.dataset.edit) {
      const a = db.get('addresses', b.dataset.edit);
      const v = await formModal({ title: 'Editar dirección', fields: fields(a) }); if (!v) return;
      db.update('addresses', a.id, v); if (v.isDefault) setDefault(a.id);
      toast('Dirección actualizada', 'success');
    } else if (b.dataset.def) { setDefault(b.dataset.def); toast('Dirección predeterminada actualizada', 'success'); }
    else if (b.dataset.del) {
      if (!(await confirm('¿Eliminar esta dirección?', { danger: true, ok: 'Eliminar' }))) return;
      db.remove('addresses', b.dataset.del); toast('Dirección eliminada', 'success');
    }
  });
  draw();
  return { refresh: draw };
}
