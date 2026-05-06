export const normalizeFlowLinkControlPointCount = value => Math.max(2, Math.min(6, Math.round(Number(value) || 2)));

export const normalizeFlowLinkColor = value => /^#[0-9a-f]{6}$/i.test(String(value || "").trim())
  ? String(value).toLowerCase()
  : "#ffc107";

export const hasFlowLinkCustomColor = ln => /^#[0-9a-f]{6}$/i.test(String(ln && ln.color || "").trim());

export const normalizeFlowLinkWidth = value => Math.max(0.5, Math.min(20, Number(value) || 2.2));

export const normalizeFlowLinkLineType = value => String(value || "").toLowerCase() === "dashed" ? "dashed" : "solid";

export const buildDefaultOrthogonalPoints = (ln, findFlowAnchorByEndpoint) => {
  const start = typeof findFlowAnchorByEndpoint === "function" ? findFlowAnchorByEndpoint(ln && ln.from) : null;
  const end = typeof findFlowAnchorByEndpoint === "function" ? findFlowAnchorByEndpoint(ln && ln.to) : null;
  if (!start || !end) return [];
  const sx = Number(start.x) || 0;
  const sy = Number(start.y) || 0;
  const ex = Number(end.x) || 0;
  const ey = Number(end.y) || 0;
  if (Math.abs(sx - ex) < 0.5 || Math.abs(sy - ey) < 0.5) {
    return [{ x: Math.round((sx + ex) / 2), y: Math.round((sy + ey) / 2) }];
  }
  return [{ x: Math.round(ex), y: Math.round(sy) }];
};
