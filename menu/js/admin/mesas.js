// Editor del plano: arrastrar mesas, crear, editar capacidad/zona/forma y eliminar.
import { escape, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { floorHtml, legendHtml, H } from '../shared/floor.js';
import { tableState, TABLE_STATES } from '../shared/logic.js';

const ZONE_OPTS = ['Salón', 'Terraza', 'Barra'];
const fields = t => [
  { name: 'number', label: 'Número de mesa', type: 'number', required: true, value: t?.number ?? (Math.max(0, ...db.all('tables').map(x => x.number)) + 1) },
  { name: 'seats', label: 'Capacidad (personas)', type: 'number', required: true, value: t?.seats ?? 4 },
  { name: 'zone', label: 'Zona', type: 'select', options: ZONE_OPTS, value: t?.zone ?? 'Salón' },
  { name: 'shape', label: 'Forma', type: 'select', options: [['round', 'Redonda'], ['square', 'Cuadrada'], ['rect', 'Rectangular (6+)']], value: t?.shape ?? 'square' }
];

export default {
  id: 'mesas', label: 'Mesas y plano', icon: '🗺️', group: 'Contenido', roles: ['admin'], watch: ['tables'],
  render(el, ctx) {
    let sel = null;
    const paint = () => {
      const tables = db.all('tables').sort((a, b) => a.number - b.number);
      const t = sel && db.get('tables', sel);
      el.innerHTML = `${pageHead('Mesas y plano', `${tables.length} mesas · ${tables.reduce((a, x) => a + x.seats, 0)} puestos · arrastra las mesas para ubicarlas`, '<button class="btn btn-primary btn-sm" data-add>+ Nueva mesa</button>')}
        <div class="floor-layout">
          <div class="card stack"><div class="floor-wrap" data-floor>${floorHtml(tables, { selected: sel })}</div>${legendHtml()}</div>
          <div class="card stack side-panel">
            ${t ? `<div class="row between"><h3 style="margin:0">Mesa ${t.number}</h3>${badge(TABLE_STATES, tableState(t))}</div>
              <dl class="dl"><dt>Zona</dt><dd>${escape(t.zone)}</dd><dt>Capacidad</dt><dd>${t.seats} personas</dd><dt>Forma</dt><dd>${{ round: 'Redonda', square: 'Cuadrada', rect: 'Rectangular' }[t.shape]}</dd><dt>Posición</dt><dd>${t.x.toFixed(0)}, ${t.y.toFixed(0)}</dd></dl>
              <div class="row"><button class="btn btn-sm" data-edit>Editar</button><a class="btn btn-sm" href="index.html?mesa=${t.number}" target="_blank" rel="noopener">Abrir carta ↗</a><button class="btn btn-sm btn-danger" data-del>Eliminar</button></div>
              <p class="small muted">Usa las flechas para mover con precisión:</p>
              <div class="nudge"><button class="btn btn-icon btn-sm" data-nudge="0,-1" aria-label="Arriba">↑</button><button class="btn btn-icon btn-sm" data-nudge="-1,0" aria-label="Izquierda">←</button><button class="btn btn-icon btn-sm" data-nudge="1,0" aria-label="Derecha">→</button><button class="btn btn-icon btn-sm" data-nudge="0,1" aria-label="Abajo">↓</button></div>`
            : `<h3 style="margin:0">Selecciona una mesa</h3><p class="muted small">Haz clic en una mesa del plano para ver y editar sus datos, o arrástrala para moverla.</p>`}
            <div class="table-wrap"><table class="table"><thead><tr><th>Mesa</th><th>Zona</th><th>Pers.</th><th>Estado</th></tr></thead><tbody>${tables.map(x => `<tr data-row="${x.id}" class="${x.id === sel ? 'is-sel' : ''}" style="cursor:pointer"><td><b>${x.number}</b></td><td>${escape(x.zone)}</td><td>${x.seats}</td><td>${badge(TABLE_STATES, tableState(x))}</td></tr>`).join('')}</tbody></table></div>
          </div>
        </div>`;
      wireDrag();
    };
    const wireDrag = () => {
      const floor = el.querySelector('.floor');
      let drag = null;
      floor.addEventListener('pointerdown', e => {
        const b = e.target.closest('.tbl'); if (!b) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        drag = { b, id: b.dataset.t, moved: false, sx: e.clientX, sy: e.clientY };
      });
      floor.addEventListener('pointermove', e => {
        if (!drag) return;
        if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
        if (!drag.moved) return;
        const r = floor.getBoundingClientRect();
        drag.x = Math.max(3, Math.min(97, (e.clientX - r.left) / r.width * 100));
        drag.y = Math.max(4, Math.min(H - 4, (e.clientY - r.top) / r.height * H));
        drag.b.style.left = drag.x + '%'; drag.b.style.top = (drag.y / H * 100) + '%';
      });
      floor.addEventListener('pointerup', () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (d.moved && d.x != null) { db.update('tables', d.id, { x: Math.round(d.x * 2) / 2, y: Math.round(d.y * 2) / 2 }); db.log('plano', `Mesa ${db.get('tables', d.id).number} reubicada`, ctx.user.id); }
        sel = d.id; paint();
      });
    };
    el.addEventListener('click', async e => {
      const row = e.target.closest('[data-row]'); if (row) { sel = row.dataset.row; paint(); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.add != null) {
        const v = await formModal({ title: 'Nueva mesa', fields: fields(null) });
        if (!v) return;
        if (db.find('tables', x => x.number === v.number)) { toast('Ya existe una mesa con ese número', 'warning'); return; }
        const zx = { 'Salón': 30, 'Terraza': 80, 'Barra': 52 }[v.zone], zy = v.zone === 'Barra' ? 52 : 20;
        const t = db.insert('tables', { ...v, x: zx, y: zy, status: 'libre', calling: false, billRequested: false, sessionId: null });
        db.log('plano', `Mesa ${v.number} creada`, ctx.user.id); toast('Mesa creada: arrástrala a su lugar', 'success'); sel = t.id; paint();
      }
      if (b.dataset.edit != null) {
        const t = db.get('tables', sel);
        const v = await formModal({ title: `Editar mesa ${t.number}`, fields: fields(t) });
        if (!v) return;
        if (v.number !== t.number && db.find('tables', x => x.number === v.number)) { toast('Ya existe una mesa con ese número', 'warning'); return; }
        db.update('tables', t.id, v); db.log('plano', `Mesa ${v.number} editada`, ctx.user.id); toast('Mesa actualizada', 'success'); paint();
      }
      if (b.dataset.del != null) {
        const t = db.get('tables', sel);
        if (t.status === 'ocupada') { toast('No puedes eliminar una mesa ocupada', 'warning'); return; }
        if (!await confirm(`¿Eliminar la mesa ${t.number}?`, { danger: true, ok: 'Eliminar' })) return;
        db.remove('tables', t.id); db.log('plano', `Mesa ${t.number} eliminada`, ctx.user.id); sel = null; paint();
      }
      if (b.dataset.nudge) {
        const [dx, dy] = b.dataset.nudge.split(',').map(Number); const t = db.get('tables', sel);
        db.update('tables', t.id, { x: Math.max(3, Math.min(97, t.x + dx)), y: Math.max(4, Math.min(H - 4, t.y + dy)) }); paint();
      }
    });
    paint();
    return { refresh: paint };
  }
};
