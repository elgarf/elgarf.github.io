/* build:1779222473 */
export const draftSizeStepForKind = kind => (
  String(kind || "") === "note" || String(kind || "") === "device" ? 0.25 : 0.5
);

export const roundDraftMeters = (value, kind = "rect") => {
  const step = draftSizeStepForKind(kind);
  return Math.max(step, Math.round(Math.max(0, Number(value) || 0) / step) * step);
};

export const roundDraftSizePx = (value, kind = "rect", scale = 256) => {
  const safeScale = Math.max(1, Math.round(Number(scale) || 256));
  return Math.max(1, Math.round(roundDraftMeters((Math.max(0, Number(value) || 0) / safeScale), kind) * safeScale));
};
