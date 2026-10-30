import { escape, money, toast, dateTime } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { member, plan, monthlyEq, planPrice } from '../shared/domain.js';
import { collectModal } from '../shared/pay-ui.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { ymd, addDays, diffDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

let tab = 'morosos';
export function renderPayments(v) {
  const today = ymd(), pays = db.all('payments');
  const month = pays.filter(p => p.status === 'pagado' && p.at.slice(0, 7) === today.slice(0, 7));
  const morosos = db.query('members', m => m.status === 'moroso');
  const failed = pays.filter(p => p.status === 'fallido');
  v.innerHTML = `${pageHead('Pagos y cobranza', 'Recaudación de membresías y gestión de morosidad.', `<button class="btn" data-remind>${icon('bell', 16)} Recordar a morosos</button>`)}
  <div class="grid-4">${statCard('Recaudado este mes', money(month.reduce((s, p) => s + p.amount, 0)), `<span class="muted small">${month.length} pagos</span>`, 'money')}${statCard('Morosos', morosos.length, '', 'bell')}${statCard('Deuda vencida', money(morosos.reduce((s, m) => s + monthlyEq(m), 0)), '', 'x')}${statCard('Cargos PAT fallidos', failed.length, '', 'card')}</div>
  <div class="tabs"><button class="tab ${tab === 'morosos' ? 'active' : ''}" data-tab="morosos">Morosos (${morosos.length})</button><button class="tab ${tab === 'pagos' ? 'active' : ''}" data-tab="pagos">Todos los pagos</button></div>
  <div class="card" data-list></div>`;
  v.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderPayments(v); });
  const el = v.querySelector('[data-list]');
  if (tab === 'morosos') listView(el, {
    rows: () => db.query('members', m => m.status === 'moroso').map(m => ({ ...m, days: diffDays(today, m.nextDue), debt: planPrice(m), pname: plan(m.planId)?.name })),
    search: m => `${m.name} ${m.code}`,
    columns: [
      { key: 'name', label: 'Socio', render: m => `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${m.color}">${escape(initials(m.name))}</span><span><b>${escape(m.name)}</b><small>${m.code} · ${escape(m.phone)}</small></span></div>` },
      { key: 'pname', label: 'Plan' }, { key: 'nextDue', label: 'Venció' },
      { key: 'days', label: 'Días de atraso', render: m => `<span class="badge ${m.days > 30 ? 'badge-danger' : 'badge-warning'}">${m.days} días</span>` },
      { key: 'debt', label: 'Deuda', render: m => `<b>${money(m.debt)}</b>` },
      { key: 'id', label: '', sort: false, render: m => `<div class="acts-cell"><button class="btn btn-sm btn-primary" data-act="pay" data-id="${m.id}">Cobrar</button>${actBtn('msg', m.id, 'mail', 'Enviar recordatorio')}${actBtn('baja', m.id, 'logout', 'Dar de baja')}</div>` }
    ],
    onAction: (act, id) => {
      const m = db.get('members', id);
      if (act === 'pay') collectModal(m);
      if (act === 'msg') { db.log('cobranza', `Recordatorio WhatsApp a ${m.name}`, auth.current()?.id); toast(`Recordatorio enviado a ${m.phone}`, 'success'); }
      if (act === 'baja') { db.update('members', id, { status: 'baja', leftAt: today }); db.log('socio', `Baja por morosidad: ${m.name}`, auth.current()?.id); toast('Socio dado de baja', 'success'); }
    },
    empty: '¡Sin morosos! Todos al día.',
    csv: { name: 'morosos.csv', map: m => ({ codigo: m.code, nombre: m.name, telefono: m.phone, vencio: m.nextDue, dias_atraso: m.days, deuda: m.debt }) }
  });
  else listView(el, {
    rows: () => db.all('payments').map(p => ({ ...p, mname: member(p.memberId)?.name || '—' })).sort((a, b) => b.at.localeCompare(a.at)),
    search: p => `${p.mname} ${p.concept} ${p.method}`, pageSize: 12,
    filters: [{ key: 'status', label: 'Estado', options: [['pagado', 'Pagado'], ['fallido', 'Fallido']] }, { key: 'method', label: 'Medio', options: [...new Set(db.all('payments').map(p => p.method))] },
      { key: 'per', label: 'Periodo', value: '', options: [['30', 'Últimos 30 días'], ['90', 'Últimos 90 días']], test: (p, val) => p.at >= addDays(today, -val) }],
    columns: [{ key: 'at', label: 'Fecha', render: p => `<small>${escape(dateTime(p.at))}</small>` }, { key: 'mname', label: 'Socio' }, { key: 'concept', label: 'Concepto' }, { key: 'method', label: 'Medio', render: p => `<small>${escape(p.method)}</small>` }, { key: 'amount', label: 'Monto', render: p => `<b>${money(p.amount)}</b>` }, { key: 'status', label: 'Estado', render: p => p.status === 'pagado' ? '<span class="badge badge-success">Pagado</span>' : '<span class="badge badge-danger">Fallido</span>' }],
    csv: { name: 'pagos.csv', map: p => ({ fecha: p.at, socio: p.mname, concepto: p.concept, medio: p.method, monto: p.amount, estado: p.status }) }
  });
  v.querySelector('[data-remind]').onclick = () => { const n = db.count('members', m => m.status === 'moroso'); db.log('cobranza', `Recordatorio masivo a ${n} morosos`, auth.current()?.id); toast(`${n} recordatorios enviados por WhatsApp y correo`, 'success'); };
}
