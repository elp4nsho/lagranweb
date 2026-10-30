// Utilidades del panel admin: tabla CRUD con filtros/orden/paginación persistentes,
// encabezados de página, KPIs, badges de estado y helpers de formularios.
import { html, raw, escape, norm, debounce, downloadCSV, modal, toast } from '../../../assets/core/ui.js';

const tableState = new Map();

/**
 * Tabla de datos con búsqueda, filtros, orden, paginación, acciones por fila y CSV.
 * opts: { id, rows, columns:[{key,label,render?,sort?,value?,cls?}], search?:row=>string,
 *         filters?:[{key,label,options:[[v,l]],test?:(row,v)=>bool}], pageSize?, actions?:row=>html,
 *         onAction?:(act,row,btn)=>void, onRow?:row=>void, csv?:{name,map:row=>obj}, empty?, toolbar? }
 */
export function table(el, opts) {
  const { id = 'tbl', columns, search, filters = [], pageSize = 10, actions, onAction, onRow, csv, empty = 'Sin resultados', toolbar = '' } = opts;
  let rows = opts.rows;
  const st = tableState.get(id) || { q: '', f: {}, sort: opts.sort || null, dir: opts.dir || 1, page: 0 };
  tableState.set(id, st);

  el.innerHTML = `
    <div class="tbl-toolbar">
      ${search ? `<input class="input tbl-search" type="search" placeholder="Buscar…" value="${escape(st.q)}" aria-label="Buscar" data-q>` : ''}
      ${filters.map(f => `<select class="select tbl-filter" data-f="${f.key}" aria-label="${escape(f.label)}">
        <option value="">${escape(f.label)}: todos</option>
        ${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(st.f[f.key] ?? '') === String(v) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}
      </select>`).join('')}
      <span class="tbl-spacer"></span>
      ${toolbar}
      ${csv ? `<button class="btn btn-sm btn-ghost" data-csv title="Exportar CSV">⇩ CSV</button>` : ''}
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr>${columns.map(c => `<th ${c.sort !== false ? `data-k="${c.key}" class="sortable"` : ''} ${c.cls ? `class="${c.cls}"` : ''}>${escape(c.label)}<span class="sort-ind"></span></th>`).join('')}${actions ? '<th class="t-actions"><span class="sr-only">Acciones</span></th>' : ''}</tr></thead>
      <tbody></tbody></table></div>
    <div class="row between small muted tbl-pager" data-pager></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('[data-pager]');

  const val = (r, c) => (c.value ? c.value(r) : r[c.key]);
  function filtered() {
    let list = rows.filter(r => !st.q || norm(search(r)).includes(norm(st.q)));
    filters.forEach(f => {
      const v = st.f[f.key];
      if (v === undefined || v === '') return;
      list = list.filter(r => (f.test ? f.test(r, v) : String(r[f.key]) === String(v)));
    });
    if (st.sort) {
      const c = columns.find(x => x.key === st.sort) || { key: st.sort };
      list = list.slice().sort((a, b) => {
        const x = val(a, c), y = val(b, c);
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * st.dir;
        return String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true }) * st.dir;
      });
    }
    return list;
  }
  let slice = [];
  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    st.page = Math.min(st.page, pages - 1);
    slice = list.slice(st.page * pageSize, st.page * pageSize + pageSize);
    tbody.innerHTML = slice.length ? slice.map((r, i) => `<tr data-i="${i}" ${onRow ? 'class="clickable"' : ''}>${columns.map(c => `<td data-label="${escape(c.label)}" ${c.cls ? `class="${c.cls}"` : ''}>${c.render ? c.render(r) : escape(r[c.key])}</td>`).join('')}${actions ? `<td class="t-actions">${actions(r)}</td>` : ''}</tr>`).join('')
      : `<tr><td colspan="${columns.length + (actions ? 1 : 0)}"><div class="empty"><span class="icon">∅</span>${escape(empty)}</div></td></tr>`;
    el.querySelectorAll('th[data-k]').forEach(th => { th.querySelector('.sort-ind').textContent = th.dataset.k === st.sort ? (st.dir > 0 ? ' ▲' : ' ▼') : ''; });
    pager.innerHTML = `<span>${list.length} registro${list.length === 1 ? '' : 's'}</span>
      <span class="row" style="gap:6px"><button class="btn btn-sm btn-ghost" data-p="-1" ${st.page === 0 ? 'disabled' : ''} aria-label="Página anterior">←</button><span>${st.page + 1} / ${pages}</span><button class="btn btn-sm btn-ghost" data-p="1" ${st.page >= pages - 1 ? 'disabled' : ''} aria-label="Página siguiente">→</button></span>`;
  }
  el.querySelector('[data-q]')?.addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 0; render(); }, 150));
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { st.f[s.dataset.f] = s.value; st.page = 0; render(); }));
  el.querySelector('thead').addEventListener('click', e => {
    const k = e.target.closest('th')?.dataset.k; if (!k) return;
    st.dir = st.sort === k ? -st.dir : 1; st.sort = k; render();
  });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p) { st.page += +p.dataset.p; render(); } });
  el.querySelector('[data-csv]')?.addEventListener('click', () => {
    const list = filtered();
    if (!list.length) return toast('No hay filas para exportar', 'warning');
    downloadCSV(`${csv.name}-${new Date().toISOString().slice(0, 10)}.csv`, list.map(csv.map));
    toast(`Exportadas ${list.length} filas`, 'success');
  });
  tbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    const row = slice[+tr.dataset.i];
    const btn = e.target.closest('[data-act]');
    if (btn) { e.stopPropagation(); onAction && onAction(btn.dataset.act, row, btn); return; }
    if (!e.target.closest('a, button, input, select, label') && onRow) onRow(row);
  });
  render();
  return { update(newRows) { rows = newRows; render(); }, filtered };
}

export const pageHead = (title, sub = '', actions = '') => `
  <div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div>
  <div class="row" style="gap:8px">${actions}</div></div>`;

export const kpi = (label, value, delta = null, hint = '') => `
  <div class="card kpi"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${escape(value)}</span>
  ${delta != null ? `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')}% <span class="muted" style="font-weight:500">vs. mes anterior</span></span>` : ''}
  ${hint ? `<span class="small muted">${escape(hint)}</span>` : ''}</div></div>`;

// map: { estado: ['Etiqueta', 'success|warning|danger|info|primary|'] }
export const badge = (status, map) => { const [l, t] = map[status] || [status, '']; return `<span class="badge ${t ? 'badge-' + t : ''}">${escape(l)}</span>`; };

export const actBtn = (act, label, icon, extra = '') => `<button class="btn btn-sm btn-ghost btn-icon" data-act="${act}" title="${escape(label)}" aria-label="${escape(label)}" ${extra}>${icon}</button>`;

export const denied = (msg = 'No tienes permisos para ver esta sección.') => `
  <div class="card empty denied"><span class="icon">⛔</span><h2>Acceso restringido</h2><p>${escape(msg)}</p><a class="btn btn-primary" href="#/">Volver al escritorio</a></div>`;

// Lee un formulario a objeto (checkbox → boolean, number → Number).
export function readForm(form) {
  const out = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else if (el.type === 'number' || el.dataset.num !== undefined) out[el.name] = el.value === '' ? 0 : Number(el.value);
    else out[el.name] = el.value.trim();
  });
  return out;
}

// Valida campos [required] y marca .invalid. Devuelve true si está ok.
export function validate(form) {
  let ok = true;
  form.querySelectorAll('[required]').forEach(el => {
    const bad = el.type === 'checkbox' ? !el.checked : !String(el.value).trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
    el.classList.toggle('invalid', bad);
    if (bad) ok = false;
  });
  if (!ok) toast('Revisa los campos marcados', 'warning');
  return ok;
}

// Modal con formulario HTML libre. onSubmit(values, form) → true/undefined cierra; false mantiene abierto.
export function formDialog({ title, body, submit = 'Guardar', size = '', onSubmit, onOpen }) {
  const m = modal({ title, size, body: `<form class="stack" novalidate>${body}</form>`, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-submit>${escape(submit)}</button>` });
  const form = m.el.querySelector('form');
  const go = async e => {
    e && e.preventDefault();
    if (!validate(form)) return;
    const r = await onSubmit(readForm(form), form);
    if (r !== false) m.close();
  };
  form.addEventListener('submit', go);
  m.el.querySelector('[data-submit]').onclick = go;
  onOpen && onOpen(form, m);
  return m;
}

