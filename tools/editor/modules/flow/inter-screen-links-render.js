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
  const rectById = id => {
    const rid = Math.max(1, Math.round(Number(id) || 0));
    return (Array.isArray(st && st.rects) ? st.rects : []).find(r => Math.max(1, Math.round(Number(r && r.id) || 0)) === rid) || null;
  };
  const isDevice = r => String((r && r.kind) || "").toLowerCase() === "device";
  const deviceType = r => {
    const v = String((r && r.deviceType) || "controller").toLowerCase();
    return (v === "pc" || v === "mixer" || v === "camera") ? v : "controller";
  };
  const isPcLike = type => type === "pc" || type === "mixer" || type === "camera";
  const outPurePalette = [
    "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff",
    "#ff8000", "#8000ff", "#00ff80", "#ff0080", "#ffffff"
  ];
  const outControllerColor = cid => outPurePalette[Math.max(0, Math.round(Number(cid) || 1) - 1) % outPurePalette.length];
  const withAlpha = (hex, alpha = 0.58) => {
    const h = String(hex || "").trim();
    const m = h.match(/^#([0-9a-f]{6})$/i);
    if (!m) return hex;
    const n = m[1];
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

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
  const deviceOutTailPoint = (a, b, cid = 1, sideDir = null, aimPoint = null) => {
    const ax = toNum(a.x), ay = toNum(a.y);
    const hasAim = !!(aimPoint && typeof aimPoint === "object");
    const tx = hasAim && Number.isFinite(Number(aimPoint.x)) ? toNum(aimPoint.x) : toNum(b && b.x);
    const ty = hasAim && Number.isFinite(Number(aimPoint.y)) ? toNum(aimPoint.y) : toNum(b && b.y);
    const bx = toNum(b && b.x), by = toNum(b && b.y);
    let dx = tx - ax;
    let dy = ty - ay;
    let d = Math.hypot(dx, dy);
    if (d <= 1e-6) {
      const dir = Number(sideDir) === -1 ? -1 : Number(sideDir) === 1 ? 1 : (bx >= ax ? 1 : -1);
      dx = dir;
      dy = 1;
      d = Math.hypot(dx, dy);
    }
    const ux = dx / d;
    const uy = dy / d;
    const idx = Math.max(0, Math.round(Number(cid) || 1) - 1);
    const len = 16 + idx * 7;
    return { x: ax + ux * len, y: ay + uy * len };
  };
  const deviceInTailPoint = (a, b, cid = 1, sideDir = null, aimPoint = null) => {
    const hasAim = !!(aimPoint && typeof aimPoint === "object");
    const ax = hasAim && Number.isFinite(Number(aimPoint.x)) ? toNum(aimPoint.x) : toNum(a && a.x);
    const ay = hasAim && Number.isFinite(Number(aimPoint.y)) ? toNum(aimPoint.y) : toNum(a && a.y);
    const bx = toNum(b.x), by = toNum(b.y);
    let dx = ax - bx;
    let dy = ay - by;
    let d = Math.hypot(dx, dy);
    if (d <= 1e-6) {
      const dir = Number(sideDir) === -1 ? -1 : Number(sideDir) === 1 ? 1 : (bx >= ax ? 1 : -1);
      dx = dir;
      dy = -1;
      d = Math.hypot(dx, dy);
    }
    const ux = dx / d;
    const uy = dy / d;
    const idx = Math.max(0, Math.round(Number(cid) || 1) - 1);
    const len = 16 + idx * 7;
    return { x: bx + ux * len, y: by + uy * len };
  };
  const screenStartTailPoint = (fromPoint, toPoint, len = 16, sideDir = 1, aimPoint = null) => {
    const fx = toNum(fromPoint && fromPoint.x);
    const fy = toNum(fromPoint && fromPoint.y);
    const tx = toNum(toPoint && toPoint.x);
    const ty = toNum(toPoint && toPoint.y);
    const ax = (aimPoint && Number.isFinite(Number(aimPoint.x))) ? toNum(aimPoint.x) : fx;
    const ay = (aimPoint && Number.isFinite(Number(aimPoint.y))) ? toNum(aimPoint.y) : fy;
    const dx = ax - tx;
    const dy = ay - ty;
    const d = Math.hypot(dx, dy);
    if (d <= 1e-6) return { x: tx, y: ty - len };
    const ux = dx / d;
    const uy = dy / d;
    if (aimPoint && Number.isFinite(Number(aimPoint.x)) && Number.isFinite(Number(aimPoint.y))) {
      return { x: tx + ux * len, y: ty + uy * len };
    }
    const nx = -uy;
    const ny = ux;
    const dev = Math.max(6, Math.min(18, len * 0.45));
    const s = Number(sideDir) === -1 ? -1 : 1;
    return { x: tx + ux * len + nx * dev * s, y: ty + uy * len + ny * dev * s };
  };
  const getStemSmoothGeom = (pStart, pEnd, opts = {}, steps = 18) => {
    const {
      stemStartAnchor = null, // point before pStart (for tangent direction at start)
      stemEndAnchor = null,   // point after pEnd (for tangent direction at end)
      radiusMul = 1
    } = (opts && typeof opts === "object") ? opts : {};
    const dx = toNum(pEnd.x) - toNum(pStart.x);
    const dy = toNum(pEnd.y) - toNum(pStart.y);
    const dist = Math.max(1, Math.hypot(dx, dy));
    const rm = Math.max(0.5, Number(radiusMul) || 1);
    const lead = Math.max(26 * rm, Math.min(dist * (0.78 * rm), 162 * rm));
    const norm = (vx, vy) => {
      const len = Math.hypot(vx, vy);
      if (len <= 1e-6) return { x: 0, y: 1 };
      return { x: vx / len, y: vy / len };
    };
    const tStart = stemStartAnchor
      ? norm(toNum(pStart.x) - toNum(stemStartAnchor.x), toNum(pStart.y) - toNum(stemStartAnchor.y))
      : norm(dx, dy);
    const tEnd = stemEndAnchor
      ? norm(toNum(stemEndAnchor.x) - toNum(pEnd.x), toNum(stemEndAnchor.y) - toNum(pEnd.y))
      : norm(dx, dy);
    const nearX = Math.abs(dx) <= Math.max(18, dist * 0.08);
    const nearY = Math.abs(dy) <= Math.max(18, dist * 0.08);
    const sideSign = dx >= 0 ? 1 : -1;
    const swayX = nearX ? sideSign * Math.max(14, Math.min(42, dist * 0.22)) : 0;
    const swayY = nearY ? Math.max(10, Math.min(30, dist * 0.16)) : 0;
    const c1 = { x: toNum(pStart.x) + tStart.x * lead + swayX, y: toNum(pStart.y) + tStart.y * lead + swayY };
    const c2 = { x: toNum(pEnd.x) - tEnd.x * lead + swayX, y: toNum(pEnd.y) - tEnd.y * lead + swayY };
    const pts = [];
    for (let i = 1; i <= steps; i++) pts.push(sampleBezier(pStart, c1, c2, pEnd, i / steps));
    return {
      c1, c2, pts,
      t0: sampleBezier(pStart, c1, c2, pEnd, 0.48),
      t1: sampleBezier(pStart, c1, c2, pEnd, 0.52)
    };
  };
  const lerpPoint = (a, b, t) => ({ x: toNum(a.x) + (toNum(b.x) - toNum(a.x)) * t, y: toNum(a.y) + (toNum(b.y) - toNum(a.y)) * t });
  const getLinkControlPointCount = ln => Math.max(2, Math.min(6, Math.round(Number(ln && ln.controlPointCount) || 2)));
  const getLinkControlOffsets = (ln, count) => {
    const need = Math.max(0, count - 2);
    const src = Array.isArray(ln && ln.controlOffsets) ? ln.controlOffsets : [];
    const out = [];
    for (let i = 0; i < need; i++) {
      const it = src[i] && typeof src[i] === "object" ? src[i] : null;
      out.push({ x: Number(it && it.x) || 0, y: Number(it && it.y) || 0 });
    }
    return out;
  };
  const buildLinkPoints = (pStart, pEnd, count, offsets) => {
    const pts = [{ x: pStart.x, y: pStart.y }];
    const n = Math.max(2, Math.round(Number(count) || 2));
    const offs = Array.isArray(offsets) ? offsets : [];
    for (let i = 1; i < n - 1; i++) {
      const t = i / (n - 1);
      const base = lerpPoint(pStart, pEnd, t);
      const off = offs[i - 1] || { x: 0, y: 0 };
      pts.push({ x: base.x + (Number(off.x) || 0), y: base.y + (Number(off.y) || 0), t });
    }
    pts.push({ x: pEnd.x, y: pEnd.y });
    return pts;
  };
  const sampleQuadratic = (p0, c1, p1, t) => {
    const u = 1 - t;
    return {
      x: u * u * toNum(p0.x) + 2 * u * t * toNum(c1.x) + t * t * toNum(p1.x),
      y: u * u * toNum(p0.y) + 2 * u * t * toNum(c1.y) + t * t * toNum(p1.y)
    };
  };
  const getLinkBendOffsets = (ln, pointCount, points) => {
    const segCount = Math.max(1, pointCount - 1);
    const src = Array.isArray(ln && ln.bendOffsets) ? ln.bendOffsets : [];
    const hasExplicit = src.length >= segCount && src.some(it => {
      const x = Number(it && it.x);
      const y = Number(it && it.y);
      return Number.isFinite(x) && Number.isFinite(y) && (Math.abs(x) > 0.001 || Math.abs(y) > 0.001);
    });
    const out = [];
    const pStart = points[0];
    const pEnd = points[points.length - 1];
    const overallDx = toNum(pEnd.x) - toNum(pStart.x);
    const side = overallDx >= 0 ? 1 : -1;
    for (let i = 0; i < segCount; i++) {
      const it = src[i] && typeof src[i] === "object" ? src[i] : null;
      if (hasExplicit && it && Number.isFinite(Number(it.x)) && Number.isFinite(Number(it.y))) {
        out.push({ x: Number(it.x), y: Number(it.y) });
        continue;
      }
      const a = points[i];
      const b = points[i + 1];
      const dx = toNum(b.x) - toNum(a.x);
      const dy = toNum(b.y) - toNum(a.y);
      const d = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / d;
      const ny = dx / d;
      const mag = Math.max(12, Math.min(96, d * 0.24));
      out.push({ x: nx * mag * side, y: ny * mag * side });
    }
    return out;
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

  const simplifyOrthogonalPoints = points => {
    const src = Array.isArray(points) ? points : [];
    const out = [];
    for (const p of src) {
      const x = toNum(p && p.x);
      const y = toNum(p && p.y);
      const prev = out[out.length - 1];
      if (prev && Math.hypot(prev.x - x, prev.y - y) < 0.5) continue;
      out.push({ x, y });
    }
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      const sameX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5;
      const sameY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5;
      if (sameX || sameY) out.splice(i, 1);
    }
    return out;
  };

  const buildRoundedOrthogonalPath = points => {
    const pts = simplifyOrthogonalPoints(points);
    const path = new Path2D();
    if (!pts.length) return { path, points: [] };
    path.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) return { path, points: pts };
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const next = pts[i + 1];
      if (i === 1 || i === pts.length - 2) {
        path.lineTo(cur.x, cur.y);
        continue;
      }
      const l1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      const l2 = Math.hypot(next.x - cur.x, next.y - cur.y);
      const r = Math.min(18, Math.max(4, Math.min(l1, l2) * 0.35));
      const inPt = {
        x: cur.x - Math.sign(cur.x - prev.x) * r,
        y: cur.y - Math.sign(cur.y - prev.y) * r
      };
      const outPt = {
        x: cur.x + Math.sign(next.x - cur.x) * r,
        y: cur.y + Math.sign(next.y - cur.y) * r
      };
      path.lineTo(inPt.x, inPt.y);
      path.quadraticCurveTo(cur.x, cur.y, outPt.x, outPt.y);
    }
    const last = pts[pts.length - 1];
    path.lineTo(last.x, last.y);
    return { path, points: pts };
  };

  const drawInterScreenFlowLinks = (c, force = false) => {
    if (isCellEditMode() || isRigEditMode()) return;
    if (!force && normalizeViewMode(st.viewMode) !== "install" && st.mode !== "flowEdit") return;
    const links = normalizeFlowLinks(st.flowLinks);
    const exportPass = !!force;
    st.flowLinkSegments = [];
    st.flowLinkCurveHandles = [];
    const strokeOutlinedPath = (path, outlineColor, outlineWidth, color, width) => {
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = outlineColor;
      c.lineWidth = outlineWidth;
      c.stroke(path);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke(path);
    };
    const drawLinkPath = (path, color, width, lineType = "solid") => {
      const dashed = String(lineType || "").toLowerCase() === "dashed";
      if (dashed) c.setLineDash([10 / zoomSafe(st.zoom), 7 / zoomSafe(st.zoom)]);
      strokeOutlinedPath(
        path,
        "rgba(12,16,22,.92)",
        width + outlineWidthForZoom(st.zoom),
        color,
        width
      );
      if (dashed) c.setLineDash([]);
    };
    const hoverSegKey = st.flowLinkHover && st.flowLinkHover.key ? String(st.flowLinkHover.key) : "";
    const linkDrag = st.flowLinkDrag || null;
    const dragTargetKey = (linkDrag && linkDrag.target) ? flowAnchorKey(linkDrag.target) : "";
    for (const ln of links) {
      const a = findFlowAnchorByEndpoint(ln.from);
      const b = findFlowAnchorByEndpoint(ln.to);
      if (!a || !b) continue;
      const key = `${flowAnchorKey(ln.from)}>${flowAnchorKey(ln.to)}`;
      const geom = getCurveGeom(a, b, 18);
      const fromRect = rectById(ln && ln.from && ln.from.rectId);
      const toRect = rectById(ln && ln.to && ln.to.rectId);
      const fromType = deviceType(fromRect);
      const toType = deviceType(toRect);
      const fromCid = Math.max(1, Math.round(Number(ln && ln.from && ln.from.cid) || 1));
      const toCid = Math.max(1, Math.round(Number(ln && ln.to && ln.to.cid) || 1));
      const fromIsDevice = isDevice(fromRect);
      const toIsDevice = isDevice(toRect);
      const devicesLayerOn = !(st.installLayers && st.installLayers.devices === false);
      if (!force && !devicesLayerOn && (fromIsDevice || toIsDevice)) continue;
      const isPcLikeToController = isDevice(fromRect) && isPcLike(fromType) && isDevice(toRect) && toType === "controller";
      const isPcLikeToPcLike = isDevice(fromRect) && isPcLike(fromType) && isDevice(toRect) && isPcLike(toType);
      const isControllerOut = isDevice(fromRect) && fromType === "controller";
      const baseColor = isControllerOut
        ? outControllerColor(fromCid)
        : isPcLikeToPcLike
        ? "rgba(170,120,255,.95)"
        : isPcLikeToController
          ? "rgba(80,220,180,.95)"
          : "rgba(255,193,7,.95)";
      const customColor = (String(ln && ln.colorMode || "").toLowerCase() === "custom" && /^#[0-9a-f]{6}$/i.test(String(ln && ln.color || "").trim())) ? String(ln.color).trim() : null;
      const lineType = String(ln && ln.lineType || "").toLowerCase() === "dashed" ? "dashed" : "solid";
      const strokeColorRaw = (key === hoverSegKey) ? "rgba(255,99,99,.98)" : (customColor || baseColor);
      const strokeColor = fromIsDevice ? withAlpha(strokeColorRaw, 0.56) : strokeColorRaw;
      c.save();
      const linkWidth = Math.max(0.5, Math.min(20, Number(ln && ln.width) || 2.2));
      const baseW = exportPass
        ? strokeWidthForZoom(st.zoom, 0.85, Math.max(1.0, linkWidth * 0.66))
        : strokeWidthForZoom(st.zoom, 1.2, linkWidth);
      const orthogonalMid = Array.isArray(ln && ln.orthogonalPoints) ? ln.orthogonalPoints : [];
      if (orthogonalMid.length) {
        const route = buildRoundedOrthogonalPath([{ x: a.x, y: a.y }, ...orthogonalMid, { x: b.x, y: b.y }]);
        for (let i = 0; i < route.points.length - 1; i++) {
          st.flowLinkSegments.push({ key, a: route.points[i], b: route.points[i + 1], link: ln });
        }
        drawLinkPath(route.path, strokeColor, baseW, lineType);
        if (route.points.length >= 2) {
          const mid = Math.max(0, Math.floor((route.points.length - 2) / 2));
          drawFlowLinkArrow(c, route.points[mid], route.points[mid + 1], strokeColor, st.zoom || 1);
        }
        c.restore();
        continue;
      }
      if (fromIsDevice || toIsDevice) {
        const sideDir = (toNum(b.x) - toNum(a.x)) >= 0 ? 1 : -1;
        const legacyManualAbs = ln && ln.manualBezier && ln.manualBezier.c1 && ln.manualBezier.c2
          ? { c1: { x: toNum(ln.manualBezier.c1.x), y: toNum(ln.manualBezier.c1.y) }, c2: { x: toNum(ln.manualBezier.c2.x), y: toNum(ln.manualBezier.c2.y) } }
          : null;
        const manualRelStored = (ln && ln.manualBezierRel && ln.manualBezierRel.c1 && ln.manualBezierRel.c2)
          ? {
            c1: { x: toNum(ln.manualBezierRel.c1.x), y: toNum(ln.manualBezierRel.c1.y) },
            c2: { x: toNum(ln.manualBezierRel.c2.x), y: toNum(ln.manualBezierRel.c2.y) }
          }
          : null;
        const manualRel = manualRelStored || (legacyManualAbs
          ? {
            c1: { x: legacyManualAbs.c1.x - toNum(a.x), y: legacyManualAbs.c1.y - toNum(a.y) },
            c2: { x: legacyManualAbs.c2.x - toNum(b.x), y: legacyManualAbs.c2.y - toNum(b.y) }
          }
          : null);
        const manualAbsByEndpoints = manualRel
          ? {
            c1: { x: a.x + manualRel.c1.x, y: a.y + manualRel.c1.y },
            c2: { x: b.x + manualRel.c2.x, y: b.y + manualRel.c2.y }
          }
          : legacyManualAbs;
        const pStart = { x: a.x, y: a.y };
        const pEnd = { x: b.x, y: b.y };
        const autoGeom = getStemSmoothGeom(
          pStart,
          pEnd,
          {
            stemStartAnchor: fromIsDevice ? a : null,
            stemEndAnchor: (toIsDevice || fromIsDevice) ? b : null,
            radiusMul: (fromIsDevice && !toIsDevice) ? 1.85 : 1
          },
          18
        );
        const controlPointCount = getLinkControlPointCount(ln);
        const controlOffsets = getLinkControlOffsets(ln, controlPointCount);
        const segRel = Array.isArray(ln && ln.segmentBezierRel) ? ln.segmentBezierRel : [];
        const buildSegments = (sPoint, ePoint) => {
          const points = buildLinkPoints(sPoint, ePoint, controlPointCount, controlOffsets);
          const segCount = Math.max(1, points.length - 1);
          const out = [];
          for (let i = 0; i < segCount; i++) {
            const s0 = points[i];
            const s1 = points[i + 1];
            const auto = buildSagBezierControls({ x: s0.x, y: s0.y }, { x: s1.x, y: s1.y });
            const rel = segRel[i] && typeof segRel[i] === "object" ? segRel[i] : null;
            const hasC1 = !!(rel && rel.c1 && Number.isFinite(Number(rel.c1.x)) && Number.isFinite(Number(rel.c1.y)));
            const hasC2 = !!(rel && rel.c2 && Number.isFinite(Number(rel.c2.x)) && Number.isFinite(Number(rel.c2.y)));
            const c1 = hasC1 ? { x: s0.x + (Number(rel.c1.x) || 0), y: s0.y + (Number(rel.c1.y) || 0) } : auto.c1;
            const c2 = hasC2 ? { x: s1.x + (Number(rel.c2.x) || 0), y: s1.y + (Number(rel.c2.y) || 0) } : auto.c2;
            out.push({ p0: s0, c1, c2, p1: s1, autoC1: auto.c1, autoC2: auto.c2, hasC1, hasC2 });
          }
          if (controlPointCount > 2 && out.length > 1) {
            for (let i = 1; i < points.length - 1; i++) {
              const prevSeg = out[i - 1];
              const nextSeg = out[i];
              const anchor = points[i];
              const prevExplicit = !!(prevSeg && prevSeg.hasC2);
              const nextExplicit = !!(nextSeg && nextSeg.hasC1);
              const mirrorFromNext = () => {
                const vx = (nextSeg.c1.x || 0) - (anchor.x || 0);
                const vy = (nextSeg.c1.y || 0) - (anchor.y || 0);
                prevSeg.c2 = { x: (anchor.x || 0) - vx, y: (anchor.y || 0) - vy };
              };
              const mirrorFromPrev = () => {
                const vx = (prevSeg.c2.x || 0) - (anchor.x || 0);
                const vy = (prevSeg.c2.y || 0) - (anchor.y || 0);
                nextSeg.c1 = { x: (anchor.x || 0) - vx, y: (anchor.y || 0) - vy };
              };
              if (prevExplicit && !nextExplicit) mirrorFromPrev();
              else if (!prevExplicit && nextExplicit) mirrorFromNext();
              else if (!prevExplicit && !nextExplicit) mirrorFromNext();
            }
          }
          return { points, segs: out };
        };
        let built = buildSegments(pStart, pEnd);
        let linkPoints = built.points;
        let segs = built.segs;
        if (controlPointCount > 2 && segs.length) {
          built = buildSegments(pStart, pEnd);
          linkPoints = built.points;
          segs = built.segs;
        }
        let prev = { x: pStart.x, y: pStart.y };
        if (controlPointCount <= 2) {
          const manualAbs = manualAbsByEndpoints;
          const geom2 = manualAbs
            ? {
              c1: manualAbs.c1,
              c2: manualAbs.c2,
              pts: (() => {
                const pts = [];
                for (let i = 1; i <= 18; i++) pts.push(sampleBezier(pStart, manualAbs.c1, manualAbs.c2, pEnd, i / 18));
                return pts;
              })(),
              t0: sampleBezier(pStart, manualAbs.c1, manualAbs.c2, pEnd, 0.48),
              t1: sampleBezier(pStart, manualAbs.c1, manualAbs.c2, pEnd, 0.52)
            }
            : autoGeom;
          for (let i = 0; i < geom2.pts.length; i++) {
            const p = geom2.pts[i];
            st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
            prev = p;
          }
          segs.length = 0;
          segs.push({ p0: pStart, p1: pEnd, c1: geom2.c1, c2: geom2.c2, autoC1: autoGeom.c1, autoC2: autoGeom.c2, legacy: true, t0: geom2.t0, t1: geom2.t1 });
        } else {
          for (const sg of segs) {
            const samples = 12;
            for (let i = 1; i <= samples; i++) {
              const p = sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, i / samples);
              st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
              prev = p;
            }
          }
        }
        const path = new Path2D();
        path.moveTo(a.x, a.y);
        for (const sg of segs) path.bezierCurveTo(sg.c1.x, sg.c1.y, sg.c2.x, sg.c2.y, sg.p1.x, sg.p1.y);
        drawLinkPath(path, strokeColor, baseW, lineType);
        for (const sg of segs) {
          const t0 = sg.legacy ? sg.t0 : sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, 0.48);
          const t1 = sg.legacy ? sg.t1 : sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, 0.52);
          drawFlowLinkArrow(c, t0, t1, strokeColor, st.zoom || 1);
        }
        if (!exportPass && String(st.mode || "") === "select" && String(st.flowLinkSelectedKey || "") === key) {
          const segRelSnapshot = segs.map(sg => ({
            c1: { x: (Number(sg.c1 && sg.c1.x) || 0) - (Number(sg.p0 && sg.p0.x) || 0), y: (Number(sg.c1 && sg.c1.y) || 0) - (Number(sg.p0 && sg.p0.y) || 0) },
            c2: { x: (Number(sg.c2 && sg.c2.x) || 0) - (Number(sg.p1 && sg.p1.x) || 0), y: (Number(sg.c2 && sg.c2.y) || 0) - (Number(sg.p1 && sg.p1.y) || 0) }
          }));
          const drawHandle = (pt, handle, anchor, fallbackExtra = null) => {
            st.flowLinkCurveHandles.push({
              key,
              handle,
              x: pt.x,
              y: pt.y,
              ax: anchor && Number.isFinite(Number(anchor.x)) ? Number(anchor.x) : null,
              ay: anchor && Number.isFinite(Number(anchor.y)) ? Number(anchor.y) : null,
              fallback: { c1: autoGeom.c1, c2: autoGeom.c2, start: pStart, end: pEnd, pointCount: controlPointCount, segmentRelSnapshot: segRelSnapshot, ...(fallbackExtra && typeof fallbackExtra === "object" ? fallbackExtra : {}) }
            });
          };
          const firstSeg = segs[0];
          const lastSeg = segs[segs.length - 1];
          if (firstSeg) drawHandle(firstSeg.c1, "c1", pStart, { pointCount: controlPointCount, edgeRole: "start" });
          if (lastSeg) drawHandle(lastSeg.c2, "c2", pEnd, { pointCount: controlPointCount, edgeRole: "end" });
          for (let i = 1; i < linkPoints.length - 1; i++) {
            const pt = linkPoints[i];
            const t = i / (controlPointCount - 1);
            const basePt = lerpPoint(pStart, pEnd, t);
            drawHandle(pt, `p${i}`, basePt, { start: pStart, end: pEnd, pointIndex: i, pointCount: controlPointCount });
          }
          for (let i = 1; i < linkPoints.length - 1; i++) {
            if (controlPointCount <= 2) break;
            const prevSeg = segs[i - 1];
            const nextSeg = segs[i];
            const anchorPoint = { x: linkPoints[i].x, y: linkPoints[i].y };
            const handlePoint = nextSeg ? nextSeg.c1 : (prevSeg ? prevSeg.c2 : anchorPoint);
            drawHandle(handlePoint, `p${i}bend`, anchorPoint, { pointIndex: i, pointCount: controlPointCount, anchor: anchorPoint });
          }
        }
      } else {
        const pts = geom.pts;
        let prev = { x: a.x, y: a.y };
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
          prev = p;
        }
        const path = new Path2D();
        path.moveTo(a.x, a.y);
        for (const p of pts) path.lineTo(p.x, p.y);
        drawLinkPath(path, strokeColor, baseW, lineType);
        drawFlowLinkArrow(c, geom.t0, geom.t1, strokeColor, st.zoom || 1);
      }
      c.restore();
    }
    if (linkDrag && linkDrag.from) {
      const a = linkDrag.from;
      const b = { x: toNum(linkDrag.x), y: toNum(linkDrag.y) };
      const geom = getCurveGeom(a, b, 24);
      c.save();
      const previewColor = linkDrag.canLink ? "rgba(255,193,7,.98)" : "rgba(255,99,99,.98)";
      const previewW = exportPass ? strokeWidthForZoom(st.zoom, 1.0, 1.7) : strokeWidthForZoom(st.zoom, 1.4, 2.4);
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

  const drawFlowLinkCurveHandlesOverlay = c => {
    if (!c || String(st.mode || "") !== "select") return;
    const handles = Array.isArray(st.flowLinkCurveHandles) ? st.flowLinkCurveHandles : [];
    if (!handles.length) return;
    const size = Math.max(5, 8 / zoomSafe(st.zoom, 0.35));
    const drawDiamond = (x, y) => {
      c.beginPath();
      c.moveTo(x, y - size);
      c.lineTo(x + size, y);
      c.lineTo(x, y + size);
      c.lineTo(x - size, y);
      c.closePath();
    };
    const drawCircle = (x, y) => {
      c.beginPath();
      c.arc(x, y, Math.max(3, size * 0.82), 0, Math.PI * 2);
      c.closePath();
    };
    c.save();
    for (const h of handles) {
      const x = toNum(h && h.x);
      const y = toNum(h && h.y);
      const handleName = String(h && h.handle || "");
      const isControlPoint = /^p\d+$/.test(handleName);
      const isBendControl = /^p\d+bend$/.test(handleName);
      const ax = Number.isFinite(Number(h && h.ax)) ? Number(h.ax) : null;
      const ay = Number.isFinite(Number(h && h.ay)) ? Number(h.ay) : null;
      if (!isControlPoint && ax != null && ay != null) {
        c.strokeStyle = "rgba(150,220,255,.82)";
        c.lineWidth = Math.max(1, 1.15 / zoomSafe(st.zoom, 0.35));
        c.setLineDash([5 / zoomSafe(st.zoom, 0.35), 4 / zoomSafe(st.zoom, 0.35)]);
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(x, y);
        c.stroke();
        c.setLineDash([]);
      }
      c.fillStyle = isControlPoint ? "rgba(255,213,92,.98)" : "rgba(80,220,180,.97)";
      c.strokeStyle = "rgba(0,0,0,.9)";
      c.lineWidth = Math.max(1, 1.35 / zoomSafe(st.zoom, 0.35));
      if (isControlPoint) drawCircle(x, y);
      else drawDiamond(x, y);
      c.fill();
      c.stroke();
      if (isBendControl && ax != null && ay != null) {
        const gx = ax * 2 - x;
        const gy = ay * 2 - y;
        c.save();
        c.strokeStyle = "rgba(150,220,255,.42)";
        c.lineWidth = Math.max(1, 1.0 / zoomSafe(st.zoom, 0.35));
        c.setLineDash([4 / zoomSafe(st.zoom, 0.35), 4 / zoomSafe(st.zoom, 0.35)]);
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(gx, gy);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "rgba(0,0,0,0)";
        c.strokeStyle = "rgba(80,220,180,.42)";
        c.lineWidth = Math.max(1, 1.1 / zoomSafe(st.zoom, 0.35));
        drawDiamond(gx, gy);
        c.stroke();
        c.restore();
      }
    }
    c.restore();
  };

  return {
    drawInterScreenFlowLinks,
    drawFlowLinkCurveHandlesOverlay
  };
};
