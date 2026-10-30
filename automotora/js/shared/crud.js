// Listado reutilizable: búsqueda, filtros, orden y paginación (ui.dataTable), acciones por fila y CSV.
import { dataTable, norm, debounce, downloadCSV, escape, toast } from '../../../assets/core/ui.js';
import { icon } from './icons.js';

export function listView(el, { columns, rows, search, filters = [], pageSize = 12, onRow, onAction, csv, empty = 'Sin resultados', toolbar = '', initialQ = '' }) {
  const state = { q: initialQ, f: {} };
  el.innerHTML = `
    <div class="list-toolbar">
      ${search ? `<label class="search-box">${icon('search', 16)}<input class="input" type="search" placeholder="Buscar…" data-q aria-label="Buscar" value="${escape(initialQ)}"></label>` : ''}
      ${filters.map(f => `<select class="select" data-f="${f.key}" aria-label="${escape(f.label)}"><option value="">${escape(f.label)}: todos</option>${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${f.value === v ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select>`).join('')}
      <span class="grow"></span>
      ${toolbar}
      ${csv ? `<button class="btn btn-sm" data-csv>${icon('download', 16)} CSV</button>` : ''}
    </div>
    <div data-dt></div>`;
  filters.forEach(f => { if (f.value) state.f[f.key] = f.value; });
  const compute = () => {
    let list = typeof rows === 'function' ? rows() : rows;
    if (state.q && search) list = list.filter(r => norm(search(r)).includes(norm(state.q)));
    for (const f of filters) { const v = state.f[f.key]; if (v) list = list.filter(r => f.test ? f.test(r, v) : String(r[f.key]) === v); }
    return list;
  };
  let skip = false;
  el.addEventListener('click', e => { skip = !!e.target.closest('label, .switch, [data-act], a, button, select'); }, true);
  const rowFn = onRow && (r => { if (!skip) onRow(r); });
  const dt = dataTable(el.querySelector('[data-dt]'), { rows: compute(), columns, pageSize, onRow: rowFn, empty });
  const refresh = () => dt.update(compute());
  el.querySelector('[data-q]')?.addEventListener('input', debounce(e => { state.q = e.target.value; refresh(); }, 150));
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { state.f[s.dataset.f] = s.value; refresh(); }));
  el.querySelector('[data-csv]')?.addEventListener('click', () => {
    const data = compute().map(csv.map);
    if (!data.length) return toast('No hay filas para exportar', 'warning');
    downloadCSV(csv.name, data); toast(`Exportadas ${data.length} filas`, 'success');
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (b && el.contains(b) && onAction) { e.stopPropagation(); onAction(b.dataset.act, b.dataset.id, b); }
  });
  el.addEventListener('change', e => {
    const s = e.target.closest('[data-act-change]');
    if (s && onAction) onAction(s.dataset.actChange, s.dataset.id, s);
  });
  return { refresh, rows: compute };
}
export const actBtn = (act, id, ico, label, cls = '') => `<button class="btn btn-sm btn-ghost btn-icon ${cls}" data-act="${act}" data-id="${id}" title="${escape(label)}" aria-label="${escape(label)}">${icon(ico, 16)}</button>`;
export const acts = (...b) => `<div class="acts-cell">${b.join('')}</div>`;
