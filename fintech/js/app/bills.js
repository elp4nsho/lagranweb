// Pago de cuentas de servicios básicos: inscritas, consulta de deuda simulada y pago.
import { db } from '../data/db.js';
import { money, date, toast, confirm, modal, sleep } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { account, postTx, BILLERS, badge } from '../shared/bank.js';
import { pageHead } from './common.js';

export function render(el, { user }) {
  const vista = account(user.id, 'vista');
  const bills = db.query('bills', b => b.userId === user.id);
  const pend = bills.filter(b => b.status === 'pendiente').sort((a, b) => a.due.localeCompare(b.due));
  const paid = bills.filter(b => b.status === 'pagada').sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''));
  const total = pend.reduce((s, b) => s + b.amount, 0);
  const biller = id => BILLERS.find(b => b.id === id) || { name: id, icon: '🧾', type: '' };
  const days = d => Math.ceil((new Date(d) - Date.now()) / 864e5);

  el.innerHTML = h`${raw(pageHead('Pagar cuentas', `Saldo Cuenta Vista ${money(vista.balance)}`, pend.length > 1 ? `<button class="btn btn-primary" data-all>Pagar todo (${money(total)})</button>` : ''))}
  <section class="card"><h3>Cuentas por pagar</h3>
    ${pend.length ? raw(h`<div class="table-wrap"><table class="table"><thead><tr><th>Servicio</th><th class="hide-sm">N° cliente</th><th>Vence</th><th class="right">Monto</th><th></th></tr></thead><tbody>
      ${pend.map(b => { const bl = biller(b.billerId), d = days(b.due); return h`<tr><td><b>${bl.icon} ${bl.name}</b><br><span class="small muted">${bl.type}</span></td><td class="hide-sm mono">${b.clientNumber}</td><td>${date(b.due, { day: '2-digit', month: 'short' })} ${d <= 3 ? raw(`<span class="badge badge-${d < 0 ? 'danger' : 'warning'}">${d < 0 ? 'vencida' : d === 0 ? 'hoy' : `${d} días`}</span>`) : ''}</td><td class="right amt">${money(b.amount)}</td><td class="right"><button class="btn btn-sm btn-primary" data-pay="${b.id}">Pagar</button></td></tr>`; })}
    </tbody></table></div>`) : raw('<div class="empty"><span class="icon">🎉</span>No tienes cuentas pendientes.</div>')}
  </section>
  <section class="card"><h3>Agregar y pagar un servicio</h3><p class="muted small">Elige la empresa, ingresa tu número de cliente y consultamos tu deuda (simulado).</p>
    <div class="grid-auto">${BILLERS.map(b => h`<button class="contact" data-biller="${b.id}"><span class="tx-ic">${b.icon}</span><span class="tx-main"><b>${b.name}</b><small>${b.type}</small></span></button>`)}</div>
  </section>
  <section class="card"><h3>Pagos realizados</h3>
    <ul class="tx-list">${paid.map(b => { const bl = biller(b.billerId); return h`<li><span class="tx-ic">${bl.icon}</span><span class="tx-main"><b>${bl.name}</b><small>N° ${b.clientNumber} · pagada ${b.paidAt ? date(b.paidAt) : ''}</small></span>${raw(badge('pagada'))}<span class="amt">${money(b.amount)}</span></li>`; })}</ul>
    ${!paid.length ? raw('<p class="muted">Aún no has pagado cuentas desde Cóndor Pay.</p>') : ''}
  </section>`;

  const pay = async list => {
    const sum = list.reduce((s, b) => s + b.amount, 0);
    if (vista.status !== 'activa') { toast('Tu Cuenta Vista está congelada', 'error'); return; }
    if (sum > vista.balance) { toast('Saldo insuficiente', 'error'); return; }
    if (!(await confirm(`Pagarás ${list.length === 1 ? biller(list[0].billerId).name : list.length + ' cuentas'} por ${money(sum)} desde tu Cuenta Vista.`, { title: 'Confirmar pago', ok: 'Pagar ' + money(sum) }))) return;
    list.forEach(b => {
      const bl = biller(b.billerId);
      postTx(account(user.id, 'vista'), { amount: -b.amount, desc: `Pago cuenta ${bl.name}`, category: 'Servicios', type: 'pago', counterpart: `N° cliente ${b.clientNumber}` });
      db.update('bills', b.id, { status: 'pagada', paidAt: new Date().toISOString() });
    });
    db.log('pago', `${user.name} pagó ${list.length} cuenta(s) por ${money(sum)}`, user.id);
    toast('Pago realizado con éxito', 'success');
  };
  el.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => pay([db.get('bills', b.dataset.pay)]));
  el.querySelector('[data-all]')?.addEventListener('click', () => pay(pend));
  el.querySelectorAll('[data-biller]').forEach(b => b.onclick = () => addBill(user, biller(b.dataset.biller), b.dataset.biller));
}

function addBill(user, bl, billerId) {
  const m = modal({
    title: `${bl.icon} ${bl.name}`,
    body: `<form class="stack" novalidate><div class="field"><label for="cn">N° de cliente</label><input class="input" id="cn" placeholder="Aparece en tu boleta" required></div><div data-res></div></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-q>Consultar deuda</button>',
  });
  let found = null;
  const q = m.el.querySelector('[data-q]');
  const run = async e => {
    e && e.preventDefault();
    const cn = m.el.querySelector('#cn').value.trim();
    if (found) {
      const b = db.insert('bills', { userId: user.id, billerId, clientNumber: cn, amount: found, due: new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10), status: 'pendiente' });
      m.close(); toast('Cuenta inscrita. Ya puedes pagarla.', 'success'); void b; return;
    }
    if (cn.length < 3) { toast('Ingresa un número de cliente válido', 'warning'); return; }
    q.disabled = true; m.el.querySelector('[data-res]').innerHTML = '<div class="row"><span class="spinner"></span> Consultando con la empresa…</div>';
    await sleep(900);
    found = 8000 + Math.round(Math.random() * 90) * 1000 + 490;
    m.el.querySelector('[data-res]').innerHTML = `<div class="notice ok">Deuda vigente: <b>${money(found)}</b> · vence en 9 días.</div>`;
    q.disabled = false; q.textContent = 'Inscribir cuenta';
  };
  q.onclick = run;
  m.el.querySelector('form').onsubmit = run;
}
