// Pedidos: listado con filtros, detalle, flujo de despacho, notas internas, pedido manual y CSV.
import { db, STATUS, NEXT, FLOW, colors, colorByKey, bundles, landing, setOrderStatus, nextOrderNumber, adjustStock, sendEmail, isSold } from '../data/db.js';
import { pageHead, table, badge } from '../shared/admin-kit.js';
import { bottleSVG } from '../shared/bottle.js';
import { escape, money, dateTime, date, toast, confirm, formModal, modal } from '../../../assets/core/ui.js';

const statusBadge = s => badge(STATUS[s].label, STATUS[s].type);
const nextLabel = { preparando: 'Marcar en preparación', enviado: 'Marcar enviado', entregado: 'Marcar entregado' };

function list(view, ctx) {
  const rows = db.all('orders');
  const counts = Object.fromEntries(Object.keys(STATUS).map(s => [s, rows.filter(o => o.status === s).length]));
  view.innerHTML = `${pageHead('Pedidos', `${rows.length} pedidos · ${counts.pagado} por preparar · ${counts.preparando} en preparación`, '<button class="btn btn-primary" data-new>＋ Pedido manual</button>')}
    <div class="row" style="gap:8px">${Object.entries(STATUS).map(([k, s]) => `<span class="badge badge-${s.type}">${s.label}: ${counts[k]}</span>`).join('')}</div>
    <div class="card" id="tbl"></div>`;
  table(view.querySelector('#tbl'), {
    id: 'orders', rows, pageSize: 12, sort: { key: 'createdAt', dir: -1 },
    search: o => `${o.number} ${o.customer.name} ${o.customer.email} ${o.customer.city} ${o.tracking}`,
    filters: [
      { key: 'status', label: 'Estado', options: Object.entries(STATUS).map(([k, s]) => [k, s.label]) },
      { key: 'bundleId', label: 'Pack', options: bundles(true).map(b => [b.id, b.name]) },
      { key: 'shipMethod', label: 'Envío', options: [['estandar', 'Estándar'], ['express', 'Express']] },
      { key: 'period', label: 'Fecha', options: [['1', 'Hoy'], ['7', '7 días'], ['30', '30 días']], test: (o, v) => Date.now() - new Date(o.createdAt) < +v * 864e5 },
      { key: 'extra', label: 'Extras', options: [['bump', 'Con order bump'], ['upsell', 'Con upsell'], ['ref', 'Con afiliado'], ['coupon', 'Con cupón']], test: (o, v) => !!o[v] }
    ],
    columns: [
      { key: 'number', label: 'Pedido', render: o => `<b class="mono">${escape(o.number)}</b>` },
      { key: 'createdAt', label: 'Fecha', render: o => `<span class="small">${escape(dateTime(o.createdAt))}</span>` },
      { key: 'customer', label: 'Cliente', value: o => o.customer.name, render: o => `${escape(o.customer.name)}<br><small class="muted">${escape(o.customer.city)}</small>` },
      { key: 'items', label: 'Unidades', value: o => o.items.length, render: o => `<span class="row" style="gap:3px;flex-wrap:nowrap">${o.items.map(k => `<i class="sw" style="--sw:${colorByKey(k)?.base || 'var(--muted)'}" title="${escape(colorByKey(k)?.name || k)}"></i>`).join('')}</span>` },
      { key: 'total', label: 'Total', render: o => `<b>${money(o.total)}</b>${o.bump ? ' <span class="badge badge-primary plain" title="Order bump">+B</span>' : ''}${o.upsell ? ' <span class="badge badge-info plain" title="Upsell">+U</span>' : ''}` },
      { key: 'status', label: 'Estado', render: o => statusBadge(o.status) },
      { key: 'act', label: '', sort: false, render: o => `<div class="t-actions">${NEXT[o.status] ? `<button class="btn btn-sm" data-adv="${o.id}" title="${nextLabel[NEXT[o.status]]}">→ ${STATUS[NEXT[o.status]].label}</button>` : ''}<a class="btn btn-sm btn-ghost" href="#/pedidos/${o.id}">Ver</a></div>` }
    ],
    onRow: o => { location.hash = '#/pedidos/' + o.id; },
    csv: { name: 'pedidos-aquilo.csv', map: o => ({ pedido: o.number, fecha: o.createdAt.slice(0, 10), cliente: o.customer.name, correo: o.customer.email, region: o.customer.region, comuna: o.customer.city, pack: o.bundleName, unidades: o.items.length, colores: o.items.join('|'), bump: o.bump ? 'sí' : 'no', upsell: o.upsell ? 'sí' : 'no', cupon: o.coupon, descuento: o.discount, envio: o.shipping, total: o.total, estado: STATUS[o.status].label, afiliado: o.ref, variante: o.variant, seguimiento: o.tracking }) }
  });
  view.onclick = e => {
    const adv = e.target.closest('[data-adv]');
    if (adv) { const o = db.get('orders', adv.dataset.adv); setOrderStatus(o, NEXT[o.status], '', ctx.user.id); toast(`${o.number} → ${STATUS[NEXT[o.status]].label}`, 'success'); }
    if (e.target.closest('[data-new]')) manualOrder(ctx);
  };
}

