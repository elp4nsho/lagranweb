// Configuración / CMS del sitio: datos del local, portada (ES/EN), horario y reglas de operación.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { settings, saveSettings } from '../shared/logic.js';

const inp = (name, label, v, type = 'text', extra = '') => `<div class="field"><label for="cf-${name}">${label}</label><input class="input" id="cf-${name}" name="${name}" type="${type}" value="${escape(v ?? '')}" ${extra}></div>`;
const area = (name, label, v) => `<div class="field"><label for="cf-${name}">${label}</label><textarea class="textarea" id="cf-${name}" name="${name}" rows="2">${escape(v ?? '')}</textarea></div>`;
const chk = (name, label, v) => `<label class="check"><input type="checkbox" name="${name}" ${v ? 'checked' : ''}> ${label}</label>`;

export default {
  id: 'config', label: 'Configuración', icon: '⚙️', group: 'Sistema', roles: ['admin'], watch: [],
  render(el, ctx) {
    const c = settings();
    el.innerHTML = `${pageHead('Configuración', 'Todo lo que cambies aquí se refleja de inmediato en la portada, la carta y las reservas.', '<a class="btn btn-sm" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a>')}
      <form class="card stack" data-sec="info"><h3 style="margin:0">Datos del restaurante</h3>
        <div class="grid-2">${inp('name', 'Nombre', c.name)}${inp('address', 'Dirección', c.address)}${inp('phone', 'Teléfono', c.phone)}${inp('email', 'Correo', c.email, 'email')}${inp('instagram', 'Instagram', c.instagram)}</div>
        <div class="grid-2">${inp('taglineEs', 'Lema (ES)', c.tagline?.es)}${inp('taglineEn', 'Lema (EN)', c.tagline?.en)}</div>
        <div class="row"><button class="btn btn-primary">Guardar datos</button></div></form>
      <form class="card stack" data-sec="hero"><h3 style="margin:0">Portada y avisos</h3>
        <div class="grid-2">${area('heroTitleEs', 'Título principal (ES)', c.heroTitle?.es)}${area('heroTitleEn', 'Título principal (EN)', c.heroTitle?.en)}${area('heroTextEs', 'Bajada (ES)', c.heroText?.es)}${area('heroTextEn', 'Bajada (EN)', c.heroText?.en)}${inp('annEs', 'Aviso en la carta (ES) — vacío para ocultar', c.announcement?.es)}${inp('annEn', 'Aviso en la carta (EN)', c.announcement?.en)}</div>
        <div class="row"><button class="btn btn-primary">Publicar portada</button></div></form>
      <form class="card stack" data-sec="hours"><h3 style="margin:0">Horario de atención</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Día</th><th>Cerrado</th><th>Abre</th><th>Cierra</th></tr></thead><tbody>
        ${(c.hours || []).map(h => `<tr><td><b>${escape(h.label)}</b></td><td><label class="switch"><input type="checkbox" name="closed-${h.day}" ${h.closed ? 'checked' : ''} aria-label="Cerrado ${escape(h.label)}"><span></span></label></td><td><input class="input sm" type="time" name="open-${h.day}" value="${escape(h.open)}" aria-label="Abre ${escape(h.label)}"></td><td><input class="input sm" type="time" name="close-${h.day}" value="${escape(h.close)}" aria-label="Cierra ${escape(h.label)}"></td></tr>`).join('')}
        </tbody></table></div><div class="row"><button class="btn btn-primary">Guardar horario</button></div></form>
      <form class="card stack" data-sec="ops"><h3 style="margin:0">Operación</h3>
        <div class="row">${chk('orderingEnabled', 'Pedidos desde la mesa (QR) activos', c.orderingEnabled !== false)}${chk('reservationsOpen', 'Reservas web abiertas', c.reservationsOpen !== false)}${chk('decrementStock', 'Descontar inventario al pedir', c.decrementStock)}</div>
        <div class="grid-3">${inp('tipOptions', 'Opciones de propina (%)', (c.tipOptions || []).join(', '))}${inp('defaultTip', 'Propina sugerida por defecto (%)', c.defaultTip, 'number')}${inp('maxParty', 'Máximo de personas por reserva', c.maxParty, 'number')}${inp('kdsWarn', 'Cocina: alerta amarilla (min)', c.kdsWarn, 'number')}${inp('kdsLate', 'Cocina: atraso rojo (min)', c.kdsLate, 'number')}</div>
        <div class="row"><button class="btn btn-primary">Guardar operación</button></div></form>`;
    el.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, v = n => f.elements[n]?.value.trim(), ch = n => !!f.elements[n]?.checked;
      const sec = f.dataset.sec;
      let patch = {};
      if (sec === 'info') patch = { name: v('name') || 'Fogón Andino', address: v('address'), phone: v('phone'), email: v('email'), instagram: v('instagram'), tagline: { es: v('taglineEs'), en: v('taglineEn') || v('taglineEs') } };
      if (sec === 'hero') patch = { heroTitle: { es: v('heroTitleEs'), en: v('heroTitleEn') || v('heroTitleEs') }, heroText: { es: v('heroTextEs'), en: v('heroTextEn') || v('heroTextEs') }, announcement: { es: v('annEs'), en: v('annEn') || v('annEs') } };
      if (sec === 'hours') patch = { hours: c.hours.map(h => ({ ...h, closed: ch('closed-' + h.day), open: v('open-' + h.day), close: v('close-' + h.day) })) };
      if (sec === 'ops') patch = { orderingEnabled: ch('orderingEnabled'), reservationsOpen: ch('reservationsOpen'), decrementStock: ch('decrementStock'), tipOptions: v('tipOptions').split(/[,;\s]+/).map(Number).filter(n => n >= 0 && n <= 50), defaultTip: Number(v('defaultTip')) || 0, maxParty: Number(v('maxParty')) || 10, kdsWarn: Number(v('kdsWarn')) || 10, kdsLate: Number(v('kdsLate')) || 18 };
      saveSettings(patch);
      db.log('config', `Configuración actualizada: ${{ info: 'datos del local', hero: 'portada', hours: 'horario', ops: 'operación' }[sec]}`, ctx.user.id);
      toast('Cambios guardados y publicados', 'success');
    });
  }
};
