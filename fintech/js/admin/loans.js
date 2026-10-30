// Flujo de aprobación de créditos: solicitado → en evaluación → aprobado/rechazado → desembolsado.
import { db, userName } from '../data/db.js';
import { money, date, ago, toast, formModal, barChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge, scoreLoan, scoreBand, account, postTx, notify, pmt, lastMonths, monthKey } from '../shared/bank.js';
import { pageHead, table, csv } from './kit.js';

const st = { status: 'cola' };
const FLOW = ['solicitado', 'en evaluación', 'aprobado', 'desembolsado'];

export function render(el, ctx) {
  if (ctx.params.id) return detail(el, ctx);
  const loans = db.all('loans').map(l => ({ ...l, customer: userName(l.userId) }));
  const rows = loans.filter(l => st.status === 'cola' ? ['solicitado', 'en evaluación'].includes(l.status) : !st.status || l.status === st.status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const months = lastMonths(6);
  const disb = months.map(m => ({ label: m.label, value: Math.round(loans.filter(l => ['desembolsado', 'aprobado'].includes(l.status) && monthKey(l.createdAt) === m.key).reduce((s, l) => s + l.amount, 0) / 1e6) }));
  const decided = loans.filter(l => ['aprobado', 'desembolsado', 'rechazado'].includes(l.status));
  el.innerHTML = pageHead('Créditos', 'Evalúa y aprueba solicitudes de crédito de consumo.', '<button class="btn btn-sm" data-csv>⬇ CSV</button>', !ctx.canWrite) + h`
  <div class="grid-2" style="align-items:start"><div class="kpis">
    <div class="card"><div class="stat"><span class="label">En cola</span><span class="value">${loans.filter(l => ['solicitado', 'en evaluación'].includes(l.status)).length}</span></div></div>
    <div class="card"><div class="stat"><span class="label">Tasa de aprobación</span><span class="value">${decided.length ? Math.round(decided.filter(l => l.status !== 'rechazado').length / decided.length * 100) : 0}%</span></div></div>
    <div class="card"><div class="stat"><span class="label">Monto solicitado en cola</span><span class="value">${money(loans.filter(l => ['solicitado', 'en evaluación'].includes(l.status)).reduce((s, l) => s + l.amount, 0))}</span></div></div>
    <div class="card"><div class="stat"><span class="label">Score promedio</span><span class="value">${Math.round(loans.reduce((s, l) => s + l.score, 0) / Math.max(1, loans.length))}</span></div></div>
  </div><section class="card"><h3>Colocaciones por mes (M$)</h3>${raw(barChart(disb))}</section></div>
  <div class="chips">${[['cola', 'En cola'], ['', 'Todos'], ['aprobado', 'Aprobados'], ['desembolsado', 'Desembolsados'], ['rechazado', 'Rechazados']].map(([k, l]) => h`<button class="chip ${st.status === k ? 'active' : ''}" data-s="${k}">${l}</button>`)}</div>
  <div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, search: l => `${l.customer} ${l.purpose}`,
    columns: [
      { key: 'createdAt', label: 'Solicitud', render: l => ago(l.createdAt) },
      { key: 'customer', label: 'Cliente' },
      { key: 'amount', label: 'Monto', render: l => h`<span class="amt">${money(l.amount)}</span>` },
      { key: 'term', label: 'Plazo', render: l => `${l.term} m` },
      { key: 'purpose', label: 'Destino' },
      { key: 'score', label: 'Score', render: l => { const [lab, k] = scoreBand(l.score); return raw(`<span class="badge badge-${k}" title="${lab}">${l.score}</span>`); } },
      { key: 'status', label: 'Estado', render: l => raw(badge(l.status)) },
    ],
    onRow: l => ctx.go('/creditos/' + l.id),
  });
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { st.status = b.dataset.s; render(el, ctx); });
  el.querySelector('[data-csv]').onclick = () => csv('creditos-condor.csv', rows.map(l => ({ fecha: date(l.createdAt), cliente: l.customer, monto: l.amount, plazo: l.term, tasa: l.rate, cuota: l.monthly, destino: l.purpose, score: l.score, estado: l.status })));
}

function detail(el, { params, user: staff, canWrite }) {
  const l = db.get('loans', params.id);
  if (!l) { el.innerHTML = '<div class="empty">Crédito no encontrado. <a href="#/creditos">Volver</a></div>'; return; }
  const u = db.get('users', l.userId);
  const s = scoreLoan(u, l.amount, l.term);
  const [band, kind] = scoreBand(s.score);
  const idx = FLOW.indexOf(l.status);
  const maxPts = [260, 220, 150, 150, 120];
  el.innerHTML = h`<div class="page-head"><div><a href="#/creditos" class="small">← Créditos</a><h1>Crédito ${money(l.amount)}</h1><p class="muted" style="margin:4px 0 0">${u?.name} · solicitado ${date(l.createdAt)}</p></div><div class="row">${raw(badge(l.status))}${!canWrite ? raw('<span class="badge badge-warning">Solo lectura</span>') : ''}</div></div>
  ${l.status !== 'rechazado' ? raw(`<div class="card"><div class="steps" style="margin:0">${FLOW.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div><div class="row between small muted mt">${FLOW.map(f => `<span>${f}</span>`).join('')}</div></div>`) : raw(`<div class="notice danger">Rechazado${l.notes ? ': ' + l.notes.replace(/</g, '') : ''}</div>`)}
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Solicitud</h3><dl class="kv"><dt>Monto</dt><dd>${money(l.amount)}</dd><dt>Plazo</dt><dd>${l.term} meses</dd><dt>Tasa mensual</dt><dd>${String(l.rate).replace('.', ',')}%</dd><dt>Cuota</dt><dd>${money(l.monthly)}</dd><dt>Destino</dt><dd>${l.purpose}</dd><dt>Renta declarada</dt><dd>${money(u?.income)}</dd><dt>Carga financiera</dt><dd>${(l.monthly / (u?.income || 1) * 100).toFixed(1).replace('.', ',')}% de la renta</dd><dt>Revisor</dt><dd>${l.reviewer ? userName(l.reviewer) : '—'}</dd></dl>
      <p class="small mt"><a href="#/cuentas/${u?.id}">Ver ficha del cliente →</a></p></section>
    <section class="card"><div class="row between"><h3 style="margin:0">Scoring</h3><span class="badge badge-${kind}">${band}</span></div>
      <div class="score-ring mt">${s.score}<span class="muted small"> / 999</span></div>
      <div class="cat-bars mt">${s.parts.map((p, i) => h`<div class="r"><span>${p.label}</span><span class="bar"><i style="--v:${Math.min(100, p.pts / maxPts[i] * 100)}%"></i></span><b>${p.pts}</b></div>`)}</div>
      <p class="small muted mt">Score al momento de la solicitud: ${l.score}. El score se recalcula con los datos actuales del cliente.</p></section>
  </div>
  ${canWrite ? raw(`<div class="card row">${l.status === 'solicitado' ? '<button class="btn" data-eval>Tomar para evaluación</button>' : ''}${['solicitado', 'en evaluación'].includes(l.status) ? '<button class="btn btn-primary" data-approve>Aprobar</button><button class="btn btn-danger" data-reject>Rechazar</button>' : ''}${l.status === 'aprobado' ? '<button class="btn btn-primary" data-disburse>Desembolsar a cuenta vista</button>' : ''}${['desembolsado', 'rechazado'].includes(l.status) ? '<span class="muted small">Este crédito ya fue resuelto.</span>' : ''}</div>`) : ''}`;
  if (!canWrite) return;
  const set = (patch, logMsg, msg) => { db.update('loans', l.id, { reviewer: staff.id, ...patch }); db.log('credito', logMsg, staff.id); toast(msg, 'success'); };
  el.querySelector('[data-eval]')?.addEventListener('click', () => set({ status: 'en evaluación' }, `${staff.name} tomó en evaluación el crédito de ${u.name}`, 'Crédito en evaluación'));
  el.querySelector('[data-approve]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Aprobar crédito', fields: [{ name: 'amount', label: 'Monto aprobado', type: 'number', value: l.amount, required: true }, { name: 'rate', label: 'Tasa mensual (%)', type: 'number', step: '0.01', value: l.rate, required: true }, { name: 'notes', label: 'Comentario', value: s.score >= 750 ? 'Buen perfil de riesgo.' : '' }], submit: 'Aprobar' });
    if (!v) return;
    const monthly = Math.round(pmt(v.amount, v.rate / 100, l.term));
    set({ status: 'aprobado', amount: v.amount, rate: v.rate, monthly, notes: v.notes }, `${staff.name} aprobó crédito de ${u.name} por ${money(v.amount)}`, 'Crédito aprobado');
    notify(u.id, '¡Tu crédito fue aprobado!', `Aprobamos tu crédito por ${money(v.amount)} en ${l.term} cuotas de ${money(monthly)}. Pronto lo abonaremos.`, 'credito');
  });
  el.querySelector('[data-reject]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Rechazar crédito', fields: [{ name: 'notes', label: 'Motivo', type: 'select', options: ['Carga financiera excesiva', 'Score insuficiente', 'Antigüedad insuficiente', 'Información inconsistente', 'Otro'] }] });
    if (!v) return;
    set({ status: 'rechazado', notes: v.notes }, `${staff.name} rechazó crédito de ${u.name}: ${v.notes}`, 'Crédito rechazado');
    notify(u.id, 'Resultado de tu solicitud de crédito', `No pudimos aprobar tu crédito: ${v.notes}.`, 'credito');
  });
  el.querySelector('[data-disburse]')?.addEventListener('click', () => {
    const vista = account(u.id, 'vista');
    postTx(vista, { amount: l.amount, desc: 'Desembolso crédito de consumo', category: 'Créditos', type: 'abono', channel: 'back-office', counterpart: 'Cóndor Pay' });
    set({ status: 'desembolsado', paid: 0 }, `${staff.name} desembolsó ${money(l.amount)} a ${u.name}`, 'Crédito desembolsado');
    notify(u.id, 'Abonamos tu crédito', `Depositamos ${money(l.amount)} en tu Cuenta Vista.`, 'abono');
  });
}
