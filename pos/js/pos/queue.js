// Simulación de modo sin conexión: las ventas quedan en una cola local y se sincronizan al volver.
import { api } from '../../../assets/core/db.js';
import { toast } from '../../../assets/core/ui.js';
import { commitSale } from '../data/db.js';

const QK = 'pampa:queue', OK = 'pampa:offline';
const listeners = new Set();
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } };
let syncing = false;
const emit = () => listeners.forEach(fn => fn());

export const queue = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  items: () => read(QK, []),
  get count() { return read(QK, []).length; },
  get offline() { return read(OK, false) || !navigator.onLine; },
  get syncing() { return syncing; },
  add(sale) { write(QK, [...read(QK, []), sale]); emit(); },
  setOffline(v) { write(OK, v); emit(); if (!v) this.sync(); },
  // Cantidades vendidas sin sincronizar (para mostrar stock disponible real en la grilla).
  pendingQty(branchId) {
    const out = {};
    read(QK, []).filter(s => s.branchId === branchId).forEach(s => s.items.forEach(i => { out[i.productId] = (out[i.productId] || 0) + i.qty; }));
    return out;
  },
  async sync() {
    if (syncing || this.offline || !this.count) return;
    syncing = true; emit();
    let n = 0;
    while (read(QK, []).length && !this.offline) {
      const [first, ...rest] = read(QK, []);
      await api(() => commitSale({ ...first, offline: true }), { latency: [350, 650] });
      write(QK, rest); n++; emit();
    }
    syncing = false; emit();
    if (n) toast(`${n} venta(s) sincronizada(s) con el servidor`, 'success');
  }
};
window.addEventListener('online', () => { emit(); queue.sync(); });
window.addEventListener('offline', emit);
window.addEventListener('storage', e => { if (e.key === QK || e.key === OK) emit(); });
