// Accesorios del configurador.
import { escape, money, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { SEGMENTS, FUELS } from '../shared/domain.js';
import { sw, log, del } from './kit.js';
import { icon } from '../shared/icons.js';

const APPLY = [...Object.entries(SEGMENTS), ['phev', 'Híbrido enchufable']];
const fields = a => [{ name: 'name', label: 'Nombre', required: true, value: a?.name }, { name: 'price', label: 'Precio (CLP)', type: 'number', required: true, value: a?.price ?? 99990 }, { name: 'cat', label: 'Categoría', type: 'select', options: ['Interior', 'Exterior', 'Protección', 'Tecnología', 'Carga', 'Servicio'], value: a?.cat }, { name: 'applies', label: 'Aplica a (segmentos separados por coma; vacío = todos)', value: (a?.applies || []).join(', '), help: 'Valores: ' + APPLY.map(x => x[0]).join(', ') }];
const parse = r => ({ ...r, applies: r.applies.split(',').map(s => s.trim()).filter(s => APPLY.some(x => x[0] === s)) });

export function renderAccessories(v) {
  v.innerHTML = `${pageHead('Accesorios', 'Se ofrecen en el paso "Accesorios" del configurador según segmento o motorización.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo accesorio</button>`)}<div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('accessories'), search: a => a.name + a.cat,
    filters: [{ key: 'cat', label: 'Categoría', options: [...new Set(db.all('accessories').map(a => a.cat))] }],
    columns: [{ key: 'name', label: 'Accesorio', render: a => ({ __raw: true, value: `<b>${escape(a.name)}</b>` }) }, { key: 'cat', label: 'Categoría' }, { key: 'price', label: 'Precio', render: a => money(a.price) },
      { key: 'applies', label: 'Aplica a', sort: false, render: a => a.applies.length ? a.applies.map(x => (SEGMENTS[x] || FUELS[x] || x)).join(', ') : 'Todos' },
      { key: 'active', label: 'Activo', render: a => ({ __raw: true, value: sw('active', a.id, a.active !== false, 'Activo') }) },
      { key: 'x', label: '', sort: false, render: a => ({ __raw: true, value: acts(actBtn('edit', a.id, 'edit', 'Editar'), actBtn('del', a.id, 'trash', 'Eliminar')) }) }],
    onRow: a => edit(a),
    onAction: async (act, id, el) => { const a = db.get('accessories', id); if (act === 'edit') edit(a); if (act === 'del') await del('accessories', id, a.name) && lv.refresh(); if (act === 'active') { db.update('accessories', id, { active: el.checked }); log('accesorio', `${a.name} ${el.checked ? 'activado' : 'desactivado'}`); } },
    csv: { name: 'accesorios.csv', map: a => ({ nombre: a.name, categoria: a.cat, precio: a.price, aplica: a.applies.join('|') }) }
  });
  async function edit(a) { const r = await formModal({ title: a ? 'Editar accesorio' : 'Nuevo accesorio', fields: fields(a) }); if (!r) return; a ? db.update('accessories', a.id, parse(r)) : db.insert('accessories', { ...parse(r), id: 'acc-' + Date.now().toString(36), active: true }); log('accesorio', `${a ? 'Editado' : 'Nuevo'}: ${r.name}`); toast('Guardado', 'success'); lv.refresh(); }
  v.querySelector('[data-new]').onclick = () => edit(null);
}
