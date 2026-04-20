export const setupFlowRoutingController = (deps = {}) => {
  const {
    FLOW_DIR_SET,
    normalizeDataFlow,
    flowDist,
    wouldSelfCross,
    pathSelfCrosses,
    flowPathLength,
    checkCalcTimeout
  } = deps;

  const resolveFlowModeFromStartAndDir = (points, routing, fallbackMode) => {
    const modeFallback = normalizeDataFlow(fallbackMode);
    const pts = Array.isArray(points) ? points : [];
    if (!pts.length) return modeFallback;
    const cfg = (routing && typeof routing === "object") ? routing : {};
    const dir = String(cfg.startDir || "").toLowerCase();
    if (!FLOW_DIR_SET.has(dir)) return modeFallback;
    const startCid = (cfg && cfg.startPinned && Number.isFinite(Number(cfg.startCid))) ? Math.max(0, Math.round(Number(cfg.startCid) || 0)) : null;
    let sp = pts[0];
    if (startCid != null) {
      const found = pts.find(it => Math.max(0, Math.round(Number(it && it.cid) || 0)) === startCid);
      if (found) sp = found;
    }
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of pts) {
      const u = +p.u || 0, v = +p.v || 0;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    if (!(Number.isFinite(minU) && Number.isFinite(maxU) && Number.isFinite(minV) && Number.isFinite(maxV))) return modeFallback;
    const su = +sp.u || 0, sv = +sp.v || 0, midU = (minU + maxU) / 2, midV = (minV + maxV) / 2;
    const dTop = Math.abs(sv - minV), dBottom = Math.abs(maxV - sv), dLeft = Math.abs(su - minU), dRight = Math.abs(maxU - su);
    const side = (dTop <= dBottom && dTop <= dLeft && dTop <= dRight) ? "top" : (dBottom <= dLeft && dBottom <= dRight) ? "bottom" : (dLeft <= dRight) ? "left" : "right";
    const leftHalf = su <= midU, topHalf = sv <= midV;
    if (side === "bottom") {
      if (dir === "right") return "h_bl_lr";
      if (dir === "left") return "h_br_rl";
      if (dir === "up") return leftHalf ? "v_lb_bu" : "v_rb_bu";
      if (dir === "down") return leftHalf ? "v_lt_td" : "v_rt_td";
    } else if (side === "top") {
      if (dir === "right") return "h_tl_lr";
      if (dir === "left") return "h_tr_rl";
      if (dir === "down") return leftHalf ? "v_lt_td" : "v_rt_td";
      if (dir === "up") return leftHalf ? "v_lb_bu" : "v_rb_bu";
    } else if (side === "left") {
      if (dir === "down") return "v_lt_td";
      if (dir === "up") return "v_lb_bu";
      if (dir === "right") return topHalf ? "h_tl_lr" : "h_bl_lr";
      if (dir === "left") return topHalf ? "h_tr_rl" : "h_br_rl";
    } else {
      if (dir === "down") return "v_rt_td";
      if (dir === "up") return "v_rb_bu";
      if (dir === "left") return topHalf ? "h_tr_rl" : "h_br_rl";
      if (dir === "right") return topHalf ? "h_tl_lr" : "h_bl_lr";
    }
    return modeFallback;
  };

  const applyFlowStartRouting = (ordered, routing, budget) => {
    if (!Array.isArray(ordered) || ordered.length < 2) return ordered;
    const cfg = (routing && typeof routing === "object") ? routing : {};
    let cur = ordered.slice();
    const startCid = (cfg && cfg.startPinned && Number.isFinite(Number(cfg.startCid))) ? Math.max(0, Math.round(Number(cfg.startCid) || 0)) : null;
    let startPos = 0;
    if (startCid != null) {
      const pos = cur.findIndex(it => Math.max(0, Math.round(Number(it && it.cid) || 0)) === startCid);
      if (pos >= 0) startPos = pos;
    }
    const dir = String(cfg.startDir || "").toLowerCase();
    const n = cur.length;
    const forward = cur.slice(startPos).concat(cur.slice(0, startPos));
    const backward = cur.slice(0, startPos + 1).reverse().concat(cur.slice(startPos + 1).reverse());
    if (!FLOW_DIR_SET.has(dir) || n < 3) return forward;
    const dirVec = dir === "right" ? [1, 0] : dir === "left" ? [-1, 0] : dir === "down" ? [0, 1] : [0, -1];
    const scoreRoute = route => {
      if (!Array.isArray(route) || route.length < 2) return Number.POSITIVE_INFINITY;
      const s = route[0], nx = route[1], dx = (+nx.u || 0) - (+s.u || 0), dy = (+nx.v || 0) - (+s.v || 0), len = Math.hypot(dx, dy);
      const dot = len > 1e-6 ? (dx * dirVec[0] + dy * dirVec[1]) / len : -1;
      const wrongDirPenalty = dot < 0 ? 200000 : (dot < 0.25 ? 50000 : 0);
      const crossPenalty = pathSelfCrosses(route) ? 1e9 : 0;
      return crossPenalty + wrongDirPenalty + flowPathLength(route);
    };
    if (checkCalcTimeout(budget)) return forward;
    const sf = scoreRoute(forward), sb = scoreRoute(backward);
    return sb + 1e-6 < sf ? backward : forward;
  };

  const applyFlowLocksToOrdered = (ordered, locks, budget) => {
    if (!Array.isArray(ordered) || ordered.length < 2 || !Array.isArray(locks) || !locks.length) return ordered;
    let cur = ordered.slice();
    const pickNext = (path, rem) => {
      const prev = path[path.length - 1], prev2 = path.length > 1 ? path[path.length - 2] : null, prevDx = prev2 ? ((+prev.u || 0) - (+prev2.u || 0)) : 0, prevDy = prev2 ? ((+prev.v || 0) - (+prev2.v || 0)) : 0, prevLen = Math.hypot(prevDx, prevDy);
      let bestIdx = 0, bestScore = Infinity, bestBase = Infinity;
      for (let i = 0; i < rem.length; i++) {
        const cand = rem[i], d = flowDist(prev, cand), bb = (cand && cand.baseIdx != null) ? cand.baseIdx : i, cross = wouldSelfCross(path, cand), crossPenalty = cross ? 1e9 : 0;
        const dx = (+cand.u || 0) - (+prev.u || 0), dy = (+cand.v || 0) - (+prev.v || 0), len = Math.hypot(dx, dy);
        let backPenalty = 0;
        if (prevLen > 1e-6 && len > 1e-6) {
          const dot = (prevDx * dx + prevDy * dy) / (prevLen * len);
          if (dot < -0.35) backPenalty += Math.abs(dot) * 2400;
          else if (dot < 0) backPenalty += Math.abs(dot) * 1000;
        }
        const score = crossPenalty + backPenalty + d;
        if (score < bestScore - 1e-6 || (Math.abs(score - bestScore) <= 1e-6 && bb < bestBase)) { bestIdx = i; bestScore = score; bestBase = bb; }
      }
      return bestIdx;
    };
    for (const lock of locks) {
      if (checkCalcTimeout(budget)) return cur;
      const idx = Math.max(0, Math.round(Number(lock && lock.index) || 0));
      if (idx >= cur.length) continue;
      const targetCid = Math.max(0, Math.round(Number(lock && lock.cid) || 0));
      const pos = cur.findIndex(it => Math.max(0, Math.round(Number(it && it.cid) || 0)) === targetCid);
      if (pos < idx) continue;
      const prefix = cur.slice(0, idx), prefixSet = new Set(prefix.map(it => Math.max(0, Math.round(Number(it && it.cid) || 0))));
      if (prefixSet.has(targetCid)) continue;
      const fixed = cur[pos];
      const rem = cur.filter((it, i) => i !== pos && !prefixSet.has(Math.max(0, Math.round(Number(it && it.cid) || 0))));
      const tail = []; let path = prefix.concat([fixed]);
      while (rem.length) {
        if (checkCalcTimeout(budget)) break;
        const nx = pickNext(path, rem), it = rem.splice(nx, 1)[0];
        tail.push(it); path.push(it);
      }
      cur = prefix.concat([fixed], tail);
    }
    return cur;
  };

  return {
    resolveFlowModeFromStartAndDir,
    applyFlowStartRouting,
    applyFlowLocksToOrdered
  };
};
