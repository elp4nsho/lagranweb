// Proveedores: CRUD, evaluación y trabajos asignados.
import { escape, money, toast, confirm } from '../../../assets/core/ui.js';
import { TCATS, CATEGORIES } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';

export function renderProviders(el, p, q, ctx) {
  const { db, user } = ctx;
  const cats = [...new Set([...TCATS, ...CATEGORIES, ...db.all('providers').map(x => x.category)])];
  el.innerHTML = `${pageHead('Proveedores', 'Empresas y técnicos que prestan servicios a la comunidad', '<button class="btn btn-primary" data-new>+ Nuevo proveedor</button>')}<div data-t></div>`;
  const jobs = id => db.query('tickets', t => t.providerId === id);
  const form = x => editForm({ title: x ? 'Editar proveedor' : 'Nuevo proveedor', values: x || { active: true, rating: 4.5, category: cats[0] }, fields: [
    { name: 'name', label: 'Razón social', required: true }, { name: 'rut', label: 'RUT', required: true }, { name: 'category', label: 'Rubro', type: 'select', options: cats },
    { name: 'service', label: 'Servicio', required: true }, { name: 'contact', label: 'Contacto' }, { name: 'phone', label: 'Teléfono' }, { name: 'email', label: 'Correo', type: 'email' },
    { name: 'rating', label: 'Evaluación (1–5)', type: 'number', step: 0.1, min: 1, max: 5 }, { name: 'active', label: 'Activo', type: 'checkbox' }] });
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('providers'), search: x => `${x.name} ${x.rut} ${x.service} ${x.contact}`,
    filters: [{ key: 'category', label: 'Rubro', options: [...new Set(db.all('providers').map(x => x.category))] }, { key: 'active', label: 'Estado', options: [['true', 'Activo'], ['false', 'Inactivo']] }],
    columns: [
      { key: 'name', label: 'Proveedor', render: x => `<b>${escape(x.name)}</b><br><span class="muted small">${escape(x.rut)} · ${escape(x.service)}</span>` },
      { key: 'category', label: 'Rubro' }, { key: 'contact', label: 'Contacto', render: x => `${escape(x.contact || '')}<br><span class="muted small">${escape(x.phone || '')}</span>` },
      { key: 'rating', label: 'Nota', render: x => `★ ${x.rating}` },
      { key: 'jobs', label: 'Trabajos', sort: false, render: x => { const j = jobs(x.id); return `${j.length} <span class="muted small">(${j.filter(t => !['resuelto', 'cerrado'].includes(t.status)).length} abiertos)</span>`; } },
      { key: 'cost', label: 'Facturado', sort: false, render: x => money(jobs(x.id).reduce((s, t) => s + (t.cost || 0), 0)) },
      { key: 'active', label: 'Estado', render: x => `<span class="badge ${x.active ? 'badge-success' : ''}">${x.active ? 'Activo' : 'Inactivo'}</span>` },
      { key: 'id', label: '', sort: false, render: x => `<div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${x.id}">✎</button><button class="btn btn-sm btn-ghost" data-del="${x.id}">🗑</button></div>` }
    ],
    csv: { name: 'proveedores.csv', map: x => ({ nombre: x.name, rut: x.rut, rubro: x.category, servicio: x.service, contacto: x.contact, telefono: x.phone, correo: x.email, nota: x.rating }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await form(); if (r) { db.insert('providers', r); db.log('proveedores', `${user.name} agregó a ${r.name}`, user.id); toast('Proveedor creado', 'success'); tbl.refresh(); } };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { const x = db.get('providers', b.dataset.edit), r = await form(x); if (r) { db.update('providers', x.id, r); toast('Proveedor actualizado', 'success'); tbl.refresh(); } }
    if (b.dataset.del) { const x = db.get('providers', b.dataset.del); if (jobs(x.id).some(t => !['resuelto', 'cerrado'].includes(t.status))) return toast('Tiene trabajos abiertos; desactívalo en su lugar', 'warning'); if (await confirm(`¿Eliminar a ${x.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('providers', x.id); db.log('proveedores', `${user.name} eliminó a ${x.name}`, user.id); toast('Proveedor eliminado', 'success'); tbl.refresh(); } }
  });
}
