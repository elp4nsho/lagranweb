// Piezas compartidas del sitio público: estrellas, formulario de reseña y postulación de afiliados.
import { db, colors } from '../data/db.js';
import { escape, modal, toast } from '../../../assets/core/ui.js';
import { uid } from '../../../assets/core/db.js';

export const stars = (n, label = true) => `<span class="stars" ${label ? `role="img" aria-label="${n} de 5 estrellas"` : 'aria-hidden="true"'}>${'★'.repeat(Math.round(n))}<span class="off">${'★'.repeat(5 - Math.round(n))}</span></span>`;

export function reviewForm({ order = null, onDone } = {}) {
  const cols = colors();
  const f = document.createElement('form');
  f.className = 'stack';
  f.noValidate = true;
  f.innerHTML = `
    ${order ? `<p class="badge badge-success">Compra verificada · ${escape(order.number)}</p>` : '<p class="muted small">Las reseñas se publican después de una revisión de nuestro equipo.</p>'}
    <div class="field"><span class="label">Tu calificación</span>
      <div class="rate-input" role="radiogroup" aria-label="Calificación">
        ${[5, 4, 3, 2, 1].map(n => `<label><input type="radio" name="rating" value="${n}" ${n === 5 ? 'checked' : ''}><span aria-hidden="true">★</span><span class="sr-only">${n} estrellas</span></label>`).join('')}
      </div></div>
    <div class="grid-2">
      <div class="field"><label for="rv-name">Nombre</label><input class="input" id="rv-name" name="name" required value="${escape(order ? order.customer.name.split(' ')[0] + ' ' + (order.customer.name.split(' ')[1] || '')[0] + '.' : '')}"></div>
      <div class="field"><label for="rv-city">Ciudad</label><input class="input" id="rv-city" name="city" value="${escape(order ? order.customer.city : '')}"></div>
    </div>
    <div class="field"><label for="rv-color">Color</label><select class="select" id="rv-color" name="color">${cols.map(c => `<option value="${c.key}" ${order && order.items[0] === c.key ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="rv-title">Título</label><input class="input" id="rv-title" name="title" required placeholder="Resume tu experiencia"></div>
    <div class="field"><label for="rv-text">Reseña</label><textarea class="textarea" id="rv-text" name="text" required placeholder="¿Qué te gustó? ¿Qué mejorarías?"></textarea></div>`;
  const m = modal({ title: 'Escribe tu reseña', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-send>Enviar reseña</button>' });
  const send = e => {
    e && e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    let ok = true;
    ['name', 'title', 'text'].forEach(k => { const bad = !String(d[k] || '').trim(); f.elements[k].classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Completa nombre, título y reseña', 'warning');
    db.insert('reviews', { id: uid('r'), name: d.name.trim(), city: d.city.trim(), rating: +d.rating, title: d.title.trim(), text: d.text.trim(), color: d.color, orderNumber: order ? order.number : '', verified: !!order, status: 'pendiente', featured: false });
    db.log('Nueva reseña', `${d.name.trim()} (${d.rating}★) espera moderación`);
    m.close();
    toast('¡Gracias! Tu reseña quedó en revisión.', 'success');
    onDone && onDone();
  };
  f.addEventListener('submit', send);
  m.el.querySelector('[data-send]').onclick = send;
}

export function affiliateForm() {
  const f = document.createElement('form');
  f.className = 'stack';
  f.noValidate = true;
  f.innerHTML = `<p class="muted">Recomienda Aquilo y gana entre 8% y 15% de comisión por cada venta con tu enlace.</p>
    <div class="field"><label for="af-name">Nombre o marca</label><input class="input" id="af-name" name="name" required></div>
    <div class="field"><label for="af-email">Correo</label><input class="input" id="af-email" type="email" name="email" required></div>
    <div class="field"><label for="af-channel">Canal (Instagram, blog, club…)</label><input class="input" id="af-channel" name="channel" required></div>
    <div class="field"><label for="af-code">Código deseado</label><input class="input" id="af-code" name="code" required placeholder="EJ: MICLUB" maxlength="12"></div>`;
  const m = modal({ title: 'Programa de afiliados', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-send>Postular</button>' });
  const send = e => {
    e && e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    let ok = true;
    ['name', 'email', 'channel', 'code'].forEach(k => { const bad = !String(d[k] || '').trim() || (k === 'email' && !/^\S+@\S+\.\S+$/.test(d[k])); f.elements[k].classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Revisa los campos marcados', 'warning');
    const code = d.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (db.find('affiliates', a => a.code === code)) { f.elements.code.classList.add('invalid'); return toast('Ese código ya está en uso', 'error'); }
    db.insert('affiliates', { name: d.name.trim(), email: d.email.trim(), channel: d.channel.trim(), code, commission: 10, clicks: 0, status: 'pendiente' });
    db.log('Afiliado postuló', `${d.name.trim()} (${code})`);
    m.close();
    toast('Postulación enviada. Te responderemos en 48 h.', 'success');
  };
  f.addEventListener('submit', send);
  m.el.querySelector('[data-send]').onclick = send;
}
