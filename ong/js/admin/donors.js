// CRM de donantes: perfiles, segmentos automáticos, etiquetas, notas, historial y suscripciones.
import { db, donorStats, segmentOf, SEGMENTS, campaignName, DONATION_ST, SUB_ST } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, money, num, date, ago, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

const SEG_T = { Mayor: 'success', Recurrente: 'primary', Empresa: 'info', Ocasional: '', 'Primera vez': 'warning', Inactivo: 'danger', Prospecto: '' };

async function edit(d, ctx) {
  const v = await formModal({ title: d ? `Editar ${d.name}` : 'Nuevo donante', fields: [
    { name: 'name', label: 'Nombre', value: d?.name || '', required: true },
    { name: 'email', label: 'Correo', type: 'email', value: d?.email || '', required: true },
    { name: 'phone', label: 'Teléfono', value: d?.phone || '' }, { name: 'region', label: 'Región', value: d?.region || '' },
    { name: 'type', label: 'Tipo', type: 'select', value: d?.type || 'persona', options: [['persona', 'Persona'], ['empresa', 'Empresa']] },
    { name: 'tags', label: 'Etiquetas (separadas por coma)', value: (d?.tags || []).join(', ') }
  ] });
  if (!v) return;
  if (db.find('donors', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== d?.id)) return toast('Ya existe un donante con ese correo', 'error');
  v.tags = v.tags.split(',').map(s => s.trim()).filter(Boolean);
  if (d) db.update('donors', d.id, v); else db.insert('donors', { ...v, notes: [] });
  db.log(d ? 'Donante editado' : 'Donante creado', v.name, ctx.user.id); toast('Donante guardado', 'success');
}

function list(view, ctx) {
  const rows = db.all('donors').map(d => { const s = donorStats(d.id); return { ...d, total: s.total, count: s.count, last: s.last, segment: segmentOf(d), monthly: !!s.sub }; });
  const counts = Object.fromEntries(SEGMENTS.map(s => [s, rows.filter(r => r.segment === s).length]));
  view.innerHTML = `${pageHead('Donantes (CRM)', `${num(rows.length)} perfiles · segmentos calculados automáticamente`, '<button class="btn btn-primary" data-new>＋ Nuevo donante</button>')}
    <div class="row" style="gap:6px">${SEGMENTS.map(s => `<button class="chip" data-seg="${s}">${s} · ${counts[s]}</button>`).join('')}</div>
    <div class="kpis">
      ${kpi('Donantes con aportes', num(rows.filter(r => r.count).length), { ico: '👥' })}
      ${kpi('Recurrentes', num(counts.Recurrente + rows.filter(r => r.monthly && r.segment !== 'Recurrente').length), { ico: '🔁' })}
      ${kpi('Donantes mayores', num(counts.Mayor), { ico: '🏅' })}
      ${kpi('Inactivos (+6 meses)', num(counts.Inactivo), { ico: '💤', sub: 'Ideal para campaña de reactivación' })}
    </div><div class="card" id="tbl"></div>`;
  table(view.querySelector('#tbl'), {
    id: 'donors', rows, pageSize: 12, sort: { key: 'total', dir: -1 },
    search: d => `${d.name} ${d.email} ${d.region} ${d.tags.join(' ')}`,
    filters: [{ key: 'segment', label: 'Segmento', options: SEGMENTS.map(s => [s, s]) }, { key: 'type', label: 'Tipo', options: [['persona', 'Persona'], ['empresa', 'Empresa']] }, { key: 'region', label: 'Región', options: [...new Set(rows.map(r => r.region).filter(Boolean))].sort().map(r => [r, r]) }],
    columns: [
      { key: 'name', label: 'Donante', render: d => `<span class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="--av:var(--${d.type === 'empresa' ? 'info' : 'primary'})">${escape(initials(d.name))}</span><span><b>${escape(d.name)}</b><br><small class="muted">${escape(d.email)}</small></span></span>` },
      { key: 'segment', label: 'Segmento', render: d => badge(d.segment, SEG_T[d.segment]) + (d.monthly ? ' <span class="badge badge-primary plain">mensual</span>' : '') },
      { key: 'total', label: 'Total donado', render: d => `<b>${money(d.total)}</b><br><small class="muted">${d.count} aportes</small>` },
      { key: 'last', label: 'Última', render: d => d.last ? escape(ago(d.last)) : '<span class="muted">—</span>' },
      { key: 'region', label: 'Región' },
      { key: 'tags', label: 'Etiquetas', sort: false, render: d => d.tags.map(t => `<span class="badge plain">${escape(t)}</span>`).join(' ') }
    ],
    onRow: d => { location.hash = '#/donantes/' + d.id; },
    csv: { name: 'donantes.csv', map: d => ({ nombre: d.name, correo: d.email, telefono: d.phone, region: d.region, tipo: d.type, segmento: d.segment, total: d.total, aportes: d.count, ultima: d.last.slice(0, 10), mensual: d.monthly ? 'sí' : 'no', etiquetas: d.tags.join('|') }) }
  });
  view.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-new]')) edit(null, ctx);
    if (t.dataset.seg) { const sel = view.querySelector('.tbl-f[data-f="segment"]'); sel.value = sel.value === t.dataset.seg ? '' : t.dataset.seg; sel.dispatchEvent(new Event('change')); view.querySelectorAll('[data-seg]').forEach(c => c.classList.toggle('active', c.dataset.seg === sel.value)); }
  };
}

