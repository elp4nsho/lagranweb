// Onboarding: procesos de ingreso con checklist por responsable y plantilla editable.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';
import { formDialog } from '../shared/form.js';
import { personCell } from '../shared/util.js';
import { today, addDays } from '../shared/dates.js';

let open = null;
export function render(el, ctx) {
  const { db } = ctx;
  const list = db.all('onboarding').map(o => ({ ...o, e: db.get('employees', o.employeeId) })).filter(o => o.e).sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (!open || !list.find(o => o.id === open)) open = list[0]?.id;
  const cur = list.find(o => o.id === open);
  const pct = o => Math.round(o.tasks.filter(t => t.done).length / (o.tasks.length || 1) * 100);
  const tpl = db.getValue('onboardingTemplate', []);
  el.innerHTML = `${pageHead('Onboarding', 'Checklist de ingreso para cada nueva persona (se crea automáticamente al contratar desde el ATS).', '<button class="btn" data-tpl>✎ Plantilla</button><button class="btn btn-primary" data-new>＋ Nuevo onboarding</button>')}
    <div class="dash-grid">
      <div class="span-4 stack">${list.map(o => `<button class="card" data-open="${o.id}" style="text-align:left;cursor:pointer;font:inherit;color:inherit;${o.id === open ? 'border-color:var(--primary);box-shadow:var(--focus)' : ''}">${personCell(o.e)}<div class="row between small" style="margin-top:10px"><span class="muted">${o.startDate > today() ? 'Ingresa' : 'Ingresó'} ${escape(date(o.startDate + 'T12:00'))}</span><b>${pct(o)} %</b></div><div class="progress" style="margin-top:6px"><i style="--v:${pct(o)}%"></i></div></button>`).join('') || '<div class="card empty">Sin procesos de onboarding.</div>'}</div>
      <div class="card span-8">${cur ? `<div class="card-h"><h3>${escape(cur.e.name)} · ${escape(cur.e.position)}</h3><span class="badge ${pct(cur) === 100 ? 'badge-success' : 'badge-info'}">${pct(cur)} % completado</span></div>
        ${['RRHH', 'TI', 'Prevención', 'Jefatura', 'Colaborador'].map(owner => { const ts = cur.tasks.filter(t => t.owner === owner); return ts.length ? `<h4 style="margin:14px 0 4px">${escape(owner)}</h4>${ts.map(t => `<label class="task ${t.done ? 'done' : ''}"><input type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''}><span class="t">${escape(t.title)}<small>Vence ${escape(date(t.due + 'T12:00'))}${!t.done && t.due < today() ? ' · <b class="danger">atrasada</b>' : ''}</small></span></label>`).join('')}` : ''; }).join('')}
        <form class="row" data-add style="margin-top:12px"><input class="input" name="t" placeholder="Agregar tarea…" aria-label="Nueva tarea" style="flex:1 1 200px"><select class="select" name="o" aria-label="Responsable" style="width:auto">${['RRHH', 'TI', 'Jefatura', 'Colaborador', 'Prevención'].map(o => `<option>${o}</option>`).join('')}</select><button class="btn" type="submit">Agregar</button></form>` : '<div class="empty">Selecciona un proceso.</div>'}</div>
    </div>`;
  el.onclick = async e => {
    const o = e.target.closest('[data-open]');
    if (o) { open = o.dataset.open; render(el, ctx); }
    if (e.target.closest('[data-new]')) {
      const candidates = db.query('employees', x => x.status === 'activo' && !db.find('onboarding', ob => ob.employeeId === x.id)).sort((a, b) => b.hireDate.localeCompare(a.hireDate));
      const v = await formDialog({ title: 'Nuevo onboarding', fields: [{ name: 'employeeId', label: 'Colaborador', type: 'select', options: candidates.map(x => [x.id, `${x.name} · ingreso ${x.hireDate}`]), span: 2 }] });
      if (!v) return;
      const emp = db.get('employees', v.employeeId);
      const row = db.insert('onboarding', { employeeId: emp.id, startDate: emp.hireDate, buddyId: null, tasks: tpl.map((t, i) => ({ id: `t${i}`, title: t.title, owner: t.owner, due: addDays(emp.hireDate, t.offset), done: false })) });
      open = row.id; db.log('onboarding', `Inició el onboarding de ${emp.name}`, ctx.user.id); toast('Onboarding creado desde la plantilla', 'success');
    }
    if (e.target.closest('[data-tpl]')) {
      const v = await formDialog({ title: 'Plantilla de onboarding', fields: [{ name: 'lines', label: 'Una tarea por línea: Título | Responsable | días desde el ingreso', type: 'textarea', span: 2 }], values: { lines: tpl.map(t => `${t.title} | ${t.owner} | ${t.offset}`).join('\n') }, size: 'lg' });
      if (!v) return;
      db.setValue('onboardingTemplate', v.lines.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).map(([title, owner = 'RRHH', off = '0']) => ({ title, owner, offset: +off || 0 })));
      db.log('onboarding', 'Actualizó la plantilla de onboarding', ctx.user.id); toast('Plantilla guardada', 'success');
    }
  };
  el.querySelectorAll('[data-task]').forEach(c => c.onchange = () => { db.update('onboarding', cur.id, { tasks: cur.tasks.map(t => t.id === c.dataset.task ? { ...t, done: c.checked } : t) }); });
  el.querySelector('[data-add]')?.addEventListener('submit', e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; db.update('onboarding', cur.id, { tasks: [...cur.tasks, { id: 't' + Date.now().toString(36), title: t, owner: e.target.o.value, due: addDays(today(), 3), done: false }] }); toast('Tarea agregada', 'success'); });
}
