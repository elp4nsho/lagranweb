// Comisiones y ajustes: cargo al cliente, comisión al freelancer (se aplican en el checkout), retiros y niveles.
import { toast, confirm as ask, money } from '../../../assets/core/ui.js';
import { pageHead, formData } from '../shared/kit.js';
import { db, auth } from '../data/db.js';
import { quote } from '../shared/market.js';

export async function resetDemo() {
  if (!await ask('Se borrarán todos los cambios y se cargarán los datos de demostración.', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) return;
  const me = auth.current();
  db.reset();
  db.log('sistema', 'Datos de demostración restablecidos', me && db.get('users', me.id) ? me.id : null);
  toast('Datos demo restablecidos', 'success');
  if (!auth.current()) location.replace('login.html');
}

export function render(el, { me }) {
  const st = db.getValue('settings');
  const L = st.levels;
  el.innerHTML = `${pageHead('Comisiones y ajustes', 'Los nuevos porcentajes se aplican de inmediato en el checkout y en las propuestas (los pedidos existentes conservan su comisión)')}
    <form class="stack" id="fees" novalidate>
      <div class="card"><h3>Comisiones</h3><div class="form-grid">
        <div class="field"><label for="fe-s">Cargo por servicio al cliente (%)</label><input class="input" id="fe-s" name="serviceFeePct" type="number" min="0" max="30" step="0.5" value="${st.serviceFeePct}"></div>
        <div class="field"><label for="fe-c">Comisión al freelancer (%)</label><input class="input" id="fe-c" name="commissionPct" type="number" min="0" max="40" step="0.5" value="${st.commissionPct}"></div>
        <div class="full notice" data-preview></div>
      </div></div>
      <div class="card"><h3>Pagos a freelancers</h3><div class="form-grid">
        <div class="field"><label for="fe-m">Retiro mínimo (CLP)</label><input class="input" id="fe-m" name="minWithdrawal" type="number" min="0" step="1000" value="${st.minWithdrawal}"></div>
        <div class="field"><label for="fe-a">Liberación automática tras entrega (días)</label><input class="input" id="fe-a" name="autoReleaseDays" type="number" min="1" max="14" value="${st.autoReleaseDays}"></div>
      </div></div>
      <div class="card"><h3>Niveles de vendedor</h3><div class="form-grid">
        ${['nivel1', 'nivel2', 'top'].map(k => `<div class="field"><label for="lv-${k}o">${{ nivel1: 'Nivel 1', nivel2: 'Nivel 2', top: 'Top Gremio' }[k]}: pedidos completados</label><input class="input" id="lv-${k}o" name="${k}_orders" type="number" min="1" value="${L[k].orders}"></div><div class="field"><label for="lv-${k}r">${{ nivel1: 'Nivel 1', nivel2: 'Nivel 2', top: 'Top Gremio' }[k]}: valoración mínima</label><input class="input" id="lv-${k}r" name="${k}_rating" type="number" min="1" max="5" step="0.1" value="${L[k].rating}"></div>`).join('')}
      </div></div>
      <div class="row between"><button type="button" class="btn btn-danger" data-reset>↺ Restablecer datos demo</button><button class="btn btn-primary btn-lg">Guardar ajustes</button></div>
    </form>`;
  const f = el.querySelector('#fees');
  const preview = () => { const s = { serviceFeePct: +f.serviceFeePct.value || 0, commissionPct: +f.commissionPct.value || 0 }; const q = quote(100000, s); el.querySelector('[data-preview]').innerHTML = `Ejemplo con un servicio de ${money(100000)}: el cliente paga <b>${money(q.total)}</b>, el freelancer recibe <b>${money(q.net)}</b> y Gremio gana <b>${money(q.serviceFee + q.commission)}</b> (take rate ${((q.serviceFee + q.commission) / 1000).toFixed(1).replace('.', ',')}%).`; };
  f.serviceFeePct.oninput = f.commissionPct.oninput = preview; preview();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = formData(f);
    const sf = +v.serviceFeePct, cm = +v.commissionPct;
    if (!(sf >= 0 && sf <= 30) || !(cm >= 0 && cm <= 40)) return toast('Revisa los porcentajes (cliente 0–30%, freelancer 0–40%)', 'warning');
    db.setValue('settings', { ...db.getValue('settings'), serviceFeePct: sf, commissionPct: cm, minWithdrawal: +v.minWithdrawal || 0, autoReleaseDays: +v.autoReleaseDays || 3, levels: Object.fromEntries(['nivel1', 'nivel2', 'top'].map(k => [k, { orders: +v[k + '_orders'] || 1, rating: +v[k + '_rating'] || 4 }])) });
    db.log('comisiones', `Comisiones actualizadas: cliente ${sf}% · freelancer ${cm}%`, me.id);
    toast('Ajustes guardados. El checkout ya usa las nuevas comisiones.', 'success');
  });
  el.querySelector('[data-reset]').onclick = resetDemo;
}
