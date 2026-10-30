// Ayudas comunes de las secciones del back-office.
import { escape, dataTable, downloadCSV, toast } from '../../../assets/core/ui.js';

export function pageHead(title, sub = '', actions = '', readonly = false) {
  return `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${escape(sub)}</p>` : ''}</div>
    <div class="row">${readonly ? '<span class="badge badge-warning readonly-flag">Solo lectura</span>' : ''}${actions}</div></div>`;
}

// Tabla con filtros externos: se repinta con rows filtradas sin perder la búsqueda interna.
export function table(el, opts) {
  // Las columnas pueden devolver raw(...) u objetos de h``: se convierten a string para dataTable.
  const columns = opts.columns.map(c => c.render ? { ...c, render: r => { const v = c.render(r); return v && v.__raw ? v.value : v; } } : c);
  return dataTable(el, { pageSize: 10, empty: 'Sin resultados', ...opts, columns });
}

export function csv(name, rows) {
  if (!rows.length) return toast('No hay datos para exportar', 'warning');
  downloadCSV(name, rows);
  toast(`Exportado ${rows.length} registro(s)`, 'success');
}

export function denied(el, what = 'esta sección') {
  el.innerHTML = `<div class="card denied stack"><span style="font-size:48px">🔒</span><h2 style="margin:0">Acceso restringido</h2><p class="muted">Tu rol no tiene permisos para ver ${escape(what)}.</p><a class="btn btn-primary" href="#/">Ir al resumen</a></div>`;
}

export function selectFilter(id, label, options, value = '') {
  return `<div class="field"><label for="${id}">${escape(label)}</label><select class="select" id="${id}"><option value="">Todos</option>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(v) === String(value) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select></div>`;
}
