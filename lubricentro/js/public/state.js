// Estado del visitante (vehículo elegido, borrador de reserva) guardado en el navegador.
const K = 'pr:visitor';
let mem = {};
const read = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return mem; } };
export const visitor = {
  get: () => ({ ...read() }),
  set(patch) { const v = { ...read(), ...patch }; mem = v; try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} return v; }
};
