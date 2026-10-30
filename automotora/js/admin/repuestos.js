// Catálogo de repuestos/accesorios y solicitudes (repuestos, carrocería, contacto).
import { escape, money, toast, formModal, ago, modal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { sw, log, del } from './kit.js';
import { patenteFormat } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const CATS = ['Filtros', 'Frenos', 'Lubricantes', 'Eléctrico', 'Carrocería', 'Neumáticos', 'Motor', 'Accesorios'];
export function renderParts(v, _p, query) {
  const tab = query.tab || 'catalogo';
  v.innerHTML = `${pageHead('Repuestos y solicitudes', 'Catálogo publicado en Posventa → Repuestos y cotizaciones que llegan desde el sitio.', tab === 'catalogo' ? `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo repuesto</button>` : '')}
  <nav class="tabs"><a class="tab ${tab === 'catalogo' ? 'active' : ''}" href="#/repuestos">Catálogo</a><a class="tab ${tab === 'solicitudes' ? 'active' : ''}" href="#/repuestos?tab=solicitudes">Solicitudes (${db.count('requests', r => r.status === 'nueva')} nuevas)</a></nav><div class="card" data-list></div>`;
  const el = v.querySelector('[data-list]');
  if (tab === 'solicitudes') {
    const lv = listView(el, { rows: () => db.all('requests').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: r => r.name + r.detail,
      filters: [{ key: 'type', label: 'Tipo', options: [['repuestos', 'Repuestos'], ['carroceria', 'Carrocería'], ['contacto', 'Contacto']] }, { key: 'status', label: 'Estado', options: [['nueva', 'Nueva'], ['respondida', 'Respondida']] }],
      columns: [{ key: 'createdAt', label: 'Fecha', render: r => ago(r.createdAt) }, { key: 'type', label: 'Tipo', render: r => `<span class="badge">${escape(r.type)}</span>` }, { key: 'name', label: 'Cliente', render: r => `${escape(r.name)}<br><small class="muted">${escape(r.email || r.phone || '')}</small>` }, { key: 'detail', label: 'Detalle', render: r => `${escape(r.detail)}${r.patente ? ` · <span class="mono">${patenteFormat(r.patente)}</span>` : ''}${r.photos?.length ? `<br><small class="muted">${r.photos.length} foto(s)</small>` : ''}` }, { key: 'total', label: 'Monto ref.', render: r => money(r.total) }, { key: 'status', label: 'Estado', render: r => `<span class="badge badge-${r.status === 'nueva' ? 'warning' : 'success'}">${r.status}</span>` }, { key: 'x', label: '', sort: false, render: r => ({ __raw: true, value: r.status === 'nueva' ? acts(actBtn('answer', r.id, 'mail', 'Responder')) : '' }) }],
      onAction: async (a, id) => { const r = db.get('requests', id); const res = await formModal({ title: `Responder a ${r.name}`, submit: 'Enviar respuesta', fields: [{ name: 'total', label: 'Monto cotizado', type: 'number', value: r.total }, { name: 'answer', label: 'Mensaje', type: 'textarea', value: `Hola ${r.name.split(' ')[0]}, adjuntamos la cotización. Disponible en 48 horas.` }] }); if (!res) return; db.update('requests', id, { status: 'respondida', total: res.total, answer: res.answer }); log('solicitud', `Respondida a ${r.name}`); toast('Respuesta enviada (simulada)', 'success'); lv.refresh(); },
      csv: { name: 'solicitudes.csv', map: r => ({ fecha: r.createdAt.slice(0, 10), tipo: r.type, cliente: r.name, detalle: r.detail, monto: r.total, estado: r.status }) } });
    return;
  }
  const lv = listView(el, { rows: () => db.all('parts'), search: p => p.sku + p.name, pageSize: 15,
    filters: [{ key: 'cat', label: 'Categoría', options: CATS }, { key: 'stock', label: 'Stock', options: [['0', 'Sin stock'], ['low', 'Bajo (≤5)']], test: (p, v) => v === '0' ? p.stock === 0 : p.stock <= 5 }],
    columns: [{ key: 'sku', label: 'SKU', render: p => `<span class="mono">${p.sku}</span>` }, { key: 'name', label: 'Repuesto', render: p => `<b>${escape(p.name)}</b>` }, { key: 'cat', label: 'Categoría' }, { key: 'price', label: 'Precio', render: p => money(p.price) },
      { key: 'stock', label: 'Stock', render: p => ({ __raw: true, value: `<input class="input inline-edit" type="number" min="0" value="${p.stock}" data-act-change="stock" data-id="${p.id}" aria-label="Stock" style="max-width:90px">` }) },
      { key: 'active', label: 'Publicado', render: p => ({ __raw: true, value: sw('active', p.id, p.active !== false, 'Publicado') }) }, { key: 'x', label: '', sort: false, render: p => ({ __raw: true, value: acts(actBtn('edit', p.id, 'edit', 'Editar'), actBtn('del', p.id, 'trash', 'Eliminar')) }) }],
    onRow: p => edit(p),
    onAction: async (a, id, el2) => { const p = db.get('parts', id); if (a === 'edit') edit(p); if (a === 'del') await del('parts', id, p.name) && lv.refresh(); if (a === 'stock') { const n = Math.max(0, +el2.value || 0); db.update('parts', id, { stock: n }); log('repuestos', `${p.sku} stock ${n}`); toast('Stock actualizado', 'success', 1200); } if (a === 'active') db.update('parts', id, { active: el2.checked }); },
    csv: { name: 'repuestos.csv', map: p => ({ sku: p.sku, nombre: p.name, categoria: p.cat, precio: p.price, stock: p.stock }) } });
  async function edit(p) { const r = await formModal({ title: p ? 'Editar repuesto' : 'Nuevo repuesto', fields: [{ name: 'sku', label: 'SKU', value: p?.sku || 'AP-' + (2000 + db.count('parts')), required: true }, { name: 'name', label: 'Nombre', value: p?.name, required: true }, { name: 'cat', label: 'Categoría', type: 'select', options: CATS, value: p?.cat }, { name: 'price', label: 'Precio', type: 'number', value: p?.price || 19990, required: true }, { name: 'stock', label: 'Stock', type: 'number', value: p?.stock ?? 10 }] }); if (!r) return; if (r.price <= 0) return toast('Precio inválido', 'warning'); p ? db.update('parts', p.id, r) : db.insert('parts', { ...r, active: true }); log('repuestos', `${p ? 'Editado' : 'Nuevo'} ${r.name}`); toast('Guardado', 'success'); lv.refresh(); }
  v.querySelector('[data-new]').onclick = () => edit(null);
}
export { modal };
