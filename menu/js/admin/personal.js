// Personal y turnos: equipo (CRUD) y planilla semanal de turnos.
import { escape, toast, confirm, formModal, money, date as fmtDate, modal } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { isoDay, COLORS } from '../data/seed.js';

const AREAS = { caliente: 'Cocina caliente', parrilla: 'Parrilla', fria: 'Cocina fría', postres: 'Pastelería', barra: 'Barra', salon: 'Salón', terraza: 'Terraza', caja: 'Caja' };
const toMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
const hoursOf = sh => { let d = toMin(sh.end) - toMin(sh.start); if (d <= 0) d += 1440; return d / 60; };

async function editStaff(s, ctx) {
  const v = await formModal({ title: s ? `Editar · ${s.name}` : 'Nuevo integrante', fields: [
    { name: 'name', label: 'Nombre completo', required: true, value: s?.name }, { name: 'position', label: 'Cargo', required: true, value: s?.position || 'Garzón' },
    { name: 'area', label: 'Área', type: 'select', options: Object.entries(AREAS), value: s?.area || 'salon' }, { name: 'phone', label: 'Teléfono', value: s?.phone },
    { name: 'hourly', label: 'Valor hora (CLP)', type: 'number', value: s?.hourly || 4500 }, { name: 'active', label: 'Activo', type: 'checkbox', value: s ? s.active !== false : true }] });
  if (!v) return;
  if (s) db.update('staff', s.id, v); else db.insert('staff', { ...v, color: COLORS[db.count('staff') % COLORS.length], hiredAt: new Date().toISOString() });
  db.log('personal', `${s ? 'Editado' : 'Agregado'}: ${v.name} (${v.position})`, ctx.user.id);
  toast('Guardado', 'success');
}

function shiftModal(staff, day, sh, ctx) {
  const m = modal({ title: `${staff.name} · ${fmtDate(day + 'T12:00', { weekday: 'long', day: 'numeric', month: 'short' })}`, body: `<form class="stack" id="shf">
      <div class="row chips">${[['11:30', '17:00', 'Almuerzo'], ['18:30', '00:30', 'Cena'], ['12:00', '23:30', 'Completo']].map(([a, b, l]) => `<button type="button" class="chip" data-p="${a}-${b}">${l} ${a}–${b}</button>`).join('')}</div>
      <div class="grid-2"><div class="field"><label for="sh-a">Entrada</label><input class="input" type="time" id="sh-a" value="${sh?.start || '12:00'}"></div><div class="field"><label for="sh-b">Salida</label><input class="input" type="time" id="sh-b" value="${sh?.end || '17:00'}"></div></div>
      <div class="field"><label for="sh-n">Nota</label><input class="input" id="sh-n" value="${escape(sh?.note || '')}"></div></form>`,
    foot: `${sh ? '<button class="btn btn-danger" data-delsh>Quitar turno</button><span class="grow"></span>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-savesh>Guardar</button>` });
  const f = m.el.querySelector('#shf');
  f.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p) { const [a, b] = p.dataset.p.split('-'); f.querySelector('#sh-a').value = a; f.querySelector('#sh-b').value = b; } });
  m.el.querySelector('[data-savesh]').onclick = () => {
    const data = { staffId: staff.id, date: day, start: f.querySelector('#sh-a').value, end: f.querySelector('#sh-b').value, note: f.querySelector('#sh-n').value.trim() };
    if (!data.start || !data.end) { toast('Indica entrada y salida', 'warning'); return; }
    sh ? db.update('shifts', sh.id, data) : db.insert('shifts', data);
    db.log('turnos', `Turno ${data.start}–${data.end} para ${staff.name} el ${day}`, ctx.user.id);
    toast('Turno guardado', 'success'); m.close();
  };
  m.el.querySelector('[data-delsh]')?.addEventListener('click', () => { db.remove('shifts', sh.id); db.log('turnos', `Turno quitado a ${staff.name} el ${day}`, ctx.user.id); toast('Turno quitado', 'success'); m.close(); });
}

