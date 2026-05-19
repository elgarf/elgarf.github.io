export const drawDeferredOverlayTextBlock = (c, ov, fallbackFont = "") => {
  if (!c || !ov || !ov.layout || !Array.isArray(ov.ls)) return;
  const font = String(ov.font || fallbackFont || "sans-serif");
  c.save();
  c.textAlign = "center";
  c.textBaseline = "middle";
  const scales = Array.isArray(ov.lineScales) ? ov.lineScales : [];
  const hasScaledLines = scales.length === ov.ls.length && scales.some(s => Math.abs((Number(s) || 1) - 1) > 0.01);
  const baseFs = Number(ov.layout.fs) || 12;
  const boxPadX = 7;
  let maxMeasuredLineW = 0;
  if (!hasScaledLines) {
    c.font = `${baseFs}px ${font}`;
    for (let i = 0; i < ov.ls.length; i++) maxMeasuredLineW = Math.max(maxMeasuredLineW, c.measureText(String(ov.ls[i] || "")).width);
  } else {
    for (let i = 0; i < ov.ls.length; i++) {
      const sc = Math.max(0.5, Number(scales[i]) || 1);
      const fs = Math.max(6, Math.round(baseFs * sc));
      c.font = `${fs}px ${font}`;
      maxMeasuredLineW = Math.max(maxMeasuredLineW, c.measureText(String(ov.ls[i] || "")).width);
    }
  }
  const maxAllowW = Number.isFinite(Number(ov.maxW)) ? Math.max(12, Number(ov.maxW)) : Math.max(12, Number(ov.layout.tw) || 12);
  const textBoxW = Math.max(12, Math.min(maxAllowW, Math.ceil(maxMeasuredLineW + boxPadX * 2)));
  const textBoxX = (Number(ov.layout.textX) || 0) - textBoxW / 2;
  c.fillStyle = ov.txtTheme && ov.txtTheme.bg ? ov.txtTheme.bg : "rgba(0,0,0,.4)";
  c.fillRect(textBoxX, ov.layout.textTop, textBoxW, ov.layout.th);
  c.fillStyle = ov.txtTheme && ov.txtTheme.text ? ov.txtTheme.text : "#fff";
  if (!hasScaledLines) {
    c.font = `${baseFs}px ${font}`;
    for (let i = 0; i < ov.ls.length; i++) {
      c.fillText(ov.ls[i], ov.layout.textX, ov.layout.sy + i * ov.layout.lh, ov.maxW);
    }
    c.restore();
    return;
  }
  const baseLh = Number(ov.layout.lh) || Math.max(baseFs + 2, 14);
  const heights = ov.ls.map((_, i) => Math.max(8, baseLh * Math.max(0.5, Number(scales[i]) || 1)));
  const totalH = heights.reduce((sum, h) => sum + h, 0);
  let y = (Number(ov.layout.textTop) || 0) + Math.max(0, ((Number(ov.layout.th) || totalH) - totalH) / 2);
  for (let i = 0; i < ov.ls.length; i++) {
    const sc = Math.max(0.5, Number(scales[i]) || 1);
    const fs = Math.max(6, Math.round(baseFs * sc));
    c.font = `${fs}px ${font}`;
    const lineY = y + heights[i] / 2;
    c.fillText(ov.ls[i], ov.layout.textX, lineY, ov.maxW);
    y += heights[i];
  }
  c.restore();
};
