export const setupNoteRender = (deps = {}) => {
  const {
    st,
    rads,
    rectCenter,
    getRectTextSizePx,
    fontFamilyCss
  } = deps;

  const wrapNoteText = (c, text, maxW) => {
    const out = [];
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    for (const ln of lines) {
      const words = String(ln || "").split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(""); continue; }
      let cur = words[0];
      for (let i = 1; i < words.length; i++) {
        const next = `${cur} ${words[i]}`;
        if (c.measureText(next).width <= maxW) cur = next;
        else { out.push(cur); cur = words[i]; }
      }
      out.push(cur);
    }
    return out.length ? out : [""];
  };

  const drawNoteRect = (c, r, sel, z) => {
    const a = rads(r.rotation || 0);
    const center = rectCenter(r);
    const w = r.width;
    const h = r.height;
    const fs = Math.max(10, getRectTextSizePx(r));
    c.save();
    c.translate(center.x, center.y);
    c.rotate(a);
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.fillStyle = "rgba(255,251,209,.62)";
    c.fill();
    c.lineWidth = Math.max(1, 1.2 / Math.max(0.2, z || 1));
    c.strokeStyle = sel ? "rgba(13,110,253,.96)" : "rgba(61,73,93,.78)";
    c.stroke();
    const pad = Math.max(6, 8 / Math.max(0.5, z || 1));
    c.fillStyle = "#1f2937";
    c.textAlign = "left";
    c.textBaseline = "top";
    c.font = `${fs}px ${fontFamilyCss(st.fontFamily)}`;
    const text = String(r.noteText || "").trim() || "Двойной клик для ввода текста";
    const lines = wrapNoteText(c, text, Math.max(8, w - pad * 2));
    const lh = Math.max(12, fs * 1.3);
    let y = -h / 2 + pad;
    for (const line of lines) {
      if (y + lh > h / 2 - pad) break;
      c.fillText(line, -w / 2 + pad, y);
      y += lh;
    }
    c.restore();
  };

  return {
    drawNoteRect
  };
};
