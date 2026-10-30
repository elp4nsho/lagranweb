// Ayudas compartidas por la consola y el panel de administración.
import { escape, dataTable, downloadCSV, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { SEVERITY, STATUS_LABEL } from './sim.js';

export function pageHead(title, sub = '', actions = '', readonly = false) {
  return `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${escape(sub)}</p>` : ''}</div>
    <div class="row">${readonly ? '<span class="badge badge-warning readonly-flag">Solo lectura</span>' : ''}${actions}</div></div>`;
}
export const sevBadge = s => { const [l, k] = SEVERITY[s] || [s, 'primary']; return `<span class="badge badge-${k}">${l}</span>`; };
export const stBadge = s => { const [l, k] = STATUS_LABEL[s] || [s, 'primary']; return `<span class="badge badge-${k}">${l}</span>`; };
const ALARM_ST = { activa: ['Activa', 'danger'], reconocida: ['Reconocida', 'warning'], resuelta: ['Resuelta', 'success'] };
export const alarmBadge = s => { const [l, k] = ALARM_ST[s] || [s, 'primary']; return `<span class="badge badge-${k}">${l}</span>`; };
const WO_ST = { abierta: ['Abierta', 'danger'], 'en curso': ['En curso', 'warning'], completada: ['Completada', 'success'] };
export const woBadge = s => { const [l, k] = WO_ST[s] || [s, 'primary']; return `<span class="badge badge-${k}">${l}</span>`; };
export const prioBadge = p => `<span class="badge badge-${p === 'alta' ? 'danger' : p === 'media' ? 'warning' : 'info'}">${escape(p)}</span>`;
export const zoneName = id => db.get('zones', id)?.name || '—';
export const siteName = id => db.get('sites', id)?.name || '—';
export const devName = id => db.get('devices', id)?.name || '(eliminado)';

export function table(el, opts) {
  const columns = opts.columns.map(c => c.render ? { ...c, render: r => { const v = c.render(r); return v && v.__raw ? v.value : v; } } : c);
  return dataTable(el, { pageSize: 10, empty: 'Sin resultados', ...opts, columns });
}
export function csv(name, rows) {
  if (!rows.length) return toast('No hay datos para exportar', 'warning');
  downloadCSV(name, rows); toast(`Exportado ${rows.length} registro(s)`, 'success');
}
export function selectFilter(id, label, options, value = '', all = 'Todos') {
  return `<div class="field"><label for="${id}">${escape(label)}</label><select class="select" id="${id}"><option value="">${escape(all)}</option>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(v) === String(value) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select></div>`;
}
export function denied(el) {
  el.innerHTML = '<div class="card denied stack"><span style="font-size:48px">🔒</span><h2 style="margin:0">Acceso restringido</h2><p class="muted">Tu rol no tiene permisos para esta sección.</p><a class="btn btn-primary" href="#/">Volver</a></div>';
}
