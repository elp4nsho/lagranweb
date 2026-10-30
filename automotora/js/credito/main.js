// App del analista de crédito: bandeja, evaluación con scoring, decisión, simulador y productos.
import { createRouter } from '../../../assets/core/router.js';
import { escape, money, toast, ago } from '../../../assets/core/ui.js';
import { db, auth, PAGE_ROLES } from '../data/db.js';
import { mountShell, startPanel, host, pageHead, statCard } from '../shared/shell.js';
import { model, finBadge, FIN_STATUS, userName, modelLabel, activeModels, brand } from '../shared/domain.js';
import { appDetailHTML, decide, analyze } from '../shared/credit.js';
import { simulate, plazosOf, scoreTone, preEvaluate } from '../shared/finance.js';
import { carCellHTML } from '../shared/cells.js';
import { donut, hbars } from '../shared/charts.js';
import { nf1, fdate, rutValid } from '../shared/util.js';
import { icon } from '../shared/icons.js';

let user;
try { user = auth.require(PAGE_ROLES['credito.html']); } catch (e) { /* redirigiendo */ }
if (user) {
  const NAV = [{ section: 'Crédito automotriz' }, { href: '#/', label: 'Bandeja', ico: 'list', count: () => db.count('finApps', a => a.status === 'recibida') }, { href: '#/simulador', label: 'Simulador', ico: 'card' }, { href: '#/productos', label: 'Productos y tasas', ico: 'percent' }, { href: '#/indicadores', label: 'Indicadores', ico: 'chart' }];
  const shell = mountShell({ brand: 'Autoplaza', sub: 'Crédito automotriz', logo: 'card', user, auth, db, nav: NAV, topExtra: user.role !== 'analista' ? '<a class="btn btn-sm hide-sm" href="admin.html">Panel</a>' : '', appClass: 'app-credito' });
  const page = (t, fn) => (p, q) => { shell.crumb(t); return fn(host(shell.view), p, q); };
  const router = createRouter({ '/': page('Bandeja de solicitudes', inbox), '/solicitud/:id': page('Evaluación', detail), '/simulador': page('Simulador', sim), '/productos': page('Productos y tasas', products), '/indicadores': page('Indicadores', kpis) }, {
    notFound: () => { shell.view.innerHTML = '<div class="card empty">No encontrado</div>'; }, after: () => router.highlight(document.querySelector('.admin-sidebar')) });
  startPanel({ shell, router, db, auth });

  function inbox(v, _p, q) {
    const tab = q.tab || 'pendientes', all = db.all('finApps');
    const groups = { pendientes: a => ['recibida', 'en_evaluacion'].includes(a.status), aprobadas: a => a.status.startsWith('aprobada'), rechazadas: a => a.status === 'rechazada' };
    const list = all.filter(groups[tab] || groups.pendientes).sort((a, b) => tab === 'pendientes' ? a.createdAt.localeCompare(b.createdAt) : (b.decidedAt || '').localeCompare(a.decidedAt || ''));
    v.innerHTML = `${pageHead('Bandeja de solicitudes', 'Primero en entrar, primero en evaluar. Objetivo de respuesta: 24 horas hábiles.')}
    <div class="grid-4">${statCard('Recibidas', all.filter(a => a.status === 'recibida').length, '', 'bell')}${statCard('En evaluación', all.filter(a => a.status === 'en_evaluacion').length, '', 'clock')}${statCard('Aprobadas (30 d)', all.filter(a => a.status.startsWith('aprobada') && a.decidedAt >= new Date(Date.now() - 30 * 864e5).toISOString()).length, '', 'check')}${statCard('Mis resoluciones', all.filter(a => a.analystId === user.id && a.decidedAt).length, '', 'user')}</div>
    <nav class="tabs">${[['pendientes', 'Pendientes'], ['aprobadas', 'Aprobadas'], ['rechazadas', 'Rechazadas']].map(([k, l]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/?tab=${k}">${l} (${all.filter(groups[k]).length})</a>`).join('')}</nav>
    <div class="stack">${list.slice(0, 40).map(a => `<a class="card appt-row" href="#/solicitud/${a.id}" style="text-decoration:none;color:inherit"><div style="width:110px">${carCellHTML(a.modelId, null, '').replace(/<span>.*<\/span>/s, '')}</div><div class="who"><b>${escape(a.name)} · <span class="mono">${a.number}</span></b><small>${escape(modelLabel(a.modelId))} · ${money(a.price - a.pie)} a ${a.plazo} meses · renta ${money(a.renta)}</small><small>${ago(a.createdAt)}${a.preDecision ? ' · pre-evaluación web' : ''}${a.analystId ? ' · ' + escape(userName(a.analystId)) : ''}</small></div><b style="color:var(--${scoreTone(a.score)});font-size:22px">${a.score}</b>${finBadge(a.status)}</a>`).join('') || '<div class="card empty">Bandeja vacía.</div>'}</div>`;
  }
  function detail(v, { id }) {
    const a = db.get('finApps', id); if (!a) { v.innerHTML = '<div class="card empty">Solicitud no encontrada</div>'; return; }
    const open = ['recibida', 'en_evaluacion'].includes(a.status);
    v.innerHTML = `${pageHead(`Solicitud ${a.number}`, escape(modelLabel(a.modelId, a.versionId)), `<a class="btn btn-ghost" href="#/">${icon('back', 16)} Bandeja</a>${a.status === 'recibida' ? `<button class="btn btn-primary" data-take>${icon('user', 16)} Tomar solicitud</button>` : ''}`)}
    ${appDetailHTML(a)}
    ${open ? `<form class="card stack" data-dec><h3>${icon('shield', 18)} Resolución</h3><div class="field"><label for="cn">Condiciones / motivo</label><input class="input" id="cn" name="cond" placeholder="Ej: aumentar pie a 35% o presentar aval"></div><div class="field"><label for="nt">Nota interna</label><input class="input" id="nt" name="note" placeholder="Ej: verificada liquidación de sueldo"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-note>Solo agregar nota</button><button class="btn btn-danger" type="button" data-d="rechazada">Rechazar</button><button class="btn" type="button" data-d="aprobada_condiciones">Aprobar con condiciones</button><button class="btn btn-primary" type="button" data-d="aprobada">${icon('check', 16)} Aprobar</button></div></form>` : ''}`;
    v.querySelector('[data-take]')?.addEventListener('click', () => { decide(a, 'en_evaluacion', { note: 'Solicitud tomada para evaluación' }); });
    const f = v.querySelector('[data-dec]');
    f?.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const cond = f.cond.value.trim(), note = f.note.value.trim();
      if (b.hasAttribute('data-note')) { if (!note) return toast('Escribe la nota', 'warning'); db.update('finApps', id, { notes: [...(a.notes || []), { at: new Date().toISOString(), text: note, by: user.id }], analystId: a.analystId || user.id, status: a.status === 'recibida' ? 'en_evaluacion' : a.status }); toast('Nota agregada', 'success'); return; }
      if (b.dataset.d === 'aprobada_condiciones' && !cond) return toast('Indica las condiciones', 'warning');
      if (b.dataset.d === 'rechazada' && !cond) return toast('Indica el motivo del rechazo', 'warning');
      decide(db.get('finApps', id), b.dataset.d, { conditions: cond, note: note || cond });
    });
  }
  function sim(v) {
    const ms = activeModels(), prods = db.query('finProducts', p => p.active);
    v.innerHTML = `${pageHead('Simulador interno', 'Para atender consultas de ejecutivos y clientes por teléfono.')}
    <div class="grid-2"><form class="card stack" data-f><div class="field"><label for="sm">Modelo</label><select class="select" id="sm" name="m">${ms.map(m => `<option value="${m.id}">${escape(brand(m.brandId).name)} ${escape(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="sp">Producto</label><select class="select" id="sp" name="p">${prods.map(p => `<option value="${p.id}">${escape(p.name)}</option>`).join('')}</select></div>
      <div class="form-grid"><div class="field"><label for="spr">Precio</label><input class="input" id="spr" name="price" type="number" step="100000"></div><div class="field"><label for="spi">Pie</label><input class="input" id="spi" name="pie" type="number" step="100000"></div><div class="field"><label for="spl">Plazo</label><select class="select" id="spl" name="n"></select></div><div class="field"><label for="sr">Renta</label><input class="input" id="sr" name="renta" type="number" step="50000" value="1800000"></div><div class="field"><label for="srut">RUT</label><input class="input" id="srut" name="rut" value="15.678.234-0"></div></div></form>
      <div class="card" data-out></div></div>`;
    const f = v.querySelector('[data-f]'), out = v.querySelector('[data-out]');
    const fill = () => { const m = db.get('models', f.m.value); f.price.value = m.versions[0].price; f.pie.value = Math.round(m.versions[0].price * .3 / 100000) * 100000; };
    const plz = () => { const p = db.get('finProducts', f.p.value); f.n.innerHTML = plazosOf(p).map(n => `<option>${n}</option>`).join(''); };
    const run = () => { const p = db.get('finProducts', f.p.value), r = simulate({ product: p, price: +f.price.value, pie: +f.pie.value, plazo: +f.n.value }); const c = r.kind === 'leasing' ? r.cuotaIva : r.cuota; const ev = rutValid(f.rut.value) ? preEvaluate({ rut: f.rut.value, renta: +f.renta.value, cuota: c, piePct: +f.pie.value / +f.price.value * 100 }) : null;
      out.innerHTML = `<div class="big-num"><small>Cuota</small><b>${money(c)}</b><span>${r.n} cuotas · CAE ${nf1(r.cae, 2)}%</span></div><div class="sum-lines">${r.rows.map(([l, n]) => `<div class="line"><span>${l}</span><span>${money(n)}</span></div>`).join('')}<div class="line"><span>Costo total</span><span>${money(r.totalIva || r.total)}</span></div>${r.vfmg ? `<div class="line"><span>VFMG</span><span>${money(r.vfmg)}</span></div>` : ''}</div>${ev ? `<p>Carga financiera <b>${nf1(ev.load * 100)}%</b> · score <b style="color:var(--${scoreTone(ev.score)})">${ev.score}</b> · ${ev.decision}</p>` : '<p class="muted small">RUT inválido para pre-evaluar.</p>'}`; };
    f.m.onchange = () => { fill(); run(); }; f.p.onchange = () => { plz(); run(); }; f.addEventListener('input', run);
    fill(); plz(); run();
  }
  function products(v) {
    const prods = db.all('finProducts');
    v.innerHTML = `${pageHead('Productos y tasas', 'Tasas vigentes (las administra el panel). Ejemplo: $20.000.000 con 30% de pie.')}${prods.map(p => `<div class="card"><div class="card-title"><h3>${escape(p.name)}</h3>${p.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge">Inactivo</span>'}</div><p class="small muted">${escape(p.desc)} Pie mínimo ${p.minPie}%.</p><div class="table-wrap"><table class="table"><thead><tr><th>Plazo</th><th>Tasa mensual</th>${p.vfmg ? '<th>VFMG</th>' : ''}<th>Cuota ejemplo</th><th>CAE</th></tr></thead><tbody>${plazosOf(p).map(n => { const r = simulate({ product: p, price: 2e7, pie: 6e6, plazo: n }); return `<tr><td>${n} meses</td><td>${nf1(p.rates[n], 2)}%</td>${p.vfmg ? `<td>${p.vfmg[n]}%</td>` : ''}<td>${money(r.cuota)}</td><td>${nf1(r.cae, 2)}%</td></tr>`; }).join('')}</tbody></table></div></div>`).join('')}`;
  }
  function kpis(v) {
    const all = db.all('finApps'), dec = all.filter(a => a.decidedAt);
    const hrs = dec.map(a => (new Date(a.decidedAt) - new Date(a.createdAt)) / 36e5).filter(h => h >= 0);
    const by = Object.keys(FIN_STATUS).map(k => ({ label: FIN_STATUS[k][0], value: all.filter(a => a.status === k).length })).filter(x => x.value);
    const prods = db.all('finProducts').map(p => ({ label: p.name.split('(')[0], value: all.filter(a => a.productId === p.id).length }));
    const bands = [['< 530', 0, 529], ['530–649', 530, 649], ['650–749', 650, 749], ['750+', 750, 999]].map(([label, x, y]) => ({ label, value: all.filter(a => a.score >= x && a.score <= y).length }));
    v.innerHTML = `${pageHead('Indicadores de crédito', `${all.length} solicitudes en los últimos 60 días.`)}
    <div class="grid-4">${statCard('Tasa de aprobación', nf1(dec.filter(a => a.status !== 'rechazada').length / Math.max(1, dec.length) * 100) + '%', '', 'check')}${statCard('Tiempo de respuesta', nf1(hrs.reduce((a, b) => a + b, 0) / Math.max(1, hrs.length)) + ' h', '', 'clock')}${statCard('Score promedio', Math.round(all.reduce((a, b) => a + b.score, 0) / Math.max(1, all.length)), '', 'gauge')}${statCard('Monto aprobado', money(dec.filter(a => a.status !== 'rechazada').reduce((s, a) => s + a.price - a.pie, 0)), '', 'money')}</div>
    <div class="grid-2"><div class="card"><h3>Estado de las solicitudes</h3>${donut(by, { center: String(all.length) })}</div><div class="card"><h3>Distribución de score</h3>${hbars(bands, { format: x => x + ' sol.' })}<h3 style="margin-top:18px">Por producto</h3>${hbars(prods, { format: x => x + ' sol.' })}</div></div>`;
  }
  window.__credit = { analyze, fdate };
}
