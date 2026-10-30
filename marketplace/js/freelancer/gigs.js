// Servicios del freelancer: listado, pausa/activación y editor con 3 paquetes y FAQ.
import { escape, money, toast, confirm as ask } from '../../../assets/core/ui.js';
import { pageHead, smartTable, formData, empty } from '../shared/kit.js';
import { activeCategories, category, GIG_STATUS, statusBadge, gigRating, stars, PKGS, PKG_NAMES } from '../shared/market.js';

export function renderGigs(el, { db, me, router }) {
  const rows = db.query('gigs', g => g.freelancerId === me.id).map(g => ({ ...g, r: gigRating(g.id), orders: db.count('orders', o => o.gigId === g.id), from: g.packages.basico.price }));
  el.innerHTML = `${pageHead('Mis servicios', `${rows.filter(r => r.status === 'activo').length} activos`, '<a class="btn btn-primary btn-sm" href="#/servicios/nuevo">+ Nuevo servicio</a>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'f-gigs', rows, search: r => r.title,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(GIG_STATUS).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'title', label: 'Servicio', render: r => `<b>${escape(r.title)}</b><div class="small muted">${escape(category(r.categoryId).name)}${r.moderationNote ? ` · <span class="text-danger">${escape(r.moderationNote)}</span>` : ''}</div>` },
      { key: 'from', label: 'Desde', render: r => money(r.from) },
      { key: 'orders', label: 'Pedidos' },
      { key: 'impressions', label: 'Impresiones' },
      { key: 'rating', label: 'Valoración', sort: r => r.r.avg, render: r => `<span class="small">${stars(r.r.avg, r.r.count)}</span>` },
      { key: 'status', label: 'Estado', render: r => statusBadge(GIG_STATUS, r.status) },
      { key: 'x', label: '', sort: false, render: r => `<div class="actions"><a class="btn btn-sm btn-ghost" href="index.html#/servicio/${r.id}">Ver</a><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${r.status === 'activo' ? '<button class="btn btn-sm btn-ghost" data-act="pause">Pausar</button>' : r.status === 'pausado' ? '<button class="btn btn-sm btn-ghost" data-act="resume">Activar</button>' : ''}<button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>` }
    ],
    onAction: async (act, r) => {
      if (act === 'edit') return router.go('/servicios/' + r.id);
      if (act === 'pause' || act === 'resume') { db.update('gigs', r.id, { status: act === 'pause' ? 'pausado' : 'activo' }); db.log('servicio', `${act === 'pause' ? 'Pausado' : 'Activado'}: ${r.title}`, me.id); return toast(act === 'pause' ? 'Servicio pausado: ya no aparece en búsquedas' : 'Servicio activo nuevamente', 'success'); }
      if (r.orders && db.count('orders', o => o.gigId === r.id && ['pendiente', 'en_progreso', 'entregado', 'revision', 'disputa'].includes(o.status))) return toast('Tiene pedidos en curso. Pausa el servicio en vez de eliminarlo.', 'warning');
      if (await ask(`¿Eliminar "${r.title}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('gigs', r.id); db.log('servicio', `Eliminado: ${r.title}`, me.id); toast('Servicio eliminado', 'success'); }
    }
  });
}

