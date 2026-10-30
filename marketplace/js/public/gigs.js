// Listado con filtros, detalle de servicio con paquetes y checkout con pago en garantía.
import { db, auth } from '../data/db.js';
import { escape, money, date, toast, norm, sleep } from '../../../assets/core/ui.js';
import { activeCategories, category, gigCard, gigRating, levelOf, levelBadge, stars, user, cover, quote, settings, freelancerStats, PKGS, PKG_NAMES, LEVELS } from '../shared/market.js';
import { favState, wireFavs } from './favs.js';

const SORTS = [['rel', 'Relevancia'], ['rating', 'Mejor valorados'], ['orders', 'Más pedidos'], ['price_asc', 'Precio: menor a mayor'], ['price_desc', 'Precio: mayor a menor']];

export function renderBrowse(el, q = {}) {
  const cats = activeCategories();
  const all = db.query('gigs', g => g.status === 'activo' && cats.some(c => c.id === g.categoryId) && user(g.freelancerId)?.active !== false);
  const meta = new Map(all.map(g => [g.id, { r: gigRating(g.id), lv: levelOf(g.freelancerId).level, orders: db.count('orders', o => o.gigId === g.id) }]));
  let list = all.filter(g => {
    const m = meta.get(g.id), p = g.packages.basico;
    if (q.cat && g.categoryId !== q.cat) return false;
    if (q.q && !norm(`${g.title} ${g.tags.join(' ')} ${user(g.freelancerId)?.name} ${category(g.categoryId).name}`).includes(norm(q.q))) return false;
    if (q.min && p.price < +q.min) return false;
    if (q.max && p.price > +q.max) return false;
    if (q.days && p.days > +q.days) return false;
    if (q.rating && m.r.avg < +q.rating) return false;
    if (q.level && m.lv !== q.level) return false;
    return true;
  });
  const sort = q.sort || 'rel';
  const score = g => { const m = meta.get(g.id); return m.r.avg * Math.log(2 + m.r.count) + m.orders * 0.05 + (g.featured ? 1 : 0); };
  list.sort({ rel: (a, b) => score(b) - score(a), rating: (a, b) => meta.get(b.id).r.avg - meta.get(a.id).r.avg, orders: (a, b) => meta.get(b.id).orders - meta.get(a.id).orders, price_asc: (a, b) => a.packages.basico.price - b.packages.basico.price, price_desc: (a, b) => b.packages.basico.price - a.packages.basico.price }[sort] || (() => 0));
  const set = patch => { const n = { ...q, ...patch }; Object.keys(n).forEach(k => (n[k] === '' || n[k] == null) && delete n[k]); location.hash = '#/servicios' + (Object.keys(n).length ? '?' + new URLSearchParams(n) : ''); };
  const chip = (key, val, label) => `<button class="chip ${String(q[key] || '') === String(val) ? 'active' : ''}" data-k="${key}" data-v="${val}">${label}</button>`;
  const fav = favState();
  const cat = q.cat ? category(q.cat) : null;
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">${cat ? escape(cat.icon + ' ' + cat.name) : 'Explorar'}</span><h1>${q.q ? `Resultados para “${escape(q.q)}”` : cat ? escape(cat.description) : 'Servicios freelance'}</h1></div></section>
  <section class="section" style="padding-top:8px"><div class="container browse">
    <aside class="card filters" aria-label="Filtros">
      <form data-q><label class="label" for="bq">Buscar</label><input class="input" id="bq" name="q" type="search" value="${escape(q.q || '')}" placeholder="Palabra clave"></form>
      <div><span class="label">Categoría</span><div class="chips">${chip('cat', '', 'Todas')}${cats.map(c => chip('cat', c.id, c.name)).join('')}</div></div>
      <div><span class="label">Precio desde (paquete básico)</span><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="input" type="number" min="0" step="5000" placeholder="Mín" value="${escape(q.min || '')}" data-f="min" aria-label="Precio mínimo"><input class="input" type="number" min="0" step="5000" placeholder="Máx" value="${escape(q.max || '')}" data-f="max" aria-label="Precio máximo"></div></div>
      <div><span class="label">Tiempo de entrega</span><div class="chips">${chip('days', '', 'Cualquiera')}${chip('days', 1, '24 h')}${chip('days', 3, 'Hasta 3 días')}${chip('days', 7, 'Hasta 7 días')}</div></div>
      <div><span class="label">Valoración</span><div class="chips">${chip('rating', '', 'Todas')}${chip('rating', 4, '4+ ★')}${chip('rating', 4.5, '4,5+ ★')}</div></div>
      <div><span class="label">Nivel del freelancer</span><div class="chips">${chip('level', '', 'Todos')}${Object.entries(LEVELS).map(([k, l]) => chip('level', k, l)).join('')}</div></div>
      <a class="btn btn-ghost btn-sm" href="#/servicios">Limpiar filtros</a>
    </aside>
    <div class="stack">
      <div class="row between"><span class="muted" data-count>${list.length} servicio${list.length === 1 ? '' : 's'}</span><label class="row small" style="gap:8px">Ordenar <select class="select" data-sort style="width:auto">${SORTS.map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="gig-grid" data-list>${list.map(g => gigCard(g, { fav: fav ? fav.includes(g.id) : null })).join('') || '<div class="card empty" style="grid-column:1/-1"><span class="icon">🔍</span>No encontramos servicios con esos filtros.<br><a href="#/proyectos/nuevo">Publica un proyecto</a> y deja que los freelancers te propongan.</div>'}</div>
    </div>
  </div></section>`;
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => set({ [b.dataset.k]: b.dataset.v }));
  el.querySelectorAll('[data-f]').forEach(i => i.onchange = () => set({ [i.dataset.f]: i.value }));
  el.querySelector('[data-sort]').onchange = e => set({ sort: e.target.value });
  el.querySelector('[data-q]').onsubmit = e => { e.preventDefault(); set({ q: e.currentTarget.q.value.trim() }); };
  wireFavs(el);
}

export function renderGig(el, id, q = {}) {
  const g = db.get('gigs', id);
  const me = auth.current();
  const isOwner = me && g && me.id === g.freelancerId, isStaff = me && ['admin', 'moderador', 'soporte'].includes(me.role);
  if (!g || (g.status !== 'activo' && !isOwner && !isStaff)) { el.innerHTML = '<section class="section"><div class="container"><div class="empty"><h2>Servicio no disponible</h2><a class="btn btn-primary" href="#/servicios">Explorar servicios</a></div></div></section>'; return; }
  const f = user(g.freelancerId), r = gigRating(g.id), lv = levelOf(f.id), fs = freelancerStats(f.id);
  const reviews = db.query('reviews', x => x.gigId === g.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let pkg = PKGS.includes(q.pkg) ? q.pkg : 'estandar';
  const s = settings();
  const fav = favState();
  const buybox = () => { const p = g.packages[pkg], qt = quote(p.price, s); return `
      <div class="tabs pkg-tabs" role="tablist">${PKGS.map(k => `<button class="tab ${k === pkg ? 'active' : ''}" role="tab" aria-selected="${k === pkg}" data-pkg="${k}">${PKG_NAMES[k]}</button>`).join('')}</div>
      <div class="stack" style="gap:10px;margin-top:14px">
        <div class="row between"><b>${escape(p.name)}</b><span class="price big-num" style="font-size:26px">${money(p.price)}</span></div>
        <p class="small muted mb-0">${escape(p.desc)}</p>
        <div class="mini-stats"><span>⏱ ${p.days} día${p.days > 1 ? 's' : ''} de entrega</span><span>↻ ${p.revisions} revision${p.revisions === 1 ? '' : 'es'}</span></div>
        <ul class="pkg-feats">${p.features.map(x => `<li>${escape(x)}</li>`).join('')}</ul>
        <div class="small muted">+ cargo por servicio ${s.serviceFeePct}% (${money(qt.serviceFee)}) · Total ${money(qt.total)}</div>
        ${isOwner || isStaff ? '<div class="notice small">Vista previa: no puedes comprar este servicio con tu cuenta.</div>' : `<a class="btn btn-primary btn-lg btn-block" href="#/checkout/${g.id}/${pkg}" data-buy>Continuar (${money(qt.total)})</a>`}
        <div class="escrow-box small"><span class="ico" aria-hidden="true">🛡️</span><span>Pago protegido: tu dinero queda retenido hasta que apruebes la entrega.</span></div>
      </div>`; };
  el.innerHTML = `
  <section class="section" style="padding-top:28px"><div class="container">
    <nav class="small muted" aria-label="Ruta"><a href="#/servicios">Servicios</a> › <a href="#/servicios?cat=${g.categoryId}">${escape(category(g.categoryId).name)}</a></nav>
    ${g.status !== 'activo' ? `<div class="notice warn" style="margin-top:12px">Este servicio está <b>${escape(g.status)}</b> y no es visible públicamente.</div>` : ''}
    <div class="gig-detail" style="margin-top:16px">
      <div class="stack">
        <h1 style="font-size:clamp(26px,3.6vw,40px);margin:0">${escape(g.title)}</h1>
        <div class="row" style="gap:10px"><span class="avatar" style="--av:${escape(f.color)}">${escape(f.name.split(' ').map(w => w[0]).join(''))}</span><a href="#/freelancer/${f.id}"><b>${escape(f.name)}</b></a>${levelBadge(lv.level)}${f.verified ? '<span class="badge badge-success">Verificado</span>' : ''}<span class="small">${stars(r.avg, r.count)}</span>${fav ? `<button class="btn btn-sm btn-ghost" data-fav="${g.id}" aria-pressed="${fav.includes(g.id)}">${fav.includes(g.id) ? '♥ En favoritos' : '♡ Guardar'}</button>` : ''}</div>
        <div class="gig-hero">${cover(g, { big: true })}</div>
        <div class="card"><h2>Sobre este servicio</h2>${g.description.split(/\n\n+/).map(p => `<p>${escape(p)}</p>`).join('')}<div class="row" style="gap:6px">${g.tags.map(t => `<a class="chip" href="#/servicios?q=${encodeURIComponent(t)}">${escape(t)}</a>`).join('')}</div></div>
        <div class="card"><h2>Compara los paquetes</h2><div class="table-wrap"><table class="table compare"><thead><tr><th></th>${PKGS.map(k => `<th>${PKG_NAMES[k]}</th>`).join('')}</tr></thead><tbody>
          <tr><td>Precio</td>${PKGS.map(k => `<td><b>${money(g.packages[k].price)}</b></td>`).join('')}</tr>
          <tr><td>Descripción</td>${PKGS.map(k => `<td class="small">${escape(g.packages[k].desc)}</td>`).join('')}</tr>
          <tr><td>Entrega</td>${PKGS.map(k => `<td>${g.packages[k].days} días</td>`).join('')}</tr>
          <tr><td>Revisiones</td>${PKGS.map(k => `<td>${g.packages[k].revisions}</td>`).join('')}</tr>
          ${[...new Set(PKGS.flatMap(k => g.packages[k].features))].map(ft => `<tr><td class="small">${escape(ft)}</td>${PKGS.map(k => `<td>${g.packages[k].features.includes(ft) ? '<span class="text-success">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
          <tr><td></td>${PKGS.map(k => `<td>${isOwner || isStaff ? '' : `<a class="btn btn-sm ${k === 'estandar' ? 'btn-primary' : ''}" href="#/checkout/${g.id}/${k}">Elegir</a>`}</td>`).join('')}</tr>
        </tbody></table></div></div>
        ${g.faq?.length ? `<div class="card faq"><h2>Preguntas frecuentes</h2>${g.faq.map(x => `<details><summary>${escape(x.q)}</summary><p class="muted" style="margin:8px 0 0">${escape(x.a)}</p></details>`).join('')}</div>` : ''}
        <div class="card"><div class="card-head"><h2>Reseñas</h2><span>${stars(r.avg, r.count)}</span></div>
          <ul class="list">${reviews.slice(0, 8).map(x => { const c = user(x.clientId); return `<li class="review"><span class="avatar" style="--size:32px;--av:${escape(c?.color || 'var(--accent)')}">${escape((c?.name || '?')[0])}</span><span><b>${escape(c?.name || 'Cliente')}</b> <span class="stars small">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)}</span> <span class="small muted">· ${date(x.createdAt)}</span><br>${escape(x.text)}${x.reply ? `<div class="small muted" style="margin-top:4px">↳ Respuesta: ${escape(x.reply)}</div>` : ''}</span></li>`; }).join('') || '<li class="muted">Aún no hay reseñas para este servicio.</li>'}</ul></div>
      </div>
      <aside class="stack buybox">
        <div class="card" data-buybox>${buybox()}</div>
        <div class="card"><div class="row" style="gap:12px;flex-wrap:nowrap"><span class="avatar" style="--size:52px;--av:${escape(f.color)}">${escape(f.name.split(' ').map(w => w[0]).join(''))}</span><div style="min-width:0"><b>${escape(f.name)}</b><div class="small muted">${escape(f.title)}</div></div></div>
          <dl class="dl small" style="margin-top:12px"><dt>Desde</dt><dd>${escape(f.city || '')}</dd><dt>Responde en</dt><dd>~${f.responseHrs} h</dd><dt>Pedidos completados</dt><dd>${fs.done}</dd><dt>Entregas a tiempo</dt><dd>${Math.round(fs.onTime * 100)}%</dd></dl>
          <a class="btn btn-block" href="#/freelancer/${f.id}" style="margin-top:12px">Ver perfil y portafolio</a></div>
      </aside>
    </div>
  </div></section>`;
  const box = el.querySelector('[data-buybox]');
  box.addEventListener('click', e => { const t = e.target.closest('[data-pkg]'); if (t) { pkg = t.dataset.pkg; box.innerHTML = buybox(); } });
  wireFavs(el);
}

export function renderCheckout(el, id, pkg) {
  const g = db.get('gigs', id), me = auth.current();
  if (!g || g.status !== 'activo' || !PKGS.includes(pkg)) { el.innerHTML = '<section class="section"><div class="container empty">Servicio no disponible</div></section>'; return; }
  if (!me || me.role !== 'cliente') {
    el.innerHTML = `<section class="section"><div class="container" style="max-width:560px"><div class="card stack" style="text-align:center;align-items:center"><span class="tile-icon">🔒</span><h2>Ingresa como cliente para contratar</h2><p class="muted">${me ? 'Tu cuenta actual no es de cliente.' : 'Necesitas una cuenta de cliente (es gratis).'}</p><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/checkout/' + id + '/' + pkg)}">Ingresar o crear cuenta</a><a href="#/servicio/${id}">← Volver al servicio</a></div></div></section>`;
    return;
  }
  const p = g.packages[pkg], qt = quote(p.price), f = user(g.freelancerId);
  el.innerHTML = `
  <section class="section" style="padding-top:28px"><div class="container" style="max-width:980px">
    <a class="small" href="#/servicio/${id}">← Volver al servicio</a><h1 style="font-size:clamp(26px,3.6vw,38px)">Confirmar pedido</h1>
    <div class="split">
      <form class="card stack" id="co" novalidate>
        <h3 class="mb-0">1. Requisitos para el freelancer</h3>
        <div class="field"><label for="co-req">Cuéntale a ${escape(f.name.split(' ')[0])} lo que necesitas *</label><textarea class="textarea" id="co-req" name="requirements" required placeholder="Objetivo, público, estilo, referencias, plazos…"></textarea></div>
        <div class="field"><label for="co-file">Adjuntar archivos (simulado)</label><input class="input" id="co-file" type="file" name="file" multiple></div>
        <h3 class="mb-0">2. Pago</h3>
        <div class="field"><label for="co-m">Medio de pago</label><select class="select" id="co-m" name="method"><option>Tarjeta de crédito</option><option>Tarjeta de débito (Webpay)</option><option>Transferencia</option></select></div>
        <label class="check"><input type="checkbox" name="terms" required> Acepto los términos y la política de pagos protegidos.</label>
        <button class="btn btn-primary btn-lg" type="submit">Pagar ${money(qt.total)}</button>
        <p class="small muted mb-0">Pago simulado: no se realizará ningún cargo.</p>
      </form>
      <aside class="card stack" style="gap:8px">
        <div class="gig-cover" style="border-radius:var(--radius-sm);border:var(--border-w) solid var(--line)">${cover(g)}</div>
        <b>${escape(g.title)}</b><span class="small muted">Paquete ${PKG_NAMES[pkg]} · ${p.days} días · ${p.revisions} revisiones</span>
        <div class="summary-row"><span>Precio del paquete</span><span>${money(qt.price)}</span></div>
        <div class="summary-row"><span>Cargo por servicio (${qt.feePct}%)</span><span data-fee>${money(qt.serviceFee)}</span></div>
        <div class="summary-row total"><span>Total</span><span data-total>${money(qt.total)}</span></div>
        <div class="escrow-box small notice"><span class="ico" aria-hidden="true">🛡️</span><span>Retendremos ${money(qt.total)} en garantía. ${escape(f.name.split(' ')[0])} recibe el pago solo cuando apruebes la entrega.</span></div>
      </aside>
    </div>
  </div></section>`;
  el.querySelector('#co').addEventListener('submit', async e => {
    e.preventDefault();
    const fm = e.currentTarget, req = fm.requirements.value.trim();
    fm.requirements.classList.toggle('invalid', !req);
    if (!req) return toast('Describe lo que necesitas', 'warning');
    if (!fm.terms.checked) return toast('Debes aceptar los términos', 'warning');
    const btn = fm.querySelector('button[type=submit]'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando pago…';
    await sleep(800);
    const q2 = quote(p.price), now = new Date().toISOString();
    const files = [...fm.file.files].map(x => ({ name: x.name, size: `${Math.max(1, Math.round(x.size / 1024))} KB` }));
    const code = `GR-${10230 + db.count('orders') + 1}`;
    const o = db.insert('orders', { code, gigId: g.id, title: g.title, clientId: me.id, freelancerId: g.freelancerId, categoryId: g.categoryId, pkg, price: q2.price, serviceFee: q2.serviceFee, commission: q2.commission, feePct: q2.feePct, comPct: q2.comPct, total: q2.total, status: 'pendiente', escrow: 'retenido', due: new Date(Date.now() + p.days * 864e5).toISOString(), revisionsMax: p.revisions, revisionsUsed: 0, requirements: req, deliveries: [], timeline: [{ at: now, text: `Pedido realizado y pago de ${money(q2.total)} retenido en garantía (${fm.method.value})` }], readBy: { [me.id]: now } });
    if (files.length) db.insert('messages', { orderId: o.id, from: me.id, text: 'Adjunto archivos para comenzar.', files, at: now });
    db.log('pedido', `Nuevo pedido ${code}: ${g.title} (${money(q2.total)})`, me.id);
    toast('¡Pago realizado! Tu pedido fue enviado al freelancer.', 'success');
    location.href = `cliente.html#/pedidos/${o.id}`;
  });
}
