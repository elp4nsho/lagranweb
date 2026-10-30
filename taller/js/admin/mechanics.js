// Mecánicos y tarifas: perfil, costo hora, especialidad; baremo de horas estándar; tarifas de venta.
import { escape, money, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { mechLoad, settings, saveSettings, laborPrice } from '../shared/domain.js';

let tab = 'mecanicos';
export default {
  id: 'mecanicos', label: 'Mecánicos y tarifas', icon: '👷', group: 'Taller', roles: ['admin', 'jefe'], watch: ['users', 'labor', 'settings', 'ots'],
  render(el, ctx) {
    const s = settings();
    el.innerHTML = `${pageHead('Mecánicos y tarifas', `Tarifa venta mecánica ${money(s.laborRate)}/h · pintura ${money(s.paintRate)}/h · abono ${s.depositPct}%`, tab === 'baremo' ? '<button class="btn btn-primary btn-sm" data-newl>+ Trabajo</button>' : '')}${tabs([['mecanicos', 'Mecánicos'], ['baremo', 'Baremo (horas estándar)'], ['tarifas', 'Tarifas']], tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    const box = el.querySelector('[data-list]');
    if (tab === 'tarifas') {
      box.innerHTML = `<form class="card stack narrow" data-f novalidate><div class="grid-2"><div class="field"><label for="r1">Tarifa hora mecánica (venta)</label><input class="input" id="r1" name="laborRate" type="number" step="500" value="${s.laborRate}"></div><div class="field"><label for="r2">Tarifa hora pintura/carrocería</label><input class="input" id="r2" name="paintRate" type="number" step="500" value="${s.paintRate}"></div><div class="field"><label for="r3">Abono al aprobar (%)</label><input class="input" id="r3" name="depositPct" type="number" min="0" max="100" value="${s.depositPct}"></div><div class="field"><label for="r4">Valor UF (deducibles)</label><input class="input" id="r4" name="uf" type="number" value="${s.uf}"></div></div><button class="btn btn-primary">Guardar tarifas</button><small class="muted">Afecta los nuevos ítems de presupuesto y los precios referenciales del sitio.</small></form>`;
      box.querySelector('[data-f]').onsubmit = e => { e.preventDefault(); const f = e.target.elements; saveSettings({ laborRate: +f.laborRate.value, paintRate: +f.paintRate.value, depositPct: +f.depositPct.value, uf: +f.uf.value }); db.log('tarifas', 'Tarifas actualizadas', ctx.user.id); toast('Tarifas guardadas', 'success'); };
      return {};
    }
    if (tab === 'baremo') {
      const edit = async l => { const v = await formModal({ title: l ? l.name : 'Nuevo trabajo', fields: [{ name: 'name', label: 'Trabajo', required: true, value: l?.name }, { name: 'cat', label: 'Área', type: 'select', options: [...new Set(db.all('labor').map(x => x.cat))], value: l?.cat }, { name: 'hours', label: 'Horas estándar', type: 'number', step: '0.1', required: true, value: l?.hours || 1 }, { name: 'active', label: 'Activo', type: 'checkbox', value: l ? l.active !== false : true }] }); if (!v) return; l ? db.update('labor', l.id, v) : db.insert('labor', v); db.log('baremo', `${v.name}: ${v.hours} h`, ctx.user.id); toast('Baremo guardado', 'success'); };
      el.querySelector('[data-newl]').onclick = () => edit(null);
      return smartTable(box, { rows: () => db.all('labor'), filters: [{ key: 'cat', label: 'Área', options: [...new Set(db.all('labor').map(x => x.cat))] }], search: r => r.name, pageSize: 12,
        columns: [{ key: 'name', label: 'Trabajo', render: r => `<b>${escape(r.name)}</b>${r.active === false ? ' <span class="badge badge-danger">inactivo</span>' : ''}` }, { key: 'cat', label: 'Área' }, { key: 'hours', label: 'Horas', render: r => String(r.hours).replace('.', ',') }, { key: 'price', label: 'Precio M.O.', sort: false, render: r => money(laborPrice(r.hours, r.cat)) }],
        onRow: r => edit(db.get('labor', r.id)), csv: { name: 'baremo', map: r => ({ trabajo: r.name, area: r.cat, horas: r.hours, precio: laborPrice(r.hours, r.cat) }) } });
    }
    const last = db.all('monthStats').sort((a, b) => a.m.localeCompare(b.m)).at(-1);
    return smartTable(box, {
      rows: () => db.query('users', u => u.role === 'mecanico').map(u => { const L = mechLoad(u.id), st = last.mech[u.id] || { billed: 0, worked: 1 }; return { ...u, load: L.pendingH, ntasks: L.tasks.length, running: L.running, eff: Math.round(st.billed / Math.max(1, st.worked) * 100), margin: Math.round((s.laborRate - u.tariff) / s.laborRate * 100) }; }),
      search: r => `${r.name} ${r.specialty}`,
      columns: [{ key: 'name', label: 'Mecánico', render: r => `<b>${escape(r.name)}</b>${r.active === false ? ' <span class="badge badge-danger">inactivo</span>' : ''}<small class="muted d-block">${escape(r.level)} · ${escape(r.specialty)}</small>` }, { key: 'tariff', label: 'Costo hora', render: r => money(r.tariff) }, { key: 'margin', label: 'Margen M.O.', render: r => r.margin + '%' }, { key: 'eff', label: 'Eficiencia', render: r => `<span class="${r.eff < 85 ? 'text-warning' : 'text-success'}">${r.eff}%</span>` }, { key: 'load', label: 'Carga pendiente', render: r => `${r.load.toFixed(1).replace('.', ',')} h · ${r.ntasks} tareas${r.running ? ' · ▶' : ''}` }],
      onRow: async r => { const u = db.get('users', r.id); const v = await formModal({ title: u.name, fields: [{ name: 'specialty', label: 'Especialidad', value: u.specialty }, { name: 'level', label: 'Nivel', type: 'select', options: ['Técnico', 'Senior', 'Maestro'], value: u.level }, { name: 'tariff', label: 'Costo hora (sueldo + cargas)', type: 'number', value: u.tariff }, { name: 'hoursDay', label: 'Horas disponibles por día', type: 'number', value: u.hoursDay || 8 }, { name: 'active', label: 'Activo', type: 'checkbox', value: u.active !== false }] }); if (v) { db.update('users', u.id, v); db.log('mecanicos', `${u.name} actualizado`, ctx.user.id); toast('Guardado', 'success'); } },
      csv: { name: 'mecanicos', map: r => ({ nombre: r.name, especialidad: r.specialty, nivel: r.level, costo_hora: r.tariff, eficiencia: r.eff, carga_h: r.load.toFixed(1) }) }
    });
  }
};
export { confirm };
