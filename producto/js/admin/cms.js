// CMS de la landing: titular, beneficios, comparativa, FAQ, precios/packs, cuenta regresiva,
// garantía, order bump/upsell y cierre. Al guardar, la landing abierta se actualiza en vivo.
import { db, landing, bundles } from '../data/db.js';
import { pageHead } from '../shared/admin-kit.js';
import { escape, money, toast, confirm } from '../../../assets/core/ui.js';
import { LANDING_SEED } from '../data/seed.js';

const TABS = [['hero', 'Hero'], ['beneficios', 'Beneficios'], ['comparativa', 'Comparativa'], ['faq', 'FAQ'], ['precios', 'Precios y packs'], ['oferta', 'Oferta y countdown'], ['garantia', 'Garantía y cierre'], ['checkout', 'Order bump / upsell']];
let tab = 'hero';

const inp = (name, label, value, attrs = '') => `<div class="field"><label for="c-${name}">${label}</label><input class="input" id="c-${name}" name="${name}" value="${escape(value ?? '')}" ${attrs}></div>`;
const area = (name, label, value, attrs = '') => `<div class="field"><label for="c-${name}">${label}</label><textarea class="textarea" id="c-${name}" name="${name}" ${attrs}>${escape(value ?? '')}</textarea></div>`;
const toLocal = iso => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

function listEditor(kind, items) {
  const row = (it, i) => {
    if (kind === 'benefits') return `<div class="cms-item" data-i="${i}"><div class="row"><input class="input ico" name="icon" value="${escape(it.icon)}" aria-label="Ícono"><input class="input" name="title" value="${escape(it.title)}" aria-label="Título">${tools()}</div><textarea class="textarea" name="text" style="min-height:60px" aria-label="Texto">${escape(it.text)}</textarea></div>`;
    if (kind === 'faq') return `<div class="cms-item" data-i="${i}"><div class="row"><input class="input" name="q" value="${escape(it.q)}" aria-label="Pregunta">${tools()}</div><textarea class="textarea" name="a" style="min-height:60px" aria-label="Respuesta">${escape(it.a)}</textarea></div>`;
    if (kind === 'comparison') return `<div class="cms-item" data-i="${i}"><div class="row"><input class="input" name="c0" value="${escape(it[0])}" aria-label="Característica"><input class="input" name="c1" value="${escape(it[1])}" aria-label="Aquilo"><input class="input" name="c2" value="${escape(it[2])}" aria-label="Otras">${tools()}</div></div>`;
    return `<div class="cms-item" data-i="${i}"><div class="row"><input class="input" name="v" value="${escape(it)}" aria-label="Texto">${tools()}</div></div>`;
  };
  const tools = () => `<button type="button" class="btn btn-sm btn-ghost btn-icon" data-up aria-label="Subir">↑</button><button type="button" class="btn btn-sm btn-ghost btn-icon" data-rm aria-label="Quitar">✕</button>`;
  return `<div class="cms-list" data-list="${kind}">${items.map(row).join('')}</div><button type="button" class="btn btn-sm" data-add="${kind}">＋ Agregar</button>`;
}
function readList(root, kind) {
  return [...root.querySelectorAll(`[data-list="${kind}"] .cms-item`)].map(el => {
    const g = n => el.querySelector(`[name="${n}"]`).value.trim();
    if (kind === 'benefits') return { icon: g('icon'), title: g('title'), text: g('text') };
    if (kind === 'faq') return { q: g('q'), a: g('a') };
    if (kind === 'comparison') return [g('c0'), g('c1'), g('c2')];
    return g('v');
  }).filter(x => (Array.isArray(x) ? x[0] : typeof x === 'string' ? x : x.title || x.q));
}
const BLANK = { benefits: { icon: '✨', title: 'Nuevo beneficio', text: '' }, faq: { q: 'Nueva pregunta', a: '' }, comparison: ['Nueva característica', 'Sí', 'No'], heroBullets: 'Nuevo punto', press: 'Medio' };

