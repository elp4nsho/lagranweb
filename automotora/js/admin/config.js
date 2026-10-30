// Configuración general: datos de la empresa, márgenes de descuento, horarios y marcas.
import { escape, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { log } from './kit.js';
import { nf } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function renderSettings(v) {
  const s = db.getValue('settings');
  v.innerHTML = `${pageHead('Configuración', 'Datos generales, políticas comerciales y marcas representadas.')}
  <form class="card stack" data-form novalidate><h3>${icon('store', 18)} Empresa</h3><div class="form-grid">${[['name', 'Nombre'], ['tagline', 'Bajada'], ['phone', 'Teléfono'], ['whatsapp', 'WhatsApp'], ['email', 'Correo']].map(([k, l]) => `<div class="field"><label for="s-${k}">${l}</label><input class="input" id="s-${k}" name="${k}" value="${escape(s[k] || '')}"></div>`).join('')}</div>
    <h3>${icon('percent', 18)} Política comercial</h3><div class="form-grid"><div class="field"><label for="s-d1">Descuento máx. ejecutivo (%)</label><input class="input" id="s-d1" name="maxDiscountSeller" type="number" step="0.5" min="0" value="${s.maxDiscountSeller}"></div><div class="field"><label for="s-d2">Descuento máx. con aprobación gerente (%)</label><input class="input" id="s-d2" name="maxDiscountManager" type="number" step="0.5" min="0" value="${s.maxDiscountManager}"></div><div class="field"><label for="s-qv">Validez de cotizaciones (días)</label><input class="input" id="s-qv" name="quoteValidity" type="number" min="1" value="${s.quoteValidity}"></div></div>
    <h3>${icon('clock', 18)} Horarios</h3><div class="form-grid"><div class="field"><label for="s-td">Bloques de test drive</label><input class="input" id="s-td" name="testDriveSlots" value="${escape(s.testDriveSlots.join(', '))}"></div><div class="field"><label for="s-ws">Bloques de taller</label><input class="input" id="s-ws" name="workshopSlots" value="${escape(s.workshopSlots.join(', '))}"></div></div>
    <button class="btn btn-primary">Guardar configuración</button></form>
  <div class="card"><h3>${icon('car', 18)} Marcas representadas</h3><div class="table-wrap"><table class="table"><thead><tr><th>Marca</th><th>Garantía (años)</th><th>Garantía (km)</th><th>Pauta cada (miles km)</th><th>Pauta cada (meses)</th><th>Activa</th></tr></thead><tbody>
  ${db.all('brands').map(b => `<tr><td><b>${escape(b.name)}</b></td><td><input class="input inline-edit" type="number" data-b="${b.id}" data-k="warrantyYears" value="${b.warrantyYears}" aria-label="Años"></td><td><input class="input inline-edit" type="number" step="10000" data-b="${b.id}" data-k="warrantyKm" value="${b.warrantyKm}" aria-label="Km"></td><td><input class="input inline-edit" type="number" data-b="${b.id}" data-k="plan0" value="${b.plan[0]}" aria-label="Km pauta"></td><td><input class="input inline-edit" type="number" data-b="${b.id}" data-k="plan1" value="${b.plan[1]}" aria-label="Meses pauta"></td><td><label class="switch"><input type="checkbox" data-b="${b.id}" data-k="active" ${b.active !== false ? 'checked' : ''} aria-label="Activa"><span></span></label></td></tr>`).join('')}</tbody></table></div><p class="small muted">Desactivar una marca oculta sus modelos del sitio.</p></div>`;
  v.querySelector('[data-form]').onsubmit = e => {
    e.preventDefault(); const f = e.target;
    const slots = x => x.split(',').map(t => t.trim()).filter(t => /^\d{2}:\d{2}$/.test(t)).sort();
    const d1 = +f.maxDiscountSeller.value, d2 = +f.maxDiscountManager.value;
    if (d1 < 0 || d2 < d1) return toast('El máximo de gerencia debe ser mayor o igual al del ejecutivo', 'warning');
    if (!f.name.value.trim()) return toast('El nombre es obligatorio', 'warning');
    const n = { ...s, name: f.name.value.trim(), tagline: f.tagline.value, phone: f.phone.value, whatsapp: f.whatsapp.value, email: f.email.value, maxDiscountSeller: d1, maxDiscountManager: d2, quoteValidity: +f.quoteValidity.value || 7, testDriveSlots: slots(f.testDriveSlots.value), workshopSlots: slots(f.workshopSlots.value) };
    if (!n.testDriveSlots.length || !n.workshopSlots.length) return toast('Ingresa horarios válidos (HH:MM separados por coma)', 'warning');
    db.setValue('settings', n); log('configuración', 'Configuración general actualizada'); toast('Configuración guardada', 'success');
  };
  v.addEventListener('change', e => { const t = e.target.closest('[data-b]'); if (!t) return; const b = db.get('brands', t.dataset.b), k = t.dataset.k; let patch; if (k === 'active') patch = { active: t.checked }; else if (k.startsWith('plan')) { const p = [...b.plan]; p[+k.slice(4)] = +t.value; patch = { plan: p }; } else patch = { [k]: +t.value }; db.update('brands', b.id, patch); log('marcas', `${b.name}: ${k}`); toast('Marca actualizada', 'success', 1300); });
}
export { nf };
