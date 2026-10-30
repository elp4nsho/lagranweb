// Tabla con búsqueda, filtros, orden, paginación y exportación CSV.
// Recuerda su estado (búsqueda, filtros, página) entre re-renderizados.
import { escape, debounce, downloadCSV } from '../../../assets/core/ui.js';
import { norm } from './util.js';

const STATE = {};

export function smartTable(el, o) {
  const st = STATE[o.key] ||= { q: '', sort: o.sort || null, dir: o.dir || 1, page: 0, f: {} };
  let rows = o.rows;
  const cols = o.columns;
  el.innerHTML = `
    <div class="tbl-tools">
      ${o.search ? `<input class="input tbl-q" type="search" placeholder="${escape(o.placeholder || 'Buscar…')}" value="${escape(st.q)}" aria-label="Buscar">` : ''}
      ${(o.filters || []).map(f => `<select class="select tbl-f" data-f="${f.key}" aria-label="${escape(f.label)}"><option value="">${escape(f.label)}: todos</option>${f.options.map(([v, l]) => `<option value="${escape(v)}" ${st.f[f.key] === String(v) ? 'selected' : ''}>${escape(l)}</option>`).join('')}</select>`).join('')}
      <span class="tbl-extra">${o.toolbar || ''}${o.csv ? '<button type="button" class="btn btn-sm btn-ghost" data-csv title="Exportar a CSV">⭳ CSV</button>' : ''}</span>
    </div>
    <div class="table-wrap"><table class="table${o.compact ? ' compact' : ''}"><thead><tr>${cols.map(c => `<th ${c.sort !== false ? `data-k="${c.key}" class="sortable" tabindex="0"` : ''} ${c.cls ? `class="${c.cls}"` : ''}>${escape(c.label)}<span class="sort-ind"></span></th>`).join('')}</tr></thead><tbody></tbody></table></div>
    <div class="tbl-pager"></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('.tbl-pager');
  const val = (r, c) => c.value ? c.value(r) : r[c.key];
  function list() {
    let out = rows.filter(r => (!st.q || norm(o.search(r)).includes(norm(st.q))) && (o.filters || []).every(f => !st.f[f.key] || f.test(r, st.f[f.key])));
    if (st.sort) {
      const c = cols.find(x => x.key === st.sort);
      if (c) out = out.slice().sort((a, b) => { const x = val(a, c), y = val(b, c); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true })) * st.dir; });
    }
    return out;
  }
  function render() {
    const all = list(), size = o.pageSize || 10, pages = Math.max(1, Math.ceil(all.length / size));
    st.page = Math.min(st.page, pages - 1);
    const slice = all.slice(st.page * size, st.page * size + size);
    tbody.innerHTML = slice.length ? slice.map((r, i) => `<tr data-i="${i}" ${o.onRow ? 'class="clickable"' : ''}>${cols.map(c => `<td ${c.cls ? `class="${c.cls}"` : ''} data-label="${escape(c.label)}">${c.render ? c.render(r) : escape(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}"><div class="empty"><span class="icon">🔍</span>${escape(o.empty || 'Sin resultados')}</div></td></tr>`;
    tbody.querySelectorAll('tr[data-i]').forEach(tr => o.onRow && tr.addEventListener('click', e => { if (!e.target.closest('button, a, input, select, label')) o.onRow(slice[+tr.dataset.i]); }));
    el.querySelectorAll('th[data-k]').forEach(th => { const on = th.dataset.k === st.sort; th.setAttribute('aria-sort', on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'); th.querySelector('.sort-ind').textContent = on ? (st.dir > 0 ? ' ▲' : ' ▼') : ''; });
    const from = all.length ? st.page * size + 1 : 0, to = Math.min(all.length, (st.page + 1) * size);
    const nums = []; for (let p = Math.max(0, st.page - 2); p <= Math.min(pages - 1, st.page + 2); p++) nums.push(p);
    pager.innerHTML = `<span class="muted small">${from}–${to} de ${all.length}</span><span class="row" style="gap:4px"><button type="button" class="btn btn-sm btn-ghost" data-p="${st.page - 1}" ${st.page === 0 ? 'disabled' : ''} aria-label="Anterior">←</button>${nums.map(p => `<button type="button" class="btn btn-sm ${p === st.page ? 'btn-primary' : 'btn-ghost'}" data-p="${p}">${p + 1}</button>`).join('')}<button type="button" class="btn btn-sm btn-ghost" data-p="${st.page + 1}" ${st.page >= pages - 1 ? 'disabled' : ''} aria-label="Siguiente">→</button></span>`;
    o.onRender && o.onRender(all);
  }
  el.querySelector('.tbl-q')?.addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 0; render(); }, 150));
  el.querySelectorAll('.tbl-f').forEach(s => s.addEventListener('change', () => { st.f[s.dataset.f] = s.value; st.page = 0; render(); }));
  const sortBy = k => { st.dir = st.sort === k ? -st.dir : 1; st.sort = k; render(); };
  el.querySelector('thead').addEventListener('click', e => { const k = e.target.closest('th')?.dataset.k; if (k) sortBy(k); });
  el.querySelector('thead').addEventListener('keydown', e => { const k = e.target.closest('th')?.dataset.k; if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sortBy(k); } });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p && !p.disabled) { st.page = +p.dataset.p; render(); } });
  el.querySelector('[data-csv]')?.addEventListener('click', () => { const l = list(); if (!l.length) return; downloadCSV(o.csv.filename, l.map(o.csv.map)); });
  render();
  return { update(r) { rows = r; render(); }, list };
}
