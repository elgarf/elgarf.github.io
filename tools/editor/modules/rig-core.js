export const setupRigCore = (deps = {}) => {
  const {
    normalizeRigData,
    sanitizeRectRigFramesToBounds,
    invalidateRectCache,
    LOAD_ICON_VIEWBOX,
    LOAD_ICON_PATH_D
  } = deps;

  const rigHasSuspend = (rig, col) => Array.isArray(rig && rig.suspends) && rig.suspends.includes(col);
  const rigHasLink = (rig, a, b) => {
    const x = Math.min(a, b);
    const y = Math.max(a, b);
    return Array.isArray(rig && rig.suspendLinks) && rig.suspendLinks.includes(`${x}-${y}`);
  };
  const getRectRigData = r => {
    if (!r || typeof r !== "object") return normalizeRigData(null);
    r.rig = normalizeRigData(r.rig);
    sanitizeRectRigFramesToBounds(r);
    return r.rig;
  };
  const setRectRigData = r => {
    if (!r || typeof r !== "object") return;
    r.rig = normalizeRigData(r.rig);
    sanitizeRectRigFramesToBounds(r);
    invalidateRectCache(r, "appearance");
  };
  const drawLoadIcon = (c, x, y, size, opts = {}) => {
    if (!(size > 0)) return;
    const stroke = opts.stroke || null;
    const fill = opts.fill || null;
    const lineWidth = Math.max(1, Number(opts.lineWidth) || 1);
    const alpha = Math.max(0, Math.min(1, Number(opts.alpha) || 1));
    c.save();
    c.translate(x, y);
    const s = size / LOAD_ICON_VIEWBOX;
    c.scale(s, s);
    c.translate(-LOAD_ICON_VIEWBOX / 2, -LOAD_ICON_VIEWBOX / 2);
    c.globalAlpha *= alpha;
    const p = new Path2D(LOAD_ICON_PATH_D);
    if (fill) { c.fillStyle = fill; c.fill(p); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth / s; c.stroke(p); }
    c.restore();
  };

  return {
    rigHasSuspend,
    rigHasLink,
    getRectRigData,
    setRectRigData,
    drawLoadIcon
  };
};
