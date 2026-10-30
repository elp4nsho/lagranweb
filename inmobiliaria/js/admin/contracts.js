// Contratos de arriendo y cobranza mensual de rentas.
import { escape, confirm, toast, money, date, formModal, barChart } from '../../../assets/core/ui.js';
import { PAYSTATUS, badge, monthLabel } from '../shared/format.js';
import { pageHead, crudTable, editForm, kpi } from '../shared/kit.js';

const curMonth = () => new Date().toISOString().slice(0, 7);
const endDate = c => { const d = new Date(c.start + 'T12:00'); d.setMonth(d.getMonth() + c.months); return d; };

export function renderContracts(el, { sub }, q, ctx) {
  if (sub) return detail(el, sub, ctx);
  const { db, user } = ctx;
  const cs = db.all('contracts'), active = cs.filter(c => c.status === 'vigente');
  const cm = curMonth();
  const due = active.flatMap(c => c.payments.filter(p => p.month === cm));
  const late = active.flatMap(c => c.payments.filter(p => p.status === 'atrasado'));
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });
  const collected = months.map(m => ({ label: monthLabel(m).replace(' de ', ' ').slice(0, 6), value: cs.flatMap(c => c.payments.filter(p => p.month === m && p.status === 'pagado')).reduce((s, p) => s + p.amount, 0) }));
  el.innerHTML = `${pageHead('Contratos y arriendos', 'Administración de arriendos y cobranza mensual', '<button class="btn" data-gen>🧾 Generar cobros del mes</button><button class="btn btn-primary" data-new>+ Nuevo contrato</button>')}
    <div class="kpis">${kpi('Contratos vigentes', active.length)}${kpi('Renta mensual administrada', money(active.reduce((s, c) => s + c.rent, 0)))}${kpi(`Cobrado ${monthLabel(cm)}`, `${due.filter(p => p.status === 'pagado').length}/${due.length}`, money(due.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)), true)}${kpi('Rentas atrasadas', late.length, money(late.reduce((s, p) => s + p.amount, 0)), !late.length)}</div>
    <div class="card chart-card"><h3>Recaudación de arriendos (6 meses)</h3>${barChart(collected, { format: money })}</div>
    <div data-t></div>`;
  crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('contracts'), search: c => `${c.tenantName} ${c.tenantRut} ${db.get('properties', c.propertyId)?.code || ''}`,
    filters: [{ key: 'status', label: 'Estado', options: [['vigente', 'Vigente'], ['terminado', 'Terminado']] }, { key: 'late', label: 'Cobranza', options: [['si', 'Con atrasos'], ['no', 'Al día']], fn: (c, v) => (v === 'si') === c.payments.some(p => p.status === 'atrasado') }],
    columns: [
      { key: 'propertyId', label: 'Propiedad', render: c => { const p = db.get('properties', c.propertyId); return `<b>${escape(p?.code || '')}</b><br><span class="muted small">${escape(p?.title || 'Propiedad eliminada')}</span>`; } },
      { key: 'tenantName', label: 'Arrendatario', render: c => `${escape(c.tenantName)}<br><span class="muted small">${escape(c.tenantRut)}</span>` },
      { key: 'rent', label: 'Renta', render: c => money(c.rent) },
      { key: 'start', label: 'Vigencia', render: c => `<span class="small nowrap">${date(c.start + 'T12:00')} → ${date(endDate(c))}</span>` },
      { key: 'pay', label: 'Mes actual', sort: false, render: c => { const p = c.payments.find(x => x.month === cm); return p ? badge(PAYSTATUS, p.status) : '<span class="muted small">—</span>'; } },
      { key: 'lateN', label: 'Atrasos', sort: false, render: c => { const n = c.payments.filter(p => p.status === 'atrasado').length; return n ? `<span class="badge badge-danger">${n}</span>` : '0'; } },
      { key: 'status', label: 'Estado', render: c => `<span class="badge ${c.status === 'vigente' ? 'badge-success' : ''}">${c.status === 'vigente' ? 'Vigente' : 'Terminado'}</span>` }
    ],
    onRow: c => ctx.go('/contratos/' + c.id),
    csv: { name: 'contratos.csv', map: c => ({ propiedad: db.get('properties', c.propertyId)?.code, arrendatario: c.tenantName, rut: c.tenantRut, renta: c.rent, inicio: c.start, meses: c.months, estado: c.status, atrasos: c.payments.filter(p => p.status === 'atrasado').length }) }
  });
  el.querySelector('[data-gen]').onclick = () => {
    let added = 0, overdue = 0;
    db.all('contracts').filter(c => c.status === 'vigente').forEach(c => {
      const payments = c.payments.map(p => (p.status === 'pendiente' && p.month < cm ? (overdue++, { ...p, status: 'atrasado' }) : p));
      if (!payments.some(p => p.month === cm) && endDate(c) > new Date()) { payments.push({ month: cm, amount: c.rent, status: 'pendiente', paidAt: null, method: null }); added++; }
      db.update('contracts', c.id, { payments });
    });
    db.log('cobranza', `${user.name} generó ${added} cobros de ${monthLabel(cm)} (${overdue} pasaron a atrasado)`, user.id);
    toast(added || overdue ? `${added} cobros generados · ${overdue} marcados atrasados` : 'Los cobros del mes ya estaban generados', 'success'); ctx.refresh();
  };
  el.querySelector('[data-new]').onclick = async () => {
    const props = db.query('properties', p => p.op === 'arriendo' && !db.find('contracts', c => c.propertyId === p.id && c.status === 'vigente'));
    const r = await editForm({ title: 'Nuevo contrato de arriendo', values: { start: new Date().toISOString().slice(0, 10), months: '12' }, fields: [
      { name: 'propertyId', label: 'Propiedad', type: 'select', options: props.map(p => [p.id, `${p.code} · ${p.title}`]), full: true },
      { name: 'tenantName', label: 'Arrendatario', required: true }, { name: 'tenantRut', label: 'RUT', required: true }, { name: 'tenantEmail', label: 'Correo', type: 'email' }, { name: 'tenantPhone', label: 'Teléfono' },
      { name: 'start', label: 'Inicio', type: 'date', required: true }, { name: 'months', label: 'Duración', type: 'select', options: [['12', '12 meses'], ['24', '24 meses'], ['36', '36 meses']] },
      { name: 'rent', label: 'Renta mensual (CLP, vacío = precio publicado)', type: 'number', min: 0 }] });
    if (!r) return;
    const p = db.get('properties', r.propertyId), rent = r.rent || p.price;
    const c = db.insert('contracts', { ...r, months: +r.months, rent, deposit: rent, commission: Math.round(rent * .5), ownerId: p.ownerId, agentId: p.agentId, status: 'vigente', payments: [{ month: r.start.slice(0, 7), amount: rent, status: 'pendiente', paidAt: null, method: null }] });
    db.log('contrato', `${user.name} creó contrato de ${p.code} con ${r.tenantName}`, user.id); toast('Contrato creado', 'success'); ctx.go('/contratos/' + c.id);
  };
}

