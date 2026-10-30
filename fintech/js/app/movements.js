// Movimientos: búsqueda, filtros por cuenta/categoría/tipo/fecha, gráficos de gasto mensual por categoría.
import { db } from '../data/db.js';
import { money, norm, debounce, downloadCSV, donutChart, date } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { accountsOf, lastMonths, monthKey, CATEGORIES, CAT_ICON } from '../shared/bank.js';
import { stackedBars } from '../shared/charts.js';
import { pageHead, txItem, txDetail } from './common.js';

const state = { q: '', account: '', category: '', dir: 'todos', from: '', to: '', shown: 25, month: '' };
const ALL_CATS = [...Object.keys(CATEGORIES), 'Transferencias', 'Ingresos', 'Ahorro', 'Inversiones', 'Créditos'];

export function render(el, { user }) {
  const accs = accountsOf(user.id);
  const all = db.query('transactions', t => t.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
  const months = lastMonths(6);
  if (!state.month) state.month = months.at(-1).key;

  const spendCats = Object.keys(CATEGORIES);
  const groups = months.map(m => {
    const values = {};
    all.filter(t => t.amount < 0 && monthKey(t.date) === m.key && spendCats.includes(t.category) && t.status !== 'rechazada').forEach(t => values[t.category] = (values[t.category] || 0) - t.amount);
    return { label: m.label, key: m.key, values };
  });
  const sel = groups.find(g => g.key === state.month) || groups.at(-1);
  const donut = Object.entries(sel.values).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value: Math.round(value) }));
  const avg = groups.slice(0, -1).reduce((s, g) => s + Object.values(g.values).reduce((a, b) => a + b, 0), 0) / Math.max(1, groups.length - 1);
  const selTotal = donut.reduce((s, d) => s + d.value, 0);

  el.innerHTML = h`
  ${raw(pageHead('Movimientos', 'Tus cargos y abonos de los últimos 6 meses.', '<button class="btn btn-sm" data-csv>⬇ Exportar CSV</button>'))}
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Gasto mensual por categoría</h3>${raw(stackedBars(groups, spendCats, { format: money }))}</section>
    <section class="card">
      <div class="row between"><h3 style="margin:0">Distribución</h3>
        <select class="select" data-month style="width:auto">${months.map(m => h`<option value="${m.key}" ${m.key === state.month ? 'selected' : ''}>${m.label} ${m.key.slice(0, 4)}</option>`)}</select></div>
      <p class="small muted">Total ${money(selTotal)} · promedio meses anteriores ${money(avg)} ${selTotal > avg ? raw('<span class="badge badge-warning">sobre el promedio</span>') : raw('<span class="badge badge-success">bajo el promedio</span>')}</p>
      ${donut.length ? raw(donutChart(donut.map(d => ({ ...d, label: `${CAT_ICON[d.label] || ''} ${d.label}`, value: d.value })), { label: money(selTotal).replace('$', '$ ') })) : raw('<div class="empty">Sin gastos en este mes</div>')}
    </section>
  </div>
  <section class="card stack">
    <div class="filters">
      <div class="field grow"><label for="mq">Buscar</label><input class="input" id="mq" type="search" placeholder="Comercio, descripción…" value="${state.q}"></div>
      <div class="field"><label for="macc">Cuenta</label><select class="select" id="macc"><option value="">Todas</option>${accs.map(a => h`<option value="${a.id}" ${state.account === a.id ? 'selected' : ''}>${a.type === 'vista' ? 'Cuenta Vista' : a.type === 'ahorro' ? 'Ahorro' : 'Tarjeta crédito'}</option>`)}</select></div>
      <div class="field"><label for="mcat">Categoría</label><select class="select" id="mcat"><option value="">Todas</option>${ALL_CATS.map(c => h`<option ${state.category === c ? 'selected' : ''}>${c}</option>`)}</select></div>
      <div class="field"><label for="mfrom">Desde</label><input class="input" id="mfrom" type="date" value="${state.from}"></div>
      <div class="field"><label for="mto">Hasta</label><input class="input" id="mto" type="date" value="${state.to}"></div>
    </div>
    <div class="row between">
      <div class="chips" role="group" aria-label="Tipo">${[['todos', 'Todos'], ['gastos', 'Cargos'], ['ingresos', 'Abonos']].map(([k, l]) => h`<button class="chip ${state.dir === k ? 'active' : ''}" data-dir="${k}">${l}</button>`)}</div>
      <span class="small muted" data-summary></span>
    </div>
    <ul class="tx-list" data-list></ul>
    <div class="row" style="justify-content:center"><button class="btn btn-sm" data-more>Cargar más</button></div>
  </section>`;

  const filtered = () => all.filter(t =>
    (!state.q || norm(t.desc + ' ' + t.category + ' ' + (t.counterpart || '')).includes(norm(state.q))) &&
    (!state.account || t.accountId === state.account) && (!state.category || t.category === state.category) &&
    (state.dir === 'todos' || (state.dir === 'gastos' ? t.amount < 0 : t.amount > 0)) &&
    (!state.from || t.date.slice(0, 10) >= state.from) && (!state.to || t.date.slice(0, 10) <= state.to));

  const paint = () => {
    const list = filtered();
    const inn = list.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), out = list.filter(t => t.amount < 0).reduce((s, t) => s - t.amount, 0);
    el.querySelector('[data-summary]').textContent = `${list.length} movimientos · abonos ${money(inn)} · cargos ${money(out)}`;
    el.querySelector('[data-list]').innerHTML = list.length ? list.slice(0, state.shown).map(t => txItem(t)).join('') : '<li><div class="empty w-full">No hay movimientos con esos filtros.</div></li>';
    el.querySelector('[data-more]').hidden = list.length <= state.shown;
  };
  paint();

  const bind = (sel, key, ev = 'change') => el.querySelector(sel).addEventListener(ev, e => { state[key] = e.target.value; state.shown = 25; paint(); });
  el.querySelector('#mq').addEventListener('input', debounce(e => { state.q = e.target.value; state.shown = 25; paint(); }, 150));
  bind('#macc', 'account'); bind('#mcat', 'category'); bind('#mfrom', 'from'); bind('#mto', 'to');
  el.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { state.dir = b.dataset.dir; el.querySelectorAll('[data-dir]').forEach(x => x.classList.toggle('active', x === b)); paint(); });
  el.querySelector('[data-more]').onclick = () => { state.shown += 25; paint(); };
  el.querySelector('[data-month]').onchange = e => { state.month = e.target.value; render(el, { user }); };
  el.querySelector('[data-list]').addEventListener('click', e => {
    const li = e.target.closest('[data-tx]'); if (!li) return;
    const t = db.get('transactions', li.dataset.tx); txDetail(t, db.get('accounts', t.accountId));
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('movimientos-condor.csv', filtered().map(t => ({ fecha: date(t.date), descripcion: t.desc, categoria: t.category, tipo: t.type, monto: t.amount, estado: t.status })));
}
