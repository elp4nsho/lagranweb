// Favoritos del cliente (corazón en las tarjetas de servicio).
import { db, auth } from '../data/db.js';
import { toast } from '../../../assets/core/ui.js';

// Devuelve la lista de favoritos si hay un cliente con sesión; null si no corresponde mostrar el botón.
export function favState() {
  const u = auth.current();
  if (!u) return [];
  return u.role === 'cliente' ? (u.favorites || []) : null;
}
export function wireFavs(root) {
  if (root.__favs) return;
  root.__favs = true;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault();
    const u = auth.current();
    if (!u) { toast('Ingresa como cliente para guardar favoritos', 'info'); setTimeout(() => { location.href = 'login.html?next=' + encodeURIComponent('index.html' + location.hash); }, 700); return; }
    const favs = new Set(u.favorites || []);
    const on = !favs.has(b.dataset.fav);
    on ? favs.add(b.dataset.fav) : favs.delete(b.dataset.fav);
    db.update('users', u.id, { favorites: [...favs] });
    toast(on ? 'Guardado en favoritos' : 'Quitado de favoritos', 'success');
  });
}
