// Módulo órdenes de trabajo: OT con 8 etapas, tablero kanban, mecánicos, foto de ingreso y
// seguimiento público por código + patente (db.lookup: en Supabase es una función SQL con campos acotados).
import { resource } from '../../../../assets/core/resource.js';
import { pageHead, card, kv, chartCard, emptyState } from '../../../../assets/core/blocks.js';
import { nextCode, byMonth, countBy } from '../../../../assets/core/domain.js';
import { html, raw, escape, money, barChart, donutChart, toast } from '../../../../assets/core/ui.js';
import { OT, OPEN_STAGES, STAGE_ICON, OT_TYPES, OFFICE, stageTrack, normPlate } from '../shared.js';

const today = () => new Date().toISOString().slice(0, 10);

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const mechName = id => db.get('users', id)?.name || 'Sin asignar';
  const isLate = o => !OT.isFinal(o.status) && o.promisedAt && o.promisedAt < today();

  R.ots = resource(app, {
    collection: 'ots', id: 'ordenes', singular: 'orden', plural: 'Órdenes de trabajo', feminine: true, icon: '🔧',
    title: o => o.code, subtitle: o => `${o.plate || ''} · ${o.car || ''}`,
    fields: [
      { name: 'code', label: 'OT', form: false, search: true },
      { name: 'vehicleId', label: 'Vehículo', type: 'ref', ref: 'vehicles', refLabel: v => `${v.plate} · ${v.make} ${v.model} — ${db.get('customers', v.customerId)?.name || ''}`, required: true, table: false, createOnly: true },
      { name: 'plate', label: 'Patente', form: false, search: true, render: v => `<span class="plate">${escape(v || '—')}</span>` },
      { name: 'customerId', label: 'Cliente', type: 'ref', ref: 'customers', form: false },
      { name: 'type', label: 'Tipo', type: 'select', options: OT_TYPES, required: true, filter: true },
      { name: 'symptom', label: 'Motivo de ingreso', type: 'textarea', required: true },
      { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea' },
      { name: 'km', label: 'Kilometraje al ingreso', type: 'number', min: 0, table: false },
      { name: 'mechanicId', label: 'Mecánico', type: 'ref', ref: 'users', refFilter: u => u.role === 'mecanico' && u.active !== false, filter: true },
      { name: 'promisedAt', label: 'Prometida para', type: 'date', render: (v, o) => (v ? `<span style="${isLate(o) ? 'color:var(--danger);font-weight:700' : ''}">${escape(new Date(v + 'T12:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }))}${isLate(o) ? ' ⚠' : ''}</span>` : '—') },
      { name: 'total', label: 'Total estimado', type: 'money', table: false },
      { name: 'photo', label: 'Foto de ingreso', type: 'file', accept: 'image/*', maxKB: 400 },
      { name: 'status', label: 'Etapa', type: 'status', machine: OT }
    ],
    // El mecánico ve solo sus OT; el resto del equipo ve todas.
    rows: ctx => db.query('ots', o => ctx.user?.role !== 'mecanico' || o.mechanicId === ctx.user.id),
    permissions: { create: OFFICE, edit: [...OFFICE, 'mecanico'], delete: ['admin'] },
    beforeSave: (v, row) => {
      const veh = db.get('vehicles', v.vehicleId || row?.vehicleId);
      const out = { ...v, ...(veh ? { customerId: veh.customerId, plate: veh.plate, car: `${veh.make} ${veh.model} ${veh.year || ''}`.trim() } : {}) };
      if (!row) { out.code = nextCode(db, 'ot', 'OT-', 24790); if (veh && !out.km) out.km = veh.km; }
      return out;
    },
    afterSave: (o, { isNew }) => { if (o.km && o.vehicleId) { const v = db.get('vehicles', o.vehicleId); if (v && o.km > (v.km || 0)) db.update('vehicles', v.id, { km: o.km }); } },
    count: () => db.count('ots', o => o.status === 'listo'),
    detail: {
      render: (o, ctx) => {
        const q = R.quotes && db.query('quotes', x => x.otId === o.id);
        const inv = R.invoices && db.find('invoices', x => x.otId === o.id);
        const acts = [
          R.quotes && OFFICE.includes(ctx.user.role) ? '<button type="button" class="btn btn-sm" data-new-quote>🧮 Nuevo presupuesto</button>' : '',
          R.invoices && !inv && ['listo', 'entregado'].includes(o.status) && ['admin', 'asesor'].includes(ctx.user.role) ? '<button type="button" class="btn btn-sm btn-primary" data-new-doc>🧾 Emitir documento</button>' : ''
        ].join('');
        return card('Avance', stageTrack(o)) +
          (R.quotes ? card('Presupuestos', q.length ? q.map(x => `<p style="margin:0 0 8px"><a href="#/presupuestos/${escape(x.id)}"><b>${escape(x.code)}</b></a> · ${money(x.total)} ${app.res.QUOTE.badge(x.status)}</p>`).join('') + (q.some(x => x.status === 'aprobado') && o.status === 'presupuesto' ? '<p class="small"><b>✅ El cliente aprobó el presupuesto:</b> pasa la OT a «Aprobado».</p>' : '') : '<p class="muted small">Sin presupuestos.</p>') : '') +
          (R.invoices ? card('Documento de venta', inv ? `<p><a href="#/documentos/${escape(inv.id)}"><b>${escape(inv.kind)} N° ${escape(inv.number)}</b></a> · ${money(inv.total)} · ${inv.paid ? 'Pagado' : 'Por cobrar'}</p>` : '<p class="muted small">Aún no emitido.</p>') : '') +
          (acts ? `<div class="row">${acts}</div>` : '');
      },
      mount: (view, o, ctx) => {
        view.querySelector('[data-new-quote]')?.addEventListener('click', async () => { const q = await R.quotes.form(null, ctx, { customerId: o.customerId, vehicleId: o.vehicleId, otId: o.id }); if (q) location.hash = `#/presupuestos/${q.id}`; });
        view.querySelector('[data-new-doc]')?.addEventListener('click', async () => { const d = await R.invoices.form(null, ctx, { customerId: o.customerId, otId: o.id, total: o.total || 0, concept: `Servicio ${o.code} · ${o.car}` }); if (d) location.hash = `#/documentos/${d.id}`; });
      }
    }
  });
  R.OT = OT;

  // Cita → OT (lo usa la agenda): crea cliente y vehículo si no existen.
  R.otFromAppointment = async (a, ctx) => {
    let cust = a.customerId && db.get('customers', a.customerId);
    if (!cust) cust = db.insert('customers', { name: a.name, phone: a.phone, email: a.email || '', rut: '', address: '', notes: 'Creado desde la agenda' });
    let veh = a.plate && db.find('vehicles', v => normPlate(v.plate) === normPlate(a.plate));
    if (!veh) { const [make = 'Por definir', ...rest] = String(a.car || '').split(' '); veh = db.insert('vehicles', { plate: a.plate || 'SIN-00', customerId: cust.id, make, model: rest.join(' ') || '—', year: null, km: 0, color: '' }); }
    const o = await R.ots.save({ vehicleId: veh.id, type: 'mecanica', symptom: a.notes || `Cita ${a.code}`, mechanicId: '', promisedAt: '' }, null, ctx);
    if (o) { db.update('appointments', a.id, { otId: o.id, customerId: cust.id }); location.hash = `#/ordenes/${o.id}`; }
  };

  // ---------- Tablero kanban ----------
  function board(view, ctx) {
    const paint = () => {
      const open = R.ots.rows(ctx).filter(o => OPEN_STAGES.includes(o.status));
      view.innerHTML = html`${pageHead('Tablero del taller', `${open.length} OT abiertas · mueve cada una a su siguiente etapa`, OFFICE.includes(ctx.user.role) ? '<button type="button" class="btn btn-primary" data-new>＋ Nueva OT</button>' : '')}
        <div class="kanban">${OPEN_STAGES.map(st => { const list = open.filter(o => o.status === st); return raw(`<section class="kanban-col"><h3><span aria-hidden="true">${STAGE_ICON[st] || ''}</span> ${escape(OT.label(st))} <span class="badge">${list.length}</span></h3>${list.map(o => {
          const nx = OT.next(o).filter(s => s !== 'cancelada')[0];
          return `<article class="card kanban-card${isLate(o) ? ' late' : ''}"><a href="#/ordenes/${escape(o.id)}"><b>${escape(o.code)}</b></a> <span class="plate">${escape(o.plate || '')}</span><small class="d-block muted">${escape(o.car || '')}</small><small class="d-block">👤 ${escape(mechName(o.mechanicId))}</small>${nx ? `<button type="button" class="btn btn-sm" data-move="${escape(o.id)}" data-to="${escape(nx)}">→ ${escape(OT.label(nx))}</button>` : ''}</article>`;
        }).join('') || '<p class="muted small">—</p>'}</section>`); })}</div>`;
      view.querySelector('[data-new]')?.addEventListener('click', () => R.ots.form(null, ctx));
    };
    view.addEventListener('click', async e => { const b = e.target.closest('[data-move]'); if (b) { await R.ots.changeStatus(db.get('ots', b.dataset.move), b.dataset.to, ctx); } });
    paint();
    return { refresh: paint };
  }
  app.contribute('admin.html', [
    { id: 'tablero', label: 'Tablero', icon: '🗂️', roles: OFFICE, render: board, watch: ['ots'] },
    { ...R.ots.section({ roles: [...OFFICE, 'mecanico'] }) }
  ], { slot: 'operacion' });

  app.contribute('kpis', [
    { order: 1, roles: OFFICE, kpi: () => ({ label: 'OT abiertas', value: db.count('ots', o => OPEN_STAGES.includes(o.status)), icon: '🔧', href: '#/tablero' }) },
    { order: 2, roles: OFFICE, kpi: () => ({ label: 'Listas para entregar', value: db.count('ots', o => o.status === 'listo'), icon: '✅', href: '#/ordenes' }) },
    { order: 3, roles: OFFICE, kpi: () => { const n = db.count('ots', isLate); return { label: 'Atrasadas', value: n, icon: '⏰', up: !n, delta: n ? 'revisar' : 'al día' }; } },
    { order: 1, roles: ['mecanico'], kpi: ctx => ({ label: 'Mis OT abiertas', value: db.count('ots', o => o.mechanicId === ctx.user.id && OPEN_STAGES.includes(o.status)), icon: '🔧', href: '#/ordenes' }) },
    { order: 2, roles: ['mecanico'], kpi: ctx => ({ label: 'En reparación', value: db.count('ots', o => o.mechanicId === ctx.user.id && o.status === 'reparacion'), icon: '🛠️' }) }
  ]);
  app.contribute('dashboard', [
    { order: 10, roles: OFFICE, render: () => { const open = db.query('ots', o => OPEN_STAGES.includes(o.status)); return chartCard('OT abiertas por etapa', donutChart(countBy(open, 'status', OT.label), { label: open.length })); } },
    { order: 11, roles: OFFICE, render: () => chartCard('OT ingresadas por mes', barChart(byMonth(db.all('ots'), 'createdAt'))) },
    { order: 12, roles: ['mecanico'], wide: true, render: ctx => card('Mis OT', db.query('ots', o => o.mechanicId === ctx.user.id && OPEN_STAGES.includes(o.status)).map(o => `<p style="margin:0 0 8px"><a href="#/ordenes/${escape(o.id)}"><b>${escape(o.code)}</b></a> <span class="plate">${escape(o.plate)}</span> ${escape(o.car)} ${OT.badge(o.status)}</p>`).join('') || '<p class="muted small">Sin OT asignadas.</p>') }
  ]);

  // ---------- Sitio: seguimiento público ----------
  const PUBLIC = ['code', 'status', 'statusAt', 'history', 'car', 'promisedAt', 'type'];
  const lookupForm = (q = {}) => `<form class="plate-form" data-track novalidate><label class="sr-only" for="tr-c">Código de OT</label><input class="input" id="tr-c" name="code" placeholder="OT-24810" value="${escape(q.code || '')}" required><label class="sr-only" for="tr-p">Patente</label><input class="input" id="tr-p" name="plate" placeholder="Patente (ABCD-12)" value="${escape(q.plate || '')}" required><button class="btn btn-primary">Ver estado</button></form>`;
  const wire = el => el.querySelector('[data-track]')?.addEventListener('submit', e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); location.hash = `#/ot?code=${encodeURIComponent(v.code.trim())}&plate=${encodeURIComponent(v.plate.trim())}`; });
  app.contribute('site:nav', { label: 'Seguir mi OT', href: '#/ot' }, { slot: 'nav' });
  app.contribute('site:hero', { render: () => `<b>¿Tu auto ya está con nosotros?</b><p class="small muted" style="margin:0">Escribe el código de tu OT y la patente para ver en qué etapa va.</p>${lookupForm()}`, mount: wire });
  app.contribute('site:home', { order: 40, render: () => `<section class="section how"><div class="container stack"><div data-anim><span class="eyebrow">Cómo trabajamos</span><h2>Ves tu auto avanzar, etapa por etapa</h2></div><ol class="ot-timeline h" aria-hidden="true">${Object.entries(STAGE_ICON).map(([id, ic], i) => `<li class="${i < 4 ? 'done' : i === 4 ? 'now' : ''}"><span class="dot">${ic}</span><small>${escape(OT.label(id))}</small></li>`).join('')}</ol></div></section>` });
  app.contribute('site:routes', { path: '/ot', render: async (view, { query }) => {
    view.innerHTML = `<section class="section"><div class="container stack" style="max-width:760px"><h1>Seguimiento de tu OT</h1><div class="card stack">${lookupForm(query)}<small class="muted">El código viene en el comprobante de ingreso. Pedimos la patente para proteger tus datos.</small></div><div data-res></div></div></section>`;
    wire(view);
    if (!query.code || !query.plate) return;
    const box = view.querySelector('[data-res]');
    box.innerHTML = '<span class="spinner"></span>';
    let o = null;
    try { o = await db.lookup('ots', { code: query.code, plate: query.plate }, PUBLIC); } catch (e) { box.innerHTML = emptyState({ icon: '📡', title: 'No pudimos consultar', text: e.message }); return; }
    box.innerHTML = o ? card(`${o.code} · ${o.car || ''}`, `${stageTrack(o)}${o.promisedAt ? `<p class="small">Fecha estimada de entrega: <b>${escape(new Date(o.promisedAt + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }))}</b></p>` : ''}`, { actions: OT.badge(o.status) })
      : emptyState({ icon: '🔎', title: 'No encontramos esa OT', text: 'Revisa el código y la patente.' });
  } });

  // ---------- Portal ----------
  if (app.has('portal')) {
    const mine = resource(app, {
      collection: 'ots', id: 'mis-ot', singular: 'orden', plural: 'Mis órdenes', feminine: true, icon: '🔧',
      title: o => o.code, subtitle: o => o.car,
      fields: [{ name: 'code', label: 'OT' }, { name: 'plate', label: 'Patente', render: v => `<span class="plate">${escape(v || '')}</span>` }, { name: 'car', label: 'Vehículo' }, { name: 'promisedAt', label: 'Entrega estimada', type: 'date' }, { name: 'status', label: 'Etapa', type: 'status', machine: OT }],
      rows: ctx => db.query('ots', o => o.customerId === ctx.user?.customerId),
      readonly: true, csv: false,
      detail: { render: o => card('Avance', stageTrack(o)) + card('Detalle', kv([['Motivo', o.symptom], ['Diagnóstico', o.diagnosis || 'En evaluación']])) }
    });
    app.contribute('portal.html', mine.section({ roles: ['cliente'] }), { slot: 'portal' });
  }
}
