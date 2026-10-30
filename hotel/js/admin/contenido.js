// CMS del sitio: textos de portada/spa/restaurante, ofertas, extras, tratamientos y carta del restaurante.
import { escape, toast, confirm, formModal, money } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { settings, saveSettings } from '../shared/hotel.js';

const COLS = {
  offers: { label: 'Ofertas', title: o => o.title, sub: o => `${o.code} · -${o.discountPct}% · mín. ${o.minNights} noches`, fields: o => [
    { name: 'title', label: 'Título', required: true, value: o?.title }, { name: 'desc', label: 'Descripción', type: 'textarea', value: o?.desc },
    { name: 'code', label: 'Código promocional', required: true, value: o?.code }, { name: 'discountPct', label: 'Descuento %', type: 'number', required: true, value: o?.discountPct ?? 10 },
    { name: 'minNights', label: 'Noches mínimas', type: 'number', value: o?.minNights ?? 1 }, { name: 'tone', label: 'Color', type: 'select', options: ['primary', 'accent', 'success', 'warning', 'info'], value: o?.tone || 'primary' },
    { name: 'active', label: 'Publicada', type: 'checkbox', value: o ? o.active : true }] },
  extras: { label: 'Extras del motor de reservas', title: x => `${x.icon} ${x.name}`, sub: x => `${money(x.price)} · ${{ 'persona-noche': 'por persona/noche', noche: 'por noche', estadia: 'por estadía' }[x.per]}`, fields: x => [
    { name: 'name', label: 'Nombre', required: true, value: x?.name }, { name: 'desc', label: 'Descripción', value: x?.desc }, { name: 'icon', label: 'Ícono', value: x?.icon || '✨' },
    { name: 'price', label: 'Precio', type: 'number', required: true, value: x?.price ?? 10000 }, { name: 'per', label: 'Cobro', type: 'select', options: [['estadia', 'Por estadía'], ['noche', 'Por noche'], ['persona-noche', 'Por persona y noche']], value: x?.per || 'estadia' },
    { name: 'active', label: 'Disponible', type: 'checkbox', value: x ? x.active !== false : true }] },
  spa: { label: 'Tratamientos del spa', title: s => `${s.icon} ${s.name}`, sub: s => `${s.mins} min · ${money(s.price)}`, fields: s => [
    { name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'icon', label: 'Ícono', value: s?.icon || '💆' }, { name: 'mins', label: 'Minutos', type: 'number', value: s?.mins ?? 60 }, { name: 'price', label: 'Precio', type: 'number', required: true, value: s?.price ?? 50000 }] },
  dishes: { label: 'Carta del restaurante', title: d => d.name, sub: d => `${d.cat} · ${money(d.price)}`, fields: d => [
    { name: 'name', label: 'Plato', required: true, value: d?.name }, { name: 'cat', label: 'Categoría', type: 'select', options: ['Entradas', 'Fondos', 'Postres'], value: d?.cat || 'Fondos' }, { name: 'price', label: 'Precio', type: 'number', required: true, value: d?.price ?? 12000 }] }
};

export default {
  id: 'contenido', label: 'Contenido del sitio', icon: '📝', group: 'Sitio web', roles: ['admin'], watch: ['offers', 'extras', 'spa', 'dishes'],
  render(el, ctx) {
    const tab = ctx.params.sub || 'textos';
    const paint = () => {
      const c = settings();
      el.innerHTML = `${pageHead('Contenido del sitio', 'Lo que publiques aquí aparece de inmediato en el sitio público', '<a class="btn btn-sm" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a>')}
        <div class="tabs"><a class="tab ${tab === 'textos' ? 'active' : ''}" href="#/contenido/textos">Textos</a>${Object.entries(COLS).map(([k, v]) => `<a class="tab ${tab === k ? 'active' : ''}" href="#/contenido/${k}">${v.label.split(' ')[0]}</a>`).join('')}</div>
        ${tab === 'textos' ? `<form class="card stack" id="tx">
          ${[['heroTitle', 'Título de portada'], ['heroText', 'Bajada de portada'], ['announcement', 'Aviso superior (vacío para ocultar)'], ['about', 'La casona (nosotros)'], ['spaText', 'Texto del spa'], ['restaurantText', 'Texto del restaurante'], ['tagline', 'Lema']].map(([k, l]) => `<div class="field"><label for="tx-${k}">${l}</label><textarea class="textarea" rows="2" id="tx-${k}" name="${k}">${escape(c[k] || '')}</textarea></div>`).join('')}
          <button class="btn btn-primary">Publicar textos</button></form>`
        : `<div class="row between"><b>${COLS[tab].label}</b><button class="btn btn-primary btn-sm" data-new>+ Agregar</button></div>
          <div class="grid-auto">${db.all(tab).map(x => `<div class="card stack"><b>${escape(COLS[tab].title(x))}</b><small class="muted">${escape(COLS[tab].sub(x))}</small>${x.desc ? `<small>${escape(x.desc)}</small>` : ''}${x.active === false ? '<span class="badge">Oculto</span>' : ''}<div class="row"><button class="btn btn-sm" data-ed="${x.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${x.id}">Eliminar</button></div></div>`).join('')}</div>`}`;
    };
    el.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target; const patch = {};
      ['heroTitle', 'heroText', 'announcement', 'about', 'spaText', 'restaurantText', 'tagline'].forEach(k => { patch[k] = f.elements[k].value.trim(); });
      saveSettings(patch); db.log('contenido', 'Textos del sitio publicados', ctx.user.id); toast('Textos publicados', 'success');
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || tab === 'textos') return;
      const C = COLS[tab];
      if (b.hasAttribute('data-new') || b.dataset.ed) {
        const row = b.dataset.ed ? db.get(tab, b.dataset.ed) : null;
        const v = await formModal({ title: row ? 'Editar' : 'Agregar', fields: C.fields(row) });
        if (!v) return;
        if (tab === 'offers') v.code = v.code.toUpperCase().replace(/\s/g, '');
        row ? db.update(tab, row.id, v) : db.insert(tab, v);
        db.log('contenido', `${C.label}: ${row ? 'editado' : 'agregado'} ${v.title || v.name}`, ctx.user.id); toast('Publicado', 'success');
      }
      if (b.dataset.del) { const row = db.get(tab, b.dataset.del); if (await confirm(`¿Eliminar "${row.title || row.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove(tab, row.id); db.log('contenido', `${C.label}: eliminado ${row.title || row.name}`, ctx.user.id); } }
    });
    paint();
    return { refresh: paint };
  }
};
