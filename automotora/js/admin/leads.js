// Leads: listado, reasignación y reglas de asignación automática.
import { escape, money, toast, modal, ago, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { model, userName, showroom, stageBadge, STAGE_LABEL, SOURCE_LABEL, isOpenLead, assignSeller, addTimeline, modelLabel, brand } from '../shared/domain.js';
import { log, opts, sellerOpts, showroomOpts } from './kit.js';
import { icon } from '../shared/icons.js';

export function renderLeads(v, _p, query) {
  const tab = query.tab || 'lista';
  v.innerHTML = `${pageHead('Leads y asignación', 'Todos los prospectos del sitio, showroom, teléfono y redes. Se asignan automáticamente según las reglas.', '')}
  <nav class="tabs"><a class="tab ${tab === 'lista' ? 'active' : ''}" href="#/leads">Leads</a><a class="tab ${tab === 'reglas' ? 'active' : ''}" href="#/leads?tab=reglas">Reglas de asignación</a></nav><div data-body></div>`;
  const body = v.querySelector('[data-body]');
  if (tab === 'reglas') return rules(body);
  const open = db.query('leads', isOpenLead), unassigned = open.filter(l => !l.sellerId);
  body.innerHTML = `<div class="grid-4">${statCard('Leads abiertos', open.length, '', 'target')}${statCard('Sin asignar', unassigned.length, unassigned.length ? `<button class="btn btn-sm btn-primary" data-autoassign>Asignar ahora</button>` : '<span class="muted small">Todo asignado</span>', 'users')}${statCard('Calientes', open.filter(l => l.temp === 'caliente').length, '', 'bolt')}${statCard('Nuevos hoy', db.count('leads', l => l.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)), '', 'bell')}</div><div class="card" data-list></div>`;
  const lv = listView(body.querySelector('[data-list]'), {
    rows: () => db.all('leads').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: l => `${l.name} ${l.email || ''} ${model(l.modelId)?.name}`,
    filters: [{ key: 'stage', label: 'Etapa', options: Object.entries(STAGE_LABEL), value: query.etapa || '' }, { key: 'sellerId', label: 'Ejecutivo', options: [['', 'Sin asignar'], ...sellerOpts()].slice(1), test: (l, v) => l.sellerId === v }, { key: 'source', label: 'Origen', options: Object.entries(SOURCE_LABEL) }, { key: 'showroomId', label: 'Sucursal', options: showroomOpts() }],
    columns: [
      { key: 'name', label: 'Prospecto', render: l => ({ __raw: true, value: `<b>${escape(l.name)}</b><br><small class="muted">${escape(l.email || l.phone || '')}</small>` }) },
      { key: 'modelId', label: 'Interés', render: l => escape(modelLabel(l.modelId)) },
      { key: 'stage', label: 'Etapa', render: l => ({ __raw: true, value: stageBadge(l.stage) }) },
      { key: 'source', label: 'Origen', render: l => SOURCE_LABEL[l.source] || l.source },
      { key: 'sellerId', label: 'Ejecutivo', render: l => ({ __raw: true, value: `<select class="select inline-edit" data-act-change="assign" data-id="${l.id}" aria-label="Ejecutivo" style="max-width:170px">${opts(sellerOpts(), l.sellerId, 'Sin asignar')}</select>` }) },
      { key: 'createdAt', label: 'Creado', render: l => ago(l.createdAt) },
      { key: 'x', label: '', sort: false, render: l => ({ __raw: true, value: acts(actBtn('view', l.id, 'eye', 'Ver detalle')) }) }
    ],
    onRow: l => detail(l.id),
    onAction: (a, id, el) => {
      if (a === 'view') detail(id);
      if (a === 'assign') { const l = db.get('leads', id); db.update('leads', id, { sellerId: el.value || null }); addTimeline(id, 'sistema', `Reasignado a ${el.value ? userName(el.value) : 'nadie'} por gerencia.`); log('lead', `${l.name} → ${userName(el.value)}`); toast('Lead reasignado', 'success'); }
    },
    csv: { name: 'leads.csv', map: l => ({ nombre: l.name, email: l.email, telefono: l.phone, modelo: modelLabel(l.modelId), etapa: STAGE_LABEL[l.stage], origen: SOURCE_LABEL[l.source] || l.source, ejecutivo: userName(l.sellerId), sucursal: showroom(l.showroomId)?.city, creado: l.createdAt.slice(0, 10) }) }
  });
  body.querySelector('[data-autoassign]')?.addEventListener('click', () => {
    let n = 0; db.query('leads', l => isOpenLead(l) && !l.sellerId).forEach(l => { const s = assignSeller(l.showroomId, model(l.modelId)?.brandId); if (s) { db.update('leads', l.id, { sellerId: s }); addTimeline(l.id, 'sistema', `Asignado automáticamente a ${userName(s)}.`); n++; } });
    log('lead', `${n} leads asignados automáticamente`); toast(`${n} leads asignados`, 'success'); lv.refresh();
  });
}

export function detail(id) {
  const l = db.get('leads', id), m = model(l.modelId);
  modal({ title: l.name, size: 'lg', body: `<div class="grid-2"><dl class="kv"><dt>Interés</dt><dd>${escape(modelLabel(l.modelId, l.versionId))}</dd><dt>Etapa</dt><dd>${stageBadge(l.stage)}</dd><dt>Ejecutivo</dt><dd>${escape(userName(l.sellerId))}</dd><dt>Sucursal</dt><dd>${escape(showroom(l.showroomId)?.city || '')}</dd><dt>Origen</dt><dd>${escape(SOURCE_LABEL[l.source] || l.source)}</dd><dt>Contacto</dt><dd>${escape(l.email || '')}<br>${escape(l.phone || '')}</dd>${l.lostReason ? `<dt>Motivo pérdida</dt><dd>${escape(l.lostReason)}</dd>` : ''}<dt>Valor</dt><dd>${money(l.value)}</dd></dl>
    <div><h4>Historial</h4>${(l.timeline || []).length ? `<ol class="timeline">${l.timeline.slice().reverse().map(t => `<li class="k-${t.kind}"><b>${escape(t.text)}</b><small>${dateTime(t.at)}${t.by ? ' · ' + escape(userName(t.by)) : ''}</small></li>`).join('')}</ol>` : '<p class="muted small">Historial archivado.</p>'}</div></div>`,
    foot: `<a class="btn" href="vendedor.html#/lead/${l.id}">${icon('kanban', 16)} Abrir en app ventas</a><button class="btn btn-primary" data-close>Cerrar</button>` });
}

function rules(body) {
  const r = db.getValue('leadRules', {});
  const sellers = db.query('users', u => u.role === 'vendedor');
  body.innerHTML = `<div class="grid-main"><form class="card stack" data-form><h3>Asignación automática</h3>
    <label class="check"><input type="checkbox" name="autoAssign" ${r.autoAssign !== false ? 'checked' : ''}> Asignar automáticamente los leads del sitio web</label>
    <div class="field"><label for="r-mode">Método</label><select class="select" id="r-mode" name="mode">${opts([['round_robin', 'Rotativo (round robin) por sucursal'], ['carga', 'Al ejecutivo con menos leads abiertos'], ['manual', 'Manual (gerencia asigna)']], r.mode)}</select></div>
    <label class="check"><input type="checkbox" name="preferBrandSpecialist" ${r.preferBrandSpecialist ? 'checked' : ''}> Priorizar especialistas de marca (ej. BMW/Volvo)</label>
    <div class="form-grid"><div class="field"><label for="r-max">Máximo de leads abiertos por ejecutivo</label><input class="input" id="r-max" name="maxOpen" type="number" min="1" value="${r.maxOpen || 30}"></div><div class="field"><label for="r-sla">SLA primer contacto (horas)</label><input class="input" id="r-sla" name="slaHours" type="number" min="1" value="${r.slaHours || 2}"></div></div>
    <button class="btn btn-primary">Guardar reglas</button></form>
    <div class="card"><h3>Ejecutivos</h3><div class="table-wrap"><table class="table"><thead><tr><th>Ejecutivo</th><th>Sucursal</th><th>Abiertos</th><th>Especialidad</th></tr></thead><tbody>${sellers.map(u => `<tr><td><b>${escape(u.name)}</b>${u.active === false ? ' <span class="badge badge-danger">inactivo</span>' : ''}</td><td>${escape(showroom(u.showroomId)?.city || '')}</td><td>${db.count('leads', l => l.sellerId === u.id && isOpenLead(l))}</td><td><select class="select inline-edit" data-spec="${u.id}" aria-label="Especialidad">${opts([['', 'Todas las marcas'], ...db.all('brands').map(b => [b.id, 'Solo ' + b.name])], u.brands?.[0] || '')}</select></td></tr>`).join('')}</tbody></table></div></div></div>`;
  body.querySelector('[data-form]').onsubmit = e => { e.preventDefault(); const f = e.target; const n = { ...r, autoAssign: f.autoAssign.checked, mode: f.mode.value, preferBrandSpecialist: f.preferBrandSpecialist.checked, maxOpen: +f.maxOpen.value || 30, slaHours: +f.slaHours.value || 2 }; db.setValue('leadRules', n); log('reglas', `Asignación: ${n.mode}${n.autoAssign ? '' : ' (desactivada)'}`); toast('Reglas guardadas', 'success'); };
  body.querySelectorAll('[data-spec]').forEach(s => s.onchange = () => { db.update('users', s.dataset.spec, { brands: s.value ? [s.value] : [] }); log('reglas', `Especialidad de ${userName(s.dataset.spec)}: ${s.value ? brand(s.value).name : 'todas'}`); toast('Especialidad actualizada', 'success'); });
}
