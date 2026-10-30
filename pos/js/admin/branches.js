// Sucursales y sus cajas registradoras (solo administración).
import { html, raw, money, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db, salesByDay, userName, openShiftOf } from '../data/db.js';
import { pageHead, log } from '../shared/common.js';

export function render(el) {
  const list = db.all('branches');
  el.innerHTML = html`${raw(pageHead('Sucursales', `${list.length} locales · ${db.count('registers')} cajas`, '<button class="btn btn-primary" data-new>+ Nueva sucursal</button>'))}
    <div class="cols-2">${list.map(b => {
      const regs = db.query('registers', r => r.branchId === b.id);
      const w = salesByDay(7, b.id), staff = db.count('users', u => u.branchId === b.id && u.active !== false);
      return raw(html`<div class="card stack" style="gap:10px">
        <div class="row between"><div><h3 style="margin:0">${b.name} <span class="badge plain">${b.code}</span></h3><small class="muted">${b.address}, ${b.comuna} · ${b.phone}</small></div>${b.active ? raw('<span class="badge badge-success">Operando</span>') : raw('<span class="badge">Cerrada</span>')}</div>
        <dl class="kv"><dt>Horario</dt><dd>${b.opens} – ${b.closes}</dd><dt>Encargado/a</dt><dd>${b.manager ? userName(b.manager) : '—'}</dd><dt>Personal</dt><dd>${staff} persona(s)</dd><dt>Ventas 7 días</dt><dd>${money(w.reduce((a, d) => a + d.total, 0))} · ${w.reduce((a, d) => a + d.count, 0)} boletas</dd></dl>
        <div><b class="small">Cajas</b><ul class="list-plain">${regs.map(r => { const s = openShiftOf(r.id); return raw(html`<li><span>🖥️ ${r.name}</span><span class="row" style="gap:6px">${s ? raw(html`<span class="badge badge-success">Abierta · ${userName(s.userId).split(' ')[0]}</span>`) : raw('<span class="badge">Cerrada</span>')}<button class="btn btn-sm btn-ghost" data-rmreg="${r.id}" aria-label="Eliminar caja" ${s ? 'disabled' : ''}>✕</button></span></li>`); })}</ul></div>
        <div class="row"><button class="btn btn-sm" data-edit="${b.id}">Editar</button><button class="btn btn-sm" data-addreg="${b.id}">+ Caja</button><button class="btn btn-sm btn-ghost" data-toggle="${b.id}">${b.active ? 'Cerrar sucursal' : 'Reabrir'}</button></div>
      </div>`);
    })}</div>`;
  el.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]');
    if (e.target.closest('[data-new]') || ed) {
      const b = ed ? db.get('branches', ed.dataset.edit) : { opens: '08:00', closes: '21:00' };
      const sups = db.query('users', u => ['supervisor', 'admin'].includes(u.role));
      const v = await formModal({ title: ed ? `Editar ${b.name}` : 'Nueva sucursal', fields: [
        { name: 'name', label: 'Nombre', value: b.name || 'Pampa ', required: true }, { name: 'code', label: 'Código (3 letras)', value: b.code, required: true },
        { name: 'address', label: 'Dirección', value: b.address, required: true }, { name: 'comuna', label: 'Comuna', value: b.comuna, required: true },
        { name: 'phone', label: 'Teléfono', value: b.phone }, { name: 'opens', label: 'Abre', type: 'time', value: b.opens }, { name: 'closes', label: 'Cierra', type: 'time', value: b.closes },
        { name: 'manager', label: 'Encargado/a', type: 'select', value: b.manager || '', options: [['', '—'], ...sups.map(u => [u.id, u.name])] }
      ] });
      if (!v) return;
      v.code = v.code.toUpperCase().slice(0, 3);
      if (ed) { db.update('branches', b.id, v); log('sucursal', `Editó ${v.name}`); }
      else {
        const nb = db.insert('branches', { ...v, active: true });
        db.query('products', p => p.trackStock).forEach(p => db.update('products', p.id, x => ({ stock: { ...x.stock, [nb.id]: 0 } })));
        db.insert('registers', { branchId: nb.id, name: 'Caja 1' });
        log('sucursal', `Creó ${v.name} con Caja 1`);
      }
      toast('Sucursal guardada', 'success');
    }
    const ar = e.target.closest('[data-addreg]');
    if (ar) { const n = db.count('registers', r => r.branchId === ar.dataset.addreg) + 1; db.insert('registers', { branchId: ar.dataset.addreg, name: `Caja ${n}` }); log('sucursal', `Agregó Caja ${n} a ${db.get('branches', ar.dataset.addreg).name}`); toast(`Caja ${n} creada`, 'success'); }
    const rr = e.target.closest('[data-rmreg]');
    if (rr && await confirm('¿Eliminar esta caja? Su historial de turnos se conserva.', { danger: true, ok: 'Eliminar' })) { db.remove('registers', rr.dataset.rmreg); log('sucursal', 'Eliminó una caja'); toast('Caja eliminada', 'info'); }
    const tg = e.target.closest('[data-toggle]');
    if (tg) { const b = db.get('branches', tg.dataset.toggle); if (b.active && !await confirm(`${b.name} dejará de aparecer en caja y reportes. ¿Continuar?`, { danger: true, ok: 'Cerrar sucursal' })) return; db.update('branches', b.id, { active: !b.active }); log('sucursal', `${b.active ? 'Cerró' : 'Reabrió'} ${b.name}`); }
  });
}
