import { clearSelectedFlowLinks } from "../utils/flow-link-selection-state.js";

export const setupTransientStateController = (deps = {}) => {
  const { st } = deps;

  const resetMaskTransient = () => {
    st.maskPath = [];
    st.maskHover = null;
  };

  const resetCellTransient = () => {
    st.cellHover = null;
    st.cellHoverPos = null;
    st.cellKnifeDrag = null;
  };

  const resetFlowHoverTransient = () => {
    st.flowHover = null;
    st.flowDirHover = null;
    st.flowResetHover = null;
    st.flowLinkHover = null;
  };

  const resetClusterHoverTransient = () => {
    st.clusterHandleHover = null;
    st.clusterCellHover = null;
    st.clusterStartHover = null;
    st.clusterBorderHover = null;
  };

  const resetRigHoverTransient = () => {
    st.rigHover = null;
  };

  const resetSelectionTransient = () => {
    resetMaskTransient();
    resetCellTransient();
    st.flowRegionRid = null;
    resetFlowHoverTransient();
    resetClusterHoverTransient();
    st.clusterDrag = null;
    st.selBox = null;
    st.shapePointSel = null;
    st.shapePointDrag = null;
  };

  const cancelActiveDrag = () => {
    const drag = st && st.drag;
    if (!drag) return false;
    let restored = false;
    if (Array.isArray(drag.items) && Array.isArray(st.rects)) {
      const byId = new Map(st.rects.map(r => [Math.round(Number(r && r.id) || 0), r]));
      for (const item of drag.items) {
        const r = byId.get(Math.round(Number(item && item.id) || 0));
        if (!r) continue;
        if (Number.isFinite(Number(item.rx))) r.x = Math.round(Number(item.rx));
        if (Number.isFinite(Number(item.ry))) r.y = Math.round(Number(item.ry));
        restored = true;
      }
    }
    st.drag = null;
    st.g.x = null;
    st.g.y = null;
    st.dg = null;
    return restored;
  };

  const resetTransientState = (full = false) => {
    st.maskPath = [];
    st.maskHover = null;
    st.clusterActiveId = null;
    st.clusterHandleHover = null;
    st.clusterCellHover = null;
    st.clusterStartHover = null;
    st.clusterBorderHover = null;
    st.clusterDrag = null;
    st.rigHover = null;
    if (full) {
      st.cellHover = null;
      st.cellHoverPos = null;
      st.flowHover = null;
      st.flowDirHover = null;
      st.flowResetHover = null;
      st.flowRegionRid = null;
      st.flowDrag = null;
      st.manualFlowDrag = null;
      st.flowDragPreview = null;
      st.flowLinkHover = null;
      clearSelectedFlowLinks(st);
      st.flowLinkCurveHandles = [];
      st.flowCurveDrag = null;
      st.flowLinkPending = null;
      st.flowLinkDrag = null;
      st.flowLinkAnchors = [];
      st.flowLinkSegments = [];
      st.clusterHandles = [];
      cancelActiveDrag();
      st.draft = null;
      st.draftPending = null;
      st.shapeDraft = null;
      st.shapePointSel = null;
      st.shapePointDrag = null;
    }
  };

  return {
    resetMaskTransient,
    resetCellTransient,
    resetFlowHoverTransient,
    resetClusterHoverTransient,
    resetRigHoverTransient,
    resetSelectionTransient,
    cancelActiveDrag,
    resetTransientState
  };
};
