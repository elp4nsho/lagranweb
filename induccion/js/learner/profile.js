// Perfil del trabajador y cambio de PIN.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { getCompany, getUser } from '../data/model.js';

export function renderProfile(view) {
  const u = auth.current(), co = getCompany(u.companyId), sup = getUser(u.supervisorId);
  view.innerHTML = `<div class="lx-head"><div><span class="eyebrow">Mi perfil</span><h1>${escape(u.name)}</h1></div></div>
    <div class="grid-2">
      <div class="card"><h3>Datos</h3><dl class="ak-dl">
        <dt>RUT</dt><dd>${escape(u.rut || '—')}</dd><dt>Correo</dt><dd>${escape(u.email)}</dd><dt>Empresa</dt><dd>${escape(co?.name || '—')}</dd>
        <dt>Tipo</dt><dd>${u.type === 'contratista' ? 'Contratista' : 'Personal propio'}</dd><dt>Área</dt><dd>${escape(u.area || '—')}</dd><dt>Cargo</dt><dd>${escape(u.cargo || '—')}</dd>
        <dt>Supervisor(a)</dt><dd>${escape(sup?.name || '—')}</dd><dt>Alta</dt><dd>${date(u.createdAt)}</dd></dl>
        <p class="small muted" style="margin-top:12px">¿Algún dato incorrecto? Pídele a tu supervisor que lo actualice.</p></div>
      <form class="card stack" id="pin-form" novalidate><h3 style="margin:0">Cambiar PIN</h3>
        <div class="field"><label for="p0">PIN actual</label><input class="input" id="p0" type="password" inputmode="numeric" autocomplete="current-password"></div>
        <div class="field"><label for="p1">Nuevo PIN (4 dígitos)</label><input class="input" id="p1" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></div>
        <button class="btn btn-primary">Guardar PIN</button></form>
    </div>`;
  view.querySelector('#pin-form').addEventListener('submit', e => {
    e.preventDefault();
    const p0 = view.querySelector('#p0').value, p1 = view.querySelector('#p1').value;
    if (p0 !== u.password) return toast('El PIN actual no es correcto', 'error');
    if (!/^\d{4}$/.test(p1)) return toast('El nuevo PIN debe tener 4 dígitos', 'warning');
    db.update('users', u.id, { password: p1 }); db.log('PIN actualizado', u.name, u.id); toast('PIN actualizado', 'success');
  });
}
