// Pagos QR: generar un código para cobrar y simular el escaneo para pagar en comercios.
import { db, site } from '../data/db.js';
import { money, toast, confirm, sleep } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { account, postTx, evaluateFraud, notify, qrSvg } from '../shared/bank.js';
import { pageHead } from './common.js';

const MERCHANTS = [['Café Altamira', 'Restaurantes', 4200], ['Feria Libre Puesto 14', 'Supermercado', 7800], ['Almacén Don Lucho', 'Supermercado', 12350], ['Sanguchería El Roble', 'Restaurantes', 9900], ['Taxi Rápido Sur', 'Transporte', 6500], ['Librería Andina', 'Compras', 15990]];
const st = { tab: 'pagar', charge: null, scanning: false };

export function render(el, { user }) {
  const vista = account(user.id, 'vista');
  const max = site().limits.qrMax;
  el.innerHTML = h`${raw(pageHead('Pagos QR', `Paga o cobra sin tarjeta · máximo ${money(max)} por operación`))}
  <div class="tabs" role="tablist">${[['pagar', '📷 Pagar (escanear)'], ['cobrar', '🔳 Cobrar (generar)']].map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" role="tab" aria-selected="${st.tab === k}" data-tab="${k}">${l}</button>`)}</div>
  ${st.tab === 'pagar' ? raw(h`<div class="grid-2" style="align-items:start">
    <section class="card stack"><div class="scanner" data-scanner><span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span><span>${st.scanning ? '' : 'Apunta la cámara al código QR (simulado)'}</span></div>
      <button class="btn btn-primary" data-scan>${st.scanning ? 'Escaneando…' : '📷 Escanear código'}</button></section>
    <section class="card stack"><h3 style="margin:0">¿No puedes escanear?</h3><p class="muted small" style="margin:0">Ingresa el código de 8 caracteres que aparece bajo el QR.</p>
      <div class="field"><label for="qcode">Código</label><input class="input mono" id="qcode" maxlength="8" placeholder="CP-XXXXX"></div>
      <button class="btn" data-code>Buscar comercio</button>
      <p class="small muted">Saldo disponible: <b>${money(vista.balance)}</b></p></section>
  </div>`) : raw(h`<div class="grid-2" style="align-items:start">
    <section class="card stack"><h3 style="margin:0">Crear cobro</h3>
      <div class="field"><label for="camt">Monto</label><input class="input" id="camt" inputmode="numeric" placeholder="$0" value="${st.charge ? money(st.charge.amount) : ''}"></div>
      <div class="field"><label for="cdesc">Descripción</label><input class="input" id="cdesc" maxlength="40" placeholder="Ej: Empanadas de pino" value="${st.charge?.desc || ''}"></div>
      <button class="btn btn-primary" data-gen>Generar QR</button></section>
    <section class="card stack" style="align-items:center;text-align:center">
      ${st.charge ? raw(h`<div class="qr-box">${raw(qrSvg(st.charge.code + st.charge.amount))}</div><b class="mono">${st.charge.code}</b><span class="amount" style="font-size:28px;font-weight:700">${money(st.charge.amount)}</span><span class="muted small">${st.charge.desc || 'Cobro Cóndor Pay'} · a nombre de ${user.name}</span>
        <div class="row" style="justify-content:center"><button class="btn btn-sm" data-sim>Simular que me pagan</button><button class="btn btn-sm btn-ghost" data-clear>Anular</button></div>`) : raw('<div class="empty"><span class="icon">🔳</span>Ingresa un monto para generar tu código QR de cobro.</div>')}
    </section></div>`)}`;

  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; render(el, { user }); });
  const payMerchant = async (name, category, amount) => {
    if (account(user.id, 'vista').status !== 'activa') { toast('Tu Cuenta Vista está congelada', 'error'); return; }
    if (amount > max) { toast(`El monto supera el máximo QR de ${money(max)}`, 'error'); return; }
    if (amount > account(user.id, 'vista').balance) { toast('Saldo insuficiente', 'error'); return; }
    if (!(await confirm(`Pagar ${money(amount)} a ${name}`, { title: 'Confirmar pago QR', ok: 'Pagar' }))) return;
    const tx = postTx(account(user.id, 'vista'), { amount: -amount, desc: name, category, type: 'qr', counterpart: 'Pago QR', channel: 'qr' });
    const { held } = evaluateFraud(tx);
    db.log('qr', `${user.name} pagó ${money(amount)} con QR a ${name}`, user.id);
    toast(held ? 'Pago retenido para revisión' : `Pagaste ${money(amount)} a ${name}`, held ? 'warning' : 'success');
  };
  el.querySelector('[data-scan]')?.addEventListener('click', async () => {
    st.scanning = true;
    const sc = el.querySelector('[data-scanner]');
    sc.insertAdjacentHTML('beforeend', '<div class="camera" style="position:absolute;inset:0;border:0;background:transparent"><div class="scan"></div></div>');
    el.querySelector('[data-scan]').disabled = true;
    await sleep(1500);
    st.scanning = false;
    const [name, cat, base] = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    render(el, { user });
    payMerchant(name, cat, base);
  });
  el.querySelector('[data-code]')?.addEventListener('click', () => {
    const c = el.querySelector('#qcode').value.trim();
    if (c.length < 4) { toast('Ingresa un código válido', 'warning'); return; }
    const [name, cat, base] = MERCHANTS[c.length % MERCHANTS.length];
    payMerchant(name, cat, base);
  });
  const camt = el.querySelector('#camt');
  camt?.addEventListener('input', () => { const v = +camt.value.replace(/\D/g, ''); camt.value = v ? money(v) : ''; });
  el.querySelector('[data-gen]')?.addEventListener('click', () => {
    const amount = +camt.value.replace(/\D/g, '');
    if (!amount || amount < 500) { toast('Ingresa un monto de al menos $500', 'warning'); return; }
    st.charge = { amount, desc: el.querySelector('#cdesc').value.trim(), code: 'CP-' + Math.random().toString(36).slice(2, 7).toUpperCase() };
    render(el, { user });
  });
  el.querySelector('[data-clear]')?.addEventListener('click', () => { st.charge = null; render(el, { user }); });
  el.querySelector('[data-sim]')?.addEventListener('click', () => {
    const c = st.charge; st.charge = null;
    postTx(account(user.id, 'vista'), { amount: c.amount, desc: `Cobro QR · ${c.desc || c.code}`, category: 'Ingresos', type: 'qr', counterpart: 'Cliente Cóndor Pay (simulado)' });
    notify(user.id, 'Recibiste un pago QR', `Te pagaron ${money(c.amount)} por "${c.desc || c.code}".`, 'abono');
    toast(`Recibiste ${money(c.amount)}`, 'success');
  });
}
