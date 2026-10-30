// Aprovisionamiento de dispositivos: alta con tipo, zona y posición en el mapa (clic), edición y baja.
import { db } from '../data/db.js';
import { toast, confirm, modal, date, escape } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, value, status } from '../shared/sim.js';
import { siteMap, svgPoint } from '../shared/viz.js';
import { pageHead, table, csv, selectFilter, zoneName, siteName, stBadge } from '../shared/common.js';

const st = { site: '', type: '', status: '' };
const MODELS = { temperatura: 'SNT-T200', oxigeno: 'SNT-DO5 óptico', ph: 'SNT-PH3', energia: 'SNT-EM40 trifásico', vibracion: 'SNT-VX1 triaxial' };
const DEFAULTS = { temperatura: { base: 11.5, amp: .5, noise: .15, tag: 'agua' }, oxigeno: { base: 8.1, amp: .45, noise: .18, tag: 'agua' }, ph: { base: 7.6, amp: .1, noise: .05, tag: 'agua' }, energia: { base: 90, amp: 15, noise: 4, tag: 'general' }, vibracion: { base: 2.8, amp: .4, noise: .3, tag: 'motor' } };
const PREFIX = { temperatura: 'TMP', oxigeno: 'OXI', ph: 'PH', energia: 'ENE', vibracion: 'VIB' };

