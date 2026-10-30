// Inventario de unidades por VIN: tránsito → stock → reservado → vendido → entregado.
import { escape, money, toast, modal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { model, version, color, brand, showroom, unitBadge, UNIT_STATUS, daysInStock } from '../shared/domain.js';
import { log, del, opts, carCell, showroomOpts, brandOpts, modelOpts } from './kit.js';
import { ymd, addDays, fdate, nf, VIN_CH } from '../shared/util.js';
import { icon } from '../shared/icons.js';
import { hbars } from '../shared/charts.js';

const WMI = { toyota: 'JTD', kia: 'KNA', hyundai: 'KMH', chevrolet: '9BG', mazda: 'JM1', bmw: 'WBA', volvo: 'YV1', byd: 'LGX' };
export const newVin = b => (WMI[b] || 'AP1') + Array.from({ length: 14 }, () => VIN_CH[Math.floor(Math.random() * VIN_CH.length)]).join('');

export function renderInventory(v, _p, query) {
  const all = db.all('units');
  const st = all.filter(u => u.status === 'stock'), tr = all.filter(u => u.status === 'transito');
  const aging = [['0–30 días', 0, 30], ['31–60 días', 31, 60], ['61–90 días', 61, 90], ['Más de 90 días', 91, 9999]].map(([label, a, b]) => ({ label, value: st.filter(u => daysInStock(u) >= a && daysInStock(u) <= b).length }));
  v.innerHTML = `${pageHead('Inventario por VIN', 'Unidades físicas por sucursal. Las disponibles aparecen en el sitio como "en stock" o "en tránsito".', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Ingresar unidad</button>`)}
  <div class="grid-4">${statCard('En stock', st.length, `<span class="muted small">${money(st.reduce((a, u) => a + u.cost, 0))} a costo</span>`, 'store')}${statCard('En tránsito', tr.length, `<span class="muted small">${tr.filter(u => u.eta <= addDays(ymd(), 7)).length} llegan esta semana</span>`, 'truck')}${statCard('Reservadas', all.filter(u => u.status === 'reservado').length, '', 'lock')}${statCard('Vendidas por entregar', all.filter(u => u.status === 'vendido').length, '', 'key')}</div>
  <div class="grid-main"><div class="card" data-list></div><div class="card"><h3>Antigüedad del stock</h3>${hbars(aging, { format: x => x + ' u.' })}<p class="small muted" style="margin-top:12px">Promedio ${nf(st.reduce((a, u) => a + daysInStock(u), 0) / Math.max(1, st.length))} días. Sobre 90 días conviene una campaña de bono.</p></div></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('units').map(u => ({ ...u, days: daysInStock(u), brandId: model(u.modelId)?.brandId })), search: u => `${u.vin} ${model(u.modelId)?.name} ${u.customer || ''}`, pageSize: 10,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(UNIT_STATUS).map(([k, [l]]) => [k, l]), value: query.estado || '' }, { key: 'showroomId', label: 'Sucursal', options: showroomOpts() }, { key: 'brandId', label: 'Marca', options: brandOpts() }],
    columns: [
      { key: 'modelId', label: 'Unidad', render: u => ({ __raw: true, value: carCell(u.modelId, u.colorId, `${escape(version(u.modelId, u.versionId)?.name || '')} · ${escape(color(u.modelId, u.colorId)?.name || '')}`) }) },
      { key: 'vin', label: 'VIN', render: u => `<span class="mono small">${escape(u.vin)}</span>` },
      { key: 'showroomId', label: 'Sucursal', render: u => escape(showroom(u.showroomId).city) },
      { key: 'status', label: 'Estado', render: u => ({ __raw: true, value: unitBadge(u.status) + (u.customer ? `<br><small class="muted">${escape(u.customer)}</small>` : '') }) },
      { key: 'days', label: 'Días', render: u => u.status === 'transito' ? `ETA ${fdate(u.eta)}` : u.arrivedAt ? `<b style="color:var(--${u.days > 90 ? 'danger' : u.days > 60 ? 'warning' : 'text'})">${u.days}</b>` : '—' },
      { key: 'cost', label: 'Costo', render: u => money(u.cost) },
      { key: 'x', label: '', sort: false, render: u => ({ __raw: true, value: acts(u.status === 'transito' ? actBtn('receive', u.id, 'check', 'Recibir en sucursal') : '', ['stock', 'transito'].includes(u.status) ? actBtn('move', u.id, 'truck', 'Traspasar') : '', u.status === 'reservado' ? actBtn('release', u.id, 'x', 'Liberar reserva') : '', actBtn('del', u.id, 'trash', 'Eliminar')) }) }
    ],
    onAction: async (a, id) => {
      const u = db.get('units', id), lbl = `${model(u.modelId)?.name} VIN …${u.vin.slice(-6)}`;
      if (a === 'receive') { db.update('units', id, { status: 'stock', arrivedAt: ymd(), eta: null }); log('inventario', `Recibida ${lbl} en ${showroom(u.showroomId).city}`); toast('Unidad en stock · ya aparece como entrega inmediata', 'success'); }
      if (a === 'release') { db.update('units', id, { status: 'stock', leadId: null, customer: null }); log('inventario', `Reserva liberada ${lbl}`); toast('Reserva liberada', 'success'); }
      if (a === 'move') { const m = modal({ title: `Traspasar ${lbl}`, body: `<div class="field"><label for="mv">Sucursal destino</label><select class="select" id="mv">${opts(showroomOpts().filter(s => s[0] !== u.showroomId))}</select></div>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Traspasar</button>' }); m.el.querySelector('[data-ok]').onclick = () => { const to = m.el.querySelector('#mv').value; db.update('units', id, { showroomId: to }); log('inventario', `Traspaso ${lbl} → ${showroom(to).city}`); toast('Traspaso registrado', 'success'); m.close(); }; }
      if (a === 'del') { if (['vendido', 'reservado'].includes(u.status)) return toast('No se puede eliminar una unidad reservada o vendida', 'warning'); await del('units', id, lbl); }
      lv.refresh();
    },
    csv: { name: 'inventario.csv', map: u => ({ vin: u.vin, marca: brand(model(u.modelId)?.brandId)?.name, modelo: model(u.modelId)?.name, version: version(u.modelId, u.versionId)?.name, color: color(u.modelId, u.colorId)?.name, sucursal: showroom(u.showroomId).city, estado: UNIT_STATUS[u.status][0], dias: u.days, eta: u.eta || '', costo: u.cost }) }
  });
  v.querySelector('[data-new]').onclick = () => {
    const ms = db.query('models', m => m.status === 'activo');
    const m = modal({ title: 'Ingresar unidad', body: `<form class="form-grid" novalidate><div class="field"><label for="u-m">Modelo</label><select class="select" id="u-m" name="m">${opts(modelOpts(x => x.status === 'activo'))}</select></div><div class="field"><label for="u-v">Versión</label><select class="select" id="u-v" name="v"></select></div><div class="field"><label for="u-c">Color</label><select class="select" id="u-c" name="c"></select></div><div class="field"><label for="u-s">Sucursal</label><select class="select" id="u-s" name="s">${opts(showroomOpts())}</select></div><div class="field"><label for="u-st">Estado</label><select class="select" id="u-st" name="st"><option value="transito">En tránsito</option><option value="stock">En stock</option></select></div><div class="field"><label for="u-eta">Fecha estimada de llegada</label><input class="input" id="u-eta" name="eta" type="date" value="${addDays(ymd(), 21)}"></div><div class="field"><label for="u-q">Cantidad</label><input class="input" id="u-q" name="q" type="number" min="1" max="20" value="1"></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Ingresar</button>' });
    const f = m.el.querySelector('form');
    const fill = () => { const mm = db.get('models', f.m.value); f.v.innerHTML = opts(mm.versions.map(x => [x.id, `${x.name} · ${money(x.price)}`])); f.c.innerHTML = opts(mm.colors.map(x => [x.id, x.name])); };
    f.m.onchange = fill; fill();
    m.el.querySelector('[data-ok]').onclick = () => {
      const mm = db.get('models', f.m.value), vv = version(mm, f.v.value), q = Math.max(1, Math.min(20, +f.q.value || 1));
      if (f.st.value === 'transito' && !f.eta.value) return toast('Indica la fecha estimada de llegada', 'warning');
      for (let i = 0; i < q; i++) db.insert('units', { vin: newVin(mm.brandId), modelId: mm.id, versionId: vv.id, colorId: f.c.value, showroomId: f.s.value, status: f.st.value, arrivedAt: f.st.value === 'stock' ? ymd() : null, eta: f.st.value === 'transito' ? f.eta.value : null, cost: vv.cost });
      log('inventario', `Ingreso de ${q} ${mm.name} ${vv.name} (${f.st.value})`); toast(`${q} unidad(es) ingresada(s)`, 'success'); m.close(); lv.refresh();
    };
  };
}
export { brand };
