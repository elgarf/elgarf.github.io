import { drawCanvasTooltip } from "../render/canvas-tooltip.js";
import { drawCanvasUiButton, canvasUiTheme } from "../render/canvas-ui.js";

export function setupFlowEditOverlayRender(deps = {}) {
  const { st, fontFamilyCss, t = value => value } = deps;

  const drawFlowEditOverlay = (c, w, h, opts = {}) => {
    if (st.mode !== "flowEdit") return;
    const points = Array.isArray(st.flowEditPoints) ? st.flowEditPoints : [];
    const starts = Array.isArray(st.flowStartHandles) ? st.flowStartHandles : [];
    const dirs = Array.isArray(st.flowDirButtons) ? st.flowDirButtons : [];
    const resets = Array.isArray(st.flowResetButtons) ? st.flowResetButtons : [];
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
    let tooltip = null;
    for (const b of dirs) {
      const x = -w / 2 + (+b.u || 0);
      const y = -h / 2 + (+b.v || 0);
      const hover = !!(st.flowDirHover && st.flowDirHover.rid === b.rid && st.flowDirHover.dir === b.dir);
      const on = !!b.active;
      drawCanvasUiButton(c, { x: x - 8.2, y: y - 8.2, size: 16.4, z: 1, active: on, hover, success: on, icon: "" });
      drawDirGlyph(x, y, b.dir);
      if (hover) {
        const dirName = b.dir === "left" ? t("Влево") : b.dir === "right" ? t("Вправо") : b.dir === "up" ? t("Вверх") : t("Вниз");
        tooltip = { x: x + 8.2, y, label: `${t("Направление потока")}: ${dirName}` };
      }
    }
    for (const b of resets) {
      const x = -w / 2 + (+b.u || 0);
      const y = -h / 2 + (+b.v || 0);
      const hover = !!(st.flowResetHover && st.flowResetHover.rid === b.rid && st.flowResetHover.cid === b.cid);
      drawCanvasUiButton(c, { x: x - 8.5, y: y - 8.5, size: 17, z: 1, active: hover, hover, danger: hover, icon: "" });
      c.strokeStyle = "#fff";
      c.lineWidth = 1.8;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x - 3.3, y - 3.3);
      c.lineTo(x + 3.3, y + 3.3);
      c.moveTo(x + 3.3, y - 3.3);
      c.lineTo(x - 3.3, y + 3.3);
      c.stroke();
      if (hover) tooltip = { x: x + 8.5, y, label: t("Сбросить ручной поток") };
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
      const manualActive = !!p.manualActive;
      const manualMode = !!p.manualMode;
      const ui = canvasUiTheme();
      c.fillStyle = active ? ui.warning : (manualActive ? ui.primary : ui.surface);
      c.strokeStyle = active ? ui.warning : (manualActive ? "rgba(255,255,255,.82)" : (manualMode ? ui.primary : ui.borderStrong));
      if (hover) {
        c.fillStyle = manualActive ? ui.primary : ui.surfaceHover;
        c.strokeStyle = ui.primary;
      }
      c.lineWidth = manualMode && !manualActive ? 1.8 : 1.2;
      c.beginPath();
      c.arc(x, y, manualActive ? 6.7 : 5.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      if (manualActive) {
        c.fillStyle = "rgba(255,255,255,.96)";
        c.font = `700 8.5px ${fontFamilyCss(st.fontFamily)}`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(Math.max(1, Math.round(Number(p.manualIndex) || 0) + 1)), x, y + .2);
      }
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
    if (st.manualFlowDrag && preview && String(preview.kind || "") === "manual" && Array.isArray(preview.points) && preview.points.length > 0) {
      const pts = preview.points;
      c.save();
      c.strokeStyle = "rgba(13,202,240,.98)";
      c.fillStyle = "rgba(13,202,240,.98)";
      c.lineWidth = 2.8;
      c.setLineDash([6, 4]);
      c.lineJoin = "round";
      c.lineCap = "round";
      c.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const x = -w / 2 + (+pt.u || 0);
        const y = -h / 2 + (+pt.v || 0);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      if (pts.length === 1) {
        const pt = pts[0];
        c.moveTo(-w / 2 + (+pt.u || 0), -h / 2 + (+pt.v || 0));
        c.lineTo(-w / 2 + (+pt.u || 0), -h / 2 + (+pt.v || 0));
      }
      c.stroke();
      c.setLineDash([]);
      const last = pts[pts.length - 1];
      const cursorU = Number(preview.cursorU);
      const cursorV = Number(preview.cursorV);
      if (last && Number.isFinite(cursorU) && Number.isFinite(cursorV)) {
        const ax = -w / 2 + (+last.u || 0);
        const ay = -h / 2 + (+last.v || 0);
        const bx = -w / 2 + cursorU;
        const by = -h / 2 + cursorV;
        c.save();
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(bx, by);
        c.stroke();
        c.restore();
        const ang = Math.atan2(by - ay, bx - ax);
        const len = 9;
        const wing = 5;
        if (Math.hypot(bx - ax, by - ay) > 1) {
          c.beginPath();
          c.moveTo(bx, by);
          c.lineTo(bx - Math.cos(ang - Math.PI / 6) * len, by - Math.sin(ang - Math.PI / 6) * len);
          c.lineTo(bx - Math.cos(ang) * wing, by - Math.sin(ang) * wing);
          c.lineTo(bx - Math.cos(ang + Math.PI / 6) * len, by - Math.sin(ang + Math.PI / 6) * len);
          c.closePath();
          c.fill();
        }
      } else {
        const p0 = pts[0];
        c.beginPath();
        c.arc(-w / 2 + (+p0.u || 0), -h / 2 + (+p0.v || 0), 4.5, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    let deferredTooltip = null;
    if (tooltip) {
      if (opts && opts.deferTooltip) {
        const label = tooltip.label;
        const x = tooltip.x;
        const y = tooltip.y;
        const z = st.zoom || 1;
        deferredTooltip = () => drawCanvasTooltip(c, label, x, y, z);
      } else {
        drawCanvasTooltip(c, tooltip.label, tooltip.x, tooltip.y, st.zoom || 1);
      }
    }
    c.restore();
    return deferredTooltip;
  };

  return { drawFlowEditOverlay };
}
