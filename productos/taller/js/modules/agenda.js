// Módulo agenda: reserva pública de horas, agenda del taller y citas del cliente en el portal.
import { resource } from '../../../../assets/core/resource.js';
import { card } from '../../../../assets/core/blocks.js';
import { nextCode } from '../../../../assets/core/domain.js';
import { escape, toast } from '../../../../assets/core/ui.js';
import { APPT, OFFICE, normPlate } from '../shared.js';

const today = () => new Date().toISOString().slice(0, 10);
const plus = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const slots = () => String(app.settings().slots || '').split(',').map(s => s.trim()).filter(Boolean);
  const svcName = id => db.get('services', id)?.name || '';
  const fields = [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'date', label: 'Fecha', type: 'date', required: true },
    { name: 'time', label: 'Hora', type: 'select', required: true, options: () => slots() },
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'phone', label: 'Teléfono', type: 'tel', required: true },
    { name: 'email', label: 'Correo', type: 'email', table: false },
    { name: 'customerId', label: 'Cliente (si ya existe)', type: 'ref', ref: 'customers', table: false },
    { name: 'plate', label: 'Patente', type: 'patente', search: true },
    { name: 'car', label: 'Vehículo', table: false },
    { name: 'serviceId', label: 'Servicio', type: 'ref', ref: 'services', table: false },
    { name: 'notes', label: 'Comentarios', type: 'textarea' },
    { name: 'status', label: 'Estado', type: 'status', machine: APPT }
  ];
  R.appointments = resource(app, {
    collection: 'appointments', id: 'citas', singular: 'cita', plural: 'Agenda', feminine: true, icon: '📅',
    title: a => `${a.code} · ${a.name}`, subtitle: a => `${a.date} ${a.time} · ${a.car || ''}`,
    fields,
    sort: (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    filters: [{ key: 'when', label: 'Cuándo', options: [['hoy', 'Hoy'], ['semana', 'Próximos 7 días'], ['pasadas', 'Pasadas']], test: (a, v) => (v === 'hoy' ? a.date === today() : v === 'semana' ? a.date >= today() && a.date <= plus(7) : a.date < today()) }],
    permissions: { create: OFFICE, edit: OFFICE, delete: ['admin'] },
    beforeSave: (v, row) => (row ? v : { ...v, code: nextCode(db, 'cita', 'CITA-', 5100) }),
    count: () => db.count('appointments', a => a.date === today() && !APPT.isFinal(a.status)),
    rowActions: app.has('ordenes') ? [{ id: 'to-ot', label: 'Crear OT', icon: '🔧', when: a => ['confirmada', 'atendida'].includes(a.status) && !a.otId, run: (a, ctx) => R.otFromAppointment(a, ctx) }] : [],
    detail: true
  });

  app.contribute('admin.html', R.appointments.section({ roles: OFFICE }), { slot: 'operacion' });
  app.contribute('kpis', { order: 10, roles: OFFICE, kpi: () => ({ label: 'Citas hoy', value: db.count('appointments', a => a.date === today() && a.status !== 'cancelada'), icon: '📅', href: '#/citas', hint: `${db.count('appointments', a => a.status === 'solicitada')} por confirmar` }) });
  app.contribute('dashboard', { order: 20, roles: OFFICE, render: () => {
    const next = db.query('appointments', a => a.date >= today() && !APPT.isFinal(a.status)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 6);
    return card('Próximas citas', next.map(a => `<p style="margin:0 0 10px"><b>${escape(a.date === today() ? 'Hoy' : a.date)} ${escape(a.time)}</b> · ${escape(a.name)} ${APPT.badge(a.status)}<br><small class="muted">${escape(a.car || '')} ${a.plate ? '· ' + escape(a.plate) : ''} ${svcName(a.serviceId) ? '· ' + escape(svcName(a.serviceId)) : ''}</small></p>`).join('') || '<p class="muted small">Sin citas próximas.</p>', { actions: '<a class="btn btn-sm" href="#/citas">Agenda</a>' });
  } });
  app.contribute('settings', { title: 'Agenda', fields: [{ name: 'slots', label: 'Horas disponibles (separadas por coma)', wide: true }, { name: 'bookingDays', label: 'Días hacia adelante para reservar', type: 'number', min: 1, max: 60 }] });

  // ---------- Sitio: reservar hora sin cuenta ----------
  app.contribute('site:nav', { label: 'Agendar hora', href: '#/agendar' }, { slot: 'nav' });
  app.contribute('site:home', { order: 30, render: () => `<section class="section band"><div class="container grid-2" style="align-items:center"><div data-anim><span class="eyebrow">Agenda online</span><h2>Reserva tu hora en un minuto</h2><p class="muted">Elige el servicio, el día y la hora. Te confirmamos por teléfono o WhatsApp.</p></div><div><a class="btn btn-primary btn-lg" href="#/agendar">Agendar hora</a></div></div></section>` });
  app.contribute('site:routes', { path: '/agendar', render: (view, { query, user }) => {
    const svcs = db.query('services', s => s.active);
    const days = +app.settings().bookingDays || 14;
    const me = user?.customerId && db.get('customers', user.customerId);
    view.innerHTML = `<section class="section"><div class="container stack" style="max-width:760px"><h1>Agendar hora</h1>
      <form class="card k-form" novalidate data-book>
        <div class="field"><label for="ag-s">Servicio</label><select class="select" id="ag-s" name="serviceId">${svcs.map(s => `<option value="${escape(s.id)}" ${query.s === s.id ? 'selected' : ''}>${escape(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ag-d">Día</label><input class="input" id="ag-d" name="date" type="date" min="${plus(1)}" max="${plus(days)}" value="${plus(1)}" required></div>
        <div class="field"><label for="ag-t">Hora</label><select class="select" id="ag-t" name="time">${slots().map(s => `<option>${escape(s)}</option>`).join('')}</select></div>
        <div class="field"><label for="ag-n">Nombre</label><input class="input" id="ag-n" name="name" required value="${escape(me?.name || '')}"></div>
        <div class="field"><label for="ag-p">Teléfono</label><input class="input" id="ag-p" name="phone" type="tel" required value="${escape(me?.phone || '')}"></div>
        <div class="field"><label for="ag-e">Correo</label><input class="input" id="ag-e" name="email" type="email" value="${escape(me?.email || '')}"></div>
        <div class="field"><label for="ag-pl">Patente</label><input class="input" id="ag-pl" name="plate" placeholder="ABCD-12"></div>
        <div class="field"><label for="ag-c">Marca y modelo</label><input class="input" id="ag-c" name="car" placeholder="Toyota Yaris 2018"></div>
        <div class="field k-wide"><label for="ag-no">¿Qué le pasa a tu auto?</label><textarea class="textarea" id="ag-no" name="notes"></textarea></div>
        <div class="k-wide row"><button class="btn btn-primary btn-lg">Solicitar hora</button><small class="muted">Al enviar aceptas la <a href="#/privacidad">política de privacidad</a>.</small></div>
      </form><div data-ok></div></div></section>`;
    view.querySelector('[data-book]').onsubmit = e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target));
      if (v.name.trim().length < 2 || v.phone.trim().length < 8 || !v.date) return toast('Completa nombre, teléfono y día', 'warning');
      if (db.count('appointments', a => a.date === v.date && a.time === v.time && a.status !== 'cancelada') >= 2) return toast('Esa hora ya está tomada, elige otra', 'warning');
      // Código aleatorio: un visitante anónimo no puede leer ni escribir el correlativo (RLS).
      const code = 'CITA-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      const p = normPlate(v.plate);
      db.insert('appointments', { ...v, plate: p.length > 4 ? p.slice(0, -2) + '-' + p.slice(-2) : p, code, customerId: me?.id || '', status: 'solicitada' });
      db.log('cita', `${code}: ${v.name} pidió hora para el ${v.date} ${v.time}`, user?.id || null);
      e.target.hidden = true;
      view.querySelector('[data-ok]').innerHTML = card(`¡Listo! Tu código es ${code}`, `<p>Pediste hora para el <b>${escape(v.date)}</b> a las <b>${escape(v.time)}</b>. Te contactaremos para confirmarla.</p><a class="btn" href="#/">Volver al inicio</a>`);
    };
    return { refresh() {} }; // no repintar con los cambios de datos (se perdería el comprobante)
  } });

  // ---------- Portal ----------
  if (app.has('portal')) {
    const mine = resource(app, {
      collection: 'appointments', id: 'mis-citas', singular: 'cita', plural: 'Mis citas', feminine: true, icon: '📅',
      title: a => `${a.date} ${a.time}`, subtitle: a => a.car,
      fields: fields.filter(f => ['date', 'time', 'plate', 'car', 'serviceId', 'notes', 'status'].includes(f.name)),
      rows: ctx => db.query('appointments', a => a.customerId === ctx.user?.customerId),
      defaults: ctx => { const c = db.get('customers', ctx?.user?.customerId) || {}; return { customerId: c.id, name: c.name, phone: c.phone, email: c.email }; },
      beforeSave: (v, row, ctx) => (row ? v : { ...v, ...((() => { const c = db.get('customers', ctx?.user?.customerId) || {}; return { customerId: c.id, name: c.name, phone: c.phone || '', email: c.email || '' }; })()), code: 'CITA-' + Math.random().toString(36).slice(2, 7).toUpperCase(), status: 'solicitada' }),
      permissions: { create: ['cliente'], edit: false, delete: false }, csv: false
    });
    app.contribute('portal.html', mine.section({ roles: ['cliente'] }), { slot: 'portal' });
  }
}
