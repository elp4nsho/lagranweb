// Publicidad: espacios (slots), campañas de banners con vigencia, impresiones y CTR.
import { escape, toast, confirm, date, num, pct } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';
import { art, artPicker, wireArtPickers, pickArtFields } from '../shared/art.js';

export const SLOTS = { 'home-top': 'Portada · superior (6:1)', sidebar: 'Barra lateral (4:3)', 'article-inline': 'Dentro del artículo', footer: 'Pie de página' };
const state = a => (!a.active ? 'off' : new Date(a.end) < new Date() ? 'ended' : new Date(a.start) > new Date() ? 'soon' : 'live');
const ST = { live: ['En circulación', 'success'], soon: ['Programado', 'info'], ended: ['Finalizado', ''], off: ['Pausado', 'warning'] };
const day = d => new Date(d).toISOString().slice(0, 10);

function edit(ctx, a = {}) {
  const m = formDialog({
    title: a.id ? `Editar anuncio · ${a.advertiser}` : 'Nuevo anuncio', size: 'lg',
    body: `<div class="grid-2">${f.text('advertiser', 'Anunciante', a.advertiser, { required: true })}${f.select('slot', 'Espacio', Object.entries(SLOTS), a.slot || 'sidebar')}</div>
      <div class="grid-2">${f.text('title', 'Titular', a.title, { required: true })}${f.text('cta', 'Botón', a.cta || 'Ver más')}</div>
      ${f.text('text', 'Texto', a.text)}
      <div class="grid-2">${f.text('start', 'Inicio', day(a.start || Date.now()), { type: 'date', required: true })}${f.text('end', 'Término', day(a.end || Date.now() + 30 * 864e5), { type: 'date', required: true })}</div>
      ${artPicker('art', a.art)}${f.sw('active', 'Activo', a.id ? a.active : true)}`,
    onSubmit: v => {
      if (v.end < v.start) { toast('La fecha de término debe ser posterior al inicio', 'error'); return false; }
      const data = { ...v, art: pickArtFields(v, 'art'), start: new Date(v.start + 'T00:00').toISOString(), end: new Date(v.end + 'T23:59').toISOString() };
      if (a.id) db.update('ads', a.id, data); else db.insert('ads', { ...data, impressions: 0, clicks: 0 });
      db.log('publicidad', `${a.id ? 'Editó' : 'Creó'} el anuncio de ${v.advertiser}`, ctx.user.id); toast('Anuncio guardado', 'success');
    }
  });
  wireArtPickers(m.el);
}

export default {
  id: 'ads', path: '/publicidad', label: 'Publicidad', icon: '▭', group: 'Negocio', perm: 'ads',
  render(el, ctx) {
    const ads = db.all('ads');
    const imp = ads.reduce((s, a) => s + a.impressions, 0), clk = ads.reduce((s, a) => s + a.clicks, 0);
    el.innerHTML = `${pageHead('Publicidad', `${ads.filter(a => state(a) === 'live').length} anuncios en circulación · CTR global ${pct(clk / Math.max(1, imp) * 100, 2)}`, '<button class="btn btn-primary" data-new>＋ Nuevo anuncio</button>')}
      <div class="grid-4">${Object.entries(SLOTS).map(([k, l]) => { const live = ads.filter(a => a.slot === k && state(a) === 'live'); return `<div class="card"><div class="stat"><span class="label">${escape(l)}</span><span class="value">${live.length}</span><span class="small muted">${live.length ? escape(live.map(a => a.advertiser).join(', ')) : 'Espacio disponible'}</span></div></div>`; }).join('')}</div>
      <div data-t></div>`;
    el.querySelector('[data-new]').onclick = () => edit(ctx);
    table(el.querySelector('[data-t]'), {
      id: 'ads', rows: ads.map(a => ({ ...a, _st: state(a), _ctr: a.clicks / Math.max(1, a.impressions) * 100 })), sort: 'impressions', dir: -1, search: a => `${a.advertiser} ${a.title}`,
      filters: [{ key: 'slot', label: 'Espacio', options: Object.entries(SLOTS) }, { key: '_st', label: 'Estado', options: Object.entries(ST).map(([k, [l]]) => [k, l]) }],
      columns: [
        { key: 'advertiser', label: 'Anuncio', render: a => `<div class="cell-main"><span class="thumb">${art(a.art, { ratio: '4/3' })}</span><span><b>${escape(a.advertiser)}</b><small>${escape(a.title)}</small></span></div>` },
        { key: 'slot', label: 'Espacio', render: a => `<span class="small">${escape(SLOTS[a.slot])}</span>` },
        { key: 'start', label: 'Vigencia', render: a => `<span class="small">${date(a.start)} → ${date(a.end)}</span>` },
        { key: 'impressions', label: 'Impresiones', render: a => num(a.impressions) },
        { key: '_ctr', label: 'CTR', render: a => `${pct(a._ctr, 2)} <small class="muted">(${num(a.clicks)})</small>` },
        { key: '_st', label: 'Estado', render: a => badge(a._st, ST) }
      ],
      actions: a => actBtn('toggle', a.active ? 'Pausar' : 'Activar', a.active ? '⏸' : '▶') + actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
      onRow: a => edit(ctx, db.get('ads', a.id)),
      onAction: async (act, a) => {
        if (act === 'edit') edit(ctx, db.get('ads', a.id));
        if (act === 'toggle') { db.update('ads', a.id, { active: !a.active }); toast(a.active ? 'Anuncio pausado' : 'Anuncio activado', 'success'); }
        if (act === 'del' && await confirm(`¿Eliminar el anuncio de ${a.advertiser}?`, { danger: true, ok: 'Eliminar' })) { db.remove('ads', a.id); toast('Anuncio eliminado', 'success'); }
      },
      csv: { name: 'publicidad', map: a => ({ anunciante: a.advertiser, espacio: SLOTS[a.slot], inicio: date(a.start), termino: date(a.end), impresiones: a.impressions, clics: a.clicks, ctr: a._ctr.toFixed(2), estado: ST[a._st][0] }) }
    });
  }
};
