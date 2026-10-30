// Sitios y zonas: CRUD con vista previa del plano.
import { db } from '../data/db.js';
import { toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { value, status } from '../shared/sim.js';
import { siteMap } from '../shared/viz.js';
import { pageHead, table, csv, selectFilter, siteName } from '../shared/common.js';

const st = { site: '' };
export function render(el, ctx) {
  const w = ctx.canWrite, u = ctx.user;
  const sites = db.all('sites');
  if (!st.site || !db.get('sites', st.site)) st.site = sites[0]?.id || '';
  const preview = db.get('sites', st.site);
  const zones = db.query('zones', z => !st.site || z.siteId === st.site);
  el.innerHTML = pageHead('Sitios y zonas', 'Define los centros, plantas y sus zonas. Las zonas se dibujan en el mapa (lienzo de 1000 × 600).', w ? '<button class="btn btn-sm" data-newsite>+ Sitio</button><button class="btn btn-sm btn-primary" data-newzone>+ Zona</button>' : '', !w) + h`
  <div class="table-wrap"><table class="table"><thead><tr><th>Sitio</th><th>Tipo</th><th>Ubicación</th><th>Zonas</th><th>Sensores</th><th></th></tr></thead><tbody>
    ${sites.map(s => h`<tr class="clickable" data-pick="${s.id}"><td><b>${s.name}</b>${s.id === st.site ? raw(' <span class="badge badge-primary">en vista</span>') : ''}</td><td>${s.kind === 'cultivo' ? 'Centro de cultivo' : 'Planta'}</td><td>${s.location}<br><span class="small muted mono">${s.coords}</span></td><td>${db.count('zones', z => z.siteId === s.id)}</td><td>${db.count('devices', d => d.siteId === s.id)}</td>
    <td class="right nowrap">${w ? raw(`<button class="btn btn-sm btn-ghost" data-esite="${s.id}">Editar</button><button class="btn btn-sm btn-ghost" data-dsite="${s.id}" aria-label="Eliminar">🗑</button>`) : ''}</td></tr>`)}
  </tbody></table></div>
  <div class="grid-2" style="align-items:start">
    <section class="card stack"><div class="row between"><h3 style="margin:0">Zonas</h3><div style="min-width:200px">${raw(selectFilter('zs', 'Sitio', sites.map(s => [s.id, s.name]), st.site))}</div></div><div data-t></div></section>
    <section class="card stack"><h3 style="margin:0">Plano · ${preview?.name || '—'}</h3>${preview ? raw(siteMap(preview, zones.filter(z => z.siteId === preview.id), db.query('devices', d => d.siteId === preview.id), d => status(d, value(d)))) : ''}</section>
  </div>`;
  table(el.querySelector('[data-t]'), {
    rows: zones.map(z => ({ ...z, siteN: siteName(z.siteId), n: db.count('devices', d => d.zoneId === z.id) })), pageSize: 8, search: z => `${z.name} ${z.kind}`,
    columns: [{ key: 'name', label: 'Zona', render: z => h`<b>${z.name}</b><br><span class="small muted">${z.siteN}</span>` }, { key: 'kind', label: 'Tipo' }, { key: 'n', label: 'Sensores' }, { key: 'geo', label: 'Geometría', sort: false, render: z => h`<span class="small mono">${z.shape} ${z.x},${z.y} ${z.w}×${z.h}</span>` },
      { key: 'act', label: '', sort: false, render: z => w ? raw(`<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-ezone="${z.id}">Editar</button><button class="btn btn-sm btn-ghost" data-dzone="${z.id}" aria-label="Eliminar">🗑</button></span>`) : '' }],
  });
  el.querySelectorAll('[data-pick]').forEach(tr => tr.addEventListener('click', e => { if (e.target.closest('button')) return; st.site = tr.dataset.pick; ctx.refresh(); }));
  el.querySelector('#zs').onchange = e => { st.site = e.target.value; ctx.refresh(); };
  el.querySelector('[data-t]').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !w) return; if (b.dataset.ezone) zoneForm(db.get('zones', b.dataset.ezone), u); if (b.dataset.dzone) delZone(b.dataset.dzone, u); });
  if (!w) return;
  const siteForm = async s => {
    const v = await formModal({ title: s ? 'Editar sitio' : 'Nuevo sitio', fields: [{ name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'kind', label: 'Tipo', type: 'select', options: [['cultivo', 'Centro de cultivo (mar)'], ['planta', 'Planta en tierra']], value: s?.kind }, { name: 'location', label: 'Ubicación', required: true, value: s?.location }, { name: 'coords', label: 'Coordenadas', value: s?.coords || '-41.47, -72.94' }] });
    if (!v) return;
    if (s) db.update('sites', s.id, v); else { const n = db.insert('sites', { ...v, active: true }); st.site = n.id; }
    db.log('sitio', `${u.name} ${s ? 'editó' : 'creó'} el sitio "${v.name}"`, u.id); toast('Sitio guardado', 'success');
  };
  el.querySelector('[data-newsite]').onclick = () => siteForm();
  el.querySelector('[data-newzone]').onclick = () => zoneForm(null, u);
  el.querySelectorAll('[data-esite]').forEach(b => b.onclick = () => siteForm(db.get('sites', b.dataset.esite)));
  el.querySelectorAll('[data-dsite]').forEach(b => b.onclick = async () => {
    const s = db.get('sites', b.dataset.dsite);
    if (db.count('devices', d => d.siteId === s.id)) return toast('El sitio tiene dispositivos: muévelos o elimínalos primero', 'warning');
    if (!(await confirm(`¿Eliminar "${s.name}" y sus zonas?`, { title: 'Eliminar sitio', ok: 'Eliminar', danger: true }))) return;
    db.query('zones', z => z.siteId === s.id).forEach(z => db.remove('zones', z.id)); db.remove('sites', s.id);
    db.log('sitio', `${u.name} eliminó el sitio "${s.name}"`, u.id); toast('Sitio eliminado', 'info');
  });
}

