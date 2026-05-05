import { setupFlowLinkController } from "../flow-link-controller.js";
import { setupFlowAnchorResolver } from "../flow/anchor-resolver.js";

export function setupFlowLinkFeature(deps = {}) {
  const {
    st,
    normalizeFlowLinks,
    getRectRuntime,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    rectAABBMasked,
    AREA_LIMIT_EPS,
    getFlowDrawRenderEpoch,
    getSplitFlowMarkerWorldPositions,
    rectUVToWorld
  } = deps;

  const flowAnchorKey = a => `${Math.max(1, Math.round(Number(a && a.rectId) || 0))}:${Math.max(0, Math.round(Number(a && a.rid) || 0))}:${Math.max(0, Math.round(Number(a && a.cid) || 0))}:${String(a && a.kind || "").toLowerCase() === "end" ? "end" : "start"}`;

  const { findFlowAnchorByEndpoint } = setupFlowAnchorResolver({
    st,
    flowAnchorKey,
    getFlowDrawRenderEpoch,
    getRectRuntime,
    getSplitFlowMarkerWorldPositions,
    rectUVToWorld
  });

  const {
    pruneFlowLinks,
    canLinkFlowAnchors,
    toggleFlowLinkBetween,
    addFlowLinkBetween,
    findFlowLinkAtPoint,
    findFlowLinkAnchorAtPoint,
    findFlowCurveHandleAtPoint,
    setFlowLinkManualBezierPoint,
    moveFlowLinkOrthogonalSegment,
    deleteFlowLinkOrthogonalSegment,
    clearFlowLinkManualBezier,
    updateFlowLinkDragTarget
  } = setupFlowLinkController({
    st,
    normalizeFlowLinks,
    flowAnchorKey,
    getRectRuntime,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    rectAABBMasked,
    AREA_LIMIT_EPS
  });

  return {
    flowAnchorKey,
    findFlowAnchorByEndpoint,
    pruneFlowLinks,
    canLinkFlowAnchors,
    toggleFlowLinkBetween,
    addFlowLinkBetween,
    findFlowLinkAtPoint,
    findFlowLinkAnchorAtPoint,
    findFlowCurveHandleAtPoint,
    setFlowLinkManualBezierPoint,
    moveFlowLinkOrthogonalSegment,
    deleteFlowLinkOrthogonalSegment,
    clearFlowLinkManualBezier,
    updateFlowLinkDragTarget
  };
}
