export const setupDrawRectStagesController = (deps = {}) => {
  const {
    st,
    isClusterEditMode,
    fontFamilyCss,
    getDrawRigOnRect,
    getRectFlowPassiveLayerCached,
    getDrawDataFlowOnRect,
    getDrawFlowEditOverlay,
    getDrawClusterEditOverlay
  } = deps;

  const drawRectOverlays = (ctx) => {
    const {
      c,
      r,
      sel,
      z,
      w,
      h,
      cellX,
      cellY,
      topo,
      hs,
      installView,
      cellEditActive,
      clusterEditActive,
      flowEditActive,
      wantsFlowDraw,
      flowGroups,
      deferredTextOverlay,
      suppressRigOverlay
    } = ctx;

    const drawRigOnRect = getDrawRigOnRect();
    const drawDataFlowOnRect = getDrawDataFlowOnRect();
    const getFlowPassiveLayer = getRectFlowPassiveLayerCached();

    if (installView && !cellEditActive && !clusterEditActive && !flowEditActive && !suppressRigOverlay) {
      drawRigOnRect(c, r, w, h, cellX, cellY, topo, hs, z, !!sel);
    }

    if (wantsFlowDraw) {
      if (st.mode === "flowEdit" && sel && r.id === st.sel && Array.isArray(flowGroups) && flowGroups.length > 1) {
        const activeRid = Math.max(0, Math.round(Number(st.flowRegionRid) || 0));
        const active = flowGroups.filter(g => Math.round(Number(g && g.rid) || 0) === activeRid);
        const passiveLayer = getFlowPassiveLayer(r, w, h, z, flowGroups, activeRid);
        if (passiveLayer) c.drawImage(passiveLayer, -w / 2, -h / 2);
        if (active.length) drawDataFlowOnRect(c, active, w, h, z);
      } else {
        drawDataFlowOnRect(c, flowGroups, w, h, z);
      }
    }

    if (deferredTextOverlay) {
      const ov = deferredTextOverlay;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = `${ov.layout.fs}px ${fontFamilyCss(st.fontFamily)}`;
      c.fillStyle = ov.txtTheme.bg;
      c.fillRect(ov.layout.textLeft, ov.layout.textTop, ov.layout.tw, ov.layout.th);
      c.fillStyle = ov.txtTheme.text;
      for (let i = 0; i < ov.ls.length; i++) {
        c.fillText(ov.ls[i], ov.layout.textX, ov.layout.sy + i * ov.layout.lh, ov.maxW);
      }
    }
  };

  const drawRectInteractions = (ctx) => {
    const { c, r, sel, w, h, cellX, cellY } = ctx;
    const drawFlowEditOverlay = getDrawFlowEditOverlay();
    const drawClusterEditOverlay = getDrawClusterEditOverlay();
    if (st.mode === "flowEdit" && sel && r.id === st.sel) drawFlowEditOverlay(c, w, h);
    if (isClusterEditMode() && sel && r.id === st.sel) drawClusterEditOverlay(c, r, w, h, cellX, cellY);
  };

  return {
    drawRectOverlays,
    drawRectInteractions
  };
};
