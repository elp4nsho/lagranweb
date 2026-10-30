// Programas por marca (CMS): intervalos, modelos con factor de precio y niveles de servicio. Se reflejan en el sitio.
import { escape, money, toast, formModal, confirm, modal } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { FUEL } from '../data/catalog.js';
import { kmFmt, nextServices } from '../shared/domain.js';
import { BODY_LABEL } from '../shared/car-art.js';

async function editProgram(p, ctx) {
  const v = await formModal({ title: p ? `Editar · ${p.name}` : 'Nuevo programa', fields: [
    { name: 'brand', label: 'Marca (como se muestra)', required: true, value: p?.brand }, { name: 'name', label: 'Nombre del programa', required: true, value: p?.name },
    { name: 'intervalKm', label: 'Intervalo (km)', type: 'number', required: true, value: p?.intervalKm || 15000 }, { name: 'intervalMonths', label: 'Intervalo (meses)', type: 'number', required: true, value: p?.intervalMonths || 12 },
    { name: 'order', label: 'Orden', type: 'number', value: p?.order || db.count('programs') + 1 }, { name: 'note', label: 'Descripción del plan del fabricante', type: 'textarea', value: p?.note }, { name: 'active', label: 'Visible en el sitio', type: 'checkbox', value: p ? p.active !== false : true }] });
  if (!v) return;
  if (v.intervalKm < 1000) { toast('Intervalo demasiado bajo', 'warning'); return; }
  if (p) db.update('programs', p.id, v);
  else { const base = db.all('programs')[0]; db.insert('programs', { ...v, models: [], levels: JSON.parse(JSON.stringify(base?.levels || [])) }); }
  db.log('programas', `${p ? 'Programa editado' : 'Programa creado'}: ${v.name}`, ctx.user.id); toast('Programa guardado', 'success');
}
async function editModel(p, idx, ctx) {
  const m = idx != null ? p.models[idx] : null;
  const v = await formModal({ title: m ? `Modelo · ${m.name}` : `Nuevo modelo ${p.brand}`, fields: [
    { name: 'name', label: 'Modelo', required: true, value: m?.name }, { name: 'body', label: 'Carrocería', type: 'select', options: Object.entries(BODY_LABEL), value: m?.body || 'sedan' },
    { name: 'fuel', label: 'Motorización', type: 'select', options: Object.entries(FUEL), value: m?.fuel || 'bencina' }, { name: 'hp', label: 'Potencia (CV)', type: 'number', value: m?.hp || 400 },
    { name: 'factor', label: 'Factor de precio (1 = base)', type: 'number', step: '0.05', value: m?.factor || 1, help: 'Multiplica el precio base de cada nivel (eléctricos tienen −30% adicional).' }] });
  if (!v) return;
  const models = [...p.models]; if (m) models[idx] = v; else models.push(v);
  db.update('programs', p.id, { models }); db.log('programas', `${p.brand}: modelo ${v.name} ${m ? 'editado' : 'agregado'}`, ctx.user.id); toast('Modelo guardado', 'success');
}
async function editLevel(p, idx, ctx) {
  const l = p.levels[idx];
  const v = await formModal({ title: `${p.brand} · ${l.name}`, fields: [
    { name: 'name', label: 'Nombre del servicio', required: true, value: l.name }, { name: 'every', label: 'Se aplica cada N intervalos', type: 'number', value: l.every },
    { name: 'base', label: 'Precio base (CLP)', type: 'number', required: true, value: l.base }, { name: 'hours', label: 'Horas de taller', type: 'number', step: '0.5', value: l.hours },
    { name: 'tasks', label: 'Tareas combustión (una por línea)', type: 'textarea', value: l.tasks.join('\n') }, { name: 'tasksEv', label: 'Tareas eléctricos (una por línea)', type: 'textarea', value: (l.tasksEv || []).join('\n') }] });
  if (!v) return;
  const levels = [...p.levels]; levels[idx] = { ...l, ...v, every: Math.max(1, v.every || 1), tasks: v.tasks.split('\n').map(s => s.trim()).filter(Boolean), tasksEv: v.tasksEv.split('\n').map(s => s.trim()).filter(Boolean) };
  db.update('programs', p.id, { levels }); db.log('programas', `${p.brand}: ${v.name} actualizado (${money(v.base)})`, ctx.user.id); toast('Nivel actualizado: el sitio ya muestra el nuevo precio', 'success');
}

