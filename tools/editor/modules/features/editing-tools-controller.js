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
    findManualClusterAtCell,
    nextManualClusterId,
    clusterCanPlace,
    upsertManualCluster
  } = deps;
  const zoomSafe = z => Math.max(0.25, Number(z) || 1);
  const scaleSafe = v => Math.max(1, Number(v) || 256);
  const rigTopPadFor = r => (st.mode === "rigEdit") ? Math.max(8, 0.22 * scaleSafe(r && r.scale)) : 0;
  const nearEq = (a, b, eps = 0.001) => Math.abs((+a || 0) - (+b || 0)) < eps;

  const curFromState = () => getRectById(st.sel) || null;
  const hit = (x, y) => {
    for (let i = 0; i < st.rects.length; i++) {
      const r = st.rects[i];
      if (isRectLocked(r)) continue;
      if (typeof rectAABBMasked === "function") {
        const bb = rectAABBMasked(r);
        const rigTopPad = rigTopPadFor(r);
        if (x < bb.minX - rigTopPad || x > bb.maxX + rigTopPad || y < bb.minY - rigTopPad || y > bb.maxY + rigTopPad) continue;
      }
      const p = worldToRectUV(r, x, y);
      const inRect = p.u >= 0 && p.u <= r.width && p.v >= 0 && p.v <= r.height;
      const rigTopPad = rigTopPadFor(r);
      const inRigTopPad = (st.mode === "rigEdit")
        && p.u >= 0
        && p.u <= r.width
        && p.v >= -rigTopPad
        && p.v < 0;
      if (!inRect && !inRigTopPad) continue;
      if (String(r?.type || "") !== "note" && inRect && !cellFromWorldPoint(r, x, y, true)) continue;
      return r;
    }
    return null;
  };
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
    findFlowLinkAtPoint,
    findFlowStartHandle,
    findFlowDirectionButton,
    setFlowDirection,
    rebuildAndPatchFlowRegion,
    findFlowLinkAnchorAtPoint,
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
    st.flowDragPreview = null;
  };

  const handleFlowEditPointerDown = p => {
    const linkHit = findFlowLinkAtPoint(p.x, p.y);
    if (linkHit && linkHit.link) {
      const killKey = `${flowAnchorKey(linkHit.link.from)}>${flowAnchorKey(linkHit.link.to)}`;
      st.flowLinks = normalizeFlowLinks(st.flowLinks).filter(it => `${flowAnchorKey(it.from)}>${flowAnchorKey(it.to)}` !== killKey);
      clearFlowLinkInteractionState();
      schedulePersist("project");
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