async function manualOrder(ctx) {
  const v = await formModal({
    title: 'Nuevo pedido manual', submit: 'Crear pedido', fields: [
      { name: 'name', label: 'Nombre del cliente', required: true },
      { name: 'email', label: 'Correo', type: 'email', required: true },
      { name: 'phone', label: 'Teléfono', value: '+56 9 ' },
      { name: 'city', label: 'Comuna', required: true },
      { name: 'region', label: 'Región', type: 'select', options: ['Metropolitana', 'Valparaíso', 'Biobío', 'Antofagasta', 'Coquimbo', 'Los Ríos', 'Los Lagos', 'Magallanes', "O'Higgins"] },
      { name: 'address', label: 'Dirección', required: true },
      { name: 'bundleId', label: 'Pack', type: 'select', options: bundles().map(b => [b.id, `${b.name} · ${money(b.price)}`]) },
      { name: 'color', label: 'Color (todas las unidades)', type: 'select', options: colors().filter(c => c.stock > 0).map(c => [c.key, `${c.name} (${c.stock} u.)`]) },
      { name: 'bump', label: `Incluir ${landing().bump.name}`, type: 'checkbox' }
    ]
  });
  if (!v) return;
  if (!/^\S+@\S+\.\S+$/.test(v.email)) return toast('Correo inválido', 'error');
  const b = bundles().find(x => x.id === v.bundleId), c = colorByKey(v.color);
  if (!c || c.stock < b.qty) return toast('Stock insuficiente para ese color', 'error');
  const number = nextOrderNumber();
  const bumpPrice = v.bump ? landing().bump.price : 0;
  const o = db.insert('orders', {
    id: 'o' + number.slice(3), number, customer: { name: v.name, email: v.email, phone: v.phone, region: v.region, city: v.city, address: v.address },
    bundleId: b.id, bundleName: b.name, bundlePrice: b.price, items: Array(b.qty).fill(c.key), bump: !!v.bump, bumpPrice, upsell: false, upsellPrice: 0,
    coupon: '', discount: 0, shipping: 0, shipMethod: 'estandar', subtotal: b.price + bumpPrice, total: b.price + bumpPrice, status: 'pagado',
    history: [{ status: 'pagado', at: new Date().toISOString(), note: `Pedido manual creado por ${ctx.user.name}` }], ref: '', variant: '', carrier: '', tracking: '', notes: []
  });
  adjustStock(o.items, -1);
  db.log('Pedido manual', `${o.number} · ${o.customer.name}`, ctx.user.id);
  toast(`Pedido ${o.number} creado`, 'success');
  location.hash = '#/pedidos/' + o.id;
}

