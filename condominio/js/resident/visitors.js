// Visitas: pre-autorización con código QR, historial de ingresos y cancelación.
import { escape, date, dateTime, toast, confirm, modal } from '../../../assets/core/ui.js';
import { VISTATUS, badge } from '../shared/format.js';
import { fakeQR } from '../shared/icons.js';
import { pageHead, editForm } from '../shared/kit.js';

export const newCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
export function showPass(v, unit) {
  modal({ title: 'Pase de visita', body: `<div class="qr-box">${fakeQR(v.code, 180)}<span class="access-code">${escape(v.code)}</span><b>${escape(v.name)}</b><span class="small muted">Depto ${escape(unit.tower)}-${escape(unit.number)} · válido el ${date(v.date + 'T12:00')}${v.plate ? ' · patente ' + escape(v.plate) : ''}</span>
    <p class="small" style="margin:0">Comparte este código con tu visita. La conserjería lo validará al llegar.</p></div>`,
    foot: `<button class="btn" data-copy>Copiar mensaje</button><button class="btn btn-primary" data-close>Listo</button>` }).el.querySelector('[data-copy]').onclick = async () => {
    try { await navigator.clipboard.writeText(`Hola ${v.name}, te autoricé el acceso a la Comunidad Plaza Ñuñoa (depto ${unit.tower}-${unit.number}) el ${date(v.date + 'T12:00')}. Código: ${v.code}`); toast('Mensaje copiado', 'success'); } catch (e) { toast('No se pudo copiar', 'warning'); }
  };
}

export function renderVisitors(el, p, q, ctx, { unit }) {
  const { db, user } = ctx;
  const list = db.query('visitors', v => v.unitId === unit.id).sort((a, b) => (b.date + (b.inAt || '')).localeCompare(a.date + (a.inAt || '')));
  const upcoming = list.filter(v => v.status === 'esperada'), history = list.filter(v => v.status !== 'esperada');
  el.innerHTML = `${pageHead('Visitas', 'Pre-autoriza a tus visitas para que ingresen rápido con su código', '<button class="btn btn-primary" data-new>+ Autorizar visita</button>')}
    <div class="card"><h3>Visitas autorizadas</h3>${upcoming.length ? upcoming.map(v => `<div class="list-row"><span><b>${escape(v.name)}</b> · ${date(v.date + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' })}${v.plate ? ' · ' + escape(v.plate) : ''}<br><span class="muted small">Código <b class="mono">${escape(v.code)}</b>${v.note ? ' · ' + escape(v.note) : ''}</span></span><span class="row" style="gap:6px"><button class="btn btn-sm" data-qr="${v.id}">Ver QR</button><button class="btn btn-sm btn-ghost" data-cancel="${v.id}">Cancelar</button></span></div>`).join('') : '<p class="muted">No tienes visitas autorizadas pendientes.</p>'}</div>
    <div class="card"><h3>Historial de ingresos</h3><div class="table-wrap"><table class="table"><thead><tr><th>Visita</th><th>Ingreso</th><th>Salida</th><th>Estado</th></tr></thead><tbody>
      ${history.slice(0, 20).map(v => `<tr><td>${escape(v.name)}${v.preauth ? ' <span class="badge badge-info plain">QR</span>' : ''}<br><span class="muted small">${escape(v.plate || '')}</span></td><td class="small">${v.inAt ? dateTime(v.inAt) : '—'}</td><td class="small">${v.outAt ? dateTime(v.outAt) : '—'}</td><td>${badge(VISTATUS, v.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sin registros.</td></tr>'}</tbody></table></div></div>`;
  el.querySelector('[data-new]').onclick = async () => {
    const r = await editForm({ title: 'Autorizar visita', size: '', values: { date: new Date().toISOString().slice(0, 10) }, fields: [
      { name: 'name', label: 'Nombre de la visita', required: true, full: true }, { name: 'rut', label: 'RUT (opcional)' }, { name: 'date', label: 'Fecha', type: 'date', required: true, min: new Date().toISOString().slice(0, 10) },
      { name: 'plate', label: 'Patente (si viene en auto)', placeholder: 'ABCD-12' }, { name: 'note', label: 'Nota para conserjería', placeholder: 'Ej: técnico de internet' }] });
    if (!r) return;
    const v = db.insert('visitors', { unitId: unit.id, name: r.name, rut: r.rut, plate: r.plate.toUpperCase(), date: r.date, preauth: true, code: newCode(), status: 'esperada', inAt: null, outAt: null, by: null, note: r.note, createdBy: user.id });
    db.log('visita', `${user.name} autorizó a ${r.name} para ${unit.tower}-${unit.number}`, user.id);
    toast('Visita autorizada', 'success'); ctx.refresh(); showPass(v, unit);
  };
  el.querySelectorAll('[data-qr]').forEach(b => b.onclick = () => showPass(db.get('visitors', b.dataset.qr), unit));
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => { if (await confirm('¿Cancelar esta autorización?', { danger: true, ok: 'Cancelar' })) { db.update('visitors', b.dataset.cancel, { status: 'cancelada' }); toast('Autorización cancelada', 'info'); ctx.refresh(); } });
}
