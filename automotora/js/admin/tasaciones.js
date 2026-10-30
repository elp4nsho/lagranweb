// Tasaciones de usados (retomas) recibidas desde el sitio y el showroom.
import { escape, money, toast, formModal, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { tradeBadge, TRADE_STATUS } from '../shared/domain.js';
import { log } from './kit.js';
import { patenteFormat, nf } from '../shared/util.js';

export function renderTradeIns(v) {
  const all = db.all('tradeins');
  v.innerHTML = `${pageHead('Tasaciones', 'Usados ofrecidos en parte de pago: estimación online → inspección → oferta firme → recepción.')}
  <div class="grid-4">${statCard('Nuevas / inspección', all.filter(t => ['estimada', 'inspeccion'].includes(t.status)).length, '', 'swap')}${statCard('Ofertas enviadas', all.filter(t => t.status === 'ofertada').length, '', 'mail')}${statCard('Aceptadas / recibidas', all.filter(t => ['aceptada', 'recibida'].includes(t.status)).length, '', 'check')}${statCard('Valor recibido', money(all.filter(t => t.status === 'recibida').reduce((a, t) => a + t.offer, 0)), '', 'money')}</div><div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('tradeins').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: t => `${t.patente} ${t.brand} ${t.model} ${t.customer}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(TRADE_STATUS).map(([k, [l]]) => [k, l]) }, { key: 'condition', label: 'Estado físico', options: ['excelente', 'bueno', 'regular'] }],
    columns: [
      { key: 'patente', label: 'Patente', render: t => `<b class="mono">${patenteFormat(t.patente)}</b><br><small class="muted">${ago(t.createdAt)}</small>` },
      { key: 'brand', label: 'Vehículo', render: t => `${escape(t.brand)} ${escape(t.model)} ${t.year}<br><small class="muted">${nf(t.km)} km · ${escape(t.condition)}</small>` },
      { key: 'customer', label: 'Cliente', render: t => escape(t.customer) },
      { key: 'estimateMin', label: 'Estimación', render: t => `${money(t.estimateMin)} – ${money(t.estimateMax)}` },
      { key: 'offer', label: 'Oferta firme', render: t => t.offer ? `<b>${money(t.offer)}</b>` : '—' },
      { key: 'status', label: 'Estado', render: t => ({ __raw: true, value: tradeBadge(t.status) }) },
      { key: 'x', label: '', sort: false, render: t => ({ __raw: true, value: acts(actBtn('offer', t.id, 'money', 'Registrar oferta / estado')) }) }
    ],
    onRow: t => edit(t.id), onAction: (a, id) => edit(id),
    csv: { name: 'tasaciones.csv', map: t => ({ patente: t.patente, marca: t.brand, modelo: t.model, ano: t.year, km: t.km, estado_fisico: t.condition, min: t.estimateMin, max: t.estimateMax, oferta: t.offer, estado: TRADE_STATUS[t.status][0], cliente: t.customer }) }
  });
  async function edit(id) {
    const t = db.get('tradeins', id);
    const r = await formModal({ title: `${t.brand} ${t.model} ${t.year} · ${patenteFormat(t.patente)}`, submit: 'Guardar', fields: [{ name: 'offer', label: 'Oferta firme (CLP)', type: 'number', value: t.offer || Math.round((t.estimateMin + t.estimateMax) / 2 / 10000) * 10000, help: `Estimación online ${money(t.estimateMin)} – ${money(t.estimateMax)}` }, { name: 'status', label: 'Estado', type: 'select', options: Object.entries(TRADE_STATUS).map(([k, [l]]) => [k, l]), value: t.status }, { name: 'notes', label: 'Observaciones de inspección', type: 'textarea', value: t.notes || '' }] });
    if (!r) return;
    if (r.offer < 0) return toast('Oferta inválida', 'warning');
    db.update('tradeins', id, r); log('tasación', `${patenteFormat(t.patente)}: ${TRADE_STATUS[r.status][0]} ${r.offer ? money(r.offer) : ''}`); toast('Tasación actualizada', 'success'); lv.refresh();
  }
}
