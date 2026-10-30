import { escape, toast, formModal, lineChart, date as fmtDate } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function progressView(memberId, { editable = false } = {}) {
  const list = db.query('progress', p => p.memberId === memberId).sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return `<div class="card empty">Sin mediciones registradas.</div>`;
  const first = list[0], last = list.at(-1);
  const d = (k, unit, inv = true) => { const x = +(last[k] - first[k]).toFixed(1); const good = inv ? x <= 0 : x >= 0; return `<span class="delta ${good ? 'up' : 'down'}">${x > 0 ? '+' : ''}${String(x).replace('.', ',')} ${unit} desde ${fmtDate(first.date, { day: 'numeric', month: 'short' })}</span>`; };
  const lbl = p => fmtDate(p.date, { day: 'numeric', month: 'numeric' });
  return `<div class="grid-4">${statCard('Peso', `${String(last.weight).replace('.', ',')} kg`, d('weight', 'kg'), 'pulse')}${statCard('Grasa corporal', `${String(last.fat).replace('.', ',')}%`, d('fat', '%'), 'fire')}${statCard('Cintura', `${last.waist} cm`, d('waist', 'cm'), 'sliders')}${statCard('Brazo', `${last.arm} cm`, d('arm', 'cm', false), 'dumbbell')}</div>
  <div class="grid-2"><div class="card"><h3>Peso (kg)</h3>${lineChart(list.map(p => ({ label: lbl(p), value: p.weight })), { height: 170 })}</div>
  <div class="card"><h3>% Grasa corporal</h3>${lineChart(list.map(p => ({ label: lbl(p), value: p.fat })), { height: 170 })}</div></div>
  <div class="card"><div class="card-title"><h3>Mediciones</h3>${editable ? `<button class="btn btn-sm btn-primary" data-add>${icon('plus', 14)} Nueva medición</button>` : ''}</div><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Peso</th><th>Grasa</th><th>Cintura</th><th>Cadera</th><th>Brazo</th></tr></thead><tbody>
  ${list.slice().reverse().map(p => `<tr><td>${escape(fmtDate(p.date))}</td><td>${p.weight} kg</td><td>${p.fat}%</td><td>${p.waist} cm</td><td>${p.hip} cm</td><td>${p.arm} cm</td></tr>`).join('')}</tbody></table></div></div>`;
}
export async function addMeasurement(memberId) {
  const last = db.query('progress', p => p.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date))[0] || {};
  const v = await formModal({ title: 'Nueva medición', fields: [
    { name: 'date', label: 'Fecha', type: 'date', value: ymd(), required: true },
    { name: 'weight', label: 'Peso (kg)', type: 'number', step: '0.1', value: last.weight, required: true }, { name: 'fat', label: '% grasa', type: 'number', step: '0.1', value: last.fat },
    { name: 'waist', label: 'Cintura (cm)', type: 'number', step: '0.5', value: last.waist }, { name: 'hip', label: 'Cadera (cm)', type: 'number', step: '0.5', value: last.hip }, { name: 'arm', label: 'Brazo (cm)', type: 'number', step: '0.5', value: last.arm }] });
  if (!v) return;
  if (!(v.weight > 20 && v.weight < 300)) return toast('Peso fuera de rango', 'warning');
  db.insert('progress', { memberId, ...v }); toast('Medición guardada', 'success');
}
export function renderProgress(v, _, __, { m }) {
  v.innerHTML = `${pageHead('Mi progreso', `Objetivo: ${escape(m.goal || '—')}`)}${progressView(m.id, { editable: true })}`;
  v.querySelector('[data-add]')?.addEventListener('click', () => addMeasurement(m.id));
  if (!db.count('progress', p => p.memberId === m.id)) { v.insertAdjacentHTML('beforeend', `<button class="btn btn-primary" data-first>${icon('plus', 16)} Registrar primera medición</button>`); v.querySelector('[data-first]').onclick = () => addMeasurement(m.id); }
}
