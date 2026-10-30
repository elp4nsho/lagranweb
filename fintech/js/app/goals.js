// Metas de ahorro: crear, aportar, retirar, editar y eliminar.
import { db } from '../data/db.js';
import { money, date, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { account, postTx, notify } from '../shared/bank.js';
import { pageHead } from './common.js';

const ICONS = ['🎯', '🏔️', '✈️', '🏠', '🚗', '🎓', '💻', '🛟', '🎁', '🐶', '💍', '🏖️'];

export function render(el, { user }) {
  const goals = db.query('goals', g => g.userId === user.id);
  const total = goals.reduce((s, g) => s + g.saved, 0), target = goals.reduce((s, g) => s + g.target, 0);
  const vista = account(user.id, 'vista');
  el.innerHTML = h`${raw(pageHead('Metas de ahorro', `Ahorrado ${money(total)} de ${money(target)}`, '<button class="btn btn-primary" data-new>+ Nueva meta</button>'))}
  <div class="grid-auto">${goals.map(g => {
    const p = Math.min(100, g.saved / g.target * 100), left = Math.max(0, g.target - g.saved);
    const months = Math.max(1, Math.ceil((new Date(g.deadline) - Date.now()) / (30 * 864e5)));
    return h`<article class="card goal stack" style="gap:10px">
      <div class="row between"><span style="font-size:30px">${g.icon}</span>${p >= 100 ? raw('<span class="badge badge-success">¡Cumplida!</span>') : raw(`<span class="badge badge-primary">${Math.round(p)}%</span>`)}</div>
      <h3 style="margin:0">${g.name}</h3>
      <div class="progress"><i style="--v:${p}%"></i></div>
      <div class="row between small"><span><b class="amt">${money(g.saved)}</b> de ${money(g.target)}</span><span class="muted">${date(g.deadline, { month: 'short', year: 'numeric' })}</span></div>
      <p class="small muted" style="margin:0">${left ? `Te faltan ${money(left)} · ${money(Math.ceil(left / months / 1000) * 1000)}/mes para llegar a tiempo` : 'Meta alcanzada 🎉'}${g.auto ? ` · aporte automático ${money(g.auto)}` : ''}</p>
      <div class="row" style="gap:8px"><button class="btn btn-sm btn-primary" data-dep="${g.id}">Aportar</button><button class="btn btn-sm" data-wd="${g.id}" ${g.saved ? '' : 'disabled'}>Retirar</button><button class="btn btn-sm btn-ghost" data-edit="${g.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${g.id}" aria-label="Eliminar meta">🗑</button></div>
    </article>`;
  })}</div>
  ${!goals.length ? raw('<div class="card empty"><span class="icon">🎯</span>Crea tu primera meta: un viaje, un fondo de emergencia o lo que sueñes.</div>') : ''}
  <p class="small muted">Saldo disponible en Cuenta Vista: ${money(vista.balance)}</p>`;

  const fields = (g = {}) => [
    { name: 'name', label: 'Nombre de la meta', required: true, value: g.name },
    { name: 'icon', label: 'Ícono', type: 'select', options: ICONS, value: g.icon || '🎯' },
    { name: 'target', label: 'Monto objetivo (CLP)', type: 'number', required: true, value: g.target },
    { name: 'deadline', label: 'Fecha objetivo', type: 'date', required: true, value: g.deadline || new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10) },
    { name: 'auto', label: 'Aporte automático mensual (0 = sin aporte)', type: 'number', value: g.auto ?? 0 },
  ];
  el.querySelector('[data-new]').onclick = async () => {
    const v = await formModal({ title: 'Nueva meta', fields: fields() });
    if (!v) return;
    if (v.target < 1000) { toast('El objetivo debe ser mayor a $1.000', 'warning'); return; }
    db.insert('goals', { userId: user.id, ...v, saved: 0 });
    toast('Meta creada', 'success');
  };
  const move = async (g, dir) => {
    const v = await formModal({ title: `${dir > 0 ? 'Aportar a' : 'Retirar de'} "${g.name}"`, fields: [{ name: 'amount', label: 'Monto', type: 'number', required: true, value: dir > 0 ? Math.min(50000, g.target - g.saved) : g.saved }], submit: dir > 0 ? 'Aportar' : 'Retirar' });
    if (!v) return;
    const a = Math.round(v.amount);
    const vis = account(user.id, 'vista');
    if (a <= 0) return toast('Monto inválido', 'warning');
    if (dir > 0 && a > vis.balance) return toast('Saldo insuficiente', 'error');
    if (dir < 0 && a > g.saved) return toast('No puedes retirar más de lo ahorrado', 'error');
    postTx(vis, { amount: -dir * a, desc: `${dir > 0 ? 'Aporte a' : 'Retiro de'} meta: ${g.name}`, category: 'Ahorro', type: 'transferencia', counterpart: 'Metas Cóndor' });
    const ng = db.update('goals', g.id, { saved: g.saved + dir * a });
    if (dir > 0 && ng.saved >= ng.target && g.saved < g.target) notify(user.id, '¡Meta cumplida!', `Completaste tu meta "${g.name}". 🎉`, 'meta');
    toast(dir > 0 ? `Aportaste ${money(a)}` : `Retiraste ${money(a)}`, 'success');
  };
  el.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => move(db.get('goals', b.dataset.dep), 1));
  el.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => move(db.get('goals', b.dataset.wd), -1));
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const g = db.get('goals', b.dataset.edit);
    const v = await formModal({ title: 'Editar meta', fields: fields(g) });
    if (v) { db.update('goals', g.id, v); toast('Meta actualizada', 'success'); }
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const g = db.get('goals', b.dataset.del);
    if (!(await confirm(`Se eliminará "${g.name}"${g.saved ? ` y ${money(g.saved)} volverán a tu Cuenta Vista` : ''}.`, { title: 'Eliminar meta', ok: 'Eliminar', danger: true }))) return;
    if (g.saved) postTx(account(user.id, 'vista'), { amount: g.saved, desc: `Cierre de meta: ${g.name}`, category: 'Ahorro', type: 'transferencia' });
    db.remove('goals', g.id);
    toast('Meta eliminada', 'info');
  });
}
