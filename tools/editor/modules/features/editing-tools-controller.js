import { createEditorHitTest } from "../hit-test/editor-hit-test.js";

export const setupEditingToolsCore = (deps = {}) => {
  const {
    st,
    getRectById,
    isRectLocked,
    worldToRectUV,
    rectAABBMasked,
    rectUVToWorld,
    getMaskNodeAxes,
    drawCellX,
    drawCellY,
    getHiddenSet,
    pointInPoly,
    maskCellKey,
    setHiddenSet,
    resetMaskTransient,
    persistProjectAndRender,
    render,
    getCellLinkCandidateAtPoint,
    getCellTopologyCached,
    getCellTopology,
    selRect,
    cur,
    findActiveClusterBorder,
    updateClusterEditCursor,
    shrinkManualCluster,
    expandManualCluster,
    findClusterStartMarker,
    removeManualCluster,
    findClusterHandle,
    schedulePersist,
    cellFromWorldPoint,
    isShapeRect,
    pointInShape,
    shapePointHit,
    findManualClusterAtCell,
    nextManualClusterId,
    clusterCanPlace,
    upsertManualCluster
  } = deps;
  const zoomSafe = z => Math.max(0.25, Number(z) || 1);
  const nearEq = (a, b, eps = 0.001) => Math.abs((+a || 0) - (+b || 0)) < eps;

  const curFromState = () => getRectById(st.sel) || null;
  const { hit } = createEditorHitTest({
    st,
    isRectLocked,
    isShapeRect,
    shapePointHit,
    pointInShape,
    worldToRectUV,
    rectAABBMasked,
    cellFromWorldPoint
  });
  const snapMaskNode = (r, wx, wy) => {
    if (!r) return null;
    const p = worldToRectUV(r, wx, wy);
    if (p.u < 0 || p.u > r.width || p.v < 0 || p.v > r.height) return null;
    const u = Math.max(0, Math.min(r.width, p.u));
    const v = Math.max(0, Math.min(r.height, p.v));
    const axes = getMaskNodeAxes(r);
    let gu = axes.xs[0], gv = axes.ys[0], bdx = 1e9, bdy = 1e9;
    for (const x of axes.xs) {
      const d = Math.abs(x - u);
      if (d < bdx) { bdx = d; gu = x; }
    }
    for (const y of axes.ys) {
      const d = Math.abs(y - v);
      if (d < bdy) { bdy = d; gv = y; }
    }
    return rectUVToWorld(r, gu, gv);
  };
  const applyMaskPath = () => {
    const r = curFromState();
    if (!r || isRectLocked(r) || st.maskPath.length < 3) {
      resetMaskTransient();
      render();
      return;
    }
    const cx = drawCellX(r), cy = drawCellY(r), hs = getHiddenSet(r);
    const cols = Math.max(1, Math.ceil(r.width / cx));
    const rows = Math.max(1, Math.ceil(r.height / cy));
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const cw = Math.min(cx, r.width - ix * cx);
        const ch = Math.min(cy, r.height - iy * cy);
        const wp = rectUVToWorld(r, ix * cx + cw / 2, iy * cy + ch / 2);
        if (!pointInPoly(wp.x, wp.y, st.maskPath)) continue;
        const k = maskCellKey(ix, iy);
        if (hs.has(k)) hs.delete(k);
        else hs.add(k);
      }
    }
    setHiddenSet(r);
    resetMaskTransient();
    persistProjectAndRender();
  };
  const addMaskPoint = (wx, wy) => {
    const r = curFromState();
    if (!r || isRectLocked(r)) return;
    const p = snapMaskNode(r, wx, wy);
    if (!p) return;
    const first = st.maskPath[0];
    const last = st.maskPath[st.maskPath.length - 1];
    const eps = 6 / zoomSafe(st.zoom);
    if (first && st.maskPath.length >= 3 && Math.hypot(p.x - first.x, p.y - first.y) <= eps) {
      applyMaskPath();
      return;
    }
    if (last && nearEq(last.x, p.x) && nearEq(last.y, p.y)) return;
    st.maskPath.push(p);
    render();
  };
  const toggleCellLinkAtPoint = (r, wx, wy) => {
    if (!r || isRectLocked(r)) return false;
    const cand = getCellLinkCandidateAtPoint(r, wx, wy);
    if (!cand) return false;
    const arr = Array.isArray(r.cellLinks) ? r.cellLinks : [];
    if (cand.exists) {
      const ks = new Set(cand.keys);
      r.cellLinks = arr.filter(v => !ks.has(v));
      persistProjectAndRender();
      return true;
    }
    if (!cand.canToggle) return false;
    const next = new Set(arr);
    for (const k of cand.keys) next.add(k);
    r.cellLinks = [...next];
    persistProjectAndRender();
    return true;
  };
  const parseLinkKeyLocal = key => {
    const p = String(key || "").split("-");
    if (p.length !== 2) return null;
    const a = Math.max(0, Math.round(Number(p[0]) || 0));
    const b = Math.max(0, Math.round(Number(p[1]) || 0));
    if (a === b) return null;
    return a < b ? { a, b } : { a: b, b: a };
  };
  const componentsAreRectangles = topo => {
    if (!topo || !Array.isArray(topo.comp) || !Number.isFinite(Number(topo.count))) return false;
    const stat = new Map();
    for (let i = 0; i < topo.count; i++) {
      const cId = topo.comp[i];
      const x = i % topo.cols;
      const y = Math.floor(i / topo.cols);
      let rec = stat.get(cId);
      if (!rec) { rec = { minX: x, maxX: x, minY: y, maxY: y, count: 0 }; stat.set(cId, rec); }
      rec.minX = Math.min(rec.minX, x);
      rec.maxX = Math.max(rec.maxX, x);
      rec.minY = Math.min(rec.minY, y);
      rec.maxY = Math.max(rec.maxY, y);
      rec.count++;
    }
    for (const rec of stat.values()) {
      const area = (rec.maxX - rec.minX + 1) * (rec.maxY - rec.minY + 1);
      if (rec.count !== area) return false;
    }
    return true;
  };
  const inferBoundaryFromKey = (key, cols) => {
    const p = parseLinkKeyLocal(key);
    if (!p || !(cols > 0)) return null;
    const dx = Math.abs((p.a % cols) - (p.b % cols));
    const dy = Math.abs(Math.floor(p.a / cols) - Math.floor(p.b / cols));
    if (dx + dy !== 1) return null;
    if (dx === 1) {
      const x = Math.max(p.a % cols, p.b % cols);
      const pos = Math.min(Math.floor(p.a / cols), Math.floor(p.b / cols));
      return { orientation: "v", line: x, pos };
    }
    const y = Math.max(Math.floor(p.a / cols), Math.floor(p.b / cols));
    const pos = Math.min(p.a % cols, p.b % cols);
    return { orientation: "h", line: y, pos };
  };
  const buildLineKeys = (cols, rows, orientation, line) => {
    const keys = [];
    if (orientation === "h") {
      if (!(line >= 1 && line <= rows - 1)) return keys;
      for (let x = 0; x < cols; x++) {
        const a = (line - 1) * cols + x, b = line * cols + x;
        keys.push(a < b ? `${a}-${b}` : `${b}-${a}`);
      }
      return keys;
    }
    if (!(line >= 1 && line <= cols - 1)) return keys;
    for (let y = 0; y < rows; y++) {
      const a = y * cols + (line - 1), b = y * cols + line;
      keys.push(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
    return keys;
  };
  const buildBoundaryKeyAtPos = (cols, rows, orientation, line, pos) => {
    if (orientation === "h") {
      if (!(line >= 1 && line <= rows - 1) || !(pos >= 0 && pos <= cols - 1)) return "";
      const a = (line - 1) * cols + pos, b = line * cols + pos;
      return a < b ? `${a}-${b}` : `${b}-${a}`;
    }
    if (!(line >= 1 && line <= cols - 1) || !(pos >= 0 && pos <= rows - 1)) return "";
    const a = pos * cols + (line - 1), b = pos * cols + line;
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  };
  const canAddLinkSafely = (r, key, currentSet, cx, cy) => {
    if (currentSet.has(key)) return false;
    if (typeof getCellTopology !== "function") return false;
    const nextRect = { ...r, cellLinks: [...currentSet, key] };
    const topoNext = getCellTopology(nextRect, cx, cy);
    return componentsAreRectangles(topoNext);
  };
  const applyCellKnifeRange = (r, orientation, line, fromPos, toPos, op, appliedSet = null) => {
    if (!r || isRectLocked(r)) return false;
    const cx = drawCellX(r), cy = drawCellY(r);
    const topo = typeof getCellTopologyCached === "function" ? getCellTopologyCached(r, cx, cy) : null;
    if (!topo) return false;
    const cols = Math.max(1, Math.round(Number(topo.cols) || 1));
    const rows = Math.max(1, Math.round(Number(topo.rows) || 1));
    const lineKeys = buildLineKeys(cols, rows, orientation, line);
    if (!lineKeys.length) return false;
    const set = new Set(Array.isArray(r.cellLinks) ? r.cellLinks : []);
    let changed = false;
    const lo = Math.min(fromPos, toPos);
    const hi = Math.max(fromPos, toPos);
    for (let pos = lo; pos <= hi; pos++) {
      const key = buildBoundaryKeyAtPos(cols, rows, orientation, line, pos);
      if (!key) continue;
      const stepKey = `${orientation}:${line}:${pos}`;
      if (appliedSet && appliedSet.has(stepKey)) continue;
      if (op === "remove") {
        if (!set.has(key)) continue;
        set.delete(key);
        changed = true;
      } else {
        if (!canAddLinkSafely(r, key, set, cx, cy)) continue;
        set.add(key);
        changed = true;
      }
      if (appliedSet) appliedSet.add(stepKey);
    }
    if (!changed) return false;
    r.cellLinks = [...set];
    return true;
  };
  const beginCellKnifeDragAtPoint = (r, wx, wy) => {
    if (!r || isRectLocked(r)) return null;
    const cand = getCellLinkCandidateAtPoint(r, wx, wy);
    if (!cand || !Array.isArray(cand.keys) || !cand.keys.length) return null;
    const cx = drawCellX(r), cy = drawCellY(r);
    const topo = typeof getCellTopologyCached === "function" ? getCellTopologyCached(r, cx, cy) : null;
    const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1));
    const boundary = inferBoundaryFromKey(cand.keys[0], cols);
    if (!boundary) return null;
    return {
      rectId: r.id,
      startX: wx,
      startY: wy,
      orientation: boundary.orientation,
      line: boundary.line,
      startPos: boundary.pos,
      lastPos: boundary.pos,
      op: cand.exists ? "remove" : "add",
      active: false,
      changed: false,
      applied: new Set()
    };
  };
  const updateCellKnifeDragAtPoint = (r, drag, wx, wy) => {
    if (!r || !drag || isRectLocked(r)) return false;
    if (!drag.active) {
      const dx = Math.abs((+wx || 0) - (+drag.startX || 0));
      const dy = Math.abs((+wy || 0) - (+drag.startY || 0));
      const parallel = drag.orientation === "h" ? dx : dy;
      const perpendicular = drag.orientation === "h" ? dy : dx;
      const moved = parallel >= Math.max(8, 12 / zoomSafe(st.zoom)) && parallel >= perpendicular;
      if (!moved) return false;
      drag.active = true;
      if (applyCellKnifeRange(r, drag.orientation, drag.line, drag.startPos, drag.startPos, drag.op, drag.applied)) drag.changed = true;
      return drag.changed;
    }
    const cand = getCellLinkCandidateAtPoint(r, wx, wy);
    if (!cand || !Array.isArray(cand.keys) || !cand.keys.length) return drag.changed;
    const cx = drawCellX(r), cy = drawCellY(r);
    const topo = typeof getCellTopologyCached === "function" ? getCellTopologyCached(r, cx, cy) : null;
    const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1));
    const boundary = inferBoundaryFromKey(cand.keys[0], cols);
    if (!boundary || boundary.orientation !== drag.orientation) return drag.changed;
    if (boundary.line !== drag.line || !Number.isFinite(Number(boundary.pos))) return drag.changed;
    const targetPos = Math.round(Number(boundary.pos) || 0);
    if (targetPos === drag.lastPos) return drag.changed;
    if (applyCellKnifeRange(r, boundary.orientation, boundary.line, drag.lastPos, targetPos, drag.op, drag.applied)) drag.changed = true;
    drag.lastPos = targetPos;
    return drag.changed;
  };

  const clusterDragProjection = (dir, dx, dy) => {
    if (dir === "left") return -dx;
    if (dir === "right") return dx;
    if (dir === "up") return -dy;
    if (dir === "down") return dy;
    return 0;
  };
  const applyClusterHandleStep = (r, drag, sign = 1) => {
    if (!r || !drag) return false;
    return sign < 0
      ? shrinkManualCluster(r, drag.id, drag.dir)
      : expandManualCluster(r, drag.id, drag.dir);
  };
  const beginClusterHandleDragAtPoint = (wx, wy) => {
    const h = hit(wx, wy);
    if (!h) return false;
    if (h.id !== st.sel) selRect(h.id);
    const r = cur();
    if (!r || isRectLocked(r)) return false;
    const border = findActiveClusterBorder(r, wx, wy);
    if (!border || Number(border.id) !== Number(st.clusterActiveId)) return false;
    const axisStep = (border.dir === "left" || border.dir === "right")
      ? drawCellX(r)
      : drawCellY(r);
    st.clusterDrag = {
      rectId: r.id,
      id: Math.max(1, Math.round(Number(border.id) || 1)),
      dir: String(border.dir || ""),
      startX: wx,
      startY: wy,
      axisStep: Math.max(1, axisStep),
      lastAppliedSteps: 0,
      moved: false,
      changed: false
    };
    st.clusterBorderHover = border;
    st.clusterStartHover = null;
    updateClusterEditCursor();
    return true;
  };
  const updateClusterHandleDragAtPoint = (wx, wy) => {
    const d = st.clusterDrag;
    if (!d) return false;
    const r = cur();
    if (!r || r.id !== d.rectId || isRectLocked(r)) return false;
    const proj = clusterDragProjection(
      d.dir,
      (+wx || 0) - (+d.startX || 0),
      (+wy || 0) - (+d.startY || 0)
    );
    const stepPx = Math.max(1, d.axisStep || 1);
    const steps = proj >= 0 ? Math.floor(proj / stepPx) : -Math.floor(Math.abs(proj) / stepPx);
    if (steps === d.lastAppliedSteps) return d.changed;
    if (steps > d.lastAppliedSteps) {
      for (let i = d.lastAppliedSteps; i < steps; i++) {
        if (!applyClusterHandleStep(r, d, +1)) {
          d.lastAppliedSteps = i;
          return d.changed;
        }
        d.lastAppliedSteps = i + 1;
        d.changed = true;
        d.moved = true;
      }
    } else {
      for (let i = d.lastAppliedSteps; i > steps; i--) {
        if (!applyClusterHandleStep(r, d, -1)) {
          d.lastAppliedSteps = i;
          return d.changed;
        }
        d.lastAppliedSteps = i - 1;
        d.changed = true;
        d.moved = true;
      }
    }
    return d.changed;
  };
  const endClusterHandleDrag = () => {
    const d = st.clusterDrag;
    if (!d) return false;
    const changed = !!d.changed;
    st.clusterDrag = null;
    updateClusterEditCursor();
    return changed;
  };

  const handleClusterEditAtPoint = (wx, wy) => {
    const h = hit(wx, wy);
    if (!h) {
      selRect(null);
      return true;
    }
    if (h.id !== st.sel) selRect(h.id);
    const r = cur();
    if (!r) return true;
    if (isRectLocked(r)) return true;
    const startMark = findClusterStartMarker(r, wx, wy);
    if (startMark) {
      st.clusterActiveId = startMark.id;
      if (removeManualCluster(r, startMark.id)) schedulePersist("project");
      render();
      return true;
    }
    const handle = findClusterHandle(wx, wy);
    if (handle && Number(handle.id) === Number(st.clusterActiveId)) {
      const action = String(handle.action || "expand");
      const changed = (action === "shrink")
        ? shrinkManualCluster(r, handle.id, handle.dir)
        : expandManualCluster(r, handle.id, handle.dir);
      if (changed) {
        st.clusterHandleHover = handle;
        schedulePersist("project");
      }
      render();
      return true;
    }
    const cell = cellFromWorldPoint(r, wx, wy, true);
    if (!cell) {
      render();
      return true;
    }
    const hitCluster = findManualClusterAtCell(r, cell.col, cell.row);
    if (hitCluster) {
      st.clusterActiveId = hitCluster.id;
      render();
      return true;
    }
    const id = nextManualClusterId(r);
    const cluster = { id, sx: cell.col, sy: cell.row, c0: cell.col, c1: cell.col + 1, r0: cell.row, r1: cell.row + 1 };
    if (clusterCanPlace(r, cluster, null)) {
      upsertManualCluster(r, cluster);
      st.clusterActiveId = id;
      schedulePersist("project");
    }
    render();
    return true;
  };

  return {
    hit,
    snapMaskNode,
    addMaskPoint,
    applyMaskPath,
    toggleCellLinkAtPoint,
    beginCellKnifeDragAtPoint,
    updateCellKnifeDragAtPoint,
    beginClusterHandleDragAtPoint,
    updateClusterHandleDragAtPoint,
    endClusterHandleDrag,
    handleClusterEditAtPoint
  };
};

