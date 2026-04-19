export const setupCellLinkUtilsController = (deps = {}) => {
  const {
    mkLinkKey,
    rectUVToWorld,
    getCellTopology,
    getCellTopologyCached,
    drawCellX,
    drawCellY,
    getZoom,
    maskCellKey
  } = deps;

  const componentsAreRectangles = topo => {
    const stat = new Map();
    for (let i = 0; i < topo.count; i++) {
      const c = topo.comp[i], x = i % topo.cols, y = Math.floor(i / topo.cols);
      let s = stat.get(c);
      if (!s) { s = { minX: x, maxX: x, minY: y, maxY: y, count: 0 }; stat.set(c, s); }
      s.minX = Math.min(s.minX, x);
      s.maxX = Math.max(s.maxX, x);
      s.minY = Math.min(s.minY, y);
      s.maxY = Math.max(s.maxY, y);
      s.count++;
    }
    for (const s of stat.values()) {
      const area = (s.maxX - s.minX + 1) * (s.maxY - s.minY + 1);
      if (s.count !== area) return false;
    }
    return true;
  };

  const getCellToggleSegments = (r, cx, cy, topo) => {
    const segUnits = [];
    const cols = topo.cols, rows = topo.rows;
    const cid = (x, y) => topo.comp[y * cols + x];
    const mkCompPair = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
    for (let y = 1; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const a = (y - 1) * cols + x, b = y * cols + x, key = mkLinkKey(a, b), exists = topo.links.has(key), ca = cid(x, y - 1), cb = cid(x, y);
        if (exists) segUnits.push({ o: "h", line: y, pos: x, key, exists: true, group: `h:${y}:split:${ca}` });
        else if (ca !== cb) segUnits.push({ o: "h", line: y, pos: x, key, exists: false, group: `h:${y}:merge:${mkCompPair(ca, cb)}` });
      }
    }
    for (let x = 1; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const a = y * cols + (x - 1), b = y * cols + x, key = mkLinkKey(a, b), exists = topo.links.has(key), ca = cid(x - 1, y), cb = cid(x, y);
        if (exists) segUnits.push({ o: "v", line: x, pos: y, key, exists: true, group: `v:${x}:split:${ca}` });
        else if (ca !== cb) segUnits.push({ o: "v", line: x, pos: y, key, exists: false, group: `v:${x}:merge:${mkCompPair(ca, cb)}` });
      }
    }
    const byGroup = new Map();
    for (const u of segUnits) {
      const arr = byGroup.get(u.group) || [];
      arr.push(u);
      byGroup.set(u.group, arr);
    }
    const out = [];
    for (const units of byGroup.values()) {
      units.sort((a, b) => a.pos - b.pos);
      let run = [units[0]];
      const flush = () => {
        if (!run.length) return;
        const first = run[0], last = run[run.length - 1], keys = run.map(v => v.key), exists = first.exists;
        let u1 = 0, v1 = 0, u2 = 0, v2 = 0;
        if (first.o === "h") { u1 = first.pos * cx; u2 = Math.min(r.width, (last.pos + 1) * cx); v1 = Math.min(r.height, first.line * cy); v2 = v1; }
        else { u1 = Math.min(r.width, first.line * cx); u2 = u1; v1 = first.pos * cy; v2 = Math.min(r.height, (last.pos + 1) * cy); }
        const p1 = rectUVToWorld(r, u1, v1), p2 = rectUVToWorld(r, u2, v2);
        out.push({ keys, exists, p1, p2 });
        run = [];
      };
      for (let i = 1; i < units.length; i++) {
        if (units[i].pos === units[i - 1].pos + 1) run.push(units[i]);
        else { flush(); run = [units[i]]; }
      }
      flush();
    }
    for (const s of out) {
      if (s.exists) { s.canToggle = true; continue; }
      const next = { ...r, cellLinks: [...(Array.isArray(r.cellLinks) ? r.cellLinks : []), ...s.keys] };
      const topoNext = getCellTopology(next, cx, cy);
      s.canToggle = componentsAreRectangles(topoNext);
    }
    return out;
  };

  const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const vx = x2 - x1, vy = y2 - y1, wx = px - x1, wy = py - y1, den = vx * vx + vy * vy;
    const t = den > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / den)) : 0;
    const cx = x1 + t * vx, cy = y1 + t * vy;
    return Math.hypot(px - cx, py - cy);
  };

  const getCellLinkCandidateAtPoint = (r, wx, wy) => {
    const cx = drawCellX(r), cy = drawCellY(r), topo = getCellTopologyCached(r, cx, cy), segs = getCellToggleSegments(r, cx, cy, topo), thr = Math.max(6, 8 / Math.max(0.0001, Number(getZoom && getZoom()) || 1));
    let best = null;
    for (const s of segs) {
      const d = pointToSegmentDistance(wx, wy, s.p1.x, s.p1.y, s.p2.x, s.p2.y);
      if (d > thr) continue;
      if (!best || d < best.d) best = { ...s, d };
    }
    return best;
  };

  const getComponentBoundarySegments = (r, cx, cy, topo) => {
    const segs = [];
    const compAt = (x, y) => topo.comp[y * topo.cols + x];
    for (let ky = 0; ky <= topo.rows; ky++) {
      let run = -1;
      const isBoundary = x => {
        if (ky === 0 || ky === topo.rows) return true;
        return compAt(x, ky - 1) !== compAt(x, ky);
      };
      for (let x = 0; x <= topo.cols; x++) {
        const on = x < topo.cols && isBoundary(x);
        if (on && run < 0) run = x;
        if ((!on || x === topo.cols) && run >= 0) {
          const u1 = run * cx, u2 = Math.min(r.width, x * cx), v = Math.min(r.height, ky * cy), p1 = rectUVToWorld(r, u1, v), p2 = rectUVToWorld(r, u2, v);
          segs.push({ p1, p2 }); run = -1;
        }
      }
    }
    for (let kx = 0; kx <= topo.cols; kx++) {
      let run = -1;
      const isBoundary = y => {
        if (kx === 0 || kx === topo.cols) return true;
        return compAt(kx - 1, y) !== compAt(kx, y);
      };
      for (let y = 0; y <= topo.rows; y++) {
        const on = y < topo.rows && isBoundary(y);
        if (on && run < 0) run = y;
        if ((!on || y === topo.rows) && run >= 0) {
          const v1 = run * cy, v2 = Math.min(r.height, y * cy), u = Math.min(r.width, kx * cx), p1 = rectUVToWorld(r, u, v1), p2 = rectUVToWorld(r, u, v2);
          segs.push({ p1, p2 }); run = -1;
        }
      }
    }
    return segs;
  };

  const getVisibleBoundarySegmentsLocal = (w, h, cx, cy, hs) => {
    const cols = Math.max(1, Math.ceil(w / cx)), rows = Math.max(1, Math.ceil(h / cy)), vis = (x, y) => x >= 0 && x < cols && y >= 0 && y < rows && !hs.has(maskCellKey(x, y)), segs = [];
    for (let ky = 0; ky <= rows; ky++) {
      let run = -1;
      for (let x = 0; x <= cols; x++) {
        const on = x < cols && ((ky > 0 ? vis(x, ky - 1) : false) !== (ky < rows ? vis(x, ky) : false));
        if (on && run < 0) run = x;
        if ((!on || x === cols) && run >= 0) {
          const u1 = Math.min(w, run * cx), u2 = Math.min(w, x * cx), v = Math.min(h, ky * cy);
          segs.push({ x1: -w / 2 + u1, y1: -h / 2 + v, x2: -w / 2 + u2, y2: -h / 2 + v }); run = -1;
        }
      }
    }
    for (let kx = 0; kx <= cols; kx++) {
      let run = -1;
      for (let y = 0; y <= rows; y++) {
        const on = y < rows && ((kx > 0 ? vis(kx - 1, y) : false) !== (kx < cols ? vis(kx, y) : false));
        if (on && run < 0) run = y;
        if ((!on || y === rows) && run >= 0) {
          const v1 = Math.min(h, run * cy), v2 = Math.min(h, y * cy), u = Math.min(w, kx * cx);
          segs.push({ x1: -w / 2 + u, y1: -h / 2 + v1, x2: -w / 2 + u, y2: -h / 2 + v2 }); run = -1;
        }
      }
    }
    return segs;
  };

  return {
    componentsAreRectangles,
    getCellToggleSegments,
    pointToSegmentDistance,
    getCellLinkCandidateAtPoint,
    getComponentBoundarySegments,
    getVisibleBoundarySegmentsLocal
  };
};
