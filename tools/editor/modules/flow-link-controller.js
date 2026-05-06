export const setupFlowLinkController = (deps = {}) => {
  const {
    st,
    normalizeFlowLinks,
    flowAnchorKey,
    flowLinkKey: flowLinkPairKey,
    getRectRuntime,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    rectAABBMasked,
    AREA_LIMIT_EPS
  } = deps;
  if (st && typeof st.debugFlowLink === "undefined") st.debugFlowLink = false;

  const flowLinkCheckDebugState = new Map();
  const toIntMin = (v, min) => Math.max(min, Math.round(Number(v) || 0));
  const toRectId = v => toIntMin(v, 1);
  const toRid = v => toIntMin(v, 0);
  const toCid = v => toIntMin(v, 0);
  const rectKind = r => String((r && r.kind) || "").toLowerCase();
  const isDeviceRect = r => rectKind(r) === "device";
  const deviceType = r => {
    const v = String((r && r.deviceType) || "controller").toLowerCase();
    return (v === "pc" || v === "mixer" || v === "camera") ? v : "controller";
  };
  const isPcLike = type => type === "pc" || type === "mixer" || type === "camera";
  const isNumericPortLabel = value => {
    const s = String(value == null ? "" : value).trim();
    return !s || /^[-+]?(?:\d+(?:[.,]\d+)?|\d*[.,]\d+)$/.test(s);
  };
  const devicePortLabel = (r, kind, cid) => {
    const index = Math.max(0, toCid(cid) - 1);
    const labels = kind === "end"
      ? (Array.isArray(r && r.deviceOutLabels) ? r.deviceOutLabels : [])
      : (Array.isArray(r && r.deviceInLabels) ? r.deviceInLabels : []);
    const raw = labels[index];
    return String(raw == null || raw === "" ? String(index + 1) : raw).trim();
  };
  const hasNamedDeviceOutPort = (r, cid) => !isNumericPortLabel(devicePortLabel(r, "end", cid));
  const isScreenLikeRect = r => !isDeviceRect(r);
  const posNum = (v, fallback = 1) => Math.max(1, Number(v) || fallback);
  const round3 = v => Math.round((Number(v) || 0) * 1000) / 1000;
  const sortNumAsc = (a, b) => a - b;
  const sortStrAsc = (a, b) => String(a).localeCompare(String(b));
  const toSortedNumbers = values => [...(values || [])].sort(sortNumAsc);
  const toSortedStrings = values => [...(values || [])].sort(sortStrAsc);
  const addAdjEdge = (adj, u, v) => {
    const arr = adj.get(u) || [];
    arr.push(v);
    adj.set(u, arr);
  };
  const hasDirectedPath = (adj, from, to) => {
    if (from === to) return true;
    const q = [from];
    const seen = new Set([from]);
    while (q.length) {
      const u = q.shift();
      if (u === to) return true;
      const next = adj.get(u) || [];
      for (const v of next) {
        if (seen.has(v)) continue;
        seen.add(v);
        q.push(v);
      }
    }
    return false;
  };
  const collectUndirectedComponent = (adj, start) => {
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const u = q.shift();
      const next = adj.get(u) || [];
      for (const v of next) {
        if (seen.has(v)) continue;
        seen.add(v);
        q.push(v);
      }
    }
    return seen;
  };
  const debugChainRegionIds = rectRidMap => [...rectRidMap.entries()]
    .map(([rectId, set]) => ({ rectId, regions: toSortedNumbers(set) }))
    .sort((a, b) => a.rectId - b.rectId);
  const debugNormalizedRects = rects => (rects || []).map(it => ({
    id: it.id,
    rectId: it.rectId,
    rid: it.rid,
    source: it.source,
    w: round3(it.w),
    h: round3(it.h)
  }));
  const endpointDebug = ep => ep ? {
    rectId: toRectId(ep.rectId),
    rid: toRid(ep.rid),
    cid: toCid(ep.cid),
    kind: String(ep.kind || "")
  } : null;
  const flowLinkKey = ln => flowLinkPairKey(ln && ln.from, ln && ln.to);
  const regionNodeKey = (rectId, rid) => `${toRectId(rectId)}:${toRid(rid)}`;
  const parseRegionNodeKey = key => {
    const p = String(key || "").split(":");
    return { rectId: toRectId(p[0]), rid: toRid(p[1]) };
  };
  const endpointNodeKey = ep => regionNodeKey(ep && ep.rectId, ep && ep.rid);

  const logCanLinkFlowAnchorsDebug = (a, b, ok, reason, extra = {}) => {
    if (!st) return;
    const shouldLog = !!st.debugFlowLink || !ok;
    if (!shouldLog) return;
    try {
      const key = flowLinkPairKey(a || {}, b || {});
      const payload = {
        ok: !!ok,
        reason: String(reason || ""),
        from: endpointDebug(a),
        to: endpointDebug(b),
        ...extra
      };
      st.lastFlowLinkCheck = payload;
      if (!ok) st.lastFlowLinkReject = payload;
      const sig = JSON.stringify(payload);
      const now = Date.now();
      const prev = flowLinkCheckDebugState.get(key);
      if (prev && prev.sig === sig && (now - prev.ts) < 320) return;
      flowLinkCheckDebugState.set(key, { sig, ts: now });
      const method = ok ? "info" : "warn";
      console[method]("[canLinkFlowAnchors]", payload);
    } catch (_e) { }
  };

  const pruneFlowLinks = () => {
    const links = normalizeFlowLinks(st.flowLinks);
    const valid = [];
    const anchorSet = new Set((Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : []).map(flowAnchorKey));
    for (const ln of links) {
      if (!anchorSet.has(flowAnchorKey(ln.from))) continue;
      if (!anchorSet.has(flowAnchorKey(ln.to))) continue;
      valid.push(ln);
    }
    st.flowLinks = valid;
  };

  const canLinkFlowAnchors = (a, b) => {
    if (!a || !b) { logCanLinkFlowAnchorsDebug(a, b, false, "missing_anchor"); return false; }
    if (a.rectId === b.rectId) { logCanLinkFlowAnchorsDebug(a, b, false, "same_rect"); return false; }
    if (a.kind !== "end" || b.kind !== "start") { logCanLinkFlowAnchorsDebug(a, b, false, "invalid_kinds"); return false; }
    const byId = new Map((Array.isArray(st.rects) ? st.rects : []).map(r => [toRectId(r && r.id), r]));
    const ra = byId.get(toRectId(a.rectId));
    const rb = byId.get(toRectId(b.rectId));
    if (!ra || !rb) { logCanLinkFlowAnchorsDebug(a, b, false, "rect_not_found"); return false; }
    const aIsDevice = isDeviceRect(ra);
    const bIsDevice = isDeviceRect(rb);
    const aType = aIsDevice ? deviceType(ra) : "";
    const bType = bIsDevice ? deviceType(rb) : "";
    const sourceNamedControllerOut = aIsDevice && aType === "controller" && hasNamedDeviceOutPort(ra, a.cid);
    if (aIsDevice || bIsDevice) {
      const allowControllerToScreen = aIsDevice && !bIsDevice && aType === "controller";
      const allowNamedControllerOutToDeviceIn = bIsDevice && sourceNamedControllerOut;
      const allowPcLikeToController = aIsDevice && bIsDevice && isPcLike(aType) && bType === "controller";
      const allowPcLikeToPcLike = aIsDevice && bIsDevice && isPcLike(aType) && isPcLike(bType);
      if (!allowControllerToScreen && !allowNamedControllerOutToDeviceIn && !allowPcLikeToController && !allowPcLikeToPcLike) {
        logCanLinkFlowAnchorsDebug(a, b, false, "device_link_rule_violation", {
          fromKind: rectKind(ra),
          toKind: rectKind(rb),
          fromDeviceType: aType,
          toDeviceType: bType,
          fromDeviceOutLabel: aIsDevice ? devicePortLabel(ra, "end", a.cid) : ""
        });
        return false;
      }
    }
    const linksRaw = normalizeFlowLinks(st.flowLinks);
    const groupsByRectId = new Map();
    const endpointLiveCache = new Map();
    const getRectGroups = rectId => {
      if (groupsByRectId.has(rectId)) return groupsByRectId.get(rectId);
      const rr = byId.get(rectId);
      if (!rr) { groupsByRectId.set(rectId, null); return null; }
      const rt = getRectRuntime(rr, { withGroups: true });
      const groups = rt.groups;
      const out = Array.isArray(groups) ? groups : [];
      groupsByRectId.set(rectId, out);
      return out;
    };
    const isEndpointLive = ep => {
      const key = flowAnchorKey(ep);
      if (endpointLiveCache.has(key)) return endpointLiveCache.get(key);
      const directAnchor = (Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : []).find(a => flowAnchorKey(a) === key);
      if (directAnchor) {
        endpointLiveCache.set(key, true);
        return true;
      }
      const rectId = toRectId(ep && ep.rectId);
      const rid = toRid(ep && ep.rid);
      const cid = toCid(ep && ep.cid);
      const kind = String(ep && ep.kind || "").toLowerCase() === "end" ? "end" : "start";
      const groups = getRectGroups(rectId);
      const g = Array.isArray(groups) ? groups.find(it => toRid(it && it.rid) === rid) : null;
      const pts = Array.isArray(g && g.points) ? g.points : [];
      if (!pts.length) { endpointLiveCache.set(key, false); return false; }
      const p = kind === "end" ? pts[pts.length - 1] : pts[0];
      const ok = toCid(p && p.cid) === cid;
      endpointLiveCache.set(key, ok);
      return ok;
    };
    const links = linksRaw.filter(ln => isEndpointLive(ln && ln.from) && isEndpointLive(ln && ln.to));
    const linkMeta = links.map(ln => {
      const from = ln && ln.from;
      const to = ln && ln.to;
      return {
        from,
        to,
        fromAnchor: flowAnchorKey(from),
        toAnchor: flowAnchorKey(to),
        fromRectId: toRectId(from && from.rectId),
        toRectId: toRectId(to && to.rectId),
        fromNode: endpointNodeKey(from),
        toNode: endpointNodeKey(to)
      };
    });
    const fromRectId = toRectId(a.rectId);
    const targetRectId = toRectId(b.rectId);
    const fromAnchorKey = flowAnchorKey(a);
    const toAnchorKey = flowAnchorKey(b);
    const allowMultiOutFromController = sourceNamedControllerOut || (aIsDevice && aType === "controller" && !bIsDevice);
    for (const ln of linkMeta) {
      const lkFrom = ln.fromAnchor;
      const lkTo = ln.toAnchor;
      if (lkTo === toAnchorKey && lkFrom !== fromAnchorKey) {
        logCanLinkFlowAnchorsDebug(a, b, false, "start_already_linked", {
          existingFrom: endpointDebug(ln.from),
          existingTo: endpointDebug(ln.to)
        });
        return false;
      }
      if (!allowMultiOutFromController && lkFrom === fromAnchorKey && lkTo !== toAnchorKey) {
        logCanLinkFlowAnchorsDebug(a, b, false, "end_already_linked", {
          existingFrom: endpointDebug(ln.from),
          existingTo: endpointDebug(ln.to)
        });
        return false;
      }
    }
    if (aIsDevice || bIsDevice) {
      logCanLinkFlowAnchorsDebug(a, b, true, "ok_device_link_bypass_chain_checks", {
        fromKind: rectKind(ra),
        toKind: rectKind(rb),
        fromDeviceType: deviceType(ra),
        toDeviceType: deviceType(rb)
      });
      return true;
    }
    const edgeSet = new Set();
    const outAdj = new Map();
    const undirAdj = new Map();
    for (const ln of linkMeta) {
      const u = ln.fromRectId;
      const v = ln.toRectId;
      if (!u || !v) continue;
      const k = `${u}>${v}`;
      if (edgeSet.has(k)) continue;
      edgeSet.add(k);
      addAdjEdge(outAdj, u, v);
      addAdjEdge(undirAdj, u, v);
      addAdjEdge(undirAdj, v, u);
    }
    if (!edgeSet.has(`${fromRectId}>${targetRectId}`)) {
      addAdjEdge(outAdj, fromRectId, targetRectId);
      addAdjEdge(undirAdj, fromRectId, targetRectId);
      addAdjEdge(undirAdj, targetRectId, fromRectId);
    }
    const cycle = hasDirectedPath(outAdj, targetRectId, fromRectId);
    if (cycle) { logCanLinkFlowAnchorsDebug(a, b, false, "cycle_detected", { fromRectId, toRectId: targetRectId }); return false; }
    const nodeMetaMap = new Map();
    const rememberNodeMeta = ep => {
      if (!ep) return;
      const key = endpointNodeKey(ep);
      const rectId = toRectId(ep.rectId);
      const rid = toRid(ep.rid);
      const cidRaw = Number(ep.cid);
      const cid = Number.isFinite(cidRaw) ? toCid(cidRaw) : null;
      const prev = nodeMetaMap.get(key);
      if (!prev) {
        nodeMetaMap.set(key, { rectId, rid, cid });
        return;
      }
      if (prev.cid == null && cid != null) prev.cid = cid;
    };
    for (const ln of linkMeta) {
      rememberNodeMeta(ln.from);
      rememberNodeMeta(ln.to);
    }
    rememberNodeMeta(a);
    rememberNodeMeta(b);
    const regionAdj = new Map();
    const addRegionEdge = (k1, k2) => {
      if (!k1 || !k2 || k1 === k2) return;
      const a1 = regionAdj.get(k1) || [];
      a1.push(k2);
      regionAdj.set(k1, a1);
      const a2 = regionAdj.get(k2) || [];
      a2.push(k1);
      regionAdj.set(k2, a2);
    };
    for (const ln of linkMeta) addRegionEdge(ln.fromNode, ln.toNode);
    const fromNode = endpointNodeKey(a);
    const toNode = endpointNodeKey(b);
    addRegionEdge(fromNode, toNode);
    const chainNodeSet = collectUndirectedComponent(regionAdj, fromNode);
    if (!chainNodeSet.has(toNode)) { logCanLinkFlowAnchorsDebug(a, b, false, "region_chain_disconnected", { fromNode, toNode }); return false; }
    const chainEdges = [];
    for (const ln of linkMeta) {
      const fk = ln.fromNode;
      const tk = ln.toNode;
      if (!chainNodeSet.has(fk) || !chainNodeSet.has(tk)) continue;
      chainEdges.push({ from: fk, to: tk });
    }
    chainEdges.push({ from: fromNode, to: toNode, candidate: true });
    const rectRidMap = new Map();
    const chainIds = new Set();
    for (const nk of chainNodeSet) {
      const m = nodeMetaMap.get(nk) || parseRegionNodeKey(nk);
      const rr = byId.get(m.rectId);
      if (!rr || !isScreenLikeRect(rr)) continue;
      const set = rectRidMap.get(m.rectId) || new Set();
      set.add(m.rid);
      rectRidMap.set(m.rectId, set);
      chainIds.add(m.rectId);
    }
    const regionBBoxCache = new Map();
    const makeBounds = () => ({ minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity });
    const expandBounds = (bounds, minU, minV, maxU, maxV) => {
      bounds.minU = Math.min(bounds.minU, minU);
      bounds.minV = Math.min(bounds.minV, minV);
      bounds.maxU = Math.max(bounds.maxU, maxU);
      bounds.maxV = Math.max(bounds.maxV, maxV);
    };
    const boundsToLocalBox = bounds => {
      const { minU, minV, maxU, maxV } = bounds || {};
      const valid = Number.isFinite(minU) && Number.isFinite(minV) && Number.isFinite(maxU) && Number.isFinite(maxV) && maxU > minU && maxV > minV;
      if (!valid) return null;
      return { minU, minV, maxU, maxV, w: Math.max(1, maxU - minU), h: Math.max(1, maxV - minV) };
    };
    const rectLocalBoxFromAabb = rr => {
      const rb = rectAABBMasked(rr);
      const w = Math.max(1, rb.maxX - rb.minX);
      const h = Math.max(1, rb.maxY - rb.minY);
      return { minU: 0, minV: 0, maxU: w, maxV: h, w, h };
    };
    const getRegionBBoxLocalPx = (rr, rid) => {
      const rectId = toRectId(rr && rr.id);
      const rg = toRid(rid);
      const key = `${rectId}:${rg}`;
      if (regionBBoxCache.has(key)) return regionBBoxCache.get(key);
      const cx = drawCellX(rr);
      const cy = drawCellY(rr);
      const rt = getRectRuntime(rr, { withGroups: true });
      const groups = rt.groups;
      const g = (Array.isArray(groups) ? groups : []).find(it => toRid(it && it.rid) === rg);
      if (!g || !Array.isArray(g.points) || !g.points.length) { regionBBoxCache.set(key, null); return null; }
      const bounds = makeBounds();
      for (const p of g.points) {
        const u = +p.u || 0;
        const v = +p.v || 0;
        const bw = posNum(p && p.bw, cx);
        const bh = posNum(p && p.bh, cy);
        expandBounds(bounds, u - bw / 2, v - bh / 2, u + bw / 2, v + bh / 2);
      }
      const out = boundsToLocalBox(bounds);
      if (!out) { regionBBoxCache.set(key, null); return null; }
      regionBBoxCache.set(key, out);
      return out;
    };
    const compBBoxCache = new Map();
    const getCompBBoxLocalPx = (rr, cid) => {
      const rectId = toRectId(rr && rr.id);
      const compId = toCid(cid);
      const key = `${rectId}:${compId}`;
      if (compBBoxCache.has(key)) return compBBoxCache.get(key);
      const cx = drawCellX(rr);
      const cy = drawCellY(rr);
      const topo = getCellTopologyCached(rr, cx, cy);
      const cols = toIntMin(topo && topo.cols, 1);
      const rows = toIntMin(topo && topo.rows, 1);
      const bounds = makeBounds();
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const c = toCid(topo && Array.isArray(topo.comp) ? topo.comp[idx] : 0);
          if (c !== compId) continue;
          const u1 = x * cx;
          const v1 = y * cy;
          const u2 = Math.min(rr.width, (x + 1) * cx);
          const v2 = Math.min(rr.height, (y + 1) * cy);
          expandBounds(bounds, u1, v1, u2, v2);
        }
      }
      const out = boundsToLocalBox(bounds);
      if (!out) { compBBoxCache.set(key, null); return null; }
      compBBoxCache.set(key, out);
      return out;
    };
    const normalizedRects = [];
    const regionFallbackRects = [];
    for (const nk of chainNodeSet) {
      const nm = nodeMetaMap.get(nk) || parseRegionNodeKey(nk);
      const rr = byId.get(nm.rectId);
      if (!rr || !isScreenLikeRect(rr)) continue;
      let bb = getRegionBBoxLocalPx(rr, nm.rid);
      let source = "region";
      if (!bb && nm.cid != null) {
        bb = getCompBBoxLocalPx(rr, nm.cid);
        source = "component";
      }
      if (!bb) {
        bb = rectLocalBoxFromAabb(rr);
        source = "rect";
        regionFallbackRects.push({ rectId: nm.rectId, rid: nm.rid, node: nk, source });
      }
      const w = posNum(bb.w);
      const h = posNum(bb.h);
      const scalePx = posNum(st.globalScale, Number(rr && rr.scale) || 256);
      const areaM2Px = posNum(rr && rr.areaM2Px, 65536);
      const k = Math.sqrt(areaM2Px) / scalePx;
      normalizedRects.push({ id: nk, rectId: nm.rectId, rid: nm.rid, source, w: Math.max(1e-6, w * k), h: Math.max(1e-6, h * k) });
    }
    if (!normalizedRects.length) {
      logCanLinkFlowAnchorsDebug(a, b, true, "ok_no_screen_nodes", {
        chainIds: [...chainIds],
        chainNodeCount: chainNodeSet.size,
        chainNodes: toSortedStrings(chainNodeSet)
      });
      return true;
    }
    const packRectsCompact = rects => {
      const src = Array.isArray(rects) ? rects : [];
      if (!src.length) return { area: 0, width: 0, height: 0 };
      if (src.length === 1) return { area: src[0].w * src[0].h, width: src[0].w, height: src[0].h };
      const sumArea = src.reduce((a0, r0) => a0 + Math.max(1e-6, r0.w * r0.h), 0);
      const sumW = src.reduce((a0, r0) => a0 + Math.max(r0.w, r0.h), 0);
      const maxSide = src.reduce((m0, r0) => Math.max(m0, r0.w, r0.h), 0);
      const candSet = new Set([maxSide, Math.sqrt(sumArea), sumW, sumW / 2, sumW / 3, sumW / 4]);
      for (const r0 of src) { candSet.add(r0.w); candSet.add(r0.h); }
      const widths = [...candSet].map(v => Math.max(maxSide, Number(v) || maxSide)).filter(v => Number.isFinite(v) && v > 0).sort((a0, b0) => a0 - b0);
      const sortedVariants = [
        src.slice().sort((a0, b0) => Math.max(b0.w, b0.h) - Math.max(a0.w, a0.h)),
        src.slice().sort((a0, b0) => (b0.w * b0.h) - (a0.w * a0.h)),
        src.slice().sort((a0, b0) => b0.w - a0.w)
      ];
      const placeShelf = (items, limitW, allowRotate) => {
        let x = 0;
        let y = 0;
        let rowH = 0;
        let maxX = 0;
        for (const it of items) {
          const vars = allowRotate ? [{ w: it.w, h: it.h }, { w: it.h, h: it.w }] : [{ w: it.w, h: it.h }];
          let choice = vars[0];
          let fitChoice = null;
          for (const v of vars) {
            if (x + v.w <= limitW + 1e-9) {
              const score = Math.max(rowH, v.h) * 1e6 + v.w;
              if (!fitChoice || score < fitChoice.score) fitChoice = { ...v, score };
            }
          }
          if (fitChoice) choice = fitChoice;
          else if (allowRotate && vars.length > 1 && vars[1].w < vars[0].w) choice = vars[1];
          if (x > 0 && x + choice.w > limitW + 1e-9) {
            y += rowH;
            x = 0;
            rowH = 0;
          }
          x += choice.w;
          rowH = Math.max(rowH, choice.h);
          maxX = Math.max(maxX, x);
        }
        const totalH = y + rowH;
        return { area: maxX * totalH, width: maxX, height: totalH };
      };
      const pickBest = (best, cand) => (cand.area < best.area ? cand : best);
      let best = { area: Infinity, width: 0, height: 0 };
      for (const wLim of widths) {
        for (const items of sortedVariants) {
          best = pickBest(best, placeShelf(items, wLim, false));
          best = pickBest(best, placeShelf(items, wLim, true));
        }
      }
      return best.area < Infinity ? best : { area: sumArea, width: Math.sqrt(sumArea), height: Math.sqrt(sumArea) };
    };
    const packed = packRectsCompact(normalizedRects);
    const chainArea = Math.max(0, Number(packed && packed.area) || 0);
    const allowed = 655360 + AREA_LIMIT_EPS;
    const ok = chainArea <= allowed;
    logCanLinkFlowAnchorsDebug(a, b, ok, ok ? "ok" : "chain_area_limit", {
      chainIds: toSortedNumbers(chainIds),
      chainNodeCount: chainNodeSet.size,
      chainNodes: toSortedStrings(chainNodeSet),
      chainEdges,
      chainRegionIds: debugChainRegionIds(rectRidMap),
      regionFallbackRects,
      normalizedRects: debugNormalizedRects(normalizedRects),
      chainArea: round3(chainArea),
      packedW: round3(packed && packed.width || 0),
      packedH: round3(packed && packed.height || 0),
      chainMaxAllowed: 655360,
      allowed: round3(allowed),
      linkCount: links.length,
      linkCountRaw: linksRaw.length,
      staleLinkCount: Math.max(0, linksRaw.length - links.length)
    });
    return ok;
  };

  const toggleFlowLinkBetween = (a, b) => {
    return mutateFlowLinkBetween(a, b, { toggle: true });
  };

  const addFlowLinkBetween = (a, b) => {
    return mutateFlowLinkBetween(a, b, { toggle: false });
  };

  const mutateFlowLinkBetween = (a, b, opts = {}) => {
    if (!canLinkFlowAnchors(a, b)) return false;
    const toggle = !!(opts && opts.toggle);
    const link = { from: { rectId: a.rectId, rid: a.rid, cid: a.cid, kind: "end" }, to: { rectId: b.rectId, rid: b.rid, cid: b.cid, kind: "start" } };
    const key = flowLinkPairKey(link.from, link.to);
    const set = normalizeFlowLinks(st.flowLinks);
    const idx = set.findIndex(it => flowLinkKey(it) === key);
    if (idx >= 0) {
      if (!toggle) return false;
      set.splice(idx, 1);
    } else {
      set.push(link);
    }
    st.flowLinks = set;
    return true;
  };

  const distToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const ll = dx * dx + dy * dy;
    if (ll <= 1e-9) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ll));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    return Math.hypot(px - cx, py - cy);
  };

  const findFlowLinkAtPoint = (wx, wy) => {
    const segs = Array.isArray(st.flowLinkSegments) ? st.flowLinkSegments : [];
    const tol = Math.max(10, 16 / Math.max(0.2, st.zoom || 1));
    let best = null;
    let bestD = Infinity;
    for (const s of segs) {
      const d = distToSegment(wx, wy, s.a.x, s.a.y, s.b.x, s.b.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return (best && bestD <= tol) ? best : null;
  };
  const SHORT_ORTHOGONAL_SEGMENT = 6;
  const cleanOrthogonalPoints = pts => {
    const out = [];
    for (const p of (Array.isArray(pts) ? pts : [])) {
      const x = Math.round(Number(p && p.x) || 0);
      const y = Math.round(Number(p && p.y) || 0);
      const prev = out[out.length - 1];
      if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5) continue;
      out.push({ x, y });
    }
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5)
        || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) out.splice(i, 1);
    }
    return out;
  };
  const routeOrthogonalPoints = points => {
    const pts = cleanOrthogonalPoints(points);
    if (pts.length < 2) return pts;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      out.push(p0);
      if (Math.abs(p0.x - p1.x) >= 0.5 && Math.abs(p0.y - p1.y) >= 0.5) {
        out.push({ x: p1.x, y: p0.y });
      }
    }
    out.push(pts[pts.length - 1]);
    return cleanOrthogonalPoints(out);
  };
  const moveFlowLinkOrthogonalSegment = (drag, wx, wy) => {
    if (!drag || !drag.key) return false;
    const segmentIndex = Math.max(0, Math.round(Number(drag.segmentIndex) || 0));
    const base = routeOrthogonalPoints(drag.points);
    if (base.length < 2 || segmentIndex >= base.length - 1) return false;
    const a = base[segmentIndex];
    const b = base[segmentIndex + 1];
    const vertical = Math.abs(a.x - b.x) < 0.5;
    const horizontal = Math.abs(a.y - b.y) < 0.5;
    if (!vertical && !horizontal) return false;
    const lastIndex = base.length - 1;
    const startPoint = base[0];
    const endPoint = base[lastIndex];
    const next = base.slice();
    if (vertical) {
      const x = Math.round(Number(wx) || 0);
      const insertedStart = segmentIndex === 0;
      if (insertedStart) next.splice(1, 0, { x, y: startPoint.y });
      const insertedEnd = segmentIndex + 1 === lastIndex;
      if (insertedEnd) next.splice(next.length - 1, 0, { x, y: endPoint.y });
      const i0 = segmentIndex === 0 ? 1 : segmentIndex;
      const i1 = insertedEnd ? next.length - 2 : segmentIndex + 1 + (insertedStart ? 1 : 0);
      next[i0] = { x, y: next[i0].y };
      next[i1] = { x, y: next[i1].y };
    } else {
      const y = Math.round(Number(wy) || 0);
      const insertedStart = segmentIndex === 0;
      if (insertedStart) next.splice(1, 0, { x: startPoint.x, y });
      const insertedEnd = segmentIndex + 1 === lastIndex;
      if (insertedEnd) next.splice(next.length - 1, 0, { x: endPoint.x, y });
      const i0 = segmentIndex === 0 ? 1 : segmentIndex;
      const i1 = insertedEnd ? next.length - 2 : segmentIndex + 1 + (insertedStart ? 1 : 0);
      next[i0] = { x: next[i0].x, y };
      next[i1] = { x: next[i1].x, y };
    }
    const full = simplifyShortOrthogonalSegments(next);
    if (full.length < 2) return false;
    const list = normalizeFlowLinks(st.flowLinks);
    const idx = list.findIndex(it => flowLinkKey(it) === String(drag.key || ""));
    if (idx < 0) return false;
    const cur = list[idx];
    list[idx] = { ...cur, orthogonalPoints: full.slice(1, -1), controlPointCount: 2, controlOffsets: [] };
    st.flowLinks = list;
    return true;
  };
  const orthogonalConnector = (a, b, prefer = "xy") => {
    const ax = Number(a && a.x) || 0, ay = Number(a && a.y) || 0;
    const bx = Number(b && b.x) || 0, by = Number(b && b.y) || 0;
    if (Math.abs(ax - bx) < 0.5 || Math.abs(ay - by) < 0.5) return [{ x: ax, y: ay }, { x: bx, y: by }];
    const mid = prefer === "yx" ? { x: bx, y: ay } : { x: ax, y: by };
    return [{ x: ax, y: ay }, mid, { x: bx, y: by }];
  };
  const simplifyShortOrthogonalSegments = points => {
    let pts = routeOrthogonalPoints(points);
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 16) {
      changed = false;
      for (let i = 0; i < pts.length - 1; i++) {
        const len = Math.abs((Number(pts[i].x) || 0) - (Number(pts[i + 1].x) || 0))
          + Math.abs((Number(pts[i].y) || 0) - (Number(pts[i + 1].y) || 0));
        if (len <= 0.5 || len > SHORT_ORTHOGONAL_SEGMENT) continue;
        const leftIndex = Math.max(0, i - 1);
        const rightIndex = Math.min(pts.length - 1, i + 2);
        if (rightIndex <= leftIndex + 1) continue;
        const horizontal = Math.abs((Number(pts[i].y) || 0) - (Number(pts[i + 1].y) || 0)) < 0.5;
        const bridge = orthogonalConnector(pts[leftIndex], pts[rightIndex], horizontal ? "yx" : "xy");
        const next = routeOrthogonalPoints([
          ...pts.slice(0, leftIndex),
          ...bridge,
          ...pts.slice(rightIndex + 1)
        ]);
        if (next.length >= pts.length) continue;
        pts = next;
        changed = true;
        break;
      }
    }
    return routeOrthogonalPoints(pts);
  };
  const deleteFlowLinkOrthogonalSegment = hit => {
    if (!hit || !hit.key) return false;
    const segmentIndex = Math.max(0, Math.round(Number(hit.segmentIndex) || 0));
    const base = routeOrthogonalPoints(hit.points);
    const lastIndex = base.length - 1;
    if (base.length < 3 || segmentIndex >= lastIndex) return false;
    const leftIndex = Math.max(0, segmentIndex - 1);
    const rightIndex = Math.min(lastIndex, segmentIndex + 2);
    if (rightIndex <= leftIndex + 1) return false;
    const a = base[leftIndex];
    const b = base[rightIndex];
    const clicked = {
      a: base[segmentIndex],
      b: base[segmentIndex + 1]
    };
    const horizontal = Math.abs(clicked.a.y - clicked.b.y) < 0.5;
    const candidates = [
      orthogonalConnector(a, b, horizontal ? "yx" : "xy"),
      orthogonalConnector(a, b, horizontal ? "xy" : "yx")
    ];
    let best = null;
    for (const bridge of candidates) {
      const next = routeOrthogonalPoints([
        ...base.slice(0, leftIndex),
        ...bridge,
        ...base.slice(rightIndex + 1)
      ]);
      if (next.length >= base.length) continue;
      if (next.length < 2) continue;
      best = next;
      break;
    }
    if (!best) return false;
    best = simplifyShortOrthogonalSegments(best);
    const list = normalizeFlowLinks(st.flowLinks);
    const idx = list.findIndex(it => flowLinkKey(it) === String(hit.key || ""));
    if (idx < 0) return false;
    const cur = list[idx];
    list[idx] = { ...cur, orthogonalPoints: best.slice(1, -1), controlPointCount: 2, controlOffsets: [] };
    st.flowLinks = list;
    return true;
  };

  const findFlowLinkAnchorAtPoint = (wx, wy, kind = "") => {
    const pts = Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : [];
    const tol = Math.max(6, 9 / Math.max(0.35, st.zoom || 1));
    const kindNorm = String(kind || "").toLowerCase();
    let best = null;
    let bestD = Infinity;
    for (const p of pts) {
      if (kindNorm && String(p && p.kind || "").toLowerCase() !== kindNorm) continue;
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return (best && bestD <= tol) ? best : null;
  };

  const findFlowCurveHandleAtPoint = (wx, wy) => {
    const pts = Array.isArray(st.flowLinkCurveHandles) ? st.flowLinkCurveHandles : [];
    const tol = Math.max(7, 11 / Math.max(0.35, st.zoom || 1));
    const pri = p => {
      const h = String(p && p.handle || "");
      if (/^p\d+$/.test(h)) return 2; // control point: lower priority
      return 1; // anchors
    };
    let best = null;
    let bestD = Infinity;
    let bestPri = Infinity;
    for (const p of pts) {
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      const pPri = pri(p);
      if (d > tol) continue;
      if (pPri < bestPri || (pPri === bestPri && d < bestD)) {
        best = p;
        bestD = d;
        bestPri = pPri;
      }
    }
    return best || null;
  };

  const setFlowLinkManualBezierPoint = (key, handle, x, y, fallback = null) => {
    const targetKey = String(key || "");
    if (!targetKey) return false;
    const hRaw = String(handle || "");
    const isPointHandle = /^p\d+$/.test(hRaw);
    const segHandleMatch = hRaw.match(/^q(\d+)(c1|c2)$/i);
    const pointBendHandleMatch = hRaw.match(/^p(\d+)bend$/i);
    const pointDirHandleMatch = hRaw.match(/^p(\d+)(in|out)$/i);
    const isBendHandle = /^b\d+$/.test(hRaw);
    const h = hRaw === "c2" ? "c2" : "c1";
    const nx = Number(x);
    const ny = Number(y);
    if (!(Number.isFinite(nx) && Number.isFinite(ny))) return false;
    const list = normalizeFlowLinks(st.flowLinks);
    const idx = list.findIndex(it => flowLinkKey(it) === targetKey);
    if (idx < 0) return false;
    const cur = list[idx];
    const snapshot = Array.isArray(fallback && fallback.segmentRelSnapshot) ? fallback.segmentRelSnapshot : [];
    const buildSegmentRelState = (segCount, curSegRel) => {
      const old = Array.isArray(curSegRel) ? curSegRel : [];
      const out = [];
      for (let i = 0; i < segCount; i++) {
        const src = old[i] && typeof old[i] === "object" ? old[i] : (snapshot[i] && typeof snapshot[i] === "object" ? snapshot[i] : {});
        const c1 = src.c1 && typeof src.c1 === "object" ? src.c1 : { x: 0, y: 0 };
        const c2 = src.c2 && typeof src.c2 === "object" ? src.c2 : { x: 0, y: 0 };
        out.push({
          c1: { x: Number(c1.x) || 0, y: Number(c1.y) || 0 },
          c2: { x: Number(c2.x) || 0, y: Number(c2.y) || 0 }
        });
      }
      return out;
    };
    if (pointBendHandleMatch) {
      const pointIndex = Math.max(1, Math.round(Number(pointBendHandleMatch[1]) || 1));
      const pointCount = Math.max(2, Math.round(Number(fallback && fallback.pointCount) || Number(cur && cur.controlPointCount) || 2));
      const segCount = Math.max(1, pointCount - 1);
      if (pointIndex <= 0 || pointIndex >= pointCount) return false;
      const ax = Number(fallback && fallback.anchor && fallback.anchor.x);
      const ay = Number(fallback && fallback.anchor && fallback.anchor.y);
      if (!(Number.isFinite(ax) && Number.isFinite(ay))) return false;
      const vx = nx - ax;
      const vy = ny - ay;
      const nextSeg = buildSegmentRelState(segCount, cur && cur.segmentBezierRel);
      const prevIdx = pointIndex - 1;
      const nextIdx = pointIndex;
      if (nextIdx >= 0 && nextIdx < segCount) nextSeg[nextIdx].c1 = { x: vx, y: vy };
      if (prevIdx >= 0 && prevIdx < segCount) nextSeg[prevIdx].c2 = { x: -vx, y: -vy };
      const nextLink = { ...cur, controlPointCount: pointCount, segmentBezierRel: nextSeg };
      try { delete nextLink.orthogonalPoints; } catch (_e) { nextLink.orthogonalPoints = null; }
      list[idx] = nextLink;
      st.flowLinks = list;
      return true;
    }
    if (pointDirHandleMatch) {
      const pointIndex = Math.max(1, Math.round(Number(pointDirHandleMatch[1]) || 1));
      const dir = String(pointDirHandleMatch[2] || "in").toLowerCase();
      const pointCount = Math.max(2, Math.round(Number(fallback && fallback.pointCount) || Number(cur && cur.controlPointCount) || 2));
      const segCount = Math.max(1, pointCount - 1);
      const segIndex = dir === "in" ? pointIndex - 1 : pointIndex;
      const role = dir === "in" ? "c2" : "c1";
      if (segIndex < 0 || segIndex >= segCount) return false;
      const ax = Number(fallback && fallback.anchor && fallback.anchor.x);
      const ay = Number(fallback && fallback.anchor && fallback.anchor.y);
      if (!(Number.isFinite(ax) && Number.isFinite(ay))) return false;
      const nextSeg = buildSegmentRelState(segCount, cur && cur.segmentBezierRel);
      nextSeg[segIndex][role] = { x: nx - ax, y: ny - ay };
      const nextLink = { ...cur, controlPointCount: pointCount, segmentBezierRel: nextSeg };
      try { delete nextLink.orthogonalPoints; } catch (_e) { nextLink.orthogonalPoints = null; }
      list[idx] = nextLink;
      st.flowLinks = list;
      return true;
    }
    if (segHandleMatch) {
      const segIndex = Math.max(0, Math.round(Number(segHandleMatch[1]) || 1) - 1);
      const role = String(segHandleMatch[2] || "c1").toLowerCase() === "c2" ? "c2" : "c1";
      const pointCount = Math.max(2, Math.round(Number(fallback && fallback.pointCount) || Number(cur && cur.controlPointCount) || 2));
      const segCount = Math.max(1, pointCount - 1);
      if (segIndex >= segCount) return false;
      const ax = Number(fallback && fallback.anchor && fallback.anchor.x);
      const ay = Number(fallback && fallback.anchor && fallback.anchor.y);
      if (!(Number.isFinite(ax) && Number.isFinite(ay))) return false;
      const old = Array.isArray(cur && cur.segmentBezierRel) ? cur.segmentBezierRel : [];
      const nextSeg = [];
      for (let i = 0; i < segCount; i++) {
        const src = old[i] && typeof old[i] === "object" ? old[i] : {};
        const c1 = src.c1 && typeof src.c1 === "object" ? src.c1 : { x: 0, y: 0 };
        const c2 = src.c2 && typeof src.c2 === "object" ? src.c2 : { x: 0, y: 0 };
        nextSeg.push({
          c1: { x: Number(c1.x) || 0, y: Number(c1.y) || 0 },
          c2: { x: Number(c2.x) || 0, y: Number(c2.y) || 0 }
        });
      }
      nextSeg[segIndex][role] = { x: nx - ax, y: ny - ay };
      const nextLink = { ...cur, controlPointCount: pointCount, segmentBezierRel: nextSeg };
      try { delete nextLink.orthogonalPoints; } catch (_e) { nextLink.orthogonalPoints = null; }
      list[idx] = nextLink;
      st.flowLinks = list;
      return true;
    }
    if (isBendHandle) {
      const segIndex = Math.max(0, Math.round(Number(hRaw.slice(1)) || 1) - 1);
      const pointCount = Math.max(2, Math.min(6, Math.round(Number(fallback && fallback.pointCount) || Number(cur && cur.controlPointCount) || 2)));
      const segCount = Math.max(1, pointCount - 1);
      if (segIndex >= segCount) return false;
      const old = Array.isArray(cur && cur.bendOffsets) ? cur.bendOffsets : [];
      const nextOffsets = [];
      for (let i = 0; i < segCount; i++) {
        const src = old[i] && typeof old[i] === "object" ? old[i] : { x: 0, y: 0 };
        nextOffsets.push({ x: Number(src.x) || 0, y: Number(src.y) || 0 });
      }
      const ax = Number(fallback && fallback.ax);
      const ay = Number(fallback && fallback.ay);
      if (!(Number.isFinite(ax) && Number.isFinite(ay))) return false;
      nextOffsets[segIndex] = { x: nx - ax, y: ny - ay };
      const nextLink = { ...cur, controlPointCount: pointCount, bendOffsets: nextOffsets };
      try { delete nextLink.orthogonalPoints; } catch (_e) { nextLink.orthogonalPoints = null; }
      list[idx] = nextLink;
      st.flowLinks = list;
      return true;
    }
    if (isPointHandle) {
      const pointIndex = Math.max(1, Math.round(Number(hRaw.slice(1)) || 1));
      const pointCount = Math.max(2, Math.min(6, Math.round(Number(fallback && fallback.pointCount) || Number(cur && cur.controlPointCount) || 2)));
      const start = fallback && fallback.start && typeof fallback.start === "object" ? fallback.start : null;
      const end = fallback && fallback.end && typeof fallback.end === "object" ? fallback.end : null;
      if (!start || !end || pointIndex >= pointCount) return false;
      const t = pointIndex / (pointCount - 1);
      const bx = (Number(start.x) || 0) + ((Number(end.x) || 0) - (Number(start.x) || 0)) * t;
      const by = (Number(start.y) || 0) + ((Number(end.y) || 0) - (Number(start.y) || 0)) * t;
      const old = Array.isArray(cur && cur.controlOffsets) ? cur.controlOffsets : [];
      const nextOffsets = [];
      for (let i = 0; i < Math.max(0, pointCount - 2); i++) {
        const src = old[i] && typeof old[i] === "object" ? old[i] : { x: 0, y: 0 };
        nextOffsets.push({ x: Number(src.x) || 0, y: Number(src.y) || 0 });
      }
      const idxOff = pointIndex - 1;
      if (idxOff >= 0 && idxOff < nextOffsets.length) {
        nextOffsets[idxOff] = { x: nx - bx, y: ny - by };
      }
      const nextLink = { ...cur, controlPointCount: pointCount, controlOffsets: nextOffsets };
      try { delete nextLink.orthogonalPoints; } catch (_e) { nextLink.orthogonalPoints = null; }
      list[idx] = nextLink;
      st.flowLinks = list;
      return true;
    }
    if (hRaw === "c1" || hRaw === "c2") {
      const pointCount = Math.max(2, Math.round(Number(fallback && fallback.pointCount) || Number(cur && cur.controlPointCount) || 2));
      if (pointCount > 2) {
        const segCount = Math.max(1, pointCount - 1);
        const nextSeg = buildSegmentRelState(segCount, cur && cur.segmentBezierRel);
        if (hRaw === "c1") {
          const ax = Number(fallback && fallback.start && fallback.start.x);
          const ay = Number(fallback && fallback.start && fallback.start.y);
          if (!(Number.isFinite(ax) && Number.isFinite(ay))) return false;
          nextSeg[0].c1 = { x: nx - ax, y: ny - ay };
        } else {
          const ax = Number(fallback && fallback.end && fallback.end.x);
          const ay = Number(fallback && fallback.end && fallback.end.y);
          if (!(Number.isFinite(ax) && Number.isFinite(ay))) return false;
          nextSeg[segCount - 1].c2 = { x: nx - ax, y: ny - ay };
        }
        const nextLink = { ...cur, controlPointCount: pointCount, segmentBezierRel: nextSeg };
        try { delete nextLink.orthogonalPoints; } catch (_e) { nextLink.orthogonalPoints = null; }
        list[idx] = nextLink;
        st.flowLinks = list;
        return true;
      }
    }
    const fb = (fallback && typeof fallback === "object") ? fallback : {};
    const anchorStart = fb.start && typeof fb.start === "object" ? fb.start : null;
    const anchorEnd = fb.end && typeof fb.end === "object" ? fb.end : null;
    const c1AbsFallback = fb.c1 && typeof fb.c1 === "object" ? fb.c1 : null;
    const c2AbsFallback = fb.c2 && typeof fb.c2 === "object" ? fb.c2 : null;
    const curRel = (cur && cur.manualBezierRel && cur.manualBezierRel.c1 && cur.manualBezierRel.c2) ? cur.manualBezierRel : null;
    const curAbs = (cur && cur.manualBezier && cur.manualBezier.c1 && cur.manualBezier.c2) ? cur.manualBezier : null;
    const c1Abs = curAbs ? curAbs.c1 : c1AbsFallback || { x: nx, y: ny };
    const c2Abs = curAbs ? curAbs.c2 : c2AbsFallback || { x: nx, y: ny };
    const c1Rel = curRel ? curRel.c1 : ((anchorStart && Number.isFinite(Number(anchorStart.x)) && Number.isFinite(Number(anchorStart.y)))
      ? { x: (Number(c1Abs.x) || 0) - (Number(anchorStart.x) || 0), y: (Number(c1Abs.y) || 0) - (Number(anchorStart.y) || 0) }
      : { x: 0, y: 0 });
    const c2Rel = curRel ? curRel.c2 : ((anchorEnd && Number.isFinite(Number(anchorEnd.x)) && Number.isFinite(Number(anchorEnd.y)))
      ? { x: (Number(c2Abs.x) || 0) - (Number(anchorEnd.x) || 0), y: (Number(c2Abs.y) || 0) - (Number(anchorEnd.y) || 0) }
      : { x: 0, y: 0 });
    const next = {
      ...cur,
      from: cur.from,
      to: cur.to,
      manualBezierRel: { c1: { x: Number(c1Rel.x) || 0, y: Number(c1Rel.y) || 0 }, c2: { x: Number(c2Rel.x) || 0, y: Number(c2Rel.y) || 0 } }
    };
    if (h === "c1") {
      if (anchorStart && Number.isFinite(Number(anchorStart.x)) && Number.isFinite(Number(anchorStart.y))) next.manualBezierRel.c1 = { x: nx - Number(anchorStart.x), y: ny - Number(anchorStart.y) };
    } else if (anchorEnd && Number.isFinite(Number(anchorEnd.x)) && Number.isFinite(Number(anchorEnd.y))) {
      next.manualBezierRel.c2 = { x: nx - Number(anchorEnd.x), y: ny - Number(anchorEnd.y) };
    }
    try { delete next.orthogonalPoints; } catch (_e) { next.orthogonalPoints = null; }
    list[idx] = next;
    st.flowLinks = list;
    return true;
  };

  const clearFlowLinkManualBezier = key => {
    const targetKey = String(key || "");
    if (!targetKey) return false;
    const list = normalizeFlowLinks(st.flowLinks);
    const idx = list.findIndex(it => flowLinkKey(it) === targetKey);
    if (idx < 0) return false;
    const cur = list[idx];
    if (!cur || (!cur.manualBezier && !cur.manualBezierRel && !cur.orthogonalPoints)) return false;
    const next = {
      ...cur,
      from: cur.from,
      to: cur.to,
      manualBezierRel: { c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } }
    };
    try { delete next.orthogonalPoints; } catch (_e) { next.orthogonalPoints = null; }
    list[idx] = next;
    st.flowLinks = list;
    return true;
  };

  const updateFlowLinkDragTarget = (wx, wy) => {
    const drag = st.flowLinkDrag;
    if (!drag || !drag.from) return;
    drag.x = wx;
    drag.y = wy;
    const target = findFlowLinkAnchorAtPoint(wx, wy, "start");
    drag.target = target || null;
    if (!target) {
      drag.canLink = false;
      drag._lastCanLinkSig = "";
      drag._lastCanLink = false;
      return;
    }
    const sig = [
      flowAnchorKey(drag.from),
      flowAnchorKey(target),
      Array.isArray(st.flowLinks) ? st.flowLinks.length : 0,
      Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors.length : 0,
      Array.isArray(st.rects) ? st.rects.length : 0
    ].join("|");
    if (sig === drag._lastCanLinkSig) {
      drag.canLink = !!drag._lastCanLink;
      return;
    }
    const can = !!canLinkFlowAnchors(drag.from, target);
    drag._lastCanLinkSig = sig;
    drag._lastCanLink = can;
    drag.canLink = can;
  };

  return {
    pruneFlowLinks,
    canLinkFlowAnchors,
    toggleFlowLinkBetween,
    addFlowLinkBetween,
    findFlowLinkAtPoint,
    findFlowLinkAnchorAtPoint,
    findFlowCurveHandleAtPoint,
    setFlowLinkManualBezierPoint,
    moveFlowLinkOrthogonalSegment,
    deleteFlowLinkOrthogonalSegment,
    clearFlowLinkManualBezier,
    updateFlowLinkDragTarget
  };
};