async function zoneForm(z, u) {
  const v = await formModal({ title: z ? 'Editar zona' : 'Nueva zona', fields: [
    { name: 'name', label: 'Nombre', required: true, value: z?.name }, { name: 'siteId', label: 'Sitio', type: 'select', options: db.all('sites').map(s => [s.id, s.name]), value: z?.siteId || st.site },
    { name: 'kind', label: 'Tipo', type: 'select', options: ['jaula', 'ponton', 'proceso', 'frio', 'maquinas', 'electrica', 'riles', 'apoyo'], value: z?.kind },
    { name: 'shape', label: 'Forma', type: 'select', options: [['rect', 'Rectángulo'], ['circle', 'Círculo (x,y = centro; ancho = diámetro)']], value: z?.shape || 'rect' },
    { name: 'x', label: 'X (0–1000)', type: 'number', value: z?.x ?? 100 }, { name: 'y', label: 'Y (0–600)', type: 'number', value: z?.y ?? 100 },
    { name: 'w', label: 'Ancho', type: 'number', value: z?.w ?? 200 }, { name: 'h', label: 'Alto', type: 'number', value: z?.h ?? 120 }] });
  if (!v) return;
  if (v.x < 0 || v.x > 1000 || v.y < 0 || v.y > 600 || v.w < 20 || v.h < 20) return toast('Geometría fuera del lienzo 1000 × 600', 'warning');
  if (z) db.update('zones', z.id, v); else db.insert('zones', v);
  st.site = v.siteId;
  db.log('zona', `${u.name} ${z ? 'editó' : 'creó'} la zona "${v.name}"`, u.id); toast('Zona guardada', 'success');
}
async function delZone(id, u) {
  const z = db.get('zones', id);
  if (db.count('devices', d => d.zoneId === id)) return toast('La zona tiene dispositivos asignados', 'warning');
  if (!(await confirm(`¿Eliminar la zona "${z.name}"?`, { title: 'Eliminar zona', ok: 'Eliminar', danger: true }))) return;
  db.remove('zones', id); db.log('zona', `${u.name} eliminó la zona "${z.name}"`, u.id); toast('Zona eliminada', 'info');
}
void csv;
