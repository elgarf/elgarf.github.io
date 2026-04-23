import { sampleBezier, buildSagBezierControls } from "./bezier-utils.js";

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

  const curveCache = new Map();
  const toNum = v => +v || 0;
  const zoomSafe = (z, min = 0.2) => Math.max(min, toNum(z) || 1);
  const rounded1 = v => Math.round(toNum(v) * 10) / 10;
  const outlineWidthForZoom = z => Math.max(1.2, 1.8 / zoomSafe(z, 0.25));
  const strokeWidthForZoom = (z, min = 1.2, factor = 2.2) => Math.max(min, factor / zoomSafe(z));
  const anchorRadiusForZoom = z => Math.max(4, 6 / zoomSafe(z, 0.6));

  const getCurveGeom = (a, b, steps = 18) => {
    const ax = toNum(a.x), ay = toNum(a.y), bx = toNum(b.x), by = toNum(b.y);
    const key = `${rounded1(ax)},${rounded1(ay)},${rounded1(bx)},${rounded1(by)},${steps}`;
    const cached = curveCache.get(key);
    if (cached) return cached;
    const { c1, c2 } = buildSagBezierControls({ x: ax, y: ay }, { x: bx, y: by });
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
    const dx = toNum(head.x) - toNum(tail.x);
    const dy = toNum(head.y) - toNum(tail.y);
    const len = Math.hypot(dx, dy);
    if (len <= 1e-6) return;
    const ux = dx / len;
    const uy = dy / len;
    const size = Math.max(6, 12 / zoomSafe(z, 0.3));
    const halfW = size * 0.48;
    const bx = toNum(head.x) - ux * size;
    const by = toNum(head.y) - uy * size;
    const nx = -uy;
    const ny = ux;
    c.save();
    c.fillStyle = color;
    c.strokeStyle = "rgba(0,0,0,.55)";
    c.lineWidth = Math.max(0.8, 1 / zoomSafe(z, 0.3));
    c.beginPath();
    c.moveTo(toNum(head.x), toNum(head.y));
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
    const drawLinkPath = (path, color, width) => {
      strokeOutlinedPath(
        path,
        "rgba(12,16,22,.92)",
        width + outlineWidthForZoom(st.zoom),
        color,
        width
      );
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
      const baseW = strokeWidthForZoom(st.zoom, 1.2, 2.2);
      const path = new Path2D();
      path.moveTo(a.x, a.y);
      for (const p of pts) path.lineTo(p.x, p.y);
      drawLinkPath(path, strokeColor, baseW);
      c.restore();
      drawFlowLinkArrow(c, geom.t0, geom.t1, strokeColor, st.zoom || 1);
    }
    if (linkDrag && linkDrag.from) {
      const a = linkDrag.from;
      const b = { x: toNum(linkDrag.x), y: toNum(linkDrag.y) };
      const geom = getCurveGeom(a, b, 24);
      c.save();
      const previewColor = linkDrag.canLink ? "rgba(255,193,7,.98)" : "rgba(255,99,99,.98)";
      const previewW = strokeWidthForZoom(st.zoom, 1.4, 2.4);
      c.setLineDash([7 / zoomSafe(st.zoom), 5 / zoomSafe(st.zoom)]);
      const previewPath = new Path2D();
      previewPath.moveTo(a.x, a.y);
      previewPath.bezierCurveTo(geom.c1.x, geom.c1.y, geom.c2.x, geom.c2.y, b.x, b.y);
      drawLinkPath(previewPath, previewColor, previewW);
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
        c.lineWidth = Math.max(1, 1.2 / zoomSafe(st.zoom));
        c.beginPath();
        c.arc(a.x, a.y, anchorRadiusForZoom(st.zoom), 0, Math.PI * 2);
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
