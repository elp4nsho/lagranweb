// Cupones de descuento.
import { crud, badge, html, date } from '../shared/admin-kit.js';
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';

const state = c => !c.active ? ['Inactivo', ''] : new Date(c.expiresAt) < Date.now() ? ['Vencido', 'danger'] : c.maxUses && c.uses >= c.maxUses ? ['Agotado', 'warning'] : ['Activo', 'success'];
export function renderCoupons(el, _p, ctx) {
  crud(el, ctx, {
    key: 'coupons', title: 'Cupones', subtitle: 'Descuentos por porcentaje o monto fijo, con límite de usos y vencimiento.', singular: 'cupón', collection: 'coupons',
    search: c => `${c.code} ${c.description}`,
    filters: [{ key: 'st', label: 'Estado', options: ['Activo', 'Vencido', 'Agotado', 'Inactivo'], test: (c, v) => state(c)[0] === v }],
    columns: [
      { key: 'code', label: 'Código', render: c => html`<code><b>${c.code}</b></code><br><small class="muted">${c.description || ''}</small>` },
      { key: 'value', label: 'Descuento', render: c => c.type === 'pct' ? `${c.value}%` : money(c.value) },
      { key: 'courseId', label: 'Aplica a', render: c => c.courseId ? (db.get('courses', c.courseId)?.title || '—') : 'Todo el catálogo' },
      { key: 'uses', label: 'Usos', render: c => `${c.uses} / ${c.maxUses || '∞'}` },
      { key: 'expiresAt', label: 'Vence', render: c => date(c.expiresAt) },
      { key: 'st', label: 'Estado', sort: false, render: c => badge(...state(c)) }
    ],
    fields: () => [
      { name: 'code', label: 'Código', required: true, half: true, placeholder: 'VERANO25' },
      { name: 'type', label: 'Tipo', type: 'select', options: [['pct', 'Porcentaje'], ['monto', 'Monto fijo (CLP)']], half: true },
      { name: 'value', label: 'Valor', type: 'number', required: true, min: 1, half: true },
      { name: 'minTotal', label: 'Compra mínima (CLP)', type: 'number', min: 0, half: true, value: 0 },
      { name: 'maxUses', label: 'Usos máximos (0 = ilimitado)', type: 'number', min: 0, half: true, value: 100 },
      { name: 'expiresAt', label: 'Vencimiento', type: 'date', required: true, half: true },
      { name: 'courseId', label: 'Curso específico (opcional)', type: 'select', options: [['', 'Todo el catálogo'], ...db.query('courses', c => c.status === 'publicado').map(c => [c.id, c.title])] },
      { name: 'description', label: 'Descripción interna' },
      { name: 'active', label: 'Activo', type: 'checkbox', value: true }
    ],
    toForm: c => ({ ...c, expiresAt: c.expiresAt.slice(0, 10), courseId: c.courseId || '' }),
    validate: (v, c) => { const e = {}; v.code = v.code.toUpperCase().replace(/\s/g, ''); if (!/^[A-Z0-9]{3,20}$/.test(v.code)) e.code = 'Solo letras y números (3–20)'; else if (db.find('coupons', x => x.code === v.code && x.id !== c?.id)) e.code = 'Código en uso'; if (v.type === 'pct' && (v.value < 1 || v.value > 100)) e.value = 'Entre 1 y 100'; return e; },
    toRecord: (v, c) => ({ ...v, expiresAt: new Date(v.expiresAt + 'T23:59:59').toISOString(), courseId: v.courseId || null, uses: c?.uses || 0 }),
    csv: c => ({ codigo: c.code, tipo: c.type, valor: c.value, usos: c.uses, maximo: c.maxUses, vence: date(c.expiresAt), estado: state(c)[0] })
  });
}
