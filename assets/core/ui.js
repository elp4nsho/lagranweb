// Utilidades de interfaz compartidas: formato, toasts, modales, tablas y gráficos SVG.
// Todo se pinta con las clases/tokens de themes.css, así respeta el estilo activo.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Plantillas con escape automático: html`<b>${nombre}</b>`. Usa raw(x) para no escapar.
// Recordamos lo que produjo html`` para no volver a escaparlo al anidarlo (directo o en arrays).
const produced = new Set();
export function html(strings, ...vals) {
  const out = strings.reduce((acc, s, i) => acc + s + (i < vals.length ? fmtVal(vals[i]) : ''), '');
  produced.add(out);
  if (produced.size > 5000) produced.delete(produced.values().next().value);
  return out;
}
function fmtVal(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(fmtVal).join('');
  if (v && v.__raw) return v.value;
  if (typeof v === 'string' && produced.has(v)) return v;
  return escape(v);
}
export const raw = value => ({ __raw: true, value: String(value ?? '') });

// ---------- Formato ----------
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
export const money = n => clp.format(Math.round(n || 0));
export const num = n => new Intl.NumberFormat('es-CL').format(n || 0);
export const pct = (n, d = 0) => `${(n || 0).toFixed(d)}%`;
export const date = (d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) => new Date(d).toLocaleDateString('es-CL', opts);
export const time = d => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
export const dateTime = d => `${date(d)} · ${time(d)}`;
export function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'hace un momento';
  const units = [[60, 'minuto'], [24, 'hora'], [30, 'día'], [12, 'mes'], [Infinity, 'año']];
  let v = s / 60;
  for (const [n, u] of units) {
    if (v < n) { const k = Math.floor(v); return `hace ${k} ${u}${k === 1 ? '' : u === 'mes' ? 'es' : 's'}`; }
    v /= n;
  }
}
export const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Toasts ----------
let toastBox;
export function toast(msg, type = 'info', ms = 3200) {
  if (!toastBox) {
    toastBox = document.createElement('div');
    toastBox.className = 'toasts';
    toastBox.setAttribute('role', 'status');
    toastBox.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastBox);
  }
  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<b aria-hidden="true">${icons[type] || '•'}</b><span>${escape(msg)}</span>`;
  toastBox.appendChild(t);
  while (toastBox.children.length > 4) toastBox.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms);
}

// ---------- Modal ----------
// const m = modal({ title, body: htmlString|Node, foot: htmlString, size: 'lg', onClose });
// m.el (nodo .modal), m.close()
export function modal({ title = '', body = '', foot = '', size = '', onClose } = {}) {
  const prev = document.activeElement;
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${escape(title)}">
    <div class="modal-head"><h3>${escape(title)}</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Cerrar">✕</button></div>
    <div class="modal-body"></div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const bodyEl = bd.querySelector('.modal-body');
  typeof body === 'string' ? (bodyEl.innerHTML = body) : bodyEl.appendChild(body);
  document.body.appendChild(bd);
  document.body.style.overflow = 'hidden';
  const close = () => {
    bd.remove();
    if (!document.querySelector('.modal-backdrop')) document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    prev && prev.focus && prev.focus();
    onClose && onClose();
  };
  // Escape cierra solo el modal de más arriba (si hay varios apilados).
  const onKey = e => { if (e.key === 'Escape' && [...document.querySelectorAll('.modal-backdrop')].pop() === bd) close(); };
  document.addEventListener('keydown', onKey);
  bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) close(); });
  // Foco inicial dentro del diálogo (accesibilidad) pero sin desplazar: un modal alto debe abrirse
  // arriba, no saltar al botón del pie. preventScroll + scrollTop = 0 por si el navegador ya se movió.
  setTimeout(() => {
    const target = bd.querySelector('[autofocus], input:not([type=hidden]), select, textarea, .modal-foot .btn-primary') || bd.querySelector('[data-close]');
    try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    [bd, bd.querySelector('.modal'), bodyEl].forEach(n => { if (n) n.scrollTop = 0; });
  }, 30);
  return { el: bd.querySelector('.modal'), close };
}

export function confirm(message, { title = 'Confirmar', ok = 'Aceptar', danger = false } = {}) {
  return new Promise(resolve => {
    let done = false;
    const m = modal({
      title, body: `<p>${escape(message)}</p>`,
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${escape(ok)}</button>`,
      onClose: () => !done && resolve(false)
    });
    m.el.querySelector('[data-ok]').onclick = () => { done = true; m.close(); resolve(true); };
  });
}

