// Contenido del sitio (CMS) y configuración operativa: portada, anuncio, contacto, reservas.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { settings, saveSettings } from '../shared/domain.js';

const FIELDS = [
  ['Portada', [['name', 'Nombre de la marca'], ['tagline', 'Bajada (eyebrow)'], ['heroTitle', 'Título principal'], ['heroText', 'Texto de portada', 'textarea'], ['announcement', 'Barra de anuncio (vacío = oculta)']]],
  ['Contacto', [['phone', 'Teléfono'], ['whatsapp', 'WhatsApp'], ['email', 'Correo']]],
  ['Operación', [['bookingDays', 'Días disponibles para reservar', 'number'], ['walkinBuffer', 'Bahías reservadas para clientes sin cita', 'number'], ['showWait', 'Mostrar tiempos de espera en la portada', 'checkbox']]],
  ['Textos', [['guarantee', 'Garantía (pie y boletas)', 'textarea'], ['reminderMsg', 'Mensaje de recordatorio ({nombre} {auto} {patente} {km})', 'textarea']]]
];

export default {
  id: 'contenido', label: 'Contenido del sitio', icon: '📝', group: 'Sistema', roles: ['admin'], watch: ['settings'],
  render(el, ctx) {
    const s = settings();
    el.innerHTML = `${pageHead('Contenido del sitio', 'Los cambios se publican al instante en el sitio (ábrelo en otra pestaña para verlo)', '<a class="btn btn-sm" href="index.html" target="_blank">Ver sitio ↗</a>')}
      <form class="stack" novalidate data-f>${FIELDS.map(([g, fs]) => `<div class="card stack"><h3 style="margin:0">${g}</h3><div class="grid-2">${fs.map(([k, l, t]) => t === 'checkbox' ? `<label class="check"><input type="checkbox" name="${k}" ${s[k] !== false ? 'checked' : ''}> ${escape(l)}</label>` : `<div class="field" ${t === 'textarea' ? 'style="grid-column:1/-1"' : ''}><label for="cm-${k}">${escape(l)}</label>${t === 'textarea' ? `<textarea class="textarea" id="cm-${k}" name="${k}">${escape(s[k] ?? '')}</textarea>` : `<input class="input" id="cm-${k}" name="${k}" type="${t || 'text'}" value="${escape(s[k] ?? '')}">`}</div>`).join('')}</div></div>`).join('')}
      <div class="row"><button class="btn btn-primary">Guardar y publicar</button><small class="muted">Último cambio queda en la bitácora.</small></div></form>`;
    el.querySelector('[data-f]').onsubmit = e => {
      e.preventDefault();
      const f = e.target, patch = {};
      FIELDS.flatMap(([, fs]) => fs).forEach(([k, , t]) => { patch[k] = t === 'checkbox' ? f.elements[k].checked : t === 'number' ? Math.max(0, +f.elements[k].value || 0) : f.elements[k].value.trim(); });
      if (!patch.name || !patch.heroTitle) { toast('Nombre y título no pueden quedar vacíos', 'warning'); return; }
      saveSettings(patch); db.log('contenido', 'Contenido del sitio actualizado', ctx.user.id); toast('Sitio actualizado', 'success');
    };
  }
};
