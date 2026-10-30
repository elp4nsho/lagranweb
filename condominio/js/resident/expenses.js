// Gastos comunes del residente: estados de cuenta, detalle del prorrateo, pago en línea simulado e historial.
import { escape, money, date, dateTime, toast, modal, sleep, downloadCSV } from '../../../assets/core/ui.js';
import { settings, isPublished } from '../data/db.js';
import { periodLabel, dueDate, interest, owed, isOverdue, CATEGORIES, pctFmt } from '../shared/format.js';
import { pageHead } from '../shared/kit.js';

export function renderExpenses(el, { sub }, query, ctx, { unit }) {
  const { db } = ctx, s = settings();
  const charges = db.query('charges', c => isPublished(c.period) && c.unitId === unit.id).sort((a, b) => b.period.localeCompare(a.period));
  const unpaid = charges.filter(c => !c.paid);
  const cur = charges.find(c => c.period === sub) || charges[0];
  el.innerHTML = `${pageHead('Gastos comunes', `Torre ${unit.tower} · depto ${unit.number} · alícuota ${unit.alicuota.toLocaleString('es-CL')}%`, unpaid.length ? `<button class="btn btn-primary" data-pay>Pagar ${money(unpaid.reduce((t, c) => t + owed(c, s), 0))}</button>` : '')}
    <div class="row" style="gap:6px">${charges.map(c => `<a class="chip ${c === cur ? 'active' : ''}" href="#/gastos/${c.period}">${periodLabel(c.period)} ${c.paid ? '✓' : isOverdue(c, s) ? '⚠' : '•'}</a>`).join('')}</div>
    <div data-detail></div>`;
  if (cur) {
    const per = db.find('periods', p => p.period === cur.period);
    const total = per.expenses.reduce((t, e) => t + e.amount, 0);
    const byCat = CATEGORIES.map(cat => ({ cat, amount: per.expenses.filter(e => e.category === cat).reduce((t, e) => t + e.amount, 0) })).filter(x => x.amount);
    const intr = interest(cur, s);
    el.querySelector('[data-detail]').innerHTML = `<div class="split">
      <div class="card"><div class="row between"><h3 style="margin:0">Detalle del prorrateo · ${periodLabel(cur.period)}</h3>${cur.paid ? '<span class="badge badge-success">Pagado</span>' : isOverdue(cur, s) ? '<span class="badge badge-danger">Vencido</span>' : '<span class="badge badge-warning">Por pagar</span>'}</div>
        <p class="muted small">Gasto total del edificio ${money(total)} × tu alícuota ${unit.alicuota.toLocaleString('es-CL')}% = ${money(cur.common)}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Concepto</th><th class="right">Edificio</th><th class="right">Tu parte</th></tr></thead><tbody>
          ${byCat.map(x => `<tr><td>${escape(x.cat)}</td><td class="right">${money(x.amount)}</td><td class="right">${money(x.amount * cur.alicuota / 100)}</td></tr>`).join('')}
          <tr class="total-row"><td>Gasto común ordinario</td><td class="right">${money(total)}</td><td class="right">${money(cur.common)}</td></tr>
          <tr><td>Fondo de reserva (${per.reservePct}%)</td><td></td><td class="right">${money(cur.reserve)}</td></tr>
          <tr><td>Consumo de agua individual (${cur.m3.toLocaleString('es-CL')} m³)</td><td></td><td class="right">${money(cur.water)}</td></tr>
          ${cur.bookings ? `<tr><td>Reservas de espacios comunes</td><td></td><td class="right">${money(cur.bookings)}</td></tr>` : ''}
          ${cur.fines ? `<tr><td>Multas</td><td></td><td class="right">${money(cur.fines)}</td></tr>` : ''}
          ${intr ? `<tr><td>Intereses por mora (${s.interestPct}% mensual)</td><td></td><td class="right">${money(intr)}</td></tr>` : ''}
          <tr class="total-row"><td>Total a pagar</td><td></td><td class="right">${money(cur.total + intr)}</td></tr></tbody></table></div></div>
      <div class="stack">
        <div class="card stack" style="gap:6px"><span class="muted small">Total ${periodLabel(cur.period)}</span><span class="money-big">${money(cur.total + intr)}</span><span class="small">Vencimiento: <b>${date(dueDate(cur.period, s.dueDay))}</b></span>
          ${cur.paid ? `<span class="small">Pagado el ${dateTime(cur.paidAt)} · ${escape(cur.method)} · folio ${cur.folio}</span><button class="btn btn-sm" data-receipt>Descargar comprobante</button>` : '<button class="btn btn-primary" data-pay>Pagar este mes</button>'}</div>
        <div class="card small"><h3>¿Cómo se calcula?</h3><p class="muted" style="margin:0">Cada mes la administración ingresa los gastos del edificio. El total se reparte según la alícuota de cada departamento (superficie, estacionamientos y bodega). Se suma el ${per.reservePct}% de fondo de reserva, tu consumo de agua y las reservas que hayas hecho.</p></div>
        <div class="card small"><h3>Pago por transferencia</h3><p class="muted" style="margin:0">${escape(s.community)} · RUT ${escape(s.rut)}<br>${escape(s.bank)}<br>Indica tu depto en el comentario.</p></div>
      </div></div>`;
    el.querySelector('[data-receipt]')?.addEventListener('click', () => receipt([cur], unit, s));
  }
  el.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => payFlow(ctx, unit, cur && !cur.paid && b.closest('[data-detail]') ? [cur] : unpaid));
  if (query.pagar && unpaid.length) { history.replaceState(null, '', '#/gastos'); payFlow(ctx, unit, unpaid); }
}

