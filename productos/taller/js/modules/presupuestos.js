// Módulo presupuestos: líneas de mano de obra y repuestos, neto + IVA, envío y aprobación.
// El asesor lo aprueba en el panel o el cliente en el portal. Si el equipo aprueba uno ligado a una OT
// en etapa «Presupuesto», la OT pasa sola a «Aprobado» (si lo aprueba el cliente, se avisa en la OT:
// con Supabase el cliente no tiene permiso de escribir en las OT).
import { resource } from '../../../../assets/core/resource.js';
import { card } from '../../../../assets/core/blocks.js';
import { nextCode } from '../../../../assets/core/domain.js';
import { escape, money, toast } from '../../../../assets/core/ui.js';
import { QUOTE, OFFICE, linesTotal } from '../shared.js';

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  R.QUOTE = QUOTE;
  const iva = () => +app.settings().ivaPct || 19;
  const totals = lines => { const net = Math.round(linesTotal(lines)); const i = Math.round(net * iva() / 100); return { net, iva: i, total: net + i }; };
  const linesTable = q => `<div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Descripción</th><th class="k-num">Cant.</th><th class="k-num">Unitario</th><th class="k-num">Subtotal</th></tr></thead><tbody>${(q.lines || []).map(l => `<tr><td>${l.kind === 'mano' ? 'Mano de obra' : 'Repuesto'}</td><td>${escape(l.desc)}</td><td class="k-num">${escape(l.qty)}</td><td class="k-num">${money(l.price)}</td><td class="k-num">${money(l.qty * l.price)}</td></tr>`).join('')}</tbody></table></div><p class="k-lines-total">Neto ${money(q.net)} · IVA ${money(q.iva)} · <b>Total ${money(q.total)}</b></p>`;

  const fields = [
    { name: 'code', label: 'N°', form: false, search: true },
    { name: 'customerId', label: 'Cliente', type: 'ref', ref: 'customers', required: true },
    { name: 'vehicleId', label: 'Vehículo', type: 'ref', ref: 'vehicles', refLabel: v => `${v.plate} · ${v.make} ${v.model}`, table: false },
    ...(app.has('ordenes') ? [{ name: 'otId', label: 'OT', type: 'ref', ref: 'ots', refLabel: o => `${o.code} · ${o.plate}`, refFilter: o => !['entregado', 'cancelada'].includes(o.status), table: false }] : []),
    { name: 'lines', label: 'Detalle', type: 'lines', required: true, suggest: () => (app.has('inventario') ? db.all('parts').map(p => p.name) : []) },
    { name: 'validUntil', label: 'Válido hasta', type: 'date' },
    { name: 'total', label: 'Total', type: 'money', form: false },
    { name: 'status', label: 'Estado', type: 'status', machine: QUOTE }
  ];
  const afterStatus = (q, to, ctx) => {
    if (to !== 'aprobado' || !q.otId || !R.ots) return;
    const o = db.get('ots', q.otId);
    if (!o || o.status !== 'presupuesto') return;
    if (OFFICE.includes(ctx?.user?.role)) { try { R.OT.move(db, 'ots', o.id, 'aprobado', { by: ctx.user.id, note: `${q.code} aprobado`, log: 'orden', title: x => x.code }); db.update('ots', o.id, { total: q.total }); } catch (e) { toast(e.message, 'warning'); } }
    else db.log('presupuesto', `${q.code} aprobado por el cliente (${o.code} lista para pasar a Aprobado)`, ctx?.user?.id);
  };
  R.quotes = resource(app, {
    collection: 'quotes', id: 'presupuestos', singular: 'presupuesto', plural: 'Presupuestos', icon: '🧮',
    title: q => q.code, subtitle: q => db.get('customers', q.customerId)?.name || '',
    fields,
    permissions: { create: OFFICE, edit: OFFICE, delete: ['admin'] },
    beforeSave: (v, row) => ({ ...v, ...totals(v.lines || row?.lines), ...(row ? {} : { code: nextCode(db, 'pre', 'PRE-', 3400) }) }),
    afterStatus,
    count: () => db.count('quotes', q => q.status === 'enviado'),
    detail: { render: q => card('Detalle', linesTable(q)) }
  });
  app.contribute('admin.html', R.quotes.section({ roles: OFFICE }), { slot: 'ventas' });
  app.contribute('kpis', { order: 20, roles: OFFICE, kpi: () => { const sent = db.query('quotes', q => q.status === 'enviado'); return { label: 'Presupuestos por aprobar', value: sent.length, icon: '🧮', href: '#/presupuestos', hint: money(sent.reduce((s, q) => s + (q.total || 0), 0)) }; } });
  app.contribute('dashboard', { order: 30, roles: OFFICE, render: () => { const all = db.all('quotes').filter(q => QUOTE.isFinal(q.status)); const ok = all.filter(q => q.status === 'aprobado').length; return card('Tasa de aprobación', `<p class="big-num" style="margin:0">${all.length ? Math.round(ok / all.length * 100) : 0}%</p><p class="muted small">${ok} aprobados de ${all.length} respondidos</p>`); } });
  if (!app.has('facturacion')) app.contribute('settings', { title: 'Impuestos', fields: [{ name: 'ivaPct', label: 'IVA (%)', type: 'number', min: 0, max: 30 }] });

  if (app.has('portal')) {
    const mine = resource(app, {
      collection: 'quotes', id: 'mis-presupuestos', singular: 'presupuesto', plural: 'Mis presupuestos', icon: '🧮',
      title: q => q.code, fields: fields.filter(f => ['code', 'validUntil', 'total', 'status'].includes(f.name)),
      rows: ctx => db.query('quotes', q => q.customerId === ctx.user?.customerId && q.status !== 'borrador'),
      permissions: { create: false, edit: false, delete: false }, csv: false, afterStatus,
      rowActions: [
        { id: 'ok', label: 'Aprobar', icon: '✅', when: q => q.status === 'enviado', run: (q, ctx) => approve(q, 'aprobado', ctx) },
        { id: 'no', label: 'Rechazar', icon: '✕', when: q => q.status === 'enviado', run: (q, ctx) => approve(q, 'rechazado', ctx) }
      ],
      detail: { render: q => card('Detalle', linesTable(q)) }
    });
    // El cliente no tiene "editar" (no puede cambiar líneas ni montos): solo responde con estas dos acciones.
    async function approve(q, to, ctx) {
      const note = to === 'rechazado' ? 'Rechazado por el cliente en el portal' : 'Aprobado por el cliente en el portal';
      try { const out = QUOTE.move(db, 'quotes', q.id, to, { by: ctx.user.id, note, log: 'presupuesto', title: x => x.code }); afterStatus(out, to, ctx); toast(to === 'aprobado' ? '¡Gracias! Presupuesto aprobado.' : 'Presupuesto rechazado', 'success'); }
      catch (e) { toast(e.message, 'warning'); }
    }
    app.contribute('portal.html', mine.section({ roles: ['cliente'] }), { slot: 'portal' });
  }
}
