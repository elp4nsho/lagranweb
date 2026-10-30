// Personal y turnos: grilla semanal por sucursal (clic para cambiar turno), cobertura y productividad.
import { escape, toast, formModal, money } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { pageHead } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { branches, branchName } from '../shared/domain.js';
import { myBranch, branchSelect } from './common.js';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const SH = { M: 'Mañana 08:30–14:30', T: 'Tarde 13:30–19:30', C: 'Completo', L: 'Libre' };
const NEXT = { M: 'T', T: 'C', C: 'L', L: 'M' };
let sel = null;

export default {
  id: 'personal', label: 'Personal y turnos', icon: '🗓️', group: 'Organización', roles: ['admin', 'jefe'], watch: ['users', 'jobs'],
  render(el, ctx) {
    if (sel === null) sel = myBranch(ctx) || branches()[0].id;
    if (ctx.user.role === 'jefe') sel = ctx.user.branchId;
    const paint = () => {
      const staff = db.query('users', u => u.branchId === sel && u.role !== 'cliente');
      const since = new Date(Date.now() - 9 * 864e5).toISOString();
      const jobs = db.query('jobs', j => j.branchId === sel && j.status === 'pagado' && j.paidAt >= since);
      const stat = id => { const js = jobs.filter(j => j.techId === id); const real = js.reduce((s, j) => s + (new Date(j.doneAt) - new Date(j.startedAt)) / 6e4, 0), std = js.reduce((s, j) => s + j.est, 0); return { n: js.length, eff: real ? std / real * 100 : 0, rev: js.reduce((s, j) => s + j.total, 0), ups: js.flatMap(j => j.upsells).filter(u => u.st === 'aprobado').length }; };
      const cover = d => ['M', 'T'].map(k => staff.filter(u => u.role === 'tecnico' && (u.shifts?.[d] === k || u.shifts?.[d] === 'C')).length);
      el.innerHTML = `${pageHead('Personal y turnos', 'Haz clic en una celda para rotar el turno: Mañana → Tarde → Completo → Libre', ctx.user.role === 'admin' ? branchSelect(sel, { all: false }) : `<span class="badge badge-primary">${escape(branchName(sel))}</span>`)}
        <div class="table-wrap"><table class="table shift-grid"><thead><tr><th>Persona</th>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>
          ${staff.map(u => `<tr><td><span class="row nowrap" style="gap:8px"><span class="avatar" style="--av:${escape(u.color)};--size:30px">${escape(initials(u.name))}</span><span><b>${escape(u.name)}</b><small class="muted d-block">${escape(auth.roleName(u.role))}</small></span></span></td>${DAYS.map((_, i) => { const s = u.shifts?.[i] || 'L'; return `<td><button class="shift s-${s}" data-u="${u.id}" data-d="${i}" title="${SH[s]}">${s === 'L' ? '—' : s}</button></td>`; }).join('')}</tr>`).join('')}
          <tr><td><b>Cobertura técnicos</b><small class="muted d-block">mañana / tarde</small></td>${DAYS.map((_, i) => { const [m, t] = cover(i); const short = i < 6 && (m < 2 || (i < 5 && t < 2)); return `<td><span class="badge ${short ? 'badge-warning' : 'badge-success'} plain">${m}/${t}</span></td>`; }).join('')}</tr>
        </tbody></table></div>
        <div class="row small muted">${Object.entries(SH).map(([k, v]) => `<span class="row nowrap" style="gap:6px"><span class="shift s-${k}" aria-hidden="true">${k === 'L' ? '—' : k}</span>${v}</span>`).join('')}</div>
        <div class="card stack"><h3 style="margin:0">Productividad (últimos 9 días)</h3><div class="table-wrap"><table class="table"><thead><tr><th>Técnico</th><th>Autos</th><th>Eficiencia</th><th>Recomendaciones aprobadas</th><th>Facturado</th><th>Contacto</th><th></th></tr></thead><tbody>
          ${staff.filter(u => u.role === 'tecnico').map(u => { const s = stat(u.id); return `<tr><td><b>${escape(u.name)}</b>${u.active === false ? ' <span class="badge badge-danger">inactivo</span>' : ''}</td><td>${s.n}</td><td><div class="row nowrap" style="gap:8px"><div class="progress" style="width:90px"><i style="--v:${Math.min(100, s.eff)}%"></i></div>${Math.round(s.eff)}%</div></td><td>${s.ups}</td><td>${money(s.rev)}</td><td><small>${escape(u.phone || '')}</small></td><td><button class="btn btn-sm" data-edit="${u.id}">Editar</button></td></tr>`; }).join('')}
        </tbody></table></div><small class="muted">Eficiencia = minutos estándar de los servicios / minutos reales en bahía.</small></div>`;
      el.querySelector('[data-branch]')?.addEventListener('change', e => { sel = e.target.value; paint(); });
    };
    el.onclick = async e => {
      const c = e.target.closest('.shift[data-u]');
      if (c) { const u = db.get('users', c.dataset.u), d = +c.dataset.d, sh = [...(u.shifts || ['L', 'L', 'L', 'L', 'L', 'L', 'L'])]; sh[d] = NEXT[sh[d] || 'L']; db.update('users', u.id, { shifts: sh }); db.log('turnos', `${u.name}: ${DAYS[d]} → ${SH[sh[d]]}`, ctx.user.id); return; }
      const ed = e.target.closest('[data-edit]');
      if (ed) { const u = db.get('users', ed.dataset.edit); const v = await formModal({ title: u.name, fields: [{ name: 'phone', label: 'Celular', value: u.phone }, { name: 'branchId', label: 'Sucursal', type: 'select', options: branches(true).map(b => [b.id, b.name]), value: u.branchId }] }); if (v) { db.update('users', u.id, v); db.log('personal', `${u.name} actualizado`, ctx.user.id); toast('Guardado', 'success'); } }
    };
    paint();
    return { refresh: paint };
  }
};
