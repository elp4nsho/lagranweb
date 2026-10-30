// Personal y turnos: CRUD del personal y grilla semanal editable (mañana / tarde / noche / libre).
import { escape, toast, confirm, date } from '../../../assets/core/ui.js';
import { pageHead, crudTable, editForm, dayKey } from '../shared/kit.js';

const SH = { '': 'Libre', M: 'Mañana 07–15', T: 'Tarde 15–23', N: 'Noche 23–07' };
const NEXT = { '': 'M', M: 'T', T: 'N', N: '' };
let weekOffset = 0;

export function renderStaff(el, p, q, ctx) {
  const { db, user } = ctx;
  const mon = new Date(); mon.setHours(12, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; });
  const staff = db.query('staff', s => s.active);
  const shiftOf = (sid, k) => db.find('shifts', s => s.staffId === sid && s.date === k);
  const conserjeGaps = days.map(d => ['M', 'T', 'N'].filter(s => !db.find('shifts', x => x.date === dayKey(d) && x.shift === s && db.get('staff', x.staffId)?.role === 'Conserje')));
  el.innerHTML = `${pageHead('Personal y turnos', `${staff.length} personas activas`, '<button class="btn btn-primary" data-new>+ Nueva persona</button>')}
    <div class="card"><div class="row between" style="margin-bottom:12px"><button class="btn btn-sm" data-w="-1">← Semana anterior</button><h3 style="margin:0">Semana del ${date(days[0], { day: 'numeric', month: 'long' })}</h3><button class="btn btn-sm" data-w="1">Semana siguiente →</button></div>
      <div class="table-wrap"><table class="table shift-grid"><thead><tr><th>Persona</th>${days.map(d => `<th>${d.toLocaleDateString('es-CL', { weekday: 'short' })}<br>${d.getDate()}</th>`).join('')}</tr></thead><tbody>
      ${staff.map(s => `<tr><td><b>${escape(s.name)}</b><br><span class="muted small">${escape(s.role)}</span></td>${days.map(d => { const k = dayKey(d), sh = shiftOf(s.id, k)?.shift || ''; return `<td><button class="shift s-${sh || 'L'}" data-cell="${s.id}|${k}" title="${SH[sh]}">${sh || '—'}</button></td>`; }).join('')}</tr>`).join('')}
      <tr><td class="small muted">Cobertura conserjería</td>${conserjeGaps.map(g => `<td>${g.length ? `<span class="badge badge-danger" title="Sin conserje: ${g.join(', ')}">Falta ${g.join('/')}</span>` : '<span class="badge badge-success">OK</span>'}</td>`).join('')}</tr>
      </tbody></table></div><p class="small muted" style="margin:8px 0 0">Haz clic en una celda para rotar: — libre → M mañana → T tarde → N noche.</p></div>
    <div data-t></div>`;
  el.querySelectorAll('[data-cell]').forEach(b => b.onclick = () => {
    const [sid, k] = b.dataset.cell.split('|'), cur = shiftOf(sid, k), next = NEXT[cur?.shift || ''];
    if (cur && !next) db.remove('shifts', cur.id); else if (cur) db.update('shifts', cur.id, { shift: next }); else db.insert('shifts', { staffId: sid, date: k, shift: next });
    db.log('turnos', `${user.name} asignó ${SH[next]} a ${db.get('staff', sid).name} el ${k}`, user.id); ctx.refresh();
  });
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { weekOffset += +b.dataset.w; ctx.refresh(); });
  const form = s => editForm({ title: s ? 'Editar persona' : 'Nueva persona', values: s || { role: 'Conserje', active: true }, fields: [
    { name: 'name', label: 'Nombre', required: true }, { name: 'rut', label: 'RUT', required: true }, { name: 'role', label: 'Cargo', type: 'select', options: ['Conserje', 'Mayordomo', 'Aseo', 'Jardinero', 'Mantención'] },
    { name: 'phone', label: 'Teléfono' }, { name: 'active', label: 'Activo', type: 'checkbox' }] });
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('staff'), search: s => `${s.name} ${s.rut} ${s.role}`, filters: [{ key: 'role', label: 'Cargo', options: ['Conserje', 'Mayordomo', 'Aseo', 'Jardinero', 'Mantención'] }],
    columns: [
      { key: 'name', label: 'Nombre', render: s => `<b>${escape(s.name)}</b><br><span class="muted small">${escape(s.rut)}</span>` }, { key: 'role', label: 'Cargo' }, { key: 'phone', label: 'Teléfono' },
      { key: 'userId', label: 'Acceso app', render: s => s.userId ? '<span class="badge badge-success">Conserjería</span>' : '—' },
      { key: 'since', label: 'Desde', render: s => `<span class="small">${date(s.since || s.createdAt)}</span>` },
      { key: 'active', label: 'Estado', render: s => `<span class="badge ${s.active ? 'badge-success' : ''}">${s.active ? 'Activo' : 'Inactivo'}</span>` },
      { key: 'id', label: '', sort: false, render: s => `<div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${s.id}">✎</button><button class="btn btn-sm btn-ghost" data-del="${s.id}">🗑</button></div>` }
    ],
    csv: { name: 'personal.csv', map: s => ({ nombre: s.name, rut: s.rut, cargo: s.role, telefono: s.phone, activo: s.active ? 'sí' : 'no' }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await form(); if (r) { db.insert('staff', { ...r, since: new Date().toISOString(), userId: null }); db.log('personal', `${user.name} agregó a ${r.name}`, user.id); toast('Persona agregada', 'success'); ctx.refresh(); } };
  el.querySelector('[data-t]').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { const s = db.get('staff', b.dataset.edit), r = await form(s); if (r) { db.update('staff', s.id, r); toast('Datos actualizados', 'success'); ctx.refresh(); } }
    if (b.dataset.del) { const s = db.get('staff', b.dataset.del); if (await confirm(`¿Eliminar a ${s.name} y sus turnos?`, { danger: true, ok: 'Eliminar' })) { db.query('shifts', x => x.staffId === s.id).forEach(x => db.remove('shifts', x.id)); db.remove('staff', s.id); db.log('personal', `${user.name} eliminó a ${s.name}`, user.id); toast('Persona eliminada', 'success'); ctx.refresh(); } }
  });
  void tbl;
}
