export const setupDrawRectBaseController = (deps = {}) => {
  const { st, isNoteRect, drawNoteRect, isShapeRect, drawShapeRect, drawCellX, drawCellY, getHiddenSet, rads, rectCenter, rectUVToWorld, normalizeViewMode, getCellTopologyCached, getMaskRenderDataCached, isMaskMode, isCellEditMode, isClusterEditMode, isRigEditMode, normalizeDataFlow, planNumberRegions, updateSplitVariantControl, getDataFlowGroups, collectFlowLinkAnchors, collectFlowEditPoints, collectFlowManualPickPoints, getRectFillLayerCached, getRectDecorLayerCached, getRectComponentRenderDataCached, rectTextTheme, fontFamilyCss, toLetters, mFmt, pctFmt, fillPercent, getRectTextSizePx, buildVisibleCabinetSummary, listSignature, getRectTextLayoutCached, hiddenCellBoxes, computeFreeRects, chooseTextLayout, REGION_ZONE_COLORS, getVisibleBoundarySegmentsCached, drawRectOverlays, drawRectInteractions, drawRigOutsideOverlay, t = value => value } = deps;

  const computeRectRenderFlags = ({
    stMode,
    sel,
    rectId,
    selectedId,
    installView,
    flowEnabledByMode,
    flowInteractivePause,
    showNumbers
  }) => {
    const flowEditingThisRect = !!(stMode === "flowEdit" && sel && rectId === selectedId);
    const wantsFlowDraw = !!(installView && flowEnabledByMode && !flowInteractivePause);
    const wantsFlowForNumbers = !!(showNumbers && flowEnabledByMode && !flowInteractivePause);
    return { flowEditingThisRect, wantsFlowDraw, wantsFlowForNumbers };
  };
  const buildRectOverlayLines = (r, opts = {}) => {
    const {
      installView = false,
      hideScreenGroup = false,
      mFmt,
      pctFmt,
      wm = 0,
      hm = 0,
      pct = 0,
      installExtra = { areaM2: 0, groups: [] },
      rx = 0,
      ry = 0
    } = opts;
    const installCabText = Array.isArray(installExtra.groups) && installExtra.groups.length ? installExtra.groups.join("\n") : "—";
    const meterUnit = t("м");
    const areaUnit = t("м²");
    const screenName = hideScreenGroup
      ? String(r.name || "").split("@")[0].trim() || r.name
      : r.name;
    const lsRaw = installView
      ? [screenName, `${mFmt(wm)} x ${mFmt(hm)} ${meterUnit}`, `${pctFmt(pct)}%`, `${mFmt(installExtra.areaM2)} ${areaUnit}`, installCabText]
      : [screenName, `(${rx}; ${ry}) px`, `${Math.round(r.width)} x ${Math.round(r.height)} px`, `${mFmt(wm)} x ${mFmt(hm)} ${meterUnit}`, `${pctFmt(pct)}%`];
    return lsRaw
      .flatMap(line => String(line == null ? "" : line).replace(/\r/g, "").split("\n"))
      .filter(line => line.length > 0);
  };

  function drawRectBase(c, r, sel, z, origin, opts) {
      const options = opts || {};
      if (isNoteRect(r)) { drawNoteRect(c, r, sel, z); return; }
      if (String((r && r.kind) || "").toLowerCase() === "device") {
        if (String(options.installTextMode || "") === "only") return;
        const center = rectCenter(r);
        const a = rads(r.rotation || 0);
        const w = Math.max(1, Number(r.width) || 1);
        const h = Math.max(1, Number(r.height) || 1);
        const exportLike = !!options.ignoreInstallLayerToggles;
        const baseColor = String(r.colorA || "#2fcaaf");
        const borderColor = sel ? "#ffe08a" : "rgba(255,255,255,.85)";
        const inCount = Math.max(1, Math.min(64, Math.round(Number(r.deviceInCount) || 4)));
        const outCount = Math.max(1, Math.min(64, Math.round(Number(r.deviceOutCount) || 4)));
        const orientation = String(r.deviceOrientation || "").toLowerCase() === "vertical" ? "vertical" : "horizontal";
        const inLabels = Array.isArray(r.deviceInLabels) ? r.deviceInLabels : [];
        const outLabels = Array.isArray(r.deviceOutLabels) ? r.deviceOutLabels : [];
        const selectedPort = st && st.devicePortSelection
          && Math.round(Number(st.devicePortSelection.rectId) || 0) === Math.round(Number(r.id) || 0)
          ? {
            kind: String(st.devicePortSelection.kind || "").toLowerCase() === "end" ? "end" : "start",
            cid: Math.max(1, Math.round(Number(st.devicePortSelection.cid) || 1))
          }
          : null;
        const title = String(r.name || `Устройство ${Math.round(Number(r.id) || 0)}`);
        const typeRaw = String(r.deviceType || "controller").toLowerCase();
        const typeLabel = typeRaw === "pc" ? "PC" : typeRaw === "mixer" ? "MIXER" : typeRaw === "camera" ? "CAMERA" : "CONTROLLER";
        const outPurePalette = [
          "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff",
          "#ff8000", "#8000ff", "#00ff80", "#ff0080", "#ffffff"
        ];
        const outControllerColor = cid => outPurePalette[Math.max(0, Math.round(Number(cid) || 1) - 1) % outPurePalette.length];
        c.save();
        c.translate(center.x, center.y);
        c.rotate(a);
        c.fillStyle = baseColor;
        c.fillRect(-w / 2, -h / 2, w, h);
        c.strokeStyle = borderColor;
        c.lineWidth = sel ? 2.5 / Math.max(0.25, z) : 1.2 / Math.max(0.25, z);
        c.strokeRect(-w / 2, -h / 2, w, h);
        const titleText = `${title} · ${typeLabel}`;
        const rDot = Math.max(4.6, Math.min(Math.min(w, h) * 0.085, 9.5));
        const portFs = Math.max(11, Math.min(h * 0.14, 24));
        c.font = `${portFs}px ${fontFamilyCss(st.fontFamily)}`;
        c.fillStyle = "rgba(255,255,255,.95)";
        c.textBaseline = "middle";
        const drawOutlinedText = (text, x, y, align = "left") => {
          c.textAlign = align;
          c.lineJoin = "round";
          c.miterLimit = 2;
          c.lineWidth = Math.max(2.2, portFs * 0.24);
          c.strokeStyle = "rgba(0,0,0,.78)";
          c.strokeText(String(text || ""), x, y);
          c.fillStyle = "rgba(255,255,255,.98)";
          c.fillText(String(text || ""), x, y);
        };
        const pushAnchor = (px, py, dotKind, idx) => {
          if (String(options.installTextMode || "") === "only" || !Array.isArray(st.flowLinkAnchors)) return;
          const wp = rectUVToWorld(r, px + w / 2, py + h / 2);
          st.flowLinkAnchors.push({ rectId: r.id, rid: 0, cid: idx + 1, kind: dotKind, x: wp.x, y: wp.y });
        };
        const drawPortDot = (px, py, dotKind, idx) => {
          c.beginPath();
          c.fillStyle = dotKind === "start"
            ? "rgba(64,190,255,.95)"
            : (typeRaw === "controller" ? outControllerColor(idx + 1) : "rgba(255,170,64,.95)");
          c.arc(px, py, rDot, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "rgba(0,0,0,.78)";
          c.lineWidth = Math.max(1.6, 2.4);
          c.stroke();
          if (selectedPort && selectedPort.kind === dotKind && selectedPort.cid === (idx + 1)) {
            c.strokeStyle = "#ffe08a";
            c.lineWidth = Math.max(1.1, 1.8);
            c.beginPath();
            c.arc(px, py, rDot + Math.max(1.5, 2.2), 0, Math.PI * 2);
            c.stroke();
          }
          pushAnchor(px, py, dotKind, idx);
        };
        const drawPortRow = (prefix, labels, count, rowY, dotKind, laneLeft, laneRight) => {
          const vals = [];
          for (let i = 0; i < count; i++) vals.push(String(labels[i] == null || labels[i] === "" ? (i + 1) : labels[i]));
          const prefixW = c.measureText(prefix).width;
          const gap = Math.max(8, Math.min(18, portFs * 0.9));
          const portsLeft = Math.min(laneRight, laneLeft + prefixW + gap);
          const portsW = Math.max(1, laneRight - portsLeft);
          const valueCenters = [];
          drawOutlinedText(prefix, laneLeft, rowY, "left");
          for (let i = 0; i < vals.length; i++) {
            const px = portsLeft + ((i + 0.5) * portsW) / Math.max(1, vals.length);
            valueCenters.push(px);
            drawOutlinedText(vals[i], px, rowY, "center");
          }
          const dotY = rowY + Math.max(12, portFs * 0.9);
          for (let i = 0; i < valueCenters.length; i++) {
            const px = valueCenters[i];
            drawPortDot(px, dotY, dotKind, i);
          }
          c.fillStyle = "rgba(255,255,255,.95)";
        };
        if (orientation === "vertical") {
          const plateW = Math.max(18, Math.min(w * 0.3, 36));
          c.fillStyle = "rgba(0,0,0,.42)";
          c.fillRect(-w / 2, -h / 2, plateW, h);
          const titlePadY = Math.max(10, h * 0.04);
          const titleMaxH = Math.max(20, h - titlePadY * 2);
          const titleFsBase = Math.max(12, Math.min(w * 0.18, plateW * 0.72, 24));
          c.font = `${titleFsBase}px ${fontFamilyCss(st.fontFamily)}`;
          const measuredTitleW = Math.max(1, c.measureText(titleText).width);
          const titleFs = Math.max(10, Math.min(titleFsBase, titleFsBase * (titleMaxH / measuredTitleW)));
          c.font = `${titleFs}px ${fontFamilyCss(st.fontFamily)}`;
          c.textBaseline = "middle";
          c.textAlign = "center";
          c.lineJoin = "round";
          c.miterLimit = 2;
          c.lineWidth = Math.max(2.4, titleFs * 0.22);
          c.strokeStyle = "rgba(0,0,0,.8)";
          c.fillStyle = "rgba(255,255,255,.98)";
          c.save();
          c.translate(-w / 2 + plateW / 2, 0);
          c.rotate(-Math.PI / 2);
          c.strokeText(titleText, 0, 0);
          c.fillText(titleText, 0, 0);
          c.restore();
          const workLeft = -w / 2 + plateW;
          const workW = Math.max(12, w - plateW);
          const xIn = workLeft + workW * 0.32;
          const xOut = workLeft + workW * 0.72;
          const hdrY = -h / 2 + Math.max(12, portFs * 1.1);
          drawOutlinedText("IN", xIn, hdrY, "center");
          drawOutlinedText("OUT", xOut, hdrY, "center");
          const firstLabelLift = Math.max(rDot + 8, portFs * 0.95);
          const headerToFirstLabelGap = rDot * 2;
          const portsStartY = hdrY + firstLabelLift + portFs + headerToFirstLabelGap;
          const topPad = Math.max(22, portsStartY + h / 2);
          const bottomPad = Math.max(10, Math.max(portFs * 0.9, rDot * 1.8));
          const inStep = Math.max(10, (h - topPad - bottomPad) / Math.max(1, inCount - 1));
          const outStep = Math.max(10, (h - topPad - bottomPad) / Math.max(1, outCount - 1));
          const inVals = [];
          for (let i = 0; i < inCount; i++) inVals.push(String(inLabels[i] == null || inLabels[i] === "" ? (i + 1) : inLabels[i]));
          const outVals = [];
          for (let i = 0; i < outCount; i++) outVals.push(String(outLabels[i] == null || outLabels[i] === "" ? (i + 1) : outLabels[i]));
          for (let i = 0; i < inVals.length; i++) {
            const py = -h / 2 + topPad + i * inStep;
            drawOutlinedText(inVals[i], xIn, py - firstLabelLift, "center");
            drawPortDot(xIn, py, "start", i);
          }
          for (let i = 0; i < outVals.length; i++) {
            const py = -h / 2 + topPad + i * outStep;
            drawOutlinedText(outVals[i], xOut, py - firstLabelLift, "center");
            drawPortDot(xOut, py, "end", i);
          }
        } else {
          const plateH = Math.max(18, Math.min(h * 0.28, 34));
          c.fillStyle = "rgba(0,0,0,.42)";
          c.fillRect(-w / 2, -h / 2, w, plateH);
          const titlePadX = Math.max(10, w * 0.04);
          const titleMaxW = Math.max(20, w - titlePadX * 2);
          const titleFsBase = Math.max(12, Math.min(h * 0.18, plateH * 0.72, 28));
          c.font = `${titleFsBase}px ${fontFamilyCss(st.fontFamily)}`;
          const measuredTitleW = Math.max(1, c.measureText(titleText).width);
          const titleFs = Math.max(10, Math.min(titleFsBase, titleFsBase * (titleMaxW / measuredTitleW)));
          c.font = `${titleFs}px ${fontFamilyCss(st.fontFamily)}`;
          c.textBaseline = "middle";
          c.textAlign = "center";
          c.lineJoin = "round";
          c.miterLimit = 2;
          c.lineWidth = Math.max(2.4, titleFs * 0.22);
          c.strokeStyle = "rgba(0,0,0,.8)";
          c.fillStyle = "rgba(255,255,255,.98)";
          c.strokeText(titleText, 0, -h / 2 + plateH / 2);
          c.fillText(titleText, 0, -h / 2 + plateH / 2);
          const workTop = -h / 2 + plateH;
          const workH = Math.max(8, h - plateH);
          const topY = workTop + workH * 0.25;
          const botY = workTop + workH * 0.75;
          const laneLeft = -w * 0.45;
          const laneRight = w * 0.45;
          drawPortRow("IN", inLabels, inCount, topY, "start", laneLeft, laneRight);
          drawPortRow("OUT", outLabels, outCount, botY, "end", laneLeft, laneRight);
        }
        c.restore();
        return;
      }
      if (typeof isShapeRect === "function" && isShapeRect(r)) {
        const viewModeOverride = options && options.viewModeOverride ? normalizeViewMode(options.viewModeOverride) : null;
        const installViewForShape = (viewModeOverride || normalizeViewMode(st.viewMode)) === "install";
        const installLayerStateForShape = options.ignoreInstallLayerToggles ? {} : (st.installLayers || {});
        const showShapeContoursLayer = !!(!installViewForShape || installLayerStateForShape.contours !== false);
        if (String(options.installTextMode || "") !== "only" && showShapeContoursLayer && !options.suppressContoursOverlay) drawShapeRect(c, r, sel, z, options);
        return;
      }
      const cellX = drawCellX(r), cellY = drawCellY(r), hs = getHiddenSet(r), a = rads(r.rotation || 0), center = rectCenter(r), w = r.width, h = r.height, includeFlow = options.includeFlow !== false, designerRender = !!options.designerRender, disableLod = !!options.disableLod, forceLowDetail = !!options.forceLowDetail, installTextMode = String(options.installTextMode || "normal"), flowGroupsOverride = Array.isArray(options.flowGroupsOverride) ? options.flowGroupsOverride : null, hasRegionsOverride = Object.prototype.hasOwnProperty.call(options, "regionsOverride"), viewModeOverride = options && options.viewModeOverride ? normalizeViewMode(options.viewModeOverride) : null; c.save(); c.translate(center.x, center.y); c.rotate(a); c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
      const skeleton = !st.fontReady;
      const installView = (viewModeOverride || normalizeViewMode(st.viewMode)) === "install";
      const topo = getCellTopologyCached(r, cellX, cellY), maskRender = getMaskRenderDataCached(r, cellX, cellY, hs, topo);
      let flowEditingThisRect = !!(st.mode === "flowEdit" && sel && r.id === st.sel);
      const cellCount = (topo.cols || 1) * (topo.rows || 1), interactiveDetail = !!(sel || st.mode === "flowEdit" || isMaskMode() || isCellEditMode() || isClusterEditMode() || isRigEditMode()), lowDetail = !!((forceLowDetail && !flowEditingThisRect) || (!disableLod && designerRender && !interactiveDetail && cellCount > 3000));
      const clusterDraggingThisRect = !!(st.clusterDrag && Math.round(Number(st.clusterDrag.rectId) || 0) === Math.round(Number(r && r.id) || 0));
      const suppressCabinetLabels = !!(st.pan || (st.drag && st.drag.moved));
      const cabinetLabelReadable = !!(flowEditingThisRect || Math.min(cellX, cellY) * Math.max(0.01, z) >= 24);
      const showNumbers = !!(r.numberCells && !suppressCabinetLabels && cabinetLabelReadable);
      const cellEditActive = isCellEditMode(), rigEditActive = isRigEditMode(), clusterEditActive = isClusterEditMode(), flowEditActive = st.mode === "flowEdit";
      const installLayerState = options.ignoreInstallLayerToggles ? {} : (st.installLayers || {});
      const showInstallTextLayer = !!(!installView || installLayerState.text !== false);
      const showInstallFlowLayer = !!(!installView || installLayerState.flow !== false || flowEditActive);
      const showInstallRigLayer = !!(!installView || installLayerState.rig !== false || rigEditActive);
      const flowEnabledByMode = normalizeDataFlow(r.dataFlow) !== "none";
      const flowInteractivePause = !!(cellEditActive || rigEditActive || st.pan || (st.drag && st.drag.moved) || st.draft || clusterDraggingThisRect || (st.touch && st.touch.type === "pinch") || (lowDetail && !flowEditingThisRect));
      const flowFlags = computeRectRenderFlags({
        stMode: st.mode,
        sel,
        rectId: r && r.id,
        selectedId: st.sel,
        installView: !!(installView && includeFlow && showInstallFlowLayer),
        flowEnabledByMode,
        flowInteractivePause,
        showNumbers
      });
      flowEditingThisRect = flowFlags.flowEditingThisRect;
      const wantsFlowDraw = flowFlags.wantsFlowDraw;
      const wantsFlowForNumbers = flowFlags.wantsFlowForNumbers;
      const suppressFlowEditText = !!(flowEditingThisRect && st.mode === "flowEdit" && sel && r.id === st.sel);
      const showRegionsOverlayRequested = !!(installView && designerRender && !clusterDraggingThisRect);
      const needRegions = !!(!lowDetail && (showNumbers || wantsFlowDraw || flowEditingThisRect || showRegionsOverlayRequested || (installView && sel && !clusterDraggingThisRect)));
      const regions = (needRegions ? (hasRegionsOverride ? options.regionsOverride : (options.skipRegionCalc ? null : planNumberRegions(r, cellX, cellY, topo, hs, !options.noCachedRegions))) : null);
      const showRegionsOverlay = !!(regions && showRegionsOverlayRequested);
      if (sel && r.id === st.sel && !((st.drag && st.drag.moved) || st.clusterDrag || st.flowDrag || st.pan || st.draft)) updateSplitVariantControl(r);
      const flowGroups = (wantsFlowDraw || wantsFlowForNumbers) ? (flowGroupsOverride || (options.skipFlowCalc ? [] : getDataFlowGroups(r, cellX, cellY, topo, hs, regions))) : [];
      if (Array.isArray(flowGroups) && flowGroups.length) collectFlowLinkAnchors(r, flowGroups);
      if (st.mode === "flowEdit" && sel && r.id === st.sel) {
        const manualPickMode = String(st.flowEditVariant || "auto") === "manual";
        const editFlowGroups = manualPickMode ? getDataFlowGroups(r, cellX, cellY, topo, hs, regions, { ignoreManualOrder: true }) : flowGroups;
        collectFlowEditPoints(r, editFlowGroups, { manualPickMode });
        if (manualPickMode && typeof collectFlowManualPickPoints === "function") collectFlowManualPickPoints(r, cellX, cellY, topo, hs, regions);
      }
      const buildDeferredTextOverlay = () => {
        const rx = Math.round(r.x - origin.x), ry = Math.round(r.y - origin.y), baseFs = getRectTextSizePx(r), wm = (r.widthM != null ? r.widthM : r.width / Math.max(1, r.scale || 256)), hm = (r.heightM != null ? r.heightM : r.height / Math.max(1, r.scale || 256)), pct = fillPercent(wm, hm, r.areaM2Px);
        const installExtra = installView ? buildVisibleCabinetSummary(r, cellX, cellY, topo, hs) : { areaM2: 0, groups: [] };
        const ls = buildRectOverlayLines(r, { installView, hideScreenGroup: !!options.hideScreenGroupInText, mFmt, pctFmt, wm, hm, pct, installExtra, rx, ry });
        const maxW = Math.max(20, w - 6), localRect = { x: -w / 2, y: -h / 2, width: w, height: h };
        const layoutKey = ["canvas", w, h, cellX, cellY, listSignature(r.hiddenCells), baseFs, maxW, st.fontFamily, ls.join("|")].join("|");
        const layout = getRectTextLayoutCached(r, layoutKey, () => {
          const hbs = hiddenCellBoxes(localRect, cellX, cellY, hs), freeRects = computeFreeRects(localRect, cellX, cellY, hs);
          return chooseTextLayout(localRect, ls, (t, fs) => { c.font = `${fs}px ${fontFamilyCss(st.fontFamily)}`; return c.measureText(t).width }, maxW, baseFs, hbs, freeRects);
        });
        const txtTheme = rectTextTheme(r);
        return { layout, ls, maxW, txtTheme, font: fontFamilyCss(st.fontFamily) };
      };
      if (installTextMode === "only") {
        if (showInstallTextLayer && !skeleton && !suppressFlowEditText && !((isMaskMode() || isCellEditMode() || isRigEditMode()) && sel)) {
          drawRectOverlays({
            c, r, sel, z, w, h, cellX, cellY, topo, hs,
            installView, cellEditActive, clusterEditActive, flowEditActive,
            wantsFlowDraw: false, flowGroups: [], deferredTextOverlay: buildDeferredTextOverlay()
          });
        }
        c.restore();
        c.restore();
        return;
      }
      if (
        Array.isArray(options.collectInstallTextOverlays)
        && installTextMode === "skip"
        && installView
        && showInstallTextLayer
        && !skeleton
        && !suppressFlowEditText
        && !((isMaskMode() || isCellEditMode() || isRigEditMode()) && sel)
      ) {
        options.collectInstallTextOverlays.push({
          r,
          centerX: center.x,
          centerY: center.y,
          angle: a,
          w,
          h,
          hiddenRects: maskRender && maskRender.hasMask ? maskRender.hiddenRects : null,
          overlay: buildDeferredTextOverlay()
        });
      }
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
        const layer = getRectFillLayerCached(r, cellX, cellY, topo, maskRender, lowDetail, z);
        if (layer) c.drawImage(layer, -w / 2, -h / 2, w, h);
        const decorLayer = getRectDecorLayerCached(r, maskRender, z);
        if (decorLayer) c.drawImage(decorLayer, -w / 2, -h / 2, w, h);
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
          if (installTextMode !== "skip" && showInstallTextLayer && !skeleton && !suppressFlowEditText && !((isMaskMode() || isCellEditMode() || isRigEditMode()) && sel)) {
            deferredTextOverlay = buildDeferredTextOverlay();
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
      const cabinetSel = st && st.cabinetCellSelection;
      const selectedCabinetForRect = cabinetSel
        && Math.round(Number(cabinetSel.rectId) || 0) === Math.round(Number(r && r.id) || 0)
        && Number.isFinite(Number(cabinetSel.cid));
      if (selectedCabinetForRect) {
        const targetCid = Math.round(Number(cabinetSel.cid) || 0);
        const comps = getRectComponentRenderDataCached(r, cellX, cellY, topo);
        c.save();
        c.beginPath();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasCabinetCells = false;
        const comp = Array.isArray(comps)
          ? comps.find(it => {
              const cidRaw = Number(it && it.cid);
              if (!Number.isFinite(cidRaw)) return false;
              return Math.round(cidRaw) === targetCid;
            })
          : null;
        if (comp && Array.isArray(comp.cells)) {
          for (const cell of comp.cells) {
            const x = Number(cell && cell.x) || 0;
            const y = Number(cell && cell.y) || 0;
            const cw = Number(cell && cell.w) || 0;
            const ch = Number(cell && cell.h) || 0;
            if (!(cw > 0 && ch > 0)) continue;
            hasCabinetCells = true;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + cw);
            maxY = Math.max(maxY, y + ch);
            c.rect(x, y, cw, ch);
          }
        }
        if (hasCabinetCells) {
          c.fillStyle = "rgba(250,204,21,.34)";
          c.fill();
          c.strokeStyle = "rgba(245,158,11,.98)";
          c.lineWidth = Math.max(1.25, 1.9 / Math.max(0.25, z));
          const cols = Math.max(1, Math.round(Number(topo && topo.cols) || Math.ceil(w / cellX)));
          const rows = Math.max(1, Math.round(Number(topo && topo.rows) || Math.ceil(h / cellY)));
          const compArr = Array.isArray(topo && topo.comp) ? topo.comp : [];
          const hidden = hs && typeof hs.has === "function" ? hs : null;
          const isTargetVisibleCell = (col, row) => {
            if (col < 0 || row < 0 || col >= cols || row >= rows) return false;
            if (hidden && hidden.has(`${col},${row}`)) return false;
            const idx = row * cols + col;
            const cidRaw = Number(compArr[idx]);
            if (!Number.isFinite(cidRaw)) return false;
            return Math.round(cidRaw) === targetCid;
          };
          c.beginPath();
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (!isTargetVisibleCell(col, row)) continue;
              const x0 = -w / 2 + col * cellX;
              const y0 = -h / 2 + row * cellY;
              const x1 = -w / 2 + Math.min(w, (col + 1) * cellX);
              const y1 = -h / 2 + Math.min(h, (row + 1) * cellY);
              if (!isTargetVisibleCell(col, row - 1)) { c.moveTo(x0, y0); c.lineTo(x1, y0); }
              if (!isTargetVisibleCell(col + 1, row)) { c.moveTo(x1, y0); c.lineTo(x1, y1); }
              if (!isTargetVisibleCell(col, row + 1)) { c.moveTo(x0, y1); c.lineTo(x1, y1); }
              if (!isTargetVisibleCell(col - 1, row)) { c.moveTo(x0, y0); c.lineTo(x0, y1); }
            }
          }
          c.stroke();
        }
        c.restore();
      }
      if (maskedClip) { c.restore(); maskedClip = false; }
      {
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
      }
      const drawCtx = {
        c, r, sel, z, w, h, cellX, cellY, topo, hs,
        installView, cellEditActive, clusterEditActive, flowEditActive,
        wantsFlowDraw, flowGroups, deferredTextOverlay,
        suppressRigOverlay: !!((options && options.suppressRigOverlay) || !showInstallRigLayer)
      };
      drawRectOverlays(drawCtx);
      const drawAfterClip = drawRectInteractions(drawCtx);
      c.restore();
      if (typeof drawAfterClip === "function") {
        if (Array.isArray(options.collectInteractionTooltips)) {
          options.collectInteractionTooltips.push(() => {
            c.save();
            c.translate(center.x, center.y);
            c.rotate(a);
            drawAfterClip();
            c.restore();
          });
        } else {
          drawAfterClip();
        }
      }
      c.restore();
      if (installView && !cellEditActive && !clusterEditActive && !flowEditActive && !(options && options.suppressRigOverlay) && showInstallRigLayer) {
        const forceRigOverlay = !!(options && options.forceRigOverlay);
        drawRigOutsideOverlay(c, r, cellX, cellY, topo, hs, z, !!sel || forceRigOverlay);
      }
    }

  return { drawRectBase };
};
