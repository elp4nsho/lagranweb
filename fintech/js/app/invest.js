// Mini-portafolio de fondos mutuos con rentabilidad simulada y gráficos de evolución.
import { db } from '../data/db.js';
import { money, date, toast, confirm, formModal, lineChart, donutChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { account, postTx, fundSeries, investmentValue } from '../shared/bank.js';
import { multiLine } from '../shared/charts.js';
import { pageHead } from './common.js';

const st = { fund: null };
const pctf = n => `${n >= 0 ? '+' : ''}${n.toFixed(2).replace('.', ',')}%`;

export function render(el, { user }) {
  const funds = db.query('funds', f => f.active);
  const inv = db.query('investments', i => i.userId === user.id);
  const rows = inv.map(i => ({ ...i, fund: db.get('funds', i.fundId), value: investmentValue(i) }));
  const invested = rows.reduce((s, r) => s + r.amount, 0), value = rows.reduce((s, r) => s + r.value, 0);
  const gain = value - invested;
  const sel = funds.find(f => f.id === st.fund) || funds[0];
  const series = fundSeries(sel, 12);
  const ret = (series.at(-1).value / series[0].value - 1) * 100;

  el.innerHTML = h`${raw(pageHead('Inversiones', 'Fondos mutuos ficticios: la rentabilidad es simulada.'))}
  <div class="kpis">
    <div class="card"><div class="stat"><span class="label">Valor actual</span><span class="value">${money(value)}</span><span class="delta ${gain >= 0 ? 'up' : 'down'}">${gain >= 0 ? '▲' : '▼'} ${money(Math.abs(gain))} (${pctf(invested ? gain / invested * 100 : 0)})</span></div></div>
    <div class="card"><div class="stat"><span class="label">Total invertido</span><span class="value">${money(invested)}</span><span class="small muted">${rows.length} fondo(s)</span></div></div>
    <div class="card">${rows.length ? raw(donutChart(rows.map(r => ({ label: r.fund?.name.replace('Fondo ', '') || '—', value: Math.round(r.value / 1000) })), { size: 110, label: '' })) : raw('<p class="muted">Sin inversiones aún.</p>')}<p class="small muted" style="margin:6px 0 0">Distribución (miles de $)</p></div>
  </div>
  <section class="card"><h3>Mis fondos</h3>
    ${rows.length ? raw(h`<div class="table-wrap"><table class="table"><thead><tr><th>Fondo</th><th class="hide-sm">Desde</th><th class="right">Invertido</th><th class="right">Valor</th><th class="right">Rent.</th><th></th></tr></thead><tbody>
    ${rows.map(r => h`<tr><td><b>${r.fund?.name}</b><br><span class="small muted">${r.fund?.risk}</span></td><td class="hide-sm">${date(r.since)}</td><td class="right amt">${money(r.amount)}</td><td class="right amt">${money(r.value)}</td><td class="right"><span class="badge badge-${r.value >= r.amount ? 'success' : 'danger'}">${pctf((r.value / r.amount - 1) * 100)}</span></td><td class="right"><button class="btn btn-sm" data-sell="${r.id}">Rescatar</button></td></tr>`)}
    </tbody></table></div>`) : raw('<div class="empty">Aún no inviertes. Elige un fondo abajo y parte desde $5.000.</div>')}
  </section>
  <div class="grid-2" style="align-items:start">
    <section class="card stack">
      <div class="row between"><h3 style="margin:0">${sel.name}</h3><span class="badge badge-${ret >= 0 ? 'success' : 'danger'}">${pctf(ret)} 12m</span></div>
      <div class="chips">${funds.map(f => h`<button class="chip ${f.id === sel.id ? 'active' : ''}" data-fund="${f.id}">${f.name.replace('Fondo ', '')}</button>`)}</div>
      ${raw(lineChart(series, { format: v => `$${v.toFixed(2)}` }))}
      <p class="small muted" style="margin:0">${sel.desc} · Riesgo ${sel.risk} · Inversión mínima ${money(sel.minInvest)} · Valor cuota simulado.</p>
      <button class="btn btn-primary" data-buy="${sel.id}">Invertir en este fondo</button>
    </section>
    <section class="card"><h3>Comparación (base 100)</h3>${raw(multiLine(funds.map(f => { const s = fundSeries(f, 12); return { name: f.name.replace('Fondo ', ''), points: s.map(p => ({ label: p.label, value: Math.round(p.value / s[0].value * 1000) / 10 })) }; }), { format: v => v.toFixed(0) }))}</section>
  </div>`;

  el.querySelectorAll('[data-fund]').forEach(b => b.onclick = () => { st.fund = b.dataset.fund; render(el, { user }); });
  el.querySelector('[data-buy]').onclick = async () => {
    const f = db.get('funds', el.querySelector('[data-buy]').dataset.buy);
    const vis = account(user.id, 'vista');
    const v = await formModal({ title: `Invertir en ${f.name}`, fields: [{ name: 'amount', label: `Monto (mínimo ${money(f.minInvest)}, disponible ${money(vis.balance)})`, type: 'number', required: true, value: Math.max(f.minInvest, 50000) }, { name: 'ok', label: 'Entiendo que la rentabilidad pasada no garantiza la futura (y que esto es ficticio)', type: 'checkbox' }], submit: 'Invertir' });
    if (!v) return;
    if (!v.ok) return toast('Debes aceptar la declaración de riesgo', 'warning');
    if (v.amount < f.minInvest) return toast(`El mínimo es ${money(f.minInvest)}`, 'warning');
    if (v.amount > vis.balance) return toast('Saldo insuficiente', 'error');
    postTx(vis, { amount: -v.amount, desc: `Inversión ${f.name}`, category: 'Inversiones', type: 'transferencia', counterpart: 'Cóndor Inversiones' });
    db.insert('investments', { userId: user.id, fundId: f.id, amount: v.amount, since: new Date().toISOString() });
    db.log('inversion', `${user.name} invirtió ${money(v.amount)} en ${f.name}`, user.id);
    toast('Inversión realizada', 'success');
  };
  el.querySelectorAll('[data-sell]').forEach(b => b.onclick = async () => {
    const r = rows.find(x => x.id === b.dataset.sell);
    if (!(await confirm(`Rescatarás ${money(r.value)} de ${r.fund.name}. El dinero llegará a tu Cuenta Vista.`, { title: 'Rescatar inversión', ok: 'Rescatar' }))) return;
    postTx(account(user.id, 'vista'), { amount: r.value, desc: `Rescate ${r.fund.name}`, category: 'Inversiones', type: 'abono', counterpart: 'Cóndor Inversiones' });
    db.remove('investments', r.id);
    toast('Rescate realizado', 'success');
  });
}
