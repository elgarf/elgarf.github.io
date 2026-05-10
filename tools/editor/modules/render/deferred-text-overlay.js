export const drawDeferredOverlayTextBlock = (c, ov, fallbackFont = "") => {
  if (!c || !ov || !ov.layout || !Array.isArray(ov.ls)) return;
  const font = String(ov.font || fallbackFont || "sans-serif");
  c.save();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `${ov.layout.fs}px ${font}`;
  c.fillStyle = ov.txtTheme && ov.txtTheme.bg ? ov.txtTheme.bg : "rgba(0,0,0,.4)";
  c.fillRect(ov.layout.textLeft, ov.layout.textTop, ov.layout.tw, ov.layout.th);
  c.fillStyle = ov.txtTheme && ov.txtTheme.text ? ov.txtTheme.text : "#fff";
  const scales = Array.isArray(ov.lineScales) ? ov.lineScales : [];
  const hasScaledLines = scales.length === ov.ls.length && scales.some(s => Math.abs((Number(s) || 1) - 1) > 0.01);
  if (!hasScaledLines) {
    for (let i = 0; i < ov.ls.length; i++) {
      c.fillText(ov.ls[i], ov.layout.textX, ov.layout.sy + i * ov.layout.lh, ov.maxW);
    }
    c.restore();
    return;
  }
  const baseFs = Number(ov.layout.fs) || 12;
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
