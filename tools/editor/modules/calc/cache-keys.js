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
