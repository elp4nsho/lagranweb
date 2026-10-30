// Dashboard: OT abiertas, ticket promedio, horas facturadas vs disponibles, eficiencia por mecánico,
// ingresos repuestos vs mano de obra y tiempos promedio por etapa.
import { escape, money, num, barChart, donutChart, ago } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { STAGES, OT_TYPES } from '../data/catalog.js';
import { openOTs, totals, mechanics, stageHours, taskMin, userName, ST_OF } from '../shared/domain.js';

const short = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace('.', ',')} M` : n >= 1e4 ? `$${Math.round(n / 1000)} mil` : money(n);
// Barras apiladas / agrupadas con tokens del tema.
function multiBars(data, series, { stacked = true, height = 190, format = v => v } = {}) {
  const w = 600, pad = 30, max = Math.max(1, ...data.map(d => stacked ? series.reduce((s, k) => s + d[k.key], 0) : Math.max(...series.map(k => d[k.key]))));
  const bw = (w - pad) / data.length;
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img"><line class="axis" x1="${pad}" y1="${height}" x2="${w}" y2="${height}"/>
    ${data.map((d, i) => { let y = height; const x0 = pad + i * bw + bw * .15, inner = bw * .7; return `<g>${series.map((s, k) => { const h = d[s.key] / max * (height - 14); const x = stacked ? x0 : x0 + k * inner / series.length; const ww = stacked ? inner : inner / series.length - 2; const yy = stacked ? (y -= h) : height - h; return `<rect x="${x}" y="${yy}" width="${ww}" height="${h}" rx="2" style="fill:${s.color}"><title>${escape(d.label)} · ${escape(s.label)}: ${escape(format(d[s.key]))}</title></rect>`; }).join('')}<text x="${x0 + inner / 2}" y="${height + 16}" text-anchor="middle">${escape(d.label)}</text></g>`; }).join('')}</svg>
    <div class="row small" style="gap:14px;justify-content:center">${series.map(s => `<span class="row nowrap" style="gap:6px"><i style="width:10px;height:10px;border-radius:2px;background:${s.color}"></i>${escape(s.label)}</span>`).join('')}</div>`;
}

