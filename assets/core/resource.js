// CRUD guiado por esquema. A partir de una lista de campos produce: columnas de tabla, búsqueda,
// filtros, formulario de alta/edición en modal (con validación), vista de detalle, exportación CSV,
// eliminación con confirmación, cambios de estado (domain.stateMachine) y entradas en la bitácora.
// Cada pieza se puede reemplazar con hooks; los tipos de campo son un registro extensible.
//
//   import { resource } from '../../assets/core/resource.js';
//   export const clientes = resource(app, {
//     collection: 'customers', singular: 'cliente', plural: 'Clientes', icon: '👥',
//     fields: [
//       { name: 'name', label: 'Nombre', required: true, search: true },
//       { name: 'email', label: 'Correo', type: 'email', search: true },
//       { name: 'plan', label: 'Plan', type: 'select', options: ['Básico', 'Pro'], filter: true },
//       { name: 'active', label: 'Activo', type: 'bool', toggle: true }
//     ],
//     detail: true
//   });
//   // en el panel: nav: [clientes.section({ roles: ['admin'] })]
//
// Hooks: rows(ctx), defaults(ctx), validate(values, row, ctx), beforeSave(values, row, ctx),
// afterSave(row, { isNew, before }, ctx), canDelete(row, ctx), afterDelete(row, ctx),
// columns(defaultColumns), rowActions: [{ id, label, icon, when(row, ctx), run(row, ctx) }],
// pageActions: [{ label, icon, primary, run(ctx) }], detail: { render(row, ctx), aside(row, ctx) },
// permissions: { create: [roles], edit: [roles], delete: [roles] }, readonly, csv(row) | false.

import { html, raw, escape, money, num, date as fmtDate, dateTime, toast, confirm, modal, dataTable, downloadCSV, norm, debounce } from './ui.js';
import { pageHead, kv, card, emptyState, historyTimeline, actButton, badge } from './blocks.js';
import { rut } from './domain.js';

// ---------- Registro de tipos de campo ----------
// Cada tipo define: input(fd, value, id) → HTML del control · read(el, fd) → valor
// cell(value, row, fd, res) → HTML de la celda · text(value, row, fd, res) → texto plano (búsqueda/CSV)
// check(value, fd) → mensaje de error o '' · align: 'num' para alinear a la derecha.
const opt = o => (Array.isArray(o) ? o : [o, o]);
const optionsOf = (fd, res) => (typeof fd.options === 'function' ? fd.options(res) : fd.options || []).map(opt);
const attrs = fd => [fd.required ? 'required' : '', fd.placeholder ? `placeholder="${escape(fd.placeholder)}"` : '', fd.min != null ? `min="${fd.min}"` : '', fd.max != null ? `max="${fd.max}"` : '', fd.step ? `step="${fd.step}"` : '', fd.readonly ? 'readonly' : ''].join(' ');
const inputOf = type => (fd, v, id) => `<input class="input" id="${id}" name="${fd.name}" type="${type}" value="${escape(v ?? '')}" ${attrs(fd)}>`;
const readText = (el) => el.value.trim();

