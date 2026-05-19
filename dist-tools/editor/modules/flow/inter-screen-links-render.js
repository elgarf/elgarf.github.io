/* build:1779222473 */
import { sampleBezier, buildSagBezierControls } from "./bezier-utils.js";
import { autoFlowLinkColor } from "../utils/device-utils.js";
import { isDeviceRectKind } from "../utils/rect-kind-utils.js";
import { isFlowLinkSelected } from "../utils/flow-link-selection-state.js";
import { getSelectedFlowLinkKeySet } from "../utils/selected-flow-links.js";

export const setupInterScreenLinksRender = (deps = {}) => {
  const {
    st,
    isCellEditMode,
    isRigEditMode,
    normalizeViewMode,
    normalizeFlowLinks,
    flowAnchorKey,
    flowLinkKeyOf,
    findFlowAnchorByEndpoint
  } = deps;
  const rectById = id => {
    const rid = Math.max(1, Math.round(Number(id) || 0));
    return (Array.isArray(st && st.rects) ? st.rects : []).find(r => Math.max(1, Math.round(Number(r && r.id) || 0)) === rid) || null;
  };
  const isDevice = r => isDeviceRectKind(r);
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
  const darkenColor = (color, factor = 0.66) => {
    const src = String(color || "").trim();
    const hex = src.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const n = hex[1];
      const r = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(0, 2), 16) * factor)));
      const g = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(2, 4), 16) * factor)));
      const b = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(4, 6), 16) * factor)));
      const toHex = v => v.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    const rgba = src.match(/^rgba?\(([^)]+)\)$/i);
    if (rgba) {
      const parts = rgba[1].split(",").map(s => s.trim());
      const r = Math.max(0, Math.min(255, Math.round((Number(parts[0]) || 0) * factor)));
      const g = Math.max(0, Math.min(255, Math.round((Number(parts[1]) || 0) * factor)));
      const b = Math.max(0, Math.min(255, Math.round((Number(parts[2]) || 0) * factor)));
      const a = parts.length > 3 ? Math.max(0, Math.min(1, Number(parts[3]) || 1)) : 1;
      return `rgba(${r},${g},${b},${a})`;
    }
    return src;
  };

  const curveCache = new Map();
  const orthogonalPathCache = new Map();
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
      t1: sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, 0.52),
      path: null
    };
    if (typeof Path2D !== "undefined") {
      const path = new Path2D();
      path.moveTo(ax, ay);
      path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, bx, by);
      value.path = path;
    }
    if (curveCache.size > 1024) curveCache.clear();
    curveCache.set(key, value);
    return value;
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
  const routeOrthogonalToEndpoints = points => {
    const pts = simplifyOrthogonalPoints(points);
    if (pts.length < 2) return pts;
    const segmentAxis = (a, b) => {
      if (!a || !b) return "";
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) >= 0.5) return "h";
      if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) >= 0.5) return "v";
      return "";
    };
    const scoreElbow = (p0, elbow, p1, prev, next) => {
      let score = 0;
      const firstAxis = segmentAxis(p0, elbow);
      const secondAxis = segmentAxis(elbow, p1);
      const prevAxis = segmentAxis(prev, p0);
      const nextAxis = segmentAxis(p1, next);
      if (prevAxis && firstAxis === prevAxis) score -= 4;
      if (nextAxis && secondAxis === nextAxis) score -= 4;
      if (prevAxis && firstAxis && firstAxis !== prevAxis) score += 1;
      if (nextAxis && secondAxis && secondAxis !== nextAxis) score += 1;
      return score;
    };
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      out.push(p0);
      if (Math.abs(p0.x - p1.x) >= 0.5 && Math.abs(p0.y - p1.y) >= 0.5) {
        const prev = i > 0 ? pts[i - 1] : null;
        const next = i < pts.length - 2 ? pts[i + 2] : null;
        const elbowA = { x: p1.x, y: p0.y };
        const elbowB = { x: p0.x, y: p1.y };
        out.push(scoreElbow(p0, elbowA, p1, prev, next) <= scoreElbow(p0, elbowB, p1, prev, next) ? elbowA : elbowB);
      }
    }
    out.push(pts[pts.length - 1]);
    return simplifyOrthogonalPoints(out);
  };

  const buildRoundedOrthogonalPath = points => {
    const pts = routeOrthogonalToEndpoints(points);
    const path = new Path2D();
    if (!pts.length) return { path, points: [] };
    path.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) return { path, points: pts };
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const next = pts[i + 1];
      const dx1 = cur.x - prev.x;
      const dy1 = cur.y - prev.y;
      const dx2 = next.x - cur.x;
      const dy2 = next.y - cur.y;
      const horizontal1 = Math.abs(dy1) < 0.5 && Math.abs(dx1) >= 0.5;
      const vertical1 = Math.abs(dx1) < 0.5 && Math.abs(dy1) >= 0.5;
      const horizontal2 = Math.abs(dy2) < 0.5 && Math.abs(dx2) >= 0.5;
      const vertical2 = Math.abs(dx2) < 0.5 && Math.abs(dy2) >= 0.5;
      const orthogonalTurn = (horizontal1 && vertical2) || (vertical1 && horizontal2);
      if (!orthogonalTurn) {
        path.lineTo(cur.x, cur.y);
        continue;
      }
      const l1 = Math.hypot(dx1, dy1);
      const l2 = Math.hypot(dx2, dy2);
      const rawRadius = Math.min(l1, l2) * 0.35;
      const r = Math.min(18, Math.max(4, rawRadius));
      if (r < 1) {
        path.lineTo(cur.x, cur.y);
        continue;
      }
      const ux1 = dx1 / l1;
      const uy1 = dy1 / l1;
      const ux2 = dx2 / l2;
      const uy2 = dy2 / l2;
      const inPt = {
        x: cur.x - ux1 * r,
        y: cur.y - uy1 * r
      };
      const outPt = {
        x: cur.x + ux2 * r,
        y: cur.y + uy2 * r
      };
      path.lineTo(inPt.x, inPt.y);
      path.quadraticCurveTo(cur.x, cur.y, outPt.x, outPt.y);
    }
    const last = pts[pts.length - 1];
    path.lineTo(last.x, last.y);
    return { path, points: pts };
  };
  const getRoundedOrthogonalPathCached = points => {
    const key = (Array.isArray(points) ? points : []).map(p => `${rounded1(p && p.x)},${rounded1(p && p.y)}`).join("|");
    const cached = orthogonalPathCache.get(key);
    if (cached) return cached;
    const value = buildRoundedOrthogonalPath(points);
    if (orthogonalPathCache.size > 512) orthogonalPathCache.clear();
    orthogonalPathCache.set(key, value);
    return value;
  };

  const drawInterScreenFlowLinks = (c, force = false) => {
    if (isCellEditMode() || isRigEditMode()) return;
    if (!force && normalizeViewMode(st.viewMode) !== "install" && st.mode !== "flowEdit") return;
    const links = normalizeFlowLinks(st.flowLinks);
    const exportPass = !!force;
    const interactiveFast = !!(!exportPass && (st.pan || st.flowDrag || (st.drag && st.drag.moved) || st.draft || (st.touch && st.touch.type === "pinch")));
    const buildHitGeometry = !interactiveFast;
    const drawLabels = !interactiveFast;
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
    const drawLinkPath = (path, color, width, lineType = "solid", opts = {}) => {
      const useChecker = !!(opts && opts.checker);
      const checkerColorA = String((opts && opts.checkerColorA) || color);
      const checkerColorB = String((opts && opts.checkerColorB) || darkenColor(color, 0.68));
      const dashed = String(lineType || "").toLowerCase() === "dashed";
      const z = exportPass ? 1 : zoomSafe(st.zoom);
      if (!useChecker) {
        if (dashed) c.setLineDash([10 / z, 7 / z]);
        strokeOutlinedPath(
          path,
          "rgba(12,16,22,.92)",
          width + outlineWidthForZoom(z),
          color,
          width
        );
        if (dashed) c.setLineDash([]);
        return;
      }
      strokeOutlinedPath(
        path,
        "rgba(12,16,22,.92)",
        width + outlineWidthForZoom(z),
        checkerColorA,
        width
      );
      const block = Math.max(6 / z, Math.min(16 / z, width * 1.25));
      c.save();
      c.lineCap = "butt";
      c.lineJoin = "round";
      c.strokeStyle = checkerColorB;
      c.lineWidth = width;
      c.setLineDash([block, block]);
      c.lineDashOffset = block;
      c.stroke(path);
      c.restore();
    };
    const drawOrthogonalEditMarkers = (points, selectedKey) => {
      if (!Array.isArray(points) || points.length < 2 || exportPass || String(st.mode || "") !== "select") return;
      const selected = isFlowLinkSelected(st, selectedKey);
      const activeDrag = st.flowSegmentDrag && String(st.flowSegmentDrag.key || "") === String(selectedKey || "");
      const activeSegmentIndex = activeDrag ? Math.max(0, Math.round(Number(st.flowSegmentDrag.segmentIndex) || 0)) : -1;
      if (!selected && !activeDrag) return;
      const z = zoomSafe(st.zoom, 0.35);
      const markerLen = Math.max(10, 16 / z);
      const markerHalf = markerLen / 2;
      const markerGap = Math.max(4, 6 / z);
      const markW = Math.max(1.4, 2.2 / z);
      c.save();
      c.lineCap = "round";
      c.lineJoin = "round";
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const horizontal = Math.abs(toNum(a.y) - toNum(b.y)) < 0.5;
        const vertical = Math.abs(toNum(a.x) - toNum(b.x)) < 0.5;
        if (!horizontal && !vertical) continue;
        const mx = (toNum(a.x) + toNum(b.x)) / 2;
        const my = (toNum(a.y) + toNum(b.y)) / 2;
        c.strokeStyle = "rgba(8,12,18,.95)";
        c.lineWidth = markW + Math.max(1.5, 2.2 / z);
        c.beginPath();
        if (horizontal) {
          c.moveTo(mx - markerHalf, my - markerGap);
          c.lineTo(mx + markerHalf, my - markerGap);
          c.moveTo(mx - markerHalf, my + markerGap);
          c.lineTo(mx + markerHalf, my + markerGap);
        } else {
          c.moveTo(mx - markerGap, my - markerHalf);
          c.lineTo(mx - markerGap, my + markerHalf);
          c.moveTo(mx + markerGap, my - markerHalf);
          c.lineTo(mx + markerGap, my + markerHalf);
        }
        c.stroke();
        c.strokeStyle = activeSegmentIndex === i ? "rgba(255,193,7,.98)" : "rgba(150,220,255,.96)";
        c.lineWidth = markW;
        c.beginPath();
        if (horizontal) {
          c.moveTo(mx - markerHalf, my - markerGap);
          c.lineTo(mx + markerHalf, my - markerGap);
          c.moveTo(mx - markerHalf, my + markerGap);
          c.lineTo(mx + markerHalf, my + markerGap);
        } else {
          c.moveTo(mx - markerGap, my - markerHalf);
          c.lineTo(mx - markerGap, my + markerHalf);
          c.moveTo(mx + markerGap, my - markerHalf);
          c.lineTo(mx + markerGap, my + markerHalf);
        }
        c.stroke();
      }
      c.restore();
    };
    const drawOrthogonalArrows = (points, color) => {
      if (!Array.isArray(points) || points.length < 2) return;
      const z = zoomSafe(st.zoom, 0.35);
      const minLen = Math.max(28, 44 / z);
      const arrowSize = Math.max(6, 12 / zoomSafe(st.zoom, 0.3));
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i], p1 = points[i + 1];
        const x0 = toNum(p0.x), y0 = toNum(p0.y);
        const x1 = toNum(p1.x), y1 = toNum(p1.y);
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (len < minLen) continue;
        const ux = dx / len;
        const uy = dy / len;
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        const head = { x: mx + ux * arrowSize * 0.5, y: my + uy * arrowSize * 0.5 };
        const tail = { x: mx - ux * arrowSize, y: my - uy * arrowSize };
        drawFlowLinkArrow(c, tail, head, color, st.zoom || 1);
      }
    };
    const placedLabelBoxes = [];
    const boxesOverlap = (a, b, pad = 2) => {
      if (!a || !b) return false;
      return !(
        a.x2 + pad < b.x1
        || b.x2 + pad < a.x1
        || a.y2 + pad < b.y1
        || b.y2 + pad < a.y1
      );
    };
    const canPlaceLabelBox = box => !placedLabelBoxes.some(other => boxesOverlap(box, other, 3));
    const rememberLabelBox = box => {
      placedLabelBoxes.push(box);
      if (placedLabelBoxes.length > 400) placedLabelBoxes.shift();
    };
    const orientedTextBox = (cx, cy, angle, width, height) => {
      const hw = width / 2;
      const hh = height / 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const pts = [
        { x: cx + (-hw) * ca - (-hh) * sa, y: cy + (-hw) * sa + (-hh) * ca },
        { x: cx + (hw) * ca - (-hh) * sa, y: cy + (hw) * sa + (-hh) * ca },
        { x: cx + (hw) * ca - (hh) * sa, y: cy + (hw) * sa + (hh) * ca },
        { x: cx + (-hw) * ca - (hh) * sa, y: cy + (-hw) * sa + (hh) * ca }
      ];
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
    };
    const getCommutationLabel = ln => {
      if (!ln || !ln.isCommutation) return "";
      const raw = String(ln.commutationName || "");
      return raw.length ? raw : "Коммутация";
    };
    const polylineLength = points => {
      let len = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        len += Math.hypot(toNum(b.x) - toNum(a.x), toNum(b.y) - toNum(a.y));
      }
      return len;
    };
    const pointAtDistance = (points, dist) => {
      if (!Array.isArray(points) || points.length < 2) return null;
      let left = Math.max(0, Number(dist) || 0);
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = toNum(b.x) - toNum(a.x);
        const dy = toNum(b.y) - toNum(a.y);
        const seg = Math.hypot(dx, dy);
        if (seg <= 1e-6) continue;
        if (left <= seg) {
          const t = left / seg;
          return { x: toNum(a.x) + dx * t, y: toNum(a.y) + dy * t, angle: Math.atan2(dy, dx) };
        }
        left -= seg;
      }
      const pa = points[points.length - 2];
      const pb = points[points.length - 1];
      return { x: toNum(pb.x), y: toNum(pb.y), angle: Math.atan2(toNum(pb.y) - toNum(pa.y), toNum(pb.x) - toNum(pa.x)) };
    };
    const drawLabelOnSegment = (text, p0, p1) => {
      const value = String(text || "").trim();
      if (!value) return;
      const dx = toNum(p1.x) - toNum(p0.x);
      const dy = toNum(p1.y) - toNum(p0.y);
      const segLen = Math.hypot(dx, dy);
      if (segLen < 30) return;
      const z = zoomSafe(st.zoom, 0.35);
      const fontPx = Math.max(11, Math.min(17, 12 / z + 5));
      c.save();
      c.font = `${Math.round(fontPx)}px Roboto, Segoe UI, Arial, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      const w = c.measureText(value).width;
      if (w + 14 > segLen) { c.restore(); return; }
      let angle = Math.atan2(dy, dx);
      if (Math.cos(angle) < 0) angle += Math.PI;
      const ux = dx / segLen;
      const uy = dy / segLen;
      const shifts = [0, 26, -26, 52, -52];
      let place = null;
      for (const shift of shifts) {
        const mx = (toNum(p0.x) + toNum(p1.x)) / 2 + ux * shift;
        const my = (toNum(p0.y) + toNum(p1.y)) / 2 + uy * shift;
        const box = orientedTextBox(mx, my, angle, w + 8, fontPx + 6);
        if (canPlaceLabelBox(box)) { place = { mx, my, box }; break; }
      }
      if (!place) { c.restore(); return; }
      const { mx, my, box } = place;
      c.translate(mx, my);
      c.rotate(angle);
      c.lineWidth = Math.max(2.4, fontPx * 0.32);
      c.strokeStyle = "rgba(8,12,18,.92)";
      c.fillStyle = "rgba(245,248,255,.98)";
      c.strokeText(value, 0, 0);
      c.fillText(value, 0, 0);
      c.restore();
      rememberLabelBox(box);
    };
    const drawLabelAlongPath = (text, points) => {
      const value = String(text || "").trim();
      if (!value) return;
      const pts = Array.isArray(points) ? points : [];
      if (pts.length < 2) return;
      const z = zoomSafe(st.zoom, 0.35);
      const fontPx = Math.max(11, Math.min(16, 11 / z + 5));
      c.save();
      c.font = `${Math.round(fontPx)}px Roboto, Segoe UI, Arial, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      const chars = Array.from(value);
      const advance = chars.map(ch => Math.max(2, c.measureText(ch).width));
      const totalW = advance.reduce((s, x) => s + x, 0);
      const pathLen = polylineLength(pts);
      if (pathLen < totalW + 12) { c.restore(); return; }
      const startBase = (pathLen - totalW) / 2;
      const pathShifts = [0, 28, -28, 56, -56];
      let pathShift = null;
      for (const shift of pathShifts) {
        let testCursor = startBase + shift;
        let ok = true;
        const testBoxes = [];
        for (let i = 0; i < chars.length; i++) {
          const w = advance[i];
          const pos = pointAtDistance(pts, testCursor + w / 2);
          if (!pos) { ok = false; break; }
          let angle = pos.angle;
          if (Math.cos(angle) < 0) angle += Math.PI;
          const box = orientedTextBox(pos.x, pos.y, angle, w + 4, fontPx + 5);
          if (!canPlaceLabelBox(box) || testBoxes.some(b => boxesOverlap(b, box, 1))) { ok = false; break; }
          testBoxes.push(box);
          testCursor += w;
        }
        if (ok) { pathShift = { shift, testBoxes }; break; }
      }
      if (!pathShift) { c.restore(); return; }
      let cursor = startBase + pathShift.shift;
      for (let i = 0; i < chars.length; i++) {
        const w = advance[i];
        const pos = pointAtDistance(pts, cursor + w / 2);
        if (!pos) { cursor += w; continue; }
        let angle = pos.angle;
        if (Math.cos(angle) < 0) angle += Math.PI;
        c.save();
        c.translate(pos.x, pos.y);
        c.rotate(angle);
        c.lineWidth = Math.max(2.2, fontPx * 0.3);
        c.strokeStyle = "rgba(8,12,18,.9)";
        c.fillStyle = "rgba(245,248,255,.98)";
        c.strokeText(chars[i], 0, 0);
        c.fillText(chars[i], 0, 0);
        c.restore();
        cursor += w;
      }
      for (const box of pathShift.testBoxes) rememberLabelBox(box);
      c.restore();
    };
    const hoverSegKey = st.flowLinkHover && st.flowLinkHover.key ? String(st.flowLinkHover.key) : "";
    const selectedKeySet = getSelectedFlowLinkKeySet(st);
    const linkDrag = st.flowLinkDrag || null;
    const dragTargetKey = (linkDrag && linkDrag.target) ? flowAnchorKey(linkDrag.target) : "";
    for (const ln of links) {
      const a = findFlowAnchorByEndpoint(ln.from);
      const b = findFlowAnchorByEndpoint(ln.to);
      if (!a || !b) continue;
      const key = flowLinkKeyOf(ln);
      const geom = getCurveGeom(a, b, 18);
      const fromRect = rectById(ln && ln.from && ln.from.rectId);
      const toRect = rectById(ln && ln.to && ln.to.rectId);
      const fromIsDevice = isDevice(fromRect);
      const toIsDevice = isDevice(toRect);
      const devicesLayerOn = !(st.installLayers && st.installLayers.devices === false);
      if (!force && !devicesLayerOn && (fromIsDevice || toIsDevice)) continue;
      const baseColor = autoFlowLinkColor(ln, rectById, isDevice);
      const customColor = /^#[0-9a-f]{6}$/i.test(String(ln && ln.color || "").trim()) ? String(ln.color).trim() : null;
      const lineType = String(ln && ln.lineType || "").toLowerCase() === "dashed" ? "dashed" : "solid";
      const isSelected = selectedKeySet.has(key);
      const strokeColorRaw = (key === hoverSegKey)
        ? "rgba(255,99,99,.98)"
        : (isSelected ? "rgba(255,215,80,.98)" : (customColor || baseColor));
      const strokeColor = fromIsDevice ? withAlpha(strokeColorRaw, 0.56) : strokeColorRaw;
      const commutationVisual = !!(ln && ln.isCommutation);
      const checkerOpts = commutationVisual
        ? { checker: true, checkerColorA: strokeColor, checkerColorB: darkenColor(strokeColor, 0.42) }
        : null;
      c.save();
      const linkWidth = Math.max(0.5, Math.min(20, Number(ln && ln.width) || 2.2));
      const baseW = exportPass
        ? Math.max(5, linkWidth * 2.4)
        : strokeWidthForZoom(st.zoom, 1.2, isSelected ? (linkWidth + 0.8) : linkWidth);
      const orthogonalMid = Array.isArray(ln && ln.orthogonalPoints) ? ln.orthogonalPoints : [];
      if (orthogonalMid.length) {
        const route = getRoundedOrthogonalPathCached([{ x: a.x, y: a.y }, ...orthogonalMid, { x: b.x, y: b.y }]);
        if (buildHitGeometry) {
          for (let i = 0; i < route.points.length - 1; i++) {
            st.flowLinkSegments.push({ key, a: route.points[i], b: route.points[i + 1], link: ln, orthogonal: true, segmentIndex: i, points: route.points });
          }
        }
        drawLinkPath(route.path, strokeColor, baseW, lineType, checkerOpts);
        if (buildHitGeometry) drawOrthogonalEditMarkers(route.points, key);
        drawOrthogonalArrows(route.points, strokeColor);
        const commLabel = getCommutationLabel(ln);
        if (drawLabels && commLabel) {
          let bestA = null;
          let bestB = null;
          let bestLen = 0;
          for (let i = 0; i < route.points.length - 1; i++) {
            const p0 = route.points[i];
            const p1 = route.points[i + 1];
            const dx = Math.abs(toNum(p1.x) - toNum(p0.x));
            const dy = Math.abs(toNum(p1.y) - toNum(p0.y));
            const isStraight = dx < 0.5 || dy < 0.5;
            if (!isStraight) continue;
            const segLen = Math.hypot(toNum(p1.x) - toNum(p0.x), toNum(p1.y) - toNum(p0.y));
            if (segLen > bestLen) {
              bestLen = segLen;
              bestA = p0;
              bestB = p1;
            }
          }
          if (bestA && bestB) drawLabelOnSegment(commLabel, bestA, bestB);
        }
        c.restore();
        continue;
      }
      if (fromIsDevice || toIsDevice) {
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
            if (buildHitGeometry) st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
            prev = p;
          }
          segs.length = 0;
          segs.push({ p0: pStart, p1: pEnd, c1: geom2.c1, c2: geom2.c2, autoC1: autoGeom.c1, autoC2: autoGeom.c2, legacy: true, t0: geom2.t0, t1: geom2.t1 });
        } else {
          for (const sg of segs) {
            const samples = 12;
            for (let i = 1; i <= samples; i++) {
              const p = sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, i / samples);
              if (buildHitGeometry) st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
              prev = p;
            }
          }
        }
        const path = new Path2D();
        path.moveTo(a.x, a.y);
        for (const sg of segs) path.bezierCurveTo(sg.c1.x, sg.c1.y, sg.c2.x, sg.c2.y, sg.p1.x, sg.p1.y);
        drawLinkPath(path, strokeColor, baseW, lineType, checkerOpts);
        for (const sg of segs) {
          const t0 = sg.legacy ? sg.t0 : sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, 0.48);
          const t1 = sg.legacy ? sg.t1 : sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, 0.52);
          drawFlowLinkArrow(c, t0, t1, strokeColor, st.zoom || 1);
        }
        if (buildHitGeometry && !exportPass && String(st.mode || "") === "select" && isFlowLinkSelected(st, key)) {
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
        const commLabel = getCommutationLabel(ln);
        if (drawLabels && commLabel) {
          const pathPoints = [{ x: pStart.x, y: pStart.y }];
          for (const sg of segs) {
            const samples = 14;
            for (let i = 1; i <= samples; i++) {
              pathPoints.push(sampleBezier(sg.p0, sg.c1, sg.c2, sg.p1, i / samples));
            }
          }
          drawLabelAlongPath(commLabel, pathPoints);
        }
      } else {
        const pts = geom.pts;
        let prev = { x: a.x, y: a.y };
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (buildHitGeometry) st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
          prev = p;
        }
        const path = geom.path || (() => {
          const p = new Path2D();
          p.moveTo(a.x, a.y);
          for (const pt of pts) p.lineTo(pt.x, pt.y);
          return p;
        })();
        drawLinkPath(path, strokeColor, baseW, lineType, checkerOpts);
        drawFlowLinkArrow(c, geom.t0, geom.t1, strokeColor, st.zoom || 1);
        const commLabel = getCommutationLabel(ln);
        if (drawLabels && commLabel) {
          const pathPoints = [{ x: a.x, y: a.y }, ...pts];
          drawLabelAlongPath(commLabel, pathPoints);
        }
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
