// Piezas reutilizables del CMS de Andes+ (encabezados, KPIs, series temporales, CSV, bitácora).
import { html, raw, escape, money, num, downloadCSV, toast, $ } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';

export function pageHead(title, sub = '', actions = '') {
  return `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${escape(sub)}</p>` : ''}</div><div class="row" style="gap:8px">${actions}</div></div>`;
}
export function kpi(label, value, delta = null, hint = '') {
  const d = delta == null ? '' : `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% ${escape(hint || 'vs. mes anterior')}</span>`;
  return `<div class="card"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${escape(value)}</span>${d}</div></div>`;
}
export function userChip(u) {
  if (!u) return '<span class="muted">—</span>';
  return html`<span class="user-chip"><span class="avatar" style="--av:${u.color || 'var(--primary)'}">${initials(u.name)}</span><span>${u.name}<br><small class="muted">${u.email}</small></span></span>`;
}
// Serie mensual de los últimos n meses: fn(row) → valor, dateKey para fecha.
export function monthly(rows, { months = 12, value = () => 1, dateKey = 'createdAt' } = {}) {
  const now = new Date(), out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), value: 0 });
  }
  const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
  rows.forEach(r => { const d = new Date(r[dateKey]); const i = idx[`${d.getFullYear()}-${d.getMonth()}`]; if (i != null) out[i].value += value(r); });
  return out;
}
export function daily(rows, { days = 30, value = () => 1, dateKey = 'createdAt' } = {}) {
  const out = [], start = new Date(); start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) { const d = new Date(start - i * 864e5); out.push({ t: +d, label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 }); }
  rows.forEach(r => { const t = Date.parse(r[dateKey]); const i = Math.floor((t - out[0].t) / 864e5); if (i >= 0 && i < days) out[i].value += value(r); });
  return out;
}
export const pctDelta = (a, b) => (b ? (a - b) / b * 100 : 0);
export function csvButton(id = 'csv') { return `<button class="btn btn-sm" id="${id}">⬇︎ Exportar CSV</button>`; }
export function wireCSV(el, name, rowsFn, id = 'csv') {
  el.querySelector('#' + id)?.addEventListener('click', () => { const rows = rowsFn(); if (!rows.length) return toast('No hay filas para exportar', 'warning'); downloadCSV(name, rows); toast(`Exportadas ${rows.length} filas`, 'success'); });
}
export function denied(msg = 'No tienes permisos para ver esta sección.') {
  return `<div class="card denied"><div style="font-size:48px">🔒</div><h2>Acceso restringido</h2><p class="muted">${escape(msg)}</p><a class="btn btn-primary" href="#/">Ir al dashboard</a></div>`;
}
export function activityList(rows, users) {
  if (!rows.length) return '<div class="empty">Sin actividad</div>';
  return `<ul class="act-list">${rows.map(l => { const u = users[l.user]; return `<li><span class="badge plain">${escape(l.action)}</span><span style="flex:1">${escape(l.detail)}${u ? ` <small class="muted">· ${escape(u.name)}</small>` : ''}</span><small class="muted" style="white-space:nowrap">${new Date(l.at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></li>`; }).join('')}</ul>`;
}
export function usersById() { return Object.fromEntries(db.all('users').map(u => [u.id, u])); }
export { money, num, raw, $ };
