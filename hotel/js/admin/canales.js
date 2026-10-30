// Channel manager simulado: canales (OTAs ficticias), comisiones, markup, cupos por tipo, sincronización y paridad.
import { escape, toast, formModal, money, sleep, ago } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { nightlyRate, today, addDays } from '../shared/hotel.js';

export default {
  id: 'canales', label: 'Channel manager', icon: '🔗', group: 'Revenue', roles: ['admin', 'revenue'], watch: ['channels', 'roomTypes', 'seasons'],
  render(el, ctx) {
    const paint = () => {
      const ch = db.all('channels'), types = db.all('roomTypes').sort((a, b) => a.order - b.order);
      const since = addDays(today(), -90);
      const res = db.query('reservations', r => r.checkIn >= since && r.status !== 'cancelada');
      const stat = id => { const rs = res.filter(r => r.channel === id); const rev = rs.reduce((a, r) => a + r.total, 0); return { n: rs.length, rev, comm: rev * (db.get('channels', id).commission / 100) }; };
      const totalComm = ch.reduce((a, c) => a + stat(c.id).comm, 0);
      const direct = res.filter(r => ['web', 'telefono'].includes(r.channel)).length;
      el.innerHTML = `${pageHead('Channel manager', 'Distribución en canales externos (simulados). Los precios se envían con el markup de cada canal.', '<button class="btn btn-primary btn-sm" data-syncall>⟳ Sincronizar todo</button>')}
        <div class="kpi-grid">${kpi('Reservas directas (90 días)', Math.round(direct / (res.length || 1) * 100) + '%', `${direct} de ${res.length}`)}${kpi('Comisiones pagadas (90 días)', money(totalComm))}${kpi('Canales activos', String(ch.filter(c => c.active).length))}</div>
        <div class="grid-auto">${ch.map(c => { const s = stat(c.id); return `<div class="card stack ch-card ${c.active ? '' : 'is-off'}">
          <div class="row between"><b>${escape(c.icon)} ${escape(c.name)}</b><label class="switch"><input type="checkbox" data-act="${c.id}" ${c.active ? 'checked' : ''} aria-label="Activo"><span></span></label></div>
          <div class="row small" style="gap:12px"><span>Comisión <b>${c.commission}%</b></span><span>Markup <b>${c.markup}%</b></span></div>
          <div class="small muted">${s.n} reservas · ${money(s.rev)} en 90 días</div>
          ${c.allotment && Object.values(c.allotment).some(v => v != null) ? `<div class="small">Cupos: ${Object.entries(c.allotment).filter(([, v]) => v != null).map(([t, v]) => `${escape(db.get('roomTypes', t)?.name.split(' ')[0] || t)} <b>${v}</b>`).join(' · ')}</div>` : '<div class="small muted">Sin cupos (venta directa)</div>'}
          <div class="row between"><small class="muted">Sync ${c.lastSync ? ago(c.lastSync) : 'nunca'}</small><span class="row nowrap" style="gap:6px"><button class="btn btn-sm" data-edit="${c.id}">Editar</button><button class="btn btn-sm" data-sync="${c.id}" ${c.active ? '' : 'disabled'}>⟳</button></span></div></div>`; }).join('')}</div>
        <div class="card stack"><h3 style="margin:0">Paridad de tarifas · esta noche</h3><div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th>${ch.filter(c => c.active).map(c => `<th>${escape(c.name)}</th>`).join('')}</tr></thead><tbody>
          ${types.map(t => { const base = nightlyRate(t.id, today()).rate; return `<tr><td><b>${escape(t.name)}</b></td>${ch.filter(c => c.active).map(c => `<td>${money(Math.round(base * (1 + c.markup / 100) / 1000) * 1000)}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
          <small class="muted">El sitio web siempre muestra la mejor tarifa (markup 0%).</small></div>`;
    };
    const sync = async ids => {
      toast(`Sincronizando ${ids.length} canal(es)…`, 'info', 1200);
      await sleep(900);
      ids.forEach(id => db.update('channels', id, { lastSync: new Date().toISOString() }));
      db.log('canales', `Tarifas y disponibilidad enviadas a ${ids.map(id => db.get('channels', id).name).join(', ')}`, ctx.user.id);
      toast('Sincronización completada', 'success');
    };
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-syncall')) sync(db.query('channels', c => c.active).map(c => c.id));
      if (b.dataset.sync) sync([b.dataset.sync]);
      if (b.dataset.edit) {
        const c = db.get('channels', b.dataset.edit), types = db.all('roomTypes');
        const v = await formModal({ title: c.name, fields: [{ name: 'commission', label: 'Comisión %', type: 'number', value: c.commission }, { name: 'markup', label: 'Markup sobre tarifa directa %', type: 'number', value: c.markup },
          ...types.map(t => ({ name: 'al_' + t.id, label: `Cupo ${t.name}`, type: 'number', value: c.allotment?.[t.id] ?? 0 }))] });
        if (!v) return;
        db.update('channels', c.id, { commission: v.commission, markup: v.markup, allotment: Object.fromEntries(types.map(t => [t.id, v['al_' + t.id]])) });
        db.log('canales', `${c.name}: comisión ${v.commission}%, markup ${v.markup}%`, ctx.user.id); toast('Canal actualizado', 'success');
      }
    });
    el.addEventListener('change', e => { const s = e.target.closest('[data-act]'); if (s) { const c = db.get('channels', s.dataset.act); db.update('channels', c.id, { active: s.checked }); db.log('canales', `${c.name} ${s.checked ? 'activado' : 'desactivado'}`, ctx.user.id); toast(`${c.name} ${s.checked ? 'activado' : 'cerrado a la venta'}`, 'success'); } });
    paint();
    return { refresh: paint };
  }
};
