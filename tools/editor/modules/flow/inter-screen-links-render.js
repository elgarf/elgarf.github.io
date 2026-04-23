export const setupInterScreenLinksRender = (deps = {}) => {
  const {
    st,
    isCellEditMode,
    isRigEditMode,
    normalizeViewMode,
    normalizeFlowLinks,
    flowAnchorKey,
    findFlowAnchorByEndpoint
  } = deps;

  const sampleBezier = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return {
      x: (u * u * u) * p0.x + 3 * (u * u) * t * p1.x + 3 * u * (t * t) * p2.x + (t * t * t) * p3.x,
      y: (u * u * u) * p0.y + 3 * (u * u) * t * p1.y + 3 * u * (t * t) * p2.y + (t * t * t) * p3.y
    };
  };
  const curveCache = new Map();
  const getCurveGeom = (a, b, steps = 18) => {
    const ax = +a.x || 0, ay = +a.y || 0, bx = +b.x || 0, by = +b.y || 0;
    const key = `${Math.round(ax * 10) / 10},${Math.round(ay * 10) / 10},${Math.round(bx * 10) / 10},${Math.round(by * 10) / 10},${steps}`;
    const cached = curveCache.get(key);
    if (cached) return cached;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.max(20, Math.hypot(dx, dy));
    const sag = Math.max(8, Math.min(120, len * 0.18));
    const c1 = { x: ax + dx * 0.25, y: ay + dy * 0.25 + sag };
    const c2 = { x: ax + dx * 0.75, y: ay + dy * 0.75 + sag };
    const pts = [];
    for (let i = 1; i <= steps; i++) {
      pts.push(sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, i / steps));
    }
    const value = {
      c1, c2, pts,
      t0: sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, 0.48),
      t1: sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, 0.52)
    };
    if (curveCache.size > 1024) curveCache.clear();
    curveCache.set(key, value);
    return value;
  };

  const drawFlowLinkArrow = (c, tail, head, color, z = 1) => {
    const dx = (+head.x || 0) - (+tail.x || 0);
    const dy = (+head.y || 0) - (+tail.y || 0);
    const len = Math.hypot(dx, dy);
    if (len <= 1e-6) return;
    const ux = dx / len;
    const uy = dy / len;
    const size = Math.max(6, 12 / Math.max(0.3, z || 1));
    const halfW = size * 0.48;
    const bx = (+head.x || 0) - ux * size;
    const by = (+head.y || 0) - uy * size;
    const nx = -uy;
    const ny = ux;
    c.save();
    c.fillStyle = color;
    c.strokeStyle = "rgba(0,0,0,.55)";
    c.lineWidth = Math.max(0.8, 1 / Math.max(0.3, z || 1));
    c.beginPath();
    c.moveTo(+head.x || 0, +head.y || 0);
    c.lineTo(bx + nx * halfW, by + ny * halfW);
    c.lineTo(bx - nx * halfW, by - ny * halfW);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  };

  const drawInterScreenFlowLinks = (c, force = false) => {
    if (isCellEditMode() || isRigEditMode()) return;
    if (!force && normalizeViewMode(st.viewMode) !== "install" && st.mode !== "flowEdit") return;
    const links = normalizeFlowLinks(st.flowLinks);
    st.flowLinkSegments = [];
    const strokeOutlinedPath = (path, outlineColor, outlineWidth, color, width) => {
      c.strokeStyle = outlineColor;
      c.lineWidth = outlineWidth;
      c.stroke(path);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke(path);
    };
    const hoverSegKey = st.flowLinkHover && st.flowLinkHover.key ? String(st.flowLinkHover.key) : "";
    const linkDrag = st.mode === "flowEdit" ? st.flowLinkDrag : null;
    const dragTargetKey = (linkDrag && linkDrag.target) ? flowAnchorKey(linkDrag.target) : "";
    for (const ln of links) {
      const a = findFlowAnchorByEndpoint(ln.from);
      const b = findFlowAnchorByEndpoint(ln.to);
      if (!a || !b) continue;
      const key = `${flowAnchorKey(ln.from)}>${flowAnchorKey(ln.to)}`;
      const geom = getCurveGeom(a, b, 18);
      const strokeColor = (key === hoverSegKey) ? "rgba(255,99,99,.98)" : "rgba(255,193,7,.95)";
      const pts = geom.pts;
      let prev = { x: a.x, y: a.y };
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
        prev = p;
      }
      c.save();
      const baseW = Math.max(1.2, 2.2 / Math.max(0.2, st.zoom || 1));
      const path = new Path2D();
      path.moveTo(a.x, a.y);
      for (const p of pts) path.lineTo(p.x, p.y);
      strokeOutlinedPath(
        path,
        "rgba(12,16,22,.92)",
        baseW + Math.max(1.2, 1.8 / Math.max(0.25, st.zoom || 1)),
        strokeColor,
        baseW
      );
      c.restore();
      drawFlowLinkArrow(c, geom.t0, geom.t1, strokeColor, st.zoom || 1);
    }
    if (linkDrag && linkDrag.from) {
      const a = linkDrag.from;
      const b = { x: +linkDrag.x || 0, y: +linkDrag.y || 0 };
      const geom = getCurveGeom(a, b, 24);
      c.save();
      const previewColor = linkDrag.canLink ? "rgba(255,193,7,.98)" : "rgba(255,99,99,.98)";
      const previewW = Math.max(1.4, 2.4 / Math.max(0.2, st.zoom || 1));
      c.setLineDash([7 / Math.max(0.2, st.zoom || 1), 5 / Math.max(0.2, st.zoom || 1)]);
      const previewPath = new Path2D();
      previewPath.moveTo(a.x, a.y);
      previewPath.bezierCurveTo(geom.c1.x, geom.c1.y, geom.c2.x, geom.c2.y, b.x, b.y);
      strokeOutlinedPath(
        previewPath,
        "rgba(12,16,22,.92)",
        previewW + Math.max(1.2, 1.8 / Math.max(0.25, st.zoom || 1)),
        previewColor,
        previewW
      );
      c.setLineDash([]);
      c.restore();
      drawFlowLinkArrow(c, geom.t0, geom.t1, previewColor, st.zoom || 1);
    }
    if (st.mode === "flowEdit") {
      for (const a of st.flowLinkAnchors) {
        const isStart = a.kind === "start";
        const k = flowAnchorKey(a);
        const isDragTarget = (dragTargetKey && dragTargetKey === k);
        c.save();
        c.fillStyle = isStart ? "rgba(64,190,255,.92)" : "rgba(255,170,64,.92)";
        if (isDragTarget) c.fillStyle = linkDrag && linkDrag.canLink ? "rgba(255,193,7,.96)" : "rgba(255,99,99,.96)";
        c.strokeStyle = "rgba(0,0,0,.75)";
        c.lineWidth = Math.max(1, 1.2 / Math.max(0.2, st.zoom || 1));
        c.beginPath();
        c.arc(a.x, a.y, Math.max(4, 6 / Math.max(0.6, st.zoom || 1)), 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
      }
    }
  };

  return {
    drawInterScreenFlowLinks
  };
};
