// Unidades (torres/pisos/deptos con alícuota) y residentes: CRUD, ficha de unidad y recálculo de alícuotas.
import { escape, money, toast, confirm, modal, date } from '../../../assets/core/ui.js';
import { settings, unitDebt, unitName, residentsOf } from '../data/db.js';
import { periodLabel } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';

export function renderUnits(el, p, query, ctx) {
  const { db, user } = ctx;
  const tab = query.tab === 'residentes' ? 'residentes' : 'unidades';
  const sumAlic = db.all('units').reduce((t, u) => t + u.alicuota, 0);
  el.innerHTML = `${pageHead('Unidades y residentes', `${db.count('units')} unidades · ${db.count('residents')} residentes · suma de alícuotas ${sumAlic.toLocaleString('es-CL', { maximumFractionDigits: 3 })}%`, `${tab === 'unidades' ? '<button class="btn" data-recalc>↻ Recalcular alícuotas</button>' : ''}<button class="btn btn-primary" data-new>+ ${tab === 'unidades' ? 'Nueva unidad' : 'Nuevo residente'}</button>`)}
    <div class="tabs"><a class="tab ${tab === 'unidades' ? 'active' : ''}" href="#/unidades">Unidades</a><a class="tab ${tab === 'residentes' ? 'active' : ''}" href="#/unidades?tab=residentes">Residentes</a></div><div data-t></div>`;
  const unitOpts = () => db.all('units').map(u => [u.id, `${u.tower}-${u.number}`]);
  const uForm = u => editForm({ title: u ? `Editar ${unitName(u.id)}` : 'Nueva unidad', values: u || { tower: 'A', floor: 1, m2: 60, parking: 1, storage: 1, occupancy: 'propietario', active: true }, fields: [
    { name: 'tower', label: 'Torre', type: 'select', options: ['A', 'B'] }, { name: 'number', label: 'Número', required: true, placeholder: '305' }, { name: 'floor', label: 'Piso', type: 'number', min: 1, required: true },
    { name: 'm2', label: 'Superficie (m²)', type: 'number', step: 0.1, min: 10, required: true }, { name: 'parking', label: 'Estacionamientos', type: 'number', min: 0 }, { name: 'storage', label: 'Bodegas', type: 'number', min: 0 },
    { name: 'alicuota', label: 'Alícuota (%)', type: 'number', step: 0.0001, min: 0, help: 'Usa «Recalcular alícuotas» para derivarla de la superficie' }, { name: 'ownerName', label: 'Propietario', required: true },
    { name: 'occupancy', label: 'Ocupación', type: 'select', options: [['propietario', 'Propietario'], ['arrendatario', 'Arrendada']] }, { name: 'active', label: 'Activa (participa del prorrateo)', type: 'checkbox' }] });
  const rForm = r => editForm({ title: r ? 'Editar residente' : 'Nuevo residente', values: r ? { ...r, vehicles: r.vehicles.join(', ') } : { type: 'residente', unitId: db.all('units')[0].id }, fields: [
    { name: 'name', label: 'Nombre', required: true }, { name: 'rut', label: 'RUT', required: true }, { name: 'unitId', label: 'Unidad', type: 'select', options: unitOpts() },
    { name: 'type', label: 'Tipo', type: 'select', options: [['propietario', 'Propietario'], ['arrendatario', 'Arrendatario'], ['residente', 'Residente']] },
    { name: 'email', label: 'Correo', type: 'email' }, { name: 'phone', label: 'Teléfono' }, { name: 'vehicles', label: 'Patentes (separadas por coma)' }, { name: 'titular', label: 'Titular de la unidad', type: 'checkbox' }] });
  let tbl;
  if (tab === 'unidades') {
    tbl = crudTable(el.querySelector('[data-t]'), {
      rows: () => db.all('units'), pageSize: 12, search: u => `${u.tower}-${u.number} ${u.ownerName}`,
      filters: [{ key: 'tower', label: 'Torre', options: [['A', 'Torre A'], ['B', 'Torre B']] }, { key: 'occupancy', label: 'Ocupación', options: [['propietario', 'Propietario'], ['arrendatario', 'Arrendada']] }, { key: 'debt', label: 'Deuda', options: [['si', 'Con deuda'], ['no', 'Al día']], fn: (u, v) => (unitDebt(u.id) > 0) === (v === 'si') }],
      columns: [
        { key: 'id', label: 'Unidad', render: u => `<b>${escape(unitName(u.id))}</b><br><span class="muted small">Piso ${u.floor}</span>` },
        { key: 'ownerName', label: 'Propietario', render: u => `${escape(u.ownerName)}<br><span class="muted small">${u.occupancy === 'arrendatario' ? 'Arrendada' : 'Habitada por dueño'}</span>` },
        { key: 'm2', label: 'm²', render: u => u.m2.toLocaleString('es-CL') }, { key: 'parking', label: 'Est./Bod.', render: u => `${u.parking} / ${u.storage}` },
        { key: 'alicuota', label: 'Alícuota', render: u => u.alicuota.toLocaleString('es-CL') + '%' },
        { key: 'res', label: 'Residentes', sort: false, render: u => residentsOf(u.id).length },
        { key: 'debt', label: 'Saldo', sort: false, render: u => { const d = unitDebt(u.id); return d ? `<span class="badge badge-danger">${money(d)}</span>` : '<span class="badge badge-success">Al día</span>'; } },
        { key: 'act', label: '', sort: false, render: u => `<div class="actions"><button class="btn btn-sm btn-ghost" data-uedit="${u.id}">✎</button><button class="btn btn-sm btn-ghost" data-udel="${u.id}">🗑</button></div>` }
      ],
      onRow: u => unitCard(db, u),
      csv: { name: 'unidades.csv', map: u => ({ unidad: unitName(u.id), torre: u.tower, piso: u.floor, m2: u.m2, estacionamientos: u.parking, bodegas: u.storage, alicuota: u.alicuota, propietario: u.ownerName, saldo: unitDebt(u.id) }) }
    });
  } else {
    tbl = crudTable(el.querySelector('[data-t]'), {
      rows: () => db.all('residents'), pageSize: 12, search: r => `${r.name} ${r.rut} ${r.email} ${unitName(r.unitId)} ${r.vehicles.join(' ')}`,
      filters: [{ key: 'type', label: 'Tipo', options: [['propietario', 'Propietario'], ['arrendatario', 'Arrendatario'], ['residente', 'Residente']] }, { key: 'tower', label: 'Torre', options: [['A', 'Torre A'], ['B', 'Torre B']], fn: (r, v) => r.unitId.startsWith(v + '-') }],
      columns: [
        { key: 'name', label: 'Residente', render: r => `<b>${escape(r.name)}</b>${r.titular ? ' <span class="badge badge-primary plain">Titular</span>' : ''}<br><span class="muted small">${escape(r.rut)}</span>` },
        { key: 'unitId', label: 'Unidad', render: r => escape(unitName(r.unitId)) }, { key: 'type', label: 'Tipo', render: r => escape(r.type) },
        { key: 'email', label: 'Contacto', render: r => `${escape(r.email || '')}<br><span class="muted small">${escape(r.phone || '')}</span>` },
        { key: 'vehicles', label: 'Vehículos', sort: false, render: r => escape(r.vehicles.join(', ') || '—') },
        { key: 'act', label: '', sort: false, render: r => `<div class="actions"><button class="btn btn-sm btn-ghost" data-redit="${r.id}">✎</button><button class="btn btn-sm btn-ghost" data-rdel="${r.id}">🗑</button></div>` }
      ],
      csv: { name: 'residentes.csv', map: r => ({ nombre: r.name, rut: r.rut, unidad: unitName(r.unitId), tipo: r.type, correo: r.email, telefono: r.phone, patentes: r.vehicles.join(' ') }) }
    });
  }
  el.querySelector('[data-new]').onclick = async () => {
    if (tab === 'unidades') {
      const r = await uForm(); if (!r) return;
      const id = `${r.tower}-${r.number}`; if (db.get('units', id)) return toast('Ya existe esa unidad', 'error');
      db.insert('units', { ...r, id, alicuota: r.alicuota || 0 }); db.log('unidades', `${user.name} creó la unidad ${id}`, user.id); toast('Unidad creada. Recuerda recalcular alícuotas.', 'success'); ctx.refresh();
    } else {
      const r = await rForm(); if (!r) return;
      db.insert('residents', { ...r, vehicles: r.vehicles.split(',').map(x => x.trim().toUpperCase()).filter(Boolean) }); db.log('residentes', `${user.name} agregó a ${r.name} (${unitName(r.unitId)})`, user.id); toast('Residente agregado', 'success'); tbl.refresh();
    }
  };
  el.querySelector('[data-recalc]')?.addEventListener('click', async () => {
    if (!(await confirm('Se recalculará la alícuota de todas las unidades activas según superficie + 12 m² por estacionamiento + 4 m² por bodega. Afecta los próximos cobros.', { title: 'Recalcular alícuotas', ok: 'Recalcular' }))) return;
    const units = db.query('units', u => u.active !== false), w = u => u.m2 + u.parking * 12 + u.storage * 4, W = units.reduce((t, u) => t + w(u), 0);
    units.forEach(u => db.update('units', u.id, { alicuota: Math.round(w(u) / W * 1e6) / 1e4 }));
    db.log('unidades', `${user.name} recalculó las alícuotas de ${units.length} unidades`, user.id); toast('Alícuotas recalculadas', 'success'); ctx.refresh();
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.uedit) { const u = db.get('units', b.dataset.uedit), r = await uForm(u); if (r) { db.update('units', u.id, { ...r, tower: u.tower, number: u.number }); db.log('unidades', `${user.name} editó ${u.id}`, user.id); toast('Unidad actualizada', 'success'); tbl.refresh(); } }
    if (b.dataset.udel) {
      const u = db.get('units', b.dataset.udel);
      if (residentsOf(u.id).length || db.count('charges', c => c.unitId === u.id)) return toast('La unidad tiene residentes o cobros asociados; desactívala en vez de eliminarla', 'warning', 4500);
      if (await confirm(`¿Eliminar ${u.id}?`, { danger: true, ok: 'Eliminar' })) { db.remove('units', u.id); toast('Unidad eliminada', 'success'); tbl.refresh(); }
    }
    if (b.dataset.redit) { const x = db.get('residents', b.dataset.redit), r = await rForm(x); if (r) { db.update('residents', x.id, { ...r, vehicles: r.vehicles.split(',').map(v => v.trim().toUpperCase()).filter(Boolean) }); toast('Residente actualizado', 'success'); tbl.refresh(); } }
    if (b.dataset.rdel) { const x = db.get('residents', b.dataset.rdel); if (await confirm(`¿Eliminar a ${x.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('residents', x.id); db.log('residentes', `${user.name} eliminó a ${x.name}`, user.id); toast('Residente eliminado', 'success'); tbl.refresh(); } }
  });
}

function unitCard(db, u) {
  const rs = residentsOf(u.id), cs = db.query('charges', c => c.unitId === u.id).sort((a, b) => b.period.localeCompare(a.period));
  modal({ title: `Depto ${unitName(u.id)}`, size: 'lg', body: `<div class="grid-4">${[['Superficie', u.m2 + ' m²'], ['Alícuota', u.alicuota + '%'], ['Est. / bodega', `${u.parking} / ${u.storage}`], ['Saldo', money(unitDebt(u.id))]].map(([k, v]) => `<div class="spec"><small>${k}</small><b>${escape(v)}</b></div>`).join('')}</div>
    <h4>Residentes</h4>${rs.map(r => `<div class="list-row small"><span><b>${escape(r.name)}</b> · ${escape(r.type)}</span><span>${escape(r.phone)} · ${escape(r.email)}</span></div>`).join('') || '<p class="muted">Sin residentes.</p>'}
    <h4>Cuenta corriente</h4><div class="table-wrap"><table class="table"><thead><tr><th>Período</th><th>Total</th><th>Estado</th></tr></thead><tbody>${cs.map(c => `<tr><td>${periodLabel(c.period)}</td><td>${money(c.total)}</td><td>${c.paid ? `<span class="badge badge-success">Pagado ${date(c.paidAt)}</span>` : '<span class="badge badge-warning">Pendiente</span>'}</td></tr>`).join('')}</tbody></table></div>
    <h4>Últimas visitas y encomiendas</h4><p class="small muted">${db.count('visitors', v => v.unitId === u.id)} visitas registradas · ${db.count('parcels', x => x.unitId === u.id)} encomiendas · ${db.count('bookings', b => b.unitId === u.id)} reservas</p>` });
}
export { settings };
