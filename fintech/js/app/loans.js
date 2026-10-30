// Simulador de crédito de consumo y solicitud (va a la cola de aprobación del back-office).
import { db, site, fee } from '../data/db.js';
import { money, date, toast, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pmt, scoreLoan, badge, account, postTx } from '../shared/bank.js';
import { pageHead, otpFlow } from './common.js';

const st = { amount: 3000000, term: 24, purpose: 'Remodelación hogar' };
const PURPOSES = ['Remodelación hogar', 'Consolidación de deudas', 'Compra de vehículo', 'Estudios', 'Viaje', 'Salud', 'Capital de trabajo'];
const FLOW = ['solicitado', 'en evaluación', 'aprobado', 'desembolsado'];

export function render(el, { user }) {
  const cfg = site().loan;
  st.amount = Math.min(Math.max(st.amount, cfg.min), cfg.max);
  st.term = Math.min(Math.max(st.term, cfg.minTerm), cfg.maxTerm);
  const rate = fee('tasaCredito');
  const mine = db.query('loans', l => l.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const calc = () => {
    const m = pmt(st.amount, rate / 100, st.term);
    const insurance = Math.round(st.amount * .0004) * st.term;
    const total = m * st.term + insurance + 9900;
    const cae = (Math.pow(1 + rate / 100 + (insurance / st.term + 9900 / st.term) / st.amount, 12) - 1) * 100;
    return { m, total, cae, insurance };
  };
  el.innerHTML = h`${raw(pageHead('Créditos', 'Simula y solicita un crédito de consumo (ficticio).'))}
  <div class="grid-2" style="align-items:start">
    <section class="card stack"><h3 style="margin:0">Simulador</h3>
      <div class="field"><label for="la">Monto: <b data-o="amount">${money(st.amount)}</b></label><input class="range" type="range" id="la" min="${cfg.min}" max="${cfg.max}" step="100000" value="${st.amount}"></div>
      <div class="field"><label for="lt">Plazo: <b data-o="term">${st.term} meses</b></label><input class="range" type="range" id="lt" min="${cfg.minTerm}" max="${cfg.maxTerm}" step="6" value="${st.term}"></div>
      <div class="field"><label for="lp">Destino</label><select class="select" id="lp">${PURPOSES.map(p => h`<option ${p === st.purpose ? 'selected' : ''}>${p}</option>`)}</select></div>
      <div class="card" style="background:var(--surface-2)"><div class="stat"><span class="label">Cuota mensual estimada</span><span class="value" data-o="m"></span></div>
        <dl class="kv mt"><dt>Tasa mensual</dt><dd>${String(rate).replace('.', ',')}%</dd><dt>CAE estimada</dt><dd data-o="cae"></dd><dt>Seguro desgravamen</dt><dd data-o="ins"></dd><dt>Impuesto y gastos</dt><dd>$9.900</dd><dt>Costo total</dt><dd data-o="total"></dd></dl></div>
      <button class="btn btn-primary" data-apply>Solicitar este crédito</button>
      <p class="small muted" style="margin:0">Simulación referencial. La aprobación depende de la evaluación de riesgo.</p>
    </section>
    <section class="card stack"><h3 style="margin:0">Mis créditos</h3>
      ${mine.length ? raw(mine.map(l => {
        const idx = FLOW.indexOf(l.status);
        return h`<div class="card" style="background:var(--surface-2)"><div class="row between"><b>${money(l.amount)} · ${l.term} meses</b>${raw(badge(l.status))}</div>
          <p class="small muted" style="margin:6px 0">${l.purpose} · cuota ${money(l.monthly)} · solicitado ${date(l.createdAt)}</p>
          ${l.status === 'rechazado' ? raw(`<div class="notice danger small">No pudimos aprobar esta solicitud${l.notes ? ': ' + l.notes.replace(/</g, '') : ''}.</div>`) : raw(`<div class="steps" style="margin:8px 0 0">${FLOW.map((_, i) => `<i class="${i <= idx ? 'on' : ''}" title="${FLOW[i]}"></i>`).join('')}</div><div class="row between small muted"><span>Solicitado</span><span>Evaluación</span><span>Aprobado</span><span>Abonado</span></div>`)}
          ${l.status === 'desembolsado' ? raw(h`<div class="mt"><div class="row between small"><span>Cuotas pagadas ${l.paid || 0}/${l.term}</span><button class="btn btn-sm" data-pay="${l.id}" ${(l.paid || 0) >= l.term ? 'disabled' : ''}>Pagar cuota</button></div><div class="progress mt"><i style="--v:${(l.paid || 0) / l.term * 100}%"></i></div></div>`) : ''}
        </div>`;
      }).join('')) : raw('<div class="empty">No tienes créditos.</div>')}
    </section>
  </div>`;

  const out = () => {
    const c = calc();
    el.querySelector('[data-o="amount"]').textContent = money(st.amount);
    el.querySelector('[data-o="term"]').textContent = `${st.term} meses`;
    el.querySelector('[data-o="m"]').textContent = money(c.m);
    el.querySelector('[data-o="cae"]').textContent = `${c.cae.toFixed(2).replace('.', ',')}%`;
    el.querySelector('[data-o="ins"]').textContent = money(c.insurance);
    el.querySelector('[data-o="total"]').textContent = money(c.total);
  };
  out();
  el.querySelector('#la').oninput = e => { st.amount = +e.target.value; out(); };
  el.querySelector('#lt').oninput = e => { st.term = +e.target.value; out(); };
  el.querySelector('#lp').onchange = e => st.purpose = e.target.value;
  el.querySelector('[data-apply]').onclick = async () => {
    if (mine.some(l => ['solicitado', 'en evaluación'].includes(l.status))) return toast('Ya tienes una solicitud en evaluación', 'warning');
    const c = calc();
    if (!(await otpFlow(user, `<dl class="kv"><dt>Monto</dt><dd>${money(st.amount)}</dd><dt>Plazo</dt><dd>${st.term} meses</dd><dt>Cuota</dt><dd>${money(c.m)}</dd></dl>`))) return;
    const s = scoreLoan(user, st.amount, st.term);
    db.insert('loans', { userId: user.id, amount: st.amount, term: st.term, rate, monthly: Math.round(c.m), purpose: st.purpose, income: user.income, status: 'solicitado', score: s.score, reviewer: null, notes: '' });
    db.log('credito', `${user.name} solicitó un crédito por ${money(st.amount)} a ${st.term} meses (score ${s.score})`, user.id);
    toast('Solicitud enviada. Te avisaremos el resultado.', 'success');
  };
  el.querySelectorAll('[data-pay]').forEach(b => b.onclick = async () => {
    const l = db.get('loans', b.dataset.pay);
    const vis = account(user.id, 'vista');
    if (l.monthly > vis.balance) return toast('Saldo insuficiente', 'error');
    if (!(await confirm(`Pagar cuota ${(l.paid || 0) + 1} de ${l.term} por ${money(l.monthly)}`, { title: 'Pagar cuota', ok: 'Pagar' }))) return;
    postTx(vis, { amount: -l.monthly, desc: `Cuota ${(l.paid || 0) + 1}/${l.term} crédito de consumo`, category: 'Créditos', type: 'pago' });
    db.update('loans', l.id, { paid: (l.paid || 0) + 1 });
    toast('Cuota pagada', 'success');
  });
}
