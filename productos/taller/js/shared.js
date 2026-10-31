// Dominio compartido del producto Taller: máquinas de estado, tipos de campo propios (patente, líneas
// de presupuesto) y utilidades. Las etapas de la OT vienen del catálogo de la demo histórica.
import { stateMachine } from '../../../assets/core/domain.js';
import { fieldType, fieldTypes } from '../../../assets/core/resource.js';
import { escape, money } from '../../../assets/core/ui.js';
import { STAGES } from '../../../taller/js/data/catalog.js';

export const OFFICE = ['admin', 'asesor', 'jefe'];
export const STAFF = ['admin', 'asesor', 'jefe', 'mecanico', 'bodega'];
export const STAGE_ICON = Object.fromEntries(STAGES.map(([id, , icon]) => [id, icon]));
export const PAY = [['debito', 'Débito'], ['credito', 'Crédito'], ['transferencia', 'Transferencia'], ['efectivo', 'Efectivo']];
export const OT_TYPES = [['mecanica', 'Mecánica'], ['mantencion', 'Mantención'], ['electricidad', 'Electricidad'], ['carroceria', 'Desabolladura y pintura']];
export const normPlate = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const maskPlate = p => String(p || '').replace(/^(..)(..)/, '$1••');

// Orden de trabajo: 8 etapas lineales + cancelada (con motivo) desde cualquier etapa abierta.
const ORDER = STAGES.map(s => s[0]);
export const OT = stateMachine({
  states: { ...Object.fromEntries(STAGES.map(([id, label, , tone]) => [id, { label, tone, final: id === 'entregado' }])), cancelada: { label: 'Cancelada', tone: 'danger', final: true, note: true } },
  transitions: Object.fromEntries(ORDER.slice(0, -1).map((s, i) => [s, [ORDER[i + 1], 'cancelada']])),
  onEnter: { entregado: (row, patch) => { patch.deliveredAt = new Date().toISOString(); } },
  guard: (row, to) => (to === 'reparacion' && !row.mechanicId ? 'Asigna un mecánico antes de pasar a reparación' : true)
});
export const OPEN_STAGES = ORDER.slice(0, -1);

export const QUOTE = stateMachine({
  states: { borrador: { label: 'Borrador', tone: '' }, enviado: { label: 'Enviado al cliente', tone: 'warning' }, aprobado: { label: 'Aprobado', tone: 'success', final: true }, rechazado: { label: 'Rechazado', tone: 'danger', final: true, note: true } },
  transitions: { borrador: ['enviado'], enviado: ['aprobado', 'rechazado', 'borrador'] }
});

export const APPT = stateMachine({
  states: { solicitada: { label: 'Solicitada', tone: 'info' }, confirmada: { label: 'Confirmada', tone: 'primary' }, atendida: { label: 'Atendida', tone: 'success', final: true }, no_asistio: { label: 'No asistió', tone: 'warning', final: true }, cancelada: { label: 'Cancelada', tone: 'danger', final: true, note: true } },
  transitions: { solicitada: ['confirmada', 'cancelada'], confirmada: ['atendida', 'no_asistio', 'cancelada'] }
});

export const LEAD = stateMachine({
  states: { nuevo: { label: 'Nuevo', tone: 'info' }, respondido: { label: 'Respondido', tone: 'success' }, archivado: { label: 'Archivado', tone: '' } },
  transitions: { nuevo: ['respondido', 'archivado'], respondido: ['archivado'], archivado: ['nuevo'] }
});

// ---------- Tipos de campo propios (registro extensible del kernel) ----------
fieldType('patente', {
  ...fieldTypes.text,
  input: (fd, v, id) => `<input class="input plate-input-sm" id="${id}" name="${fd.name}" value="${escape(v ?? '')}" ${fd.required ? 'required' : ''} placeholder="ABCD-12" autocomplete="off">`,
  read: el => { const c = normPlate(el.value); return c.length > 4 ? c.slice(0, c.length - 2) + '-' + c.slice(-2) : c; },
  cell: v => (v ? `<span class="plate">${escape(v)}</span>` : '<span class="muted">—</span>'),
  check: v => (v && !/^[A-Z]{2,4}-?\d{2,4}$/.test(v) ? 'Patente no válida (ej. ABCD-12 o AB-1234)' : '')
});

