// Mi cuenta: login/registro de donantes; historial y certificados; donación mensual; portal del voluntario; perfil.
import { db, auth, STAFF, SUB_ST, DONATION_ST, campaignName, donorStats, upsertDonor, nextChargeDate, publicCampaigns } from '../data/db.js';
import { openReceipt, receiptFile, annualFile } from '../shared/receipt.js';
import { escape, money, num, date, toast, confirm, formModal, $ } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

const root = $('#acc');
let tab = 'donaciones';

function guest() {
  const reg = location.hash === '#registro';
  root.innerHTML = `<div class="login-box" style="margin-inline:auto">
    <section class="card stack">
      <div class="tabs" role="tablist"><button class="tab ${!reg ? 'active' : ''}" data-g="in" role="tab">Ingresar</button><button class="tab ${reg ? 'active' : ''}" data-g="reg" role="tab">Crear cuenta</button></div>
      <form class="stack" id="gIn" ${reg ? 'hidden' : ''} novalidate>
        <h1 style="font-size:28px;margin:0">Mi cuenta</h1><p class="muted small" style="margin:0">Revisa tus donaciones, descarga certificados y administra tu aporte mensual.</p>
        <div class="field"><label for="g-email">Correo</label><input class="input" id="g-email" name="email" type="email" autocomplete="username" required></div>
        <div class="field"><label for="g-pass">Contraseña</label><input class="input" id="g-pass" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary" type="submit">Entrar</button></form>
      <form class="stack" id="gReg" ${reg ? '' : 'hidden'} novalidate>
        <h1 style="font-size:28px;margin:0">Crear cuenta de donante</h1><p class="muted small" style="margin:0">Si ya donaste con este correo, verás tu historial automáticamente.</p>
        <div class="field"><label for="r-name">Nombre completo</label><input class="input" id="r-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="r-email">Correo</label><input class="input" id="r-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="r-pass">Contraseña (mín. 6)</label><input class="input" id="r-pass" name="password" type="password" required autocomplete="new-password"></div>
        <button class="btn btn-primary" type="submit">Crear cuenta</button></form>
    </section>
    <section class="card stack"><h2 style="font-size:20px;margin:0">Prueba la demo</h2>
      <div id="demo"></div><p class="small muted" style="margin:0">¿Eres del equipo? <a href="login.html">Acceso al panel</a></p></section></div>`;
  auth.mountDemoLogin($('#demo'), { filter: u => ['donante', 'voluntario'].includes(u.role) && u.active !== false, onLogin: () => { toast('Sesión iniciada', 'success'); render(); } });
  root.onclick = e => { const g = e.target.closest('[data-g]'); if (!g) return; history.replaceState(null, '', g.dataset.g === 'reg' ? '#registro' : '#'); guest(); };
  $('#gIn').onsubmit = async e => {
    e.preventDefault();
    try { const u = await auth.login(e.target.email.value, e.target.password.value); if (STAFF.includes(u.role)) { location.href = 'admin.html'; return; } toast(`Hola, ${u.name.split(' ')[0]}`, 'success'); render(); }
    catch (err) { toast(err.message, 'error'); }
  };
  $('#gReg').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, name = f.name.value.trim(), email = f.email.value.trim(), password = f.password.value;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return toast('Completa los datos (contraseña de 6+ caracteres)', 'warning');
    try {
      const donor = upsertDonor({ name, email });
      await auth.register({ name, email, password, role: 'donante', color: '#a8432f', donorId: donor.id });
      toast('¡Cuenta creada!', 'success'); render();
    } catch (err) { toast(err.message, 'error'); }
  };
}

function myDonor(u) { return (u.donorId && db.get('donors', u.donorId)) || db.find('donors', d => d.email.toLowerCase() === u.email.toLowerCase()); }
function myVolunteer(u) { return (u.volunteerId && db.get('volunteers', u.volunteerId)) || db.find('volunteers', v => v.email.toLowerCase() === u.email.toLowerCase()); }

