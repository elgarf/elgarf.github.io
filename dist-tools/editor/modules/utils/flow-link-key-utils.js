/* build:1779222473 */
export const normalizeFlowEndpointKind = kind => (
  String(kind || "").toLowerCase() === "end" ? "end" : "start"
);

export const normalizeFlowEndpoint = endpoint => ({
  rectId: Math.max(1, Math.round(Number(endpoint && endpoint.rectId) || 0)),
  rid: Math.max(0, Math.round(Number(endpoint && endpoint.rid) || 0)),
  cid: Math.max(0, Math.round(Number(endpoint && endpoint.cid) || 0)),
  kind: normalizeFlowEndpointKind(endpoint && endpoint.kind)
});

export const flowAnchorKey = endpoint => {
  const ep = normalizeFlowEndpoint(endpoint);
  return `${ep.rectId}:${ep.rid}:${ep.cid}:${ep.kind}`;
};

export const flowLinkKey = (from, to) => `${flowAnchorKey(from)}>${flowAnchorKey(to)}`;

export const flowLinkKeyOf = link => {
  const from = link && link.from;
  const to = link && link.to;
  return from && to ? flowLinkKey(from, to) : "";
};
