// CMS de portada: textos del hero, aviso superior y servicios destacados (orden).
import { escape, toast, money } from '../../../assets/core/ui.js';
import { pageHead, formData } from '../shared/kit.js';
import { user, category, gigRating, stars } from '../shared/market.js';

export function render(el, { db, me }) {
  const st = db.getValue('settings');
  const feat = (st.featured || []).filter(id => db.get('gigs', id));
  const candidates = db.query('gigs', g => g.status === 'activo' && !feat.includes(g.id)).map(g => ({ g, r: gigRating(g.id) })).sort((a, b) => b.r.avg * b.r.count - a.r.avg * a.r.count);
  el.innerHTML = `${pageHead('Portada y destacados', 'Lo que guardes aquí se publica al instante en la portada', '<a class="btn btn-ghost btn-sm" href="index.html" target="_blank">Ver portada ↗</a>')}
    <form class="card stack" id="hero" novalidate>
      <h3 class="mb-0">Hero y aviso</h3>
      <div class="field"><label for="h-t">Título principal</label><input class="input" id="h-t" name="heroTitle" value="${escape(st.heroTitle)}" required></div>
      <div class="field"><label for="h-s">Subtítulo</label><textarea class="textarea" id="h-s" name="heroSubtitle" style="min-height:80px">${escape(st.heroSubtitle)}</textarea></div>
      <div class="form-grid"><div class="field"><label for="h-tag">Bajada / eslogan</label><input class="input" id="h-tag" name="tagline" value="${escape(st.tagline)}"></div><div class="field"><label for="h-a">Barra de aviso (vacío = oculta)</label><input class="input" id="h-a" name="announcement" value="${escape(st.announcement || '')}"></div></div>
      <label class="check"><input type="checkbox" name="showStats" ${st.showStats ? 'checked' : ''}> Mostrar cifras en la portada</label>
      <div><button class="btn btn-primary">Guardar portada</button></div>
    </form>
    <div class="split">
      <div class="card"><div class="card-head"><h3>Destacados en portada (${feat.length})</h3><span class="small muted">Arriba = primero</span></div>
        <ul class="list">${feat.map((id, i) => { const g = db.get('gigs', id); return `<li><span class="pill-num">${i + 1}</span><span style="flex:1;min-width:0" class="small"><b>${escape(g.title)}</b><br><span class="muted">${escape(user(g.freelancerId)?.name || '')} · ${escape(category(g.categoryId).name)}${g.status !== 'activo' ? ' · <span class="text-danger">no activo</span>' : ''}</span></span><span class="actions"><button class="btn btn-sm btn-ghost" data-up="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost" data-down="${i}" ${i < feat.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="btn btn-sm btn-ghost" data-rm="${id}" aria-label="Quitar">✕</button></span></li>`; }).join('') || '<li class="muted">Sin destacados</li>'}</ul></div>
      <div class="card"><h3>Agregar destacado</h3><ul class="list compact">${candidates.slice(0, 12).map(({ g, r }) => `<li><span style="flex:1;min-width:0" class="small"><b>${escape(g.title)}</b><br>${stars(r.avg, r.count)} · desde ${money(g.packages.basico.price)}</span><button class="btn btn-sm" data-add="${g.id}">+ Destacar</button></li>`).join('')}</ul></div>
    </div>`;
  const save = (featured, msg) => { db.setValue('settings', { ...db.getValue('settings'), featured }); db.log('portada', msg, me.id); toast(msg, 'success'); };
  el.querySelector('#hero').addEventListener('submit', e => {
    e.preventDefault(); const v = formData(e.currentTarget);
    if (!v.heroTitle) return toast('El título no puede quedar vacío', 'warning');
    db.setValue('settings', { ...db.getValue('settings'), heroTitle: v.heroTitle, heroSubtitle: v.heroSubtitle, tagline: v.tagline, announcement: v.announcement, showStats: !!v.showStats });
    db.log('portada', 'Textos de portada actualizados', me.id); toast('Portada publicada', 'success');
  });
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => save([...feat, b.dataset.add], 'Servicio destacado en portada'));
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => save(feat.filter(x => x !== b.dataset.rm), 'Destacado quitado de la portada'));
  const move = (i, d) => { const a = [...feat]; [a[i], a[i + d]] = [a[i + d], a[i]]; save(a, 'Orden de destacados actualizado'); };
  el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(+b.dataset.up, -1));
  el.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(+b.dataset.down, 1));
}