// Formulario en modal a partir de una lista de campos. Devuelve los valores o null.
// fields: [{ name, label, type: 'text'|'number'|'textarea'|'select'|'checkbox'|'date'|'email', options, required, value }]
export function formModal({ title, fields, submit = 'Guardar', size = '' }) {
  return new Promise(resolve => {
    let done = false;
    const f = document.createElement('form');
    f.className = 'stack';
    f.noValidate = true;
    f.innerHTML = fields.map(fd => {
      const id = 'f-' + fd.name, v = fd.value ?? '';
      const req = fd.required ? 'required' : '';
      let input;
      if (fd.type === 'textarea') input = `<textarea class="textarea" id="${id}" name="${fd.name}" ${req}>${escape(v)}</textarea>`;
      else if (fd.type === 'select') input = `<select class="select" id="${id}" name="${fd.name}" ${req}>${fd.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(val)}" ${String(val) === String(v) ? 'selected' : ''}>${escape(lab)}</option>`; }).join('')}</select>`;
      else if (fd.type === 'checkbox') return `<label class="check"><input type="checkbox" name="${fd.name}" ${v ? 'checked' : ''}> ${escape(fd.label)}</label>`;
      else input = `<input class="input" id="${id}" name="${fd.name}" type="${fd.type || 'text'}" value="${escape(v)}" ${req} ${fd.step ? `step="${fd.step}"` : ''} ${fd.placeholder ? `placeholder="${escape(fd.placeholder)}"` : ''}>`;
      return `<div class="field"><label for="${id}">${escape(fd.label)}${fd.required ? ' *' : ''}</label>${input}${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
    }).join('');
    const m = modal({ title, body: f, size, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-submit>${escape(submit)}</button>`, onClose: () => !done && resolve(null) });
    const go = e => {
      e && e.preventDefault();
      let ok = true;
      const out = {};
      fields.forEach(fd => {
        const el = f.elements[fd.name];
        if (fd.type === 'checkbox') { out[fd.name] = el.checked; return; }
        let val = el.value.trim();
        const bad = fd.required && !val;
        el.classList.toggle('invalid', bad);
        if (bad) ok = false;
        out[fd.name] = fd.type === 'number' ? Number(val) : val;
      });
      if (!ok) { toast('Completa los campos obligatorios', 'warning'); return; }
      done = true; m.close(); resolve(out);
    };
    f.addEventListener('submit', go);
    m.el.querySelector('[data-submit]').onclick = go;
  });
}

const cell = v => (v && v.__raw ? v.value : v ?? '');

// ---------- Tabla de datos con búsqueda, orden y paginación ----------
// dataTable(el, { rows, columns: [{ key, label, render?(row), sort?: true }], pageSize, search: (row)=>string, onRow?(row) })
export function dataTable(el, { rows, columns, pageSize = 10, search, onRow, empty = 'Sin resultados' }) {
  let q = '', sortKey = null, dir = 1, page = 0;
  el.innerHTML = `${search ? `<div class="row" style="margin-bottom:12px"><input class="input" type="search" placeholder="Buscar…" style="max-width:320px" data-q></div>` : ''}
    <div class="table-wrap"><table class="table"><thead><tr>${columns.map(c => `<th ${c.sort !== false ? `data-k="${c.key}" style="cursor:pointer"` : ''}>${escape(c.label)}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
    <div class="row between small muted" style="margin-top:10px" data-pager></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('[data-pager]');
  const render = () => {
    let list = rows.filter(r => !q || norm(search(r)).includes(norm(q)));
    if (sortKey) list.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * dir);
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    page = Math.min(page, pages - 1);
    const slice = list.slice(page * pageSize, page * pageSize + pageSize);
    tbody.innerHTML = slice.length ? slice.map((r, i) => `<tr data-i="${i}" ${onRow ? 'style="cursor:pointer"' : ''}>${columns.map(c => `<td>${c.render ? cell(c.render(r)) : escape(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty">${escape(empty)}</div></td></tr>`;
    tbody.querySelectorAll('tr[data-i]').forEach(tr => onRow && tr.addEventListener('click', e => { if (!e.target.closest('button, a, input, select, label, textarea')) onRow(slice[+tr.dataset.i]); }));
    pager.innerHTML = `<span>${list.length} registro${list.length === 1 ? '' : 's'}</span><span class="row" style="gap:6px"><button class="btn btn-sm btn-ghost" data-p="-1" ${page === 0 ? 'disabled' : ''}>←</button><span>${page + 1} / ${pages}</span><button class="btn btn-sm btn-ghost" data-p="1" ${page >= pages - 1 ? 'disabled' : ''}>→</button></span>`;
  };
  el.querySelector('[data-q]')?.addEventListener('input', debounce(e => { q = e.target.value; page = 0; render(); }, 150));
  el.querySelector('thead').addEventListener('click', e => { const k = e.target.closest('th')?.dataset.k; if (!k) return; dir = sortKey === k ? -dir : 1; sortKey = k; render(); });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p) { page += +p.dataset.p; render(); } });
  render();
  return { update(newRows) { rows = newRows; render(); } };
}

// ---------- Gráficos SVG ----------
export function barChart(data, { height = 200, format = v => v } = {}) {
  const w = 600, pad = 28, max = Math.max(1, ...data.map(d => d.value));
  const bw = (w - pad) / data.length;
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img">
    <line class="axis" x1="${pad}" y1="${height}" x2="${w}" y2="${height}"/>
    ${data.map((d, i) => { const h = (d.value / max) * (height - 16); const x = pad + i * bw + bw * .18; return `<g><title>${escape(d.label)}: ${escape(format(d.value))}</title><rect class="bar" x="${x}" y="${height - h}" width="${bw * .64}" height="${h}" rx="3" ${d.color ? `style="fill:${d.color}"` : ''}/><text x="${x + bw * .32}" y="${height + 16}" text-anchor="middle">${escape(d.label)}</text></g>`; }).join('')}
  </svg>`;
}
export function lineChart(data, { height = 200, format = v => v } = {}) {
  const w = 600, pad = 28, max = Math.max(1, ...data.map(d => d.value));
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [pad + i * step, height - (d.value / max) * (height - 20)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img">
    <line class="axis" x1="${pad}" y1="${height}" x2="${w - pad}" y2="${height}"/>
    <path class="area" d="${path} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z"/>
    <path class="line" d="${path}"/>
    ${pts.map((p, i) => `<g><title>${escape(data[i].label)}: ${escape(format(data[i].value))}</title><circle class="dot" cx="${p[0]}" cy="${p[1]}" r="4"/>${data.length <= 14 || i % 2 === 0 ? `<text x="${p[0]}" y="${height + 16}" text-anchor="middle">${escape(data[i].label)}</text>` : ''}</g>`).join('')}
  </svg>`;
}
export function donutChart(data, { size = 180, label = '', format = v => v } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 70, c = 2 * Math.PI * r;
  const palette = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)', 'var(--muted)'];
  let off = 0;
  const arcs = data.map((d, i) => { const len = (d.value / total) * c; const s = `<circle r="${r}" cx="90" cy="90" fill="none" stroke="${d.color || palette[i % palette.length]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${escape(d.label)}: ${escape(format(d.value))}</title></circle>`; off += len; return s; }).join('');
  return `<div class="row" style="gap:20px"><svg class="chart" viewBox="0 0 180 180" style="width:min(${size}px,100%);flex:none">${arcs}<text x="90" y="96" text-anchor="middle" style="font-size:20px;font-weight:700;fill:var(--text)">${escape(label)}</text></svg>
    <ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px;font-size:13px">${data.map((d, i) => `<li class="row" style="gap:8px;flex-wrap:nowrap"><i style="width:10px;height:10px;border-radius:2px;background:${d.color || palette[i % palette.length]}"></i>${escape(d.label)} <b>${escape(format(d.value))}</b></li>`).join('')}</ul></div>`;
}

// Exportar filas a CSV (descarga).
export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(';'), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Shell del panel: abre/cierra el menú lateral en móvil.
export function wireAdminShell(shell = document.querySelector('.admin-shell')) {
  if (!shell) return;
  shell.addEventListener('click', e => {
    if (e.target.closest('.admin-burger')) shell.classList.toggle('nav-open');
    else if (e.target.closest('.admin-sidebar a') || !e.target.closest('.admin-sidebar')) shell.classList.remove('nav-open');
  });
}
