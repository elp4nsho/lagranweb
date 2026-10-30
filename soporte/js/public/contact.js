// Formulario de contacto: sugiere artículos mientras se escribe (desvío) y crea un ticket.
import { db, auth } from '../data/db.js';
import { escape, toast, debounce } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';
import { searchArticles, isEmail } from '../shared/util.js';
import { createTicket } from '../shared/tickets.js';
import { filesOf } from '../shared/forms.js';

let done = null;
export function contact(view) {
  const u = auth.current();
  const cli = u?.role === 'cliente' ? u : null;
  const help = db.getValue('help', {});
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  if (done) {
    const t = db.get('tickets', done);
    view.innerHTML = `<section class="section"><div class="container narrow"><div class="card stack ticket-ok" role="status">
      <span class="ok-ico">✓</span><h2 style="margin:0">Recibimos tu solicitud</h2>
      <p style="margin:0">Tu número de ticket es <b class="mono">#${t?.number}</b>. Te responderemos por correo a <b>${escape(t?.guest?.email || db.get('users', t?.customerId)?.email || '')}</b>.</p>
      ${t?.priority === 'urgente' ? '<p class="badge badge-danger">Marcado como urgente</p>' : ''}
      <div class="row"><a class="btn btn-primary" href="${t?.customerId ? `portal.html#/ticket/${t.id}` : 'login.html?registro=1&next=portal.html'}">${t?.customerId ? 'Ver mi ticket' : 'Crear cuenta para seguirlo'}</a><button class="btn" data-again>Enviar otra consulta</button></div>
    </div></div></section>`;
    view.querySelector('[data-again]').onclick = () => { done = null; contact(view); };
    return;
  }
  view.innerHTML = `<section class="section"><div class="container contact-grid">
    <div class="stack">
      <span class="eyebrow">Contacto</span><h1 style="margin:0">Escríbenos</h1>
      <p class="muted">Cuéntanos qué pasa y te responderemos lo antes posible. Tiempo de primera respuesta habitual: menos de 1 hora.</p>
      <div class="card stack small"><b>${icon('phone', 16)} ${escape(help.phone)}</b><span class="muted">${escape(help.hours)}</span><b>${icon('chat', 16)} WhatsApp ${escape(help.whatsapp)}</b></div>
      <div class="card stack" data-deflect hidden><b>${icon('book', 16)} Quizás esto te ayude</b><div class="stack small" data-deflect-list style="gap:6px"></div></div>
    </div>
    <form class="card stack" data-contact novalidate>
      ${cli ? `<p class="session-box" style="margin:0">Enviando como <b>${escape(cli.name)}</b> (${escape(cli.email)})</p>` : `<div class="grid-2">
        <div class="field"><label for="c-name">Nombre *</label><input class="input" id="c-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="c-email">Correo *</label><input class="input" id="c-email" name="email" type="email" required autocomplete="email"></div></div>`}
      <div class="grid-2">
        <div class="field"><label for="c-cat">Tema *</label><select class="select" id="c-cat" name="categoryId">${cats.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="c-urg">¿Te impide usar el servicio?</label><select class="select" id="c-urg" name="priority"><option value="normal">No, es una consulta</option><option value="alta">Sí, parcialmente</option><option value="urgente">Sí, estoy sin servicio</option></select></div>
      </div>
      <div class="field"><label for="c-subject">Asunto *</label><input class="input" id="c-subject" name="subject" required placeholder="Ej: internet lento en las noches"></div>
      <div class="field"><label for="c-msg">Detalle *</label><textarea class="textarea" id="c-msg" name="body" required placeholder="Incluye tu dirección o RUT del titular y lo que ya intentaste."></textarea></div>
      <label class="attach">${icon('paperclip', 16)} <span data-fname>Adjuntar archivos (fotos, boletas)</span><input type="file" name="files" multiple hidden></label>
      <button class="btn btn-primary btn-lg" type="submit">Enviar solicitud</button>
      <small class="muted">Al enviar aceptas que te contactemos por este caso. Envío simulado: no sale del navegador.</small>
    </form>
  </div></section>`;
  const f = view.querySelector('[data-contact]');
  const showDeflect = debounce(() => {
    const res = searchArticles(`${f.subject.value} ${f.body.value}`, { limit: 3 });
    view.querySelector('[data-deflect]').hidden = !res.length;
    view.querySelector('[data-deflect-list]').innerHTML = res.map(a => `<a href="#/articulo/${a.id}" target="_blank" rel="noopener">${escape(a.title)} →</a>`).join('');
  }, 250);
  f.subject.addEventListener('input', showDeflect);
  f.body.addEventListener('input', showDeflect);
  f.files.onchange = () => { const n = f.files.files.length; f.querySelector('[data-fname]').textContent = n ? `${n} archivo(s): ${filesOf(f.files).map(x => x.name).join(', ')}` : 'Adjuntar archivos'; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const req = ['subject', 'body', ...(cli ? [] : ['name', 'email'])];
    let ok = true;
    req.forEach(n => { const bad = !f[n].value.trim() || (n === 'email' && !isEmail(f[n].value)); f[n].classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Revisa los campos marcados', 'warning');
    const email = cli ? cli.email : f.email.value.trim();
    const known = cli || db.find('users', x => x.role === 'cliente' && x.email.toLowerCase() === email.toLowerCase());
    const { ticket } = createTicket({ subject: f.subject.value, body: f.body.value, categoryId: f.categoryId.value, priority: f.priority.value, channel: cli ? 'portal' : 'web', customerId: known?.id || null, guest: known ? null : { name: f.name.value.trim(), email }, attachments: filesOf(f.files) });
    toast(`Ticket #${ticket.number} creado`, 'success');
    done = ticket.id;
    contact(view);
    window.scrollTo(0, 0);
  });
}
