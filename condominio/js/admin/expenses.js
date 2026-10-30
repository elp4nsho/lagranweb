// Gastos comunes: ingreso de gastos del edificio → prorrateo por alícuota → generación de cobros → publicación.
import { escape, money, toast, confirm, formModal, dataTable, date } from '../../../assets/core/ui.js';
import { settings, notify, unitName } from '../data/db.js';
import { CATEGORIES, PERSTATUS, badge, periodLabel, addMonths, dueDate, pctFmt, curPeriod } from '../shared/format.js';
import { pageHead, kpi, editForm } from '../shared/kit.js';

// Consumo de agua simulado (lectura de medidor) determinista por unidad y período.
const meter = (u, period) => { let h = 7; for (const ch of u.id + period) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return Math.round((5 + u.m2 / 12 + (h % 70) / 10) * 10) / 10; };

export function prorate(db, per, s = settings()) {
  const total = per.expenses.reduce((t, e) => t + e.amount, 0);
  return db.all('units').filter(u => u.active !== false).map(u => {
    const existing = db.find('charges', c => c.period === per.period && c.unitId === u.id);
    const common = Math.round(total * u.alicuota / 100), reserve = Math.round(common * per.reservePct / 100);
    const m3 = existing?.m3 ?? meter(u, per.period), water = Math.round(m3 * (s.waterPrice || 1150));
    const bookings = db.query('bookings', b => b.unitId === u.id && b.date.slice(0, 7) === per.period && b.status !== 'cancelada' && b.price).reduce((t, b) => t + b.price, 0);
    const fines = existing?.fines || 0;
    return { unit: u, unitId: u.id, alicuota: u.alicuota, common, reserve, m3, water, bookings, fines, total: common + reserve + water + bookings + fines, existing };
  });
}

export function renderExpenses(el, { sub }, q, ctx) {
  const { db, user } = ctx, admin = user.role === 'administrador';
  if (sub) return detail(el, sub, ctx);
  const pers = db.all('periods').sort((a, b) => b.period.localeCompare(a.period));
  el.innerHTML = `${pageHead('Gastos comunes', 'Cálculo mensual por alícuota y publicación a residentes', admin ? '<button class="btn btn-primary" data-new>+ Nuevo período</button>' : '<span class="badge badge-info">Comité: solo lectura</span>')}
    <div class="table-wrap"><table class="table"><thead><tr><th>Período</th><th>Estado</th><th>Gasto edificio</th><th>Cobrado a unidades</th><th>Recaudado</th><th>Vencimiento</th><th></th></tr></thead><tbody>
    ${pers.map(p => { const cs = db.query('charges', c => c.period === p.period), tot = cs.reduce((t, c) => t + c.total, 0), paid = cs.filter(c => c.paid).reduce((t, c) => t + c.total, 0);
      return `<tr><td><a href="#/gastos/${p.period}"><b>${periodLabel(p.period)}</b></a></td><td>${badge(PERSTATUS, p.status)}${p.status === 'borrador' && p.generated ? ' <span class="badge badge-info plain">Cobros generados</span>' : ''}</td><td>${money(p.expenses.reduce((t, e) => t + e.amount, 0))}</td><td>${cs.length ? money(tot) : '—'}</td>
        <td>${p.status === 'publicado' ? `<div style="min-width:120px"><div class="row between small"><span>${pctFmt(tot ? paid / tot * 100 : 0)}</span><span class="muted">${cs.filter(c => c.paid).length}/${cs.length}</span></div><div class="progress"><i style="--v:${tot ? paid / tot * 100 : 0}%"></i></div></div>` : '—'}</td>
        <td class="small">${date(dueDate(p.period, settings().dueDay))}</td><td><a class="btn btn-sm" href="#/gastos/${p.period}">${p.status === 'borrador' && admin ? 'Calcular' : 'Ver'}</a></td></tr>`; }).join('')}
    </tbody></table></div>`;
  el.querySelector('[data-new]')?.addEventListener('click', async () => {
    const latest = pers[0]; const period = latest ? addMonths(latest.period, 1) : curPeriod();
    if (pers.some(p => p.status === 'borrador') && !(await confirm('Ya hay un período en borrador. ¿Crear otro de todos modos?', { ok: 'Crear' }))) return;
    const recurring = (latest?.expenses || []).filter(e => e.category !== 'Reparaciones').map((e, i) => ({ ...e, id: `e-${period}-${i}` }));
    db.insert('periods', { id: 'per-' + period, period, status: 'borrador', reservePct: settings().reservePct || 5, expenses: recurring, generated: false, publishedAt: null });
    db.log('gastos', `${user.name} creó el período ${periodLabel(period)} (copiando gastos recurrentes)`, user.id);
    toast(`Período ${periodLabel(period)} creado con ${recurring.length} gastos recurrentes`, 'success'); ctx.go('/gastos/' + period);
  });
}

