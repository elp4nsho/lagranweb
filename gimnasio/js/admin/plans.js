import { escape, money, toast, confirm, modal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { icon } from '../shared/icons.js';

export function renderPlans(v) {
  v.innerHTML = `${pageHead('Planes', 'Los planes activos se muestran en la página pública de precios y en la inscripción en línea.', `<a class="btn" href="index.html#/planes" target="_blank">${icon('eye', 16)} Ver precios públicos</a><button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo plan</button>`)}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('plans').map(p => ({ ...p, n: db.count('members', m => m.planId === p.id && ['activo', 'moroso'].includes(m.status)) })).sort((a, b) => a.order - b.order),
    columns: [
      { key: 'order', label: '#' }, { key: 'name', label: 'Plan', render: p => `<b>${escape(p.name)}</b>${p.highlight ? ' <span class="badge badge-primary">Destacado</span>' : ''}<br><small class="muted">${escape(p.desc)}</small>` },
      { key: 'monthly', label: 'Mensual', render: p => money(p.monthly) }, { key: 'annual', label: 'Anual', render: p => money(p.annual) },
      { key: 'classesPerWeek', label: 'Clases/sem', render: p => p.classesPerWeek >= 99 ? 'Ilimitadas' : p.classesPerWeek }, { key: 'n', label: 'Socios' },
      { key: 'active', label: 'Publicado', render: p => `<label class="switch"><input type="checkbox" data-toggle="${p.id}" ${p.active !== false ? 'checked' : ''}><span></span></label>` },
      { key: 'id', label: '', sort: false, render: p => `<div class="acts-cell">${actBtn('edit', p.id, 'edit', 'Editar')}${actBtn('del', p.id, 'trash', 'Eliminar')}</div>` }
    ],
    onRow: p => edit(db.get('plans', p.id)),
    onAction: async (act, id) => {
      const p = db.get('plans', id);
      if (act === 'edit') return edit(p);
      if (db.count('members', m => m.planId === id && m.status !== 'baja')) return toast('Tiene socios vigentes: despublícalo en vez de eliminarlo', 'warning');
      if (await confirm(`¿Eliminar el plan ${p.name}?`, { title: 'Eliminar plan', danger: true, ok: 'Eliminar' })) { db.remove('plans', id); toast('Plan eliminado', 'success'); }
    },
    csv: { name: 'planes.csv', map: p => ({ plan: p.name, mensual: p.monthly, anual: p.annual, clases_semana: p.classesPerWeek, socios: p.n }) }
  });
  v.querySelector('[data-list]').addEventListener('change', e => { const t = e.target.closest('[data-toggle]'); if (!t) return; const p = db.update('plans', t.dataset.toggle, { active: t.checked }); db.log('plan', `${p.name} ${t.checked ? 'publicado' : 'oculto'}`, auth.current()?.id); toast(`${p.name} ${t.checked ? 'visible' : 'oculto'} en precios`, 'success'); });
  v.querySelector('[data-new]').onclick = () => edit(null);
}

function edit(p) {
  const m = modal({ title: p ? `Editar plan ${p.name}` : 'Nuevo plan', size: 'lg', body: `<form class="stack" novalidate>
    <div class="grid-2"><div class="field"><label for="pn">Nombre</label><input class="input" id="pn" name="name" value="${escape(p?.name || '')}"></div>
    <div class="field"><label for="po">Orden</label><input class="input" id="po" name="order" type="number" value="${p?.order ?? db.count('plans') + 1}"></div>
    <div class="field"><label for="pm">Precio mensual</label><input class="input" id="pm" name="monthly" type="number" step="10" value="${p?.monthly || 24990}"></div>
    <div class="field"><label for="pa">Precio anual</label><input class="input" id="pa" name="annual" type="number" step="100" value="${p?.annual || 249900}"><small class="muted" data-save></small></div>
    <div class="field"><label for="pc">Clases por semana (99 = ilimitadas)</label><input class="input" id="pc" name="classesPerWeek" type="number" value="${p?.classesPerWeek ?? 99}"></div></div>
    <div class="field"><label for="pd">Descripción</label><input class="input" id="pd" name="desc" value="${escape(p?.desc || '')}"></div>
    <div class="field"><label for="pf">Incluye (una por línea)</label><textarea class="textarea" id="pf" name="features">${escape((p?.features || []).join('\n'))}</textarea></div>
    <div class="field"><label for="px">No incluye (una por línea)</label><textarea class="textarea" id="px" name="missing" style="min-height:70px">${escape((p?.missing || []).join('\n'))}</textarea></div>
    <div class="row"><label class="check"><input type="checkbox" name="allBranches" ${p?.allBranches ? 'checked' : ''}> Acceso a todas las sedes</label><label class="check"><input type="checkbox" name="highlight" ${p?.highlight ? 'checked' : ''}> Destacar ("Más elegido")</label><label class="check"><input type="checkbox" name="active" ${p?.active !== false ? 'checked' : ''}> Publicado</label></div>
  </form>`, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>` });
  const f = m.el.querySelector('form');
  const sv = () => { m.el.querySelector('[data-save]').textContent = `Ahorro anual: ${money(f.monthly.value * 12 - f.annual.value)}`; };
  f.addEventListener('input', sv); sv();
  m.el.querySelector('[data-ok]').onclick = () => {
    const lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);
    const val = { name: f.name.value.trim(), order: +f.order.value, monthly: +f.monthly.value, annual: +f.annual.value, classesPerWeek: +f.classesPerWeek.value, desc: f.desc.value.trim(), features: lines(f.features.value), missing: lines(f.missing.value), allBranches: f.allBranches.checked, highlight: f.highlight.checked, active: f.active.checked };
    if (!val.name || val.monthly <= 0) return toast('Nombre y precio son obligatorios', 'warning');
    if (val.highlight) db.query('plans', x => x.highlight && x.id !== p?.id).forEach(x => db.update('plans', x.id, { highlight: false }));
    p ? db.update('plans', p.id, val) : db.insert('plans', val);
    db.log('plan', `${p ? 'Editado' : 'Creado'}: ${val.name} · ${money(val.monthly)}/mes`, auth.current()?.id);
    toast('Plan guardado · precios públicos actualizados', 'success'); m.close();
  };
}
