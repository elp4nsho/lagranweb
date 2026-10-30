// Inventario por color: stock, punto de reposición, ventas, reposiciones y colores nuevos.
import { db, colors } from '../data/db.js';
import { pageHead, kpi, badge } from '../shared/admin-kit.js';
import { bottleSVG } from '../shared/bottle.js';
import { escape, num, money, toast, formModal, confirm, downloadCSV } from '../../../assets/core/ui.js';

const COST = 14500; // costo unitario simulado

export default {
  id: 'inventario', label: 'Inventario', ico: '🏷️', group: 'Operación', roles: ['admin', 'soporte'],
  count: () => db.count('colors', c => c.stock <= c.reorderAt),
  render(view, ctx) {
    const list = colors();
    const total = list.reduce((s, c) => s + c.stock, 0);
    const last30 = db.query('orders', o => Date.now() - new Date(o.createdAt) < 30 * 864e5 && !['cancelado', 'reembolsado'].includes(o.status));
    const sold30 = k => last30.reduce((s, o) => s + o.items.filter(i => i === k).length, 0);
    view.innerHTML = `${pageHead('Inventario por color', 'Si un color llega a 0 se muestra "Agotado" en la landing y no se puede comprar.', `<button class="btn" data-csv>⇩ CSV</button>${ctx.role === 'admin' ? '<button class="btn btn-primary" data-new>＋ Nuevo color</button>' : ''}`)}
      <div class="kpis">
        ${kpi('Unidades en bodega', num(total), { ico: '📦' })}
        ${kpi('Valor a costo', money(total * COST), { ico: '💵' })}
        ${kpi('Bajo mínimo', num(list.filter(c => c.stock <= c.reorderAt).length), { ico: '⚠️' })}
        ${kpi('Vendidas 30 días', num(list.reduce((s, c) => s + sold30(c.key), 0)), { ico: '📈' })}
      </div>
      <div class="grid-auto">${list.map(c => {
        const s30 = sold30(c.key), daysLeft = s30 ? Math.round(c.stock / (s30 / 30)) : '∞';
        const st = c.stock <= 0 ? ['Agotado', 'danger'] : c.stock <= c.reorderAt ? ['Reponer', 'warning'] : ['OK', 'success'];
        return `<div class="card stack">
          <div class="color-card">${bottleSVG(c)}<div class="stack" style="gap:4px;min-width:0"><b style="font-size:18px">${escape(c.name)}</b>${badge(...st)}${c.active === false ? badge('Oculto', '') : ''}</div></div>
          <div class="stock-cell"><span class="progress"><i style="--v:${Math.min(100, c.stock / Math.max(c.reorderAt * 4, 1) * 100)}%"></i></span><b>${num(c.stock)} u.</b></div>
          <dl class="kv small"><dt>Mínimo</dt><dd>${c.reorderAt} u.</dd><dt>Vendidas 30 d</dt><dd>${s30} u.</dd><dt>Cobertura</dt><dd>${daysLeft} días</dd><dt>Vendidas total</dt><dd>${num(c.sold || 0)} u.</dd></dl>
          <div class="row" style="gap:6px"><button class="btn btn-sm btn-primary" data-restock="${c.id}">＋ Reponer</button><button class="btn btn-sm" data-adjust="${c.id}">Ajustar</button>
          ${ctx.role === 'admin' ? `<button class="btn btn-sm btn-ghost" data-edit="${c.id}">Editar</button>` : ''}</div>
        </div>`;
      }).join('')}</div>`;
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.restock) {
        const c = db.get('colors', t.dataset.restock);
        const v = await formModal({ title: `Reponer ${c.name}`, submit: 'Registrar ingreso', fields: [{ name: 'qty', label: 'Unidades recibidas', type: 'number', value: 100, required: true }, { name: 'note', label: 'Proveedor / guía', value: 'OC-' + Math.floor(Math.random() * 9000 + 1000) }] });
        if (!v || !(v.qty > 0)) return;
        db.update('colors', c.id, { stock: c.stock + v.qty });
        db.log('Inventario', `Reposición ${c.name} +${v.qty} u. (${v.note})`, ctx.user.id);
        toast(`${c.name}: +${v.qty} unidades`, 'success');
      }
      if (t.dataset.adjust) {
        const c = db.get('colors', t.dataset.adjust);
        const v = await formModal({ title: `Ajustar stock de ${c.name}`, fields: [{ name: 'stock', label: 'Stock real contado', type: 'number', value: c.stock, required: true }, { name: 'reason', label: 'Motivo', type: 'select', options: ['Inventario físico', 'Merma / daño', 'Devolución', 'Muestra para prensa'] }] });
        if (!v || v.stock < 0) return;
        db.update('colors', c.id, { stock: v.stock });
        db.log('Inventario', `Ajuste ${c.name}: ${c.stock} → ${v.stock} (${v.reason})`, ctx.user.id);
        toast('Stock ajustado', 'success');
      }
      if (t.dataset.edit || t.matches('[data-new]')) {
        const c = t.dataset.edit ? db.get('colors', t.dataset.edit) : { name: '', base: '#888888', light: '#bbbbbb', dark: '#555555', stock: 0, reorderAt: 30, active: true };
        const v = await formModal({ title: c.id ? `Editar ${c.name}` : 'Nuevo color', fields: [
          { name: 'name', label: 'Nombre', value: c.name, required: true },
          { name: 'base', label: 'Color base', type: 'color', value: c.base }, { name: 'light', label: 'Tono claro', type: 'color', value: c.light }, { name: 'dark', label: 'Tono oscuro', type: 'color', value: c.dark },
          { name: 'stock', label: 'Stock', type: 'number', value: c.stock }, { name: 'reorderAt', label: 'Punto de reposición', type: 'number', value: c.reorderAt },
          { name: 'active', label: 'Visible en la landing', type: 'checkbox', value: c.active !== false }
        ] });
        if (!v) return;
        if (c.id) { db.update('colors', c.id, v); db.log('Color editado', v.name, ctx.user.id); }
        else { const key = v.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); if (db.find('colors', x => x.key === key)) return toast('Ya existe ese color', 'error'); db.insert('colors', { ...v, key, sold: 0, order: colors().length + 1 }); db.log('Color creado', v.name, ctx.user.id); }
        toast('Color guardado', 'success');
      }
      if (t.matches('[data-csv]')) downloadCSV('inventario-aquilo.csv', colors().map(c => ({ color: c.name, stock: c.stock, minimo: c.reorderAt, vendidas_30d: sold30(c.key), vendidas_total: c.sold, visible: c.active !== false ? 'sí' : 'no' })));
    };
    void confirm;
  }
};
