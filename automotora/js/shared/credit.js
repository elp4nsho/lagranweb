// Evaluación crediticia (vista de scoring + decisión) compartida por el panel y la app de crédito.
import { escape, money, toast, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { model, version, finBadge, userName, addTimeline, modelLabel, FIN_STATUS } from './domain.js';
import { simulate, preEvaluate, scoreTone } from './finance.js';
import { gauge } from './charts.js';
import { carCellHTML } from './cells.js';
import { nf1, fdate } from './util.js';
import { icon } from './icons.js';

export function analyze(a) {
  const p = db.get('finProducts', a.productId);
  const sim = p ? simulate({ product: p, price: a.price, pie: a.pie, plazo: a.plazo }) : null;
  const cuota = sim ? (sim.kind === 'leasing' ? sim.cuotaIva : sim.cuota) : a.cuota;
  const ev = preEvaluate({ rut: a.rut, renta: a.renta, cuota, otherDebt: a.otherDebt || 0, employment: a.employment, seniority: a.seniority || 0, piePct: a.pie / a.price * 100 });
  return { p, sim, cuota, ev, load: ev.load, piePct: a.pie / a.price * 100, ltv: (a.price - a.pie) / a.price * 100 };
}

export function appDetailHTML(a) {
  const x = analyze(a), tone = scoreTone(x.ev.score);
  const item = (label, val, good) => `<div class="score-item ${good === true ? 'good' : good === false ? 'bad' : ''}"><small>${label}</small><b>${val}</b></div>`;
  const rec = x.ev.decision === 'preaprobada' ? 'Recomendación del motor: <b>aprobar</b>.' : x.ev.decision === 'condiciones' ? `Recomendación: <b>aprobar con condiciones</b> (${escape(x.ev.conditions)}).` : 'Recomendación: <b>rechazar</b> o pedir más pie / codeudor.';
  return `<div class="grid-main">
    <div class="stack">
      <div class="card"><div class="card-title"><h3>${icon('user', 18)} ${escape(a.name)}</h3>${finBadge(a.status)}</div>
        <dl class="kv"><dt>RUT</dt><dd>${escape(a.rut)}</dd><dt>Contacto</dt><dd>${escape(a.email || '')} ${escape(a.phone || '')}</dd><dt>Situación laboral</dt><dd>${escape(a.employment)} · ${a.seniority} años</dd><dt>Renta líquida</dt><dd>${money(a.renta)}</dd><dt>Otras deudas</dt><dd>${money(a.otherDebt || 0)}/mes</dd><dt>Ingresada</dt><dd>${dateTime(a.createdAt)}</dd></dl></div>
      <div class="card"><div class="card-title"><h3>${icon('car', 18)} Operación</h3><span class="mono small">${a.number}</span></div>${carCellHTML(a.modelId, null, escape(version(a.modelId, a.versionId)?.name || ''))}
        <dl class="kv" style="margin-top:10px"><dt>Producto</dt><dd>${escape(x.p?.name || 'Contado')}</dd><dt>Precio</dt><dd>${money(a.price)}</dd><dt>Pie</dt><dd>${money(a.pie)} (${nf1(x.piePct)}%)</dd><dt>Plazo</dt><dd>${a.plazo} meses</dd><dt>Cuota</dt><dd><b>${money(x.cuota)}</b></dd>${x.sim ? `<dt>CAE</dt><dd>${nf1(x.sim.cae, 2)}%</dd><dt>Costo total</dt><dd>${money(x.sim.totalIva || x.sim.total)}</dd>${x.sim.vfmg ? `<dt>VFMG</dt><dd>${money(x.sim.vfmg)}</dd>` : ''}` : ''}</dl></div>
    </div>
    <div class="stack">
      <div class="card"><h3>Scoring</h3>${gauge(x.ev.score, { label: 'Puntaje interno', tone })}
        <div class="score-grid">${item('Carga financiera', nf1(x.load * 100) + '%', x.load <= .25 ? true : x.load > .35 ? false : null)}${item('Pie', nf1(x.piePct) + '%', x.piePct >= 30 ? true : x.piePct < 20 ? false : null)}${item('LTV', nf1(x.ltv) + '%', x.ltv <= 70)}${item('Historial comercial', x.ev.history + ' pts', x.ev.history >= 700 ? true : x.ev.history < 600 ? false : null)}${item('Antigüedad', a.seniority + ' años', a.seniority >= 2)}${item('DICOM (simulado)', x.ev.dicom ? 'Con registros' : 'Sin registros', !x.ev.dicom)}</div>
        <p class="small" style="margin-top:12px">${rec}</p></div>
      ${a.conditions ? `<div class="alert-box warning">${icon('alert', 16)} <span>Condición: <b>${escape(a.conditions)}</b></span></div>` : ''}
      ${(a.notes || []).length ? `<div class="card"><h4>Notas</h4><ol class="timeline">${a.notes.slice().reverse().map(n => `<li><b>${escape(n.text)}</b><small>${dateTime(n.at)} · ${escape(userName(n.by))}</small></li>`).join('')}</ol></div>` : ''}
    </div></div>`;
}

export function decide(a, status, { conditions = '', note = '' } = {}) {
  const u = auth.current();
  const patch = { status, analystId: a.analystId || u.id, notes: [...(a.notes || []), ...(note ? [{ at: new Date().toISOString(), text: note, by: u.id }] : [])] };
  if (['aprobada', 'aprobada_condiciones', 'rechazada'].includes(status)) { patch.decidedAt = new Date().toISOString(); patch.conditions = conditions; }
  db.update('finApps', a.id, patch);
  if (a.leadId) addTimeline(a.leadId, 'credito', `Crédito ${a.number}: ${FIN_STATUS[status][0]}${conditions ? ' · ' + conditions : ''}.`, u.id);
  db.log('crédito', `${a.number} ${a.name}: ${FIN_STATUS[status][0]}`, u.id);
  toast(`Solicitud ${FIN_STATUS[status][0].toLowerCase()}`, status === 'rechazada' ? 'warning' : 'success');
}
export { modelLabel, fdate };
