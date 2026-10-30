// Contenido del sitio: billboard de portada, secciones, ofertas, lanzamientos, testimonios y anuncio.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { brand, model, campaignLive } from '../shared/domain.js';
import { carSVG } from '../shared/car.js';
import { log, opts, modelOpts } from './kit.js';
import { fdate } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const SECTIONS = [['tools', 'Herramientas rápidas'], ['brands', 'Marcas'], ['offers', 'Ofertas y bonos'], ['launches', 'Próximos lanzamientos'], ['showrooms', 'Sucursales'], ['testimonials', 'Testimonios']];
export function renderCMS(v) {
  const c = db.getValue('cms'), s = db.getValue('settings');
  const launches = db.query('models', m => m.status === 'lanzamiento');
  v.innerHTML = `${pageHead('Contenido del sitio', 'Todo lo que edites aquí se ve al instante en la portada pública.', `<a class="btn" href="index.html" target="_blank">${icon('eye', 16)} Ver portada</a>`)}
  <div class="card stack"><div class="card-title"><h3>${icon('megaphone', 18)} Barra de anuncio</h3></div><div class="row"><input class="input grow" data-ann value="${escape(s.announcement || '')}" aria-label="Anuncio" placeholder="Vacío = sin barra"><button class="btn btn-primary" data-save-ann>Guardar</button></div></div>
  <div class="card stack"><div class="card-title"><h3>${icon('sparkle', 18)} Billboard de portada (${c.hero.length} diapositivas)</h3><div class="row"><label class="small">Rotar cada <input class="input inline-edit" type="number" min="3" max="20" data-interval value="${c.heroInterval || 6}" style="max-width:70px"> s</label><button class="btn btn-sm" data-add>${icon('plus', 15)} Agregar</button></div></div>
    ${c.hero.map((h, i) => { const m = model(h.modelId); const col = m?.colors.find(x => x.id === h.colorId) || m?.colors[0]; return `<div class="appt-row" data-slide="${i}"><div style="width:150px">${m ? carSVG({ body: m.body, paint: col.hex, fuel: m.fuel }) : ''}</div>
      <div class="grow form-grid"><div class="field"><label>Modelo</label><select class="select" data-k="modelId">${opts(modelOpts(x => x.status === 'activo'), h.modelId)}</select></div><div class="field"><label>Color</label><select class="select" data-k="colorId">${opts((m?.colors || []).map(x => [x.id, x.name]), h.colorId)}</select></div><div class="field"><label>Título</label><input class="input" data-k="title" value="${escape(h.title)}"></div><div class="field"><label>Etiqueta</label><input class="input" data-k="badge" value="${escape(h.badge || '')}"></div><div class="field" style="grid-column:1/-1"><label>Texto</label><input class="input" data-k="text" value="${escape(h.text)}"></div></div>
      <div class="acts-cell" style="flex-direction:column"><button class="btn btn-sm btn-ghost btn-icon" data-up="${i}" aria-label="Subir" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-sm btn-ghost btn-icon" data-down="${i}" aria-label="Bajar" ${i < c.hero.length - 1 ? '' : 'disabled'}>↓</button><button class="btn btn-sm btn-ghost btn-icon" data-rm="${i}" aria-label="Quitar">${icon('trash', 15)}</button></div></div>`; }).join('')}</div>
  <div class="grid-2">
    <div class="card stack"><h3>${icon('grid', 18)} Secciones de la portada</h3>${SECTIONS.map(([k, l]) => `<label class="row between"><span>${l}</span><span class="switch"><input type="checkbox" data-sec="${k}" ${c.sections[k] !== false ? 'checked' : ''} aria-label="${l}"><span></span></span></label>`).join('')}
      <div class="field"><label>Título sección ofertas</label><input class="input" data-title="offersTitle" value="${escape(c.offersTitle)}"></div><div class="field"><label>Título sección lanzamientos</label><input class="input" data-title="launchesTitle" value="${escape(c.launchesTitle)}"></div></div>
    <div class="stack"><div class="card"><div class="card-title"><h3>${icon('rocket', 18)} Lanzamientos</h3><a class="small" href="#/modelos">Gestionar en Modelos</a></div>${launches.map(m => `<div class="row between"><span><b>${escape(brand(m.brandId)?.name)} ${escape(m.name)}</b><br><small class="muted">${fdate(m.launchDate)}</small></span><input class="input inline-edit" type="date" data-launch="${m.id}" value="${m.launchDate}" aria-label="Fecha"></div>`).join('<hr>') || '<p class="muted">Sin lanzamientos. Marca un modelo como "Próximo lanzamiento".</p>'}</div>
      <div class="card"><div class="card-title"><h3>${icon('tag', 18)} Ofertas en portada</h3><a class="small" href="#/campanas">Campañas</a></div><ul class="feed">${db.query('campaigns', x => x.featured).map(x => `<li><span class="dot"></span><span>${escape(x.name)} ${campaignLive(x) ? '<span class="badge badge-success">vigente</span>' : '<span class="badge">no vigente</span>'}</span></li>`).join('')}</ul></div></div>
  </div>
  <div class="card stack"><div class="card-title"><h3>${icon('chat', 18)} Testimonios</h3><button class="btn btn-sm" data-addt>${icon('plus', 15)} Agregar</button></div>${c.testimonials.map(([n, t], i) => `<div class="row" data-t="${i}"><input class="input" style="max-width:180px" data-tn value="${escape(n)}" aria-label="Nombre"><input class="input grow" data-tt value="${escape(t)}" aria-label="Testimonio"><button class="btn btn-sm btn-ghost btn-icon" data-rmt="${i}" aria-label="Quitar">${icon('trash', 15)}</button></div>`).join('')}</div>`;
  const save = (patch, msg) => { db.setValue('cms', { ...db.getValue('cms'), ...patch }); log('contenido', msg); toast('Publicado en el sitio', 'success', 1400); };
  const hero = () => db.getValue('cms').hero.map(h => ({ ...h }));
  v.querySelector('[data-save-ann]').onclick = () => { db.setValue('settings', { ...db.getValue('settings'), announcement: v.querySelector('[data-ann]').value.trim() }); log('contenido', 'Anuncio actualizado'); toast('Anuncio publicado', 'success'); };
  v.addEventListener('change', e => {
    const t = e.target, sl = t.closest('[data-slide]');
    if (sl && t.dataset.k) { const h = hero(), i = +sl.dataset.slide; h[i][t.dataset.k] = t.value; if (t.dataset.k === 'modelId') { const m = model(t.value); h[i].colorId = m.colors[1]?.id || m.colors[0].id; h[i].title = `${brand(m.brandId).name} ${m.name}`; } save({ hero: h }, `Billboard #${i + 1}: ${t.dataset.k}`); }
    if (t.dataset.sec) save({ sections: { ...db.getValue('cms').sections, [t.dataset.sec]: t.checked } }, `Sección ${t.dataset.sec} ${t.checked ? 'visible' : 'oculta'}`);
    if (t.dataset.title) save({ [t.dataset.title]: t.value }, `Título ${t.dataset.title}`);
    if (t.dataset.interval !== undefined) save({ heroInterval: Math.max(3, Math.min(20, +t.value || 6)) }, 'Intervalo del billboard');
    if (t.dataset.launch) { db.update('models', t.dataset.launch, { launchDate: t.value }); log('contenido', 'Fecha de lanzamiento'); }
    const tr = t.closest('[data-t]'); if (tr) { const ts = db.getValue('cms').testimonials.map(x => [...x]); ts[+tr.dataset.t] = [tr.querySelector('[data-tn]').value, tr.querySelector('[data-tt]').value]; save({ testimonials: ts }, 'Testimonio editado'); }
  });
  v.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return; const h = hero();
    if (b.dataset.add !== undefined) { const m = db.find('models', x => x.status === 'activo' && !h.some(y => y.modelId === x.id)); save({ hero: [...h, { modelId: m.id, colorId: m.colors[1]?.id || m.colors[0].id, title: `${brand(m.brandId).name} ${m.name}`, text: m.tagline, badge: 'Nuevo' }] }, 'Diapositiva agregada'); }
    if (b.dataset.up) { const i = +b.dataset.up; [h[i - 1], h[i]] = [h[i], h[i - 1]]; save({ hero: h }, 'Orden del billboard'); }
    if (b.dataset.down) { const i = +b.dataset.down; [h[i + 1], h[i]] = [h[i], h[i + 1]]; save({ hero: h }, 'Orden del billboard'); }
    if (b.dataset.rm) { if (h.length <= 1) return toast('Debe quedar al menos una diapositiva', 'warning'); if (!await confirm('¿Quitar esta diapositiva?', { danger: true })) return; h.splice(+b.dataset.rm, 1); save({ hero: h }, 'Diapositiva eliminada'); }
    if (b.dataset.addt !== undefined) save({ testimonials: [...db.getValue('cms').testimonials, ['Nombre', 'Nuevo testimonio.']] }, 'Testimonio agregado');
    if (b.dataset.rmt) { const ts = db.getValue('cms').testimonials.filter((_, i) => i !== +b.dataset.rmt); save({ testimonials: ts }, 'Testimonio eliminado'); }
  });
}
