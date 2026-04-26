export const setupRectRuntimeService = (deps = {}) => {
  const {
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    planNumberRegions,
    getDataFlowGroups
  } = deps;

  const getRectRuntime = (r, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const hs = getHiddenSet(r);
    const out = { cx, cy, topo, hs, regions: null, groups: null };
    if (o.withRegions || o.withGroups) out.regions = planNumberRegions(r, cx, cy, topo, hs, true);
    if (o.withGroups) out.groups = getDataFlowGroups(r, cx, cy, topo, hs, out.regions);
    return out;
  };

  return { getRectRuntime };
};
