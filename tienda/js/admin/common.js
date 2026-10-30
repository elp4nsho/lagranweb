// Utilidades compartidas por las secciones del panel: tabla con filtros, cabeceras, CSV.
import { html, raw, escape, norm, debounce, downloadCSV, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';

export const me = () => auth.current();
export const log = (action, detail) => db.log(action, detail, me()?.id);

export function pageHead(title, sub = '', actions = '') {
  return html`<div class="page-head"><div><h1>${title}</h1>${sub ? raw(html`<p class="muted" style="margin:4px 0 0">${sub}</p>`) : ''}</div><div class="row" style="gap:8px">${raw(actions)}</div></div>`;
}

// Estado de tablas en memoria (búsqueda, filtros, orden, página) para que sobreviva a los refrescos en vivo.
const tableState = {};

// smartTable(el, { key, rows, columns:[{key,label,render,sort,value,class}], filters:[{key,label,options:[[v,l]],test?(row,v)}],
//   search:(row)=>string, pageSize, onRow, empty, toolbar: htmlExtra, defaultSort:{key,dir} })
export function smartTable(el, opts) {
  const { key, columns, filters = [], search, pageSize = 12, onRow, empty = 'Sin resultados', toolbar = '' } = opts;
  let rows = opts.rows;
  const s = (tableState[key] ||= { q: '', f: {}, sort: opts.defaultSort?.key || null, dir: opts.defaultSort?.dir || 1, page: 0 });
  el.innerHTML = html`<div class="st-toolbar">
      ${search ? raw(html`<input class="input" type="search" placeholder="Buscar…" value="${s.q}" data-q aria-label="Buscar">`) : ''}
      ${filters.map(f => raw(html`<select class="select" data-f="${f.key}" aria-label="${f.label}"><option value="">${f.label}: todos</option>${f.options.map(([v, l]) => raw(html`<option value="${v}" ${String(s.f[f.key] ?? '') === String(v) ? 'selected' : ''}>${l}</option>`))}</select>`))}
      <span class="grow"></span>${raw(toolbar)}
    </div>
    <div class="table-wrap"><table class="table"><thead><tr>${columns.map(c => raw(html`<th class="${c.class || ''}" ${c.sort !== false ? raw(`data-k="${c.key}" style="cursor:pointer" aria-sort="${s.sort === c.key ? (s.dir > 0 ? 'ascending' : 'descending') : 'none'}"`) : ''}>${c.label}${s.sort === c.key ? (s.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`))}</tr></thead><tbody></tbody></table></div>
    <div class="row between small muted" style="margin-top:10px" data-pager></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('[data-pager]');
  const val = (r, k) => { const c = columns.find(x => x.key === k); return c && c.value ? c.value(r) : r[k]; };
  let slice = [];
  const filtered = () => rows.filter(r => (!s.q || norm(search(r)).includes(norm(s.q))) &&
    filters.every(f => { const v = s.f[f.key]; return v === undefined || v === '' || (f.test ? f.test(r, v) : String(r[f.key]) === String(v)); }));
  function render() {
    const list = filtered();
    if (s.sort) list.sort((a, b) => { const x = val(a, s.sort), y = val(b, s.sort); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true })) * s.dir; });
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    s.page = Math.min(s.page, pages - 1);
    slice = list.slice(s.page * pageSize, (s.page + 1) * pageSize);
    tbody.innerHTML = slice.length ? slice.map((r, i) => `<tr data-i="${i}" ${onRow ? 'style="cursor:pointer"' : ''}>${columns.map(c => `<td class="${c.class || ''}">${c.render ? c.render(r) : escape(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty">${escape(empty)}</div></td></tr>`;
    pager.innerHTML = `<span>${list.length} registro${list.length === 1 ? '' : 's'}</span><span class="row" style="gap:6px"><button class="btn btn-sm btn-ghost" data-p="-1" ${s.page === 0 ? 'disabled' : ''} aria-label="Anterior">←</button><span>${s.page + 1} / ${pages}</span><button class="btn btn-sm btn-ghost" data-p="1" ${s.page >= pages - 1 ? 'disabled' : ''} aria-label="Siguiente">→</button></span>`;
  }
  el.querySelector('[data-q]')?.addEventListener('input', debounce(e => { s.q = e.target.value; s.page = 0; render(); }, 150));
  el.querySelectorAll('[data-f]').forEach(sel => sel.addEventListener('change', () => { s.f[sel.dataset.f] = sel.value; s.page = 0; render(); }));
  el.querySelector('thead').addEventListener('click', e => {
    const th = e.target.closest('th[data-k]'); if (!th) return;
    s.dir = s.sort === th.dataset.k ? -s.dir : 1; s.sort = th.dataset.k;
    el.querySelectorAll('th[data-k]').forEach(h => { const c = columns.find(x => x.key === h.dataset.k); h.textContent = c.label + (s.sort === c.key ? (s.dir > 0 ? ' ↑' : ' ↓') : ''); });
    render();
  });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p) { s.page += +p.dataset.p; render(); } });
  tbody.addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if (tr && onRow && !e.target.closest('button, a, input, select, label')) onRow(slice[+tr.dataset.i]); });
  render();
  return { filtered, update(r) { rows = r; render(); } };
}

export function exportCSV(name, rows) {
  if (!rows.length) return toast('No hay filas para exportar', 'warning');
  downloadCSV(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  log('exportar', `Exportó ${rows.length} filas de ${name}`);
  toast(`CSV con ${rows.length} filas descargado`, 'success');
}

export const kpi = (label, value, delta = null, hint = '') => html`<div class="card stat"><span class="label">${label}</span><span class="value">${value}</span>${delta == null ? (hint ? raw(html`<span class="small muted">${hint}</span>`) : '') : raw(`<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')}% <span class="muted" style="font-weight:500">vs. 30 días previos</span></span>`)}</div>`;

export const deny = (el) => { el.innerHTML = '<div class="empty card"><span class="icon">🔒</span><h2>Sin permiso</h2><p>Tu rol no tiene acceso a esta sección.</p><a class="btn btn-primary" href="#/">Volver</a></div>'; };
