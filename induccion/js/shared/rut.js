// RUT chileno: dígito verificador, validación y formato.
export function rutDV(body) {
  let sum = 0, mul = 2;
  for (let i = String(body).length - 1; i >= 0; i--) { sum += +String(body)[i] * mul; mul = mul === 7 ? 2 : mul + 1; }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
export const rutClean = v => String(v || '').toUpperCase().replace(/[^0-9K]/g, '');
// Devuelve { ok, value: '12.345.678-5', error }
export function parseRut(input) {
  const c = rutClean(input);
  if (c.length < 8 || c.length > 9) return { ok: false, error: 'Ingresa un RUT válido (ej: 12.345.678-5).' };
  const body = c.slice(0, -1), dv = c.slice(-1);
  if (!/^\d+$/.test(body)) return { ok: false, error: 'El RUT solo puede tener números y el dígito verificador.' };
  if (rutDV(body) !== dv) return { ok: false, error: 'El dígito verificador del RUT no es válido.' };
  return { ok: true, value: formatRut(body + dv) };
}
export function formatRut(v) {
  const c = rutClean(v);
  if (c.length < 2) return c;
  return c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + c.slice(-1);
}
export const makeRut = body => formatRut(String(body) + rutDV(body));
