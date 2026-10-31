// Módulo portal del cliente: página portal.html (rol cliente) con su resumen, sus vehículos y su cuenta.
// Los demás módulos agregan sus secciones al portal si está activo (Mis OT, Mis presupuestos, Mis citas…).
import { resource } from '../../../../assets/core/resource.js';
import { pageHead, kpis, card, emptyState } from '../../../../assets/core/blocks.js';
import { accountSection } from '../../../../assets/core/pages.js';
import { html, raw, escape, money } from '../../../../assets/core/ui.js';

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const mineVeh = resource(app, {
    collection: 'vehicles', id: 'mis-vehiculos', singular: 'vehículo', plural: 'Mis vehículos', icon: '🚗',
    title: v => v.plate, subtitle: v => `${v.make} ${v.model} ${v.year || ''}`,
    fields: (R.vehicleFields || []).filter(f => f.name !== 'customerId'),
    rows: ctx => db.query('vehicles', v => v.customerId === ctx.user?.customerId),
    beforeSave: (v, row, ctx) => ({ ...v, customerId: row?.customerId || ctx?.user?.customerId }),
    validate: (v, row) => (db.find('vehicles', x => x.plate === v.plate && x.id !== row?.id) ? 'Esa patente ya está registrada; contáctanos si es tu auto' : null),
    permissions: { create: ['cliente'], edit: ['cliente'], delete: false }, csv: false
  });
  function home(view, ctx) {
    const cid = ctx.user.customerId, c = db.get('customers', cid);
    if (!c) { view.innerHTML = emptyState({ icon: '🙋', title: 'Tu cuenta aún no está ligada a una ficha de cliente', text: 'Escríbenos y la asociamos.' }); return; }
    const openOts = R.ots ? db.query('ots', o => o.customerId === cid && !R.OT.isFinal(o.status)) : [];
    const pending = R.quotes ? db.query('quotes', q => q.customerId === cid && q.status === 'enviado') : [];
    view.innerHTML = html`${pageHead(`Hola, ${c.name.split(' ')[0]}`, app.settings().name)}
      ${raw(kpis([
        { label: 'Mis vehículos', value: db.count('vehicles', v => v.customerId === cid), icon: '🚗', href: '#/mis-vehiculos' },
        R.ots && { label: 'OT en curso', value: openOts.length, icon: '🔧', href: '#/mis-ot' },
        R.quotes && { label: 'Presupuestos por responder', value: pending.length, icon: '🧮', href: '#/mis-presupuestos' },
        R.appointments && { label: 'Próximas citas', value: db.count('appointments', a => a.customerId === cid && a.date >= new Date().toISOString().slice(0, 10) && a.status !== 'cancelada'), icon: '📅', href: '#/mis-citas' },
        R.invoices && { label: 'Documentos', value: db.count('invoices', d => d.customerId === cid), icon: '🧾', href: '#/mis-documentos' }
      ]))}
      ${openOts.length ? raw(card('Tus autos en el taller', openOts.map(o => `<p style="margin:0 0 8px"><a href="#/mis-ot/${escape(o.id)}"><b>${escape(o.code)}</b></a> <span class="plate">${escape(o.plate)}</span> ${escape(o.car)} ${R.OT.badge(o.status)}</p>`).join(''))) : ''}
      ${pending.length ? raw(card('Presupuestos esperando tu respuesta', pending.map(q => `<p style="margin:0 0 8px"><a href="#/mis-presupuestos/${escape(q.id)}"><b>${escape(q.code)}</b></a> · ${money(q.total)}</p>`).join(''))) : ''}
      ${R.appointments ? raw('<p><a class="btn btn-primary" href="index.html#/agendar">📅 Agendar una hora</a></p>') : ''}`;
  }
  app.contribute('portal.html', { id: '', label: 'Inicio', icon: '🏠', roles: ['cliente'], render: home }, { slot: 'inicio' });
  app.contribute('portal.html', mineVeh.section({ roles: ['cliente'] }), { slot: 'portal' });
  app.contribute('portal.html', accountSection(app, { roles: ['cliente'], fields: [{ name: 'phone', label: 'Celular', type: 'tel' }] }), { slot: 'cuenta' });
}
