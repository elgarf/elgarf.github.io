export const setupRenderPipeline = (deps = {}) => {
  const {
    ctx, overlayCtx, st, cv, overlayCanvas, wrap,
    getViewMetrics, s2w, rectAABB, getOrigin, isSelected,
    drawRect, drawInterScreenFlowLinks, drawMaskOverlay, drawCellEditOverlay, drawCabinetEditOverlay, drawContentBounds, drawMultiSelectionActions,
    drawGrid, drawGuides, drawDistanceGuide, drawInstallSummaryOverlay, drawLayerButtons, drawFlowLinkCurveHandlesOverlay, updateNoteEditorOverlay,
    selBoxBounds, resetClusterHoverTransient, isClusterEditMode
  } = deps;
  let drawGridFn = drawGrid;
  let drawGuidesFn = drawGuides;
  let drawDistanceGuideFn = drawDistanceGuide;

  const resetFrameTransient = () => {
    st.flowEditPoints = [];
    st.flowStartHandles = [];
    st.flowDirButtons = [];
    st.flowResetButtons = [];
    st.flowLinkAnchors = [];
    st.flowLinkSegments = [];
    st.clusterHandles = [];
    st.shapeRenderFrame = (Math.max(0, Math.round(Number(st.shapeRenderFrame) || 0)) + 1) % 1000000000;
    if (!isClusterEditMode()) resetClusterHoverTransient();
  };

  const drawDraftOverlay = (c, z) => {
    if (st.shapeDraft && Array.isArray(st.shapeDraft.points) && st.shapeDraft.points.length) {
      const d = st.shapeDraft;
      const pts = d.points;
      c.save();
      c.strokeStyle = "rgba(13,110,253,.95)";
      c.fillStyle = "rgba(13,110,253,.16)";
      c.lineWidth = Math.max(1, 1.4 / Math.max(0.25, z));
      c.setLineDash([6 / z, 4 / z]);
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      if (Number.isFinite(Number(d.pointerX)) && Number.isFinite(Number(d.pointerY))) c.lineTo(Number(d.pointerX), Number(d.pointerY));
      if (pts.length >= 3) c.closePath();
      c.stroke();
      if (pts.length >= 3) c.fill();
      c.setLineDash([]);
      const radius = Math.max(4, 5 / Math.max(0.25, z));
      for (let i = 0; i < pts.length; i++) {
        c.beginPath();
        c.arc(pts[i].x, pts[i].y, radius, 0, Math.PI * 2);
        c.fillStyle = i === 0 ? "rgba(25,135,84,.95)" : "rgba(13,110,253,.95)";
        c.strokeStyle = "rgba(255,255,255,.95)";
        c.fill();
        c.stroke();
      }
      c.restore();
    }
    if (!st.draft) return;
    const d = st.draft;
    const scale = Math.max(1, Math.round(Number(st.globalScale) || 256));
    const roundHalf = v => Math.max(0.5, Math.round(Math.max(0, Number(v) || 0) * 2) / 2);
    const wm = roundHalf(Math.abs(Number(d.width) || 0) / scale);
    const hm = roundHalf(Math.abs(Number(d.height) || 0) / scale);
    const fmt = v => Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
    const meterUnit = (typeof document !== "undefined" && /^en\b/i.test(document.documentElement.getAttribute("lang") || "")) ? "m" : "м";
    const label = `${fmt(wm)} x ${fmt(hm)} ${meterUnit}`;
    c.strokeStyle = "#7fd4f8";
    c.lineWidth = 1 / z;
    c.setLineDash([8 / z, 5 / z]);
    c.strokeRect(d.x, d.y, d.width, d.height);
    c.setLineDash([]);
    c.save();
    const ui = 1 / Math.max(0.01, z);
    c.font = `${12 * ui}px sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "top";
    const pad = 5 * ui;
    const tw = c.measureText(label).width;
    const bx = (Number.isFinite(Number(d.pointerX)) ? Number(d.pointerX) : d.x) + 8 * ui;
    const by = (Number.isFinite(Number(d.pointerY)) ? Number(d.pointerY) : d.y) + 8 * ui;
    c.fillStyle = "rgba(15,19,24,.82)";
    c.fillRect(bx - pad, by - pad, tw + pad * 2, 16 * ui + pad * 2);
    c.fillStyle = "rgba(255,255,255,.95)";
    c.fillText(label, bx, by);
    c.restore();
  };

  const drawSelectionBoxOverlay = (c, z) => {
    if (!st.selBox) return;
    const b = selBoxBounds(st.selBox);
    c.save();
    c.strokeStyle = "rgba(125,208,255,.95)";
    c.fillStyle = "rgba(125,208,255,.12)";
    c.lineWidth = Math.max(1, 1.2 / z);
    c.setLineDash([6 / z, 4 / z]);
    c.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    c.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    c.restore();
  };

  const drawDeferredTextJob = (c, job, z) => {
    if (!job || !job.overlay) return;
    const ov = job.overlay;
    c.save();
    c.translate(job.centerX, job.centerY);
    c.rotate(job.angle || 0);
    if (Array.isArray(job.hiddenRects) && job.hiddenRects.length) {
      c.beginPath();
      c.rect(-job.w / 2, -job.h / 2, job.w, job.h);
      for (const rc of job.hiddenRects) c.rect(rc.x, rc.y, rc.w, rc.h);
      c.clip("evenodd");
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `${ov.layout.fs}px ${ov.font}`;
    c.fillStyle = ov.txtTheme.bg;
    c.fillRect(ov.layout.textLeft, ov.layout.textTop, ov.layout.tw, ov.layout.th);
    c.fillStyle = ov.txtTheme.text;
    for (let i = 0; i < ov.ls.length; i++) {
      c.fillText(ov.ls[i], ov.layout.textX, ov.layout.sy + i * ov.layout.lh, ov.maxW);
    }
    c.restore();
  };

  const drawVisibleRects = (c, z, forceLowDetail, drawOptions = {}) => {
    const vm = getViewMetrics();
    const vw0 = s2w(0, 0);
    const vw1 = s2w(vm.viewWidth, vm.viewHeight);
    const vmargin = Math.max(48, 80 / Math.max(0.25, z));
    const viewMinX = Math.min(vw0.x, vw1.x) - vmargin;
    const viewMinY = Math.min(vw0.y, vw1.y) - vmargin;
    const viewMaxX = Math.max(vw0.x, vw1.x) + vmargin;
    const viewMaxY = Math.max(vw0.y, vw1.y) + vmargin;
    const origin = getOrigin();
    for (let i = st.rects.length - 1; i >= 0; i--) {
      const rr = st.rects[i];
      const isDeviceRect = String((rr && rr.kind) || "").toLowerCase() === "device";
      const installView = String(st.viewMode || "") === "install";
      const devicesLayerOn = installView && !(st.installLayers && st.installLayers.devices === false);
      if (isDeviceRect && !devicesLayerOn) continue;
      const bb = rectAABB(rr);
      if (bb.maxX < viewMinX || bb.minX > viewMaxX || bb.maxY < viewMinY || bb.minY > viewMaxY) continue;
      drawRect(c, rr, isSelected(rr.id), z, origin, { designerRender: true, forceLowDetail, shapeFrameId: st.shapeRenderFrame, ...drawOptions });
    }
  };

  const profilerEnabled = () => !!(st && (st.renderProfiler || (typeof location !== "undefined" && /(?:^|[?&])profile=1(?:&|$)/.test(location.search || ""))));
  const profileSection = (profile, name, fn) => {
    if (!profile) return fn();
    const start = performance.now();
    try {
      return fn();
    } finally {
      profile.sections.push({ name, ms: performance.now() - start });
    }
  };
  const drawRenderProfileOverlay = c => {
    if (!profilerEnabled() || !st.renderProfile || !Array.isArray(st.renderProfile.sections)) return;
    c.save();
    const dpr = window.devicePixelRatio || 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.font = "12px monospace";
    c.textAlign = "left";
    c.textBaseline = "top";
    const lines = [`render ${Number(st.renderProfile.totalMs || 0).toFixed(1)} ms`]
      .concat(st.renderProfile.sections.map(it => `${it.name}: ${Number(it.ms || 0).toFixed(1)} ms`));
    const width = Math.max(140, ...lines.map(line => c.measureText(line).width + 14));
    const height = lines.length * 16 + 10;
    c.fillStyle = "rgba(8,12,18,.82)";
    c.fillRect(10, 10, width, height);
    c.fillStyle = "rgba(255,255,255,.9)";
    lines.forEach((line, i) => c.fillText(line, 17, 16 + i * 16));
    c.restore();
  };
  const clearOverlayCanvas = dpr => {
    if (!overlayCtx || !overlayCanvas) return false;
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.clientWidth || cv.clientWidth, overlayCanvas.clientHeight || cv.clientHeight);
    return true;
  };

  const renderOverlay = (renderState = {}) => {
    const dpr = window.devicePixelRatio || 1;
    const vm = getViewMetrics();
    const z = st.zoom || 1;
    const c = overlayCtx || ctx;
    if (overlayCtx && !clearOverlayCanvas(dpr)) return;
    if (!overlayCtx) c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.save();
    c.translate(vm.centerX, vm.centerY);
    c.scale(z, z);
    c.translate(-st.camX, -st.camY);
    const profile = renderState.profile || null;
    profileSection(profile, "draft/selection", () => {
      drawDraftOverlay(c, z);
      drawSelectionBoxOverlay(c, z);
    });
    if (typeof drawCabinetEditOverlay === "function") {
      profileSection(profile, "cabinet selection", () => drawCabinetEditOverlay(c, z));
    }
    if (!renderState.skipHeavyOverlays) {
      profileSection(profile, "edit overlays", () => {
        drawMaskOverlay(c, z);
        drawCellEditOverlay(c, z);
      });
    }
    if (!renderState.skipHeavyOverlays || st.pan) {
      profileSection(profile, "bounds", () => drawContentBounds(c, z));
    }
    if (!renderState.skipHeavyOverlays && typeof drawMultiSelectionActions === "function") {
      profileSection(profile, "multi actions", () => drawMultiSelectionActions(c, z));
    }
    if (!renderState.skipHeavyOverlays && typeof drawLayerButtons === "function") {
      profileSection(profile, "layer buttons", () => drawLayerButtons(c, z));
    }
    if (typeof drawFlowLinkCurveHandlesOverlay === "function") {
      profileSection(profile, "flow curve handles", () => drawFlowLinkCurveHandlesOverlay(c));
    }
    c.restore();
    profileSection(profile, "guides", () => {
      if (typeof drawGuidesFn === "function") drawGuidesFn(c);
      if (typeof drawDistanceGuideFn === "function") drawDistanceGuideFn(c);
    });
    drawRenderProfileOverlay(c);
  };

  const renderScene = renderState => {
    const dpr = window.devicePixelRatio || 1;
    const z = st.zoom || 1;
    const profile = renderState && renderState.profile ? renderState.profile : null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    if (overlayCtx) clearOverlayCanvas(dpr);
    profileSection(profile, "grid", () => { if (typeof drawGridFn === "function") drawGridFn(); });
    const vm = getViewMetrics();
    ctx.save();
    ctx.translate(vm.centerX, vm.centerY);
    ctx.scale(z, z);
    ctx.translate(-st.camX, -st.camY);
    const installFlowLayering = String(st.viewMode || "") === "install";
    const interactionTooltips = [];
    const showInstallFlowLayer = !(st.installLayers && st.installLayers.flow === false) || st.mode === "flowEdit";
    if (installFlowLayering) {
      const installTextJobs = [];
      profileSection(profile, "rects", () => drawVisibleRects(ctx, z, !!renderState.forceLowDetail, { installTextMode: "skip", collectInstallTextOverlays: installTextJobs, collectInteractionTooltips: interactionTooltips }));
      if (showInstallFlowLayer) profileSection(profile, "screen links", () => drawInterScreenFlowLinks(ctx));
      profileSection(profile, "screen text", () => { for (const job of installTextJobs) drawDeferredTextJob(ctx, job, z); });
    } else {
      profileSection(profile, "rects", () => drawVisibleRects(ctx, z, !!renderState.forceLowDetail, { collectInteractionTooltips: interactionTooltips }));
      profileSection(profile, "screen links", () => drawInterScreenFlowLinks(ctx));
    }
    if (interactionTooltips.length) {
      profileSection(profile, "tooltips", () => {
        for (const drawTooltip of interactionTooltips) {
          if (typeof drawTooltip === "function") drawTooltip();
        }
      });
    }
    ctx.restore();
    profileSection(profile, "overlay", () => renderOverlay(renderState));
    if (typeof drawInstallSummaryOverlay === "function") profileSection(profile, "summary", () => drawInstallSummaryOverlay(ctx));
    if (wrap) wrap.dataset.panning = st.pan ? "1" : "0";
    updateNoteEditorOverlay();
  };

  return {
    resetFrameTransient,
    renderScene,
    renderOverlay,
    setGridRenderer: fn => { drawGridFn = fn; },
    setGuidesRenderer: fn => { drawGuidesFn = fn; },
    setDistanceGuideRenderer: fn => { drawDistanceGuideFn = fn; }
  };
};
