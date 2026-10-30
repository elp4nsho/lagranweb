// Plano SVG de un piso (viewBox 1200×760). Lo usan el mapa público, la reserva de
// puestos, el kiosko y el editor de planos. Todo se colorea con tokens (ver app.css).
import { escape } from '../../../assets/core/ui.js';
import { initials, STATUS } from './util.js';

export const W = 1200, H = 760;

export function furniture(rm) {
  const { x, y, w, h } = rm; let o = '';
  const cx = x + w / 2, cy = y + h / 2 + 14;
  if (rm.type === 'meeting') {
    const tw = Math.min(w * .58, 140), th = Math.min(h * .3, 46);
    o += `<rect class="furn" x="${cx - tw / 2}" y="${cy - th / 2}" width="${tw}" height="${th}" rx="10"/>`;
    const n = Math.max(2, Math.floor(tw / 30));
    for (let i = 0; i < n; i++) { const px = cx - tw / 2 + (tw / n) * (i + .5); o += `<circle class="furn" cx="${px}" cy="${cy - th / 2 - 10}" r="7"/><circle class="furn" cx="${px}" cy="${cy + th / 2 + 10}" r="7"/>`; }
  } else if (rm.type === 'boardroom') {
    o += `<ellipse class="furn" cx="${cx}" cy="${cy}" rx="${w * .33}" ry="${h * .18}"/>`;
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; o += `<circle class="furn" cx="${(cx + Math.cos(a) * (w * .33 + 14)).toFixed(1)}" cy="${(cy + Math.sin(a) * (h * .18 + 12)).toFixed(1)}" r="7"/>`; }
  } else if (rm.type === 'kitchen') {
    o += `<rect class="furn" x="${x + 12}" y="${y + h - 30}" width="${Math.max(0, w - 24)}" height="18" rx="4"/>`;
    const tables = w > 200 ? 2 : 1;
    for (let t = 0; t < tables; t++) {
      const tx = x + (w / (tables + 1)) * (t + 1), ty = y + h / 2 + 2;
      o += `<circle class="furn" cx="${tx}" cy="${ty}" r="17"/>`;
      [[-27, 0], [27, 0], [0, -27], [0, 27]].forEach(d => { if (ty + d[1] < y + h - 34) o += `<circle class="furn" cx="${tx + d[0]}" cy="${ty + d[1]}" r="6"/>`; });
    }
  } else if (rm.type === 'wc') {
    const sw = (w - 24) / 3;
    for (let s = 0; s < 3; s++) o += `<rect class="furn-s" x="${x + 12 + s * sw}" y="${y + h - 62}" width="${Math.max(0, sw - 6)}" height="50" rx="4"/>`;
  } else if (rm.type === 'reception') {
    o += `<path class="furn-s" style="stroke-width:14;stroke-linecap:round" d="M${x + 60} ${y + h * .6} Q ${x + w / 2} ${y + h * .87} ${x + w - 60} ${y + h * .6}"/>`;
    o += `<circle class="furn" cx="${x + w / 2}" cy="${y + h * .6}" r="9"/>`;
  } else if (rm.type === 'lounge') {
    o += `<rect class="furn" x="${x + 24}" y="${y + h - 48}" width="${Math.max(0, Math.min(w - 48, 160))}" height="26" rx="10"/>`;
    o += `<rect class="furn" x="${x + 24}" y="${y + 56}" width="26" height="${Math.max(0, h - 110)}" rx="10"/>`;
    o += `<circle class="furn" cx="${x + Math.min(w * .55, 120)}" cy="${y + h / 2 + 10}" r="20"/>`;
  } else if (rm.type === 'elevator') {
    const ew = Math.min(w - 36, 70), eh = 46;
    for (let e = 0; e < 3; e++) {
      const ey = y + 52 + e * (eh + 16);
      if (ey + eh > y + h - 8) break;
      o += `<rect class="furn" x="${x + (w - ew) / 2}" y="${ey}" width="${ew}" height="${eh}" rx="4"/><line class="door" x1="${x + w / 2}" y1="${ey + 4}" x2="${x + w / 2}" y2="${ey + eh - 4}" style="stroke-width:2"/>`;
    }
  } else if (rm.type === 'booths') {
    const bh = 50, nb = Math.floor((h - 50) / (bh + 8));
    for (let b = 0; b < nb; b++) o += `<rect class="furn-s" x="${x + 14}" y="${y + 44 + b * (bh + 8)}" width="${Math.max(0, w - 28)}" height="${bh}" rx="6"/>`;
  } else if (rm.type === 'it') {
    for (let q = 0; q < 4 && 16 + q * 38 + 28 < w; q++) o += `<rect class="furn" x="${x + 16 + q * 38}" y="${y + h - 70}" width="28" height="56" rx="3"/>`;
  }
  return o;
}

