import { escape, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { plan, branch, statusBadge, access, qrSvg, settings } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { icon } from '../shared/icons.js';

export function renderCard(v, _, __, { m }) {
  const p = plan(m.planId), a = access(m);
  const visits = db.query('checkins', k => k.memberId === m.id).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 8);
  v.innerHTML = `${pageHead('Carnet digital', 'Muestra el código en el kiosco de la sede o díctalo en recepción.')}
  <div class="grid-2">
    <div class="stack">
      <div class="member-card" data-card>
        <div class="mc-top"><span>${icon('dumbbell', 20)} ${escape(settings().name)}</span><span class="badge">${escape(p.name)}</span></div>
        <div class="qr">${qrSvg(m.code)}</div>
        <div class="code">${m.code}</div>
        <div class="mc-foot"><span>Socio/a<b>${escape(m.name)}</b></span><span>Sede<b>${escape(p.allBranches ? 'Todas' : branch(m.branchId)?.name)}</b></span><span>Vence<b>${escape(m.nextDue)}</b></span></div>
      </div>
      <div class="card row between"><span>Estado de acceso</span>${a.ok ? '<span class="badge badge-success">Puede ingresar</span>' : `<span class="badge badge-danger">${escape(a.title)}</span>`}</div>
      <button class="btn" data-bright>${icon('sparkle', 16)} Modo pantalla completa</button>
    </div>
    <div class="card"><h3>Últimas visitas</h3>${visits.map(k => `<div class="row between small" style="margin-bottom:8px"><span>${icon('pin', 14)} ${escape(branch(k.branchId)?.name)}</span><span class="muted">${escape(dateTime(k.at))}</span></div>`).join('') || '<p class="muted">Aún no registras visitas.</p>'}
      <p class="small muted mb0">Estado de membresía: ${statusBadge(m.status)}</p></div>
  </div>`;
  v.querySelector('[data-bright]').onclick = () => { const c = v.querySelector('[data-card]'); c.requestFullscreen ? c.requestFullscreen().catch(() => {}) : null; };
}
