// Planes de suscripción (checkout simulado) y cuenta del lector.
import { escape, money, date, ago, toast, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, activeSub, liveArticles, STAFF, STATUS } from '../data/db.js';
import { story } from './cards.js';
import { formDialog, f } from '../shared/admin-kit.js';

const SUB_ST = { active: ['Activa', 'success'], past_due: ['Pago pendiente', 'warning'], cancelled: ['Cancelada', 'danger'] };

export function renderPlans(el, query = {}, refresh) {
  const u = auth.current(), sub = activeSub(u);
  const plans = db.query('plans', p => p.active).sort((a, b) => a.order - b.order);
  el.innerHTML = `<div class="container page-top">
    <header class="list-head center" data-anim><span class="eyebrow">Suscripciones</span><h1>Periodismo que orienta, sin límites</h1><p class="muted">Tu suscripción financia reportajes de largo aliento, investigación y cobertura en regiones. Cancela cuando quieras.</p></header>
    ${sub ? `<div class="card row between"><span>Ya tienes el plan <b>${escape(db.get('plans', sub.planId)?.name)}</b>. ¡Gracias por apoyar a Brújula!</span><a class="btn" href="#/cuenta">Administrar suscripción</a></div>` : ''}
    <div class="plans">${plans.map(p => `<article class="card plan ${p.highlight ? 'featured' : ''}">${p.highlight ? '<span class="badge badge-primary plan-flag">Más elegido</span>' : ''}
      <h2>${escape(p.name)}</h2><div class="price"><b>${money(p.price)}</b><span class="muted">/${escape(p.period)}</span></div>
      <ul class="checklist">${p.features.map(x => `<li>${escape(x)}</li>`).join('')}</ul>
      <button class="btn ${p.highlight ? 'btn-primary' : ''} btn-block btn-lg" data-plan="${p.id}" ${sub?.planId === p.id ? 'disabled' : ''}>${sub?.planId === p.id ? 'Tu plan actual' : sub ? 'Cambiar a este plan' : 'Suscribirme'}</button></article>`).join('')}</div>
    <section class="faq"><h2>Preguntas frecuentes</h2>
      ${[['¿Puedo cancelar cuando quiera?', 'Sí. Cancelas desde “Mi cuenta” y mantienes el acceso hasta el fin del período pagado.'], ['¿Qué incluye el contenido premium?', 'Reportajes de investigación, análisis de expertos, columnas y la edición en PDF.'], ['¿Cómo se cobra?', 'Este es un sitio de demostración: el pago es simulado y no se realiza ningún cargo real.']].map(([q, a]) => `<details class="card"><summary><b>${q}</b></summary><p class="muted">${a}</p></details>`).join('')}
    </section></div>`;
  el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
    const plan = db.get('plans', b.dataset.plan);
    if (!u) { toast('Crea una cuenta o inicia sesión para suscribirte', 'info'); location.href = `login.html?next=${encodeURIComponent('index.html#/planes')}#registro`; return; }
    if (STAFF.includes(u.role)) return toast('Las cuentas de redacción ya tienen acceso completo', 'info');
    checkout(u, plan, sub, () => {
      if (query.next) location.hash = `#/articulo/${query.next}`; else location.hash = '#/cuenta';
      refresh();
    });
  });
  return 'Planes';
}

