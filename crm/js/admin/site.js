// CMS del sitio público: portada, características, planes, testimonios, FAQ y contacto.
// Todo se guarda en db 'site' y el sitio público se actualiza al instante (db.subscribe).
import { db } from '../data/db.js';
import { escape, toast, money, confirm } from '../../../assets/core/ui.js';
import { pageHead, field } from '../app/components.js';
import { icon } from '../shared/icons.js';

const ICONS = ['kanban', 'target', 'mail', 'bolt', 'doc', 'chart', 'users', 'calendar', 'shield', 'globe', 'star', 'clock'];
const TABS = [['portada', 'Portada'], ['caracteristicas', 'Características'], ['planes', 'Planes'], ['testimonios', 'Testimonios'], ['faq', 'Preguntas'], ['contacto', 'Contacto']];
const clone = o => JSON.parse(JSON.stringify(o));

export function render(view, { user, params }) {
  const tab = params.tab || 'portada';
  const site = clone(db.getValue('site', {}));
  view.innerHTML = `
    ${pageHead('Sitio web', 'Edita el contenido del sitio público. Los cambios se ven al instante en index.html.', `<a class="btn" href="index.html" target="_blank" rel="noopener">${icon('ext', 16)} Abrir sitio</a>`)}
    <div class="tabs">${TABS.map(([k, l]) => `<a class="tab ${tab === k ? 'active' : ''}" href="#/sitio/${k}">${l}</a>`).join('')}</div>
    <form class="card stack" data-form novalidate></form>`;
  const form = view.querySelector('[data-form]');
  const save = (patch, msg = 'Sitio actualizado') => {
    db.setValue('site', { ...clone(db.getValue('site', {})), ...patch });
    db.log('sitio', `${msg} (${TABS.find(t => t[0] === tab)[1]})`, user.id);
    toast(`${msg} · ya visible en el sitio público`, 'success');
  };
  const listEditor = (key, item, blank, title) => {
    const list = site[key] || [];
    form.innerHTML = `<div class="row between"><h3 style="margin:0">${title}</h3><button type="button" class="btn btn-sm" data-add>${icon('plus', 14)} Agregar</button></div>
      <div class="stack">${list.map((x, i) => `<fieldset class="cms-item" data-i="${i}"><legend class="row between" style="width:100%"><b>#${i + 1}</b><span class="row" style="gap:4px"><button type="button" class="btn btn-ghost btn-sm" data-up="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button type="button" class="btn btn-ghost btn-sm" data-down="${i}" ${i < list.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button type="button" class="btn btn-ghost btn-sm" data-rm="${i}" aria-label="Eliminar">${icon('trash', 14)}</button></span></legend>${item(x, i)}</fieldset>`).join('') || '<div class="empty small">Sin elementos</div>'}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-save>Guardar cambios</button></div>`;
    const collect = () => [...form.querySelectorAll('[data-i]')].map(fs => {
      const o = { ...list[+fs.dataset.i] };
      fs.querySelectorAll('[data-k]').forEach(inp => { o[inp.dataset.k] = inp.type === 'checkbox' ? inp.checked : inp.dataset.list != null ? inp.value.split('\n').map(s => s.trim()).filter(Boolean) : inp.type === 'number' ? +inp.value : inp.value; });
      return o;
    });
    form.querySelector('[data-add]').onclick = () => { site[key] = [...collect(), { ...blank, id: 'x' + Date.now().toString(36) }]; listEditor(key, item, blank, title); };
    form.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (!await confirm('¿Quitar este elemento?', { ok: 'Quitar', danger: true })) return; const l = collect(); l.splice(+b.dataset.rm, 1); site[key] = l; listEditor(key, item, blank, title); });
    form.querySelectorAll('[data-up],[data-down]').forEach(b => b.onclick = () => { const l = collect(); const i = +(b.dataset.up ?? b.dataset.down); const j = b.dataset.up != null ? i - 1 : i + 1; [l[i], l[j]] = [l[j], l[i]]; site[key] = l; listEditor(key, item, blank, title); });
    form.querySelector('[data-save]').onclick = e => { e.preventDefault(); save({ [key]: collect() }); };
  };

  if (tab === 'portada') {
    const h = site.hero || {};
    form.innerHTML = `<h3 style="margin:0">Portada</h3>
      ${field('Antetítulo', `<input class="input" name="eyebrow" value="${escape(h.eyebrow)}">`)}
      ${field('Título principal *', `<input class="input" name="title" value="${escape(h.title)}" required>`)}
      ${field('Bajada', `<textarea class="textarea" name="subtitle">${escape(h.subtitle)}</textarea>`)}
      <div class="grid-2">${field('Botón principal', `<input class="input" name="cta" value="${escape(h.cta)}">`)}${field('Botón secundario', `<input class="input" name="cta2" value="${escape(h.cta2)}">`)}</div>
      <hr><h3 style="margin:0">Barra de anuncio</h3>
      <label class="check"><input type="checkbox" name="annOn" ${site.announcement?.on ? 'checked' : ''}> Mostrar barra de anuncio</label>
      ${field('Texto del anuncio', `<input class="input" name="annText" value="${escape(site.announcement?.text || '')}">`)}
      <hr><h3 style="margin:0">Cifras destacadas</h3>
      <div class="grid-3">${(site.stats || []).map((s, i) => `<div class="stack" style="gap:6px"><input class="input" name="sv${i}" value="${escape(s.value)}" aria-label="Cifra ${i + 1}"><input class="input" name="sl${i}" value="${escape(s.label)}" aria-label="Etiqueta ${i + 1}"></div>`).join('')}</div>
      ${field('Logos de clientes (uno por línea)', `<textarea class="textarea" name="logos">${escape((site.logos || []).join('\n'))}</textarea>`)}
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-save>Guardar portada</button></div>`;
    form.querySelector('[data-save]').onclick = e => {
      e.preventDefault();
      const f = form.elements;
      if (!f.title.value.trim()) { f.title.classList.add('invalid'); return toast('El título es obligatorio', 'warning'); }
      save({
        hero: { eyebrow: f.eyebrow.value, title: f.title.value.trim(), subtitle: f.subtitle.value, cta: f.cta.value, cta2: f.cta2.value },
        announcement: { on: f.annOn.checked, text: f.annText.value },
        stats: (site.stats || []).map((s, i) => ({ value: f['sv' + i].value, label: f['sl' + i].value })),
        logos: f.logos.value.split('\n').map(s => s.trim()).filter(Boolean)
      });
    };
  } else if (tab === 'caracteristicas') {
    listEditor('features', x => `<div class="grid-2">${field('Título', `<input class="input" data-k="title" value="${escape(x.title)}">`)}${field('Ícono', `<select class="select" data-k="icon">${ICONS.map(i => `<option ${i === x.icon ? 'selected' : ''}>${i}</option>`).join('')}</select>`)}</div>${field('Texto', `<textarea class="textarea" data-k="text" style="min-height:70px">${escape(x.text)}</textarea>`)}`, { title: 'Nueva característica', text: '', icon: 'star' }, 'Características');
  } else if (tab === 'planes') {
    form.innerHTML = '';
    listEditor('plans', x => `<div class="grid-3">${field('Nombre', `<input class="input" data-k="name" value="${escape(x.name)}">`)}${field('Precio mensual (CLP)', `<input class="input" type="number" min="0" step="1000" data-k="price" value="${x.price}">`)}${field('Nota', `<input class="input" data-k="note" value="${escape(x.note)}">`)}</div>${field('Incluye (uno por línea)', `<textarea class="textarea" data-k="features" data-list style="min-height:90px">${escape((x.features || []).join('\n'))}</textarea>`)}<label class="check"><input type="checkbox" data-k="highlight" ${x.highlight ? 'checked' : ''}> Destacar como “Más popular”</label><small class="muted">Vista: ${money(x.price)} ${escape(x.note)}</small>`, { name: 'Nuevo plan', price: 0, note: 'por usuario / mes', features: [], highlight: false }, 'Planes y precios');
    form.insertAdjacentHTML('beforeend', `<div class="field" style="max-width:260px"><label for="ad">Descuento por pago anual (%)</label><input class="input" id="ad" type="number" min="0" max="50" value="${site.annualDiscount ?? 20}" data-annual></div>`);
    form.querySelector('[data-annual]').onchange = e => save({ annualDiscount: Math.max(0, Math.min(50, +e.target.value || 0)) }, 'Descuento anual actualizado');
  } else if (tab === 'testimonios') {
    listEditor('testimonials', x => `<div class="grid-3">${field('Nombre', `<input class="input" data-k="name" value="${escape(x.name)}">`)}${field('Cargo', `<input class="input" data-k="role" value="${escape(x.role)}">`)}${field('Empresa', `<input class="input" data-k="company" value="${escape(x.company)}">`)}</div>${field('Cita', `<textarea class="textarea" data-k="quote" style="min-height:70px">${escape(x.quote)}</textarea>`)}`, { name: '', role: '', company: '', quote: '' }, 'Testimonios');
  } else if (tab === 'faq') {
    listEditor('faq', x => `${field('Pregunta', `<input class="input" data-k="q" value="${escape(x.q)}">`)}${field('Respuesta', `<textarea class="textarea" data-k="a" style="min-height:70px">${escape(x.a)}</textarea>`)}`, { q: '', a: '' }, 'Preguntas frecuentes');
  } else {
    form.innerHTML = `<h3 style="margin:0">Contacto</h3><div class="grid-2">${field('Correo de ventas', `<input class="input" name="email" value="${escape(site.contactEmail || '')}">`)}${field('Teléfono', `<input class="input" name="phone" value="${escape(site.contactPhone || '')}">`)}</div><div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-save>Guardar</button></div>`;
    form.querySelector('[data-save]').onclick = e => { e.preventDefault(); save({ contactEmail: form.elements.email.value.trim(), contactPhone: form.elements.phone.value.trim() }); };
  }
}
