export const setupFlowPathUtils = (deps = {}) => {
  const {
    FLOW_REFINE_MAX_POINTS = 0,
    FLOW_SEARCH_NODE_LIMIT_STRICT = 0,
    FLOW_SEARCH_NODE_LIMIT_RELAXED = 0
  } = deps;

  const sortNums = (arr, dir) => [...arr].sort((a, b) => dir === "asc" ? a - b : b - a);
  const buildSnakeOrder = (items, primaryKey, primaryDir, secondaryKey, secondaryStartDir) => {
    const primaryVals = sortNums([...new Set(items.map(it => it[primaryKey]))], primaryDir);
    const out = []; let dir = secondaryStartDir;
    for (const pv of primaryVals) {
      const band = items.filter(it => it[primaryKey] === pv).sort((a, b) => {
        const delta = dir === "asc" ? (a[secondaryKey] - b[secondaryKey]) : (b[secondaryKey] - a[secondaryKey]);
        return delta || ((a.cid | 0) - (b.cid | 0));
      });
      out.push(...band);
      dir = dir === "asc" ? "desc" : "asc";
    }
    return out;
  };
  const buildZOrder = (items, primaryKey, primaryDir, secondaryKey, secondaryDir) => {
    const primaryVals = sortNums([...new Set(items.map(it => it[primaryKey]))], primaryDir);
    const out = [];
    for (const pv of primaryVals) {
      const band = items.filter(it => it[primaryKey] === pv).sort((a, b) => {
        const delta = secondaryDir === "asc" ? (a[secondaryKey] - b[secondaryKey]) : (b[secondaryKey] - a[secondaryKey]);
        return delta || ((a.cid | 0) - (b.cid | 0));
      });
      out.push(...band);
    }
    return out;
  };
  const flowBoxGap = (a, b) => {
    const dx = Math.max(0, Math.max((a.minCol - b.maxCol - 1), (b.minCol - a.maxCol - 1)));
    const dy = Math.max(0, Math.max((a.minRow - b.maxRow - 1), (b.minRow - a.maxRow - 1)));
    const ovX = Math.max(0, Math.min(a.maxCol, b.maxCol) - Math.max(a.minCol, b.minCol) + 1);
    const ovY = Math.max(0, Math.min(a.maxRow, b.maxRow) - Math.max(a.minRow, b.minRow) + 1);
    return { dx, dy, dist: dx + dy, ovX, ovY };
  };
  const ptX = p => (p && Number.isFinite(p.x) ? p.x : (p && Number.isFinite(p.u) ? p.u : 0));
  const ptY = p => (p && Number.isFinite(p.y) ? p.y : (p && Number.isFinite(p.v) ? p.v : 0));
  const segIntersects = (a, b, c, d) => {
    const eps = 1e-9;
    const cross = (p, q, r) => (ptX(q) - ptX(p)) * (ptY(r) - ptY(p)) - (ptY(q) - ptY(p)) * (ptX(r) - ptX(p));
    const onSeg = (p, q, r) => Math.min(ptX(p), ptX(q)) - eps <= ptX(r) && ptX(r) <= Math.max(ptX(p), ptX(q)) + eps && Math.min(ptY(p), ptY(q)) - eps <= ptY(r) && ptY(r) <= Math.max(ptY(p), ptY(q)) + eps;
    const o1 = cross(a, b, c), o2 = cross(a, b, d), o3 = cross(c, d, a), o4 = cross(c, d, b);
    if (Math.abs(o1) <= eps && onSeg(a, b, c)) return true;
    if (Math.abs(o2) <= eps && onSeg(a, b, d)) return true;
    if (Math.abs(o3) <= eps && onSeg(c, d, a)) return true;
    if (Math.abs(o4) <= eps && onSeg(c, d, b)) return true;
    return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
  };
  const wouldSelfCross = (path, next) => {
    if (!Array.isArray(path) || path.length < 2) return false;
    const a = path[path.length - 1], b = next;
    for (let i = 1; i < path.length - 1; i++) {
      const c = path[i - 1], d = path[i];
      if (segIntersects(a, b, c, d)) return true;
    }
    return false;
  };
  const flowDist = (a, b) => {
    const dx = (+a.u || 0) - (+b.u || 0), dy = (+a.v || 0) - (+b.v || 0);
    return Math.hypot(dx, dy);
  };
  const flowCandidateOrder = (path, rem, prevBase, allowCross) => {
    const prev = path[path.length - 1];
    const prev2 = path.length > 1 ? path[path.length - 2] : null;
    const prevDx = prev2 ? ((+prev.u || 0) - (+prev2.u || 0)) : 0, prevDy = prev2 ? ((+prev.v || 0) - (+prev2.v || 0)) : 0, prevLen = Math.hypot(prevDx, prevDy);
    return rem.map((it, i) => {
      const g = flowBoxGap(prev, it), adj = (g.dist === 0 ? 1 : 0), base = (it.baseIdx != null ? it.baseIdx : i), seqPenalty = Math.abs(base - (prevBase + 1));
      const center = flowDist(prev, it);
      const edge = g.dist;
      const align = (g.ovX + g.ovY);
      const crosses = wouldSelfCross(path, it);
      const dx = (+it.u || 0) - (+prev.u || 0), dy = (+it.v || 0) - (+prev.v || 0), len = Math.hypot(dx, dy);
      const absDx = Math.abs(dx), absDy = Math.abs(dy), diagPart = Math.min(absDx, absDy), diagLen = Math.max(0, len - Math.abs(absDx - absDy));
      const diagonalPenalty = (diagPart > 1e-6) ? (diagPart * 11.5 + diagLen * 2.2) : 0;
      let backPenalty = 0;
      if (prevLen > 1e-6 && len > 1e-6) {
        const dot = (prevDx * dx + prevDy * dy) / (prevLen * len);
        if (dot < -0.35) backPenalty += Math.abs(dot) * 2200;
        else if (dot < 0) backPenalty += Math.abs(dot) * 900;
      }
      const crossPenalty = crosses ? (allowCross ? 100000 : 1e12) : 0;
      const score = crossPenalty + backPenalty + diagonalPenalty + edge * 1000 + center + seqPenalty * 2 - adj * 220 - align * 10;
      return { i, score, crosses };
    }).sort((a, b) => a.score - b.score);
  };
  const flowSearchOrder = (path, rem, prevBase, allowCross, state) => {
    if (state) {
      state.nodes = (state.nodes | 0) + 1;
      if (state.nodes > state.limit) {
        state.aborted = true;
        return null;
      }
    }
    if (!rem.length) return path;
    const order = flowCandidateOrder(path, rem, prevBase, allowCross);
    for (const c of order) {
      if (state && state.aborted) return null;
      if (!allowCross && c.crosses) continue;
      const pick = rem[c.i];
      const nextPath = path.concat([pick]);
      const nextRem = rem.slice(0, c.i).concat(rem.slice(c.i + 1));
      const nextBase = pick.baseIdx != null ? pick.baseIdx : prevBase + 1;
      const solved = flowSearchOrder(nextPath, nextRem, nextBase, allowCross, state);
      if (solved) return solved;
    }
    return null;
  };
  const flowPathLength = arr => {
    if (!Array.isArray(arr) || arr.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < arr.length; i++) sum += flowDist(arr[i - 1], arr[i]);
    return sum;
  };
  const pathSelfCrosses = arr => {
    if (!Array.isArray(arr) || arr.length < 4) return false;
    const path = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      if (wouldSelfCross(path, arr[i])) return true;
      path.push(arr[i]);
    }
    return false;
  };
  const flowCrossCount = arr => {
    if (!Array.isArray(arr) || arr.length < 4) return 0;
    let c = 0;
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1], b = arr[i];
      for (let j = 1; j < i - 1; j++) {
        const p = arr[j - 1], q = arr[j];
        if (segIntersects(a, b, p, q)) c++;
      }
    }
    return c;
  };
  const flowPathCost = arr => {
    const base = flowPathLength(arr) + flowCrossCount(arr) * 1e9;
    if (!Array.isArray(arr) || arr.length < 2) return base;
    let diagonalPenalty = 0;
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1], b = arr[i], dx = Math.abs((+b.u || 0) - (+a.u || 0)), dy = Math.abs((+b.v || 0) - (+a.v || 0)), len = Math.hypot(dx, dy), diagPart = Math.min(dx, dy), diagLen = Math.max(0, len - Math.abs(dx - dy));
      if (diagPart > 1e-6) diagonalPenalty += diagPart * 15 + diagLen * 3;
    }
    return base + diagonalPenalty;
  };
  const optimizeFlowPathShortest = arr => {
    if (!Array.isArray(arr) || arr.length < 4) return arr || [];
    let best = arr.slice(), bestCost = flowPathCost(best), changed = true, guard = 0;
    while (changed && guard < 8) {
      guard++; changed = false;
      for (let i = 1; i < best.length - 2; i++) {
        for (let j = i + 1; j < best.length - 1; j++) {
          const cand = best.slice(0, i).concat(best.slice(i, j + 1).reverse(), best.slice(j + 1));
          const cc = flowPathCost(cand);
          if (cc + 1e-6 < bestCost) { best = cand; bestCost = cc; changed = true; }
        }
      }
    }
    return best;
  };
  const refineFlowOrder = ordered => {
    if (!Array.isArray(ordered) || ordered.length <= 2) return ordered || [];
    if (ordered.length > FLOW_REFINE_MAX_POINTS) return ordered;
    const head = ordered[0], rem = ordered.slice(1), base = head.baseIdx || 0;
    const strictState = { nodes: 0, limit: FLOW_SEARCH_NODE_LIMIT_STRICT, aborted: false };
    const strict = flowSearchOrder([head], rem, base, false, strictState);
    if (strict) return strict;
    if (strictState.aborted) return ordered;
    const relaxedState = { nodes: 0, limit: FLOW_SEARCH_NODE_LIMIT_RELAXED, aborted: false };
    const relaxed = flowSearchOrder([head], rem, base, true, relaxedState);
    return relaxed || ordered;
  };

  return {
    sortNums,
    buildSnakeOrder,
    buildZOrder,
    flowBoxGap,
    ptX,
    ptY,
    segIntersects,
    wouldSelfCross,
    flowCandidateOrder,
    flowSearchOrder,
    flowDist,
    flowPathLength,
    pathSelfCrosses,
    flowCrossCount,
    flowPathCost,
    optimizeFlowPathShortest,
    refineFlowOrder
  };
};
