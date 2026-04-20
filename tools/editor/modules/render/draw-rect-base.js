export const setupDrawRectBaseController = (deps = {}) => {
  const { st, isNoteRect, drawNoteRect, drawCellX, drawCellY, getHiddenSet, rads, rectCenter, normalizeViewMode, getCellTopologyCached, getMaskRenderDataCached, isMaskMode, isCellEditMode, isClusterEditMode, isRigEditMode, normalizeDataFlow, computeRectRenderFlags, planNumberRegions, updateSplitVariantControl, getDataFlowGroups, collectFlowLinkAnchors, collectFlowEditPoints, getRectFillLayerCached, getRectDecorLayerCached, getRectComponentRenderDataCached, rectTextTheme, fontFamilyCss, toLetters, mFmt, pctFmt, fillPercent, getRectTextSizePx, buildVisibleCabinetSummary, listSignature, getRectTextLayoutCached, hiddenCellBoxes, computeFreeRects, chooseTextLayout, REGION_ZONE_COLORS, getVisibleBoundarySegmentsCached, drawRectOverlays, drawRectInteractions, drawRigOutsideOverlay } = deps;

  function drawRectBase(c, r, sel, z, origin, opts) {
      if (isNoteRect(r)) { drawNoteRect(c, r, sel, z); return; }
      const cellX = drawCellX(r), cellY = drawCellY(r), hs = getHiddenSet(r), a = rads(r.rotation || 0), center = rectCenter(r), w = r.width, h = r.height, options = opts || {}, includeFlow = options.includeFlow !== false, designerRender = !!options.designerRender, disableLod = !!options.disableLod, forceLowDetail = !!options.forceLowDetail, flowGroupsOverride = Array.isArray(options.flowGroupsOverride) ? options.flowGroupsOverride : null, viewModeOverride = options && options.viewModeOverride ? normalizeViewMode(options.viewModeOverride) : null; c.save(); c.translate(center.x, center.y); c.rotate(a); c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
      const skeleton = !st.fontReady;
      const installView = (viewModeOverride || normalizeViewMode(st.viewMode)) === "install";
      const topo = getCellTopologyCached(r, cellX, cellY), maskRender = getMaskRenderDataCached(r, cellX, cellY, hs, topo);
      let flowEditingThisRect = !!(st.mode === "flowEdit" && sel && r.id === st.sel);
      const cellCount = (topo.cols || 1) * (topo.rows || 1), interactiveDetail = !!(sel || st.mode === "flowEdit" || isMaskMode() || isCellEditMode() || isClusterEditMode() || isRigEditMode()), lowDetail = !!((forceLowDetail && !flowEditingThisRect) || (!disableLod && designerRender && !interactiveDetail && cellCount > 3000));
      const clusterDraggingThisRect = !!(st.clusterDrag && Math.round(Number(st.clusterDrag.rectId) || 0) === Math.round(Number(r && r.id) || 0));
      const showNumbers = !!r.numberCells;
      const cellEditActive = isCellEditMode(), rigEditActive = isRigEditMode(), clusterEditActive = isClusterEditMode(), flowEditActive = st.mode === "flowEdit";
      const flowEnabledByMode = normalizeDataFlow(r.dataFlow) !== "none";
      const flowInteractivePause = !!(cellEditActive || rigEditActive || st.pan || st.drag || st.draft || clusterDraggingThisRect || (st.touch && st.touch.type === "pinch") || (lowDetail && !flowEditingThisRect));
      const flowFlags = computeRectRenderFlags({
        stMode: st.mode,
        sel,
        rectId: r && r.id,
        selectedId: st.sel,
        installView: !!(installView && includeFlow),
        flowEnabledByMode,
        flowInteractivePause,
        showNumbers
      });
      flowEditingThisRect = flowFlags.flowEditingThisRect;
      const wantsFlowDraw = flowFlags.wantsFlowDraw;
      const wantsFlowForNumbers = flowFlags.wantsFlowForNumbers;
      const showRegionsOverlayRequested = !!(installView && designerRender && !clusterDraggingThisRect);
      const needRegions = !!(!lowDetail && (showNumbers || wantsFlowDraw || showRegionsOverlayRequested || (installView && sel && !clusterDraggingThisRect)));
      const regions = (needRegions ? planNumberRegions(r, cellX, cellY, topo, hs, !options.noCachedRegions) : null);
      const showRegionsOverlay = !!(regions && showRegionsOverlayRequested);
      if (sel && r.id === st.sel && !(st.drag || st.clusterDrag || st.flowDrag || st.pan || st.draft)) updateSplitVariantControl(r);
      const flowGroups = (wantsFlowDraw || wantsFlowForNumbers) ? (flowGroupsOverride || getDataFlowGroups(r, cellX, cellY, topo, hs, regions)) : [];
      if (Array.isArray(flowGroups) && flowGroups.length) collectFlowLinkAnchors(r, flowGroups);
      if (st.mode === "flowEdit" && sel && r.id === st.sel) collectFlowEditPoints(r, flowGroups);
      let drawContent = true, maskedClip = false;
      let deferredTextOverlay = null;
      if (maskRender.hasMask) {
        if (!maskRender.hasVisible) drawContent = false;
        else if (Array.isArray(maskRender.hiddenRects) && maskRender.hiddenRects.length) {
          c.save();
          maskedClip = true;
          c.beginPath();
          c.rect(-w / 2, -h / 2, w, h);
          for (const rc of maskRender.hiddenRects) c.rect(rc.x, rc.y, rc.w, rc.h);
          c.clip("evenodd");
        }
      }
      if (drawContent) {
        const layer = getRectFillLayerCached(r, cellX, cellY, topo, maskRender, lowDetail);
        if (layer) c.drawImage(layer, -w / 2, -h / 2);
        const decorLayer = getRectDecorLayerCached(r, maskRender, z);
        if (decorLayer) c.drawImage(decorLayer, -w / 2, -h / 2);
        if (!lowDetail) {
          const comps = getRectComponentRenderDataCached(r, cellX, cellY, topo);
          if (!skeleton && showNumbers && regions) {
            const txtTheme = rectTextTheme(r);
            const nfs = 9, pad = 2.5;
            c.font = `${nfs}px ${fontFamilyCss(st.fontFamily)}`;
            c.textAlign = "left"; c.textBaseline = "top";
            const flowOrderByRegionCid = new Map(), fallbackOrderByRegionCid = new Map(), byRegion = new Map(), flowRidByCid = new Map(), compRegionByCid = new Map(), regionBoundsById = new Map();
            for (const g of flowGroups || []) {
              const rid = (g && Number.isFinite(g.rid) ? g.rid : 0), pts = Array.isArray(g && g.points) ? g.points : [], seen = new Set();
              let n = 1;
              for (const p of pts) {
                const cid = Number(p && p.cid);
                if (!Number.isFinite(cid) || seen.has(cid)) continue;
                seen.add(cid);
                flowRidByCid.set(Math.max(0, Math.round(cid || 0)), rid);
                flowOrderByRegionCid.set(`${rid}:${cid}`, n++);
              }
            }
            const mergeRegionBounds = (rid, col, row) => {
              const prev = regionBoundsById.get(rid);
              if (!prev) {
                regionBoundsById.set(rid, { c0: col, c1: col + 1, r0: row, r1: row + 1 });
                return;
              }
              if (col < prev.c0) prev.c0 = col;
              if (col + 1 > prev.c1) prev.c1 = col + 1;
              if (row < prev.r0) prev.r0 = row;
              if (row + 1 > prev.r1) prev.r1 = row + 1;
            };
            for (const it of comps) {
              const minCol = it.minCol, minRow = it.minRow, cid = Math.max(0, Math.round(Number(it && it.cid) || 0));
              const ridFromFlow = flowRidByCid.has(cid) ? flowRidByCid.get(cid) : -1;
              const rid = (regions && Array.isArray(regions.cellToRegion) ? regions.cellToRegion[minRow * topo.cols + minCol] : -1);
              const gx = regions.colToGroup[minCol] || 0, gy = regions.rowToGroup[minRow] || 0, key = (ridFromFlow >= 0 ? ridFromFlow : (rid >= 0 ? rid : (gy * regions.nx + gx)));
              const region = regions.regionsById.get(key) || { id: key, label: toLetters(key), c0: minCol, r0: minRow };
              compRegionByCid.set(cid, key);
              mergeRegionBounds(key, minCol, minRow);
              if (!byRegion.has(key)) byRegion.set(key, []);
              byRegion.get(key).push({ cid, minCol, minRow, region });
            }
            for (const [rid, arr] of byRegion.entries()) {
              arr.sort((a, b) => a.minRow - b.minRow || a.minCol - b.minCol || a.cid - b.cid);
              for (let i = 0; i < arr.length; i++)fallbackOrderByRegionCid.set(`${rid}:${arr[i].cid}`, i + 1);
            }
            for (const it of comps) {
              if (maskRender.visibleCompSet && !maskRender.visibleCompSet.has(it.cid)) continue;
              const minCol = it.minCol, minRow = it.minRow, cid = Math.max(0, Math.round(Number(it && it.cid) || 0));
              const ridFromFlow = compRegionByCid.has(cid) ? compRegionByCid.get(cid) : (flowRidByCid.has(cid) ? flowRidByCid.get(cid) : -1);
              const rid = (regions && Array.isArray(regions.cellToRegion) ? regions.cellToRegion[minRow * topo.cols + minCol] : -1);
              const gx = regions.colToGroup[minCol] || 0, gy = regions.rowToGroup[minRow] || 0, regionId = (ridFromFlow >= 0 ? ridFromFlow : (rid >= 0 ? rid : (gy * regions.nx + gx)));
              const regionFromMap = regions.regionsById.get(regionId);
              const regionBounds = regionBoundsById.get(regionId);
              const region = regionFromMap || { label: toLetters(regionId), c0: regionBounds ? regionBounds.c0 : minCol, r0: regionBounds ? regionBounds.r0 : minRow };
              const flowN = (flowOrderByRegionCid.get(`${regionId}:${cid}`) || fallbackOrderByRegionCid.get(`${regionId}:${cid}`) || 1), xCoord = Math.max(1, minCol - (Number(region.c0) || 0) + 1), yCoord = Math.max(1, minRow - (Number(region.r0) || 0) + 1);
              const text = flowEnabledByMode ? `${region.label}${flowN} (${xCoord}, ${yCoord})` : `${region.label} (${xCoord}, ${yCoord})`, tx = it.minX + pad, ty = it.minY + pad, tw = c.measureText(text).width + 4, th = nfs + 3;
              c.fillStyle = txtTheme.bgStrong; c.fillRect(tx - 1.5, ty - 1, tw, th);
              c.fillStyle = txtTheme.text; c.fillText(text, tx, ty);
            }
          }
          if (!skeleton && !((isMaskMode() || isCellEditMode() || isRigEditMode()) && sel)) {
            const rx = Math.round(r.x - origin.x), ry = Math.round(r.y - origin.y), baseFs = getRectTextSizePx(r), wm = (r.widthM != null ? r.widthM : r.width / Math.max(1, r.scale || 256)), hm = (r.heightM != null ? r.heightM : r.height / Math.max(1, r.scale || 256)), pct = fillPercent(wm, hm, r.areaM2Px);
            const installExtra = installView ? buildVisibleCabinetSummary(r, cellX, cellY, topo, hs) : { areaM2: 0, groups: [] };
            const installCabText = installExtra.groups.length ? installExtra.groups.join("\n") : "—";
            const lsRaw = installView ? [r.name, `${mFmt(wm)} x ${mFmt(hm)} m`, `${pctFmt(pct)}%`, `${mFmt(installExtra.areaM2)} м²`, installCabText] : [r.name, `(${rx}; ${ry}) px`, `${Math.round(w)} x ${Math.round(h)} px`, `${mFmt(wm)} x ${mFmt(hm)} m`, `${pctFmt(pct)}%`];
            const ls = lsRaw.flatMap(line => String(line == null ? "" : line).replace(/\r/g, "").split("\n")).filter(line => line.length > 0);
            const maxW = Math.max(20, w - 6), localRect = { x: -w / 2, y: -h / 2, width: w, height: h };
            const layoutKey = ["canvas", w, h, cellX, cellY, listSignature(r.hiddenCells), baseFs, maxW, st.fontFamily, ls.join("|")].join("|");
            const layout = getRectTextLayoutCached(r, layoutKey, () => {
              const hbs = hiddenCellBoxes(localRect, cellX, cellY, hs), freeRects = computeFreeRects(localRect, cellX, cellY, hs);
              return chooseTextLayout(localRect, ls, (t, fs) => { c.font = `${fs}px ${fontFamilyCss(st.fontFamily)}`; return c.measureText(t).width }, maxW, baseFs, hbs, freeRects);
            });
            const txtTheme = rectTextTheme(r);
            deferredTextOverlay = { layout, ls, maxW, txtTheme };
          }
        }
      }
      if (showRegionsOverlay) {
        const regList = Array.isArray(regions.regions) ? regions.regions : [...regions.regionsById.values()];
        c.save();
        c.lineWidth = 4.5;
        c.setLineDash([5, 4]);
        const inset = c.lineWidth / 2;
        for (const rg of regList) {
          const ci = (rg.id ?? (rg.gy * regions.nx + rg.gx)) % REGION_ZONE_COLORS.length, col = REGION_ZONE_COLORS[ci];
          c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},.9)`;
          const x0 = -w / 2 + (rg.c0 * cellX), x1 = -w / 2 + Math.min(w, rg.c1 * cellX), y0 = -h / 2 + (rg.r0 * cellY), y1 = -h / 2 + Math.min(h, rg.r1 * cellY);
          const rw = Math.max(0, (x1 - x0) - inset * 2), rh = Math.max(0, (y1 - y0) - inset * 2);
          if (rw <= 0 || rh <= 0) continue;
          c.strokeRect(x0 + inset, y0 + inset, rw, rh);
        }
        c.setLineDash([]);
        c.restore();
      }
      if (maskedClip) { c.restore(); maskedClip = false; }
      c.strokeStyle = sel ? "#ffe08a" : "rgba(255,255,255,.85)"; c.lineWidth = sel ? 7 / z : 1 / z;
      c.lineCap = "butt";
      c.lineJoin = "miter";
      const borderSegs = getVisibleBoundarySegmentsCached(r, cellX, cellY, hs);
      if (borderSegs.length) {
        if (sel) {
          const eps = 0.001, outer = [], inner = [];
          for (const s of borderSegs) {
            const left = Math.abs(s.x1 + w / 2) < eps && Math.abs(s.x2 + w / 2) < eps, right = Math.abs(s.x1 - w / 2) < eps && Math.abs(s.x2 - w / 2) < eps, top = Math.abs(s.y1 + h / 2) < eps && Math.abs(s.y2 + h / 2) < eps, bottom = Math.abs(s.y1 - h / 2) < eps && Math.abs(s.y2 - h / 2) < eps;
            (left || right || top || bottom ? outer : inner).push(s);
          }
          if (inner.length) {
            c.save(); c.strokeStyle = "rgba(255,224,138,.95)"; c.lineWidth = (sel ? 7 / z : 1 / z) / 2; c.lineCap = "square"; c.lineJoin = "miter"; c.beginPath();
            for (const s of inner) { c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2) }
            c.stroke(); c.restore();
          }
          if (outer.length) {
            c.beginPath();
            for (const s of outer) { c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2) }
            c.stroke();
          }
        } else {
          c.beginPath();
          for (const s of borderSegs) { c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2) }
          c.stroke();
        }
      }
      const drawCtx = {
        c, r, sel, z, w, h, cellX, cellY, topo, hs,
        installView, cellEditActive, clusterEditActive, flowEditActive,
        wantsFlowDraw, flowGroups, deferredTextOverlay
      };
      drawRectOverlays(drawCtx);
      drawRectInteractions(drawCtx);
      c.restore();
      c.restore();
      if (installView && !cellEditActive && !clusterEditActive && !flowEditActive) {
        const forceRigOverlay = !!(options && options.forceRigOverlay);
        drawRigOutsideOverlay(c, r, cellX, cellY, topo, hs, z, !!sel || forceRigOverlay);
      }
    }

  return { drawRectBase };
};
