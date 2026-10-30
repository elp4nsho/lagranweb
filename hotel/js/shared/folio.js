// Folio del huésped (cargos y pagos) y vista de boleta/factura imprimible.
import { modal, money, escape, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { folioTotals, addFolio, typeById, roomById, settings } from './hotel.js';
import { fmtDay, fmtRange } from './dates.js';

const CHARGES = ['Minibar', 'Restaurante Marea Alta', 'Bar del lobby', 'Room service', 'Lavandería', 'Spa Marejada', 'Estacionamiento', 'Daño / reposición'];

export function folioModal(resId, user, { onSettle } = {}) {
  const body = document.createElement('div');
  body.className = 'stack';
  const m = modal({ title: 'Folio', size: 'lg', body, foot: '<span></span>' });
  const paint = () => {
    const res = db.get('reservations', resId);
    const ft = folioTotals(res);
    m.el.querySelector('.modal-head h3').textContent = `Folio ${res.code} · ${res.guestName}`;
    body.innerHTML = `<div class="row between small"><span>${escape(typeById(res.roomTypeId)?.name || '')}${res.roomId ? ` · Hab. ${escape(roomById(res.roomId)?.number || '')}` : ''} · ${fmtRange(res.checkIn, res.checkOut)}</span><span class="badge ${ft.balance > 0 ? 'badge-warning' : 'badge-success'}">${ft.balance > 0 ? 'Saldo ' + money(ft.balance) : 'Pagado'}</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Concepto</th><th style="text-align:right">Cargo</th><th style="text-align:right">Pago</th></tr></thead><tbody>
        ${ft.lines.map(l => `<tr><td class="nowrap small">${fmtDay(l.date)}</td><td>${escape(l.desc)}${l.method ? ` <small class="muted">· ${escape(l.method)}</small>` : ''}</td><td style="text-align:right">${l.kind === 'cargo' ? money(l.amount) : ''}</td><td style="text-align:right">${l.kind === 'pago' ? money(l.amount) : ''}</td></tr>`).join('')}
        <tr class="tot"><td></td><td><b>Totales</b></td><td style="text-align:right"><b>${money(ft.charges)}</b></td><td style="text-align:right"><b>${money(ft.payments)}</b></td></tr>
      </tbody></table></div>
      <div class="grid-2">
        <form class="card stack" data-f="cargo"><b>Agregar cargo</b><div class="row nowrap"><select class="select sm grow" name="desc" aria-label="Concepto">${CHARGES.map(c => `<option>${c}</option>`).join('')}</select><input class="input sm" name="amount" type="number" min="0" step="100" placeholder="Monto" style="width:120px" aria-label="Monto"></div><button class="btn btn-sm">+ Cargo</button></form>
        <form class="card stack" data-f="pago"><b>Registrar pago</b><div class="row nowrap"><select class="select sm grow" name="method" aria-label="Medio">${['Tarjeta de crédito', 'Tarjeta de débito', 'Efectivo', 'Transferencia'].map(c => `<option>${c}</option>`).join('')}</select><input class="input sm" name="amount" type="number" min="0" step="100" value="${Math.max(0, ft.balance)}" style="width:120px" aria-label="Monto"></div><button class="btn btn-sm btn-primary">Registrar pago</button></form>
      </div>`;
    m.el.querySelector('.modal-foot').innerHTML = `<button class="btn btn-ghost" data-inv>🧾 Ver boleta</button>${onSettle ? `<button class="btn btn-primary" data-settle ${ft.balance > 0 ? 'disabled title="Hay saldo pendiente"' : ''}>Confirmar check-out</button>` : '<button class="btn btn-primary" data-close>Cerrar</button>'}`;
  };
  body.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, amount = Number(f.amount.value);
    if (!(amount > 0)) { toast('Ingresa un monto válido', 'warning'); return; }
    if (f.dataset.f === 'cargo') addFolio(resId, { desc: f.desc.value, amount, kind: 'cargo' }, user?.id);
    else addFolio(resId, { desc: 'Pago en recepción', amount, kind: 'pago', method: f.method.value }, user?.id);
    toast(f.dataset.f === 'cargo' ? 'Cargo agregado' : 'Pago registrado', 'success');
    paint();
  });
  m.el.querySelector('.modal-foot').addEventListener('click', e => {
    if (e.target.closest('[data-inv]')) invoiceModal(resId);
    if (e.target.closest('[data-settle]')) { m.close(); onSettle(); }
  });
  paint();
}

export function invoiceModal(resId) {
  const res = db.get('reservations', resId), g = db.get('guests', res.guestId), c = settings();
  const ft = folioTotals(res);
  const net = Math.round(ft.charges / 1.19), iva = ft.charges - net;
  modal({ title: 'Boleta electrónica (demo)', size: 'lg', body: `<div class="invoice">
    <div class="row between"><div><b class="inv-brand">${escape(c.name)}</b><div class="small muted">Inversiones Bahía Lumen SpA · RUT 76.543.210-K<br>${escape(c.address)}</div></div>
      <div class="inv-box"><b>BOLETA ELECTRÓNICA</b><span>N° ${escape(res.code.replace('BL-', ''))}${String(ft.lines.length).padStart(2, '0')}</span><small>${fmtDay(res.checkOut, { year: true })}</small></div></div>
    <div class="small"><b>Huésped:</b> ${escape(g?.name || res.guestName)} · ${escape(g?.doc || '')} · ${escape(g?.country || '')}<br><b>Estadía:</b> ${fmtRange(res.checkIn, res.checkOut)} · ${res.nights} noches · ${escape(typeById(res.roomTypeId)?.name || '')}</div>
    <table class="table"><thead><tr><th>Detalle</th><th style="text-align:right">Monto</th></tr></thead><tbody>${ft.lines.filter(l => l.kind === 'cargo').map(l => `<tr><td>${escape(l.desc)}</td><td style="text-align:right">${money(l.amount)}</td></tr>`).join('')}</tbody></table>
    <div class="inv-tot"><div><span>Neto</span><b>${money(net)}</b></div><div><span>IVA 19%</span><b>${money(iva)}</b></div><div class="big"><span>Total</span><b>${money(ft.charges)}</b></div><div><span>Pagado</span><b>${money(ft.payments)}</b></div><div><span>Saldo</span><b>${money(Math.max(0, ft.balance))}</b></div></div>
    <p class="small muted">Documento de demostración sin validez tributaria. Huéspedes extranjeros con pago en dólares están exentos de IVA (no aplicado en la demo).</p></div>`,
    foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">Imprimir</button>' });
}
