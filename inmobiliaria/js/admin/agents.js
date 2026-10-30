// Corredores y oficinas: CRUD, desempeño y vínculo con cuentas de usuario.
import { escape, confirm, toast, pct } from '../../../assets/core/ui.js';
import { comunaName, COMUNAS } from '../shared/geo.js';
import { pageHead, crudTable, editForm, avatar } from '../shared/kit.js';

export function renderAgents(el, p, query, ctx) {
  const { db, user } = ctx;
  const tab = query.tab === 'oficinas' ? 'oficinas' : 'corredores';
  el.innerHTML = `${pageHead('Corredores y oficinas', 'Equipo comercial, cartera y desempeño', `<button class="btn btn-primary" data-new>+ ${tab === 'oficinas' ? 'Nueva oficina' : 'Nuevo corredor'}</button>`)}
    <div class="tabs"><a class="tab ${tab === 'corredores' ? 'active' : ''}" href="#/agentes">Corredores</a><a class="tab ${tab === 'oficinas' ? 'active' : ''}" href="#/agentes?tab=oficinas">Oficinas</a></div><div data-t></div>`;
  const offices = db.all('offices');
  const stats = a => {
    const leads = db.query('leads', l => l.agentId === a.id), closed = leads.filter(l => ['ganado', 'perdido'].includes(l.status)), won = leads.filter(l => l.status === 'ganado').length;
    return { listings: db.count('properties', x => x.agentId === a.id && ['publicada', 'reservada'].includes(x.status)), open: leads.filter(l => !['ganado', 'perdido'].includes(l.status)).length, conv: closed.length ? won / closed.length * 100 : 0, won };
  };
  if (tab === 'corredores') {
    crudTable(el.querySelector('[data-t]'), {
      rows: () => db.all('agents'), search: a => `${a.name} ${a.email}`,
      filters: [{ key: 'officeId', label: 'Oficina', options: offices.map(o => [o.id, o.name]) }, { key: 'active', label: 'Estado', options: [['true', 'Activo'], ['false', 'Inactivo']] }],
      columns: [
        { key: 'name', label: 'Corredor', render: a => `<div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(a.name, a.color)}<div><b>${escape(a.name)}</b><br><span class="muted small">${escape(a.email)}</span></div></div>` },
        { key: 'officeId', label: 'Oficina', render: a => escape(offices.find(o => o.id === a.officeId)?.name || '—') },
        { key: 'rating', label: 'Nota', render: a => `★ ${a.rating}` },
        { key: 'listings', label: 'Cartera activa', sort: false, render: a => stats(a).listings },
        { key: 'open', label: 'Leads abiertos', sort: false, render: a => stats(a).open },
        { key: 'conv', label: 'Conversión', sort: false, render: a => `${pct(stats(a).conv)} <span class="muted small">(${stats(a).won})</span>` },
        { key: 'active', label: 'Estado', render: a => `<span class="badge ${a.active ? 'badge-success' : ''}">${a.active ? 'Activo' : 'Inactivo'}</span>` },
        { key: 'id', label: '', sort: false, render: a => `<div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${a.id}">✎</button><button class="btn btn-sm btn-ghost" data-del="${a.id}">🗑</button></div>` }
      ],
      csv: { name: 'corredores.csv', map: a => ({ nombre: a.name, correo: a.email, telefono: a.phone, oficina: offices.find(o => o.id === a.officeId)?.name, cartera: stats(a).listings, leads_abiertos: stats(a).open, conversion: stats(a).conv.toFixed(1) }) }
    });
  } else {
    crudTable(el.querySelector('[data-t]'), {
      rows: () => db.all('offices'), search: o => `${o.name} ${o.address}`,
      columns: [
        { key: 'name', label: 'Oficina', render: o => `<b>${escape(o.name)}</b><br><span class="muted small">${escape(o.address)}</span>` },
        { key: 'comuna', label: 'Comuna', render: o => escape(comunaName(o.comuna)) },
        { key: 'phone', label: 'Teléfono' },
        { key: 'agents', label: 'Corredores', sort: false, render: o => db.count('agents', a => a.officeId === o.id && a.active) },
        { key: 'listings', label: 'Propiedades activas', sort: false, render: o => db.count('properties', x => ['publicada', 'reservada'].includes(x.status) && db.get('agents', x.agentId)?.officeId === o.id) },
        { key: 'id', label: '', sort: false, render: o => `<div class="actions"><button class="btn btn-sm btn-ghost" data-oedit="${o.id}">✎</button><button class="btn btn-sm btn-ghost" data-odel="${o.id}">🗑</button></div>` }
      ],
      csv: { name: 'oficinas.csv', map: o => ({ nombre: o.name, direccion: o.address, comuna: comunaName(o.comuna), telefono: o.phone }) }
    });
  }
  const agentForm = a => editForm({ title: a ? 'Editar corredor' : 'Nuevo corredor', values: a || { active: true, rating: 4.5, officeId: offices[0]?.id, color: '#1e4db7' }, fields: [
    { name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' },
    { name: 'officeId', label: 'Oficina', type: 'select', options: offices.map(o => [o.id, o.name]) }, { name: 'rating', label: 'Nota (1-5)', type: 'number', step: 0.1, min: 1, max: 5 },
    { name: 'color', label: 'Color', type: 'color' }, { name: 'bio', label: 'Presentación', type: 'textarea', full: true }, { name: 'active', label: 'Activo (recibe leads)', type: 'checkbox' },
    ...(a ? [] : [{ name: 'createUser', label: 'Crear cuenta de acceso a la app de corredores (clave: corredor123)', type: 'checkbox', full: true, value: true }])] });
  const officeForm = o => editForm({ title: o ? 'Editar oficina' : 'Nueva oficina', size: '', values: o || { comuna: 'providencia' }, fields: [
    { name: 'name', label: 'Nombre', required: true, full: true }, { name: 'address', label: 'Dirección', required: true, full: true }, { name: 'comuna', label: 'Comuna', type: 'select', options: COMUNAS.map(c => [c.id, c.name]) }, { name: 'phone', label: 'Teléfono' }] });
  el.querySelector('[data-new]').onclick = async () => {
    if (tab === 'oficinas') { const r = await officeForm(); if (r) { db.insert('offices', r); db.log('oficina', `${user.name} creó ${r.name}`, user.id); toast('Oficina creada', 'success'); ctx.refresh(); } return; }
    const r = await agentForm(); if (!r) return;
    const { createUser, ...data } = r;
    const ag = db.insert('agents', data);
    if (createUser) {
      if (db.find('users', u => u.email.toLowerCase() === data.email.toLowerCase())) toast('Ya existe un usuario con ese correo; no se creó la cuenta', 'warning');
      else { const u = db.insert('users', { name: data.name, email: data.email, password: 'corredor123', role: 'corredor', color: data.color, active: true, phone: data.phone }); db.update('agents', ag.id, { userId: u.id }); }
    }
    db.log('corredor', `${user.name} agregó a ${data.name}`, user.id); toast('Corredor creado', 'success'); ctx.refresh();
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { const a = db.get('agents', b.dataset.edit); const r = await agentForm(a); if (r) { db.update('agents', a.id, r); if (a.userId) db.update('users', a.userId, { name: r.name, active: r.active ? db.get('users', a.userId)?.active : false }); db.log('corredor', `${user.name} editó a ${r.name}`, user.id); toast('Corredor actualizado', 'success'); ctx.refresh(); } }
    if (b.dataset.del) {
      const a = db.get('agents', b.dataset.del), n = db.count('properties', x => x.agentId === a.id);
      if (n) return toast(`${a.name} tiene ${n} propiedades. Reasígnalas o desactívalo.`, 'warning', 4500);
      if (await confirm(`¿Eliminar a ${a.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('agents', a.id); db.log('corredor', `${user.name} eliminó a ${a.name}`, user.id); toast('Corredor eliminado', 'success'); ctx.refresh(); }
    }
    if (b.dataset.oedit) { const o = db.get('offices', b.dataset.oedit); const r = await officeForm(o); if (r) { db.update('offices', o.id, r); toast('Oficina actualizada', 'success'); ctx.refresh(); } }
    if (b.dataset.odel) {
      const o = db.get('offices', b.dataset.odel);
      if (db.count('agents', a => a.officeId === o.id)) return toast('La oficina tiene corredores asignados', 'warning');
      if (await confirm(`¿Eliminar ${o.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('offices', o.id); db.log('oficina', `${user.name} eliminó ${o.name}`, user.id); toast('Oficina eliminada', 'success'); ctx.refresh(); }
    }
  });
}
