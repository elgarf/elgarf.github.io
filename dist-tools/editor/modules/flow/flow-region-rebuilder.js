/* build:1779222473 */
export const setupFlowRegionRebuilder = (deps = {}) => {
  const {
    st,
    cur,
    isRectLocked,
    normalizeFlowLocks,
    setFlowStart,
    setFlowLock,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    planNumberRegionsUncached,
    getDataFlowGroupsUncached,
    makeCalcBudget,
    calcNow,
    getRectCalcCache
  } = deps;

  const hasCalcDeps = () => (
    typeof drawCellX === "function"
    && typeof drawCellY === "function"
    && typeof getCellTopologyCached === "function"
    && typeof getHiddenSet === "function"
    && typeof planNumberRegionsUncached === "function"
    && typeof getDataFlowGroupsUncached === "function"
  );
  const makeBudget = timeoutMs => {
    const budget = typeof makeCalcBudget === "function" ? makeCalcBudget() : { timedOut: false, deadline: 0 };
    if (typeof calcNow === "function") budget.deadline = calcNow() + Math.max(50, Math.round(Number(timeoutMs) || 0));
    return budget;
  };
  const normalizeRid = rid => Math.max(0, Math.round(Number(rid) || 0));
  const buildGroupsForRegion = (r, rid, timeoutMs = 5000) => {
    if (!r || !hasCalcDeps()) return null;
    const rg = normalizeRid(rid);
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const hs = getHiddenSet(r);
    const budget = makeBudget(timeoutMs);
    const regions = planNumberRegionsUncached(r, cx, cy, topo, hs, budget);
    if (!regions || budget.timedOut) return null;
    const groups = getDataFlowGroupsUncached(r, cx, cy, topo, hs, regions, budget, { onlyRid: rg });
    if (!Array.isArray(groups) || budget.timedOut) return null;
    return { rid: rg, groups };
  };

  const buildRebuiltFlowPreview = flowDrag => {
    if (!flowDrag || !st || typeof cur !== "function") return null;
    const r = cur();
    if (!r || (typeof isRectLocked === "function" && isRectLocked(r))) return null;
    const rid = normalizeRid(flowDrag.rid);
    const fromIndex = Math.max(0, Math.round(Number(flowDrag.fromIndex) || 0));
    const currentIndex = Math.max(fromIndex, Math.round(Number(flowDrag.currentIndex) || fromIndex));
    const regionPoints = (st.flowEditPoints || []).filter(p => normalizeRid(p && p.rid) === rid);
    if (!regionPoints.length) return null;
    const target = regionPoints.find(p => Math.max(0, Math.round(Number(p && p.index) || 0)) === currentIndex);
    if (!target) return null;
    const rr = {
      ...r,
      flowLocks: typeof normalizeFlowLocks === "function" ? normalizeFlowLocks(r.flowLocks) : (r.flowLocks && typeof r.flowLocks === "object" ? { ...r.flowLocks } : {})
    };
    if (String(flowDrag.kind || "") === "start") setFlowStart(rr, rid, target.cid);
    else setFlowLock(rr, rid, fromIndex, target.cid);
    const rebuilt = buildGroupsForRegion(rr, rid, 5000);
    if (!rebuilt) return null;
    const g = rebuilt.groups.find(it => normalizeRid(it && it.rid) === rid);
    if (!g || !Array.isArray(g.points) || g.points.length < 2) return null;
    return {
      rid,
      fromIndex,
      currentIndex,
      kind: String(flowDrag.kind || "") === "start" ? "start" : "lock",
      points: g.points.map((p, i) => ({
        u: +p.u || 0,
        v: +p.v || 0,
        index: i,
        cid: Math.max(0, Math.round(Number(p && p.cid) || 0))
      }))
    };
  };

  const rebuildAndPatchFlowRegion = (r, rid, timeoutMs = 5000) => {
    if (!r || typeof getRectCalcCache !== "function") return false;
    const rebuilt = buildGroupsForRegion(r, rid, timeoutMs);
    if (!rebuilt) return false;
    const cache = getRectCalcCache(r);
    if (!cache) return false;
    const group = rebuilt.groups.find(it => normalizeRid(it && it.rid) === rebuilt.rid) || null;
    const prev = (cache.flow && Array.isArray(cache.flow.value)) ? cache.flow.value : [];
    const next = prev.filter(it => normalizeRid(it && it.rid) !== rebuilt.rid);
    if (group) next.push(group);
    next.sort((a, b) => normalizeRid(a && a.rid) - normalizeRid(b && b.rid));
    if (cache.flow && typeof cache.flow === "object") {
      cache.flow.value = next;
      cache.flow.pending = false;
    } else {
      cache.flow = { key: "", regionKey: "", value: next, pending: false };
    }
    return true;
  };

  return {
    buildRebuiltFlowPreview,
    rebuildAndPatchFlowRegion
  };
};