function donationsTab(donor) {
  if (!donor) return `<div class="card empty"><span class="icon">🌱</span><h3>Aún no tienes donaciones</h3><a class="btn btn-primary" href="index.html#/donar">Hacer mi primera donación</a></div>`;
  const all = db.query('donations', d => d.donorId === donor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const st = donorStats(donor.id);
  const years = [...new Set(st.list.map(d => d.createdAt.slice(0, 4)))].sort().reverse();
  const thisYear = st.list.filter(d => d.createdAt.startsWith(String(new Date().getFullYear()))).reduce((s, d) => s + d.amount, 0);
  const camps = new Set(st.list.map(d => d.campaignId).filter(Boolean)).size;
  return `<div class="kpis">
      <div class="card kpi"><div class="stat"><span class="label">Total donado</span><span class="value">${money(st.total)}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Donaciones</span><span class="value">${num(st.count)}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Este año</span><span class="value">${money(thisYear)}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Campañas apoyadas</span><span class="value">${camps}</span></div></div></div>
    <div class="card"><div class="card-title"><h3>Historial</h3><div class="row" style="gap:6px">${years.map(y => `<button class="btn btn-sm" data-annual="${y}">⇩ Certificado ${y}</button>`).join('')}</div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Destino</th><th>Tipo</th><th>Monto</th><th>Estado</th><th></th></tr></thead><tbody>
      ${all.map(d => `<tr><td>${escape(date(d.createdAt))}</td><td>${escape(campaignName(d.campaignId))}</td><td>${d.type === 'mensual' ? 'Mensual' : 'Única'}</td><td><b>${money(d.amount)}</b></td><td><span class="badge badge-${DONATION_ST[d.status][1]}">${DONATION_ST[d.status][0]}</span></td>
        <td>${d.receiptNo ? `<div class="t-actions"><button class="btn btn-sm" data-rc="${d.id}">Ver</button><button class="btn btn-sm btn-ghost" data-dl="${d.id}" aria-label="Descargar comprobante">⇩</button></div>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div>`;
}

function monthlyTab(donor) {
  const subs = donor ? db.query('subscriptions', s => s.donorId === donor.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)) : [];
  if (!subs.length) return `<div class="card stack sub-card"><h3 style="margin:0">Hazte socio mensual</h3><p class="muted" style="margin:0">Desde $3.000 al mes. Puedes pausarla o cancelarla cuando quieras desde aquí.</p><div><a class="btn btn-primary" href="index.html#/donar?type=mensual">Quiero ser socio</a></div></div>`;
  return subs.map(s => `<div class="card stack sub-card">
    <div class="row between"><div><span class="muted small">Donación mensual</span><div class="big-num">${money(s.amount)} <small class="muted" style="font-size:14px">/ mes</small></div></div><span class="badge badge-${SUB_ST[s.status][1]}">${SUB_ST[s.status][0]}</span></div>
    <dl class="kv"><dt>Destino</dt><dd>${escape(campaignName(s.campaignId))}</dd><dt>Desde</dt><dd>${escape(date(s.startedAt))}</dd><dt>Tarjeta</dt><dd>•••• ${escape(s.card)}</dd>
      <dt>Próximo cargo</dt><dd>${s.status === 'activa' && s.nextCharge ? escape(date(s.nextCharge + 'T12:00')) + ` (día ${s.chargeDay})` : '—'}</dd>
      <dt>Aportado</dt><dd>${money(db.query('donations', d => d.subscriptionId === s.id && d.status === 'aprobada').reduce((a, d) => a + d.amount, 0))}</dd></dl>
    ${s.status !== 'cancelada' ? `<div class="row" style="gap:8px"><button class="btn btn-sm btn-primary" data-sub-amt="${s.id}">Cambiar monto</button><button class="btn btn-sm" data-sub-card="${s.id}">Cambiar tarjeta</button>
      ${s.status === 'activa' ? `<button class="btn btn-sm" data-sub-pause="${s.id}">Pausar</button>` : `<button class="btn btn-sm" data-sub-resume="${s.id}">Reanudar</button>`}<button class="btn btn-sm btn-ghost" data-sub-cancel="${s.id}">Cancelar</button></div>` : `<p class="small muted" style="margin:0">Cancelada el ${escape(date(s.endedAt))}. <a href="index.html#/donar?type=mensual">Volver a ser socio</a></p>`}
  </div>`).join('');
}

function volunteerTab(v) {
  if (!v) return `<div class="card empty"><span class="icon">🤝</span><h3>Aún no eres voluntario</h3><a class="btn btn-primary" href="index.html#/voluntariado">Postular</a></div>`;
  const todayKey = new Date().toISOString().slice(0, 10);
  const acts = db.all('activities');
  const mine = acts.filter(a => a.enrolled.includes(v.id)).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = mine.filter(a => a.date >= todayKey && a.status === 'abierta'), past = mine.filter(a => a.date < todayKey || a.status === 'realizada');
  const open = acts.filter(a => a.status === 'abierta' && a.date >= todayKey && !a.enrolled.includes(v.id)).sort((a, b) => a.date.localeCompare(b.date));
  const row = (a, btn) => `<div class="card act-row"><span class="date-chip"><b>${new Date(a.date + 'T12:00').getDate()}</b><small>${escape(new Date(a.date + 'T12:00').toLocaleDateString('es-CL', { month: 'short' }))}</small></span><span class="grow"><b>${escape(a.title)}</b><br><span class="small muted">${escape(a.place)} · ${escape(a.start)} · ${a.hours} h · ${a.slots - a.enrolled.length} cupos</span></span>${btn}</div>`;
  return `<div class="kpis">
      <div class="card kpi"><div class="stat"><span class="label">Horas acumuladas</span><span class="value">${v.hours}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Próximas</span><span class="value">${upcoming.length}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Realizadas</span><span class="value">${past.length}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Estado</span><span class="value" style="text-transform:capitalize">${escape(v.status)}</span></div></div></div>
    ${v.status === 'postulante' ? '<p class="demo-note">Tu postulación está en revisión. Puedes inscribirte; el coordinador confirmará tu participación.</p>' : ''}
    <div class="split" style="align-items:start"><div class="stack"><h3 style="margin:0">Mis próximas actividades</h3>${upcoming.map(a => row(a, `<button class="btn btn-sm btn-ghost" data-unenroll="${a.id}">Anular</button>`)).join('') || '<p class="muted">No tienes actividades próximas.</p>'}
      <h3 style="margin:0">Historial</h3>${past.slice(-5).reverse().map(a => row(a, '<span class="badge badge-success">✓</span>')).join('') || '<p class="muted">—</p>'}</div>
    <div class="stack"><h3 style="margin:0">Actividades abiertas</h3>${open.slice(0, 6).map(a => row(a, a.enrolled.length < a.slots ? `<button class="btn btn-sm btn-primary" data-enroll="${a.id}">Inscribirme</button>` : '<span class="badge badge-danger">Lleno</span>')).join('') || '<p class="muted">No hay actividades abiertas.</p>'}</div></div>`;
}

function profileTab(u, donor) {
  return `<form class="card stack" id="profForm" novalidate style="max-width:560px">
    <h3 style="margin:0">Mis datos</h3>
    <div class="field"><label for="p-name">Nombre</label><input class="input" id="p-name" name="name" value="${escape(u.name)}" required></div>
    <div class="field"><label for="p-email">Correo</label><input class="input" id="p-email" value="${escape(u.email)}" disabled></div>
    <div class="grid-2"><div class="field"><label for="p-phone">Teléfono</label><input class="input" id="p-phone" name="phone" value="${escape(donor?.phone || '')}"></div>
    <div class="field"><label for="p-region">Región</label><input class="input" id="p-region" name="region" value="${escape(donor?.region || '')}"></div></div>
    <div class="field"><label for="p-pass">Nueva contraseña (opcional)</label><input class="input" id="p-pass" name="password" type="password" autocomplete="new-password"></div>
    <label class="check"><input type="checkbox" name="newsletter" ${donor && !(donor.tags || []).includes('Sin boletín') ? 'checked' : ''}> Quiero recibir el boletín mensual</label>
    <div><button class="btn btn-primary" type="submit">Guardar cambios</button></div></form>`;
}

function render() {
  const u = auth.current();
  if (!u || u.active === false) { root.onclick = null; return guest(); }
  if (STAFF.includes(u.role)) { root.innerHTML = `<div class="card empty"><span class="icon">🗂️</span><h2>Hola, ${escape(u.name)}</h2><p>Tu cuenta es del equipo.</p><a class="btn btn-primary" href="admin.html">Ir al panel</a> <button class="btn" data-logout>Cerrar sesión</button></div>`; root.onclick = e => { if (e.target.closest('[data-logout]')) { auth.logout(); render(); } }; return; }
  const donor = myDonor(u), vol = myVolunteer(u);
  const tabs = [['donaciones', 'Mis donaciones'], ['mensual', 'Donación mensual'], ...(vol || u.role === 'voluntario' ? [['voluntariado', 'Voluntariado']] : []), ['perfil', 'Perfil']];
  if (!tabs.find(t => t[0] === tab)) tab = tabs[0][0];
  if (u.role === 'voluntario' && !sessionStorage.getItem('ong:acc-tab')) { tab = 'voluntariado'; sessionStorage.setItem('ong:acc-tab', '1'); }
  const pane = { donaciones: () => donationsTab(donor), mensual: () => monthlyTab(donor), voluntariado: () => volunteerTab(vol), perfil: () => profileTab(u, donor) }[tab]();
  root.innerHTML = `<div class="acc-head"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')}">${escape(initials(u.name))}</span>
      <div style="flex:1;min-width:0"><span class="eyebrow">${escape(auth.roleName(u.role))}</span><h1 style="margin:0;font-size:clamp(24px,4vw,36px)">Hola, ${escape(u.name.split(' ')[0])}</h1></div>
      <a class="btn btn-primary" href="index.html#/donar">Donar ♥</a><button class="btn btn-ghost" data-logout>Cerrar sesión</button></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'active' : ''}" role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="stack">${pane}</div>`;

  root.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-logout]')) { auth.logout(); sessionStorage.removeItem('ong:acc-tab'); toast('Sesión cerrada', 'info'); render(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); }
    if (t.dataset.rc) openReceipt(t.dataset.rc);
    if (t.dataset.dl) receiptFile(db.get('donations', t.dataset.dl));
    if (t.dataset.annual) annualFile(donor, t.dataset.annual, donorStats(donor.id).list.filter(d => d.createdAt.startsWith(t.dataset.annual)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    const sid = t.dataset.subAmt || t.dataset.subCard || t.dataset.subPause || t.dataset.subResume || t.dataset.subCancel;
    if (sid) {
      const s = db.get('subscriptions', sid);
      if (t.dataset.subAmt) { const v = await formModal({ title: 'Cambiar monto mensual', fields: [{ name: 'amount', label: 'Monto mensual (CLP)', type: 'number', value: s.amount, required: true }, { name: 'campaignId', label: 'Destino', type: 'select', value: s.campaignId, options: [['', 'Fondo general'], ...publicCampaigns().filter(c => c.status === 'publicada').map(c => [c.id, c.title])] }] }); if (!v || v.amount < 1000) return v && toast('Mínimo $1.000', 'warning'); db.update('subscriptions', s.id, v); db.log('Suscripción modificada', `${donor.name}: ${money(s.amount)} → ${money(v.amount)}`, u.id); toast('Donación mensual actualizada', 'success'); }
      if (t.dataset.subCard) { const v = await formModal({ title: 'Cambiar tarjeta', fields: [{ name: 'num', label: 'Número de tarjeta (simulado)', required: true, placeholder: '4242 4242 4242 4242' }] }); if (!v) return; const d = v.num.replace(/\D/g, ''); if (d.length !== 16) return toast('Número inválido', 'warning'); db.update('subscriptions', s.id, { card: d.slice(-4) }); toast('Tarjeta actualizada', 'success'); }
      if (t.dataset.subPause && await confirm('¿Pausar tu donación mensual? No se harán cargos hasta que la reanudes.', { ok: 'Pausar' })) { db.update('subscriptions', s.id, { status: 'pausada', nextCharge: '' }); db.log('Suscripción pausada', donor.name, u.id); toast('Donación pausada', 'warning'); }
      if (t.dataset.subResume) { db.update('subscriptions', s.id, { status: 'activa', nextCharge: nextChargeDate(s.chargeDay) }); db.log('Suscripción reanudada', donor.name, u.id); toast('¡Gracias por volver!', 'success'); }
      if (t.dataset.subCancel && await confirm('¿Seguro que quieres cancelar tu donación mensual? Las familias que apoyas lo notarán 💚', { danger: true, ok: 'Cancelar donación' })) { db.update('subscriptions', s.id, { status: 'cancelada', endedAt: new Date().toISOString(), nextCharge: '' }); db.log('Suscripción cancelada', donor.name, u.id); toast('Donación mensual cancelada', 'info'); }
    }
    if (t.dataset.enroll) { const a = db.get('activities', t.dataset.enroll); if (a.enrolled.length >= a.slots) return toast('Sin cupos', 'error'); db.update('activities', a.id, { enrolled: [...a.enrolled, vol.id] }); db.log('Inscripción voluntariado', `${vol.name} → ${a.title}`, u.id); toast('¡Inscrito!', 'success'); }
    if (t.dataset.unenroll && await confirm('¿Anular tu inscripción?', { ok: 'Anular' })) { const a = db.get('activities', t.dataset.unenroll); db.update('activities', a.id, { enrolled: a.enrolled.filter(x => x !== vol.id) }); db.log('Inscripción anulada', `${vol.name} → ${a.title}`, u.id); toast('Inscripción anulada', 'info'); }
  };
  const pf = $('#profForm');
  if (pf) pf.onsubmit = e => {
    e.preventDefault();
    const f = e.target, name = f.name.value.trim();
    if (!name) return toast('El nombre es obligatorio', 'warning');
    if (f.password.value && f.password.value.length < 6) return toast('La contraseña debe tener 6+ caracteres', 'warning');
    db.update('users', u.id, { name, ...(f.password.value ? { password: f.password.value } : {}) });
    const d = donor || upsertDonor({ name, email: u.email });
    const tags = (d.tags || []).filter(x => x !== 'Sin boletín');
    db.update('donors', d.id, { name, phone: f.phone.value.trim(), region: f.region.value.trim(), tags: f.newsletter.checked ? tags : [...tags, 'Sin boletín'] });
    toast('Datos guardados', 'success');
  };
}

db.subscribe(ch => { if (ch.type === 'log') return; if (document.querySelector('.modal-backdrop') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) return; render(); });
render();
