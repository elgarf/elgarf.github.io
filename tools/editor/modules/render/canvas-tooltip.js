export const drawCanvasTooltip = (c, label, x, y, z = 1, opts = {}) => {
  c.save();
  try {
    const text = String(label || "").trim();
    if (!text) return;
    const zoom = Math.max(0.25, Number(z) || 1);
    const ui = 1 / zoom;
    const fontSize = 12 * ui;
    const padX = 7 * ui;
    const padY = 4 * ui;
    const gap = 8 * ui;
    c.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "middle";
    const tw = c.measureText(text).width;
    const h = fontSize + padY * 2;
    let bx = Number(x) + gap;
    let by = Number(y) - h / 2;
    if (opts.align === "above") {
      bx = Number(x) - (tw + padX * 2) / 2;
      by = Number(y) - h - gap;
    } else if (opts.align === "below") {
      bx = Number(x) - (tw + padX * 2) / 2;
      by = Number(y) + gap;
    } else if (opts.align === "left") {
      bx = Number(x) - tw - padX * 2 - gap;
    }
    c.fillStyle = "rgba(18,24,32,.94)";
    c.strokeStyle = "rgba(255,255,255,.32)";
    c.lineWidth = Math.max(1 / zoom, 1.1 * ui);
    c.fillRect(bx, by, tw + padX * 2, h);
    c.strokeRect(bx, by, tw + padX * 2, h);
    c.fillStyle = "rgba(255,255,255,.96)";
    c.fillText(text, bx + padX, by + h / 2);
  } catch (_err) {
    // Tooltip drawing must never break the editor render pass.
  } finally {
    c.restore();
  }
};
