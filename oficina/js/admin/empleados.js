// Personas: CRUD completo, importación CSV, ficha de detalle y exportación.
import { escape, toast, modal, date, dateTime } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete, personCell } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { STATUS, statusBadge, areaTag, avatar, norm } from '../shared/util.js';
import { miniMap } from '../shared/floorplan.js';
import { fmtDay, today } from '../shared/dates.js';

const DAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie']];
const slugName = s => norm(s).replace(/[^a-z]/g, '');

function personFields(idx, p = {}) {
  const taken = new Set(idx.people.filter(x => x.deskId && x.id !== p.id).map(x => x.deskId));
  const desks = idx.floors.flatMap(f => f.desks.filter(d => !taken.has(d.id) && d.type !== 'bloqueado').map(d => [d.id, `${f.name} · ${d.code}${d.type === 'flexible' ? ' (flexible)' : ''}`]));
  return [
    { name: 'first', label: 'Nombre', required: true }, { name: 'last', label: 'Apellido', required: true },
    { name: 'cargo', label: 'Cargo', required: true, span: 2 },
    { name: 'areaId', label: 'Área', type: 'select', options: idx.areas.map(a => [a.id, a.name]) },
    { name: 'managerId', label: 'Jefatura directa', type: 'select', options: [['', '— Sin jefatura —'], ...idx.people.filter(x => x.id !== p.id).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(x => [x.id, x.name])] },
    { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'ext', label: 'Anexo' }, { name: 'city', label: 'Ciudad' },
    { name: 'since', label: 'En la empresa desde (año)', type: 'number', min: 1990, max: 2030 },
    { name: 'status', label: 'Estado de hoy', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
    { name: 'deskId', label: 'Puesto fijo', type: 'select', options: [['', '— Sin puesto fijo (flexible / remoto) —'], ...desks], span: 2 },
    { name: 'workDays', label: 'Días en oficina', type: 'checkboxes', options: DAYS, numeric: true, span: 2 },
    { name: 'remoteOnly', label: '100 % remoto (sin presencia en oficina)', type: 'checkbox' },
    { name: 'skills', label: 'Habilidades (separadas por coma)', span: 2 },
    { name: 'bio', label: 'Descripción breve', type: 'textarea', span: 2 }
  ];
}

export async function editPerson(ctx, id) {
  const { db, idx } = ctx;
  const p = id ? db.get('people', id) : null;
  const base = p ? { ...p, skills: (p.skills || []).join(', ') } : { areaId: idx.areas[0]?.id, status: 'oficina', workDays: [1, 2, 3, 4], city: idx.company.city, since: new Date().getFullYear(), ext: `${idx.company.ext}${100 + idx.people.length + 1}` };
  const v = await formDialog({
    title: p ? `Editar a ${p.name}` : 'Nueva persona', fields: personFields(idx, p || {}), values: base, size: 'lg',
    validate: v => db.find('people', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== id) ? 'Ya existe una persona con ese correo' : null
  });
  if (!v) return null;
  const data = { ...v, name: `${v.first} ${v.last}`, skills: v.skills.split(',').map(s => s.trim()).filter(Boolean), managerId: v.managerId || null, deskId: v.remoteOnly ? null : (v.deskId || null), workDays: v.remoteOnly ? [] : v.workDays };
  data.level = data.managerId ? Math.min(3, (db.get('people', data.managerId)?.level ?? 1) + 1) : 0;
  let row;
  if (p) { row = db.update('people', id, data); db.log('persona', `Editó la ficha de ${data.name}`, ctx.user.id); toast('Ficha actualizada', 'success'); }
  else { row = db.insert('people', { ...data, companyId: idx.company.id, gender: 'x', pronouns: '' }); db.log('persona', `Agregó a ${data.name} (${data.cargo})`, ctx.user.id); toast(`${data.name} agregada al directorio`, 'success'); }
  if (data.deskId) { const d = idx.desk[data.deskId]?.desk; if (d && d.type === 'flexible') setDeskType(db, data.deskId, 'fijo'); }
  return row;
}
export function setDeskType(db, deskId, type) {
  const f = db.find('floors', x => x.desks.some(d => d.id === deskId));
  if (!f) return;
  db.update('floors', f.id, { desks: f.desks.map(d => d.id === deskId ? { ...d, type } : d) });
}

function removePerson(ctx, id) {
  const { db } = ctx, p = db.get('people', id);
  return confirmDelete(`a ${p.name} del directorio (sus reservas futuras se cancelan)`, () => {
    db.query('reservations', r => r.personId === id && r.date >= today()).forEach(r => db.remove('reservations', r.id));
    db.query('people', x => x.managerId === id).forEach(x => db.update('people', x.id, { managerId: p.managerId || null }));
    db.query('users', u => u.personId === id).forEach(u => db.update('users', u.id, { personId: null, active: false }));
    db.remove('people', id);
  }, { db, user: ctx.user, log: `Eliminó a ${p.name}` });
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
  const head = split(lines[0]).map(h => norm(h));
  return lines.slice(1).map(l => { const c = split(l); return Object.fromEntries(head.map((h, i) => [h, c[i] || ''])); });
}
const SAMPLE = 'nombre;apellido;cargo;area;correo;telefono\nPaula;Leiva;Analista de datos;Datos;;+56 9 5111 2233\nMartín;Saavedra;Desarrollador frontend;Ingeniería;;\nRocío;Bravo;Diseñadora UI;Diseño;rocio.bravo@nebulalabs.demo;';

function importDialog(ctx) {
  const { db, idx } = ctx;
  let parsed = [];
  const m = modal({
    title: 'Importar personas desde CSV', size: 'lg',
    body: `<div class="stack">
      <p class="muted small" style="margin:0">Columnas: <span class="mono">nombre; apellido; cargo; area; correo; telefono</span> (separador ; o ,). Si falta el correo se genera con el dominio de ${escape(idx.company.domain)}. Las áreas se buscan por nombre.</p>
      <div class="row"><input class="input" type="file" accept=".csv,text/csv" data-file style="max-width:320px"><button type="button" class="btn btn-sm btn-ghost" data-sample>Usar ejemplo</button></div>
      <textarea class="textarea mono" data-text rows="6" placeholder="Pega aquí el contenido CSV…"></textarea>
      <label class="check"><input type="checkbox" data-mkarea checked> Crear áreas que no existan</label>
      <div data-preview></div></div>`,
    foot: '<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-go disabled>Importar</button>'
  });
  const ta = m.el.querySelector('[data-text]'), prev = m.el.querySelector('[data-preview]'), go = m.el.querySelector('[data-go]');
  const refresh = () => {
    parsed = parseCSV(ta.value).map(r => {
      const first = r.nombre || r.first || '', last = r.apellido || r.last || '';
      const area = idx.areas.find(a => norm(a.name) === norm(r.area));
      const email = r.correo || r.email || (first && last ? `${slugName(first)}.${slugName(last)}@${idx.company.domain}` : '');
      const err = !first || !last ? 'Falta nombre o apellido' : !r.cargo ? 'Falta cargo' : db.find('people', p => p.email.toLowerCase() === email.toLowerCase()) ? 'Correo duplicado' : '';
      return { first, last, cargo: r.cargo, areaName: r.area, area, email, phone: r.telefono || r.phone || '', err };
    });
    const ok = parsed.filter(r => !r.err).length;
    prev.innerHTML = parsed.length ? `<p class="small"><b>${ok}</b> de ${parsed.length} filas listas para importar.</p><div class="table-wrap"><table class="table compact"><thead><tr><th>Nombre</th><th>Cargo</th><th>Área</th><th>Correo</th><th>Estado</th></tr></thead><tbody>${parsed.map(r => `<tr><td>${escape(r.first)} ${escape(r.last)}</td><td>${escape(r.cargo)}</td><td>${escape(r.areaName)}${r.area ? '' : ' <span class="badge badge-warning">nueva</span>'}</td><td class="small">${escape(r.email)}</td><td>${r.err ? `<span class="badge badge-danger">${escape(r.err)}</span>` : '<span class="badge badge-success">OK</span>'}</td></tr>`).join('')}</tbody></table></div>` : '';
    go.disabled = !ok;
  };
  ta.addEventListener('input', refresh);
  m.el.querySelector('[data-sample]').onclick = () => { ta.value = SAMPLE; refresh(); };
  m.el.querySelector('[data-file]').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { ta.value = r.result; refresh(); }; r.readAsText(f); };
  go.onclick = () => {
    const mk = m.el.querySelector('[data-mkarea]').checked;
    let n = 0;
    parsed.filter(r => !r.err).forEach(r => {
      let areaId = r.area?.id;
      if (!areaId && r.areaName && mk) { const ex = db.find('areas', a => a.companyId === idx.company.id && norm(a.name) === norm(r.areaName)); areaId = ex ? ex.id : db.insert('areas', { companyId: idx.company.id, name: r.areaName, color: '#64748b', headId: null, description: 'Creada por importación' }).id; }
      if (!areaId) areaId = idx.areas[0]?.id;
      db.insert('people', { companyId: idx.company.id, first: r.first, last: r.last, name: `${r.first} ${r.last}`, cargo: r.cargo, areaId, email: r.email, phone: r.phone, ext: `${idx.company.ext}${200 + n}`, skills: [], status: 'remoto', since: new Date().getFullYear(), city: idx.company.city, remoteOnly: false, deskId: null, workDays: [2, 3, 4], level: 3, managerId: db.get('areas', areaId)?.headId || null, bio: '' });
      n++;
    });
    db.log('importar', `Importó ${n} personas desde CSV`, ctx.user.id);
    toast(`${n} personas importadas`, 'success');
    m.close();
  };
}

