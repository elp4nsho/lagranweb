// Muro de avisos y votaciones (un voto por unidad, resultados por unidades y ponderados por alícuota).
import { escape, toast, ago, date } from '../../../assets/core/ui.js';
import { POLLSTATUS, badge, pctFmt } from '../shared/format.js';
import { pageHead } from '../shared/kit.js';

let cat = '';
export function renderBoard(el, p, q, ctx) {
  const { db } = ctx;
  const all = db.query('announcements', a => a.published).sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const cats = [...new Set(all.map(a => a.category))];
  const list = all.filter(a => !cat || a.category === cat);
  el.innerHTML = `${pageHead('Avisos de la comunidad', `${all.length} avisos publicados`)}
    <div class="row" style="gap:6px"><button class="chip ${!cat ? 'active' : ''}" data-cat="">Todos</button>${cats.map(c => `<button class="chip ${cat === c ? 'active' : ''}" data-cat="${escape(c)}">${escape(c)}</button>`).join('')}</div>
    <div class="stack">${list.map(a => `<article class="card ann ${a.pinned ? 'pinned' : ''}"><div class="row between"><span class="row" style="gap:6px"><span class="badge plain">${escape(a.category)}</span>${a.pinned ? '<span class="badge badge-warning">Destacado</span>' : ''}</span><span class="muted small">${date(a.createdAt)} · ${escape(a.author)}</span></div><h3 style="margin:10px 0 6px">${escape(a.title)}</h3><p style="margin:0">${escape(a.body)}</p></article>`).join('') || '<div class="card empty">Sin avisos.</div>'}</div>`;
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; ctx.refresh(); });
}

export function pollResults(poll, db) {
  const units = db.all('units'), alic = id => units.find(u => u.id === id)?.alicuota || 0;
  const totalAlic = poll.votes.reduce((t, v) => t + alic(v.unitId), 0) || 1;
  return poll.options.map((o, i) => { const vs = poll.votes.filter(v => v.option === i); return { label: o, n: vs.length, pct: poll.votes.length ? vs.length / poll.votes.length * 100 : 0, wpct: vs.reduce((t, v) => t + alic(v.unitId), 0) / totalAlic * 100 }; });
}
export const resultsHTML = (poll, db) => {
  const res = pollResults(poll, db), part = poll.votes.reduce((t, v) => t + (db.get('units', v.unitId)?.alicuota || 0), 0);
  return `${res.map(r => `<div class="poll-opt"><div class="row"><span>${escape(r.label)}</span><b>${pctFmt(r.wpct)}</b></div><div class="progress"><i style="--v:${r.wpct.toFixed(1)}%"></i></div><span class="small muted">${r.n} votos (${pctFmt(r.pct)} de las unidades que votaron)</span></div>`).join('')}
    <p class="small muted" style="margin:0">Participación: ${poll.votes.length} de ${db.count('units')} unidades · ${pctFmt(part)} de los derechos. Porcentajes ponderados por alícuota.</p>`;
};

export function renderPolls(el, p, q, ctx, { unit }) {
  const { db, user } = ctx;
  const polls = db.query('polls', x => x.status !== 'borrador').sort((a, b) => (a.status === 'abierta' ? -1 : 1) - (b.status === 'abierta' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = `${pageHead('Votaciones', 'Un voto por departamento. Los resultados se ponderan por alícuota.')}
    ${polls.map(poll => { const voted = poll.votes.find(v => v.unitId === unit.id); const open = poll.status === 'abierta';
      return `<div class="card stack"><div class="row between"><h3 style="margin:0">${escape(poll.title)}</h3><span class="row" style="gap:6px">${badge(POLLSTATUS, poll.status)}<span class="muted small">${open ? 'Cierra ' + date(poll.closesAt) : 'Cerró ' + date(poll.closesAt)}</span></span></div><p class="muted" style="margin:0">${escape(poll.description)}</p>
        ${open && !voted ? `<form class="stack" data-vote="${poll.id}" style="gap:8px">${poll.options.map((o, i) => `<label class="choice"><input type="radio" name="o" value="${i}"> ${escape(o)}</label>`).join('')}<button class="btn btn-primary" style="align-self:flex-start">Emitir voto</button></form>`
          : `${voted ? `<span class="badge badge-success" style="align-self:flex-start">Tu depto votó: ${escape(poll.options[voted.option])} · ${ago(voted.at)}</span>` : ''}${resultsHTML(poll, db)}`}</div>`; }).join('') || '<div class="card empty">No hay votaciones.</div>'}`;
  el.querySelectorAll('[data-vote]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); const o = f.querySelector('input:checked'); if (!o) return toast('Elige una opción', 'warning');
    const poll = db.get('polls', f.dataset.vote);
    if (poll.status !== 'abierta' || poll.votes.some(v => v.unitId === unit.id)) return toast('Esta votación ya no acepta tu voto', 'warning');
    db.update('polls', poll.id, { votes: [...poll.votes, { unitId: unit.id, option: +o.value, at: new Date().toISOString(), userId: user.id }] });
    db.log('votación', `${user.name} (${unit.tower}-${unit.number}) votó en «${poll.title}»`, user.id);
    toast('Voto registrado', 'success'); ctx.refresh();
  }));
}
