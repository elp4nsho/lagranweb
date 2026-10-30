// Equipos comerciales: líder, integrantes y desempeño.
import { db, auth } from '../data/db.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { OPEN_STAGES } from '../shared/constants.js';
import { pageHead, openForm, field, opt } from '../app/components.js';
import { avatar, moneyShort, userName, DAY } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const teams = db.all('teams');
  const users = db.query('users', u => u.active !== false);
  const since = Date.now() - 90 * DAY;
  const noTeam = users.filter(u => !u.teamId && u.role !== 'admin');
  view.innerHTML = `
    ${pageHead('Equipos', `${teams.length} equipos comerciales`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo equipo</button>`)}
    <div class="grid-2">${teams.map(t => {
      const members = users.filter(u => u.teamId === t.id);
      const ids = members.map(m => m.id);
      const pipe = db.query('deals', d => ids.includes(d.ownerId) && OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.amount, 0);
      const won = db.query('deals', d => ids.includes(d.ownerId) && d.stage === 'ganado' && new Date(d.closedAt) > since).reduce((s, d) => s + d.amount, 0);
      return `<article class="card stack">
        <div class="row between"><h3 style="margin:0">${escape(t.name)}</h3><div class="row" style="gap:4px"><button class="btn btn-sm" data-edit="${t.id}" aria-label="Editar equipo">${icon('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-del="${t.id}" aria-label="Eliminar equipo">${icon('trash', 14)}</button></div></div>
        <p class="muted small" style="margin:0">${escape(t.description || '')}</p>
        <div class="grid-2"><div class="stat"><span class="label">Pipeline</span><span class="value">${moneyShort(pipe)}</span></div><div class="stat"><span class="label">Ganado 90 días</span><span class="value">${moneyShort(won)}</span></div></div>
        <small class="muted">Líder: <b>${escape(userName(t.leaderId))}</b></small>
        <div class="member-list">${members.map(m => `<div class="row between member"><span class="user-chip">${avatar(m, 28)}<span>${escape(m.name)}<br><small class="muted">${escape(auth.roleName(m.role))}</small></span></span><button class="btn btn-ghost btn-sm" data-out="${m.id}">Quitar</button></div>`).join('') || '<div class="empty small">Sin integrantes</div>'}</div>
        ${noTeam.length ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><select class="select select-sm" data-addsel="${t.id}" aria-label="Agregar integrante">${noTeam.map(u => opt(u.id, u.name)).join('')}</select><button class="btn btn-sm" data-add="${t.id}">Agregar</button></div>` : ''}
      </article>`;
    }).join('')}</div>
    ${noTeam.length ? `<section class="card stack"><h3 style="margin:0">Sin equipo</h3><div class="row">${noTeam.map(u => `<span class="user-chip">${avatar(u, 26)}<span>${escape(u.name)}</span></span>`).join('')}</div></section>` : ''}`;
  view.querySelector('[data-new]').onclick = () => teamModal();
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => teamModal(db.get('teams', b.dataset.edit)));
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const t = db.get('teams', b.dataset.del);
    if (!await confirm(`¿Eliminar el equipo ${t.name}? Sus integrantes quedarán sin equipo.`, { danger: true, ok: 'Eliminar' })) return;
    db.query('users', u => u.teamId === t.id).forEach(u => db.update('users', u.id, { teamId: null }));
    db.remove('teams', t.id); db.log('equipos', `Eliminó el equipo ${t.name}`, user.id); toast('Equipo eliminado', 'success');
  });
  view.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { db.update('users', b.dataset.out, { teamId: null }); toast('Integrante quitado', 'success'); });
  view.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const uid = view.querySelector(`[data-addsel="${b.dataset.add}"]`).value;
    db.update('users', uid, { teamId: b.dataset.add });
    db.log('equipos', `Agregó a ${userName(uid)} al equipo ${db.get('teams', b.dataset.add).name}`, user.id);
    toast('Integrante agregado', 'success');
  });
}

function teamModal(t = null) {
  const me = auth.current();
  const leaders = db.query('users', u => u.active !== false && u.role !== 'ejecutivo');
  openForm({
    title: t ? 'Editar equipo' : 'Nuevo equipo',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(t?.name || '')}" required>`)}${field('Descripción', `<input class="input" name="description" value="${escape(t?.description || '')}">`)}${field('Líder', `<select class="select" name="leaderId">${leaders.map(u => opt(u.id, u.name, t?.leaderId)).join('')}</select>`)}`,
    onSubmit: (f, v) => {
      const patch = { name: v.name.trim(), description: v.description.trim(), leaderId: v.leaderId };
      t ? db.update('teams', t.id, patch) : db.insert('teams', patch);
      db.log('equipos', `${t ? 'Editó' : 'Creó'} el equipo ${patch.name}`, me.id);
      toast('Equipo guardado', 'success');
    }
  });
}
