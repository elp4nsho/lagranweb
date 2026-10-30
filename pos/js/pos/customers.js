// Búsqueda de clientes por RUT, nombre o teléfono, y alta rápida para el programa de puntos.
import { html, raw, money, toast, modal, norm, debounce } from '../../../assets/core/ui.js';
import { db, auth, tierOf } from '../data/db.js';
import { rutDv } from '../data/seed.js';
import { cart } from './cart.js';

export function validRut(rut) {
  const clean = String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8) return null;
  const body = clean.slice(0, -1), dv = clean.slice(-1);
  if (rutDv(body) !== dv) return null;
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

export function openCustomerLookup() {
  const body = document.createElement('div');
  body.className = 'stack';
  body.innerHTML = `<input class="input" type="search" placeholder="RUT, nombre, teléfono o correo…" data-q autofocus aria-label="Buscar cliente"><div data-res></div>
    <details><summary class="btn btn-sm" style="list-style:none;display:inline-flex">+ Nuevo cliente</summary>
      <form class="form-grid" data-new style="margin-top:12px" novalidate>
        <div class="field full"><label for="nc-name">Nombre completo *</label><input class="input" id="nc-name" name="name"></div>
        <div class="field"><label for="nc-rut">RUT *</label><input class="input" id="nc-rut" name="rut" placeholder="12.345.678-5"></div>
        <div class="field"><label for="nc-phone">Teléfono</label><input class="input" id="nc-phone" name="phone"></div>
        <div class="field full"><label for="nc-email">Correo</label><input class="input" id="nc-email" name="email" type="email"></div>
        <button class="btn btn-primary full">Registrar y asociar a la venta</button>
      </form></details>`;
  const m = modal({ title: 'Cliente de la venta', body, foot: `${cart.state.customerId ? '<button class="btn btn-ghost" data-unset>Quitar cliente</button>' : ''}<button class="btn" data-close>Cerrar</button>` });
  const res = body.querySelector('[data-res]');
  const draw = q => {
    const t = norm(q).replace(/[.\-\s]/g, '');
    const list = db.all('customers').filter(c => !t || norm(`${c.name} ${c.rut} ${c.phone} ${c.email}`).replace(/[.\-\s]/g, '').includes(t)).sort((a, b) => b.visits - a.visits).slice(0, 8);
    res.innerHTML = list.length ? `<ul class="list-plain">${list.map(c => html`<li><span><b>${c.name}</b><br><small class="muted">${c.rut} · ${c.phone}</small></span><span class="row" style="gap:8px"><span class="badge badge-primary plain">${tierOf(c)} · ${c.points} pts</span><button class="btn btn-sm btn-primary" data-pick="${c.id}">Elegir</button></span></li>`).join('')}</ul>` : '<p class="muted">Sin resultados. Regístralo abajo.</p>';
  };
  draw('');
  body.querySelector('[data-q]').addEventListener('input', debounce(e => draw(e.target.value), 120));
  body.addEventListener('click', e => {
    const p = e.target.closest('[data-pick]');
    if (p) { const c = db.get('customers', p.dataset.pick); cart.setCustomer(c.id); toast(`Cliente: ${c.name} (${c.points} pts)`, 'success'); m.close(); }
  });
  m.el.querySelector('[data-unset]')?.addEventListener('click', () => { cart.setCustomer(null); m.close(); });
  body.querySelector('[data-new]').addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const rut = validRut(d.rut);
    if (!d.name.trim()) return toast('Ingresa el nombre', 'warning');
    if (!rut) return toast('RUT inválido (revisa el dígito verificador)', 'warning');
    if (db.find('customers', c => c.rut === rut)) return toast('Ya existe un cliente con ese RUT', 'warning');
    const c = db.insert('customers', { name: d.name.trim(), rut, phone: d.phone.trim(), email: d.email.trim(), points: 0, pointsEarned: 0, visits: 0, totalSpent: 0, lastVisit: '', favoriteBranch: null, birthday: '' });
    db.log('cliente', `Nuevo cliente desde caja: ${c.name}`, auth.current()?.id);
    cart.setCustomer(c.id);
    toast('Cliente registrado y asociado', 'success');
    m.close();
  });
}
