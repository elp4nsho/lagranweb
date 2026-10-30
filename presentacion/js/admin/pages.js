// CMS de páginas y secciones: portada, cifras, estudio, proceso, servicios, clientes y bloques visibles.
import { escape, money, toast, confirm } from '../../../assets/core/ui.js';
import { db, home, patchValue, settings } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, readForm, validate } from '../shared/admin-kit.js';

const TABS = [['hero', 'Portada'], ['stats', 'Cifras'], ['about', 'Estudio y CTA'], ['process', 'Proceso'], ['services', 'Servicios'], ['clients', 'Clientes'], ['blocks', 'Secciones visibles']];
let tab = 'hero';
const SECTION_NAMES = { services: 'Servicios', stats: 'Cifras', work: 'Trabajos destacados', about: 'Estudio y equipo', process: 'Proceso', testimonials: 'Testimonios', clients: 'Banda de clientes', blog: 'Últimos artículos', cta: 'Llamado final (CTA)' };

export default {
  id: 'pages', path: '/paginas', label: 'Páginas y secciones', icon: '✎', group: 'Contenido', perm: 'pages', live: false,
  render(el, ctx) {
    const draw = () => {
      const h = home();
      el.innerHTML = `${pageHead('Páginas y secciones', 'Todo lo que edites aquí se refleja de inmediato en el sitio público.', '<a class="btn" href="index.html" target="_blank" rel="noopener">↗ Ver portada</a>')}
        <div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'active' : ''}" role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div data-body></div>`;
      el.querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; draw(); } };
      const body = el.querySelector('[data-body]');
      const save = (key, patch, msg) => { patchValue(key, patch); db.log('cms', msg, ctx.user.id); toast('Cambios publicados en el sitio', 'success'); };

      if (tab === 'hero') {
        const hero = h.hero || {};
        body.innerHTML = `<form class="card stack" data-f novalidate style="max-width:820px">
          <h3>Hero de la portada</h3>
          ${f.text('eyebrow', 'Antetítulo', hero.eyebrow)}
          ${f.text('title', 'Título principal', hero.title, { required: true })}
          ${f.text('words', 'Palabras rotativas (separadas por coma)', (hero.words || []).join(', '), { help: 'Se alternan al final del título.' })}
          ${f.area('lead', 'Bajada', hero.lead, { rows: 3 })}
          <div class="grid-2">${f.text('ctaPrimary', 'Botón principal', hero.ctaPrimary)}${f.text('ctaSecondary', 'Botón secundario', hero.ctaSecondary)}</div>
          <div class="row"><button class="btn btn-primary">Guardar y publicar</button></div></form>`;
        body.querySelector('[data-f]').onsubmit = e => {
          e.preventDefault(); if (!validate(e.target)) return;
          const v = readForm(e.target);
          save('home', x => ({ ...x, hero: { ...v, words: v.words.split(',').map(s => s.trim()).filter(Boolean) } }), 'Editó el hero de la portada');
        };
      }

      if (tab === 'stats') {
        const rows = (h.stats || []).map((s, i) => `<div class="repeat-row" data-row>${f.text('label' + i, 'Etiqueta', s.label)}${f.text('value' + i, 'Valor', s.value, { type: 'number' })}${f.text('suffix' + i, 'Sufijo', s.suffix)}<button type="button" class="btn btn-ghost btn-icon" data-del aria-label="Quitar">✕</button></div>`).join('');
        body.innerHTML = `<form class="card stack" data-f novalidate style="max-width:820px"><h3>Cifras del estudio</h3><p class="muted small">Se muestran con contador animado en la portada y en “Estudio”.</p>
          <div class="stack" data-rows>${rows}</div><div class="row"><button type="button" class="btn" data-add>＋ Agregar cifra</button><button class="btn btn-primary">Guardar y publicar</button></div></form>`;
        const form = body.querySelector('[data-f]');
        form.addEventListener('click', e => {
          if (e.target.closest('[data-del]')) e.target.closest('[data-row]').remove();
          if (e.target.closest('[data-add]')) { const i = Date.now(); form.querySelector('[data-rows]').insertAdjacentHTML('beforeend', `<div class="repeat-row" data-row>${f.text('label' + i, 'Etiqueta', '')}${f.text('value' + i, 'Valor', 0, { type: 'number' })}${f.text('suffix' + i, 'Sufijo', '')}<button type="button" class="btn btn-ghost btn-icon" data-del aria-label="Quitar">✕</button></div>`); }
        });
        form.onsubmit = e => {
          e.preventDefault();
          const stats = [...form.querySelectorAll('[data-row]')].map(r => { const [a, b, c] = r.querySelectorAll('input'); return { label: a.value.trim(), value: Number(b.value) || 0, suffix: c.value.trim() }; }).filter(s => s.label);
          save('home', x => ({ ...x, stats }), 'Actualizó las cifras del estudio');
        };
      }

      if (tab === 'about') {
        body.innerHTML = `<form class="card stack" data-f novalidate style="max-width:820px"><h3>Sección “El estudio”</h3>
          ${f.text('aboutTitle', 'Título', h.about?.title, { required: true })}${f.area('aboutText', 'Texto (párrafos separados por línea en blanco)', h.about?.text, { rows: 6 })}
          <hr><h3>Llamado final (CTA) y página de contacto</h3>${f.text('ctaTitle', 'Título', h.cta?.title)}${f.area('ctaText', 'Texto', h.cta?.text, { rows: 2 })}
          <div class="row"><button class="btn btn-primary">Guardar y publicar</button></div></form>`;
        body.querySelector('[data-f]').onsubmit = e => {
          e.preventDefault(); if (!validate(e.target)) return;
          const v = readForm(e.target);
          save('home', x => ({ ...x, about: { title: v.aboutTitle, text: v.aboutText }, cta: { title: v.ctaTitle, text: v.ctaText } }), 'Editó la sección Estudio / CTA');
        };
      }

      if (tab === 'process') {
        const row = (p, i) => `<div class="repeat-row r3" data-row>${f.text('t' + i, 'Etapa', p.title)}${f.text('x' + i, 'Descripción', p.text)}${f.text('d' + i, 'Duración', p.duration)}<button type="button" class="btn btn-ghost btn-icon" data-del aria-label="Quitar">✕</button></div>`;
        body.innerHTML = `<form class="card stack" data-f novalidate style="max-width:980px"><h3>Etapas del proceso</h3><div class="stack" data-rows>${(h.process || []).map(row).join('')}</div>
          <div class="row"><button type="button" class="btn" data-add>＋ Agregar etapa</button><button class="btn btn-primary">Guardar y publicar</button></div></form>`;
        const form = body.querySelector('[data-f]');
        form.addEventListener('click', e => {
          if (e.target.closest('[data-del]')) e.target.closest('[data-row]').remove();
          if (e.target.closest('[data-add]')) form.querySelector('[data-rows]').insertAdjacentHTML('beforeend', row({ title: '', text: '', duration: '' }, Date.now()));
        });
        form.onsubmit = e => {
          e.preventDefault();
          const process = [...form.querySelectorAll('[data-row]')].map(r => { const [a, b, c] = r.querySelectorAll('input'); return { title: a.value.trim(), text: b.value.trim(), duration: c.value.trim() }; }).filter(s => s.title);
          save('home', x => ({ ...x, process }), 'Actualizó el proceso');
        };
      }

      if (tab === 'blocks') {
        const on = h.sections || {};
        const ann = settings().announcement || {};
        body.innerHTML = `<form class="card stack" data-f style="max-width:620px"><h3>Secciones de la portada</h3><p class="muted small">Activa o desactiva bloques completos del inicio.</p>
          ${Object.entries(SECTION_NAMES).map(([k, l]) => f.sw(k, l, on[k] !== false)).join('')}
          <hr><h3>Barra de anuncio</h3>${f.sw('annOn', 'Mostrar barra superior', ann.on)}${f.text('annText', 'Texto del anuncio', ann.text)}
          <div class="row"><button class="btn btn-primary">Guardar y publicar</button></div></form>`;
        body.querySelector('[data-f]').onsubmit = e => {
          e.preventDefault();
          const v = readForm(e.target);
          const sections = Object.fromEntries(Object.keys(SECTION_NAMES).map(k => [k, !!v[k]]));
          patchValue('home', x => ({ ...x, sections }));
          patchValue('settings', x => ({ ...x, announcement: { on: v.annOn, text: v.annText } }));
          db.log('cms', 'Cambió la visibilidad de secciones', ctx.user.id);
          toast('Cambios publicados en el sitio', 'success');
        };
      }

      if (tab === 'services') {
        body.innerHTML = `<div data-t></div>`;
        const edit = (s = {}) => formDialog({
          title: s.id ? 'Editar servicio' : 'Nuevo servicio',
          body: `<div class="grid-2">${f.text('title', 'Nombre', s.title, { required: true })}${f.text('icon', 'Ícono (símbolo)', s.icon || '◆')}</div>
            ${f.area('desc', 'Descripción', s.desc, { required: true, rows: 3 })}${f.text('tags', 'Etiquetas (coma)', (s.tags || []).join(', '))}
            <div class="grid-2">${f.text('basePrice', 'Precio base (CLP) para el cotizador', s.basePrice || 1000000, { type: 'number', required: true })}${f.text('order', 'Orden', s.order || db.count('services') + 1, { type: 'number' })}</div>
            ${f.sw('active', 'Visible en el sitio', s.id ? s.active : true)}`,
          onSubmit: v => {
            const data = { ...v, tags: v.tags.split(',').map(x => x.trim()).filter(Boolean) };
            if (s.id) db.update('services', s.id, data); else db.insert('services', data);
            db.log('servicio', `${s.id ? 'Editó' : 'Creó'} el servicio “${v.title}”`, ctx.user.id);
            toast('Servicio guardado', 'success'); draw();
          }
        });
        table(body.querySelector('[data-t]'), {
          id: 'services', rows: db.all('services'), sort: 'order', search: s => s.title + s.desc,
          toolbar: '<button class="btn btn-primary btn-sm" data-new>＋ Nuevo servicio</button>',
          filters: [{ key: 'active', label: 'Estado', options: [['true', 'Visible'], ['false', 'Oculto']] }],
          columns: [
            { key: 'order', label: '#' },
            { key: 'title', label: 'Servicio', render: s => `<div class="cell-main"><span class="service-ico">${escape(s.icon)}</span><span><b>${escape(s.title)}</b><small>${escape((s.tags || []).join(' · '))}</small></span></div>` },
            { key: 'basePrice', label: 'Precio base', render: s => money(s.basePrice) },
            { key: 'active', label: 'Visible', render: s => `<label class="switch"><input type="checkbox" data-toggle="${s.id}" ${s.active ? 'checked' : ''} aria-label="Visible"><span></span></label>` }
          ],
          actions: () => actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
          onAction: async (a, s) => {
            if (a === 'edit') edit(s);
            if (a === 'del' && await confirm(`¿Eliminar el servicio “${s.title}”?`, { danger: true, ok: 'Eliminar' })) { db.remove('services', s.id); db.log('servicio', `Eliminó el servicio “${s.title}”`, ctx.user.id); toast('Servicio eliminado', 'success'); draw(); }
          },
          csv: { name: 'servicios', map: s => ({ servicio: s.title, precio_base: s.basePrice, visible: s.active ? 'sí' : 'no' }) }
        });
        body.querySelector('[data-new]').onclick = () => edit();
        body.addEventListener('change', e => { const t = e.target.closest('[data-toggle]'); if (t) { db.update('services', t.dataset.toggle, { active: t.checked }); toast(t.checked ? 'Servicio visible' : 'Servicio oculto', 'info'); } });
      }

      if (tab === 'clients') {
        const list = db.all('clients').sort((a, b) => a.order - b.order);
        body.innerHTML = `<div class="card stack" style="max-width:720px"><div class="card-head"><h3>Clientes (banda de logos)</h3></div>
          <form class="row" data-add novalidate style="gap:8px;flex-wrap:nowrap"><input class="input" name="name" placeholder="Nombre del cliente" required aria-label="Nombre del cliente"><button class="btn btn-primary">Agregar</button></form>
          <ul class="mini-list">${list.map((c, i) => `<li><span class="row" style="gap:10px"><label class="switch"><input type="checkbox" data-on="${c.id}" ${c.active ? 'checked' : ''} aria-label="Visible"><span></span></label><b>${escape(c.name)}</b></span>
            <span class="inline-actions"><button class="btn btn-sm btn-ghost btn-icon" data-up="${c.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost btn-icon" data-down="${c.id}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button><button class="btn btn-sm btn-ghost btn-icon" data-rm="${c.id}" aria-label="Eliminar">🗑</button></span></li>`).join('')}</ul></div>`;
        body.querySelector('[data-add]').onsubmit = e => { e.preventDefault(); if (!validate(e.target)) return; db.insert('clients', { name: e.target.name.value.trim(), active: true, order: list.length + 1 }); db.log('cliente', `Agregó el cliente ${e.target.name.value}`, ctx.user.id); toast('Cliente agregado', 'success'); draw(); };
        body.onclick = e => {
          const b = e.target.closest('button'); if (!b) return;
          const swap = (id, d) => { const i = list.findIndex(c => c.id === id), j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; list.forEach((c, k) => db.update('clients', c.id, { order: k + 1 })); draw(); };
          if (b.dataset.up) swap(b.dataset.up, -1);
          if (b.dataset.down) swap(b.dataset.down, 1);
          if (b.dataset.rm) { db.remove('clients', b.dataset.rm); toast('Cliente eliminado', 'success'); draw(); }
        };
        body.onchange = e => { const t = e.target.closest('[data-on]'); if (t) db.update('clients', t.dataset.on, { active: t.checked }); };
      }
    };
    draw();
  }
};
