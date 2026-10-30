// Envoltorio de ui.dataTable: permite que las columnas devuelvan raw(...) además de strings.
import { dataTable as coreTable } from '../../../assets/core/ui.js';
const unwrap = v => (v && v.__raw ? v.value : v ?? '');
export function dataTable(el, opts) {
  return coreTable(el, { ...opts, columns: opts.columns.map(c => (c.render ? { ...c, render: r => unwrap(c.render(r)) } : c)) });
}
