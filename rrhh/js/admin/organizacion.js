// Estructura organizacional: áreas (CRUD), jefaturas, centros de costo y organigrama.
import { escape, toast, money } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { personCell, avatar } from '../shared/util.js';

export function render(el, ctx) {
  const { db } = ctx;
  const emps = db.query('employees', e => e.status !== 'desvinculado');
  const depts = db.all('departments');
  const rows = depts.map(d => { const ppl = emps.filter(e => e.deptId === d.id); return { ...d, n: ppl.length, head: db.get('employees', d.headId), headName: db.get('employees', d.headId)?.name || '', parent: depts.find(x => x.id === d.parentId)?.name || '—', payroll: ppl.reduce((s, e) => s + e.salary, 0) }; });
  const root = depts.find(d => !d.parentId);
  const kids = id => depts.filter(d => d.parentId === id);
  const node = d => { const r = rows.find(x => x.id === d.id); return `<button type="button" class="dept-node" style="--c:${escape(d.color)}" data-act="edit" data-id="${d.id}"><b>${escape(d.name)}</b><span class="row gap-sm" style="flex-wrap:nowrap">${r.head ? avatar(r.head, 28) : ''}<small>${escape(r.headName || 'Sin jefatura')}</small></span><span class="muted small">${r.n} personas · ${escape(d.costCenter || '')}</span></button>`; };
  const fields = [
    { name: 'name', label: 'Nombre', required: true }, { name: 'costCenter', label: 'Centro de costo' },
    { name: 'headId', label: 'Jefatura', type: 'select', options: [['', '— Sin jefatura —'], ...emps.sort((a, b) => a.name.localeCompare(b.name, 'es')).map(e => [e.id, e.name])] },
    { name: 'parentId', label: 'Depende de', type: 'select', options: [['', '— Nivel superior —'], ...depts.map(d => [d.id, d.name])] },
    { name: 'color', label: 'Color', type: 'color' }
  ];
  el.innerHTML = `${pageHead('Estructura organizacional', `${depts.length} áreas · ${emps.length} colaboradores activos`, '<button class="btn btn-primary" data-act="new">＋ Nueva área</button>')}
    <div class="card"><h3>Organigrama por áreas</h3><div class="org-tree">${root ? `<div class="lvl">${node(root)}</div><div class="lvl">${kids(root.id).map(node).join('')}</div>${depts.some(d => d.parentId && d.parentId !== root.id) ? `<div class="lvl">${depts.filter(d => d.parentId && d.parentId !== root.id).map(node).join('')}</div>` : ''}` : ''}</div></div>
    <div data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'org', rows, sort: 'name', search: r => `${r.name} ${r.headName} ${r.costCenter}`,
    columns: [
      { key: 'name', label: 'Área', render: r => `<span class="badge plain" style="border-left:4px solid ${escape(r.color)}">${escape(r.name)}</span>` },
      { key: 'headName', label: 'Jefatura', render: r => personCell(r.head) }, { key: 'parent', label: 'Depende de' },
      { key: 'costCenter', label: 'C. costo' }, { key: 'n', label: 'Dotación' }, { key: 'payroll', label: 'Masa salarial base', render: r => money(r.payroll) },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    csv: { filename: 'estructura.csv', map: r => ({ area: r.name, jefatura: r.headName, depende_de: r.parent, centro_costo: r.costCenter, dotacion: r.n, masa_salarial: r.payroll }) }
  });
  onActs(el, {
    new: async () => { const v = await formDialog({ title: 'Nueva área', fields, values: { color: '#3f51b5', parentId: root?.id } }); if (!v) return; db.insert('departments', { ...v, headId: v.headId || null, parentId: v.parentId || null }); db.log('estructura', `Creó el área ${v.name}`, ctx.user.id); toast('Área creada', 'success'); },
    edit: async id => { const d = db.get('departments', id); const v = await formDialog({ title: `Editar ${d.name}`, fields, values: d }); if (!v) return; if (v.parentId === id) return toast('Un área no puede depender de sí misma', 'warning'); db.update('departments', id, { ...v, headId: v.headId || null, parentId: v.parentId || null }); if (v.headId) db.query('employees', e => e.deptId === id && e.id !== v.headId && e.managerId === d.headId).forEach(e => db.update('employees', e.id, { managerId: v.headId })); db.log('estructura', `Editó el área ${v.name}`, ctx.user.id); toast('Área actualizada (jefaturas reasignadas)', 'success'); },
    del: id => { const d = db.get('departments', id), n = db.count('employees', e => e.deptId === id && e.status !== 'desvinculado'); if (n) return toast(`No se puede eliminar: ${n} colaboradores pertenecen a ${d.name}`, 'warning', 4500); confirmDelete(`el área «${d.name}»`, () => db.remove('departments', id), { db, user: ctx.user, log: `Eliminó el área ${d.name}` }); }
  });
}
