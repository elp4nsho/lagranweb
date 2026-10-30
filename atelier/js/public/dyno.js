// Resultados de dinamómetro: galería pública y detalle con curvas de potencia y torque antes/después.
import { escape, date } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { vehicleById, dynoCurve, userById } from '../shared/domain.js';
import { multiLine } from '../shared/charts.js';
import { carArt } from '../shared/car-art.js';

export function dynoChart(d, { height = 260 } = {}) {
  const b = dynoCurve(d.before, d.redline), a = dynoCurve(d.after, d.redline, 1);
  return multiLine({
    x: b.map(p => (p.rpm / 1000).toFixed(p.rpm % 1000 ? 2 : 0).replace(/\.?0+$/, '') + 'k'), height, leftLabel: 'CV', rightLabel: 'Nm', xLabel: 'rpm',
    series: [
      { name: 'Potencia antes', values: b.map(p => p.hp), color: 'var(--muted)', dash: '6 5' },
      { name: 'Potencia después', values: a.map(p => p.hp), color: 'var(--primary)', width: 3.2 },
      { name: 'Torque antes', values: b.map(p => p.nm), color: 'var(--muted)', dash: '2 4', axis: 'right' },
      { name: 'Torque después', values: a.map(p => p.nm), color: 'var(--accent)', axis: 'right' }
    ]
  });
}
export const peaks = d => { const b = dynoCurve(d.before, d.redline), a = dynoCurve(d.after, d.redline, 1); return { hpB: d.before.hp, hpA: d.after.hp, nmB: Math.max(...b.map(p => p.nm)), nmA: Math.max(...a.map(p => p.nm)) }; };

export function dynoCard(d) {
  const v = vehicleById(d.vehicleId), p = peaks(d);
  return `<a class="card hover stack" href="#/dyno/${d.id}" style="text-decoration:none;color:var(--text);gap:8px">
    <div class="car-frame">${carArt({ body: v?.body, color: v?.color, label: v ? v.brand + ' ' + v.model : '' })}</div>
    <div class="row between"><b>${escape(v ? v.brand + ' ' + v.model : 'Vehículo')}</b><span class="badge badge-primary">${escape(d.stage)}</span></div>
    <div class="row between small"><span class="muted">${p.hpB} → <b style="color:var(--text)">${p.hpA} CV</b></span><span class="gain" style="font-size:1.2em">+${Math.round((p.hpA / p.hpB - 1) * 100)}%</span></div>
    <small class="muted">${date(d.at)}</small></a>`;
}

export function renderDynoList(el) {
  const list = db.query('dyno', d => d.public).sort((a, b) => b.at.localeCompare(a.at));
  const avg = list.length ? Math.round(list.reduce((a, d) => a + (d.after.hp / d.before.hp - 1), 0) / list.length * 100) : 0;
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Dinamómetro de rodillos 4WD</span><h1>Resultados dyno</h1><p class="lead">Mediciones reales de potencia en rueda antes y después de cada reprogramación, publicadas con autorización del cliente.</p></div>
      <div class="facts"><div><b>${list.length}</b><small>sesiones publicadas</small></div><div><b>+${avg}%</b><small>ganancia promedio</small></div></div></div>
    <div class="grid-auto">${list.map(dynoCard).join('') || '<div class="card empty">Aún no hay resultados publicados.</div>'}</div>
    <div class="callout small">Potencia en rueda (WHP) corregida a condiciones SAE J1349. Los resultados dependen del estado de cada auto y del combustible.</div>
  </div></section>`;
}

export function renderDyno(el, { id }) {
  const d = db.get('dyno', id);
  if (!d) { el.innerHTML = '<section class="section"><div class="container card empty">Resultado no encontrado. <a href="#/dyno">Ver todos</a></div></section>'; return; }
  const v = vehicleById(d.vehicleId), p = peaks(d), t = userById(d.techId);
  el.innerHTML = `<section class="section"><div class="container stack">
    <a href="#/dyno" class="small">← Todos los resultados</a>
    <div class="sec-head"><div><span class="eyebrow">${escape(d.stage)} · ${date(d.at)}</span><h1>${escape(v ? v.brand + ' ' + v.model : 'Vehículo')}</h1></div><a class="btn btn-primary" href="#/agendar?svc=sv-stage1&brand=${encodeURIComponent(v?.brand || '')}&model=${encodeURIComponent(v?.model || '')}">Quiero este resultado</a></div>
    <div class="grid-4">
      <div class="card stat"><span class="label">Potencia antes</span><span class="value">${p.hpB} CV</span></div>
      <div class="card stat"><span class="label">Potencia después</span><span class="value">${p.hpA} CV</span><span class="delta up">▲ +${p.hpA - p.hpB} CV</span></div>
      <div class="card stat"><span class="label">Torque antes</span><span class="value">${p.nmB} Nm</span></div>
      <div class="card stat"><span class="label">Torque después</span><span class="value">${p.nmA} Nm</span><span class="delta up">▲ +${p.nmA - p.nmB} Nm</span></div>
    </div>
    <div class="card"><h3>Curva de potencia y torque</h3>${dynoChart(d)}</div>
    <div class="grid-2"><div class="card car-frame">${carArt({ body: v?.body, color: v?.color, ev: v?.fuel === 'electrico' })}</div>
      <div class="card"><dl class="dl"><dt>Etapa</dt><dd>${escape(d.stage)}</dd><dt>Combustible</dt><dd>${escape(d.fuel)}</dd><dt>Temperatura ambiente</dt><dd>${d.tempC} °C</dd><dt>Régimen potencia máx.</dt><dd>${d.before.rpm} → ${d.after.rpm} rpm</dd><dt>Calibrador</dt><dd>${escape(t?.name || 'Equipo performance')}</dd><dt>Notas</dt><dd>${escape(d.notes)}</dd></dl></div></div>
  </div></section>`;
}
