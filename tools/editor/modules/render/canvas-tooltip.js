import { canvasUiRoundRect } from "./canvas-ui.js";

const canvasTooltipTheme = () => {
  const fallback = {
    bg: "rgba(0,0,0,.92)",
    color: "#fff"
  };
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const css = (name, fb) => (cs.getPropertyValue(name).trim() || fb);
  return {
    bg: css("--bs-emphasis-color", fallback.bg),
    color: css("--bs-body-bg", fallback.color)
  };
};

export const drawCanvasTooltip = (c, label, x, y, z = 1, opts = {}) => {
  c.save();
  try {
    const text = String(label || "").trim();
    if (!text) return;
    const zoom = Math.max(0.25, Number(z) || 1);
    const ui = 1 / zoom;
    const fontSize = 14 * ui;
    const padX = 8 * ui;
    const padY = 4 * ui;
    const gap = 7 * ui;
    const arrow = 5 * ui;
    c.font = `400 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "middle";
    const tw = c.measureText(text).width;
    const h = fontSize + padY * 2;
    const theme = canvasTooltipTheme();
    let bx = Number(x) + gap;
    let by = Number(y) - h / 2;
    let side = "left";
    if (opts.align === "above") {
      bx = Number(x) - (tw + padX * 2) / 2;
      by = Number(y) - h - gap;
      side = "bottom";
    } else if (opts.align === "below") {
      bx = Number(x) - (tw + padX * 2) / 2;
      by = Number(y) + gap;
      side = "top";
    } else if (opts.align === "left") {
      bx = Number(x) - tw - padX * 2 - gap;
      side = "right";
    }
    const w = tw + padX * 2;
    c.fillStyle = theme.bg;
    c.beginPath();
    canvasUiRoundRect(c, bx, by, w, h, 6 * ui);
    c.fill();
    c.beginPath();
    if (side === "left") {
      c.moveTo(bx, by + h / 2 - arrow);
      c.lineTo(bx - arrow, by + h / 2);
      c.lineTo(bx, by + h / 2 + arrow);
    } else if (side === "right") {
      c.moveTo(bx + w, by + h / 2 - arrow);
      c.lineTo(bx + w + arrow, by + h / 2);
      c.lineTo(bx + w, by + h / 2 + arrow);
    } else if (side === "top") {
      c.moveTo(bx + w / 2 - arrow, by);
      c.lineTo(bx + w / 2, by - arrow);
      c.lineTo(bx + w / 2 + arrow, by);
    } else {
      c.moveTo(bx + w / 2 - arrow, by + h);
      c.lineTo(bx + w / 2, by + h + arrow);
      c.lineTo(bx + w / 2 + arrow, by + h);
    }
    c.closePath();
    c.fill();
    c.fillStyle = theme.color;
    c.fillText(text, bx + padX, by + h / 2);
  } catch {
    // Tooltip drawing must never break the editor render pass.
  } finally {
    c.restore();
  }
};

