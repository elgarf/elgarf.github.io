export const rads = deg => deg * Math.PI / 180;

export const rectCenter = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

export const worldToRectUV = (r, wx, wy) => {
  const a = rads(r.rotation || 0);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const c = rectCenter(r);
  const dx = wx - c.x;
  const dy = wy - c.y;
  const lx = dx * ca + dy * sa;
  const ly = -dx * sa + dy * ca;
  return { u: lx + r.width / 2, v: ly + r.height / 2 };
};

export const rectUVToWorld = (r, u, v) => {
  const a = rads(r.rotation || 0);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const c = rectCenter(r);
  const lx = u - r.width / 2;
  const ly = v - r.height / 2;
  return { x: c.x + lx * ca - ly * sa, y: c.y + lx * sa + ly * ca };
};

export const rectAABB = r => {
  const p1 = rectUVToWorld(r, 0, 0);
  const p2 = rectUVToWorld(r, r.width, 0);
  const p3 = rectUVToWorld(r, r.width, r.height);
  const p4 = rectUVToWorld(r, 0, r.height);
  return {
    minX: Math.min(p1.x, p2.x, p3.x, p4.x),
    minY: Math.min(p1.y, p2.y, p3.y, p4.y),
    maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
    maxY: Math.max(p1.y, p2.y, p3.y, p4.y)
  };
};

export const overlapArea = (a, b) => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
};

export const distToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const ll = dx * dx + dy * dy;
  if (ll <= 1e-9) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ll));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
};
