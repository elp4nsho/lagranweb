// Firmware: versiones publicadas y despliegues OTA simulados con progreso por dispositivo.
import { db, userName } from '../data/db.js';
import { date, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES } from '../shared/sim.js';
import { pageHead, siteName } from '../shared/common.js';

const prog = (it, now = Date.now()) => {
  const p = Math.max(0, Math.min(1, (now - new Date(it.startAt).getTime() - it.offset) / it.dur));
  if (it.fail && p >= .62) return { p: .62, state: 'error' };
  return { p, state: p >= 1 ? 'ok' : p > 0 ? 'instalando' : 'en cola' };
};

// Avanza los despliegues en curso (se llama cada segundo desde el panel).
export function processRollouts() {
  const now = Date.now();
  db.query('rollouts', r => r.status === 'en curso').forEach(r => {
    let changed = false;
    const items = r.items.map(it => {
      const { state } = prog(it, now);
      if (state === 'ok' && !it.done) { const d = db.get('devices', it.deviceId); if (d) db.update('devices', d.id, { firmware: r.version }); changed = true; return { ...it, done: true }; }
      if (state === 'error' && !it.errored) { changed = true; return { ...it, errored: true }; }
      return it;
    });
    const finished = items.every(it => it.done || it.errored);
    if (changed || finished) {
      const failed = items.filter(it => it.errored).length;
      db.update('rollouts', r.id, { items, ...(finished ? { status: failed ? 'completado con errores' : 'completado', finishedAt: new Date().toISOString() } : {}) });
      if (finished) db.log('firmware', `Despliegue ${r.version} terminado: ${items.length - failed} OK, ${failed} con error`, r.by);
    }
  });
}

