// Ajustes del centro de ayuda (CMS): portada, aviso, contacto y chat/bot. Se reflejan al instante en el sitio.
import { db } from '../data/db.js';
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { field, opt } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const h = db.getValue('help', {});
  view.innerHTML = `${pageHead('Centro de ayuda', 'Contenido del sitio público y del chat', `<a class="btn" href="index.html" target="_blank" rel="noopener">${icon('ext', 16)} Ver centro de ayuda</a>`)}
    <form class="stack" data-form novalidate>
      <section class="card stack"><h3 style="margin:0">Portada</h3>${field('Título', `<input class="input" name="heroTitle" value="${escape(h.heroTitle)}" required>`)}${field('Bajada', `<textarea class="textarea" name="heroSubtitle" style="min-height:70px">${escape(h.heroSubtitle)}</textarea>`)}</section>
      <section class="card stack"><h3 style="margin:0">Aviso superior</h3><label class="check"><input type="checkbox" name="bannerOn" ${h.banner?.on ? 'checked' : ''}> Mostrar aviso en todas las páginas públicas</label>
        <div class="grid-2">${field('Texto', `<input class="input" name="bannerText" value="${escape(h.banner?.text || '')}">`)}${field('Tono', `<select class="select" name="bannerTone">${[['info', 'Informativo'], ['warning', 'Advertencia'], ['danger', 'Crítico']].map(([k, l]) => opt(k, l, h.banner?.tone)).join('')}</select>`)}</div></section>
      <section class="card stack"><h3 style="margin:0">Contacto</h3><div class="grid-3">${field('Teléfono', `<input class="input" name="phone" value="${escape(h.phone)}">`)}${field('WhatsApp', `<input class="input" name="whatsapp" value="${escape(h.whatsapp)}">`)}${field('Horario', `<input class="input" name="hours" value="${escape(h.hours)}">`)}</div></section>
      <section class="card stack"><h3 style="margin:0">Chat en vivo</h3><label class="check"><input type="checkbox" name="chatEnabled" ${h.chatEnabled !== false ? 'checked' : ''}> Mostrar el widget de chat en el sitio</label>
        <div class="grid-2">${field('Nombre del bot', `<input class="input" name="botName" value="${escape(h.botName)}">`)}${field('Saludo', `<input class="input" name="botGreeting" value="${escape(h.botGreeting)}">`)}</div></section>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-save>Guardar y publicar</button></div>
    </form>`;
  view.querySelector('[data-save]').onclick = e => {
    e.preventDefault();
    const f = view.querySelector('[data-form]').elements;
    if (!f.heroTitle.value.trim()) { f.heroTitle.classList.add('invalid'); return toast('El título es obligatorio', 'warning'); }
    db.setValue('help', { ...h, heroTitle: f.heroTitle.value.trim(), heroSubtitle: f.heroSubtitle.value.trim(), banner: { on: f.bannerOn.checked, text: f.bannerText.value.trim(), tone: f.bannerTone.value }, phone: f.phone.value.trim(), whatsapp: f.whatsapp.value.trim(), hours: f.hours.value.trim(), chatEnabled: f.chatEnabled.checked, botName: f.botName.value.trim(), botGreeting: f.botGreeting.value.trim() });
    db.log('ajustes', 'Actualizó el centro de ayuda', user.id);
    toast('Centro de ayuda actualizado', 'success');
  };
}