export function renderGigEditor(el, { db, me, router }, id) {
  const isNew = id === 'nuevo';
  const g = isNew ? null : db.get('gigs', id);
  if (!isNew && (!g || g.freelancerId !== me.id)) { el.innerHTML = empty('Servicio no encontrado'); return; }
  const P = g?.packages || { basico: { name: 'Básico', desc: '', price: 20000, days: 3, revisions: 1, features: [] }, estandar: { name: 'Estándar', desc: '', price: 45000, days: 5, revisions: 2, features: [] }, premium: { name: 'Premium', desc: '', price: 90000, days: 7, revisions: 4, features: [] } };
  let faq = (g?.faq || []).map(x => ({ ...x }));
  el.innerHTML = `
    ${pageHead(isNew ? 'Nuevo servicio' : 'Editar servicio', isNew ? 'Los servicios nuevos pasan por moderación antes de publicarse' : statusBadge(GIG_STATUS, g.status), '<a class="btn btn-ghost btn-sm" href="#/servicios">← Mis servicios</a>')}
    <form class="stack" id="ge" novalidate>
      <div class="card"><div class="form-grid">
        <div class="field full"><label for="ge-t">Título *</label><input class="input" id="ge-t" name="title" required maxlength="80" value="${escape(g?.title || '')}" placeholder="Ej: Diseño de logo profesional para tu emprendimiento"></div>
        <div class="field"><label for="ge-c">Categoría</label><select class="select" id="ge-c" name="categoryId">${activeCategories().map(c => `<option value="${c.id}" ${(g?.categoryId || me.mainCategory) === c.id ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ge-tags">Etiquetas (separadas por coma)</label><input class="input" id="ge-tags" name="tags" value="${escape((g?.tags || []).join(', '))}"></div>
        <div class="field full"><label for="ge-d">Descripción *</label><textarea class="textarea" id="ge-d" name="description" required style="min-height:140px">${escape(g?.description || '')}</textarea></div>
      </div></div>
      <h2 class="mb-0">Paquetes</h2>
      <div class="pkg-edit">${PKGS.map(k => `<div class="card stack" style="gap:10px"><b>${PKG_NAMES[k]}</b>
        <div class="field"><label for="${k}-desc">Descripción</label><input class="input" id="${k}-desc" name="${k}_desc" value="${escape(P[k].desc)}"></div>
        <div class="field"><label for="${k}-price">Precio (CLP) *</label><input class="input" id="${k}-price" name="${k}_price" type="number" min="5000" step="1000" required value="${P[k].price}"></div>
        <div class="row" style="gap:8px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="${k}-days">Días</label><input class="input" id="${k}-days" name="${k}_days" type="number" min="1" value="${P[k].days}"></div><div class="field" style="flex:1"><label for="${k}-rev">Revisiones</label><input class="input" id="${k}-rev" name="${k}_rev" type="number" min="0" value="${P[k].revisions}"></div></div>
        <div class="field"><label for="${k}-feat">Incluye (una por línea)</label><textarea class="textarea" id="${k}-feat" name="${k}_feat" style="min-height:90px">${escape(P[k].features.join('\n'))}</textarea></div></div>`).join('')}</div>
      <div class="card"><div class="card-head"><h3>Preguntas frecuentes</h3><button type="button" class="btn btn-sm" data-addfaq>+ Agregar pregunta</button></div><div class="stack" data-faq></div></div>
      <div class="row between"><span class="small muted">Gremio cobra ${db.getValue('settings').commissionPct}% de comisión sobre cada venta.</span><div class="row"><button type="button" class="btn" data-draft>Guardar borrador</button><button class="btn btn-primary" type="submit">${isNew || g.status === 'borrador' || g.status === 'rechazado' ? 'Enviar a revisión' : 'Guardar cambios'}</button></div></div>
    </form>`;
  const faqBox = el.querySelector('[data-faq]');
  const syncFaq = () => { faq = [...faqBox.querySelectorAll('[data-fi]')].map(r => ({ q: r.querySelector('[data-q]').value, a: r.querySelector('[data-a]').value })); };
  const paintFaq = () => {
    faqBox.innerHTML = faq.map((x, i) => `<div class="row" data-fi="${i}" style="align-items:flex-start;flex-wrap:nowrap"><div class="stack" style="flex:1;gap:6px"><input class="input" data-q value="${escape(x.q)}" placeholder="Pregunta" aria-label="Pregunta ${i + 1}"><textarea class="textarea" data-a style="min-height:60px" placeholder="Respuesta" aria-label="Respuesta ${i + 1}">${escape(x.a)}</textarea></div><button type="button" class="btn btn-sm btn-ghost" data-rmfaq="${i}" aria-label="Quitar pregunta">✕</button></div>`).join('') || '<p class="muted small mb-0">Sin preguntas aún.</p>';
    faqBox.querySelectorAll('[data-rmfaq]').forEach(b => b.onclick = () => { syncFaq(); faq.splice(+b.dataset.rmfaq, 1); paintFaq(); });
  };
  paintFaq();
  el.querySelector('[data-addfaq]').onclick = () => { syncFaq(); faq.push({ q: '', a: '' }); paintFaq(); };
  const save = draft => {
    const f = el.querySelector('#ge'), v = formData(f);
    syncFaq();
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim(); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok && !draft) return toast('Completa título, descripción y precios', 'warning');
    const packages = {};
    PKGS.forEach(k => { packages[k] = { name: PKG_NAMES[k], desc: v[k + '_desc'], price: Math.max(5000, +v[k + '_price'] || 0), days: Math.max(1, +v[k + '_days'] || 1), revisions: Math.max(0, +v[k + '_rev'] || 0), features: (v[k + '_feat'] || '').split('\n').map(s => s.trim()).filter(Boolean) }; });
    if (!draft && !(packages.basico.price <= packages.estandar.price && packages.estandar.price <= packages.premium.price)) return toast('Los precios deben ir de menor a mayor (Básico ≤ Estándar ≤ Premium)', 'warning');
    const data = { title: v.title || 'Servicio sin título', categoryId: v.categoryId, tags: (v.tags || '').split(',').map(s => s.trim()).filter(Boolean), description: v.description, packages, faq: faq.filter(x => x.q.trim()) };
    let status = g?.status;
    if (draft) status = g?.status === 'activo' ? 'activo' : 'borrador';
    else if (isNew || ['borrador', 'rechazado'].includes(g.status)) status = 'pendiente';
    if (isNew) { const n = db.insert('gigs', { ...data, freelancerId: me.id, status, featured: false, hue: db.count('gigs') % 6, impressions: 0 }); db.log('servicio', `Nuevo servicio ${status === 'pendiente' ? 'enviado a moderación' : 'en borrador'}: ${data.title}`, me.id); router.go('/servicios'); void n; }
    else { db.update('gigs', g.id, { ...data, status, moderationNote: status === 'pendiente' ? '' : g.moderationNote }); db.log('servicio', `Servicio editado: ${data.title}`, me.id); }
    toast(status === 'pendiente' ? 'Enviado a moderación. Te avisaremos al publicarse.' : draft ? 'Borrador guardado' : 'Cambios guardados', 'success');
    if (!isNew) router.go('/servicios');
  };
  el.querySelector('#ge').addEventListener('submit', e => { e.preventDefault(); save(false); });
  el.querySelector('[data-draft]').onclick = () => save(true);
}
