// Incidentes de la página de estado: crear, publicar actualizaciones, resolver. Se ven al instante en estado.html.
import { db } from '../data/db.js';
import { escape, dateTime, ago, toast, confirm } from '../../../assets/core/ui.js';
import { IMPACTS, INC_STATUS } from '../shared/constants.js';
import { pageHead, kpi } from '../shared/shell.js';
import { openForm, field, opt } from '../shared/forms.js';
import { serviceHealth, LEVEL } from '../shared/health.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const active = db.query('incidents', i => i.status !== 'resuelto').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const past = db.query('incidents', i => i.status === 'resuelto').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const services = db.all('services');
  view.innerHTML = `${pageHead('Incidentes y estado', `${db.count('subscribers')} suscriptores recibirán los avisos (simulado)`, `<a class="btn" href="estado.html" target="_blank" rel="noopener">${icon('ext', 16)} Ver página de estado</a><button class="btn btn-primary" data-new>${icon('plus', 16)} Declarar incidente</button>`)}
    <div class="grid-auto">${services.map(s => { const h = serviceHealth(s.id); return `<div class="card svc-mini"><b>${escape(s.name)}</b><span class="svc-state lvl-${LEVEL[h.level].cls}">${LEVEL[h.level].name}</span><small class="muted">${h.uptime.toFixed(2)}% en 90 días</small></div>`; }).join('')}</div>
    <h2 style="margin:0">Activos (${active.length})</h2>
    ${active.map(i => `<article class="card stack incident live imp-${i.impact}"><div class="row between"><h3 style="margin:0">${escape(i.title)}</h3><span class="badge badge-${IMPACTS[i.impact].badge}">${IMPACTS[i.impact].name}</span></div>
      <small class="muted">${i.serviceIds.map(id => escape(db.get('services', id)?.name || '')).join(', ')} · ${escape(i.region || '')} · abierto ${ago(i.createdAt)} · estado: <b>${INC_STATUS[i.status]}</b></small>
      <ol class="inc-updates">${[...i.updates].reverse().map(u => `<li><b>${INC_STATUS[u.status]}</b> <span>${escape(u.body)}</span><small class="muted">${dateTime(u.at)}</small></li>`).join('')}</ol>
      <div class="row"><button class="btn btn-sm" data-upd="${i.id}">Publicar actualización</button><button class="btn btn-sm btn-primary" data-resolve="${i.id}">Marcar resuelto</button></div></article>`).join('') || '<div class="card empty">Sin incidentes activos: la página de estado muestra “Todos los sistemas operan con normalidad”.</div>'}
    <section class="card stack"><h3 style="margin:0">Historial</h3><div class="table-wrap"><table class="table"><thead><tr><th>Incidente</th><th>Impacto</th><th>Inicio</th><th>Duración</th><th></th></tr></thead><tbody>
      ${past.map(i => `<tr><td>${escape(i.title)}<br><small class="muted">${escape(i.region || '')}</small></td><td><span class="badge badge-${IMPACTS[i.impact].badge} plain">${IMPACTS[i.impact].name}</span></td><td>${dateTime(i.createdAt)}</td><td>${Math.round((new Date(i.resolvedAt) - new Date(i.createdAt)) / 60000)} min</td><td><button class="btn btn-sm btn-ghost" data-delinc="${i.id}" aria-label="Eliminar">${icon('trash', 14)}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
  view.querySelector('[data-new]').onclick = () => openForm({
    title: 'Declarar incidente', size: 'lg',
    body: `${field('Título *', '<input class="input" name="title" required placeholder="Ej: Corte de fibra en Osorno centro">')}
      <div class="grid-2">${field('Impacto', `<select class="select" name="impact">${Object.entries(IMPACTS).map(([k, v]) => opt(k, v.name, 'mayor')).join('')}</select>`)}${field('Zona / comuna', '<input class="input" name="region">')}</div>
      <div class="field"><label>Servicios afectados</label><div class="row">${services.map((s, k) => `<label class="check"><input type="checkbox" name="svc-${s.id}" ${k ? '' : 'checked'}> ${escape(s.name)}</label>`).join('')}</div></div>
      ${field('Primer mensaje público *', '<textarea class="textarea" name="body" required>Estamos investigando reportes de clientes afectados.</textarea>')}
      <label class="check"><input type="checkbox" name="banner" checked> Mostrar aviso en el centro de ayuda</label>`,
    onSubmit: (f, v) => {
      const ids = services.filter(s => v['svc-' + s.id]).map(s => s.id);
      if (!ids.length) { toast('Elige al menos un servicio', 'warning'); return false; }
      const now = new Date().toISOString();
      db.insert('incidents', { title: v.title.trim(), impact: v.impact, region: v.region.trim(), serviceIds: ids, status: 'investigando', updates: [{ at: now, status: 'investigando', body: v.body.trim() }], resolvedAt: null });
      if (v.banner) db.setValue('help', { ...db.getValue('help', {}), banner: { on: true, tone: v.impact === 'critico' ? 'danger' : 'warning', text: `${v.title.trim()}. Revisa el avance en la página de estado.` } });
      db.log('incidente', `Declaró "${v.title.trim()}" (${IMPACTS[v.impact].name})`, user.id);
      toast(`Incidente publicado · avisando a ${db.count('subscribers')} suscriptores`, 'success');
    }
  });
  view.querySelectorAll('[data-upd]').forEach(b => b.onclick = () => {
    const i = db.get('incidents', b.dataset.upd);
    openForm({
      title: 'Nueva actualización', body: `${field('Estado', `<select class="select" name="status">${Object.entries(INC_STATUS).filter(([k]) => k !== 'resuelto').map(([k, l]) => opt(k, l, i.status)).join('')}</select>`)}${field('Impacto', `<select class="select" name="impact">${Object.entries(IMPACTS).map(([k, x]) => opt(k, x.name, i.impact)).join('')}</select>`)}${field('Mensaje *', '<textarea class="textarea" name="body" required></textarea>')}`,
      onSubmit: (f, v) => { db.update('incidents', i.id, x => ({ status: v.status, impact: v.impact, updates: [...x.updates, { at: new Date().toISOString(), status: v.status, body: v.body.trim() }] })); db.log('incidente', `Actualizó "${i.title}": ${INC_STATUS[v.status]}`, user.id); toast('Actualización publicada', 'success'); }
    });
  });
  view.querySelectorAll('[data-resolve]').forEach(b => b.onclick = () => {
    const i = db.get('incidents', b.dataset.resolve);
    openForm({
      title: `Resolver: ${i.title}`, submit: 'Resolver', body: `${field('Mensaje de cierre *', '<textarea class="textarea" name="body" required>El servicio se encuentra normalizado. Lamentamos las molestias.</textarea>')}<label class="check"><input type="checkbox" name="banner" checked> Ocultar aviso del centro de ayuda</label>`,
      onSubmit: (f, v) => {
        const now = new Date().toISOString();
        db.update('incidents', i.id, x => ({ status: 'resuelto', resolvedAt: now, updates: [...x.updates, { at: now, status: 'resuelto', body: v.body.trim() }] }));
        if (v.banner && !db.count('incidents', x => x.status !== 'resuelto')) db.setValue('help', { ...db.getValue('help', {}), banner: { ...db.getValue('help', {}).banner, on: false } });
        db.log('incidente', `Resolvió "${i.title}"`, user.id);
        toast('Incidente resuelto', 'success');
      }
    });
  });
  view.querySelectorAll('[data-delinc]').forEach(b => b.onclick = async () => { if (await confirm('¿Eliminar este incidente del historial?', { danger: true, ok: 'Eliminar' })) { db.remove('incidents', b.dataset.delinc); toast('Incidente eliminado', 'success'); } });
}
