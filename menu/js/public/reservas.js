// Formulario público de reservas + consulta/cancelación por código.
import { toast, escape, date as fmtDate, sleep } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings } from '../shared/logic.js';
import { isoDay } from '../data/seed.js';
import { tr } from './i18n.js';

const hdr = document.getElementById('hdr');
const view = document.getElementById('view');
const SLOT_CAP = 6;
const ST = { pendiente: ['Pendiente de confirmación', 'warning'], confirmada: ['Confirmada', 'success'], sentada: ['Completada', 'primary'], cancelada: ['Cancelada', 'danger'], 'no-show': ['No asistió', 'danger'] };
const form = { date: '', time: '', party: 2 };

function slotsFor(day) {
  const cfg = settings();
  const h = (cfg.hours || []).find(x => x.day === new Date(day + 'T12:00').getDay());
  if (!h || h.closed || !h.open) return [];
  const toMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
  let start = toMin(h.open), end = toMin(h.close); if (end <= start) end += 1440;
  const out = [];
  for (let m = Math.ceil(start / 30) * 30; m <= end - 90; m += 30) {
    if (m >= 16 * 60 && m < 19 * 60 + 30) continue; // pausa entre servicios
    const hh = Math.floor(m / 60) % 24, mm = m % 60;
    out.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return out;
}
const taken = (day, time) => db.count('reservations', r => r.date === day && r.time === time && ['pendiente', 'confirmada'].includes(r.status));

function header() {
  const cfg = settings();
  hdr.innerHTML = `<div class="container hdr-row"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">🔥</span><span class="brand-name">${escape(cfg.name)}</span></a><span class="grow"></span><a class="btn btn-sm btn-ghost" href="index.html#/carta">Carta</a><a class="btn btn-sm btn-ghost" href="index.html">Inicio</a></div>`;
}

function render() {
  const cfg = settings();
  header();
  const today = isoDay(Date.now());
  if (!form.date) { let d = new Date(); while (!slotsFor(isoDay(d)).length) d = new Date(+d + 864e5); form.date = isoDay(d); }
  const slots = slotsFor(form.date);
  const max = isoDay(Date.now() + 60 * 864e5);
  view.innerHTML = `
  <section class="section hero-sm"><div class="container stack narrow" data-anim>
    <span class="eyebrow">Reservas</span>
    <h1>Reserva tu mesa junto al fogón</h1>
    <p class="lead">${escape(tr(cfg.heroText))}</p>
  </div></section>
  <section class="section" style="padding-top:0"><div class="container res-grid">
    ${cfg.reservationsOpen === false ? `<div class="card stack"><h2>Reservas en pausa</h2><p class="muted">Por ahora no estamos recibiendo reservas en línea. Llámanos al ${escape(cfg.phone)}.</p></div>` : `
    <form class="card stack" id="resForm" novalidate data-anim>
      <h2 style="margin:0">Nueva reserva</h2>
      <div class="grid-2">
        <div class="field"><label for="r-date">Fecha *</label><input class="input" type="date" id="r-date" min="${today}" max="${max}" value="${form.date}" required></div>
        <div class="field"><label for="r-party">Personas *</label><select class="select" id="r-party">${Array.from({ length: cfg.maxParty || 10 }, (_, i) => `<option ${i + 1 === form.party ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
      </div>
      <div class="field"><span class="label">Horario *</span>
        <div class="row chips slots">${slots.length ? slots.map(s => { const full = taken(form.date, s) >= SLOT_CAP; const past = form.date === today && s < new Date().toTimeString().slice(0, 5); return `<button type="button" class="chip ${form.time === s ? 'active' : ''}" data-slot="${s}" ${full || past ? 'disabled' : ''}>${s}${full ? ' · completo' : ''}</button>`; }).join('') : '<span class="muted">Ese día estamos cerrados. Elige otra fecha.</span>'}</div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="r-name">Nombre *</label><input class="input" id="r-name" autocomplete="name" required></div>
        <div class="field"><label for="r-phone">Teléfono *</label><input class="input" id="r-phone" type="tel" autocomplete="tel" placeholder="+56 9 1234 5678" required></div>
        <div class="field"><label for="r-email">Correo *</label><input class="input" id="r-email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="r-zone">Preferencia</label><select class="select" id="r-zone"><option>Sin preferencia</option><option>Salón</option><option>Terraza</option><option>Barra</option></select></div>
      </div>
      <div class="field"><label for="r-notes">Comentarios</label><textarea class="textarea" id="r-notes" placeholder="Alergias, celebración, silla de bebé…"></textarea></div>
      <button class="btn btn-primary btn-lg">Confirmar reserva</button>
      <small class="muted">Te confirmaremos por correo. Tolerancia de 15 minutos.</small>
    </form>`}
    <div class="stack">
      <form class="card stack" id="lookup" data-anim data-anim-delay="120">
        <h3 style="margin:0">¿Ya reservaste?</h3>
        <p class="muted small" style="margin:0">Consulta o cancela con tu código y correo.</p>
        <div class="field"><label for="l-code">Código</label><input class="input" id="l-code" placeholder="FA-0000"></div>
        <div class="field"><label for="l-email">Correo</label><input class="input" id="l-email" type="email"></div>
        <button class="btn">Buscar reserva</button>
        <div id="lookupOut"></div>
      </form>
      <div class="card stack small" data-anim data-anim-delay="200">
        <b>📍 ${escape(cfg.address)}</b><span>📞 ${escape(cfg.phone)}</span><span>✉️ ${escape(cfg.email)}</span>
      </div>
    </div>
  </div></section>`;
  const f = view.querySelector('#resForm');
  if (f) {
    f.querySelector('#r-date').onchange = e => { form.date = e.target.value; form.time = ''; render(); };
    f.querySelector('#r-party').onchange = e => { form.party = +e.target.value; };
    f.querySelector('.slots').onclick = e => { const b = e.target.closest('[data-slot]'); if (!b) return; form.time = b.dataset.slot; f.querySelectorAll('[data-slot]').forEach(x => x.classList.toggle('active', x === b)); };
    f.onsubmit = async e => {
      e.preventDefault();
      const v = id => f.querySelector(id).value.trim();
      let ok = true;
      ['#r-name', '#r-phone', '#r-email'].forEach(id => { const bad = !v(id) || (id === '#r-email' && !/^\S+@\S+\.\S+$/.test(v(id))); f.querySelector(id).classList.toggle('invalid', bad); if (bad) ok = false; });
      if (!form.time) { toast('Elige un horario', 'warning'); return; }
      if (!ok) { toast('Revisa los campos marcados', 'warning'); return; }
      const btn = f.querySelector('button.btn-primary'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Reservando…';
      await sleep(700);
      const code = 'FA-' + (4000 + db.count('reservations') + Math.floor(Math.random() * 900));
      const r = db.insert('reservations', { code, name: v('#r-name'), phone: v('#r-phone'), email: v('#r-email'), date: form.date, time: form.time, party: form.party, zone: v('#r-zone'), notes: v('#r-notes'), status: 'pendiente', tableId: '', source: 'web' });
      db.log('reserva', `Nueva reserva web ${code}: ${r.name}, ${r.party} pers., ${r.date} ${r.time}`);
      form.time = '';
      view.querySelector('.res-grid').firstElementChild.outerHTML = `<div class="card stack center-text" data-anim="bounceIn"><span class="big-emoji">🎉</span><h2 style="margin:0">¡Reserva recibida!</h2>
        <p>Tu código es <b class="code">${escape(code)}</b></p><p class="muted">${escape(fmtDate(r.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))} a las ${escape(r.time)} · ${r.party} personas</p>
        <p class="small muted">Estado: <span class="badge badge-warning">Pendiente de confirmación</span>. Puedes consultarla con tu código.</p><button class="btn" id="again">Hacer otra reserva</button></div>`;
      view.querySelector('#again').onclick = render;
      toast('Reserva enviada', 'success');
    };
  }
  view.querySelector('#lookup').onsubmit = e => { e.preventDefault(); showLookup(); };
}

function showLookup() {
  const code = view.querySelector('#l-code').value.trim().toUpperCase();
  const email = view.querySelector('#l-email').value.trim().toLowerCase();
  const out = view.querySelector('#lookupOut');
  const r = db.find('reservations', x => x.code.toUpperCase() === code && x.email.toLowerCase() === email);
  if (!r) { out.innerHTML = '<p class="callout small">No encontramos una reserva con esos datos.</p>'; return; }
  const [lab, b] = ST[r.status] || [r.status, 'info'];
  const canCancel = ['pendiente', 'confirmada'].includes(r.status) && r.date >= isoDay(Date.now());
  out.innerHTML = `<div class="stack small" style="gap:6px"><b>${escape(r.name)} · ${r.party} personas</b><span>${escape(fmtDate(r.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${escape(r.time)}</span><span class="badge badge-${b}">${escape(lab)}</span>${canCancel ? '<button type="button" class="btn btn-danger btn-sm" id="cancelRes">Cancelar reserva</button>' : ''}</div>`;
  out.querySelector('#cancelRes')?.addEventListener('click', () => {
    db.update('reservations', r.id, { status: 'cancelada' });
    db.log('reserva', `Reserva ${r.code} cancelada por el cliente`);
    toast('Reserva cancelada', 'success');
    showLookup();
  });
}

db.subscribe(c => { if (c?.type === 'value' || c?.type === 'reset' || c?.type === 'sync') render(); });
render();
