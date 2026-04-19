export const createRenderExportPngBlob = (deps = {}) => {
  const {
    st,
    ensureFontReady,
    rectAABBMasked,
    getRectRigData,
    normalizeDataFlow,
    drawRect,
    drawInterScreenFlowLinks,
    getRectCalcCache,
    embedProjectIntoPngBlob,
    buildProject,
    PNG_PROJECT_META_KEY
  } = deps;

  const canvasToBlob = (canvas, type = "image/png", quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

  const getExportFlowGroupsFromCache = r => {
    if (normalizeDataFlow(r && r.dataFlow) === "none") return [];
    const cache = getRectCalcCache(r);
    if (!cache || !cache.flow || cache.flow.pending || !Array.isArray(cache.flow.value)) return [];
    return cache.flow.value;
  };

  return async includeFlow => {
    if (!st.rects.length) return null;
    await ensureFontReady();
    let minX = 1e9;
    let minY = 1e9;
    let maxX = -1e9;
    let maxY = -1e9;
    let startY = 0;
    for (const r of st.rects) {
      const bb = rectAABBMasked(r);
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
      const rig = getRectRigData(r);
      const scalePx = Math.max(1, Number(r && r.scale) || 256);
      const suspendH = Math.max(10, 0.1 * scalePx);
      const ringD = Math.max(8, 0.1 * scalePx);
      const suspends = Array.isArray(rig.suspends) ? rig.suspends : [];
      if (suspends.length > 0) startY = Math.max(startY, suspendH + ringD + 2.4);
    }
    const out = document.createElement("canvas");
    const w = Math.max(1, Math.ceil(maxX - minX));
    const h = Math.max(1, Math.ceil(maxY - minY));
    out.width = w;
    out.height = h + startY;
    const c = out.getContext("2d");
    const prevFlowAnchors = st.flowLinkAnchors;
    const prevFlowSegments = st.flowLinkSegments;
    const prevFlowHover = st.flowLinkHover;
    const prevFlowDrag = st.flowLinkDrag;
    st.flowLinkAnchors = [];
    st.flowLinkSegments = [];
    st.flowLinkHover = null;
    st.flowLinkDrag = null;
    try {
      for (let i = st.rects.length - 1; i >= 0; i--) {
        const r = st.rects[i];
        const er = { ...r, x: r.x - minX, y: r.y - minY + startY };
        const includeFlowRect = !!(includeFlow && normalizeDataFlow(r && r.dataFlow) !== "none");
        const flowGroups = includeFlowRect ? getExportFlowGroupsFromCache(r) : [];
        drawRect(c, er, false, 1, { x: 0, y: 0 }, { noCachedRegions: true, includeFlow: includeFlowRect, disableLod: true, flowGroupsOverride: flowGroups, viewModeOverride: includeFlow ? "install" : "art" });
      }
      if (includeFlow) drawInterScreenFlowLinks(c, true);
    } finally {
      st.flowLinkAnchors = prevFlowAnchors;
      st.flowLinkSegments = prevFlowSegments;
      st.flowLinkHover = prevFlowHover;
      st.flowLinkDrag = prevFlowDrag;
    }
    const b = await canvasToBlob(out, "image/png");
    if (!b) return null;
    try {
      return await embedProjectIntoPngBlob(b, buildProject(), PNG_PROJECT_META_KEY);
    } catch (err) {
      console.warn("PNG metadata export failed, saving plain PNG:", err);
      return b;
    }
  };
};
