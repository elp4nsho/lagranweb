// Mi turno: validación rápida de código, visitas esperadas hoy, personas dentro y encomiendas por entregar.
import { escape, time, ago, toast } from '../../../assets/core/ui.js';
import { unitName, notify } from '../data/db.js';
import { pageHead, kpi } from '../shared/kit.js';

export function checkIn(db, user, v, extra = {}) {
  db.update('visitors', v.id, { status: 'dentro', inAt: new Date().toISOString(), by: user.name, ...extra });
  notify(v.unitId, `Tu visita ${v.name} ingresó a las ${time(new Date())}`, '#/visitas');
  db.log('visita', `Ingreso de ${v.name} a ${unitName(v.unitId)} registrado por ${user.name}`, user.id);
}
export function checkOut(db, user, v) {
  db.update('visitors', v.id, { status: 'salio', outAt: new Date().toISOString() });
  db.log('visita', `Salida de ${v.name} (${unitName(v.unitId)})`, user.id);
}

export function renderDesk(el, p, q, ctx) {
  const { db, user } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const expected = db.query('visitors', v => v.status === 'esperada' && v.date === today);
  const inside = db.query('visitors', v => v.status === 'dentro');
  const parcels = db.query('parcels', x => x.status === 'conserjeria');
  const shift = db.find('shifts', s => s.date === today && db.get('staff', s.staffId)?.userId === user.id);
  const novedades = db.query('logbook', l => l.at.slice(0, 10) === today);
  el.innerHTML = `${pageHead(`Turno de ${user.name.split(' ')[0]}`, `${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}${shift ? ` · turno ${{ M: 'mañana (07–15 h)', T: 'tarde (15–23 h)', N: 'noche (23–07 h)' }[shift.shift]}` : ''}`)}
    <div class="kpis">${kpi('Visitas esperadas hoy', expected.length)}${kpi('Visitas dentro', inside.length)}${kpi('Encomiendas por entregar', parcels.length)}${kpi('Novedades de hoy', novedades.length)}</div>
    <div class="split">
      <form class="card stack" data-code><h3 style="margin:0">Validar código de visita</h3><p class="muted small" style="margin:0">Ingresa el código de 6 caracteres que muestra la visita (o escanea su QR).</p>
        <input class="input big-input" name="code" maxlength="6" placeholder="ABC123" autocomplete="off" aria-label="Código de acceso"><button class="btn btn-primary btn-lg">Validar e ingresar</button><div data-res></div></form>
      <div class="card"><h3>Esperadas hoy</h3>${expected.map(v => `<div class="list-row"><span><b>${escape(v.name)}</b> → ${escape(unitName(v.unitId))}<br><span class="muted small">Código ${escape(v.code)}${v.plate ? ' · ' + escape(v.plate) : ''}${v.note ? ' · ' + escape(v.note) : ''}</span></span><button class="btn btn-sm btn-primary" data-in="${v.id}">Ingresar</button></div>`).join('') || '<p class="muted">Sin visitas pre-autorizadas para hoy.</p>'}</div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="row between"><h3 style="margin:0">Dentro del edificio</h3><a class="btn btn-sm" href="#/visitas?nueva=1">+ Visita sin aviso</a></div>${inside.map(v => `<div class="list-row"><span><b>${escape(v.name)}</b> · ${escape(unitName(v.unitId))}<br><span class="muted small">Entró ${time(v.inAt)} (${ago(v.inAt)})</span></span><button class="btn btn-sm" data-out="${v.id}">Registrar salida</button></div>`).join('') || '<p class="muted">Nadie dentro.</p>'}</div>
      <div class="card"><div class="row between"><h3 style="margin:0">Encomiendas por entregar</h3><a class="btn btn-sm" href="#/encomiendas?nueva=1">+ Recibir</a></div>${parcels.slice(0, 8).map(x => `<div class="list-row"><span><b>${escape(unitName(x.unitId))}</b> · ${escape(x.carrier)}<br><span class="muted small">${escape(x.size)} · ${ago(x.receivedAt)}</span></span><a class="btn btn-sm" href="#/encomiendas">Entregar</a></div>`).join('') || '<p class="muted">Todo entregado.</p>'}</div>
    </div>`;
  const f = el.querySelector('[data-code]');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const code = f.code.value.trim().toUpperCase(), res = f.querySelector('[data-res]');
    const v = db.find('visitors', x => x.code === code && x.preauth);
    if (!v) { res.innerHTML = '<div class="banner tone-warning"><div><h3>Código no válido</h3><p>Verifica el código o contacta al residente.</p></div></div>'; return; }
    if (v.status !== 'esperada') { res.innerHTML = `<div class="banner tone-warning"><div><h3>Código ya utilizado o cancelado</h3><p>${escape(v.name)} · estado: ${escape(v.status)}</p></div></div>`; return; }
    if (v.date !== today) { res.innerHTML = `<div class="banner tone-warning"><div><h3>Código válido para otra fecha</h3><p>${escape(v.name)} está autorizado para el ${escape(v.date)}.</p></div></div>`; return; }
    checkIn(db, user, v); toast(`${v.name} ingresó a ${unitName(v.unitId)}`, 'success'); ctx.refresh();
  });
  el.querySelectorAll('[data-in]').forEach(b => b.onclick = () => { const v = db.get('visitors', b.dataset.in); checkIn(db, user, v); toast(`${v.name} ingresó`, 'success'); ctx.refresh(); });
  el.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { const v = db.get('visitors', b.dataset.out); checkOut(db, user, v); toast(`Salida de ${v.name} registrada`, 'success'); ctx.refresh(); });
}
