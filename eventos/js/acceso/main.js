// App móvil de control de acceso: elegir evento, escanear (escribir/pegar código), pantalla grande de resultado.
import { db, auth, HOME_BY_ROLE } from '../data/db.js';
import { html, raw, $, toast, time, escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { LOGO, fmtDay, fmtHour } from '../shared/format.js';
import { scan, venueOf, isPast } from '../shared/inventory.js';
import { seatInfo } from '../shared/venue.js';

let user;
// Sin sesión o sin rol: redirige al login y detiene el módulo sin lanzar errores.
try { user = auth.require(['staff', 'productor', 'admin'], 'login.html'); } catch (e) { await new Promise(() => {}); }
const app = $('#app');
const evKey = 'vlc:accEvent';
const events = () => db.query('events', e => ['publicado', 'finalizado'].includes(e.status) && (user.role !== 'productor' || e.organizerId === user.organizerId) && Date.parse(e.date) > Date.now() - 3 * 864e5)
  .sort((a, b) => a.date.localeCompare(b.date));
let eventId = sessionStorage.getItem(evKey);
if (!events().some(e => e.id === eventId)) eventId = events().find(e => !isPast(e))?.id || events()[0]?.id;

function render() {
  const list = events(), ev = db.get('events', eventId);
  const tk = ev ? db.query('tickets', t => t.eventId === ev.id && t.status !== 'anulado') : [];
  const used = tk.filter(t => t.status === 'usado').length;
  const hist = db.query('scans', s => s.eventId === eventId).slice(0, 8);
  app.innerHTML = html`<div class="acc-head"><a class="brand" href="${HOME_BY_ROLE[user.role]}"><span class="logo">${raw(LOGO)}</span><span>Acceso</span></a>
      <span class="row" style="gap:8px"><span class="avatar" style="--av:${user.color};--size:32px" title="${user.name}">${initials(user.name)}</span><button class="btn btn-sm btn-ghost" id="out">Salir</button></span></div>
    <div class="field"><label for="ev">Evento</label><select class="select" id="ev">${list.map(e => raw(html`<option value="${e.id}" ${e.id === eventId ? 'selected' : ''}>${fmtDay(e.date)} · ${e.title}</option>`))}</select></div>
    ${ev ? raw(html`<p class="muted small" style="margin:-6px 0 0">${venueOf(ev).name} · puertas ${fmtHour(new Date(Date.parse(ev.date) - 90 * 6e4))} · inicio ${fmtHour(ev.date)}</p>
    <div class="acc-counter"><div class="card"><b id="cIn">${used}</b><small>Ingresados</small></div><div class="card"><b>${tk.length - used}</b><small>Por ingresar</small></div><div class="card"><b>${tk.length ? Math.round(used / tk.length * 100) : 0}%</b><small>Asistencia</small></div></div>
    <div class="progress"><i style="--v:${tk.length ? used / tk.length * 100 : 0}%"></i></div>
    <div class="viewfinder" aria-hidden="true"><div class="laser"></div><span>Apunta al código QR o escribe el código</span></div>
    <form class="stack" id="f" autocomplete="off"><label class="sr-only" for="code">Código de la entrada</label>
      <input class="input acc-input" id="code" placeholder="VLC-XXXX-XXXX" autocapitalize="characters" spellcheck="false" inputmode="text">
      <div class="grid-2" style="gap:8px"><button class="btn btn-primary btn-lg">Validar</button><button type="button" class="btn btn-lg" id="paste">📋 Pegar</button></div>
      <div class="grid-2" style="gap:8px"><button type="button" class="btn btn-sm" id="simOk">🎲 Simular válida</button><button type="button" class="btn btn-sm" id="simBad">🎲 Simular usada/inválida</button></div>
    </form>
    <div><h3 style="font-size:16px">Últimos escaneos</h3>${hist.length ? raw(`<ul class="scan-hist">${hist.map(s => `<li><span><code>${escape(s.code)}</code><br><small class="muted">${time(s.createdAt)} · ${escape(s.reason || '')}</small></span><span class="badge ${s.result === 'valid' ? 'badge-success' : s.result === 'used' ? 'badge-warning' : 'badge-danger'}">${s.result === 'valid' ? 'Válida' : s.result === 'used' ? 'Usada' : 'Inválida'}</span></li>`).join('')}</ul>`) : raw('<p class="muted small">Aún no hay escaneos en este evento.</p>')}</div>`) : raw('<div class="empty">No hay eventos para controlar.</div>')}`;
  $('#out').onclick = () => { auth.logout(); location.href = 'login.html'; };
  $('#ev')?.addEventListener('change', e => { eventId = e.target.value; sessionStorage.setItem(evKey, eventId); render(); });
  $('#f')?.addEventListener('submit', e => { e.preventDefault(); validate($('#code').value); });
  $('#paste')?.addEventListener('click', async () => { try { $('#code').value = (await navigator.clipboard.readText()).trim(); validate($('#code').value); } catch (err) { toast('No se pudo leer el portapapeles. Pega el código manualmente.', 'warning'); $('#code').focus(); } });
  $('#simOk')?.addEventListener('click', () => { const t = db.query('tickets', x => x.eventId === eventId && (x.status === 'valido' || x.status === 'reventa')); if (!t.length) return toast('No quedan entradas sin ingresar', 'warning'); validate(t[Math.floor(Math.random() * t.length)].code); });
  $('#simBad')?.addEventListener('click', () => { const t = db.query('tickets', x => x.eventId === eventId && x.status === 'usado'); validate(Math.random() < .5 && t.length ? t[0].code : 'VLC-FAKE-' + Math.floor(1000 + Math.random() * 8999)); });
}

function validate(raw0) {
  const code = String(raw0 || '').trim().toUpperCase();
  if (!code) return toast('Ingresa un código', 'warning');
  const r = scan(code, eventId, user);
  if (r.result !== 'valid') db.insert('scans', { eventId, code, result: r.result, reason: r.reason, by: user.id });
  else { const s = db.find('scans', x => x.ticketId === r.ticket.id); if (s) db.update('scans', s.id, { result: 'valid', reason: 'Ingreso OK' }); }
  const t = r.ticket, ev = t && db.get('events', t.eventId), owner = t && db.get('users', t.ownerId);
  const tier = t && ev?.tiers.find(x => x.id === t.tierId);
  const place = t?.seat ? seatInfo(venueOf(ev), t.seat)?.label : 'General';
  const ui = { valid: ['✓', 'Válida', 'Bienvenido/a'], used: ['!', 'Ya usada', r.reason + (t?.scannedAt ? ' a las ' + time(t.scannedAt) : '')], invalid: ['✕', 'Inválida', r.reason] }[r.result];
  const ov = document.createElement('div');
  ov.className = `scan-result ${r.result}`; ov.setAttribute('role', 'alert');
  ov.innerHTML = `<div><div class="ico">${ui[0]}</div><div class="big">${ui[1]}</div><p>${escape(ui[2])}</p>${t && r.result !== 'invalid' ? `<div class="who"><b>${escape(owner?.name || '')}</b><br>${escape(tier?.name || '')} · ${escape(place || '')}<br><small>${escape(t.code)}</small></div>` : ''}<p style="opacity:.8;font-size:14px;margin-top:20px">Toca para continuar</p></div>`;
  document.body.appendChild(ov);
  try { navigator.vibrate?.(r.result === 'valid' ? 80 : [80, 60, 80]); } catch (e) { /* */ }
  const close = () => { ov.remove(); $('#code') && ($('#code').value = '', $('#code').focus()); };
  ov.addEventListener('click', close);
  setTimeout(close, r.result === 'valid' ? 1800 : 3200);
}

let t;
db.subscribe(() => { clearTimeout(t); t = setTimeout(() => { if (!document.activeElement || document.activeElement.id !== 'code') render(); else { const n = db.count('tickets', x => x.eventId === eventId && x.status === 'usado'); const c = $('#cIn'); if (c) c.textContent = n; } }, 120); });
render();