export function render(el, ctx) {
  const w = ctx.canWrite, u = ctx.user;
  const fws = db.all('firmware').sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  const rollouts = db.all('rollouts').sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const running = rollouts.find(r => r.status === 'en curso');
  const devs = db.all('devices');
  el.innerHTML = pageHead('Firmware', 'Publica versiones y despliégalas por aire (OTA) a la flota. El progreso es simulado.', w ? `<button class="btn btn-sm" data-newfw>+ Publicar versión</button><button class="btn btn-sm btn-primary" data-roll ${running ? 'disabled title="Hay un despliegue en curso"' : ''}>⬆ Nuevo despliegue</button>` : '', !w) + h`
  ${running ? raw(h`<section class="card stack" data-running="${running.id}"><div class="row between"><h3 style="margin:0">Desplegando v${running.version}</h3><span class="small muted">iniciado ${ago(running.startedAt)} por ${userName(running.by)}</span></div>
    <div class="progress"><i data-total style="--v:0%"></i></div><span class="small muted" data-summary></span>
    <div data-items style="max-height:360px;overflow:auto">${running.items.map(it => { const d = db.get('devices', it.deviceId); return h`<div class="rollout-dev" data-it="${it.deviceId}"><span><b>${d?.name || it.deviceId}</b> <span class="small muted mono">${d?.code || ''}</span></span><div class="progress"><i style="--v:0%"></i></div><span class="st small"></span></div>`; })}</div>
    ${w ? raw('<div class="row"><button class="btn btn-sm btn-danger" data-cancel>Cancelar despliegue</button></div>') : ''}</section>`) : ''}
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Versiones</h3><div class="table-wrap"><table class="table"><thead><tr><th>Versión</th><th>Canal</th><th>Publicada</th><th>Equipos</th></tr></thead><tbody>
      ${fws.map(f => h`<tr><td><b class="mono">v${f.version}</b><br><span class="small muted">${f.notes}</span></td><td>${raw(f.channel === 'beta' ? '<span class="badge badge-warning">beta</span>' : '<span class="badge badge-success">estable</span>')}</td><td>${date(f.releasedAt)}</td><td>${devs.filter(d => d.firmware === f.version).length}</td></tr>`)}
    </tbody></table></div></section>
    <section class="card"><h3>Historial de despliegues</h3><ul class="list">${rollouts.map(r => { const failed = (r.items || []).filter(i => i.errored).length, total = r.items?.length || r.deviceIds?.length || 0; return h`<li><span class="ic">⬆</span><span class="main"><b>v${r.version} · ${total} equipos</b><small>${date(r.startedAt)} · ${userName(r.by)}${failed ? ` · ${failed} con error` : ''}</small></span>${raw(`<span class="badge badge-${r.status === 'completado' ? 'success' : r.status === 'en curso' ? 'info' : r.status === 'cancelado' ? 'primary' : 'warning'}">${r.status}</span>`)}${w && failed && r.status !== 'en curso' && !running ? raw(`<button class="btn btn-sm" data-retry="${r.id}">Reintentar</button>`) : ''}</li>`; })}</ul></section>
  </div>`;

  if (running) {
    const paint = () => {
      const r = db.get('rollouts', running.id); if (!r || r.status !== 'en curso') return;
      let sum = 0, ok = 0, err = 0;
      r.items.forEach(it => {
        const { p, state } = prog(it); sum += p; if (state === 'ok') ok++; if (state === 'error') err++;
        const row = el.querySelector(`[data-it="${it.deviceId}"]`); if (!row) return;
        row.querySelector('i').style.setProperty('--v', `${Math.round(p * 100)}%`);
        row.querySelector('.st').innerHTML = state === 'ok' ? '<span class="badge badge-success">✓ instalado</span>' : state === 'error' ? '<span class="badge badge-danger">error de verificación</span>' : `${state} ${Math.round(p * 100)}%`;
      });
      el.querySelector('[data-total]').style.setProperty('--v', `${Math.round(sum / r.items.length * 100)}%`);
      el.querySelector('[data-summary]').textContent = `${ok} instalados · ${err} con error · ${r.items.length - ok - err} pendientes`;
    };
    paint(); ctx.every(paint);
  }
  if (!w) return;
  el.querySelector('[data-newfw]').onclick = async () => {
    const v = await formModal({ title: 'Publicar versión de firmware', fields: [{ name: 'version', label: 'Versión (semver)', required: true, placeholder: '2.5.0' }, { name: 'channel', label: 'Canal', type: 'select', options: ['estable', 'beta'] }, { name: 'notes', label: 'Notas de la versión', type: 'textarea', required: true }] });
    if (!v) return;
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v.version)) return toast('Usa formato semver, ej: 2.5.0', 'warning');
    if (db.find('firmware', f => f.version === v.version)) return toast('Esa versión ya existe', 'error');
    db.insert('firmware', { ...v, releasedAt: new Date().toISOString() }); db.log('firmware', `${u.name} publicó firmware v${v.version} (${v.channel})`, u.id); toast('Versión publicada', 'success');
  };
  el.querySelector('[data-roll]').onclick = async () => {
    const v = await formModal({ title: 'Nuevo despliegue OTA', fields: [
      { name: 'version', label: 'Versión a instalar', type: 'select', options: fws.map(f => [f.version, `v${f.version} (${f.channel})`]) },
      { name: 'type', label: 'Tipo de sensor', type: 'select', options: [['', 'Todos'], ...Object.entries(TYPES).map(([k, t]) => [k, t.label])] },
      { name: 'site', label: 'Sitio', type: 'select', options: [['', 'Todos'], ...db.all('sites').map(s => [s.id, s.name])] },
      { name: 'canary', label: 'Despliegue canario (solo 3 equipos primero)', type: 'checkbox' }], submit: 'Iniciar despliegue' });
    if (!v) return;
    let targets = devs.filter(d => d.firmware !== v.version && !d.offline && d.status !== 'inactivo' && (!v.type || d.type === v.type) && (!v.site || d.siteId === v.site));
    if (v.canary) targets = targets.slice(0, 3);
    if (!targets.length) return toast('No hay equipos en línea que necesiten esa versión', 'info');
    if (!(await confirm(`Se instalará v${v.version} en ${targets.length} equipo(s) de ${v.site ? siteName(v.site) : 'todos los sitios'}. Los equipos se reiniciarán.`, { title: 'Confirmar despliegue', ok: 'Desplegar' }))) return;
    start(v.version, targets.map(d => d.id), u);
  };
  el.querySelector('[data-cancel]')?.addEventListener('click', async () => {
    if (!(await confirm('Los equipos que no terminaron conservarán su versión actual.', { title: 'Cancelar despliegue', ok: 'Cancelar despliegue', danger: true }))) return;
    db.update('rollouts', running.id, { status: 'cancelado', finishedAt: new Date().toISOString() }); db.log('firmware', `${u.name} canceló el despliegue v${running.version}`, u.id); toast('Despliegue cancelado', 'info');
  });
  el.querySelectorAll('[data-retry]').forEach(b => b.onclick = () => { const r = db.get('rollouts', b.dataset.retry); start(r.version, r.items.filter(i => i.errored).map(i => i.deviceId), u, true); });
}

function start(version, ids, u, retry = false) {
  const startAt = new Date().toISOString();
  const items = ids.map((id, i) => ({ deviceId: id, startAt, offset: i * 900 + Math.round(Math.random() * 600), dur: 5000 + Math.round(Math.random() * 6000), fail: !retry && ids.length > 3 && i % 7 === 5 }));
  db.insert('rollouts', { version, items, deviceIds: ids, by: u.id, startedAt: startAt, status: 'en curso' });
  db.log('firmware', `${u.name} inició ${retry ? 'reintento de ' : ''}despliegue v${version} en ${ids.length} equipo(s)`, u.id);
  toast('Despliegue iniciado', 'success');
}
