import { escape, toast, confirm, formModal, date as fmtDate } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { leaderboard } from '../socio/shared.js';
import { member } from '../shared/domain.js';
import { ymd, addDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderChallenges(v) {
  v.innerHTML = `${pageHead('Desafíos', 'Retos de fidelización que los socios ven en su app con ranking.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo desafío</button>`)}<div class="card" data-list></div>`;
  const edit = async c => {
    const val = await formModal({ title: c ? 'Editar desafío' : 'Nuevo desafío', fields: [
      { name: 'name', label: 'Nombre', required: true, value: c?.name }, { name: 'desc', label: 'Descripción', value: c?.desc },
      { name: 'metric', label: 'Métrica', type: 'select', options: [['checkins', 'Visitas'], ['clases', 'Clases']], value: c?.metric }, { name: 'goal', label: 'Meta', type: 'number', value: c?.goal || 15 },
      { name: 'start', label: 'Inicio', type: 'date', value: c?.start || ymd() }, { name: 'end', label: 'Término', type: 'date', value: c?.end || addDays(ymd(), 30) },
      { name: 'prize', label: 'Premio', value: c?.prize }, { name: 'active', label: 'Activo', type: 'checkbox', value: c ? c.active : true }] });
    if (!val) return;
    if (val.end < val.start) return toast('La fecha de término debe ser posterior', 'warning');
    c ? db.update('challenges', c.id, val) : db.insert('challenges', val);
    db.log('desafío', `${c ? 'Editado' : 'Creado'}: ${val.name}`, auth.current()?.id); toast('Desafío guardado', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('challenges').map(c => { const lb = leaderboard(c); return { ...c, n: lb.length, leader: lb[0] ? `${member(lb[0].id)?.name} (${lb[0].score})` : '—' }; }),
    columns: [{ key: 'name', label: 'Desafío', render: c => `<b>${escape(c.name)}</b><br><small class="muted">${escape(c.desc || '')}</small>` }, { key: 'start', label: 'Periodo', render: c => `<small>${escape(fmtDate(c.start))} – ${escape(fmtDate(c.end))}</small>` },
      { key: 'goal', label: 'Meta', render: c => `${c.goal} ${c.metric === 'checkins' ? 'visitas' : 'clases'}` }, { key: 'n', label: 'Participantes' }, { key: 'leader', label: 'Líder' },
      { key: 'active', label: 'Estado', render: c => c.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge">Inactivo</span>' },
      { key: 'id', label: '', sort: false, render: c => `<div class="acts-cell">${actBtn('edit', c.id, 'edit', 'Editar')}${actBtn('del', c.id, 'trash', 'Eliminar')}</div>` }],
    onAction: async (act, id) => { const c = db.get('challenges', id); if (act === 'edit') return edit(c); if (await confirm(`¿Eliminar "${c.name}"?`, { title: 'Eliminar', danger: true, ok: 'Eliminar' })) { db.remove('challenges', id); toast('Desafío eliminado', 'success'); } },
    csv: { name: 'desafios.csv', map: c => ({ desafio: c.name, inicio: c.start, fin: c.end, meta: c.goal, participantes: c.n, lider: c.leader }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
