// Kiosco de check-in: escanear/digitar código o elegir socio; muestra si está al día o moroso.
import { escape, money, time as fmtTime, barChart } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { memberByCode, member, plan, branch, activeBranches, access, checkIn, statusBadge } from '../shared/domain.js';
import { collectModal } from '../shared/pay-ui.js';
import { pageHead } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

let branchId = '', last = null;
const isToday = at => ymd(new Date(at)) === ymd();
export function renderKiosk(v, _, __, { user }) {
  branchId ||= user.branchId || activeBranches()[0].id;
  const demo = [db.get('members', 'm0'), db.get('members', 'm1'), db.find('members', m => m.status === 'congelado'), db.find('members', m => m.status === 'baja')].filter(Boolean);
  v.innerHTML = `${pageHead('Kiosco de check-in', 'Escanea el carnet digital del socio o escribe su código.', `<select class="select" data-br style="width:auto" aria-label="Sede">${activeBranches().map(b => `<option value="${b.id}" ${b.id === branchId ? 'selected' : ''}>Sede ${escape(b.name)}</option>`).join('')}</select>`)}
  <div class="grid-main">
    <div class="stack kiosk">
      <form class="card stack" data-scan>
        <label class="center" for="k-code"><span class="icon-bubble" style="margin:0 auto 8px;width:56px;height:56px">${icon('qr', 30)}</span><b>Código de socio</b></label>
        <input class="input kiosk-input" id="k-code" name="code" placeholder="TF-00000" autocomplete="off" list="k-members" autofocus>
        <datalist id="k-members">${db.all('members').map(m => `<option value="${m.code}">${escape(m.name)}</option>`).join('')}</datalist>
        <button class="btn btn-primary btn-lg">${icon('check', 18)} Validar ingreso</button>
        <div class="row" style="gap:6px;justify-content:center"><span class="muted small">Prueba:</span>${demo.map(m => `<button type="button" class="chip" data-demo="${m.code}">${m.code} · ${escape(m.name.split(' ')[0])}</button>`).join('')}</div>
      </form>
      <div data-result></div>
    </div>
    <div class="stack"><div class="card" data-today></div></div>
  </div>`;
  const out = v.querySelector('[data-result]'), today = v.querySelector('[data-today]');
  const drawToday = () => {
    const list = db.query('checkins', k => isToday(k.at) && k.branchId === branchId).sort((a, b) => b.at.localeCompare(a.at));
    const hours = Array.from({ length: 17 }, (_, i) => i + 6);
    today.innerHTML = `<div class="card-title"><h3>Ingresos de hoy</h3><span class="badge badge-primary">${list.length}</span></div>
      ${barChart(hours.map(h => ({ label: String(h), value: list.filter(k => new Date(k.at).getHours() === h).length })), { height: 90 })}
      <div style="margin-top:10px">${list.slice(0, 8).map(k => { const m = member(k.memberId); return `<div class="row between small" style="margin-bottom:6px;flex-wrap:nowrap"><span class="cell-user"><span class="avatar" style="--size:26px;--av:${m?.color}">${escape(initials(m?.name || ''))}</span>${escape(m?.name)}</span><span class="muted">${fmtTime(k.at)}</span></div>`; }).join('') || '<p class="muted small">Aún no hay ingresos en esta sede.</p>'}</div>`;
  };
  const show = (m, res) => {
    last = { id: m?.id, res };
    const p = m && plan(m.planId);
    out.innerHTML = `<div class="card kiosk-result ${res.kind}" aria-live="assertive">
      ${m ? `<span class="avatar" style="--av:${m.color}">${escape(initials(m.name))}</span>` : `<span class="icon-bubble" style="margin:0 auto 10px;width:72px;height:72px">${icon('x', 36)}</span>`}
      <div class="big">${escape(res.ok ? res.title : res.title)}</div>
      ${m ? `<p style="font-size:20px;margin:6px 0"><b>${escape(m.name)}</b></p><p class="muted mb0">${m.code} · Plan ${escape(p?.name)} · ${statusBadge(m.status)}</p>` : ''}
      <p class="mb0" style="margin-top:8px">${escape(res.msg)}</p>
      ${m && m.status === 'moroso' ? `<button class="btn btn-primary btn-lg" style="margin-top:14px" data-collect>${icon('money', 18)} Cobrar ${money(p.monthly)} y dejar ingresar</button>` : ''}
    </div>`;
    out.querySelector('[data-collect]')?.addEventListener('click', async () => { if (await collectModal(member(m.id))) { const r2 = checkIn(member(m.id), branchId, 'recepción'); show(member(m.id), r2); drawToday(); } });
  };
  const validate = code => {
    const m = memberByCode(code) || db.find('members', x => x.name.toLowerCase() === String(code).trim().toLowerCase());
    show(m, m ? checkIn(m, branchId) : access(null));
    drawToday();
    const inp = v.querySelector('#k-code'); inp.value = ''; inp.focus();
  };
  v.querySelector('[data-scan]').onsubmit = e => { e.preventDefault(); const c = e.target.code.value.trim(); if (c) validate(c); };
  v.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => validate(b.dataset.demo));
  v.querySelector('[data-br]').onchange = e => { branchId = e.target.value; drawToday(); };
  drawToday();
  if (last) show(member(last.id), last.res);
}
