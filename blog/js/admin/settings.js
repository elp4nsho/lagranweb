// Ajustes del medio: identidad, ticker, muro de pago, comentarios, contacto y SEO.
import { escape, toast } from '../../../assets/core/ui.js';
import { db, settings, patchSettings } from '../data/db.js';
import { pageHead, f, readForm, validate } from '../shared/admin-kit.js';

export default {
  id: 'settings', path: '/ajustes', label: 'Ajustes', icon: '⚙', group: 'Sistema', perm: 'settings', live: false,
  render(el, ctx) {
    const s = settings(), so = s.social || {};
    el.innerHTML = `${pageHead('Ajustes del medio', 'Cambios inmediatos en el sitio público.', '<button class="btn btn-primary" data-save>Guardar ajustes</button>')}
      <form class="cms-grid" data-f novalidate>
        <div class="card stack"><h3>Identidad</h3>${f.text('name', 'Nombre del medio', s.name, { required: true })}${f.text('tagline', 'Lema', s.tagline)}${f.text('city', 'Ciudad (barra superior)', s.city)}${f.text('founded', 'Año de fundación', s.founded, { type: 'number' })}</div>
        <div class="card stack"><h3>Último minuto (ticker)</h3>${f.sw('tickerOn', 'Mostrar ticker bajo la navegación', s.ticker?.on)}${f.text('tickerManual', 'Mensaje manual (opcional)', s.ticker?.manual, { help: 'Se muestra junto a los artículos marcados como “Último minuto”.' })}</div>
        <div class="card stack"><h3>Muro de pago</h3>${f.sw('paywallOn', 'Activar muro de pago en artículos premium', s.paywall?.on)}${f.select('previewBlocks', 'Bloques visibles antes del muro', [1, 2, 3, 4].map(n => [n, `${n} bloque${n > 1 ? 's' : ''}`]), s.paywall?.previewBlocks || 2)}<p class="small muted" style="margin:0">Los planes y precios se editan en Suscripciones → Planes.</p></div>
        <div class="card stack"><h3>Comentarios</h3>${f.sw('commentsOn', 'Permitir comentarios de lectores registrados', s.comments?.on)}${f.select('moderation', 'Moderación', [['pre', 'Pre-moderación (aprobar antes de publicar)'], ['post', 'Post-moderación (publicar de inmediato)']], s.comments?.moderation)}</div>
        <div class="card stack"><h3>Contacto y redes</h3>${f.text('email', 'Correo', s.email, { type: 'email', required: true })}${f.text('phone', 'Teléfono', s.phone)}${f.text('address', 'Dirección', s.address)}<div class="grid-2">${f.text('x', 'X', so.x)}${f.text('instagram', 'Instagram', so.instagram)}</div></div>
        <div class="card stack"><h3>SEO y newsletter</h3>${f.text('seoTitle', 'Título SEO de portada', s.seo?.title)}${f.area('seoDesc', 'Meta descripción', s.seo?.description, { rows: 3 })}${f.text('newsletterText', 'Texto del bloque de newsletter', s.newsletterText)}</div>
        <div class="card stack"><h3>Datos demo</h3><p class="small muted" style="margin:0">Restaura artículos, usuarios, suscripciones y estadísticas de ejemplo.</p><button type="button" class="btn btn-danger" data-reset>↺ Restablecer datos demo</button></div>
      </form>`;
    const form = el.querySelector('[data-f]');
    el.querySelector('[data-reset]').onclick = () => ctx.resetDemo();
    el.querySelector('[data-save]').onclick = () => {
      if (!validate(form)) return;
      const v = readForm(form);
      patchSettings(x => ({ ...x, name: v.name, tagline: v.tagline, city: v.city, founded: v.founded, email: v.email, phone: v.phone, address: v.address,
        social: { ...x.social, x: v.x, instagram: v.instagram }, ticker: { on: v.tickerOn, manual: v.tickerManual },
        paywall: { on: v.paywallOn, previewBlocks: Number(v.previewBlocks) }, comments: { on: v.commentsOn, moderation: v.moderation },
        seo: { title: v.seoTitle, description: v.seoDesc }, newsletterText: v.newsletterText }));
      db.log('ajustes', 'Actualizó los ajustes del medio', ctx.user.id);
      toast('Ajustes guardados y publicados', 'success');
    };
  }
};
