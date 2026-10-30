// Login con cuentas demo por rol.
import { auth, HOME_BY_ROLE } from '../data/db.js';
import { $, toast } from '../../../assets/core/ui.js';

const next = new URLSearchParams(location.search).get('next');
const go = u => {
  toast(`Hola, ${u.name.split(' ')[0]}`, 'success');
  const staffPage = (next || '').startsWith('admin.html');
  const dest = next && (u.role !== 'suscriptor' || !staffPage) && !(u.role === 'suscriptor' && next.startsWith('app')) ? next : HOME_BY_ROLE[u.role];
  setTimeout(() => (location.href = dest), 300);
};
$('#login').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target; $('#err').textContent = '';
  try { go(await auth.login(f.email.value, f.password.value)); } catch (err) { $('#err').textContent = err.message; $('#err').style.color = 'var(--danger)'; }
});
auth.mountDemoLogin($('#demo'), { onLogin: go });