export default {
  id: 'personal', label: 'Personal y turnos', icon: '👥', group: 'Gestión', roles: ['admin', 'chef'], watch: ['staff', 'shifts'],
  render(el, ctx) {
    const tab = ctx.params.sub || 'turnos';
    el.innerHTML = `${pageHead('Personal y turnos', 'Equipo del restaurante y planificación semanal', '<button class="btn btn-primary btn-sm" data-newstaff>+ Integrante</button>')}
      <div class="tabs"><a class="tab ${tab === 'turnos' ? 'active' : ''}" href="#/personal/turnos">Turnos</a><a class="tab ${tab === 'equipo' ? 'active' : ''}" href="#/personal/equipo">Equipo</a></div><div data-body></div>`;
    el.querySelector('[data-newstaff]').onclick = () => editStaff(null, ctx);
    const body = el.querySelector('[data-body]');
    if (tab === 'equipo') {
      body.addEventListener('click', async e => {
        const b = e.target.closest('[data-delstaff]'); if (!b) return;
        const s = db.get('staff', b.dataset.delstaff);
        if (await confirm(`¿Eliminar a ${s.name}? Se borrarán sus turnos.`, { danger: true, ok: 'Eliminar' })) { db.query('shifts', x => x.staffId === s.id).forEach(x => db.remove('shifts', x.id)); db.remove('staff', s.id); db.log('personal', `Eliminado: ${s.name}`, ctx.user.id); }
      });
      return smartTable(body, {
        rows: () => db.all('staff').map(s => ({ ...s, areaLabel: AREAS[s.area], week: db.query('shifts', x => x.staffId === s.id).reduce((a, x) => a + hoursOf(x), 0) })),
        filters: [{ key: 'area', label: 'Área', options: Object.entries(AREAS) }, { key: 'active', label: 'Estado', options: [['true', 'Activos'], ['false', 'Inactivos']], test: (r, v) => String(r.active !== false) === v }],
        search: r => `${r.name} ${r.position}`,
        columns: [
          { key: 'name', label: 'Nombre', render: r => `<span class="row nowrap" style="gap:10px"><span class="avatar" style="--av:${escape(r.color)}">${escape(r.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span><b>${escape(r.name)}</b></span>` },
          { key: 'position', label: 'Cargo' }, { key: 'areaLabel', label: 'Área' }, { key: 'phone', label: 'Teléfono' },
          { key: 'hourly', label: 'Valor hora', render: r => money(r.hourly) },
          { key: 'week', label: 'Horas (2 sem.)', render: r => r.week.toFixed(1) },
          { key: 'active', label: 'Estado', render: r => r.active !== false ? '<span class="badge badge-success">Activo</span>' : '<span class="badge">Inactivo</span>' },
          { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost" data-delstaff="${r.id}" aria-label="Eliminar">🗑</button>` }
        ],
        onRow: r => editStaff(db.get('staff', r.id), ctx),
        csv: { name: 'personal', map: r => ({ nombre: r.name, cargo: r.position, area: r.areaLabel, telefono: r.phone, valor_hora: r.hourly, activo: r.active !== false ? 'sí' : 'no' }) }
      });
    }
    const wk = +(ctx.query.w || 0);
    const monday = new Date(); monday.setHours(12, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + wk * 7);
    const days = Array.from({ length: 7 }, (_, i) => isoDay(+monday + i * 864e5));
    const paint = () => {
      const staff = db.query('staff', s => s.active !== false);
      const shifts = db.query('shifts', s => days.includes(s.date));
      const cost = shifts.reduce((a, s) => a + hoursOf(s) * (db.get('staff', s.staffId)?.hourly || 0), 0);
      body.innerHTML = `<div class="row between"><div class="row"><a class="btn btn-sm" href="#/personal/turnos?w=${wk - 1}" aria-label="Semana anterior">←</a><b>Semana del ${escape(fmtDate(days[0] + 'T12:00', { day: 'numeric', month: 'short' }))} al ${escape(fmtDate(days[6] + 'T12:00', { day: 'numeric', month: 'short' }))}</b><a class="btn btn-sm" href="#/personal/turnos?w=${wk + 1}" aria-label="Semana siguiente">→</a></div>
        <span class="muted small">${shifts.length} turnos · ${shifts.reduce((a, s) => a + hoursOf(s), 0).toFixed(0)} h · costo estimado ${money(cost)}</span></div>
        <div class="table-wrap"><table class="table shift-table"><thead><tr><th>Integrante</th>${days.map(d => `<th class="${d === isoDay(Date.now()) ? 'is-today' : ''}">${escape(fmtDate(d + 'T12:00', { weekday: 'short', day: 'numeric' }))}</th>`).join('')}<th>Horas</th></tr></thead><tbody>
          ${staff.map(s => { const mine = shifts.filter(x => x.staffId === s.id); return `<tr><td class="nowrap"><b>${escape(s.name)}</b><small class="muted d-block">${escape(s.position)}</small></td>${days.map(d => { const sh = mine.find(x => x.date === d); const closed = new Date(d + 'T12:00').getDay() === 1; return `<td><button class="shift-cell ${sh ? 'has' : ''} ${closed ? 'closed' : ''}" data-s="${s.id}" data-d="${d}" ${sh ? `data-sh="${sh.id}"` : ''} aria-label="Turno ${escape(s.name)} ${d}">${sh ? `${sh.start}<br>${sh.end}` : closed ? 'Cerrado' : '+'}</button></td>`; }).join('')}<td><b>${mine.reduce((a, x) => a + hoursOf(x), 0).toFixed(1)}</b></td></tr>`; }).join('')}
        </tbody></table></div>`;
    };
    body.addEventListener('click', e => {
      const c = e.target.closest('.shift-cell'); if (!c) return;
      shiftModal(db.get('staff', c.dataset.s), c.dataset.d, c.dataset.sh ? db.get('shifts', c.dataset.sh) : null, ctx);
    });
    paint();
    return { refresh: paint };
  }
};
