export function setupFlowAnchorPointsController(deps = {}) {
  const {
    st,
    rectUVToWorld,
    getFlowStartRoutingRegion,
    FLOW_DIR_SET
  } = deps;

  const getSplitFlowMarkerOffset = longSide => {
    const ls = Math.max(8, Number(longSide) || 0);
    return Math.max(6, Math.min(36, ls * 0.25));
  };

  const getSplitFlowMarkerWorldPositions = (r, pts) => {
    const list = Array.isArray(pts) ? pts : [];
    if (!r || list.length < 1) return null;
    const s = list[0], e = list[list.length - 1];
    const su = +s.u || 0, sv = +s.v || 0, eu = +e.u || 0, ev = +e.v || 0;
    const scid = Math.max(0, Math.round(Number(s && s.cid) || 0));
    const ecid = Math.max(0, Math.round(Number(e && e.cid) || 0));
    if (scid !== ecid) return null;
    if (Math.hypot(su - eu, sv - ev) > 1e-6) return null;
    const bw = Math.max(8, Number((s && s.bw) || (e && e.bw) || 0));
    const bh = Math.max(8, Number((s && s.bh) || (e && e.bh) || 0));
    if (!(bw > 0 && bh > 0)) return null;
    const singleCabRegion = (Math.max(1, Math.round(Number(s && s.spanCols) || 1)) === 1)
      && (Math.max(1, Math.round(Number(s && s.spanRows) || 1)) === 1);
    let su2 = su, sv2 = sv, eu2 = eu, ev2 = ev;
    if (bw >= bh) {
      const off = getSplitFlowMarkerOffset(bw, singleCabRegion);
      su2 = su - off;
      eu2 = eu + off;
    } else {
      const off = getSplitFlowMarkerOffset(bh, singleCabRegion);
      sv2 = sv - off;
      ev2 = ev + off;
    }
    const sw = rectUVToWorld(r, su2, sv2);
    const ew = rectUVToWorld(r, eu2, ev2);
    return { start: { x: sw.x, y: sw.y }, end: { x: ew.x, y: ew.y } };
  };

  const collectFlowLinkAnchors = (r, groups) => {
    if (!r || !Array.isArray(groups)) return;
    const seen = new Set();
    for (const g of groups) {
      const rid = Math.max(0, Math.round(Number(g && g.rid) || 0));
      const pts = Array.isArray(g && g.points) ? g.points : [];
      if (!pts.length) continue;
      const split = getSplitFlowMarkerWorldPositions(r, pts);
      const s0 = pts[0];
      const su = +s0.u || 0;
      const sv = +s0.v || 0;
      const scid = Math.max(0, Math.round(Number(s0 && s0.cid) || 0));
      const sw0 = rectUVToWorld(r, su, sv);
      const sw = split && split.start ? split.start : sw0;
      const sk = `${rid}:${scid}:start`;
      if (!seen.has(sk)) {
        seen.add(sk);
        st.flowLinkAnchors.push({ rectId: r.id, rid, cid: scid, kind: "start", x: sw.x, y: sw.y });
      }
      const e0 = pts[pts.length - 1];
      const eu = +e0.u || 0;
      const ev = +e0.v || 0;
      const ecid = Math.max(0, Math.round(Number(e0 && e0.cid) || 0));
      const ew0 = rectUVToWorld(r, eu, ev);
      const ew = split && split.end ? split.end : ew0;
      const ek = `${rid}:${ecid}:end`;
      if (!seen.has(ek)) {
        seen.add(ek);
        st.flowLinkAnchors.push({ rectId: r.id, rid, cid: ecid, kind: "end", x: ew.x, y: ew.y });
      }
    }
  };

  const collectFlowEditPoints = (r, groups) => {
    if (!r || !Array.isArray(groups)) return;
    for (const g of groups) {
      const rid = Math.max(0, Math.round(Number(g && g.rid) || 0));
      const pts = Array.isArray(g && g.points) ? g.points : [];
      if (pts.length) {
        const p0 = pts[0];
        const singleCabRegion = (pts.length === 1)
          && (Math.max(1, Math.round(Number(p0 && p0.spanCols) || 1)) === 1)
          && (Math.max(1, Math.round(Number(p0 && p0.spanRows) || 1)) === 1);
        if (singleCabRegion) continue;
      }
      const split = getSplitFlowMarkerWorldPositions(r, pts);
      if (pts.length) {
        const s0 = pts[0];
        const su = +s0.u || 0;
        const sv = +s0.v || 0;
        const scid = Math.max(0, Math.round(Number(s0 && s0.cid) || 0));
        const sw0 = rectUVToWorld(r, su, sv);
        const sw = split && split.start ? split.start : sw0;
        st.flowStartHandles.push({
          rectId: r.id,
          rid,
          cid: scid,
          u: su,
          v: sv,
          x: sw.x,
          y: sw.y,
          zFallback: !!(g && g.zFallback)
        });
        const cfg = getFlowStartRoutingRegion(r, rid);
        const dir = String(cfg && cfg.startDir || "").toLowerCase();
        const dirDefs = [
          { dir: "left", du: -28, dv: 0, label: "◀" },
          { dir: "right", du: 28, dv: 0, label: "▶" },
          { dir: "up", du: 0, dv: -28, label: "▲" },
          { dir: "down", du: 0, dv: 28, label: "▼" }
        ];
        for (const d of dirDefs) {
          const wp = rectUVToWorld(r, su + d.du, sv + d.dv);
          st.flowDirButtons.push({
            rectId: r.id,
            rid,
            cid: scid,
            dir: d.dir,
            label: d.label,
            u: su + d.du,
            v: sv + d.dv,
            x: wp.x,
            y: wp.y,
            active: (FLOW_DIR_SET.has(dir) && dir === d.dir)
          });
        }
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const u = +p.u || 0;
        const v = +p.v || 0;
        const cid = Math.max(0, Math.round(Number(p && p.cid) || 0));
        const wp0 = rectUVToWorld(r, u, v);
        const wp = (split && i === 0 && split.start)
          ? split.start
          : ((split && i === pts.length - 1 && split.end) ? split.end : wp0);
        st.flowEditPoints.push({ rectId: r.id, rid, index: i, cid, u, v, x: wp.x, y: wp.y });
      }
    }
  };

  return {
    getSplitFlowMarkerOffset,
    getSplitFlowMarkerWorldPositions,
    collectFlowLinkAnchors,
    collectFlowEditPoints
  };
}
