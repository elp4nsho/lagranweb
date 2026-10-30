// Áreas / equipos: CRUD, jefatura y dotación.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete, personCell } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';

export function render(el, ctx) {
  const { db, idx } = ctx;
  const rows = idx.areas.map(a => {
    const ppl = idx.people.filter(p => p.areaId === a.id);
    return { ...a, n: ppl.length, inOffice: ppl.filter(p => ['oficina', 'reunion'].includes(idx.statusOf(p))).length, head: idx.byId[a.headId], headName: idx.byId[a.headId]?.name || '' };
  });
  const fields = [
    { name: 'name', label: 'Nombre del área', required: true },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'headId', label: 'Jefatura', type: 'select', options: [['', '— Sin jefatura —'], ...idx.people.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map(p => [p.id, p.name])], span: 2 },
    { name: 'description', label: 'Descripción', type: 'textarea', span: 2 }
  ];
  el.innerHTML = pageHead('Áreas y equipos', `${escape(idx.company.name)} · los colores se usan en el mapa, el directorio y el organigrama.`, '<button class="btn btn-primary" data-act="new">＋ Nueva área</button>') + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'areas', rows, search: r => `${r.name} ${r.headName}`, sort: 'name',
    columns: [
      { key: 'name', label: 'Área', render: r => `<span class="row gap-sm" style="flex-wrap:nowrap"><span class="area-tag badge plain" style="--c:${escape(r.color)}"><i></i>${escape(r.name)}</span></span>` },
      { key: 'headName', label: 'Jefatura', render: r => personCell(r.head) },
      { key: 'n', label: 'Personas' }, { key: 'inOffice', label: 'En oficina hoy' },
      { key: 'description', label: 'Descripción', sort: false, render: r => `<span class="muted small">${escape(r.description || '—')}</span>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('people', r.id, 'Ver personas')}${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    csv: { filename: 'areas.csv', map: r => ({ area: r.name, jefatura: r.headName, personas: r.n, en_oficina: r.inOffice }) }
  });
  onActs(el, {
    new: async () => { const v = await formDialog({ title: 'Nueva área', fields, values: { color: '#0ea5e9' } }); if (!v) return; db.insert('areas', { ...v, companyId: idx.company.id }); db.log('area', `Creó el área ${v.name}`, ctx.user.id); toast('Área creada', 'success'); },
    edit: async id => { const a = db.get('areas', id); const v = await formDialog({ title: `Editar ${a.name}`, fields, values: a }); if (!v) return; db.update('areas', id, v); db.log('area', `Editó el área ${v.name}`, ctx.user.id); toast('Área actualizada', 'success'); },
    people: id => { sessionStorage.setItem('oficina:areaFilter', id); location.hash = '#/empleados'; },
    del: id => {
      const a = db.get('areas', id), n = db.count('people', p => p.areaId === id);
      if (n) return toast(`No se puede eliminar: ${n} personas pertenecen a ${a.name}. Reasígnalas primero.`, 'warning', 4500);
      confirmDelete(`el área «${a.name}»`, () => db.remove('areas', id), { db, user: ctx.user, log: `Eliminó el área ${a.name}` });
    }
  });
}