export function render(el, ctx) {
  const w = ctx.canWrite, u = ctx.user;
  const rows = db.all('devices').filter(d => (!st.site || d.siteId === st.site) && (!st.type || d.type === st.type) && (!st.status || d.status === st.status))
    .map(d => ({ ...d, zone: zoneName(d.zoneId), siteN: siteName(d.siteId), live: status(d, value(d)) }));
  el.innerHTML = pageHead('Aprovisionamiento', 'Alta, edición y baja de sensores. La posición se define haciendo clic en el plano.', `<button class="btn btn-sm" data-csv>⬇ CSV</button>${w ? '<button class="btn btn-sm btn-primary" data-new>+ Agregar dispositivo</button>' : ''}`, !w) +
    `<div class="card filters">${selectFilter('fs', 'Sitio', db.all('sites').map(s => [s.id, s.name]), st.site)}${selectFilter('ft', 'Tipo', Object.entries(TYPES).map(([k, t]) => [k, t.label]), st.type)}${selectFilter('fe', 'Estado administrativo', [['activo', 'Activo'], ['mantenimiento', 'Mantenimiento'], ['inactivo', 'Inactivo']], st.status)}</div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, pageSize: 12, search: d => `${d.code} ${d.name} ${d.zone} ${d.model}`,
    columns: [
      { key: 'code', label: 'Código', render: d => h`<b class="mono">${d.code}</b>` },
      { key: 'name', label: 'Nombre', render: d => h`${TYPES[d.type].icon} ${d.name}<br><span class="small muted">${d.model}</span>` },
      { key: 'zone', label: 'Zona', render: d => h`${d.zone}<br><span class="small muted">${d.siteN}</span>` },
      { key: 'installedAt', label: 'Alta', render: d => date(d.installedAt) },
      { key: 'status', label: 'Estado', render: d => h`${d.status}<br>${raw(stBadge(d.live))}` },
      { key: 'act', label: '', sort: false, render: d => w ? raw(`<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-edit="${d.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${d.id}" aria-label="Dar de baja">🗑</button></span>`) : '' },
    ],
  });
  [['#fs', 'site'], ['#ft', 'type'], ['#fe', 'status']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; ctx.refresh(); });
  el.querySelector('[data-csv]').onclick = () => csv('aprovisionamiento-sentinela.csv', rows.map(d => ({ codigo: d.code, nombre: d.name, tipo: d.type, modelo: d.model, sitio: d.siteN, zona: d.zone, x: d.x, y: d.y, firmware: d.firmware, estado: d.status, alta: d.installedAt })));
  if (!w) return;
  el.querySelector('[data-new]').onclick = () => form(null, u);
  el.querySelector('[data-t]').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) form(db.get('devices', b.dataset.edit), u);
    if (b.dataset.del) {
      const d = db.get('devices', b.dataset.del);
      if (!(await confirm(`¿Dar de baja "${d.name}" (${d.code})? Se eliminará de la flota y sus reglas específicas dejarán de aplicar.`, { title: 'Dar de baja', ok: 'Dar de baja', danger: true }))) return;
      db.remove('devices', d.id); db.log('dispositivo', `${u.name} dio de baja ${d.code} · ${d.name}`, u.id); toast('Dispositivo dado de baja', 'info');
    }
  });
}

function form(d, u) {
  const sites = db.all('sites');
  if (!sites.length) return toast('Primero crea un sitio', 'warning');
  const s = { siteId: d?.siteId || st.site || sites[0].id, pos: d ? { x: d.x, y: d.y } : null };
  const m = modal({
    title: d ? `Editar ${d.code}` : 'Agregar dispositivo', size: 'lg',
    body: `<form class="stack" novalidate>
      <div class="grid-2">
        <div class="field"><label for="dn">Nombre</label><input class="input" id="dn" name="name" value="${escape(d?.name || '')}" placeholder="Ej: Oxígeno disuelto J9"></div>
        <div class="field"><label for="dt">Tipo de sensor</label><select class="select" id="dt" name="type" ${d ? 'disabled' : ''}>${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${d?.type === k ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}</select></div>
        <div class="field"><label for="ds">Sitio</label><select class="select" id="ds" name="siteId">${sites.map(x => `<option value="${x.id}" ${s.siteId === x.id ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="dz">Zona</label><select class="select" id="dz" name="zoneId"></select></div>
        <div class="field"><label for="de">Estado</label><select class="select" id="de" name="status">${['activo', 'mantenimiento', 'inactivo'].map(x => `<option ${d?.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label for="dg">Grupo (para reglas)</label><select class="select" id="dg" name="tag">${['agua', 'camara', 'linea', 'motor', 'riles', 'general', 'generador', 'proceso', 'frio'].map(x => `<option ${d?.tag === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Posición en el plano <span class="muted" data-pos></span></label><div class="placer" data-map></div><small class="muted">Haz clic en el plano para ubicar el sensor.</small></div>
    </form>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>${d ? 'Guardar cambios' : 'Aprovisionar'}</button>`,
  });
  const f = m.el.querySelector('form').elements;
  if (!d) f.tag.value = DEFAULTS[f.type.value].tag;
  const paint = () => {
    const site = db.get('sites', s.siteId);
    const zones = db.query('zones', z => z.siteId === s.siteId);
    const zSel = f.zoneId, cur = zSel.value || d?.zoneId;
    zSel.innerHTML = zones.map(z => `<option value="${z.id}" ${z.id === cur ? 'selected' : ''}>${escape(z.name)}</option>`).join('') || '<option value="">(sin zonas)</option>';
    m.el.querySelector('[data-map]').innerHTML = siteMap(site, zones, db.query('devices', x => x.siteId === s.siteId && x.id !== d?.id), x => status(x, value(x)), { placing: s.pos });
    m.el.querySelector('[data-pos]').textContent = s.pos ? `(${s.pos.x}, ${s.pos.y})` : '(sin definir)';
  };
  paint();
  f.siteId.onchange = () => { s.siteId = f.siteId.value; s.pos = null; f.zoneId.value = ''; paint(); };
  f.type.onchange = () => { f.tag.value = DEFAULTS[f.type.value].tag; };
  m.el.querySelector('[data-map]').addEventListener('click', e => {
    const svg = e.currentTarget.querySelector('svg'); if (!svg) return;
    s.pos = svgPoint(svg, e);
    // Sugerir la zona que contiene el punto.
    const z = db.query('zones', z => z.siteId === s.siteId).find(z => z.shape === 'circle' ? Math.hypot(z.x - s.pos.x, z.y - s.pos.y) <= z.w / 2 : s.pos.x >= z.x && s.pos.x <= z.x + z.w && s.pos.y >= z.y && s.pos.y <= z.y + z.h);
    if (z) f.zoneId.value = z.id;
    paint();
  });
  m.el.querySelector('[data-save]').onclick = () => {
    const name = f.name.value.trim(), type = d?.type || f.type.value;
    if (!name) return toast('Ingresa un nombre', 'warning');
    if (!f.zoneId.value) return toast('Selecciona una zona (crea una en Sitios y zonas)', 'warning');
    if (!s.pos) return toast('Haz clic en el plano para ubicar el sensor', 'warning');
    const patch = { name, siteId: s.siteId, zoneId: f.zoneId.value, status: f.status.value, tag: f.tag.value, x: s.pos.x, y: s.pos.y };
    m.close();
    if (d) { db.update('devices', d.id, patch); db.log('dispositivo', `${u.name} editó ${d.code} · ${name}`, u.id); toast('Dispositivo actualizado', 'success'); return; }
    const n = 100 + db.count('devices') + 1 + Math.floor(Math.random() * 900);
    const latest = db.all('firmware').filter(x => x.channel === 'estable').sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]?.version || '2.4.2';
    const nd = db.insert('devices', { ...patch, type, code: `${PREFIX[type]}-${n}`, model: MODELS[type], firmware: latest, battery: type === 'energia' ? null : 100, installedAt: new Date().toISOString(), offline: false, phase: Math.random() * 6, period: 900, anomaly: null, ...DEFAULTS[type], ...(type === 'temperatura' ? { base: { camara: -19, linea: 5, proceso: 14 }[patch.tag] ?? 11.5 } : {}), tag: patch.tag });
    db.log('dispositivo', `${u.name} aprovisionó ${nd.code} · ${name} en ${zoneName(nd.zoneId)}`, u.id);
    toast(`${nd.code} aprovisionado y transmitiendo`, 'success');
  };
}
