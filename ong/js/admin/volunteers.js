// Voluntariado: fichas de voluntarios (postulaciones, estado, horas) y programación de actividades con calendario.
import { db } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { monthCalendar } from '../shared/calendar.js';
import { escape, num, date, toast, confirm, formModal, modal } from '../../../assets/core/ui.js';

const VST = { postulante: ['Postulante', 'warning'], activo: ['Activo', 'success'], inactivo: ['Inactivo', ''] };
const TYPES = ['Construcción', 'Plantación', 'Educación', 'Logística', 'Comunicaciones', 'Cocina', 'Salud'];
let tab = 'actividades';
let cal = (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();

async function editVol(v, ctx) {
  const r = await formModal({ title: v ? `Editar ${v.name}` : 'Nuevo voluntario', fields: [
    { name: 'name', label: 'Nombre', value: v?.name || '', required: true }, { name: 'email', label: 'Correo', type: 'email', value: v?.email || '', required: true },
    { name: 'phone', label: 'Teléfono', value: v?.phone || '' }, { name: 'region', label: 'Región', value: v?.region || '' },
    { name: 'skills', label: 'Habilidades (separadas por coma)', value: (v?.skills || []).join(', ') },
    { name: 'availability', label: 'Disponibilidad', type: 'select', value: v?.availability || 'Fines de semana', options: ['Fines de semana', 'Semana', 'Vacaciones', 'Solo emergencias'] },
    { name: 'status', label: 'Estado', type: 'select', value: v?.status || 'activo', options: Object.entries(VST).map(([k, s]) => [k, s[0]]) },
    { name: 'hours', label: 'Horas acumuladas', type: 'number', value: v?.hours || 0 }
  ] });
  if (!r) return;
  r.skills = r.skills.split(',').map(s => s.trim()).filter(Boolean);
  if (v) db.update('volunteers', v.id, r); else db.insert('volunteers', r);
  db.log(v ? 'Voluntario editado' : 'Voluntario creado', r.name, ctx.user.id); toast('Voluntario guardado', 'success');
}

async function editAct(a, ctx) {
  const r = await formModal({ title: a ? 'Editar actividad' : 'Nueva actividad', size: 'lg', fields: [
    { name: 'title', label: 'Título', value: a?.title || '', required: true },
    { name: 'type', label: 'Tipo', type: 'select', value: a?.type || TYPES[0], options: TYPES },
    { name: 'date', label: 'Fecha', type: 'date', value: a?.date || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), required: true },
    { name: 'start', label: 'Hora de inicio', type: 'time', value: a?.start || '09:00' },
    { name: 'hours', label: 'Duración (horas)', type: 'number', value: a?.hours || 4 },
    { name: 'place', label: 'Lugar', value: a?.place || '', required: true },
    { name: 'slots', label: 'Cupos', type: 'number', value: a?.slots || 10, required: true },
    { name: 'projectId', label: 'Proyecto', type: 'select', value: a?.projectId || '', options: [['', 'Ninguno'], ...db.all('projects').map(p => [p.id, p.name])] },
    { name: 'coordinator', label: 'Coordinador/a', value: a?.coordinator || ctx.user.name },
    { name: 'description', label: 'Descripción', type: 'textarea', value: a?.description || '' }
  ] });
  if (!r) return;
  if (!(r.slots > 0)) return toast('Los cupos deben ser mayores a 0', 'warning');
  if (a) db.update('activities', a.id, r); else db.insert('activities', { ...r, enrolled: [], status: 'abierta' });
  db.log(a ? 'Actividad editada' : 'Actividad programada', `${r.title} · ${r.date}`, ctx.user.id); toast('Actividad guardada (visible en el sitio)', 'success');
}

