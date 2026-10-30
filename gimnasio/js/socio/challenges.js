import { escape, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { member } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';
import { challengeScore, leaderboard, daysLeft } from './shared.js';

export function renderChallenges(v, _, __, { m }) {
  const today = ymd(), list = db.all('challenges').sort((a, b) => b.end.localeCompare(a.end));
  v.innerHTML = `${pageHead('Desafíos', 'Compite con otros socios de la red Titán. El ranking se actualiza con cada visita.')}
  <div class="stack">${list.map(ch => {
    const live = ch.active && ch.start <= today && ch.end >= today, lb = leaderboard(ch), me = challengeScore(ch, m.id), pos = lb.findIndex(x => x.id === m.id) + 1;
    return `<div class="card"><div class="card-title"><div><h3>${icon('trophy', 18)} ${escape(ch.name)}</h3><span class="muted small">${escape(ch.desc)} · ${escape(fmtDate(ch.start))} – ${escape(fmtDate(ch.end))}</span></div>${live ? `<span class="badge badge-success">En curso · ${daysLeft(ch.end)} días</span>` : ch.start > today ? '<span class="badge badge-info">Próximamente</span>' : '<span class="badge">Finalizado</span>'}</div>
      <div class="grid-2"><div class="stack"><div><span class="muted small">Tu avance</span><div class="streak">${me} <span class="muted" style="font-size:18px">/ ${ch.goal} ${ch.metric === 'checkins' ? 'visitas' : 'clases'}</span></div></div>
        <div class="progress"><i style="--v:${Math.min(100, me / ch.goal * 100)}%"></i></div>
        <p class="small mb0">${pos ? `Vas en el puesto <b>#${pos}</b> de ${lb.length}` : 'Aún no sumas puntos'} · Premio: ${escape(ch.prize)}</p></div>
      <div>${lb.slice(0, 5).map((x, i) => `<div class="leader ${x.id === m.id ? 'me' : ''}"><span class="pos-n">${i + 1}</span><span class="cell-user"><span class="avatar" style="--size:28px;--av:${member(x.id)?.color}">${escape(initials(member(x.id)?.name || ''))}</span>${escape(x.id === m.id ? 'Tú' : (member(x.id)?.name || '').split(' ').slice(0, 2).join(' '))}</span><b>${x.score}</b></div>`).join('')}
      ${pos > 5 ? `<div class="leader me"><span class="pos-n">${pos}</span><span>Tú</span><b>${me}</b></div>` : ''}</div></div></div>`;
  }).join('')}</div>`;
}
