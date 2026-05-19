/* build:1779222473 */
export const canvasUiTheme = () => {
  const fallback = {
    primary: "#0d6efd",
    danger: "#dc3545",
    success: "#198754",
    warning: "#ffc107",
    surface: "rgba(18,24,32,.92)",
    surfaceHover: "rgba(33,37,41,.96)",
    border: "rgba(255,255,255,.38)",
    borderStrong: "rgba(255,255,255,.72)",
    text: "rgba(255,255,255,.96)",
    textMuted: "rgba(255,255,255,.68)",
    shadow: "rgba(0,0,0,.24)"
  };
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const css = (name, fb) => (cs.getPropertyValue(name).trim() || fb);
  const dark = String(document.documentElement.getAttribute("data-bs-theme") || "").toLowerCase() !== "light";
  return {
    ...fallback,
    primary: css("--bs-primary", fallback.primary),
    danger: css("--bs-danger", fallback.danger),
    success: css("--bs-success", fallback.success),
    warning: css("--bs-warning", fallback.warning),
    surface: dark ? "rgba(18,24,32,.92)" : "rgba(255,255,255,.92)",
    surfaceHover: dark ? "rgba(33,37,41,.96)" : "rgba(248,249,250,.98)",
    border: dark ? "rgba(255,255,255,.38)" : "rgba(33,37,41,.24)",
    borderStrong: dark ? "rgba(255,255,255,.72)" : "rgba(13,17,23,.42)",
    text: css("--bs-body-color", dark ? fallback.text : "rgba(33,37,41,.96)"),
    textMuted: css("--bs-secondary-color", dark ? fallback.textMuted : "rgba(73,80,87,.82)")
  };
};

export const canvasUiRoundRect = (c, x, y, w, h, r) => {
  const rr = Math.max(0, Math.min(Number(r) || 0, w / 2, h / 2));
  if (typeof c.roundRect === "function") {
    c.roundRect(x, y, w, h, rr);
    return;
  }
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
};

export const drawCanvasUiButton = (c, opts = {}) => {
  const {
    x = 0,
    y = 0,
    size = 24,
    z = 1,
    active = false,
    hover = false,
    danger = false,
    success = false,
    disabled = false,
    radius = null,
    icon = "",
    iconFont = "\"Font Awesome 6 Free\", \"FontAwesome\"",
    iconWeight = 900,
    iconSize = size * 0.52,
    rotate = 0
  } = opts;
  const ui = canvasUiTheme();
  const zoom = Math.max(0.25, Number(z) || 1);
  const r = radius == null ? Math.max(3, 5 / zoom) : radius;
  const fill = disabled
    ? "rgba(108,117,125,.55)"
    : active
      ? (danger ? ui.danger : success ? ui.success : ui.primary)
      : (hover ? ui.surfaceHover : ui.surface);
  const stroke = active ? "rgba(255,255,255,.7)" : (hover ? ui.borderStrong : ui.border);
  c.save();
  c.shadowColor = ui.shadow;
  c.shadowBlur = Math.max(0, 8 / zoom);
  c.shadowOffsetY = Math.max(0, 2 / zoom);
  c.fillStyle = fill;
  c.strokeStyle = stroke;
  c.lineWidth = Math.max(1, 1.1 / zoom);
  c.beginPath();
  canvasUiRoundRect(c, x, y, size, size, r);
  c.fill();
  c.shadowColor = "transparent";
  c.stroke();
  if (icon) {
    const cx = x + size / 2;
    const cy = y + size / 2 + size * 0.025;
    c.fillStyle = active || !disabled ? "rgba(255,255,255,.96)" : ui.textMuted;
    c.font = `${iconWeight} ${Math.max(10, iconSize)}px ${iconFont}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    if (Number(rotate)) {
      c.translate(cx, cy);
      c.rotate(Number(rotate) || 0);
      c.fillText(icon, 0, 0);
    } else {
      c.fillText(icon, cx, cy);
    }
  }
  c.restore();
};

export const drawCanvasUiBadge = (c, text, x, y, z = 1, opts = {}) => {
  const label = String(text || "").trim();
  if (!label) return;
  const ui = canvasUiTheme();
  const zoom = Math.max(0.25, Number(z) || 1);
  const fontSize = Number(opts.fontSize) || 12 / zoom;
  const padX = Number(opts.padX) || 7 / zoom;
  const h = Number(opts.height) || 22 / zoom;
  c.save();
  c.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  c.textAlign = "left";
  c.textBaseline = "middle";
  const tw = c.measureText(label).width;
  c.shadowColor = ui.shadow;
  c.shadowBlur = Math.max(0, 8 / zoom);
  c.shadowOffsetY = Math.max(0, 2 / zoom);
  c.fillStyle = opts.active ? ui.primary : ui.surface;
  c.strokeStyle = opts.active ? "rgba(255,255,255,.7)" : ui.border;
  c.lineWidth = Math.max(1, 1.1 / zoom);
  c.beginPath();
  canvasUiRoundRect(c, x, y, tw + padX * 2, h, Math.max(3, 5 / zoom));
  c.fill();
  c.shadowColor = "transparent";
  c.stroke();
  c.fillStyle = opts.active ? "rgba(255,255,255,.96)" : ui.text;
  c.fillText(label, x + padX, y + h / 2);
  c.restore();
};
