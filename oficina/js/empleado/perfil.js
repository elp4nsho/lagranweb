// Mi perfil: datos editables por la persona (contacto, días en oficina, bio) y contraseña.
import { escape, toast } from '../../../assets/core/ui.js';
import { avatar, areaTag } from '../shared/util.js';

export const live = false;
const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes']];

export function render(el, ctx) {
  const { db, idx } = ctx, p = db.get('people', ctx.me.id);
  p.color = idx.colorOf(p);
  el.innerHTML = `<div class="page-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">Mi perfil</h1><p class="muted" style="margin:0">Así te ven tus colegas en el directorio. Cargo y área los mantiene RRHH.</p></div><a class="btn btn-ghost" href="index.html#/persona/${encodeURIComponent(p.id)}">Ver mi ficha pública</a></div>
    <div class="detail-grid">
      <div class="card stack"><div class="profile-hero">${avatar(p, 72)}<div><b style="font-size:20px">${escape(p.name)}</b><div class="muted">${escape(p.cargo)}</div><div style="margin-top:6px">${areaTag(idx.area(p))}</div></div></div>
        <dl class="kv"><dt>Correo</dt><dd>${escape(p.email)}</dd><dt>Anexo</dt><dd>${escape(p.ext)}</dd><dt>Jefatura</dt><dd>${escape(idx.byId[p.managerId]?.name || '—')}</dd><dt>Puesto</dt><dd>${p.deskId ? escape(idx.desk[p.deskId]?.desk.code || '') + ' (fijo)' : p.remoteOnly ? 'Remoto' : 'Flexible'}</dd></dl>
        <form class="stack" data-pass><h3 style="margin:8px 0 0">Cambiar contraseña</h3><div class="field"><label for="np">Nueva contraseña</label><input class="input" id="np" name="np" type="password" minlength="6" autocomplete="new-password"></div><button class="btn" type="submit">Actualizar contraseña</button></form></div>
      <form class="card form-grid" data-form novalidate>
        <div class="field"><label for="pf-phone">Teléfono</label><input class="input" id="pf-phone" name="phone" value="${escape(p.phone || '')}"></div>
        <div class="field"><label for="pf-city">Ciudad</label><input class="input" id="pf-city" name="city" value="${escape(p.city || '')}"></div>
        <div class="field"><label for="pf-pro">Pronombres (opcional)</label><input class="input" id="pf-pro" name="pronouns" value="${escape(p.pronouns || '')}" placeholder="ella, él, elle…"></div>
        <div class="field"><label for="pf-skills">Habilidades (separadas por coma)</label><input class="input" id="pf-skills" name="skills" value="${escape((p.skills || []).join(', '))}"></div>
        <div class="field span-2"><label for="pf-bio">Sobre mí</label><textarea class="textarea" id="pf-bio" name="bio" rows="3" placeholder="Cuéntale a tus colegas en qué trabajas y cómo ayudarte.">${escape(p.bio || '')}</textarea></div>
        <div class="field span-2"><label>Mis días habituales en la oficina</label><div class="row check-row">${DAYS.map(([v, l]) => `<label class="check"><input type="checkbox" name="wd" value="${v}" ${(p.workDays || []).includes(v) ? 'checked' : ''} ${p.remoteOnly ? 'disabled' : ''}> ${l}</label>`).join('')}</div><small class="muted">Se usan en el calendario del equipo y para estimar la ocupación.</small></div>
        <div class="span-2 row"><button class="btn btn-primary" type="submit">Guardar perfil</button></div>
      </form>
    </div>`;
  el.querySelector('[data-form]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    db.update('people', p.id, { phone: f.phone.value.trim(), city: f.city.value.trim(), pronouns: f.pronouns.value.trim(), bio: f.bio.value.trim(), skills: f.skills.value.split(',').map(s => s.trim()).filter(Boolean), workDays: p.remoteOnly ? [] : [...f.querySelectorAll('[name=wd]:checked')].map(i => +i.value) });
    db.log('perfil', `${p.name} actualizó su perfil`, ctx.user.id);
    toast('Perfil actualizado: ya se ve en el directorio', 'success');
  });
  el.querySelector('[data-pass]').addEventListener('submit', e => {
    e.preventDefault();
    const v = e.target.np.value;
    if (v.length < 6) return toast('La contraseña debe tener al menos 6 caracteres', 'warning');
    db.update('users', ctx.user.id, { password: v });
    db.log('perfil', `${ctx.user.name} cambió su contraseña`, ctx.user.id);
    e.target.reset();
    toast('Contraseña actualizada', 'success');
  });
}
