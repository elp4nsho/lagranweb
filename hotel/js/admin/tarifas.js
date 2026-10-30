// Tarifas y temporadas: tarifa base por tipo, multiplicadores de temporada y fin de semana, calendario de precios.
import { escape, toast, confirm, formModal, money } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { settings, saveSettings, nightlyRate, today, addDays, currentSeason } from '../shared/hotel.js';
import { fmtDay, dowShort } from '../shared/dates.js';

async function editSeason(s, ctx) {
  const v = await formModal({ title: s ? `Temporada · ${s.name}` : 'Nueva temporada', fields: [
    { name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'from', label: 'Desde (MM-DD)', required: true, value: s?.from || '01-01', placeholder: '12-15' },
    { name: 'to', label: 'Hasta (MM-DD)', required: true, value: s?.to || '01-31' }, { name: 'multiplier', label: 'Multiplicador (1 = tarifa base)', type: 'number', step: '0.05', required: true, value: s?.multiplier ?? 1.2 },
    { name: 'active', label: 'Activa', type: 'checkbox', value: s ? s.active !== false : true }] });
  if (!v) return;
  if (!/^\d\d-\d\d$/.test(v.from) || !/^\d\d-\d\d$/.test(v.to) || !(v.multiplier > 0)) { toast('Formato MM-DD y multiplicador > 0', 'warning'); return; }
  s ? db.update('seasons', s.id, v) : db.insert('seasons', v);
  db.log('tarifas', `Temporada ${v.name} ${s ? 'editada' : 'creada'} (×${v.multiplier})`, ctx.user.id); toast('Temporada guardada · precios públicos actualizados', 'success');
}

export default {
  id: 'tarifas', label: 'Tarifas y temporadas', icon: '💲', group: 'Revenue', roles: ['admin', 'revenue'], watch: ['roomTypes', 'seasons', 'settings'],
  render(el, ctx) {
    const paint = () => {
      const types = db.all('roomTypes').sort((a, b) => a.order - b.order);
      const days = Array.from({ length: 21 }, (_, i) => addDays(today(), i));
      const cs = currentSeason();
      el.innerHTML = `${pageHead('Tarifas y temporadas', `Temporada actual: <b>${escape(cs?.name || 'Regular')}</b>. Cualquier cambio actualiza los precios del sitio y del motor de reservas.`, '<button class="btn btn-primary btn-sm" data-newseason>+ Temporada</button>')}
        <div class="grid-2">
          <form class="card stack" id="base"><h3 style="margin:0">Tarifa base por tipo</h3>
            ${types.map(t => `<div class="row between"><label for="br-${t.id}">${escape(t.name)}</label><input class="input sm" style="width:140px" type="number" step="1000" min="0" id="br-${t.id}" data-base="${t.id}" value="${t.baseRate}"></div>`).join('')}
            <div class="row between"><label for="wm">Recargo viernes y sábado (×)</label><input class="input sm" style="width:140px" type="number" step="0.05" min="1" id="wm" value="${settings().weekendMult}"></div>
            <button class="btn btn-primary">Guardar tarifas</button></form>
          <div class="card stack"><h3 style="margin:0">Temporadas</h3>
            <div class="table-wrap"><table class="table"><thead><tr><th>Temporada</th><th>Fechas</th><th>×</th><th>Activa</th><th></th></tr></thead><tbody>
            ${db.all('seasons').sort((a, b) => b.multiplier - a.multiplier).map(s => `<tr><td><b>${escape(s.name)}</b></td><td class="nowrap">${s.from} → ${s.to}</td><td><b>${s.multiplier}</b></td><td><label class="switch"><input type="checkbox" data-sact="${s.id}" ${s.active !== false ? 'checked' : ''} aria-label="Activa"><span></span></label></td><td class="nowrap"><button class="btn btn-sm" data-es="${s.id}">Editar</button> <button class="btn btn-sm btn-ghost" data-ds="${s.id}" aria-label="Eliminar">🗑</button></td></tr>`).join('')}
            </tbody></table></div><small class="muted">Si dos temporadas se cruzan, manda la de mayor multiplicador.</small></div>
        </div>
        <div class="card stack"><h3 style="margin:0">Calendario de precios · próximos 21 días</h3>
          <div class="table-wrap"><table class="table rate-table"><thead><tr><th>Tipo</th>${days.map(d => `<th class="${['vie', 'sáb'].includes(dowShort(d)) ? 'we' : ''}">${dowShort(d)}<br>${fmtDay(d).split(' ')[0]}</th>`).join('')}</tr></thead><tbody>
          ${types.map(t => `<tr><td class="nowrap"><b>${escape(t.name)}</b></td>${days.map(d => { const r = nightlyRate(t.id, d); return `<td title="${escape(r.season)}">${Math.round(r.rate / 1000)}k</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    };
    el.addEventListener('submit', e => {
      e.preventDefault();
      el.querySelectorAll('[data-base]').forEach(i => { const t = db.get('roomTypes', i.dataset.base); const v = Number(i.value); if (v > 0 && v !== t.baseRate) { db.update('roomTypes', t.id, { baseRate: v }); db.log('tarifas', `${t.name}: tarifa base ${money(t.baseRate)} → ${money(v)}`, ctx.user.id); } });
      const wm = Number(el.querySelector('#wm').value); if (wm >= 1) saveSettings({ weekendMult: wm });
      toast('Tarifas guardadas · el sitio ya muestra los nuevos precios', 'success'); paint();
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-newseason')) editSeason(null, ctx);
      if (b.dataset.es) editSeason(db.get('seasons', b.dataset.es), ctx);
      if (b.dataset.ds) { const s = db.get('seasons', b.dataset.ds); if (await confirm(`¿Eliminar ${s.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('seasons', s.id); db.log('tarifas', `Temporada eliminada: ${s.name}`, ctx.user.id); } }
    });
    el.addEventListener('change', e => { const s = e.target.closest('[data-sact]'); if (s) { db.update('seasons', s.dataset.sact, { active: s.checked }); toast(s.checked ? 'Temporada activada' : 'Temporada desactivada', 'success'); } });
    paint();
    return { refresh: paint };
  }
};