function actModal(a, ctx) {
  const vols = db.all('volunteers');
  const enrolled = a.enrolled.map(id => vols.find(v => v.id === id)).filter(Boolean);
  const m = modal({ title: a.title, size: 'lg', body: `<div class="stack">
      <div class="row small" style="gap:6px">${badge(a.type, 'primary')}${badge(a.status === 'abierta' ? 'Abierta' : 'Realizada', a.status === 'abierta' ? 'success' : 'info')}${badge(`${a.enrolled.length}/${a.slots} inscritos`, a.enrolled.length >= a.slots ? 'danger' : '')}</div>
      <dl class="kv"><dt>Fecha</dt><dd>${escape(date(a.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${escape(a.start)} · ${a.hours} h</dd><dt>Lugar</dt><dd>${escape(a.place)}</dd><dt>Coordina</dt><dd>${escape(a.coordinator)}</dd></dl>
      <b>Inscritos</b>
      <div class="stack" style="gap:6px">${enrolled.map(v => `<div class="sum-line"><span>${escape(v.name)} <small class="muted">${escape(v.email)}</small></span><button class="btn btn-sm btn-ghost" data-rmv="${v.id}">Quitar</button></div>`).join('') || '<p class="muted small" style="margin:0">Nadie inscrito aún.</p>'}</div>
      ${a.status === 'abierta' && a.enrolled.length < a.slots ? `<div class="row" style="gap:8px;flex-wrap:nowrap"><select class="select" data-addsel aria-label="Agregar voluntario"><option value="">Agregar voluntario…</option>${vols.filter(v => v.status === 'activo' && !a.enrolled.includes(v.id)).map(v => `<option value="${v.id}">${escape(v.name)}</option>`).join('')}</select><button class="btn btn-sm" data-addv>Agregar</button></div>` : ''}
    </div>`,
    foot: `${ctx.role === 'admin' || ctx.role === 'coordinador' ? '<button class="btn btn-ghost" data-delact>Eliminar</button>' : ''}<button class="btn" data-editact>Editar</button>${a.status === 'abierta' ? '<button class="btn btn-primary" data-done>Marcar realizada (+horas)</button>' : ''}` });
  m.el.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    const cur = db.get('activities', a.id);
    if (t.dataset.rmv) { db.update('activities', a.id, { enrolled: cur.enrolled.filter(x => x !== t.dataset.rmv) }); m.close(); actModal(db.get('activities', a.id), ctx); }
    if (t.matches('[data-addv]')) { const id = m.el.querySelector('[data-addsel]').value; if (!id) return; db.update('activities', a.id, { enrolled: [...cur.enrolled, id] }); m.close(); actModal(db.get('activities', a.id), ctx); }
    if (t.matches('[data-editact]')) { m.close(); editAct(cur, ctx); }
    if (t.matches('[data-done]')) {
      cur.enrolled.forEach(id => { const v = db.get('volunteers', id); if (v) db.update('volunteers', id, { hours: (v.hours || 0) + cur.hours }); });
      db.update('activities', a.id, { status: 'realizada' });
      db.log('Actividad realizada', `${cur.title}: ${cur.enrolled.length} voluntarios +${cur.hours} h`, ctx.user.id);
      m.close(); toast(`Se sumaron ${cur.hours} h a ${cur.enrolled.length} voluntarios`, 'success');
    }
    if (t.matches('[data-delact]')) { m.close(); if (await confirm(`¿Eliminar «${cur.title}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('activities', a.id); db.log('Actividad eliminada', cur.title, ctx.user.id); toast('Actividad eliminada', 'success'); } }
  };
}

export default {
  id: 'voluntariado', label: 'Voluntariado', ico: '🤝', group: 'Programas', roles: ['admin', 'coordinador'],
  count: () => db.count('volunteers', v => v.status === 'postulante'),
  render(view, ctx) {
    const vols = db.all('volunteers'), acts = db.all('activities');
    const todayKey = new Date().toISOString().slice(0, 10);
    const upcoming = acts.filter(a => a.status === 'abierta' && a.date >= todayKey);
    view.innerHTML = `${pageHead('Voluntariado', 'Postulaciones, voluntarios y actividades (se publican en el calendario del sitio).', `<button class="btn" data-newvol>＋ Voluntario</button><button class="btn btn-primary" data-newact>＋ Actividad</button>`)}
      <div class="kpis">
        ${kpi('Voluntarios activos', num(vols.filter(v => v.status === 'activo').length), { ico: '🤝' })}
        ${kpi('Postulaciones', num(vols.filter(v => v.status === 'postulante').length), { ico: '📝' })}
        ${kpi('Horas donadas', num(vols.reduce((s, v) => s + (v.hours || 0), 0)), { ico: '⏱' })}
        ${kpi('Próximas actividades', num(upcoming.length), { ico: '📅', sub: `${upcoming.reduce((s, a) => s + Math.max(0, a.slots - a.enrolled.length), 0)} cupos libres` })}
      </div>
      <div class="tabs" role="tablist"><button class="tab ${tab === 'actividades' ? 'active' : ''}" data-tab="actividades" role="tab">Actividades</button><button class="tab ${tab === 'voluntarios' ? 'active' : ''}" data-tab="voluntarios" role="tab">Voluntarios</button></div>
      <div id="pane"></div>`;
    const pane = view.querySelector('#pane');
    if (tab === 'actividades') {
      pane.innerHTML = `<div class="dash-grid"><div class="card">${monthCalendar(cal.y, cal.m, acts.map(a => ({ id: a.id, date: a.date, title: a.title, cls: a.status !== 'abierta' ? 'past' : a.enrolled.length >= a.slots ? 'full' : '' })))}</div>
        <div class="card"><div class="card-title"><h3>Próximas</h3></div><div class="stack" style="gap:8px">${upcoming.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map(a => `<button class="card act-row hover" data-ev="${a.id}" type="button"><span class="date-chip"><b>${new Date(a.date + 'T12:00').getDate()}</b><small>${escape(new Date(a.date + 'T12:00').toLocaleDateString('es-CL', { month: 'short' }))}</small></span><span class="grow"><b>${escape(a.title)}</b><br><span class="small muted">${a.enrolled.length}/${a.slots} inscritos</span></span></button>`).join('') || '<p class="muted">Sin actividades.</p>'}</div></div></div>
        <div class="card" id="actTbl"></div>`;
      table(pane.querySelector('#actTbl'), {
        id: 'acts', rows: acts, sort: { key: 'date', dir: -1 }, search: a => `${a.title} ${a.place} ${a.type}`,
        filters: [{ key: 'status', label: 'Estado', options: [['abierta', 'Abierta'], ['realizada', 'Realizada']] }, { key: 'type', label: 'Tipo', options: TYPES.map(t => [t, t]) }],
        columns: [
          { key: 'date', label: 'Fecha', render: a => `${escape(date(a.date + 'T12:00'))}<br><small class="muted">${escape(a.start)}</small>` },
          { key: 'title', label: 'Actividad', render: a => `<b>${escape(a.title)}</b><br><small class="muted">${escape(a.place)}</small>` },
          { key: 'type', label: 'Tipo' },
          { key: 'enrolled', label: 'Inscritos', value: a => a.enrolled.length, render: a => `${a.enrolled.length}/${a.slots}` },
          { key: 'status', label: 'Estado', render: a => badge(a.status === 'abierta' ? 'Abierta' : 'Realizada', a.status === 'abierta' ? 'success' : 'info') }
        ],
        onRow: a => actModal(a, ctx),
        csv: { name: 'actividades.csv', map: a => ({ fecha: a.date, actividad: a.title, lugar: a.place, tipo: a.type, cupos: a.slots, inscritos: a.enrolled.length, estado: a.status }) }
      });
    } else {
      pane.innerHTML = '<div class="card" id="volTbl"></div>';
      table(pane.querySelector('#volTbl'), {
        id: 'vols', rows: vols, sort: { key: 'hours', dir: -1 }, search: v => `${v.name} ${v.email} ${v.skills.join(' ')} ${v.region}`,
        filters: [{ key: 'status', label: 'Estado', options: Object.entries(VST).map(([k, s]) => [k, s[0]]) }, { key: 'skill', label: 'Habilidad', options: TYPES.concat(['Fotografía']).map(t => [t, t]), test: (v, x) => v.skills.includes(x) }],
        columns: [
          { key: 'name', label: 'Voluntario', render: v => `<b>${escape(v.name)}</b><br><small class="muted">${escape(v.email)}</small>` },
          { key: 'skills', label: 'Habilidades', sort: false, render: v => v.skills.map(s => `<span class="badge plain">${escape(s)}</span>`).join(' ') },
          { key: 'availability', label: 'Disponibilidad' },
          { key: 'hours', label: 'Horas', render: v => num(v.hours || 0) },
          { key: 'acts', label: 'Actividades', value: v => acts.filter(a => a.enrolled.includes(v.id)).length, render: v => acts.filter(a => a.enrolled.includes(v.id)).length },
          { key: 'status', label: 'Estado', render: v => badge(...VST[v.status]) },
          { key: 'act', label: '', sort: false, render: v => `<div class="t-actions">${v.status === 'postulante' ? `<button class="btn btn-sm btn-primary" data-approve="${v.id}">Aprobar</button>` : ''}<button class="btn btn-sm btn-ghost" data-editv="${v.id}">Editar</button>${v.status === 'activo' ? `<button class="btn btn-sm btn-ghost" data-deact="${v.id}">Desactivar</button>` : ''}</div>` }
        ],
        csv: { name: 'voluntarios.csv', map: v => ({ nombre: v.name, correo: v.email, telefono: v.phone, region: v.region, habilidades: v.skills.join('|'), disponibilidad: v.availability, horas: v.hours, estado: v.status }) }
      });
    }
    view.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.tab) { tab = t.dataset.tab; this.render(view, ctx); }
      if (t.dataset.cal) { cal.m += +t.dataset.cal; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } this.render(view, ctx); }
      if (t.dataset.ev) actModal(db.get('activities', t.dataset.ev), ctx);
      if (t.matches('[data-newvol]')) editVol(null, ctx);
      if (t.matches('[data-newact]')) editAct(null, ctx);
      if (t.dataset.editv) editVol(db.get('volunteers', t.dataset.editv), ctx);
      if (t.dataset.approve) { const v = db.update('volunteers', t.dataset.approve, { status: 'activo' }); db.log('Voluntario aprobado', v.name, ctx.user.id); toast(`${v.name} aprobado`, 'success'); }
      if (t.dataset.deact) { const v = db.update('volunteers', t.dataset.deact, { status: 'inactivo' }); db.log('Voluntario desactivado', v.name, ctx.user.id); toast(`${v.name} desactivado`, 'info'); }
    };
  }
};