function detail(view, ctx, id) {
  const o = db.get('orders', id);
  if (!o) { view.innerHTML = `<div class="card empty"><span class="icon">📦</span><h2>Pedido no encontrado</h2><a class="btn" href="#/pedidos">Volver</a></div>`; return; }
  const L = landing();
  const counts = {};
  o.items.forEach(k => { counts[k] = (counts[k] || 0) + 1; });
  const idx = FLOW.indexOf(o.status);
  view.innerHTML = `
    ${pageHead(`Pedido ${o.number}`, `Creado el ${escape(dateTime(o.createdAt))} ${o.variant ? `· variante A/B <b>${o.variant}</b>` : ''} ${o.ref ? `· afiliado <b class="mono">${escape(o.ref)}</b>` : ''}`,
      `<a class="btn btn-ghost" href="#/pedidos">← Pedidos</a><a class="btn" href="seguimiento.html?n=${encodeURIComponent(o.number)}&e=${encodeURIComponent(o.customer.email)}" target="_blank" rel="noopener">Ver como cliente ↗</a>`)}
    <div class="detail-grid">
      <div class="stack">
        <div class="card stack">
          <div class="card-title" style="margin:0"><h3>Estado: ${statusBadge(o.status)}</h3>
            <div class="row" style="gap:8px">
              ${NEXT[o.status] ? `<button class="btn btn-primary" data-adv>${nextLabel[NEXT[o.status]]}</button>` : ''}
              ${['pagado', 'preparando'].includes(o.status) ? '<button class="btn btn-ghost" data-cancel>Cancelar</button>' : ''}
              ${['enviado', 'entregado'].includes(o.status) ? '<button class="btn btn-ghost" data-refund>Reembolsar</button>' : ''}
            </div></div>
          ${isSold(o) ? `<div class="track-steps">${FLOW.map((s, i) => `<div class="${i <= idx ? 'done' : ''}"><i aria-hidden="true">${['💳', '📦', '🚚', '🏠'][i]}</i>${STATUS[s].label}</div>`).join('')}</div>` : ''}
          ${o.tracking ? `<p class="small" style="margin:0">Transporte <b>${escape(o.carrier)}</b> · seguimiento <b class="mono">${escape(o.tracking)}</b></p>` : ''}
        </div>
        <div class="card stack"><h3 style="margin:0">Productos</h3>
          ${Object.entries(counts).map(([k, n]) => { const c = colorByKey(k); return `<div class="sum-item">${bottleSVG(c)}<div class="grow"><b>Aquilo Pulse 650 ml</b><br><span class="muted">${escape(c ? c.name : k)}</span></div><b>×${n}</b></div>`; }).join('')}
          <div>
            <div class="sum-line"><span>${escape(o.bundleName)}</span><span>${money(o.bundlePrice)}</span></div>
            ${o.bump ? `<div class="sum-line"><span>Order bump · ${escape(L.bump.name)}</span><span>${money(o.bumpPrice)}</span></div>` : ''}
            ${o.upsell ? `<div class="sum-line"><span>Upsell · ${escape(L.upsell.name)}</span><span>${money(o.upsellPrice)}</span></div>` : ''}
            ${o.discount ? `<div class="sum-line disc"><span>Cupón ${escape(o.coupon)}</span><span>−${money(o.discount)}</span></div>` : ''}
            <div class="sum-line"><span>Envío (${o.shipMethod})</span><span>${o.shipping ? money(o.shipping) : 'Gratis'}</span></div>
            <div class="sum-line total"><span>Total</span><span>${money(o.total)}</span></div>
          </div>
        </div>
        <div class="card"><h3>Historial</h3><ol class="timeline">${[...o.history].reverse().map((h, i) => `<li class="${i === 0 ? 'now' : 'done'}"><span class="tl-dot">${i === 0 ? '●' : '✓'}</span><b>${escape(STATUS[h.status]?.label || h.status)}</b> · <span class="small">${escape(h.note || '')}</span><br><span class="small muted">${escape(dateTime(h.at))}</span></li>`).join('')}</ol></div>
      </div>
      <div class="stack">
        <div class="card stack"><div class="card-title" style="margin:0"><h3>Cliente</h3><button class="btn btn-sm" data-edit>Editar</button></div>
          <dl class="kv"><dt>Nombre</dt><dd>${escape(o.customer.name)}</dd><dt>Correo</dt><dd>${escape(o.customer.email)}</dd><dt>Teléfono</dt><dd>${escape(o.customer.phone)}</dd>
          <dt>Dirección</dt><dd>${escape(o.customer.address)}, ${escape(o.customer.city)}</dd><dt>Región</dt><dd>${escape(o.customer.region)}</dd></dl>
          <button class="btn btn-sm" data-mail>✉️ Reenviar confirmación</button>
        </div>
        <div class="card stack"><h3 style="margin:0">Notas internas</h3>
          ${(o.notes || []).map(n => `<div class="small"><b>${escape(n.by)}</b> · <span class="muted">${escape(date(n.at))}</span><br>${escape(n.text)}</div>`).join('') || '<p class="muted small" style="margin:0">Sin notas.</p>'}
          <form class="stack" data-note style="gap:8px"><textarea class="textarea" name="text" placeholder="Ej: cliente pidió entregar después de las 18 h" style="min-height:70px"></textarea><button class="btn btn-sm" type="submit">Agregar nota</button></form>
        </div>
        ${ctx.role === 'admin' ? '<button class="btn btn-danger" data-del>Eliminar pedido</button>' : ''}
      </div>
    </div>`;
  const $ = s => view.querySelector(s);
  $('[data-adv]')?.addEventListener('click', () => { setOrderStatus(o, NEXT[o.status], '', ctx.user.id); toast(`Pedido ${STATUS[NEXT[o.status]].label.toLowerCase()}`, 'success'); });
  $('[data-cancel]')?.addEventListener('click', async () => { if (await confirm(`¿Cancelar ${o.number}? El stock vuelve al inventario.`, { danger: true, ok: 'Cancelar pedido' })) { setOrderStatus(o, 'cancelado', 'Cancelado por soporte', ctx.user.id); toast('Pedido cancelado', 'warning'); } });
  $('[data-refund]')?.addEventListener('click', async () => { if (await confirm(`¿Reembolsar ${money(o.total)} de ${o.number}?`, { danger: true, ok: 'Reembolsar' })) { setOrderStatus(o, 'reembolsado', 'Reembolso por garantía', ctx.user.id); toast('Reembolso registrado', 'warning'); } });
  $('[data-mail]').addEventListener('click', () => { sendEmail(o.customer.email, `Tu pedido ${o.number} está confirmado`, 'au3'); db.log('Correo reenviado', o.number, ctx.user.id); toast(`Correo enviado a ${o.customer.email}`, 'success'); });
  $('[data-note]').addEventListener('submit', e => {
    e.preventDefault(); const text = e.target.text.value.trim(); if (!text) return;
    db.update('orders', o.id, { notes: [...(o.notes || []), { text, by: ctx.user.name, at: new Date().toISOString() }] }); toast('Nota agregada', 'success');
  });
  $('[data-edit]').addEventListener('click', async () => {
    const v = await formModal({ title: 'Editar datos del cliente', fields: ['name', 'email', 'phone', 'address', 'city', 'region'].map(k => ({ name: k, label: { name: 'Nombre', email: 'Correo', phone: 'Teléfono', address: 'Dirección', city: 'Comuna', region: 'Región' }[k], value: o.customer[k], required: k !== 'phone' })) });
    if (!v) return;
    db.update('orders', o.id, { customer: { ...o.customer, ...v } }); db.log('Pedido editado', `${o.number}: datos de cliente`, ctx.user.id); toast('Datos actualizados', 'success');
  });
  $('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirm(`¿Eliminar definitivamente ${o.number}?`, { danger: true, ok: 'Eliminar' }))) return;
    if (isSold(o)) adjustStock(o.items, +1);
    db.remove('orders', o.id); db.log('Pedido eliminado', o.number, ctx.user.id); toast('Pedido eliminado', 'success'); location.hash = '#/pedidos';
  });
  void modal;
}

export default {
  id: 'pedidos', label: 'Pedidos', ico: '📦', group: 'Ventas', roles: ['admin', 'soporte'],
  count: () => db.count('orders', o => o.status === 'pagado'),
  render(view, ctx) { ctx.params.id ? detail(view, ctx, ctx.params.id) : list(view, ctx); }
};
