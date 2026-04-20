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

export const maskCellKey = (ix, iy) => `${ix},${iy}`;

export const pointInPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const inter = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (inter) inside = !inside;
  }
  return inside;
};

export const getOriginFromRects = rects => {
  const list = Array.isArray(rects) ? rects : [];
  if (!list.length) return { x: 0, y: 0 };
  let x = 1e9;
  let y = 1e9;
  for (const r of list) {
    x = Math.min(x, Number(r && r.x) || 0);
    y = Math.min(y, Number(r && r.y) || 0);
  }
  return { x, y };
};

export const createCellFromWorldPoint = (deps = {}) => {
  const { drawCellX, drawCellY, getHiddenSet, worldToRectUV: worldToRectUvFn } = deps;
  return (r, wx, wy, skipHidden = true) => {
    if (!r) return null;
    const p = worldToRectUvFn(r, wx, wy), cx = drawCellX(r), cy = drawCellY(r), cols = Math.max(1, Math.ceil(r.width / cx)), rows = Math.max(1, Math.ceil(r.height / cy)), ix = Math.floor(p.u / cx), iy = Math.floor(p.v / cy);
    if (!(ix >= 0 && ix < cols && iy >= 0 && iy < rows)) return null;
    const hs = getHiddenSet(r);
    if (skipHidden && hs && hs.has(maskCellKey(ix, iy))) return null;
    return { col: ix, row: iy };
  };
};

export const hiddenCellBoxes = (r, cx, cy, hs) => {
  if (!hs || !hs.size) return [];
  const arr = [];
  for (const key of hs) {
    const p = String(key).split(",");
    if (p.length !== 2) continue;
    const ix = +p[0], iy = +p[1];
    if (!(ix >= 0 && iy >= 0)) continue;
    const x = ix * cx, y = iy * cy;
    if (x >= r.width || y >= r.height) continue;
    arr.push({ x: r.x + x, y: r.y + y, w: Math.min(cx, r.width - x), h: Math.min(cy, r.height - y) });
  }
  return arr;
};

export const computeFreeRects = (r, cx, cy, hs) => {
  const cols = Math.max(1, Math.ceil(r.width / cx)), rows = Math.max(1, Math.ceil(r.height / cy));
  const heights = new Array(cols).fill(0), out = [], seen = new Set();
  const mkRect = (l, rt, top, btm) => {
    const x0 = l * cx, y0 = top * cy, x1 = Math.min(r.width, (rt + 1) * cx), y1 = Math.min(r.height, (btm + 1) * cy);
    return { x: r.x + x0, y: r.y + y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) { heights[col] = hs.has(maskCellKey(col, row)) ? 0 : heights[col] + 1; }
    for (let right = 0; right < cols; right++) {
      if (!heights[right]) continue;
      let minH = 1e9;
      for (let left = right; left >= 0; left--) {
        if (!heights[left]) break;
        minH = Math.min(minH, heights[left]);
        const top = row - minH + 1, rect = mkRect(left, right, top, row), k = `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.w)}:${Math.round(rect.h)}`;
        if (rect.w <= 0 || rect.h <= 0 || seen.has(k)) continue;
        seen.add(k);
        out.push(rect);
      }
    }
  }
  if (!out.length) return [{ x: r.x, y: r.y, w: r.width, h: r.height }];
  out.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  return out.slice(0, 120);
};

export const createMaskNodeAxesGetter = (drawCellX, drawCellY) => r => {
  const cx = drawCellX(r), cy = drawCellY(r), xs = [], ys = [];
  for (let x = 0; x <= r.width; x += cx) xs.push(x);
  if (xs[xs.length - 1] !== r.width) xs.push(r.width);
  for (let y = 0; y <= r.height; y += cy) ys.push(y);
  if (ys[ys.length - 1] !== r.height) ys.push(r.height);
  return { xs, ys };
};