function body(L) {
  switch (tab) {
    case 'hero': return `${inp('promoBar', 'Barra superior de oferta', L.promoBar)}${inp('headline', 'Titular (H1)', L.headline, 'maxlength="90"')}${area('subheadline', 'Subtítulo', L.subheadline)}
      <div class="field"><span class="label">Puntos del hero</span>${listEditor('heroBullets', L.heroBullets)}</div>
      <div class="field"><span class="label">"Como se vio en"</span>${listEditor('press', L.press)}</div>
      <p class="small muted" style="margin:0">Si hay una prueba A/B activa, el titular que ven los visitantes lo define la prueba.</p>`;
    case 'beneficios': return listEditor('benefits', L.benefits);
    case 'comparativa': return `<p class="small muted" style="margin:0">Escribe "Sí" o "No" para mostrar ✓ / ✕.</p>${listEditor('comparison', L.comparison)}`;
    case 'faq': return listEditor('faq', L.faq);
    case 'precios': return `<div class="stack">${bundles(true).map(b => `<div class="cms-item" data-bundle="${b.id}">
        <div class="row between"><b>Pack de ${b.qty}</b><label class="check small"><input type="checkbox" name="active" ${b.active ? 'checked' : ''}> Visible</label></div>
        <div class="grid-3">${inp(`name-${b.id}`, 'Nombre', b.name)}${inp(`price-${b.id}`, 'Precio oferta (CLP)', b.price, 'type="number" min="0" step="10"')}${inp(`list-${b.id}`, 'Precio normal (CLP)', b.listPrice, 'type="number" min="0" step="10"')}</div>
        <div class="grid-3">${inp(`badge-${b.id}`, 'Cinta (ej: Más popular)', b.badge)}${inp(`gift-${b.id}`, 'Regalo', b.gift)}${inp(`desc-${b.id}`, 'Descripción', b.desc)}</div>
        ${area(`perks-${b.id}`, 'Incluye (una línea por ítem)', b.perks.join('\n'), 'style="min-height:80px"')}
      </div>`).join('')}</div>${inp('expressPrice', 'Precio envío express (packs de 1)', L.expressPrice, 'type="number" min="0"')}`;
    case 'oferta': return `${inp('countdownLabel', 'Texto de la cuenta regresiva', L.countdownLabel)}${inp('countdownEnd', 'La oferta termina el', toLocal(L.countdownEnd), 'type="datetime-local"')}
      <div class="row" style="gap:6px">${[['+24 h', 1], ['+3 días', 3], ['+7 días', 7]].map(([l, d]) => `<button type="button" class="btn btn-sm" data-cd="${d}">${l} desde ahora</button>`).join('')}<button type="button" class="btn btn-sm btn-ghost" data-cd="0">Terminar ahora</button></div>`;
    case 'garantia': return `${inp('guaranteeDays', 'Días de garantía', L.guaranteeDays, 'type="number" min="0"')}${inp('guaranteeTitle', 'Título de la garantía', L.guaranteeTitle)}${area('guaranteeText', 'Texto de la garantía', L.guaranteeText)}
      ${inp('finalTitle', 'Título del cierre', L.finalTitle)}${area('finalText', 'Texto del cierre', L.finalText, 'style="min-height:70px"')}`;
    case 'checkout': return `<div class="split">
      <div class="cms-item"><div class="row between"><b>Order bump (en el pago)</b><label class="switch"><input type="checkbox" name="bumpEnabled" ${L.bump.enabled ? 'checked' : ''} aria-label="Activar order bump"><span></span></label></div>
        ${inp('bumpName', 'Producto', L.bump.name)}${area('bumpDesc', 'Descripción', L.bump.desc, 'style="min-height:60px"')}<div class="grid-2">${inp('bumpPrice', 'Precio', L.bump.price, 'type="number"')}${inp('bumpList', 'Precio normal', L.bump.listPrice, 'type="number"')}</div></div>
      <div class="cms-item"><div class="row between"><b>Upsell post-compra</b><label class="switch"><input type="checkbox" name="upsellEnabled" ${L.upsell.enabled ? 'checked' : ''} aria-label="Activar upsell"><span></span></label></div>
        ${inp('upsellName', 'Oferta', L.upsell.name)}${area('upsellDesc', 'Descripción', L.upsell.desc, 'style="min-height:60px"')}<div class="grid-2">${inp('upsellPrice', 'Precio', L.upsell.price, 'type="number"')}${inp('upsellList', 'Precio normal', L.upsell.listPrice, 'type="number"')}</div></div></div>`;
  }
  return '';
}

