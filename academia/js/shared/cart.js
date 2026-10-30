// Carrito del visitante (comodidad por navegador): lista de ids de curso en localStorage.
const KEY = 'faro:cart';
const listeners = new Set();
export function getCart() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return mem; } }
let mem = [];
function save(v) { mem = v; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } listeners.forEach(f => f(v)); }
export const inCart = id => getCart().includes(id);
export const addToCart = id => { if (!inCart(id)) save([...getCart(), id]); };
export const removeFromCart = id => save(getCart().filter(x => x !== id));
export const clearCart = () => save([]);
export const onCart = fn => { listeners.add(fn); return () => listeners.delete(fn); };
window.addEventListener('storage', e => { if (e.key === KEY) listeners.forEach(f => f(getCart())); });
