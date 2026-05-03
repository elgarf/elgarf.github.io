export const setupConvertRegionsFeature = (deps = {}) => {
  const {
    el,
    st,
    bindClick,
    cur,
    isRectLocked,
    isNoteRect,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    planNumberRegions,
    showMessageModal,
    maskCellKey,
    mk,
    withNameSuffixBeforeGroup,
    autoContrast,
    hiddenCache,
    metricFromPx,
    setSelection,
    resetTransientState,
    syncProps,
    listRects,
    render,
    schedulePersist,
    t = value => value
  } = deps;

  bindClick(el.btnConvertRegionsToScreens, () => {
    const current = cur();
    if (!current) return;
    const selIds = (st.selSet && st.selSet.size) ? [...st.selSet] : [current.id];
    const idSet = new Set(selIds.map(v => Math.round(Number(v) || 0)).filter(v => v > 0));
    const targets = st.rects.filter(r => idSet.has(Math.round(Number(r && r.id) || 0)) && !isRectLocked(r) && !isNoteRect(r));
    if (!targets.length) return;
    const createdAll = [];
    let skippedNoRegions = 0;
    for (const r of targets.sort((a, b) => st.rects.findIndex(x => x.id === b.id) - st.rects.findIndex(x => x.id === a.id))) {
      const cx = drawCellX(r), cy = drawCellY(r), topo = getCellTopologyCached(r, cx, cy), hs = getHiddenSet(r);
      const plan = planNumberRegions(r, cx, cy, topo, hs, true);
      const regs = (plan && Array.isArray(plan.regions)) ? plan.regions : [];
      if (regs.length <= 1) { skippedNoRegions++; continue; }
      const srcIdx = st.rects.findIndex(it => it.id === r.id);
      if (srcIdx < 0) continue;
      const srcCols = Math.max(1, Math.round(Number(topo && topo.cols) || Math.ceil(Math.max(1, Number(r.width) || 1) / Math.max(1, cx))));
      const srcRows = Math.max(1, Math.round(Number(topo && topo.rows) || Math.ceil(Math.max(1, Number(r.height) || 1) / Math.max(1, cy))));
      const colEdges = [0], rowEdges = [0];
      for (let x = 0; x < r.width; x += cx) colEdges.push(Math.min(r.width, x + cx));
      for (let y = 0; y < r.height; y += cy) rowEdges.push(Math.min(r.height, y + cy));
      const toGlobalIdx = (col, row) => row * srcCols + col;
      const cellToRegion = (plan && Array.isArray(plan.cellToRegion)) ? plan.cellToRegion : null;
      const srcLinks = Array.isArray(r.cellLinks) ? r.cellLinks : [];
      const created = [];
      for (const rg of regs) {
        const rid = Math.max(0, Math.round(Number(rg && rg.id) || 0));
        const c0Raw = Math.max(0, Math.min(srcCols, Math.round(Number(rg && rg.c0) || 0)));
        const c1Raw = Math.max(c0Raw + 1, Math.min(srcCols, Math.round(Number(rg && rg.c1) || (c0Raw + 1))));
        const r0Raw = Math.max(0, Math.min(srcRows, Math.round(Number(rg && rg.r0) || 0)));
        const r1Raw = Math.max(r0Raw + 1, Math.min(srcRows, Math.round(Number(rg && rg.r1) || (r0Raw + 1))));
        let c0 = c1Raw, c1 = c0Raw, r0 = r1Raw, r1 = r0Raw, hasVisible = false;
        for (let iy = r0Raw; iy < r1Raw; iy++) for (let ix = c0Raw; ix < c1Raw; ix++) {
          if (hs.has(maskCellKey(ix, iy))) continue;
          if (cellToRegion && Number(cellToRegion[toGlobalIdx(ix, iy)]) !== rid) continue;
          hasVisible = true;
          if (ix < c0) c0 = ix;
          if (ix + 1 > c1) c1 = ix + 1;
          if (iy < r0) r0 = iy;
          if (iy + 1 > r1) r1 = iy + 1;
        }
        if (!hasVisible) continue;
        const rx = Math.round(r.x + (colEdges[c0] || (c0 * cx)));
        const ry = Math.round(r.y + (rowEdges[r0] || (r0 * cy)));
        const rw = Math.max(1, Math.round((colEdges[c1] || (c1 * cx)) - (colEdges[c0] || (c0 * cx))));
        const rh = Math.max(1, Math.round((rowEdges[r1] || (r1 * cy)) - (rowEdges[r0] || (r0 * cy))));
        const nr = mk(rx, ry, rw, rh);
        nr.name = withNameSuffixBeforeGroup(r.name, String((rg && rg.label) || "").trim());
        nr.rotation = r.rotation || 0;
        nr.scale = r.scale;
        nr.areaM2Px = r.areaM2Px;
        nr.colorA = r.colorA;
        nr.autoContrastB = r.autoContrastB !== false;
        nr.colorB = nr.autoContrastB ? autoContrast(nr.colorA) : r.colorB;
        nr.textSize = r.textSize || 0;
        nr.cellX = r.cellX;
        nr.cellY = r.cellY;
        nr.dataFlow = r.dataFlow;
        nr.dataFlowZ = !!r.dataFlowZ;
        nr.numberCells = !!r.numberCells;
        const localCols = Math.max(1, c1 - c0), localHidden = [];
        for (let iy = r0; iy < r1; iy++) for (let ix = c0; ix < c1; ix++) {
          const globalIdx = toGlobalIdx(ix, iy), notInRegion = !!(cellToRegion && Number(cellToRegion[globalIdx]) !== rid);
          if (hs.has(maskCellKey(ix, iy)) || notInRegion) localHidden.push(maskCellKey(ix - c0, iy - r0));
        }
        nr.hiddenCells = localHidden;
        hiddenCache.set(nr, { src: nr.hiddenCells, set: new Set(localHidden) });
        const remappedLinks = [];
        for (const lk of srcLinks) {
          const parts = String(lk || "").split("-");
          if (parts.length !== 2) continue;
          const a = Math.round(Number(parts[0]) || -1), b = Math.round(Number(parts[1]) || -1);
          if (a < 0 || b < 0) continue;
          const ax = a % srcCols, ay = Math.floor(a / srcCols), bx = b % srcCols, by = Math.floor(b / srcCols);
          if (ax < c0 || ax >= c1 || ay < r0 || ay >= r1 || bx < c0 || bx >= c1 || by < r0 || by >= r1) continue;
          const la = (ax - c0) + (ay - r0) * localCols, lb = (bx - c0) + (by - r0) * localCols;
          remappedLinks.push(`${Math.min(la, lb)}-${Math.max(la, lb)}`);
        }
        nr.cellLinks = [...new Set(remappedLinks)];
        metricFromPx(nr);
        created.push(nr);
      }
      if (!created.length) continue;
      st.rects.splice(srcIdx, 1, ...created);
      createdAll.push(...created);
    }
    if (!createdAll.length) {
      if (skippedNoRegions > 0) showMessageModal(t("Недостаточно регионов для преобразования"));
      return;
    }
    setSelection(createdAll.map(it => it.id), createdAll[createdAll.length - 1].id);
    resetTransientState(false);
    syncProps();
    listRects();
    render();
    schedulePersist("project");
  });
};
