export const setupFlowEditHitTestController = (deps = {}) => {
  const { st, FLOW_POINT_INDEX_CELL } = deps;

  let flowPointIndexSrc = null;
  let flowPointIndexMap = null;

  const resetFlowPointIndexCache = () => {
    flowPointIndexSrc = null;
    flowPointIndexMap = null;
  };

  const findFlowStartHandle = (wx, wy, rid = null) => {
    const pts = Array.isArray(st.flowStartHandles) ? st.flowStartHandles : [], maxDist = Math.min(20, Math.max(11, 18 / Math.max(0.2, st.zoom || 1)));
    let best = null, bestD = Infinity;
    for (const p of pts) {
      if (rid != null && p.rid !== rid) continue;
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && bestD <= maxDist) return best;
    return null;
  };

  const findFlowDirectionButton = (wx, wy, rid = null) => {
    const pts = Array.isArray(st.flowDirButtons) ? st.flowDirButtons : [], maxDist = Math.max(11, 18 / Math.max(0.2, st.zoom || 1));
    let best = null, bestD = Infinity;
    for (const p of pts) {
      if (rid != null && p.rid !== rid) continue;
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && bestD <= maxDist) return best;
    return null;
  };

  const ensureFlowPointIndex = () => {
    const pts = Array.isArray(st.flowEditPoints) ? st.flowEditPoints : [];
    if (flowPointIndexSrc === pts && flowPointIndexMap) return;
    flowPointIndexSrc = pts;
    const map = new Map();
    for (const p of pts) {
      const gx = Math.floor((+p.x || 0) / FLOW_POINT_INDEX_CELL), gy = Math.floor((+p.y || 0) / FLOW_POINT_INDEX_CELL), k = `${gx},${gy}`;
      const arr = map.get(k) || [];
      arr.push(p);
      map.set(k, arr);
    }
    flowPointIndexMap = map;
  };

  const findFlowEditPointIndexed = (wx, wy, maxDist, rid, minIndex) => {
    ensureFlowPointIndex();
    if (!flowPointIndexMap) return null;
    const cs = FLOW_POINT_INDEX_CELL, gx = Math.floor(wx / cs), gy = Math.floor(wy / cs), reach = Math.max(1, Math.ceil(maxDist / cs));
    let best = null, bestD = Infinity;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const arr = flowPointIndexMap.get(`${gx + dx},${gy + dy}`);
        if (!arr || !arr.length) continue;
        for (const p of arr) {
          if (rid != null && p.rid !== rid) continue;
          if (p.index < minIndex) continue;
          const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
          if (d < bestD) { bestD = d; best = p; }
        }
      }
    }
    if (best && bestD <= maxDist) return best;
    return null;
  };

  const findFlowEditPoint = (wx, wy, rid = null, minIndex = 0) => {
    const pts = Array.isArray(st.flowEditPoints) ? st.flowEditPoints : [], maxDist = Math.max(10, 18 / Math.max(0.2, st.zoom || 1));
    const fast = findFlowEditPointIndexed(wx, wy, maxDist, rid, minIndex);
    if (fast) return fast;
    let best = null, bestD = Infinity;
    for (const p of pts) {
      if (rid != null && p.rid !== rid) continue;
      if (p.index < minIndex) continue;
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && bestD <= maxDist) return best;
    return null;
  };

  return {
    findFlowStartHandle,
    findFlowDirectionButton,
    findFlowEditPoint,
    resetFlowPointIndexCache
  };
};

