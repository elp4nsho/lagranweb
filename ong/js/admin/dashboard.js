// Dashboard: recaudación del mes, donantes recurrentes, avance de campañas y gráficos.
import { db, ok, campaignStats, campaignName, totals } from '../data/db.js';
import { pageHead, kpi, delta, activityList, badge } from '../shared/admin-kit.js';
import { money, num, lineChart, barChart, donutChart, escape, ago } from '../../../assets/core/ui.js';

export default {
  id: 'dashboard', label: 'Dashboard', ico: '📊', group: 'General', roles: null,
  render(view, { user }) {
    const now = new Date();
    const mk = d => d.toISOString().slice(0, 7);
    const thisM = mk(now), prevD = new Date(now); prevD.setDate(1); prevD.setMonth(prevD.getMonth() - 1); const prevM = mk(prevD);
    const dons = db.query('donations', ok);
    const inMonth = m => dons.filter(d => d.createdAt.startsWith(m));
    const cur = inMonth(thisM), prev = inMonth(prevM);
    const sum = l => l.reduce((s, d) => s + d.amount, 0);
    const subs = db.all('subscriptions'), active = subs.filter(s => s.status === 'activa');
    const mrr = active.reduce((s, x) => s + x.amount, 0);
    const newDonors = new Set(cur.map(d => d.donorId)).size;
    const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - i); const k = mk(d); const l = inMonth(k); months.push({ label: d.toLocaleDateString('es-CL', { month: 'short' }), once: sum(l.filter(x => x.type === 'unica')), monthly: sum(l.filter(x => x.type === 'mensual')) }); }
    const camps = db.query('campaigns', c => c.status === 'publicada').map(c => ({ c, s: campaignStats(c) })).sort((a, b) => b.s.pct - a.s.pct);
    const byCat = {};
    dons.filter(d => Date.now() - new Date(d.createdAt) < 365 * 864e5).forEach(d => { const cat = d.campaignId ? db.get('campaigns', d.campaignId)?.category || 'Otra' : 'Fondo general'; byCat[cat] = (byCat[cat] || 0) + d.amount; });
    const t = totals();
    view.innerHTML = `${pageHead(`Hola, ${user.name.split(' ')[0]} 🌱`, `Resumen de ${now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`, '<a class="btn" href="index.html#/donar" target="_blank" rel="noopener">Probar donación ↗</a>')}
      <div class="dash">
      <div class="kpis d-kpis">
        ${kpi('Recaudado este mes', money(sum(cur)), { ...delta(sum(cur), sum(prev)), ico: '💚' })}
        ${kpi('Donantes recurrentes', num(active.length), { ico: '🔁', sub: `${money(mrr)} / mes comprometidos` })}
        ${kpi('Donaciones del mes', num(cur.length), { ...delta(cur.length, prev.length), ico: '🧾', sub: `${num(newDonors)} donantes distintos` })}
        ${kpi('Recaudado en el año', money(t.raisedYear), { ico: '📈', sub: `${num(t.volunteers)} voluntarios activos` })}
      </div>
      <div class="dash-grid">
        <div class="card d-line"><div class="card-title"><h3>Recaudación mensual</h3><span class="small muted">únicas + mensuales, 12 meses</span></div>${lineChart(months.map(m => ({ label: m.label, value: m.once + m.monthly })), { format: money })}</div>
        <div class="card d-type"><div class="card-title"><h3>Por tipo (12 meses)</h3></div>${donutChart([{ label: 'Únicas', value: Math.round(months.reduce((s, m) => s + m.once, 0) / 1e6) }, { label: 'Mensuales', value: Math.round(months.reduce((s, m) => s + m.monthly, 0) / 1e6) }], { label: 'MM$' })}
          <p class="small muted" style="margin:12px 0 0">En millones de pesos. Las donaciones mensuales dan estabilidad a los proyectos.</p></div>
      </div>
      <div class="dash-grid even">
        <div class="card d-camps"><div class="card-title"><h3>Avance de campañas</h3><a class="btn btn-sm btn-ghost" href="#/campanas">Gestionar →</a></div>
          <div class="stack" style="gap:14px">${camps.map(({ c, s }) => `<a href="#/campanas/${c.id}" style="color:inherit;text-decoration:none"><div class="row between small"><b>${escape(c.title)}</b><span>${money(s.raised)} · <b>${Math.round(s.pct)}%</b></span></div><div class="progress"><i style="--v:${Math.min(100, s.pct)}%"></i></div><span class="small muted">${s.daysLeft >= 0 ? s.daysLeft + ' días restantes' : 'plazo vencido'} · ${s.donors} donantes</span></a>`).join('')}</div></div>
        <div class="card d-cause"><div class="card-title"><h3>Recaudación por causa (12 meses)</h3></div>${barChart(Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: label.split(' ')[0], value })), { format: money })}</div>
      </div>
      <div class="dash-grid">
        <div class="card d-last"><div class="card-title"><h3>Últimas donaciones</h3><a class="btn btn-sm btn-ghost" href="#/donaciones">Libro de donaciones →</a></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Donante</th><th>Destino</th><th>Monto</th><th>Tipo</th></tr></thead><tbody>
          ${db.all('donations').slice(0, 7).map(d => `<tr><td>${escape(d.donorName)}<br><small class="muted">${escape(ago(d.createdAt))}</small></td><td>${escape(campaignName(d.campaignId))}</td><td><b>${money(d.amount)}</b>${d.status !== 'aprobada' ? ' ' + badge(d.status, 'danger') : ''}</td><td>${d.type === 'mensual' ? badge('Mensual', 'primary') : badge('Única', '')}</td></tr>`).join('')}
          </tbody></table></div></div>
        <div class="card d-act"><div class="card-title"><h3>Actividad reciente</h3></div>${activityList(db.all('_log'), db.all('users'), 8)}</div>
      </div>
      </div>`;
  }
};