// Líneas de presupuesto: [{ kind: 'mano' | 'repuesto', desc, qty, price }] editables en una tabla.
// suggest(res) → nombres para autocompletar (p. ej. los repuestos del inventario si está activo).
const KIND = [['mano', 'Mano de obra'], ['repuesto', 'Repuesto']];
const lineRow = (l = {}) => `<tr><td><select class="select" data-k="kind">${KIND.map(([v, t]) => `<option value="${v}" ${l.kind === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
  <td><input class="input" data-k="desc" value="${escape(l.desc || '')}" list="k-line-sug" aria-label="Descripción"></td>
  <td style="width:70px"><input class="input" data-k="qty" type="number" min="0" step="0.5" value="${escape(l.qty ?? 1)}" aria-label="Cantidad"></td>
  <td style="width:120px"><input class="input" data-k="price" type="number" min="0" step="10" value="${escape(l.price ?? 0)}" aria-label="Precio unitario"></td>
  <td><button type="button" class="btn btn-sm btn-ghost btn-icon" data-del-line aria-label="Quitar línea">✕</button></td></tr>`;
export const linesTotal = lines => (lines || []).reduce((s, l) => s + (+l.qty || 0) * (+l.price || 0), 0);
fieldType('lines', {
  ...fieldTypes.text, wide: true, table: false,
  input: (fd, v, id, res) => {
    const list = Array.isArray(v) && v.length ? v : [{ kind: 'mano', qty: 1, price: 0 }];
    const sug = fd.suggest ? fd.suggest(res) : [];
    return `<div class="k-lines" data-lines><input type="hidden" id="${id}" name="${fd.name}" value="${escape(JSON.stringify(list))}">
      <div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Descripción</th><th>Cant.</th><th>Precio neto</th><th></th></tr></thead><tbody>${list.map(lineRow).join('')}</tbody></table></div>
      <div class="row between"><button type="button" class="btn btn-sm" data-add-line>＋ Agregar línea</button><span class="k-lines-total" data-lines-total>Neto: ${money(linesTotal(list))}</span></div>
      ${sug.length ? `<datalist id="k-line-sug">${sug.map(s => `<option value="${escape(s)}">`).join('')}</datalist>` : ''}</div>`;
  },
  read: el => { try { return JSON.parse(el.value || '[]').filter(l => String(l.desc || '').trim()); } catch (e) { return []; } },
  text: v => `${(v || []).length} líneas · ${money(linesTotal(v))}`,
  cell: v => escape(`${(v || []).length} líneas`),
  check: v => (!v.length ? 'agrega al menos una línea con descripción' : '')
});
// Un solo oyente para todos los editores de líneas (renderFields devuelve HTML sin poder enganchar eventos).
if (typeof document !== 'undefined' && !window.__kLines) {
  window.__kLines = true;
  const sync = box => {
    const rows = [...box.querySelectorAll('tbody tr')].map(tr => Object.fromEntries([...tr.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.type === 'number' ? Number(i.value || 0) : i.value])));
    box.querySelector('input[type=hidden]').value = JSON.stringify(rows);
    box.querySelector('[data-lines-total]').textContent = 'Neto: ' + money(linesTotal(rows));
  };
  document.addEventListener('input', e => { const box = e.target.closest('[data-lines]'); if (box) sync(box); });
  document.addEventListener('change', e => { const box = e.target.closest('[data-lines]'); if (box) sync(box); });
  document.addEventListener('click', e => {
    const box = e.target.closest('[data-lines]');
    if (!box) return;
    if (e.target.closest('[data-add-line]')) { box.querySelector('tbody').insertAdjacentHTML('beforeend', lineRow({ kind: 'repuesto', qty: 1, price: 0 })); sync(box); }
    if (e.target.closest('[data-del-line]')) { e.target.closest('tr').remove(); sync(box); }
  });
}

// Línea de tiempo de etapas de la OT (sitio público y portal).
export function stageTrack(ot) {
  const cur = OPEN_STAGES.concat('entregado').indexOf(ot.status);
  return `<ol class="ot-timeline">${STAGES.map(([id, label, icon], i) => {
    const h = (ot.history || []).find(x => x.to === id);
    return `<li class="${ot.status === 'cancelada' ? '' : i < cur || (i === cur && id === 'entregado') ? 'done' : i === cur ? 'now' : ''}"><span class="dot" aria-hidden="true">${icon}</span><span><b>${escape(label)}</b>${h ? `<small class="d-block muted">${new Date(h.at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>` : ''}</span></li>`;
  }).join('')}</ol>`;
}