function receipt(list, unit, s) {
  const rows = list.map(c => ({ folio: c.folio, comunidad: s.community, unidad: `${unit.tower}-${unit.number}`, periodo: periodLabel(c.period), monto: c.total, medio: c.method, fecha: dateTime(c.paidAt) }));
  downloadCSV(`comprobante-${unit.tower}${unit.number}-${list[0].period}.csv`, rows);
  toast('Comprobante descargado', 'success');
}

export function payFlow({ db, user }, unit, charges) {
  const s = settings();
  if (!charges.length) return toast('No tienes montos pendientes', 'info');
  const m = modal({ title: 'Pagar gastos comunes', body: `<form class="stack" data-f>
      <div class="stack" style="gap:6px">${charges.map(c => `<label class="choice"><input type="checkbox" name="c" value="${c.id}" checked><span style="flex:1">${periodLabel(c.period)}${isOverdue(c, s) ? ' <span class="badge badge-danger">Vencido</span>' : ''}</span><b>${money(owed(c, s))}</b></label>`).join('')}</div>
      <div class="row between"><span>Total</span><span class="money-big" data-total style="font-size:28px"></span></div>
      <div class="field"><span class="label">Medio de pago</span><div class="grid-2" style="gap:8px"><label class="choice"><input type="radio" name="method" value="Webpay" checked> Tarjeta crédito / débito</label><label class="choice"><input type="radio" name="method" value="Transferencia"> Transferencia</label></div></div>
      <div data-card class="form-grid"><div class="field full"><label for="cc-n">Número de tarjeta</label><input class="input" id="cc-n" inputmode="numeric" placeholder="4051 8856 0044 6623" autocomplete="off"></div>
        <div class="field"><label for="cc-e">Vencimiento</label><input class="input" id="cc-e" placeholder="MM/AA" autocomplete="off"></div><div class="field"><label for="cc-c">CVV</label><input class="input" id="cc-c" inputmode="numeric" placeholder="123" autocomplete="off"></div>
        <p class="full small muted" style="margin:0">Pago simulado: no ingreses datos reales. Cualquier número de 16 dígitos funciona.</p></div>
    </form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-go>Pagar</button>' });
  const f = m.el.querySelector('[data-f]');
  const sel = () => charges.filter(c => f.querySelector(`[value="${c.id}"]`).checked);
  const upd = () => { m.el.querySelector('[data-total]').textContent = money(sel().reduce((t, c) => t + owed(c, s), 0)); m.el.querySelector('[data-card]').hidden = f.method.value !== 'Webpay'; };
  f.addEventListener('change', upd); upd();
  m.el.querySelector('[data-go]').onclick = async () => {
    const list = sel(); if (!list.length) return toast('Selecciona al menos un mes', 'warning');
    const method = f.method.value;
    if (method === 'Webpay') {
      const n = m.el.querySelector('#cc-n').value.replace(/\D/g, ''), e = m.el.querySelector('#cc-e').value, c = m.el.querySelector('#cc-c').value;
      const bad = [[n.length !== 16, '#cc-n'], [!/^\d{2}\/\d{2}$/.test(e), '#cc-e'], [!/^\d{3,4}$/.test(c), '#cc-c']];
      bad.forEach(([b, sel]) => m.el.querySelector(sel).classList.toggle('invalid', b));
      if (bad.some(x => x[0])) return toast('Revisa los datos de la tarjeta', 'warning');
    }
    const btn = m.el.querySelector('[data-go]'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando…';
    await sleep(1100);
    let folio = Math.max(18400, ...db.all('charges').map(x => x.folio || 0));
    const paidAt = new Date().toISOString();
    const total = list.reduce((t, c) => t + owed(c, s), 0);
    list.forEach(c => db.update('charges', c.id, { paid: true, paidAt, method, folio: ++folio, interestPaid: interest(c, s) }));
    db.log('pago', `Pago en línea de ${unit.tower}-${unit.number}: ${money(total)} (${method})`, user.id);
    m.close();
    const done = db.query('charges', c => list.some(x => x.id === c.id));
    const r = modal({ title: 'Pago exitoso', body: `<div class="receipt stack" style="gap:6px;text-align:center"><span style="font-size:40px">✅</span><b>Pago recibido</b><span class="money-big">${money(total)}</span><span class="small">${done.map(c => `${periodLabel(c.period)} · folio ${c.folio}`).join('<br>')}</span><span class="small muted">${escape(method)} · ${dateTime(paidAt)}</span></div>`, foot: '<button class="btn" data-dl>Descargar comprobante</button><button class="btn btn-primary" data-close>Listo</button>' });
    r.el.querySelector('[data-dl]').onclick = () => receipt(done, unit, s);
    toast('Pago registrado. ¡Gracias!', 'success');
  };
}

export function renderPayments(el, p, q, { db }, { unit }) {
  const s = settings();
  const list = db.query('charges', c => isPublished(c.period) && c.unitId === unit.id).sort((a, b) => b.period.localeCompare(a.period));
  const paid = list.filter(c => c.paid);
  el.innerHTML = `${pageHead('Historial de pagos', `${paid.length} pagos registrados · ${pctFmt(list.length ? paid.length / list.length * 100 : 0)} de los meses pagados`, '<button class="btn" data-csv>⇩ Exportar CSV</button>')}
    <div class="table-wrap"><table class="table"><thead><tr><th>Período</th><th>Monto</th><th>Estado</th><th>Fecha de pago</th><th>Medio</th><th>Folio</th></tr></thead><tbody>
    ${list.map(c => `<tr><td><a href="#/gastos/${c.period}">${periodLabel(c.period)}</a></td><td>${money(c.paid ? c.total + (c.interestPaid || 0) : owed(c, s))}</td><td>${c.paid ? '<span class="badge badge-success">Pagado</span>' : isOverdue(c, s) ? '<span class="badge badge-danger">Vencido</span>' : '<span class="badge badge-warning">Pendiente</span>'}</td><td>${c.paid ? dateTime(c.paidAt) : '—'}</td><td>${escape(c.method || '—')}</td><td>${c.folio || '—'}</td></tr>`).join('')}
    </tbody></table></div>`;
  el.querySelector('[data-csv]').onclick = () => { downloadCSV(`pagos-${unit.tower}${unit.number}.csv`, list.map(c => ({ periodo: c.period, monto: c.total, estado: c.paid ? 'pagado' : 'pendiente', fecha: c.paidAt || '', medio: c.method || '', folio: c.folio || '' }))); toast('Historial exportado', 'success'); };
}
