import { drawCanvasUiButton } from "../render/canvas-ui.js";

export const setupRigRenderController = (deps = {}) => {
  const {
    st,
    getRectRigData,
    buildRigLayout,
    resolveRigFrameSeam,
    drawLoadIcon,
    fontFamilyCss,
    isRigEditMode,
    rectUVToWorld,
    RIG_DEFAULT_LOAD_KG
  } = deps;

  const drawRigOnRect = (c, r, w, h, cx, cy, topo, hs, z, sel) => {
    const rig = getRectRigData(r), layout = buildRigLayout(r, cx, cy, topo, hs, z), ui = layout.ui, loadSize = layout.loadSizePx, frames = new Set(Array.isArray(rig.frames) ? rig.frames : []), loads = (rig && rig.loads && typeof rig.loads === "object") ? rig.loads : {};
    c.save();
    const frameW = 4.5 * 2, hover = st.rigHover && st.rigHover.rectId === r.id ? st.rigHover : null;
    const drawnSeams = new Set();
    const isFrameDeleteHover = seam => {
      if (!hover || hover.type !== "frame") return false;
      const hs = resolveRigFrameSeam(layout, cy, String(hover.key || ""));
      return !!(hs && seam && hs.key === seam.key);
    };
    const isLoadDeleteHover = (key, kg) => {
      if (!hover || String(hover.key || "") !== String(key || "")) return false;
      if (hover.type === "loadToggle") return true;
      if (hover.type === "loadMinus" && Math.max(5, Math.round(Number(kg) || RIG_DEFAULT_LOAD_KG)) <= 5) return true;
      return false;
    };
    for (const key of frames) {
      const seam = resolveRigFrameSeam(layout, cy, String(key || ""));
      if (!seam) continue;
      if (drawnSeams.has(seam.key)) continue;
      drawnSeams.add(seam.key);
      const dangerDelete = isFrameDeleteHover(seam);
      c.save();
      c.globalAlpha = 1;

      const fx = seam.x - frameW / 2;
      const fy = seam.y0 + 0.6;
      const fh = Math.max(1, seam.y1 - seam.y0 - 1.2) * 0.99;

      c.save();
      c.beginPath();
      c.rect(fx, fy, frameW, fh);
      c.clip();

      c.fillStyle = dangerDelete ? "#d64646" : "#f2c200";
      c.fillRect(fx, fy, frameW, fh);

      c.strokeStyle = dangerDelete ? "#330808" : "#111";
      c.lineWidth = Math.max(3, 3.2 * ui);

      const stripeGap = Math.max(6, 6 * ui);
      for (let yy = fy - frameW; yy < fy + fh + frameW; yy += stripeGap) {
        c.beginPath();
        c.moveTo(fx - frameW, yy);
        c.lineTo(fx + frameW * 2, yy - frameW * 2);
        c.stroke();
      }

      c.restore();

      c.strokeStyle = dangerDelete ? "rgba(95,10,10,.96)" : "rgba(8,12,18,.96)";
      c.lineWidth = Math.max(1.5, 2.2 * ui);
      c.strokeRect(fx - .5, fy - .5, frameW + 1, fh + 1);

      c.strokeStyle = dangerDelete ? "rgba(255,220,220,.96)" : "rgba(255,255,255,.9)";
      c.lineWidth = Math.max(.9, 1.3 * ui);
      c.strokeRect(fx - .5, fy - .5, frameW + 1, fh + 1);
      c.restore();
    }
    for (const [key, wk] of Object.entries(loads)) {
      const seam = layout.bottomLoads.get(String(key || ""));
      if (!seam) continue;
      const kg = Math.max(5, Math.round(Number(wk) || RIG_DEFAULT_LOAD_KG)), x = seam.x, y = seam.yBottom - loadSize * 0.5, bodyR = loadSize * 0.32, btnR = 8 * ui, btnDx = bodyR + Math.max(10 * ui, loadSize * 0.22);
      const dangerDelete = isLoadDeleteHover(key, kg);
      c.save();
      c.globalAlpha = 1;
      drawLoadIcon(c, x, y, Math.max(14, loadSize), { fill: dangerDelete ? "rgba(130,18,18,.96)" : "rgba(16,20,28,.94)", stroke: dangerDelete ? "rgba(255,180,180,.95)" : "rgba(255,255,255,.86)", lineWidth: 1.25, alpha: 1 });
      c.fillStyle = "rgba(255,255,255,.98)"; c.font = `${Math.max(6.8, Math.min(loadSize * 0.45, 18))}px ${fontFamilyCss(st.fontFamily)}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(`${kg}`, x, y + Math.max(7, loadSize * 0.2));
      if (isRigEditMode() && sel) {
        const drawBtn = (bx, sym) => {
          drawCanvasUiButton(c, { x: bx - btnR, y: y - btnR, size: btnR * 2, z: 1, active: dangerDelete, hover: dangerDelete, danger: dangerDelete, icon: "" });
          c.strokeStyle = "rgba(255,255,255,.95)";
          c.lineWidth = Math.max(1.2, 1.6 * ui);
          c.lineCap = "round";
          const arm = Math.max(3.6, btnR * 0.45);
          c.beginPath();
          c.moveTo(bx - arm, y);
          c.lineTo(bx + arm, y);
          if (sym === "+") {
            c.moveTo(bx, y - arm);
            c.lineTo(bx, y + arm);
          }
          c.stroke();
        };
        drawBtn(x - btnDx, "-");
        drawBtn(x + btnDx, "+");
      }
      c.restore();
    }
    if (isRigEditMode() && sel && hover) {
      c.strokeStyle = "rgba(255,224,138,.97)";
      c.lineWidth = Math.max(1.6, 2.4 * ui);
      c.setLineDash([5 * ui, 3 * ui]);
      if (hover.type === "frame") {
        const seam = resolveRigFrameSeam(layout, cy, String(hover.key || ""));
        if (seam) {
          const fx = seam.x - frameW / 2, fy = seam.y0 + 0.6, fh = Math.max(1, seam.y1 - seam.y0 - 1.2) * 0.99;
          c.strokeRect(fx - 1, fy - 1, frameW + 2, fh + 2);
        }
      } else if (hover.type === "loadToggle") {
        const seam = layout.bottomLoads.get(String(hover.key || ""));
        if (seam) {
          const x = seam.x, y = seam.yBottom - loadSize * 0.5;
          c.setLineDash([24 * ui, 16 * ui]);
          drawLoadIcon(c, x, y, Math.max(14, loadSize), { stroke: "rgba(255,224,138,.98)", lineWidth: 2.2, fill: null, alpha: 1 });
          c.setLineDash([5 * ui, 3 * ui]);
        }
      } else if (hover.type !== "suspend" && hover.type !== "suspendLink") {
        const hx = hover.x, hy = hover.y;
        if (Number.isFinite(hx) && Number.isFinite(hy)) { c.beginPath(); c.arc(hx, hy, 8 * ui, 0, Math.PI * 2); c.stroke(); }
      }
      c.setLineDash([]);
    }
    c.restore();
  };

  const drawRigOutsideOverlay = (c, r, cx, cy, topo, hs, z, sel) => {
    const rig = getRectRigData(r), layout = buildRigLayout(r, cx, cy, topo, hs, z), ui = layout.ui, scalePx = Math.max(1, Number(r && r.scale) || 256), suspendH = Math.max(10, 0.1 * scalePx), ringD = Math.max(8, 0.1 * scalePx), suspends = (Array.isArray(rig.suspends) ? rig.suspends : []).filter(col => layout.anchors.has(col)).sort((a, b) => a - b), links = new Set(Array.isArray(rig.suspendLinks) ? rig.suspendLinks : []);
    const invZoom = 1 / Math.max(0.01, Number(z) || 1);
    const showAnchorHints = false;
    if (!suspends.length && !showAnchorHints && !(isRigEditMode() && sel && st.rigHover && st.rigHover.rectId === r.id && (st.rigHover.type === "suspend" || st.rigHover.type === "suspendLink"))) return;
    const localToWorld = (lx, ly) => rectUVToWorld(r, lx + layout.w / 2, ly + layout.h / 2);
    const drawSuspendUPath = (xMid, yTop, size) => {
      const half = Math.max(2, size * 0.5), leg = half * 0.5, joinY = yTop, cy = joinY - leg, steps = 16;
      c.beginPath();
      const p0 = localToWorld(xMid - half, joinY);
      c.moveTo(p0.x, p0.y);
      const p1 = localToWorld(xMid - half, cy);
      c.lineTo(p1.x, p1.y);
      for (let i = 0; i <= steps; i++) {
        const t = Math.PI - (Math.PI * i / steps), lx = xMid + Math.cos(t) * half, ly = cy - Math.sin(t) * half, p = localToWorld(lx, ly);
        c.lineTo(p.x, p.y);
      }
      const p2 = localToWorld(xMid + half, joinY);
      c.lineTo(p2.x, p2.y);
    };
    const drawSuspendU = (xMid, yTop, danger = false) => {
      drawSuspendUPath(xMid, yTop, ringD);
      c.strokeStyle = danger ? "rgba(160,24,24,.98)" : "rgba(22,27,34,.97)";
      c.lineWidth = Math.max(1, ringD * 0.24);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke();
      drawSuspendUPath(xMid, yTop, ringD);
      c.strokeStyle = danger ? "rgba(255,210,210,.95)" : "rgba(255,255,255,.84)";
      c.lineWidth = Math.max(1, 1.1 * invZoom);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke();
    };
    const strokeSuspendBodyPath = (tl, tr, br, bl, danger = false) => {
      c.beginPath();
      c.moveTo(tl.x, tl.y);
      c.lineTo(tr.x, tr.y);
      c.lineTo(br.x, br.y);
      c.lineTo(bl.x, bl.y);
      c.closePath();
      c.strokeStyle = danger ? "rgba(160,24,24,.98)" : "rgba(22,27,34,.97)";
      c.lineWidth = Math.max(1, ringD * 0.24);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke();
      c.beginPath();
      c.moveTo(tl.x, tl.y);
      c.lineTo(tr.x, tr.y);
      c.lineTo(br.x, br.y);
      c.lineTo(bl.x, bl.y);
      c.closePath();
      c.strokeStyle = danger ? "rgba(255,210,210,.95)" : "rgba(255,255,255,.84)";
      c.lineWidth = Math.max(1, 1.1 * invZoom);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke();
    };
    const hover = isRigEditMode() && sel && st.rigHover && st.rigHover.rectId === r.id ? st.rigHover : null;
    const hoveredSuspendCol = hover && hover.type === "suspend" ? Math.max(0, Math.round(Number(hover.col) || 0)) : -1;
    const hoveredLink = hover && hover.type === "suspendLink"
      ? { a: Math.min(hover.a, hover.b), b: Math.max(hover.a, hover.b), key: `${Math.min(hover.a, hover.b)}-${Math.max(hover.a, hover.b)}` }
      : null;
    c.save();
    if (suspends.length) {
      const visited = new Set();
      c.strokeStyle = "rgba(22,27,34,.95)";
      c.lineWidth = Math.max(1, 1.2) * invZoom;
      c.lineCap = "round";
      for (const col of suspends) {
        if (visited.has(col)) continue;
        let start = col, end = col;
        visited.add(col);
        while (links.has(`${end}-${end + 1}`) && suspends.includes(end + 1)) { end++; visited.add(end); }
        const ap = layout.anchors.get(start), bp = layout.anchors.get(end);
        if (!ap || !bp) continue;
        const chainDeletesByHoverLink = !!(hoveredLink && hoveredLink.a >= start && hoveredLink.b <= end && links.has(hoveredLink.key));
        const dangerDelete = false;
        const hoveredSuspendInChain = (!dangerDelete && hoveredSuspendCol >= start && hoveredSuspendCol <= end && suspends.includes(hoveredSuspendCol)) ? hoveredSuspendCol : -1;
        c.save();
        c.globalAlpha = 1;
        const aW = Math.max(1, ap.x1 - ap.x0), bW = Math.max(1, bp.x1 - bp.x0), x1 = ap.x0 + aW * 0.05, x2 = bp.x1 - bW * 0.05, yTop = Math.min(ap.y, bp.y) - 2 - suspendH, tl = localToWorld(x1, yTop), tr = localToWorld(x2, yTop), bl = localToWorld(x1, yTop + suspendH), br = localToWorld(x2, yTop + suspendH);
        for (let colRing = start; colRing <= end; colRing++) {
          const apRing = layout.anchors.get(colRing);
          if (!apRing) continue;
          const dangerRing = dangerDelete || (colRing === hoveredSuspendInChain);
          drawSuspendU(apRing.x, yTop, dangerRing);
        }
        c.fillStyle = dangerDelete ? "rgba(130,18,18,.96)" : "rgba(22,27,34,.96)"; c.beginPath(); c.moveTo(tl.x, tl.y); c.lineTo(tr.x, tr.y); c.lineTo(br.x, br.y); c.lineTo(bl.x, bl.y); c.closePath(); c.fill();
        strokeSuspendBodyPath(tl, tr, br, bl, dangerDelete);
        if (chainDeletesByHoverLink && hoveredLink) {
          const la = layout.anchors.get(hoveredLink.a), lb = layout.anchors.get(hoveredLink.b);
          if (la && lb) {
            const laW = Math.max(1, la.x1 - la.x0), lbW = Math.max(1, lb.x1 - lb.x0), lx1 = la.x1 - laW * 0.05, lx2 = lb.x0 + lbW * 0.05;
            if (lx2 > lx1) {
              const ltl = localToWorld(lx1, yTop), ltr = localToWorld(lx2, yTop), lbl = localToWorld(lx1, yTop + suspendH), lbr = localToWorld(lx2, yTop + suspendH);
              c.fillStyle = "rgba(130,18,18,.96)";
              c.beginPath();
              c.moveTo(ltl.x, ltl.y);
              c.lineTo(ltr.x, ltr.y);
              c.lineTo(lbr.x, lbr.y);
              c.lineTo(lbl.x, lbl.y);
              c.closePath();
              c.fill();
              strokeSuspendBodyPath(ltl, ltr, lbr, lbl, true);
            }
          }
        }
        if (hoveredSuspendInChain >= 0) {
          const hp = layout.anchors.get(hoveredSuspendInChain);
          if (hp) {
            const hW = Math.max(1, hp.x1 - hp.x0), hx1 = hp.x0 + hW * 0.05, hx2 = hp.x1 - hW * 0.05, htl = localToWorld(hx1, yTop), htr = localToWorld(hx2, yTop), hbl = localToWorld(hx1, yTop + suspendH), hbr = localToWorld(hx2, yTop + suspendH);
            c.fillStyle = "rgba(130,18,18,.96)";
            c.beginPath();
            c.moveTo(htl.x, htl.y);
            c.lineTo(htr.x, htr.y);
            c.lineTo(hbr.x, hbr.y);
            c.lineTo(hbl.x, hbl.y);
            c.closePath();
            c.fill();
            strokeSuspendBodyPath(htl, htr, hbr, hbl, true);
          }
        }
        c.restore();
      }
    }
    void showAnchorHints;
    if (isRigEditMode() && sel && st.rigHover && st.rigHover.rectId === r.id && (st.rigHover.type === "suspend" || st.rigHover.type === "suspendLink")) {
      c.strokeStyle = "rgba(255,224,138,.95)";
      c.lineWidth = Math.max(1.6, 2.4 * ui);
      c.setLineDash([5 * ui, 3 * ui]);
      if (st.rigHover.type === "suspend") {
        const ap = layout.anchors.get(Math.max(0, Math.round(Number(st.rigHover.col) || 0)));
        if (ap) {
          const aW = Math.max(1, ap.x1 - ap.x0), x1 = ap.x0 + aW * 0.05, x2 = ap.x1 - aW * 0.05, yTop = ap.y - 2 - suspendH, tl = localToWorld(x1, yTop), tr = localToWorld(x2, yTop), bl = localToWorld(x1, yTop + suspendH), br = localToWorld(x2, yTop + suspendH);
          drawSuspendUPath(ap.x, yTop, ringD);
          c.stroke();
          c.beginPath(); c.moveTo(tl.x, tl.y); c.lineTo(tr.x, tr.y); c.lineTo(br.x, br.y); c.lineTo(bl.x, bl.y); c.closePath(); c.stroke();
        }
      } else if (st.rigHover.type === "suspendLink") {
        const a = Math.min(st.rigHover.a, st.rigHover.b), b = Math.max(st.rigHover.a, st.rigHover.b), ap = layout.anchors.get(a), bp = layout.anchors.get(b);
        if (ap && bp) {
          const aW = Math.max(1, ap.x1 - ap.x0), bW = Math.max(1, bp.x1 - bp.x0), yTop = Math.min(ap.y, bp.y) - 2 - suspendH;
          const lx1 = ap.x1 - aW * 0.05, lx2 = bp.x0 + bW * 0.05;
          if (lx2 > lx1) {
            const tl = localToWorld(lx1, yTop), tr = localToWorld(lx2, yTop), bl = localToWorld(lx1, yTop + suspendH), br = localToWorld(lx2, yTop + suspendH);
            c.beginPath();
            c.moveTo(tl.x, tl.y);
            c.lineTo(tr.x, tr.y);
            c.lineTo(br.x, br.y);
            c.lineTo(bl.x, bl.y);
            c.closePath();
            c.stroke();
          }
        }
      }
      c.setLineDash([]);
    }
    c.restore();
  };

  return {
    drawRigOnRect,
    drawRigOutsideOverlay
  };
};