export function roomSVG(rm, { status, selected } = {}) {
  let o = `<g class="room-g${selected ? ' sel' : ''}" data-room="${rm.id}">`;
  o += `<rect class="room r-${rm.type}" x="${rm.x}" y="${rm.y}" width="${rm.w}" height="${rm.h}" rx="10"/>`;
  const doorY = rm.y + rm.h, doorX = rm.x + rm.w / 2 - 22;
  if (rm.y + rm.h < 700) o += `<line class="door" x1="${doorX}" y1="${doorY}" x2="${doorX + 44}" y2="${doorY}"/>`;
  else o += `<line class="door" x1="${rm.x + rm.w}" y1="${rm.y + 40}" x2="${rm.x + rm.w}" y2="${rm.y + 84}"/>`;
  o += furniture(rm);
  o += `<text class="room-label" x="${rm.x + 14}" y="${rm.y + 26}">${escape(rm.name)}</text>`;
  if (rm.cap && status) o += `<circle class="${status.busy ? 'room-busy' : 'room-ok'}" cx="${rm.x + 19}" cy="${rm.y + 42}" r="4.5"/><text class="room-sub" x="${rm.x + 29}" y="${rm.y + 46}">${status.busy ? 'En uso' : 'Disponible'} · ${rm.cap} pers.</text>`;
  else if (rm.cap) o += `<text class="room-sub" x="${rm.x + 14}" y="${rm.y + 46}">${rm.cap} personas</text>`;
  return o + '</g>';
}

export function deskSVG(d) {
  return `<g class="desk-g" transform="translate(${d.x} ${d.y}) rotate(${d.rot || 0})"><rect class="desk" x="-33" y="-21" width="66" height="42" rx="5"/></g>`;
}
export const chairPos = d => ({ x: d.x, y: d.y + ((d.rot || 0) === 180 ? 43 : -43) });

export function zoneBoxes(floor, label = z => z.name) {
  let o = '';
  (floor.zones || []).forEach(z => {
    const ds = floor.desks.filter(d => d.zoneId === z.id);
    if (!ds.length) return;
    const xs = ds.map(d => d.x), ys = ds.flatMap(d => [d.y - 66, d.y + 66]);
    const x0 = Math.min(...xs) - 44, x1 = Math.max(...xs) + 44, y0 = Math.min(...ys) - 4, y1 = Math.max(...ys) + 4;
    o += `<rect class="zone-box" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="14"/><text class="cl-label" x="${x0 + 8}" y="${y1 + 18}">${escape(label(z))}</text>`;
  });
  return o;
}

