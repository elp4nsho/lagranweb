// Lista de precios y campañas/bonos con vigencia.
import { escape, money, toast, modal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { brand, model, CAMPAIGN_TYPES, campaignState, campaignsFor, maxBonus } from '../shared/domain.js';
import { sw, log, del, opts, brandOpts } from './kit.js';
import { fdate, ymd, addDays } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const STATE_TONE = { vigente: 'success', programada: 'info', finalizada: '', inactiva: 'danger' };

export function renderCampaigns(v, _p, query) {
  const tab = query.tab || 'campanas';
  v.innerHTML = `${pageHead('Precios y campañas', 'Bonos con fecha de inicio y término. El sitio aplica automáticamente los vigentes según forma de pago.', tab === 'campanas' ? `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva campaña</button>` : '')}
  <nav class="tabs"><a class="tab ${tab === 'campanas' ? 'active' : ''}" href="#/campanas">Campañas y bonos</a><a class="tab ${tab === 'precios' ? 'active' : ''}" href="#/campanas?tab=precios">Lista de precios</a></nav><div class="card" data-list></div>`;
  if (tab === 'precios') return prices(v.querySelector('[data-list]'));
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('campaigns').map(c => ({ ...c, state: campaignState(c) })), search: c => c.name + c.desc,
    filters: [{ key: 'state', label: 'Estado', options: [['vigente', 'Vigente'], ['programada', 'Programada'], ['finalizada', 'Finalizada'], ['inactiva', 'Inactiva']] }, { key: 'type', label: 'Tipo', options: Object.entries(CAMPAIGN_TYPES) }],
    columns: [
      { key: 'name', label: 'Campaña', render: c => ({ __raw: true, value: `<b>${escape(c.name)}</b><br><small class="muted">${escape(c.desc)}</small>` }) },
      { key: 'type', label: 'Tipo', render: c => CAMPAIGN_TYPES[c.type] },
      { key: 'amount', label: 'Monto', render: c => money(c.amount) },
      { key: 'scope', label: 'Aplica a', sort: false, render: c => escape(c.scope === 'todos' ? 'Todos los modelos' : c.scope === 'marca' ? 'Marca ' + (brand(c.brandId)?.name || '') : c.modelIds.map(id => model(id)?.name || id).join(', ')) },
      { key: 'from', label: 'Vigencia', render: c => `${fdate(c.from)} → ${fdate(c.to)}` },
      { key: 'state', label: 'Estado', render: c => ({ __raw: true, value: `<span class="badge ${STATE_TONE[c.state] ? 'badge-' + STATE_TONE[c.state] : ''}">${c.state}</span>` }) },
      { key: 'featured', label: 'En portada', render: c => ({ __raw: true, value: sw('featured', c.id, c.featured, 'Mostrar en portada') }) },
      { key: 'active', label: 'Activa', render: c => ({ __raw: true, value: sw('active', c.id, c.active, 'Activa') }) },
      { key: 'x', label: '', sort: false, render: c => ({ __raw: true, value: acts(actBtn('edit', c.id, 'edit', 'Editar'), actBtn('dup', c.id, 'plus', 'Duplicar'), actBtn('del', c.id, 'trash', 'Eliminar')) }) }
    ],
    onRow: c => edit(db.get('campaigns', c.id)),
    onAction: async (a, id, el) => {
      const c = db.get('campaigns', id);
      if (a === 'edit') edit(c);
      if (a === 'dup') { db.insert('campaigns', { ...c, id: undefined, name: c.name + ' (copia)', active: false, from: ymd(), to: addDays(ymd(), 30) }); log('campaña', `Duplicada ${c.name}`); lv.refresh(); }
      if (a === 'del') await del('campaigns', id, c.name) && lv.refresh();
      if (a === 'active' || a === 'featured') { db.update('campaigns', id, { [a]: el.checked }); log('campaña', `${c.name}: ${a} ${el.checked}`); toast('Actualizado en el sitio', 'success', 1500); }
    },
    csv: { name: 'campanas.csv', map: c => ({ nombre: c.name, tipo: CAMPAIGN_TYPES[c.type], monto: c.amount, desde: c.from, hasta: c.to, estado: c.state }) }
  });
  function edit(c) {
    const models = db.query('models', m => m.status !== 'inactivo');
    const x = c || { name: '', type: 'marca', amount: 1000000, scope: 'modelos', modelIds: [], brandId: '', from: ymd(), to: addDays(ymd(), 30), active: true, featured: false, desc: '' };
    const m = modal({ title: c ? 'Editar campaña' : 'Nueva campaña', size: 'lg', body: `<form class="stack" novalidate>
      <div class="form-grid"><div class="field"><label for="c-n">Nombre</label><input class="input" id="c-n" name="name" value="${escape(x.name)}" required></div>
      <div class="field"><label for="c-t">Tipo</label><select class="select" id="c-t" name="type">${opts(Object.entries(CAMPAIGN_TYPES), x.type)}</select></div>
      <div class="field"><label for="c-a">Monto (CLP)</label><input class="input" id="c-a" name="amount" type="number" step="50000" value="${x.amount}" required></div>
      <div class="field"><label for="c-f">Desde</label><input class="input" id="c-f" name="from" type="date" value="${x.from}" required></div>
      <div class="field"><label for="c-to">Hasta</label><input class="input" id="c-to" name="to" type="date" value="${x.to}" required></div>
      <div class="field"><label for="c-s">Alcance</label><select class="select" id="c-s" name="scope">${opts([['modelos', 'Modelos específicos'], ['marca', 'Toda una marca'], ['todos', 'Todos los modelos']], x.scope)}</select></div>
      <div class="field"><label for="c-b">Marca</label><select class="select" id="c-b" name="brandId">${opts(brandOpts(), x.brandId, '—')}</select></div></div>
      <div class="field"><label for="c-d">Descripción / condiciones</label><input class="input" id="c-d" name="desc" value="${escape(x.desc)}"></div>
      <fieldset class="preview-box" data-models><legend class="small muted">Modelos incluidos</legend><div class="dmg-grid">${models.map(mm => `<label class="check small"><input type="checkbox" name="modelIds" value="${mm.id}" ${x.modelIds.includes(mm.id) ? 'checked' : ''}> ${escape(brand(mm.brandId)?.name)} ${escape(mm.name)}</label>`).join('')}</div></fieldset>
      <div class="row"><label class="check"><input type="checkbox" name="active" ${x.active ? 'checked' : ''}> Activa</label><label class="check"><input type="checkbox" name="featured" ${x.featured ? 'checked' : ''}> Destacar en portada</label></div></form>`,
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>` });
    const f = m.el.querySelector('form');
    const sync = () => { f.querySelector('[data-models]').hidden = f.scope.value !== 'modelos'; f.brandId.closest('.field').hidden = f.scope.value === 'todos'; };
    f.scope.onchange = sync; sync();
    m.el.querySelector('[data-save]').onclick = () => {
      const d = { name: f.name.value.trim(), type: f.type.value, amount: +f.amount.value, from: f.from.value, to: f.to.value, scope: f.scope.value, brandId: f.brandId.value || null, desc: f.desc.value.trim(), modelIds: [...f.querySelectorAll('[name=modelIds]:checked')].map(i => i.value), active: f.active.checked, featured: f.featured.checked };
      if (!d.name || !d.amount || !d.from || !d.to) return toast('Completa nombre, monto y fechas', 'warning');
      if (d.to < d.from) return toast('La fecha de término debe ser posterior al inicio', 'warning');
      if (d.scope === 'modelos' && !d.modelIds.length) return toast('Elige al menos un modelo', 'warning');
      if (d.scope === 'marca' && !d.brandId) return toast('Elige la marca', 'warning');
      c ? db.update('campaigns', c.id, d) : db.insert('campaigns', d);
      log('campaña', `${c ? 'Editada' : 'Nueva'}: ${d.name} (${money(d.amount)})`); toast('Campaña guardada', 'success'); m.close(); lv.refresh();
    };
  }
  v.querySelector('[data-new]').onclick = () => edit(null);
}

function prices(el) {
  const rows = db.query('models', m => m.status !== 'inactivo').flatMap(m => m.versions.map((x, i) => ({ id: m.id + '|' + i, m, x, brand: brand(m.brandId)?.name, name: `${m.name} ${x.name}`, price: x.price, margin: (x.price - x.cost) / x.price * 100, bonus: maxBonus(m) })));
  listView(el, {
    rows, search: r => r.brand + ' ' + r.name, pageSize: 15,
    filters: [{ key: 'brand', label: 'Marca', options: db.all('brands').map(b => b.name) }],
    columns: [{ key: 'brand', label: 'Marca' }, { key: 'name', label: 'Modelo / versión', render: r => `<b>${escape(r.m.name)}</b> ${escape(r.x.name)}` },
      { key: 'price', label: 'Precio lista', render: r => ({ __raw: true, value: `<input class="input inline-edit" type="number" step="10000" value="${r.price}" data-act-change="price" data-id="${r.id}" aria-label="Precio">` }) },
      { key: 'margin', label: 'Margen', render: r => `${r.margin.toFixed(1).replace('.', ',')}%` },
      { key: 'bonus', label: 'Bonos vigentes', render: r => r.bonus ? money(r.bonus) : '—' },
      { key: 'net', label: 'Precio con bonos', sort: false, render: r => `<b>${money(r.price - r.bonus)}</b>` }],
    onAction: (a, id, inp) => { if (a !== 'price') return; const [mid, i] = id.split('|'), m = db.get('models', mid), val = +inp.value; if (!(val > 0)) return toast('Precio inválido', 'warning'); db.update('models', mid, { versions: m.versions.map((x, j) => j === +i ? { ...x, price: val } : x) }); log('precios', `${m.name} ${m.versions[+i].name}: ${money(val)}`); toast('Precio actualizado en el sitio', 'success', 1500); },
    csv: { name: 'lista-precios.csv', map: r => ({ marca: r.brand, modelo: r.m.name, version: r.x.name, precio: r.price, costo: r.x.cost, bonos: r.bonus }) }
  });
}
export { campaignsFor };
