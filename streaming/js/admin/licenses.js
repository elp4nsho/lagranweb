// Ventanas de licencia: línea de tiempo (−6 a +6 meses), alertas de vencimiento y edición rápida de fechas.
import { db } from '../data/db.js';
import { html, raw, $, toast, formModal, date, dataTable, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi, csvButton, wireCSV } from '../shared/admin-kit.js';
import { licenseState } from '../shared/catalog.js';
import { licBadge } from './catalog.js';

export function render(el, { user }) {
  const draw = () => {
    const all = db.all('titles'), now = Date.now(), span = 365 * 864e5, from = now - span / 2;
    const pos = ts => Math.max(0, Math.min(100, (ts - from) / span * 100));
    const cnt = s => all.filter(t => licenseState(t) === s).length;
    const timeline = all.slice().sort((a, b) => (a.availableTo || '9').localeCompare(b.availableTo || '9')).slice(0, 14);
    el.innerHTML = html`${raw(pageHead('Licencias', 'Disponibilidad de cada título según su contrato. Fuera de la ventana, el título se oculta solo.', csvButton()))}
      <div class="kpis">${raw(kpi('Vigentes', String(cnt('vigente'))))}${raw(kpi('Vencen en 15 días', String(cnt('por_vencer'))))}${raw(kpi('Próximos estrenos', String(cnt('proximo'))))}${raw(kpi('Vencidos', String(cnt('vencido'))))}</div>
      <div class="card stack"><div class="row between"><h3 style="margin:0">Línea de tiempo</h3><small class="muted">${date(from)} → ${date(from + span)} · línea roja = hoy</small></div>
        <div class="timeline">${timeline.map(t => { const a = pos(Date.parse(t.availableFrom)), b = t.availableTo ? pos(Date.parse(t.availableTo)) : 100; const s = licenseState(t);
          return raw(html`<div class="tl-row"><span><a href="#/catalogo/${t.id}">${t.title}</a></span><div class="tl-track"><div class="tl-bar ${s === 'por_vencer' ? 'warn' : s === 'vencido' || s === 'borrador' ? 'off' : ''}" style="left:${a}%;width:${Math.max(1, b - a)}%"></div><div class="tl-now" style="left:50%"></div></div></div>`); })}</div></div>
      <div id="tbl"></div>`;
    dataTable($('#tbl', el), {
      rows: all.map(t => ({ ...t, st: licenseState(t), to: t.availableTo || '9999' })), pageSize: 10, search: r => r.title,
      columns: [
        { key: 'title', label: 'Título', render: r => `<b>${escape(r.title)}</b><br><small class="muted">${r.type}</small>` },
        { key: 'availableFrom', label: 'Desde', render: r => date(r.availableFrom) },
        { key: 'to', label: 'Hasta', render: r => (r.availableTo ? date(r.availableTo) : '<span class="muted">Indefinido</span>') },
        { key: 'st', label: 'Estado', render: r => licBadge(r) },
        { key: 'id', label: '', sort: false, render: r => `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm" data-edit="${r.id}">Editar fechas</button>${r.availableTo ? `<button class="btn btn-sm btn-ghost" data-renew="${r.id}">Renovar +1 año</button>` : ''}</span>` }
      ]
    });
    wireCSV(el, 'licencias.csv', () => db.all('titles').map(t => ({ titulo: t.title, desde: t.availableFrom, hasta: t.availableTo || '', estado: licenseState(t) })));
  };
  el.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'), rn = e.target.closest('[data-renew]');
    if (ed) {
      const t = db.get('titles', ed.dataset.edit);
      const r = await formModal({ title: `Licencia · ${t.title}`, fields: [{ name: 'from', label: 'Disponible desde', type: 'date', value: t.availableFrom.slice(0, 10), required: true }, { name: 'to', label: 'Disponible hasta (vacío = indefinido)', type: 'date', value: t.availableTo ? t.availableTo.slice(0, 10) : '' }] });
      if (!r) return;
      const f = new Date(r.from + 'T00:00').toISOString(), to = r.to ? new Date(r.to + 'T23:59').toISOString() : null;
      if (to && to <= f) return toast('La fecha de término debe ser posterior', 'warning');
      db.update('titles', t.id, { availableFrom: f, availableTo: to }); db.log('licencias', `${t.title}: ${r.from} → ${r.to || 'indefinido'}`, user.id); toast('Licencia actualizada', 'success');
    }
    if (rn) { const t = db.get('titles', rn.dataset.renew); const base = Math.max(Date.now(), Date.parse(t.availableTo)); db.update('titles', t.id, { availableTo: new Date(base + 365 * 864e5).toISOString() }); db.log('licencias', `${t.title}: renovada 1 año`, user.id); toast('Licencia renovada por 1 año', 'success'); }
  });
  draw();
  return { update: draw };
}
