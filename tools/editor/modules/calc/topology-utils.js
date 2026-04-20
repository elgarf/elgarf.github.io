export const setupTopologyUtils = (deps = {}) => {
  const { parseLinkKey, mkLinkKey, buildTopoCalcKey, listSignature, maskCellKey } = deps;

  const getCellTopology = (r, cx, cy) => {
    const cols = Math.max(1, Math.ceil(r.width / cx)), rows = Math.max(1, Math.ceil(r.height / cy)), count = cols * rows, linksRaw = Array.isArray(r.cellLinks) ? r.cellLinks : [], links = new Set();
    for (const raw of linksRaw) {
      const p = parseLinkKey(raw);
      if (!p) continue;
      if (p.a >= count || p.b >= count) continue;
      const ax = p.a % cols, ay = Math.floor(p.a / cols), bx = p.b % cols, by = Math.floor(p.b / cols);
      if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) continue;
      links.add(mkLinkKey(p.a, p.b));
    }
    if (!Array.isArray(r.cellLinks) || r.cellLinks.length !== links.size || r.cellLinks.some(k => !links.has(k))) { r.cellLinks = [...links]; }
    const comp = new Array(count).fill(-1), seed = []; let ci = 0;
    const neigh = i => { const x = i % cols, y = Math.floor(i / cols), out = []; if (x > 0) out.push(i - 1); if (x < cols - 1) out.push(i + 1); if (y > 0) out.push(i - cols); if (y < rows - 1) out.push(i + cols); return out; };
    for (let i = 0; i < count; i++) {
      if (comp[i] !== -1) continue;
      const stack = [i]; comp[i] = ci; let bestX = i % cols, bestY = Math.floor(i / cols);
      while (stack.length) {
        const v = stack.pop(), vx = v % cols, vy = Math.floor(v / cols);
        if (vy < bestY || (vy === bestY && vx < bestX)) { bestX = vx; bestY = vy; }
        for (const n of neigh(v)) {
          if (comp[n] !== -1) continue;
          if (!links.has(mkLinkKey(v, n))) continue;
          comp[n] = ci; stack.push(n);
        }
      }
      seed[ci] = { col: bestX, row: bestY }; ci++;
    }
    const adj = Array.from({ length: ci }, () => new Set());
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x, ci0 = comp[i];
        if (x + 1 < cols) { const j = i + 1, cj = comp[j]; if (ci0 !== cj) { adj[ci0].add(cj); adj[cj].add(ci0); } }
        if (y + 1 < rows) { const j = i + cols, cj = comp[j]; if (ci0 !== cj) { adj[ci0].add(cj); adj[cj].add(ci0); } }
      }
    }
    const color = new Array(ci).fill(-1);
    for (let c0 = 0; c0 < ci; c0++) {
      if (color[c0] !== -1) continue;
      color[c0] = 0;
      const q = [c0];
      while (q.length) {
        const v = q.shift();
        for (const n of adj[v]) {
          if (color[n] === -1) { color[n] = 1 - color[v]; q.push(n); }
        }
      }
    }
    return { cols, rows, count, links, comp, seed, color };
  };

  const topoCalcKey = (r, cx, cy) => buildTopoCalcKey(r, cx, cy, listSignature);

  const buildSingleRegionPlan = (r, cx, cy, topo, hs) => {
    const cols = Math.max(1, topo && topo.cols || 1), rows = Math.max(1, topo && topo.rows || 1);
    const reg = { id: 0, label: "A", gx: 0, gy: 0, c0: 0, c1: cols, r0: 0, r1: rows, w: r.width, h: r.height };
    const byId = new Map(); byId.set(0, reg);
    const cellToRegion = new Array(rows * cols).fill(0);
    if (hs && hs.size) {
      for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
          if (hs.has(maskCellKey(ix, iy))) cellToRegion[iy * cols + ix] = -1;
        }
      }
    }
    return {
      nx: 1, ny: 1,
      colToGroup: new Array(cols).fill(0),
      rowToGroup: new Array(rows).fill(0),
      regionsById: byId,
      xCutsPx: [0, r.width], yCutsPx: [0, r.height],
      cellToRegion,
      regions: [reg]
    };
  };

  return {
    getCellTopology,
    topoCalcKey,
    buildSingleRegionPlan
  };
};
