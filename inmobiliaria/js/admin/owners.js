// Propietarios: CRUD y cartera de propiedades por propietario.
import { escape, confirm, toast, date, modal } from '../../../assets/core/ui.js';
import { PSTATUS, badge, mainPrice } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';

export function renderOwners(el, p, q, ctx) {
  const { db, user } = ctx;
  el.innerHTML = `${pageHead('Propietarios', 'Mandantes de venta y arriendo', '<button class="btn btn-primary" data-new>+ Nuevo propietario</button>')}<div data-t></div>`;
  const form = o => editForm({ title: o ? 'Editar propietario' : 'Nuevo propietario', size: '', values: o || {}, fields: [
    { name: 'name', label: 'Nombre', required: true, full: true }, { name: 'rut', label: 'RUT', required: true }, { name: 'phone', label: 'Teléfono' },
    { name: 'email', label: 'Correo', type: 'email', required: true, full: true }, { name: 'notes', label: 'Notas', type: 'textarea', full: true }] });
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('owners'), search: o => `${o.name} ${o.rut} ${o.email}`,
    filters: [{ key: 'account', label: 'Cuenta web', options: [['si', 'Con cuenta'], ['no', 'Sin cuenta']], fn: (o, v) => (v === 'si') === !!o.userId }],
    columns: [
      { key: 'name', label: 'Propietario', render: o => `<b>${escape(o.name)}</b><br><span class="muted small">${escape(o.rut || '')}</span>` },
      { key: 'email', label: 'Contacto', render: o => `${escape(o.email)}<br><span class="muted small">${escape(o.phone || '')}</span>` },
      { key: 'props', label: 'Propiedades', sort: false, render: o => db.count('properties', x => x.ownerId === o.id) },
      { key: 'contracts', label: 'Arriendos vigentes', sort: false, render: o => db.count('contracts', c => c.ownerId === o.id && c.status === 'vigente') },
      { key: 'userId', label: 'Cuenta web', render: o => o.userId ? '<span class="badge badge-success">Sí</span>' : '<span class="badge">No</span>' },
      { key: 'createdAt', label: 'Desde', render: o => `<span class="small">${date(o.createdAt)}</span>` },
      { key: 'id', label: '', sort: false, render: o => `<div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${o.id}">✎</button><button class="btn btn-sm btn-ghost" data-del="${o.id}">🗑</button></div>` }
    ],
    onRow: o => {
      const props = db.query('properties', x => x.ownerId === o.id);
      modal({ title: o.name, size: 'lg', body: `<p class="muted">${escape(o.rut || '')} · ${escape(o.email)} · ${escape(o.phone || '')}</p>${o.notes ? `<div class="note">${escape(o.notes)}</div>` : ''}
        <h4>Propiedades (${props.length})</h4>${props.map(x => `<div class="list-row"><a href="#/propiedades/${x.id}">${escape(x.code)} · ${escape(x.title)}</a><span class="row" style="gap:8px"><b>${mainPrice(x)}</b>${badge(PSTATUS, x.status)}</span></div>`).join('') || '<p class="muted">Sin propiedades.</p>'}` });
    },
    csv: { name: 'propietarios.csv', map: o => ({ nombre: o.name, rut: o.rut, correo: o.email, telefono: o.phone, propiedades: db.count('properties', x => x.ownerId === o.id) }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await form(); if (r) { db.insert('owners', { ...r, userId: db.find('users', u => u.email.toLowerCase() === r.email.toLowerCase())?.id || null }); db.log('propietario', `${user.name} agregó a ${r.name}`, user.id); toast('Propietario creado', 'success'); tbl.refresh(); } };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { const o = db.get('owners', b.dataset.edit); const r = await form(o); if (r) { db.update('owners', o.id, r); toast('Propietario actualizado', 'success'); tbl.refresh(); } }
    if (b.dataset.del) {
      const o = db.get('owners', b.dataset.del);
      if (db.count('properties', x => x.ownerId === o.id)) return toast('No se puede eliminar: tiene propiedades asociadas', 'warning');
      if (await confirm(`¿Eliminar a ${o.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('owners', o.id); db.log('propietario', `${user.name} eliminó a ${o.name}`, user.id); toast('Propietario eliminado', 'success'); tbl.refresh(); }
    }
  });
}