export const setupEditingToolsInput = (deps = {}) => {
  const {
    st,
    render,
    hit,
    cur,
    selRect,
    syncProps,
    schedulePersist,
    isRectLocked,
    normalizeFlowLinks,
    flowAnchorKey,
    flowLinkKeyOf,
    findFlowLinkAtPoint,
    findFlowStartHandle,
    findFlowDirectionButton,
    findFlowResetButton,
    setFlowDirection,
    resetFlowRegionOverrides,
    rebuildAndPatchFlowRegion,
    findFlowLinkAnchorAtPoint,
    findFlowCurveHandleAtPoint,
    setFlowLinkManualBezierPoint,
    moveFlowLinkOrthogonalSegment,
    deleteFlowLinkOrthogonalSegment,
    clearFlowLinkManualBezier,
    updateFlowLinkDragTarget,
    findFlowEditPoint,
    setSelection,
    syncPropsSmart,
    getRigHitAtPoint,
    applyRigActionAtPoint,
    resetRigHoverTransient,
    commitUiUpdate
  } = deps;
  const clearFlowLinkInteractionState = () => {
    st.flowLinkPending = null;
    st.flowLinkDrag = null;
    st.flowLinkHover = null;
    st.flowSegmentDrag = null;
    st.flowDragPreview = null;
  };
  const selectFlowLinkOnly = key => {
    st.flowLinkSelectedKey = String(key || "");
    if (st.selSet instanceof Set) st.selSet.clear();
    else st.selSet = new Set();
    st.sel = null;
    st.selMultiBase = null;
    st.devicePortSelection = null;
  };

  const handleFlowEditPointerDown = (p, _opts = null) => {
    const opts = (_opts && typeof _opts === "object") ? _opts : null;
    const allowLinkOnly = !!(opts && opts.allowLinkOnly);
    if (allowLinkOnly) {
      const curveHandleHit = typeof findFlowCurveHandleAtPoint === "function" ? findFlowCurveHandleAtPoint(p.x, p.y) : null;
      if (curveHandleHit) {
        selectFlowLinkOnly(String(curveHandleHit.key || ""));
        st.flowCurveDrag = {
          key: String(curveHandleHit.key || ""),
          handle: String(curveHandleHit.handle || ""),
          fallback: curveHandleHit.fallback || null
        };
        st.flowLinkPending = null;
        st.flowLinkDrag = null;
        st.flowSegmentDrag = null;
        st.flowDragPreview = null;
        if (typeof syncPropsSmart === "function") syncPropsSmart();
        else syncProps();
        render();
        return true;
      }
      const selectedSegmentHit = findFlowLinkAtPoint(p.x, p.y);
      if (selectedSegmentHit && selectedSegmentHit.link && selectedSegmentHit.orthogonal && Array.isArray(selectedSegmentHit.points)) {
        const selectedSegmentKey = flowLinkKeyOf(selectedSegmentHit.link);
        if (String(st.flowLinkSelectedKey || "") === selectedSegmentKey) {
          selectFlowLinkOnly(selectedSegmentKey);
          st.flowSegmentDrag = {
            key: st.flowLinkSelectedKey,
            segmentIndex: Math.max(0, Math.round(Number(selectedSegmentHit.segmentIndex) || 0)),
            points: selectedSegmentHit.points.map(pt => ({ x: Number(pt && pt.x) || 0, y: Number(pt && pt.y) || 0 })),
            changed: false
          };
          st.flowLinkPending = null;
          st.flowLinkDrag = null;
          st.flowDragPreview = null;
          if (typeof syncPropsSmart === "function") syncPropsSmart();
          else syncProps();
          render();
          return true;
        }
      }
      const endAnchorHit = findFlowLinkAnchorAtPoint(p.x, p.y, "end");
      if (endAnchorHit) {
        st.flowLinkSelectedKey = "";
        st.devicePortSelection = { rectId: endAnchorHit.rectId, rid: endAnchorHit.rid, cid: endAnchorHit.cid, kind: "end" };
        st.flowLinkPending = {
          from: { rectId: endAnchorHit.rectId, rid: endAnchorHit.rid, cid: endAnchorHit.cid, kind: "end", x: endAnchorHit.x, y: endAnchorHit.y },
          downX: p.x,
          downY: p.y
        };
        st.flowLinkDrag = null;
        st.flowSegmentDrag = null;
        st.flowDragPreview = null;
        if (typeof syncPropsSmart === "function") syncPropsSmart();
        else syncProps();
        render();
        return true;
      }
      const linkHit = findFlowLinkAtPoint(p.x, p.y);
      if (linkHit && linkHit.link) {
        const nextKey = flowLinkKeyOf(linkHit.link);
        const wasSelected = String(st.flowLinkSelectedKey || "") === nextKey;
        selectFlowLinkOnly(nextKey);
        if (wasSelected && linkHit.orthogonal && Array.isArray(linkHit.points)) {
          st.flowSegmentDrag = {
            key: st.flowLinkSelectedKey,
            segmentIndex: Math.max(0, Math.round(Number(linkHit.segmentIndex) || 0)),
            points: linkHit.points.map(pt => ({ x: Number(pt && pt.x) || 0, y: Number(pt && pt.y) || 0 })),
            changed: false
          };
        } else {
          st.flowSegmentDrag = null;
        }
        if (!linkHit.orthogonal && opts && opts.altKey && typeof clearFlowLinkManualBezier === "function") {
          if (clearFlowLinkManualBezier(st.flowLinkSelectedKey)) schedulePersist("project");
        }
        st.flowLinkPending = null;
        st.flowLinkDrag = null;
        st.flowDragPreview = null;
        if (typeof syncPropsSmart === "function") syncPropsSmart();
        else syncProps();
        render();
        return true;
      }
      return false;
    }
    if (String(st.flowEditVariant || "auto") === "manual") {
      const h = hit(p.x, p.y);
      if (!h) {
        clearFlowLinkInteractionState();
        selRect(null);
        render();
        return true;
      }
      if (h.id !== st.sel) {
        selRect(h.id);
        render();
        return true;
      }
      if (isRectLocked(h)) {
        render();
        return true;
      }
      const resetBtn = typeof findFlowResetButton === "function" ? findFlowResetButton(p.x, p.y) : null;
      if (resetBtn && typeof resetFlowRegionOverrides === "function") {
        const r = cur();
        if (r) {
          st.flowRegionRid = resetBtn.rid;
          resetFlowRegionOverrides(r, resetBtn.rid);
          if (typeof rebuildAndPatchFlowRegion === "function") rebuildAndPatchFlowRegion(r, resetBtn.rid, 5000);
          schedulePersist("project");
          syncProps();
        }
        st.flowResetHover = null;
        render();
        return true;
      }
      const fp = findFlowEditPoint(p.x, p.y);
      if (fp) {
        st.flowRegionRid = fp.rid;
        st.manualFlowDrag = { rid: fp.rid, cid: fp.cid, lastCid: fp.cid, downX: p.x, downY: p.y, moved: false, appliedStart: false, changed: false };
        syncProps();
        render();
        return true;
      }
      render();
      return true;
    }
    const linkHit = findFlowLinkAtPoint(p.x, p.y);
    if (linkHit && linkHit.link) {
      st.flowLinkSelectedKey = flowLinkKeyOf(linkHit.link);
      const killKey = st.flowLinkSelectedKey;
      st.flowLinks = normalizeFlowLinks(st.flowLinks).filter(it => flowLinkKeyOf(it) !== killKey);
      clearFlowLinkInteractionState();
      schedulePersist("project");
      syncProps();
      render();
      return true;
    }
    const h = hit(p.x, p.y);
    if (h && h.id === st.sel && !isRectLocked(h)) {
      const startHandle = findFlowStartHandle(p.x, p.y);
      if (startHandle) {
        st.flowRegionRid = startHandle.rid;
        st.flowDrag = { kind: "start", rid: startHandle.rid, fromIndex: 0, currentIndex: 0, cid: startHandle.cid };
        st.flowDragPreview = null;
        syncProps();
        render();
        return true;
      }
      const dirBtn = findFlowDirectionButton(p.x, p.y);
      if (dirBtn) {
        st.flowRegionRid = dirBtn.rid;
        const r = cur();
        if (r) {
          setFlowDirection(r, dirBtn.rid, dirBtn.dir, dirBtn.cid);
          if (typeof rebuildAndPatchFlowRegion === "function") rebuildAndPatchFlowRegion(r, dirBtn.rid, 5000);
          st.flowHover = null;
          st.flowDirHover = dirBtn;
          schedulePersist("project");
          syncProps();
        }
        render();
        return true;
      }
    }
    const endAnchorHit = findFlowLinkAnchorAtPoint(p.x, p.y, "end");
    if (endAnchorHit) {
      st.devicePortSelection = { rectId: endAnchorHit.rectId, rid: endAnchorHit.rid, cid: endAnchorHit.cid, kind: "end" };
      const fromKey = flowAnchorKey({
        rectId: endAnchorHit.rectId,
        rid: endAnchorHit.rid,
        cid: endAnchorHit.cid,
        kind: "end"
      });
      st.flowLinks = normalizeFlowLinks(st.flowLinks).filter(it => flowAnchorKey(it && it.from) !== fromKey);
      st.flowLinkDrag = { from: { rectId: endAnchorHit.rectId, rid: endAnchorHit.rid, cid: endAnchorHit.cid, kind: "end", x: endAnchorHit.x, y: endAnchorHit.y }, x: p.x, y: p.y, target: null, canLink: false };
      updateFlowLinkDragTarget(p.x, p.y);
      st.flowLinkPending = null;
      st.flowDragPreview = null;
      render();
      return true;
    }
    if (!h) {
      clearFlowLinkInteractionState();
      selRect(null);
      render();
      return true;
    }
    if (h.id !== st.sel) {
      selRect(h.id);
      render();
      return true;
    }
    if (isRectLocked(h)) {
      render();
      return true;
    }
    const fp = findFlowEditPoint(p.x, p.y);
    if (fp) {
      st.flowRegionRid = fp.rid;
      st.flowDrag = { rid: fp.rid, fromIndex: fp.index, currentIndex: fp.index, cid: fp.cid };
      st.flowDragPreview = null;
      syncProps();
    }
    render();
    return true;
  };

  const selectHoveredRectSmart = h => {
    if (!h || h.id === st.sel) return false;
    setSelection([h.id], h.id);
    syncPropsSmart();
    return true;
  };
  const handleRigPointerDown = p => {
    const rc = cur();
    if (rc && !isRectLocked(rc)) {
      const hover0 = getRigHitAtPoint(rc, p.x, p.y, st.zoom);
      if (hover0 && hover0.rectId === rc.id) {
        const changed = applyRigActionAtPoint(rc, p.x, p.y);
        if (changed) commitUiUpdate({ syncProps: true, persist: true, render: true });
        else render();
        return true;
      }
    }
    const h = hit(p.x, p.y);
    if (!h) {
      st.rigHover = null;
      render();
      return true;
    }
    if (h.id !== st.sel) selRect(h.id);
    if (isRectLocked(h)) {
      st.rigHover = null;
      render();
      return true;
    }
    const changed = applyRigActionAtPoint(h, p.x, p.y);
    if (changed) commitUiUpdate({ syncProps: true, persist: true, render: true });
    else render();
    return true;
  };
  const handleRigPointerMove = p => {
    const h = hit(p.x, p.y);
    selectHoveredRectSmart(h);
    const r = h || cur();
    st.rigHover = r ? getRigHitAtPoint(r, p.x, p.y, st.zoom) : null;
    render();
    return true;
  };
  const handleRigPointerLeave = () => {
    if (!st.rigHover) return false;
    resetRigHoverTransient();
    render();
    return true;
  };

  return {
    handleFlowEditPointerDown,
    handleRigPointerDown,
    handleRigPointerMove,
    handleRigPointerLeave
  };
};
