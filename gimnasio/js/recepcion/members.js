import { escape, money } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { MEMBER_STATUS } from '../data/catalog.js';
import { plan, branch, statusBadge, planPrice } from '../shared/domain.js';
import { collectModal } from '../shared/pay-ui.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';

export function renderMembers(v) {
  v.innerHTML = `${pageHead('Socios y cobros', 'Busca socios, revisa su estado y registra pagos en el mesón.')}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('members'), search: m => `${m.name} ${m.code} ${m.rut} ${m.email}`,
    filters: [{ key: 'status', label: 'Estado', value: 'moroso', options: Object.entries(MEMBER_STATUS).map(([k, s]) => [k, s.label]) }, { key: 'branchId', label: 'Sede', options: db.all('branches').map(b => [b.id, b.name]) }],
    columns: [
      { key: 'name', label: 'Socio', render: m => `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${m.color}">${escape(initials(m.name))}</span><span><b>${escape(m.name)}</b><small>${m.code} · ${escape(m.rut)}</small></span></div>` },
      { key: 'planId', label: 'Plan', render: m => `${escape(plan(m.planId)?.name)} <small class="muted">${m.billing}</small>` },
      { key: 'branchId', label: 'Sede', render: m => escape(branch(m.branchId)?.name) },
      { key: 'nextDue', label: 'Vence' }, { key: 'status', label: 'Estado', render: m => statusBadge(m.status) },
      { key: 'id', label: '', sort: false, render: m => `<div class="acts-cell">${m.status === 'moroso' || m.status === 'activo' ? `<button class="btn btn-sm ${m.status === 'moroso' ? 'btn-primary' : ''}" data-act="pay" data-id="${m.id}">Cobrar ${money(planPrice(m))}</button>` : ''}${actBtn('open', m.id, 'eye', 'Ficha')}</div>` }
    ],
    onAction: (act, id) => act === 'pay' ? collectModal(db.get('members', id)) : (location.href = 'admin.html#/socios/' + id),
    csv: { name: 'socios.csv', map: m => ({ codigo: m.code, nombre: m.name, rut: m.rut, plan: plan(m.planId)?.name, estado: MEMBER_STATUS[m.status]?.label, vence: m.nextDue }) }
  });
}
