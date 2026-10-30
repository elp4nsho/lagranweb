// Cuenta del suscriptor: plan (cambiar / cancelar / reactivar), dispositivos, historial, control parental, soporte y datos.
import { db, auth, STAFF } from '../data/db.js';
import { html, raw, $, money, toast, confirm, formModal, modal, dateTime, date, escape } from '../../../assets/core/ui.js';
import { RATINGS } from '../data/seed.js';
import { requireViewer, renderHeader } from '../shared/header.js';

const ctx = await requireViewer({ needProfile: false });
if (STAFF.includes(ctx.user.role)) location.replace('admin.html');
const TABS = [['plan', 'Plan y pago'], ['dispositivos', 'Dispositivos'], ['historial', 'Historial'], ['parental', 'Control parental'], ['soporte', 'Ayuda y soporte'], ['datos', 'Datos personales']];
const ST = { activa: 'success', prueba: 'info', cancelada: 'danger', morosa: 'warning' };

function render() {
  const u = db.get('users', ctx.user.id); ctx.user = u;
  renderHeader($('#header'), { user: u, profile: null });
  const tab = (location.hash.slice(1) || 'plan');
  const plan = db.get('plans', u.plan);
  const nextBill = new Date(Date.parse(u.joinedAt)); const now = new Date();
  while (nextBill < now) nextBill.setMonth(nextBill.getMonth() + 1);
  let body = '';
  if (tab === 'plan') {
    const plans = db.query('plans', p => p.active).sort((a, b) => a.price - b.price);
    body = html`<div class="card stack"><div class="row between"><h2 style="margin:0">Tu plan</h2><span class="badge badge-${ST[u.subStatus] || 'info'}">${u.subStatus}</span></div>
      <div class="kv"><div><small>Plan</small><b>${plan?.name}</b> · ${money(plan?.price)}/mes</div><div><small>Calidad</small>${plan?.quality}</div><div><small>Pantallas</small>${plan?.screens}</div><div><small>Miembro desde</small>${date(u.joinedAt)}</div>
      <div><small>${u.subStatus === 'cancelada' ? 'Cancelada el' : 'Próximo cobro'}</small>${u.subStatus === 'cancelada' ? date(u.cancelledAt) : date(nextBill)}</div><div><small>Medio de pago</small>${u.card?.brand} •••• ${u.card?.last4} <button class="btn btn-sm btn-ghost" id="card">Cambiar</button></div></div>
      ${['cancelada', 'morosa'].includes(u.subStatus) ? raw('<button class="btn btn-primary" id="reactivate">Reactivar suscripción</button>') : ''}</div>
      <div class="card stack"><h3 style="margin:0">Cambiar de plan</h3><div class="plan-pick">${plans.map(p => raw(html`<label><span><input type="radio" name="np" value="${p.id}" ${p.id === u.plan ? 'checked' : ''}> <b>${p.name}</b> · ${p.quality} · ${p.screens} pantalla(s)</span><b>${money(p.price)}</b></label>`))}</div>
        <div class="row"><button class="btn btn-primary" id="changePlan">Guardar plan</button>${u.subStatus !== 'cancelada' ? raw('<button class="btn btn-danger" id="cancel">Cancelar suscripción</button>') : ''}</div></div>`;
  }
  if (tab === 'dispositivos') {
    body = html`<div class="card stack"><h2 style="margin:0">Dispositivos</h2><p class="muted" style="margin:0">Tu plan permite ver en ${plan?.screens} pantalla(s) a la vez.</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Dispositivo</th><th>Tipo</th><th>Última actividad</th><th></th></tr></thead><tbody>${(u.devices || []).map(d => raw(html`<tr><td><b>${d.name}</b></td><td>${d.type}</td><td>${dateTime(d.lastSeen)}</td><td><button class="btn btn-sm btn-ghost" data-dev="${d.id}">Cerrar sesión</button></td></tr>`))}</tbody></table></div>
      <button class="btn btn-sm" id="signoutAll" style="align-self:flex-start">Cerrar sesión en todos los dispositivos</button></div>`;
  }
  if (tab === 'historial') {
    const views = db.query('views', v => v.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
    const mins = db.query('views', v => v.userId === u.id).reduce((s, v) => s + v.minutes, 0);
    body = html`<div class="card stack"><div class="row between"><h2 style="margin:0">Historial de visualización</h2><span class="badge">${Math.round(mins / 60)} horas vistas</span></div>
      ${views.length ? raw(html`<div class="table-wrap"><table class="table"><thead><tr><th>Título</th><th>Fecha</th><th>Minutos</th><th>Dispositivo</th></tr></thead><tbody>${views.map(v => raw(html`<tr><td><a href="app.html#/titulo/${v.titleId}">${db.get('titles', v.titleId)?.title}</a></td><td>${dateTime(v.createdAt)}</td><td>${v.minutes}</td><td>${v.device}</td></tr>`))}</tbody></table></div>`) : raw('<div class="empty">Aún no ves nada. ¡Elige algo!</div>')}</div>`;
  }
  if (tab === 'parental') {
    body = html`<form class="card stack" id="parental"><h2 style="margin:0">Control parental</h2><p class="muted" style="margin:0">Pide un PIN para reproducir títulos con clasificación igual o superior a la elegida (en perfiles no infantiles). Los perfiles infantiles solo ven contenido TE y 7+.</p>
      <div class="grid-2"><div class="field"><label for="ppin">PIN parental (4 dígitos)</label><input class="input mono" id="ppin" maxlength="4" inputmode="numeric" value="${u.parentalPin || ''}" placeholder="Sin PIN"></div>
      <div class="field"><label for="plev">Pedir PIN desde</label><select class="select" id="plev">${RATINGS.slice(1).map(r => raw(`<option ${u.pinLevel === r ? 'selected' : ''}>${r}</option>`))}</select></div></div>
      <div class="field"><label for="ppass">Confirma tu contraseña</label><input class="input" id="ppass" type="password" placeholder="demo123"></div>
      <button class="btn btn-primary" style="align-self:flex-start">Guardar</button></form>`;
  }
  if (tab === 'soporte') {
    const tks = db.query('tickets', x => x.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    body = html`<div class="card stack"><div class="row between"><h2 style="margin:0">Ayuda y soporte</h2><button class="btn btn-primary btn-sm" id="newTk">+ Nueva consulta</button></div>
      ${tks.length ? raw(`<ul class="mini-list">${tks.map(x => `<li><span><b>${escape(x.subject)}</b><br><small class="muted">${escape(x.category)} · ${dateTime(x.createdAt)} · ${x.messages.length} mensaje(s)</small></span><span class="badge ${x.status === 'resuelto' ? 'badge-success' : x.status === 'en_curso' ? 'badge-info' : 'badge-warning'}">${x.status.replace('_', ' ')}</span><button class="btn btn-sm" data-tk="${x.id}">Ver</button></li>`).join('')}</ul>`) : raw('<div class="empty">No tienes consultas.</div>')}</div>`;
  }
  if (tab === 'datos') {
    body = html`<form class="card stack" id="datos"><h2 style="margin:0">Datos personales</h2>
      <div class="grid-2"><div class="field"><label for="dn">Nombre</label><input class="input" id="dn" value="${u.name}"></div><div class="field"><label for="de">Correo</label><input class="input" id="de" type="email" value="${u.email}"></div></div>
      <div class="field"><label for="dp">Nueva contraseña (opcional)</label><input class="input" id="dp" type="password" minlength="6"></div>
      <button class="btn btn-primary" style="align-self:flex-start">Guardar cambios</button></form>`;
  }
  $('#main').innerHTML = `<div class="container stack"><div class="row between"><h1 style="margin:0">Cuenta</h1><a class="btn" href="perfiles.html">Perfiles</a></div>
    <div class="acct"><nav aria-label="Secciones de la cuenta">${TABS.map(([k, l]) => `<a href="#${k}" class="${tab === k ? 'active' : ''}">${l}</a>`).join('')}</nav><div class="stack">${body}</div></div></div>`;
  wire(u);
}

function wire(u) {
  const upd = (patch, msg, log) => { db.update('users', u.id, patch); if (log) db.log(log[0], log[1], u.id); toast(msg, 'success'); };
  $('#changePlan')?.addEventListener('click', async () => {
    const np = document.querySelector('input[name=np]:checked').value; if (np === u.plan) return toast('Ya tienes ese plan');
    const p = db.get('plans', np);
    if (!await confirm(`¿Cambiar al plan ${p.name} por ${money(p.price)}/mes? El cambio se aplica de inmediato.`, { ok: 'Cambiar plan' })) return;
    upd({ plan: np }, `Plan cambiado a ${p.name}`, ['plan', `${u.name} cambió a ${p.name}`]);
  });
  $('#cancel')?.addEventListener('click', async () => { if (await confirm('¿Seguro? Perderás acceso al terminar el período actual. Puedes volver cuando quieras.', { danger: true, ok: 'Cancelar suscripción' })) upd({ subStatus: 'cancelada', cancelledAt: new Date().toISOString() }, 'Suscripción cancelada', ['baja', `${u.name} canceló su suscripción`]); });
  $('#reactivate')?.addEventListener('click', () => upd({ subStatus: 'activa', cancelledAt: null }, '¡Bienvenido/a de vuelta!', ['reactivación', `${u.name} reactivó su suscripción`]));
  $('#card')?.addEventListener('click', async () => {
    const r = await formModal({ title: 'Cambiar medio de pago', fields: [{ name: 'num', label: 'Número de tarjeta', required: true, placeholder: '4242 4242 4242 4242' }, { name: 'exp', label: 'Vencimiento (MM/AA)', required: true }] });
    if (!r) return; const n = r.num.replace(/\D/g, ''); if (n.length < 13) return toast('Número inválido', 'error');
    upd({ card: { brand: n.startsWith('5') ? 'Mastercard' : 'Visa', last4: n.slice(-4) } }, 'Medio de pago actualizado');
  });
  document.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => upd({ devices: u.devices.filter(d => d.id !== b.dataset.dev) }, 'Sesión cerrada en el dispositivo'));
  $('#signoutAll')?.addEventListener('click', () => upd({ devices: [{ id: 'd' + Date.now(), name: 'Este navegador', type: 'Computador', lastSeen: new Date().toISOString() }] }, 'Se cerró la sesión en los demás dispositivos'));
  $('#parental')?.addEventListener('submit', e => {
    e.preventDefault();
    const pin = $('#ppin').value.trim();
    if ($('#ppass').value !== u.password) return toast('Contraseña incorrecta', 'error');
    if (pin && !/^\d{4}$/.test(pin)) return toast('El PIN debe tener 4 dígitos', 'warning');
    upd({ parentalPin: pin, pinLevel: $('#plev').value }, pin ? `PIN parental activo desde ${$('#plev').value}` : 'Control parental desactivado', ['parental', `${u.name} actualizó el control parental`]);
  });
  $('#datos')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#dn').value.trim(), email = $('#de').value.trim(), pass = $('#dp').value;
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return toast('Revisa nombre y correo', 'warning');
    if (db.find('users', x => x.email.toLowerCase() === email.toLowerCase() && x.id !== u.id)) return toast('Ese correo ya está en uso', 'error');
    if (pass && pass.length < 6) return toast('La contraseña debe tener 6+ caracteres', 'warning');
    upd({ name, email, ...(pass ? { password: pass } : {}) }, 'Datos actualizados');
  });
  $('#newTk')?.addEventListener('click', async () => {
    const r = await formModal({ title: 'Nueva consulta', fields: [{ name: 'subject', label: 'Asunto', required: true }, { name: 'category', label: 'Categoría', type: 'select', options: ['Reproducción', 'Facturación', 'Cuenta', 'Catálogo', 'Otro'] }, { name: 'text', label: 'Cuéntanos qué pasa', type: 'textarea', required: true }] });
    if (!r) return;
    db.insert('tickets', { userId: u.id, subject: r.subject, category: r.category, status: 'abierto', priority: r.category === 'Facturación' ? 'alta' : 'media', messages: [{ from: 'user', text: r.text, at: new Date().toISOString() }] });
    db.log('soporte', `Nuevo ticket de ${u.name}: ${r.subject}`, u.id); toast('Consulta enviada. Te responderemos pronto.', 'success');
  });
  document.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => {
    const tk = db.get('tickets', b.dataset.tk);
    const m = modal({ title: tk.subject, body: `<div class="msgs">${tk.messages.map(x => `<div class="msg ${x.from === 'agent' ? 'agent' : ''}">${escape(x.text)}<small>${x.from === 'agent' ? 'Soporte Andes+' : 'Tú'} · ${dateTime(x.at)}</small></div>`).join('')}</div>${tk.status !== 'resuelto' ? '<div class="field" style="margin-top:12px"><label for="rep">Responder</label><textarea class="textarea" id="rep"></textarea></div>' : ''}`, foot: tk.status !== 'resuelto' ? '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" id="send">Enviar</button>' : '' });
    m.el.querySelector('#send')?.addEventListener('click', () => { const t = m.el.querySelector('#rep').value.trim(); if (!t) return; db.update('tickets', tk.id, { messages: [...tk.messages, { from: 'user', text: t, at: new Date().toISOString() }], status: tk.status === 'resuelto' ? 'abierto' : tk.status }); m.close(); toast('Mensaje enviado', 'success'); });
  });
  db.query('notifications', n => n.userId === u.id && !n.read).forEach(n => db.update('notifications', n.id, { read: true }));
  void auth;
}

addEventListener('hashchange', render);
let t; db.subscribe(() => { clearTimeout(t); t = setTimeout(() => { if (!document.querySelector('.modal-backdrop') && !document.activeElement?.matches('input, textarea, select')) render(); }, 100); });
render();
