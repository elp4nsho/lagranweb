// Ajustes de tienda (solo administración): datos de contacto, tarifas de despacho, envío gratis, umbral de stock.
import { html, raw, money, toast, confirm } from '../../../assets/core/ui.js';
import { db, auth, settings, saveSettings } from '../data/db.js';
import { pageHead, log } from './common.js';

export function render(el) {
  const s = settings();
  let rates = JSON.parse(JSON.stringify(s.shipping?.rates || []));
  el.innerHTML = html`${raw(pageHead('Ajustes de tienda', 'Configuración general. Solo visible para administradores.'))}
    <form class="detail-grid" id="settings" novalidate>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Datos de la tienda</h3>
          <div class="form-grid">
            <div class="field"><label for="s-name">Nombre</label><input class="input" id="s-name" name="storeName" value="${s.storeName}"></div>
            <div class="field"><label for="s-tag">Lema</label><input class="input" id="s-tag" name="tagline" value="${s.tagline}"></div>
            <div class="field"><label for="s-mail">Correo de contacto</label><input class="input" id="s-mail" name="contactEmail" type="email" value="${s.contactEmail}"></div>
            <div class="field"><label for="s-phone">Teléfono</label><input class="input" id="s-phone" name="phone" value="${s.phone}"></div>
            <div class="field full"><label for="s-addr">Dirección tienda física</label><input class="input" id="s-addr" name="address" value="${s.address}"></div>
          </div>
        </div>
        <div class="card stack"><div class="card-head"><h3>Tarifas de despacho</h3><button type="button" class="btn btn-sm" data-addrate>+ Agregar tarifa</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Precio (CLP)</th><th>Plazo</th><th></th></tr></thead><tbody data-rates></tbody></table></div>
          <div class="form-grid">
            <div class="field"><label for="s-free">Envío gratis desde (CLP, 0 = desactivado)</label><input class="input" id="s-free" name="freeThreshold" type="number" min="0" step="1000" value="${s.shipping?.freeThreshold || 0}"></div>
            <div class="field"><label for="s-low">Alerta de stock bajo (unidades)</label><input class="input" id="s-low" name="lowStock" type="number" min="0" value="${s.lowStock}"></div>
          </div>
        </div>
        <div class="row"><button class="btn btn-primary btn-lg">Guardar ajustes</button></div>
      </div>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Así se verá</h3><p class="small muted" style="margin:0" data-prev></p></div>
        <div class="card stack"><h3 style="margin:0">Datos de demostración</h3><p class="small muted" style="margin:0">Vuelve el catálogo, pedidos, clientes y ajustes a su estado inicial. Las cuentas demo se mantienen.</p><button type="button" class="btn btn-danger" data-resetdb>↺ Restablecer datos demo</button></div>
        <div class="card stack"><h3 style="margin:0">Almacenamiento</h3><p class="small muted" style="margin:0">La “base de datos” vive en tu navegador (localStorage) y se comparte entre la tienda y este panel, también entre pestañas.</p><p class="small" style="margin:0">Tamaño actual: <b>${(JSON.stringify(db.export()).length / 1024).toFixed(0)} KB</b> · ${db.count('orders')} pedidos · ${db.count('products')} productos</p></div>
      </div>
    </form>`;
  const tbody = el.querySelector('[data-rates]'), form = el.querySelector('#settings');
  const draw = () => {
    tbody.innerHTML = rates.map((r, i) => html`<tr><td><input class="input" data-r="${i}" data-k="name" value="${r.name}" aria-label="Nombre"></td><td><input class="input" type="number" min="0" step="10" data-r="${i}" data-k="price" value="${r.price}" style="max-width:120px" aria-label="Precio"></td><td><input class="input" data-r="${i}" data-k="days" value="${r.days}" aria-label="Plazo"></td><td><button type="button" class="btn btn-sm btn-ghost" data-rmrate="${i}" ${rates.length < 2 ? 'disabled' : ''} aria-label="Quitar">✕</button></td></tr>`).join('');
    prev();
  };
  const prev = () => {
    const ft = +form.elements.freeThreshold.value;
    el.querySelector('[data-prev]').innerHTML = `Barra del carro: “Te faltan <b>${money(Math.max(0, ft - 30000))}</b> para envío gratis” (con un carro de $30.000). Opciones en checkout: ${rates.map(r => `${r.name} (${r.price ? money(r.price) : 'gratis'})`).join(', ')}.`;
  };
  draw();
  form.addEventListener('input', e => {
    const r = e.target.dataset.r;
    if (r !== undefined) rates[r][e.target.dataset.k] = e.target.dataset.k === 'price' ? Math.max(0, +e.target.value) : e.target.value;
    prev();
  });
  form.addEventListener('click', async e => {
    if (e.target.closest('[data-addrate]')) { rates.push({ id: 'r' + Date.now().toString(36), name: 'Nueva tarifa', price: 4990, days: '2 a 4 días hábiles' }); draw(); }
    const rm = e.target.closest('[data-rmrate]');
    if (rm) { rates.splice(+rm.dataset.rmrate, 1); draw(); }
    if (e.target.closest('[data-resetdb]') && await confirm('Se perderán todos los cambios hechos en la demo. ¿Restablecer?', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) {
      const id = auth.current()?.id;
      db.reset();
      db.log('sistema', 'Datos demo restablecidos', id);
      toast('Datos demo restablecidos', 'success');
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    if (!f.storeName.value.trim()) return toast('El nombre de la tienda es obligatorio', 'warning');
    if (rates.some(r => !r.name.trim())) return toast('Cada tarifa necesita un nombre', 'warning');
    saveSettings({
      storeName: f.storeName.value.trim(), tagline: f.tagline.value.trim(), contactEmail: f.contactEmail.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(),
      shipping: { rates, freeThreshold: Math.max(0, +f.freeThreshold.value || 0) }, lowStock: Math.max(0, +f.lowStock.value || 0)
    });
    log('ajustes', `Actualizó ajustes (envío gratis desde ${money(+f.freeThreshold.value)})`);
    toast('Ajustes guardados · ya aplican en la tienda', 'success');
  });
}
