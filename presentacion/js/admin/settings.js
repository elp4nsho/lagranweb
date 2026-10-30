// Ajustes del sitio: identidad, contacto, redes, SEO, cotizador y mantenimiento.
import { escape, toast, money, downloadCSV } from '../../../assets/core/ui.js';
import { db, settings, patchValue } from '../data/db.js';
import { pageHead, f, readForm, validate } from '../shared/admin-kit.js';

export default {
  id: 'settings', path: '/ajustes', label: 'Ajustes del sitio', icon: '⚙', group: 'Sistema', perm: 'settings', live: false,
  render(el, ctx) {
    const s = settings(), so = s.social || {}, seo = s.seo || {}, p = s.pricing || {};
    el.innerHTML = `${pageHead('Ajustes del sitio', 'Identidad, contacto, SEO y reglas del cotizador. Se aplican al sitio público al guardar.', '<button class="btn btn-primary" data-save>Guardar ajustes</button>')}
      <form class="cms-grid" data-f novalidate>
        <div class="card stack"><h3>Identidad</h3>${f.text('name', 'Nombre del sitio', s.name, { required: true })}${f.text('tagline', 'Bajada', s.tagline)}${f.text('founded', 'Año de fundación', s.founded, { type: 'number' })}</div>
        <div class="card stack"><h3>Contacto</h3>${f.text('email', 'Correo', s.email, { required: true, type: 'email' })}${f.text('phone', 'Teléfono', s.phone)}${f.text('whatsapp', 'WhatsApp', s.whatsapp)}${f.text('address', 'Dirección', s.address)}${f.text('hours', 'Horario', s.hours)}</div>
        <div class="card stack"><h3>Redes sociales</h3>${f.text('instagram', 'Instagram', so.instagram)}${f.text('linkedin', 'LinkedIn', so.linkedin)}${f.text('behance', 'Behance', so.behance)}${f.text('dribbble', 'Dribbble', so.dribbble)}</div>
        <div class="card stack"><h3>SEO</h3>${f.text('seoTitle', 'Título SEO', seo.title, { help: 'Recomendado: menos de 60 caracteres.' })}${f.area('seoDesc', 'Meta descripción', seo.description, { rows: 3, help: 'Recomendado: 120–160 caracteres.' })}${f.text('seoKw', 'Palabras clave', seo.keywords)}
          <div class="card" style="padding:12px"><small class="muted">Vista previa en buscadores</small><div data-serp></div></div></div>
        <div class="card stack"><h3>Cotizador</h3><p class="small muted">Multiplicadores por tamaño y recargo por urgencia. Los precios base se editan en Páginas → Servicios.</p>
          <div class="grid-3">${Object.entries(p.sizes || {}).map(([k, v]) => f.text('size_' + k, `× ${v.label}`, v.mult, { type: 'number', attrs: 'step="0.1"' })).join('')}</div>
          ${f.text('rush', 'Recargo urgencia (%)', Math.round((p.rush || 0) * 100), { type: 'number' })}
          ${(p.extras || []).map(x => f.text('extra_' + x.id, `Extra: ${x.label} (CLP)`, x.price, { type: 'number' })).join('')}</div>
        <div class="card stack"><h3>Sistema</h3>${f.sw('maintenance', 'Modo mantenimiento (oculta el sitio público)', s.maintenance)}
          <hr><p class="small muted" style="margin:0">Suscriptores del boletín: <b>${(db.getValue('newsletter', []) || []).length}</b></p><button type="button" class="btn btn-sm" data-nl>⇩ Exportar boletín CSV</button>
          <hr><p class="small muted" style="margin:0">Restaura todos los datos de ejemplo (proyectos, leads, usuarios…).</p><button type="button" class="btn btn-danger" data-reset>↺ Restablecer datos demo</button></div>
      </form>`;
    const form = el.querySelector('[data-f]');
    const serp = () => { const v = readForm(form); el.querySelector('[data-serp]').innerHTML = `<b style="color:var(--info)">${escape(v.seoTitle)}</b><br><small style="color:var(--success)">estudionebula.cl</small><p class="small" style="margin:0">${escape(v.seoDesc)}</p>`; };
    form.addEventListener('input', serp); serp();
    el.querySelector('[data-reset]').onclick = () => ctx.resetDemo();
    el.querySelector('[data-nl]').onclick = () => { const l = db.getValue('newsletter', []) || []; if (!l.length) return toast('Aún no hay suscriptores', 'info'); downloadCSV('boletin.csv', l.map(email => ({ email }))); };
    el.querySelector('[data-save]').onclick = () => {
      if (!validate(form)) return;
      const v = readForm(form);
      patchValue('settings', x => ({
        ...x, name: v.name, tagline: v.tagline, founded: v.founded, email: v.email, phone: v.phone, whatsapp: v.whatsapp, address: v.address, hours: v.hours,
        social: { instagram: v.instagram, linkedin: v.linkedin, behance: v.behance, dribbble: v.dribbble },
        seo: { title: v.seoTitle, description: v.seoDesc, keywords: v.seoKw }, maintenance: v.maintenance,
        pricing: { ...x.pricing, rush: (v.rush || 0) / 100,
          sizes: Object.fromEntries(Object.entries(x.pricing.sizes).map(([k, sz]) => [k, { ...sz, mult: v['size_' + k] || sz.mult }])),
          extras: x.pricing.extras.map(e => ({ ...e, price: v['extra_' + e.id] ?? e.price })) }
      }));
      db.log('ajustes', 'Actualizó los ajustes del sitio', ctx.user.id);
      toast(v.maintenance ? 'Guardado · el sitio está en mantenimiento' : 'Ajustes guardados y publicados', v.maintenance ? 'warning' : 'success');
    };
  }
};
