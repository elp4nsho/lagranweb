// Perfil y seguridad: datos personales, cambio de clave y dispositivos conectados.
import { db } from '../data/db.js';
import { ago, toast, confirm, formModal, date } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge } from '../shared/bank.js';
import { pageHead, otpFlow } from './common.js';

export function render(el, { user }) {
  const devices = db.query('devices', d => d.userId === user.id).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  const pref = user.prefs || { loginAlerts: true, txAlerts: true, marketing: false };
  el.innerHTML = h`${raw(pageHead('Perfil y seguridad'))}
  <div class="grid-2" style="align-items:start">
    <section class="card stack"><div class="row between"><h3 style="margin:0">Mis datos</h3><button class="btn btn-sm" data-edit>Editar</button></div>
      <dl class="kv"><dt>Nombre</dt><dd>${user.name}</dd><dt>RUT</dt><dd>${user.rut}</dd><dt>Correo</dt><dd>${user.email}</dd><dt>Celular</dt><dd>${user.phone}</dd><dt>Comuna</dt><dd>${user.comuna}</dd><dt>Ocupación</dt><dd>${user.job}</dd><dt>Segmento</dt><dd>${user.segment}</dd><dt>Estado KYC</dt><dd>${raw(badge(user.kyc))}</dd><dt>Cliente desde</dt><dd>${date(user.createdAt)}</dd></dl>
    </section>
    <div class="stack">
      <section class="card stack"><h3 style="margin:0">Clave de acceso</h3><p class="small muted" style="margin:0">Te recomendamos cambiarla cada 6 meses.${user.pwChangedAt ? ' Último cambio: ' + date(user.pwChangedAt) + '.' : ''}</p><button class="btn" data-pw>🔑 Cambiar clave</button></section>
      <section class="card stack"><h3 style="margin:0">Alertas</h3>
        ${[['loginAlerts', 'Avisarme de nuevos inicios de sesión'], ['txAlerts', 'Avisarme de cada compra y transferencia'], ['marketing', 'Recibir ofertas y novedades']].map(([k, l]) => h`<label class="row between" style="flex-wrap:nowrap"><span>${l}</span><span class="switch"><input type="checkbox" data-pref="${k}" ${pref[k] ? 'checked' : ''}><span></span></span></label>`)}
      </section>
    </div>
  </div>
  <section class="card"><div class="row between"><h3 style="margin:0">Dispositivos conectados</h3>${devices.length > 1 ? raw('<button class="btn btn-sm btn-danger" data-out-all>Cerrar las demás sesiones</button>') : ''}</div>
    <ul class="tx-list mt">${devices.map(d => h`<li><span class="tx-ic">${/iPhone|Android/.test(d.name) ? '📱' : /iPad/.test(d.name) ? '📲' : '💻'}</span><span class="tx-main"><b>${d.name}</b><small>${d.place} · ${d.current ? 'esta sesión' : 'activo ' + ago(d.lastSeen)}</small></span>${d.current ? raw('<span class="badge badge-success">Actual</span>') : raw(`<button class="btn btn-sm btn-ghost" data-out="${d.id}">Cerrar sesión</button>`)}</li>`)}</ul>
  </section>`;

  el.querySelector('[data-edit]').onclick = async () => {
    const v = await formModal({ title: 'Editar mis datos', fields: [{ name: 'email', label: 'Correo', type: 'email', required: true, value: user.email }, { name: 'phone', label: 'Celular', required: true, value: user.phone }, { name: 'comuna', label: 'Comuna', value: user.comuna }, { name: 'job', label: 'Ocupación', value: user.job }] });
    if (!v) return;
    if (db.find('users', u => u.id !== user.id && u.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya está en uso', 'error');
    db.update('users', user.id, v); db.log('perfil', `${user.name} actualizó sus datos`, user.id); toast('Datos actualizados', 'success');
  };
  el.querySelector('[data-pw]').onclick = async () => {
    const v = await formModal({ title: 'Cambiar clave', fields: [{ name: 'cur', label: 'Clave actual', type: 'password', required: true }, { name: 'n1', label: 'Nueva clave (mín. 8 caracteres)', type: 'password', required: true }, { name: 'n2', label: 'Repite la nueva clave', type: 'password', required: true }] });
    if (!v) return;
    if (v.cur !== db.get('users', user.id).password) return toast('La clave actual no es correcta', 'error');
    if (v.n1.length < 8) return toast('La nueva clave debe tener al menos 8 caracteres', 'warning');
    if (v.n1 !== v.n2) return toast('Las claves no coinciden', 'warning');
    if (!(await otpFlow(user))) return;
    db.update('users', user.id, { password: v.n1, pwChangedAt: new Date().toISOString() });
    db.insert('notifications', { userId: user.id, title: 'Clave actualizada', body: 'Cambiaste tu clave de acceso. Si no fuiste tú, contáctanos.', kind: 'seguridad', read: false, at: new Date().toISOString() });
    db.log('seguridad', `${user.name} cambió su clave`, user.id);
    toast('Clave actualizada', 'success');
  };
  el.querySelectorAll('[data-pref]').forEach(i => i.onchange = () => db.update('users', user.id, { prefs: { ...pref, [i.dataset.pref]: i.checked } }));
  el.querySelectorAll('[data-out]').forEach(b => b.onclick = async () => {
    const d = db.get('devices', b.dataset.out);
    if (!(await confirm(`Se cerrará la sesión en ${d.name}.`, { title: 'Cerrar sesión remota', ok: 'Cerrar sesión' }))) return;
    db.remove('devices', d.id); db.log('seguridad', `${user.name} cerró la sesión de ${d.name}`, user.id); toast('Sesión cerrada', 'success');
  });
  el.querySelector('[data-out-all]')?.addEventListener('click', async () => {
    if (!(await confirm('Se cerrarán todas las sesiones excepto la actual.', { title: 'Cerrar sesiones', ok: 'Cerrar todas', danger: true }))) return;
    devices.filter(d => !d.current).forEach(d => db.remove('devices', d.id)); toast('Sesiones cerradas', 'success');
  });
}
