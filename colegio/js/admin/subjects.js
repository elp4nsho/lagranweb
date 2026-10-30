// Asignaturas: CRUD del plan de estudios.
import { escape, formModal, toast, confirm as ask, downloadCSV, slug } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/kit.js';
import { subjectTone, user } from '../shared/academic.js';

async function edit(db, me, s = null) {
  const v = await formModal({
    title: s ? `Editar ${s.name}` : 'Nueva asignatura', fields: [
      { name: 'name', label: 'Nombre', required: true, value: s?.name },
      { name: 'short', label: 'Nombre corto', required: true, value: s?.short },
      { name: 'code', label: 'Código', required: true, value: s?.code, placeholder: 'Ej: FIL' },
      { name: 'hours', label: 'Horas semanales sugeridas', type: 'number', value: s?.hours ?? 2 },
      { name: 'active', label: 'Activa', type: 'checkbox', value: s ? s.active !== false : true }
    ]
  });
  if (!v) return;
  if (s) db.update('subjects', s.id, v);
  else db.insert('subjects', { ...v, id: slug(v.code).slice(0, 6) + '-' + Date.now().toString(36).slice(-3) });
  db.log('asignatura', `Asignatura ${v.name} ${s ? 'actualizada' : 'creada'}`, me.id);
  toast(s ? 'Asignatura actualizada' : 'Asignatura creada', 'success');
}

export function render(el, { db, me, isAdmin }) {
  const rows = db.all('subjects').map(s => {
    const t = db.query('teaching', x => x.subjectId === s.id);
    return { ...s, courses: t.length, teachers: [...new Set(t.map(x => x.teacherId))].map(id => user(id)?.name).filter(Boolean).join(', ') };
  });
  el.innerHTML = `${pageHead('Asignaturas', 'Plan de estudios del colegio', `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nueva asignatura</button>`)}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'subjects', rows, search: r => r.name + r.code + r.teachers,
    filters: [{ key: 'active', label: 'Estado', options: [['true', 'Activas'], ['false', 'Inactivas']], test: (r, v) => String(r.active !== false) === v }],
    columns: [
      { key: 'name', label: 'Asignatura', render: r => `<span class="dot-tone" style="--tone:${subjectTone(r.id)}"></span><b>${escape(r.name)}</b>` },
      { key: 'code', label: 'Código', render: r => `<span class="mono">${escape(r.code)}</span>` },
      { key: 'hours', label: 'Horas' }, { key: 'courses', label: 'Cursos' },
      { key: 'teachers', label: 'Docentes', render: r => `<span class="small">${escape(r.teachers || '—')}</span>` },
      { key: 'active', label: 'Estado', render: r => r.active !== false ? badge('Activa', 'success') : badge('Inactiva') },
      { key: 'x', label: '', sort: false, render: () => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${isAdmin ? '<button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button>' : ''}</div>` }
    ],
    onAction: async (act, r) => {
      if (act === 'edit') return edit(db, me, db.get('subjects', r.id));
      if (r.courses) return toast(`${r.name} se dicta en ${r.courses} cursos. Desactívala o quítala de los cursos primero.`, 'warning');
      if (await ask(`¿Eliminar ${r.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('subjects', r.id); db.log('asignatura', `Asignatura ${r.name} eliminada`, me.id); toast('Asignatura eliminada', 'success'); }
    }
  });
  el.querySelector('[data-new]').onclick = () => edit(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('asignaturas.csv', rows.map(r => ({ asignatura: r.name, codigo: r.code, horas: r.hours, cursos: r.courses, docentes: r.teachers })));
}
