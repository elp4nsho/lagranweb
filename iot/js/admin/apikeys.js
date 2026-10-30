// Claves API (ficticias): crear, ver una sola vez, revocar.
import { db, userName } from '../data/db.js';
import { date, ago, toast, formModal, confirm, modal } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead } from '../shared/common.js';

const SCOPES = ['telemetria:leer', 'alarmas:leer', 'alarmas:escribir', 'dispositivos:leer', 'dispositivos:escribir', 'energia:leer'];
export function render(el, ctx) {
  const w = ctx.canWrite, u = ctx.user;
  const keys = db.all('apiKeys').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = pageHead('Claves API', 'Credenciales para integrar Sentinela con SCADA, ERP o BI. (Simuladas: no hay API real.)', w ? '<button class="btn btn-sm btn-primary" data-new>+ Nueva clave</button>' : '', !w) + h`
  <div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Clave</th><th>Permisos</th><th>Creada</th><th>Último uso</th><th>Estado</th><th></th></tr></thead><tbody>
  ${keys.map(k => h`<tr><td><b>${k.name}</b><br><span class="small muted">por ${userName(k.createdBy)}</span></td><td class="mono">${k.prefix}••••••••</td><td>${k.scopes.map(s => h`<span class="badge plain" style="margin:2px">${s}</span>`)}</td><td>${date(k.createdAt)}</td><td>${k.lastUsed ? ago(k.lastUsed) : 'nunca'}</td><td>${raw(k.active ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-danger">Revocada</span>')}</td><td class="right">${w && k.active ? raw(`<button class="btn btn-sm btn-ghost" data-revoke="${k.id}">Revocar</button>`) : ''}</td></tr>`)}
  </tbody></table></div>
  <section class="card"><h3>Ejemplo de uso</h3><pre class="key-box" style="white-space:pre-wrap;margin:0">curl https://api.sentinela.demo/v1/devices/OXI-104/telemetry?range=1h \\
  -H "Authorization: Bearer snt_live_…"</pre></section>`;
  if (!w) return;
  el.querySelector('[data-new]').onclick = async () => {
    const v = await formModal({ title: 'Nueva clave API', fields: [{ name: 'name', label: 'Nombre de la integración', required: true }, ...SCOPES.map(s => ({ name: s, label: s, type: 'checkbox', value: s.endsWith(':leer') && s.startsWith('telemetria') }))] });
    if (!v) return;
    const scopes = SCOPES.filter(s => v[s]);
    if (!scopes.length) return toast('Elige al menos un permiso', 'warning');
    const secret = 'snt_live_' + Array.from({ length: 32 }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('');
    db.insert('apiKeys', { name: v.name, prefix: secret.slice(0, 13), scopes, createdBy: u.id, lastUsed: null, active: true });
    db.log('api', `${u.name} creó la clave API "${v.name}"`, u.id);
    modal({ title: 'Copia tu clave ahora', body: `<div class="stack"><p class="muted" style="margin:0">Por seguridad no volveremos a mostrarla.</p><div class="key-box">${secret}</div></div>`, foot: '<button class="btn btn-primary" data-close>Entendido</button>' });
  };
  el.querySelectorAll('[data-revoke]').forEach(b => b.onclick = async () => { const k = db.get('apiKeys', b.dataset.revoke); if (!(await confirm(`Las integraciones que usen "${k.name}" dejarán de funcionar.`, { title: 'Revocar clave', ok: 'Revocar', danger: true }))) return; db.update('apiKeys', k.id, { active: false }); db.log('api', `${u.name} revocó la clave "${k.name}"`, u.id); toast('Clave revocada', 'info'); });
}
