// Mi cuenta (cliente): mis autos, reservas, tasaciones, suscripciones, pedidos, servicios y créditos.
import { money, escape, date, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { RES_STATES, VAL_STATES, SUB_STATES, ORDER_STATES, BOOK_STATES, FIN_STATES, BRANDS, PAINT } from '../data/catalog.js';
import { statusBadge, carName, kmFmt, branchById } from '../shared/domain.js';
import { fmtDay, normPlate } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';

const TABS = [['cars', 'Mis autos'], ['res', 'Reservas'], ['val', 'Tasaciones'], ['subs', 'Suscripciones'], ['orders', 'Pedidos'], ['svc', 'Servicios'], ['fin', 'Créditos']];
export function renderAccount(el, _p, q = {}) {
  const u = auth.current();
  if (!u || u.role !== 'cliente') {
    el.innerHTML = `<section class="section"><div class="container narrow"><div class="card stack" style="text-align:center;align-items:center"><span class="big-ico">👤</span><h1 style="margin:0">Mi cuenta</h1><p class="lead">${u ? `Estás conectado como <b>${escape(u.name)}</b> (equipo).` : 'Ingresa para ver tus autos, reservas, tasaciones, planes y pedidos.'}</p><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/cuenta')}">${u ? 'Cambiar de cuenta' : 'Ingresar'}</a></div></div></section>`;
    return;
  }
  let tab = TABS.some(([k]) => k === q.tab) ? q.tab : 'cars';
  const mine = col => db.query(col, x => x.userId === u.id || (x.email || '').toLowerCase() === u.email.toLowerCase());
  const paint = () => {
    const res = mine('reservations'), vals = mine('valuations'), subs = mine('subscriptions'), ords = mine('orders'), bks = mine('bookings'), fins = mine('financing');
    const bought = db.query('sales', s => s.email.toLowerCase() === u.email.toLowerCase());
    const garage = db.query('garage', g => g.userId === u.id);
    const counts = { cars: garage.length, res: res.length, val: vals.length, subs: subs.length, orders: ords.length, svc: bks.length, fin: fins.length };
    let body = '';
    const tbl = (head, rows) => rows.length ? `<div class="table-wrap"><table class="table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<div class="empty">Aún no hay registros.</div>';
    if (tab === 'cars') body = `<div class="row between"><p class="muted" style="margin:0">Autos comprados en Ruta Certificada o registrados por ti.</p><button class="btn btn-sm" data-addcar>+ Registrar auto</button></div>
      <div class="car-grid">${garage.map(g => { const sale = g.carId && bought.find(s => s.carId === g.carId), sub = subs.find(s => s.plate === g.plate && s.status === 'activa'); return `<div class="card stack"><div class="car-frame">${carArt({ body: g.body, color: g.color })}</div><b>${escape(g.brand)} ${escape(g.model)} ${g.year}</b><small class="muted">${escape(g.plate)} · ${kmFmt(g.km)}</small>
        <div class="row" style="gap:6px">${sale ? `<span class="badge badge-success">Comprado ${date(sale.date)}</span>` : '<span class="badge">Registrado</span>'}${sub ? `<span class="badge badge-primary">${escape(db.get('plans', sub.planId)?.name || 'Plan')}</span>` : ''}</div>
        ${sale ? `<small>Garantía hasta ${fmtDay(new Date(new Date(sale.date).getTime() + 365 * 864e5), { year: true })} · contrato ${escape(sale.contractNo)}</small>` : ''}
        <div class="row"><a class="btn btn-sm" href="#/servicios">Agendar servicio</a>${!sub ? '<a class="btn btn-sm btn-ghost" href="#/planes">Contratar plan</a>' : ''}<a class="btn btn-sm btn-ghost" href="#/vende">Tasar</a></div></div>`; }).join('')}</div>`;
    if (tab === 'res') body = tbl(['Código', 'Auto', 'Abono', 'Vence', 'Estado', ''], res.map(r => { const c = db.get('cars', r.carId); return `<tr><td class="mono">${r.code}</td><td><a href="#/auto/${r.carId}">${escape(carName(c))}</a></td><td>${money(r.deposit)}</td><td>${fmtDay(r.expiresAt)}</td><td>${statusBadge(RES_STATES, r.status)}</td><td>${r.status === 'activa' ? `<button class="btn btn-sm btn-ghost" data-cancelres="${r.id}">Cancelar y reembolsar</button>` : ''}</td></tr>`; }));
    if (tab === 'val') body = tbl(['Código', 'Auto', 'Oferta', 'Inspección', 'Estado'], vals.map(v => `<tr><td class="mono">${v.code}</td><td>${escape(v.brand)} ${escape(v.model)} ${v.year}<small class="muted d-block">${kmFmt(v.km)}</small></td><td>${v.finalOffer ? `<b>${money(v.finalOffer)}</b>` : `${money(v.offerMin)} – ${money(v.offerMax)}`}</td><td>${v.appointmentAt ? `${fmtDay(v.appointmentAt.slice(0, 10))} ${v.appointmentAt.slice(11)}<small class="muted d-block">${escape(branchById(v.branchId)?.name || '')}</small>` : '<a href="#/vende">Agendar</a>'}</td><td>${statusBadge(VAL_STATES, v.status)}</td></tr>`)) + '<a class="btn btn-sm" href="#/vende">Nueva tasación</a>';
    if (tab === 'subs') body = tbl(['Plan', 'Auto', 'Mensualidad', 'Próximo cobro', 'Estado', ''], subs.map(s => `<tr><td><b>${escape(db.get('plans', s.planId)?.name || '')}</b></td><td>${escape(s.car)}<small class="muted d-block">${escape(s.plate)}</small></td><td>${money(s.price)}</td><td>${s.status === 'activa' ? fmtDay(s.nextBilling) : '—'}</td><td>${statusBadge(SUB_STATES, s.status)}</td><td class="nowrap">${s.status === 'activa' ? `<button class="btn btn-sm" data-pause="${s.id}">Pausar</button> <button class="btn btn-sm btn-ghost" data-cancelsub="${s.id}">Cancelar</button>` : s.status === 'pausada' ? `<button class="btn btn-sm" data-resume="${s.id}">Reanudar</button>` : ''}</td></tr>`)) + '<a class="btn btn-sm" href="#/planes">Ver planes</a>';
    if (tab === 'orders') body = tbl(['Pedido', 'Fecha', 'Productos', 'Total', 'Estado'], ords.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => `<tr><td class="mono">${o.code}</td><td>${date(o.createdAt)}</td><td class="small">${o.items.map(i => `${i.qty}× ${escape(i.name)}`).join('<br>')}</td><td>${money(o.total)}</td><td>${statusBadge(ORDER_STATES, o.status)}</td></tr>`));
    if (tab === 'svc') body = tbl(['Código', 'Servicio', 'Auto', 'Fecha', 'Lugar', 'Estado', ''], bks.sort((a, b) => b.date.localeCompare(a.date)).map(b => `<tr><td class="mono">${b.code}</td><td>${escape(db.get('serviceTypes', b.serviceId)?.name || '')}${b.plan ? ' <span class="badge badge-primary">Plan</span>' : ''}</td><td>${escape(b.carDesc)}<small class="muted d-block">${escape(b.plate)}</small></td><td>${fmtDay(b.date)} ${b.slot}</td><td>${b.mode === 'domicilio' ? '🏠 ' + escape(b.address) : '🏢 ' + escape(branchById(b.branchId)?.name || '')}</td><td>${statusBadge(BOOK_STATES, b.status)}</td><td>${['agendada', 'confirmada'].includes(b.status) ? `<button class="btn btn-sm btn-ghost" data-cancelbk="${b.id}">Cancelar</button>` : ''}</td></tr>`)) + '<a class="btn btn-sm" href="#/servicios">Agendar servicio</a>';
    if (tab === 'fin') body = tbl(['Fecha', 'Monto', 'Pie', 'Cuotas', 'CAE', 'Estado'], fins.map(f => `<tr><td>${date(f.createdAt)}</td><td>${money(f.price)}</td><td>${money(f.pie)}</td><td>${f.cuotas} × ${money(f.cuota)}</td><td>${String(f.cae).replace('.', ',')}%</td><td>${statusBadge(FIN_STATES, f.status)}</td></tr>`)) + '<a class="btn btn-sm" href="#/financiamiento">Simular otro crédito</a>';
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow">Mi cuenta</span><h1 style="margin:0">Hola, ${escape(u.name.split(' ')[0])}</h1><p class="muted" style="margin:0">${escape(u.email)}</p></div><button class="btn btn-sm btn-ghost" data-out>Cerrar sesión</button></div>
      <div class="tabs">${TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l}${counts[k] ? ` (${counts[k]})` : ''}</button>`).join('')}</div>
      <div class="stack">${body}</div></div></section>`;
  };
  el.addEventListener('click', async e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    if (e.target.closest('[data-out]')) { auth.logout(); location.href = 'index.html'; return; }
    const a = x => e.target.closest(`[${x}]`)?.getAttribute(x);
    let id;
    if ((id = a('data-cancelres')) && await confirm('Se cancelará la reserva y se devolverá el abono a tu tarjeta.', { title: 'Cancelar reserva', ok: 'Cancelar reserva', danger: true })) { const r = db.get('reservations', id); db.update('reservations', id, { status: 'cancelada' }); const c = db.get('cars', r.carId); if (c?.status === 'reservado') db.update('cars', c.id, { status: 'publicado' }); db.log('reservas', `${u.name} canceló ${r.code}`, u.id); toast('Reserva cancelada, abono reembolsado', 'success'); }
    if ((id = a('data-pause'))) { db.update('subscriptions', id, { status: 'pausada' }); toast('Suscripción pausada', 'success'); }
    if ((id = a('data-resume'))) { db.update('subscriptions', id, { status: 'activa' }); toast('Suscripción reanudada', 'success'); }
    if ((id = a('data-cancelsub')) && await confirm('¿Cancelar tu plan de mantención?', { danger: true, ok: 'Cancelar plan' })) { db.update('subscriptions', id, { status: 'cancelada', canceledAt: new Date().toISOString() }); db.log('suscripciones', `${u.name} canceló su plan`, u.id); toast('Plan cancelado', 'success'); }
    if ((id = a('data-cancelbk')) && await confirm('¿Cancelar esta hora?', { danger: true, ok: 'Cancelar hora' })) { db.update('bookings', id, { status: 'cancelada' }); toast('Hora cancelada', 'success'); }
    if (e.target.closest('[data-addcar]')) {
      const v = await formModal({ title: 'Registrar mi auto', fields: [{ name: 'brand', label: 'Marca', type: 'select', options: BRANDS }, { name: 'model', label: 'Modelo', required: true }, { name: 'year', label: 'Año', type: 'number', value: 2020, required: true }, { name: 'plate', label: 'Patente', required: true }, { name: 'km', label: 'Kilometraje (km)', type: 'number', value: 50000 }, { name: 'body', label: 'Carrocería', type: 'select', options: [['sedan', 'Sedán'], ['hatch', 'Hatchback'], ['suv', 'SUV'], ['pickup', 'Camioneta']] }] });
      if (!v) return;
      const plate = normPlate(v.plate);
      if (!/^[A-Z]{2,4}-?\d{2,4}$/.test(plate)) { toast('Patente inválida', 'warning'); return; }
      db.insert('garage', { userId: u.id, brand: v.brand, model: v.model, year: v.year, plate, km: v.km || 0, body: v.body, color: PAINT[db.count('garage') % PAINT.length][1] }); toast('Auto registrado', 'success');
    }
  });
  paint();
  return { refresh: paint };
}
