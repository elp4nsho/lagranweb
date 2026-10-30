// Ajustes (solo administración): datos tributarios de la boleta, IVA, fidelización, límites de caja y datos demo.
import { html, raw, money, toast, confirm } from '../../../assets/core/ui.js';
import { db, auth, settings, saveSettings } from '../data/db.js';
import { pageHead, log } from '../shared/common.js';
import { receiptHtml } from '../shared/receipt.js';

export function render(el) {
  const s = settings();
  const L = s.loyalty || {};
  el.innerHTML = html`${raw(pageHead('Ajustes', 'Configuración general del negocio. Los cambios aplican de inmediato en todas las cajas.'))}
    <form class="detail-grid" id="cfg" novalidate>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Empresa y boleta</h3><div class="form-grid">
          <div class="field"><label for="s-bn">Nombre de fantasía</label><input class="input" id="s-bn" name="businessName" value="${s.businessName}"></div>
          <div class="field"><label for="s-ln">Razón social</label><input class="input" id="s-ln" name="legalName" value="${s.legalName}"></div>
          <div class="field"><label for="s-rut">RUT</label><input class="input" id="s-rut" name="rut" value="${s.rut}"></div>
          <div class="field"><label for="s-giro">Giro</label><input class="input" id="s-giro" name="giro" value="${s.giro}"></div>
          <div class="field"><label for="s-iva">IVA (%)</label><input class="input" id="s-iva" name="iva" type="number" min="0" max="30" value="${s.iva}"></div>
          <div class="field"><label for="s-mail">Correo</label><input class="input" id="s-mail" name="email" value="${s.email}"></div>
          <div class="field full"><label for="s-foot">Pie de boleta</label><input class="input" id="s-foot" name="receiptFooter" value="${s.receiptFooter}"></div>
        </div></div>
        <div class="card stack"><h3 style="margin:0">Caja</h3><div class="form-grid">
          <div class="field"><label for="s-open">Fondo inicial sugerido</label><input class="input" id="s-open" name="openingCash" type="number" min="0" step="1000" value="${s.openingCash}"></div>
          <div class="field"><label for="s-md">Descuento máximo sin supervisor (%)</label><input class="input" id="s-md" name="cashierMaxDiscount" type="number" min="0" max="100" value="${s.cashierMaxDiscount}"></div>
        </div></div>
        <div class="card stack"><h3 style="margin:0">Programa de puntos</h3>
          <label class="check"><input type="checkbox" name="lEnabled" ${L.enabled ? 'checked' : ''}> Programa activo</label>
          <div class="form-grid">
            <div class="field"><label for="s-ppp">1 punto por cada ($)</label><input class="input" id="s-ppp" name="pesosPerPoint" type="number" min="1" value="${L.pesosPerPoint}"></div>
            <div class="field"><label for="s-pv">Valor de 1 punto ($)</label><input class="input" id="s-pv" name="pointValue" type="number" min="0" step="0.5" value="${L.pointValue}"></div>
            <div class="field"><label for="s-mr">Canje mínimo (puntos)</label><input class="input" id="s-mr" name="minRedeem" type="number" min="0" value="${L.minRedeem}"></div>
            ${(L.tiers || []).map((t, i) => raw(html`<div class="field"><label for="s-t${i}">Nivel ${t.name} desde (pts acumulados)</label><input class="input" id="s-t${i}" data-tier="${i}" type="number" min="0" value="${t.min}" ${i === 0 ? 'disabled' : ''}></div>`))}
          </div>
          <p class="small muted" style="margin:0" data-ex></p>
        </div>
        <div class="row"><button class="btn btn-primary btn-lg">Guardar ajustes</button></div>
      </div>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Vista previa de boleta</h3><div data-prev></div></div>
        <div class="card stack"><h3 style="margin:0">Datos de demostración</h3><p class="small muted" style="margin:0">Restaura productos, ventas, turnos y usuarios de ejemplo. También limpia la cola offline y las ventas retenidas de este navegador.</p><button type="button" class="btn btn-danger" data-resetdb>↺ Restablecer datos demo</button>
          <p class="small" style="margin:0">Tamaño de la base: <b>${(JSON.stringify(db.export()).length / 1024).toFixed(0)} KB</b> · ${db.count('sales')} boletas con detalle · ${db.count('daily')} días agregados</p></div>
      </div>
    </form>`;
  const form = el.querySelector('#cfg');
  const prev = () => {
    const f = form.elements;
    const sample = db.all('sales').find(x => x.customerId) || db.all('sales')[0];
    const backup = settings();
    // Vista previa con los valores del formulario (sin guardar)
    const tmp = { ...backup, businessName: f.businessName.value, legalName: f.legalName.value, rut: f.rut.value, giro: f.giro.value, receiptFooter: f.receiptFooter.value, iva: +f.iva.value };
    const real = db.getValue; db.getValue = (k, d) => k === 'settings' ? tmp : real(k, d);
    try { el.querySelector('[data-prev]').innerHTML = sample ? receiptHtml(sample) : ''; } finally { db.getValue = real; }
    el.querySelector('[data-ex]').textContent = `Ejemplo: una compra de $10.000 suma ${Math.floor(10000 / (+f.pesosPerPoint.value || 100))} puntos (${money(Math.floor(10000 / (+f.pesosPerPoint.value || 100)) * +f.pointValue.value)} de descuento futuro, ${((+f.pointValue.value / (+f.pesosPerPoint.value || 100)) * 100).toFixed(1)}% de devolución).`;
  };
  prev();
  form.addEventListener('input', prev);
  form.addEventListener('click', async e => {
    if (e.target.closest('[data-resetdb]') && await confirm('Se perderán todos los cambios hechos en la demo. ¿Restablecer?', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) {
      const id = auth.current()?.id;
      db.reset();
      try { Object.keys(localStorage).filter(k => k.startsWith('pampa:')).forEach(k => localStorage.removeItem(k)); } catch (er) { /* */ }
      db.log('sistema', 'Datos demo restablecidos', id);
      toast('Datos demo restablecidos', 'success');
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    if (!f.businessName.value.trim()) return toast('El nombre es obligatorio', 'warning');
    const tiers = (L.tiers || []).map((t, i) => ({ ...t, min: i === 0 ? 0 : Math.max(0, +form.querySelector(`[data-tier="${i}"]`).value || 0) }));
    if (tiers.some((t, i) => i && t.min <= tiers[i - 1].min)) return toast('Cada nivel debe requerir más puntos que el anterior', 'warning');
    saveSettings({
      businessName: f.businessName.value.trim(), legalName: f.legalName.value.trim(), rut: f.rut.value.trim(), giro: f.giro.value.trim(), email: f.email.value.trim(), receiptFooter: f.receiptFooter.value.trim(),
      iva: Math.max(0, +f.iva.value || 19), openingCash: Math.max(0, +f.openingCash.value || 0), cashierMaxDiscount: Math.max(0, Math.min(100, +f.cashierMaxDiscount.value || 0)),
      loyalty: { ...L, enabled: f.lEnabled.checked, pesosPerPoint: Math.max(1, +f.pesosPerPoint.value || 100), pointValue: Math.max(0, +f.pointValue.value || 1), minRedeem: Math.max(0, +f.minRedeem.value || 0), tiers }
    });
    log('ajustes', `Actualizó ajustes (1 punto cada ${money(+f.pesosPerPoint.value)}, descuento máx. cajero ${f.cashierMaxDiscount.value}%)`);
    toast('Ajustes guardados', 'success');
  });
}
