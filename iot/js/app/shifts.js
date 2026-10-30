// Bitácora de turno: novedades de cada turno (A, B, C) por sitio.
import { db, userName } from '../data/db.js';
import { dateTime, toast, confirm, norm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { currentShift, SHIFT_LABEL } from '../shared/sim.js';
import { pageHead, siteName } from '../shared/common.js';

const st = { shift: '', site: '', q: '' };
const TAGS = ['operación', 'seguridad', 'mantención', 'alimentación', 'calidad'];

export function render(el, ctx) {
  const write = ctx.can('app.turnos');
  const cur = currentShift();
  const list = db.all('shifts').filter(s => (!st.shift || s.shift === st.shift) && (!st.site || s.siteId === st.site) && (!st.q || norm(s.text).includes(norm(st.q)))).sort((a, b) => b.at.localeCompare(a.at));
  const today = new Date().toISOString().slice(0, 10);
  const openAl = db.count('alarms', a => a.status !== 'resuelta');
  el.innerHTML = pageHead('Bitácora de turno', `Turno actual: ${SHIFT_LABEL[cur]}`, '', !write) + h`
  <div class="grid-2" style="align-items:start;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)">
    <section class="card stack">
      <h3 style="margin:0">Nueva entrada · ${SHIFT_LABEL[cur]}</h3>
      ${write ? raw(h`<div class="field"><label for="ss">Sitio</label><select class="select" id="ss">${db.all('sites').map(s => h`<option value="${s.id}">${s.name}</option>`)}</select></div>
        <div class="field"><label for="st">Novedades</label><textarea class="textarea" id="st" placeholder="Ej: se cambia red de jaula 3, sin novedades de seguridad."></textarea></div>
        <div class="chips">${TAGS.map(t => h`<label class="chip"><input type="checkbox" value="${t}" data-tag style="accent-color:var(--primary)"> ${t}</label>`)}</div>
        <button class="btn btn-primary" data-add>Registrar en bitácora</button>`) : raw('<p class="muted">Tu rol es de solo lectura.</p>')}
      <div class="notice small">Resumen para entrega de turno: ${db.count('shifts', s => s.at.slice(0, 10) === today)} entradas hoy · ${openAl} alarmas abiertas · ${db.count('orders', o => o.status !== 'completada')} OT pendientes.</div>
    </section>
    <section class="card stack">
      <div class="filters"><div class="field"><label for="fq">Buscar</label><input class="input" id="fq" type="search" value="${st.q}"></div>
        <div class="field"><label for="fsh">Turno</label><select class="select" id="fsh"><option value="">Todos</option>${['A', 'B', 'C'].map(s => h`<option value="${s}" ${st.shift === s ? 'selected' : ''}>${SHIFT_LABEL[s]}</option>`)}</select></div>
        <div class="field"><label for="fsi">Sitio</label><select class="select" id="fsi"><option value="">Todos</option>${db.all('sites').map(s => h`<option value="${s.id}" ${st.site === s.id ? 'selected' : ''}>${s.name}</option>`)}</select></div></div>
      <ul class="list">${list.slice(0, 40).map(s => h`<li style="align-items:flex-start"><span class="ic">${s.shift}</span><span class="main"><b style="white-space:normal">${s.text}</b><small>${userName(s.author)} · ${siteName(s.siteId)} · ${dateTime(s.at)} ${(s.tags || []).map(t => `#${t}`).join(' ')}</small></span>${write && (s.author === ctx.user.id || ctx.user.role === 'admin') ? raw(`<button class="btn btn-sm btn-ghost" data-del="${s.id}" aria-label="Eliminar">🗑</button>`) : ''}</li>`)}</ul>
      ${!list.length ? raw('<div class="empty">Sin entradas.</div>') : ''}
    </section>
  </div>`;
  el.querySelector('#fq').onchange = e => { st.q = e.target.value; ctx.refresh(); };
  el.querySelector('#fsh').onchange = e => { st.shift = e.target.value; ctx.refresh(); };
  el.querySelector('#fsi').onchange = e => { st.site = e.target.value; ctx.refresh(); };
  el.querySelector('[data-add]')?.addEventListener('click', () => {
    const text = el.querySelector('#st').value.trim();
    if (text.length < 5) return toast('Escribe la novedad del turno', 'warning');
    const tags = [...el.querySelectorAll('[data-tag]:checked')].map(i => i.value);
    el.querySelector('#st').value = ''; document.activeElement?.blur();
    db.insert('shifts', { shift: cur, author: ctx.user.id, siteId: el.querySelector('#ss').value, text, tags, at: new Date().toISOString() });
    db.log('turno', `${ctx.user.name} registró novedad en ${SHIFT_LABEL[cur]}`, ctx.user.id);
    toast('Entrada registrada', 'success');
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (await confirm('¿Eliminar esta entrada?', { title: 'Eliminar', ok: 'Eliminar', danger: true })) { db.remove('shifts', b.dataset.del); toast('Entrada eliminada', 'info'); } });
}
