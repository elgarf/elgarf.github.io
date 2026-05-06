import { isDeviceRectKind, isNoteHiddenInArtView, isShapeRectKind } from "../utils/rect-kind-utils.js";

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
    if (!cache || !cache.flow || cache.flow.pending || !Array.isArray(cache.flow.value)) return null;
    return cache.flow.value;
  };
  const getExportRegionsFromCache = r => {
    const cache = getRectCalcCache(r);
    if (!cache || !cache.regions || cache.regions.pending || !cache.regions.value) return null;
    return cache.regions.value;
  };

  return async exportMode => {
    const mode = (exportMode && typeof exportMode === "object") ? exportMode : { includeFlow: !!exportMode };
    const includeFlow = !!(mode.includeFlow || mode.flowOnly);
    const flowOnly = !!mode.flowOnly;
    const rigOnly = !!mode.rigOnly;
    const includeRig = !!(mode.includeFlow || rigOnly);
    const includeScreenLabels = !(flowOnly || rigOnly);
    const forceRigOverlay = !!(includeRig && !flowOnly);
    const includeDevices = !!includeFlow && !rigOnly;
    const artExport = !(includeFlow || includeRig);
    const exportRects = (Array.isArray(st.rects) ? st.rects : [])
      .filter(r => includeDevices || !isDeviceRectKind(r))
      .filter(r => !(artExport && isNoteHiddenInArtView(r, "art")));
    if (!exportRects.length) return null;
    await ensureFontReady();
    let minX = 1e9;
    let minY = 1e9;
    let maxX = -1e9;
    let maxY = -1e9;
    let startY = 0;
    for (const r of exportRects) {
      const bb = rectAABBMasked(r);
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
      if (includeRig) {
        const rig = getRectRigData(r);
        const scalePx = Math.max(1, Number(r && r.scale) || 256);
        const suspendH = Math.max(10, 0.1 * scalePx);
        const ringD = Math.max(8, 0.1 * scalePx);
        const suspends = Array.isArray(rig.suspends) ? rig.suspends : [];
        if (suspends.length > 0) startY = Math.max(startY, suspendH + ringD + 2.4);
      }
    }
    const w = Math.max(1, Math.ceil(maxX - minX));
    const h = Math.max(1, Math.ceil(maxY - minY));
    const getFlowOverflow = (outW, outH) => {
      if (!includeFlow) return { left: 0, right: 0, top: 0, bottom: 0 };
      let minFx = Infinity;
      let minFy = Infinity;
      let maxFx = -Infinity;
      let maxFy = -Infinity;
      const pull = p => {
        if (!p) return;
        const x = Number(p.x);
        const y = Number(p.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x < minFx) minFx = x;
        if (y < minFy) minFy = y;
        if (x > maxFx) maxFx = x;
        if (y > maxFy) maxFy = y;
      };
      for (const seg of (Array.isArray(st.flowLinkSegments) ? st.flowLinkSegments : [])) {
        pull(seg && seg.a);
        pull(seg && seg.b);
      }
      for (const a of (Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : [])) pull(a);
      if (!Number.isFinite(minFx) || !Number.isFinite(minFy) || !Number.isFinite(maxFx) || !Number.isFinite(maxFy)) {
        return { left: 0, right: 0, top: 0, bottom: 0 };
      }
      const margin = 18;
      return {
        left: Math.max(0, Math.ceil((0 - minFx) + margin)),
        right: Math.max(0, Math.ceil((maxFx - outW) + margin)),
        top: Math.max(0, Math.ceil((0 - minFy) + margin)),
        bottom: Math.max(0, Math.ceil((maxFy - outH) + margin))
      };
    };
    const renderPass = pads => {
      st.flowLinkAnchors = [];
      st.flowLinkSegments = [];
      const l = Math.max(0, Math.ceil(Number(pads && pads.l) || 0));
      const r = Math.max(0, Math.ceil(Number(pads && pads.r) || 0));
      const t = Math.max(0, Math.ceil(Number(pads && pads.t) || 0));
      const b = Math.max(0, Math.ceil(Number(pads && pads.b) || 0));
      const out = document.createElement("canvas");
      out.width = w + l + r;
      out.height = h + startY + t + b;
      const c = out.getContext("2d");
      const shiftX = l;
      const shiftY = startY + t;
      const exportOffsetX = -minX + shiftX;
      const exportOffsetY = -minY + shiftY;
      const shiftedRects = exportRects.map(rct => ({ ...rct, x: rct.x - minX + shiftX, y: rct.y - minY + shiftY }));
      const shiftedRectById = new Map(shiftedRects.map(rct => [Math.max(1, Math.round(Number(rct && rct.id) || 0)), rct]));
      const allShiftedRects = (Array.isArray(st.rects) ? st.rects : [])
        .map(rct => shiftedRectById.get(Math.max(1, Math.round(Number(rct && rct.id) || 0))) || rct);
      const shiftPoint = p => p && typeof p === "object"
        ? { ...p, x: (Number(p.x) || 0) + exportOffsetX, y: (Number(p.y) || 0) + exportOffsetY }
        : p;
      const allShiftedFlowLinks = (Array.isArray(st.flowLinks) ? st.flowLinks : []).map(ln => {
        if (!ln || typeof ln !== "object") return ln;
        const outLink = { ...ln };
        if (Array.isArray(ln.orthogonalPoints)) outLink.orthogonalPoints = ln.orthogonalPoints.map(shiftPoint);
        if (ln.manualBezier && typeof ln.manualBezier === "object") {
          outLink.manualBezier = {
            ...ln.manualBezier,
            c1: shiftPoint(ln.manualBezier.c1),
            c2: shiftPoint(ln.manualBezier.c2)
          };
        }
        return outLink;
      });
      const shapeFrameId = `export:${shiftX}:${shiftY}:${out.width}:${out.height}:${includeFlow ? 1 : 0}:${rigOnly ? 1 : 0}:${flowOnly ? 1 : 0}`;
      const drawExportRects = extraOpts => {
        for (let i = exportRects.length - 1; i >= 0; i--) {
          const rct = exportRects[i];
          const isShape = isShapeRectKind(rct);
          const er = isShape ? rct : shiftedRects[i];
          const includeFlowRect = !!(includeFlow && normalizeDataFlow(rct && rct.dataFlow) !== "none");
          const flowGroups = includeFlowRect ? getExportFlowGroupsFromCache(rct) : null;
          const regions = getExportRegionsFromCache(rct);
          const drawOpts = {
            noCachedRegions: true,
            includeFlow: includeFlowRect,
            disableLod: true,
            ignoreInstallLayerToggles: true,
            skipRegionCalc: true,
            skipFlowCalc: true,
            regionsOverride: regions,
            forceRigOverlay,
            suppressRigOverlay: !!flowOnly,
            suppressContoursOverlay: !!(flowOnly || rigOnly),
            viewModeOverride: (includeFlow || includeRig) ? "install" : "art",
            hideScreenGroupInText: !(includeFlow || includeRig),
            shapeFrameId,
            ...(extraOpts || {})
          };
          if (includeFlowRect) drawOpts.flowGroupsOverride = Array.isArray(flowGroups) ? flowGroups : [];
          if (isShape) {
            const anchorStart = Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors.length : 0;
            c.save();
            c.translate(exportOffsetX, exportOffsetY);
            drawRect(c, er, false, 1, { x: 0, y: 0 }, drawOpts);
            c.restore();
            if (Array.isArray(st.flowLinkAnchors)) {
              for (let j = anchorStart; j < st.flowLinkAnchors.length; j++) {
                const a = st.flowLinkAnchors[j];
                if (!a) continue;
                a.x = (Number(a.x) || 0) + exportOffsetX;
                a.y = (Number(a.y) || 0) + exportOffsetY;
              }
            }
          } else {
            drawRect(c, er, false, 1, { x: 0, y: 0 }, drawOpts);
          }
        }
      };
      if (includeFlow) {
        drawExportRects({ installTextMode: "skip" });
        const prevRects = st.rects;
        const prevFlowLinks = st.flowLinks;
        st.rects = allShiftedRects;
        st.flowLinks = allShiftedFlowLinks;
        try {
          drawInterScreenFlowLinks(c, true);
        } finally {
          st.rects = prevRects;
          st.flowLinks = prevFlowLinks;
        }
        if (includeScreenLabels) drawExportRects({ installTextMode: "only", includeFlow: false });
      } else if (rigOnly) {
        drawExportRects({ installTextMode: "skip", includeFlow: false });
      } else {
        drawExportRects();
      }
      return out;
    };
    const prevFlowAnchors = st.flowLinkAnchors;
    const prevFlowSegments = st.flowLinkSegments;
    const prevFlowHover = st.flowLinkHover;
    const prevFlowDrag = st.flowLinkDrag;
    st.flowLinkAnchors = [];
    st.flowLinkSegments = [];
    st.flowLinkHover = null;
    st.flowLinkDrag = null;
    try {
      let out = renderPass({ l: 0, r: 0, t: 0, b: 0 });
      if (includeFlow) {
        const of = getFlowOverflow(out.width, out.height);
        if (of.left || of.right || of.top || of.bottom) {
          out = renderPass({ l: of.left, r: of.right, t: of.top, b: of.bottom });
        }
      }
      const b = await canvasToBlob(out, "image/png");
      if (!b) return null;
      try {
        return await embedProjectIntoPngBlob(b, buildProject(), PNG_PROJECT_META_KEY);
      } catch (err) {
        console.warn("PNG metadata export failed, saving plain PNG:", err);
        return b;
      }
    } finally {
      st.flowLinkAnchors = prevFlowAnchors;
      st.flowLinkSegments = prevFlowSegments;
      st.flowLinkHover = prevFlowHover;
      st.flowLinkDrag = prevFlowDrag;
    }
  };
};
