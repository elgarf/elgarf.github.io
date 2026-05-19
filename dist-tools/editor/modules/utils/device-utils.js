/* build:1779222473 */
export const DEVICE_PC_LIKE_TYPES = new Set(["pc", "mixer", "camera"]);

export const normalizeDeviceType = value => {
  const v = String(value || "").toLowerCase();
  return DEVICE_PC_LIKE_TYPES.has(v) ? v : "controller";
};

export const normalizeDeviceOrientation = value => (
  String(value || "").toLowerCase() === "vertical" ? "vertical" : "horizontal"
);

export const normalizePortCount = (value, fallback = 4) => (
  Math.max(1, Math.min(64, Math.round(Number(value) || fallback)))
);

export const isPcLikeDeviceType = type => DEVICE_PC_LIKE_TYPES.has(String(type || "").toLowerCase());

export const deviceTypeOf = rect => normalizeDeviceType(rect && rect.deviceType);

export const FLOW_OUT_PALETTE = [
  "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff",
  "#ff8000", "#8000ff", "#00ff80", "#ff0080", "#ffffff"
];

export const controllerOutColor = cid => (
  FLOW_OUT_PALETTE[(Math.max(1, Math.round(Number(cid) || 1)) - 1) % FLOW_OUT_PALETTE.length]
);

export const autoFlowLinkColor = (link, rectById, isDeviceRect) => {
  const resolveRect = typeof rectById === "function" ? rectById : () => null;
  const fromRect = resolveRect(link && link.from && link.from.rectId);
  const toRect = resolveRect(link && link.to && link.to.rectId);
  const fromIsDevice = typeof isDeviceRect === "function" ? isDeviceRect(fromRect) : false;
  const toIsDevice = typeof isDeviceRect === "function" ? isDeviceRect(toRect) : false;
  const fromType = deviceTypeOf(fromRect);
  const toType = deviceTypeOf(toRect);
  const fromCid = Math.max(1, Math.round(Number(link && link.from && link.from.cid) || 1));
  if (fromIsDevice && fromType === "controller") return controllerOutColor(fromCid);
  if (fromIsDevice && toIsDevice && isPcLikeDeviceType(fromType) && isPcLikeDeviceType(toType)) return "#aa78ff";
  if (fromIsDevice && toIsDevice && isPcLikeDeviceType(fromType) && toType === "controller") return "#50dcb4";
  return "#ffc107";
};
