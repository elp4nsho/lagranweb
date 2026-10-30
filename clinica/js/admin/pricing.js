import { escape, money, toast, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { icon } from '../shared/icons.js';

export function renderPricing(v) {
  const specs = db.all('specialties').sort((a, b) => a.order - b.order);
  v.innerHTML = `${pageHead('Precios y previsión', 'Copago que paga el paciente por consulta según su previsión. Se usa en la reserva en línea y en caja.', `<button class="btn" data-pct>${icon('tag', 16)} Ajuste masivo %</button><button class="btn btn-primary" data-save>${icon('check', 16)} Guardar precios</button>`)}
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Especialidad</th><th>Fonasa (bono MLE)</th><th>Isapre (copago)</th><th>Particular</th><th>Cobertura Isapre est.</th></tr></thead><tbody>
  ${specs.map(s => `<tr data-id="${s.id}"><td><b>${escape(s.name)}</b></td>${['fonasa', 'isapre', 'particular'].map(k => `<td><input class="input price-input" type="number" min="0" step="100" data-k="${k}" value="${s.prices[k]}" aria-label="${k} ${escape(s.name)}"></td>`).join('')}<td data-cov>${Math.round((1 - s.prices.isapre / s.prices.particular) * 100)}%</td></tr>`).join('')}
  </tbody></table></div>
  <p class="muted small" style="margin-top:12px">${icon('shield', 14)} Los cambios aplican a nuevas reservas; las citas ya agendadas mantienen su valor.</p></div>`;
  v.querySelector('tbody').addEventListener('input', e => { const tr = e.target.closest('tr'); const g = k => +tr.querySelector(`[data-k=${k}]`).value || 1; tr.querySelector('[data-cov]').textContent = Math.round((1 - g('isapre') / g('particular')) * 100) + '%'; });
  v.querySelector('[data-save]').onclick = () => {
    let changes = 0;
    v.querySelectorAll('tbody tr').forEach(tr => {
      const s = db.get('specialties', tr.dataset.id), prices = {};
      tr.querySelectorAll('[data-k]').forEach(i => prices[i.dataset.k] = Math.max(0, Math.round(+i.value)));
      if (JSON.stringify(prices) !== JSON.stringify(s.prices)) { changes++; db.update('specialties', s.id, { prices }); db.log('precios', `${s.name}: Fonasa ${money(prices.fonasa)} · Isapre ${money(prices.isapre)} · Particular ${money(prices.particular)}`, auth.current()?.id); }
    });
    toast(changes ? `${changes} especialidad(es) actualizadas` : 'Sin cambios', changes ? 'success' : 'info');
  };
  v.querySelector('[data-pct]').onclick = async () => {
    const r = await formModal({ title: 'Ajuste masivo de precios', submit: 'Aplicar', fields: [{ name: 'p', label: 'Porcentaje de ajuste (ej: 3.5 o -2)', type: 'number', step: '0.1', value: 3, required: true }] });
    if (!r || isNaN(r.p)) return;
    const p = r.p;
    v.querySelectorAll('[data-k]').forEach(i => i.value = Math.round(+i.value * (1 + p / 100) / 100) * 100);
    toast(`Ajuste de ${p}% aplicado. Revisa y guarda.`, 'info');
  };
}
