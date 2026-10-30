// Ficha de propiedad: galería, características, plano, calculadora hipotecaria, mapa, similares, visita y contacto.
import { escape, toast, money, num, date } from '../../../assets/core/ui.js';
import { db, auth, uf, settings, notify } from '../data/db.js';
import { comunaName, comunaById } from '../shared/geo.js';
import { OPS, TYPES, PSTATUS, badge, mainPrice, altPrice, toUF, toCLP, ufM2, fmtUF, dividend, specs } from '../shared/format.js';
import { propertyArt, floorPlan, comunaMap, scenesFor, sceneLabels, icon } from '../shared/art.js';
import { propertyCard, isFav, toggleFav, compareList, V } from './cards.js';

const SLOTS = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const seen = new Set();

export function renderProperty(id) {
  const view = V(), U = uf(), s = settings();
  const p = db.get('properties', id);
  if (!p || !['publicada', 'reservada', 'vendida', 'arrendada'].includes(p.status)) {
    const u = auth.current();
    if (!p || !(u && ['admin', 'editor', 'corredor'].includes(u.role))) {
      view.innerHTML = `<section class="section"><div class="container empty"><span class="icon">🔎</span><h1>Esta propiedad no está disponible</h1><p>Puede que haya sido retirada o aún no esté publicada.</p><a class="btn btn-primary" href="#/buscar">Ver otras propiedades</a></div></section>`;
      return;
    }
  }
  if (!seen.has(id)) { seen.add(id); setTimeout(() => db.update('properties', id, { views: (p.views || 0) + 1 }), 0); }
  const agent = db.get('agents', p.agentId) || db.all('agents')[0];
  const scenes = [...scenesFor(p), 'plano'];
  const closed = ['vendida', 'arrendada'].includes(p.status);
  const similar = db.query('properties', x => x.id !== p.id && x.status === 'publicada' && x.op === p.op && x.type === p.type)
    .map(x => ({ x, score: (x.comuna === p.comuna ? 0 : 1) + Math.abs(toUF(x, U) - toUF(p, U)) / Math.max(1, toUF(p, U)) })).sort((a, b) => a.score - b.score).slice(0, 3).map(o => o.x);
  const comunaAvg = (() => { const ps = db.query('properties', x => x.comuna === p.comuna && x.op === p.op && x.type !== 'terreno' && x.m2); return ps.length ? ps.reduce((a, x) => a + ufM2(x, U), 0) / ps.length : 0; })();
  const fav = isFav(p.id), cmp = compareList().includes(p.id);
  const u = auth.current();

  view.innerHTML = `<section class="section" style="padding-top:24px"><div class="container">
    <div class="crumbs"><a href="#/">Inicio</a> / <a href="#/buscar?op=${p.op}">${OPS[p.op]}</a> / <a href="#/buscar?op=${p.op}&comuna=${p.comuna}">${escape(comunaName(p.comuna))}</a> / <span>${escape(p.code)}</span></div>
    ${p.status !== 'publicada' ? `<div class="banner tone-${closed ? 'warning' : 'info'}" style="margin-bottom:14px"><div><h3>${closed ? `Esta propiedad ya fue ${p.status}` : p.status === 'reservada' ? 'Propiedad reservada' : 'Vista previa interna'}</h3><p>${closed ? 'Te mostramos opciones similares más abajo.' : p.status === 'reservada' ? 'Puedes dejar tus datos por si la reserva no se concreta.' : 'Solo visible para el equipo: estado ' + escape(PSTATUS[p.status][0])}</p></div></div>` : ''}
    <div class="detail-layout">
      <div class="stack" style="gap:22px">
        <div class="gallery" data-gallery>
          <div class="gallery-main" data-main></div>
          <div class="thumbs">${scenes.map((sc, i) => `<button data-i="${i}" aria-label="${sceneLabels[sc]}" class="${sc === 'plano' ? 'plan-thumb' : ''}">${sc === 'plano' ? 'Plano' : propertyArt(p, sc, { label: false })}</button>`).join('')}</div>
        </div>
        <div>
          <div class="title-row">
            <div style="min-width:0;flex:1 1 320px"><div class="row" style="gap:6px;margin-bottom:8px"><span class="badge badge-primary">${OPS[p.op]}</span><span class="badge">${TYPES[p.type]}</span>${p.status !== 'publicada' ? badge(PSTATUS, p.status) : ''}<span class="badge plain">Código ${escape(p.code)}</span></div>
              <h1>${escape(p.title)}</h1><span class="loc">${icon('pin', 15)} ${escape(p.address)}, ${escape(comunaName(p.comuna))}</span></div>
            <div class="big-price"><div class="price">${mainPrice(p)}</div><div class="price-alt">${altPrice(p, U)}</div>${p.expenses ? `<div class="muted small">Gastos comunes ${money(p.expenses)}</div>` : ''}</div>
          </div>
          <div class="row" style="gap:8px">
            <button class="btn btn-sm ${fav ? 'btn-primary' : ''}" data-fav2>${icon('heart', 16)} ${fav ? 'En favoritos' : 'Guardar'}</button>
            <button class="btn btn-sm ${cmp ? 'btn-primary' : ''}" data-cmp="${p.id}">${icon('compare', 16)} Comparar</button>
            <button class="btn btn-sm" data-share>${icon('share', 16)} Compartir</button>
            <span class="muted small">${num(p.views)} visitas a la ficha · publicada ${p.publishedAt ? date(p.publishedAt) : '—'}</span>
          </div>
        </div>
        <div class="spec-grid">
          ${[['Superficie útil', `${num(p.m2)} m²`], ['Superficie total', `${num(p.m2Total)} m²`], p.dorms ? ['Dormitorios', p.dorms] : null, p.baths ? ['Baños', p.baths] : null, ['Estacionamientos', p.parking || '—'], p.type === 'departamento' ? ['Bodega', p.storage ? 'Sí' : 'No'] : null,
            p.floor ? ['Piso', p.floor] : null, p.year ? ['Año construcción', p.year] : null, ['Orientación', p.orientation], p.op === 'venta' ? ['UF por m²', fmtUF(ufM2(p, U), true)] : ['Valor por m²', money(toCLP(p, U) / p.m2)]]
            .filter(Boolean).map(([k, v]) => `<div class="spec"><small>${k}</small><b>${escape(v)}</b></div>`).join('')}
        </div>
        <div class="card"><h3>Descripción</h3><p>${escape(p.description)}</p><h3 style="margin-top:18px">Características</h3><div class="feature-list">${p.features.map(f => `<span class="chip">${icon('check', 14)} ${escape(f)}</span>`).join('')}</div></div>
        <div class="card"><div class="row between"><h3 style="margin:0">Plano</h3><span class="muted small">${specs(p)}</span></div><div class="plan-box" style="margin-top:12px">${floorPlan(p)}</div></div>
        ${p.op === 'venta' ? `<div class="card" data-calc><h3>Calculadora de crédito hipotecario</h3><p class="muted small">Simulación referencial en UF. Valor UF ${money(U)} (${escape(s.ufDate || '')}).</p>
          <div class="grid-3">
            <div class="field"><label for="c-price">Valor propiedad (UF)</label><input class="input" id="c-price" type="number" value="${Math.round(toUF(p, U))}" min="0"></div>
            <div class="field"><label for="c-rate">Tasa anual (%)</label><input class="input" id="c-rate" type="number" step="0.01" value="${s.rate || 4.39}" min="0"></div>
            <div class="field"><label for="c-years">Plazo (años)</label><select class="select" id="c-years">${[15, 20, 25, 30].map(y => `<option ${y == (s.years || 25) ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
          </div>
          <div class="field" style="margin-top:12px"><div class="range-row"><label for="c-pie">Pie</label><b data-pie-l></b></div><input type="range" id="c-pie" min="10" max="50" step="5" value="${s.downPct || 20}"></div>
          <div class="calc-out" style="margin-top:14px" data-out></div>
          <p class="muted small" style="margin:10px 0 0">Renta líquida sugerida: el dividendo no debería superar el 25% de tus ingresos.</p></div>` : `<div class="card"><h3>Requisitos de arriendo</h3><ul><li>Renta líquida mínima de ${money(p.price * 3)} (3 veces el arriendo).</li><li>Mes de garantía (${money(p.price)}) y primer mes por adelantado.</li><li>Aval o seguro de arriendo, contrato ante notario.</li><li>Costo total de entrada: <b>${money(p.price * 2 + p.price * .5)}</b> (incluye comisión 50%).</li></ul></div>`}
        <div class="card"><div class="row between"><h3 style="margin:0">Ubicación</h3><span class="muted small">Precio promedio en ${escape(comunaName(p.comuna))}: ${p.op === 'venta' ? fmtUF(comunaAvg, true) + '/m²' : money(comunaAvg * U) + '/m²'}</span></div>
          <div class="map-box" style="margin-top:12px">${comunaMap({ highlight: p.comuna, pins: [{ id: p.id, x: p.x, y: p.y, label: comunaName(p.comuna), active: true }], compact: true, labels: true })}</div>
          <p class="muted small" style="margin:8px 0 0">Ubicación aproximada para proteger la privacidad del propietario.</p></div>
      </div>

      <aside class="detail-aside">
        <div class="card stack" style="gap:12px">
          <div class="agent-card"><span class="avatar" style="--av:${escape(agent.color)};--size:52px">${escape(agent.name.split(' ').map(w => w[0]).join(''))}</span><div><b>${escape(agent.name)}</b><div class="muted small">${escape(db.get('offices', agent.officeId)?.name || '')}</div><div class="small">${icon('star', 14)} ${agent.rating} · ${escape(agent.bio)}</div></div></div>
          <div class="row" style="gap:8px"><a class="btn btn-sm" href="tel:${escape(agent.phone)}">${icon('phone', 16)} Llamar</a><a class="btn btn-sm" href="mailto:${escape(agent.email)}?subject=${encodeURIComponent(p.code + ' · ' + p.title)}">${icon('mail', 16)} Correo</a></div>
        </div>
        ${closed ? '' : `<div class="card"><div class="tabs" role="tablist"><button class="tab active" data-tab="visit" role="tab" aria-selected="true">${icon('calendar', 16)} Agendar visita</button><button class="tab" data-tab="contact" role="tab" aria-selected="false">${icon('mail', 16)} Contactar</button></div>
          <form class="stack" data-form="visit" style="margin-top:14px;gap:12px">
            <div><span class="label">Elige un día</span><div class="days" data-days></div></div>
            <div><span class="label">Horario disponible</span><div class="slots" data-slots></div></div>
            ${contactFields(u)}
            <button class="btn btn-primary btn-block" type="submit">Solicitar visita</button>
          </form>
          <form class="stack" data-form="contact" style="margin-top:14px;gap:12px" hidden>
            ${contactFields(u, 'c')}
            <div class="field"><label for="c-msg">Mensaje</label><textarea class="textarea" id="c-msg" name="message">Hola, me interesa ${escape(p.title)} (${escape(p.code)}). ¿Sigue disponible?</textarea></div>
            <button class="btn btn-primary btn-block" type="submit">Enviar mensaje</button>
          </form></div>`}
      </aside>
    </div>
    ${similar.length ? `<div class="stack" style="margin-top:40px"><h2 style="margin:0">Propiedades similares</h2><div class="prop-grid">${similar.map(propertyCard).join('')}</div></div>` : ''}
  </div></section>`;

  // Galería
  let gi = 0;
  const main = view.querySelector('[data-main]');
  const showImg = i => {
    gi = (i + scenes.length) % scenes.length; const sc = scenes[gi];
    main.innerHTML = `${sc === 'plano' ? `<div class="plan-box" style="height:100%;display:grid;place-items:center;border:0">${floorPlan(p)}</div>` : propertyArt(p, sc)}
      <button class="round-btn nav prev" data-g="-1" aria-label="Anterior">${icon('chevL')}</button><button class="round-btn nav next" data-g="1" aria-label="Siguiente">${icon('chevR')}</button><span class="badge count plain">${gi + 1} / ${scenes.length}</span>`;
    view.querySelectorAll('.thumbs button').forEach((b, k) => b.classList.toggle('active', k === gi));
  };
  showImg(0);
  view.querySelector('[data-gallery]').addEventListener('click', e => { const g = e.target.closest('[data-g]'); if (g) showImg(gi + +g.dataset.g); const t = e.target.closest('[data-i]'); if (t) showImg(+t.dataset.i); });
  view.querySelector('[data-gallery]').addEventListener('keydown', e => { if (e.key === 'ArrowRight') showImg(gi + 1); if (e.key === 'ArrowLeft') showImg(gi - 1); });

  view.querySelector('[data-fav2]').onclick = () => { if (toggleFav(p.id) !== null) renderProperty(id); };
  view.querySelector('[data-share]').onclick = async () => { try { await navigator.clipboard.writeText(location.href); toast('Enlace copiado', 'success'); } catch (e) { toast('Copia la dirección de la barra del navegador', 'info'); } };

  // Calculadora
  const calc = view.querySelector('[data-calc]');
  if (calc) {
    const upd = () => {
      const price = +calc.querySelector('#c-price').value || 0, rate = +calc.querySelector('#c-rate').value || 0, years = +calc.querySelector('#c-years').value, pie = +calc.querySelector('#c-pie').value;
      const d = dividend(price, pie, rate, years);
      calc.querySelector('[data-pie-l]').textContent = `${pie}% · ${fmtUF(price * pie / 100)} (${money(price * pie / 100 * U)})`;
      calc.querySelector('[data-out]').innerHTML = `<div class="spec"><small>Dividendo mensual</small><b>${fmtUF(d, true)}</b><small>${money(d * U)} aprox.</small></div>
        <div class="spec"><small>Monto del crédito</small><b>${fmtUF(price * (1 - pie / 100))}</b><small>${years * 12} cuotas</small></div>
        <div class="spec"><small>Renta sugerida</small><b>${money(d * U * 4)}</b><small>Costo total ${fmtUF(d * years * 12)}</small></div>`;
    };
    calc.addEventListener('input', upd); upd();
  }
  if (closed) return;

  // Tabs visita / contacto
  view.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => {
    view.querySelectorAll('[data-tab]').forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
    view.querySelectorAll('[data-form]').forEach(f => { f.hidden = f.dataset.form !== t.dataset.tab; });
  });

  // Agenda de visitas: 14 días hábiles con horarios ocupados por otras visitas.
  const days = [];
  for (let d = 1; days.length < 12; d++) { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(0, 0, 0, 0); if (x.getDay() !== 0) days.push(x); }
  let day = days[0], slot = null;
  const taken = k => db.query('visits', v => v.propertyId === p.id && v.status !== 'cancelada' && localKey(new Date(v.date)) === k).map(v => new Date(v.date).toTimeString().slice(0, 5));
  const drawSlots = () => {
    view.querySelector('[data-days]').innerHTML = days.map((d, i) => `<button type="button" class="day-btn ${d === day ? 'active' : ''}" data-day="${i}"><small>${d.toLocaleDateString('es-CL', { weekday: 'short' })}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('es-CL', { month: 'short' })}</small></button>`).join('');
    const busy = taken(localKey(day));
    const slots = day.getDay() === 6 ? SLOTS.slice(0, 4) : SLOTS;
    view.querySelector('[data-slots]').innerHTML = slots.map(s => `<button type="button" class="slot ${s === slot ? 'active' : ''}" data-slot="${s}" ${busy.includes(s) ? 'disabled title="Ocupado"' : ''}>${s}</button>`).join('');
  };
  drawSlots();
  const vf = view.querySelector('[data-form="visit"]');
  vf.addEventListener('click', e => {
    const d = e.target.closest('[data-day]'); if (d) { day = days[+d.dataset.day]; slot = null; drawSlots(); }
    const s = e.target.closest('[data-slot]'); if (s && !s.disabled) { slot = s.dataset.slot; drawSlots(); }
  });
  vf.addEventListener('submit', e => {
    e.preventDefault();
    const d = readContact(vf); if (!d) return;
    if (!slot) return toast('Elige un horario para la visita', 'warning');
    const [h, m] = slot.split(':'); const when = new Date(day); when.setHours(+h, +m, 0, 0);
    const lead = db.insert('leads', { propertyId: p.id, name: d.name, email: d.email, phone: d.phone, message: `Solicitud de visita para el ${date(when)} a las ${slot}`, source: 'web', status: 'visita', agentId: p.agentId, notes: [], userId: u?.id || null });
    db.insert('visits', { propertyId: p.id, agentId: p.agentId, clientName: d.name, email: d.email, phone: d.phone, leadId: lead.id, date: when.toISOString(), status: 'pendiente', userId: u?.id || null, feedback: '' });
    db.log('visita', `${d.name} agendó visita a ${p.code} (${date(when)} ${slot})`, u?.id);
    const ag = db.get('agents', p.agentId); if (ag?.userId) notify(ag.userId, `Nueva visita solicitada: ${p.code} el ${date(when)} ${slot}`, '#/visitas');
    toast(`Visita solicitada para el ${date(when)} a las ${slot}. El corredor la confirmará.`, 'success', 4500);
    slot = null; drawSlots();
  });
  const cf = view.querySelector('[data-form="contact"]');
  cf.addEventListener('submit', e => {
    e.preventDefault();
    const d = readContact(cf); if (!d) return;
    db.insert('leads', { propertyId: p.id, name: d.name, email: d.email, phone: d.phone, message: cf.elements.message.value.trim(), source: 'web', status: 'nuevo', agentId: p.agentId, notes: [], userId: u?.id || null });
    db.log('lead', `Nuevo contacto de ${d.name} por ${p.code}`, u?.id);
    toast('Mensaje enviado. Te contactaremos pronto.', 'success');
    cf.elements.message.value = '';
  });
}
const localKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function contactFields(u, pre = 'v') {
  return `<div class="field"><label for="${pre}-name">Nombre</label><input class="input" id="${pre}-name" name="name" autocomplete="name" value="${escape(u?.name || '')}" required></div>
    <div class="grid-2" style="gap:8px"><div class="field"><label for="${pre}-email">Correo</label><input class="input" id="${pre}-email" name="email" type="email" autocomplete="email" value="${escape(u?.email || '')}" required></div>
    <div class="field"><label for="${pre}-phone">Teléfono</label><input class="input" id="${pre}-phone" name="phone" type="tel" autocomplete="tel" value="${escape(u?.phone || '')}" placeholder="+56 9…"></div></div>`;
}
function readContact(f) {
  const name = f.elements.name.value.trim(), email = f.elements.email.value.trim(), phone = f.elements.phone.value.trim();
  f.elements.name.classList.toggle('invalid', !name);
  const badMail = !/^\S+@\S+\.\S+$/.test(email);
  f.elements.email.classList.toggle('invalid', badMail);
  if (!name || badMail) { toast('Completa tu nombre y un correo válido', 'warning'); return null; }
  return { name, email, phone };
}