export function render(el, ctx) {
  const { idx } = ctx;
  const preset = sessionStorage.getItem('oficina:areaFilter');
  if (preset) { sessionStorage.removeItem('oficina:areaFilter'); }
  const rows = idx.people.map(p => {
    const sid = idx.seatOf(p);
    return { ...p, areaName: idx.area(p)?.name || '', st: idx.statusOf(p), seat: sid ? idx.desk[sid].desk.code : '', seatType: p.remoteOnly ? 'remoto' : p.deskId ? 'fijo' : 'flexible', mgrName: idx.byId[p.managerId]?.name || '' };
  });
  el.innerHTML = pageHead('Personas', `${escape(idx.company.name)} · ${idx.people.length} personas`, '<button class="btn" data-act="import">⭱ Importar CSV</button><button class="btn btn-primary" data-act="new">＋ Nueva persona</button>') + '<div data-t></div>';
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'empleados', rows, sort: 'name', pageSize: 12, placeholder: 'Buscar nombre, cargo, correo, anexo…',
    search: r => `${r.name} ${r.cargo} ${r.email} ${r.ext} ${r.areaName} ${(r.skills || []).join(' ')}`,
    filters: [
      { key: 'area', label: 'Área', options: idx.areas.map(a => [a.id, a.name]), test: (r, v) => r.areaId === v },
      { key: 'st', label: 'Estado', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]), test: (r, v) => r.st === v },
      { key: 'seat', label: 'Puesto', options: [['fijo', 'Puesto fijo'], ['flexible', 'Flexible'], ['remoto', '100 % remoto']], test: (r, v) => r.seatType === v }
    ],
    columns: [
      { key: 'name', label: 'Persona', render: r => personCell(r) },
      { key: 'areaName', label: 'Área', render: r => areaTag(idx.area(r)) },
      { key: 'st', label: 'Hoy', render: r => statusBadge(r.st) },
      { key: 'seat', label: 'Puesto', render: r => r.seat ? `<span class="mono">${escape(r.seat)}</span>` : `<span class="muted small">${r.seatType === 'remoto' ? 'Remoto' : 'Flexible'}</span>` },
      { key: 'email', label: 'Correo', render: r => `<span class="small">${escape(r.email)}</span>` },
      { key: 'ext', label: 'Anexo' },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('view', r.id, 'Ver')}${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    onRow: r => ctx.go(`/empleados/${r.id}`),
    csv: { filename: `personas-${idx.company.id}.csv`, map: r => ({ nombre: r.first, apellido: r.last, cargo: r.cargo, area: r.areaName, correo: r.email, telefono: r.phone, anexo: r.ext, puesto: r.seat, jefatura: r.mgrName, estado: STATUS[r.st]?.label }) }
  });
  if (preset) { const s = el.querySelector('[data-f="area"]'); if (s) { s.value = preset; s.dispatchEvent(new Event('change')); } }
  onActs(el, {
    new: () => editPerson(ctx), import: () => importDialog(ctx),
    view: id => ctx.go(`/empleados/${id}`), edit: id => editPerson(ctx, id), del: id => removePerson(ctx, id)
  });
  return t;
}

