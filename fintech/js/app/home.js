// Inicio del cliente: saldos, accesos rápidos, últimos movimientos y resumen del mes.
import { db } from '../data/db.js';
import { money, date } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { accountsOf, creditAvailable, monthKey, BILLERS, CAT_ICON } from '../shared/bank.js';
import { txItem, txDetail } from './common.js';

export function render(el, { user, active }) {
  const accs = accountsOf(user.id);
  const vista = accs.find(a => a.type === 'vista'), ahorro = accs.find(a => a.type === 'ahorro'), cred = accs.find(a => a.type === 'credito');
  const txs = db.query('transactions', t => t.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
  const mk = monthKey(new Date());
  const spent = {};
  txs.filter(t => monthKey(t.date) === mk && t.amount < 0 && !['Transferencias', 'Ahorro', 'Inversiones'].includes(t.category) && t.status !== 'rechazada').forEach(t => spent[t.category] = (spent[t.category] || 0) + -t.amount);
  const cats = Object.entries(spent).sort((a, b) => b[1] - a[1]);
  const totalSpent = cats.reduce((s, c) => s + c[1], 0);
  const max = cats[0]?.[1] || 1;
  const goals = db.query('goals', g => g.userId === user.id);
  const bills = db.query('bills', b => b.userId === user.id && b.status === 'pendiente').sort((a, b) => a.due.localeCompare(b.due));
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  el.innerHTML = h`
  <div class="page-head"><div><span class="eyebrow">${date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>${hello}, ${user.name.split(' ')[0]}</h1></div>
    <a class="btn btn-primary" href="#/transferir">↔️ Transferir</a></div>
  ${!active ? raw(`<div class="notice ${user.kyc === 'rechazado' ? 'danger' : 'warn'}"><b>${user.kyc === 'rechazado' ? 'Solicitud rechazada.' : 'Cuenta en revisión.'}</b> ${user.kyc === 'rechazado' ? 'Contáctanos desde Ayuda.' : 'Validaremos tu identidad en menos de 24 horas. Algunas funciones están deshabilitadas.'}</div>`) : ''}
  <div class="kpis">
    <div class="card balance-card"><div class="stat"><span class="label">Cuenta Vista · ${vista?.number || ''}</span><span class="amount" data-balance="vista">${money(vista?.balance)}</span><span class="small muted">Saldo disponible</span></div></div>
    <div class="card balance-card"><div class="stat"><span class="label">Cuenta de Ahorro · ${ahorro?.number || ''}</span><span class="amount">${money(ahorro?.balance)}</span><span class="small muted">Rentabilidad ${String(db.getValue('site').fees.find(f => f.id === 'tasaAhorro')?.value).replace('.', ',')}% anual</span></div></div>
    ${cred ? raw(h`<div class="card balance-card"><div class="stat"><span class="label">Tarjeta de Crédito · cupo ${money(cred.limit)}</span><span class="amount">${money(creditAvailable(cred))}</span><span class="small muted">Disponible · usado ${money(cred.balance)}</span></div><div class="progress" style="margin-top:10px"><i style="--v:${Math.min(100, cred.balance / cred.limit * 100)}%"></i></div></div>`) : ''}
  </div>
  <div class="card"><div class="quick">
    ${[['#/transferir', '↔️', 'Transferir'], ['#/pagos', '🧾', 'Pagar cuentas'], ['#/qr', '📷', 'Pagar con QR'], ['#/tarjeta', '💳', 'Mi tarjeta'], ['#/metas', '🎯', 'Metas'], ['#/inversiones', '📈', 'Invertir'], ['#/creditos', '🏦', 'Simular crédito']].map(([href, ic, l]) => h`<a href="${href}"><span class="ic">${ic}</span>${l}</a>`)}
  </div></div>
  <div class="grid-2" style="align-items:start">
    <section class="card">
      <div class="row between"><h3 style="margin:0">Últimos movimientos</h3><a href="#/movimientos" class="small">Ver todos →</a></div>
      <ul class="tx-list" data-list>${txs.slice(0, 7).map(t => txItem(t))}</ul>
      ${!txs.length ? raw('<div class="empty">Aún no tienes movimientos.</div>') : ''}
    </section>
    <div class="stack">
      <section class="card">
        <div class="row between"><h3 style="margin:0">Gastos del mes</h3><b class="amt">${money(totalSpent)}</b></div>
        <div class="cat-bars mt">${cats.slice(0, 6).map(([c, v]) => h`<div class="r"><span>${CAT_ICON[c] || ''} ${c}</span><span class="bar"><i style="--v:${(v / max * 100).toFixed(1)}%"></i></span><b class="amt">${money(v)}</b></div>`)}</div>
        ${!cats.length ? raw('<p class="muted small">Sin gastos este mes.</p>') : ''}
      </section>
      ${goals.length ? raw(h`<section class="card"><div class="row between"><h3 style="margin:0">Metas</h3><a href="#/metas" class="small">Ver →</a></div>
        <div class="stack mt" style="gap:12px">${goals.map(g => h`<div class="goal"><div class="row between small"><span>${g.icon} ${g.name}</span><b>${Math.round(g.saved / g.target * 100)}%</b></div><div class="progress"><i style="--v:${Math.min(100, g.saved / g.target * 100)}%"></i></div></div>`)}</div></section>`) : ''}
      ${bills.length ? raw(h`<section class="card"><div class="row between"><h3 style="margin:0">Próximos vencimientos</h3><a href="#/pagos" class="small">Pagar →</a></div>
        <ul class="tx-list">${bills.slice(0, 3).map(b => { const bl = BILLERS.find(x => x.id === b.billerId); return h`<li><span class="tx-ic">${bl?.icon}</span><span class="tx-main"><b>${bl?.name}</b><small>Vence ${date(b.due)}</small></span><span class="amt">${money(b.amount)}</span></li>`; })}</ul></section>`) : ''}
    </div>
  </div>`;
  el.querySelector('[data-list]')?.addEventListener('click', e => {
    const li = e.target.closest('[data-tx]'); if (!li) return;
    const t = db.get('transactions', li.dataset.tx); txDetail(t, db.get('accounts', t.accountId));
  });
}
