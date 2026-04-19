export const setupManualClustersController = (deps = {}) => {
  const {
    st,
    normalizeManualClusters,
    invalidateRectCache,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    AREA_LIMIT_EPS
  } = deps;

  const clearRectRegionsAndFlow = r => invalidateRectCache(r, "regions");
  const getMaxRegionAreaPx = r => (Math.max(1, Number(r && r.scale) || 256) * Math.max(1, Number(r && r.scale) || 256) * 655360) / Math.max(1, Number(r && r.areaM2Px) || 65536);
  const getManualClusters = r => {
    if (!r || typeof r !== "object") return [];
    const norm = normalizeManualClusters(r.manualClusters);
    r.manualClusters = norm;
    return norm;
  };
  const manualClustersSignature = r => {
    const list = getManualClusters(r);
    if (!list.length) return "";
    return list.map(z => `${z.id}:${z.sx},${z.sy},${z.c0},${z.c1},${z.r0},${z.r1}`).sort().join(";");
  };
  const getCellMetrics = (r, cx, cy) => {
    const cols = Math.max(1, Math.ceil((Number(r && r.width) || 1) / Math.max(1, cx || 1)));
    const rows = Math.max(1, Math.ceil((Number(r && r.height) || 1) / Math.max(1, cy || 1)));
    const cellW = [];
    const cellH = [];
    for (let x = 0; x < r.width; x += cx) cellW.push(Math.min(cx, r.width - x));
    for (let y = 0; y < r.height; y += cy) cellH.push(Math.min(cy, r.height - y));
    const colPref = [0];
    const rowPref = [0];
    for (let i = 0; i < cellW.length; i++) colPref.push(colPref[i] + cellW[i]);
    for (let i = 0; i < cellH.length; i++) rowPref.push(rowPref[i] + cellH[i]);
    return { cols, rows, colPref, rowPref };
  };
  const clusterAreaPx = (cluster, m) => {
    if (!cluster || !m) return 0;
    const c0 = Math.max(0, Math.min(m.cols, Math.round(Number(cluster.c0) || 0)));
    const c1 = Math.max(c0 + 1, Math.min(m.cols, Math.round(Number(cluster.c1) || 0)));
    const r0 = Math.max(0, Math.min(m.rows, Math.round(Number(cluster.r0) || 0)));
    const r1 = Math.max(r0 + 1, Math.min(m.rows, Math.round(Number(cluster.r1) || 0)));
    return Math.max(0, (m.colPref[c1] - m.colPref[c0]) * (m.rowPref[r1] - m.rowPref[r0]));
  };
  const rectsOverlapCells = (a, b) => Math.min(a.c1, b.c1) > Math.max(a.c0, b.c0) && Math.min(a.r1, b.r1) > Math.max(a.r0, b.r0);
  const findManualClusterById = (r, id) => getManualClusters(r).find(z => Math.round(Number(z.id) || 0) === Math.round(Number(id) || 0)) || null;
  const findManualClusterAtCell = (r, col, row) => getManualClusters(r).find(z => col >= z.c0 && col < z.c1 && row >= z.r0 && row < z.r1) || null;
  const normalizeClusterByMergedComponents = (r, cand) => {
    if (!r || !cand) return null;
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const cols = Math.max(1, topo && topo.cols || 1);
    const rows = Math.max(1, topo && topo.rows || 1);
    let out = {
      c0: Math.max(0, Math.min(cols - 1, Math.round(Number(cand.c0) || 0))),
      c1: Math.max(1, Math.min(cols, Math.round(Number(cand.c1) || 0))),
      r0: Math.max(0, Math.min(rows - 1, Math.round(Number(cand.r0) || 0))),
      r1: Math.max(1, Math.min(rows, Math.round(Number(cand.r1) || 0)))
    };
    if (out.c1 <= out.c0 || out.r1 <= out.r0) return null;
    const compBBoxes = new Map();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const cid = topo.comp[idx];
        let b = compBBoxes.get(cid);
        if (!b) {
          b = { c0: x, c1: x + 1, r0: y, r1: y + 1 };
          compBBoxes.set(cid, b);
        } else {
          if (x < b.c0) b.c0 = x;
          if (x + 1 > b.c1) b.c1 = x + 1;
          if (y < b.r0) b.r0 = y;
          if (y + 1 > b.r1) b.r1 = y + 1;
        }
      }
    }
    let changed = true;
    let safe = 0;
    while (changed && safe < 128) {
      safe++;
      changed = false;
      for (const b of compBBoxes.values()) {
        const intersects = Math.min(out.c1, b.c1) > Math.max(out.c0, b.c0) && Math.min(out.r1, b.r1) > Math.max(out.r0, b.r0);
        if (!intersects) continue;
        const fullyInside = (b.c0 >= out.c0 && b.c1 <= out.c1 && b.r0 >= out.r0 && b.r1 <= out.r1);
        if (fullyInside) continue;
        const n = { c0: Math.min(out.c0, b.c0), c1: Math.max(out.c1, b.c1), r0: Math.min(out.r0, b.r0), r1: Math.max(out.r1, b.r1) };
        if (n.c0 !== out.c0 || n.c1 !== out.c1 || n.r0 !== out.r0 || n.r1 !== out.r1) { out = n; changed = true; }
      }
      if (out.c0 < 0 || out.r0 < 0 || out.c1 > cols || out.r1 > rows) return null;
    }
    return out;
  };
  const clusterCanPlace = (r, cand, ignoreId = null) => {
    if (!r || !cand) return false;
    const norm = normalizeClusterByMergedComponents(r, cand);
    if (!norm) return false;
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const m = getCellMetrics(r, cx, cy);
    const maxArea = getMaxRegionAreaPx(r);
    if (norm.c0 < 0 || norm.r0 < 0 || norm.c1 > m.cols || norm.r1 > m.rows || norm.c1 <= norm.c0 || norm.r1 <= norm.r0) return false;
    if (clusterAreaPx(norm, m) > maxArea + AREA_LIMIT_EPS) return false;
    const clusters = getManualClusters(r);
    for (const z of clusters) {
      if (ignoreId != null && Math.round(Number(z.id) || 0) === Math.round(Number(ignoreId) || 0)) continue;
      if (rectsOverlapCells(norm, z)) return false;
    }
    return true;
  };
  const upsertManualCluster = (r, cluster) => {
    if (!r || !cluster) return false;
    const list = getManualClusters(r);
    const id = Math.max(1, Math.round(Number(cluster.id) || 0) || 1);
    const idx = list.findIndex(z => Math.round(Number(z.id) || 0) === id);
    const base = {
      id,
      sx: Math.max(0, Math.round(Number(cluster.sx) || 0)),
      sy: Math.max(0, Math.round(Number(cluster.sy) || 0)),
      c0: Math.max(0, Math.round(Number(cluster.c0) || 0)),
      c1: Math.max(1, Math.round(Number(cluster.c1) || 1)),
      r0: Math.max(0, Math.round(Number(cluster.r0) || 0)),
      r1: Math.max(1, Math.round(Number(cluster.r1) || 1))
    };
    const norm = normalizeClusterByMergedComponents(r, base);
    if (!norm) return false;
    const next = { ...base, ...norm };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    r.manualClusters = normalizeManualClusters(list);
    r.splitVariant = 0;
    clearRectRegionsAndFlow(r);
    return true;
  };
  const removeManualCluster = (r, id) => {
    if (!r) return false;
    const list = getManualClusters(r);
    const next = list.filter(z => Math.round(Number(z.id) || 0) !== Math.round(Number(id) || 0));
    if (next.length === list.length) return false;
    r.manualClusters = normalizeManualClusters(next);
    r.splitVariant = 0;
    clearRectRegionsAndFlow(r);
    if (st && st.clusterActiveId != null && Math.round(Number(st.clusterActiveId) || 0) === Math.round(Number(id) || 0)) st.clusterActiveId = null;
    return true;
  };
  const nextManualClusterId = r => {
    const used = new Set(getManualClusters(r).map(z => Math.max(1, Math.round(Number(z.id) || 0))));
    let id = 1;
    while (used.has(id)) id++;
    return id;
  };
  const expandManualCluster = (r, id, dir) => {
    const z = findManualClusterById(r, id);
    if (!z) return false;
    const cand = { ...z };
    if (dir === "left") cand.c0--;
    else if (dir === "right") cand.c1++;
    else if (dir === "up") cand.r0--;
    else if (dir === "down") cand.r1++;
    else return false;
    const norm = normalizeClusterByMergedComponents(r, cand);
    if (!norm) return false;
    if (!clusterCanPlace(r, norm, id)) return false;
    return upsertManualCluster(r, { ...cand, ...norm });
  };
  const findShrinkCandidate = (r, z, dir) => {
    if (!r || !z) return null;
    const w = Math.max(1, Math.round(Number(z.c1 - z.c0) || 1));
    const h = Math.max(1, Math.round(Number(z.r1 - z.r0) || 1));
    const maxStep = (dir === "left" || dir === "right") ? (w - 1) : (h - 1);
    if (maxStep <= 0) return null;
    const sx = Math.max(0, Math.round(Number(z.sx) || 0));
    const sy = Math.max(0, Math.round(Number(z.sy) || 0));
    for (let step = 1; step <= maxStep; step++) {
      const cand = { ...z };
      if (dir === "left") cand.c0 += step;
      else if (dir === "right") cand.c1 -= step;
      else if (dir === "up") cand.r0 += step;
      else if (dir === "down") cand.r1 -= step;
      else return null;
      if (cand.c1 <= cand.c0 || cand.r1 <= cand.r0) continue;
      const norm = normalizeClusterByMergedComponents(r, cand);
      if (!norm) continue;
      const same = (norm.c0 === z.c0 && norm.c1 === z.c1 && norm.r0 === z.r0 && norm.r1 === z.r1);
      if (same) continue;
      if (!(sx >= norm.c0 && sx < norm.c1 && sy >= norm.r0 && sy < norm.r1)) continue;
      if (!clusterCanPlace(r, norm, z.id)) continue;
      return { ...cand, ...norm };
    }
    return null;
  };
  const shrinkManualCluster = (r, id, dir) => {
    const z = findManualClusterById(r, id);
    if (!z) return false;
    const next = findShrinkCandidate(r, z, dir);
    if (!next) return false;
    return upsertManualCluster(r, next);
  };

  return {
    getManualClusters,
    manualClustersSignature,
    clearRectRegionsAndFlow,
    findManualClusterById,
    findManualClusterAtCell,
    normalizeClusterByMergedComponents,
    clusterCanPlace,
    upsertManualCluster,
    removeManualCluster,
    nextManualClusterId,
    expandManualCluster,
    findShrinkCandidate,
    shrinkManualCluster
  };
};