function detail(view, ctx, id) {
  const d = db.get('donors', id);
  if (!d) { view.innerHTML = '<div class="card empty"><h2>Donante no encontrado</h2><a class="btn" href="#/donantes">Volver</a></div>'; return; }
  const st = donorStats(d.id), seg = segmentOf(d);
  const all = db.query('donations', x => x.donorId === d.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const subs = db.query('subscriptions', s => s.donorId === d.id);
  const camps = Object.entries(st.list.reduce((m, x) => { const k = campaignName(x.campaignId); m[k] = (m[k] || 0) + x.amount; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const user = db.find('users', u => u.donorId === d.id || u.email === d.email);
  view.innerHTML = `${pageHead(d.name, `${badge(seg, SEG_T[seg])} ${d.tags.map(t => `<span class="badge plain">${escape(t)}</span>`).join(' ')} ${user ? '<span class="badge badge-info plain">Tiene cuenta</span>' : ''}`, `<a class="btn btn-ghost" href="#/donantes">← Donantes</a><button class="btn" data-mail>✉️ Agradecer</button><button class="btn" data-edit>Editar</button>`)}
    <div class="kpis">${kpi('Total donado', money(st.total))}${kpi('Aportes', num(st.count))}${kpi('Promedio', money(st.count ? st.total / st.count : 0))}${kpi('Donante desde', date(d.createdAt))}</div>
    <div class="detail-grid">
      <div class="stack">
        <div class="card"><h3>Historial de donaciones</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Destino</th><th>Monto</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>
          ${all.slice(0, 20).map(x => `<tr><td>${escape(date(x.createdAt))}</td><td>${escape(campaignName(x.campaignId))}</td><td><b>${money(x.amount)}</b></td><td>${x.type === 'mensual' ? 'Mensual' : 'Única'}</td><td>${badge(...DONATION_ST[x.status])}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin donaciones</td></tr>'}
          </tbody></table></div>${all.length > 20 ? `<p class="small muted">Mostrando 20 de ${all.length}.</p>` : ''}</div>
        <div class="card"><h3>Causas que apoya</h3><div class="hbars">${camps.map(([k, v]) => `<div class="hbar"><span class="hbar-l">${escape(k)}</span><span class="hbar-t"><i style="--v:${v / camps[0][1] * 100}%"></i></span><b>${money(v)}</b></div>`).join('') || '<p class="muted small">—</p>'}</div></div>
      </div>
      <div class="stack">
        <div class="card"><h3>Contacto</h3><dl class="kv"><dt>Correo</dt><dd>${escape(d.email)}</dd><dt>Teléfono</dt><dd>${escape(d.phone || '—')}</dd><dt>Región</dt><dd>${escape(d.region || '—')}</dd><dt>Tipo</dt><dd>${d.type === 'empresa' ? 'Empresa' : 'Persona'}</dd></dl></div>
        <div class="card stack"><h3 style="margin:0">Suscripciones</h3>${subs.map(s => `<div class="sum-line"><span>${money(s.amount)}/mes · ${escape(campaignName(s.campaignId))}</span>${badge(...SUB_ST[s.status])}</div>`).join('') || '<p class="muted small" style="margin:0">Sin donación mensual.</p>'}</div>
        <div class="card stack"><h3 style="margin:0">Notas</h3>
          ${(d.notes || []).map(n => `<div class="small"><b>${escape(n.by)}</b> · <span class="muted">${escape(date(n.at))}</span><br>${escape(n.text)}</div>`).join('') || '<p class="muted small" style="margin:0">Sin notas.</p>'}
          <form class="stack" data-note style="gap:8px"><textarea class="textarea" name="text" style="min-height:70px" placeholder="Ej: prefiere contacto por WhatsApp"></textarea><button class="btn btn-sm" type="submit">Agregar nota</button></form></div>
        ${ctx.role === 'admin' ? '<button class="btn btn-danger" data-del>Eliminar perfil</button>' : ''}
      </div>
    </div>`;
  view.querySelector('[data-note]').onsubmit = e => { e.preventDefault(); const text = e.target.text.value.trim(); if (!text) return; db.update('donors', d.id, { notes: [...(d.notes || []), { text, by: ctx.user.name, at: new Date().toISOString() }] }); db.log('Nota en CRM', d.name, ctx.user.id); toast('Nota agregada', 'success'); };
  view.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-edit]')) edit(d, ctx);
    if (t.matches('[data-mail]')) { db.log('Correo de agradecimiento', `${d.name} <${d.email}>`, ctx.user.id); toast(`Agradecimiento enviado a ${d.email} (simulado)`, 'success'); }
    if (t.matches('[data-del]') && await confirm(`¿Eliminar el perfil de ${d.name}? Sus donaciones se conservan en el libro.`, { danger: true, ok: 'Eliminar' })) { db.remove('donors', d.id); db.log('Donante eliminado', d.name, ctx.user.id); toast('Perfil eliminado', 'success'); location.hash = '#/donantes'; }
  };
}

export default {
  id: 'donantes', label: 'Donantes (CRM)', ico: '👥', group: 'Recaudación', roles: ['admin', 'coordinador', 'contador'],
  render(view, ctx) { ctx.params.id ? detail(view, ctx, ctx.params.id) : list(view, ctx); }
};
