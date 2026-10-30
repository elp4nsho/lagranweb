// Configuración del hotel: datos, horarios de check-in/out y políticas.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { settings, saveSettings } from '../shared/hotel.js';

const F = [['name', 'Nombre del hotel', 'text'], ['address', 'Dirección', 'text'], ['phone', 'Teléfono', 'text'], ['email', 'Correo de reservas', 'email'], ['checkInTime', 'Check-in desde', 'time'], ['checkOutTime', 'Check-out hasta', 'time'],
  ['freeCancelDays', 'Cancelación gratuita hasta (días antes)', 'number'], ['penaltyNights', 'Penalidad (noches cobradas)', 'number'], ['depositPct', 'Abono mínimo web (%)', 'number']];
export default {
  id: 'config', label: 'Configuración', icon: '⚙️', group: 'Sistema', roles: ['admin'], watch: [],
  render(el, ctx) {
    const c = settings();
    el.innerHTML = `${pageHead('Configuración', 'Datos del hotel y políticas que usa el motor de reservas')}
      <form class="card stack" id="cf"><div class="grid-3">${F.map(([k, l, t]) => `<div class="field"><label for="cf-${k}">${l}</label><input class="input" id="cf-${k}" name="${k}" type="${t}" value="${escape(c[k] ?? '')}"></div>`).join('')}</div>
      <button class="btn btn-primary">Guardar configuración</button></form>`;
    el.querySelector('#cf').onsubmit = e => {
      e.preventDefault();
      const patch = Object.fromEntries(F.map(([k, , t]) => [k, t === 'number' ? Number(e.target.elements[k].value) : e.target.elements[k].value.trim()]));
      saveSettings(patch); db.log('config', 'Configuración del hotel actualizada', ctx.user.id); toast('Configuración guardada', 'success');
    };
  }
};
