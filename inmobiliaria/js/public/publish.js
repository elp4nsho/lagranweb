// Formulario "Publica tu propiedad" en pasos. Crea la ficha en estado "revisión" para aprobación del admin.
import { escape, toast, money } from '../../../assets/core/ui.js';
import { db, auth, uf, notify } from '../data/db.js';
import { COMUNAS, comunaById } from '../shared/geo.js';
import { TYPES, fmtUF } from '../shared/format.js';
import { FEATURES } from '../data/seed.js';
import { propertyArt, icon } from '../shared/art.js';
import { V } from './cards.js';

const STEPS = ['Operación', 'Ubicación', 'Características', 'Precio y fotos', 'Contacto'];
let step = 0, data = {};

export function renderPublish() {
  const view = V(), u = auth.current();
  if (!data._init) data = { _init: true, op: 'venta', type: 'departamento', comuna: 'nunoa', dorms: 2, baths: 1, m2: 60, parking: 1, features: [], unit: 'UF', name: u?.name || '', email: u?.email || '', phone: u?.phone || '' };
  const c = comunaById(data.comuna);
  const suggest = data.op === 'venta' ? fmtUF(Math.round((data.m2 || 0) * c.uf / 50) * 50) : money(Math.round((data.m2 || 0) * c.rent / 10000) * 10000);
  const fld = (name, label, input) => `<div class="field"><label for="pb-${name}">${label}</label>${input}</div>`;
  const num = (name, min = 0) => `<input class="input" id="pb-${name}" name="${name}" type="number" min="${min}" value="${escape(data[name] ?? '')}">`;
  const bodies = [
    `<div class="form-grid">
      ${fld('op', '¿Qué quieres hacer?', `<select class="select" id="pb-op" name="op"><option value="venta" ${data.op === 'venta' ? 'selected' : ''}>Vender</option><option value="arriendo" ${data.op === 'arriendo' ? 'selected' : ''}>Arrendar</option></select>`)}
      ${fld('type', 'Tipo de propiedad', `<select class="select" id="pb-type" name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${data.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
      <div class="full card" style="background:var(--surface-2)"><b>¿Cómo funciona?</b><ol class="small" style="margin:6px 0 0;padding-left:18px"><li>Completas la ficha (5 minutos).</li><li>Nuestro equipo la revisa y valida en menos de 24 h.</li><li>Un corredor te contacta, toma fotos profesionales y la publicamos.</li></ol></div></div>`,
    `<div class="form-grid">
      ${fld('comuna', 'Comuna', `<select class="select" id="pb-comuna" name="comuna">${COMUNAS.slice().sort((a, b) => a.name.localeCompare(b.name)).map(x => `<option value="${x.id}" ${data.comuna === x.id ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select>`)}
      ${fld('address', 'Dirección (calle y número)', `<input class="input" id="pb-address" name="address" value="${escape(data.address || '')}" placeholder="Ej: Av. Irarrázaval 3120, depto 504">`)}
      <p class="full muted small">La dirección exacta no se publica; mostramos una ubicación aproximada.</p></div>`,
    `<div class="form-grid">${fld('m2', 'Superficie útil (m²)', num('m2', 10))}${fld('m2Total', 'Superficie total (m²)', num('m2Total', 10))}
      ${data.type !== 'terreno' ? fld('dorms', 'Dormitorios', num('dorms')) + fld('baths', 'Baños', num('baths')) + fld('parking', 'Estacionamientos', num('parking')) + fld('year', 'Año de construcción', num('year', 1900)) : ''}
      <div class="field full"><span class="label">Características</span><div class="row" style="gap:6px" data-feats>${FEATURES.map(f => `<button type="button" class="chip ${data.features.includes(f) ? 'active' : ''}" aria-pressed="${data.features.includes(f)}" data-f="${escape(f)}">${escape(f)}</button>`).join('')}</div></div></div>`,
    `<div class="form-grid">
      ${fld('price', `Precio (${data.op === 'venta' ? 'UF' : 'CLP mensual'})`, `<input class="input" id="pb-price" name="price" type="number" min="1" value="${escape(data.price || '')}" placeholder="Sugerido: ${suggest}">`)}
      <div class="field"><span class="label">Precio sugerido</span><div class="spec"><b>${suggest}</b><small>Según promedio de ${escape(c.name)} para ${data.m2 || 0} m²</small></div></div>
      ${fld('description', 'Descripción', `<textarea class="textarea" id="pb-description" name="description" placeholder="Luminoso, remodelado, cerca del metro…">${escape(data.description || '')}</textarea>`).replace('class="field"', 'class="field full"')}
      <div class="full upload-zone">${icon('upload', 28)}<p style="margin:6px 0 0"><b>Fotos de la propiedad</b><br><span class="small">En esta demo generamos imágenes de ejemplo. El corredor tomará fotos profesionales.</span></p>
        <div class="thumb-row">${['fachada', 'living', 'cocina', 'dormitorio'].map(s => propertyArt({ art: 1, type: data.type }, s, { label: false })).join('')}</div></div></div>`,
    `<div class="form-grid">${fld('name', 'Nombre completo', `<input class="input" id="pb-name" name="name" autocomplete="name" value="${escape(data.name || '')}">`)}
      ${fld('email', 'Correo', `<input class="input" id="pb-email" name="email" type="email" autocomplete="email" value="${escape(data.email || '')}">`)}
      ${fld('phone', 'Teléfono', `<input class="input" id="pb-phone" name="phone" type="tel" value="${escape(data.phone || '')}">`)}
      ${fld('rut', 'RUT', `<input class="input" id="pb-rut" name="rut" value="${escape(data.rut || '')}" placeholder="12.345.678-9">`)}
      <label class="check full"><input type="checkbox" name="terms" ${data.terms ? 'checked' : ''}> Declaro ser propietario o tener mandato para ofrecer esta propiedad.</label></div>`
  ];
  view.innerHTML = `<section class="section" style="padding-top:32px"><div class="container" style="max-width:860px">
    <span class="eyebrow">Propietarios</span><h1>Publica tu propiedad</h1>
    <div class="steps">${STEPS.map((s, i) => `${i ? '<span class="sep"></span>' : ''}<span class="step ${i <= step ? 'on' : ''}"><i>${i < step ? '✓' : i + 1}</i><span class="hide-sm">${s}</span></span>`).join('')}</div>
    <form class="card stack" data-pub><h3 style="margin:0">${step + 1}. ${STEPS[step]}</h3>${bodies[step]}
      <div class="row between"><button type="button" class="btn btn-ghost" data-back ${step === 0 ? 'disabled' : ''}>← Atrás</button><button class="btn btn-primary" type="submit">${step === STEPS.length - 1 ? 'Enviar a revisión' : 'Continuar →'}</button></div>
    </form></div></section>`;
  const f = view.querySelector('[data-pub]');
  const collect = () => {
    for (const el of f.elements) if (el.name) data[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value.trim();
    if (step === 2) data.features = [...f.querySelectorAll('[data-feats] .chip.active')].map(x => x.dataset.f);
  };
  f.addEventListener('click', e => { const ch = e.target.closest('[data-f]'); if (ch) { ch.classList.toggle('active'); ch.setAttribute('aria-pressed', ch.classList.contains('active')); } });
  f.querySelector('[data-back]').onclick = () => { collect(); step--; renderPublish(); };
  f.addEventListener('change', e => { if (['op', 'type', 'comuna', 'm2'].includes(e.target.name)) { collect(); renderPublish(); } });
  f.addEventListener('submit', e => {
    e.preventDefault(); collect();
    const need = [[1, 'address', 'Ingresa la dirección'], [2, 'm2', 'Ingresa la superficie'], [3, 'price', 'Ingresa el precio'], [4, 'name', 'Ingresa tu nombre']].find(([s, k]) => s === step && !data[k]);
    if (need) { toast(need[2], 'warning'); f.elements[need[1]]?.classList.add('invalid'); return; }
    if (step === 4 && (!/^\S+@\S+\.\S+$/.test(data.email) || !data.terms)) return toast(!data.terms ? 'Debes aceptar la declaración' : 'Correo inválido', 'warning');
    if (step < STEPS.length - 1) { step++; renderPublish(); return; }
    submit(view);
  });
}

function submit(view) {
  const u = auth.current(), c = comunaById(data.comuna);
  let owner = u ? db.find('owners', o => o.userId === u.id) : null;
  owner = owner || db.find('owners', o => o.email.toLowerCase() === data.email.toLowerCase());
  if (!owner) owner = db.insert('owners', { name: data.name, rut: data.rut, email: data.email, phone: data.phone, userId: u?.id || null, notes: 'Registrado desde el formulario web' });
  const agents = db.query('agents', a => a.active);
  const agent = agents.sort((a, b) => db.count('properties', p => p.agentId === a.id && p.status === 'revision') - db.count('properties', p => p.agentId === b.id && p.status === 'revision'))[0];
  const n = db.count('properties');
  const tn = TYPES[data.type];
  const title = data.dorms ? `${tn} ${data.dorms}D${data.baths || 1}B en ${c.name}` : `${tn} ${data.m2} m² en ${c.name}`;
  const now = new Date().toISOString();
  const p = db.insert('properties', {
    code: 'HA-' + (2100 + n * 7 + 3), title, op: data.op, type: data.type, comuna: data.comuna, address: data.address, price: +data.price, currency: data.op === 'venta' ? 'UF' : 'CLP',
    dorms: +data.dorms || 0, baths: +data.baths || (data.type === 'terreno' ? 0 : 1), m2: +data.m2, m2Total: +data.m2Total || +data.m2, parking: +data.parking || 0, storage: 0, year: +data.year || null, floor: null,
    orientation: 'Norte', expenses: 0, features: data.features, status: 'revision', agentId: agent?.id, ownerId: owner.id, featured: false, views: 0,
    description: data.description || `${title}. Publicada por su propietario.`, x: c.x + Math.round(Math.random() * 20 - 10), y: c.y + Math.round(Math.random() * 20 - 10), art: n % 6,
    publishedAt: null, statusAt: now, history: [{ at: now, to: 'revision', by: data.name, note: 'Enviada por el propietario desde el sitio web' }], source: 'web'
  });
  db.log('propiedad', `Nueva propiedad enviada a revisión por ${data.name}: ${p.code}`, u?.id);
  db.query('users', x => x.role === 'admin' && x.active).forEach(a => notify(a.id, `Nueva propiedad por aprobar: ${p.code}`, '#/propiedades?status=revision'));
  if (u) notify(u.id, `Recibimos tu propiedad ${p.code}. Está en revisión.`, '#/cuenta/propiedades');
  view.innerHTML = `<section class="section"><div class="container" style="max-width:720px"><div class="card empty" data-anim="bounceIn"><span class="icon">✅</span><h1>¡Gracias, ${escape(data.name.split(' ')[0])}!</h1>
    <p>Tu propiedad <b>${escape(title)}</b> quedó registrada con el código <b>${escape(p.code)}</b> y está <span class="badge badge-warning">En revisión</span>.</p>
    <p class="muted">Un corredor te contactará en menos de 24 horas. ${u ? 'Puedes seguir el estado en Mi cuenta.' : 'Crea una cuenta con el mismo correo para seguir el estado.'}</p>
    <div class="row" style="justify-content:center">${u ? '<a class="btn btn-primary" href="#/cuenta/propiedades">Ver mis propiedades</a>' : '<a class="btn btn-primary" href="login.html#registro">Crear cuenta</a>'}<a class="btn" href="#/">Volver al inicio</a></div></div></div></section>`;
  step = 0; data = {};
}
