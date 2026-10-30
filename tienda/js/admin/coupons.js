// Cupones y descuentos: porcentaje, monto fijo o envío gratis, con mínimo, límite de usos y vencimiento.
import { html, raw, money, date, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log } from './common.js';

const TYPES = { percent: 'Porcentaje', fixed: 'Monto fijo', shipping: 'Envío gratis' };
const valueLabel = c => c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? money(c.value) : 'Envío';
function state(c) {
  if (!c.active) return ['Pausado', 'warning'];
  if (c.expiresAt && new Date(c.expiresAt + 'T23:59:59') < new Date()) return ['Expirado', 'danger'];
  if (c.usageLimit && c.used >= c.usageLimit) return ['Agotado', 'danger'];
  return ['Activo', 'success'];
}

export function render(el) {
  const orders = db.all('orders');
  const rows = db.all('coupons').map(c => {
    const os = orders.filter(o => o.couponCode === c.code && o.status !== 'cancelado');
    return { ...c, st: state(c)[0], revenue: os.reduce((s, o) => s + o.total, 0), given: os.reduce((s, o) => s + o.discount, 0) };
  });
  el.innerHTML = html`${raw(pageHead('Cupones y descuentos', 'Los clientes los aplican en el carro. Se validan mínimo de compra, límite de usos y vencimiento.', '<button class="btn" data-csv>⬇ CSV</button><button class="btn btn-primary" data-new>+ Nuevo cupón</button>'))}<div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'coupons', rows, search: c => c.code + ' ' + c.description, defaultSort: { key: 'used', dir: -1 },
    filters: [{ key: 'type', label: 'Tipo', options: Object.entries(TYPES) }, { key: 'st', label: 'Estado', options: [['Activo', 'Activo'], ['Pausado', 'Pausado'], ['Expirado', 'Expirado'], ['Agotado', 'Agotado']] }],
    columns: [
      { key: 'code', label: 'Código', render: c => html`<b class="mono">${c.code}</b><br><small class="muted">${c.description}</small>` },
      { key: 'type', label: 'Tipo', render: c => `${TYPES[c.type]}<br><b>${valueLabel(c)}</b>` },
      { key: 'minTotal', label: 'Mínimo', render: c => c.minTotal ? money(c.minTotal) : '—' },
      { key: 'used', label: 'Usos', render: c => `${c.used}${c.usageLimit ? ' / ' + c.usageLimit : ''}${c.usageLimit ? `<div class="progress" style="margin-top:4px;width:80px"><i style="--v:${Math.min(100, c.used / c.usageLimit * 100)}%"></i></div>` : ''}` },
      { key: 'given', label: 'Descontado', render: c => money(c.given) },
      { key: 'expiresAt', label: 'Vence', render: c => c.expiresAt ? date(c.expiresAt + 'T12:00:00') : 'Sin vencimiento' },
      { key: 'st', label: 'Estado', render: c => `<span class="badge badge-${state(c)[1]}">${state(c)[0]}</span>` },
      { key: 'active', label: 'Activo', render: c => `<label class="switch"><input type="checkbox" data-toggle="${c.id}" ${c.active ? 'checked' : ''} aria-label="Activo"><span></span></label>` },
      { key: 'act', label: '', sort: false, class: 'actions', render: c => `<button class="btn btn-sm" data-edit="${c.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">🗑</button>` }
    ]
  });
  el.addEventListener('change', e => {
    const tg = e.target.closest('[data-toggle]');
    if (!tg) return;
    const c = db.get('coupons', tg.dataset.toggle);
    db.update('coupons', c.id, { active: tg.checked });
    log('cupón', `${c.code} ${tg.checked ? 'activado' : 'pausado'}`);
    toast(`${c.code} ${tg.checked ? 'activado' : 'pausado'}`, 'success');
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-csv]')) exportCSV('cupones', t.filtered().map(c => ({ codigo: c.code, tipo: TYPES[c.type], valor: c.value, minimo: c.minTotal, usos: c.used, limite: c.usageLimit, vence: c.expiresAt, estado: c.st })));
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (e.target.closest('[data-new]') || ed) {
      const c = ed ? db.get('coupons', ed.dataset.edit) : { code: '', type: 'percent', value: 10, minTotal: 0, usageLimit: 0, expiresAt: '', description: '', active: true };
      const v = await formModal({ title: ed ? `Editar ${c.code}` : 'Nuevo cupón', fields: [
        { name: 'code', label: 'Código', value: c.code, required: true, placeholder: 'VERANO20' },
        { name: 'description', label: 'Descripción', value: c.description },
        { name: 'type', label: 'Tipo', type: 'select', value: c.type, options: Object.entries(TYPES) },
        { name: 'value', label: 'Valor (% o CLP; ignora si es envío gratis)', type: 'number', value: c.value },
        { name: 'minTotal', label: 'Compra mínima (CLP)', type: 'number', value: c.minTotal },
        { name: 'usageLimit', label: 'Límite de usos (0 = ilimitado)', type: 'number', value: c.usageLimit },
        { name: 'expiresAt', label: 'Vence el', type: 'date', value: c.expiresAt },
        { name: 'active', label: 'Activo', type: 'checkbox', value: c.active }
      ] });
      if (!v) return;
      v.code = v.code.toUpperCase().replace(/\s+/g, '');
      if (db.find('coupons', x => x.code === v.code && x.id !== c.id)) return toast('Ya existe un cupón con ese código', 'warning');
      if (v.type === 'percent' && (v.value <= 0 || v.value > 90)) return toast('El porcentaje debe estar entre 1 y 90', 'warning');
      if (ed) { db.update('coupons', c.id, v); log('cupón', `Editó ${v.code}`); }
      else { db.insert('coupons', { ...v, used: 0 }); log('cupón', `Creó ${v.code}`); }
      toast('Cupón guardado', 'success');
    }
    if (del) {
      const c = db.get('coupons', del.dataset.del);
      if (!await confirm(`¿Eliminar el cupón ${c.code}?`, { danger: true, ok: 'Eliminar' })) return;
      db.remove('coupons', c.id);
      log('cupón', `Eliminó ${c.code}`);
      toast('Cupón eliminado', 'info');
    }
  });
}