function detail(el, id, ctx) {
  const { db, user } = ctx, c = db.get('contracts', id);
  if (!c) { el.innerHTML = '<div class="card empty">Contrato no encontrado.</div>'; return; }
  const p = db.get('properties', c.propertyId), owner = db.get('owners', c.ownerId);
  const paid = c.payments.filter(x => x.status === 'pagado');
  el.innerHTML = `${pageHead(`Contrato · ${p?.code || ''}`, `${escape(p?.title || '')} · ${escape(c.tenantName)}`, `<a class="btn btn-ghost" href="#/contratos">← Volver</a>${c.status === 'vigente' ? '<button class="btn btn-danger" data-end>Terminar contrato</button>' : ''}`)}
    <div class="kpis">${kpi('Renta', money(c.rent))}${kpi('Pagos recibidos', `${paid.length}/${c.payments.length}`, money(paid.reduce((s, x) => s + x.amount, 0)), true)}${kpi('Garantía', money(c.deposit))}${kpi('Término', date(endDate(c)))}</div>
    <div class="split"><div class="card"><div class="row between"><h3 style="margin:0">Cobranza mensual</h3><span class="muted small">Haz clic en un mes para registrar el pago</span></div>
      <div class="pay-grid" style="margin-top:12px">${c.payments.slice().reverse().map(x => `<button class="pay-cell" data-m="${x.month}" style="cursor:pointer;text-align:left;font:inherit;color:var(--text)"><b style="text-transform:capitalize">${monthLabel(x.month)}</b>${badge(PAYSTATUS, x.status)}<span class="muted">${money(x.amount)}</span>${x.paidAt ? `<span class="muted">${date(x.paidAt)} · ${escape(x.method || '')}</span>` : ''}</button>`).join('')}</div></div>
      <div class="stack"><div class="card"><h3>Arrendatario</h3><b>${escape(c.tenantName)}</b><div class="muted small">${escape(c.tenantRut)} · ${escape(c.tenantEmail || '')} · ${escape(c.tenantPhone || '')}</div></div>
        <div class="card"><h3>Propietario</h3><b>${escape(owner?.name || '—')}</b><div class="muted small">${escape(owner?.email || '')}</div><p class="small" style="margin:8px 0 0">Liquidación mensual: ${money(c.rent * .93)} (descuenta 7% de administración)</p></div></div></div>`;
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
    const x = c.payments.find(pp => pp.month === b.dataset.m);
    const r = await formModal({ title: `Pago ${monthLabel(x.month)}`, submit: 'Guardar', fields: [
      { name: 'status', label: 'Estado', type: 'select', options: Object.entries(PAYSTATUS).map(([k, v]) => [k, v[0]]), value: x.status === 'pagado' ? 'pagado' : 'pagado' },
      { name: 'amount', label: 'Monto', type: 'number', value: x.amount }, { name: 'paidAt', label: 'Fecha de pago', type: 'date', value: (x.paidAt || new Date().toISOString()).slice(0, 10) },
      { name: 'method', label: 'Medio', type: 'select', options: ['Transferencia', 'Depósito', 'PAC', 'Efectivo'], value: x.method || 'Transferencia' }] });
    if (!r) return;
    const payments = c.payments.map(pp => pp.month === x.month ? { ...pp, status: r.status, amount: r.amount, paidAt: r.status === 'pagado' ? new Date(r.paidAt + 'T12:00').toISOString() : null, method: r.status === 'pagado' ? r.method : null } : pp);
    db.update('contracts', c.id, { payments });
    db.log('cobranza', `${user.name}: ${p?.code} ${monthLabel(x.month)} → ${PAYSTATUS[r.status][0]}`, user.id); toast('Pago registrado', 'success'); ctx.refresh();
  });
  el.querySelector('[data-end]')?.addEventListener('click', async () => {
    if (!(await confirm('¿Terminar este contrato? La propiedad volverá a estado publicada para arrendarse.', { danger: true, ok: 'Terminar' }))) return;
    db.update('contracts', c.id, { status: 'terminado' });
    if (p && p.status === 'arrendada') { const { setStatus } = await import('../data/db.js'); setStatus(p, 'publicada', 'Contrato terminado'); }
    db.log('contrato', `${user.name} terminó contrato de ${p?.code}`, user.id); toast('Contrato terminado', 'success'); ctx.refresh();
  });
}