function detail(el, period, ctx) {
  const { db, user } = ctx, admin = user.role === 'administrador', s = settings();
  const per = db.find('periods', p => p.period === period);
  if (!per) { el.innerHTML = '<div class="card empty">Período no encontrado. <a href="#/gastos">Volver</a></div>'; return; }
  const draft = per.status === 'borrador', edit = draft && admin;
  const total = per.expenses.reduce((t, e) => t + e.amount, 0);
  const rows = prorate(db, per, s);
  const charged = rows.reduce((t, r) => t + r.total, 0);
  const cs = db.query('charges', c => c.period === period);
  const paidAmt = cs.filter(c => c.paid).reduce((t, c) => t + c.total, 0);
  const step = per.status === 'publicado' ? 3 : per.generated ? 2 : 1;
  el.innerHTML = `${pageHead(`Gastos comunes · ${periodLabel(period)}`, `Vence el ${date(dueDate(period, s.dueDay))} · ${db.count('units')} unidades`, `<a class="btn btn-ghost" href="#/gastos">← Períodos</a>${edit ? `<button class="btn" data-gen>⚙ ${per.generated ? 'Regenerar' : 'Generar'} cobros</button><button class="btn btn-primary" data-pub ${per.generated ? '' : 'disabled title="Primero genera los cobros"'}>Publicar a residentes</button>` : ''}`)}
    <div class="card"><div class="wf">${['Ingresar gastos', 'Generar prorrateo', 'Publicar'].map((t, i) => `${i ? '<span class="arrow">→</span>' : ''}<span class="step-pill ${i < step ? 'on' : ''}">${i + 1}. ${t}</span>`).join('')}<span style="margin-left:auto">${badge(PERSTATUS, per.status)}</span></div></div>
    <div class="kpis">${kpi('Gasto del edificio', money(total), `${per.expenses.length} ítems`)}${kpi(`Fondo de reserva (${per.reservePct}%)`, money(rows.reduce((t, r) => t + r.reserve, 0)))}${kpi('Total a cobrar', money(charged), `${money(charged / rows.length)} promedio`)}${per.status === 'publicado' ? kpi('Recaudado', pctFmt(cs.length ? paidAmt / cs.reduce((t, c) => t + c.total, 0) * 100 : 0), `${money(paidAmt)} · ${cs.filter(c => c.paid).length}/${cs.length} deptos`, true) : kpi('Consumo de agua', money(rows.reduce((t, r) => t + r.water, 0)), `${s.waterPrice} $/m³`)}</div>
    <div class="split">
      <div class="card"><div class="row between"><h3 style="margin:0">Gastos del edificio</h3>${edit ? '<button class="btn btn-sm btn-primary" data-add>+ Agregar gasto</button>' : ''}</div>
        <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Categoría</th><th>Detalle</th><th class="right">Monto</th>${edit ? '<th></th>' : ''}</tr></thead><tbody>
        ${per.expenses.map(e => `<tr><td>${escape(e.category)}</td><td>${escape(e.description)}${e.providerId ? `<br><span class="muted small">${escape(db.get('providers', e.providerId)?.name || '')}</span>` : ''}</td><td class="right nowrap">${money(e.amount)}</td>${edit ? `<td class="actions"><button class="btn btn-sm btn-ghost" data-edit="${e.id}" aria-label="Editar">✎</button><button class="btn btn-sm btn-ghost" data-del="${e.id}" aria-label="Eliminar">🗑</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="4" class="empty">Sin gastos. Agrega el primero.</td></tr>`}
        <tr class="total-row"><td colspan="2">Total gasto común ordinario</td><td class="right">${money(total)}</td>${edit ? '<td></td>' : ''}</tr></tbody></table></div>
        ${edit ? `<div class="row" style="margin-top:12px"><label for="rp" class="label">Fondo de reserva (%)</label><input class="input" id="rp" type="number" min="0" max="20" step="0.5" value="${per.reservePct}" style="width:100px"><button class="btn btn-sm" data-rp>Aplicar</button></div>` : ''}</div>
      <div class="card"><h3>¿Cómo se calcula?</h3><ol class="small" style="padding-left:18px;margin:0"><li>Gasto ordinario × alícuota de la unidad.</li><li>+ ${per.reservePct}% de fondo de reserva sobre lo anterior.</li><li>+ Consumo individual de agua (lectura de medidor × $${s.waterPrice}/m³).</li><li>+ Reservas de quinchos/sala del mes y multas.</li></ol>
        <p class="small muted" style="margin:10px 0 0">Las alícuotas suman ${db.all('units').reduce((t, u) => t + u.alicuota, 0).toLocaleString('es-CL', { maximumFractionDigits: 2 })}%. Al publicar, cada residente ve su detalle y puede pagar en línea.</p></div>
    </div>
    <div class="card"><div class="row between"><h3 style="margin:0">Prorrateo por unidad</h3><span class="muted small">${per.generated ? 'Cobros generados' : 'Vista previa (aún no generado)'}</span></div><div data-pr style="margin-top:12px"></div></div>`;
  dataTable(el.querySelector('[data-pr]'), {
    rows: rows.map(r => ({ ...r, name: unitName(r.unitId), paid: r.existing?.paid })), pageSize: 12, search: r => `${r.name} ${r.unit.ownerName}`,
    columns: [
      { key: 'name', label: 'Unidad', render: r => `<b>${escape(r.name)}</b><br><span class="muted small">${escape(r.unit.ownerName)}</span>` },
      { key: 'alicuota', label: 'Alícuota', render: r => r.alicuota.toLocaleString('es-CL') + '%' },
      { key: 'common', label: 'Común', render: r => money(r.common) }, { key: 'reserve', label: 'Fondo', render: r => money(r.reserve) },
      { key: 'water', label: 'Agua', render: r => `${money(r.water)}<br><span class="muted small">${r.m3.toLocaleString('es-CL')} m³</span>` },
      { key: 'bookings', label: 'Reservas', render: r => r.bookings ? money(r.bookings) : '—' },
      { key: 'total', label: 'Total', render: r => `<b>${money(r.total)}</b>` },
      { key: 'paid', label: 'Pago', render: r => per.status !== 'publicado' ? '<span class="muted small">—</span>' : r.paid ? '<span class="badge badge-success">Pagado</span>' : `<span class="badge badge-warning">Pendiente</span>${admin ? ` <button class="btn btn-sm btn-ghost" data-manual="${r.existing?.id}">Registrar pago</button>` : ''}` }
    ]
  });

  // Cualquier cambio en gastos o fondo obliga a regenerar los cobros antes de publicar.
  const save = (patch, msg) => { db.update('periods', per.id, { ...patch, generated: false }); toast(msg, 'success'); ctx.refresh(); };
  const expForm = e => editForm({ title: e ? 'Editar gasto' : 'Agregar gasto', size: '', values: e || { category: CATEGORIES[0] }, fields: [
    { name: 'category', label: 'Categoría', type: 'select', options: CATEGORIES, full: true }, { name: 'description', label: 'Detalle', required: true, full: true },
    { name: 'amount', label: 'Monto (CLP)', type: 'number', min: 1, required: true }, { name: 'providerId', label: 'Proveedor', type: 'select', options: [['', '—'], ...db.all('providers').map(p => [p.id, p.name])] }] });
  el.querySelector('[data-add]')?.addEventListener('click', async () => { const r = await expForm(); if (r) { save({ expenses: [...per.expenses, { id: 'e' + Date.now(), ...r, providerId: r.providerId || null }] }, 'Gasto agregado · regenera los cobros'); db.log('gastos', `${user.name} agregó gasto ${r.category} ${money(r.amount)} a ${periodLabel(period)}`, user.id); } });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => { const e = per.expenses.find(x => x.id === b.dataset.edit); const r = await expForm(e); if (r) save({ expenses: per.expenses.map(x => x.id === e.id ? { ...x, ...r, providerId: r.providerId || null } : x) }, 'Gasto actualizado'); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (await confirm('¿Eliminar este gasto?', { danger: true, ok: 'Eliminar' })) save({ expenses: per.expenses.filter(x => x.id !== b.dataset.del) }, 'Gasto eliminado'); });
  el.querySelector('[data-rp]')?.addEventListener('click', () => { const v = +el.querySelector('#rp').value; if (!(v >= 0 && v <= 20)) return toast('Valor entre 0 y 20%', 'warning'); save({ reservePct: v }, 'Fondo de reserva actualizado'); });
  el.querySelector('[data-gen]')?.addEventListener('click', () => {
    if (!per.expenses.length) return toast('Ingresa al menos un gasto', 'warning');
    rows.forEach(r => {
      const data = { period, unitId: r.unitId, alicuota: r.alicuota, common: r.common, reserve: r.reserve, water: r.water, m3: r.m3, bookings: r.bookings, fines: r.fines, total: r.total };
      if (r.existing) { if (!r.existing.paid) db.update('charges', r.existing.id, data); }
      else db.insert('charges', { id: `ch-${period}-${r.unitId}`, ...data, paid: false, paidAt: null, method: null, folio: null });
    });
    db.update('periods', per.id, { generated: true });
    db.log('gastos', `${user.name} generó ${rows.length} cobros de ${periodLabel(period)} por ${money(charged)}`, user.id);
    toast(`${rows.length} cobros generados (${money(charged)})`, 'success'); ctx.refresh();
  });
  el.querySelector('[data-pub]')?.addEventListener('click', async () => {
    if (!(await confirm(`Se publicarán los gastos comunes de ${periodLabel(period)} (${money(charged)}) y se notificará a los ${db.count('units')} departamentos.`, { title: 'Publicar gastos comunes', ok: 'Publicar' }))) return;
    db.update('periods', per.id, { status: 'publicado', publishedAt: new Date().toISOString() });
    notify('*', `Gastos comunes de ${periodLabel(period)} publicados. Vencen el ${date(dueDate(period, s.dueDay))}.`, '#/gastos/' + period);
    db.insert('announcements', { title: `Gastos comunes de ${periodLabel(period).toLowerCase()} publicados`, body: `Ya están disponibles los gastos comunes de ${periodLabel(period).toLowerCase()}. Total edificio ${money(total)}. Vencimiento: ${date(dueDate(period, s.dueDay))}.`, category: 'Gastos comunes', pinned: false, published: true, public: false, author: user.name });
    db.log('gastos', `${user.name} publicó los gastos comunes de ${periodLabel(period)}`, user.id);
    toast('Gastos comunes publicados y residentes notificados', 'success'); ctx.refresh();
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-manual]'); if (!b) return;
    const c = db.get('charges', b.dataset.manual);
    const r = await formModal({ title: `Registrar pago · ${unitName(c.unitId)}`, submit: 'Registrar', fields: [{ name: 'method', label: 'Medio', type: 'select', options: ['Transferencia', 'Cheque', 'Efectivo', 'Caja vecina'] }, { name: 'date', label: 'Fecha', type: 'date', value: new Date().toISOString().slice(0, 10) }] });
    if (!r) return;
    const folio = Math.max(18400, ...db.all('charges').map(x => x.folio || 0)) + 1;
    db.update('charges', c.id, { paid: true, paidAt: new Date(r.date + 'T12:00').toISOString(), method: r.method, folio });
    db.log('pago', `${user.name} registró pago manual de ${unitName(c.unitId)} (${periodLabel(c.period)})`, user.id);
    toast('Pago registrado', 'success'); ctx.refresh();
  });
}
