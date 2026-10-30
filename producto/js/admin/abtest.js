// Gestor de pruebas A/B del titular: reparto de visitantes, resultados simulados, significancia y ganador.
import { db, abtest, landing } from '../data/db.js';
import { pageHead, badge } from '../shared/admin-kit.js';
import { escape, num, date, toast, confirm, formModal } from '../../../assets/core/ui.js';

const erf = x => { const t = 1 / (1 + .3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = z => .5 * (1 + erf(z / Math.SQRT2));
const pct = (n, d = 2) => (n || 0).toFixed(d).replace('.', ',') + '%';

function analyze(t) {
  const { A, B } = t.stats;
  const rA = A.visitors ? A.conversions / A.visitors : 0, rB = B.visitors ? B.conversions / B.visitors : 0;
  const p = (A.conversions + B.conversions) / Math.max(1, A.visitors + B.visitors);
  const se = Math.sqrt(p * (1 - p) * (1 / Math.max(1, A.visitors) + 1 / Math.max(1, B.visitors)));
  const z = se ? (rB - rA) / se : 0;
  const probB = phi(z);
  const lift = rA ? (rB - rA) / rA * 100 : 0;
  const leader = rB >= rA ? 'B' : 'A';
  const conf = leader === 'B' ? probB : 1 - probB;
  return { rA, rB, lift, conf, leader };
}

function render(view, ctx) {
  const t = abtest();
  const a = analyze(t);
  const active = t.status === 'activo';
  const days = Math.max(1, Math.round((Date.now() - new Date(t.startedAt)) / 864e5));
  const card = v => {
    const s = t.stats[v], r = v === 'A' ? a.rA : a.rB, lead = a.leader === v && a.conf > .9;
    return `<div class="card stack ${lead ? 'winner' : ''}">
      <div class="row between"><b>Variante ${v} · ${escape(t.variants[v].label)}</b>${lead ? badge(`Líder ${pct(a.conf * 100, 0)}`, 'success') : ''}</div>
      <div class="preview-frame"><h3>${escape(t.variants[v].headline)}</h3><p class="small muted" style="margin:0">${escape(t.variants[v].subheadline)}</p></div>
      <div class="grid-3 small"><div><span class="muted">Visitantes</span><div class="big-num">${num(s.visitors)}</div></div><div><span class="muted">Compras</span><div class="big-num">${num(s.conversions)}</div></div><div><span class="muted">Conversión</span><div class="big-num">${pct(r * 100)}</div></div></div>
      <div class="progress"><i style="--v:${Math.min(100, r * 100 / 5 * 100)}%"></i></div>
    </div>`;
  };
  view.innerHTML = `${pageHead('Pruebas A/B', 'Compara dos titulares del hero. Cada visitante nuevo de la landing ve siempre la misma variante.',
    active ? `<button class="btn" data-sim>⚡ Simular 500 visitas</button><button class="btn" data-edit>Editar</button><button class="btn btn-ghost" data-pause>Pausar</button>`
      : `<button class="btn btn-primary" data-new>＋ Nueva prueba</button>${t.status === 'pausado' ? '<button class="btn" data-resume>Reanudar</button>' : ''}`)}
    <div class="card stack">
      <div class="row between"><div><h3 style="margin:0">${escape(t.name)}</h3><span class="small muted">Inicio ${escape(date(t.startedAt))} · ${days} días · objetivo: ${escape(t.goal)}</span></div>
        ${badge(t.status === 'activo' ? 'En curso' : t.status === 'pausado' ? 'Pausada' : 'Finalizada', t.status === 'activo' ? 'success' : t.status === 'pausado' ? 'warning' : '')}</div>
      <div><span class="small muted">Reparto de tráfico</span><div class="ab-bar"><span class="a" style="width:${t.split}%">A ${t.split}%</span><span class="b" style="width:${100 - t.split}%">B ${100 - t.split}%</span></div></div>
    </div>
    <div class="split">${card('A')}${card('B')}</div>
    <div class="card stack">
      <h3 style="margin:0">Resultado</h3>
      <p style="margin:0">La variante <b>${a.leader}</b> convierte <b>${pct(Math.abs(a.lift), 1)}</b> ${a.lift >= 0 === (a.leader === 'B') ? 'más' : 'menos'} que la otra, con una confianza estadística de <b>${pct(a.conf * 100, 1)}</b>.</p>
      <p class="small muted" style="margin:0">${a.conf >= .95 ? '✅ Resultado significativo (≥ 95%). Puedes declarar un ganador.' : '⏳ Aún no es significativo. Sigue acumulando visitas (o simula más tráfico).'}</p>
      ${active || t.status === 'pausado' ? `<div class="row" style="gap:8px"><button class="btn btn-primary" data-win="${a.leader}">🏆 Declarar ganadora a ${a.leader} y aplicar a la landing</button><button class="btn btn-ghost" data-win="${a.leader === 'A' ? 'B' : 'A'}">Aplicar ${a.leader === 'A' ? 'B' : 'A'}</button></div>` : ''}
    </div>
    <div class="card"><h3>Historial de pruebas</h3>
      <div class="table-wrap"><table class="table"><thead><tr><th>Prueba</th><th>Ganadora</th><th>Mejora</th><th>Finalizó</th></tr></thead><tbody>
      ${t.history.map(h => `<tr><td>${escape(h.name)}</td><td>${badge(h.winner, 'success')}</td><td>${pct(h.lift, 1)}</td><td>${escape(date(h.endedAt))}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin pruebas anteriores</td></tr>'}
      </tbody></table></div></div>`;

  view.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    const cur = abtest();
    if (b.matches('[data-sim]')) {
      const stats = structuredClone(cur.stats);
      const vA = Math.round(500 * cur.split / 100), vB = 500 - vA;
      const conv = (n, r) => { let c = 0; for (let i = 0; i < n; i++) if (Math.random() < r) c++; return c; };
      stats.A.visitors += vA; stats.A.conversions += conv(vA, .026);
      stats.B.visitors += vB; stats.B.conversions += conv(vB, .031);
      db.setValue('abtest', { ...cur, stats });
      toast('Se simularon 500 visitas', 'success'); render(view, ctx);
    }
    if (b.matches('[data-pause]')) { db.setValue('abtest', { ...cur, status: 'pausado' }); db.log('Prueba A/B', `Pausada: ${cur.name}`, ctx.user.id); toast('Prueba pausada: todos ven el titular de la landing', 'warning'); render(view, ctx); }
    if (b.matches('[data-resume]')) { db.setValue('abtest', { ...cur, status: 'activo' }); db.log('Prueba A/B', `Reanudada: ${cur.name}`, ctx.user.id); toast('Prueba reanudada', 'success'); render(view, ctx); }
    if (b.matches('[data-edit]')) {
      const v = await formModal({ title: 'Editar prueba', size: 'lg', fields: [
        { name: 'name', label: 'Nombre de la prueba', value: cur.name, required: true },
        { name: 'split', label: '% de tráfico a la variante A', type: 'number', value: cur.split, required: true },
        { name: 'hA', label: 'Titular A', value: cur.variants.A.headline, required: true }, { name: 'sA', label: 'Subtítulo A', type: 'textarea', value: cur.variants.A.subheadline },
        { name: 'hB', label: 'Titular B', value: cur.variants.B.headline, required: true }, { name: 'sB', label: 'Subtítulo B', type: 'textarea', value: cur.variants.B.subheadline }
      ] });
      if (!v) return;
      const split = Math.min(90, Math.max(10, v.split));
      db.setValue('abtest', { ...cur, name: v.name, split, variants: { A: { ...cur.variants.A, headline: v.hA, subheadline: v.sA }, B: { ...cur.variants.B, headline: v.hB, subheadline: v.sB } } });
      db.log('Prueba A/B', `Editada: ${v.name}`, ctx.user.id); toast('Prueba actualizada', 'success'); render(view, ctx);
    }
    if (b.dataset.win) {
      const w = b.dataset.win, an = analyze(cur);
      if (!(await confirm(`Se aplicará el titular de la variante ${w} a la landing y la prueba terminará.`, { ok: 'Aplicar y finalizar' }))) return;
      const L = landing();
      db.setValue('landing', { ...L, headline: cur.variants[w].headline, subheadline: cur.variants[w].subheadline });
      db.setValue('abtest', { ...cur, status: 'finalizado', history: [{ name: cur.name, winner: w, lift: Math.abs(an.lift), endedAt: new Date().toISOString() }, ...cur.history] });
      db.log('Prueba A/B', `Ganadora ${w}: «${cur.variants[w].headline}»`, ctx.user.id);
      toast(`Variante ${w} aplicada a la landing`, 'success'); render(view, ctx);
    }
    if (b.matches('[data-new]')) {
      const L = landing();
      const v = await formModal({ title: 'Nueva prueba A/B', size: 'lg', fields: [
        { name: 'name', label: 'Nombre', value: 'Nuevo titular', required: true },
        { name: 'split', label: '% de tráfico a A (control)', type: 'number', value: 50 },
        { name: 'hB', label: 'Titular B (A = titular actual de la landing)', required: true, placeholder: 'Ej: 2 litros al día, sin pensarlo.' },
        { name: 'sB', label: 'Subtítulo B', type: 'textarea', value: L.subheadline }
      ] });
      if (!v) return;
      db.setValue('abtest', { ...cur, id: 'ab-' + Date.now().toString(36), name: v.name, status: 'activo', split: Math.min(90, Math.max(10, v.split || 50)), startedAt: new Date().toISOString(),
        variants: { A: { label: 'Control', headline: L.headline, subheadline: L.subheadline }, B: { label: 'Variante', headline: v.hB, subheadline: v.sB } },
        stats: { A: { visitors: 0, conversions: 0 }, B: { visitors: 0, conversions: 0 } } });
      db.log('Prueba A/B', `Iniciada: ${v.name}`, ctx.user.id); toast('Prueba iniciada', 'success'); render(view, ctx);
    }
  };
}

export default { id: 'abtest', label: 'Pruebas A/B', ico: '🧪', group: 'Marketing', roles: ['admin', 'marketing'], render };
