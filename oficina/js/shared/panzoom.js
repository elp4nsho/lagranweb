// Pan y zoom (ratón, rueda, pellizco) para un <svg> con un <g> viewport.
const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function panZoom(svg, vp, { W = 1200, H = 760, min = .8, max = 5, onTap, onMoveStart } = {}) {
  let view = { s: 1, x: 0, y: 0 }, anim = null;
  const pointers = new Map();
  let gesture = null;
  const clamp = () => {
    view.s = Math.max(min, Math.min(max, view.s));
    const m = 260;
    view.x = Math.max(Math.min(0, W - W * view.s) - m, Math.min(Math.max(0, W - W * view.s) + m, view.x));
    view.y = Math.max(Math.min(0, H - H * view.s) - m, Math.min(Math.max(0, H - H * view.s) + m, view.y));
  };
  const apply = () => { clamp(); vp.setAttribute('transform', `translate(${view.x.toFixed(2)} ${view.y.toFixed(2)}) scale(${view.s.toFixed(4)})`); };
  const pt = (cx, cy) => {
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: W / 2, y: H / 2 };
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const q = p.matrixTransform(ctm.inverse()); return { x: q.x, y: q.y };
  };
  function animateTo(t, done) {
    if (anim) cancelAnimationFrame(anim);
    if (reduce()) { view = { ...t }; apply(); done && done(); return; }
    const from = { ...view }, start = performance.now(), dur = 600;
    const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const step = now => {
      const k = Math.min(1, (now - start) / dur), e = ease(k);
      view.s = from.s + (t.s - from.s) * e; view.x = from.x + (t.x - from.x) * e; view.y = from.y + (t.y - from.y) * e;
      apply();
      if (k < 1) anim = requestAnimationFrame(step); else { anim = null; done && done(); }
    };
    anim = requestAnimationFrame(step);
  }
  function fitScale() {
    const r = svg.getBoundingClientRect();
    if (r.width && r.height) { const f = r.height / r.width; if (f > .9) return Math.min(1.9, f / .633 * .75); }
    return 1;
  }
  const api = {
    get view() { return view; },
    reset(animate) { const s = fitScale(); const t = { s, x: W / 2 - W / 2 * s, y: H / 2 - H / 2 * s }; animate ? animateTo(t) : (view = t, apply()); },
    focus(x, y, s, done) { const r = svg.getBoundingClientRect(); s = s || (r.width < 600 ? 3 : 2.2); animateTo({ s, x: W / 2 - x * s, y: H / 2 - y * s }, done); },
    zoom(f) { const s2 = Math.max(min, Math.min(max, view.s * f)); animateTo({ s: s2, x: W / 2 - (W / 2 - view.x) * (s2 / view.s), y: H / 2 - (H / 2 - view.y) * (s2 / view.s) }); },
    apply
  };
  svg.addEventListener('wheel', e => {
    e.preventDefault(); onMoveStart && onMoveStart();
    const p = pt(e.clientX, e.clientY), s2 = Math.max(min, Math.min(max, view.s * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018))));
    view.x = p.x - (p.x - view.x) * (s2 / view.s); view.y = p.y - (p.y - view.y) * (s2 / view.s); view.s = s2; apply();
  }, { passive: false });
  svg.addEventListener('pointerdown', e => {
    if (e.button) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    if (pointers.size === 1) gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, target: e.target, ptype: e.pointerType, id: e.pointerId };
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid0: pt((a.x + b.x) / 2, (a.y + b.y) / 2), s0: view.s, x0: view.x, y0: view.y, moved: true };
      onMoveStart && onMoveStart();
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;
    if (gesture.type === 'pan' && pointers.size === 1) {
      const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) > 6) { gesture.moved = true; svg.classList.add('dragging'); try { svg.setPointerCapture(gesture.id); } catch (err) { /* */ } onMoveStart && onMoveStart(); }
      if (gesture.moved) { const k = svg.getScreenCTM()?.a || 1; view.x = gesture.vx + dx / k; view.y = gesture.vy + dy / k; apply(); }
    } else if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
      const s2 = Math.max(min, Math.min(max, gesture.s0 * d / gesture.d0));
      view.s = s2;
      view.x = gesture.mid0.x - (gesture.mid0.x - gesture.x0) * (s2 / gesture.s0) + (mid.x - gesture.mid0.x);
      view.y = gesture.mid0.y - (gesture.mid0.y - gesture.y0) * (s2 / gesture.s0) + (mid.y - gesture.mid0.y);
      apply();
    }
  });
  const end = e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    svg.classList.remove('dragging');
    if (gesture && gesture.type === 'pan' && !gesture.moved && e.type === 'pointerup') onTap && onTap(gesture.target, gesture.ptype);
    if (pointers.size === 1 && gesture?.type === 'pinch') { const p = [...pointers.values()][0]; gesture = { type: 'pan', sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: true }; }
    else if (!pointers.size) gesture = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  return api;
}
