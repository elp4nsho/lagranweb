// Vacaciones y permisos (vista RRHH): todas las solicitudes, aprobación, calendario y CSV.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';
import { smartTable } from '../shared/table.js';
import { personCell, REQ_TYPES, REQ_STATUS, reqBadge } from '../shared/util.js';
import { monthCal, monthLabel, shiftMonth } from '../shared/mcal.js';
import { today, fmtDay } from '../shared/dates.js';
import { decide, rejectDialog } from '../portal/equipo.js';

let ym = today().slice(0, 7), view = 'lista';
export function render(el, ctx) {
  const { db } = ctx;
  const emps = Object.fromEntries(db.all('employees').map(e => [e.id, e]));
  const depts = db.all('departments');
  const all = db.all('requests').map(r => ({ ...r, e: emps[r.employeeId], name: emps[r.employeeId]?.name || '—', tl: REQ_TYPES[r.type]?.label, deptId: emps[r.employeeId]?.deptId, appr: emps[r.approverId]?.name || '' }));
  const pctx = { ...ctx, me: db.get('employees', ctx.user.employeeId) };
  el.innerHTML = `${pageHead('Vacaciones y permisos', `${all.filter(r => r.status === 'pendiente').length} pendientes · RRHH puede aprobar en reemplazo de la jefatura.`)}
    <div class="tabs" role="tablist">${[['lista', 'Solicitudes'], ['cal', 'Calendario de ausencias']].map(([k, l]) => `<button class="tab ${view === k ? 'active' : ''}" data-v="${k}" role="tab" aria-selected="${view === k}">${l}</button>`).join('')}</div><div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (view === 'lista') {
    smartTable(body, {
      key: 'adm-req', rows: all, sort: 'createdAt', dir: -1, pageSize: 12, search: r => `${r.name} ${r.tl} ${r.reason}`,
      filters: [{ key: 'st', label: 'Estado', options: Object.entries(REQ_STATUS).map(([k, v]) => [k, v[0]]), test: (r, v) => r.status === v }, { key: 'tp', label: 'Tipo', options: Object.entries(REQ_TYPES).map(([k, v]) => [k, v.label]), test: (r, v) => r.type === v }, { key: 'dp', label: 'Área', options: depts.map(d => [d.id, d.name]), test: (r, v) => r.deptId === v }],
      columns: [
        { key: 'name', label: 'Colaborador', render: r => personCell(r.e) }, { key: 'tl', label: 'Tipo', render: r => `${REQ_TYPES[r.type]?.ico} ${escape(r.tl)}` },
        { key: 'from', label: 'Fechas', render: r => `<span class="nowrap">${escape(fmtDay(r.from))}${r.to !== r.from ? ` → ${escape(fmtDay(r.to))}` : ''}</span>` }, { key: 'days', label: 'Días' },
        { key: 'status', label: 'Estado', render: r => reqBadge(r.status) + (r.appr && r.status !== 'pendiente' ? `<br><small class="muted">${escape(r.appr)}</small>` : '') },
        { key: 'a', label: '', sort: false, render: r => r.status === 'pendiente' ? `<div class="acts"><button class="btn btn-sm btn-primary" data-ok="${r.id}">Aprobar</button><button class="btn btn-sm" data-no="${r.id}">Rechazar</button></div>` : '' }
      ],
      csv: { filename: 'solicitudes.csv', map: r => ({ colaborador: r.name, tipo: r.tl, desde: r.from, hasta: r.to, dias: r.days, estado: REQ_STATUS[r.status]?.[0], aprobador: r.appr, motivo: r.reason }) }
    });
  } else {
    const act = all.filter(r => ['aprobada', 'pendiente'].includes(r.status));
    body.innerHTML = `<div class="card"><div class="card-h"><h3>${escape(monthLabel(ym))}</h3><div class="row gap-sm"><button class="btn btn-sm" data-m="-1" aria-label="Mes anterior">←</button><button class="btn btn-sm" data-m="1" aria-label="Mes siguiente">→</button></div></div>${monthCal(ym, k => act.filter(r => r.from <= k && r.to >= k).map(r => ({ label: r.e?.first || r.name, title: `${r.name} · ${r.tl}`, cls: r.status === 'pendiente' ? 'pend' : r.type === 'licencia' ? 'lic' : '' })))}</div>`;
  }
  el.onclick = e => {
    const v = e.target.closest('[data-v]'), ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]'), m = e.target.closest('[data-m]');
    if (v) { view = v.dataset.v; render(el, ctx); }
    if (ok) decide(pctx, ok.dataset.ok, 'aprobada');
    if (no) rejectDialog(pctx, no.dataset.no);
    if (m) { ym = shiftMonth(ym, +m.dataset.m); render(el, ctx); }
  };
}
export { date, toast };