// Asiento con estado: free | res | checked | occ | meet | away | blocked | mine
export function seatSVG(d, st, { highlight, me, interactive = true, bookable } = {}) {
  const c = chairPos(d), p = st.person;
  const cls = `seat s-${st.state}${p && me && p.id === me ? ' mine' : ''}${highlight === d.id ? ' hl' : ''}${bookable === false && st.state === 'free' ? ' s-locked' : ''}`;
  let label, inner;
  if (st.state === 'free' || st.state === 'blocked') {
    label = `Puesto ${d.code}: ${st.state === 'blocked' ? 'bloqueado' : 'libre'}`;
    inner = `<circle class="bg" r="17"/><text>${st.state === 'blocked' ? '×' : '+'}</text>`;
  } else {
    const desc = { occ: 'en oficina', meet: 'en reunión', away: `${(STATUS[p.status]?.label || '').toLowerCase()} (ausente)`, res: 'reservado, sin check-in', checked: 'reserva con check-in' }[st.state];
    label = `Puesto ${d.code}: ${p.name}, ${p.cargo}, ${desc}`;
    inner = `<circle class="bg" r="19"${st.state === 'res' || st.state === 'away' ? '' : ` style="fill:${escape(p.color)}"`}/><text>${escape(initials(p.name))}</text>`;
    if (st.state === 'meet') inner += '<circle class="badge-dot meet" cx="14" cy="-14" r="6"/>';
    if (st.state === 'checked') inner += '<circle class="badge-dot chk" cx="14" cy="-14" r="6"/>';
  }
  const attrs = interactive ? ` tabindex="0" role="button" aria-label="${escape(label)}"` : ' aria-hidden="true"';
  return `<g class="${cls}" data-seat="${d.id}" transform="translate(${c.x} ${c.y})"${p ? ` style="--sc:${escape(p.color)}"` : ''}${attrs}><title>${escape(label)}</title><circle class="ring" r="24"/>${inner}</g>`;
}

export function floorBase(floor) {
  let o = `<rect class="fl-floor" x="20" y="20" width="1160" height="720" rx="18"/>`;
  let g = '';
  for (let gx = 60; gx < 1180; gx += 40) g += `M${gx} 24V736`;
  for (let gy = 60; gy < 740; gy += 40) g += `M24 ${gy}H1176`;
  return o + `<path class="fl-grid" d="${g}"/>`;
}
export const compass = () => '<g transform="translate(1146 714)"><circle r="14" class="furn-s" style="fill:none;stroke-width:2"/><path d="M0 -10 L5 4 L0 1 L-5 4Z" class="compass"/><text class="compass" y="-18" text-anchor="middle">N</text></g>';
export const pulse = (x, y) => `<circle class="pulse" cx="${x}" cy="${y}" r="22"/><circle class="pulse p2" cx="${x}" cy="${y}" r="22"/>`;

// Plano completo con estados. idx = buildIndex(); opts: { highlight, me, interactive, roomStatus(rm), bookable(desk) }
export function floorSVG(floor, idx, opts = {}) {
  let o = floorBase(floor);
  const zl = z => z.areaId && idx.areaById[z.areaId] ? `${z.name} · ${idx.areaById[z.areaId].name}` : z.name;
  o += zoneBoxes(floor, zl);
  (floor.rooms || []).forEach(rm => { o += roomSVG(rm, { status: opts.roomStatus ? opts.roomStatus(rm) : null }); });
  (floor.desks || []).forEach(d => { o += deskSVG(d); });
  (floor.desks || []).forEach(d => {
    const st = opts.stateOf ? opts.stateOf(d) : idx.deskState(d.id);
    o += seatSVG(d, st, { highlight: opts.highlight, me: opts.me, interactive: opts.interactive !== false, bookable: opts.bookable ? opts.bookable(d) : undefined });
  });
  o += compass();
  if (opts.highlight) {
    const d = floor.desks.find(x => x.id === opts.highlight);
    if (d) { const c = chairPos(d); o += pulse(c.x, c.y); }
  }
  return o;
}

// Mini-mapa centrado en un puesto (kiosko, perfil).
export function miniMap(floor, idx, deskId, { w = 640, h = 380 } = {}) {
  const d = floor.desks.find(x => x.id === deskId);
  if (!d) return '';
  const c = chairPos(d);
  const vx = Math.max(0, Math.min(W - w, c.x - w / 2)), vy = Math.max(0, Math.min(H - h, c.y - h / 2));
  return `<svg class="fp mini-map" viewBox="${vx} ${vy} ${w} ${h}" role="img" aria-label="Plano del ${escape(floor.name)} con el puesto ${escape(d.code)} destacado">${floorSVG(floor, idx, { interactive: false, highlight: deskId })}</svg>`;
}
