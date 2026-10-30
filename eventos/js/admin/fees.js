// Tarifas: cargo por servicio, cargo fijo, reserva, reventa y reembolsos. Simulador de precio final.
import { db, settings } from '../data/db.js';
import { html, raw, $, money, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';

export function render(el, { user }) {
  const f = { ...settings().fees };
  el.innerHTML = html`${raw(pageHead('Tarifas y cargos', 'Se aplican al instante en el checkout del sitio público'))}
    <div class="grid-2" style="align-items:start">
      <form class="card stack" id="ff">
        <div class="grid-2"><div class="field"><label for="servicePct">Cargo por servicio (%)</label><input class="input" type="number" step="0.5" min="0" max="30" id="servicePct" value="${f.servicePct}"></div>
        <div class="field"><label for="perTicket">Cargo fijo por entrada ($)</label><input class="input" type="number" step="10" min="0" id="perTicket" value="${f.perTicket}"></div></div>
        <div class="grid-2"><div class="field"><label for="maxPerOrder">Máx. entradas por compra</label><input class="input" type="number" min="1" max="20" id="maxPerOrder" value="${f.maxPerOrder}"></div>
        <div class="field"><label for="holdMinutes">Minutos de reserva de asientos</label><input class="input" type="number" min="1" max="30" id="holdMinutes" value="${f.holdMinutes}"></div></div>
        <div class="grid-2"><div class="field"><label for="resaleCapPct">Tope de reventa sobre precio (%)</label><input class="input" type="number" min="0" max="100" id="resaleCapPct" value="${f.resaleCapPct}"></div>
        <div class="field"><label for="refundWindowDays">Reembolso hasta (días antes)</label><input class="input" type="number" min="0" max="60" id="refundWindowDays" value="${f.refundWindowDays}"></div></div>
        <button class="btn btn-primary">Guardar tarifas</button>
      </form>
      <div class="card stack"><h3 style="margin:0">Simulador</h3>
        <div class="field"><label for="sim">Precio de la entrada</label><input class="input" type="number" id="sim" value="30000" step="1000"></div>
        <div class="field"><label for="simq">Cantidad</label><input class="input" type="number" id="simq" value="2" min="1"></div>
        <div id="simout" class="stack" style="gap:6px"></div></div>
    </div>`;
  const read = () => Object.fromEntries(['servicePct', 'perTicket', 'maxPerOrder', 'holdMinutes', 'resaleCapPct', 'refundWindowDays'].map(k => [k, +$('#' + k).value || 0]));
  const sim = () => {
    const x = read(), p = +$('#sim').value || 0, q = +$('#simq').value || 1, sub = p * q, svc = Math.round(sub * x.servicePct / 100) + x.perTicket * q;
    $('#simout').innerHTML = `<div class="sum-row"><span>Subtotal</span><span>${money(sub)}</span></div><div class="sum-row"><span>Cargo por servicio</span><span>${money(svc)}</span></div><div class="sum-row total"><span>El cliente paga</span><span>${money(sub + svc)}</span></div><small class="muted">Reventa máxima por entrada: ${money(p * (1 + x.resaleCapPct / 100))}</small>`;
  };
  el.addEventListener('input', sim);
  $('#ff').addEventListener('submit', e => {
    e.preventDefault();
    const x = read();
    if (x.maxPerOrder < 1 || x.holdMinutes < 1) return toast('Valores inválidos', 'error');
    db.setValue('settings', { ...settings(), fees: x });
    db.log('tarifas', `Cargo ${x.servicePct}% + ${money(x.perTicket)} · reserva ${x.holdMinutes} min`, user.id);
    toast('Tarifas actualizadas', 'success');
  });
  sim();
  return { static: true };
}
