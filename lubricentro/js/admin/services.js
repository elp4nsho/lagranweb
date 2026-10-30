// Servicios y matriz de precios por segmento + precio del aceite por litro. Cambios visibles al instante en el sitio.
import { escape, money, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { SEGMENTS } from '../data/catalog.js';
import { fmtKm } from '../shared/domain.js';

let tab = 'matriz';

async function editService(s, ctx) {
  const v = await formModal({ title: s ? `Editar · ${s.name}` : 'Nuevo servicio', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'icon', label: 'Ícono (emoji)', value: s?.icon || '🔧' },
    { name: 'cat', label: 'Categoría', type: 'select', options: ['Lubricación', 'Frenos', 'Neumáticos', 'Batería', 'Revisión', 'Lavado'], value: s?.cat },
    { name: 'mins', label: 'Duración estándar (min)', type: 'number', required: true, value: s?.mins || 30 },
    { name: 'desc', label: 'Descripción pública', type: 'textarea', value: s?.desc },
    { name: 'tasks', label: 'Checklist de tareas (una por línea)', type: 'textarea', value: (s?.tasks || []).join('\n') },
    ...SEGMENTS.map(g => ({ name: 'p_' + g.id, label: `Precio ${g.name}`, type: 'number', required: true, value: s?.prices[g.id] ?? 0 })),
    { name: 'oil', label: 'Suma el aceite recomendado (litros × precio)', type: 'checkbox', value: s?.oil },
    { name: 'popular', label: 'Destacado en portada', type: 'checkbox', value: s?.popular }, { name: 'active', label: 'Activo (visible y reservable)', type: 'checkbox', value: s ? s.active !== false : true }] });
  if (!v) return;
  const data = { name: v.name, icon: v.icon, cat: v.cat, mins: v.mins, desc: v.desc, tasks: v.tasks.split('\n').map(x => x.trim()).filter(Boolean), prices: Object.fromEntries(SEGMENTS.map(g => [g.id, v['p_' + g.id]])), oil: v.oil, popular: v.popular, active: v.active };
  if (s) db.update('services', s.id, data); else db.insert('services', { ...data, id: 'sv-' + Date.now().toString(36), order: db.count('services') });
  db.log('precios', `Servicio ${s ? 'editado' : 'creado'}: ${v.name}`, ctx.user.id);
  toast('Servicio guardado', 'success');
}

