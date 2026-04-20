export const setupTransientStateController = (deps = {}) => {
  const { st } = deps;

  const resetMaskTransient = () => {
    st.maskPath = [];
    st.maskHover = null;
  };

  const resetCellTransient = () => {
    st.cellHover = null;
    st.cellHoverPos = null;
  };

  const resetFlowHoverTransient = () => {
    st.flowHover = null;
    st.flowDirHover = null;
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
      st.flowRegionRid = null;
      st.flowDrag = null;
      st.flowDragPreview = null;
      st.flowLinkHover = null;
      st.flowLinkPending = null;
      st.flowLinkDrag = null;
      st.flowLinkAnchors = [];
      st.flowLinkSegments = [];
      st.clusterHandles = [];
      st.drag = null;
      st.draft = null;
      st.g.x = null;
      st.g.y = null;
      st.dg = null;
    }
  };

  return {
    resetMaskTransient,
    resetCellTransient,
    resetFlowHoverTransient,
    resetClusterHoverTransient,
    resetRigHoverTransient,
    resetSelectionTransient,
    resetTransientState
  };
};
