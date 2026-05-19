/* build:1779222473 */
export const setupResetActionsFeature = (deps = {}) => {
  const {
    el,
    st,
    bindClick,
    applyToTargetsAndRender,
    hiddenCache,
    invalidateRectCache,
    clearFlowLockMemory,
    getRectCalcCache,
    clearRectRegionsAndFlow
  } = deps;

  bindClick(el.btnClearMasks, () => {
    applyToTargetsAndRender(r => {
      r.hiddenCells = [];
      hiddenCache.set(r, { src: r.hiddenCells, set: new Set() });
      invalidateRectCache(r, "topology");
    }, { persist: true }, () => {
      st.maskPath = [];
      st.maskHover = null;
    });
  });

  bindClick(el.btnResetFlowLocks, () => {
    applyToTargetsAndRender(r => {
      r.flowLocks = {};
      clearFlowLockMemory(r);
      const cache = getRectCalcCache(r);
      if (cache) cache.flow = null;
    }, { persist: true }, () => {
      st.flowHover = null;
      st.flowDirHover = null;
      st.flowDrag = null;
      st.flowDragPreview = null;
    });
  });

  bindClick(el.btnResetManualClusters, () => {
    applyToTargetsAndRender(r => {
      r.manualClusters = [];
      r.splitVariant = 0;
      clearRectRegionsAndFlow(r);
    }, { syncProps: true, persist: true }, () => {
      st.clusterActiveId = null;
      st.clusterHandleHover = null;
      st.clusterCellHover = null;
      st.clusterStartHover = null;
      st.clusterBorderHover = null;
      st.clusterDrag = null;
    });
  });
};
