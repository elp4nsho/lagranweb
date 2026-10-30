import { escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { settings } from '../shared/domain.js';
import { icon } from '../shared/icons.js';

const F = [
  ['Sitio público', [['name', 'Nombre de la marca'], ['tagline', 'Eslogan'], ['heroTitle', 'Título principal (portada)'], ['heroText', 'Texto de portada', 'textarea'], ['promo', 'Promoción en barra superior (vacío = oculta)']]],
  ['Contacto', [['phone', 'Teléfono'], ['email', 'Correo'], ['instagram', 'Instagram']]],
  ['Reglas', [['enrollFee', 'Matrícula (CLP, 0 = promo)', 'number'], ['cancelHours', 'Horas para cancelar clase sin penalidad', 'number'], ['freezeMaxDays', 'Máximo de días de congelamiento', 'number'], ['freezeFee', 'Cargo por congelar (CLP)', 'number']]]
];
export function renderSettings(v) {
  const s = settings();
  v.innerHTML = `${pageHead('Configuración del sitio', 'Estos textos y reglas se reflejan de inmediato en el sitio público.', `<a class="btn" href="index.html" target="_blank">${icon('eye', 16)} Ver sitio</a>`)}
  <form class="grid-2" novalidate>${F.map(([title, fields]) => `<div class="card stack"><h3 class="mb0">${title}</h3>${fields.map(([k, l, t]) => t === 'checkbox' ? `<label class="check"><input type="checkbox" name="${k}" ${s[k] ? 'checked' : ''}> ${l}</label>`
    : t === 'textarea' ? `<div class="field"><label for="s-${k}">${l}</label><textarea class="textarea" id="s-${k}" name="${k}">${escape(s[k] ?? '')}</textarea></div>`
    : `<div class="field"><label for="s-${k}">${l}</label><input class="input" id="s-${k}" name="${k}" type="${t || 'text'}" value="${escape(s[k] ?? '')}"></div>`).join('')}</div>`).join('')}
    <div class="card stack"><h3 class="mb0">Guardar</h3><p class="muted small mb0">Los cambios quedan registrados en la bitácora.</p><button class="btn btn-primary btn-lg">${icon('check', 18)} Guardar configuración</button></div>
  </form>`;
  v.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const f = e.target, out = { ...settings() };
    F.flatMap(x => x[1]).forEach(([k, , t]) => { out[k] = t === 'checkbox' ? f[k].checked : t === 'number' ? Math.max(0, +f[k].value) : f[k].value.trim(); });
    if (!out.name) return toast('El nombre es obligatorio', 'warning');
    db.setValue('settings', out);
    db.log('config', 'Configuración del sitio actualizada', auth.current()?.id);
    toast('Configuración guardada · ya se ve en el sitio público', 'success');
  };
}