const base = {
  input: inputOf('text'), read: readText,
  cell: null, // sin cell propio: se usa escape(text(...)) del mismo tipo
  text: v => (v == null ? '' : String(v)),
  check: () => ''
};
export const fieldTypes = {
  text: base,
  email: { ...base, input: inputOf('email'), check: v => (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Correo no válido' : '') },
  tel: { ...base, input: inputOf('tel') },
  url: { ...base, input: inputOf('url') },
  password: { ...base, input: inputOf('text') },
  color: { ...base, input: inputOf('color'), cell: v => `<span class="row" style="gap:6px;flex-wrap:nowrap"><i style="width:14px;height:14px;border-radius:4px;background:${escape(v)};border:1px solid var(--line)"></i>${escape(v)}</span>` },
  number: { ...base, input: inputOf('number'), read: el => (el.value === '' ? null : Number(el.value)), text: v => (v == null ? '' : num(v)), align: 'num',
    check: (v, fd) => (v == null ? '' : fd.min != null && v < fd.min ? `Mínimo ${fd.min}` : fd.max != null && v > fd.max ? `Máximo ${fd.max}` : '') },
  money: { ...base, input: (fd, v, id) => inputOf('number')({ step: 1, min: 0, ...fd }, v, id), read: el => (el.value === '' ? null : Math.round(Number(el.value))), text: v => (v == null ? '' : money(v)), align: 'num' },
  textarea: { ...base, wide: true, table: false, input: (fd, v, id) => `<textarea class="textarea" id="${id}" name="${fd.name}" ${attrs(fd)}>${escape(v ?? '')}</textarea>` },
  select: { ...base,
    input: (fd, v, id, res) => `<select class="select" id="${id}" name="${fd.name}" ${fd.required ? 'required' : ''}>${fd.required ? '' : '<option value="">—</option>'}${optionsOf(fd, res).map(([val, lab]) => `<option value="${escape(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${escape(lab)}</option>`).join('')}</select>`,
    text: (v, row, fd, res) => { if (v == null || v === '') return ''; const o = optionsOf(fd, res).find(([val]) => String(val) === String(v)); return o ? o[1] : String(v); } },
  date: { ...base, input: (fd, v, id) => inputOf('date')(fd, v ? String(v).slice(0, 10) : '', id), text: v => (v ? fmtDate(String(v).length === 10 ? v + 'T12:00' : v) : '') },
  datetime: { ...base, input: (fd, v, id) => inputOf('datetime-local')(fd, v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '', id),
    read: el => (el.value ? new Date(el.value).toISOString() : ''), text: v => (v ? dateTime(v) : '') },
  bool: { ...base, checkbox: true,
    input: (fd, v, id) => `<label class="check"><input type="checkbox" id="${id}" name="${fd.name}" ${v ? 'checked' : ''}> ${escape(fd.label)}</label>`,
    read: el => el.checked, text: v => (v ? 'Sí' : 'No'),
    cell: (v, row, fd, res) => (fd.toggle && res.can('edit')
      ? `<label class="switch" title="${escape(fd.label)}"><input type="checkbox" data-toggle="${fd.name}" data-id="${row.id}" ${v ? 'checked' : ''} aria-label="${escape(fd.label)}"><span></span></label>`
      : (v ? badge('Sí', 'success') : badge('No'))) },
  tags: { ...base, input: (fd, v, id) => inputOf('text')({ placeholder: 'Separadas por coma', ...fd }, (v || []).join(', '), id),
    read: el => el.value.split(',').map(s => s.trim()).filter(Boolean), text: v => (v || []).join(', '),
    cell: v => (v || []).map(t => `<span class="chip" style="padding:2px 8px;font-size:12px">${escape(t)}</span>`).join(' ') },
  rut: { ...base, read: el => (el.value.trim() ? rut.format(el.value) : ''), check: v => (v && !rut.valid(v) ? 'RUT no válido' : '') },
  // Referencia a otra colección: { type: 'ref', ref: 'customers', refLabel: c => c.name }
  ref: { ...base,
    input: (fd, v, id, res) => fieldTypes.select.input({ ...fd, options: () => refOptions(fd, res) }, v, id, res),
    text: (v, row, fd, res) => { const r = v && res.db.get(fd.ref, v); return r ? refLabel(fd)(r) : ''; },
    cell: (v, row, fd, res) => { const r = v && res.db.get(fd.ref, v); return r ? escape(refLabel(fd)(r)) : '<span class="muted">—</span>'; } },
  // Estado gobernado por una máquina (domain.stateMachine): { type: 'status', machine: ORDER }
  status: { ...base, form: false, filter: true,
    input: (fd, v, id, res) => fieldTypes.select.input({ ...fd, required: true, options: fd.machine.options() }, v ?? fd.machine.initial, id, res),
    text: (v, row, fd) => fd.machine.label(v), cell: (v, row, fd) => fd.machine.badge(v) }
};
// Archivo (foto, PDF): { type: 'file', accept: 'image/*', maxKB: 400 }. Al guardar, resource lo sube con
// db.files (local: data: URL en este navegador; supabase: Storage) y guarda { path, name, size, type }.
fieldTypes.file = { ...base, table: false, filter: false,
  input: (fd, v, id, res) => `${v?.path ? `<small class="muted d-block">Actual: ${fileLink(v, res)}</small>` : ''}<input class="input" id="${id}" name="${fd.name}" type="file" ${fd.accept ? `accept="${escape(fd.accept)}"` : ''}>`,
  read: el => (el.files && el.files[0]) || undefined,
  text: v => v?.name || '',
  cell: (v, row, fd, res) => (v?.path ? fileLink(v, res) : '<span class="muted">—</span>'),
  check: (v, fd) => (v instanceof Blob && fd.maxKB && v.size > fd.maxKB * 1024 ? `máximo ${fd.maxKB} KB` : '') };
function fileLink(v, res) {
  const url = res?.db?.files?.url ? res.db.files.url(v.path) : '';
  if (!url) return escape(v.name || v.path);
  return /^image\//.test(v.type || '') ? `<a href="${escape(url)}" target="_blank" rel="noopener"><img src="${escape(url)}" alt="${escape(v.name || '')}" style="max-width:160px;max-height:110px;border-radius:var(--radius-sm);display:block"></a>` : `<a href="${escape(url)}" target="_blank" rel="noopener">📎 ${escape(v.name || 'archivo')}</a>`;
}
const refLabel = fd => fd.refLabel || (r => r.name || r.title || r.code || r.id);
const refOptions = (fd, res) => res.db.query(fd.ref, fd.refFilter || (() => true)).map(r => [r.id, refLabel(fd)(r)]).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
// Registrar o extender un tipo: fieldType('patente', { ...fieldTypes.text, read: el => el.value.toUpperCase() })
export function fieldType(name, def) { fieldTypes[name] = { ...base, ...def }; return fieldTypes[name]; }
const typeOf = fd => fieldTypes[fd.type || 'text'] || base;

// ---------- Formularios a partir de campos (también los usa pages.settingsSection) ----------
let formSeq = 0;
export function renderFields(fields, values = {}, res = null) {
  const pre = 'k' + (++formSeq) + '-';
  return fields.map(fd => {
    const t = typeOf(fd), id = pre + fd.name, v = values[fd.name] ?? (typeof fd.default === 'function' ? fd.default() : fd.default);
    const wide = fd.wide ?? t.wide ? ' k-wide' : '';
    if (t.checkbox) return `<div class="field${wide}">${t.input(fd, v, id, res)}${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
    return `<div class="field${wide}"><label for="${id}">${escape(fd.label)}${fd.required ? ' *' : ''}</label>${t.input(fd, v, id, res)}${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
  }).join('');
}
// Lee y valida. Devuelve { values, errors: [{ name, msg }] } y marca .invalid en los controles.
export function readFields(form, fields) {
  const values = {}, errors = [];
  fields.forEach(fd => {
    const el = form.elements[fd.name];
    if (!el) return;
    const t = typeOf(fd), v = t.read(el, fd);
    values[fd.name] = v;
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    let msg = '';
    if (empty) { if (fd.required && !t.checkbox) msg = 'obligatorio'; }
    else msg = t.check(v, fd) || (fd.check ? fd.check(v, values) || '' : '');
    if (msg) msg = `${fd.label}: ${msg}`;
    el.classList?.toggle('invalid', !!msg);
    if (msg) errors.push({ name: fd.name, msg });
  });
  return { values, errors };
}
// Modal con formulario a partir de campos. Devuelve los valores o null (cancelado).
// onSubmit(values) puede devolver un texto de error (se muestra) o false (silencioso) para mantener el modal abierto.
export function fieldsModal({ title, fields, values = {}, submit = 'Guardar', size = 'lg', res = null, onSubmit, intro = '' }) {
  return new Promise(resolve => {
    let done = false;
    const f = document.createElement('form');
    f.noValidate = true;
    f.innerHTML = `${intro ? `<p class="muted" style="margin:0 0 14px">${intro}</p>` : ''}<div class="k-form">${renderFields(fields, values, res)}</div><button type="submit" hidden></button>`;
    const m = modal({ title, body: f, size, foot: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-submit>${escape(submit)}</button>`, onClose: () => !done && resolve(null) });
    const go = async e => {
      e && e.preventDefault();
      const { values: out, errors } = readFields(f, fields);
      if (errors.length) { toast(errors[0].msg, 'warning'); f.elements[errors[0].name]?.focus?.(); return; }
      if (onSubmit) { const r = await onSubmit(out); if (r === false) return; if (typeof r === 'string' && r) { toast(r, 'warning'); return; } }
      done = true; m.close(); resolve(out);
    };
    f.addEventListener('submit', go);
    m.el.querySelector('[data-submit]').onclick = go;
  });
}

// ---------- Recurso ----------
export function resource(app, cfg) {
  const { db, auth } = app;
  const col = cfg.collection;
  const id = cfg.id || col;
  const singular = cfg.singular || 'registro', plural = cfg.plural || 'Registros';
  // feminine: true → "Nueva orden", "Orden creada", "Orden no encontrada"
  const o = cfg.feminine ? 'a' : 'o';
  const newLabel = cfg.newLabel || `Nuev${o} ${singular}`;
  const logAction = cfg.log === undefined ? singular : cfg.log;
  const title = cfg.title || (r => r.name || r.title || r.code || r.id);
  const fields = (cfg.fields || []).map(fd => ({ label: fd.name, ...fd }));
  const statusField = fields.find(fd => fd.type === 'status');
  const machine = cfg.machine || statusField?.machine || null;
  const visible = (fd, where) => { const t = typeOf(fd); return fd[where] ?? t[where] ?? true; };
  const formFields = (row) => fields.filter(fd => visible(fd, 'form') && !(row && fd.createOnly));
  const searchFields = fields.filter(fd => fd.search);
  const me = ctx => ctx?.user || auth?.current();

  const res = {
    id, collection: col, singular, plural, fields, machine, db, auth, app, cfg,
    title,
    // ¿El usuario actual puede crear/editar/eliminar?
    can(action, ctx) {
      if (cfg.readonly && action !== 'view') return false;
      if (cfg.permissions?.[action] === false) return false;
      const roles = cfg.permissions?.[action];
      return !roles || roles.includes(me(ctx)?.role);
    },
    rows: ctx => (cfg.rows ? cfg.rows(ctx || {}) : db.all(col)),
    text: (row, fd) => typeOf(fd).text(row[fd.name], row, fd, res),
    cell(row, fd) {
      if (fd.render) return fd.render(row[fd.name], row);
      const t = typeOf(fd);
      return t.cell ? t.cell(row[fd.name], row, fd, res) : escape(t.text(row[fd.name], row, fd, res));
    },

    // Columnas por defecto: los campos con table !== false (máx. 6), título en la primera, acciones al final.
    columns(ctx) {
      const shown = fields.filter(fd => visible(fd, 'table')).slice(0, cfg.maxColumns || 6);
      let cols = shown.map((fd, i) => ({
        key: fd.name, label: fd.label, sort: fd.sort !== false,
        render: row => {
          const c = res.cell(row, fd);
          const out = i === 0 && cfg.subtitle ? `<span class="k-cell-main"><b>${c}</b><small>${escape(cfg.subtitle(row) || '')}</small></span>` : i === 0 ? `<b>${c}</b>` : c;
          return raw(typeOf(fd).align === 'num' ? `<span class="k-num" style="display:block">${out}</span>` : out);
        }
      }));
      const acts = res.actionsFor.bind(null, ctx);
      cols.push({ key: '_acts', label: '', sort: false, render: row => raw(`<div class="k-acts">${acts(row)}</div>`) });
      return cfg.columns ? cfg.columns(cols, ctx) : cols;
    },
    actionsFor(ctx, row) {
      const extra = (cfg.rowActions || []).filter(a => !a.when || a.when(row, ctx)).map(a => actButton(a.id, row.id, a.icon || '•', a.label));
      const st = machine && res.can('edit', ctx) && machine.next(row).length ? actButton('_status', row.id, '⇄', 'Cambiar estado') : '';
      return [...extra, st, res.can('edit', ctx) ? actButton('_edit', row.id, '✎', 'Editar') : '', res.can('delete', ctx) ? actButton('_del', row.id, '🗑', 'Eliminar') : ''].join('');
    },
    filters(ctx) {
      const auto = fields.filter(fd => fd.filter ?? typeOf(fd).filter).map(fd => ({
        key: fd.name, label: fd.label,
        options: fd.type === 'status' ? fd.machine.options() : fd.type === 'bool' ? [['1', 'Sí'], ['0', 'No']] : fd.type === 'ref' ? refOptions(fd, res) : optionsOf(fd, res),
        test: fd.type === 'bool' ? (r, v) => !!r[fd.name] === (v === '1') : (r, v) => String(r[fd.name] ?? '') === v
      }));
      return [...auto, ...(cfg.filters || [])];
    },
    searchText: row => (cfg.search ? cfg.search(row) : (searchFields.length ? searchFields : fields.filter(fd => !fd.type || ['text', 'email', 'tel', 'rut'].includes(fd.type))).map(fd => res.text(row, fd)).join(' ') + ' ' + (title(row) || '')),
    csvRow: row => (typeof cfg.csv === 'function' ? cfg.csv(row) : Object.fromEntries(fields.filter(fd => fd.csv !== false).map(fd => [fd.label, res.text(row, fd)]))),

    // ----- Operaciones (con bitácora y hooks) -----
    async save(values, row = null, ctx) {
      const user = me(ctx);
      let v = { ...values };
      if (cfg.validate) { const err = await cfg.validate(v, row, ctx); if (err) { toast(err, 'warning'); return null; } }
      if (cfg.beforeSave) { const r = await cfg.beforeSave(v, row, ctx); if (r === false) return null; if (r && typeof r === 'object') v = r; }
      // Archivos: sin archivo nuevo se conserva el actual; uno nuevo se sube antes de guardar.
      for (const fd of fields.filter(f => f.type === 'file')) {
        if (v[fd.name] === undefined) { delete v[fd.name]; continue; }
        if (typeof Blob !== 'undefined' && v[fd.name] instanceof Blob) {
          if (!db.files) { toast('Este almacenamiento no admite archivos', 'warning'); return null; }
          try { v[fd.name] = await db.files.upload(v[fd.name], { folder: col }); }
          catch (e) { toast(`No se pudo subir ${fd.label}: ${e.message}`, 'error'); return null; }
        }
      }
      let out;
      const before = row ? JSON.parse(JSON.stringify(db.get(col, row.id) || row)) : null; // copia: db.update muta el objeto vivo
      if (row) {
        out = db.update(col, row.id, v);
        logAction && db.log(logAction, `Editado: ${title(out)}`, user?.id);
      } else {
        const defs = cfg.defaults ? cfg.defaults(ctx) : {};
        const init = machine && !(machine.field in v) ? { [machine.field]: machine.initial, [machine.field + 'At']: new Date().toISOString(), ...(machine.history ? { [machine.history]: [{ at: new Date().toISOString(), from: null, to: machine.initial, by: user?.id || null, note: '' }] } : {}) } : {};
        out = db.insert(col, { ...defs, ...init, ...v });
        logAction && db.log(logAction, `Creado: ${title(out)}`, user?.id);
      }
      cfg.afterSave && await cfg.afterSave(out, { isNew: !row, before }, ctx);
      toast(`${cap(singular)} ${row ? 'actualizad' + o : 'cread' + o}`, 'success');
      return out;
    },
    async remove(row, ctx) {
      if (!res.can('delete', ctx)) return false;
      const ok = cfg.canDelete ? cfg.canDelete(row, ctx) : true;
      if (ok !== true) { toast(ok || 'No se puede eliminar', 'warning'); return false; }
      if (!await confirm(`¿Eliminar ${singular} "${title(row)}"? Esta acción no se puede deshacer.`, { title: `Eliminar ${singular}`, ok: 'Eliminar', danger: true })) return false;
      db.remove(col, row.id);
      logAction && db.log(logAction, `Eliminado: ${title(row)}`, me(ctx)?.id);
      cfg.afterDelete && cfg.afterDelete(row, ctx);
      toast(`${cap(singular)} eliminad${o}`, 'success');
      return true;
    },
    // Modal de alta (row = null) o edición. Devuelve la fila guardada o null.
    async form(row = null, ctx, preset = {}) {
      if (!res.can(row ? 'edit' : 'create', ctx)) { toast('Tu rol no puede hacer esto', 'warning'); return null; }
      const fresh = row && db.get(col, row.id);
      const values = fresh || { ...(cfg.defaults ? cfg.defaults(ctx) : {}), ...preset };
      let saved = null;
      await fieldsModal({
        title: row ? `Editar ${singular}: ${title(fresh || row)}` : newLabel, fields: formFields(row), values, res, size: cfg.formSize ?? 'lg',
        intro: cfg.formIntro || '',
        onSubmit: async v => { saved = await res.save(fresh ? v : { ...preset, ...v }, fresh, ctx); return saved ? true : false; }
      });
      return saved;
    },
    // Cambio de estado con la máquina (pide nota si el estado destino tiene note: true).
    async changeStatus(row, to, ctx) {
      if (!machine) return null;
      const fresh = db.get(col, row.id);
      const options = machine.next(fresh);
      let note = '';
      if (!to) {
        if (!options.length) { toast('No hay transiciones disponibles', 'info'); return null; }
        const v = await fieldsModal({ title: `Cambiar estado · ${title(fresh)}`, size: '', submit: 'Cambiar', intro: `Estado actual: ${escape(machine.label(fresh[machine.field]))}`,
          fields: [{ name: 'to', label: 'Nuevo estado', type: 'select', required: true, options: options.map(k => [k, machine.label(k)]) }, { name: 'note', label: 'Nota (opcional)', type: 'textarea' }] });
        if (!v) return null;
        to = v.to; note = v.note;
      } else if (machine.get(to).note) {
        const v = await fieldsModal({ title: `${machine.label(to)} · ${title(fresh)}`, size: '', submit: 'Confirmar', fields: [{ name: 'note', label: 'Motivo', type: 'textarea', required: true }] });
        if (!v) return null;
        note = v.note;
      }
      try {
        const out = machine.move(db, col, fresh.id, to, { by: me(ctx)?.id || null, note: note || '', log: logAction || col, title });
        toast(`${title(out)} → ${machine.label(to)}`, 'success');
        cfg.afterStatus && cfg.afterStatus(out, to, ctx);
        return out;
      } catch (e) { toast(e.message, 'warning'); return null; }
    },

    // ----- Vistas -----
    // Página de listado completa. Devuelve { refresh } para que el panel la actualice sin perder filtros.
    // opts (maestro-detalle, p. ej. los pagos dentro del detalle de una polla):
    //   { embedded: true, title: 'Pagos', where: row => row.circleId === id, preset: { circleId: id }, pageSize, onRow }
    // preset se guarda aunque esos campos no estén en el formulario.
    // embedded = sin encabezado de página: título y botón "Nuevo" van en la tarjeta; búsqueda solo si hay > 8 filas.
    renderList(view, ctx = {}, opts = {}) {
      const state = { q: '', f: {} };
      const embedded = !!opts.embedded;
      const filters = embedded ? (opts.filters || []) : res.filters(ctx);
      const head = [
        ...(cfg.pageActions || []).filter(a => !a.when || a.when(ctx)).map((a, i) => `<button type="button" class="btn ${a.primary ? 'btn-primary' : ''}" data-page-act="${i}">${a.icon ? escape(a.icon) + ' ' : ''}${escape(a.label)}</button>`),
        res.can('create', ctx) ? `<button type="button" class="btn btn-primary ${embedded ? 'btn-sm' : ''}" data-new>＋ ${escape(newLabel)}</button>` : ''
      ].join('');
      const showSearch = !embedded || res.rows(ctx).filter(opts.where || (() => true)).length > 8;
      view.innerHTML = html`${embedded ? '' : pageHead(cfg.listTitle || plural, cfg.intro || '', head)}
        <section class="card">
          ${embedded ? raw(`<div class="k-card-head"><h3>${escape(opts.title || plural)}</h3><div class="k-page-actions">${head}</div></div>`) : ''}
          <div class="k-toolbar" ${!showSearch && !filters.length && (embedded || cfg.csv === false) ? 'hidden' : ''}>
            ${showSearch ? raw(`<input class="input k-search" type="search" placeholder="Buscar ${escape(plural.toLowerCase())}…" aria-label="Buscar" data-q>`) : ''}
            ${filters.map(f => raw(`<select class="select" data-f="${escape(f.key)}" aria-label="${escape(f.label)}"><option value="">${escape(f.label)}: todos</option>${f.options.map(o => { const [v, l] = opt(o); return `<option value="${escape(v)}">${escape(l)}</option>`; }).join('')}</select>`))}
            <span class="k-grow"></span>
            ${cfg.csv !== false && !embedded ? raw('<button type="button" class="btn btn-sm" data-csv>⇩ CSV</button>') : ''}
          </div>
          <div data-dt></div>
        </section>
        ${cfg.below && !embedded ? raw(cfg.below(ctx)) : ''}`;
      const compute = () => {
        let list = res.rows(ctx);
        if (opts.where) list = list.filter(opts.where);
        if (state.q) list = list.filter(r => norm(res.searchText(r)).includes(norm(state.q)));
        filters.forEach(f => { const v = state.f[f.key]; if (v) list = list.filter(r => (f.test ? f.test(r, v) : String(r[f.key]) === v)); });
        if (cfg.sort) list = [...list].sort(cfg.sort);
        return list;
      };
      const dt = dataTable(view.querySelector('[data-dt]'), {
        rows: compute(), columns: res.columns(ctx), pageSize: opts.pageSize || cfg.pageSize || 10,
        empty: cfg.empty || `No hay ${plural.toLowerCase()} con esos criterios`,
        onRow: opts.onRow || (r => (cfg.detail ? location.hash = `#/${id}/${r.id}` : res.can('edit', ctx) && res.form(r, ctx)))
      });
      const refresh = () => dt.update(compute());
      // Embebida en otra vista (p. ej. el detalle del padre, que vigila otra colección): se refresca sola
      // y se da de baja cuando su contenedor deja de estar en la página.
      if (embedded) { const off = db.subscribe(debounce(() => (view.isConnected ? refresh() : off()), 120)); }
      view.querySelector('[data-q]')?.addEventListener('input', debounce(e => { state.q = e.target.value; refresh(); }, 150));
      view.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { state.f[s.dataset.f] = s.value; refresh(); }));
      view.querySelector('[data-new]')?.addEventListener('click', async () => { if (await res.form(null, ctx, opts.preset || {})) refresh(); });
      view.querySelectorAll('[data-page-act]').forEach(b => b.addEventListener('click', () => cfg.pageActions.filter(a => !a.when || a.when(ctx))[+b.dataset.pageAct].run(ctx, res)));
      view.querySelector('[data-csv]')?.addEventListener('click', () => {
        const rows = compute().map(res.csvRow);
        if (!rows.length) return toast('No hay filas para exportar', 'warning');
        downloadCSV(`${id}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
        toast(`Exportadas ${rows.length} filas`, 'success');
      });
      wireRowEvents(view, ctx);
      return { refresh };
    },
    // Detalle: datos, contenido propio (detail.render), historial de estados y acciones.
    renderDetail(view, ctx = {}) {
      const row = db.get(col, ctx.params?.id);
      if (!row) { view.innerHTML = emptyState({ icon: '🔎', title: `${cap(singular)} no encontrad${o}`, text: 'Puede que se haya eliminado.', action: `<a class="btn" href="#/${id}">← Volver a ${escape(plural.toLowerCase())}</a>` }); return; }
      const d = typeof cfg.detail === 'object' ? cfg.detail : {};
      const next = machine && res.can('edit', ctx) ? machine.next(row) : [];
      const acts = [
        ...next.map(to => `<button type="button" class="btn btn-sm" data-to="${escape(to)}">→ ${escape(machine.label(to))}</button>`),
        ...(cfg.rowActions || []).filter(a => !a.when || a.when(row, ctx)).map(a => `<button type="button" class="btn btn-sm" data-act="${escape(a.id)}" data-id="${row.id}">${escape(a.icon || '')} ${escape(a.label)}</button>`),
        res.can('edit', ctx) ? `<button type="button" class="btn btn-sm btn-primary" data-act="_edit" data-id="${row.id}">✎ Editar</button>` : '',
        res.can('delete', ctx) ? `<button type="button" class="btn btn-sm btn-ghost" data-act="_del" data-id="${row.id}">🗑 Eliminar</button>` : ''
      ].join('');
      const data = kv(fields.filter(fd => fd.detail !== false).map(fd => [fd.label, raw(res.cell(row, fd) || '<span class="muted">—</span>')]));
      const hist = machine && machine.history && row[machine.history]?.length ? card('Historial', historyTimeline(row[machine.history], machine, { users: uid => db.get('users', uid)?.name })) : '';
      view.innerHTML = html`<a href="#/${id}" class="small">← ${plural}</a>
        ${pageHead(title(row), cfg.subtitle ? cfg.subtitle(row) : (machine ? raw(machine.badge(row[machine.field])) : ''), acts)}
        <div class="k-grid-main">
          <div class="stack">${card('Datos', data)}${d.render ? raw(d.render(row, ctx)) : ''}</div>
          <div class="stack">${raw(hist)}${d.aside ? raw(d.aside(row, ctx)) : ''}</div>
        </div>`;
      view.querySelectorAll('[data-to]').forEach(b => b.addEventListener('click', () => res.changeStatus(row, b.dataset.to, ctx)));
      wireRowEvents(view, ctx, true);
      d.mount && d.mount(view, row, ctx);
    },
    // Ítem de navegación para app.panel(): listado en #/<id> y detalle en #/<id>/:id
    section(extra = {}) {
      return {
        id, label: plural, icon: cfg.icon || '📄', watch: [col, ...(cfg.watch || [])],
        count: cfg.count, ...extra,
        render: (v, ctx) => res.renderList(v, ctx),
        routes: cfg.detail ? { ':id': { label: cap(singular), render: (v, ctx) => res.renderDetail(v, ctx) } } : null
      };
    }
  };

  // Delegación de eventos de fila: acciones propias, editar, eliminar, estado, interruptores.
  // El panel reutiliza el mismo contenedor (#view) entre rutas: se da de baja la delegación anterior
  // de este recurso en ese contenedor para no duplicar acciones (dos modales al editar, etc.).
  function wireRowEvents(view, ctx, inDetail = false) {
    const key = '__kRowEvents_' + id;
    view[key]?.abort();
    const ac = view[key] = new AbortController();
    const signal = ac.signal;
    view.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]');
      if (!b || !view.contains(b)) return;
      e.stopPropagation();
      const row = db.get(col, b.dataset.id);
      if (!row) return;
      const a = b.dataset.act;
      if (a === '_edit') return res.form(row, ctx);
      if (a === '_status') return res.changeStatus(row, null, ctx);
      if (a === '_del') { if (await res.remove(row, ctx) && inDetail) location.hash = `#/${id}`; return; }
      const custom = (cfg.rowActions || []).find(x => x.id === a);
      custom && custom.run(row, ctx, res);
    }, { signal });
    view.addEventListener('change', e => {
      const t = e.target.closest('[data-toggle]');
      if (!t || !view.contains(t)) return;
      const fd = fields.find(f => f.name === t.dataset.toggle);
      if (!fd || !db.get(col, t.dataset.id)) return;
      e.stopPropagation();
      const row = db.update(col, t.dataset.id, { [fd.name]: t.checked });
      logAction && db.log(logAction, `${title(row)}: ${fd.label} ${t.checked ? 'sí' : 'no'}`, me(ctx)?.id);
      toast(`${fd.label}: ${t.checked ? 'sí' : 'no'}`, 'success');
    }, { signal });
  }
  return res;
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
