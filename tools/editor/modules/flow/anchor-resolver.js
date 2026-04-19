export const setupFlowAnchorResolver = (deps = {}) => {
  const {
    st,
    flowAnchorKey,
    getFlowDrawRenderEpoch,
    getRectRuntime,
    getSplitFlowMarkerWorldPositions,
    rectUVToWorld
  } = deps;

  let renderEpoch = -1;
  let computedByKey = new Map();
  let groupsByRectId = new Map();

  const resetCacheIfNeeded = () => {
    const epoch = Math.max(0, Math.round(Number(getFlowDrawRenderEpoch && getFlowDrawRenderEpoch()) || 0));
    if (renderEpoch === epoch) return;
    renderEpoch = epoch;
    computedByKey = new Map();
    groupsByRectId = new Map();
  };

  const getRectFlowGroups = rectId => {
    if (groupsByRectId.has(rectId)) return groupsByRectId.get(rectId);
    const rr = (Array.isArray(st && st.rects) ? st.rects : [])
      .find(r => Math.max(1, Math.round(Number(r && r.id) || 0)) === rectId) || null;
    if (!rr) {
      groupsByRectId.set(rectId, null);
      return null;
    }
    const rt = getRectRuntime(rr, { withGroups: true });
    const groups = rt && rt.groups;
    const out = Array.isArray(groups) ? groups : [];
    const rec = { rr, groups: out };
    groupsByRectId.set(rectId, rec);
    return rec;
  };

  const findFlowAnchorByEndpoint = ep => {
    const k = flowAnchorKey(ep);
    const direct = (Array.isArray(st && st.flowLinkAnchors) ? st.flowLinkAnchors : [])
      .find(a => flowAnchorKey(a) === k) || null;
    if (direct) return direct;
    resetCacheIfNeeded();
    if (computedByKey.has(k)) return computedByKey.get(k);

    const rectId = Math.max(1, Math.round(Number(ep && ep.rectId) || 0));
    const rid = Math.max(0, Math.round(Number(ep && ep.rid) || 0));
    const kind = String(ep && ep.kind || "").toLowerCase() === "end" ? "end" : "start";
    const cid = Math.max(0, Math.round(Number(ep && ep.cid) || 0));
    const rec = getRectFlowGroups(rectId);
    if (!rec || !rec.rr || !Array.isArray(rec.groups)) {
      computedByKey.set(k, null);
      return null;
    }
    const g = rec.groups.find(it => Math.max(0, Math.round(Number(it && it.rid) || 0)) === rid);
    const pts = Array.isArray(g && g.points) ? g.points : [];
    if (!pts.length) {
      computedByKey.set(k, null);
      return null;
    }
    const p0 = kind === "end" ? pts[pts.length - 1] : pts[0];
    const pcid = Math.max(0, Math.round(Number(p0 && p0.cid) || 0));
    if (pcid !== cid) {
      computedByKey.set(k, null);
      return null;
    }
    const split = getSplitFlowMarkerWorldPositions(rec.rr, pts);
    const uv = { u: +p0.u || 0, v: +p0.v || 0 };
    const w0 = rectUVToWorld(rec.rr, uv.u, uv.v);
    const ww = (kind === "end" && split && split.end)
      ? split.end
      : ((kind === "start" && split && split.start) ? split.start : w0);
    const out = { rectId, rid, cid, kind, x: ww.x, y: ww.y };
    computedByKey.set(k, out);
    return out;
  };

  return {
    findFlowAnchorByEndpoint
  };
};
