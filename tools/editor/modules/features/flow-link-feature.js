import { setupFlowLinkController } from "../flow-link-controller.js";
import { setupFlowAnchorResolver } from "../flow/anchor-resolver.js";
import { flowAnchorKey, flowLinkKey, flowLinkKeyOf, normalizeFlowEndpoint } from "../utils/flow-link-key-utils.js";

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
    flowLinkKey,
    getRectRuntime,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    rectAABBMasked,
    AREA_LIMIT_EPS
  });

  return {
    flowAnchorKey,
    flowLinkKey,
    flowLinkKeyOf,
    normalizeFlowEndpoint,
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
