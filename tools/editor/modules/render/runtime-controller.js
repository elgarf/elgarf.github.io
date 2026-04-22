export const setupRenderRuntimeController = (deps = {}) => {
  const {
    ctx,
    st,
    cv,
    wrap,
    s2w,
    w2s,
    fontFamilyCss,
    el,
    renderPipeline,
    onBeforeRenderFrame
  } = deps;

  const drawGrid = () => {
    let step = 64;
    const lt = s2w(0, 0);
    const rb = s2w(cv.clientWidth, cv.clientHeight);
    const maxLines = 220;
    while (((rb.x - lt.x) / step) > maxLines || ((rb.y - lt.y) / step) > maxLines) step *= 2;
    const sx = Math.floor(lt.x / step) * step;
    const ex = Math.ceil(rb.x / step) * step;
    const sy = Math.floor(lt.y / step) * step;
    const ey = Math.ceil(rb.y / step) * step;
    ctx.save();
    ctx.strokeStyle = "rgba(147,177,207,.09)";
    ctx.lineWidth = 1;
    const vPath = new Path2D();
    for (let x = sx; x <= ex; x += step) {
      const px = w2s(x, 0).x;
      const xp = Math.round(px) + .5;
      vPath.moveTo(xp, 0);
      vPath.lineTo(xp, cv.clientHeight);
    }
    ctx.stroke(vPath);
    const hPath = new Path2D();
    for (let y = sy; y <= ey; y += step) {
      const py = w2s(0, y).y;
      const yp = Math.round(py) + .5;
      hPath.moveTo(0, yp);
      hPath.lineTo(cv.clientWidth, yp);
    }
    ctx.stroke(hPath);
    ctx.restore();
  };

  const drawGuides = () => {
    if (st.g.x == null && st.g.y == null) return;
    ctx.save();
    ctx.strokeStyle = "rgba(74,200,255,.9)";
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1;
    if (st.g.x != null) {
      const x = w2s(st.g.x, 0).x;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cv.clientHeight);
      ctx.stroke();
    }
    if (st.g.y != null) {
      const y = w2s(0, st.g.y).y;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cv.clientWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawDistanceGuide = () => {
    if (!st.dg) return;
    const drawDim = (g, color, labelShift) => {
      let { x1, y1, x2, y2, v, axis } = g;
      const p1 = w2s(x1, y1);
      const p2 = w2s(x2, y2);
      const t = `${Math.round(v)} px`;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      if (!st.fontReady) {
        ctx.restore();
        return;
      }
      ctx.font = `12px ${fontFamilyCss(st.fontFamily)}`;
      const tw = ctx.measureText(t).width + 10;
      ctx.fillStyle = "rgba(15,19,24,.85)";
      if (axis === "y") {
        const m = (p1.y + p2.y) / 2;
        ctx.beginPath();
        ctx.moveTo(p1.x - 7, p1.y);
        ctx.lineTo(p1.x + 7, p1.y);
        ctx.moveTo(p2.x - 7, p2.y);
        ctx.lineTo(p2.x + 7, p2.y);
        ctx.stroke();
        ctx.fillRect(p1.x + 8 + labelShift, m - 8, tw, 16);
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(t, p1.x + 13 + labelShift, m);
      } else {
        if (p1.x > p2.x) {
          const tx = p1.x;
          p1.x = p2.x;
          p2.x = tx;
        }
        const m = (p1.x + p2.x) / 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - 7);
        ctx.lineTo(p1.x, p1.y + 7);
        ctx.moveTo(p2.x, p2.y - 7);
        ctx.lineTo(p2.x, p2.y + 7);
        ctx.stroke();
        ctx.fillRect(m - tw / 2, p1.y - 24 - labelShift, tw, 16);
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t, m, p1.y - 16 - labelShift);
      }
      ctx.restore();
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

  const renderNow = () => {
    if (typeof onBeforeRenderFrame === "function") onBeforeRenderFrame();
    const fastPan = !!st.pan;
    const tabSwitching = !!(wrap && wrap.classList && wrap.classList.contains("tab-switching"));
    const interactiveFast = !!(st.drag || st.draft || st.clusterDrag || st.flowDrag);
    const flowEditActive = st.mode === "flowEdit";
    const forceLowDetail = !!(fastPan || tabSwitching || (interactiveFast && !flowEditActive));
    renderPipeline.resetFrameTransient();
    renderPipeline.renderScene({
      forceLowDetail,
      skipHeavyOverlays: !!(fastPan || tabSwitching || (interactiveFast && !flowEditActive))
    });
    if (el && el.zoomLabel) el.zoomLabel.textContent = `${Math.round(st.zoom * 100)}%`;
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

  return {
    render,
    renderNow,
    drawGrid,
    drawGuides,
    drawDistanceGuide
  };
};
