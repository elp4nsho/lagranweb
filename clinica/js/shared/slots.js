// Genera los horarios de una plantilla { days, start, end, breakStart, breakEnd, slot }.
import { toMin, fromMin } from './dates.js';
export function templateSlots(s) {
  if (!s || !s.start || !s.end) return [];
  const out = [], step = Math.max(10, +s.slot || 20);
  const bs = s.breakStart ? toMin(s.breakStart) : -1, be = s.breakEnd ? toMin(s.breakEnd) : -1;
  for (let m = toMin(s.start); m + step <= toMin(s.end); m += step) {
    if (bs >= 0 && m < be && m + step > bs) continue;
    out.push(fromMin(m));
  }
  return out;
}
