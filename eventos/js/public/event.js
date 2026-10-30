// Página de evento: afiche, cuenta regresiva, lineup, recinto con mapa, precios, reventa y lista de espera.
import { db, auth } from '../data/db.js';
import { html, raw, $, money, toast, modal } from '../../../assets/core/ui.js';
import { poster, venueMap } from '../shared/art.js';
import { catName, CAT_ICON, fmtLong, fmtHour, eventCard } from '../shared/format.js';
import { venueOf, orgOf, eventStats, isSoldOut, tierPrice, isEarly, isPast, buyResale, fees } from '../shared/inventory.js';
import { zoneColor } from '../shared/venue.js';
import { paymentFields, readPayment } from './checkout.js';

export function renderEvent(app, id) {
  const ev = db.get('events', id);
  const u = auth.current();
  const canPreview = u && (u.role === 'admin' || u.role === 'soporte' || (u.role === 'productor' && u.organizerId === ev?.organizerId));
  if (!ev || (!['publicado', 'finalizado'].includes(ev.status) && !canPreview)) {
    app.innerHTML = '<section class="section"><div class="container empty"><span class="icon">🎫</span><h2>Evento no disponible</h2><p>Puede que haya sido retirado o aún no esté publicado.</p><a class="btn btn-primary" href="#/explorar">Ver cartelera</a></div></section>';
    return;
  }
  const v = venueOf(ev), org = orgOf(ev), st = eventStats(ev);
  const sold = isSoldOut(ev), past = isPast(ev) || ev.status === 'finalizado', open = ev.status === 'publicado' && !past;
  const resale = db.query('tickets', t => t.eventId === ev.id && t.status === 'reventa' && t.ownerId !== u?.id);
  const inWait = u && db.find('waitlist', w => w.eventId === ev.id && w.userId === u.id);
  const related = db.query('events', e => e.id !== ev.id && e.status === 'publicado' && !isPast(e) && (e.category === ev.category || e.city === ev.city)).slice(0, 3);

  app.innerHTML = html`
  ${ev.status !== 'publicado' && ev.status !== 'finalizado' ? raw(`<div class="promo-banner">Vista previa · estado: ${ev.status}. Solo visible para el equipo.</div>`) : ''}
  <section class="ev-hero">
    <div class="bg">${raw(poster(ev))}</div><div class="scrim"></div>
    <div class="container" data-anim>
      <div class="row" style="gap:8px;margin-bottom:10px"><span class="badge badge-primary">${CAT_ICON[ev.category]} ${catName(ev.category)}</span>${ev.minAge ? raw(`<span class="badge">+${ev.minAge} años</span>`) : ''}${sold ? raw('<span class="badge badge-danger">Agotado</span>') : ''}${past ? raw('<span class="badge badge-info">Finalizado</span>') : ''}</div>
      <h1>${ev.title}</h1>
      <p style="font-size:17px;margin:0"><b>${fmtLong(ev.date)}</b> · ${fmtHour(ev.date)} hrs · ${v.name}, ${v.city}</p>
    </div>
  </section>
  <section class="section" style="padding-top:28px"><div class="container ev-layout">
    <div class="stack" style="gap:28px">
      ${!past ? raw(`<div data-anim><h3>Faltan</h3><div class="countdown" id="cd"></div></div>`) : ''}
      <div data-anim><h2>Sobre el evento</h2><p>${ev.description}</p><p class="muted small">Organiza: <b>${org?.name || '—'}</b> · Apertura de puertas: ${fmtHour(new Date(Date.parse(ev.date) - 90 * 6e4))} hrs</p></div>
      ${ev.lineup.length ? raw(html`<div data-anim><h2>${ev.category === 'conferencias' ? 'Programa' : ev.category === 'deportes' ? 'Equipos' : 'Lineup'}</h2>
        <ul class="lineup">${ev.lineup.map(l => raw(html`<li><span class="time">${l.time || '—'}</span><div><b>${l.name}</b><br><small class="muted">${l.role}</small></div></li>`))}</ul></div>`) : ''}
      <div data-anim><h2>Recinto</h2>
        <div class="card stack"><div class="row between"><div><b>${v.name}</b><br><span class="muted">${v.address}, ${v.city}</span></div><span class="badge">Capacidad ${v.capacity.toLocaleString('es-CL')}</span></div>
        ${raw(venueMap(v))}
        <div class="row small muted" style="gap:14px"><span>🚇 Transporte público cercano</span><span>♿ Acceso universal</span><span>🅿️ Estacionamiento</span></div></div></div>
      ${resale.length && open ? raw(html`<div data-anim><h2>Reventa oficial</h2><p class="muted">Entradas de otros fans, con precio tope de +${fees().resaleCapPct || 10}% sobre el valor original. La entrada se reemite a tu nombre con un código nuevo.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Ubicación</th><th>Precio</th><th></th></tr></thead><tbody>
        ${resale.map(t => raw(html`<tr><td>${ev.tiers.find(x => x.id === t.tierId)?.name}${t.seat ? ' · ' + t.seat.split('-').slice(1).join(' ') : ''}</td><td><b>${money(t.resalePrice)}</b> <span class="strike">${money(t.price)}</span></td><td><button class="btn btn-sm btn-primary" data-resale="${t.id}">Comprar</button></td></tr>`))}
        </tbody></table></div></div>`) : ''}
    </div>
    <aside class="buy-box card stack" data-anim>
      <h3 style="margin:0">Entradas</h3>
      <div>${ev.tiers.map(t => raw(html`<div class="tier-row"><span><i class="zone-dot" style="--z:${zoneColor(v, t.zone)}"></i> ${t.name}${isEarly(t) ? raw(' <span class="badge badge-success">Preventa</span>') : ''}</span>
        <b>${money(tierPrice(t))}${isEarly(t) ? raw(` <span class="strike">${money(t.price)}</span>`) : ''}</b></div>`))}</div>
      ${open ? raw(`<div class="progress" title="${Math.round(st.pct)}% vendido"><i style="--v:${Math.min(100, st.pct).toFixed(0)}%"></i></div><small class="muted">${st.pct > 80 ? '🔥 ' : ''}${Math.round(st.pct)}% vendido · cargo por servicio ${fees().servicePct}% + ${money(fees().perTicket)} por entrada</small>`) : ''}
      ${past ? raw('<div class="empty" style="padding:16px">Este evento ya se realizó.</div>')
      : !open ? raw('<div class="empty" style="padding:16px">Venta aún no habilitada.</div>')
      : sold ? raw(inWait ? `<div class="badge badge-info plain" style="white-space:normal;padding:10px">Estás en la lista de espera (${inWait.qty} entrada${inWait.qty > 1 ? 's' : ''}). Te avisaremos si se liberan entradas.</div><button class="btn btn-ghost btn-sm" id="leaveWait">Salir de la lista</button>`
        : `<p class="muted" style="margin:0">Entradas agotadas. Únete a la lista de espera y te avisaremos si se liberan por reembolsos.</p><div class="row" style="gap:8px"><select class="select" id="waitQty" style="width:auto" aria-label="Cantidad">${[1, 2, 3, 4].map(n => `<option>${n}</option>`).join('')}</select><button class="btn btn-primary" id="joinWait" style="flex:1">Unirme a la lista de espera</button></div>`)
      : raw(`<a class="btn btn-primary btn-lg btn-block" href="#/evento/${ev.id}/entradas">${v.sections.length ? 'Elegir asientos' : 'Comprar entradas'}</a>`)}
    </aside>
  </div></section>
  ${related.length ? raw(html`<section class="section" style="padding-top:0"><div class="container stack"><h2>También te puede gustar</h2><div class="grid-3">${raw(related.map(eventCard).join(''))}</div></div></section>`) : ''}`;

  // Cuenta regresiva
  let timer;
  const cd = $('#cd');
  if (cd) {
    const tick = () => {
      const s = Math.max(0, (Date.parse(ev.date) - Date.now()) / 1000);
      const parts = [[Math.floor(s / 86400), 'días'], [Math.floor(s / 3600) % 24, 'horas'], [Math.floor(s / 60) % 60, 'min'], [Math.floor(s) % 60, 'seg']];
      cd.innerHTML = parts.map(([n, l]) => `<div><b>${String(n).padStart(2, '0')}</b><small>${l}</small></div>`).join('');
    };
    tick(); timer = setInterval(tick, 1000);
  }
  const needLogin = () => { location.href = `login.html?next=${encodeURIComponent('index.html' + location.hash)}`; };
  $('#joinWait')?.addEventListener('click', () => {
    if (!u) return needLogin();
    db.insert('waitlist', { eventId: ev.id, userId: u.id, name: u.name, email: u.email, qty: +$('#waitQty').value, status: 'esperando' });
    db.log('lista de espera', `${u.name} se unió a la lista de espera de ${ev.title}`, u.id);
    toast('Te uniste a la lista de espera', 'success');
  });
  $('#leaveWait')?.addEventListener('click', () => { db.remove('waitlist', inWait.id); toast('Saliste de la lista de espera'); });
  app.querySelectorAll('[data-resale]').forEach(b => b.addEventListener('click', () => {
    if (!u) return needLogin();
    const t = db.get('tickets', b.dataset.resale);
    const service = Math.round(t.resalePrice * fees().servicePct / 100) + fees().perTicket;
    const m = modal({ title: 'Comprar entrada de reventa', body: `<div class="stack"><div class="sum-row"><span>Entrada</span><b>${money(t.resalePrice)}</b></div><div class="sum-row"><span>Cargo por servicio</span><span>${money(service)}</span></div><div class="sum-row total"><span>Total</span><span>${money(t.resalePrice + service)}</span></div><form class="stack" id="rpay">${paymentFields(u)}</form></div>`,
      foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="rbuy">Pagar</button>' });
    m.el.querySelector('#rbuy').onclick = () => {
      const pay = readPayment(m.el.querySelector('#rpay')); if (!pay) return;
      if (db.get('tickets', t.id).status !== 'reventa') { toast('Esta entrada ya fue vendida', 'error'); m.close(); return; }
      const o = buyResale(t, u, pay); m.close(); toast('¡Compra realizada!', 'success'); location.hash = `#/confirmacion/${o.id}`;
    };
  }));
  return { destroy: () => clearInterval(timer) };
}
