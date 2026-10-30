// Ajustes de la tienda, simulador de tráfico, exportación de datos y "Restablecer datos demo".
import { db, shop, addTraffic } from '../data/db.js';
import { pageHead, formData } from '../shared/admin-kit.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';

export default {
  id: 'ajustes', label: 'Ajustes', ico: '⚙️', group: 'Administración', roles: ['admin'], live: false,
  render(view, ctx) {
    const s = shop();
    const size = (JSON.stringify(db.export()).length / 1024).toFixed(0);
    view.innerHTML = `${pageHead('Ajustes', 'Configuración general de la tienda y herramientas de la demo.')}
      <div class="split">
        <form class="card stack" id="shopForm" novalidate>
          <h3 style="margin:0">Tienda</h3>
          <div class="field"><label for="s-name">Nombre comercial</label><input class="input" id="s-name" name="name" value="${escape(s.name)}"></div>
          <div class="field"><label for="s-mail">Correo de soporte</label><input class="input" id="s-mail" name="supportEmail" type="email" value="${escape(s.supportEmail)}"></div>
          <div class="field"><label for="s-phone">Teléfono</label><input class="input" id="s-phone" name="phone" value="${escape(s.phone)}"></div>
          <div class="field"><label for="s-carrier">Transportista por defecto</label><select class="select" id="s-carrier" name="carrier">${['Rápido Sur', 'Chilexpreso', 'Ruta Austral'].map(c => `<option ${c === s.carrier ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div><button class="btn btn-primary" type="submit">Guardar</button></div>
        </form>
        <div class="stack">
          <div class="card stack"><h3 style="margin:0">Simulador de tráfico</h3>
            <p class="small muted" style="margin:0">Agrega visitas y checkouts de hoy para ver moverse el embudo del dashboard.</p>
            <div class="row" style="gap:8px"><button class="btn" data-traffic="250">+250 visitas</button><button class="btn" data-traffic="1000">+1.000 visitas</button></div></div>
          <div class="card stack"><h3 style="margin:0">Datos de la demo</h3>
            <p class="small muted" style="margin:0">La base de datos vive en tu navegador (localStorage, ~${size} KB) y la comparten la landing, el checkout, el seguimiento y este panel.</p>
            <div class="row" style="gap:8px"><button class="btn" data-export>⇩ Exportar JSON</button><button class="btn btn-danger" data-reset>↺ Restablecer datos demo</button></div></div>
        </div>
      </div>`;
    view.querySelector('#shopForm').addEventListener('submit', e => {
      e.preventDefault();
      db.setValue('shop', { ...shop(), ...formData(e.target) });
      db.log('Ajustes', 'Datos de la tienda actualizados', ctx.user.id);
      toast('Ajustes guardados', 'success');
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.traffic) { const v = +t.dataset.traffic; addTraffic(v, Math.round(v * .09)); toast(`+${v} visitas simuladas hoy`, 'success'); }
      if (t.matches('[data-export]')) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(db.export(), null, 2)], { type: 'application/json' }));
        a.download = 'aquilo-datos.json'; a.click();
        toast('Exportación lista', 'success');
      }
      if (t.matches('[data-reset]') && await confirm('Se borrarán todos los cambios (pedidos, textos, usuarios…) y se cargarán los datos originales.', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) {
        const me = ctx.user.id;
        db.reset();
        ctx.auth.loginAs(db.get('users', me) ? me : 'u-admin');
        db.log('Datos restablecidos', 'Se cargó la semilla original', 'u-admin');
        toast('Datos demo restablecidos', 'success');
        setTimeout(() => location.reload(), 500);
      }
    };
  }
};
