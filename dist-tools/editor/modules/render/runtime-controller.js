/* build:1779222473 */
export const setupRenderRuntimeController = (deps = {}) => {
  const {
    ctx,
    overlayCtx,
    st,
    cv,
    overlayCanvas,
    wrap,
    w2s,
    fontFamilyCss,
    el,
    renderPipeline,
    onBeforeRenderFrame,
    getGridAnchorBounds
  } = deps;

  const drawGrid = () => {
    let step = Math.max(1, Math.round((Number(st.globalScale) || 256) * 0.5));
    let anchorX = 0;
    let anchorY = 0;
    if (typeof getGridAnchorBounds === "function") {
      const bb = getGridAnchorBounds();
      if (bb && Number.isFinite(Number(bb.minX)) && Number.isFinite(Number(bb.minY))) {
        anchorX = Number(bb.minX) || 0;
        anchorY = Number(bb.minY) || 0;
      }
    }
    const zoom = Math.max(1e-6, Number(st.zoom) || 1);
    const pxStep = Math.max(1e-6, step * zoom);
    const anchorScreen = w2s(anchorX, anchorY);
    const sx = anchorScreen.x + Math.floor((0 - anchorScreen.x) / pxStep) * pxStep;
    const ex = anchorScreen.x + Math.ceil((cv.clientWidth - anchorScreen.x) / pxStep) * pxStep;
    const sy = anchorScreen.y + Math.floor((0 - anchorScreen.y) / pxStep) * pxStep;
    const ey = anchorScreen.y + Math.ceil((cv.clientHeight - anchorScreen.y) / pxStep) * pxStep;
    ctx.save();
    ctx.strokeStyle = "rgba(147,177,207,.09)";
    ctx.lineWidth = 1;
    const vPath = new Path2D();
    for (let px = sx; px <= ex; px += pxStep) {
      const xp = Math.round(px) + .5;
      vPath.moveTo(xp, 0);
      vPath.lineTo(xp, cv.clientHeight);
    }
    ctx.stroke(vPath);
    const hPath = new Path2D();
    for (let py = sy; py <= ey; py += pxStep) {
      const yp = Math.round(py) + .5;
      hPath.moveTo(0, yp);
      hPath.lineTo(cv.clientWidth, yp);
    }
    ctx.stroke(hPath);
    ctx.restore();
  };

  const drawGuides = (targetCtx = ctx) => {
    if (st.g.x == null && st.g.y == null) return;
    const c = targetCtx || ctx;
    c.save();
    c.strokeStyle = "rgba(74,200,255,.9)";
    c.setLineDash([6, 5]);
    c.lineWidth = 1;
    if (st.g.x != null) {
      const x = w2s(st.g.x, 0).x;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, cv.clientHeight);
      c.stroke();
    }
    if (st.g.y != null) {
      const y = w2s(0, st.g.y).y;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(cv.clientWidth, y);
      c.stroke();
    }
    c.restore();
  };

  const drawDistanceGuide = (targetCtx = ctx) => {
    if (!st.dg) return;
    const c = targetCtx || ctx;
    const drawDim = (g, color, labelShift) => {
      let { x1, y1, x2, y2, v, axis } = g;
      const p1 = w2s(x1, y1);
      const p2 = w2s(x2, y2);
      const t = `${Math.round(v)} px`;
      c.save();
      c.strokeStyle = color;
      c.lineWidth = 1.5;
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(p1.x, p1.y);
      c.lineTo(p2.x, p2.y);
      c.stroke();
      if (!st.fontReady) {
        c.restore();
        return;
      }
      c.font = `12px ${fontFamilyCss(st.fontFamily)}`;
      const tw = c.measureText(t).width + 10;
      c.fillStyle = "rgba(15,19,24,.85)";
      if (axis === "y") {
        const m = (p1.y + p2.y) / 2;
        c.beginPath();
        c.moveTo(p1.x - 7, p1.y);
        c.lineTo(p1.x + 7, p1.y);
        c.moveTo(p2.x - 7, p2.y);
        c.lineTo(p2.x + 7, p2.y);
        c.stroke();
        c.fillRect(p1.x + 8 + labelShift, m - 8, tw, 16);
        c.fillStyle = color;
        c.textAlign = "left";
        c.textBaseline = "middle";
        c.fillText(t, p1.x + 13 + labelShift, m);
      } else {
        if (p1.x > p2.x) {
          const tx = p1.x;
          p1.x = p2.x;
          p2.x = tx;
        }
        const m = (p1.x + p2.x) / 2;
        c.beginPath();
        c.moveTo(p1.x, p1.y - 7);
        c.lineTo(p1.x, p1.y + 7);
        c.moveTo(p2.x, p2.y - 7);
        c.lineTo(p2.x, p2.y + 7);
        c.stroke();
        c.fillRect(m - tw / 2, p1.y - 24 - labelShift, tw, 16);
        c.fillStyle = color;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(t, m, p1.y - 16 - labelShift);
      }
      c.restore();
    };
    if (st.dg.refs && Array.isArray(st.dg.refs)) {
      for (const r of st.dg.refs) drawDim(r, "#ffd77a", 0);
      drawDim(st.dg, "#71d7ff", 18);
      return;
    }
    if (st.dg.ref) drawDim(st.dg.ref, "#ffd77a", 0);
    drawDim(st.dg, "#71d7ff", 18);
  };

  if (renderPipeline && typeof renderPipeline.setGridRenderer === "function") {
    renderPipeline.setGridRenderer(drawGrid);
  }
  if (renderPipeline && typeof renderPipeline.setGuidesRenderer === "function") {
    renderPipeline.setGuidesRenderer(drawGuides);
  }
  if (renderPipeline && typeof renderPipeline.setDistanceGuideRenderer === "function") {
    renderPipeline.setDistanceGuideRenderer(drawDistanceGuide);
  }

  let renderRaf = 0;
  let overlayRaf = 0;
  const profilerEnabled = () => !!(st && (st.renderProfiler || (typeof location !== "undefined" && /(?:^|[?&])profile=1(?:&|$)/.test(location.search || ""))));
  const createProfile = kind => profilerEnabled() ? { kind, sections: [], start: performance.now(), totalMs: 0 } : null;
  const finishProfile = profile => {
    if (!profile) return;
    profile.totalMs = performance.now() - profile.start;
    st.renderProfile = {
      kind: profile.kind,
      totalMs: profile.totalMs,
      sections: profile.sections.slice().sort((a, b) => Number(b.ms || 0) - Number(a.ms || 0)).slice(0, 8)
    };
  };

  const renderNow = () => {
    if (overlayRaf && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(overlayRaf);
      overlayRaf = 0;
    }
    if (typeof onBeforeRenderFrame === "function") onBeforeRenderFrame();
    const fastPan = !!st.pan;
    const tabSwitching = !!(wrap && wrap.classList && wrap.classList.contains("tab-switching"));
    const interactiveFast = !!((st.draft || st.clusterDrag || st.flowDrag));
    const flowEditActive = st.mode === "flowEdit";
    const forceLowDetail = !!(tabSwitching || (interactiveFast && !flowEditActive));
    renderPipeline.resetFrameTransient();
    const profile = createProfile("full");
    renderPipeline.renderScene({
      forceLowDetail,
      skipHeavyOverlays: !!(fastPan || tabSwitching || (interactiveFast && !flowEditActive)),
      profile
    });
    finishProfile(profile);
    if (el && el.zoomLabel) el.zoomLabel.textContent = `${Math.round(st.zoom * 100)}%`;
  };

  const renderOverlayNow = () => {
    if (renderRaf) return;
    const fastPan = !!st.pan;
    const tabSwitching = !!(wrap && wrap.classList && wrap.classList.contains("tab-switching"));
    const interactiveFast = !!((st.draft || st.clusterDrag || st.flowDrag));
    const flowEditActive = st.mode === "flowEdit";
    const profile = createProfile("overlay");
    if (renderPipeline && typeof renderPipeline.renderOverlay === "function") {
      renderPipeline.renderOverlay({
        skipHeavyOverlays: !!(fastPan || tabSwitching || (interactiveFast && !flowEditActive)),
        profile
      });
    }
    finishProfile(profile);
    if (wrap) wrap.dataset.panning = st.pan ? "1" : "0";
  };

  const render = (immediate = false) => {
    if (immediate || typeof requestAnimationFrame !== "function") {
      if (renderRaf && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(renderRaf);
        renderRaf = 0;
      }
      renderNow();
      return;
    }
    if (renderRaf) return;
    renderRaf = requestAnimationFrame(() => {
      renderRaf = 0;
      renderNow();
    });
  };

  const renderOverlay = (immediate = false) => {
    if (!overlayCtx && !overlayCanvas) {
      render(immediate);
      return;
    }
    if (immediate || typeof requestAnimationFrame !== "function") {
      if (overlayRaf && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(overlayRaf);
        overlayRaf = 0;
      }
      renderOverlayNow();
      return;
    }
    if (overlayRaf || renderRaf) return;
    overlayRaf = requestAnimationFrame(() => {
      overlayRaf = 0;
      renderOverlayNow();
    });
  };

  return {
    render,
    renderOverlay,
    renderOverlayNow,
    renderNow,
    drawGrid,
    drawGuides,
    drawDistanceGuide
  };
};
