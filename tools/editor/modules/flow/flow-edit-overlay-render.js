export function setupFlowEditOverlayRender(deps = {}) {
  const { st, fontFamilyCss } = deps;

  const drawFlowEditOverlay = (c, w, h) => {
    if (st.mode !== "flowEdit") return;
    const points = Array.isArray(st.flowEditPoints) ? st.flowEditPoints : [];
    const starts = Array.isArray(st.flowStartHandles) ? st.flowStartHandles : [];
    const dirs = Array.isArray(st.flowDirButtons) ? st.flowDirButtons : [];
    if (!points.length) return;
    const drawDirGlyph = (x, y, dir) => {
      const d = String(dir || "").toLowerCase();
      const ux = d === "left" ? -1 : d === "right" ? 1 : 0;
      const uy = d === "up" ? -1 : d === "down" ? 1 : 0;
      if (!ux && !uy) return;
      const nx = -uy, ny = ux;
      const tip = 4;
      const back = 2;
      const wing = 3;
      const tipX = x + ux * tip, tipY = y + uy * tip;
      const bcx = x - ux * back, bcy = y - uy * back;
      c.lineJoin = "round";
      c.fillStyle = "#fff";
      c.beginPath();
      c.moveTo(tipX, tipY);
      c.lineTo(bcx + nx * wing, bcy + ny * wing);
      c.lineTo(bcx - nx * wing, bcy - ny * wing);
      c.closePath();
      c.fill();
    };
    c.save();
    for (const b of dirs) {
      const x = -w / 2 + (+b.u || 0);
      const y = -h / 2 + (+b.v || 0);
      const hover = !!(st.flowDirHover && st.flowDirHover.rid === b.rid && st.flowDirHover.dir === b.dir);
      const on = !!b.active;
      c.fillStyle = on ? "rgba(25,135,84,.98)" : "rgba(33,37,41,.75)";
      if (hover) c.fillStyle = on ? "rgba(38,166,99,.98)" : "rgba(73,80,87,.92)";
      c.strokeStyle = on ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.72)";
      c.lineWidth = 1.1;
      c.beginPath();
      c.arc(x, y, 8.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawDirGlyph(x, y, b.dir);
    }
    for (const p of starts) {
      const x = -w / 2 + (+p.u || 0);
      const y = -h / 2 + (+p.v || 0);
      const hover = !!(!st.flowDrag && st.flowHover && st.flowHover.kind === "start" && st.flowHover.rid === p.rid);
      const selected = (Number(st.flowRegionRid) === Number(p.rid));
      c.fillStyle = selected ? "rgba(255,153,0,.98)" : (hover ? "rgba(255,193,7,.98)" : "rgba(255,235,59,.95)");
      c.strokeStyle = "rgba(0,0,0,.8)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x, y, 14.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      if (p.zFallback) {
        c.fillStyle = "rgba(25,135,84,.98)";
        c.strokeStyle = "rgba(255,255,255,.95)";
        c.lineWidth = 1;
        c.beginPath();
        c.arc(x + 15, y - 15, 6.8, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = "#fff";
        c.font = `700 9px ${fontFamilyCss(st.fontFamily)}`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("Z", x + 15, y - 15.2);
      }
    }
    for (const p of points) {
      const x = -w / 2 + (+p.u || 0);
      const y = -h / 2 + (+p.v || 0);
      const active = !!(st.flowDrag && st.flowDrag.rid === p.rid && st.flowDrag.currentIndex === p.index && p.index >= st.flowDrag.fromIndex);
      const hover = !!(!st.flowDrag && st.flowHover && st.flowHover.rid === p.rid && st.flowHover.index === p.index);
      c.fillStyle = active ? "rgba(255,209,102,.95)" : "rgba(255,255,255,.9)";
      c.strokeStyle = active ? "rgba(255,145,0,.98)" : "rgba(0,0,0,.72)";
      if (hover) {
        c.fillStyle = "rgba(173,216,255,.95)";
        c.strokeStyle = "rgba(51,125,255,.95)";
      }
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(x, y, 5.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    const preview = st.flowDragPreview;
    if (st.flowDrag && preview && Array.isArray(preview.points) && preview.points.length > 1) {
      c.save();
      c.strokeStyle = "rgba(64,196,255,.98)";
      c.lineWidth = 2.8;
      c.setLineDash([7, 5]);
      c.lineJoin = "round";
      c.lineCap = "round";
      c.beginPath();
      for (let i = 0; i < preview.points.length; i++) {
        const pt = preview.points[i];
        const x = -w / 2 + (+pt.u || 0);
        const y = -h / 2 + (+pt.v || 0);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "rgba(64,196,255,.98)";
      const head = preview.points[0];
      const tail = preview.points[preview.points.length - 1];
      c.beginPath();
      c.arc(-w / 2 + (+head.u || 0), -h / 2 + (+head.v || 0), 4.2, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(-w / 2 + (+tail.u || 0), -h / 2 + (+tail.v || 0), 3.1, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.restore();
  };

  return { drawFlowEditOverlay };
}
