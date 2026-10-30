// Perfil del cliente: datos de la cuenta y contraseña.
import { db } from '../data/db.js';
import { html, raw, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';

export function mountPerfil(el, ctx) {
  const c = ctx.customer(), u = db.get('users', ctx.user.id);
  el.innerHTML = html`${raw(pageHead('Perfil', 'Datos de tu cuenta.'))}
    <div class="grid-2"><form class="card stack" data-p>
      <h3>${ctx.biz ? 'Datos de la empresa' : 'Datos personales'}</h3>
      <div class="field"><label for="p-name">${ctx.biz ? 'Razón social' : 'Nombre'}</label><input class="input" id="p-name" name="name" value="${c.name}" required></div>
      ${ctx.biz ? raw(html`<div class="field"><label for="p-contact">Contacto</label><input class="input" id="p-contact" name="contact" value="${c.contact || ''}"></div>`) : ''}
      <div class="grid-2"><div class="field"><label for="p-rut">RUT</label><input class="input" id="p-rut" name="rut" value="${c.rut || ''}"></div><div class="field"><label for="p-phone">Teléfono</label><input class="input" id="p-phone" name="phone" value="${c.phone || ''}"></div></div>
      <div class="field"><label for="p-email">Correo de acceso</label><input class="input" id="p-email" name="email" type="email" value="${u.email}" required></div>
      <label class="check"><input type="checkbox" name="notif" ${c.notif !== false ? 'checked' : ''}> Recibir avisos de estado por correo (simulado)</label>
      <button class="btn btn-primary">Guardar cambios</button></form>
    <form class="card stack" data-pw><h3>Contraseña</h3>
      <div class="field"><label for="p-cur">Contraseña actual</label><input class="input" id="p-cur" type="password" name="cur" autocomplete="current-password"></div>
      <div class="field"><label for="p-new">Nueva contraseña</label><input class="input" id="p-new" type="password" name="nw" minlength="6" autocomplete="new-password"></div>
      <button class="btn">Cambiar contraseña</button>
      <hr><p class="muted small">Plan: <b>${c.plan || '—'}</b> · Cliente desde ${new Date(c.createdAt).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</p></form></div>`;
  el.querySelector('[data-p]').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target.elements;
    if (!f.name.value.trim() || !/^\S+@\S+\.\S+$/.test(f.email.value)) { toast('Revisa nombre y correo', 'warning'); return; }
    db.update('customers', c.id, { name: f.name.value.trim(), contact: f.contact?.value.trim() || c.contact, rut: f.rut.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), notif: f.notif.checked });
    db.update('users', u.id, { name: ctx.biz ? f.name.value.trim() : f.name.value.trim(), email: f.email.value.trim() });
    db.log('perfil', `${f.name.value.trim()} actualizó su perfil`, u.id);
    toast('Perfil actualizado', 'success');
  });
  el.querySelector('[data-pw]').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target.elements;
    if (f.cur.value !== db.get('users', u.id).password) { toast('La contraseña actual no coincide', 'error'); return; }
    if (f.nw.value.length < 6) { toast('Mínimo 6 caracteres', 'warning'); return; }
    db.update('users', u.id, { password: f.nw.value }); e.target.reset(); toast('Contraseña actualizada', 'success');
  });
}
