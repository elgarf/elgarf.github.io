export const rectAABBMaskedKey = (r, drawCellX, drawCellY, listSignature) => [
  r && r.x || 0,
  r && r.y || 0,
  r && r.width || 0,
  r && r.height || 0,
  Number(r && r.rotation) || 0,
  drawCellX(r),
  drawCellY(r),
  listSignature(r && r.hiddenCells)
].join("|");

export const topoCalcKey = (r, cx, cy, listSignature) => [
  r && r.width || 0,
  r && r.height || 0,
  cx || 0,
  cy || 0,
  listSignature(r && r.cellLinks)
].join("|");

export const regionCalcKey = (r, cx, cy, topo, deps = {}) => {
  const { listSignature = () => "", manualClustersSignature = () => "" } = deps;
  return [
    r && r.width || 0,
    r && r.height || 0,
    Math.max(1, Math.round(Number(r && r.areaM2Px) || 65536)),
    cx || 0,
    cy || 0,
    topo && topo.cols || 0,
    topo && topo.rows || 0,
    Math.max(0, Math.round(Number(r && r.splitVariant) || 0)),
    listSignature(r && r.cellLinks),
    listSignature(r && r.hiddenCells),
    manualClustersSignature(r)
  ].join("|");
};

export const flowCalcKey = (r, cx, cy, topo, regions, deps = {}) => {
  const { normalizeDataFlow = v => v, flowLocksSignature = () => "" } = deps;
  return [
    normalizeDataFlow(r && r.dataFlow),
    !!(r && r.dataFlowZ),
    r && r.width || 0,
    r && r.height || 0,
    cx || 0,
    cy || 0,
    topo && topo.cols || 0,
    topo && topo.rows || 0,
    flowLocksSignature(r),
    regions && regions._calcKey ? regions._calcKey : ""
  ].join("|");
};