export function renderDetail(el, ctx, { id }) {
  const { db, idx } = ctx, p = idx.byId[id];
  if (!p) { el.innerHTML = `<div class="card empty">Persona no encontrada en ${escape(idx.company.name)}. <a href="#/empleados">Volver</a></div>`; return; }
  const sid = idx.seatOf(p), mgr = idx.byId[p.managerId], reps = idx.reports[p.id] || [];
  const res = db.query('reservations', r => r.personId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const vis = db.query('visitors', v => v.hostId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const user = db.find('users', u => u.personId === id);
  const resBadge = { reservada: 'badge-info', checkin: 'badge-success', completada: '', 'no-show': 'badge-danger', cancelada: '', liberada: 'badge-warning' };
  el.innerHTML = `${pageHead(p.name, `${escape(p.cargo)} · ${escape(idx.area(p)?.name || '')}`, `<a class="btn btn-ghost" href="#/empleados">← Volver</a><button class="btn" data-act="edit" data-id="${p.id}">✎ Editar</button><button class="btn btn-danger" data-act="del" data-id="${p.id}">Eliminar</button>`)}
    <div class="detail-grid">
      <div class="stack">
        <div class="card"><div class="profile-hero">${avatar(p, 64)}<div><b style="font-size:18px">${escape(p.name)}</b><div class="row gap-sm" style="margin-top:6px">${areaTag(idx.area(p))}${statusBadge(idx.statusOf(p))}</div></div></div>
          <dl class="kv"><dt>Correo</dt><dd>${escape(p.email)}</dd><dt>Teléfono</dt><dd>${escape(p.phone || '—')}</dd><dt>Anexo</dt><dd>${escape(p.ext)}</dd><dt>Ciudad</dt><dd>${escape(p.city || '')}</dd><dt>Desde</dt><dd>${escape(p.since)}</dd>
          <dt>Días oficina</dt><dd>${(p.workDays || []).map(d => DAYS.find(x => x[0] === d)?.[1]).join(', ') || 'Remoto'}</dd><dt>Cuenta</dt><dd>${user ? `${escape(ctx.auth.roleName(user.role))} · ${user.active === false ? 'inactiva' : 'activa'}` : '<span class="muted">Sin usuario</span>'}</dd></dl>
          ${(p.skills || []).length ? `<div class="row gap-sm" style="margin-top:12px">${p.skills.map(s => `<span class="skill">${escape(s)}</span>`).join('')}</div>` : ''}</div>
        <div class="card"><h3>Jefatura y equipo</h3>${mgr ? personCell(mgr, 'Jefatura directa') : '<p class="muted">Sin jefatura (máxima autoridad).</p>'}${reps.length ? `<div class="stack" style="gap:6px;margin-top:10px">${reps.map(r => `<a href="#/empleados/${r.id}" style="text-decoration:none;color:inherit">${personCell(r)}</a>`).join('')}</div>` : ''}</div>
      </div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Ubicación</h3>${ctx.can('asignacion') ? '<a class="small" href="#/asignacion">Gestionar puestos</a>' : ''}</div>${sid ? `<p><b>${escape(idx.desk[sid].floor.name)} · ${escape(idx.desk[sid].desk.code)}</b> <span class="muted">· ${escape(idx.desk[sid].zone?.name || '')} · ${p.deskId ? 'puesto fijo' : 'reserva de hoy'}</span></p>${miniMap(idx.desk[sid].floor, idx, sid)}` : `<p class="muted">${p.remoteOnly ? 'Trabaja 100 % remoto.' : 'Sin puesto fijo: reserva puestos flexibles.'}</p>`}</div>
        <div class="card"><h3>Reservas de puesto</h3>${res.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>Fecha</th><th>Puesto</th><th>Estado</th></tr></thead><tbody>${res.map(r => `<tr><td>${escape(fmtDay(r.date))}</td><td class="mono">${escape(idx.desk[r.deskId]?.desk.code || r.deskId)}</td><td><span class="badge ${resBadge[r.status] || ''}">${escape(r.status)}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin reservas.</p>'}</div>
        <div class="card"><h3>Visitas recibidas</h3>${vis.length ? `<ul class="log-list">${vis.map(v => `<li>🛎️ <span>${escape(v.name)} · ${escape(v.org)}<small>${escape(date(v.date + 'T12:00'))} · ${escape(v.reason)} · ${escape(v.status)}</small></span></li>`).join('')}</ul>` : '<p class="muted">Sin visitas registradas.</p>'}</div>
      </div>
    </div>`;
  onActs(el, { edit: () => editPerson(ctx, id), del: async () => { if (await removePerson(ctx, id)) ctx.go('/empleados'); } });
}