// Campos HTML rápidos para formDialog.
export const f = {
  text: (name, label, value = '', { required, type = 'text', help, placeholder, attrs = '' } = {}) =>
    `<div class="field"><label for="fd-${name}">${escape(label)}${required ? ' *' : ''}</label><input class="input" id="fd-${name}" name="${name}" type="${type}" value="${escape(value)}" ${required ? 'required' : ''} ${placeholder ? `placeholder="${escape(placeholder)}"` : ''} ${attrs}>${help ? `<small class="muted">${escape(help)}</small>` : ''}</div>`,
  area: (name, label, value = '', { required, rows = 4, help } = {}) =>
    `<div class="field"><label for="fd-${name}">${escape(label)}${required ? ' *' : ''}</label><textarea class="textarea" id="fd-${name}" name="${name}" rows="${rows}" ${required ? 'required' : ''}>${escape(value)}</textarea>${help ? `<small class="muted">${escape(help)}</small>` : ''}</div>`,
  select: (name, label, options, value = '', { required } = {}) =>
    `<div class="field"><label for="fd-${name}">${escape(label)}${required ? ' *' : ''}</label><select class="select" id="fd-${name}" name="${name}" ${required ? 'required' : ''}>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(v) === String(value) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select></div>`,
  check: (name, label, checked = false) => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}> ${escape(label)}</label>`,
  sw: (name, label, checked = false) => `<label class="row switch-row" style="gap:10px"><span class="switch"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span></span></span>${escape(label)}</label>`
};

export { html, raw };