function save(form, ctx) {
  const L = structuredClone(landing());
  const v = n => form.elements[n]?.value.trim();
  const n = k => Number(v(k)) || 0;
  switch (tab) {
    case 'hero':
      if (!v('headline')) return toast('El titular no puede quedar vacío', 'warning');
      Object.assign(L, { promoBar: v('promoBar'), headline: v('headline'), subheadline: v('subheadline'), heroBullets: readList(form, 'heroBullets'), press: readList(form, 'press') });
      break;
    case 'beneficios': L.benefits = readList(form, 'benefits'); break;
    case 'comparativa': L.comparison = readList(form, 'comparison'); break;
    case 'faq': L.faq = readList(form, 'faq'); break;
    case 'precios': {
      for (const b of bundles(true)) {
        const price = n(`price-${b.id}`), list = n(`list-${b.id}`);
        if (!price || list < price) return toast(`Revisa los precios del pack de ${b.qty}: el normal debe ser mayor o igual a la oferta`, 'warning');
        db.update('bundles', b.id, { name: v(`name-${b.id}`), price, listPrice: list, badge: v(`badge-${b.id}`), gift: v(`gift-${b.id}`), desc: v(`desc-${b.id}`), perks: v(`perks-${b.id}`).split('\n').map(s => s.trim()).filter(Boolean), active: form.querySelector(`[data-bundle="${b.id}"] [name="active"]`).checked });
      }
      L.expressPrice = n('expressPrice');
      break;
    }
    case 'oferta': L.countdownLabel = v('countdownLabel'); L.countdownEnd = new Date(v('countdownEnd')).toISOString(); break;
    case 'garantia': Object.assign(L, { guaranteeDays: n('guaranteeDays'), guaranteeTitle: v('guaranteeTitle'), guaranteeText: v('guaranteeText'), finalTitle: v('finalTitle'), finalText: v('finalText') }); break;
    case 'checkout':
      L.bump = { enabled: form.elements.bumpEnabled.checked, name: v('bumpName'), desc: v('bumpDesc'), price: n('bumpPrice'), listPrice: n('bumpList') };
      L.upsell = { enabled: form.elements.upsellEnabled.checked, name: v('upsellName'), desc: v('upsellDesc'), price: n('upsellPrice'), listPrice: n('upsellList') };
      break;
  }
  db.setValue('landing', L);
  db.log('Landing', `Se actualizó: ${TABS.find(t => t[0] === tab)[1]}`, ctx.user.id);
  toast('Cambios publicados en la landing', 'success');
  render(form.closest('#view') || document.getElementById('view'), ctx);
}

function render(view, ctx) {
  const L = landing();
  const b = bundles();
  view.innerHTML = `${pageHead('Landing (CMS)', 'Edita el contenido de la página de venta. Ábrela en otra pestaña para ver los cambios al instante.', '<a class="btn" href="index.html" target="_blank" rel="noopener">Ver landing ↗</a><button class="btn btn-ghost" data-restore>Restaurar textos</button>')}
    <div class="tabs cms-tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'active' : ''}" role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="detail-grid">
      <form class="card stack" id="cmsForm" novalidate>${body(L)}<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" type="submit">Guardar y publicar</button></div></form>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Vista previa</h3>
          <div class="preview-frame"><p class="small muted" style="margin:0 0 6px">${escape(L.promoBar)}</p><h3>${escape(L.headline)}</h3><p class="small muted" style="margin:0">${escape(L.subheadline)}</p></div>
          <div class="preview-frame small">${b.map(x => `<div class="sum-line"><span>${escape(x.name)}${x.badge ? ` · <i>${escape(x.badge)}</i>` : ''}</span><b>${money(x.price)}</b></div>`).join('')}</div>
          <p class="small muted" style="margin:0">Fin de la oferta: ${escape(new Date(L.countdownEnd).toLocaleString('es-CL'))}</p>
        </div>
        <div class="card small stack" style="gap:6px"><b>Consejos</b><span class="muted">• Titulares de 6–10 palabras convierten mejor.</span><span class="muted">• Prueba un nuevo titular con el gestor A/B antes de cambiarlo para todos.</span></div>
      </div>
    </div>`;
  const form = view.querySelector('#cmsForm');
  form.addEventListener('submit', e => { e.preventDefault(); save(form, ctx); });
  view.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; render(view, ctx); }
    if (t.dataset.add) {
      const kind = t.dataset.add, list = form.querySelector(`[data-list="${kind}"]`);
      const tmp = document.createElement('div');
      tmp.innerHTML = listEditor(kind, [BLANK[kind]]);
      const item = tmp.querySelector('.cms-item');
      list.appendChild(item);
      item.querySelector('input, textarea').focus();
    }
    if (t.matches('[data-rm]')) t.closest('.cms-item').remove();
    if (t.matches('[data-up]')) { const it = t.closest('.cms-item'); it.previousElementSibling && it.parentElement.insertBefore(it, it.previousElementSibling); }
    if (t.dataset.cd) { const d = +t.dataset.cd; form.elements.countdownEnd.value = toLocal(new Date(Date.now() + (d ? d * 864e5 : -1000)).toISOString()); toast('Fecha ajustada: guarda para publicar', 'info'); }
    if (t.matches('[data-restore]') && await confirm('¿Restaurar todos los textos de la landing a los originales? (No afecta packs ni precios.)', { ok: 'Restaurar' })) {
      const def = LANDING_SEED();
      db.setValue('landing', { ...def, countdownEnd: landing().countdownEnd });
      db.log('Landing', 'Textos restaurados a los originales', ctx.user.id);
      toast('Textos restaurados', 'success'); render(view, ctx);
    }
  };
}

export default { id: 'landing', label: 'Landing (CMS)', ico: '🖋️', group: 'Marketing', roles: ['admin', 'marketing'], live: false, render };