function checkout(u, plan, current, done) {
  formDialog({
    title: `Suscribirme a ${plan.name}`, submit: `Pagar ${money(plan.price)}`,
    body: `<div class="card checkout-sum row between"><span><b>${escape(plan.name)}</b><br><small class="muted">Renovación automática cada ${escape(plan.period)}</small></span><b class="h">${money(plan.price)}</b></div>
      ${f.text('holder', 'Nombre en la tarjeta', u.name, { required: true })}
      ${f.text('card', 'Número de tarjeta', '4242 4242 4242 4242', { required: true, help: 'Pago simulado: no ingreses datos reales.', attrs: 'inputmode="numeric" autocomplete="off" maxlength="19"' })}
      <div class="grid-2">${f.text('exp', 'Vencimiento (MM/AA)', '12/29', { required: true, attrs: 'autocomplete="off" maxlength="5"' })}${f.text('cvc', 'CVC', '123', { required: true, attrs: 'autocomplete="off" maxlength="4" inputmode="numeric"' })}</div>
      ${f.check('terms', 'Acepto los términos de la suscripción', true)}`,
    onSubmit: v => {
      const digits = v.card.replace(/\D/g, '');
      if (digits.length < 15) { toast('Número de tarjeta inválido', 'error'); return false; }
      if (!/^\d{2}\/\d{2}$/.test(v.exp)) { toast('Vencimiento inválido (MM/AA)', 'error'); return false; }
      if (!v.terms) { toast('Debes aceptar los términos', 'warning'); return false; }
      if (current) db.update('subscriptions', current.id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
      const now = Date.now();
      const s = db.insert('subscriptions', { userId: u.id, planId: plan.id, status: 'active', amount: plan.price, startedAt: new Date(now).toISOString(), renewsAt: new Date(now + (plan.period === 'año' ? 365 : 30) * 864e5).toISOString(), card: `•••• ${digits.slice(-4)}`, cancelledAt: null });
      db.insert('payments', { subscriptionId: s.id, userId: u.id, planId: plan.id, amount: plan.price, status: 'paid' });
      db.update('users', u.id, { subscriptionId: s.id });
      db.log('suscripción', `${u.name} se suscribió a ${plan.name}`, u.id);
      toast('¡Bienvenido/a! Tu suscripción está activa.', 'success');
      done();
    }
  });
}

export function renderAccount(el, refresh) {
  const u = auth.current();
  if (!u) { el.innerHTML = `<div class="container page-top empty card"><h1>Mi cuenta</h1><p>Inicia sesión para ver tus artículos guardados, comentarios y suscripción.</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/cuenta')}">Iniciar sesión</a><a class="btn" href="login.html#registro">Crear cuenta</a></div></div>`; return 'Mi cuenta'; }
  const sub = activeSub(u), plan = sub && db.get('plans', sub.planId);
  const saved = (u.saved || []).map(id => db.get('articles', id)).filter(Boolean);
  const mine = db.query('comments', c => c.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ns = db.find('subscribers', s => s.email.toLowerCase() === u.email.toLowerCase() && s.status === 'active');
  const pays = db.query('payments', p => p.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const CST = { approved: ['Publicado', 'success'], pending: ['En moderación', 'warning'], rejected: ['Rechazado', 'danger'], spam: ['Spam', 'danger'] };
  el.innerHTML = `<div class="container page-top">
    <header class="list-head author-head card"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')};--size:72px">${escape(initials(u.name))}</span><div><span class="eyebrow">Mi cuenta</span><h1>${escape(u.name)}</h1><p class="muted">${escape(u.email)} · ${escape(auth.roleName(u.role))}${STAFF.includes(u.role) ? ' · <a href="admin.html">Ir al panel de redacción</a>' : ''}</p></div></header>
    <div class="account-grid">
      <section class="card stack"><h2>Suscripción</h2>${sub ? `<p><span class="badge badge-${SUB_ST[sub.status][1]}">${SUB_ST[sub.status][0]}</span> <b>${escape(plan?.name)}</b> · ${money(sub.amount)}/${escape(plan?.period)}</p><p class="small muted">Desde ${date(sub.startedAt)} · próxima renovación ${date(sub.renewsAt)} · tarjeta ${escape(sub.card)}</p>
          <div class="row" style="gap:8px"><a class="btn btn-sm" href="#/planes">Cambiar plan</a><button class="btn btn-sm btn-danger" data-cancel>Cancelar suscripción</button></div>
          ${pays.length ? `<h3 style="margin-top:8px">Pagos</h3><ul class="mini-list">${pays.map(p => `<li><span>${date(p.createdAt)}</span><b>${money(p.amount)}</b></li>`).join('')}</ul>` : ''}`
        : `<p class="muted">No tienes una suscripción activa. ${STAFF.includes(u.role) ? 'Como parte de la redacción tienes acceso completo.' : 'Desbloquea todo el contenido premium.'}</p>${STAFF.includes(u.role) ? '' : '<a class="btn btn-primary" href="#/planes">Ver planes</a>'}`}</section>
      <section class="card stack"><h2>Newsletter</h2><p class="small muted">Recibe las noticias clave en ${escape(u.email)}.</p>
        <label class="row switch-row" style="gap:10px"><span class="switch"><input type="checkbox" data-nl ${ns ? 'checked' : ''}><span></span></span> Newsletter diario</label>
        <h2 style="margin-top:12px">Perfil</h2><form class="row" data-profile style="gap:8px;flex-wrap:nowrap"><input class="input" name="name" value="${escape(u.name)}" aria-label="Nombre" required><button class="btn">Guardar</button></form></section>
    </div>
    <section class="sec-block"><header class="sec-head"><h2>Artículos guardados (${saved.length})</h2></header>${saved.length ? `<div class="grid-3">${saved.map(a => `<div class="saved-item">${story(a, 'card')}<button class="btn btn-sm btn-ghost" data-unsave="${a.id}">Quitar</button></div>`).join('')}</div>` : '<p class="muted">Aún no guardas artículos. Usa el botón “☆ Guardar” en cualquier nota.</p>'}</section>
    <section class="sec-block"><header class="sec-head"><h2>Mis comentarios (${mine.length})</h2></header>${mine.length ? `<ul class="mini-list">${mine.map(c => { const a = db.get('articles', c.articleId); return `<li><span><a href="#/articulo/${escape(a?.slug || '')}">${escape(a?.title || 'Artículo')}</a><br><small class="muted">“${escape(c.text)}” · ${ago(c.createdAt)}</small></span><span class="badge badge-${CST[c.status][1]}">${CST[c.status][0]}</span></li>`; }).join('')}</ul>` : '<p class="muted">No has comentado todavía.</p>'}</section>
  </div>`;
  el.querySelector('[data-cancel]')?.addEventListener('click', async () => {
    if (!await confirm('Mantendrás el acceso hasta el fin del período pagado. ¿Cancelar suscripción?', { title: 'Cancelar suscripción', ok: 'Sí, cancelar', danger: true })) return;
    db.update('subscriptions', sub.id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
    db.log('suscripción', `${u.name} canceló su suscripción`, u.id);
    toast('Suscripción cancelada', 'info'); refresh();
  });
  el.querySelector('[data-nl]').onchange = e => {
    if (e.target.checked) { if (ns) return; const ex = db.find('subscribers', s => s.email.toLowerCase() === u.email.toLowerCase()); ex ? db.update('subscribers', ex.id, { status: 'active' }) : db.insert('subscribers', { email: u.email, name: u.name, lists: ['diario'], status: 'active', source: 'Mi cuenta' }); toast('Suscrito al newsletter', 'success'); }
    else if (ns) { db.update('subscribers', ns.id, { status: 'unsubscribed' }); toast('Te diste de baja del newsletter', 'info'); }
  };
  el.querySelector('[data-profile]').onsubmit = e => { e.preventDefault(); const n = e.target.name.value.trim(); if (!n) return; db.update('users', u.id, { name: n }); toast('Perfil actualizado', 'success'); refresh(); };
  el.querySelectorAll('[data-unsave]').forEach(b => b.onclick = () => { db.update('users', u.id, { saved: (u.saved || []).filter(id => id !== b.dataset.unsave) }); refresh(); });
  return 'Mi cuenta';
}
