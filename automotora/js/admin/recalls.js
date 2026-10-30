// Campañas de seguridad (recall): alcance, avance y vehículos afectados en la base.
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { brand, model } from '../shared/domain.js';
import { sw, log, del, brandOpts } from './kit.js';
import { meter } from '../shared/charts.js';
import { icon } from '../shared/icons.js';

const affected = r => db.count('vehicles', v => v.brandId === r.brand && r.models.includes(v.modelId) && v.year >= r.yearFrom && v.year <= r.yearTo && !(v.recallsDone || []).includes(r.code));
export function renderRecalls(v) {
  v.innerHTML = `${pageHead('Campañas recall', 'El sitio permite consultar por patente o VIN y la cuenta del cliente muestra la alerta.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva campaña</button>`)}<div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('recalls'), search: r => r.code + r.title,
    columns: [{ key: 'code', label: 'Código', render: r => `<b class="mono">${r.code}</b>` }, { key: 'title', label: 'Campaña', render: r => `<b>${escape(r.title)}</b><br><small class="muted">${escape(brand(r.brand)?.name)} ${r.models.map(m => escape(model(m)?.name || m)).join(', ')} ${r.yearFrom}–${r.yearTo}</small>` }, { key: 'risk', label: 'Riesgo', render: r => `<span class="badge badge-${r.risk === 'Alto' ? 'danger' : r.risk === 'Medio' ? 'warning' : 'info'}">${r.risk}</span>` },
      { key: 'done', label: 'Avance país', render: r => `${meter(r.done / Math.max(1, r.affected) * 100)}<small class="muted">${r.done}/${r.affected}</small>` }, { key: 'base', label: 'Pendientes en nuestra base', sort: false, render: r => `<b>${affected(r)}</b>` },
      { key: 'active', label: 'Activa', render: r => ({ __raw: true, value: sw('active', r.id, r.active, 'Activa') }) }, { key: 'x', label: '', sort: false, render: r => ({ __raw: true, value: acts(actBtn('edit', r.id, 'edit', 'Editar'), actBtn('del', r.id, 'trash', 'Eliminar')) }) }],
    onRow: r => edit(r),
    onAction: async (a, id, el) => { const r = db.get('recalls', id); if (a === 'edit') edit(r); if (a === 'del') await del('recalls', id, r.code) && lv.refresh(); if (a === 'active') { db.update('recalls', id, { active: el.checked }); log('recall', `${r.code} ${el.checked ? 'activada' : 'desactivada'}`); } },
    csv: { name: 'recalls.csv', map: r => ({ codigo: r.code, marca: r.brand, modelos: r.models.join('|'), desde: r.yearFrom, hasta: r.yearTo, riesgo: r.risk, avance: r.done + '/' + r.affected, pendientes_base: affected(r) }) }
  });
  async function edit(r) {
    const res = await formModal({ title: r ? 'Editar recall' : 'Nueva campaña recall', size: 'lg', fields: [{ name: 'code', label: 'Código', value: r?.code || `RC-${new Date().getFullYear()}-0${db.count('recalls') + 20}`, required: true }, { name: 'brand', label: 'Marca', type: 'select', options: brandOpts(), value: r?.brand }, { name: 'models', label: 'Modelos (ids separados por coma)', value: (r?.models || []).join(', '), required: true, help: 'Ej: sportage, tucson, hilux' }, { name: 'yearFrom', label: 'Año desde', type: 'number', value: r?.yearFrom || 2023 }, { name: 'yearTo', label: 'Año hasta', type: 'number', value: r?.yearTo || 2025 }, { name: 'title', label: 'Título', value: r?.title, required: true }, { name: 'remedy', label: 'Solución', type: 'textarea', value: r?.remedy }, { name: 'risk', label: 'Riesgo', type: 'select', options: ['Alto', 'Medio', 'Bajo'], value: r?.risk }, { name: 'affected', label: 'Unidades afectadas (país)', type: 'number', value: r?.affected || 100 }] });
    if (!res) return;
    const models = res.models.split(',').map(s => s.trim()).filter(id => db.get('models', id));
    if (!models.length) return toast('Ingresa al menos un id de modelo válido', 'warning');
    if (res.yearTo < res.yearFrom) return toast('Rango de años inválido', 'warning');
    const d = { ...res, models, done: r?.done || 0, active: r?.active ?? true };
    r ? db.update('recalls', r.id, d) : db.insert('recalls', d); log('recall', `${r ? 'Editada' : 'Nueva'} ${d.code}`); toast('Recall guardado', 'success'); lv.refresh();
  }
  v.querySelector('[data-new]').onclick = () => edit(null);
}
