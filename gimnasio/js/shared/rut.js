// RUT chileno: cálculo de dígito verificador, formato y validación.
export function rutDV(n) {
  let s = 0, m = 2;
  for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
export const cleanRut = s => String(s || '').replace(/[^0-9kK]/g, '').toUpperCase();
export function fmtRut(s) {
  const c = cleanRut(s);
  if (c.length < 2) return c;
  const body = c.slice(0, -1), dv = c.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}
export function validRut(s) {
  const c = cleanRut(s);
  if (c.length < 8) return false;
  return rutDV(c.slice(0, -1)) === c.slice(-1);
}
export const sameRut = (a, b) => cleanRut(a) === cleanRut(b);
export const makeRut = n => fmtRut(String(n) + rutDV(n));
