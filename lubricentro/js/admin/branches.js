// Sucursales y bahías: datos públicos, horarios y bahías activas (afectan agenda y espera del sitio).
import { escape, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { branches, baysOf, branchLive, waitLabel, waitTone } from '../shared/domain.js';

async function editBranch(b, ctx) {
  const v = await formModal({ title: b ? `Sucursal ${b.name}` : 'Nueva sucursal', fields: [
    { name: 'name', label: 'Nombre', required: true, value: b?.name }, { name: 'address', label: 'Dirección', required: true, value: b?.address },
    { name: 'phone', label: 'Teléfono', value: b?.phone }, { name: 'hours', label: 'Horario (texto público)', value: b?.hours || 'Lun–Vie 8:30–19:30 · Sáb 9:00–14:00' },
    { name: 'open', label: 'Apertura (HH:MM)', required: true, value: b?.open || '08:30' }, { name: 'close', label: 'Cierre lun–vie', required: true, value: b?.close || '19:30' },
    { name: 'satClose', label: 'Cierre sábado', required: true, value: b?.satClose || '14:00' }, { name: 'active', label: 'Sucursal activa (visible en el sitio)', type: 'checkbox', value: b ? b.active !== false : true }] });
  if (!v) return;
  if (![v.open, v.close, v.satClose].every(x => /^\d{2}:\d{2}$/.test(x))) { toast('Usa formato HH:MM en los horarios', 'warning'); return; }
  if (b) db.update('branches', b.id, v);
  else { const nb = db.insert('branches', v); for (let i = 1; i <= 3; i++) db.insert('bays', { branchId: nb.id, name: `Bahía ${i}`, type: i === 3 ? 'Alineadora' : 'Fosa rápida', active: true }); }
  db.log('sucursal', `${b ? 'Editada' : 'Creada'}: ${v.name}`, ctx.user.id); toast('Sucursal guardada', 'success');
}

export default {
  id: 'sucursales', label: 'Sucursales y bahías', icon: '📍', group: 'Organización', roles: ['admin'], watch: ['branches', 'bays', 'jobs'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Sucursales y bahías', 'Las bahías activas definen los cupos de reserva y el cálculo de espera del sitio', '<button class="btn btn-primary btn-sm" data-new>+ Sucursal</button>')}
      <div class="grid-2">${branches(true).map(b => { const l = branchLive(b.id); const bays = baysOf(b.id, true); const busy = db.query('jobs', j => j.branchId === b.id && j.status === 'en-bahia').map(j => j.bayId); return `<div class="card stack ${b.active === false ? 'muted' : ''}">
        <div class="row between"><h3 style="margin:0">📍 ${escape(b.name)}</h3><span class="badge ${b.active === false ? 'badge-danger' : 'badge-success'}">${b.active === false ? 'Inactiva' : 'Activa'}</span></div>
        <small class="muted">${escape(b.address)} · ${escape(b.phone)}</small><small>${escape(b.hours)}</small>
        <div class="row small"><span class="badge badge-${waitTone(l.wait)}">Espera ${escape(waitLabel(l.wait))}</span><span>${l.queue} en fila · ${l.inBay}/${l.bays} bahías</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Bahía</th><th>Tipo</th><th>Ahora</th><th>Activa</th><th></th></tr></thead><tbody>${bays.map(y => `<tr><td><b>${escape(y.name)}</b></td><td>${escape(y.type)}</td><td>${busy.includes(y.id) ? '<span class="badge badge-primary">Ocupada</span>' : '<span class="badge badge-success">Libre</span>'}</td><td><label class="switch"><input type="checkbox" data-bay="${y.id}" ${y.active !== false ? 'checked' : ''}><span></span></label></td><td class="nowrap"><button class="btn btn-sm" data-ebay="${y.id}">Editar</button> <button class="btn btn-sm btn-ghost" data-dbay="${y.id}" aria-label="Eliminar">🗑</button></td></tr>`).join('')}</tbody></table></div>
        <div class="row"><button class="btn btn-sm" data-edit="${b.id}">Editar sucursal</button><button class="btn btn-sm" data-addbay="${b.id}">+ Bahía</button></div></div>`; }).join('')}</div>`;
    el.onclick = async e => {
      const t = e.target;
      if (t.closest('[data-new]')) editBranch(null, ctx);
      const ed = t.closest('[data-edit]'); if (ed) editBranch(db.get('branches', ed.dataset.edit), ctx);
      const ab = t.closest('[data-addbay]'), eb = t.closest('[data-ebay]');
      if (ab || eb) {
        const y = eb ? db.get('bays', eb.dataset.ebay) : null;
        const v = await formModal({ title: y ? `Editar ${y.name}` : 'Nueva bahía', fields: [{ name: 'name', label: 'Nombre', required: true, value: y?.name || `Bahía ${baysOf(ab?.dataset.addbay, true).length + 1}` }, { name: 'type', label: 'Tipo', type: 'select', options: ['Fosa rápida', 'Elevador', 'Alineadora', 'Lavado'], value: y?.type }] });
        if (!v) return;
        y ? db.update('bays', y.id, v) : db.insert('bays', { ...v, branchId: ab.dataset.addbay, active: true });
        db.log('sucursal', `Bahía ${y ? 'editada' : 'creada'}: ${v.name}`, ctx.user.id); toast('Bahía guardada', 'success');
      }
      const db_ = t.closest('[data-dbay]');
      if (db_) { const y = db.get('bays', db_.dataset.dbay); if (db.count('jobs', j => j.bayId === y.id && j.status === 'en-bahia')) { toast('La bahía tiene un auto en atención', 'warning'); return; } if (await confirm(`¿Eliminar ${y.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('bays', y.id); db.log('sucursal', `Bahía eliminada: ${y.name}`, ctx.user.id); } }
    };
    el.onchange = e => { const s = e.target.closest('[data-bay]'); if (s) { db.update('bays', s.dataset.bay, { active: s.checked }); db.log('sucursal', `Bahía ${s.checked ? 'habilitada' : 'deshabilitada'}`, ctx.user.id); toast(s.checked ? 'Bahía habilitada' : 'Bahía fuera de servicio', 'success'); } };
  }
};