export default {
  id: 'servicios', label: 'Servicios y precios', icon: '🏷️', group: 'Catálogo', roles: ['admin', 'jefe'], watch: ['services', 'oils'],
  render(el, ctx) {
    const edit = ctx.user.role === 'admin';
    const svcs = db.all('services').sort((a, b) => a.order - b.order);
    el.innerHTML = `${pageHead('Servicios y precios', `Matriz de precios por segmento de vehículo (IVA incluido).${edit ? '' : ' <b>Solo lectura para tu rol.</b>'}`, edit ? '<button class="btn btn-primary btn-sm" data-new>+ Servicio</button>' : '')}
      ${tabs([['matriz', 'Matriz de precios'], ['aceites', 'Aceites (precio por litro)']], tab)}
      ${tab === 'matriz' ? `<div class="table-wrap"><table class="table matrix"><thead><tr><th>Servicio</th>${SEGMENTS.map(g => `<th>${g.icon} ${escape(g.name)}</th>`).join('')}<th>Min</th><th>Activo</th><th></th></tr></thead><tbody>
        ${svcs.map(s => `<tr data-id="${s.id}"><td><b>${escape(s.icon)} ${escape(s.name)}</b><small class="muted d-block">${escape(s.cat)}${s.oil ? ' · + aceite' : ''}</small></td>${SEGMENTS.map(g => `<td><input class="input" type="number" min="0" step="10" data-seg="${g.id}" value="${s.prices[g.id]}" ${edit ? '' : 'disabled'} aria-label="${escape(s.name)} ${escape(g.name)}"></td>`).join('')}<td>${s.mins}</td><td><label class="switch"><input type="checkbox" data-act="${s.id}" ${s.active !== false ? 'checked' : ''} ${edit ? '' : 'disabled'}><span></span></label></td><td class="nowrap">${edit ? `<button class="btn btn-sm" data-edit="${s.id}">Editar</button> <button class="btn btn-sm btn-ghost" data-del="${s.id}" aria-label="Eliminar">🗑</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>${edit ? '<div class="row"><button class="btn btn-primary" data-save>Guardar matriz</button><button class="btn" data-pct>Ajuste masivo %</button><small class="muted">Los precios se publican en el sitio apenas guardas.</small></div>' : ''}`
      : `<div class="table-wrap"><table class="table matrix"><thead><tr><th>Aceite</th><th>Precio por litro</th><th>Cambio cada</th><th>Ejemplo 4 L</th></tr></thead><tbody>${db.all('oils').map(o => `<tr><td><b>${escape(o.name)}</b><small class="muted d-block">${escape(o.desc)}</small></td><td><input class="input" type="number" min="0" step="10" data-oil="${o.id}" value="${o.pricePerL}" ${edit ? '' : 'disabled'} aria-label="Precio ${escape(o.name)}"></td><td><input class="input" type="number" min="1000" step="500" data-int="${o.id}" value="${o.interval}" ${edit ? '' : 'disabled'} aria-label="Intervalo ${escape(o.name)}"> <small class="muted">${fmtKm(o.interval)}</small></td><td>${money(o.pricePerL * 4)}</td></tr>`).join('')}</tbody></table></div>${edit ? '<button class="btn btn-primary" data-saveoil>Guardar aceites</button>' : ''}`}`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.onclick = async e => {
      const t = e.target;
      if (t.closest('[data-new]')) editService(null, ctx);
      const ed = t.closest('[data-edit]'); if (ed) editService(db.get('services', ed.dataset.edit), ctx);
      const dl = t.closest('[data-del]'); if (dl) { const s = db.get('services', dl.dataset.del); if (await confirm(`¿Eliminar "${s.name}"? Las atenciones históricas no cambian.`, { danger: true, ok: 'Eliminar' })) { db.remove('services', s.id); db.log('precios', `Servicio eliminado: ${s.name}`, ctx.user.id); } }
      if (t.closest('[data-save]')) {
        let n = 0;
        el.querySelectorAll('tr[data-id]').forEach(tr => { const s = db.get('services', tr.dataset.id); const prices = Object.fromEntries([...tr.querySelectorAll('[data-seg]')].map(i => [i.dataset.seg, Math.max(0, +i.value || 0)])); if (JSON.stringify(prices) !== JSON.stringify(s.prices)) { db.update('services', s.id, { prices }); n++; } });
        if (n) db.log('precios', `Matriz de precios actualizada (${n} servicios)`, ctx.user.id);
        toast(n ? `Precios actualizados en ${n} servicio(s)` : 'Sin cambios', n ? 'success' : 'info');
      }
      if (t.closest('[data-pct]')) {
        const v = await formModal({ title: 'Ajuste masivo', fields: [{ name: 'pct', label: 'Variación % (ej. 4 o -5)', type: 'number', required: true, value: 3 }, { name: 'cat', label: 'Categoría', type: 'select', options: [['', 'Todas'], ...[...new Set(svcs.map(s => s.cat))].map(c => [c, c])] }] });
        if (!v) return;
        svcs.filter(s => !v.cat || s.cat === v.cat).forEach(s => db.update('services', s.id, { prices: Object.fromEntries(Object.entries(s.prices).map(([k, p]) => [k, Math.round(p * (1 + v.pct / 100) / 1000) * 1000 - 10])) }));
        db.log('precios', `Ajuste masivo ${v.pct}% ${v.cat || 'todas las categorías'}`, ctx.user.id); toast('Precios ajustados', 'success');
      }
      if (t.closest('[data-saveoil]')) {
        el.querySelectorAll('[data-oil]').forEach(i => db.update('oils', i.dataset.oil, { pricePerL: Math.max(0, +i.value || 0), interval: Math.max(1000, +el.querySelector(`[data-int="${i.dataset.oil}"]`).value || 10000) }));
        db.log('precios', 'Precios de aceite actualizados', ctx.user.id); toast('Aceites actualizados', 'success');
      }
    };
    el.onchange = e => { const a = e.target.closest('[data-act]'); if (a) { db.update('services', a.dataset.act, { active: a.checked }); toast(a.checked ? 'Servicio activado' : 'Servicio oculto del sitio', 'success'); } };
  }
};