export default {
  id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'General', roles: ['admin', 'jefe'], watch: ['ots', 'invoices', 'claims'],
  render(el) {
    const paint = () => {
      const ms = db.all('monthStats').sort((a, b) => a.m.localeCompare(b.m));
      const ym = new Date().toISOString().slice(0, 7);
      const invM = db.query('invoices', i => i.issuedAt.slice(0, 7) === ym);
      const inv30 = db.query('invoices', i => Date.now() - Date.parse(i.issuedAt) < 30 * 864e5);
      const open = openOTs();
      const last = ms.at(-1), prev = ms.at(-2);
      const mechs = mechanics();
      // Horas reales del mes en curso (tareas de OT del sistema)
      const live = {}; open.forEach(o => o.tasks.forEach(t => { if (!t.mech) return; const m = (live[t.mech] ||= { worked: 0, std: 0 }); m.worked += taskMin(t) / 60; if (t.done) m.std += t.std; }));
      const eff = mechs.map(m => { const s = last.mech[m.id] || { billed: 0, worked: 1 }; return { m, eff: s.billed / Math.max(1, s.worked) * 100, billed: s.billed, worked: s.worked, live: live[m.id] }; });
      const effAvg = eff.reduce((s, x) => s + x.eff, 0) / Math.max(1, eff.length);
      const ticket = inv30.reduce((s, i) => s + i.total, 0) / Math.max(1, inv30.length);
      const prevTicket = (prev.laborRev + prev.partsRev) / prev.ots;
      const stageAvg = {}; STAGES.slice(0, 7).forEach(([s]) => { stageAvg[s] = last.stage[s]; });
      const closed = db.query('ots', o => o.status === 'entregado');
      if (closed.length) STAGES.slice(0, 7).forEach(([s]) => { const vals = closed.map(o => stageHours(o)[s]).filter(Boolean); if (vals.length) stageAvg[s] = (stageAvg[s] + vals.reduce((a, b) => a + b, 0) / vals.length) / 2; });
      const sentOTs = db.query('ots', o => o.budget.length && o.budget.some(i => i.st !== 'pendiente'));
      const appr = sentOTs.flatMap(o => o.budget).filter(i => i.st !== 'pendiente');
      const apprRate = appr.length ? appr.filter(i => i.st === 'aprobado').reduce((s, i) => s + i.qty * i.price, 0) / appr.reduce((s, i) => s + i.qty * i.price, 0) * 100 : last.approval;
      const byStage = STAGES.slice(0, 7).map(([s, l]) => ({ label: l, value: open.filter(o => o.status === s).length })).filter(d => d.value);
      const byType = Object.entries(OT_TYPES).map(([k, l]) => ({ label: l.replace(/^\S+ /, ''), value: open.filter(o => o.type === k).length })).filter(d => d.value);
      const late = open.filter(o => Date.parse(o.promisedAt) < Date.now());
      const mlabel = m => new Date(m + '-15').toLocaleDateString('es-CL', { month: 'short' });
      el.innerHTML = `${pageHead('Dashboard del taller', 'Indicadores de productividad, ventas y tiempos · últimos 12 meses + mes en curso')}
        <div class="kpi-grid">
          ${kpi('OT abiertas', num(open.length), late.length ? `${late.length} atrasadas` : 'al día', !late.length)}
          ${kpi('Ticket promedio (30 días)', short(ticket), `${ticket >= prevTicket ? '▲' : '▼'} vs. ${short(prevTicket)} mes ant.`, ticket >= prevTicket)}
          ${kpi('Horas facturadas / disponibles', `${Math.round(last.hoursBilled / last.hoursAvail * 100)}%`, `${last.hoursBilled} de ${last.hoursAvail} h (mes anterior)`, last.hoursBilled / last.hoursAvail > .7)}
          ${kpi('Eficiencia promedio', `${Math.round(effAvg)}%`, 'horas estándar / reales', effAvg >= 95)}
          ${kpi('Facturado este mes', short(invM.reduce((s, i) => s + i.total, 0)), `${invM.length} documentos`)}
          ${kpi('Aprobación de presupuestos', `${Math.round(apprRate)}%`, 'del monto ofertado')}
        </div>
        <div class="grid-2">
          <div class="card"><h3>Ingresos: repuestos vs. mano de obra</h3>${multiBars(ms.map(m => ({ label: mlabel(m.m), parts: m.partsRev, labor: m.laborRev })), [{ key: 'labor', label: 'Mano de obra', color: 'var(--primary)' }, { key: 'parts', label: 'Repuestos', color: 'var(--accent)' }], { format: short })}</div>
          <div class="card"><h3>Horas facturadas vs. disponibles</h3>${multiBars(ms.map(m => ({ label: mlabel(m.m), billed: m.hoursBilled, avail: m.hoursAvail })), [{ key: 'avail', label: 'Disponibles', color: 'var(--surface-3)' }, { key: 'billed', label: 'Facturadas', color: 'var(--success)' }], { stacked: false, format: v => v + ' h' })}</div>
        </div>
        <div class="grid-2">
          <div class="card stack"><h3 style="margin:0">Eficiencia por mecánico (mes anterior)</h3>
            ${eff.map(x => `<div class="load-row"><span><b>${escape(x.m.name)}</b><small class="muted d-block">${escape(x.m.specialty)}</small></span><div><div class="progress"><i style="--v:${Math.min(100, x.eff / 1.3)}%"></i></div><small class="muted">${x.billed} h facturadas / ${x.worked} h trabajadas${x.live ? ` · ahora ${x.live.worked.toFixed(1).replace('.', ',')} h en OT abiertas` : ''}</small></div><b class="${x.eff < 85 ? 'text-warning' : 'text-success'}">${Math.round(x.eff)}%</b></div>`).join('')}</div>
          <div class="card"><h3>Tiempo promedio por etapa (horas)</h3>${barChart(STAGES.slice(0, 7).map(([s, l]) => ({ label: l.replace('En reparación', 'Reparación').replace('Control de calidad', 'Control'), value: Math.round(stageAvg[s] * 10) / 10 })), { format: v => `${v} h` })}<small class="muted">La etapa "Presupuesto" mide cuánto tarda el cliente o la aseguradora en aprobar.</small></div>
        </div>
        <div class="grid-3">
          <div class="card"><h3>OT abiertas por etapa</h3>${donutChart(byStage, { label: String(open.length), format: v => `${v} OT` })}</div>
          <div class="card"><h3>Por tipo de trabajo</h3>${donutChart(byType, { label: String(open.length), format: v => `${v} OT` })}</div>
          <div class="card stack"><h3 style="margin:0">Atrasadas y alertas</h3>${late.slice(0, 6).map(o => `<a class="row between small" href="#/ots/${o.id}" style="color:inherit"><span><b>${escape(o.code)}</b> ${escape(o.plate)}</span><span class="badge badge-danger plain">${escape(ST_OF(o.status).label)}</span></a>`).join('') || '<p class="muted small">Ninguna OT atrasada 👍</p>'}
            ${db.query('partRequests', r => r.status === 'solicitado').length ? `<p class="callout warn small">📦 ${db.query('partRequests', r => r.status === 'solicitado').length} solicitudes de repuestos pendientes en bodega</p>` : ''}
            ${db.query('requests', r => r.status === 'nueva').length ? `<a class="callout small" href="#/solicitudes">📨 ${db.query('requests', r => r.status === 'nueva').length} solicitudes nuevas del sitio</a>` : ''}
            <b class="small">Actividad</b>${db.getValue('_log', []).slice(0, 5).map(l => `<small>${escape(l.detail)} <span class="muted">· ${ago(l.at)}</span></small>`).join('')}</div>
        </div>`;
    };
    paint();
    return { refresh: paint };
  }
};
export { totals, userName };