export default {
  id: 'programas', label: 'Programas por marca', icon: '🔧', group: 'Catálogo', roles: ['admin', 'gerente'],
  watch: ['programs'],
  render(el, ctx) {
    const ps = db.all('programs').sort((a, b) => (a.order || 0) - (b.order || 0));
    el.innerHTML = `${pageHead('Programas por marca', 'Planes de mantención del fabricante: lo que ve el cliente en la calculadora del sitio', '<button class="btn btn-primary btn-sm" data-new>+ Programa</button>')}
      ${ps.map(p => `<div class="card stack"><div class="row between"><div><h3 style="margin:0">${escape(p.name)} ${p.active === false ? '<span class="badge">Oculto</span>' : '<span class="badge badge-success">Publicado</span>'}</h3><small class="muted">${escape(p.brand)} · cada ${kmFmt(p.intervalKm)} o ${p.intervalMonths} meses</small></div>
        <span class="row"><label class="switch" title="Visible en el sitio"><input type="checkbox" data-toggle="${p.id}" ${p.active !== false ? 'checked' : ''}><span></span></label><button class="btn btn-sm" data-edit="${p.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Eliminar">🗑</button></span></div>
        <div class="grid-2"><div class="stack" style="gap:6px"><div class="row between"><span class="label">Niveles de servicio</span></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Servicio</th><th>Cada</th><th>Base</th><th>Horas</th></tr></thead><tbody>${p.levels.map((l, i) => `<tr data-lvl="${p.id}|${i}" style="cursor:pointer"><td><b>${escape(l.name)}</b></td><td>${kmFmt(p.intervalKm * l.every)}</td><td>${money(l.base)}</td><td>${l.hours} h</td></tr>`).join('')}</tbody></table></div></div>
        <div class="stack" style="gap:6px"><div class="row between"><span class="label">Modelos (${p.models.length})</span><button class="btn btn-sm" data-addm="${p.id}">+ Modelo</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Modelo</th><th>Motor</th><th>Factor</th><th>Próx. a 30.000 km</th><th></th></tr></thead><tbody>${p.models.map((m, i) => { const [n] = nextServices({ brand: p.brand, model: m.name, km: 29999 }, 1); return `<tr><td><button class="btn btn-sm btn-ghost" data-m="${p.id}|${i}">${escape(m.name)}</button></td><td>${escape(FUEL[m.fuel] || m.fuel)}</td><td>×${m.factor}</td><td>${n && p.active !== false ? money(n.price) : '—'}</td><td><button class="btn btn-sm btn-ghost" data-delm="${p.id}|${i}" aria-label="Quitar modelo">✕</button></td></tr>`; }).join('')}</tbody></table></div></div></div>
        ${p.note ? `<p class="small muted" style="margin:0">${escape(p.note)}</p>` : ''}</div>`).join('')}`;
    el.addEventListener('click', async e => {
      const g = (a) => { const t = e.target.closest(`[${a}]`); return t && t.getAttribute(a); };
      if (e.target.closest('[data-new]')) return editProgram(null, ctx);
      let x;
      if ((x = g('data-edit'))) return editProgram(db.get('programs', x), ctx);
      if ((x = g('data-addm'))) return editModel(db.get('programs', x), null, ctx);
      if ((x = g('data-m'))) { const [id, i] = x.split('|'); return editModel(db.get('programs', id), +i, ctx); }
      if ((x = g('data-lvl'))) { const [id, i] = x.split('|'); return editLevel(db.get('programs', id), +i, ctx); }
      if ((x = g('data-delm'))) { const [id, i] = x.split('|'); const p = db.get('programs', id); if (await confirm(`¿Quitar ${p.models[+i].name}?`, { danger: true, ok: 'Quitar' })) { db.update('programs', id, { models: p.models.filter((_, k) => k !== +i) }); db.log('programas', `${p.brand}: modelo eliminado`, ctx.user.id); } return; }
      if ((x = g('data-del'))) { const p = db.get('programs', x); if (await confirm(`¿Eliminar ${p.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('programs', x); db.log('programas', `Programa eliminado: ${p.name}`, ctx.user.id); toast('Programa eliminado', 'success'); } }
    });
    el.addEventListener('change', e => { const t = e.target.closest('[data-toggle]'); if (t) { db.update('programs', t.dataset.toggle, { active: t.checked }); db.log('programas', `${db.get('programs', t.dataset.toggle).name}: ${t.checked ? 'publicado' : 'oculto'}`, ctx.user.id); toast(t.checked ? 'Programa publicado' : 'Programa oculto del sitio', 'success'); } });
  }
};
export { modal };
